import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/authStore';
import {
  Zap,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Bot,
  Activity,
  CheckCircle2,
  Lock,
  GitBranch,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();

  const handleOpenConsole = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 selection:bg-cyan-500 selection:text-white flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-surface-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              Agentflow<span className="text-cyan-400 font-mono">_AI</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {isHydrated && isAuthenticated ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20"
              >
                <span>Open Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white transition-all shadow-lg shadow-cyan-500/20"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 lg:py-24 flex flex-col items-center text-center">
        {/* Glow Tag */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-8 animate-pulse-glow">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Generation Autonomous Operations Platform</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl leading-tight sm:leading-none">
          Transform Prompts Into <br />
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            Multi-Agent Workflows
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl font-normal leading-relaxed">
          Describe an operational workflow in plain English. Watch our cooperative agent swarm plan, execute, validate, recover, and stream live events in real-time.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleOpenConsole}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2"
          >
            <span>Launch Operator Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/register')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center justify-center space-x-2"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Create Free Account</span>
          </button>
        </div>

        {/* Agent Chain Showcase Cards */}
        <div className="mt-20 w-full">
          <div className="text-xs font-mono uppercase text-slate-500 tracking-wider mb-6">
            Autonomous Cooperating Agent Architecture
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-left">
            {/* Planner */}
            <div className="glass-panel p-5 rounded-xl border-t-2 border-t-sky-400 hover:border-sky-400 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-800/60 flex items-center justify-center mb-3">
                <GitBranch className="w-4 h-4 text-sky-400" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors">Planner Agent</h3>
              <p className="text-xs text-slate-400 mt-1">Computes execution graphs and scores plan confidence.</p>
            </div>

            {/* Executor */}
            <div className="glass-panel p-5 rounded-xl border-t-2 border-t-purple-400 hover:border-purple-400 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">Execution Agent</h3>
              <p className="text-xs text-slate-400 mt-1">Runs tasks against third-party OAuth tools & AI APIs.</p>
            </div>

            {/* Validator */}
            <div className="glass-panel p-5 rounded-xl border-t-2 border-t-emerald-400 hover:border-emerald-400 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">Validation Agent</h3>
              <p className="text-xs text-slate-400 mt-1">Enforces schema integrity and verifies required fields.</p>
            </div>

            {/* Recovery */}
            <div className="glass-panel p-5 rounded-xl border-t-2 border-t-amber-400 hover:border-amber-400 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center mb-3">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">Recovery Agent</h3>
              <p className="text-xs text-slate-400 mt-1">Auto-classifies errors and schedules backoff retries.</p>
            </div>

            {/* Monitoring */}
            <div className="glass-panel p-5 rounded-xl border-t-2 border-t-pink-400 hover:border-pink-400 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-pink-950/80 border border-pink-800/60 flex items-center justify-center mb-3">
                <Activity className="w-4 h-4 text-pink-400" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-pink-300 transition-colors">Monitoring Agent</h3>
              <p className="text-xs text-slate-400 mt-1">Broadcasts real-time timeline events via Socket.IO.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border/60 py-6 text-center text-xs text-slate-500 font-mono">
        Agentflow_AI &bull; Autonomous AI Operations Engine &bull; Zero External Service Required
      </footer>
    </div>
  );
}
