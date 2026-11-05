import React from "react";

export default function AlertItem({
  type = "rf", // 'rf' | 'mews'
  title,
  subtext,
  time,
  isAck = false,
  onView,
  onAck,
  onDismiss,
  ackLoading = false,
}) {
  const isRf = type === "rf";

  return (
    <div className={`vt-alert-item ${isRf ? "rf" : "mews"}`}>
      <div className="vt-alert-item-head">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span>{isRf ? "🚨" : "⚡"}</span>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: "999px",
              background: isRf ? "var(--vt-crimson-soft)" : "var(--vt-amber-soft)",
              color: isRf ? "var(--vt-crimson)" : "var(--vt-amber)",
            }}
          >
            {isRf ? "AI Intake Red Flag" : "MEWS Deterioration"}
          </span>
        </div>
        {time && <span style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>{time}</span>}
      </div>

      <h4 className="vt-alert-title">{title}</h4>
      {subtext && <p className="vt-alert-subtext">{subtext}</p>}

      <div className="vt-alert-actions">
        {onView && (
          <button type="button" className="vt-btn-alert-view" onClick={onView}>
            View Case
          </button>
        )}
        {isRf && onAck && !isAck && (
          <button
            type="button"
            className="vt-btn-alert-ack"
            disabled={ackLoading}
            onClick={onAck}
          >
            {ackLoading ? "..." : "✓ Acknowledge Alert"}
          </button>
        )}
        {!isRf && onAck && (
          <button
            type="button"
            className="vt-btn-alert-view"
            style={{ background: "var(--vt-amber-soft)", color: "var(--vt-amber)" }}
            onClick={onAck}
          >
            🩺 Re-assess Vitals
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--vt-text-muted)",
              fontSize: "11px",
              cursor: "pointer",
            }}
            onClick={onDismiss}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
