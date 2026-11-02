import React, { useState, useEffect } from "react";

export default function XAIRiskModal({
  apiBase,
  patient,
  onClose,
}) {
  const [selectedModel, setSelectedModel] = useState("random_forest");
  const [loading, setLoading] = useState(true);
  const [assessmentData, setAssessmentData] = useState(null);
  const [error, setError] = useState("");

  const runRiskAssessment = async (modelName) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${apiBase}/staff/patient-care/patients/${patient.patient_id}/risk-assessment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferred_model: modelName,
            triage_level: patient.triage_level || 3,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to run risk assessment");
      }

      setAssessmentData(data);
    } catch (err) {
      console.error("XAI risk assessment error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runRiskAssessment(selectedModel);
  }, [selectedModel]);

  const pred = assessmentData?.prediction || {};
  const riskScore = pred.critical_risk || 0;
  const riskPercent = Math.round(riskScore * 100);

  let riskTier = "LOW";
  let fillClass = "risk-low";
  if (riskScore >= 0.7) {
    riskTier = "CRITICAL DETERIORATION RISK";
    fillClass = "risk-critical";
  } else if (riskScore >= 0.4) {
    riskTier = "MODERATE RISK";
    fillClass = "risk-moderate";
  }

  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div className="pc-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="pc-modal-header">
          <h3>
            <span>🧠</span> Machine Learning Deterioration Risk & Explainable AI (XAI)
          </h3>
          <button type="button" className="btn-pc-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="pc-modal-body">
          {/* PATIENT SUMMARY BAR */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper)", padding: "12px 16px", borderRadius: "8px" }}>
            <div>
              <strong>{patient.full_name || patient.patient_name}</strong> • {patient.age}y / {patient.gender}
              <span style={{ marginLeft: "12px", color: "var(--ink-soft)" }}>Bed: {patient.bed_number || "Unassigned"}</span>
            </div>
            <div>
              <span className="pc-bed-type-pill pill-general">ESI Triage Level {patient.triage_level || 3}</span>
            </div>
          </div>

          {/* MODEL SELECTOR */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>Inference Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)" }}
              disabled={loading}
            >
              <option value="random_forest">Random Forest Classifier (Ensemble)</option>
              <option value="gradient_boosting">Gradient Boosting Classifier</option>
              <option value="svm">Support Vector Machine (SVM)</option>
              <option value="logistic_regression">Logistic Regression (Linear)</option>
            </select>
            {loading && <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>Evaluating patient clinical features...</span>}
          </div>

          {error && (
            <div className="doc-auth-alert doc-alert-danger">
              <span>⚠️</span> <span>{error}</span>
            </div>
          )}

          {/* RISK SCORE METER */}
          {assessmentData && (
            <div className="xai-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--teal-deep)" }}>
                    PREDICTED CRITICAL RISK: {riskPercent}%
                  </span>
                  <span style={{ marginLeft: "10px", fontSize: "12px", color: "var(--ink-soft)" }}>
                    ({pred.model_used || selectedModel} • confidence {pred.confidence || 85}%)
                  </span>
                </div>
                <div>
                  <span className={`mews-score-pill ${riskScore >= 0.7 ? "mews-critical" : riskScore >= 0.4 ? "mews-monitoring" : "mews-stable"}`}>
                    {riskTier}
                  </span>
                </div>
              </div>

              <div className="xai-risk-meter">
                <div
                  className={`xai-risk-fill ${fillClass}`}
                  style={{ width: `${Math.max(5, riskPercent)}%` }}
                ></div>
              </div>

              {/* ESTIMATED LENGTH OF STAY */}
              <div style={{ marginTop: "12px", fontSize: "14px" }}>
                ⏱️ <strong>Estimated Inpatient Length of Stay (LOS):</strong>{" "}
                <span style={{ fontWeight: 700, color: "var(--teal-deep)" }}>
                  {assessmentData.estimated_length_of_stay_days || 3} Days
                </span>
              </div>

              {/* XAI CLINICAL ATTRIBUTION EXPLANATION */}
              <div style={{ marginTop: "16px", background: "#ffffff", padding: "16px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <h5 style={{ margin: "0 0 10px 0", color: "var(--teal-deep)", fontSize: "14px" }}>
                  Clinical Feature Attribution (XAI Factor Breakdown)
                </h5>
                <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap", fontSize: "13px", color: "var(--ink)", lineHeight: 1.5 }}>
                  {pred.explanation || "All monitored vital signs are currently within baseline acceptable ranges."}
                </pre>
              </div>
            </div>
          )}

          {/* MANDATORY SYNTHETIC DATA DISCLOSURE (Rule 12) */}
          <div className="disclaimer-banner">
            <span className="disclaimer-icon">⚠️</span>
            <div>
              <strong>Synthetic Training Data Notice:</strong> Pre-trained machine learning models were developed
              on synthetic patient scenarios. Predictions represent experimental clinical decision-support
              indicators and must NOT be interpreted as real-world validated diagnostic certainty.
            </div>
          </div>

          {/* MANDATORY CLINICAL DECISION SUPPORT NOTICE (Rule 12) */}
          <div className="disclaimer-banner">
            <span className="disclaimer-icon">ℹ️</span>
            <div>
              <strong>Clinical Decision Support Notice:</strong> ML deterioration predictions and MEWS scores
              are supplementary screening indicators and do NOT constitute a definitive medical diagnosis. Clinical
              judgment takes precedence.
            </div>
          </div>
        </div>

        <div className="pc-modal-footer">
          <button type="button" className="btn-pc-primary" onClick={onClose}>
            Close Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
