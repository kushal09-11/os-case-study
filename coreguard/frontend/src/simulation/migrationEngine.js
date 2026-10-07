export const DEFAULT_WEIGHTS = {
  alpha: 1.0, // Migration Time
  beta: 1.0,  // Memory Penalty
  gamma: 1.0, // Cache Penalty
  delta: 1.0  // Security Penalty
};

export const CACHE_PENALTIES = {
  HIGH: 3.4,
  MEDIUM: 2.0,
  LOW: 0.8
};

export const SECURITY_PENALTIES = {
  UNTRUSTED: 3.0,
  SENSITIVE: 1.5,
  TRUSTED: 0.0
};

export function evaluateCandidate({
  process,
  sourceCoreLoad,
  weights = DEFAULT_WEIGHTS
}) {
  const alpha = weights.alpha ?? 1.0;
  const beta = weights.beta ?? 1.0;
  const gamma = weights.gamma ?? 1.0;
  const delta = weights.delta ?? 1.0;

  // Migration time: e.g. 80MB -> 0.72s
  const migrationTime = Math.round((process.memory / 100.0) * 0.9 * 100) / 100;
  // Memory penalty
  const memoryPenalty = Math.round((process.memory / 80.0) * 1.4 * 100) / 100;
  // Cache penalty
  const cachePenalty = CACHE_PENALTIES[process.cacheSensitivity] || 1.0;
  // Security penalty
  const securityPenalty = SECURITY_PENALTIES[process.securityLevel] || 0.0;

  // Total Migration Cost
  const migrationCost = Math.round(
    (alpha * migrationTime +
     beta * memoryPenalty +
     gamma * cachePenalty +
     delta * securityPenalty) * 10
  ) / 10;

  // Expected Benefit: reduction in source core load
  const expectedBenefit = Math.round(process.cpuDemand * 10) / 10;

  // Migration Score
  const migrationScore = Math.round((expectedBenefit - migrationCost) * 10) / 10;

  return {
    processId: process.id,
    processName: process.name,
    cpuDemand: process.cpuDemand,
    memory: process.memory,
    cacheSensitivity: process.cacheSensitivity,
    securityLevel: process.securityLevel,
    migrationTime,
    memoryPenalty,
    cachePenalty,
    securityPenalty,
    migrationCost,
    expectedBenefit,
    migrationScore
  };
}

export function performSecurityCheck(process, destCore, allProcesses) {
  const destProcs = allProcesses.filter(
    p => p.currentCore === destCore.id && p.state === 'RUNNING'
  );

  // Policy 1: SENSITIVE process cannot co-locate with UNTRUSTED process
  if (process.securityLevel === 'SENSITIVE') {
    const hasUntrusted = destProcs.some(p => p.securityLevel === 'UNTRUSTED');
    if (hasUntrusted) {
      return {
        pass: false,
        reason: 'Violation: Sensitive workload cannot co-locate with UNTRUSTED co-tenant'
      };
    }
  }

  // Policy 2: UNTRUSTED process cannot co-locate with SENSITIVE process
  if (process.securityLevel === 'UNTRUSTED') {
    const hasSensitive = destProcs.some(p => p.securityLevel === 'SENSITIVE');
    if (hasSensitive) {
      return {
        pass: false,
        reason: 'Violation: Untrusted workload cannot co-locate with SENSITIVE co-tenant'
      };
    }
  }

  // Policy 3: Check capacity
  const projectedLoad = destCore.load + process.cpuDemand;
  if (projectedLoad > 88) {
    return {
      pass: false,
      reason: `Capacity Exceeded: Projected load (${projectedLoad.toFixed(1)}%) exceeds 88% ceiling`
    };
  }

  return {
    pass: true,
    reason: 'Security Compatible & Capacity Available'
  };
}

export function selectBestMigrationPlan({
  sourceCoreId,
  cores,
  processes,
  weights = DEFAULT_WEIGHTS,
  scoreThreshold = 5.0
}) {
  const candidateProcs = processes.filter(
    p => p.currentCore === sourceCoreId && (p.state === 'RUNNING' || p.state === 'MIGRATION_PENDING')
  );

  const sourceCore = cores.find(c => c.id === sourceCoreId);
  const destCores = cores.filter(c => c.id !== sourceCoreId);

  const candidateEvaluations = [];
  let bestPlan = null;
  let highestScore = -999;

  for (const proc of candidateProcs) {
    const evalData = evaluateCandidate({
      process: proc,
      sourceCoreLoad: sourceCore ? sourceCore.load : 85,
      weights
    });

    const destAnalyses = [];
    let bestDestForProc = null;
    let maxDestScore = -999;

    for (const dCore of destCores) {
      const secCheck = performSecurityCheck(proc, dCore, processes);
      const projectedLoad = Math.round((dCore.load + proc.cpuDemand) * 10) / 10;
      const destScore = secCheck.pass
        ? Math.round((evalData.migrationScore - (dCore.load * 0.15)) * 10) / 10
        : -99;

      const analysis = {
        coreId: dCore.id,
        currentLoad: dCore.load,
        projectedLoad,
        securityPass: secCheck.pass,
        securityReason: secCheck.reason,
        migrationCost: evalData.migrationCost,
        score: destScore,
        decision: secCheck.pass ? 'APPROVED' : 'BLOCKED'
      };
      destAnalyses.push(analysis);

      if (secCheck.pass && destScore > maxDestScore) {
        maxDestScore = destScore;
        bestDestForProc = dCore.id;
      }
    }

    const eligible = bestDestForProc !== null && evalData.migrationScore >= scoreThreshold;
    const fullCand = {
      ...evalData,
      destinationAnalyses: destAnalyses,
      bestDestinationCore: bestDestForProc,
      eligible
    };
    candidateEvaluations.push(fullCand);

    if (eligible && evalData.migrationScore > highestScore) {
      highestScore = evalData.migrationScore;
      bestPlan = {
        process: proc,
        sourceCoreId,
        destCoreId: bestDestForProc,
        evaluation: fullCand,
        destAnalyses
      };
    }
  }

  return {
    candidateEvaluations,
    bestPlan
  };
}
