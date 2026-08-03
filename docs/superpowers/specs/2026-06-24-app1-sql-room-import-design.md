# APP1 Opname — SQL Room Import & Local Room Delete Design Spec

**Tanggal:** 2026-06-24  
**Scope:** APP1 `/app1/opname` kertas kerja opname aset. Fitur ini menambah penghapusan ruangan dari kertas kerja lokal, pembuatan ruangan dari data SQL, import aset per kategori owner, dan review aset ambigu sebelum masuk kertas kerja.

---

## Masalah

Operator perlu menghapus ruangan yang tidak terpakai dari kertas kerja tanpa mengubah data server SQL. Operator juga perlu membuat ruangan baru berdasarkan data SQL agar nama/kode ruangan konsisten dengan master di server `192.168.2.111`. Setelah ruangan dipilih, sistem perlu menarik aset yang ada di ruangan itu, tetapi hanya aset milik kategori terpilih: `ICT`, `HRGA`, atau `ENG`.

Ada risiko aset seperti monitor dan UPS bisa dimiliki ICT atau ENG. Karena itu sistem tidak boleh mengandalkan keyword aset saja. Berdasarkan struktur query SQL user, `CREATE_USER` tersedia di `[ASSET_MANAGEMENT].[dbo].[V_REPORT_ALL_DETAIL]` dan menjadi sumber utama owner aset.

---

## Tujuan

- Delete ruangan hanya menghapus dari kertas kerja/sesi opname, tidak menyentuh SQL server.
- Create ruangan baru memilih `NAMA_RUANGAN` dari SQL, bukan input bebas utama.
- Import aset hanya untuk satu kategori per create: `ICT`, `HRGA`, atau `ENG`.
- Owner aset ditentukan utama dari `CREATE_USER`.
- Aset dengan `CREATE_USER` kosong/tidak dikenal masuk review manual.
- Aset ambigu seperti monitor/UPS diberi warning jika keyword aset berpotensi lintas kategori.
- Aset hasil import masuk kertas kerja dengan status belum terceklis (`isChecked: false`).
- Sistem efisien: tidak mengambil semua aset besar sebelum user memilih room dan kategori.

---

## Non-Goals

- Tidak menghapus atau update data SQL server.
- Tidak membuat 3 ruangan sekaligus untuk ICT/HRGA/ENG.
- Tidak otomatis mencentang aset hasil import.
- Tidak mengubah logic PDF/sync/save/load kecuali membaca state ruangan hasil import.
- Tidak mengubah database schema.

---

## Current Evidence

- APP1 opname page memakai `CustomRoomModal` untuk tambah ruang custom di [OpnamePage.jsx](../../../app/src/pages/OpnamePage.jsx#L380-L389).
- Modal custom saat ini hanya input manual `roomName`, `picName`, `area`, dan `period` di [CustomRoomModal.jsx](../../../app/src/components/CustomRoomModal.jsx#L3-L20).
- Reducer saat ini punya action `ADD_CUSTOM_ROOM` yang membuat room kosong dan `isCustomRoom: true` di [useOpnameState.jsx](../../../app/src/store/useOpnameState.jsx#L195-L224).
- SQL route sudah membaca `V_REPORT_ALL_DETAIL` untuk master asset dan mengambil `NAMA_RUANGAN` serta `PIC_RUANGAN` di [sqlRoute.js](../../../app/server/routes/sqlRoute.js#L121-L153).
- Query user menunjukkan `CREATE_USER`, `LOCATION_CODE`, `NAMA_RUANGAN`, `RUANGAN_ID`, dan field asset lain tersedia di `[ASSET_MANAGEMENT].[dbo].[V_REPORT_ALL_DETAIL]`.

---

## Recommended Approach

Gunakan pendekatan **Local room workflow + SQL room picker + category import review wizard**.

Flow ringkas:

1. Operator dapat delete ruangan dari kertas kerja lokal.
2. Operator klik `+ Ruangan dari SQL`.
3. Modal wizard menampilkan searchable dropdown `NAMA_RUANGAN` dari SQL.
4. Operator memilih satu kategori import: `ICT`, `HRGA`, atau `ENG`.
5. Sistem fetch aset latest dari ruangan SQL tersebut.
6. Sistem klasifikasi aset berdasarkan `CREATE_USER`.
7. Preview dipisah menjadi `Masuk Kategori`, `Perlu Review`, dan `Exclude`.
8. Operator menyelesaikan keputusan aset review.
9. Sistem membuat satu ruangan baru dengan aset selected kategori itu saja.
10. Semua aset imported masuk dengan `isChecked: false`.

Alasan:

- Paling aman untuk SQL karena semua operasi destructive bersifat lokal.
- Paling sesuai opname fisik karena imported asset belum otomatis dianggap ditemukan.
- Paling jelas untuk operator karena create room, pilih kategori, review, dan import berada dalam satu flow.
- Tetap efisien karena asset detail baru diambil setelah room dan kategori dipilih.

---

## UX Design

### Delete Ruangan Lokal

Tombol: `Delete dari Kertas Kerja`.

Confirm modal:

- Judul: `Hapus ruangan dari kertas kerja?`
- Body: `Data SQL/server tidak akan berubah. Ruangan hanya dihapus dari sesi opname ini.`
- Detail: nama ruangan, jumlah aset, kategori/source jika ada.
- Primary destructive: `Hapus dari Kertas Kerja`
- Secondary: `Batal`

Behavior setelah delete:

- Ruangan dihapus dari `state.rooms` secara immutable.
- `currentRoomIndex` pindah ke index valid terdekat.
- Toast: `Ruangan dihapus dari kertas kerja. Data server tidak berubah.`
- Jika room terakhir dihapus, UI kembali ke state kosong atau room sebelumnya.

### Create Ruangan dari SQL

Tombol: `+ Ruangan dari SQL`.

Wizard 3 langkah:

1. **Pilih Ruangan**
   - Searchable dropdown `NAMA_RUANGAN`.
   - Tampilkan count asset latest jika tersedia.
   - Tampilkan `PIC_RUANGAN`/`RUANGAN_ID` jika tersedia untuk membedakan nama mirip.
2. **Pilih Kategori Import**
   - Card pilihan: `ICT`, `HRGA`, `ENG`.
   - Hanya satu kategori bisa dipilih per create.
   - Jika user butuh kategori lain, user create ulang dari room SQL yang sama dengan kategori berbeda.
3. **Review Aset**
   - Tab `Masuk Kategori`: aset dengan `CREATE_USER` match kategori terpilih.
   - Tab `Perlu Review`: aset dengan `CREATE_USER` kosong/tidak dikenal, atau perlu keputusan manual.
   - Tab `Exclude`: aset dengan `CREATE_USER` match kategori lain.
   - Aset ambiguous seperti `MONITOR`, `UPS`, `STABILIZER`, `DISPLAY` diberi warning jika bisa lintas kategori.
   - Tombol import disabled sampai semua aset `Perlu Review` diputuskan `include` atau `exclude`.

Nama room hasil import:

- Format: `{NAMA_RUANGAN} — {CATEGORY}`.
- Contoh: `RUANG SERVER EXTERNAL — ICT`.

### Review Aset Ambigu

Action per row:

- `Include ke {CATEGORY}`
- `Exclude`

Batch action:

- `Include semua Perlu Review`
- `Exclude semua Perlu Review`

Copy harus jelas bahwa include berarti aset masuk kertas kerja kategori terpilih, bukan mengubah SQL.

---

## Owner Classification Rules

### Priority

1. `CREATE_USER` adalah sumber utama owner.
2. Mapping `CREATE_USER`:
   - Mengandung atau prefix `ICT` → `ICT`
   - Mengandung atau prefix `ENG` → `ENG`
   - Mengandung atau prefix `HRD` atau `HRGA` → `HRGA`
3. Jika `CREATE_USER` kosong, null, atau tidak dikenal → `Perlu Review`.
4. `NAMA_ASSET`, `KODE_TYPE_ASSET`, dan `KODE_KATEGORI_ASSET` hanya dipakai sebagai warning/helper.
5. Keputusan manual user menang atas semua suggestion.

### Ambiguous Keyword Warning

Keyword warning awal:

- `MONITOR`
- `UPS`
- `STABILIZER`
- `DISPLAY`
- `PANEL CONTROL`

Contoh:

- `CREATE_USER = ENG`, `NAMA_ASSET = MONITOR 24 INCH` → default owner `ENG`, status `include/exclude` tergantung selected category, warning `Cek ulang: aset bisa ICT/ENG`.
- `CREATE_USER = NULL`, `NAMA_ASSET = UPS 1200VA` → masuk `Perlu Review`.

### Output Classification Per Asset

Setiap row preview punya hasil:

```js
{
  ownerCategory: 'ICT' | 'HRGA' | 'ENG' | null,
  ownerSource: 'create_user' | 'manual' | 'unknown',
  ownerConfidence: 'high' | 'review',
  warning: string | null,
  importDecision: 'include' | 'exclude' | 'review',
  importCategory: 'ICT' | 'HRGA' | 'ENG'
}
```

---

## Backend Design

Tambah endpoint read-only di [sqlRoute.js](../../../app/server/routes/sqlRoute.js).

### `GET /api/db/rooms`

Purpose: dropdown ruangan SQL.

Query concept:

```sql
WITH LatestMaster AS (
  SELECT
    BARCODE_ASSET,
    NAMA_RUANGAN,
    PIC_RUANGAN,
    RUANGAN_ID,
    ROW_NUMBER() OVER (
      PARTITION BY BARCODE_ASSET
      ORDER BY TRANS_DATE DESC, HIST_ID DESC
    ) AS rn
  FROM [dbo].[V_REPORT_ALL_DETAIL]
  WHERE BARCODE_ASSET IS NOT NULL
    AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
    AND NAMA_RUANGAN IS NOT NULL
    AND LTRIM(RTRIM(NAMA_RUANGAN)) <> ''
)
SELECT
  LTRIM(RTRIM(NAMA_RUANGAN)) AS NAMA_RUANGAN,
  MAX(LTRIM(RTRIM(PIC_RUANGAN))) AS PIC_RUANGAN,
  MAX(RUANGAN_ID) AS RUANGAN_ID,
  COUNT(*) AS ASSET_COUNT
FROM LatestMaster
WHERE rn = 1
GROUP BY LTRIM(RTRIM(NAMA_RUANGAN))
ORDER BY LTRIM(RTRIM(NAMA_RUANGAN));
```

Response envelope:

```js
{
  success: true,
  count: number,
  data: [
    {
      NAMA_RUANGAN: string,
      PIC_RUANGAN: string | null,
      RUANGAN_ID: number | string | null,
      ASSET_COUNT: number
    }
  ],
  timestamp: string
}
```

### `GET /api/db/rooms/:roomName/assets?owner=ICT|HRGA|ENG`

Purpose: ambil latest assets untuk satu ruangan. Endpoint tetap bisa mengembalikan aset review unknown agar operator bisa include manual.

Rules:

- `roomName` wajib non-empty.
- `owner` wajib salah satu `ICT`, `HRGA`, `ENG`.
- Query pakai parameterized input `@roomName` dan `@owner`.
- Tidak menggunakan string interpolation untuk SQL value.
- Return latest record per barcode.

Selected columns:

- `HIST_ID`
- `BARCODE_ASSET`
- `NAMA_ASSET`
- `CN_ASSET`
- `KODE_KATEGORI_ASSET`
- `KODE_TYPE_ASSET`
- `LOCATION_CODE`
- `NAMA_RUANGAN`
- `PIC_RUANGAN`
- `NAMA_KONDISI`
- `KETERANGAN`
- `KETERANGAN_OPNAME`
- `TRANS_DATE`
- `BULAN`
- `TAHUN`
- `CREATE_USER`
- `CREATE_DATE`
- `NO_PO`
- `SITE_ID`
- `RUANGAN_ID`
- `KONDISI_BARANG_ID`

The backend may return all latest assets in the room for full frontend classification, or return owner-matched + unknown rows for efficiency. Recommended initial implementation: return all latest assets for selected room, then classify in frontend for correctness and easier review. If dataset proves large, optimize to server-side grouping while preserving `Perlu Review` rows.

---

## Frontend Design

### Components

Add focused components rather than growing [OpnamePage.jsx](../../../app/src/pages/OpnamePage.jsx):

- `SqlRoomImportModal.jsx`
  - owns wizard state
  - fetches room list and room assets
  - renders category selection and preview
- `SqlRoomPicker.jsx`
  - searchable dropdown for `NAMA_RUANGAN`
- `OwnerCategorySelector.jsx`
  - category cards for `ICT`, `HRGA`, `ENG`
- `AssetImportReviewTable.jsx`
  - tabs and include/exclude decisions
- `DeleteRoomConfirmModal.jsx`
  - local delete confirmation

### Utilities

Add `src/utils/sqlRoomImport.js`:

- `normalizeCreateUser(createUser)`
- `getOwnerFromCreateUser(createUser)`
- `hasAmbiguousOwnerKeyword(asset)`
- `classifyAssetForCategory(asset, selectedCategory)`
- `buildImportPreview(assets, selectedCategory, manualDecisions)`
- `mapSqlAssetToOpnameAsset(asset, categoryMeta)`

These functions stay pure and unit-testable.

### Store Actions

Add reducer actions in [useOpnameState.jsx](../../../app/src/store/useOpnameState.jsx):

- `REMOVE_ROOM_LOCAL`
- `ADD_SQL_IMPORTED_ROOM`

`REMOVE_ROOM_LOCAL` payload:

```js
{
  roomIndex: number
}
```

Behavior:

- Filter out target room immutably.
- Clamp `currentRoomIndex` to valid index.

`ADD_SQL_IMPORTED_ROOM` payload:

```js
{
  roomName: string,
  category: 'ICT' | 'HRGA' | 'ENG',
  sourceRoom: {
    namaRuangan: string,
    picRuangan: string | null,
    ruanganId: string | number | null
  },
  assets: Array<OpnameAsset>
}
```

New room shape:

```js
{
  sheetName: `${roomName} — ${category}`,
  meta: {
    title: 'RUANGAN SQL IMPORT',
    area: '',
    roomName: `${roomName} — ${category}`,
    period: defaultPeriod,
    picName: sourceRoom.picRuangan || '',
    date: today,
    source: 'sql-room-import',
    sourceRoomName: sourceRoom.namaRuangan,
    sourceRoomId: sourceRoom.ruanganId,
    ownerCategory: category
  },
  assets,
  noBarcodeAssets: [],
  notAtLocationAssets: [],
  signatures: defaultSignatures,
  isCustomRoom: false,
  isSqlImportedRoom: true
}
```

Imported asset mapping:

```js
{
  barcode: BARCODE_ASSET,
  namaAset: NAMA_ASSET,
  noPO: NO_PO || '',
  tipe: KODE_TYPE_ASSET || '',
  bulanPerolehan: BULAN || '',
  tahunPerolehan: TAHUN || '',
  adaTidakAda: 'Ada',
  kondisi: NAMA_KONDISI || 'Baik',
  keterangan: KETERANGAN_OPNAME || KETERANGAN || '',
  isChecked: false,
  ownerCategory: category,
  ownerSource,
  ownerConfidence,
  source: 'sql-room-import',
  sourceCreateUser: CREATE_USER || '',
  sourceRoomName: NAMA_RUANGAN || '',
  sourceRoomId: RUANGAN_ID || null
}
```

---

## Efficiency Plan

- Fetch room list once per modal open; cache in modal state for that session.
- Fetch assets only after both room and category selected.
- Use debounce 250–300ms for room search if endpoint later supports query search.
- Keep excluded assets out of main opname state.
- Use `useMemo` for classification and preview grouping.
- Add table pagination or virtualization if preview rows exceed 200.
- Import only final included assets into reducer.
- Avoid recalculating owner classification inside render loops without memoization.

---

## Error Handling

- SQL unavailable: show user-friendly error `Koneksi SQL tidak tersedia. Coba lagi atau hubungi admin.`
- Room list empty: show empty state `Tidak ada ruangan SQL ditemukan.`
- Selected room has no assets: show `Tidak ada aset latest untuk ruangan ini.`
- Selected category has zero include rows: allow user to review unknown rows, but show warning before import.
- All rows excluded: disable import and explain `Tidak ada aset yang dipilih untuk diimport.`
- Duplicate room name/category already exists in kertas kerja: ask whether to cancel or append assets not already present.
- Duplicate barcode inside target import: dedupe by trimmed `BARCODE_ASSET`.

---

## Security & Data Safety

- All SQL endpoints are GET/read-only.
- SQL values use parameterized queries.
- Delete room is frontend/local state only.
- UI copy must state server SQL is not changed.
- Do not log full sensitive asset payloads in production logs.
- API error response should not leak SQL credentials or connection strings.
- Validate `owner` query param against allowed enum.

---

## Testing Strategy

### Unit Tests

`sqlRoomImport` utility tests:

- `CREATE_USER=ICT...` maps to `ICT`.
- `CREATE_USER=ENG...` maps to `ENG`.
- `CREATE_USER=HRD...` maps to `HRGA`.
- Unknown/null `CREATE_USER` returns review state.
- Selected category ICT includes ICT rows, excludes ENG/HRGA rows.
- Ambiguous keyword with known create user returns warning but does not override owner.
- Imported assets map with `isChecked=false`.

Reducer tests:

- `REMOVE_ROOM_LOCAL` removes room immutably.
- `REMOVE_ROOM_LOCAL` clamps current index.
- `ADD_SQL_IMPORTED_ROOM` creates room with suffix category.
- Imported room contains only included assets.

### Component Tests

- SQL room modal renders room picker.
- Category select changes preview.
- Import button disabled until review rows resolved.
- Include/exclude decision updates preview count.
- Submit calls `ADD_SQL_IMPORTED_ROOM` with included assets only.

### Smoke / Build

From [app/](../../../app/):

```bash
rtk npm run build
rtk npm run test -- sqlRoomImport useOpnameState
```

Manual verification:

1. Open `/app1/opname`.
2. Delete a room and confirm SQL warning copy appears.
3. Confirm deleted room disappears only from current kertas kerja.
4. Open `+ Ruangan dari SQL`.
5. Select `NAMA_RUANGAN`.
6. Select `ICT`.
7. Confirm preview includes `CREATE_USER` ICT rows, excludes ENG/HRGA rows, and puts unknown rows in review.
8. Resolve review rows.
9. Import.
10. Confirm new room name ends with `— ICT`.
11. Confirm all imported assets are unchecked.
12. Confirm PDF/sync/save still read room normally.

---

## Acceptance Criteria

- User can remove a room from kertas kerja without SQL mutation.
- Delete confirmation clearly says server SQL is unchanged.
- User can create a room from SQL `NAMA_RUANGAN` dropdown.
- User can choose only one category per create.
- `CREATE_USER` determines owner category: ICT, ENG, HRD/HRGA.
- Unknown `CREATE_USER` rows require manual review.
- Keyword ambiguity creates warning, not owner override.
- Only included assets for selected category enter kertas kerja.
- Imported assets start unchecked.
- SQL endpoints are read-only and parameterized.
- Build/tests pass before implementation is marked complete.
