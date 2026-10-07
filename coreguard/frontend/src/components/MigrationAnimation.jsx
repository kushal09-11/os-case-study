import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import ProcessCard from './ProcessCard';
import { ArrowRight, ShieldCheck, Zap, Cpu, Sparkles } from 'lucide-react';

export default function MigrationAnimation({
  activeMigration,
  containerRef
}) {
  const [sourcePos, setSourcePos] = useState({ x: 0, y: 0 });
  const [destPos, setDestPos] = useState({ x: 0, y: 0 });
  const [isCalculated, setIsCalculated] = useState(false);

  useEffect(() => {
    if (!activeMigration || !containerRef.current) return;

    const updateCoordinates = () => {
      const containerRect = containerRef.current.getBoundingClientRect();
      const sourceEl = document.getElementById(`core-box-${activeMigration.sourceCoreId}`);
      const destEl = document.getElementById(`core-box-${activeMigration.destCoreId}`);

      if (sourceEl && destEl) {
        const sRect = sourceEl.getBoundingClientRect();
        const dRect = destEl.getBoundingClientRect();

        setSourcePos({
          x: sRect.left + sRect.width / 2 - containerRect.left,
          y: sRect.top + sRect.height / 2 - containerRect.top
        });
        setDestPos({
          x: dRect.left + dRect.width / 2 - containerRect.left,
          y: dRect.top + dRect.height / 2 - containerRect.top
        });
        setIsCalculated(true);
      }
    };

    updateCoordinates();
    window.addEventListener('resize', updateCoordinates);
    const interval = setInterval(updateCoordinates, 300);
    return () => {
      window.removeEventListener('resize', updateCoordinates);
      clearInterval(interval);
    };
  }, [activeMigration, containerRef]);

  if (!activeMigration) return null;

  const {
    migratingProcess,
    sourceCoreId,
    destCoreId,
    progress = 0,
    cost = 7.5,
    benefit = 25,
    score = 17.5,
    elapsed = 0,
    duration = 1.0
  } = activeMigration;

  const progressPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  // Current interpolated position along path with arc offset
  const curX = sourcePos.x + (destPos.x - sourcePos.x) * progress;
  const arcOffsetY = Math.sin(progress * Math.PI) * -50; // arc upwards
  const curY = sourcePos.y + (destPos.y - sourcePos.y) * progress + arcOffsetY;

  // Path SVG quadratic bezier curve
  const midX = (sourcePos.x + destPos.x) / 2;
  const midY = (sourcePos.y + destPos.y) / 2 - 50;
  const pathD = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY} ${destPos.x} ${destPos.y}`;

  return (
    <>
      {/* SVG Canvas Overlay connecting Source Core to Destination Core */}
      {isCalculated && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="migrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>

            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" />
            </marker>
          </defs>

          {/* Background conduit trajectory */}
          <path
            d={pathD}
            fill="none"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="5"
            strokeDasharray="6 6"
          />

          {/* Animated Glowing Migration Beam */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#migrationGradient)"
            strokeWidth="3.5"
            filter="url(#neonGlow)"
            className="migration-beam"
            markerEnd="url(#arrowhead)"
          />

          {/* Pulsing Core Source Anchor */}
          <circle cx={sourcePos.x} cy={sourcePos.y} r="8" fill="#f59e0b" className="animate-ping" opacity="0.4" />
          <circle cx={sourcePos.x} cy={sourcePos.y} r="5" fill="#f59e0b" />

          {/* Pulsing Core Destination Anchor */}
          <circle cx={destPos.x} cy={destPos.y} r="8" fill="#10b981" className="animate-ping" opacity="0.4" />
          <circle cx={destPos.x} cy={destPos.y} r="5" fill="#10b981" />
        </svg>
      )}

      {/* Floating Animated Process Card moving along vector */}
      {isCalculated && (
        <div
          className="absolute z-30 pointer-events-none transition-transform"
          style={{
            left: `${curX}px`,
            top: `${curY}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-56 shadow-2xl shadow-cyan-500/50 rounded-xl ring-2 ring-cyan-400 bg-slate-900/95 p-1"
          >
            <div className="bg-cyan-950/80 px-2 py-0.5 rounded-t text-[10px] font-mono text-cyan-300 flex items-center justify-between border-b border-cyan-800">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
                MIGRATING ({progressPercent}%)
              </span>
              <span>
                C{sourceCoreId} ──► C{destCoreId}
              </span>
            </div>
            <ProcessCard process={migratingProcess} isMigrating={true} isCompact={true} />
          </motion.div>
        </div>
      )}

      {/* Migration Progress Telemetry Banner */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className="w-full glass-panel rounded-xl p-3.5 border-cyan-500/40 shadow-xl shadow-cyan-950/40 my-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm">
                  MIGRATING {migratingProcess?.name || migratingProcess?.id}
                </h4>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  CORE {sourceCoreId} <ArrowRight className="w-3 h-3 text-cyan-400" /> CORE {destCoreId}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Demand: <strong className="text-cyan-400">{migratingProcess?.cpuDemand}% CPU</strong> | Security:{' '}
                <strong className="text-amber-400">{migratingProcess?.securityLevel}</strong> | Cache:{' '}
                <strong className="text-indigo-400">{migratingProcess?.cacheSensitivity}</strong>
              </p>
            </div>
          </div>

          {/* Migration Metrics Badges */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[10px] block">MIGRATION TIME</span>
              <span className="text-white font-bold">{elapsed.toFixed(2)}s / {duration.toFixed(2)}s</span>
            </div>
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[10px] block">TOTAL COST</span>
              <span className="text-amber-400 font-bold">{cost}</span>
            </div>
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[10px] block">EXP. BENEFIT</span>
              <span className="text-emerald-400 font-bold">+{benefit}</span>
            </div>
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[10px] block">NET SCORE</span>
              <span className="text-cyan-400 font-bold">+{score}</span>
            </div>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              STATUS: MIGRATING IN TRANSIT...
            </span>
            <span className="font-mono font-bold text-cyan-300">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 shadow-md shadow-cyan-500/50"
              style={{ width: `${progressPercent}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </div>
      </motion.div>
    </>
  );
}
