import { performSecurityCheck } from './migrationEngine.js';

/**
 * Intelligent Core Scheduler with Controlled Random Tie-Breaking
 * 
 * Maps arriving ready processes to CPU cores based on:
 * 1. Security policy validation (performSecurityCheck)
 * 2. Capacity headroom (core.load + process.cpuDemand <= 88%)
 * 3. Controlled random tie-breaking among equally suitable/lowest-loaded cores
 * 
 * Prevents static deterministic assignment (e.g. always P1 -> Core 0).
 */
export function scheduleProcess(process, cores, allProcesses, randomFn = Math.random) {
  // 1. Find all eligible cores that satisfy security and capacity
  const eligibleCores = cores.filter(core => {
    const sec = performSecurityCheck(process, core, allProcesses);
    return sec.pass && (core.load + process.cpuDemand <= 88);
  });

  if (eligibleCores.length > 0) {
    // Find minimum current load among eligible cores
    const minLoad = Math.min(...eligibleCores.map(c => c.load));
    
    // Cores with load within 5.0% of minLoad are considered equally suitable top choices
    const topCandidates = eligibleCores.filter(c => c.load <= minLoad + 5.0);

    // Controlled random tie-breaking among equally suitable top candidates
    const chosenIndex = Math.floor(randomFn() * topCandidates.length);
    const chosenCore = topCandidates[chosenIndex];

    console.log(
      `[ASSIGNMENT] ${process.id} (${process.cpuDemand}% CPU, ${process.securityLevel}) -> Core ${chosenCore.id} ` +
      `(Load: ${chosenCore.load.toFixed(1)}%, candidates: ${topCandidates.map(c => c.id).join(',')})`
    );

    return chosenCore.id;
  }

  // 2. If no core has <= 88% headroom, check cores with <= 94% that pass security
  const fallbackEligible = cores.filter(core => {
    const sec = performSecurityCheck(process, core, allProcesses);
    return sec.pass && (core.load + process.cpuDemand <= 94);
  });

  if (fallbackEligible.length > 0) {
    const minLoad = Math.min(...fallbackEligible.map(c => c.load));
    const topFallback = fallbackEligible.filter(c => c.load <= minLoad + 3.0);
    const chosen = topFallback[Math.floor(randomFn() * topFallback.length)];
    console.log(`[ASSIGNMENT] ${process.id} -> Core ${chosen.id} (High-load fallback)`);
    return chosen.id;
  }

  // 3. Absolute least loaded core that passes security
  const securityPassing = cores.filter(core => performSecurityCheck(process, core, allProcesses).pass);
  if (securityPassing.length > 0) {
    securityPassing.sort((a, b) => a.load - b.load);
    return securityPassing[0].id;
  }

  // 4. Default fallback: lowest loaded core
  const sortedCores = [...cores].sort((a, b) => a.load - b.load);
  return sortedCores[0]?.id ?? 0;
}
