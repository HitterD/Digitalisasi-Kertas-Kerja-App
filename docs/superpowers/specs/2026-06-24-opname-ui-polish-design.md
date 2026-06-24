# Opname (APP1) UI Polish + Dark Mode + Responsive — Design Spec

**Tanggal:** 2026-06-24
**Scope:** CSS-mostly refactor halaman Opname. Tanpa perubahan logic, tanpa dependency baru, tanpa perubahan struktur JSX tabel.

---

## Masalah

1. **Tabel "kotak-kotak"** — setiap `td`/`th` punya `border: 1px solid` penuh (full grid) → tampilan boxy, kurang elegan. (`components.css:929,938`)
2. **Header tabel kekecilan** — `th` 11px, kontras pucat (`--charcoal-500`). Susah dibaca saat scan cepat di tablet.
3. **Dark mode rusak** — 13+ warna hardcoded `rgba(201,100,66,...)` (terracotta lama, beda dari `--accent` #D97757) dan `rgba(26,26,26,...)` di hover/checked/room-nav/progress-ring. Tidak adaptif ke dark theme.
4. **Dot grid ruangan kurang optimal** — dot 12px polos, tanpa nomor; saat ruangan banyak susah lihat posisi aktif & progress. Dot aktif tidak auto-scroll ke view.
5. **Tablet & mobile belum dioptimalkan** — `responsive.css` tidak punya rule untuk room-nav, room-meta, actions bar, maupun ukuran font tabel. Hanya ada toggle table↔cards.
6. **Signature pad terlalu sempit** — `.signature-pad__canvas-wrap` & `.signature-pad__canvas` **tidak punya CSS sama sekali** → canvas collapse/pendek. 3 pad sejajar di kolom 1/3 makin sempit. Stroke `#1a365d` hardcoded.

---

## Solusi

### A. Tabel borderless + header diperbesar
File: `components.css` `.wa-table`

- `th`: font **11px → 13px**, hapus border kotak penuh → hanya `border-bottom: 2px solid var(--border-strong)` (underline). Warna `--text-secondary` (kontras naik).
- `td`: hapus vertical border, sisakan `border-bottom: 1px solid var(--border)` (garis horizontal saja). Body font **12px → 13px**.
- Kolom barcode tetap mono + `--accent`.
- Hover row: `var(--accent-soft)`. Checked row: bg `var(--accent-soft)` + inset bar `3px var(--accent)`.

Hasil: garis horizontal tipis, no kotak penuh — sesuai arah yang dipilih user.

### B. Dark mode fix
File: `components.css` + `OpnamePage.jsx`

Ganti semua warna hardcoded ke token yang sudah theme-aware:

| Dari | Ke |
|---|---|
| `rgba(201,100,66,0.04/0.05/0.10/0.12)` | `--accent-soft` / `--accent-ring` |
| `rgba(201,100,66,0.20/0.25/0.30)` (shadow) | `--accent-glow` |
| `rgba(26,26,26,0.06/0.08/0.1)` (border/divider/btn) | `--border` |

Lokasi terdampak (referensi grep, line bisa bergeser):
`components.css:776,780,826,842,933,934,1050,1082,1315,1316,1317,1319`; `tokens.css:289` (`--shadow-glow`).

Inline style di `OpnamePage.jsx`:
- Baris 175: progress ring `stroke="rgba(26,26,26,0.08)"` → `var(--border)`.
- Baris 231: TEROPNAME pill `background: 'rgba(201,100,66,0.10)'` → `var(--accent-soft)`.

### C. Dot grid ruangan bernomor + auto-scroll
File: `components.css` `.wa-room-nav-dot` + `OpnamePage.jsx`

- Dot diberi **nomor ruangan** (font-mono ~9px) di dalam dot.
- State: `done` = isi `--accent` + teks terang; `proses` = outline `--accent`; `kosong` = outline `--border`; `aktif` = diperbesar (~16px) + ring `--accent`.
- Dot aktif **auto-scroll ke view** saat ganti ruangan: tambah `ref` + `scrollIntoView({ inline: 'center', behavior: 'smooth' })` di `OpnamePage` (1 `useEffect` kecil bergantung `roomIdx`).
- Container `.wa-room-nav-dots` tetap horizontal scroll.

Skip (YAGNI): mini-map/grid popover ruangan. Tambah hanya jika >50 ruangan terasa sempit.

### D. Responsive opname (tablet + mobile)
File: `responsive.css` (blok baru) + `OpnamePage.jsx` (1 class di actions bar)

- **Tablet (768–1024px):**
  - `.wa-room-nav` boleh wrap; `.wa-room-nav-dots` pindah jadi baris penuh sendiri.
  - `.wa-room-meta-grid` 4 → 2 kolom.
  - Font tabel tetap besar (kebaca saat scan).
- **Mobile (<768px):**
  - Tabel tetap → cards (sudah ada).
  - `.wa-room-nav` stack: baris-1 prev/next + select; baris-2 progress + dots.
  - `.wa-room-meta-grid` 2 kolom, hapus border-right yang mepet.
  - Actions bar (`OpnamePage:228`) — inline `flex` tanpa wrap → beri class `.opname-actions-bar` yang `flex-wrap: wrap` + gap, supaya tombol Custom/Save/PDF/Sync tidak mepet.

### E. Signature pad diperbesar + responsive + dark-safe
File: `components.css` (rule baru) + `SignaturePad.jsx`

- Tambah CSS:
  - `.signature-pad__canvas-wrap { height: 160px; }` (desktop). Wrap sudah punya border/radius via inline — pindahkan ke kelas opsional, atau cukup set height.
  - `.signature-pad__canvas { width: 100%; height: 100%; touch-action: none; display: block; }` — penuhi wrap + cegah scroll halaman saat menggambar di tablet.
- **Canvas bg selalu putih `#FFFFFF`**, stroke tetap biru `#1a365d` → konsisten di light/dark dan saat di-export ke PDF. (Lebih aman daripada stroke theme-aware yang bisa hilang di scan.)
- Responsive (`responsive.css`):
  - Tablet (768–1024): `.signature-section--three` 3 → 2 kolom.
  - Mobile (<768): 1 kolom (pad full-width, paling lega untuk TTD jari).
- Canvas re-init dari `initialData` sudah ada di `useEffect` → aman saat resize/breakpoint (gambar tersimpan tiap `stopDrawing`).

---

## Yang TIDAK diubah (YAGNI)

- Struktur JSX tabel, pagination, autofill, search logic — tetap.
- Mobile asset cards (`AssetCard`) — sudah jalan.
- `EditableAssetTable` (No Barcode / Not at Location) — ikut kena perbaikan `.wa-table` global secara gratis, tidak diedit manual.
- Token system — pakai yang ada, tidak bikin token baru.
- Tidak ada refactor di luar scope opname.

---

## File terdampak

| Bagian | File |
|---|---|
| A. Tabel borderless + header besar | `app/src/styles/components.css` |
| B. Dark mode fix | `app/src/styles/components.css`, `app/src/pages/OpnamePage.jsx` |
| C. Dot grid bernomor + auto-scroll | `app/src/styles/components.css`, `app/src/pages/OpnamePage.jsx` |
| D. Responsive opname | `app/src/styles/responsive.css`, `app/src/pages/OpnamePage.jsx` |
| E. Signature pad besar | `app/src/styles/components.css`, `app/src/components/SignaturePad.jsx`, `app/src/styles/responsive.css` |

**Total: 4 file.** CSS-dominant. Tanpa logic change, tanpa dependency baru.

---

## Verifikasi

- **Dark/light toggle:** hover row, checked row, TEROPNAME pill, progress ring, dot grid, signature wrap — semua adapt, kontras teks AA.
- **Resize 375 / 768 / 1024 / 1280:** room-nav, meta-grid, actions bar, tabel, signature grid — kebaca, tidak overflow, tidak mepet.
- **Ruangan banyak (30+):** dot aktif auto-scroll ke tengah view; nomor & status terbaca.
- **Signature di tablet:** canvas tinggi cukup, menggambar tidak men-scroll halaman; clear & re-load gambar berfungsi.
- **Tabel:** header 13px terbaca, no kotak penuh, hanya garis horizontal.
