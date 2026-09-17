import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getStats, getClients, getMe, resetApp, getOrders, getLatestGoldRate, getProductsAdmin } from '../api';
import Sidebar from '../components/Sidebar';
import toast from '../components/Toast';
import { Users, MessageSquare, CreditCard, TrendingUp, ChevronRight, Bot, AlertTriangle, Zap, TrendingDown, Trash2, RotateCcw, ShieldOff, X, Smile, Meh, Frown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RESET_ACTIONS = [
  {
    action:  'release_handoffs',
    label:   'Release All Handoffs',
    desc:    'Move all pending & agent conversations back to Bot mode. Use when restarting after maintenance.',
    icon:    RotateCcw,
    color:   'border-amber-500/20 bg-amber-500/5 text-amber-400',
    btnColor:'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]',
  },
  {
    action:  'clear_analytics',
    label:   'Clear Analytics Data',
    desc:    'Delete all BotAnalytics records. Resets interaction counts, fallback rates and charts to zero.',
    icon:    Trash2,
    color:   'border-rose-500/20 bg-rose-500/5 text-rose-400',
    btnColor:'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]',
  },
  {
    action:  'clear_conversations',
    label:   'Clear All Conversations',
    desc:    'Permanently delete ALL conversation history across all channels. This cannot be undone.',
    icon:    Trash2,
    color:   'border-rose-600/20 bg-rose-600/5 text-rose-400',
    btnColor:'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.5)]',
  },
  {
    action:  'clear_clients',
    label:   'Wipe All Client Data',
    desc:    'DANGER: Delete ALL clients, leads, invoices, and analytics. Total system wipe.',
    icon:    Trash2,
    color:   'border-rose-700/50 bg-rose-900/20 text-rose-500',
    btnColor:'bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_20px_rgba(225,29,72,0.6)]',
  },
  {
    action:  'reset_bot_config',
    label:   'Reset Bot to Factory Default',
    desc:    'Revert the system prompt to the original default. Custom edits will be lost.',
    icon:    ShieldOff,
    color:   'border-purple-500/20 bg-purple-500/5 text-purple-400',
    btnColor:'bg-purple-500 hover:bg-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]',
  },
];

const ResetModal = ({ onClose, onRefresh }) => {
  const [confirming, setConfirming] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading]       = useState(null);
  const timerRef = React.useRef(null);

  const arm = (action) => {
    setConfirming(action);
    setConfirmText('');
    clearTimeout(timerRef.current);
    if (action !== 'clear_clients') {
      timerRef.current = setTimeout(() => setConfirming(null), 5000);
    }
  };

  const cancel = () => {
    clearTimeout(timerRef.current);
    setConfirming(null);
    setConfirmText('');
  };

  const execute = async (action, extraData = {}) => {
    clearTimeout(timerRef.current);
    setConfirming(null);
    setConfirmText('');
    setLoading(action);
    try {
      const res = await resetApp(action, extraData);
      toast.success(res.data.message || 'Reset complete.');
      onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Reset failed.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#030712]/90 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl glass-premium rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/10">
        
        {/* Glow accent */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50"></div>

        <div className="flex justify-between items-center p-8 border-b border-white/5 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <Trash2 size={20} /> 
              </div>
              System Maintenance
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar relative z-10">
          {RESET_ACTIONS.map(({ action, label, desc, icon: Icon, color, btnColor }) => (
            <div key={action} className={`rounded-2xl border ${color} overflow-hidden transition-all duration-300 hover:scale-[1.01] bg-black/20 backdrop-blur-md`}>
              <div className="flex items-center gap-5 p-5">
                <div className="p-3 rounded-full bg-white/5">
                  <Icon size={20} className="shrink-0 opacity-90" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base text-white">{label}</p>
                  <p className="text-sm text-slate-400 mt-1">{desc}</p>
                </div>
                <button
                  onClick={() => confirming === action ? cancel() : arm(action)}
                  disabled={loading === action}
                  className={`shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${btnColor} ${loading === action ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                >
                  {loading === action ? 'Running…' : confirming === action ? 'Cancel' : 'Execute'}
                </button>
              </div>
              {confirming === action && (
                <div className="flex flex-col gap-4 p-5 bg-rose-500/10 border-t border-rose-500/20 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-rose-200 font-semibold flex items-center gap-2">
                      <AlertTriangle size={16} className="animate-pulse shrink-0" /> This action is permanent and cannot be undone.
                    </p>
                    {action !== 'clear_clients' && (
                      <button
                        onClick={() => execute(action)}
                        className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.6)] hover:shadow-[0_0_25px_rgba(225,29,72,0.8)]"
                      >
                        Confirm Reset
                      </button>
                    )}
                  </div>
                  {action === 'clear_clients' && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2 border-t border-rose-500/10 pt-4">
                      <div className="flex-1">
                        <p className="text-xs text-rose-300 font-bold mb-2">Type "DELETE ALL" to confirm wipe:</p>
                        <input
                          type="text"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder="DELETE ALL"
                          className="w-full bg-slate-950/80 border border-rose-500/30 rounded-xl px-4 py-2 text-white text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all placeholder:text-slate-700"
                        />
                      </div>
                      <button
                        onClick={() => execute(action, { confirm: confirmText })}
                        disabled={confirmText !== 'DELETE ALL'}
                        className="self-end px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.6)] hover:shadow-[0_0_25px_rgba(225,29,72,0.8)] disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none hover:scale-105 active:scale-95"
                      >
                        Confirm Permanent Wipe
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SentimentAnalysisCard = ({ distribution = [] }) => {
  const total = distribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="glass rounded-3xl p-8 flex flex-col h-full card-glow-indigo transition-all duration-300 relative overflow-hidden group">
      <div className="absolute -right-20 -top-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
      
      <h3 className="text-xl font-bold text-white mb-8 tracking-tight relative z-10">Sentiment Overview</h3>
      <div className="flex flex-col gap-6 flex-1 justify-center relative z-10">
        {[
          { type: 'positive', label: 'Positive', color: 'text-emerald-400', bg: 'bg-emerald-400', shadow: 'shadow-[0_0_15px_rgba(52,211,153,0.5)]', icon: <Smile size={20} /> },
          { type: 'neutral',  label: 'Neutral',  color: 'text-blue-400',    bg: 'bg-blue-400',    shadow: 'shadow-[0_0_15px_rgba(96,165,250,0.5)]', icon: <Meh size={20} /> },
          { type: 'negative', label: 'Negative', color: 'text-rose-400',    bg: 'bg-rose-400',    shadow: 'shadow-[0_0_15px_rgba(251,113,133,0.5)]', icon: <Frown size={20} /> },
        ].map(({ type, label, color, bg, shadow, icon }) => {
          const item = distribution.find(d => d.sentiment === type) || { count: 0 };
          const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={type} className="group/item">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span className={`${color} p-2 rounded-xl bg-white/5`}>{icon}</span>
                  <span className="text-base font-semibold text-slate-200">{label}</span>
                </div>
                <div className="text-right flex items-center gap-4">
                  <span className="text-base font-bold text-white">{item.count}</span>
                  <span className={`text-sm font-mono font-bold ${color} w-10`}>{percent}%</span>
                </div>
              </div>
              <div className="w-full bg-[#030712]/50 h-2.5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div className={`${bg} h-full transition-all duration-1000 ease-out ${shadow} relative`} style={{ width: `${percent}%` }}>
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {total === 0 && <p className="text-sm text-slate-500 font-medium text-center mt-4 relative z-10">No analytical data available yet</p>}
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats]             = useState(null);
  const [recentClients, setRecentClients] = useState([]);
  const [showReset, setShowReset]     = useState(false);
  const [role, setRole]               = useState('agent');
  const [ecomStats, setEcomStats]     = useState({ orders: 0, pendingOrders: 0, goldRate22k: null, productCount: 0, revenue: 0 });
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [statsRes, clientsRes, meRes, ordersRes, rateRes, productsRes] = await Promise.all([
        getStats(),
        getClients(),
        getMe(),
        getOrders().catch(() => ({ data: { results: [], count: 0 } })),
        getLatestGoldRate().catch(() => ({ data: null })),
        getProductsAdmin().catch(() => ({ data: { results: [], count: 0 } }))
      ]);
      setStats(statsRes.data);
      const clientList = clientsRes.data.results || clientsRes.data;
      setRecentClients(clientList.slice(0, 5));
      
      const currentSlug = localStorage.getItem('tenant_slug');
      const membership = (meRes.data.memberships || []).find(m => m.tenant_slug === currentSlug);
      if (membership) setRole(membership.role);

      // E-commerce KPIs
      const orders = ordersRes.data.results || ordersRes.data || [];
      const orderCount = ordersRes.data.count || orders.length;
      const pendingOrders = orders.filter(o => o.order_status === 'pending').length;
      const storeRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      setEcomStats({
        orders: orderCount,
        pendingOrders,
        goldRate22k: rateRes.data?.rate_22k || null,
        productCount: productsRes.data.count || (productsRes.data.results || []).length,
        revenue: storeRevenue
      });
    } catch (err) {
      toast.error('Failed to load dashboard stats.');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return (
    <div className="flex bg-[#030712] min-h-screen text-slate-300 font-sans selection:bg-indigo-500/30">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 animate-pulse max-w-[1600px] mx-auto w-full">
        <div className="h-14 w-64 bg-white/5 rounded-2xl mb-12"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          {[...Array(5)].map((_, i) => <div key={i} className="h-36 glass rounded-3xl"></div>)}
        </div>
      </main>
    </div>
  );

  return (
    <>
    <div className="admin-dashboard flex bg-transparent h-screen text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <Sidebar />
      
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar max-w-[1600px] mx-auto w-full relative z-10">
        
        {/* Stunning Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              Live Telemetry
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-slate-400 tracking-tight drop-shadow-sm">
              Platform Overview
            </h1>
            <p className="text-base text-slate-400 mt-3 font-medium max-w-xl">
              Real-time analytics, conversation health, and revenue tracking for your AI agent.
            </p>
          </div>
          {role === 'admin' && (
            <button
              onClick={() => setShowReset(true)}
              className="group flex items-center gap-2 glass px-5 py-3 rounded-2xl text-sm font-bold text-rose-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 transition-all duration-300 shadow-[0_0_20px_rgba(244,63,94,0.1)] hover:shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95"
            >
              <Trash2 size={18} className="group-hover:rotate-12 transition-transform" /> System Settings
            </button>
          )}
        </div>

        {/* Action Required Banner */}
        {stats.pending_handoffs > 0 && (
          <div className="mb-10 bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_0_40px_rgba(245,158,11,0.15)] animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-5">
              <div className="p-4 rounded-2xl bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <AlertTriangle size={28} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-amber-400">Human Intervention Required</h4>
                <p className="text-sm text-amber-500/80 font-medium mt-1">
                  {stats.pending_handoffs} conversations have been escalated and are waiting for an agent.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/clients')}
              className="px-6 py-3 w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              Resolve Now
            </button>
          </div>
        )}

        {/* Primary KPIs - Stunning Glass Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          {[
            { label: 'Total Clients', value: stats.total_clients, icon: Users, color: 'blue' },
            { label: 'Active Leads',  value: stats.leads,         icon: MessageSquare, color: 'emerald' },
            { label: 'Total Invoices',value: stats.total_invoices,icon: CreditCard, color: 'purple' },
            { label: 'Revenue (BDT)', value: `৳${stats.total_revenue}`, icon: TrendingUp, color: 'amber' },
            { label: 'Messages Today',value: stats.messages_today,icon: MessageSquare, color: 'indigo' },
          ].map((k, i) => (
            <div key={i} className={`glass-premium rounded-3xl p-6 flex flex-col gap-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 card-glow-${k.color}`}>
              <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${k.color}-500/20 rounded-full blur-2xl group-hover:bg-${k.color}-500/30 transition-all duration-500`}></div>
              
              <div className="flex justify-between items-center relative z-10">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{k.label}</span>
                <div className={`p-2.5 rounded-xl bg-white/5 text-${k.color}-400 shadow-inner border border-white/5`}>
                  <k.icon size={18} />
                </div>
              </div>
              
              <h3 className="text-4xl font-black text-white tracking-tighter relative z-10 drop-shadow-md">
                {k.value}
              </h3>
            </div>
          ))}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
          {[
            { label: 'Bot Interactions', value: stats.bot_interactions,      icon: Bot, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
            { label: 'Avg Response',     value: `${stats.avg_response_ms}ms`,icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'Fallback Rate',    value: `${stats.fallback_rate}%`,   icon: TrendingDown, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { label: 'Escalation Rate',  value: `${stats.escalation_rate}%`, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          ].map((k, i) => (
            <div key={i} className="glass rounded-3xl p-6 flex items-center gap-5 hover:bg-white/[0.02] transition-colors duration-300 border border-white/5">
              <div className={`p-3.5 rounded-2xl ${k.bg} ${k.border} border shadow-inner`}>
                <k.icon size={22} className={k.color} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{k.label}</p>
                <p className="text-2xl font-black text-white tracking-tight drop-shadow-sm">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Sahara Gold E-Commerce KPI Strip ─────────────────── */}
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse"></span>
            <span className="text-xs font-bold text-[#d4af37] uppercase tracking-widest">Gold Storefront · Live</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Total Orders', value: ecomStats.orders, sub: `${ecomStats.pendingOrders} pending`, color: '#d4af37', bg: 'rgba(212,175,55,0.08)', path: '/orders' },
              { label: '22K Gold Rate', value: ecomStats.goldRate22k ? `৳${Number(ecomStats.goldRate22k).toLocaleString()}` : '—', sub: 'per gram (live)', color: '#f4d03f', bg: 'rgba(244,208,63,0.08)', path: '/gold-rates' },
              { label: 'Products Listed', value: ecomStats.productCount, sub: 'active jewelry', color: '#c0c0c0', bg: 'rgba(192,192,192,0.07)', path: '/products' },
              { label: 'Store Revenue', value: `৳${Number(ecomStats.revenue).toLocaleString()}`, sub: 'total orders', color: '#5eead4', bg: 'rgba(94,234,212,0.07)', path: '/orders' },
            ].map((k, i) => (
              <div
                key={i}
                onClick={() => navigate(k.path)}
                className="cursor-pointer group p-5 rounded-2xl border border-white/5 hover:border-white/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                style={{ background: k.bg }}
              >
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: k.color }}>{k.label}</p>
                <p className="text-3xl font-black text-white tracking-tight drop-shadow-sm">{k.value}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-300">
          <div className="lg:col-span-1 h-full">
            <SentimentAnalysisCard distribution={stats.sentiment_distribution} />
          </div>

          <div className="lg:col-span-2 glass-premium rounded-3xl flex flex-col card-glow-blue overflow-hidden transition-all duration-300">
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h2 className="text-xl font-bold text-white tracking-tight">Recent Lead Activity</h2>
              <button onClick={() => navigate('/admin/clients')} className="text-sm text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1.5 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-xl">
                View CRM <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-x-auto p-4">
              {recentClients.length > 0 ? (
                <div className="space-y-3">
                  {recentClients.map(client => (
                    <div 
                      key={client.id} 
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] hover:bg-white/[0.04] border border-transparent hover:border-white/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-[#030712] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors shadow-inner">
                          <Users size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-base text-white group-hover:text-blue-100 transition-colors">{client.name || 'Anonymous Lead'}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{client.phone}</div>
                        </div>
                      </div>
                      
                      <div className="hidden sm:block text-right flex-1 px-8">
                        <span className="text-sm font-semibold text-slate-300">{client.service_selected || 'Exploring Options'}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest ${
                          client.status === 'active' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]' :
                          client.status === 'completed' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]' :
                          client.status === 'invoiced' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]' :
                          'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                        }`}>
                          {client.status}
                        </span>
                        <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10 shadow-inner">
                    <Users size={28} className="text-slate-500" />
                  </div>
                  <p className="text-base font-semibold text-white mb-1">No Client Data</p>
                  <p className="text-sm text-slate-400">Connect a channel to start generating leads.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>

    {showReset && createPortal(
      <ResetModal
        onClose={() => setShowReset(false)}
        onRefresh={() => { fetchData(); setShowReset(false); }}
      />,
      document.body
    )}
    </>
  );
};

export default Dashboard;
