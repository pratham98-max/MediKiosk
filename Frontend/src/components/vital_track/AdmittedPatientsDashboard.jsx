import { useState, useMemo } from "react";
import {
  Users,
  BedDouble,
  AlertTriangle,
  Activity,
  HeartPulse,
  ClipboardCheck,
  TrendingUp,
  RotateCcw,
  Radio,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import InpatientKpiCard from "./InpatientKpiCard";
import AdmittedPatientTable from "./AdmittedPatientTable";
import InpatientCriticalAlerts from "./InpatientCriticalAlerts";
import InpatientAiInsights from "./InpatientAiInsights";
import BedManagementView from "./BedManagementView";
import VitalsOverviewSection from "./VitalsOverviewSection";

export default function AdmittedPatientsDashboard({
  beds = [],
  patients = [],
  loading = false,
  onOpenProfile,
  onOpenCaseDetails, // Allowed option to view case in admitted dashboard
  onAllocateBed,
  onRecordVitals,
  onOpenECG,
  onTransfer,
  onOptimizeBeds,
  optimizing = false,
  optimizeMessage = "",
  showBedManagementOnly = false,
  isDemoMode = false,
  onToggleDemoMode,
  onResetDemo,
}) {
  const [subView, setSubView] = useState(showBedManagementOnly ? "beds" : "overview"); // 'overview' | 'beds'
  const [patientFlowRange, setPatientFlowRange] = useState("1 Day");
  const [showLiveStream, setShowLiveStream] = useState(false);
  const [selectedStreamPatientId, setSelectedStreamPatientId] = useState(null);

  // Admitted census: patients currently assigned an active bed (or marked admitted in demo mode)
  const admittedPatients = useMemo(() => {
    return patients.filter((p) => (Boolean(p.bed_number) && p.bed_status === "occupied") || p.is_admitted);
  }, [patients]);

  // Selected streaming patient for live vitals overview
  const streamPatient = useMemo(() => {
    if (selectedStreamPatientId) {
      return admittedPatients.find((p) => p.patient_id === selectedStreamPatientId) || admittedPatients[0];
    }
    return admittedPatients.find((p) => p.scenario === "high_mews") || admittedPatients[0] || {};
  }, [admittedPatients, selectedStreamPatientId]);

  // Bed metrics
  const totalBeds = beds.length || 9;
  const occupiedBeds = beds.filter((b) => b.status === "occupied").length;
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Clinical condition counts
  const criticalPatients = admittedPatients.filter(
    (p) => (Number(p.mews_score) || 0) >= 4 || (Number(p.deterioration_risk) || 0) >= 0.7
  );
  const elevatedMewsPatients = admittedPatients.filter(
    (p) => (Number(p.mews_score) || 0) >= 3
  );
  const dischargeReadyPatients = admittedPatients.filter(
    (p) => (Number(p.mews_score) || 0) < 2 && (Number(p.deterioration_risk) || 0) < 0.3
  );

  // 1. WARD UTILIZATION DATA FOR CIRCULAR GAUGES (VitalTrack reference)
  const wardGauges = useMemo(() => {
    const wards = [
      { id: "general", name: "General Ward", beds: beds.filter((b) => b.bed_type === "General" || b.bed_type === "Ward" || b.bed_type === "general") },
      { id: "icu", name: "ICU", beds: beds.filter((b) => b.bed_type === "ICU" || b.bed_type === "icu") },
      { id: "recovery", name: "Recovery", beds: beds.filter((b) => b.bed_type === "Recovery" || b.bed_type === "StepDown") },
      { id: "emergency", name: "Emergency", beds: beds.filter((b) => b.bed_type === "Emergency") },
    ];

    return wards.map((w) => {
      const wTotal = w.beds.length || (w.id === "icu" ? 2 : w.id === "general" ? 5 : 1);
      const wOccupied = w.beds.filter((b) => b.status === "occupied").length;
      const wAvailable = Math.max(0, wTotal - wOccupied);
      const pct = Math.round((wOccupied / wTotal) * 100);
      return {
        id: w.id,
        name: w.name,
        total: wTotal,
        occupied: wOccupied,
        available: wAvailable,
        pct: isNaN(pct) ? 0 : pct,
      };
    });
  }, [beds]);

  // 2. PATIENT ADMISSION FLOW (Area line chart - Distinct Blue/Teal clinical palette)
  const patientFlowData = useMemo(() => {
    if (admittedPatients.length === 0) {
      return [
        { day: "Mon", admissions: 1 },
        { day: "Tue", admissions: 2 },
        { day: "Wed", admissions: 1 },
        { day: "Thu", admissions: 3 },
        { day: "Fri", admissions: 2 },
        { day: "Sat", admissions: 1 },
        { day: "Sun", admissions: 2 },
      ];
    }
    const days = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    admittedPatients.forEach((p) => {
      try {
        const d = new Date(p.created_at || "2026-11-05T08:00:00");
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        if (days[dayName] !== undefined) days[dayName]++;
        else days["Wed"]++;
      } catch {
        days["Wed"]++;
      }
    });
    return Object.entries(days).map(([day, admissions]) => ({ day, admissions }));
  }, [admittedPatients]);

  // 3. XAI RISK DISTRIBUTION (DONUT CHART - Green, Amber, Red Segments)
  const riskDonutData = useMemo(() => {
    let low = 0;
    let med = 0;
    let high = 0;

    admittedPatients.forEach((p) => {
      const risk = Number(p.deterioration_risk) || 0.15;
      if (risk >= 0.7) high++;
      else if (risk >= 0.4) med++;
      else low++;
    });

    return [
      { name: "Low Risk (<40%)", value: Math.max(low, admittedPatients.length === 0 ? 3 : 0), color: "#16a34a" },
      { name: "Medium Risk (40-69%)", value: Math.max(med, admittedPatients.length === 0 ? 1 : 0), color: "#d97706" },
      { name: "High Risk (≥70%)", value: Math.max(high, admittedPatients.length === 0 ? 1 : 0), color: "#dc2626" },
    ].filter((item) => item.value > 0);
  }, [admittedPatients]);

  // 4. DISCHARGE READINESS (CONCENTRIC SEGMENTED RADIAL VISUALIZATION)
  const dischargeData = useMemo(() => {
    const ready = dischargeReadyPatients.length;
    const review = Math.max(0, admittedPatients.length - ready - criticalPatients.length);
    const notReady = criticalPatients.length;
    const total = Math.max(1, admittedPatients.length);

    return [
      { name: "Ready for Discharge", value: ready, color: "#10b981", pct: Math.round((ready / total) * 100), r: 42, stroke: 8 },
      { name: "Under Clinical Review", value: review, color: "#3b82f6", pct: Math.round((review / total) * 100), r: 31, stroke: 7 },
      { name: "Not Ready (High Care)", value: notReady, color: "#ef4444", pct: Math.round((notReady / total) * 100), r: 21, stroke: 6 },
    ];
  }, [dischargeReadyPatients, admittedPatients, criticalPatients]);

  // If user navigated directly to Bed Management
  if (subView === "beds" || showBedManagementOnly) {
    return (
      <div className="inpatient-workspace">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", color: "var(--vt-primary-text)" }}>Ward Bed Management</h2>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--vt-secondary-text)" }}>
              Interactive 9-bed facility map and admission allocation.
            </p>
          </div>
          <button
            type="button"
            className="opd-action-btn secondary"
            onClick={() => setSubView("overview")}
          >
            ← Back to Inpatient Overview
          </button>
        </div>
        <BedManagementView
          beds={beds}
          patients={admittedPatients}
          onAllocateBed={onAllocateBed}
          onOpenProfile={onOpenProfile}
          onRecordVitals={onRecordVitals}
          onOptimizeBeds={onOptimizeBeds}
          optimizing={optimizing}
          optimizeMessage={optimizeMessage}
        />
      </div>
    );
  }

  return (
    <div className="inpatient-workspace">
      {/* DEMO / SIMULATION CONTROL & LIVE VITALS STREAM HEADER */}
      <div
        className="inpatient-demo-bar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "12px 18px",
          background: isDemoMode ? "linear-gradient(90deg, #f0fdf4 0%, #ffffff 100%)" : "#ffffff",
          border: "1px solid #d1fae5",
          borderRadius: "14px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(22, 57, 28, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "#047857",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            <Sparkles size={12} />
            DEMO MODE
          </span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#16391C" }}>
            Synthetic Admitted Census (5 Clinical Scenarios: Stable, High MEWS, High XAI, Abnormal Vitals, Transfer)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onResetDemo && (
            <button
              type="button"
              className="opd-action-btn secondary"
              onClick={onResetDemo}
              style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              title="Reset demo patients and simulated trends to initial baseline"
            >
              <RotateCcw size={13} />
              Reset Demo
            </button>
          )}

          <button
            type="button"
            className="opd-action-btn primary"
            onClick={() => setShowLiveStream((prev) => !prev)}
            style={{
              fontSize: "12px",
              padding: "6px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: showLiveStream ? "#065f46" : "#285C2B",
            }}
          >
            <Radio size={13} />
            {showLiveStream ? "Hide Live Telemetry" : "Simulated Live Vitals Monitor"}
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE LIVE VITALS MONITORING SECTION (ADMITTED INPATIENTS ONLY - SEC 14) */}
      {showLiveStream && (
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #cbe0c5",
            borderRadius: "16px",
            padding: "18px 20px",
            marginBottom: "20px",
            boxShadow: "0 4px 18px rgba(22, 57, 28, 0.06)",
          }}
          aria-label="Simulated Live Vitals Telemetry"
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "14px",
              borderBottom: "1px solid #e4ecda",
              paddingBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "#f0fdf4",
                  display: "grid",
                  placeItems: "center",
                  color: "#047857",
                }}
              >
                <Activity size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#16391C" }}>
                  Continuous Bedside Telemetry Stream
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#556B2F" }}>
                  Real-time physiological observation engine (2s frequency, Subbe 2001 MEWS algorithm)
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label htmlFor="stream-patient-select" style={{ fontSize: "12px", fontWeight: 600, color: "#16391C" }}>
                Active Inpatient:
              </label>
              <select
                id="stream-patient-select"
                value={selectedStreamPatientId || streamPatient?.patient_id || ""}
                onChange={(e) => setSelectedStreamPatientId(e.target.value)}
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbe0c5",
                  background: "#fbfdf9",
                  color: "#16391C",
                  fontWeight: 600,
                }}
              >
                {admittedPatients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.name || p.full_name} · Bed {p.bed_number || "GEN-101"} (MEWS: {p.mews_score || 0}
                    {p.scenario ? ` · ${p.scenario.toUpperCase()}` : ""})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <VitalsOverviewSection
            vitals={{ latest: streamPatient }}
            mews={streamPatient?.mews_score || 0}
          />
        </section>
      )}

      {/* 1. TOP 6 KPI CARDS WITH EMBEDDED MINI VISUALISATIONS */}
      <section className="inpatient-kpi-grid" aria-label="Inpatient VitalTrack KPI Overview">
        {/* Card 1: Total Admitted Patients */}
        <InpatientKpiCard
          label="Total Admitted Patients"
          value={admittedPatients.length}
          unit="patients"
          icon={<Users size={18} />}
          accentColor="#285C2B"
          sparkType="trend"
          badgeText="Inpatient"
          badgeType="success"
        />

        {/* Card 2: Occupied Beds */}
        <InpatientKpiCard
          label="Occupied Beds"
          value={occupiedBeds}
          unit={`/ ${totalBeds}`}
          icon={<BedDouble size={18} />}
          accentColor="#16391C"
          sparkType="ring"
          percent={occupancyRate}
          badgeText={`${occupancyRate}% Full`}
          badgeType={occupancyRate > 80 ? "warn" : "normal"}
        />

        {/* Card 3: Available Beds */}
        <InpatientKpiCard
          label="Available Beds"
          value={availableBeds}
          unit="vacant"
          icon={<BedDouble size={18} />}
          accentColor="#285C2B"
          sparkType="radial"
          percent={totalBeds > 0 ? Math.round((availableBeds / totalBeds) * 100) : 0}
          badgeText={availableBeds > 0 ? "Beds Ready" : "Full"}
          badgeType={availableBeds > 0 ? "success" : "danger"}
          onClick={() => setSubView("beds")}
        />

        {/* Card 4: Critical Patients */}
        <InpatientKpiCard
          label="Critical Patients"
          value={criticalPatients.length}
          unit="patients"
          icon={<AlertTriangle size={18} />}
          accentColor="#dc2626"
          sparkType="wave"
          badgeText={criticalPatients.length > 0 ? "Action Req" : "Stable"}
          badgeType={criticalPatients.length > 0 ? "danger" : "success"}
        />

        {/* Card 5: Elevated MEWS */}
        <InpatientKpiCard
          label="Elevated MEWS"
          value={elevatedMewsPatients.length}
          unit="acuity"
          icon={<Activity size={18} />}
          accentColor="#d97706"
          sparkType="bars"
          badgeText="MEWS ≥ 3"
          badgeType="warn"
        />

        {/* Card 6: Discharge Ready */}
        <InpatientKpiCard
          label="Discharge Ready"
          value={dischargeReadyPatients.length}
          unit="screened"
          icon={<ClipboardCheck size={18} />}
          accentColor="#16a34a"
          sparkType="ring"
          percent={
            admittedPatients.length > 0
              ? Math.round((dischargeReadyPatients.length / admittedPatients.length) * 100)
              : 0
          }
          badgeText="Clear"
          badgeType="success"
        />
      </section>

      {/* 2. MAIN SPLIT WORKSPACE: ADMITTED PATIENT TRACKING (70%) + CRITICAL ALERTS (30%) */}
      <div className="inpatient-main-split">
        {/* LEFT COLUMN: COMPACT ADMITTED PATIENT TABLE */}
        <div className="inpatient-table-col">
          <AdmittedPatientTable
            patients={admittedPatients}
            loading={loading}
            onOpenProfile={onOpenProfile}
            onOpenCaseDetails={onOpenCaseDetails} // View case allowed
            onRecordVitals={onRecordVitals}
            onOpenECG={onOpenECG}
            onTransfer={onTransfer}
            onSwitchToBedMap={() => setSubView("beds")}
          />
        </div>

        {/* RIGHT COLUMN: INPATIENT CRITICAL ALERTS */}
        <aside className="inpatient-alerts-col">
          <InpatientCriticalAlerts
            patients={admittedPatients}
            criticalCount={criticalPatients.length}
            onOpenProfile={onOpenProfile}
            onOpenCaseDetails={onOpenCaseDetails}
          />
        </aside>
      </div>

      {/* 3. AI CLINICAL INSIGHTS */}
      <InpatientAiInsights
        patients={admittedPatients}
        beds={beds}
        onOpenProfile={onOpenProfile}
        onOpenCaseDetails={onOpenCaseDetails}
      />

      {/* 4. DIAGRAMMATIC ANALYTICS SECTION (4 EXACT VISUALIZATIONS) */}
      <section className="inpatient-analytics-section" aria-label="Inpatient Analytics">
        <div className="inpatient-analytics-header">
          <div>
            <h3 className="inpatient-analytics-title">Inpatient Operational & Acuity Analytics</h3>
            <p className="inpatient-analytics-sub">
              Historical flow, circular ward utilization gauges, XAI risk donut and discharge distribution
            </p>
          </div>
        </div>

        {/* ROW 1: PATIENT ADMISSION FLOW + CIRCULAR BED UTILIZATION GAUGES */}
        <div className="inpatient-analytics-row">
          {/* A. PATIENT ADMISSION FLOW (Line chart with shaded area) */}
          <div className="inpatient-chart-card">
            <div className="inpatient-chart-header">
              <div className="inpatient-chart-title-wrap">
                <TrendingUp size={16} className="text-primary-green" />
                <span className="inpatient-chart-title">Patient Admission Flow</span>
              </div>
              <div className="inpatient-range-toggle">
                {["1 Day", "7 Day", "1 Month"].map((rng) => (
                  <button
                    key={rng}
                    type="button"
                    className={`inpatient-range-btn ${patientFlowRange === rng ? "active" : ""}`}
                    onClick={() => setPatientFlowRange(rng)}
                  >
                    {rng}
                  </button>
                ))}
              </div>
            </div>

            <div className="inpatient-chart-canvas">
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={patientFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="admissionFlowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ecda" />
                  <XAxis dataKey="day" stroke="#68776a" fontSize={11} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="#68776a" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e4ecda",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="admissions"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#admissionFlowGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="inpatient-chart-caption">
              Patient admissions registered across inpatient ward beds over time.
            </div>
          </div>

          {/* B. BED UTILIZATION (CIRCULAR RADIAL GAUGES MATCHING VITALTRACK REFERENCE) */}
          <div className="inpatient-chart-card">
            <div className="inpatient-chart-header">
              <div className="inpatient-chart-title-wrap">
                <BedDouble size={16} className="text-primary-green" />
                <span className="inpatient-chart-title">Bed Utilization by Ward</span>
              </div>
              <span className="inpatient-chart-badge">{occupancyRate}% Overall</span>
            </div>

            <div className="inpatient-gauges-grid">
              {wardGauges.map((w) => {
                const strokeDash = 2 * Math.PI * 34; // radius 34 -> circumference ~213.6
                const strokeOffset = strokeDash - (strokeDash * w.pct) / 100;
                const gaugeColor =
                  w.pct >= 90 ? "#dc2626" : w.pct >= 75 ? "#d97706" : "#285c2b";

                return (
                  <div key={w.id} className="inpatient-gauge-item">
                    <div className="inpatient-gauge-circle-wrap">
                      <svg viewBox="0 0 80 80" className="inpatient-gauge-svg">
                        <circle
                          cx="40"
                          cy="40"
                          r="34"
                          fill="none"
                          stroke="#e4ecda"
                          strokeWidth="7"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="34"
                          fill="none"
                          stroke={gaugeColor}
                          strokeWidth="7"
                          strokeDasharray={strokeDash}
                          strokeDashoffset={strokeOffset}
                          strokeLinecap="round"
                          transform="rotate(-90 40 40)"
                          style={{ transition: "stroke-dashoffset 0.6s ease" }}
                        />
                      </svg>
                      <div className="inpatient-gauge-inner-text">
                        <span className="inpatient-gauge-pct">{w.pct}%</span>
                      </div>
                    </div>

                    <div className="inpatient-gauge-label">{w.name}</div>
                    <div className="inpatient-gauge-sub">
                      {w.available} available ({w.occupied}/{w.total})
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="inpatient-chart-caption">
              Circular occupancy distribution across designated inpatient service units.
            </div>
          </div>
        </div>

        {/* ROW 2: PATIENT RISK DISTRIBUTION (DONUT) + DISCHARGE READINESS (SEGMENTED RADIAL) */}
        <div className="inpatient-analytics-row">
          {/* C. PATIENT RISK DISTRIBUTION (Donut chart with total in center) */}
          <div className="inpatient-chart-card">
            <div className="inpatient-chart-header">
              <div className="inpatient-chart-title-wrap">
                <HeartPulse size={16} className="text-primary-green" />
                <span className="inpatient-chart-title">Patient Risk Distribution (XAI)</span>
              </div>
              <span className="inpatient-chart-badge">{admittedPatients.length} Monitored</span>
            </div>

            <div className="inpatient-chart-canvas donut-relative">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={riskDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e4ecda",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", color: "#68776a" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center-metric">
                <span className="donut-center-num">{admittedPatients.length}</span>
                <span className="donut-center-sub">Total</span>
              </div>
            </div>
            <div className="inpatient-chart-caption">
              Validated Explainable AI (XAI) multi-factor risk categorization.
            </div>
          </div>

          {/* D. DISCHARGE READINESS (Unique Segmented Radial / Circular Status Visual) */}
          <div className="inpatient-chart-card">
            <div className="inpatient-chart-header">
              <div className="inpatient-chart-title-wrap">
                <ClipboardCheck size={16} className="text-primary-green" />
                <span className="inpatient-chart-title">Discharge Readiness Status</span>
              </div>
              <span className="inpatient-chart-badge">
                {dischargeReadyPatients.length} Ready
              </span>
            </div>

            <div className="inpatient-chart-canvas">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: "16px", padding: "8px 0" }}>
                {/* Concentric Segmented Radial Rings (SVG) */}
                <div style={{ position: "relative", width: "136px", height: "136px", flexShrink: 0 }}>
                  <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                    {dischargeData.map((d, idx) => {
                      const radius = d.r || (46 - idx * 12);
                      const strokeWidth = d.stroke || 8;
                      const circumference = 2 * Math.PI * radius;
                      const strokeOffset = circumference - (circumference * Math.min(100, d.pct)) / 100;
                      return (
                        <g key={idx}>
                          {/* Track */}
                          <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="none"
                            stroke="#e4ecda"
                            strokeWidth={strokeWidth}
                            opacity={0.5}
                          />
                          {/* Segmented Arc Fill */}
                          <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="none"
                            stroke={d.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeOffset}
                            strokeLinecap="round"
                            style={{ transition: "stroke-dashoffset 0.8s ease" }}
                          />
                        </g>
                      );
                    })}
                  </svg>
                  {/* Concentric Radial Center Core */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ fontSize: "22px", fontWeight: 800, color: "#16391C", lineHeight: 1 }}>
                      {dischargeReadyPatients.length}
                    </span>
                    <span style={{ fontSize: "9.5px", fontWeight: 600, color: "#556B2F", marginTop: "2px" }}>
                      Ready
                    </span>
                  </div>
                </div>

                {/* Legend & Percentages */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: "140px" }}>
                  {dischargeData.map((d, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "11.5px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                        <span style={{ color: "var(--vt-primary-text)", fontWeight: 500 }}>{d.name}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: d.color, whiteSpace: "nowrap" }}>
                        {d.value} ({d.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="inpatient-chart-caption">
              Protocol adherence based on MEWS stability, vital normalcy, and clinical plan orders.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
