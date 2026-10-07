import { createProcess, PROCESS_STATES, SECURITY_LEVELS, CACHE_SENSITIVITIES } from './processModel.js';
import { createCore, calculateCoreLoad } from './coreModel.js';
import { selectBestMigrationPlan, DEFAULT_WEIGHTS } from './migrationEngine.js';
import { scheduleProcess } from './scheduler.js';
import { api } from '../services/api.js';

export const SIMULATION_STATUS = {
  STOPPED: 'STOPPED', RUNNING: 'RUNNING', PAUSED: 'PAUSED',
  MIGRATION_PENDING: 'MIGRATION_PENDING', COST_ANALYSIS: 'COST_ANALYSIS',
  SECURITY_CHECK: 'SECURITY_CHECK', DECISION_WINDOW: 'DECISION_WINDOW',
  MIGRATING: 'MIGRATING'
};

export const SCENARIO_MODES = {
  AUTOMATIC: 'AUTOMATIC',
  GUIDED: 'GUIDED_DEMO',
  MANUAL: 'MANUAL_DEMO'
};

export const INITIAL_DEMO_PROCESSES = [
  { id: 'P1', name: 'P1-Worker', cpuDemand: 25, memory: 64, cacheSensitivity: CACHE_SENSITIVITIES.LOW, securityLevel: SECURITY_LEVELS.TRUSTED, duration: 32, arrivalTime: 0, priority: 1, targetCore: 0 },
  { id: 'P2', name: 'P2-Database', cpuDemand: 20, memory: 90, cacheSensitivity: CACHE_SENSITIVITIES.MEDIUM, securityLevel: SECURITY_LEVELS.TRUSTED, duration: 30, arrivalTime: 2, priority: 2, targetCore: 1 },
  { id: 'P3', name: 'P3-SearchIndex', cpuDemand: 22, memory: 75, cacheSensitivity: CACHE_SENSITIVITIES.LOW, securityLevel: SECURITY_LEVELS.TRUSTED, duration: 28, arrivalTime: 4, priority: 1, targetCore: 2 },
  { id: 'P4', name: 'P4-CryptoHash', cpuDemand: 28, memory: 120, cacheSensitivity: CACHE_SENSITIVITIES.HIGH, securityLevel: SECURITY_LEVELS.TRUSTED, duration: 26, arrivalTime: 6, priority: 3, targetCore: 1 },
  { id: 'P5', name: 'P5-PaymentGateway', cpuDemand: 38, memory: 80, cacheSensitivity: CACHE_SENSITIVITIES.LOW, securityLevel: SECURITY_LEVELS.SENSITIVE, duration: 25, arrivalTime: 8, priority: 2, targetCore: 1 },
  { id: 'P6', name: 'P6-AnalyticsBatch', cpuDemand: 24, memory: 110, cacheSensitivity: CACHE_SENSITIVITIES.MEDIUM, securityLevel: SECURITY_LEVELS.UNTRUSTED, duration: 24, arrivalTime: 10, priority: 1, targetCore: 3 }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = value => Math.round(value * 10) / 10;

export class SimulationEngine {
  constructor({ onStateChange }) {
    this.onStateChange = onStateChange;
    this.numCores = 4;
    this.speed = 1;
    this.simTime = 0;
    this.status = SIMULATION_STATUS.STOPPED;
    this.pauseContext = null;
    this.mode = SCENARIO_MODES.AUTOMATIC;
    this.automaticWorkload = true;
    this.seed = 42;
    this.rngState = this.seed;
    this.decisionDelay = 5;
    this.decisionRemaining = 0;
    this.decisionPaused = false;
    this.cores = [];
    this.processes = [];
    this.readyQueue = [];
    this.eventLogs = [];
    this.timelineRecords = [];
    this.migrationHistory = [];
    this.mlPrediction = null;
    this.migrationAnalysis = null;
    this.activeMigration = null;
    this.explanationText = 'Choose Automatic Simulation or Guided Demo, then press Start.';
    this.timerId = null;
    this.lastTickTimestamp = null;
    this.weights = { ...DEFAULT_WEIGHTS };
    this.nextArrivalAt = 0;
    this.nextSpikeAt = 7;
    this.nextProcessNumber = 1;
    this.predictionInFlight = false;
    this.lastPredictionAt = new Map();
    this.migrationCooldownUntil = 0;
    this.pendingDemoArrivals = [];
    this.initCores();
    this.emitState();
  }

  random() {
    // Small deterministic PRNG: random scenarios remain reproducible when the seed is fixed.
    this.rngState = (1664525 * this.rngState + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }

  randomBetween(min, max) { return min + this.random() * (max - min); }

  initCores() { this.cores = Array.from({ length: this.numCores }, (_, id) => createCore(id)); }

  emitState() {
    this.onStateChange?.({
      simTime: this.simTime, status: this.status, speed: this.speed, numCores: this.numCores,
      cores: [...this.cores], processes: [...this.processes], readyQueue: [...this.readyQueue],
      eventLogs: [...this.eventLogs], timelineRecords: [...this.timelineRecords],
      migrationHistory: [...this.migrationHistory], mlPrediction: this.mlPrediction,
      migrationAnalysis: this.migrationAnalysis,
      activeMigration: this.activeMigration ? { ...this.activeMigration } : null,
      explanationText: this.explanationText, isDemoMode: this.mode === SCENARIO_MODES.GUIDED,
      mode: this.mode, automaticWorkload: this.automaticWorkload,
      decisionDelay: this.decisionDelay, decisionRemaining: this.decisionRemaining,
      decisionPaused: this.decisionPaused, weights: { ...this.weights }
    });
  }

  logEvent(message) {
    this.eventLogs.unshift({ id: `${this.simTime}-${Math.random()}`, time: this.simTime.toFixed(2), message });
    if (this.eventLogs.length > 120) this.eventLogs.pop();
  }

  setMode(mode) {
    this.mode = mode;
    this.automaticWorkload = mode === SCENARIO_MODES.AUTOMATIC;
    this.logEvent(`Scenario mode changed to ${mode.replace('_', ' ')}`);
    this.emitState();
  }

  setAutomaticWorkload(enabled) { this.automaticWorkload = enabled; this.emitState(); }
  setDecisionDelay(seconds) { this.decisionDelay = clamp(Number(seconds) || 5, 1, 15); this.emitState(); }
  setSeed(seed) { this.seed = Number(seed) || 42; this.rngState = this.seed; this.logEvent(`Random seed set to ${this.seed}`); this.emitState(); }
  setSpeed(speed) { this.speed = Number(speed); this.emitState(); }
  setWeights(newWeights) { this.weights = { ...this.weights, ...newWeights }; this.emitState(); }

  setNumCores(count) {
    this.pause();
    this.numCores = Number(count);
    this.reset();
  }

  reset() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    this.simTime = 0;
    this.status = SIMULATION_STATUS.STOPPED;
    this.pauseContext = null;
    this.decisionRemaining = 0;
    this.decisionPaused = false;
    this.initCores();
    this.processes = [];
    this.readyQueue = [];
    this.eventLogs = [];
    this.timelineRecords = [];
    this.migrationHistory = [];
    this.mlPrediction = null;
    this.migrationAnalysis = null;
    this.activeMigration = null;
    this.pendingDemoArrivals = [];
    this.nextArrivalAt = 0;
    this.nextSpikeAt = this.mode === SCENARIO_MODES.AUTOMATIC ? 7 : Infinity;
    this.nextProcessNumber = 1;
    this.rngState = this.seed;
    this.lastPredictionAt = new Map();
    this.migrationCooldownUntil = 0;
    this.explanationText = 'Simulation reset. Start the workload generator when ready.';
    this.logEvent('Simulation reset; dynamic scheduler ready');
    this.emitState();
  }

  start() {
    if (this.status === SIMULATION_STATUS.RUNNING || this.status === SIMULATION_STATUS.MIGRATING || this.status === SIMULATION_STATUS.DECISION_WINDOW) return;
    if (this.mode === SCENARIO_MODES.GUIDED && this.pendingDemoArrivals.length === 0 && this.processes.length === 0) {
      this.pendingDemoArrivals = INITIAL_DEMO_PROCESSES.map(process => ({ ...process }));
    }
    this.status = SIMULATION_STATUS.RUNNING;
    this.explanationText = this.mode === SCENARIO_MODES.AUTOMATIC ? 'Automatic workload is evolving: arrivals, execution, spikes, and ML forecasts are live.' : 'Guided/manual workload is running; migration destinations remain dynamically calculated.';
    this.logEvent(`Simulation started (${this.mode.replace('_', ' ')})`);
    this.startLoop();
    this.emitState();
  }

  pause() {
    if (this.status === SIMULATION_STATUS.PAUSED) return;
    this.pauseContext = this.status;
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    this.status = SIMULATION_STATUS.PAUSED;
    this.logEvent(`Simulation paused at ${this.simTime.toFixed(2)}s`);
    this.emitState();
  }

  resume() {
    if (this.status !== SIMULATION_STATUS.PAUSED) return;
    this.status = this.pauseContext || SIMULATION_STATUS.RUNNING;
    this.pauseContext = null;
    this.logEvent(this.status === SIMULATION_STATUS.DECISION_WINDOW ? 'Decision window resumed' : 'Simulation resumed');
    this.startLoop();
    this.emitState();
  }

  skipDecisionDelay() {
    const inDecision = this.status === SIMULATION_STATUS.DECISION_WINDOW || (this.status === SIMULATION_STATUS.PAUSED && this.pauseContext === SIMULATION_STATUS.DECISION_WINDOW);
    if (!inDecision || !this.migrationAnalysis?.bestPlan) return;
    this.decisionRemaining = 0;
    this.decisionPaused = false;
    this.logEvent('Decision delay skipped by operator');
    this.executeMigrationAnimation(this.migrationAnalysis.bestPlan);
    this.emitState();
  }

  step() { if (this.status === SIMULATION_STATUS.PAUSED) { this.status = this.pauseContext || SIMULATION_STATUS.RUNNING; this.tick(0.2); this.status = SIMULATION_STATUS.PAUSED; this.emitState(); } else { this.pause(); } }

  startLoop() {
    if (this.timerId) clearInterval(this.timerId);
    this.lastTickTimestamp = performance.now();
    this.timerId = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.2, ((now - this.lastTickTimestamp) / 1000) * this.speed);
      this.lastTickTimestamp = now;
      this.tick(dt);
    }, 100);
  }

  runCompleteDemo() {
    this.mode = SCENARIO_MODES.GUIDED;
    this.automaticWorkload = false;
    this.reset();
    this.pendingDemoArrivals = INITIAL_DEMO_PROCESSES.map(process => ({ ...process }));
    this.logEvent('Guided demo loaded: source workload is controlled; destination is not scripted');
    this.start();
  }

  generateOverload(targetCoreId = null) {
    const target = targetCoreId ?? this.cores.slice().sort((a, b) => a.load - b.load).at(-1)?.id ?? 0;
    const process = createProcess({
      id: `P-SPIKE-${this.nextProcessNumber++}`,
      name: 'Injected-Workload', cpuDemand: round(this.randomBetween(30, 44)), memory: round(this.randomBetween(96, 168)),
      cacheSensitivity: CACHE_SENSITIVITIES.HIGH, securityLevel: SECURITY_LEVELS.TRUSTED,
      duration: round(this.randomBetween(12, 20)), arrivalTime: this.simTime, currentCore: target, state: PROCESS_STATES.RUNNING
    });
    this.processes.push(process);
    this.logEvent(`Manual Inject Load: ${process.id} added to Core ${target} (+${process.cpuDemand}% CPU)`);
    this.recalculateCoreLoads();
    this.triggerMLPrediction(target, true);
    this.emitState();
  }

  spawnRandomProcess() {
    const process = createProcess({
      id: `P${this.nextProcessNumber++}`, name: `Auto-${['Worker', 'Indexer', 'API', 'Batch'][Math.floor(this.random() * 4)]}`,
      cpuDemand: round(this.randomBetween(12, 28)), memory: round(this.randomBetween(48, 140)),
      cacheSensitivity: [CACHE_SENSITIVITIES.LOW, CACHE_SENSITIVITIES.MEDIUM, CACHE_SENSITIVITIES.HIGH][Math.floor(this.random() * 3)],
      securityLevel: [SECURITY_LEVELS.TRUSTED, SECURITY_LEVELS.TRUSTED, SECURITY_LEVELS.SENSITIVE, SECURITY_LEVELS.UNTRUSTED][Math.floor(this.random() * 4)],
      duration: round(this.randomBetween(16, 30)), arrivalTime: this.simTime, priority: Math.ceil(this.random() * 3)
    });
    this.readyQueue.push(process);
    this.logEvent(`${process.id} arrived (demand ${process.cpuDemand}%, ${process.memory}MB, ${process.securityLevel})`);
  }

  spawnWorkloadSpike() {
    const target = Math.floor(this.random() * this.numCores);
    const process = createProcess({
      id: `P${this.nextProcessNumber++}`, name: 'Workload-Spike', cpuDemand: round(this.randomBetween(18, 32)), memory: round(this.randomBetween(72, 150)),
      cacheSensitivity: CACHE_SENSITIVITIES.MEDIUM, securityLevel: SECURITY_LEVELS.TRUSTED, duration: round(this.randomBetween(12, 20)), arrivalTime: this.simTime, currentCore: target, state: PROCESS_STATES.RUNNING
    });
    this.processes.push(process);
    this.logEvent(`Workload spike detected on Core ${target}: ${process.id} +${process.cpuDemand}% CPU`);
  }

  dispatchReadyQueue() {
    if (!this.readyQueue.length) return;
    const process = this.readyQueue.shift();
    const coreId = scheduleProcess(process, this.cores, this.processes);
    process.currentCore = coreId;
    process.state = PROCESS_STATES.RUNNING;
    process.startTime = this.simTime;
    this.processes.push(process);
    this.logEvent(`${process.id} scheduled on Core ${coreId}`);
  }

  tick(dt) {
    if (this.status === SIMULATION_STATUS.STOPPED || this.status === SIMULATION_STATUS.PAUSED) return;
    this.simTime = Math.round((this.simTime + dt) * 100) / 100;

    if (this.status === SIMULATION_STATUS.DECISION_WINDOW) {
      if (!this.decisionPaused) {
        this.decisionRemaining = Math.max(0, this.decisionRemaining - dt);
        const previousSecond = Math.ceil(this.decisionRemaining + dt);
        const currentSecond = Math.ceil(this.decisionRemaining);
        if (currentSecond < previousSecond && currentSecond > 0) this.logEvent(`Decision window: migration starts in ${currentSecond}s`);
        if (this.decisionRemaining <= 0 && this.migrationAnalysis?.bestPlan) this.executeMigrationAnimation(this.migrationAnalysis.bestPlan);
      }
      this.emitState();
      return;
    }

    if (this.mode === SCENARIO_MODES.GUIDED) {
      const arrivals = this.pendingDemoArrivals.filter(item => item.arrivalTime <= this.simTime);
      this.pendingDemoArrivals = this.pendingDemoArrivals.filter(item => item.arrivalTime > this.simTime);
      arrivals.forEach(item => { this.readyQueue.push(createProcess(item)); this.logEvent(`${item.id} arrived in ready queue`); });
    } else if (this.automaticWorkload) {
      if (this.simTime >= this.nextArrivalAt) { this.spawnRandomProcess(); this.nextArrivalAt = this.simTime + this.randomBetween(1.2, 3.4); }
      if (this.simTime >= this.nextSpikeAt) { this.spawnWorkloadSpike(); this.nextSpikeAt = this.simTime + this.randomBetween(8, 14); }
    }

    this.dispatchReadyQueue();
    if (this.activeMigration) this.updateActiveMigration(dt);
    else {
      this.processes.forEach(process => {
        if (process.state !== PROCESS_STATES.RUNNING) return;
        process.remainingTime = Math.max(0, process.remainingTime - dt);
        // Controlled demand variation makes the workload dynamic but bounded.
        if (this.automaticWorkload && this.random() < dt * 0.7) process.cpuDemand = round(clamp(process.cpuDemand + this.randomBetween(-2.5, 3.5), 8, 48));
        if (process.remainingTime <= 0) { process.state = PROCESS_STATES.COMPLETED; process.completionTime = this.simTime; this.logEvent(`${process.id} completed on Core ${process.currentCore}`); }
      });
      this.timelineRecords.push(...this.processes.filter(p => p.state === PROCESS_STATES.RUNNING && p.currentCore !== null).map(p => ({ time: this.simTime, coreId: p.currentCore, processId: p.id, securityLevel: p.securityLevel })));
      if (this.timelineRecords.length > 600) this.timelineRecords.splice(0, this.timelineRecords.length - 600);
    }

    this.recalculateCoreLoads();
    if (!this.activeMigration && this.status === SIMULATION_STATUS.RUNNING) this.checkOverloadConditions();
    this.emitState();
  }

  recalculateCoreLoads() {
    this.cores.forEach(core => {
      const result = calculateCoreLoad(core.id, this.processes, this.activeMigration);
      core.load = result.load;
      core.status = result.status;
      core.processIds = this.processes.filter(p => p.currentCore === core.id && p.state !== PROCESS_STATES.COMPLETED).map(p => p.id);
      core.history = [...(core.history || []), { time: this.simTime, load: core.load }].slice(-30);
    });
  }

  checkOverloadConditions() {
    if (this.simTime < this.migrationCooldownUntil || this.predictionInFlight) return;
    const candidates = this.cores.filter(core => core.load >= 68 && (this.simTime - (this.lastPredictionAt.get(core.id) || -Infinity)) > 3);
    const core = candidates.sort((a, b) => b.load - a.load)[0];
    if (!core) return;
    this.logEvent(`Core ${core.id} rising load = ${core.load}% — requesting ML future-overload prediction`);
    this.triggerMLPrediction(core.id);
  }

  async triggerMLPrediction(coreId, forced = false) {
    const core = this.cores.find(item => item.id === coreId);
    if (!core || this.predictionInFlight || (this.status !== SIMULATION_STATUS.RUNNING && !forced)) return;
    this.predictionInFlight = true;
    this.lastPredictionAt.set(coreId, this.simTime);
    const running = this.processes.filter(p => p.currentCore === coreId && p.state === PROCESS_STATES.RUNNING);
    const history = core.history?.slice(-8).map(item => item.load) || [];
    const prevLoad = history.length > 1 ? history.at(-2) : Math.max(0, core.load - 4);
    const movingAvg = history.length ? history.reduce((sum, value) => sum + value, 0) / history.length : core.load;
    const trend = round(core.load - prevLoad);
    const result = await api.predictOverload({ coreId, currentLoad: core.load, prevLoad, movingAvg, trend, processCount: running.length, avgProcessLoad: running.length ? core.load / running.length : 0 });
    this.predictionInFlight = false;
    if (this.status === SIMULATION_STATUS.STOPPED) return;
    this.mlPrediction = { ...result, currentLoad: round(core.load), prevLoad: round(prevLoad), movingAvg: round(movingAvg), trend: round(trend), overloadProbability: result.overloadProbability ?? result.confidence };
    core.predictedLoad = result.predictedLoad;
    this.logEvent(`ML prediction Core ${coreId}: current ${core.load}% → predicted ${result.predictedLoad}% (${result.overloadProbability ?? result.confidence}% probability) — ${result.overloadPredicted ? 'OVERLOAD LIKELY' : 'nominal'}`);
    if (result.overloadPredicted || result.predictedLoad >= 88) this.evaluateMigrationCandidates(coreId);
    else this.explanationText = `ML forecasts Core ${coreId} at ${result.predictedLoad}%; migration is not required yet.`;
    this.emitState();
  }

  evaluateMigrationCandidates(sourceCoreId) {
    this.status = SIMULATION_STATUS.COST_ANALYSIS;
    this.explanationText = `ML predicts future overload. Migration Engine is evaluating every eligible process and every destination core.`;
    const planData = selectBestMigrationPlan({ sourceCoreId, cores: this.cores, processes: this.processes, weights: this.weights, scoreThreshold: 5 });
    this.migrationAnalysis = planData;
    planData.candidateEvaluations.forEach(candidate => this.logEvent(`${candidate.processId} score = ${candidate.migrationScore > 0 ? '+' : ''}${candidate.migrationScore} (benefit ${candidate.expectedBenefit} - cost ${candidate.migrationCost})`));
    planData.candidateEvaluations.forEach(candidate => candidate.destinationAnalyses.forEach(destination => this.logEvent(`Core ${destination.coreId} ${destination.securityPass ? `score = ${destination.score}` : `rejected: ${destination.securityReason}`}`)));
    if (!planData.bestPlan) {
      this.status = SIMULATION_STATUS.RUNNING;
      this.explanationText = planData.decision === 'NO_VALID_DESTINATION' ? 'MIGRATION BLOCKED — no suitable destination core.' : 'MIGRATION NOT BENEFICIAL — the best valid score does not exceed the threshold.';
      this.logEvent(this.explanationText);
      this.emitState();
      return;
    }

    const best = planData.bestPlan;
    const sourceCore = this.cores.find(core => core.id === sourceCoreId);
    const destination = this.cores.find(core => core.id === best.destCoreId);
    this.status = SIMULATION_STATUS.DECISION_WINDOW;
    this.decisionRemaining = this.decisionDelay;
    this.decisionPaused = false;
    this.migrationAnalysis = { ...planData, decisionStartedAt: this.simTime, decisionRemaining: this.decisionRemaining, sourceLoadBefore: sourceCore?.load ?? 0, sourceLoadAfter: round((sourceCore?.load ?? 0) - best.evaluation.expectedBenefit), destLoadBefore: destination?.load ?? 0, destLoadAfter: round((destination?.load ?? 0) + best.process.cpuDemand) };
    best.process.state = PROCESS_STATES.MIGRATION_PENDING;
    this.explanationText = `Decision window: ${best.process.id} is the highest-scoring valid candidate. Review cost, benefit, capacity, and security before migration.`;
    this.logEvent(`${best.process.id} selected → Core ${best.destCoreId}; decision window started (${this.decisionDelay}s)`);
    this.emitState();
  }

  executeMigrationAnimation(plan) {
    if (!plan?.process || this.activeMigration) return;
    const source = this.cores.find(core => core.id === plan.sourceCoreId);
    const destination = this.cores.find(core => core.id === plan.destCoreId);
    const evaluation = plan.evaluation;
    this.status = SIMULATION_STATUS.MIGRATING;
    this.activeMigration = {
      processId: plan.process.id, migratingProcess: plan.process, sourceCoreId: plan.sourceCoreId, destCoreId: plan.destCoreId,
      progress: 0, elapsed: 0, duration: Math.max(1.6, evaluation.migrationTime * 1.4),
      sourceLoadBefore: source?.load ?? 0, destLoadBefore: destination?.load ?? 0,
      sourceLoadAfter: round((source?.load ?? 0) - evaluation.expectedBenefit), destLoadAfter: round((destination?.load ?? 0) + plan.process.cpuDemand),
      cost: evaluation.migrationCost, benefit: evaluation.expectedBenefit, score: evaluation.migrationScore,
      costBreakdown: { migrationTime: evaluation.migrationTime, memoryPenalty: evaluation.memoryPenalty, cachePenalty: evaluation.cachePenalty, securityPenalty: evaluation.securityPenalty }
    };
    plan.process.state = PROCESS_STATES.MIGRATING;
    this.logEvent(`Migration started: ${plan.process.id} Core ${plan.sourceCoreId} → Core ${plan.destCoreId}`);
    this.emitState();
  }

  updateActiveMigration(dt) {
    if (!this.activeMigration) return;
    this.activeMigration.elapsed += dt;
    this.activeMigration.progress = clamp(this.activeMigration.elapsed / this.activeMigration.duration, 0, 1);
    this.recalculateCoreLoads();
    if (this.activeMigration.progress >= 1) this.completeActiveMigration();
  }

  completeActiveMigration() {
    const migration = this.activeMigration;
    if (!migration) return;
    migration.migratingProcess.currentCore = migration.destCoreId;
    migration.migratingProcess.state = PROCESS_STATES.RUNNING;
    this.recalculateCoreLoads();
    const source = this.cores.find(core => core.id === migration.sourceCoreId);
    const destination = this.cores.find(core => core.id === migration.destCoreId);
    this.migrationHistory.unshift({ id: this.migrationHistory.length + 1, timestamp: this.simTime, processId: migration.processId, sourceCore: migration.sourceCoreId, destCore: migration.destCoreId, migrationCost: migration.cost, expectedBenefit: migration.benefit, migrationScore: migration.score, sourceLoadBefore: migration.sourceLoadBefore, sourceLoadAfter: source?.load ?? 0, destLoadBefore: migration.destLoadBefore, destLoadAfter: destination?.load ?? 0, security: 'PASS', result: 'SUCCESS', reason: 'Predicted future overload' });
    this.logEvent(`Migration completed: ${migration.processId} is now on Core ${migration.destCoreId}`);
    this.logEvent(`Live loads: Core ${migration.sourceCoreId} ${migration.sourceLoadBefore}% → ${source?.load}% | Core ${migration.destCoreId} ${migration.destLoadBefore}% → ${destination?.load}%`);
    api.recordMigration({ runId: this.mode, timestamp: this.simTime, processId: migration.processId, sourceCore: migration.sourceCoreId, destCore: migration.destCoreId, migrationCost: migration.cost, expectedBenefit: migration.benefit, migrationScore: migration.score, sourceLoadBefore: migration.sourceLoadBefore, sourceLoadAfter: source?.load ?? 0, destLoadBefore: migration.destLoadBefore, destLoadAfter: destination?.load ?? 0, reason: 'Predicted future overload' });
    this.migrationCooldownUntil = this.simTime + 4;
    this.activeMigration = null;
    this.status = SIMULATION_STATUS.RUNNING;
    this.explanationText = `Migration complete. Cooldown active for 4 simulation seconds to prevent thrashing.`;
    this.emitState();
  }
}
