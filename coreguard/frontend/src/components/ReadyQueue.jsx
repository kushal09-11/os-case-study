import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProcessCard from './ProcessCard';
import { Layers } from 'lucide-react';

export default function ReadyQueue({ readyQueue = [] }) {
  return (
    <div className="glass-panel rounded-xl p-3 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">
            OS Ready Queue
          </h3>
          <span className="bg-cyan-950/80 text-cyan-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-800">
            {readyQueue.length} Pending
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          First-In, First-Out (FIFO) with Priority Scheduling
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1.5 min-h-[64px] items-center">
        <AnimatePresence>
          {readyQueue.length === 0 ? (
            <div className="w-full text-center text-slate-500 text-xs italic py-2">
              Queue empty (all arrived workloads scheduled)
            </div>
          ) : (
            readyQueue.map((proc, idx) => (
              <motion.div
                key={proc.id}
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7, y: -20 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className="min-w-[170px] flex-shrink-0"
              >
                <ProcessCard process={proc} isCompact={true} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
