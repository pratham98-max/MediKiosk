import React from "react";

export default function StatusChip({ status }) {
  const norm = (status || "").toLowerCase().replace(/\s+/g, "_");

  let label = status;
  let bg = "#f0f5ed";
  let color = "#3d5444";

  if (norm.includes("ready")) {
    label = "Ready for Doctor";
    bg = "#e8f7ea";
    color = "#16a34a";
  } else if (norm.includes("process") || norm.includes("progress")) {
    label = "In Process";
    bg = "#f1f5f9";
    color = "#475569";
  } else if (norm.includes("consult")) {
    label = "In Consultation";
    bg = "#e0f2fe";
    color = "#0369a1";
  } else if (norm.includes("complete") || norm.includes("done")) {
    label = "Completed";
    bg = "#edf5eb";
    color = "#0b3d1e";
  } else if (norm.includes("vacant")) {
    label = "Vacant";
    bg = "#f3f4f6";
    color = "#6b7280";
  } else if (norm.includes("admit") || norm.includes("occup")) {
    label = "Admitted";
    bg = "#ecfdf5";
    color = "#047857";
  } else if (norm.includes("critical") || norm.includes("icu")) {
    label = status;
    bg = "#fee2e2";
    color = "#b91c1c";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "11.5px",
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
