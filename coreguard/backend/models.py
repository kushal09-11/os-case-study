from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ProcessModel(BaseModel):
    id: str
    name: str
    cpuDemand: float
    memory: float
    cacheSensitivity: str = "LOW"  # LOW, MEDIUM, HIGH
    securityLevel: str = "TRUSTED"  # TRUSTED, SENSITIVE, UNTRUSTED
    currentCore: Optional[int] = None
    state: str = "READY"  # NEW, READY, RUNNING, MIGRATION_PENDING, MIGRATING, COMPLETED
    arrivalTime: float = 0.0
    duration: float = 10.0
    remainingTime: float = 10.0
    priority: int = 1

class CoreModel(BaseModel):
    id: int
    load: float = 0.0
    status: str = "NORMAL"  # NORMAL, WARNING, OVERLOADED, MIGRATING, AVAILABLE
    processIds: List[str] = Field(default_factory=list)
    predictedLoad: Optional[float] = None

class PredictionRequest(BaseModel):
    coreId: int
    currentLoad: float
    prevLoad: float = 0.0
    movingAvg: float = 0.0
    trend: float = 0.0
    processCount: int = 1
    avgProcessLoad: float = 0.0

class PredictionResponse(BaseModel):
    coreId: int
    overloadPredicted: bool
    confidence: float
    predictedLoad: float
    riskLevel: str
    recommendation: str

class CandidateEvaluation(BaseModel):
    processId: str
    processName: str
    cpuDemand: float
    memory: float
    cacheSensitivity: str
    securityLevel: str
    migrationTime: float
    memoryPenalty: float
    cachePenalty: float
    securityPenalty: float
    migrationCost: float
    expectedBenefit: float
    migrationScore: float
    securityPass: bool
    securityReason: str
    destinationScores: Dict[int, float] = Field(default_factory=dict)
    bestDestinationCore: Optional[int] = None
    eligible: bool = False

class DestinationAnalysis(BaseModel):
    coreId: int
    currentLoad: float
    projectedLoad: float
    securityPass: bool
    securityReason: str
    migrationCost: float
    score: float
    decision: str  # APPROVED, BLOCKED, CAPACITY_EXCEEDED

class MigrationAnalysisRequest(BaseModel):
    sourceCoreId: int
    candidates: List[ProcessModel]
    cores: List[CoreModel]
    weights: Optional[Dict[str, float]] = None
    scoreThreshold: float = 5.0

class MigrationAnalysisResponse(BaseModel):
    sourceCoreId: int
    recommendedProcessId: Optional[str]
    destinationCoreId: Optional[int]
    evaluations: List[CandidateEvaluation]
    destinationAnalyses: List[DestinationAnalysis]
    decision: str
    summary: str

class MigrationRecordRequest(BaseModel):
    runId: Optional[str] = "demo-run"
    timestamp: float
    processId: str
    sourceCore: int
    destCore: int
    migrationCost: float
    expectedBenefit: float
    migrationScore: float
    reason: str = "Predictive Load Rebalancing"
    sourceLoadBefore: float = 0.0
    sourceLoadAfter: float = 0.0
    destLoadBefore: float = 0.0
    destLoadAfter: float = 0.0

class MetricsRecordRequest(BaseModel):
    runId: str
    timestamp: float
    mode: str = "PREDICTIVE"  # PREDICTIVE vs REACTIVE
    maxCpuLoad: float
    avgCpuUtilization: float
    loadImbalance: float
    migrationsCount: int
    totalOverhead: float
    avgResponseTime: float
    securityViolationsPrevented: int = 0
