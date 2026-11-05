import React from "react";
import MewsChip from "./MewsChip";

export default function BedTile({ bed, onAllocate, onSelectPatient }) {
  const isVacant = bed.status === "vacant" || !bed.patient_id;
  const isIcu = bed.bed_type === "ICU";
  const mews = bed.mews_score || 0;

  return (
    <div className={`vt-bed-tile ${isIcu ? "icu" : "general"} ${isVacant ? "vacant" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "16px" }}>{isIcu ? "🚨" : "🛏️"}</span>
          <strong style={{ fontSize: "14px", color: "var(--vt-dark-green)" }}>
            Bed {bed.bed_number}
          </strong>
        </div>
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: "999px",
            background: isIcu ? "var(--vt-crimson-soft)" : "#e8f7ea",
            color: isIcu ? "var(--vt-crimson)" : "var(--vt-mid-green)",
          }}
        >
          {bed.bed_type} · {bed.ward}
        </span>
      </div>

      {isVacant ? (
        <div style={{ padding: "14px 0", textAlign: "center", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>Ready for admission</span>
          {onAllocate && (
            <button
              type="button"
              className="vt-btn-cta-admit"
              style={{ fontSize: "12px", padding: "6px 14px" }}
              onClick={() => onAllocate(bed)}
            >
              + Allocate Bed
            </button>
          )}
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "8px", cursor: onSelectPatient ? "pointer" : "default" }}
          onClick={() => onSelectPatient && onSelectPatient(bed)}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--vt-text-main)" }}>
              👤 {bed.patient_name || bed.patient_id}
            </div>
            <div style={{ fontSize: "11px", color: "var(--vt-text-muted)", fontFamily: "monospace" }}>
              ID: {bed.patient_id}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #edf4ea", paddingTop: "8px" }}>
            <div style={{ fontSize: "11.5px", color: "var(--vt-text-muted)" }}>
              HR: <strong>{bed.heart_rate || "--"} bpm</strong>
            </div>
            <MewsChip score={mews} />
          </div>
        </div>
      )}
    </div>
  );
}
