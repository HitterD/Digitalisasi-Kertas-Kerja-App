# Barcode Checker — Redesign UI (warm + readable)

**Tanggal:** 2026-06-24
**Scope:** Redesign tampilan `BarcodeSearchModal` agar selaras identitas app (warm/oranye, bukan biru) dan hasil lebih mudah dibaca. Logika & struktur modal tetap.
**Target file:** `app/src/components/BarcodeSearchModal.jsx`, `app/src/components/BarcodeSearchModal.css`
**Disetujui (brainstorming):** arah kartu "kanan" (warm + hierarki jelas), cakupan seluruh modal, ikon lucide tanpa emoji.

---

## 1. Masalah

`BarcodeSearchModal` sekarang:
- **Warna lepas dari identitas app** — pakai `--primary-*` (biru) + `--neutral-*` (abu sejuk) + banyak hex mentah (`#0f172a`, `#3b82f6`, dll). App memakai palet warm: accent oranye `#D97757` di atas cream/charcoal (`tokens.css`). Modal terasa "biru" dan beda sendiri.
- **Hasil sulit dibaca** — bento grid 4 kartu padat; semua field setara, tidak ada hierarki; fakta penting (kondisi, lokasi, PIC) tidak menonjol.

**Tidak berubah:** logika data (`handleSearch`, `lookupBarcode`, `lookupBarcodeHistory`, copy, recent searches), `MatHistoryModal`, struktur modal (overlay → header → body), animasi.

---

## 2. Prinsip

- Pakai token dari `tokens.css`. **Tidak hardcode hex** untuk warna semantik. Hapus fallback hex biru/abu dari CSS.
- Warna brand → `--accent`, `--accent-hover`, `--accent-soft`. Permukaan → `--bg-surface`/`--bg-primary`/`--bg-input`. Teks → `--text-primary`/`--text-secondary`/`--text-tertiary`. Garis → `--border`/`--border-strong`.
- Warna semantik tetap by makna: **hijau** = opname / kondisi baik, **merah** = rusak/hilang, **kuning** = warning DB.
- Dark mode otomatis (token sudah punya light/dark).
- Ikon: semua lucide-react (sudah di-import). **Tanpa emoji.**
- Inline-style berulang dipindah ke class CSS.

---

## 3. Komponen

### 3.1 Search bar + tombol Cari
- Input: border `--border`, fokus `border-color: var(--accent)` + ring `--accent-ring`. Ikon search `--accent`.
- Tombol "Cari": background `--accent`, hover `--accent-hover` (buang biru). Disabled `--bg-input` + `--text-muted`.

### 3.2 Recent searches
- Chip: `--bg-input`, border `--border`, teks `--text-primary`, ikon `History` `--text-tertiary`. (sudah inline → pindah ke class `.bcs-recent-chip`).

### 3.3 Kartu hasil (ganti hero + bento grid)
Struktur baru, satu kontainer `.bcs-result-card`:
1. **Header:** eyebrow barcode (mono, ikon `Hash`, tap-to-copy + badge "TERSALIN") → nama aset (`--text-primary`, ~22px/800) → badge kondisi di kanan.
2. **Strip fakta kunci:** background `--bg-primary`, 2 kolom — **Lokasi** & **PIC** (paling sering dicari).
3. **Baris detail:** Nomor PO, Tipe Aset, Periode Perolehan, Keterangan Dasar. Tiap baris: label kiri (`--text-tertiary` + dot `--accent`) ↔ value kanan (`--text-primary`). Pemisah `--border` tipis. Buang grid 4-kartu.

Badge kondisi (token, bukan hex):
- baik → `--success-*`, rusak/hilang → `--danger-*`, lainnya → `--warning-*`. Dark mode pakai shade 400 untuk kontras teks.

### 3.4 Tombol "Lacak Riwayat MAT"
- Background `--accent`, hover `--accent-hover` (sekarang `--neutral-900`). Ikon `ArrowLeftRight`.

### 3.5 Timeline riwayat
- Garis & dot: perpindahan = `--accent`, opname = `--success-500`.
- Icon box: perpindahan `--accent-soft`/`--accent`, opname `--success` tint.
- Kartu item: `--bg-primary`/`--border`; varian opname `--success` tint. Lokasi pakai `MapPin`, tanggal `Clock`.

### 3.6 State
- **Not-found:** kartu warm dashed `--border-strong`, ikon `Package` `--text-tertiary`.
- **Warning DB belum dimuat:** `--warning-*` + ikon `Info`.
- **Empty history:** dashed `--border`, teks `--text-tertiary`.

---

## 4. Verifikasi
- Manual: buka modal light & dark, cari barcode ada / tidak ada / DB belum dimuat. Cek tak ada biru/abu tersisa, kontras teks badge AA, copy & recent jalan.
- `rtk lint` bersih untuk dua file yang diubah.

## 5. Di luar scope
- Perubahan logika lookup/parser. Perubahan `MatHistoryModal`. Fitur baru (filter, export, dsb).
