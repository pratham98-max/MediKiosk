// =============================================================================
// VITALTRACK MOCK DATA & TIME-SERIES BENCHMARKS
// Clearly labeled demo benchmarks for extended analytics & AI recommendations
// Real counts and states are dynamically mapped from live backend endpoints
// =============================================================================

export const PATIENT_FLOW_DATA = {
  "1 Day": [
    { time: "00:00", patients: 12, admissions: 2 },
    { time: "02:00", patients: 8, admissions: 1 },
    { time: "04:00", patients: 6, admissions: 0 },
    { time: "06:00", patients: 14, admissions: 3 },
    { time: "08:00", patients: 45, admissions: 7 },
    { time: "10:00", patients: 82, admissions: 12 },
    { time: "12:00", patients: 95, admissions: 15 },
    { time: "14:00", patients: 124, admissions: 18 },
    { time: "16:00", patients: 155, admissions: 22 },
    { time: "18:00", patients: 110, admissions: 16 },
    { time: "20:00", patients: 78, admissions: 9 },
    { time: "22:00", patients: 35, admissions: 4 },
  ],
  "7 Day": [
    { time: "Mon", patients: 520, admissions: 74 },
    { time: "Tue", patients: 580, admissions: 82 },
    { time: "Wed", patients: 640, admissions: 95 },
    { time: "Thu", patients: 610, admissions: 88 },
    { time: "Fri", patients: 720, admissions: 104 },
    { time: "Sat", patients: 480, admissions: 68 },
    { time: "Sun", patients: 420, admissions: 52 },
  ],
  "1 Month": [
    { time: "Week 1", patients: 3400, admissions: 480 },
    { time: "Week 2", patients: 3650, admissions: 510 },
    { time: "Week 3", patients: 3900, admissions: 560 },
    { time: "Week 4", patients: 3750, admissions: 530 },
  ],
  "6 Month": [
    { time: "Nov", patients: 14200, admissions: 2100 },
    { time: "Dec", patients: 15800, admissions: 2350 },
    { time: "Jan", patients: 16400, admissions: 2480 },
    { time: "Feb", patients: 14900, admissions: 2210 },
    { time: "Mar", patients: 15500, admissions: 2300 },
    { time: "Apr", patients: 16200, admissions: 2420 },
  ],
};

export const WARD_UTILIZATION_DATA = [
  { name: "ICU Ward", current: 91, capacity: 100, color: "#dc2626" },
  { name: "General Ward", current: 79, capacity: 100, color: "#1e9e4a" },
  { name: "Recovery", current: 62, capacity: 100, color: "#3b82f6" },
  { name: "Emergency", current: 78, capacity: 100, color: "#d97706" },
];

export const MEWS_DISTRIBUTION_DATA = [
  { band: "0 (Normal)", count: 28, color: "#16a34a" },
  { band: "1 - 2 (Low Risk)", count: 14, color: "#84cc16" },
  { band: "3 - 4 (Medium)", count: 6, color: "#d97706" },
  { band: "5+ (Critical)", count: 2, color: "#dc2626" },
];

export const HOURLY_RED_FLAGS_DATA = [
  { hour: "08:00", normal: 24, redFlags: 1 },
  { hour: "10:00", normal: 48, redFlags: 3 },
  { hour: "12:00", normal: 62, redFlags: 2 },
  { hour: "14:00", normal: 54, redFlags: 4 },
  { hour: "16:00", normal: 70, redFlags: 2 },
  { hour: "18:00", normal: 45, redFlags: 1 },
  { hour: "20:00", normal: 22, redFlags: 0 },
];

export const OPD_STATUS_FUNNEL = [
  { stage: "In Process", count: 18, color: "#64748b" },
  { stage: "Ready for Doctor", count: 12, color: "#22c55e" },
  { stage: "In Consultation", count: 8, color: "#0284c7" },
  { stage: "Completed", count: 34, color: "#0b3d1e" },
];

export const WARD_AVERAGE_VITALS = [
  { time: "06:00", avgHR: 74, avgSpO2: 97, avgTemp: 36.7 },
  { time: "09:00", avgHR: 78, avgSpO2: 98, avgTemp: 36.8 },
  { time: "12:00", avgHR: 82, avgSpO2: 97, avgTemp: 37.0 },
  { time: "15:00", avgHR: 79, avgSpO2: 98, avgTemp: 36.9 },
  { time: "18:00", avgHR: 76, avgSpO2: 98, avgTemp: 36.7 },
  { time: "21:00", avgHR: 72, avgSpO2: 98, avgTemp: 36.6 },
];

export const COMPLAINT_CATEGORIES = [
  { name: "Chest & Cardiac", value: 34, color: "#dc2626" },
  { name: "Respiratory / Flu", value: 28, color: "#0284c7" },
  { name: "Orthopedic / Trauma", value: 16, color: "#d97706" },
  { name: "Gastrointestinal", value: 14, color: "#8b5cf6" },
  { name: "General / Routine", value: 8, color: "#16a34a" },
];

export const AI_RECOMMENDATIONS_DATA = [
  {
    id: "ai-rec-1",
    category: "Ward Optimization",
    priority: "high",
    isHero: true,
    confidence: "94% confidence",
    time: "2m ago",
    title: "Reallocate stable patients from ICU to Ward 6",
    subtext: "ICU bed occupancy is currently at 91%. Two patients meet step-down MEWS criteria (score ≤ 1 for > 24h).",
    actionLabel: "Execute Reallocation",
    dismissLabel: "Dismiss",
  },
  {
    id: "ai-rec-2",
    category: "Staffing",
    priority: "medium",
    isHero: false,
    confidence: "87% confidence",
    time: "15m ago",
    title: "Shift Dr. Aiyar to ER at 2:00 PM?",
    subtext: "Predicted surge in acute emergency arrivals based on historical weekday patterns.",
    actionLabel: "Approve Shift",
    dismissLabel: "Ignore",
  },
  {
    id: "ai-rec-3",
    category: "Clinical Risk",
    priority: "high",
    isHero: false,
    confidence: "91% confidence",
    time: "28m ago",
    title: "Urgent: 2 Inpatients Flagged for MEWS Deterioration",
    subtext: "Elevated respiratory rate & tachycardia detected in Ward A. Bedside re-assessment advised.",
    actionLabel: "View Patients",
    dismissLabel: "Acknowledge",
  },
  {
    id: "ai-rec-4",
    category: "Supply & Inventory",
    priority: "low",
    isHero: false,
    confidence: "85% confidence",
    time: "45m ago",
    title: "Restock IV Antibiotics before evening rush",
    subtext: "Ward stock level is at 24 units; estimated evening demand is 38 units.",
    actionLabel: "Create Requisition",
    dismissLabel: "Dismiss",
  },
];
