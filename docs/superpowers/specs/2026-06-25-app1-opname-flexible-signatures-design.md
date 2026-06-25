# APP1 Opname — Flexible Signature Section Design Spec

**Tanggal:** 2026-06-25  
**Scope:** Ubah section tanda tangan di bawah halaman `/app1/opname` menjadi kolom fleksibel per ruangan: default 3, minimal 2, maksimal 4, label/nama editable, tanda tangan bisa `Lock`/`Unlock`, dan export PDF mengikuti data yang sama.

---

## Masalah

Section tanda tangan APP1 opname saat ini hardcode 3 kolom: `PETUGAS OPNAME 1`, `PETUGAS OPNAME 2`, dan `PIC RUANGAN` di `app/src/components/SignatureSection.jsx:20-53`.

PDF juga hardcode 3 kolom signature dan 3 nama di `app/src/utils/pdfGenerator.js:340-385`.

Dampaknya:

- Tidak bisa menambah kolom `PIC RUANGAN 2` saat dibutuhkan.
- Tidak bisa mengurangi jumlah kolom saat hanya perlu 2 tanda tangan.
- Label jabatan di atas tanda tangan tidak bisa diubah per ruangan.
- Canvas masih bisa tercoret lagi setelah tanda tangan dibuat.
- PDF belum mengikuti jumlah/label tanda tangan yang dipilih user.

---

## Tujuan

- Default signature section berisi 3 kolom:
  1. `PETUGAS OPNAME 1`
  2. `PETUGAS OPNAME 2`
  3. `PIC RUANGAN`
- User bisa tambah 1 kolom sampai maksimal 4 kolom.
- Kolom ke-4 default bernama `PIC RUANGAN 2`.
- User bisa kurangi 1 kolom sampai minimal 2 kolom.
- Label jabatan di atas canvas bisa diedit per ruangan.
- Nama terang di bawah canvas tetap bisa diedit per ruangan.
- Tanda tangan bisa dikunci manual memakai tombol `Lock`.
- Setelah locked, canvas tidak bisa dicoret dan tombol berubah menjadi `Unlock`.
- Canvas signature diperbesar agar lebih nyaman di tablet.
- PDF render jumlah kolom aktif, label, tanda tangan, dan nama sesuai data APP1.

---

## Non-Goals

- Tidak membuat setting global permanen untuk label tanda tangan.
- Tidak membuat pilihan hapus kolom tengah; kurangi hanya menghapus kolom terakhir.
- Tidak mengubah template Excel App2.
- Tidak mengubah flow upload, save/load modal, atau sync jaringan selain memastikan data signature baru tetap ikut state.
- Tidak rebuild APK dalam scope desain ini.

---

## Keputusan Desain

Gunakan **array `signatures[]` per ruangan**.

Alasan:

1. UI dan PDF bisa membaca sumber data yang sama.
2. Jumlah kolom fleksibel tanpa menambah hardcode `petugasOpname3`, `picRuangan2`, dan seterusnya.
3. Format lama masih bisa dimigrasikan dari object existing.
4. Perubahan tetap kecil: hanya signature component, reducer/state helper, dan PDF generator.

---

## Model Data

Format baru per ruangan:

```js
signatures: [
  {
    id: 'petugas-opname-1',
    roleLabel: 'PETUGAS OPNAME 1',
    name: '',
    image: null,
    locked: false
  },
  {
    id: 'petugas-opname-2',
    roleLabel: 'PETUGAS OPNAME 2',
    name: '',
    image: null,
    locked: false
  },
  {
    id: 'pic-ruangan',
    roleLabel: 'PIC RUANGAN',
    name: '',
    image: null,
    locked: false
  }
]
```

Kolom tambahan:

```js
{
  id: 'pic-ruangan-2',
  roleLabel: 'PIC RUANGAN 2',
  name: '',
  image: null,
  locked: false
}
```

Batas:

- `MIN_SIGNATURE_COLUMNS = 2`
- `DEFAULT_SIGNATURE_COLUMNS = 3`
- `MAX_SIGNATURE_COLUMNS = 4`

---

## Migrasi Data Lama

Format lama:

```js
signatures: {
  petugasOpname1: null,
  petugasOpname1Name: '',
  petugasOpname2: null,
  petugasOpname2Name: '',
  picRuangan: null,
  picRuanganName: ''
}
```

Saat room dibaca:

- Jika `room.signatures` sudah array, pakai array itu setelah validasi ringan.
- Jika `room.signatures` object lama, ubah ke 3 item array:
  - `petugasOpname1` → `PETUGAS OPNAME 1`
  - `petugasOpname2` → `PETUGAS OPNAME 2`
  - `picRuangan` → `PIC RUANGAN`
- Jika data kosong/rusak, fallback default 3 item kosong.

Migrasi dilakukan di helper kecil agar `SignatureSection` dan PDF tidak mengulang logic.

---

## UI Design

### Layout

Section tetap di bawah halaman opname, setelah `NotAtLocationSection`, sesuai posisi existing di `app/src/pages/OpnamePage.jsx:374-380`.

Header:

- Judul: `Tanda Tangan & Nama Terang`
- Info kecil: `<jumlah aktif>/4 kolom aktif · minimal 2`
- Tombol `− Kurangi`
- Tombol `+ Tambah PIC`

Grid:

- Desktop/tablet: `repeat(activeCount, minmax(0, 1fr))` sampai 4 kolom.
- Mobile sempit: boleh wrap ke 1–2 kolom via CSS responsive existing.
- Tiap card berisi:
  - input label jabatan
  - canvas tanda tangan besar
  - tombol `Lock` / `Unlock`
  - tombol bersihkan saat belum locked dan ada tanda tangan
  - input nama terang

### Canvas

Canvas diperbesar dari ukuran existing. CSS saat ini memakai `height: 240px` untuk `.signature-pad__canvas-wrap` dan `260px` di mobile; target implementasi menaikkan area tablet/desktop menjadi sekitar 280–300px sambil tetap responsif.

Rationale:

- User minta canvas diperbesar.
- Tablet lapangan butuh area tangan lebih longgar.
- Touch target dan input area tetap sesuai UI/UX: tombol minimal 44px, feedback jelas.

### Palette

Gunakan palette app existing, bukan palette generik:

- `var(--charcoal-900)` / `#0D1117` untuk primary action dan teks kuat.
- `var(--terracotta-500)` / `var(--amber-500)` untuk aksen border/focus.
- `var(--warm-50)` / surface warm untuk card.
- `var(--border)` untuk divider.

Acuan style existing: `app/src/styles/components.css:21-52` dan button primary di `app/src/styles/components.css:117-129`.

### Copy Tombol

User memilih copy Bahasa Inggris:

- `Lock`
- `Unlock`

Bukan `Kunci` / `Buka Kunci`.

---

## Interaction Rules

### Tambah Kolom

- Tombol `+ Tambah PIC` menambah kolom terakhir.
- Default kolom baru: `PIC RUANGAN 2`.
- Disabled saat jumlah kolom = 4.

### Kurangi Kolom

- Tombol `− Kurangi` menghapus kolom terakhir.
- Disabled saat jumlah kolom = 2.
- Tidak perlu modal konfirmasi karena hanya menghapus kolom terakhir. Namun jika kolom terakhir berisi tanda tangan/nama, implementasi boleh memakai confirm ringan untuk mencegah kehilangan data.

### Lock

Saat user klik `Lock`:

- `locked` menjadi `true`.
- Canvas tidak menerima mouse/touch.
- Tombol clear hidden atau disabled.
- Status visual kecil `Locked` boleh tampil.
- Tombol berubah menjadi `Unlock`.

Saat user klik `Unlock`:

- `locked` menjadi `false`.
- Canvas aktif lagi.
- Tanda tangan existing tetap tampil.

Label jabatan dan nama terang tetap editable walau tanda tangan locked. Lock hanya mencegah coretan pada canvas.

---

## PDF Design

`pdfGenerator.js` render tanda tangan dari `signatures[]` hasil normalisasi.

Rules:

- Jumlah kolom PDF = jumlah kolom aktif di UI.
- Label atas PDF = `roleLabel`.
- Gambar tanda tangan PDF = `image`.
- Nama bawah PDF = `name`.
- Kolom aktif tanpa tanda tangan/nama tetap tampil kosong, karena user memilih “tampil kalau kolom aktif di UI”.
- Jika image corrupt, PDF skip image tapi tetap render label, garis, dan nama. Pattern try/catch existing sudah ada di `app/src/utils/pdfGenerator.js:361-366`.

Layout PDF:

- Hitung `sigColWidth = (pageWidth - margin * 2) / activeSignatureCount`.
- X tiap kolom dihitung dinamis.
- Jika 4 kolom, signature image sedikit lebih kecil agar muat landscape A4.
- Signature section tetap pindah page jika ruang tidak cukup, mengikuti guard existing di `app/src/utils/pdfGenerator.js:315-319`.

---

## Data Flow

1. `OpnamePage` mengambil `room` aktif dari `useOpname()`.
2. `SignatureSection` menerima `room.signatures`.
3. Helper normalisasi menghasilkan array valid 2–4 item.
4. User update label/name/image/locked.
5. Action reducer menyimpan update ke `room.signatures` sebagai array immutable.
6. Save/load/sync menyimpan state room seperti biasa.
7. `saveRoomPDF(room)` menerima room terbaru.
8. `generateRoomPDF(room)` normalisasi signatures dan render PDF sesuai jumlah aktif.

---

## Error Handling

- `signatures` kosong/rusak → fallback default 3.
- Signature item tanpa `id` → buat id stabil dari index.
- `roleLabel` kosong → fallback label default sesuai index.
- `name` kosong → PDF tampil placeholder garis/nama kosong sesuai style existing.
- `image` invalid → PDF skip image, tidak menggagalkan export.
- Canvas resize harus redraw image existing agar tanda tangan tidak hilang saat component mount.

---

## File Impact

| File | Change |
|---|---|
| `app/src/components/SignatureSection.jsx` | Render dynamic signature cards, add/less controls, pass item updates |
| `app/src/components/SignaturePad.jsx` | Add `locked`, `onLockChange`, larger canvas, disable drawing/clear while locked, button text `Lock`/`Unlock` |
| `app/src/store/useOpnameState.jsx` | Add reducer/action for replacing signature array or updating item fields; initialize new rooms with array format |
| `app/src/pages/OpnamePage.jsx` | Replace old `handleSaveSig`/`handleSaveName` usage with array item update handlers |
| `app/src/utils/pdfGenerator.js` | Render dynamic signature columns from normalized array |
| `app/src/styles/components.css` or related style file | Add focused signature grid/card/canvas styles using existing Warm Atelier tokens |
| `app/src/__tests__/...` | Add focused tests for signature helper/reducer/component/PDF behavior |

Optional helper file if implementation needs it:

| File | Change |
|---|---|
| `app/src/utils/signatures.js` | Constants + normalize/add/remove/update helpers shared by UI and PDF |

Keep helper small. Do not add abstraction beyond needed constants and pure functions.

---

## Testing Strategy

### Unit Tests

- Normalizes old object format to 3 array items.
- Falls back to default 3 if signatures invalid.
- Adds `PIC RUANGAN 2` until max 4.
- Removes only last column until min 2.
- Updates `roleLabel`, `name`, `image`, and `locked` immutably.

### Component Tests

- Default render shows 3 columns.
- `+ Tambah PIC` adds 4th column and then disables.
- `− Kurangi` removes down to 2 and then disables.
- Label input updates role label.
- Nama input updates name.
- Clicking `Lock` disables canvas drawing/clear and shows `Unlock`.
- Clicking `Unlock` re-enables drawing.

### PDF Tests

- PDF signature rendering uses active signature count.
- Label and name from array are passed to PDF text rendering.
- Empty active column still renders line/slot.
- Invalid image does not throw.

### Smoke

Dari `app/`:

```bash
rtk npm run test -- Signature
```

Jika filter tidak cocok, jalankan test suite terdekat yang tersedia.

Manual smoke:

1. Buka `/app1/opname`.
2. Pastikan default 3 kolom.
3. Tambah menjadi 4 kolom.
4. Ubah label kolom 4.
5. Tanda tangan, klik `Lock`, coba coret lagi; canvas tidak berubah.
6. Klik `Unlock`, coret lagi; canvas berubah.
7. Kurangi sampai 2 kolom.
8. Export PDF current room.
9. Pastikan PDF mengikuti jumlah kolom aktif, label, tanda tangan, dan nama.

---

## Acceptance Criteria

- `/app1/opname` menampilkan signature section default 3 kolom.
- User bisa tambah 1 kolom menjadi 4, default label `PIC RUANGAN 2`.
- User bisa kurangi 1 kolom sampai minimal 2.
- Label jabatan di atas canvas editable per ruangan.
- Nama terang editable per ruangan.
- Canvas signature lebih besar dan nyaman untuk tablet.
- Tombol memakai teks `Lock` dan `Unlock`.
- Saat locked, tanda tangan tidak bisa tercoret dan clear tidak aktif.
- Saat unlocked, tanda tangan bisa diedit lagi.
- PDF mengikuti jumlah kolom aktif, label jabatan, image tanda tangan, dan nama terang.
- Save/load/sync tetap membawa signature data baru karena berada di state room.
- Data lama masih terbaca lewat migrasi object-to-array.

---

## Open Decisions

Tidak ada. User sudah menyetujui:

- Pendekatan A: array `signatures[]` per ruangan.
- Kolom ke-4 default: `PIC RUANGAN 2`.
- Lock manual lewat tombol.
- PDF menampilkan kolom aktif di UI meskipun belum ditandatangani.
- Label jabatan editable per ruangan.
- Palette harus mengikuti app existing.
- Canvas harus diperbesar.
- Copy tombol: `Lock` / `Unlock`.
