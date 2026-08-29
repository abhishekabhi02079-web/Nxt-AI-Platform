import ProtectedRoute from '../components/ProtectedRoute';
import AppShell from '../components/AppShell';
import { useAuthStore } from '../store/authStore';
import { Settings, User, Shield, Key, Lock, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <ProtectedRoute>
      <AppShell
        title="Settings & Security"
        subtitle="Manage operator account, security controls, and encryption health"
      >
        <div className="max-w-4xl space-y-6">
          {/* Profile Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Operator Profile</h3>
                <p className="text-xs text-slate-400">Your authenticated identity credentials</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Operator Name</label>
                <div className="font-semibold text-white text-sm">{user?.name || 'Operator'}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Email Address</label>
                <div className="font-semibold text-white text-sm">{user?.email}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Assigned Role</label>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 text-xs font-mono uppercase border border-cyan-800">
                  <Shield className="w-3 h-3" />
                  <span>{user?.role || 'operator'}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Password Hash Standard</label>
                <div className="text-xs text-emerald-400 font-mono flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Bcrypt (Cost Factor 12)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Health Check Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Security &amp; Encryption Health</h3>
                <p className="text-xs text-slate-400">Application-level credential protection and rate limit shields</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-semibold text-white">JWT Session Signatures</div>
                    <div className="text-[11px] text-slate-400 font-mono">HMAC SHA-256 with JWT_SECRET</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ACTIVE
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="text-xs font-semibold text-white">Credential Encryption at Rest</div>
                    <div className="text-[11px] text-slate-400 font-mono">AES-256-CBC via CREDENTIAL_ENCRYPTION_KEY</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
