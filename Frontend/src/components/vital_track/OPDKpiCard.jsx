import {
  Users,
  ClipboardList,
  MessageSquareWarning,
  Stethoscope,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

export default function OPDKpiCard({
  label,
  number,
  unit,
  badgeText,
  badgeType = "normal", // 'normal' | 'danger' | 'warn' | 'success'
  sparkType = "gauge",
  color = "#285C2B",
  iconName,
  isActive = false,
  onClick,
}) {
  const getIcon = () => {
    const size = 18;
    switch (iconName) {
      case "users":
        return <Users size={size} />;
      case "clipboard":
        return <ClipboardList size={size} />;
      case "clarification":
        return <MessageSquareWarning size={size} />;
      case "stethoscope":
        return <Stethoscope size={size} />;
      case "activity":
        return <Activity size={size} />;
      case "check":
        return <CheckCircle2 size={size} />;
      case "alert":
        return <AlertTriangle size={size} />;
      default:
        return <Activity size={size} />;
    }
  };

  const renderSpark = () => {
    if (sparkType === "gauge") {
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
          <rect x="4" y="14" width="4" height="10" rx="2" fill="#d8e8d0" />
          <rect x="12" y="8" width="4" height="16" rx="2" fill="#bddc99" />
          <rect x="20" y="4" width="4" height="20" rx="2" fill={color} />
          <rect x="28" y="11" width="4" height="13" rx="2" fill="#bddc99" />
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
        <circle cx="46" cy="12" r="3.5" fill={color} opacity="0.25" />
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
      className={`opd-kpi-card ${isActive ? "active" : ""} ${onClick ? "clickable" : ""}`}
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
        <div className="opd-kpi-icon-wrap" style={{ color }}>
          {getIcon()}
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
          <span className="opd-kpi-num">{number}</span>
          {unit && <span className="opd-kpi-unit">{unit}</span>}
        </div>
        <div className="opd-kpi-spark-wrap">{renderSpark()}</div>
      </div>

      {onClick && (
        <div className="opd-kpi-filter-hint">
          <span>Filter queue</span>
          <ArrowUpRight size={12} />
        </div>
      )}
    </div>
  );
}
