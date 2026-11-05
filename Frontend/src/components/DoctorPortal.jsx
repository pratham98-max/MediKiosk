import React, { useState, useEffect, useCallback } from "react";
import MedicalTimeline from "./MedicalTimeline";
import { parseMarkdownSections, renderMarkdownBody } from "../utils/markdownRenderer";

export default function DoctorPortal({
  apiBase,
  currentDoctor,
  onDoctorLogin,
  onDoctorLogout,
  onSwitchToPatient,
}) {
  // =========================
  // AUTH STATES (if not logged in)
  // =========================
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // =========================
  // QUEUE & PATIENT DATA
  // =========================
  const [queue, setQueue] = useState([]);
  const [queueFilter, setQueueFilter] = useState("my"); // "my" | "all"
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState("");

  // OTP Entry Bar
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  // New state for pending patient awaiting OTP verification
  const [pendingPatient, setPendingPatient] = useState(null);

  // Active Patient Clinical Package
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("context"); // "context" | "interview" | "documents" | "contradictions" | "notes"

  // Consultation Notes & Complete
  const [doctorNotes, setDoctorNotes] = useState("");
  const [completingConsultation, setCompletingConsultation] = useState(false);
  const [savingRemark, setSavingRemark] = useState(false);
  const [remarkSaved, setRemarkSaved] = useState(false);
  const [consultationSuccess, setConsultationSuccess] = useState("");

  // Doctor Editable Clinical Context & Current Hospital EMR
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [editedReport, setEditedReport] = useState("");
  const [savingEditedReport, setSavingEditedReport] = useState(false);
  const [confirmingEmr, setConfirmingEmr] = useState(false);
  const [emrStoredSuccess, setEmrStoredSuccess] = useState("");
  const [externalHistory, setExternalHistory] = useState(null);
  const [loadingExternalHistory, setLoadingExternalHistory] = useState(false);

  // Seeded doctor profiles for instant 1-click login
  const DEMO_DOCTORS = [
    {
      name: "Dr. Priya Sharma",
      email: "dr.priya@hospital.com",
      department: "General Medicine",
      specialty: "Internal Medicine & General Physician",
      room: "OPD Room 105",
    },
    {
      name: "Dr. Rajesh Gupta",
      email: "dr.rajesh@hospital.com",
      department: "Cardiology",
      specialty: "Interventional Cardiology & Heart Health",
      room: "OPD Room 102",
    },
    {
      name: "Dr. Arvind Patel",
      email: "dr.arvind@hospital.com",
      department: "Orthopedics",
      specialty: "Joints, Bones & Sports Injury",
      room: "OPD Room 204",
    },
    {
      name: "Dr. Sunita Kulkarni",
      email: "dr.sunita@hospital.com",
      department: "Pediatrics",
      specialty: "Child Health & Adolescent Care",
      room: "OPD Room 210",
    },
    {
      name: "Dr. Manoj Verma",
      email: "dr.manoj@hospital.com",
      department: "ENT (Ear, Nose, Throat)",
      specialty: "Head & Neck Specialist",
      room: "OPD Room 301",
    },
    {
      name: "Dr. Ananya Nair",
      email: "dr.ananya@hospital.com",
      department: "Dermatology",
      specialty: "Skin, Hair & Allergy Specialist",
      room: "OPD Room 308",
    },
  ];

  // =========================
  // FETCH QUEUE
  // =========================
  const fetchQueue = useCallback(async () => {
    if (!currentDoctor) return;
    setQueueLoading(true);
    setQueueError("");
    try {
      const res = await fetch(`${apiBase}/doctor/queue`);
      if (!res.ok) throw new Error("Unable to fetch OPD queue");
      const data = await res.json();
      if (data.success) {
        setQueue(data.queue || []);
      } else {
        setQueueError(data.error || "Failed to load queue");
      }
    } catch (err) {
      console.error("Queue fetch error:", err);
      setQueueError("Unable to connect to hospital queue server.");
    } finally {
      setQueueLoading(false);
    }
  }, [apiBase, currentDoctor]);

  useEffect(() => {
    if (currentDoctor) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 15000); // 15s auto-refresh
      return () => clearInterval(interval);
    }
  }, [currentDoctor, fetchQueue]);

  // =========================
  // DOCTOR LOGIN
  // =========================
  const handleDoctorLogin = async (e, customEmail = null) => {
    if (e) e.preventDefault();
    setAuthError("");
    const emailToUse = customEmail || loginEmail;
    const passwordToUse = customEmail ? "doctor123" : loginPassword;

    if (!emailToUse.trim()) {
      setAuthError("Please enter your doctor email or name");
      return;
    }
    if (!passwordToUse) {
      setAuthError("Please enter your password");
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${apiBase}/doctor/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: emailToUse.trim(),
          password: passwordToUse,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Doctor authentication failed");
      }
      onDoctorLogin(data.doctor);
    } catch (err) {
      setAuthError(err.message || "Failed to connect to backend");
    } finally {
      setAuthLoading(false);
    }
  };

  // =========================
  // VERIFY PATIENT BY OTP / ADMIT PATIENT
  // =========================
  const handleVerifyOtp = async (code = null) => {
    const otpToVerify = (typeof code === "string" ? code : otpInput).trim();
    if (!otpToVerify) {
      setOtpError("Please enter a valid 6-digit OTP code");
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    setConsultationSuccess("");
    setEmrStoredSuccess("");

    try {
      const payload = {
        doctor_id: currentDoctor?.id ? String(currentDoctor.id) : "doc-1",
        otp_code: otpToVerify,
      };
      if (pendingPatient?.session_id) {
        payload.session_id = pendingPatient.session_id;
      }

      const res = await fetch(`${apiBase}/doctor/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Success: Unlock patient package!
        setActiveSession({
          session: data.session,
          messages: data.messages || [],
          documents: data.documents || [],
          contradictions: data.contradictions || [],
        });
        setPendingPatient(null);
        setOtpInput("");
        setEditedReport(data.session?.doctor_edited_report || data.session?.final_report || "");
        setDoctorNotes(data.session?.doctor_notes || "");
        loadExternalHistory(data.session?.session_id);
        fetchQueue();
      } else {
        setOtpError(data.error || "Invalid or expired OTP token. Please check patient's screen.");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setOtpError("Network error verifying OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyPatientOtp = handleVerifyOtp;

  // Directly load patient clinical session
  const handleSelectPatientFromQueue = async (patientItem) => {
    // Instead of loading the patient directly, set as pending for OTP verification
    setPendingPatient(patientItem);
    setOtpError("");
    setConsultationSuccess("");
    setEmrStoredSuccess("");
    // Clear any existing active session data
    setActiveSession(null);
    // Optionally focus OTP input (UI can handle)
  };

  // Fetch consented external EMR history & timeline
  const loadExternalHistory = async (sessionId) => {
    if (!sessionId) return;
    setLoadingExternalHistory(true);
    try {
      const res = await fetch(`${apiBase}/session/${sessionId}/external-history`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.consented) {
          setExternalHistory(data);
        } else {
          setExternalHistory(null);
        }
      }
    } catch (err) {
      console.error("External history load error:", err);
      setExternalHistory(null);
    } finally {
      setLoadingExternalHistory(false);
    }
  };

  // =========================
  // DOCTOR EDIT CLINICAL CONTEXT (WITHOUT AI)
  // =========================
  const handleSaveEditedContext = async () => {
    if (!activeSession?.session?.session_id) return;
    setSavingEditedReport(true);
    try {
      const res = await fetch(`${apiBase}/doctor/save-edited-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.session.session_id,
          edited_report: editedReport,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveSession((prev) => ({
          ...prev,
          session: {
            ...prev.session,
            doctor_edited_report: editedReport,
          },
        }));
        setIsEditingContext(false);
      } else {
        alert(data.error || "Failed to save edited clinical context.");
      }
    } catch (err) {
      console.error("Save edit report error:", err);
      alert("Network error saving edits.");
    } finally {
      setSavingEditedReport(false);
    }
  };

  // =========================
  // CONFIRM & STORE IN CURRENT HOSPITAL EMR
  // =========================
  const handleConfirmAndStoreEMR = async () => {
    if (!activeSession?.session?.session_id) return;
    setConfirmingEmr(true);
    setEmrStoredSuccess("");
    try {
      const finalContent = editedReport.trim() || activeSession.session?.final_report || "";
      const res = await fetch(`${apiBase}/doctor/confirm-emr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.session.session_id,
          hospital_id: activeSession.session.hospital_id || "hosp-medikiosk",
          doctor_name: currentDoctor?.name || "Dr. Attending Physician",
          confirmed_report: finalContent,
          notes: doctorNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmrStoredSuccess(
          `✓ Successfully Confirmed & Committed to ${data.hospital_name || "Current Hospital"} EMR (Record ID: ${data.record_id})`
        );
        setActiveSession((prev) => ({
          ...prev,
          session: {
            ...prev.session,
            emr_stored: 1,
            status: "completed",
            doctor_edited_report: finalContent,
          },
        }));
        setIsEditingContext(false);
        fetchQueue();
      } else {
        alert(data.error || "Failed to confirm and commit to hospital EMR.");
      }
    } catch (err) {
      console.error("Confirm EMR error:", err);
      alert("Network error confirming hospital EMR record.");
    } finally {
      setConfirmingEmr(false);
    }
  };

  // =========================
  // SAVE REMARKS (without completing)
  // =========================
  const handleSaveRemark = async () => {
    if (!activeSession?.session?.session_id) return;
    setSavingRemark(true);
    setRemarkSaved(false);
    try {
      const res = await fetch(`${apiBase}/doctor/save-remark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.session.session_id,
          doctor_notes: doctorNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRemarkSaved(true);
        setActiveSession((prev) => ({
          ...prev,
          session: { ...prev.session, doctor_notes: doctorNotes },
        }));
        setTimeout(() => setRemarkSaved(false), 3000);
      } else {
        alert(data.error || "Failed to save remarks.");
      }
    } catch (err) {
      console.error("Save remark error:", err);
      alert("Network error while saving remarks.");
    } finally {
      setSavingRemark(false);
    }
  };

  // =========================
  // COMPLETE CONSULTATION
  // =========================
  const handleCompleteConsultation = async () => {
    if (!activeSession?.session?.session_id) return;
    setCompletingConsultation(true);
    try {
      const res = await fetch(`${apiBase}/doctor/complete-consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.session.session_id,
          doctor_notes: doctorNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConsultationSuccess("Consultation completed and saved successfully!");
        setActiveSession((prev) => ({
          ...prev,
          session: {
            ...prev.session,
            status: "completed",
            doctor_notes: doctorNotes,
          },
        }));
        fetchQueue();
      } else {
        alert(data.error || "Failed to complete consultation.");
      }
    } catch (err) {
      console.error("Complete consultation error:", err);
      alert("Network error while completing consultation.");
    } finally {
      setCompletingConsultation(false);
    }
  };

  // =========================================================
  // RENDER 1: DOCTOR AUTH SCREEN (IF NOT LOGGED IN)
  // =========================================================
  if (!currentDoctor) {
    return (
      <div className="doctor-portal-auth-container">
        <div className="doctor-auth-card">
          <div className="doc-auth-header">
            <div className="doc-auth-icon">🩺</div>
            <h2>Doctor & Clinical Staff Portal</h2>
            <p className="doc-auth-subtitle">
              Hospital OPD Triage & Clinical Decision Support System
            </p>
          </div>

          {authError && <div className="doc-alert doc-alert-error">{authError}</div>}

          {/* Regular Login Form */}
          <form onSubmit={handleDoctorLogin} className="doc-auth-form">
            <div className="form-group">
              <label>Doctor Email or Name</label>
              <input
                type="text"
                placeholder="e.g. dr.priya@hospital.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={authLoading}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={authLoading}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-doc-login"
              disabled={authLoading}
            >
              {authLoading ? "Authenticating..." : "Sign In to Clinical Portal →"}
            </button>
          </form>

          <div className="doc-auth-divider">
            <span>OR ONE-CLICK CLINICIAN DEMO ACCESS</span>
          </div>

          {/* Quick Demo Doctor Cards */}
          <div className="demo-doctors-grid">
            {DEMO_DOCTORS.map((doc, idx) => (
              <button
                key={idx}
                type="button"
                className="demo-doctor-chip"
                onClick={() => handleDoctorLogin(null, doc.email)}
                disabled={authLoading}
                title={`Sign in as ${doc.name}`}
              >
                <span className="demo-doc-icon">👨‍⚕️</span>
                <div className="demo-doc-text">
                  <strong>{doc.name}</strong>
                  <span className="demo-doc-dept">{doc.department}</span>
                  <span className="demo-doc-room">{doc.room}</span>
                </div>
                <span className="demo-arrow">→</span>
              </button>
            ))}
          </div>

          <div className="doc-auth-footer">
            <button
              type="button"
              className="btn-switch-to-patient"
              onClick={onSwitchToPatient}
            >
              ← Switch back to Patient Self-Check-in Kiosk
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered Queue
  const filteredQueue = queue.filter((p) => {
    if (queueFilter === "all") return true;
    // Default "my": match doctor name or department
    return (
      (p.doctor_name && p.doctor_name.toLowerCase().includes(currentDoctor.name.toLowerCase())) ||
      (p.department && p.department.toLowerCase() === currentDoctor.department.toLowerCase())
    );
  });

  const waitingCount = filteredQueue.filter((p) => p.status === "ready_for_opd").length;
  const inConsultCount = filteredQueue.filter((p) => p.status === "in_consultation").length;
  const completedCount = filteredQueue.filter((p) => p.status === "completed").length;

  // =========================================================
  // RENDER 2: ACTIVE DOCTOR WORKSTATION & OPD CLINIC
  // =========================================================
  return (
    <div className="doctor-workstation-container">
      {/* Top Clinical Header Bar */}
      <div className="doc-workstation-bar">
        <div className="doc-profile-info">
          <div className="doc-avatar">🩺</div>
          <div className="doc-titles">
            <h2>{currentDoctor.name}</h2>
            <div className="doc-badges-row">
              <span className="doc-dept-badge">{currentDoctor.department}</span>
              <span className="doc-room-badge">{currentDoctor.room || "OPD Room"}</span>
              <span className="doc-specialty-badge">{currentDoctor.specialty}</span>
            </div>
          </div>
        </div>

        <div className="doc-header-actions">
          <button
            type="button"
            className="btn-refresh-queue"
            onClick={fetchQueue}
            disabled={queueLoading}
            title="Refresh OPD Queue"
          >
            🔄 {queueLoading ? "Refreshing..." : "Refresh Queue"}
          </button>
          <button
            type="button"
            className="btn-doc-logout"
            onClick={onDoctorLogout}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* OPD Queue Metric Highlights */}
      <div className="doc-metrics-row">
        <div className="metric-card metric-waiting">
          <span className="metric-num">{waitingCount}</span>
          <span className="metric-label">Waiting for Doctor</span>
        </div>
        <div className="metric-card metric-active">
          <span className="metric-num">{inConsultCount}</span>
          <span className="metric-label">In Consultation</span>
        </div>
        <div className="metric-card metric-done">
          <span className="metric-num">{completedCount}</span>
          <span className="metric-label">Completed Today</span>
        </div>
      </div>

      {/* Quick OTP Patient Unlock Bar */}
      <div className="otp-unlock-card">
        <div className="otp-unlock-intro">
          <div className="otp-icon">🔑</div>
          <div>
            <h3>Patient In Front of You? Verify 6-Digit OTP Token</h3>
            <p>
              Ask patient for their MediKiosk 6-digit check-in code to unlock their full clinical
              pre-triage package:
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyOtp(otpInput);
          }}
          className="otp-unlock-form"
        >
          <div className="otp-input-group">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              placeholder="e.g. 849201"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
              disabled={otpLoading}
              className="otp-code-input"
            />
            <button
              type="submit"
              className="btn-unlock-otp"
              disabled={otpLoading || otpInput.trim().length < 4}
            >
              {otpLoading ? "Verifying..." : "Unlock & Open Patient File 🔓"}
            </button>
          </div>
          {otpError && <div className="otp-error-msg">{otpError}</div>}
        </form>
      </div>

      {/* Main Split: Queue List vs Active Patient Dossier */}
      <div className="doc-main-layout">
        {/* LEFT COLUMN: LIVE OPD QUEUE */}
        <div className="doc-queue-panel">
          <div className="queue-panel-header">
            <h3>📋 OPD Patient Queue</h3>
            <div className="queue-filter-tabs">
              <button
                type="button"
                className={`queue-filter-btn ${queueFilter === "my" ? "active" : ""}`}
                onClick={() => setQueueFilter("my")}
              >
                My Queue ({filteredQueue.length})
              </button>
              <button
                type="button"
                className={`queue-filter-btn ${queueFilter === "all" ? "active" : ""}`}
                onClick={() => setQueueFilter("all")}
              >
                Hospital All ({queue.length})
              </button>
            </div>
          </div>

          {queueLoading && queue.length === 0 ? (
            <div className="queue-loading">Loading live patient queue...</div>
          ) : filteredQueue.length === 0 ? (
            <div className="queue-empty">
              <span className="empty-icon">🛋️</span>
              <p>No patients currently waiting in this queue.</p>
              <span className="empty-sub">
                Patients will appear here automatically as they finish intake on the kiosk.
              </span>
            </div>
          ) : (
            <div className="queue-list">
              {filteredQueue.map((item, idx) => {
                const isSelected = activeSession?.session?.session_id === item.session_id;
                const isConsulting = item.status === "in_consultation";
                const isDone = item.status === "completed";

                return (
                  <div
                    key={idx}
                    className={`queue-card ${isSelected ? "selected" : ""} ${
                      isConsulting ? "status-consulting" : isDone ? "status-done" : ""
                    }`}
                    onClick={() => { setPendingPatient(item); setActiveSession(null); setOtpError(""); setConsultationSuccess(""); setEmrStoredSuccess(""); }}
                  >
                    <div className="queue-card-top">
                      <span
                        className={`queue-status-pill ${
                          isDone
                            ? "pill-done"
                            : isConsulting
                            ? "pill-consulting"
                            : "pill-ready"
                        }`}
                      >
                        {isDone
                          ? "✓ Completed"
                          : isConsulting
                          ? "🩺 In Progress"
                          : "🟢 Ready for OPD"}
                      </span>
                    </div>

                    <div className="queue-patient-name">
                      {item.patient_name || "Patient Intake"}
                    </div>

                    <div className="queue-patient-demographics">
                      {item.age && <span>{item.age} yrs</span>}
                      {item.gender && <span>• {item.gender}</span>}
                      {item.language && <span>• Lang: {item.language.toUpperCase()}</span>}
                    </div>

                    {item.department && (
                      <div className="queue-dept-tag">Dept: {item.department}</div>
                    )}

                    <div className="queue-card-footer">
                      <span className="queue-time">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                      <button
                        type="button"
                        className="btn-select-patient"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingPatient(item);
                          setActiveSession(null);
                          setOtpError("");
                          setConsultationSuccess("");
                          setEmrStoredSuccess("");
                        }}
                      >
                        {isSelected ? "Active Dossier" : "Examine File →"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACTIVE PATIENT CLINICAL WORKSPACE */}
        <div className="doc-dossier-panel">
          {sessionLoading ? (
            <div className="dossier-loading">
              <div className="loading-spinner"></div>
              <p>Opening Patient Clinical Package...</p>
            </div>
          ) : !activeSession ? (
            <div className="dossier-placeholder">
              <span className="dossier-icon">📂</span>
              <h3>No Patient File Selected</h3>
              <p>
                Select a patient from the OPD Queue on the left, or enter their 6-digit OTP code
                above to open their AI pre-triage dossier.
              </p>
            </div>
          ) : (
            <div className="dossier-content">
              {/* Dossier Header */}
              <div className="dossier-header-card">
                <div className="dossier-header-top">
                  <div>
                    <div className="dossier-tag">PATIENT CLINICAL DOSSIER</div>
                    <h2>{activeSession.session?.patient_name || "Registered Patient"}</h2>
                    <div className="dossier-meta-chips">
                      {activeSession.session?.age && (
                        <span className="chip">
                          <strong>Age:</strong> {activeSession.session.age} yrs
                        </span>
                      )}
                      {activeSession.session?.gender && (
                        <span className="chip">
                          <strong>Gender:</strong> {activeSession.session.gender}
                        </span>
                      )}
                      {activeSession.session?.phone && (
                        <span className="chip">
                          <strong>Phone:</strong> {activeSession.session.phone}
                        </span>
                      )}
                      <span
                        className={`status-pill ${
                          activeSession.session?.status === "completed"
                            ? "pill-done"
                            : "pill-consulting"
                        }`}
                      >
                        Status: {activeSession.session?.status}
                      </span>
                    </div>
                  </div>

                  <div className="dossier-header-buttons">
                    <button
                      type="button"
                      className="btn-close-dossier"
                      onClick={() => setActiveSession(null)}
                    >
                      Close File ✕
                    </button>
                  </div>
                </div>

                {consultationSuccess && (
                  <div className="doc-alert doc-alert-success">{consultationSuccess}</div>
                )}

                {/* Dossier Navigation Tabs */}
                <div className="dossier-tabs">
                  <button
                    type="button"
                    className={`dossier-tab ${activeTab === "context" ? "active" : ""}`}
                    onClick={() => setActiveTab("context")}
                  >
                    📑 Doctor-Ready Clinical Context
                  </button>
                  <button
                    type="button"
                    className={`dossier-tab ${activeTab === "contradictions" ? "active" : ""}`}
                    onClick={() => setActiveTab("contradictions")}
                  >
                    🔍 Contradiction Audit (
                    {activeSession.contradictions?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`dossier-tab ${activeTab === "interview" ? "active" : ""}`}
                    onClick={() => setActiveTab("interview")}
                  >
                    💬 AI Pre-Triage Transcript (
                    {activeSession.messages?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`dossier-tab ${activeTab === "documents" ? "active" : ""}`}
                    onClick={() => setActiveTab("documents")}
                  >
                    📄 OCR Documents ({activeSession.documents?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`dossier-tab ${activeTab === "notes" ? "active" : ""}`}
                    onClick={() => setActiveTab("notes")}
                  >
                    ✍️ Clinical Notes & Disposition
                  </button>
                </div>
              </div>

              {/* TAB 1: DOCTOR-READY CLINICAL CONTEXT */}
              {activeTab === "context" && (
                <div className="dossier-body-tab">
                  {/* Action Bar: Edit vs Save vs Confirm in EMR */}
                  <div className="clinical-context-toolbar">
                    <div className="toolbar-left">
                      <span className="toolbar-label">
                        <strong>AI Clinical Draft:</strong>{" "}
                        {activeSession.session?.emr_stored === 1 ? (
                          <span className="badge-emr-confirmed">✓ Doctor Confirmed & Stored in Hospital EMR</span>
                        ) : activeSession.session?.doctor_edited_report ? (
                          <span className="badge-doctor-edited">✏️ Doctor Edited Draft</span>
                        ) : (
                          <span className="badge-ai-draft">🤖 AI Synthesized Draft (Needs Doctor Review)</span>
                        )}
                      </span>
                    </div>

                    <div className="toolbar-actions">
                      {!isEditingContext ? (
                        <button
                          type="button"
                          className="btn-edit-context"
                          onClick={() => {
                            setEditedReport(
                              activeSession.session?.doctor_edited_report ||
                              activeSession.session?.final_report ||
                              ""
                            );
                            setIsEditingContext(true);
                          }}
                        >
                          ✏️ Edit Clinical Context
                        </button>
                      ) : (
                        <div className="edit-actions-cluster">
                          <button
                            type="button"
                            className="btn-save-draft"
                            disabled={savingEditedReport}
                            onClick={handleSaveEditedContext}
                          >
                            {savingEditedReport ? "Saving..." : "💾 Save Changes"}
                          </button>
                          <button
                            type="button"
                            className="btn-cancel-edit"
                            onClick={() => setIsEditingContext(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn-confirm-emr"
                        disabled={confirmingEmr}
                        onClick={handleConfirmAndStoreEMR}
                      >
                        {confirmingEmr ? "Committing..." : "🏥 Confirm & Store in EMR"}
                      </button>
                    </div>
                  </div>

                  {emrStoredSuccess && (
                    <div className="doc-alert doc-alert-success emr-success-banner">
                      <span>🏥</span>
                      <span>{emrStoredSuccess}</span>
                    </div>
                  )}

                  {/* Consented External EMR Timeline Display */}
                  {externalHistory && externalHistory.timeline && externalHistory.timeline.length > 0 && (
                    <div className="doctor-external-timeline-container">
                      <MedicalTimeline
                        timeline={externalHistory.timeline}
                        currentHospital={activeSession.session?.hospital_name || "MediKiosk General Hospital"}
                      />
                    </div>
                  )}

                  {/* Red-Flag Notice if detected */}
                  {activeSession.session?.red_flag === 1 && (
                    <div className="doctor-redflag-banner">
                      <span className="rf-bell">🚨</span>
                      <div>
                        <strong>RED-FLAG PRE-TRIAGE ALERT:</strong>{" "}
                        {activeSession.session.red_flag_reason || "Urgent presentation detected during intake."}
                        {activeSession.session.red_flag_acknowledged === 1 && (
                          <span className="rf-sub-ack"> (Staff desk acknowledged)</span>
                        )}
                      </div>
                    </div>
                  )}

                  {isEditingContext ? (
                    /* DOCTOR EDITING MODE — NO AI REQUIRED */
                    <div className="doctor-editing-box">
                      <div className="edit-guidance">
                        <span>ℹ️</span>
                        <span>
                          <strong>Doctor Clinical Authority:</strong> You can modify symptoms, chief complaint, medical history, medications, allergies, timeline, red flags, and external history below. AI will NOT be invoked.
                        </span>
                      </div>
                      <textarea
                        className="doctor-report-textarea"
                        rows={22}
                        value={editedReport}
                        onChange={(e) => setEditedReport(e.target.value)}
                        placeholder="Edit the clinical context..."
                      />
                      <div className="edit-footer-buttons">
                        <button
                          type="button"
                          className="btn-save-draft"
                          disabled={savingEditedReport}
                          onClick={handleSaveEditedContext}
                        >
                          {savingEditedReport ? "Saving Changes..." : "💾 Save Changes"}
                        </button>
                        <button
                          type="button"
                          className="btn-confirm-emr"
                          disabled={confirmingEmr}
                          onClick={handleConfirmAndStoreEMR}
                        >
                          {confirmingEmr ? "Committing..." : "🏥 Confirm & Store in EMR"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* READ-ONLY RENDER OF CURRENT/EDITED REPORT */
                    activeSession.session?.doctor_edited_report || activeSession.session?.final_report ? (
                      <div className="clinical-report-view">
                        <div className="report-callout">
                          <span>💡</span>
                          <p>
                            This synthesized context is derived from the patient's conversational
                            interview, uploaded records, resolved contradictions, and historical external EMRs. Doctor has final authority.
                          </p>
                        </div>

                        {parseMarkdownSections(activeSession.session.doctor_edited_report || activeSession.session.final_report)
                          .map((sec, idx) => {
                            const isTimeline = sec.title.toLowerCase().includes("timeline");
                            return (
                              <div key={idx} className="clinical-section-card">
                                <h4>{sec.title}</h4>
                                {renderMarkdownBody(sec.body, isTimeline)}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="empty-tab-notice">
                        <p>
                          No clinical report generated yet for this session. Review interview and
                          documents directly.
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* TAB 2: CONTRADICTION & CONFLICT AUDIT */}
              {activeTab === "contradictions" && (
                <div className="dossier-body-tab">
                  <div className="tab-explanation">
                    <h3>Cross-Verification & Contradiction Audit</h3>
                    <p>
                      MediKiosk automatically cross-checked the patient's oral responses against
                      their uploaded medical records to surface discrepancies.
                    </p>
                  </div>

                  {!activeSession.contradictions ||
                  activeSession.contradictions.length === 0 ? (
                    <div className="no-contradictions-card">
                      <span className="check-icon">✓</span>
                      <h4>No Clinical Contradictions Detected</h4>
                      <p>
                        The patient's oral statements were consistent with their uploaded
                        documents.
                      </p>
                    </div>
                  ) : (
                    <div className="contradiction-cards-list">
                      {activeSession.contradictions.map((c, i) => (
                        <div key={i} className="audit-card">
                          <div className="audit-card-header">
                            <span className="audit-cat-badge">{c.category}</span>
                            <span
                              className={`audit-status-badge ${
                                c.status === "resolved" ? "status-resolved" : "status-pending"
                              }`}
                            >
                              {c.status === "resolved" ? "✓ Resolved" : "⚠ Pending"}
                            </span>
                          </div>

                          <div className="audit-grid">
                            <div className="audit-box box-patient">
                              <span className="box-title">Patient Claimed:</span>
                              <p>{c.patient_statement}</p>
                            </div>
                            <div className="audit-box box-doc">
                              <span className="box-title">Document Revealed:</span>
                              <p>{c.document_evidence}</p>
                            </div>
                          </div>

                          <div className="audit-clarification">
                            <strong>Clarification Question:</strong>
                            <p>{c.clarification_question}</p>
                            {c.patient_answer && (
                              <div className="audit-patient-ans">
                                <strong>Patient Answer:</strong>
                                <p>{c.patient_answer}</p>
                              </div>
                            )}
                            {c.resolution_summary && (
                              <div className="audit-resolution">
                                <strong>Resolution:</strong>
                                <p>{c.resolution_summary}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AI PRE-TRIAGE INTERVIEW TRANSCRIPT */}
              {activeTab === "interview" && (
                <div className="dossier-body-tab">
                  <div className="tab-explanation">
                    <h3>Pre-Triage Conversational Dialogue</h3>
                    <p>
                      Interview conducted in patient's selected language (
                      {activeSession.session?.language?.toUpperCase() || "EN"}).
                    </p>
                  </div>

                  <div className="doctor-transcript-view">
                    {activeSession.messages && activeSession.messages.length > 0 ? (
                      activeSession.messages.map((m, i) => (
                        <div key={i} className={`transcript-bubble ${m.sender}`}>
                          <span className="transcript-speaker">
                            {m.sender === "ai" ? "🤖 MediKiosk Intake AI" : "👤 Patient"}
                          </span>
                          <div className="transcript-text">{m.message}</div>
                        </div>
                      ))
                    ) : (
                      <p className="no-msgs-note">No interview messages found.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: OCR DOCUMENTS */}
              {activeTab === "documents" && (
                <div className="dossier-body-tab">
                  <div className="tab-explanation">
                    <h3>Uploaded Medical Records & OCR Extraction</h3>
                    <p>Prescriptions, lab reports, and clinical records provided during check-in.</p>
                  </div>

                  {!activeSession.documents || activeSession.documents.length === 0 ? (
                    <div className="empty-tab-notice">
                      <p>No medical documents were uploaded for this consultation.</p>
                    </div>
                  ) : (
                    <div className="doc-cards-list">
                      {activeSession.documents.map((d, i) => (
                        <div key={i} className="uploaded-doc-card">
                          <div className="uploaded-doc-header">
                            <span className="doc-file-icon">📄</span>
                            <strong>{d.filename}</strong>
                            <span className="doc-type-pill">OCR Extracted</span>
                          </div>
                          <div className="extracted-text-area">
                            <pre>{d.extracted_text || "No text extracted from document."}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: DOCTOR NOTES & DISPOSITION */}
              {activeTab === "notes" && (
                <div className="dossier-body-tab">
                  <div className="tab-explanation">
                    <h3>Physician Clinical Notes & Consultation Remarks</h3>
                    <p>
                      Record your diagnosis, examination findings, and prescription. Remarks are
                      saved to the EHR and will be visible to the patient in their history.
                    </p>
                  </div>

                  {/* If already completed, show read-only view with close option */}
                  {activeSession.session?.status === "completed" ? (
                    <div className="consultation-complete-panel">
                      <div className="complete-success-banner">
                        <span className="complete-check">✓</span>
                        <div>
                          <strong>Consultation Completed</strong>
                          <p>Remarks have been saved to the patient's electronic health record.</p>
                        </div>
                      </div>

                      {doctorNotes && (
                        <div className="saved-remarks-view">
                          <label>Saved Clinical Remarks</label>
                          <div className="remarks-readonly-box">{doctorNotes}</div>
                        </div>
                      )}

                      <div className="notes-actions-bar">
                        <button
                          type="button"
                          className="btn-close-session"
                          onClick={() => {
                            setActiveSession(null);
                            setConsultationSuccess("");
                            setDoctorNotes("");
                            setRemarkSaved(false);
                          }}
                        >
                          ✕ Close Session & Return to Queue
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="doctor-notes-form">
                      <label>Physician Clinical Assessment & Treatment Plan</label>
                      <textarea
                        rows={8}
                        placeholder="e.g. Patient presents with 3-day history of acute rhinitis and dry cough. Lungs clear to auscultation bilaterally. Advised symptomatic treatment: Paracetamol 500mg SOS, warm saline gargles, adequate hydration. Follow up in 3 days if fever persists."
                        value={doctorNotes}
                        onChange={(e) => {
                          setDoctorNotes(e.target.value);
                          setRemarkSaved(false);
                        }}
                      ></textarea>

                      {remarkSaved && (
                        <div className="remark-saved-notice">✓ Remarks saved successfully</div>
                      )}

                      <div className="notes-actions-bar">
                        <button
                          type="button"
                          className="btn-save-remark"
                          onClick={handleSaveRemark}
                          disabled={savingRemark || !doctorNotes.trim()}
                          title="Save remarks without closing consultation"
                        >
                          {savingRemark ? "Saving..." : "💾 Save Remarks"}
                        </button>

                        <button
                          type="button"
                          className="btn-save-notes"
                          onClick={handleCompleteConsultation}
                          disabled={completingConsultation}
                        >
                          {completingConsultation
                            ? "Completing..."
                            : "✓ Complete & Close Consultation"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
