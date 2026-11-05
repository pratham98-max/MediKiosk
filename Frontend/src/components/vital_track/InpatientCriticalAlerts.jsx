import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  ChevronRight,
  HeartPulse,
  Activity,
  Check,
} from "lucide-react";

export default function InpatientCriticalAlerts({
  patients = [],
  criticalCount = 0,
  onOpenProfile,
  onOpenCaseDetails,
}) {
  // Filter admitted patients who have actual critical or elevated indicators
  const alertPatients = patients.filter((p) => {
    const mews = Number(p.mews_score) || 0;
    const risk = Number(p.deterioration_risk) || 0;
    const hr = p.heart_rate || 76;
    const spo2 = p.oxygen_saturation || 98;
    return mews >= 3 || risk >= 0.5 || hr > 110 || hr < 50 || spo2 < 93;
  });

  return (
    <section className="opd-alerts-card" aria-label="Inpatient Critical Alerts">
      <div className="opd-alerts-header">
        <div className="opd-alerts-title-wrap">
          <div className="opd-alerts-icon-bubble">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="opd-alerts-title">Critical Inpatient Alerts</h3>
            <p className="opd-alerts-sub">
              Physiological deterioration & acute ward MEWS alerts
            </p>
          </div>
        </div>
        {criticalCount > 0 ? (
          <span className="opd-badge-alert-count">
            {criticalCount} Critical
          </span>
        ) : (
          <span className="opd-badge-clear">Stable</span>
        )}
      </div>

      <div className="opd-alerts-list">
        {alertPatients.length === 0 ? (
          <div className="opd-alerts-empty">
            <div className="opd-alerts-empty-icon">
              <Check size={28} />
            </div>
            <h4>All Inpatients Stable</h4>
            <p>No critical MEWS alerts or physiological deterioration thresholds active across ward beds.</p>
          </div>
        ) : (
          alertPatients.map((pat) => {
            const mews = Number(pat.mews_score) || 0;
            const risk = Number(pat.deterioration_risk) || 0.15;
            const isHigh = mews >= 4 || risk >= 0.7;
            const nameStr = pat.full_name || pat.patient_name || "Inpatient";

            return (
              <div
                key={pat.patient_id}
                className={`opd-alert-item ${isHigh ? "critical" : "acknowledged"}`}
              >
                <div className="opd-alert-item-top">
                  <div className="opd-alert-tag-group">
                    <span className={`opd-alert-tag ${isHigh ? "danger" : "dept"}`}>
                      {isHigh ? <AlertTriangle size={11} /> : <Activity size={11} />}
                      {isHigh ? "High Deterioration" : "Observation Alert"}
                    </span>
                    {pat.bed_number && (
                      <span className="opd-alert-tag dept">Bed {pat.bed_number}</span>
                    )}
                  </div>
                  <span className="opd-alert-time">
                    <Clock size={11} /> Real-time
                  </span>
                </div>

                <div className="opd-alert-patient-name">{nameStr}</div>
                <p className="opd-alert-reason">
                  {pat.mews_explanation ||
                    (isHigh
                      ? `Elevated physiological score: MEWS ${mews} pts. Deterioration probability ${Math.round(risk * 100)}%.`
                      : `Bedside observation: HR ${pat.heart_rate || 76} bpm, SpO2 ${pat.oxygen_saturation || 98}%.`)}
                </p>

                <div className="opd-alert-actions">
                  {pat.session_id && onOpenCaseDetails && (
                    <button
                      type="button"
                      className="opd-btn-ack"
                      style={{ background: "transparent", color: "var(--vt-secondary-text)", border: "1px solid #e4ecda" }}
                      onClick={() => onOpenCaseDetails(pat.session_id)}
                    >
                      Case File
                    </button>
                  )}

                  <button
                    type="button"
                    className="opd-btn-view"
                    onClick={() => onOpenProfile && onOpenProfile(pat.patient_id)}
                  >
                    View Details <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="opd-alerts-footer">
        <HeartPulse size={13} className="text-primary-green" />
        <span>Inpatient monitoring engine computes Subbe (2001) MEWS and XGBoost risk vectors.</span>
      </div>
    </section>
  );
}

