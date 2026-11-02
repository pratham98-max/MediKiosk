# =========================
# IMPORTS
# =========================

import os
import uuid
import sqlite3
import shutil
import json

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq
from pydantic import BaseModel

from app.services.ocr_service import extract_text_from_image
from app.routers.patient_care import router as patient_care_router

from database import (
    create_tables,
    save_session,
    save_message,
    get_messages,
    session_exists,
    save_document,
    get_documents,
    save_contradiction,
    get_pending_contradiction,
    resolve_contradiction,
    get_contradictions,
    register_patient,
    authenticate_patient,
    get_patient_by_id,
    get_patient_sessions,
    authenticate_doctor,
    get_doctor_by_id,
    list_doctors,
    generate_session_otp,
    get_session_by_id,
    get_opd_queue,
    verify_patient_by_otp,
    complete_consultation,
    save_doctor_remark,
    set_session_red_flag,
    acknowledge_red_flag,
    list_hospitals,
    authenticate_staff,
    get_staff_dashboard,
    get_staff_patients,
    get_staff_red_flags,
    record_external_consent,
    get_external_consent,
    query_mock_external_emrs,
    save_doctor_edited_report,
    confirm_and_store_current_hospital_emr,
    get_hospital_emr_records,
    get_patient_unified_profile,
    get_patient_timeline
)


# =========================
# ENVIRONMENT SETUP
# =========================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = Groq(
    api_key=GROQ_API_KEY or "gsk_placeholder_for_local_dev"
)


# =========================
# FASTAPI APP
# =========================

app = FastAPI(
    title="MediKiosk API",
    description="AI-Assisted Patient History and Clinical Intelligence System",
    version="1.0.0"
)


# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# PATIENT CARE MODULE ROUTER
# =========================

app.include_router(
    patient_care_router,
    prefix="/staff/patient-care",
    tags=["Patient Care Module"]
)


# =========================
# CREATE DATABASE TABLES
# =========================

create_tables()


# =========================
# LANGUAGE CONFIGURATION
# =========================

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi"
}


def get_default_error_message(language):

    messages = {
        "en": "Could you please provide a little more information?",
        "hi": "कृपया थोड़ी और जानकारी दे सकते हैं?",
        "mr": "कृपया आणखी थोडी माहिती देऊ शकता का?"
    }

    return messages.get(
        language,
        messages["en"]
    )


# =========================
# BASIC ENDPOINTS
# =========================

@app.get("/")
def home():

    return {
        "message": "Welcome to MediKiosk API",
        "status": "running"
    }


@app.get("/health")
def health_check():

    return {
        "status": "healthy"
    }


# =========================
# LANGUAGE ENDPOINT
# =========================

@app.get("/languages")
def get_languages():

    return {
        "languages": [
            {
                "code": "en",
                "name": "English",
                "native_name": "English"
            },
            {
                "code": "hi",
                "name": "Hindi",
                "native_name": "हिंदी"
            },
            {
                "code": "mr",
                "name": "Marathi",
                "native_name": "मराठी"
            }
        ]
    }


# =========================
# PATIENT AUTH MODELS & ROUTES
# =========================

class PatientRegisterRequest(BaseModel):
    full_name: str
    email: str = ""
    phone: str = ""
    age: int | None = None
    gender: str = ""
    password: str


class PatientLoginRequest(BaseModel):
    identifier: str
    password: str


@app.post("/patient/register")
def patient_register(request: PatientRegisterRequest):
    if not request.full_name or not request.full_name.strip():
        return {"success": False, "error": "Full name is required"}
    if not request.password or len(request.password) < 4:
        return {"success": False, "error": "Password must be at least 4 characters long"}
    if not request.email and not request.phone:
        return {"success": False, "error": "Please provide either an email or a phone number"}

    result = register_patient(
        full_name=request.full_name,
        email=request.email,
        phone=request.phone,
        age=request.age,
        gender=request.gender,
        password=request.password
    )
    return result


@app.post("/patient/login")
def patient_login(request: PatientLoginRequest):
    if not request.identifier or not request.password:
        return {"success": False, "error": "Please provide identifier and password"}

    result = authenticate_patient(
        identifier=request.identifier,
        password=request.password
    )
    return result


@app.get("/patient/profile/{patient_id}")
def get_patient_profile(patient_id: str):
    profile = get_patient_by_id(patient_id)
    if not profile:
        return {"success": False, "error": "Patient not found"}

    sessions = get_patient_sessions(patient_id)
    return {
        "success": True,
        "patient": profile,
        "sessions": sessions
    }


@app.get("/patient/{patient_id}/unified-profile")
def get_patient_unified_profile_route(patient_id: str):
    """Unified clinical profile across MediKiosk intake and Patient Care monitoring."""
    profile = get_patient_unified_profile(patient_id)
    if not profile:
        return {"success": False, "error": "Patient not found"}
    return profile



# =========================
# DOCTOR DIRECTORY & LIST
# =========================

HOSPITAL_DOCTORS = [
    {
        "id": "doc-1",
        "name": "Dr. Rajesh Gupta",
        "department": "Cardiology",
        "specialty": "Interventional Cardiology & Heart Health",
        "room": "OPD Room 102",
        "available": True
    },
    {
        "id": "doc-2",
        "name": "Dr. Priya Sharma",
        "department": "General Medicine",
        "specialty": "Internal Medicine & General Physician",
        "room": "OPD Room 105",
        "available": True
    },
    {
        "id": "doc-3",
        "name": "Dr. Arvind Patel",
        "department": "Orthopedics",
        "specialty": "Joints, Bones & Sports Injury",
        "room": "OPD Room 204",
        "available": True
    },
    {
        "id": "doc-4",
        "name": "Dr. Sunita Kulkarni",
        "department": "Pediatrics",
        "specialty": "Child Health & Adolescent Care",
        "room": "OPD Room 210",
        "available": True
    },
    {
        "id": "doc-5",
        "name": "Dr. Manoj Verma",
        "department": "ENT (Ear, Nose, Throat)",
        "specialty": "Head & Neck Specialist",
        "room": "OPD Room 301",
        "available": True
    },
    {
        "id": "doc-6",
        "name": "Dr. Ananya Nair",
        "department": "Dermatology",
        "specialty": "Skin, Hair & Allergy Specialist",
        "room": "OPD Room 308",
        "available": True
    }
]


@app.get("/doctors")
def get_doctors():
    return {
        "success": True,
        "doctors": HOSPITAL_DOCTORS,
        "departments": [
            "General Medicine",
            "Cardiology",
            "Orthopedics",
            "Pediatrics",
            "ENT (Ear, Nose, Throat)",
            "Dermatology",
            "Other / General Consultation"
        ]
    }


# =========================
# DOCTOR AUTH & CLINICAL MANAGEMENT
# =========================

class DoctorLoginRequest(BaseModel):
    identifier: str
    password: str


class DoctorVerifyOtpRequest(BaseModel):
    doctor_id: str
    otp_code: str
    session_id: str | None = None


class DoctorCompleteConsultationRequest(BaseModel):
    session_id: str
    doctor_notes: str = ""


@app.post("/doctor/login")
def doctor_login(request: DoctorLoginRequest):
    if not request.identifier or not request.password:
        return {"success": False, "error": "Please provide your doctor email/name and password"}
    result = authenticate_doctor(request.identifier, request.password)
    return result


@app.get("/doctor/queue")
def doctor_queue(doctor_name: str | None = None, department: str | None = None):
    queue = get_opd_queue(doctor_name=doctor_name, department=department)
    return {"success": True, "queue": queue}


@app.post("/doctor/verify-otp")
def doctor_verify_otp(request: DoctorVerifyOtpRequest):
    if not request.otp_code or not request.otp_code.strip():
        return {"success": False, "error": "Please enter the 6-digit OTP passcode"}
    result = verify_patient_by_otp(
        doctor_id=request.doctor_id,
        otp_code=request.otp_code,
        session_id=request.session_id
    )
    return result


@app.get("/doctor/patient/{session_id}")
def doctor_get_patient_session(session_id: str):
    sess = get_session_by_id(session_id)
    if not sess:
        return {"success": False, "error": "Patient session not found"}
    msgs = get_messages(session_id)
    docs = get_documents(session_id)
    contra = get_contradictions(session_id)
    return {
        "success": True,
        "session": sess,
        "messages": msgs,
        "documents": docs,
        "contradictions": contra
    }


@app.post("/doctor/complete-consultation")
def doctor_complete_consultation(request: DoctorCompleteConsultationRequest):
    if not request.session_id:
        return {"success": False, "error": "Session ID is required"}
    result = complete_consultation(request.session_id, request.doctor_notes)
    return result


class DoctorSaveRemarkRequest(BaseModel):
    session_id: str
    doctor_notes: str = ""


@app.post("/doctor/save-remark")
def doctor_save_remark(request: DoctorSaveRemarkRequest):
    """Save doctor's running notes/remarks without marking the session complete."""
    if not request.session_id:
        return {"success": False, "error": "Session ID is required"}
    result = save_doctor_remark(request.session_id, request.doctor_notes)
    return result


@app.get("/session/{session_id}/otp")
def get_session_otp(session_id: str):
    sess = get_session_by_id(session_id)
    if not sess:
        return {"success": False, "error": "Session not found"}
    
    otp = sess.get("otp_code")
    if not otp:
        otp = generate_session_otp(session_id, sess.get("final_report"))
        sess = get_session_by_id(session_id)
    
    doc_name = sess.get("doctor_name") or "Dr. On-Duty Physician"
    doc_room = "OPD Room 105"
    for doc in HOSPITAL_DOCTORS:
        if doc["name"] == doc_name:
            doc_room = doc.get("room", "OPD Room 105")
            break

    return {
        "success": True,
        "session_id": session_id,
        "otp_code": otp,
        "status": sess.get("status", "ready_for_opd"),
        "doctor_name": doc_name,
        "department": sess.get("department", "General Medicine"),
        "room": doc_room
    }



# =========================
# CREATE SESSION
# =========================

class SessionRequest(BaseModel):

    language: str
    patient_id: str | None = None
    doctor_name: str | None = None
    department: str | None = None
    hospital_id: str | None = None


@app.post("/session")
def create_session(request: SessionRequest):

    language = request.language.lower()

    if language not in LANGUAGE_NAMES:

        language = "en"

    session_id = str(uuid.uuid4())

    save_session(
        session_id,
        language,
        request.patient_id,
        request.doctor_name,
        request.department,
        request.hospital_id or "hosp-medikiosk"
    )

    return {
        "session_id": session_id,
        "language": language,
        "patient_id": request.patient_id,
        "doctor_name": request.doctor_name,
        "department": request.department,
        "hospital_id": request.hospital_id or "hosp-medikiosk"
    }


# =========================
# CHAT REQUEST MODEL
# =========================

class ChatRequest(BaseModel):

    message: str
    language: str
    session_id: str


# =========================
# AI CHAT ENDPOINT
# =========================

@app.post("/chat")
def chat(request: ChatRequest):

    if not session_exists(request.session_id):

        return {
            "error": "Invalid session ID"
        }


    selected_language = LANGUAGE_NAMES.get(
        request.language,
        "English"
    )


    # =========================
    # GET PREVIOUS MESSAGES
    # =========================

    previous_messages = get_messages(
        request.session_id
    )


    # =========================
    # SYSTEM PROMPT
    # =========================

    system_prompt = f"""
You are MediKiosk, an AI-assisted patient interview system.

The patient has selected {selected_language}.

Your task is to collect structured medical information
for a doctor.

Rules:

1. Respond only in {selected_language}.

2. Ask only ONE question at a time.

3. Be polite, simple, and easy to understand.

4. Do not diagnose.

5. Do not prescribe medicines.

6. Do not claim to replace a doctor.

7. Collect relevant information when applicable:

- main complaint
- symptom onset
- duration
- severity
- location
- nature of symptoms
- associated symptoms
- relevant medical history
- allergies
- current medications

8. Do not repeat questions already answered.

9. Analyze the complete conversation before asking
the next question.

10. Decide whether the interview should:

- continue
- completed
- red_flag

11. Use completed only when enough relevant
information has been collected for the doctor.

12. Use red_flag if the patient describes a potentially
urgent or dangerous situation.

13. When STATUS is completed or red_flag,
do NOT ask another question.

14. If STATUS is completed, provide a short polite
completion message instead of a question.

15. If STATUS is red_flag, provide a short urgent
instruction to seek immediate medical attention.
Do not diagnose.

Your response MUST follow EXACTLY:

STATUS: continue
REPLY: Your response here

Possible STATUS values:

continue
completed
red_flag
"""


    # =========================
    # CONVERT HISTORY
    # =========================

    conversation_history = []

    for message in previous_messages:

        role = (
            "user"
            if message["sender"] == "user"
            else "assistant"
        )

        conversation_history.append(
            {
                "role": role,
                "content": message["message"]
            }
        )


    # =========================
    # SAVE USER MESSAGE
    # =========================

    save_message(
        request.session_id,
        "user",
        request.message
    )


    # =========================
    # ADD CURRENT MESSAGE
    # =========================

    conversation_history.append(
        {
            "role": "user",
            "content": request.message
        }
    )


    conversation = [
        {
            "role": "system",
            "content": system_prompt
        }
    ] + conversation_history


    try:

        completion = client.chat.completions.create(

            model="openai/gpt-oss-120b",

            messages=conversation,

            temperature=0.4,

            max_tokens=300
        )


        ai_response = (
            completion
            .choices[0]
            .message
            .content
            .strip()
        )


        interview_status = "continue"
        ai_reply = ""


        # =========================
        # PARSE RESPONSE
        # =========================

        lines = ai_response.splitlines()

        for index, line in enumerate(lines):

            line = line.strip()

            if line.startswith("STATUS:"):

                interview_status = (
                    line
                    .replace("STATUS:", "")
                    .strip()
                    .lower()
                )

            elif line.startswith("REPLY:"):

                ai_reply = (
                    line
                    .replace("REPLY:", "")
                    .strip()
                )

                # Preserve additional reply lines
                remaining_lines = lines[index + 1:]

                if remaining_lines:

                    additional_text = "\n".join(
                        item.strip()
                        for item in remaining_lines
                        if item.strip()
                    )

                    if additional_text:

                        ai_reply += (
                            "\n" + additional_text
                        )

                break


        # =========================
        # VALIDATE STATUS
        # =========================

        if interview_status not in [
            "continue",
            "completed",
            "red_flag"
        ]:

            interview_status = "continue"


        # =========================
        # EMPTY RESPONSE
        # =========================

        if not ai_reply.strip():

            ai_reply = get_default_error_message(
                request.language
            )

            interview_status = "continue"


        # =========================
        # SAVE AI RESPONSE
        # =========================

        save_message(
            request.session_id,
            "ai",
            ai_reply
        )

        # =========================
        # PERSIST RED FLAG IN SQLITE
        # =========================
        if interview_status == "red_flag":
            set_session_red_flag(
                request.session_id,
                reason=ai_reply.split("\n")[0][:180] or "Urgent clinical condition detected by AI interview"
            )


        return {
            "reply": ai_reply,
            "interview_status": interview_status,
            "session_id": request.session_id
        }


    except Exception as e:

        print(
            "Groq API Error:",
            e
        )

        return {
            "reply": (
                "Sorry, I am unable to process "
                "your request right now."
            ),
            "interview_status": "error",
            "session_id": request.session_id
        }


# =========================
# VIEW SESSION
# =========================

@app.get("/session/{session_id}")
def get_session(session_id: str):

    if not session_exists(session_id):

        return {
            "error": "Invalid session ID"
        }


    messages = get_messages(
        session_id
    )

    return {
        "session_id": session_id,
        "messages": messages
    }


# =========================
# VIEW ALL SESSIONS
# =========================

@app.get("/sessions")
def get_all_sessions():

    connection = sqlite3.connect(
        "medikiosk.db"
    )

    connection.row_factory = sqlite3.Row

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM sessions
        ORDER BY created_at DESC
    """)

    rows = cursor.fetchall()

    connection.close()

    return [
        dict(row)
        for row in rows
    ]


# =========================
# BASIC INTERVIEW SUMMARY
# =========================

@app.get("/session/{session_id}/summary")
def get_basic_summary(session_id: str):

    if not session_exists(session_id):

        return {
            "error": "Invalid session ID"
        }


    messages = get_messages(
        session_id
    )


    if not messages:

        return {
            "error": "No conversation found"
        }


    conversation_text = ""

    for message in messages:

        speaker = (
            "Patient"
            if message["sender"] == "user"
            else "MediKiosk"
        )

        conversation_text += (
            f"{speaker}: "
            f"{message['message']}\n"
        )


    summary_prompt = f"""
You are MediKiosk.

Create a BASIC INTERVIEW SUMMARY.

Do NOT diagnose.

Do NOT prescribe medicine.

Do NOT add information that was not mentioned.

Use exactly this format:

### Chief complaint

Short summary of the main health problem.

### Trigger & onset

Describe when and how symptoms started.
If not mentioned, state that no specific trigger was reported.

### Character

Describe location, severity, duration,
or nature of symptoms.

### Associated symptoms

• List associated symptoms
• Include important denied symptoms if mentioned

### Interview status

Short statement about information collected.

PATIENT CONVERSATION:

{conversation_text}
"""


    try:

        completion = client.chat.completions.create(

            model="openai/gpt-oss-120b",

            messages=[
                {
                    "role": "system",
                    "content": summary_prompt
                }
            ],

            temperature=0.2,

            max_tokens=400
        )


        summary = (
            completion
            .choices[0]
            .message
            .content
            .strip()
        )


        return {
            "session_id": session_id,
            "summary": summary
        }


    except Exception as e:

        print(
            "Summary Generation Error:",
            e
        )

        return {
            "error": "Unable to generate summary"
        }


# =========================
# DOCUMENT OCR UPLOAD
# =========================

@app.post("/upload-documents")
async def upload_documents(

    session_id: str = Form(...),

    file: UploadFile = File(...)

):

    try:

        if not session_exists(session_id):

            return {
                "success": False,
                "error": "Invalid session ID"
            }


        os.makedirs(
            "uploads",
            exist_ok=True
        )


        unique_filename = (
            f"{uuid.uuid4()}_{file.filename}"
        )


        file_path = os.path.join(
            "uploads",
            unique_filename
        )


        # =========================
        # SAVE FILE
        # =========================

        with open(
            file_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


        # =========================
        # OCR EXTRACTION
        # =========================

        extracted_text = extract_text_from_image(
            file_path
        )


        document_text = ""

        if extracted_text.get("success"):

            document_text = extracted_text.get(
                "text",
                ""
            )


        # =========================
        # SAVE DOCUMENT
        # =========================

        save_document(
            session_id,
            file.filename,
            document_text
        )


        return {

            "success": True,

            "filename": file.filename,

            "extracted_text": extracted_text

        }


    except Exception as e:

        print(
            "Document Upload Error:",
            e
        )

        return {
            "success": False,
            "error": str(e)
        }


# =========================
# GET SESSION DOCUMENTS
# =========================

@app.get("/session/{session_id}/documents")
def get_session_documents(session_id: str):

    if not session_exists(session_id):

        return {
            "error": "Invalid session ID"
        }


    documents = get_documents(
        session_id
    )

    return {
        "session_id": session_id,
        "documents": documents
    }


# ==================================================
# CONTRADICTION DETECTION ENGINE
# ==================================================

@app.post(
    "/session/{session_id}/detect-contradictions"
)
def detect_contradictions(session_id: str):

    if not session_exists(session_id):

        return {
            "error": "Invalid session ID"
        }


    messages = get_messages(
        session_id
    )

    documents = get_documents(
        session_id
    )

    existing_contradictions = get_contradictions(
        session_id
    )


    # =========================
    # PREVENT DUPLICATE DETECTION
    # =========================

    if existing_contradictions:

        return {

            "session_id": session_id,

            "has_contradiction":
                len(existing_contradictions) > 0,

            "contradictions":
                existing_contradictions,

            "message":
                "Contradiction analysis already exists "
                "for this session."
        }


    # =========================
    # NO DOCUMENTS
    # =========================

    if not documents:

        return {

            "session_id": session_id,

            "has_contradiction": False,

            "contradictions": [],

            "message":
                "No documents available. "
                "No document-based contradictions to review."
        }


    # =========================
    # CREATE INTERVIEW TEXT
    # =========================

    conversation_text = ""

    for message in messages:

        speaker = (
            "Patient"
            if message["sender"] == "user"
            else "MediKiosk"
        )

        conversation_text += (
            f"{speaker}: "
            f"{message['message']}\n"
        )


    # =========================
    # CREATE DOCUMENT TEXT
    # =========================

    document_text = ""

    for document in documents:

        document_text += (
            f"\nDOCUMENT: "
            f"{document['filename']}\n"

            f"{document['extracted_text']}\n"
        )


    # =========================
    # CONTRADICTION PROMPT
    # =========================

    contradiction_prompt = f"""
You are the MediKiosk Clinical Contradiction Engine.

Compare the patient interview with the uploaded
medical document information.

Your job is NOT to diagnose.

Your job is to identify meaningful inconsistencies.

Examples:

- Patient says no regular medication,
  but a document lists a medication.

- Patient denies an allergy,
  but a medical document mentions an allergy.

- Patient gives a medication frequency that differs
  from the document.

- Patient reports no relevant medical history,
  but a document contains relevant history.

Ignore differences that are not clinically meaningful.

There may be ZERO, ONE, or MULTIPLE contradictions.

Return EXACTLY valid JSON.

Use this format:

{{
    "contradictions": [
        {{
            "category": "short topic",
            "patient_statement": "what patient said",
            "document_evidence": "what document says",
            "clarification_question": "one simple question",
            "options": [
                "Option 1",
                "Option 2",
                "Not sure"
            ]
        }}
    ]
}}

If there are no contradictions:

{{
    "contradictions": []
}}

PATIENT INTERVIEW:

{conversation_text}

UPLOADED DOCUMENTS:

{document_text}
"""


    try:

        completion = client.chat.completions.create(

            model="openai/gpt-oss-120b",

            messages=[
                {
                    "role": "system",
                    "content": contradiction_prompt
                }
            ],

            temperature=0.1,

            max_tokens=1000
        )


        result = (
            completion
            .choices[0]
            .message
            .content
            .strip()
        )


        # =========================
        # REMOVE MARKDOWN FENCES
        # =========================

        result = result.replace(
            "```json",
            ""
        ).replace(
            "```",
            ""
        ).strip()


        try:

            parsed_result = json.loads(
                result
            )

        except Exception:

            print(
                "Unable to parse contradiction JSON:",
                result
            )

            return {
                "error":
                    "Unable to parse contradiction engine response"
            }


        detected_contradictions = (
            parsed_result.get(
                "contradictions",
                []
            )
        )


        # =========================
        # SAVE CONTRADICTIONS
        # =========================

        saved_contradictions = []


        for contradiction in detected_contradictions:

            category = contradiction.get(
                "category",
                "General"
            )

            patient_statement = contradiction.get(
                "patient_statement",
                ""
            )

            document_evidence = contradiction.get(
                "document_evidence",
                ""
            )

            clarification_question = contradiction.get(
                "clarification_question",
                ""
            )

            options = contradiction.get(
                "options",
                []
            )


            contradiction_id = save_contradiction(

                session_id,

                category,

                patient_statement,

                document_evidence,

                clarification_question,

                options

            )


            saved_contradictions.append(
                {
                    "id": contradiction_id,

                    "category": category,

                    "patient_statement":
                        patient_statement,

                    "document_evidence":
                        document_evidence,

                    "clarification_question":
                        clarification_question,

                    "options":
                        options,

                    "status":
                        "pending"
                }
            )


        return {

            "session_id": session_id,

            "has_contradiction":
                len(saved_contradictions) > 0,

            "contradictions":
                saved_contradictions
        }


    except Exception as e:

        print(
            "Contradiction Engine Error:",
            e
        )

        return {
            "error":
                "Unable to detect contradictions"
        }


# ==================================================
# GET NEXT CONTRADICTION
# ==================================================

@app.get(
    "/session/{session_id}/next-contradiction"
)
def get_next_contradiction(
    session_id: str
):

    if not session_exists(session_id):

        return {
            "error": "Invalid session ID"
        }


    contradiction = (
        get_pending_contradiction(
            session_id
        )
    )


    if contradiction is None:

        return {

            "status": "completed",

            "message":
                "No pending contradictions found."
        }


    return {

        "status": "pending",

        "contradiction":
            contradiction

    }


# ==================================================
# CLARIFICATION LOOP
# ==================================================

class ClarificationRequest(BaseModel):

    answer: str


@app.post(
    "/contradiction/{contradiction_id}/clarify"
)
def clarify_contradiction(

    contradiction_id: int,

    request: ClarificationRequest

):

    # =========================
    # FIND CONTRADICTION
    # =========================

    connection = sqlite3.connect(
        "medikiosk.db"
    )

    connection.row_factory = sqlite3.Row

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM contradictions
        WHERE id = ?
        """,
        (contradiction_id,)
    )

    row = cursor.fetchone()

    connection.close()


    if row is None:

        return {
            "error":
                "Contradiction not found"
        }


    contradiction = dict(row)


    if contradiction["status"] == "resolved":

        return {
            "status": "resolved",
            "message":
                "This contradiction has already been resolved.",
            "final_value":
                contradiction["resolution_summary"]
        }


    # =========================
    # CLARIFICATION PROMPT
    # =========================

    clarification_prompt = f"""
You are MediKiosk.

A possible contradiction was found.

Your task is to clarify the inconsistency using
the patient's latest answer.

Original patient statement:

{contradiction['patient_statement']}

Document information:

{contradiction['document_evidence']}

Current clarification question:

{contradiction['clarification_question']}

Previous patient clarification:

{contradiction['patient_answer']}

Latest patient answer:

{request.answer}

Determine whether the contradiction is resolved.

Return EXACTLY one of these formats:

STATUS: resolved
FINAL_VALUE: concise final clarified information

OR

STATUS: continue
QUESTION: one additional simple clarification question

Rules:

- Do not diagnose.
- Do not prescribe medicine.
- Do not add information not provided.
- Use the patient's clarification to establish
  the final clarified information when possible.
- Ask another clarification only if the information
  is still genuinely unclear.
"""


    try:

        completion = client.chat.completions.create(

            model="openai/gpt-oss-120b",

            messages=[
                {
                    "role": "system",
                    "content": clarification_prompt
                }
            ],

            temperature=0.1,

            max_tokens=300
        )


        result = (
            completion
            .choices[0]
            .message
            .content
            .strip()
        )


        # =========================
        # RESOLVED
        # =========================

        if "status: resolved" in result.lower():

            final_value = ""


            for line in result.splitlines():

                line = line.strip()

                if line.startswith(
                    "FINAL_VALUE:"
                ):

                    final_value = (
                        line
                        .replace(
                            "FINAL_VALUE:",
                            ""
                        )
                        .strip()
                    )


            resolve_contradiction(

                contradiction_id,

                request.answer,

                final_value,

                "resolved"

            )


            return {

                "status":
                    "resolved",

                "final_value":
                    final_value,

                "message":
                    "Contradiction successfully resolved."

            }


        # =========================
        # MORE CLARIFICATION
        # =========================

        question = ""


        for line in result.splitlines():

            line = line.strip()

            if line.startswith(
                "QUESTION:"
            ):

                question = (
                    line
                    .replace(
                        "QUESTION:",
                        ""
                    )
                    .strip()
                )


        if not question:

            question = (
                contradiction[
                    "clarification_question"
                ]
            )


        # Keep contradiction pending

        resolve_contradiction(

            contradiction_id,

            request.answer,

            None,

            "pending"

        )


        return {

            "status":
                "continue",

            "question":
                question

        }


    except Exception as e:

        print(
            "Clarification Error:",
            e
        )

        return {

            "error":
                "Unable to process clarification"

        }


# ==================================================
# FINAL DOCTOR-READY REPORT
# ==================================================

@app.get(
    "/session/{session_id}/final-report"
)
def generate_final_report(
    session_id: str
):

    if not session_exists(session_id):

        return {
            "error":
                "Invalid session ID"
        }


    messages = get_messages(
        session_id
    )

    documents = get_documents(
        session_id
    )

    contradictions = get_contradictions(
        session_id
    )


    # =========================
    # BLOCK REPORT IF PENDING
    # =========================

    pending_contradiction = (
        get_pending_contradiction(
            session_id
        )
    )


    if pending_contradiction is not None:

        return {

            "status": "pending_clarification",

            "error":
                "Final report cannot be generated "
                "until all contradictions are resolved.",

            "next_contradiction":
                pending_contradiction
        }


    # =========================
    # CONVERSATION TEXT
    # =========================

    conversation_text = ""


    for message in messages:

        speaker = (
            "Patient"
            if message["sender"] == "user"
            else "MediKiosk"
        )

        conversation_text += (
            f"{speaker}: "
            f"{message['message']}\n"
        )


    # =========================
    # DOCUMENT TEXT
    # =========================

    document_text = ""


    if not documents:

        document_text = (
            "No medical documents were uploaded."
        )

    else:

        for document in documents:

            document_text += (

                f"\nDOCUMENT: "
                f"{document['filename']}\n"

                f"{document['extracted_text']}\n"

            )


    # =========================
    # CONTRADICTION TEXT
    # =========================

    contradiction_text = ""


    if not contradictions:

        contradiction_text = (
            "No clinically meaningful contradictions "
            "were detected."
        )

    else:

        for contradiction in contradictions:

            contradiction_text += f"""

CATEGORY:
{contradiction['category']}

ORIGINAL PATIENT STATEMENT:
{contradiction['patient_statement']}

DOCUMENT EVIDENCE:
{contradiction['document_evidence']}

CLARIFICATION QUESTION:
{contradiction['clarification_question']}

PATIENT CLARIFICATION:
{contradiction['patient_answer']}

RESOLUTION STATUS:
{contradiction['status']}

FINAL RESOLUTION:
{contradiction['resolution_summary']}

--------------------------------
"""


    # =========================
    # FINAL REPORT PROMPT
    # =========================

    report_prompt = f"""
You are MediKiosk.

Create a structured DOCTOR-READY CLINICAL CONTEXT report.

The purpose is to help a doctor quickly understand
information collected from:

1. Patient interview
2. Uploaded medical documents
3. Contradiction detection
4. Patient clarification responses

IMPORTANT:

Do NOT diagnose.

Do NOT prescribe treatment.

Do NOT invent facts.

Use only the information provided.

Use exactly these sections:

### Current symptoms

Summarize the patient's current complaint.

### Symptom details

Include onset, duration, severity, location,
character, and other relevant details.

### Associated symptoms

• List relevant associated symptoms.
• Include important denied symptoms when available.

### Relevant history

Summarize relevant medical history,
allergies, and other important history.

### Medication information

Summarize medication information from:

• Patient interview
• Uploaded documents
• Clarification responses

### Extracted document information

Summarize clinically relevant information
obtained from uploaded documents.

If no documents were uploaded, clearly state:

"No medical documents were uploaded."

### Contradiction & clarification results

For EVERY detected contradiction include:

• Category
• Original patient statement
• Document evidence
• Patient clarification
• Resolution status

If resolved, clearly mention:

"Resolved after clarification"

and state the final clarified information.

If no contradictions were detected, state:

"No clinically meaningful contradictions were detected."

### Neutral clinical context

Provide a concise neutral information summary
for the doctor.

Do NOT diagnose.

### Timeline

Create a chronological timeline using only
available information.

PATIENT INTERVIEW:

{conversation_text}

UPLOADED DOCUMENT INFORMATION:

{document_text}

CONTRADICTION ENGINE AND
CLARIFICATION RESULTS:

{contradiction_text}
"""


    try:

        completion = client.chat.completions.create(

            model="openai/gpt-oss-120b",

            messages=[
                {
                    "role": "system",
                    "content": report_prompt
                }
            ],

            temperature=0.2,

            max_tokens=1200
        )


        final_report = (
            completion
            .choices[0]
            .message
            .content
            .strip()
        )

        otp_code = generate_session_otp(session_id, final_report)
        sess = get_session_by_id(session_id)
        doc_name = sess.get("doctor_name") if sess else "Dr. On-Duty Physician"
        dept = sess.get("department") if sess else "General Medicine"

        doc_room = "OPD Room 105"
        for doc in HOSPITAL_DOCTORS:
            if doc["name"] == doc_name:
                doc_room = doc.get("room", "OPD Room 105")
                break

        return {
            "status": "completed",
            "session_id": session_id,
            "final_report": final_report,
            "contradictions": contradictions,
            "otp_code": otp_code,
            "doctor_name": doc_name,
            "department": dept,
            "room": doc_room,
            "queue_status": "ready_for_opd"
        }


    except Exception as e:

        print(
            "Final Report Error:",
            e
        )

        return {

            "error":
                "Unable to generate final report"

        }


# =============================================================================
# HOSPITALS ENDPOINT
# =============================================================================

@app.get("/hospitals")
def get_hospitals():
    """Lists available hospitals for patient selection."""
    hospitals = list_hospitals()
    return {"success": True, "hospitals": hospitals}


# =============================================================================
# HEALTHCARE STAFF PORTAL ENDPOINTS
# =============================================================================

class StaffLoginRequest(BaseModel):
    identifier: str
    password: str


@app.post("/staff/login")
def staff_login(request: StaffLoginRequest):
    """Staff authentication with hospital association."""
    if not request.identifier or not request.password:
        return {"success": False, "error": "Please provide your staff email and password"}
    result = authenticate_staff(request.identifier, request.password)
    return result


@app.get("/staff/dashboard")
def staff_dashboard(hospital_id: str = "hosp-medikiosk"):
    """
    Returns live database-driven statistics and status breakdown for staff's hospital.
    Used for 10s auto-refresh polling.
    """
    data = get_staff_dashboard(hospital_id)
    return data


@app.get("/staff/patients")
def staff_patients(hospital_id: str = "hosp-medikiosk", filter: str | None = None):
    """
    Returns patient tracking table for staff's hospital.
    Filters: all, in_process, pending_clarification, ready_for_doctor, red_flag, in_consultation, completed
    """
    patients = get_staff_patients(hospital_id, filter_status=filter)
    return {"success": True, "hospital_id": hospital_id, "patients": patients}


@app.get("/staff/red-flags")
def staff_red_flags(hospital_id: str = "hosp-medikiosk"):
    """Returns active red flag cases for the staff's hospital."""
    red_flags = get_staff_red_flags(hospital_id)
    return {"success": True, "hospital_id": hospital_id, "red_flags": red_flags}


@app.get("/staff/patient/{session_id}")
def staff_get_patient_case(session_id: str):
    """
    Comprehensive read-only case details modal for staff coordination.
    Does NOT allow staff clinical editing.
    """
    sess = get_session_by_id(session_id)
    if not sess:
        return {"success": False, "error": "Patient session not found"}

    docs = get_documents(session_id)
    contra = get_contradictions(session_id)
    consent = get_external_consent(session_id)

    return {
        "success": True,
        "session": sess,
        "documents": docs,
        "contradictions": contra,
        "external_consent": consent,
        "doctor_consultation_status": sess.get("status"),
        "final_report_available": bool(sess.get("final_report") or sess.get("doctor_edited_report"))
    }


class StaffAcknowledgeRequest(BaseModel):
    staff_id: str | None = None


@app.post("/staff/red-flag/{session_id}/acknowledge")
def staff_acknowledge_red_flag(session_id: str, request: StaffAcknowledgeRequest | None = None):
    """Staff acknowledges red-flag alert. Does NOT remove red flag from clinical record."""
    staff_id = request.staff_id if request else None
    result = acknowledge_red_flag(session_id, staff_id)
    return result


# =============================================================================
# EXTERNAL EMR CONSENT & TIMELINE ENDPOINTS
# =============================================================================

class ExternalConsentRequest(BaseModel):
    consented: bool


@app.post("/session/{session_id}/consent")
def set_session_external_consent(session_id: str, request: ExternalConsentRequest):
    """
    Records patient's explicit consent for accessing historical records
    from Apollo Clinic & City Diagnostics mock EMRs.
    """
    sess = get_session_by_id(session_id)
    if not sess:
        return {"success": False, "error": "Session not found"}

    external_data = None
    if request.consented:
        # Retrieve mock EMR historical data
        patient_name = sess.get("patient_name") or ""
        external_data = query_mock_external_emrs(patient_name, sess.get("patient_id"))
        records_json = json.dumps(external_data)
        record_external_consent(session_id, consented=True, external_records_json=records_json)
    else:
        record_external_consent(session_id, consented=False, external_records_json=None)

    return {
        "success": True,
        "session_id": session_id,
        "consented": request.consented,
        "external_data": external_data
    }


@app.get("/session/{session_id}/consent")
def get_session_external_consent_state(session_id: str):
    """Retrieves consent state and cached external records if consented."""
    consent = get_external_consent(session_id)
    if not consent:
        return {"success": True, "consented": False, "data": None}

    data = None
    if consent.get("consented") and consent.get("external_records_json"):
        try:
            data = json.loads(consent["external_records_json"])
        except Exception:
            data = None

    return {
        "success": True,
        "consented": bool(consent.get("consented")),
        "consented_at": consent.get("consented_at"),
        "data": data
    }


@app.get("/session/{session_id}/external-history")
def get_external_emr_history(session_id: str):
    """
    Returns external EMR records from Apollo Clinic & City Diagnostics
    ONLY IF the patient has given explicit consent.
    """
    consent = get_external_consent(session_id)
    if not consent or not consent.get("consented"):
        return {
            "success": True,
            "consented": False,
            "message": "External EMR access was not consented by the patient.",
            "apollo_records": [],
            "city_records": [],
            "timeline": []
        }

    sess = get_session_by_id(session_id)
    patient_name = sess.get("patient_name") if sess else ""
    external_data = query_mock_external_emrs(patient_name, sess.get("patient_id") if sess else None)

    return {
        "success": True,
        "consented": True,
        "apollo_records": external_data.get("apollo_records", []),
        "city_records": external_data.get("city_records", []),
        "timeline": external_data.get("timeline", [])
    }


# =============================================================================
# DOCTOR EDITABLE CLINICAL CONTEXT & HOSPITAL EMR STORAGE
# =============================================================================

class DoctorSaveEditedReportRequest(BaseModel):
    session_id: str
    edited_report: str


@app.post("/doctor/save-edited-report")
def doctor_save_edited_report(request: DoctorSaveEditedReportRequest):
    """
    Saves doctor's modifications to clinical context.
    Does NOT require AI call. Doctor has final authority.
    """
    if not request.session_id or not request.edited_report:
        return {"success": False, "error": "Session ID and edited report content are required"}
    result = save_doctor_edited_report(request.session_id, request.edited_report)
    return result


class DoctorConfirmEMRRequest(BaseModel):
    session_id: str
    hospital_id: str = "hosp-medikiosk"
    doctor_name: str = "Dr. Attending Physician"
    confirmed_report: str
    diagnosis: str | None = None
    medications: str | None = None
    lab_results: str | None = None
    notes: str | None = None


@app.post("/doctor/confirm-emr")
def doctor_confirm_emr(request: DoctorConfirmEMRRequest):
    """
    Doctor confirms and commits the final clinical package into the CURRENT hospital EMR.
    Stores only the doctor-confirmed version.
    """
    if not request.session_id or not request.confirmed_report:
        return {"success": False, "error": "Session ID and confirmed report are required"}

    result = confirm_and_store_current_hospital_emr(
        session_id=request.session_id,
        hospital_id=request.hospital_id,
        doctor_name=request.doctor_name,
        confirmed_report_text=request.confirmed_report,
        diagnosis=request.diagnosis,
        medications=request.medications,
        lab_results=request.lab_results,
        notes=request.notes
    )
    return result


@app.get("/emr/records")
def get_emr_records(hospital_id: str = "hosp-medikiosk"):
    """Lists confirmed hospital EMR records for audit."""
    records = get_hospital_emr_records(hospital_id)
    return {"success": True, "hospital_id": hospital_id, "records": records}