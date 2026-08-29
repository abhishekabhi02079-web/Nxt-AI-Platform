import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  Zap,
  Radio,
  Clock,
  Mail,
  MessageSquare,
  Bot,
  FileSpreadsheet,
  Sparkles,
  GitBranch,
  Sliders,
  Search,
  Plus,
  Layers,
  ChevronDown,
  GripVertical,
} from 'lucide-react';

const PALETTE_CATEGORIES = [
  {
    id: 'triggers',
    title: 'Triggers',
    items: [
      {
        type: 'trigger',
        label: 'Manual Trigger',
        category: 'trigger',
        icon: Zap,
        color: 'text-sky-400',
        bg: 'bg-sky-950/60 border-sky-800/40',
        desc: 'Execute workflow on manual operator demand',
      },
      {
        type: 'webhook',
        label: 'Webhook Listener',
        category: 'trigger',
        icon: Radio,
        color: 'text-cyan-400',
        bg: 'bg-cyan-950/60 border-cyan-800/40',
        desc: 'Trigger on incoming HTTP POST payload',
      },
      {
        type: 'schedule',
        label: 'Cron Schedule',
        category: 'trigger',
        icon: Clock,
        color: 'text-amber-400',
        bg: 'bg-amber-950/60 border-amber-800/40',
        desc: 'Periodic automated execution (Cron syntax)',
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Third-Party Actions',
    items: [
      {
        type: 'gmail',
        label: 'Gmail',
        category: 'action',
        icon: Mail,
        color: 'text-red-400',
        bg: 'bg-red-950/60 border-red-800/40',
        desc: 'Send outbound emails or fetch inbox threads',
      },
      {
        type: 'slack',
        label: 'Slack Notification',
        category: 'action',
        icon: MessageSquare,
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/60 border-emerald-800/40',
        desc: 'Post rich alerts to designated Slack channels',
      },
      {
        type: 'discord',
        label: 'Discord Post',
        category: 'action',
        icon: Bot,
        color: 'text-indigo-400',
        bg: 'bg-indigo-950/60 border-indigo-800/40',
        desc: 'Send webhook notifications to Discord servers',
      },
      {
        type: 'google-sheets',
        label: 'Google Sheets',
        category: 'action',
        icon: FileSpreadsheet,
        color: 'text-green-400',
        bg: 'bg-green-950/60 border-green-800/40',
        desc: 'Append or update rows in Google Sheets',
      },
    ],
  },
  {
    id: 'ai-logic',
    title: 'AI & Control Flow',
    items: [
      {
        type: 'llm',
        label: 'AI Prompt (LLM)',
        category: 'ai',
        icon: Sparkles,
        color: 'text-purple-400',
        bg: 'bg-purple-950/60 border-purple-800/40',
        desc: 'Run prompt through OpenRouter or Gemini',
      },
      {
        type: 'condition',
        label: 'Condition Router',
        category: 'logic',
        icon: GitBranch,
        color: 'text-amber-400',
        bg: 'bg-amber-950/60 border-amber-800/40',
        desc: 'Evaluate conditions (If / Else branching)',
      },
      {
        type: 'transform',
        label: 'Data Transform',
        category: 'logic',
        icon: Sliders,
        color: 'text-blue-400',
        bg: 'bg-blue-950/60 border-blue-800/40',
        desc: 'Extract, format, and map JSON payloads',
      },
    ],
  },
];

export default function NodePalette() {
  const [search, setSearch] = useState('');
  const addNode = useWorkflowStore((state) => state.addNode);

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/reactflow', item.type);
    e.dataTransfer.setData('application/reactflow/category', item.category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuickAdd = (item) => {
    // Generate random offset position near center
    const x = 300 + Math.floor(Math.random() * 80);
    const y = 200 + Math.floor(Math.random() * 80);
    addNode(item.type, item.category, { x, y });
  };

  const filteredCategories = PALETTE_CATEGORIES.map((category) => {
    const matchingItems = category.items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase())
    );
    return { ...category, items: matchingItems };
  }).filter((category) => category.items.length > 0);

  return (
    <aside className="w-72 bg-surface/90 backdrop-blur-md border-r border-surface-border flex flex-col h-full select-none">
      {/* Header & Search */}
      <div className="p-4 border-b border-surface-border/80">
        <div className="flex items-center space-x-2 mb-3">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-white font-mono">
            Node Palette
          </h3>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-mono"
          />
        </div>
      </div>

      {/* Categories & Node List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {filteredCategories.map((category) => (
          <div key={category.id} className="space-y-1.5">
            <div className="px-2 text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
              {category.title}
            </div>

            <div className="space-y-1.5">
              {category.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 cursor-grab active:cursor-grabbing transition-all group relative flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div className="text-slate-600 group-hover:text-slate-400">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${item.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                          {item.label}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate">{item.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickAdd(item)}
                      title="Add to canvas"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-800 transition-opacity shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500 font-mono">
            No matching nodes found.
          </div>
        )}
      </div>

      {/* Palette Footer Tip */}
      <div className="p-3 border-t border-surface-border/60 bg-slate-950/40 text-[10px] font-mono text-slate-500 text-center">
        💡 Drag into canvas or click <strong className="text-cyan-400">+</strong> to place
      </div>
    </aside>
  );
}
