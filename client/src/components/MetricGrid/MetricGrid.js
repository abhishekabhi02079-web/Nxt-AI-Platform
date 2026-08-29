import React from 'react';
import { GitFork, CheckCircle2, FileEdit, PauseCircle } from 'lucide-react';

export default function MetricGrid({ metrics, isLoading }) {
  const counts = metrics?.countsByStatus || { draft: 0, active: 0, paused: 0, archived: 0 };
  const total = metrics?.totalWorkflows || 0;

  const items = [
    {
      title: 'Total Workflows',
      value: total,
      icon: GitFork,
      color: 'text-cyan-400',
      bg: 'bg-cyan-950/60 border-cyan-800/40',
      desc: 'Configured graphs in workspace',
    },
    {
      title: 'Active Swarms',
      value: counts.active,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/60 border-emerald-800/40',
      desc: 'Ready for automated triggers',
    },
    {
      title: 'Draft Workflows',
      value: counts.draft,
      icon: FileEdit,
      color: 'text-amber-400',
      bg: 'bg-amber-950/60 border-amber-800/40',
      desc: 'In development on canvas',
    },
    {
      title: 'Paused Workflows',
      value: counts.paused,
      icon: PauseCircle,
      color: 'text-purple-400',
      bg: 'bg-purple-950/60 border-purple-800/40',
      desc: 'Temporarily disabled runs',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400 font-medium">
                {item.title}
              </span>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${item.bg}`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-2xl font-bold text-white font-mono tracking-tight">
                {isLoading ? '...' : item.value}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">{item.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
