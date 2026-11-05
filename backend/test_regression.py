"""
Regression test suite for MediKiosk core modules:
1. Healthcare Staff Login & Staff Dashboard
2. OPD Queue
3. Patient Care & Bed Management
4. Vital Monitoring & MEWS Score Calculation
5. AD8232 ECG Telemetry Stream
6. Current Hospital EMR Storage & Retrieval
"""
import sys
import os

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import (
    authenticate_staff,
    get_staff_dashboard,
    get_opd_queue,
    confirm_and_store_current_hospital_emr,
    get_hospital_emr_records,
    save_session,
)
from app.services.patient_care.mews_service import calculate_mews
from app.services.patient_care.ecg_service import ecg_simulator
from app.routers.patient_care import get_hospital_beds


def test_staff_login_and_dashboard():
    print("--- 1. Testing Healthcare Staff Login & Dashboard ---")
    staff_auth = authenticate_staff("staff@medikiosk.com", "staff123")
    print(f"Staff Auth Success: {staff_auth.get('success')}")
    assert staff_auth.get("success") is True, f"Staff login failed: {staff_auth}"
    staff = staff_auth.get("staff", {})
    print(f"Staff Name: {staff.get('name')}, Role: {staff.get('role')}, Hospital: {staff.get('hospital_name')}")
    assert staff.get("name") == "Nurse Sunita Rawat"
    
    dashboard = get_staff_dashboard("hosp-medikiosk")
    counts = dashboard.get("counts", {})
    print(f"Dashboard Counts: Total={counts.get('total')}, In Process={counts.get('in_process')}, Ready for Doctor={counts.get('ready_for_doctor')}")
    assert "ready_for_doctor" in counts
    print("✓ Staff authentication and dashboard verified!")


def test_opd_queue():
    print("\n--- 2. Testing OPD Queue ---")
    queue = get_opd_queue()
    print(f"OPD Queue Length: {len(queue)}")
    assert isinstance(queue, list)
    print("✓ OPD Queue query verified!")


def test_bed_management():
    print("\n--- 3. Testing Bed Management ---")
    beds_res = get_hospital_beds("hosp-medikiosk")
    print(f"Beds retrieved: {len(beds_res)}")
    assert isinstance(beds_res, list)
    assert len(beds_res) > 0
    print("✓ Bed Management inventory verified!")


def test_mews_calculation():
    print("\n--- 4. Testing MEWS (Modified Early Warning Score) ---")
    vitals = {
        "heart_rate": 115,
        "blood_pressure_sys": 88,
        "respiratory_rate": 24,
        "temperature": 38.8,
        "consciousness": "Alert",
        "oxygen_saturation": 93
    }
    mews_result = calculate_mews(
        heart_rate=vitals["heart_rate"],
        blood_pressure_sys=vitals["blood_pressure_sys"],
        respiratory_rate=vitals["respiratory_rate"],
        temperature=vitals["temperature"],
        oxygen_saturation=vitals["oxygen_saturation"]
    )
    print(f"MEWS Total Score: {mews_result.get('total_score')}, Risk Level: {mews_result.get('risk_level')}")
    assert mews_result.get("total_score") > 0
    assert mews_result.get("risk_level") in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "Critical Risk", "High Risk"]
    print("✓ MEWS calculation logic verified!")


def test_ecg_telemetry():
    print("\n--- 5. Testing AD8232 ECG Telemetry Simulation ---")
    conn = ecg_simulator.connect()
    print(f"ECG Simulator Connected: {conn.get('connected')}")
    assert conn.get("connected") is True
    
    frame = ecg_simulator.read_data()
    print(f"ECG Telemetry Frame: HR={frame.get('heart_rate')} bpm, Arrhythmia={frame.get('arrhythmia_detected')}, Points={len(frame.get('data_points', []))}")
    assert frame.get("heart_rate") > 0
    assert len(frame.get("data_points", [])) == 10
    
    ecg_simulator.disconnect()
    print("✓ ECG Sensor Telemetry verified!")


def test_emr_functionality():
    print("\n--- 6. Testing Hospital EMR Persistence ---")
    save_session("test-regression-sess", "en")
    emr_rec = confirm_and_store_current_hospital_emr(
        session_id="test-regression-sess",
        hospital_id="hosp-medikiosk",
        doctor_name="Dr. Rajesh Sharma",
        confirmed_report_text="### Current symptoms\nTest symptoms\n### Timeline\nEncounter completed",
        diagnosis="Acute Gastroenteritis",
        medications="Oral Rehydration Salts, Paracetamol 500mg"
    )
    print(f"Stored EMR Record ID: {emr_rec.get('record_id')}")
    assert emr_rec.get("record_id") is not None
    
    records = get_hospital_emr_records("hosp-medikiosk")
    print(f"Retrieved EMR records for hospital: {len(records)}")
    assert len(records) > 0
    print("✓ Hospital EMR storage and retrieval verified!")


def main():
    print("==================================================================")
    print("RUNNING MEDIKIOSK REGRESSION SUITE")
    print("==================================================================")
    test_staff_login_and_dashboard()
    test_opd_queue()
    test_bed_management()
    test_mews_calculation()
    test_ecg_telemetry()
    test_emr_functionality()
    print("\n==================================================================")
    print(">>> ALL REGRESSION CHECKS PASSED SUCCESSFULLY! <<<")
    print("==================================================================")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
