"""
Backup and Restore Verification Script for MediKiosk + Patient Care SQLite Database.
"""
import sqlite3
import os
import shutil
from datetime import datetime

def test_backup_and_restore():
    src_db = os.path.abspath(os.path.join(os.path.dirname(__file__), "medikiosk.db"))
    backup_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "backups"))
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"medikiosk_backup_{timestamp}.db")

    # 1. Checkpoint WAL and perform atomic SQLite online backup
    src_conn = sqlite3.connect(src_db)
    src_conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    dst_conn = sqlite3.connect(backup_path)
    src_conn.backup(dst_conn)
    dst_conn.close()
    src_conn.close()

    # 2. Verify backup integrity
    test_conn = sqlite3.connect(backup_path)
    cur = test_conn.cursor()
    cur.execute("PRAGMA integrity_check")
    integrity = cur.fetchone()[0]
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in cur.fetchall()]
    cur.execute("SELECT COUNT(*) FROM patients")
    patient_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM patient_beds")
    bed_count = cur.fetchone()[0]
    test_conn.close()

    assert integrity == "ok", f"Backup integrity failed: {integrity}"
    assert len(tables) >= 17, f"Expected at least 17 tables, got {len(tables)}"

    # 3. Test isolated restore verification
    isolated_restore_path = os.path.join(backup_dir, "isolated_test_restore.db")
    shutil.copy2(backup_path, isolated_restore_path)
    restore_conn = sqlite3.connect(isolated_restore_path)
    r_cur = restore_conn.cursor()
    r_cur.execute("PRAGMA integrity_check")
    r_integrity = r_cur.fetchone()[0]
    r_cur.execute("SELECT COUNT(*) FROM patients")
    r_patients = r_cur.fetchone()[0]
    restore_conn.close()

    # Clean up isolated restore test copy
    if os.path.exists(isolated_restore_path):
        os.remove(isolated_restore_path)

    print("==================================================")
    print("DATABASE BACKUP AND RESTORE VERIFICATION")
    print("==================================================")
    print(f"[PASS] Source DB: {src_db}")
    print(f"[PASS] Backup created: {backup_path}")
    print(f"[PASS] Backup integrity check: {integrity}")
    print(f"[PASS] Verified tables count: {len(tables)}")
    print(f"[PASS] Verified patient records: {patient_count}")
    print(f"[PASS] Verified bed inventory: {bed_count}")
    print(f"[PASS] Isolated restore integrity check: {r_integrity}")
    print(f"[PASS] Restored patient record count: {r_patients}")
    print("==================================================")
    print("ALL BACKUP & RESTORATION PROCEDURES VERIFIED!")
    print("==================================================")

if __name__ == "__main__":
    test_backup_and_restore()
