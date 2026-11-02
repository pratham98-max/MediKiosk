"""
MEWS (Modified Early Warning Score) Calculation & Assessment Service
===================================================================
Implementation derived from standard clinical references (Subbe et al., QJM 2001; 94:521-526)
and adapted from source Patient Care algorithms with critical clinical corrections.

Audit Finding on Original Source Formula:
In Patient Care original app.py:
    elif hr < 100 or hr > 110:
        score += 1
The original condition 'hr < 100' improperly penalized all normal heart rates (50-99 bpm) with +1 point!
This service fixes that overlapping condition to match recognized clinical standards:
Normal HR (51-100 bpm) receives 0 points; mildly abnormal (101-110 bpm or 40-50 bpm) receives +1.
"""

from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime

RULESET_VERSION = "MEWS-UK-2001-v1"
DISCLAIMER_TEXT = (
    "Clinical Decision Support: MEWS early warning score is a supplementary screening aid "
    "and does NOT constitute a definitive medical diagnosis. Attending qualified healthcare "
    "professionals retain ultimate clinical decision authority."
)


def score_heart_rate(hr: Optional[int]) -> Tuple[int, str]:
    """
    Heart rate scoring (bpm):
    < 40 or > 130: +3 (Critically abnormal)
    40-50 or 111-130: +2 (Moderately abnormal)
    101-110: +1 (Mildly abnormal)
    51-100: 0 (Normal)
    """
    if hr is None:
        return 0, "Heart rate not measured (0)"
    if hr < 40 or hr > 130:
        return 3, f"Heart rate {hr} bpm: Critically abnormal (+3)"
    elif hr <= 50 or hr > 110:
        return 2, f"Heart rate {hr} bpm: Moderately abnormal (+2)"
    elif hr > 100:
        return 1, f"Heart rate {hr} bpm: Mildly abnormal (+1)"
    else:
        return 0, f"Heart rate {hr} bpm: Normal (0)"


def score_blood_pressure_sys(bp: Optional[int]) -> Tuple[int, str]:
    """
    Systolic blood pressure scoring (mmHg):
    < 70 or > 200: +3 (Critically abnormal)
    70-80 or 171-200: +2 (Moderately abnormal)
    81-90 or 151-170: +1 (Mildly abnormal)
    91-150: 0 (Normal)
    """
    if bp is None:
        return 0, "Blood pressure not measured (0)"
    if bp < 70 or bp > 200:
        return 3, f"Systolic BP {bp} mmHg: Critically abnormal (+3)"
    elif bp <= 80 or bp > 170:
        return 2, f"Systolic BP {bp} mmHg: Moderately abnormal (+2)"
    elif bp <= 90 or bp > 150:
        return 1, f"Systolic BP {bp} mmHg: Mildly abnormal (+1)"
    else:
        return 0, f"Systolic BP {bp} mmHg: Normal (0)"


def score_respiratory_rate(rr: Optional[int]) -> Tuple[int, str]:
    """
    Respiratory rate scoring (bpm):
    < 5 or > 30: +3 (Critically abnormal)
    5-8 or 26-30: +2 (Moderately abnormal)
    9-14 or 21-25: +1 (Mildly abnormal)
    15-20: 0 (Normal)
    """
    if rr is None:
        return 0, "Respiratory rate not measured (0)"
    if rr < 5 or rr > 30:
        return 3, f"Respiratory rate {rr} bpm: Critically abnormal (+3)"
    elif rr < 9 or rr > 25:
        return 2, f"Respiratory rate {rr} bpm: Moderately abnormal (+2)"
    elif rr < 15 or rr > 20:
        return 1, f"Respiratory rate {rr} bpm: Mildly abnormal (+1)"
    else:
        return 0, f"Respiratory rate {rr} bpm: Normal (0)"


def score_temperature(temp: Optional[float]) -> Tuple[int, str]:
    """
    Body temperature scoring (°C):
    < 35.0: +2 (Hypothermia)
    > 38.5: +2 (High fever)
    37.6 - 38.5: +1 (Elevated temperature)
    35.0 - 37.5: 0 (Normal)
    """
    if temp is None:
        return 0, "Temperature not measured (0)"
    if temp < 35.0:
        return 2, f"Temperature {temp:.1f}°C: Hypothermia (+2)"
    elif temp > 38.5:
        return 2, f"Temperature {temp:.1f}°C: High fever (+2)"
    elif temp > 37.5:
        return 1, f"Temperature {temp:.1f}°C: Elevated temperature (+1)"
    else:
        return 0, f"Temperature {temp:.1f}°C: Normal (0)"


def score_oxygen_saturation(spo2: Optional[int]) -> Tuple[int, str]:
    """
    Oxygen saturation scoring (%):
    < 85: +3 (Severe hypoxemia)
    85-89: +2 (Moderate hypoxemia)
    90-94: +1 (Mild hypoxemia)
    >= 95: 0 (Normal)
    """
    if spo2 is None:
        return 0, "Oxygen saturation not measured (0)"
    if spo2 < 85:
        return 3, f"Oxygen saturation {spo2}%: Severe hypoxemia (+3)"
    elif spo2 < 90:
        return 2, f"Oxygen saturation {spo2}%: Moderate hypoxemia (+2)"
    elif spo2 < 95:
        return 1, f"Oxygen saturation {spo2}%: Mild hypoxemia (+1)"
    else:
        return 0, f"Oxygen saturation {spo2}%: Normal (0)"


def calculate_mews(
    heart_rate: Optional[int],
    blood_pressure_sys: Optional[int],
    respiratory_rate: Optional[int],
    temperature: Optional[float],
    oxygen_saturation: Optional[int]
) -> Dict[str, Any]:
    """
    Computes deterministic MEWS score, individual parameter components,
    clinical risk classification, and formatted clinical explanation.
    """
    hr_pts, hr_msg = score_heart_rate(heart_rate)
    bp_pts, bp_msg = score_blood_pressure_sys(blood_pressure_sys)
    rr_pts, rr_msg = score_respiratory_rate(respiratory_rate)
    temp_pts, temp_msg = score_temperature(temperature)
    spo2_pts, spo2_msg = score_oxygen_saturation(oxygen_saturation)

    total_score = hr_pts + bp_pts + rr_pts + temp_pts + spo2_pts

    # Clinical risk classification
    if total_score >= 5:
        risk_level = "CRITICAL"
        action_recommendation = "Score >= 5 indicates high risk of physiological deterioration. Consider urgent senior medical review and ICU transfer."
        is_alert = True
    elif total_score >= 3:
        risk_level = "WARNING"
        action_recommendation = "Score 3-4 requires increased monitoring frequency and medical team review."
        is_alert = False  # Warning, not critical alert
    else:
        risk_level = "STABLE"
        action_recommendation = "Score < 3 indicates stable physiological condition. Continue routine monitoring."
        is_alert = False

    # Check for single extreme vital indicator (e.g. any single parameter scoring 3)
    has_extreme_vital = any(pts >= 3 for pts in (hr_pts, bp_pts, rr_pts, spo2_pts))
    if has_extreme_vital and not is_alert:
        action_recommendation += " Note: At least one physiological parameter is in the critical range."
        is_alert = True

    breakdown_lines = [
        f"• {hr_msg}",
        f"• {bp_msg}",
        f"• {rr_msg}",
        f"• {temp_msg}",
        f"• {spo2_msg}"
    ]

    missing_params = [
        name for name, val in [
            ("Heart Rate", heart_rate),
            ("Blood Pressure", blood_pressure_sys),
            ("Respiratory Rate", respiratory_rate),
            ("Temperature", temperature),
            ("SpO2", oxygen_saturation)
        ] if val is None
    ]

    status_prefix = "🚨 CRITICAL" if risk_level == "CRITICAL" else ("⚠️ WARNING" if risk_level == "WARNING" else "✅ STABLE")

    explanation_text = (
        f"MEWS Score: {total_score}/14 ({status_prefix})\n\n"
        f"Scoring Breakdown:\n" + "\n".join(breakdown_lines) + f"\n\n"
        f"Clinical Guidance: {action_recommendation}"
    )

    if missing_params:
        explanation_text += f"\n\n* Note: Assessment is partial; missing observations: {', '.join(missing_params)}."

    return {
        "total_score": total_score,
        "max_possible_score": 14,
        "risk_level": risk_level,
        "is_critical_alert": is_alert,
        "parameter_scores": {
            "heart_rate": hr_pts,
            "blood_pressure_sys": bp_pts,
            "respiratory_rate": rr_pts,
            "temperature": temp_pts,
            "oxygen_saturation": spo2_pts
        },
        "breakdown": breakdown_lines,
        "explanation": explanation_text,
        "action_recommendation": action_recommendation,
        "is_partial": len(missing_params) > 0,
        "missing_parameters": missing_params,
        "ruleset_version": RULESET_VERSION,
        "disclaimer": DISCLAIMER_TEXT,
        "calculated_at": datetime.now().isoformat()
    }


def assess_discharge_readiness(
    heart_rate: Optional[int],
    blood_pressure_sys: Optional[int],
    respiratory_rate: Optional[int],
    temperature: Optional[float],
    oxygen_saturation: Optional[int],
    mews_score: int
) -> Dict[str, Any]:
    """
    Evaluates 6 physiological discharge readiness criteria.
    Criteria:
    1. Heart rate: 60 - 100 bpm
    2. Systolic blood pressure: 90 - 140 mmHg
    3. Respiratory rate: 12 - 20 bpm
    4. Temperature: 36.0 - 37.5 °C
    5. Oxygen saturation: >= 95%
    6. MEWS score: <= 2
    """
    criteria_met = []
    criteria_failed = []

    if heart_rate is not None and 60 <= heart_rate <= 100:
        criteria_met.append(f"Heart rate ({heart_rate} bpm) within normal discharge range (60-100)")
    else:
        criteria_failed.append(f"Heart rate ({heart_rate if heart_rate is not None else 'N/A'} bpm) outside discharge range (60-100)")

    if blood_pressure_sys is not None and 90 <= blood_pressure_sys <= 140:
        criteria_met.append(f"Systolic blood pressure ({blood_pressure_sys} mmHg) within normal range (90-140)")
    else:
        criteria_failed.append(f"Systolic blood pressure ({blood_pressure_sys if blood_pressure_sys is not None else 'N/A'} mmHg) outside normal range (90-140)")

    if respiratory_rate is not None and 12 <= respiratory_rate <= 20:
        criteria_met.append(f"Respiratory rate ({respiratory_rate} bpm) within normal range (12-20)")
    else:
        criteria_failed.append(f"Respiratory rate ({respiratory_rate if respiratory_rate is not None else 'N/A'} bpm) outside normal range (12-20)")

    if temperature is not None and 36.0 <= temperature <= 37.5:
        criteria_met.append(f"Temperature ({temperature:.1f}°C) within normal range (36.0-37.5)")
    else:
        criteria_failed.append(f"Temperature ({temperature if temperature is not None else 'N/A'}°C) outside normal range (36.0-37.5)")

    if oxygen_saturation is not None and oxygen_saturation >= 95:
        criteria_met.append(f"Oxygen saturation ({oxygen_saturation}%) adequate (>= 95%)")
    else:
        criteria_failed.append(f"Oxygen saturation ({oxygen_saturation if oxygen_saturation is not None else 'N/A'}%) below discharge target (>= 95%)")

    if mews_score <= 2:
        criteria_met.append(f"MEWS score ({mews_score}) indicates clinical stability (<= 2)")
    else:
        criteria_failed.append(f"MEWS score ({mews_score}) indicates ongoing clinical risk (> 2)")

    ready = (len(criteria_failed) == 0)

    return {
        "ready": ready,
        "met_count": len(criteria_met),
        "total_criteria": len(criteria_met) + len(criteria_failed),
        "criteria_met": criteria_met,
        "criteria_failed": criteria_failed,
        "summary": "Patient meets physiological criteria for discharge consideration" if ready else "Patient does NOT meet all discharge criteria; continued monitoring required",
        "evaluated_at": datetime.now().isoformat()
    }
