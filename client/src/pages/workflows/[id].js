import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute';
import AppShell from '../../components/AppShell';
import NodePalette from '../../components/NodePalette';
import WorkflowCanvas from '../../components/WorkflowCanvas';
import NodeConfigPanel from '../../components/NodeConfigPanel';
import { useWorkflowStore } from '../../store/workflowStore';
import api from '../../services/api';
import {
  Save,
  Play,
  Copy,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  Zap,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function WorkflowEditorPage() {
  const router = useRouter();
  const { id } = router.query;

  const {
    activeWorkflow,
    fetchWorkflowById,
    saveActiveWorkflow,
    duplicateWorkflow,
    updateActiveWorkflowMeta,
    isDirty,
    isLoading,
    error,
    selectedNode,
  } = useWorkflowStore();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [executionMessage, setExecutionMessage] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(true);

  // Load workflow on mount
  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchWorkflowById(id);
    }
  }, [id, fetchWorkflowById]);

  // Handle Save
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveActiveWorkflow();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle Duplicate
  const handleDuplicate = async () => {
    if (!activeWorkflow) return;
    try {
      const cloned = await duplicateWorkflow(activeWorkflow._id);
      router.push(`/workflows/${cloned._id}`);
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const [executing, setExecuting] = useState(false);

  // Handle Execute and Navigate to Execution Detail
  const handleExecute = async () => {
    if (!activeWorkflow) return;
    setExecuting(true);
    try {
      // If canvas has unsaved changes, save first so execution snapshot has latest graph
      if (isDirty) {
        await saveActiveWorkflow();
      }

      const res = await api.post(`/workflows/${activeWorkflow._id}/execute`);
      const executionId = res.data?.data?.execution?._id;

      if (executionId) {
        router.push(`/executions/${executionId}`);
      } else {
        router.push('/executions');
      }
    } catch (err) {
      console.error('Execute failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to trigger execution';
      setExecutionMessage(errMsg);
      setTimeout(() => setExecutionMessage(null), 4000);
      setExecuting(false);
    }
  };

  if (isLoading && !activeWorkflow) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
            <div className="flex items-center space-x-3 text-cyan-400 font-mono text-sm">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading Visual Workflow Graph...</span>
            </div>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!activeWorkflow) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
            <h2 className="text-lg font-bold text-white mb-1">Workflow Not Found</h2>
            <p className="text-xs text-slate-400 mb-6">The requested workflow does not exist or has been deleted.</p>
            <button
              onClick={() => router.push('/workflows')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono border border-slate-700 transition-colors"
            >
              Return to Workflows
            </button>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="h-screen w-screen overflow-hidden bg-background text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white">
        {/* Editor Top Bar */}
        <header className="h-16 border-b border-surface-border bg-surface/95 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
          {/* Left: Back & Workflow Title */}
          <div className="flex items-center space-x-3 min-w-0">
            <button
              onClick={() => router.push('/workflows')}
              title="Back to workflows list"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2.5 min-w-0">
              <input
                type="text"
                value={activeWorkflow.name || ''}
                onChange={(e) => updateActiveWorkflowMeta({ name: e.target.value })}
                className="bg-transparent font-bold text-sm sm:text-base text-white hover:bg-slate-800/50 px-2 py-1 rounded-lg border border-transparent hover:border-slate-700 focus:bg-slate-900 focus:border-cyan-400 focus:outline-none transition-all truncate"
              />

              {/* Version Badge */}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                v{activeWorkflow.version || 1}
              </span>

              {/* Status Selector */}
              <select
                value={activeWorkflow.status || 'draft'}
                onChange={(e) => updateActiveWorkflowMeta({ status: e.target.value })}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none focus:border-cyan-400 shrink-0"
              >
                <option value="draft">DRAFT</option>
                <option value="active">ACTIVE</option>
                <option value="paused">PAUSED</option>
                <option value="archived">ARCHIVED</option>
              </select>
            </div>
          </div>

          {/* Right: Actions (Save, Duplicate, Execute) */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Duplicate Button */}
            <button
              onClick={handleDuplicate}
              title="Clone this workflow"
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-mono transition-colors hidden sm:flex items-center space-x-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Clone</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center space-x-1.5 shadow-lg ${
                saveSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : isDirty
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25 ring-2 ring-cyan-400/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Graph</span>
                  {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />}
                </>
              )}
            </button>

            {/* Run Execution Button */}
            <button
              onClick={handleExecute}
              disabled={executing}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold font-mono transition-all shadow-lg shadow-purple-500/20 flex items-center space-x-1.5"
            >
              {executing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Launching Swarm...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Run Swarm</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Execution Notification Banner */}
        {executionMessage && (
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-cyan-950 border-b border-purple-500/30 px-4 py-2 text-xs font-mono text-cyan-300 flex items-center justify-between z-20 shrink-0">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>{executionMessage}</span>
            </div>
            <span className="text-[10px] text-slate-400 uppercase">Phase 4 Engine Target</span>
          </div>
        )}

        {/* 3-Column Visual Workspace */}
        <div className="flex-1 w-full h-[calc(100vh-4rem)] flex overflow-hidden relative">
          {/* Left Column: Node Palette */}
          {paletteOpen && <NodePalette />}

          {/* Center Column: React Flow Canvas */}
          <main className="flex-1 h-full w-full flex flex-col relative overflow-hidden">
            <WorkflowCanvas />
          </main>

          {/* Right Column: Node Configuration Panel */}
          {selectedNode && <NodeConfigPanel />}
        </div>
      </div>
    </ProtectedRoute>
  );
}
