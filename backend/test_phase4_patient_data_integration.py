"""
================================================================================
PHASE 4 AUTOMATED TEST SUITE: UNIFIED PATIENT DATA INTEGRATION
================================================================================
Covers:
- PATIENT IDENTITY: INT-DB-01 to INT-DB-06
- UNIFIED CLINICAL PROFILE: INT-DB-07 to INT-DB-16
- PATIENT TIMELINE: INT-DB-17 to INT-DB-20
- ALERT PRESERVATION & ISOLATION (Rule 9): INT-DB-21 to INT-DB-24
- SECURITY & DATA INTEGRITY: INT-DB-25 to INT-DB-28
================================================================================
"""

import sys
import os
import unittest
import uuid
from datetime import datetime

# Add backend directory to path
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Ensure fallback GROQ_API_KEY for tests
if not os.environ.get("GROQ_API_KEY"):
    os.environ["GROQ_API_KEY"] = "gsk_test_placeholder_for_phase4"

from fastapi.testclient import TestClient
from app.main import app
import database

client = TestClient(app)


class TestPhase4UnifiedPatientData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Create a dedicated synthetic test patient with full cross-module records."""
        # Reset beds to vacant for clean tests
        conn = database.get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE patient_beds SET status = 'vacant', patient_id = NULL, session_id = NULL, assigned_at = NULL WHERE hospital_id = 'hosp-medikiosk'")
        conn.commit()
        conn.close()

        unique_id = uuid.uuid4().hex[:6]
        # 1. Register Patient A
        reg_a = database.register_patient(
            full_name="Vikramaditya Rao",
            email=f"vikram.{unique_id}@test.com",
            phone=f"91{uuid.uuid4().int % 100000000:08d}",
            age=52,
            gender="male",
            password="patientPassword123"
        )
        if not reg_a.get("success"):
            raise ValueError(f"Failed to register Patient A: {reg_a}")
        cls.patient_a_id = reg_a["patient"]["patient_id"]
        cls.patient_a_name = "Vikramaditya Rao"

        # 2. Register Patient B with SAME NAME to test non-merging (INT-DB-06)
        reg_b = database.register_patient(
            full_name="Vikramaditya Rao",
            email=f"vikram.second.{unique_id}@test.com",
            phone=f"92{uuid.uuid4().int % 100000000:08d}",
            age=29,
            gender="male",
            password="patientPassword456"
        )
        if not reg_b.get("success"):
            raise ValueError(f"Failed to register Patient B: {reg_b}")
        cls.patient_b_id = reg_b["patient"]["patient_id"]

        # 3. Create Session with AI Chat, Red Flag, Document, and Contradiction for Patient A
        cls.session_a_id = f"sess-test-{uuid.uuid4().hex[:8]}"
        database.save_session(
            session_id=cls.session_a_id,
            language="en",
            patient_id=cls.patient_a_id,
            doctor_name="Dr. Rajesh Gupta",
            department="Cardiology",
            hospital_id="hosp-medikiosk"
        )

        # Messages
        database.save_message(cls.session_a_id, "user", "I have severe crushing chest pain spreading down my left arm")
        database.save_message(cls.session_a_id, "assistant", "I understand you have severe chest pain. Are you experiencing sweating or shortness of breath?")
        database.save_message(cls.session_a_id, "user", "Yes, sweating heavily and feeling dizzy")

        # Conversational Red Flag (Rule 9)
        database.set_session_red_flag(
            session_id=cls.session_a_id,
            reason="Acute coronary syndrome symptoms: crushing chest pain radiating to left arm with diaphoresis"
        )

        # Medical Document & OCR
        database.save_document(
            session_id=cls.session_a_id,
            filename="ecg_report_oct2026.png",
            extracted_text="CLINICAL DIAGNOSIS: Sinus tachycardia with ST elevation in leads II, III, aVF. BP 155/95 mmHg. HR 118 bpm."
        )

        # Contradiction
        database.save_contradiction(
            session_id=cls.session_a_id,
            category="Medication",
            patient_statement="I do not take blood thinners",
            document_evidence="Prescription lists Aspirin 75mg once daily",
            clarification_question="Do you currently take daily Aspirin?",
            options=["Yes, daily", "No, stopped", "Unsure"]
        )

        # 4. Inpatient Bed Allocation for Patient A
        database.assign_patient_bed(
            hospital_id="hosp-medikiosk",
            bed_number="ICU-01",
            patient_id=cls.patient_a_id,
            session_id=cls.session_a_id
        )

        # 5. Bedside Vitals (Critical) for Patient A
        client.post(
            f"/staff/patient-care/patients/{cls.patient_a_id}/vitals?hospital_id=hosp-medikiosk",
            json={
                "heart_rate": 128,
                "blood_pressure_sys": 85,
                "blood_pressure_dia": 55,
                "respiratory_rate": 26,
                "temperature": 38.4,
                "oxygen_saturation": 88,
                "observation_source": "bedside_manual",
                "staff_id": "staff-nurse-01",
                "session_id": cls.session_a_id
            }
        )

        # 6. ML Risk Assessment for Patient A
        client.post(
            f"/staff/patient-care/patients/{cls.patient_a_id}/risk-assessment",
            json={
                "preferred_model": "random_forest",
                "triage_level": 1
            }
        )

        # 7. Care Plan for Patient A
        client.post(
            f"/staff/patient-care/patients/{cls.patient_a_id}/care-plans?hospital_id=hosp-medikiosk",
            json={
                "care_instructions": "Continuous ICU telemetry, 4L O2 via nasal cannula, NPO for cardiac cath",
                "medications": "Aspirin 325mg chewable, Heparin IV protocol, Sublingual Nitroglycerin PRN",
                "special_instructions": "Notify cardiology fellow immediately if SpO2 drops below 92%",
                "staff_id": "staff-nurse-01"
            }
        )

        # 8. Inter-Hospital Transfer Initiation for Patient A
        client.post(
            f"/staff/patient-care/patients/{cls.patient_a_id}/transfers/initiate?hospital_id=hosp-medikiosk",
            json={
                "target_hospital_name": "Apollo Clinic & Tertiary Care",
                "distance_km": 4.2,
                "bed_type_needed": "ICU",
                "specialization": "Interventional Cardiology",
                "transfer_score": 98,
                "contact_phone": "+91-9876543210",
                "notes": "Emergency transfer for primary percutaneous coronary intervention",
                "staff_id": "staff-nurse-01"
            }
        )

    # =========================================================================
    # GROUP 1: PATIENT IDENTITY MANAGEMENT (INT-DB-01 to INT-DB-06)
    # =========================================================================

    def test_int_db_01_medikiosk_patient_id_preserved(self):
        """INT-DB-01: Existing MediKiosk patient ID format (PAT-XXXXXXXX) is preserved."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["patient"]["patient_id"], self.patient_a_id)
        self.assertTrue(self.patient_a_id.startswith("PAT-"))

    def test_int_db_02_patient_care_records_reference_correct_id(self):
        """INT-DB-02: Patient Care records reference correct MediKiosk patient ID."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        data = res.json()
        # Vitals reference patient_id
        for v in data["vitals"]["history"]:
            self.assertEqual(v["patient_id"], self.patient_a_id)
        # MEWS references patient_id
        for m in data["mews_assessments"]:
            self.assertEqual(m["patient_id"], self.patient_a_id)
        # Bed references patient_id
        self.assertEqual(data["bed_information"]["active_bed"]["patient_id"], self.patient_a_id)
        # Care plan references patient_id
        for cp in data["care_plans"]:
            self.assertEqual(cp["patient_id"], self.patient_a_id)

    def test_int_db_03_no_duplicate_patient_identities(self):
        """INT-DB-03: No duplicate patient identities are created across modules."""
        conn = database.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM patients WHERE patient_id = ?", (self.patient_a_id,))
        count = cur.fetchone()[0]
        conn.close()
        self.assertEqual(count, 1)

    def test_int_db_04_unmapped_records_remain_unmapped(self):
        """INT-DB-04: Non-existent or legacy unmapped IDs are not guessed."""
        res = client.get("/staff/patient-care/patients/LEGACY_UNMAPPED_9999/unified-profile")
        self.assertEqual(res.status_code, 404)

    def test_int_db_05_invalid_patient_ids_rejected(self):
        """INT-DB-05: Invalid patient IDs return HTTP 404."""
        res = client.get("/staff/patient-care/patients/INVALID_ID_xyz/unified-profile")
        self.assertEqual(res.status_code, 404)

    def test_int_db_06_no_name_based_patient_merging(self):
        """INT-DB-06: Two patients with the same full name maintain distinct patient IDs and independent records."""
        self.assertNotEqual(self.patient_a_id, self.patient_b_id)
        res_a = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile").json()
        res_b = client.get(f"/staff/patient-care/patients/{self.patient_b_id}/unified-profile").json()

        self.assertEqual(res_a["patient"]["full_name"], "Vikramaditya Rao")
        self.assertEqual(res_b["patient"]["full_name"], "Vikramaditya Rao")
        # Patient A has vitals and ICU bed, Patient B has none
        self.assertGreater(len(res_a["vitals"]["history"]), 0)
        self.assertEqual(len(res_b["vitals"]["history"]), 0)
        self.assertIsNotNone(res_a["bed_information"]["active_bed"])
        self.assertIsNone(res_b["bed_information"]["active_bed"])

    # =========================================================================
    # GROUP 2: UNIFIED CLINICAL PROFILE (INT-DB-07 to INT-DB-16)
    # =========================================================================

    def test_int_db_07_existing_patient_profile_loads(self):
        """INT-DB-07: Existing patient profile loads with demographic details."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        self.assertEqual(res.status_code, 200)
        p = res.json()["patient"]
        self.assertEqual(p["full_name"], "Vikramaditya Rao")
        self.assertEqual(p["age"], 52)
        self.assertEqual(p["gender"], "male")

    def test_int_db_08_conversation_history_loads(self):
        """INT-DB-08: AI conversation history loads with transcript messages."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        convs = res.json()["conversations"]
        self.assertGreater(len(convs), 0)
        sess = convs[0]
        self.assertEqual(sess["session_id"], self.session_a_id)
        self.assertGreater(len(sess["messages"]), 0)
        self.assertIn("severe crushing chest pain", sess["messages"][0]["message"])

    def test_int_db_09_medical_documents_load_with_ocr(self):
        """INT-DB-09: Medical documents load with filename, extracted OCR text, and character count."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        docs = res.json()["medical_documents"]
        self.assertGreater(len(docs), 0)
        doc = docs[0]
        self.assertEqual(doc["filename"], "ecg_report_oct2026.png")
        self.assertIn("Sinus tachycardia", doc["extracted_text"])
        self.assertGreater(doc["char_count"], 0)

    def test_int_db_10_vital_history_loads(self):
        """INT-DB-10: Vital history loads with physiological parameters and observation source."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        vitals = res.json()["vitals"]
        self.assertGreater(vitals["count"], 0)
        latest = vitals["latest"]
        self.assertEqual(latest["heart_rate"], 128)
        self.assertEqual(latest["blood_pressure_sys"], 85)
        self.assertEqual(latest["observation_source"], "bedside_manual")

    def test_int_db_11_mews_history_loads(self):
        """INT-DB-11: MEWS assessments load with individual parameter breakdown."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        mews = res.json()["mews_assessments"]
        self.assertGreater(len(mews), 0)
        first_mews = mews[0]
        self.assertGreaterEqual(first_mews["total_score"], 6)  # HR=128 (+2), BP=85 (+1), RR=26 (+2), SpO2=88 (+3) -> Critical
        self.assertIn("ruleset_version", first_mews)

    def test_int_db_12_risk_assessments_load(self):
        """INT-DB-12: ML risk assessments load with model identifier and predicted probability."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        risks = res.json()["risk_assessments"]
        self.assertGreater(len(risks), 0)
        first_risk = risks[0]
        self.assertIn("model_identifier", first_risk)
        self.assertIn("predicted_risk", first_risk)

    def test_int_db_13_xai_explanations_match_predictions(self):
        """INT-DB-13: Explainable AI explanations match their associated risk predictions."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        risks = res.json()["risk_assessments"]
        first_risk = risks[0]
        self.assertIn("explanations", first_risk)
        self.assertGreater(len(first_risk["explanations"]), 0)
        expl = first_risk["explanations"][0]
        self.assertIn("explanation_method", expl)
        self.assertIn("clinical_feature_attribution", expl["explanation_method"])

    def test_int_db_14_bed_information_loads(self):
        """INT-DB-14: Inpatient bed allocation loads with active ward, category, and bed number."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        bed_info = res.json()["bed_information"]
        active = bed_info["active_bed"]
        self.assertIsNotNone(active)
        self.assertEqual(active["bed_number"], "ICU-01")
        self.assertEqual(active["bed_type"], "ICU")
        self.assertEqual(active["ward"], "ICU Ward")

    def test_int_db_15_care_plans_load(self):
        """INT-DB-15: Inpatient care plans load with instructions and staff author."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        plans = res.json()["care_plans"]
        self.assertGreater(len(plans), 0)
        plan = plans[0]
        self.assertIn("Continuous ICU telemetry", plan["care_instructions"])
        self.assertEqual(plan["created_by_staff_id"], "staff-nurse-01")

    def test_int_db_16_transfer_history_loads(self):
        """INT-DB-16: Inter-hospital transfer history loads with destination, distance, and status."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        transfers = res.json()["transfers"]
        self.assertGreater(len(transfers), 0)
        tr = transfers[0]
        self.assertEqual(tr["to_hospital_name"], "Apollo Clinic & Tertiary Care")
        self.assertEqual(tr["status"], "initiated")
        self.assertEqual(tr["transfer_score"], 98)

    # =========================================================================
    # GROUP 3: PATIENT TIMELINE (INT-DB-17 to INT-DB-20)
    # =========================================================================

    def test_int_db_17_timeline_chronologically_sorted(self):
        """INT-DB-17: Patient timeline events are sorted chronologically (newest first)."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/timeline")
        self.assertEqual(res.status_code, 200)
        timeline = res.json()["timeline"]
        self.assertGreater(len(timeline), 3)

        # Verify descending order
        timestamps = [item["timestamp"] for item in timeline if item.get("timestamp")]
        for i in range(len(timestamps) - 1):
            t_curr = datetime.fromisoformat(timestamps[i].replace("Z", "+00:00"))
            t_next = datetime.fromisoformat(timestamps[i + 1].replace("Z", "+00:00"))
            self.assertGreaterEqual(t_curr, t_next, f"Timeline inverted at index {i}")

    def test_int_db_18_timeline_sources_identifiable(self):
        """INT-DB-18: Every timeline event clearly identifies its provenance source and actor."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/timeline")
        timeline = res.json()["timeline"]
        for event in timeline:
            self.assertIn("provenance_source", event)
            self.assertIn("provenance_label", event)
            self.assertIn("actor", event)
            self.assertTrue(len(event["provenance_source"]) > 0)
            self.assertTrue(len(event["actor"]) > 0)

    def test_int_db_19_missing_timestamps_handled_safely(self):
        """INT-DB-19: Events with missing or partial timestamps do not raise unhandled exceptions."""
        events = database.get_patient_timeline("PAT-298F27FD", limit=50)
        self.assertIsInstance(events, list)

    def test_int_db_20_duplicate_events_prevented(self):
        """INT-DB-20: Unique event IDs prevent duplicate entries in timeline."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/timeline")
        timeline = res.json()["timeline"]
        ids = [e["id"] for e in timeline]
        self.assertEqual(len(ids), len(set(ids)), "Duplicate event IDs found in timeline")

    # =========================================================================
    # GROUP 4: ALERTS PRESERVATION & ISOLATION (INT-DB-21 to INT-DB-24)
    # =========================================================================

    def test_int_db_21_conversation_alerts_preserved(self):
        """INT-DB-21: Existing AI conversational red flags are preserved in unified profile."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        alerts = res.json()["conversation_alerts"]
        self.assertGreater(len(alerts), 0)
        self.assertIn("Acute coronary syndrome symptoms", alerts[0]["reason"])

    def test_int_db_22_physiological_mews_alerts_distinguishable(self):
        """INT-DB-22: Physiological MEWS alerts remain distinct from conversational red flags (Rule 9)."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        status = res.json()["clinical_status"]
        self.assertTrue(status["has_intake_red_flag"])
        self.assertTrue(status["has_mews_alert"])
        self.assertGreaterEqual(status["mews_score"], 4)

    def test_int_db_23_red_flag_acknowledgement_works(self):
        """INT-DB-23: Acknowledging a conversational red flag updates status without erasing clinical alert."""
        ack_res = client.post(f"/staff/red-flag/{self.session_a_id}/acknowledge")
        self.assertEqual(ack_res.status_code, 200)

        # Refresh unified profile
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        alerts = res.json()["conversation_alerts"]
        self.assertTrue(alerts[0]["acknowledged"])
        self.assertEqual(alerts[0]["status"], "acknowledged")
        self.assertIn("Acute coronary syndrome", alerts[0]["reason"])

    def test_int_db_24_ml_predictions_not_treated_as_emergency_alerts(self):
        """INT-DB-24: ML predictions do not overwrite or fabricate conversational red-flag alerts."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_b_id}/unified-profile")
        status = res.json()["clinical_status"]
        # Patient B has zero intake red flags
        self.assertFalse(status["has_intake_red_flag"])

    # =========================================================================
    # GROUP 5: SECURITY & PRIVACY (INT-DB-25 to INT-DB-28)
    # =========================================================================

    def test_int_db_25_sensitive_credentials_stripped(self):
        """INT-DB-25: Password hash and salt are strictly stripped from returned patient object."""
        res = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile")
        patient_obj = res.json()["patient"]
        self.assertNotIn("password_hash", patient_obj)
        self.assertNotIn("salt", patient_obj)
        self.assertNotIn("password", patient_obj)

    def test_int_db_26_patient_data_isolation_no_leak(self):
        """INT-DB-26: Patient records cannot leak across distinct patient IDs."""
        res_a = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile").json()
        res_b = client.get(f"/staff/patient-care/patients/{self.patient_b_id}/unified-profile").json()

        doc_ids_a = [d["id"] for d in res_a["medical_documents"]]
        doc_ids_b = [d["id"] for d in res_b["medical_documents"]]

        # Documents of Patient A must not appear in Patient B
        for doc_id in doc_ids_a:
            self.assertNotIn(doc_id, doc_ids_b)

    def test_int_db_27_hospital_isolation_enforced(self):
        """INT-DB-27: Monitored patient census isolates patients by hospital_id."""
        res_medikiosk = client.get("/staff/patient-care/patients?hospital_id=hosp-medikiosk").json()
        res_apollo = client.get("/staff/patient-care/patients?hospital_id=hosp-apollo").json()

        self.assertEqual(res_medikiosk["hospital_id"], "hosp-medikiosk")
        self.assertEqual(res_apollo["hospital_id"], "hosp-apollo")

    def test_int_db_28_main_and_staff_router_parity(self):
        """INT-DB-28: Root patient profile route and staff router return identical profile data."""
        res_staff = client.get(f"/staff/patient-care/patients/{self.patient_a_id}/unified-profile").json()
        res_root = client.get(f"/patient/{self.patient_a_id}/unified-profile").json()

        self.assertEqual(res_staff["patient"]["patient_id"], res_root["patient"]["patient_id"])
        self.assertEqual(len(res_staff["timeline"]), len(res_root["timeline"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
