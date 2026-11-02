import React, { useState, useEffect, useCallback } from "react";
import PatientCareModule from "./patient_care/PatientCareModule";
import UnifiedPatientProfileModal from "./patient_care/UnifiedPatientProfileModal";

export default function StaffPortal({
  apiBase,
  currentStaff,
  onStaffLogin,
  onStaffLogout,
  onSwitchToPatient,
}) {
  // =========================
  // AUTH STATES (if not logged in)
  // =========================
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // =========================
  // DASHBOARD & PATIENT LIST STATES
  // =========================
  const [counts, setCounts] = useState({
    total: 0,
    in_process: 0,
    pending_clarification: 0,
    ready_for_doctor: 0,
    in_consultation: 0,
    completed: 0,
    red_flag: 0,
    unacknowledged_red_flags: 0,
  });

  const [patients, setPatients] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "in_process" | "pending_clarification" | "ready_for_doctor" | "red_flag" | "in_consultation" | "completed"
  const [workstationView, setWorkstationView] = useState("opd"); // "opd" | "patient_care"
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Red-Flag Cases specifically for banner & alerts
  const [redFlags, setRedFlags] = useState([]);
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  // Case Details Modal (Staff Coordination Only - No clinical editing)
  const [selectedCase, setSelectedCase] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Unified Patient Profile Modal (Phase 4)
  const [selectedProfilePatientId, setSelectedProfilePatientId] = useState(null);

  // 1-Click Quick Demo Staff Logins (1 per hospital)
  const DEMO_STAFF = [
    {
      name: "Nurse Sunita Rawat",
      email: "staff@medikiosk.com",
      hospital: "MediKiosk General Hospital",
      role: "Chief Triage Nurse / Desk Coordinator",
      desc: "Live Kiosk Hospital",
    },
    {
      name: "Staff Coord. Rajiv Sen",
      email: "staff@apollo.com",
      hospital: "Apollo Clinic",
      role: "OPD Coordinator / Records Liaison",
      desc: "Mock Apollo EMR Network",
    },
    {
      name: "Lab Coord. Neha Deshmukh",
      email: "staff@city.com",
      hospital: "City Diagnostics & Specialty",
      role: "Triage & Diagnostics Staff",
      desc: "Mock City Diagnostics",
    },
  ];

  // =========================
  // AUTHENTICATION
  // =========================
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthError("Please enter both staff email and password.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch(`${apiBase}/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (data.success && data.staff) {
        onStaffLogin(data.staff);
      } else {
        setAuthError(data.error || "Authentication failed. Check credentials.");
      }
    } catch (err) {
      console.error("Staff login error:", err);
      setAuthError("Unable to connect to hospital staff server.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickLogin = (demo) => {
    setLoginEmail(demo.email);
    setLoginPassword("staff123");
    setAuthLoading(true);
    setAuthError("");
    fetch(`${apiBase}/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: demo.email,
        password: "staff123",
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.staff) {
          onStaffLogin(data.staff);
        } else {
          setAuthError(data.error || "Login failed");
        }
      })
      .catch(() => setAuthError("Server connection error"))
      .finally(() => setAuthLoading(false));
  };

  // =========================
  // DATA FETCHING & 10s POLLING
  // =========================
  const fetchDashboardData = useCallback(async () => {
    if (!currentStaff?.hospital_id) return;

    try {
      // 1. Fetch dashboard metric counts
      const dashRes = await fetch(
        `${apiBase}/staff/dashboard?hospital_id=${currentStaff.hospital_id}`
      );
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        if (dashData.success && dashData.counts) {
          setCounts(dashData.counts);
        }
      }

      // 2. Fetch patient tracking list with filter
      const filterParam = activeFilter === "all" ? "" : `&filter=${activeFilter}`;
      const patRes = await fetch(
        `${apiBase}/staff/patients?hospital_id=${currentStaff.hospital_id}${filterParam}`
      );
      if (patRes.ok) {
        const patData = await patRes.json();
        if (patData.success) {
          setPatients(patData.patients || []);
        }
      }

      // 3. Fetch active red flags
      const rfRes = await fetch(
        `${apiBase}/staff/red-flags?hospital_id=${currentStaff.hospital_id}`
      );
      if (rfRes.ok) {
        const rfData = await rfRes.json();
        if (rfData.success) {
          setRedFlags(rfData.red_flags || []);
        }
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Staff polling error:", err);
    }
  }, [apiBase, currentStaff?.hospital_id, activeFilter]);

  // Initial load on mount or filter change
  useEffect(() => {
    if (currentStaff) {
      setLoading(true);
      fetchDashboardData().finally(() => setLoading(false));
    }
  }, [currentStaff, activeFilter, fetchDashboardData]);

  // 10-Second Auto Refresh Polling
  useEffect(() => {
    if (!currentStaff) return;
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000); // 10s polling
    return () => clearInterval(interval);
  }, [currentStaff, fetchDashboardData]);

  // =========================
  // RED-FLAG ACKNOWLEDGEMENT
  // =========================
  const handleAcknowledgeRedFlag = async (sessionId, e) => {
    if (e) e.stopPropagation();
    setAcknowledgingId(sessionId);

    try {
      const res = await fetch(`${apiBase}/staff/red-flag/${sessionId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: currentStaff?.staff_id }),
      });

      const data = await res.json();
      if (data.success) {
        // Refresh dashboard immediately
        await fetchDashboardData();
        // If modal open for this case, update its acknowledged state
        if (selectedCase?.session?.session_id === sessionId) {
          setSelectedCase((prev) => ({
            ...prev,
            session: {
              ...prev.session,
              red_flag_acknowledged: 1,
              red_flag_acknowledged_at: data.acknowledged_at,
            },
          }));
        }
      }
    } catch (err) {
      console.error("Error acknowledging red flag:", err);
    } finally {
      setAcknowledgingId(null);
    }
  };

  // =========================
  // CASE DETAILS MODAL (STAFF COORDINATION)
  // =========================
  const handleOpenCaseDetails = async (sessionId) => {
    setModalLoading(true);
    setSelectedCase(null);

    try {
      const res = await fetch(`${apiBase}/staff/patient/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSelectedCase(data);
        }
      }
    } catch (err) {
      console.error("Error fetching case details:", err);
    } finally {
      setModalLoading(false);
    }
  };

  // =========================
  // RENDER: NOT LOGGED IN
  // =========================
  if (!currentStaff) {
    return (
      <div className="portal-main-content">
        <div className="doc-auth-container">
          <div className="doc-auth-card">
            <div className="doc-auth-header">
              <div className="doc-auth-icon-badge">🏥</div>
              <h2>Healthcare Staff Portal</h2>
              <p>OPD Coordination, Triage Monitoring & Urgent Red-Flag Alerts</p>
            </div>

            {authError && (
              <div className="doc-auth-alert doc-alert-danger">
                <span>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            <form className="doc-auth-form" onSubmit={handleLogin}>
              <div className="doc-form-group">
                <label htmlFor="staff-email">Staff Work Email</label>
                <input
                  id="staff-email"
                  type="email"
                  placeholder="e.g. staff@medikiosk.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="doc-form-group">
                <label htmlFor="staff-password">Staff Password</label>
                <input
                  id="staff-password"
                  type="password"
                  placeholder="Enter staff password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-doc-login"
                disabled={authLoading}
              >
                {authLoading ? "Authenticating Staff..." : "Sign In to Staff Desk →"}
              </button>
            </form>

            <div className="doc-quick-access">
              <div className="quick-access-divider">
                <span>Or Select Hospital Staff Demo Account (1-Click)</span>
              </div>

              <div className="staff-demo-cards-grid">
                {DEMO_STAFF.map((demo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="staff-demo-pill"
                    onClick={() => handleQuickLogin(demo)}
                    disabled={authLoading}
                  >
                    <div className="demo-doc-icon">🏥</div>
                    <div className="demo-doc-text">
                      <div className="demo-doc-name">{demo.name}</div>
                      <div className="demo-doc-hosp">{demo.hospital}</div>
                      <div className="demo-doc-spec">{demo.role} • <em>{demo.desc}</em></div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="doc-auth-footer">
                <button
                  type="button"
                  className="btn-switch-portal"
                  onClick={onSwitchToPatient}
                >
                  ← Return to Patient Intake Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // RENDER: LOGGED-IN STAFF WORKSTATION
  // =========================
  const unacknowledgedRedFlags = redFlags.filter((rf) => !rf.red_flag_acknowledged);

  return (
    <div className="staff-portal-container">
      {/* TOP STAFF BAR */}
      <div className="staff-topbar">
        <div className="staff-topbar-left">
          <div className="staff-hospital-badge">
            <span className="hosp-icon">🏥</span>
            <div>
              <div className="hosp-name">{currentStaff.hospital_name || "Hospital Station"}</div>
              <div className="hosp-address">{currentStaff.hospital_address}</div>
            </div>
          </div>
          <div className="staff-user-tag">
            <span className="staff-role-pill">{currentStaff.role}</span>
            <span className="staff-user-name">Coordinator: {currentStaff.name}</span>
          </div>
        </div>

        <div className="staff-topbar-right">
          <div className="polling-indicator">
            <span className="live-dot pulse"></span>
            <span>Live Sync (10s Polling)</span>
            {lastRefreshed && (
              <span className="last-sync-time">
                • {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-staff-refresh"
            onClick={fetchDashboardData}
            title="Refresh patient table"
          >
            🔄 Refresh
          </button>
          <button
            type="button"
            className="btn-staff-logout"
            onClick={onStaffLogout}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* WORKSTATION VIEW TABS */}
      <div className="staff-workstation-nav">
        <button
          type="button"
          className={`workstation-nav-btn ${workstationView === "opd" ? "active" : ""}`}
          onClick={() => setWorkstationView("opd")}
        >
          <span>📋</span> OPD Patient Queue & Triage
          <span className="nav-pill-count">{counts.total}</span>
        </button>
        <button
          type="button"
          className={`workstation-nav-btn ${workstationView === "patient_care" ? "active" : ""}`}
          onClick={() => setWorkstationView("patient_care")}
        >
          <span>🏥</span> Inpatient Care & Physiological Monitoring
          {counts.red_flag > 0 && <span className="nav-pill-count" style={{ background: "var(--alert)", color: "#fff" }}>🚨 Alerts</span>}
        </button>
      </div>

      {workstationView === "patient_care" ? (
        <PatientCareModule
          apiBase={apiBase}
          currentStaff={currentStaff}
        />
      ) : (
        <>
          {/* PROMINENT RED-FLAG URGENT ALERTS BANNER */}
      {unacknowledgedRedFlags.length > 0 && (
        <div className="urgent-red-flags-banner">
          <div className="banner-pulse-icon">🚨</div>
          <div className="banner-content">
            <div className="banner-title">
              URGENT CLINICAL ALERT: {unacknowledgedRedFlags.length} RED-FLAG CASE(S) REQUIRE IMMEDIATE ATTENTION
            </div>
            <div className="banner-sub">
              Potential emergency / red-flag indicators detected during AI intake. Please coordinate immediate clinical triage.
            </div>
            <div className="urgent-cases-list">
              {unacknowledgedRedFlags.map((rf) => (
                <div
                  key={rf.session_id}
                  className="urgent-case-chip"
                  onClick={() => handleOpenCaseDetails(rf.session_id)}
                >
                  <span className="chip-name">👤 {rf.patient_name || "Patient"}</span>
                  <span className="chip-dept">Dept: {rf.department}</span>
                  <span className="chip-reason">Alert: {rf.red_flag_reason || "Red Flag Detected"}</span>
                  <button
                    type="button"
                    className="btn-ack-alert"
                    disabled={acknowledgingId === rf.session_id}
                    onClick={(e) => handleAcknowledgeRedFlag(rf.session_id, e)}
                  >
                    {acknowledgingId === rf.session_id ? "Acknowledging..." : "✓ Acknowledge Alert"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD METRIC KPI CARDS */}
      <div className="staff-metrics-grid">
        <div className="staff-metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-data">
            <div className="metric-number">{counts.total}</div>
            <div className="metric-label">Total Patients</div>
          </div>
        </div>

        <div className="staff-metric-card">
          <div className="metric-icon">💬</div>
          <div className="metric-data">
            <div className="metric-number">{counts.in_process}</div>
            <div className="metric-label">In Process (Intake)</div>
          </div>
        </div>

        <div className="staff-metric-card">
          <div className="metric-icon">🔍</div>
          <div className="metric-data">
            <div className="metric-number">{counts.pending_clarification}</div>
            <div className="metric-label">Pending Clarification</div>
          </div>
        </div>

        <div className="staff-metric-card card-ready">
          <div className="metric-icon">🟢</div>
          <div className="metric-data">
            <div className="metric-number">{counts.ready_for_doctor}</div>
            <div className="metric-label">Ready for Doctor</div>
          </div>
        </div>

        <div className="staff-metric-card card-consulting">
          <div className="metric-icon">🩺</div>
          <div className="metric-data">
            <div className="metric-number">{counts.in_consultation}</div>
            <div className="metric-label">In Consultation</div>
          </div>
        </div>

        <div className="staff-metric-card card-done">
          <div className="metric-icon">✓</div>
          <div className="metric-data">
            <div className="metric-number">{counts.completed}</div>
            <div className="metric-label">Completed</div>
          </div>
        </div>

        <div className={`staff-metric-card card-redflag ${counts.red_flag > 0 ? "has-alerts" : ""}`}>
          <div className="metric-icon">🚨</div>
          <div className="metric-data">
            <div className="metric-number">{counts.red_flag}</div>
            <div className="metric-label">Red Flag Cases</div>
          </div>
        </div>
      </div>

      {/* PATIENT TRACKING & FILTER TABS */}
      <div className="staff-table-wrapper">
        <div className="table-header-controls">
          <div>
            <h3>Hospital Patient Tracking Board</h3>
            <p className="table-subtitle">
              Monitoring patients assigned to <strong>{currentStaff.hospital_name}</strong>. Coordination and tracking only.
            </p>
          </div>

          <div className="staff-filter-tabs">
            {[
              { id: "all", label: `All (${counts.total})` },
              { id: "in_process", label: `In Process (${counts.in_process})` },
              { id: "pending_clarification", label: `Pending Clarification (${counts.pending_clarification})` },
              { id: "ready_for_doctor", label: `Ready for Doctor (${counts.ready_for_doctor})` },
              { id: "red_flag", label: `🔴 Red Flag (${counts.red_flag})` },
              { id: "in_consultation", label: `In Consultation (${counts.in_consultation})` },
              { id: "completed", label: `Completed (${counts.completed})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-tab ${activeFilter === tab.id ? "active" : ""}`}
                onClick={() => setActiveFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="staff-loading">
            <div className="loading-spinner"></div>
            <p>Loading hospital patient queue...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="staff-empty-state">
            <span className="empty-icon">📋</span>
            <h4>No Patients Found in this Category</h4>
            <p>No intake sessions currently match the selected filter for this hospital.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Department</th>
                  <th>Assigned Doctor</th>
                  <th>Intake Status</th>
                  <th>Time / Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((pat) => {
                  const isRedFlag = pat.red_flag === 1;
                  const isAck = pat.red_flag_acknowledged === 1;

                  return (
                    <tr
                      key={pat.session_id}
                      className={`patient-row ${isRedFlag ? "row-redflag" : ""}`}
                      onClick={() => handleOpenCaseDetails(pat.session_id)}
                    >
                      <td>
                        {isRedFlag ? (
                          <span className="tag-redflag">
                            🚨 RED FLAG
                            {isAck ? <span className="ack-sub"> (Ack'd)</span> : <span className="ack-urgent"> (URGENT)</span>}
                          </span>
                        ) : (
                          <span className={`tag-priority priority-${(pat.priority || "standard").toLowerCase().replace(/\s+/g, "-")}`}>
                            {pat.priority || "Standard"}
                          </span>
                        )}
                      </td>
                      <td className="mono-cell">
                        {pat.patient_id ? pat.patient_id.substring(0, 8) : "GUEST"}
                      </td>
                      <td>
                        <div className="patient-name-cell">
                          <strong>{pat.patient_name}</strong>
                          <span className="demographics-sub">
                            {pat.age ? `${pat.age}y` : ""} {pat.gender ? `• ${pat.gender}` : ""}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="dept-cell-badge">{pat.department || "General"}</span>
                      </td>
                      <td>
                        <span className="doc-cell-name">🩺 {pat.doctor_name || "On-Duty Physician"}</span>
                      </td>
                      <td>
                        <span className={`status-pill pill-${pat.status}`}>
                          {pat.status === "ready_for_opd"
                            ? "🟢 Ready for OPD"
                            : pat.status === "in_consultation"
                            ? "🩺 In Consultation"
                            : pat.status === "completed"
                            ? "✓ Completed"
                            : pat.status === "in_progress"
                            ? "💬 In Process"
                            : pat.status}
                        </span>
                      </td>
                      <td className="time-cell">
                        {pat.created_at
                          ? new Date(pat.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons-cell">
                          {isRedFlag && !isAck && (
                            <button
                              type="button"
                              className="btn-table-ack"
                              disabled={acknowledgingId === pat.session_id}
                              onClick={(e) => handleAcknowledgeRedFlag(pat.session_id, e)}
                            >
                              {acknowledgingId === pat.session_id ? "..." : "Acknowledge"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-table-view"
                            style={{ background: "#e0efe6", color: "#25603f", borderColor: "#a3d9bc" }}
                            onClick={() => setSelectedProfilePatientId(pat.patient_id)}
                            title="View Unified Clinical Profile & Timeline"
                          >
                            Unified Profile 📋
                          </button>
                          <button
                            type="button"
                            className="btn-table-view"
                            onClick={() => handleOpenCaseDetails(pat.session_id)}
                          >
                            View Case ↗
                          </button>
                          <button
                            type="button"
                            className="btn-table-view"
                            style={{ background: "#edf6f4", color: "var(--teal-deep)", borderColor: "var(--teal)" }}
                            onClick={() => setWorkstationView("patient_care")}
                            title="Switch to Inpatient Monitoring & Vitals"
                          >
                            Monitor Inpatient 🫀
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
      </>
      )}

      {/* ============================================================================= */}
      {/* CASE DETAILS MODAL (STAFF COORDINATION ONLY — NO CLINICAL EDITING) */}
      {/* ============================================================================= */}
      {(modalLoading || selectedCase) && (
        <div className="staff-modal-overlay" onClick={() => setSelectedCase(null)}>
          <div className="staff-modal-card" onClick={(e) => e.stopPropagation()}>
            {modalLoading ? (
              <div className="modal-loading-box">
                <div className="loading-spinner"></div>
                <p>Loading Case Details...</p>
              </div>
            ) : selectedCase ? (
              <>
                <div className="staff-modal-header">
                  <div>
                    <div className="modal-subtitle">STAFF COORDINATION & CASE MONITORING</div>
                    <h2>{selectedCase.session?.patient_name || "Registered Patient"}</h2>
                    <div className="modal-meta-chips">
                      <span className="chip">
                        <strong>Patient ID:</strong> {selectedCase.session?.patient_id || "GUEST"}
                      </span>
                      {selectedCase.session?.age && (
                        <span className="chip">
                          <strong>Age:</strong> {selectedCase.session.age} yrs
                        </span>
                      )}
                      {selectedCase.session?.gender && (
                        <span className="chip">
                          <strong>Gender:</strong> {selectedCase.session.gender}
                        </span>
                      )}
                      {selectedCase.session?.phone && (
                        <span className="chip">
                          <strong>Phone:</strong> {selectedCase.session.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setSelectedCase(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="staff-modal-body">
                  {/* RED-FLAG STATUS CARD */}
                  {selectedCase.session?.red_flag === 1 && (
                    <div className="modal-alert-box modal-redflag-box">
                      <div className="rf-box-header">
                        <span className="rf-icon">🚨</span>
                        <div>
                          <h4>Urgent Red-Flag Alert Active</h4>
                          <p>{selectedCase.session.red_flag_reason || "Potentially high-risk symptoms surfaced during interview."}</p>
                        </div>
                      </div>
                      <div className="rf-box-status">
                        {selectedCase.session.red_flag_acknowledged === 1 ? (
                          <span className="ack-status-ok">
                            ✓ Alert Acknowledged by Staff at{" "}
                            {selectedCase.session.red_flag_acknowledged_at
                              ? new Date(selectedCase.session.red_flag_acknowledged_at).toLocaleTimeString()
                              : "Earlier"}
                          </span>
                        ) : (
                          <div className="ack-action-row">
                            <span className="ack-status-pending">⚠️ Pending Staff Acknowledgement</span>
                            <button
                              type="button"
                              className="btn-modal-ack"
                              disabled={acknowledgingId === selectedCase.session.session_id}
                              onClick={() => handleAcknowledgeRedFlag(selectedCase.session.session_id)}
                            >
                              {acknowledgingId === selectedCase.session.session_id ? "Saving..." : "✓ Acknowledge Alert Now"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CLINICAL COORDINATION STATUS GRID */}
                  <div className="coordination-grid">
                    <div className="coord-card">
                      <span className="coord-label">Hospital Affiliation</span>
                      <span className="coord-value">
                        🏥 {selectedCase.session?.hospital_name || currentStaff.hospital_name}
                      </span>
                    </div>

                    <div className="coord-card">
                      <span className="coord-label">Assigned Department</span>
                      <span className="coord-value">
                        🏢 {selectedCase.session?.department || "General Medicine"}
                      </span>
                    </div>

                    <div className="coord-card">
                      <span className="coord-label">Assigned Doctor</span>
                      <span className="coord-value">
                        🩺 {selectedCase.session?.doctor_name || "On-Duty Physician"}
                      </span>
                    </div>

                    <div className="coord-card">
                      <span className="coord-label">Current Intake Status</span>
                      <span className="coord-value status-badge-inline">
                        {selectedCase.session?.status}
                      </span>
                    </div>

                    <div className="coord-card">
                      <span className="coord-label">Doctor Consultation Status</span>
                      <span className="coord-value">
                        {selectedCase.doctor_consultation_status === "completed"
                          ? "✓ Completed by Doctor"
                          : selectedCase.doctor_consultation_status === "in_consultation"
                          ? "🩺 Currently with Doctor"
                          : "⏳ Waiting for Doctor"}
                      </span>
                    </div>

                    <div className="coord-card">
                      <span className="coord-label">Final Report Availability</span>
                      <span className="coord-value">
                        {selectedCase.final_report_available
                          ? "🟢 Synthesized Clinical Context Ready"
                          : "⏳ In Progress / Not Ready"}
                      </span>
                    </div>
                  </div>

                  {/* DOCUMENTS SUMMARY */}
                  <div className="modal-section-card">
                    <h4>📄 Uploaded Medical Documents ({selectedCase.documents?.length || 0})</h4>
                    {selectedCase.documents && selectedCase.documents.length > 0 ? (
                      <div className="modal-docs-list">
                        {selectedCase.documents.map((doc, idx) => (
                          <div key={idx} className="modal-doc-item">
                            <span className="doc-icon">📎</span>
                            <span className="doc-name">{doc.filename}</span>
                            <span className="doc-date">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ""}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-subtext">No medical documents were uploaded by the patient.</p>
                    )}
                  </div>

                  {/* CONTRADICTIONS SUMMARY */}
                  <div className="modal-section-card">
                    <h4>🔍 Contradictions & Clarifications ({selectedCase.contradictions?.length || 0})</h4>
                    {selectedCase.contradictions && selectedCase.contradictions.length > 0 ? (
                      <div className="modal-contra-list">
                        {selectedCase.contradictions.map((c, idx) => (
                          <div key={idx} className="modal-contra-item">
                            <div className="contra-tag">{c.category} • Status: {c.status}</div>
                            <div className="contra-detail"><strong>Mismatch:</strong> {c.patient_statement} vs {c.document_evidence}</div>
                            {c.patient_answer && (
                              <div className="contra-answer"><strong>Patient Clarified:</strong> {c.patient_answer}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-subtext">No contradictory statements detected during triage.</p>
                    )}
                  </div>

                  {/* READ-ONLY NOTICE FOR STAFF */}
                  <div className="staff-readonly-notice">
                    <span>ℹ️</span>
                    <span>
                      Staff view is strictly for patient tracking and coordination. Clinical editing and diagnostic decisions are reserved for the attending physician.
                    </span>
                  </div>
                </div>

                <div className="staff-modal-footer">
                  <button
                    type="button"
                    className="btn-modal-close"
                    onClick={() => setSelectedCase(null)}
                  >
                    Close Case File
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* UNIFIED CLINICAL PATIENT PROFILE MODAL (Phase 4) */}
      {selectedProfilePatientId && (
        <UnifiedPatientProfileModal
          apiBase={apiBase}
          patientId={selectedProfilePatientId}
          currentStaff={currentStaff}
          onClose={() => setSelectedProfilePatientId(null)}
        />
      )}
    </div>
  );
}
