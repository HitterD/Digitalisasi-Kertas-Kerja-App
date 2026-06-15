# Manual Test Runbook: Upstream Resilience

**Tujuan:** Verifikasi app server (port 5181) tetap responsif dan auto-recover saat 192.168.2.111 mati/restart/hang.

**Lingkungan:** Production atau staging dengan MSSQL + SMB share di 192.168.2.111.

---

## Prasyarat

1. App server berjalan di port 5181.
2. Environment file `.env` sudah ada kredensial MSSQL + SMB yang valid.
3. Client (browser atau `curl`) bisa akses ke `http://<server-ip>:5181/`.

---

## Test 1: SQL Server mati

**Langkah:**

1. Catat waktu mulai.
2. Matikan service MSSQL di 192.168.2.111 (atau block port 1433 via firewall).
3. Tunggu 5 detik.
4. Hit endpoint status:
   ```bash
   curl -i http://<server-ip>:5181/api/db/status
   ```
5. Hit endpoint master-assets:
   ```bash
   curl -i http://<server-ip>:5181/api/db/master-assets | head -5
   ```
6. Nyalakan lagi MSSQL.
7. Tunggu 35 detik (1 probe cycle).
8. Hit lagi `curl -i http://<server-ip>:5181/api/db/status`.

**Expected:**

- Step 4: HTTP 503 dengan body `{"success":false,"code":"UPSTREAM_OPEN","retryAfter":N}`. Response time <1 detik.
- Step 5: HTTP 503 sama. Response time <1 detik.
- Step 8: HTTP 200 dengan `connected: true`.

---

## Test 2: SMB share mati

**Langkah:**

1. Matikan network share di 192.168.2.111 (atau block port 445).
2. Tunggu 5 detik.
3. Hit endpoint folders:
   ```bash
   curl -i http://<server-ip>:5181/api/files/folders
   ```
4. Nyalakan lagi share.
5. Tunggu 35 detik.
6. Hit lagi.

**Expected:**

- Step 3: HTTP 503. Response time <1 detik.
- Step 6: HTTP 200 dengan list folders.

---

## Test 3: App server responsiveness saat upstream down

**Langkah:**

1. Matikan MSSQL.
2. Dari terminal lain, hit endpoint unrelated:
   ```bash
   time curl -i http://<server-ip>:5181/
   ```
3. Ulangi beberapa kali.

**Expected:**

- Response time konsisten. App server tidak hang atau crash.

---

## Test 4: Inspek circuit state

**Langkah:**

```bash
curl http://<server-ip>:5181/api/upstream/status | python -m json.tool
```

**Expected saat MSSQL up:**

```json
{
  "sql": { "state": "CLOSED", "failureCount": 0, ... },
  "smb": { "state": "CLOSED", "failureCount": 0, ... }
}
```

**Expected saat MSSQL down >30 detik:**

```json
{
  "sql": { "state": "OPEN", "failureCount": 3, "openedAt": "..." },
  "smb": { "state": "CLOSED", ... }
}
```

---

## Catatan

- Jika response time >1 detik di step 4/5, cek log server untuk error.
- Jika step 8 masih 503 setelah >60 detik, restart app server (bug — laporkan).
- Probe loop jalan tiap 30 detik. Tunggu minimal 35 detik untuk konfirmasi recovery.
