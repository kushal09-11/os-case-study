import { 
  createProcess, 
  generateDynamicProcess, 
  PROCESS_STATES, 
  SECURITY_LEVELS, 
  CACHE_SENSITIVITIES, 
  WORKLOAD_CLASSES 
} from './processModel.js';
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
  DECISION_WINDOW: 'DECISION_WINDOW',
  MIGRATING: 'MIGRATING'
};

export const SCENARIO_MODES = {
  AUTOMATIC: 'AUTOMATIC',
  GUIDED: 'GUIDED_DEMO',
  MANUAL: 'MANUAL_DEMO'
};

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
    
    // Seed and PRNG
    this.seed = this.generateNewSeed();
    this.rngState = this.seed;
    this.boundRandom = () => this.random();

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
    this.explanationText = 'Dynamic OS workload simulator ready. Press Start to observe natural multicore scheduling.';
    
    this.timerId = null;
    this.lastTickTimestamp = null;
    this.weights = { ...DEFAULT_WEIGHTS };
    
    // Workload scheduling & staggered arrival timings
    this.nextArrivalAt = 0;
    this.nextSpikeAt = 9;
    this.nextProcessNumber = 1;
    
    // Overload & cooldown controls
    this.globalOverloadCooldownUntil = 0;
    this.coreRecoveryCooldown = new Map(); // coreId -> cooldownEndTime
    this.maxSimultaneousOverloads = 2;
    this.predictionInFlight = false;
    this.lastPredictionAt = new Map();
    this.migrationCooldownUntil = 0;

    this.initCores();
    console.log(`[RUN] CoreGuard Engine initialized with Seed: ${this.seed}`);
    this.emitState();
  }

  generateNewSeed() {
    return ((Math.floor(Date.now() % 1000000) * 1000) + Math.floor(Math.random() * 900 + 100)) >>> 0;
  }

  random() {
    // Linear Congruential PRNG with uniform distribution
    this.rngState = (1664525 * this.rngState + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }

  randomBetween(min, max) { 
    return min + this.random() * (max - min); 
  }

  initCores() { 
    this.cores = Array.from({ length: this.numCores }, (_, id) => createCore(id)); 
  }

  emitState() {
    this.onStateChange?.({
      simTime: this.simTime, 
      status: this.status, 
      speed: this.speed, 
      numCores: this.numCores,
      cores: [...this.cores], 
      processes: [...this.processes], 
      readyQueue: [...this.readyQueue],
      eventLogs: [...this.eventLogs], 
      timelineRecords: [...this.timelineRecords],
      migrationHistory: [...this.migrationHistory], 
      mlPrediction: this.mlPrediction,
      migrationAnalysis: this.migrationAnalysis,
      activeMigration: this.activeMigration ? { ...this.activeMigration } : null,
      explanationText: this.explanationText, 
      isDemoMode: this.mode === SCENARIO_MODES.GUIDED,
      mode: this.mode, 
      automaticWorkload: this.automaticWorkload,
      decisionDelay: this.decisionDelay, 
      decisionRemaining: this.decisionRemaining,
      decisionPaused: this.decisionPaused, 
      weights: { ...this.weights },
      seed: this.seed
    });
  }

  logEvent(message) {
    this.eventLogs.unshift({ 
      id: `${this.simTime}-${Math.random()}`, 
      time: this.simTime.toFixed(2), 
      message 
    });
    if (this.eventLogs.length > 150) this.eventLogs.pop();
  }

  setMode(mode) {
    this.mode = mode;
    this.automaticWorkload = mode === SCENARIO_MODES.AUTOMATIC;
    this.logEvent(`Scenario mode set to ${mode.replace('_', ' ')}`);
    this.emitState();
  }

  setAutomaticWorkload(enabled) { 
    this.automaticWorkload = enabled; 
    this.emitState(); 
  }

  setDecisionDelay(seconds) { 
    this.decisionDelay = clamp(Number(seconds) || 5, 1, 15); 
    this.emitState(); 
  }

  setSeed(seed) { 
    this.seed = Number(seed) || 42; 
    this.rngState = this.seed; 
    console.log(`[RUN] Seed manually set to ${this.seed}`);
    this.logEvent(`Seed set to ${this.seed}`); 
    this.emitState(); 
  }

  setSpeed(speed) { 
    this.speed = Number(speed); 
    this.emitState(); 
  }

  setWeights(newWeights) { 
    this.weights = { ...this.weights, ...newWeights }; 
    this.emitState(); 
  }

  setNumCores(count) {
    this.pause();
    this.numCores = Number(count);
    this.reset();
  }

  /**
   * Complete Simulation Reset (Part E, U)
   * Generates a brand new random seed, clears all running/completed state,
   * and prepares a completely fresh workload realization.
   */
  reset(customSeed = null) {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    this.simTime = 0;
    this.status = SIMULATION_STATUS.STOPPED;
    this.pauseContext = null;
    this.decisionRemaining = 0;
    this.decisionPaused = false;
    
    // Generate new random seed on each reset unless custom seed provided
    this.seed = customSeed !== null ? Number(customSeed) : this.generateNewSeed();
    this.rngState = this.seed;
    console.log(`[RUN] New simulation seed: ${this.seed}`);

    this.initCores();
    this.processes = [];
    this.readyQueue = [];
    this.eventLogs = [];
    this.timelineRecords = [];
    this.migrationHistory = [];
    this.mlPrediction = null;
    this.migrationAnalysis = null;
    this.activeMigration = null;
    
    // Schedule first arrival at t = 0
    this.nextArrivalAt = 0;
    this.nextSpikeAt = 8 + this.randomBetween(2, 6);
    this.nextProcessNumber = 1;
    
    // Clear cooldowns
    this.globalOverloadCooldownUntil = 0;
    this.coreRecoveryCooldown = new Map();
    this.lastPredictionAt = new Map();
    this.migrationCooldownUntil = 0;

    this.explanationText = `New simulation realization initialized (Seed: ${this.seed}). Press Start to run.`;
    this.logEvent(`[RUN] Simulation reset with new random seed ${this.seed}`);
    this.emitState();
  }

  start() {
    if (this.status === SIMULATION_STATUS.RUNNING || 
        this.status === SIMULATION_STATUS.MIGRATING || 
        this.status === SIMULATION_STATUS.DECISION_WINDOW) return;
        
    this.status = SIMULATION_STATUS.RUNNING;
    this.explanationText = 'Dynamic workload is evolving: staggered arrivals, runtime execution, and ML forecasts active.';
    this.logEvent(`[RUN] Simulation started (Seed: ${this.seed}, Mode: ${this.mode.replace('_', ' ')})`);
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
    const inDecision = this.status === SIMULATION_STATUS.DECISION_WINDOW || 
      (this.status === SIMULATION_STATUS.PAUSED && this.pauseContext === SIMULATION_STATUS.DECISION_WINDOW);
    if (!inDecision || !this.migrationAnalysis?.bestPlan) return;
    this.decisionRemaining = 0;
    this.decisionPaused = false;
    this.logEvent('Decision delay skipped by operator');
    this.executeMigrationAnimation(this.migrationAnalysis.bestPlan);
    this.emitState();
  }

  step() { 
    if (this.status === SIMULATION_STATUS.PAUSED) { 
      this.status = this.pauseContext || SIMULATION_STATUS.RUNNING; 
      this.tick(0.2); 
      this.status = SIMULATION_STATUS.PAUSED; 
      this.emitState(); 
    } else { 
      this.pause(); 
    } 
  }

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

  /**
   * Deterministic Guided Demo with natural staggered arrivals
   */
  runCompleteDemo() {
    this.mode = SCENARIO_MODES.GUIDED;
    this.reset();
    this.logEvent(`Guided demo started with Seed: ${this.seed}`);
    this.start();
  }

  /**
   * Generates a new process with realistic bounded characteristics (Parts A, B, C, I)
   */
  spawnRandomProcess() {
    const id = `P${this.nextProcessNumber++}`;
    const process = generateDynamicProcess({
      id,
      arrivalTime: this.simTime,
      rng: this.boundRandom
    });

    console.log(
      `[PROCESS] Generated ${process.id} CPU: ${process.cpuDemand}% Memory: ${process.memory}MB ` +
      `Type: ${process.workloadClass} Arrival: ${process.arrivalTime.toFixed(1)}s Duration: ${process.duration}s`
    );

    this.readyQueue.push(process);
    this.logEvent(
      `[${this.simTime.toFixed(1)}s] ${process.id} arrived (${process.workloadClass}, ` +
      `demand ${process.cpuDemand}%, ${process.memory}MB, ${process.securityLevel})`
    );
  }

  /**
   * Controlled Workload Spikes (Parts G, J, K, L, M)
   * Staggered, bounded, applied to at most 1 (rarely 2) eligible cores.
   * Respects global cooldown and per-core recovery cooldown.
   */
  spawnWorkloadSpike() {
    // 1. Check if overload threshold is already reached on any cores
    const overloadedCount = this.cores.filter(c => c.load >= 88).length;
    if (overloadedCount >= 1) {
      // Avoid pushing multiple cores into simultaneous overload
      return;
    }

    if (this.simTime < this.globalOverloadCooldownUntil) {
      return;
    }

    // 2. Find eligible cores that are NOT overloaded and NOT in recovery cooldown
    const eligibleCores = this.cores.filter(c => {
      const recoveryUntil = this.coreRecoveryCooldown.get(c.id) || 0;
      const notInRecovery = this.simTime >= recoveryUntil;
      const moderateLoad = c.load >= 25 && c.load < 75; // has baseline to naturally rise
      const notTargetOfMigration = this.activeMigration?.destCoreId !== c.id;
      return notInRecovery && moderateLoad && notTargetOfMigration;
    });

    if (eligibleCores.length === 0) {
      // Fallback: pick any core with load < 72 that is not in recovery
      const fallbackCores = this.cores.filter(c => {
        const recoveryUntil = this.coreRecoveryCooldown.get(c.id) || 0;
        return this.simTime >= recoveryUntil && c.load < 72;
      });
      if (fallbackCores.length === 0) return;
      eligibleCores.push(...fallbackCores);
    }

    // 3. Randomly choose at most 1 core
    const targetCore = eligibleCores[Math.floor(this.random() * eligibleCores.length)];
    const spikeDemand = Math.round(24 + this.random() * 8); // +24% to +32%
    const spikeDuration = Math.round(10 + this.random() * 6); // 10s to 16s

    const spikeProcess = createProcess({
      id: `P${this.nextProcessNumber++}`,
      name: `Spike-Job`,
      cpuDemand: spikeDemand,
      memory: Math.round(150 + this.random() * 150),
      cacheSensitivity: CACHE_SENSITIVITIES.HIGH,
      securityLevel: this.random() < 0.6 ? SECURITY_LEVELS.TRUSTED : SECURITY_LEVELS.SENSITIVE,
      duration: spikeDuration,
      arrivalTime: this.simTime,
      currentCore: targetCore.id,
      state: PROCESS_STATES.RUNNING,
      workloadClass: WORKLOAD_CLASSES.HEAVY
    });

    this.processes.push(spikeProcess);
    
    // Set global overload cooldown (5 to 8s)
    this.globalOverloadCooldownUntil = this.simTime + (5.0 + this.random() * 3.0);
    this.nextSpikeAt = this.simTime + (14.0 + this.random() * 8.0);

    console.log(
      `[SPIKE] Injected workload spike on Core ${targetCore.id} (+${spikeDemand}% CPU). ` +
      `Global cooldown active until ${this.globalOverloadCooldownUntil.toFixed(1)}s`
    );

    this.logEvent(`[${this.simTime.toFixed(1)}s] Workload surge on Core ${targetCore.id}: +${spikeDemand}% CPU (${spikeProcess.id})`);
    this.recalculateCoreLoads();
  }

  /**
   * Manual load injection triggered by user button
   */
  generateOverload(targetCoreId = null) {
    let targetId = targetCoreId;
    if (targetId === null) {
      // Pick core with highest load that isn't already overloaded
      const available = this.cores.filter(c => c.load < 88);
      targetId = available.length > 0 
        ? available.sort((a, b) => b.load - a.load)[0].id 
        : Math.floor(this.random() * this.numCores);
    }

    const spikeDemand = Math.round(28 + this.random() * 10);
    const process = createProcess({
      id: `P-SPIKE-${this.nextProcessNumber++}`,
      name: 'Manual-LoadSpike',
      cpuDemand: spikeDemand,
      memory: Math.round(180 + this.random() * 140),
      cacheSensitivity: CACHE_SENSITIVITIES.HIGH,
      securityLevel: SECURITY_LEVELS.TRUSTED,
      duration: 14,
      arrivalTime: this.simTime,
      currentCore: targetId,
      state: PROCESS_STATES.RUNNING,
      workloadClass: WORKLOAD_CLASSES.HEAVY
    });

    this.processes.push(process);
    console.log(`[SPIKE] Manual inject load: ${process.id} (+${spikeDemand}%) on Core ${targetId}`);
    this.logEvent(`Manual Inject Load: ${process.id} added to Core ${targetId} (+${spikeDemand}% CPU)`);
    
    this.recalculateCoreLoads();
    this.triggerMLPrediction(targetId, true);
    this.emitState();
  }

  /**
   * Ready Queue Dispatcher (Part D)
   * Dispatches arriving processes to CPU cores with intelligent random tie-breaking.
   */
  dispatchReadyQueue() {
    if (!this.readyQueue.length) return;
    const process = this.readyQueue.shift();
    const coreId = scheduleProcess(process, this.cores, this.processes, this.boundRandom);
    
    process.currentCore = coreId;
    process.state = PROCESS_STATES.RUNNING;
    process.startTime = this.simTime;
    this.processes.push(process);
    
    this.logEvent(`[${this.simTime.toFixed(1)}s] ${process.id} (${process.workloadClass}) scheduled on Core ${coreId}`);
  }

  tick(dt) {
    if (this.status === SIMULATION_STATUS.STOPPED || this.status === SIMULATION_STATUS.PAUSED) return;
    this.simTime = Math.round((this.simTime + dt) * 100) / 100;

    // 1. Handle Decision Window Countdown
    if (this.status === SIMULATION_STATUS.DECISION_WINDOW) {
      if (!this.decisionPaused) {
        this.decisionRemaining = Math.max(0, this.decisionRemaining - dt);
        const previousSecond = Math.ceil(this.decisionRemaining + dt);
        const currentSecond = Math.ceil(this.decisionRemaining);
        if (currentSecond < previousSecond && currentSecond > 0) {
          this.logEvent(`Decision window: migration starts in ${currentSecond}s`);
        }
        if (this.decisionRemaining <= 0 && this.migrationAnalysis?.bestPlan) {
          this.executeMigrationAnimation(this.migrationAnalysis.bestPlan);
        }
      }
      this.emitState();
      return;
    }

    // 2. Staggered Process Arrivals (Parts B, H)
    if (this.automaticWorkload || this.mode === SCENARIO_MODES.GUIDED) {
      if (this.simTime >= this.nextArrivalAt) {
        this.spawnRandomProcess();
        // Stagger next arrival by 1.5s to 3.5s
        this.nextArrivalAt = this.simTime + (1.5 + this.random() * 2.0);
      }

      // 3. Staggered, Bounded Workload Spikes (Parts G, J, K)
      if (this.simTime >= this.nextSpikeAt) {
        this.spawnWorkloadSpike();
      }
    }

    // 4. Dispatch ready processes into CPU cores
    this.dispatchReadyQueue();

    // 5. Update running processes execution progress & time countdown (Parts O, P)
    if (this.activeMigration) {
      this.updateActiveMigration(dt);
    } else {
      this.processes.forEach(process => {
        if (process.state !== PROCESS_STATES.RUNNING) return;
        
        // Count down remaining execution time
        process.remainingTime = Math.max(0, process.remainingTime - dt);

        // Zero-mean bounded runtime demand fluctuation (prevents unbounded upward drift)
        if (this.automaticWorkload && this.random() < dt * 0.4) {
          const jitter = Math.round((this.random() - 0.5) * 2.0); // -1, 0, or +1
          process.cpuDemand = clamp(
            process.cpuDemand + jitter,
            process.cpuDemandMin || 10,
            process.cpuDemandMax || 35
          );
        }

        // Process completion
        if (process.remainingTime <= 0) {
          process.state = PROCESS_STATES.COMPLETED;
          process.completionTime = this.simTime;
          console.log(`[PROCESS_COMPLETED] ${process.id} finished execution and left Core ${process.currentCore}`);
          this.logEvent(`[${this.simTime.toFixed(1)}s] ${process.id} COMPLETED on Core ${process.currentCore}`);
        }
      });

      // Record timeline for Gantt visualization
      this.timelineRecords.push(
        ...this.processes
          .filter(p => p.state === PROCESS_STATES.RUNNING && p.currentCore !== null)
          .map(p => ({ 
            time: this.simTime, 
            coreId: p.currentCore, 
            processId: p.id, 
            securityLevel: p.securityLevel 
          }))
      );
      if (this.timelineRecords.length > 600) {
        this.timelineRecords.splice(0, this.timelineRecords.length - 600);
      }
    }

    // 6. Recalculate live CPU loads strictly from active running processes (Part N)
    this.recalculateCoreLoads();

    // 7. Check for rising load & trigger ML future overload prediction
    if (!this.activeMigration && this.status === SIMULATION_STATUS.RUNNING) {
      this.checkOverloadConditions();
    }

    this.emitState();
  }

  /**
   * Recalculates core utilization strictly from active assigned processes (Part N, O)
   */
  recalculateCoreLoads() {
    this.cores.forEach(core => {
      const result = calculateCoreLoad(core.id, this.processes, this.activeMigration);
      core.load = result.load;
      core.status = result.status;
      core.processIds = this.processes
        .filter(p => p.currentCore === core.id && p.state !== PROCESS_STATES.COMPLETED)
        .map(p => p.id);
        
      core.history = [
        ...(core.history || []), 
        { time: this.simTime, load: core.load }
      ].slice(-30);
    });
  }

  /**
   * Detects rising workload and invokes Random Forest future overload prediction
   */
  checkOverloadConditions() {
    if (this.simTime < this.migrationCooldownUntil || this.predictionInFlight) return;
    
    // Find cores approaching threshold that are NOT in recovery cooldown
    const candidates = this.cores.filter(core => {
      const recoveryUntil = this.coreRecoveryCooldown.get(core.id) || 0;
      const notInRecovery = this.simTime >= recoveryUntil;
      const notPredictedRecently = (this.simTime - (this.lastPredictionAt.get(core.id) || -Infinity)) > 3.5;
      return core.load >= 76 && notInRecovery && notPredictedRecently;
    });

    if (candidates.length === 0) return;
    
    // Pick the most loaded candidate
    const core = candidates.sort((a, b) => b.load - a.load)[0];
    
    const activeProcs = this.processes.filter(p => p.currentCore === core.id && p.state === PROCESS_STATES.RUNNING);
    console.log(
      `[LOAD] Core ${core.id}: ${activeProcs.map(p => `${p.id}(${p.cpuDemand}%)`).join(' + ')} = ${core.load.toFixed(1)}% ` +
      `-> Requesting ML overload prediction`
    );

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

    const result = await api.predictOverload({ 
      coreId, 
      currentLoad: core.load, 
      prevLoad, 
      movingAvg, 
      trend, 
      processCount: running.length, 
      avgProcessLoad: running.length ? core.load / running.length : 0 
    });

    this.predictionInFlight = false;
    if (this.status === SIMULATION_STATUS.STOPPED) return;

    this.mlPrediction = { 
      ...result, 
      currentLoad: round(core.load), 
      prevLoad: round(prevLoad), 
      movingAvg: round(movingAvg), 
      trend: round(trend), 
      overloadProbability: result.overloadProbability ?? result.confidence 
    };
    
    core.predictedLoad = result.predictedLoad;
    
    console.log(
      `[ML_PREDICT] Core ${coreId}: current ${core.load}% -> predicted ${result.predictedLoad}% ` +
      `(${this.mlPrediction.overloadProbability}% probability) - ${result.overloadPredicted ? 'OVERLOAD LIKELY' : 'nominal'}`
    );

    this.logEvent(
      `ML prediction Core ${coreId}: current ${core.load}% → predicted ${result.predictedLoad}% ` +
      `(${this.mlPrediction.overloadProbability}% probability) — ${result.overloadPredicted ? 'OVERLOAD LIKELY' : 'nominal'}`
    );

    // If ML forecasts saturation, evaluate migration candidates
    if (result.overloadPredicted || result.predictedLoad >= 88) {
      console.log(`[OVERLOAD] Core ${coreId} entered overload risk (${core.load}%, predicted ${result.predictedLoad}%)`);
      this.evaluateMigrationCandidates(coreId);
    } else {
      this.explanationText = `ML forecasts Core ${coreId} at ${result.predictedLoad}%; load remains within nominal thresholds.`;
    }
    
    this.emitState();
  }

  evaluateMigrationCandidates(sourceCoreId) {
    this.status = SIMULATION_STATUS.COST_ANALYSIS;
    this.explanationText = `ML predicts future overload on Core ${sourceCoreId}. CoreGuard evaluating candidates and destination cores.`;
    
    const planData = selectBestMigrationPlan({ 
      sourceCoreId, 
      cores: this.cores, 
      processes: this.processes, 
      weights: this.weights, 
      scoreThreshold: 4 
    });

    this.migrationAnalysis = planData;

    planData.candidateEvaluations.forEach(candidate => {
      console.log(
        `[CANDIDATE] ${candidate.processId} Score: ${candidate.migrationScore > 0 ? '+' : ''}${candidate.migrationScore} ` +
        `(Benefit: +${candidate.expectedBenefit}, Cost: ${candidate.migrationCost})`
      );
      this.logEvent(`${candidate.processId} score = ${candidate.migrationScore > 0 ? '+' : ''}${candidate.migrationScore} (benefit ${candidate.expectedBenefit} - cost ${candidate.migrationCost})`);
    });

    if (!planData.bestPlan) {
      this.status = SIMULATION_STATUS.RUNNING;
      this.explanationText = planData.decision === 'NO_VALID_DESTINATION' 
        ? 'MIGRATION BLOCKED — no suitable destination core satisfies security and capacity.' 
        : 'MIGRATION NOT BENEFICIAL — no candidate exceeds the score threshold.';
      this.logEvent(this.explanationText);
      this.emitState();
      return;
    }

    const best = planData.bestPlan;
    const sourceCore = this.cores.find(core => core.id === sourceCoreId);
    const destination = this.cores.find(core => core.id === best.destCoreId);

    // Enter 5-second Decision Window (Part R)
    this.status = SIMULATION_STATUS.DECISION_WINDOW;
    this.decisionRemaining = this.decisionDelay;
    this.decisionPaused = false;
    
    this.migrationAnalysis = { 
      ...planData, 
      decisionStartedAt: this.simTime, 
      decisionRemaining: this.decisionRemaining, 
      sourceLoadBefore: sourceCore?.load ?? 0, 
      sourceLoadAfter: round((sourceCore?.load ?? 0) - best.evaluation.expectedBenefit), 
      destLoadBefore: destination?.load ?? 0, 
      destLoadAfter: round((destination?.load ?? 0) + best.process.cpuDemand) 
    };

    best.process.state = PROCESS_STATES.MIGRATION_PENDING;
    this.explanationText = `Decision window: ${best.process.id} approved for transfer from Core ${sourceCoreId} to Core ${best.destCoreId}. Starting in ${this.decisionDelay}s.`;
    
    console.log(`[DECISION] ${best.process.id} approved: Core ${sourceCoreId} -> Core ${best.destCoreId} (Score: +${best.evaluation.migrationScore})`);
    this.logEvent(`${best.process.id} selected → Core ${best.destCoreId}; decision arbitration active (${this.decisionDelay}s)`);
    this.emitState();
  }

  executeMigrationAnimation(plan) {
    if (!plan?.process || this.activeMigration) return;
    
    const source = this.cores.find(core => core.id === plan.sourceCoreId);
    const destination = this.cores.find(core => core.id === plan.destCoreId);
    const evaluation = plan.evaluation;
    
    this.status = SIMULATION_STATUS.MIGRATING;
    this.activeMigration = {
      processId: plan.process.id, 
      migratingProcess: plan.process, 
      sourceCoreId: plan.sourceCoreId, 
      destCoreId: plan.destCoreId,
      progress: 0, 
      elapsed: 0, 
      duration: Math.max(1.6, evaluation.migrationTime * 1.4),
      sourceLoadBefore: source?.load ?? 0, 
      destLoadBefore: destination?.load ?? 0,
      sourceLoadAfter: round((source?.load ?? 0) - evaluation.expectedBenefit), 
      destLoadAfter: round((destination?.load ?? 0) + plan.process.cpuDemand),
      cost: evaluation.migrationCost, 
      benefit: evaluation.expectedBenefit, 
      score: evaluation.migrationScore,
      costBreakdown: { 
        migrationTime: evaluation.migrationTime, 
        memoryPenalty: evaluation.memoryPenalty, 
        cachePenalty: evaluation.cachePenalty, 
        securityPenalty: evaluation.securityPenalty 
      }
    };

    plan.process.state = PROCESS_STATES.MIGRATING;
    console.log(`[MIGRATION] ${plan.process.id}: Core ${plan.sourceCoreId} -> Core ${plan.destCoreId} started`);
    this.logEvent(`Migration started: ${plan.process.id} Core ${plan.sourceCoreId} → Core ${plan.destCoreId}`);
    this.emitState();
  }

  updateActiveMigration(dt) {
    if (!this.activeMigration) return;
    this.activeMigration.elapsed += dt;
    this.activeMigration.progress = clamp(this.activeMigration.elapsed / this.activeMigration.duration, 0, 1);
    this.recalculateCoreLoads();
    if (this.activeMigration.progress >= 1) {
      this.completeActiveMigration();
    }
  }

  completeActiveMigration() {
    const migration = this.activeMigration;
    if (!migration) return;

    migration.migratingProcess.currentCore = migration.destCoreId;
    migration.migratingProcess.state = PROCESS_STATES.RUNNING;
    this.recalculateCoreLoads();

    const source = this.cores.find(core => core.id === migration.sourceCoreId);
    const destination = this.cores.find(core => core.id === migration.destCoreId);

    this.migrationHistory.unshift({ 
      id: this.migrationHistory.length + 1, 
      timestamp: this.simTime, 
      processId: migration.processId, 
      sourceCore: migration.sourceCoreId, 
      destCore: migration.destCoreId, 
      migrationCost: migration.cost, 
      expectedBenefit: migration.benefit, 
      migrationScore: migration.score, 
      sourceLoadBefore: migration.sourceLoadBefore, 
      sourceLoadAfter: source?.load ?? 0, 
      destLoadBefore: migration.destLoadBefore, 
      destLoadAfter: destination?.load ?? 0, 
      security: 'PASS', 
      result: 'SUCCESS', 
      reason: 'Predicted future overload relief' 
    });

    console.log(
      `[MIGRATION_COMPLETE] ${migration.processId} safely relocated to Core ${migration.destCoreId}. ` +
      `Core ${migration.sourceCoreId}: ${migration.sourceLoadBefore}% -> ${source?.load}% | ` +
      `Core ${migration.destCoreId}: ${migration.destLoadBefore}% -> ${destination?.load}%`
    );

    this.logEvent(`[${this.simTime.toFixed(1)}s] Migration completed: ${migration.processId} is now on Core ${migration.destCoreId}`);
    this.logEvent(`Live loads: Core ${migration.sourceCoreId} ${migration.sourceLoadBefore}% → ${source?.load}% | Core ${migration.destCoreId} ${migration.destLoadBefore}% → ${destination?.load}%`);
    
    api.recordMigration({ 
      runId: `run-${this.seed}`, 
      timestamp: this.simTime, 
      processId: migration.processId, 
      sourceCore: migration.sourceCoreId, 
      destCore: migration.destCoreId, 
      migrationCost: migration.cost, 
      expectedBenefit: migration.benefit, 
      migrationScore: migration.score, 
      sourceLoadBefore: migration.sourceLoadBefore, 
      sourceLoadAfter: source?.load ?? 0, 
      destLoadBefore: migration.destLoadBefore, 
      destLoadAfter: destination?.load ?? 0, 
      reason: 'Predicted future overload' 
    });

    // Per-core recovery cooldown (Part M)
    this.coreRecoveryCooldown.set(migration.sourceCoreId, this.simTime + 10.0);
    this.coreRecoveryCooldown.set(migration.destCoreId, this.simTime + 8.0);
    console.log(`[COOLDOWN] Core ${migration.sourceCoreId} & Core ${migration.destCoreId} recovery cooldown active`);

    // Global overload cooldown (Part L)
    this.globalOverloadCooldownUntil = this.simTime + 6.0;
    this.migrationCooldownUntil = this.simTime + 4.0;
    
    this.activeMigration = null;
    this.status = SIMULATION_STATUS.RUNNING;
    this.explanationText = `Migration complete. Core ${migration.sourceCoreId} load relieved; system in recovery cooldown.`;
    this.emitState();
  }
}
