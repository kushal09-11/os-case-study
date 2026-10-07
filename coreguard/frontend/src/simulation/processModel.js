export const PROCESS_STATES = {
  NEW: 'NEW',
  READY: 'READY',
  RUNNING: 'RUNNING',
  MIGRATION_PENDING: 'MIGRATION_PENDING',
  MIGRATING: 'MIGRATING',
  COMPLETED: 'COMPLETED'
};

export const SECURITY_LEVELS = {
  TRUSTED: 'TRUSTED',
  SENSITIVE: 'SENSITIVE',
  UNTRUSTED: 'UNTRUSTED'
};

export const CACHE_SENSITIVITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

export function createProcess({
  id,
  name,
  cpuDemand = 20,
  memory = 64,
  cacheSensitivity = CACHE_SENSITIVITIES.LOW,
  securityLevel = SECURITY_LEVELS.TRUSTED,
  currentCore = null,
  state = PROCESS_STATES.READY,
  arrivalTime = 0,
  duration = 20,
  remainingTime = null,
  priority = 1
}) {
  return {
    id,
    name: name || id,
    cpuDemand: Number(cpuDemand),
    memory: Number(memory),
    cacheSensitivity,
    securityLevel,
    currentCore,
    state,
    arrivalTime: Number(arrivalTime),
    duration: Number(duration),
    remainingTime: remainingTime !== null ? Number(remainingTime) : Number(duration),
    priority: Number(priority),
    startTime: null,
    completionTime: null
  };
}
