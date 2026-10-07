import React from 'react';
import { Calculator, CheckCircle2, XCircle, ArrowRight, Sliders, Shield } from 'lucide-react';

export default function MigrationAnalysis({
  analysisData,
  weights,
  onWeightChange
}) {
  if (!analysisData || !analysisData.candidateEvaluations || analysisData.candidateEvaluations.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-4 text-center text-slate-500 text-xs italic">
        No active migration analysis. Overload triggers or demo will display multi-attribute candidate evaluations here.
      </div>
    );
  }

  const { candidateEvaluations, bestPlan } = analysisData;
  const selectedCand = bestPlan?.evaluation || candidateEvaluations[0];

  return (
    <div className="glass-panel rounded-xl p-4 shadow-lg border-slate-700 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-sm text-white font-mono tracking-wide">
            MIGRATION CANDIDATE EVALUATION & COST ANALYSIS
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Decision:</span>
          {bestPlan ? (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED ({bestPlan.process.id} ──► Core {bestPlan.destCoreId})
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> BLOCKED (Threshold/Security)
            </span>
          )}
        </div>
      </div>

      {/* Candidates Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-2">Process</th>
              <th className="p-2">CPU</th>
              <th className="p-2">Memory</th>
              <th className="p-2">Cache</th>
              <th className="p-2">Security</th>
              <th className="p-2">Mig. Time</th>
              <th className="p-2">Cost</th>
              <th className="p-2">Benefit</th>
              <th className="p-2">Score</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {candidateEvaluations.map((cand) => {
              const isChosen = bestPlan?.process?.id === cand.processId;
              return (
                <tr
                  key={cand.processId}
                  className={`transition-colors ${
                    isChosen
                      ? 'bg-cyan-950/40 text-cyan-200 font-semibold'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className="p-2 font-bold text-white flex items-center gap-1.5">
                    {cand.processName || cand.processId}
                    {isChosen && <span className="text-[10px] bg-cyan-500/30 text-cyan-300 px-1 rounded">Selected</span>}
                  </td>
                  <td className="p-2 text-cyan-400">{cand.cpuDemand}%</td>
                  <td className="p-2">{cand.memory} MB</td>
                  <td className="p-2">
                    <span className={`px-1 rounded text-[10px] ${
                      cand.cacheSensitivity === 'HIGH' ? 'text-amber-400 bg-amber-950/60' : 'text-slate-400'
                    }`}>
                      {cand.cacheSensitivity}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={`px-1 rounded text-[10px] ${
                      cand.securityLevel === 'SENSITIVE' ? 'text-amber-400' :
                      cand.securityLevel === 'UNTRUSTED' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {cand.securityLevel}
                    </span>
                  </td>
                  <td className="p-2">{cand.migrationTime}s</td>
                  <td className="p-2 text-amber-400">{cand.migrationCost}</td>
                  <td className="p-2 text-emerald-400">+{cand.expectedBenefit}</td>
                  <td className="p-2 font-bold text-white">
                    {cand.migrationScore > 0 ? `+${cand.migrationScore}` : cand.migrationScore}
                  </td>
                  <td className="p-2">
                    {cand.eligible ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Eligible
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1 text-[11px]">
                        <XCircle className="w-3 h-3" /> {cand.migrationScore < 4 ? 'Low Score' : 'Incompatible'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explainable Formula Card for the Selected Candidate */}
      {selectedCand && (
        <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
            <span className="font-bold text-slate-300">
              Active Cost Breakdown for {selectedCand.processName || selectedCand.processId}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Cost = α·Tmig + β·Pmem + γ·Pcache + δ·Psec
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">α × Migration Time</span>
              <span className="text-cyan-400 font-bold">{weights?.alpha ?? 1.0} × {selectedCand.migrationTime}</span>
              <span className="text-slate-400 block text-[10px] mt-0.5">
                = {((weights?.alpha ?? 1.0) * selectedCand.migrationTime).toFixed(2)}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">β × Memory Penalty</span>
              <span className="text-indigo-400 font-bold">{weights?.beta ?? 1.0} × {selectedCand.memoryPenalty}</span>
              <span className="text-slate-400 block text-[10px] mt-0.5">
                = {((weights?.beta ?? 1.0) * selectedCand.memoryPenalty).toFixed(2)}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">γ × Cache Penalty</span>
              <span className="text-amber-400 font-bold">{weights?.gamma ?? 1.0} × {selectedCand.cachePenalty}</span>
              <span className="text-slate-400 block text-[10px] mt-0.5">
                = {((weights?.gamma ?? 1.0) * selectedCand.cachePenalty).toFixed(2)}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">δ × Security Penalty</span>
              <span className="text-emerald-400 font-bold">{weights?.delta ?? 1.0} × {selectedCand.securityPenalty}</span>
              <span className="text-slate-400 block text-[10px] mt-0.5">
                = {((weights?.delta ?? 1.0) * selectedCand.securityPenalty).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="font-mono text-slate-300">
              Total Cost: <strong className="text-amber-400">{selectedCand.migrationCost}</strong> | Expected Benefit: <strong className="text-emerald-400">+{selectedCand.expectedBenefit}</strong>
            </div>
            <div className="font-mono font-bold text-white bg-slate-950 px-3 py-1 rounded border border-slate-800">
              Migration Score: <span className="text-cyan-400 text-sm">+{selectedCand.migrationScore}</span>
            </div>
          </div>
        </div>
      )}

      {/* Destination Core Analysis */}
      {selectedCand?.destinationAnalyses && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" /> DESTINATION CORE ADMISSIBILITY
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {selectedCand.destinationAnalyses.map(d => (
              <div
                key={d.coreId}
                className={`p-2.5 rounded-lg border text-xs font-mono ${
                  d.decision === 'APPROVED'
                    ? 'bg-slate-900 border-emerald-500/40 text-slate-200'
                    : 'bg-slate-900/60 border-rose-500/30 text-slate-400'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-white">CORE {d.coreId}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    d.decision === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {d.decision}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <div>Current Load: {d.currentLoad}% ──► Projected: {d.projectedLoad}%</div>
                  <div>Security: {d.securityPass ? '✓ Compatible' : '✗ Blocked'}</div>
                  <div className="text-[10px] text-slate-500 truncate" title={d.securityReason}>{d.securityReason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configurable Formula Weights */}
      {onWeightChange && (
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Configurable Cost Weights (Sensitivity Tuning)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['alpha', 'beta', 'gamma', 'delta'].map((key) => {
              const labels = {
                alpha: 'α (Time)',
                beta: 'β (Memory)',
                gamma: 'γ (Cache)',
                delta: 'δ (Security)'
              };
              return (
                <div key={key}>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{labels[key]}</span>
                    <span className="font-mono text-cyan-400">{weights?.[key] ?? 1.0}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={weights?.[key] ?? 1.0}
                    onChange={(e) => onWeightChange({ [key]: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
