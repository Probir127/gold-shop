import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, getMe } from '../api';
import { LogIn, Lock, User, Sparkles } from 'lucide-react';
import BrandMark from '../../components/BrandMark';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiLogin(username, password);
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      const me = await getMe();
      const user = me.data.user || {};
      const memberships = me.data.memberships || [];

      // Staff / superusers bypass tenant membership requirement
      if (user.is_staff || user.is_superuser) {
        const slug = memberships[0]?.tenant_slug || 'default';
        localStorage.setItem('tenant_slug', slug);
        localStorage.setItem('is_staff', 'true');
        navigate('/admin');
        return;
      }

      if (memberships.length === 0) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        throw new Error('No tenant membership');
      }
      const currentSlug = localStorage.getItem('tenant_slug');
      const activeMembership = memberships.find(item => item.tenant_slug === currentSlug) || memberships[0];
      localStorage.setItem('tenant_slug', activeMembership.tenant_slug);
      navigate('/admin');
    } catch (err) {
      const serverMsg = err.response?.data?.detail;
      if (serverMsg) {
        setError(serverMsg);
      } else if (err.message === 'No tenant membership') {
        setError('This account has no store access. Log in with admin or shara_gold credentials.');
      } else {
        setError('Invalid credentials. Please verify your username/email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[200px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[200px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Header brand */}
        <div className="text-center mb-8">
          <BrandMark variant="hero" />
          <p className="text-[#d4af37] text-xs uppercase tracking-[0.2em] font-bold">Command Center & AI Hub</p>
          <p className="text-slate-500 text-xs mt-2">Unified operations + concierge management</p>
        </div>

        {/* Login card */}
        <div className="glass-premium rounded-3xl border border-white/10 overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.5)]">
          {/* Gold accent line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-60" />

          <div className="p-8">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Username or Email
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#0c0c0e] border border-white/10 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] outline-none transition-all placeholder:text-slate-600"
                    placeholder="admin or saharagold19@gmail.com"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0c0c0e] border border-white/10 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] outline-none transition-all placeholder:text-slate-600"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] text-black font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Authenticating...</>
                ) : (
                  <><LogIn size={18} /> Access Command Center</>
                )}
              </button>
            </form>

            {/* Admin hint */}
            <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Sparkles size={12} className="text-[#d4af37]/60" />
              <span>Unified System on <code className="text-[#d4af37]">{import.meta.env.VITE_API_URL || `${window.location.origin}/api`}</code></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
