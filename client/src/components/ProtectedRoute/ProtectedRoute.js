import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../store/authStore';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, requiredRole }) {
  const router = useRouter();
  const { isAuthenticated, isHydrated, user, fetchMe } = useAuthStore();

  useEffect(() => {
    if (isHydrated) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else {
        // Silently refresh profile
        fetchMe();
      }
    }
  }, [isAuthenticated, isHydrated, router]);

  // Loading/Hydration State
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-slate-400">
        <div className="flex items-center space-x-3 text-primary-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm font-medium tracking-wide">Initializing Operator Session...</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-slate-400">
        <div className="flex items-center space-x-3 text-cyan-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Redirecting to Operator Login...</span>
        </div>
      </div>
    );
  }

  // Role check if required
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-slate-300 p-6">
        <div className="glass-panel p-8 rounded-xl max-w-md w-full text-center border border-red-500/30">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-400 mb-6">
            This module requires <span className="text-cyan-400 font-semibold uppercase">{requiredRole}</span> permissions. Your current role is <span className="text-amber-400 uppercase font-semibold">{user?.role || 'unknown'}</span>.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors border border-slate-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
