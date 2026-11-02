"""
FastAPI Router: Patient Care Module for Healthcare Staff Workstation
===================================================================
Exposes RESTful endpoints for:
- Staff Inpatient Monitoring (Aggregated MEWS and Red-Flag Patients)
- Bed & ICU Inventory, Assignment, Optimization, and Upgrade
- Vital Signs Recording & Historical Trends
- MEWS (Modified Early Warning Score) Calculation & Breakdown
- Machine Learning Risk Assessment & Explainable AI (XAI)
- Personalized Clinical Care Plans
- Inter-Hospital Transfer Recommendations & Requests
- AD8232 Simulated ECG Telemetry Stream

Architectural Constraints:
- Non-destructive additions to existing MediKiosk FastAPI backend.
- Full compliance with Rules 8, 9, 10, 11, and 12.
- Distinct conversational vs physiological alert classification.
- Transparent clinical decision-support and simulation disclaimers.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from app.models.patient_care_models import (
    VitalsSubmissionRequest,
    MEWSEvaluationRequest,
    RiskAssessmentRequest,
    CarePlanCreateRequest,
    BedAssignmentRequest,
    TransferInitiateRequest,
    PatientAdmissionRequest
)

from app.services.patient_care.mews_service import (
    calculate_mews,
    assess_discharge_readiness,
    RULESET_VERSION,
    DISCLAIMER_TEXT as MEWS_DISCLAIMER
)
from app.services.patient_care.ml_risk_service import (
    ml_risk_service,
    CLINICAL_DISCLAIMER as ML_DISCLAIMER,
    SYNTHETIC_DATA_DISCLOSURE
)
from app.services.patient_care.ecg_service import (
    ecg_simulator,
    ECG_SIMULATION_DISCLAIMER
)
from app.services.patient_care.transfer_service import (
    generate_transfer_recommendations,
    calculate_transfer_score
)

from database import (
    get_connection,
    register_patient,
    get_patient_by_phone,
    save_session,
    get_patient_by_id,
    record_patient_vitals,
    get_patient_latest_vitals,
    get_patient_vitals_history,
    record_mews_assessment_db,
    get_patient_mews_history,
    record_ml_risk_assessment_db,
    get_hospital_beds,
    assign_patient_bed,
    release_patient_bed,
    upgrade_patient_to_icu,
    optimize_hospital_beds,
    discharge_patient_care,
    create_patient_care_plan,
    get_patient_care_plans,
    record_patient_transfer,
    get_patient_transfers,
    get_staff_monitored_patients,
    get_patient_unified_profile,
    get_patient_timeline
)

router = APIRouter()


# =============================================================================
# 1. STAFF PATIENT MONITORING (Rules 8 & 9 Compliance)
# =============================================================================

@router.get("/patients")
def list_monitored_patients(
    hospital_id: str = Query("hosp-medikiosk", description="Target hospital identifier"),
    ward: Optional[str] = Query(None, description="Optional ward filter (e.g. 'ICU Ward', 'Ward A', 'Ward B', 'Ward C')"),
    filter_type: Optional[str] = Query(None, description="Optional filter: 'critical_mews', 'intake_red_flags', 'icu', 'discharge_ready'")
):
    """
    Returns aggregated patient census for the staff workstation.
    Clearly distinguishes intake conversational red flags from physiological MEWS alerts (Rule 9).
    """
    result = get_staff_monitored_patients(hospital_id=hospital_id, ward=ward, filter_type=filter_type)
    return result


# =============================================================================
# 2. BEDS & ICU MANAGEMENT
# =============================================================================

@router.get("/beds")
def list_hospital_beds(
    hospital_id: str = Query("hosp-medikiosk", description="Target hospital identifier"),
    ward: Optional[str] = Query(None, description="Optional ward filter")
):
    """
    Retrieves full ward and ICU bed status for the specified hospital.
    Includes current occupancy, assigned patient details, and latest MEWS.
    """
    beds = get_hospital_beds(hospital_id=hospital_id, ward=ward)
    return {
        "success": True,
        "hospital_id": hospital_id,
        "total_beds": len(beds),
        "occupied_beds": sum(1 for b in beds if b["status"] == "occupied"),
        "vacant_beds": sum(1 for b in beds if b["status"] == "vacant"),
        "beds": beds
    }


@router.post("/beds/optimize")
def optimize_beds(
    hospital_id: str = Query("hosp-medikiosk", description="Target hospital identifier")
):
    """
    Executes automated bed optimization:
    Identifies deteriorating patients (MEWS >= 4 or High Deterioration Risk) in General beds
    and reallocates them to vacant ICU beds or swaps with stable patients in ICU (MEWS <= 2).
    """
    result = optimize_hospital_beds(hospital_id)
    return result


@router.post("/patients/{patient_id}/bed")
def assign_bed(
    patient_id: str,
    request: BedAssignmentRequest,
    hospital_id: str = Query("hosp-medikiosk")
):
    """
    Assigns a specific vacant bed to a patient.
    """
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    result = assign_patient_bed(
        hospital_id=hospital_id,
        bed_number=request.bed_number,
        patient_id=patient_id,
        session_id=request.session_id,
        staff_id=request.staff_id
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/patients/{patient_id}/upgrade-icu")
def upgrade_icu(
    patient_id: str,
    hospital_id: str = Query("hosp-medikiosk")
):
    """
    Searches for an available ICU bed and reassigns the patient immediately.
    """
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    result = upgrade_patient_to_icu(hospital_id, patient_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/patients/{patient_id}/discharge")
def discharge_patient(
    patient_id: str,
    hospital_id: str = Query("hosp-medikiosk"),
    override: bool = Query(False, description="Clinical override to discharge despite MEWS >= 3")
):
    """
    Discharges a patient, vacating their assigned bed and marking clinical discharge status.
    Blocks discharge if MEWS >= 3 unless clinical override is specified.
    """
    result = discharge_patient_care(hospital_id=hospital_id, patient_id=patient_id, override=override)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.get("/unassigned-patients")
def list_unassigned_patients(hospital_id: str = Query("hosp-medikiosk")):
    """
    Returns list of patients registered in or with sessions at the hospital
    who do NOT currently have an assigned bed, making them eligible for inpatient admission.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT p.patient_id, p.full_name, p.age, p.gender, p.phone,
               s.session_id, s.department, s.doctor_name, s.status as session_status,
               s.red_flag as intake_red_flag, s.red_flag_reason,
               p.created_at
        FROM patients p
        LEFT JOIN sessions s ON p.patient_id = s.patient_id AND s.hospital_id = ?
        LEFT JOIN patient_beds b ON p.patient_id = b.patient_id AND b.hospital_id = ?
        WHERE (s.hospital_id = ? OR b.hospital_id = ? OR b.bed_id IS NULL)
          AND p.patient_id NOT IN (
              SELECT patient_id FROM patient_beds WHERE hospital_id = ? AND status = 'occupied' AND patient_id IS NOT NULL
          )
        ORDER BY p.created_at DESC
        LIMIT 60
    """, (hospital_id, hospital_id, hospital_id, hospital_id, hospital_id))
    rows = cur.fetchall()
    conn.close()

    unassigned = []
    seen = set()
    for r in rows:
        pid = r["patient_id"]
        if pid in seen:
            continue
        seen.add(pid)
        unassigned.append({
            "patient_id": pid,
            "full_name": r["full_name"],
            "age": r["age"],
            "gender": r["gender"],
            "phone": r["phone"],
            "session_id": r["session_id"],
            "department": r["department"],
            "doctor_name": r["doctor_name"],
            "session_status": r["session_status"],
            "has_intake_red_flag": bool(r["intake_red_flag"]),
            "intake_red_flag_reason": r["red_flag_reason"]
        })
    return {"success": True, "count": len(unassigned), "patients": unassigned}


@router.post("/admit")
def admit_and_allocate_bed(
    request: PatientAdmissionRequest,
    hospital_id: str = Query("hosp-medikiosk")
):
    """
    Admits a patient and immediately allocates a vacant bed.
    Supports admitting an existing registered/OPD patient or quick-admitting an emergency walk-in patient.
    """
    target_patient_id = request.patient_id
    full_name = request.full_name

    # If no existing patient_id, register new patient
    if not target_patient_id:
        if not full_name or not full_name.strip():
            raise HTTPException(status_code=400, detail="Full name is required for new patient admission")

        email = f"admit.{uuid.uuid4().hex[:6]}@hospital.local"
        phone = request.phone or f"9{uuid.uuid4().int % 1000000000:09d}"

        reg_res = register_patient(
            full_name=full_name.strip(),
            email=email,
            phone=phone,
            age=request.age or 45,
            gender=request.gender or "unspecified",
            password="tempPassword123"
        )
        if not reg_res.get("success"):
            # If phone exists, lookup existing
            p_exist = get_patient_by_phone(phone)
            if p_exist:
                target_patient_id = p_exist["patient_id"]
                full_name = p_exist["full_name"]
            else:
                raise HTTPException(status_code=400, detail=reg_res.get("error"))
        else:
            target_patient_id = reg_res["patient_id"]

        # Create an admission session for records
        sess_id = f"sess-admit-{uuid.uuid4().hex[:8]}"
        save_session(
            session_id=sess_id,
            language="en",
            patient_id=target_patient_id,
            doctor_name="Attending Ward Physician",
            department="Inpatient Ward",
            hospital_id=hospital_id
        )
    else:
        pat = get_patient_by_id(target_patient_id)
        if not pat:
            raise HTTPException(status_code=404, detail=f"Patient '{target_patient_id}' not found")
        full_name = pat.get("full_name")
        sess_id = request.session_id

    # Assign bed
    result = assign_patient_bed(
        hospital_id=hospital_id,
        bed_number=request.bed_number,
        patient_id=target_patient_id,
        session_id=sess_id,
        staff_id=request.staff_id
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return {
        "success": True,
        "patient_id": target_patient_id,
        "full_name": full_name,
        "bed_number": request.bed_number,
        "message": f"Patient '{full_name}' admitted and assigned to Bed {request.bed_number} successfully."
    }


# =============================================================================
# 3. VITALS & OBSERVATION TIMELINE
# =============================================================================

@router.get("/patients/{patient_id}/vitals")
def get_latest_vitals(patient_id: str):
    """
    Retrieves the most recent vital observation snapshot for a patient.
    """
    vitals = get_patient_latest_vitals(patient_id)
    if not vitals:
        return {
            "success": False,
            "patient_id": patient_id,
            "message": "No vital signs recorded yet for this patient"
        }
    return {
        "success": True,
        "patient_id": patient_id,
        "vitals": vitals
    }


@router.get("/patients/{patient_id}/vitals/history")
def get_vitals_history(
    patient_id: str,
    limit: int = Query(20, ge=1, le=100)
):
    """
    Retrieves historical vital sign trend timeline ordered newest to oldest.
    """
    history = get_patient_vitals_history(patient_id, limit=limit)
    return {
        "success": True,
        "patient_id": patient_id,
        "count": len(history),
        "history": history
    }


@router.post("/patients/{patient_id}/vitals")
def record_vitals(
    patient_id: str,
    request: VitalsSubmissionRequest,
    hospital_id: str = Query("hosp-medikiosk")
):
    """
    Records bedside vital signs, computes MEWS score, evaluates discharge readiness,
    computes ML deterioration risk, and records the observation timestamp and source (Rule 10).
    """
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    # 1. Compute MEWS
    mews_res = calculate_mews(
        heart_rate=request.heart_rate,
        blood_pressure_sys=request.blood_pressure_sys,
        respiratory_rate=request.respiratory_rate,
        temperature=request.temperature,
        oxygen_saturation=request.oxygen_saturation
    )

    # 2. Assess Discharge Readiness
    discharge_eval = assess_discharge_readiness(
        heart_rate=request.heart_rate,
        blood_pressure_sys=request.blood_pressure_sys,
        respiratory_rate=request.respiratory_rate,
        temperature=request.temperature,
        oxygen_saturation=request.oxygen_saturation,
        mews_score=mews_res["total_score"]
    )

    # 3. Predict ML Risk
    patient_features = {
        "age": patient.get("age", 45),
        "heart_rate": request.heart_rate,
        "blood_pressure_sys": request.blood_pressure_sys,
        "respiratory_rate": request.respiratory_rate,
        "temperature": request.temperature,
        "oxygen_saturation": request.oxygen_saturation,
        "triage_level": patient.get("triage_level", 3),
        "mews_score": mews_res["total_score"]
    }
    ml_res = ml_risk_service.predict(patient_features)

    # 4. Persist to patient_vitals
    vital_record = record_patient_vitals(
        patient_id=patient_id,
        hospital_id=hospital_id,
        heart_rate=request.heart_rate,
        blood_pressure_sys=request.blood_pressure_sys,
        blood_pressure_dia=request.blood_pressure_dia or 80,
        respiratory_rate=request.respiratory_rate,
        temperature=request.temperature,
        oxygen_saturation=request.oxygen_saturation,
        mews_score=mews_res["total_score"],
        mews_explanation=mews_res["explanation"],
        deterioration_risk=ml_res["critical_risk"],
        observation_source=request.observation_source,
        staff_id=request.staff_id,
        session_id=request.session_id
    )

    # 5. Persist MEWS breakdown into mews_assessments
    vital_id = vital_record.get("vital_id")
    mews_id = record_mews_assessment_db(patient_id, vital_id, mews_res)

    # 6. Persist ML prediction & XAI explanation into ml_risk_assessments
    risk_id = record_ml_risk_assessment_db(patient_id, vital_id, ml_res, patient_features)

    return {
        "success": True,
        "vital_id": vital_id,
        "mews_assessment_id": mews_id,
        "risk_assessment_id": risk_id,
        "patient_id": patient_id,
        "recorded_at": vital_record.get("recorded_at"),
        "observation_source": request.observation_source,
        "vitals": {
            "vital_id": vital_id,
            "patient_id": patient_id,
            "heart_rate": request.heart_rate,
            "blood_pressure_sys": request.blood_pressure_sys,
            "blood_pressure_dia": request.blood_pressure_dia or 80,
            "respiratory_rate": request.respiratory_rate,
            "temperature": request.temperature,
            "oxygen_saturation": request.oxygen_saturation,
            "mews_score": mews_res["total_score"],
            "observation_source": request.observation_source,
            "recorded_at": vital_record.get("recorded_at")
        },
        "mews": mews_res,
        "ml_risk": ml_res,
        "discharge_readiness": discharge_eval,
        "disclaimer": ML_DISCLAIMER
    }


# =============================================================================
# 4. MEWS SCORE EVALUATION
# =============================================================================

@router.post("/patients/{patient_id}/mews")
def evaluate_mews(
    patient_id: str,
    request: MEWSEvaluationRequest
):
    """
    Computes MEWS score based on supplied parameters or existing patient vitals.
    Provides complete parameter-by-parameter clinical breakdown (Subbe et al., 2001).
    """
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    # If any vital is missing in request, fallback to latest recorded vitals
    latest = get_patient_latest_vitals(patient_id) or {}
    hr = request.heart_rate if request.heart_rate is not None else latest.get("heart_rate")
    bp = request.blood_pressure_sys if request.blood_pressure_sys is not None else latest.get("blood_pressure_sys")
    rr = request.respiratory_rate if request.respiratory_rate is not None else latest.get("respiratory_rate")
    temp = request.temperature if request.temperature is not None else latest.get("temperature")
    spo2 = request.oxygen_saturation if request.oxygen_saturation is not None else latest.get("oxygen_saturation")

    mews_res = calculate_mews(
        heart_rate=hr,
        blood_pressure_sys=bp,
        respiratory_rate=rr,
        temperature=temp,
        oxygen_saturation=spo2
    )

    # Persist calculation
    assessment_id = record_mews_assessment_db(patient_id, latest.get("vital_id"), mews_res)
    mews_res["assessment_id"] = assessment_id

    return {
        "success": True,
        "patient_id": patient_id,
        "mews": mews_res
    }


@router.get("/patients/{patient_id}/mews")
def get_mews_history(
    patient_id: str,
    limit: int = Query(10, ge=1, le=50)
):
    """
    Retrieves MEWS scoring history with parameter breakdowns.
    """
    history = get_patient_mews_history(patient_id, limit=limit)
    return {
        "success": True,
        "patient_id": patient_id,
        "count": len(history),
        "history": history
    }


# =============================================================================
# 5. ML RISK ASSESSMENT & EXPLAINABLE AI (XAI)
# =============================================================================

@router.post("/patients/{patient_id}/risk-assessment")
def perform_risk_assessment(
    patient_id: str,
    request: RiskAssessmentRequest
):
    """
    Executes machine learning risk prediction with feature attribution XAI.
    Uses Random Forest / Gradient Boosting / SVM / Logistic Regression trained models,
    with automatic graceful fallback to deterministic clinical rules engine.
    """
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    latest = get_patient_latest_vitals(patient_id) or {}

    patient_features = {
        "age": patient.get("age", 45),
        "heart_rate": request.heart_rate if request.heart_rate is not None else latest.get("heart_rate", 75),
        "blood_pressure_sys": request.blood_pressure_sys if request.blood_pressure_sys is not None else latest.get("blood_pressure_sys", 120),
        "respiratory_rate": request.respiratory_rate if request.respiratory_rate is not None else latest.get("respiratory_rate", 16),
        "temperature": request.temperature if request.temperature is not None else latest.get("temperature", 36.6),
        "oxygen_saturation": request.oxygen_saturation if request.oxygen_saturation is not None else latest.get("oxygen_saturation", 98),
        "triage_level": request.triage_level if request.triage_level is not None else patient.get("triage_level", 3),
        "mews_score": latest.get("mews_score", 0)
    }

    prediction = ml_risk_service.predict(
        patient_data=patient_features,
        model_name=request.preferred_model or "random_forest"
    )

    estimated_los = ml_risk_service.predict_length_of_stay(patient_features)

    # Persist assessment
    risk_id = record_ml_risk_assessment_db(
        patient_id=patient_id,
        vital_id=latest.get("vital_id"),
        ml_result=prediction,
        input_features=patient_features
    )

    return {
        "success": True,
        "assessment_id": risk_id,
        "patient_id": patient_id,
        "prediction": prediction,
        "estimated_length_of_stay_days": estimated_los,
        "synthetic_data_notice": SYNTHETIC_DATA_DISCLOSURE,
        "clinical_disclaimer": ML_DISCLAIMER
    }


@router.get("/patients/{patient_id}/risk-explanation")
def get_risk_explanation(patient_id: str):
    """
    Retrieves human-readable Explainable AI (XAI) feature attribution breakdown
    explaining the key clinical factors driving the deterioration risk prediction.
    """
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    latest = get_patient_latest_vitals(patient_id) or {}
    patient_features = {
        "age": patient.get("age", 45),
        "heart_rate": latest.get("heart_rate", 75),
        "blood_pressure_sys": latest.get("blood_pressure_sys", 120),
        "respiratory_rate": latest.get("respiratory_rate", 16),
        "temperature": latest.get("temperature", 36.6),
        "oxygen_saturation": latest.get("oxygen_saturation", 98),
        "triage_level": patient.get("triage_level", 3),
        "mews_score": latest.get("mews_score", 0)
    }

    risk_score = latest.get("deterioration_risk", 0.15)
    explanation_text = ml_risk_service.generate_explanation(patient_features, risk_score)

    return {
        "success": True,
        "patient_id": patient_id,
        "risk_score": risk_score,
        "explanation": explanation_text,
        "synthetic_data_notice": SYNTHETIC_DATA_DISCLOSURE,
        "clinical_disclaimer": ML_DISCLAIMER
    }


@router.get("/xai/models")
def get_xai_models_performance():
    """
    Returns performance metrics of pre-trained ML models (Accuracy, Precision, Recall, F1)
    along with mandatory synthetic training data disclosures (Rule 12).
    """
    return {
        "success": True,
        "models_available": list(ml_risk_service.models.keys()),
        "performance_metrics": ml_risk_service.model_performance,
        "synthetic_data_notice": SYNTHETIC_DATA_DISCLOSURE,
        "clinical_disclaimer": ML_DISCLAIMER
    }


# =============================================================================
# 6. CARE PLANS
# =============================================================================

@router.get("/patients/{patient_id}/care-plans")
def list_care_plans(patient_id: str):
    """
    Retrieves all personalized care plans for the patient.
    """
    plans = get_patient_care_plans(patient_id)
    return {
        "success": True,
        "patient_id": patient_id,
        "count": len(plans),
        "care_plans": plans
    }


@router.post("/patients/{patient_id}/care-plans")
def create_care_plan(
    patient_id: str,
    request: CarePlanCreateRequest,
    hospital_id: str = Query("hosp-medikiosk")
):
    """
    Creates a new personalized inpatient care plan.
    """
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    result = create_patient_care_plan(
        patient_id=patient_id,
        hospital_id=hospital_id,
        care_instructions=request.care_instructions,
        medications=request.medications or "",
        special_instructions=request.special_instructions or "",
        staff_id=request.staff_id,
        session_id=request.session_id
    )
    return {
        "success": True,
        "plan_id": result.get("plan_id"),
        "patient_id": patient_id,
        "created_at": result.get("created_at"),
        "care_plan": {
            "plan_id": result.get("plan_id"),
            "patient_id": patient_id,
            "care_instructions": request.care_instructions,
            "medications": request.medications or "",
            "special_instructions": request.special_instructions or "",
            "created_at": result.get("created_at")
        }
    }


# =============================================================================
# 7. INTER-HOSPITAL TRANSFERS
# =============================================================================

@router.get("/patients/{patient_id}/transfers")
def get_transfer_recommendations(
    patient_id: str,
    needs_icu: bool = Query(False, description="Flag indicating ICU bed requirement"),
    chief_complaint: str = Query("", description="Patient chief complaint for specialization matching")
):
    """
    Calculates transfer recommendations for nearby partner hospitals based on:
    distance, available beds, medical specialization match, and historical success rates.
    Also returns any previously initiated transfers for this patient.
    """
    recommendations = generate_transfer_recommendations(
        patient_id=patient_id,
        needs_icu=needs_icu,
        chief_complaint=chief_complaint
    )
    initiated_transfers = get_patient_transfers(patient_id)

    return {
        "success": True,
        "patient_id": patient_id,
        "needs_icu": needs_icu,
        "recommendations": recommendations,
        "initiated_transfers": initiated_transfers
    }


@router.post("/patients/{patient_id}/transfers/initiate")
def initiate_transfer(
    patient_id: str,
    request: TransferInitiateRequest,
    hospital_id: str = Query("hosp-medikiosk")
):
    """
    Records an initiated inter-hospital transfer request.
    """
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    result = record_patient_transfer(
        patient_id=patient_id,
        from_hospital_id=hospital_id,
        to_hospital_name=request.target_hospital_name,
        distance_km=request.distance_km,
        bed_type_needed=request.bed_type_needed,
        specialization=request.specialization or "",
        transfer_score=request.transfer_score or 75,
        contact_phone=request.contact_phone or "",
        notes=request.notes or "",
        staff_id=request.staff_id
    )
    return result


# =============================================================================
# 8. AD8232 ECG SENSOR TELEMETRY SIMULATOR (Rule 11 Compliance)
# =============================================================================

@router.post("/ecg/connect")
def connect_ecg_simulator():
    """
    Initializes simulated AD8232 ECG sensor connection.
    Includes mandatory demonstration disclaimer (Rule 11).
    """
    return ecg_simulator.connect()


@router.get("/ecg/data")
def read_ecg_data():
    """
    Retrieves the latest synthetic ECG telemetry frame with waveform data points,
    heart rate, and arrhythmia flag. Auto-connects if simulator was offline.
    """
    if not ecg_simulator.connected:
        ecg_simulator.connect()

    frame = ecg_simulator.read_data()
    return {
        "success": True,
        "connected": True,
        "telemetry": frame,
        "disclaimer": ECG_SIMULATION_DISCLAIMER
    }


@router.post("/ecg/disconnect")
def disconnect_ecg_simulator():
    """
    Terminates simulated AD8232 ECG sensor stream.
    """
    return ecg_simulator.disconnect()


# =============================================================================
# 8. PHASE 4: UNIFIED PATIENT PROFILE & CHRONOLOGICAL TIMELINE
# =============================================================================

@router.get("/patients/{patient_id}/unified-profile")
def get_unified_patient_profile_endpoint(
    patient_id: str,
    hospital_id: Optional[str] = Query(None, description="Optional hospital context filter"),
    timeline_limit: int = Query(150, ge=1, le=500, description="Max timeline events to return")
):
    """
    Phase 4 Unified Clinical Patient Profile Aggregator.
    Retrieves a unified 360-degree patient dossier across:
    - Patient identity & demographics (patients table)
    - AI intake conversation transcripts & patient-reported complaints (sessions & messages)
    - Uploaded medical documents & OCR extraction (documents)
    - Contradiction detection & resolution history (contradictions)
    - Clinical summaries & hospital EMR archives (sessions & emr_records)
    - Conversational red flags & nurse acknowledgements (sessions)
    - Bedside vital observations & observation source tracking (patient_vitals, Rule 10)
    - Standardized MEWS early warning scoring (mews_assessments, Subbe 2001)
    - ML deterioration risk predictions & Explainable AI (ml_risk_assessments & risk_explanations, Rule 12)
    - Inpatient bed & ICU ward allocations (patient_beds)
    - Inpatient personalized care plans (patient_care_plans)
    - Inter-hospital transfer recommendations & coordination (patient_transfers)
    - Chronological unified clinical timeline
    """
    profile = get_patient_unified_profile(patient_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Patient with ID '{patient_id}' not found.")
    return profile


@router.get("/patients/{patient_id}/timeline")
def get_patient_timeline_endpoint(
    patient_id: str,
    limit: int = Query(150, ge=1, le=500),
    reverse: bool = Query(False, description="Set true for oldest-first, false for newest-first")
):
    """
    Retrieves the chronological unified patient timeline.
    """
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient with ID '{patient_id}' not found.")

    events = get_patient_timeline(patient_id, limit=limit, reverse=reverse)
    return {
        "success": True,
        "patient_id": patient_id,
        "count": len(events),
        "timeline": events
    }

