# Design Spec: MAT History Modal (Asset Movement Tracker)

**Date:** 2026-04-14  
**Project:** Digitalisasi Kertas Kerja APP  
**Status:** Approved

---

## Overview

Fitur untuk melacak riwayat perpindahan aset melalui proses MAT (Mutasi Asset Transfer). User dapat melihat dari ruangan mana ke ruangan mana suatu aset telah berpindah, lengkap dengan seluruh detail transaksi dan status proses MAT saat ini.

---

## Scope

- Menambahkan endpoint API baru di backend untuk query `V_TRX_MAT` per barcode
- Membuat komponen modal baru `MatHistoryModal` dengan tampilan timeline vertikal
- Menambahkan tombol trigger di setiap baris hasil pencarian aset yang sudah ada
- Menambahkan API client baru `matApi.js` mengikuti pola `sqlServerApi.js`

---

## Architecture

### Approach
Extend `sqlPlugin.js` yang sudah ada dengan endpoint baru. Konsisten dengan pola yang sudah ada di project. Tidak membuat plugin Vite baru untuk menghindari duplikasi setup connection pool.

### Data Flow
```
User klik tombol "Lacak MAT" di baris aset
    → MatHistoryModal terbuka (loading state)
    → matApi.js fetchMatHistory(barcode)
    → GET /api/db/mat-history/:barcode
    → sqlPlugin.js query V_TRX_MAT WHERE BARCODE_ASSET = @barcode
    → Response JSON dengan records + hasActiveMAT flag
    → Modal render timeline vertikal
```

---

## Backend

### Endpoint Baru

```
GET /api/db/mat-history/:barcode
```

**Query SQL:**
```sql
SELECT
  TRXID, NO_MAT, JENIS_MAT,
  ASAL_RUANGAN_ID, TUJUAN_RUANGAN_ID,
  LPB, KONDISI_ID, CREATED_DATE,
  USER_MAKER, NAME_MAKER,
  STATUS, PENJELASAN,
  COUNTER_NUM, STEP_APPROVAL,
  DEPT, BARCODE_ASSET, NAMA_ASSET,
  NEXT_VERIFICATOR, NEXT_ROLE_VERIFICATOR
FROM [dbo].[V_TRX_MAT]
WHERE LTRIM(RTRIM(BARCODE_ASSET)) = @barcode
ORDER BY CREATED_DATE DESC
```

**Response shape:**
```json
{
  "success": true,
  "barcode": "...",
  "hasActiveMAT": true,
  "count": 5,
  "data": [ ...records... ],
  "timestamp": "..."
}
```

**Status Logic:**
- `hasActiveMAT = true` jika ada minimal satu record dengan STATUS tidak dalam `['COMPLETED', 'REJECTED']`
- Dihitung di sisi server sebelum response dikirim

**Input validation:**
- Barcode di-decode dari URL (`decodeURIComponent`)
- Barcode kosong atau tidak valid → return 400

---

## Frontend

### File Baru

#### 1. `src/utils/matApi.js`
API client mengikuti pola `sqlServerApi.js`:
- `fetchMatHistory(barcode)` — GET `/api/db/mat-history/:barcode`
- Menggunakan `fetchWithAuth` dan `apiUrl` dari `apiConfig.js`
- Throw error jika response tidak ok

#### 2. `src/components/MatHistoryModal.jsx`
Komponen modal dengan:

**Props:**
- `barcode` — string barcode aset yang dilacak
- `namaAset` — string nama aset (untuk judul modal)
- `isOpen` — boolean visibility
- `onClose` — callback tutup modal

**Internal state:**
- `loading` — boolean saat fetch
- `data` — array records dari API
- `hasActiveMAT` — boolean dari response
- `error` — string error jika fetch gagal

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Riwayat MAT — [NAMA_ASSET]                 │
│  Barcode: [BARCODE]   [BADGE: Proses MAT]   │
├─────────────────────────────────────────────┤
│  (loading spinner saat fetch)               │
│  (pesan kosong jika tidak ada data)         │
│                                             │
│  ● [CREATED_DATE] — No. MAT: [NO_MAT]      │
│  │  Dari: [ASAL_RUANGAN_ID]                 │
│  │    → Ke: [TUJUAN_RUANGAN_ID]             │
│  │  Jenis: [JENIS_MAT] | Status: [STATUS]   │
│  │  LPB: [LPB] | Kondisi: [KONDISI_ID]      │
│  │  Pembuat: [NAME_MAKER] | Dept: [DEPT]    │
│  │  Penjelasan: [PENJELASAN]                │
│  │  Step: [COUNTER_NUM]/[STEP_APPROVAL]     │
│  │  Next Verif: [NEXT_VERIFICATOR]          │
│  │           ([NEXT_ROLE_VERIFICATOR])      │
│  │                                          │
│  ● [CREATED_DATE] — No. MAT: [NO_MAT]      │
│  │  ...                                     │
│                                             │
│                          [Tutup]            │
└─────────────────────────────────────────────┘
```

**Badge "Proses MAT":**
- Muncul di header hanya jika `hasActiveMAT = true`
- Warna: kuning/orange (konsisten dengan warna `MASTER_FILL` di project)
- Jika `hasActiveMAT = false`: tidak ada badge, tampilan normal

**Timeline styling:**
- Tiap node = satu record transaksi
- Garis vertikal penghubung dengan CSS `border-left`
- Dot/bullet di tiap node
- Diurutkan dari terbaru ke terlama (sesuai ORDER BY server)

### File yang Dimodifikasi

#### 3. `src/server/plugins/sqlPlugin.js`
Tambahkan handler baru sebelum `next()` di akhir:
```javascript
// GET /api/db/mat-history/:barcode
const matHistoryMatch = req.url?.match(/^\/api\/db\/mat-history\/([^/?]+)/);
if (matHistoryMatch && req.method === 'GET') { ... }
```

#### 4. `src/components/BarcodeSearchModal.jsx`
- Tambahkan tombol "Lacak Riwayat MAT" di bagian hasil pencarian (setelah barcode ditemukan)
- State untuk `showMatHistory` (boolean) di dalam komponen
- Render `<MatHistoryModal>` dengan `barcode` dan `namaAset` dari hasil pencarian yang aktif
- Tombol tidak muncul jika pencarian belum dilakukan atau barcode tidak ditemukan

---

## Modal Stacking

`MatHistoryModal` dibuka di atas `BarcodeSearchModal` yang sudah terbuka (dua modal bertumpuk). Ini ditangani dengan:
- `MatHistoryModal` menggunakan `z-index` lebih tinggi dari `BarcodeSearchModal`
- Klik backdrop `MatHistoryModal` hanya menutup `MatHistoryModal`, bukan `BarcodeSearchModal`
- `BarcodeSearchModal` tetap terbuka di belakang saat `MatHistoryModal` aktif

---

## Error Handling

| Kondisi | Behavior |
|---------|----------|
| Barcode tidak ditemukan di V_TRX_MAT | Tampilkan "Tidak ada riwayat MAT untuk aset ini" |
| SQL error / server down | Tampilkan pesan error dengan detail |
| Fetch timeout | Abort signal 10 detik, tampilkan error timeout |
| Barcode kosong | Return HTTP 400 dari server |

---

## Reusability

Komponen `MatHistoryModal` dirancang reusable:
- Menerima `barcode` dan `namaAset` via props — bisa dipanggil dari halaman mana saja
- `matApi.js` adalah pure utility — bisa diimpor dari komponen lain
- Endpoint `/api/db/mat-history/:barcode` adalah REST endpoint generik — bisa dikonsumsi oleh tools lain (Postman, script, dll)

---

## Out of Scope

- Export data MAT history ke Excel/PDF
- Filter berdasarkan tanggal atau status
- Edit/update transaksi MAT dari modal ini
- Notifikasi real-time jika status MAT berubah
