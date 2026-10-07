import React from 'react';
import { Activity, BrainCircuit, CheckCircle2, Gauge, GitBranch, ShieldCheck, TrendingDown } from 'lucide-react';

export default function DashboardPage({ engineState }) {
  const { cores = [], processes = [], migrationHistory = [], mlPrediction } = engineState;
  const avgLoad = cores.length ? cores.reduce((sum, core) => sum + core.load, 0) / cores.length : 0;
  const maxLoad = cores.length ? Math.max(...cores.map(core => core.load)) : 0;
  const minLoad = cores.length ? Math.min(...cores.map(core => core.load)) : 0;
  const overloaded = cores.find(core => core.load >= 88);
  const avgCost = migrationHistory.length ? migrationHistory.reduce((sum, item) => sum + Number(item.migrationCost || 0), 0) / migrationHistory.length : 0;
  const metrics = [
    ['AVERAGE CPU', `${avgLoad.toFixed(1)}%`, 'Overall utilization', 'text-cyan-400', Gauge],
    ['CURRENT HOT CORE', overloaded ? `CORE ${overloaded.id}` : 'NONE', overloaded ? `${overloaded.load.toFixed(1)}% load` : 'No overload', overloaded ? 'text-rose-400' : 'text-emerald-400', Activity],
    ['MIGRATIONS', migrationHistory.length, 'Completed this run', 'text-purple-400', GitBranch],
    ['AVG MIGRATION COST', avgCost.toFixed(1), 'Calculated overhead', 'text-amber-400', TrendingDown]
  ];
  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl p-5 border-slate-700">
        <div className="flex flex-wrap justify-between gap-4 items-start"><div><p className="text-[11px] text-cyan-400 font-mono tracking-widest">SYSTEM MONITORING / HIGH-LEVEL VIEW</p><h1 className="text-2xl font-bold text-white mt-1">CoreGuard Dashboard</h1><p className="text-sm text-slate-400 mt-2 max-w-2xl">Predictive migration health at a glance. Open Simulation Workspace to inspect the live multicore operating-system model.</p></div><div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">STATUS: <span className="text-emerald-400">{engineState.status}</span></div></div>
      </section>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metrics.map(([label, value, caption, color, Icon]) => <div className="glass-panel rounded-xl p-4 border-slate-700" key={label}><Icon className={`w-4 h-4 ${color} mb-3`} /><div className="text-[10px] text-slate-400 font-mono">{label}</div><div className={`text-2xl font-bold font-mono ${color} mt-1`}>{value}</div><div className="text-[11px] text-slate-500 mt-1">{caption}</div></div>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-panel rounded-xl p-4 border-slate-700 lg:col-span-2"><div className="flex items-center justify-between mb-4"><h2 className="font-mono text-xs font-bold text-white flex gap-2 items-center"><BrainCircuit className="w-4 h-4 text-purple-400" /> PREDICTIVE HEALTH</h2><span className="text-[10px] text-slate-500">ML forecasts future load; engine decides migration</span></div><div className="grid grid-cols-3 gap-3 text-center"><div className="p-3 rounded-lg bg-slate-900 border border-slate-800"><div className="text-[10px] text-slate-500">LAST PREDICTED LOAD</div><div className="text-xl font-mono font-bold text-purple-300 mt-1">{mlPrediction ? `${mlPrediction.predictedLoad}%` : '—'}</div></div><div className="p-3 rounded-lg bg-slate-900 border border-slate-800"><div className="text-[10px] text-slate-500">PREDICTION CONFIDENCE</div><div className="text-xl font-mono font-bold text-purple-300 mt-1">{mlPrediction ? `${mlPrediction.overloadProbability ?? mlPrediction.confidence}%` : '—'}</div></div><div className="p-3 rounded-lg bg-slate-900 border border-slate-800"><div className="text-[10px] text-slate-500">PROCESS POPULATION</div><div className="text-xl font-mono font-bold text-cyan-300 mt-1">{processes.filter(p => p.state !== 'COMPLETED').length}</div></div></div></div>
        <div className="glass-panel rounded-xl p-4 border-slate-700"><h2 className="font-mono text-xs font-bold text-white flex gap-2 items-center mb-3"><ShieldCheck className="w-4 h-4 text-emerald-400" /> HEALTH SIGNALS</h2><div className="space-y-3 text-xs"><div className="flex justify-between"><span className="text-slate-400">Load imbalance</span><span className="text-amber-300 font-mono">{(maxLoad - minLoad).toFixed(1)}%</span></div><div className="flex justify-between"><span className="text-slate-400">Migration success</span><span className="text-emerald-300 font-mono">{migrationHistory.length ? '100%' : '—'}</span></div><div className="flex justify-between"><span className="text-slate-400">Security policy</span><span className="text-emerald-300 font-mono">ENFORCED</span></div><div className="flex items-center gap-2 text-emerald-400 pt-2 border-t border-slate-800"><CheckCircle2 className="w-4 h-4" /> Dynamic destination scoring active</div></div></div>
      </div>
    </div>
  );
}
