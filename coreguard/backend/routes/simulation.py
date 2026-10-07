from fastapi import APIRouter
from typing import Dict, Any, List
import uuid
from database import get_db_connection

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

# Deterministic demo schedule script
DEMO_SCENARIO_CONFIG = {
    "numCores": 4,
    "demoScript": [
        {"time": 0.0, "type": "ARRIVE", "process": {"id": "P1", "name": "P1-Worker", "cpuDemand": 25.0, "memory": 64.0, "cacheSensitivity": "LOW", "securityLevel": "TRUSTED", "duration": 30.0, "assignedCore": 0}},
        {"time": 2.0, "type": "ARRIVE", "process": {"id": "P2", "name": "P2-Database", "cpuDemand": 20.0, "memory": 90.0, "cacheSensitivity": "MEDIUM", "securityLevel": "TRUSTED", "duration": 28.0, "assignedCore": 1}},
        {"time": 4.0, "type": "ARRIVE", "process": {"id": "P3", "name": "P3-SearchIndex", "cpuDemand": 22.0, "memory": 75.0, "cacheSensitivity": "LOW", "securityLevel": "TRUSTED", "duration": 25.0, "assignedCore": 2}},
        {"time": 6.0, "type": "ARRIVE", "process": {"id": "P4", "name": "P4-CryptoHash", "cpuDemand": 28.0, "memory": 120.0, "cacheSensitivity": "HIGH", "securityLevel": "TRUSTED", "duration": 26.0, "assignedCore": 1}},
        {"time": 8.0, "type": "ARRIVE", "process": {"id": "P5", "name": "P5-PaymentGateway", "cpuDemand": 38.0, "memory": 80.0, "cacheSensitivity": "LOW", "securityLevel": "SENSITIVE", "duration": 24.0, "assignedCore": 1}},
        {"time": 10.0, "type": "ARRIVE", "process": {"id": "P6", "name": "P6-AnalyticsBatch", "cpuDemand": 24.0, "memory": 110.0, "cacheSensitivity": "MEDIUM", "securityLevel": "UNTRUSTED", "duration": 22.0, "assignedCore": 3}},
        {"time": 10.5, "type": "TRIGGER_OVERLOAD", "coreId": 1, "description": "Core 1 approaches overload (P2:20% + P4:28% + P5:38% = 86%)"},
        {"time": 12.0, "type": "ML_PREDICT", "coreId": 1, "description": "Random Forest ML model predicts 94% overload imminent"},
        {"time": 14.0, "type": "CANDIDATE_EVALUATION", "coreId": 1, "description": "Evaluate migration candidates on Core 1: P2, P4, P5"},
        {"time": 15.0, "type": "COST_CALCULATION", "description": "Compute multi-attribute migration cost vector for each candidate"},
        {"time": 16.0, "type": "SECURITY_CHECK", "description": "Validate target core security isolation policies (Core 3 has UNTRUSTED P6 -> blocked)"},
        {"time": 17.0, "type": "SELECT_MIGRATION", "processId": "P5", "sourceCore": 1, "description": "P5 selected after candidate and destination scores are calculated dynamically"},
        {"time": 18.0, "type": "START_ANIMATION", "processId": "P5", "duration": 2.0, "description": "Animated migration starts after the decision window"},
        {"time": 20.0, "type": "COMPLETE_MIGRATION", "processId": "P5", "sourceCore": 1, "description": "P5 transferred to the highest-scoring valid destination. Loads rebalanced."},
        {"time": 21.0, "type": "SHOW_PERFORMANCE", "description": "Display comparative performance telemetry vs Reactive baseline"}
    ]
}

@router.post("/start")
def start_simulation(payload: Dict[str, Any] = None):
    run_id = f"sim-{uuid.uuid4().hex[:8]}"
    mode = payload.get("mode", "PREDICTIVE") if payload else "PREDICTIVE"
    num_cores = payload.get("numCores", 4) if payload else 4
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO simulation_runs (id, name, mode, num_cores, status)
    VALUES (?, ?, ?, ?, ?)
    """, (run_id, f"CoreGuard Run {run_id}", mode, num_cores, "RUNNING"))
    conn.commit()
    conn.close()
    
    return {
        "runId": run_id,
        "status": "RUNNING",
        "mode": mode,
        "numCores": num_cores
    }

@router.post("/reset")
def reset_simulation():
    return {"status": "RESET", "message": "Simulation environment ready for initialization"}

@router.post("/run-demo")
def get_demo_configuration():
    return {
        "status": "DEMO_CONFIGURED",
        "scenario": DEMO_SCENARIO_CONFIG
    }

@router.get("/{run_id}")
def get_simulation_run(run_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM simulation_runs WHERE id = ?", (run_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {"error": "Run not found"}
    return dict(row)
