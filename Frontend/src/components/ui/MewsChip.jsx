import React from "react";

export default function MewsChip({ score = 0 }) {
  const s = Number(score) || 0;

  let bg = "#e8f7ea";
  let color = "#16a34a";
  let border = "#bce6be";
  let text = "Stable";

  if (s >= 5) {
    bg = "var(--vt-crimson-soft)";
    color = "var(--vt-crimson)";
    border = "#fca5a5";
    text = "Critical";
  } else if (s >= 3) {
    bg = "var(--vt-amber-soft)";
    color = "var(--vt-amber)";
    border = "#fcd34d";
    text = "Watch";
  } else if (s >= 1) {
    bg = "#f3fadc";
    color = "#4d7c0f";
    border = "#d9f99d";
    text = "Low Risk";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
      title={`MEWS Deterioration Score: ${s} points (${text})`}
    >
      <span>MEWS {s}</span>
      <span style={{ opacity: 0.8, fontSize: "10px", fontWeight: 500 }}>• {text}</span>
    </span>
  );
}
