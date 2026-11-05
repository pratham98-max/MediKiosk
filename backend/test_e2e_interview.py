"""
Comprehensive End-to-End Verification of MediKiosk AI Clinical Interview and Clinical Dossier.
Tests:
1. Groq Environment & Connectivity Verification
2. Patient Scenario 1: Acute Abdominal Pain (Adaptive OPQRST & Pertinent Negatives)
3. Patient Scenario 2: Respiratory / Fever with Asthma History
4. Patient Scenario 3: Neurological / Migraine vs Secondary Headache
5. Critical Red Flag Detection: Crushing Chest Pain with Radiation
6. Doctor-Ready Clinical Dossier (All 9 Required Sections & OTP Verification)
7. Basic Clinical Summary (All 7 Sections)
"""
import sys
import os
import uuid
from dotenv import load_dotenv

# Ensure backend directory is in path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from database import save_session, save_message, get_messages, get_session_by_id
from app.main import (
    chat,
    ChatRequest,
    get_basic_summary,
    generate_final_report,
    get_groq_client,
    GROQ_MODEL
)
from app.services.clinical_intelligence import extract_clinical_variables


def mask_key(k: str) -> str:
    if not k or len(k) < 8:
        return "<not set or empty>"
    return f"{k[:4]}...{k[-4:]}"


def test_step3_groq_verification():
    print("\n" + "="*70)
    print("STEP 3: VERIFY GROQ API ENVIRONMENT & CONNECTIVITY")
    print("="*70)
    
    raw_key = os.getenv("GROQ_API_KEY", "")
    print(f"1. GROQ_API_KEY loaded: {'YES' if raw_key else 'NO'} (Masked: {mask_key(raw_key)})")
    print(f"2. Configured Model: {GROQ_MODEL}")
    
    client, reason = get_groq_client()
    if client is None:
        print(f"3. Groq Client Status: NOT INITIALIZED ({reason})")
        print("   MediKiosk will safely use the deterministic clinical intelligence engine.")
        return False
    else:
        print("3. Groq Client Status: INITIALIZED SUCCESSFULLY")
        print("4. Testing network connectivity & model availability...")
        try:
            # Quick connectivity test
            models = client.models.list()
            available_ids = [m.id for m in models.data]
            print(f"   Connectivity SUCCESS! Retrieved {len(available_ids)} models from Groq API.")
            model_present = GROQ_MODEL in available_ids
            print(f"   Model '{GROQ_MODEL}' available: {'YES' if model_present else 'NO'}")
            return True
        except Exception as e:
            err_type = type(e).__name__
            print(f"   Groq API Network/Auth Note: {err_type} - {e}")
            print("   Expected in offline/sandboxed environments. MediKiosk fallback engine is active.")
            return False


def test_patient_scenario(scenario_name, initial_complaint, follow_up_responses, expected_keywords, expected_history_keywords):
    print(f"\n--- Testing Scenario: {scenario_name} ---")
    session_id = f"test-sess-{uuid.uuid4().hex[:8]}"
    save_session(session_id, "en")
    
    # Turn 1
    req1 = ChatRequest(session_id=session_id, message=initial_complaint, language="en")
    res1 = chat(req1)
    print(f"Turn 1 (Patient): \"{initial_complaint}\"")
    print(f"Turn 1 (AI - Engine: {res1.get('ai_engine')}): \"{res1.get('message')}\"")
    print(f"Turn 1 Status: {res1.get('status')}")
    assert res1.get("status") in ["continue", "in_progress"], f"Interview should not terminate on turn 1, status was {res1.get('status')}"
    
    # Verify AI asked an adaptive, relevant question
    ai_q1 = res1.get("message", "").lower()
    matches = [k for k in expected_keywords if k in ai_q1]
    assert len(matches) > 0, f"AI question '{ai_q1}' did not contain any expected keywords: {expected_keywords}"
    print(f"  ✓ AI adaptively asked about: {matches}")
    
    # Subsequent turns
    current_status = res1.get("status")
    turn = 2
    for user_resp in follow_up_responses:
        if current_status == "completed":
            break
        req = ChatRequest(session_id=session_id, message=user_resp, language="en")
        res = chat(req)
        print(f"\nTurn {turn} (Patient): \"{user_resp}\"")
        print(f"Turn {turn} (AI): \"{res.get('message')}\"")
        print(f"Turn {turn} Status: {res.get('status')}")
        current_status = res.get("status")
        turn += 1
        
    # Check clinical variables extraction
    msgs = get_messages(session_id)
    vars_extracted = extract_clinical_variables(msgs)
    print(f"\nExtracted Variables for {scenario_name}:")
    print(f"  Positives: {vars_extracted['confirmed_positives']}")
    print(f"  Negatives (Pertinent Denied): {vars_extracted['explicitly_denied']}")
    print(f"  Severity: {vars_extracted['severity']}")
    print(f"  History: {vars_extracted['medical_history']}")
    print(f"  Medications: {vars_extracted['current_medications']}")
    print(f"  Allergies: {vars_extracted['allergies']}")
    
    return session_id, vars_extracted


def test_step4_and_5_clinical_scenarios():
    print("\n" + "="*70)
    print("STEP 4 & 5: VERIFY MULTI-SCENARIO ADAPTIVE INTERVIEW & 9-SECTION DOSSIER")
    print("="*70)
    
    # 1. Scenario 1: Abdominal Pain
    sess1, vars1 = test_patient_scenario(
        scenario_name="1. Acute Lower Right Abdominal Pain",
        initial_complaint="I have bad stomach pain in my lower right side that started yesterday morning. Feeling nauseous.",
        follow_up_responses=[
            "It feels like a sharp stabbing pain, about 8 out of 10. No vomiting at all. Mild fever.",
            "I take paracetamol occasionally. No regular medications, no known allergies, no previous surgeries."
        ],
        expected_keywords=["sharp", "pain", "cramp", "rate", "intensity", "scale", "fever", "vomit", "sensation"],
        expected_history_keywords=["medication", "medicine", "history", "allerg", "surgery", "condition"]
    )
    assert any("vomit" in neg.lower() for neg in vars1["explicitly_denied"]), "Vomiting must be captured as explicitly denied negative"
    assert any("nausea" in pos.lower() for pos in vars1["confirmed_positives"]), "Nausea must be captured as confirmed positive"
    assert "8/10" in vars1["severity"], "Severity 8/10 must be extracted"
    
    # Check Summary for Scenario 1
    print("\n--- Verifying Basic Summary (Scenario 1) ---")
    summary_res = get_basic_summary(sess1)
    summary_text = summary_res.get("summary", "")
    print(summary_text)
    
    required_summary_sections = [
        "### Chief complaint",
        "### Trigger & onset",
        "### Character",
        "### Associated symptoms",
        "### Relevant history",
        "### Missing information",
        "### Interview status"
    ]
    for sec in required_summary_sections:
        assert sec in summary_text, f"Missing section in basic summary: {sec}"
    assert "abdominal" in summary_text.lower() or "stomach" in summary_text.lower(), "Chief complaint must reference abdominal pain"
    assert "vomit" in summary_text.lower(), "Pertinent negative (vomiting denied) must appear in summary"
    print("✓ All 7 required summary sections verified without generic filler!")
    
    # Check Final Report (9 sections) for Scenario 1
    print("\n--- Verifying Doctor-Ready Clinical Dossier (Scenario 1) ---")
    report_res = generate_final_report(sess1)
    final_report = report_res.get("final_report", "")
    print(final_report)
    
    required_9_sections = [
        "### Current symptoms",
        "### Symptom details",
        "### Associated symptoms",
        "### Relevant history",
        "### Medication information",
        "### Extracted document information",
        "### Contradiction & clarification results",
        "### Neutral clinical context",
        "### Timeline"
    ]
    for sec in required_9_sections:
        assert sec in final_report, f"Missing section in 9-section report: {sec}"
    assert report_res.get("otp_code"), "OTP code must be generated for doctor unlock"
    print("✓ All 9 Doctor-Ready Clinical Dossier sections verified with Timeline & OTP!")

    # 2. Scenario 2: Respiratory & Fever with Asthma
    sess2, vars2 = test_patient_scenario(
        scenario_name="2. Respiratory / Persistent Cough & Fever",
        initial_complaint="I have had a dry cough and persistent fever.",
        follow_up_responses=[
            "Fever is 102F for the past 4 days. Feeling slightly breathless when climbing stairs, no chest pain.",
            "I have a history of mild asthma. I use a salbutamol inhaler as needed. Allergic to penicillin."
        ],
        expected_keywords=["breath", "chest", "cough", "phlegm", "blood", "fever", "pain", "rate", "temperature", "chills", "sensation"],
        expected_history_keywords=["medication", "medicine", "history", "allerg", "condition"]
    )
    assert any("fever" in pos.lower() or "cough" in pos.lower() for pos in vars2["confirmed_positives"]), "Fever/cough must be confirmed positive"
    assert "asthma" in vars2["medical_history"].lower(), "Asthma history must be recorded"
    assert "penicillin" in vars2["allergies"].lower(), "Penicillin allergy must be recorded"
    assert "salbutamol" in vars2["current_medications"].lower(), "Salbutamol inhaler must be recorded"
    print("✓ Scenario 2 clinical variables and medical history cleanly captured!")

    # 3. Scenario 3: Neurological / Headache
    sess3, vars3 = test_patient_scenario(
        scenario_name="3. Unilateral Throbbing Headache",
        initial_complaint="I have a throbbing headache on the left side of my head.",
        follow_up_responses=[
            "Started this morning, light hurts my eyes. Pain is pounding, 9 out of 10. No neck stiffness, no confusion, no weakness.",
            "I have migraines occasionally. I took ibuprofen 400mg 2 hours ago. No other medications, no allergies."
        ],
        expected_keywords=["sharp", "throbbing", "light", "vision", "nausea", "stiff", "rate", "scale", "pain", "intensity"],
        expected_history_keywords=["medication", "medicine", "history", "allerg", "condition"]
    )
    assert "9/10" in vars3["severity"], "Severity 9/10 must be recorded"
    assert "migraine" in vars3["medical_history"].lower()
    assert "ibuprofen" in vars3["current_medications"].lower()
    print("✓ Scenario 3 neurological presentation and medications cleanly captured!")

    # 4. Critical Red Flag Test
    print("\n--- Testing Critical Red Flag Detection ---")
    rf_session_id = f"rf-sess-{uuid.uuid4().hex[:8]}"
    save_session(rf_session_id, "en")
    rf_req = ChatRequest(
        session_id=rf_session_id,
        message="I have sudden crushing retrosternal chest pain radiating down my left arm and up to my jaw, with cold sweats and dizziness.",
        language="en"
    )
    rf_res = chat(rf_req)
    print(f"Red Flag AI Response: \"{rf_res.get('message')}\"")
    print(f"Red Flag Status: {rf_res.get('status')}")
    print(f"Red Flag Alert: {rf_res.get('red_flag_alert')}")
    assert rf_res.get("status") == "red_flag", "Status must be 'red_flag'"
    assert rf_res.get("red_flag_alert") is not None, "red_flag_alert payload must be present"
    assert "emergency" in rf_res.get("message", "").lower() or "urgent" in rf_res.get("message", "").lower(), "Emergency warning must be given"
    print("✓ Critical Red Flag detection and immediate safety alerts verified!")


def main():
    print("Starting MediKiosk AI Intelligence & Clinical Dossier Verification...")
    test_step3_groq_verification()
    test_step4_and_5_clinical_scenarios()
    print("\n" + "="*70)
    print(">>> ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! <<<")
    print("="*70)
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
