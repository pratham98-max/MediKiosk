# MEDIKIOSK PRODUCTION DEPLOYMENT GUIDE

**System:** MediKiosk Healthcare Platform  
**Target Environment:** Local Hospital On-Premises Server or Dedicated VPC Host  
**Architecture:** React 18 SPA (Vite) + FastAPI Backend + SQLite 3 (WAL)  
**Document Version:** 1.0  
**Date:** November 2026

---

## 1. Production Architecture Overview

```
                                      [ Clinical Clients / Kiosks ]
                                                    │
                                                    ▼
                                          HTTPS (Port 443)
                                                    │
                                      ┌──────────────────────────┐
                                      │   Reverse Proxy (Nginx)  │
                                      │   SSL/TLS Termination    │
                                      └─────────────┬────────────┘
                                                    │
                        ┌───────────────────────────┴───────────────────────────┐
                        │                                                       │
                 Static Asset Paths (/assets/*)                           API Calls (/api/*)
                        ▼                                                       ▼
            ┌──────────────────────┐                                ┌──────────────────────┐
            │   Static Web Root    │                                │  Uvicorn Application │
            │  (Frontend/dist)     │                                │  Worker Pool (127.0.0.1:8000)
            └──────────────────────┘                                └──────────┬───────────┘
                                                                               │
                                                                               ▼
                                                                    ┌──────────────────────┐
                                                                    │ SQLite 3 (WAL Mode)  │
                                                                    │ (backend/medikiosk.db)
                                                                    └──────────────────────┘
```

---

## 2. Server Prerequisites

### 2.1 Software Specifications
| Component | Minimum Version | Recommended Version |
| :--- | :---: | :---: |
| **Operating System** | Ubuntu 22.04 LTS / Windows Server 2022 | Ubuntu 24.04 LTS / Windows Server 2022 |
| **Python** | 3.10 | 3.11 / 3.12 / 3.13 |
| **Node.js** | 18.0 LTS | 20.x or 22.x LTS |
| **Nginx** (Linux) | 1.18+ | 1.24+ |
| **SQLite** | 3.35+ (with WAL support) | 3.42+ |
| **Tesseract OCR** | 4.0+ | 5.3+ |

---

## 3. Step-by-Step Deployment Procedure

### Step 1: Clone Repository and Establish Structure
```bash
git clone https://github.com/hospital/medikiosk.git /opt/medikiosk
cd /opt/medikiosk
```

### Step 2: Configure Environment Files

#### Backend Environment (`backend/.env`)
```ini
# Production Environment
ENVIRONMENT=production
DEMO_MODE=false

# LLM API Key (Groq Cloud)
GROQ_API_KEY=gsk_your_production_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Database Configuration
DATABASE_PATH=/var/lib/medikiosk/medikiosk.db

# Server Binding
HOST=127.0.0.1
PORT=8000

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://medikiosk.hospital.org,https://kiosk.hospital.org
```

#### Frontend Environment (`Frontend/.env.production`)
```ini
VITE_API_BASE=https://medikiosk.hospital.org/api
```

---

### Step 3: Install Backend Dependencies
```bash
cd /opt/medikiosk/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

### Step 4: Initialize and Verify Database
```bash
cd /opt/medikiosk/backend
source .venv/bin/activate

# Execute migrations and seeding
python seed_dataset.py

# Verify WAL mode and integrity
python -c "import sqlite3; conn = sqlite3.connect('medikiosk.db'); print('Integrity:', conn.execute('PRAGMA integrity_check;').fetchall()); print('Journal Mode:', conn.execute('PRAGMA journal_mode;').fetchall()); conn.close()"
```

---

### Step 5: Build Frontend Production Assets
```bash
cd /opt/medikiosk/Frontend
npm ci
npm run build
```
The compiled static assets will be located in `/opt/medikiosk/Frontend/dist`.

---

## 4. Process Management & Daemonization

### 4.1 Linux Service Setup (systemd)
Create `/etc/systemd/system/medikiosk-backend.service`:
```ini
[Unit]
Description=MediKiosk FastAPI Production Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/medikiosk/backend
Environment="PATH=/opt/medikiosk/backend/.venv/bin"
ExecStart=/opt/medikiosk/backend/.venv/bin/uvicorn app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 2 \
    --limit-concurrency 100 \
    --timeout-keep-alive 65 \
    --no-access-log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable medikiosk-backend
sudo systemctl start medikiosk-backend
sudo systemctl status medikiosk-backend
```

### 4.2 Windows Service Setup (NSSM)
If deploying on Windows Server:
```powershell
nssm install MediKioskBackend "C:\MediKiosk\backend\.venv\Scripts\uvicorn.exe" "app.main:app --host 127.0.0.1 --port 8000 --workers 2"
nssm set MediKioskBackend AppDirectory "C:\MediKiosk\backend"
nssm set MediKioskBackend Start SERVICE_AUTO_START
nssm start MediKioskBackend
```

---

## 5. Reverse Proxy Configuration (Nginx)

Create `/etc/nginx/sites-available/medikiosk.conf`:
```nginx
server {
    listen 80;
    server_name medikiosk.hospital.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name medikiosk.hospital.org;

    ssl_certificate /etc/ssl/certs/medikiosk_hospital_org.crt;
    ssl_certificate_key /etc/ssl/private/medikiosk_hospital_org.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend Static Files
    location / {
        root /opt/medikiosk/Frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }

    # Uploads Storage
    location /uploads/ {
        alias /opt/medikiosk/backend/uploads/;
        internal; # Prevent direct listing
    }
}
```

Enable site and test Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/medikiosk.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Automated Backup Strategy

Establish a daily cron job to run the verified backup engine:
```bash
# Open crontab
sudo crontab -e

# Add daily 2:00 AM snapshot
0 2 * * * cd /opt/medikiosk/backend && /opt/medikiosk/backend/.venv/bin/python test_backup_restore.py >> /var/log/medikiosk_backup.log 2>&1
```

---

## 7. Health Checks and Monitoring

- **API Health Check**: `GET https://medikiosk.hospital.org/api/hospitals` (returns HTTP 200 with list of 3 hospitals).
- **Backend Process Status**: `sudo systemctl status medikiosk-backend`
- **Uptime Monitoring**: Configure hospital monitoring agent (e.g., Datadog, Prometheus node_exporter) to probe `/staff/dashboard?hospital_id=hosp-medikiosk` every 60 seconds.

