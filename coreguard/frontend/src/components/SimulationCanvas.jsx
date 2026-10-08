import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CPUCore from './CPUCore';
import ProcessCard from './ProcessCard';
import MigrationAnimation from './MigrationAnimation';
import { 
  Layers, 
  Cpu, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Clock, 
  Pause, 
  Play, 
  SkipForward, 
  Sparkles,
  Server
} from 'lucide-react';

export default function SimulationCanvas({
  cores = [],
  processes = [],
  readyQueue = [],
  activeMigration = null,
  migrationAnalysis = null,
  status = 'STOPPED',
  decisionRemaining = 0,
  numCores = 4,
  onPause = null,
  onResume = null,
  onSkipDecision = null
}) {
  const canvasRef = useRef(null);

  const isDecision = (status === 'DECISION_WINDOW' || (status === 'PAUSED' && decisionRemaining > 0)) && migrationAnalysis?.bestPlan;
  const decisionPlan = isDecision ? migrationAnalysis.bestPlan : null;

  // Responsive spatial grid layout depending on core count
  const getGridClass = () => {
    if (numCores === 8) {
      return 'grid-cols-2 md:grid-cols-4'; // 4x2 grid
    }
    if (numCores === 6) {
      return 'grid-cols-2 md:grid-cols-3'; // 3x2 grid
    }
    return 'grid-cols-1 md:grid-cols-2'; // 2x2 grid for 4 cores
  };

  return (
    <div 
      ref={canvasRef}
      className="relative rounded-2xl border border-blue-900/40 sim-grid-canvas shadow-2xl p-4 md:p-5 flex flex-col justify-between overflow-hidden select-none"
      style={{ minHeight: '620px' }}
    >
      {/* 1. CANVAS HEADER & LEGEND (Technical blueprint style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-900/30 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              2D MULTICORE OS TOPOLOGY & SPATIAL FABRIC
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
              Hardware Grid Model
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time visual map of kernel processes executing across synchronized CPU core domains
          </p>
        </div>

        {/* Status Legend indicators */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Warning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" /> Overload Risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Migrating
          </span>
        </div>
      </div>

      {/* 2. TOP BAY: WORKLOAD POOL / READY QUEUE (Modeled after reference image process bay) */}
      <div className="my-3 p-3 rounded-xl bg-slate-950/80 border border-blue-950/80 shadow-md relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
              PROCESS POOL &bull; READY WORKLOAD BAYS
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              {readyQueue.length} Ready in Queue
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            Non-preemptive FIFO Dispatch &bull; Dynamic Core Affinity
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 min-h-[58px]">
          <AnimatePresence>
            {readyQueue.length === 0 ? (
              <div className="w-full text-center text-slate-500 text-[11px] font-mono italic py-1.5">
                Workload pool clear &bull; All arrived processes dispatched to CPU cores
              </div>
            ) : (
              readyQueue.map((proc, idx) => (
                <motion.div
                  key={proc.id}
                  initial={{ opacity: 0, y: -10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7, y: 15 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  className="min-w-[145px] sm:min-w-[160px] flex-shrink-0"
                >
                  <ProcessCard process={proc} isCompact={true} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. SPATIAL CPU CORE MATRIX ON GRID FLOOR */}
      <div className="relative my-auto py-2 z-10 flex-1 flex flex-col justify-center">
        {/* Decorative SoC Interconnect Bus lines connecting cores in background */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <line x1="25%" y1="25%" x2="75%" y2="25%" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="25%" y1="75%" x2="75%" y2="75%" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="25%" y1="25%" x2="25%" y2="75%" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="75%" y1="25%" x2="75%" y2="75%" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 4" />
            <line x1="25%" y1="75%" x2="75%" y2="25%" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 4" />
          </svg>
        </div>

        {/* Spatial Cores Grid */}
        <div className={`grid gap-3.5 lg:gap-4.5 ${getGridClass()}`}>
          {cores.map((core) => (
            <div key={core.id} className="transition-transform duration-200">
              <CPUCore
                core={core}
                processes={processes}
                activeMigration={activeMigration}
                migrationAnalysis={isDecision ? migrationAnalysis : null}
              />
            </div>
          ))}
        </div>

        {/* Dynamic Vector Migration Path & Moving In-Transit Card */}
        <MigrationAnimation
          activeMigration={activeMigration}
          decisionPlan={decisionPlan}
          containerRef={canvasRef}
        />
      </div>

      {/* 4. MIGRATION DECISION PHASE BANNER (Prominent 5-second decision overlay) */}
      <AnimatePresence>
        {isDecision && decisionPlan && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="mt-3 relative z-30 p-3.5 rounded-xl bg-amber-950/85 border-2 border-amber-400/70 shadow-2xl shadow-amber-950/60 backdrop-blur-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-900/60 border border-amber-400/50 text-amber-300">
                  <Zap className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-amber-300">
                      MIGRATION DECISION ARBITRATION
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> SECURITY: PASS
                    </span>
                  </div>
                  <div className="text-xs text-white font-mono mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Process: <strong className="text-amber-300 font-bold text-sm">{decisionPlan.process.id}</strong></span>
                    <span className="text-slate-400">|</span>
                    <span className="text-cyan-300 font-bold flex items-center gap-1">
                      Source: Core {decisionPlan.sourceCoreId} <ArrowRight className="w-3.5 h-3.5 text-amber-400" /> Target: Core {decisionPlan.destCoreId}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-emerald-400">Benefit: +{decisionPlan.evaluation.expectedBenefit}%</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-amber-300">Cost: {decisionPlan.evaluation.migrationCost}</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-cyan-400 font-bold">Score: +{decisionPlan.evaluation.migrationScore}</span>
                  </div>
                </div>
              </div>

              {/* Countdown & Quick Action Buttons */}
              <div className="flex items-center gap-3">
                <div className="text-center font-mono">
                  <span className="text-[9px] text-amber-400 block tracking-wider uppercase">STARTING IN</span>
                  <span className="text-2xl font-black text-amber-300 animate-pulse">
                    {Math.ceil(decisionRemaining)}s
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={status === 'PAUSED' ? onResume : onPause}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {status === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {status === 'PAUSED' ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={onSkipDecision}
                    className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs font-mono flex items-center gap-1 shadow-md shadow-cyan-900/50 cursor-pointer transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Skip Delay
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. CANVAS BOTTOM FOOTER (Technical coordinates & telemetry line) */}
      <div className="pt-2.5 border-t border-blue-900/30 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 relative z-10">
        <div>
          <span>Architecture: AMD64/ARM Heterogeneous SMT</span> &bull; 
          <span className="ml-1">Topology: {numCores} Symmetric Compute Sockets</span>
        </div>
        <div className="text-cyan-400/80">
          CoreGuard Spatial Kernel Engine v1.0
        </div>
      </div>
    </div>
  );
}
