export const CORE_STATUS = {
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  OVERLOADED: 'OVERLOADED',
  MIGRATING: 'MIGRATING',
  AVAILABLE: 'AVAILABLE'
};

export function createCore(id) {
  return {
    id,
    load: 0,
    status: CORE_STATUS.AVAILABLE,
    processIds: [],
    predictedLoad: null,
    history: []
  };
}

export function calculateCoreLoad(coreId, processes, activeMigration = null) {
  const runningProcs = processes.filter(
    p => p.currentCore === coreId &&
    (p.state === 'RUNNING' || p.state === 'MIGRATION_PENDING')
  );

  let rawLoad = runningProcs.reduce((acc, p) => acc + p.cpuDemand, 0);

  // The migrating process stays attached to its source until completion. Its
  // visible load is interpolated between source and destination, so the UI and
  // the model describe the same physical transfer.
  if (activeMigration?.migratingProcess) {
    const process = activeMigration.migratingProcess;
    const progress = activeMigration.progress || 0;
    if (activeMigration.sourceCoreId === coreId) {
      rawLoad = Math.max(0, rawLoad + process.cpuDemand * (1 - progress));
    } else if (activeMigration.destCoreId === coreId) {
      rawLoad = Math.min(100, rawLoad + process.cpuDemand * progress);
    }
  }

  const load = Math.min(100, Math.max(0, Math.round(rawLoad * 10) / 10));

  let status = CORE_STATUS.NORMAL;
  if (activeMigration && (activeMigration.sourceCoreId === coreId || activeMigration.destCoreId === coreId)) {
    status = CORE_STATUS.MIGRATING;
  } else if (load >= 88) {
    status = CORE_STATUS.OVERLOADED;
  } else if (load >= 75) {
    status = CORE_STATUS.WARNING;
  } else if (runningProcs.length === 0) {
    status = CORE_STATUS.AVAILABLE;
  }

  return { load, status, runningCount: runningProcs.length };
}
