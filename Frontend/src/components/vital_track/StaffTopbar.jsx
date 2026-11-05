import {
  Search,
  Bell,
  RefreshCw,
  ArrowLeft,
  Plus,
  Menu,
} from "lucide-react";

export default function StaffTopbar({
  currentStaff,
  lastRefreshed,
  onRefresh,
  onSwitchToPatient,
  onAdmitClick,
  globalSearch,
  onSearchChange,
  unreadAlertCount = 0,
  pageTitle = "OPD Dashboard",
  breadcrumb = "Staff Portal / OPD",
  onToggleMobileMenu,
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
    <header className="vt-staff-topbar">
      {/* 1. LEFT TITLE & BREADCRUMB */}
      <div className="vt-topbar-left">
        {onToggleMobileMenu && (
          <button
            type="button"
            className="vt-mobile-menu-btn"
            onClick={onToggleMobileMenu}
            title="Open navigation menu"
            aria-label="Open staff navigation menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="vt-breadcrumb">{breadcrumb}</div>
        <h1 className="vt-page-heading">{pageTitle}</h1>
      </div>

      {/* 2. MIDDLE SEARCH PATIENTS */}
      <div className="vt-topbar-center">
        <div className="vt-topbar-search-box">
          <Search size={16} className="vt-search-icon" />
          <input
            type="text"
            className="vt-topbar-search-input"
            placeholder="Search patients, PAT-IDs, departments or doctors..."
            value={globalSearch}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* 3. RIGHT CONTROLS */}
      <div className="vt-topbar-right">
        {/* Live sync periodic indicator (10s polling) */}
        <div className="vt-live-sync-pill" title="Periodic live sync every 10 seconds">
          <span className="vt-live-dot" />
          <span className="vt-sync-text">Live Sync (10s)</span>
          {lastRefreshed && (
            <span className="vt-sync-time">
              • {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>

        {/* Manual Refresh Button */}
        <button
          type="button"
          className="vt-topbar-icon-btn"
          onClick={onRefresh}
          title="Refresh OPD data & queues now"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw size={16} />
        </button>

        {/* Unread Alerts Bell */}
        <div className="vt-topbar-alert-wrapper" title={`${unreadAlertCount} active critical red flag alerts`}>
          <button
            type="button"
            className="vt-topbar-icon-btn"
            aria-label="Critical notifications"
          >
            <Bell size={16} />
            {unreadAlertCount > 0 && (
              <span className="vt-topbar-badge">{unreadAlertCount}</span>
            )}
          </button>
        </div>

        {/* Switch to Patient Kiosk */}
        <button
          type="button"
          className="vt-topbar-btn-return"
          onClick={onSwitchToPatient}
          title="Return to Patient Self-Service Kiosk"
        >
          <ArrowLeft size={14} />
          <span>Patient Kiosk</span>
        </button>

        {/* Primary CTA: + Admit Patient */}
        {onAdmitClick && (
          <button
            type="button"
            className="vt-topbar-btn-admit"
            onClick={onAdmitClick}
            title="Admit Outpatient or Emergency Walk-in"
          >
            <Plus size={16} />
            <span>Admit Patient</span>
          </button>
        )}

        {/* Staff Profile Avatar */}
        <div className="vt-topbar-profile" title={`${currentStaff?.name} (${currentStaff?.role})`}>
          <div className="vt-profile-avatar">{staffInitials}</div>
          <div className="vt-profile-info">
            <span className="vt-profile-name">{currentStaff?.name || "Staff Member"}</span>
            <span className="vt-profile-hosp">{currentStaff?.hospital_name || "General Hospital"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
