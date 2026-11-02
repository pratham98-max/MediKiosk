# DOCTOR PORTAL USER GUIDE
## MediKiosk Clinical Consultation & EMR Archival
**Document Version:** 1.0  
**Date:** November 2, 2026  

---

## 1. Doctor Authentication & Consultation Room Setup

1. Navigate to `http://localhost:5173` and click **Doctor Portal** in the navigation header.
2. Select your clinical identity and specialty from the doctor directory:
   - Example: `Dr. Rajesh Gupta - Cardiology` (Room 102)
   - Example: `Dr. Priya Sharma - General Medicine` (Room 105)
3. Your doctor workstation displays patients who have completed AI intake and are waiting in your OPD queue.

---

## 2. Patient OTP Verification (Consultation Unlock)

To preserve strict patient privacy, a patient's AI intake summary and clinical notes remain locked until the patient is physically seated in your consultation room:

1. Request the **6-digit OTP code** displayed on the patient's mobile phone or intake printout.
2. Enter the 6 digits in the verification box and click **Unlock Patient Encounter**.
3. Upon validation:
   - Patient status shifts from `ready_for_opd` to `in_consultation`.
   - The full intake summary, medical documents, OCR extracts, and AI conversation unlock immediately.

---

## 3. Clinical Case Review & Contradiction Resolution

The consultation workspace presents:
- **Patient Demographics:** Age, gender, emergency contacts, registration ID (`PAT-XXXXXXXX`).
- **AI-Extracted Clinical Summary:** Chief complaint, symptom timeline, severity, pain score.
- **Uploaded Medical Documents & OCR:** View uploaded lab reports, discharge summaries, or imaging reports with character-level extracted text.
- **Contradiction Alerts:** If discrepancies were detected between the patient's statements and uploaded documents (e.g. drug allergy statements), review the clarification question and patient response.
- **Physiological Vitals & MEWS Trends:** Review bedside observations, MEWS deterioration risk scores, and XAI feature attributions recorded by nursing staff.

---

## 4. Clinical Decision Authority & Direct Note Editing (Zero-AI Overwrite)

> [!IMPORTANT]
> **Zero-AI Overwrite Principle:**  
> The doctor possesses absolute clinical authority. Any notes, diagnoses, or prescriptions entered by the doctor are saved directly to the database. External LLMs are never permitted to summarize, alter, or overwrite a physician's finalized clinical judgment.

1. Review the draft clinical notes in the editable context box.
2. Modify symptoms, add clinical examination findings (e.g. *"systolic murmur radiating to axilla"*), specify diagnoses, and write prescriptions.
3. Click **Save Clinical Notes**. The database records your exact input without LLM intervention.

---

## 5. Finalizing Encounters & Hospital EMR Archival

1. When consultation is complete, click **Finalize & Commit to Hospital EMR**.
2. The encounter:
   - Status updates to `completed`.
   - Creates an immutable record in `emr_records` with an encounter timestamp.
   - Clears the patient from your active waiting room queue.
   - Appends the finalized consultation encounter to the patient's **Unified Patient Profile** and chronological timeline.
