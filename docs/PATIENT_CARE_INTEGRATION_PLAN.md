# PATIENT CARE INTEGRATION PLAN & ARCHITECTURE DESIGN
## MediKiosk + Patient Care System — Phase 1 Master Architecture

**Document Version:** 1.0.0  
**Phase:** Phase 1 (Integration Preparation & Architecture Design)  
**Date:** 2026-11-01  
**Status:** Under Review (Approval Gate Pending)

---

## Table of Contents
1. [Final Proposed System Architecture](#1-final-proposed-system-architecture)
2. [Existing vs. New Functionality Comparison](#2-existing-vs-new-functionality-comparison)
3. [Database Entity Mapping & Schema Design](#3-database-entity-mapping--schema-design)
4. [Proposed Database Relationships](#4-proposed-database-relationships)
5. [Proposed Backend API Contract](#5-proposed-backend-api-contract)
6. [Frontend Component Integration Plan](#6-frontend-component-integration-plan)
7. [Alert Separation Design](#7-alert-separation-design)
8. [Security and Permissions Design](#8-security-and-permissions-design)
9. [Phase-Wise Testing Strategy & Test Cases](#9-phase-wise-testing-strategy--test-cases)
10. [Risk Assessment and Mitigation Matrix](#10-risk-assessment-and-mitigation-matrix)
11. [Files Expected to be Created in Future Phases](#11-files-expected-to-be-created-in-future-phases)
12. [Files That Must Remain Untouched](#12-files-that-must-remain-untouched)
13. [Recommended Implementation Order](#13-recommended-implementation-order)

---

## 1. Final Proposed System Architecture

### 1.1 Architectural Principle
MediKiosk is the **primary clinical intake and intelligence platform**. All Patient Care functionality is introduced as a **modular clinical monitoring extension** strictly embedded inside the **Healthcare Staff Module** (`StaffPortal.jsx`). The patient-facing kiosk, AI intake conversations, doctor consultation queue, medical OCR contradiction engine, and existing staff dashboard tracking boards remain completely intact and functionally identical.

### 1.2 High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MEDIKIOSK FRONTEND (REACT 19 + VITE)                      │
│                                                                                        │
│   ┌──────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────┐  │
│   │   Patient Intake Kiosk   │  │      Doctor Portal      │  │  Staff Workstation   │  │
│   │  - Multilingual AI Chat  │  │  - Verified OPD Queue   │  │   (StaffPortal.jsx)  │  │
│   │  - Document Upload & OCR │  │  - Clinical Summaries   │  └──────────┬───────────┘  │
│   │  - Clarification Engine  │  │  - EMR Confirmation     │             │              │
│   │  - Red Alert Generator   │  └─────────────────────────┘             │              │
│   └──────────────────────────┘                                          │              │
│                                              ┌──────────────────────────┴───────────┐  │
│                                              │ Sub-Navigation Mode Switcher         │  │
│                                              ├──────────────────────────────────────┤  │
│                                              │ [1] Intake & OPD Tracking (Untouched)│  │
│                                              │ [2] Inpatient Vitals & MEWS Monitor  │  │
│                                              │ [3] Bed & ICU Ward Management        │  │
│                                              │ [4] Explainable AI & ECG Sensor Demo │  │
│                                              │ [5] Care Plans & Hospital Transfers  │  │
│                                              └──────────────────────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / JSON REST APIs (port 8000)
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                             MEDIKIOSK BACKEND (FASTAPI / ASGI)                         │
│                                                                                        │
│   ┌─────────────────────────────────────────┐  ┌────────────────────────────────────┐  │
│   │ Existing MediKiosk Endpoints (main.py)  │  │ New Patient Care Router            │  │
│   │ - /session, /chat, /languages           │  │ Prefix: /staff/patient-care        │  │
│   │ - /patient/register, /patient/login     │  │ (backend/app/routers/patient_care) │  │
│   │ - /doctors, /doctor/verify-otp          │  └─────────────────┬──────────────────┘  │
│   │ - /staff/dashboard, /staff/patients     │                    │                     │
│   │ - /staff/red-flags (Intake alerts)      │                    │                     │
│   └─────────────────────────────────────────┘                    │                     │
│                                                                  ▼                     │
│                                          ┌──────────────────────────────────────────┐  │
│                                          │ Modular Patient Care Services:           │  │
│                                          │ - MEWS Scoring Engine                    │  │
│                                          │ - Smart Bed Allocation & Swapping        │  │
│                                          │ - Scikit-Learn Inference (Pickled Models)│  │
│                                          │ - Explainable AI (XAI) Rule Explainer    │  │
│                                          │ - AD8232 ECG Sensor Telemetry Simulator  │  │
│                                          │ - Network Hospital Transfer Recommender  │  │
│                                          └───────────────────────┬──────────────────┘  │
│                                                                  │                     │
│                                                                  ▼                     │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                      Unified SQLite Database (medikiosk.db)                     │  │
│   │                                                                                 │  │
│   │ Existing Tables (Unmodified):                                                   │  │
│   │   patients, sessions, doctors, messages, documents, contradictions,             │  │
│   │   hospitals, healthcare_staff, emr_records, external_emr_consents               │  │
│   │                                                                                 │  │
│   │ New Tables (Added with CREATE TABLE IF NOT EXISTS):                             │  │
│   │   patient_vitals, patient_beds, patient_care_plans,                             │  │
│   │   patient_transfer_recommendations                                              │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Backend Architecture Decision: Native FastAPI Adaptation vs. Separate Flask Server
*Decision:* **Adapt Patient Care into the existing FastAPI backend natively via a modular router (`APIRouter`). Do NOT maintain a separate Flask service.**

*Technical Rationale:*
1. **Zero Deployment Friction & Single Process Model:** Eliminates dual-server lifecycle management, port contention (5000 vs 8000), and orchestration failure modes in production.
2. **ACID Transactional Integrity:** A shared SQLite database accessed across two independent WSGI/ASGI web servers (`app.py` in Flask and `main.py` in FastAPI) causes SQLite `database locked` operational errors under concurrent writes. A single FastAPI process guarantees synchronized connection management.
3. **Unified Auth & Session Context:** MediKiosk healthcare staff already authenticate via `/staff/login` with bcrypt/SHA256 salted tokens and are tied to a `hospital_id`. Embedding Patient Care in FastAPI allows direct reuse of staff session validation without writing cross-server proxy middleware.
4. **Asynchronous Throughput:** FastAPI’s ASGI architecture handles concurrent real-time polling (e.g. 10s dashboard sync and ECG streaming) with lower latency and memory footprint than Flask's synchronous WSGI server.
5. **Clean Modular Isolation:** By locating the new logic inside `backend/app/routers/patient_care.py` and `backend/app/services/patient_care/`, MediKiosk’s `app/main.py` only requires a single non-intrusive registration line: `app.include_router(patient_care_router)`.

---

## 2. Existing vs. New Functionality Comparison

| Functional Area | Existing MediKiosk Platform | Patient Care Integration (Staff Module Only) |
|---|---|---|
| **Primary Focus** | Outpatient triage, AI conversational intake, clinical history transcription, document OCR, contradiction resolution, doctor consultation queue. | Inpatient physiological vital monitoring, MEWS early warning scoring, deterioration risk prediction, bed/ICU allocation, care plans, hospital transfer recommendations. |
| **User Roles** | Patient (self-service kiosk), Doctor (clinical examination & EMR confirmation), Healthcare Staff (triage coordination). | Healthcare Staff (Nurse / Desk Coordinator / Triage Specialist). Doctors can review vitals in consultation context. |
| **Alert Paradigm** | **AI Conversation Red-Flags:** Triggered when patient's conversational symptoms describe emergencies (e.g. "severe chest pain radiating to left arm"). | **Physiological MEWS Alerts:** Triggered by numerical vital sign thresholds (MEWS ≥ 4, SpO₂ < 90%, HR > 130 bpm). |
| **Data Capture** | Natural language dialogue, uploaded medical PDFs/images via Tesseract OCR. | Numerical bedside observations: Heart Rate (bpm), BP Systolic/Diastolic (mmHg), Respiratory Rate (bpm), Temp (°C), SpO₂ (%). |
| **Clinical Decision Support** | AI Case Summaries, Contradiction Flags, Doctor Clinical Impression. | MEWS Breakdown (0-14 score), ML Deterioration Risk Score (%), Discharge Readiness Checklist, Bed Transition Recommendations. |
| **Bed Management** | None (OPD queue only). | Visual ward grid (ICU vs. General), Bed state tracking (`vacant`, `occupied`, `maintenance`), Smart bed reallocation optimization. |
| **Telemetry / Sensor Demo** | None. | AD8232 ECG Sensor Simulator emitting heart rate, variance, signal quality, arrhythmia flag, and simulated waveform points. |
| **Inter-Facility Logistics** | External EMR consent and mock history lookup (Apollo, City Diagnostics). | AI Transfer Recommendations: Evaluates distance, bed capacity, specialty match, and historical transfer success rate. |

---

## 3. Database Entity Mapping & Schema Design

### 3.1 Mapping Table

| Patient Care Entity (`hospital.db`) | Target MediKiosk Entity (`medikiosk.db`) | Integration Strategy |
|---|---|---|
| `Patient.id` (INTEGER Auto-Increment) | `patients.patient_id` (TEXT Primary Key) | **Reuse existing `patient_id`.** Do NOT create duplicate patient IDs. Map existing MediKiosk patients directly. |
| `Patient.heart_rate`, `blood_pressure`, `respiratory_rate`, `temperature`, `oxygen_saturation`, `mews_score`, `deterioration_risk` | `patient_vitals` table | **New related table.** Store current vitals and complete historical trend timeline with observation source and timestamp. |
| `VitalHistory` | `patient_vitals` table | **Unified into `patient_vitals`.** All readings are appended as timestamped observation rows. |
| `Patient.mews_score`, `mews_explanation` | `patient_vitals.mews_score`, `patient_vitals.mews_explanation` | **New columns in `patient_vitals`.** MEWS is calculated on observation input and persisted alongside the vitals snapshot. |
| `Patient.needs_icu`, `assigned_bed` | `patient_beds` table + non-destructive patient flags | **New related table `patient_beds`** linked to `patients.patient_id`. Safely add optional columns to `patients` via SQLite PRAGMA check. |
| `Bed` | `patient_beds` table | **New related table.** Scoped by `hospital_id` so each hospital maintains its own ICU and General bed inventory. |
| `CarePlan` | `patient_care_plans` table | **New related table.** Foreign keys to `patients.patient_id` and `healthcare_staff.staff_id`. |
| `HospitalNetwork` | `patient_transfer_recommendations` + existing `hospitals` | **Leverage MediKiosk's existing `hospitals` table** plus a new table `patient_transfer_recommendations` for transfer scoring. |

### 3.2 SQL Schema Specifications for New Tables

```sql
-- -------------------------------------------------------------
-- 1. PATIENT VITALS & PHYSIOLOGICAL OBSERVATIONS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_vitals (
    vital_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    session_id TEXT,
    hospital_id TEXT NOT NULL,
    heart_rate INTEGER NOT NULL,
    blood_pressure_sys INTEGER NOT NULL,
    blood_pressure_dia INTEGER DEFAULT 80,
    respiratory_rate INTEGER NOT NULL,
    temperature REAL NOT NULL,
    oxygen_saturation INTEGER NOT NULL,
    mews_score INTEGER NOT NULL,
    mews_explanation TEXT,
    deterioration_risk REAL DEFAULT 0.0,
    model_used TEXT DEFAULT 'mews_rule_based',
    observation_source TEXT NOT NULL DEFAULT 'bedside_manual', -- 'bedside_manual' | 'ad8232_simulation' | 'triage_intake'
    recorded_by_staff_id TEXT,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
    FOREIGN KEY (recorded_by_staff_id) REFERENCES healthcare_staff(staff_id)
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_hospital_id ON patient_vitals(hospital_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded_at ON patient_vitals(recorded_at);

-- -------------------------------------------------------------
-- 2. PATIENT BEDS & INPATIENT WARDS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_beds (
    bed_id TEXT PRIMARY KEY,                       -- e.g. 'bed-medikiosk-icu-01'
    hospital_id TEXT NOT NULL,
    bed_number TEXT NOT NULL,                     -- e.g. 'ICU-01', 'GEN-101'
    bed_type TEXT NOT NULL,                       -- 'ICU' | 'general'
    ward TEXT NOT NULL,                           -- 'ICU', 'Ward A', 'Ward B', 'Ward C'
    status TEXT NOT NULL DEFAULT 'vacant',        -- 'vacant' | 'occupied' | 'maintenance'
    patient_id TEXT,                              -- NULL when vacant
    session_id TEXT,
    assigned_at TEXT,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id),
    UNIQUE (hospital_id, bed_number)
);

CREATE INDEX IF NOT EXISTS idx_beds_hospital ON patient_beds(hospital_id);
CREATE INDEX IF NOT EXISTS idx_beds_patient ON patient_beds(patient_id);

-- -------------------------------------------------------------
-- 3. PERSONALIZED CARE PLANS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_care_plans (
    plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    session_id TEXT,
    hospital_id TEXT NOT NULL,
    created_by_staff_id TEXT,
    care_instructions TEXT NOT NULL,
    medications TEXT,
    special_instructions TEXT,
    status TEXT NOT NULL DEFAULT 'active',        -- 'active' | 'completed' | 'discontinued'
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
    FOREIGN KEY (created_by_staff_id) REFERENCES healthcare_staff(staff_id)
);

CREATE INDEX IF NOT EXISTS idx_care_plans_patient ON patient_care_plans(patient_id);

-- -------------------------------------------------------------
-- 4. INTER-HOSPITAL TRANSFER RECOMMENDATIONS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_transfer_recommendations (
    transfer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    session_id TEXT,
    from_hospital_id TEXT NOT NULL,
    to_hospital_name TEXT NOT NULL,
    distance_km REAL NOT NULL,
    available_beds INTEGER NOT NULL,
    bed_type_needed TEXT NOT NULL,
    specialization TEXT,
    contact_phone TEXT,
    transfer_success_rate REAL DEFAULT 95.0,
    transfer_score INTEGER NOT NULL,              -- 0-100 score
    status TEXT NOT NULL DEFAULT 'recommended',   -- 'recommended' | 'initiated' | 'completed' | 'cancelled'
    initiated_by_staff_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (from_hospital_id) REFERENCES hospitals(hospital_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_patient ON patient_transfer_recommendations(patient_id);
```

### 3.3 Non-Destructive Column Verification on `patients` Table
Using MediKiosk's established SQLite `PRAGMA table_info(patients)` verification method:
```python
def ensure_patient_care_columns():
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("PRAGMA table_info(patients)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "comorbidities" not in columns:
        cursor.execute("ALTER TABLE patients ADD COLUMN comorbidities TEXT")
    if "medical_history" not in columns:
        cursor.execute("ALTER TABLE patients ADD COLUMN medical_history TEXT")
    if "triage_level" not in columns:
        cursor.execute("ALTER TABLE patients ADD COLUMN triage_level INTEGER DEFAULT 3")
    if "discharge_ready" not in columns:
        cursor.execute("ALTER TABLE patients ADD COLUMN discharge_ready INTEGER DEFAULT 0")
        
    connection.commit()
    connection.close()
```

### 3.4 SQLite Limitations & Future PostgreSQL Migration Considerations
- **SQLite Concurrency (WAL Mode):** To ensure zero database-locking exceptions when staff records vitals while patients chat with the AI, the backend connection pool will enable `PRAGMA journal_mode=WAL;` and `PRAGMA busy_timeout=5000;`.
- **PostgreSQL Readiness:**
  - Foreign keys strictly use standard ANSI-SQL naming conventions.
  - Primary keys use `TEXT` (UUID/alphanumeric) or `SERIAL`/`BIGINT` equivalents.
  - JSON objects (e.g. detailed MEWS breakdown or ECG points) are stored as valid JSON strings, easily mapped to PostgreSQL `JSONB`.

---

## 4. Proposed Database Relationships

```
              ┌────────────────────────┐
              │       hospitals        │
              │  (hospital_id [PK])    │
              └───────────┬────────────┘
                          │ 1
                          │
          ┌───────────────┼───────────────┬────────────────┐
          │ 1:N           │ 1:N           │ 1:N            │ 1:N
          ▼               ▼               ▼                ▼
   ┌──────────────┐┌──────────────┐┌──────────────┐┌───────────────┐
   │healthcare_   ││   sessions   ││ patient_beds ││patient_       │
   │staff         ││ (session_id) ││ (bed_id [PK])││transfer_recs  │
   └──────┬───────┘└──────┬───────┘└──────▲───────┘└───────────────┘
          │               │               │
          │               │ N:1           │ 0..1:1
          │        ┌──────▼──────┐        │
          │        │  patients   ├────────┘
          │        │ (patient_id)│
          │        └──────┬──────┘
          │               │ 1:N
          │        ┌──────┴────────────────┐
          │ 1:N    ▼                       ▼ 1:N
          │  ┌──────────────┐       ┌──────────────┐
          └──►patient_care_ │       │patient_vitals│
             │plans         │       │ (vital_id)   │
             └──────────────┘       └──────────────┘
```

---

## 5. Proposed Backend API Contract Design

All new endpoints are grouped under the `/staff/patient-care` namespace. They are designed as a dedicated FastAPI `APIRouter` to prevent collision with existing MediKiosk routes.

### Endpoint Group Summary
1. `GET  /staff/patient-care/patients`
2. `GET  /staff/patient-care/patients/{patient_id}/vitals`
3. `POST /staff/patient-care/patients/{patient_id}/vitals`
4. `POST /staff/patient-care/patients/{patient_id}/mews`
5. `GET  /staff/patient-care/patients/{patient_id}/mews`
6. `POST /staff/patient-care/patients/{patient_id}/risk-assessment`
7. `GET  /staff/patient-care/patients/{patient_id}/risk-explanation`
8. `GET  /staff/patient-care/beds`
9. `POST /staff/patient-care/beds/optimize`
10. `POST /staff/patient-care/patients/{patient_id}/upgrade-icu`
11. `POST /staff/patient-care/patients/{patient_id}/discharge`
12. `GET  /staff/patient-care/patients/{patient_id}/care-plans`
13. `POST /staff/patient-care/patients/{patient_id}/care-plans`
14. `GET  /staff/patient-care/patients/{patient_id}/transfers`
15. `POST /staff/patient-care/patients/{patient_id}/transfers/initiate`
16. `POST /staff/patient-care/ecg/connect`
17. `GET  /staff/patient-care/ecg/data`
18. `POST /staff/patient-care/ecg/disconnect`
19. `GET  /staff/patient-care/xai/models`

---

### Detailed Contract Specifications

#### 5.1 GET `/staff/patient-care/patients`
- **Purpose:** Retrieve list of admitted/monitored patients for the logged-in staff member’s hospital, including current vitals, bed assignment, MEWS status, and discharge readiness.
- **Role Required:** `Nurse / Coordinator` or `Doctor`.
- **Query Parameters:** `hospital_id: str` (required), `ward: Optional[str]`, `filter: Optional[str]` (`all`, `critical_mews`, `icu`, `discharge_ready`).
- **Response Schema:**
```json
{
  "success": true,
  "hospital_id": "hosp-medikiosk",
  "total_monitored": 4,
  "patients": [
    {
      "patient_id": "pat-ramesh-1",
      "full_name": "Ramesh Joshi",
      "age": 45,
      "gender": "Male",
      "triage_level": 2,
      "chief_complaint": "Severe chest pain radiating to left arm",
      "assigned_bed": "ICU-01",
      "ward": "ICU",
      "needs_icu": true,
      "mews_score": 5,
      "mews_alert": true,
      "deterioration_risk": 0.85,
      "discharge_ready": false,
      "last_vitals": {
        "heart_rate": 130,
        "blood_pressure_sys": 90,
        "respiratory_rate": 28,
        "temperature": 38.1,
        "oxygen_saturation": 82,
        "recorded_at": "2026-11-01T22:30:00Z",
        "observation_source": "bedside_manual"
      }
    }
  ]
}
```
- **Error Responses:** `400 Bad Request` (missing `hospital_id`), `500 Internal Error`.

---

#### 5.2 POST `/staff/patient-care/patients/{patient_id}/vitals`
- **Purpose:** Record new vital signs, recalculate MEWS score with clinical explanation, assess deterioration risk, check discharge readiness, and persist to history.
- **Role Required:** `Nurse / Coordinator` or `Doctor`.
- **Request Schema:**
```json
{
  "heart_rate": 115,
  "blood_pressure_sys": 165,
  "blood_pressure_dia": 95,
  "respiratory_rate": 24,
  "temperature": 38.2,
  "oxygen_saturation": 91,
  "observation_source": "bedside_manual",
  "staff_id": "staff-mk-1"
}
```
- **Validation Rules:**
  - `heart_rate`: Integer between 20 and 260 bpm.
  - `blood_pressure_sys`: Integer between 40 and 300 mmHg.
  - `respiratory_rate`: Integer between 4 and 60 bpm.
  - `temperature`: Float between 30.0 and 45.0 °C.
  - `oxygen_saturation`: Integer between 50 and 100 %.
- **Response Schema:**
```json
{
  "success": true,
  "vital_id": 14,
  "patient_id": "pat-ramesh-1",
  "mews_score": 4,
  "mews_status": "WARNING",
  "mews_explanation": "MEWS Score: 4/14\n\nScoring Breakdown:\n• Heart rate 115 bpm: Moderately abnormal (+2)\n• Blood pressure 165 mmHg: Mildly abnormal (+1)\n• Respiratory rate 24 bpm: Mildly abnormal (+1)\n• Temperature 38.2°C: Elevated temperature (+1)\n• Oxygen saturation 91%: Mild hypoxemia (+1)\n\n⚠️ WARNING: Score ≥3 requires increased monitoring and senior review.",
  "deterioration_risk": 0.65,
  "is_critical_alert": true,
  "discharge_ready": false,
  "discharge_criteria": {
    "ready": false,
    "met_count": 0,
    "total_criteria": 6,
    "criteria_failed": [
      "Heart rate 115 bpm outside normal range (60-100)",
      "Blood pressure 165 mmHg outside normal range (90-140)",
      "Respiratory rate 24 bpm outside normal range (12-20)",
      "Temperature 38.2°C outside normal range (36.0-37.5)",
      "Oxygen saturation 91% below target (≥95%)",
      "MEWS score 4 indicates ongoing risk"
    ]
  },
  "bed_recommendation": {
    "type": "UPGRADE_ICU",
    "reason": "Critical condition: MEWS 4, Clinical indicators suggest ICU monitoring",
    "priority": "HIGH"
  },
  "recorded_at": "2026-11-01T23:55:00Z"
}
```
- **Error Responses:** `404 Not Found` (patient does not exist), `422 Unprocessable Entity` (invalid vital bounds).

---

#### 5.3 GET `/staff/patient-care/patients/{patient_id}/vitals/history`
- **Purpose:** Return time-series vital history for line charts (Heart Rate, BP, SpO₂, MEWS trend).
- **Parameters:** `limit: int = 20`.
- **Response Schema:** Array of timestamped vitals snapshots ordered newest to oldest.

---

#### 5.4 POST `/staff/patient-care/patients/{patient_id}/risk-assessment`
- **Purpose:** Execute Explainable AI (XAI) inference across the pre-trained ML models (`RandomForest`, `GradientBoosting`, `SVM`, `LogisticRegression`) to predict critical deterioration risk with human-readable factor attribution.
- **Request Schema:** Optional overrides for vitals; defaults to patient's latest recorded vitals.
- **Response Schema:**
```json
{
  "success": true,
  "patient_id": "pat-ramesh-1",
  "critical_risk": 0.82,
  "prediction": 1,
  "confidence": 82,
  "model_used": "random_forest",
  "explanation": "RISK ASSESSMENT: CRITICAL (Score: 0.82)\n\nKEY FACTORS:\n• Elevated heart rate (115 bpm) indicates cardiovascular stress\n• High systolic blood pressure (165 mmHg) suggests hypertension crisis\n• Low oxygen saturation (91%) indicates respiratory distress\n• Advanced age increases vulnerability to complications\n\nRECOMMENDED ACTION: Immediate intervention required\n\nMODEL CONFIDENCE: 82%",
  "disclaimer": "Clinical Decision Support: ML deterioration risk predictions and MEWS scores are supplementary screening tools and do NOT constitute a definitive medical diagnosis. Clinical judgment takes precedence."
}
```

---

#### 5.5 GET `/staff/patient-care/beds` & POST `/staff/patient-care/beds/optimize`
- **GET `/staff/patient-care/beds`:** Returns ward-by-ward bed availability and occupancy.
- **POST `/staff/patient-care/beds/optimize`:** Triggers smart bed reallocation algorithm:
  - Identifies critical patients (MEWS ≥ 4 or Deterioration Risk > 0.7) residing in General beds.
  - Identifies stable patients (MEWS ≤ 2 and Deterioration Risk < 0.3) residing in ICU beds.
  - Automatically executes bed swaps to ensure ICU capacity is prioritized for high-risk patients.
- **Response:** Summary of executed swaps, vacant bed count, and audit log.

---

#### 5.6 POST `/staff/patient-care/patients/{patient_id}/upgrade-icu` & `.../discharge`
- **Upgrade to ICU:** Vacates existing General bed, claims vacant ICU bed, sets `patient.needs_icu = True`, and records swap timestamp.
- **Discharge Patient:** Validates discharge readiness (or requires staff override), sets assigned bed status to `vacant`, and updates patient status to `discharged`.

---

#### 5.7 GET & POST `/staff/patient-care/patients/{patient_id}/care-plans`
- **GET:** Returns active and past personalized care plans.
- **POST:** Creates a new care plan (`care_instructions`, `medications`, `special_instructions`, `staff_id`).

---

#### 5.8 GET `/staff/patient-care/patients/{patient_id}/transfers` & `.../initiate`
- **GET:** Evaluates hospital network options based on:
  - Distance (km)
  - Target ICU / General bed availability
  - Medical specialization match
  - Historical transfer success rate
  - Composite transfer score (0 - 100)
- **POST Initiate:** Changes transfer status to `initiated`, alerts coordinator desk, and creates audit record.

---

#### 5.9 Simulated ECG Telemetry Endpoints
- `POST /staff/patient-care/ecg/connect`: Connects AD8232 simulation stream.
- `GET  /staff/patient-care/ecg/data`: Returns simulated real-time telemetry:
```json
{
  "success": true,
  "ecg_data": {
    "heart_rate": 78,
    "std_dev": 0.42,
    "variance": 0.28,
    "timestamp": "23:58:12",
    "signal_quality": "Good",
    "arrhythmia_detected": false,
    "data_points": [0.12, 0.25, 0.88, 1.45, -0.32, 0.15, 0.22, 0.18, 0.10, 0.05]
  },
  "disclaimer": "Demonstration Notice: Simulated ECG stream for educational/clinical research. Not connected to a real medical device."
}
```
- `POST /staff/patient-care/ecg/disconnect`: Disconnects simulator.

---

## 6. Frontend Component Integration Plan

### 6.1 Preserving Existing `StaffPortal.jsx`
`StaffPortal.jsx` is the heart of MediKiosk's staff experience. It contains:
1. Top Bar with hospital badge, coordinator name, 10s auto-polling indicator, and logout.
2. Prominent Urgent Red-Flags Banner (for AI conversational red-flag alerts).
3. 7 KPI Metric Cards (`Total`, `In Process`, `Pending Clarification`, `Ready for Doctor`, `In Consultation`, `Completed`, `Red Flag Cases`).
4. Patient Tracking Board Table with 7 filter tabs and read-only Case Coordination Modal.

**We are NOT replacing or redesigning this structure.**

### 6.2 Modular Sub-Navigation & Component Hierarchy
Inside `StaffPortal.jsx`, directly beneath the Top Bar, a non-intrusive Workstation Mode Switcher is introduced:

```
[📋 Intake & OPD Queue]  [🩺 Inpatient Vitals & MEWS]  [🛏️ Bed & ICU Wards]  [🧠 XAI & ECG Demo]  [📋 Care Plans & Transfers]
```

When `[📋 Intake & OPD Queue]` is selected, **the existing MediKiosk dashboard displays exactly as it does today**, with 100% identical styling and behavior.

When other tabs are selected, specialized Patient Care sub-components are rendered:

```
StaffPortal.jsx (Preserved Parent Component)
│
├── TopBar (Preserved: Hospital Tag, Live Sync Dot, Refresh, Logout)
├── Sub-Navigation Mode Bar (NEW: Non-destructive sub-view selector)
│
├── VIEW 1: [Intake & OPD Queue] (EXISTING UNTOUCHED VIEW)
│   ├── Urgent Red-Flags Banner (Preserved: AI intake conversation red flags)
│   ├── Staff Metrics Grid (Preserved: 7 KPI cards)
│   ├── Filter Tabs & Patient Table (Preserved: Intake queue)
│   └── Case Details Modal (Preserved: Read-only intake coordinator modal)
│
├── VIEW 2: [Inpatient Vitals & MEWS] (NEW COMPONENT)
│   └── PatientVitalsPanel.jsx
│       ├── Physiological Alerts Banner (NEW: Orange/Amber MEWS >= 4 alerts)
│       ├── Vitals Summary Table (HR, BP, RR, Temp, SpO2, MEWS, Deterioration Risk)
│       ├── VitalsEntryModal.jsx (Form with instant client-side MEWS calculation)
│       └── VitalTrendsChart.jsx (Visual trend line for vital history)
│
├── VIEW 3: [Bed & ICU Wards] (NEW COMPONENT)
│   └── BedManagementGrid.jsx
│       ├── Ward Selector (All, ICU, Ward A, Ward B, Ward C)
│       ├── Bed Cards Grid (Color-coded by occupancy, triage level, MEWS alert)
│       ├── Smart Reallocation Action Bar ("⚡ Optimize Beds")
│       └── Bed Assignment / ICU Elevation Modal
│
├── VIEW 4: [Explainable AI & ECG Demo] (NEW COMPONENT)
│   └── XAIEcgMonitor.jsx
│       ├── Clinical Disclaimer Banner (Mandatory Rule 11 & 12 disclaimers)
│       ├── Simulated AD8232 ECG Telemetry Canvas (Connect / Disconnect / Waveform)
│       ├── Multi-Model Comparison Table (Accuracy, Precision, Recall, F1)
│       └── Patient Risk Attribution Breakdown (Factor-by-factor explanation)
│
└── VIEW 5: [Care Plans & Transfers] (NEW COMPONENT)
    └── CarePlansTransfers.jsx
        ├── Discharge Readiness Criteria Checklist
        ├── Personalized Care Plan Editor & History
        └── Inter-Hospital Transfer Recommender (Network hospital distance & score)
```

Additionally, inside the existing Patient Tracking Table (View 1), a new quick-action button `🩺 Vitals / Patient Care` is added to each row. Clicking it opens the patient's vitals recording modal directly without navigating away.

---

## 7. Alert Separation Design

> [!IMPORTANT]
> **Clinical Safety Mandate:** AI Conversational Red Flags and Physiological Vital-Sign Alerts represent two fundamentally different diagnostic domains and MUST NEVER be conflated or overwrite each other.

### 7.1 Visual & Structural Separation Matrix

| Attribute | Alert Type A: AI Intake Red-Flag | Alert Type B: Physiological Monitoring Alert |
|---|---|---|
| **Origin / Source** | Patient conversation during Kiosk intake (e.g. chest pain, numbness, slurred speech). | Quantitative bedside vital measurements (MEWS ≥ 4, SpO₂ < 90%, HR > 130). |
| **Detection Engine** | Groq AI / LLM extraction during conversational interview. | Deterministic MEWS algorithm + validated Scikit-Learn risk classifier. |
| **Visual Banner** | **Red Pulsing Banner (`#dc3545`)** with siren badge: `🚨 URGENT CLINICAL ALERT: AI INTAKE RED-FLAG`. | **Amber/Orange Alert Card (`#fd7e14`)** with heartbeat badge: `⚠️ PHYSIOLOGICAL DETERIORATION ALERT: MEWS CRITICAL`. |
| **Badge in Patient List** | `🔴 Red Flag (Intake)` | `⚡ MEWS: 5 (Vitals)` |
| **Data Attributes** | `red_flag = 1`, `red_flag_reason`, `red_flag_created_at`, `red_flag_acknowledged`. | `mews_score >= 4`, `mews_explanation`, `observation_source`, `recorded_at`. |
| **Database Storage** | `sessions` table (`red_flag`, `red_flag_reason`). | `patient_vitals` table (`mews_score`, `deterioration_risk`). |
| **Staff Action** | Nurse acknowledges intake triage alert via `✓ Acknowledge Alert`. | Nurse updates vitals, considers ICU transfer recommendation, or initiates senior medical review. |
| **Persistence** | Permanent record in session history; does not clear upon vital updates. | Tracks with latest physiological status; historical readings preserved in timeline. |

---

## 8. Security and Clinical Safety

### 8.1 Role-Based Access Control (RBAC)
- **Patient:** Read/write access strictly restricted to own intake session. Zero access to other patient records, bed management, MEWS scoring tools, or hospital transfer tools.
- **Healthcare Staff (Nurse / Coordinator):** Access scoped strictly to assigned `hospital_id`. Authorized to record bedside vitals, acknowledge red flags, manage beds, initiate transfer requests, and edit care plans. Prohibited from modifying doctor medical prescriptions or final clinical diagnoses.
- **Doctor:** Authorized to review intake transcripts, OCR documents, contradiction resolutions, physiological vitals history, and MEWS scores. Sole authority to finalize medical diagnoses, edit reports, and commit records to hospital EMR.

### 8.2 Observation Source & Audit Logging
To comply with Rule 10, every physiological observation written to `patient_vitals` mandates:
- `observation_source`: Explicitly recorded as `"bedside_manual"`, `"ad8232_simulation"`, or `"triage_intake"`.
- `recorded_by_staff_id`: The ID of the authenticated staff member submitting the entry.
- `recorded_at`: Tamper-evident ISO 8601 UTC timestamp.

### 8.3 Clinical Decision Support Disclaimers
In compliance with Rules 11 and 12, the following disclaimers are hardcoded into API contracts and UI views:
- **Simulated Telemetry Disclaimer:**  
  *"⚠️ Demonstration Notice: Simulated ECG waveform stream (AD8232 sensor simulation) is provided exclusively for clinical workflow demonstration and research. It is NOT connected to an active medical telemetry device."*
- **Non-Definitive Diagnosis Disclaimer:**  
  *"ℹ️ Clinical Decision Support: Modified Early Warning Scores (MEWS) and Machine Learning risk predictions are screening aids intended to assist clinical vigilance. They do NOT constitute a definitive medical diagnosis. Attending healthcare professionals retain ultimate clinical decision authority."*

---

## 9. Phase-Wise Testing Strategy & Test Cases

All test cases are derived strictly from source code algorithms in MediKiosk and Patient Care.

### Group A: Existing MediKiosk Regression Test Suite

| Test ID | Area | Preconditions | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| **REG-01** | Patient Auth | Clean DB or seeded user | Submit `POST /patient/register` then `POST /patient/login` with valid credentials | Registration generates unique `patient_id`; password hashed with salt; login returns token | Pending | NOT RUN |
| **REG-02** | Session Init | Valid patient | Submit `POST /session` with `language="hi"`, `hospital_id="hosp-medikiosk"` | Session record created with status `in_progress` | Pending | NOT RUN |
| **REG-03** | AI Chat Intake | Active session | Submit `POST /chat` with user complaint | Groq LLM returns conversational response in selected language | Pending | NOT RUN |
| **REG-04** | Red-Flag Trigger | Active session | Submit message describing chest pain radiating to left arm | `sessions.red_flag` is set to 1; `red_flag_reason` populated | Pending | NOT RUN |
| **REG-05** | Document OCR | Active session | Upload sample prescription image to `POST /upload-documents` | Tesseract extracts text; row saved in `documents` | Pending | NOT RUN |
| **REG-06** | Contradiction | Session with chat & doc | Call `POST /session/{id}/detect-contradictions` | Engine detects conflict between statement and doc | Pending | NOT RUN |
| **REG-07** | Clarification | Active contradiction | Submit `POST /contradiction/{id}/clarify` | Contradiction status updated to `resolved` | Pending | NOT RUN |
| **REG-08** | Doctor Queue | Session ready | Doctor logs in and queries `GET /doctor/queue` | Patient appears in queue with OTP verification state | Pending | NOT RUN |
| **REG-09** | Doctor Confirm | Session in consult | Submit `POST /doctor/confirm-emr` | EMR record committed to `emr_records`; session status `completed` | Pending | NOT RUN |
| **REG-10** | Staff Polling | Staff logged in | Call `GET /staff/dashboard` and `GET /staff/patients` | Returns database-driven counts strictly for staff hospital | Pending | NOT RUN |

### Group B: Patient Care Module Test Suite

| Test ID | Area | Preconditions | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| **PC-01** | MEWS Math | Valid vitals input | Test formula with HR=130, BP=90, RR=28, Temp=38.1, SpO2=82 | HR: +3, BP: 0, RR: +3, Temp: +1, SpO2: +3 -> MEWS = 10 (`CRITICAL`) | Pending | NOT RUN |
| **PC-02** | MEWS Math | Normal vitals input | Test formula with HR=75, BP=120, RR=16, Temp=36.8, SpO2=98 | All components score 0 -> MEWS = 0 (`STABLE`) | Pending | NOT RUN |
| **PC-03** | Vitals Validation | Invalid vital values | Submit `POST /vitals` with HR=400 or Temp=20.0 | Returns `422 Unprocessable Entity` with error message | Pending | NOT RUN |
| **PC-04** | ML Inference | Pickled models present | Call `predict_critical_risk()` with patient data | Model executes inference; returns risk score between 0.0 and 1.0 | Pending | NOT RUN |
| **PC-05** | ML Fallback | Models unavailable | Simulate missing `.pkl` file and run risk prediction | Fallback rule-based risk predictor executes without crashing | Pending | NOT RUN |
| **PC-06** | XAI Explanation | Critical patient vitals | Generate XAI explanation for patient with SpO2=85% | Returns text with factor bullet pointing to respiratory distress | Pending | NOT RUN |
| **PC-07** | Bed Query | Seeded beds | Query `GET /staff/patient-care/beds` | Returns bed inventory grouped by ICU and General wards | Pending | NOT RUN |
| **PC-08** | Bed Optimization | Critical in General, Stable in ICU | Trigger `POST /beds/optimize` | Critical patient moved to ICU; stable moved to General | Pending | NOT RUN |
| **PC-09** | ICU Elevation | Vacant ICU bed exists | Trigger `POST /upgrade-icu` for patient in General bed | Patient assigned to ICU bed; `needs_icu = True` | Pending | NOT RUN |
| **PC-10** | Discharge Check | Patient vitals normal | Evaluate `assess_discharge_readiness()` with normal vitals | All 6 criteria met -> `discharge_ready = True` | Pending | NOT RUN |
| **PC-11** | Care Plan | Admitted patient | Submit `POST /care-plans` with instructions | Persists to `patient_care_plans` with timestamp | Pending | NOT RUN |
| **PC-12** | ECG Telemetry | Simulator active | Connect and fetch `GET /ecg/data` | Returns waveform array, heart rate, and disclaimer | Pending | NOT RUN |

### Group C: End-to-End Integration Test Suite

| Test ID | Area | Preconditions | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| **INT-01** | Shared Patient ID | MediKiosk patient registered | Submit vitals under MediKiosk `patient_id` | `patient_vitals` row references existing patient without duplicating identity | Pending | NOT RUN |
| **INT-02** | Alert Coexistence | Session with chat red-flag | Record vitals with MEWS=5 for same patient | Both AI Intake red-flag and Physiological MEWS alert display simultaneously | Pending | NOT RUN |
| **INT-03** | Alert Independence | Both alerts active | Staff acknowledges AI Intake red-flag | Intake banner clears acknowledgement state; MEWS alert remains visible | Pending | NOT RUN |
| **INT-04** | Hospital Isolation | 2 hospitals seeded | Staff from Hospital A queries vitals & beds | Only Hospital A beds and patients are returned; Hospital B data excluded | Pending | NOT RUN |
| **INT-05** | Historical Vitals | Multiple vital entries | Submit 3 sequential vital updates | `GET /vitals/history` returns all 3 entries with sources and timestamps | Pending | NOT RUN |
| **INT-06** | DB Concurrency | AI chat active | Submit vitals concurrently during AI chat streaming | Both operations commit cleanly under WAL mode without `database locked` error | Pending | NOT RUN |
| **INT-07** | UI Mode Switching | Staff workstation open | Toggle between `Intake & OPD` and `Inpatient Vitals` tabs | State is preserved; switching tabs does not reload page or lose filters | Pending | NOT RUN |
| **INT-08** | Disclaimer Presence | XAI and ECG views open | Inspect UI DOM for disclaimers | Both ECG simulation disclaimer and clinical diagnosis disclaimer are rendered | Pending | NOT RUN |

---

## 10. Risk Assessment and Mitigation Matrix

| # | Risk Description | Severity | Impact | Mitigation Strategy |
|---|---|---|---|---|
| 1 | **Database Locking under Concurrent Access** | High | Intake or vital write fails with `sqlite3.OperationalError: database is locked`. | Enable SQLite Write-Ahead Logging (`PRAGMA journal_mode=WAL;`) and set a 5000ms busy timeout in `get_connection()`. |
| 2 | **Pickled Model Deserialization Failure** | Medium | Python scikit-learn version mismatch could prevent loading `.pkl` files. | Preserve Patient Care's dual-mode engine: if `.pkl` unpickling fails, automatically fall back to rule-based clinical scoring with zero downtime. |
| 3 | **Accidental Alert Conflation** | High | Staff confused whether an alert was triggered by chat symptoms or live vitals. | Enforce distinct color palettes (Red for AI intake vs Orange for MEWS), separate database columns, and unambiguous UI badge labels. |
| 4 | **Patient Identifier Fragmentation** | Critical | Duplicate patient records created across intake and inpatient monitoring. | Standardize all Patient Care schemas directly on MediKiosk's `patients.patient_id` (`TEXT`). Never generate secondary patient IDs. |
| 5 | **Staff Dashboard Bloat or Disruption** | High | Adding vitals breaks existing staff tracking workflow. | Keep the existing dashboard as the untouched default View 1. Render Patient Care features in cleanly compartmentalized sub-views. |
| 6 | **Unintended Code Modification of MediKiosk Core** | Critical | Breaking changes to existing intake or doctor portal. | Follow strict phase-based gates. Run regression suite `test_new_features.py` after every phase. |

---

## 11. Files Expected to be Created in Future Phases

### Backend Files:
1. `backend/app/routers/patient_care.py` *(FastAPI endpoints for vitals, MEWS, beds, transfers, care plans, ECG)*
2. `backend/app/services/patient_care/mews_service.py` *(Deterministic MEWS calculation and clinical scoring breakdown)*
3. `backend/app/services/patient_care/bed_service.py` *(Ward bed inventory, availability query, smart ICU swap reallocation)*
4. `backend/app/services/patient_care/ml_risk_service.py` *(Pickled model inference wrapper with feature scaling and XAI explanation)*
5. `backend/app/services/patient_care/ecg_service.py` *(AD8232 sensor simulation telemetry generator)*
6. `backend/app/services/patient_care/transfer_service.py` *(Hospital network transfer scoring algorithm)*
7. `backend/app/models/patient_care_models.py` *(Pydantic request/response schemas)*
8. `backend/app/services/patient_care/artifacts/` *(Directory hosting `.pkl` model files copied read-only from Patient Care)*
9. `backend/test_patient_care_integration.py` *(Comprehensive automated test suite covering Groups A, B, and C)*

### Frontend Files:
1. `Frontend/src/components/patient_care/PatientVitalsPanel.jsx` *(Vitals table, MEWS breakdown, physiological alerts)*
2. `Frontend/src/components/patient_care/VitalsEntryModal.jsx` *(Bedside vitals recording dialog with instant MEWS preview)*
3. `Frontend/src/components/patient_care/BedManagementGrid.jsx` *(Ward bed visual grid, occupancy stats, optimize button)*
4. `Frontend/src/components/patient_care/XAIEcgMonitor.jsx` *(Simulated AD8232 ECG canvas, model comparison, XAI breakdown)*
5. `Frontend/src/components/patient_care/CarePlansTransfers.jsx` *(Care plan management, discharge checklist, transfer options)*

---

## 12. Files That Must Remain Untouched

The following files represent the core foundation of MediKiosk and must **NOT** be modified or overwritten:
- `backend/app/services/ocr_service.py` *(Tesseract OCR extraction)*
- `backend/seed_dataset.py` *(Initial demo dataset seeder)*
- `backend/test_new_features.py` *(Existing automated test suite)*
- `Frontend/src/components/DoctorPortal.jsx` *(Doctor examination workstation)*
- `Frontend/src/components/DoctorPlaceholder.jsx` *(Doctor portal placeholder)*
- `Frontend/src/components/PatientAuth.jsx` *(Patient login/register dialog)*
- `Frontend/src/components/PatientWelcome.jsx` *(Kiosk multilingual welcome screen)*
- `Frontend/src/components/PortalHeader.jsx` *(Global navigation header)*
- `Frontend/src/components/HospitalSelector.jsx` *(Hospital network selector)*
- `Frontend/src/components/ExternalEMRConsent.jsx` *(Patient external EMR consent)*
- `Frontend/src/components/MedicalTimeline.jsx` *(External EMR timeline)*
- `c:\Users\Lenovo\Desktop\Patient-care-main\**` *(Entire source Patient Care repository — strictly read-only)*

---

## 13. Recommended Implementation Order

To ensure zero regressions and safe execution, implementation across subsequent phases must follow this strict sequence:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: PREPARATION & ARCHITECTURE (Current Phase)                         │
│ - Technical audit complete.                                                 │
│ - Architecture, database schema, API contract, and test plan documented.   │
│ - Developer Approval Gate.                                                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: BACKEND INTEGRATION                                                │
│ - Safe DB backup: medikiosk.db.backup.<timestamp>                           │
│ - Create non-destructive patient care tables in database.py.                │
│ - Port MEWS, bed, ML inference, ECG, and transfer services into FastAPI.    │
│ - Mount /staff/patient-care router in main.py without altering core routes. │
│ - Run MediKiosk regression suite (REG-01 to REG-10) -> Must be 100% PASS.   │
│ - Execute Phase 2 backend verification tests.                               │
│ - Developer Approval Gate.                                                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: STAFF DASHBOARD FRONTEND INTEGRATION                               │
│ - Build modular React sub-components under components/patient_care/.        │
│ - Non-intrusively add sub-navigation switcher inside StaffPortal.jsx.       │
│ - Keep default View 1 100% identical to existing MediKiosk dashboard.      │
│ - Implement Vitals, Beds, XAI/ECG demo, and Care Plan views.                │
│ - Enforce distinct visual treatment for AI intake vs MEWS alerts.           │
│ - Developer Approval Gate.                                                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: PATIENT DATA & SEED INTEGRATION                                    │
│ - Link MediKiosk patients to initial bed allocations and sample vitals.     │
│ - Verify data consistency and foreign key integrity.                        │
│ - Verify hospital-specific isolation across multi-hospital logins.          │
│ - Developer Approval Gate.                                                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: COMPREHENSIVE VALIDATION & TESTING                                 │
│ - Execute all test cases: Groups A (Regression), B (Modules), C (Integr.).  │
│ - Validate clinical disclaimers and observation source tracking.            │
│ - Run concurrent load check under SQLite WAL mode.                          │
│ - Developer Approval Gate.                                                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: FINAL END-TO-END SIGN-OFF & CLEANUP                                │
│ - Full end-to-end user journey test across Patient, Doctor, and Staff.      │
│ - Clean up scratch artifacts.                                               │
│ - Deliver final handover documentation.                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```
