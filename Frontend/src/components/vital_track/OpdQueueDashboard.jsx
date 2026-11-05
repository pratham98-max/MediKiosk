import React, { useState } from "react";
import KpiCard from "../ui/KpiCard";
import StatusChip from "../ui/StatusChip";
import PriorityChip from "../ui/PriorityChip";
import EmptyState from "../ui/EmptyState";

export default function OpdQueueDashboard({
  counts = {},
  patients = [],
  redFlags = [],
  loading = false,
  activeFilter = "all",
  onSelectFilter,
  onOpenCaseDetails,
  onOpenPatientProfile,
  onAcknowledgeRedFlag,
  onNavigateInpatient,
  acknowledgingId,
  currentStaff,
}) {
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'kanban'
  const [searchTerm, setSearchTerm] = useState("");

  const unacknowledgedRf = redFlags.filter((rf) => !rf.red_flag_acknowledged);

  const filteredPatients = patients.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = (p.patient_name || "").toLowerCase();
    const id = (p.patient_id || "").toLowerCase();
    const dept = (p.department || "").toLowerCase();
    return name.includes(term) || id.includes(term) || dept.includes(term);
  });

  // Kanban column buckets
  const kanbanColumns = [
    { id: "in_progress", label: "In Process (Intake)", statusKey: "in_progress", icon: "💬" },
    { id: "ready_for_opd", label: "Ready for Doctor", statusKey: "ready_for_opd", icon: "🟢" },
    { id: "in_consultation", label: "In Consultation", statusKey: "in_consultation", icon: "🩺" },
    { id: "completed", label: "Completed", statusKey: "completed", icon: "✓" },
  ];

  return (
    <div className="vt-page-body">
      {/* 1. HEADER KPI STRIP */}
      <section className="vt-kpi-grid">
        <KpiCard
          label="Total Queue"
          number={counts.total || patients.length}
          unit="patients"
          sparkType="dots"
          color="#0b3d1e"
        />
        <KpiCard
          label="In Process (Intake)"
          number={counts.in_process || 0}
          unit="active"
          sparkType="wave"
          color="#64748b"
        />
        <KpiCard
          label="Ready for Doctor"
          number={counts.ready_for_doctor || 0}
          unit="screened"
          sparkType="gauge"
          color="#1e9e4a"
          badgeText="Next Up"
          badgeType="success"
        />
        <KpiCard
          label="In Consultation"
          number={counts.in_consultation || 0}
          unit="with MD"
          sparkType="bars"
          color="#0284c7"
        />
        <KpiCard
          label="Active Red Flags"
          number={counts.red_flag || unacknowledgedRf.length}
          unit="urgent"
          sparkType="wave"
          color="#dc2626"
          badgeText={unacknowledgedRf.length > 0 ? "Action Req" : "Clear"}
          badgeType={unacknowledgedRf.length > 0 ? "danger" : "success"}
        />
      </section>

      {/* 2. TABLE / KANBAN CONTROLS & FILTER BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "#ffffff",
          padding: "16px 20px",
          borderRadius: "18px",
          border: "1px solid var(--vt-card-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* View Mode Toggle */}
          <div className="vt-range-toggle">
            <button
              type="button"
              className={`vt-range-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              📋 Table View
            </button>
            <button
              type="button"
              className={`vt-range-btn ${viewMode === "kanban" ? "active" : ""}`}
              onClick={() => setViewMode("kanban")}
            >
              📊 Kanban Board
            </button>
          </div>

          {/* Search box inside queue */}
          <input
            type="text"
            className="vt-search-input"
            style={{
              padding: "7px 14px",
              borderRadius: "999px",
              background: "#f4f8ed",
              border: "1px solid #dce8d8",
              width: "220px",
              fontSize: "12.5px",
            }}
            placeholder="Search patient, ID, dept..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All (${counts.total || 0})` },
            { id: "in_process", label: `In Process (${counts.in_process || 0})` },
            { id: "ready_for_doctor", label: `Ready (${counts.ready_for_doctor || 0})` },
            { id: "in_consultation", label: `Consulting (${counts.in_consultation || 0})` },
            { id: "completed", label: `Done (${counts.completed || 0})` },
            { id: "red_flag", label: `🚨 Red Flag (${counts.red_flag || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`vt-range-btn ${activeFilter === tab.id ? "active" : ""}`}
              style={{
                background: activeFilter === tab.id ? "var(--vt-dark-green)" : "#ffffff",
                color: activeFilter === tab.id ? "#ffffff" : "var(--vt-text-muted)",
                border: "1px solid #e2ebe0",
                fontSize: "11.5px",
                padding: "6px 12px",
              }}
              onClick={() => onSelectFilter && onSelectFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN WORKFLOW: TABLE VIEW VS KANBAN BOARD */}
      {viewMode === "table" ? (
        <div className="vt-table-wrap">
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <div className="loading-spinner" />
              <p style={{ marginTop: "12px", color: "var(--vt-text-muted)" }}>Updating OPD Queue...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No Patients in this Category"
              message="No intake sessions match the selected filter criteria."
            />
          ) : (
            <table className="vt-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Department</th>
                  <th>Assigned Doctor</th>
                  <th>Status</th>
                  <th>Check-In Time</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((pat) => {
                  const isRedFlag = pat.red_flag === 1;
                  const isAck = pat.red_flag_acknowledged === 1;

                  return (
                    <tr
                      key={pat.session_id}
                      onClick={() => onOpenCaseDetails && onOpenCaseDetails(pat.session_id)}
                    >
                      <td>
                        <PriorityChip
                          priority={pat.priority}
                          isRedFlag={isRedFlag}
                          isAck={isAck}
                        />
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                        {pat.patient_id ? pat.patient_id.substring(0, 8) : "GUEST"}
                      </td>
                      <td>
                        <strong style={{ color: "var(--vt-dark-green)" }}>{pat.patient_name}</strong>
                        <div style={{ fontSize: "11px", color: "var(--vt-text-muted)" }}>
                          {pat.age ? `${pat.age}y` : ""} {pat.gender ? `• ${pat.gender}` : ""}
                        </div>
                      </td>
                      <td>
                        <span style={{ background: "#f0f5ed", padding: "3px 8px", borderRadius: "6px", fontSize: "11.5px" }}>
                          {pat.department || "General"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--vt-text-main)" }}>
                          🩺 {pat.doctor_name || "On-Duty Physician"}
                        </span>
                      </td>
                      <td>
                        <StatusChip status={pat.status} />
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--vt-text-muted)" }}>
                        {pat.created_at
                          ? new Date(pat.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "--"}
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          {isRedFlag && !isAck && onAcknowledgeRedFlag && (
                            <button
                              type="button"
                              className="vt-btn-alert-ack"
                              disabled={acknowledgingId === pat.session_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAcknowledgeRedFlag(pat.session_id, e);
                              }}
                            >
                              {acknowledgingId === pat.session_id ? "..." : "Acknowledge"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="vt-btn-alert-view"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPatientProfile && onOpenPatientProfile(pat.patient_id);
                            }}
                          >
                            Unified Profile 📋
                          </button>
                          <button
                            type="button"
                            className="vt-btn-alert-view"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCaseDetails && onOpenCaseDetails(pat.session_id);
                            }}
                          >
                            View Case ↗
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="vt-kanban-board">
          {kanbanColumns.map((col) => {
            const colPatients = filteredPatients.filter((p) => {
              if (col.statusKey === "in_progress") return p.status === "in_progress" || p.status === "pending_clarification";
              if (col.statusKey === "ready_for_opd") return p.status === "ready_for_opd" || p.status === "ready_for_doctor";
              if (col.statusKey === "in_consultation") return p.status === "in_consultation";
              if (col.statusKey === "completed") return p.status === "completed";
              return false;
            });

            return (
              <div key={col.id} className="vt-kanban-col">
                <div className="vt-kanban-col-head">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{col.icon}</span>
                    <span className="vt-kanban-col-title">{col.label}</span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "#e4ede0",
                      color: "var(--vt-dark-green)",
                    }}
                  >
                    {colPatients.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                  {colPatients.length === 0 ? (
                    <div style={{ padding: "30px 10px", textAlign: "center", color: "var(--vt-text-muted)", fontSize: "12px" }}>
                      No patients in this stage
                    </div>
                  ) : (
                    colPatients.map((pat) => (
                      <div
                        key={pat.session_id}
                        className="vt-kanban-card"
                        onClick={() => onOpenCaseDetails && onOpenCaseDetails(pat.session_id)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--vt-text-muted)" }}>
                            {pat.patient_id ? pat.patient_id.substring(0, 8) : "GUEST"}
                          </span>
                          <PriorityChip
                            priority={pat.priority}
                            isRedFlag={pat.red_flag === 1}
                            isAck={pat.red_flag_acknowledged === 1}
                          />
                        </div>

                        <strong style={{ fontSize: "13.5px", color: "var(--vt-dark-green)" }}>
                          {pat.patient_name}
                        </strong>

                        <div style={{ fontSize: "11.5px", color: "var(--vt-text-muted)" }}>
                          Dept: <strong>{pat.department || "General"}</strong> • MD: {pat.doctor_name || "Assigned"}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #edf4ea", paddingTop: "8px", marginTop: "4px" }}>
                          <span style={{ fontSize: "11px", color: "var(--vt-text-light)" }}>
                            {pat.created_at ? new Date(pat.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                          </span>
                          <button
                            type="button"
                            className="vt-btn-alert-view"
                            style={{ padding: "2px 8px", fontSize: "10.5px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPatientProfile && onOpenPatientProfile(pat.patient_id);
                            }}
                          >
                            Profile 📋
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
