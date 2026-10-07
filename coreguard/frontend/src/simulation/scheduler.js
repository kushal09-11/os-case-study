import { performSecurityCheck } from './migrationEngine.js';

export function scheduleProcess(process, cores, allProcesses) {
  // Find available core with least load that satisfies security check
  const sortedCores = [...cores].sort((a, b) => a.load - b.load);

  for (const core of sortedCores) {
    const sec = performSecurityCheck(process, core, allProcesses);
    if (sec.pass && (core.load + process.cpuDemand <= 90)) {
      return core.id;
    }
  }

  // If strict check fails, return core with least load
  return sortedCores[0]?.id ?? 0;
}
