import { queryClient } from '../../queryClient';
import { canPurchase } from '../../utils/productAvailability.js';
import { formatPrice } from '../../utils/formatters';
import { useGoldRates } from '../../hooks/useShopData';
import React, { useState, useEffect, useRef } from 'react';
import '../../account-chat-v2.css';
import { useStorefrontContent } from '../../hooks/useStorefrontContent';
import { MessageSquare, X, Send, Sparkles, TrendingUp, Minimize2, ExternalLink, ShoppingBag, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { STORE_INFO } from '../../utils/constants';
import { useCart } from '../../context/CartContext';

const GoldAIChat = () => {
  const { data: content } = useStorefrontContent();
  const { isCartOpen, addToCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Assalamu Alaikum. Welcome to Sahara. I can help you explore jewellery, understand our published gold rates, or find order information. What do you have in mind?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('sg_ai_session') || '');
  const { data: publishedRates } = useGoldRates();
  const priceInsight = publishedRates ? { rates: { '22K': publishedRates.rate_22k, '21K': publishedRates.rate_21k, '18K': publishedRates.rate_18k } } : null;
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);



  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const data = await api.chatWithAI(text, sessionId);
      if (data.rates) queryClient.setQueryData(['goldRates'], data.rates);
      else queryClient.invalidateQueries({ queryKey: ['goldRates'] });

      if (data.visitor_id && !sessionId) {
        setSessionId(data.visitor_id);
        localStorage.setItem('sg_ai_session', data.visitor_id);
      }

      const botMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.reply,
        products: data.products || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `Sorry, I am having trouble connecting right now. You can also reach our concierge directly at ${STORE_INFO.phone} (WhatsApp).`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    const phone = STORE_INFO?.whatsapp;
    if (!phone) return;
    window.open(`https://wa.me/${phone}?text=Hello%20Sahara%20Gold%2C%20I%20need%20assistance%20with%20jewelry`, '_blank');
  };

  const quickChips = [
    { label: "Today's Gold Rates", prompt: "What are today's 22K, 21K, and 18K gold rates per gram?" },
    { label: "Bridal Suggestions", prompt: "Suggest me wedding jewelry gifts under ৳70,000" },
    { label: "Track My Order", prompt: "How do I track my order?" },
    { label: "22K vs 18K Purity", prompt: "What is the difference between 22K and 18K gold?" }
  ];

  const dialog = useRef(null);
  useEffect(() => { if(isOpen && !dialog.current.open) dialog.current.showModal(); else if(!isOpen && dialog.current.open) dialog.current.close(); }, [isOpen]);
  return <>
    {!isCartOpen && <button className="concierge-trigger" onClick={() => setIsOpen(true)} aria-label="Open Sahara concierge"><MessageSquare size={19}/><span>Ask Sahara</span></button>}
    <dialog className="concierge-dialog" ref={dialog} aria-labelledby="concierge-title" onCancel={e => {e.preventDefault();setIsOpen(false);}}>
      <div className="concierge-inner"><header className="concierge-header"><img src="/brand/new-sahara-logo.png" alt=""/><div><h2 id="concierge-title">Your Sahara concierge.</h2><p>AI assistance · Rates, pieces & questions</p></div><button onClick={() => setIsOpen(false)} aria-label="Close concierge"><X size={20}/></button></header>
      {publishedRates && <div className="concierge-rate"><span>{publishedRates.pricing_mode === 'manual' ? 'Store-set rates' : publishedRates.is_stale ? 'Last saved rates' : 'Automatic rates'} / gram</span><Link to="/gold-rates" onClick={() => setIsOpen(false)}>22K: {formatPrice(publishedRates.rate_22k)} ↗</Link></div>}
      <div className="concierge-messages" role="log" aria-live="polite">{messages.map(m => <article key={m.id} className={`concierge-message ${m.role}`}><p>{m.id === 1 ? content.chat_greeting : m.content}</p>{m.products?.map(prod => <div key={prod.id} className="concierge-product"><img src={prod.image} alt=""/><Link to={`/product/${prod.id}`} onClick={() => setIsOpen(false)}>{prod.name}<p>{prod.purity} · {prod.weight}g</p><p>{formatPrice(prod.current_price)}</p></Link><button disabled={!canPurchase(prod)} aria-label={`Add ${prod.name} to bag`} onClick={() => {if(!canPurchase(prod))return;setIsOpen(false);addToCart({...prod,price:Number(prod.current_price),category:prod.category_name});}}><ShoppingBag size={15}/></button></div>)}<small>{m.role === 'assistant' ? 'Sahara AI' : 'You'} · {m.time}</small></article>)}{loading && <p role="status" className="concierge-footnote">Checking the catalogue and rates…</p>}<div ref={messagesEndRef}/></div>
      <div className="concierge-suggestions">{quickChips.map(chip => <button key={chip.label} disabled={loading} onClick={() => handleSend(chip.prompt)}>{chip.label}</button>)}</div>
      <form className="concierge-compose" onSubmit={e => {e.preventDefault();handleSend();}}><input autoFocus value={input} onChange={e => setInput(e.target.value)} maxLength={2000} aria-label="Message to Sahara AI" placeholder="How can we help you choose?"/><button aria-label="Send message" disabled={!input.trim() || loading}><Send size={17}/></button></form>
      <p className="concierge-footnote">AI can make mistakes. Confirm purchase details with our team.<a href={`https://wa.me/${STORE_INFO.whatsapp}`} target="_blank" rel="noreferrer">Speak to us ↗</a></p></div>
    </dialog>
  </>;
};
export default GoldAIChat;
