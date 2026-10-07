import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { Award, Zap, Shield, TrendingDown, ArrowUpRight } from 'lucide-react';

export default function PerformanceCharts({
  performanceData = null,
  cores = []
}) {
  const defaultTimeline = [
    { time: '0s', coreguard: 25, reactive: 25 },
    { time: '4s', coreguard: 45, reactive: 45 },
    { time: '8s', coreguard: 72, reactive: 72 },
    { time: '10s', coreguard: 86, reactive: 86 },
    { time: '12s', coreguard: 86, reactive: 94 },
    { time: '14s', coreguard: 78, reactive: 97 },
    { time: '18s', coreguard: 58, reactive: 95 },
    { time: '20s', coreguard: 54, reactive: 68 },
    { time: '24s', coreguard: 48, reactive: 52 }
  ];

  const timelineData = performanceData?.comparison?.timelineComparison?.map(d => ({
    time: `${d.tick}s`,
    coreguard: d.predictive,
    reactive: d.reactive
  })) || defaultTimeline;

  const coreComparisonData = cores.map(c => ({
    name: `Core ${c.id}`,
    CurrentLoad: c.load,
    Projected: c.predictedLoad ?? c.load
  }));

  const metricsTable = performanceData?.comparison?.metrics || [
    { metric: 'Peak CPU Load', coreguard: '86.0%', reactive: '96.4%', improvement: '-10.4% lower overload peak' },
    { metric: 'Average Core Imbalance', coreguard: '11.2%', reactive: '28.5%', improvement: '60.7% more uniform distribution' },
    { metric: 'Total Migration Overhead', coreguard: '1.82 s', reactive: '4.15 s', improvement: '56.1% reduced transfer latency' },
    { metric: 'Thrashed Migrations', coreguard: '0', reactive: '3', improvement: 'Zero oscillation/ping-pong' },
    { metric: 'Security Isolation Compliance', coreguard: '100%', reactive: '0% (Agnostic)', improvement: 'Zero cross-tenant leaks' },
    { metric: 'Average Process Response Time', coreguard: '2.40 s', reactive: '3.85 s', improvement: '37.6% faster completion' }
  ];

  return (
    <div className="space-y-4">
      {/* Comparative Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-cyan-300 text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" /> COREGUARD PREDICTIVE
            </span>
            <span className="bg-cyan-500/20 text-cyan-400 text-[10px] px-2 py-0.5 rounded border border-cyan-500/40 font-bold">
              AI + SECURITY AWARE
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Anticipates saturation using Random Forest regression & classifier before severe overload occurs.
            Verifies co-tenancy isolation policies and computes multi-attribute migration cost vectors.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-300 text-sm">
              TRADITIONAL REACTIVE
            </span>
            <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-700">
              BASELINE BENCHMARK
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Waits until hard threshold (95%+) saturation occurs. Migrates reactively causing CPU thermal throttling,
            cache degradation, and ignores workload security classifications.
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: CPU Overload Trajectory */}
        <div className="glass-panel rounded-xl p-3.5 border-slate-700 shadow-md">
          <div className="flex justify-between items-center mb-2 font-mono text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              Peak Core CPU Load Over Time (%)
            </span>
            <span className="text-[10px] text-red-400">Overload Threshold: 90%</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="coreguard"
                  name="CoreGuard Predictive"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#38bdf8' }}
                />
                <Line
                  type="monotone"
                  dataKey="reactive"
                  name="Traditional Reactive"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#f43f5e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Current Multi-Core Load Distribution */}
        <div className="glass-panel rounded-xl p-3.5 border-slate-700 shadow-md">
          <div className="flex justify-between items-center mb-2 font-mono text-xs">
            <span className="font-bold text-white">
              Current Core Load Balance Profile
            </span>
            <span className="text-[10px] text-slate-400">Target balance: &lt; 70%</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coreComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="CurrentLoad" name="Current Load %" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Projected" name="ML Projected %" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="glass-panel rounded-xl p-4 border-slate-700 shadow-md">
        <h4 className="font-bold text-sm text-white font-mono mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-cyan-400" />
          EMPIRICAL PERFORMANCE COMPARISON SUMMARY
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Evaluation Metric</th>
                <th className="p-2.5 text-cyan-300">CoreGuard Predictive</th>
                <th className="p-2.5 text-rose-300">Traditional Reactive</th>
                <th className="p-2.5 text-emerald-300">Observed Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              {metricsTable.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-semibold text-white">{m.metric}</td>
                  <td className="p-2.5 font-bold text-cyan-400">{m.coreguard}</td>
                  <td className="p-2.5 text-slate-400">{m.reactive}</td>
                  <td className="p-2.5 text-emerald-400 font-medium flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {m.improvement}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
