import React, { useState, useEffect, useMemo } from "react";

export default function HospitalSelector({
  apiBase,
  currentHospital,
  onSelectHospital,
}) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(
    currentHospital?.hospital_id || "hosp-medikiosk"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "current" | "external"
  const [cityFilter, setCityFilter] = useState("all");

  useEffect(() => {
    fetch(`${apiBase}/hospitals`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.hospitals) {
          setHospitals(data.hospitals);
        }
      })
      .catch((err) => console.error("Error fetching hospitals:", err))
      .finally(() => setLoading(false));
  }, [apiBase]);

  // Extract unique cities from hospital addresses
  const availableCities = useMemo(() => {
    const cities = new Set();
    hospitals.forEach((hosp) => {
      const parts = hosp.address?.split(",") || [];
      if (parts.length > 0) {
        // usually city is second to last or last part before pin code
        const possibleCity = parts[parts.length - 1].replace(/\d+/g, "").replace(/-/g, "").trim();
        if (possibleCity) cities.add(possibleCity);
      }
    });
    return Array.from(cities);
  }, [hospitals]);

  // Filtered hospital list
  const filteredHospitals = useMemo(() => {
    return hospitals.filter((hosp) => {
      // Type/category filter
      if (activeFilter === "current" && hosp.type !== "current") return false;
      if (activeFilter === "external" && !hosp.is_external) return false;

      // City filter
      if (cityFilter !== "all" && !hosp.address?.toLowerCase().includes(cityFilter.toLowerCase())) {
        return false;
      }

      // Search query (matches name, tagline, address)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = hosp.name?.toLowerCase().includes(query);
        const taglineMatch = hosp.tagline?.toLowerCase().includes(query);
        const addressMatch = hosp.address?.toLowerCase().includes(query);
        if (!nameMatch && !taglineMatch && !addressMatch) return false;
      }

      return true;
    });
  }, [hospitals, activeFilter, cityFilter, searchTerm]);

  const handleConfirm = () => {
    const matched = hospitals.find((h) => h.hospital_id === selectedId) || {
      hospital_id: "hosp-medikiosk",
      name: "MediKiosk General Hospital",
      address: "Block 4, Healthcare City, New Delhi",
    };
    onSelectHospital(matched);
  };

  return (
    <div className="hospital-select-container">
      <div className="hospital-select-header">
        <div className="hospital-select-icon">🏥</div>
        <h2>Select Healthcare Facility</h2>
        <p>
          Choose the hospital or clinical facility where you are receiving care today.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="hospital-controls">
        <div className="hospital-search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="hospital-search-input"
            placeholder="Search facility by name, location, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="hospital-filter-row">
          <div className="filter-group">
            <span className="filter-label">Facility Type:</span>
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${activeFilter === "all" ? "active" : ""}`}
                onClick={() => setActiveFilter("all")}
              >
                All Facilities ({hospitals.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${activeFilter === "current" ? "active" : ""}`}
                onClick={() => setActiveFilter("current")}
              >
                📍 Active Clinical Kiosk
              </button>
              <button
                type="button"
                className={`filter-chip ${activeFilter === "external" ? "active" : ""}`}
                onClick={() => setActiveFilter("external")}
              >
                🏥 External EMR Partners
              </button>
            </div>
          </div>

          {availableCities.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">City:</span>
              <div className="filter-chips">
                <button
                  type="button"
                  className={`filter-chip ${cityFilter === "all" ? "active" : ""}`}
                  onClick={() => setCityFilter("all")}
                >
                  All Cities
                </button>
                {availableCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    className={`filter-chip ${cityFilter === city ? "active" : ""}`}
                    onClick={() => setCityFilter(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"></div>
      ) : filteredHospitals.length === 0 ? (
        <div className="no-hospitals-found">
          <div className="no-hospitals-icon">🏥</div>
          <div className="no-hospitals-title">No Healthcare Facilities Found</div>
          <p className="no-hospitals-desc">
            No facilities match your search criteria "{searchTerm || activeFilter}". Try adjusting your filters or search keywords.
          </p>
          <button
            type="button"
            className="btn-reset-filters"
            onClick={() => {
              setSearchTerm("");
              setActiveFilter("all");
              setCityFilter("all");
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="hospital-cards-grid">
          {filteredHospitals.map((hosp) => {
            const isSelected = selectedId === hosp.hospital_id;
            const isCurrent = hosp.type === "current";

            return (
              <div
                key={hosp.hospital_id}
                className={`hospital-choice-card ${isSelected ? "selected" : ""} ${
                  isCurrent ? "hosp-primary" : "hosp-external"
                }`}
                onClick={() => setSelectedId(hosp.hospital_id)}
              >
                <div className="hosp-card-badge">
                  {isCurrent ? "📍 Active Clinical Kiosk" : "🏥 External EMR Partner"}
                </div>
                <div className="hosp-card-title">{hosp.name}</div>
                <div className="hosp-card-tagline">{hosp.tagline}</div>
                <div className="hosp-card-address">{hosp.address}</div>

                <div className="hosp-card-footer">
                  <span className="select-indicator">
                    {isSelected ? "● Selected Facility" : "○ Click to Select"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="hospital-select-actions">
        <button
          type="button"
          className="continue-button"
          onClick={handleConfirm}
          disabled={loading || !selectedId}
        >
          Confirm Facility & Proceed to Doctor Selection →
        </button>
      </div>
    </div>
  );
}

