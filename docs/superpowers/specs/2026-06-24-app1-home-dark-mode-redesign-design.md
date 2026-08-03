# App1 Home — Full Redesign Dark Mode & Sumber Data Aset

**Tanggal:** 2026-06-24  
**Scope:** Redesign semua tampilan App1 yang berada di luar route `/app1/opname`.  
**Target file:** `app/src/pages/UploadPage.jsx`, `app/src/components/SavedSessionCard.jsx`, `app/src/components/NetworkSyncHub.jsx`, `app/src/components/DatabaseUploadGrid.jsx`, `app/src/components/ServerFileBrowser.jsx`, `app/src/components/SaveLoadModal.jsx`, CSS terkait di `app/src/styles/pages.css`, `app/src/styles/components.css`, atau file style existing yang paling sesuai.  
**Arah desain:** Full App1 home redesign, user-friendly, SQL-first, dark-mode-safe, token-based.

---

## 1. Konteks & Masalah

App1 memiliki dua area utama:

- `/app1` — halaman home/upload/sync/sumber data.
- `/app1/opname` — halaman kertas kerja opname aktif.

Redesign ini hanya menyasar `/app1` dan komponen/modal yang dipanggil dari sana. `/app1/opname` tidak disentuh.

Masalah utama di halaman App1 home saat ini:

- **Kontras dark mode tidak stabil** karena masih ada inline style dan warna legacy seperti charcoal/warm/white hardcoded di beberapa komponen.
- **Hierarki aksi kurang jelas**: user melihat banyak tombol teknis sekaligus, belum ada urutan kerja yang mudah diikuti.
- **Sumber Data Aset terlalu teknis**: SQL Server sync, Master DB, History DB, dan upload fallback belum terlihat sebagai satu flow yang jelas.
- **Inline-style berat** membuat dark mode, hover/focus, dan reuse class sulit dijaga.
- **Modal server/save-load belum konsisten** dengan surface token dark mode.

**Tidak berubah:** flow data, IndexedDB/cache, parser Excel, API sync SQL, API sync PC/tablet, route `/app1/opname`, dan logika opname aktif.

---

## 2. Prinsip Desain

- Pakai token dari `tokens.css`: `--bg-primary`, `--bg-surface`, `--bg-input`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--border`, `--border-strong`, `--accent`, `--success-*`, `--warning-*`, `--danger-*`.
- Tidak tambah dependency.
- Dark mode wajib diuji sebagai desain sendiri, bukan hasil invert light mode.
- Body/label penting target kontras minimal WCAG AA: text normal ≥4.5:1; secondary/supporting ≥3:1.
- SQL Server menjadi jalur utama untuk sumber data; upload file tetap ada sebagai fallback/offline.
- Satu primary CTA per konteks.
- Status tidak boleh hanya warna; harus ada teks seperti `SQL READY`, `PERLU SYNC`, `MASTER OK`, `HISTORY PERLU SYNC`.
- `/app1/opname` tetap aman dari scope ini.

---

## 3. Struktur App1 Home

### 3.1 Header App1

Header App1 tetap memakai struktur existing dari `App1Layout`, tapi visual dirapikan:

- Back/logout button transparent, warna `--text-secondary` atau danger token untuk logout native.
- Divider vertikal warna `--border`.
- Module identity: icon container `--bg-input`, icon `--accent`, title `--text-primary`.
- Pill navigation:
  - `Home` active di `/app1`.
  - `Kertas Kerja` active selain home.
  - Active state harus kontras di dark mode (`--text-primary` + `--bg-primary` atau pattern existing yang sudah terbaca).
- `BARCODE CHECKER` tetap di kanan, tapi warna token-based dan kontras.
- `ThemeToggle` tetap terlihat.

Header boleh tetap di `App.jsx`, tapi inline color hardcoded yang bermasalah harus dipindahkan ke class/token bila menyentuh App1 scope.

### 3.2 Hero Operasional

Halaman `/app1` menjadi landing operasional, bukan kumpulan kartu teknis.

Hero berisi:

- Eyebrow: `MODUL 01 · OPERASIONAL`.
- Title: “Mulai opname tanpa bingung.”
- Helper text: jelaskan urutan kerja: siapkan data, sinkron SQL, lalu mulai/lanjutkan opname.
- Primary CTA: `Mulai / Lanjutkan Opname` bila ada sesi tersimpan atau data siap.
- Secondary CTA: `Ambil Data Server`.
- Status mini di kanan/bawah:
  - jumlah ruangan tersimpan.
  - kesiapan Master/History.
  - indikator jika History perlu sync.

Hero memakai warm/accent gradient yang tetap kontras di dark mode. Jika gradient terlalu berisiko, pakai surface solid + accent border.

### 3.3 Action Cards

Di bawah hero tampil kartu aksi utama:

1. **Lanjutkan Sesi**
   - Muncul bila `state.rooms.length > 0`.
   - Menampilkan jumlah ruangan dan nama file bila ada.
   - CTA penuh: `Lanjutkan Opname`.

2. **Sinkron Jaringan**
   - Menjelaskan arah PC ↔ Tablet.
   - Desktop/non-native: tampil `Bagikan Sesi` dan `Tarik Hasil Opname`.
   - Native/tablet: tampil `Tarik Sesi` dan konfigurasi IP PC.
   - Label arah dibuat besar dan eksplisit: `PC → JARINGAN`, `TABLET → PC`, atau `JARINGAN → TABLET`.

3. **Sumber Data Aset**
   - Section penuh, bukan kartu kecil.
   - SQL Server sync menjadi primary path.
   - Master/History jadi status card terpisah.

---

## 4. Sumber Data Aset — SQL-First Redesign

`DatabaseUploadGrid` diredesign sebagai pusat kesiapan data.

### 4.1 Header Section

Header section:

- Eyebrow: `SUMBER DATA ASET`.
- Title: “Sinkron SQL Server dulu, upload kalau offline.”
- Badge global:
  - `SQL READY` bila sync sukses.
  - `PERLU SYNC` bila salah satu database belum ada/outdated.
  - `GAGAL TERHUBUNG` bila sync gagal.

Header harus menjelaskan bahwa SQL adalah jalur utama, upload file hanya fallback.

### 4.2 Primary Sync CTA

Di bawah header, tampil tombol utama full-width:

- Label normal: `Sinkron Semua dari SQL Server`.
- Loading: `Menyinkronkan dari SQL Server...` plus spinner.
- Disabled saat `masterSyncing || historySyncing`.
- Helper text: “Mengambil Master Aset + History sekaligus. Data tersimpan offline setelah sinkron.”

Tombol ini harus menjadi aksi paling dominan di section Sumber Data Aset.

### 4.3 Master & History Status Cards

Tampil dua kartu sejajar desktop, stack di mobile/tablet kecil:

#### Master Aset

Isi kartu:

- Label: `MASTER ASET`.
- Title: “Database utama”.
- Badge count jika tersedia: `{n} ASET`.
- Status box:
  - success: `SQL Server tersinkron` + waktu sync.
  - empty: `Belum ada Master Aset` + instruksi sync.
  - error: pesan gagal + recovery path.
- Actions:
  - `Sinkron Ulang`.
  - `Upload File Fallback`.

#### History Aset

Isi kartu:

- Label: `HISTORY ASET`.
- Title: “Riwayat transaksi”.
- Badge count jika tersedia: `{n} BARCODE`.
- Status box:
  - success: `History tersinkron` + waktu sync.
  - warning: `Belum tersinkron hari ini` atau `Perlu sync` bila data tidak ada/outdated.
  - error: pesan gagal + recovery path.
- Actions:
  - `Sinkron History`.
  - `Upload File Fallback`.

### 4.4 Upload Fallback

Upload file tetap ada, tapi bukan visual utama.

Rules:

- Label jelas: `Upload File Fallback`.
- Helper: “Gunakan hanya jika SQL Server tidak tersedia.”
- Validasi ekstensi `.xlsx` / `.xls` tetap sama.
- Error file salah format tampil dekat action terkait.
- File name boleh wrap dan harus terbaca di dark mode.

### 4.5 Error State SQL

Error state harus dekat dengan section, bukan hanya tersebar.

Format pesan:

- Cause: “Gagal terhubung ke SQL Server.”
- Recovery: “Pastikan jaringan tersedia, lalu coba sinkron ulang.”
- Style: danger surface token, border danger, text danger shade terang di dark mode.

---

## 5. Modal & Komponen Pendukung

### 5.1 Browse File Server Modal

Modal dari `UploadPage` saat `isServerModalOpen` harus ikut dark mode:

- Overlay/scrim tetap kuat: 40–60% black.
- Container pakai `--bg-surface`, border `--border-strong`, text `--text-primary`.
- Header pakai token, bukan `#ffffff`.
- Close button punya hover/focus via CSS class, bukan inline mouse handler.
- `ServerFileBrowser` content harus tetap terbaca di dark mode.

### 5.2 Save/Load Modal

`SaveLoadModal` ikut scope bila tampil dari `/app1`:

- Surface, border, heading, body text pakai token.
- Empty/error/loading state terbaca di dark mode.
- Destructive/reset action tetap danger, bukan sekadar abu-abu.

### 5.3 SavedSessionCard

`SavedSessionCard` berubah dari info pasif menjadi entry point jelas:

- Badge jumlah ruangan kontras.
- File name terlihat, tapi tidak mendominasi.
- CTA full-width `Lanjutkan Opname`.
- Jika tidak ada sesi, komponen tetap tidak render seperti sekarang.

### 5.4 NetworkSyncHub

`NetworkSyncHub` dibuat lebih mudah dipahami:

- Copy pendek: “PC ↔ Tablet”.
- Arah transfer tampil sebagai label utama.
- Native vs non-native logic tetap sama.
- Konfigurasi IP PC tetap collapsible.
- Success/error message memakai success/danger token dengan teks recovery.

---

## 6. CSS & Cleanup

- Tambahkan class page-specific App1 bila perlu, misalnya `.app1-home-*` atau `.wa-home-*`.
- Reuse `wa-*`, `card`, `badge`, `btn` yang sudah ada jika cukup.
- Pindahkan inline style warna/layout berulang ke CSS class.
- Raw hex baru tidak dipakai untuk warna semantik. Raw rgba boleh hanya untuk overlay/scrim/effect ringan jika token tidak cukup, tapi prefer token.
- Jangan hapus CSS lama tanpa `Grep` usage.
- Jangan buat abstraction baru untuk hal yang hanya dipakai sekali.

---

## 7. Accessibility & Interaction

Acceptance UX minimum:

- Semua tombol punya tinggi/padding yang memenuhi target ±44px.
- Focus state terlihat.
- Disabled state memakai atribut `disabled`, opacity saja tidak cukup.
- Status tidak hanya warna; wajib ada teks status.
- Loading state mempertahankan konteks aksi.
- Error message menyebut penyebab dan cara pulih.
- Modal close bisa diakses keyboard.
- Contrast dark mode diverifikasi manual untuk header, hero, cards, modal, badges, dan error state.

---

## 8. Non-Goals

- Tidak ubah `/app1/opname`.
- Tidak ubah flow opname aktif.
- Tidak ubah backend/API SQL Server.
- Tidak ubah parser Excel/Master/History.
- Tidak tambah dependency.
- Tidak membuat wizard multi-route baru.
- Tidak redesign App2/App3/App4 dalam scope ini.
- Tidak overhaul global design system selain token/class yang diperlukan App1.

---

## 9. Testing & Verification

Minimum check:

- Unit/render test existing atau test kecil untuk memastikan `/app1` render CTA utama dan section `Sumber Data Aset`.
- Smoke command: `npm run lint` atau test project yang tersedia.
- Manual browser verify:
  - buka `/app1`.
  - toggle dark mode.
  - cek header, hero, Saved Session, Network Sync, Sumber Data Aset, Browse File Server modal, Save/Load modal.
  - pastikan teks utama terbaca dan status badge tidak low contrast.
  - buka `/app1/opname` dan pastikan tampilan inti tidak ikut berubah di luar header global App1.

---

## 10. Acceptance Criteria

- [ ] `/app1` tampil sebagai landing operasional dengan hero, status kesiapan data, dan CTA jelas.
- [ ] Semua tampilan App1 selain `/app1/opname` memakai token dark mode untuk text/surface/border.
- [ ] Tidak ada teks gelap legacy yang low contrast di dark mode pada App1 home.
- [ ] `DatabaseUploadGrid` menjadi SQL-first: sync semua dari SQL Server adalah CTA utama.
- [ ] Master Aset dan History Aset tampil sebagai status card terpisah dengan success/warning/error state jelas.
- [ ] Upload file tetap tersedia sebagai fallback, bukan primary path.
- [ ] `SavedSessionCard` jelas sebagai aksi lanjutkan sesi.
- [ ] `NetworkSyncHub` menampilkan arah transfer PC/Tablet secara eksplisit.
- [ ] Browse File Server modal dan Save/Load modal terbaca di dark mode.
- [ ] `/app1/opname` tidak diredesign dalam scope ini.
- [ ] Tidak ada dependency baru.
- [ ] Test/smoke dan manual dark mode verification dilaporkan jujur.
