import React, { useState } from 'react';
import { Terminal, Trash2, Filter } from 'lucide-react';

export default function EventLog({ logs = [], onClear = null }) {
  const [filterText, setFilterText] = useState('');

  const filteredLogs = logs.filter(log =>
    !filterText || log.message.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="glass-panel rounded-xl p-3 shadow-lg border-slate-700 flex flex-col h-72">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-xs text-white font-mono tracking-wider">
            KERNEL SIMULATION TELEMETRY LOG
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {logs.length} Events
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter events..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 w-28 focus:outline-none focus:border-cyan-400"
            />
          </div>
          {onClear && (
            <button
              onClick={onClear}
              title="Clear Event Log"
              className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] pr-1">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 italic text-center py-8">
            No events recorded yet. Simulation actions will stream in real time.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isOverload = log.message.includes('OVERLOAD') || log.message.includes('spike');
            const isMig = log.message.includes('Migration') || log.message.includes('MIGRATING') || log.message.includes('MIGRATION');
            const isSec = log.message.includes('Security');
            const isML = log.message.includes('ML');

            let textColor = 'text-slate-300';
            if (isOverload) textColor = 'text-rose-400 font-semibold';
            else if (isMig) textColor = 'text-cyan-300 font-semibold';
            else if (isSec) textColor = 'text-emerald-400';
            else if (isML) textColor = 'text-purple-300';

            return (
              <div key={log.id} className="leading-tight py-0.5 flex gap-2 hover:bg-slate-800/40 px-1 rounded">
                <span className="text-slate-500 select-none flex-shrink-0">[{log.time}s]</span>
                <span className={textColor}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
