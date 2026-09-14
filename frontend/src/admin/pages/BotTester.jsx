import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import toast from '../components/Toast';
import { Trash2, Sparkles, Send, Bot, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getBotTestHistory, testBotMessage, clearBotTestHistory } from '../api';

const BotTester = () => {
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading]   = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    document.title = 'Bot Sandbox | GrownK Dashboard';
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await getBotTestHistory();
      const hist = res.data.results || res.data;
      setMessages(hist);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      const container = endRef.current?.parentNode;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    setInputMsg('');
    const tempId = Date.now();

    // Optimistic UI update
    setMessages(prev => [...prev, { id: tempId, direction: 'inbound', message_text: userText }]);
    scrollToBottom();
    setLoading(true);

    try {
      const res = await testBotMessage(userText);
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId), 
        { id: tempId, direction: 'inbound', message_text: userText }, // Keep user msg
        { 
          id: res.data.id, 
          direction: 'outbound', 
          message_text: res.data.reply,
          detected_intent: res.data.intent,
          is_fallback: res.data.was_fallback,
          escalated: res.data.was_escalated
        }
      ]);
    } catch (err) {
      toast.error('Bot failed to respond.');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear all test messages?')) return;
    try {
      await clearBotTestHistory();
      setMessages([]);
      toast.success('Sandbox cleared.');
    } catch (err) {
      toast.error('Failed to clear.');
    }
  };

  return (
    <div className="flex bg-transparent h-screen text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 overflow-hidden flex flex-col max-w-[1400px] mx-auto w-full relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 animate-in fade-in slide-in-from-top-4 duration-700 shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              Simulation Environment
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-slate-400 tracking-tight flex items-center gap-4 drop-shadow-sm">
              Bot Sandbox
            </h1>
            <p className="text-base text-slate-400 mt-3 font-medium max-w-xl">
              Test your AI agent's responses safely before deploying changes to live clients.
            </p>
          </div>
          <button 
            onClick={handleClear}
            className="group relative inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-rose-400 transition-all duration-300 bg-white/5 border border-rose-500/20 rounded-xl overflow-hidden hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative flex items-center gap-2 drop-shadow-md z-10 group-hover:text-rose-300 transition-colors duration-300">
              <Trash2 size={16} className="group-hover:rotate-12 transition-transform duration-300" /> Clear Session
            </span>
          </button>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 glass-premium rounded-[2rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-700 delay-100 card-glow-purple">
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-6 relative z-10 flex flex-col min-h-0">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 shadow-inner flex items-center justify-center mb-6">
                  <Sparkles size={32} className="text-purple-400/50" />
                </div>
                <p className="text-lg font-semibold text-slate-300 mb-2">Sandbox is empty</p>
                <p className="text-sm">Type a message below to start simulating.</p>
              </div>
            ) : (
              messages.filter(Boolean).map((m, idx) => {
                const isBot = m.direction === 'outbound' || m.is_bot || m.reply;
                const text = m.message_text || m.message || m.text || m.reply || "Empty message";
                
                return (
                <div key={m.id || idx} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} w-full shrink-0`}>
                  <div className={isBot ? 'chat-bubble-inbound' : 'chat-bubble-outbound'}>
                    <p className="text-sm md:text-base leading-relaxed text-white font-medium">{text}</p>
                  </div>
                  
                  {isBot && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-2">
                      {m.detected_intent && m.detected_intent !== 'unknown' && (
                        <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md shadow-inner">
                          Intent: {m.detected_intent}
                        </span>
                      )}
                      {m.is_fallback && (
                        <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md shadow-inner flex items-center gap-1">
                          <AlertTriangle size={10} /> Fallback
                        </span>
                      )}
                      {m.escalated && (
                        <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md shadow-inner flex items-center gap-1">
                          <ShieldAlert size={10} /> Escalated
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )})
            )}
            
            {loading && (
              <div className="flex items-start animate-in fade-in">
                <div className="typing-indicator bg-[#1e293b]/90 backdrop-blur-md shadow-lg border border-white/10 text-slate-400">
                  <div className="typing-dot"></div>
                  <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                  <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-white/5 bg-[#030712]/50 backdrop-blur-xl relative z-10 shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Message your AI..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-500 font-medium shadow-inner"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                autoFocus
              />
              <button 
                type="submit" 
                disabled={loading || !inputMsg.trim()}
                className="group relative flex items-center justify-center p-4 text-white transition-all duration-300 bg-purple-600 rounded-2xl overflow-hidden hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Send size={20} className="relative z-10 -ml-1 mt-0.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BotTester;
