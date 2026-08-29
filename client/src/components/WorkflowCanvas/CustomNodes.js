import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Zap,
  Mail,
  MessageSquare,
  Bot,
  FileSpreadsheet,
  Sparkles,
  GitBranch,
  Clock,
  Radio,
  Sliders,
} from 'lucide-react';

const NODE_CONFIGS = {
  trigger: {
    icon: Zap,
    color: 'text-sky-400',
    bg: 'bg-sky-950/80',
    border: 'border-sky-500/40',
    glow: 'shadow-sky-500/20',
    badge: 'TRIGGER',
  },
  webhook: {
    icon: Radio,
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/80',
    border: 'border-cyan-500/40',
    glow: 'shadow-cyan-500/20',
    badge: 'WEBHOOK',
  },
  schedule: {
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/20',
    badge: 'CRON',
  },
  gmail: {
    icon: Mail,
    color: 'text-red-400',
    bg: 'bg-red-950/80',
    border: 'border-red-500/40',
    glow: 'shadow-red-500/20',
    badge: 'GMAIL',
  },
  slack: {
    icon: MessageSquare,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/20',
    badge: 'SLACK',
  },
  discord: {
    icon: Bot,
    color: 'text-indigo-400',
    bg: 'bg-indigo-950/80',
    border: 'border-indigo-500/40',
    glow: 'shadow-indigo-500/20',
    badge: 'DISCORD',
  },
  'google-sheets': {
    icon: FileSpreadsheet,
    color: 'text-green-400',
    bg: 'bg-green-950/80',
    border: 'border-green-500/40',
    glow: 'shadow-green-500/20',
    badge: 'SHEETS',
  },
  llm: {
    icon: Sparkles,
    color: 'text-purple-400',
    bg: 'bg-purple-950/80',
    border: 'border-purple-500/40',
    glow: 'shadow-purple-500/20',
    badge: 'AI PROMPT',
  },
  condition: {
    icon: GitBranch,
    color: 'text-amber-400',
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/20',
    badge: 'LOGIC',
  },
  transform: {
    icon: Sliders,
    color: 'text-blue-400',
    bg: 'bg-blue-950/80',
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/20',
    badge: 'TRANSFORM',
  },
};

export const CustomNode = memo(({ data, selected, id }) => {
  const nodeType = data.nodeType || 'trigger';
  const config = NODE_CONFIGS[nodeType] || NODE_CONFIGS.trigger;
  const Icon = config.icon;
  const isTrigger = data.category === 'trigger' || nodeType === 'trigger' || nodeType === 'webhook' || nodeType === 'schedule';

  return (
    <div
      className={`relative min-w-[220px] max-w-[280px] rounded-xl border backdrop-blur-xl transition-all shadow-xl select-none ${
        config.bg
      } ${config.border} ${
        selected
          ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-2xl scale-[1.02]'
          : 'hover:border-slate-500'
      }`}
    >
      {/* Input Handle (not needed on triggers) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3.5 !h-3.5 !bg-slate-900 !border-2 !border-cyan-400 !-left-2 shadow-md hover:!scale-125 transition-transform"
        />
      )}

      {/* Node Header */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center shrink-0`}>
            <Icon className={`w-3.5 h-3.5 ${config.color}`} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate leading-tight">
              {data.label || 'Node'}
            </h4>
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
              {config.badge}
            </span>
          </div>
        </div>

        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50" />
      </div>

      {/* Node Body / Summary */}
      <div className="p-3 text-[11px] text-slate-300">
        <p className="line-clamp-2 text-slate-400 leading-relaxed font-sans">
          {data.description || 'Click to configure step parameters...'}
        </p>

        {/* Dynamic Parameter Pills */}
        {data.config && Object.keys(data.config).length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-1">
            {Object.entries(data.config)
              .filter(([_, v]) => v && typeof v === 'string')
              .slice(0, 2)
              .map(([k, v]) => (
                <span
                  key={k}
                  className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-[9px] font-mono text-cyan-300 max-w-[180px] truncate"
                >
                  {k}: {v}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-slate-900 !border-2 !border-cyan-400 !-right-2 shadow-md hover:!scale-125 transition-transform"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export const nodeTypes = {
  customNode: CustomNode,
};
