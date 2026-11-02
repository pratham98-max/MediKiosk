"""
AD8232 ECG Sensor Telemetry Simulator Service
=============================================
Simulates real-time ECG sensor connection, telemetry streaming, waveform buffer,
and arrhythmia flag detection for clinical workflow demonstrations.

Rule 11 Compliance:
This service explicitly disclaims medical device functionality. Outputs are synthetic
educational demonstration values.
"""

import random
from datetime import datetime
from typing import Dict, Any, Optional, List

ECG_SIMULATION_DISCLAIMER = (
    "Demonstration Notice: Simulated ECG stream (AD8232 sensor simulation) is provided "
    "exclusively for clinical workflow demonstration and educational research. "
    "It is NOT connected to an active medical telemetry device."
)

class ECGSensorSimulator:
    def __init__(self):
        self.connected = False
        self.data_buffer: List[Dict[str, Any]] = []

    def connect(self) -> Dict[str, Any]:
        """Connects the simulated AD8232 sensor."""
        self.connected = True
        return {
            "success": True,
            "connected": True,
            "sensor": "AD8232 Heart Rate Monitor (Simulated)",
            "status": "online",
            "connected_at": datetime.now().isoformat(),
            "disclaimer": ECG_SIMULATION_DISCLAIMER
        }

    def disconnect(self) -> Dict[str, Any]:
        """Disconnects the simulated AD8232 sensor."""
        self.connected = False
        return {
            "success": True,
            "connected": False,
            "status": "offline",
            "disconnected_at": datetime.now().isoformat()
        }

    def read_data(self) -> Optional[Dict[str, Any]]:
        """
        Reads one telemetry frame with synthetic noisy ECG waveform points.
        """
        if not self.connected:
            return None

        base_hr = random.randint(65, 95)
        # 10% chance of tachycardic or bradycardic episode for alert testing
        r = random.random()
        if r < 0.05:
            base_hr = random.randint(131, 145)  # Tachycardia
        elif r < 0.08:
            base_hr = random.randint(42, 48)    # Bradycardia

        ecg_variance = round(random.uniform(0.1, 1.4), 3)
        ecg_std_dev = round(random.uniform(0.05, 0.75), 3)
        arrhythmia = (base_hr > 130 or base_hr < 50 or random.random() < 0.08)

        # Generate 10-point synthetic ECG waveform snippet (P-Q-R-S-T wave curve simulation)
        synthetic_waveform = [
            round(random.uniform(-0.1, 0.1), 3),
            round(random.uniform(0.1, 0.25), 3),   # P-wave
            round(random.uniform(-0.15, 0.0), 3),  # Q-dip
            round(random.uniform(1.2, 1.8), 3),    # R-peak
            round(random.uniform(-0.35, -0.1), 3), # S-dip
            round(random.uniform(0.0, 0.15), 3),   # ST-segment
            round(random.uniform(0.2, 0.45), 3),   # T-wave
            round(random.uniform(-0.05, 0.08), 3),
            round(random.uniform(-0.05, 0.05), 3),
            round(random.uniform(-0.05, 0.05), 3),
        ]

        frame = {
            "heart_rate": base_hr,
            "std_dev": ecg_std_dev,
            "variance": ecg_variance,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "signal_quality": random.choice(["Excellent", "Good", "Good", "Fair"]),
            "arrhythmia_detected": arrhythmia,
            "data_points": synthetic_waveform,
            "disclaimer": ECG_SIMULATION_DISCLAIMER
        }

        self.data_buffer.append(frame)
        if len(self.data_buffer) > 100:
            self.data_buffer.pop(0)

        return frame

    def get_history(self, count: int = 30) -> List[Dict[str, Any]]:
        """Returns recent ECG telemetry frames from buffer."""
        return self.data_buffer[-count:]

# Global singleton
ecg_simulator = ECGSensorSimulator()
