import React, { useState } from "react";
import { isDemoPatientId, updateDemoPatient } from "../vital_track/demoPatientsData";

export default function BedManagementModal({
  apiBase,
  patient,
  beds,
  currentStaff,
  onClose,
  onBedUpdated,
}) {
  const [selectedBed, setSelectedBed] = useState("");
  const [overrideDischarge, setOverrideDischarge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const hospId = currentStaff?.hospital_id || "hosp-medikiosk";
  const vacantBeds = beds.filter((b) => b.status === "vacant");
  const mewsScore = patient.mews_score || 0;
  const isHighRiskDischarge = mewsScore >= 3;

  const handleAssignBed = async () => {
    if (!selectedBed) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (isDemoPatientId(patient.patient_id)) {
        updateDemoPatient(patient.patient_id, {
          is_admitted: false,
          admission_status: "discharged",
          bed_status: "vacated",
          bed_number: null,
          discharge_ready: true,
        });
        setSuccessMsg(`Patient discharged successfully. Bed freed.`);
        if (onBedUpdated) onBedUpdated();
        return;
      }

      const res = await fetch(
        `${apiBase}/staff/patient-care/patients/${patient.patient_id}/bed?hospital_id=${hospId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bed_number: selectedBed,
            session_id: patient.session_id || null,
            staff_id: currentStaff?.staff_id,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to assign bed");

      setSuccessMsg(`Patient assigned to bed ${selectedBed} successfully.`);
      if (onBedUpdated) onBedUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeICU = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (isDemoPatientId(patient.patient_id)) {
        updateDemoPatient(patient.patient_id, {
          bed_number: "ICU-205",
          bed_type: "ICU",
          ward: "Intensive Care Unit",
          needs_icu: true,
        });
        setSuccessMsg(`Patient upgraded to ICU Bed ICU-205 successfully.`);
        if (onBedUpdated) onBedUpdated();
        return;
      }

      const res = await fetch(
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to upgrade patient to ICU");

      setSuccessMsg(`Patient upgraded to ICU Bed ${data.bed_number} successfully.`);
      if (onBedUpdated) onBedUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (isDemoPatientId(patient.patient_id)) {
        updateDemoPatient(patient.patient_id, {
          is_admitted: false,
          admission_status: "discharged",
          bed_status: "vacated",
          bed_number: null,
          discharge_ready: true,
        });
        setSuccessMsg(`Patient discharged successfully. Bed freed.`);
        if (onBedUpdated) onBedUpdated();
        return;
      }

      const res = await fetch(
        `${apiBase}/staff/patient-care/patients/${patient.patient_id}/discharge?hospital_id=${hospId}&override=${overrideDischarge}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to discharge patient");

      setSuccessMsg(`Patient discharged successfully. Freed bed: ${data.freed_bed || "N/A"}`);
      if (onBedUpdated) onBedUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div className="pc-modal-window" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
        <div className="pc-modal-header">
          <h3>
            <span>🛏️</span> Bed Assignment & Inpatient Disposition
          </h3>
          <button type="button" className="btn-pc-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="pc-modal-body">
          {/* PATIENT INFO */}
          <div style={{ background: "var(--paper)", padding: "14px", borderRadius: "8px" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
              {patient.full_name || patient.patient_name}
            </div>
            <div style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>
              Currently Assigned: <strong>{patient.bed_number ? `${patient.bed_number} (${patient.ward || patient.bed_type})` : "No Bed (Outpatient / Unassigned)"}</strong>
            </div>
            <div style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>
              Current MEWS: <strong>{mewsScore}</strong> • Deterioration Risk:{" "}
              <strong>{Math.round((patient.deterioration_risk || 0) * 100)}%</strong>
            </div>
          </div>

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

          {/* ACTION 1: ASSIGN VACANT BED */}
          <div style={{ border: "1px solid var(--line)", padding: "16px", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "var(--teal-deep)", fontSize: "15px" }}>
              1. Assign or Move to Vacant Ward Bed
            </h4>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <select
                value={selectedBed}
                onChange={(e) => setSelectedBed(e.target.value)}
                style={{ flex: 1, padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--panel)" }}
                disabled={loading}
              >
                <option value="">-- Select Vacant Bed ({vacantBeds.length} available) --</option>
                {vacantBeds.map((b) => (
                  <option key={b.bed_id} value={b.bed_number}>
                    {b.bed_number} — {b.bed_type.toUpperCase()} ({b.ward})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-pc-primary"
                onClick={handleAssignBed}
                disabled={!selectedBed || loading}
              >
                Assign Bed
              </button>
            </div>
          </div>

          {/* ACTION 2: UPGRADE TO ICU */}
          <div style={{ border: "1px solid var(--line)", padding: "16px", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 6px 0", color: "var(--teal-deep)", fontSize: "15px" }}>
              2. Elevate to Intensive Care Unit (ICU)
            </h4>
            <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--ink-soft)" }}>
              Immediately reassigns deteriorating patient to the first available vacant ICU bed.
            </p>
            <button
              type="button"
              className="btn-pc-primary"
              style={{ background: "#a8321a" }}
              onClick={handleUpgradeICU}
              disabled={loading || patient.bed_type === "ICU"}
            >
              {patient.bed_type === "ICU" ? "Patient Already in ICU" : "⚡ Elevate to ICU Now"}
            </button>
          </div>

          {/* ACTION 3: CLINICAL DISCHARGE */}
          <div style={{ border: "1px solid var(--line)", padding: "16px", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 6px 0", color: "var(--teal-deep)", fontSize: "15px" }}>
              3. Clinical Discharge & Bed Release
            </h4>
            <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "var(--ink-soft)" }}>
              Completes clinical encounter, frees assigned bed, and records discharge readiness.
            </p>

            {isHighRiskDischarge && (
              <div style={{ background: "#fff5f2", border: "1px solid #ffd5cc", padding: "10px", borderRadius: "6px", marginBottom: "12px", fontSize: "12px", color: "#a8321a" }}>
                ⚠️ <strong>Clinical Safety Guard:</strong> Patient MEWS score is {mewsScore} (≥ 3). Normal discharge is
                blocked without explicit clinical authorization.
                <div style={{ marginTop: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={overrideDischarge}
                      onChange={(e) => setOverrideDischarge(e.target.checked)}
                    />
                    Physician Clinical Override Authorized
                  </label>
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-pc-secondary"
              style={{ color: "#a8321a", borderColor: "#a8321a" }}
              onClick={handleDischarge}
              disabled={loading || (isHighRiskDischarge && !overrideDischarge)}
            >
              Confirm Discharge & Release Bed
            </button>
          </div>
        </div>

        <div className="pc-modal-footer">
          <button type="button" className="btn-pc-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
