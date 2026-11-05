from app.services.clinical_intelligence import (
    run_clinical_intake_interview,
    generate_deterministic_clinical_summary,
    generate_deterministic_nine_section_report,
    extract_clinical_variables,
    get_groq_client,
)

print("--- TEST 1: Groq Client check ---")
client, reason = get_groq_client()
print("Client:", client, "Reason:", reason)

print("\n--- TEST 2: Abdominal Pain Initial ---")
s1, r1 = run_clinical_intake_interview("I have bad stomach pain since yesterday", [], "en")
print("Status:", s1)
print("Reply:", r1)

print("\n--- TEST 3: Red Flag Chest Pain ---")
s2, r2 = run_clinical_intake_interview("Crushing chest pain radiating to left arm and sweating", [], "en")
print("Status:", s2)
print("Reply:", r2)

print("\n--- TEST 4: Adaptive Multi-turn ---")
convo = [
    {"sender": "user", "message": "I have a terrible throbbing headache"},
    {"sender": "ai", "message": "Approximately when did these symptoms first begin?"},
    {"sender": "user", "message": "Started 6 hours ago, 8/10 pain with nausea"},
]
s3, r3 = run_clinical_intake_interview("I have no high blood pressure or other illness, take no medications, no allergies", convo, "en")
print("Status:", s3)
print("Reply:", r3)

print("\n--- TEST 5: Nine-Section Report ---")
report = generate_deterministic_nine_section_report("test-sess-1", convo, [], [])
sections = [s.strip() for s in report.split("###") if s.strip()]
print("Number of sections:", len(sections))
for sec in sections:
    lines = sec.split("\n")
    print("Section header:", lines[0])

assert len(sections) == 9, "Must have exactly 9 sections!"
print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")

