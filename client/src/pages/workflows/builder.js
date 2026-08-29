import React, { useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute';
import AppShell from '../../components/AppShell';
import WorkflowCanvas from '../../components/WorkflowCanvas';
import { useWorkflowStore } from '../../store/workflowStore';
import api from '../../services/api';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Cpu,
  Zap,
  CheckCircle2,
  RefreshCw,
  GitFork,
  Tag,
  Wand2,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  Receipt,
  RotateCcw,
} from 'lucide-react';

const PRESET_PROMPTS = [
  {
    icon: Receipt,
    label: 'Invoice Approval & Ledger',
    prompt: 'Process incoming vendor invoices, parse line items with AI, alert #finance if amount > $1000, and log all entries into Google Sheets.',
  },
  {
    icon: Mail,
    label: 'Customer Welcome Outreach',
    prompt: 'Schedule morning trigger to draft personalized customer welcome emails with LLM, send via Gmail, and notify #growth channel on Slack.',
  },
  {
    icon: MessageSquare,
    label: 'Support Triage & Escalation',
    prompt: 'Listen for inbound support tickets on webhook, classify severity with AI, post critical alerts to #ops-incident-room, and log to Discord bot.',
  },
  {
    icon: FileSpreadsheet,
    label: 'Event Normalization to Sheets',
    prompt: 'Ingest raw operational webhook payload, normalize and format JSON rows, and append records directly to master Google Sheets ledger.',
  },
];

export default function WorkflowBuilderPage() {
  const router = useRouter();
  const { createWorkflow } = useWorkflowStore();

  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Generate workflow from prompt
  const handleGenerate = async (targetPrompt) => {
    const promptToUse = targetPrompt || prompt;
    if (!promptToUse || !promptToUse.trim()) {
      setError('Please enter an automation prompt or select a preset.');
      return;
    }

    setError('');
    setGenerating(true);
    try {
      const res = await api.post('/workflows/generate', { prompt: promptToUse.trim() });
      const data = res.data.data;
      setGeneratedResult(data);

      // Temporarily sync generated nodes/edges into workflowStore so WorkflowCanvas renders them
      useWorkflowStore.setState({
        nodes: data.workflow.nodes || [],
        edges: data.workflow.edges || [],
        activeWorkflow: data.workflow,
        selectedNode: null,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Workflow generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  // Save generated workflow to MongoDB and open in visual editor
  const handleAcceptAndOpen = async () => {
    if (!generatedResult?.workflow) return;

    setSaving(true);
    try {
      const wf = generatedResult.workflow;
      const created = await createWorkflow({
        name: wf.name,
        description: wf.description,
        status: 'draft',
        triggerConfig: wf.triggerConfig || { type: 'manual' },
        nodes: wf.nodes || [],
        edges: wf.edges || [],
        tags: wf.tags || ['ai-generated'],
      });

      router.push(`/workflows/${created._id}`);
    } catch (err) {
      setError('Failed to save generated workflow.');
      setSaving(false);
    }
  };

  const handleReset = () => {
    setGeneratedResult(null);
    setPrompt('');
    useWorkflowStore.setState({ nodes: [], edges: [], activeWorkflow: null });
  };

  const getModeBadge = (mode) => {
    if (mode === 'openrouter') {
      return {
        label: 'OpenRouter AI (Meta Llama 3.3)',
        color: 'bg-purple-950/80 text-purple-300 border-purple-800',
      };
    }
    if (mode === 'gemini') {
      return {
        label: 'Google Gemini 1.5 Flash',
        color: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
      };
    }
    return {
      label: 'Deterministic Rule Engine',
      color: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
    };
  };

  return (
    <ProtectedRoute>
      <AppShell
        title="AI Workflow Builder"
        subtitle="Transform natural language requirements into multi-agent visual graphs"
      >
        <div className="space-y-6">
          {/* Main 2-Column or Stacked View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Prompt Input & Presets (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Input Card */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">Natural Language Prompt</h3>
                      <span className="text-[10px] text-slate-400 font-mono">Autonomous Graph Synthesizer</span>
                    </div>
                  </div>

                  {generatedResult && (
                    <button
                      onClick={handleReset}
                      title="Clear and start over"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-mono transition-colors flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                    {error}
                  </div>
                )}

                <div>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your workflow in plain English... e.g. 'When a webhook arrives with a customer lead, analyze company size with AI and send a Gmail intro if qualified.'"
                    className="w-full p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans leading-relaxed resize-none transition-all shadow-inner"
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={() => handleGenerate()}
                  disabled={generating || !prompt.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Synthesizing Multi-Agent Graph...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 text-slate-950" />
                      <span>Generate Workflow Graph</span>
                    </>
                  )}
                </button>
              </div>

              {/* Preset Prompts Section */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-3">
                  Or Try a Preset Architecture
                </div>

                <div className="space-y-2">
                  {PRESET_PROMPTS.map((preset, idx) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPrompt(preset.prompt);
                          handleGenerate(preset.prompt);
                        }}
                        className="w-full p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group flex items-start space-x-3"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/40 transition-colors">
                          <Icon className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                            {preset.label}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-sans">
                            {preset.prompt}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Visual Graph Preview & Save Action (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              {generatedResult ? (
                <div className="glass-panel rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden h-[620px]">
                  {/* Preview Header */}
                  <div className="p-4 border-b border-surface-border bg-slate-950/60 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-white">{generatedResult.workflow.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            getModeBadge(generatedResult.mode).color
                          }`}
                        >
                          {getModeBadge(generatedResult.mode).label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {generatedResult.workflow.description}
                      </p>
                    </div>

                    {/* Accept & Open Button */}
                    <button
                      onClick={handleAcceptAndOpen}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 shrink-0"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Opening Canvas...</span>
                        </>
                      ) : (
                        <>
                          <span>Accept &amp; Edit Canvas</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Visual Canvas Container */}
                  <div className="flex-1 w-full relative bg-background">
                    <WorkflowCanvas />
                  </div>

                  {/* Preview Footer */}
                  <div className="p-3 border-t border-surface-border/60 bg-slate-950/80 px-4 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <div className="flex items-center space-x-3">
                      <span>Nodes: <strong className="text-white">{generatedResult.workflow.nodes?.length || 0}</strong></span>
                      <span>&bull;</span>
                      <span>Edges: <strong className="text-white">{generatedResult.workflow.edges?.length || 0}</strong></span>
                      <span>&bull;</span>
                      <span>Confidence: <strong className="text-cyan-300">{(generatedResult.confidence * 100).toFixed(0)}%</strong></span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {generatedResult.workflow.tags?.map((t, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty / Ready State */
                <div className="glass-panel rounded-2xl border border-dashed border-slate-800 h-[620px] flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center mb-4 text-cyan-400 shadow-xl">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white">Interactive Graph Preview</h3>
                  <p className="text-xs text-slate-400 max-w-md mt-1 mb-6">
                    Enter your automation requirement or pick a preset on the left. The generator will compute the node graph, handles, and animated connections in real time.
                  </p>
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>OpenRouter &bull; Google Gemini &bull; Deterministic Engine Ready</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
