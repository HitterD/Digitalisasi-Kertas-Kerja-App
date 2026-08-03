lanjP1 Opname — MAT Process Badge Design Spec

**Tanggal:** 2026-06-25  
**Scope:** Tampilkan indikator kecil `proses MAT` di setiap aset pada halaman APP1 opname jika barcode aset sedang memiliki transaksi MAT aktif di `ASSET_MANAGEMENT.dbo.V_TRX_MAT`.

---

## Masalah

Halaman APP1 opname menampilkan daftar aset per ruangan lewat `AssetTable` di `app/src/components/AssetTable.jsx`. Saat ini operator dapat mengecek riwayat MAT dari barcode checker, tetapi daftar aset opname belum memberi sinyal langsung bahwa suatu barcode sedang dalam proses MAT.

Dampaknya, operator harus membuka pengecekan terpisah untuk tahu aset mana yang sedang proses MAT. User meminta label kecil di bawah nama aset agar status MAT aktif terlihat langsung saat opname.

---

## Tujuan

- Tampilkan label `proses MAT` di bawah nama aset pada desktop table dan mobile card.
- Gunakan tampilan pilihan C: badge ringkas plus detail MAT singkat.
- Status aktif mengikuti logika existing `mat-history`: semua `STATUS` selain `COMPLETED` dan `REJECTED` dianggap sedang proses MAT.
- Ambil data secara batch agar tidak membuat banyak request per aset.
- Jangan mengubah data opname tersimpan, PDF, sync, atau import flow.

---

## Non-Goals

- Tidak mengubah modal riwayat MAT existing.
- Tidak menambah edit/approval MAT dari APP1.
- Tidak menyimpan data MAT ke localStorage/session opname.
- Tidak menampilkan semua riwayat MAT di tabel; detail lengkap tetap lewat barcode checker / modal riwayat MAT.
- Tidak rebuild APK dalam scope desain ini.

---

## Keputusan Desain

Gunakan pendekatan batch endpoint per halaman asset.

Alasan:

1. Route single-barcode `GET /api/db/mat-history/:barcode` sudah ada, tetapi memanggilnya untuk 20 aset aktif akan membuat N+1 request.
2. Batch endpoint menjaga UI ringan: satu request untuk barcode pada halaman pagination aktif.
3. Data MAT tidak perlu masuk ke state opname utama karena hanya indikator live.
4. Pendekatan ini minim diff dan mengikuti pola backend SQL existing di `app/server/routes/sqlRoute.js`.

---

## Arsitektur

### Backend

Tambah endpoint:

```http
GET /api/db/mat-active?barcodes=13000042,13000043
```

Lokasi: `app/server/routes/sqlRoute.js`.

Respons sukses:

```json
{
  "success": true,
  "count": 1,
  "data": {
    "13000042": {
      "noMat": "MAT-0241",
      "status": "WAITING_APPROVAL",
      "nextVerificator": "BUDI",
      "nextRoleVerificator": "GA Manager",
      "createdDate": "2026-06-25T10:00:00.000Z"
    }
  },
  "timestamp": "2026-06-25T10:00:00.000Z"
}
```

Respons kosong:

```json
{
  "success": true,
  "count": 0,
  "data": {},
  "timestamp": "2026-06-25T10:00:00.000Z"
}
```

### Frontend API

Tambah helper di `app/src/utils/matApi.js`:

```js
fetchActiveMatByBarcodes(barcodes)
```

Behavior:

- Input array barcode.
- Trim, buang kosong, dedupe.
- Jika kosong, return `{ success: true, data: {} }` tanpa fetch.
- Encode query string sebelum request.
- Pakai `fetchWithAuth` dan `apiUrl` seperti helper `fetchMatHistory` existing.

### UI

Update `app/src/components/AssetTable.jsx`:

- Derive barcode unik dari `paginatedAssets`.
- Fetch batch saat halaman, filter search, atau room berubah.
- Simpan hasil ke state lokal `activeMatByBarcode`.
- Kirim info MAT ke `AssetRow` dan `AssetCard`.
- Tampilkan badge di bawah nama aset jika info MAT ada.

---

## Data Flow

1. `AssetTable` menghitung `paginatedAssets` dari hasil search + pagination.
2. `useMemo` membuat daftar barcode unik dari `paginatedAssets`.
3. `useEffect` memanggil `fetchActiveMatByBarcodes(barcodes)`.
4. Backend validasi query `barcodes`.
5. Backend query `V_TRX_MAT` untuk barcode aktif saja.
6. Backend return map per barcode.
7. `AssetTable` menyimpan map hasil fetch.
8. Row/card membaca map dan render badge.
9. Saat halaman pagination atau room berubah, request lama diabaikan lewat cleanup flag.

---

## SQL Logic

Status aktif:

```sql
UPPER(LTRIM(RTRIM(ISNULL(STATUS, '')))) NOT IN ('COMPLETED', 'REJECTED')
```

Query mengambil record MAT aktif terbaru per barcode:

```sql
WITH ActiveMat AS (
  SELECT
    ID,
    LTRIM(RTRIM(BARCODE_ASSET)) AS BARCODE_ASSET,
    NO_MAT,
    STATUS,
    NEXT_VERIFICATOR,
    NEXT_ROLE_VERIFICATOR,
    CREATED_DATE,
    ROW_NUMBER() OVER (
      PARTITION BY LTRIM(RTRIM(BARCODE_ASSET))
      ORDER BY CREATED_DATE DESC, ID DESC
    ) AS rn
  FROM [dbo].[V_TRX_MAT]
  WHERE LTRIM(RTRIM(BARCODE_ASSET)) IN (...)
    AND UPPER(LTRIM(RTRIM(ISNULL(STATUS, '')))) NOT IN ('COMPLETED', 'REJECTED')
)
SELECT *
FROM ActiveMat
WHERE rn = 1
ORDER BY BARCODE_ASSET;
```

Implementation harus memakai parameterized query. Barcode tidak boleh diinterpolasi langsung ke SQL string.

---

## UI Detail

### Desktop Table

Kolom `NAMA ASET`:

```text
Laptop Lenovo ThinkPad
[proses MAT · MAT-0241]
next: GA Manager
```

### Mobile Card

Di bawah nama aset:

```text
Laptop Lenovo ThinkPad
[proses MAT · MAT-0241]
next: GA Manager
```

### Visual Style

- Badge biru muda agar berbeda dari status kondisi opname.
- Text kecil, uppercase atau semi-uppercase.
- `next:` ditampilkan hanya jika `nextRoleVerificator` atau `nextVerificator` ada.
- Jika `NO_MAT` kosong, tampilkan `proses MAT` saja.

### Loading

- Tidak tampil skeleton/loading per row.
- Row tetap normal sampai data MAT datang.
- Badge muncul setelah response sukses.

### Error

- Gagal fetch MAT tidak memblokir opname.
- Tidak tampil toast agar tidak mengganggu input lapangan.
- UI tetap tanpa badge jika request gagal.

---

## Error Handling & Security

Backend:

- Validasi `barcodes` dari query string.
- Trim, dedupe, buang kosong.
- Max 100 barcode per request.
- Barcode kosong return success empty map.
- Barcode terlalu banyak return 400 dengan pesan jelas.
- Pakai `registry.guard('sql', ...)` seperti route SQL lain.
- Pakai parameterized query untuk setiap barcode.
- Jangan leak stack trace ke response.

Frontend:

- Skip fetch jika barcode list kosong.
- Abaikan response jika component sudah unmount atau request sudah obsolete.
- Treat response invalid sebagai empty map.
- Jangan simpan data MAT ke localStorage.

---

## File Impact

| File | Change |
|---|---|
| `app/server/routes/sqlRoute.js` | Tambah `GET /api/db/mat-active?barcodes=...` |
| `app/src/utils/matApi.js` | Tambah `fetchActiveMatByBarcodes(barcodes)` |
| `app/src/components/AssetTable.jsx` | Fetch MAT aktif untuk `paginatedAssets`, render badge di table/card |
| `app/src/__tests__/sqlRoute.matActive.test.js` atau existing SQL route test | Test route batch MAT aktif |
| `app/src/__tests__/matApi.test.js` atau existing util test | Test helper frontend |
| `app/src/__tests__/AssetTable.matBadge.test.jsx` atau existing AssetTable test | Test render badge |

---

## Testing Strategy

### Backend Route Tests

- Return empty map jika query `barcodes` kosong.
- Reject >100 barcode dengan 400.
- Query memakai parameterized inputs, bukan interpolasi raw barcode.
- Exclude `COMPLETED` dan `REJECTED`.
- Return latest active MAT per barcode.

### Frontend Utility Tests

- `fetchActiveMatByBarcodes([])` return empty tanpa fetch.
- Deduplicate barcode.
- Encode query string.
- Throw error jika response non-OK.

### UI Tests

- Asset dengan MAT aktif menampilkan `proses MAT · <NO_MAT>`.
- `next: <role>` tampil jika ada role/verificator.
- Asset tanpa MAT aktif tidak menampilkan badge.
- Search/pagination tetap memanggil fetch untuk barcode yang tampil saja.

### Smoke

Dari `app/`:

```bash
rtk npm run test -- sqlRoute matApi AssetTable
```

Jika test command tidak mendukung filter di atas, jalankan test suite yang tersedia paling dekat.

---

## Acceptance Criteria

- Di `/app1/opname`, aset dengan MAT aktif menampilkan badge `proses MAT` di bawah nama aset.
- Badge menampilkan `NO_MAT` jika tersedia.
- Badge menampilkan `next:` jika verifier/role tersedia.
- Status aktif mengikuti aturan: selain `COMPLETED` dan `REJECTED`.
- Fetch MAT dilakukan batch untuk aset halaman aktif, bukan satu request per aset.
- Kegagalan fetch MAT tidak mengganggu checklist opname.
- Test terkait backend, util, dan UI lulus.

---

## Open Decisions

Tidak ada. User sudah menyetujui:

- Pendekatan B: batch endpoint per halaman.
- UI pilihan C: badge + detail MAT ringkas.
- Status aktif: semua status selain `COMPLETED` dan `REJECTED`.
