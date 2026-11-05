import { useState } from "react";
import {
  Sparkles,
  Bot,
  X,
  Stethoscope,
  ArrowRight,
  Info,
} from "lucide-react";

export default function AIRecommendations({
  patients = [],
  redFlags = [],
  counts = {},
  onOpenCaseDetails,
  onOpenPatientProfile,
}) {
  const [dismissedIds, setDismissedIds] = useState([]);

  // Synthesize REAL recommendations strictly based on actual state and active queue data
  const recommendations = [];

  // Recommendation 1: Acute Red Flags pending triage acknowledgement
  const unackFlags = redFlags.filter((rf) => !rf.red_flag_acknowledged);
  if (unackFlags.length > 0) {
    const firstRf = unackFlags[0];
    recommendations.push({
      id: "rec-urgent-redflag",
      priority: "high",
      type: "Clinical Triage",
      title: `Prioritize immediate review for ${firstRf.full_name || firstRf.patient_name || "Emergency Patient"}`,
      description:
        firstRf.red_flag_reason ||
        "Critical clinical signs detected during conversational AI intake. Immediate desk triage review recommended.",
      patientId: firstRf.patient_id,
      sessionId: firstRf.session_id,
      patientName: firstRf.full_name || firstRf.patient_name,
      confidence: "High Severity",
      actionText: "Review Red Flag",
      actionType: "case",
    });
  }

  // Recommendation 2: Patients in "Ready for Doctor" needing assignment
  const readyPatients = patients.filter(
    (p) => p.status === "ready_for_doctor" || p.status === "ready_for_opd"
  );
  if (readyPatients.length > 0) {
    const nextPatient = readyPatients[0];
    recommendations.push({
      id: "rec-ready-doctor",
      priority: "medium",
      type: "Doctor Assignment",
      title: `${nextPatient.patient_name} intake completed & ready for consultation`,
      description: `Intake interview and symptom extraction completed for ${nextPatient.department || "General Medicine"}. Ready to notify attending physician Dr. ${nextPatient.doctor_name || "On-Duty"}.`,
      patientId: nextPatient.patient_id,
      sessionId: nextPatient.session_id,
      patientName: nextPatient.patient_name,
      confidence: "Queue Optimization",
      actionText: "Open Patient Dossier",
      actionType: "profile",
    });
  }

  // Recommendation 3: Intake sessions pending clarification
  const pendingClarification = patients.filter(
    (p) => p.status === "pending_clarification" || p.has_contradiction === 1
  );
  if (pendingClarification.length > 0) {
    const pClar = pendingClarification[0];
    recommendations.push({
      id: "rec-contradiction",
      priority: "medium",
      type: "OCR & Document Verification",
      title: `Review document contradiction for ${pClar.patient_name}`,
      description:
        "Discrepancy detected between patient self-report and uploaded EMR documentation. Staff clarification recommended before consultation.",
      patientId: pClar.patient_id,
      sessionId: pClar.session_id,
      patientName: pClar.patient_name,
      confidence: "Audit Rule",
      actionText: "Inspect Case",
      actionType: "case",
    });
  }

  // Recommendation 4: Workload / Flow alert
  if ((counts.in_process || 0) > 3) {
    recommendations.push({
      id: "rec-flow-kiosks",
      priority: "low",
      type: "Intake Flow",
      title: `${counts.in_process} active self-service kiosk sessions`,
      description:
        "High patient registration volume at entrance kiosks. Ensure triage desk is prepped for imminent consultation requests.",
      confidence: "Capacity Trend",
    });
  }

  // Filter out any dismissed recommendations
  const activeRecs = recommendations.filter((r) => !dismissedIds.includes(r.id));

  const handleDismiss = (id) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const handleAction = (rec) => {
    if (rec.actionType === "case" && rec.sessionId && onOpenCaseDetails) {
      onOpenCaseDetails(rec.sessionId);
    } else if (rec.actionType === "profile" && rec.patientId && onOpenPatientProfile) {
      onOpenPatientProfile(rec.patientId);
    }
  };

  if (activeRecs.length === 0) {
    return (
      <div className="opd-ai-panel-empty">
        <div className="opd-ai-empty-header">
          <Bot size={20} className="text-primary-green" />
          <div>
            <h4 className="opd-ai-empty-title">AI Clinical Insights & Recommendations</h4>
            <p className="opd-ai-empty-sub">
              No active intake bottlenecks or clinical escalation alerts detected at this time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Highlight the primary (hero) recommendation
  const heroRec = activeRecs[0];
  const secondaryRecs = activeRecs.slice(1);

  return (
    <section className="opd-ai-panel" aria-label="AI Clinical Insights Panel">
      <div className="opd-ai-header">
        <div className="opd-ai-title-wrap">
          <div className="opd-ai-badge-icon">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="opd-ai-title">AI Clinical Insights & Intake Flow</h3>
            <p className="opd-ai-sub">
              Predictive operational recommendations and clinical intake alerts
            </p>
          </div>
        </div>
        <span className="opd-ai-count-chip">{activeRecs.length} Actionable</span>
      </div>

      <div className="opd-ai-grid">
        {/* HERO RECOMMENDATION CARD */}
        <div className={`opd-ai-hero-card ${heroRec.priority}`}>
          <div className="opd-ai-card-meta">
            <span className="opd-ai-type-pill">
              <Bot size={12} /> {heroRec.type}
            </span>
            <span className="opd-ai-confidence">{heroRec.confidence}</span>
            <button
              type="button"
              className="opd-ai-dismiss-btn"
              onClick={() => handleDismiss(heroRec.id)}
              title="Dismiss recommendation"
            >
              <X size={14} />
            </button>
          </div>

          <h4 className="opd-ai-hero-title">{heroRec.title}</h4>
          <p className="opd-ai-hero-desc">{heroRec.description}</p>

          <div className="opd-ai-hero-footer">
            {heroRec.patientName && (
              <span className="opd-ai-patient-ref">
                <Stethoscope size={13} /> {heroRec.patientName}
              </span>
            )}
            {heroRec.actionText && (
              <button
                type="button"
                className="opd-ai-action-btn"
                onClick={() => handleAction(heroRec)}
              >
                <span>{heroRec.actionText}</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* SECONDARY RECOMMENDATIONS */}
        {secondaryRecs.length > 0 && (
          <div className="opd-ai-secondary-stack">
            {secondaryRecs.map((rec) => (
              <div key={rec.id} className="opd-ai-secondary-card">
                <div className="opd-ai-card-meta">
                  <span className="opd-ai-type-pill secondary">
                    <Info size={11} /> {rec.type}
                  </span>
                  <button
                    type="button"
                    className="opd-ai-dismiss-btn"
                    onClick={() => handleDismiss(rec.id)}
                    title="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>

                <div className="opd-ai-sec-title">{rec.title}</div>
                <p className="opd-ai-sec-desc">{rec.description}</p>

                {rec.actionText && (
                  <button
                    type="button"
                    className="opd-ai-sec-action"
                    onClick={() => handleAction(rec)}
                  >
                    {rec.actionText} →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
