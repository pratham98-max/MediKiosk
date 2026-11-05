import { useState } from "react";
import {
  Search,
  Clock,
  User,
  Stethoscope,
} from "lucide-react";
import StatusChip from "../ui/StatusChip";
import PriorityChip from "../ui/PriorityChip";

export default function PatientQueue({
  patients = [],
  loading = false,
  activeFilter = "all",
  counts = {},
  onSelectFilter,
  onOpenCaseDetails,
  onOpenPatientProfile,
  onAcknowledgeRedFlag,
  acknowledgingId,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPatients = patients.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (p.patient_name || p.full_name || "").toLowerCase();
    const id = (p.patient_id || "").toLowerCase();
    const dept = (p.department || "").toLowerCase();
    const doc = (p.doctor_name || "").toLowerCase();
    return (
      name.includes(term) ||
      id.includes(term) ||
      dept.includes(term) ||
      doc.includes(term)
    );
  });

  const filterTabs = [
    { id: "all", label: "All Patients", count: counts.total || patients.length },
    { id: "in_process", label: "In Process", count: counts.in_process || 0 },
    { id: "pending_clarification", label: "Clarification", count: counts.pending_clarification || 0 },
    { id: "ready_for_doctor", label: "Ready for Doctor", count: counts.ready_for_doctor || 0 },
    { id: "in_consultation", label: "In Consultation", count: counts.in_consultation || 0 },
    { id: "completed", label: "Completed", count: counts.completed || 0 },
    { id: "red_flag", label: "Red Flag", count: counts.red_flag || 0, isRed: true },
  ];

  return (
    <div className="opd-queue-card">
      {/* 1. QUEUE HEADER & SEARCH CONTROLS */}
      <div className="opd-queue-header">
        <div>
          <div className="opd-queue-title-row">
            <h3 className="opd-queue-title">Patient Queue</h3>
            <span className="opd-queue-count-chip">
              {filteredPatients.length} of {counts.total || patients.length}
            </span>
          </div>
          <p className="opd-queue-sub">
            Monitor patient intake, triage status and consultation progress.
          </p>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="opd-queue-actions">
          <div className="opd-queue-search-wrap">
            <Search size={15} className="opd-search-icon" />
            <input
              type="text"
              className="opd-queue-search-input"
              placeholder="Search by patient, ID, dept or doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="opd-search-clear-btn"
                onClick={() => setSearchTerm("")}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FILTER PILLS STRIP */}
      <div className="opd-filter-pills-row">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`opd-filter-pill ${isActive ? "active" : ""} ${
                tab.isRed ? "red-flag-pill" : ""
              }`}
              onClick={() => onSelectFilter && onSelectFilter(tab.id)}
            >
              <span>{tab.label}</span>
              <span className={`opd-filter-pill-count ${isActive ? "active" : ""}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. TABLE BODY */}
      <div className="opd-table-wrapper">
        {loading ? (
          <div className="opd-table-loading">
            <div className="loading-spinner" />
            <p>Syncing OPD patient queue records...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="opd-table-empty">
            <div className="opd-empty-icon-wrap">
              <User size={32} />
            </div>
            <h4>No Patients Found</h4>
            <p>
              {searchTerm
                ? `No patients match "${searchTerm}". Try a different search term or clear the filter.`
                : "No patient intake records currently match the selected criteria."}
            </p>
            {searchTerm && (
              <button
                type="button"
                className="opd-btn-reset-filter"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="opd-table-responsive">
            <table className="opd-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Age / Sex</th>
                  <th>Department</th>
                  <th>Assigned Doctor</th>
                  <th>Intake Status</th>
                  <th>Arrival Time</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((pat) => {
                  const isRedFlag = pat.red_flag === 1;
                  const isAck = pat.red_flag_acknowledged === 1;
                  const isAcknowledging = acknowledgingId === pat.session_id;

                  // Initials for avatar
                  const nameParts = (pat.patient_name || pat.full_name || "PT").trim().split(" ");
                  const initials =
                    nameParts.length > 1
                      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                      : nameParts[0].substring(0, 2).toUpperCase();

                  return (
                    <tr
                      key={pat.session_id || pat.patient_id}
                      className={`opd-table-row ${isRedFlag && !isAck ? "red-flag-row" : ""}`}
                      onClick={() => onOpenCaseDetails && onOpenCaseDetails(pat.session_id)}
                    >
                      {/* 1. Priority */}
                      <td>
                        <PriorityChip
                          priority={pat.priority}
                          isRedFlag={isRedFlag}
                          isAck={isAck}
                        />
                      </td>

                      {/* 2. Patient ID */}
                      <td>
                        <span className="opd-patient-id-tag">
                          {pat.patient_id ? pat.patient_id.substring(0, 10) : "GUEST"}
                        </span>
                      </td>

                      {/* 3. Patient Name & Avatar */}
                      <td>
                        <div className="opd-patient-cell">
                          <div className={`opd-patient-avatar ${isRedFlag ? "alert" : ""}`}>
                            {initials}
                          </div>
                          <div>
                            <span className="opd-patient-name">
                              {pat.patient_name || pat.full_name}
                            </span>
                            {pat.chief_complaint && (
                              <div className="opd-patient-complaint-preview">
                                {pat.chief_complaint}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Age / Gender */}
                      <td>
                        <span className="opd-cell-text">
                          {pat.age ? `${pat.age}y` : "--"} {pat.gender ? `• ${pat.gender}` : ""}
                        </span>
                      </td>

                      {/* 5. Department */}
                      <td>
                        <span className="opd-dept-badge">
                          {pat.department || "General Medicine"}
                        </span>
                      </td>

                      {/* 6. Assigned Doctor */}
                      <td>
                        <div className="opd-doctor-cell">
                          <Stethoscope size={13} className="text-primary-green" />
                          <span className="opd-cell-text">
                            {pat.doctor_name || "On-Duty Physician"}
                          </span>
                        </div>
                      </td>

                      {/* 7. Intake Status */}
                      <td>
                        <StatusChip status={pat.status} />
                      </td>

                      {/* 8. Arrival Time */}
                      <td>
                        <div className="opd-time-cell">
                          <Clock size={12} className="opd-time-icon" />
                          <span>
                            {pat.created_at
                              ? new Date(pat.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "--"}
                          </span>
                        </div>
                      </td>

                      {/* 9. Actions */}
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                        <div className="opd-table-actions">
                          {isRedFlag && !isAck && onAcknowledgeRedFlag && (
                            <button
                              type="button"
                              className="opd-action-btn ack"
                              disabled={isAcknowledging}
                              title="Acknowledge clinical red flag"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAcknowledgeRedFlag(pat.session_id, e);
                              }}
                            >
                              {isAcknowledging ? "..." : "Acknowledge"}
                            </button>
                          )}

                          <button
                            type="button"
                            className="opd-action-btn secondary"
                            title="Open Unified 8-Facet Dossier"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPatientProfile && onOpenPatientProfile(pat.patient_id);
                            }}
                          >
                            Profile 📋
                          </button>

                          <button
                            type="button"
                            className="opd-action-btn primary"
                            title="Inspect complete triage interview and contradiction details"
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
          </div>
        )}
      </div>
    </div>
  );
}
