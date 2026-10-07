import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Cpu, HardDrive, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ProcessCard({ process, isCompact = false, isMigrating = false, isCandidate = false }) {
  if (!process) return null;

  const securityColors = {
    TRUSTED: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
    SENSITIVE: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
    UNTRUSTED: 'bg-rose-950/70 border-rose-500/40 text-rose-300'
  };

  const securityBadges = {
    TRUSTED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    SENSITIVE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    UNTRUSTED: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  };

  const progressPercent = process.duration > 0
    ? Math.max(0, Math.min(100, Math.round(((process.duration - process.remainingTime) / process.duration) * 100)))
    : 100;

  return (
    <motion.div
      layoutId={`proc-${process.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`rounded-lg border transition-all text-xs select-none shadow-md ${
        isMigrating
          ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-cyan-500/30 ring-2 ring-cyan-400/50'
          : isCandidate
          ? 'bg-amber-950/90 border-amber-300 text-amber-100 shadow-amber-500/40 ring-2 ring-amber-400 animate-pulse'
          : securityColors[process.securityLevel] || 'bg-slate-900 border-slate-700 text-slate-200'
      } ${isCompact ? 'p-1.5' : 'p-2.5'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold font-mono tracking-wide text-white text-sm flex items-center gap-1">
          {process.name || process.id}
          {process.state === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />}
        </span>
        <span className={`px-1.5 py-0.5 text-[10px] uppercase font-semibold rounded border ${securityBadges[process.securityLevel]}`}>
          {process.securityLevel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-300 mt-1">
        <div className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>CPU: <strong>{process.cpuDemand}%</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-indigo-400" />
          <span>Mem: <strong>{process.memory}MB</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Cache: <strong>{process.cacheSensitivity}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-[10px] text-slate-400 truncate">{process.state}</span>
        </div>
      </div>

      {process.duration > 0 && process.state === 'RUNNING' && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
            <span>Remaining</span>
            <span className="font-mono">{process.remainingTime.toFixed(1)}s</span>
          </div>
          <div className="w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
