# App2 (Extract MAT) — Redesign Komponen UI

**Tanggal:** 2026-06-24
**Scope:** Redesign komponen `ExtractOpnamePage` (route `/app2`). Struktur halaman tetap, tampilan komponen diperbarui. Desktop + dark mode wajib.
**Target file:** `app/src/pages/ExtractOpnamePage.jsx`, `app/src/extract-opname.css`
**Arah desain:** Progress-first (Direction A). Pola komponen baru boleh, token warna dari `tokens.css` tetap dipakai.

---

## 1. Konteks & Masalah

`ExtractOpnamePage` saat ini:
- **Inline-style berat** — hampir semua styling inline di JSX, tidak konsisten.
- **Dead CSS** — `extract-opname.css` (469 baris, class `.extract-*`) sebagian besar tidak dipakai; JSX pakai inline + class `wa-*`.
- **Summary bar flat** — 4 angka berjajar tanpa konteks visual / progress.
- **Daftar ruangan** — baris seragam, hierarki lemah, sulit memindai mana ruangan selesai vs bermasalah.
- **Loading/empty state seadanya**, kontras badge rendah.

**Tidak berubah:** alur (header → filter → ringkasan → daftar ruangan → export bar), logika data (`handleSync`, `useMemo`, export), `PreviewModal`, `SearchableGroupedSelect`.

---

## 2. Prinsip Desain

- Pakai token dari `tokens.css` (warna, spacing, radius, font). Tidak hardcode hex untuk warna semantik.
- Dark mode lewat token — light/dark sudah otomatis kalau pakai `var(--*)`.
- Komponen baru ditulis sebagai class CSS di `extract-opname.css` (bukan inline). Inline-style berulang dipindah ke class.
- Shade dark mode: gunakan success/danger shade lebih terang (400) untuk kontras AA pada teks/angka.

---

## 3. Komponen

### 3.1 Ringkasan — Progress Hero (`.x-summary`)

Ganti summary bar 4-kolom flat dengan kartu progress hero:

- **Baris atas:** kiri = eyebrow "PROGRES OPNAME" (mono) + subjudul "{N} ruangan · periode {kode}"; kanan = persen besar (~26px, 700) + "{terscan} / {total} ASET" (mono kecil).
- **Progress bar split** (tinggi 10px, radius 6px): segmen hijau (`--success-600`, dark `--success-400`) = % terscan, segmen merah (`--danger-600`, dark `--danger-400`) = % tidak terscan.
- **4 angka** di bawah bar (dipisah border-top): TERSCAN (hijau), TIDAK TERSCAN (merah), SALAH RUANGAN (merah), RUANGAN (text-primary). Tiap angka ~17px/700 + label mono 8px.
- **Persen** = `filteredTotalScanned / (filteredTotalScanned + filteredTotalNotScanned) * 100`, format `id-ID` (koma). Saat belum sync / total 0 → bar kosong, persen "—", tampilkan teks "Belum ada data".

### 3.2 Kartu Ruangan + Accordion (`.x-room`)

Tiap ruangan jadi kartu (bukan baris polos):

- **Border-kiri 3px status:** hijau (`--success-500`) bila 0 tidak terscan (100%), merah (`--danger-500`) bila ada yang belum terscan.
- **Header kartu (klik = toggle):** chevron (rotate saat expand) · nama ruangan (12px/600) + mini progress bar (lebar ~90px, 4px) + label persen mono · badge pill "TERSCAN {n}" (hijau, kontras tinggi) · badge pill "TIDAK {n}" (merah) **hanya bila n>0** · tombol "Preview" (pill outline).
- **Body (saat expand):** seksi "BELUM TERSCAN ({n})" (label mono merah) list `BARCODE_ASSET — NAMA_ASSET`; seksi "TERSCAN ({n})" (label mono hijau) list barcode, potong di 10 + "…dan {x} lainnya". Spacing & indent dirapikan.
- **Mini progress %** per ruangan = `scanned / (scanned + notScanned) * 100`.
- **Badge pill:** ganti `.wa-status` lama dengan pill radius penuh, kontras tinggi (success-100/700, danger-100/700; dark pakai rgba + shade 400).
- **Empty state daftar:** "Pilih periode & sinkron data untuk melihat ruangan."

### 3.3 Filter Card (`.x-filter`)

- Radius & spacing konsisten dengan hero/kartu ruangan (radius 12px, padding 16px).
- Tinggi field seragam 40px (periode select, departemen select, master-file row).
- Master Data block tetap: ikon + nama file + status "✓ MASTER DATA DIMUAT", tombol "Pilih File" (ghost) + "Sinkron Data Opname" (terracotta).

### 3.4 Sticky Export Bar

- Tetap fixed-bottom, glass blur, fungsi & isi sama (jumlah file + tombol "Export Semua Excel" charcoal).
- Hanya selaraskan radius/spacing/token; tidak ubah perilaku.

### 3.5 States

- **Loading:** spinner (border terracotta) + "Mengambil data dari database…" — terpusat, rapi.
- **Empty:** ikon redup + "Belum ada data" + hint.
- **Error:** pakai `.wa-alert--danger` yang sudah ada (tidak berubah).

---

## 4. Cleanup

- Pindahkan inline-style berulang JSX → class di `extract-opname.css` (prefix `.x-*`).
- Hapus class dead `.extract-*` yang tak dipakai (~400 baris). **Verifikasi tiap class via Grep sebelum hapus** — pastikan tak dipakai komponen lain.
- Tidak menambah dependency baru.

---

## 5. Non-Goals (YAGNI)

- Tidak mengubah alur halaman / urutan section.
- Tidak menyentuh logika fetch/export/parse.
- Tidak redesign `PreviewModal` (komponen terpisah).
- Tidak tambah animasi berat / library chart.
- Responsif tablet/mobile **bukan** fokus (target desktop) — cukup tidak rusak di layar sempit.

---

## 6. Acceptance Criteria

- [ ] Summary jadi progress hero (bar split + 4 angka), persen benar, empty state tampil saat belum sync.
- [ ] Tiap ruangan jadi kartu dengan border-kiri status + mini progress + badge pill; badge "TIDAK" hilang saat 0.
- [ ] Accordion expand/collapse tetap berfungsi, body dirapikan.
- [ ] Filter card & export bar konsisten radius/spacing/token.
- [ ] Loading & empty state didesain rapi.
- [ ] Light & dark mode keduanya benar via token; kontras teks angka AA.
- [ ] Inline-style berulang dipindah ke CSS; dead `.extract-*` dihapus (terverifikasi Grep).
- [ ] Tidak ada regresi fungsi: sync, preview per ruangan, export semua/single tetap jalan.
