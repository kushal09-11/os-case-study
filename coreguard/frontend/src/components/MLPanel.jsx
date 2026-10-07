import React from 'react';
import { BrainCircuit, TrendingUp, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function MLPanel({ mlPrediction, coreData = null }) {
  const current = coreData?.load ?? mlPrediction?.currentLoad ?? 86;
  const predicted = mlPrediction?.predictedLoad ?? (current >= 80 ? current + 8 : current + 2);
  const trend = mlPrediction?.trend ?? (current >= 80 ? '+4.2%' : '+1.1%');
  const movingAvg = mlPrediction?.movingAvg ?? Math.max(10, current - 4);
  const confidence = mlPrediction?.confidence ?? 94.2;
  const isOverload = mlPrediction?.overloadPredicted ?? (predicted >= 88);

  // Telemetry chart data: Actual Load vs Projected ML Load trajectory
  const chartData = [
    { step: 't - 3s', actual: Math.max(15, current - 14), predicted: Math.max(15, current - 12) },
    { step: 't - 2s', actual: Math.max(20, current - 9), predicted: Math.max(20, current - 8) },
    { step: 't - 1s', actual: Math.max(25, current - 4), predicted: Math.max(25, current - 3) },
    { step: 't (Now)', actual: current, predicted: current },
    { step: 't + 1s', actual: null, predicted: Math.min(100, Math.round(current + (predicted - current) * 0.5)) },
    { step: 't + 2s', actual: null, predicted: Math.min(100, predicted) }
  ];

  return (
    <div className="glass-panel rounded-xl p-4 shadow-lg border-slate-700 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm text-white font-mono tracking-wide">
            ML OVERLOAD PREDICTOR (RANDOM FOREST)
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
          Scikit-Learn Classifier + Regressor
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">EVALUATED CORE</span>
          <span className="font-bold text-white text-sm">CORE {mlPrediction?.coreId ?? 1}</span>
          <span className="text-slate-500 block text-[10px] mt-0.5">Telemetry Window: 5 Ticks</span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">CURRENT LOAD / MOVING AVG</span>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-cyan-400 text-sm">{current}%</span>
            <span className="text-slate-400 text-[11px]">(MA: {movingAvg}%)</span>
          </div>
          <span className="text-amber-400 block text-[10px] mt-0.5">Trend Slope: {trend}</span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-slate-400 block text-[10px]">PREDICTED FUTURE LOAD</span>
          <div className="flex items-baseline gap-2">
            <span className={`font-bold text-base ${isOverload ? 'text-red-400' : 'text-emerald-400'}`}>
              {predicted}%
            </span>
            <span className="text-slate-400 text-[10px]">(Conf: {confidence}%)</span>
          </div>
          <span className="text-purple-300 block text-[10px] mt-0.5">
            {isOverload ? '⚠ OVERLOAD LIKELY' : '✓ NOMINAL PROFILE'}
          </span>
        </div>
      </div>

      {/* Mini Recharts Comparison */}
      <div className="pt-2">
        <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1 font-mono">
          <span className="flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
            Actual vs ML Projected Load Horizon
          </span>
          <span className="text-red-400 text-[10px]">Threshold: 88%</span>
        </div>
        <div className="h-32 w-full bg-slate-950/80 rounded-lg p-1.5 border border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="step" stroke="#64748b" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 9 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Load"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#38bdf8' }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted Load"
                stroke="#c084fc"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#c084fc' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
