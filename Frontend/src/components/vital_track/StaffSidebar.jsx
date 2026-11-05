import {
  Users,
  BedDouble,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";

export default function StaffSidebar({
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
  const staffInitials = currentStaff?.name
    ? currentStaff.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "ST";

  return (
    <aside
      className={`vt-dark-sidebar ${isCollapsed ? "collapsed" : ""} ${
        isMobileOpen ? "open-mobile" : ""
      }`}
      aria-label="Staff workstation navigation"
    >
      <div className="vt-dark-sidebar-content">
        {/* BRAND HEADER */}
        <div className="vt-dark-sidebar-header">
          <div className="vt-dark-brand">
            <div className="vt-dark-brand-logo">
              <Activity size={22} className="vt-brand-icon-svg" />
            </div>
            {!isCollapsed && (
              <div className="vt-dark-brand-text-wrap">
                <span className="vt-dark-brand-title">VitalTrack</span>
                <span className="vt-dark-brand-subtitle">
                  MediKiosk + Care
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="vt-dark-collapse-toggle"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* NAVIGATION LIST (Strictly following the user request & VitalTrack reference) */}
        <nav className="vt-dark-nav-body">
          <div className="vt-dark-nav-section">
            {!isCollapsed && <span className="vt-dark-section-label">Main</span>}

            {/* 1. OPD DASHBOARD */}
            <button
              type="button"
              className={`vt-dark-nav-item ${activeView === "opd" ? "active" : ""}`}
              onClick={() => {
                onSelectView("opd");
                if (onCloseMobile) onCloseMobile();
              }}
              title="OPD Patient Queue Dashboard"
            >
              <span className="vt-dark-nav-icon">
                <Users size={18} />
              </span>
              {!isCollapsed && <span className="vt-dark-nav-label">OPD Queue</span>}
              {unreadAlertCount > 0 && !isCollapsed && (
                <span className="vt-dark-alert-badge">{unreadAlertCount}</span>
              )}
            </button>

            {/* 2. INPATIENT CARE (ADMITTED PATIENTS) */}
            <button
              type="button"
              className={`vt-dark-nav-item ${
                activeView === "admitted" ? "active" : ""
              }`}
              onClick={() => {
                onSelectView("admitted");
                if (onCloseMobile) onCloseMobile();
              }}
              title="Admitted Inpatient Care Dashboard"
            >
              <span className="vt-dark-nav-icon">
                <Activity size={18} />
              </span>
              {!isCollapsed && <span className="vt-dark-nav-label">Admitted Patients</span>}
            </button>

            {/* 3. BED MANAGEMENT */}
            <button
              type="button"
              className={`vt-dark-nav-item ${activeView === "beds" ? "active" : ""}`}
              onClick={() => {
                onSelectView("beds");
                if (onCloseMobile) onCloseMobile();
              }}
              title="Ward Bed Management & Occupancy"
            >
              <span className="vt-dark-nav-icon">
                <BedDouble size={18} />
              </span>
              {!isCollapsed && <span className="vt-dark-nav-label">Bed Management</span>}
            </button>

            {/* 4. REPORTS & ANALYTICS */}
            <button
              type="button"
              className={`vt-dark-nav-item ${activeView === "reports" ? "active" : ""}`}
              onClick={() => {
                onSelectView("reports");
                if (onCloseMobile) onCloseMobile();
              }}
              title="Reports & Analytics"
            >
              <span className="vt-dark-nav-icon">
                <BarChart3 size={18} />
              </span>
              {!isCollapsed && <span className="vt-dark-nav-label">Reports & Analytics</span>}
            </button>
          </div>
        </nav>

        {/* BOTTOM UTILITY / LOGOUT FOOTER */}
        <div className="vt-dark-sidebar-footer">
          {/* Alerts shortcut */}
          <button
            type="button"
            className="vt-dark-nav-item footer-item"
            onClick={() => {
              onSelectView("opd");
              if (onCloseMobile) onCloseMobile();
            }}
            title="Critical Alerts"
          >
            <span className="vt-dark-nav-icon">
              <Bell size={18} />
            </span>
            {!isCollapsed && <span className="vt-dark-nav-label">Alerts</span>}
            {unreadAlertCount > 0 && !isCollapsed && (
              <span className="vt-dark-alert-badge">{unreadAlertCount}</span>
            )}
          </button>

          {/* Settings */}
          <button
            type="button"
            className={`vt-dark-nav-item footer-item ${activeView === "settings" ? "active" : ""}`}
            onClick={() => {
              onSelectView("settings");
              if (onCloseMobile) onCloseMobile();
            }}
            title="Workstation Settings"
          >
            <span className="vt-dark-nav-icon">
              <Settings size={18} />
            </span>
            {!isCollapsed && <span className="vt-dark-nav-label">Settings</span>}
          </button>

          {/* Current Staff Profile Card */}
          {!isCollapsed && currentStaff && (
            <div className="vt-dark-staff-card">
              <div className="vt-dark-staff-avatar">{staffInitials}</div>
              <div className="vt-dark-staff-meta">
                <span className="vt-dark-staff-name">{currentStaff.name}</span>
                <span className="vt-dark-staff-role">{currentStaff.role}</span>
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <button
            type="button"
            className="vt-dark-nav-item signout-btn"
            onClick={onStaffLogout}
            title="Sign out of hospital staff desk"
          >
            <span className="vt-dark-nav-icon">
              <LogOut size={18} />
            </span>
            {!isCollapsed && <span className="vt-dark-nav-label">Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
