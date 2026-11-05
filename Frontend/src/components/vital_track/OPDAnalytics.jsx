import { useMemo } from "react";
import {
  TrendingUp,
  PieChart as PieIcon,
  ShieldAlert,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function OPDAnalytics({ patients = [], counts = {} }) {
  // 1. CHART 1: PATIENT ARRIVAL TREND (Calculated from real patient intake timestamps)
  const arrivalTrendData = useMemo(() => {
    if (!patients || patients.length === 0) {
      // Sensible default empty curve if no patients
      return [
        { time: "08:00", patients: 0 },
        { time: "10:00", patients: 0 },
        { time: "12:00", patients: 0 },
        { time: "14:00", patients: 0 },
        { time: "16:00", patients: 0 },
      ];
    }

    // Group patients by 2-hour slots based on created_at
    const slots = {
      "08:00": 0,
      "10:00": 0,
      "12:00": 0,
      "14:00": 0,
      "16:00": 0,
      "18:00": 0,
    };

    patients.forEach((p) => {
      if (!p.created_at) return;
      try {
        const d = new Date(p.created_at);
        const hour = d.getHours();
        if (hour < 10) slots["08:00"]++;
        else if (hour < 12) slots["10:00"]++;
        else if (hour < 14) slots["12:00"]++;
        else if (hour < 16) slots["14:00"]++;
        else if (hour < 18) slots["16:00"]++;
        else slots["18:00"]++;
      } catch {
        slots["12:00"]++;
      }
    });

    return Object.entries(slots).map(([time, count]) => ({
      time,
      patients: count,
    }));
  }, [patients]);

  // 2. CHART 2: QUEUE DISTRIBUTION (Real counts from backend)
  const queueDistributionData = useMemo(() => {
    const raw = [
      { name: "In Process", value: counts.in_process || 0, color: "#90ae93" },
      { name: "Pending Clarification", value: counts.pending_clarification || 0, color: "#d97706" },
      { name: "Ready for Doctor", value: counts.ready_for_doctor || 0, color: "#285c2b" },
      { name: "In Consultation", value: counts.in_consultation || 0, color: "#0284c7" },
      { name: "Completed", value: counts.completed || 0, color: "#16a34a" },
    ];
    return raw.filter((item) => item.value > 0);
  }, [counts]);

  // 3. CHART 3: PATIENT RISK / PRIORITY DISTRIBUTION
  const riskDistributionData = useMemo(() => {
    let normalCount = 0;
    let elevatedCount = 0;
    let redFlagCount = counts.red_flag || 0;

    patients.forEach((p) => {
      const prio = (p.priority || "").toLowerCase();
      if (p.red_flag === 1) {
        // already counted in redFlagCount
      } else if (prio.includes("high") || prio.includes("urgent")) {
        elevatedCount++;
      } else {
        normalCount++;
      }
    });

    return [
      { name: "Standard / Low", count: normalCount, color: "#285c2b" },
      { name: "Medium / Elevated", count: elevatedCount, color: "#f59e0b" },
      { name: "High / Red Flag", count: redFlagCount, color: "#dc2626" },
    ].filter((item) => item.count > 0);
  }, [patients, counts.red_flag]);

  // 4. CHART 4: DEPARTMENT DISTRIBUTION (Real data from active OPD queue)
  const departmentData = useMemo(() => {
    const deptMap = {};
    patients.forEach((p) => {
      const dept = p.department || "General Medicine";
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    return Object.entries(deptMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [patients]);

  return (
    <section className="opd-analytics-section" aria-label="OPD Clinical Analytics">
      <div className="opd-analytics-header">
        <div>
          <h3 className="opd-analytics-title">OPD Workflow & Patient Flow Analytics</h3>
          <p className="opd-analytics-sub">
            Real-time census distribution, arrival trends, and triage urgency classifications
          </p>
        </div>
      </div>

      <div className="opd-analytics-grid">
        {/* CHART 1: ARRIVAL TREND */}
        <div className="opd-chart-card">
          <div className="opd-chart-card-header">
            <div className="opd-chart-title-wrap">
              <TrendingUp size={16} className="text-primary-green" />
              <span className="opd-chart-title">Patient Arrival Trend (Today)</span>
            </div>
            <span className="opd-chart-tag">Hourly Intake</span>
          </div>

          <div className="opd-chart-canvas">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={arrivalTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="opdGreenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#285C2B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#285C2B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ecda" />
                <XAxis dataKey="time" stroke="#68776a" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} stroke="#68776a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e4ecda",
                    boxShadow: "0 4px 12px rgba(11,33,12,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="patients"
                  stroke="#285C2B"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#opdGreenGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="opd-chart-caption">
            Calculated from real patient check-in timestamps in the active database.
          </div>
        </div>

        {/* CHART 2: QUEUE STATUS BREAKDOWN */}
        <div className="opd-chart-card">
          <div className="opd-chart-card-header">
            <div className="opd-chart-title-wrap">
              <PieIcon size={16} className="text-primary-green" />
              <span className="opd-chart-title">Queue Status Breakdown</span>
            </div>
            <span className="opd-chart-tag">{counts.total || 0} Total</span>
          </div>

          <div className="opd-chart-canvas">
            {queueDistributionData.length === 0 ? (
              <div className="opd-chart-empty">No queue data recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={queueDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {queueDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e4ecda",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", color: "#68776a" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="opd-chart-caption">
            Real-time breakdown of current outpatient consultation lifecycle stages.
          </div>
        </div>

        {/* CHART 3: TRIAGE RISK & PRIORITY DISTRIBUTION */}
        <div className="opd-chart-card">
          <div className="opd-chart-card-header">
            <div className="opd-chart-title-wrap">
              <ShieldAlert size={16} className="text-primary-green" />
              <span className="opd-chart-title">Triage Priority & Red Flag Distribution</span>
            </div>
            <span className="opd-chart-tag">Severity</span>
          </div>

          <div className="opd-chart-canvas">
            {riskDistributionData.length === 0 ? (
              <div className="opd-chart-empty">No priority records found</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={riskDistributionData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4ecda" />
                  <XAxis type="number" allowDecimals={false} stroke="#68776a" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#68776a" fontSize={11} width={100} />
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e4ecda",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {riskDistributionData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="opd-chart-caption">
            Classification of intake urgency based on AI symptom triage and clinical red flags.
          </div>
        </div>

        {/* CHART 4: DEPARTMENT DISTRIBUTION */}
        <div className="opd-chart-card">
          <div className="opd-chart-card-header">
            <div className="opd-chart-title-wrap">
              <Clock size={16} className="text-primary-green" />
              <span className="opd-chart-title">Patients by Specialty Department</span>
            </div>
            <span className="opd-chart-tag">Volume</span>
          </div>

          <div className="opd-chart-canvas">
            {departmentData.length === 0 ? (
              <div className="opd-chart-empty">No active department registrations</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ecda" />
                  <XAxis dataKey="name" stroke="#68776a" fontSize={10.5} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="#68776a" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e4ecda",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="#285C2B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="opd-chart-caption">
            Outpatient patient volume mapped by destination clinical specialty.
          </div>
        </div>
      </div>
    </section>
  );
}
