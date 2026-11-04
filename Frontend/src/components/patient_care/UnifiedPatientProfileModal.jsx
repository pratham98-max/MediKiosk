import React, { useState, useEffect, useCallback, useRef } from "react";
import "./patient_care.css";
import VitalRecorderModal from "./VitalRecorderModal";
import XAIRiskModal from "./XAIRiskModal";
import ECGTelemetryModal from "./ECGTelemetryModal";
import CarePlansModal from "./CarePlansModal";
import BedManagementModal from "./BedManagementModal";

export default function UnifiedPatientProfileModal({
  apiBase,
  patientId,
  currentStaff,
  onClose,
  onActionTrigger, // optional callback: (actionType, patientData) => void
}) {
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'timeline' | 'conversations' | 'documents' | 'vitals' | 'mews' | 'ml_risk' | 'hospital_care'
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Sub-modal overlay state
  const [activeSubModal, setActiveSubModal] = useState(null); // 'vitals' | 'xai' | 'carePlans' | 'ecg' | 'bed'
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState({ type: "", text: "" });

  // Real-time ECG simulation state for Card 9
  const [ecgConnected, setEcgConnected] = useState(false);
  const [ecgHR, setEcgHR] = useState(76);
  const [ecgQuality, setEcgQuality] = useState("Optimal (98%)");
  const [ecgArrhythmia, setEcgArrhythmia] = useState(false);
  const canvasRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/staff/patient-care/patients/${patientId}/unified-profile`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to load unified patient profile");
      }
      setProfileData(data);
      if (data.conversations && data.conversations.length > 0) {
        setSelectedSessionId(data.conversations[0].session_id);
      }
    } catch (err) {
      console.error("Unified profile fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, patientId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const formatTimestamp = (ts) => {
    if (!ts) return "Not available";
    try {
      const d = new Date(ts);
      return d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  const patient = profileData?.patient || {};
  const clinicalStatus = profileData?.clinical_status || {};
  const vitals = profileData?.vitals || { history: [], latest: null };
  const latestVitals = vitals.latest;
  const conversations = profileData?.conversations || [];
  const conversationAlerts = profileData?.conversation_alerts || [];
  const documents = profileData?.medical_documents || [];
  const mewsAssessments = profileData?.mews_assessments || [];
  const mlAssessments = profileData?.risk_assessments || [];
  const bedInfo = profileData?.bed_information || {};
  const carePlans = profileData?.care_plans || [];
  const transfers = profileData?.transfers || [];
  const timeline = profileData?.timeline || [];

  const activeBed = bedInfo.active_bed;
  const hasIntakeRf = clinicalStatus.has_intake_red_flag;
  const hasMewsAlert = clinicalStatus.has_mews_alert;
  const currentMews = latestVitals?.mews_score ?? clinicalStatus.mews_score ?? 0;

  // Active patient object with alias fields for sub-modals
  const activePatientForModals = {
    ...patient,
    id: patient.patient_id,
    name: patient.full_name,
    patient_id: patient.patient_id,
    bed_number: activeBed?.bed_number || patient.assigned_bed,
    bed_type: activeBed?.bed_type || (patient.needs_icu ? "ICU" : "general"),
    ward: activeBed?.ward || "Ward A",
    mews_score: currentMews,
    heart_rate: latestVitals?.heart_rate ?? 76,
    blood_pressure: latestVitals ? `${latestVitals.blood_pressure_sys}` : "120",
    blood_pressure_sys: latestVitals?.blood_pressure_sys ?? 120,
    blood_pressure_dia: latestVitals?.blood_pressure_dia ?? 80,
    respiratory_rate: latestVitals?.respiratory_rate ?? 16,
    temperature: latestVitals?.temperature ?? 36.8,
    oxygen_saturation: latestVitals?.oxygen_saturation ?? 98,
    deterioration_risk: latestVitals?.deterioration_risk ?? clinicalStatus.deterioration_risk ?? 0.15,
  };

  // Section 1: Chief Complaint helper
  const derivedChiefComplaint =
    patient.chief_complaint ||
    conversations[0]?.red_flag_reason ||
    conversations[0]?.messages?.find((m) => m.sender === "user")?.message ||
    profileData?.clinical_summaries?.[0]?.diagnosis ||
    "Routine Inpatient Monitoring & Clinical Care";

  // Section 1: Admission time
  const admissionTime = activeBed?.assigned_at || patient.created_at;

  // Section 1 & 8: Predicted Stay
  const predictedStayDays =
    patient.predicted_los ||
    (currentMews >= 5 || patient.needs_icu ? "5 - 7" : currentMews >= 3 ? "3 - 5" : "2 - 3");

  // Section 4: Explainable AI (XAI) calculations
  const latestML = mlAssessments[0];
  const xaiRiskPct =
    latestML?.predicted_risk != null
      ? Math.round(latestML.predicted_risk * 100)
      : clinicalStatus.deterioration_risk != null
      ? Math.round(clinicalStatus.deterioration_risk * 100)
      : latestVitals?.deterioration_risk != null
      ? Math.round(latestVitals.deterioration_risk * 100)
      : 18;

  const xaiModelName = latestML?.model_identifier
    ? latestML.model_identifier.replace(/_/g, " ").toUpperCase()
    : "RANDOM FOREST CLASSIFIER";

  const xaiConfidence = latestML?.confidence != null ? `${latestML.confidence}%` : "94%";

  const xaiExplanationText =
    latestML?.explanations?.[0]?.contributing_factors ||
    latestML?.explanations?.[0]?.disclaimer ||
    (xaiRiskPct >= 70
      ? "CRITICAL PHYSIOLOGICAL RISK: Elevated MEWS deterioration score, abnormal vital parameter boundaries, and urgent clinical triage indicators contribute to algorithmic risk attribution."
      : xaiRiskPct >= 40
      ? "MODERATE PHYSIOLOGICAL RISK: Vital parameters show minor variance from baseline. Recommend 4-hour bedside vital observation and clinical review."
      : "STABLE PHYSIOLOGICAL PROFILE: All monitored vital parameters are within normal physiological bounds. Low probability of critical deterioration.");

  // Section 5: Discharge Readiness 6-factor criteria calculation
  const criteriaList = [
    {
      label: "Heart Rate: 50 – 100 bpm",
      met: latestVitals ? latestVitals.heart_rate >= 50 && latestVitals.heart_rate <= 100 : false,
      value: latestVitals ? `${latestVitals.heart_rate} bpm` : "N/A",
    },
    {
      label: "Systolic Blood Pressure: 90 – 140 mmHg",
      met: latestVitals ? latestVitals.blood_pressure_sys >= 90 && latestVitals.blood_pressure_sys <= 140 : false,
      value: latestVitals ? `${latestVitals.blood_pressure_sys} mmHg` : "N/A",
    },
    {
      label: "Respiratory Rate: 10 – 20 /min",
      met: latestVitals ? latestVitals.respiratory_rate >= 10 && latestVitals.respiratory_rate <= 20 : false,
      value: latestVitals ? `${latestVitals.respiratory_rate} /min` : "N/A",
    },
    {
      label: "Temperature: 36.0 – 38.0 °C",
      met: latestVitals ? latestVitals.temperature >= 36.0 && latestVitals.temperature <= 38.0 : false,
      value: latestVitals ? `${Number(latestVitals.temperature).toFixed(1)} °C` : "N/A",
    },
    {
      label: "Oxygen Saturation: ≥ 95%",
      met: latestVitals ? latestVitals.oxygen_saturation >= 95 : false,
      value: latestVitals ? `${latestVitals.oxygen_saturation}%` : "N/A",
    },
    {
      label: "MEWS Deterioration Score: ≤ 2 pts",
      met: currentMews <= 2,
      value: `${currentMews} pts`,
    },
  ];

  const metCount = criteriaList.filter((c) => c.met).length;
  const isDischargeReady = Boolean(patient.discharge_ready) || (metCount === 6 && Boolean(latestVitals));

  // Section 8: AI Priority Score & Deterioration Risk
  const priorityScore =
    clinicalStatus.priority_score ??
    patient.priority_score ??
    (patient.triage_level === 1 ? 95 : patient.triage_level === 2 ? 80 : patient.triage_level === 3 ? 55 : 30);

  const needsIcu = Boolean(patient.needs_icu) || Boolean(clinicalStatus.needs_icu) || activeBed?.bed_type === "ICU";

  // Section 9: Live HTML5 Canvas oscilloscope drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let x = 0;
    const width = canvas.width || 600;
    const height = canvas.height || 120;
    const midY = height / 2;

    const drawGrid = () => {
      ctx.fillStyle = "#051610";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#0e3324";
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < width; gx += 20) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 20) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }
    };

    drawGrid();

    let lastY = midY;
    let t = 0;

    const animate = () => {
      if (!ecgConnected) return;

      t = (t + 1) % 60;
      let offset = 0;
      if (t >= 8 && t <= 14) {
        // P wave
        offset = -Math.sin(((t - 8) / 6) * Math.PI) * 9;
      } else if (t === 18) {
        // Q dip
        offset = 6;
      } else if (t >= 19 && t <= 23) {
        // R peak
        offset = -((23 - Math.abs(t - 21) * 10) / 23) * 44;
      } else if (t === 24) {
        // S dip
        offset = 12;
      } else if (t >= 32 && t <= 44) {
        // T wave
        offset = -Math.sin(((t - 32) / 12) * Math.PI) * 14;
      }

      offset += (Math.random() - 0.5) * 1.5;
      const currentY = midY + offset;

      // Sweep trailing blur
      ctx.fillStyle = "rgba(5, 22, 16, 0.12)";
      ctx.fillRect(x, 0, 12, height);

      ctx.strokeStyle = ecgArrhythmia ? "#ef4444" : "#10b981";
      ctx.lineWidth = 2;
      ctx.shadowColor = ecgArrhythmia ? "#ef4444" : "#10b981";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(x > 0 ? x - 2 : 0, lastY);
      ctx.lineTo(x, currentY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      lastY = currentY;
      x = (x + 2) % width;
      if (x === 0) {
        lastY = midY;
        drawGrid();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    if (ecgConnected) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      drawGrid();
      // Draw static baseline
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [ecgConnected, ecgArrhythmia]);

  // Real-time ECG toggle handlers
  const handleConnectECG = async () => {
    try {
      await fetch(`${apiBase}/staff/patient-care/ecg/connect`, { method: "POST" });
    } catch {}
    setEcgConnected(true);
    setEcgHR(latestVitals?.heart_rate || 76);
    setEcgQuality("Optimal (98%)");
    setEcgArrhythmia((latestVitals?.heart_rate || 76) > 115 || (latestVitals?.heart_rate || 76) < 50);
  };

  const handleDisconnectECG = async () => {
    try {
      await fetch(`${apiBase}/staff/patient-care/ecg/disconnect`, { method: "POST" });
    } catch {}
    setEcgConnected(false);
  };

  // Discharge patient handler
  const handleDischargePatient = async () => {
    if (!confirm(`Are you sure you want to discharge patient ${patient.full_name || patient.patient_id}?`)) {
      return;
    }
    setActionLoading(true);
    setActionMsg({ type: "", text: "" });

    try {
      const hospId = currentStaff?.hospital_id || "hosp-medikiosk";
      const res = await fetch(
        `${apiBase}/staff/patient-care/patients/${patient.patient_id}/discharge?hospital_id=${hospId}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Discharge failed");
      }
      setActionMsg({ type: "success", text: data.message || "Patient successfully discharged and bed vacated." });
      await fetchProfile();
      if (onActionTrigger) onActionTrigger("discharged", patient);
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // ICU upgrade handler
  const handleUpgradeICU = async () => {
    if (!confirm(`Transfer patient ${patient.full_name || patient.patient_id} to an available ICU bed immediately?`)) {
      return;
    }
    setActionLoading(true);
    setActionMsg({ type: "", text: "" });

    try {
      const hospId = currentStaff?.hospital_id || "hosp-medikiosk";
      const res = await fetch(
        `${apiBase}/staff/patient-care/patients/${patient.patient_id}/upgrade-icu?hospital_id=${hospId}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "ICU upgrade failed");
      }
      setActionMsg({ type: "success", text: data.message || `Patient upgraded to ICU bed ${data.bed_number}.` });
      await fetchProfile();
      if (onActionTrigger) onActionTrigger("icu_upgraded", patient);
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter timeline items for Tab 2
  const filteredTimeline = timeline.filter((item) => {
    if (timelineFilter === "all") return true;
    if (timelineFilter === "vitals") return item.category === "vitals" || item.category === "mews";
    if (timelineFilter === "intake")
      return item.category === "intake_chat" || item.category === "red_flag" || item.category === "registration";
    if (timelineFilter === "documents") return item.category === "document_ocr" || item.category === "contradiction";
    if (timelineFilter === "consult") return item.category === "doctor_consultation" || item.category === "emr";
    if (timelineFilter === "care")
      return item.category === "care_plan" || item.category === "bed_allocation" || item.category === "transfer";
    return true;
  });

  const selectedSession = conversations.find((s) => s.session_id === selectedSessionId) || conversations[0];

  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div
        className="pc-modal-window unified-profile-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className="pc-modal-header"
          style={{ padding: "16px 24px", background: "var(--paper)", borderBottom: "1px solid var(--line)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "24px" }}>👤</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, color: "var(--ink)" }}>{patient.full_name || "Patient Profile"}</h3>
                <span className="pc-bed-type-pill pill-general" style={{ fontSize: "11px", fontFamily: "monospace" }}>
                  {patient.patient_id}
                </span>
                <span className="pc-bed-type-pill pill-general" style={{ fontSize: "11px" }}>
                  {patient.age}y / {patient.gender}
                </span>
                {activeBed ? (
                  <span className={`pc-bed-type-pill ${activeBed.bed_type === "ICU" ? "pill-icu" : "pill-general"}`} style={{ fontSize: "11px" }}>
                    🛏️ Bed {activeBed.bed_number} ({activeBed.ward})
                  </span>
                ) : (
                  <span className="pc-bed-type-pill pill-general" style={{ fontSize: "11px" }}>
                    Outpatient (OPD)
                  </span>
                )}
              </div>
              <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "2px" }}>
                Hospital Station: <strong>{currentStaff?.hospital_name || "MediKiosk General"}</strong> • Registered:{" "}
                {formatTimestamp(patient.created_at)}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="btn-pc-secondary"
              onClick={fetchProfile}
              disabled={loading}
              title="Refresh clinical profile"
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              {loading ? "Refreshing..." : "🔄 Refresh"}
            </button>
            <button type="button" className="btn-pc-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        {/* DUAL ALERT BANNER (Rule 9 Isolation) */}
        {(hasIntakeRf || hasMewsAlert) && (
          <div className="pc-census-alert-banner" style={{ margin: 0, borderRadius: 0, padding: "10px 24px" }}>
            <div className="pc-alert-left">
              <span className="pc-alert-icon">⚠️</span>
              <div>
                <strong style={{ fontSize: "13px" }}>Active Clinical Alerts (Rule 9 Isolation):</strong>
                <div style={{ display: "flex", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                  {hasIntakeRf && (
                    <span className="badge-intake-rf" style={{ fontSize: "12px" }}>
                      🚨 AI Chat Red Flag: {conversationAlerts[0]?.reason || "Intake Alert"}
                    </span>
                  )}
                  {hasMewsAlert && (
                    <span className="badge-mews-alert" style={{ fontSize: "12px" }}>
                      ⚡ Physiological MEWS Alert: {currentMews} pts ({currentMews >= 6 ? "CRITICAL" : "ELEVATED"})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATION FEEDBACK BANNER */}
        {actionMsg.text && (
          <div
            style={{
              padding: "10px 24px",
              background: actionMsg.type === "success" ? "#dcfce7" : "#fee2e2",
              color: actionMsg.type === "success" ? "#166534" : "#991b1b",
              borderBottom: `1px solid ${actionMsg.type === "success" ? "#86efac" : "#fca5a5"}`,
              fontSize: "13px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              {actionMsg.type === "success" ? "✓" : "⚠️"} {actionMsg.text}
            </span>
            <button
              type="button"
              onClick={() => setActionMsg({ type: "", text: "" })}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
            >
              ×
            </button>
          </div>
        )}

        {/* TOP LEVEL NAVIGATION TABS */}
        <div
          className="pc-submodal-tabs"
          style={{
            display: "flex",
            gap: "6px",
            padding: "10px 24px",
            borderBottom: "1px solid var(--line)",
            background: "var(--panel)",
            overflowX: "auto",
          }}
        >
          {[
            { id: "overview", label: "📋 Overview & Summary" },
            { id: "timeline", label: `⏱️ Unified Timeline (${timeline.length})` },
            { id: "conversations", label: `💬 AI Intake & Chat (${conversations.length})` },
            { id: "documents", label: `📄 Medical Records & OCR (${documents.length})` },
            { id: "vitals", label: `🩺 Bedside Vitals (${vitals.history?.length || 0})` },
            { id: "mews", label: `⚡ MEWS Assessments (${mewsAssessments.length})` },
            { id: "ml_risk", label: `🧠 ML Risk & XAI (${mlAssessments.length})` },
            { id: "hospital_care", label: `🛏️ Hospital Care (${carePlans.length} Plans)` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ whiteSpace: "nowrap", fontSize: "12px" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* MODAL BODY */}
        <div
          className="pc-modal-body"
          style={{ maxHeight: "calc(94vh - 190px)", overflowY: "auto", padding: "20px 24px" }}
        >
          {error && (
            <div className="doc-auth-alert doc-alert-danger" style={{ marginBottom: "16px" }}>
              <span>⚠️</span> <span>{error}</span>
            </div>
          )}

          {loading && !profileData ? (
            <div className="staff-loading" style={{ padding: "40px 0" }}>
              <div className="loading-spinner"></div>
              <p>Aggregating unified clinical records for {patientId}...</p>
            </div>
          ) : !profileData ? (
            <div className="staff-empty-state">
              <span className="empty-icon">📁</span>
              <h4>Patient Profile Unavailable</h4>
              <p>Could not retrieve clinical records for this patient identity.</p>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* TAB 1: CLINICAL OVERVIEW (10 REQUISITE CLINICAL SECTIONS IN 2-COL LAYOUT) */}
              {/* ========================================================================= */}
              {activeTab === "overview" && (
                <div className="pc-detail-layout">
                  {/* ------------------------------------------------------------------- */}
                  {/* LEFT COLUMN: CARDS 1, 2, 3                                          */}
                  {/* ------------------------------------------------------------------- */}
                  <div className="pc-detail-left-col">
                    {/* CARD 1: PATIENT INFORMATION */}
                    <div className="pc-clinical-card">
                      <div className="pc-card-header header-primary">
                        <h5>👤 Patient Information</h5>
                      </div>
                      <div className="pc-card-body">
                        <div className="pc-patient-avatar-box">
                          <div className="pc-patient-avatar-circle">
                            {patient.full_name
                              ? patient.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .substring(0, 2)
                                  .toUpperCase()
                              : "PT"}
                          </div>
                          <h4 className="pc-patient-name-title">{patient.full_name || "Patient Record"}</h4>
                          <span className="pc-patient-id-sub">Patient ID: {patient.patient_id}</span>
                        </div>

                        <div className="pc-meta-row">
                          <div className="pc-meta-col">
                            <div className="pc-meta-label">Age:</div>
                            <div className="pc-meta-val">{patient.age ? `${patient.age} years` : "Not recorded"}</div>
                          </div>
                          <div className="pc-meta-col" style={{ textAlign: "right" }}>
                            <div className="pc-meta-label">Status:</div>
                            <span className={`pc-badge ${activeBed ? "badge-success" : "badge-secondary"}`}>
                              {activeBed
                                ? "Admitted"
                                : patient.assigned_bed
                                ? "Admitted (Pending Bed)"
                                : "Outpatient"}
                            </span>
                          </div>
                        </div>

                        <div className="pc-meta-row">
                          <div className="pc-meta-col">
                            <div className="pc-meta-label">Gender:</div>
                            <div className="pc-meta-val">{patient.gender || "Not recorded"}</div>
                          </div>
                          <div className="pc-meta-col" style={{ textAlign: "right" }}>
                            <div className="pc-meta-label">Phone:</div>
                            <div className="pc-meta-val">{patient.phone || "Not recorded"}</div>
                          </div>
                        </div>

                        <hr className="pc-meta-divider" />

                        <div style={{ marginBottom: "12px" }}>
                          <div className="pc-meta-label">Triage Level:</div>
                          <span className={`pc-badge badge-triage-${patient.triage_level || 3}`}>
                            ESI {patient.triage_level || 3} —{" "}
                            {patient.triage_level === 1
                              ? "Immediate / Resuscitation"
                              : patient.triage_level === 2
                              ? "Emergent"
                              : patient.triage_level === 3
                              ? "Urgent"
                              : "Less Urgent"}
                          </span>
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                          <div className="pc-meta-label">Chief Complaint:</div>
                          <div className="pc-meta-val" style={{ lineHeight: 1.4 }}>
                            {derivedChiefComplaint}
                          </div>
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                          <div className="pc-meta-label">Admission Time:</div>
                          <div className="pc-meta-val">{formatTimestamp(admissionTime)}</div>
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                          <div className="pc-meta-label">Assigned Bed:</div>
                          {activeBed ? (
                            <div>
                              <span
                                className={`pc-badge ${
                                  activeBed.bed_type === "ICU" ? "badge-danger" : "badge-success"
                                }`}
                              >
                                Bed {activeBed.bed_number}
                              </span>
                              <small style={{ display: "block", color: "var(--ink-soft)", marginTop: "2px" }}>
                                Ward: <strong>{activeBed.ward}</strong> ({activeBed.bed_type?.toUpperCase()} Category)
                              </small>
                            </div>
                          ) : (
                            <span className="pc-badge badge-secondary">No Bed Assigned (Outpatient)</span>
                          )}
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                          <div className="pc-meta-label">Predicted Stay:</div>
                          <div className="pc-meta-val">{predictedStayDays} days</div>
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                          <div className="pc-meta-label">Comorbidities:</div>
                          <div className="pc-meta-val" style={{ fontStyle: patient.comorbidities ? "normal" : "italic" }}>
                            {patient.comorbidities || "None recorded"}
                          </div>
                        </div>

                        <div>
                          <div className="pc-meta-label">Medical History Summary:</div>
                          <div
                            className="pc-meta-val"
                            style={{
                              fontSize: "12px",
                              lineHeight: 1.4,
                              fontStyle: patient.medical_history ? "normal" : "italic",
                            }}
                          >
                            {patient.medical_history
                              ? patient.medical_history.length > 120
                                ? `${patient.medical_history.substring(0, 120)}...`
                                : patient.medical_history
                              : "No prior medical conditions documented."}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: EXPLAINABLE AI (XAI) ASSESSMENT */}
                    <div className="pc-clinical-card" style={{ borderLeft: "4px solid #f59e0b" }}>
                      <div className="pc-card-header header-warning">
                        <h5>🧠 Explainable AI (XAI) Assessment</h5>
                      </div>
                      <div className="pc-card-body">
                        <div style={{ marginBottom: "14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <strong style={{ fontSize: "13px" }}>Risk Level:</strong>
                            <span
                              className={`pc-badge ${
                                xaiRiskPct > 70 ? "badge-danger" : xaiRiskPct > 40 ? "badge-warning" : "badge-success"
                              }`}
                            >
                              {xaiRiskPct}% Risk
                            </span>
                          </div>
                          <div className="pc-progress-track">
                            <div
                              className={`pc-progress-fill ${
                                xaiRiskPct > 70
                                  ? "progress-fill-danger"
                                  : xaiRiskPct > 40
                                  ? "progress-fill-warning"
                                  : "progress-fill-success"
                              }`}
                              style={{ width: `${Math.max(6, Math.min(100, xaiRiskPct))}%` }}
                            >
                              {xaiRiskPct}%
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
                          <div>
                            <div className="pc-meta-label">AI Model Used:</div>
                            <span className="pc-badge badge-info" style={{ fontSize: "10px" }}>
                              {xaiModelName}
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div className="pc-meta-label">Confidence:</div>
                            <span className="pc-badge badge-success" style={{ fontSize: "10px" }}>
                              {xaiConfidence}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`pc-alert-box ${
                            xaiRiskPct > 70
                              ? "alert-box-danger"
                              : xaiRiskPct > 40
                              ? "alert-box-warning"
                              : "alert-box-success"
                          }`}
                          style={{ marginBottom: "14px" }}
                        >
                          <strong>XAI Explanation:</strong>
                          <div style={{ marginTop: "6px", fontSize: "12px", whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                            {xaiExplanationText}
                          </div>
                        </div>

                        <div style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn-pc-secondary"
                            onClick={() => setActiveSubModal("xai")}
                            style={{ fontSize: "12px", padding: "6px 14px", width: "100%" }}
                          >
                            🔄 Run / Refresh XAI Analysis
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* CARD 3: AI ANALYSIS */}
                    <div className="pc-clinical-card">
                      <div className="pc-card-header header-info">
                        <h5>🤖 AI Analysis</h5>
                      </div>
                      <div className="pc-card-body">
                        <div style={{ marginBottom: "14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                            <strong>Priority Score:</strong>
                            <span>{priorityScore}/100</span>
                          </div>
                          <div className="pc-progress-track">
                            <div
                              className={`pc-progress-fill ${
                                priorityScore >= 80
                                  ? "progress-fill-danger"
                                  : priorityScore >= 60
                                  ? "progress-fill-warning"
                                  : "progress-fill-info"
                              }`}
                              style={{ width: `${Math.max(5, Math.min(100, priorityScore))}%` }}
                            >
                              {priorityScore}/100
                            </div>
                          </div>
                        </div>

                        <div style={{ marginBottom: "14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                            <strong>Deterioration Risk:</strong>
                            <span>{xaiRiskPct}%</span>
                          </div>
                          <div className="pc-progress-track">
                            <div
                              className={`pc-progress-fill ${
                                xaiRiskPct > 70
                                  ? "progress-fill-danger"
                                  : xaiRiskPct > 40
                                  ? "progress-fill-warning"
                                  : "progress-fill-success"
                              }`}
                              style={{ width: `${Math.max(5, Math.min(100, xaiRiskPct))}%` }}
                            >
                              {xaiRiskPct}%
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                          <strong style={{ fontSize: "13px" }}>ICU Need:</strong>
                          <span className={`pc-badge ${needsIcu ? "badge-danger" : "badge-success"}`}>
                            {needsIcu ? "Required" : "Not Required"}
                          </span>
                        </div>

                        {(currentMews >= 4 || xaiRiskPct >= 70 || needsIcu) && (
                          <div className="pc-alert-box alert-box-danger">
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>⚠️</span>
                              <strong>High Risk Patient</strong>
                            </div>
                            <div style={{ marginTop: "4px", fontSize: "12px" }}>
                              Close monitoring recommended. Deterioration indicators require proactive clinical oversight.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------------- */}
                  {/* RIGHT COLUMN: CARDS 4, 5, 6, 7, 8, 9, 10                           */}
                  {/* ------------------------------------------------------------------- */}
                  <div className="pc-detail-right-col">
                    {/* CARD 4: CURRENT VITAL SIGNS */}
                    <div className="pc-clinical-card" style={{ borderTop: "4px solid #f59e0b" }}>
                      <div className="pc-card-header header-warning">
                        <h5>🩺 Current Vital Signs</h5>
                        {latestVitals && (
                          <span style={{ fontSize: "11px", opacity: 0.9 }}>
                            Source: {latestVitals.observation_source || "bedside_manual"}
                          </span>
                        )}
                      </div>
                      <div className="pc-card-body">
                        {/* 6 VITAL TILES ROW */}
                        <div className="pc-vital-boxes-row">
                          {/* 1. HEART RATE */}
                          <div
                            className={`pc-vital-box ${
                              latestVitals && (latestVitals.heart_rate > 120 || latestVitals.heart_rate < 50)
                                ? "vital-box-danger"
                                : latestVitals && (latestVitals.heart_rate > 100 || latestVitals.heart_rate < 60)
                                ? "vital-box-warning"
                                : "vital-box-normal"
                            }`}
                          >
                            <h3>{latestVitals?.heart_rate ?? "--"}</h3>
                            <small>Heart Rate</small>
                            <span className="vital-unit">bpm</span>
                          </div>

                          {/* 2. BLOOD PRESSURE */}
                          <div
                            className={`pc-vital-box ${
                              latestVitals && (latestVitals.blood_pressure_sys > 140 || latestVitals.blood_pressure_sys < 90)
                                ? "vital-box-warning"
                                : "vital-box-normal"
                            }`}
                          >
                            <h3>
                              {latestVitals
                                ? `${latestVitals.blood_pressure_sys}/${latestVitals.blood_pressure_dia || 80}`
                                : "--"}
                            </h3>
                            <small>Blood Pressure</small>
                            <span className="vital-unit">mmHg</span>
                          </div>

                          {/* 3. RESPIRATORY RATE */}
                          <div
                            className={`pc-vital-box ${
                              latestVitals && (latestVitals.respiratory_rate > 20 || latestVitals.respiratory_rate < 12)
                                ? "vital-box-warning"
                                : "vital-box-normal"
                            }`}
                          >
                            <h3>{latestVitals?.respiratory_rate ?? "--"}</h3>
                            <small>Respiratory Rate</small>
                            <span className="vital-unit">/min</span>
                          </div>

                          {/* 4. TEMPERATURE */}
                          <div
                            className={`pc-vital-box ${
                              latestVitals && (latestVitals.temperature > 38.0 || latestVitals.temperature < 36.0)
                                ? "vital-box-warning"
                                : "vital-box-normal"
                            }`}
                          >
                            <h3>{latestVitals ? Number(latestVitals.temperature).toFixed(1) : "--"}</h3>
                            <small>Temperature</small>
                            <span className="vital-unit">°C</span>
                          </div>

                          {/* 5. OXYGEN SATURATION */}
                          <div
                            className={`pc-vital-box ${
                              latestVitals && latestVitals.oxygen_saturation < 95
                                ? "vital-box-danger"
                                : "vital-box-normal"
                            }`}
                          >
                            <h3>{latestVitals?.oxygen_saturation ?? "--"}</h3>
                            <small>Oxygen Sat</small>
                            <span className="vital-unit">%</span>
                          </div>

                          {/* 6. MEWS SCORE */}
                          <div
                            className={`pc-vital-box ${
                              currentMews >= 4
                                ? "vital-box-danger"
                                : currentMews >= 2
                                ? "vital-box-warning"
                                : "vital-box-normal"
                            }`}
                          >
                            <h3>{currentMews}</h3>
                            <small>MEWS Score</small>
                            <span className="vital-unit">Score</span>
                          </div>
                        </div>

                        {/* ACTIONS & LAST UPDATED */}
                        <div className="pc-vitals-actions">
                          <div className="pc-vitals-buttons">
                            <button
                              type="button"
                              className="btn-pc-primary"
                              onClick={() => setActiveSubModal("vitals")}
                              style={{ fontSize: "12px", padding: "6px 14px" }}
                            >
                              🩺 Update Vitals
                            </button>
                            <button
                              type="button"
                              className="btn-pc-secondary"
                              onClick={() => setActiveSubModal("xai")}
                              style={{ fontSize: "12px", padding: "6px 14px" }}
                            >
                              🧠 Run XAI Analysis
                            </button>
                          </div>
                          <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                            Last updated: {formatTimestamp(latestVitals?.recorded_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 5: MEWS SCORE & EXPLANATION */}
                    <div className="pc-clinical-card" style={{ borderLeft: "4px solid #f59e0b" }}>
                      <div className="pc-card-header header-warning">
                        <h5>⚡ MEWS Score & Explanation</h5>
                        <span style={{ fontSize: "11px", opacity: 0.9 }}>Subbe et al. (2001) Ruleset</span>
                      </div>
                      <div className="pc-card-body">
                        <div className="pc-mews-grid">
                          {/* BIG SCORE DISPLAY */}
                          <div className="pc-mews-score-col">
                            <div
                              className="pc-mews-big-number"
                              style={{
                                color: currentMews >= 5 ? "#dc2626" : currentMews >= 3 ? "#d97706" : "#16a34a",
                              }}
                            >
                              {currentMews}
                            </div>
                            <div className="pc-mews-score-label">MEWS Score /14</div>
                            <div style={{ marginTop: "8px" }}>
                              <span
                                className={`pc-badge ${
                                  currentMews >= 5 ? "badge-danger" : currentMews >= 3 ? "badge-warning" : "badge-success"
                                }`}
                              >
                                {currentMews >= 5 ? "CRITICAL" : currentMews >= 3 ? "WARNING" : "STABLE"}
                              </span>
                            </div>
                          </div>

                          {/* SCORING BREAKDOWN */}
                          <div>
                            <div className="pc-meta-label" style={{ marginBottom: "6px" }}>
                              Scoring Explanation:
                            </div>
                            <div
                              className={`pc-alert-box ${
                                currentMews >= 5
                                  ? "alert-box-danger"
                                  : currentMews >= 3
                                  ? "alert-box-warning"
                                  : "alert-box-success"
                              }`}
                              style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}
                            >
                              {latestVitals?.mews_explanation ||
                                (mewsAssessments[0]
                                  ? `Assessment #${mewsAssessments[0].assessment_id}: HR (+${mewsAssessments[0].hr_score}), BP (+${mewsAssessments[0].bp_score}), RR (+${mewsAssessments[0].rr_score}), Temp (+${mewsAssessments[0].temp_score}), SpO2 (+${mewsAssessments[0].spo2_score}). Total: ${mewsAssessments[0].total_score} points (${mewsAssessments[0].clinical_risk_level?.toUpperCase()}).`
                                  : "MEWS score not calculated yet. Update bedside vitals to generate automated deterioration score.")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD 6: DISCHARGE READINESS */}
                    <div
                      className="pc-clinical-card"
                      style={{ borderLeft: `4px solid ${isDischargeReady ? "#16a34a" : "#64748b"}` }}
                    >
                      <div className={`pc-card-header ${isDischargeReady ? "header-success" : "header-dark"}`}>
                        <h5>🚪 Discharge Readiness</h5>
                        {isDischargeReady && (
                          <span className="pc-badge badge-success" style={{ background: "#ffffff", color: "#166534" }}>
                            READY FOR DISCHARGE
                          </span>
                        )}
                      </div>
                      <div className="pc-card-body">
                        <div className="pc-discharge-grid">
                          {/* CRITERIA LIST */}
                          <div>
                            <div className="pc-meta-label" style={{ marginBottom: "6px" }}>
                              Criteria Assessment (6 Points):
                            </div>
                            <div className="pc-criteria-list">
                              {criteriaList.map((crit, idx) => (
                                <div
                                  key={idx}
                                  className={`pc-criteria-row ${crit.met ? "criteria-met" : "criteria-unmet"}`}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span>{crit.met ? "✓" : "✗"}</span>
                                    <span>{crit.label}</span>
                                  </div>
                                  <span className="pc-criteria-badge">{crit.met ? "MET" : "UNMET"}</span>
                                </div>
                              ))}
                            </div>

                            <div style={{ marginTop: "10px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                                <span>Readiness Criteria Met:</span>
                                <strong>{metCount} of 6</strong>
                              </div>
                              <div className="pc-progress-track">
                                <div
                                  className="pc-progress-fill progress-fill-success"
                                  style={{ width: `${Math.round((metCount / 6) * 100)}%` }}
                                >
                                  {metCount}/6
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ACTIONS */}
                          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                            <div>
                              <div className="pc-meta-label" style={{ marginBottom: "6px" }}>
                                Clinical Actions:
                              </div>
                              {isDischargeReady ? (
                                <div className="pc-alert-box alert-box-success">
                                  <strong>Patient meets discharge criteria</strong>
                                  <p style={{ margin: "6px 0 10px 0", fontSize: "12px" }}>
                                    All 6 physiological vital signs and clinical early warning indicators are within
                                    acceptable parameters.
                                  </p>
                                  <button
                                    type="button"
                                    className="btn-pc-primary"
                                    onClick={handleDischargePatient}
                                    disabled={actionLoading}
                                    style={{
                                      background: "#16a34a",
                                      borderColor: "#15803d",
                                      fontSize: "12px",
                                      padding: "6px 14px",
                                    }}
                                  >
                                    {actionLoading ? "Processing..." : "🚪 Discharge Patient"}
                                  </button>
                                </div>
                              ) : (
                                <div className="pc-alert-box alert-box-info">
                                  <strong>Monitoring required</strong>
                                  <p style={{ margin: "6px 0 0 0", fontSize: "12px" }}>
                                    Patient does not yet meet all discharge criteria ({6 - metCount} criteria unmet).
                                    Continue clinical monitoring and treatment as ordered.
                                  </p>
                                </div>
                              )}
                            </div>

                            <div style={{ fontSize: "11px", color: "var(--ink-soft)", marginTop: "10px" }}>
                              Note: Formal discharge automatically vacates assigned bed and marks medical release.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD 7: BED TRANSITION / ICU STATUS */}
                    <div className="pc-clinical-card">
                      <div className={`pc-card-header ${activeBed?.bed_type === "ICU" ? "header-success" : needsIcu ? "header-danger" : "header-info"}`}>
                        <h5>
                          {activeBed?.bed_type === "ICU"
                            ? "✅ Current ICU Status"
                            : needsIcu
                            ? "🚨 Bed Transition Recommendations"
                            : "🛏️ Inpatient Bed Assignment"}
                        </h5>
                      </div>
                      <div className="pc-card-body">
                        {activeBed?.bed_type === "ICU" ? (
                          <div className="pc-alert-box alert-box-success">
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>🛏️</span>
                              <strong>Patient is currently in ICU care</strong>
                            </div>
                            <div style={{ marginTop: "4px", fontSize: "12px" }}>
                              Patient is receiving appropriate ICU-level monitoring and intensive medical treatment in{" "}
                              <strong>{activeBed.ward} (Bed {activeBed.bed_number})</strong>.
                            </div>
                          </div>
                        ) : needsIcu ? (
                          <div className="pc-alert-box alert-box-danger">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                              <div>
                                <strong>⚠️ Recommend ICU Transfer</strong>
                                <div style={{ fontSize: "12px", marginTop: "4px" }}>
                                  Patient MEWS score ({currentMews} pts) or algorithmic deterioration probability (
                                  {xaiRiskPct}%) indicates high acute care necessity.
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn-pc-danger"
                                onClick={handleUpgradeICU}
                                disabled={actionLoading}
                                style={{ fontSize: "12px", padding: "6px 14px", whiteSpace: "nowrap" }}
                              >
                                {actionLoading ? "Transferring..." : "🚨 Transfer to ICU"}
                              </button>
                            </div>
                          </div>
                        ) : activeBed ? (
                          <div className="pc-alert-box alert-box-info">
                            <strong>Current General Inpatient Bed</strong>
                            <div style={{ fontSize: "12px", marginTop: "4px" }}>
                              Bed: <strong>{activeBed.bed_number}</strong> • Ward: <strong>{activeBed.ward}</strong> • Status: <strong>Occupied</strong>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "13px", color: "var(--ink-soft)" }}>
                              Patient is currently outpatient (No bed allocated).
                            </span>
                            <button
                              type="button"
                              className="btn-pc-secondary"
                              onClick={() => {
                                if (onActionTrigger) onActionTrigger("bed", activePatientForModals);
                                else setActiveSubModal("bed");
                              }}
                              style={{ fontSize: "12px", padding: "4px 10px" }}
                            >
                              🛏️ Allocate Bed
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CARD 8: MEDICAL HISTORY & CARE PLAN (2 SUB-COLUMNS) */}
                    <div className="pc-two-subcol-grid">
                      {/* SUB-COLUMN 1: MEDICAL HISTORY */}
                      <div className="pc-clinical-card">
                        <div className="pc-card-header header-dark">
                          <h5>📜 Medical History</h5>
                        </div>
                        <div className="pc-card-body">
                          {patient.medical_history ? (
                            <div style={{ fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                              {patient.medical_history}
                            </div>
                          ) : (
                            <div style={{ textAlign: "center", color: "var(--ink-soft)", padding: "16px 0", fontSize: "12px" }}>
                              <div>ℹ️</div>
                              <p style={{ margin: "4px 0 0 0" }}>No medical history recorded.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SUB-COLUMN 2: INPATIENT CARE PLAN */}
                      <div className="pc-clinical-card">
                        <div className="pc-card-header header-teal">
                          <h5>📋 Care Plan</h5>
                        </div>
                        <div className="pc-card-body">
                          {carePlans.length > 0 ? (
                            <div>
                              {carePlans.slice(0, 2).map((cp) => (
                                <div key={cp.plan_id} className="pc-careplan-preview">
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <strong>Plan #{cp.plan_id}</strong>
                                    <span className="pc-badge badge-success" style={{ fontSize: "10px" }}>
                                      {cp.status?.toUpperCase() || "ACTIVE"}
                                    </span>
                                  </div>
                                  <div className="pc-careplan-item">
                                    <strong>Care:</strong> {cp.care_instructions}
                                  </div>
                                  {cp.medications && (
                                    <div className="pc-careplan-item">
                                      <strong>Meds:</strong> {cp.medications}
                                    </div>
                                  )}
                                  {cp.special_instructions && (
                                    <div className="pc-careplan-item">
                                      <strong>Special:</strong> {cp.special_instructions}
                                    </div>
                                  )}
                                </div>
                              ))}
                              <div style={{ textAlign: "right", marginTop: "8px" }}>
                                <button
                                  type="button"
                                  className="btn-pc-secondary"
                                  onClick={() => setActiveSubModal("carePlans")}
                                  style={{ fontSize: "11px", padding: "4px 10px" }}
                                >
                                  + Manage Care Plans ({carePlans.length})
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: "center", padding: "16px 0" }}>
                              <p style={{ color: "var(--ink-soft)", fontSize: "12px", margin: "0 0 8px 0" }}>
                                No care plan created yet.
                              </p>
                              <button
                                type="button"
                                className="btn-pc-secondary"
                                onClick={() => setActiveSubModal("carePlans")}
                                style={{ fontSize: "12px", padding: "4px 12px" }}
                              >
                                + Create Care Plan
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CARD 9: REAL-TIME ECG MONITORING (AD8232) */}
                    <div className="pc-clinical-card" style={{ borderLeft: "4px solid #dc2626" }}>
                      <div className="pc-card-header header-danger">
                        <h5>❤️ Real-time ECG Monitoring (AD8232)</h5>
                      </div>
                      <div className="pc-card-body">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                          {/* SENSOR STATUS & TOGGLE BUTTONS */}
                          <div>
                            <div
                              className={`pc-alert-box ${ecgConnected ? "alert-box-success" : "alert-box-warning"}`}
                              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", marginBottom: "8px" }}
                            >
                              <span>{ecgConnected ? "✓" : "🔌"}</span>
                              <strong>ECG Sensor: {ecgConnected ? "Connected (AD8232 Telemetry)" : "Disconnected"}</strong>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                className="btn-pc-primary"
                                onClick={handleConnectECG}
                                disabled={ecgConnected}
                                style={{
                                  background: "#16a34a",
                                  borderColor: "#15803d",
                                  fontSize: "12px",
                                  padding: "5px 12px",
                                }}
                              >
                                🔌 Connect Sensor
                              </button>
                              <button
                                type="button"
                                className="btn-pc-secondary"
                                onClick={handleDisconnectECG}
                                disabled={!ecgConnected}
                                style={{ fontSize: "12px", padding: "5px 12px" }}
                              >
                                ⏹️ Disconnect
                              </button>
                            </div>
                          </div>

                          {/* 3 STAT TILES */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 90px)", gap: "8px" }}>
                            <div className="pc-ecg-stat-tile">
                              <h5>{ecgConnected ? `${ecgHR} bpm` : "--"}</h5>
                              <small>Heart Rate</small>
                            </div>
                            <div className="pc-ecg-stat-tile">
                              <h5 style={{ fontSize: "12px" }}>{ecgConnected ? ecgQuality : "--"}</h5>
                              <small>Signal</small>
                            </div>
                            <div
                              className="pc-ecg-stat-tile"
                              style={{
                                background: ecgArrhythmia ? "#fee2e2" : "#f8fafc",
                                borderColor: ecgArrhythmia ? "#fca5a5" : "var(--line)",
                              }}
                            >
                              <h5 style={{ color: ecgArrhythmia ? "#dc2626" : "inherit" }}>
                                {ecgConnected ? (ecgArrhythmia ? "Detected" : "None") : "--"}
                              </h5>
                              <small>Arrhythmia</small>
                            </div>
                          </div>
                        </div>

                        {/* LIVE OSCILLOSCOPE CANVAS */}
                        <div className="pc-ecg-canvas-container">
                          <canvas
                            ref={canvasRef}
                            className="pc-ecg-canvas"
                            width="600"
                            height="120"
                          />
                        </div>

                        {/* MANDATORY SIMULATION DISCLAIMER (Rule 11) */}
                        <div className="disclaimer-banner disclaimer-ecg" style={{ marginTop: "10px", fontSize: "11px" }}>
                          <span className="disclaimer-icon">ℹ️</span>
                          <div>
                            <strong>Simulation Only (Rule 11 Compliance):</strong> AD8232 ECG sensor waveform telemetry is synthetically generated for demonstration and educational testing. Not certified for clinical diagnostic use.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD 10: RECENT CLINICAL TIMELINE */}
                    <div className="pc-clinical-card">
                      <div className="pc-card-header header-dark">
                        <h5>⏱️ Recent Chronological Clinical Events</h5>
                        <button
                          type="button"
                          className="btn-pc-secondary"
                          onClick={() => setActiveTab("timeline")}
                          style={{
                            fontSize: "11px",
                            padding: "4px 8px",
                            background: "rgba(255,255,255,0.15)",
                            color: "#ffffff",
                            borderColor: "transparent",
                          }}
                        >
                          View Full Timeline ({timeline.length}) →
                        </button>
                      </div>
                      <div className="pc-card-body">
                        {timeline.length === 0 ? (
                          <p style={{ fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic", margin: 0 }}>
                            No clinical events recorded yet for this patient.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {timeline.slice(0, 4).map((evt) => (
                              <div
                                key={evt.id}
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "flex-start",
                                  padding: "8px 12px",
                                  background: "#f8fafc",
                                  borderRadius: "6px",
                                  border: "1px solid var(--line)",
                                }}
                              >
                                <span style={{ fontSize: "16px" }}>
                                  {evt.category === "red_flag"
                                    ? "🚨"
                                    : evt.category === "vitals"
                                    ? "🩺"
                                    : evt.category === "ml_risk"
                                    ? "🧠"
                                    : evt.category === "document_ocr"
                                    ? "📄"
                                    : evt.category === "care_plan"
                                    ? "📋"
                                    : "👤"}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <strong style={{ fontSize: "12px", color: "var(--teal-deep)" }}>{evt.title}</strong>
                                    <span style={{ fontSize: "10px", color: "var(--ink-soft)" }}>
                                      {formatTimestamp(evt.timestamp)}
                                    </span>
                                  </div>
                                  <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--ink)" }}>
                                    {evt.description}
                                  </p>
                                  <div style={{ marginTop: "2px", fontSize: "10px", color: "var(--ink-soft)" }}>
                                    Source: <em>{evt.provenance_label || evt.provenance_source}</em> • Actor:{" "}
                                    <strong>{evt.actor}</strong>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: UNIFIED CHRONOLOGICAL TIMELINE                                     */}
              {/* ========================================================================= */}
              {activeTab === "timeline" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, color: "var(--teal-deep)" }}>Chronological Clinical Event Stream</h4>
                      <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                        Comprehensive time-series combining AI intake, medical records, bedside vitals, and hospital care.
                      </span>
                    </div>

                    <div className="staff-filter-tabs">
                      {[
                        { id: "all", label: `All (${timeline.length})` },
                        { id: "vitals", label: "🩺 Vitals & MEWS" },
                        { id: "intake", label: "💬 Intake & Alerts" },
                        { id: "documents", label: "📄 Documents & OCR" },
                        { id: "consult", label: "👨‍⚕️ Doctor & EMR" },
                        { id: "care", label: "🛏️ Hospital Care" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className={`filter-tab ${timelineFilter === f.id ? "active" : ""}`}
                          onClick={() => setTimelineFilter(f.id)}
                          style={{ fontSize: "11px", padding: "4px 8px" }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredTimeline.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "30px", border: "1px dashed var(--line)" }}>
                      <span className="empty-icon">⏱️</span>
                      <h4>No Timeline Events in this Filter</h4>
                      <p>Select "All" to view the complete patient clinical history.</p>
                    </div>
                  ) : (
                    <div
                      className="unified-timeline-list"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        position: "relative",
                        paddingLeft: "10px",
                      }}
                    >
                      {filteredTimeline.map((item, idx) => {
                        let borderColor = "var(--line)";
                        let bgTag = "#f0f4f2";
                        if (item.badge_level === "critical") {
                          borderColor = "var(--alert)";
                          bgTag = "#fdeeed";
                        } else if (item.badge_level === "warning") {
                          borderColor = "var(--marigold)";
                          bgTag = "#fef8e7";
                        } else if (item.badge_level === "success") {
                          borderColor = "var(--ok)";
                          bgTag = "#e8f5ec";
                        }

                        return (
                          <div
                            key={item.id || idx}
                            style={{
                              background: "#ffffff",
                              border: `1px solid ${borderColor}`,
                              borderRadius: "8px",
                              padding: "14px 18px",
                              boxShadow: "0 2px 6px rgba(20, 36, 32, 0.04)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                flexWrap: "wrap",
                                gap: "8px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "18px" }}>
                                  {item.category === "red_flag"
                                    ? "🚨"
                                    : item.category === "vitals"
                                    ? "🩺"
                                    : item.category === "mews"
                                    ? "⚡"
                                    : item.category === "ml_risk"
                                    ? "🧠"
                                    : item.category === "document_ocr"
                                    ? "📄"
                                    : item.category === "transfer"
                                    ? "🚑"
                                    : item.category === "bed_allocation"
                                    ? "🛏️"
                                    : item.category === "care_plan"
                                    ? "📋"
                                    : item.category === "doctor_consultation"
                                    ? "👨‍⚕️"
                                    : "👤"}
                                </span>
                                <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>{item.title}</strong>
                              </div>
                              <span style={{ fontSize: "12px", color: "var(--ink-soft)", fontWeight: 600 }}>
                                {formatTimestamp(item.timestamp)}
                              </span>
                            </div>

                            <p style={{ margin: "8px 0 10px 0", fontSize: "13px", color: "var(--ink)", lineHeight: 1.5 }}>
                              {item.description}
                            </p>

                            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", fontSize: "11px" }}>
                              <span style={{ background: bgTag, padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                                Origin: {item.provenance_label || item.provenance_source}
                              </span>
                              <span style={{ color: "var(--ink-soft)" }}>
                                Recorded by: <strong>{item.actor}</strong>
                              </span>
                              {item.metadata?.session_id && (
                                <span style={{ color: "var(--ink-soft)" }}>
                                  Session: <code>{item.metadata.session_id.substring(0, 8)}</code>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="disclaimer-banner" style={{ marginTop: "20px" }}>
                    <span className="disclaimer-icon">ℹ️</span>
                    <div>
                      <strong>Data Provenance & Audit Integrity (Rule 10):</strong> Every timeline event tracks its original recording source (Patient Self-Report, Tesseract OCR, Bedside Observation, Groq AI NLP, Attending Doctor Review, or Scikit-Learn Model) and UTC timestamp to guarantee tamper-evident clinical history.
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: INTAKE & AI CONVERSATIONS                                          */}
              {/* ========================================================================= */}
              {activeTab === "conversations" && (
                <div>
                  <h4 style={{ margin: "0 0 14px 0", color: "var(--teal-deep)" }}>
                    AI-Assisted Patient Intake Sessions ({conversations.length})
                  </h4>

                  {conversations.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "30px" }}>
                      <span className="empty-icon">💬</span>
                      <h4>No Intake Sessions Found</h4>
                      <p>This patient has not yet completed a clinical intake interview at the MediKiosk.</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                        {conversations.map((sess) => (
                          <button
                            key={sess.session_id}
                            type="button"
                            className={`filter-tab ${selectedSessionId === sess.session_id ? "active" : ""}`}
                            onClick={() => setSelectedSessionId(sess.session_id)}
                            style={{ fontSize: "12px" }}
                          >
                            Session: {sess.session_id.substring(0, 8)} • {sess.department || "General"} ({sess.status})
                          </button>
                        ))}
                      </div>

                      {selectedSession && (
                        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", padding: "18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                              <strong style={{ fontSize: "14px" }}>
                                OPD Assigned: {selectedSession.doctor_name || "Doctor"} ({selectedSession.department})
                              </strong>
                              <div style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                                Language: <strong>{selectedSession.language}</strong> • Status: <strong>{selectedSession.status}</strong> • Date: {formatTimestamp(selectedSession.created_at)}
                              </div>
                            </div>
                            {selectedSession.red_flag ? (
                              <span className="badge-intake-rf" style={{ fontSize: "12px" }}>
                                🚨 Red Flag Flagged: {selectedSession.red_flag_reason}
                              </span>
                            ) : (
                              <span style={{ fontSize: "12px", color: "var(--ok)", fontWeight: 600 }}>✓ Normal Triage Flow</span>
                            )}
                          </div>

                          <div
                            style={{
                              background: "#ffffff",
                              border: "1px solid var(--line)",
                              borderRadius: "8px",
                              padding: "16px",
                              maxHeight: "350px",
                              overflowY: "auto",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            {selectedSession.messages && selectedSession.messages.length > 0 ? (
                              selectedSession.messages.map((m) => {
                                const isUser = m.sender === "user";
                                return (
                                  <div
                                    key={m.id}
                                    style={{
                                      alignSelf: isUser ? "flex-end" : "flex-start",
                                      maxWidth: "75%",
                                      background: isUser ? "var(--teal)" : "#f0f4f2",
                                      color: isUser ? "#ffffff" : "var(--ink)",
                                      padding: "10px 14px",
                                      borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                                      fontSize: "13px",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    <div style={{ fontSize: "10px", opacity: 0.8, marginBottom: "4px" }}>
                                      {isUser ? "👤 Patient" : "🤖 MediKiosk Intake AI"} • {formatTimestamp(m.created_at)}
                                    </div>
                                    {m.message}
                                  </div>
                                );
                              })
                            ) : (
                              <p style={{ fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic", textAlign: "center", margin: 0 }}>
                                No chat messages logged for this session.
                              </p>
                            )}
                          </div>

                          {selectedSession.final_report && (
                            <div style={{ marginTop: "14px", padding: "12px", background: "#f8faf9", borderRadius: "6px", border: "1px solid var(--line)" }}>
                              <strong style={{ fontSize: "13px", color: "var(--teal-deep)" }}>Doctor-Ready Clinical Summary:</strong>
                              <pre style={{ margin: "6px 0 0 0", fontSize: "12px", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                                {selectedSession.final_report}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: MEDICAL DOCUMENTS & OCR                                            */}
              {/* ========================================================================= */}
              {activeTab === "documents" && (
                <div>
                  <h4 style={{ margin: "0 0 14px 0", color: "var(--teal-deep)" }}>
                    Uploaded Medical Documents & OCR Extractions ({documents.length})
                  </h4>

                  {documents.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "30px" }}>
                      <span className="empty-icon">📄</span>
                      <h4>No Medical Documents Uploaded</h4>
                      <p>The patient has not uploaded external prescriptions or lab reports for OCR processing.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {documents.map((doc) => (
                        <div key={doc.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>📄 {doc.filename}</strong>
                            <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>Uploaded: {formatTimestamp(doc.created_at)}</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginBottom: "8px" }}>
                            OCR Engine: <strong>Tesseract OCR</strong> • Extracted Characters: <strong>{doc.char_count || doc.extracted_text?.length || 0}</strong>
                          </div>
                          <div style={{ background: "#ffffff", padding: "12px", borderRadius: "6px", border: "1px solid var(--line)", maxHeight: "150px", overflowY: "auto", fontSize: "12px", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                            {doc.extracted_text || "No readable text extracted from document image."}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 5: BEDSIDE VITALS HISTORY                                             */}
              {/* ========================================================================= */}
              {activeTab === "vitals" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h4 style={{ margin: 0, color: "var(--teal-deep)" }}>
                      Bedside Vital Observations & Parameter Trends ({vitals.history?.length || 0})
                    </h4>
                    <button
                      type="button"
                      className="btn-pc-primary"
                      onClick={() => setActiveSubModal("vitals")}
                      style={{ fontSize: "12px", padding: "6px 14px" }}
                    >
                      🩺 + Record Bedside Observation
                    </button>
                  </div>

                  {vitals.history?.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "30px" }}>
                      <span className="empty-icon">🩺</span>
                      <h4>No Vital Observations Recorded</h4>
                      <p>No bedside observations on file for this patient.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="pc-patients-table" style={{ fontSize: "12px" }}>
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Source (Rule 10)</th>
                            <th>HR (bpm)</th>
                            <th>BP (mmHg)</th>
                            <th>RR (/min)</th>
                            <th>Temp (°C)</th>
                            <th>SpO2 (%)</th>
                            <th>MEWS</th>
                            <th>Staff Author</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vitals.history.map((v) => {
                            const mews = v.mews_score || 0;
                            let mewsClass = "mews-stable";
                            if (mews >= 6) mewsClass = "mews-critical";
                            else if (mews >= 4) mewsClass = "mews-elevated";
                            else if (mews >= 2) mewsClass = "mews-monitoring";

                            return (
                              <tr key={v.vital_id || v.recorded_at}>
                                <td><strong>{formatTimestamp(v.recorded_at)}</strong></td>
                                <td>
                                  <span className="pc-bed-type-pill pill-general" style={{ fontSize: "11px" }}>
                                    {v.observation_source}
                                  </span>
                                </td>
                                <td><strong>{v.heart_rate}</strong></td>
                                <td><strong>{v.blood_pressure_sys}/{v.blood_pressure_dia || 80}</strong></td>
                                <td><strong>{v.respiratory_rate}</strong></td>
                                <td><strong>{v.temperature}</strong></td>
                                <td><strong>{v.oxygen_saturation}%</strong></td>
                                <td>
                                  <span className={`mews-score-pill ${mewsClass}`} style={{ fontSize: "11px" }}>
                                    {mews} pts
                                  </span>
                                </td>
                                <td><span style={{ color: "var(--ink-soft)" }}>{v.recorded_by_staff_id || "Staff"}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 6: MEWS ASSESSMENTS                                                   */}
              {/* ========================================================================= */}
              {activeTab === "mews" && (
                <div>
                  <h4 style={{ margin: "0 0 14px 0", color: "var(--teal-deep)" }}>
                    Standardized MEWS Scoring Assessments (Subbe 2001) ({mewsAssessments.length})
                  </h4>

                  {mewsAssessments.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "30px" }}>
                      <span className="empty-icon">⚡</span>
                      <h4>No MEWS Assessments On File</h4>
                      <p>Record a bedside vital sign to compute early warning deterioration points.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {mewsAssessments.map((m) => (
                        <div key={m.assessment_id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "8px", padding: "14px 18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong style={{ fontSize: "15px", color: "var(--teal-deep)" }}>
                                Assessment #{m.assessment_id} — Total MEWS: {m.total_score} points
                              </strong>
                              <span className={`mews-score-pill ${m.total_score >= 6 ? "mews-critical" : m.total_score >= 4 ? "mews-elevated" : m.total_score >= 2 ? "mews-monitoring" : "mews-stable"}`} style={{ marginLeft: "10px", fontSize: "11px" }}>
                                {m.clinical_risk_level?.toUpperCase() || "STABLE"}
                              </span>
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>{formatTimestamp(m.calculated_at)}</span>
                          </div>

                          <div style={{ display: "flex", gap: "14px", marginTop: "8px", flexWrap: "wrap", fontSize: "12px" }}>
                            <span>Heart Rate: <strong>+{m.hr_score}</strong></span>
                            <span>Blood Pressure: <strong>+{m.bp_score}</strong></span>
                            <span>Respiratory Rate: <strong>+{m.rr_score}</strong></span>
                            <span>Temperature: <strong>+{m.temp_score}</strong></span>
                            <span>Oxygen Saturation: <strong>+{m.spo2_score}</strong></span>
                          </div>

                          <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--ink-soft)" }}>
                            Ruleset: <em>{m.ruleset_version || "MEWS-UK-2001-v1"}</em> • Vital ID: #{m.vital_id}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="disclaimer-banner" style={{ marginTop: "16px" }}>
                    <span className="disclaimer-icon">ℹ️</span>
                    <div>
                      <strong>Clinical Decision Support Notice:</strong> MEWS scores are screening aids for physiological trend awareness. They do NOT replace comprehensive clinical judgment by attending physicians.
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 7: ML RISK & EXPLAINABLE AI                                           */}
              {/* ========================================================================= */}
              {activeTab === "ml_risk" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h4 style={{ margin: 0, color: "var(--teal-deep)" }}>
                      Machine Learning Deterioration Assessments & XAI Feature Attribution ({mlAssessments.length})
                    </h4>
                    <button
                      type="button"
                      className="btn-pc-primary"
                      onClick={() => setActiveSubModal("xai")}
                      style={{ fontSize: "12px", padding: "6px 14px" }}
                    >
                      🧠 + Run New Model Assessment
                    </button>
                  </div>

                  {mlAssessments.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "30px" }}>
                      <span className="empty-icon">🧠</span>
                      <h4>No ML Risk Assessments Evaluated</h4>
                      <p>Run a machine learning deterioration prediction from the Inpatient Workstation to evaluate algorithmic risk.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {mlAssessments.map((ml) => {
                        const riskPct = Math.round((ml.predicted_risk || 0) * 100);
                        return (
                          <div key={ml.assessment_id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>
                                Model: {ml.model_identifier} (v{ml.model_version || "1.0"})
                              </strong>
                              <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>{formatTimestamp(ml.created_at)}</span>
                            </div>

                            <div style={{ margin: "10px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                                <span>Algorithmic Deterioration Probability:</span>
                                <strong>{riskPct}% ({ml.is_critical ? "CRITICAL RISK" : riskPct >= 40 ? "MODERATE RISK" : "LOW RISK"})</strong>
                              </div>
                              <div className="xai-risk-meter">
                                <div
                                  className={`xai-risk-fill ${riskPct >= 70 ? "risk-critical" : riskPct >= 40 ? "risk-moderate" : "risk-low"}`}
                                  style={{ width: `${Math.max(5, Math.min(100, riskPct))}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* XAI Contributing Factors */}
                            {ml.explanations && ml.explanations.length > 0 && (
                              <div style={{ marginTop: "10px", padding: "10px", background: "#ffffff", borderRadius: "6px", border: "1px solid var(--line)" }}>
                                <strong style={{ fontSize: "12px", color: "var(--teal-deep)" }}>
                                  Contributing Physiological Factors (Explainable AI):
                                </strong>
                                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--ink)", lineHeight: 1.5 }}>
                                  {ml.explanations[0].contributing_factors || ml.explanations[0].disclaimer}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="disclaimer-banner" style={{ marginTop: "16px" }}>
                    <span className="disclaimer-icon">ℹ️</span>
                    <div>
                      <strong>Synthetic Training Data Limitation (Rule 12):</strong> Predictive models are trained on synthetic cohorts and provide screening guidance only. Predictions do NOT prove clinical causation and must never override qualified clinical expertise.
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 8: HOSPITAL CARE, BEDS & TRANSFERS                                    */}
              {/* ========================================================================= */}
              {activeTab === "hospital_care" && (
                <div>
                  <h4 style={{ margin: "0 0 14px 0", color: "var(--teal-deep)" }}>
                    Hospital Inpatient Care, Bed Allocation & Inter-Hospital Transfers
                  </h4>

                  {/* ACTIVE BED CARD */}
                  <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>Current Bed Allocation</strong>
                      {activeBed && (
                        <button
                          type="button"
                          className="btn-pc-secondary"
                          onClick={() => {
                            if (onActionTrigger) onActionTrigger("bed", activePatientForModals);
                            else setActiveSubModal("bed");
                          }}
                          style={{ fontSize: "11px", padding: "4px 10px" }}
                        >
                          Manage Bed
                        </button>
                      )}
                    </div>
                    {activeBed ? (
                      <div style={{ marginTop: "8px", fontSize: "13px" }}>
                        <div>Bed Number: <strong>{activeBed.bed_number}</strong> ({activeBed.bed_type?.toUpperCase()} Category)</div>
                        <div>Ward: <strong>{activeBed.ward}</strong></div>
                        <div>Assigned At: <strong>{formatTimestamp(activeBed.assigned_at)}</strong></div>
                      </div>
                    ) : (
                      <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                        Patient is currently outpatient (no inpatient bed assigned).
                      </p>
                    )}
                  </div>

                  {/* CARE PLANS */}
                  <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>
                        Personalized Inpatient Care Plans ({carePlans.length})
                      </strong>
                      <button
                        type="button"
                        className="btn-pc-secondary"
                        onClick={() => setActiveSubModal("carePlans")}
                        style={{ fontSize: "11px", padding: "4px 10px" }}
                      >
                        + Create Plan
                      </button>
                    </div>
                    {carePlans.length === 0 ? (
                      <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                        No care directives created.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                        {carePlans.map((cp) => (
                          <div key={cp.plan_id} style={{ padding: "10px", background: "#ffffff", borderRadius: "6px", border: "1px solid var(--line)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <strong>Plan #{cp.plan_id} ({cp.status})</strong>
                              <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>{formatTimestamp(cp.created_at)}</span>
                            </div>
                            <div style={{ fontSize: "12px", marginTop: "4px" }}><strong>Instructions:</strong> {cp.care_instructions}</div>
                            {cp.medications && (
                              <div style={{ fontSize: "12px", marginTop: "2px" }}><strong>Medications:</strong> {cp.medications}</div>
                            )}
                            {cp.special_instructions && (
                              <div style={{ fontSize: "12px", marginTop: "2px" }}><strong>Special:</strong> {cp.special_instructions}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* TRANSFERS */}
                  <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px" }}>
                    <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>
                      Inter-Hospital Transfer History ({transfers.length})
                    </strong>
                    {transfers.length === 0 ? (
                      <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                        No transfers initiated for this patient.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                        {transfers.map((tr) => (
                          <div key={tr.transfer_id} style={{ padding: "10px", background: "#ffffff", borderRadius: "6px", border: "1px solid var(--line)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <strong>Destination: {tr.to_hospital_name} ({tr.distance_km} km)</strong>
                              <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>Status: <strong>{tr.status}</strong> • {formatTimestamp(tr.created_at)}</span>
                            </div>
                            <div style={{ fontSize: "12px", marginTop: "4px" }}>
                              Bed Required: <strong>{tr.bed_type_needed}</strong> • Specialization: <strong>{tr.specialization}</strong> • Transfer Score: <strong>{tr.transfer_score}/100</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          className="pc-modal-footer"
          style={{ padding: "14px 24px", background: "var(--paper)", borderTop: "1px solid var(--line)" }}
        >
          <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
            Clinical Record: <code>{patient.patient_id}</code> • Unified Profile Engine v4.0
          </div>
          <button type="button" className="btn-pc-secondary" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODALS OVERLAY (WORKING ACTION INTEGRATION WITHOUT NAVIGATING AWAY)   */}
      {/* ========================================================================= */}
      {activeSubModal === "vitals" && (
        <VitalRecorderModal
          apiBase={apiBase}
          patient={activePatientForModals}
          currentStaff={currentStaff}
          onClose={() => setActiveSubModal(null)}
          onVitalsRecorded={() => {
            fetchProfile();
            setActiveSubModal(null);
            if (onActionTrigger) onActionTrigger("vitals_saved", activePatientForModals);
          }}
        />
      )}

      {activeSubModal === "xai" && (
        <XAIRiskModal
          apiBase={apiBase}
          patient={activePatientForModals}
          onClose={() => {
            fetchProfile();
            setActiveSubModal(null);
          }}
        />
      )}

      {activeSubModal === "carePlans" && (
        <CarePlansModal
          apiBase={apiBase}
          patient={activePatientForModals}
          currentStaff={currentStaff}
          onClose={() => {
            fetchProfile();
            setActiveSubModal(null);
          }}
        />
      )}

      {activeSubModal === "ecg" && (
        <ECGTelemetryModal
          apiBase={apiBase}
          patient={activePatientForModals}
          onClose={() => setActiveSubModal(null)}
        />
      )}

      {activeSubModal === "bed" && (
        <BedManagementModal
          apiBase={apiBase}
          patient={activePatientForModals}
          beds={[]}
          currentStaff={currentStaff}
          onClose={() => setActiveSubModal(null)}
          onBedUpdated={() => {
            fetchProfile();
            setActiveSubModal(null);
            if (onActionTrigger) onActionTrigger("bed_updated", activePatientForModals);
          }}
        />
      )}
    </div>
  );
}
