import React from "react";

export default function RangeToggle({
  ranges = ["6 Month", "1 Month", "7 Day", "1 Day"],
  value = "1 Day",
  onChange,
}) {
  return (
    <div className="vt-range-toggle" role="group" aria-label="Time range selector">
      {ranges.map((r) => (
        <button
          key={r}
          type="button"
          className={`vt-range-btn ${value === r ? "active" : ""}`}
          onClick={() => onChange && onChange(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
