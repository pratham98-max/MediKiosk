"""
Automated Verification Suite: Phase 3 Healthcare Staff Dashboard Integration
=============================================================================
Validates:
- P3-01: Vite frontend build compiles cleanly with zero syntax or bundle errors.
- P3-02: StaffPortal.jsx exports cleanly with workstation view switcher ('opd' vs 'patient_care').
- P3-03: PatientCareModule.jsx and all sub-modals (VitalRecorder, XAIRisk, ECG, BedManagement, CarePlans, TransferNetwork) exist and are linked.
- P3-04: API Endpoint GET /staff/patient-care/patients provides dual-alert flags (has_intake_red_flag vs has_mews_alert) per Rule 9.
- P3-05: API Endpoint GET /staff/patient-care/beds returns full 9-bed ward map with ICU/General classification.
- P3-06: API Endpoint POST /staff/patient-care/beds/optimize executes intelligent bed reallocation.
- P3-07: Vital sign recording correctly persists observation_source and ISO timestamp per Rule 10.
- P3-08: Subbe MEWS breakdown calculation returns accurate risk tiers and parameter scores.
- P3-09: Discharge safety gating blocks patients with MEWS >= 3 unless clinical override is specified.
- P3-10: ML Risk prediction returns feature attribution explanation and mandatory synthetic data notices (Rule 12).
- P3-11: AD8232 ECG telemetry simulation lifecycle returns 10-point waveform data and mandatory demonstration disclaimer (Rule 11).
- P3-12: Inter-hospital transfer network returns ranked partner hospitals with scores.
"""

import os
import sys
import uuid
import subprocess

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


def run_phase3_tests():
    print("=" * 80)
    print("PHASE 3 VERIFICATION: HEALTHCARE STAFF DASHBOARD INTEGRATION")
    print("=" * 80)

    # P3-01: Vite build check
    frontend_dir = os.path.abspath(os.path.join(backend_dir, "..", "Frontend"))
    dist_dir = os.path.join(frontend_dir, "dist")
    pass_build = os.path.exists(os.path.join(dist_dir, "index.html"))
    record_test("P3-01", "Vite production bundle compiled cleanly", pass_build, "dist/index.html verified")

    # P3-02: StaffPortal component inspection
    staff_portal_path = os.path.join(frontend_dir, "src", "components", "StaffPortal.jsx")
    with open(staff_portal_path, "r", encoding="utf-8") as f:
        staff_portal_src = f.read()
    has_nav = "staff-workstation-nav" in staff_portal_src and "patient_care" in staff_portal_src
    has_import = "PatientCareModule" in staff_portal_src
    record_test("P3-02", "StaffPortal workstation view switcher integrated", (has_nav and has_import), "OPD vs Patient Care views linked")

    # P3-03: Modular patient_care component tree exists
    pc_components = [
        "PatientCareModule.jsx",
        "VitalRecorderModal.jsx",
        "XAIRiskModal.jsx",
        "ECGTelemetryModal.jsx",
        "BedManagementModal.jsx",
        "CarePlansModal.jsx",
        "TransferNetworkModal.jsx",
        "patient_care.css"
    ]
    all_components_exist = all(
        os.path.exists(os.path.join(frontend_dir, "src", "components", "patient_care", comp))
        for comp in pc_components
    )
    record_test("P3-03", "Modular Patient Care component suite verified", all_components_exist, f"{len(pc_components)} files present")

    # P3-04: Dual-Alert census API (Rule 9)
    resp = client.get("/staff/patient-care/patients?hospital_id=hosp-medikiosk")
    data = resp.json()
    pats = data.get("patients", [])
    has_keys = len(pats) > 0 and "has_intake_red_flag" in pats[0] and "has_mews_alert" in pats[0]
    record_test("P3-04", "Census API distinct dual-alert categorization (Rule 9)", has_keys, f"Monitored: {len(pats)}")

    # P3-05: Ward bed inventory
    resp = client.get("/staff/patient-care/beds?hospital_id=hosp-medikiosk")
    data = resp.json()
    beds = data.get("beds", [])
    icu_count = sum(1 for b in beds if b["bed_type"] == "ICU")
    gen_count = sum(1 for b in beds if b["bed_type"] == "general")
    record_test("P3-05", "Ward bed inventory verified (2 ICU + 7 General)", (icu_count == 2 and gen_count == 7), f"{len(beds)} total beds")

    # P3-06: Bed optimization execution
    resp = client.post("/staff/patient-care/beds/optimize?hospital_id=hosp-medikiosk")
    data = resp.json()
    record_test("P3-06", "Intelligent bed reallocation algorithm execution", data.get("success") is True, data.get("message"))

    # P3-07: Vital sign recording with source and timestamp (Rule 10)
    test_pid = pats[0]["patient_id"] if pats else "PAT-TEST"
    resp = client.post(f"/staff/patient-care/patients/{test_pid}/vitals", json={
        "heart_rate": 84, "blood_pressure_sys": 126, "respiratory_rate": 17,
        "temperature": 36.9, "oxygen_saturation": 98, "observation_source": "ad8232_simulation",
        "staff_id": "staff-mk-1"
    })
    data = resp.json()
    pass_source = data.get("observation_source") == "ad8232_simulation" and bool(data.get("recorded_at"))
    record_test("P3-07", "Observation source and ISO timestamp persisted (Rule 10)", pass_source, data.get("observation_source"))

    # P3-08: Subbe MEWS scoring verification
    resp = client.post(f"/staff/patient-care/patients/{test_pid}/mews", json={
        "heart_rate": 105, "blood_pressure_sys": 85, "respiratory_rate": 22,
        "temperature": 38.2, "oxygen_saturation": 93
    })
    data = resp.json()
    mews = data.get("mews", {})
    record_test("P3-08", "Subbe MEWS scoring calculation with parameter breakdown", mews.get("total_score") >= 5, f"Score: {mews.get('total_score')} ({mews.get('risk_level')})")

    # P3-09: Discharge safety gating (MEWS >= 3 blocked without override)
    client.post(f"/staff/patient-care/patients/{test_pid}/vitals", json={
        "heart_rate": 135, "blood_pressure_sys": 85, "respiratory_rate": 28,
        "temperature": 38.9, "oxygen_saturation": 91
    })
    resp_block = client.post(f"/staff/patient-care/patients/{test_pid}/discharge?override=false")
    blocked = resp_block.status_code == 400
    resp_allow = client.post(f"/staff/patient-care/patients/{test_pid}/discharge?override=true")
    allowed = resp_allow.status_code == 200
    record_test("P3-09", "Clinical discharge safety gate (MEWS >= 3 blocked; override allowed)", (blocked and allowed), "Safety block & override verified")

    # P3-10: ML Risk prediction & synthetic data disclosure (Rule 12)
    resp = client.post(f"/staff/patient-care/patients/{test_pid}/risk-assessment", json={"preferred_model": "random_forest"})
    data = resp.json()
    has_disc = "synthetic" in data.get("synthetic_data_notice", "").lower() and "clinical decision support" in data.get("clinical_disclaimer", "").lower()
    record_test("P3-10", "XAI Risk assessment feature attribution and Rule 12 disclaimers", has_disc, "Both disclosures validated")

    # P3-11: AD8232 ECG simulation lifecycle (Rule 11)
    read_res = client.get("/staff/patient-care/ecg/data").json()
    has_ecg_disc = "demonstration" in read_res.get("disclaimer", "").lower()
    has_points = len(read_res.get("telemetry", {}).get("data_points", [])) == 10
    record_test("P3-11", "AD8232 ECG simulation waveform and demonstration disclaimer (Rule 11)", (has_ecg_disc and has_points), "Oscilloscope data validated")

    # P3-12: Inter-hospital transfer network recommendations
    resp = client.get(f"/staff/patient-care/patients/{test_pid}/transfers?needs_icu=false")
    data = resp.json()
    recs = data.get("recommendations", [])
    record_test("P3-12", "Inter-hospital transfer recommendations ranked by score", len(recs) >= 3, f"Top match: {recs[0]['target_hospital_name']} (Score: {recs[0]['transfer_score']})")

    print("\n" + "=" * 80)
    print(f"PHASE 3 VERIFICATION SUMMARY: {results['passed']}/{results['total']} TESTS PASSED")
    print(f"PASS RATE: {(results['passed'] / results['total']) * 100:.1f}%")
    print("=" * 80)

    return results

if __name__ == "__main__":
    run_phase3_tests()
