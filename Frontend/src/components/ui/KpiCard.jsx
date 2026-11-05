import React from "react";

export default function KpiCard({
  label,
  number,
  unit,
  badgeText,
  badgeType = "normal", // 'normal' | 'danger' | 'warn' | 'success'
  sparkType = "gauge", // 'gauge' | 'bars' | 'wave' | 'dots'
  color = "#0b3d1e",
}) {
  const renderSpark = () => {
    if (sparkType === "gauge") {
      return (
        <svg viewBox="0 0 54 28" className="vt-kpi-mini-gauge" aria-hidden="true">
          <path
            d="M 5 24 A 22 22 0 0 1 49 24"
            fill="none"
            stroke="#e2ebe0"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 5 24 A 22 22 0 0 1 42 12"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    if (sparkType === "bars") {
      return (
        <svg viewBox="0 0 46 24" className="vt-kpi-mini-gauge" aria-hidden="true">
          <rect x="4" y="14" width="4" height="10" rx="2" fill="#d6e6d2" />
          <rect x="12" y="8" width="4" height="16" rx="2" fill="#b0d4a7" />
          <rect x="20" y="4" width="4" height="20" rx="2" fill={color} />
          <rect x="28" y="11" width="4" height="13" rx="2" fill="#b0d4a7" />
          <rect x="36" y="6" width="4" height="18" rx="2" fill={color} />
        </svg>
      );
    }
    if (sparkType === "wave") {
      return (
        <svg viewBox="0 0 54 24" className="vt-kpi-mini-gauge" aria-hidden="true">
          <path
            d="M 2 16 Q 14 4 27 14 T 52 8"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    // dots
    return (
      <svg viewBox="0 0 54 24" className="vt-kpi-mini-gauge" aria-hidden="true">
        <circle cx="10" cy="12" r="3.5" fill={color} />
        <circle cx="22" cy="12" r="3.5" fill={color} opacity="0.75" />
        <circle cx="34" cy="12" r="3.5" fill={color} opacity="0.5" />
        <circle cx="46" cy="12" r="3.5" fill={color} opacity="0.3" />
      </svg>
    );
  };

  const badgeBg =
    badgeType === "danger"
      ? "var(--vt-crimson-soft)"
      : badgeType === "warn"
      ? "var(--vt-amber-soft)"
      : badgeType === "success"
      ? "#e8f7ea"
      : "#edf4e8";

  const badgeColor =
    badgeType === "danger"
      ? "var(--vt-crimson)"
      : badgeType === "warn"
      ? "var(--vt-amber)"
      : badgeType === "success"
      ? "var(--vt-mid-green)"
      : "var(--vt-dark-green)";

  return (
    <div className="vt-kpi-card">
      <div className="vt-kpi-header">
        <span className="vt-kpi-label">{label}</span>
        {badgeText && (
          <span
            className="vt-kpi-badge"
            style={{ background: badgeBg, color: badgeColor }}
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="vt-kpi-number-row">
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span className="vt-kpi-number">{number}</span>
          {unit && <span style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>{unit}</span>}
        </div>
        {renderSpark()}
      </div>
    </div>
  );
}
