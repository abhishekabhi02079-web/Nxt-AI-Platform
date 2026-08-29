import { useState, useEffect } from 'react';
import Link from 'next/router';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import NotificationDrawer from './NotificationDrawer';
import api from '../../services/api';
import {
  LayoutDashboard,
  GitFork,
  Sparkles,
  Activity,
  Layers,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Server,
  User,
  Shield,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workflows', href: '/workflows', icon: GitFork },
  { name: 'AI Builder', href: '/workflows/builder', icon: Sparkles, badge: 'AI' },
  { name: 'Executions', href: '/executions', icon: Activity },
  { name: 'Integrations', href: '/integrations', icon: Layers },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function AppShell({ children, title, subtitle }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { unreadCount, toggleDrawer, fetchNotifications, initNotificationSocket } = useNotificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [serverHealth, setServerHealth] = useState({ connected: false, mode: 'checking' });

  // Fetch backend status and initialize real-time notifications
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        if (isMounted) {
          setServerHealth({
            connected: true,
            mode: res.data?.database?.mode || 'UNKNOWN',
          });
        }
      } catch (err) {
        if (isMounted) {
          setServerHealth({ connected: false, mode: 'OFFLINE' });
        }
      }
    };

    checkHealth();
    fetchNotifications();
    const unsubSocket = initNotificationSocket();

    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      if (typeof unsubSocket === 'function') unsubSocket();
    };
  }, [fetchNotifications, initNotificationSocket]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 h-16 border-b border-surface-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              router.push('/dashboard');
            }}
            className="flex items-center space-x-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                Agentflow<span className="text-cyan-400 font-mono">_AI</span>
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Operations Console</span>
            </div>
          </a>
        </div>

        {/* Center: System Status Indicator */}
        <div className="hidden lg:flex items-center space-x-3 text-xs bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                serverHealth.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-400 font-mono text-[11px]">
              Engine: <strong className="text-slate-200">{serverHealth.connected ? 'Active' : 'Offline'}</strong>
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1 text-slate-400 font-mono text-[11px]">
            <Server className="w-3 h-3 text-cyan-400" />
            <span>DB:</span>
            <span
              className={`font-semibold ${
                serverHealth.mode === 'IN-MEMORY'
                  ? 'text-amber-400'
                  : serverHealth.mode === 'REAL'
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {serverHealth.mode}
            </span>
          </div>
        </div>

        {/* Right: Notifications & User Profile Menu */}
        <div className="flex items-center space-x-3">
          {/* Notifications Button */}
          <button
            title="Operator Notifications"
            onClick={toggleDrawer}
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] text-[10px] font-bold font-mono rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-md shadow-cyan-500/40 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2.5 p-1.5 pl-2 pr-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                {user?.name ? user.name[0] : 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-none">{user?.name || 'Operator'}</span>
                <span className="text-[10px] text-cyan-400 font-mono uppercase leading-tight mt-0.5">
                  {user?.role || 'operator'}
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-2 text-sm divide-y divide-slate-800">
                  <div className="p-2.5">
                    <p className="text-xs text-slate-400 font-mono">Signed in as</p>
                    <p className="font-semibold text-white truncate text-xs">{user?.email}</p>
                    <div className="mt-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                      <Shield className="w-3 h-3" />
                      <span className="uppercase">{user?.role || 'operator'}</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        router.push('/settings');
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Account Settings</span>
                    </button>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-surface/95 md:bg-surface/50 backdrop-blur-md border-r border-surface-border flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0 pt-16 md:pt-0' : '-translate-x-full'
          }`}
        >
          {/* Navigation Links */}
          <div className="p-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
              Automation Core
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href || (item.href !== '/dashboard' && router.pathname.startsWith(item.href));

              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setSidebarOpen(false);
                    router.push(item.href);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-cyan-300 border-l-2 border-cyan-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {item.badge}
                    </span>
                  )}
                </a>
              );
            })}
          </div>

          {/* Sidebar Footer: Agent Chain Status */}
          <div className="p-4 border-t border-surface-border/60 bg-slate-950/40">
            <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold mb-2">
              Agent Swarm Ready
            </div>
            <div className="grid grid-cols-5 gap-1 text-[9px] font-mono text-center">
              <div className="p-1 rounded bg-sky-950/60 text-sky-400 border border-sky-800/40" title="Planner Agent">
                PLN
              </div>
              <div className="p-1 rounded bg-purple-950/60 text-purple-400 border border-purple-800/40" title="Execution Agent">
                EXE
              </div>
              <div className="p-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" title="Validation Agent">
                VAL
              </div>
              <div className="p-1 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40" title="Recovery Agent">
                REC
              </div>
              <div className="p-1 rounded bg-pink-950/60 text-pink-400 border border-pink-800/40" title="Monitoring Agent">
                MON
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop for sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-background bg-grid-pattern relative">
          {(title || subtitle) && (
            <div className="border-b border-surface-border px-6 py-4 bg-surface/30 backdrop-blur-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                {title && <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>}
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
            </div>
          )}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Notifications Slide-Over Drawer */}
      <NotificationDrawer />
    </div>
  );
}
