/**
 * GrownK Toast Notification System - Phase 3
 * Replaces browser alert() with premium slide-in toasts.
 * 
 * Usage:
 *   import { toast, ToastContainer } from '../components/Toast';
 *   toast.success('Invoice marked as paid!')
 *   toast.error('Failed to connect to server.')
 *   toast.warning('Session expiring soon.')
 *   toast.info('Bot has been disabled.')
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Toast state (module-level singleton) ──────────────────────
let _addToast = null;

const ICONS = {
  success: <CheckCircle size={18} className="text-green-400 shrink-0" />,
  error:   <XCircle    size={18} className="text-red-400   shrink-0" />,
  warning: <AlertTriangle size={18} className="text-amber-400 shrink-0" />,
  info:    <Info       size={18} className="text-blue-400  shrink-0" />,
};

const STYLES = {
  success: 'border-green-500/30 bg-green-500/10',
  error:   'border-red-500/30   bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  info:    'border-blue-500/30  bg-blue-500/10',
};

// ── Public API ────────────────────────────────────────────────
export const toast = {
  success: (msg, dur = 4000) => _addToast?.({ type: 'success', msg, dur }),
  error:   (msg, dur = 5000) => _addToast?.({ type: 'error',   msg, dur }),
  warning: (msg, dur = 4500) => _addToast?.({ type: 'warning', msg, dur }),
  info:    (msg, dur = 3500) => _addToast?.({ type: 'info',    msg, dur }),
};

// ── ToastContainer — mount once in App.jsx ────────────────────
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type, msg, dur }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, msg, dur, visible: true }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, dur);
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  const dismiss = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
            border backdrop-blur-md shadow-2xl min-w-[280px] max-w-[420px]
            transition-all duration-300 ease-out
            ${STYLES[t.type]}
            ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
          `}
        >
          {ICONS[t.type]}
          <span className="text-sm text-slate-200 flex-1">{t.msg}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-slate-500 hover:text-slate-300 transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default toast;
