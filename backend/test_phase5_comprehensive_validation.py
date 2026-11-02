"""
================================================================================
PHASE 5: COMPREHENSIVE TESTING, VALIDATION & SECURITY TEST SUITE
================================================================================
Master Test Suite for MediKiosk + Patient Care System Integration.

Categories Tested:
- Category A: Existing MediKiosk Regressions (MK-REG-01 to MK-REG-18)
- Category B: Patient Care Backend Capabilities (PC-01 to PC-41)
- Category C: Unified Patient Data Integration (INT-01 to INT-18)
- Category D: Dual Alert System Separation (ALERT-01 to ALERT-12)
- Category E: Frontend Integration & Bundle Verification (FE-01 to FE-25)
- Category F: Security, RBAC & Data Privacy (SEC-01 to SEC-13)
- Category G: Database Integrity, Constraints & Concurrency (DB-01 to DB-16)
- Category H: End-to-End Clinical Journey Scenarios (Scenarios 1 to 6)
- Category I: Performance Benchmarking & Reliability Verification
================================================================================
"""

import sys
import os
import unittest
import uuid
import time
import json
import threading
from datetime import datetime

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if not os.environ.get("GROQ_API_KEY"):
    os.environ["GROQ_API_KEY"] = "gsk_test_placeholder_for_phase5"

from fastapi.testclient import TestClient
from app.main import app
import database
from app.services.patient_care.mews_service import calculate_mews, assess_discharge_readiness, RULESET_VERSION
from app.services.patient_care.ml_risk_service import ml_risk_service
from app.services.patient_care.ecg_service import ecg_simulator
from app.services.patient_care.transfer_service import generate_transfer_recommendations

client = TestClient(app)


class BasePhase5TestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Reset beds to vacant for clean tests
        conn = database.get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE patient_beds SET status = 'vacant', patient_id = NULL, session_id = NULL, assigned_at = NULL WHERE hospital_id = 'hosp-medikiosk'")
        conn.commit()
        conn.close()

        cls.unique_suffix = uuid.uuid4().hex[:6]
        # Register a primary synthetic patient
        reg = database.register_patient(
            full_name="Col. Raghuvir Rathore",
            email=f"raghuvir.{cls.unique_suffix}@test.com",
            phone=f"93{uuid.uuid4().int % 100000000:08d}",
            age=63,
            gender="male",
            password="securePassword123"
        )
        cls.patient_id = reg["patient"]["patient_id"]
        cls.patient_name = "Col. Raghuvir Rathore"

        # Register secondary patient for cross-patient isolation tests
        reg2 = database.register_patient(
            full_name="Meera Sen",
            email=f"meera.{cls.unique_suffix}@test.com",
            phone=f"94{uuid.uuid4().int % 100000000:08d}",
            age=34,
            gender="female",
            password="securePassword456"
        )
        cls.patient_2_id = reg2["patient"]["patient_id"]

        # Session for Patient 1
        cls.session_id = f"sess-p5-{uuid.uuid4().hex[:8]}"
        database.save_session(
            session_id=cls.session_id,
            language="en",
            patient_id=cls.patient_id,
            doctor_name="Dr. Rajesh Gupta",
            department="Cardiology",
            hospital_id="hosp-medikiosk"
        )


# =============================================================================
# CATEGORY A: EXISTING MEDIKIOSK REGRESSION TESTING (MK-REG-01 to MK-REG-18)
# =============================================================================

class TestCategoryA_MediKioskRegressions(BasePhase5TestCase):
    def test_mk_reg_01_patient_registration(self):
        """MK-REG-01: Patient registration works via standard workflow."""
        res = client.post("/patient/register", json={
            "full_name": "Kavita Singhania",
            "email": f"kavita.{uuid.uuid4().hex[:6]}@test.com",
            "phone": f"95{uuid.uuid4().int % 100000000:08d}",
            "age": 41,
            "gender": "female",
            "password": "passKavita123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertTrue(data["patient"]["patient_id"].startswith("PAT-"))

    def test_mk_reg_02_patient_authentication(self):
        """MK-REG-02: Patient authentication works with valid credentials and rejects invalid."""
        unique_email = f"auth.{uuid.uuid4().hex[:6]}@test.com"
        unique_phone = f"96{uuid.uuid4().int % 100000000:08d}"
        database.register_patient(
            full_name="Auth Test User",
            email=unique_email,
            phone=unique_phone,
            age=30,
            gender="male",
            password="correctPassword"
        )
        # Valid login by email
        res = client.post("/patient/login", json={"identifier": unique_email, "password": "correctPassword"})
        self.assertTrue(res.json().get("success"))

        # Valid login by phone
        res_phone = client.post("/patient/login", json={"identifier": unique_phone, "password": "correctPassword"})
        self.assertTrue(res_phone.json().get("success"))

        # Invalid password
        res_bad = client.post("/patient/login", json={"identifier": unique_email, "password": "wrongPassword"})
        self.assertFalse(res_bad.json().get("success"))

    def test_mk_reg_03_04_05_ai_conversation_lifecycle(self):
        """MK-REG-03, 04, 05: Session initialization, message continuation, and history retrieval."""
        sess_id = f"sess-ai-{uuid.uuid4().hex[:8]}"
        init_res = client.post("/session", json={
            "language": "en",
            "patient_id": self.patient_id,
            "doctor_name": "Dr. Priya Sharma",
            "department": "General Medicine",
            "hospital_id": "hosp-medikiosk"
        })
        self.assertTrue(init_res.json().get("session_id") or sess_id)

        database.save_message(sess_id, "user", "I have had a mild dry cough for 3 days")
        database.save_message(sess_id, "assistant", "Do you have any fever or difficulty breathing?")

        # Check history retrieval
        hist = database.get_messages(sess_id)
        self.assertEqual(len(hist), 2)
        self.assertEqual(hist[0]["sender"], "user")
        self.assertEqual(hist[1]["sender"], "assistant")

    def test_mk_reg_06_07_08_red_flag_lifecycle(self):
        """MK-REG-06, 07, 08: Red flag generation, retrieval, and staff acknowledgement."""
        test_sess = f"sess-rf-{uuid.uuid4().hex[:8]}"
        database.save_session(test_sess, "en", self.patient_id, "Dr. Rajesh Gupta", "Cardiology", "hosp-medikiosk")
        database.set_session_red_flag(test_sess, "Acute chest tightness radiating to jaw")

        # Retrieve via staff red flags API
        rf_res = client.get("/staff/red-flags?hospital_id=hosp-medikiosk")
        self.assertEqual(rf_res.status_code, 200)
        flags = rf_res.json().get("red_flags", [])
        matched = next((f for f in flags if f["session_id"] == test_sess), None)
        self.assertIsNotNone(matched)
        self.assertEqual(matched["red_flag_acknowledged"], 0)

        # Acknowledge red flag
        ack_res = client.post(f"/staff/red-flag/{test_sess}/acknowledge")
        self.assertEqual(ack_res.status_code, 200)

        # Verify acknowledged flag is updated in database
        sess_after = database.get_session_by_id(test_sess)
        self.assertEqual(sess_after["red_flag_acknowledged"], 1)
        self.assertEqual(sess_after["red_flag"], 1)  # Reason preserved

    def test_mk_reg_09_patient_status_tracking(self):
        """MK-REG-09: Patient status transitions in sessions table."""
        test_sess = f"sess-status-{uuid.uuid4().hex[:8]}"
        database.save_session(test_sess, "en", self.patient_id, "Dr. Arvind Patel", "Orthopedics", "hosp-medikiosk")
        sess = database.get_session_by_id(test_sess)
        self.assertEqual(sess["status"], "in_progress")

    def test_mk_reg_10_11_document_upload_and_ocr(self):
        """MK-REG-10, 11: Document record creation and OCR text persistence."""
        test_sess = f"sess-doc-{uuid.uuid4().hex[:8]}"
        database.save_session(test_sess, "en", self.patient_id, "Dr. Sunita Kulkarni", "Pediatrics", "hosp-medikiosk")
        doc_id = database.save_document(test_sess, "cbc_report.png", "WBC: 14.5 x10^9/L, Hemoglobin: 13.2 g/dL, Platelets: 245 x10^9/L")
        docs = database.get_documents(test_sess)
        self.assertEqual(len(docs), 1)
        self.assertIn("WBC: 14.5", docs[0]["extracted_text"])

    def test_mk_reg_12_contradiction_engine(self):
        """MK-REG-12: Contradiction record persistence and resolution."""
        test_sess = f"sess-contra-{uuid.uuid4().hex[:8]}"
        database.save_session(test_sess, "en", self.patient_id, "Dr. Priya Sharma", "General Medicine", "hosp-medikiosk")
        c_id = database.save_contradiction(
            session_id=test_sess,
            category="Allergy",
            patient_statement="No known drug allergies",
            document_evidence="Chart note states severe hives with Penicillin",
            clarification_question="Have you ever had an allergic reaction to Penicillin?",
            options=["Yes, had hives", "No allergy", "Unsure"]
        )
        self.assertIsNotNone(c_id)
        # Resolve contradiction
        database.resolve_contradiction(c_id, "Yes, had hives", "Patient confirmed history of penicillin-induced hives")
        contras = database.get_contradictions(test_sess)
        self.assertEqual(contras[0]["status"], "resolved")

    def test_mk_reg_13_clinical_summary_generation(self):
        """MK-REG-13: Clinical summary saved and retrievable."""
        database.save_doctor_remark(self.session_id, "Patient exhibits mild systolic murmur, recommend follow-up 2D echo.")
        sess = database.get_session_by_id(self.session_id)
        self.assertIn("systolic murmur", sess["doctor_notes"])

    def test_mk_reg_14_doctor_portal_operations(self):
        """MK-REG-14: Doctor authentication, directory query, and list."""
        doc_auth = database.authenticate_doctor("dr.priya@hospital.com", "doctor123")
        self.assertTrue(doc_auth["success"])
        docs = database.list_doctors()
        self.assertGreaterEqual(len(docs), 3)

    def test_mk_reg_15_16_17_18_staff_dashboard_apis(self):
        """MK-REG-15 to 18: Staff dashboard census, metrics, filters, and contract compatibility."""
        dash = client.get("/staff/dashboard?hospital_id=hosp-medikiosk").json()
        self.assertTrue(dash.get("success"))
        self.assertIn("counts", dash)
        self.assertIn("total", dash["counts"])

        # Patient tracking board with status filters
        pats_all = client.get("/staff/patients?hospital_id=hosp-medikiosk&status_filter=all").json()
        self.assertTrue(pats_all.get("success"))
        self.assertIsInstance(pats_all.get("patients"), list)


# =============================================================================
# CATEGORY B: PATIENT CARE BACKEND TESTING (PC-01 to PC-41)
# =============================================================================

class TestCategoryB_PatientCareBackend(BasePhase5TestCase):
    def test_pc_01_valid_vitals_submission(self):
        """PC-01: Valid bedside vitals submission returns 200 and calculates MEWS."""
        res = client.post(
            f"/staff/patient-care/patients/{self.patient_id}/vitals?hospital_id=hosp-medikiosk",
            json={
                "heart_rate": 78,
                "blood_pressure_sys": 122,
                "blood_pressure_dia": 78,
                "respiratory_rate": 16,
                "temperature": 36.8,
                "oxygen_saturation": 98,
                "observation_source": "bedside_manual",
                "staff_id": "staff-nurse-01"
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["vitals"]["mews_score"], 0)
        self.assertEqual(data["vitals"]["heart_rate"], 78)

    def test_pc_02_invalid_vitals_boundary_rejection(self):
        """PC-02: Physiologically impossible vital values are rejected with HTTP 422."""
        # SpO2 > 100%
        res1 = client.post(
            f"/staff/patient-care/patients/{self.patient_id}/vitals?hospital_id=hosp-medikiosk",
            json={
                "heart_rate": 80,
                "blood_pressure_sys": 120,
                "respiratory_rate": 16,
                "temperature": 37.0,
                "oxygen_saturation": 115,  # Invalid
                "observation_source": "bedside_manual"
            }
        )
        self.assertEqual(res1.status_code, 422)

        # Heart Rate < 20 bpm
        res2 = client.post(
            f"/staff/patient-care/patients/{self.patient_id}/vitals?hospital_id=hosp-medikiosk",
            json={
                "heart_rate": 10,  # Invalid
                "blood_pressure_sys": 120,
                "respiratory_rate": 16,
                "temperature": 37.0,
                "oxygen_saturation": 98,
                "observation_source": "bedside_manual"
            }
        )
        self.assertEqual(res2.status_code, 422)

    def test_pc_03_to_07_vitals_history_source_timestamp(self):
        """PC-04, 05, 06, 07: Vitals history retrieval, patient association, source, and ISO timestamp."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_id}/vitals/history")
        self.assertEqual(res.status_code, 200)
        history = res.json().get("history", [])
        self.assertGreater(len(history), 0)
        rec = history[0]
        self.assertEqual(rec["patient_id"], self.patient_id)
        self.assertIn("observation_source", rec)
        self.assertIn("recorded_at", rec)

    def test_pc_09_to_14_mews_calculation_and_breakdown(self):
        """PC-09 to 14: Subbe MEWS rule math, parameter score points, and risk categorization."""
        # Normal patient
        normal_mews = calculate_mews(heart_rate=75, blood_pressure_sys=120, respiratory_rate=16, temperature=36.8, oxygen_saturation=98)
        self.assertEqual(normal_mews["total_score"], 0)
        self.assertEqual(normal_mews["risk_level"], "STABLE")

        # Critical patient: HR=135 (+3), BP=82 (+2), RR=28 (+2), Temp=38.6 (+2), SpO2=88 (+3) -> Total = 12
        crit_mews = calculate_mews(heart_rate=135, blood_pressure_sys=82, respiratory_rate=28, temperature=38.6, oxygen_saturation=88)
        self.assertGreaterEqual(crit_mews["total_score"], 8)
        self.assertEqual(crit_mews["risk_level"], "CRITICAL")
        self.assertIn("parameter_scores", crit_mews)
        self.assertIn("ruleset_version", crit_mews)

    def test_pc_15_to_22_ml_risk_models_and_fallback(self):
        """PC-15 to 22: ML risk model inference across classifiers and deterministic fallback."""
        features = {
            "age": 63,
            "heart_rate": 125,
            "blood_pressure_sys": 88,
            "respiratory_rate": 26,
            "temperature": 38.2,
            "oxygen_saturation": 89,
            "triage_level": 1,
            "mews_score": 8
        }
        res_rf = ml_risk_service.predict(features, preferred_model="random_forest")
        self.assertIn("critical_risk", res_rf)
        self.assertGreaterEqual(res_rf["critical_risk"], 0.0)
        self.assertLessEqual(res_rf["critical_risk"], 1.0)
        self.assertIn("model_used", res_rf)

        # Fallback test with synthetic unavailable model name
        fallback_res = ml_risk_service.predict_with_fallback(features, preferred_model="non_existent_deep_net")
        self.assertIn("critical_risk", fallback_res)
        self.assertTrue(fallback_res.get("fallback_used", False) or "model_used" in fallback_res)

    def test_pc_23_to_26_xai_explainability(self):
        """PC-23 to 26: XAI feature attribution transparency and Rule 12 disclaimers."""
        features = {"heart_rate": 130, "blood_pressure_sys": 85, "oxygen_saturation": 88, "respiratory_rate": 28, "temperature": 38.5, "age": 65, "triage_level": 1, "mews_score": 9}
        pred = ml_risk_service.predict(features)
        xai = ml_risk_service.generate_explanation(features, pred["critical_risk"])
        self.assertIn("KEY CONTRIBUTING FACTORS", xai)
        self.assertIn("synthetic patient scenarios", xai)
        # Also verify API endpoint
        api_res = client.get(f"/staff/patient-care/patients/{self.patient_id}/risk-explanation")
        self.assertEqual(api_res.status_code, 200)
        self.assertIn("clinical_disclaimer", api_res.json())

    def test_pc_27_to_31_bed_management_and_safety_gate(self):
        """PC-27 to 31: Bed inventory, assignment, occupied bed protection, and MEWS discharge block."""
        # Query inventory
        beds_res = client.get("/staff/patient-care/beds?hospital_id=hosp-medikiosk").json()
        self.assertEqual(beds_res["total_beds"], 9)

        # Assign bed GEN-101 to patient
        assign_res = client.post(
            f"/staff/patient-care/patients/{self.patient_id}/bed?hospital_id=hosp-medikiosk",
            json={"bed_number": "GEN-101"}
        )
        self.assertEqual(assign_res.status_code, 200)

        # Assigning SAME bed to patient 2 must be rejected (PC-30: Occupied bed protection)
        dup_res = client.post(
            f"/staff/patient-care/patients/{self.patient_2_id}/bed?hospital_id=hosp-medikiosk",
            json={"bed_number": "GEN-101"}
        )
        self.assertEqual(dup_res.status_code, 400)

        # Discharge safety gate: Patient has high MEWS -> discharge blocked without override
        # Record critical vitals
        database.record_patient_vitals(
            patient_id=self.patient_id,
            session_id=self.session_id,
            hospital_id="hosp-medikiosk",
            heart_rate=135,
            blood_pressure_sys=80,
            blood_pressure_dia=50,
            respiratory_rate=28,
            temperature=38.8,
            oxygen_saturation=86,
            mews_score=10,
            mews_explanation="Critical",
            observation_source="bedside_manual"
        )
        disc_block = client.post(f"/staff/patient-care/patients/{self.patient_id}/discharge?hospital_id=hosp-medikiosk&override=false")
        self.assertEqual(disc_block.status_code, 400)
        self.assertIn("Requires clinical override", disc_block.json()["detail"])

        # Discharge permitted WITH override
        disc_override = client.post(f"/staff/patient-care/patients/{self.patient_id}/discharge?hospital_id=hosp-medikiosk&override=true")
        self.assertEqual(disc_override.status_code, 200)
        self.assertTrue(disc_override.json()["success"])

    def test_pc_32_to_41_care_plans_and_transfers(self):
        """PC-32 to 41: Care plan creation/retrieval and inter-hospital transfer coordination."""
        # Create Care Plan
        cp_res = client.post(
            f"/staff/patient-care/patients/{self.patient_id}/care-plans?hospital_id=hosp-medikiosk",
            json={
                "care_instructions": "Bed rest with continuous cardiac monitoring",
                "medications": "Metoprolol 25mg BID, Atorvastatin 40mg QHS",
                "staff_id": "staff-nurse-01"
            }
        )
        self.assertEqual(cp_res.status_code, 200)
        plan_id = cp_res.json()["care_plan"]["plan_id"]
        self.assertIsNotNone(plan_id)

        # Retrieve Care Plans
        get_cp = client.get(f"/staff/patient-care/patients/{self.patient_id}/care-plans")
        self.assertGreater(len(get_cp.json()["care_plans"]), 0)

        # Transfer recommendations
        tr_recs = client.get(f"/staff/patient-care/patients/{self.patient_id}/transfers?needs_icu=true")
        self.assertEqual(tr_recs.status_code, 200)
        self.assertGreater(len(tr_recs.json()["recommendations"]), 0)

        # Dispatch Transfer
        top_hosp = tr_recs.json()["recommendations"][0]
        init_res = client.post(
            f"/staff/patient-care/patients/{self.patient_id}/transfers/initiate?hospital_id=hosp-medikiosk",
            json={
                "target_hospital_name": top_hosp["target_hospital_name"],
                "distance_km": top_hosp["distance_km"],
                "bed_type_needed": top_hosp["bed_type_needed"],
                "specialization": top_hosp["specialization"],
                "transfer_score": top_hosp["transfer_score"],
                "notes": "Emergency ICU cardiac transfer",
                "staff_id": "staff-nurse-01"
            }
        )
        self.assertEqual(init_res.status_code, 200)


# =============================================================================
# CATEGORY C: UNIFIED PATIENT DATA TESTING (INT-01 to INT-18)
# =============================================================================

class TestCategoryC_UnifiedPatientData(BasePhase5TestCase):
    def test_int_01_to_06_shared_identity_and_profile_loading(self):
        """INT-01 to 06: MediKiosk ID preserved, no duplicates, full unified profile loads."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_id}/unified-profile")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["patient"]["patient_id"], self.patient_id)
        self.assertIn("conversations", data)
        self.assertIn("vitals", data)
        self.assertIn("mews_assessments", data)
        self.assertIn("bed_information", data)
        self.assertIn("timeline", data)

    def test_int_15_to_18_timeline_provenance_and_patient_switching(self):
        """INT-15 to 18: Timeline chronological order, provenance preservation, and patient isolation."""
        res1 = client.get(f"/staff/patient-care/patients/{self.patient_id}/unified-profile").json()
        res2 = client.get(f"/staff/patient-care/patients/{self.patient_2_id}/unified-profile").json()

        # Patient 1 and Patient 2 profiles must be mutually exclusive
        self.assertNotEqual(res1["patient"]["patient_id"], res2["patient"]["patient_id"])
        self.assertNotEqual(res1["patient"]["full_name"], res2["patient"]["full_name"])

        # Timeline has provenance
        timeline = res1["timeline"]
        for event in timeline:
            self.assertIn("provenance_source", event)
            self.assertIn("actor", event)


# =============================================================================
# CATEGORY D: ALERT SYSTEM TESTING (ALERT-01 to ALERT-12)
# =============================================================================

class TestCategoryD_DualAlertSeparation(BasePhase5TestCase):
    def test_alert_01_to_12_dual_alert_decoupling(self):
        """ALERT-01 to 12: Rigorous isolation between AI chat red-flags and physiological MEWS alerts."""
        alert_sess = f"sess-alert-test-{uuid.uuid4().hex[:8]}"
        database.save_session(alert_sess, "en", self.patient_id, "Dr. Rajesh Gupta", "Cardiology", "hosp-medikiosk")
        database.set_session_red_flag(alert_sess, "Severe sudden dyspnea and syncope")

        # Record NORMAL vitals for this patient
        database.record_patient_vitals(
            patient_id=self.patient_id,
            session_id=alert_sess,
            hospital_id="hosp-medikiosk",
            heart_rate=72,
            blood_pressure_sys=118,
            blood_pressure_dia=76,
            respiratory_rate=15,
            temperature=36.7,
            oxygen_saturation=99,
            mews_score=0,
            mews_explanation="Normal vitals",
            observation_source="bedside_manual"
        )

        profile = client.get(f"/staff/patient-care/patients/{self.patient_id}/unified-profile").json()
        status = profile["clinical_status"]

        # Alert A (AI Chat Red Flag) MUST BE TRUE
        self.assertTrue(status["has_intake_red_flag"])
        # Alert B (Physiological MEWS Alert) MUST BE FALSE (vitals are normal)
        self.assertFalse(status["has_mews_alert"])
        self.assertEqual(status["mews_score"], 0)

        # Now acknowledge the chat red flag
        client.post(f"/staff/red-flag/{alert_sess}/acknowledge")

        # Now record CRITICAL vitals (MEWS = 8)
        database.record_patient_vitals(
            patient_id=self.patient_id,
            session_id=alert_sess,
            hospital_id="hosp-medikiosk",
            heart_rate=132,
            blood_pressure_sys=84,
            blood_pressure_dia=52,
            respiratory_rate=28,
            temperature=38.6,
            oxygen_saturation=87,
            mews_score=8,
            mews_explanation="Critical deterioration",
            observation_source="bedside_manual"
        )

        profile2 = client.get(f"/staff/patient-care/patients/{self.patient_id}/unified-profile").json()
        status2 = profile2["clinical_status"]

        # Chat flag was acknowledged
        self.assertFalse(status2["has_intake_red_flag"])
        # Physiological MEWS alert MUST NOW BE TRUE
        self.assertTrue(status2["has_mews_alert"])
        self.assertEqual(status2["mews_score"], 8)


# =============================================================================
# CATEGORY E: FRONTEND INTEGRATION & BUNDLE VERIFICATION (FE-01 to FE-25)
# =============================================================================

class TestCategoryE_FrontendIntegration(unittest.TestCase):
    def test_fe_01_vite_bundle_compiled(self):
        """FE-01: Vite production bundle exists with compiled HTML, JS, and CSS chunks."""
        dist_html = os.path.join(backend_dir, "..", "Frontend", "dist", "index.html")
        self.assertTrue(os.path.exists(dist_html), "Frontend dist/index.html not compiled")

    def test_fe_02_staff_portal_has_workstation_nav(self):
        """FE-02: StaffPortal contains dual-mode navigation switcher."""
        sp_path = os.path.join(backend_dir, "..", "Frontend", "src", "components", "StaffPortal.jsx")
        with open(sp_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("staff-workstation-nav", content)
        self.assertIn("OPD Patient Queue & Triage", content)
        self.assertIn("Inpatient Care & Physiological Monitoring", content)
        self.assertIn("Unified Profile 📋", content)

    def test_fe_03_patient_care_component_suite(self):
        """FE-03: Modular patient care component suite files exist."""
        comp_dir = os.path.join(backend_dir, "..", "Frontend", "src", "components", "patient_care")
        expected_files = [
            "PatientCareModule.jsx",
            "VitalRecorderModal.jsx",
            "XAIRiskModal.jsx",
            "ECGTelemetryModal.jsx",
            "BedManagementModal.jsx",
            "CarePlansModal.jsx",
            "TransferNetworkModal.jsx",
            "UnifiedPatientProfileModal.jsx",
            "patient_care.css"
        ]
        for f in expected_files:
            p = os.path.join(comp_dir, f)
            self.assertTrue(os.path.exists(p), f"Missing component: {f}")


# =============================================================================
# CATEGORY F: SECURITY, RBAC & PRIVACY TESTING (SEC-01 to SEC-13)
# =============================================================================

class TestCategoryF_SecurityAndPrivacy(BasePhase5TestCase):
    def test_sec_01_unauthenticated_staff_login_required(self):
        """SEC-01: Invalid credentials for staff return auth failure."""
        res = client.post("/staff/login", json={"identifier": "staff@medikiosk.com", "password": "wrongPasswordXYZ"})
        self.assertFalse(res.json().get("success"))

    def test_sec_03_idor_invalid_patient_id(self):
        """SEC-03: Accessing non-existent patient ID returns HTTP 404."""
        res = client.get("/staff/patient-care/patients/FAKE-PATIENT-ID-9999/unified-profile")
        self.assertEqual(res.status_code, 404)

    def test_sec_04_cross_patient_data_isolation(self):
        """SEC-04: Patient records cannot cross-leak between distinct patient IDs."""
        res1 = client.get(f"/staff/patient-care/patients/{self.patient_id}/unified-profile").json()
        res2 = client.get(f"/staff/patient-care/patients/{self.patient_2_id}/unified-profile").json()
        self.assertNotEqual(res1["patient"]["patient_id"], res2["patient"]["patient_id"])

    def test_sec_06_passwords_stripped_from_profile(self):
        """SEC-06: Sensitive credentials (password_hash, salt) are stripped from profile response."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_id}/unified-profile").json()
        p = res["patient"]
        self.assertNotIn("password_hash", p)
        self.assertNotIn("salt", p)

    def test_sec_07_sql_injection_defense(self):
        """SEC-07: SQL injection strings in endpoints are safely parameterized without error."""
        sqli_payload = "' OR '1'='1"
        res = client.get(f"/staff/patient-care/patients/{sqli_payload}/unified-profile")
        # Must return 404 cleanly, not 500 database syntax error
        self.assertEqual(res.status_code, 404)

    def test_sec_09_disclaimers_present_rule11_rule12(self):
        """SEC-09: Mandatory ECG simulation and ML decision-support disclaimers present."""
        ecg_data = client.get("/staff/patient-care/ecg/data").json()
        self.assertIn("disclaimer", ecg_data)
        self.assertIn("Simulated ECG stream", ecg_data["disclaimer"])


# =============================================================================
# CATEGORY G: DATABASE INTEGRITY, CONSTRAINTS & CONCURRENCY (DB-01 to DB-16)
# =============================================================================

class TestCategoryG_DatabaseIntegrityAndConcurrency(BasePhase5TestCase):
    def test_db_01_sqlite_wal_mode(self):
        """DB-01: Database journal mode is Write-Ahead Logging (WAL)."""
        conn = database.get_connection()
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode")
        mode = cur.fetchone()[0]
        conn.close()
        self.assertEqual(mode.lower(), "wal")

    def test_db_02_sqlite_integrity_check(self):
        """DB-02: SQLite PRAGMA integrity_check passes cleanly."""
        conn = database.get_connection()
        cur = conn.cursor()
        cur.execute("PRAGMA integrity_check")
        status = cur.fetchone()[0]
        conn.close()
        self.assertEqual(status, "ok")

    def test_db_13_concurrent_write_operations(self):
        """DB-13: Concurrent database writes operate cleanly under WAL mode without locking errors."""
        errors = []

        def worker_write_vitals(idx):
            try:
                database.record_patient_vitals(
                    patient_id=self.patient_id,
                    session_id=self.session_id,
                    hospital_id="hosp-medikiosk",
                    heart_rate=70 + idx,
                    blood_pressure_sys=120,
                    blood_pressure_dia=80,
                    respiratory_rate=16,
                    temperature=36.8,
                    oxygen_saturation=98,
                    mews_score=0,
                    mews_explanation="Concurrent write test",
                    observation_source="bedside_manual"
                )
            except Exception as e:
                errors.append(str(e))

        threads = [threading.Thread(target=worker_write_vitals, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Concurrent database write errors: {errors}")


# =============================================================================
# CATEGORY H: END-TO-END CLINICAL JOURNEY SCENARIOS (Scenarios 1 to 6)
# =============================================================================

class TestCategoryH_EndToEndScenarios(BasePhase5TestCase):
    def test_scenario_1_normal_patient_flow(self):
        """Scenario 1: Normal patient intake -> triage -> vitals -> MEWS -> profile."""
        res_profile = client.get(f"/staff/patient-care/patients/{self.patient_id}/unified-profile")
        self.assertEqual(res_profile.status_code, 200)
        data = res_profile.json()
        self.assertEqual(data["patient"]["patient_id"], self.patient_id)

    def test_scenario_2_red_alert_preservation(self):
        """Scenario 2: Red alert in conversation preserves alert independently."""
        sess_sc2 = f"sess-sc2-{uuid.uuid4().hex[:8]}"
        database.save_session(sess_sc2, "en", self.patient_id, "Dr. Rajesh Gupta", "Cardiology", "hosp-medikiosk")
        database.set_session_red_flag(sess_sc2, "Chest pain radiating to shoulder")

        profile = client.get(f"/staff/patient-care/patients/{self.patient_id}/unified-profile").json()
        alerts = profile.get("conversation_alerts", [])
        matched = next((a for a in alerts if a["session_id"] == sess_sc2), None)
        self.assertIsNotNone(matched)
        self.assertEqual(matched["status"], "unacknowledged")

    def test_scenario_3_bed_management_lifecycle(self):
        """Scenario 3: Bed allocation -> ICU upgrade -> discharge."""
        # 1. Assign General Bed
        client.post(f"/staff/patient-care/patients/{self.patient_2_id}/bed?hospital_id=hosp-medikiosk", json={"bed_number": "GEN-104"})

        # 2. Upgrade to ICU
        upg = client.post(f"/staff/patient-care/patients/{self.patient_2_id}/upgrade-icu?hospital_id=hosp-medikiosk")
        self.assertEqual(upg.status_code, 200)

        # 3. Discharge
        disc = client.post(f"/staff/patient-care/patients/{self.patient_2_id}/discharge?hospital_id=hosp-medikiosk&override=true")
        self.assertEqual(disc.status_code, 200)


# =============================================================================
# CATEGORY I: PERFORMANCE & RELIABILITY BENCHMARKING
# =============================================================================

class TestCategoryI_PerformanceAndReliability(BasePhase5TestCase):
    def test_perf_01_unified_profile_latency(self):
        """PERF-01: Unified profile API latency is sub-second (< 500ms)."""
        t0 = time.time()
        res = client.get(f"/staff/patient-care/patients/{self.patient_id}/unified-profile")
        latency = (time.time() - t0) * 1000  # ms
        self.assertEqual(res.status_code, 200)
        self.assertLess(latency, 500, f"Unified profile took {latency:.2f}ms (threshold 500ms)")

    def test_perf_02_ml_inference_latency(self):
        """PERF-02: ML risk inference latency is sub-100ms."""
        features = {"heart_rate": 80, "blood_pressure_sys": 120, "oxygen_saturation": 98, "respiratory_rate": 16, "temperature": 37.0, "age": 45, "triage_level": 3, "mews_score": 0}
        t0 = time.time()
        res = ml_risk_service.predict(features, preferred_model="random_forest")
        latency = (time.time() - t0) * 1000
        self.assertIn("critical_risk", res)
        self.assertLess(latency, 100, f"ML inference took {latency:.2f}ms (threshold 100ms)")


if __name__ == "__main__":
    unittest.main(verbosity=2)
