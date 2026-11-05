import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import anime from "animejs/lib/anime.es.js";
import "./patient_care.css";
import "./unified_profile.css";
import VitalRecorderModal from "./VitalRecorderModal";
import XAIRiskModal from "./XAIRiskModal";
import ECGTelemetryModal from "./ECGTelemetryModal";
import CarePlansModal from "./CarePlansModal";
import BedManagementModal from "./BedManagementModal";
import VitalsOverviewSection from "../vital_track/VitalsOverviewSection";

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
  const windowRef = useRef(null);
  const hasAnimatedRef = useRef(false);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
        setSelectedSessionId((prev) => prev || data.conversations[0].session_id);
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

  // Priority Score & Deterioration Risk
  const priorityScore =
    clinicalStatus.priority_score ??
    patient.priority_score ??
    (patient.triage_level === 1 ? 95 : patient.triage_level === 2 ? 80 : patient.triage_level === 3 ? 55 : 30);

  const needsIcu = Boolean(patient.needs_icu) || Boolean(clinicalStatus.needs_icu) || activeBed?.bed_type === "ICU";

  // Sparkline builder for real vitals history
  const sortedHistory = useMemo(() => {
    return [...(vitals.history || [])].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  }, [vitals.history]);

  const renderSparkline = (metricKey, customColor) => {
    const rawValues = sortedHistory
      .map((item) => Number(item[metricKey]))
      .filter((n) => !isNaN(n) && n > 0);

    if (rawValues.length < 2) {
      return (
        <div className="upm-empty-sparkline">
          <span>No readings yet</span>
          <button
            type="button"
            className="upm-btn-mini"
            onClick={(e) => {
              e.stopPropagation();
              setActiveSubModal("vitals");
            }}
          >
            + Record
          </button>
        </div>
      );
    }

    let min = Math.min(...rawValues);
    let max = Math.max(...rawValues);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const width = 100;
    const height = 24;
    const pad = 3;

    const points = rawValues.map((val, idx) => {
      const x = (idx / (rawValues.length - 1)) * (width - pad * 2) + pad;
      const y = height - pad - ((val - min) / (max - min)) * (height - pad * 2);
      return { x: x.toFixed(1), y: y.toFixed(1) };
    });

    const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;

    return (
      <div className="upm-sparkline-wrap">
        <svg viewBox="0 0 100 24" preserveAspectRatio="none">
          <path d={pathD} className="upm-spark-path" style={{ stroke: customColor || "var(--teal)" }} />
        </svg>
      </div>
    );
  };

  // Section 9: Live HTML5 Canvas oscilloscope drawing (untouched logic)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let x = 0;
    const width = canvas.width || 600;
    const height = canvas.height || 100;
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
        offset = -Math.sin(((t - 8) / 6) * Math.PI) * 9;
      } else if (t === 18) {
        offset = 6;
      } else if (t >= 19 && t <= 23) {
        offset = -((23 - Math.abs(t - 21) * 10) / 23) * 40;
      } else if (t === 24) {
        offset = 12;
      } else if (t >= 32 && t <= 44) {
        offset = -Math.sin(((t - 32) / 12) * Math.PI) * 14;
      }

      offset += (Math.random() - 0.5) * 1.5;
      const currentY = midY + offset;

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

  // Intro motion with anime.js 3.2.1 on initial load only
  useEffect(() => {
    if (loading || !profileData || hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const modalWin = windowRef.current;
    if (!modalWin) return;

    anime({
      targets: modalWin,
      scale: [0.96, 1],
      opacity: [0, 1],
      duration: 320,
      easing: "easeOutQuad",
    });

    anime({
      targets: modalWin.querySelectorAll(".upm-card, .upm-organ-card, .upm-body-figure-card"),
      translateY: [24, 0],
      opacity: [0, 1],
      delay: anime.stagger(60, { start: 80 }),
      duration: 550,
      easing: "easeOutExpo",
    });

    anime({
      targets: modalWin.querySelectorAll(".upm-callout-pill"),
      scale: [0.65, 1],
      opacity: [0, 1],
      delay: anime.stagger(90, { start: 350 }),
      duration: 450,
      easing: "easeOutBack",
    });
  }, [loading, profileData]);

  // Heartbeat animation loop for the 3D heart organ inside the Heart-rate Activity Card
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const hr = latestVitals?.heart_rate;
    const beatDuration = hr && hr > 35 && hr < 220 ? Math.max(400, Math.min(1500, Math.round(60000 / hr))) : 1500;

    const heartEl = windowRef.current?.querySelector(".upm-beat");
    const coreEl = windowRef.current?.querySelector(".upm-core");
    if (!heartEl) return;

    const heartAnim = anime({
      targets: heartEl,
      scale: [1, 1.06, 1, 1.03, 1],
      duration: beatDuration,
      loop: true,
      easing: "easeInOutSine",
    });

    const coreAnim = coreEl
      ? anime({
          targets: coreEl,
          opacity: [0.35, 0.8],
          duration: Math.round(beatDuration / 2),
          direction: "alternate",
          loop: true,
          easing: "easeInOutSine",
        })
      : null;

    return () => {
      heartAnim.pause();
      if (coreAnim) coreAnim.pause();
      if (windowRef.current) {
        anime.remove(heartEl);
        if (coreEl) anime.remove(coreEl);
      }
    };
  }, [latestVitals?.heart_rate, activeTab]);

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

  // Tab definitions
  const TAB_ITEMS = [
    { id: "overview", label: "Overview & Summary", icon: "📋" },
    { id: "timeline", label: "Unified Timeline", icon: "⏱️", count: timeline.length },
    { id: "conversations", label: "AI Intake & Chat", icon: "💬", count: conversations.length },
    { id: "documents", label: "Records & OCR", icon: "📄", count: documents.length },
    { id: "vitals", label: "Bedside Vitals", icon: "🩺", count: vitals.history?.length || 0 },
    { id: "mews", label: "MEWS Assessments", icon: "⚡", count: mewsAssessments.length },
    { id: "ml_risk", label: "ML Risk & XAI", icon: "🧠", count: mlAssessments.length },
    { id: "hospital_care", label: "Hospital Care", icon: "🛏️", count: carePlans.length },
  ];

  const handleTabKeyDown = (e, currentId) => {
    const ids = TAB_ITEMS.map((t) => t.id);
    const idx = ids.indexOf(currentId);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIdx = (idx + 1) % ids.length;
      setActiveTab(ids[nextIdx]);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIdx = (idx - 1 + ids.length) % ids.length;
      setActiveTab(ids[prevIdx]);
    }
  };

  // Subbe et al. 2001 parameter breakdown calculation for MEWS Card
  const latestMewsAssessment = mewsAssessments[0];
  const mewsBreakdown = [
    {
      param: "Systolic BP",
      val: latestVitals ? `${latestVitals.blood_pressure_sys} mmHg` : "--",
      pts: latestMewsAssessment ? latestMewsAssessment.bp_score : (latestVitals?.blood_pressure_sys < 70 ? 3 : latestVitals?.blood_pressure_sys < 80 ? 2 : latestVitals?.blood_pressure_sys < 101 ? 1 : latestVitals?.blood_pressure_sys > 199 ? 2 : 0),
    },
    {
      param: "Heart Rate",
      val: latestVitals ? `${latestVitals.heart_rate} bpm` : "--",
      pts: latestMewsAssessment ? latestMewsAssessment.hr_score : (latestVitals?.heart_rate > 129 ? 3 : latestVitals?.heart_rate > 110 ? 2 : latestVitals?.heart_rate > 100 || latestVitals?.heart_rate < 51 ? 1 : 0),
    },
    {
      param: "Resp. Rate",
      val: latestVitals ? `${latestVitals.respiratory_rate} /min` : "--",
      pts: latestMewsAssessment ? latestMewsAssessment.rr_score : (latestVitals?.respiratory_rate > 29 ? 3 : latestVitals?.respiratory_rate > 20 ? 2 : latestVitals?.respiratory_rate > 14 ? 1 : 0),
    },
    {
      param: "Temperature",
      val: latestVitals ? `${Number(latestVitals.temperature).toFixed(1)} °C` : "--",
      pts: latestMewsAssessment ? latestMewsAssessment.temp_score : (latestVitals?.temperature >= 38.5 ? 2 : latestVitals?.temperature <= 35.0 ? 2 : 0),
    },
    {
      param: "Oxygen Sat",
      val: latestVitals ? `${latestVitals.oxygen_saturation} %` : "--",
      pts: latestMewsAssessment ? latestMewsAssessment.spo2_score : (latestVitals?.oxygen_saturation < 90 ? 3 : latestVitals?.oxygen_saturation < 94 ? 2 : latestVitals?.oxygen_saturation < 96 ? 1 : 0),
    },
  ];

  return (
    <div className="pc-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="pc-modal-window unified-profile-window"
        ref={windowRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================= */}
        {/* STICKY HEADER                                                     */}
        {/* ================================================================= */}
        <header className="upm-header">
          <div className="upm-header-left">
            <div className="upm-avatar">
              {patient.full_name
                ? patient.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()
                : "PT"}
            </div>
            <div className="upm-header-meta">
              <div className="upm-title-row">
                <h2 className="upm-patient-name">{patient.full_name || "Patient Profile"}</h2>
                <div className="upm-chips-row">
                  <span className="upm-chip upm-chip-id">{patient.patient_id}</span>
                  <span className="upm-chip upm-chip-demog">
                    {patient.age ? `${patient.age}y` : "--"} / {patient.gender || "--"}
                  </span>
                  {activeBed ? (
                    <span className={`upm-chip ${activeBed.bed_type === "ICU" ? "upm-chip-icu" : "upm-chip-bed"}`}>
                      🛏️ Bed {activeBed.bed_number} ({activeBed.ward})
                    </span>
                  ) : (
                    <span className="upm-chip upm-chip-opd">Outpatient (OPD)</span>
                  )}
                </div>
              </div>
              <div className="upm-subline">
                Hospital Station: <strong>{currentStaff?.hospital_name || "MediKiosk General Hospital"}</strong> •
                Registered: {formatTimestamp(patient.created_at)}
              </div>
            </div>
          </div>

          <div className="upm-header-actions">
            <button
              type="button"
              className="upm-btn-refresh"
              onClick={fetchProfile}
              disabled={loading}
              title="Refresh clinical profile"
            >
              {loading ? "Refreshing..." : "🔄 Refresh"}
            </button>
            <button
              type="button"
              className="upm-btn-close"
              onClick={onClose}
              aria-label="Close patient profile"
            >
              ×
            </button>
          </div>
        </header>

        {/* ================================================================= */}
        {/* ALERT STRIP (Rule 9 Isolation: Chat Red Flag & MEWS separate)     */}
        {/* ================================================================= */}
        {(hasIntakeRf || hasMewsAlert) && (
          <div className="upm-alert-strip">
            <span style={{ fontSize: "14px" }}>⚠️</span>
            <strong style={{ fontSize: "12px", color: "var(--ink-soft)" }}>Active Alerts:</strong>
            {hasIntakeRf && (
              <span className="upm-alert-badge upm-alert-rf">
                🚨 AI Chat Red Flag: {conversationAlerts[0]?.reason || "Intake Alert"}
              </span>
            )}
            {hasMewsAlert && (
              <span className={`upm-alert-badge ${currentMews >= 5 ? "upm-alert-mews-crit" : "upm-alert-mews"}`}>
                ⚡ Physiological MEWS Alert: {currentMews} pts ({currentMews >= 5 ? "CRITICAL" : "ELEVATED"})
              </span>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* NOTIFICATION FEEDBACK (aria-live="polite")                        */}
        {/* ================================================================= */}
        {actionMsg.text && (
          <div
            className={`upm-feedback-banner ${actionMsg.type === "success" ? "success" : "error"}`}
            role="status"
            aria-live="polite"
          >
            <span>
              {actionMsg.type === "success" ? "✓" : "⚠️"} {actionMsg.text}
            </span>
            <button
              type="button"
              className="upm-feedback-close"
              onClick={() => setActionMsg({ type: "", text: "" })}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* PILL NAVIGATION (8 Tabs - NO horizontal scrollbar)                */}
        {/* ================================================================= */}
        <nav className="upm-tab-strip" role="tablist" aria-label="Patient profile navigation tabs">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              type="button"
              className={`upm-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count != null && <span className="upm-tab-count">{tab.count}</span>}
            </button>
          ))}
        </nav>

        {/* ================================================================= */}
        {/* SCROLLABLE MODAL BODY                                             */}
        {/* ================================================================= */}
        <main className="upm-body" id={`tabpanel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {error && (
            <div className="doc-auth-alert doc-alert-danger" style={{ marginBottom: "16px" }}>
              <span>⚠️</span> <span>{error}</span>
            </div>
          )}

          {loading && !profileData ? (
            <div className="staff-loading" style={{ padding: "60px 0", textAlign: "center" }}>
              <div className="loading-spinner"></div>
              <p style={{ marginTop: "12px", color: "var(--ink-soft)" }}>
                Aggregating unified clinical records for {patientId}...
              </p>
            </div>
          ) : !profileData ? (
            <div className="staff-empty-state" style={{ padding: "60px 0", textAlign: "center" }}>
              <span className="empty-icon" style={{ fontSize: "32px" }}>📁</span>
              <h4 style={{ margin: "10px 0 4px" }}>Patient Profile Unavailable</h4>
              <p style={{ color: "var(--ink-soft)" }}>Could not retrieve clinical records for this patient identity.</p>
            </div>
          ) : (
            <>
              {/* ============================================================= */}
              {/* TAB 1: OVERVIEW & SUMMARY (EDUVERSE+ ANATOMY LAYOUT)          */}
              {/* ============================================================= */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* ENHANCED LIVE VITALS OVERVIEW SECTION (VITALTRACK INSPIRED) */}
                  <VitalsOverviewSection
                    vitals={vitals}
                    patient={patient}
                    mews={currentMews}
                  />

                  <div className="upm-overview-grid">
                  {/* --------------------------------------------------------- */}
                  {/* LEFT COLUMN: TOP VITAL CARDS + PATIENT IDENTITY           */}
                  {/* --------------------------------------------------------- */}
                  <div className="upm-col upm-col-left">
                    {/* TWO HERO VITAL CARDS (MATCHING REFERENCE "BLOOD STATUS") */}
                    <div className="upm-vital-dual-grid">
                      {/* 1. BLOOD PRESSURE HERO CARD */}
                      <div className="upm-vital-hero-card">
                        <div className="upm-vital-hero-top">
                          <span className="upm-vital-hero-icon">🩸</span>
                          <span
                            className={`upm-vital-hero-status ${
                              latestVitals && (latestVitals.blood_pressure_sys > 140 || latestVitals.blood_pressure_sys < 90)
                                ? "warn"
                                : ""
                            }`}
                          >
                            {latestVitals && (latestVitals.blood_pressure_sys > 140 || latestVitals.blood_pressure_sys < 90)
                              ? "Alert"
                              : "Normal"}
                          </span>
                        </div>
                        <span className="upm-vital-hero-label">Blood Status</span>
                        <div className="upm-vital-hero-val">
                          <span className="upm-num-hero">
                            {latestVitals
                              ? `${latestVitals.blood_pressure_sys}/${latestVitals.blood_pressure_dia || 80}`
                              : "--"}
                          </span>
                          <span className="upm-unit-hero">mmHg</span>
                        </div>
                        {renderSparkline("blood_pressure_sys", "#e05244")}
                      </div>

                      {/* 2. OXYGEN SATURATION HERO CARD */}
                      <div className="upm-vital-hero-card">
                        <div className="upm-vital-hero-top">
                          <span className="upm-vital-hero-icon" style={{ color: "var(--teal)" }}>🫁</span>
                          <span
                            className={`upm-vital-hero-status ${
                              latestVitals && latestVitals.oxygen_saturation < 95 ? "bad" : ""
                            }`}
                          >
                            {latestVitals && latestVitals.oxygen_saturation < 95 ? "Low" : "Normal"}
                          </span>
                        </div>
                        <span className="upm-vital-hero-label">Oxygen Sat</span>
                        <div className="upm-vital-hero-val">
                          <span className="upm-num-hero">
                            {latestVitals?.oxygen_saturation ?? "--"}
                          </span>
                          <span className="upm-unit-hero">SpO₂</span>
                        </div>
                        {renderSparkline("oxygen_saturation", "var(--teal)")}
                      </div>
                    </div>

                    {/* PATIENT IDENTITY CARD */}
                    <section className="upm-card">
                      <div className="upm-card-head">
                        <h3 className="upm-card-title">
                          <span>👤</span> Patient Identity
                        </h3>
                        <span className={`upm-chip ${activeBed ? "upm-chip-bed" : "upm-chip-opd"}`}>
                          {activeBed ? "Inpatient (Admitted)" : "Outpatient (OPD)"}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12.5px" }}>
                        <div>
                          <div style={{ color: "var(--ink-soft)", fontSize: "11px", fontWeight: 600 }}>AGE / SEX</div>
                          <div>{patient.age ? `${patient.age} yrs` : "Not recorded"} • {patient.gender || "--"}</div>
                        </div>
                        <div>
                          <div style={{ color: "var(--ink-soft)", fontSize: "11px", fontWeight: 600 }}>PHONE</div>
                          <div>{patient.phone || "Not recorded"}</div>
                        </div>
                        <div>
                          <div style={{ color: "var(--ink-soft)", fontSize: "11px", fontWeight: 600 }}>TRIAGE LEVEL</div>
                          <span className={`pc-badge badge-triage-${patient.triage_level || 3}`} style={{ marginTop: "2px" }}>
                            ESI {patient.triage_level || 3} —{" "}
                            {patient.triage_level === 1
                              ? "Immediate"
                              : patient.triage_level === 2
                              ? "Emergent"
                              : patient.triage_level === 3
                              ? "Urgent"
                              : "Less Urgent"}
                          </span>
                        </div>
                        <div>
                          <div style={{ color: "var(--ink-soft)", fontSize: "11px", fontWeight: 600 }}>DOCTOR ASSIGNED</div>
                          <div style={{ fontWeight: 600, color: "var(--teal-deep)" }}>
                            {conversations[0]?.doctor_name || "Staff Physician"}
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px", fontSize: "12px" }}>
                        <div style={{ color: "var(--ink-soft)", fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>
                          CHIEF COMPLAINT
                        </div>
                        <div style={{ color: "var(--ink)", lineHeight: 1.4 }}>{derivedChiefComplaint}</div>
                      </div>

                      <div style={{ fontSize: "12px" }}>
                        <div style={{ color: "var(--ink-soft)", fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>
                          COMORBIDITIES & MEDICAL HISTORY
                        </div>
                        <div style={{ color: "var(--ink)", lineHeight: 1.4, fontStyle: patient.comorbidities || patient.medical_history ? "normal" : "italic" }}>
                          {patient.comorbidities ? `${patient.comorbidities}. ` : ""}
                          {patient.medical_history || "No prior conditions documented."}
                        </div>
                      </div>
                    </section>

                    {/* CLINICAL TRACKER / DETERIORATION TARGET (MATCHES REFERENCE STEPS TRACKER) */}
                    <section className="upm-card">
                      <div className="upm-card-head">
                        <h3 className="upm-card-title">
                          <span>🎯</span> Clinical Deterioration Tracker
                        </h3>
                        <span className="upm-card-subtitle">Safety Target: ≤ 2 pts</span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                          <span className="upm-num-hero">{currentMews}</span>
                          <span className="upm-unit-hero">/ 14 MEWS Score</span>
                        </div>
                        <span className={`upm-chip ${currentMews <= 2 ? "upm-chip-bed" : "upm-chip-icu"}`}>
                          {currentMews <= 2 ? "Goal Met (Stable)" : "Deterioration Alert"}
                        </span>
                      </div>

                      {/* Segmented tracker bar */}
                      <div className="upm-segmented-bar" style={{ height: "10px", marginTop: "4px" }}>
                        {[0, 1, 2, 3, 4, 5, 6].map((step) => (
                          <div
                            key={step}
                            className={`upm-segment ${
                              step < (7 - Math.min(6, currentMews)) ? "filled-ok" : "filled-danger"
                            }`}
                          />
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                        <button
                          type="button"
                          className="upm-btn-primary"
                          onClick={() => setActiveSubModal("vitals")}
                          style={{ flex: 1 }}
                        >
                          🩺 Update Vitals
                        </button>
                        <button
                          type="button"
                          className="upm-btn-secondary"
                          onClick={() => setActiveSubModal("xai")}
                        >
                          🧠 Run XAI
                        </button>
                      </div>
                    </section>
                  </div>

                  {/* --------------------------------------------------------- */}
                  {/* CENTRE COLUMN: HUMAN ANATOMY SKELETON/MUSCULAR FIGURE     */}
                  {/* --------------------------------------------------------- */}
                  <div className="upm-col upm-col-centre">
                    {/* HUMAN ANATOMICAL FIGURE CARD (REPLACING THE STANDALONE HEART) */}
                    <div className="upm-body-figure-card">
                      <div className="upm-body-figure-stage">
                        {/* Callout 1: Pulmonary / Lungs */}
                        <button
                          type="button"
                          className="upm-callout-pill upm-pos-pulmonary"
                          onClick={() => setActiveTab("vitals")}
                          title="Lungs: Oxygen Saturation and Respiratory Rate"
                        >
                          <span className="upm-callout-dot" style={{ background: "var(--teal)" }} />
                          <div>
                            <small>Pulmonary / SpO₂</small>
                            <strong>{latestVitals?.oxygen_saturation ? `${latestVitals.oxygen_saturation}%` : "--"}</strong>
                          </div>
                        </button>

                        {/* Callout 2: Cardiac / Heart */}
                        <button
                          type="button"
                          className="upm-callout-pill upm-pos-cardiac"
                          onClick={() => setActiveTab("vitals")}
                          title="Heart: Bedside Heart Rate"
                        >
                          <span className="upm-callout-dot" style={{ background: "#dc2626" }} />
                          <div>
                            <small>Cardiac / HR</small>
                            <strong>{latestVitals?.heart_rate ? `${latestVitals.heart_rate} bpm` : "--"}</strong>
                          </div>
                        </button>

                        {/* Callout 3: Brachial / Blood Pressure */}
                        <button
                          type="button"
                          className="upm-callout-pill upm-pos-brachial"
                          onClick={() => setActiveTab("vitals")}
                          title="Brachial: Arterial Blood Pressure"
                        >
                          <span className="upm-callout-dot" style={{ background: "#0284c7" }} />
                          <div>
                            <small>Brachial / BP</small>
                            <strong>
                              {latestVitals
                                ? `${latestVitals.blood_pressure_sys}/${latestVitals.blood_pressure_dia || 80}`
                                : "--"}
                            </strong>
                          </div>
                        </button>

                        {/* Callout 4: Core / Umbilical MEWS Score */}
                        <button
                          type="button"
                          className="upm-callout-pill upm-pos-core"
                          onClick={() => setActiveTab("mews")}
                          title="Core: MEWS Deterioration Index"
                        >
                          <span
                            className="upm-callout-dot"
                            style={{
                              background: currentMews >= 5 ? "#dc2626" : currentMews >= 3 ? "#d97706" : "#16a34a",
                            }}
                          />
                          <div>
                            <small>Core / MEWS</small>
                            <strong>{currentMews} pts · {currentMews >= 5 ? "Critical" : currentMews >= 3 ? "Watch" : "Stable"}</strong>
                          </div>
                        </button>

                        {/* ANATOMICAL HUMAN BODY SVG (Medical Illustration) */}
                        <div className="upm-body-svg-wrap">
                          <svg viewBox="0 0 320 460" role="img" aria-label="Human anatomical muscular body figure">
                            <defs>
                              <radialGradient id="upm-muscle-body" cx="50%" cy="35%" r="65%">
                                <stop offset="0%" stopColor="#e76a52" />
                                <stop offset="35%" stopColor="#c33d28" />
                                <stop offset="70%" stopColor="#8d2315" />
                                <stop offset="100%" stopColor="#48120a" />
                              </radialGradient>
                              <radialGradient id="upm-head-grad" cx="50%" cy="30%" r="50%">
                                <stop offset="0%" stopColor="#f38973" />
                                <stop offset="55%" stopColor="#c84430" />
                                <stop offset="100%" stopColor="#761b0f" />
                              </radialGradient>
                              <linearGradient id="upm-pec-grad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#ef7a64" />
                                <stop offset="60%" stopColor="#b43420" />
                                <stop offset="100%" stopColor="#67160c" />
                              </linearGradient>
                              <linearGradient id="upm-tendon" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fce7df" stopOpacity="0.85" />
                                <stop offset="100%" stopColor="#e5a995" stopOpacity="0.4" />
                              </linearGradient>
                              <filter id="upm-glow">
                                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                                <feMerge>
                                  <feMergeNode in="coloredBlur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>

                            {/* HEAD / CRANIUM */}
                            <path
                              d="M160 18 C145 18 138 32 138 48 C138 68 146 82 153 90 C155 93 158 95 160 95 C162 95 165 93 167 90 C174 82 182 68 182 48 C182 32 175 18 160 18 Z"
                              fill="url(#upm-head-grad)"
                              stroke="#67160c"
                              strokeWidth="1.2"
                            />
                            {/* Sternocleidomastoid Neck */}
                            <path d="M152 88 L146 112 L154 114 L158 92 Z M168 88 L174 112 L166 114 L162 92 Z" fill="#992617" />

                            {/* DELTOIDS (SHOULDERS) */}
                            <path
                              d="M142 110 C128 112 112 120 102 132 C96 140 94 150 96 162 C102 166 114 162 118 152 C122 142 126 128 140 120 Z"
                              fill="url(#upm-pec-grad)"
                              stroke="#67160c"
                              strokeWidth="1"
                            />
                            <path
                              d="M178 110 C192 112 208 120 218 132 C224 140 226 150 224 162 C218 166 206 162 202 152 C198 142 194 128 180 120 Z"
                              fill="url(#upm-pec-grad)"
                              stroke="#67160c"
                              strokeWidth="1"
                            />

                            {/* CLAVICLES (TENDON HIGHLIGHT) */}
                            <path d="M140 114 Q150 118 160 115 Q170 118 180 114" fill="none" stroke="url(#upm-tendon)" strokeWidth="2.5" strokeLinecap="round" />

                            {/* PECTORALIS MAJOR (CHEST) */}
                            <path
                              d="M160 116 C148 117 132 124 124 135 C120 148 122 165 136 172 C146 176 156 172 160 166 Z"
                              fill="url(#upm-pec-grad)"
                              stroke="#761b0f"
                              strokeWidth="1.2"
                            />
                            <path
                              d="M160 116 C172 117 188 124 196 135 C200 148 198 165 184 172 C174 176 164 172 160 166 Z"
                              fill="url(#upm-pec-grad)"
                              stroke="#761b0f"
                              strokeWidth="1.2"
                            />
                            <line x1="160" y1="116" x2="160" y2="180" stroke="url(#upm-tendon)" strokeWidth="1.8" />

                            {/* SERRATUS ANTERIOR & RIBS */}
                            <path d="M124 165 C122 172 120 182 125 190 C128 196 132 198 136 198 C132 188 130 178 132 168 Z" fill="#992617" />
                            <path d="M196 165 C198 172 200 182 195 190 C192 196 188 198 184 198 C188 188 190 178 188 168 Z" fill="#992617" />

                            {/* RECTUS ABDOMINIS (6-PACK SEGMENTS) */}
                            <rect x="142" y="174" width="16" height="15" rx="3" fill="#c33d28" stroke="#67160c" strokeWidth="0.8" />
                            <rect x="162" y="174" width="16" height="15" rx="3" fill="#c33d28" stroke="#67160c" strokeWidth="0.8" />
                            <rect x="141" y="193" width="17" height="16" rx="3" fill="#b43420" stroke="#67160c" strokeWidth="0.8" />
                            <rect x="162" y="193" width="17" height="16" rx="3" fill="#b43420" stroke="#67160c" strokeWidth="0.8" />
                            <rect x="142" y="213" width="16" height="18" rx="3" fill="#9e2a1b" stroke="#67160c" strokeWidth="0.8" />
                            <rect x="162" y="213" width="16" height="18" rx="3" fill="#9e2a1b" stroke="#67160c" strokeWidth="0.8" />
                            <line x1="160" y1="172" x2="160" y2="242" stroke="url(#upm-tendon)" strokeWidth="1.5" />

                            {/* EXTERNAL OBLIQUES (FLANKS) */}
                            <path d="M136 185 C130 195 128 212 132 230 C136 238 142 242 146 242 L144 210 Z" fill="#9e2a1b" />
                            <path d="M184 185 C190 195 192 212 188 230 C184 238 178 242 174 242 L176 210 Z" fill="#9e2a1b" />

                            {/* ARMS: BICEPS, FOREARMS, HANDS */}
                            <path
                              d="M98 158 C94 172 92 195 96 215 C100 220 106 218 108 210 C112 195 114 175 112 160 Z"
                              fill="url(#upm-muscle-body)"
                              stroke="#67160c"
                              strokeWidth="1"
                            />
                            <path
                              d="M96 215 C92 235 88 260 86 280 C90 285 96 284 98 275 C102 258 106 235 106 218 Z"
                              fill="url(#upm-muscle-body)"
                              stroke="#67160c"
                              strokeWidth="1"
                            />
                            <path d="M86 280 C84 290 82 300 84 308 C86 312 90 310 92 304 C94 295 96 285 96 278 Z" fill="#b43420" />

                            <path
                              d="M222 158 C226 172 228 195 224 215 C220 220 214 218 212 210 C208 195 206 175 208 160 Z"
                              fill="url(#upm-muscle-body)"
                              stroke="#67160c"
                              strokeWidth="1"
                            />
                            <path
                              d="M224 215 C228 235 232 260 234 280 C230 285 224 284 222 275 C218 258 214 235 214 218 Z"
                              fill="url(#upm-muscle-body)"
                              stroke="#67160c"
                              strokeWidth="1"
                            />
                            <path d="M234 280 C236 290 238 300 236 308 C234 312 230 310 228 304 C226 295 224 285 224 278 Z" fill="#b43420" />

                            {/* PELVIS / GROIN */}
                            <path d="M140 238 Q160 252 180 238 L178 268 L160 280 L142 268 Z" fill="#7a1f14" stroke="#48120a" strokeWidth="1" />

                            {/* LEGS: THIGHS, KNEES, CALVES */}
                            <path
                              d="M142 268 C136 285 130 320 132 355 C136 364 146 365 152 358 C158 335 160 295 158 276 Z"
                              fill="url(#upm-muscle-body)"
                              stroke="#67160c"
                              strokeWidth="1"
                            />
                            <path
                              d="M178 268 C184 285 190 320 188 355 C184 364 174 365 168 358 C162 335 160 295 162 276 Z"
                              fill="url(#upm-muscle-body)"
                              stroke="#67160c"
                              strokeWidth="1"
                            />
                            <ellipse cx="142" cy="365" rx="7" ry="6" fill="#e5a995" />
                            <ellipse cx="178" cy="365" rx="7" ry="6" fill="#e5a995" />
                            <path d="M136 372 C132 390 134 420 136 445 L144 445 C146 425 148 395 148 372 Z" fill="#9e2a1b" stroke="#67160c" strokeWidth="1" />
                            <path d="M134 445 L130 455 L146 455 L145 445 Z" fill="#7a1f14" />
                            <path d="M184 372 C188 390 186 420 184 445 L176 445 C174 425 172 395 172 372 Z" fill="#9e2a1b" stroke="#67160c" strokeWidth="1" />
                            <path d="M186 445 L190 455 L174 455 L175 445 Z" fill="#7a1f14" />

                            {/* FIBER STRIATIONS */}
                            <path d="M126 138 Q138 145 152 140 M194 138 Q182 145 168 140" fill="none" stroke="#fca595" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
                            <path d="M128 152 Q140 158 154 154 M192 152 Q180 158 166 154" fill="none" stroke="#fca595" strokeWidth="1" opacity="0.6" strokeLinecap="round" />

                            {/* PINPOINT NODES WITH GLOW */}
                            {/* 1. Cardiac / Heart Point */}
                            <circle cx="174" cy="148" r="5" fill="#ffffff" stroke="#dc2626" strokeWidth="2" filter="url(#upm-glow)" />
                            <circle cx="174" cy="148" r="2.2" fill="#dc2626" />

                            {/* 2. Pulmonary / Lung Point */}
                            <circle cx="146" cy="148" r="5" fill="#ffffff" stroke="#1f5c50" strokeWidth="2" filter="url(#upm-glow)" />
                            <circle cx="146" cy="148" r="2.2" fill="#1f5c50" />

                            {/* 3. Brachial / Arm (BP) Point */}
                            <circle cx="104" cy="200" r="5" fill="#ffffff" stroke="#0284c7" strokeWidth="2" filter="url(#upm-glow)" />
                            <circle cx="104" cy="200" r="2.2" fill="#0284c7" />

                            {/* 4. Core / Umbilical (MEWS) Point */}
                            <circle cx="160" cy="228" r="5" fill="#ffffff" stroke="#d97706" strokeWidth="2" filter="url(#upm-glow)" />
                            <circle cx="160" cy="228" r="2.2" fill="#d97706" />

                            {/* 5. Cranial / Temp Point */}
                            <circle cx="160" cy="50" r="4.5" fill="#ffffff" stroke="#64748b" strokeWidth="2" />
                            <circle cx="160" cy="50" r="2" fill="#64748b" />
                          </svg>
                        </div>
                      </div>

                      <div style={{ textAlign: "center", marginTop: "12px" }}>
                        <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
                          Human Physiological Atlas • Click any anatomical callout to inspect parameters
                        </span>
                      </div>
                    </div>

                    {/* RECENT CLINICAL TIMELINE (LATEST 4 EVENTS) */}
                    <section className="upm-card">
                      <div className="upm-card-head">
                        <h3 className="upm-card-title">
                          <span>⏱️</span> Recent Clinical Activity
                        </h3>
                        <button
                          type="button"
                          className="upm-btn-mini"
                          onClick={() => setActiveTab("timeline")}
                          title="View all events"
                        >
                          View all ({timeline.length}) →
                        </button>
                      </div>

                      {timeline.length === 0 ? (
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                          No clinical events recorded yet for this patient.
                        </p>
                      ) : (
                        <div className="upm-recent-list">
                          {timeline.slice(0, 4).map((evt) => (
                            <div key={evt.id} className="upm-recent-item">
                              <span className="upm-recent-icon">
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
                              <div className="upm-recent-body">
                                <div className="upm-recent-top">
                                  <strong>{evt.title}</strong>
                                  <small>{formatTimestamp(evt.timestamp)}</small>
                                </div>
                                <p className="upm-recent-desc">{evt.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  {/* --------------------------------------------------------- */}
                  {/* RIGHT COLUMN: HEART-RATE ACTIVITY (WITH 3D HEART) & MEWS  */}
                  {/* --------------------------------------------------------- */}
                  <div className="upm-col upm-col-right">
                    {/* DEDICATED "HEART-RATE ACTIVITY" CARD WITH 3D GLOWING HEART BESIDE IT */}
                    <section className="upm-organ-card">
                      <div className="upm-card-head" style={{ marginBottom: "2px" }}>
                        <h3 className="upm-card-title">
                          <span>🫀</span> Heart-rate Activity
                        </h3>
                        <span className="upm-vital-hero-status">
                          {latestVitals && (latestVitals.heart_rate > 100 || latestVitals.heart_rate < 60)
                            ? "Monitoring"
                            : "Normal"}
                        </span>
                      </div>

                      <div className="upm-organ-inner">
                        <div className="upm-organ-info">
                          <p style={{ margin: "0 0 8px 0", fontSize: "11.5px", color: "var(--ink-soft)" }}>
                            Adult physiological resting target: <strong>60 – 100 bpm</strong>
                          </p>
                          <div className="upm-organ-val-row">
                            <span className="upm-organ-hr-number">
                              {latestVitals?.heart_rate ?? 76}
                            </span>
                            <span className="upm-organ-hr-unit">bpm</span>
                          </div>
                          <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--ink-soft)" }}>
                            Cardiac telemetry rhythm: <strong>Sinus Rhythm</strong>
                          </div>
                        </div>

                        {/* The 3D Glowing Glass Heart Organ Illustration */}
                        <div className="upm-organ-heart-box" title="3D Cardiac Telemetry Organ">
                          <svg viewBox="0 0 300 340" role="img" aria-label="3D Anatomical Heart">
                            <defs>
                              <radialGradient id="upm-organ-heart-body" cx="48%" cy="62%" r="62%">
                                <stop offset="0" stopColor="#ffd27a" />
                                <stop offset=".28" stopColor="#ff7a3a" />
                                <stop offset=".6" stopColor="#b3283a" />
                                <stop offset="1" stopColor="#3b2745" />
                              </radialGradient>
                              <linearGradient id="upm-organ-heart-glass" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#cfd3e6" stopOpacity=".85" />
                                <stop offset="1" stopColor="#4a3c5c" stopOpacity=".9" />
                              </linearGradient>
                              <filter id="upm-organ-blur">
                                <feGaussianBlur stdDeviation="4" />
                              </filter>
                            </defs>
                            <g
                              className="upm-beat"
                              style={{ transformOrigin: "150px 220px", transformBox: "view-box" }}
                            >
                              <path
                                d="M92 70 L40 62 L36 84 L92 98Z M170 78 L250 70 L254 98 L180 108Z"
                                fill="url(#upm-organ-heart-glass)"
                                stroke="#8a8fa8"
                                strokeWidth="2"
                              />
                              <path
                                d="M150 330 C60 272 18 205 38 136 C54 82 112 72 140 112 C150 124 160 124 170 112 C202 72 258 88 266 142 C280 212 240 276 150 330Z"
                                fill="url(#upm-organ-heart-body)"
                                stroke="#7a6a92"
                                strokeWidth="3"
                              />
                              <path
                                d="M60 150 C70 100 112 90 130 125 C100 150 80 200 90 250 C60 220 48 185 60 150Z"
                                fill="url(#upm-organ-heart-glass)"
                                opacity=".55"
                              />
                              <g fill="none" stroke="#ffc46a" strokeLinecap="round" filter="url(#upm-organ-blur)" opacity=".9">
                                <path d="M150 300 C140 240 120 200 110 140" strokeWidth="7" />
                                <path d="M150 290 C170 240 200 210 220 150" strokeWidth="6" />
                                <path d="M120 220 C150 200 170 210 190 190" strokeWidth="5" />
                              </g>
                              <g fill="none" stroke="#ffe9a8" strokeLinecap="round" strokeWidth="1.6" opacity=".85">
                                <path d="M150 300 C140 240 120 200 110 140" />
                                <path d="M150 290 C170 240 200 210 220 150" />
                                <path d="M120 220 C150 200 170 210 190 190" />
                              </g>
                              <ellipse
                                className="upm-core"
                                cx="146"
                                cy="226"
                                rx="46"
                                ry="52"
                                fill="#ffd48a"
                                opacity=".45"
                                filter="url(#upm-organ-blur)"
                              />
                            </g>
                          </svg>
                        </div>
                      </div>
                    </section>

                    {/* MEWS ASSESSMENT CARD */}
                    <section className="upm-card">
                      <div className="upm-card-head">
                        <h3 className="upm-card-title">
                          <span>⚡</span> MEWS Assessment
                        </h3>
                        <span className="upm-card-subtitle">Subbe et al. (2001)</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                          <span
                            className="upm-num-hero"
                            style={{
                              color: currentMews >= 5 ? "#dc2626" : currentMews >= 3 ? "#d97706" : "#16a34a",
                            }}
                          >
                            {currentMews}
                          </span>
                          <span className="upm-unit-hero">/ 14 pts</span>
                        </div>
                        <span
                          className={`upm-chip ${
                            currentMews >= 5 ? "upm-chip-icu" : currentMews >= 3 ? "upm-chip-opd" : "upm-chip-bed"
                          }`}
                        >
                          {currentMews >= 5 ? "CRITICAL DETERIORATION" : currentMews >= 3 ? "MONITORING ADVISORY" : "PHYSIOLOGICALLY STABLE"}
                        </span>
                      </div>

                      {/* 5 MEWS Parameter Breakdown Segmented Rows */}
                      <div className="upm-mews-params">
                        {mewsBreakdown.map((row) => (
                          <div key={row.param} className="upm-mews-row">
                            <div className="upm-mews-row-head">
                              <span>{row.param}: {row.val}</span>
                              <strong>+{row.pts} pt{row.pts === 1 ? "" : "s"}</strong>
                            </div>
                            <div className="upm-segmented-bar">
                              {[0, 1, 2, 3].map((segIdx) => (
                                <div
                                  key={segIdx}
                                  className={`upm-segment ${
                                    row.pts === 0 && segIdx === 0
                                      ? "filled-ok"
                                      : segIdx <= row.pts && row.pts > 0
                                      ? row.pts >= 2
                                        ? "filled-danger"
                                        : "filled-warn"
                                      : ""
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--ink-soft)", lineHeight: 1.4 }}>
                        {latestVitals?.mews_explanation ||
                          "Automated deterioration index computed across bedside physiological indicators."}
                      </p>
                    </section>

                    {/* DISCHARGE READINESS & HOSPITAL BED CARE */}
                    <section className="upm-card">
                      <div className="upm-card-head">
                        <h3 className="upm-card-title">
                          <span>🚪</span> Discharge Readiness
                        </h3>
                        <span className="upm-card-subtitle">{metCount} of 6 criteria met</span>
                      </div>

                      <div className="upm-segmented-bar" style={{ height: "7px" }}>
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                          <div
                            key={idx}
                            className={`upm-segment ${idx < metCount ? "filled-ok" : ""}`}
                          />
                        ))}
                      </div>

                      <div className="upm-criteria-list">
                        {criteriaList.map((crit, idx) => (
                          <div key={idx} className={`upm-criteria-item ${crit.met ? "met" : "unmet"}`}>
                            <span>{crit.label}</span>
                            <span className={`upm-crit-badge ${crit.met ? "met" : "unmet"}`}>
                              {crit.met ? "MET" : "UNMET"}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {activeBed ? (
                            <button
                              type="button"
                              className="upm-btn-secondary"
                              onClick={() => {
                                if (onActionTrigger) onActionTrigger("bed", activePatientForModals);
                                else setActiveSubModal("bed");
                              }}
                              style={{ flex: 1 }}
                            >
                              🛏️ Bed {activeBed.bed_number}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="upm-btn-secondary"
                              onClick={() => {
                                if (onActionTrigger) onActionTrigger("bed", activePatientForModals);
                                else setActiveSubModal("bed");
                              }}
                              style={{ flex: 1 }}
                            >
                              🛏️ Allocate Bed
                            </button>
                          )}
                          <button
                            type="button"
                            className="upm-btn-secondary"
                            onClick={() => setActiveSubModal("carePlans")}
                            style={{ flex: 1 }}
                          >
                            📋 Care Plans ({carePlans.length})
                          </button>
                        </div>

                        {/* Discharge Safety Gate (MEWS >= 3 blocks discharge) */}
                        {isDischargeReady ? (
                          <button
                            type="button"
                            className="upm-btn-primary"
                            onClick={handleDischargePatient}
                            disabled={actionLoading}
                            style={{ background: "#16a34a", borderColor: "#15803d" }}
                          >
                            {actionLoading ? "Processing..." : "🚪 Discharge Patient"}
                          </button>
                        ) : (
                          <div style={{ fontSize: "11px", color: "var(--ink-soft)", background: "#f8faf9", padding: "8px 12px", borderRadius: "10px", textAlign: "center" }}>
                            🔒 Discharge blocked: All 6 criteria must be met and MEWS ≤ 2.
                          </div>
                        )}

                        {needsIcu && activeBed?.bed_type !== "ICU" && (
                          <button
                            type="button"
                            className="upm-btn-danger"
                            onClick={handleUpgradeICU}
                            disabled={actionLoading}
                          >
                            {actionLoading ? "Transferring..." : "🚨 Immediate ICU Transfer"}
                          </button>
                        )}
                      </div>
                    </section>

                    {/* REAL-TIME ECG SIMULATION */}
                    <section className="upm-card">
                      <div className="upm-card-head">
                        <h3 className="upm-card-title">
                          <span>❤️</span> AD8232 ECG Telemetry
                        </h3>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="upm-btn-mini"
                            onClick={ecgConnected ? handleDisconnectECG : handleConnectECG}
                            style={{
                              background: ecgConnected ? "var(--alert-soft)" : "var(--ok-soft)",
                              borderColor: ecgConnected ? "#fca5a5" : "#bce1ca",
                              color: ecgConnected ? "var(--alert)" : "var(--ok)",
                            }}
                          >
                            {ecgConnected ? "⏹️ Stop" : "🔌 Connect"}
                          </button>
                        </div>
                      </div>

                      <div style={{ borderRadius: "12px", overflow: "hidden", background: "#051610", lineHeight: 0 }}>
                        <canvas ref={canvasRef} width="600" height="90" style={{ width: "100%", height: "90px", display: "block" }} />
                      </div>

                      <div className="disclaimer-banner disclaimer-ecg" style={{ margin: 0, padding: "8px 12px", fontSize: "11px" }}>
                        <span className="disclaimer-icon">ℹ️</span>
                        <div>
                          <strong>Rule 11 Simulation Notice:</strong> AD8232 ECG waveform is synthetically simulated for demonstration and educational testing.
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
              )}

              {/* ============================================================= */}
              {/* TAB 2: UNIFIED TIMELINE                                       */}
              {/* ============================================================= */}
              {activeTab === "timeline" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <h3 style={{ margin: 0, color: "var(--teal-deep)" }}>Chronological Clinical Event Stream</h3>
                      <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                        Audited time-series combining AI intake, medical records, bedside vitals, and hospital care.
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
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
                          className={`upm-chip ${timelineFilter === f.id ? "upm-chip-demog" : ""}`}
                          onClick={() => setTimelineFilter(f.id)}
                          style={{
                            cursor: "pointer",
                            background: timelineFilter === f.id ? "var(--teal-deep)" : "#ffffff",
                            color: timelineFilter === f.id ? "#ffffff" : "var(--ink-soft)",
                            border: "1px solid var(--line)",
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredTimeline.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "40px", border: "1px dashed var(--line)", borderRadius: "18px" }}>
                      <span className="empty-icon">⏱️</span>
                      <h4>No Timeline Events Found</h4>
                      <p>Select another filter to view recorded clinical actions.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {filteredTimeline.map((item, idx) => (
                        <div key={item.id || idx} className="upm-card" style={{ padding: "14px 18px", gap: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                              <strong style={{ fontSize: "13.5px", color: "var(--teal-deep)" }}>{item.title}</strong>
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
                              {formatTimestamp(item.timestamp)}
                            </span>
                          </div>

                          <p style={{ margin: "4px 0", fontSize: "12.5px", color: "var(--ink)", lineHeight: 1.45 }}>
                            {item.description}
                          </p>

                          <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "11px", color: "var(--ink-soft)" }}>
                            <span className="upm-chip" style={{ background: "#f0f4f2" }}>
                              Origin: {item.provenance_label || item.provenance_source}
                            </span>
                            <span>Recorded by: <strong>{item.actor}</strong></span>
                            {item.metadata?.session_id && (
                              <span>Session: <code>{item.metadata.session_id.substring(0, 8)}</code></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="disclaimer-banner" style={{ margin: 0, padding: "10px 14px", fontSize: "11px" }}>
                    <span className="disclaimer-icon">ℹ️</span>
                    <div>
                      <strong>Rule 10 Data Provenance:</strong> Every timeline item captures origin source and tamper-evident timestamps to guarantee medical auditing integrity.
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 3: INTAKE & AI CONVERSATIONS                              */}
              {/* ============================================================= */}
              {activeTab === "conversations" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, color: "var(--teal-deep)" }}>
                    AI-Assisted Patient Intake Sessions ({conversations.length})
                  </h3>

                  {conversations.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "40px", border: "1px dashed var(--line)", borderRadius: "18px" }}>
                      <span className="empty-icon">💬</span>
                      <h4>No Intake Sessions Found</h4>
                      <p>This patient has not yet completed a clinical intake interview at the MediKiosk.</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
                        {conversations.map((sess) => (
                          <button
                            key={sess.session_id}
                            type="button"
                            className={`upm-chip ${selectedSessionId === sess.session_id ? "upm-chip-demog" : ""}`}
                            onClick={() => setSelectedSessionId(sess.session_id)}
                            style={{
                              cursor: "pointer",
                              background: selectedSessionId === sess.session_id ? "var(--teal-deep)" : "#ffffff",
                              color: selectedSessionId === sess.session_id ? "#ffffff" : "var(--ink-soft)",
                              border: "1px solid var(--line)",
                              padding: "6px 12px",
                            }}
                          >
                            Session: {sess.session_id.substring(0, 8)} • {sess.department || "General"}
                          </button>
                        ))}
                      </div>

                      {selectedSession && (
                        <div className="upm-card" style={{ padding: "20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                              <strong>Doctor Assigned: {selectedSession.doctor_name || "Doctor"} ({selectedSession.department})</strong>
                              <div style={{ fontSize: "11.5px", color: "var(--ink-soft)", marginTop: "2px" }}>
                                Language: <strong>{selectedSession.language}</strong> • Date: {formatTimestamp(selectedSession.created_at)}
                              </div>
                            </div>
                            {selectedSession.red_flag ? (
                              <span className="upm-alert-badge upm-alert-rf">
                                🚨 Red Flag: {selectedSession.red_flag_reason}
                              </span>
                            ) : (
                              <span className="upm-chip upm-chip-bed">✓ Normal Triage Flow</span>
                            )}
                          </div>

                          <div
                            style={{
                              background: "var(--paper)",
                              border: "1px solid var(--line)",
                              borderRadius: "16px",
                              padding: "16px",
                              maxHeight: "360px",
                              overflowY: "auto",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                              marginTop: "12px",
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
                                      background: isUser ? "var(--teal)" : "#ffffff",
                                      color: isUser ? "#ffffff" : "var(--ink)",
                                      padding: "10px 14px",
                                      borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                                      fontSize: "12.5px",
                                      lineHeight: 1.45,
                                      border: isUser ? "none" : "1px solid var(--line)",
                                    }}
                                  >
                                    <div style={{ fontSize: "10px", opacity: 0.8, marginBottom: "3px" }}>
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
                            <div style={{ marginTop: "14px", padding: "14px", background: "#f8faf9", borderRadius: "14px", border: "1px solid var(--line)" }}>
                              <strong style={{ fontSize: "12.5px", color: "var(--teal-deep)" }}>
                                Doctor-Ready Clinical Summary:
                              </strong>
                              <pre style={{ margin: "6px 0 0", fontSize: "12px", whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.5 }}>
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

              {/* ============================================================= */}
              {/* TAB 4: MEDICAL DOCUMENTS & OCR                                */}
              {/* ============================================================= */}
              {activeTab === "documents" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, color: "var(--teal-deep)" }}>
                    Uploaded Medical Documents & OCR Extractions ({documents.length})
                  </h3>

                  {documents.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "40px", border: "1px dashed var(--line)", borderRadius: "18px" }}>
                      <span className="empty-icon">📄</span>
                      <h4>No Medical Documents Uploaded</h4>
                      <p>The patient has not uploaded external prescriptions or lab reports for OCR processing.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {documents.map((doc) => (
                        <div key={doc.id} className="upm-card" style={{ padding: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>📄 {doc.filename}</strong>
                            <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>Uploaded: {formatTimestamp(doc.created_at)}</span>
                          </div>
                          <div style={{ fontSize: "11.5px", color: "var(--ink-soft)" }}>
                            OCR Engine: <strong>Tesseract OCR</strong> • Characters: <strong>{doc.char_count || doc.extracted_text?.length || 0}</strong>
                          </div>
                          <div style={{ background: "#ffffff", padding: "12px", borderRadius: "10px", border: "1px solid var(--line)", maxHeight: "160px", overflowY: "auto", fontSize: "12px", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                            {doc.extracted_text || "No readable text extracted from document image."}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 5: BEDSIDE VITALS HISTORY                                 */}
              {/* ============================================================= */}
              {activeTab === "vitals" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ margin: 0, color: "var(--teal-deep)" }}>
                        Bedside Vital Observations & Trends ({vitals.history?.length || 0})
                      </h3>
                      <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                        Continuous physiological observation logs with MEWS categorization.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="upm-btn-primary"
                      onClick={() => setActiveSubModal("vitals")}
                    >
                      🩺 + Record Bedside Observation
                    </button>
                  </div>

                  {vitals.history?.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "40px", border: "1px dashed var(--line)", borderRadius: "18px" }}>
                      <span className="empty-icon">🩺</span>
                      <h4>No Vital Observations Recorded</h4>
                      <p>No bedside observations on file for this patient.</p>
                    </div>
                  ) : (
                    <div className="upm-card" style={{ padding: 0, overflow: "hidden" }}>
                      <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f8faf9", borderBottom: "1px solid var(--line)" }}>
                            <th style={{ textAlign: "left", padding: "10px 14px" }}>Timestamp</th>
                            <th style={{ textAlign: "left", padding: "10px 14px" }}>Source</th>
                            <th style={{ textAlign: "left", padding: "10px 14px" }}>HR</th>
                            <th style={{ textAlign: "left", padding: "10px 14px" }}>BP</th>
                            <th style={{ textAlign: "left", padding: "10px 14px" }}>RR</th>
                            <th style={{ textAlign: "left", padding: "10px 14px" }}>Temp</th>
                            <th style={{ textAlign: "left", padding: "10px 14px" }}>SpO₂</th>
                            <th style={{ textAlign: "left", padding: "10px 14px" }}>MEWS</th>
                            <th style={{ textAlign: "left", padding: "10px 14px" }}>Staff</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vitals.history.map((v) => {
                            const mews = v.mews_score || 0;
                            return (
                              <tr key={v.vital_id || v.recorded_at} style={{ borderBottom: "1px solid #edf2f0" }}>
                                <td style={{ padding: "10px 14px" }}><strong>{formatTimestamp(v.recorded_at)}</strong></td>
                                <td style={{ padding: "10px 14px" }}><span className="upm-chip" style={{ background: "#f0f4f2" }}>{v.observation_source}</span></td>
                                <td style={{ padding: "10px 14px" }}><strong>{v.heart_rate} bpm</strong></td>
                                <td style={{ padding: "10px 14px" }}><strong>{v.blood_pressure_sys}/{v.blood_pressure_dia || 80}</strong></td>
                                <td style={{ padding: "10px 14px" }}><strong>{v.respiratory_rate} /min</strong></td>
                                <td style={{ padding: "10px 14px" }}><strong>{v.temperature} °C</strong></td>
                                <td style={{ padding: "10px 14px" }}><strong>{v.oxygen_saturation}%</strong></td>
                                <td style={{ padding: "10px 14px" }}>
                                  <span className={`upm-chip ${mews >= 5 ? "upm-chip-icu" : mews >= 3 ? "upm-chip-opd" : "upm-chip-bed"}`}>
                                    {mews} pts
                                  </span>
                                </td>
                                <td style={{ padding: "10px 14px", color: "var(--ink-soft)" }}>{v.recorded_by_staff_id || "Staff"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 6: MEWS ASSESSMENTS                                       */}
              {/* ============================================================= */}
              {activeTab === "mews" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, color: "var(--teal-deep)" }}>
                    Standardized MEWS Scoring Assessments (Subbe 2001) ({mewsAssessments.length})
                  </h3>

                  {mewsAssessments.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "40px", border: "1px dashed var(--line)", borderRadius: "18px" }}>
                      <span className="empty-icon">⚡</span>
                      <h4>No MEWS Assessments On File</h4>
                      <p>Record a bedside vital sign to compute early warning deterioration points.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {mewsAssessments.map((m) => (
                        <div key={m.assessment_id} className="upm-card" style={{ padding: "16px 20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong style={{ fontSize: "15px", color: "var(--teal-deep)" }}>
                                Assessment #{m.assessment_id} — Total MEWS: {m.total_score} pts
                              </strong>
                              <span className={`upm-chip ${m.total_score >= 5 ? "upm-chip-icu" : m.total_score >= 3 ? "upm-chip-opd" : "upm-chip-bed"}`} style={{ marginLeft: "10px" }}>
                                {m.clinical_risk_level?.toUpperCase() || "STABLE"}
                              </span>
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>{formatTimestamp(m.calculated_at)}</span>
                          </div>

                          <div style={{ display: "flex", gap: "14px", marginTop: "10px", flexWrap: "wrap", fontSize: "12px" }}>
                            <span>HR: <strong>+{m.hr_score}</strong></span>
                            <span>BP: <strong>+{m.bp_score}</strong></span>
                            <span>RR: <strong>+{m.rr_score}</strong></span>
                            <span>Temp: <strong>+{m.temp_score}</strong></span>
                            <span>SpO₂: <strong>+{m.spo2_score}</strong></span>
                          </div>

                          <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--ink-soft)" }}>
                            Ruleset: <em>{m.ruleset_version || "MEWS-UK-2001-v1"}</em> • Vital ID: #{m.vital_id}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="disclaimer-banner" style={{ margin: 0, padding: "10px 14px", fontSize: "11px" }}>
                    <span className="disclaimer-icon">ℹ️</span>
                    <div>
                      <strong>Clinical Decision Support Notice:</strong> MEWS scores are screening aids for physiological trend awareness. They do NOT replace comprehensive clinical judgment.
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 7: ML RISK & EXPLAINABLE AI                               */}
              {/* ============================================================= */}
              {activeTab === "ml_risk" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ margin: 0, color: "var(--teal-deep)" }}>
                        Machine Learning Deterioration Assessments & XAI ({mlAssessments.length})
                      </h3>
                      <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                        Algorithmic deterioration probability with feature attribution.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="upm-btn-primary"
                      onClick={() => setActiveSubModal("xai")}
                    >
                      🧠 + Run New Model Assessment
                    </button>
                  </div>

                  {mlAssessments.length === 0 ? (
                    <div className="staff-empty-state" style={{ padding: "40px", border: "1px dashed var(--line)", borderRadius: "18px" }}>
                      <span className="empty-icon">🧠</span>
                      <h4>No ML Risk Assessments Evaluated</h4>
                      <p>Run a machine learning deterioration prediction to evaluate algorithmic risk.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {mlAssessments.map((ml) => {
                        const riskPct = Math.round((ml.predicted_risk || 0) * 100);
                        return (
                          <div key={ml.assessment_id} className="upm-card" style={{ padding: "16px 20px" }}>
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
                                />
                              </div>
                            </div>

                            {ml.explanations && ml.explanations.length > 0 && (
                              <div style={{ marginTop: "10px", padding: "10px 14px", background: "#f8faf9", borderRadius: "10px", border: "1px solid var(--line)" }}>
                                <strong style={{ fontSize: "12px", color: "var(--teal-deep)" }}>
                                  Contributing Physiological Factors (XAI):
                                </strong>
                                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--ink)", lineHeight: 1.45 }}>
                                  {ml.explanations[0].contributing_factors || ml.explanations[0].disclaimer}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="disclaimer-banner" style={{ margin: 0, padding: "10px 14px", fontSize: "11px" }}>
                    <span className="disclaimer-icon">ℹ️</span>
                    <div>
                      <strong>Rule 12 Synthetic Training Data Notice:</strong> Predictive models are trained on synthetic cohorts and provide screening guidance only.
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 8: HOSPITAL CARE, BEDS & TRANSFERS                        */}
              {/* ============================================================= */}
              {activeTab === "hospital_care" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, color: "var(--teal-deep)" }}>
                    Hospital Inpatient Care, Bed Allocation & Inter-Hospital Transfers
                  </h3>

                  {/* ACTIVE BED CARD */}
                  <div className="upm-card" style={{ padding: "18px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>Current Bed Allocation</strong>
                      {activeBed && (
                        <button
                          type="button"
                          className="upm-btn-secondary"
                          onClick={() => {
                            if (onActionTrigger) onActionTrigger("bed", activePatientForModals);
                            else setActiveSubModal("bed");
                          }}
                        >
                          Manage Bed
                        </button>
                      )}
                    </div>
                    {activeBed ? (
                      <div style={{ marginTop: "10px", fontSize: "13px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                        <div>Bed Number: <strong>{activeBed.bed_number}</strong> ({activeBed.bed_type?.toUpperCase()})</div>
                        <div>Ward: <strong>{activeBed.ward}</strong></div>
                        <div>Assigned At: <strong>{formatTimestamp(activeBed.assigned_at)}</strong></div>
                      </div>
                    ) : (
                      <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                        Patient is currently outpatient (no inpatient bed assigned).
                      </p>
                    )}
                  </div>

                  {/* CARE PLANS */}
                  <div className="upm-card" style={{ padding: "18px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>
                        Personalized Inpatient Care Plans ({carePlans.length})
                      </strong>
                      <button
                        type="button"
                        className="upm-btn-secondary"
                        onClick={() => setActiveSubModal("carePlans")}
                      >
                        + Create Plan
                      </button>
                    </div>
                    {carePlans.length === 0 ? (
                      <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                        No care directives created yet.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                        {carePlans.map((cp) => (
                          <div key={cp.plan_id} style={{ padding: "12px 14px", background: "#f8faf9", borderRadius: "10px", border: "1px solid var(--line)" }}>
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
                  <div className="upm-card" style={{ padding: "18px 22px" }}>
                    <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>
                      Inter-Hospital Transfer History ({transfers.length})
                    </strong>
                    {transfers.length === 0 ? (
                      <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                        No transfers initiated for this patient.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                        {transfers.map((tr) => (
                          <div key={tr.transfer_id} style={{ padding: "12px 14px", background: "#f8faf9", borderRadius: "10px", border: "1px solid var(--line)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <strong>Destination: {tr.to_hospital_name} ({tr.distance_km} km)</strong>
                              <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>Status: <strong>{tr.status}</strong> • {formatTimestamp(tr.created_at)}</span>
                            </div>
                            <div style={{ fontSize: "12px", marginTop: "4px" }}>
                              Bed: <strong>{tr.bed_type_needed}</strong> • Specialization: <strong>{tr.specialization}</strong> • Transfer Score: <strong>{tr.transfer_score}/100</strong>
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
        </main>

        {/* ================================================================= */}
        {/* SLIM FOOTER                                                       */}
        {/* ================================================================= */}
        <footer className="upm-footer">
          <div className="upm-footer-id">
            Clinical Record: <code>{patient.patient_id}</code> • Unified Profile Engine v4.0
          </div>
          <button type="button" className="upm-btn-secondary" onClick={onClose}>
            Close Profile
          </button>
        </footer>
      </div>

      {/* ================================================================= */}
      {/* SUB-MODALS OVERLAY (All 5 preserved without navigating away)       */}
      {/* ================================================================= */}
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
