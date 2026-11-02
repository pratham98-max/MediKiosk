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
  // Determine which role is currently authenticated
  const isPatientLoggedIn = Boolean(currentPatient);
  const isDoctorLoggedIn = Boolean(currentDoctor);
  const isStaffLoggedIn = Boolean(currentStaff);
  // Determine login state for the active portal
  const isCurrentPortalLoggedIn =
    (activePortal === "patient" && isPatientLoggedIn) ||
    (activePortal === "doctor" && isDoctorLoggedIn) ||
    (activePortal === "staff" && isStaffLoggedIn);

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

      {/* Role Switcher / Tab */}
      <div className="portal-switcher">
        {isCurrentPortalLoggedIn ? (
          // ONCE LOGGED IN: show ONLY the portal belonging to the authenticated user
          <>
            {activePortal === "patient" && isPatientLoggedIn && (
              <button
                type="button"
                className="portal-tab active"
                disabled
              >
                <span className="tab-icon">👤</span>
                <span>Patient Portal</span>
              </button>
            )}

            {activePortal === "doctor" && isDoctorLoggedIn && (
              <button
                type="button"
                className="portal-tab active"
                disabled
              >
                <span className="tab-icon">🩺</span>
                <span>Doctor Portal</span>
              </button>
            )}

            {activePortal === "staff" && isStaffLoggedIn && (
              <button
                type="button"
                className="portal-tab active"
                disabled
              >
                <span className="tab-icon">🏥</span>
                <span>Healthcare Staff</span>
              </button>
            )}
          </>
        ) : (
          // BEFORE LOGIN: all portal login options appear in header so user can switch between logins
          <>
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
              className={`portal-tab ${activePortal === "doctor" ? "active" : ""}`}
              onClick={() => setActivePortal && setActivePortal("doctor")}
            >
              <span className="tab-icon">🩺</span>
              <span>Doctor Portal</span>
            </button>

            <button
              type="button"
              className={`portal-tab ${activePortal === "staff" ? "active" : ""}`}
              onClick={() => setActivePortal && setActivePortal("staff")}
            >
              <span className="tab-icon">🏥</span>
              <span>Healthcare Staff</span>
            </button>
          </>
        )}
      </div>

      {/* User Status / Actions */}
      <div className="header-actions">
        {isPatientLoggedIn ? (
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
        ) : isDoctorLoggedIn ? (
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
        ) : isStaffLoggedIn ? (
          <div className="patient-user-chip staff-header-chip">
            <div className="user-avatar staff-avatar-chip">🏥</div>
            <div className="user-details">
              <span className="user-name">{currentStaff.name}</span>
              <span className="user-id">{currentStaff.hospital_name || "Hospital Staff"}</span>
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
