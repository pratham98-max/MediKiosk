# INSTALLATION AND SETUP GUIDE

**System:** MediKiosk Healthcare Platform  
**Document Version:** 2.0 (Phase 4 Verified)  
**Date:** November 2026  
**Status:** FULLY VERIFIED ON WINDOWS 11 / LINUX

---

## 1. Prerequisites & System Requirements

Ensure the following tools are installed on your workstation or host server:

| Component | Minimum Version | Verified Version | Notes |
| :--- | :---: | :---: | :--- |
| **Operating System** | Windows 10/11, macOS 12+, Ubuntu 22.04+ | Windows 11 x64 | Cross-platform |
| **Python** | 3.10+ | 3.13.12 | 64-bit Python runtime |
| **Node.js** | 18.0+ | 20.x+ | Required for React 18 + Vite |
| **npm** | 9.0+ | 10.x+ | Node package manager |
| **Tesseract OCR** *(Optional)* | 4.0+ | 5.3+ | Required for local medical document OCR extraction |

---

## 2. Directory Architecture

```
MediKiosk-main/
├── backend/                       # FastAPI Application Tier
│   ├── app/
│   │   ├── main.py                # Core FastAPI application entrypoint
│   │   ├── routers/               # patient_care.py router
│   │   ├── services/              # mews, ml_risk, transfer, ecg, ocr
│   │   └── models/                # Pydantic validation schemas
│   ├── database.py                # SQLite DAL (17 relational tables)
│   ├── medikiosk.db               # Active SQLite database (WAL mode)
│   ├── requirements.txt           # Python dependency specifications
│   ├── .env.example               # Backend environment template
│   └── test_*.py                  # Automated integration test suites
├── Frontend/                      # React 18 + Vite Web Application
│   ├── src/
│   │   ├── App.jsx                # Root router and portal view switcher
│   │   ├── components/            # StaffPortal.jsx, DoctorPortal.jsx, PatientPortal.jsx
│   │   └── components/patient_care/ # Admitted patient care module & modals
│   ├── package.json               # Frontend dependencies & scripts
│   ├── vite.config.js             # Vite build configuration
│   └── .env.example               # Frontend environment template
└── docs/                          # Technical, architecture, and verification documentation
```

---

## 3. Backend Setup & Configuration

### Step 1: Navigate to Backend
```powershell
# Windows
cd backend

# Linux / macOS
cd backend
```

### Step 2: Establish Virtual Environment
```powershell
# Windows
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Python Dependencies
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
# Windows
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Ensure `.env` contains:
```ini
GROQ_API_KEY=your_groq_api_key_here
DATABASE_PATH=medikiosk.db
HOST=127.0.0.1
PORT=8000
```

### Step 5: Verify Database Integrity
```bash
python -c "import sqlite3; conn = sqlite3.connect('medikiosk.db'); print('Integrity:', conn.execute('PRAGMA integrity_check;').fetchall()); print('Foreign Keys:', conn.execute('PRAGMA foreign_key_check;').fetchall()); print('Journal Mode:', conn.execute('PRAGMA journal_mode;').fetchall()); conn.close()"
```

---

## 4. Frontend Setup & Build

### Step 1: Navigate to Frontend
```bash
cd ../Frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
# Windows
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```
Ensure `.env` points to your backend:
```ini
VITE_API_BASE=http://127.0.0.1:8000
```

### Step 4: Verify Production Build
```bash
npm run build
```
Verify that the output bundle compiles cleanly in `dist/`.

---

## 5. Running the Application

### Option A: Development Mode (Interactive Pair)

1. **Terminal 1 (Backend)**:
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Terminal 2 (Frontend)**:
   ```powershell
   cd Frontend
   npm run dev -- --host 127.0.0.1
   ```

3. Open your browser at:
   - Frontend UI: `http://127.0.0.1:5173`
   - Backend API Docs: `http://127.0.0.1:8000/docs`

---

## 6. Default Demo Credentials

| Portal | Identifier | Password | Access / Role |
| :--- | :--- | :--- | :--- |
| **Healthcare Staff Portal** | `staff@medikiosk.com` | `staff123` | OPD Triage, Red Flags, Inpatient Wards |
| **Doctor Portal** | `dr.priya@hospital.com` | `doctor123` | OPD Consultations, Clinical Notes, EMR |
| **Patient Portal** | `9876543210` | `patient123` | AI Triage, Chat History, Medical Records |

---

## 7. Running Verification Tests

Run the complete suite of 138 automated tests from the `backend/` directory:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1

python -u test_patient_care_backend.py
python -u test_phase3_staff_dashboard.py
python -u test_phase4_patient_data_integration.py
python -u test_phase5_comprehensive_validation.py
python -u test_new_features.py
python -u test_backup_restore.py
```
All 6 suites must report 100% pass rates.

---

## 8. Cloud Deployment (Render.com for Hackathon Demo)

For public access and hackathon judge evaluation, the project includes complete Render cloud deployment automation:
- **`render.yaml`**: Root blueprint for 1-click deployment of the FastAPI backend Web Service and React/Vite Static Site.
- **Dedicated Deployment Guide**: Refer to [**`docs/RENDER_HACKATHON_DEPLOYMENT.md`**](file:///c:/Users/kolpa/Downloads/MediKiosk-main%20Final/MediKiosk-main/docs/RENDER_HACKATHON_DEPLOYMENT.md) for full step-by-step instructions, environment variable configuration, persistent disk setup, and verification checklists.
