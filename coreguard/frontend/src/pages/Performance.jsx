import React, { useEffect, useState } from 'react';
import PerformanceCharts from '../components/PerformanceCharts';
import Timeline from '../components/Timeline';
import { api } from '../services/api';
import { Activity, RefreshCw } from 'lucide-react';

export default function PerformancePage({ engineState }) {
  const [perfData, setPerfData] = useState(null);
  const [migrations, setMigrations] = useState([]);

  useEffect(() => {
    async function loadData() {
      const data = await api.getPerformanceData();
      if (data) setPerfData(data);

      const migs = await api.getMigrations();
      if (migs && migs.migrations) setMigrations(migs.migrations);
    }
    loadData();
  }, []);

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-xl p-3.5 border-slate-700 flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            EMPIRICAL SYSTEM PERFORMANCE & TIMELINE BENCHMARK
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Comparative analysis between Proactive Predictive Load Balancing (CoreGuard) and Traditional Reactive Migration.
          </p>
        </div>
      </div>

      {/* Gantt Timeline */}
      <Timeline
        timelineRecords={engineState.timelineRecords}
        numCores={engineState.numCores}
        currentTime={engineState.simTime}
        migrations={migrations}
      />

      {/* Comparative Charts & Metrics */}
      <PerformanceCharts
        performanceData={perfData}
        cores={engineState.cores}
      />
    </div>
  );
}
