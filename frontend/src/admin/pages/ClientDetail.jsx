import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClient, getConversations, sendMessage, updateClient, toggleBot, claimHandoff, releaseHandoff } from '../api';
import Sidebar from '../components/Sidebar';
import toast from '../components/Toast';
import { Send, Phone, User, MessageSquare, Download, Bot, UserCheck, RotateCcw } from 'lucide-react';

const MODE_CONFIG = {
  bot:     { label: 'Bot Active',       color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20' },
  pending: { label: 'Needs Agent',      color: 'text-amber-400 bg-amber-400/10 border-amber-500/20' },
  agent:   { label: 'Agent Handling',   color: 'text-blue-400 bg-blue-400/10 border-blue-500/20'  },
};

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient]         = useState(null);
  const [messages, setMessages]     = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [outboundChannel, setOutboundChannel] = useState('whatsapp');
  const [notesSaved, setNotesSaved] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchData = async () => {
    try {
      const c = await getClient(id);
      setClient(c.data);
      fetchMessages();
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async () => {
    try {
      const m = await getConversations(id);
      setMessages(m.data.results || m.data);
    } catch (err) { console.error(err); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const res = await sendMessage(id, newMessage, outboundChannel);
      setNewMessage('');
      if (res.data.bot_enabled !== undefined) {
        setClient(prev => ({ ...prev, bot_enabled: res.data.bot_enabled }));
      }
      fetchMessages();
      toast.success(`Message sent via ${outboundChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to send message.`);
    }
  };

  const handleToggleBot = async () => {
    setToggling(true);
    try {
      const res = await toggleBot(id);
      setClient(prev => ({ ...prev, bot_enabled: res.data.bot_enabled }));
      toast.info(res.data.bot_enabled ? 'AI Bot enabled' : 'Manual mode active');
    } catch (err) {
      console.error(err);
      toast.error('Failed to toggle bot.');
    }
    setToggling(false);
  };

  const handleClaimHandoff = async () => {
    try {
      await claimHandoff(id);
      setClient(prev => ({ ...prev, conversation_mode: 'agent' }));
      toast.success('Conversation claimed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to claim handoff.');
    }
  };

  const handleReleaseHandoff = async () => {
    try {
      await releaseHandoff(id);
      setClient(prev => ({ ...prev, conversation_mode: 'bot', bot_enabled: true }));
      toast.success('Conversation returned to AI');
    } catch (err) {
      console.error(err);
      toast.error('Failed to release handoff.');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateClient(id, { status: newStatus });
      setClient({ ...client, status: newStatus });
    } catch (err) { console.error(err); }
  };

  const handleDownloadData = () => {
    let dataString = `=======================================\n`;
    dataString += `   GrownK Client Data Profile\n`;
    dataString += `=======================================\n\n`;
    dataString += `Client Name:      ${client.name || 'Unknown'}\n`;
    dataString += `Phone Number:     ${client.phone}\n`;
    dataString += `Current Status:   ${client.status.toUpperCase()}\n`;
    dataString += `Service Selected: ${client.service_selected}\n`;
    dataString += `Internal Notes:   ${client.notes || 'None'}\n`;
    dataString += `AI Bot:           ${client.bot_enabled ? 'ENABLED' : 'DISABLED'}\n`;
    dataString += `Created At:       ${new Date(client.created_at).toLocaleString()}\n\n`;
    dataString += `=======================================\n`;
    dataString += `   WhatsApp Conversation History\n`;
    dataString += `=======================================\n\n`;
    
    messages.forEach(m => {
      const time = new Date(m.timestamp).toLocaleString();
      const sender = m.direction === 'inbound' ? client.name || 'Client' : 'GrownK';
      dataString += `[${time}] ${sender}:\n${m.message_text}\n\n`;
    });

    const blob = new Blob([dataString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GrownK_ClientData_${client.phone}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const ClientDetailSkeleton = () => (
    <div className="flex bg-[#09090b] min-h-screen text-slate-300 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 flex gap-6 h-screen overflow-hidden animate-pulse max-w-7xl mx-auto w-full">
        <div className="w-1/3 flex flex-col gap-6">
          <div className="bg-[#121214] p-6 rounded-2xl border border-white/5 space-y-6 h-[320px]"></div>
        </div>
        <div className="flex-1 bg-[#121214] rounded-2xl border border-white/5 flex flex-col h-full overflow-hidden"></div>
      </main>
    </div>
  );

  if (!client) return <ClientDetailSkeleton />;

  return (
    <div className="flex bg-[#09090b] min-h-screen text-slate-300 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 flex flex-col lg:flex-row gap-6 h-screen overflow-hidden max-w-7xl mx-auto w-full">
        
        {/* Left: Client Info */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          
          {/* Header Card */}
          <div className="bg-[#121214] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[30px] group-hover:bg-blue-500/10 transition-colors duration-500" />
            
            <div className="relative flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-[#18181b] border border-white/5 p-4 rounded-xl shadow-inner">
                  <User size={24} className="text-slate-300" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white tracking-tight">{client.name || 'Unknown Client'}</h2>
                  <p className="text-sm text-slate-400 font-mono mt-0.5">{client.phone}</p>
                </div>
              </div>
              <button 
                onClick={handleDownloadData} 
                className="p-2.5 bg-[#18181b] border border-white/5 hover:border-white/10 text-slate-400 hover:text-white rounded-lg transition-colors shadow-sm"
                title="Export Data"
              >
                <Download size={18} />
              </button>
            </div>
            
            {/* Conversation Mode Indicator */}
            {(() => {
              const mode = client.conversation_mode || 'bot';
              const cfg  = MODE_CONFIG[mode];
              return (
                <div className={`mb-6 px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between ${cfg.color}`}>
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${mode === 'pending' ? 'bg-amber-400' : 'bg-current'}`}></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                    </span>
                    {cfg.label}
                  </span>
                  {mode === 'pending' && (
                    <button onClick={handleClaimHandoff} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold text-amber-500 border border-amber-500/20">
                      <UserCheck size={14} /> Claim Chat
                    </button>
                  )}
                  {mode === 'agent' && (
                    <button onClick={handleReleaseHandoff} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold text-blue-400 border border-blue-500/20">
                      <RotateCcw size={14} /> Release AI
                    </button>
                  )}
                </div>
              );
            })()}

            {/* AI Toggle */}
            <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between transition-colors ${
                client.bot_enabled 
                ? 'bg-emerald-500/[0.02] border-emerald-500/10' 
                : 'bg-slate-800/30 border-slate-700/50'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${client.bot_enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  {client.bot_enabled ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{client.bot_enabled ? 'AI Autopilot On' : 'Manual Override'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{client.bot_enabled ? 'Bot is responding' : 'Agent has control'}</p>
                </div>
              </div>
              <button
                onClick={handleToggleBot}
                disabled={toggling}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                  client.bot_enabled ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                  client.bot_enabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="space-y-5 border-t border-white/5 pt-6">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">Lead Status</label>
                <select 
                  className="w-full bg-[#18181b] border border-white/5 hover:border-white/10 text-sm text-white rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer appearance-none"
                  value={client.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Service Selected</label>
                <p className="text-sm text-white">{client.service_selected || '—'}</p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-400">Internal Notes</label>
                  {notesSaved && <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded animate-pulse">Saved</span>}
                </div>
                <textarea
                  className="w-full bg-[#18181b] border border-white/5 text-sm text-white rounded-lg px-4 py-3 outline-none h-32 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow custom-scrollbar resize-none"
                  placeholder="Add private notes about this client..."
                  defaultValue={client.notes}
                  onBlur={async (e) => {
                    try {
                      await updateClient(id, { notes: e.target.value });
                      setNotesSaved(true);
                      setTimeout(() => setNotesSaved(false), 2000);
                    } catch {
                      toast.error('Failed to save notes.');
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <button
            className="w-full py-4 bg-white text-black hover:bg-slate-200 rounded-xl font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            onClick={() => navigate('/admin/invoices', { state: { preselectedClientId: id } })}
          >
            Create Invoice
          </button>
        </div>

        {/* Right: Chat History */}
        <div className="flex-1 bg-[#121214] border border-white/5 rounded-2xl flex flex-col relative overflow-hidden shadow-sm">
          
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-[#18181b]/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <MessageSquare size={16} className="text-emerald-400" />
              </div>
              <div>
                <span className="font-medium text-white block leading-tight">Conversation</span>
                <span className="text-[11px] text-slate-500 font-medium">Live sync enabled</span>
              </div>
            </div>
            {client.bot_enabled && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Bot size={14} /> AI Active
              </span>
            )}
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar bg-[#09090b]/50">
            {messages.map(m => {
              const isInbound = m.direction === 'inbound';
              return (
                <div key={m.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                    isInbound 
                    ? 'bg-[#18181b] border border-white/5 text-slate-200 rounded-bl-sm' 
                    : 'bg-blue-600 text-white rounded-br-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{m.message_text}</p>
                    <div className={`text-[10px] font-medium mt-1.5 ${isInbound ? 'text-slate-500' : 'text-blue-200'}`}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                No messages yet.
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 bg-[#18181b] border-t border-white/5">
            <div className="flex gap-2 mb-3 px-2">
              <button 
                type="button" 
                onClick={() => setOutboundChannel('whatsapp')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  outboundChannel === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Phone size={14} /> WhatsApp
              </button>
              <button 
                type="button" 
                onClick={() => setOutboundChannel('telegram')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  outboundChannel === 'telegram' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Send size={14} className="-rotate-45" /> Telegram
              </button>
            </div>
            <div className="flex items-center gap-3 bg-[#09090b] border border-white/10 rounded-xl p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow">
              <input 
                type="text" 
                placeholder={`Type your message...`} 
                className="flex-1 bg-transparent border-none outline-none text-sm text-white px-3"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="bg-white text-black p-2.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </form>

        </div>
      </main>
    </div>
  );
};

export default ClientDetail;
