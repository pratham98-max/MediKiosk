import React, { useState, useEffect } from "react";

export default function PatientWelcome({
  patient,
  apiBase,
  onProceed,
}) {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("General Medicine");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [customDoctorName, setCustomDoctorName] = useState("");
  const [visitReason, setVisitReason] = useState("New Health Concern");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [pastSessions, setPastSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch doctors and previous sessions on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // 1. Fetch available doctors
        const docRes = await fetch(`${apiBase}/doctors`);
        if (docRes.ok) {
          const docData = await docRes.json();
          if (isMounted && docData.success) {
            setDoctors(docData.doctors || []);
            setDepartments(docData.departments || []);
            // Set default doctor
            if (docData.doctors && docData.doctors.length > 0) {
              const defaultDoc = docData.doctors.find(
                (d) => d.department === "General Medicine"
              ) || docData.doctors[0];
              setSelectedDoctor(defaultDoc);
            }
          }
        }

        // 2. Fetch past sessions for this patient
        if (patient?.patient_id) {
          const profRes = await fetch(`${apiBase}/patient/profile/${patient.patient_id}`);
          if (profRes.ok) {
            const profData = await profRes.json();
            if (isMounted && profData.success) {
              setPastSessions(profData.sessions || []);
            }
          }
        }
      } catch (err) {
        console.error("Error loading welcome data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [apiBase, patient]);

  // Handle department filter change
  const handleDepartmentChange = (dept) => {
    setSelectedDept(dept);
    // Suggest doctor in this department
    const matchingDoctor = doctors.find((d) => d.department === dept);
    if (matchingDoctor) {
      setSelectedDoctor(matchingDoctor);
      setCustomDoctorName("");
    } else {
      setSelectedDoctor(null);
    }
  };

  // Filtered doctors list
  const filteredDoctors = doctors.filter((doc) => {
    if (!selectedDept || selectedDept === "Other / General Consultation") return true;
    return doc.department === selectedDept;
  });

  const handleStartConsultation = () => {
    const finalDoctorName = customDoctorName.trim()
      ? customDoctorName.trim()
      : selectedDoctor?.name || "Dr. On-Duty Physician";

    const finalDepartment = selectedDept || "General Medicine";

    onProceed({
      doctorName: finalDoctorName,
      department: finalDepartment,
      visitReason,
      additionalNotes,
    });
  };

  return (
    <div className="welcome-container">
      {/* Patient Greeting & Status Banner */}
      <div className="welcome-banner">
        <div className="welcome-badge">
          <span>🩺</span> Patient Self-Check-in & Intake
        </div>
        <div className="welcome-header-content">
          <div className="patient-avatar-large">
            {patient?.full_name ? patient.full_name.charAt(0).toUpperCase() : "P"}
          </div>
          <div className="welcome-title-group">
            <h1>Welcome, {patient?.full_name || "Valued Patient"}!</h1>
            <p className="welcome-subtitle">
              MediKiosk will gather your medical symptoms, pre-triage your case, and cross-verify any previous medical records before your doctor consultation.
            </p>
            <div className="patient-meta-tags">
              <span className="meta-tag">
                <strong>ID:</strong> {patient?.patient_id || "PAT-NEW"}
              </span>
              {patient?.age && (
                <span className="meta-tag">
                  <strong>Age:</strong> {patient.age} yrs
                </span>
              )}
              {patient?.gender && (
                <span className="meta-tag">
                  <strong>Gender:</strong> {patient.gender}
                </span>
              )}
              {patient?.phone && (
                <span className="meta-tag">
                  <strong>Phone:</strong> {patient.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Doctor Selection & Intake Options */}
      <div className="welcome-grid">
        {/* Left Column: Doctor Selection Card */}
        <div className="welcome-card main-selection-card">
          <div className="card-header">
            <span className="step-pill">Step 1</span>
            <h2>Select Doctor or Department You Are Visiting</h2>
            <p>Tell us who you are seeing today so we can route your clinical summary.</p>
          </div>

          {/* Department Filter Tabs */}
          <div className="section-block">
            <label className="input-label">Select Medical Department:</label>
            <div className="dept-chips-list">
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  className={`dept-chip ${selectedDept === dept ? "active" : ""}`}
                  onClick={() => handleDepartmentChange(dept)}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Doctor Cards Selector */}
          <div className="section-block">
            <label className="input-label">Choose Doctor on Duty:</label>
            {loading ? (
              <div className="loading-placeholder">Loading doctors directory...</div>
            ) : (
              <div className="doctors-grid">
                {filteredDoctors.map((doc) => {
                  const isSelected =
                    !customDoctorName.trim() && selectedDoctor?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      className={`doctor-option-card ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setCustomDoctorName("");
                      }}
                    >
                      <div className="doctor-card-icon">👨‍⚕️</div>
                      <div className="doctor-card-details">
                        <div className="doc-name">{doc.name}</div>
                        <div className="doc-specialty">{doc.specialty}</div>
                        <div className="doc-room">📍 {doc.room}</div>
                      </div>
                      <div className="radio-indicator">
                        <span className={`radio-dot ${isSelected ? "checked" : ""}`}></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Doctor Name input option */}
          <div className="section-block custom-doc-block">
            <label className="input-label" htmlFor="custom-doc-input">
              Or Type Doctor Name Directly:
            </label>
            <div className="custom-input-wrap">
              <span className="input-icon">✍️</span>
              <input
                id="custom-doc-input"
                type="text"
                placeholder="e.g. Dr. Alok Sen or Visiting Specialist"
                value={customDoctorName}
                onChange={(e) => {
                  setCustomDoctorName(e.target.value);
                  if (e.target.value.trim()) {
                    setSelectedDoctor(null);
                  }
                }}
              />
            </div>
          </div>

          {/* Reason for Visit */}
          <div className="section-block">
            <label className="input-label">Reason for Today&apos;s Visit:</label>
            <div className="visit-reason-radios">
              {[
                "New Health Concern",
                "Routine Health Checkup",
                "Follow-up Consultation",
                "Prescription Renewal",
                "Lab Report Review"
              ].map((reason) => (
                <label
                  key={reason}
                  className={`reason-chip ${visitReason === reason ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="visitReason"
                    value={reason}
                    checked={visitReason === reason}
                    onChange={(e) => setVisitReason(e.target.value)}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="welcome-card-footer">
            <div className="summary-callout">
              <strong>Visiting:</strong>{" "}
              {customDoctorName.trim()
                ? customDoctorName.trim()
                : selectedDoctor?.name || "General Physician"}
              {" "}({selectedDept})
            </div>
            <button
              type="button"
              className="btn-proceed-consultation"
              onClick={handleStartConsultation}
            >
              Select Language & Begin Intake Interview →
            </button>
          </div>
        </div>

        {/* Right Column: Previous History */}
        <div className="welcome-sidebar">
          {/* Recent Visits / Consultations Card */}
          <div className="welcome-card history-card">
            <div className="history-header">
              <h3>Recent Consultations</h3>
              <span className="history-count">{pastSessions.length} past visits</span>
            </div>
            {pastSessions.length === 0 ? (
              <p className="no-history-text">
                No previous visits on record. Today&apos;s intake will start your digital medical log.
              </p>
            ) : (
              <div className="past-sessions-list">
                {pastSessions.slice(0, 5).map((sess, idx) => (
                  <div key={sess.session_id || idx} className="past-session-item">
                    <div className="session-icon">📋</div>
                    <div className="session-details">
                      <div className="session-doc-row">
                        <span className="session-doc">
                          {sess.doctor_name || "General Consultation"}
                        </span>
                        {sess.status && (
                          <span className={`session-status-badge ${sess.status === "completed" ? "badge-done" : sess.status === "in_consultation" ? "badge-active" : "badge-pending"}`}>
                            {sess.status === "completed" ? "✓ Completed" : sess.status === "in_consultation" ? "🩺 In Progress" : "⏳ Pending"}
                          </span>
                        )}
                      </div>
                      <span className="session-meta">
                        {sess.department && <span>{sess.department} • </span>}
                        {new Date(sess.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                      {sess.doctor_notes && (
                        <div className="session-remarks">
                          <span className="remarks-label">Doctor's Remarks:</span>
                          <p className="remarks-text">{sess.doctor_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: How MediKiosk Intake Works */}
      <div className="welcome-card info-card how-it-works-bottom">
        <div className="how-it-works-header">
          <span className="info-icon">💡</span>
          <div>
            <h3>How MediKiosk Intake Works</h3>
            <p className="info-subtitle">Step-by-step overview of your streamlined AI-assisted clinical visit</p>
          </div>
        </div>
        <div className="steps-horizontal-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <div className="step-body">
              <strong>Doctor Routing</strong>
              <p>Assigns your clinical findings directly to your chosen physician.</p>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <div className="step-body">
              <strong>Native Language Chat</strong>
              <p>Describe your symptoms in English, Hindi, or Marathi at your own pace.</p>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <div className="step-body">
              <strong>Cross-Check Previous Records</strong>
              <p>Upload prescriptions or lab reports to verify medical consistency.</p>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">4</div>
            <div className="step-body">
              <strong>Doctor Handover</strong>
              <p>A finalized clinical summary is immediately delivered to the doctor&apos;s desk.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
