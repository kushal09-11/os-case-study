import { createProcess, PROCESS_STATES, SECURITY_LEVELS, CACHE_SENSITIVITIES } from './processModel.js';
import { createCore, calculateCoreLoad } from './coreModel.js';
import { selectBestMigrationPlan, DEFAULT_WEIGHTS } from './migrationEngine.js';
import { scheduleProcess } from './scheduler.js';
import { api } from '../services/api.js';

export const SIMULATION_STATUS = {
  STOPPED: 'STOPPED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  MIGRATION_PENDING: 'MIGRATION_PENDING',
  COST_ANALYSIS: 'COST_ANALYSIS',
  SECURITY_CHECK: 'SECURITY_CHECK',
  MIGRATION_START: 'MIGRATION_START',
  MIGRATING: 'MIGRATING',
  MIGRATION_COMPLETE: 'MIGRATION_COMPLETE'
};

export const INITIAL_DEMO_PROCESSES = [
  { id: 'P1', name: 'P1-Worker', cpuDemand: 25, memory: 64, cacheSensitivity: CACHE_SENSITIVITIES.LOW, securityLevel: SECURITY_LEVELS.TRUSTED, duration: 32, arrivalTime: 0, priority: 1, targetCore: 0 },
  { id: 'P2', name: 'P2-Database', cpuDemand: 20, memory: 90, cacheSensitivity: CACHE_SENSITIVITIES.MEDIUM, securityLevel: SECURITY_LEVELS.TRUSTED, duration: 30, arrivalTime: 2.0, priority: 2, targetCore: 1 },
  { id: 'P3', name: 'P3-SearchIndex', cpuDemand: 22, memory: 75, cacheSensitivity: CACHE_SENSITIVITIES.LOW, securityLevel: SECURITY_LEVELS.TRUSTED, duration: 28, arrivalTime: 4.0, priority: 1, targetCore: 2 },
  { id: 'P4', name: 'P4-CryptoHash', cpuDemand: 28, memory: 120, cacheSensitivity: CACHE_SENSITIVITIES.HIGH, securityLevel: SECURITY_LEVELS.TRUSTED, duration: 26, arrivalTime: 6.0, priority: 3, targetCore: 1 },
  { id: 'P5', name: 'P5-PaymentGateway', cpuDemand: 38, memory: 80, cacheSensitivity: CACHE_SENSITIVITIES.LOW, securityLevel: SECURITY_LEVELS.SENSITIVE, duration: 25, arrivalTime: 8.0, priority: 2, targetCore: 1 },
  { id: 'P6', name: 'P6-AnalyticsBatch', cpuDemand: 24, memory: 110, cacheSensitivity: CACHE_SENSITIVITIES.MEDIUM, securityLevel: SECURITY_LEVELS.UNTRUSTED, duration: 24, arrivalTime: 10.0, priority: 1, targetCore: 3 }
];

export class SimulationEngine {
  constructor({ onStateChange }) {
    this.onStateChange = onStateChange;
    this.numCores = 4;
    this.speed = 1.0; // 0.5, 1, 2, 4
    this.simTime = 0.0;
    this.status = SIMULATION_STATUS.STOPPED;
    this.isDemoMode = false;
    this.demoStep = 0;

    this.cores = [];
    this.processes = [];
    this.readyQueue = [];
    this.eventLogs = [];
    this.timelineRecords = [];
    this.mlPrediction = null;
    this.migrationAnalysis = null;
    this.activeMigration = null;
    this.explanationText = "Welcome to CoreGuard. Press [START] or [RUN COMPLETE DEMO] to initiate the simulation.";

    this.timerId = null;
    this.lastTickTimestamp = null;
    this.weights = { ...DEFAULT_WEIGHTS };
    this.initCores();
  }

  initCores() {
    this.cores = Array.from({ length: this.numCores }, (_, i) => createCore(i));
  }

  setNumCores(count) {
    if (this.status === SIMULATION_STATUS.RUNNING) {
      this.pause();
    }
    this.numCores = count;
    this.initCores();
    this.emitState();
  }

  setSpeed(speed) {
    this.speed = speed;
    this.emitState();
  }

  setWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
    this.emitState();
  }

  logEvent(message) {
    const timeStr = this.simTime.toFixed(2);
    const entry = {
      id: `${Date.now()}-${Math.random()}`,
      time: timeStr,
      message
    };
    this.eventLogs.unshift(entry);
    if (this.eventLogs.length > 80) this.eventLogs.pop();
  }

  emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        simTime: this.simTime,
        status: this.status,
        speed: this.speed,
        numCores: this.numCores,
        cores: [...this.cores],
        processes: [...this.processes],
        readyQueue: [...this.readyQueue],
        eventLogs: [...this.eventLogs],
        timelineRecords: [...this.timelineRecords],
        mlPrediction: this.mlPrediction,
        migrationAnalysis: this.migrationAnalysis,
        activeMigration: this.activeMigration ? { ...this.activeMigration } : null,
        explanationText: this.explanationText,
        isDemoMode: this.isDemoMode
      });
    }
  }

  reset() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.simTime = 0.0;
    this.status = SIMULATION_STATUS.STOPPED;
    this.isDemoMode = false;
    this.demoStep = 0;
    this.initCores();
    this.processes = [];
    this.readyQueue = [];
    this.eventLogs = [];
    this.timelineRecords = [];
    this.mlPrediction = null;
    this.migrationAnalysis = null;
    this.activeMigration = null;
    this.explanationText = "Simulation reset. Ready for execution.";
    this.logEvent("Simulation reset to initial state (t = 0.00s)");
    this.emitState();
  }

  start() {
    if (this.status === SIMULATION_STATUS.RUNNING) return;
    this.status = SIMULATION_STATUS.RUNNING;
    this.explanationText = "Processes are currently being scheduled across available CPU cores.";
    this.logEvent("Simulation started");
    this.startLoop();
  }

  pause() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.status = SIMULATION_STATUS.PAUSED;
    this.explanationText = "Simulation paused. Click Resume or Step to proceed.";
    this.logEvent(`Simulation paused at ${this.simTime.toFixed(2)}s`);
    this.emitState();
  }

  resume() {
    if (this.status === SIMULATION_STATUS.PAUSED) {
      this.status = SIMULATION_STATUS.RUNNING;
      this.explanationText = "Simulation resumed.";
      this.logEvent("Simulation resumed");
      this.startLoop();
    }
  }

  step() {
    this.pause();
    this.tick(0.2);
  }

  startLoop() {
    if (this.timerId) clearInterval(this.timerId);
    const tickInterval = 100; // 100ms real time
    this.lastTickTimestamp = performance.now();

    this.timerId = setInterval(() => {
      const now = performance.now();
      const dtReal = (now - this.lastTickTimestamp) / 1000;
      this.lastTickTimestamp = now;

      // Scaled discrete simulation time step
      const dtSim = Math.min(0.2, dtReal * this.speed);
      this.tick(dtSim);
    }, tickInterval);
  }

  runCompleteDemo() {
    this.reset();
    this.isDemoMode = true;
    this.numCores = 4;
    this.initCores();
    this.status = SIMULATION_STATUS.RUNNING;
    this.explanationText = "Deterministic Complete Demo initiated: Observing predictable overload and security-aware migration.";
    this.logEvent("Starting complete end-to-end demo scenario");

    // Queue demo processes
    this.pendingDemoArrivals = INITIAL_DEMO_PROCESSES.map(p => ({ ...p }));
    this.startLoop();
  }

  generateOverload(targetCoreId = 1) {
    this.logEvent(`Manual load spike requested on Core ${targetCoreId}`);
    const heavyProc = createProcess({
      id: `P-SPIKE-${Math.floor(Math.random() * 900 + 100)}`,
      name: 'Batch-LoadSpike',
      cpuDemand: 45,
      memory: 160,
      cacheSensitivity: CACHE_SENSITIVITIES.HIGH,
      securityLevel: SECURITY_LEVELS.TRUSTED,
      duration: 15,
      arrivalTime: this.simTime,
      currentCore: targetCoreId,
      state: PROCESS_STATES.RUNNING
    });
    this.processes.push(heavyProc);
    this.logEvent(`Heavy workload ${heavyProc.id} (+45% CPU) injected into Core ${targetCoreId}`);
    this.recalculateCoreLoads();
    this.triggerMLPrediction(targetCoreId);
    this.emitState();
  }

  tick(dt) {
    if (this.status === SIMULATION_STATUS.PAUSED || this.status === SIMULATION_STATUS.STOPPED) return;

    this.simTime = Math.round((this.simTime + dt) * 100) / 100;

    // 1. Handle arrivals in demo mode or random generation
    if (this.isDemoMode && this.pendingDemoArrivals) {
      const arrivalsToSpawn = this.pendingDemoArrivals.filter(p => p.arrivalTime <= this.simTime);
      for (const item of arrivalsToSpawn) {
        this.pendingDemoArrivals = this.pendingDemoArrivals.filter(p => p.id !== item.id);
        const proc = createProcess(item);
        this.readyQueue.push(proc);
        this.logEvent(`[${this.simTime.toFixed(2)}s] ${proc.id} arrived (Demand: ${proc.cpuDemand}%, Mem: ${proc.memory}MB, Security: ${proc.securityLevel})`);
      }
    }

    // 2. Dispatch from Ready Queue to cores
    if (this.readyQueue.length > 0) {
      const nextProc = this.readyQueue.shift();
      const targetCore = nextProc.targetCore !== undefined && nextProc.targetCore !== null
        ? nextProc.targetCore
        : scheduleProcess(nextProc, this.cores, this.processes);

      nextProc.currentCore = targetCore;
      nextProc.state = PROCESS_STATES.RUNNING;
      nextProc.startTime = this.simTime;
      this.processes.push(nextProc);
      this.logEvent(`[${this.simTime.toFixed(2)}s] ${nextProc.id} assigned to Core ${targetCore}`);
    }

    // 3. Handle active animated migration
    if (this.activeMigration) {
      this.updateActiveMigration(dt);
    } else {
      // 4. Update running processes execution progress
      for (const proc of this.processes) {
        if (proc.state === PROCESS_STATES.RUNNING) {
          proc.remainingTime = Math.max(0, proc.remainingTime - dt);
          if (proc.remainingTime <= 0) {
            proc.state = PROCESS_STATES.COMPLETED;
            proc.completionTime = this.simTime;
            this.logEvent(`[${this.simTime.toFixed(2)}s] ${proc.id} COMPLETED. Leaving Core ${proc.currentCore}`);
          }
        }
      }

      // Record timeline segment
      for (const proc of this.processes) {
        if (proc.state === PROCESS_STATES.RUNNING && proc.currentCore !== null) {
          this.timelineRecords.push({
            time: this.simTime,
            coreId: proc.currentCore,
            processId: proc.id,
            securityLevel: proc.securityLevel
          });
        }
      }
      if (this.timelineRecords.length > 500) this.timelineRecords.shift();
    }

    // 5. Calculate live loads
    this.recalculateCoreLoads();

    // 6. Overload detection & automatic prediction check
    if (!this.activeMigration) {
      this.checkOverloadConditions();
    }

    this.emitState();
  }

  recalculateCoreLoads() {
    for (const core of this.cores) {
      const { load, status } = calculateCoreLoad(core.id, this.processes, this.activeMigration);
      core.load = load;
      core.status = status;
    }
  }

  async checkOverloadConditions() {
    // Check if any core exceeds 82% threshold
    for (const core of this.cores) {
      if (core.load >= 82 && !this.activeMigration && this.status === SIMULATION_STATUS.RUNNING) {
        this.explanationText = `Core ${core.id} is approaching CPU capacity (${core.load}%). The ML model predicts workload trajectory.`;
        this.logEvent(`[${this.simTime.toFixed(2)}s] Overload risk detected on Core ${core.id} (${core.load}%)`);
        await this.triggerMLPrediction(core.id);
        break;
      }
    }
  }

  async triggerMLPrediction(coreId) {
    const core = this.cores.find(c => c.id === coreId);
    if (!core) return;

    this.logEvent(`[${this.simTime.toFixed(2)}s] Requesting ML overload prediction for Core ${coreId}...`);

    const runningProcs = this.processes.filter(p => p.currentCore === coreId && p.state === 'RUNNING');
    const predResult = await api.predictOverload({
      coreId,
      currentLoad: core.load,
      prevLoad: Math.max(10, core.load - 6),
      movingAvg: core.load - 2,
      trend: 4.5,
      processCount: runningProcs.length,
      avgProcessLoad: runningProcs.length ? core.load / runningProcs.length : 20
    });

    this.mlPrediction = predResult;
    core.predictedLoad = predResult.predictedLoad;

    this.logEvent(`[${this.simTime.toFixed(2)}s] ML Predictor: Projected Load = ${predResult.predictedLoad}%, Overload = ${predResult.overloadPredicted ? 'LIKELY' : 'UNLIKELY'} (Confidence: ${predResult.confidence}%)`);

    if (predResult.overloadPredicted) {
      this.status = SIMULATION_STATUS.MIGRATION_PENDING;
      this.explanationText = `Core ${coreId} overload predicted (${predResult.predictedLoad}%). CoreGuard initiating migration candidate evaluation.`;
      this.logEvent(`[${this.simTime.toFixed(2)}s] Proactive migration sequence initiated for Core ${coreId}`);
      this.evaluateMigrationCandidates(coreId);
    }
    this.emitState();
  }

  evaluateMigrationCandidates(sourceCoreId) {
    this.status = SIMULATION_STATUS.COST_ANALYSIS;
    this.explanationText = "CoreGuard is evaluating candidate processes on the overloaded core: balancing Expected Benefit vs Migration Cost.";
    this.logEvent(`[${this.simTime.toFixed(2)}s] Calculating multi-attribute migration cost vector for candidates on Core ${sourceCoreId}...`);

    const planData = selectBestMigrationPlan({
      sourceCoreId,
      cores: this.cores,
      processes: this.processes,
      weights: this.weights,
      scoreThreshold: 4.0
    });

    this.migrationAnalysis = planData;

    if (planData.candidateEvaluations.length > 0) {
      for (const cand of planData.candidateEvaluations) {
        this.logEvent(`[${this.simTime.toFixed(2)}s] Evaluated ${cand.processId}: Benefit = +${cand.expectedBenefit}, Cost = ${cand.migrationCost} (Time: ${cand.migrationTime}s, Cache: ${cand.cachePenalty}, Sec: ${cand.securityPenalty}) => Score = ${cand.migrationScore > 0 ? '+' : ''}${cand.migrationScore}`);
      }
    }

    if (planData.bestPlan) {
      const best = planData.bestPlan;
      this.status = SIMULATION_STATUS.SECURITY_CHECK;
      this.explanationText = `Candidate ${best.process.id} (${best.process.securityLevel}) selected. Verifying security policy on target Core ${best.destCoreId}.`;
      this.logEvent(`[${this.simTime.toFixed(2)}s] Candidate ${best.process.id} selected. Performing co-tenancy security check on destination Core ${best.destCoreId}...`);

      setTimeout(() => {
        if (this.status !== SIMULATION_STATUS.STOPPED) {
          this.executeMigrationAnimation(best);
        }
      }, 1000 / this.speed);
    } else {
      this.logEvent(`[${this.simTime.toFixed(2)}s] No candidate met migration cost or security constraints. Maintaining current affinity.`);
      this.status = SIMULATION_STATUS.RUNNING;
      this.emitState();
    }
  }

  executeMigrationAnimation(plan) {
    const { process, sourceCoreId, destCoreId, evaluation } = plan;

    this.status = SIMULATION_STATUS.MIGRATING;
    this.explanationText = `Process ${process.id} is migrating from Core ${sourceCoreId} to Core ${destCoreId}. CPU load is dynamically redistributing.`;
    this.logEvent(`[${this.simTime.toFixed(2)}s] Security Check PASSED for Core ${destCoreId}. Commencing animated migration ${process.id} (Core ${sourceCoreId} ──► Core ${destCoreId})`);

    const sourceCore = this.cores.find(c => c.id === sourceCoreId);
    const destCore = this.cores.find(c => c.id === destCoreId);

    this.activeMigration = {
      processId: process.id,
      migratingProcess: process,
      sourceCoreId,
      destCoreId,
      progress: 0.0,
      duration: evaluation.migrationTime || 1.2,
      elapsed: 0.0,
      sourceLoadBefore: sourceCore.load,
      destLoadBefore: destCore.load,
      cost: evaluation.migrationCost,
      benefit: evaluation.expectedBenefit,
      score: evaluation.migrationScore
    };

    process.state = PROCESS_STATES.MIGRATING;
    this.emitState();
  }

  updateActiveMigration(dt) {
    if (!this.activeMigration) return;

    this.activeMigration.elapsed += dt;
    this.activeMigration.progress = Math.min(1.0, this.activeMigration.elapsed / this.activeMigration.duration);

    if (this.activeMigration.progress >= 1.0) {
      this.completeActiveMigration();
    }
  }

  completeActiveMigration() {
    if (!this.activeMigration) return;

    const { migratingProcess, sourceCoreId, destCoreId, cost, benefit, score, sourceLoadBefore, destLoadBefore } = this.activeMigration;

    migratingProcess.currentCore = destCoreId;
    migratingProcess.state = PROCESS_STATES.RUNNING;

    this.recalculateCoreLoads();

    const sourceCore = this.cores.find(c => c.id === sourceCoreId);
    const destCore = this.cores.find(c => c.id === destCoreId);

    this.logEvent(`[${this.simTime.toFixed(2)}s] MIGRATION COMPLETED! ${migratingProcess.id} safely relocated to Core ${destCoreId}.`);
    this.logEvent(`[${this.simTime.toFixed(2)}s] Core ${sourceCoreId} load relieved: ${sourceLoadBefore}% ──► ${sourceCore.load}%`);
    this.logEvent(`[${this.simTime.toFixed(2)}s] Core ${destCoreId} load absorbed: ${destLoadBefore}% ──► ${destCore.load}%`);

    this.explanationText = `Migration completed. Core ${sourceCoreId} load decreased and Core ${destCoreId} absorbed the workload. Net benefit: +${score}.`;
    this.status = SIMULATION_STATUS.RUNNING;

    // Record to database
    api.recordMigration({
      runId: this.isDemoMode ? 'complete-demo-run' : 'interactive-run',
      timestamp: this.simTime,
      processId: migratingProcess.id,
      sourceCore: sourceCoreId,
      destCore: destCoreId,
      migrationCost: cost,
      expectedBenefit: benefit,
      migrationScore: score,
      sourceLoadBefore,
      sourceLoadAfter: sourceCore.load,
      destLoadBefore,
      destLoadAfter: destCore.load,
      reason: 'Predictive Security-Aware Relief'
    });

    this.activeMigration = null;
    this.emitState();
  }
}
