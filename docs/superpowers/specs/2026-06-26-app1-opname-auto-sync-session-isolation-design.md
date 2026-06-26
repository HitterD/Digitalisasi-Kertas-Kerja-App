# APP1 Opname — Auto Sync & Session Isolation Design Spec

**Tanggal:** 2026-06-26  
**Scope:** Ubah sync APP1 `/app1/opname` dari tombol manual/global file menjadi auto-sync non-blocking saat jaringan tersedia, dengan isolasi per user + periode + session opname agar Web dan Android tidak saling overwrite.

---

## Masalah

Halaman `/app1/opname` punya tombol manual `↻ Sync` yang POST state aktif ke `/api/sync/result` di `app/src/pages/OpnamePage.jsx:143-170`.

Sync hub APP1 juga masih manual untuk push/pull session/result di `app/src/components/NetworkSyncHub.jsx:26-86`.

Backend sync sekarang memakai file global:

- `data/pc_session.json`
- `data/tablet_result.json`

Path global itu ada di `app/src/server/plugins/syncPlugin.js:15-16` dan duplikat route di `app/server/routes/syncRoute.js:15-16`.

Dampaknya:

- User A dan User B bisa tumpang tindih karena target sync sama.
- Periode sama bisa berisi 2 opname berbeda, tapi kalau scope hanya periode, result bisa overwrite.
- Android/Web masih perlu klik manual agar data berpindah.
- Area no signal berisiko spam retry/status kalau auto-sync dibuat tanpa rate limit.
- Status sync tidak boleh mengganggu proses opname lapangan.

---

## Tujuan

- Auto-sync berjalan saat jaringan tersedia.
- Tombol manual `↻ Sync` tetap ada untuk sync sekarang.
- Tidak ada overwrite antar user.
- Tidak ada overwrite antar dua opname dalam periode sama.
- Sync session terisolasi berdasarkan:
  - user
  - periode
  - `syncSessionId` yang dibuat dari session create date
- Web ↔ Android bisa sync dua arah dalam session yang sama.
- Konflik field yang sama memakai **last write wins** berdasarkan `updatedAt`.
- Konflik dicatat, tidak memblokir opname.
- Status sync tidak spam dan tidak mengganggu input/checkbox/table.
- Jika no signal/gagal berulang, auto-sync pause; manual sync tetap tersedia.
- Setelah 60 menit, auto-sync boleh mencoba lagi.

---

## Non-Goals

- Tidak membuat realtime WebSocket/SSE.
- Tidak membuat event-sourcing/journal sync penuh.
- Tidak membuat UI review konflik detail pada fase ini.
- Tidak mengubah alur login/role selain memakai user login sebagai scope.
- Tidak mengunci halaman saat sync berjalan.
- Tidak rebuild APK dalam scope desain ini.

---

## Keputusan Desain

Gunakan **scoped session file + polling ringan + merge last-write-wins**.

Scope final:

```txt
userKey + periodKey + syncSessionId
```

Alasan:

1. File global sekarang penyebab utama risiko tabrakan.
2. User memilih isolasi berdasarkan user + periode.
3. User menambahkan syarat: 1 periode bisa punya 2 opname, jadi perlu `syncSessionId` berbasis create date.
4. Polling lebih sederhana dari WebSocket dan cukup untuk opname lapangan.
5. Last-write-wins paling minim gangguan untuk user lapangan.
6. Auto-sync harus non-blocking dan anti-spam.

---

## Model Data

Tambahkan metadata sync ke state APP1.

```js
sync: {
  sessionId: '2026-06-20260626T090500Z-a1b2c3',
  createdAt: '2026-06-26T09:05:00.000Z',
  createdBy: 'username',
  period: '2026-06',
  lastLocalChangeAt: '2026-06-26T09:10:00.000Z',
  lastSyncedAt: '2026-06-26T09:10:30.000Z',
  status: 'idle',
  lastError: '',
  failureCount: 0,
  pausedUntil: null
}
```

Status:

```js
'idle' | 'syncing' | 'offline' | 'error' | 'paused'
```

`syncSessionId` rules:

- Dibuat sekali saat session opname pertama kali dibuat/import.
- Tidak berubah saat save/load/reload.
- Format stabil dan aman untuk path:

```txt
<periodKey>-<createdAtCompact>-<shortHash>
```

Contoh:

```txt
2026-06-20260626T090500Z-a1b2c3
```

`createdAt` menjadi pembeda saat periode sama punya lebih dari 1 opname.

---

## Backend Storage Design

Ganti default sync aktif dari file global menjadi path scoped.

```txt
data/sync/app1/<userKey>/<periodKey>/<syncSessionId>/session.json
data/sync/app1/<userKey>/<periodKey>/<syncSessionId>/result.json
data/sync/app1/<userKey>/<periodKey>/<syncSessionId>/meta.json
```

`userKey`:

- Diambil dari JWT/session user jika tersedia.
- Fallback sementara dari header existing `x-sync-user` untuk compatibility.
- Disanitasi untuk path file.

`periodKey`:

- Diambil dari query/body `period`.
- Fallback dari `state.rooms[0].meta.period` jika ada.
- Disanitasi untuk path file.

`syncSessionId`:

- Wajib untuk endpoint scoped.
- Jika missing, backend menolak request dengan error jelas.

Compatibility:

- File global lama boleh tetap dibaca sementara untuk migrasi/manual lama.
- Path scoped menjadi default baru.

---

## API Design

### Push/Pull session

```http
POST /api/sync/session?period=<periodKey>&sessionId=<syncSessionId>
GET  /api/sync/session?period=<periodKey>&sessionId=<syncSessionId>
```

Berisi seed dari Web/PC:

- master DB
- history DB
- initial opname state
- metadata sync

### Push/Pull result

```http
POST /api/sync/result?period=<periodKey>&sessionId=<syncSessionId>
GET  /api/sync/result?period=<periodKey>&sessionId=<syncSessionId>
```

Berisi state opname hasil terbaru dan metadata perubahan.

### List sessions per periode

```http
GET /api/sync/sessions?period=<periodKey>
```

Response item minimal:

```js
{
  sessionId: '2026-06-20260626T090500Z-a1b2c3',
  period: '2026-06',
  createdAt: '2026-06-26T09:05:00.000Z',
  createdBy: 'username',
  fileName: 'Opname Juni.xlsx',
  roomCount: 25,
  checkedCount: 120,
  totalCount: 500,
  updatedAt: '2026-06-26T10:00:00.000Z'
}
```

Android flow:

- Jika list menghasilkan 1 session, boleh auto-pilih.
- Jika lebih dari 1, user pilih berdasarkan create date/file/progress.
- Setelah dipilih, Android menyimpan `syncSessionId` lokal dan sync hanya ke session itu.

---

## Client Data Flow

### Web membuat/push sesi

1. User upload/import data opname.
2. App buat `syncSessionId` jika belum ada.
3. Web auto-push `session.json` saat online.
4. `session.json` membawa state awal dan metadata session.

### Android mengambil sesi

1. Android login user yang sama.
2. Android pilih periode.
3. Android load daftar session pada periode itu.
4. Jika session lebih dari 1, tampilkan daftar ringkas.
5. Android pull session terpilih.
6. Android menyimpan `syncSessionId` lokal.

### Auto-sync hasil dua arah

1. Client deteksi perubahan lokal via `lastLocalChangeAt`.
2. Jika jaringan sehat dan tidak paused, client push result scoped.
3. Client cek result server terbaru.
4. Jika server lebih baru, client pull lalu merge.
5. Merge last-write-wins per asset/room field berdasarkan `updatedAt`.
6. Konflik dicatat di `meta.conflicts`, UI tidak diblokir.

### Manual Sync

- Tombol `↻ Sync` tetap menjalankan sync sekarang.
- Manual sync boleh dijalankan saat auto-sync `paused`.
- Jika manual sync sukses, reset `failureCount`, `pausedUntil`, dan status kembali `idle`.

---

## Anti-Spam & No Signal Rules

User meminta area no signal tidak boleh spam.

Rules:

- Auto-sync normal hanya saat jaringan sehat.
- Maksimal 3 percobaan auto saat gagal/no signal.
- Gagal ke-3 membuat status `paused`.
- Saat `paused`, auto-sync berhenti 60 menit.
- Selama `paused`:
  - tidak ada retry background
  - tidak ada toast berulang
  - tidak ada status berkedip
  - tidak ada perubahan status kecil berulang
- Tombol manual Sync tetap aktif.
- Manual sync hanya membuat 1 request per klik.
- Manual sync gagal menampilkan 1 feedback singkat, lalu tetap paused.
- Setelah 60 menit, auto-sync boleh coba 1 kali lagi.
- Jika gagal lagi, pause 60 menit lagi.

Nilai yang disetujui:

```js
AUTO_SYNC_MAX_FAILURES = 3
AUTO_SYNC_PAUSE_MS = 60 * 60 * 1000
```

Interval normal boleh dibuat konservatif, misal 30 detik, karena sync bukan realtime kritis.

```js
AUTO_SYNC_INTERVAL_MS = 30 * 1000
```

---

## UI Design

Fokus UI hanya tombol Sync di actions bar existing `app/src/pages/OpnamePage.jsx:288-304`.

Saat sync berjalan:

- Tombol `↻ Sync` menampilkan ring loading kecil.
- Tombol boleh disabled selama request aktif agar tidak dobel request.
- Tidak ada modal.
- Tidak pindah halaman.
- Tidak mengunci checkbox/input/table.

Status kecil:

- Tidak spam.
- Tidak pakai toast untuk auto-sync sukses.
- Auto-sync sukses cukup diam atau label stabil singkat seperti `Tersinkron`.
- Error auto-sync tidak toast berulang.
- Saat paused, tampil statis: `Sync dijeda`.
- Manual sync boleh tampil satu toast sukses/error karena user klik.

Copy yang aman:

- `Sync`
- `Sinkron...`
- `Offline`
- `Sync dijeda`
- `Gagal sync`

---

## Merge & Conflict Rules

Tambahkan `updatedAt` pada unit yang bisa berubah:

- asset field
- no barcode asset
- not at location asset
- signatures
- room metadata yang editable

Rules:

- Jika field hanya berubah lokal → simpan lokal lalu push.
- Jika field hanya berubah server → pull server.
- Jika lokal dan server berubah field sama → `updatedAt` terbaru menang.
- Konflik dicatat dengan minimal:

```js
{
  sessionId,
  roomKey,
  assetKey,
  field,
  localUpdatedAt,
  remoteUpdatedAt,
  winner: 'local' | 'remote'
}
```

Catatan:

- Last-write-wins hanya berlaku dalam session yang sama.
- Tidak pernah merge lintas user.
- Tidak pernah merge lintas `syncSessionId`.

---

## Error Handling

- Offline/no signal → failure count naik; setelah 3 gagal, status `paused` 60 menit.
- Server error → sama seperti offline, `lastError` disimpan.
- Payload rusak → backend menolak dan tidak overwrite file valid terakhir.
- Missing `period` atau `syncSessionId` → backend return error jelas.
- Session tidak ditemukan → Android minta user pilih session lagi.
- Unauthorized user → backend tolak request.
- File write gagal → tulis temp file dulu, rename atomic hanya setelah JSON valid.
- Auto pull server → merge dulu, jangan replace buta state lokal.

---

## Component / File Impact

| File | Change |
|---|---|
| `app/src/pages/OpnamePage.jsx` | Tombol Sync membaca status sync, tampil ring loading, manual sync memanggil sync runner baru |
| `app/src/components/NetworkSyncHub.jsx` | Push/pull session/result memakai period + sessionId, Android dapat memilih session jika periode berisi lebih dari 1 opname |
| `app/src/store/useOpnameState.jsx` | Tambah `state.sync`; reducer update `lastLocalChangeAt` pada perubahan lokal; simpan `syncSessionId` |
| `app/src/store/useOpnameStorage.jsx` | Save/load tetap mempertahankan metadata sync; local storage key idealnya ikut user/session agar login bergantian tidak overwrite |
| `app/src/server/plugins/syncPlugin.js` | Endpoint Vite dev/preview memakai scoped path dan list sessions |
| `app/server/routes/syncRoute.js` | Endpoint production/server route disamakan dengan plugin |
| `app/src/utils/auth.js` | Ambil user login untuk client metadata jika dibutuhkan |

Helper kecil yang disarankan:

| File | Change |
|---|---|
| `app/src/utils/opnameSyncSession.js` | create/normalize session metadata, sanitize keys, build request params |
| `app/src/hooks/useOpnameAutoSync.js` | polling, lock request, pause 60 menit, manual sync entrypoint |
| `app/src/utils/opnameSyncMerge.js` | pure merge last-write-wins + conflict collection |
| `app/src/__tests__/...` | unit/integration tests untuk session scope, merge, anti-spam, UI status |

Keep helpers small. No WebSocket, no journal, no framework baru.

---

## Testing Strategy

### Unit Tests

- `syncSessionId` dibuat sekali dan tidak berubah setelah reload.
- `syncSessionId` memuat period + created date + hash pendek.
- Scope path backend selalu memakai `user + periode + syncSessionId`.
- Dua session pada periode sama tidak menghasilkan path sama.
- Dua user pada periode/session sama tidak menghasilkan path sama.
- Merge last-write-wins memilih field dengan `updatedAt` terbaru.
- Conflict tercatat saat field sama berubah di lokal dan server.
- Failure count 3x membuat status `paused`.
- Status `paused` mencegah auto retry sebelum 60 menit.
- Manual sync sukses mereset pause/failure count.
- Setelah 60 menit, auto-sync boleh mencoba lagi.

### Integration Tests

- Web push session A periode Juni.
- Web push session B periode Juni.
- Android list session periode Juni mendapat 2 item.
- Android sync session A tidak mengambil result session B.
- User A dan User B tidak saling melihat/overwrite session.
- Payload invalid tidak menghapus file valid sebelumnya.
- Endpoint tanpa `sessionId` ditolak.

### Manual Smoke

1. Buka `/app1/opname`.
2. Edit checkbox/field saat offline; UI tetap lancar.
3. Online; ring muncul di tombol Sync saat request berjalan.
4. Saat sync berjalan, checkbox/input/table tetap bisa digunakan.
5. Simulasikan no signal; setelah gagal berulang tidak ada spam toast/status.
6. Pastikan status stabil `Sync dijeda`.
7. Klik manual Sync saat paused; hanya satu request dan satu feedback.
8. Setelah 60 menit, auto retry kembali.
9. Buat 2 session dalam periode sama; Android memilih session yang benar.
10. Login user berbeda; data sync tidak saling terlihat/overwrite.

---

## Acceptance Criteria

- Auto-sync berjalan saat jaringan tersedia.
- Tombol `↻ Sync` tetap tersedia sebagai manual sync.
- Ring loading muncul di tombol saat sync berjalan.
- Sync tidak memblokir proses opname.
- Tidak ada spam toast/status saat no signal.
- Auto-sync pause setelah 3 gagal.
- Manual sync tetap bisa saat paused.
- Auto-sync boleh aktif lagi setelah 60 menit.
- User berbeda tidak saling overwrite.
- Periode sama dengan 2 opname tidak saling overwrite karena `syncSessionId` berbeda.
- Android bisa memilih session jika periode memiliki lebih dari 1 opname.
- Merge memakai last-write-wins berdasarkan `updatedAt`.
- Payload invalid tidak menghapus data valid terakhir.

---

## Open Decisions

Tidak ada. User sudah menyetujui:

- Scope session: user + periode + session create date/session id.
- Mode sync: auto push/pull ringan berkala.
- Konflik: last write wins + log konflik.
- Status sync: ring loading di tombol, tidak mengganggu opname.
- Anti-spam: auto-sync berhenti saat gagal/no signal, manual tetap tersedia, auto retry kembali setelah 60 menit.
