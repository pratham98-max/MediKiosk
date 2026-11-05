import React from "react";

export default function SidebarNav({
  activeView,
  onSelectView,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  unreadAlertCount = 0,
  currentStaff,
  onStaffLogout,
}) {
  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "opd", label: "OPD Queue", icon: "👥" },
    { id: "admitted", label: "Admitted Patients", icon: "🏥" },
    { id: "beds", label: "Bed Management", icon: "🛏️" },
    { id: "vitals", label: "Vitals & MEWS", icon: "🩺" },
    { id: "xai", label: "ML Risk (XAI)", icon: "🧠" },
    { id: "transfers", label: "Transfers", icon: "🚑" },
    { id: "care_plans", label: "Care Plans", icon: "📋" },
    { id: "reports", label: "Reports & Analytics", icon: "📈" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <aside
      className={`vt-sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "open-mobile" : ""}`}
      aria-label="Staff workstation navigation"
    >
      <div>
        {/* SIDEBAR BRAND HEADER */}
        <div className="vt-sidebar-header">
          <div className="vt-sidebar-brand">
            <div className="vt-brand-icon">V</div>
            {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="vt-brand-text">VitalTrack</span>
                <span style={{ fontSize: "10px", color: "var(--vt-text-muted)" }}>
                  MediKiosk + Care
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="vt-collapse-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? "»" : "«"}
          </button>
        </div>

        {/* NAVIGATION LIST */}
        <nav className="vt-sidebar-nav">
          {!isCollapsed && <span className="vt-nav-section-label">Main Navigation</span>}

          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`vt-nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  onSelectView(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                title={item.label}
              >
                <span className="vt-nav-icon">{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
                {item.id === "dashboard" && unreadAlertCount > 0 && !isCollapsed && (
                  <span className="vt-nav-badge danger">{unreadAlertCount}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM FOOTER WITH LOGGED-IN STAFF INFO */}
      <div className="vt-sidebar-footer">
        {!isCollapsed && currentStaff && (
          <div className="vt-staff-card">
            <div className="vt-staff-avatar">
              {currentStaff.name
                ? currentStaff.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()
                : "ST"}
            </div>
            <div className="vt-staff-info">
              <div className="vt-staff-name">{currentStaff.name}</div>
              <div className="vt-staff-role">{currentStaff.role}</div>
            </div>
          </div>
        )}

        <button
          type="button"
          className="vt-nav-item"
          onClick={onStaffLogout}
          style={{ color: "var(--vt-crimson)" }}
          title="Sign out of workstation"
        >
          <span className="vt-nav-icon">🚪</span>
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
