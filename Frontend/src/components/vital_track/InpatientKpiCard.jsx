export default function InpatientKpiCard({
  label,
  value,
  unit,
  icon,
  accentColor = "#285C2B",
  sparkType = "radial", // 'trend' | 'ring' | 'radial' | 'wave' | 'bars'
  percent = 0,
  badgeText,
  badgeType = "normal", // 'normal' | 'danger' | 'warn' | 'success'
  onClick,
}) {
  const renderVisual = () => {
    if (sparkType === "ring") {
      const radius = 15;
      const circ = 2 * Math.PI * radius;
      const offset = circ - (circ * Math.min(100, Math.max(0, percent))) / 100;
      return (
        <div className="inpatient-kpi-ring-wrap">
          <svg viewBox="0 0 38 38" className="inpatient-kpi-ring-svg">
            <circle
              cx="19"
              cy="19"
              r={radius}
              fill="none"
              stroke="#e4ecda"
              strokeWidth="4"
            />
            <circle
              cx="19"
              cy="19"
              r={radius}
              fill="none"
              stroke={accentColor}
              strokeWidth="4"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 19 19)"
            />
          </svg>
          <span className="inpatient-kpi-ring-text">{percent}%</span>
        </div>
      );
    }

    if (sparkType === "trend") {
      return (
        <svg viewBox="0 0 54 26" className="vt-kpi-mini-gauge" aria-hidden="true">
          <path
            d="M 2 20 L 14 14 L 26 18 L 38 8 L 52 4"
            fill="none"
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="52" cy="4" r="3" fill={accentColor} />
        </svg>
      );
    }

    if (sparkType === "radial") {
      return (
        <svg viewBox="0 0 54 28" className="vt-kpi-mini-gauge" aria-hidden="true">
          <path
            d="M 5 24 A 22 22 0 0 1 49 24"
            fill="none"
            stroke="#e4ecda"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 5 24 A 22 22 0 0 1 42 12"
            fill="none"
            stroke={accentColor}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    if (sparkType === "bars") {
      return (
        <svg viewBox="0 0 46 24" className="vt-kpi-mini-gauge" aria-hidden="true">
          <rect x="4" y="14" width="4" height="10" rx="2" fill="#d8e8d0" />
          <rect x="12" y="8" width="4" height="16" rx="2" fill="#bddc99" />
          <rect x="20" y="4" width="4" height="20" rx="2" fill={accentColor} />
          <rect x="28" y="11" width="4" height="13" rx="2" fill="#bddc99" />
          <rect x="36" y="6" width="4" height="18" rx="2" fill={accentColor} />
        </svg>
      );
    }

    // wave / severity indicator
    return (
      <svg viewBox="0 0 54 24" className="vt-kpi-mini-gauge" aria-hidden="true">
        <path
          d="M 2 16 Q 14 4 27 14 T 52 8"
          fill="none"
          stroke={accentColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const badgeStyles = {
    danger: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
    warn: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    success: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
    normal: { bg: "#f4f7f1", color: "#285c2b", border: "#e4ecda" },
  }[badgeType] || { bg: "#f4f7f1", color: "#285c2b", border: "#e4ecda" };

  return (
    <div
      className={`opd-kpi-card ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : "group"}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="opd-kpi-header">
        <div className="opd-kpi-icon-wrap" style={{ color: accentColor }}>
          {icon}
        </div>
        <span className="opd-kpi-label">{label}</span>
        {badgeText && (
          <span
            className="opd-kpi-badge"
            style={{
              background: badgeStyles.bg,
              color: badgeStyles.color,
              borderColor: badgeStyles.border,
            }}
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="opd-kpi-body">
        <div className="opd-kpi-metric-wrap">
          <span className="opd-kpi-num">{value}</span>
          {unit && <span className="opd-kpi-unit">{unit}</span>}
        </div>
        <div className="opd-kpi-spark-wrap">{renderVisual()}</div>
      </div>
    </div>
  );
}

