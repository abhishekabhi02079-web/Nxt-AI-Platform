import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../components/ProtectedRoute';
import AppShell from '../components/AppShell';
import api from '../services/api';
import {
  Layers,
  Mail,
  MessageSquare,
  Bot,
  FileSpreadsheet,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Key,
  Trash2,
  Sparkles,
  Info,
  X,
  Check,
  Cpu,
  Radio,
} from 'lucide-react';

const PROVIDER_METADATA = {
  gmail: {
    name: 'Gmail',
    icon: Mail,
    color: 'text-red-400',
    borderColor: 'border-red-500/30',
    bgBadge: 'bg-red-950/40 border-red-800/40 text-red-300',
    desc: 'Send, receive, and query email threads with AES-256 encrypted OAuth 2.0 access & refresh tokens.',
    authType: 'OAuth 2.0',
    scopes: ['gmail.send', 'gmail.readonly', 'userinfo.email'],
    envVars: 'GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET',
  },
  slack: {
    name: 'Slack',
    icon: MessageSquare,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgBadge: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300',
    desc: 'Post channel notifications, listen to mention events, and dispatch alerts to operational war rooms.',
    authType: 'OAuth 2.0 (v2)',
    scopes: ['chat:write', 'channels:read', 'incoming-webhook'],
    envVars: 'SLACK_CLIENT_ID & SLACK_CLIENT_SECRET',
  },
  discord: {
    name: 'Discord',
    icon: Bot,
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    bgBadge: 'bg-indigo-950/40 border-indigo-800/40 text-indigo-300',
    desc: 'Deliver real-time incident webhook alerts and interactive bot messages into designated channels.',
    authType: 'Bot Token / OAuth',
    scopes: ['bot', 'webhook.incoming'],
    envVars: 'DISCORD_BOT_TOKEN / DISCORD_CLIENT_ID',
  },
  'google-sheets': {
    name: 'Google Sheets',
    icon: FileSpreadsheet,
    color: 'text-green-400',
    borderColor: 'border-green-500/30',
    bgBadge: 'bg-green-950/40 border-green-800/40 text-green-300',
    desc: 'Append telemetry rows, record audit metrics, and query operational spreadsheets automatically.',
    authType: 'OAuth 2.0',
    scopes: ['spreadsheets', 'drive.file'],
    envVars: 'GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET',
  },
  openrouter: {
    name: 'OpenRouter AI',
    icon: Sparkles,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgBadge: 'bg-purple-950/40 border-purple-800/40 text-purple-300',
    desc: 'Unified LLM gateway routing agent prompts across Claude 3.5, GPT-4o, and Llama 3 models.',
    authType: 'API Key',
    scopes: ['chat.completions'],
    envVars: 'OPENROUTER_API_KEY',
  },
  gemini: {
    name: 'Google Gemini',
    icon: Cpu,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgBadge: 'bg-blue-950/40 border-blue-800/40 text-blue-300',
    desc: 'Direct multimodal reasoning, long-context workflow generation, and agent plan optimization.',
    authType: 'API Key',
    scopes: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    envVars: 'GEMINI_API_KEY',
  },
};

export default function IntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState([]);
  const [healthStatus, setHealthStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [notification, setNotification] = useState(null);

  // Modals
  const [errorModal, setErrorModal] = useState({
    open: false,
    title: '',
    message: '',
    provider: '',
    requiredEnv: '',
  });

  const [manualModal, setManualModal] = useState({
    open: false,
    provider: '',
    apiKey: '',
    botToken: '',
    accountIdentifier: '',
  });

  // Fetch real integration connections and health on mount
  const fetchIntegrationsData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statusRes] = await Promise.all([
        api.get('/integrations').catch(() => ({ data: { data: { integrations: [] } } })),
        api.get('/integrations/status').catch(() => ({ data: { data: { status: {} } } })),
      ]);

      const items = listRes.data?.data?.integrations || [];
      const status = statusRes.data?.data?.status || {};

      setIntegrations(items);
      setHealthStatus(status);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrationsData();
  }, [fetchIntegrationsData]);

  // Handle URL query feedback (e.g. ?connected=gmail or ?oauth_error=...)
  useEffect(() => {
    if (!router.isReady) return;
    const { connected, oauth_error } = router.query;

    if (connected) {
      setNotification({
        type: 'success',
        message: `Successfully connected ${String(connected).toUpperCase()}! Credentials encrypted at rest with AES-256-GCM.`,
      });
      fetchIntegrationsData();
      router.replace('/integrations', undefined, { shallow: true });
    } else if (oauth_error) {
      setNotification({
        type: 'error',
        message: `OAuth authorization failed: ${decodeURIComponent(String(oauth_error))}`,
      });
      router.replace('/integrations', undefined, { shallow: true });
    }
  }, [router, router.isReady, fetchIntegrationsData]);

  // Handle OAuth Connection click
  const handleConnectOAuth = async (provider) => {
    setActionLoading((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await api.get(`/integrations/oauth/${provider}/start`);
      const authUrl = res.data?.data?.authUrl;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error('No redirect URL returned by server');
      }
    } catch (err) {
      const meta = PROVIDER_METADATA[provider] || {};
      const errMsg = err.response?.data?.message || err.message || 'OAuth initiation failed';
      const requiredEnv = err.response?.data?.requiredEnv || meta.envVars || 'OAuth Client Credentials';

      // Surface clean dialog explaining OAuth configuration requirement
      setErrorModal({
        open: true,
        title: `${meta.name || provider.toUpperCase()} OAuth Setup Required`,
        message: errMsg,
        provider,
        requiredEnv,
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  // Handle Simulated Development Connection (Zero external credentials required)
  const handleSimulatedConnect = async (provider) => {
    setActionLoading((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await api.post('/integrations', {
        provider,
        accountIdentifier: `operator@agentflow.ai (Dev Mode)`,
        accessToken: `simulated_oauth_token_${Date.now()}`,
        botToken: `simulated_bot_token_${Date.now()}`,
      });

      setErrorModal({ open: false, title: '', message: '', provider: '', requiredEnv: '' });
      setNotification({
        type: 'success',
        message: `Connected ${provider.toUpperCase()} in development mode! AES-256 encrypted in MongoDB.`,
      });
      await fetchIntegrationsData();
    } catch (err) {
      console.error('Simulated connect failed:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  // Handle Manual Credential Save (API Keys / Bot Tokens)
  const handleSaveManual = async (e) => {
    e.preventDefault();
    const { provider, apiKey, botToken, accountIdentifier } = manualModal;
    setActionLoading((prev) => ({ ...prev, [provider]: true }));
    try {
      await api.post('/integrations', {
        provider,
        apiKey: apiKey.trim() || undefined,
        botToken: botToken.trim() || undefined,
        accountIdentifier: accountIdentifier.trim() || `${provider.toUpperCase()} User`,
      });

      setManualModal({ open: false, provider: '', apiKey: '', botToken: '', accountIdentifier: '' });
      setNotification({
        type: 'success',
        message: `Saved and encrypted credentials for ${provider.toUpperCase()}`,
      });
      await fetchIntegrationsData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save credentials');
    } finally {
      setActionLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  // Handle Disconnect
  const handleDisconnect = async (provider) => {
    if (!confirm(`Are you sure you want to disconnect ${provider.toUpperCase()}? Stored tokens will be permanently deleted.`)) {
      return;
    }
    setActionLoading((prev) => ({ ...prev, [provider]: true }));
    try {
      await api.delete(`/integrations/${provider}`);
      setNotification({
        type: 'success',
        message: `Successfully disconnected ${provider.toUpperCase()}`,
      });
      await fetchIntegrationsData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to disconnect integration');
    } finally {
      setActionLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const connectedCount = integrations.filter((i) => i.isConnected).length;

  const filteredIntegrations = integrations.filter((item) => {
    if (activeFilter === 'CONNECTED') return item.isConnected;
    if (activeFilter === 'TOOLS') return item.category === 'tool';
    if (activeFilter === 'AI') return item.category === 'ai';
    return true;
  });

  return (
    <ProtectedRoute>
      <AppShell
        title="Third-Party Integrations"
        subtitle="Manage OAuth connections and API keys with AES-256-GCM credential encryption at rest"
      >
        <div className="space-y-6">
          {/* Notification Banner */}
          {notification && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-mono transition-all animate-fadeIn ${
                notification.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="p-1 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Top Summary Banner */}
          <div className="glass-panel p-6 rounded-2xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {connectedCount} of {integrations.length} Active
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AES-256-GCM Encryption Active</span>
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">Connected Tools &amp; AI Providers</h2>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Connect external accounts to let autonomous agent swarms execute real actions (sending emails, posting Slack alerts, updating spreadsheets, and querying models).
              </p>
            </div>

            {/* Filter Pills & Refresh */}
            <div className="flex items-center space-x-2 self-start md:self-auto shrink-0">
              <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                {[
                  { id: 'ALL', label: 'ALL' },
                  { id: 'TOOLS', label: 'TOOLS' },
                  { id: 'AI', label: 'AI MODELS' },
                  { id: 'CONNECTED', label: `CONNECTED (${connectedCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeFilter === tab.id
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchIntegrationsData}
                disabled={loading}
                title="Refresh integration status"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredIntegrations.map((item) => {
              const meta = PROVIDER_METADATA[item.provider] || {
                name: item.provider.toUpperCase(),
                icon: Layers,
                color: 'text-cyan-400',
                borderColor: 'border-slate-800',
                bgBadge: 'bg-slate-900 border-slate-800 text-slate-400',
                desc: 'Third-party integration provider.',
                authType: item.authType === 'api_key' ? 'API Key' : 'OAuth 2.0',
                scopes: [],
                envVars: 'API_KEY',
              };

              const Icon = meta.icon;
              const isActionBusy = actionLoading[item.provider];
              const isConnected = item.isConnected;
              const health = healthStatus[item.provider];

              return (
                <div
                  key={item.provider}
                  className={`glass-panel p-6 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                    isConnected ? 'border-emerald-500/40 shadow-lg shadow-emerald-950/20' : 'border-surface-border'
                  }`}
                >
                  {/* Top Header */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-11 h-11 rounded-xl border flex items-center justify-center ${meta.bgBadge}`}
                        >
                          <Icon className={`w-5 h-5 ${meta.color}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm font-mono flex items-center space-x-1.5">
                            <span>{meta.name}</span>
                          </h3>
                          <span className="text-[10px] text-slate-500 font-mono uppercase">
                            {meta.authType}
                          </span>
                        </div>
                      </div>

                      {/* Connection Badge */}
                      {isConnected ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm shadow-emerald-900/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>CONNECTED</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                          NOT CONNECTED
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 leading-relaxed min-h-[38px] mb-4">
                      {meta.desc}
                    </p>

                    {/* Account Info or Scopes */}
                    {isConnected ? (
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-mono space-y-1 mb-4">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Account:</span>
                          <strong className="text-emerald-300 truncate max-w-[170px]">
                            {item.accountIdentifier || 'Active Account'}
                          </strong>
                        </div>
                        {item.lastTestedAt && (
                          <div className="flex items-center justify-between text-slate-500 text-[10px]">
                            <span>Health Check:</span>
                            <span className="text-slate-300">
                              {health?.status === 'ACTIVE' ? 'Active & Valid' : 'Verified'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-900 text-[10px] font-mono text-slate-500 space-y-1 mb-4">
                        <div className="flex items-center justify-between">
                          <span>Required Scopes:</span>
                          <span className="text-slate-400 truncate max-w-[160px]">
                            {meta.scopes.join(', ') || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Environment:</span>
                          <span className="text-slate-400">{meta.envVars}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono">
                      <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="hidden sm:inline">AES-256</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isConnected ? (
                        <button
                          onClick={() => handleDisconnect(item.provider)}
                          disabled={isActionBusy}
                          className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-rose-200 text-xs font-mono font-medium flex items-center space-x-1.5 transition-all"
                        >
                          {isActionBusy ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Disconnect</span>
                        </button>
                      ) : (
                        <>
                          {item.authType === 'api_key' || item.provider === 'discord' ? (
                            <button
                              onClick={() =>
                                setManualModal({
                                  open: true,
                                  provider: item.provider,
                                  apiKey: '',
                                  botToken: '',
                                  accountIdentifier: '',
                                })
                              }
                              disabled={isActionBusy}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-300 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-purple-950/30"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Configure Key</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConnectOAuth(item.provider)}
                              disabled={isActionBusy}
                              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-cyan-500/20"
                            >
                              {isActionBusy ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ExternalLink className="w-3.5 h-3.5" />
                              )}
                              <span>Connect</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* OAuth Configuration Required Modal */}
        {errorModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-surface-border shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-600/80 flex items-center justify-center text-amber-400 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base font-mono">{errorModal.title}</h3>
                    <p className="text-xs text-slate-400 font-mono">Backend OAuth Setup Notice</p>
                  </div>
                </div>
                <button
                  onClick={() => setErrorModal({ open: false, title: '', message: '', provider: '', requiredEnv: '' })}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
                <p>{errorModal.message}</p>
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>Required in <code>server/.env</code>:</span>
                  <div className="mt-1 p-2 rounded bg-slate-900 text-cyan-300 select-all">
                    {errorModal.requiredEnv}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs font-mono text-cyan-300 flex items-start space-x-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  For local development and testing, click <strong>"Connect in Simulated Dev Mode"</strong> below to securely generate and encrypt mock credentials immediately.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => setErrorModal({ open: false, title: '', message: '', provider: '', requiredEnv: '' })}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  Close
                </button>
                <button
                  onClick={() => handleSimulatedConnect(errorModal.provider)}
                  disabled={actionLoading[errorModal.provider]}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono shadow-md shadow-cyan-500/20 flex items-center space-x-1.5"
                >
                  {actionLoading[errorModal.provider] ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Connect in Simulated Dev Mode</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Credentials Modal */}
        {manualModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <form
              onSubmit={handleSaveManual}
              className="glass-panel w-full max-w-md p-6 rounded-2xl border border-surface-border shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-600/80 flex items-center justify-center text-purple-400 shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base font-mono">
                      Configure {manualModal.provider.toUpperCase()}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">AES-256-GCM Encrypted Storage</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setManualModal({ open: false, provider: '', apiKey: '', botToken: '', accountIdentifier: '' })}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Account Identifier / Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Primary Production Bot"
                    value={manualModal.accountIdentifier}
                    onChange={(e) => setManualModal((prev) => ({ ...prev, accountIdentifier: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {manualModal.provider === 'discord' ? (
                  <div>
                    <label className="block text-slate-400 mb-1">Bot Token</label>
                    <input
                      type="password"
                      required
                      placeholder="MTk4... (Discord Bot Token)"
                      value={manualModal.botToken}
                      onChange={(e) => setManualModal((prev) => ({ ...prev, botToken: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 mb-1">API Secret Key</label>
                    <input
                      type="password"
                      required
                      placeholder="sk-or-... / AIzaSy..."
                      value={manualModal.apiKey}
                      onChange={(e) => setManualModal((prev) => ({ ...prev, apiKey: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModal({ open: false, provider: '', apiKey: '', botToken: '', accountIdentifier: '' })}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading[manualModal.provider]}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono shadow-md shadow-purple-600/25 flex items-center space-x-1.5"
                >
                  {actionLoading[manualModal.provider] ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save &amp; Encrypt</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
