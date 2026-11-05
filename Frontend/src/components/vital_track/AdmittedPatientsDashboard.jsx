import React, { useState } from "react";
import BedTile from "../ui/BedTile";
import MewsChip from "../ui/MewsChip";
import PriorityChip from "../ui/PriorityChip";
import EmptyState from "../ui/EmptyState";

export default function AdmittedPatientsDashboard({
  beds = [],
  patients = [],
  loading = false,
  onSelectPatient,
  onAllocateBed,
  onRecordVitals,
  onOpenProfile,
  onOpenECG,
  onOptimizeBeds,
  optimizing = false,
  optimizeMessage = "",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [inpatientFilter, setInpatientFilter] = useState("all"); // 'all' | 'critical' | 'icu' | 'general'
  const [wardFilter, setWardFilter] = useState("all"); // 'all' | 'icu' | 'general'

  // Authoritative admitted census: patient has an occupied bed
  const admittedPatients = patients.filter(
    (p) => Boolean(p.bed_number) && p.bed_status === "occupied"
  );

  // Bed metrics
  const totalBeds = beds.length || 9;
  const occupiedBeds = beds.filter((b) => b.status === "occupied").length;
  const availableBeds = totalBeds - occupiedBeds;
  const icuBeds = beds.filter((b) => b.bed_type === "ICU");
  const icuOccupied = icuBeds.filter((b) => b.status === "occupied").length;
  const generalBeds = beds.filter((b) => b.bed_type !== "ICU");
  const generalOccupied = generalBeds.filter((b) => b.status === "occupied").length;
  const criticalCount = admittedPatients.filter(
    (p) => (Number(p.mews_score) || 0) >= 4 || (Number(p.deterioration_risk) || 0) >= 0.7
  ).length;

  // Filtered beds for Ward Map
  const filteredBeds = beds.filter((b) => {
    if (wardFilter === "icu") return b.bed_type === "ICU";
    if (wardFilter === "general") return b.bed_type !== "ICU";
    return true;
  });

  // Filtered admitted patients for Census Table
  const filteredPatients = admittedPatients.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.full_name || p.patient_name || "").toLowerCase().includes(q);
      const matchId = (p.patient_id || "").toLowerCase().includes(q);
      const matchBed = (p.bed_number || "").toLowerCase().includes(q);
      const matchComplaint = (p.chief_complaint || "").toLowerCase().includes(q);
      if (!matchName && !matchId && !matchBed && !matchComplaint) return false;
    }

    if (inpatientFilter === "critical") {
      return (Number(p.mews_score) || 0) >= 4 || (Number(p.deterioration_risk) || 0) >= 0.7;
    }
    if (inpatientFilter === "icu") {
      return p.bed_type === "ICU" || p.needs_icu;
    }
    if (inpatientFilter === "general") {
      return p.bed_type !== "ICU" && !p.needs_icu;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* CENSUS KPI METRICS BAR */}
      <div className="vt-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="vt-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--vt-text-muted)", fontWeight: 600 }}>
              Total Inpatient Census
            </span>
            <span style={{ fontSize: "18px" }}>🛏️</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "var(--vt-dark-green)", fontFamily: "'Space Grotesk', sans-serif" }}>
              {admittedPatients.length}
            </span>
            <span style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>/ {totalBeds} capacity</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--vt-text-muted)", marginTop: "4px" }}>
            {availableBeds} beds currently vacant
          </div>
        </div>

        <div className="vt-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--vt-text-muted)", fontWeight: 600 }}>
              ICU Bed Occupancy
            </span>
            <span style={{ fontSize: "18px" }}>🚨</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "var(--vt-crimson)", fontFamily: "'Space Grotesk', sans-serif" }}>
              {icuOccupied} / {icuBeds.length}
            </span>
            <span style={{ fontSize: "12px", color: "var(--vt-crimson)", fontWeight: 600 }}>
              {icuBeds.length > 0 ? Math.round((icuOccupied / icuBeds.length) * 100) : 0}%
            </span>
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--vt-text-muted)", marginTop: "4px" }}>
            High-dependency intensive care units
          </div>
        </div>

        <div className="vt-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--vt-text-muted)", fontWeight: 600 }}>
              General Ward Occupancy
            </span>
            <span style={{ fontSize: "18px" }}>🏥</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "var(--vt-dark-green)", fontFamily: "'Space Grotesk', sans-serif" }}>
              {generalOccupied} / {generalBeds.length}
            </span>
            <span style={{ fontSize: "12px", color: "var(--vt-mid-green)", fontWeight: 600 }}>
              {generalBeds.length > 0 ? Math.round((generalOccupied / generalBeds.length) * 100) : 0}%
            </span>
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--vt-text-muted)", marginTop: "4px" }}>
            Wards A & B continuous observation
          </div>
        </div>

        <div className="vt-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--vt-text-muted)", fontWeight: 600 }}>
              Critical Deterioration
            </span>
            <span style={{ fontSize: "18px" }}>⚠️</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: criticalCount > 0 ? "var(--vt-crimson)" : "var(--vt-dark-green)", fontFamily: "'Space Grotesk', sans-serif" }}>
              {criticalCount}
            </span>
            <span style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>patients</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--vt-text-muted)", marginTop: "4px" }}>
            MEWS ≥ 4 or ML Risk ≥ 70%
          </div>
        </div>
      </div>

      {/* DISCLOSURE BANNERS: RULE 11 & RULE 12 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          style={{
            background: "#fff9eb",
            border: "1px solid #fde68a",
            borderRadius: "14px",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "12px",
            color: "#92400e",
          }}
        >
          <span style={{ fontSize: "16px" }}>⚠️</span>
          <div>
            <strong>Rule 12 Clinical Notice:</strong> Deterioration risk scores and XAI feature attributions are derived from validated machine learning models trained on synthetic clinical cohorts. Decision support only; never replace bedside clinician judgment.
          </div>
        </div>

        <div
          style={{
            background: "#eef6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "14px",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "12px",
            color: "#1e40af",
          }}
        >
          <span style={{ fontSize: "16px" }}>🫀</span>
          <div>
            <strong>Rule 11 Demonstration Notice:</strong> AD8232 ECG waveforms and oscilloscope telemetry are software-simulated demonstrations designed for clinical workflow training.
          </div>
        </div>
      </div>

      {/* SECTION: 9-BED WARD MAP */}
      <div className="vt-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", color: "var(--vt-dark-green)" }}>
              Hospital Ward Bed Matrix (9 Beds)
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--vt-text-muted)" }}>
              Live occupancy, acuity status, and real-time bedside telemetry for 2 ICU and 7 General beds.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", background: "#f0f4ec", padding: "3px", borderRadius: "999px" }}>
              {[
                { id: "all", label: "All Beds (9)" },
                { id: "icu", label: "ICU Only (2)" },
                { id: "general", label: "General Ward (7)" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setWardFilter(pill.id)}
                  style={{
                    border: "none",
                    background: wardFilter === pill.id ? "#fff" : "transparent",
                    color: wardFilter === pill.id ? "var(--vt-dark-green)" : "var(--vt-text-muted)",
                    fontWeight: wardFilter === pill.id ? 700 : 500,
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: wardFilter === pill.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {onOptimizeBeds && (
              <button
                type="button"
                className="vt-btn-secondary"
                disabled={optimizing}
                onClick={onOptimizeBeds}
                title="Automatically reallocate beds by patient acuity"
                style={{ fontSize: "12.5px", padding: "8px 16px" }}
              >
                {optimizing ? "Optimizing..." : "⚡ Auto-Optimize Beds"}
              </button>
            )}
          </div>
        </div>

        {optimizeMessage && (
          <div
            style={{
              padding: "10px 14px",
              background: "#e8f7ea",
              border: "1px solid #b7e4bd",
              borderRadius: "12px",
              color: "var(--vt-mid-green)",
              fontSize: "12.5px",
              fontWeight: 600,
              marginBottom: "16px",
            }}
          >
            {optimizeMessage}
          </div>
        )}

        <div className="vt-bed-grid">
          {filteredBeds.map((bed) => (
            <BedTile
              key={bed.bed_number}
              bed={bed}
              onAllocate={(b) => onAllocateBed && onAllocateBed(b)}
              onSelectPatient={(b) => {
                if (b.patient_id) {
                  const pat = patients.find((p) => p.patient_id === b.patient_id) || b;
                  if (onSelectPatient) onSelectPatient(pat);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* SECTION: ADMITTED INPATIENTS CENSUS TABLE */}
      <div className="vt-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", color: "var(--vt-dark-green)" }}>
              Admitted Inpatient Census & Deterioration Monitor
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--vt-text-muted)" }}>
              Continuous Subbe MEWS scoring, ML deterioration forecasting, and clinical action triggers.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* SEARCH */}
            <div className="vt-search-box" style={{ maxWidth: "260px" }}>
              <span className="vt-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search inpatients, beds, complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* FILTER PILLS */}
            <div style={{ display: "flex", background: "#f0f4ec", padding: "3px", borderRadius: "999px" }}>
              {[
                { id: "all", label: `All (${admittedPatients.length})` },
                { id: "critical", label: `Critical (${criticalCount})` },
                { id: "icu", label: `ICU (${icuOccupied})` },
                { id: "general", label: `General (${generalOccupied})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setInpatientFilter(pill.id)}
                  style={{
                    border: "none",
                    background: inpatientFilter === pill.id ? "#fff" : "transparent",
                    color: inpatientFilter === pill.id ? "var(--vt-dark-green)" : "var(--vt-text-muted)",
                    fontWeight: inpatientFilter === pill.id ? 700 : 500,
                    padding: "6px 12px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: inpatientFilter === pill.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--vt-text-muted)" }}>
            <div className="loading-spinner" style={{ margin: "0 auto 12px" }}></div>
            Loading admitted inpatients...
          </div>
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            icon="🛏️"
            title="No Inpatients Found"
            message={
              searchQuery
                ? `No admitted patients matching "${searchQuery}".`
                : "No inpatients currently match the selected ward filter."
            }
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="vt-table">
              <thead>
                <tr>
                  <th>Patient Info</th>
                  <th>Assigned Bed</th>
                  <th>Chief Complaint</th>
                  <th>Bedside Vitals</th>
                  <th>Subbe MEWS</th>
                  <th>ML Deterioration Risk</th>
                  <th style={{ textAlign: "right" }}>Clinical Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((pat) => {
                  const mewsScore = Number(pat.mews_score) || 0;
                  const riskScore = Number(pat.deterioration_risk) || 0;
                  const isCritical = mewsScore >= 4 || riskScore >= 0.7;
                  const isIcu = pat.bed_type === "ICU" || pat.needs_icu;

                  return (
                    <tr
                      key={pat.patient_id}
                      style={{ cursor: "pointer", background: isCritical ? "#fffbfb" : undefined }}
                      onClick={() => onSelectPatient && onSelectPatient(pat)}
                    >
                      {/* PATIENT INFO */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <strong style={{ fontSize: "14px", color: "var(--vt-dark-green)" }}>
                            {pat.full_name || pat.patient_name || "Patient"}
                          </strong>
                          <span style={{ fontSize: "11px", color: "var(--vt-text-muted)", fontFamily: "monospace" }}>
                            {pat.patient_id} • {pat.age ? `${pat.age}y` : ""} {pat.gender ? `• ${pat.gender}` : ""}
                          </span>
                        </div>
                      </td>

                      {/* BED & WARD */}
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: isIcu ? "var(--vt-crimson-soft)" : "#e8f7ea",
                            color: isIcu ? "var(--vt-crimson)" : "var(--vt-mid-green)",
                          }}
                        >
                          Bed {pat.bed_number} ({pat.ward || pat.bed_type || "Ward"})
                        </span>
                      </td>

                      {/* CHIEF COMPLAINT */}
                      <td style={{ maxWidth: "220px" }}>
                        <div
                          style={{
                            fontSize: "12.5px",
                            color: "var(--vt-text-main)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={pat.chief_complaint}
                        >
                          {pat.chief_complaint || "Routine inpatient monitoring"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>
                          LOS: {pat.length_of_stay_days || pat.days_admitted || 1} day(s)
                        </div>
                      </td>

                      {/* BEDSIDE VITALS */}
                      <td>
                        <div style={{ display: "flex", gap: "10px", fontSize: "11.5px", color: "var(--vt-text-main)" }}>
                          <span>HR: <strong>{pat.heart_rate || "--"}</strong></span>
                          <span>BP: <strong>{pat.systolic_bp && pat.diastolic_bp ? `${pat.systolic_bp}/${pat.diastolic_bp}` : "--"}</strong></span>
                          <span>SpO2: <strong>{pat.spo2 ? `${pat.spo2}%` : "--"}</strong></span>
                        </div>
                      </td>

                      {/* MEWS SCORE */}
                      <td>
                        <MewsChip score={mewsScore} />
                      </td>

                      {/* ML RISK */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background:
                                riskScore >= 0.7
                                  ? "var(--vt-crimson)"
                                  : riskScore >= 0.4
                                  ? "var(--vt-amber)"
                                  : "var(--vt-mid-green)",
                            }}
                          ></span>
                          <span style={{ fontWeight: 700, fontSize: "12.5px" }}>
                            {Math.round(riskScore * 100)}%
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>
                            {riskScore >= 0.7 ? "High" : riskScore >= 0.4 ? "Medium" : "Low"}
                          </span>
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          {onRecordVitals && (
                            <button
                              type="button"
                              className="vt-btn-secondary"
                              style={{ padding: "5px 10px", fontSize: "11.5px" }}
                              onClick={() => onRecordVitals(pat)}
                              title="Record Bedside Vital Signs"
                            >
                              🫀 Vitals
                            </button>
                          )}
                          {onOpenECG && (
                            <button
                              type="button"
                              className="vt-btn-secondary"
                              style={{ padding: "5px 10px", fontSize: "11.5px" }}
                              onClick={() => onOpenECG(pat)}
                              title="View Real-Time ECG Telemetry"
                            >
                              📈 ECG
                            </button>
                          )}
                          {onOpenProfile && (
                            <button
                              type="button"
                              className="vt-btn-cta-admit"
                              style={{ padding: "5px 12px", fontSize: "11.5px" }}
                              onClick={() => onOpenProfile(pat.patient_id)}
                              title="Open 8-Facet Unified Dossier"
                            >
                              📋 Profile
                            </button>
                          )}
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
    </div>
  );
}
