"""
Machine Learning Risk Assessment & Explainable AI (XAI) Service
===============================================================
Wraps the trained scikit-learn models from Patient Care and provides:
1. Critical deterioration risk prediction using Random Forest / Gradient Boosting / SVM / Logistic Regression.
2. Graceful fallback rule-based risk prediction if model files are unpickled under version drift.
3. Feature attribution explanation generator (heuristic XAI explanation).
4. Estimated length-of-stay (LOS) prediction.
5. Mandatory clinical safety disclaimers regarding synthetic training data.
"""

import os
import json
import warnings
from typing import Dict, Any, Optional, List
import numpy as np

# Suppress sklearn unpickle version warnings gracefully
warnings.filterwarnings("ignore", category=UserWarning)

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts")

SYNTHETIC_DATA_DISCLOSURE = (
    "Notice: Pre-trained machine learning models were developed on synthetic patient scenarios. "
    "Predictions represent experimental clinical decision-support indicators and must NOT be interpreted "
    "as real-world validated diagnostic certainty."
)

CLINICAL_DISCLAIMER = (
    "Clinical Decision Support: ML deterioration predictions and MEWS scores are supplementary screening "
    "indicators and do NOT constitute a definitive medical diagnosis. Clinical judgment takes precedence."
)

FEATURE_COLUMNS = [
    'age', 'heart_rate', 'blood_pressure_sys', 'respiratory_rate',
    'temperature', 'oxygen_saturation', 'ecg_heart_rate',
    'ecg_std_dev', 'ecg_variance', 'previous_conditions', 'triage_level'
]

class MLRiskService:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.model_performance = {}
        self.los_model = None
        self.best_model_name = "random_forest"
        self._load_artifacts()

    def _load_artifacts(self):
        import joblib

        model_files = {
            'random_forest': 'model_random_forest.pkl',
            'gradient_boosting': 'model_gradient_boosting.pkl',
            'svm': 'model_svm.pkl',
            'logistic_regression': 'model_logistic_regression.pkl'
        }

        for name, fname in model_files.items():
            path = os.path.join(ARTIFACTS_DIR, fname)
            if os.path.exists(path):
                try:
                    self.models[name] = joblib.load(path)
                except Exception as e:
                    print(f"[MLRiskService] Note: Could not load {name} from {fname}: {e}")

        scalers_path = os.path.join(ARTIFACTS_DIR, "scalers.pkl")
        if os.path.exists(scalers_path):
            try:
                self.scalers = joblib.load(scalers_path)
            except Exception as e:
                print(f"[MLRiskService] Note: Could not load scalers: {e}")

        perf_path = os.path.join(ARTIFACTS_DIR, "model_performance.json")
        if os.path.exists(perf_path):
            try:
                with open(perf_path, "r") as f:
                    self.model_performance = json.load(f)
            except Exception:
                self.model_performance = {}

        los_path = os.path.join(ARTIFACTS_DIR, "los_predictor.pkl")
        if os.path.exists(los_path):
            try:
                self.los_model = joblib.load(los_path)
            except Exception:
                self.los_model = None

    def get_model_performance(self) -> Dict[str, Any]:
        """Returns loaded model performance metrics and model list."""
        return {
            "best_model": self.best_model_name,
            "models_available": list(self.models.keys()),
            "model_performance": self.model_performance,
            "training_type": "synthetic_dataset_10000_samples",
            "disclosure": SYNTHETIC_DATA_DISCLOSURE
        }

    def predict_critical_risk(
        self,
        patient_data: Dict[str, Any],
        preferred_model: Optional[str] = None,
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes ML prediction on 11 clinical features with fallback rule scoring.
        """
        chosen_model = preferred_model or model_name or self.best_model_name
        model = self.models.get(chosen_model)

        # Prepare 11 features matching the exact training pipeline
        age = float(patient_data.get('age', 45) or 45)
        hr = float(patient_data.get('heart_rate', 75) or 75)
        bp = float(patient_data.get('blood_pressure_sys', patient_data.get('blood_pressure', 120)) or 120)
        rr = float(patient_data.get('respiratory_rate', 16) or 16)
        temp = float(patient_data.get('temperature', 36.6) or 36.6)
        spo2 = float(patient_data.get('oxygen_saturation', 98) or 98)
        ecg_hr = float(patient_data.get('ecg_heart_rate', hr) or hr)
        ecg_std = float(patient_data.get('ecg_std_dev', 0.5) or 0.5)
        ecg_var = float(patient_data.get('ecg_variance', 0.25) or 0.25)
        prev_cond = float(patient_data.get('previous_conditions', 0) or 0)
        triage = float(patient_data.get('triage_level', 3) or 3)

        features = np.array([[
            age, hr, bp, rr, temp, spo2, ecg_hr, ecg_std, ecg_var, prev_cond, triage
        ]])

        if model is not None:
            try:
                # Scale features if using SVM or Logistic Regression
                if chosen_model in ['svm', 'logistic_regression']:
                    scaler = self.scalers.get('standard')
                    if scaler is not None:
                        features = scaler.transform(features)

                prediction = int(model.predict(features)[0])
                if hasattr(model, "predict_proba"):
                    probability = float(model.predict_proba(features)[0, 1])
                else:
                    probability = float(prediction)

                explanation = self.generate_explanation(patient_data, probability)

                return {
                    "critical_risk": round(probability, 4),
                    "prediction": prediction,
                    "confidence": min(99, int(probability * 100)),
                    "model_used": chosen_model,
                    "model_version": "1.0-synthetic",
                    "explanation": explanation,
                    "is_fallback": False,
                    "disclaimer": CLINICAL_DISCLAIMER,
                    "synthetic_data_notice": SYNTHETIC_DATA_DISCLOSURE
                }
            except Exception as e:
                print(f"[MLRiskService] Inference failed on {chosen_model}: {e}. Utilizing fallback rule engine.")

        # Fallback deterministic rule prediction
        return self._fallback_prediction(patient_data)

    predict = predict_critical_risk
    predict_with_fallback = predict_critical_risk

    def _fallback_prediction(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clinically derived heuristic fallback when models are not loaded."""
        hr = float(patient_data.get('heart_rate', 75) or 75)
        bp = float(patient_data.get('blood_pressure_sys', 120) or 120)
        spo2 = float(patient_data.get('oxygen_saturation', 98) or 98)
        triage = int(patient_data.get('triage_level', 3) or 3)
        mews = int(patient_data.get('mews_score', 0) or 0)

        risk_score = 0.10
        if mews >= 5:
            risk_score = 0.85
        elif mews >= 4:
            risk_score = 0.65
        elif mews >= 3:
            risk_score = 0.45
        elif mews >= 2:
            risk_score = 0.25

        if spo2 < 90:
            risk_score = max(risk_score, 0.75)
        elif spo2 < 92:
            risk_score = max(risk_score, 0.50)

        if hr > 130 or hr < 50:
            risk_score = max(risk_score, 0.60)

        if bp > 180 or bp < 90:
            risk_score = max(risk_score, 0.60)

        if triage == 1:
            risk_score = max(risk_score, 0.80)

        explanation = self.generate_explanation(patient_data, risk_score)

        return {
            "critical_risk": round(risk_score, 4),
            "prediction": 1 if risk_score >= 0.5 else 0,
            "confidence": min(95, int(risk_score * 100)),
            "model_used": "clinical_rules_fallback",
            "model_version": "1.0-ruleset",
            "explanation": explanation,
            "is_fallback": True,
            "disclaimer": CLINICAL_DISCLAIMER,
            "synthetic_data_notice": SYNTHETIC_DATA_DISCLOSURE
        }

    def generate_explanation(self, patient_data: Any, risk_score: Any = 0.0) -> str:
        """
        Generates human-readable clinical feature attribution explanation.
        Robustly accepts (patient_data, risk_score) or inverted (pred, patient_data).
        """
        if isinstance(patient_data, dict) and "critical_risk" in patient_data and isinstance(risk_score, dict):
            # Caller passed (pred_dict, features_dict)
            risk_val = float(patient_data.get("critical_risk", 0.0))
            patient_data = risk_score
            risk_score = risk_val
        elif isinstance(risk_score, dict):
            risk_score = float(risk_score.get("critical_risk", 0.0))
        elif isinstance(patient_data, (int, float)) and isinstance(risk_score, dict):
            patient_data, risk_score = risk_score, float(patient_data)
        else:
            try:
                risk_score = float(risk_score)
            except (ValueError, TypeError):
                risk_score = 0.0

        if not isinstance(patient_data, dict):
            patient_data = {}

        explanations = []

        hr = float(patient_data.get('heart_rate', 75) or 75)
        if hr > 130:
            explanations.append(f"Severely elevated heart rate ({int(hr)} bpm) indicates cardiovascular stress / tachycardia")
        elif hr < 50:
            explanations.append(f"Low heart rate ({int(hr)} bpm) indicates severe bradycardia")
        elif hr > 100:
            explanations.append(f"Mildly elevated heart rate ({int(hr)} bpm)")

        bp = float(patient_data.get('blood_pressure_sys', 120) or 120)
        if bp > 180:
            explanations.append(f"Critical systolic blood pressure ({int(bp)} mmHg) suggests hypertensive crisis")
        elif bp > 160:
            explanations.append(f"High systolic blood pressure ({int(bp)} mmHg) indicates stage 2 hypertension")
        elif bp < 90:
            explanations.append(f"Low systolic blood pressure ({int(bp)} mmHg) may indicate circulatory insufficiency / shock")

        spo2 = float(patient_data.get('oxygen_saturation', 98) or 98)
        if spo2 < 90:
            explanations.append(f"Severe hypoxemia ({int(spo2)}%) indicates critical respiratory compromise")
        elif spo2 < 95:
            explanations.append(f"Mild hypoxemia ({int(spo2)}%) below standard clinical target")

        rr = float(patient_data.get('respiratory_rate', 16) or 16)
        if rr > 25:
            explanations.append(f"Tachypnea ({int(rr)} breaths/min) indicates elevated respiratory effort")
        elif rr < 10:
            explanations.append(f"Bradypnea ({int(rr)} breaths/min) indicates potential respiratory depression")

        temp = float(patient_data.get('temperature', 36.6) or 36.6)
        if temp > 38.5:
            explanations.append(f"High fever ({temp:.1f}°C) indicative of acute systemic or infectious process")
        elif temp < 35.0:
            explanations.append(f"Hypothermia ({temp:.1f}°C) observed")

        age = float(patient_data.get('age', 45) or 45)
        if age > 65:
            explanations.append("Age > 65 years correlates with heightened physiological vulnerability")

        triage = int(patient_data.get('triage_level', 3) or 3)
        if triage == 1:
            explanations.append("Initial triage ESI Level 1 (Immediate resuscitation priority)")
        elif triage == 2:
            explanations.append("Initial triage ESI Level 2 (Emergency priority)")

        if risk_score >= 0.70:
            risk_tier = "CRITICAL"
            recommended_action = "Immediate senior clinical review and preparation for emergency / ICU intervention."
        elif risk_score >= 0.40:
            risk_tier = "MODERATE TO HIGH"
            recommended_action = "Increase vital sign monitoring frequency; review clinical treatment plan."
        else:
            risk_tier = "LOW"
            recommended_action = "Routine care and scheduled vital monitoring sufficient."

        contributing_bullets = "\n".join([f"• {exp}" for exp in explanations]) if explanations else "• All monitored parameters within baseline acceptable thresholds"

        return (
            f"RISK ASSESSMENT: {risk_tier} (Score: {risk_score:.2f})\n\n"
            f"KEY CONTRIBUTING FACTORS:\n{contributing_bullets}\n\n"
            f"RECOMMENDED CLINICAL ACTION:\n• {recommended_action}\n\n"
            f"MODEL CONFIDENCE: {min(99, int(risk_score * 100))}%\n\n"
            f"{SYNTHETIC_DATA_DISCLOSURE}"
        )

    def predict_length_of_stay(self, patient_data: Dict[str, Any]) -> int:
        """Estimates patient length of stay in days."""
        triage = int(patient_data.get('triage_level', 3) or 3)
        base_los = {1: 10, 2: 7, 3: 4, 4: 2, 5: 1}
        return base_los.get(triage, 3)

# Global singleton
ml_risk_service = MLRiskService()
