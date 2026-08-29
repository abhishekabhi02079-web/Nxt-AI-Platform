import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useNotificationStore } from '../../store/notificationStore';
import {
  Bell,
  X,
  CheckCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight,
  Trash2,
  Clock,
  Zap,
} from 'lucide-react';

export default function NotificationDrawer() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isDrawerOpen,
    setDrawerOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  const [filter, setFilter] = useState('ALL');

  if (!isDrawerOpen) return null;

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'UNREAD') return !notif.isRead;
    if (filter === 'EXECUTIONS') {
      return (
        notif.type === 'execution_success' ||
        notif.type === 'execution_failed' ||
        notif.type === 'recovery_escalated'
      );
    }
    return true;
  });

  const getTypeStyles = (type) => {
    switch (type) {
      case 'execution_success':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          bg: 'bg-emerald-950/40 border-emerald-800/50',
          badge: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        };
      case 'execution_failed':
        return {
          icon: <XCircle className="w-4 h-4 text-rose-400" />,
          bg: 'bg-rose-950/40 border-rose-800/50',
          badge: 'bg-rose-950 text-rose-300 border-rose-700',
        };
      case 'recovery_escalated':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          bg: 'bg-amber-950/40 border-amber-800/50',
          badge: 'bg-amber-950 text-amber-300 border-amber-700',
        };
      case 'warning':
        return {
          icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
          bg: 'bg-amber-950/40 border-amber-800/50',
          badge: 'bg-amber-950 text-amber-300 border-amber-700',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-4 h-4 text-cyan-400" />,
          bg: 'bg-cyan-950/40 border-cyan-800/50',
          badge: 'bg-cyan-950 text-cyan-300 border-cyan-700',
        };
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setDrawerOpen(false)}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-surface-border flex flex-col shadow-2xl animate-slideLeft">
          {/* Drawer Header */}
          <div className="p-5 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm font-mono flex items-center space-x-2">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.2 rounded-full text-[10px] bg-cyan-500 text-slate-950 font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400 font-mono">Live event stream &amp; alerts</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 text-xs font-mono flex items-center space-x-1 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="text-[11px] hidden sm:inline">Mark read</span>
                </button>
              )}
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="p-3 border-b border-surface-border bg-slate-900/60 flex items-center space-x-1 overflow-x-auto scrollbar-none font-mono text-xs">
            {[
              { id: 'ALL', label: 'ALL' },
              { id: 'UNREAD', label: `UNREAD (${unreadCount})` },
              { id: 'EXECUTIONS', label: 'EXECUTIONS' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                  filter === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                <Bell className="w-10 h-10 text-slate-700 mb-2" />
                <h3 className="text-sm font-bold text-slate-300 font-mono">No Notifications</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {filter === 'UNREAD'
                    ? 'You have caught up with all alerts!'
                    : 'Workflow milestones and agent recovery alerts will stream here live.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const styles = getTypeStyles(notif.type);

                return (
                  <div
                    key={notif._id}
                    className={`p-4 rounded-2xl border transition-all relative ${
                      notif.isRead
                        ? 'bg-slate-900/40 border-slate-800/80 opacity-80'
                        : `${styles.bg} shadow-md shadow-slate-950/40 ring-1 ring-cyan-500/20`
                    }`}
                  >
                    {/* Unread Indicator Dot */}
                    {!notif.isRead && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}

                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 shrink-0">{styles.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between pr-4">
                          <h4 className="text-xs font-bold text-white font-mono truncate">
                            {notif.title}
                          </h4>
                        </div>

                        <p className="text-xs text-slate-300 mt-1 font-mono leading-relaxed">
                          {notif.message}
                        </p>

                        {/* Footer & Actions */}
                        <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span className="flex items-center space-x-1 text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(notif.createdAt)}</span>
                          </span>

                          <div className="flex items-center space-x-2">
                            {notif.executionId && (
                              <button
                                onClick={() => {
                                  setDrawerOpen(false);
                                  router.push(`/executions/${notif.executionId}`);
                                }}
                                className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1"
                              >
                                <span>Timeline</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}

                            {!notif.isRead && (
                              <button
                                onClick={() => markAsRead(notif._id)}
                                className="text-slate-400 hover:text-white"
                              >
                                Mark read
                              </button>
                            )}

                            <button
                              onClick={() => deleteNotification(notif._id)}
                              title="Delete notification"
                              className="text-slate-600 hover:text-rose-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
