import React from "react";

export default function PriorityChip({ priority = "standard", isRedFlag = false, isAck = false }) {
  if (isRedFlag) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 10px",
          borderRadius: "999px",
          fontSize: "11px",
          fontWeight: 700,
          background: "var(--vt-crimson-soft)",
          color: "var(--vt-crimson)",
          border: "1px solid #fca5a5",
          whiteSpace: "nowrap",
        }}
      >
        🚨 RED FLAG {isAck ? "(Ack'd)" : "(URGENT)"}
      </span>
    );
  }

  const norm = (priority || "").toLowerCase();
  let bg = "#f0f5ed";
  let color = "#3d5444";
  let icon = "•";

  if (norm.includes("high") || norm.includes("urgent") || norm.includes("emergent") || norm === "1" || norm === "2") {
    bg = "var(--vt-crimson-soft)";
    color = "var(--vt-crimson)";
    icon = "⚡";
  } else if (norm.includes("medium") || norm.includes("moderate") || norm === "3") {
    bg = "var(--vt-amber-soft)";
    color = "var(--vt-amber)";
    icon = "⚠️";
  } else {
    bg = "#e8f7ea";
    color = "var(--vt-mid-green)";
    icon = "✓";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 9px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        background: bg,
        color: color,
        whiteSpace: "nowrap",
      }}
    >
      <span>{icon}</span> {priority}
    </span>
  );
}
