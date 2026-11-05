import {
  AlertTriangle,
  Clock,
  Check,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Sparkles,
} from "lucide-react";

export default function OPDCriticalAlerts({
  redFlags = [],
  unacknowledgedCount = 0,
  onOpenCaseDetails,
  onAcknowledgeRedFlag,
  acknowledgingId,
}) {
  const unacknowledgedFlags = redFlags.filter((rf) => !rf.red_flag_acknowledged);
  const acknowledgedFlags = redFlags.filter((rf) => Boolean(rf.red_flag_acknowledged));

  return (
    <section className="opd-alerts-card" aria-label="OPD Critical Alerts Panel">
      <div className="opd-alerts-header">
        <div className="opd-alerts-title-wrap">
          <div className="opd-alerts-icon-bubble">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="opd-alerts-title">Critical Alerts Panel</h3>
            <p className="opd-alerts-sub">
              Real-time conversational & clinical red flags
            </p>
          </div>
        </div>
        {unacknowledgedCount > 0 ? (
          <span className="opd-badge-alert-count">
            {unacknowledgedCount} Active
          </span>
        ) : (
          <span className="opd-badge-clear">Clear</span>
        )}
      </div>

      <div className="opd-alerts-list">
        {redFlags.length === 0 ? (
          <div className="opd-alerts-empty">
            <div className="opd-alerts-empty-icon">
              <Check size={28} />
            </div>
            <h4>No Active OPD Alerts</h4>
            <p>All outpatient triage evaluations and intake symptoms are within normal parameters.</p>
          </div>
        ) : (
          <>
            {/* 1. Unacknowledged (Highest Attention) */}
            {unacknowledgedFlags.map((flag) => {
              const patientName = flag.full_name || flag.patient_name || "Emergency Patient";
              const sessionId = flag.session_id;
              const isAcknowledging = acknowledgingId === sessionId;

              return (
                <div key={sessionId || flag.patient_id} className="opd-alert-item critical">
                  <div className="opd-alert-item-top">
                    <div className="opd-alert-tag-group">
                      <span className="opd-alert-tag danger">
                        <AlertTriangle size={11} /> Red Flag
                      </span>
                      {flag.department && (
                        <span className="opd-alert-tag dept">{flag.department}</span>
                      )}
                    </div>
                    {flag.created_at && (
                      <span className="opd-alert-time">
                        <Clock size={11} />
                        {new Date(flag.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  <div className="opd-alert-patient-name">{patientName}</div>
                  <p className="opd-alert-reason">
                    {flag.red_flag_reason ||
                      flag.chief_complaint ||
                      "Patient reported acute symptoms triggering clinical red flag."}
                  </p>

                  <div className="opd-alert-actions">
                    <button
                      type="button"
                      className="opd-btn-ack"
                      disabled={isAcknowledging}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onAcknowledgeRedFlag) onAcknowledgeRedFlag(sessionId, e);
                      }}
                    >
                      {isAcknowledging ? (
                        "Saving..."
                      ) : (
                        <>
                          <Check size={13} /> Acknowledge
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="opd-btn-view"
                      onClick={() => onOpenCaseDetails && onOpenCaseDetails(sessionId)}
                    >
                      View Case <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 2. Recently Acknowledged */}
            {acknowledgedFlags.map((flag) => {
              const patientName = flag.full_name || flag.patient_name || "Patient";
              const sessionId = flag.session_id;

              return (
                <div key={sessionId || flag.patient_id} className="opd-alert-item acknowledged">
                  <div className="opd-alert-item-top">
                    <span className="opd-alert-tag ack">
                      <UserCheck size={11} /> Acknowledged by Staff
                    </span>
                    {flag.department && (
                      <span className="opd-alert-tag dept">{flag.department}</span>
                    )}
                  </div>

                  <div className="opd-alert-patient-name">{patientName}</div>
                  <p className="opd-alert-reason muted">
                    {flag.red_flag_reason || flag.chief_complaint || "Monitored case."}
                  </p>

                  <div className="opd-alert-actions">
                    <button
                      type="button"
                      className="opd-btn-view full"
                      onClick={() => onOpenCaseDetails && onOpenCaseDetails(sessionId)}
                    >
                      View Case Details <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="opd-alerts-footer">
        <Sparkles size={13} className="text-primary-green" />
        <span>Triage AI automatically scans incoming intake sessions for 24+ acute red flags.</span>
      </div>
    </section>
  );
}
