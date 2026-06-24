# APP1 Opname — Room Navigation + Barcode Readability Design Spec

**Tanggal:** 2026-06-24  
**Scope:** Perbaikan UI/UX penomoran ruangan dan visibilitas angka barcode di halaman APP1 Opname. Berlaku untuk web dan APK karena APK memakai source React/CSS yang sama lewat Capacitor WebView.

---

## Masalah

1. **Penomoran ruangan tidak user friendly saat ruangan banyak.** Room navigator sekarang menampilkan semua nomor ruangan dalam strip horizontal scroll di `app/src/pages/OpnamePage.jsx:195-217`. Jika ruangan banyak, user harus scroll kanan panjang untuk lompat ke ruangan jauh.
2. **Auto-scroll aktif belum cukup.** Active dot sudah di-scroll ke tengah via `scrollIntoView` di `app/src/pages/OpnamePage.jsx:36-40`, tapi user tetap sulit melihat daftar lengkap dan status banyak ruangan sekaligus.
3. **Dot nomor terlalu kecil untuk touch/APK.** Style dot saat ini `22px` dengan font `9px` di `app/src/styles/components.css:1336-1343`, kurang ergonomis untuk tablet/APK.
4. **Barcode kurang terlihat.** Barcode di tabel memakai `font-size: 12px` di `app/src/styles/components.css:945`. Barcode di card/mobile lebih kecil lagi, `font-size: 10px` di `app/src/components/AssetTable.jsx:182`.
5. **User ingin tulisan lain tetap sama.** Perubahan typography harus fokus ke barcode, bukan seluruh tabel/card.

---

## Tujuan UX

- User bisa lompat ruangan jauh tanpa scroll horizontal panjang.
- User tetap dapat melihat status ruangan: kosong, proses, selesai, aktif.
- Tap target nomor ruangan nyaman di tablet/APK.
- Angka barcode lebih mudah dibaca saat scan atau verifikasi manual.
- Tidak mengubah logic opname, data, PDF, sync, signature, atau struktur file native Android.

---

## Rekomendasi Desain

### A. Compact room navigator + expandable number grid

Ganti pola “semua dot nomor selalu ditampilkan horizontal” menjadi navigator dua mode:

#### Default compact bar

Default bar tetap hemat ruang dan sticky di atas konten:

- Tombol previous.
- Select/search ruangan existing tetap ada untuk lompat cepat berbasis nama ruangan.
- Progress ring existing tetap ada.
- Ringkasan posisi: `Ruangan X dari Y`.
- Tombol `Lihat semua` / `Tutup`.
- Preview nomor sekitar posisi aktif saja, contoh untuk ruang 12 dari 80: `1 … 10 11 12 13 14 … 80`.

Manfaat:

- Tidak ada scroll horizontal panjang di kondisi normal.
- User tetap tahu posisi sekarang dan total ruangan.
- Prev/next dan select existing tetap familiar.

#### Expandable number grid

Klik `Lihat semua` membuka grid nomor ruangan di bawah compact bar:

- Grid `display: grid` dengan `repeat(auto-fill, minmax(...))` agar wrap multi-baris.
- Max-height pendek dengan vertical scroll jika ruangan sangat banyak.
- Nomor ruangan tampil besar dan mudah ditap.
- Klik nomor langsung `setRoomIndex(i)`.
- Grid otomatis tertutup setelah pilih ruangan agar layar tetap fokus.

Status visual nomor:

| Status | Visual |
|---|---|
| Aktif | Border/ring orange tebal, ukuran sedikit lebih besar, `aria-current="true"` |
| Selesai | Background `var(--accent)`, teks terang, bisa tambah check kecil |
| Proses | Outline `var(--accent)`, teks orange |
| Kosong | Border neutral, teks muted |

### B. Responsive behavior web + APK

#### Desktop/web lebar

- Compact bar satu baris.
- Preview nomor sekitar aktif tampil di kanan progress.
- Expandable grid tampil sebagai panel penuh lebar di bawah nav.

#### Tablet/APK landscape

- Compact bar boleh wrap jadi 2 baris jika ruang terbatas.
- Tap target nomor grid minimal 40px.
- Grid panel max-height sekitar 220–280px.

#### Mobile/APK portrait

- Select ruangan full width.
- Progress + `Ruangan X dari Y` di baris kedua.
- Preview nomor boleh disembunyikan; tombol `Lihat semua` tetap ada.
- Grid nomor minimal 44px tap target.

### C. Barcode readability only

Perbesar angka barcode tanpa mengubah tulisan lain:

- `.wa-table .col-barcode`: font `12px` → **15px**, `font-weight: 800`, `font-variant-numeric: tabular-nums`.
- Mobile/card barcode di `AssetCard`: font `10px` → **16px**, `font-weight: 800`, `font-variant-numeric: tabular-nums`.
- Input barcode di `EditableAssetTable` (Salah Ruangan) boleh tetap mengikuti input existing, atau diberi class khusus jika ternyata masih kecil saat implementasi.
- Warna tetap pakai token existing: `var(--accent)` / `var(--terracotta-500)` sesuai konteks existing.

Catatan: fitur copy barcode tetap dipertahankan karena sudah ada di `app/src/components/AssetTable.jsx:75-95` dan UI `COPIED` di `app/src/components/AssetTable.jsx:119-132`.

---

## Komponen/State yang Dibutuhkan

### State baru di `OpnamePage.jsx`

- `isRoomGridOpen`: boolean untuk expand/collapse grid nomor.

### Helper UI kecil

- `getVisibleRoomNumbers(roomIdx, totalRooms)`: menghasilkan indeks ruangan untuk preview compact, dengan ellipsis virtual.
- `getRoomStatus(overallProgress[i])`: menghasilkan `done | progress | empty`.

Helper bisa dibuat sebagai fungsi lokal di `OpnamePage.jsx` karena scope kecil. Jika nanti membesar, extract ke file utility terpisah.

---

## File Terdampak

| Bagian | File |
|---|---|
| Room navigator state + JSX compact/grid | `app/src/pages/OpnamePage.jsx` |
| Room navigator styling + barcode table font | `app/src/styles/components.css` |
| Responsive web/APK sizing | `app/src/styles/responsive.css` |
| Barcode card/mobile font | `app/src/components/AssetTable.jsx` |
| APK refresh | build web assets + Capacitor sync/build Android |

Tidak perlu ubah native Android source kecuali build artifact APK perlu dibuat ulang.

---

## Accessibility

- Tombol nomor ruangan pakai `<button type="button">`, bukan `<div>` clickable.
- Tambah `aria-label="Buka ruangan 12: [nama ruangan]"`.
- Nomor aktif pakai `aria-current="true"`.
- Tombol grid pakai `aria-expanded={isRoomGridOpen}`.
- Keyboard navigation tetap bisa via Tab dan Enter.
- Contrast memakai design token existing `--accent`, `--accent-soft`, `--border`, `--text-*`.

---

## Yang Tidak Diubah

- Logic checklist aset.
- Filtering/search barcode.
- Pagination aset.
- PDF generation.
- Sync jaringan.
- Save/load.
- Signature section.
- Native Android activity/config.
- Tulisan selain angka barcode.

---

## Verifikasi

### Manual web

1. Buka `/app1/opname` dengan data banyak ruangan.
2. Pastikan default nav tidak membutuhkan scroll horizontal panjang.
3. Klik `Lihat semua`, grid nomor muncul dan wrap multi-baris.
4. Klik nomor jauh, room berubah, grid tertutup, select/progress ikut update.
5. Cek status nomor: empty, progress, done, aktif.
6. Cek barcode di tabel lebih besar; kolom lain tetap ukuran lama.
7. Resize 1280px, 1024px, 768px, 375px.

### Manual APK/tablet

1. Build web + sync Capacitor.
2. Install APK debug/release di tablet.
3. Buka APP1 Opname.
4. Tap `Lihat semua`, pastikan tap target nomor nyaman.
5. Pilih ruangan jauh, tidak perlu scroll kanan panjang.
6. Cek barcode di table/card lebih visible.

### Automated/smoke

- Run lint/build existing project command.
- Jika tersedia test UI terkait APP1, run test tersebut.

---

## Acceptance Criteria

- User tidak perlu scroll horizontal panjang untuk pindah ruangan jauh.
- Nomor ruangan banyak bisa dilihat lewat grid wrap.
- Active room, progress room, done room, empty room terlihat beda.
- Barcode table dan card lebih besar, minimal 15px web/table dan 16px card/mobile.
- Tulisan non-barcode tidak berubah ukurannya secara sengaja.
- Web build berhasil.
- APK baru bisa dibuat dari source terbaru.
