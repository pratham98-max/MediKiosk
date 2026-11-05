import { useState, useEffect, useRef } from "react";
import {
  Heart,
  Activity,
  Wind,
  Thermometer,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function VitalsOverviewSection({
  vitals = {},
  mews = 0,
}) {
  const latest = vitals.latest || {};

  // BASELINE CLINICAL VALUES
  const baseHR = latest.heart_rate || 76;
  const baseSys = latest.blood_pressure_sys || 120;
  const baseDia = latest.blood_pressure_dia || 80;
  const baseSpO2 = latest.oxygen_saturation || 98;
  const baseTemp = latest.temperature || 36.6;
  const baseRR = latest.respiratory_rate || 16;

  // ACTIVE TELEMETRY METRIC TAB
  const [activeMetric, setActiveMetric] = useState("hr"); // 'hr' | 'bp' | 'spo2' | 'temp' | 'rr'

  // SIMULATION STATE (DEMO / SIMULATED MODE ONLY - NEVER WRITTEN TO DATABASE)
  const [isSimulating, setIsSimulating] = useState(false);
  const [simValues, setSimValues] = useState({
    hr: baseHR,
    bpSys: baseSys,
    bpDia: baseDia,
    spo2: baseSpO2,
    temp: baseTemp,
    rr: baseRR,
  });

  // Time-series waveform points (12 initial points representing chronological trend)
  const [telemetrySeries, setTelemetrySeries] = useState([
    { time: "12 AM", hr: 74, bpSys: 118, bpDia: 78, spo2: 98, temp: 36.5, rr: 16 },
    { time: "2 AM", hr: 72, bpSys: 116, bpDia: 76, spo2: 99, temp: 36.4, rr: 15 },
    { time: "4 AM", hr: 75, bpSys: 120, bpDia: 80, spo2: 98, temp: 36.5, rr: 16 },
    { time: "6 AM", hr: 78, bpSys: 122, bpDia: 82, spo2: 97, temp: 36.6, rr: 17 },
    { time: "8 AM", hr: 84, bpSys: 125, bpDia: 84, spo2: 98, temp: 36.7, rr: 18 },
    { time: "10 AM", hr: 80, bpSys: 121, bpDia: 80, spo2: 98, temp: 36.6, rr: 16 },
    { time: "12 PM", hr: 76, bpSys: 120, bpDia: 80, spo2: 98, temp: 36.6, rr: 16 },
    { time: "2 PM", hr: 79, bpSys: 122, bpDia: 81, spo2: 98, temp: 36.7, rr: 17 },
    { time: "4 PM", hr: 77, bpSys: 119, bpDia: 79, spo2: 98, temp: 36.6, rr: 16 },
    { time: "6 PM", hr: 75, bpSys: 120, bpDia: 80, spo2: 99, temp: 36.5, rr: 16 },
    { time: "8 PM", hr: 76, bpSys: 120, bpDia: 80, spo2: 98, temp: 36.6, rr: 16 },
  ]);

  const simTimerRef = useRef(null);

  // Controlled realistic simulated waveform update loop (Every 2 seconds)
  useEffect(() => {
    if (!isSimulating) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      return;
    }

    simTimerRef.current = setInterval(() => {
      // Natural biological micro-fluctuations
      const dHR = Math.floor(Math.random() * 5) - 2; // -2 to +2
      const dSys = Math.floor(Math.random() * 5) - 2;
      const dDia = Math.floor(Math.random() * 3) - 1;
      const dSpO2 = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      const dTemp = (Math.random() * 0.1 - 0.05).toFixed(1);
      const dRR = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;

      setSimValues((prev) => {
        const nextHR = Math.max(55, Math.min(125, prev.hr + dHR));
        const nextSys = Math.max(95, Math.min(160, prev.bpSys + dSys));
        const nextDia = Math.max(60, Math.min(95, prev.bpDia + dDia));
        const nextSpO2 = Math.max(92, Math.min(100, prev.spo2 + dSpO2));
        const nextTemp = (parseFloat(prev.temp) + parseFloat(dTemp)).toFixed(1);
        const nextRR = Math.max(12, Math.min(26, prev.rr + dRR));

        // Append to local chart stream
        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        setTelemetrySeries((hist) => [
          ...hist.slice(-14),
          {
            time: timeLabel,
            hr: nextHR,
            bpSys: nextSys,
            bpDia: nextDia,
            spo2: nextSpO2,
            temp: parseFloat(nextTemp),
            rr: nextRR,
          },
        ]);

        return {
          hr: nextHR,
          bpSys: nextSys,
          bpDia: nextDia,
          spo2: nextSpO2,
          temp: nextTemp,
          rr: nextRR,
        };
      });
    }, 2000);

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isSimulating]);

  const handleResetSim = () => {
    setIsSimulating(false);
    setSimValues({
      hr: baseHR,
      bpSys: baseSys,
      bpDia: baseDia,
      spo2: baseSpO2,
      temp: baseTemp,
      rr: baseRR,
    });
  };

  // Status judgments
  const hrStatus = simValues.hr > 100 ? "Elevated" : simValues.hr < 55 ? "Low" : "Normal";
  const bpStatus = simValues.bpSys > 135 ? "Elevated" : simValues.bpSys < 95 ? "Low" : "Normal";
  const spo2Status = simValues.spo2 < 95 ? "Low" : "Normal";
  const tempStatus = simValues.temp > 37.8 ? "Fever" : "Normal";
  const rrStatus = simValues.rr > 22 ? "High" : "Normal";

  return (
    <div className="vitals-overview-container">
      {/* 1. TOP HEADER WITH REAL-TIME / SIMULATION CONTROLS */}
      <div className="vitals-overview-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 className="vitals-overview-title">Vitals Overview</h3>
            {isSimulating ? (
              <span className="vitals-sim-pill active">
                <span className="vitals-live-dot pulse" />
                <span>Simulated Stream Active</span>
              </span>
            ) : (
              <span className="vitals-sim-pill verified">
                <CheckCircle2 size={12} />
                <span>Verified Clinical Record</span>
              </span>
            )}
          </div>
          <p className="vitals-overview-sub">
            Continuous physiological telemetry. Real-time trend analysis and early acuity scoring.
          </p>
        </div>

        {/* SIMULATION ACTION BUTTONS */}
        <div className="vitals-sim-controls">
          <button
            type="button"
            className={`vitals-sim-btn ${isSimulating ? "pause" : "start"}`}
            onClick={() => setIsSimulating(!isSimulating)}
            title={isSimulating ? "Pause live simulation" : "Start simulated telemetry"}
          >
            {isSimulating ? <Pause size={14} /> : <Play size={14} />}
            <span>{isSimulating ? "Pause Live Stream" : "Start Live Stream"}</span>
          </button>

          <button
            type="button"
            className="vitals-sim-btn reset"
            onClick={handleResetSim}
            title="Reset to verified baseline values"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 2. SIX METRIC CARDS ARRANGED IN TWO BALANCED ROWS (MATCHING SCREENSHOT) */}
      <div className="vitals-metric-grid">
        {/* Metric 1: Heart Rate */}
        <div
          className={`vitals-metric-card ${activeMetric === "hr" ? "selected" : ""}`}
          onClick={() => setActiveMetric("hr")}
        >
          <div className="vitals-metric-head">
            <div className="vitals-metric-icon-wrap hr">
              <Heart size={18} />
            </div>
            <span className="vitals-metric-name">Heart Rate</span>
          </div>
          <div className="vitals-metric-number-row">
            <span className="vitals-metric-val">{simValues.hr}</span>
            <span className="vitals-metric-unit">bpm</span>
          </div>
          <span className={`vitals-metric-status ${hrStatus === "Normal" ? "normal" : "warn"}`}>
            {hrStatus}
          </span>
        </div>

        {/* Metric 2: Blood Pressure */}
        <div
          className={`vitals-metric-card ${activeMetric === "bp" ? "selected" : ""}`}
          onClick={() => setActiveMetric("bp")}
        >
          <div className="vitals-metric-head">
            <div className="vitals-metric-icon-wrap bp">
              <Activity size={18} />
            </div>
            <span className="vitals-metric-name">Blood Pressure</span>
          </div>
          <div className="vitals-metric-number-row">
            <span className="vitals-metric-val">
              {simValues.bpSys}/{simValues.bpDia}
            </span>
            <span className="vitals-metric-unit">mmHg</span>
          </div>
          <span className={`vitals-metric-status ${bpStatus === "Normal" ? "normal" : "warn"}`}>
            {bpStatus}
          </span>
        </div>

        {/* Metric 3: Oxygen Saturation */}
        <div
          className={`vitals-metric-card ${activeMetric === "spo2" ? "selected" : ""}`}
          onClick={() => setActiveMetric("spo2")}
        >
          <div className="vitals-metric-head">
            <div className="vitals-metric-icon-wrap spo2">
              <Wind size={18} />
            </div>
            <span className="vitals-metric-name">Oxygen Level</span>
          </div>
          <div className="vitals-metric-number-row">
            <span className="vitals-metric-val">{simValues.spo2}</span>
            <span className="vitals-metric-unit">%</span>
          </div>
          <span className={`vitals-metric-status ${spo2Status === "Normal" ? "normal" : "danger"}`}>
            {spo2Status}
          </span>
        </div>

        {/* Metric 4: Temperature */}
        <div
          className={`vitals-metric-card ${activeMetric === "temp" ? "selected" : ""}`}
          onClick={() => setActiveMetric("temp")}
        >
          <div className="vitals-metric-head">
            <div className="vitals-metric-icon-wrap temp">
              <Thermometer size={18} />
            </div>
            <span className="vitals-metric-name">Temperature</span>
          </div>
          <div className="vitals-metric-number-row">
            <span className="vitals-metric-val">{simValues.temp}</span>
            <span className="vitals-metric-unit">°C</span>
          </div>
          <span className={`vitals-metric-status ${tempStatus === "Normal" ? "normal" : "warn"}`}>
            {tempStatus}
          </span>
        </div>

        {/* Metric 5: Respiratory Rate */}
        <div
          className={`vitals-metric-card ${activeMetric === "rr" ? "selected" : ""}`}
          onClick={() => setActiveMetric("rr")}
        >
          <div className="vitals-metric-head">
            <div className="vitals-metric-icon-wrap rr">
              <Wind size={18} />
            </div>
            <span className="vitals-metric-name">Respiratory Rate</span>
          </div>
          <div className="vitals-metric-number-row">
            <span className="vitals-metric-val">{simValues.rr}</span>
            <span className="vitals-metric-unit">/min</span>
          </div>
          <span className={`vitals-metric-status ${rrStatus === "Normal" ? "normal" : "warn"}`}>
            {rrStatus}
          </span>
        </div>

        {/* Metric 6: MEWS Score */}
        <div className="vitals-metric-card mews">
          <div className="vitals-metric-head">
            <div className="vitals-metric-icon-wrap mews">
              <ShieldAlert size={18} />
            </div>
            <span className="vitals-metric-name">MEWS Score</span>
          </div>
          <div className="vitals-metric-number-row">
            <span className="vitals-metric-val">{mews}</span>
            <span className="vitals-metric-unit">pts</span>
          </div>
          <span className={`vitals-metric-status ${mews >= 4 ? "danger" : mews >= 2 ? "warn" : "normal"}`}>
            {mews >= 4 ? "Critical" : mews >= 2 ? "Observation" : "Stable"}
          </span>
        </div>
      </div>

      {/* 3. TIME-SERIES CONTINUOUS WAVEFORM (SMOOTH BLUE LINE + LIGHT SHADED AREA UNDERNEATH) */}
      <div className="vitals-chart-card">
        <div className="vitals-chart-card-head">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="vitals-chart-selected-title">
              {activeMetric === "hr"
                ? "Heart Rate Trend (bpm)"
                : activeMetric === "bp"
                ? "Arterial Blood Pressure (mmHg)"
                : activeMetric === "spo2"
                ? "Pulse Oximetry SpO2 (%)"
                : activeMetric === "temp"
                ? "Core Body Temperature (°C)"
                : "Respiratory Rate (/min)"}
            </span>
          </div>

          <div className="vitals-metric-switcher">
            {[
              { id: "hr", label: "Heart Rate" },
              { id: "bp", label: "Blood Pressure" },
              { id: "spo2", label: "SpO2" },
              { id: "temp", label: "Temperature" },
              { id: "rr", label: "Resp Rate" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`vitals-tab-btn ${activeMetric === tab.id ? "active" : ""}`}
                onClick={() => setActiveMetric(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="vitals-chart-canvas">
          <ResponsiveContainer width="100%" height={260}>
            {activeMetric === "bp" ? (
              <LineChart data={telemetrySeries} margin={{ top: 12, right: 14, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ebe0" />
                <XAxis dataKey="time" stroke="#68776a" fontSize={11} tickLine={false} />
                <YAxis domain={[50, 180]} stroke="#68776a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e4ecda",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bpSys"
                  name="Systolic BP"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#2563eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="bpDia"
                  name="Diastolic BP"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2, fill: "#60a5fa" }}
                />
              </LineChart>
            ) : (
              <AreaChart data={telemetrySeries} margin={{ top: 12, right: 14, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="vitalsBlueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ebe0" />
                <XAxis dataKey="time" stroke="#68776a" fontSize={11} tickLine={false} />
                <YAxis
                  domain={
                    activeMetric === "hr"
                      ? [40, 140]
                      : activeMetric === "spo2"
                      ? [85, 100]
                      : activeMetric === "temp"
                      ? [35, 40]
                      : [10, 30]
                  }
                  stroke="#68776a"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e4ecda",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={
                    activeMetric === "hr"
                      ? "hr"
                      : activeMetric === "spo2"
                      ? "spo2"
                      : activeMetric === "temp"
                      ? "temp"
                      : "rr"
                  }
                  name="Observed Value"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#vitalsBlueGradient)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="vitals-chart-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="vitals-live-dot" />
            <span>Live stream · updated every 2.0s</span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--vt-secondary-text)" }}>
            *Simulation demonstration only. Values are not persisted to patient EMR.
          </span>
        </div>
      </div>
    </div>
  );
}

