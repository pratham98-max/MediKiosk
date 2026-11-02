# DATABASE BACKUP, RESTORE & DISASTER RECOVERY
## MediKiosk + Patient Care Integrated Healthcare Platform
**Document Version:** 1.0  
**Date:** November 2, 2026  

---

## 1. Database Identification & Storage Locations

The integrated application utilizes a single SQLite 3 database operating in **Write-Ahead Logging (WAL)** mode:

| File | Purpose | Location |
| :--- | :--- | :--- |
| **Primary SQLite Database** | All 18 relational application tables | `backend/medikiosk.db` |
| **Write-Ahead Log (WAL)** | Concurrent uncommitted/committed write pages | `backend/medikiosk.db-wal` |
| **Shared Memory Index (SHM)** | Index for WAL reader/writer coordination | `backend/medikiosk.db-shm` |
| **Backup Directory** | Timestamped offline and online backups | `backend/backups/` |

> [!CAUTION]
> In WAL mode, uncheckpointed write transactions reside in `medikiosk.db-wal`. Never copy `medikiosk.db` alone without performing a WAL checkpoint, or data corruption / lost transactions will occur!

---

## 2. Standard Online Backup Procedure

The recommended backup approach uses SQLite's native online backup API, which safely checkpoints the WAL log and creates a consistent snapshot without locking the live database:

### Automated Backup Command
Run the verified backup script from the `backend/` directory:
```bash
python test_backup_restore.py
```

### Python Programmatic Backup Script
To take a manual snapshot at any time:
```python
import sqlite3
import os
from datetime import datetime

src_db = "backend/medikiosk.db"
backup_dir = "backend/backups"
os.makedirs(backup_dir, exist_ok=True)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_path = os.path.join(backup_dir, f"medikiosk_backup_{timestamp}.db")

# 1. Checkpoint WAL and copy pages atomically
src_conn = sqlite3.connect(src_db)
src_conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
dst_conn = sqlite3.connect(backup_path)
src_conn.backup(dst_conn)
dst_conn.close()
src_conn.close()

# 2. Verify integrity
check_conn = sqlite3.connect(backup_path)
status = check_conn.cursor().execute("PRAGMA integrity_check").fetchone()[0]
check_conn.close()
assert status == "ok", f"Backup corrupted: {status}"
print(f"Verified Backup Created: {backup_path}")
```

---

## 3. Safe Database Restore Procedure

To restore a previous backup without risking data loss:

### Step 1: Terminate Live Application
Stop all instances of the FastAPI backend (`uvicorn`) to release active file locks.

### Step 2: Archive the Current (Defective) Database
Never overwrite the current database in-place:
```bash
# Windows PowerShell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Move-Item "backend/medikiosk.db" "backend/backups/medikiosk_pre_restore_$ts.db"
Remove-Item "backend/medikiosk.db-wal" -ErrorAction SilentlyContinue
Remove-Item "backend/medikiosk.db-shm" -ErrorAction SilentlyContinue
```

### Step 3: Copy Backup into Production
```bash
Copy-Item "backend/backups/medikiosk_backup_YYYYMMDD_HHMMSS.db" "backend/medikiosk.db"
```

### Step 4: Verify Restored Database
```bash
python -c "
import sqlite3
conn = sqlite3.connect('backend/medikiosk.db')
cur = conn.cursor()
cur.execute('PRAGMA integrity_check')
print('Integrity:', cur.fetchone()[0])
cur.execute('PRAGMA journal_mode = wal')
print('Journal Mode:', cur.fetchone()[0])
conn.close()
"
```

### Step 5: Restart Backend & Verify Regressions
```bash
python test_patient_care_backend.py
```

---

## 4. Database Migration Safety & Verification

When schema changes or new tables are added:
1. **Pre-Migration Snapshot:** Always create a timestamped backup before executing `ALTER TABLE` or `CREATE TABLE`.
2. **Idempotent Column Additions:** All column additions in `backend/database.py` check `PRAGMA table_info` before adding columns, preventing `duplicate column name` exceptions:
   ```python
   cursor.execute("PRAGMA table_info(patients)")
   columns = [col[1] for col in cursor.fetchall()]
   if "hospital_id" not in columns:
       cursor.execute("ALTER TABLE patients ADD COLUMN hospital_id TEXT DEFAULT 'hosp-medikiosk'")
   ```
3. **Rollback Contingency:** If migration fails midway, restore the pre-migration snapshot following Section 3.

---

## 5. Multi-User Production Strategy (PostgreSQL Migration Roadmap)

While SQLite with WAL mode is verified for single-server kiosks, multi-region hospital networks requiring horizontal scaling should migrate to **PostgreSQL 15+**:

1. **Schema Equivalency:** All 18 SQLite schemas use standard SQL types (`TEXT`, `INTEGER`, `REAL`, `TIMESTAMP`).
2. **Identity & Constraints:** Replace `INTEGER PRIMARY KEY AUTOINCREMENT` with `BIGSERIAL PRIMARY KEY`.
3. **Driver Layer:** Switch `database.py` connection factory from `sqlite3.connect()` to `asyncpg` or `psycopg3` connection pool.
4. **Data Export/Import:** Export SQLite data to CSV or JSON lines using `backend/test_database_backup_restore.py` and load via PostgreSQL `COPY` commands.
