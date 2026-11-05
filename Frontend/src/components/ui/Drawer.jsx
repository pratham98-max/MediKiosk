import React, { useEffect } from "react";
import MewsChip from "./MewsChip";

export default function Drawer({
  isOpen,
  onClose,
  patient,
  onOpenFullProfile,
  onRecordVitals,
  onUpdateCarePlan,
  onTransfer,
  onDischarge,
  onOpenECG,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !patient) return null;

  const currentMews = patient.mews_score || 0;
  const isIcu = patient.bed_type === "ICU" || patient.needs_icu;

  return (
    <div className="vt-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="vt-drawer" onClick={(e) => e.stopPropagation()}>
        {/* DRAWER HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--vt-card-border)", paddingBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "var(--vt-dark-green)" }}>
                {patient.patient_name || patient.name || "Patient Overview"}
              </h3>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: isIcu ? "var(--vt-crimson-soft)" : "#e8f7ea",
                  color: isIcu ? "var(--vt-crimson)" : "var(--vt-mid-green)",
                }}
              >
                {patient.bed_number ? `Bed ${patient.bed_number} (${patient.ward || "Ward A"})` : "Outpatient"}
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--vt-text-muted)", marginTop: "2px", fontFamily: "monospace" }}>
              PAT-ID: {patient.patient_id || patient.id} • {patient.age}y / {patient.gender || "--"}
            </div>
          </div>

          <button
            type="button"
            className="vt-icon-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>

        {/* PRIMARY CTA: OPEN FULL 8-FACET UNIFIED PROFILE */}
        <button
          type="button"
          className="vt-btn-cta-admit"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => onOpenFullProfile && onOpenFullProfile(patient.patient_id || patient.id)}
        >
          📋 Open 8-Facet Unified Clinical Profile →
        </button>

        {/* QUICK VITALS TILES */}
        <div style={{ background: "#f8faf5", border: "1px solid var(--vt-card-border)", borderRadius: "18px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <strong style={{ fontSize: "13px", color: "var(--vt-dark-green)" }}>Current Bedside Vitals</strong>
            <MewsChip score={currentMews} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", textAlign: "center" }}>
            <div style={{ background: "#ffffff", padding: "10px", borderRadius: "12px", border: "1px solid #edf4ea" }}>
              <span style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>Heart Rate</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--vt-text-main)" }}>
                {patient.heart_rate || "--"} <small style={{ fontSize: "10px", fontWeight: 400 }}>bpm</small>
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "10px", borderRadius: "12px", border: "1px solid #edf4ea" }}>
              <span style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>Blood Pressure</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--vt-text-main)" }}>
                {patient.blood_pressure_sys ? `${patient.blood_pressure_sys}/${patient.blood_pressure_dia || 80}` : "--"}
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "10px", borderRadius: "12px", border: "1px solid #edf4ea" }}>
              <span style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>Oxygen Sat</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--vt-text-main)" }}>
                {patient.oxygen_saturation || "--"} <small style={{ fontSize: "10px", fontWeight: 400 }}>%</small>
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "10px", borderRadius: "12px", border: "1px solid #edf4ea" }}>
              <span style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>Resp. Rate</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--vt-text-main)" }}>
                {patient.respiratory_rate || "--"} <small style={{ fontSize: "10px", fontWeight: 400 }}>/min</small>
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "10px", borderRadius: "12px", border: "1px solid #edf4ea" }}>
              <span style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>Temperature</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--vt-text-main)" }}>
                {patient.temperature ? `${Number(patient.temperature).toFixed(1)}°C` : "--"}
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "10px", borderRadius: "12px", border: "1px solid #edf4ea" }}>
              <span style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>ML Risk</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: patient.deterioration_risk >= 0.4 ? "var(--vt-crimson)" : "var(--vt-mid-green)" }}>
                {patient.deterioration_risk != null ? `${Math.round(patient.deterioration_risk * 100)}%` : "--"}
              </div>
            </div>
          </div>
        </div>

        {/* CLINICAL COMPLAINT & NOTES */}
        <div style={{ fontSize: "12.5px", lineHeight: 1.45 }}>
          <strong style={{ color: "var(--vt-dark-green)", display: "block", marginBottom: "4px" }}>
            Chief Complaint / Admission Diagnosis:
          </strong>
          <div style={{ background: "#f8faf5", padding: "10px 14px", borderRadius: "12px", border: "1px solid var(--vt-card-border)" }}>
            {patient.chief_complaint || patient.diagnosis || "Routine Inpatient Monitoring & Clinical Care"}
          </div>
        </div>

        {/* DISCHARGE SAFETY GATE */}
        <div style={{ background: currentMews >= 3 ? "var(--vt-amber-soft)" : "#f0f8ec", border: `1px solid ${currentMews >= 3 ? "#fcd34d" : "#cce8c5"}`, borderRadius: "14px", padding: "12px 14px", fontSize: "12px" }}>
          <strong style={{ display: "block", color: currentMews >= 3 ? "var(--vt-amber)" : "var(--vt-dark-green)" }}>
            {currentMews >= 3 ? "⚠️ Discharge Safety Gate Locked" : "✓ Discharge Criteria Eligible"}
          </strong>
          <p style={{ margin: "4px 0 0", color: "var(--vt-text-main)", lineHeight: 1.4 }}>
            {currentMews >= 3
              ? `Patient MEWS score (${currentMews} pts) is ≥ 3. Discharge requires clinical stabilisation or supervisory medical signoff.`
              : "All primary vital sign parameters and deterioration indicators are within safe discharge parameters."}
          </p>
        </div>

        {/* RULE 11 & RULE 12 DISCLAIMERS */}
        <div style={{ fontSize: "11px", color: "var(--vt-text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ padding: "8px 10px", background: "#f9fbf8", borderRadius: "8px", border: "1px solid #edf4ea" }}>
            ℹ️ <strong>Rule 11 Compliance:</strong> AD8232 ECG telemetry waveform is synthetically simulated for testing.
          </div>
          <div style={{ padding: "8px 10px", background: "#f9fbf8", borderRadius: "8px", border: "1px solid #edf4ea" }}>
            ℹ️ <strong>Rule 12 Compliance:</strong> Algorithmic deterioration prediction trained on synthetic cohort dataset.
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {onRecordVitals && (
            <button
              type="button"
              className="vt-btn-cta-admit"
              style={{ fontSize: "12px", padding: "8px 12px" }}
              onClick={onRecordVitals}
            >
              🩺 Record Vitals
            </button>
          )}

          {onOpenECG && (
            <button
              type="button"
              className="vt-btn-alert-view"
              style={{ padding: "8px 12px", justifyContent: "center" }}
              onClick={onOpenECG}
            >
              ❤️ ECG Oscilloscope
            </button>
          )}

          {onUpdateCarePlan && (
            <button
              type="button"
              className="vt-btn-alert-view"
              style={{ padding: "8px 12px", justifyContent: "center" }}
              onClick={onUpdateCarePlan}
            >
              📋 Care Plan
            </button>
          )}

          {onTransfer && (
            <button
              type="button"
              className="vt-btn-alert-view"
              style={{ padding: "8px 12px", justifyContent: "center" }}
              onClick={onTransfer}
            >
              🚑 Transfer Patient
            </button>
          )}

          {onDischarge && (
            <button
              type="button"
              className="vt-btn-alert-ack"
              style={{ gridColumn: "span 2", padding: "10px", fontSize: "12.5px" }}
              onClick={onDischarge}
            >
              🚪 Discharge Patient & Vacate Bed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
