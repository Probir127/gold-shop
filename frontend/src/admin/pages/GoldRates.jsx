import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getGoldRatesHistory, getLatestGoldRate, updateGoldRate, getLiveGoldMarket, syncLiveGoldRate } from '../api';
import toast from '../components/Toast';
import { queryClient } from '../../queryClient';
import { TrendingUp, RefreshCw, CheckCircle, Clock, AlertCircle, Sparkles, Globe, Zap, ArrowUpRight, DollarSign } from 'lucide-react';

const GoldRates = () => {
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [liveMarket, setLiveMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    rate_22k: '',
    rate_21k: '',
    rate_18k: '',
    rate_traditional: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [histRes, latestRes] = await Promise.all([
        getGoldRatesHistory(),
        getLatestGoldRate()
      ]);

      const historyData = histRes.data.results || histRes.data || [];
      setHistory(historyData);

      const latestData = latestRes.data || null;
      setLatest(latestData);

      if (latestData) {
        setForm({
          date: new Date().toISOString().split('T')[0],
          rate_22k: latestData.rate_22k || '',
          rate_21k: latestData.rate_21k || '',
          rate_18k: latestData.rate_18k || '',
          rate_traditional: latestData.rate_traditional || ''
        });
      }
    } catch (err) {
      toast.error('Failed to load gold rate history');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveMarket = async () => {
    setMarketLoading(true);
    try {
      const res = await getLiveGoldMarket();
      if (res.data?.status === 'success') {
        setLiveMarket(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch live market', err);
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchLiveMarket();
  }, []);

  const handleSyncLive = async () => {
    setSyncing(true);
    try {
      const res = await syncLiveGoldRate();
      toast.success(res.data?.message || 'Live gold rates synced successfully!');
      if (res.data?.rate) {
        setLatest(res.data.rate);
        setForm({
          date: res.data.rate.date,
          rate_22k: res.data.rate.rate_22k,
          rate_21k: res.data.rate.rate_21k,
          rate_18k: res.data.rate.rate_18k,
          rate_traditional: res.data.rate.rate_traditional
        });
      }
      fetchData();
      fetchLiveMarket();
      queryClient.invalidateQueries({ queryKey: ['goldRates'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to sync with live market';
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateGoldRate({
        date: form.date,
        rate_22k: Number(form.rate_22k),
        rate_21k: Number(form.rate_21k),
        rate_18k: Number(form.rate_18k),
        rate_traditional: Number(form.rate_traditional)
      });
      toast.success("Today's Gold Rates updated! Storefront and AI Concierge synchronized.");
      fetchData();
      queryClient.invalidateQueries({ queryKey: ['goldRates'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update gold rate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-gold-rates flex bg-[#09090b] text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 text-[#d4af37] text-xs font-semibold uppercase tracking-wider mb-1">
              <TrendingUp size={14} /> Price Engine
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Daily Gold Rates & Live Market</h1>
            <p className="text-slate-400 text-sm">Control live storefront prices, real-time market API feeds, and AI quotation formulas</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncLive}
              disabled={syncing}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Zap size={16} className={syncing ? "animate-spin" : ""} />
              {syncing ? 'Syncing Live API...' : 'Sync Live Market Rate'}
            </button>
            <button
              onClick={() => { fetchData(); fetchLiveMarket(); }}
              className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition border border-white/10 flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading || marketLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Live International Market Banner */}
        {liveMarket && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-[#171a23] via-[#1b1c26] to-[#16171d] border border-cyan-500/20 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Globe size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Live Market Feed</span>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    Source: {liveMarket.source}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div>
                  <div className="text-[11px] text-slate-400">USD / Troy Ounce</div>
                  <div className="text-base font-bold text-white font-mono">
                    ${Number(liveMarket.price_usd_per_oz || 0).toLocaleString()}
                  </div>
                </div>
                <div className="h-8 w-px bg-white/10 hidden sm:block" />
                <div>
                  <div className="text-[11px] text-slate-400">USD / Gram</div>
                  <div className="text-base font-bold text-white font-mono">
                    ${Number(liveMarket.price_usd_per_gram || 0).toFixed(2)}
                  </div>
                </div>
                <div className="h-8 w-px bg-white/10 hidden sm:block" />
                <div>
                  <div className="text-[11px] text-slate-400">Computed 24K BDT</div>
                  <div className="text-base font-bold text-[#d4af37] font-mono">
                    ৳{Number(liveMarket.rate_24k || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Active Rates Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1a1711] to-[#241f15] border border-[#d4af37]/30 shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">22K Hallmarked Gold</span>
            <div className="text-3xl font-extrabold text-white mt-2">
              ৳{Number(latest?.rate_22k || 0).toLocaleString()}
              <span className="text-xs text-slate-400 font-normal"> /gm</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Bridal sets & traditional jewelry</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#141418] border border-white/5 shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">21K Hallmarked Gold</span>
            <div className="text-3xl font-extrabold text-white mt-2">
              ৳{Number(latest?.rate_21k || 0).toLocaleString()}
              <span className="text-xs text-slate-400 font-normal"> /gm</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Everyday rings & bangles</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#141418] border border-white/5 shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">18K Hallmarked Gold</span>
            <div className="text-3xl font-extrabold text-white mt-2">
              ৳{Number(latest?.rate_18k || 0).toLocaleString()}
              <span className="text-xs text-slate-400 font-normal"> /gm</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Diamond settings & modern wear</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#141418] border border-white/5 shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Traditional Gold</span>
            <div className="text-3xl font-extrabold text-white mt-2">
              ৳{Number(latest?.rate_traditional || 0).toLocaleString()}
              <span className="text-xs text-slate-400 font-normal"> /gm</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Sanaton / heritage bullion</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rate Update Form */}
          <div className="lg:col-span-1 bg-[#121215] border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 text-white font-bold text-base mb-1">
              <Sparkles size={16} className="text-[#d4af37]" /> Publish Today's Rate
            </div>
            <p className="text-xs text-slate-400 mb-6">Rates immediately propagate to the website ticker, product catalogs, and AI bot.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Effective Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#d4af37] uppercase mb-1.5">22K Rate (BDT/gm)</label>
                <input
                  type="number"
                  value={form.rate_22k}
                  onChange={(e) => setForm({ ...form, rate_22k: e.target.value })}
                  placeholder="e.g. 15467"
                  required
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">21K Rate (BDT/gm)</label>
                <input
                  type="number"
                  value={form.rate_21k}
                  onChange={(e) => setForm({ ...form, rate_21k: e.target.value })}
                  placeholder="e.g. 14774"
                  required
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">18K Rate (BDT/gm)</label>
                <input
                  type="number"
                  value={form.rate_18k}
                  onChange={(e) => setForm({ ...form, rate_18k: e.target.value })}
                  placeholder="e.g. 12664"
                  required
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Traditional Rate (BDT/gm)</label>
                <input
                  type="number"
                  value={form.rate_traditional}
                  onChange={(e) => setForm({ ...form, rate_traditional: e.target.value })}
                  placeholder="e.g. 10553"
                  required
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] text-black font-bold text-sm hover:brightness-110 transition shadow-lg disabled:opacity-50"
              >
                {saving ? 'Publishing Rates...' : 'Publish Official Rates'}
              </button>
            </form>
          </div>

          {/* Historical Rates Table */}
          <div className="lg:col-span-2 bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#18181b]">
              <h3 className="font-bold text-white text-base">Historical Rate Records</h3>
              <span className="text-xs text-slate-400">{history.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#141418] text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="px-6 py-3.5">Effective Date</th>
                    <th className="px-6 py-3.5 text-[#d4af37]">22K /gm</th>
                    <th className="px-6 py-3.5">21K /gm</th>
                    <th className="px-6 py-3.5">18K /gm</th>
                    <th className="px-6 py-3.5">Traditional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-3.5 font-mono text-xs text-white">
                        {row.date}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-[#d4af37]">
                        ৳{Number(row.rate_22k).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-slate-200">
                        ৳{Number(row.rate_21k).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-slate-300">
                        ৳{Number(row.rate_18k).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-slate-400">
                        ৳{Number(row.rate_traditional).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GoldRates;
