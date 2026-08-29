import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../components/ProtectedRoute';
import AppShell from '../components/AppShell';
import MetricGrid from '../components/MetricGrid';
import { useAuthStore } from '../store/authStore';
import { useWorkflowStore } from '../store/workflowStore';
import api from '../services/api';
import {
  Sparkles,
  GitFork,
  Activity,
  Layers,
  Server,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Cpu,
  Plus,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { metrics, fetchDashboardMetrics, isLoading } = useWorkflowStore();
  const [healthData, setHealthData] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get('/health');
        setHealthData(res.data);
      } catch (err) {
        console.error('Failed to fetch system health:', err);
      }
    };
    fetchHealth();
    fetchDashboardMetrics();
  }, [fetchDashboardMetrics]);

  return (
    <ProtectedRoute>
      <AppShell
        title="Operations Overview"
        subtitle={`Welcome back, Operator ${user?.name || ''}. System running autonomously.`}
      >
        <div className="space-y-6">
          {/* Top Banner: Status & Quick Launch */}
          <div className="relative overflow-hidden glass-panel-glow p-6 rounded-2xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Agent Swarm Online &bull; Phase 2 Active</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Autonomous Operations Engine
                </h2>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Design complex multi-step automations, execute across third-party tools, and monitor live agent steps with automatic failure recovery.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => router.push('/workflows/builder')}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-500/25 flex items-center space-x-2 font-mono"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Builder</span>
                </button>
                <button
                  onClick={() => router.push('/workflows')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center space-x-2 font-mono"
                >
                  <GitFork className="w-4 h-4 text-cyan-400" />
                  <span>Workflows Directory</span>
                </button>
              </div>
            </div>
          </div>

          {/* Workflow Status MetricGrid */}
          <MetricGrid metrics={metrics} isLoading={isLoading} />

          {/* Recent Workflows Section */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <GitFork className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                  Recent Workflows
                </h3>
              </div>
              <button
                onClick={() => router.push('/workflows')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {metrics?.recentWorkflows?.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {metrics.recentWorkflows.map((wf) => (
                  <div
                    key={wf._id}
                    onClick={() => router.push(`/workflows/${wf._id}`)}
                    className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-3 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/40">
                        <GitFork className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {wf.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-500">
                          v{wf.version || 1} &bull; {wf.nodes?.length || 0} Nodes &bull; Updated {new Date(wf.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-900 border border-slate-700 text-slate-300">
                        {wf.status || 'draft'}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 font-mono">
                No recent workflows found. Click "Workflows Directory" to create your first automation.
              </div>
            )}
          </div>

          {/* System & Architecture Quick Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/workflows/builder"
              onClick={(e) => {
                e.preventDefault();
                router.push('/workflows/builder');
              }}
              className="glass-panel p-6 rounded-xl border border-slate-800 hover:border-cyan-500/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
                AI Workflow Builder
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Generate complete visual graphs directly from natural language prompts.
              </p>
            </a>

            <a
              href="/executions"
              onClick={(e) => {
                e.preventDefault();
                router.push('/executions');
              }}
              className="glass-panel p-6 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                Live Executions
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Observe live multi-agent execution timelines and step-by-step audit logs.
              </p>
            </a>

            <a
              href="/integrations"
              onClick={(e) => {
                e.preventDefault();
                router.push('/integrations');
              }}
              className="glass-panel p-6 rounded-xl border border-slate-800 hover:border-purple-500/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
                Third-Party Integrations
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Connect Gmail, Slack, Discord, and Google Sheets with encrypted OAuth.
              </p>
            </a>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
