# Live Sync via Server-Sent Events (SSE)

Membuat sinkronisasi antara Tablet dan PC Web berjalan secara **live** (sub-detik), tanpa delay 30 detik dan tanpa klik manual "Tarik Hasil".

## Konteks

Saat ini auto-sync (`useOpnameAutoSync`) sudah fully functional (push→pull→merge) tapi:
1. **Tidak pernah aktif** di PC Web karena `state.sync` harus di-init manual via "Push Sesi" / "Tarik Hasil"
2. **Polling 30 detik** — meskipun aktif, update baru terasa setelah max 30 detik

## Desain: 3 Perubahan Terfokus

### 1. Auto-init `sync` saat data dimuat (Aktivasi auto-sync)

**Masalah:** `useOpnameAutoSync` gated oleh `!!state.sync`. Saat user load Excel atau import data, `sync` tetap `null` sampai klik manual.

**Solusi:** Tambah `useEffect` di `OpnameContext.jsx` yang auto-init sync metadata saat `state.isLoaded && state.rooms.length > 0 && !state.sync`.

### 2. SSE Endpoint di Server (Notifikasi real-time)

Tambah di `syncRoute.js`:
- In-memory SSE client registry (`sseClients` Set)
- SSE endpoint: `GET /api/sync/events` (persistent connection)
- Emit event setelah upload berhasil di `handleUpload`

### 3. SSE Listener di Client

Hook baru `useOpnameSseSync.js`:
- Buka `EventSource` ke `/api/sync/events`
- Saat event → panggil `manualSync()` (pull→merge)
- Auto-reconnect bawaan browser
