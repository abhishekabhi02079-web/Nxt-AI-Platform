import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import AppShell from '../../components/AppShell';
import { useExecutionStore } from '../../store/executionStore';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Layers,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Radio,
  FileCode,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Terminal,
  Zap,
} from 'lucide-react';

export default function ExecutionDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const {
    activeExecution,
    timelineLogs,
    isSocketConnected,
    isLoading,
    isActionLoading,
    fetchExecutionById,
    fetchTimelineLogs,
    subscribeToLiveExecution,
    pauseExecution,
    resumeExecution,
    cancelExecution,
    triggerExecution,
  } = useExecutionStore();

  const [agentFilter, setAgentFilter] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeTab, setActiveTab] = useState('outputs');
  const [copied, setCopied] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});

  const logsEndRef = useRef(null);

  // Initial load
  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchExecutionById(id);
      fetchTimelineLogs(id);
    }
  }, [id, fetchExecutionById, fetchTimelineLogs]);

  // Real-Time Socket.IO Live Subscription (Primary Stream)
  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    const unsubscribe = subscribeToLiveExecution(id);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [id, subscribeToLiveExecution]);

  // Resilient Fallback Polling (ONLY active if socket is disconnected)
  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    // If Socket.IO is connected, polling is disabled
    if (isSocketConnected) return;

    const shouldPoll =
      !activeExecution ||
      activeExecution.status === 'RUNNING' ||
      activeExecution.status === 'PENDING';

    if (!shouldPoll) return;

    const interval = setInterval(() => {
      fetchExecutionById(id);
      fetchTimelineLogs(id, agentFilter ? { agent: agentFilter } : {});
    }, 2500);

    return () => clearInterval(interval);
  }, [id, isSocketConnected, activeExecution?.status, agentFilter, fetchExecutionById, fetchTimelineLogs]);

  // Copy helper
  const handleCopyJSON = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleLogExpand = (logId) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  // Re-run workflow execution
  const handleRerun = async () => {
    if (!activeExecution?.workflowId?._id && !activeExecution?.workflowSnapshot?._id) return;
    const workflowId =
      activeExecution.workflowId?._id || activeExecution.workflowSnapshot?._id;
    try {
      const newExec = await triggerExecution(workflowId, activeExecution.inputs || {});
      router.push(`/executions/${newExec._id}`);
    } catch (err) {
      console.error('Re-run failed:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-950/90 text-purple-300 border border-purple-600/80 shadow-md shadow-purple-900/40">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>RUNNING</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/80 shadow-md shadow-emerald-900/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>COMPLETED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-600/80 shadow-md shadow-rose-900/20">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>FAILED</span>
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-600/80 shadow-md shadow-amber-900/20">
            <Pause className="w-4 h-4 text-amber-400" />
            <span>PAUSED</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-900 text-slate-400 border border-slate-700">
            <Ban className="w-4 h-4 text-slate-400" />
            <span>CANCELLED</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-600/80">
            <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  const getAgentBadge = (agent) => {
    switch (agent) {
      case 'planner':
        return {
          label: 'PLANNER AGENT',
          bg: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
          icon: <Layers className="w-3.5 h-3.5 text-blue-400" />,
        };
      case 'execution':
        return {
          label: 'EXECUTION AGENT',
          bg: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
          icon: <Cpu className="w-3.5 h-3.5 text-purple-400" />,
        };
      case 'validation':
        return {
          label: 'VALIDATION AGENT',
          bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'recovery':
        return {
          label: 'RECOVERY AGENT',
          bg: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
        };
      case 'monitoring':
      default:
        return {
          label: 'MONITORING AGENT',
          bg: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
          icon: <Radio className="w-3.5 h-3.5 text-amber-400" />,
        };
    }
  };

  const formatDuration = (ms) => {
    if (!ms || ms === 0) return '< 10ms';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  };

  // Filter logs by agent
  const displayedLogs = timelineLogs.filter((log) => {
    if (!agentFilter) return true;
    return log.agent === agentFilter.toLowerCase();
  });

  if (isLoading && !activeExecution) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
            <div className="flex items-center space-x-3 text-cyan-400 font-mono text-sm">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Connecting to Swarm Execution Stream...</span>
            </div>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!activeExecution) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-12 h-12 text-rose-400 mb-3" />
            <h2 className="text-lg font-bold text-white mb-1">Execution Not Found</h2>
            <p className="text-xs text-slate-400 mb-6">The requested execution run does not exist.</p>
            <button
              onClick={() => router.push('/executions')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono border border-slate-700"
            >
              Return to Executions
            </button>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  const nodes = activeExecution.workflowSnapshot?.nodes || [];
  const outputs = activeExecution.outputs || {};
  const workflowName =
    activeExecution.workflowId?.name || activeExecution.workflowSnapshot?.name || 'Workflow Run';
  const workflowId =
    activeExecution.workflowId?._id || activeExecution.workflowSnapshot?._id;

  return (
    <ProtectedRoute>
      <AppShell
        title="Execution Timeline"
        subtitle={`Audit run for ${workflowName}`}
      >
        <div className="space-y-6">
          {/* Top Header Card */}
          <div className="glass-panel p-5 rounded-2xl border border-surface-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left Info: Back Button, Title, ID, Badges */}
            <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
              <button
                onClick={() => router.push('/executions')}
                title="Back to all executions"
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-lg sm:text-xl font-bold text-white font-mono truncate">
                    {workflowName}
                  </h1>
                  {getStatusBadge(activeExecution.status)}
                  {activeExecution.workflowSnapshot?.version && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                      v{activeExecution.workflowSnapshot.version}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
                  <span>ID: <span className="text-slate-200">{activeExecution._id}</span></span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Duration: <strong className="text-slate-200">{formatDuration(activeExecution.duration)}</strong></span>
                  </span>
                  <span>•</span>
                  <span>
                    LangGraph Substrate:{' '}
                    <strong
                      className={
                        activeExecution.langGraph === 'available'
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                      }
                    >
                      {activeExecution.langGraph?.toUpperCase() || 'NOT-INSTALLED'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span
                      className={
                        isSocketConnected
                          ? 'text-emerald-300 font-bold tracking-wide'
                          : 'text-amber-400 font-bold'
                      }
                    >
                      {isSocketConnected ? 'LIVE SOCKET STREAM' : 'POLLING FALLBACK'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Action Controls: Pause / Resume / Cancel / Re-run */}
            <div className="flex items-center space-x-2.5 shrink-0 self-end lg:self-auto">
              {/* Manual Refresh */}
              <button
                onClick={() => {
                  fetchExecutionById(id);
                  fetchTimelineLogs(id);
                }}
                disabled={isLoading}
                title="Refresh logs"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>

              {/* Pause Button */}
              {(activeExecution.status === 'RUNNING' || activeExecution.status === 'PENDING') && (
                <button
                  onClick={() => pauseExecution(activeExecution._id)}
                  disabled={isActionLoading}
                  className="px-3.5 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-300 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-amber-900/20"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              )}

              {/* Resume Button */}
              {activeExecution.status === 'PAUSED' && (
                <button
                  onClick={() => resumeExecution(activeExecution._id)}
                  disabled={isActionLoading}
                  className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-900/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </button>
              )}

              {/* Cancel Button */}
              {(activeExecution.status === 'RUNNING' ||
                activeExecution.status === 'PENDING' ||
                activeExecution.status === 'PAUSED') && (
                <button
                  onClick={() => cancelExecution(activeExecution._id)}
                  disabled={isActionLoading}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-rose-900/20"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}

              {/* Re-run Button */}
              {['COMPLETED', 'FAILED', 'CANCELLED'].includes(activeExecution.status) && (
                <button
                  onClick={handleRerun}
                  disabled={isActionLoading}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-purple-500/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-run Swarm</span>
                </button>
              )}

              {/* Edit Workflow Link */}
              {workflowId && (
                <Link
                  href={`/workflows/${workflowId}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono flex items-center space-x-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open Editor</span>
                </Link>
              )}
            </div>
          </div>

          {/* 2-Column Split View: Graph/Inspector Left, Timeline Logs Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (5 cols): Step Progression Graph & Payload Inspector */}
            <div className="lg:col-span-5 space-y-6">
              {/* Step Sequence Overview */}
              <div className="glass-panel p-5 rounded-2xl border border-surface-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Workflow Step Progression</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {nodes.length} total steps
                  </span>
                </div>

                {/* Step Node Cards */}
                <div className="space-y-2.5">
                  {nodes.map((node, index) => {
                    const isCurrent = activeExecution.currentNode === node.id && activeExecution.status === 'RUNNING';
                    const hasOutput = outputs[node.id] !== undefined;
                    const isSelected = selectedNodeId === node.id;
                    const nodeType = node.data?.nodeType || node.type || 'action';

                    let stepStatus = 'PENDING';
                    if (hasOutput) stepStatus = 'COMPLETED';
                    if (isCurrent) stepStatus = 'RUNNING';
                    if (activeExecution.status === 'FAILED' && !hasOutput && !isCurrent) stepStatus = 'SKIPPED';

                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                            : isCurrent
                            ? 'bg-purple-950/40 border-purple-500/80 shadow-md shadow-purple-500/20'
                            : hasOutput
                            ? 'bg-slate-900/70 border-emerald-800/40 hover:border-emerald-700'
                            : 'bg-slate-900/40 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          {/* Step Index Circle */}
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono shrink-0 ${
                              hasOutput
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                                : isCurrent
                                ? 'bg-purple-900 text-purple-200 border border-purple-500 animate-pulse'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {hasOutput ? <Check className="w-3.5 h-3.5" /> : index + 1}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate font-mono">
                              {node.data?.label || node.id}
                            </h4>
                            <div className="flex items-center space-x-2 mt-0.5 text-[10px] font-mono text-slate-400">
                              <span className="uppercase text-cyan-300">{nodeType}</span>
                              <span>•</span>
                              <span>ID: {node.id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Node Status Badge */}
                        <div className="shrink-0">
                          {isCurrent ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 animate-pulse">
                              RUNNING
                            </span>
                          ) : hasOutput ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                              DONE
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-500 border border-slate-800">
                              WAITING
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* JSON Payload Inspector */}
              <div className="glass-panel p-5 rounded-2xl border border-surface-border">
                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center space-x-1 font-mono text-xs">
                    {[
                      { id: 'outputs', label: 'Outputs' },
                      { id: 'inputs', label: 'Inputs' },
                      { id: 'snapshot', label: 'Snapshot' },
                      ...(activeExecution.error ? [{ id: 'error', label: 'Error' }] : []),
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          activeTab === tab.id
                            ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => {
                      let dataToCopy = activeExecution.outputs;
                      if (activeTab === 'inputs') dataToCopy = activeExecution.inputs;
                      if (activeTab === 'snapshot') dataToCopy = activeExecution.workflowSnapshot;
                      if (activeTab === 'error') dataToCopy = activeExecution.error;
                      handleCopyJSON(dataToCopy);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center space-x-1 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* JSON Viewer */}
                <div className="max-h-80 overflow-y-auto rounded-xl bg-slate-950 p-3.5 border border-slate-800/80 font-mono text-xs text-slate-300">
                  <pre className="whitespace-pre-wrap word-break">
                    {activeTab === 'outputs' &&
                      JSON.stringify(
                        selectedNodeId && outputs[selectedNodeId]
                          ? { [selectedNodeId]: outputs[selectedNodeId] }
                          : outputs,
                        null,
                        2
                      )}
                    {activeTab === 'inputs' && JSON.stringify(activeExecution.inputs || {}, null, 2)}
                    {activeTab === 'snapshot' && JSON.stringify(activeExecution.workflowSnapshot || {}, null, 2)}
                    {activeTab === 'error' && JSON.stringify(activeExecution.error || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Right Column (7 cols): Multi-Agent Timeline Telemetry Stream */}
            <div className="lg:col-span-7 space-y-4">
              {/* Timeline Header & Filter Pills */}
              <div className="glass-panel p-4 rounded-2xl border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white font-mono">Agent Telemetry Logs</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {displayedLogs.length} events
                  </span>
                </div>

                {/* Agent Filter Tabs */}
                <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none font-mono text-xs">
                  {[
                    { id: '', label: 'ALL' },
                    { id: 'planner', label: 'PLANNER' },
                    { id: 'execution', label: 'EXEC' },
                    { id: 'validation', label: 'VAL' },
                    { id: 'recovery', label: 'RECOVERY' },
                    { id: 'monitoring', label: 'MONITOR' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAgentFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                        agentFilter === tab.id
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-700/80'
                          : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Events List */}
              {displayedLogs.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center border border-surface-border flex flex-col items-center justify-center">
                  <Clock className="w-10 h-10 text-slate-600 mb-3 animate-spin" />
                  <p className="text-xs font-mono text-slate-400">
                    {agentFilter ? `No logs found for agent [${agentFilter}]` : 'Awaiting agent events...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedLogs.map((log) => {
                    const badge = getAgentBadge(log.agent);
                    const isExpanded = expandedLogs[log._id];
                    const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

                    let borderHighlight = 'border-slate-800/80';
                    if (log.level === 'error') borderHighlight = 'border-rose-700/60 bg-rose-950/20';
                    if (log.level === 'warning') borderHighlight = 'border-amber-700/60 bg-amber-950/20';
                    if (log.level === 'success') borderHighlight = 'border-emerald-700/60 bg-emerald-950/20';

                    return (
                      <div
                        key={log._id}
                        className={`p-4 rounded-2xl border transition-all ${borderHighlight} glass-panel font-mono text-xs`}
                      >
                        {/* Event Header */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            {/* Agent Badge */}
                            <span
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${badge.bg}`}
                            >
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>

                            {/* Node Target Tag if applicable */}
                            {log.nodeId && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 truncate">
                                Node: {log.nodeId}
                              </span>
                            )}
                          </div>

                          {/* Timestamp */}
                          <span className="text-[11px] text-slate-500 shrink-0">
                            {formatTimestamp(log.createdAt)}
                          </span>
                        </div>

                        {/* Event Message */}
                        <p
                          className={`text-xs leading-relaxed font-mono ${
                            log.level === 'error'
                              ? 'text-rose-300 font-semibold'
                              : log.level === 'warning'
                              ? 'text-amber-300'
                              : log.level === 'success'
                              ? 'text-emerald-300'
                              : 'text-slate-200'
                          }`}
                        >
                          {log.message}
                        </p>

                        {/* Metadata Accordion Toggle */}
                        {hasMetadata && (
                          <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                            <button
                              onClick={() => toggleLogExpand(log._id)}
                              className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center space-x-1 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                              <span>{isExpanded ? 'Hide Payload Metadata' : 'View Payload Metadata'}</span>
                            </button>

                            {isExpanded && (
                              <div className="mt-2 rounded-xl bg-slate-950/80 p-3 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto">
                                <pre className="whitespace-pre-wrap break-all">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
