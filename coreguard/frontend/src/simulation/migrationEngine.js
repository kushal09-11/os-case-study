export const DEFAULT_WEIGHTS = {
  alpha: 1.0,
  beta: 1.0,
  gamma: 1.0,
  delta: 1.0
};

export const CACHE_PENALTIES = { HIGH: 3.4, MEDIUM: 2.0, LOW: 0.8 };
export const SECURITY_PENALTIES = { UNTRUSTED: 3.0, SENSITIVE: 1.5, TRUSTED: 0.0 };
const round = (value, places = 1) => Math.round(value * (10 ** places)) / (10 ** places);

export function evaluateCandidate({ process, sourceCoreLoad, weights = DEFAULT_WEIGHTS }) {
  const migrationTime = round(Math.max(0.45, process.memory / 105), 2);
  const memoryPenalty = round((process.memory / 80) * 1.35, 2);
  const cachePenalty = CACHE_PENALTIES[process.cacheSensitivity] ?? 1;
  const securityPenalty = SECURITY_PENALTIES[process.securityLevel] ?? 0;
  const migrationCost = round(
    (weights.alpha ?? 1) * migrationTime +
    (weights.beta ?? 1) * memoryPenalty +
    (weights.gamma ?? 1) * cachePenalty +
    (weights.delta ?? 1) * securityPenalty
  );
  const expectedBenefit = round(Math.min(process.cpuDemand, sourceCoreLoad * 0.42));
  const migrationScore = round(expectedBenefit - migrationCost);
  return { processId: process.id, processName: process.name, cpuDemand: process.cpuDemand, memory: process.memory, cacheSensitivity: process.cacheSensitivity, securityLevel: process.securityLevel, migrationTime, memoryPenalty, cachePenalty, securityPenalty, migrationCost, expectedBenefit, migrationScore };
}

export function performSecurityCheck(process, destCore, allProcesses, options = {}) {
  const destProcs = allProcesses.filter(p => p.currentCore === destCore.id && p.state === 'RUNNING');
  if (options.blockedCoreIds?.includes(destCore.id)) return { pass: false, reason: 'Security policy explicitly blocks this destination core' };
  if (process.securityLevel === 'SENSITIVE' && destProcs.some(p => p.securityLevel === 'UNTRUSTED')) return { pass: false, reason: 'Sensitive workload cannot co-locate with an UNTRUSTED co-tenant' };
  if (process.securityLevel === 'UNTRUSTED' && destProcs.some(p => p.securityLevel === 'SENSITIVE')) return { pass: false, reason: 'Untrusted workload cannot co-locate with a SENSITIVE co-tenant' };
  const projectedLoad = destCore.load + process.cpuDemand;
  if (projectedLoad > (options.capacityLimit ?? 88)) return { pass: false, reason: `Insufficient capacity (${round(projectedLoad)}% projected)` };
  return { pass: true, reason: 'Security and capacity checks passed' };
}

export function selectBestMigrationPlan({ sourceCoreId, cores, processes, weights = DEFAULT_WEIGHTS, scoreThreshold = 5, securityOptions = {} }) {
  const sourceCore = cores.find(core => core.id === sourceCoreId);
  const destinationCores = cores.filter(core => core.id !== sourceCoreId);
  const candidates = processes.filter(process => process.currentCore === sourceCoreId && (process.state === 'RUNNING' || process.state === 'MIGRATION_PENDING'));

  const candidateEvaluations = candidates.map(process => {
    const evaluation = evaluateCandidate({ process, sourceCoreLoad: sourceCore?.load ?? 0, weights });
    const destinationAnalyses = destinationCores.map(destination => {
      const security = performSecurityCheck(process, destination, processes, securityOptions);
      const projectedLoad = round(destination.load + process.cpuDemand);
      // Destination score is based on live load/headroom and policy results only.
      // It intentionally never uses core numbering or a fixed ordering.
      const headroomBonus = Math.max(0, 80 - destination.load) * 0.08;
      const balanceBonus = Math.max(0, (sourceCore?.load ?? 0) - projectedLoad) * 0.04;
      const destinationScore = security.pass
        ? round(evaluation.migrationScore - destination.load * 0.12 - Math.max(0, projectedLoad - 78) * 0.8 + headroomBonus + balanceBonus)
        : -99;
      return { coreId: destination.id, currentLoad: round(destination.load), projectedLoad, securityPass: security.pass, securityReason: security.reason, migrationCost: evaluation.migrationCost, score: destinationScore, decision: security.pass ? 'APPROVED' : (security.reason.includes('capacity') ? 'CAPACITY_EXCEEDED' : 'BLOCKED') };
    });
    const bestDestination = destinationAnalyses.filter(destination => destination.securityPass).reduce((best, destination) => !best || destination.score > best.score ? destination : best, null);
    return { ...evaluation, destinationAnalyses, bestDestinationCore: bestDestination?.coreId ?? null, destinationScore: bestDestination?.score ?? -99, eligible: Boolean(bestDestination) && evaluation.migrationScore >= scoreThreshold };
  });

  const eligible = candidateEvaluations.filter(candidate => candidate.eligible);
  const bestEvaluation = eligible.reduce((best, candidate) => !best || candidate.migrationScore > best.migrationScore ? candidate : best, null);
  const bestPlan = bestEvaluation && sourceCore ? { process: candidates.find(process => process.id === bestEvaluation.processId), sourceCoreId, destCoreId: bestEvaluation.bestDestinationCore, evaluation: bestEvaluation, destAnalyses: bestEvaluation.destinationAnalyses } : null;
  let decision = 'NO_SUITABLE_CANDIDATE';
  if (bestPlan) decision = 'MIGRATION_APPROVED';
  else if (candidateEvaluations.length && !candidateEvaluations.some(candidate => candidate.bestDestinationCore !== null)) decision = 'NO_VALID_DESTINATION';
  else if (candidateEvaluations.length && !eligible.length) decision = 'NOT_BENEFICIAL';
  return { sourceCoreId, candidateEvaluations, bestPlan, decision, summary: bestPlan ? `${bestPlan.process.id} selected for Core ${bestPlan.destCoreId}: benefit ${bestEvaluation.expectedBenefit} - cost ${bestEvaluation.migrationCost} = score ${bestEvaluation.migrationScore}` : decision === 'NO_VALID_DESTINATION' ? 'Migration blocked: no suitable destination.' : 'Migration not beneficial under current constraints.' };
}
