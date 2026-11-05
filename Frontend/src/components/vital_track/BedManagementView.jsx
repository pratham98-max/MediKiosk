import { useState, useMemo } from "react";
import {
  Search,
  Sparkles,
} from "lucide-react";

export default function BedManagementView({
  beds = [],
  onAllocateBed,
  onOpenProfile,
  onRecordVitals,
  onOptimizeBeds,
  optimizing = false,
  optimizeMessage = "",
}) {
  const [wardFilter, setWardFilter] = useState("all"); // 'all' | 'icu' | 'general' | 'available' | 'occupied'
  const [bedSearch, setBedSearch] = useState("");

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

  return (
    <div className="bed-mgmt-container">
      {/* 1. TOP METRICS STRIP (MATCHING BED MANAGEMENT REFERENCE IMAGE) */}
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

      {/* 2. FILTER & SEARCH CONTROLS */}
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
            placeholder="Search by bed number or patient..."
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

      {/* 3. WARD BED TILES GRID (MATCHING REFERENCE IMAGE CARDS) */}
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
  );
}

