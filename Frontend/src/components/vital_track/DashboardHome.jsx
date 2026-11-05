import React, { useState } from "react";
import KpiCard from "../ui/KpiCard";
import ChartCard from "../ui/ChartCard";
import AlertItem from "../ui/AlertItem";
import {
  PATIENT_FLOW_DATA,
  WARD_UTILIZATION_DATA,
  MEWS_DISTRIBUTION_DATA,
  HOURLY_RED_FLAGS_DATA,
  OPD_STATUS_FUNNEL,
  WARD_AVERAGE_VITALS,
  COMPLAINT_CATEGORIES,
  AI_RECOMMENDATIONS_DATA,
} from "../ui/mockData";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardHome({
  counts = {},
  beds = [],
  patients = [],
  redFlags = [],
  onAcknowledgeRedFlag,
  onOpenCaseDetails,
  onOpenPatientProfile,
  onOpenVitalsModal,
  onNavigateView,
  acknowledgingId,
}) {
  const [patientFlowRange, setPatientFlowRange] = useState("1 Day");
  const [activeAlertTab, setActiveAlertTab] = useState("all"); // 'all' | 'rf' | 'mews'
  const [dismissedAiIds, setDismissedAiIds] = useState([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState([]);

  // Calculate real bed statistics
  const occupiedBeds = beds.filter((b) => b.status === "occupied" || b.patient_id);
  const icuBeds = beds.filter((b) => b.bed_type === "ICU");
  const icuOccupied = icuBeds.filter((b) => b.status === "occupied" || b.patient_id);
  const icuUsagePct = icuBeds.length > 0 ? Math.round((icuOccupied.length / icuBeds.length) * 100) : 0;
  const highMewsPatients = patients.filter((p) => (p.mews_score || 0) >= 3);

  // Filter AI recommendations
  const activeAiRecs = AI_RECOMMENDATIONS_DATA.filter((r) => !dismissedAiIds.includes(r.id));
  const heroRec = activeAiRecs.find((r) => r.isHero) || activeAiRecs[0];
  const secondaryRecs = activeAiRecs.filter((r) => r.id !== heroRec?.id);

  // Separate alert types according to Rule 9
  const unacknowledgedRf = redFlags.filter((rf) => !rf.red_flag_acknowledged);
  const mewsAlerts = highMewsPatients.map((p) => ({
    id: `mews-${p.patient_id}`,
    type: "mews",
    title: `Bed ${p.bed_number || "A"}: ${p.patient_name || p.name || p.patient_id}`,
    subtext: `Elevated MEWS deterioration score of ${p.mews_score} points (HR ${p.heart_rate || "--"} bpm, SpO₂ ${p.oxygen_saturation || "--"}%).`,
    time: "Bedside Monitor",
    patient: p,
  }));

  const filteredAlerts = () => {
    let list = [];
    if (activeAlertTab === "all" || activeAlertTab === "rf") {
      list = list.concat(
        unacknowledgedRf.map((rf) => ({
          id: `rf-${rf.session_id}`,
          type: "rf",
          sessionId: rf.session_id,
          title: `🚨 Red Flag: ${rf.patient_name || "Patient Intake"} (${rf.department})`,
          subtext: `Reason: ${rf.red_flag_reason || "Critical clinical indicator flagged by AI intake"}`,
          time: new Date(rf.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          patientId: rf.patient_id,
        }))
      );
    }
    if (activeAlertTab === "all" || activeAlertTab === "mews") {
      list = list.concat(mewsAlerts);
    }
    return list.filter((a) => !dismissedAlertIds.includes(a.id));
  };

  const alertItems = filteredAlerts();

  return (
    <div className="vt-page-body">
      {/* ===================================================================== */}
      {/* 1. TOP ROW: KPI CARDS STRIP                                           */}
      {/* ===================================================================== */}
      <section className="vt-kpi-grid">
        <KpiCard
          label="ICU / Beds Occupied"
          number={`${occupiedBeds.length}/${beds.length || 9}`}
          unit={`(${Math.round(((occupiedBeds.length || 0) / (beds.length || 9)) * 100)}%)`}
          sparkType="gauge"
          color="#0b3d1e"
          badgeText={icuUsagePct > 80 ? "ICU High" : "Normal"}
          badgeType={icuUsagePct > 80 ? "danger" : "normal"}
        />

        <KpiCard
          label="High-Risk (MEWS ≥ 3)"
          number={highMewsPatients.length}
          unit="patients"
          sparkType="bars"
          color="#dc2626"
          badgeText={highMewsPatients.length > 0 ? "Urgent" : "Stable"}
          badgeType={highMewsPatients.length > 0 ? "danger" : "success"}
        />

        <KpiCard
          label="Active Red Flags"
          number={unacknowledgedRf.length}
          unit="unack'd"
          sparkType="wave"
          color="#dc2626"
          badgeText={unacknowledgedRf.length > 0 ? "Action Req" : "Clear"}
          badgeType={unacknowledgedRf.length > 0 ? "danger" : "success"}
        />

        <KpiCard
          label="OPD Waiting Queue"
          number={counts.in_process || 0}
          unit="patients"
          sparkType="dots"
          color="#1e9e4a"
          badgeText="In Process"
          badgeType="normal"
        />

        <KpiCard
          label="Ready for Doctor"
          number={counts.ready_for_doctor || 0}
          unit="screened"
          sparkType="gauge"
          color="#1e9e4a"
          badgeText="Triage Complete"
          badgeType="success"
        />

        <KpiCard
          label="ER / Consult Avg Wait"
          number="14m"
          unit="est."
          sparkType="wave"
          color="#0b3d1e"
          badgeText="Optimal"
          badgeType="success"
        />
      </section>

      {/* ===================================================================== */}
      {/* 2. MIDDLE ROW: AI RECOMMENDATIONS PANEL + CRITICAL ALERTS PANEL       */}
      {/* ===================================================================== */}
      <section className="vt-mid-row">
        {/* LEFT (WIDE): AI RECOMMENDATIONS PANEL */}
        <div className="vt-panel">
          <div className="vt-panel-header">
            <h3 className="vt-panel-title">
              <span>🤖</span> AI Insights & Clinical Priorities
            </h3>
            <button
              type="button"
              className="vt-btn-see-all"
              onClick={() => onNavigateView && onNavigateView("xai")}
            >
              See All Models →
            </button>
          </div>

          <div className="vt-ai-grid">
            {/* FEATURED DARK GREEN CARD */}
            {heroRec && (
              <div className="vt-ai-hero-card">
                <div className="vt-ai-hero-head">
                  <span className="vt-ai-chip-dark">{heroRec.category}</span>
                  <span style={{ fontSize: "11px", color: "var(--vt-lime)" }}>
                    {heroRec.confidence} • {heroRec.time}
                  </span>
                </div>

                <div>
                  <h4 className="vt-ai-hero-title">{heroRec.title}</h4>
                  <p style={{ margin: "6px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
                    {heroRec.subtext}
                  </p>
                </div>

                <div className="vt-ai-hero-actions">
                  <button
                    type="button"
                    className="vt-btn-ai-accept"
                    onClick={() => onNavigateView && onNavigateView("beds")}
                  >
                    {heroRec.actionLabel}
                  </button>
                  <button
                    type="button"
                    className="vt-btn-ai-dismiss"
                    onClick={() => setDismissedAiIds((prev) => [...prev, heroRec.id])}
                  >
                    {heroRec.dismissLabel}
                  </button>
                </div>
              </div>
            )}

            {/* SECONDARY AI RECOMMENDATIONS COLUMN */}
            <div className="vt-ai-sub-col">
              {secondaryRecs.slice(0, 3).map((rec) => (
                <div key={rec.id} className="vt-ai-card-sub">
                  <div className="vt-ai-card-sub-top">
                    <span style={{ fontWeight: 700, color: "var(--vt-dark-green)" }}>{rec.category}</span>
                    <span>{rec.confidence} • {rec.time}</span>
                  </div>
                  <div className="vt-ai-card-sub-text">{rec.title}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>
                      {rec.subtext.substring(0, 58)}...
                    </span>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--vt-dark-green)",
                        fontWeight: 700,
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                      onClick={() => setDismissedAiIds((prev) => [...prev, rec.id])}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: "11px", color: "var(--vt-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>ℹ️</span>
            <span>
              <strong>Rule 12 Compliance:</strong> AI recommendations are generated from real hospital telemetry & synthetic ML models. They assist workflow and never override attending physician judgment.
            </span>
          </div>
        </div>

        {/* RIGHT (NARROW): CRITICAL ALERTS PANEL (Rule 9 Dual-Alert Isolation) */}
        <div className="vt-panel">
          <div className="vt-panel-header">
            <h3 className="vt-panel-title">
              <span>⚠️</span> Critical Alerts Panel
            </h3>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                background: alertItems.length > 0 ? "var(--vt-crimson-soft)" : "#e8f7ea",
                color: alertItems.length > 0 ? "var(--vt-crimson)" : "var(--vt-mid-green)",
              }}
            >
              {alertItems.length} Active
            </span>
          </div>

          {/* Rule 9 Tabs: Clearly separating AI Chat Red Flags from MEWS Alerts */}
          <div className="vt-alerts-tabs">
            <button
              type="button"
              className={`vt-alert-tab-btn ${activeAlertTab === "all" ? "active" : ""}`}
              onClick={() => setActiveAlertTab("all")}
            >
              All Alerts
            </button>
            <button
              type="button"
              className={`vt-alert-tab-btn rf ${activeAlertTab === "rf" ? "active" : ""}`}
              onClick={() => setActiveAlertTab("rf")}
            >
              🚨 AI Chat Red Flags ({unacknowledgedRf.length})
            </button>
            <button
              type="button"
              className={`vt-alert-tab-btn mews ${activeAlertTab === "mews" ? "active" : ""}`}
              onClick={() => setActiveAlertTab("mews")}
            >
              ⚡ MEWS Alerts ({mewsAlerts.length})
            </button>
          </div>

          <div className="vt-alert-list">
            {alertItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--vt-text-muted)", fontSize: "13px" }}>
                <span>✓</span>
                <p style={{ margin: "4px 0 0" }}>No critical clinical alerts in this category.</p>
              </div>
            ) : (
              alertItems.map((item) => (
                <AlertItem
                  key={item.id}
                  type={item.type}
                  title={item.title}
                  subtext={item.subtext}
                  time={item.time}
                  ackLoading={acknowledgingId === item.sessionId}
                  onView={() => {
                    if (item.type === "rf") onOpenCaseDetails && onOpenCaseDetails(item.sessionId);
                    else onOpenPatientProfile && onOpenPatientProfile(item.patient.patient_id || item.patient.id);
                  }}
                  onAck={() => {
                    if (item.type === "rf") onAcknowledgeRedFlag && onAcknowledgeRedFlag(item.sessionId);
                    else onOpenVitalsModal && onOpenVitalsModal(item.patient);
                  }}
                  onDismiss={() => setDismissedAlertIds((prev) => [...prev, item.id])}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. BOTTOM ROW: HIGH-DENSITY CLINICAL ANALYTICS CHARTS                 */}
      {/* ===================================================================== */}
      <section className="vt-charts-grid">
        {/* CHART A: PATIENT FLOW AREA CHART */}
        <ChartCard
          title="Patient Flow & Admission Rate"
          subtitle="Real-time patient census volume over historical benchmarks"
          range={patientFlowRange}
          onRangeChange={setPatientFlowRange}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={PATIENT_FLOW_DATA[patientFlowRange] || PATIENT_FLOW_DATA["1 Day"]}>
              <defs>
                <linearGradient id="vtFlowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e9e4a" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#1e9e4a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf4ea" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#5e7465" }} stroke="#d4e2d0" />
              <YAxis tick={{ fontSize: 11, fill: "#5e7465" }} stroke="#d4e2d0" />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2ebe0",
                  boxShadow: "0 6px 18px rgba(11, 61, 30, 0.08)",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="patients" stroke="#0b3d1e" strokeWidth={2.5} fillOpacity={1} fill="url(#vtFlowGrad)" name="Total Patients" />
              <Area type="monotone" dataKey="admissions" stroke="#d97706" strokeWidth={2} fillOpacity={0} strokeDasharray="4 4" name="Admissions" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* CHART B: WARD BED UTILIZATION RADIAL GAUGES */}
        <ChartCard
          title="Ward Bed Utilization"
          subtitle="Real-time occupancy percentages across hospital units"
        >
          <div className="vt-gauges-row">
            {WARD_UTILIZATION_DATA.map((ward) => (
              <div key={ward.name} className="vt-gauge-box">
                <span className="vt-gauge-val" style={{ color: ward.color }}>
                  {ward.current}%
                </span>
                <span className="vt-gauge-label">{ward.name}</span>
                <div style={{ width: "100%", height: "6px", background: "#e8efe5", borderRadius: "999px", overflow: "hidden", marginTop: "4px" }}>
                  <div style={{ width: `${ward.current}%`, height: "100%", background: ward.color }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "14px", borderTop: "1px solid #edf4ea", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "var(--vt-text-muted)" }}>
            <span>Total Station Capacity: <strong>9 Ward Beds</strong></span>
            <span>Allocated: <strong>{occupiedBeds.length} Beds</strong> ({Math.round(((occupiedBeds.length || 0) / 9) * 100)}%)</span>
          </div>
        </ChartCard>

        {/* CHART C: MEWS DETERIORATION SCORE DISTRIBUTION */}
        <ChartCard
          title="MEWS Deterioration Distribution"
          subtitle="Patient breakdown by Subbe et al. (2001) clinical risk bands"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MEWS_DISTRIBUTION_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edf4ea" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#5e7465" }} />
              <YAxis dataKey="band" type="category" tick={{ fontSize: 11, fill: "#5e7465" }} width={90} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {MEWS_DISTRIBUTION_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* CHART D: RED FLAGS VS NORMAL INTAKES PER HOUR */}
        <ChartCard
          title="Intake Volume & Red Flags"
          subtitle="Hourly triage rate comparing normal intake vs clinical red flags"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={HOURLY_RED_FLAGS_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf4ea" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#5e7465" }} />
              <YAxis tick={{ fontSize: 11, fill: "#5e7465" }} />
              <Tooltip />
              <Bar dataKey="normal" fill="#bce1ca" name="Normal Intakes" radius={[4, 4, 0, 0]} />
              <Bar dataKey="redFlags" fill="#dc2626" name="Red Flags" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* CHART E: OPD STATUS FUNNEL */}
        <ChartCard
          title="OPD Queue Workflow Funnel"
          subtitle="Patients moving from Intake to Consultation and Discharge"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            {OPD_STATUS_FUNNEL.map((step) => (
              <div key={step.stage}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                  <span style={{ fontWeight: 600 }}>{step.stage}</span>
                  <span style={{ color: "var(--vt-dark-green)", fontWeight: 700 }}>{step.count} patients</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#edf4ea", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (step.count / 34) * 100)}%`, height: "100%", background: step.color }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* CHART F: WARD AVERAGE VITALS TREND */}
        <ChartCard
          title="Average Ward Physiological Trends"
          subtitle="Aggregated bedside vitals telemetry (Heart Rate, SpO2, Temp)"
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={WARD_AVERAGE_VITALS}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf4ea" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#5e7465" }} />
              <YAxis tick={{ fontSize: 11, fill: "#5e7465" }} />
              <Tooltip />
              <Line type="monotone" dataKey="avgHR" stroke="#dc2626" strokeWidth={2} name="Avg HR (bpm)" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="avgSpO2" stroke="#1e9e4a" strokeWidth={2} name="Avg SpO2 (%)" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  );
}
