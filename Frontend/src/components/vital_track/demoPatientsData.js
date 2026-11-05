/**
 * MediKiosk - Synthetic Admitted Inpatient Demonstration Dataset
 * =============================================================
 * Provides 5 realistic, clinically structured demo inpatient scenarios
 * for staff workstation demonstration without altering production DB:
 * 
 * PATIENT 1 - STABLE: Normal vitals, low MEWS (0), low XAI (12%), active care plan.
 * PATIENT 2 - HIGH MEWS: Deteriorating vitals, critical MEWS (6), bedside alert.
 * PATIENT 3 - HIGH XAI RISK: Moderate MEWS, high ML deterioration probability (84%), XAI factor breakdown.
 * PATIENT 4 - ABNORMAL VITALS: Rapidly fluctuating vitals, SpO2/HR warnings, dynamic threshold alerts.
 * PATIENT 5 - TRANSFER SCENARIO: Assigned to ward bed, fully prepared for inter-hospital transfer demonstration.
 * 
 * STRICT RULES:
 * - All records are clearly labeled as DEMO / SYNTHETIC.
 * - Never persist synthetic data to real hospital records.
 * - Stable identifiers during session.
 * - Can be reset to initial state anytime.
 */

export const INITIAL_DEMO_PATIENTS = [
  {
    patient_id: "DEMO-PAT-001",
    full_name: "Vikram Sengupta (Demo)",
    age: 44,
    gender: "Male",
    is_admitted: true,
    admission_status: "admitted",
    bed_number: "GEN-101",
    bed_type: "General",
    ward: "Ward A (Medical)",
    bed_status: "occupied",
    triage_level: 2,
    comorbidities: "Mild Hypertension",
    session_id: "demo-sess-001",
    department: "General Medicine",
    doctor_name: "Dr. Priya Sharma",
    admitted_at: "2026-11-04T10:30:00",
    created_at: "2026-11-04T10:30:00",
    // Clinical Vitals
    heart_rate: 72,
    blood_pressure_sys: 120,
    blood_pressure_dia: 80,
    respiratory_rate: 16,
    temperature: 36.6,
    oxygen_saturation: 99,
    mews_score: 0,
    mews_category: "Normal",
    deterioration_risk: 0.12,
    risk_category: "Low",
    scenario: "stable",
    scenario_label: "Stable Inpatient",
    notes: "Post-operative day 2 laparoscopic cholecystectomy. Vitals within expected normal physiological limits.",
    care_plan: {
      plan_id: "cp-demo-001",
      title: "Routine Post-Surgical Recovery Care Plan",
      created_at: "2026-11-04T11:00:00",
      tasks: [
        { id: "t1", text: "q8h Bedside vital signs inspection", done: true, time: "08:00 AM" },
        { id: "t2", text: "Encourage progressive ward ambulation", done: true, time: "11:30 AM" },
        { id: "t3", text: "Oral analgesic review with attending physician", done: false, time: "06:00 PM" },
        { id: "t4", text: "Discharge criteria physiological re-screening", done: false, time: "Tomorrow 09:00 AM" },
      ],
      diet: "Normal diabetic diet, adequate oral hydration",
      nursing_notes: "Alert, oriented x4, pain score 2/10 at surgical site.",
    },
    is_demo: true,
  },
  {
    patient_id: "DEMO-PAT-002",
    full_name: "Meera R. Kulkarni (Demo)",
    age: 68,
    gender: "Female",
    is_admitted: true,
    admission_status: "admitted",
    bed_number: "ICU-201",
    bed_type: "ICU",
    ward: "Intensive Care Unit",
    bed_status: "occupied",
    triage_level: 1,
    comorbidities: "COPD, Type 2 Diabetes, Coronary Artery Disease",
    session_id: "demo-sess-002",
    department: "Cardiology",
    doctor_name: "Dr. Rajesh Gupta",
    admitted_at: "2026-11-05T04:15:00",
    created_at: "2026-11-05T04:15:00",
    // Clinical Vitals - High MEWS: HR 118 (+2), RR 26 (+2), BP 94/58 (+1), Temp 38.6 (+1) = 6 pts
    heart_rate: 118,
    blood_pressure_sys: 94,
    blood_pressure_dia: 58,
    respiratory_rate: 26,
    temperature: 38.6,
    oxygen_saturation: 93,
    mews_score: 6,
    mews_category: "Critical",
    deterioration_risk: 0.76,
    risk_category: "High",
    scenario: "high_mews",
    scenario_label: "Elevated MEWS (Score 6)",
    notes: "Acute exacerbation of chronic respiratory distress with fever. Physiological decompensation triggering immediate ICU clinical protocol.",
    care_plan: {
      plan_id: "cp-demo-002",
      title: "ICU Acute Deterioration Stabilization Protocol",
      created_at: "2026-11-05T04:30:00",
      tasks: [
        { id: "t1", text: "Continuous multi-parameter bedside telemetry", done: true, time: "Continuous" },
        { id: "t2", text: "High-flow supplemental O2 via Venturi mask (Target SpO2 ≥ 92%)", done: true, time: "Active" },
        { id: "t3", text: "Arterial blood gas (ABG) analysis repeat", done: false, time: "18:30" },
        { id: "t4", text: "IV broad-spectrum antibiotic infusion", done: true, time: "16:00" },
      ],
      diet: "NPO (Nil per os) pending stabilization",
      nursing_notes: "Tachypneic at rest, accessory muscle use observed. Attending notified.",
    },
    is_demo: true,
  },
  {
    patient_id: "DEMO-PAT-003",
    full_name: "Anand Verma (Demo)",
    age: 72,
    gender: "Male",
    is_admitted: true,
    admission_status: "admitted",
    bed_number: "GEN-102",
    bed_type: "General",
    ward: "Ward B (Cardiorespiratory)",
    bed_status: "occupied",
    triage_level: 2,
    comorbidities: "Ischemic Heart Disease, Chronic Renal Insufficiency",
    session_id: "demo-sess-003",
    department: "Cardiology",
    doctor_name: "Dr. Rajesh Gupta",
    admitted_at: "2026-11-04T18:00:00",
    created_at: "2026-11-04T18:00:00",
    // Clinical Vitals - Moderate MEWS but High XAI risk
    heart_rate: 98,
    blood_pressure_sys: 148,
    blood_pressure_dia: 92,
    respiratory_rate: 22,
    temperature: 37.4,
    oxygen_saturation: 95,
    mews_score: 2,
    mews_category: "Low-Moderate",
    deterioration_risk: 0.84,
    risk_category: "High Risk (XAI 84%)",
    scenario: "high_xai",
    scenario_label: "High XAI Risk (84%)",
    review_required: true,
    notes: "Explainable AI (XAI) engine detected high occult decompensation probability despite deceptively low baseline MEWS score.",
    xai_breakdown: [
      { factor: "Cardiovascular Autonomic Strain", contribution: "34%", direction: "elevates_risk" },
      { factor: "Tachypnea with Arterial Pressure Gap", contribution: "28%", direction: "elevates_risk" },
      { factor: "Age-Adjusted Renal Comorbidity Index", contribution: "22%", direction: "elevates_risk" },
    ],
    care_plan: {
      plan_id: "cp-demo-003",
      title: "XAI Early Intervention & Renal Monitoring Plan",
      created_at: "2026-11-04T19:00:00",
      tasks: [
        { id: "t1", text: "Urgent Attending Physician Clinical Review", done: false, time: "Pending Review" },
        { id: "t2", text: "Hourly automated blood pressure cycling", done: true, time: "Hourly" },
        { id: "t3", text: "Serum creatinine and electrolyte panel", done: true, time: "14:00" },
        { id: "t4", text: "Evaluate for prophylactic ICU transfer", done: false, time: "Next Assessment" },
      ],
      diet: "Renal protective low-sodium, fluid restricted to 1500ml/24h",
      nursing_notes: "Cardiologist review requested based on AI risk prediction alert.",
    },
    is_demo: true,
  },
  {
    patient_id: "DEMO-PAT-004",
    full_name: "Fatima Bi (Demo)",
    age: 58,
    gender: "Female",
    is_admitted: true,
    admission_status: "admitted",
    bed_number: "GEN-103",
    bed_type: "General",
    ward: "Ward A (Medical)",
    bed_status: "occupied",
    triage_level: 2,
    comorbidities: "Asthma, Mild Obesity",
    session_id: "demo-sess-004",
    department: "Pulmonology",
    doctor_name: "Dr. Arvind Patel",
    admitted_at: "2026-11-05T08:30:00",
    created_at: "2026-11-05T08:30:00",
    // Clinical Vitals - Fluctuating Abnormal Vitals
    heart_rate: 106,
    blood_pressure_sys: 136,
    blood_pressure_dia: 86,
    respiratory_rate: 24,
    temperature: 37.8,
    oxygen_saturation: 91,
    mews_score: 4,
    mews_category: "Warning",
    deterioration_risk: 0.58,
    risk_category: "Moderate",
    scenario: "abnormal_vitals",
    scenario_label: "Abnormal Vitals (Desaturation)",
    notes: "Sudden oxygen desaturation event (SpO2 91%) with mild tachycardia. Threshold alert active in monitoring board.",
    care_plan: {
      plan_id: "cp-demo-004",
      title: "Acute Desaturation Pathway",
      created_at: "2026-11-05T09:00:00",
      tasks: [
        { id: "t1", text: "Nasal cannula O2 titration at 2L/min", done: true, time: "Active" },
        { id: "t2", text: "Nebulization therapy (Salbutamol + Ipratropium)", done: true, time: "12:00" },
        { id: "t3", text: "Bedside peak flow measurement", done: false, time: "18:00" },
      ],
      diet: "Soft diet as tolerated",
      nursing_notes: "SpO2 improved to 94% on supplemental nasal cannula.",
    },
    is_demo: true,
  },
  {
    patient_id: "DEMO-PAT-005",
    full_name: "Gurpreet Singh (Demo)",
    age: 52,
    gender: "Male",
    is_admitted: true,
    admission_status: "admitted",
    bed_number: "GEN-104",
    bed_type: "General",
    ward: "Ward C (Step-Down)",
    bed_status: "occupied",
    triage_level: 2,
    comorbidities: "Aortic Valve Stenosis",
    session_id: "demo-sess-005",
    department: "Cardiology",
    doctor_name: "Dr. Rajesh Gupta",
    admitted_at: "2026-11-03T14:00:00",
    created_at: "2026-11-03T14:00:00",
    // Clinical Vitals - Clinically ready for tertiary transfer
    heart_rate: 80,
    blood_pressure_sys: 128,
    blood_pressure_dia: 82,
    respiratory_rate: 18,
    temperature: 36.8,
    oxygen_saturation: 98,
    mews_score: 1,
    mews_category: "Stable",
    deterioration_risk: 0.28,
    risk_category: "Low",
    scenario: "transfer_scenario",
    scenario_label: "Transfer Ready (Specialty Referral)",
    transfer_status: "recommended",
    target_specialty: "Interventional Cardiac Catheterization",
    recommended_hospital: "Apollo Multi-Specialty Hospital (3.4 km)",
    notes: "Hemodynamically stabilized. Requires tertiary referral to Apollo Multi-Specialty for catheter-based intervention.",
    care_plan: {
      plan_id: "cp-demo-005",
      title: "Inter-Hospital Transfer Preparation Plan",
      created_at: "2026-11-04T16:00:00",
      tasks: [
        { id: "t1", text: "Destination ICU bed confirmation at Apollo", done: true, time: "Completed" },
        { id: "t2", text: "Clinical summary and ECG export preparation", done: true, time: "Completed" },
        { id: "t3", text: "Initiate ambulance transit dispatch", done: false, time: "Pending Action" },
      ],
      diet: "Light cardiac diet",
      nursing_notes: "Patient and family consented for inter-hospital transfer.",
    },
    is_demo: true,
  },
];

export const DEMO_STORAGE_KEY = "medikiosk_demo_patients_v1";

/**
 * Retrieves the current session's synthetic patients from localStorage
 * or initializes them from default templates.
 */
export function getDemoPatients() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Could not read demo patients from storage:", e);
  }
  saveDemoPatients(INITIAL_DEMO_PATIENTS);
  return INITIAL_DEMO_PATIENTS;
}

/**
 * Persists updated demo patient states into localStorage (isolated from DB)
 */
export function saveDemoPatients(patients) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(patients));
  } catch (e) {
    console.warn("Could not save demo patients to storage:", e);
  }
}

/**
 * Resets demo patients back to factory defaults
 */
export function resetDemoPatients() {
  saveDemoPatients(INITIAL_DEMO_PATIENTS);
  return INITIAL_DEMO_PATIENTS;
}

/**
 * Updates a specific demo patient's bed/location (for transfer workflow)
 */
export function transferDemoPatient(patientId, destinationHospital, targetBed = "ICU-Bed-01") {
  const current = getDemoPatients();
  const updated = current.map((p) => {
    if (p.patient_id === patientId) {
      return {
        ...p,
        transferred: true,
        transferred_at: new Date().toISOString(),
        destination_hospital: destinationHospital,
        bed_number: `${targetBed} (${destinationHospital})`,
        ward: "External Transit / Transferred",
        scenario_label: `Transferred to ${destinationHospital}`,
      };
    }
    return p;
  });
  saveDemoPatients(updated);
  return updated;
}

/**
 * Checks whether a given patient identifier belongs to the synthetic demo suite.
 */
export function isDemoPatientId(patientId) {
  return Boolean(patientId && String(patientId).startsWith("DEMO-"));
}

/**
 * Updates an individual demo patient's state in localStorage without altering DB.
 */
export function updateDemoPatient(patientId, updates) {
  const current = getDemoPatients();
  const updated = current.map((p) => {
    if (p.patient_id === patientId) {
      return { ...p, ...updates };
    }
    return p;
  });
  saveDemoPatients(updated);
  return updated;
}

/**
 * Calculates Subbe MEWS score and records bedside vitals for demo inpatient.
 */
export function recordDemoVitals(patientId, vitalsData, staffId = "staff-001") {
  const hr = Number(vitalsData.heart_rate) || 72;
  const sys = Number(vitalsData.blood_pressure_sys) || 120;
  const dia = Number(vitalsData.blood_pressure_dia) || 80;
  const rr = Number(vitalsData.respiratory_rate) || 16;
  const temp = Number(vitalsData.temperature) || 36.8;
  const spo2 = Number(vitalsData.oxygen_saturation) || 98;

  // Subbe et al. (2001) Standard MEWS Calculation
  let mews = 0;
  if (hr < 40 || hr > 130) mews += 3;
  else if (hr <= 50 || hr > 110) mews += 2;
  else if (hr > 100) mews += 1;

  if (sys < 70 || sys > 200) mews += 3;
  else if (sys <= 80 || sys > 170) mews += 2;
  else if (sys <= 90 || sys > 150) mews += 1;

  if (rr < 9 || rr > 30) mews += 3;
  else if (rr > 20) mews += 2;
  else if (rr >= 15) mews += 1;

  if (temp < 35.0 || temp > 38.5) mews += 2;

  if (spo2 < 85) mews += 3;
  else if (spo2 <= 91) mews += 2;
  else if (spo2 <= 94) mews += 1;

  const mewsCategory =
    mews >= 6 ? "Critical" : mews >= 4 ? "Warning" : mews >= 2 ? "Low-Moderate" : "Normal";
  const detRisk = Math.min(0.95, Math.max(0.05, Number((mews * 0.14 + (sys < 90 ? 0.2 : 0)).toFixed(2))));

  const recordedAt = new Date().toISOString();
  const vitalRecord = {
    vital_id: "vit-demo-" + Date.now(),
    patient_id: patientId,
    session_id: "demo-sess-" + patientId.replace("DEMO-PAT-", ""),
    hospital_id: "hosp-medikiosk",
    heart_rate: hr,
    blood_pressure_sys: sys,
    blood_pressure_dia: dia,
    respiratory_rate: rr,
    temperature: temp,
    oxygen_saturation: spo2,
    mews_score: mews,
    mews_explanation: `Bedside observation: MEWS score ${mews} (${mewsCategory})`,
    deterioration_risk: detRisk,
    observation_source: vitalsData.observation_source || "bedside_manual",
    recorded_by_staff_id: staffId,
    recorded_at: recordedAt,
  };

  updateDemoPatient(patientId, {
    heart_rate: hr,
    blood_pressure_sys: sys,
    blood_pressure_dia: dia,
    respiratory_rate: rr,
    temperature: temp,
    oxygen_saturation: spo2,
    mews_score: mews,
    mews_category: mewsCategory,
    deterioration_risk: detRisk,
    risk_category: detRisk >= 0.7 ? "High" : detRisk >= 0.4 ? "Moderate" : "Low",
    last_vitals_recorded_at: recordedAt,
  });

  return vitalRecord;
}

/**
 * Returns a fully assembled 12-facet clinical profile dictionary for synthetic patients.
 * Mimics backend `get_patient_unified_profile` completely with rich clinical documentation.
 */
export function getDemoPatientUnifiedProfile(patientId) {
  const allDemo = getDemoPatients();
  const pat = allDemo.find((p) => p.patient_id === patientId) || INITIAL_DEMO_PATIENTS.find((p) => p.patient_id === patientId);
  if (!pat) return null;

  const sid = pat.session_id || `demo-sess-${pat.patient_id.replace("DEMO-PAT-", "")}`;
  const now = new Date();
  const timeOffset = (hoursAgo) => new Date(now.getTime() - hoursAgo * 3600 * 1000).toISOString();

  // 1. Patient Demographics & Identity
  const patientInfo = {
    patient_id: pat.patient_id,
    full_name: pat.full_name,
    email: `${pat.patient_id.toLowerCase()}@demo.medikiosk.local`,
    phone: "+91 98765 " + pat.patient_id.replace("DEMO-PAT-", "4321"),
    age: pat.age,
    gender: pat.gender,
    created_at: pat.created_at || timeOffset(36),
    triage_level: pat.triage_level || 2,
    discharge_ready: pat.admission_status === "discharged" ? 1 : pat.mews_score === 0 ? 1 : 0,
    needs_icu: pat.bed_type === "ICU" || pat.mews_score >= 5 ? 1 : 0,
    assigned_bed: pat.bed_number,
    bed_number: pat.bed_number,
    ward: pat.ward,
    is_admitted: pat.is_admitted,
    comorbidities: pat.comorbidities || "None reported",
    medical_history: pat.notes || "Reviewed by attending physician.",
    doctor_name: pat.doctor_name || "Dr. Priya Sharma",
    department: pat.department || "General Medicine",
    is_demo: true,
  };

  // 2. Physiological Vitals & History (at least 4 points)
  const currentVitals = {
    vital_id: "vit-demo-live-" + pat.patient_id,
    patient_id: pat.patient_id,
    session_id: sid,
    hospital_id: "hosp-medikiosk",
    heart_rate: pat.heart_rate,
    blood_pressure_sys: pat.blood_pressure_sys,
    blood_pressure_dia: pat.blood_pressure_dia,
    respiratory_rate: pat.respiratory_rate,
    temperature: pat.temperature,
    oxygen_saturation: pat.oxygen_saturation,
    mews_score: pat.mews_score,
    mews_explanation: `Standard Subbe MEWS: Score ${pat.mews_score} (${pat.mews_category})`,
    deterioration_risk: pat.deterioration_risk,
    observation_source: "bedside_manual",
    recorded_by_staff_id: "staff-001",
    recorded_at: pat.last_vitals_recorded_at || timeOffset(1),
  };

  const vitalsHistory = [
    currentVitals,
    {
      vital_id: "vit-demo-h1-" + pat.patient_id,
      patient_id: pat.patient_id,
      session_id: sid,
      hospital_id: "hosp-medikiosk",
      heart_rate: Math.max(50, pat.heart_rate - 4),
      blood_pressure_sys: pat.blood_pressure_sys + 4,
      blood_pressure_dia: pat.blood_pressure_dia + 2,
      respiratory_rate: Math.max(12, pat.respiratory_rate - 2),
      temperature: Number((pat.temperature - 0.2).toFixed(1)),
      oxygen_saturation: Math.min(100, pat.oxygen_saturation + 1),
      mews_score: Math.max(0, pat.mews_score - 1),
      mews_explanation: "Bedside round check",
      deterioration_risk: Number(Math.max(0.05, pat.deterioration_risk - 0.05).toFixed(2)),
      observation_source: "bedside_manual",
      recorded_by_staff_id: "staff-001",
      recorded_at: timeOffset(4),
    },
    {
      vital_id: "vit-demo-h2-" + pat.patient_id,
      patient_id: pat.patient_id,
      session_id: sid,
      hospital_id: "hosp-medikiosk",
      heart_rate: Math.min(130, pat.heart_rate + 6),
      blood_pressure_sys: Math.max(80, pat.blood_pressure_sys - 6),
      blood_pressure_dia: Math.max(50, pat.blood_pressure_dia - 4),
      respiratory_rate: pat.respiratory_rate,
      temperature: pat.temperature,
      oxygen_saturation: pat.oxygen_saturation,
      mews_score: pat.mews_score,
      mews_explanation: "Prior shift nursing observation",
      deterioration_risk: pat.deterioration_risk,
      observation_source: "bedside_manual",
      recorded_by_staff_id: "staff-002",
      recorded_at: timeOffset(9),
    },
    {
      vital_id: "vit-demo-h3-" + pat.patient_id,
      patient_id: pat.patient_id,
      session_id: sid,
      hospital_id: "hosp-medikiosk",
      heart_rate: pat.heart_rate,
      blood_pressure_sys: pat.blood_pressure_sys,
      blood_pressure_dia: pat.blood_pressure_dia,
      respiratory_rate: pat.respiratory_rate,
      temperature: pat.temperature,
      oxygen_saturation: pat.oxygen_saturation,
      mews_score: pat.mews_score,
      mews_explanation: "Initial ward admission baseline observation",
      deterioration_risk: pat.deterioration_risk,
      observation_source: "triage_intake",
      recorded_by_staff_id: "staff-001",
      recorded_at: pat.admitted_at || timeOffset(18),
    },
  ];

  // 3. Clinical Scenarios Specifics
  let demoTranscript = [];
  let demoDocuments = [];
  let demoContradictions = [];
  let demoMewsBreakdown = {};
  let demoRiskBreakdown = [];
  let demoDoctorNotes = "";
  let demoFinalReport = "";

  if (pat.patient_id === "DEMO-PAT-001") {
    // Stable Post-Op Cholecystectomy
    demoTranscript = [
      { id: 1, sender: "bot", message: "Welcome to MediKiosk. Please describe what brought you in today.", created_at: timeOffset(24) },
      { id: 2, sender: "user", message: "I am on post-op day 2 after gallbladder surgery. Mild soreness at the belly button.", created_at: timeOffset(24) },
      { id: 3, sender: "bot", message: "Understood. Have you experienced any fever, persistent nausea, or yellowing of the eyes?", created_at: timeOffset(23) },
      { id: 4, sender: "user", message: "No fever at all. Appetite is returning, able to walk around the corridor.", created_at: timeOffset(23) },
      { id: 5, sender: "bot", message: "Your vital signs are reassuring. A surgical recovery evaluation summary has been prepared.", created_at: timeOffset(23) },
    ];
    demoDocuments = [
      {
        id: "doc-demo-001",
        session_id: sid,
        filename: "Laparoscopic_Cholecystectomy_Operative_Record.pdf",
        extracted_text: "PROCEDURE: Laparoscopic cholecystectomy. INDICATION: Symptomatic cholelithiasis. FINDINGS: Chronic cholecystitis with multiple gallstones. Cystic duct and artery identified, clipped and divided with Hem-o-lok. Gallbladder dissected off liver bed without perforation. Hemostasis achieved. Sponge/needle counts correct. Specimen retrieved via Endobag.",
        char_count: 362,
        created_at: timeOffset(24),
        provenance_source: "uploaded_ocr_document",
      },
      {
        id: "doc-demo-002",
        session_id: sid,
        filename: "PostOp_Metabolic_CBC_Panel.pdf",
        extracted_text: "LABORATORY REPORT: Hemoglobin: 13.6 g/dL | WBC: 6,800 /mcL (Normal) | Platelets: 235,000 /mcL | Serum Sodium: 139 mEq/L | Potassium: 4.2 mEq/L | Serum Creatinine: 0.9 mg/dL | Total Bilirubin: 0.8 mg/dL. Impression: Normal postoperative metabolic profile.",
        char_count: 274,
        created_at: timeOffset(22),
        provenance_source: "uploaded_ocr_document",
      },
    ];
    demoMewsBreakdown = { hr_score: 0, bp_score: 0, rr_score: 0, temp_score: 0, spo2_score: 0, total_score: 0 };
    demoRiskBreakdown = [
      { factor: "Uncomplicated Post-Op Trajectory", contribution: "38%", direction: "reduces_risk" },
      { factor: "Stable Hemodynamic Base", contribution: "34%", direction: "reduces_risk" },
      { factor: "Normal Inflammatory Markers", contribution: "28%", direction: "reduces_risk" },
    ];
    demoDoctorNotes = "Patient is alert, comfortable, and ambulating independently. Surgical puncture sites clean and dry with no erythema or discharge. Tolerating regular diet. Discharge scheduled following final morning review.";
    demoFinalReport = "CLINICAL SUMMARY: 44-year-old male on Post-Operative Day 2 status-post elective laparoscopic cholecystectomy. Physiological indices completely normalized (MEWS 0). Tolerating oral feeding with return of normal bowel sounds. Ready for outpatient convalescence.";
  } else if (pat.patient_id === "DEMO-PAT-002") {
    // ICU Elevated MEWS 6 - COPD Decompensation
    demoTranscript = [
      { id: 1, sender: "bot", message: "Welcome to MediKiosk. Please indicate your primary symptoms.", created_at: timeOffset(12) },
      { id: 2, sender: "user", message: "Severe shortness of breath, cannot catch breath even while sitting. Coughing green phlegm.", created_at: timeOffset(12) },
      { id: 3, sender: "bot", message: "Do you have any chest tightness, blue lips, or high fever?", created_at: timeOffset(12) },
      { id: 4, sender: "user", message: "Yes, burning in chest, fever began last night, inhalers not helping at all.", created_at: timeOffset(11) },
      { id: 5, sender: "bot", message: "CRITICAL ALERT: High respiratory distress detected. Triage escalated to Urgent Resuscitation.", created_at: timeOffset(11) },
    ];
    demoDocuments = [
      {
        id: "doc-demo-201",
        session_id: sid,
        filename: "Emergency_Arterial_Blood_Gas_Analysis.pdf",
        extracted_text: "ARTERIAL BLOOD GAS (ABG): pH: 7.31 (Acidotic) | PaCO2: 58 mmHg (Hypercapnia) | PaO2: 61 mmHg (Hypoxemia) | HCO3: 29 mEq/L | SaO2: 91%. Impression: Acute respiratory acidosis superimposed on chronic hypercapnic respiratory failure.",
        char_count: 247,
        created_at: timeOffset(10),
        provenance_source: "uploaded_ocr_document",
      },
      {
        id: "doc-demo-202",
        session_id: sid,
        filename: "Bedside_Chest_Radiograph_AP.pdf",
        extracted_text: "PORTABLE CHEST AP: Hyperinflated lung parenchyma with flattened diaphragms. Prominent bilateral interstitial markings and confluent patchy consolidation at the right lower lung base, consistent with acute bronchopneumonia in COPD patient.",
        char_count: 254,
        created_at: timeOffset(9),
        provenance_source: "uploaded_ocr_document",
      },
    ];
    demoMewsBreakdown = { hr_score: 2, bp_score: 1, rr_score: 2, temp_score: 1, spo2_score: 0, total_score: 6 };
    demoRiskBreakdown = [
      { factor: "Tachypnea & Respiratory Acidosis", contribution: "42%", direction: "elevates_risk" },
      { factor: "Tachycardia & Hypotensive Drift", contribution: "32%", direction: "elevates_risk" },
      { factor: "Severe COPD Comorbidity Index", contribution: "26%", direction: "elevates_risk" },
    ];
    demoDoctorNotes = "Patient in marked respiratory distress with accessory muscle use. Admitted to ICU-201. Started on 35% Venturi supplemental O2, continuous nebulization with ipratropium/salbutamol, IV hydrocortisone, and broad-spectrum piperacillin-tazobactam. Continuous pulse oximetry and serial ABGs ordered.";
    demoFinalReport = "CLINICAL SUMMARY: 68-year-old female with acute severe exacerbation of COPD (AECOPD) and right lower lobe bronchopneumonia. Critically elevated MEWS of 6 with persistent tachypnea (RR 26) and tachycardia (HR 118). Multi-disciplinary ICU management protocol initiated.";
  } else if (pat.patient_id === "DEMO-PAT-003") {
    // High XAI Risk 84% - Occult Cardiorenal Decompensation
    demoTranscript = [
      { id: 1, sender: "bot", message: "MediKiosk Clinical Assistant. Please describe your symptoms today.", created_at: timeOffset(20) },
      { id: 2, sender: "user", message: "Dull pressure in my center chest and left shoulder. Feeling very dizzy when standing up.", created_at: timeOffset(20) },
      { id: 3, sender: "bot", message: "Have you noticed any swelling in your legs or change in urine frequency?", created_at: timeOffset(19) },
      { id: 4, sender: "user", message: "Hardly passed any urine since yesterday morning. Ankles are swollen.", created_at: timeOffset(19) },
      { id: 5, sender: "bot", message: "Noted. Your cardiovascular and renal markers will be cross-referenced for early intervention.", created_at: timeOffset(19) },
    ];
    demoDocuments = [
      {
        id: "doc-demo-301",
        session_id: sid,
        filename: "CardioRenal_Biomarker_Panel.pdf",
        extracted_text: "SERUM BIOMARKERS: High-Sensitivity Troponin I: 48 ng/L (Elevated, ref < 14) | NT-proBNP: 2,120 pg/mL (Significantly elevated) | Serum Creatinine: 2.3 mg/dL (Baseline 1.1 mg/dL) | Blood Urea Nitrogen: 46 mg/dL | eGFR: 28 mL/min/1.73m2. Impression: Acute on chronic cardiorenal strain.",
        char_count: 295,
        created_at: timeOffset(18),
        provenance_source: "uploaded_ocr_document",
      },
      {
        id: "doc-demo-302",
        session_id: sid,
        filename: "12_Lead_ECG_Telemetry_Strip.pdf",
        extracted_text: "12-LEAD ELECTROCARDIOGRAM: Rate: 98 bpm. Rhythm: Sinus tachycardia. PR interval: 160 ms. QRS duration: 92 ms. ST-T Segment: Deep T-wave inversions across anterolateral leads V4-V6 with subtle 0.5mm ST depressions in lead II and aVF. No acute STEMI criteria.",
        char_count: 268,
        created_at: timeOffset(17),
        provenance_source: "uploaded_ocr_document",
      },
    ];
    demoMewsBreakdown = { hr_score: 0, bp_score: 1, rr_score: 1, temp_score: 0, spo2_score: 0, total_score: 2 };
    demoRiskBreakdown = [
      { factor: "Cardiovascular Autonomic Strain", contribution: "34%", direction: "elevates_risk" },
      { factor: "Tachypnea with Arterial Pressure Gap", contribution: "28%", direction: "elevates_risk" },
      { factor: "Age-Adjusted Renal Comorbidity Index", contribution: "22%", direction: "elevates_risk" },
    ];
    demoDoctorNotes = "Patient presents with subtle presentation but XAI predictive analytics flagged high early deterioration risk (84%). Elevated hs-cTnI and acute creatinine doubling suggest Type 2 Cardiorenal syndrome. Commenced on gentle diuresis, dual antiplatelet therapy, and telemetry monitoring.";
    demoFinalReport = "CLINICAL SUMMARY: 72-year-old male with subacute coronary ischemia and acute kidney injury (Cardiorenal Syndrome). Low immediate MEWS score (2) masked by early autonomic compensation; XAI deterioration index 84%. Monitored in Ward B pending serial enzyme clearance.";
  } else if (pat.patient_id === "DEMO-PAT-004") {
    // Fluctuating Abnormal Vitals - Acute Asthma Flare
    demoTranscript = [
      { id: 1, sender: "bot", message: "Welcome to MediKiosk. What symptoms are you experiencing?", created_at: timeOffset(10) },
      { id: 2, sender: "user", message: "Sudden tight chest and loud wheezing after cleaning the attic. My blue inhaler didn't help.", created_at: timeOffset(10) },
      { id: 3, sender: "bot", message: "Are you struggling to complete full sentences? Any lip discoloration?", created_at: timeOffset(9) },
      { id: 4, sender: "user", message: "Can speak... a few words at a time... feel faint.", created_at: timeOffset(9) },
      { id: 5, sender: "bot", message: "Immediate bronchodilation protocol activated. Oxygen saturation alert triggered.", created_at: timeOffset(9) },
    ];
    demoDocuments = [
      {
        id: "doc-demo-401",
        session_id: sid,
        filename: "Bedside_Peak_Flow_Spirometry.pdf",
        extracted_text: "SPIROMETRY & PEAK FLOW: Peak Expiratory Flow Rate (PEFR): 175 L/min (42% of predicted normal 415 L/min) | FEV1: 1.15 L (48% predicted) | FEV1/FVC ratio: 0.61. Post-bronchodilator PEFR: 230 L/min (55% predicted, +31% reversibility). Impression: Severe acute airflow limitation with partial bronchodilator response.",
        char_count: 326,
        created_at: timeOffset(8),
        provenance_source: "uploaded_ocr_document",
      },
    ];
    demoMewsBreakdown = { hr_score: 1, bp_score: 0, rr_score: 1, temp_score: 0, spo2_score: 2, total_score: 4 };
    demoRiskBreakdown = [
      { factor: "Acute Hypoxemic Desaturation (SpO2 91%)", contribution: "44%", direction: "elevates_risk" },
      { factor: "Expiratory Airflow Resistance & Tachypnea", contribution: "34%", direction: "elevates_risk" },
      { factor: "Sinus Tachycardia Stress Response", contribution: "22%", direction: "elevates_risk" },
    ];
    demoDoctorNotes = "Admitted for acute asthma exacerbation triggered by dust and allergen exposure. SpO2 dipped to 91% on admission. Placed on 2L nasal cannula, repeated nebulization, oral prednisone 40mg. SpO2 improved to 95% post-treatment.";
    demoFinalReport = "CLINICAL SUMMARY: 58-year-old female admitted with acute bronchospasm and desaturation event. MEWS 4 on arrival. Demonstrating favorable response to bronchodilators with progressive stabilization of respiratory rate and oxygenation.";
  } else {
    // DEMO-PAT-005: Transfer Scenario - Severe Aortic Valve Stenosis
    demoTranscript = [
      { id: 1, sender: "bot", message: "Welcome to MediKiosk. Please detail the reason for your visit.", created_at: timeOffset(48) },
      { id: 2, sender: "user", message: "I collapsed while climbing the stairs at the train station. Blacked out for a minute.", created_at: timeOffset(48) },
      { id: 3, sender: "bot", message: "Did you have chest pain before fainting? Any palpitations or shortness of breath?", created_at: timeOffset(47) },
      { id: 4, sender: "user", message: "Shortness of breath on walking for months. Doctor said I have a tight heart valve.", created_at: timeOffset(47) },
      { id: 5, sender: "bot", message: "Cardiology consultation initiated. Syncope in aortic stenosis flagged for tertiary transfer review.", created_at: timeOffset(47) },
    ];
    demoDocuments = [
      {
        id: "doc-demo-501",
        session_id: sid,
        filename: "Transthoracic_Echocardiography_Report.pdf",
        extracted_text: "ECHOCARDIOGRAPHY REPORT: Heavy calcification of trileaflet aortic valve with severely restricted excursion. Aortic Valve Area (AVA): 0.68 cm2 | Peak Jet Velocity: 4.45 m/s | Mean Pressure Gradient: 48 mmHg | LVEF: 52% | Concentric left ventricular hypertrophy without regional wall motion abnormality. Impression: Severe symptomatic calcific aortic stenosis with exertional syncope.",
        char_count: 402,
        created_at: timeOffset(40),
        provenance_source: "uploaded_ocr_document",
      },
      {
        id: "doc-demo-502",
        session_id: sid,
        filename: "Pre_Transfer_Cardiac_Workup.pdf",
        extracted_text: "CARDIAC CATHETERIZATION PREPARATION: Coronary anatomy screening requested prior to transcatheter valve replacement. Blood type: O Positive. Cross-match completed. Chest CT Angiography scheduled at tertiary receiving center.",
        char_count: 231,
        created_at: timeOffset(24),
        provenance_source: "uploaded_ocr_document",
      },
    ];
    demoMewsBreakdown = { hr_score: 0, bp_score: 0, rr_score: 0, temp_score: 0, spo2_score: 1, total_score: 1 };
    demoRiskBreakdown = [
      { factor: "Critical Valvular Obstruction Gradient", contribution: "50%", direction: "elevates_risk" },
      { factor: "Exertional Syncope History", contribution: "30%", direction: "elevates_risk" },
      { factor: "Compensated Rest Hemodynamics", contribution: "20%", direction: "reduces_risk" },
    ];
    demoDoctorNotes = "Patient hemodynamically compensated at rest on Bed GEN-104. Severe aortic stenosis with exertional syncope is a class I indication for valve replacement. Coordinating urgent inter-hospital transfer to Apollo Multi-Specialty for catheter-based intervention (TAVR).";
    demoFinalReport = "CLINICAL SUMMARY: 52-year-old male with severe calcific aortic stenosis (AVA 0.68 cm2, mean gradient 48 mmHg) admitted after exertional syncope. Currently stable in step-down care. Recommended for transfer to Apollo Multi-Specialty Hospital for specialized cardiac cath/TAVR procedure.";
  }

  // 4. Inpatient Bed Information
  const activeBedObj = pat.is_admitted
    ? {
        bed_id: "bed-" + pat.patient_id.toLowerCase(),
        hospital_id: "hosp-medikiosk",
        bed_number: pat.bed_number,
        bed_type: pat.bed_type || "General",
        ward: pat.ward || "Ward A",
        status: "occupied",
        patient_id: pat.patient_id,
        assigned_at: pat.admitted_at || timeOffset(20),
      }
    : null;

  // 5. Inpatient Care Plans
  const carePlanObj = pat.care_plan
    ? [
        {
          plan_id: pat.care_plan.plan_id || "cp-" + pat.patient_id.toLowerCase(),
          patient_id: pat.patient_id,
          session_id: sid,
          title: pat.care_plan.title || "Personalized Clinical Care Directive",
          care_instructions: pat.care_plan.tasks ? pat.care_plan.tasks.map((t) => t.text).join(". ") : pat.notes,
          medications: pat.comorbidities || "Routine inpatient medications per MAR",
          special_instructions: pat.care_plan.nursing_notes || "Maintain continuous monitoring.",
          status: "active",
          created_at: pat.care_plan.created_at || timeOffset(16),
          tasks: pat.care_plan.tasks || [],
        },
      ]
    : [];

  // 6. Inter-Hospital Transfers
  const transfers =
    pat.patient_id === "DEMO-PAT-005" || pat.transferred
      ? [
          {
            transfer_id: "tr-demo-005",
            patient_id: pat.patient_id,
            from_hospital_id: "hosp-medikiosk",
            to_hospital_name: pat.destination_hospital || "Apollo Multi-Specialty Hospital (3.4 km)",
            distance_km: 3.4,
            bed_type_needed: "Cardiac Cath / ICU",
            specialization: "Interventional Cardiology / TAVR",
            contact_phone: "+91 80 2630 4050",
            transfer_score: 94,
            transfer_status: pat.transferred ? "completed" : "recommended",
            status: pat.transferred ? "completed" : "recommended",
            notes: pat.transferred ? "Ambulance transit dispatched. Handover completed." : "Tertiary transfer recommended for immediate transcatheter valve replacement.",
            created_at: timeOffset(12),
          },
        ]
      : [];

  // 7. Clinical Summaries / EMR Archive
  const clinicalSummaries = [
    {
      record_id: "emr-demo-" + pat.patient_id,
      hospital_id: "hosp-medikiosk",
      hospital_name: "MediKiosk General Hospital",
      session_id: sid,
      visit_date: (pat.admitted_at || timeOffset(24)).split("T")[0],
      diagnosis: pat.scenario_label || "Clinical Inpatient Monitoring",
      medications: "Reviewed on inpatient admission protocol",
      lab_results: "Uploaded diagnostic documents reviewed and filed",
      notes: demoDoctorNotes,
      timeline_event: `Admitted to ${pat.bed_number} (${pat.ward}) under ${pat.doctor_name}`,
      confirmed_by_doctor: pat.doctor_name,
      confirmed_at: timeOffset(18),
      is_mock: 1,
      created_at: timeOffset(18),
    },
  ];

  // 8. Conversations Array
  const conversations = [
    {
      session_id: sid,
      language: "en",
      doctor_name: pat.doctor_name,
      department: pat.department,
      otp_code: "948216",
      status: "completed",
      verified_at: timeOffset(20),
      final_report: demoFinalReport,
      doctor_notes: demoDoctorNotes,
      doctor_edited_report: demoFinalReport,
      hospital_id: "hosp-medikiosk",
      red_flag: pat.mews_score >= 5 ? 1 : 0,
      red_flag_reason: pat.mews_score >= 5 ? "Critical MEWS threshold triggered on bedside assessment" : null,
      red_flag_acknowledged: pat.mews_score >= 5 ? 1 : 0,
      created_at: pat.created_at || timeOffset(24),
      messages: demoTranscript,
      documents: demoDocuments,
      contradictions: demoContradictions,
    },
  ];

  // 9. Chronological Clinical Timeline
  const timeline = [
    {
      id: "evt-demo-1",
      title: "Patient Registered at MediKiosk Desk",
      category: "registration",
      event_type: "Patient Registration",
      details: `Registered at MediKiosk desk. Age ${pat.age}, ${pat.gender}. Triage level assigned: ${pat.triage_level}.`,
      timestamp: pat.created_at || timeOffset(24),
      provenance: "Hospital Desk Check-In",
      actor: "Nurse Sunita Rawat",
      icon: "UserCheck",
      badge: "Completed",
    },
    {
      id: "evt-demo-2",
      title: "AI Clinical Intake & Triage Interview",
      category: "intake_chat",
      event_type: "AI Intake Dialogue",
      details: `Completed interactive symptoms intake session (${sid}). Primary complaint: ${pat.notes.substring(0, 70)}...`,
      timestamp: timeOffset(23),
      provenance: "MediKiosk AI Engine",
      actor: "Patient & AI Assistant",
      icon: "MessageSquare",
      badge: "Recorded",
    },
    ...(demoDocuments.length > 0
      ? [
          {
            id: "evt-demo-3",
            title: `Medical Records Uploaded (${demoDocuments.length} document${demoDocuments.length > 1 ? "s" : ""})`,
            category: "document_ocr",
            event_type: "OCR Documentation",
            details: `Uploaded ${demoDocuments.map((d) => d.filename).join(", ")}. High-accuracy OCR extracted.`,
            timestamp: timeOffset(22),
            provenance: "MediKiosk OCR Pipeline",
            actor: "System Intake",
            icon: "FileText",
            badge: "Verified",
          },
        ]
      : []),
    {
      id: "evt-demo-4",
      title: `Bed Allocated: ${pat.bed_number} (${pat.ward})`,
      category: "bed_allocation",
      event_type: "Ward Placement",
      details: `Patient assigned to ${pat.bed_type} bed ${pat.bed_number} in ${pat.ward}. Initial physiological monitoring started.`,
      timestamp: pat.admitted_at || timeOffset(20),
      provenance: "VitalTrack Ward Management",
      actor: "Desk Coordinator",
      icon: "BedDouble",
      badge: "Active",
    },
    {
      id: "evt-demo-5",
      title: `Bedside Vitals Assessment: MEWS ${pat.mews_score}`,
      category: "vitals",
      event_type: "Bedside Monitoring",
      details: `HR: ${pat.heart_rate} bpm, BP: ${pat.blood_pressure_sys}/${pat.blood_pressure_dia} mmHg, RR: ${pat.respiratory_rate} bpm, SpO2: ${pat.oxygen_saturation}%. MEWS: ${pat.mews_score} (${pat.mews_category}).`,
      timestamp: pat.last_vitals_recorded_at || timeOffset(1),
      provenance: "Bedside Physiological Monitor",
      actor: "Nurse Sunita Rawat",
      icon: "Activity",
      badge: pat.mews_score >= 5 ? "Critical" : pat.mews_score >= 3 ? "Warning" : "Normal",
    },
    {
      id: "evt-demo-6",
      title: `ML Early Deterioration Prediction (${Math.round(pat.deterioration_risk * 100)}%)`,
      category: "ml_risk",
      event_type: "XAI Predictive Analytics",
      details: `Machine learning risk engine assessed deterioration probability at ${Math.round(pat.deterioration_risk * 100)}%. Model: RandomForest-Clinical-Ensemble.`,
      timestamp: timeOffset(1),
      provenance: "MediKiosk XAI Engine",
      actor: "Predictive Analytics",
      icon: "Cpu",
      badge: pat.deterioration_risk >= 0.7 ? "High Risk" : "Stable",
    },
    ...(pat.transferred || pat.patient_id === "DEMO-PAT-005"
      ? [
          {
            id: "evt-demo-7",
            title: "Tertiary Transfer Protocol Initiated",
            category: "transfer",
            event_type: "Inter-Hospital Coordination",
            details: `Transfer recommended to ${pat.destination_hospital || "Apollo Multi-Specialty Hospital"} for specialized intervention.`,
            timestamp: timeOffset(12),
            provenance: "VitalTrack Transfer Network",
            actor: "Attending Cardiologist",
            icon: "Send",
            badge: pat.transferred ? "Dispatched" : "Pending",
          },
        ]
      : []),
  ];

  return {
    success: true,
    patient: patientInfo,
    clinical_status: {
      has_intake_red_flag: pat.mews_score >= 5,
      has_mews_alert: pat.mews_score >= 4 || pat.deterioration_risk >= 0.7,
      mews_score: pat.mews_score,
      deterioration_risk: pat.deterioration_risk,
      triage_level: pat.triage_level,
      discharge_ready: pat.admission_status === "discharged" || (pat.mews_score === 0 && pat.is_admitted),
      needs_icu: pat.bed_type === "ICU" || pat.mews_score >= 5,
      active_bed: pat.bed_number,
      ward: pat.ward,
      bed_type: pat.bed_type,
    },
    conversations: conversations,
    conversation_alerts:
      pat.mews_score >= 5
        ? [
            {
              session_id: sid,
              reason: "Critical physiological parameters flagged during bedside monitoring",
              department: pat.department,
              flagged_at: timeOffset(2),
              acknowledged: true,
              status: "acknowledged",
              source: "vitaltrack_telemetry",
            },
          ]
        : [],
    medical_documents: demoDocuments,
    contradictions: demoContradictions,
    clinical_summaries: clinicalSummaries,
    external_emr_consents: [
      {
        id: "consent-demo-" + pat.patient_id,
        session_id: sid,
        consented: 1,
        consented_at: timeOffset(24),
      },
    ],
    vitals: {
      latest: currentVitals,
      history: vitalsHistory,
      count: vitalsHistory.length,
    },
    mews_assessments: [
      {
        assessment_id: "mews-assess-" + pat.patient_id,
        patient_id: pat.patient_id,
        vital_id: currentVitals.vital_id,
        hr_score: demoMewsBreakdown.hr_score ?? 0,
        bp_score: demoMewsBreakdown.bp_score ?? 0,
        rr_score: demoMewsBreakdown.rr_score ?? 0,
        temp_score: demoMewsBreakdown.temp_score ?? 0,
        spo2_score: demoMewsBreakdown.spo2_score ?? 0,
        total_score: pat.mews_score,
        clinical_risk_level: pat.mews_category,
        ruleset_version: "Subbe-MEWS-UK-2001-v1",
        explanation: `Subbe et al. score of ${pat.mews_score} points (${pat.mews_category})`,
        calculated_at: currentVitals.recorded_at,
      },
    ],
    risk_assessments: [
      {
        assessment_id: "risk-assess-" + pat.patient_id,
        patient_id: pat.patient_id,
        vital_id: currentVitals.vital_id,
        model_identifier: "RandomForest_Clinical_Ensemble_v2",
        model_version: "2.1-validated",
        predicted_risk: pat.deterioration_risk,
        is_critical: pat.deterioration_risk >= 0.7 ? 1 : 0,
        confidence: 0.92,
        input_features_json: JSON.stringify({
          heart_rate: pat.heart_rate,
          systolic_bp: pat.blood_pressure_sys,
          diastolic_bp: pat.blood_pressure_dia,
          respiratory_rate: pat.respiratory_rate,
          temperature: pat.temperature,
          spo2: pat.oxygen_saturation,
          age: pat.age,
        }),
        status: "valid",
        created_at: currentVitals.recorded_at,
        explanations: [
          {
            explanation_id: "expl-demo-" + pat.patient_id,
            risk_assessment_id: "risk-assess-" + pat.patient_id,
            explanation_method: "clinical_feature_attribution",
            contributing_factors: demoRiskBreakdown,
            recommended_action:
              pat.deterioration_risk >= 0.7
                ? "Immediate clinical escalation and ICU bed evaluation recommended"
                : pat.deterioration_risk >= 0.4
                ? "Increase frequency of bedside vitals tracking to q2h"
                : "Maintain standard ward physiological monitoring protocol",
            disclaimer: "Machine learning prediction is an auxiliary clinical decision aid; attending physician judgment takes precedence.",
            created_at: currentVitals.recorded_at,
          },
        ],
      },
    ],
    bed_information: {
      active_bed: activeBedObj,
      all_allocations: activeBedObj ? [activeBedObj] : [],
    },
    care_plans: carePlanObj,
    transfers: transfers,
    timeline: timeline,
  };
}

