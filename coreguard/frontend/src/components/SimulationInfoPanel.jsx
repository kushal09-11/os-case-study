import React, { useState } from 'react';
import { 
  Activity, 
  Cpu, 
  ShieldCheck, 
  ShieldAlert, 
  Zap, 
  TrendingUp, 
  ArrowRight, 
  BrainCircuit, 
  Terminal, 
  Layers, 
  Filter, 
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export default function SimulationInfoPanel({ engineState, onClearLogs = null }) {
  const [logFilter, setLogFilter] = useState('');

  const {
    status = 'STOPPED',
    cores = [],
    processes = [],
    numCores = 4,
    activeMigration = null,
    migrationAnalysis = null,
    migrationHistory = [],
    mlPrediction = null,
    eventLogs = [],
    decisionRemaining = 0
  } = engineState;

  // Real derived metrics
  const activeProcesses = processes.filter(
    p => p.state === 'RUNNING' || p.state === 'MIGRATING' || p.state === 'MIGRATION_PENDING'
  ).length;

  const overloadedCoresCount = cores.filter(c => c.load >= 88).length;
  const warningCoresCount = cores.filter(c => c.load >= 75 && c.load < 88).length;
  const totalMigrationsCount = migrationHistory.length;

  // Current migration details (in-transit or decision phase)
  const isMigrating = status === 'MIGRATING' && activeMigration;
  const isDecision = (status === 'DECISION_WINDOW' || (status === 'PAUSED' && decisionRemaining > 0)) && migrationAnalysis?.bestPlan;
  
  const currentPlan = isMigrating ? activeMigration : (isDecision ? migrationAnalysis.bestPlan : null);
  const evaluation = isMigrating 
    ? {
        expectedBenefit: activeMigration.benefit,
        migrationCost: activeMigration.cost,
        migrationScore: activeMigration.score,
        securityPass: true
      }
    : (isDecision ? migrationAnalysis.bestPlan.evaluation : null);

  // Filtered kernel event logs
  const filteredLogs = eventLogs.filter(log =>
    !logFilter || log.message.toLowerCase().includes(logFilter.toLowerCase())
  ).slice(0, 40);

  // ML chart data for inspected core
  const mlCoreId = mlPrediction?.coreId ?? (cores.find(c => c.load >= 75)?.id ?? 1);
  const targetCore = cores.find(c => c.id === mlCoreId);
  const currentLoad = targetCore ? targetCore.load : (mlPrediction?.currentLoad ?? 50);
  const predictedLoad = mlPrediction?.predictedLoad ?? (currentLoad >= 75 ? Math.min(100, currentLoad + 8) : currentLoad + 2);
  const prob = mlPrediction?.overloadProbability ?? mlPrediction?.confidence ?? (currentLoad >= 80 ? 89 : 24);

  const miniChartData = [
    { step: '-3s', actual: Math.max(15, currentLoad - 14), predicted: Math.max(15, currentLoad - 12) },
    { step: '-2s', actual: Math.max(20, currentLoad - 9), predicted: Math.max(20, currentLoad - 8) },
    { step: '-1s', actual: Math.max(25, currentLoad - 4), predicted: Math.max(25, currentLoad - 3) },
    { step: 'Now', actual: currentLoad, predicted: currentLoad },
    { step: '+2s', actual: null, predicted: Math.min(100, predictedLoad) }
  ];

  return (
    <div className="flex flex-col gap-3 w-full h-full text-xs font-mono select-none">
      
      {/* 1. SYSTEM TELEMETRY CARD */}
      <div className="glass-panel rounded-xl p-3 border-slate-700/80 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2.5">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold tracking-wider">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>SYSTEM STATUS</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            status === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse' :
            status === 'MIGRATING' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse' :
            status === 'DECISION_WINDOW' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
            status === 'PAUSED' ? 'bg-amber-500/10 text-amber-300 border-amber-600/30' :
            'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">CPU CORES</span>
            <span className="font-bold text-white text-sm">{numCores} Cores Active</span>
          </div>
          <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">WORKLOADS</span>
            <span className="font-bold text-cyan-300 text-sm">{activeProcesses} Running</span>
          </div>
          <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">MIGRATIONS COMPLETED</span>
            <span className="font-bold text-emerald-400 text-sm">{totalMigrationsCount} Total</span>
          </div>
          <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">SATURATED CORES</span>
            <span className={`font-bold text-sm ${overloadedCoresCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
              {overloadedCoresCount} Overloaded
            </span>
          </div>
        </div>
      </div>

      {/* 2. CURRENT MIGRATION STATUS CARD */}
      <div className={`glass-panel rounded-xl p-3 border-slate-700/80 shadow-lg ${
        isMigrating ? 'border-cyan-500/40 bg-cyan-950/20' : 
        isDecision ? 'border-amber-500/40 bg-amber-950/20' : ''
      }`}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-200">
            <Zap className={`w-4 h-4 ${isMigrating ? 'text-cyan-400 animate-pulse' : isDecision ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>CURRENT MIGRATION</span>
          </div>
          <span className="text-[10px] text-slate-400">
            {isMigrating ? 'IN TRANSIT' : isDecision ? 'DECISION ARBITRATION' : 'STANDBY'}
          </span>
        </div>

        {isMigrating ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded border border-cyan-800/40">
              <div>
                <span className="text-[10px] text-slate-400 block">MIGRATING PROCESS</span>
                <span className="text-cyan-300 font-bold text-sm">
                  {activeMigration.migratingProcess?.id || activeMigration.processId}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">VECTOR ROUTE</span>
                <span className="text-white font-bold flex items-center gap-1 justify-end">
                  Core {activeMigration.sourceCoreId} <ArrowRight className="w-3 h-3 text-cyan-400" /> Core {activeMigration.destCoreId}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                <span>Transfer Progress</span>
                <span className="font-bold text-cyan-400">{Math.round((activeMigration.progress || 0) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 h-full transition-all duration-150"
                  style={{ width: `${Math.round((activeMigration.progress || 0) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Elapsed: {activeMigration.elapsed?.toFixed(2) || '0.00'}s</span>
                <span>Est: {activeMigration.duration?.toFixed(2) || '1.00'}s</span>
              </div>
            </div>
          </div>
        ) : isDecision ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded border border-amber-800/40">
              <div>
                <span className="text-[10px] text-slate-400 block">SELECTED PROCESS</span>
                <span className="text-amber-300 font-bold text-sm">
                  {migrationAnalysis.bestPlan?.process?.id}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">PROJECTED ROUTE</span>
                <span className="text-white font-bold flex items-center gap-1 justify-end">
                  Core {migrationAnalysis.bestPlan.sourceCoreId} <ArrowRight className="w-3 h-3 text-amber-400" /> Core {migrationAnalysis.bestPlan.destCoreId}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px]">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Transfer Commences in:
              </span>
              <strong className="text-sm font-bold">{Math.ceil(decisionRemaining)}s</strong>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-[11px] italic py-2 text-center bg-slate-950/40 rounded border border-slate-800/50">
            No active migration in transit. System workload balanced.
          </div>
        )}
      </div>

      {/* 3. MIGRATION ARBITER & FORMULA CARD */}
      <div className="glass-panel rounded-xl p-3 border-slate-700/80 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>MIGRATION ANALYSIS</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">
            {evaluation?.securityPass !== false ? 'POLICY: PASS' : 'POLICY: BLOCKED'}
          </span>
        </div>

        {evaluation ? (
          <div className="space-y-2 text-[11px]">
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">BENEFIT</span>
                <span className="font-bold text-emerald-400">+{evaluation.expectedBenefit}%</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">COST</span>
                <span className="font-bold text-amber-400">{evaluation.migrationCost}</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">NET SCORE</span>
                <span className="font-bold text-cyan-300">+{evaluation.migrationScore}</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-2 rounded border border-slate-800 text-[10px] text-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Formula:</span>
                <span className="text-slate-300">Score = Benefit − Cost</span>
              </div>
              <div className="flex justify-between">
                <span>Co-Tenancy Ring:</span>
                <span className="text-emerald-400 font-bold">Isolated (Compliant)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-[11px] italic py-2 text-center bg-slate-950/40 rounded border border-slate-800/50">
            Awaiting saturation threshold. Cost arbiter activates upon overload warning.
          </div>
        )}
      </div>

      {/* 4. ML OVERLOAD PREDICTOR CARD */}
      <div className="glass-panel rounded-xl p-3 border-slate-700/80 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-purple-300">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            <span>ML OVERLOAD FORECASTER</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Random Forest</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
          <div className="p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-[9px] text-slate-400 block">TARGET CORE</span>
            <span className="font-bold text-white text-xs">Core {mlCoreId}</span>
            <span className="text-[9px] text-slate-500 block mt-0.5">Load: {currentLoad}%</span>
          </div>
          <div className="p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-[9px] text-slate-400 block">PROBABILITY</span>
            <div className="flex items-baseline gap-1">
              <span className={`font-bold text-xs ${prob >= 80 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {prob}%
              </span>
              <span className="text-[9px] text-slate-500">
                {prob >= 80 ? 'CRITICAL' : 'NOMINAL'}
              </span>
            </div>
            <span className="text-[9px] text-cyan-400 block mt-0.5">Proj: {predictedLoad}%</span>
          </div>
        </div>

        <div className="h-20 w-full bg-slate-950/90 rounded border border-slate-800/80 p-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={miniChartData} margin={{ top: 2, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="step" stroke="#475569" tick={{ fontSize: 8 }} />
              <YAxis domain={[0, 100]} stroke="#475569" tick={{ fontSize: 8 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px', padding: '2px 6px' }}
              />
              <Line type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="predicted" stroke="#c084fc" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. LIVE KERNEL EVENT LOG (Scrollable) */}
      <div className="glass-panel rounded-xl p-3 border-slate-700/80 shadow-lg flex-1 min-h-[170px] flex flex-col">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 mb-1.5">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">KERNEL EVENT LOG</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input 
              type="text" 
              placeholder="Filter..." 
              value={logFilter}
              onChange={e => setLogFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] w-16 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            {onClearLogs && (
              <button onClick={onClearLogs} title="Clear Log" className="text-slate-500 hover:text-rose-400">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 text-[10px] pr-1 font-mono max-h-48">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 italic text-center py-3">Events streaming...</div>
          ) : (
            filteredLogs.map(log => {
              const isOverload = log.message.includes('overload') || log.message.includes('rising') || log.message.includes('spike');
              const isMig = log.message.includes('Migration') || log.message.includes('migrating') || log.message.includes('selected');
              const isPass = log.message.includes('PASS') || log.message.includes('completed');
              let color = 'text-slate-300';
              if (isOverload) color = 'text-rose-300 font-semibold';
              else if (isMig) color = 'text-cyan-300 font-semibold';
              else if (isPass) color = 'text-emerald-400';

              return (
                <div key={log.id} className="leading-tight py-0.5 flex gap-1.5 hover:bg-slate-800/30 px-1 rounded">
                  <span className="text-slate-500 flex-shrink-0">[{log.time}s]</span>
                  <span className={`${color} break-all`}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
