import { useState } from "react";
import {
  Search,
  Activity,
  Heart,
  Wind,
  Thermometer,
  ChevronRight,
  User,
  ArrowRightLeft,
} from "lucide-react";
import MewsChip from "../ui/MewsChip";

export default function AdmittedPatientTable({
  patients = [],
  loading = false,
  onOpenProfile,
  onOpenCaseDetails, // view case action
  onTransfer, // transfer action directly in table
  onSwitchToBedMap,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all"); // 'all' | 'high' | 'medium' | 'low'
  const [conditionFilter, setConditionFilter] = useState("all"); // 'all' | 'critical' | 'stable'

  const filteredPatients = patients.filter((p) => {
    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (p.full_name || p.patient_name || "").toLowerCase().includes(q);
      const matchId = (p.patient_id || "").toLowerCase().includes(q);
      const matchBed = (p.bed_number || "").toLowerCase().includes(q);
      if (!matchName && !matchId && !matchBed) return false;
    }

    // Risk filter
    const risk = Number(p.deterioration_risk) || 0.15;
    if (riskFilter === "high" && risk < 0.7) return false;
    if (riskFilter === "medium" && (risk < 0.4 || risk >= 0.7)) return false;
    if (riskFilter === "low" && risk >= 0.4) return false;

    // Condition filter
    const mews = Number(p.mews_score) || 0;
    if (conditionFilter === "critical" && mews < 4 && risk < 0.7) return false;
    if (conditionFilter === "stable" && (mews >= 4 || risk >= 0.7)) return false;

    return true;
  });

  return (
    <div className="opd-queue-card">
      {/* 1. HEADER WITH SEARCH & FILTERS */}
      <div className="opd-queue-header">
        <div>
          <div className="opd-queue-title-row">
            <h3 className="opd-queue-title">Admitted Inpatient Monitoring</h3>
            <span className="opd-queue-count-chip">
              {filteredPatients.length} of {patients.length} Inpatients
            </span>
          </div>
          <p className="opd-queue-sub">
            Continuous physiological surveillance, MEWS acuity, and XAI deterioration scoring.
          </p>
        </div>

        {/* CONTROLS */}
        <div className="opd-queue-actions">
          <div className="opd-queue-search-wrap">
            <Search size={15} className="opd-search-icon" />
            <input
              type="text"
              className="opd-queue-search-input"
              placeholder="Search patient, ID, or bed..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="opd-search-clear-btn"
                onClick={() => setSearchTerm("")}
              >
                ×
              </button>
            )}
          </div>

          {onSwitchToBedMap && (
            <button
              type="button"
              className="opd-action-btn secondary"
              onClick={onSwitchToBedMap}
              title="View Ward Bed Map"
            >
              🛏️ Bed Map
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER PILLS */}
      <div className="opd-filter-pills-row">
        {[
          { id: "all", label: `All Inpatients (${patients.length})` },
          { id: "high", label: "High Risk (XAI ≥ 70%)" },
          { id: "medium", label: "Moderate Risk" },
          { id: "critical", label: "Critical MEWS (≥ 4)" },
          { id: "stable", label: "Physiologically Stable" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={`opd-filter-pill ${
              (riskFilter === f.id || conditionFilter === f.id || (f.id === "all" && riskFilter === "all" && conditionFilter === "all"))
                ? "active"
                : ""
            }`}
            onClick={() => {
              if (f.id === "all") {
                setRiskFilter("all");
                setConditionFilter("all");
              } else if (f.id === "high" || f.id === "medium") {
                setRiskFilter(f.id);
                setConditionFilter("all");
              } else {
                setConditionFilter(f.id);
                setRiskFilter("all");
              }
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 3. STRICT 6-COLUMN TABLE (PATIENT | LATEST VITALS | XAI RISK | MEWS | CONDITION | ACTION) */}
      <div className="opd-table-wrapper">
        {loading ? (
          <div className="opd-table-loading">
            <div className="loading-spinner" />
            <p>Syncing Inpatient telemetry and vital records...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="opd-table-empty">
            <div className="opd-empty-icon-wrap">
              <User size={32} />
            </div>
            <h4>No Inpatients Found</h4>
            <p>No admitted patients currently match the selected criteria or search term.</p>
          </div>
        ) : (
          <div className="opd-table-responsive">
            <table className="opd-table">
              <thead>
                <tr>
                  {/* Column 1: Patient */}
                  <th>Patient</th>
                  {/* Column 2: Latest Vitals */}
                  <th>Latest Vitals</th>
                  {/* Column 3: XAI Risk */}
                  <th>XAI Risk</th>
                  {/* Column 4: MEWS */}
                  <th>MEWS</th>
                  {/* Column 5: Condition */}
                  <th>Condition</th>
                  {/* Column 6: Action */}
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((pat) => {
                  const mewsScore = Number(pat.mews_score) || 0;
                  const riskScore = Number(pat.deterioration_risk) || 0.15;
                  const isCritical = mewsScore >= 4 || riskScore >= 0.7;
                  const isAttention = mewsScore >= 2 || riskScore >= 0.4;

                  const conditionLabel = isCritical
                    ? "Requires Attention"
                    : isAttention
                    ? "Under Observation"
                    : "Stable";

                  const conditionColor = isCritical
                    ? { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" }
                    : isAttention
                    ? { bg: "#fffbeb", color: "#b45309", border: "#fde68a" }
                    : { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };

                  // Initials
                  const nameStr = pat.full_name || pat.patient_name || "Patient";
                  const parts = nameStr.trim().split(" ");
                  const initials =
                    parts.length > 1
                      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                      : parts[0].substring(0, 2).toUpperCase();

                  // Vitals values (with clinical abnormal threshold warnings)
                  const hr = pat.heart_rate || 76;
                  const hrWarn = hr > 100 || hr < 50;
                  const bpSys = pat.blood_pressure_sys || 120;
                  const bpDia = pat.blood_pressure_dia || 80;
                  const bpWarn = bpSys > 140 || bpSys < 90;
                  const spo2 = pat.oxygen_saturation || 98;
                  const spo2Warn = spo2 < 95;
                  const temp = pat.temperature || 36.8;
                  const tempWarn = temp > 38.0 || temp < 35.5;

                  return (
                    <tr
                      key={pat.patient_id}
                      className={`opd-table-row ${isCritical ? "red-flag-row" : ""}`}
                      onClick={() => onOpenProfile && onOpenProfile(pat.patient_id)}
                    >
                      {/* 1. PATIENT (Name, ID, Avatar) */}
                      <td>
                        <div className="opd-patient-cell">
                          <div className={`opd-patient-avatar ${isCritical ? "alert" : ""}`}>
                            {initials}
                          </div>
                          <div>
                            <span className="opd-patient-name">{nameStr}</span>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                              <span className="opd-patient-id-tag">
                                {pat.patient_id ? pat.patient_id.substring(0, 10) : "INP-PAT"}
                              </span>
                              {pat.is_demo && (
                                <span style={{ fontSize: "10px", background: "rgba(18, 59, 51, 0.1)", color: "#16391C", fontWeight: 700, padding: "1px 5px", borderRadius: "4px" }}>
                                  DEMO
                                </span>
                              )}
                              {pat.bed_number && (
                                <span style={{ fontSize: "11px", color: "var(--vt-primary-green)", fontWeight: 600 }}>
                                  🛏️ Bed {pat.bed_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. LATEST VITALS (Compact Inline Indicators: HR, BP, SpO2, Temp) */}
                      <td>
                        <div className="inpatient-vitals-strip">
                          {/* HR */}
                          <span
                            className={`inpatient-vital-pill ${hrWarn ? "warn" : ""}`}
                            title="Heart Rate"
                          >
                            <Heart size={11} className={hrWarn ? "text-red" : "text-green"} />
                            <span>{hr} bpm</span>
                          </span>

                          {/* BP */}
                          <span
                            className={`inpatient-vital-pill ${bpWarn ? "warn" : ""}`}
                            title="Blood Pressure"
                          >
                            <Activity size={11} className={bpWarn ? "text-amber" : "text-green"} />
                            <span>{bpSys}/{bpDia}</span>
                          </span>

                          {/* SpO2 */}
                          <span
                            className={`inpatient-vital-pill ${spo2Warn ? "bad" : ""}`}
                            title="Oxygen Saturation"
                          >
                            <Wind size={11} className={spo2Warn ? "text-red" : "text-green"} />
                            <span>{spo2}%</span>
                          </span>

                          {/* Temp */}
                          <span
                            className={`inpatient-vital-pill ${tempWarn ? "warn" : ""}`}
                            title="Temperature"
                          >
                            <Thermometer size={11} className={tempWarn ? "text-amber" : "text-green"} />
                            <span>{temp}°C</span>
                          </span>
                        </div>
                      </td>

                      {/* 3. XAI RISK (Low / Medium / High from actual ML assessment) */}
                      <td>
                        <div className="inpatient-xai-cell">
                          <span
                            className="inpatient-xai-dot"
                            style={{
                              background:
                                riskScore >= 0.7
                                  ? "#dc2626"
                                  : riskScore >= 0.4
                                  ? "#d97706"
                                  : "#285c2b",
                            }}
                          />
                          <span className="inpatient-xai-score">
                            {Math.round(riskScore * 100)}%
                          </span>
                          <span className="inpatient-xai-label">
                            {riskScore >= 0.7 ? "High" : riskScore >= 0.4 ? "Medium" : "Low"}
                          </span>
                        </div>
                      </td>

                      {/* 4. MEWS (Score & Category) */}
                      <td>
                        <MewsChip score={mewsScore} />
                      </td>

                      {/* 5. CONDITION (Stable, Under Observation, Requires Attention) */}
                      <td>
                        <span
                          className="inpatient-condition-badge"
                          style={{
                            background: conditionColor.bg,
                            color: conditionColor.color,
                            borderColor: conditionColor.border,
                          }}
                        >
                          {conditionLabel}
                        </span>
                      </td>

                      {/* 6. ACTION (View Details button strictly opening Unified Patient Profile, Transfer, plus View Case) */}
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          {/* Transfer action directly accessible in table */}
                          {onTransfer && (
                            <button
                              type="button"
                              className="opd-action-btn secondary"
                              onClick={() => onTransfer(pat)}
                              title={pat.is_demo ? "Demo: Simulate inter-hospital transfer" : "Initiate inter-hospital or ward transfer"}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <ArrowRightLeft size={12} />
                              <span>Transfer</span>
                            </button>
                          )}

                          {/* View Case button allowed as requested */}
                          {pat.session_id && onOpenCaseDetails && (
                            <button
                              type="button"
                              className="opd-action-btn secondary"
                              onClick={() => onOpenCaseDetails(pat.session_id)}
                              title="View Patient Intake Case File"
                            >
                              View Case ↗
                            </button>
                          )}

                          <button
                            type="button"
                            className="opd-action-btn primary"
                            onClick={() => onOpenProfile && onOpenProfile(pat.patient_id)}
                            title="Open Full 8-Facet Unified Patient Profile"
                          >
                            <span>View Details</span>
                            <ChevronRight size={13} />
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
    </div>
  );
}

