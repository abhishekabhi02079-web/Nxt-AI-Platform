import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute';
import AppShell from '../../components/AppShell';
import { useExecutionStore } from '../../store/executionStore';
import {
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Ban,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Zap,
  Cpu,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

import { getSocket } from '../../services/socket';

export default function ExecutionsPage() {
  const router = useRouter();
  const {
    executions,
    pagination,
    filters,
    isSocketConnected,
    isLoading,
    fetchExecutions,
    setFilters,
  } = useExecutionStore();

  const [searchWorkflow, setSearchWorkflow] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initial fetch and on filter/page change
  useEffect(() => {
    fetchExecutions();
  }, [filters.status, pagination.page, fetchExecutions]);

  // Real-Time Socket.IO stream listener for live executions updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleStream = ({ executionId, eventName }) => {
      // If status or progress changes, refresh list
      if (eventName === 'execution:status' || eventName === 'execution:progress') {
        fetchExecutions({ page: pagination.page });
      }
    };

    socket.on('executions:stream', handleStream);
    return () => {
      socket.off('executions:stream', handleStream);
    };
  }, [pagination.page, fetchExecutions]);

  // Fallback Polling (ONLY active if socket is disconnected and autoRefresh is ON)
  useEffect(() => {
    if (!autoRefresh) return;
    if (isSocketConnected) return; // Socket is healthy, skip polling

    const interval = setInterval(() => {
      fetchExecutions({ page: pagination.page });
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, isSocketConnected, pagination.page, fetchExecutions]);

  const handleStatusFilter = (status) => {
    setFilters({ status });
    fetchExecutions({ page: 1, status });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchExecutions({ page: newPage });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-purple-950/80 text-purple-300 border border-purple-800/80 shadow-sm shadow-purple-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
            <span>RUNNING</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>COMPLETED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-rose-950/80 text-rose-300 border border-rose-800/80">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>FAILED</span>
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-800/80">
            <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>PAUSED</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-slate-900 text-slate-400 border border-slate-700">
            <Ban className="w-3.5 h-3.5 text-slate-400" />
            <span>CANCELLED</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/80">
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  const formatDuration = (ms) => {
    if (!ms || ms === 0) return '< 10ms';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString();
  };

  // Filter client side by search query
  const displayedExecutions = executions.filter((item) => {
    if (!searchWorkflow.trim()) return true;
    const name = item.workflowId?.name || item.workflowSnapshot?.name || '';
    return name.toLowerCase().includes(searchWorkflow.toLowerCase().trim());
  });

  return (
    <ProtectedRoute>
      <AppShell
        title="Agentic Executions"
        subtitle="Live monitoring, DAG step progression, and multi-agent audit timeline"
      >
        <div className="space-y-6">
          {/* Top Control Bar: Status Filters & Search */}
          <div className="glass-panel p-4 rounded-2xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: '', label: 'ALL RUNS' },
                { id: 'RUNNING', label: 'RUNNING' },
                { id: 'COMPLETED', label: 'COMPLETED' },
                { id: 'FAILED', label: 'FAILED' },
                { id: 'PAUSED', label: 'PAUSED' },
                { id: 'CANCELLED', label: 'CANCELLED' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 ${
                    filters.status === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right Controls: Search, Auto-refresh toggle & Manual Refresh */}
            <div className="flex items-center space-x-3 shrink-0">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by workflow..."
                  value={searchWorkflow}
                  onChange={(e) => setSearchWorkflow(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-44 sm:w-56 font-mono"
                />
              </div>

              {/* Live Socket Status / Fallback Polling Indicator */}
              <div
                title={isSocketConnected ? 'Connected to Socket.IO real-time stream' : 'Fallback polling mode'}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-mono border flex items-center space-x-1.5 transition-all ${
                  isSocketConnected
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/60 shadow-sm shadow-emerald-900/20'
                    : autoRefresh
                    ? 'bg-purple-950/40 text-purple-300 border-purple-800/60'
                    : 'bg-slate-900/60 text-slate-500 border-slate-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="hidden sm:inline font-bold">
                  {isSocketConnected ? 'Socket.IO Live' : autoRefresh ? 'Polling (4s)' : 'Paused'}
                </span>
              </div>

              {/* Manual Refresh */}
              <button
                onClick={() => fetchExecutions()}
                disabled={isLoading}
                title="Refresh executions now"
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Executions Table / List View */}
          {displayedExecutions.length === 0 ? (
            <div className="glass-panel p-16 rounded-2xl text-center border border-surface-border flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-950/40 border border-purple-800/50 flex items-center justify-center mb-4 text-purple-400">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Executions Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                {filters.status
                  ? `No execution runs matching status "${filters.status}".`
                  : 'You have not executed any visual workflow graphs yet. Open a workflow and click "Run Swarm" to kick off an agentic execution.'}
              </p>
              <Link
                href="/workflows"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono shadow-lg shadow-cyan-500/20 transition-all"
              >
                Browse Workflows
              </Link>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-surface-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-surface-border bg-slate-900/70 text-[11px] text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-semibold">Workflow & Run</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold">Step Nodes</th>
                      <th className="py-3.5 px-4 font-semibold">Duration</th>
                      <th className="py-3.5 px-4 font-semibold">LangGraph</th>
                      <th className="py-3.5 px-4 font-semibold">Started At</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/50 text-xs">
                    {displayedExecutions.map((exec) => {
                      const workflowName =
                        exec.workflowId?.name || exec.workflowSnapshot?.name || 'Untitled Workflow';
                      const nodeCount =
                        exec.workflowSnapshot?.nodes?.length ||
                        (exec.outputs ? Object.keys(exec.outputs).length : 0);

                      return (
                        <tr
                          key={exec._id}
                          onClick={() => router.push(`/executions/${exec._id}`)}
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          {/* Workflow & ID */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center space-x-1.5">
                                <span>{workflowName}</span>
                                {exec.workflowSnapshot?.version && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                    v{exec.workflowSnapshot.version}
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                                ID: {exec._id.substring(0, 12)}...
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">{getStatusBadge(exec.status)}</td>

                          {/* Steps */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1.5 text-slate-300">
                              <Layers className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{nodeCount} steps</span>
                              {exec.currentNode && exec.status === 'RUNNING' && (
                                <span className="text-[10px] text-purple-300 animate-pulse">
                                  ({exec.currentNode})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Duration */}
                          <td className="py-3.5 px-4 text-slate-300">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{formatDuration(exec.duration)}</span>
                            </div>
                          </td>

                          {/* LangGraph Substrate */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                exec.langGraph === 'available'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              {exec.langGraph === 'available' ? 'AVAILABLE' : 'STANDALONE'}
                            </span>
                          </td>

                          {/* Started At */}
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {formatDate(exec.startTime || exec.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/executions/${exec._id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-950/80 hover:text-cyan-300 hover:border-cyan-500/50 border border-slate-700 text-slate-300 text-xs font-mono transition-all"
                            >
                              <span>Timeline</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-surface-border bg-slate-900/60 flex items-center justify-between font-mono text-xs text-slate-400">
                  <span>
                    Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total runs)
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 rounded bg-slate-800 text-white font-bold">
                      {pagination.page}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
