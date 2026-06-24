# App3 (Master Data) — Redesign UI Guided Upload

**Tanggal:** 2026-06-24  
**Scope:** Redesign route `/app3` sebagai halaman unified untuk `Consolidation` dan `Evaluation`. Redesign penuh untuk tab Consolidation. Tab Evaluation hanya diselaraskan ringan agar visual tidak berbeda dari App1/App2.  
**Target file:** `app/src/pages/UnifiedMasterDataPage.jsx`, `app/src/pages/App3ConsolidationPage.jsx`, `app/src/pages/App4RecouncilPage.jsx`, CSS terkait di `app/src/styles/pages.css` atau file style existing yang paling sesuai.  
**Arah desain:** Guided Upload — anti-salah upload, warm compact, token-based, selaras App1/App2.

---

## 1. Konteks & Masalah

Route `/app3` saat ini memakai `UnifiedMasterDataPage`, bukan langsung `App3ConsolidationPage`. Halaman ini menggabungkan dua tab:

- **Consolidation** — `App3ConsolidationPage`
- **Evaluation** — `App4RecouncilPage`

Masalah utama yang perlu diperbaiki:

- **Topbar tidak selaras dengan App1/App2** — back button berbentuk kotak filled/outlined, hover inline manual, spacing berbeda.
- **Inline-style berat** — `UnifiedMasterDataPage`, `App3ConsolidationPage`, dan sebagian `App4RecouncilPage` memakai banyak inline style sehingga dark mode dan konsistensi sulit dijaga.
- **Copy terlalu teknis** — istilah seperti “Pipeline Ingestion”, “Data Pipeline Intelligence”, “Regex Barcode Parsing” membuat operator non-teknis lebih mudah salah paham.
- **Upload flow belum cukup anti-salah** — file wajib/opsional belum cukup eksplisit; user perlu tahu minimal source apa yang dibutuhkan sebelum tombol lanjut aktif.
- **Filter kategori kurang kuat secara visual** — kategori sekarang tampil seperti kartu sederhana, tapi hierarchy dan status selected/count masih bisa dibuat lebih mudah dipindai.
- **Feedback proses perlu lebih jelas** — loading/success/error harus memberi konteks penyebab dan tindakan berikutnya.

**Tidak berubah:** API endpoint, algoritma konsolidasi, format output Excel, logika pilihan kategori, logic validasi minimal source, dan penggabungan tab Consolidation/Evaluation dalam satu route.

---

## 2. Prinsip Desain

- Pakai token dari `tokens.css`: `--bg-*`, `--text-*`, `--border`, `--accent`, `--success-*`, `--danger-*`.
- Tidak tambah dependency baru.
- Prioritas anti-salah upload: aturan wajib/opsional harus terlihat sebelum user klik proses.
- Bahasa campuran teknis ringan: “Upload”, “Filter”, “Generate Excel”; helper text tetap Bahasa Indonesia.
- Satu primary action per tahap.
- Dark mode otomatis lewat token, bukan raw hex.
- Back button App3 wajib mengikuti pola App1/App2: transparent icon button, padding kecil, divider tipis, bukan kotak filled.
- Evaluation tab hanya diselaraskan ringan dalam scope ini; redesign penuh Evaluation ditunda agar perubahan tetap fokus.

---

## 3. Struktur Halaman

### 3.1 Unified Topbar

`UnifiedMasterDataPage` menjadi shell topbar + tab yang konsisten dengan App1/App2.

Komposisi topbar:

- Kiri:
  - Back button transparent, icon `ArrowLeft`, ukuran ±18px, padding kecil, warna `--text-secondary`.
  - Divider vertikal 1px × 18px, warna `--border`.
  - Module identity: icon 26px di surface `--bg-input`, icon warna `--accent`, title “Master Data”.
- Tengah/kanan:
  - Tab pill: `Consolidation` dan `Evaluation`.
  - Active tab: background `--text-primary`, text `--bg-primary`.
  - Inactive tab: background transparent, text `--text-secondary`.
  - `ThemeToggle` di kanan agar sama dengan App1/App2.

Back button tidak memakai hover style inline manual. Hover/focus pakai class CSS.

### 3.2 Layout Tab

- Route `/app3` tetap satu halaman unified.
- Tab `Consolidation` menampilkan `App3ConsolidationPage`.
- Tab `Evaluation` menampilkan `App4RecouncilPage`.
- Tab container tidak boleh memakai absolute full overlay jika membuat scroll/focus sulit. Jika tetap memakai absolute, wajib ada alasan teknis dan tidak mengganggu keyboard/scroll.
- Konten tab memakai max-width konsisten ±1400px dan padding desktop 24–32px.

---

## 4. Consolidation — Guided Upload

### 4.1 Hero Ringkas

Hero lama diganti menjadi header ringkas yang menjelaskan tugas utama:

- Eyebrow: `APP3 · GUIDED UPLOAD`
- Title: “Upload benar dulu, baru generate Excel.”
- Helper: jelaskan bahwa user perlu upload minimal satu source dari EXA/ADD/INV, lalu pilih filter kategori, lalu generate Excel.
- Status mini di kanan atau bawah:
  - Step aktif
  - Jumlah source valid
  - Master lama opsional

Hero tidak boleh terlalu besar agar halaman tetap compact.

### 4.2 Stepper

Stepper tetap 3 langkah, tapi visualnya dibuat lebih informatif:

1. **Upload** — upload file source.
2. **Filter** — pilih kategori target.
3. **Generate Excel** — proses dan unduh hasil.

State step:

- Active: accent/charcoal jelas.
- Done: success token.
- Inactive: muted, tapi tetap terbaca.

Stepper harus pakai CSS class, bukan inline style berulang.

### 4.3 Upload Slot

Upload slot menjadi fokus utama redesign.

Slot file:

- `Master Lama` — opsional.
- `EXA` — source.
- `ADD` — source.
- `INV` — source.

Aturan lanjut:

- Minimal satu source valid dari EXA/ADD/INV.
- Master Lama tidak wajib.
- Tombol `EKSTRAK FILTER` disabled sampai minimal satu source valid.

Visual slot:

- Badge status di kanan atas:
  - `OPSIONAL`
  - `SOURCE`
  - `VALID`
- Icon konsisten dari Lucide; tidak pakai emoji sebagai icon struktural.
- Filename tampil jelas, boleh wrap/word-break, warna success saat valid.
- Empty state slot menjelaskan “Pilih / drop file”.
- Drag active state harus terlihat via border/accent-soft.
- Validasi ekstensi `.xlsx` / `.xls` tetap dipertahankan.

### 4.4 Readiness Strip

Di bawah upload grid tampil strip status kecil:

- `N SOURCE VALID`
- `.XLSX / .XLS SAJA`
- `MASTER OPSIONAL`

Tujuan: user tahu kenapa tombol aktif/nonaktif.

---

## 5. Consolidation — Filter & Generate

### 5.1 Filter Kategori

Setelah ekstrak filter berhasil, kategori tampil sebagai kartu count, bukan pilihan kecil yang mudah terlewat.

Kategori tetap:

- ICT
- ENG
- BAT
- HRGA
- Kosong

Setiap kartu:

- Nama kategori.
- Count record.
- Helper kecil: selected / klik untuk tambah / data tanpa prefix.
- Selected state: background `--text-primary`, text `--bg-primary`, count badge `--accent`.
- Unselected state: surface putih/token, border `--border`.

### 5.2 Live Summary

Di area filter tampil summary:

- `TOTAL BAT: n`
- `SELECTED: n`
- `EFFECTIVE RECORDS: n`

Summary harus memakai tabular/mono figure agar angka stabil saat berubah.

### 5.3 Generate Action

- Tombol utama: `GENERATE EXCEL`.
- Disabled jika tidak ada kategori dipilih.
- Button loading saat `processing`.
- Tombol back: `KEMBALI` / `GANTI FILTER`, secondary/ghost.

### 5.4 Processing, Success, Error

State feedback:

- **Processing:** progress/loader ringan, teks “Menyusun data master…”; jangan menampilkan istilah teknis seperti regex kecuali perlu debugging.
- **Success:** “Konsolidasi selesai. File otomatis terunduh.”
- **Error:** jelaskan penyebab dan recovery path, misalnya file salah format, source kosong, atau server gagal.

Error/success tetap dekat dengan konteks proses, bukan hanya toast global.

---

## 6. Evaluation Tab — Light Alignment Only

`App4RecouncilPage` tidak diredesign penuh dalam scope ini.

Yang boleh diselaraskan:

- Token warna, spacing, radius, dan heading agar tidak kontras dengan Consolidation.
- Copy terlalu teknis dikurangi bila berada di hero/visible first screen.
- Upload slot memakai gaya visual yang sama bila mudah dipakai ulang.
- Alert success/error disamakan dengan App3.

Yang tidak diubah:

- Flow Recouncil.
- Required files: Hasil Opname + Master Data wajib, ASPxGridView opsional.
- API `/api/app4/process`.
- Output `.xlsx` / `.zip`.

---

## 7. CSS & Cleanup

- Pindahkan inline-style berulang ke class CSS.
- Gunakan prefix class yang jelas, misalnya `.app3-*` untuk page-specific styles dan `.umd-*` untuk unified master data shell bila perlu.
- Hindari class baru berlebihan; reuse class `wa-*` yang sudah cocok.
- Jangan tambah library styling.
- Jangan hapus CSS lama tanpa verifikasi `Grep`.
- Raw hex baru tidak dipakai untuk warna semantik; gunakan token.

---

## 8. Accessibility & Interaction

Acceptance UX minimum:

- Semua button punya hit area minimal ±44px atau padding cukup.
- Focus state terlihat.
- Drag/drop tetap punya alternatif click upload.
- Disabled state jelas dan memakai atribut `disabled`.
- Status tidak hanya warna: badge text seperti `SOURCE`, `VALID`, `OPSIONAL` wajib ada.
- Loading state tidak menghilangkan konteks.
- Dark mode kontras tetap terbaca.
- Reduced motion dihormati bila animasi/transisi ditambah.

---

## 9. Non-Goals

- Tidak ubah backend/API.
- Tidak ubah algoritma parsing/konsolidasi.
- Tidak tambah dependency.
- Tidak buat route wizard baru.
- Tidak redesign penuh Evaluation/App4.
- Tidak tambah chart/library progress berat.
- Tidak overhaul semua `wa-*` global styles.

---

## 10. Acceptance Criteria

- [ ] Topbar App3 selaras dengan App1/App2, termasuk back button transparent + divider + module icon + theme toggle.
- [ ] Tab `Consolidation`/`Evaluation` tampil sebagai pill/tab yang jelas dan responsif.
- [ ] Consolidation memakai guided upload dengan aturan minimal satu source EXA/ADD/INV terlihat jelas.
- [ ] Upload slot menampilkan status `OPSIONAL` / `SOURCE` / `VALID` dan filename valid.
- [ ] Tombol `EKSTRAK FILTER` disabled sampai minimal satu source valid.
- [ ] Filter kategori tampil sebagai kartu count dengan selected state kuat.
- [ ] Live summary menampilkan Total BAT, Selected, dan Effective Records.
- [ ] Generate action punya loading, success, dan error state jelas.
- [ ] Evaluation tab minimal selaras token/spacing/topbar, tanpa redesign flow penuh.
- [ ] Light dan dark mode memakai token, tidak raw hex baru untuk warna semantik.
- [ ] Tidak ada regresi fungsi: get bats, process consolidation, process recouncil, download file tetap jalan.
