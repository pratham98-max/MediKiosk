import React, { useState, useEffect, useRef } from "react";

export default function ECGTelemetryModal({
  apiBase,
  patient,
  onClose,
}) {
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [waveformHistory, setWaveformHistory] = useState([]);
  const [error, setError] = useState("");
  const intervalRef = useRef(null);

  // Connect on open
  useEffect(() => {
    const initConnect = async () => {
      try {
        const res = await fetch(`${apiBase}/staff/patient-care/ecg/connect`, { method: "POST" });
        const data = await res.json();
        if (data.connected) {
          setConnected(true);
        }
      } catch (err) {
        console.error("ECG connection error:", err);
        setError("Failed to establish simulator link");
      }
    };
    initConnect();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      fetch(`${apiBase}/staff/patient-care/ecg/disconnect`, { method: "POST" }).catch(() => {});
    };
  }, [apiBase]);

  // Polling telemetry frame
  useEffect(() => {
    if (!connected || !streaming) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const fetchFrame = async () => {
      try {
        const res = await fetch(`${apiBase}/staff/patient-care/ecg/data`);
        const data = await res.json();
        if (data.telemetry) {
          setCurrentFrame(data.telemetry);
          setWaveformHistory((prev) => {
            const points = data.telemetry.data_points || [];
            const next = [...prev, ...points];
            return next.slice(-60); // Keep last 60 waveform points for smooth sweep
          });
        }
      } catch (err) {
        console.error("ECG data fetch error:", err);
      }
    };

    fetchFrame();
    intervalRef.current = setInterval(fetchFrame, 1000);

    return () => clearInterval(intervalRef.current);
  }, [connected, streaming, apiBase]);

  // Build SVG path string from points
  const buildSvgPath = () => {
    if (waveformHistory.length === 0) return "";
    const width = 680;
    const height = 140;
    const midY = height / 2;
    const stepX = width / Math.max(waveformHistory.length, 30);

    return waveformHistory.reduce((acc, pt, idx) => {
      const x = idx * stepX;
      // Invert Y: positive amplitude goes up
      const y = midY - pt * 35;
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  };

  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div className="pc-modal-window" style={{ maxWidth: "860px" }} onClick={(e) => e.stopPropagation()}>
        <div className="pc-modal-header">
          <h3>
            <span>📈</span> AD8232 ECG Sensor Telemetry Monitor (Simulated)
          </h3>
          <button type="button" className="btn-pc-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="pc-modal-body">
          {/* PATIENT INFO */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Patient:</strong> {patient?.full_name || patient?.patient_name || "Bedside Patient"}{" "}
              <span style={{ color: "var(--ink-soft)" }}>({patient?.patient_id})</span>
            </div>
            <div>
              <span className={`pc-bed-status ${connected ? "status-occupied" : "status-vacant"}`}>
                {connected ? "SENSOR ONLINE (AD8232 SIM)" : "OFFLINE"}
              </span>
            </div>
          </div>

          {error && (
            <div className="doc-auth-alert doc-alert-danger">
              <span>⚠️</span> <span>{error}</span>
            </div>
          )}

          {/* CLINICAL MONITOR OSCILLOSCOPE */}
          <div className="ecg-monitor-frame">
            <div className="ecg-top-stats">
              <div>
                <span style={{ fontSize: "12px", color: "#66bb6a" }}>HEART RATE (ECG)</span>
                <div className="ecg-hr-display">
                  {currentFrame ? currentFrame.heart_rate : "--"}{" "}
                  <span style={{ fontSize: "16px", fontWeight: "normal" }}>BPM</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "12px", color: "#66bb6a" }}>VARIANCE / STD DEV</span>
                <div style={{ fontSize: "16px", fontWeight: 600 }}>
                  σ: {currentFrame?.std_dev || "0.0"} • var: {currentFrame?.variance || "0.0"}
                </div>
              </div>

              <div>
                <span style={{ fontSize: "12px", color: "#66bb6a" }}>SIGNAL QUALITY</span>
                <div style={{ fontSize: "16px", fontWeight: 600 }}>
                  {currentFrame?.signal_quality || "Acquiring..."}
                </div>
              </div>

              <div>
                <span style={{ fontSize: "12px", color: "#66bb6a" }}>RHYTHM STATUS</span>
                <div>
                  {currentFrame?.arrhythmia_detected ? (
                    <span style={{ background: "#d32f2f", color: "#ffffff", padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700 }}>
                      ⚠️ ARRHYTHMIA DETECTED
                    </span>
                  ) : (
                    <span style={{ color: "#00e676", fontSize: "13px", fontWeight: 700 }}>
                      ✓ NORMAL SINUS RHYTHM
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SCREEN CANVAS / SVG WAVEFORM */}
            <div className="ecg-screen-canvas">
              <div className="ecg-grid-overlay"></div>
              <svg className="ecg-svg-waveform" viewBox="0 0 680 140" preserveAspectRatio="none">
                <path
                  d={buildSvgPath()}
                  fill="none"
                  stroke="#00e676"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="ecg-controls-bar">
              <span style={{ fontSize: "11px", color: "#81c784" }}>
                Sweep Speed: 25 mm/s • Gain: 10 mm/mV • Lead II Simulation
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  style={{ background: "#1b5e20", color: "#ffffff", border: "none", padding: "6px 14px", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: "12px" }}
                  onClick={() => setStreaming((prev) => !prev)}
                >
                  {streaming ? "⏸ Pause Stream" : "▶ Resume Stream"}
                </button>
              </div>
            </div>
          </div>

          {/* MANDATORY SIMULATED ECG TELEMETRY NOTICE (Rule 11 Compliance) */}
          <div className="disclaimer-banner disclaimer-ecg">
            <span className="disclaimer-icon">⚡</span>
            <div>
              <strong>Demonstration Notice (Rule 11):</strong> Simulated ECG stream (AD8232 sensor simulation)
              is provided exclusively for clinical workflow demonstration and educational research. It is{" "}
              <strong>NOT</strong> connected to an active medical telemetry device. Do not use for patient diagnosis.
            </div>
          </div>
        </div>

        <div className="pc-modal-footer">
          <button type="button" className="btn-pc-primary" onClick={onClose}>
            Close Telemetry Monitor
          </button>
        </div>
      </div>
    </div>
  );
}
