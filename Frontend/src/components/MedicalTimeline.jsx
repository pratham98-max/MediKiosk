import React from "react";

export default function MedicalTimeline({
  timeline = [],
  currentHospital = "MediKiosk General Hospital",
}) {
  if (!timeline || timeline.length === 0) {
    return null;
  }

  return (
    <div className="medical-timeline-card">
      <div className="timeline-header">
        <div className="timeline-title-row">
          <span className="timeline-badge-icon">⏳</span>
          <div>
            <h4>Cross-Hospital Longitudinal Medical Timeline</h4>
            <p className="timeline-subtext">
              Synthesized chronological health trajectory derived from consented hospital EMR records.
            </p>
          </div>
        </div>
      </div>

      <div className="timeline-stream">
        {timeline.map((item, idx) => {
          const isApollo = item.hospital_id?.includes("apollo") || item.source_hospital?.includes("Apollo");
          const isCity = item.hospital_id?.includes("city") || item.source_hospital?.includes("City");

          return (
            <div key={idx} className="timeline-event-item">
              <div className="timeline-marker-col">
                <div className={`timeline-dot ${isApollo ? "dot-apollo" : isCity ? "dot-city" : "dot-current"}`}></div>
                {idx < timeline.length - 1 && <div className="timeline-line"></div>}
              </div>

              <div className="timeline-content-card">
                <div className="timeline-event-header">
                  <span className="timeline-year-tag">{item.year || item.date || "Past Visit"}</span>
                  <span className={`timeline-hosp-pill ${isApollo ? "pill-apollo" : isCity ? "pill-city" : "pill-medikiosk"}`}>
                    🏥 {item.source_hospital}
                  </span>
                </div>

                <div className="timeline-event-summary">
                  {item.summary || item.diagnosis}
                </div>

                {item.medications && (
                  <div className="timeline-meds-sub">
                    <strong>Rx Prescribed:</strong> {item.medications}
                  </div>
                )}

                {item.lab_results && (
                  <div className="timeline-labs-sub">
                    <strong>Diagnostics / Labs:</strong> {item.lab_results}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Current Presentation Milestone */}
        <div className="timeline-event-item current-presentation-milestone">
          <div className="timeline-marker-col">
            <div className="timeline-dot dot-today pulse"></div>
          </div>
          <div className="timeline-content-card current-card">
            <div className="timeline-event-header">
              <span className="timeline-year-tag today-tag">Today</span>
              <span className="timeline-hosp-pill pill-medikiosk">
                📍 Current Consultation • {currentHospital}
              </span>
            </div>
            <div className="timeline-event-summary">
              Active patient intake & AI symptom pre-triage session
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
