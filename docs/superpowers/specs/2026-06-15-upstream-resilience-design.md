# Design Spec: Upstream Resilience for 192.168.2.111 Dependencies

**Date:** 2026-06-15
**Project:** Digitalisasi Kertas Kerja APP
**Status:** Draft (pending user review)

---

## Overview

App server (Vite + middleware plugins di port 5181) saat ini **gantung/butuh restart** saat upstream server `192.168.2.111` mati, restart, atau hang. Dua dependency yang terdampak: **MSSQL Server** (port 1433, diakses via `mssql` di `sqlPlugin.js`) dan **Network Share** (SMB di `\\192.168.2.111\pt. santos jaya abadi\AssetManagement_Files`, diakses via `@marsaud/smb2` di `fileBrowserPlugin.js`).

Root cause: tidak ada timeout, tidak ada circuit breaker. Saat upstream hang, request menggantung tanpa batas, antrian numpuk, app server jadi tidak responsif. Fix ini menambahkan **timeouts, circuit breaker, dan background health monitor** agar app server tetap responsif dan auto-recover tanpa restart saat upstream kembali online.

---

## Goals

- Request ke upstream yang hang/mati **fail dalam <1 detik** (bukan menit) saat circuit OPEN
- App server **tidak perlu di-restart** saat upstream mati/balik hidup
- Auto-recovery begitu upstream kembali online (max 30 detik deteksi)
- Berlaku untuk **native Node.js** maupun **Docker container** deployment

## Non-Goals

- Cache fallback read-only (bisa iterasi berikut, risiko stale data)
- UI health indicator (cukup return data via endpoint opsional)
- Per-user error customization
- Metrics/prometheus export
- Refactor arsitektur plugin

---

## Architecture

### Pendekatan

Tambah satu modul utility `upstreamHealth.js` yang mengimplementasikan **circuit breaker** + **background health monitor**. Setiap upstream (`sql`, `smb`) punya circuit breaker sendiri. Refactor dua plugin existing untuk wrap semua call upstream lewat `guard(name, fn)`. Tambah satu endpoint opsional untuk inspeksi state.

### Komponen Baru

#### 1. `app/src/server/utils/upstreamHealth.js` (NEW)

- **`CircuitBreaker` class** — state machine dengan 3 state: `CLOSED`, `OPEN`, `HALF_OPEN`
- **`UpstreamRegistry` class** — manage banyak breaker, jalankan background probe, expose `guard(name, fn, opts)`
- **Background probe** — start saat `init()`, jalan tiap `CB_HALF_OPEN_PROBE_INTERVAL_MS` (default 30 detik). Probe SQL pakai `SELECT 1`, probe SMB pakai `readdir('')`. Probe result di-record ke circuit breaker (seolah-olah probe adalah real call).

#### 2. Endpoint baru: `GET /api/upstream/status`

- Return state kedua circuit breaker
- Response: `{ sql: { state, lastSuccess, lastFailure, failureCount, openedAt }, smb: {...} }`
- Dipasang via plugin baru `upstreamStatusPlugin.js` (di `app/src/server/plugins/`)

### Refactor Existing

#### `app/src/server/plugins/sqlPlugin.js`

- Tambah `connectionTimeout: 10000` dan `requestTimeout: 15000` di `sqlConfig`
- Bungkus setiap `pool.request().query(...)` dengan `registry.guard('sql', () => call, { timeoutMs: 15000 })`
- Pertahankan logic `poolPromise = null` setelah error (reset pool)

#### `app/src/server/plugins/fileBrowserPlugin.js`

- Bungkus `fileAccess.connect()`, `readdir()`, `stat()`, `createReadStream()` dengan `registry.guard('smb', fn, { timeoutMs: 20000 })`
- Implementasi timeout via `Promise.race` di `fileAccess` helpers (library `@marsaud/smb2` tidak punya built-in timeout)
- Reset `smb2Client = null` + `shareConnected = false` saat timeout/gagal agar reconnect fresh

---

## Data Flow

### Request masuk middleware

```
Client request → plugin middleware → registry.guard('sql' | 'smb', fn, { timeoutMs })
```

`guard(name, fn, opts)`:

1. Ambil circuit breaker untuk `name`. Baca state saat ini.
2. **CLOSED**: jalankan `fn()` dengan `Promise.race([fn(), timeoutPromise])`. Sukses → catat `lastSuccess`, reset `failureCount=0`. Gagal/timeout → increment `failureCount`. Jika `failureCount >= CB_FAILURE_THRESHOLD` → transisi ke **OPEN**, set `openedAt = now`.
3. **OPEN**: cek `now - openedAt >= CB_OPEN_DURATION_MS`. Jika ya → transisi ke **HALF_OPEN**, treat as probe (lihat #4). Jika belum → throw error `UpstreamOpenError(retryAfter)`.
4. **HALF_OPEN**: hanya 1 in-flight probe yang boleh jalan (track `probeInFlight: boolean`). Probe kedua/ketiga datang bersamaan → throw `UpstreamOpenError`. Probe sukses → transisi ke **CLOSED**, reset `failureCount=0`. Probe gagal → transisi balik ke **OPEN**, set `openedAt = now`.

### Background probe loop

- Start di `registry.init()`, jalan tiap `CB_HALF_OPEN_PROBE_INTERVAL_MS` (30 detik)
- Independen dari user request, murni deteksi recovery
- Probe SQL: `pool.request().query('SELECT 1')` dengan `UPSTREAM_PROBE_TIMEOUT_MS` (default 5 detik)
- Probe SMB: `fileAccess.readdir('')` dengan `UPSTREAM_PROBE_TIMEOUT_MS` (default 5 detik)
- Probe result di-record ke circuit breaker (jalankan lewat `guard` internal helper)

### State Transition Matrix

| From | To | Trigger |
|---|---|---|
| CLOSED | OPEN | `failureCount >= 3` (dalam window apapun, di-reset setiap sukses) |
| CLOSED | CLOSED | Sukses / gagal < threshold |
| OPEN | HALF_OPEN | `now - openedAt >= 30000` (triggered by request atau probe tick) |
| HALF_OPEN | CLOSED | Probe sukses |
| HALF_OPEN | OPEN | Probe gagal |

### Concurrent Behavior

- 50 request saat OPEN → semua reject cepat dengan 503 + `Retry-After`, tidak ada yang tunggu network
- Saat transisi OPEN → HALF_OPEN, request pertama yang lewat jadi probe, sisanya tetap 503 sampai probe selesai
- 1 in-flight probe di HALF_OPEN, bukan 50

---

## Error Handling

### Response Format

Saat circuit OPEN (handler tangkap `UpstreamOpenError`):
```json
{
  "success": false,
  "error": "Upstream SQL Server tidak tersedia, sedang dipulihkan",
  "code": "UPSTREAM_OPEN",
  "retryAfter": 28
}
```
HTTP 503, Header: `Retry-After: 28`

Saat per-request timeout:
```json
{
  "success": false,
  "error": "Upstream SQL Server timeout setelah 15000ms",
  "code": "UPSTREAM_TIMEOUT"
}
```
HTTP 504

Error lain (query syntax, permission denied): tetap HTTP 500 seperti behavior existing.

### Frontend Impact

Tidak ada perubahan wajib di frontend. `fetchWithAuth` di `apiConfig.js` sudah melempar `Error` saat `!res.ok`. `sqlServerApi.js` dan `fileServerApi.js` sudah extract `errData.error` untuk pesan user. Penambahan banner status UI bisa dilakukan iterasi berikut dengan poll `/api/upstream/status`.

### Timeout Strategy (Defense in Depth)

- **mssql**: `connectionTimeout: 10000` + `requestTimeout: 15000` di config level (mssql library enforce)
- **mssql (juga)**: `Promise.race` wrapper di `guard()` sebagai safety net
- **SMB**: `Promise.race` wrapper di `guard()` (library `@marsaud/smb2` tidak support timeout native)
- **Probe**: timeout `UPSTREAM_PROBE_TIMEOUT_MS` (default 5 detik) agar deteksi recovery cepat

### Pool/Client Reset

- **mssql**: `poolPromise = null` setelah error (sudah ada di code) → next call reconnect
- **SMB**: `smb2Client = null` + `shareConnected = false` saat timeout/gagal → `getSmbClient()` bikin instance baru

### Logging

Format konsisten dengan plugin existing:
```
[UpstreamHealth] sql: CLOSED → OPEN (3 failures in 45s)
[UpstreamHealth] smb probe OK
[UpstreamHealth] smb probe FAIL: timeout
[UpstreamHealth] sql call exceeded 15000ms, circuit may open
```

---

## Configuration

Environment variables (override default di `.env`):

| Var | Default | Fungsi |
|---|---|---|
| `UPSTREAM_REQUEST_TIMEOUT_MS` | 15000 | Per-request timeout untuk SQL |
| `UPSTREAM_SMB_TIMEOUT_MS` | 20000 | Per-request timeout untuk SMB |
| `CB_FAILURE_THRESHOLD` | 3 | Jumlah failure berturut-turut sebelum OPEN |
| `CB_OPEN_DURATION_MS` | 30000 | Durasi stay di OPEN sebelum coba HALF_OPEN |
| `CB_HALF_OPEN_PROBE_INTERVAL_MS` | 30000 | Interval background probe |
| `UPSTREAM_PROBE_TIMEOUT_MS` | 5000 | Timeout per probe (lebih pendek dari request timeout agar deteksi recovery cepat) |

---

## Test Plan

Target: 80%+ coverage, TDD workflow.

### Unit Tests (`app/src/__tests__/upstreamHealth.test.js`)

`CircuitBreaker`:
- Transisi CLOSED → OPEN setelah N failure
- Tidak transisi ke OPEN saat failure < threshold
- Transisi OPEN → HALF_OPEN setelah `CB_OPEN_DURATION_MS`
- Transisi HALF_OPEN → CLOSED saat probe sukses
- Transisi HALF_OPEN → OPEN saat probe gagal
- Hanya 1 probe di HALF_OPEN, sisanya reject
- Reset `failureCount` setelah sukses di CLOSED
- Concurrent calls saat OPEN semua reject cepat tanpa tunggu network

`UpstreamRegistry`:
- Background probe jalan tiap interval
- Probe success update state ke CLOSED
- Probe failure update state ke OPEN setelah threshold
- `guard()` throw `UpstreamOpenError` saat OPEN
- `guard()` enforce timeout via `Promise.race`

### Integration Tests

`sqlPlugin.test.js` (mock mssql pool):
- Return 503 saat pool fail 3x berturut-turut
- Return 504 saat query timeout
- Auto-recover saat mock pool balik healthy
- Endpoint `/api/db/status` reflect circuit state

`fileBrowserPlugin.test.js` (mock SMB client):
- Return 503 saat SMB fail 3x berturut-turut
- Return 504 saat readdir timeout
- Auto-recover saat mock SMB balik healthy
- Reset `smb2Client` saat timeout

### Manual Test (Runbook)

Lampirkan di doc/CONTRIBUTING atau README:
1. Matikan service MSSQL di 192.168.2.111
2. Hit `GET /api/db/status` dari client → dalam <1 detik dapat 503 dengan Retry-After
3. Hit `GET /api/db/master-assets` → 503 cepat, app server tetap responsif untuk endpoint lain
4. Nyalakan lagi MSSQL → tunggu max 30 detik → request berikutnya auto-success
5. Ulangi untuk SMB (matikan share, observasi circuit)

---

## Files Changed

**New:**
- `app/src/server/utils/upstreamHealth.js` — circuit breaker + registry
- `app/src/__tests__/upstreamHealth.test.js` — unit tests
- `app/src/__tests__/sqlPlugin.test.js` — integration tests
- `app/src/__tests__/fileBrowserPlugin.test.js` — integration tests
- `app/src/server/plugins/upstreamStatusPlugin.js` — endpoint `/api/upstream/status`

**Modified:**
- `app/src/server/plugins/sqlPlugin.js` — wrap calls dengan `guard('sql', fn)`, tambah timeout config
- `app/src/server/plugins/fileBrowserPlugin.js` — wrap calls dengan `guard('smb', fn)`, tambah SMB timeout, reset client on failure
- `app/vite.config.js` — mount `viteUpstreamStatusPlugin()`
- `app/.env.example` — dokumentasi env baru

**Untouched (frontend tidak perlu berubah untuk fix ini):**
- Semua file di `app/src/utils/`, `app/src/components/`, `app/src/pages/`
- `app/.env`, `app/.env.production` (env baru punya default, tidak wajib di-set)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Background probe menambah beban ke upstream | Probe tiap 30 detik, 1 query ringan, negligible load |
| Circuit breaker salah deteksi (flapping upstream → thrashing) | `CB_OPEN_DURATION_MS` 30 detik memberi waktu recovery; probe timeout 5 detik (lebih pendek dari request) |
| `mssql` pool reset di tengah transaksi | Transaksi yang sedang berjalan akan fail dengan error existing; caller handle di try/catch |
| SMB client reset di tengah download | Stream akan error; client harus retry request download |
| Test mock tidak reflect real network behavior | Manual test runbook di real env sebagai validasi akhir |

---

## Open Questions

Tidak ada. Semua keputusan diambil saat brainstorming (questions 1-4 answered).
