import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import toast from '../components/Toast';
import {
  Settings, Server, Mail, Database, Zap, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Trash2, RotateCcw,
  ShieldOff, ShieldCheck, Clock, Activity, Layers, ChevronRight,
  Send, Eye, EyeOff, Loader2, Package
} from 'lucide-react';
import { resetApp, testSmtpConnection, getSystemHealth } from '../api';

// ── helpers ────────────────────────────────────────────────────────────────

const StatusDot = ({ ok, loading }) => {
  if (loading) return <Loader2 size={14} className="animate-spin text-slate-400" />;
  if (ok === true)  return <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />;
  if (ok === false) return <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />;
  return <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />;
};

const HealthRow = ({ label, value, ok, sub }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    <div>
      <span className="text-sm text-slate-300 font-medium">{label}</span>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono text-white font-semibold">{value ?? '—'}</span>
      {ok !== undefined && <StatusDot ok={ok} />}
    </div>
  </div>
);

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className={`rounded-2xl border ${color} p-4 flex items-center gap-4`}>
    <div className="p-2.5 rounded-xl bg-white/5">
      <Icon size={18} className="opacity-80" />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-white tracking-tight">{value ?? '—'}</p>
    </div>
  </div>
);

// ── Reset action definitions ──────────────────────────────────────────────

const RESET_ACTIONS = [
  {
    action: 'release_handoffs',
    label: 'Release All Handoffs',
    desc: 'Move all pending & agent conversations back to Bot mode.',
    icon: RotateCcw,
    danger: false,
    requiresConfirm: false,
    btnColor: 'bg-amber-500 hover:bg-amber-400 text-amber-950',
    borderColor: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
  },
  {
    action: 'clear_analytics',
    label: 'Clear Analytics Data',
    desc: 'Delete all BotAnalytics records. Resets charts and interaction counts to zero.',
    icon: Trash2,
    danger: true,
    requiresConfirm: false,
    btnColor: 'bg-rose-500 hover:bg-rose-400 text-white',
    borderColor: 'border-rose-500/20 bg-rose-500/5 text-rose-400',
  },
  {
    action: 'clear_conversations',
    label: 'Clear All Conversations',
    desc: 'Permanently delete ALL conversation history across all channels.',
    icon: Trash2,
    danger: true,
    requiresConfirm: false,
    btnColor: 'bg-rose-600 hover:bg-rose-500 text-white',
    borderColor: 'border-rose-600/20 bg-rose-600/5 text-rose-400',
  },
  {
    action: 'reset_bot_config',
    label: 'Reset Bot to Factory Default',
    desc: 'Revert the system prompt to the original default. Custom edits will be lost.',
    icon: ShieldOff,
    danger: true,
    requiresConfirm: false,
    btnColor: 'bg-purple-500 hover:bg-purple-400 text-white',
    borderColor: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
  },
  {
    action: 'clear_orders',
    label: 'Wipe All Orders',
    desc: 'DANGER: Delete ALL e-commerce orders permanently. Requires staff privileges.',
    icon: Package,
    danger: true,
    requiresConfirm: true,
    btnColor: 'bg-rose-700 hover:bg-rose-600 text-white',
    borderColor: 'border-rose-700/40 bg-rose-900/20 text-rose-500',
  },
  {
    action: 'clear_clients',
    label: 'Wipe All Client Data',
    desc: 'DANGER: Delete ALL clients, leads, invoices, and analytics. Total system wipe.',
    icon: Trash2,
    danger: true,
    requiresConfirm: true,
    btnColor: 'bg-rose-700 hover:bg-rose-600 text-white',
    borderColor: 'border-red-700/50 bg-red-900/20 text-red-500',
  },
];

// ── Main Settings Page ───────────────────────────────────────────────────

const SettingsPage = () => {
  const [health, setHealth]               = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError]     = useState(null);

  const [smtpEmail, setSmtpEmail]         = useState('');
  const [smtpTesting, setSmtpTesting]     = useState(false);
  const [smtpResult, setSmtpResult]       = useState(null);

  const [confirming, setConfirming]       = useState(null);
  const [confirmText, setConfirmText]     = useState('');
  const [resetting, setResetting]         = useState(null);

  const timerRef = React.useRef(null);

  // ── Fetch health ─────────────────────────────────────────────
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await getSystemHealth();
      setHealth(res.data);
    } catch (err) {
      setHealthError(err?.response?.data?.detail || 'Failed to load system health.');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // ── SMTP test ─────────────────────────────────────────────────
  const handleSmtpTest = async () => {
    if (!smtpEmail.trim()) {
      toast.warning('Enter a recipient email address first.');
      return;
    }
    setSmtpTesting(true);
    setSmtpResult(null);
    try {
      const res = await testSmtpConnection(smtpEmail.trim());
      setSmtpResult(res.data);
      if (res.data.success) {
        toast.success(`SMTP OK — test email sent to ${smtpEmail}`);
      } else {
        toast.error(res.data.error || 'SMTP test failed.');
      }
    } catch (err) {
      const errData = err?.response?.data;
      setSmtpResult(errData || { success: false, error: 'Request failed.' });
      toast.error(errData?.error || 'SMTP request failed.');
    } finally {
      setSmtpTesting(false);
    }
  };

  // ── Reset actions ─────────────────────────────────────────────
  const arm = (action) => {
    setConfirming(action);
    setConfirmText('');
    clearTimeout(timerRef.current);
    const def = RESET_ACTIONS.find(r => r.action === action);
    if (!def?.requiresConfirm) {
      timerRef.current = setTimeout(() => setConfirming(null), 6000);
    }
  };

  const cancel = () => {
    clearTimeout(timerRef.current);
    setConfirming(null);
    setConfirmText('');
  };

  const execute = async (action, extra = {}) => {
    clearTimeout(timerRef.current);
    setConfirming(null);
    setConfirmText('');
    setResetting(action);
    try {
      const res = await resetApp(action, extra);
      toast.success(res.data.message || 'Action completed.');
      fetchHealth();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed.');
    } finally {
      setResetting(null);
    }
  };

  // ── Overall status badge ──────────────────────────────────────
  const overallStatus = health?.overall;
  const statusBadge = {
    healthy:  { text: 'All Systems Operational', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    degraded: { text: 'Degraded — Check SMTP',   color: 'text-amber-400  bg-amber-500/10  border-amber-500/20'  },
    critical: { text: 'Critical — DB Offline',   color: 'text-rose-400   bg-rose-500/10   border-rose-500/20'   },
  }[overallStatus] || { text: 'Loading…', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };

  return (
    <div className="flex bg-transparent min-h-screen text-slate-300 font-sans">
      <Sidebar />

      <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar max-w-[1400px] mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
              <Settings size={12} />
              System Control
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-slate-400 tracking-tight">
              Settings & Maintenance
            </h1>
            <p className="text-base text-slate-400 mt-3 max-w-xl">
              System diagnostics, SMTP configuration, and data management tools.
            </p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={healthLoading}
            className="flex items-center gap-2 glass px-5 py-3 rounded-2xl text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-300 disabled:opacity-50"
          >
            <RefreshCw size={16} className={healthLoading ? 'animate-spin' : ''} />
            Refresh Status
          </button>
        </div>

        {/* Overall Status Banner */}
        <div className={`mb-8 flex items-center gap-3 px-6 py-4 rounded-2xl border text-sm font-bold animate-in fade-in duration-500 ${statusBadge.color}`}>
          <Activity size={18} />
          {statusBadge.text}
          {health?.timestamp && (
            <span className="ml-auto font-mono text-xs opacity-60">
              Last checked: {new Date(health.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* ── Left Column ──────────────────────────────────────── */}
          <div className="space-y-8">

            {/* System Health Card */}
            <div className="glass-premium rounded-3xl p-8 border border-white/5 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Server size={18} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">System Health</h2>
                  <p className="text-xs text-slate-500">Live infrastructure diagnostics</p>
                </div>
                {healthLoading && <Loader2 size={16} className="ml-auto animate-spin text-slate-500" />}
              </div>

              {healthError ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  <XCircle size={16} /> {healthError}
                </div>
              ) : health ? (
                <div>
                  <div className="mb-4">
                    <HealthRow
                      label="Database"
                      value={`${health.database?.engine || '?'} · ${health.database?.latency_ms ?? '?'}ms`}
                      ok={health.database?.ok}
                      sub={health.database?.ok ? 'Connected and responding' : 'Connection failed'}
                    />
                    <HealthRow
                      label="SMTP Mail Server"
                      value={`${health.smtp?.host}:${health.smtp?.port}`}
                      ok={health.smtp?.ok}
                      sub={health.smtp?.error || (health.smtp?.ok ? 'Handshake successful' : 'Connection failed')}
                    />
                    <HealthRow
                      label="Mail Account"
                      value={health.smtp?.user || '—'}
                      ok={health.smtp?.configured}
                      sub={health.smtp?.configured ? 'Password configured' : 'Password not set'}
                    />
                    <HealthRow
                      label="Cache Backend"
                      value={health.cache?.backend}
                      sub={health.cache?.redis ? 'Redis (production-grade)' : 'In-memory (dev mode)'}
                    />
                    <HealthRow
                      label="Django Version"
                      value={health.django_version}
                      sub={`Python ${health.python_version}`}
                    />
                    <HealthRow
                      label="Debug Mode"
                      value={health.debug_mode ? 'ON' : 'OFF'}
                      ok={health.debug_mode ? false : true}
                      sub={health.debug_mode ? 'Disable in production!' : 'Production-safe'}
                    />
                  </div>

                  {/* Tenant Stats Mini Grid */}
                  {health.tenant_stats && (
                    <div className="mt-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Tenant Data Overview</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: 'Clients',      value: health.tenant_stats.clients,          icon: Activity,   color: 'border-blue-500/20 text-blue-400'    },
                          { label: 'Conversations', value: health.tenant_stats.conversations,    icon: Layers,     color: 'border-indigo-500/20 text-indigo-400' },
                          { label: 'Invoices',      value: health.tenant_stats.invoices,         icon: Zap,        color: 'border-amber-500/20 text-amber-400'   },
                          { label: 'Paid',          value: health.tenant_stats.paid_invoices,    icon: CheckCircle2, color: 'border-emerald-500/20 text-emerald-400' },
                          { label: 'Bot Sessions',  value: health.tenant_stats.bot_interactions, icon: Activity,   color: 'border-cyan-500/20 text-cyan-400'    },
                          { label: 'Last 7 Days',   value: health.tenant_stats.interactions_7d,  icon: Clock,      color: 'border-purple-500/20 text-purple-400' },
                        ].map(s => (
                          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 animate-pulse">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-white/5 rounded-xl" />
                  ))}
                </div>
              )}
            </div>

            {/* SMTP Test Card */}
            <div className="glass-premium rounded-3xl p-8 border border-white/5 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Mail size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">SMTP Delivery Test</h2>
                  <p className="text-xs text-slate-500">Send a real test email to verify mail delivery</p>
                </div>
              </div>

              <div className="flex gap-3 mb-4">
                <input
                  type="email"
                  value={smtpEmail}
                  onChange={e => setSmtpEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSmtpTest()}
                  placeholder="recipient@example.com"
                  className="flex-1 bg-[#0c0c0e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                />
                <button
                  onClick={handleSmtpTest}
                  disabled={smtpTesting}
                  className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {smtpTesting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {smtpTesting ? 'Sending…' : 'Send Test'}
                </button>
              </div>

              {smtpResult && (
                <div className={`mt-4 rounded-xl p-4 border text-sm ${smtpResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                  <div className="flex items-center gap-2 font-bold mb-2">
                    {smtpResult.success
                      ? <><CheckCircle2 size={15} /> SMTP Delivery Successful</>
                      : <><XCircle size={15} /> SMTP Delivery Failed</>
                    }
                  </div>
                  <p className="text-xs opacity-80 mb-2">{smtpResult.message || smtpResult.error}</p>
                  {smtpResult.details && (
                    <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-1 text-xs font-mono text-slate-400">
                      {Object.entries(smtpResult.details).map(([k, v]) => (
                        <div key={k}><span className="text-slate-500">{k}:</span> {String(v)}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* ── Right Column: Maintenance Actions ──────────────── */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <div className="glass-premium rounded-3xl p-8 border border-white/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Trash2 size={18} className="text-rose-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">System Maintenance</h2>
                  <p className="text-xs text-slate-500">Destructive actions — use with caution</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[680px] overflow-y-auto custom-scrollbar pr-1">
                {RESET_ACTIONS.map(({ action, label, desc, icon: Icon, btnColor, borderColor, requiresConfirm }) => (
                  <div
                    key={action}
                    className={`rounded-2xl border ${borderColor} overflow-hidden transition-all duration-300 bg-black/20 backdrop-blur-sm`}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="p-2.5 rounded-xl bg-white/5 shrink-0">
                        <Icon size={16} className="opacity-80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white">{label}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                      <button
                        onClick={() => confirming === action ? cancel() : arm(action)}
                        disabled={resetting === action}
                        className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${btnColor} ${resetting === action ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                      >
                        {resetting === action ? <Loader2 size={12} className="animate-spin" /> : confirming === action ? 'Cancel' : 'Execute'}
                      </button>
                    </div>

                    {confirming === action && (
                      <div className="flex flex-col gap-3 p-4 bg-rose-900/20 border-t border-rose-500/20 animate-in slide-in-from-top-2 duration-200">
                        <p className="text-xs text-rose-300 font-semibold flex items-center gap-2">
                          <AlertTriangle size={13} className="animate-pulse" />
                          This action is permanent and cannot be undone.
                        </p>
                        {!requiresConfirm ? (
                          <div className="flex gap-2">
                            <button onClick={cancel} className="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                              Cancel
                            </button>
                            <button
                              onClick={() => execute(action)}
                              className="flex-1 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                            >
                              Confirm
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-rose-300 font-bold mb-2">Type "DELETE ALL" to confirm:</p>
                            <input
                              type="text"
                              value={confirmText}
                              onChange={e => setConfirmText(e.target.value)}
                              placeholder="DELETE ALL"
                              className="w-full mb-3 bg-slate-950/80 border border-rose-500/30 rounded-xl px-4 py-2 text-white text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all placeholder:text-slate-700"
                            />
                            <div className="flex gap-2">
                              <button onClick={cancel} className="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                                Cancel
                              </button>
                              <button
                                onClick={() => execute(action, { confirm: confirmText })}
                                disabled={confirmText !== 'DELETE ALL'}
                                className="flex-1 py-2 text-xs font-bold bg-rose-700 hover:bg-rose-600 text-white rounded-xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Confirm Permanent Wipe
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
