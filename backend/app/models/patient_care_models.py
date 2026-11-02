"""
Pydantic Request & Response Schemas for Patient Care Module
===========================================================
Strict input validation bounds, clinical units, and structured output schemas.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any


class VitalsSubmissionRequest(BaseModel):
    heart_rate: int = Field(..., ge=20, le=260, description="Heart rate in beats per minute (bpm)")
    blood_pressure_sys: int = Field(..., ge=40, le=300, description="Systolic blood pressure in mmHg")
    blood_pressure_dia: Optional[int] = Field(80, ge=30, le=200, description="Diastolic blood pressure in mmHg")
    respiratory_rate: int = Field(..., ge=4, le=60, description="Respiratory rate in breaths per minute")
    temperature: float = Field(..., ge=30.0, le=45.0, description="Body temperature in degrees Celsius (°C)")
    oxygen_saturation: int = Field(..., ge=50, le=100, description="Pulse oximetry SpO2 percentage (%)")
    observation_source: str = Field("bedside_manual", description="Observation source: bedside_manual | ad8232_simulation | triage_intake")
    staff_id: Optional[str] = Field(None, description="Staff identifier who recorded observation")
    session_id: Optional[str] = Field(None, description="Optional associated clinical session ID")


class MEWSEvaluationRequest(BaseModel):
    heart_rate: Optional[int] = Field(None, ge=20, le=260)
    blood_pressure_sys: Optional[int] = Field(None, ge=40, le=300)
    respiratory_rate: Optional[int] = Field(None, ge=4, le=60)
    temperature: Optional[float] = Field(None, ge=30.0, le=45.0)
    oxygen_saturation: Optional[int] = Field(None, ge=50, le=100)


class RiskAssessmentRequest(BaseModel):
    preferred_model: Optional[str] = Field("random_forest", description="random_forest | gradient_boosting | svm | logistic_regression")
    heart_rate: Optional[int] = None
    blood_pressure_sys: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    triage_level: Optional[int] = Field(None, ge=1, le=5)


class CarePlanCreateRequest(BaseModel):
    care_instructions: str = Field(..., min_length=3, description="Clinical care and observation directives")
    medications: Optional[str] = Field("", description="Administered or scheduled medications")
    special_instructions: Optional[str] = Field("", description="Precautions, dietary, or mobility instructions")
    session_id: Optional[str] = None
    staff_id: Optional[str] = None


class BedAssignmentRequest(BaseModel):
    bed_number: str = Field(..., description="Bed identifier, e.g. 'ICU-01', 'GEN-101'")
    session_id: Optional[str] = None
    staff_id: Optional[str] = None


class TransferInitiateRequest(BaseModel):
    target_hospital_name: str = Field(..., min_length=2)
    distance_km: float = Field(..., ge=0.1)
    bed_type_needed: str = Field("General", description="'ICU' | 'General'")
    specialization: Optional[str] = ""
    contact_phone: Optional[str] = ""
    transfer_score: Optional[int] = Field(75, ge=0, le=100)
    notes: Optional[str] = ""
    staff_id: Optional[str] = None


class PatientAdmissionRequest(BaseModel):
    bed_number: str = Field(..., description="Bed identifier, e.g. 'ICU-01', 'GEN-101'")
    patient_id: Optional[str] = Field(None, description="Existing patient ID, e.g. 'PAT-XXXXXXXX'")
    full_name: Optional[str] = Field(None, description="Full name if registering new patient")
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[str] = Field(None, description="'male', 'female', 'other'")
    phone: Optional[str] = Field(None, description="Contact phone number")
    triage_level: Optional[int] = Field(3, ge=1, le=5)
    chief_complaint: Optional[str] = Field("", description="Reason for inpatient admission")
    staff_id: Optional[str] = None
    session_id: Optional[str] = None
