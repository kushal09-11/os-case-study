import React from 'react';
import MigrationAnalysisComponent from '../components/MigrationAnalysis';
import SecurityPanel from '../components/SecurityPanel';
import { Network, Database } from 'lucide-react';

export default function MigrationAnalysisPage({
  engineState,
  onWeightChange
}) {
  const { migrationAnalysis, activeMigration, weights } = engineState;

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-xl p-3.5 border-slate-700">
        <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400" />
          IN-DEPTH MIGRATION ARBITRATION & SECURITY COMPLIANCE
        </h2>
        <p className="text-xs text-slate-300 mt-1">
          Explore candidate scoring algorithms, explainable multi-attribute cost formulations,
          memory transfer penalties, cache warmness disruption, and co-tenancy ring isolation.
        </p>
      </div>

      <MigrationAnalysisComponent
        analysisData={migrationAnalysis}
        weights={weights}
        onWeightChange={onWeightChange}
      />

      <SecurityPanel
        activeMigration={activeMigration}
        migrationAnalysis={migrationAnalysis}
      />
    </div>
  );
}
