# INSTALLATION AND SETUP GUIDE
## MediKiosk + Patient Care Integrated Healthcare Platform
**Document Version:** 1.0  
**Date:** November 2, 2026  

---

## 1. Prerequisites & System Requirements

Ensure the following tools are installed on your workstation:

| Component | Minimum Version | Verified Version | Notes |
| :--- | :---: | :---: | :--- |
| **Operating System** | Windows 10/11, macOS 12+, or Ubuntu 20.04+ | Windows 11 x64 | Cross-platform Python & Node runtime |
| **Python** | 3.10+ | 3.13.12 | Standard Python 64-bit |
| **Node.js** | 18.0+ | 20.x+ | Required for React + Vite build |
| **npm** | 9.0+ | 10.x+ | Frontend package manager |
| **Tesseract OCR** *(Optional)* | 4.0+ | 5.x | Required for OCR image text extraction |

---

## 2. Repository Architecture & Layout

```
Medikiosk/
├── backend/                  # FastAPI Application Tier
│   ├── app/
│   │   ├── main.py           # Core FastAPI application entrypoint
│   │   ├── routers/          # Route controllers (patient_care.py)
│   │   ├── services/         # Clinical logic (mews, ml_risk, transfer, ecg)
│   │   └── models/           # Pydantic schemas (patient_care_models.py)
│   ├── artifacts/            # Pre-trained ML models & scalers (.pkl)
│   ├── database.py           # SQLite data access engine & schemas
│   ├── medikiosk.db          # Active SQLite database (WAL mode)
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment template
├── Frontend/                 # React 18 + Vite User Interface
│   ├── src/
│   │   ├── App.jsx           # Master UI container & navigation
│   │   ├── components/       # UI modules & StaffPortal.jsx
│   │   └── components/patient_care/ # Inpatient & physiological monitoring suite
│   ├── package.json          # Frontend dependencies & scripts
│   └── .env.example          # Frontend environment template
└── docs/                     # Technical, API, and clinical documentation
```

---

## 3. Backend Setup & Configuration

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Create and Activate Virtual Environment (Recommended)
```bash
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Backend Dependencies
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

*Key Packages Installed:*
- `fastapi`, `uvicorn[standard]`, `pydantic` (API framework)
- `scikit-learn`, `numpy`, `scipy` (ML risk & mathematical algorithms)
- `groq` (Groq Cloud LLM client for clinical intake)
- `pytesseract`, `pillow` (OCR image processing)
- `python-dotenv`, `python-multipart` (Configuration & file uploads)

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
# Windows
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```
Edit `.env` and configure your API keys:
```env
# AI Clinical Intake Provider (Groq Cloud API)
# Register for a key at https://console.groq.com/keys
GROQ_API_KEY=gsk_your_actual_groq_api_key_here

# Database path (relative to backend or absolute)
DATABASE_PATH=medikiosk.db

# Host and Port settings
HOST=127.0.0.1
PORT=8000
```
> [!NOTE]
> If `GROQ_API_KEY` is omitted, the application uses an internal mock placeholder for local offline testing.

### Step 5: Database Initialization
The database initializes automatically on backend startup. To pre-seed tables and verify integrity:
```bash
python -c "import database; database.init_db(); print('Database tables verified!')"
```

---

## 4. Frontend Setup & Configuration

### Step 1: Navigate to Frontend Directory
```bash
cd ../Frontend
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
# Windows
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```
Default configuration:
```env
VITE_API_BASE=http://127.0.0.1:8000
```

### Step 4: Verify Frontend Build
Compile the production bundle to ensure zero syntax or bundling errors:
```bash
npm run build
```
Output bundle will be generated in `Frontend/dist/`.

---

## 5. Starting the Integrated Application

### Terminal 1: Launch FastAPI Backend
From the `backend/` directory:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend verification:*
- OpenAPI Interactive Documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/staff/hospitals`

### Terminal 2: Launch React + Vite Frontend
From the `Frontend/` directory:
```bash
npm run dev
```
*Frontend verification:*
- Web Application URL: `http://localhost:5173`

---

## 6. Accessing Portals & Default Demonstration Credentials

The application comes pre-seeded with 3 demonstration hospitals and default healthcare staff accounts:

### Healthcare Staff Accounts (Password: `password123`)
1. **MediKiosk General Hospital:**
   - Email: `staff@medikiosk.com`
   - Facility ID: `hosp-medikiosk`
2. **Apollo Clinic & Tertiary Care:**
   - Email: `staff@apollo.com`
   - Facility ID: `hosp-apollo`
3. **City Diagnostics & Specialty:**
   - Email: `staff@city.com`
   - Facility ID: `hosp-city`

### Doctor Portal
- Select Doctor from the doctor selector list on the Doctor Portal navigation bar (e.g. `Dr. Rajesh Gupta - Cardiology` or `Dr. Priya Sharma - General Medicine`).

---

## 7. Running the Automated Test Suites

From the `backend/` directory:

```bash
# 1. Run Baseline Regressions (10 tests)
python test_new_features.py

# 2. Run Patient Care Backend Capabilities (42 tests)
python test_patient_care_backend.py

# 3. Run Staff Dashboard Integration Contracts (12 tests)
python test_phase3_staff_dashboard.py

# 4. Run Unified Patient Data Dossier (28 tests)
python test_phase4_patient_data_integration.py

# 5. Run Master Comprehensive Validation Suite (38 tests)
python -m unittest test_phase5_comprehensive_validation.py

# 6. Run Database Backup and Restore Verification
python test_backup_restore.py
```
*Total verification:* **130 out of 130 tests pass with a 100% pass rate.**

---

## 8. Troubleshooting & Common Questions

### Q: Why do I see a warning about `model_gradient_boosting.pkl`?
> [!NOTE]
> Python 3.13 introduced Cython loss function changes that affect older sklearn pickled models. The system automatically switches to the `RandomForestClassifier` or activates the heuristic fallback engine (`_fallback_prediction`), ensuring zero downtime or unhandled 500 exceptions.

### Q: Why does bed discharge return HTTP 400?
> [!IMPORTANT]
> The clinical safety gate blocks bed discharge for any patient whose Subbe MEWS score is >= 3. To discharge a clinically unstable patient (e.g., for palliative care or supervised transfer), staff must check the **Clinical Override** box (`?override=true`).

### Q: How do I resolve `database is locked` errors in SQLite?
The database is configured with Write-Ahead Logging (`PRAGMA journal_mode = wal`) and a 10,000ms busy timeout. If external tools (e.g., SQLite Browser) lock the file, ensure they commit and close active transactions.
