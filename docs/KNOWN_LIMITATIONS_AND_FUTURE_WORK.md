# KNOWN LIMITATIONS AND FUTURE WORK
## MediKiosk + Patient Care Integrated Healthcare Platform
**Document Version:** 1.0  
**Date:** November 2, 2026  

---

## 1. Machine Learning & Synthetic Training Data Disclosures (Rule 12)

> [!WARNING]
> **Synthetic Dataset Limitation:**  
> All pre-trained machine learning deterioration risk models (`RandomForest`, `GradientBoosting`, `SVM`, `LogisticRegression`) and length-of-stay estimation models were developed using a synthetic cohort of 10,000 simulated patient profiles. 
> 
> While mathematically consistent across 11 clinical features (Age, Heart Rate, SBP, RR, Temp, SpO2, ECG Heart Rate, ECG Std Dev, ECG Variance, Previous Conditions, Triage Level), these predictions represent **exploratory clinical decision-support indicators only**. They have **NOT** undergone real-world multicenter clinical validation, prospective trials, or clearance by regulatory bodies (e.g., FDA 510(k), CE-MDR, or CDSCO).
> 
> They must **never** be used as an autonomous diagnostic authority or to override licensed physician judgment.

---

## 2. Physiological MEWS Clinical Scope

The Subbe (2001) Modified Early Warning Score is implemented according to peer-reviewed clinical literature. However:
- **Pediatric Limitations:** The Subbe MEWS formula is validated for adult populations (> 16 years). Pediatric patients require PEWS (Pediatric Early Warning Score) scoring, which is not currently modeled.
- **Obstetric Limitations:** Pregnant patients require MEOWS (Modified Early Obstetric Warning Score) taking gestational hemodynamics into account.
- **Hospital Protocol Adaptations:** Some health networks use NEWS2 (National Early Warning Score 2) which introduces hypercapnic respiratory failure scales. Supporting configurable rulesets (Subbe, NEWS2, PEWS) is planned for future releases.

---

## 3. Explainable AI (XAI) Scope & Heuristic Fallback

- **Feature Attribution:** The current XAI engine generates rule-based clinical feature attribution based on established pathophysiological thresholds (e.g., SBP < 90 mmHg indicating circulatory compromise; SpO2 < 90% indicating hypoxemia).
- **SHAP / TreeExplainer:** Pre-computed SHAP values for complex non-linear feature interactions are partially implemented; runtime TreeExplainer execution is bounded to keep response latency < 100ms.
- **Python 3.13 Pickle Incompatibility:** Older Cython loss artifacts in `model_gradient_boosting.pkl` are bypassed smoothly via the deterministic fallback engine (`_fallback_prediction`), ensuring zero crashes. Retraining all models under native Python 3.13 is scheduled for the next release.

---

## 4. AD8232 ECG Telemetry Simulation (Rule 11)

> [!IMPORTANT]
> **Simulated Telemetry Disclaimer:**  
> The AD8232 ECG streaming feature operates via a synthetic P-Q-R-S-T mathematical waveform generator for demonstration and educational purposes. 
> 
> The application does **not** currently connect to raw analog UART / USB serial ports of hardware AD8232 breakout sensors in browser environments (due to Web Serial API permissions and browser sandboxing). It must **NOT** be used for diagnostic ECG telemetry, arrhythmia detection, or acute STEMI diagnosis.

---

## 5. Technical Limitations & Infrastructure Roadmap

### A. Database Concurrency (SQLite vs PostgreSQL)
- **Current State:** SQLite with Write-Ahead Logging (`PRAGMA journal_mode = wal`) and a 10,000ms busy timeout. Benchmarked cleanly for single-instance kiosk operations (up to 50 concurrent requests).
- **Future Production Roadmap:** Horizontal multi-server deployments require migration to **PostgreSQL 15+** with connection pooling (`asyncpg` / `psycopg3`).

### B. Real-Time Telemetry (HTTP Polling vs WebSockets)
- **Current State:** Patient census and vitals updates refresh via standard HTTP REST requests.
- **Future Production Roadmap:** Upgrade bedside telemetry streams and census boards to full-duplex WebSockets or Server-Sent Events (SSE) for sub-second ward-wide broadcast.

### C. External Medical Device Protocols
- **Current State:** Bedside vitals are input via the Web UI (`bedside_manual` or `ad8232_simulation`).
- **Future Production Roadmap:** Integrate direct HL7 v2, FHIR R4, and IEEE 11073 Point-of-Care Medical Device Communication (PoCD) protocols to ingest automated streams from bedside patient monitors (e.g. Philips IntelliVue, GE Carescape).

---

## 6. Summary of Regulatory & Governance Requirements for Production

Before deploying this software in a live hospital environment with real patients, the following mandatory steps must be executed:
1. **Clinical Ethics & Institutional Review Board (IRB) Clearance.**
2. **HIPAA / GDPR / DISHA Data Privacy Audit:** End-to-end encryption of data-at-rest and data-in-transit.
3. **Hardware Serial Driver Integration & Medical Device Software Certification (IEC 62304 / ISO 13485).**
4. **Multicenter Prospective Clinical Trial for ML Deterioration Prediction.**
