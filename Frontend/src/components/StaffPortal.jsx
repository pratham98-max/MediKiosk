import React, { useState, useEffect, useCallback, useRef } from "react";
import "./vital_track.css";
import "./patient_care/patient_care.css";

// Reusable VitalTrack UI
import SidebarNav from "./ui/SidebarNav";
import StaffSidebar from "./vital_track/StaffSidebar";
import StaffTopbar from "./vital_track/StaffTopbar";
import Drawer from "./ui/Drawer";
import EmptyState from "./ui/EmptyState";
import MewsChip from "./ui/MewsChip";
import PriorityChip from "./ui/PriorityChip";

// Main Views
import DashboardHome from "./vital_track/DashboardHome";
import OpdQueueDashboard from "./vital_track/OpdQueueDashboard";
import AdmittedPatientsDashboard from "./vital_track/AdmittedPatientsDashboard";

// Clinical Modals
import VitalRecorderModal from "./patient_care/VitalRecorderModal";
import XAIRiskModal from "./patient_care/XAIRiskModal";
import ECGTelemetryModal from "./patient_care/ECGTelemetryModal";
import BedManagementModal from "./patient_care/BedManagementModal";
import CarePlansModal from "./patient_care/CarePlansModal";
import TransferNetworkModal from "./patient_care/TransferNetworkModal";
import UnifiedPatientProfileModal from "./patient_care/UnifiedPatientProfileModal";
import AdmitPatientModal from "./patient_care/AdmitPatientModal";
import { getDemoPatients, resetDemoPatients, transferDemoPatient } from "./vital_track/demoPatientsData";

export default function StaffPortal({
  apiBase,
  currentStaff,
  onStaffLogin,
  onStaffLogout,
  onSwitchToPatient,
}) {
  // =========================
  // AUTH STATES (if unauthenticated)
  // =========================
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // =========================
  // WORKSTATION NAVIGATION & LAYOUT
  // =========================
  const [activeView, setActiveView] = useState("opd"); // default to 'opd' queue dashboard
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  // =========================
  // OPD DASHBOARD STATES
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
  const [opdPatients, setOpdPatients] = useState([]);
  const [opdFilter, setOpdFilter] = useState("all");
  const [redFlags, setRedFlags] = useState([]);
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  // =========================
  // INPATIENT CARE & BED STATES
  // =========================
  const [beds, setBeds] = useState([]);
  const [inpatientCensus, setInpatientCensus] = useState([]);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeMessage, setOptimizeMessage] = useState("");

  // General Loading & Sync
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // =========================
  // MODALS & INSPECTION DRAWER
  // =========================
  const [selectedCase, setSelectedCase] = useState(null); // Case Details Modal
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedProfilePatientId, setSelectedProfilePatientId] = useState(null); // Unified 8-Facet Profile
  const [selectedInpatient, setSelectedInpatient] = useState(null); // Right Sliding Drawer
  const [activeModal, setActiveModal] = useState(null); // 'vitals' | 'xai' | 'ecg' | 'bed' | 'carePlans' | 'transfer' | 'admit'
  const [activeModalPatient, setActiveModalPatient] = useState(null);
  const [selectedBedForAdmission, setSelectedBedForAdmission] = useState("");

  // =========================
  // SYNTHETIC INPATIENT DEMO SUITE (ISOLATED STATE)
  // =========================
  const [demoMode, setDemoMode] = useState(true);
  const [demoPatientsList, setDemoPatientsList] = useState(() => getDemoPatients());

  const handleResetDemo = () => {
    const fresh = resetDemoPatients();
    setDemoPatientsList([...fresh]);
  };

  const handleTransferDemo = (pat, destination) => {
    const updated = transferDemoPatient(pat.patient_id || pat.id, destination);
    setDemoPatientsList([...updated]);
  };

  // 1-Click Demo Logins
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
  // AUTHENTICATION HANDLERS
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
  // DATA FETCHING (OPD + INPATIENTS + BEDS)
  // =========================
  const fetchDashboardData = useCallback(async () => {
    if (!currentStaff?.hospital_id) return;
    const hospId = currentStaff.hospital_id;

    try {
      // 1. Fetch dashboard metric counts
      const dashRes = await fetch(`${apiBase}/staff/dashboard?hospital_id=${hospId}`);
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        if (dashData.success && dashData.counts) {
          setCounts(dashData.counts);
        }
      }

      // 2. Fetch OPD patients tracking list
      const filterParam = opdFilter === "all" ? "" : `&filter=${opdFilter}`;
      const patRes = await fetch(`${apiBase}/staff/patients?hospital_id=${hospId}${filterParam}`);
      if (patRes.ok) {
        const patData = await patRes.json();
        if (patData.success) {
          setOpdPatients(patData.patients || []);
        }
      }

      // 3. Fetch active red flags
      const rfRes = await fetch(`${apiBase}/staff/red-flags?hospital_id=${hospId}`);
      if (rfRes.ok) {
        const rfData = await rfRes.json();
        if (rfData.success) {
          setRedFlags(rfData.red_flags || []);
        }
      }

      // 4. Fetch inpatient ward beds
      const bedsRes = await fetch(`${apiBase}/staff/patient-care/beds?hospital_id=${hospId}`);
      if (bedsRes.ok) {
        const bedsData = await bedsRes.json();
        if (bedsData.beds) {
          setBeds(bedsData.beds);
        }
      }

      // 5. Fetch monitored inpatient census
      const carePatRes = await fetch(`${apiBase}/staff/patient-care/patients?hospital_id=${hospId}`);
      if (carePatRes.ok) {
        const carePatData = await carePatRes.json();
        if (carePatData.patients) {
          setInpatientCensus(carePatData.patients);
        }
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error("VitalTrack polling error:", err);
    }
  }, [apiBase, currentStaff?.hospital_id, opdFilter]);

  // Initial load
  useEffect(() => {
    if (currentStaff) {
      setLoading(true);
      fetchDashboardData().finally(() => setLoading(false));
    }
  }, [currentStaff, opdFilter, fetchDashboardData]);

  // 10-Second Auto Refresh Polling
  useEffect(() => {
    if (!currentStaff) return;
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [currentStaff, fetchDashboardData]);

  // =========================
  // ACTIONS: RED FLAG ACKNOWLEDGEMENT
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
        await fetchDashboardData();
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
  // ACTIONS: CASE DETAILS MODAL (STAFF COORDINATION)
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
  // ACTIONS: BED OPTIMIZATION
  // =========================
  const handleOptimizeBeds = async () => {
    setOptimizing(true);
    setOptimizeMessage("");
    const hospId = currentStaff?.hospital_id || "hosp-medikiosk";
    try {
      const res = await fetch(`${apiBase}/staff/patient-care/beds/optimize?hospital_id=${hospId}`, {
        method: "POST",
      });
      const data = await res.json();
      setOptimizeMessage(
        data.swaps_count > 0
          ? `✓ Bed optimization completed: ${data.swaps_count} bed reallocation(s) performed.`
          : `✓ All critical patients are already appropriately placed in ICU.`
      );
      fetchDashboardData();
    } catch (err) {
      console.error("Bed optimize error:", err);
      setOptimizeMessage("Failed to execute bed optimization");
    } finally {
      setOptimizing(false);
    }
  };

  // Memoized Effective Admitted Inpatient Census & Ward Bed States (Supports isolated demo suite)
  const effectiveInpatientCensus = React.useMemo(() => {
    if (!demoMode) return inpatientCensus;
    const realAdmitted = inpatientCensus.filter(
      (p) => (Boolean(p.bed_number) && p.bed_status === "occupied") || p.is_admitted
    );
    return [...demoPatientsList, ...realAdmitted];
  }, [demoMode, inpatientCensus, demoPatientsList]);

  const effectiveBeds = React.useMemo(() => {
    if (!demoMode) return beds;
    return beds.map((b) => {
      const demoOcc = demoPatientsList.find((dp) => dp.bed_number === b.bed_number);
      if (demoOcc) {
        return {
          ...b,
          status: "occupied",
          patient_id: demoOcc.patient_id,
          patient_name: demoOcc.full_name,
          mews_score: demoOcc.mews_score,
          deterioration_risk: demoOcc.deterioration_risk,
          is_demo: true,
        };
      }
      return b;
    });
  }, [demoMode, beds, demoPatientsList]);

  // Modal Opener Helper
  const openModal = (type, patient) => {
    setActiveModalPatient(patient);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setActiveModalPatient(null);
  };

  // Calculate total unacknowledged red flags for sidebar badge
  const unacknowledgedCount = redFlags.filter((rf) => !rf.red_flag_acknowledged).length;

  // =========================
  // RENDER: UNAUTHENTICATED
  // =========================
  if (!currentStaff) {
    return (
      <div className="doc-auth-container">
        <div className="doc-auth-card">
            <div className="doc-auth-header">
              <div className="doc-auth-icon-badge">🏥</div>
              <h2>Healthcare Staff Portal</h2>
              <p>OPD Coordination, Triage Monitoring & Inpatient Physiological Care</p>
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
    );
  }

  // =========================
  // RENDER: VITALTRACK WORKSTATION (AUTHENTICATED)
  // =========================
  return (
    <div className="vt-app-container">
      {/* 1. COLLAPSIBLE DARK SIDEBAR */}
      <StaffSidebar
        activeView={activeView}
        onSelectView={(view) => setActiveView(view)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        unreadAlertCount={unacknowledgedCount}
        currentStaff={currentStaff}
        onStaffLogout={onStaffLogout}
      />

      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <div
          className="vt-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 2. MAIN CONTENT AREA */}
      <main className="vt-main-content">
        {/* PREMIUM TOPBAR */}
        <StaffTopbar
          currentStaff={currentStaff}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchDashboardData}
          onSwitchToPatient={onSwitchToPatient}
          onAdmitClick={() => {
            setSelectedBedForAdmission("");
            setActiveModal("admit");
          }}
          globalSearch={globalSearch}
          onSearchChange={setGlobalSearch}
          unreadAlertCount={unacknowledgedCount}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          pageTitle={
            activeView === "opd"
              ? "OPD Dashboard"
              : activeView === "admitted" || activeView === "beds"
              ? "Inpatient Care & Bed Management"
              : "Staff Workstation"
          }
          breadcrumb={
            activeView === "opd"
              ? "Staff Portal / OPD Dashboard"
              : "Staff Portal / Inpatient Care"
          }
        />

        {/* PAGE CONTENT CONTAINER */}
        <div style={{ padding: "0 28px 40px", flex: 1 }}>
          {/* VIEW 1: DASHBOARD HOME */}
          {activeView === "dashboard" && (
            <DashboardHome
              counts={counts}
              beds={beds}
              patients={inpatientCensus}
              redFlags={redFlags}
              onAcknowledgeRedFlag={handleAcknowledgeRedFlag}
              onOpenCaseDetails={handleOpenCaseDetails}
              onOpenPatientProfile={(id) => setSelectedProfilePatientId(id)}
              onOpenVitalsModal={(patient) => openModal("vitals", patient)}
              onNavigateView={(view) => setActiveView(view)}
              acknowledgingId={acknowledgingId}
            />
          )}

          {/* VIEW 2: OPD PATIENT QUEUE */}
          {activeView === "opd" && (
            <OpdQueueDashboard
              counts={counts}
              patients={opdPatients}
              redFlags={redFlags}
              loading={loading}
              activeFilter={opdFilter}
              onSelectFilter={(f) => setOpdFilter(f)}
              onOpenCaseDetails={handleOpenCaseDetails}
              onOpenPatientProfile={(id) => setSelectedProfilePatientId(id)}
              onAcknowledgeRedFlag={handleAcknowledgeRedFlag}
              onNavigateInpatient={() => setActiveView("admitted")}
              acknowledgingId={acknowledgingId}
              currentStaff={currentStaff}
            />
          )}

          {/* VIEW 3: ADMITTED PATIENTS & WARD MAP */}
          {(activeView === "admitted" || activeView === "beds") && (
            <AdmittedPatientsDashboard
              beds={effectiveBeds}
              patients={effectiveInpatientCensus}
              loading={loading}
              onSelectPatient={(pat) => setSelectedInpatient(pat)}
              onAllocateBed={(bed) => {
                setSelectedBedForAdmission(bed.bed_number);
                setActiveModal("admit");
              }}
              onRecordVitals={(pat) => openModal("vitals", pat)}
              onOpenProfile={(id) => setSelectedProfilePatientId(id)}
              onOpenCaseDetails={handleOpenCaseDetails}
              onOpenECG={(pat) => openModal("ecg", pat)}
              onTransfer={(pat) => openModal("transfer", pat)}
              onOptimizeBeds={handleOptimizeBeds}
              optimizing={optimizing}
              optimizeMessage={optimizeMessage}
              showBedManagementOnly={activeView === "beds"}
              isDemoMode={demoMode}
              onToggleDemoMode={() => setDemoMode((prev) => !prev)}
              onResetDemo={handleResetDemo}
            />
          )}

          {/* VIEW 4: VITALS & MEWS WORKBENCH */}
          {activeView === "vitals" && (
            <div className="vt-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "var(--vt-dark-green)" }}>
                    Bedside Vitals & MEWS Monitoring Workbench
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--vt-text-muted)" }}>
                    Subbe et al. (2001) validated physiological scores. Select an admitted patient to record new bedside measurements.
                  </p>
                </div>
              </div>

              {inpatientCensus.length === 0 ? (
                <EmptyState
                  icon="🩺"
                  title="No Inpatients Admitted"
                  message="Admit patients to beds to begin continuous bedside vitals tracking."
                />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="vt-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Bed</th>
                        <th>Heart Rate</th>
                        <th>Blood Pressure</th>
                        <th>SpO2</th>
                        <th>MEWS Acuity</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inpatientCensus.map((pat) => (
                        <tr key={pat.patient_id}>
                          <td>
                            <strong>{pat.full_name || pat.patient_name || pat.patient_id}</strong>
                            <div style={{ fontSize: "11px", color: "var(--vt-text-muted)", fontFamily: "monospace" }}>
                              {pat.patient_id}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>Bed {pat.bed_number || "--"}</span>
                          </td>
                          <td>{pat.heart_rate ? `${pat.heart_rate} bpm` : "--"}</td>
                          <td>{pat.systolic_bp ? `${pat.systolic_bp}/${pat.diastolic_bp} mmHg` : "--"}</td>
                          <td>{pat.spo2 ? `${pat.spo2}%` : "--"}</td>
                          <td>
                            <MewsChip score={Number(pat.mews_score) || 0} />
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="vt-btn-cta-admit"
                              style={{ padding: "6px 14px", fontSize: "12px" }}
                              onClick={() => openModal("vitals", pat)}
                            >
                              + Record Vitals
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW 5: ML DETERIORATION & XAI INSIGHTS */}
          {activeView === "xai" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div
                style={{
                  background: "#fff9eb",
                  border: "1px solid #fde68a",
                  borderRadius: "14px",
                  padding: "12px 18px",
                  fontSize: "12.5px",
                  color: "#92400e",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "18px" }}>🧠</span>
                <div>
                  <strong>Rule 12 Synthetic Data Disclosure:</strong> The deterioration risk model is an XGBoost ensemble trained on synthetic hospital cohorts. Feature attributions (SHAP values) provide explainable clinical guidance and must not override physician judgment.
                </div>
              </div>

              <div className="vt-card" style={{ padding: "24px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--vt-dark-green)" }}>
                  Baseline SHAP Feature Importance (Cohort-Level)
                </h3>
                <p style={{ margin: "4px 0 16px", fontSize: "12.5px", color: "var(--vt-text-muted)" }}>
                  Relative feature weights contributing to patient deterioration risk calculation.
                </p>

                {[
                  { factor: "Respiratory Rate (RR > 24 or < 10)", weight: 32, color: "#dc2626" },
                  { factor: "Heart Rate (Tachycardia / Bradycardia)", weight: 26, color: "#ea580c" },
                  { factor: "Systolic Blood Pressure (Hypotension)", weight: 19, color: "#d97706" },
                  { factor: "Oxygen Saturation (SpO2 < 93%)", weight: 14, color: "#0284c7" },
                  { factor: "Patient Age (≥ 65 years)", weight: 6, color: "#1e9e4a" },
                  { factor: "Number of Active Comorbidities", weight: 3, color: "#64748b" },
                ].map((item, idx) => (
                  <div key={idx} style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}>
                      <span>{item.factor}</span>
                      <strong style={{ color: item.color }}>{item.weight}%</strong>
                    </div>
                    <div style={{ background: "#f0f4ec", borderRadius: "999px", height: "8px", overflow: "hidden" }}>
                      <div style={{ width: `${item.weight * 2.8}%`, background: item.color, height: "100%", borderRadius: "999px" }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="vt-card" style={{ padding: "24px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--vt-dark-green)", marginBottom: "14px" }}>
                  Admitted Inpatients Deterioration Risk
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="vt-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Bed</th>
                        <th>MEWS Acuity</th>
                        <th>ML Risk Score</th>
                        <th>Primary Risk Factors</th>
                        <th style={{ textAlign: "right" }}>Explainable AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inpatientCensus.map((pat) => (
                        <tr key={pat.patient_id}>
                          <td>
                            <strong>{pat.full_name || pat.patient_name || pat.patient_id}</strong>
                          </td>
                          <td>Bed {pat.bed_number || "--"}</td>
                          <td>
                            <MewsChip score={Number(pat.mews_score) || 0} />
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: (Number(pat.deterioration_risk) || 0) >= 0.5 ? "var(--vt-crimson)" : "var(--vt-mid-green)" }}>
                              {Math.round((Number(pat.deterioration_risk) || 0.15) * 100)}%
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>
                            {pat.chief_complaint || "Routine observation"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="vt-btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                              onClick={() => openModal("xai", pat)}
                            >
                              🔍 View SHAP
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 6: TRANSFERS NETWORK */}
          {activeView === "transfers" && (
            <div className="vt-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "var(--vt-dark-green)" }}>
                    Inter-Hospital Partner Transfer Network
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--vt-text-muted)" }}>
                    Coordinated ambulance transfer protocols and real-time partner bed availability.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                {[
                  { name: "Apollo Clinic & Specialty", icuAvailable: 2, genAvailable: 12, distance: "3.2 km", status: "Open" },
                  { name: "City Diagnostics & Emergency", icuAvailable: 4, genAvailable: 18, distance: "5.1 km", status: "Open" },
                  { name: "Fortis Super Specialty Center", icuAvailable: 1, genAvailable: 8, distance: "8.4 km", status: "High Occupancy" },
                ].map((partner, idx) => (
                  <div key={idx} style={{ background: "#f8faf5", border: "1px solid var(--vt-card-border)", borderRadius: "16px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <strong style={{ fontSize: "14px", color: "var(--vt-dark-green)" }}>{partner.name}</strong>
                      <span style={{ fontSize: "11px", background: "#e8f7ea", color: "var(--vt-mid-green)", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                        {partner.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--vt-text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div>ICU Beds Available: <strong>{partner.icuAvailable}</strong></div>
                      <div>General Beds Available: <strong>{partner.genAvailable}</strong></div>
                      <div>Transfer Transit Distance: <strong>{partner.distance}</strong></div>
                    </div>
                  </div>
                ))}
              </div>

              <h4 style={{ margin: "0 0 12px", color: "var(--vt-dark-green)" }}>Admitted Patients Transfer Roster</h4>
              <div style={{ overflowX: "auto" }}>
                <table className="vt-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Bed</th>
                      <th>Acuity</th>
                      <th>Transfer Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inpatientCensus.map((pat) => (
                      <tr key={pat.patient_id}>
                        <td>
                          <strong>{pat.full_name || pat.patient_name || pat.patient_id}</strong>
                        </td>
                        <td>Bed {pat.bed_number || "--"}</td>
                        <td>
                          <MewsChip score={Number(pat.mews_score) || 0} />
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>
                          {pat.transfer_status || "In-Facility Monitoring"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="vt-btn-cta-admit"
                            style={{ padding: "6px 14px", fontSize: "12px" }}
                            onClick={() => openModal("transfer", pat)}
                          >
                            🚑 Transfer Desk
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 7: CARE PLANS */}
          {activeView === "care_plans" && (
            <div className="vt-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "var(--vt-dark-green)" }}>
                    Clinical Care Directives & Nursing Treatment Plans
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--vt-text-muted)" }}>
                    Doctor orders, diet specifications, therapy intervals, and nursing checklists.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="vt-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Bed</th>
                      <th>Primary Orders</th>
                      <th>Target LOS</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inpatientCensus.map((pat) => (
                      <tr key={pat.patient_id}>
                        <td>
                          <strong>{pat.full_name || pat.patient_name || pat.patient_id}</strong>
                        </td>
                        <td>Bed {pat.bed_number || "--"}</td>
                        <td style={{ fontSize: "12.5px" }}>
                          {pat.chief_complaint || "Continuous physiological observation"}
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>
                          {pat.length_of_stay_days || 3} days
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="vt-btn-secondary"
                            style={{ padding: "6px 14px", fontSize: "12px" }}
                            onClick={() => openModal("carePlans", pat)}
                          >
                            📝 Care Plan Directives
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 8: REPORTS & ANALYTICS */}
          {activeView === "reports" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="vt-card" style={{ padding: "24px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--vt-dark-green)", marginBottom: "12px" }}>
                  Hospital Census & Deterioration Summary
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
                  <div style={{ background: "#f8faf5", padding: "16px", borderRadius: "14px", border: "1px solid var(--vt-card-border)" }}>
                    <div style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>Total Inpatient Census</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--vt-dark-green)", marginTop: "4px" }}>
                      {inpatientCensus.length}
                    </div>
                  </div>
                  <div style={{ background: "#f8faf5", padding: "16px", borderRadius: "14px", border: "1px solid var(--vt-card-border)" }}>
                    <div style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>ICU Acuity Patients</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--vt-crimson)", marginTop: "4px" }}>
                      {inpatientCensus.filter((p) => p.bed_type === "ICU" || (Number(p.mews_score) || 0) >= 4).length}
                    </div>
                  </div>
                  <div style={{ background: "#f8faf5", padding: "16px", borderRadius: "14px", border: "1px solid var(--vt-card-border)" }}>
                    <div style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>Avg Length of Stay</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--vt-dark-green)", marginTop: "4px" }}>
                      2.8d
                    </div>
                  </div>
                  <div style={{ background: "#f8faf5", padding: "16px", borderRadius: "14px", border: "1px solid var(--vt-card-border)" }}>
                    <div style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>Safety Gate Adherence</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--vt-mid-green)", marginTop: "4px" }}>
                      100%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 9: SETTINGS */}
          {activeView === "settings" && (
            <div className="vt-card" style={{ padding: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "var(--vt-dark-green)", marginBottom: "14px" }}>
                Workstation Configuration & Active Credentials
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                <div style={{ background: "#f8faf5", padding: "16px", borderRadius: "14px", border: "1px solid var(--vt-card-border)" }}>
                  <div style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>Logged-in Staff Member</div>
                  <strong style={{ fontSize: "15px", color: "var(--vt-dark-green)" }}>{currentStaff.name}</strong>
                  <div style={{ fontSize: "12px", color: "var(--vt-text-muted)", marginTop: "4px" }}>
                    Role: {currentStaff.role}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--vt-text-muted)", fontFamily: "monospace" }}>
                    Staff ID: {currentStaff.staff_id}
                  </div>
                </div>
                <div style={{ background: "#f8faf5", padding: "16px", borderRadius: "14px", border: "1px solid var(--vt-card-border)" }}>
                  <div style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>Hospital Facility</div>
                  <strong style={{ fontSize: "15px", color: "var(--vt-dark-green)" }}>{currentStaff.hospital_name}</strong>
                  <div style={{ fontSize: "12px", color: "var(--vt-text-muted)", marginTop: "4px" }}>
                    Address: {currentStaff.hospital_address}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--vt-text-muted)", fontFamily: "monospace" }}>
                    Facility ID: {currentStaff.hospital_id}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. RIGHT SLIDING DRAWER (PATIENT QUICK INSPECTION) */}
      <Drawer
        isOpen={Boolean(selectedInpatient)}
        onClose={() => setSelectedInpatient(null)}
        patient={selectedInpatient}
        onOpenFullProfile={(id) => {
          setSelectedProfilePatientId(id);
          setSelectedInpatient(null);
        }}
        onRecordVitals={(pat) => openModal("vitals", pat || selectedInpatient)}
        onOpenECG={(pat) => openModal("ecg", pat || selectedInpatient)}
        onUpdateCarePlan={(pat) => openModal("carePlans", pat || selectedInpatient)}
        onTransfer={(pat) => openModal("transfer", pat || selectedInpatient)}
        onDischarge={(pat) => {
          const mews = Number((pat || selectedInpatient)?.mews_score) || 0;
          if (mews >= 3) {
            alert("Discharge safety gate triggered: MEWS is >= 3. Supervisor clinical override is required to discharge.");
          } else {
            alert(`Discharge process initiated for Bed ${(pat || selectedInpatient)?.bed_number}.`);
          }
        }}
      />

      {/* =========================================================================
          CASE DETAILS MODAL (STAFF COORDINATION ONLY — NO CLINICAL OVERWRITE)
          ========================================================================= */}
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

      {/* =========================================================================
          UNIFIED 8-FACET CLINICAL DOSSIER MODAL
          ========================================================================= */}
      {selectedProfilePatientId && (
        <UnifiedPatientProfileModal
          apiBase={apiBase}
          patientId={selectedProfilePatientId}
          currentStaff={currentStaff}
          onClose={() => setSelectedProfilePatientId(null)}
          onActionTrigger={(action, p) => {
            if (action === "discharged" || action === "icu_upgraded" || action === "vitals_saved" || action === "bed_updated") {
              fetchDashboardData();
            } else if (action === "vitals" || action === "xai" || action === "ecg" || action === "bed" || action === "carePlans" || action === "transfer") {
              openModal(action, p);
            }
          }}
        />
      )}

      {/* =========================================================================
          SUB-MODALS (ALL CLINICAL ACTIONS PRESERVED)
          ========================================================================= */}
      {activeModal === "vitals" && activeModalPatient && (
        <VitalRecorderModal
          apiBase={apiBase}
          patient={activeModalPatient}
          currentStaff={currentStaff}
          onClose={closeModal}
          onVitalsRecorded={() => {
            fetchDashboardData();
          }}
        />
      )}

      {activeModal === "xai" && activeModalPatient && (
        <XAIRiskModal
          apiBase={apiBase}
          patient={activeModalPatient}
          onClose={closeModal}
        />
      )}

      {activeModal === "ecg" && activeModalPatient && (
        <ECGTelemetryModal
          apiBase={apiBase}
          patient={activeModalPatient}
          onClose={closeModal}
        />
      )}

      {activeModal === "bed" && activeModalPatient && (
        <BedManagementModal
          apiBase={apiBase}
          patient={activeModalPatient}
          beds={beds}
          currentStaff={currentStaff}
          onClose={closeModal}
          onBedUpdated={() => {
            fetchDashboardData();
          }}
        />
      )}

      {activeModal === "carePlans" && activeModalPatient && (
        <CarePlansModal
          apiBase={apiBase}
          patient={activeModalPatient}
          currentStaff={currentStaff}
          onClose={closeModal}
        />
      )}

      {activeModal === "transfer" && activeModalPatient && (
        <TransferNetworkModal
          apiBase={apiBase}
          patient={activeModalPatient}
          currentStaff={currentStaff}
          onClose={closeModal}
          onTransferSuccess={(targetHosp) => {
            if (activeModalPatient?.is_demo) {
              handleTransferDemo(activeModalPatient, targetHosp);
            }
            fetchDashboardData();
          }}
        />
      )}

      {activeModal === "admit" && (
        <AdmitPatientModal
          apiBase={apiBase}
          beds={beds}
          currentStaff={currentStaff}
          preSelectedBed={selectedBedForAdmission}
          onClose={closeModal}
          onAdmitted={() => {
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
