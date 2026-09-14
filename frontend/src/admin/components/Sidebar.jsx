import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, TrendingUp, Diamond, 
  Users, FileText, FlaskConical, BarChart2, Brain, LogOut, 
  ChevronDown, Sparkles, Shield
} from 'lucide-react';
import { getMe } from '../api';

const navSections = [
  {
    title: 'STORE OPERATIONS',
    items: [
      { to: '/admin',              label: 'Overview',        icon: LayoutDashboard },
      { to: '/admin/orders',       label: 'Orders & Dispatch',icon: ShoppingBag     },
      { to: '/admin/gold-rates',   label: 'Daily Gold Rates',icon: TrendingUp      },
      { to: '/admin/products',     label: 'Jewelry Catalog', icon: Diamond         },
      { to: '/admin/invoices',     label: 'Gold Invoices',   icon: FileText        },
    ]
  },
  {
    title: 'AI & CONCIERGE',
    items: [
      { to: '/admin/clients',      label: 'CRM & Inbox',     icon: Users           },
      { to: '/admin/bot-tester',   label: 'AI Bot Sandbox',  icon: FlaskConical    },
      { to: '/admin/bot-training', label: 'Bot Training & RAG', icon: Brain        },
      { to: '/admin/analytics',    label: 'AI Analytics',    icon: BarChart2       },
    ]
  }
];

const Sidebar = () => {
  const [memberships, setMemberships] = useState([]);
  const [activeTenant, setActiveTenant] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getMe();
        const m = res.data.memberships || [];
        setMemberships(m);
        
        const currentSlug = localStorage.getItem('tenant_slug');
        const active = m.find(x => x.tenant_slug === currentSlug) || m[0];
        
        if (active) {
          setActiveTenant(active);
          if (!currentSlug) localStorage.setItem('tenant_slug', active.tenant_slug);
        } else if (res.data.user) {
          // Default fallback
          const defSlug = 'sahara-gold';
          localStorage.setItem('tenant_slug', defSlug);
          setActiveTenant({ tenant_name: 'Sahara Gold & Diamond', tenant_slug: defSlug, role: 'admin' });
        }
      } catch (e) {
        console.error("Failed to fetch profile");
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('tenant_slug');
    window.location.href = '/admin/login';
  };

  return (
    <div className="w-64 bg-[#0c0c0e] h-screen sticky top-0 flex flex-col px-4 py-6 border-r border-white/5 select-none shrink-0 overflow-y-auto">
      
      {/* Sahara Gold Brand Identity */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#d4af37] to-[#f4d03f] flex items-center justify-center text-black font-serif font-black text-lg shadow-[0_0_15px_rgba(212,175,55,0.4)] border border-[#ffec99]">
          SG
        </div>
        <div>
          <h1 className="text-base font-bold text-[#f5ebd7] tracking-tight leading-none mb-1 font-serif">Sahara Gold</h1>
          <p className="text-[10px] text-[#d4af37] font-semibold tracking-wider uppercase leading-none">Command Center</p>
        </div>
      </div>

      {/* Active Store Badge */}
      <div className="mb-6 px-2">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#16161b] border border-white/5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-white truncate">{activeTenant?.tenant_name || 'Sahara Gold Storefront'}</p>
            <p className="text-[10px] text-slate-500 font-mono">{activeTenant?.role ? `${activeTenant.role.toUpperCase()} ACCESS` : 'PORT 8000 SYNC'}</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 space-y-6">
        {navSections.map((sec, sIdx) => (
          <div key={sIdx}>
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 tracking-wider">
              {sec.title}
            </div>
            <nav className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#d4af37]/20 to-transparent text-[#f5ebd7] border-l-2 border-[#d4af37] font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-[#d4af37]' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Storefront Link & Logout */}
      <div className="pt-4 border-t border-white/5 space-y-2 mt-4">
        <NavLink
          to="/"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#d4af37] hover:bg-[#d4af37]/10 transition border border-[#d4af37]/20"
        >
          <span>View Customer Storefront</span>
          <span>↗</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
