import React, { useState, useEffect } from "react";

export default function CarePlansModal({
  apiBase,
  patient,
  currentStaff,
  onClose,
}) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [instructions, setInstructions] = useState("");
  const [medications, setMedications] = useState("");
  const [specialInst, setSpecialInst] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hospId = currentStaff?.hospital_id || "hosp-medikiosk";

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/staff/patient-care/patients/${patient.patient_id}/care-plans`);
      const data = await res.json();
      if (data.care_plans) {
        setPlans(data.care_plans);
      }
    } catch (err) {
      console.error("Care plans fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [patient.patient_id]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!instructions.trim()) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(
        `${apiBase}/staff/patient-care/patients/${patient.patient_id}/care-plans?hospital_id=${hospId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            care_instructions: instructions.trim(),
            medications: medications.trim(),
            special_instructions: specialInst.trim(),
            staff_id: currentStaff?.staff_id,
            session_id: patient.session_id || null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to create care plan");

      setInstructions("");
      setMedications("");
      setSpecialInst("");
      fetchPlans();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div className="pc-modal-window" style={{ maxWidth: "760px" }} onClick={(e) => e.stopPropagation()}>
        <div className="pc-modal-header">
          <h3>
            <span>📋</span> Personalized Inpatient Care Plans — {patient.full_name || patient.patient_name}
          </h3>
          <button type="button" className="btn-pc-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="pc-modal-body">
          {error && (
            <div className="doc-auth-alert doc-alert-danger">
              <span>⚠️</span> <span>{error}</span>
            </div>
          )}

          {/* CREATE NEW CARE PLAN FORM */}
          <form onSubmit={handleCreatePlan} style={{ background: "var(--paper)", padding: "18px", borderRadius: "8px", border: "1px solid var(--line)" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "var(--teal-deep)", fontSize: "15px" }}>
              + Add Clinical Inpatient Care Directives
            </h4>

            <div className="vital-input-group" style={{ marginBottom: "12px" }}>
              <label>Care & Observation Instructions *</label>
              <textarea
                rows="2"
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--line)", fontFamily: "inherit" }}
                placeholder="e.g. Vitals monitoring Q4H. Elevate head of bed 30°. Fall risk precautions."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
              />
            </div>

            <div className="vital-input-group" style={{ marginBottom: "12px" }}>
              <label>Administered & Scheduled Medications</label>
              <input
                type="text"
                placeholder="e.g. Metoprolol 25mg BD, Paracetamol 650mg SOS"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
              />
            </div>

            <div className="vital-input-group" style={{ marginBottom: "16px" }}>
              <label>Dietary, Mobility & Special Instructions</label>
              <input
                type="text"
                placeholder="e.g. Low sodium cardiac diet, assisted ambulation only"
                value={specialInst}
                onChange={(e) => setSpecialInst(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-pc-primary" disabled={saving || !instructions.trim()}>
              {saving ? "Saving Care Plan..." : "Save Care Plan"}
            </button>
          </form>

          {/* EXISTING CARE PLANS LIST */}
          <div>
            <h4 style={{ margin: "0 0 12px 0", color: "var(--teal-deep)", fontSize: "15px" }}>
              Active & Historical Care Directives ({plans.length})
            </h4>

            {loading ? (
              <p style={{ fontSize: "13px", color: "var(--ink-soft)" }}>Loading care plans...</p>
            ) : plans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--ink-soft)", fontSize: "13px" }}>
                No care plans recorded yet for this patient.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {plans.map((cp) => (
                  <div key={cp.plan_id} style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--teal-deep)" }}>
                        PLAN #{cp.plan_id} • Status: {cp.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                        {new Date(cp.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        {cp.staff_name && ` by ${cp.staff_name}`}
                      </span>
                    </div>

                    <div style={{ fontSize: "14px", color: "var(--ink)", marginBottom: "6px" }}>
                      <strong>Care:</strong> {cp.care_instructions}
                    </div>

                    {cp.medications && (
                      <div style={{ fontSize: "13px", color: "var(--ink-soft)", marginBottom: "4px" }}>
                        💊 <strong>Medications:</strong> {cp.medications}
                      </div>
                    )}

                    {cp.special_instructions && (
                      <div style={{ fontSize: "13px", color: "var(--ink-soft)" }}>
                        📌 <strong>Diet / Mobility:</strong> {cp.special_instructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
