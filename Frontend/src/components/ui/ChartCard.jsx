import React from "react";
import RangeToggle from "./RangeToggle";

export default function ChartCard({
  title,
  subtitle,
  range,
  onRangeChange,
  ranges = ["6 Month", "1 Month", "7 Day", "1 Day"],
  loading = false,
  empty = false,
  emptyMessage = "No data available for the selected period",
  children,
  headerAction,
}) {
  return (
    <div className="vt-chart-card">
      <div className="vt-chart-head">
        <div>
          <h3 className="vt-chart-title">{title}</h3>
          {subtitle && (
            <span style={{ fontSize: "11.5px", color: "var(--vt-text-muted)" }}>
              {subtitle}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {headerAction}
          {onRangeChange && (
            <RangeToggle
              ranges={ranges}
              value={range}
              onChange={onRangeChange}
            />
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ height: "220px", display: "grid", placeItems: "center" }}>
          <div className="loading-spinner" />
        </div>
      ) : empty ? (
        <div style={{ height: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--vt-text-muted)", fontSize: "13px" }}>
          <span style={{ fontSize: "24px", marginBottom: "6px" }}>📊</span>
          <p style={{ margin: 0 }}>{emptyMessage}</p>
        </div>
      ) : (
        <div style={{ width: "100%", minHeight: "220px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
