import React from 'react';
import SimulationCanvas from '../components/SimulationCanvas';
import SimulationInfoPanel from '../components/SimulationInfoPanel';
import MigrationAnalysis from '../components/MigrationAnalysis';
import SecurityPanel from '../components/SecurityPanel';

export default function SimulationPage({
  engineState,
  onGenerateLoad,
  onWeightChange,
  onPause,
  onResume,
  onSkipDecision,
  onClearLogs
}) {
  const {
    cores = [],
    processes = [],
    readyQueue = [],
    mlPrediction,
    migrationAnalysis,
    activeMigration,
    status = 'STOPPED',
    decisionRemaining = 0,
    numCores = 4
  } = engineState;

  return (
    <div className="space-y-4">
      {/* MAIN DEDICATED SIMULATION WORKSPACE (2-COLUMN LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT / CENTER: LARGE DEDICATED SIMULATION CANVAS (68–72% width: 8 of 12 cols or 8.5/12) */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-8 w-full">
          <SimulationCanvas
            cores={cores}
            processes={processes}
            readyQueue={readyQueue}
            activeMigration={activeMigration}
            migrationAnalysis={migrationAnalysis}
            status={status}
            decisionRemaining={decisionRemaining}
            numCores={numCores}
            onPause={onPause}
            onResume={onResume}
            onSkipDecision={onSkipDecision}
          />
        </div>

        {/* RIGHT: DEDICATED SIMULATION INFORMATION PANEL (28–32% width: 4 of 12 cols) */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-4 w-full">
          <SimulationInfoPanel
            engineState={engineState}
            onClearLogs={onClearLogs}
          />
        </div>
      </div>

      {/* LOWER SECTION: COMPREHENSIVE IN-DEPTH MIGRATION ARBITRATION & SECURITY DETAILS */}
      {(migrationAnalysis?.bestPlan || activeMigration) && (
        <div className="space-y-4 pt-2">
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
