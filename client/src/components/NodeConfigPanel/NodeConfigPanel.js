import React from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  X,
  Trash2,
  Sliders,
  Sparkles,
  Mail,
  MessageSquare,
  Bot,
  FileSpreadsheet,
  Zap,
  GitBranch,
  Info,
} from 'lucide-react';

export default function NodeConfigPanel() {
  const { selectedNode, clearSelectedNode, updateNodeConfig, deleteNode } = useWorkflowStore();

  if (!selectedNode) return null;

  const { id, data } = selectedNode;
  const nodeType = data.nodeType || 'trigger';
  const config = data.config || {};

  const handleFieldChange = (key, value) => {
    updateNodeConfig(id, {
      config: {
        ...config,
        [key]: value,
      },
    });
  };

  const handleLabelChange = (e) => {
    updateNodeConfig(id, { label: e.target.value });
  };

  const handleDescChange = (e) => {
    updateNodeConfig(id, { description: e.target.value });
  };

  const handleDelete = () => {
    deleteNode(id);
  };

  return (
    <aside className="w-80 bg-surface/95 backdrop-blur-xl border-l border-surface-border flex flex-col h-full shadow-2xl z-30 select-none">
      {/* Panel Header */}
      <div className="p-4 border-b border-surface-border/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-white font-mono">
            Node Configuration
          </h3>
        </div>
        <button
          onClick={clearSelectedNode}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Node Info & ID */}
      <div className="px-4 py-3 bg-slate-950/40 border-b border-surface-border/60 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400">Node ID:</span>
        <span className="text-cyan-300 font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
          {id}
        </span>
      </div>

      {/* Settings Form Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* General Settings */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
            General
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Step Label</label>
            <input
              type="text"
              value={data.label || ''}
              onChange={handleLabelChange}
              className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={data.description || ''}
              onChange={handleDescChange}
              placeholder="What does this step accomplish?"
              className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Specific Configuration Section */}
        <div className="pt-2 border-t border-surface-border/60 space-y-3">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
            Parameters ({nodeType.toUpperCase()})
          </div>

          {/* Trigger Node Parameters */}
          {(nodeType === 'trigger' || nodeType === 'webhook' || nodeType === 'schedule') && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Trigger Mode</label>
                <select
                  value={config.type || nodeType}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="manual">Manual Operator Run</option>
                  <option value="webhook">Webhook Endpoint</option>
                  <option value="schedule">Cron Schedule</option>
                </select>
              </div>

              {(config.type === 'schedule' || nodeType === 'schedule') && (
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Cron Expression</label>
                  <input
                    type="text"
                    value={config.cron || '*/15 * * * *'}
                    onChange={(e) => handleFieldChange('cron', e.target.value)}
                    placeholder="*/15 * * * *"
                    className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Runs every 15 minutes by default</p>
                </div>
              )}
            </div>
          )}

          {/* Gmail Parameters */}
          {nodeType === 'gmail' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Action Type</label>
                <select
                  value={config.actionType || 'send_email'}
                  onChange={(e) => handleFieldChange('actionType', e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="send_email">Send Outbound Email</option>
                  <option value="read_inbox">Read / Search Threads</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Recipient (To)</label>
                <input
                  type="text"
                  value={config.to || ''}
                  onChange={(e) => handleFieldChange('to', e.target.value)}
                  placeholder="operator@example.com"
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={config.subject || ''}
                  onChange={(e) => handleFieldChange('subject', e.target.value)}
                  placeholder="Notification: Task Completed"
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Body Template</label>
                <textarea
                  rows={3}
                  value={config.body || ''}
                  onChange={(e) => handleFieldChange('body', e.target.value)}
                  placeholder="Hello, here are your execution results..."
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* Slack Parameters */}
          {nodeType === 'slack' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Channel</label>
                <input
                  type="text"
                  value={config.channel || '#ops-alerts'}
                  onChange={(e) => handleFieldChange('channel', e.target.value)}
                  placeholder="#alerts or C0123456789"
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Message Content</label>
                <textarea
                  rows={3}
                  value={config.message || ''}
                  onChange={(e) => handleFieldChange('message', e.target.value)}
                  placeholder="🚨 Workflow automated notification..."
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* Discord Parameters */}
          {nodeType === 'discord' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Channel / Webhook ID</label>
                <input
                  type="text"
                  value={config.channelId || ''}
                  onChange={(e) => handleFieldChange('channelId', e.target.value)}
                  placeholder="123456789012345678"
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Bot Message</label>
                <textarea
                  rows={3}
                  value={config.content || ''}
                  onChange={(e) => handleFieldChange('content', e.target.value)}
                  placeholder="Bot execution log..."
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* Google Sheets Parameters */}
          {nodeType === 'google-sheets' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Spreadsheet ID</label>
                <input
                  type="text"
                  value={config.spreadsheetId || ''}
                  onChange={(e) => handleFieldChange('spreadsheetId', e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Sheet Tab Name</label>
                <input
                  type="text"
                  value={config.sheetName || 'Sheet1'}
                  onChange={(e) => handleFieldChange('sheetName', e.target.value)}
                  placeholder="Sheet1"
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Row Values (CSV format)</label>
                <input
                  type="text"
                  value={config.values || ''}
                  onChange={(e) => handleFieldChange('values', e.target.value)}
                  placeholder="Timestamp, User, Status"
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}

          {/* LLM Parameters */}
          {nodeType === 'llm' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">AI Provider</label>
                <select
                  value={config.provider || 'openrouter'}
                  onChange={(e) => handleFieldChange('provider', e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="openrouter">OpenRouter (Default)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="rule_engine">Deterministic Fallback</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">System Instructions</label>
                <textarea
                  rows={2}
                  value={config.systemPrompt || 'You are an operations automation reasoning agent.'}
                  onChange={(e) => handleFieldChange('systemPrompt', e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Prompt Template</label>
                <textarea
                  rows={3}
                  value={config.prompt || ''}
                  onChange={(e) => handleFieldChange('prompt', e.target.value)}
                  placeholder="Analyze the incoming ticket and summarize..."
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* Condition Router Parameters */}
          {nodeType === 'condition' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Field to Compare</label>
                <input
                  type="text"
                  value={config.field || ''}
                  onChange={(e) => handleFieldChange('field', e.target.value)}
                  placeholder="status"
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Operator</label>
                <select
                  value={config.operator || 'equals'}
                  onChange={(e) => handleFieldChange('operator', e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="equals">Equals (==)</option>
                  <option value="not_equals">Not Equals (!=)</option>
                  <option value="contains">Contains</option>
                  <option value="greater_than">Greater Than (&gt;)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Value</label>
                <input
                  type="text"
                  value={config.value || ''}
                  onChange={(e) => handleFieldChange('value', e.target.value)}
                  placeholder="COMPLETED"
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel Footer: Delete Action */}
      <div className="p-3 border-t border-surface-border/60 bg-slate-950/40 flex items-center justify-between">
        <button
          type="button"
          onClick={handleDelete}
          className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-mono transition-colors flex items-center space-x-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Node</span>
        </button>

        <button
          type="button"
          onClick={clearSelectedNode}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
        >
          Done
        </button>
      </div>
    </aside>
  );
}
