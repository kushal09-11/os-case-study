import React, { useState, useEffect, useRef } from 'react';
import SimulationControls from './components/SimulationControls';
import SimulationPage from './pages/Simulation';
import MigrationAnalysisPage from './pages/MigrationAnalysis';
import PerformancePage from './pages/Performance';
import DashboardPage from './pages/Dashboard';
import HistoryPage from './pages/History';
import { SimulationEngine } from './simulation/simulationEngine';
import { api } from './services/api';
import { Cpu, Network, Activity, LayoutDashboard, History } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendHealth, setBackendHealth] = useState('checking');

  // Simulation engine state
  const [engineState, setEngineState] = useState({
    simTime: 0.0,
    status: 'STOPPED',
    speed: 1.0,
    numCores: 4,
    cores: [],
    processes: [],
    readyQueue: [],
    eventLogs: [],
    timelineRecords: [],
    mlPrediction: null,
    migrationAnalysis: null,
    activeMigration: null,
    explanationText: 'Welcome to CoreGuard. Press [START] or [RUN COMPLETE DEMO] to begin.',
    weights: { alpha: 1.0, beta: 1.0, gamma: 1.0, delta: 1.0 }
  });

  const engineRef = useRef(null);

  // Initialize engine once
  useEffect(() => {
    engineRef.current = new SimulationEngine({
      onStateChange: (state) => {
        setEngineState(prev => ({
          ...prev,
          ...state
        }));
      }
    });

    // Check backend connection
    const checkApi = async () => {
      const res = await api.checkHealth();
      setBackendHealth(res.status === 'healthy' ? 'online' : 'standalone');
    };
    checkApi();
    const interval = setInterval(checkApi, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => engineRef.current?.start();
  const handlePause = () => engineRef.current?.pause();
  const handleResume = () => engineRef.current?.resume();
  const handleStep = () => engineRef.current?.step();
  const handleReset = () => engineRef.current?.reset();
  const handleGenerateLoad = (coreId) => engineRef.current?.generateOverload(coreId);
  const handleRunDemo = () => {
    setActiveTab('simulation');
    engineRef.current?.runCompleteDemo();
  };
  const handleSpeedChange = (speed) => engineRef.current?.setSpeed(speed);
  const handleNumCoresChange = (cores) => engineRef.current?.setNumCores(cores);
  const handleModeChange = (mode) => engineRef.current?.setMode(mode);
  const handleAutomaticWorkload = (enabled) => engineRef.current?.setAutomaticWorkload(enabled);
  const handleDecisionDelay = (delay) => engineRef.current?.setDecisionDelay(delay);
  const handleSkipDecision = () => engineRef.current?.skipDecisionDelay();
  const handleSeedChange = (seed) => engineRef.current?.setSeed(seed);
  const handleWeightChange = (newWeights) => {
    engineRef.current?.setWeights(newWeights);
    setEngineState(prev => ({
      ...prev,
      weights: { ...prev.weights, ...newWeights }
    }));
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      <header className="sticky top-0 z-40 bg-[#080c14]/90 backdrop-blur-md border-b border-slate-800/80 p-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/60 text-cyan-400 font-black font-mono">CG</div>
            <div><div className="font-extrabold tracking-wider text-white font-mono">COREGUARD</div><div className="text-[10px] text-slate-400">Predictive multicore process migration</div></div>
          </div>
          <div className="text-[10px] font-mono text-slate-500">{backendHealth === 'online' ? 'API ONLINE' : 'LOCAL SIMULATION'}</div>
        </div>
        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex gap-2 mt-3 pt-3 border-t border-slate-800/60 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'simulation', label: 'Simulation Workspace', icon: Cpu },
            { id: 'analysis', label: 'Migration Analysis', icon: Network },
            { id: 'performance', label: 'Performance', icon: Activity },
            { id: 'history', label: 'History', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'simulation' && (
          <SimulationControls
            simTime={engineState.simTime}
            status={engineState.status}
            speed={engineState.speed}
            numCores={engineState.numCores}
            explanationText={engineState.explanationText}
            mode={engineState.mode}
            automaticWorkload={engineState.automaticWorkload}
            decisionDelay={engineState.decisionDelay}
            decisionRemaining={engineState.decisionRemaining}
            decisionPaused={engineState.decisionPaused}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onStep={handleStep}
            onReset={handleReset}
            onGenerateLoad={handleGenerateLoad}
            onRunDemo={handleRunDemo}
            onSpeedChange={handleSpeedChange}
            onNumCoresChange={handleNumCoresChange}
            onModeChange={handleModeChange}
            onAutomaticWorkload={handleAutomaticWorkload}
            onDecisionDelay={handleDecisionDelay}
            onSkipDecision={handleSkipDecision}
            onSeedChange={handleSeedChange}
            backendHealth={backendHealth}
          />
        )}
        {activeTab === 'simulation' && (
          <SimulationPage
            engineState={engineState}
            onGenerateLoad={handleGenerateLoad}
            onWeightChange={handleWeightChange}
            onPause={handlePause}
            onResume={handleResume}
            onSkipDecision={handleSkipDecision}
          />
        )}

        {activeTab === 'analysis' && (
          <MigrationAnalysisPage
            engineState={engineState}
            onWeightChange={handleWeightChange}
          />
        )}

        {activeTab === 'performance' && (
          <PerformancePage
            engineState={engineState}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardPage
            engineState={engineState}
          />
        )}
        {activeTab === 'history' && <HistoryPage engineState={engineState} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 p-3 text-center text-[11px] font-mono text-slate-500">
        CoreGuard &bull; Operating Systems Case Study &bull; Software-Level Multicore Process Migration Simulator
      </footer>
    </div>
  );
}
