import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute';
import AppShell from '../../components/AppShell';
import MetricGrid from '../../components/MetricGrid';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  GitFork,
  Plus,
  Search,
  SlidersHorizontal,
  Copy,
  Trash2,
  ArrowRight,
  Sparkles,
  Clock,
  Tag,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';

export default function WorkflowsListPage() {
  const router = useRouter();
  const {
    workflows,
    metrics,
    isLoading,
    fetchWorkflows,
    fetchDashboardMetrics,
    createWorkflow,
    duplicateWorkflow,
    deleteWorkflow,
  } = useWorkflowStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch workflows & metrics on mount and when filters change
  useEffect(() => {
    fetchWorkflows({ search, status: statusFilter });
    fetchDashboardMetrics();
  }, [search, statusFilter, fetchWorkflows, fetchDashboardMetrics]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;

    setCreating(true);
    try {
      const created = await createWorkflow({
        name: newWorkflowName.trim(),
        description: newWorkflowDesc.trim(),
      });
      setModalOpen(false);
      setNewWorkflowName('');
      setNewWorkflowDesc('');
      router.push(`/workflows/${created._id}`);
    } catch (err) {
      console.error('Failed to create workflow:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (e, id) => {
    e.stopPropagation();
    setActionLoading(id);
    try {
      await duplicateWorkflow(id);
      fetchWorkflows({ search, status: statusFilter });
      fetchDashboardMetrics();
    } catch (err) {
      console.error('Failed to duplicate workflow:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this workflow?')) return;

    setActionLoading(id);
    try {
      await deleteWorkflow(id);
      fetchWorkflows({ search, status: statusFilter });
      fetchDashboardMetrics();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell
        title="Workflows Directory"
        subtitle="Create, configure, and orchestrate visual multi-agent workflows"
      >
        <div className="space-y-6">
          {/* Top Metrics Grid */}
          <MetricGrid metrics={metrics} isLoading={isLoading} />

          {/* Search, Filters & Create Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search workflows by name or tag..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="relative shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => router.push('/workflows/builder')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold font-mono transition-colors flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Builder</span>
              </button>

              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold font-mono transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Workflow</span>
              </button>
            </div>
          </div>

          {/* Workflows List / Cards Grid */}
          {isLoading && workflows.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-cyan-400 font-mono text-xs">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span>Loading Workflows...</span>
            </div>
          ) : workflows.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center mb-4 text-cyan-400">
                <GitFork className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Workflows Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                {search || statusFilter
                  ? 'No workflows match your search filters. Try clearing the filter.'
                  : 'You have not created any visual workflows yet. Get started with your first automation.'}
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Workflow</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf) => {
                const nodeCount = wf.nodes?.length || 0;
                const edgeCount = wf.edges?.length || 0;

                const statusStyles = {
                  active: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                  draft: 'bg-amber-950 text-amber-300 border-amber-800',
                  paused: 'bg-purple-950 text-purple-300 border-purple-800',
                  archived: 'bg-slate-900 text-slate-400 border-slate-800',
                };

                return (
                  <div
                    key={wf._id}
                    onClick={() => router.push(`/workflows/${wf._id}`)}
                    className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header: Status, Version & Node Count */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                              statusStyles[wf.status] || statusStyles.draft
                            }`}
                          >
                            {wf.status || 'draft'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                            v{wf.version || 1}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-cyan-400 flex items-center space-x-1">
                          <span>{nodeCount} Nodes</span>
                          <span className="text-slate-600">&bull;</span>
                          <span>{edgeCount} Edges</span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors leading-tight mb-1">
                        {wf.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans mb-4">
                        {wf.description || 'No description provided.'}
                      </p>

                      {/* Tags */}
                      {wf.tags && wf.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {wf.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center space-x-1"
                            >
                              <Tag className="w-2.5 h-2.5 text-cyan-400" />
                              <span>{tag}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Timestamp & Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="text-[10px] font-mono text-slate-500 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span>{new Date(wf.updatedAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={(e) => handleDuplicate(e, wf._id)}
                          disabled={actionLoading === wf._id}
                          title="Clone workflow"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, wf._id)}
                          disabled={actionLoading === wf._id}
                          title="Delete workflow"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="pl-1 text-slate-500 group-hover:text-cyan-400 transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Workflow Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md glass-panel p-6 rounded-2xl border border-slate-700 shadow-2xl animate-scale-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                    <GitFork className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-base">New Automation Workflow</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Workflow Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    placeholder="e.g. Lead Qualification Swarm"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 font-mono transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={newWorkflowDesc}
                    onChange={(e) => setNewWorkflowDesc(e.target.value)}
                    placeholder="Describe what this workflow automates..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 font-sans transition-colors resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newWorkflowName.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs font-mono transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <span>Create &amp; Open Canvas</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
