import React from "react";

export default function EmptyState({ icon = "📋", title = "No Records Found", message = "There are no entries matching the current criteria.", action }) {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        color: "var(--vt-text-muted)",
      }}
    >
      <span style={{ fontSize: "36px" }}>{icon}</span>
      <h4 style={{ margin: "4px 0", color: "var(--vt-dark-green)", fontSize: "16px", fontWeight: 700 }}>
        {title}
      </h4>
      <p style={{ margin: 0, fontSize: "13px", maxWidth: "400px", lineHeight: 1.45 }}>
        {message}
      </p>
      {action && <div style={{ marginTop: "12px" }}>{action}</div>}
    </div>
  );
}
