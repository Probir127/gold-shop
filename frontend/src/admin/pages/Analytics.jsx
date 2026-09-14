import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { getAIAnalytics } from '../api';
import {
  BarChart2, AlertCircle, Zap, TrendingUp, TrendingDown, RefreshCcw,
  Smile, Meh, Frown, ChevronDown, Bot, Users, MessageSquare,
  Activity, Clock, Shield, Cpu, ArrowUpRight, ArrowDownRight,
  Circle, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const pct = (n, total) => (total === 0 ? 0 : Math.round((n / total) * 100));
const fmt = n => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const CHANNEL_META = {
  whatsapp:  { label: 'WhatsApp',  color: '#25D366', bg: 'rgba(37,211,102,0.12)' },
  telegram:  { label: 'Telegram',  color: '#2AABEE', bg: 'rgba(42,171,238,0.12)' },
  instagram: { label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.12)' },
  messenger: { label: 'Messenger', color: '#0084FF', bg: 'rgba(0,132,255,0.12)' },
  web:       { label: 'Web Chat',  color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
};

const INTENT_COLORS = [
  '#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e',
  '#f97316','#eab308','#22c55e','#06b6d4','#3b82f6'
];

const SENTIMENT_META = {
  positive: { icon: <Smile size={16} />, color: '#34d399', bg: 'rgba(52,211,153,0.15)', label: 'Positive' },
  neutral:  { icon: <Meh size={16} />,   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Neutral' },
  negative: { icon: <Frown size={16} />, color: '#f87171', bg: 'rgba(248,113,113,0.15)', label: 'Negative' },
};

// ─────────────────────────────────────────────────────────────────
// Mini SVG Line Chart
// ─────────────────────────────────────────────────────────────────
const LineChart = ({ data = [], color = '#6366f1', height = 80 }) => {
  if (!data.length) return <div className="h-20 flex items-center justify-center text-slate-600 text-xs">No data</div>;
  const values = data.map(d => d.total || 0);
  const max = Math.max(...values, 1);
  const w = 600, h = height;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - (v / max) * (h - 10) - 5;
    return `${x},${y}`;
  }).join(' ');
  const areaEnd = `${w},${h} 0,${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`lg-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill={`url(#lg-${color.slice(1)})`} stroke="none" points={`${pts} ${areaEnd}`} />
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      {values.map((v, i) => {
        const x = (i / (values.length - 1 || 1)) * w;
        const y = h - (v / max) * (h - 10) - 5;
        return <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#09090b" strokeWidth="2" />;
      })}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// Mini SVG Bar Chart
// ─────────────────────────────────────────────────────────────────
const BarChart = ({ data = [], colorKey = 'total', color = '#6366f1', height = 80 }) => {
  if (!data.length) return null;
  const values = data.map(d => d[colorKey] || 0);
  const max = Math.max(...values, 1);
  const barW = 100 / data.length;
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-all duration-500 hover:opacity-80 cursor-pointer relative group"
          style={{ height: `${(v / max) * 100}%`, background: color, minHeight: v > 0 ? 2 : 0 }}>
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-black/80 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
            {data[i].date ? new Date(data[i].date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : `H${data[i].hour}`}: {v}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Donut Chart (SVG)
// ─────────────────────────────────────────────────────────────────
const DonutChart = ({ segments = [], size = 120 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total) return (
    <div style={{ width: size, height: size }} className="rounded-full border-4 border-white/5 flex items-center justify-center">
      <span className="text-slate-600 text-xs">No data</span>
    </div>
  );
  let cumulative = 0;
  const r = 42, cx = 50, cy = 50, strokeW = 14;
  const circ = 2 * Math.PI * r;
  const paths = segments.map((seg, i) => {
    const frac = seg.value / total;
    const dash = frac * circ;
    const gap = circ - dash;
    const offset = circ - cumulative * circ;
    cumulative += frac;
    return (
      <circle key={i} cx={cx} cy={cy} r={r} fill="none"
        stroke={seg.color} strokeWidth={strokeW}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
  });
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeW} />
      {paths}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon: Icon, trend, color = '#6366f1', bgColor }) => (
  <div className="relative bg-[#111113] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3 overflow-hidden group hover:-translate-y-0.5 transition-all duration-300 hover:border-white/10">
    <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-all"
      style={{ background: color }} />
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="p-2 rounded-xl border border-white/5" style={{ background: bgColor || `${color}20` }}>
        <Icon size={15} style={{ color }} />
      </div>
    </div>
    <div>
      <span className="text-2xl font-black text-white tracking-tight">{value}</span>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
    {trend != null && (
      <div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        {Math.abs(trend)}% vs previous period
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Hourly Heatmap
// ─────────────────────────────────────────────────────────────────
const HourlyHeatmap = ({ data = [] }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  const timeLabel = h => {
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };
  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {data.map(({ hour, count }) => {
          const intensity = count / max;
          const opacity = count === 0 ? 0.05 : 0.15 + intensity * 0.85;
          return (
            <div key={hour} className="relative group cursor-pointer">
              <div className="w-8 h-8 rounded-lg transition-all duration-300 group-hover:scale-110"
                style={{ background: `rgba(99,102,241,${opacity})`, border: `1px solid rgba(99,102,241,${opacity * 0.5})` }} />
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-[10px] bg-[#1a1a1f] border border-white/10 text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                {timeLabel(hour)}: {count}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-slate-600">
        <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div className={`bg-[#111113] border border-white/[0.06] rounded-2xl ${className}`}>
    {children}
  </div>
);
const CardHeader = ({ title, sub, action }) => (
  <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
    {action}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
const Analytics = () => {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]  = useState('30');
  const [error, setError]    = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAIAnalytics({ days: period });
      setData(res.data);
    } catch (e) {
      setError('Failed to load analytics. Check your connection.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived values ──────────────────────────────────────────
  const total      = data?.total_interactions ?? 0;
  const fallbacks  = data?.fallback_count ?? 0;
  const escalated  = data?.escalation_count ?? 0;
  const avgMs      = data?.avg_response_ms ?? 0;
  const sentiment  = data?.sentiment ?? { positive: 0, neutral: 0, negative: 0 };
  const sentTotal  = sentiment.positive + sentiment.neutral + sentiment.negative;
  const pipeline   = data?.client_pipeline ?? {};
  const rtBuckets  = data?.response_time_buckets ?? { fast: 0, medium: 0, slow: 0 };
  const rtTotal    = rtBuckets.fast + rtBuckets.medium + rtBuckets.slow;

  const sentimentSegments = [
    { color: '#34d399', value: sentiment.positive },
    { color: '#94a3b8', value: sentiment.neutral },
    { color: '#f87171', value: sentiment.negative },
  ];

  // ── Skeleton loader ─────────────────────────────────────────
  if (loading && !data) return (
    <div className="flex bg-[#09090b] min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-white/5 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-white/5 rounded-2xl" />)}
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div className="flex bg-[#09090b] min-h-screen text-slate-300 font-sans selection:bg-indigo-500/30">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Live Intelligence</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">AI Analytics</h1>
              <p className="text-xs text-slate-500 mt-1">Powered by Sahara Gold AI · Auto-refreshes every 30s</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  className="appearance-none bg-[#111113] border border-white/10 hover:border-white/20 text-xs font-semibold text-white rounded-xl px-4 py-2.5 pr-9 outline-none cursor-pointer transition-colors"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                >
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2.5 bg-[#111113] border border-white/10 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-400 rounded-xl transition-all disabled:opacity-50"
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin text-indigo-400' : ''} />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* ── KPI Row ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Interactions"
              value={fmt(total)}
              sub={`In last ${period} days`}
              icon={Activity}
              color="#6366f1"
              trend={data?.trend_interactions}
            />
            <KpiCard
              label="Avg Response"
              value={`${avgMs}ms`}
              sub="AI processing latency"
              icon={Zap}
              color="#22c55e"
            />
            <KpiCard
              label="Fallback Rate"
              value={`${data?.fallback_rate ?? 0}%`}
              sub={`${fallbacks} total fallbacks`}
              icon={AlertCircle}
              color="#f59e0b"
            />
            <KpiCard
              label="Escalation Rate"
              value={`${data?.escalation_rate ?? 0}%`}
              sub={`${escalated} handed to agents`}
              icon={AlertTriangle}
              color="#f43f5e"
            />
          </div>

          {/* ── Secondary KPI Row ─────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Success Rate', value: `${pct(total - fallbacks - escalated, total)}%`, icon: CheckCircle2, color: '#34d399' },
              { label: 'Resolution Rate', value: `${data?.resolution_rate ?? 0}%`, icon: Shield, color: '#818cf8' },
              { label: 'Invoices (period)', value: data?.invoices_period?.count ?? 0, icon: BarChart2, color: '#a78bfa' },
              { label: 'Revenue (period)', value: `৳${Number(data?.invoices_period?.revenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: '#fbbf24' },
            ].map((k, i) => (
              <div key={i} className="bg-[#111113] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4 hover:border-white/10 transition-all">
                <div className="p-2.5 rounded-xl" style={{ background: `${k.color}15`, border: `1px solid ${k.color}25` }}>
                  <k.icon size={16} style={{ color: k.color }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{k.label}</p>
                  <p className="text-lg font-black text-white mt-0.5">{k.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Daily Trend Chart ─────────────────────────────────── */}
          <Card>
            <CardHeader
              title="Interaction Trend"
              sub={`Daily volume over last ${period} days`}
            />
            <div className="p-6">
              {(data?.daily_trend?.length ?? 0) > 0 ? (
                <div className="space-y-4">
                  <div className="flex gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"/>Total</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Success</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>Fallback</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/>Escalated</span>
                  </div>
                  <div className="relative">
                    <BarChart data={data.daily_trend} colorKey="total" color="#6366f1" height={100} />
                    <div className="flex justify-between text-[10px] text-slate-600 mt-2">
                      {data.daily_trend.length > 0 && (
                        <>
                          <span>{new Date(data.daily_trend[0].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                          <span>{new Date(data.daily_trend[Math.floor(data.daily_trend.length / 2)].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                          <span>{new Date(data.daily_trend[data.daily_trend.length - 1].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-8 text-center">No trend data in this period</p>
              )}
            </div>
          </Card>

          {/* ── 3-col: Sentiment, Intent, Channels ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Sentiment */}
            <Card>
              <CardHeader title="Sentiment Analysis" sub="Customer mood distribution" />
              <div className="p-6 flex flex-col items-center gap-6">
                <div className="relative">
                  <DonutChart segments={sentimentSegments} size={130} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-white">{fmt(sentTotal)}</span>
                    <span className="text-[10px] text-slate-500">messages</span>
                  </div>
                </div>
                <div className="w-full space-y-3">
                  {Object.entries(SENTIMENT_META).map(([key, meta]) => {
                    const count = sentiment[key] || 0;
                    const p = pct(count, sentTotal);
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2" style={{ color: meta.color }}>
                            {meta.icon}
                            <span className="text-xs font-semibold text-slate-300">{meta.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-white">{count}</span>
                            <span className="text-[10px] text-slate-500 ml-1">({p}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${p}%`, background: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Intent Distribution */}
            <Card>
              <CardHeader title="Intent Distribution" sub="Top conversation intents" />
              <div className="p-6 space-y-3">
                {(data?.intent_distribution?.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">No intent data yet</p>
                ) : (
                  data.intent_distribution.slice(0, 8).map(({ intent, count }, i) => {
                    const p = pct(count, total);
                    return (
                      <div key={intent}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: INTENT_COLORS[i] }} />
                            <span className="text-xs text-slate-300 capitalize">{intent.replace(/_/g, ' ')}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{count} · {p}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${p}%`, background: INTENT_COLORS[i] }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Channel Distribution */}
            <Card>
              <CardHeader title="Channel Traffic" sub="Messages by platform" />
              <div className="p-6 space-y-4">
                {(data?.channel_distribution?.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">No channel data yet</p>
                ) : (
                  data.channel_distribution.map(({ channel, count }) => {
                    const meta = CHANNEL_META[channel] || { label: channel, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' };
                    const p = pct(count, total);
                    return (
                      <div key={channel}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black"
                              style={{ background: meta.bg, color: meta.color }}>
                              {meta.label.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold text-slate-300">{meta.label}</span>
                          </div>
                          <span className="text-xs font-bold" style={{ color: meta.color }}>{count} ({p}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${p}%`, background: meta.color }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* ── Hourly Activity + Response Time ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Hourly Activity" sub="Message volume by hour of day" />
              <div className="p-6">
                <HourlyHeatmap data={data?.hourly_activity ?? []} />
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex gap-1">
                    {[0.05, 0.2, 0.4, 0.7, 1].map((o, i) => (
                      <div key={i} className="w-4 h-4 rounded" style={{ background: `rgba(99,102,241,${o})` }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500">Low → High traffic</span>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Response Speed" sub="AI latency distribution" />
              <div className="p-6 space-y-4">
                {[
                  { label: '< 500ms (Fast)', count: rtBuckets.fast,   color: '#34d399', icon: <Zap size={14}/> },
                  { label: '500ms – 2s',     count: rtBuckets.medium, color: '#fbbf24', icon: <Clock size={14}/> },
                  { label: '> 2s (Slow)',    count: rtBuckets.slow,   color: '#f87171', icon: <AlertCircle size={14}/> },
                ].map(({ label, count, color, icon }) => {
                  const p = pct(count, rtTotal);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2" style={{ color }}>
                          {icon}
                          <span className="text-xs font-semibold text-slate-300">{label}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color }}>{count} ({p}%)</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${p}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Overall avg</span>
                  <span className="text-base font-black text-white">{avgMs}ms</span>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Client Pipeline ──────────────────────────────────── */}
          <Card>
            <CardHeader title="Client Pipeline" sub="Conversion funnel — all time" />
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Total', value: pipeline.total ?? 0, color: '#6366f1' },
                  { label: 'Leads', value: pipeline.leads ?? 0, color: '#3b82f6' },
                  { label: 'Active', value: pipeline.active ?? 0, color: '#06b6d4' },
                  { label: 'Invoiced', value: pipeline.invoiced ?? 0, color: '#f59e0b' },
                  { label: 'Completed', value: pipeline.completed ?? 0, color: '#22c55e' },
                ].map(({ label, value, color }, i, arr) => (
                  <div key={label} className="flex flex-col items-center text-center group">
                    <div className="w-full py-4 rounded-xl border border-white/5 group-hover:border-white/10 transition-all"
                      style={{ background: `${color}10` }}>
                      <p className="text-2xl font-black" style={{ color }}>{value}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="hidden sm:flex items-center justify-end w-full -mr-3 relative z-10">
                        {/* arrow handled via layout gap */}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Funnel bar */}
              <div className="mt-4 flex gap-1 h-2 rounded-full overflow-hidden">
                {[
                  { value: pipeline.leads ?? 0, color: '#3b82f6' },
                  { value: pipeline.active ?? 0, color: '#06b6d4' },
                  { value: pipeline.invoiced ?? 0, color: '#f59e0b' },
                  { value: pipeline.completed ?? 0, color: '#22c55e' },
                ].map(({ value, color }, i) => (
                  <div key={i} style={{ flex: value || 1, background: color }} className="transition-all duration-700 min-w-[4px]" />
                ))}
              </div>
            </div>
          </Card>

          {/* ── Top Clients + Recent Interactions ────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Top Clients */}
            <Card>
              <CardHeader title="Most Active Clients" sub="By interaction count (period)" />
              <div className="divide-y divide-white/5">
                {(data?.top_clients?.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-500 p-6 text-center">No client data yet</p>
                ) : (
                  data.top_clients.map((c, i) => {
                    const meta = CHANNEL_META[c.channel] || { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' };
                    return (
                      <div key={c.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                        <span className="text-xs font-black text-slate-600 w-4 flex-shrink-0">#{i + 1}</span>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black"
                          style={{ background: meta.bg, color: meta.color }}>
                          {(c.name || c.phone || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{c.name !== 'Anonymous' ? c.name : c.phone}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{c.phone}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-black text-white">{c.interactions}</span>
                          <p className="text-[10px] text-slate-500">msgs</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Action Required */}
            <Card>
              <CardHeader title="AI Health Monitor" sub="System quality signals" />
              <div className="p-6 space-y-4">
                {[
                  {
                    label: 'Successful Responses',
                    value: total - fallbacks - escalated,
                    total,
                    color: '#34d399',
                    icon: <CheckCircle2 size={15} />,
                  },
                  {
                    label: 'AI Fallbacks (No Answer)',
                    value: fallbacks,
                    total,
                    color: '#fbbf24',
                    icon: <XCircle size={15} />,
                  },
                  {
                    label: 'Escalated to Human',
                    value: escalated,
                    total,
                    color: '#f87171',
                    icon: <AlertTriangle size={15} />,
                  },
                ].map(({ label, value, total: t, color, icon }) => (
                  <div key={label} className="p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2" style={{ color }}>
                        {icon}
                        <span className="text-xs font-semibold text-slate-300">{label}</span>
                      </div>
                      <span className="text-base font-black" style={{ color }}>{value}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct(value, t)}%`, background: color }} />
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">{pct(value, t)}% of total</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Recent Interactions Table ─────────────────────────── */}
          <Card>
            <CardHeader title="Recent Interactions" sub="Last 20 AI conversations" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Client', 'Channel', 'Intent', 'Sentiment', 'Latency', 'Status', 'Time'].map(h => (
                      <th key={h} className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {(data?.recent_interactions?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                        No interactions in this period. Activity will appear here as messages come in.
                      </td>
                    </tr>
                  ) : (
                    data.recent_interactions.map(row => {
                      const chMeta = CHANNEL_META[row.channel] || { color: '#6366f1', label: row.channel };
                      const sentMeta = SENTIMENT_META[row.sentiment] || { color: '#94a3b8', icon: <Meh size={13}/>, label: '—' };
                      return (
                        <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3 font-mono text-slate-300">{row.client_name !== 'Anonymous' ? row.client_name : row.client_phone}</td>
                          <td className="px-5 py-3">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                              style={{ background: chMeta.bg || `${chMeta.color}15`, color: chMeta.color }}>
                              {chMeta.label || row.channel}
                            </span>
                          </td>
                          <td className="px-5 py-3 capitalize text-slate-400">{(row.intent || '—').replace(/_/g, ' ')}</td>
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-1.5" style={{ color: sentMeta.color }}>
                              {sentMeta.icon} {sentMeta.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-400">
                            {row.response_time_ms > 0 ? `${row.response_time_ms}ms` : '—'}
                          </td>
                          <td className="px-5 py-3">
                            {row.was_escalated
                              ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400">Escalated</span>
                              : row.was_fallback
                              ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">Fallback</span>
                              : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Success</span>
                            }
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {row.created_at ? new Date(row.created_at).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Footer ─────────────────────────────────────────────── */}
          <p className="text-center text-[10px] text-slate-600 pb-4">
            Analytics data for <strong className="text-slate-500">Sahara Gold & Diamond</strong> · Generated {data?.generated_at ? new Date(data.generated_at).toLocaleString() : '—'}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
