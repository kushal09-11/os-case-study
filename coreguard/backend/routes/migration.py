from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from models import (
    MigrationAnalysisRequest, MigrationAnalysisResponse,
    CandidateEvaluation, DestinationAnalysis,
    MigrationRecordRequest
)
from database import record_migration, get_recent_migrations

router = APIRouter(prefix="/api", tags=["migration"])

DEFAULT_WEIGHTS = {
    "alpha": 1.0,  # Migration Time
    "beta": 1.0,   # Memory Penalty
    "gamma": 1.0,  # Cache Penalty
    "delta": 1.0   # Security Penalty
}

@router.post("/migration/analyze", response_model=MigrationAnalysisResponse)
def analyze_migration(req: MigrationAnalysisRequest):
    weights = req.weights or DEFAULT_WEIGHTS
    alpha = weights.get("alpha", 1.0)
    beta = weights.get("beta", 1.0)
    gamma = weights.get("gamma", 1.0)
    delta = weights.get("delta", 1.0)
    
    source_core = next((c for c in req.cores if c.id == req.sourceCoreId), None)
    source_load_before = source_core.load if source_core else 85.0
    
    evaluations: List[CandidateEvaluation] = []
    
    cache_weights = {"HIGH": 3.4, "MEDIUM": 2.0, "LOW": 0.8}
    security_weights = {"UNTRUSTED": 3.0, "SENSITIVE": 1.5, "TRUSTED": 0.0}
    
    best_candidate: Optional[CandidateEvaluation] = None
    highest_score = -999.0
    recommended_dest = None
    
    destination_cores = [c for c in req.cores if c.id != req.sourceCoreId]
    
    for proc in req.candidates:
        # Migration time based on memory size: e.g. 80MB -> ~0.72s to 1.0s
        mig_time = round((proc.memory / 100.0) * 0.9, 2)
        # Memory penalty
        mem_penalty = round((proc.memory / 80.0) * 1.5, 2)
        # Cache penalty
        cache_penalty = round(cache_weights.get(proc.cacheSensitivity.upper(), 1.0), 2)
        # Security penalty
        sec_penalty = round(security_weights.get(proc.securityLevel.upper(), 0.0), 2)
        
        # Total Migration Cost
        total_cost = round(
            (alpha * mig_time) +
            (beta * mem_penalty) +
            (gamma * cache_penalty) +
            (delta * sec_penalty),
            2
        )
        
        # Expected benefit: reduction of source core load
        expected_benefit = round(proc.cpuDemand, 2)
        
        # Migration score
        migration_score = round(expected_benefit - total_cost, 2)
        
        # Security validation against potential destinations
        dest_scores: Dict[int, float] = {}
        best_core_for_proc = None
        best_dest_score = -999.0
        
        for d_core in destination_cores:
            # Check capacity
            projected_dest_load = d_core.load + proc.cpuDemand
            capacity_ok = projected_dest_load <= 85.0
            
            # Destination security check
            sec_ok = True
            sec_reason = "Compatible"
            
            if not d_core.securityCompatible:
                sec_ok = False
                sec_reason = d_core.securityReason
            elif projected_dest_load > 90.0:
                sec_ok = False
                sec_reason = "Destination would become overloaded"
                
            if sec_ok and capacity_ok:
                dest_score = round(migration_score - (d_core.load * 0.1), 2)
                dest_scores[d_core.id] = dest_score
                if dest_score > best_dest_score:
                    best_dest_score = dest_score
                    best_core_for_proc = d_core.id
            else:
                dest_scores[d_core.id] = -99.0
                
        is_eligible = (best_core_for_proc is not None) and (migration_score >= req.scoreThreshold)
        
        cand_eval = CandidateEvaluation(
            processId=proc.id,
            processName=proc.name,
            cpuDemand=proc.cpuDemand,
            memory=proc.memory,
            cacheSensitivity=proc.cacheSensitivity,
            securityLevel=proc.securityLevel,
            migrationTime=mig_time,
            memoryPenalty=mem_penalty,
            cachePenalty=cache_penalty,
            securityPenalty=sec_penalty,
            migrationCost=total_cost,
            expectedBenefit=expected_benefit,
            migrationScore=migration_score,
            securityPass=(best_core_for_proc is not None),
            securityReason="Security policy validated" if best_core_for_proc else "Incompatible with candidate cores",
            destinationScores=dest_scores,
            bestDestinationCore=best_core_for_proc,
            eligible=is_eligible
        )
        evaluations.append(cand_eval)
        
        if is_eligible and migration_score > highest_score:
            highest_score = migration_score
            best_candidate = cand_eval
            recommended_dest = best_core_for_proc
            
    # Destination analyses summary for the recommended process or top candidate
    target_proc = best_candidate or (evaluations[0] if evaluations else None)
    destination_analyses: List[DestinationAnalysis] = []
    
    for d_core in destination_cores:
        projected = d_core.load + (target_proc.cpuDemand if target_proc else 0.0)
        sec_pass = True
        sec_reason = "Compatible"
        decision = "APPROVED"
        
        if target_proc and not d_core.securityCompatible:
            sec_pass = False
            sec_reason = d_core.securityReason
            decision = "BLOCKED"
        elif projected > 88.0:
            sec_pass = False
            sec_reason = "Destination capacity exceeded (>88%)"
            decision = "CAPACITY_EXCEEDED"
            
        dest_score = round((target_proc.migrationScore if target_proc else 0) - (d_core.load * 0.1), 2)
        if decision != "APPROVED":
            dest_score = -99.0
            
        destination_analyses.append(DestinationAnalysis(
            coreId=d_core.id,
            currentLoad=round(d_core.load, 1),
            projectedLoad=round(projected, 1),
            securityPass=sec_pass,
            securityReason=sec_reason,
            migrationCost=target_proc.migrationCost if target_proc else 0.0,
            score=dest_score,
            decision=decision
        ))
        
    decision_summary = "MIGRATION_APPROVED" if best_candidate else "NO_SUITABLE_CANDIDATE"
    summary_text = (
        f"Selected {best_candidate.processName} (Score: +{best_candidate.migrationScore}) "
        f"for migration to Core {recommended_dest}"
        if best_candidate else "No candidate satisfied security, cost, and capacity constraints."
    )
    
    return MigrationAnalysisResponse(
        sourceCoreId=req.sourceCoreId,
        recommendedProcessId=best_candidate.processId if best_candidate else None,
        destinationCoreId=recommended_dest,
        evaluations=evaluations,
        destinationAnalyses=destination_analyses,
        decision=decision_summary,
        summary=summary_text
    )

@router.post("/migration/execute")
def execute_migration_record(record: MigrationRecordRequest):
    event_id = record_migration(record.model_dump())
    return {"status": "recorded", "eventId": event_id}

@router.get("/migrations")
def list_migrations(limit: int = 50):
    records = get_recent_migrations(limit)
    return {"migrations": records}
