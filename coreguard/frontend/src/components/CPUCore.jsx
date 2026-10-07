import React, { useState } from 'react';
import ProcessCard from './ProcessCard';
import { Flame, Activity, Cpu, AlertTriangle, ArrowRightLeft } from 'lucide-react';

export default function CPUCore({
  core,
  processes = [],
  activeMigration = null,
  migrationAnalysis = null,
  onCoreSelect = null
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Filter processes assigned to this core
  const runningProcesses = processes.filter(
    p => p.currentCore === core.id &&
    (p.state === 'RUNNING' || p.state === 'MIGRATION_PENDING')
  );

  const plannedSource = migrationAnalysis?.bestPlan?.sourceCoreId;
  const plannedDest = migrationAnalysis?.bestPlan?.destCoreId;
  const isSource = activeMigration?.sourceCoreId === core.id || (!activeMigration && plannedSource === core.id);
  const isDest = activeMigration?.destCoreId === core.id || (!activeMigration && plannedDest === core.id);
  const selectedProcessId = migrationAnalysis?.bestPlan?.process?.id;
  const isOverloaded = core.load >= 88;
  const isWarning = core.load >= 75 && !isOverloaded;

  // Utilization bar color
  const getBarColor = (load) => {
    if (load >= 88) return 'from-rose-600 to-red-500 shadow-rose-500/50';
    if (load >= 75) return 'from-amber-500 to-orange-500 shadow-amber-500/50';
    if (load >= 50) return 'from-cyan-500 to-blue-500 shadow-cyan-500/50';
    return 'from-emerald-500 to-teal-400 shadow-emerald-500/50';
  };

  const getStatusBadge = () => {
    if (isSource) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
          <ArrowRightLeft className="w-3 h-3" /> SOURCE OF MIGRATION
        </span>
      );
    }
    if (isDest) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 animate-pulse">
          <ArrowRightLeft className="w-3 h-3" /> TARGET ABSORBER
        </span>
      );
    }
    if (isOverloaded) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 animate-bounce">
          <Flame className="w-3 h-3 text-red-400" /> OVERLOADED 🔥
        </span>
      );
    }
    if (isWarning) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-400" /> WARNING
        </span>
      );
    }
    if (runningProcesses.length === 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
          IDLE / AVAILABLE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
        <Activity className="w-3 h-3" /> NORMAL
      </span>
    );
  };

  return (
    <div
      id={`core-box-${core.id}`}
      onClick={() => onCoreSelect && onCoreSelect(core.id)}
      className={`relative rounded-xl border p-3.5 transition-all duration-300 flex flex-col justify-between ${
        isOverloaded
          ? 'bg-red-950/20 border-red-500/60 shadow-lg shadow-red-500/20 core-overload-pulse'
          : isWarning
          ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-500/10'
          : isSource || isDest
          ? 'bg-cyan-950/30 border-cyan-400/60 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-md'
      }`}
    >
      {/* Core Header */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${
              isOverloaded ? 'bg-red-900/40 border-red-500/50 text-red-400' : 'bg-slate-800 border-slate-700 text-cyan-400'
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-sm text-white tracking-wider">
                CORE {core.id}
              </h3>
              <p className="text-[10px] text-slate-400">
                {runningProcesses.length} Active {runningProcesses.length === 1 ? 'Process' : 'Processes'}
              </p>
            </div>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Load Telemetry Bar */}
        <div className="mt-2.5">
          <div className="flex justify-between items-baseline mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">CPU Load</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowBreakdown(!showBreakdown); }}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                {showBreakdown ? 'hide' : 'breakdown'}
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              {core.predictedLoad !== null && (
                <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800">
                  ML: {core.predictedLoad}%
                </span>
              )}
              <span className={`text-base font-mono font-bold ${
                isOverloaded ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-cyan-400'
              }`}>
                {core.load.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${getBarColor(core.load)} transition-all duration-300 shadow-sm`}
              style={{ width: `${Math.min(100, Math.max(2, core.load))}%` }}
            />
          </div>

          {/* Breakdown Drawer */}
          {showBreakdown && (
            <div className="mt-2 p-2 rounded bg-slate-950/90 border border-slate-800 text-[11px] font-mono text-slate-300">
              <div className="font-semibold text-slate-400 mb-1 border-b border-slate-800 pb-0.5">
                Load Composition:
              </div>
              {runningProcesses.length === 0 ? (
                <div className="text-slate-500 italic">No assigned workload</div>
              ) : (
                runningProcesses.map(p => (
                  <div key={p.id} className="flex justify-between py-0.5">
                    <span>{p.name || p.id}</span>
                    <span className="text-cyan-400">+{p.cpuDemand}%</span>
                  </div>
                ))
              )}
              <div className="border-t border-slate-800 mt-1 pt-1 flex justify-between font-bold text-white">
                <span>Sum Load:</span>
                <span>{core.load.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Running Processes in this Core */}
      <div className="mt-3 space-y-2 min-h-[90px] flex flex-col justify-start">
        {runningProcesses.length === 0 ? (
          <div className="h-full flex items-center justify-center p-4 border border-dashed border-slate-800/80 rounded-lg text-slate-500 text-xs italic">
            Core idle (Standby)
          </div>
        ) : (
          runningProcesses.map(proc => (
            <ProcessCard
              key={proc.id}
              process={proc}
              isMigrating={activeMigration?.migratingProcess?.id === proc.id}
              isCandidate={!activeMigration && selectedProcessId === proc.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
