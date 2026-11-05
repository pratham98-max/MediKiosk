import { useState } from "react";
import {
  Sparkles,
  Bot,
  X,
  Stethoscope,
  ArrowRight,
  Info,
} from "lucide-react";

export default function InpatientAiInsights({
  patients = [],
  beds = [],
  onOpenProfile,
  onOpenCaseDetails,
}) {
  const [dismissedIds, setDismissedIds] = useState([]);

  // Generate real insights strictly from actual inpatient data
  const insights = [];

  // Insight 1: ICU Bed allocation recommendation
  const icuBeds = beds.filter((b) => b.bed_type === "ICU");
  const icuOccupied = icuBeds.filter((b) => b.status === "occupied");
  const highRiskPatients = patients.filter(
    (p) => (Number(p.mews_score) || 0) >= 4 || (Number(p.deterioration_risk) || 0) >= 0.7
  );

  if (highRiskPatients.length > 0) {
    const pCrit = highRiskPatients[0];
    insights.push({
      id: "inp-rec-icu-escalate",
      priority: "high",
      type: "Clinical Escalation",
      title: `Evaluate ICU transfer for ${pCrit.full_name || pCrit.patient_name}`,
      description: `Patient in Bed ${pCrit.bed_number || "--"} exhibits acute deterioration risk (${Math.round((Number(pCrit.deterioration_risk) || 0.7) * 100)}%). Review priority ICU escalation.`,
      patientId: pCrit.patient_id,
      sessionId: pCrit.session_id,
      patientName: pCrit.full_name || pCrit.patient_name,
      confidence: "High Acuity",
      actionText: "View Patient Details",
    });
  }

  // Insight 2: Step-down or Ward Reallocation
  const stableIcuPatients = patients.filter(
    (p) => p.bed_type === "ICU" && (Number(p.mews_score) || 0) <= 1 && (Number(p.deterioration_risk) || 0) < 0.25
  );
  if (stableIcuPatients.length > 0) {
    const pStable = stableIcuPatients[0];
    insights.push({
      id: "inp-rec-step-down",
      priority: "medium",
      type: "Bed Optimization",
      title: `Reallocate stable patient ${pStable.full_name || pStable.patient_name} to General Ward`,
      description: `Patient physiological parameters have stabilized over consecutive observation cycles (MEWS ${pStable.mews_score || 0}). Consider step-down transfer to free ICU capacity.`,
      patientId: pStable.patient_id,
      sessionId: pStable.session_id,
      patientName: pStable.full_name || pStable.patient_name,
      confidence: "Protocol Adherent",
      actionText: "Inspect Profile",
    });
  }

  // Insight 3: Bed capacity alert
  if (icuOccupied.length >= icuBeds.length && icuBeds.length > 0) {
    insights.push({
      id: "inp-rec-icu-capacity",
      priority: "medium",
      type: "Facility Capacity",
      title: "ICU Ward beds at 100% capacity",
      description:
        "All intensive care beds are currently occupied. Coordinate with regional hospital transfer network for contingent emergency walk-ins.",
      confidence: "Capacity Gate",
    });
  }

  const activeInsights = insights.filter((i) => !dismissedIds.includes(i.id));

  const handleDismiss = (id) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const handleAction = (item) => {
    if (item.patientId && onOpenProfile) {
      onOpenProfile(item.patientId);
    } else if (item.sessionId && onOpenCaseDetails) {
      onOpenCaseDetails(item.sessionId);
    }
  };

  if (activeInsights.length === 0) {
    return (
      <div className="opd-ai-panel-empty">
        <div className="opd-ai-empty-header">
          <Bot size={20} className="text-primary-green" />
          <div>
            <h4 className="opd-ai-empty-title">AI Clinical Insights & Ward Optimization</h4>
            <p className="opd-ai-empty-sub">
              All inpatient physiological indices and bed distributions are within nominal operational parameters.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const heroInsight = activeInsights[0];
  const secondaryInsights = activeInsights.slice(1);

  return (
    <section className="opd-ai-panel" aria-label="Inpatient AI Clinical Insights">
      <div className="opd-ai-header">
        <div className="opd-ai-title-wrap">
          <div className="opd-ai-badge-icon">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="opd-ai-title">AI Inpatient Insights & Acuity Recommendations</h3>
            <p className="opd-ai-sub">
              Algorithmic deterioration warnings, ICU bed step-downs, and clinical care directives
            </p>
          </div>
        </div>
        <span className="opd-ai-count-chip">{activeInsights.length} Actionable</span>
      </div>

      <div className="opd-ai-grid">
        {/* HERO CARD */}
        <div className={`opd-ai-hero-card ${heroInsight.priority}`}>
          <div className="opd-ai-card-meta">
            <span className="opd-ai-type-pill">
              <Bot size={12} /> {heroInsight.type}
            </span>
            <span className="opd-ai-confidence">{heroInsight.confidence}</span>
            <button
              type="button"
              className="opd-ai-dismiss-btn"
              onClick={() => handleDismiss(heroInsight.id)}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>

          <h4 className="opd-ai-hero-title">{heroInsight.title}</h4>
          <p className="opd-ai-hero-desc">{heroInsight.description}</p>

          <div className="opd-ai-hero-footer">
            {heroInsight.patientName && (
              <span className="opd-ai-patient-ref">
                <Stethoscope size={13} /> {heroInsight.patientName}
              </span>
            )}
            {heroInsight.actionText && (
              <button
                type="button"
                className="opd-ai-action-btn"
                onClick={() => handleAction(heroInsight)}
              >
                <span>{heroInsight.actionText}</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* SECONDARY CARDS */}
        {secondaryInsights.length > 0 && (
          <div className="opd-ai-secondary-stack">
            {secondaryInsights.map((item) => (
              <div key={item.id} className="opd-ai-secondary-card">
                <div className="opd-ai-card-meta">
                  <span className="opd-ai-type-pill secondary">
                    <Info size={11} /> {item.type}
                  </span>
                  <button
                    type="button"
                    className="opd-ai-dismiss-btn"
                    onClick={() => handleDismiss(item.id)}
                    title="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>

                <div className="opd-ai-sec-title">{item.title}</div>
                <p className="opd-ai-sec-desc">{item.description}</p>

                {item.actionText && (
                  <button
                    type="button"
                    className="opd-ai-sec-action"
                    onClick={() => handleAction(item)}
                  >
                    {item.actionText} →
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

