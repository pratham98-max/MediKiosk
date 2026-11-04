import React, { useState, useEffect } from "react";

export default function AdmitPatientModal({
  apiBase,
  beds,
  currentStaff,
  preSelectedBed = "",
  onClose,
  onAdmitted,
}) {
  const [tab, setTab] = useState("existing"); // "existing" | "emergency"
  const [unassignedPatients, setUnassignedPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedBed, setSelectedBed] = useState(preSelectedBed || "");
  const [admissionNotes, setAdmissionNotes] = useState("");

  // New emergency patient fields
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newGender, setNewGender] = useState("male");
  const [newPhone, setNewPhone] = useState("");
  const [newTriage, setNewTriage] = useState(2);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const hospId = currentStaff?.hospital_id || "hosp-medikiosk";
  const vacantBeds = beds.filter((b) => b.status === "vacant");

  // Fetch unassigned patients
  useEffect(() => {
    const fetchUnassigned = async () => {
      setLoadingPatients(true);
      try {
        const res = await fetch(
          `${apiBase}/staff/patient-care/unassigned-patients?hospital_id=${hospId}`
        );
        const data = await res.json();
        if (data.patients) {
          setUnassignedPatients(data.patients);
          if (data.patients.length > 0 && !selectedPatientId) {
            setSelectedPatientId(data.patients[0].patient_id);
          }
        }
      } catch (err) {
        console.error("Failed to load unassigned patients:", err);
      } finally {
        setLoadingPatients(false);
      }
    };
    fetchUnassigned();
  }, [apiBase, hospId]);

  // Set default bed if not set
  useEffect(() => {
    if (!selectedBed && vacantBeds.length > 0) {
      setSelectedBed(vacantBeds[0].bed_number);
    }
  }, [vacantBeds, selectedBed]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!selectedBed) {
      setError("Please select a vacant bed to allocate.");
      return;
    }

    setSubmitting(true);
    try {
      let payload = {
        bed_number: selectedBed,
        staff_id: currentStaff?.staff_id || "staff-01",
        hospital_id: hospId,
      };

      if (tab === "existing") {
        if (!selectedPatientId) {
          throw new Error("Please select a patient to admit.");
        }
        payload.patient_id = selectedPatientId;
        payload.chief_complaint = admissionNotes;
      } else {
        if (!newName.trim()) {
          throw new Error("Patient full name is required for admission.");
        }
        payload.full_name = newName.trim();
        payload.age = parseInt(newAge, 10) || 45;
        payload.gender = newGender;
        payload.phone = newPhone.trim();
        payload.triage_level = parseInt(newTriage, 10);
        payload.chief_complaint = admissionNotes || "Emergency admission";
      }

      const res = await fetch(
        `${apiBase}/staff/patient-care/admit?hospital_id=${hospId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Admission failed.");
      }

      setSuccessMsg(data.message || "Patient admitted and bed allocated successfully.");
      setTimeout(() => {
        if (onAdmitted) onAdmitted();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPatientObj = unassignedPatients.find(
    (p) => p.patient_id === selectedPatientId
  );

  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div
        className="pc-modal-window"
        style={{ maxWidth: "660px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pc-modal-header" style={{ flexShrink: 0 }}>
          <div className="pc-modal-title">
            <span className="pc-modal-title-icon">🏥</span>
            <div>
              <h3>Inpatient Admission & Bed Allocation</h3>
              <p>Admit a patient to the inpatient ward and assign a designated hospital bed.</p>
            </div>
          </div>
          <button className="pc-btn-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 24px", flexShrink: 0, background: "#f8f9fa" }}>
          <button
            type="button"
            className={`btn-ward-filter ${tab === "existing" ? "active" : ""}`}
            style={{ borderRadius: "0", borderBottom: tab === "existing" ? "2px solid var(--teal)" : "none", padding: "10px 16px", fontWeight: 600 }}
            onClick={() => setTab("existing")}
          >
            📋 Admit Existing OPD / Triage Patient
          </button>
          <button
            type="button"
            className={`btn-ward-filter ${tab === "emergency" ? "active" : ""}`}
            style={{ borderRadius: "0", borderBottom: tab === "emergency" ? "2px solid var(--teal)" : "none", padding: "10px 16px", fontWeight: 600 }}
            onClick={() => setTab("emergency")}
          >
            🚨 Emergency / Walk-in Admission
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div className="pc-modal-body" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {error && <div className="pc-error-banner" style={{ marginBottom: "16px" }}>⚠️ {error}</div>}
            {successMsg && (
              <div className="pc-info-banner" style={{ background: "#e8f5e9", borderColor: "#a5d6a7", color: "#2e7d32", marginBottom: "16px" }}>
                ✓ {successMsg}
              </div>
            )}

            {tab === "existing" ? (
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                    Select Patient Waiting in Hospital ({unassignedPatients.length} eligible)
                  </label>
                  {loadingPatients ? (
                    <p style={{ fontSize: "12px", color: "var(--ink-soft)" }}>Loading patient census...</p>
                  ) : unassignedPatients.length === 0 ? (
                    <div style={{ padding: "12px", background: "var(--bg-soft)", borderRadius: "6px", fontSize: "13px" }}>
                      No unassigned patients found. Switch to the <strong>Emergency Admission</strong> tab to register a new walk-in patient.
                    </div>
                  ) : (
                    <select
                      className="pc-input-field"
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)" }}
                    >
                      {unassignedPatients.map((p) => (
                        <option key={p.patient_id} value={p.patient_id}>
                          {p.full_name} ({p.age}y / {p.gender}) • ID: {p.patient_id} {p.has_intake_red_flag ? "🚨 [RED FLAG]" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedPatientObj && (
                  <div style={{ background: "var(--bg-soft)", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
                    <div><strong>Patient:</strong> {selectedPatientObj.full_name} ({selectedPatientObj.age}y / {selectedPatientObj.gender})</div>
                    <div><strong>Phone:</strong> {selectedPatientObj.phone || "N/A"} • <strong>ID:</strong> {selectedPatientObj.patient_id}</div>
                    {selectedPatientObj.doctor_name && <div><strong>Consultant:</strong> {selectedPatientObj.doctor_name} ({selectedPatientObj.department})</div>}
                    {selectedPatientObj.has_intake_red_flag && (
                      <div style={{ color: "#d92d20", marginTop: "4px", fontWeight: 600 }}>
                        🚨 Active Intake Red Flag: {selectedPatientObj.intake_red_flag_reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      className="pc-input-field"
                      placeholder="e.g. Ramesh Chandra"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>Age *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="125"
                      className="pc-input-field"
                      placeholder="e.g. 54"
                      value={newAge}
                      onChange={(e) => setNewAge(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>Gender</label>
                    <select
                      className="pc-input-field"
                      value={newGender}
                      onChange={(e) => setNewGender(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>Phone Number</label>
                    <input
                      type="tel"
                      className="pc-input-field"
                      placeholder="e.g. 9876543210"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>Triage Priority</label>
                    <select
                      className="pc-input-field"
                      value={newTriage}
                      onChange={(e) => setNewTriage(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                    >
                      <option value="1">Level 1 - Resuscitation</option>
                      <option value="2">Level 2 - Emergency</option>
                      <option value="3">Level 3 - Urgent</option>
                      <option value="4">Level 4 - Semi-urgent</option>
                      <option value="5">Level 5 - Non-urgent</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Bed Allocation Selection */}
            <div style={{ marginTop: "16px", marginBottom: "16px" }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                Target Bed Allocation * ({vacantBeds.length} vacant beds available)
              </label>
              {vacantBeds.length === 0 ? (
                <div style={{ color: "#d92d20", fontSize: "13px", fontWeight: 600 }}>
                  ⚠️ No vacant beds available in this hospital! Please discharge or transfer a patient first.
                </div>
              ) : (
                <select
                  className="pc-input-field"
                  value={selectedBed}
                  onChange={(e) => setSelectedBed(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", fontWeight: 600 }}
                >
                  {vacantBeds.map((b) => (
                    <option key={b.bed_id} value={b.bed_number}>
                      {b.bed_number} — {b.ward} ({b.bed_type === "ICU" ? "🚨 ICU Bed" : "General Bed"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                Admission Reason / Clinical Directives (Optional)
              </label>
              <textarea
                className="pc-input-field"
                rows={3}
                placeholder="e.g. Admitted for continuous cardiac monitoring and IV antibiotic therapy."
                value={admissionNotes}
                onChange={(e) => setAdmissionNotes(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
              />
            </div>
          </div>

          <div className="pc-modal-footer" style={{ flexShrink: 0, padding: "14px 24px", borderTop: "1px solid var(--border)", background: "#f8f9fa", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting} style={{ padding: "8px 16px", borderRadius: "6px" }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || vacantBeds.length === 0 || (tab === "existing" && !selectedPatientId)}
              style={{ background: "var(--teal)", color: "#fff", padding: "10px 20px", fontWeight: 600, borderRadius: "6px", border: "none", cursor: "pointer" }}
            >
              {submitting ? "Processing Admission..." : tab === "existing" ? "Admit & Allocate Bed" : "Register & Allocate Bed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
