# Opname UI Polish + Dark Mode + Responsive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bikin halaman Opname (APP1) lebih elegan — tabel borderless dengan header lebih besar, dark mode yang benar-benar adaptif, dot grid ruangan yang optimal, responsive tablet/mobile, dan signature pad yang lebih lega.

**Architecture:** CSS-dominant. Ganti warna hardcoded → token theme-aware, ubah tabel full-grid → garis horizontal, tambah blok responsive baru, tambah CSS canvas signature. Minimal JSX edit (token swap + 1 auto-scroll effect + 2 class).

**Tech Stack:** React (Vite), CSS custom properties (design tokens), lucide-react.

**Catatan testing:** Ini pekerjaan visual/CSS — tidak ada unit test. Verifikasi = manual: jalankan dev server, toggle dark/light, resize 375/768/1024/1280. Tiap task punya langkah verifikasi visual eksplisit.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `app/src/styles/components.css` | Tabel borderless + header besar, dark-mode token swap, dot grid, signature canvas CSS |
| `app/src/styles/responsive.css` | Blok baru: room-nav/meta/actions/table/signature di tablet & mobile |
| `app/src/pages/OpnamePage.jsx` | 2 inline token swap, dot auto-scroll effect, class actions-bar, nomor di dot |
| `app/src/components/SignaturePad.jsx` | Class canvas, bg putih konsisten |

Tiap task self-contained, di-commit terpisah.

---

## Task 1: Tabel borderless + header diperbesar

**Files:**
- Modify: `app/src/styles/components.css` (blok `.wa-table`, sekitar baris 922–951)

- [ ] **Step 1: Ganti blok `.wa-table`**

Cari blok ini (baris ~922–943):

```css
.wa-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.wa-table thead tr { background: var(--cream-input); }
.wa-table thead th {
  padding: 12px 14px; text-align: left;
  font-family: var(--font-mono); font-size: 11px; font-weight: 700;
  color: var(--charcoal-500);
  letter-spacing: 0.08em; text-transform: uppercase;
  border: 1px solid var(--border);
  white-space: nowrap;
}
.wa-table tbody tr { transition: background 140ms ease; }
.wa-table tbody tr:hover { background: rgba(201, 100, 66, 0.04); }
.wa-table tbody tr.checked { background: rgba(201, 100, 66, 0.05); }
.wa-table tbody tr.checked td:first-child { box-shadow: inset 3px 0 0 0 var(--terracotta-500); }
.wa-table tbody td {
  padding: 9px 12px;
  border: 1px solid var(--border);
  vertical-align: middle;
  color: var(--charcoal-900);
  font-family: var(--font-sora);
}
.wa-table .col-barcode { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--terracotta-500); letter-spacing: 0.02em; }
```

Ganti jadi (borderless: hanya garis horizontal; header 13px, body 13px; hover/checked pakai token):

```css
.wa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.wa-table thead tr { background: transparent; }
.wa-table thead th {
  padding: 12px 14px; text-align: left;
  font-family: var(--font-mono); font-size: 13px; font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.06em; text-transform: uppercase;
  border: none;
  border-bottom: 2px solid var(--border-strong);
  white-space: nowrap;
}
.wa-table tbody tr { transition: background 140ms ease; }
.wa-table tbody tr:hover { background: var(--accent-soft); }
.wa-table tbody tr.checked { background: var(--accent-soft); }
.wa-table tbody tr.checked td:first-child { box-shadow: inset 3px 0 0 0 var(--accent); }
.wa-table tbody td {
  padding: 10px 14px;
  border: none;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
  color: var(--text-primary);
  font-family: var(--font-sora);
}
.wa-table .col-barcode { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--accent); letter-spacing: 0.02em; }
```

- [ ] **Step 2: Verifikasi visual**

Jalankan dev server (`cd app && npm run dev`), buka halaman Opname dengan data.
Expected: tabel tidak ada kotak penuh — hanya garis horizontal tipis tiap baris; header underline 2px, teks 13px terbaca; barcode oranye `--accent`.

- [ ] **Step 3: Commit**

```bash
git add app/src/styles/components.css
git commit -m "style(opname): borderless table with larger headers"
```

---

## Task 2: Dark mode fix — token swap di components.css

**Files:**
- Modify: `app/src/styles/components.css` (baris ~776, 780, 826, 842, 1050, 1082, 1315–1319)
- Modify: `app/src/styles/tokens.css` (baris ~289)

- [ ] **Step 1: `.wa-btn-terracotta` shadows (baris ~776, 780)**

Ganti:
```css
  box-shadow: 0 2px 6px rgba(201, 100, 66, 0.2);
```
jadi:
```css
  box-shadow: 0 2px 6px var(--accent-glow);
```

Ganti:
```css
.wa-btn-terracotta:hover { background: var(--terracotta-600); transform: translateY(-1px); box-shadow: 0 6px 14px rgba(201, 100, 66, 0.30); }
```
jadi:
```css
.wa-btn-terracotta:hover { background: var(--terracotta-600); transform: translateY(-1px); box-shadow: 0 6px 14px var(--accent-glow); }
```

- [ ] **Step 2: `.wa-icon-wrap` hover (baris ~826)**

Ganti:
```css
.wa-card:hover .wa-icon-wrap { background: rgba(201, 100, 66, 0.10); }
```
jadi:
```css
.wa-card:hover .wa-icon-wrap { background: var(--accent-soft); }
```

- [ ] **Step 3: `.wa-input/.wa-select` focus ring (baris ~842)**

Ganti:
```css
  box-shadow: 0 0 0 3px rgba(201, 100, 66, 0.12);
```
jadi:
```css
  box-shadow: 0 0 0 3px var(--accent-ring);
```

- [ ] **Step 4: `.wa-search input:focus` (baris ~1050)**

Ganti:
```css
.wa-search input:focus { border-color: var(--terracotta-500); box-shadow: 0 0 0 3px rgba(201, 100, 66, 0.12); }
```
jadi:
```css
.wa-search input:focus { border-color: var(--terracotta-500); box-shadow: 0 0 0 3px var(--accent-ring); }
```

- [ ] **Step 5: `.wa-role-pill.admin` (baris ~1082)**

Ganti:
```css
.wa-role-pill.admin { background: rgba(201,100,66,0.10); color: var(--terracotta-500); }
```
jadi:
```css
.wa-role-pill.admin { background: var(--accent-soft); color: var(--terracotta-500); }
```

- [ ] **Step 6: `.wa-room-nav` family (baris ~1315–1319)**

Ganti:
```css
.wa-room-nav { display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: var(--cream-surface); border-bottom: 1px solid rgba(26,26,26,0.06); }
.wa-room-nav-btn { width: 32px; height: 32px; background: transparent; border: 1px solid rgba(26,26,26,0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--charcoal-900); cursor: pointer; transition: all 150ms ease; }
.wa-room-nav-btn:hover:not(:disabled) { background: rgba(26,26,26,0.04); }
.wa-room-nav-btn:disabled { cursor: not-allowed; opacity: 0.3; }
.wa-room-nav-divider { width: 1px; height: 24px; background: rgba(26,26,26,0.08); }
```
jadi:
```css
.wa-room-nav { display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: var(--cream-surface); border-bottom: 1px solid var(--border); }
.wa-room-nav-btn { width: 32px; height: 32px; background: transparent; border: 1px solid var(--border-strong); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--charcoal-900); cursor: pointer; transition: all 150ms ease; }
.wa-room-nav-btn:hover:not(:disabled) { background: var(--bg-input); }
.wa-room-nav-btn:disabled { cursor: not-allowed; opacity: 0.3; }
.wa-room-nav-divider { width: 1px; height: 24px; background: var(--border); }
```

- [ ] **Step 7: `--shadow-glow` di tokens.css (baris ~289)**

Ganti:
```css
  --shadow-glow: 0 6px 14px rgba(201, 100, 66, 0.25);
```
jadi:
```css
  --shadow-glow: 0 6px 14px var(--accent-glow);
```

- [ ] **Step 8: Verifikasi tidak ada sisa hardcoded**

Run: `cd app/src && grep -rn "201, *100, *66\|26,26,26\|26, 26, 26" styles/components.css styles/tokens.css`
Expected: tidak ada output (semua sudah token). Jika masih ada di file lain di luar scope opname, biarkan.

- [ ] **Step 9: Verifikasi visual dark mode**

Toggle ke dark mode. Expected: hover row, checked row, focus ring input, room-nav border/divider/btn semua kelihatan & adaptif (tidak ada warna pucat/hilang).

- [ ] **Step 10: Commit**

```bash
git add app/src/styles/components.css app/src/styles/tokens.css
git commit -m "fix(opname): replace hardcoded colors with theme-aware tokens"
```

---

## Task 3: Inline token swap di OpnamePage

**Files:**
- Modify: `app/src/pages/OpnamePage.jsx` (baris ~175, 231)

- [ ] **Step 1: Progress ring stroke (baris ~175)**

Ganti:
```jsx
<circle cx="18" cy="18" r="14" fill="none" stroke="rgba(26,26,26,0.08)" strokeWidth="3" />
```
jadi:
```jsx
<circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3" />
```

- [ ] **Step 2: TEROPNAME pill (baris ~231)**

Ganti:
```jsx
<button className="wa-btn" style={{ background: 'rgba(201,100,66,0.10)', color: 'var(--terracotta-500)', boxShadow: 'none' }}>◉ TEROPNAME</button>
```
jadi:
```jsx
<button className="wa-btn" style={{ background: 'var(--accent-soft)', color: 'var(--terracotta-500)', boxShadow: 'none' }}>◉ TEROPNAME</button>
```

- [ ] **Step 3: Verifikasi visual**

Light & dark: progress ring track & TEROPNAME pill adaptif (tidak gelap pekat di dark).

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/OpnamePage.jsx
git commit -m "fix(opname): tokenize progress ring and teropname pill colors"
```

---

## Task 4: Dot grid ruangan bernomor + auto-scroll

**Files:**
- Modify: `app/src/styles/components.css` (`.wa-room-nav-dots`, `.wa-room-nav-dot` ~1322–1323)
- Modify: `app/src/pages/OpnamePage.jsx` (blok dot grid ~189–202, tambah ref + effect)

- [ ] **Step 1: CSS dot bernomor (baris ~1322–1323)**

Ganti:
```css
.wa-room-nav-dots { display: flex; align-items: center; gap: 4px; overflow-x: auto; flex: 1; min-width: 0; padding-right: 8px; }
.wa-room-nav-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; cursor: pointer; transition: all 150ms ease; }
```
jadi:
```css
.wa-room-nav-dots { display: flex; align-items: center; gap: 5px; overflow-x: auto; flex: 1; min-width: 0; padding: 2px 8px 2px 0; scroll-behavior: smooth; }
.wa-room-nav-dot {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 9px; font-weight: 700;
  transition: all 150ms ease;
}
.wa-room-nav-dot.active { width: 26px; height: 26px; box-shadow: 0 0 0 2px var(--accent); }
```

- [ ] **Step 2: Tambah ref import & state di OpnamePage (atas komponen)**

Di baris 1, pastikan `useRef` ada di import:
```jsx
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
```

Setelah deklarasi `const room = state.rooms[roomIdx];` (baris ~34), tambah:
```jsx
    const dotsRef = useRef(null);
    useEffect(() => {
        const el = dotsRef.current?.querySelector('[data-active="true"]');
        if (el) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, [roomIdx]);
```

- [ ] **Step 3: Ubah blok dot grid JSX (baris ~189–202)**

Ganti:
```jsx
              <div className="wa-room-nav-dots">
                {state.rooms.map((r, i) => {
                  const op = overallProgress[i];
                  const isActive = i === roomIdx;
                  const isDone = op && op.checked === op.total;
                  const isProcess = op && op.checked > 0 && op.checked < op.total;
                  return (
                    <div key={i} title={`Ruang ${i + 1}`} className="wa-room-nav-dot" style={{
                      background: isActive ? 'var(--cream-surface)' : (isDone ? 'var(--charcoal-900)' : (isProcess ? 'var(--terracotta-500)' : 'var(--cream-surface)')),
                      border: isActive ? '2px solid var(--terracotta-500)' : '1.5px solid var(--charcoal-300)',
                    }} onClick={() => setRoomIndex(i)} />
                  );
                })}
              </div>
```
jadi:
```jsx
              <div className="wa-room-nav-dots" ref={dotsRef}>
                {state.rooms.map((r, i) => {
                  const op = overallProgress[i];
                  const isActive = i === roomIdx;
                  const isDone = op && op.total > 0 && op.checked === op.total;
                  const isProcess = op && op.checked > 0 && op.checked < op.total;
                  const bg = isDone ? 'var(--accent)' : 'var(--cream-surface)';
                  const fg = isDone ? 'var(--cream-surface)' : (isProcess ? 'var(--accent)' : 'var(--text-tertiary)');
                  const bdr = isProcess ? '1.5px solid var(--accent)' : '1.5px solid var(--border-strong)';
                  return (
                    <div
                      key={i}
                      title={`${i + 1}. ${r.meta.roomName || r.sheetName}`}
                      data-active={isActive ? 'true' : 'false'}
                      className={`wa-room-nav-dot${isActive ? ' active' : ''}`}
                      style={{ background: bg, color: fg, border: isActive ? 'none' : bdr }}
                      onClick={() => setRoomIndex(i)}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
```

- [ ] **Step 4: Verifikasi visual**

Buka data dengan banyak ruangan (atau buat custom room beberapa kali). Expected: dot menampilkan nomor; done = isi oranye; proses = outline oranye; aktif = lebih besar + ring oranye. Ganti ruangan via select → dot aktif auto-scroll ke tengah baris dot. Cek di dark mode juga.

- [ ] **Step 5: Commit**

```bash
git add app/src/styles/components.css app/src/pages/OpnamePage.jsx
git commit -m "feat(opname): numbered room dots with active auto-scroll"
```

---

## Task 5: Signature pad — CSS canvas + bg konsisten

**Files:**
- Modify: `app/src/components/SignaturePad.jsx` (baris ~109–129)
- Modify: `app/src/styles/components.css` (tambah rule baru di akhir blok signature)

- [ ] **Step 1: Tambah CSS canvas di components.css**

Setelah blok `.wa-signature-pad` (cari baris ~1272–1281), tambahkan rule baru:
```css
.signature-pad__label {
  font-family: var(--font-mono); font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--text-secondary); margin-bottom: 8px;
}
.signature-pad__canvas-wrap { height: 160px; }
.signature-pad__canvas {
  width: 100%; height: 100%;
  display: block;
  touch-action: none;
}
```

- [ ] **Step 2: Canvas bg putih konsisten di SignaturePad.jsx**

Di `useEffect` init (baris ~11–29), setelah `canvas.height = rect.height;` dan SEBELUM `ctx.lineWidth = 2;`, tambah fill putih supaya canvas tidak transparan (konsisten light/dark + PDF):
```jsx
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
```

- [ ] **Step 3: Update clearSignature agar repaint putih (baris ~92–98)**

Ganti:
```jsx
    const clearSignature = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        onSave(null);
    }, [onSave]);
```
jadi:
```jsx
    const clearSignature = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        onSave(null);
    }, [onSave]);
```

- [ ] **Step 4: Hapus inline backgroundColor wrap yang bentrok (baris ~109–115)**

Ganti:
```jsx
            <div className="signature-pad__canvas-wrap" style={{
                position: 'relative',
                border: '1px solid var(--neutral-200)',
                backgroundColor: 'var(--neutral-50)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden'
            }}>
```
jadi:
```jsx
            <div className="signature-pad__canvas-wrap" style={{
                position: 'relative',
                border: '1px solid var(--border)',
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden'
            }}>
```

- [ ] **Step 5: Verifikasi visual**

Buka section Tanda Tangan. Expected: tiap pad canvas tinggi ~160px (jelas lebih lega dari sebelumnya yang collapse). Gambar TTD di desktop (mouse) & tablet (touch) — stroke biru di atas bg putih, halaman tidak ikut scroll saat menggambar. Klik Bersihkan → canvas kembali putih bersih. Cek di dark mode: pad tetap putih, border kelihatan.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/SignaturePad.jsx app/src/styles/components.css
git commit -m "feat(opname): larger signature canvas with consistent white bg"
```

---

## Task 6: Responsive opname — tablet & mobile

**Files:**
- Modify: `app/src/pages/OpnamePage.jsx` (actions bar ~228)
- Modify: `app/src/styles/responsive.css` (tambah blok baru setelah baris ~274)

- [ ] **Step 1: Beri class actions bar di OpnamePage (baris ~228)**

Ganti:
```jsx
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
```
jadi:
```jsx
            <div className="opname-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
```

- [ ] **Step 2: Tambah blok responsive di akhir responsive.css**

Setelah baris ~274 (akhir blok opname cards), tambahkan:
```css
/* ===== Opname tablet ===== */
@media (min-width: 768px) and (max-width: 1024px) {
  .wa-room-nav { flex-wrap: wrap; }
  .wa-room-nav-dots { order: 3; flex-basis: 100%; }
  .wa-room-meta-grid { grid-template-columns: repeat(2, 1fr); row-gap: 14px; }
  .wa-room-meta-col { border-right: none; padding: 0 14px; }
  .signature-section--three { grid-template-columns: repeat(2, 1fr) !important; }
}

/* ===== Opname mobile ===== */
@media (max-width: 767px) {
  .wa-room-nav { flex-wrap: wrap; gap: 10px; padding: 10px 14px; }
  .wa-room-nav-divider { display: none; }
  .wa-room-nav-dots { order: 3; flex-basis: 100%; }
  .wa-room-meta-grid { grid-template-columns: repeat(2, 1fr); row-gap: 12px; }
  .wa-room-meta-col { border-right: none; padding: 0; }
  .opname-actions-bar { gap: 6px; }
  .signature-section--three { grid-template-columns: 1fr !important; }
  .signature-pad__canvas-wrap { height: 180px; }
}
```

- [ ] **Step 3: Verifikasi visual responsive**

Pakai DevTools device toolbar:
- **375px:** room-nav stack (prev/next+select baris atas, progress + dots baris bawah), meta 2 kolom tanpa border kanan, actions bar wrap rapi, asset jadi cards, signature 1 kolom canvas 180px.
- **768–1024px:** room-nav wrap dengan dots full-width row, meta 2 kolom, signature 2 kolom, tabel tetap font besar terbaca.
- **1280px:** layout desktop normal (4 kolom meta, 3 kolom signature, dots inline).
Cek juga dark mode di tiap breakpoint.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/OpnamePage.jsx app/src/styles/responsive.css
git commit -m "feat(opname): responsive room-nav, meta, actions, signature for tablet/mobile"
```

---

## Self-Review (sudah dijalankan saat penulisan)

**Spec coverage:**
- A. Tabel borderless + header besar → Task 1 ✓
- B. Dark mode fix → Task 2 + Task 3 ✓
- C. Dot grid bernomor + auto-scroll → Task 4 ✓
- D. Responsive tablet/mobile → Task 6 ✓
- E. Signature pad besar → Task 5 (+ responsive di Task 6) ✓

**Placeholder scan:** Tidak ada TBD/TODO; semua step ada kode konkret.

**Type/nama konsissten:** `dotsRef`, `data-active`, `.opname-actions-bar`, `.signature-section--three`, `.signature-pad__canvas-wrap` dipakai konsisten antar task. `--accent-soft/--accent-glow/--accent-ring/--border/--border-strong` semua sudah terdefinisi di tokens.css (light+dark).

**Catatan:** `.signature-section--three` sudah ada sebagai className di SignatureSection.jsx:25 — aman dioverride di responsive.css. `useEffect` sudah diimport di Task 4 Step 2 (dipakai juga oleh effect lain yang sudah ada — pastikan tidak double-import; import line cuma ditambah `useRef, useEffect` jika belum ada).
