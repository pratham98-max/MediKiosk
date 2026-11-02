"""
Hospital Network Transfer Recommendation & Tracking Service
===========================================================
Computes transfer recommendations based on clinical need (ICU vs General),
geographical distance, available capacity, specialization matching, and
historical transfer success rates. Manages persistent transfer requests.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

# Reference network hospitals (adapted from Patient Care and MediKiosk network)
DEFAULT_NETWORK_HOSPITALS = [
    {
        "hospital_id": "net-apollo",
        "name": "Apollo Clinic & Tertiary Care",
        "distance_km": 5.2,
        "available_icu_beds": 3,
        "available_general_beds": 12,
        "specialization": "Cardiology, Critical Care, Stroke & Trauma",
        "contact_phone": "+91-11-2659-0101",
        "transfer_success_rate": 96.5
    },
    {
        "hospital_id": "net-city",
        "name": "City Specialty & Surgical Hospital",
        "distance_km": 8.7,
        "available_icu_beds": 1,
        "available_general_beds": 15,
        "specialization": "General Surgery, Orthopedics & Internal Medicine",
        "contact_phone": "+91-11-2659-0102",
        "transfer_success_rate": 93.0
    },
    {
        "hospital_id": "net-max",
        "name": "Metro Heart & Neuro Center",
        "distance_km": 12.4,
        "available_icu_beds": 5,
        "available_general_beds": 8,
        "specialization": "Interventional Cardiology, Neurology & ICU",
        "contact_phone": "+91-11-2659-0103",
        "transfer_success_rate": 98.2
    }
]


def calculate_transfer_score(
    hospital: Dict[str, Any],
    needs_icu: bool,
    chief_complaint: str = ""
) -> int:
    """
    Computes a composite transfer suitability score (0-100).
    Factors:
    - Distance penalty: -2 points per km beyond 5km
    - Bed availability: +15 if desired bed type has > 2 beds, +5 if 1-2 beds
    - Specialization match: +20 points if specialty matches patient chief complaint
    - Success rate bonus: based on historical percentage
    """
    score = 60  # Base score

    # 1. Distance factor (closer is higher)
    dist = hospital.get("distance_km", 10.0)
    dist_bonus = max(0, int(25 - (dist * 1.5)))
    score += dist_bonus

    # 2. Bed availability
    avail_beds = hospital.get("available_icu_beds" if needs_icu else "available_general_beds", 0)
    if avail_beds >= 3:
        score += 15
    elif avail_beds >= 1:
        score += 8
    else:
        score -= 25  # Zero target beds is a severe penalty

    # 3. Specialization match
    complaint_lower = (chief_complaint or "").lower()
    spec_lower = hospital.get("specialization", "").lower()

    if any(k in complaint_lower for k in ["chest", "heart", "cardiac", "stroke"]) and any(k in spec_lower for k in ["cardio", "stroke", "critical"]):
        score += 15
    elif any(k in complaint_lower for k in ["bone", "fracture", "joint"]) and "ortho" in spec_lower:
        score += 15
    elif any(k in complaint_lower for k in ["breath", "respiratory", "pneumonia"]) and ("icu" in spec_lower or "critical" in spec_lower):
        score += 15

    # 4. Historical success rate
    success_rate = hospital.get("transfer_success_rate", 90.0)
    if success_rate >= 95.0:
        score += 10
    elif success_rate >= 90.0:
        score += 5

    return max(10, min(99, score))


def generate_transfer_recommendations(
    patient_id: str,
    needs_icu: bool,
    chief_complaint: str = "",
    network_hospitals: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Returns ranked hospital transfer options with calculated scores.
    """
    hospitals = network_hospitals or DEFAULT_NETWORK_HOSPITALS
    recommendations = []

    for hosp in hospitals:
        score = calculate_transfer_score(hosp, needs_icu, chief_complaint)
        avail = hosp.get("available_icu_beds" if needs_icu else "available_general_beds", 0)
        
        # Estimate transfer time (e.g. 3 mins per km + 10 mins prep)
        est_minutes = int(hosp.get("distance_km", 5) * 3 + 10)

        recommendations.append({
            "patient_id": patient_id,
            "target_hospital_id": hosp["hospital_id"],
            "target_hospital_name": hosp["name"],
            "distance_km": hosp["distance_km"],
            "estimated_transit_minutes": est_minutes,
            "available_target_beds": avail,
            "bed_type_needed": "ICU" if needs_icu else "General",
            "specialization": hosp["specialization"],
            "contact_phone": hosp["contact_phone"],
            "success_rate": hosp["transfer_success_rate"],
            "transfer_score": score,
            "recommendation_rank": "HIGH" if score >= 85 else ("MEDIUM" if score >= 70 else "LOW")
        })

    # Sort descending by transfer_score
    recommendations.sort(key=lambda x: x["transfer_score"], reverse=True)
    return recommendations
