import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, TrendingUp, Minimize2, ExternalLink, ShoppingBag, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { STORE_INFO } from '../../utils/constants';
import { useCart } from '../../context/CartContext';

const GoldAIChat = () => {
  const { isCartOpen, addToCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "✨ Assalamu Alaikum! Welcome to Sahara Gold Concierge. I am your AI Jewelry & Gold Price Advisor. How can I assist your luxury journey today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('sg_ai_session') || '');
  const [priceInsight, setPriceInsight] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    let isMounted = true;
    const fetchInsight = async () => {
      try {
        const data = await api.getAIPriceInsight();
        if (isMounted) setPriceInsight(data);
      } catch (err) {
        console.error('Failed to load gold insight:', err);
      }
    };
    fetchInsight();
    return () => { isMounted = false; };
  }, []);

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

  return (
    <>
      {/* Floating Action Cluster - Responsive & Unified */}
      <div
        className="floating-action-cluster"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: isCartOpen ? 'none' : 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'opacity 0.2s ease',
          opacity: isCartOpen ? 0 : 1,
          pointerEvents: isCartOpen ? 'none' : 'auto'
        }}
      >
        {/* WhatsApp Direct Concierge Button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={openWhatsApp}
          className="whatsapp-float-trigger"
          title="Chat directly on WhatsApp"
          aria-label="Chat on WhatsApp"
          style={{
            position: 'relative',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: '#25D366',
            color: '#fff',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(37, 211, 102, 0.45)',
            transition: 'box-shadow 0.2s ease'
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.445 0 .081 5.363.079 11.969c0 2.112.551 4.174 1.597 5.981L0 24l6.176-1.619c1.745.951 3.714 1.453 5.716 1.454h.005c6.604 0 11.97-5.364 11.973-11.971a11.895 11.895 0 00-3.483-8.474z" />
          </svg>
        </motion.button>

        {/* AI Pill Label (Desktop only) */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              className="ai-pill-desktop"
              initial={{ opacity: 0, x: 15, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 15, scale: 0.92 }}
              onClick={() => setIsOpen(true)}
              style={{
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #1c1913, #2b2316)',
                border: '1px solid rgba(212, 175, 55, 0.45)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
                padding: '9px 16px',
                borderRadius: '999px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <Sparkles size={15} style={{ color: '#d4af37' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f5ebd7', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Ask Sahara AI
              </span>
              {priceInsight?.rates?.['22K'] && (
                <span style={{ fontSize: '11px', background: 'rgba(212,175,55,0.22)', color: '#d4af37', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(212,175,55,0.35)', fontFamily: 'monospace', fontWeight: 600 }}>
                  22K: ৳{priceInsight.rates['22K'].toLocaleString()}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary AI Trigger Button */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(!isOpen)}
          className="ai-chat-trigger"
          style={{
            position: 'relative',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #e5c100, #d4af37, #997d1e)',
            boxShadow: '0 6px 24px rgba(212, 175, 55, 0.5)',
            border: '2px solid #ffec99',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#000'
          }}
          aria-label="Toggle Sahara AI Chat"
        >
          {isOpen ? (
            <X size={22} style={{ color: '#000' }} />
          ) : (
            <>
              <MessageSquare size={22} style={{ color: '#000' }} />
              <span
                style={{
                  position: 'absolute',
                  top: '-1px',
                  right: '-1px',
                  width: '11px',
                  height: '11px',
                  backgroundColor: '#22c55e',
                  borderRadius: '50%',
                  border: '2px solid #121212'
                }}
              />
            </>
          )}
        </motion.button>
      </div>

      {/* Main Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'fixed',
              bottom: '92px',
              right: '24px',
              zIndex: 9999,
              width: 'min(420px, 92vw)',
              height: '580px',
              maxHeight: '80vh',
              backgroundColor: 'rgba(18, 18, 18, 0.97)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '20px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              color: '#f3f4f6'
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(90deg, #1c1913, #262016, #1a1711)',
                borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #d4af37, #f3e5ab)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontWeight: 'bold',
                    fontFamily: 'serif',
                    fontSize: '15px',
                    border: '1px solid #ffeaa7'
                  }}
                >
                  SG
                  <span style={{ position: 'absolute', bottom: '0', right: '0', width: '9px', height: '9px', backgroundColor: '#22c55e', borderRadius: '50%', border: '2px solid #121212' }}></span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'serif', fontSize: '15px', fontWeight: 600, color: '#f7e7c4' }}>Sahara Gold AI</span>
                    <span style={{ fontSize: '10px', background: 'rgba(212,175,55,0.2)', color: '#d4af37', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.4)', fontWeight: 600 }}>LIVE</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>Luxury Concierge & Price Advisor</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={openWhatsApp}
                  title="Switch to WhatsApp"
                  style={{
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.4)',
                    color: '#4ade80',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px'
                  }}
                >
                  <span>WhatsApp</span>
                  <ExternalLink size={12} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
                >
                  <Minimize2 size={16} />
                </button>
              </div>
            </div>

            {/* Live Gold Ticker Banner */}
            {priceInsight?.rates && (
              <div
                style={{
                  background: '#1b1710',
                  borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
                  padding: '7px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#e5c100'
                }}
              >
                <TrendingUp size={13} style={{ color: '#4ade80' }} />
                <span>22K: <strong>৳{priceInsight.rates['22K']?.toLocaleString()}</strong></span>
                <span style={{ color: '#6b7280' }}>•</span>
                <span>21K: <strong>৳{priceInsight.rates['21K']?.toLocaleString()}</strong></span>
                <span style={{ color: '#6b7280' }}>•</span>
                <span>18K: <strong>৳{priceInsight.rates['18K']?.toLocaleString()}</strong></span>
              </div>
            )}

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      borderRadius: '16px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-line',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      ...(m.role === 'user'
                        ? {
                            background: 'linear-gradient(135deg, #d4af37, #b89326)',
                            color: '#000',
                            fontWeight: 500,
                            borderTopRightRadius: 0
                          }
                        : {
                            background: '#1e1c18',
                            border: '1px solid rgba(212, 175, 55, 0.2)',
                            color: '#ede5d8',
                            borderTopLeftRadius: 0
                          })
                    }}
                  >
                    {m.content}
                  </div>

                  {/* Render Directly Recommended Products */}
                  {m.products && m.products.length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      width: '100%',
                      maxWidth: '92%'
                    }}>
                      {m.products.map((prod) => (
                        <div
                          key={prod.id}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            background: '#191713',
                            border: '1px solid rgba(212, 175, 55, 0.35)',
                            borderRadius: '10px',
                            padding: '8px',
                            alignItems: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                          }}
                        >
                          <div style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#000',
                            flexShrink: 0
                          }}>
                            <img
                              src={prod.image || '/placeholder-gold.jpg'}
                              alt={prod.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h5 style={{
                              margin: 0,
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {prod.name}
                            </h5>
                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#9ca3af' }}>
                              {prod.purity} • {prod.weight}g
                            </p>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e5c100' }}>
                              ৳{(prod.current_price || prod.price || 0).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Link
                              to={`/product/${prod.id}`}
                              onClick={() => setIsOpen(false)}
                              title="View Product Details"
                              style={{
                                padding: '6px',
                                background: '#26221a',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                borderRadius: '6px',
                                color: '#e5c100',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Eye size={13} />
                            </Link>
                            <button
                              onClick={() => {
                                addToCart(prod);
                                setIsOpen(false);
                              }}
                              title="Add Directly to Bag"
                              style={{
                                padding: '6px 10px',
                                background: 'linear-gradient(135deg, #e5c100, #b89326)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#000',
                                fontWeight: 700,
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <ShoppingBag size={12} />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', padding: '0 4px' }}>{m.time}</span>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#d4af37', background: '#1a1813', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', padding: '8px 12px', width: 'fit-content' }}>
                  <span>Consulting catalog & rates...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips */}
            <div
              style={{
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                borderTop: '1px solid rgba(212, 175, 55, 0.15)',
                background: '#14120e'
              }}
            >
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.prompt)}
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '11px',
                    background: '#221d15',
                    color: '#e6d5b8',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div
              style={{
                padding: '12px',
                background: '#17140f',
                borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Ask about rates, bridal sets, tracking..."
                style={{
                  flex: 1,
                  background: '#231f17',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#fff',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #d4af37, #aa851d)',
                  color: '#000',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  opacity: input.trim() && !loading ? 1 : 0.4
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GoldAIChat;
