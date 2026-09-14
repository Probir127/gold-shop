import React, { useEffect, useState } from 'react';
import { getClients, createClient, getServices } from '../api';
import Sidebar from '../components/Sidebar';
import { Search, Filter, Plus, ChevronRight, X, AlertTriangle, Users, Briefcase, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from '../components/Toast';

const Clients = () => {
  const [clients, setClients]           = useState([]);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modeFilter, setModeFilter]     = useState('all');
  const [loading, setLoading]           = useState(true);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    name: '', phone: '', service_selected: '', status: 'lead', notes: ''
  });

  useEffect(() => {
    fetchClients(true);
    const interval = setInterval(() => fetchClients(false), 15000);
    return () => { clearInterval(interval); document.title = 'GrownK Dashboard'; };
  }, [statusFilter]);

  const fetchClients = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await getClients(params);
      const list = res.data.results || res.data;
      setClients(list);
      
      const pending = list.filter(c => c.conversation_mode === 'pending').length;
      document.title = pending > 0 ? `(⚠ ${pending}) GrownK Dashboard` : 'GrownK Dashboard';
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = async () => {
    setIsModalOpen(true);
    if (services.length === 0) {
      try {
        const res = await getServices();
        setServices(res.data.results || res.data);
      } catch (err) { console.error(err); }
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phone) return toast.warning('WhatsApp phone number is required.');

    try {
      await createClient(formData);
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', service_selected: '', status: 'lead', notes: '' });
      fetchClients();
      toast.success('Client added successfully');
    } catch (err) {
      toast.error('Failed to add client. Number may exist.');
    }
  };

  const pendingCount = clients.filter(c => c.conversation_mode === 'pending').length;

  const filteredClients = clients.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchMode   = modeFilter   === 'all' || c.conversation_mode === modeFilter;
    return matchSearch && matchStatus && matchMode;
  });

  return (
    <div className="flex bg-transparent h-screen text-slate-300 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar max-w-[1600px] mx-auto w-full relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Client Roster
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-slate-400 tracking-tight flex items-center gap-4 drop-shadow-sm">
              Clients
              {pendingCount > 0 && (
                <span className="text-lg bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-full flex items-center gap-2 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <AlertTriangle size={18} className="animate-pulse" /> {pendingCount} Pending
                </span>
              )}
            </h1>
            <p className="text-base text-slate-400 mt-3 font-medium max-w-xl">
              Manage incoming leads, ongoing relationships, and conversation status.
            </p>
          </div>
          <button 
            onClick={openAddModal}
            className="group relative inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative flex items-center gap-2 drop-shadow-md z-10 group-hover:text-white transition-colors duration-300">
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" /> Add Client
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <div className="flex-1 glass rounded-2xl p-[1px] group overflow-hidden focus-within:bg-gradient-to-r focus-within:from-blue-500/50 focus-within:to-indigo-500/50 transition-all duration-300">
            <div className="bg-[#030712]/80 backdrop-blur-md rounded-2xl px-5 py-3.5 flex items-center h-full w-full">
              <Search className="text-slate-500 mr-3 group-focus-within:text-blue-400 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search by name or number..."
                className="bg-transparent border-none outline-none w-full text-base text-white placeholder:text-slate-500 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="glass rounded-2xl p-[1px] group overflow-hidden focus-within:bg-gradient-to-r focus-within:from-indigo-500/50 focus-within:to-purple-500/50 transition-all duration-300 min-w-[220px]">
            <div className="bg-[#030712]/80 backdrop-blur-md rounded-2xl px-5 py-3.5 flex items-center relative h-full w-full">
              <Filter className="text-slate-500 mr-3 group-focus-within:text-indigo-400 transition-colors" size={20} />
              <select
                className="bg-transparent border-none outline-none text-base text-white w-full appearance-none pr-6 cursor-pointer font-medium"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all" className="bg-[#030712]">All Status</option>
                <option value="lead" className="bg-[#030712]">Lead</option>
                <option value="active" className="bg-[#030712]">Active</option>
                <option value="invoiced" className="bg-[#030712]">Invoiced</option>
                <option value="completed" className="bg-[#030712]">Completed</option>
              </select>
              <ChevronRight size={16} className="absolute right-5 pointer-events-none text-slate-500 rotate-90" />
            </div>
          </div>

          <button
            onClick={() => setModeFilter(modeFilter === 'pending' ? 'all' : 'pending')}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 border uppercase tracking-wider ${
              modeFilter === 'pending'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'glass hover:bg-white/5 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle size={18} className={modeFilter === 'pending' ? 'animate-pulse' : ''} /> 
            Needs Agent
            {pendingCount > 0 && <span className="bg-amber-500 text-black px-2 py-0.5 rounded-md text-xs">{pendingCount}</span>}
          </button>
        </div>

        {/* Clients List - Premium Grid */}
        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
          <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 glass border-white/10 rounded-2xl shadow-lg">
            <div className="col-span-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Client Identity</div>
            <div className="col-span-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Service</div>
            <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</div>
            <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Joined</div>
            <div className="col-span-1 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Action</div>
          </div>

          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-24 glass rounded-3xl animate-pulse border border-white/5"></div>
            ))
          ) : filteredClients.length > 0 ? (
            filteredClients.map((client, idx) => (
              <div 
                key={client.id} 
                onClick={() => navigate(`/clients/${client.id}`)}
                className="group relative grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-6 md:px-8 md:py-6 glass border-white/5 hover:border-white/20 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] cursor-pointer overflow-hidden"
                style={{ animationFillMode: 'both', animationDelay: `${idx * 50}ms` }}
              >
                <div className={`absolute left-0 top-0 w-1 h-full bg-gradient-to-b ${client.conversation_mode === 'pending' ? 'from-amber-400 to-orange-600' : 'from-transparent to-transparent group-hover:from-blue-500 group-hover:to-indigo-500'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                <div className="md:col-span-4 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-[#030712] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors shadow-inner">
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-100 transition-colors drop-shadow-sm">{client.name || 'Anonymous Lead'}</h3>
                      {client.conversation_mode === 'pending' && <span className="p-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 animate-pulse" title="Needs Agent"><AlertTriangle size={10} /></span>}
                    </div>
                    <span className="text-sm text-slate-400 font-mono font-medium flex items-center gap-1 mt-0.5"><Phone size={12} className="opacity-50" /> {client.phone}</span>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Service</span>
                  <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    {client.service_selected ? <><Briefcase size={14} className="text-slate-500" /> {client.service_selected}</> : <span className="italic opacity-50">Undecided</span>}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm border ${
                    client.status === 'active' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                    client.status === 'completed' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    client.status === 'invoiced' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full bg-current ${client.status === 'active' ? 'animate-pulse' : ''}`}></div>
                    {client.status}
                  </span>
                </div>

                <div className="md:col-span-2">
                  <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Joined</span>
                  <div className="text-sm font-semibold text-slate-300">
                    {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                <div className="md:col-span-1 flex justify-end">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all duration-300 group-hover:scale-110 shadow-sm">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-24 flex flex-col items-center justify-center glass rounded-3xl border border-white/5">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-800 to-[#030712] flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                <Users size={32} className="text-slate-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Clients Found</h3>
              <p className="text-base text-slate-400 text-center max-w-sm">Adjust your filters or manually add a new lead to the pipeline.</p>
            </div>
          )}
        </div>
      </main>

      {/* Stunning Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#030712]/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-3xl glass-premium rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[200px] bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none blur-2xl"></div>

            <div className="flex justify-between items-center p-8 border-b border-white/5 relative z-10">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <Users size={20} />
                  </div>
                  Add New Client
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar relative z-10">
              <form id="add-client-form" onSubmit={handleAddSubmit} className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Full Name</label>
                    <input 
                      type="text"
                      className="w-full bg-[#030712]/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                      placeholder="e.g. Jane Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">WhatsApp Number <span className="text-rose-400 text-lg leading-none">*</span></label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text"
                        className="w-full bg-[#030712]/50 border border-white/10 rounded-2xl px-5 py-4 pl-12 text-base text-white font-mono font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder="8801712345678"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Service Interest</label>
                    <select 
                      className="w-full bg-[#030712]/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer font-medium"
                      value={formData.service_selected}
                      onChange={(e) => setFormData({...formData, service_selected: e.target.value})}
                    >
                      <option value="" className="text-slate-500">-- Select (Optional) --</option>
                      {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <ChevronRight size={18} className="absolute right-5 top-12 pointer-events-none text-slate-500 rotate-90" />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Status</label>
                    <select 
                      className="w-full bg-[#030712]/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer font-medium"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="lead">Lead</option>
                      <option value="active">Active</option>
                      <option value="invoiced">Invoiced</option>
                      <option value="completed">Completed</option>
                    </select>
                    <ChevronRight size={18} className="absolute right-5 top-12 pointer-events-none text-slate-500 rotate-90" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Internal Notes</label>
                  <textarea 
                    className="w-full bg-[#030712]/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none h-32 custom-scrollbar font-medium placeholder:text-slate-600"
                    placeholder="Context, budget, requirements..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  ></textarea>
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-white/5 bg-black/20 flex justify-end gap-4 relative z-10">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3.5 text-sm font-bold text-slate-400 hover:text-white bg-transparent hover:bg-white/5 rounded-xl transition-all duration-300"
              >
                Discard
              </button>
              <button 
                type="submit"
                form="add-client-form"
                className="group relative inline-flex items-center justify-center px-10 py-3.5 text-sm font-black text-black uppercase tracking-widest transition-all duration-300 bg-white rounded-xl overflow-hidden hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white via-slate-200 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2">
                  Create Lead <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
