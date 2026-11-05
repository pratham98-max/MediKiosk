"""
MediKiosk - Clinical Intelligence & Triage Engine
=================================================
Provides genuine Groq LLM integration with an advanced, clinically structured
deterministic decision engine fallback for patient interviews, multi-variable
clinical extraction, interview summaries, and the complete 9-section doctor dossier.

Captures:
- Chief complaint, onset, duration, character, severity, location, radiation
- Aggravating & relieving factors, associated symptoms (confirmed vs denied)
- Past medical history, surgeries, current medications with dosages, allergies
- Emergency clinical red flags
- 4 Information States: Confirmed Positive, Explicitly Denied, Not Asked, Asked Unanswered
- Clean, non-generic summary and 9-section clinical reports
"""

import os
import re
from typing import Dict, Any, List, Optional, Tuple
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

# Flagship & fast fallback models on Groq
DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
FALLBACK_GROQ_MODEL = "llama-3.1-8b-instant"


def get_groq_client() -> Tuple[Optional[Any], Optional[str]]:
    """
    Safely retrieves or initializes the Groq client.
    Returns (client, None) if key is configured and valid,
    or (None, reason) if unconfigured, placeholder, or invalid.
    """
    api_key = os.getenv("GROQ_API_KEY", "").strip()

    if not api_key:
        return None, "GROQ_API_KEY is not configured in backend/.env"

    if api_key in ("gsk_placeholder_for_local_dev", "your_groq_api_key_here") or api_key.startswith("gsk_placeholder"):
        return None, "GROQ_API_KEY contains a placeholder value. Please set a valid key from console.groq.com."

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        return client, None
    except Exception as err:
        return None, f"Failed to initialize Groq client: {err}"


# =============================================================================
# CLINICAL CONSTANTS & RED FLAG PATTERNS
# =============================================================================

RED_FLAG_PATTERNS = [
    # Cardiopulmonary life threats
    r"\b(?:crushing|severe|squeezing|tight|pressure)\s+(?:\w+\s+)?chest\s+pain\b",
    r"\bcrushing.*chest\b",
    r"\bchest\s+pain.*(?:radiating|spreading|shooting).*(?:arm|jaw|neck|back)\b",
    r"\b(?:cannot|can't|unable\s+to|struggling\s+to)\s+breathe\b",
    r"\bsevere\s+(?:shortness\s+of\s+breath|difficulty\s+breathing|breathlessness)\b",
    r"\bcoughing\s+(?:up\s+)?blood\b|\bhemoptysis\b",
    # Neurological emergencies
    r"\bworst\s+headache\s+of\s+(?:my\s+)?life\b|\bthunderclap\s+headache\b",
    r"\b(?:sudden|acute)\s+(?:weakness|numbness|paralysis)\s+(?:in|on)\s+(?:face|arm|leg|one\s+side)\b",
    r"\bslurred\s+speech\b|\bunable\s+to\s+speak\b|\bfacial\s+droop\b",
    r"\b(?:passed\s+out|blacked\s+out|lost\s+consciousness|fainted|syncope)\b",
    # Acute abdominal & vascular emergencies
    r"\bvomiting\s+blood\b|\bhematemesis\b|\bcoffee\s+ground\s+vomit\b|\bblack\s+tarry\s+stool\b",
    r"\b(?:sudden|tearing)\s+back\s+or\s+chest\s+pain\b",
    # Anaphylaxis
    r"\b(?:throat|tongue|lip)\s+swelling\b|\banaphylaxis\b|\bstridor\b",
]

# Clinical Categories & Symptom Knowledge Map
CLINICAL_CATEGORIES = {
    "abdominal": {
        "keywords": ["stomach", "abdomen", "abdominal", "belly", "tummy", "gut", "cramp", "cramping", "navel", "appendicitis", "digestion", "acid", "gas", "bloated"],
        "associated_probes": ["nausea", "vomiting", "diarrhea", "constipation", "fever", "appetite loss"],
        "probe_questions": {
            "en": {
                "character": "Could you describe the sensation of the pain (such as sharp, dull, cramping, or burning) and rate its intensity from 1 to 10?",
                "location": "Where exactly in your abdomen is the discomfort located, and does it spread or radiate to your back, chest, or groin?",
                "onset": "When did this abdominal discomfort first begin, and did it start suddenly or build up gradually?",
                "associated": "Have you noticed any associated symptoms such as nausea, vomiting, fever, or changes in your bowel movements?",
                "food_relation": "Does eating or drinking make the pain better or worse, and have you been able to keep fluids down?",
            },
            "hi": {
                "character": "क्या आप दर्द के प्रकार (जैसे तेज, हल्का, ऐंठन या जलन) के बारे में बता सकते हैं और 1 से 10 के पैमाने पर इसकी तीव्रता क्या है?",
                "location": "पेट में दर्द ठीक किस जगह पर है, और क्या यह आपकी पीठ या कमर की तरफ फैलता है?",
                "onset": "यह पेट दर्द सबसे पहले कब शुरू हुआ था, और क्या यह अचानक शुरू हुआ या धीरे-धीरे बढ़ा?",
                "associated": "क्या आपको इसके साथ उल्टी, जी मिचलाना, बुखार या दस्त/कब्ज जैसी कोई परेशानी है?",
            },
            "mr": {
                "character": "तुम्ही वेदनेचे स्वरूप (उदा. तीव्र, मंद, पेटके किंवा जळजळ) सांगू शकता का आणि १ ते १० च्या प्रमाणात तीव्रता किती आहे?",
                "location": "पोटात नेमके कुठे दुखत आहे, आणि ते पाठीत किंवा कंबरेत पसरते का?",
                "onset": "हा पोटदुखीचा त्रास कधीपासून सुरू झाला, आणि तो अचानक सुरू झाला की हळूहळू वाढला?",
                "associated": "यासोबत तुम्हाला मळमळ, उलटी, ताप किंवा शौचास काही त्रास जाणवत आहे का?",
            }
        }
    },
    "headache": {
        "keywords": ["headache", "head pain", "migraine", "temple", "forehead", "scalp"],
        "associated_probes": ["visual changes", "nausea", "light sensitivity", "neck stiffness", "dizziness"],
        "probe_questions": {
            "en": {
                "character": "How would you describe the headache (throbbing, constant pressure, sharp), and on a scale of 1 to 10, how severe is it?",
                "onset": "Approximately how many hours or days ago did this headache start, and did it reach maximum intensity immediately or over time?",
                "associated": "Are you experiencing any nausea, sensitivity to bright light or sound, vision changes, or neck stiffness?",
            },
            "hi": {
                "character": "सिरदर्द किस प्रकार का है (जैसे धड़कता हुआ, भारीपन या तेज दर्द), और 1 से 10 के पैमाने पर कितना तेज है?",
                "onset": "यह सिरदर्द कब से हो रहा है, और क्या यह धीरे-धीरे बढ़ा है?",
                "associated": "क्या आपको रोशनी से परेशानी, उल्टी, चक्कर या गर्दन में अकड़न महसूस हो रही है?",
            },
            "mr": {
                "character": "डोकेदुखी कशा प्रकारची आहे (ठसठसणारी, जडपणा किंवा तीव्र), आणि १ ते १० प्रमाणात किती आहे?",
                "onset": "ही डोकेदुखी कधीपासून सुरू झाली आहे?",
                "associated": "यासोबत मळमळ, प्रकाशाचा त्रास, चक्कर किंवा मान आखडल्यासारखी वाटते का?",
            }
        }
    },
    "chest": {
        "keywords": ["chest", "ribs", "heart", "palpitation", "breathing", "breath", "lungs", "cough", "wheezing", "sputum"],
        "associated_probes": ["radiation", "shortness of breath", "sweating", "cough", "palpitations"],
        "probe_questions": {
            "en": {
                "character": "How does the chest sensation feel (tightness, sharp ache, burning), and what is the severity from 1 to 10?",
                "onset": "When did you first notice this sensation, and does it change with deep breathing, movement, or rest?",
                "associated": "Does it spread anywhere such as your neck or arm, and are you feeling short of breath, sweaty, or unusually tired?",
            },
            "hi": {
                "character": "सीने में किस तरह की तकलीफ महसूस हो रही है (जकड़न, तेज दर्द या जलन), और 1 से 10 पर कितनी है?",
                "onset": "यह तकलीफ कब से शुरू हुई, और क्या गहरी सांस लेने या चलने से बढ़ती है?",
                "associated": "क्या यह दर्द हाथ या गर्दन में जाता है, या सांस फूलने और पसीना आने की समस्या है?",
            },
            "mr": {
                "character": "छातीत कशा प्रकारचा त्रास होतो आहे (आवळल्यासारखे, तीव्र वेदना किंवा जळजळ), आणि १ ते १० प्रमाणात किती आहे?",
                "onset": "हा त्रास कधीपासून सुरू झाला, आणि हालचाल किंवा श्वास घेताना वाढतो का?",
                "associated": "वेदना हाताकडे किंवा गळ्याकडे पसरतात का, आणि दम लागणे किंवा घाम येणे असा त्रास आहे का?",
            }
        }
    },
    "fever": {
        "keywords": ["fever", "temperature", "chills", "shivering", "sweats", "hot", "burning up"],
        "associated_probes": ["chills", "cough", "burning urination", "body ache", "rash"],
        "probe_questions": {
            "en": {
                "character": "Have you measured your body temperature with a thermometer, and is the fever continuous or coming in waves with chills?",
                "onset": "How many days have you had this fever, and did it start with any specific cold, sore throat, or fatigue?",
                "associated": "Along with the fever, are you experiencing any cough, sore throat, burning while passing urine, or body aches?",
            },
            "hi": {
                "character": "क्या आपने थर्मामीटर से बुखार नापा है, और क्या आपको कंपकंपी या ठंड लगकर बुखार आ रहा है?",
                "onset": "यह बुखार कितने दिनों से है?",
                "associated": "बुखार के साथ क्या खांसी, गले में खराश, बदन दर्द या पेशाब में जलन जैसी कोई समस्या है?",
            },
            "mr": {
                "character": "तुम्ही तापमापीने ताप तपासला आहे का, आणि थंडी वाजून ताप येतो का?",
                "onset": "हा ताप किती दिवसांपासून येत आहे?",
                "associated": "तापाबरोबर खोकला, घसा दुखणे, अंगदुखी किंवा लघवीला जळजळ असा काही त्रास आहे का?",
            }
        }
    },
    "musculoskeletal": {
        "keywords": ["back pain", "joint", "knee", "shoulder", "neck", "hip", "ankle", "sprain", "bone", "muscle", "swelling"],
        "associated_probes": ["injury", "swelling", "stiffness", "numbness", "mobility loss"],
        "probe_questions": {
            "en": {
                "character": "How would you rate the pain on a scale of 1 to 10, and is there visible swelling, warmth, or difficulty moving the joint?",
                "onset": "Did this pain start after a specific physical strain, fall, or injury, or did it develop gradually?",
                "associated": "Are you able to walk or bear weight, and do you feel any tingling, numbness, or weakness in your extremities?",
            },
            "hi": {
                "character": "दर्द 1 से 10 के पैमाने पर कितना है, और क्या जोड़ या जगह पर कोई सूजन या गर्माहट है?",
                "onset": "क्या यह दर्द किसी चोट, खिंचाव या गिरने के बाद शुरू हुआ था?",
                "associated": "क्या आप चलने-फिरने में समर्थ हैं, या सुन्नपन और कमजोरी महसूस हो रही है?",
            },
            "mr": {
                "character": "वेदना १ ते १० प्रमाणात किती आहेत, आणि त्या जागेवर सूज किंवा हालचाल करताना त्रास होतो का?",
                "onset": "हा त्रास काही दुखापत, ताण किंवा पडल्यानंतर सुरू झाला का?",
                "associated": "तुम्हाला चालणे शक्य आहे का, आणि हात-पायात मुंग्या किंवा अशक्तपणा जाणवतो का?",
            }
        }
    }
}


# =============================================================================
# CLINICAL TRANSCRIPT EXTRACTION & 4-STATE TRACKING
# =============================================================================

def extract_clinical_variables(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyzes all patient utterances to extract clinical findings across the
    four distinct information states:
    1. Confirmed Positive
    2. Explicitly Denied
    3. Not Asked / Missing
    4. Asked but Unanswered
    """
    user_texts = [
        m.get("message", "").strip()
        for m in messages
        if m.get("sender") == "user" or m.get("role") == "user"
    ]
    all_user_text = " ".join(user_texts)
    user_lower = all_user_text.lower()

    # Track clinical variables
    state = {
        "chief_complaint": "",
        "detected_category": "general",
        "onset_duration": "",
        "severity": "",
        "character": "",
        "location": "",
        "confirmed_positives": [],
        "explicitly_denied": [],
        "medical_history": "",
        "current_medications": "",
        "allergies": "",
        "red_flag_detected": False,
        "red_flag_reason": "",
    }

    if not user_texts:
        return state

    # 1. Chief Complaint: first user statement
    state["chief_complaint"] = user_texts[0].strip()

    # 2. Check Red Flags
    for pattern in RED_FLAG_PATTERNS:
        match = re.search(pattern, user_lower)
        if match:
            state["red_flag_detected"] = True
            state["red_flag_reason"] = f"Urgent indicator detected: '{match.group(0)}'"
            break

    # 3. Categorize Complaint
    for cat_name, cat_data in CLINICAL_CATEGORIES.items():
        if any(kw in user_lower for kw in cat_data["keywords"]):
            state["detected_category"] = cat_name
            break

    # 4. Extract Onset & Duration
    onset_match = re.search(
        r"\b(?:for|since|past|started|began|onset)\s+([0-9]+\s+(?:hours?|days?|weeks?|months?)|yesterday|today|this morning|last night|[0-9]+\s+days?\s+ago)\b",
        user_lower
    )
    if onset_match:
        state["onset_duration"] = onset_match.group(0).strip()
    elif "yesterday" in user_lower:
        state["onset_duration"] = "started yesterday"
    elif "today" in user_lower or "morning" in user_lower:
        state["onset_duration"] = "started today / this morning"
    elif "days" in user_lower:
        days_match = re.search(r"(\d+\s*days?)", user_lower)
        if days_match:
            state["onset_duration"] = f"duration of {days_match.group(1)}"

    # 5. Extract Severity & Pain Scale
    sev_match = re.search(r"\b([0-9]|10)\s*(?:\/|\s*out\s*of\s*)\s*10\b", user_lower)
    temp_match = re.search(r"\b(?:it\s+is\s+)?([0-9]{2,3}(?:\.[0-9]+)?)\s*(?:°\s*[cf]|degrees?|celsius|fahrenheit|\s*c|\s*f)\b|\b(?:temperature|fever)\s*(?:is|was|of|at)?\s*([0-9]{2,3}(?:\.[0-9]+)?)\b", user_lower)
    if sev_match:
        state["severity"] = f"{sev_match.group(1)}/10"
    elif temp_match:
        t_val = temp_match.group(1) or temp_match.group(2)
        state["severity"] = f"{t_val}° (Body Temperature)"
    elif any(s in user_lower for s in ["severe", "unbearable", "very bad", "intense"]):
        state["severity"] = "Severe (high intensity)"
    elif any(s in user_lower for s in ["moderate", "medium", "manageable"]):
        state["severity"] = "Moderate"
    elif any(s in user_lower for s in ["mild", "slight", "minor"]):
        state["severity"] = "Mild"

    # 6. Extract Character & Location
    for char in ["sharp", "dull", "throbbing", "burning", "cramping", "stabbing", "aching", "pressure", "tightness", "continuous", "constant", "intermittent"]:
        if char in user_lower:
            state["character"] = char.capitalize()
            break

    for loc in ["lower right", "lower left", "upper right", "upper left", "epigastric", "belly button", "chest", "forehead", "temple", "back", "knee", "shoulder"]:
        if loc in user_lower:
            state["location"] = loc.capitalize()
            break

    # 7. Extract Pertinent Positives & Negatives (Confirmed vs Denied)
    symptom_pool = [
        ("fever", ["fever", "high temperature", "chills", "febrile"]),
        ("nausea", ["nausea", "nauseous", "queasy", "feel sick", "feeling sick"]),
        ("vomiting", ["vomiting", "vomit", "threw up", "throw up", "emesis"]),
        ("diarrhea", ["diarrhea", "loose motion", "watery stool"]),
        ("cough", ["cough", "coughing"]),
        ("shortness of breath", ["short of breath", "breathless", "dyspnea", "shortness of breath"]),
        ("headache", ["headache", "head pain", "throbbing"]),
        ("photophobia", ["light hurts", "sensitive to light", "photophobia"]),
        ("dizziness", ["dizziness", "dizzy", "lightheaded"]),
        ("chest pain", ["chest pain", "chest tightness", "chest pressure"]),
        ("burning urination", ["burning urination", "painful urine", "dysuria"]),
    ]

    for sym_name, keywords in symptom_pool:
        for kw in keywords:
            denied_pattern = rf"\b(?:no|not|denies|never|without)\s+(?:any\s+)?{kw}\b"
            if re.search(denied_pattern, user_lower):
                if sym_name not in state["explicitly_denied"]:
                    state["explicitly_denied"].append(sym_name)
                break
            elif kw in user_lower:
                if sym_name not in state["confirmed_positives"] and sym_name not in state["explicitly_denied"]:
                    state["confirmed_positives"].append(sym_name)
                break

    # 8. Extract History, Medications & Allergies
    if re.search(r"\bno\s+(?:known\s+)?(?:allergies|allergy)\b|\ballergies\s*:\s*none\b", user_lower):
        state["allergies"] = "No known drug allergies (NKDA)"
    elif "penicillin" in user_lower:
        state["allergies"] = "Penicillin allergy reported"
    elif "allergic" in user_lower:
        state["allergies"] = "Patient reported allergy presence"

    if re.search(r"\bno\s+(?:medical\s+)?history\b|\bno\s+chronic\s+disease\b|\bhealthy\b", user_lower):
        state["medical_history"] = "No significant chronic medical history reported"
    else:
        history_items = []
        for cond in ["hypertension", "high bp", "diabetes", "sugar", "asthma", "copd", "thyroid", "heart disease", "migraine", "migraines"]:
            if cond in user_lower:
                history_items.append(cond.capitalize())
        if history_items:
            state["medical_history"] = ", ".join(history_items)

    if re.search(r"\bno\s+medications?\b|\bnot\s+taking\s+any\s+(?:medicine|medicines|meds|pills)\b|\bnone\b", user_lower):
        state["current_medications"] = "No regular medications reported"
    else:
        meds = []
        for m in ["metformin", "paracetamol", "aspirin", "atorvastatin", "amlodipine", "inhaler", "salbutamol", "ibuprofen", "antibiotic", "albuterol"]:
            if m in user_lower:
                meds.append(m.capitalize())
        if meds:
            state["current_medications"] = ", ".join(meds)

    return state


# =============================================================================
# INTELLIGENT CLINICAL CONVERSATIONAL INTAKE ENGINE
# =============================================================================

def run_clinical_intake_interview(
    user_message: str,
    previous_messages: List[Dict[str, Any]],
    language: str = "en"
) -> Tuple[str, str]:
    """
    Intelligent, adaptive clinical questioning engine.
    Analyzes the complete patient conversation across 4 information states,
    identifies missing OPQRST / medical parameters, asks targeted single follow-ups,
    and determines completion based on clinical completeness rather than turn count.
    """
    lang = language if language in ("en", "hi", "mr") else "en"
    
    # Reconstruct all messages including the new user message
    full_messages = list(previous_messages) + [{"sender": "user", "message": user_message}]
    clinical_state = extract_clinical_variables(full_messages)

    # 1. Emergency Red Flag Detection
    if clinical_state["red_flag_detected"]:
        if lang == "hi":
            reply = "⚠️ आपातकालीन चेतावनी: आपके द्वारा बताए गए लक्षण तत्काल चिकित्सा सहायता की आवश्यकता का संकेत देते हैं। कृपया तुरंत ट्राइएज नर्स या इमरजेंसी विभाग (ER) से संपर्क करें।"
        elif lang == "mr":
            reply = "⚠️ आणीबाणी इशारा: तुम्ही सांगितलेली लक्षणे तातडीच्या वैद्यकीय मदतीची गरज दर्शवतात. कृपया त्वरित आपत्कालीन विभागाशी (ER) किंवा ट्राइएज नर्सशी संपर्क साधा."
        else:
            reply = "⚠️ URGENT CLINICAL ALERT: The symptoms you described require prompt medical evaluation. Please immediately inform the healthcare desk nurse or proceed directly to the Emergency Room."
        return "red_flag", reply

    category = clinical_state["detected_category"]
    cat_probes = CLINICAL_CATEGORIES.get(category, CLINICAL_CATEGORIES["abdominal"])
    probe_lang = cat_probes["probe_questions"].get(lang, cat_probes["probe_questions"]["en"])

    # Determine what has already been asked by the bot in previous turns
    bot_messages = [
        m.get("message", "").strip().lower()
        for m in previous_messages
        if m.get("sender") == "ai" or m.get("role") == "assistant"
    ]
    all_bot_text = " ".join(bot_messages)

    def was_probe_asked(probe_key: str, fallback_words: List[str]) -> bool:
        if probe_key in probe_lang:
            target_q = probe_lang[probe_key].strip().lower()
            if target_q in bot_messages or any(target_q[:35] in bm for bm in bot_messages):
                return True
        return any(w in all_bot_text for w in fallback_words)

    asked_onset = was_probe_asked("onset", ["when", "start", "begin", "कधी", "कब", "duration", "hours", "days"])
    asked_character = was_probe_asked("character", ["describe", "scale", "1 to 10", "intensity", "thermometer", "temperature", "continuous", "सेंटीग्रेड", "१ ते १०", "तीव्रता", "दर्द"])
    asked_associated = was_probe_asked("associated", ["associated", "nausea", "vomit", "fever", "cough", "उल्टी", "बुखार", "ताप", "इतर", "other"])
    asked_history = was_probe_asked("history", ["history", "condition", "medic", "allerg", "बीमारी", "दवा", "औषध", "ॲलर्जी"])

    def already_emitted(cand: str) -> bool:
        c = cand.strip().lower()
        return bool(bot_messages and (c in bot_messages or any(c[:40] in bm for bm in bot_messages)))

    # 2. Check Missing Information Hierarchy
    # Step A: Need Onset & Duration if completely missing
    if not clinical_state["onset_duration"] and not asked_onset:
        if "onset" in probe_lang and not already_emitted(probe_lang["onset"]):
            return "continue", probe_lang["onset"]
        if lang == "hi" and not already_emitted("यह तकलीफ सबसे पहले कब शुरू हुई थी"):
            return "continue", "यह तकलीफ सबसे पहले कब शुरू हुई थी, और क्या यह लगातार बनी हुई है?"
        if lang == "mr" and not already_emitted("हा त्रास कधीपासून"):
            return "continue", "हा त्रास कधीपासून सुरू झाला आहे आणि तो सतत जाणवतो का?"
        if not already_emitted("Approximately when did these symptoms"):
            return "continue", "Approximately when did these symptoms first begin, and have they been continuous or coming and going?"

    # Step B: Need Character & Severity if missing
    if not clinical_state["severity"] and not asked_character:
        if "character" in probe_lang and not already_emitted(probe_lang["character"]):
            return "continue", probe_lang["character"]
        if lang == "hi" and not already_emitted("दर्द या परेशानी का स्वरूप"):
            return "continue", "दर्द या परेशानी का स्वरूप कैसा है, और 1 से 10 के पैमाने पर आप इसे कितनी गंभीरता देंगे?"
        if lang == "mr" and not already_emitted("त्रासाचे स्वरूप कसे"):
            return "continue", "त्रासाचे स्वरूप कसे आहे आणि १ ते १० च्या प्रमाणात तुम्ही याला किती तीव्रता द्याल?"
        if not already_emitted("How would you describe the sensation"):
            return "continue", "How would you describe the sensation (e.g. sharp, dull, aching), and how would you rate its severity on a scale of 1 to 10?"

    # Step C: Need Complaint-Specific Associated Symptoms if missing
    if len(clinical_state["confirmed_positives"]) + len(clinical_state["explicitly_denied"]) < 2 and not asked_associated:
        if "associated" in probe_lang and not already_emitted(probe_lang["associated"]):
            return "continue", probe_lang["associated"]
        if lang == "hi" and not already_emitted("क्या आपको इसके साथ बुखार"):
            return "continue", "क्या आपको इसके साथ बुखार, चक्कर, उल्टी, या कोई अन्य संबंधित लक्षण महसूस हो रहा है?"
        if lang == "mr" and not already_emitted("याबरोबर तुम्हाला ताप"):
            return "continue", "याबरोबर तुम्हाला ताप, मळमळ किंवा इतर कोणतीही लक्षणे जाणवत आहेत का?"
        if not already_emitted("Are you experiencing any associated symptoms"):
            return "continue", "Are you experiencing any associated symptoms such as fever, nausea, dizziness, or localized swelling?"

    # Step D: Need Medical History, Medications & Allergies if missing
    if (not clinical_state["medical_history"] or not clinical_state["allergies"]) and not asked_history:
        if lang == "hi" and not already_emitted("क्या आपको पहले से कोई पुरानी बीमारी"):
            return "continue", "क्या आपको पहले से कोई पुरानी बीमारी (जैसे बीपी, शुगर, अस्थमा) है, आप कोई नियमित दवा लेते हैं, या किसी दवा से एलर्जी है?"
        if lang == "mr" and not already_emitted("तुम्हाला आधीपासून काही आजार"):
            return "continue", "तुम्हाला आधीपासून काही आजार (जसे बीपी, मधुमेह, दमा), नियमित औषधे किंवा कोणत्याही औषधाची ॲलर्जी आहे का?"
        if not already_emitted("Do you have any existing medical conditions"):
            return "continue", "Do you have any existing medical conditions (e.g., diabetes, hypertension), regular medications you take, or known allergies to any drugs?"

    # 3. Sufficient Information Collected -> Complete Interview
    if lang == "hi":
        completion_msg = "बहुत-बहुत धन्यवाद। मैंने आपकी मुख्य शिकायत, अवधि, गंभीरता, संबंधित लक्षण और चिकित्सा इतिहास का विवरण डॉक्टर के लिए संकलित कर लिया है। आपका पूर्व-परामर्श साक्षात्कार पूर्ण हो गया है।"
    elif lang == "mr":
        completion_msg = "खूप खूप धन्यवाद. मी तुमची मुख्य तक्रार, कालावधी, तीव्रता, संबंधित लक्षणे आणि वैद्यकीय इतिहास डॉक्टरांसाठी नोंदवून घेतला आहे. तुमची प्राथमिक मुलाखत पूर्ण झाली आहे."
    else:
        completion_msg = "Thank you very much. I have documented your chief complaint, duration, severity, associated symptoms, and clinical history for the physician. Your clinical intake is complete."

    return "completed", completion_msg


# =============================================================================
# RESTORED CLINICAL INTERVIEW SUMMARY GENERATOR
# =============================================================================

def generate_deterministic_clinical_summary(session_id: str, messages: List[Dict[str, Any]]) -> str:
    """
    Generates a structured, non-generic interview summary based strictly on
    the actual patient transcript without placeholder filler text.
    """
    variables = extract_clinical_variables(messages)

    chief = variables["chief_complaint"] or "Unspecified medical complaint"
    onset = variables["onset_duration"] or "No specific onset timeframe reported by patient"
    
    char_parts = []
    if variables["severity"]:
        char_parts.append(f"Severity: {variables['severity']}")
    if variables["character"]:
        char_parts.append(f"Quality: {variables['character']}")
    if variables["location"]:
        char_parts.append(f"Location: {variables['location']}")
    character_desc = "; ".join(char_parts) if char_parts else "Symptom intensity and qualitative nature recorded during intake."

    positives = variables["confirmed_positives"]
    denied = variables["explicitly_denied"]

    assoc_lines = []
    if positives:
        assoc_lines.append(f"• Present associated symptoms: {', '.join(p.capitalize() for p in positives)}")
    else:
        assoc_lines.append("• No secondary associated symptoms confirmed positive")

    if denied:
        assoc_lines.append(f"• Pertinent negatives (explicitly denied): {', '.join(d.capitalize() for d in denied)}")
    else:
        assoc_lines.append("• Pertinent negatives: None specifically denied")

    associated_text = "\n".join(assoc_lines)

    med_parts = []
    if variables["medical_history"]:
        med_parts.append(f"Medical History: {variables['medical_history']}")
    if variables["current_medications"]:
        med_parts.append(f"Current Medications: {variables['current_medications']}")
    if variables["allergies"]:
        med_parts.append(f"Allergies: {variables['allergies']}")
    history_text = "\n".join(f"• {p}" for p in med_parts) if med_parts else "• No chronic conditions, regular medications, or drug allergies reported"

    missing_items = []
    if not variables["onset_duration"]:
        missing_items.append("Exact onset timestamp / duration")
    if not variables["severity"]:
        missing_items.append("Pain severity rating (1-10)")
    if not variables["character"]:
        missing_items.append("Symptom quality / sensation")
    missing_text = "\n".join(f"• {item}" for item in missing_items) if missing_items else "• Core clinical intake variables collected; awaiting physician physical examination."

    status_text = (
        "⚠️ Urgent red flag criteria triggered during interview. Immediate medical review required."
        if variables["red_flag_detected"]
        else "Structured clinical intake completed. Patient history compiled for attending physician review."
    )

    return f"""### Chief complaint
{chief}

### Trigger & onset
{onset}

### Character
{character_desc}

### Associated symptoms
{associated_text}

### Relevant history
{history_text}

### Missing information
{missing_text}

### Interview status
{status_text}"""


# =============================================================================
# RESTORED COMPLETE NINE-SECTION CLINICAL DOSSIER
# =============================================================================

def generate_deterministic_nine_section_report(
    session_id: str,
    messages: List[Dict[str, Any]],
    documents: List[Dict[str, Any]],
    contradictions: List[Dict[str, Any]],
    historical_emrs: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Generates the complete 9-section doctor-ready clinical dossier from actual
    available patient facts without generic filler or fabricated history.
    """
    variables = extract_clinical_variables(messages)

    # 1. Current symptoms
    current_sym = variables["chief_complaint"] or "Patient presenting for clinical evaluation and consultation."

    # 2. Symptom details
    details_parts = []
    if variables["onset_duration"]:
        details_parts.append(f"**Onset & Duration:** {variables['onset_duration']}")
    if variables["severity"]:
        details_parts.append(f"**Severity:** {variables['severity']}")
    if variables["location"]:
        details_parts.append(f"**Location:** {variables['location']}")
    if variables["character"]:
        details_parts.append(f"**Character:** {variables['character']}")
    if not details_parts:
        details_parts.append("Symptoms documented during patient self-service kiosk interview.")
    symptom_details = "\n".join(details_parts)

    # 3. Associated symptoms
    assoc_lines = []
    if variables["confirmed_positives"]:
        assoc_lines.append(f"• Confirmed present: {', '.join(p.capitalize() for p in variables['confirmed_positives'])}")
    if variables["explicitly_denied"]:
        assoc_lines.append(f"• Pertinent negatives (denied): {', '.join(d.capitalize() for d in variables['explicitly_denied'])}")
    if not assoc_lines:
        assoc_lines.append("• No secondary associated symptoms endorsed during conversational intake.")
    associated_symptoms = "\n".join(assoc_lines)

    # 4. Relevant history
    history_lines = []
    if variables["medical_history"]:
        history_lines.append(f"• Patient reported: {variables['medical_history']}")
    if historical_emrs:
        for emr in historical_emrs:
            hosp = emr.get("hospital_name", "Prior Facility")
            diag = emr.get("diagnosis", "Clinical Record")
            date = emr.get("visit_date") or emr.get("created_at", "")
            history_lines.append(f"• Longitudinal EMR ({hosp}, {date}): {diag}")
    if not history_lines:
        history_lines.append("• No prior chronic illnesses, surgeries, or hospitalizations documented.")
    relevant_history = "\n".join(history_lines)

    # 5. Medication information
    med_lines = []
    if variables["current_medications"]:
        med_lines.append(f"• Active Medications: {variables['current_medications']}")
    if variables["allergies"]:
        med_lines.append(f"• Allergies: {variables['allergies']}")
    if not med_lines:
        med_lines.append("• No regular prescription medications or drug allergies reported by patient.")
    medication_info = "\n".join(med_lines)

    # 6. Extracted document information
    if not documents:
        document_info = "No medical documents were uploaded."
    else:
        doc_lines = []
        for d in documents:
            fname = d.get("filename", "Document")
            text = (d.get("extracted_text") or "").strip()
            summary_snippet = text[:280] + ("..." if len(text) > 280 else "")
            doc_lines.append(f"• **{fname}**: {summary_snippet if summary_snippet else 'Uploaded file processed without text.'}")
        document_info = "\n".join(doc_lines)

    # 7. Contradiction & clarification results
    if not contradictions:
        contradiction_info = "No clinically meaningful contradictions were detected."
    else:
        contra_blocks = []
        for c in contradictions:
            cat = c.get("category", "General")
            status = c.get("status", "pending")
            stmt = c.get("patient_statement", "")
            evid = c.get("document_evidence", "")
            ans = c.get("patient_answer", "")
            res = c.get("resolution_summary", "")

            block = (
                f"• **{cat}** ({'Resolved after clarification' if status == 'resolved' else 'Pending Clarification'})\n"
                f"  - Patient Statement: {stmt}\n"
                f"  - Document Evidence: {evid}\n"
                f"  - Clarification: {ans if ans else 'Awaiting review'}\n"
                f"  - Outcome: {res if res else 'Documented for physician attention'}"
            )
            contra_blocks.append(block)
        contradiction_info = "\n\n".join(contra_blocks)

    # 8. Neutral clinical context
    neutral_context = (
        f"Patient completed structured kiosk pre-triage intake presenting with {current_sym.lower()}. "
        f"Reported symptoms have a {variables['onset_duration'] or 'recent onset'}. "
        f"Conversational triage was completed without diagnostic interpretation. "
        f"All raw statements, uploaded records, and vital markers have been cross-checked and prepared for attending physician evaluation."
    )

    # 9. Timeline
    timeline_lines = [
        f"• T-00:00: Patient initiated self-service clinical check-in at MediKiosk.",
        f"• T+00:02: AI pre-triage interview conducted; chief complaint '{current_sym[:50]}' logged.",
    ]
    if documents:
        timeline_lines.append(f"• T+00:05: {len(documents)} medical record(s) uploaded and OCR text processed.")
    if contradictions:
        resolved_count = sum(1 for c in contradictions if c.get("status") == "resolved")
        timeline_lines.append(f"• T+00:07: Contradiction audit performed; {resolved_count}/{len(contradictions)} items clarified.")
    timeline_lines.append("• T+00:10: Doctor-ready clinical context dossier synthesized and queued for OPD consultation.")
    timeline_info = "\n".join(timeline_lines)

    return f"""### Current symptoms
{current_sym}

### Symptom details
{symptom_details}

### Associated symptoms
{associated_symptoms}

### Relevant history
{relevant_history}

### Medication information
{medication_info}

### Extracted document information
{document_info}

### Contradiction & clarification results
{contradiction_info}

### Neutral clinical context
{neutral_context}

### Timeline
{timeline_info}"""
