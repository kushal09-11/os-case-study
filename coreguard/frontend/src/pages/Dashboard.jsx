import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Cpu, Database, Shield, Zap, GitCommit } from 'lucide-react';
import { api } from '../services/api';

export default function DashboardPage({ engineState }) {
  const [dbMigrations, setDbMigrations] = useState([]);

  useEffect(() => {
    async function fetchDbData() {
      const res = await api.getMigrations();
      if (res?.migrations) setDbMigrations(res.migrations);
    }
    fetchDbData();
  }, [engineState.simTime]);

  const activeProcsCount = engineState.processes.filter(p => p.state === 'RUNNING').length;
  const avgLoad = engineState.cores.length > 0
    ? (engineState.cores.reduce((acc, c) => acc + c.load, 0) / engineState.cores.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel rounded-xl p-3 border-slate-700">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <Cpu className="w-4 h-4" />
            <span className="text-[11px] font-mono font-bold">AVG CPU LOAD</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">{avgLoad}%</div>
          <span className="text-[10px] text-slate-400">Across {engineState.numCores} active cores</span>
        </div>

        <div className="glass-panel rounded-xl p-3 border-slate-700">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-[11px] font-mono font-bold">ACTIVE WORKLOADS</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">{activeProcsCount}</div>
          <span className="text-[10px] text-slate-400">Total processes executing</span>
        </div>

        <div className="glass-panel rounded-xl p-3 border-slate-700">
          <div className="flex items-center gap-2 text-purple-400 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-[11px] font-mono font-bold">SECURITY ENFORCED</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">100%</div>
          <span className="text-[10px] text-slate-400">Cross-tenant isolation</span>
        </div>

        <div className="glass-panel rounded-xl p-3 border-slate-700">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Database className="w-4 h-4" />
            <span className="text-[11px] font-mono font-bold">SQLITE MIGRATIONS</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">{dbMigrations.length}</div>
          <span className="text-[10px] text-slate-400">Recorded persistent events</span>
        </div>
      </div>

      {/* Database Migrations Table */}
      <div className="glass-panel rounded-xl p-4 border-slate-700">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            SQLITE PERSISTENT AUDIT LOG (`coreguard.db`)
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            Structured Telemetry Storage
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Timestamp</th>
                <th className="p-2">Process</th>
                <th className="p-2">Route</th>
                <th className="p-2">Cost</th>
                <th className="p-2">Benefit</th>
                <th className="p-2">Score</th>
                <th className="p-2">Source Delta</th>
                <th className="p-2">Target Delta</th>
                <th className="p-2">Policy Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {dbMigrations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-slate-500 italic">
                    No migration events committed to SQLite yet. Trigger a demo or load spike to observe persistence.
                  </td>
                </tr>
              ) : (
                dbMigrations.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/40">
                    <td className="p-2 text-slate-500">#{m.id}</td>
                    <td className="p-2 text-slate-400">{m.timestamp?.toFixed?.(1) ?? m.timestamp}s</td>
                    <td className="p-2 font-bold text-white">{m.process_id}</td>
                    <td className="p-2 text-cyan-400">C{m.source_core} ──► C{m.dest_core}</td>
                    <td className="p-2 text-amber-400">{m.migration_cost}</td>
                    <td className="p-2 text-emerald-400">+{m.expected_benefit}</td>
                    <td className="p-2 font-bold text-cyan-300">+{m.migration_score}</td>
                    <td className="p-2 text-slate-400">{m.source_load_before}% ──► {m.source_load_after}%</td>
                    <td className="p-2 text-slate-400">{m.dest_load_before}% ──► {m.dest_load_after}%</td>
                    <td className="p-2 text-slate-400 truncate max-w-xs">{m.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Educational OS System Architecture Note */}
      <div className="glass-panel rounded-xl p-4 border-slate-700 bg-slate-900/60 text-xs space-y-2">
        <h4 className="font-bold text-slate-200 font-mono flex items-center gap-1.5">
          <GitCommit className="w-4 h-4 text-cyan-400" />
          EDUCATIONAL OPERATING SYSTEMS ARCHITECTURE CONTEXT
        </h4>
        <p className="text-slate-300 leading-relaxed">
          The project simulates multicore process/workload scheduling and migration at the application level.
          CPU utilization, migration cost, cache penalty, and memory penalty are modeled and estimated for educational
          demonstration. The project does not replace the operating system kernel scheduler.
        </p>
      </div>
    </div>
  );
}
