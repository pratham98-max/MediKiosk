import React, { useState, useEffect, useCallback } from "react";
import "./patient_care.css";

import VitalRecorderModal from "./VitalRecorderModal";
import XAIRiskModal from "./XAIRiskModal";
import ECGTelemetryModal from "./ECGTelemetryModal";
import BedManagementModal from "./BedManagementModal";
import CarePlansModal from "./CarePlansModal";
import TransferNetworkModal from "./TransferNetworkModal";
import UnifiedPatientProfileModal from "./UnifiedPatientProfileModal";
import AdmitPatientModal from "./AdmitPatientModal";

export default function PatientCareModule({
  apiBase,
  currentStaff,
}) {
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    critical_mews: 0,
    intake_red_flags: 0,
    icu_patients: 0,
    general_patients: 0,
    discharge_ready: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState("all");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [optimizeMessage, setOptimizeMessage] = useState("");
  const [optimizing, setOptimizing] = useState(false);

  // Active sub-modals
  const [activeModal, setActiveModal] = useState(null); // 'vitals' | 'xai' | 'ecg' | 'bed' | 'carePlans' | 'transfer' | 'admit'
  const [activePatient, setActivePatient] = useState(null);
  const [selectedBedForAdmission, setSelectedBedForAdmission] = useState("");

  const hospId = currentStaff?.hospital_id || "hosp-medikiosk";

  // Fetch Beds and Census
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch beds
      const bedsRes = await fetch(`${apiBase}/staff/patient-care/beds?hospital_id=${hospId}`);
      const bedsData = await bedsRes.json();
      if (bedsData.beds) {
        setBeds(bedsData.beds);
      }

      // 2. Fetch monitored patients
      const patRes = await fetch(
        `${apiBase}/staff/patient-care/patients?hospital_id=${hospId}${
          selectedFilter !== "all" ? `&filter_type=${selectedFilter}` : ""
        }`
      );
      const patData = await patRes.json();
      if (patData.patients) {
        setPatients(patData.patients);
        if (patData.counts) {
          setCounts(patData.counts);
        }
      }
    } catch (err) {
      console.error("Patient Care data load error:", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, hospId, selectedFilter]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [loadData]);

  // Run Bed Optimization
  const handleOptimizeBeds = async () => {
    setOptimizing(true);
    setOptimizeMessage("");
    try {
      const res = await fetch(`${apiBase}/staff/patient-care/beds/optimize?hospital_id=${hospId}`, {
        method: "POST",
      });
      const data = await res.json();
      setOptimizeMessage(
        data.swaps_count > 0
          ? `✓ Bed optimization completed: ${data.swaps_count} bed reallocation(s) performed.`
          : `✓ All critical patients are already appropriately placed in ICU.`
      );
      loadData();
    } catch (err) {
      console.error("Bed optimize error:", err);
      setOptimizeMessage("Failed to execute bed optimization");
    } finally {
      setOptimizing(false);
    }
  };

  const openModal = (type, patient) => {
    setActivePatient(patient);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setActivePatient(null);
  };

  const filteredBeds = selectedWard === "all"
    ? beds
    : beds.filter((b) => b.ward?.toLowerCase() === selectedWard.toLowerCase());

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === "occupied").length;
  const vacantBeds = totalBeds - occupiedBeds;

  return (
    <div className="patient-care-container">
      {/* SECTION HEADER CARD */}
      <div className="pc-header-card">
        <div className="pc-header-title">
          <h2>🏥 Inpatient Care & Physiological MEWS Monitoring</h2>
          <p>
            Real-time vital trends, early warning deterioration scoring, intelligent bed management & Explainable AI.
          </p>
        </div>

        <div className="pc-header-actions">
          <button
            type="button"
            className="btn-pc-primary"
            style={{ background: "var(--teal)", color: "#fff", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={() => {
              setSelectedBedForAdmission("");
              setActiveModal("admit");
            }}
          >
            <span>➕</span> Admit Patient & Allocate Bed
          </button>
          <button
            type="button"
            className="btn-pc-primary btn-pc-optimize"
            onClick={handleOptimizeBeds}
            disabled={optimizing}
          >
            {optimizing ? "Optimizing..." : "⚡ Run Bed Optimization"}
          </button>
          <button
            type="button"
            className="btn-pc-secondary"
            onClick={loadData}
          >
            🔄 Refresh Census
          </button>
        </div>
      </div>

      {optimizeMessage && (
        <div className="doc-auth-alert doc-alert-success" style={{ background: "#e0efe6", color: "#25603f", border: "1px solid #a3d9bc" }}>
          <span>ℹ️</span> <span>{optimizeMessage}</span>
        </div>
      )}

      {/* KPI METRICS GRID */}
      <div className="pc-kpi-grid">
        <div className="pc-kpi-card">
          <div className="pc-kpi-icon">🛏️</div>
          <div className="pc-kpi-data">
            <div className="pc-kpi-value">{occupiedBeds} / {totalBeds}</div>
            <div className="pc-kpi-label">Bed Occupancy ({vacantBeds} Vacant)</div>
          </div>
        </div>

        <div className="pc-kpi-card kpi-icu">
          <div className="pc-kpi-icon">🏥</div>
          <div className="pc-kpi-data">
            <div className="pc-kpi-value">{counts.icu_patients}</div>
            <div className="pc-kpi-label">ICU Inpatients (Max 2)</div>
          </div>
        </div>

        <div className={`pc-kpi-card ${counts.critical_mews > 0 ? "kpi-critical" : ""}`}>
          <div className="pc-kpi-icon">⚡</div>
          <div className="pc-kpi-data">
            <div className="pc-kpi-value">{counts.critical_mews}</div>
            <div className="pc-kpi-label">MEWS Alerts (Score ≥ 4)</div>
          </div>
        </div>

        <div className={`pc-kpi-card ${counts.intake_red_flags > 0 ? "kpi-critical" : ""}`}>
          <div className="pc-kpi-icon">🚨</div>
          <div className="pc-kpi-data">
            <div className="pc-kpi-value">{counts.intake_red_flags}</div>
            <div className="pc-kpi-label">AI Intake Red Flags</div>
          </div>
        </div>

        <div className="pc-kpi-card">
          <div className="pc-kpi-icon">📋</div>
          <div className="pc-kpi-data">
            <div className="pc-kpi-value">{counts.total}</div>
            <div className="pc-kpi-label">Total Census</div>
          </div>
        </div>
      </div>

      {/* DUAL ALERT LEGEND BANNER (Rule 9 Compliance) */}
      <div className="pc-alert-banner">
        <div className="pc-alert-banner-left">
          <span style={{ fontSize: "20px" }}>🛡️</span>
          <div>
            <strong style={{ color: "var(--teal-deep)", fontSize: "14px" }}>
              Clinical Alert Classification Standard (Rule 9 Compliance):
            </strong>
            <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "2px" }}>
              Conversational intake alerts and bedside physiological deterioration alerts are distinctly separated to prevent clinical confusion.
            </div>
          </div>
        </div>

        <div className="pc-alert-badge-group">
          <span className="badge-intake-rf">
            🚨 🗣️ Conversational Red Flag (AI Interview)
          </span>
          <span className="badge-mews-alert">
            ⚡ 🩺 MEWS Alert (Physiological Vitals ≥ 4)
          </span>
        </div>
      </div>

      {/* WARD BEDS INTERACTIVE MAP */}
      <div className="pc-ward-section">
        <div className="pc-ward-header">
          <div>
            <h3>Hospital Ward & ICU Bed Allocation Board</h3>
            <span style={{ fontSize: "13px", color: "var(--ink-soft)" }}>
              {hospId === "hosp-medikiosk" ? "MediKiosk General Hospital" : hospId} • Ward Bed Map
            </span>
          </div>

          <div className="pc-ward-filters">
            {[
              { id: "all", label: "All Wards (9)" },
              { id: "icu ward", label: "ICU Ward (2)" },
              { id: "ward a", label: "Ward A (3)" },
              { id: "ward b", label: "Ward B (2)" },
              { id: "ward c", label: "Ward C (2)" },
            ].map((wf) => (
              <button
                key={wf.id}
                type="button"
                className={`btn-ward-filter ${selectedWard === wf.id ? "active" : ""}`}
                onClick={() => setSelectedWard(wf.id)}
              >
                {wf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pc-beds-grid">
          {filteredBeds.map((bed) => {
            const isIcu = bed.bed_type === "ICU";
            const isOccupied = bed.status === "occupied";
            const mews = bed.mews_score || 0;

            let mewsClass = "mews-stable";
            if (mews >= 6) mewsClass = "mews-critical";
            else if (mews >= 4) mewsClass = "mews-elevated";
            else if (mews >= 2) mewsClass = "mews-monitoring";

            return (
              <div
                key={bed.bed_id}
                className={`pc-bed-card ${isIcu ? "bed-icu" : ""} ${isOccupied ? "bed-occupied" : "bed-vacant"}`}
              >
                <div>
                  <div className="pc-bed-top">
                    <span className="pc-bed-badge">
                      <span>🛏️</span> {bed.bed_number}
                    </span>
                    <span className={`pc-bed-type-pill ${isIcu ? "pill-icu" : "pill-general"}`}>
                      {bed.bed_type}
                    </span>
                    <span className={`pc-bed-status ${isOccupied ? "status-occupied" : "status-vacant"}`}>
                      {isOccupied ? "Occupied" : "Vacant"}
                    </span>
                  </div>

                  {isOccupied && bed.patient_id ? (
                    <div className="pc-bed-patient">
                      <div className="pc-bed-patient-name">
                        {bed.patient_name || "Assigned Patient"}
                      </div>
                      <div className="pc-bed-patient-sub">
                        <span>{bed.patient_age ? `${bed.patient_age}y` : ""} {bed.patient_gender ? `• ${bed.patient_gender}` : ""}</span>
                        <span>ID: {bed.patient_id.substring(0, 8)}</span>
                      </div>

                      <div className="pc-bed-mews-row">
                        <span>MEWS Score:</span>
                        <span className={`mews-score-pill ${mewsClass}`}>
                          {mews} pts
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pc-bed-patient" style={{ textAlign: "center", color: "var(--ink-soft)", padding: "16px 0", fontSize: "13px" }}>
                      Vacant & Ready for Assignment
                    </div>
                  )}
                </div>

                <div className="pc-bed-actions">
                  {isOccupied && bed.patient_id ? (
                    <>
                      <button
                        type="button"
                        className="btn-bed-action"
                        onClick={() => openModal("profile", bed)}
                        title="View Full Unified Clinical Profile"
                      >
                        📋 Profile
                      </button>
                      <button
                        type="button"
                        className="btn-bed-action"
                        onClick={() => openModal("vitals", bed)}
                        title="Record bedside vitals"
                      >
                        🩺 Vitals
                      </button>
                      <button
                        type="button"
                        className="btn-bed-action"
                        onClick={() => openModal("xai", bed)}
                        title="ML deterioration risk & Explainable AI"
                      >
                        🧠 XAI Risk
                      </button>
                      <button
                        type="button"
                        className="btn-bed-action"
                        onClick={() => openModal("ecg", bed)}
                        title="Simulated ECG Telemetry"
                      >
                        📈 ECG
                      </button>
                      <button
                        type="button"
                        className="btn-bed-action"
                        onClick={() => openModal("bed", bed)}
                        title="Manage Bed / Reallocate / Discharge"
                      >
                        🛏️ Bed
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-bed-action"
                      style={{ background: "#e8f4fd", color: "#0066cc", borderColor: "#b8daff", fontWeight: 600, width: "100%", padding: "6px 8px" }}
                      onClick={() => {
                        setSelectedBedForAdmission(bed.bed_number);
                        setActiveModal("admit");
                      }}
                      title={`Allocate Bed ${bed.bed_number} to a patient`}
                    >
                      ➕ Allocate Bed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* INPATIENT MONITORING & DUAL-ALERT TABLE */}
      <div className="pc-table-section">
        <div className="pc-table-header">
          <div>
            <h3>Inpatient Monitoring & Dual-Alert Tracking Table</h3>
            <span style={{ fontSize: "13px", color: "var(--ink-soft)" }}>
              Census tracking across AI interview red flags and physiological early warning deterioration indicators.
            </span>
          </div>

          <div className="staff-filter-tabs">
            {[
              { id: "all", label: `All Inpatients (${counts.total})` },
              { id: "critical_mews", label: `⚡ MEWS Alerts (${counts.critical_mews})` },
              { id: "intake_red_flags", label: `🚨 Intake Red Flags (${counts.intake_red_flags})` },
              { id: "icu", label: `ICU Ward (${counts.icu_patients})` },
              { id: "discharge_ready", label: `Ready for Discharge (${counts.discharge_ready})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter-tab ${selectedFilter === f.id ? "active" : ""}`}
                onClick={() => setSelectedFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="staff-loading">
            <div className="loading-spinner"></div>
            <p>Loading inpatient physiological census...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="staff-empty-state">
            <span className="empty-icon">🛏️</span>
            <h4>No Inpatients Found in this Category</h4>
            <p>No patients currently match the selected physiological monitoring filter.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="pc-patients-table">
              <thead>
                <tr>
                  <th>Clinical Alerts (Rule 9)</th>
                  <th>Bed / Ward</th>
                  <th>Patient Details</th>
                  <th>Latest Vitals Snapshot</th>
                  <th>MEWS Score</th>
                  <th>ML Deterioration Risk</th>
                  <th>Care Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((pat) => {
                  const mews = pat.mews_score || 0;
                  const hasMewsAlert = pat.has_mews_alert || mews >= 4;
                  const hasIntakeRf = pat.has_intake_red_flag;
                  const riskPercent = Math.round((pat.deterioration_risk || 0) * 100);

                  let mewsClass = "mews-stable";
                  if (mews >= 6) mewsClass = "mews-critical";
                  else if (mews >= 4) mewsClass = "mews-elevated";
                  else if (mews >= 2) mewsClass = "mews-monitoring";

                  const vitals = pat.latest_vitals || {};

                  return (
                    <tr
                      key={pat.patient_id}
                      className={hasMewsAlert || hasIntakeRf ? "pc-patient-row-critical" : ""}
                    >
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {hasIntakeRf && (
                            <span className="badge-intake-rf" title={pat.intake_red_flag_reason || "Red flag in AI chat"}>
                              🚨 AI Chat Red Flag
                            </span>
                          )}
                          {hasMewsAlert && (
                            <span className="badge-mews-alert" title={`MEWS Score ${mews} indicates physiological risk`}>
                              ⚡ MEWS Alert ({mews} pts)
                            </span>
                          )}
                          {!hasIntakeRf && !hasMewsAlert && (
                            <span style={{ fontSize: "12px", color: "var(--ok)", fontWeight: 600 }}>
                              ✓ Stable
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <strong style={{ color: "var(--teal-deep)" }}>
                          {pat.bed_number || "Unassigned"}
                        </strong>
                        <div style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                          {pat.bed_type === "ICU" ? "ICU Bed" : pat.ward || "General"}
                        </div>
                      </td>

                      <td>
                        <strong>{pat.full_name}</strong>
                        <div style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                          {pat.age}y / {pat.gender} • ID: {pat.patient_id.substring(0, 8)}
                        </div>
                      </td>

                      <td>
                        {vitals.heart_rate ? (
                          <div style={{ fontSize: "12px", lineHeight: 1.4 }}>
                            <div>HR: <strong>{vitals.heart_rate}</strong> bpm • BP: <strong>{vitals.blood_pressure_sys}/{vitals.blood_pressure_dia || 80}</strong></div>
                            <div>RR: <strong>{vitals.respiratory_rate}</strong> • SpO2: <strong>{vitals.oxygen_saturation}%</strong> • T: <strong>{vitals.temperature}°C</strong></div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                            No vitals recorded
                          </span>
                        )}
                      </td>

                      <td>
                        <span className={`mews-score-pill ${mewsClass}`}>
                          {mews} pts
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, fontSize: "13px" }}>{riskPercent}%</span>
                          <span
                            className={`mews-score-pill ${riskPercent >= 70 ? "mews-critical" : riskPercent >= 40 ? "mews-monitoring" : "mews-stable"}`}
                            style={{ fontSize: "10px" }}
                          >
                            {riskPercent >= 70 ? "CRITICAL" : riskPercent >= 40 ? "MODERATE" : "LOW"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn-bed-action"
                            style={{ background: "#e0efe6", color: "#25603f", borderColor: "#a3d9bc" }}
                            onClick={() => openModal("profile", pat)}
                            title="View Full Unified Clinical Profile"
                          >
                            📋 Profile
                          </button>
                          <button
                            type="button"
                            className="btn-bed-action"
                            onClick={() => openModal("vitals", pat)}
                            title="Record vitals"
                          >
                            🩺 Vitals
                          </button>
                          <button
                            type="button"
                            className="btn-bed-action"
                            onClick={() => openModal("xai", pat)}
                            title="XAI risk explanation"
                          >
                            🧠 XAI
                          </button>
                          <button
                            type="button"
                            className="btn-bed-action"
                            onClick={() => openModal("carePlans", pat)}
                            title="Care plans"
                          >
                            📋 Care
                          </button>
                          <button
                            type="button"
                            className="btn-bed-action"
                            onClick={() => openModal("transfer", pat)}
                            title="Inter-hospital transfer"
                          >
                            🚑 Transfer
                          </button>
                          <button
                            type="button"
                            className="btn-bed-action"
                            style={{
                              background: pat.bed_number ? "#f4f5f7" : "#fff8e6",
                              borderColor: pat.bed_number ? "var(--border)" : "#ffcc00",
                              color: pat.bed_number ? "inherit" : "#8a6d3b",
                              fontWeight: 600,
                            }}
                            onClick={() => openModal("bed", pat)}
                            title={pat.bed_number ? "Manage Bed / Upgrade / Discharge" : "Allocate a vacant bed to this patient"}
                          >
                            🛏️ {pat.bed_number ? "Bed" : "Assign Bed"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SUB-MODALS */}
      {activeModal === "vitals" && activePatient && (
        <VitalRecorderModal
          apiBase={apiBase}
          patient={activePatient}
          currentStaff={currentStaff}
          onClose={closeModal}
          onVitalsRecorded={() => {
            loadData();
          }}
        />
      )}

      {activeModal === "xai" && activePatient && (
        <XAIRiskModal
          apiBase={apiBase}
          patient={activePatient}
          onClose={closeModal}
        />
      )}

      {activeModal === "ecg" && activePatient && (
        <ECGTelemetryModal
          apiBase={apiBase}
          patient={activePatient}
          onClose={closeModal}
        />
      )}

      {activeModal === "bed" && activePatient && (
        <BedManagementModal
          apiBase={apiBase}
          patient={activePatient}
          beds={beds}
          currentStaff={currentStaff}
          onClose={closeModal}
          onBedUpdated={() => {
            loadData();
          }}
        />
      )}

      {activeModal === "carePlans" && activePatient && (
        <CarePlansModal
          apiBase={apiBase}
          patient={activePatient}
          currentStaff={currentStaff}
          onClose={closeModal}
        />
      )}

      {activeModal === "transfer" && activePatient && (
        <TransferNetworkModal
          apiBase={apiBase}
          patient={activePatient}
          currentStaff={currentStaff}
          onClose={closeModal}
        />
      )}

      {activeModal === "profile" && activePatient && (
        <UnifiedPatientProfileModal
          apiBase={apiBase}
          patientId={activePatient.patient_id}
          currentStaff={currentStaff}
          onClose={closeModal}
        />
      )}

      {activeModal === "admit" && (
        <AdmitPatientModal
          apiBase={apiBase}
          beds={beds}
          currentStaff={currentStaff}
          preSelectedBed={selectedBedForAdmission}
          onClose={closeModal}
          onAdmitted={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
