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

export const WORKLOAD_CLASSES = {
  LIGHT: 'LIGHT',
  MEDIUM: 'MEDIUM',
  HEAVY: 'HEAVY'
};

const TEMPLATE_NAMES = {
  LIGHT: ['Light-Worker', 'Light-API', 'Light-Auth', 'Light-Telemetry', 'Light-CacheProxy', 'Light-EventStream'],
  MEDIUM: ['Med-Database', 'Med-SearchIndex', 'Med-AnalyticsNode', 'Med-StreamParser', 'Med-RenderPipe'],
  HEAVY: ['Heavy-MLInfer', 'Heavy-CryptoSigner', 'Heavy-BatchCompiler', 'Heavy-PaymentVault', 'Heavy-EncodeEngine']
};

export function createProcess({
  id,
  name,
  cpuDemand = 20,
  memory = 128,
  cacheSensitivity = CACHE_SENSITIVITIES.LOW,
  securityLevel = SECURITY_LEVELS.TRUSTED,
  currentCore = null,
  state = PROCESS_STATES.READY,
  arrivalTime = 0,
  duration = 12,
  remainingTime = null,
  priority = 1,
  workloadClass = WORKLOAD_CLASSES.MEDIUM,
  cpuDemandMin = null,
  cpuDemandMax = null
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
    workloadClass,
    cpuDemandMin: cpuDemandMin ?? Math.max(8, Number(cpuDemand) - 4),
    cpuDemandMax: cpuDemandMax ?? Math.min(45, Number(cpuDemand) + 4),
    startTime: null,
    completionTime: null
  };
}

/**
 * Dynamic Process Generator (Parts A, B, C, I)
 * Generates bounded, realistic process objects with varied workload classes:
 * - 60% Light (10–20% CPU, 100–220 MB, 6–14s)
 * - 30% Medium (18–28% CPU, 180–360 MB, 8–18s)
 * - 10% Heavy (25–35% CPU, 250–500 MB, 10–20s)
 */
export function generateDynamicProcess({ id, arrivalTime = 0, rng = Math.random }) {
  const roll = rng();
  let workloadClass, cpuDemandMin, cpuDemandMax, memoryMin, memoryMax, durationMin, durationMax, priorityMin, priorityMax;
  let cacheRoll = rng();
  let secRoll = rng();

  if (roll < 0.60) {
    // 60% LIGHT PROCESS
    workloadClass = WORKLOAD_CLASSES.LIGHT;
    cpuDemandMin = 10;
    cpuDemandMax = 20;
    memoryMin = 100;
    memoryMax = 220;
    durationMin = 6;
    durationMax = 14;
    priorityMin = 1;
    priorityMax = 4;
  } else if (roll < 0.90) {
    // 30% MEDIUM PROCESS
    workloadClass = WORKLOAD_CLASSES.MEDIUM;
    cpuDemandMin = 18;
    cpuDemandMax = 28;
    memoryMin = 180;
    memoryMax = 360;
    durationMin = 8;
    durationMax = 18;
    priorityMin = 3;
    priorityMax = 7;
  } else {
    // 10% HEAVY PROCESS
    workloadClass = WORKLOAD_CLASSES.HEAVY;
    cpuDemandMin = 25;
    cpuDemandMax = 35;
    memoryMin = 250;
    memoryMax = 500;
    durationMin = 10;
    durationMax = 20;
    priorityMin = 6;
    priorityMax = 10;
  }

  // Derive bounded values
  const cpuDemand = Math.round(cpuDemandMin + rng() * (cpuDemandMax - cpuDemandMin));
  const memory = Math.round(memoryMin + rng() * (memoryMax - memoryMin));
  const duration = Math.round(durationMin + rng() * (durationMax - durationMin));
  const priority = Math.round(priorityMin + rng() * (priorityMax - priorityMin));

  // Cache sensitivity
  let cacheSensitivity;
  if (cacheRoll < 0.50) cacheSensitivity = CACHE_SENSITIVITIES.LOW;
  else if (cacheRoll < 0.80) cacheSensitivity = CACHE_SENSITIVITIES.MEDIUM;
  else cacheSensitivity = CACHE_SENSITIVITIES.HIGH;

  // Security classification
  let securityLevel;
  if (secRoll < 0.65) securityLevel = SECURITY_LEVELS.TRUSTED;
  else if (secRoll < 0.85) securityLevel = SECURITY_LEVELS.SENSITIVE;
  else securityLevel = SECURITY_LEVELS.UNTRUSTED;

  // Random template name for class
  const names = TEMPLATE_NAMES[workloadClass];
  const name = names[Math.floor(rng() * names.length)];

  return createProcess({
    id,
    name: `${id}-${name}`,
    cpuDemand,
    memory,
    cacheSensitivity,
    securityLevel,
    arrivalTime: Math.round(arrivalTime * 10) / 10,
    duration,
    priority,
    workloadClass,
    cpuDemandMin,
    cpuDemandMax
  });
}
