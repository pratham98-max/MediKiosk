import {
  Building2,
  Calendar,
  UserCheck,
  ShieldAlert,
  Activity,
} from "lucide-react";

export default function WelcomeSection({
  currentStaff,
  unacknowledgedRedFlags = 0,
}) {
  const staffName = currentStaff?.name || "Healthcare Staff";
  const hospitalName = currentStaff?.hospital_name || "MediKiosk General Hospital";
  const staffRole = currentStaff?.role || "Triage Coordinator / Nurse";

  // Formatted date (e.g., Thursday, Nov 5, 2026)
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <section className="opd-welcome-card" aria-label="Welcome and Overview Section">
      <div className="opd-welcome-main">
        <div className="opd-welcome-greeting">
          <div className="opd-welcome-badge">
            <span className="opd-live-pulse" />
            <span>Outpatient Intake Active</span>
          </div>

          <h2 className="opd-welcome-title">
            Welcome back, <span className="highlight">{staffName}</span>
          </h2>
          <p className="opd-welcome-sub">
            Here is your OPD activity and patient intake overview for today.
          </p>
        </div>

        <div className="opd-welcome-meta-chips">
          <div className="opd-meta-chip">
            <Calendar size={14} className="opd-chip-icon" />
            <span>{todayFormatted}</span>
          </div>

          <div className="opd-meta-chip">
            <Building2 size={14} className="opd-chip-icon" />
            <span className="font-semibold">{hospitalName}</span>
          </div>

          <div className="opd-meta-chip">
            <UserCheck size={14} className="opd-chip-icon" />
            <span>{staffRole}</span>
          </div>
        </div>
      </div>

      <div className="opd-welcome-deco">
        {unacknowledgedRedFlags > 0 ? (
          <div className="opd-welcome-alert-pill">
            <ShieldAlert size={16} />
            <div>
              <strong>{unacknowledgedRedFlags} Red Flag Case{unacknowledgedRedFlags > 1 ? "s" : ""}</strong>
              <span>Immediate triage review required</span>
            </div>
          </div>
        ) : (
          <div className="opd-welcome-status-pill">
            <Activity size={16} />
            <div>
              <strong>OPD Census Operational</strong>
              <span>All queue triage metrics normal</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
