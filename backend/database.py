import os
import sqlite3
import json
import hashlib
import uuid
import secrets
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple


# =========================
# PASSWORD SECURITY
# =========================

def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    combined = (password + salt).encode('utf-8')
    pwd_hash = hashlib.sha256(combined).hexdigest()
    return pwd_hash, salt


def verify_password(password: str, pwd_hash: str, salt: str) -> bool:
    expected_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(expected_hash, pwd_hash)


# =========================
# DATABASE CONNECTION
# =========================

DB_FILE = os.environ.get("MEDIKIOSK_DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "medikiosk.db"))

def get_connection():

    target = "medikiosk.db" if os.path.exists("medikiosk.db") else DB_FILE

    connection = sqlite3.connect(target, timeout=10.0)

    connection.execute("PRAGMA journal_mode=WAL;")

    connection.row_factory = sqlite3.Row

    return connection



# =========================
# CREATE TABLES
# =========================

def create_tables():

    connection = get_connection()

    cursor = connection.cursor()


    # -------------------------
    # PATIENTS TABLE
    # -------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patients (

            patient_id TEXT PRIMARY KEY,

            full_name TEXT NOT NULL,

            email TEXT UNIQUE,

            phone TEXT,

            age INTEGER,

            gender TEXT,

            password_hash TEXT NOT NULL,

            salt TEXT NOT NULL,

            created_at TEXT NOT NULL

        )
    """)


    # -------------------------
    # PATIENT INTERVIEW SESSION
    # -------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (

            session_id TEXT PRIMARY KEY,

            patient_id TEXT,

            language TEXT NOT NULL,

            created_at TEXT NOT NULL,

            FOREIGN KEY (patient_id)
            REFERENCES patients(patient_id)

        )
    """)

    # Check if patient_id, doctor_name, department, otp_code, status, verified_at, final_report columns exist in sessions
    cursor.execute("PRAGMA table_info(sessions)")
    columns = [col[1] for col in cursor.fetchall()]
    if "patient_id" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN patient_id TEXT")
    if "doctor_name" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN doctor_name TEXT")
    if "department" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN department TEXT")
    if "otp_code" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN otp_code TEXT")
    if "status" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN status TEXT DEFAULT 'in_progress'")
    if "verified_at" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN verified_at TEXT")
    if "final_report" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN final_report TEXT")
    if "doctor_notes" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN doctor_notes TEXT")
    if "hospital_id" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN hospital_id TEXT DEFAULT 'hosp-medikiosk'")
    if "red_flag" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN red_flag INTEGER DEFAULT 0")
    if "red_flag_reason" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN red_flag_reason TEXT")
    if "red_flag_acknowledged" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN red_flag_acknowledged INTEGER DEFAULT 0")
    if "red_flag_created_at" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN red_flag_created_at TEXT")
    if "red_flag_acknowledged_at" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN red_flag_acknowledged_at TEXT")
    if "doctor_edited_report" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN doctor_edited_report TEXT")
    if "emr_stored" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN emr_stored INTEGER DEFAULT 0")

    # -------------------------
    # DOCTORS TABLE
    # -------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS doctors (
            doctor_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            department TEXT NOT NULL,
            specialty TEXT NOT NULL,
            room TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)


    # -------------------------
    # CHAT MESSAGES
    # -------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            session_id TEXT NOT NULL,

            sender TEXT NOT NULL,

            message TEXT NOT NULL,

            created_at TEXT NOT NULL,

            FOREIGN KEY (session_id)
            REFERENCES sessions(session_id)

        )
    """)


    # -------------------------
    # UPLOADED DOCUMENTS
    # -------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            session_id TEXT NOT NULL,

            filename TEXT NOT NULL,

            extracted_text TEXT NOT NULL,

            created_at TEXT NOT NULL,

            FOREIGN KEY (session_id)
            REFERENCES sessions(session_id)

        )
    """)


    # -------------------------
    # CONTRADICTIONS
    # -------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contradictions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            session_id TEXT NOT NULL,

            category TEXT NOT NULL,

            patient_statement TEXT NOT NULL,

            document_evidence TEXT NOT NULL,

            clarification_question TEXT NOT NULL,

            options TEXT,

            patient_answer TEXT,

            status TEXT NOT NULL DEFAULT 'pending',

            resolution_summary TEXT,

            created_at TEXT NOT NULL,

            resolved_at TEXT,

            FOREIGN KEY (session_id)
            REFERENCES sessions(session_id)

        )
    """)

    # -------------------------
    # HOSPITALS TABLE
    # -------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hospitals (
            hospital_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            tagline TEXT,
            address TEXT,
            type TEXT NOT NULL, -- 'current' | 'mock_apollo' | 'mock_city'
            is_external INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)

    # -------------------------
    # HEALTHCARE STAFF TABLE
    # -------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS healthcare_staff (
            staff_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            hospital_id TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Nurse / Coordinator',
            shift TEXT DEFAULT 'General',
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
        )
    """)

    # -------------------------
    # HOSPITAL EMR RECORDS TABLE (Current + Mock External)
    # -------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emr_records (
            record_id TEXT PRIMARY KEY,
            hospital_id TEXT NOT NULL,
            hospital_name TEXT NOT NULL,
            patient_id TEXT,
            patient_name TEXT NOT NULL,
            session_id TEXT,
            visit_date TEXT NOT NULL,
            diagnosis TEXT NOT NULL,
            medications TEXT,
            lab_results TEXT,
            notes TEXT,
            timeline_event TEXT,
            confirmed_by_doctor TEXT,
            confirmed_at TEXT,
            is_mock INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)

    # -------------------------
    # EXTERNAL EMR CONSENTS TABLE
    # -------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS external_emr_consents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            consented INTEGER DEFAULT 0,
            consented_at TEXT NOT NULL,
            external_records_json TEXT
        )
    """)

    connection.commit()

    connection.close()


# =========================
# CREATE NEW SESSION
# =========================

def save_session(session_id, language, patient_id=None, doctor_name=None, department=None, hospital_id=None):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO sessions (

            session_id,
            patient_id,
            doctor_name,
            department,
            language,
            hospital_id,
            created_at

        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            session_id,
            patient_id,
            doctor_name,
            department,
            language,
            hospital_id or "hosp-medikiosk",
            datetime.now().isoformat()
        )
    )

    connection.commit()

    connection.close()


# =========================
# SAVE CHAT MESSAGE
# =========================

def save_message(session_id, sender, message):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO messages (

            session_id,
            sender,
            message,
            created_at

        )
        VALUES (?, ?, ?, ?)
        """,
        (
            session_id,
            sender,
            message,
            datetime.now().isoformat()
        )
    )

    connection.commit()

    connection.close()


# =========================
# GET SESSION MESSAGES
# =========================

def get_messages(session_id):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            sender,
            message,
            created_at

        FROM messages

        WHERE session_id = ?

        ORDER BY id ASC
        """,
        (session_id,)
    )

    rows = cursor.fetchall()

    connection.close()

    return [
        {
            "sender": row["sender"],
            "message": row["message"],
            "created_at": row["created_at"]
        }

        for row in rows
    ]


# =========================
# SAVE OCR DOCUMENT
# =========================

def save_document(
    session_id,
    filename,
    extracted_text
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO documents (

            session_id,
            filename,
            extracted_text,
            created_at

        )
        VALUES (?, ?, ?, ?)
        """,
        (
            session_id,
            filename,
            extracted_text,
            datetime.now().isoformat()
        )
    )

    connection.commit()

    connection.close()


# =========================
# GET SESSION DOCUMENTS
# =========================

def get_documents(session_id):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            id,
            filename,
            extracted_text,
            created_at

        FROM documents

        WHERE session_id = ?

        ORDER BY id ASC
        """,
        (session_id,)
    )

    rows = cursor.fetchall()

    connection.close()

    return [
        {
            "id": row["id"],
            "filename": row["filename"],
            "extracted_text": row["extracted_text"],
            "created_at": row["created_at"]
        }

        for row in rows
    ]


# =========================
# SAVE CONTRADICTION
# =========================

def save_contradiction(
    session_id,
    category,
    patient_statement,
    document_evidence,
    clarification_question,
    options
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO contradictions (

            session_id,
            category,
            patient_statement,
            document_evidence,
            clarification_question,
            options,
            status,
            created_at

        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            session_id,
            category,
            patient_statement,
            document_evidence,
            clarification_question,
            json.dumps(options),
            "pending",
            datetime.now().isoformat()
        )
    )

    contradiction_id = cursor.lastrowid

    connection.commit()

    connection.close()

    return contradiction_id


# =========================
# DELETE OLD CONTRADICTIONS
# =========================

def delete_contradictions(session_id):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM contradictions

        WHERE session_id = ?
        """,
        (session_id,)
    )

    connection.commit()

    connection.close()


# =========================
# GET NEXT PENDING
# CONTRADICTION
# =========================

def get_pending_contradiction(session_id):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *

        FROM contradictions

        WHERE session_id = ?
        AND status = 'pending'

        ORDER BY id ASC

        LIMIT 1
        """,
        (session_id,)
    )

    row = cursor.fetchone()

    connection.close()


    if row is None:

        return None


    return {
        "id": row["id"],

        "category":
            row["category"],

        "patient_statement":
            row["patient_statement"],

        "document_evidence":
            row["document_evidence"],

        "clarification_question":
            row["clarification_question"],

        "options":
            json.loads(row["options"])
            if row["options"]
            else [],

        "status":
            row["status"]
    }


# =========================
# RESOLVE CONTRADICTION
# =========================

def resolve_contradiction(
    contradiction_id,
    patient_answer,
    resolution_summary,
    status="resolved"
):

    connection = get_connection()

    cursor = connection.cursor()


    # -------------------------
    # SET RESOLUTION TIME ONLY
    # WHEN ACTUALLY RESOLVED
    # -------------------------

    resolved_at = None

    if status == "resolved":

        resolved_at = (
            datetime.now().isoformat()
        )


    cursor.execute(
        """
        UPDATE contradictions

        SET

            patient_answer = ?,

            resolution_summary = ?,

            status = ?,

            resolved_at = ?

        WHERE id = ?
        """,
        (
            patient_answer,
            resolution_summary,
            status,
            resolved_at,
            contradiction_id
        )
    )

    connection.commit()

    connection.close()


# =========================
# GET ALL CONTRADICTIONS
# =========================

def get_contradictions(session_id):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *

        FROM contradictions

        WHERE session_id = ?

        ORDER BY id ASC
        """,
        (session_id,)
    )

    rows = cursor.fetchall()

    connection.close()


    contradictions = []


    for row in rows:

        contradictions.append(
            {
                "id": row["id"],

                "category":
                    row["category"],

                "patient_statement":
                    row["patient_statement"],

                "document_evidence":
                    row["document_evidence"],

                "clarification_question":
                    row["clarification_question"],

                "options":
                    json.loads(row["options"])
                    if row["options"]
                    else [],

                "patient_answer":
                    row["patient_answer"],

                "status":
                    row["status"],

                "resolution_summary":
                    row["resolution_summary"],

                "created_at":
                    row["created_at"],

                "resolved_at":
                    row["resolved_at"]
            }
        )


    return contradictions


# =========================
# CHECK IF SESSION EXISTS
# =========================

def session_exists(session_id):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT session_id

        FROM sessions

        WHERE session_id = ?
        """,
        (session_id,)
    )

    session = cursor.fetchone()

    connection.close()

    return session is not None


# =========================
# PATIENT MANAGEMENT & AUTH
# =========================

def register_patient(full_name: str, email: str, phone: str = "", age: int = None, gender: str = "", password: str = ""):
    connection = get_connection()
    cursor = connection.cursor()

    # Check if email or phone already registered
    if email:
        cursor.execute("SELECT patient_id FROM patients WHERE LOWER(email) = LOWER(?)", (email.strip(),))
        if cursor.fetchone():
            connection.close()
            return {"success": False, "error": "Email is already registered. Please sign in."}

    if phone:
        cursor.execute("SELECT patient_id FROM patients WHERE phone = ?", (phone.strip(),))
        if cursor.fetchone():
            connection.close()
            return {"success": False, "error": "Phone number is already registered. Please sign in."}

    patient_id = f"PAT-{uuid.uuid4().hex[:8].upper()}"
    pwd_hash, salt = hash_password(password)

    cursor.execute(
        """
        INSERT INTO patients (
            patient_id,
            full_name,
            email,
            phone,
            age,
            gender,
            password_hash,
            salt,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            patient_id,
            full_name.strip(),
            email.strip().lower() if email else None,
            phone.strip() if phone else None,
            age,
            gender,
            pwd_hash,
            salt,
            datetime.now().isoformat()
        )
    )

    connection.commit()
    connection.close()

    return {
        "success": True,
        "patient": {
            "patient_id": patient_id,
            "full_name": full_name.strip(),
            "email": email.strip().lower() if email else "",
            "phone": phone.strip() if phone else "",
            "age": age,
            "gender": gender
        }
    }


def authenticate_patient(identifier: str, password: str):
    connection = get_connection()
    cursor = connection.cursor()

    cleaned = identifier.strip()
    cursor.execute(
        """
        SELECT patient_id, full_name, email, phone, age, gender, password_hash, salt
        FROM patients
        WHERE LOWER(email) = LOWER(?) OR phone = ?
        """,
        (cleaned, cleaned)
    )
    row = cursor.fetchone()
    connection.close()

    if not row:
        return {"success": False, "error": "Invalid email/phone or password"}

    if not verify_password(password, row["password_hash"], row["salt"]):
        return {"success": False, "error": "Invalid email/phone or password"}

    return {
        "success": True,
        "patient": {
            "patient_id": row["patient_id"],
            "full_name": row["full_name"],
            "email": row["email"] or "",
            "phone": row["phone"] or "",
            "age": row["age"],
            "gender": row["gender"]
        }
    }


def get_patient_by_id(patient_id: str):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT patient_id, full_name, email, phone, age, gender, created_at
        FROM patients
        WHERE patient_id = ?
        """,
        (patient_id,)
    )
    row = cursor.fetchone()
    connection.close()

    if not row:
        return None

    return {
        "patient_id": row["patient_id"],
        "full_name": row["full_name"],
        "email": row["email"] or "",
        "phone": row["phone"] or "",
        "age": row["age"],
        "gender": row["gender"],
        "created_at": row["created_at"]
    }


def get_patient_by_phone(phone: str):
    if not phone:
        return None
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT patient_id, full_name, email, phone, age, gender, created_at
        FROM patients
        WHERE phone = ?
        """,
        (phone.strip(),)
    )
    row = cursor.fetchone()
    connection.close()
    if not row:
        return None
    return {
        "patient_id": row["patient_id"],
        "full_name": row["full_name"],
        "email": row["email"] or "",
        "phone": row["phone"] or "",
        "age": row["age"],
        "gender": row["gender"],
        "created_at": row["created_at"]
    }


def get_patient_sessions(patient_id: str):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT session_id, language, doctor_name, department, created_at, status, doctor_notes, final_report
        FROM sessions
        WHERE patient_id = ?
        ORDER BY created_at DESC
        """,
        (patient_id,)
    )
    rows = cursor.fetchall()
    connection.close()

    return [
        {
            "session_id": r["session_id"],
            "language": r["language"],
            "doctor_name": r["doctor_name"] or "General Consultation",
            "department": r["department"] or "General Medicine",
            "created_at": r["created_at"],
            "status": r["status"] or "in_progress",
            "doctor_notes": r["doctor_notes"] or "",
            "final_report": r["final_report"] or "",
        }
        for r in rows
    ]


# =========================
# DOCTOR MANAGEMENT & SEEDING
# =========================

DEFAULT_HOSPITAL_DOCTORS = [
    {
        "doctor_id": "doc-1",
        "name": "Dr. Rajesh Gupta",
        "email": "dr.rajesh@hospital.com",
        "department": "Cardiology",
        "specialty": "Interventional Cardiology & Heart Health",
        "room": "OPD Room 102",
        "password": "doctor123"
    },
    {
        "doctor_id": "doc-2",
        "name": "Dr. Priya Sharma",
        "email": "dr.priya@hospital.com",
        "department": "General Medicine",
        "specialty": "Internal Medicine & General Physician",
        "room": "OPD Room 105",
        "password": "doctor123"
    },
    {
        "doctor_id": "doc-3",
        "name": "Dr. Arvind Patel",
        "email": "dr.arvind@hospital.com",
        "department": "Orthopedics",
        "specialty": "Joints, Bones & Sports Injury",
        "room": "OPD Room 204",
        "password": "doctor123"
    },
    {
        "doctor_id": "doc-4",
        "name": "Dr. Sunita Kulkarni",
        "email": "dr.sunita@hospital.com",
        "department": "Pediatrics",
        "specialty": "Child Health & Adolescent Care",
        "room": "OPD Room 210",
        "password": "doctor123"
    },
    {
        "doctor_id": "doc-5",
        "name": "Dr. Manoj Verma",
        "email": "dr.manoj@hospital.com",
        "department": "ENT (Ear, Nose, Throat)",
        "specialty": "Head & Neck Specialist",
        "room": "OPD Room 301",
        "password": "doctor123"
    },
    {
        "doctor_id": "doc-6",
        "name": "Dr. Ananya Nair",
        "email": "dr.ananya@hospital.com",
        "department": "Dermatology",
        "specialty": "Skin, Hair & Allergy Specialist",
        "room": "OPD Room 308",
        "password": "doctor123"
    }
]


def seed_default_doctors():
    connection = get_connection()
    cursor = connection.cursor()

    for doc in DEFAULT_HOSPITAL_DOCTORS:
        cursor.execute("SELECT doctor_id FROM doctors WHERE email = ?", (doc["email"],))
        if not cursor.fetchone():
            pwd_hash, salt = hash_password(doc["password"])
            cursor.execute(
                """
                INSERT INTO doctors (
                    doctor_id, name, email, department, specialty, room, password_hash, salt, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    doc["doctor_id"],
                    doc["name"],
                    doc["email"].lower(),
                    doc["department"],
                    doc["specialty"],
                    doc["room"],
                    pwd_hash,
                    salt,
                    datetime.now().isoformat()
                )
            )

    connection.commit()
    connection.close()


def authenticate_doctor(email_or_name: str, password: str):
    cleaned = email_or_name.strip().lower()
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT doctor_id, name, email, department, specialty, room, password_hash, salt
        FROM doctors
        WHERE LOWER(email) = ? OR LOWER(name) = ?
        """,
        (cleaned, cleaned)
    )
    row = cursor.fetchone()
    connection.close()

    if not row:
        return {"success": False, "error": "Invalid doctor email or credentials"}

    if not verify_password(password, row["password_hash"], row["salt"]):
        return {"success": False, "error": "Invalid doctor email or credentials"}

    return {
        "success": True,
        "doctor": {
            "doctor_id": row["doctor_id"],
            "name": row["name"],
            "email": row["email"],
            "department": row["department"],
            "specialty": row["specialty"],
            "room": row["room"]
        }
    }


def get_doctor_by_id(doctor_id: str):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT doctor_id, name, email, department, specialty, room
        FROM doctors
        WHERE doctor_id = ?
        """,
        (doctor_id,)
    )
    row = cursor.fetchone()
    connection.close()

    if not row:
        return None

    return {
        "doctor_id": row["doctor_id"],
        "name": row["name"],
        "email": row["email"],
        "department": row["department"],
        "specialty": row["specialty"],
        "room": row["room"]
    }


def list_doctors():
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT doctor_id, name, email, department, specialty, room
        FROM doctors
        ORDER BY department ASC, name ASC
        """
    )
    rows = cursor.fetchall()
    connection.close()
    return [
        {
            "id": r["doctor_id"],
            "name": r["name"],
            "email": r["email"],
            "department": r["department"],
            "specialty": r["specialty"],
            "room": r["room"],
            "available": True
        }
        for r in rows
    ]


# =========================
# OPD SESSION & OTP HANDOFF
# =========================

def generate_session_otp(session_id: str, final_report_text: str = None) -> str:
    """Generates a unique 6-digit numeric OTP code for the patient to share with the doctor."""
    otp = f"{secrets.randbelow(900000) + 100000}"  # 6 digit code (100000 - 999999)
    connection = get_connection()
    cursor = connection.cursor()
    if final_report_text:
        cursor.execute(
            """
            UPDATE sessions
            SET otp_code = ?, status = 'ready_for_opd', final_report = ?
            WHERE session_id = ?
            """,
            (otp, final_report_text, session_id)
        )
    else:
        cursor.execute(
            """
            UPDATE sessions
            SET otp_code = ?, status = 'ready_for_opd'
            WHERE session_id = ?
            """,
            (otp, session_id)
        )
    connection.commit()
    connection.close()
    return otp


def get_session_by_id(session_id: str):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT s.session_id, s.patient_id, s.language, s.doctor_name, s.department,
               s.created_at, s.otp_code, s.status, s.verified_at, s.final_report, s.doctor_notes,
               s.hospital_id, s.red_flag, s.red_flag_reason, s.red_flag_acknowledged,
               s.red_flag_created_at, s.red_flag_acknowledged_at, s.doctor_edited_report, s.emr_stored,
               p.full_name as patient_name, p.age, p.gender, p.phone, p.email,
               h.name as hospital_name
        FROM sessions s
        LEFT JOIN patients p ON s.patient_id = p.patient_id
        LEFT JOIN hospitals h ON s.hospital_id = h.hospital_id
        WHERE s.session_id = ?
        """,
        (session_id,)
    )
    row = cursor.fetchone()
    connection.close()
    if not row:
        return None
    return dict(row)


def get_opd_queue(doctor_name: str = None, department: str = None):
    """
    Returns list of patients whose intake is completed and ready for OPD,
    or currently in consultation, sorted by created_at.
    """
    connection = get_connection()
    cursor = connection.cursor()

    query = """
        SELECT s.session_id, s.patient_id, s.language, s.doctor_name, s.department,
               s.created_at, s.otp_code, s.status, s.verified_at, s.final_report,
               p.full_name as patient_name, p.age, p.gender, p.phone, p.email
        FROM sessions s
        LEFT JOIN patients p ON s.patient_id = p.patient_id
        WHERE s.status IN ('ready_for_opd', 'in_consultation')
           OR s.otp_code IS NOT NULL
        ORDER BY 
            CASE s.status
                WHEN 'in_consultation' THEN 1
                WHEN 'ready_for_opd' THEN 2
                ELSE 3
            END,
            s.created_at DESC
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    connection.close()

    result = []
    for r in rows:
        item = dict(r)
        # Ensure friendly defaults
        if not item.get("patient_name"):
            item["patient_name"] = "Registered Patient"
        result.append(item)
    return result


def verify_patient_by_otp(doctor_id: str, otp_code: str, session_id: str = None):
    """
    Verifies 6-digit OTP code or session ID + OTP provided by patient sitting in front of doctor.
    Unlocks patient report and updates status to 'in_consultation'.
    """
    cleaned_otp = otp_code.strip()
    connection = get_connection()
    cursor = connection.cursor()

    if session_id:
        cursor.execute(
            """
            SELECT session_id, patient_id, doctor_name, department, final_report, status, otp_code
            FROM sessions
            WHERE session_id = ? AND otp_code = ?
            """,
            (session_id.strip(), cleaned_otp)
        )
    else:
        cursor.execute(
            """
            SELECT session_id, patient_id, doctor_name, department, final_report, status, otp_code
            FROM sessions
            WHERE otp_code = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (cleaned_otp,)
        )

    row = cursor.fetchone()
    if not row:
        connection.close()
        return {"success": False, "error": "Invalid or expired One-Time Code (OTP). Please check patient's screen."}

    matched_session_id = row["session_id"]
    now_iso = datetime.now().isoformat()

    # Mark as in_consultation
    cursor.execute(
        """
        UPDATE sessions
        SET status = 'in_consultation', verified_at = ?
        WHERE session_id = ?
        """,
        (now_iso, matched_session_id)
    )
    connection.commit()
    connection.close()

    # Retrieve full patient package for doctor screen
    session_details = get_session_by_id(matched_session_id)
    chat_messages = get_messages(matched_session_id)
    documents = get_documents(matched_session_id)
    contradictions = get_contradictions(matched_session_id)

    return {
        "success": True,
        "session": session_details,
        "messages": chat_messages,
        "documents": documents,
        "contradictions": contradictions
    }


def complete_consultation(session_id: str, doctor_notes: str = ""):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        UPDATE sessions
        SET status = 'completed', doctor_notes = ?
        WHERE session_id = ?
        """,
        (doctor_notes, session_id)
    )
    connection.commit()
    connection.close()
    return {"success": True, "session_id": session_id}


def save_doctor_remark(session_id: str, doctor_notes: str):
    """Save doctor notes/remarks without marking session complete."""
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        UPDATE sessions
        SET doctor_notes = ?
        WHERE session_id = ?
        """,
        (doctor_notes, session_id)
    )
    connection.commit()
    connection.close()
    return {"success": True, "session_id": session_id}


# =============================================================================
# RED-FLAG MANAGEMENT
# =============================================================================

def set_session_red_flag(session_id: str, reason: str = "Urgent clinical symptoms detected during AI intake"):
    """Persists a detected red flag in SQLite."""
    connection = get_connection()
    cursor = connection.cursor()
    now_iso = datetime.now().isoformat()
    cursor.execute(
        """
        UPDATE sessions
        SET red_flag = 1,
            red_flag_reason = ?,
            red_flag_created_at = COALESCE(red_flag_created_at, ?)
        WHERE session_id = ?
        """,
        (reason, now_iso, session_id)
    )
    connection.commit()
    connection.close()
    return {"success": True, "session_id": session_id, "red_flag": 1}


def acknowledge_red_flag(session_id: str, staff_id: str = None):
    """Acknowledges an alert without clearing the clinical red-flag record."""
    connection = get_connection()
    cursor = connection.cursor()
    now_iso = datetime.now().isoformat()
    cursor.execute(
        """
        UPDATE sessions
        SET red_flag_acknowledged = 1,
            red_flag_acknowledged_at = ?
        WHERE session_id = ?
        """,
        (now_iso, session_id)
    )
    connection.commit()
    connection.close()
    return {"success": True, "session_id": session_id, "acknowledged_at": now_iso}


# =============================================================================
# HOSPITALS & HEALTHCARE STAFF
# =============================================================================

DEFAULT_HOSPITALS = [
    {
        "hospital_id": "hosp-medikiosk",
        "name": "MediKiosk General Hospital",
        "tagline": "Main Campus • Active Clinical Kiosk",
        "address": "Block 4, Healthcare City, New Delhi - 110001",
        "type": "current",
        "is_external": 0
    },
    {
        "hospital_id": "hosp-apollo",
        "name": "Apollo Clinic",
        "tagline": "Fictional External EMR Network",
        "address": "Sector 14, Apollo Health Enclave, Gurugram",
        "type": "mock_apollo",
        "is_external": 1
    },
    {
        "hospital_id": "hosp-city",
        "name": "City Diagnostics & Specialty",
        "tagline": "Fictional External Laboratory & Clinic",
        "address": "Plot 82, Metro Medical Corridor, Noida",
        "type": "mock_city",
        "is_external": 1
    }
]

DEFAULT_STAFF = [
    {
        "staff_id": "staff-mk-1",
        "name": "Nurse Sunita Rawat",
        "email": "staff@medikiosk.com",
        "hospital_id": "hosp-medikiosk",
        "role": "Chief Triage Nurse / Desk Coordinator",
        "shift": "Morning (08:00 - 16:00)",
        "password": "staff123"
    },
    {
        "staff_id": "staff-apollo-1",
        "name": "Staff Coord. Rajiv Sen",
        "email": "staff@apollo.com",
        "hospital_id": "hosp-apollo",
        "role": "OPD Coordinator / Records Liaison",
        "shift": "Regular",
        "password": "staff123"
    },
    {
        "staff_id": "staff-city-1",
        "name": "Lab Coord. Neha Deshmukh",
        "email": "staff@city.com",
        "hospital_id": "hosp-city",
        "role": "Triage & Diagnostics Staff",
        "shift": "Day Shift",
        "password": "staff123"
    }
]

# Fictional external historical patient records for Apollo Clinic and City Diagnostics
SAMPLE_MOCK_EMR_RECORDS = [
    {
        "record_id": "emr-ap-101",
        "hospital_id": "hosp-apollo",
        "hospital_name": "Apollo Clinic",
        "patient_name": "Ramesh Joshi",
        "visit_date": "2025-03-14",
        "diagnosis": "Essential Hypertension (Stage 2) & Mild Dyslipidemia",
        "medications": "Metoprolol Succinate 50mg OD, Atorvastatin 10mg HS",
        "lab_results": "BP: 154/96 mmHg, Total Cholesterol: 224 mg/dL, LDL: 142 mg/dL",
        "notes": "Patient advised low sodium diet and regular aerobic exercise. Complained of occasional morning occipital headache.",
        "timeline_event": "2025-03 — Hypertension diagnosed, Metoprolol prescribed (Apollo Clinic)"
    },
    {
        "record_id": "emr-city-201",
        "hospital_id": "hosp-city",
        "hospital_name": "City Diagnostics & Specialty",
        "patient_name": "Ramesh Joshi",
        "visit_date": "2026-01-20",
        "diagnosis": "Routine Executive Cardiac Health Checkup",
        "medications": "Continued Metoprolol 50mg",
        "lab_results": "BP: 146/92 mmHg, HbA1c: 5.9%, Serum Creatinine: 0.92 mg/dL, ECG: Normal Sinus Rhythm",
        "notes": "Elevated blood pressure reading observed. Advised follow-up with primary cardiologist.",
        "timeline_event": "2026-01 — Elevated blood pressure reading & normal ECG recorded (City Diagnostics)"
    },
    {
        "record_id": "emr-ap-102",
        "hospital_id": "hosp-apollo",
        "hospital_name": "Apollo Clinic",
        "patient_name": "Sunita Devi",
        "visit_date": "2024-11-08",
        "diagnosis": "Iron Deficiency Anemia & Vitamin D Deficiency",
        "medications": "Ferrous Ascorbate 100mg OD, Cholecalciferol 60,000 IU weekly x 8 weeks",
        "lab_results": "Hb: 9.8 g/dL, Serum Ferritin: 12 ng/mL, 25-OH Vit D: 14 ng/mL",
        "notes": "Presented with general fatigue and palpitations on exertion. No GI bleeding.",
        "timeline_event": "2024-11 — Iron deficiency anemia diagnosed, oral iron started (Apollo Clinic)"
    },
    {
        "record_id": "emr-city-202",
        "hospital_id": "hosp-city",
        "hospital_name": "City Diagnostics & Specialty",
        "patient_name": "Sunita Devi",
        "visit_date": "2025-07-19",
        "diagnosis": "Follow-up Hematology Profile",
        "medications": "Completed iron course",
        "lab_results": "Hb: 12.1 g/dL (Resolved), Serum Ferritin: 45 ng/mL",
        "notes": "Hemoglobin normalized. Patient feels energetic.",
        "timeline_event": "2025-07 — Hemoglobin normalized to 12.1 g/dL (City Diagnostics)"
    },
    {
        "record_id": "emr-ap-103",
        "hospital_id": "hosp-apollo",
        "hospital_name": "Apollo Clinic",
        "patient_name": "Arun Kumar Singh",
        "visit_date": "2024-05-12",
        "diagnosis": "Type 2 Diabetes Mellitus & Primary Osteoarthritis Bilateral Knees",
        "medications": "Metformin 500mg BD after meals, Glimepiride 1mg OD, Paracetamol SOS",
        "lab_results": "Fasting Blood Sugar: 168 mg/dL, HbA1c: 7.8%, Knee X-Ray: Grade 2 OA",
        "notes": "Weight reduction counseling given. Advised knee isometric exercises.",
        "timeline_event": "2024-05 — Type 2 Diabetes & Knee OA diagnosed (Apollo Clinic)"
    },
    {
        "record_id": "emr-city-203",
        "hospital_id": "hosp-city",
        "hospital_name": "City Diagnostics & Specialty",
        "patient_name": "Arun Kumar Singh",
        "visit_date": "2025-10-04",
        "diagnosis": "Diabetic Kidney & Glycemic Review",
        "medications": "Metformin 500mg BD, Glimepiride 1mg OD",
        "lab_results": "HbA1c: 7.2%, Microalbuminuria: Negative, eGFR: 88 mL/min",
        "notes": "Good glycemic control maintained. Advised annual retinal screening.",
        "timeline_event": "2025-10 — HbA1c improved to 7.2%, renal parameters normal (City Diagnostics)"
    },
    {
        "record_id": "emr-ap-104",
        "hospital_id": "hosp-apollo",
        "hospital_name": "Apollo Clinic",
        "patient_name": "Meena Patel",
        "visit_date": "2025-02-18",
        "diagnosis": "Allergic Rhinitis & Mild Intermittent Bronchial Asthma",
        "medications": "Budesonide+Formoterol Inhaler (100/6) PRN, Levocetirizine 5mg HS",
        "lab_results": "Spirometry: FEV1/FVC 78% (Reversible), Total IgE: 320 IU/mL",
        "notes": "Seasonal dust exacerbation. Responded well to inhaled corticosteroid.",
        "timeline_event": "2025-02 — Allergic rhinitis & asthma diagnosis; inhaler prescribed (Apollo Clinic)"
    },
    {
        "record_id": "emr-city-204",
        "hospital_id": "hosp-city",
        "hospital_name": "City Diagnostics & Specialty",
        "patient_name": "Vikram Desai",
        "visit_date": "2025-09-11",
        "diagnosis": "Gastric Hyperacidity & H. Pylori Negative Gastritis",
        "medications": "Pantoprazole 40mg OD before breakfast x 4 weeks, Antacid gel",
        "lab_results": "Stool H. Pylori Antigen: Negative, Ultrasound Abdomen: Fatty Liver Grade 1",
        "notes": "Advised avoidance of late night meals, tea/coffee restriction.",
        "timeline_event": "2025-09 — Grade 1 fatty liver and hyperacidity noted (City Diagnostics)"
    }
]


def seed_default_hospitals_and_staff():
    """Seeds hospitals, 1 staff account per hospital, and mock external EMR records safely."""
    connection = get_connection()
    cursor = connection.cursor()

    # 1. Seed Hospitals
    for hosp in DEFAULT_HOSPITALS:
        cursor.execute("SELECT hospital_id FROM hospitals WHERE hospital_id = ?", (hosp["hospital_id"],))
        if not cursor.fetchone():
            cursor.execute(
                """
                INSERT INTO hospitals (hospital_id, name, tagline, address, type, is_external, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    hosp["hospital_id"],
                    hosp["name"],
                    hosp["tagline"],
                    hosp["address"],
                    hosp["type"],
                    hosp["is_external"],
                    datetime.now().isoformat()
                )
            )

    # 2. Seed Healthcare Staff Accounts
    for staff in DEFAULT_STAFF:
        cursor.execute("SELECT staff_id FROM healthcare_staff WHERE email = ?", (staff["email"],))
        if not cursor.fetchone():
            pwd_hash, salt = hash_password(staff["password"])
            cursor.execute(
                """
                INSERT INTO healthcare_staff (
                    staff_id, name, email, hospital_id, role, shift, password_hash, salt, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    staff["staff_id"],
                    staff["name"],
                    staff["email"].lower(),
                    staff["hospital_id"],
                    staff["role"],
                    staff["shift"],
                    pwd_hash,
                    salt,
                    datetime.now().isoformat()
                )
            )

    # 3. Seed Mock EMR Records (Fictional Apollo & City records)
    for rec in SAMPLE_MOCK_EMR_RECORDS:
        cursor.execute("SELECT record_id FROM emr_records WHERE record_id = ?", (rec["record_id"],))
        if not cursor.fetchone():
            cursor.execute(
                """
                INSERT INTO emr_records (
                    record_id, hospital_id, hospital_name, patient_name, visit_date,
                    diagnosis, medications, lab_results, notes, timeline_event,
                    confirmed_by_doctor, confirmed_at, is_mock, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                """,
                (
                    rec["record_id"],
                    rec["hospital_id"],
                    rec["hospital_name"],
                    rec["patient_name"],
                    rec["visit_date"],
                    rec["diagnosis"],
                    rec["medications"],
                    rec["lab_results"],
                    rec["notes"],
                    rec.get("timeline_event"),
                    "Dr. External Staff",
                    rec["visit_date"],
                    datetime.now().isoformat()
                )
            )

    # 4. Also backfill hospital_id on existing sessions if null
    cursor.execute("UPDATE sessions SET hospital_id = 'hosp-medikiosk' WHERE hospital_id IS NULL OR hospital_id = ''")

    connection.commit()
    connection.close()


def list_hospitals():
    """Returns list of active hospitals."""
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT hospital_id, name, tagline, address, type, is_external FROM hospitals ORDER BY is_external ASC, name ASC")
    rows = cursor.fetchall()
    connection.close()
    return [dict(r) for r in rows]


def authenticate_staff(identifier: str, password: str):
    """Authenticates healthcare staff member and associates them with their hospital."""
    cleaned = identifier.strip().lower()
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT s.staff_id, s.name, s.email, s.hospital_id, s.role, s.shift,
               s.password_hash, s.salt,
               h.name as hospital_name, h.address as hospital_address, h.type as hospital_type
        FROM healthcare_staff s
        LEFT JOIN hospitals h ON s.hospital_id = h.hospital_id
        WHERE LOWER(s.email) = ? OR LOWER(s.name) = ?
        """,
        (cleaned, cleaned)
    )
    row = cursor.fetchone()
    connection.close()

    if not row:
        return {"success": False, "error": "Invalid staff email or credentials"}

    if not verify_password(password, row["password_hash"], row["salt"]):
        return {"success": False, "error": "Incorrect password. Please try again."}

    return {
        "success": True,
        "staff": {
            "staff_id": row["staff_id"],
            "name": row["name"],
            "email": row["email"],
            "role": row["role"],
            "shift": row["shift"],
            "hospital_id": row["hospital_id"],
            "hospital_name": row["hospital_name"],
            "hospital_address": row["hospital_address"],
            "hospital_type": row["hospital_type"],
        }
    }


def get_staff_dashboard(hospital_id: str):
    """
    Returns database-driven patient counts strictly for the specified hospital.
    Counts: total, in_process, pending_clarification, ready_for_doctor, in_consultation, completed, red_flag
    """
    connection = get_connection()
    cursor = connection.cursor()

    # Total patients for this hospital
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE hospital_id = ?", (hospital_id,))
    total = cursor.fetchone()[0]

    # In process (intake conversation active)
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE hospital_id = ? AND status IN ('in_progress', 'continue')", (hospital_id,))
    in_process = cursor.fetchone()[0]

    # Pending clarification
    cursor.execute(
        """
        SELECT COUNT(DISTINCT s.session_id)
        FROM sessions s
        JOIN contradictions c ON s.session_id = c.session_id
        WHERE s.hospital_id = ? AND c.status = 'pending' AND s.status != 'completed'
        """,
        (hospital_id,)
    )
    pending_clarification = cursor.fetchone()[0]

    # Ready for doctor (OTP generated, waiting for consultation)
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE hospital_id = ? AND status = 'ready_for_opd'", (hospital_id,))
    ready_for_doctor = cursor.fetchone()[0]

    # In consultation (currently seeing doctor)
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE hospital_id = ? AND status = 'in_consultation'", (hospital_id,))
    in_consultation = cursor.fetchone()[0]

    # Completed
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE hospital_id = ? AND status = 'completed'", (hospital_id,))
    completed = cursor.fetchone()[0]

    # Red flag cases (total red flag sessions for hospital)
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE hospital_id = ? AND red_flag = 1", (hospital_id,))
    red_flag_cases = cursor.fetchone()[0]

    # Unacknowledged red flags specifically for instant alert banner
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE hospital_id = ? AND red_flag = 1 AND red_flag_acknowledged = 0", (hospital_id,))
    unacknowledged_red_flags = cursor.fetchone()[0]

    connection.close()

    return {
        "success": True,
        "hospital_id": hospital_id,
        "counts": {
            "total": total,
            "in_process": in_process,
            "pending_clarification": pending_clarification,
            "ready_for_doctor": ready_for_doctor,
            "in_consultation": in_consultation,
            "completed": completed,
            "red_flag": red_flag_cases,
            "unacknowledged_red_flags": unacknowledged_red_flags
        }
    }


def get_staff_patients(hospital_id: str, filter_status: str = None):
    """
    Returns patient tracking table data belonging strictly to the staff's hospital.
    Supports filter: 'all', 'in_process', 'pending_clarification', 'ready_for_doctor', 'red_flag', 'in_consultation', 'completed'
    """
    connection = get_connection()
    cursor = connection.cursor()

    query = """
        SELECT s.session_id, s.patient_id, s.language, s.doctor_name, s.department,
               s.created_at, s.otp_code, s.status, s.verified_at, s.final_report, s.doctor_notes,
               s.hospital_id, s.red_flag, s.red_flag_reason, s.red_flag_acknowledged,
               s.red_flag_created_at, s.red_flag_acknowledged_at, s.doctor_edited_report, s.emr_stored,
               p.full_name as patient_name, p.age, p.gender, p.phone, p.email,
               (SELECT COUNT(*) FROM documents d WHERE d.session_id = s.session_id) as document_count,
               (SELECT COUNT(*) FROM contradictions c WHERE c.session_id = s.session_id) as contradiction_count,
               (SELECT COUNT(*) FROM contradictions c WHERE c.session_id = s.session_id AND c.status = 'pending') as pending_contradictions
        FROM sessions s
        LEFT JOIN patients p ON s.patient_id = p.patient_id
        WHERE s.hospital_id = ?
    """
    params = [hospital_id]

    if filter_status:
        flt = filter_status.strip().lower()
        if flt == "red_flag":
            query += " AND s.red_flag = 1"
        elif flt == "in_process":
            query += " AND s.status IN ('in_progress', 'continue')"
        elif flt == "pending_clarification":
            query += " AND (SELECT COUNT(*) FROM contradictions c WHERE c.session_id = s.session_id AND c.status = 'pending') > 0 AND s.status != 'completed'"
        elif flt == "ready_for_doctor":
            query += " AND s.status = 'ready_for_opd'"
        elif flt == "in_consultation":
            query += " AND s.status = 'in_consultation'"
        elif flt == "completed":
            query += " AND s.status = 'completed'"

    query += """
        ORDER BY 
            s.red_flag DESC,
            CASE s.status
                WHEN 'in_consultation' THEN 1
                WHEN 'ready_for_opd' THEN 2
                WHEN 'in_progress' THEN 3
                ELSE 4
            END,
            s.created_at DESC
    """

    cursor.execute(query, params)
    rows = cursor.fetchall()
    connection.close()

    result = []
    for r in rows:
        item = dict(r)
        if not item.get("patient_name"):
            item["patient_name"] = "Registered Patient"
        # Determine human-friendly priority tag
        if item.get("red_flag") == 1:
            item["priority"] = "URGENT - RED FLAG"
        elif item.get("status") == "in_consultation":
            item["priority"] = "In Consultation"
        elif item.get("status") == "ready_for_opd":
            item["priority"] = "Priority OPD"
        else:
            item["priority"] = "Standard"
        result.append(item)

    return result


def get_staff_red_flags(hospital_id: str):
    """Returns active red flag cases for the hospital staff alert list."""
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT s.session_id, s.patient_id, s.language, s.doctor_name, s.department,
               s.created_at, s.otp_code, s.status, s.final_report,
               s.hospital_id, s.red_flag, s.red_flag_reason, s.red_flag_acknowledged,
               s.red_flag_created_at, s.red_flag_acknowledged_at,
               p.full_name as patient_name, p.age, p.gender, p.phone
        FROM sessions s
        LEFT JOIN patients p ON s.patient_id = p.patient_id
        WHERE s.hospital_id = ? AND s.red_flag = 1
        ORDER BY s.red_flag_acknowledged ASC, s.created_at DESC
        """,
        (hospital_id,)
    )
    rows = cursor.fetchall()
    connection.close()
    return [dict(r) for r in rows]


# =============================================================================
# EXTERNAL EMR CONSENT & MOCK HISTORICAL LOOKUP
# =============================================================================

def record_external_consent(session_id: str, consented: bool, external_records_json: str = None):
    """Records patient's explicit consent choice for external hospital history access."""
    connection = get_connection()
    cursor = connection.cursor()
    now_iso = datetime.now().isoformat()
    cursor.execute(
        """
        INSERT INTO external_emr_consents (session_id, consented, consented_at, external_records_json)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
            consented = excluded.consented,
            consented_at = excluded.consented_at,
            external_records_json = excluded.external_records_json
        """,
        (session_id, 1 if consented else 0, now_iso, external_records_json)
    )
    connection.commit()
    connection.close()
    return {"success": True, "session_id": session_id, "consented": consented}


def get_external_consent(session_id: str):
    """Retrieves consent state for a session."""
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT consented, consented_at, external_records_json FROM external_emr_consents WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    connection.close()
    if not row:
        return None
    return dict(row)


def query_mock_external_emrs(patient_name: str, patient_id: str = None):
    """
    Searches the mock EMR database for historical records from Apollo Clinic & City Diagnostics.
    Returns categorized records by hospital along with an aggregated chronological timeline.
    """
    if not patient_name:
        return {"apollo_records": [], "city_records": [], "timeline": []}

    connection = get_connection()
    cursor = connection.cursor()
    search_name = f"%{patient_name.strip().lower()}%"

    cursor.execute(
        """
        SELECT record_id, hospital_id, hospital_name, patient_name, visit_date,
               diagnosis, medications, lab_results, notes, timeline_event
        FROM emr_records
        WHERE is_mock = 1 AND LOWER(patient_name) LIKE ?
        ORDER BY visit_date ASC
        """,
        (search_name,)
    )
    rows = cursor.fetchall()
    connection.close()

    records = [dict(r) for r in rows]

    # If no direct match on name (e.g. newly registered patient demoing), match sample demo records
    if not records:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT record_id, hospital_id, hospital_name, patient_name, visit_date,
                   diagnosis, medications, lab_results, notes, timeline_event
            FROM emr_records
            WHERE is_mock = 1
            ORDER BY visit_date ASC
            LIMIT 2
            """
        )
        records = [dict(r) for r in cursor.fetchall()]
        connection.close()

    apollo_records = [r for r in records if "apollo" in r.get("hospital_id", "").lower()]
    city_records = [r for r in records if "city" in r.get("hospital_id", "").lower()]

    # Construct unified chronological timeline entries
    timeline = []
    for r in records:
        timeline.append({
            "date": r.get("visit_date"),
            "year": r.get("visit_date", "")[:4],
            "source_hospital": r.get("hospital_name"),
            "hospital_id": r.get("hospital_id"),
            "summary": r.get("timeline_event") or f"{r.get('diagnosis')} — {r.get('hospital_name')}",
            "diagnosis": r.get("diagnosis"),
            "medications": r.get("medications"),
            "lab_results": r.get("lab_results"),
        })

    return {
        "apollo_records": apollo_records,
        "city_records": city_records,
        "timeline": timeline,
        "total_records": len(records)
    }


# =============================================================================
# DOCTOR EDITABLE CLINICAL CONTEXT & EMR STORAGE
# =============================================================================

def save_doctor_edited_report(session_id: str, edited_report_text: str):
    """
    Saves doctor's modifications to the clinical context without calling AI.
    Doctor has final authority.
    """
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        UPDATE sessions
        SET doctor_edited_report = ?
        WHERE session_id = ?
        """,
        (edited_report_text, session_id)
    )
    connection.commit()
    connection.close()
    return {"success": True, "session_id": session_id}


def confirm_and_store_current_hospital_emr(
    session_id: str,
    hospital_id: str,
    doctor_name: str,
    confirmed_report_text: str,
    diagnosis: str = None,
    medications: str = None,
    lab_results: str = None,
    notes: str = None
):
    """
    Stores the FINAL doctor-approved version in the CURRENT hospital EMR (emr_records table).
    Marks session as emr_stored = 1 and status = 'completed'.
    """
    session = get_session_by_id(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}

    connection = get_connection()
    cursor = connection.cursor()

    # Get hospital details
    cursor.execute("SELECT name FROM hospitals WHERE hospital_id = ?", (hospital_id or session.get("hospital_id") or "hosp-medikiosk",))
    hosp_row = cursor.fetchone()
    hospital_name = hosp_row["name"] if hosp_row else "MediKiosk General Hospital"

    record_id = f"emr-curr-{str(uuid.uuid4())[:8]}"
    today_iso = datetime.now().strftime("%Y-%m-%d")
    now_iso = datetime.now().isoformat()

    patient_name = session.get("patient_name") or "Registered Patient"
    patient_id = session.get("patient_id")

    # Construct final diagnosis summary if not provided
    final_diag = diagnosis or f"OPD Consultation — {session.get('department', 'General Medicine')}"
    final_notes = notes or confirmed_report_text[:400]
    final_meds = medications or "As per doctor prescription"
    final_labs = lab_results or "Review on follow-up"

    timeline_event = f"{today_iso[:4]} — Final Consultation confirmed by {doctor_name} ({hospital_name})"

    cursor.execute(
        """
        INSERT INTO emr_records (
            record_id, hospital_id, hospital_name, patient_id, patient_name,
            session_id, visit_date, diagnosis, medications, lab_results,
            notes, timeline_event, confirmed_by_doctor, confirmed_at, is_mock, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (
            record_id,
            hospital_id or session.get("hospital_id") or "hosp-medikiosk",
            hospital_name,
            patient_id,
            patient_name,
            session_id,
            today_iso,
            final_diag,
            final_meds,
            final_labs,
            final_notes,
            timeline_event,
            doctor_name,
            now_iso,
            now_iso
        )
    )

    # Mark session as confirmed and emr_stored
    cursor.execute(
        """
        UPDATE sessions
        SET emr_stored = 1,
            doctor_edited_report = ?,
            doctor_notes = COALESCE(doctor_notes, ?),
            status = 'completed'
        WHERE session_id = ?
        """,
        (confirmed_report_text, final_notes, session_id)
    )

    connection.commit()
    connection.close()

    return {
        "success": True,
        "record_id": record_id,
        "hospital_id": hospital_id,
        "hospital_name": hospital_name,
        "session_id": session_id,
        "confirmed_at": now_iso
    }


def get_hospital_emr_records(hospital_id: str, limit: int = 50):
    """Retrieves all confirmed EMR records belonging to a hospital."""
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT record_id, hospital_id, hospital_name, patient_id, patient_name,
               session_id, visit_date, diagnosis, medications, lab_results,
               notes, timeline_event, confirmed_by_doctor, confirmed_at, is_mock, created_at
        FROM emr_records
        WHERE hospital_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (hospital_id, limit)
    )
    rows = cursor.fetchall()
    connection.close()
    return [dict(r) for r in rows]


# =============================================================================
# PATIENT CARE MODULE — DATABASE EXTENSIONS & OPERATIONS
# =============================================================================

def create_patient_care_tables():
    """
    Creates non-destructive schema additions for Inpatient Monitoring, MEWS,
    Beds, Care Plans, and Transfer Tracking.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # 1. Non-destructive PRAGMA additions to existing patients table
    cursor.execute("PRAGMA table_info(patients)")
    existing_cols = [col[1] for col in cursor.fetchall()]
    if "comorbidities" not in existing_cols:
        cursor.execute("ALTER TABLE patients ADD COLUMN comorbidities TEXT")
    if "medical_history" not in existing_cols:
        cursor.execute("ALTER TABLE patients ADD COLUMN medical_history TEXT")
    if "triage_level" not in existing_cols:
        cursor.execute("ALTER TABLE patients ADD COLUMN triage_level INTEGER DEFAULT 3")
    if "discharge_ready" not in existing_cols:
        cursor.execute("ALTER TABLE patients ADD COLUMN discharge_ready INTEGER DEFAULT 0")
    if "needs_icu" not in existing_cols:
        cursor.execute("ALTER TABLE patients ADD COLUMN needs_icu INTEGER DEFAULT 0")
    if "assigned_bed" not in existing_cols:
        cursor.execute("ALTER TABLE patients ADD COLUMN assigned_bed TEXT")

    # 2. Patient Vitals Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_vitals (
            vital_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            session_id TEXT,
            hospital_id TEXT NOT NULL,
            heart_rate INTEGER NOT NULL,
            blood_pressure_sys INTEGER NOT NULL,
            blood_pressure_dia INTEGER DEFAULT 80,
            respiratory_rate INTEGER NOT NULL,
            temperature REAL NOT NULL,
            oxygen_saturation INTEGER NOT NULL,
            mews_score INTEGER NOT NULL,
            mews_explanation TEXT,
            deterioration_risk REAL DEFAULT 0.0,
            observation_source TEXT NOT NULL DEFAULT 'bedside_manual',
            recorded_by_staff_id TEXT,
            recorded_at TEXT NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
            FOREIGN KEY (session_id) REFERENCES sessions(session_id),
            FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON patient_vitals(patient_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vitals_hospital_id ON patient_vitals(hospital_id)")

    # 3. MEWS Assessments History Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mews_assessments (
            assessment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            vital_id INTEGER,
            hr_score INTEGER NOT NULL,
            bp_score INTEGER NOT NULL,
            rr_score INTEGER NOT NULL,
            temp_score INTEGER NOT NULL,
            spo2_score INTEGER NOT NULL,
            total_score INTEGER NOT NULL,
            clinical_risk_level TEXT NOT NULL,
            ruleset_version TEXT NOT NULL DEFAULT 'MEWS-UK-2001-v1',
            explanation TEXT,
            calculated_at TEXT NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
            FOREIGN KEY (vital_id) REFERENCES patient_vitals(vital_id)
        )
    """)

    # 4. ML Risk Assessments Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ml_risk_assessments (
            assessment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            vital_id INTEGER,
            model_identifier TEXT NOT NULL,
            model_version TEXT DEFAULT '1.0-synthetic',
            predicted_risk REAL NOT NULL,
            is_critical INTEGER NOT NULL DEFAULT 0,
            confidence INTEGER,
            input_features_json TEXT,
            status TEXT NOT NULL DEFAULT 'valid',
            created_at TEXT NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        )
    """)

    # 5. Risk Explanations Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS risk_explanations (
            explanation_id INTEGER PRIMARY KEY AUTOINCREMENT,
            risk_assessment_id INTEGER NOT NULL,
            patient_id TEXT NOT NULL,
            explanation_method TEXT NOT NULL DEFAULT 'clinical_feature_attribution',
            contributing_factors TEXT,
            recommended_action TEXT,
            disclaimer TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (risk_assessment_id) REFERENCES ml_risk_assessments(assessment_id),
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        )
    """)

    # 6. Patient Beds Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_beds (
            bed_id TEXT PRIMARY KEY,
            hospital_id TEXT NOT NULL,
            bed_number TEXT NOT NULL,
            bed_type TEXT NOT NULL,
            ward TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'vacant',
            patient_id TEXT,
            session_id TEXT,
            assigned_at TEXT,
            last_status_change TEXT,
            FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
            UNIQUE (hospital_id, bed_number)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_beds_hosp ON patient_beds(hospital_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_beds_pat ON patient_beds(patient_id)")

    # 7. Patient Care Plans Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_care_plans (
            plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            session_id TEXT,
            hospital_id TEXT NOT NULL,
            care_instructions TEXT NOT NULL,
            medications TEXT,
            special_instructions TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_by_staff_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
            FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_care_plans_pat ON patient_care_plans(patient_id)")

    # 8. Patient Transfer Records Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_transfers (
            transfer_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            session_id TEXT,
            from_hospital_id TEXT NOT NULL,
            to_hospital_name TEXT NOT NULL,
            distance_km REAL NOT NULL,
            bed_type_needed TEXT NOT NULL,
            specialization TEXT,
            transfer_score INTEGER NOT NULL,
            transfer_status TEXT NOT NULL DEFAULT 'recommended',
            responsible_staff_id TEXT,
            contact_phone TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
            FOREIGN KEY (from_hospital_id) REFERENCES hospitals(hospital_id)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transfers_pat ON patient_transfers(patient_id)")

    connection.commit()
    connection.close()


def seed_default_patient_care_beds():
    """Seeds 9 standard beds for each hospital (2 ICU beds and 7 General beds)."""
    connection = get_connection()
    cursor = connection.cursor()

    hospitals = list_hospitals()
    default_bed_templates = [
        {"num": "ICU-01", "type": "ICU",     "ward": "ICU Ward"},
        {"num": "ICU-02", "type": "ICU",     "ward": "ICU Ward"},
        {"num": "GEN-101", "type": "general", "ward": "Ward A"},
        {"num": "GEN-102", "type": "general", "ward": "Ward A"},
        {"num": "GEN-103", "type": "general", "ward": "Ward A"},
        {"num": "GEN-104", "type": "general", "ward": "Ward B"},
        {"num": "GEN-105", "type": "general", "ward": "Ward B"},
        {"num": "GEN-201", "type": "general", "ward": "Ward C"},
        {"num": "GEN-202", "type": "general", "ward": "Ward C"},
    ]

    now_iso = datetime.now().isoformat()
    for hosp in hospitals:
        hosp_id = hosp["hospital_id"]
        for tmpl in default_bed_templates:
            bed_id = f"bed-{hosp_id}-{tmpl['num'].lower()}"
            cursor.execute("SELECT bed_id FROM patient_beds WHERE bed_id = ?", (bed_id,))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO patient_beds (
                        bed_id, hospital_id, bed_number, bed_type, ward, status, last_status_change
                    )
                    VALUES (?, ?, ?, ?, ?, 'vacant', ?)
                """, (bed_id, hosp_id, tmpl["num"], tmpl["type"], tmpl["ward"], now_iso))

    connection.commit()
    connection.close()


# -------------------------------------------------------------
# VITALS & MEWS DATABASE OPERATIONS
# -------------------------------------------------------------

def record_patient_vitals(
    patient_id: str,
    hospital_id: str,
    heart_rate: int,
    blood_pressure_sys: int,
    respiratory_rate: int,
    temperature: float,
    oxygen_saturation: int,
    mews_score: int,
    mews_explanation: str = "",
    deterioration_risk: float = 0.0,
    blood_pressure_dia: int = 80,
    observation_source: str = "bedside_manual",
    staff_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """Records bedside physiological observations and persists to vital history."""
    connection = get_connection()
    cursor = connection.cursor()
    recorded_at = datetime.now().isoformat()

    cursor.execute("""
        INSERT INTO patient_vitals (
            patient_id, session_id, hospital_id, heart_rate,
            blood_pressure_sys, blood_pressure_dia, respiratory_rate,
            temperature, oxygen_saturation, mews_score, mews_explanation,
            deterioration_risk, observation_source, recorded_by_staff_id, recorded_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        patient_id, session_id, hospital_id, heart_rate,
        blood_pressure_sys, blood_pressure_dia, respiratory_rate,
        temperature, oxygen_saturation, mews_score, mews_explanation,
        deterioration_risk, observation_source, staff_id, recorded_at
    ))
    vital_id = cursor.lastrowid
    connection.commit()
    connection.close()

    return {
        "success": True,
        "vital_id": vital_id,
        "patient_id": patient_id,
        "recorded_at": recorded_at,
        "mews_score": mews_score
    }


def get_patient_latest_vitals(patient_id: str) -> Optional[Dict[str, Any]]:
    """Returns the most recent vital observation snapshot for a patient."""
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("""
        SELECT * FROM patient_vitals
        WHERE patient_id = ?
        ORDER BY recorded_at DESC, vital_id DESC
        LIMIT 1
    """, (patient_id,))
    row = cursor.fetchone()
    connection.close()
    return dict(row) if row else None


def get_patient_vitals_history(patient_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Returns historical vital sign trend timeline ordered newest to oldest."""
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("""
        SELECT * FROM patient_vitals
        WHERE patient_id = ?
        ORDER BY recorded_at DESC, vital_id DESC
        LIMIT ?
    """, (patient_id, limit))
    rows = cursor.fetchall()
    connection.close()
    return [dict(r) for r in rows]


def record_mews_assessment_db(
    patient_id: str,
    vital_id: Optional[int],
    mews_data: Dict[str, Any]
) -> int:
    """Stores full MEWS parameter score breakdown into mews_assessments table."""
    connection = get_connection()
    cursor = connection.cursor()
    param_scores = mews_data.get("parameter_scores", {})
    calc_at = mews_data.get("calculated_at", datetime.now().isoformat())

    cursor.execute("""
        INSERT INTO mews_assessments (
            patient_id, vital_id, hr_score, bp_score, rr_score, temp_score,
            spo2_score, total_score, clinical_risk_level, ruleset_version,
            explanation, calculated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        patient_id,
        vital_id,
        param_scores.get("heart_rate", 0),
        param_scores.get("blood_pressure_sys", 0),
        param_scores.get("respiratory_rate", 0),
        param_scores.get("temperature", 0),
        param_scores.get("oxygen_saturation", 0),
        mews_data.get("total_score", 0),
        mews_data.get("risk_level", "STABLE"),
        mews_data.get("ruleset_version", "MEWS-UK-2001-v1"),
        mews_data.get("explanation", ""),
        calc_at
    ))
    assessment_id = cursor.lastrowid
    connection.commit()
    connection.close()
    return assessment_id


def get_patient_mews_history(patient_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Retrieves patient MEWS assessment history."""
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("""
        SELECT * FROM mews_assessments
        WHERE patient_id = ?
        ORDER BY calculated_at DESC, assessment_id DESC
        LIMIT ?
    """, (patient_id, limit))
    rows = cursor.fetchall()
    connection.close()
    return [dict(r) for r in rows]


def record_ml_risk_assessment_db(
    patient_id: str,
    vital_id: Optional[int],
    ml_result: Dict[str, Any],
    input_features: Optional[Dict[str, Any]] = None
) -> int:
    """Stores ML prediction output and XAI factor explanation."""
    connection = get_connection()
    cursor = connection.cursor()
    now_iso = datetime.now().isoformat()

    cursor.execute("""
        INSERT INTO ml_risk_assessments (
            patient_id, vital_id, model_identifier, model_version,
            predicted_risk, is_critical, confidence, input_features_json,
            status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?)
    """, (
        patient_id,
        vital_id,
        ml_result.get("model_used", "random_forest"),
        ml_result.get("model_version", "1.0-synthetic"),
        ml_result.get("critical_risk", 0.0),
        1 if ml_result.get("critical_risk", 0.0) >= 0.70 else 0,
        ml_result.get("confidence", 80),
        json.dumps(input_features or {}),
        now_iso
    ))
    assessment_id = cursor.lastrowid

    cursor.execute("""
        INSERT INTO risk_explanations (
            risk_assessment_id, patient_id, explanation_method,
            contributing_factors, recommended_action, disclaimer, created_at
        )
        VALUES (?, ?, 'clinical_feature_attribution', ?, ?, ?, ?)
    """, (
        assessment_id,
        patient_id,
        ml_result.get("explanation", ""),
        "Review clinical indicators" if ml_result.get("critical_risk", 0.0) >= 0.70 else "Routine care",
        ml_result.get("disclaimer", ""),
        now_iso
    ))

    connection.commit()
    connection.close()
    return assessment_id


# -------------------------------------------------------------
# BED MANAGEMENT OPERATIONS
# -------------------------------------------------------------

def get_hospital_beds(hospital_id: str, ward: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns ward bed list with patient names and occupancy for a hospital."""
    connection = get_connection()
    cursor = connection.cursor()

    query = """
        SELECT b.bed_id, b.hospital_id, b.bed_number, b.bed_type, b.ward,
               b.status, b.patient_id, b.session_id, b.assigned_at, b.last_status_change,
               p.full_name as patient_name, p.age as patient_age, p.gender as patient_gender,
               p.triage_level
        FROM patient_beds b
        LEFT JOIN patients p ON b.patient_id = p.patient_id
        WHERE b.hospital_id = ?
    """
    params = [hospital_id]
    if ward and ward.lower() != "all":
        query += " AND LOWER(b.ward) = LOWER(?)"
        params.append(ward)

    query += " ORDER BY b.bed_type DESC, b.bed_number ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    connection.close()

    result = []
    for r in rows:
        d = dict(r)
        # Fetch latest vitals for occupied beds
        if d["patient_id"]:
            latest_vitals = get_patient_latest_vitals(d["patient_id"])
            d["latest_vitals"] = latest_vitals
            d["mews_score"] = latest_vitals["mews_score"] if latest_vitals else 0
            d["deterioration_risk"] = latest_vitals["deterioration_risk"] if latest_vitals else 0.0
        else:
            d["latest_vitals"] = None
            d["mews_score"] = 0
            d["deterioration_risk"] = 0.0
        result.append(d)

    return result


def assign_patient_bed(
    hospital_id: str,
    bed_number: str,
    patient_id: str,
    session_id: Optional[str] = None,
    staff_id: Optional[str] = None
) -> Dict[str, Any]:
    """Assigns a vacant bed to a patient, vacating any prior bed."""
    connection = get_connection()
    cursor = connection.cursor()
    now_iso = datetime.now().isoformat()

    # 1. Verify target bed exists and is vacant
    cursor.execute("""
        SELECT bed_id, status, bed_type FROM patient_beds
        WHERE hospital_id = ? AND bed_number = ?
    """, (hospital_id, bed_number))
    bed_row = cursor.fetchone()
    if not bed_row:
        connection.close()
        return {"success": False, "error": f"Bed '{bed_number}' not found in hospital"}

    if bed_row["status"] == "occupied":
        connection.close()
        return {"success": False, "error": f"Bed '{bed_number}' is already occupied"}

    # 2. Vacate any previous bed assigned to this patient in this hospital
    cursor.execute("""
        UPDATE patient_beds
        SET status = 'vacant', patient_id = NULL, session_id = NULL, last_status_change = ?
        WHERE hospital_id = ? AND patient_id = ?
    """, (now_iso, hospital_id, patient_id))

    # 3. Assign target bed
    cursor.execute("""
        UPDATE patient_beds
        SET status = 'occupied', patient_id = ?, session_id = ?, assigned_at = ?, last_status_change = ?
        WHERE hospital_id = ? AND bed_number = ?
    """, (patient_id, session_id, now_iso, now_iso, hospital_id, bed_number))

    # 4. Update patients table
    cursor.execute("""
        UPDATE patients
        SET assigned_bed = ?, needs_icu = ?
        WHERE patient_id = ?
    """, (bed_number, 1 if bed_row["bed_type"] == "ICU" else 0, patient_id))

    connection.commit()
    connection.close()

    return {
        "success": True,
        "message": f"Patient {patient_id} assigned to bed {bed_number}",
        "bed_number": bed_number,
        "bed_type": bed_row["bed_type"],
        "assigned_at": now_iso
    }


def release_patient_bed(hospital_id: str, patient_id: str) -> Dict[str, Any]:
    """Frees up any bed assigned to a patient."""
    connection = get_connection()
    cursor = connection.cursor()
    now_iso = datetime.now().isoformat()

    cursor.execute("""
        SELECT bed_number FROM patient_beds
        WHERE hospital_id = ? AND patient_id = ?
    """, (hospital_id, patient_id))
    row = cursor.fetchone()
    freed_bed = row["bed_number"] if row else None

    cursor.execute("""
        UPDATE patient_beds
        SET status = 'vacant', patient_id = NULL, session_id = NULL, last_status_change = ?
        WHERE hospital_id = ? AND patient_id = ?
    """, (now_iso, hospital_id, patient_id))

    cursor.execute("""
        UPDATE patients
        SET assigned_bed = NULL
        WHERE patient_id = ?
    """, (patient_id,))

    connection.commit()
    connection.close()

    return {
        "success": True,
        "freed_bed": freed_bed,
        "message": f"Bed {freed_bed} vacated" if freed_bed else "No bed was assigned to patient"
    }


def upgrade_patient_to_icu(hospital_id: str, patient_id: str) -> Dict[str, Any]:
    """Finds an available ICU bed and upgrades the patient."""
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT bed_number FROM patient_beds
        WHERE hospital_id = ? AND bed_type = 'ICU' AND status = 'vacant'
        ORDER BY bed_number ASC
        LIMIT 1
    """, (hospital_id,))
    vacant_icu = cursor.fetchone()
    connection.close()

    if not vacant_icu:
        return {"success": False, "error": "No vacant ICU beds available for upgrade"}

    return assign_patient_bed(hospital_id, vacant_icu["bed_number"], patient_id)


def optimize_hospital_beds(hospital_id: str) -> Dict[str, Any]:
    """
    Intelligent Bed Reallocation Algorithm:
    Identifies critical patients (MEWS >= 4 or Deterioration Risk > 0.7) residing in General beds
    and reallocates them to vacant ICU beds or swaps with stable patients in ICU (MEWS <= 2).
    """
    connection = get_connection()
    cursor = connection.cursor()
    swaps_made = []

    # Get beds
    cursor.execute("""
        SELECT b.*, p.full_name as patient_name
        FROM patient_beds b
        LEFT JOIN patients p ON b.patient_id = p.patient_id
        WHERE b.hospital_id = ?
    """, (hospital_id,))
    beds = [dict(r) for r in cursor.fetchall()]

    critical_general = []
    stable_icu = []

    for b in beds:
        if b["patient_id"]:
            latest = get_patient_latest_vitals(b["patient_id"])
            mews = latest["mews_score"] if latest else 0
            risk = latest["deterioration_risk"] if latest else 0.0

            if b["bed_type"] == "general" and (mews >= 4 or risk > 0.7):
                critical_general.append({**b, "mews": mews, "risk": risk})
            elif b["bed_type"] == "ICU" and (mews <= 2 and risk < 0.3):
                stable_icu.append({**b, "mews": mews, "risk": risk})

    now_iso = datetime.now().isoformat()

    # Reallocate critical patients
    for crit_pat in critical_general:
        # Check for vacant ICU bed
        vacant_icu = next((b for b in beds if b["bed_type"] == "ICU" and b["status"] == "vacant"), None)
        if vacant_icu:
            # Move critical patient to vacant ICU
            cursor.execute("""
                UPDATE patient_beds
                SET status = 'vacant', patient_id = NULL, last_status_change = ?
                WHERE bed_id = ?
            """, (now_iso, crit_pat["bed_id"]))

            cursor.execute("""
                UPDATE patient_beds
                SET status = 'occupied', patient_id = ?, last_status_change = ?, assigned_at = ?
                WHERE bed_id = ?
            """, (crit_pat["patient_id"], now_iso, now_iso, vacant_icu["bed_id"]))

            cursor.execute("UPDATE patients SET assigned_bed = ?, needs_icu = 1 WHERE patient_id = ?",
                           (vacant_icu["bed_number"], crit_pat["patient_id"]))

            vacant_icu["status"] = "occupied"
            vacant_icu["patient_id"] = crit_pat["patient_id"]
            crit_pat["status"] = "vacant"
            crit_pat["patient_id"] = None
            swaps_made.append(f"Moved {crit_pat['patient_name']} from General ({crit_pat['bed_number']}) to vacant ICU ({vacant_icu['bed_number']})")
        elif stable_icu:
            # Swap critical patient with stable ICU patient
            stable_pat = stable_icu.pop(0)

            cursor.execute("""
                UPDATE patient_beds
                SET patient_id = ?, last_status_change = ?
                WHERE bed_id = ?
            """, (crit_pat["patient_id"], now_iso, stable_pat["bed_id"]))

            cursor.execute("""
                UPDATE patient_beds
                SET patient_id = ?, last_status_change = ?
                WHERE bed_id = ?
            """, (stable_pat["patient_id"], now_iso, crit_pat["bed_id"]))

            cursor.execute("UPDATE patients SET assigned_bed = ?, needs_icu = 1 WHERE patient_id = ?",
                           (stable_pat["bed_number"], crit_pat["patient_id"]))
            cursor.execute("UPDATE patients SET assigned_bed = ?, needs_icu = 0 WHERE patient_id = ?",
                           (crit_pat["bed_number"], stable_pat["patient_id"]))

            swaps_made.append(f"Swapped critical patient {crit_pat['patient_name']} (into ICU {stable_pat['bed_number']}) with stable patient {stable_pat['patient_name']} (into General {crit_pat['bed_number']})")

    connection.commit()
    connection.close()

    return {
        "success": True,
        "swaps_count": len(swaps_made),
        "swaps_made": swaps_made,
        "message": "Optimization completed successfully" if swaps_made else "No bed reallocation necessary (all critical patients in ICU)"
    }


def discharge_patient_care(
    hospital_id: str,
    patient_id: str,
    override: bool = False
) -> Dict[str, Any]:
    """Executes patient discharge, vacating bed and updating clinical readiness."""
    connection = get_connection()
    cursor = connection.cursor()

    latest_vitals = get_patient_latest_vitals(patient_id)
    if latest_vitals and not override:
        mews = latest_vitals.get("mews_score", 0)
        if mews >= 3:
            connection.close()
            return {
                "success": False,
                "error": f"Cannot discharge: Patient MEWS score is {mews} (>= 3). Requires clinical override."
            }

    # Free bed
    release_res = release_patient_bed(hospital_id, patient_id)

    # Update patient
    cursor.execute("""
        UPDATE patients
        SET discharge_ready = 1
        WHERE patient_id = ?
    """, (patient_id,))

    # Update active session status to completed if exists
    cursor.execute("""
        UPDATE sessions
        SET status = 'completed'
        WHERE patient_id = ? AND status != 'completed'
    """, (patient_id,))

    connection.commit()
    connection.close()

    return {
        "success": True,
        "patient_id": patient_id,
        "message": "Patient discharged successfully",
        "freed_bed": release_res.get("freed_bed")
    }


# -------------------------------------------------------------
# CARE PLANS & TRANSFERS OPERATIONS
# -------------------------------------------------------------

def create_patient_care_plan(
    patient_id: str,
    hospital_id: str,
    care_instructions: str,
    medications: str = "",
    special_instructions: str = "",
    staff_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """Creates a new personalized care plan for a patient."""
    connection = get_connection()
    cursor = connection.cursor()
    now_iso = datetime.now().isoformat()

    cursor.execute("""
        INSERT INTO patient_care_plans (
            patient_id, session_id, hospital_id, care_instructions,
            medications, special_instructions, status, created_by_staff_id,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    """, (
        patient_id, session_id, hospital_id, care_instructions,
        medications, special_instructions, staff_id, now_iso, now_iso
    ))
    plan_id = cursor.lastrowid
    connection.commit()
    connection.close()

    return {
        "success": True,
        "plan_id": plan_id,
        "patient_id": patient_id,
        "created_at": now_iso
    }


def get_patient_care_plans(patient_id: str) -> List[Dict[str, Any]]:
    """Retrieves all care plans for a patient ordered newest to oldest."""
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("""
        SELECT cp.*, s.name as staff_name
        FROM patient_care_plans cp
        LEFT JOIN healthcare_staff s ON cp.created_by_staff_id = s.staff_id
        WHERE cp.patient_id = ?
        ORDER BY cp.created_at DESC, cp.plan_id DESC
    """, (patient_id,))
    rows = cursor.fetchall()
    connection.close()
    return [dict(r) for r in rows]


def record_patient_transfer(
    patient_id: str,
    from_hospital_id: str,
    to_hospital_name: str,
    distance_km: float,
    bed_type_needed: str,
    specialization: str = "",
    transfer_score: int = 75,
    contact_phone: str = "",
    notes: str = "",
    staff_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """Records an initiated inter-hospital transfer request."""
    connection = get_connection()
    cursor = connection.cursor()
    now_iso = datetime.now().isoformat()

    cursor.execute("""
        INSERT INTO patient_transfers (
            patient_id, session_id, from_hospital_id, to_hospital_name,
            distance_km, bed_type_needed, specialization, transfer_score,
            transfer_status, responsible_staff_id, contact_phone, notes,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'initiated', ?, ?, ?, ?, ?)
    """, (
        patient_id, session_id, from_hospital_id, to_hospital_name,
        distance_km, bed_type_needed, specialization, transfer_score,
        staff_id, contact_phone, notes, now_iso, now_iso
    ))
    transfer_id = cursor.lastrowid
    connection.commit()
    connection.close()

    return {
        "success": True,
        "transfer_id": transfer_id,
        "patient_id": patient_id,
        "target_hospital": to_hospital_name,
        "status": "initiated",
        "created_at": now_iso
    }


def get_patient_transfers(patient_id: str) -> List[Dict[str, Any]]:
    """Retrieves all transfer records for a patient."""
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("""
        SELECT * FROM patient_transfers
        WHERE patient_id = ?
        ORDER BY created_at DESC, transfer_id DESC
    """, (patient_id,))
    rows = cursor.fetchall()
    connection.close()
    return [dict(r) for r in rows]


# -------------------------------------------------------------
# STAFF PATIENT MONITORING AGGREGATION (Rule 8 & 9 Compliance)
# -------------------------------------------------------------

def get_staff_monitored_patients(
    hospital_id: str,
    ward: Optional[str] = None,
    filter_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Aggregates monitored patients for a hospital workstation with clear distinction
    between conversational AI red-flags and physiological MEWS monitoring alerts.
    """
    connection = get_connection()
    cursor = connection.cursor()

    query = """
        SELECT DISTINCT p.patient_id, p.full_name, p.age, p.gender, p.triage_level,
               p.comorbidities, p.medical_history, p.discharge_ready, p.needs_icu,
               b.bed_number, b.bed_type, b.ward, b.status as bed_status,
               s.session_id, s.department, s.doctor_name, s.status as session_status,
               s.red_flag as intake_red_flag, s.red_flag_reason as intake_red_flag_reason,
               s.red_flag_acknowledged as intake_red_flag_acknowledged,
               s.created_at as session_date
        FROM patients p
        LEFT JOIN patient_beds b ON p.patient_id = b.patient_id AND b.hospital_id = ?
        LEFT JOIN sessions s ON p.patient_id = s.patient_id AND s.hospital_id = ?
        WHERE (b.hospital_id = ? OR s.hospital_id = ?)
    """
    params = [hospital_id, hospital_id, hospital_id, hospital_id]

    if ward and ward.lower() != "all":
        query += " AND LOWER(b.ward) = LOWER(?)"
        params.append(ward)

    query += " ORDER BY p.full_name ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    connection.close()

    patients_list = []
    counts = {
        "total": 0,
        "critical_mews": 0,
        "intake_red_flags": 0,
        "icu_patients": 0,
        "general_patients": 0,
        "discharge_ready": 0
    }

    seen_patients = set()
    for r in rows:
        pid = r["patient_id"]
        if pid in seen_patients:
            continue
        seen_patients.add(pid)

        d = dict(r)
        counts["total"] += 1

        # Fetch latest vitals
        vitals = get_patient_latest_vitals(pid)
        d["latest_vitals"] = vitals
        mews_score = vitals["mews_score"] if vitals else 0
        det_risk = vitals["deterioration_risk"] if vitals else 0.0
        d["mews_score"] = mews_score
        d["deterioration_risk"] = det_risk

        # Distinct Alert Flags (Rule 9 compliance)
        # Alert A: AI Intake Red Flag
        d["has_intake_red_flag"] = bool(d.get("intake_red_flag"))
        if d["has_intake_red_flag"] and not d.get("intake_red_flag_acknowledged"):
            counts["intake_red_flags"] += 1

        # Alert B: Physiological MEWS Alert
        d["has_mews_alert"] = (mews_score >= 4 or det_risk >= 0.70)
        if d["has_mews_alert"]:
            counts["critical_mews"] += 1

        if d.get("bed_type") == "ICU":
            counts["icu_patients"] += 1
        elif d.get("bed_type") == "general":
            counts["general_patients"] += 1

        if d.get("discharge_ready"):
            counts["discharge_ready"] += 1

        # Filter check
        if filter_type == "critical_mews" and not d["has_mews_alert"]:
            continue
        elif filter_type == "intake_red_flags" and not d["has_intake_red_flag"]:
            continue
        elif filter_type == "icu" and d.get("bed_type") != "ICU":
            continue
        elif filter_type == "discharge_ready" and not d.get("discharge_ready"):
            continue

        patients_list.append(d)

    return {
        "success": True,
        "hospital_id": hospital_id,
        "counts": counts,
        "patients": patients_list
    }


# =============================================================================
# PHASE 4: UNIFIED PATIENT DATA INTEGRATION & TIMELINE AGGREGATOR
# =============================================================================

def get_patient_timeline(patient_id: str, limit: int = 150, reverse: bool = False) -> List[Dict[str, Any]]:
    """
    Builds a unified chronological clinical timeline for a patient across all data sources:
    - Patient Registration
    - AI conversation sessions & patient-reported complaints
    - Conversational red flags & acknowledgements
    - Medical documents & OCR processing
    - Contradiction detection & clarification resolutions
    - Bedside vital observations & observation sources
    - MEWS early warning scoring
    - Machine learning risk predictions
    - Ward bed allocations & ICU transfers
    - Inpatient personalized care plans
    - Inter-hospital transfer recommendations & dispatches
    - Doctor consultations & EMR records
    """
    timeline: List[Dict[str, Any]] = []
    conn = get_connection()
    cur = conn.cursor()

    try:
        # 1. Patient Registration
        cur.execute("SELECT patient_id, full_name, created_at FROM patients WHERE patient_id = ?", (patient_id,))
        pat = cur.fetchone()
        if pat and pat["created_at"]:
            timeline.append({
                "id": f"reg-{pat['patient_id']}",
                "timestamp": pat["created_at"],
                "category": "registration",
                "title": "Patient Registered at MediKiosk",
                "description": f"Patient account created for {pat['full_name']} with ID {pat['patient_id']}.",
                "provenance_source": "patient_registration",
                "provenance_label": "Patient Demographics",
                "actor": "Patient",
                "badge_level": "info",
                "metadata": {"patient_id": pat["patient_id"]}
            })

        # 2. Intake Sessions & AI Conversations
        cur.execute("""
            SELECT session_id, language, doctor_name, department, status, created_at, verified_at,
                   doctor_notes, final_report, red_flag, red_flag_reason, red_flag_acknowledged,
                   red_flag_created_at, red_flag_acknowledged_at
            FROM sessions
            WHERE patient_id = ?
            ORDER BY created_at ASC
        """, (patient_id,))
        sessions = [dict(s) for s in cur.fetchall()]

        for sess in sessions:
            sid = sess["session_id"]
            if sess.get("created_at"):
                timeline.append({
                    "id": f"sess-init-{sid}",
                    "timestamp": sess["created_at"],
                    "category": "intake_chat",
                    "title": f"Clinical Intake Session Initiated ({sess.get('department') or 'General'})",
                    "description": f"AI intake conversation started in language: {sess.get('language', 'en')}. Assigned to OPD {sess.get('doctor_name') or 'Department'}.",
                    "provenance_source": "patient_intake_kiosk",
                    "provenance_label": "AI Kiosk Interview",
                    "actor": "MediKiosk Groq AI",
                    "badge_level": "info",
                    "metadata": {"session_id": sid, "status": sess.get("status")}
                })

            # Check messages for patient complaints
            cur.execute("SELECT sender, message, created_at FROM messages WHERE session_id = ? ORDER BY id ASC LIMIT 5", (sid,))
            user_msgs = [dict(m) for m in cur.fetchall() if m["sender"] == "user"]
            if user_msgs:
                first_complaint = user_msgs[0]
                timeline.append({
                    "id": f"complaint-{sid}",
                    "timestamp": first_complaint["created_at"],
                    "category": "intake_chat",
                    "title": "Chief Complaint Reported by Patient",
                    "description": f"Patient reported: \"{first_complaint['message']}\"",
                    "provenance_source": "patient_reported",
                    "provenance_label": "Patient Self-Report",
                    "actor": "Patient",
                    "badge_level": "info",
                    "metadata": {"session_id": sid}
                })

            # Conversational Red Flag (Rule 9: Distinct Intake Alert)
            if sess.get("red_flag"):
                rf_time = sess.get("red_flag_created_at") or sess.get("created_at")
                timeline.append({
                    "id": f"rf-alert-{sid}",
                    "timestamp": rf_time,
                    "category": "red_flag",
                    "title": "🚨 AI Conversational Red-Flag Triggered",
                    "description": f"Critical conversational indicator flagged during AI interview: {sess.get('red_flag_reason') or 'Emergency symptoms detected'}.",
                    "provenance_source": "ai_chat_nlp",
                    "provenance_label": "Groq AI Conversation NLP",
                    "actor": "MediKiosk Groq AI",
                    "badge_level": "critical",
                    "metadata": {"session_id": sid, "reason": sess.get("red_flag_reason")}
                })

                if sess.get("red_flag_acknowledged") and sess.get("red_flag_acknowledged_at"):
                    timeline.append({
                        "id": f"rf-ack-{sid}",
                        "timestamp": sess["red_flag_acknowledged_at"],
                        "category": "red_flag",
                        "title": "✓ Conversational Red-Flag Acknowledged",
                        "description": "Healthcare desk coordinator acknowledged conversational alert and dispatched clinical triage.",
                        "provenance_source": "staff_coordination",
                        "provenance_label": "Staff Workstation Action",
                        "actor": "Healthcare Coordinator",
                        "badge_level": "success",
                        "metadata": {"session_id": sid}
                    })

            # Doctor Consultation Completion
            if sess.get("status") == "completed" or sess.get("verified_at"):
                v_time = sess.get("verified_at") or sess.get("created_at")
                timeline.append({
                    "id": f"doc-consult-{sid}",
                    "timestamp": v_time,
                    "category": "doctor_consultation",
                    "title": f"Doctor Consultation Completed ({sess.get('doctor_name') or 'Physician'})",
                    "description": f"Consultation verified and clinical review finalized. Notes: {sess.get('doctor_notes') or 'Encounter completed successfully'}.",
                    "provenance_source": "doctor_reviewed",
                    "provenance_label": "Attending Doctor Review",
                    "actor": sess.get("doctor_name") or "Doctor",
                    "badge_level": "success",
                    "metadata": {"session_id": sid}
                })

            # Documents & OCR
            cur.execute("SELECT id, filename, extracted_text, created_at FROM documents WHERE session_id = ?", (sid,))
            docs = [dict(d) for d in cur.fetchall()]
            for doc in docs:
                timeline.append({
                    "id": f"doc-{doc['id']}",
                    "timestamp": doc["created_at"],
                    "category": "document_ocr",
                    "title": f"Medical Document Uploaded & OCR Scanned: {doc['filename']}",
                    "description": f"Tesseract OCR extracted {len(doc.get('extracted_text', ''))} characters from uploaded prescription/lab report.",
                    "provenance_source": "uploaded_ocr_document",
                    "provenance_label": "Tesseract OCR Extraction",
                    "actor": "OCR Engine",
                    "badge_level": "info",
                    "metadata": {"document_id": doc["id"], "filename": doc["filename"]}
                })

            # Contradictions
            cur.execute("""
                SELECT id, category, patient_statement, document_evidence, clarification_question,
                       patient_answer, status, resolution_summary, created_at, resolved_at
                FROM contradictions WHERE session_id = ?
            """, (sid,))
            contradictions = [dict(c) for c in cur.fetchall()]
            for c in contradictions:
                c_time = c.get("resolved_at") or c.get("created_at")
                timeline.append({
                    "id": f"contra-{c['id']}",
                    "timestamp": c_time,
                    "category": "contradiction",
                    "title": f"Clinical Contradiction Resolved: {c['category']}",
                    "description": f"Question: \"{c['clarification_question']}\" -> Patient Clarification: \"{c.get('patient_answer') or c.get('resolution_summary') or 'Resolved'}\"",
                    "provenance_source": "contradiction_engine",
                    "provenance_label": "Contradiction Engine",
                    "actor": "Patient & Engine",
                    "badge_level": "info",
                    "metadata": {"contradiction_id": c["id"]}
                })

        # 3. Hospital EMR Records
        cur.execute("""
            SELECT record_id, hospital_name, visit_date, diagnosis, timeline_event, confirmed_by_doctor, created_at
            FROM emr_records WHERE patient_id = ?
        """, (patient_id,))
        for emr in cur.fetchall():
            e = dict(emr)
            timeline.append({
                "id": f"emr-{e['record_id']}",
                "timestamp": e.get("created_at") or e.get("visit_date"),
                "category": "emr",
                "title": f"Hospital EMR Record: {e.get('hospital_name')}",
                "description": f"Diagnosis: {e.get('diagnosis')}. Event: {e.get('timeline_event') or 'Clinical visit archived'}.",
                "provenance_source": "hospital_emr_archive",
                "provenance_label": "Hospital EMR Database",
                "actor": e.get("confirmed_by_doctor") or "Medical Records",
                "badge_level": "info",
                "metadata": {"record_id": e["record_id"]}
            })

        # 4. Bedside Vital Observations & MEWS (Rule 10: Provenance & Timestamps)
        cur.execute("""
            SELECT vital_id, session_id, heart_rate, blood_pressure_sys, blood_pressure_dia,
                   respiratory_rate, temperature, oxygen_saturation, mews_score, mews_explanation,
                   deterioration_risk, observation_source, recorded_by_staff_id, recorded_at
            FROM patient_vitals
            WHERE patient_id = ?
            ORDER BY recorded_at ASC
        """, (patient_id,))
        vitals_rows = [dict(v) for v in cur.fetchall()]

        for v in vitals_rows:
            v_time = v["recorded_at"]
            mews = v.get("mews_score", 0)
            is_crit = mews >= 4 or (v.get("deterioration_risk") or 0.0) >= 0.70

            timeline.append({
                "id": f"vital-{v['vital_id']}",
                "timestamp": v_time,
                "category": "vitals",
                "title": f"Bedside Vitals Recorded (MEWS: {mews} pts)",
                "description": f"HR: {v['heart_rate']} bpm, BP: {v['blood_pressure_sys']}/{v['blood_pressure_dia']} mmHg, RR: {v['respiratory_rate']} /min, Temp: {v['temperature']}°C, SpO2: {v['oxygen_saturation']}%.",
                "provenance_source": v.get("observation_source", "bedside_manual"),
                "provenance_label": f"Bedside ({v.get('observation_source', 'manual')})",
                "actor": v.get("recorded_by_staff_id") or "Healthcare Staff",
                "badge_level": "critical" if is_crit else "warning" if mews >= 2 else "success",
                "metadata": {
                    "vital_id": v["vital_id"],
                    "mews_score": mews,
                    "observation_source": v.get("observation_source"),
                    "recorded_by": v.get("recorded_by_staff_id")
                }
            })

        # 5. MEWS Assessments History
        cur.execute("""
            SELECT assessment_id, vital_id, hr_score, bp_score, rr_score, temp_score, spo2_score,
                   total_score, clinical_risk_level, ruleset_version, explanation, calculated_at
            FROM mews_assessments
            WHERE patient_id = ?
            ORDER BY calculated_at ASC
        """, (patient_id,))
        for m in cur.fetchall():
            mews_item = dict(m)
            timeline.append({
                "id": f"mews-{mews_item['assessment_id']}",
                "timestamp": mews_item["calculated_at"],
                "category": "mews",
                "title": f"MEWS Assessment Computed: {mews_item['total_score']} pts ({mews_item['clinical_risk_level']})",
                "description": f"Ruleset: {mews_item.get('ruleset_version')}. Parameter breakdown: HR:+{mews_item['hr_score']}, BP:+{mews_item['bp_score']}, RR:+{mews_item['rr_score']}, Temp:+{mews_item['temp_score']}, SpO2:+{mews_item['spo2_score']}.",
                "provenance_source": "mews_ruleset_subbe",
                "provenance_label": "Subbe 2001 Standard",
                "actor": "Clinical Scoring Engine",
                "badge_level": "critical" if mews_item["total_score"] >= 4 else "warning" if mews_item["total_score"] >= 2 else "success",
                "metadata": {"assessment_id": mews_item["assessment_id"], "score": mews_item["total_score"]}
            })

        # 6. ML Risk Assessments & XAI
        cur.execute("""
            SELECT assessment_id, model_identifier, model_version, predicted_risk, is_critical,
                   confidence, input_features_json, created_at
            FROM ml_risk_assessments
            WHERE patient_id = ?
            ORDER BY created_at ASC
        """, (patient_id,))
        for ml in cur.fetchall():
            ml_item = dict(ml)
            risk_pct = round(ml_item["predicted_risk"] * 100)
            timeline.append({
                "id": f"ml-{ml_item['assessment_id']}",
                "timestamp": ml_item["created_at"],
                "category": "ml_risk",
                "title": f"ML Risk Inferred: {ml_item['model_identifier']} ({risk_pct}% Risk)",
                "description": f"Deterioration probability: {risk_pct}%. Model: {ml_item['model_identifier']} (v{ml_item.get('model_version', '1.0')}). Synthetic training limitations apply.",
                "provenance_source": f"ml_model_{ml_item['model_identifier']}",
                "provenance_label": f"Machine Learning ({ml_item['model_identifier']})",
                "actor": "Scikit-Learn ML Service",
                "badge_level": "critical" if ml_item["is_critical"] else "warning" if risk_pct >= 40 else "info",
                "metadata": {"assessment_id": ml_item["assessment_id"], "predicted_risk": ml_item["predicted_risk"]}
            })

        # 7. Bed Allocations
        cur.execute("""
            SELECT bed_id, hospital_id, bed_number, bed_type, ward, status, assigned_at
            FROM patient_beds
            WHERE patient_id = ?
        """, (patient_id,))
        for b in cur.fetchall():
            b_item = dict(b)
            if b_item.get("assigned_at"):
                timeline.append({
                    "id": f"bed-{b_item['bed_id']}",
                    "timestamp": b_item["assigned_at"],
                    "category": "bed_allocation",
                    "title": f"Ward Bed Assigned: {b_item['bed_number']} ({b_item['ward']})",
                    "description": f"Patient allocated to {b_item['bed_type'].upper()} bed {b_item['bed_number']} in {b_item['ward']}.",
                    "provenance_source": "ward_admissions",
                    "provenance_label": "Ward Bed Management",
                    "actor": "Hospital Staff",
                    "badge_level": "info",
                    "metadata": {"bed_id": b_item["bed_id"], "bed_number": b_item["bed_number"]}
                })

        # 8. Care Plans
        cur.execute("""
            SELECT plan_id, care_instructions, medications, special_instructions, status, created_by_staff_id, created_at
            FROM patient_care_plans
            WHERE patient_id = ?
            ORDER BY created_at ASC
        """, (patient_id,))
        for cp in cur.fetchall():
            cp_item = dict(cp)
            timeline.append({
                "id": f"plan-{cp_item['plan_id']}",
                "timestamp": cp_item["created_at"],
                "category": "care_plan",
                "title": f"Inpatient Care Directives Issued (Plan #{cp_item['plan_id']})",
                "description": f"Instructions: {cp_item['care_instructions']}. Medications: {cp_item.get('medications') or 'None specified'}.",
                "provenance_source": "staff_care_directive",
                "provenance_label": "Nursing Directive",
                "actor": cp_item.get("created_by_staff_id") or "Staff Nurse",
                "badge_level": "info",
                "metadata": {"plan_id": cp_item["plan_id"]}
            })

        # 9. Inter-Hospital Transfers
        cur.execute("""
            SELECT transfer_id, to_hospital_name, distance_km, bed_type_needed, specialization,
                   transfer_score, transfer_status, notes, responsible_staff_id, created_at
            FROM patient_transfers
            WHERE patient_id = ?
            ORDER BY created_at ASC
        """, (patient_id,))
        for tr in cur.fetchall():
            tr_item = dict(tr)
            timeline.append({
                "id": f"transfer-{tr_item['transfer_id']}",
                "timestamp": tr_item["created_at"],
                "category": "transfer",
                "title": f"Inter-Hospital Transfer Initiated -> {tr_item['to_hospital_name']}",
                "description": f"Destination: {tr_item['to_hospital_name']} ({tr_item['distance_km']} km). Bed: {tr_item['bed_type_needed']}. Match Score: {tr_item['transfer_score']}/100. Notes: {tr_item.get('notes') or 'N/A'}.",
                "provenance_source": "transfer_coordination",
                "provenance_label": "Hospital Transfer Network",
                "actor": tr_item.get("responsible_staff_id") or "Transport Coordinator",
                "badge_level": "warning" if tr_item["transfer_status"] == "initiated" else "info",
                "metadata": {"transfer_id": tr_item["transfer_id"], "status": tr_item["transfer_status"]}
            })

    finally:
        conn.close()

    # Sort timeline events by timestamp
    def parse_time(item):
        ts = item.get("timestamp")
        if not ts:
            return datetime.min
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            return datetime.min

    timeline.sort(key=parse_time, reverse=not reverse)  # Default newest first
    return timeline[:limit]


def get_patient_unified_profile(patient_id: str) -> Optional[Dict[str, Any]]:
    """
    Assembles a complete 360-degree unified clinical profile for a patient across:
    1. Demographics & Identity (patients table, sensitive credentials stripped)
    2. AI Intake & Conversation Sessions (sessions, messages, contradictions)
    3. Medical Documents & OCR (documents table)
    4. Clinical Summaries & Doctor Reviews (final_report, doctor_notes, emr_records)
    5. Conversational Red-Flag Alerts (sessions where red_flag = 1)
    6. Bedside Physiological Vitals History (patient_vitals table)
    7. Standardized MEWS Scoring Assessments (mews_assessments table)
    8. ML Deterioration Risk Assessments & Explanations (ml_risk_assessments & risk_explanations)
    9. Inpatient Bed Allocation & Ward (patient_beds table)
    10. Inpatient Care Directives (patient_care_plans table)
    11. Inter-Hospital Transfer Coordination (patient_transfers table)
    12. External EMR Records & Consents (emr_records & external_emr_consents)
    13. Unified Chronological Clinical Timeline (aggregated & sorted)
    """
    conn = get_connection()
    cur = conn.cursor()

    try:
        # 1. Patient Demographics (strip password_hash and salt)
        cur.execute("""
            SELECT patient_id, full_name, email, phone, age, gender, created_at,
                   triage_level, discharge_ready, needs_icu, assigned_bed
            FROM patients
            WHERE patient_id = ?
        """, (patient_id,))
        pat_row = cur.fetchone()
        if not pat_row:
            return None

        patient_info = dict(pat_row)

        # 2. Intake Sessions & AI Conversations
        cur.execute("""
            SELECT session_id, language, doctor_name, department, otp_code, status,
                   verified_at, final_report, doctor_notes, hospital_id, red_flag,
                   red_flag_reason, red_flag_acknowledged, red_flag_created_at,
                   red_flag_acknowledged_at, doctor_edited_report, emr_stored, created_at
            FROM sessions
            WHERE patient_id = ?
            ORDER BY created_at DESC
        """, (patient_id,))
        sessions_raw = [dict(s) for s in cur.fetchall()]

        conversations = []
        conversation_alerts = []
        all_documents = []
        all_contradictions = []

        for sess in sessions_raw:
            sid = sess["session_id"]
            # Messages
            cur.execute("SELECT id, sender, message, created_at FROM messages WHERE session_id = ? ORDER BY id ASC", (sid,))
            msgs = [dict(m) for m in cur.fetchall()]
            sess["messages"] = msgs

            # Documents attached to this session
            cur.execute("SELECT id, session_id, filename, extracted_text, created_at FROM documents WHERE session_id = ? ORDER BY id ASC", (sid,))
            docs = [dict(d) for d in cur.fetchall()]
            for d in docs:
                d["char_count"] = len(d.get("extracted_text") or "")
                d["provenance_source"] = "uploaded_ocr_document"
            all_documents.extend(docs)
            sess["documents"] = docs

            # Contradictions attached to this session
            cur.execute("""
                SELECT id, category, patient_statement, document_evidence, clarification_question,
                       options, patient_answer, status, resolution_summary, created_at, resolved_at
                FROM contradictions WHERE session_id = ? ORDER BY id ASC
            """, (sid,))
            contras = []
            for c in cur.fetchall():
                c_dict = dict(c)
                try:
                    c_dict["options"] = json.loads(c_dict["options"]) if c_dict.get("options") else []
                except Exception:
                    pass
                contras.append(c_dict)
            all_contradictions.extend(contras)
            sess["contradictions"] = contras

            # Red flag alert extraction
            if sess.get("red_flag"):
                conversation_alerts.append({
                    "session_id": sid,
                    "reason": sess.get("red_flag_reason") or "Critical symptoms flagged in AI chat",
                    "department": sess.get("department") or "Emergency / Triage",
                    "flagged_at": sess.get("red_flag_created_at") or sess.get("created_at"),
                    "acknowledged": bool(sess.get("red_flag_acknowledged")),
                    "acknowledged_at": sess.get("red_flag_acknowledged_at"),
                    "status": "acknowledged" if sess.get("red_flag_acknowledged") else "unacknowledged",
                    "source": "ai_chat_nlp"
                })

            conversations.append(sess)

        # 3. Clinical Summaries
        cur.execute("""
            SELECT record_id, hospital_id, hospital_name, session_id, visit_date, diagnosis,
                   medications, lab_results, notes, timeline_event, confirmed_by_doctor, confirmed_at, is_mock, created_at
            FROM emr_records
            WHERE patient_id = ?
            ORDER BY created_at DESC
        """, (patient_id,))
        emr_records = [dict(e) for e in cur.fetchall()]

        # 4. External EMR Consents
        cur.execute("""
            SELECT c.id, c.session_id, c.consented, c.consented_at
            FROM external_emr_consents c
            JOIN sessions s ON c.session_id = s.session_id
            WHERE s.patient_id = ?
            ORDER BY c.consented_at DESC
        """, (patient_id,))
        external_consents = [dict(c) for c in cur.fetchall()]

        # 5. Bedside Vitals History
        cur.execute("""
            SELECT vital_id, patient_id, session_id, hospital_id, heart_rate, blood_pressure_sys, blood_pressure_dia,
                   respiratory_rate, temperature, oxygen_saturation, mews_score, mews_explanation,
                   deterioration_risk, observation_source, recorded_by_staff_id, recorded_at
            FROM patient_vitals
            WHERE patient_id = ?
            ORDER BY recorded_at DESC
        """, (patient_id,))
        vitals_history = [dict(v) for v in cur.fetchall()]
        latest_vitals = vitals_history[0] if vitals_history else None

        # 6. MEWS Assessments
        cur.execute("""
            SELECT assessment_id, patient_id, vital_id, hr_score, bp_score, rr_score, temp_score, spo2_score,
                   total_score, clinical_risk_level, ruleset_version, explanation, calculated_at
            FROM mews_assessments
            WHERE patient_id = ?
            ORDER BY calculated_at DESC
        """, (patient_id,))
        mews_assessments = [dict(m) for m in cur.fetchall()]

        # 7. ML Risk Assessments & Explanations
        cur.execute("""
            SELECT assessment_id, patient_id, vital_id, model_identifier, model_version, predicted_risk,
                   is_critical, confidence, input_features_json, status, created_at
            FROM ml_risk_assessments
            WHERE patient_id = ?
            ORDER BY created_at DESC
        """, (patient_id,))
        ml_assessments = []
        for ml in cur.fetchall():
            ml_dict = dict(ml)
            aid = ml_dict["assessment_id"]
            # Fetch explanations
            cur.execute("""
                SELECT explanation_id, risk_assessment_id, patient_id, explanation_method, contributing_factors, recommended_action,
                       disclaimer, created_at
                FROM risk_explanations
                WHERE risk_assessment_id = ?
            """, (aid,))
            expls = [dict(x) for x in cur.fetchall()]
            ml_dict["explanations"] = expls
            ml_assessments.append(ml_dict)

        # 8. Bed & Ward Allocation
        cur.execute("""
            SELECT bed_id, hospital_id, bed_number, bed_type, ward, status, patient_id, assigned_at
            FROM patient_beds
            WHERE patient_id = ?
        """, (patient_id,))
        bed_rows = [dict(b) for b in cur.fetchall()]
        active_bed = next((b for b in bed_rows if b["status"] == "occupied"), None)

        # 9. Inpatient Care Plans
        cur.execute("""
            SELECT plan_id, patient_id, session_id, hospital_id, created_by_staff_id, care_instructions,
                   medications, special_instructions, status, created_at, updated_at
            FROM patient_care_plans
            WHERE patient_id = ?
            ORDER BY created_at DESC
        """, (patient_id,))
        care_plans = [dict(cp) for cp in cur.fetchall()]

        # 10. Inter-Hospital Transfers
        cur.execute("""
            SELECT transfer_id, patient_id, session_id, from_hospital_id, to_hospital_name, distance_km,
                   bed_type_needed, specialization, contact_phone, transfer_score,
                   transfer_status, notes, responsible_staff_id, created_at, updated_at
            FROM patient_transfers
            WHERE patient_id = ?
            ORDER BY created_at DESC
        """, (patient_id,))
        transfers = []
        for tr in cur.fetchall():
            tr_dict = dict(tr)
            tr_dict["status"] = tr_dict["transfer_status"]  # provide alias for API consumer convenience
            transfers.append(tr_dict)

        # Determine overall physiological alert status (Rule 9)
        current_mews = latest_vitals["mews_score"] if latest_vitals else 0
        current_risk = latest_vitals["deterioration_risk"] if latest_vitals else 0.0
        has_mews_alert = current_mews >= 4 or current_risk >= 0.70
        has_intake_rf = any(not a.get("acknowledged") for a in conversation_alerts)

    finally:
        conn.close()

    # 11. Unified Chronological Timeline
    timeline = get_patient_timeline(patient_id, limit=150)

    return {
        "success": True,
        "patient": patient_info,
        "clinical_status": {
            "has_intake_red_flag": has_intake_rf,
            "has_mews_alert": has_mews_alert,
            "mews_score": current_mews,
            "deterioration_risk": current_risk,
            "triage_level": patient_info.get("triage_level", 3),
            "discharge_ready": bool(patient_info.get("discharge_ready")),
            "needs_icu": bool(patient_info.get("needs_icu")),
            "active_bed": active_bed.get("bed_number") if active_bed else None,
            "ward": active_bed.get("ward") if active_bed else None,
            "bed_type": active_bed.get("bed_type") if active_bed else None
        },
        "conversations": conversations,
        "conversation_alerts": conversation_alerts,
        "medical_documents": all_documents,
        "contradictions": all_contradictions,
        "clinical_summaries": emr_records,
        "external_emr_consents": external_consents,
        "vitals": {
            "latest": latest_vitals,
            "history": vitals_history,
            "count": len(vitals_history)
        },
        "mews_assessments": mews_assessments,
        "risk_assessments": ml_assessments,
        "bed_information": {
            "active_bed": active_bed,
            "all_allocations": bed_rows
        },
        "care_plans": care_plans,
        "transfers": transfers,
        "timeline": timeline
    }


# =========================
# INITIALIZE DATABASE
# =========================

create_tables()
seed_default_doctors()
seed_default_hospitals_and_staff()
create_patient_care_tables()
seed_default_patient_care_beds()