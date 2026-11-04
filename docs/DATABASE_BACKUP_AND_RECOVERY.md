# DATABASE BACKUP, RESTORE & DISASTER RECOVERY

**System:** MediKiosk + Patient Care Integrated Healthcare Platform  
**Document Version:** 2.0 (Phase 4 Verified)  
**Date:** November 2026  
**Status:** FULLY VERIFIED (PRAGMA integrity_check: OK, PRAGMA foreign_key_check: OK, WAL Mode Active)

---

## 1. Database Identification & Storage Locations

The application operates on a single SQLite 3 database configured with **Write-Ahead Logging (WAL)**:

| File / Component | Purpose | Location |
| :--- | :--- | :--- |
| **Primary SQLite Database** | 17 relational application tables | `backend/medikiosk.db` |
| **Write-Ahead Log (WAL)** | Concurrent uncheckpointed transaction pages | `backend/medikiosk.db-wal` |
| **Shared Memory Index (SHM)** | Lock index for concurrent readers/writers | `backend/medikiosk.db-shm` |
| **Backups Directory** | Timestamped consistent database snapshots | `backend/backups/` |

> [!IMPORTANT]
> Because SQLite operates in WAL mode, active transactions may reside in `medikiosk.db-wal`. Never perform a file copy of `medikiosk.db` directly without issuing a WAL checkpoint, or data inconsistency will occur.

---

## 2. Verified Database Health Checks

Run these commands from `backend/` to verify database health:

```bash
# Verify Integrity and Journal Mode
python -c "import sqlite3; conn = sqlite3.connect('medikiosk.db'); print('Integrity Check:', conn.execute('PRAGMA integrity_check;').fetchall()); print('Foreign Key Check:', conn.execute('PRAGMA foreign_key_check;').fetchall()); print('Journal Mode:', conn.execute('PRAGMA journal_mode;').fetchall()); conn.close()"
```

**Expected Production Output:**
```
Integrity Check: [('ok',)]
Foreign Key Check: []
Journal Mode: [('wal',)]
```

---

## 3. Standard Online Backup Procedure

The recommended backup approach uses SQLite's native online backup API (`conn.backup()`), which safely checkpoints the WAL log and creates a consistent snapshot without blocking read operations:

### Automated Backup Execution
Run the automated verification and backup script from `backend/`:
```bash
python test_backup_restore.py
```

### Python Programmatic Backup Implementation
```python
import sqlite3
import os
from datetime import datetime

src_db = "medikiosk.db"
backup_dir = "backups"
os.makedirs(backup_dir, exist_ok=True)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_path = os.path.join(backup_dir, f"medikiosk_backup_{timestamp}.db")

# 1. Truncate WAL checkpoint to ensure all committed pages are flushed
src_conn = sqlite3.connect(src_db)
src_conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")

# 2. Perform atomic online backup
dst_conn = sqlite3.connect(backup_path)
src_conn.backup(dst_conn)
dst_conn.close()
src_conn.close()

# 3. Verify backup integrity
check_conn = sqlite3.connect(backup_path)
status = check_conn.cursor().execute("PRAGMA integrity_check").fetchone()[0]
check_conn.close()
assert status == "ok", f"Backup corrupted: {status}"
print(f"Verified Backup Successfully Created: {backup_path}")
```

---

## 4. Disaster Recovery & Restoration Procedure

To restore a previous backup snapshot safely:

### Step 1: Stop Live Application Services
Stop all instances of the FastAPI backend (`uvicorn`) to release active file handles:
```powershell
# Windows
Stop-Process -Name "python" -Force

# Linux
sudo systemctl stop medikiosk-backend
```

### Step 2: Quarantine Current Database
Never delete or overwrite the defective database directly. Move it to an isolation quarantine:
```powershell
# Windows PowerShell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Move-Item "medikiosk.db" "backups/medikiosk_quarantine_$ts.db"
Remove-Item "medikiosk.db-wal" -ErrorAction SilentlyContinue
Remove-Item "medikiosk.db-shm" -ErrorAction SilentlyContinue
```

```bash
# Linux
ts=$(date +"%Y%m%d_%H%M%S")
mv medikiosk.db "backups/medikiosk_quarantine_${ts}.db"
rm -f medikiosk.db-wal medikiosk.db-shm
```

### Step 3: Copy Verified Backup into Production
```powershell
# Windows PowerShell
Copy-Item "backups/medikiosk_backup_20261104_234134.db" "medikiosk.db"
```

```bash
# Linux
cp "backups/medikiosk_backup_YYYYMMDD_HHMMSS.db" "medikiosk.db"
```

### Step 4: Verify Restored Database
```bash
python -c "
import sqlite3
conn = sqlite3.connect('medikiosk.db')
cur = conn.cursor()
cur.execute('PRAGMA integrity_check')
print('Integrity:', cur.fetchone()[0])
cur.execute('PRAGMA foreign_key_check')
print('Foreign Keys:', cur.fetchall())
cur.execute('PRAGMA journal_mode = wal')
print('Journal Mode:', cur.fetchone()[0])
conn.close()
"
```

### Step 5: Restart Application Services
```powershell
# Windows
& ".\.venv\Scripts\uvicorn.exe" app.main:app --host 127.0.0.1 --port 8000
```

```bash
# Linux
sudo systemctl start medikiosk-backend
```

---

## 5. Verification Test Evidence

Execution of `test_backup_restore.py` verified the following results:
```
==================================================
DATABASE BACKUP AND RESTORE VERIFICATION
==================================================
[PASS] Source DB: medikiosk.db
[PASS] Backup created: backups/medikiosk_backup_20261104_234134.db
[PASS] Backup integrity check: ok
[PASS] Verified tables count: 17
[PASS] Verified patient records: 44
[PASS] Verified bed inventory: 27
[PASS] Isolated restore integrity check: ok
[PASS] Restored patient record count: 44
==================================================
ALL BACKUP & RESTORATION PROCEDURES VERIFIED!
==================================================
```
