from fastapi import APIRouter, HTTPException
from models import PredictionRequest, PredictionResponse
from ml.predictor import predict_core_overload
from database import record_prediction

router = APIRouter(prefix="/api", tags=["prediction"])

@router.post("/predict", response_model=PredictionResponse)
def predict_overload(req: PredictionRequest):
    try:
        result = predict_core_overload(
            core_id=req.coreId,
            current_load=req.currentLoad,
            prev_load=req.prevLoad,
            moving_avg=req.movingAvg,
            trend=req.trend,
            process_count=req.processCount,
            avg_process_load=req.avgProcessLoad
        )
        # Record into database
        record_prediction({
            "runId": "active-session",
            "timestamp": 0.0,
            "coreId": req.coreId,
            "currentLoad": req.currentLoad,
            "predictedLoad": result["predictedLoad"],
            "overloadPredicted": result["overloadPredicted"],
            "confidence": result["confidence"],
            "trend": req.trend
        })
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
