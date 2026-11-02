import React, { useState } from "react";
import MedicalTimeline from "./MedicalTimeline";

export default function ExternalEMRConsent({
  apiBase,
  sessionId,
  patientName,
  currentHospitalName,
  onConsentDecision,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consentedData, setConsentedData] = useState(null);

  const handleDecision = async (consentGiven) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/session/${sessionId}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consented: consentGiven }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to save consent decision");
      }

      if (consentGiven && data.external_data) {
        // Show retrieved external records preview before proceeding
        setConsentedData(data.external_data);
      } else {
        // Patient opted out -> continue directly
        onConsentDecision({
          consented: false,
          external_data: null,
        });
      }
    } catch (err) {
      console.error("Consent submission error:", err);
      setError("Unable to process consent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAfterPreview = () => {
    onConsentDecision({
      consented: true,
      external_data: consentedData,
    });
  };

  return (
    <div className="external-consent-container">
      {!consentedData ? (
        <div className="consent-dialog-card">
          <div className="consent-header">
            <div className="consent-icon-badge">🔒</div>
            <h2>External Medical Records & History Consent</h2>
            <p className="consent-subtitle">
              MediKiosk can securely query connected partner health networks to provide your doctor with complete historical clinical context.
            </p>
          </div>

          {error && <div className="consent-alert-error">{error}</div>}

          <div className="consent-prompt-box">
            <div className="consent-prompt-question">
              "Can we use relevant information from other hospitals?"
            </div>
            <p className="consent-prompt-explanation">
              With your permission, we will cross-reference historical diagnoses, medications, and laboratory observations from:
            </p>
            <div className="partner-hospitals-list">
              <div className="partner-badge">
                <span className="partner-icon">🏥</span>
                <div>
                  <strong>Apollo Clinic</strong>
                  <span className="partner-sub">Fictional External EMR Network</span>
                </div>
              </div>
              <div className="partner-badge">
                <span className="partner-icon">🧪</span>
                <div>
                  <strong>City Diagnostics & Specialty</strong>
                  <span className="partner-sub">Fictional External Laboratory System</span>
                </div>
              </div>
            </div>
            <div className="consent-security-note">
              <span>🛡️</span>
              <span>
                Your privacy is paramount. External records will only be retrieved if you explicitly grant permission. You may decline with no impact on your current consultation.
              </span>
            </div>
          </div>

          <div className="consent-buttons-row">
            <button
              type="button"
              className="btn-consent-allow"
              disabled={loading}
              onClick={() => handleDecision(true)}
            >
              {loading ? "Accessing Records..." : "✓ Allow & Retrieve External History"}
            </button>

            <button
              type="button"
              className="btn-consent-decline"
              disabled={loading}
              onClick={() => handleDecision(false)}
            >
              Continue Without Sharing →
            </button>
          </div>
        </div>
      ) : (
        /* Preview of Consented External Records before moving to Final Report */
        <div className="consent-preview-card">
          <div className="preview-header">
            <div className="preview-badge-row">
              <span className="preview-ok-icon">✓</span>
              <div>
                <h2>External Hospital Records Retrieved</h2>
                <p>
                  Found <strong>{consentedData.total_records || 0} relevant past record(s)</strong> across partner healthcare facilities for <strong>{patientName || "you"}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Grouped by Hospital */}
          <div className="hospital-records-groups">
            {consentedData.apollo_records && consentedData.apollo_records.length > 0 && (
              <div className="hosp-group-box apollo-group">
                <div className="group-title">
                  <span className="hosp-tag-badge">🏥 Apollo Clinic</span>
                  <span className="record-count-sub">{consentedData.apollo_records.length} past record(s)</span>
                </div>
                {consentedData.apollo_records.map((r, i) => (
                  <div key={i} className="record-snippet-card">
                    <div className="snippet-date">{r.visit_date}</div>
                    <div className="snippet-diag"><strong>Diagnosis:</strong> {r.diagnosis}</div>
                    {r.medications && <div className="snippet-meds"><strong>Medications:</strong> {r.medications}</div>}
                    {r.lab_results && <div className="snippet-labs"><strong>Lab Findings:</strong> {r.lab_results}</div>}
                  </div>
                ))}
              </div>
            )}

            {consentedData.city_records && consentedData.city_records.length > 0 && (
              <div className="hosp-group-box city-group">
                <div className="group-title">
                  <span className="hosp-tag-badge">🧪 City Diagnostics</span>
                  <span className="record-count-sub">{consentedData.city_records.length} past record(s)</span>
                </div>
                {consentedData.city_records.map((r, i) => (
                  <div key={i} className="record-snippet-card">
                    <div className="snippet-date">{r.visit_date}</div>
                    <div className="snippet-diag"><strong>Finding:</strong> {r.diagnosis}</div>
                    {r.medications && <div className="snippet-meds"><strong>Medications:</strong> {r.medications}</div>}
                    {r.lab_results && <div className="snippet-labs"><strong>Lab Findings:</strong> {r.lab_results}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Render Medical Timeline */}
          {consentedData.timeline && consentedData.timeline.length > 0 && (
            <div className="preview-timeline-section">
              <MedicalTimeline
                timeline={consentedData.timeline}
                currentHospital={currentHospitalName}
              />
            </div>
          )}

          <div className="preview-actions">
            <button
              type="button"
              className="continue-button"
              onClick={handleContinueAfterPreview}
            >
              Attach to Clinical Report & View Summary →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
