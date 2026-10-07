import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional

MODEL_PATH = Path(__file__).resolve().parent / "model.pkl"
_model_bundle = None

def load_or_train_model():
    global _model_bundle
    if _model_bundle is not None:
        return _model_bundle
    
    if not MODEL_PATH.exists():
        from .train import train_and_save_model
        train_and_save_model()
        
    _model_bundle = joblib.load(MODEL_PATH)
    return _model_bundle

def predict_core_overload(
    core_id: int,
    current_load: float,
    prev_load: float,
    moving_avg: float,
    trend: float,
    process_count: int,
    avg_process_load: float
) -> Dict[str, Any]:
    bundle = load_or_train_model()
    clf = bundle['classifier']
    reg = bundle['regressor']
    
    # Feature vector
    features = pd.DataFrame([{
        'current_load': float(current_load),
        'prev_load': float(prev_load),
        'moving_avg': float(moving_avg),
        'trend': float(trend),
        'process_count': int(process_count),
        'avg_process_load': float(avg_process_load)
    }])
    
    # Prediction
    prob_overload = float(clf.predict_proba(features)[0][1])
    is_overload = bool(prob_overload >= 0.5)
    predicted_load = float(reg.predict(features)[0])
    
    # Ensure physical realism: projected load is at least current load if trend is positive
    if trend > 0:
        predicted_load = max(predicted_load, current_load + trend * 0.8)
    predicted_load = min(100.0, max(0.0, round(predicted_load, 1)))
    
    confidence = round(max(prob_overload, 1.0 - prob_overload) * 100.0, 1)
    
    risk_level = "CRITICAL" if predicted_load >= 90.0 else ("WARNING" if predicted_load >= 80.0 else "NOMINAL")
    recommendation = "MIGRATION_REQUIRED" if (is_overload or predicted_load >= 88.0) else "KEEP_AFFINITY"
    
    return {
        "coreId": core_id,
        "overloadPredicted": is_overload or (predicted_load >= 88.0),
        "confidence": confidence,
        "overloadProbability": round(prob_overload * 100.0, 1),
        "predictedLoad": predicted_load,
        "riskLevel": risk_level,
        "recommendation": recommendation
    }
