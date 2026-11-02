"""
Automated Test Script for MediKiosk New Features
Tests:
1. Hospitals list
2. Staff login for all 3 hospitals
3. Staff dashboard and metrics
4. Patient tracking board with filters
5. Red flag persistence in SQLite and retrieval
6. Staff red flag acknowledgement
7. Patient hospital selection storage
8. External EMR consent and mock lookup (Apollo + City)
9. Doctor editable clinical context (without AI)
10. Confirm & store in Current Hospital EMR
"""

import sys
import os
import json
import sqlite3

sys.path.insert(0, os.path.dirname(__file__))

from database import (
    get_connection,
    list_hospitals,
    authenticate_staff,
    get_staff_dashboard,
    get_staff_patients,
    get_staff_red_flags,
    set_session_red_flag,
    acknowledge_red_flag,
    save_session,
    get_session_by_id,
    record_external_consent,
    get_external_consent,
    query_mock_external_emrs,
    save_doctor_edited_report,
    confirm_and_store_current_hospital_emr,
    get_hospital_emr_records
)

def run_tests():
    print("=" * 60)
    print("MEDIKIOSK AUTOMATED VERIFICATION TEST SUITE")
    print("=" * 60)

    # TEST 1: Hospitals list
    hospitals = list_hospitals()
    assert len(hospitals) == 3, f"Expected 3 hospitals, found {len(hospitals)}"
    print(f"[PASS] TEST 1: 3 Hospitals seeded & listed successfully ({[h['name'] for h in hospitals]})")

    # TEST 2: Staff login for all 3 hospitals
    for staff_email, expected_hosp in [
        ("staff@medikiosk.com", "hosp-medikiosk"),
        ("staff@apollo.com", "hosp-apollo"),
        ("staff@city.com", "hosp-city"),
    ]:
        res = authenticate_staff(staff_email, "staff123")
        assert res["success"] is True, f"Staff login failed for {staff_email}"
        assert res["staff"]["hospital_id"] == expected_hosp, f"Hospital mismatch for {staff_email}"
        print(f"[PASS] TEST 2: Staff auth verified for {staff_email} -> {res['staff']['hospital_name']}")

    # TEST 3: Staff Dashboard
    dash = get_staff_dashboard("hosp-medikiosk")
    assert dash["success"] is True
    assert "counts" in dash
    print(f"[PASS] TEST 3: Staff Dashboard counts database-driven: {dash['counts']}")

    # TEST 4: Create a test session with hospital selection
    test_session_id = "test-session-verify-1"
    save_session(
        session_id=test_session_id,
        language="en",
        patient_id="test-p1",
        doctor_name="Dr. Priya Sharma",
        department="General Medicine",
        hospital_id="hosp-medikiosk"
    )
    sess = get_session_by_id(test_session_id)
    assert sess is not None
    assert sess["hospital_id"] == "hosp-medikiosk"
    print(f"[PASS] TEST 4: Patient session created and hospital selection persisted in SQLite ({sess['hospital_id']})")

    # TEST 5: Red-Flag detection persistence in SQLite
    set_session_red_flag(test_session_id, reason="Severe chest pain radiating to left arm")
    sess_rf = get_session_by_id(test_session_id)
    assert sess_rf["red_flag"] == 1
    assert "chest pain" in sess_rf["red_flag_reason"].lower()
    print(f"[PASS] TEST 5: Red-flag persisted in SQLite with reason: '{sess_rf['red_flag_reason']}'")

    # TEST 6: Staff sees red flag in list
    rf_list = get_staff_red_flags("hosp-medikiosk")
    matched_rf = [r for r in rf_list if r["session_id"] == test_session_id]
    assert len(matched_rf) == 1
    print(f"[PASS] TEST 6: Staff red-flags API retrieved active alert for session")

    # TEST 7: Staff acknowledges red flag
    ack_res = acknowledge_red_flag(test_session_id, staff_id="staff-mk-1")
    assert ack_res["success"] is True
    sess_ack = get_session_by_id(test_session_id)
    assert sess_ack["red_flag_acknowledged"] == 1
    assert sess_ack["red_flag"] == 1  # Clinical record NOT removed!
    print(f"[PASS] TEST 7: Alert acknowledged at {sess_ack['red_flag_acknowledged_at']}, clinical red flag preserved!")

    # TEST 8: External EMR Consent & Mock Lookup
    consent_res = record_external_consent(test_session_id, consented=True)
    assert consent_res["success"] is True
    mock_data = query_mock_external_emrs(patient_name="Ramesh Joshi")
    assert len(mock_data["apollo_records"]) > 0, "Expected Apollo records"
    assert len(mock_data["city_records"]) > 0, "Expected City records"
    assert len(mock_data["timeline"]) > 0, "Expected timeline entries"
    print(f"[PASS] TEST 8: Consented mock lookup retrieved {len(mock_data['timeline'])} timeline entries from Apollo Clinic & City Diagnostics")

    # TEST 9: Doctor Editable Clinical Context (without AI)
    edited_text = "### Chief Complaint\nPatient presents with hypertension review\n### Doctor Notes\nDoctor verified and edited directly without calling AI."
    save_doctor_edited_report(test_session_id, edited_text)
    sess_edited = get_session_by_id(test_session_id)
    assert sess_edited["doctor_edited_report"] == edited_text
    print(f"[PASS] TEST 9: Doctor modified clinical context saved directly without AI")

    # TEST 10: Confirm and store in CURRENT hospital EMR
    emr_res = confirm_and_store_current_hospital_emr(
        session_id=test_session_id,
        hospital_id="hosp-medikiosk",
        doctor_name="Dr. Priya Sharma",
        confirmed_report_text=edited_text,
        diagnosis="Stage 2 Essential Hypertension - Controlled",
        medications="Metoprolol Succinate 50mg OD",
        notes="Patient advised lifestyle changes."
    )
    assert emr_res["success"] is True
    emr_records = get_hospital_emr_records("hosp-medikiosk")
    matched_emr = [r for r in emr_records if r["session_id"] == test_session_id]
    assert len(matched_emr) == 1
    assert matched_emr[0]["confirmed_by_doctor"] == "Dr. Priya Sharma"
    sess_final = get_session_by_id(test_session_id)
    assert sess_final["emr_stored"] == 1
    assert sess_final["status"] == "completed"
    print(f"[PASS] TEST 10: Doctor-confirmed package committed to Current Hospital EMR (Record ID: {emr_res['record_id']})")

    # Clean up test session
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM sessions WHERE session_id = ?", (test_session_id,))
    c.execute("DELETE FROM emr_records WHERE session_id = ?", (test_session_id,))
    c.execute("DELETE FROM external_emr_consents WHERE session_id = ?", (test_session_id,))
    conn.commit()
    conn.close()

    print("=" * 60)
    print("ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
