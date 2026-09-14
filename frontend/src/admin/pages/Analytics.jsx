import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getBotAnalytics } from '../api';
import { BarChart2, AlertCircle, Zap, TrendingUp, RefreshCcw, Smile, Meh, Frown, ChevronDown } from 'lucide-react';

const pct = (n, total) => (total === 0 ? 0 : Math.round((n / total) * 100));

const INTENT_COLORS = {
  greeting:    'bg-blue-500',
  pricing:     'bg-purple-500',
  complaint:   'bg-red-500',
  human_agent: 'bg-orange-500',
  thanks:      'bg-emerald-500',
  general:     'bg-slate-500',
};

const KpiCard = ({ label, value, sub, icon: Icon }) => (
  <div className="p-6 bg-[#121214] border border-white/5 rounded-2xl flex flex-col gap-4">
    <div className="flex items-center justify-between text-slate-400">
      <span className="text-sm font-medium">{label}</span>
      <Icon size={16} />
    </div>
    <div>
      <h3 className="text-3xl font-semibold text-white tracking-tight">{value}</h3>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  </div>
);

const Analytics = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('7');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getBotAnalytics({ days: period });
      setData(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [period]);

  const total      = data.length;
  const fallbacks  = data.filter(d => d.was_fallback).length;
  const escalated  = data.filter(d => d.was_escalated).length;
  const avgLatency = total === 0 ? 0 : Math.round(data.reduce((s, d) => s + (d.response_time_ms || 0), 0) / total);

  const intentMap = {};
  data.forEach(d => { intentMap[d.intent] = (intentMap[d.intent] || 0) + 1; });
  const intents = Object.entries(intentMap).sort((a, b) => b[1] - a[1]);

  const sentimentMap = { positive: 0, neutral: 0, negative: 0 };
  data.forEach(d => { if (d.sentiment) sentimentMap[d.sentiment]++; });
  
  const sentimentDist = [
    { label: 'Positive', count: sentimentMap.positive, icon: <Smile size={16} />,   colorClass: 'text-emerald-400', bgClass: 'bg-emerald-400' },
    { label: 'Neutral',  count: sentimentMap.neutral,  icon: <Meh size={16} />,     colorClass: 'text-slate-400',   bgClass: 'bg-slate-400' },
    { label: 'Negative', count: sentimentMap.negative, icon: <Frown size={16} />,   colorClass: 'text-rose-400',    bgClass: 'bg-rose-400' },
  ];

  const recent = [...data].reverse().slice(0, 20);

  return (
    <div className="flex bg-[#09090b] min-h-screen text-slate-300 font-sans selection:bg-blue-500/30">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">Analytics</h1>
            <p className="text-sm text-slate-400 mt-2">Monitor bot performance, conversation quality, and customer sentiment.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                className="appearance-none bg-[#121214] border border-white/10 hover:border-white/20 text-sm text-white rounded-lg px-4 py-2 pr-10 outline-none cursor-pointer transition-colors"
                value={period}
                onChange={e => setPeriod(e.target.value)}
              >
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <button
              onClick={fetchData}
              className="p-2.5 bg-[#121214] border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin text-blue-400' : ''} />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total Interactions"  value={total}                        sub={`Over last ${period} days`} icon={TrendingUp} />
          <KpiCard label="Fallback Rate"       value={`${pct(fallbacks, total)}%`}  sub={`${fallbacks} API failures`} icon={AlertCircle} />
          <KpiCard label="Escalation Rate"     value={`${pct(escalated, total)}%`}  sub={`${escalated} handed to agents`} icon={AlertCircle} />
          <KpiCard label="Avg Response Time"   value={`${avgLatency}ms`}            sub="LLM processing latency" icon={Zap} />
        </div>

        {/* Charts/Distributions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Intent Distribution */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-medium text-white mb-6">Intent Distribution</h2>
            {intents.length === 0 ? (
              <p className="text-sm text-slate-500">No intent data available.</p>
            ) : (
              <div className="space-y-4">
                {intents.map(([intent, count]) => {
                  const color = INTENT_COLORS[intent] || 'bg-slate-500';
                  return (
                    <div key={intent}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-300 capitalize">{intent.replace('_', ' ')}</span>
                        <span className="text-xs text-slate-400">{count} ({pct(count, total)}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct(count, total)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sentiment Analysis */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
            <h2 className="text-base font-medium text-white mb-6">Sentiment Analysis</h2>
            <div className="space-y-5">
              {sentimentDist.map(({ label, count, icon, colorClass, bgClass }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={colorClass}>{icon}</span>
                      <span className="text-sm text-slate-300">{label}</span>
                    </div>
                    <span className="text-xs text-slate-400">{count} ({pct(count, total)}%)</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bgClass}`} style={{ width: `${pct(count, total)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Required & Quality */}
          <div className="flex flex-col gap-6">
            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6">
              <h2 className="text-base font-medium text-rose-400 flex items-center gap-2 mb-4">
                <AlertCircle size={18} /> Action Required
              </h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-rose-300/80">Unresolved Questions</span>
                <span className="text-xl font-semibold text-rose-400">{data.filter(d => !d.is_resolved).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-rose-300/80">Negative Sentiment</span>
                <span className="text-xl font-semibold text-rose-400">{sentimentMap.negative}</span>
              </div>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 flex-1">
              <h2 className="text-base font-medium text-white mb-4">Response Quality</h2>
              <div className="space-y-4">
                {[
                  { label: 'Successful Replies', count: total - fallbacks - escalated, bg: 'bg-emerald-500' },
                  { label: 'Escalated to Agent', count: escalated, bg: 'bg-rose-500' },
                  { label: 'API Fallback',       count: fallbacks, bg: 'bg-amber-500' },
                ].map(({ label, count, bg }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-300">{label}</span>
                      <span className="text-xs text-slate-400">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${bg}`} style={{ width: `${pct(count, total)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>

        {/* Table */}
        <div className="bg-[#121214] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-base font-medium text-white">Recent Interactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#09090b]">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">Client Identity</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">Intent</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">Sentiment</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">Latency</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recent.map(row => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-300">{row.client_phone || '—'}</td>
                    <td className="px-6 py-4 capitalize text-slate-400">{row.intent?.replace('_', ' ') || '—'}</td>
                    <td className="px-6 py-4">
                      {row.sentiment === 'positive' && <Smile size={16} className="text-emerald-400" />}
                      {row.sentiment === 'neutral'  && <Meh size={16} className="text-slate-400" />}
                      {row.sentiment === 'negative' && <Frown size={16} className="text-rose-400" />}
                      {!row.sentiment && <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono">
                      {row.response_time_ms > 0 ? `${row.response_time_ms}ms` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {row.was_escalated
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400">Escalated</span>
                        : row.was_fallback
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400">Fallback</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400">Success</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No interactions in this period. Wait for incoming messages to see analytics.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
