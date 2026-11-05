import WelcomeSection from "./WelcomeSection";
import OPDKpiCard from "./OPDKpiCard";
import PatientQueue from "./PatientQueue";
import OPDCriticalAlerts from "./OPDCriticalAlerts";
import AIRecommendations from "./AIRecommendations";
import OPDAnalytics from "./OPDAnalytics";

export default function OpdQueueDashboard({
  counts = {},
  patients = [],
  redFlags = [],
  loading = false,
  activeFilter = "all",
  onSelectFilter,
  onOpenCaseDetails,
  onOpenPatientProfile,
  onAcknowledgeRedFlag,
  onNavigateInpatient,
  acknowledgingId,
  currentStaff,
}) {
  const unacknowledgedRf = redFlags.filter((rf) => !rf.red_flag_acknowledged);

  return (
    <div className="opd-vitaltrack-workspace">
      {/* 1. WELCOME / OVERVIEW SECTION */}
      <WelcomeSection
        currentStaff={currentStaff}
        unacknowledgedRedFlags={unacknowledgedRf.length}
      />

      {/* 2. KPI CARDS ROW (7 PRESERVED METRICS CONNECTED TO FILTERS) */}
      <section className="opd-kpi-row" aria-label="OPD Performance Indicators">
        {/* Metric 1: Total Patients */}
        <OPDKpiCard
          id="total"
          label="Total Patients"
          number={counts.total || patients.length}
          unit="registered"
          sparkType="dots"
          color="#285C2B"
          iconName="users"
          isActive={activeFilter === "all"}
          onClick={() => onSelectFilter && onSelectFilter("all")}
        />

        {/* Metric 2: In Process (Intake) */}
        <OPDKpiCard
          id="in_process"
          label="In Process"
          number={counts.in_process || 0}
          unit="in intake"
          sparkType="wave"
          color="#68776a"
          iconName="clipboard"
          isActive={activeFilter === "in_process"}
          onClick={() => onSelectFilter && onSelectFilter("in_process")}
        />

        {/* Metric 3: Pending Clarification */}
        <OPDKpiCard
          id="pending_clarification"
          label="Pending Clarification"
          number={counts.pending_clarification || 0}
          unit="discrepancy"
          sparkType="bars"
          color="#d97706"
          badgeText={counts.pending_clarification > 0 ? "Review" : null}
          badgeType="warn"
          iconName="clarification"
          isActive={activeFilter === "pending_clarification"}
          onClick={() => onSelectFilter && onSelectFilter("pending_clarification")}
        />

        {/* Metric 4: Ready for Doctor */}
        <OPDKpiCard
          id="ready_for_doctor"
          label="Ready for Doctor"
          number={counts.ready_for_doctor || 0}
          unit="screened"
          sparkType="gauge"
          color="#285C2B"
          badgeText="Next Up"
          badgeType="success"
          iconName="stethoscope"
          isActive={activeFilter === "ready_for_doctor"}
          onClick={() => onSelectFilter && onSelectFilter("ready_for_doctor")}
        />

        {/* Metric 5: In Consultation */}
        <OPDKpiCard
          id="in_consultation"
          label="In Consultation"
          number={counts.in_consultation || 0}
          unit="with MD"
          sparkType="bars"
          color="#0284c7"
          iconName="activity"
          isActive={activeFilter === "in_consultation"}
          onClick={() => onSelectFilter && onSelectFilter("in_consultation")}
        />

        {/* Metric 6: Completed */}
        <OPDKpiCard
          id="completed"
          label="Completed"
          number={counts.completed || 0}
          unit="discharged"
          sparkType="gauge"
          color="#16a34a"
          badgeText="Done"
          badgeType="success"
          iconName="check"
          isActive={activeFilter === "completed"}
          onClick={() => onSelectFilter && onSelectFilter("completed")}
        />

        {/* Metric 7: Red Flag Cases */}
        <OPDKpiCard
          id="red_flag"
          label="Red Flag Cases"
          number={counts.red_flag || unacknowledgedRf.length}
          unit="urgent"
          sparkType="wave"
          color="#dc2626"
          badgeText={unacknowledgedRf.length > 0 ? "Action Req" : "Clear"}
          badgeType={unacknowledgedRf.length > 0 ? "danger" : "success"}
          iconName="alert"
          isActive={activeFilter === "red_flag"}
          onClick={() => onSelectFilter && onSelectFilter("red_flag")}
        />
      </section>

      {/* 3. MAIN WORKSPACE: PATIENT QUEUE (70%) + CRITICAL ALERTS PANEL (30%) */}
      <div className="opd-main-split-layout">
        {/* LEFT COLUMN: PATIENT QUEUE TABLE (68-72%) */}
        <div className="opd-queue-column">
          <PatientQueue
            patients={patients}
            loading={loading}
            activeFilter={activeFilter}
            counts={counts}
            onSelectFilter={onSelectFilter}
            onOpenCaseDetails={onOpenCaseDetails}
            onOpenPatientProfile={onOpenPatientProfile}
            onAcknowledgeRedFlag={onAcknowledgeRedFlag}
            onNavigateInpatient={onNavigateInpatient}
            acknowledgingId={acknowledgingId}
          />
        </div>

        {/* RIGHT COLUMN: CRITICAL OPD ALERTS (28-32%) */}
        <aside className="opd-alerts-column">
          <OPDCriticalAlerts
            redFlags={redFlags}
            unacknowledgedCount={unacknowledgedRf.length}
            onOpenCaseDetails={onOpenCaseDetails}
            onAcknowledgeRedFlag={onAcknowledgeRedFlag}
            acknowledgingId={acknowledgingId}
          />
        </aside>
      </div>

      {/* 4. AI RECOMMENDATIONS PANEL */}
      <AIRecommendations
        patients={patients}
        redFlags={redFlags}
        counts={counts}
        onOpenCaseDetails={onOpenCaseDetails}
        onOpenPatientProfile={onOpenPatientProfile}
      />

      {/* 5. DIAGRAMMATIC ANALYTICS SECTION */}
      <OPDAnalytics
        patients={patients}
        counts={counts}
        redFlags={redFlags}
      />
    </div>
  );
}
