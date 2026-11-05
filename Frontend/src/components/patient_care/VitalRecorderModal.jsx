import React, { useState, useEffect, useCallback } from "react";
import {
  isDemoPatientId,
  recordDemoVitals,
  getDemoPatientUnifiedProfile,
} from "../vital_track/demoPatientsData";

export default function VitalRecorderModal({
  apiBase,
  patient,
  currentStaff,
  onClose,
  onVitalsRecorded,
}) {
  const [activeTab, setActiveTab] = useState("record"); // 'record' | 'history'
  const [heartRate, setHeartRate] = useState(76);
  const [bpSys, setBpSys] = useState(120);
  const [bpDia, setBpDia] = useState(80);
  const [respRate, setRespRate] = useState(16);
  const [temperature, setTemperature] = useState(36.8);
  const [spo2, setSpo2] = useState(98);
  const [observationSource, setObservationSource] = useState("bedside_manual");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [liveMews, setLiveMews] = useState(null);

  // Historical observations state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!patient?.patient_id) return;
    setHistoryLoading(true);
    try {
      if (isDemoPatientId(patient.patient_id)) {
        const demoProf = getDemoPatientUnifiedProfile(patient.patient_id);
        if (demoProf?.vitals?.history) {
          setHistory(demoProf.vitals.history);
        }
        return;
      }
      const res = await fetch(`${apiBase}/staff/patient-care/patients/${patient.patient_id}/vitals/history`);
      const data = await res.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Vitals history fetch error:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [apiBase, patient?.patient_id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Client-side instant MEWS calculation preview (Subbe et al., 2001)
  useEffect(() => {
    let score = 0;
    const breakdown = [];

    // Heart rate
    const hr = Number(heartRate);
    if (hr < 40 || hr > 130) {
      score += 3;
      breakdown.push(`Heart Rate (${hr} bpm): +3 (Critically abnormal)`);
    } else if (hr <= 50 || hr > 110) {
      score += 2;
      breakdown.push(`Heart Rate (${hr} bpm): +2 (Moderately abnormal)`);
    } else if (hr > 100) {
      score += 1;
      breakdown.push(`Heart Rate (${hr} bpm): +1 (Mildly abnormal)`);
    } else {
      breakdown.push(`Heart Rate (${hr} bpm): 0 (Normal)`);
    }

    // Systolic BP
    const sys = Number(bpSys);
    if (sys < 70 || sys > 200) {
      score += 3;
      breakdown.push(`Systolic BP (${sys} mmHg): +3 (Critically abnormal)`);
    } else if (sys <= 80 || sys > 170) {
      score += 2;
      breakdown.push(`Systolic BP (${sys} mmHg): +2 (Moderately abnormal)`);
    } else if (sys <= 90 || sys > 150) {
      score += 1;
      breakdown.push(`Systolic BP (${sys} mmHg): +1 (Mildly abnormal)`);
    } else {
      breakdown.push(`Systolic BP (${sys} mmHg): 0 (Normal)`);
    }

    // Respiratory Rate
    const rr = Number(respRate);
    if (rr < 9 || rr > 30) {
      score += 3;
      breakdown.push(`Respiratory Rate (${rr} bpm): +3 (Critically abnormal)`);
    } else if (rr > 20) {
      score += 2;
      breakdown.push(`Respiratory Rate (${rr} bpm): +2 (Moderately abnormal)`);
    } else if (rr >= 15) {
      score += 1;
      breakdown.push(`Respiratory Rate (${rr} bpm): +1 (Mildly abnormal)`);
    } else {
      breakdown.push(`Respiratory Rate (${rr} bpm): 0 (Normal)`);
    }

    // Temperature
    const temp = Number(temperature);
    if (temp < 35.0 || temp > 38.5) {
      score += 2;
      breakdown.push(`Temperature (${temp}°C): +2 (Abnormal)`);
    } else if (temp >= 38.0) {
      score += 1;
      breakdown.push(`Temperature (${temp}°C): +1 (Mild fever)`);
    } else {
      breakdown.push(`Temperature (${temp}°C): 0 (Normal)`);
    }

    // Oxygen Saturation
    const sat = Number(spo2);
    if (sat < 90) {
      score += 3;
      breakdown.push(`SpO2 (${sat}%): +3 (Severe hypoxemia)`);
    } else if (sat <= 91) {
      score += 2;
      breakdown.push(`SpO2 (${sat}%): +2 (Moderate hypoxemia)`);
    } else if (sat <= 93) {
      score += 1;
      breakdown.push(`SpO2 (${sat}%): +1 (Mild hypoxemia)`);
    } else {
      breakdown.push(`SpO2 (${sat}%): 0 (Normal)`);
    }

    let riskTier = "STABLE";
    if (score >= 6) riskTier = "CRITICAL";
    else if (score >= 4) riskTier = "ELEVATED";
    else if (score >= 2) riskTier = "MONITORING";

    setLiveMews({ score, riskTier, breakdown });
  }, [heartRate, bpSys, respRate, temperature, spo2]);

  // 6-Point Discharge Readiness Evaluation
  const dischargeCriteria = [
    { label: "Heart Rate: 60 - 100 bpm", met: heartRate >= 60 && heartRate <= 100 },
    { label: "Systolic BP: 90 - 140 mmHg", met: bpSys >= 90 && bpSys <= 140 },
    { label: "Respiratory Rate: 12 - 20 bpm", met: respRate >= 12 && respRate <= 20 },
    { label: "Temperature: 36.0 - 37.5 °C", met: temperature >= 36.0 && temperature <= 37.5 },
    { label: "Oxygen Saturation: >= 95%", met: spo2 >= 95 },
    { label: "MEWS Score: <= 2", met: (liveMews ? liveMews.score : 0) <= 2 },
  ];
  const allDischargeMet = dischargeCriteria.every((c) => c.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isDemoPatientId(patient.patient_id)) {
        const recorded = recordDemoVitals(
          patient.patient_id,
          {
            heart_rate: Number(heartRate),
            blood_pressure_sys: Number(bpSys),
            blood_pressure_dia: Number(bpDia),
            respiratory_rate: Number(respRate),
            temperature: Number(temperature),
            oxygen_saturation: Number(spo2),
            observation_source: observationSource,
          },
          currentStaff?.staff_id
        );
        setSuccessMsg(`✓ Vital observation recorded successfully! MEWS: ${recorded.mews_score} points.`);
        if (onVitalsRecorded) {
          onVitalsRecorded({ vitals: recorded, message: "Vital observation recorded" });
        }
        fetchHistory();
        return;
      }

      const res = await fetch(
        `${apiBase}/staff/patient-care/patients/${patient.patient_id}/vitals?hospital_id=${currentStaff?.hospital_id || "hosp-medikiosk"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            heart_rate: Number(heartRate),
            blood_pressure_sys: Number(bpSys),
            blood_pressure_dia: Number(bpDia),
            respiratory_rate: Number(respRate),
            temperature: Number(temperature),
            oxygen_saturation: Number(spo2),
            observation_source: observationSource,
            staff_id: currentStaff?.staff_id,
            session_id: patient.session_id || null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to record vitals");
      }

      setSuccessMsg(`✓ Vital observation recorded successfully! MEWS: ${data.vitals?.mews_score ?? liveMews?.score} points.`);
      if (onVitalsRecorded) {
        onVitalsRecorded(data);
      }
      fetchHistory();
    } catch (err) {
      console.error("Vitals recording error:", err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatSourceLabel = (src) => {
    if (src === "bedside_manual") return "Bedside Manual";
    if (src === "ad8232_simulation") return "AD8232 Sim";
    if (src === "triage_intake") return "Triage Intake";
    return src || "Bedside";
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "N/A";
    try {
      const d = new Date(ts);
      return d.toLocaleString([], {
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

  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div className="pc-modal-window" style={{ maxWidth: "880px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div className="pc-modal-header" style={{ flexShrink: 0 }}>
          <h3>
            <span>🩺</span> Bedside Vital Signs & MEWS — {patient.full_name || patient.patient_name}
          </h3>
          <button type="button" className="btn-pc-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* SUB-MODAL TABS (RECORD VS HISTORY) */}
        <div style={{ display: "flex", gap: "8px", padding: "12px 24px", borderBottom: "1px solid var(--line)", background: "var(--paper)", flexShrink: 0 }}>
          <button
            type="button"
            className={`filter-tab ${activeTab === "record" ? "active" : ""}`}
            onClick={() => setActiveTab("record")}
          >
            ➕ Record Bedside Vitals
          </button>
          <button
            type="button"
            className={`filter-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => { setActiveTab("history"); fetchHistory(); }}
          >
            📜 Observation History & Trends ({history.length})
          </button>
        </div>

        {activeTab === "record" ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
            <div className="pc-modal-body" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {error && (
                <div className="doc-auth-alert doc-alert-danger">
                  <span>⚠️</span> <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="doc-auth-alert doc-alert-success" style={{ background: "#e0efe6", color: "#25603f", border: "1px solid #a3d9bc" }}>
                  <span>✓</span> <span>{successMsg}</span>
                </div>
              )}

              {/* OBSERVATION SOURCE & METADATA (Rule 10) */}
              <div className="vital-input-group">
                <label>Observation Source (Rule 10 Compliance)</label>
                <select
                  value={observationSource}
                  onChange={(e) => setObservationSource(e.target.value)}
                >
                  <option value="bedside_manual">Manual Bedside Observation (Nurse / Staff)</option>
                  <option value="ad8232_simulation">AD8232 Sensor Simulation Stream</option>
                  <option value="triage_intake">Triage / Emergency Intake Station</option>
                </select>
                <span className="vital-unit">Recorded with active UTC/ISO timestamp and author audit tag</span>
              </div>

              {/* VITALS INPUT GRID */}
              <div className="vitals-grid">
                <div className="vital-input-group">
                  <label>Heart Rate (HR) <span className="vital-unit">bpm [20-260]</span></label>
                  <input
                    type="number"
                    min="20"
                    max="260"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    required
                  />
                </div>

                <div className="vital-input-group">
                  <label>Systolic Blood Pressure <span className="vital-unit">mmHg [40-300]</span></label>
                  <input
                    type="number"
                    min="40"
                    max="300"
                    value={bpSys}
                    onChange={(e) => setBpSys(e.target.value)}
                    required
                  />
                </div>

                <div className="vital-input-group">
                  <label>Diastolic Blood Pressure <span className="vital-unit">mmHg [30-200]</span></label>
                  <input
                    type="number"
                    min="30"
                    max="200"
                    value={bpDia}
                    onChange={(e) => setBpDia(e.target.value)}
                  />
                </div>

                <div className="vital-input-group">
                  <label>Respiratory Rate (RR) <span className="vital-unit">breaths/min [4-60]</span></label>
                  <input
                    type="number"
                    min="4"
                    max="60"
                    value={respRate}
                    onChange={(e) => setRespRate(e.target.value)}
                    required
                  />
                </div>

                <div className="vital-input-group">
                  <label>Temperature <span className="vital-unit">°C [30.0-45.0]</span></label>
                  <input
                    type="number"
                    step="0.1"
                    min="30.0"
                    max="45.0"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    required
                  />
                </div>

                <div className="vital-input-group">
                  <label>Oxygen Saturation (SpO2) <span className="vital-unit">% [50-100]</span></label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* LIVE MEWS CALCULATION PREVIEW */}
              {liveMews && (
                <div className="mews-preview-card">
                  <div className="mews-preview-header">
                    <div>
                      <h4 style={{ margin: 0, color: "var(--teal-deep)" }}>
                        MEWS Real-Time Assessment (Subbe et al., 2001)
                      </h4>
                      <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                        Standardized UK Early Warning Score Ruleset
                      </span>
                    </div>
                    <div>
                      <span className="mews-score-large">{liveMews.score}</span>
                      <span
                        className={`mews-score-pill mews-${liveMews.riskTier.toLowerCase()}`}
                        style={{ marginLeft: "10px" }}
                      >
                        {liveMews.riskTier} RISK
                      </span>
                    </div>
                  </div>

                  <div className="mews-breakdown-list">
                    {liveMews.breakdown.map((b, idx) => (
                      <div key={idx} className="mews-breakdown-item">
                        <span>• {b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6-FACTOR DISCHARGE READINESS CHECKLIST */}
              <div className="discharge-checklist">
                <h4>
                  6-Factor Discharge Readiness Evaluation:{" "}
                  <span style={{ color: allDischargeMet ? "var(--ok)" : "var(--alert)" }}>
                    {allDischargeMet ? "READY FOR DISCHARGE CONSIDERATION" : "MONITORING REQUIRED"}
                  </span>
                </h4>
                {dischargeCriteria.map((item, idx) => (
                  <div key={idx} className="discharge-item">
                    <span>{item.met ? "✓" : "✗"}</span>
                    <span className={item.met ? "discharge-pass" : "discharge-fail"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* MANDATORY CLINICAL DECISION SUPPORT DISCLAIMER (Rule 12) */}
              <div className="disclaimer-banner">
                <span className="disclaimer-icon">ℹ️</span>
                <div>
                  <strong>Clinical Decision Support Disclaimer:</strong> MEWS early warning score is a
                  supplementary screening aid and does NOT constitute a definitive medical diagnosis. Attending
                  qualified healthcare professionals retain ultimate clinical decision authority.
                </div>
              </div>
            </div>

            <div className="pc-modal-footer" style={{ flexShrink: 0, padding: "14px 24px", borderTop: "1px solid var(--border)", background: "#f8f9fa", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="btn-pc-secondary" onClick={onClose} style={{ padding: "8px 16px", borderRadius: "6px" }}>
                Close
              </button>
              <button type="submit" className="btn-pc-primary" disabled={submitting} style={{ background: "var(--teal)", color: "#fff", padding: "10px 20px", fontWeight: 600, borderRadius: "6px", border: "none", cursor: "pointer" }}>
                {submitting ? "Saving Vitals..." : "Commit Vitals & Calculate MEWS →"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
            <div className="pc-modal-body" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, color: "var(--teal-deep)" }}>
                  Patient Historical Physiological Observations ({history.length})
                </h4>
                <button type="button" className="btn-pc-secondary" onClick={fetchHistory} disabled={historyLoading}>
                  {historyLoading ? "Refreshing..." : "🔄 Refresh History"}
                </button>
              </div>

              {historyLoading && history.length === 0 ? (
                <div className="staff-loading" style={{ padding: "30px" }}>
                  <div className="loading-spinner"></div>
                  <p>Loading observation history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="staff-empty-state" style={{ padding: "30px", border: "1px dashed var(--line)" }}>
                  <span className="empty-icon">🩺</span>
                  <h4>No Historical Vital Observations</h4>
                  <p>No bedside vital observations have been recorded for this patient yet. Use the "Record Bedside Vitals" tab to submit the first reading.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="pc-patients-table" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        <th>Timestamp (UTC)</th>
                        <th>Source (Rule 10)</th>
                        <th>HR (bpm)</th>
                        <th>BP (mmHg)</th>
                        <th>RR (/min)</th>
                        <th>Temp (°C)</th>
                        <th>SpO2 (%)</th>
                        <th>MEWS Score</th>
                        <th>Staff Author</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((rec) => {
                        const mews = rec.mews_score || 0;
                        let mewsClass = "mews-stable";
                        if (mews >= 6) mewsClass = "mews-critical";
                        else if (mews >= 4) mewsClass = "mews-elevated";
                        else if (mews >= 2) mewsClass = "mews-monitoring";

                        return (
                          <tr key={rec.vital_id || rec.recorded_at}>
                            <td>
                              <strong>{formatTimestamp(rec.recorded_at)}</strong>
                            </td>
                            <td>
                              <span className="pc-bed-type-pill pill-general" style={{ fontSize: "11px" }}>
                                {formatSourceLabel(rec.observation_source)}
                              </span>
                            </td>
                            <td><strong>{rec.heart_rate}</strong></td>
                            <td><strong>{rec.blood_pressure_sys}/{rec.blood_pressure_dia || 80}</strong></td>
                            <td><strong>{rec.respiratory_rate}</strong></td>
                            <td><strong>{rec.temperature}</strong></td>
                            <td><strong>{rec.oxygen_saturation}%</strong></td>
                            <td>
                              <span className={`mews-score-pill ${mewsClass}`} style={{ fontSize: "11px" }}>
                                {mews} pts
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "var(--ink-soft)" }}>{rec.recorded_by_staff_id || "Staff"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="disclaimer-banner" style={{ marginTop: "16px" }}>
                <span className="disclaimer-icon">ℹ️</span>
                <div>
                  <strong>Audit & Provenance Logging (Rule 10):</strong> All observations record the recording source,
                  calibrated physiological units, authenticated staff identity, and UTC timestamp to guarantee clinical data integrity.
                </div>
              </div>
            </div>

            <div className="pc-modal-footer" style={{ flexShrink: 0, padding: "14px 24px", borderTop: "1px solid var(--border)", background: "#f8f9fa", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="btn-pc-secondary" onClick={onClose} style={{ padding: "8px 16px", borderRadius: "6px" }}>
                Close
              </button>
              <button
                type="button"
                className="btn-pc-primary"
                onClick={() => setActiveTab("record")}
                style={{ background: "var(--teal)", color: "#fff", padding: "10px 20px", fontWeight: 600, borderRadius: "6px", border: "none", cursor: "pointer" }}
              >
                + Record New Observation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
