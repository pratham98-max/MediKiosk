"""
Automated Comprehensive Test Suite: MediKiosk + Patient Care Backend Integration
================================================================================
Validates:
- Group A: MediKiosk Baseline Regressions (MK-REG-01 to MK-REG-10)
- Group B: Patient Care Capabilities (PC-BE-01 to PC-BE-28)
- Group C: Cross-System Integration & Clinical Rule Compliance (MK-INT-01 to MK-INT-04)
"""

import os
import sys
import uuid
from datetime import datetime

# Configure path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
import database

client = TestClient(app)

results = {
    "passed": 0,
    "failed": 0,
    "total": 0,
    "details": []
}

def record_test(test_id: str, description: str, passed: bool, notes: str = ""):
    results["total"] += 1
    if passed:
        results["passed"] += 1
        status_str = "[PASS]"
    else:
        results["failed"] += 1
        status_str = "[FAIL]"
    
    print(f"{status_str} {test_id}: {description} {f'({notes})' if notes else ''}")
    results["details"].append({
        "id": test_id,
        "description": description,
        "status": "PASS" if passed else "FAIL",
        "notes": notes
    })


def run_all_tests():
    print("=" * 80)
    print("PHASE 2 BACKEND VERIFICATION: MEDIKIOSK + PATIENT CARE INTEGRATION")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # GROUP A: MEDIKIOSK BASELINE REGRESSIONS (MK-REG-01 to MK-REG-10)
    # -------------------------------------------------------------------------
    print("\n--- GROUP A: MEDIKIOSK REGRESSION SUITE ---")

    # MK-REG-01: Hospitals list
    try:
        hospitals = database.list_hospitals()
        hosp_ids = [h["hospital_id"] for h in hospitals]
        pass_cond = (len(hospitals) >= 3 and "hosp-medikiosk" in hosp_ids)
        record_test("MK-REG-01", "Hospitals list retrieval (3 seeded hospitals)", pass_cond, f"{len(hospitals)} found")
    except Exception as e:
        record_test("MK-REG-01", "Hospitals list retrieval", False, str(e))

    # MK-REG-02: Staff authentication for all 3 hospitals
    try:
        auth_passes = True
        for email, exp_hosp in [
            ("staff@medikiosk.com", "hosp-medikiosk"),
            ("staff@apollo.com", "hosp-apollo"),
            ("staff@city.com", "hosp-city")
        ]:
            auth_res = database.authenticate_staff(email, "staff123")
            if not auth_res.get("success") or auth_res["staff"]["hospital_id"] != exp_hosp:
                auth_passes = False
                break
        record_test("MK-REG-02", "Staff authentication across all 3 hospitals", auth_passes, "Validated 3/3 accounts")
    except Exception as e:
        record_test("MK-REG-02", "Staff authentication across all 3 hospitals", False, str(e))

    # MK-REG-03: Staff dashboard metrics
    try:
        dash = database.get_staff_dashboard("hosp-medikiosk")
        counts = dash.get("counts", {})
        pass_cond = dash.get("success") and "total" in counts and "red_flag" in counts
        record_test("MK-REG-03", "Staff dashboard patient census metrics", pass_cond, f"Total patients: {counts.get('total')}")
    except Exception as e:
        record_test("MK-REG-03", "Staff dashboard patient census metrics", False, str(e))

    # MK-REG-04: Staff patient tracking board with filtering
    try:
        all_patients = database.get_staff_patients("hosp-medikiosk", "all")
        red_flag_patients = database.get_staff_patients("hosp-medikiosk", "red_flag")
        pass_cond = isinstance(all_patients, list) and isinstance(red_flag_patients, list)
        record_test("MK-REG-04", "Staff patient tracking board with status filters", pass_cond, f"Census: {len(all_patients)}")
    except Exception as e:
        record_test("MK-REG-04", "Staff patient tracking board with status filters", False, str(e))

    # MK-REG-05: Red flag persistence in SQLite
    test_session_id = f"test-sess-{uuid.uuid4().hex[:8]}"
    test_email = f"aarav_{uuid.uuid4().hex[:6]}@example.com"
    test_phone = f"98{uuid.uuid4().int % 100000000:08d}"
    test_pat_id = f"test-pat-{uuid.uuid4().hex[:8]}"
    try:
        # Register a patient & session
        reg_res = database.register_patient(
            full_name="Aarav Sharma",
            email=test_email,
            phone=test_phone,
            age=48,
            gender="male",
            password="testpass123"
        )
        if reg_res.get("success"):
            test_pat_id = reg_res["patient"]["patient_id"]
        
        database.save_session(
            session_id=test_session_id,
            language="en",
            patient_id=test_pat_id,
            doctor_name="Dr. Mehta",
            department="General Medicine",
            hospital_id="hosp-medikiosk"
        )
        # Set red flag
        rf_res = database.set_session_red_flag(test_session_id, "Chest pain radiating to left arm with diaphoresis")
        sess = database.get_session_by_id(test_session_id)
        pass_cond = (sess.get("red_flag") == 1 and "Chest pain" in sess.get("red_flag_reason", ""))
        record_test("MK-REG-05", "Red flag persistence in SQLite session record", pass_cond, sess.get("red_flag_reason", "")[:35])
    except Exception as e:
        record_test("MK-REG-05", "Red flag persistence in SQLite session record", False, str(e))

    # MK-REG-06: Staff red flag acknowledgement
    try:
        database.acknowledge_red_flag(test_session_id, "Nurse Sunita")
        sess_ack = database.get_session_by_id(test_session_id)
        pass_cond = (sess_ack.get("red_flag_acknowledged") == 1)
        record_test("MK-REG-06", "Staff red flag acknowledgement workflow", pass_cond, "Acknowledged flag = 1")
    except Exception as e:
        record_test("MK-REG-06", "Staff red flag acknowledgement workflow", False, str(e))

    # MK-REG-07: Patient registration and auth verification
    try:
        auth_res = database.authenticate_patient(test_phone, "testpass123")
        pass_cond = (auth_res.get("success") is True and auth_res["patient"]["patient_id"] == test_pat_id)
        record_test("MK-REG-07", "Patient registration and phone/password authentication", pass_cond, f"Patient: {test_pat_id}")
    except Exception as e:
        record_test("MK-REG-07", "Patient registration and phone/password authentication", False, str(e))

    # MK-REG-08: External EMR consent and mock lookup
    try:
        database.record_external_consent(test_session_id, True)
        consent = database.get_external_consent(test_session_id)
        emr_results = database.query_mock_external_emrs("Ramesh Joshi", test_pat_id)
        pass_cond = (consent.get("consented") == 1 and emr_results.get("total_records", 0) >= 1)
        record_test("MK-REG-08", "External EMR consent recording and mock lookup", pass_cond, f"{emr_results.get('total_records')} records found")
    except Exception as e:
        record_test("MK-REG-08", "External EMR consent recording and mock lookup", False, str(e))

    # MK-REG-09: Doctor editable clinical context (without AI)
    try:
        edited_text = "Updated clinical context: Patient reports mild angina relieved by rest. ECG ordered."
        database.save_doctor_edited_report(test_session_id, edited_text)
        sess_edit = database.get_session_by_id(test_session_id)
        pass_cond = (sess_edit.get("doctor_edited_report") == edited_text)
        record_test("MK-REG-09", "Doctor editable clinical context persistence (zero AI call)", pass_cond, "Preserved final doctor edit")
    except Exception as e:
        record_test("MK-REG-09", "Doctor editable clinical context persistence", False, str(e))

    # MK-REG-10: Confirm & store in Current Hospital EMR
    try:
        conf_res = database.confirm_and_store_current_hospital_emr(
            session_id=test_session_id,
            hospital_id="hosp-medikiosk",
            doctor_name="Dr. Mehta",
            confirmed_report_text="Confirmed: Stable Angina. Low dose aspirin initiated.",
            diagnosis="Stable Angina",
            medications="Aspirin 75mg OD",
            lab_results="Troponin-T Negative",
            notes="Follow up in 2 weeks"
        )
        emr_records = database.get_hospital_emr_records("hosp-medikiosk", limit=5)
        found_rec = any(r["session_id"] == test_session_id for r in emr_records)
        pass_cond = (conf_res.get("success") is True and found_rec)
        record_test("MK-REG-10", "Commit finalized encounter into hospital EMR records", pass_cond, f"Record: {conf_res.get('record_id')}")
    except Exception as e:
        record_test("MK-REG-10", "Commit finalized encounter into hospital EMR records", False, str(e))

    # -------------------------------------------------------------------------
    # GROUP B: PATIENT CARE MODULE CAPABILITIES (PC-BE-01 to PC-BE-28)
    # -------------------------------------------------------------------------
    print("\n--- GROUP B: PATIENT CARE CAPABILITIES ---")

    # Reset hospital bed occupancies for clean idempotent test execution
    conn = database.get_connection()
    conn.execute("UPDATE patient_beds SET status = 'vacant', patient_id = NULL, session_id = NULL WHERE hospital_id = 'hosp-medikiosk'")
    conn.commit()
    conn.close()

    # PC-BE-01: Ward and bed inventory retrieval
    try:
        resp = client.get("/staff/patient-care/beds?hospital_id=hosp-medikiosk")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("total_beds", 0) >= 9)
        record_test("PC-BE-01", "Ward bed inventory retrieval (2 ICU + 7 General)", pass_cond, f"{data.get('total_beds')} beds configured")
    except Exception as e:
        record_test("PC-BE-01", "Ward bed inventory retrieval", False, str(e))

    # PC-BE-02: Bed assignment to patient
    try:
        resp = client.post(
            f"/staff/patient-care/patients/{test_pat_id}/bed?hospital_id=hosp-medikiosk",
            json={"bed_number": "GEN-101", "session_id": test_session_id, "staff_id": "staff-mk-1"}
        )
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("success") is True and data.get("bed_number") == "GEN-101")
        record_test("PC-BE-02", "Assign vacant general bed to patient", pass_cond, "GEN-101 assigned")
    except Exception as e:
        record_test("PC-BE-02", "Assign vacant general bed to patient", False, str(e))

    # PC-BE-03: ICU upgrade execution
    try:
        resp = client.post(f"/staff/patient-care/patients/{test_pat_id}/upgrade-icu?hospital_id=hosp-medikiosk")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("success") is True and "ICU" in data.get("bed_type", ""))
        record_test("PC-BE-03", "Elevate deteriorating patient to ICU bed", pass_cond, f"Assigned: {data.get('bed_number')}")
    except Exception as e:
        record_test("PC-BE-03", "Elevate deteriorating patient to ICU bed", False, str(e))

    # PC-BE-04: Bed optimization algorithm
    try:
        resp = client.post("/staff/patient-care/beds/optimize?hospital_id=hosp-medikiosk")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("success") is True)
        record_test("PC-BE-04", "Intelligent bed reallocation algorithm execution", pass_cond, data.get("message"))
    except Exception as e:
        record_test("PC-BE-04", "Intelligent bed reallocation algorithm execution", False, str(e))

    # PC-BE-05: Patient discharge with stable MEWS
    stable_email = f"pooja_{uuid.uuid4().hex[:6]}@example.com"
    stable_phone = f"97{uuid.uuid4().int % 100000000:08d}"
    stable_pat_res = database.register_patient(
        full_name="Pooja Nair",
        email=stable_email,
        phone=stable_phone,
        age=32,
        gender="female",
        password="pass123"
    )
    stable_pat_id = stable_pat_res["patient"]["patient_id"]
    try:
        # Ensure GEN-102 is vacant before test assignment
        conn = database.get_connection()
        conn.execute("UPDATE patient_beds SET status = 'vacant', patient_id = NULL WHERE hospital_id = 'hosp-medikiosk' AND bed_number = 'GEN-102'")
        conn.commit()
        conn.close()

        # Assign to GEN-102
        client.post(f"/staff/patient-care/patients/{stable_pat_id}/bed", json={"bed_number": "GEN-102"})
        # Record normal vitals (MEWS = 0)
        client.post(f"/staff/patient-care/patients/{stable_pat_id}/vitals", json={
            "heart_rate": 72, "blood_pressure_sys": 120, "respiratory_rate": 16,
            "temperature": 36.6, "oxygen_saturation": 98
        })
        # Discharge
        resp = client.post(f"/staff/patient-care/patients/{stable_pat_id}/discharge")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("success") is True and data.get("freed_bed") == "GEN-102")
        record_test("PC-BE-05", "Discharge patient with stable MEWS (<= 2)", pass_cond, f"Freed bed: {data.get('freed_bed')}")
    except Exception as e:
        record_test("PC-BE-05", "Discharge patient with stable MEWS", False, str(e))

    # PC-BE-06: Patient discharge blocked when MEWS >= 3 without override
    crit_email = f"deepak_{uuid.uuid4().hex[:6]}@example.com"
    crit_phone = f"96{uuid.uuid4().int % 100000000:08d}"
    crit_pat_res = database.register_patient(
        full_name="Deepak Verma",
        email=crit_email,
        phone=crit_phone,
        age=65,
        gender="male",
        password="pass123"
    )
    crit_pat_id = crit_pat_res["patient"]["patient_id"]
    try:
        # Ensure GEN-103 is vacant before test assignment
        conn = database.get_connection()
        conn.execute("UPDATE patient_beds SET status = 'vacant', patient_id = NULL WHERE hospital_id = 'hosp-medikiosk' AND bed_number = 'GEN-103'")
        conn.commit()
        conn.close()

        client.post(f"/staff/patient-care/patients/{crit_pat_id}/bed", json={"bed_number": "GEN-103"})
        # Record critical vitals (MEWS >= 4)
        client.post(f"/staff/patient-care/patients/{crit_pat_id}/vitals", json={
            "heart_rate": 135, "blood_pressure_sys": 85, "respiratory_rate": 28,
            "temperature": 38.9, "oxygen_saturation": 91
        })
        resp = client.post(f"/staff/patient-care/patients/{crit_pat_id}/discharge")
        data = resp.json()
        pass_cond = (resp.status_code == 400 and "Cannot discharge" in data.get("detail", ""))
        record_test("PC-BE-06", "Safety block: Discharge rejected when MEWS >= 3 without override", pass_cond, "Safety guard active")
    except Exception as e:
        record_test("PC-BE-06", "Safety block: Discharge rejected when MEWS >= 3 without override", False, str(e))

    # PC-BE-07: Patient discharge allowed with clinical override flag
    try:
        resp = client.post(f"/staff/patient-care/patients/{crit_pat_id}/discharge?override=true")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("success") is True and data.get("freed_bed") == "GEN-103")
        record_test("PC-BE-07", "Physician override permits discharge for MEWS >= 3", pass_cond, f"Freed bed: {data.get('freed_bed')}")
    except Exception as e:
        record_test("PC-BE-07", "Physician override permits discharge for MEWS >= 3", False, str(e))

    # PC-BE-08: MEWS Normal vitals score = 0
    from app.services.patient_care.mews_service import calculate_mews
    try:
        mews_normal = calculate_mews(heart_rate=75, blood_pressure_sys=120, respiratory_rate=16, temperature=36.7, oxygen_saturation=99)
        pass_cond = (mews_normal["total_score"] == 0 and mews_normal["risk_level"] == "STABLE")
        record_test("PC-BE-08", "MEWS calculation: Normal vital parameters score exactly 0", pass_cond, f"Score: {mews_normal['total_score']}")
    except Exception as e:
        record_test("PC-BE-08", "MEWS calculation: Normal vital parameters score exactly 0", False, str(e))

    # PC-BE-09: MEWS Critically abnormal vitals score >= 7
    try:
        mews_crit = calculate_mews(heart_rate=140, blood_pressure_sys=65, respiratory_rate=32, temperature=39.2, oxygen_saturation=88)
        pass_cond = (mews_crit["total_score"] >= 7 and mews_crit["risk_level"] == "CRITICAL")
        record_test("PC-BE-09", "MEWS calculation: Critically abnormal parameters score >= 7 (CRITICAL)", pass_cond, f"Score: {mews_crit['total_score']}")
    except Exception as e:
        record_test("PC-BE-09", "MEWS calculation: Critically abnormal parameters score >= 7", False, str(e))

    # PC-BE-10: MEWS Clinical breakdown and parameter explanations present
    try:
        p_scores = mews_crit.get("parameter_scores", {})
        has_breakdown = len(mews_crit.get("breakdown", [])) >= 5
        pass_cond = ("heart_rate" in p_scores and "blood_pressure_sys" in p_scores and has_breakdown)
        record_test("PC-BE-10", "MEWS parameter breakdown and clinical explanation transparency", pass_cond, f"{len(mews_crit.get('breakdown', []))} lines")
    except Exception as e:
        record_test("PC-BE-10", "MEWS parameter breakdown and clinical explanation", False, str(e))

    # PC-BE-11: MEWS Partial observation handling without crash
    try:
        mews_partial = calculate_mews(heart_rate=80, blood_pressure_sys=None, respiratory_rate=18, temperature=None, oxygen_saturation=97)
        pass_cond = (mews_partial.get("is_partial") is True and len(mews_partial.get("missing_parameters", [])) == 2)
        record_test("PC-BE-11", "MEWS partial observation safe handling without unhandled exception", pass_cond, f"Missing: {mews_partial.get('missing_parameters')}")
    except Exception as e:
        record_test("PC-BE-11", "MEWS partial observation safe handling", False, str(e))

    # PC-BE-12: Subbe 2001 heart rate clinical rule verification (Bug fix validation)
    try:
        from app.services.patient_care.mews_service import score_heart_rate
        # Subbe standard: 51-100 bpm is 0 points; 101-110 is +1; 40-50 / 111-130 is +2; <40 / >130 is +3
        s_75, _ = score_heart_rate(75)
        s_105, _ = score_heart_rate(105)
        s_45, _ = score_heart_rate(45)
        s_125, _ = score_heart_rate(125)
        s_135, _ = score_heart_rate(135)
        s_35, _ = score_heart_rate(35)
        pass_cond = (s_75 == 0 and s_105 == 1 and s_45 == 2 and s_125 == 2 and s_135 == 3 and s_35 == 3)
        record_test("PC-BE-12", "Subbe et al. (2001) heart rate scoring verified (zero false +1 on normal HR)", pass_cond, "75bpm=0, 105bpm=1, 45bpm=2, 135bpm=3")
    except Exception as e:
        record_test("PC-BE-12", "Subbe et al. (2001) heart rate scoring verified", False, str(e))

    # PC-BE-13: 6-factor discharge readiness assessment logic
    from app.services.patient_care.mews_service import assess_discharge_readiness
    try:
        ready_eval = assess_discharge_readiness(heart_rate=72, blood_pressure_sys=120, respiratory_rate=16, temperature=36.8, oxygen_saturation=98, mews_score=0)
        not_ready_eval = assess_discharge_readiness(heart_rate=115, blood_pressure_sys=155, respiratory_rate=24, temperature=38.6, oxygen_saturation=92, mews_score=5)
        pass_cond = (ready_eval["ready"] is True and not_ready_eval["ready"] is False and ready_eval["total_criteria"] == 6)
        record_test("PC-BE-13", "6-point physiological discharge readiness evaluation", pass_cond, "All 6 criteria validated")
    except Exception as e:
        record_test("PC-BE-13", "6-point physiological discharge readiness evaluation", False, str(e))

    # PC-BE-14: Vitals recording records observation source and timestamp (Rule 10)
    try:
        resp = client.post(f"/staff/patient-care/patients/{test_pat_id}/vitals", json={
            "heart_rate": 82, "blood_pressure_sys": 128, "blood_pressure_dia": 82,
            "respiratory_rate": 18, "temperature": 37.0, "oxygen_saturation": 97,
            "observation_source": "bedside_manual", "staff_id": "staff-mk-1"
        })
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("observation_source") == "bedside_manual" and bool(data.get("recorded_at")))
        record_test("PC-BE-14", "Vitals recording preserves observation source and ISO timestamp (Rule 10)", pass_cond, data.get("observation_source"))
    except Exception as e:
        record_test("PC-BE-14", "Vitals recording preserves observation source and timestamp", False, str(e))

    # PC-BE-15: Vitals range validation rejection (Pydantic Field ge/le)
    try:
        resp = client.post(f"/staff/patient-care/patients/{test_pat_id}/vitals", json={
            "heart_rate": 82, "blood_pressure_sys": 128, "respiratory_rate": 18,
            "temperature": 37.0, "oxygen_saturation": 115  # SpO2 > 100 is physiologically invalid
        })
        pass_cond = (resp.status_code == 422)
        record_test("PC-BE-15", "Vitals boundary validation rejection (e.g. SpO2 > 100% -> HTTP 422)", pass_cond, f"Status: {resp.status_code}")
    except Exception as e:
        record_test("PC-BE-15", "Vitals boundary validation rejection", False, str(e))

    # PC-BE-16: Vitals latest snapshot retrieval
    try:
        resp = client.get(f"/staff/patient-care/patients/{test_pat_id}/vitals")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("success") is True and data["vitals"]["heart_rate"] == 82)
        record_test("PC-BE-16", "Retrieve latest vital sign snapshot for patient", pass_cond, f"HR: {data['vitals']['heart_rate']} bpm")
    except Exception as e:
        record_test("PC-BE-16", "Retrieve latest vital sign snapshot", False, str(e))

    # PC-BE-17: Vitals chronological history timeline
    try:
        resp = client.get(f"/staff/patient-care/patients/{test_pat_id}/vitals/history?limit=10")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("count", 0) >= 1 and isinstance(data.get("history"), list))
        record_test("PC-BE-17", "Retrieve historical vital observation timeline", pass_cond, f"{data.get('count')} records in timeline")
    except Exception as e:
        record_test("PC-BE-17", "Retrieve historical vital observation timeline", False, str(e))

    # PC-BE-18: MEWS calculation standalone endpoint
    try:
        resp = client.post(f"/staff/patient-care/patients/{test_pat_id}/mews", json={
            "heart_rate": 90, "blood_pressure_sys": 130, "respiratory_rate": 16,
            "temperature": 36.9, "oxygen_saturation": 98
        })
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("success") is True and "mews" in data)
        record_test("PC-BE-18", "Standalone MEWS calculation endpoint with breakdown", pass_cond, f"Score: {data['mews']['total_score']}")
    except Exception as e:
        record_test("PC-BE-18", "Standalone MEWS calculation endpoint", False, str(e))

    # PC-BE-19: MEWS calculation history retrieval
    try:
        resp = client.get(f"/staff/patient-care/patients/{test_pat_id}/mews?limit=5")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("count", 0) >= 1)
        record_test("PC-BE-19", "Retrieve MEWS assessment scoring audit trail", pass_cond, f"{data.get('count')} assessments logged")
    except Exception as e:
        record_test("PC-BE-19", "Retrieve MEWS assessment audit trail", False, str(e))

    # PC-BE-20: ML risk assessment inference
    try:
        resp = client.post(f"/staff/patient-care/patients/{test_pat_id}/risk-assessment", json={
            "preferred_model": "random_forest"
        })
        data = resp.json()
        pred = data.get("prediction", {})
        pass_cond = (resp.status_code == 200 and data.get("success") is True and "critical_risk" in pred)
        record_test("PC-BE-20", "Machine Learning risk assessment execution (Random Forest)", pass_cond, f"Critical risk: {pred.get('critical_risk')}")
    except Exception as e:
        record_test("PC-BE-20", "Machine Learning risk assessment execution", False, str(e))

    # PC-BE-21: ML risk assessment fallback handling
    from app.services.patient_care.ml_risk_service import ml_risk_service
    try:
        fallback_res = ml_risk_service._fallback_prediction({"heart_rate": 140, "oxygen_saturation": 89, "mews_score": 6})
        pass_cond = (fallback_res.get("is_fallback") is True and fallback_res.get("critical_risk") >= 0.75)
        record_test("PC-BE-21", "ML risk fallback engine: Safe deterministic scoring when unpickling fails", pass_cond, f"Fallback risk: {fallback_res.get('critical_risk')}")
    except Exception as e:
        record_test("PC-BE-21", "ML risk fallback engine", False, str(e))

    # PC-BE-22: Explainable AI (XAI) feature attribution breakdown
    try:
        resp = client.get(f"/staff/patient-care/patients/{test_pat_id}/risk-explanation")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and "KEY CONTRIBUTING FACTORS" in data.get("explanation", ""))
        record_test("PC-BE-22", "Explainable AI (XAI): Transparent clinical feature attribution", pass_cond, "Contributing factors present")
    except Exception as e:
        record_test("PC-BE-22", "Explainable AI feature attribution", False, str(e))

    # PC-BE-23: XAI model performance metrics & synthetic data disclosure (Rule 12)
    try:
        resp = client.get("/staff/patient-care/xai/models")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and "synthetic" in data.get("synthetic_data_notice", "").lower())
        record_test("PC-BE-23", "ML model performance metrics & synthetic training disclosure (Rule 12)", pass_cond, "Disclosure verified")
    except Exception as e:
        record_test("PC-BE-23", "ML model performance metrics disclosure", False, str(e))

    # PC-BE-24: Inpatient care plan creation
    try:
        resp = client.post(f"/staff/patient-care/patients/{test_pat_id}/care-plans", json={
            "care_instructions": "Monitor vitals Q4H. Keep head of bed elevated 30 degrees.",
            "medications": "Aspirin 75mg OD, Atorvastatin 20mg HS",
            "special_instructions": "Cardiac diet, low sodium, fluid limit 2L/day",
            "staff_id": "staff-mk-1"
        })
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("success") is True and bool(data.get("plan_id")))
        record_test("PC-BE-24", "Create personalized inpatient clinical care plan", pass_cond, f"Plan ID: {data.get('plan_id')}")
    except Exception as e:
        record_test("PC-BE-24", "Create personalized inpatient clinical care plan", False, str(e))

    # PC-BE-25: Inpatient care plans list retrieval
    try:
        resp = client.get(f"/staff/patient-care/patients/{test_pat_id}/care-plans")
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("count", 0) >= 1)
        record_test("PC-BE-25", "Retrieve personalized care plans list for patient", pass_cond, f"{data.get('count')} plans on file")
    except Exception as e:
        record_test("PC-BE-25", "Retrieve personalized care plans list", False, str(e))

    # PC-BE-26: Inter-hospital transfer recommendation ranking
    try:
        resp = client.get(f"/staff/patient-care/patients/{test_pat_id}/transfers?needs_icu=true&chief_complaint=acute%20chest%20pain")
        data = resp.json()
        recs = data.get("recommendations", [])
        pass_cond = (resp.status_code == 200 and len(recs) >= 3 and recs[0]["transfer_score"] >= recs[-1]["transfer_score"])
        record_test("PC-BE-26", "Inter-hospital transfer ranking (distance, ICU beds, specialization)", pass_cond, f"Top match: {recs[0]['target_hospital_name']} (Score: {recs[0]['transfer_score']})")
    except Exception as e:
        record_test("PC-BE-26", "Inter-hospital transfer ranking", False, str(e))

    # PC-BE-27: Inter-hospital transfer request initiation
    try:
        resp = client.post(f"/staff/patient-care/patients/{test_pat_id}/transfers/initiate", json={
            "target_hospital_name": "Apollo Clinic & Tertiary Care",
            "distance_km": 5.2,
            "bed_type_needed": "ICU",
            "specialization": "Cardiology & ICU",
            "transfer_score": 92,
            "contact_phone": "+91-11-2659-0101",
            "notes": "Emergency transfer for critical cardiac intervention"
        })
        data = resp.json()
        pass_cond = (resp.status_code == 200 and data.get("success") is True and data.get("status") == "initiated")
        record_test("PC-BE-27", "Initiate and persist inter-hospital patient transfer request", pass_cond, f"Transfer ID: {data.get('transfer_id')}")
    except Exception as e:
        record_test("PC-BE-27", "Initiate inter-hospital transfer request", False, str(e))

    # PC-BE-28: AD8232 ECG simulation lifecycle (Rule 11)
    try:
        conn_res = client.post("/staff/patient-care/ecg/connect").json()
        read_res = client.get("/staff/patient-care/ecg/data").json()
        disc_res = client.post("/staff/patient-care/ecg/disconnect").json()
        has_disclaimer = "demonstration" in read_res.get("disclaimer", "").lower()
        has_waveform = len(read_res.get("telemetry", {}).get("data_points", [])) == 10
        pass_cond = (conn_res.get("connected") is True and has_disclaimer and has_waveform and disc_res.get("connected") is False)
        record_test("PC-BE-28", "AD8232 simulated ECG telemetry lifecycle & disclaimer (Rule 11)", pass_cond, "Telemetry streamed & disconnected")
    except Exception as e:
        record_test("PC-BE-28", "AD8232 simulated ECG telemetry lifecycle", False, str(e))

    # -------------------------------------------------------------------------
    # GROUP C: CROSS-SYSTEM INTEGRATION & CLINICAL RULE COMPLIANCE
    # -------------------------------------------------------------------------
    print("\n--- GROUP C: CROSS-SYSTEM INTEGRATION & CLINICAL RULES ---")

    # MK-INT-01: Monitored patients census distinguishes conversational red flags from MEWS alerts (Rule 9)
    try:
        resp = client.get("/staff/patient-care/patients?hospital_id=hosp-medikiosk")
        data = resp.json()
        pats = data.get("patients", [])
        test_p = next((p for p in pats if p["patient_id"] == test_pat_id), None)
        pass_cond = (
            resp.status_code == 200 and
            test_p is not None and
            "has_intake_red_flag" in test_p and
            "has_mews_alert" in test_p and
            test_p["has_intake_red_flag"] is True  # Aarav had red flag recorded earlier
        )
        record_test("MK-INT-01", "Dual-alert distinction: Conversational Red Flag vs Physiological MEWS (Rule 9)", pass_cond, f"Aarav red_flag={test_p.get('has_intake_red_flag')} mews_alert={test_p.get('has_mews_alert')}")
    except Exception as e:
        record_test("MK-INT-01", "Dual-alert distinction", False, str(e))

    # MK-INT-02: Patient ID reuse without duplication
    try:
        db_pat = database.get_patient_by_id(test_pat_id)
        pass_cond = (db_pat is not None and db_pat["full_name"] == "Aarav Sharma")
        record_test("MK-INT-02", "Reused existing MediKiosk patient_id without entity collision", pass_cond, f"ID: {test_pat_id}")
    except Exception as e:
        record_test("MK-INT-02", "Reused existing MediKiosk patient_id", False, str(e))

    # MK-INT-03: Bed assignment and vitals link back to patient and session
    try:
        latest_v = database.get_patient_latest_vitals(test_pat_id)
        beds = database.get_hospital_beds("hosp-medikiosk")
        assigned_bed = next((b for b in beds if b["patient_id"] == test_pat_id), None)
        pass_cond = (latest_v is not None and assigned_bed is not None)
        record_test("MK-INT-03", "Bed occupancy & physiological vitals correctly link to patient & session", pass_cond, f"Bed: {assigned_bed.get('bed_number') if assigned_bed else 'None'}")
    except Exception as e:
        record_test("MK-INT-03", "Bed occupancy & vitals linkage", False, str(e))

    # MK-INT-04: Mandatory clinical decision support disclaimer (Rule 12)
    try:
        resp = client.get(f"/staff/patient-care/patients/{test_pat_id}/risk-explanation")
        data = resp.json()
        has_disc = "clinical decision support" in data.get("clinical_disclaimer", "").lower()
        has_synth = "synthetic" in data.get("synthetic_data_notice", "").lower()
        pass_cond = (has_disc and has_synth)
        record_test("MK-INT-04", "Mandatory clinical decision support & synthetic data disclosures (Rule 12)", pass_cond, "Both disclaimers present")
    except Exception as e:
        record_test("MK-INT-04", "Mandatory clinical decision support disclaimer", False, str(e))

    # -------------------------------------------------------------------------
    # FINAL SUMMARY REPORT
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print(f"AUTOMATED VERIFICATION SUMMARY: {results['passed']}/{results['total']} TESTS PASSED")
    print(f"PASS RATE: {(results['passed'] / results['total']) * 100:.1f}%")
    if results['failed'] == 0:
        print("ALL TESTS PASSED SUCCESSFULLY! BACKEND INTEGRATION COMPLIANT.")
    else:
        print(f"WARNING: {results['failed']} TESTS FAILED.")
    print("=" * 80)

    return results

if __name__ == "__main__":
    run_all_tests()
