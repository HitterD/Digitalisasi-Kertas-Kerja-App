# Catatan Teknis Detail Project: Digitalisasi Kertas Kerja APP

Dokumen ini adalah catatan teknis mendalam berbasis pembacaan langsung source code project, bukan ringkasan umum.

## 1. Tujuan dan Scope Sistem
Project ini menyatukan 4 proses kerja utama aset:
1. App1: Input/validasi opname per ruangan dari template excel.
2. App2: Ekstraksi hasil opname dari database menjadi paket file recouncil + MAT.
3. App3: Konsolidasi data master dari beberapa sumber excel (EXA/ADD/INV + master lama opsional).
4. App4: Recouncil hasil opname terhadap master terbaru.

Target penggunaan:
1. Web PC lokal (Vite dev/preview server).
2. Tablet Android (APK Capacitor) dengan mode online LAN dan fallback offline tertentu.

## 2. Topologi Runtime
Komponen runtime:
1. Frontend SPA React (`app/src`).
2. Vite server yang juga berperan sebagai mini-backend API (`app/vite.config.js` middleware stack).
3. SQL Server external (`ASSET_MANAGEMENT`) untuk data master/history/opname.
4. Network share Windows (`SHARE_BASE_PATH`) untuk file Kertas Kerja Opname periode.
5. Local runtime storage:
  - IndexedDB browser/tablet (state opname, cache DB master/history per user).
  - JSON file di `app/data` (users, audit, session/result sync, temp files App3/App4).

Port dan host:
1. Vite dev/preview: `0.0.0.0:5181`.
2. Endpoint API berada di path `/api/*` pada origin yang sama.

## 3. Struktur Folder dan Fungsi Nyata

### 3.1 Root Workspace
1. `startup.bat`
  - Masuk ke folder `app`.
  - Jika `node_modules` belum ada, jalankan `npm install`.
  - Buka `http://localhost:5181` lalu jalankan `npm run dev`.
2. `split_excel.py`
  - Memecah workbook multi-sheet menjadi file per sheet.
  - Nama output diambil dari `B3` (ruangan), style/merge/column width ikut disalin.
3. `analyze_excel.py`, `analyze_excel2.py`, `extract_barcode_logic.py`
  - Script analisis/sandbox untuk investigasi format excel dan logika barcode.
4. `Recouncil/`, `output_split/`, `hasil extract excel/`
  - Direktori data kerja/output historis.

### 3.2 Folder Aplikasi Utama `app/`
1. `src/` -> frontend production logic.
2. `vite.config.js` -> konfigurasi Vite + seluruh middleware API custom.
3. `app3_processor.py` -> engine konsolidasi master (Python/pandas/openpyxl).
4. `app4_processor.js` -> engine recouncil (Node/exceljs/jszip).
5. `app4_processor.py` -> versi Python lama/alternatif recouncil (masih ada di repo).
6. `data/` -> persistent runtime files dan temp processing.
7. `startup_tablet.bat` -> build + jalankan preview server untuk tablet.
8. `build_apk.bat` -> build web, sync capacitor, compile APK debug.
9. `android/` -> project native Capacitor Android.

## 4. Konfigurasi dan Environment

### 4.1 `app/.env.example`
Variabel penting:
1. `MSSQL_HOST`, `MSSQL_USER`, `MSSQL_PASSWORD`, `MSSQL_DATABASE`, `MSSQL_PORT`.
2. `SHARE_BASE_PATH`, `SHARE_USER`, `SHARE_PASSWORD`.
3. `JWT_SECRET`, `PASSWORD_SALT`.

### 4.2 `app/capacitor.config.json`
1. `appId`: `com.app.opnameaset`.
2. `webDir`: `dist`.
3. Android server mode:
  - `androidScheme: "http"`
  - `cleartext: true`
  - `allowMixedContent: true`

Catatan: konfigurasi ini memungkinkan komunikasi HTTP non-HTTPS untuk skenario LAN/internal.

## 5. Frontend Detail (`app/src`)

### 5.1 Entrypoint dan Routing
1. `main.jsx`
  - Render root React `App` pada elemen `#root`.
2. `App.jsx`
  - Auth guard `RequireAuth` membaca `auth` dari session/local storage.
  - Route:
    - `/login`
    - `/` (menu utama, atau auto redirect ke `/app1` di native)
    - `/admin`
    - `/app1` (Upload + Opname)
    - `/app2` (Extract, web-only)
    - `/app3` (Unified App3/App4, web-only)
    - `/dashboard` (analytics, web-only)

### 5.2 Pages dan Tanggung Jawab
1. `pages/LoginPage.jsx`
  - Login online ke `/api/auth/login`.
  - Simpan auth+jwt ke session/local sesuai remember-me.
  - Fallback offline login menggunakan `users_cache` + SHA-256 (`SJA-opname-2026` + password).
  - Native-only: modal konfigurasi base URL server.
2. `pages/BentoMenu.jsx`
  - Dashboard menu berbasis ACL (`access` apps).
  - User `DASHBOARD_ASSET_SJA` auto diarahkan ke `/dashboard`.
3. `pages/UploadPage.jsx`
  - Sumber data input kertas kerja:
    - Server file browser.
    - Upload manual excel.
  - Parsing excel via `parseExcelFile`.
  - Split workbook via `splitExcelBySheets`.
  - Integrasi dengan card session tersimpan + sync hub + upload DB.
4. `pages/OpnamePage.jsx`
  - UI operasi opname per ruangan.
  - Toggle/check aset, update field kondisi/keterangan.
  - Generate PDF 1 ruangan / semua ruangan.
  - Upload hasil ke `/api/sync/result`.
5. `pages/ExtractOpnamePage.jsx`
  - Ambil data periode/scanned/not-scanned dari API DB.
  - Build preview tiga sheet logical (Temuan/Recouncil/MAT).
  - Export file berdasarkan template excel.
6. `pages/App3ConsolidationPage.jsx`
  - Upload `master` opsional + `exa` + `add` + `inv`.
  - Langkah 1: ekstrak BAT (`/api/app3/get-bats`).
  - Langkah 2: pilih BAT dan proses final (`/api/app3/process`).
7. `pages/App4RecouncilPage.jsx`
  - Upload multi file `opname` + single file `master`.
  - Proses recouncil via `/api/app4/process`.
  - Download `xlsx` jika 1 file opname, `zip` jika banyak.
8. `pages/UnifiedMasterDataPage.jsx`
  - Container tab Tahap 1 (App3) dan Tahap 2 (App4).
9. `pages/AdminPage.jsx`
  - CRUD user (non super-admin delete dibatasi).
  - Lihat audit trail.
10. `pages/DashboardPage.jsx`
  - Agregasi statistik scanned/not scanned/ketidaksesuaian per tahun dan departemen.
  - Visualisasi pie + bar chart (`recharts`).

### 5.3 Store/Hooks State
1. `store/useOpnameState.jsx`
  - Reducer state utama:
    - `fileName`, `rooms`, `currentRoomIndex`, `isLoaded`.
  - Action penting:
    - `SET_DATA`, `LOAD_SAVED`, `SET_ROOM_INDEX`, `TOGGLE_ASSET_CHECK`.
    - `ADD/UPDATE/REMOVE_NO_BARCODE_ASSET`.
    - `ADD/UPDATE/REMOVE_NOT_AT_LOCATION_ASSET`.
    - `SET_SIGNATURE`, `RESET`.
2. `store/useOpnameStorage.jsx`
  - Inisialisasi state dari IndexedDB.
  - Debounced autosave session opname (`500 ms`).
  - Simpan/load master & history DB (buffer dan JSON map).
3. `store/useOpnameSync.jsx`
  - Export/import payload sinkronisasi session.
  - Serialisasi buffer DB ke base64 untuk transfer jaringan.
4. `store/OpnameContext.jsx`
  - Gabungkan stateHook + storageHook + syncHook.

### 5.4 Components Penting
1. `components/ServerFileBrowser.jsx`
  - Ambil daftar periode dari `/api/files/periods`.
  - Saat periode dipilih, fetch workbook list lalu auto download file pertama.
2. `components/DatabaseUploadGrid.jsx`
  - Sync on-demand dari SQL Server untuk master/history.
  - Fallback upload file excel untuk mode offline.
3. `components/NetworkSyncHub.jsx`
  - PC push session ke `/api/sync/session`.
  - Tablet pull session dari `/api/sync/session`.
  - PC pull result dari `/api/sync/result`.
4. `components/SavedSessionCard.jsx`
  - Muncul jika ada state opname tersimpan, lanjut ke `/app1/opname`.

### 5.5 Utils Detail
1. `utils/apiConfig.js`
  - Resolver base URL (relative di browser, absolute di Capacitor).
  - Helper auth header dan `fetchWithAuth` (auto logout saat 401).
2. `utils/db.js`
  - IndexedDB (`idb`) dengan prefix user (`getUserPrefix()`) untuk isolasi data antar akun.
  - Menyimpan session opname, master/history buffer, master/history JSON map.
3. `utils/masterDbParser.js`
  - Parser file master format ASPxGridView1.
  - Output: `Map<barcode, metadata aset>`.
4. `utils/historyDbParser.js`
  - Parser file history format `gvReportAllDetail`.
  - Output: `Map<barcode, Array<record sejarah>>`.
5. `utils/sqlServerApi.js`
  - Client API ke `/api/db/*`.
  - Konversi format response SQL agar konsisten dengan parser lokal.
6. `utils/excelParser.js`
  - Parse template opname (header/meta/asset rows).
  - `splitExcelBySheets` berbasis JSZip agar style excel tetap terjaga.
7. `utils/excelExportOpname.js`
  - Membuat export App2 dari template `Template_Opname.xlsx` dan `Template_MAT.xlsx`.
  - Aturan warna:
    - Biru: salah ruangan.
    - Ungu muda: cetak ulang.
    - Kuning: tidak terscan.
  - Mode output:
    - `generateAllExports` -> zip semua ruangan + HASIL_MAT.
    - `generateSingleExport` -> satu file ruangan.
8. `utils/pdfGenerator.js`
  - Generate PDF landscape dengan section utama, no-barcode, salah-ruangan, tanda tangan.
9. `utils/fileServerApi.js`
  - Wrapper fetch periode/workbooks/download dari middleware file server.
10. `utils/logger.js`
  - Append audit log ke `data/audit.json` (cap 5000 entries).

## 6. Backend API di `app/vite.config.js`

Catatan penting: file ini menjalankan seluruh middleware API; bukan hanya config build.

### 6.1 Security dan Utility Layer
1. Load env via `dotenv`.
2. JWT secret:
  - Jika `JWT_SECRET` kosong, generate random dev secret saat startup.
3. Password hash:
  - SHA-256 dengan `PASSWORD_SALT`.
  - `verifyPassword` kompatibel legacy plaintext.
4. CORS whitelist origin:
  - localhost/127.0.0.1/192.168.x.x/10.x.x.x.
5. Rate limiter login:
  - max 10 percobaan per IP dalam 5 menit.

### 6.2 SQL Server Endpoints (`/api/db/*`)
1. `GET /api/db/status`
  - Cek koneksi pool SQL.
2. `GET /api/db/master-assets`
  - Ambil master terbaru per barcode dari `V_REPORT_ALL_DETAIL` via `ROW_NUMBER()`.
3. `GET /api/db/history-assets`
  - Ambil histori lengkap barcode.
4. `GET /api/db/opname-periods`
  - Distinct `Periode` dari `TD_OPNAME`.
5. `GET /api/db/opname-data/:periode`
  - Data scanned per periode dari `TD_OPNAME`, plus join metadata via `OUTER APPLY`.
6. `GET /api/db/opname-not-scanned/:periode`
  - Master barcode yang tidak ditemukan pada `TD_OPNAME` periode terkait.
  - Hasil dikelompokkan per ruangan.

### 6.3 Sync Endpoints (`/api/sync/*`)
1. `POST /api/sync/session`
  - Simpan payload session PC ke `data/pc_session.json`.
2. `GET /api/sync/session`
  - Ambil payload session untuk tablet.
3. `POST /api/sync/result`
  - Simpan hasil opname tablet ke `data/tablet_result.json`.
4. `GET /api/sync/result`
  - Ambil hasil opname di PC.

### 6.4 File Browser Endpoints (`/api/files/*`)
1. `GET /api/files/periods`
  - List folder periode di `SHARE_BASE_PATH` yang memiliki subfolder `Lembar Kerja Opname`.
2. `GET /api/files/workbooks/:period`
  - List file `.xlsx/.xls` dalam `period/Lembar Kerja Opname`.
3. `GET /api/files/download/:period/:filename`
  - Download file excel.
4. Validasi path segment:
  - Regex whitelist untuk cegah directory traversal.

### 6.5 Auth dan User Endpoints
1. `POST /api/auth/login`
  - Validasi credential.
  - Generate JWT `12h`.
  - Return cache user (hash) untuk fallback offline.
2. `GET /api/audit-logs`
  - Return audit log dari `data/audit.json`.
3. `GET /api/users`
4. `POST /api/users`
5. `PUT /api/users/:username`
6. `DELETE /api/users/:username`
  - `ICT_SJA1` tidak bisa dihapus.

User seed logic:
1. Jika `users.json` tidak ada, buat default admin `ICT_SJA1`.
2. Memastikan user dashboard `DASHBOARD_ASSET_SJA` selalu ada.

### 6.6 JWT Middleware
1. Proteksi default semua `/api/*`.
2. Bypass:
  - `/api/auth/login`
  - `/api/db/status`

### 6.7 App3 Endpoints
1. Upload handler `multer` fields: `master`, `exa`, `add`, `inv`.
2. `POST /api/app3/get-bats`
  - Menulis temp json input.
  - Eksekusi `python app3_processor.py get_bat`.
  - Parse stdout line terakhir sebagai JSON.
3. `POST /api/app3/process`
  - Eksekusi `python app3_processor.py process`.
  - Jika sukses:
    - archive master lama ke `data/app3_archive` bila ada upload master.
    - kirim output xlsx sebagai attachment.

### 6.8 App4 Endpoints
1. Upload handler `multer` fields: multi `opname` + single `master`.
2. `POST /api/app4/process`
  - Validasi file wajib.
  - Menulis temp json input.
  - Eksekusi `node app4_processor.js process`.
  - Jika sukses:
    - kirim xlsx/zip attachment sesuai jumlah file opname.

## 7. Processor App3 Detail (`app/app3_processor.py`)

### 7.1 Fungsi Kunci
1. `parse_barcodes(barcode_str)`
  - Membersihkan delimiter (`;`, newline, `|`, spasi).
  - Filter special case (`N/A`, `NULL`, `NONE`, `TIDAK ADA`, dst).
  - Validasi token barcode (digit/simbol tertentu).
2. `expand_and_clean_barcodes(raw)`
  - Mendukung ekspansi range numerik `start-end`.
  - Batas ekspansi maksimum `200000` item.
3. `dynamic_extract(df, file_type)`
  - Cari header dinamis di 20 baris awal.
  - Map kolom standar: `NO BARCODE`, `ASSET ORACLE`, `LOKASI`, `JENIS HARTA`, `KONDISI`, `BAT`, `PERO_1`, `PERO_2`.
4. `get_bat_filters(files)`
  - Ekstrak BAT unik dari EXA/ADD/INV.
5. `format_custom_date(month, year, raw_barcode)`
  - Normalisasi bulan/tahun (termasuk inferensi dari prefix barcode).
6. `process_file(path, type, selected_bats)`
  - Extract sheet data, filter BAT, explode barcode multiple.
7. `run_consolidation(files, selected_bats, output_path)`
  - Optional append master lama.
  - Concat semua sumber.
  - Remove rows garbage (`JUMLAH`, `TOTAL`, `INVENTARIS YANG ...`).
  - Drop duplicates berdasarkan kolom target.
  - Write excel dengan style header hijau, border, freeze pane.

### 7.2 I/O Contract CLI
1. `get_bat`: input JSON berisi `files`.
2. `process`: input JSON berisi `files`, `selected_bats`, `output_path`.
3. Output selalu JSON text ke stdout.

## 8. Processor App4 Detail (`app/app4_processor.js`)

### 8.1 Langkah Proses
1. Load master workbook sheet pertama.
2. Baca header row 1 untuk map kolom (`NO BARCODE`, `ASSET ORACLE`, `LOKASI`, dst).
3. Bangun dictionary master by barcode.
4. Iterasi setiap file opname:
  - Load sheet `Recouncil` jika ada, fallback sheet pertama.
  - Deteksi nama ruangan dari `A2` (`RUANGAN : ...`) untuk nama file output.
  - Cari baris data terakhir.
  - Tulis header K-Q.
  - Isi data K-Q per row berdasarkan hasil matching barcode.
5. Status recouncil yang dihasilkan:
  - `Barcode Kosong di Opname`
  - `Barcode Belum Sesuai, Asset di Oracle tidak ada`
  - `Data Ditemukan Tidak Lengkap`
  - `Salah Ruangan seharusnya di ...`
  - `Sudah Sesuai`
6. Output:
  - Single opname -> xlsx.
  - Multi opname -> zip berisi file per ruangan.

### 8.2 I/O Contract CLI
1. Command: `process`.
2. Input: path ke json temp (`opnames[]`, `master`, `output_path`).
3. Output: JSON status ke stdout.

## 9. Data Contract Internal

### 9.1 Bentuk State Opname
Objek utama:
1. `fileName`.
2. `rooms[]`:
  - `sheetName`
  - `meta`: title/area/roomName/period/pic/date
  - `assets[]`
  - `noBarcodeAssets[]`
  - `notAtLocationAssets[]`
  - `signatures`
3. `currentRoomIndex`.

### 9.2 IndexedDB Keys (prefix per user)
1. `current-opname`.
2. `master-db` (legacy buffer).
3. `history-db` (legacy buffer).
4. `master-data-json`.
5. `history-data-json`.

### 9.3 File JSON Runtime (`app/data`)
1. `users.json` -> daftar akun + role + access.
2. `audit.json` -> log aktivitas sistem.
3. `pc_session.json` -> payload push session dari PC.
4. `tablet_result.json` -> payload hasil upload tablet.
5. `app3_temp/*`, `app4_temp/*` -> file sementara upload/proses.
6. `app3_archive/*` -> backup master lama saat App3 process.

## 10. Build, Run, Distribusi

### 10.1 Dev Lokal
1. Root: jalankan `startup.bat`.
2. Manual: `cd app && npm run dev`.

### 10.2 Tablet Server Mode
1. Jalankan `app/startup_tablet.bat`.
2. Script akan:
  - Cek/build `dist`.
  - Ambil IPv4 lokal.
  - Jalankan `npx vite preview --host`.
3. URL target tablet: `https://<ip-pc>:5181/` (sesuai output script).

### 10.3 APK Build
1. Jalankan `app/build_apk.bat`.
2. Pipeline:
  - `npm run build`
  - `npx cap sync android`
  - `android\gradlew.bat assembleDebug`
3. Output utama:
  - `android/app/build/outputs/apk/debug/app-debug.apk`
  - copy ke `app/OpnameAsetICT.apk`

## 11. Pengujian yang Ada
Folder `app/src/__tests__`:
1. `masterDbParser.test.js`
  - Uji parse map master, field mapping, skip barcode kosong, lookup trim.
2. `historyDbParser.test.js`
  - Uji parse multiple history per barcode, mapping field, skip barcode kosong.
3. `reducer.test.js`
  - Uji helper immutable update list pada state reducer.

Perintah test:
1. `npm run test` (vitest run).
2. `npm run test:watch`.

## 12. Risiko Teknis Nyata
1. `vite.config.js` menjadi monolitik (routing API, auth, db, sync, file server, app3/app4) sehingga sulit maintenance dan rawan regression lintas fitur.
2. `README.md` di `app/` masih template default Vite dan belum mencerminkan arsitektur operasional project.
3. Fallback security yang harus dikunci saat produksi:
  - JWT secret random jika env kosong.
  - Salt default hardcoded digunakan juga pada login offline.
4. Banyak artefak data/output/build dalam repo, berpotensi membesar dan mengganggu versioning.
5. Ketergantungan path share/network dan SQL server membuat stabilitas sangat bergantung pada infrastruktur LAN.

## 13. Prioritas Refactor yang Direkomendasikan
1. Pecah `vite.config.js` menjadi modul middleware terpisah per domain (`auth`, `db`, `sync`, `files`, `app3`, `app4`).
2. Buat dokumentasi operasi produksi:
  - setup `.env`
  - skenario PC-only, PC+tablet LAN, APK
  - backup/restore `app/data`
3. Tambah test integration untuk App3/App4 dengan fixture excel edge-case.
4. Definisikan policy pembersihan file temp/hasil agar ukuran project terkendali.

---
Disusun dari pembacaan langsung file inti: `app/src/*`, `app/vite.config.js`, `app/app3_processor.py`, `app/app4_processor.js`, script batch, config env/capacitor, serta unit test yang tersedia.
