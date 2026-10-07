import React from 'react';
import { History, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function HistoryPage({ engineState }) {
  const records = engineState.migrationHistory || [];
  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-xl p-4 border-slate-700">
        <h2 className="text-base font-bold text-white font-mono flex items-center gap-2"><History className="w-5 h-5 text-cyan-400" /> MIGRATION HISTORY</h2>
        <p className="text-xs text-slate-400 mt-1">Completed migrations from this simulation run, including the calculation that justified each decision.</p>
      </div>
      <div className="glass-panel rounded-xl p-4 border-slate-700 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="text-slate-400 border-b border-slate-800"><tr>{['#', 'Time', 'Process', 'Route', 'Cost', 'Benefit', 'Score', 'Result'].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-800/70">
            {!records.length ? <tr><td colSpan="8" className="p-8 text-center text-slate-500">No completed migrations in this run.</td></tr> : records.map(record => (
              <tr key={`${record.id}-${record.timestamp}`} className="text-slate-300">
                <td className="p-2 text-slate-500">#{record.id}</td><td className="p-2">{Number(record.timestamp).toFixed(2)}s</td><td className="p-2 font-bold text-white">{record.processId}</td>
                <td className="p-2 text-cyan-300">C{record.sourceCore} <ArrowRight className="inline w-3 h-3" /> C{record.destCore}</td><td className="p-2 text-amber-400">{record.migrationCost}</td><td className="p-2 text-emerald-400">+{record.expectedBenefit}</td><td className="p-2 text-cyan-300">{record.migrationScore > 0 ? '+' : ''}{record.migrationScore}</td>
                <td className="p-2 text-emerald-400"><CheckCircle2 className="inline w-3 h-3 mr-1" />{record.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
