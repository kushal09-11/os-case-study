import React, { useRef } from 'react';
import CPUCore from '../components/CPUCore';
import ReadyQueue from '../components/ReadyQueue';
import MigrationAnimation from '../components/MigrationAnimation';
import MLPanel from '../components/MLPanel';
import EventLog from '../components/EventLog';
import MigrationAnalysis from '../components/MigrationAnalysis';
import SecurityPanel from '../components/SecurityPanel';
import DecisionWindow from '../components/DecisionWindow';

export default function SimulationPage({
  engineState,
  onGenerateLoad,
  onWeightChange,
  onPause,
  onResume,
  onSkipDecision
}) {
  const containerRef = useRef(null);
  const {
    cores = [],
    processes = [],
    readyQueue = [],
    eventLogs = [],
    mlPrediction,
    migrationAnalysis,
    activeMigration,
    numCores = 4
  } = engineState;

  // Layout grid columns based on core count
  const getGridCols = () => {
    if (numCores === 8) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    if (numCores === 6) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2'; // 4 cores 2x2
  };

  return (
    <div className="space-y-4">
      {/* Ready Queue Bar */}
      <ReadyQueue readyQueue={readyQueue} />

      {/* Main Multicore Visual Architecture Area */}
      <div
        ref={containerRef}
        className="relative rounded-2xl p-4 border border-slate-800 bg-slate-950/60 shadow-2xl overflow-hidden min-h-[420px]"
      >
        {/* Background circuit grid lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        {/* Cores SVG / Container Grid */}
        <div className={`relative z-10 grid gap-4 ${getGridCols()}`}>
          {cores.map((core) => (
            <CPUCore
              key={core.id}
              core={core}
              processes={processes}
              activeMigration={activeMigration}
              migrationAnalysis={(engineState.status === 'DECISION_WINDOW' || (engineState.status === 'PAUSED' && engineState.decisionRemaining > 0)) ? migrationAnalysis : null}
            />
          ))}
        </div>

        {/* Dynamic Process Migration Animation & SVG Path */}
        <MigrationAnimation
          activeMigration={activeMigration}
          decisionPlan={engineState.status === 'DECISION_WINDOW' || (engineState.status === 'PAUSED' && engineState.decisionRemaining > 0) ? migrationAnalysis?.bestPlan : null}
          containerRef={containerRef}
        />
      </div>

      {(engineState.status === 'DECISION_WINDOW' || (engineState.status === 'PAUSED' && engineState.decisionRemaining > 0)) && (
        <DecisionWindow
          analysis={migrationAnalysis}
          remaining={engineState.decisionRemaining}
          paused={engineState.status === 'PAUSED'}
          onPause={onPause}
          onResume={onResume}
          onSkip={onSkipDecision}
        />
      )}

      {/* Real-time Telemetry & Intelligence Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ML Overload Predictor */}
        <MLPanel
          mlPrediction={mlPrediction}
          coreData={cores.find(c => c.id === (mlPrediction?.coreId ?? 1))}
        />

        {/* Kernel Telemetry Log */}
        <EventLog logs={eventLogs} />
      </div>

      {/* Migration Analysis & Security Inspection (Expands when active) */}
      {(migrationAnalysis?.bestPlan || activeMigration) && (
        <div className="space-y-4">
          <MigrationAnalysis
            analysisData={migrationAnalysis}
            weights={engineState.weights}
            onWeightChange={onWeightChange}
          />
          <SecurityPanel
            activeMigration={activeMigration}
            migrationAnalysis={migrationAnalysis}
          />
        </div>
      )}
    </div>
  );
}
