import React from "react";

export default function DoctorPlaceholder({ onSwitchToPatient }) {
  return (
    <div className="doctor-portal-placeholder">
      <div className="doctor-card">
        <div className="doctor-icon-large">🩺</div>
        <span className="doctor-badge">Clinical & Triage Dashboard</span>
        <h2>Doctor & Physician Portal</h2>
        <p className="doctor-description">
          The specialized Doctor interface will allow clinical staff to:
        </p>

        <div className="doctor-features-list">
          <div className="doctor-feature-item">
            <span className="feature-bullet">✓</span>
            <div>
              <strong>Review Patient AI Intake</strong>
              <p>View pre-triage interview transcripts, chief complaints, and severity flags.</p>
            </div>
          </div>

          <div className="doctor-feature-item">
            <span className="feature-bullet">✓</span>
            <div>
              <strong>Cross-Verify OCR Documents</strong>
              <p>Inspect parsed prescriptions, lab reports, and medication histories.</p>
            </div>
          </div>

          <div className="doctor-feature-item">
            <span className="feature-bullet">✓</span>
            <div>
              <strong>Contradiction Audit</strong>
              <p>Review contradictions detected between patient statements and historical records.</p>
            </div>
          </div>
        </div>

        <div className="doctor-placeholder-footer">
          <div className="placeholder-note">
            <span>🔒</span> Ready for Doctor Authentication & Portal Implementation.
          </div>
          <button
            type="button"
            className="btn-switch-patient"
            onClick={onSwitchToPatient}
          >
            ← Switch to Patient Portal
          </button>
        </div>
      </div>
    </div>
  );
}
