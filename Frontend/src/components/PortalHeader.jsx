import React from "react";

export default function PortalHeader({
  activePortal,
  setActivePortal,
  currentPatient,
  currentDoctor,
  currentStaff,
  onLogout,
  onDoctorLogout,
  onStaffLogout,
  onNewConsultation,
  hasActiveSession,
}) {
  const isPatientActive = Boolean(currentPatient);

  return (
    <header className="portal-header">
      <div className="header-brand">
        <div className="brand-icon">🏥</div>
        <div className="brand-text">
          <div className="brand-title">
            MediKiosk <span className="brand-badge">AI Clinical System</span>
          </div>
          <div className="brand-subtitle">Smart Patient Intake &amp; Triage</div>
        </div>
      </div>

      {/* Role Switcher / Tabs – Clinician portals disabled during active patient session */}
      <div className="portal-switcher">
        <button
          type="button"
          className={`portal-tab ${activePortal === "patient" ? "active" : ""}`}
          onClick={() => setActivePortal && setActivePortal("patient")}
        >
          <span className="tab-icon">👤</span>
          <span>Patient Portal</span>
        </button>

        <button
          type="button"
          className={`portal-tab ${activePortal === "doctor" ? "active" : ""} ${
            isPatientActive ? "disabled-tab" : ""
          }`}
          disabled={isPatientActive}
          onClick={() => {
            if (isPatientActive) return;
            setActivePortal && setActivePortal("doctor");
          }}
          title={
            isPatientActive
              ? "Clinician portals are locked during active patient intake. Please complete or log out of the patient session to switch."
              : "Doctor Portal"
          }
        >
          <span className="tab-icon">🩺</span>
          <span>Doctor Portal</span>
          {isPatientActive && <span className="tab-lock-indicator">🔒</span>}
        </button>

        <button
          type="button"
          className={`portal-tab ${activePortal === "staff" ? "active" : ""} ${
            isPatientActive ? "disabled-tab" : ""
          }`}
          disabled={isPatientActive}
          onClick={() => {
            if (isPatientActive) return;
            setActivePortal && setActivePortal("staff");
          }}
          title={
            isPatientActive
              ? "Staff portal is locked during active patient intake. Please complete or log out of the patient session to switch."
              : "Healthcare Staff"
          }
        >
          <span className="tab-icon">🏥</span>
          <span>Healthcare Staff</span>
          {isPatientActive && <span className="tab-lock-indicator">🔒</span>}
        </button>
      </div>

      {/* User Status / Actions – Based strictly on active portal */}
      <div className="header-actions">
        {activePortal === "patient" && currentPatient ? (
          <div className="patient-user-chip">
            <div className="user-avatar">
              {currentPatient.full_name?.charAt(0).toUpperCase() || "P"}
            </div>
            <div className="user-details">
              <span className="user-name">{currentPatient.full_name}</span>
              <span className="user-id">ID: {currentPatient.patient_id}</span>
            </div>

            {hasActiveSession && (
              <button
                type="button"
                className="btn-header-action"
                onClick={onNewConsultation}
                title="Start a fresh consultation"
              >
                + New Consultation
              </button>
            )}

            <button
              type="button"
              className="btn-header-logout"
              onClick={onLogout}
              title="Sign Out"
            >
              Log Out
            </button>
          </div>
        ) : activePortal === "doctor" && currentDoctor ? (
          <div className="patient-user-chip doctor-header-chip">
            <div className="user-avatar doc-avatar-chip">🩺</div>
            <div className="user-details">
              <span className="user-name">{currentDoctor.name}</span>
              <span className="user-id">{currentDoctor.department} • {currentDoctor.room || "OPD"}</span>
            </div>
            <button
              type="button"
              className="btn-header-logout"
              onClick={onDoctorLogout}
              title="Doctor Sign Out"
            >
              Log Out
            </button>
          </div>
        ) : activePortal === "staff" && currentStaff ? (
          <div className="patient-user-chip staff-header-chip">
            <div className="user-avatar staff-avatar-chip">🏥</div>
            <div className="user-details">
              <span className="user-name">{currentStaff.name}</span>
              <span className="user-id">{currentStaff.hospital_name || currentStaff.hospital || "Hospital Staff"}</span>
            </div>
            <button
              type="button"
              className="btn-header-logout"
              onClick={onStaffLogout}
              title="Staff Sign Out"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="header-status-pill">
            <span className="status-dot"></span>
            <span>System Active</span>
          </div>
        )}
      </div>
    </header>
  );
}
