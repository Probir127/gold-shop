import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getInvoices, sendInvoice, getClients, getServices, createInvoice, markInvoicePaid, openInvoiceHTML } from '../api';
import Sidebar from '../components/Sidebar';
import toast from '../components/Toast';
import { FileText, Search, Filter, Plus, ChevronRight, X, ExternalLink, RefreshCw, Send, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const Invoices = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialClient = searchParams.get('client_id');

  const [invoices, setInvoices]         = useState([]);
  const [clients, setClients]           = useState([]);
  const [services, setServices]         = useState([]);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading]           = useState(true);

  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [generating, setGenerating]     = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: initialClient || '',
    service_id: '',
    amount: '',
    notes: '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    document.title = 'Invoices | GrownK Dashboard';
    fetchData();
    if (initialClient) {
      setIsModalOpen(true);
      setFormData(prev => ({ ...prev, client_id: initialClient }));
    }
  }, [initialClient]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, cliRes, srvRes] = await Promise.all([
        getInvoices(), getClients(), getServices()
      ]);
      setInvoices(invRes.data.results || invRes.data);
      setClients(cliRes.data.results || cliRes.data);
      setServices(srvRes.data.results || srvRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.client_id || !formData.amount || !formData.due_date) {
      return toast.warning('Client, amount, and due date are required.');
    }
    setGenerating(true);
    try {
      await createInvoice({
        ...formData,
        client: formData.client_id,
        total_amount: formData.amount,
      });
      setIsModalOpen(false);
      fetchData();
      toast.success('Invoice Generated successfully.');
      setFormData({ client_id: '', service_id: '', amount: '', notes: '', due_date: '' });
    } catch (err) {
      toast.error('Failed to generate invoice.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (id) => {
    try {
      const res = await sendInvoice(id);
      const data = res.data || {};
      if (data.email_sent) {
        toast.success('Invoice PDF generated & sent via Email!');
      } else if (data.whatsapp_response?.messages) {
        toast.success('Invoice sent via WhatsApp!');
      } else {
        toast.success('Invoice PDF generated and marked as Sent!');
      }
      fetchData();
    } catch (err) {
      toast.error('Failed to send invoice.');
    }
  };

  const handleMarkPaid = async (id) => {
    if (!window.confirm('Mark this invoice as Paid?')) return;
    try {
      await markInvoicePaid(id);
      toast.success('Invoice marked as Paid.');
      fetchData();
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) || 
                        inv.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="admin-invoices flex bg-transparent h-screen text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar max-w-[1600px] mx-auto w-full relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Financial Operations
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-slate-400 tracking-tight flex items-center gap-4 drop-shadow-sm">
              Invoices
            </h1>
            <p className="text-base text-slate-400 mt-3 font-medium max-w-xl">
              Create, track, and manage your billing directly via WhatsApp integrations.
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group relative inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative flex items-center gap-2 drop-shadow-md z-10 group-hover:text-white transition-colors duration-300">
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" /> New Invoice
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <div className="flex-1 glass rounded-2xl p-[1px] group overflow-hidden focus-within:bg-gradient-to-r focus-within:from-emerald-500/50 focus-within:to-teal-500/50 transition-all duration-300">
            <div className="bg-[#030712]/80 backdrop-blur-md rounded-2xl px-5 py-3.5 flex items-center h-full w-full">
              <Search className="text-slate-500 mr-3 group-focus-within:text-emerald-400 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search invoices by number or client..."
                className="bg-transparent border-none outline-none w-full text-base text-white placeholder:text-slate-500 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="glass rounded-2xl p-[1px] group overflow-hidden focus-within:bg-gradient-to-r focus-within:from-teal-500/50 focus-within:to-cyan-500/50 transition-all duration-300 min-w-[220px]">
            <div className="bg-[#030712]/80 backdrop-blur-md rounded-2xl px-5 py-3.5 flex items-center relative h-full w-full">
              <Filter className="text-slate-500 mr-3 group-focus-within:text-teal-400 transition-colors" size={20} />
              <select
                className="bg-transparent border-none outline-none text-base text-white w-full appearance-none pr-6 cursor-pointer font-medium"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all" className="bg-[#030712]">All Statuses</option>
                <option value="draft" className="bg-[#030712]">Draft</option>
                <option value="sent" className="bg-[#030712]">Sent / Unpaid</option>
                <option value="paid" className="bg-[#030712]">Paid</option>
                <option value="overdue" className="bg-[#030712]">Overdue</option>
              </select>
              <ChevronRight size={16} className="absolute right-5 pointer-events-none text-slate-500 rotate-90" />
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
          <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 glass border-white/10 rounded-2xl shadow-lg">
            <div className="col-span-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Invoice Details</div>
            <div className="col-span-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Client</div>
            <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</div>
            <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</div>
            <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</div>
          </div>

          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-24 glass rounded-3xl animate-pulse border border-white/5"></div>
            ))
          ) : filteredInvoices.length > 0 ? (
            filteredInvoices.map((inv, idx) => (
              <div 
                key={inv.id} 
                className="group relative grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-6 md:px-8 md:py-6 glass border-white/5 hover:border-white/20 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] overflow-hidden"
                style={{ animationFillMode: 'both', animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent to-transparent group-hover:from-emerald-500 group-hover:to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="md:col-span-3 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-[#030712] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors shadow-inner shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-lg text-white group-hover:text-emerald-100 transition-colors drop-shadow-sm font-mono tracking-tight">{inv.invoice_number}</div>
                    <span className="text-sm text-slate-400 font-medium">Due: {inv.due_date || 'N/A'}</span>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Client</span>
                  <div className="font-semibold text-slate-200 truncate pr-4">{inv.client_name || 'Unknown Client'}</div>
                </div>

                <div className="md:col-span-2">
                  <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Amount</span>
                  <div className="text-xl font-black text-white tracking-tight drop-shadow-sm">৳{inv.amount}</div>
                </div>

                <div className="md:col-span-2">
                  <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm border ${
                    inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    inv.status === 'sent' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    inv.status === 'overdue' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    {inv.status === 'paid' && <CheckCircle2 size={12} />}
                    {inv.status === 'overdue' && <AlertTriangle size={12} />}
                    {inv.status === 'sent' && <Send size={12} />}
                    {inv.status === 'draft' && <Clock size={12} />}
                    {inv.status}
                  </span>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2">
                  {inv.status !== 'paid' && (
                    <>
                      <button 
                        onClick={() => handleSend(inv.id)}
                        className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300"
                        title="Send via WhatsApp"
                      >
                        <Send size={16} />
                      </button>
                      <button 
                        onClick={() => handleMarkPaid(inv.id)}
                        className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300"
                        title="Mark as Paid"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => openInvoiceHTML(inv.id, 'admin').catch(() => toast.error('Failed to open invoice.'))}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-[#d4af37] border border-[#d4af37]/30 hover:bg-[#d4af37] hover:text-black text-xs font-bold transition-all duration-300 flex items-center gap-1"
                    title="View Store / Admin Copy (Dispatch Slip)"
                  >
                    <span>Store</span>
                    <ExternalLink size={12} />
                  </button>
                  <button
                    onClick={() => openInvoiceHTML(inv.id, 'customer', inv.hosted_url).catch(() => toast.error('Failed to open invoice.'))}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 text-slate-300 border border-white/10 hover:bg-white/20 hover:text-white text-xs font-medium transition-all duration-300 flex items-center gap-1"
                    title="View Customer Copy (Hallmark Certificate)"
                  >
                    <span>Customer</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-24 flex flex-col items-center justify-center glass rounded-3xl border border-white/5">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-800 to-[#030712] flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                <FileText size={32} className="text-slate-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Invoices Found</h3>
              <p className="text-base text-slate-400 text-center max-w-sm">You haven't generated any invoices yet. Create your first one now.</p>
            </div>
          )}
        </div>
      </main>

      {/* Invoice Generator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#030712]/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-2xl glass-premium rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[200px] bg-gradient-to-b from-emerald-600/20 to-transparent pointer-events-none blur-2xl"></div>

            <div className="flex justify-between items-center p-8 border-b border-white/5 relative z-10">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <FileText size={20} />
                  </div>
                  Generate Invoice
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar relative z-10">
              <form id="invoice-form" onSubmit={handleGenerate} className="space-y-8">
                
                <div className="grid grid-cols-1 gap-8">
                  <div className="relative">
                    <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">Select Client <span className="text-rose-400 text-lg leading-none">*</span></label>
                    <select 
                      className="w-full bg-[#030712]/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all appearance-none cursor-pointer font-medium"
                      value={formData.client_id}
                      onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                      required
                    >
                      <option value="" className="text-slate-500">-- Choose Client --</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.phone}</option>)}
                    </select>
                    <ChevronRight size={18} className="absolute right-5 top-12 pointer-events-none text-slate-500 rotate-90" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Service (Optional)</label>
                    <select 
                      className="w-full bg-[#030712]/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer font-medium"
                      value={formData.service_id}
                      onChange={(e) => setFormData({...formData, service_id: e.target.value})}
                    >
                      <option value="" className="text-slate-500">-- Select --</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronRight size={18} className="absolute right-5 top-12 pointer-events-none text-slate-500 rotate-90" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">Amount (BDT) <span className="text-rose-400 text-lg leading-none">*</span></label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">৳</span>
                      <input 
                        type="number" step="0.01"
                        className="w-full bg-[#030712]/50 border border-white/10 rounded-2xl px-5 py-4 pl-10 text-base text-white font-mono font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">Due Date <span className="text-rose-400 text-lg leading-none">*</span></label>
                  <input 
                    type="date" 
                    className="w-full bg-[#030712]/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all cursor-pointer font-medium"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Notes / Description</label>
                  <textarea 
                    className="w-full bg-[#030712]/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none h-24 custom-scrollbar font-medium placeholder:text-slate-600"
                    placeholder="Description of services rendered..."
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
                Cancel
              </button>
              <button 
                type="submit"
                form="invoice-form"
                disabled={generating}
                className="group relative inline-flex items-center justify-center px-10 py-3.5 text-sm font-black text-black uppercase tracking-widest transition-all duration-300 bg-white rounded-xl overflow-hidden hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white via-slate-200 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2">
                  {generating ? 'Generating...' : 'Create Invoice'} {generating ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} className="group-hover:rotate-90 transition-transform" />}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
