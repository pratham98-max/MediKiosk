import React, { useState, useEffect, useCallback } from "react";
import "./patient_care.css";

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
    if (!ts) return "N/A";
    try {
      const d = new Date(ts);
      return d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
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
  const currentMews = clinicalStatus.mews_score || 0;

  // Filter timeline items
  const filteredTimeline = timeline.filter((item) => {
    if (timelineFilter === "all") return true;
    if (timelineFilter === "vitals") return item.category === "vitals" || item.category === "mews";
    if (timelineFilter === "intake") return item.category === "intake_chat" || item.category === "red_flag" || item.category === "registration";
    if (timelineFilter === "documents") return item.category === "document_ocr" || item.category === "contradiction";
    if (timelineFilter === "consult") return item.category === "doctor_consultation" || item.category === "emr";
    if (timelineFilter === "care") return item.category === "care_plan" || item.category === "bed_allocation" || item.category === "transfer";
    return true;
  });

  const selectedSession = conversations.find((s) => s.session_id === selectedSessionId) || conversations[0];

  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div className="pc-modal-window unified-profile-window" style={{ maxWidth: "1050px", width: "95vw", maxHeight: "92vh" }} onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="pc-modal-header" style={{ padding: "16px 24px", background: "var(--paper)", borderBottom: "1px solid var(--line)" }}>
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
                {activeBed && (
                  <span className="pc-bed-type-pill pill-icu" style={{ fontSize: "11px" }}>
                    🛏️ {activeBed.bed_number} ({activeBed.ward})
                  </span>
                )}
              </div>
              <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "2px" }}>
                Hospital Station: <strong>{currentStaff?.hospital_name || "MediKiosk General"}</strong> • Registered: {formatTimestamp(patient.created_at)}
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

        {/* DUAL ALERT BANNER (Rule 9) */}
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

        {/* TOP LEVEL NAVIGATION TABS */}
        <div className="pc-submodal-tabs" style={{ display: "flex", gap: "6px", padding: "10px 24px", borderBottom: "1px solid var(--line)", background: "var(--panel)", overflowX: "auto" }}>
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
        <div className="pc-modal-body" style={{ maxHeight: "calc(92vh - 180px)", overflowY: "auto", padding: "20px 24px" }}>
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
              {/* TAB 1: CLINICAL OVERVIEW */}
              {activeTab === "overview" && (
                <div>
                  {/* KPI CARDS GRID */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    {/* CARD 1: DEMOGRAPHICS */}
                    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", padding: "16px" }}>
                      <div style={{ fontSize: "12px", color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Patient Identity
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--teal-deep)", margin: "6px 0 2px 0" }}>
                        {patient.full_name}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--ink-soft)", lineHeight: 1.5 }}>
                        <div>Phone: <strong>{patient.phone || "Not recorded"}</strong></div>
                        <div>Email: <strong>{patient.email || "Not recorded"}</strong></div>
                        <div>ESI Triage: <strong>Level {patient.triage_level || 3}</strong></div>
                      </div>
                    </div>

                    {/* CARD 2: BED & WARD */}
                    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", padding: "16px" }}>
                      <div style={{ fontSize: "12px", color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Inpatient Location
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: activeBed ? "var(--teal-deep)" : "var(--ink-soft)", margin: "6px 0 2px 0" }}>
                        {activeBed ? `Bed ${activeBed.bed_number}` : "Outpatient (Unassigned)"}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--ink-soft)", lineHeight: 1.5 }}>
                        <div>Ward: <strong>{activeBed ? activeBed.ward : "OPD Queue"}</strong></div>
                        <div>Category: <strong>{activeBed ? activeBed.bed_type.toUpperCase() : "Outpatient"}</strong></div>
                        <div>Discharge Ready: <strong style={{ color: patient.discharge_ready ? "var(--ok)" : "var(--alert)" }}>{patient.discharge_ready ? "✓ Yes" : "No (Monitoring)"}</strong></div>
                      </div>
                    </div>

                    {/* CARD 3: LATEST VITALS */}
                    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", padding: "16px" }}>
                      <div style={{ fontSize: "12px", color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Latest Vitals Snapshot
                      </div>
                      {latestVitals ? (
                        <>
                          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--teal-deep)", margin: "6px 0 2px 0" }}>
                            HR: {latestVitals.heart_rate} bpm • BP: {latestVitals.blood_pressure_sys}/{latestVitals.blood_pressure_dia || 80}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--ink-soft)", lineHeight: 1.5 }}>
                            <div>RR: <strong>{latestVitals.respiratory_rate} /min</strong> • SpO2: <strong>{latestVitals.oxygen_saturation}%</strong></div>
                            <div>Temp: <strong>{latestVitals.temperature}°C</strong> • MEWS: <strong>{latestVitals.mews_score} pts</strong></div>
                            <div>Source: <em>{latestVitals.observation_source}</em></div>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "12px", fontStyle: "italic" }}>
                          No vital observations recorded yet.
                        </div>
                      )}
                    </div>

                    {/* CARD 4: CLINICAL ALERTS */}
                    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", padding: "16px" }}>
                      <div style={{ fontSize: "12px", color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Dual Alert Status
                      </div>
                      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {hasIntakeRf ? (
                          <span className="badge-intake-rf" style={{ fontSize: "11px" }}>🚨 AI Chat Red Flag Active</span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--ok)", fontWeight: 600 }}>✓ AI Intake: No Red Flag</span>
                        )}

                        {hasMewsAlert ? (
                          <span className="badge-mews-alert" style={{ fontSize: "11px" }}>⚡ MEWS Critical ({currentMews} pts)</span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--ok)", fontWeight: 600 }}>✓ MEWS: Stable ({currentMews} pts)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QUICK TIMELINE PREVIEW */}
                  <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", padding: "18px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h4 style={{ margin: 0, color: "var(--teal-deep)" }}>Recent Chronological Clinical Events</h4>
                      <button
                        type="button"
                        className="btn-pc-secondary"
                        onClick={() => setActiveTab("timeline")}
                        style={{ fontSize: "12px", padding: "4px 10px" }}
                      >
                        View Full Timeline ({timeline.length}) →
                      </button>
                    </div>

                    {timeline.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "var(--ink-soft)", fontStyle: "italic" }}>No clinical events recorded.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {timeline.slice(0, 4).map((evt) => (
                          <div key={evt.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "8px 12px", background: "#ffffff", borderRadius: "6px", border: "1px solid var(--line)" }}>
                            <span style={{ fontSize: "16px" }}>
                              {evt.category === "red_flag" ? "🚨" : evt.category === "vitals" ? "🩺" : evt.category === "ml_risk" ? "🧠" : evt.category === "document_ocr" ? "📄" : "📋"}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong style={{ fontSize: "13px", color: "var(--teal-deep)" }}>{evt.title}</strong>
                                <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>{formatTimestamp(evt.timestamp)}</span>
                              </div>
                              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--ink)" }}>{evt.description}</p>
                              <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--ink-soft)" }}>
                                Source: <em>{evt.provenance_label || evt.provenance_source}</em> • Actor: <strong>{evt.actor}</strong>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ACTIVE CARE DIRECTIVES SUMMARY */}
                  <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", padding: "18px" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "var(--teal-deep)" }}>Inpatient Clinical Care Directives</h4>
                    {carePlans.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "var(--ink-soft)", fontStyle: "italic", margin: 0 }}>
                        No inpatient care directives currently on file for this patient.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {carePlans.map((cp) => (
                          <div key={cp.plan_id} style={{ padding: "10px 14px", background: "#ffffff", borderRadius: "6px", border: "1px solid var(--line)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong style={{ fontSize: "13px" }}>Plan #{cp.plan_id} ({cp.status?.toUpperCase() || "ACTIVE"})</strong>
                              <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>{formatTimestamp(cp.created_at)}</span>
                            </div>
                            <p style={{ margin: "4px 0", fontSize: "12px" }}><strong>Instructions:</strong> {cp.care_instructions}</p>
                            {cp.medications && <p style={{ margin: "2px 0", fontSize: "12px" }}><strong>Medications:</strong> {cp.medications}</p>}
                            <div style={{ fontSize: "11px", color: "var(--ink-soft)", marginTop: "4px" }}>
                              Created by staff: <em>{cp.created_by_staff_id || "Desk Nurse"}</em>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: UNIFIED CHRONOLOGICAL TIMELINE */}
              {activeTab === "timeline" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
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
                    <div className="unified-timeline-list" style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", paddingLeft: "10px" }}>
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
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "18px" }}>
                                  {item.category === "red_flag" ? "🚨" : item.category === "vitals" ? "🩺" : item.category === "mews" ? "⚡" : item.category === "ml_risk" ? "🧠" : item.category === "document_ocr" ? "📄" : item.category === "transfer" ? "🚑" : item.category === "bed_allocation" ? "🛏️" : item.category === "care_plan" ? "📋" : item.category === "doctor_consultation" ? "👨‍⚕️" : "👤"}
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

              {/* TAB 3: INTAKE & AI CONVERSATIONS */}
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
                      {/* SESSION SELECTOR TABS */}
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
                          {/* SESSION METADATA */}
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

                          {/* CONVERSATION TRANSCRIPT BUBBLES */}
                          <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px", maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
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

                          {/* CLINICAL SUMMARY & DOCTOR NOTES */}
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

              {/* TAB 4: MEDICAL DOCUMENTS & OCR */}
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

              {/* TAB 5: BEDSIDE VITALS HISTORY */}
              {activeTab === "vitals" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h4 style={{ margin: 0, color: "var(--teal-deep)" }}>
                      Bedside Vital Observations & Parameter Trends ({vitals.history?.length || 0})
                    </h4>
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

              {/* TAB 6: MEWS ASSESSMENTS */}
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

              {/* TAB 7: ML RISK & EXPLAINABLE AI */}
              {activeTab === "ml_risk" && (
                <div>
                  <h4 style={{ margin: "0 0 14px 0", color: "var(--teal-deep)" }}>
                    Machine Learning Deterioration Assessments & XAI Feature Attribution ({mlAssessments.length})
                  </h4>

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

              {/* TAB 8: HOSPITAL CARE, BEDS & TRANSFERS */}
              {activeTab === "hospital_care" && (
                <div>
                  <h4 style={{ margin: "0 0 14px 0", color: "var(--teal-deep)" }}>
                    Hospital Inpatient Care, Bed Allocation & Inter-Hospital Transfers
                  </h4>

                  {/* ACTIVE BED CARD */}
                  <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                    <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>Current Bed Allocation</strong>
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
                    <strong style={{ fontSize: "14px", color: "var(--teal-deep)" }}>
                      Personalized Inpatient Care Plans ({carePlans.length})
                    </strong>
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
                            <div style={{ fontSize: "12px", marginTop: "4px" }}>{cp.care_instructions}</div>
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
        <div className="pc-modal-footer" style={{ padding: "14px 24px", background: "var(--paper)", borderTop: "1px solid var(--line)" }}>
          <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
            Clinical Record: <code>{patient.patient_id}</code> • Unified Profile Engine v4.0
          </div>
          <button type="button" className="btn-pc-secondary" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
