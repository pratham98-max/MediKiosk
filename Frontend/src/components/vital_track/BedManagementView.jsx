import { useState, useMemo } from "react";
import {
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";

export default function BedManagementView({
  beds = [],
  patients = [],
  onAllocateBed,
  onOpenProfile,
  onRecordVitals,
  onOptimizeBeds,
  optimizing = false,
  optimizeMessage = "",
}) {
  const [wardFilter, setWardFilter] = useState("all"); // 'all' | 'icu' | 'general' | 'available' | 'occupied'
  const [bedSearch, setBedSearch] = useState("");
  const [requests, setRequests] = useState([
    {
      id: "REQ-01",
      patientName: "Fatima Rahman",
      patientId: "P001",
      from: "ICU-12",
      to: "General-45",
      reason: "Stable vitals, ICU capacity needed for critical intake",
      doctor: "Dr. Ahmed Hassan",
      time: "12m ago",
      status: "pending",
    },
    {
      id: "REQ-02",
      patientName: "Karim Ahmed",
      patientId: "P002",
      from: "General-23",
      to: "Recovery-08",
      reason: "Post-surgery observation & continuous cardiac telemetry",
      doctor: "Dr. Nusrat Jahan",
      time: "1h ago",
      status: "approved",
    },
  ]);

  const totalBeds = beds.length || 9;
  const occupiedBeds = beds.filter((b) => b.status === "occupied" || b.patient_id).length;
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const maintenanceBeds = beds.filter((b) => b.status === "maintenance").length;

  // Filtered bed tiles
  const filteredBeds = useMemo(() => {
    return beds.filter((b) => {
      if (wardFilter === "icu" && b.bed_type !== "ICU") return false;
      if (wardFilter === "general" && b.bed_type === "ICU") return false;
      if (wardFilter === "available" && b.status === "occupied") return false;
      if (wardFilter === "occupied" && b.status !== "occupied") return false;

      if (bedSearch.trim()) {
        const q = bedSearch.toLowerCase();
        const numMatch = (b.bed_number || "").toLowerCase().includes(q);
        const typeMatch = (b.bed_type || "").toLowerCase().includes(q);
        const patMatch = (b.patient_name || "").toLowerCase().includes(q);
        if (!numMatch && !typeMatch && !patMatch) return false;
      }
      return true;
    });
  }, [beds, wardFilter, bedSearch]);

  const handleActionRequest = (id, newStatus) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  // Ward capacity summary
  const wardCapacities = useMemo(() => {
    const generalTotal = 150;
    const generalOccupied = 118;
    const icuTotal = 60;
    const icuOccupied = 55;
    const recoveryTotal = 80;
    const recoveryOccupied = 50;
    const emergencyTotal = 40;
    const emergencyOccupied = 31;

    return [
      { name: "General Ward", occupied: generalOccupied, total: generalTotal, pct: Math.round((generalOccupied / generalTotal) * 100), color: "#285c2b" },
      { name: "ICU Ward", occupied: icuOccupied, total: icuTotal, pct: Math.round((icuOccupied / icuTotal) * 100), color: "#dc2626" },
      { name: "Recovery Ward", occupied: recoveryOccupied, total: recoveryTotal, pct: Math.round((recoveryOccupied / recoveryTotal) * 100), color: "#16a34a" },
      { name: "Emergency Ward", occupied: emergencyOccupied, total: emergencyTotal, pct: Math.round((emergencyOccupied / emergencyTotal) * 100), color: "#d97706" },
    ];
  }, []);

  return (
    <div className="bed-mgmt-container">
      {/* 1. TOP METRICS STRIP (MATCHING VITALTRACK REFERENCE) */}
      <div className="bed-metrics-strip">
        <div className="bed-metric-card">
          <span className="bed-metric-label">Total Beds</span>
          <span className="bed-metric-val">{totalBeds}</span>
        </div>

        <div className="bed-metric-card">
          <span className="bed-metric-label">Occupied</span>
          <span className="bed-metric-val occupied">{occupiedBeds}</span>
        </div>

        <div className="bed-metric-card">
          <span className="bed-metric-label">Available</span>
          <span className="bed-metric-val available">{availableBeds}</span>
        </div>

        <div className="bed-metric-card">
          <span className="bed-metric-label">Maintenance</span>
          <span className="bed-metric-val maintenance">{maintenanceBeds}</span>
        </div>
      </div>

      {/* 2. SPLIT LAYOUT: LEFT BED MAP + RIGHT TRANSFER REQUESTS & WARD CAPACITY */}
      <div className="bed-mgmt-split-layout">
        {/* LEFT COLUMN: CONTROLS & BEDS GRID */}
        <div className="bed-mgmt-main-col">
          {/* FILTER & SEARCH CONTROLS */}
          <div className="bed-controls-bar">
            <div className="bed-filter-pills">
              {[
                { id: "all", label: "All Beds" },
                { id: "icu", label: "ICU Beds" },
                { id: "general", label: "General Ward" },
                { id: "available", label: "Available" },
                { id: "occupied", label: "Occupied" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`opd-filter-pill ${wardFilter === f.id ? "active" : ""}`}
                  onClick={() => setWardFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="bed-search-box">
              <Search size={15} className="opd-search-icon" />
              <input
                type="text"
                className="opd-queue-search-input"
                placeholder="Search bed number or patient..."
                value={bedSearch}
                onChange={(e) => setBedSearch(e.target.value)}
              />
              {bedSearch && (
                <button
                  type="button"
                  className="opd-search-clear-btn"
                  onClick={() => setBedSearch("")}
                >
                  ×
                </button>
              )}
            </div>

            {onOptimizeBeds && (
              <button
                type="button"
                className="opd-action-btn primary"
                disabled={optimizing}
                onClick={onOptimizeBeds}
                title="Auto-rebalance ward bed occupancy"
              >
                <Sparkles size={13} />
                <span>{optimizing ? "Optimizing..." : "Optimize Beds"}</span>
              </button>
            )}
          </div>

          {optimizeMessage && (
            <div className="doc-auth-alert doc-alert-info" style={{ margin: "0 0 16px" }}>
              <span>✨</span>
              <span>{optimizeMessage}</span>
            </div>
          )}

          {/* WARD BED TILES GRID (MATCHING REFERENCE CARDS) */}
          <div className="bed-tiles-grid">
            {filteredBeds.map((bed) => {
              const isOccupied = bed.status === "occupied" || Boolean(bed.patient_id);
              const isICU = bed.bed_type === "ICU";

              return (
                <div
                  key={bed.bed_number}
                  className={`bed-slot-card ${isOccupied ? "occupied" : "available"} ${
                    isICU ? "icu" : ""
                  }`}
                >
                  <div className="bed-slot-top">
                    <div className="bed-slot-id-wrap">
                      <span className="bed-slot-number">{bed.bed_number}</span>
                      <span className="bed-slot-floor">Floor 3 • {bed.bed_type || "Ward"}</span>
                    </div>
                    <span className={`bed-status-chip ${isOccupied ? "occupied" : "available"}`}>
                      {isOccupied ? "Occupied" : "Available"}
                    </span>
                  </div>

                  {isOccupied ? (
                    <div className="bed-slot-occupant">
                      <strong className="bed-patient-name">
                        {bed.patient_name || "Admitted Patient"}
                      </strong>
                      <div className="bed-patient-meta">
                        <span>ID: {bed.patient_id ? bed.patient_id.substring(0, 8) : "--"}</span>
                        {bed.mews_score !== undefined && (
                          <span> • MEWS: {bed.mews_score} pts</span>
                        )}
                      </div>
                      <div className="bed-patient-complaint">
                        {bed.chief_complaint || "Continuous observation"}
                      </div>

                      <div className="bed-slot-actions">
                        {bed.patient_id && onOpenProfile && (
                          <button
                            type="button"
                            className="opd-action-btn secondary"
                            style={{ flex: 1 }}
                            onClick={() => onOpenProfile(bed.patient_id)}
                          >
                            Profile 📋
                          </button>
                        )}
                        {onRecordVitals && (
                          <button
                            type="button"
                            className="opd-action-btn primary"
                            style={{ flex: 1 }}
                            onClick={() => onRecordVitals({ ...bed, full_name: bed.patient_name })}
                          >
                            Vitals 🩺
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bed-slot-vacant">
                      <div className="bed-vacant-icon">🛏️</div>
                      <p className="bed-vacant-text">Cleaned & Ready for Admission</p>
                      {onAllocateBed && (
                        <button
                          type="button"
                          className="bed-assign-btn"
                          onClick={() => onAllocateBed(bed)}
                        >
                          Assign Patient
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: TRANSFER REQUESTS & WARD CAPACITY (VITALTRACK SIDE PANEL) */}
        <aside className="bed-mgmt-side-col">
          {/* TRANSFER REQUESTS PANEL */}
          <div className="bed-side-panel">
            <div className="bed-side-panel-header">
              <h3 className="bed-side-panel-title">Transfer Requests</h3>
              <span className="bed-side-badge-count">{requests.filter((r) => r.status === "pending").length} Pending</span>
            </div>

            <div className="bed-transfer-requests-list">
              {requests.map((req) => (
                <div key={req.id} className={`bed-transfer-card ${req.status}`}>
                  <div className="bed-transfer-top">
                    <span className={`bed-req-badge ${req.status}`}>
                      {req.status === "pending" ? "⚠️ Pending" : "✓ Approved"}
                    </span>
                    <span className="bed-transfer-time">
                      <Clock size={11} /> {req.time}
                    </span>
                  </div>

                  <strong className="bed-transfer-patient">
                    {req.patientName} <span className="bed-transfer-pat-id">({req.patientId})</span>
                  </strong>

                  <div className="bed-transfer-route">
                    <span className="bed-route-pill">{req.from}</span>
                    <ArrowRight size={13} className="bed-route-arrow" />
                    <span className="bed-route-pill dest">{req.to}</span>
                  </div>

                  <p className="bed-transfer-reason">{req.reason}</p>
                  <div className="bed-transfer-doc">By: {req.doctor}</div>

                  {req.status === "pending" && (
                    <div className="bed-transfer-actions">
                      <button
                        type="button"
                        className="bed-transfer-btn approve"
                        onClick={() => handleActionRequest(req.id, "approved")}
                      >
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button
                        type="button"
                        className="bed-transfer-btn reject"
                        onClick={() => handleActionRequest(req.id, "rejected")}
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* WARD CAPACITY PANEL */}
          <div className="bed-side-panel">
            <div className="bed-side-panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={16} style={{ color: "var(--vt-primary-green)" }} />
                <h3 className="bed-side-panel-title">Ward Capacity</h3>
              </div>
            </div>

            <div className="bed-ward-capacity-list">
              {wardCapacities.map((ward) => (
                <div key={ward.name} className="bed-ward-capacity-item">
                  <div className="bed-ward-capacity-meta">
                    <span className="bed-ward-name">{ward.name}</span>
                    <span className="bed-ward-stat">
                      <strong>{ward.occupied}</strong>/{ward.total}
                    </span>
                  </div>
                  <div className="bed-ward-prog-track">
                    <div
                      className="bed-ward-prog-fill"
                      style={{
                        width: `${ward.pct}%`,
                        backgroundColor: ward.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

