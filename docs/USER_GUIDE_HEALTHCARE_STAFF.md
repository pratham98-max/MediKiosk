# HEALTHCARE STAFF USER GUIDE
## MediKiosk + Patient Care Workstation
**Document Version:** 1.0  
**Date:** November 2, 2026  

---

## 1. Staff Authentication & Facility Selection

1. Open the application at `http://localhost:5173`.
2. Click **Healthcare Staff Portal** in the navigation header.
3. Select your hospital facility (e.g., `MediKiosk General Hospital`).
4. Enter your staff credentials (e.g., Email: `staff@medikiosk.com`, Password: `password123`).
5. Upon successful authentication, your dashboard loads your facility's live census and inpatient monitoring queue.

---

## 2. Navigating the Dual Workstation

The Staff Portal features a top navigation toggle allowing you to switch between outpatient intake triage and inpatient monitoring:

```
[ 📋 OPD Patient Queue & Triage ]    [ 🏥 Inpatient Care & Physiological Monitoring ]
```

---

## 3. OPD Patient Queue & Outpatient Triage

- **Patient Census Metrics:** Live counters display:
  - *Total Registered Patients*
  - *Intake In Progress* (AI conversation active at kiosk)
  - *Ready for Doctor* (OTP generated, waiting in waiting room)
  - *In Consultation* (Currently with doctor)
  - *Completed* (Encounter finalized)
  - *Red Flags* (Urgent clinical flags)
- **Conversational Red Alerts:** If a patient mentions high-risk symptoms during kiosk intake (e.g. *"severe crushing chest pain"*), a crimson **RED FLAG** badge flashes next to their name.
- **Acknowledging Alerts:** Click the **Acknowledge 🚨** button to confirm receipt. The badge updates to *Acknowledged* while the flag remains visible to the attending doctor.
- **Patient Status Tracking:** Watch patient progress through the intake stages in real-time without refreshing.

---

## 4. Inpatient Care & Physiological Monitoring

Click **Inpatient Care & Physiological Monitoring** to open the inpatient board:

### A. Recording Bedside Vital Signs
1. Locate the patient row and click **Record Vitals 🩺**.
2. Enter the observed parameters:
   - Heart Rate (bpm)
   - Systolic & Diastolic Blood Pressure (mmHg)
   - Respiratory Rate (breaths/min)
   - Body Temperature (°C)
   - Oxygen Saturation SpO₂ (%)
   - AVPU Neurological Status
3. Select the **Observation Source** (`bedside_manual`, `ad8232_simulation`, `iot_monitor`).
4. Watch the live **Subbe MEWS Preview** calculate automatically as you type.
5. Review the **6-Factor Physiological Discharge Checklist**.
6. Click **Submit Vitals**.

### B. Subbe MEWS Early Warning Scoring
- **0 to 2 (STABLE):** Standard 12-hourly ward monitoring.
- **3 to 4 (ELEVATED RISK):** Increase observation frequency to 4-hourly; alert charge nurse.
- **>= 5 (CRITICAL DETERIORATION):** Immediate senior clinical review; initiate ICU escalation.

### C. Explainable AI (XAI) Risk Assessment
1. Click **XAI Risk ⚡** on any patient row.
2. View the ML deterioration probability (e.g. `34% High Risk`).
3. Read the human-readable **Feature Attribution Breakdown** highlighting primary drivers (e.g. severe hypoxemia, tachypnea, hypotension).
4. Review the mandatory **Synthetic Dataset Training Disclosure**.

### D. Bed & ICU Ward Management
1. Click **Bed Management 🛏️** to view the ward layout (2 ICU beds + 7 General beds).
2. Assign a vacant bed to any unassigned patient.
3. Click **Upgrade to ICU** if a patient's MEWS score spikes.
4. Click **Intelligent Bed Reallocation** to automatically prioritize critical patients into available ICU beds.
5. **Discharging a Patient:**
   - If MEWS <= 2: Click **Discharge Patient** to free the bed immediately.
   - If MEWS >= 3: The system blocks discharge for patient safety. To proceed under physician orders, check **Clinical Supervisor Override** and provide justification.

### E. Inpatient Care Plans
1. Click **Care Plans 📝** on the patient row.
2. View existing active clinical instructions, medication schedules, and special precautions.
3. Add new nursing instructions (e.g. *"Monitor vitals Q2H; keep head of bed elevated 30°"*).

### F. Inter-Hospital Transfers
1. Click **Transfers 🚑** on the patient row.
2. The transfer network analyzes the patient's condition, required bed type (ICU/Ward), and chief complaint.
3. Review recommended destination facilities ranked by driving distance, ICU bed availability, and specialty alignment.
4. Click **Dispatch Transfer** to initiate coordination.

---

## 5. Unified Patient Profile (8-Tab Dossier)

Click **Unified Profile 📋** on any row to open the full dossier:

1. **Overview Tab:** Demographics, current bed, active alerts, clinical status.
2. **Vitals & MEWS Tab:** Historical vitals observations, parameter trends, Subbe breakdown audit trail.
3. **ML Risk & XAI Tab:** Model predictions, feature attribution, model accuracy metrics.
4. **Care Plans Tab:** Active and past nursing care instructions.
5. **Bed & Transfer Tab:** Ward admission history and transfer records.
6. **Intake History Tab:** Outpatient intake sessions and full transcript messages.
7. **Documents & OCR Tab:** Uploaded lab reports, prescriptions, character-level OCR text.
8. **Unified Timeline Tab:** Chronological audit trail of all patient events with provenance source and staff actor attribution.
