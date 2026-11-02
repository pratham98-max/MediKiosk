"""
MediKiosk – Complete Dataset Seeder
====================================
Run this script from the backend/ directory to populate the database
with realistic demo data for patients, doctors, and consultation sessions.

Usage:
    cd "a:\\college\\SIH -MK\\Medikiosk\\backend"
    python seed_dataset.py
"""

import sqlite3
import json
import uuid
import secrets
import hashlib
from datetime import datetime, timedelta
import random
import sys
import os

# ── Make sure we can import from database.py ──────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
from database import get_connection, create_tables, hash_password


# =============================================================================
# SEED DATA
# =============================================================================

DOCTORS = [
    {
        "name": "Dr. Priya Sharma",
        "email": "dr.priya@hospital.com",
        "department": "General Medicine",
        "specialty": "Internal Medicine & General Physician",
        "room": "OPD Room 105",
        "password": "doctor123",
    },
    {
        "name": "Dr. Rajesh Gupta",
        "email": "dr.rajesh@hospital.com",
        "department": "Cardiology",
        "specialty": "Interventional Cardiology & Heart Health",
        "room": "OPD Room 102",
        "password": "doctor123",
    },
    {
        "name": "Dr. Arvind Patel",
        "email": "dr.arvind@hospital.com",
        "department": "Orthopedics",
        "specialty": "Joints, Bones & Sports Injury",
        "room": "OPD Room 204",
        "password": "doctor123",
    },
    {
        "name": "Dr. Sunita Kulkarni",
        "email": "dr.sunita@hospital.com",
        "department": "Pediatrics",
        "specialty": "Child Health & Adolescent Care",
        "room": "OPD Room 210",
        "password": "doctor123",
    },
    {
        "name": "Dr. Manoj Verma",
        "email": "dr.manoj@hospital.com",
        "department": "ENT (Ear, Nose, Throat)",
        "specialty": "Head & Neck Specialist",
        "room": "OPD Room 301",
        "password": "doctor123",
    },
    {
        "name": "Dr. Ananya Nair",
        "email": "dr.ananya@hospital.com",
        "department": "Dermatology",
        "specialty": "Skin, Hair & Allergy Specialist",
        "room": "OPD Room 308",
        "password": "doctor123",
    },
]

PATIENTS = [
    {"full_name": "Ramesh Joshi",      "email": "ramesh.joshi@gmail.com",      "phone": "9876543210", "age": 45, "gender": "Male",   "password": "patient123"},
    {"full_name": "Sunita Devi",       "email": "sunita.devi@gmail.com",        "phone": "9123456780", "age": 32, "gender": "Female", "password": "patient123"},
    {"full_name": "Arun Kumar Singh",  "email": "arun.singh@gmail.com",         "phone": "8765432100", "age": 60, "gender": "Male",   "password": "patient123"},
    {"full_name": "Meena Patel",       "email": "meena.patel@gmail.com",        "phone": "9988776655", "age": 28, "gender": "Female", "password": "patient123"},
    {"full_name": "Vikram Desai",      "email": "vikram.desai@gmail.com",       "phone": "7845612390", "age": 38, "gender": "Male",   "password": "patient123"},
    {"full_name": "Priyanka Sharma",   "email": "priyanka.sharma@gmail.com",    "phone": "9654321870", "age": 25, "gender": "Female", "password": "patient123"},
    {"full_name": "Ajay Yadav",        "email": "ajay.yadav@gmail.com",         "phone": "8132456789", "age": 52, "gender": "Male",   "password": "patient123"},
    {"full_name": "Kavita Mishra",     "email": "kavita.mishra@gmail.com",      "phone": "9012345678", "age": 41, "gender": "Female", "password": "patient123"},
    {"full_name": "Mohan Lal Gupta",   "email": "mohan.gupta@gmail.com",        "phone": "7634521890", "age": 67, "gender": "Male",   "password": "patient123"},
    {"full_name": "Anita Verma",       "email": "anita.verma@gmail.com",        "phone": "9345678901", "age": 35, "gender": "Female", "password": "patient123"},
    {"full_name": "Sanjay Tiwari",     "email": "sanjay.tiwari@gmail.com",      "phone": "8901234567", "age": 48, "gender": "Male",   "password": "patient123"},
    {"full_name": "Rekha Bose",        "email": "rekha.bose@gmail.com",         "phone": "9567891234", "age": 22, "gender": "Female", "password": "patient123"},
    {"full_name": "Dinesh Choudhary",  "email": "dinesh.choudhary@gmail.com",   "phone": "7890123456", "age": 55, "gender": "Male",   "password": "patient123"},
    {"full_name": "Lalita Nair",       "email": "lalita.nair@gmail.com",        "phone": "9234567890", "age": 30, "gender": "Female", "password": "patient123"},
    {"full_name": "Rajiv Malhotra",    "email": "rajiv.malhotra@gmail.com",     "phone": "8456789012", "age": 43, "gender": "Male",   "password": "patient123"},
]

# Realistic interview chat transcripts per department
TRANSCRIPTS = {
    "General Medicine": [
        ("ai",   "Hello! What health problem are you experiencing today?"),
        ("user", "I have been having fever and body ache for the past 3 days."),
        ("ai",   "I'm sorry to hear that. How high is your fever? Have you measured it?"),
        ("user", "Yes, it goes up to 102 degrees F in the evenings. Drops to 99 in the morning."),
        ("ai",   "Do you have any cough, cold, or difficulty breathing along with the fever?"),
        ("user", "Yes, mild dry cough and runny nose. No breathing difficulty."),
        ("ai",   "Do you have any known allergies or are you currently on any medication?"),
        ("user", "No allergies. I take metformin for diabetes."),
        ("ai",   "Thank you. Have you experienced similar episodes in the past?"),
        ("user", "Yes, last year I had viral fever too. Recovered in 5 days."),
        ("ai",   "I have gathered enough information. Please proceed to the doctor."),
    ],
    "Cardiology": [
        ("ai",   "Hello! What health problem are you experiencing today?"),
        ("user", "I have been having chest pain and shortness of breath for the past 2 days."),
        ("ai",   "Is the chest pain constant or does it come and go?"),
        ("user", "It comes and goes, mostly when I climb stairs or walk fast."),
        ("ai",   "Do you have any history of heart disease, high blood pressure, or diabetes?"),
        ("user", "Yes, I have hypertension. I take amlodipine 5mg daily."),
        ("ai",   "Have you experienced palpitations or irregular heartbeat?"),
        ("user", "Yes, sometimes my heart feels like it is racing."),
        ("ai",   "Any swelling in legs or ankles?"),
        ("user", "Mild swelling in both ankles in the evenings."),
        ("ai",   "Do you smoke or drink alcohol?"),
        ("user", "I used to smoke but quit 5 years ago. Occasional alcohol."),
        ("ai",   "Thank you. The doctor will review your information shortly."),
    ],
    "Orthopedics": [
        ("ai",   "Hello! What health problem are you experiencing today?"),
        ("user", "I have severe knee pain in my right knee for about 2 weeks."),
        ("ai",   "Is the pain constant or does it worsen with activity?"),
        ("user", "It worsens when I walk or climb stairs. At rest it is a dull ache."),
        ("ai",   "Any swelling, stiffness, or redness around the knee?"),
        ("user", "Yes, mild swelling and morning stiffness for about 30 minutes."),
        ("ai",   "Have you had any injury or fall that could have caused this?"),
        ("user", "No injury. The pain started gradually."),
        ("ai",   "Do you have any prior diagnosis of arthritis or joint problems?"),
        ("user", "Doctor suspected osteoarthritis last year but I didn't follow up."),
        ("ai",   "Are you on any pain medications currently?"),
        ("user", "I take ibuprofen when the pain is unbearable."),
        ("ai",   "Thank you for the information. Please see the doctor now."),
    ],
    "Pediatrics": [
        ("ai",   "Hello! What health problem is your child experiencing today?"),
        ("user", "My 8 year old son has had fever and ear pain since yesterday."),
        ("ai",   "How high is the fever? Has it been measured?"),
        ("user", "About 101 degrees F. He keeps touching his left ear."),
        ("ai",   "Does he have any discharge from the ear?"),
        ("user", "I noticed some yellowish discharge this morning."),
        ("ai",   "Is he having difficulty hearing or complaining of ringing in the ear?"),
        ("user", "He says sounds are muffled. No ringing mentioned."),
        ("ai",   "Any throat pain, cold, or recent swimming?"),
        ("user", "He had a mild cold last week. He swims on weekends."),
        ("ai",   "Is he on any medications? Any known allergies?"),
        ("user", "No regular medications. No known allergies."),
        ("ai",   "Thank you. The pediatrician will see you shortly."),
    ],
    "ENT (Ear, Nose, Throat)": [
        ("ai",   "Hello! What health problem are you experiencing today?"),
        ("user", "I have had a sore throat and difficulty swallowing for 4 days."),
        ("ai",   "Is the throat pain constant or worse when swallowing?"),
        ("user", "Much worse when I swallow. Even water is painful."),
        ("ai",   "Do you have fever, hoarseness, or ear pain?"),
        ("user", "Yes, low grade fever around 100 degrees F and mild hoarseness."),
        ("ai",   "Any swelling in the neck or jaw area?"),
        ("user", "Yes, I can feel a lump on the right side of my neck."),
        ("ai",   "Have you had recurrent throat infections in the past?"),
        ("user", "Yes, 3 to 4 times a year I get tonsillitis."),
        ("ai",   "Are you currently on any medications?"),
        ("user", "I started antibiotics two days ago but no improvement."),
        ("ai",   "Thank you. The ENT specialist will review your case now."),
    ],
    "Dermatology": [
        ("ai",   "Hello! What health problem are you experiencing today?"),
        ("user", "I have an itchy red rash on my arms and back for about a week."),
        ("ai",   "Is the rash spreading or staying in the same area?"),
        ("user", "It started on my arms and now it is on my back too. Spreading slowly."),
        ("ai",   "Does the rash have blisters, scales, or is it flat?"),
        ("user", "Flat red patches with some scaling. Very itchy especially at night."),
        ("ai",   "Have you started any new soaps, detergents, or medications recently?"),
        ("user", "I switched to a new detergent about 10 days ago."),
        ("ai",   "Any history of eczema, psoriasis, or skin allergies?"),
        ("user", "I had eczema as a child but it resolved. No current history."),
        ("ai",   "Have you applied anything on the rash to relieve it?"),
        ("user", "Calamine lotion. Gives temporary relief for an hour or so."),
        ("ai",   "Thank you. The dermatologist will examine you now."),
    ],
}

FINAL_REPORTS = {
    "General Medicine": """### Chief Complaint
Patient presents with 3-day history of fever (up to 102F), body ache, mild dry cough, and rhinorrhea.

### History of Present Illness
- Fever: cyclical pattern, higher in evenings (102F), lower in mornings (99F)
- Associated symptoms: dry cough, runny nose, general malaise
- No dyspnea, no chest pain, no vomiting

### Past Medical History
- Type 2 Diabetes Mellitus - on Metformin
- Similar viral illness last year, self-resolved in 5 days

### Medications
- Metformin (dose not specified) for diabetes management

### Allergies
- NKDA (No Known Drug Allergies)

### Assessment
Clinical picture consistent with acute viral upper respiratory tract infection. Consider influenza vs. common cold.

### Suggested Work-up
- CBC with differential
- Random blood glucose (given diabetic status)
- CRP / ESR if prolonged fever""",

    "Cardiology": """### Chief Complaint
Patient presents with exertional chest pain and breathlessness for 2 days.

### History of Present Illness
- Chest pain: exertional, relieved at rest
- Breathlessness on climbing stairs or fast walking
- Palpitations: occasional racing sensation
- Bilateral ankle edema (mild, evening onset)

### Past Medical History
- Essential Hypertension - on Amlodipine 5mg OD
- Ex-smoker (quit 5 years ago)
- Occasional alcohol consumption

### Medications
- Amlodipine 5mg once daily

### Assessment
Exertional angina vs stable ischemic heart disease. Rule out ACS in the context of hypertension and prior smoking.

### Suggested Work-up
- Resting ECG
- 2D Echocardiogram
- Troponin I/T
- Lipid profile, HbA1c
- Stress test (after ruling out ACS)""",

    "Orthopedics": """### Chief Complaint
Right knee pain of 2 weeks duration, insidious onset, progressively worsening.

### History of Present Illness
- Pain worsens with weight bearing, stair climbing
- Morning stiffness lasting approximately 30 minutes
- Mild periarticular swelling noted
- No traumatic etiology

### Past Medical History
- Suspected osteoarthritis (not formally worked up)
- Self-medicating with Ibuprofen PRN

### Medications
- Ibuprofen 400mg PRN

### Assessment
Clinical presentation suggestive of osteoarthritis right knee. Consider degenerative joint disease.

### Suggested Work-up
- X-ray right knee (AP and lateral views)
- Serum uric acid (to rule out gout)
- ESR, CRP
- MRI if X-ray inconclusive""",

    "Pediatrics": """### Chief Complaint
8-year-old male with left ear pain, fever, and yellowish ear discharge since yesterday.

### History of Present Illness
- Fever 101F
- Left otalgia with purulent discharge this morning
- Muffled hearing in left ear
- Antecedent mild URTI last week
- Regular swimmer

### Past Medical History
- No chronic conditions, no prior ear infections

### Medications
- None

### Allergies
- NKDA

### Assessment
Acute suppurative otitis media (ASOM) left ear. Likely secondary to preceding viral URTI and water entry during swimming.

### Suggested Work-up
- Otoscopy
- Tympanometry
- Ear swab culture and sensitivity
- Hearing assessment if indicated""",

    "ENT (Ear, Nose, Throat)": """### Chief Complaint
Recurrent tonsillitis - current episode: severe odynophagia, hoarseness, cervical lymphadenopathy for 4 days.

### History of Present Illness
- Severe sore throat, dysphagia to liquids
- Fever 100F
- Right-sided cervical lymph node enlargement
- Hoarse voice
- Currently on empirical antibiotics (day 2) - no improvement

### Past Medical History
- Recurrent tonsillitis: 3-4 episodes per year

### Medications
- Antibiotics (type not specified, day 2)

### Assessment
Recurrent tonsillitis with possible peritonsillar involvement. Antibiotic failure raises concern for bacterial tonsillitis (Group A Strep) vs peritonsillar abscess.

### Suggested Work-up
- Throat swab for culture
- Rapid Strep test
- Ultrasound neck if peritonsillar abscess suspected
- Consider tonsillectomy referral given recurrence pattern""",

    "Dermatology": """### Chief Complaint
Generalized pruritic erythematous rash with scaling on arms and back for 1 week.

### History of Present Illness
- Flat, erythematous patches with fine scaling
- Progressive spread from arms to back
- Severe pruritus, worse at night
- Temporal association with change in laundry detergent (10 days ago)
- Temporary relief with calamine lotion

### Past Medical History
- Childhood eczema (resolved)
- No current skin conditions

### Medications
- Calamine lotion topically PRN

### Allergies
- NKDA (possible contact allergen to new detergent)

### Assessment
Contact dermatitis - likely irritant or allergic type secondary to new detergent. Rule out early psoriasis given scaling.

### Suggested Work-up
- Patch testing
- Skin scraping (KOH) to rule out fungal etiology
- Serum IgE if allergic etiology suspected""",
}


# =============================================================================
# SEEDER FUNCTIONS
# =============================================================================

def _otp():
    """Generate a 6-digit numeric OTP."""
    return str(random.randint(100000, 999999))


def seed_doctors(conn):
    cursor = conn.cursor()
    seeded = 0
    for doc in DOCTORS:
        doctor_id = "doc-" + doc["name"].lower().replace(" ", "-").replace(".", "")
        pwd_hash, salt = hash_password(doc["password"])
        try:
            cursor.execute(
                """
                INSERT OR IGNORE INTO doctors
                    (doctor_id, name, email, department, specialty, room, password_hash, salt, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    doctor_id,
                    doc["name"],
                    doc["email"],
                    doc["department"],
                    doc["specialty"],
                    doc["room"],
                    pwd_hash,
                    salt,
                    datetime.now().isoformat(),
                ),
            )
            if cursor.rowcount:
                seeded += 1
        except Exception as e:
            print("  [WARN] Doctor {}: {}".format(doc["name"], e))
    print("  Seeded {} doctor(s) (skipped existing).".format(seeded))


def seed_patients(conn):
    cursor = conn.cursor()
    seeded_patients = []
    for p in PATIENTS:
        patient_id = str(uuid.uuid4())
        pwd_hash, salt = hash_password(p["password"])
        try:
            cursor.execute(
                """
                INSERT OR IGNORE INTO patients
                    (patient_id, full_name, email, phone, age, gender, password_hash, salt, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    patient_id,
                    p["full_name"],
                    p["email"],
                    p["phone"],
                    p["age"],
                    p["gender"],
                    pwd_hash,
                    salt,
                    datetime.now().isoformat(),
                ),
            )
            if cursor.rowcount:
                seeded_patients.append(dict(p, patient_id=patient_id))
            else:
                # Already exists - fetch their ID
                cursor.execute("SELECT patient_id FROM patients WHERE email = ?", (p["email"],))
                row = cursor.fetchone()
                if row:
                    seeded_patients.append(dict(p, patient_id=row[0]))
        except Exception as e:
            print("  [WARN] Patient {}: {}".format(p["full_name"], e))
    print("  Seeded/located {} patient(s).".format(len(seeded_patients)))
    return seeded_patients


def seed_sessions(conn, patients):
    cursor = conn.cursor()
    departments = list(TRANSCRIPTS.keys())
    doctor_map = {
        "General Medicine":        ("Dr. Priya Sharma",    "OPD Room 105"),
        "Cardiology":              ("Dr. Rajesh Gupta",    "OPD Room 102"),
        "Orthopedics":             ("Dr. Arvind Patel",    "OPD Room 204"),
        "Pediatrics":              ("Dr. Sunita Kulkarni", "OPD Room 210"),
        "ENT (Ear, Nose, Throat)": ("Dr. Manoj Verma",    "OPD Room 301"),
        "Dermatology":             ("Dr. Ananya Nair",     "OPD Room 308"),
    }

    session_count = 0
    now = datetime.now()

    for i, patient in enumerate(patients):
        dept = departments[i % len(departments)]
        doctor_name, room = doctor_map[dept]
        session_id = "SESS-DEMO-{:04d}".format(i + 1)
        otp = "{:06d}".format(837180 + i if i != 0 else 83718)  # Deterministic testable OTPs
        if len(otp) > 6:
            otp = otp[:6]
        elif len(otp) < 6:
            otp = otp.zfill(6)

        # First session is in_consultation, others are ready_for_opd (Waiting for Doctor)
        if i == 0:
            status = "in_consultation"
        elif i % 5 == 0:
            status = "completed"
        else:
            status = "ready_for_opd"

        created_at = (now - timedelta(minutes=15 * (len(patients) - i))).isoformat()
        lang = "en"



        try:
            cursor.execute(
                """
                INSERT OR IGNORE INTO sessions
                    (session_id, patient_id, language, doctor_name, department,
                     otp_code, status, final_report, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    patient["patient_id"],
                    lang,
                    doctor_name,
                    dept,
                    otp,
                    status,
                    FINAL_REPORTS.get(dept, ""),
                    created_at,
                ),
            )
        except Exception as e:
            print("  [WARN] Session for {}: {}".format(patient["full_name"], e))
            continue

        # Seed messages
        transcript = TRANSCRIPTS.get(dept, [])
        for sender, text in transcript:
            try:
                cursor.execute(
                    "INSERT INTO messages (session_id, sender, message, created_at) VALUES (?, ?, ?, ?)",
                    (session_id, sender, text, created_at),
                )
            except Exception as e:
                print("  [WARN] Message: {}".format(e))

        session_count += 1

    print("  Seeded {} session(s) with full transcripts and clinical reports.".format(session_count))


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("\n" + "=" * 60)
    print("  MediKiosk Dataset Seeder")
    print("=" * 60)

    print("\n[1/4] Initialising database tables...")
    create_tables()
    print("  Done.")

    conn = get_connection()
    try:
        print("\n[2/4] Seeding doctors...")
        seed_doctors(conn)

        print("\n[3/4] Seeding patients...")
        patients = seed_patients(conn)

        print("\n[4/4] Seeding consultation sessions & transcripts...")
        seed_sessions(conn, patients)

        conn.commit()
    finally:
        conn.close()

    print("\n" + "=" * 60)
    print("  Done! Dataset seeded successfully.")
    print("=" * 60)
    print("""
  Demo Credentials
  --------------------------------------------------------
  Doctors  - password: doctor123
    dr.priya@hospital.com    (General Medicine, OPD 105)
    dr.rajesh@hospital.com   (Cardiology, OPD 102)
    dr.arvind@hospital.com   (Orthopedics, OPD 204)
    dr.sunita@hospital.com   (Pediatrics, OPD 210)
    dr.manoj@hospital.com    (ENT, OPD 301)
    dr.ananya@hospital.com   (Dermatology, OPD 308)

  Patients - password: patient123
    ramesh.joshi@gmail.com       45yr Male   - General Medicine
    sunita.devi@gmail.com        32yr Female - Cardiology
    arun.singh@gmail.com         60yr Male   - Orthopedics
    meena.patel@gmail.com        28yr Female - Pediatrics
    vikram.desai@gmail.com       38yr Male   - ENT
    priyanka.sharma@gmail.com    25yr Female - Dermatology
    ... and 9 more patients

  OTP Token - patients share verbally with the doctor at the desk.
  --------------------------------------------------------
""")


if __name__ == "__main__":
    main()
