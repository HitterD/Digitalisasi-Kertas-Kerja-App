# APP1 Opname — Room Status Dropdown Design Spec

**Tanggal:** 2026-06-24  
**Scope:** Redesign dropdown pemilihan ruangan di APP1 Opname agar status ruangan terbaca eksplisit: selesai, proses, atau belum mulai. Scope ini melanjutkan room navigation work yang sudah ada, tetapi fokus khusus pada dropdown ruang.

---

## Masalah

Dropdown ruangan di APP1 Opname masih mengandalkan teks panjang dan angka progress seperti `18/18`. Angka itu akurat, tetapi kurang cepat dipahami oleh operator saat bekerja di lapangan. User butuh penanda visual yang jelas bahwa ruangan sudah teropname atau belum.

Kondisi saat ini ada di [OpnamePage.jsx](../../../app/src/pages/OpnamePage.jsx#L200-L210): native `<select>` menampilkan `nomor + nama ruangan + (checked/total)`. Native select tidak ideal untuk badge warna, ikon status, deskripsi status, atau pencarian.

---

## Tujuan UX

- Status ruangan terlihat eksplisit tanpa user harus menafsirkan angka `18/18`.
- Dropdown tetap cepat dipakai untuk banyak ruangan.
- Nama ruangan panjang tetap terbaca cukup jelas, dengan ellipsis di trigger dan full name via `title`.
- User bisa mencari ruangan berdasarkan nomor, nama, atau status.
- Prev/next, progress ring, dan grid `Lihat semua` tetap berfungsi.
- Logic data opname tidak berubah.

---

## Keputusan Desain

Gunakan custom searchable dropdown khusus APP1: `RoomStatusSelect`.

Alasan:

1. Native `<select>` tidak reliable untuk badge warna dan layout kaya di `<option>`.
2. Komponen existing [SearchableGroupedSelect.jsx](../../../app/src/components/SearchableGroupedSelect.jsx#L13-L91) dipakai App2 dan belum support render option custom/status; mengubahnya berisiko efek samping ke App2.
3. APP1 butuh interaksi spesifik: status room, progress copy, search by status, dan integrasi dengan room navigation existing.

---

## Status Model

Status memakai helper existing [opnameRoomNav.js](../../../app/src/utils/opnameRoomNav.js#L19-L23):

| Kondisi | Status | Label | Ikon | Warna |
|---|---|---|---|---|
| `total > 0` dan `checked >= total` | `done` | `Selesai` | `✓` | Hijau |
| `checked > 0` dan belum penuh | `progress` | `Proses` | `…` | Oranye |
| `checked === 0`, `total === 0`, atau progress kosong | `empty` | `Belum` | `○` | Netral |

Angka `checked/total` tetap ditampilkan sebagai detail pendukung, bukan indikator utama.

---

## UI Design

### Trigger Tertutup

Trigger menggantikan native select di area [OpnamePage.jsx](../../../app/src/pages/OpnamePage.jsx#L200-L214), tetap diapit tombol prev/next.

Isi trigger:

- Ikon status (`✓`, `…`, `○`).
- Label posisi: `Ruangan X dari Y`.
- Nama ruangan aktif.
- Badge status: `Selesai`, `Proses`, atau `Belum`.
- Progress angka: `18/18`.
- Chevron dropdown.

Behavior visual:

- Border/focus memakai warna accent APP1.
- Nama panjang ellipsis satu baris.
- Badge status selalu terlihat di desktop/tablet.
- Pada mobile sempit, progress angka boleh tetap kecil; nama ruangan tetap prioritas.

### Popover Terbuka

Popover muncul di bawah trigger.

Isi popover:

- Search input dengan placeholder `Cari nama / nomor / status ruangan…`.
- Count kecil: `20 ruang`.
- List item ruangan.

Setiap item menampilkan:

- Ikon status.
- Nomor + nama ruangan.
- Deskripsi status:
  - `Semua aset sudah teropname`
  - `N aset belum dicek`
  - `Belum mulai opname`
- Badge status.
- Progress angka.

Item aktif diberi background lebih kuat dan `aria-current="true"`.

---

## Interaction Design

- Klik trigger membuka/menutup popover.
- Klik luar menutup popover.
- `Escape` menutup popover.
- Ketik search memfilter ruangan secara real-time.
- Search cocok terhadap:
  - nomor ruangan (`1`, `20`)
  - nama ruangan
  - status label (`selesai`, `proses`, `belum`)
  - progress text (`18/18`)
- Klik item menjalankan `onChange(index)`, memanggil `handleRoomSelect(index)`, lalu popover tertutup.
- Saat room diganti via prev/next atau grid `Lihat semua`, trigger ikut menampilkan status room terbaru.

---

## Component Plan

### New Component

Create [RoomStatusSelect.jsx](../../../app/src/components/RoomStatusSelect.jsx).

Props:

```jsx
<RoomStatusSelect
  rooms={state.rooms}
  progress={overallProgress}
  value={roomIdx}
  onChange={handleRoomSelect}
/>
```

Responsibilities:

- Render trigger.
- Render popover.
- Manage `isOpen` and `search` local state.
- Close on outside click and Escape.
- Derive status labels from `getRoomStatus`.
- Keep rendering immutable and side-effect-free except event listeners.

### Helper Reuse

Reuse:

- `getRoomStatus(progress)` from [opnameRoomNav.js](../../../app/src/utils/opnameRoomNav.js#L19-L23).

Potential local helpers inside component:

- `getRoomName(room, index)`
- `getStatusMeta(status)`
- `getStatusDescription(progress, status)`
- `getSearchText(room, index, progress, statusMeta)`

If helper count grows, extract to [opnameRoomNav.js](../../../app/src/utils/opnameRoomNav.js).

---

## File Impact

| File | Change |
|---|---|
| [RoomStatusSelect.jsx](../../../app/src/components/RoomStatusSelect.jsx) | New APP1-specific custom dropdown component |
| [OpnamePage.jsx](../../../app/src/pages/OpnamePage.jsx) | Replace native room `<select>` with `RoomStatusSelect` |
| [components.css](../../../app/src/styles/components.css) | Add `room-status-select` styles |
| [responsive.css](../../../app/src/styles/responsive.css) | Tune trigger/popover for tablet/mobile if needed |
| [opnameRoomNav.js](../../../app/src/utils/opnameRoomNav.js) | Reuse existing status helper; add pure helper only if needed |

---

## Accessibility

- Trigger uses `<button type="button">` with `aria-haspopup="listbox"` and `aria-expanded`.
- Popover list uses `role="listbox"`.
- Options use `role="option"` and `aria-selected`.
- Active room uses `aria-current="true"`.
- Search input has clear `aria-label`.
- Escape closes popover.
- Tab order stays natural: prev → dropdown trigger/search/options → next.
- Visible focus style uses accent ring.

---

## Error and Edge Cases

- Empty room list: component renders disabled trigger text `Tidak ada ruangan`.
- Missing room name: fallback to sheet name, then `Ruangan X`.
- `progress` undefined: status `Belum`, progress `0/0`.
- `total === 0`: status `Belum`, description `Belum ada aset di ruangan ini`.
- Very long room names: ellipsis in trigger/list primary line, full name in `title`.
- Search no result: show `Ruangan tidak ditemukan`.

---

## Testing Strategy

### Unit / Component

Add test if React test setup supports component rendering:

- Renders active room name and explicit status label.
- Shows `Selesai` when progress full.
- Shows `Proses` when checked partial.
- Shows `Belum` when checked zero or total zero.
- Filters by room name.
- Filters by status text.
- Calls `onChange(index)` when an option is selected.

### Smoke / Build

Run from [app/](../../../app/):

```bash
rtk npm run build
```

Run focused helper/component tests if added:

```bash
rtk npm run test -- RoomStatusSelect opnameRoomNav
```

### Manual Verification

- Open `/app1/opname` with many rooms.
- Confirm native select is replaced by custom status dropdown.
- Confirm active room trigger shows icon, badge status, name, and progress.
- Open dropdown and search `801`.
- Search `selesai`, `proses`, and `belum`.
- Select far room; metadata, progress ring, and asset list update.
- Click outside; popover closes.
- Press Escape; popover closes.
- Use prev/next; dropdown trigger status updates.
- Open `Lihat semua` grid; existing grid behavior still works.
- Check tablet/APK touch target and long room names.

---

## Non-Goals

- No change to checklist asset logic.
- No change to PDF generation.
- No change to sync/save/load.
- No change to barcode styling in this dropdown-specific scope.
- No change to App2 `SearchableGroupedSelect`.
- No native Android code change unless APK rebuild is requested in implementation phase.

---

## Acceptance Criteria

- Dropdown shows explicit status badge: `Selesai`, `Proses`, or `Belum`.
- Status is understandable without interpreting `18/18`.
- Search can find room by name, number, and status.
- Selecting room from dropdown updates current room.
- Prev/next and existing `Lihat semua` grid still work.
- Long room names do not break layout.
- Build passes.
