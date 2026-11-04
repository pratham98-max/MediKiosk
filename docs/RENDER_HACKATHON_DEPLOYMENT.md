# MEDIKIOSK RENDER DEPLOYMENT GUIDE (HACKATHON DEMONSTRATION)

**System:** MediKiosk + Patient Care Integrated Healthcare Platform  
**Target Platform:** Render.com Cloud  
**Deployment Tier:** Hackathon Demonstration & Jury Review  
**Architecture:** Render Static Site (React/Vite) + Render Web Service (FastAPI) + Persistent Disk (SQLite WAL)  
**Document Version:** 1.0  
**Date:** November 2026

---

## 1. Overview & Architecture

This guide details how to deploy MediKiosk to [Render](https://render.com) so hackathon judges and evaluators can interact with the live application over the public internet without local setup.

```
                          [ Hackathon Judges & Evaluators ]
                                          │
                                          ▼
                                   HTTPS (Browser)
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌─────────────────────────┐                     ┌─────────────────────────┐
     │   Render Static Site    │                     │    Render Web Service   │
     │   (React 18 + Vite)     │──API (VITE_API_BASE)│     (FastAPI Python)    │
     │ medikiosk-frontend      │                     │   medikiosk-backend     │
     └─────────────────────────┘                     └────────────┬────────────┘
                                                                  │
                                                                  ▼
                                                     ┌─────────────────────────┐
                                                     │ Render Persistent Disk  │
                                                     │ Mount: /var/data        │
                                                     │  - medikiosk.db (WAL)   │
                                                     │  - uploads/ (documents) │
                                                     └─────────────────────────┘
```

---

## 2. Render Services Specification

| Parameter | Service 1: Backend API | Service 2: Frontend UI |
| :--- | :--- | :--- |
| **Render Type** | **Web Service** | **Static Site** |
| **Name** | `medikiosk-backend` | `medikiosk-frontend` |
| **Environment** | Python 3 | Node / Static |
| **Root Directory** | `backend` | `Frontend` |
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` | `npm install && npm run build` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | *(Static web server)* |
| **Publish Directory** | N/A | `dist` |
| **Health Check Path** | `/health` | `/` |
| **Persistent Disk** | `/var/data` (1 GB) | None |

---

## 3. Environment Variables Specification

### 3.1 Backend Web Service Environment Variables

| Variable Name | Required | Example Production Value | Purpose |
| :--- | :---: | :--- | :--- |
| **`PYTHON_VERSION`** | Yes | `3.11.9` | Sets Render's Python runtime version |
| **`PORT`** | Auto | `10000` *(Auto-injected by Render)* | Port Uvicorn listens on |
| **`HOST`** | Yes | `0.0.0.0` | Public interface binding |
| **`DATABASE_PATH`** | Yes | `/var/data/medikiosk.db` | Absolute path on persistent disk |
| **`UPLOADS_DIR`** | Yes | `/var/data/uploads` | Document storage on persistent disk |
| **`CORS_ALLOWED_ORIGINS`**| Yes | `https://medikiosk-frontend.onrender.com` | Allowed frontend origin |
| **`GROQ_API_KEY`** | Yes | `gsk_...` *(Your private key)* | Groq Cloud LLM for AI patient intake |
| **`GROQ_MODEL`** | No | `llama-3.3-70b-versatile` | LLM model selection |
| **`DEMO_MODE`** | No | `true` | Enables hackathon demo login helper |

### 3.2 Frontend Static Site Environment Variables

| Variable Name | Required | Example Production Value | Purpose |
| :--- | :---: | :--- | :--- |
| **`VITE_API_BASE`** | Yes | `https://medikiosk-backend.onrender.com` | Live backend API address |

---

## 4. Step-by-Step Deployment Instructions

You can deploy using either **Option A (Render Blueprint)** or **Option B (Manual Dashboard)**.

### Option A: 1-Click Deployment via `render.yaml` (Recommended)

1. Push your repository to GitHub or GitLab.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect your MediKiosk repository.
5. Render reads `render.yaml` and displays the two services (`medikiosk-backend` and `medikiosk-frontend`).
6. Set your secret `GROQ_API_KEY` when prompted.
7. Click **Apply**. Render will automatically build and deploy both services!

---

### Option B: Manual Dashboard Deployment

#### Step 1: Deploy Backend Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name**: `medikiosk-backend`
   - **Region**: Choose closest to your judges (e.g., Oregon, Frankfurt, Singapore)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Attach Persistent Disk**:
   - Scroll down to **Disks** → click **Add Disk**.
   - **Name**: `medikiosk-storage`
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB`
5. **Add Environment Variables**:
   - `PYTHON_VERSION`: `3.11.9`
   - `DATABASE_PATH`: `/var/data/medikiosk.db`
   - `UPLOADS_DIR`: `/var/data/uploads`
   - `CORS_ALLOWED_ORIGINS`: `https://medikiosk-frontend.onrender.com`
   - `GROQ_API_KEY`: *(Paste your Groq API key)*
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g. `https://medikiosk-backend.onrender.com`).

#### Step 2: Seed Persistent Database (One-Time Step)
After the backend service starts, open the **Shell** tab in your Render backend dashboard:
```bash
python seed_dataset.py
```
This populates the 3 hospitals, ward beds, staff accounts, and initial demo patients into `/var/data/medikiosk.db`.

#### Step 3: Deploy Frontend Static Site
1. In Render Dashboard, click **New +** → **Static Site**.
2. Connect the same Git repository.
3. Configure:
   - **Name**: `medikiosk-frontend`
   - **Branch**: `main`
   - **Root Directory**: `Frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. **Add Environment Variables**:
   - `VITE_API_BASE`: `https://medikiosk-backend.onrender.com` *(Paste backend URL from Step 1)*
5. **SPA Redirect Rule**:
   - Under **Redirects/Rewrites**, verify rule:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite` (200)
   *(Note: The repository already includes `Frontend/public/_redirects` which handles this automatically).*
6. Click **Create Static Site**.

---

## 5. Hackathon Demonstration Accounts for Judges

Provide these credentials in your hackathon submission:

| Portal | URL Path | Login ID | Password | Key Features to Review |
| :--- | :--- | :--- | :--- | :--- |
| **Healthcare Staff Portal** | `/staff` or Switcher | `staff@medikiosk.com` | `staff123` | **Dashboard 1 (OPD)**: Triage queue, red-flag alerts, AI conversation summaries.<br>**Dashboard 2 (Inpatient)**: 5-section navigation, 6 KPI cards, ward bed map, vitals recorder, real-time ECG simulation oscilloscope, ML risk explainability (SHAP). |
| **Doctor & Clinical Portal** | `/doctor` or Switcher | `dr.priya@hospital.com` | `doctor123` | OPD queue, clinical context review, doctor editable context, hospital EMR commitment. |
| **Patient Kiosk Portal** | `/` (Home) | `9876543210` | `patient123` | Multilingual AI triage intake (English/Hindi/Marathi), red-flag detection, symptom history. |

---

## 6. Post-Deployment Verification Checklist

Once deployed, verify each of these 14 checkpoints against the public Render URLs:

- [ ] **1. Public Frontend Reachability**: Open `https://<your-frontend>.onrender.com` in a clean incognito window. Header, branding, and navigation render cleanly.
- [ ] **2. Backend Health Probe**: Open `https://<your-backend>.onrender.com/health` in browser. Expect `{"status": "healthy"}`.
- [ ] **3. CORS & API Connectivity**: Open browser DevTools Network tab on the frontend. Verify `GET /languages` and `/hospitals` return HTTP 200 without CORS errors.
- [ ] **4. Patient Portal Login**: Log in with `9876543210` / `patient123`. Verify session history and profile load.
- [ ] **5. AI Patient Intake**: Start conversational intake. Verify that the assistant responds in the selected language. (If Groq API key is inactive, verify that graceful local clinical fallback responds).
- [ ] **6. Doctor Portal Login**: Log in with `dr.priya@hospital.com` / `doctor123`. Verify patient queue loads.
- [ ] **7. Staff Portal Login**: Log in with `staff@medikiosk.com` / `staff123`.
- [ ] **8. Dashboard 1 (OPD)**: Verify patient census, red-flag badge counters, and nurse acknowledgement workflow.
- [ ] **9. Dashboard 2 (Inpatient Care)**: Click the "Admitted Patient Care" tab. Verify 5 internal navigation views:
  - *Dashboard*: 6 KPI cards, Left column Critical Alerts, Right column Inpatient census.
  - *Bed Management*: Visual 9-bed ward map (2 ICU, 7 General) with occupancy status.
  - *Add Patient*: Form to admit existing waiting patient or register emergency walk-in.
  - *AI Insights*: Capacity forecasting and high-risk surveillance.
  - *XAI & ML*: Animated AD8232 ECG oscilloscope, ML model performance benchmarks, and SHAP feature attribution bars.
- [ ] **10. Vital Recording**: Open "Record Vitals" on an inpatient. Enter HR 110, SBP 95, SpO2 94. Verify MEWS calculation and observation timeline update.
- [ ] **11. ECG Simulation Disclaimer (Rule 11)**: Confirm the ECG banner states `"Connected (Simulated Telemetry — AD8232 Software Simulator)"` and displays the simulation notice.
- [ ] **12. ML Evaluation Disclaimer (Rule 12)**: Confirm the ML performance table carries the `"Benchmark Evaluation (Rule 12)"` disclosure.
- [ ] **13. SPA Deep Links & Refresh**: Refresh the browser on `/staff` or `/doctor`. Verify page does not return a 404 Not Found.
- [ ] **14. Data Persistence Test**: Trigger a service restart from Render Dashboard. Re-open the application and confirm previously admitted patients and recorded vitals remain intact.

---

## 7. Known Render Limitations & Troubleshooting

### 7.1 Free Tier Spindown vs Render Persistent Disks
- **Render Disks**: Render Persistent Disks require a paid instance plan (Starter Web Service at ~$7/month).
- **Free Tier Alternative**: If running on Render's 100% Free plan, Render does not support persistent disks and will spin down after 15 minutes of inactivity. On restart, the local ephemeral filesystem resets to the Git commit.
  - *Hackathon Workaround on Free Plan*: Leave `DATABASE_PATH=medikiosk.db` (ephemeral). In `backend/app/main.py`, the database tables and seeded records are initialized directly from `medikiosk.db` in the repository, ensuring demo data is always immediately available for the judges upon wake-up.

### 7.2 Cold Start Delay on Free Web Service
- If using the Free tier, Render puts inactive services to sleep. The first request from a judge may take 30–50 seconds to spin up.
- *Tip for Hackathon Demo*: Send a ping to `https://<your-backend>.onrender.com/health` 5 minutes before your jury presentation so the service is warm and responsive.

### 7.3 Tesseract OCR on Render
- Render's native Python runtime does not include the system `tesseract-ocr` binary by default.
- If medical document OCR is required on Render, add a custom build command in Render settings:
  ```bash
  apt-get update && apt-get install -y tesseract-ocr && pip install -r requirements.txt
  ```
  *(Or use MediKiosk's graceful fallback which catches OCR extraction errors and allows manual complaint entry).*

---

## 8. Summary Checklist Before Sending to Judges

1. [x] `render.yaml` created in project root for 1-click deployment.
2. [x] CORS middleware updated to accept any `*.onrender.com` domain.
3. [x] `_redirects` file created in `Frontend/public/` for SPA routing.
4. [x] `database.py` updated to accept `DATABASE_PATH` from persistent disk.
5. [x] `main.py` updated to accept `UPLOADS_DIR` from persistent disk.
6. [x] Demo credentials verified and clearly documented.
7. [x] Zero real patient data or private API keys exposed.

