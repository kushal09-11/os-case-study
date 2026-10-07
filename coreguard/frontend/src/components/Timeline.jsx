import React from 'react';
import { Clock, Cpu } from 'lucide-react';

export default function Timeline({
  timelineRecords = [],
  numCores = 4,
  currentTime = 0,
  migrations = []
}) {
  const cores = Array.from({ length: numCores }, (_, i) => i);
  const maxTime = Math.max(25, Math.ceil(currentTime / 5) * 5 + 5);

  const securityColors = {
    TRUSTED: 'bg-emerald-500/80 border-emerald-400 text-emerald-100',
    SENSITIVE: 'bg-amber-500/80 border-amber-400 text-amber-100',
    UNTRUSTED: 'bg-rose-500/80 border-rose-400 text-rose-100'
  };

  return (
    <div className="glass-panel rounded-xl p-4 shadow-lg border-slate-700 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-sm text-white font-mono tracking-wide">
            GANTT EXECUTION & MIGRATION TIMELINE
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Simulation Horizon: 0.0s ──► {maxTime.toFixed(1)}s
        </span>
      </div>

      {/* Gantt Track View */}
      <div className="space-y-2 pt-1 font-mono text-xs">
        {/* Time Scale Axis */}
        <div className="flex items-center text-[10px] text-slate-400 pl-16 pr-2">
          {[0, 5, 10, 15, 20, 25, 30].filter(t => t <= maxTime).map(tick => (
            <div
              key={tick}
              className="relative flex-1 border-l border-slate-700 pl-1"
            >
              <span>{tick}s</span>
            </div>
          ))}
        </div>

        {/* Per-Core Gantt Rows */}
        {cores.map(coreId => {
          // Filter records for this core
          const coreRecords = timelineRecords.filter(r => r.coreId === coreId);
          // Deduplicate continuous blocks
          const blocks = [];
          for (const rec of coreRecords) {
            const last = blocks[blocks.length - 1];
            if (last && last.processId === rec.processId && Math.abs(rec.time - last.endTime) < 0.3) {
              last.endTime = rec.time;
            } else {
              blocks.push({
                processId: rec.processId,
                startTime: rec.time,
                endTime: rec.time + 0.2,
                securityLevel: rec.securityLevel
              });
            }
          }

          // Check if core was part of recent migrations
          const relevantMigrations = migrations.filter(
            m => m.source_core === coreId || m.dest_core === coreId
          );

          return (
            <div key={coreId} className="flex items-center gap-3">
              <div className="w-14 flex items-center gap-1 text-slate-300 font-bold flex-shrink-0">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>C{coreId}</span>
              </div>

              <div className="relative flex-1 bg-slate-950/80 rounded h-7 border border-slate-800 overflow-hidden flex items-center">
                {/* Active current time scrubber */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10 shadow-sm shadow-cyan-400 pointer-events-none"
                  style={{ left: `${(currentTime / maxTime) * 100}%` }}
                />

                {/* Scheduled Execution Blocks */}
                {blocks.map((b, idx) => {
                  const leftPct = (b.startTime / maxTime) * 100;
                  const widthPct = Math.max(3, ((b.endTime - b.startTime) / maxTime) * 100);
                  const colorClass = securityColors[b.securityLevel] || 'bg-cyan-600 border-cyan-400 text-white';

                  return (
                    <div
                      key={idx}
                      className={`absolute h-5 rounded px-1.5 text-[10px] font-bold border flex items-center justify-center truncate ${colorClass}`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`
                      }}
                      title={`${b.processId} (${b.securityLevel}) [${b.startTime.toFixed(1)}s - ${b.endTime.toFixed(1)}s]`}
                    >
                      {b.processId}
                    </div>
                  );
                })}

                {/* Migration Indicators */}
                {relevantMigrations.map((m, idx) => {
                  const migTime = m.timestamp || 18.0;
                  const leftPct = (migTime / maxTime) * 100;
                  const isSource = m.source_core === coreId;

                  return (
                    <div
                      key={`mig-${idx}`}
                      className={`absolute z-20 px-1 py-0.5 text-[9px] rounded font-bold border ${
                        isSource
                          ? 'bg-amber-500/90 border-amber-300 text-slate-950'
                          : 'bg-cyan-500/90 border-cyan-300 text-slate-950'
                      }`}
                      style={{ left: `${leftPct}%` }}
                      title={`Migration: ${m.process_id} from C${m.source_core} to C${m.dest_core}`}
                    >
                      {isSource ? 'MIG-OUT' : 'MIG-IN'}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
