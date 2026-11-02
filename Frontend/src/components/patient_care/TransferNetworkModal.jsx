import React, { useState, useEffect } from "react";

export default function TransferNetworkModal({
  apiBase,
  patient,
  currentStaff,
  onClose,
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [initiatedTransfers, setInitiatedTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHosp, setSelectedHosp] = useState(null);
  const [transferNotes, setTransferNotes] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const needsIcu = Boolean(patient.needs_icu || patient.bed_type === "ICU" || (patient.mews_score || 0) >= 4);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase}/staff/patient-care/patients/${patient.patient_id}/transfers?needs_icu=${needsIcu}&chief_complaint=${encodeURIComponent(patient.department || "")}`
      );
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
      if (data.initiated_transfers) {
        setInitiatedTransfers(data.initiated_transfers);
      }
    } catch (err) {
      console.error("Transfer recommendations fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [patient.patient_id]);

  const handleInitiate = async (rec) => {
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(
        `${apiBase}/staff/patient-care/patients/${patient.patient_id}/transfers/initiate?hospital_id=${currentStaff?.hospital_id || "hosp-medikiosk"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_hospital_name: rec.target_hospital_name,
            distance_km: rec.distance_km,
            bed_type_needed: rec.bed_type_needed,
            specialization: rec.specialization,
            transfer_score: rec.transfer_score,
            contact_phone: contactPhone || rec.contact_phone,
            notes: transferNotes || `Priority transfer for ${rec.bed_type_needed} bed`,
            staff_id: currentStaff?.staff_id,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to initiate transfer");

      setSuccessMsg(`Transfer request to ${rec.target_hospital_name} initiated successfully.`);
      setSelectedHosp(null);
      setTransferNotes("");
      fetchTransfers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div className="pc-modal-window" style={{ maxWidth: "840px" }} onClick={(e) => e.stopPropagation()}>
        <div className="pc-modal-header">
          <h3>
            <span>🚑</span> Inter-Hospital Network Transfer & Bed Coordination
          </h3>
          <button type="button" className="btn-pc-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="pc-modal-body">
          {/* PATIENT SUMMARY */}
          <div style={{ background: "var(--paper)", padding: "14px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{patient.full_name || patient.patient_name}</strong> • {patient.age}y
              <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "2px" }}>
                Target Bed Type: <strong>{needsIcu ? "ICU Bed Required" : "General Ward Bed"}</strong> • MEWS: {patient.mews_score || 0}
              </div>
            </div>
            <div>
              <span className={`pc-bed-type-pill ${needsIcu ? "pill-icu" : "pill-general"}`}>
                {needsIcu ? "High Acuity (ICU)" : "Standard Acuity"}
              </span>
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

          {/* TRANSFER RECOMMENDATIONS */}
          <div>
            <h4 style={{ margin: "0 0 12px 0", color: "var(--teal-deep)", fontSize: "15px" }}>
              Hospital Network Transfer Rankings (Distance, Beds & Specialization)
            </h4>

            {loading ? (
              <p style={{ fontSize: "13px", color: "var(--ink-soft)" }}>Evaluating partner hospital capacities...</p>
            ) : recommendations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--ink-soft)" }}>
                No active network transfer options returned.
              </div>
            ) : (
              <div>
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="transfer-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div className="transfer-rank-badge">
                        #{idx + 1}
                      </div>

                      <div className="transfer-details">
                        <h5>{rec.target_hospital_name}</h5>
                        <div className="transfer-meta">
                          <span>📍 {rec.distance_km} km ({rec.estimated_transit_minutes} mins)</span>
                          <span>🛏️ {rec.available_target_beds} {rec.bed_type_needed} beds available</span>
                          <span>🌟 {rec.success_rate}% success rate</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "4px" }}>
                          🏥 Specialty: {rec.specialization}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--teal-deep)", marginBottom: "6px" }}>
                        Score: {rec.transfer_score}
                      </div>
                      <button
                        type="button"
                        className="btn-pc-primary"
                        style={{ padding: "6px 14px", fontSize: "12px" }}
                        onClick={() => setSelectedHosp(rec)}
                        disabled={submitting}
                      >
                        Initiate Transfer →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INITIATE TRANSFER MODAL PROMPT */}
          {selectedHosp && (
            <div style={{ background: "#f5fbf9", border: "1px solid var(--teal)", borderRadius: "8px", padding: "16px", marginTop: "14px" }}>
              <h5 style={{ margin: "0 0 10px 0", color: "var(--teal-deep)", fontSize: "14px" }}>
                Confirm Transfer Request to: {selectedHosp.target_hospital_name}
              </h5>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div className="vital-input-group">
                  <label>Receiving Facility Phone</label>
                  <input
                    type="text"
                    value={contactPhone || selectedHosp.contact_phone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
                <div className="vital-input-group">
                  <label>Clinical Handoff Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. SBAR handoff provided; telemetry en route"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-pc-secondary"
                  onClick={() => setSelectedHosp(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-pc-primary"
                  onClick={() => handleInitiate(selectedHosp)}
                  disabled={submitting}
                >
                  {submitting ? "Initiating..." : "Confirm & Dispatch Transfer 🚑"}
                </button>
              </div>
            </div>
          )}

          {/* INITIATED TRANSFERS HISTORY */}
          {initiatedTransfers.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h5 style={{ margin: "0 0 10px 0", color: "var(--teal-deep)", fontSize: "14px" }}>
                Transfer History for Patient ({initiatedTransfers.length})
              </h5>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {initiatedTransfers.map((t) => (
                  <div key={t.transfer_id} style={{ background: "#ffffff", border: "1px solid var(--line)", padding: "10px 14px", borderRadius: "6px", fontSize: "13px", display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <strong>Target:</strong> {t.to_hospital_name} ({t.bed_type_needed} Bed)
                      <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>Notes: {t.notes || "None"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="status-occupied" style={{ fontSize: "11px" }}>{t.transfer_status.toUpperCase()}</span>
                      <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>{new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
