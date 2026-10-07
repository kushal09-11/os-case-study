import React from 'react';
import { Play, Pause, RotateCcw, StepForward, Zap, Sparkles, HelpCircle, Server } from 'lucide-react';

export default function SimulationControls({
  simTime = 0,
  status = 'STOPPED',
  speed = 1.0,
  numCores = 4,
  explanationText = '',
  onStart,
  onPause,
  onResume,
  onStep,
  onReset,
  onGenerateLoad,
  onRunDemo,
  onSpeedChange,
  onNumCoresChange,
  backendHealth = 'checking'
}) {
  const isRunning = status === 'RUNNING' || status === 'MIGRATING';
  const isPaused = status === 'PAUSED';

  // Format mm:ss.s
  const formatTime = (timeInSec) => {
    const mins = Math.floor(timeInSec / 60);
    const secs = (timeInSec % 60).toFixed(1);
    return `${String(mins).padStart(2, '0')}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'RUNNING':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse';
      case 'MIGRATING':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse';
      case 'PAUSED':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'STOPPED':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-3">
      {/* Top OS Simulation Status Banner */}
      <div className="glass-panel rounded-xl p-3.5 shadow-xl border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Subtitle */}
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/60 text-cyan-400 font-black font-mono text-base">
                CG
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-wider text-white flex items-center gap-2 font-mono">
                  COREGUARD
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-normal">
                    Kernel Simulator
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  Predictive Security-Aware Dynamic Process Migration & Load Balancing
                </p>
              </div>
            </div>
          </div>

          {/* Telemetry Status Gauges */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Status */}
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">SIMULATION STATUS</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-block mt-0.5 ${getStatusColor()}`}>
                {status}
              </span>
            </div>

            {/* Sim Time */}
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">SIMULATION TIME</span>
              <span className="text-cyan-400 font-bold text-base tracking-widest">
                {formatTime(simTime)}
              </span>
            </div>

            {/* CPU Config */}
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block mb-1">CPU CONFIGURATION</span>
              <div className="flex gap-1">
                {[4, 6, 8].map((cores) => (
                  <button
                    key={cores}
                    onClick={() => onNumCoresChange(cores)}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-all ${
                      numCores === cores
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cores} Cores
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Speed */}
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block mb-1">CLOCK SPEED</span>
              <div className="flex gap-1">
                {[0.5, 1, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => onSpeedChange(s)}
                    className={`px-1.5 py-0.5 text-[10px] rounded border transition-all ${
                      speed === s
                        ? 'bg-purple-500/30 border-purple-400 text-purple-200 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Backend Health Badge */}
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block">BACKEND API</span>
                <span className={`text-[10px] font-bold ${
                  backendHealth === 'online' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {backendHealth === 'online' ? 'CONNECTED (8000)' : 'STANDALONE MODE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {!isRunning ? (
              <button
                onClick={isPaused ? onResume : onStart}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                {isPaused ? 'RESUME' : 'START'}
              </button>
            ) : (
              <button
                onClick={onPause}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
              >
                <Pause className="w-4 h-4 fill-white" />
                PAUSE
              </button>
            )}

            <button
              onClick={onStep}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <StepForward className="w-4 h-4" />
              STEP (0.2s)
            </button>

            <button
              onClick={onReset}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-200 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              RESET
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onGenerateLoad && onGenerateLoad(1)}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-200" />
              GENERATE LOAD (CORE 1)
            </button>

            <button
              onClick={onRunDemo}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/40 ring-1 ring-cyan-300/50 transition-all cursor-pointer animate-pulse"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              RUN COMPLETE DEMO
            </button>
          </div>
        </div>
      </div>

      {/* Professor-Friendly Explanation Panel */}
      <div className="glass-panel rounded-xl p-3 border-indigo-500/30 bg-indigo-950/20 shadow-md">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-900/60 text-indigo-300 border border-indigo-700 mt-0.5">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-indigo-300 font-mono uppercase tracking-wider">
                What is Happening? (Real-time Explanation)
              </h4>
            </div>
            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
              {explanationText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
