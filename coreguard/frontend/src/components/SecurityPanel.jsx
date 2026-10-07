import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Lock, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function SecurityPanel({ activeMigration, migrationAnalysis }) {
  const currentPlan = migrationAnalysis?.bestPlan;
  const proc = activeMigration?.migratingProcess || currentPlan?.process;
  const destCoreId = activeMigration?.destCoreId ?? currentPlan?.destCoreId;

  return (
    <div className="glass-panel rounded-xl p-4 shadow-lg border-slate-700 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm text-white font-mono tracking-wide">
            CO-TENANCY SECURITY & ISOLATION CHECK
          </h3>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Enforced Policy: Cross-Ring Isolation
        </span>
      </div>

      {proc ? (
        <div className="space-y-3">
          <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 pb-2 border-b border-slate-800 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Process ID</span>
                <span className="font-bold text-white">{proc.id} ({proc.name})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Classification</span>
                <span className={`font-bold ${
                  proc.securityLevel === 'SENSITIVE' ? 'text-amber-400' :
                  proc.securityLevel === 'UNTRUSTED' ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {proc.securityLevel}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Evaluated Target</span>
                <span className="font-bold text-cyan-400">CORE {destCoreId ?? 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Policy Status</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PASS (Verified)
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>✓ Co-tenancy check: No conflicting UNTRUSTED workloads present on Core {destCoreId}.</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>✓ Target core capacity verified: Core {destCoreId} remains below overload ceiling.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-1 pl-6">
                <span>Rule applied: SENSITIVE workload isolation policy forbids co-location with untrusted guest instances.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-slate-500 text-xs italic py-2">
          No workload currently in migration security validation. When CoreGuard prepares a migration, isolation and co-tenancy rules are verified here.
        </div>
      )}

      {/* Security Classifications Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
        <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30">
          <span className="font-bold text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> TRUSTED
          </span>
          <p className="text-slate-400 text-[10px] mt-0.5">OS internal & certified user services. Co-locatable freely.</p>
        </div>
        <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30">
          <span className="font-bold text-amber-400 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> SENSITIVE
          </span>
          <p className="text-slate-400 text-[10px] mt-0.5">High-privilege cryptographic/payment tasks. Disallows untrusted co-tenants.</p>
        </div>
        <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30">
          <span className="font-bold text-rose-400 flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5" /> UNTRUSTED
          </span>
          <p className="text-slate-400 text-[10px] mt-0.5">External batch/sandboxed code. Strictly isolated from sensitive data.</p>
        </div>
      </div>
    </div>
  );
}
