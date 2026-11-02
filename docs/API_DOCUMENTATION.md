# API REFERENCE DOCUMENTATION
## MediKiosk + Patient Care Integrated Healthcare Platform
**Base URL:** `http://127.0.0.1:8000`  
**OpenAPI Spec:** `http://127.0.0.1:8000/docs` (Swagger UI)  
**Date:** November 2, 2026  

---

## 1. Overview & Authentication Model

The MediKiosk + Patient Care backend provides a unified RESTful API:
1. **Patient Intake Endpoints:** Public kiosk endpoints for patient self-registration and AI conversation.
2. **Staff Portal Endpoints:** Role-based endpoints for healthcare staff triage and inpatient monitoring.
3. **Doctor Portal Endpoints:** Attending physician endpoints for OTP verification, case notes, and EMR commits.
4. **Patient Care Sub-Router:** Inpatient physiological monitoring, Subbe MEWS scoring, ML risk prediction, bed allocation, care plans, and transfers under `/staff/patient-care/*`.

All responses return standard JSON. Sensitive patient credentials (`password_hash`, `salt`) are strictly stripped from all responses.

---

## 2. Core MediKiosk APIs (Existing Platform)

### Patient Registration & Authentication
- `POST /patient/register`
  - **Body:** `{"full_name": str, "age": int, "gender": str, "phone": str, "email": str, "password": str}`
  - **Response 200:** `{"success": true, "patient_id": "PAT-XXXXXXXX", "full_name": str}`
- `POST /patient/login`
  - **Body:** `{"phone": str, "password": str}`
  - **Response 200:** `{"success": true, "patient": {"patient_id": "PAT-XXXXXXXX", "full_name": str, ...}}`
- `POST /patient/session`
  - **Body:** `{"patient_id": str, "language": str, "doctor_name": str, "department": str, "hospital_id": str}`
  - **Response 200:** `{"success": true, "session_id": str, "created_at": str}`
- `POST /patient/message`
  - **Body:** `{"session_id": str, "message": str, "language": str}`
  - **Response 200:** `{"reply": str, "red_flag": bool, "red_flag_reason": str | null}`

### Staff Triage & Census Board
- `POST /staff/login`
  - **Body:** `{"identifier": str, "password": str}`
  - **Response 200:** `{"success": true, "staff": {"id": str, "name": str, "hospital_id": str, "role": str}}`
- `GET /staff/dashboard?hospital_id={hospital_id}`
  - **Response 200:** `{"total": int, "in_process": int, "ready_for_doctor": int, "in_consultation": int, "completed": int, "red_flag": int, "unacknowledged_red_flags": int}`
- `GET /staff/patients?hospital_id={hospital_id}&status={filter}`
  - **Response 200:** `{"patients": [{"session_id": str, "patient_id": str, "full_name": str, "status": str, "red_flag": int, "red_flag_acknowledged": int, ...}]}`
- `POST /staff/red-flag/{session_id}/acknowledge`
  - **Response 200:** `{"success": true, "session_id": str, "acknowledged_at": str}`

### Doctor Consultation & EMR Archival
- `GET /doctor/sessions?doctor_name={name}&department={dept}`
  - **Response 200:** `{"sessions": [...]}`
- `POST /doctor/session/{session_id}/verify-otp`
  - **Body:** `{"otp_code": str}`
  - **Response 200:** `{"success": true, "status": "in_consultation", "session_id": str}`
- `POST /doctor/session/{session_id}/save-notes`
  - **Body:** `{"doctor_notes": str}`
  - **Response 200:** `{"success": true, "message": "Clinical notes saved directly without AI"}`
- `POST /doctor/session/{session_id}/finalize`
  - **Body:** `{"final_report": str}`
  - **Response 200:** `{"success": true, "status": "completed", "final_report": str}`

---

## 3. Patient Care APIs (`/staff/patient-care/*`)

### A. Bedside Vitals & MEWS Calculation
- `POST /staff/patient-care/patients/{patient_id}/vitals`
  - **Query:** `hospital_id` (default: `hosp-medikiosk`)
  - **Body:**
    ```json
    {
      "heart_rate": 78,
      "blood_pressure_sys": 120,
      "blood_pressure_dia": 80,
      "respiratory_rate": 16,
      "temperature": 36.8,
      "oxygen_saturation": 98,
      "observation_source": "bedside_manual",
      "staff_id": "staff-nurse-01",
      "session_id": "sess-xyz"
    }
    ```
  - **Response 200:**
    ```json
    {
      "success": true,
      "vital_id": 14,
      "mews_assessment_id": 14,
      "risk_assessment_id": 14,
      "patient_id": "PAT-XXXXXXXX",
      "recorded_at": "2026-11-02T14:30:00Z",
      "observation_source": "bedside_manual",
      "vitals": { "heart_rate": 78, "mews_score": 0, ... },
      "mews": { "total_score": 0, "risk_level": "STABLE", "explanation": "..." },
      "ml_risk": { "critical_risk": 0.04, "prediction": 0, ... },
      "discharge_readiness": { "is_ready": true, "score": 6, ... },
      "disclaimer": "Notice: Pre-trained machine learning models were developed on synthetic patient scenarios..."
    }
    ```
  - **Validation Error 422:** If vitals violate boundaries (e.g., SpO2 > 100% or Heart Rate < 20 bpm).

- `GET /staff/patient-care/patients/{patient_id}/vitals`
  - **Response 200:** Returns the most recent vital observation snapshot.
- `GET /staff/patient-care/patients/{patient_id}/vitals/history?limit={n}`
  - **Response 200:** Returns chronological vital history list (newest first).

- `POST /staff/patient-care/patients/{patient_id}/mews`
  - **Body:** `{"heart_rate": int, "blood_pressure_sys": int, "respiratory_rate": int, "temperature": float, "oxygen_saturation": int}`
  - **Response 200:** Standalone Subbe MEWS calculation with parameter breakdown without persisting.

### B. Machine Learning Risk & Explainable AI (XAI)
- `POST /staff/patient-care/patients/{patient_id}/risk-assessment`
  - **Query:** `model_name` (`random_forest`, `gradient_boosting`, `svm`, `logistic_regression`)
  - **Response 200:**
    ```json
    {
      "success": true,
      "patient_id": "PAT-XXXXXXXX",
      "critical_risk": 0.12,
      "prediction": 0,
      "confidence": 88,
      "model_used": "random_forest",
      "explanation": "RISK ASSESSMENT: LOW...\nKEY CONTRIBUTING FACTORS:...",
      "disclaimer": "Clinical Decision Support Only..."
    }
    ```
- `GET /staff/patient-care/patients/{patient_id}/risk-explanation`
  - **Response 200:** Returns Explainable AI (XAI) feature attribution text and contributing factors.
- `GET /staff/patient-care/xai/models`
  - **Response 200:** Accuracy, Precision, Recall, and F1 metrics for all 4 trained models.

### C. Bed and Ward Management
- `GET /staff/patient-care/beds?hospital_id={hospital_id}`
  - **Response 200:**
    ```json
    {
      "success": true,
      "hospital_id": "hosp-medikiosk",
      "total_beds": 9,
      "occupied_beds": 2,
      "vacant_beds": 7,
      "icu_available": 1,
      "beds": [
        {"bed_id": 1, "bed_number": "ICU-01", "ward": "ICU", "status": "occupied", "patient_id": "PAT-XXXXXXXX", ...},
        {"bed_id": 2, "bed_number": "ICU-02", "ward": "ICU", "status": "vacant", ...}
      ]
    }
    ```
- `POST /staff/patient-care/patients/{patient_id}/bed`
  - **Body:** `{"bed_number": "GEN-101"}`
  - **Response 200:** `{"success": true, "bed_number": "GEN-101", "assigned_at": str}`
  - **Error 400:** If bed is already occupied (`"Bed GEN-101 is already occupied"`).
- `POST /staff/patient-care/patients/{patient_id}/upgrade-icu`
  - **Response 200:** Upgrades deteriorating patient to the first available ICU bed.
- `POST /staff/patient-care/patients/{patient_id}/discharge?override={bool}`
  - **Response 200:** Frees occupied bed and marks status as vacant.
  - **Error 400 (Safety Block):** If patient MEWS >= 3 and `override=false` (`"Cannot discharge: Patient MEWS score is X (>= 3). Requires clinical override."`).
- `POST /staff/patient-care/beds/reallocate`
  - **Response 200:** Executes intelligent sorting algorithm, reallocating highest risk patients to ICU beds.

### D. Inpatient Care Plans
- `GET /staff/patient-care/patients/{patient_id}/care-plans`
  - **Response 200:** `{"success": true, "care_plans": [{"plan_id": int, "care_instructions": str, "medications": str, "special_instructions": str, "created_at": str, ...}]}`
- `POST /staff/patient-care/patients/{patient_id}/care-plans`
  - **Body:** `{"care_instructions": str, "medications": str, "special_instructions": str, "staff_id": str}`
  - **Response 200:** `{"success": true, "plan_id": int, "care_plan": {...}}`

### E. Inter-Hospital Transfer Coordination
- `GET /staff/patient-care/patients/{patient_id}/transfers?needs_icu={bool}&chief_complaint={str}`
  - **Response 200:** Returns destination hospitals ranked by proximity, available ICU beds, and medical specialty match.
- `POST /staff/patient-care/patients/{patient_id}/transfers/initiate`
  - **Body:** `{"target_hospital_name": str, "distance_km": float, "bed_type_needed": str, "specialization": str, "transfer_score": int, "notes": str, "staff_id": str}`
  - **Response 200:** `{"success": true, "transfer_id": int, "transfer_status": "requested"}`

### F. AD8232 ECG Telemetry (Simulation)
- `GET /staff/patient-care/ecg/data`
  - **Response 200:** Returns synthetic oscilloscope wave buffer (P-Q-R-S-T points), heart rate, and Rule 11 disclaimer.
- `POST /staff/patient-care/ecg/connect` / `POST /staff/patient-care/ecg/disconnect`
  - **Response 200:** Manages streaming telemetry session.

### G. Unified Patient Profile & Chronological Timeline
- `GET /staff/patient-care/patients/{patient_id}/unified-profile`
  - **Response 200:** Comprehensive 8-facet clinical dossier combining outpatient registration, Groq conversations, OCR lab documents, contradictions, bedside vitals, MEWS, ML risk/XAI, ward bed allocation, care plans, transfers, and chronological timeline.
- `GET /staff/patient-care/patients/{patient_id}/timeline`
  - **Response 200:** Complete historical timeline ordered newest-to-oldest with explicit provenance sources (`intake_conversation`, `ocr_document`, `bedside_vital`, `care_plan`, `ward_transfer`, `emr_record`).
