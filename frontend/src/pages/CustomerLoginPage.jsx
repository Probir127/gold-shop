import React, { useState, useEffect } from 'react';
import { User, Package, Lock, LogOut, CheckCircle2, Clock, Truck, Eye, EyeOff, ShieldCheck, Mail, Download } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { formatPrice } from '../utils/formatters';

// ─── Shared helpers ──────────────────────────────────────────────────────────
const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: '#bbb',
    marginBottom: '6px',
    fontWeight: 500,
};

const PasswordInput = ({ value, onChange, placeholder = '••••••••', required }) => {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <input
                type={show ? 'text' : 'password'}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                style={{ ...inputStyle, paddingRight: '44px' }}
                required={required}
                minLength={8}
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0,
                }}
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const map = {
        delivered:  { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', border: 'rgba(74,222,128,0.4)' },
        shipped:    { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', border: 'rgba(96,165,250,0.4)' },
        processing: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', border: 'rgba(251,191,36,0.4)' },
        cancelled:  { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', border: 'rgba(239,68,68,0.4)' },
    };
    const s = map[status] || map.processing;
    return (
        <span style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
            textTransform: 'uppercase', fontWeight: 700,
            backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
        }}>
            {status}
        </span>
    );
};

const StatusIcon = ({ status }) => {
    if (status === 'delivered') return <CheckCircle2 size={14} style={{ color: '#4ade80' }} />;
    if (status === 'shipped') return <Truck size={14} style={{ color: '#60a5fa' }} />;
    return <Clock size={14} style={{ color: '#fbbf24' }} />;
};

const resolveInvoiceUrl = (url) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const backend = import.meta.env.VITE_BACKEND_URL || '';
    if (backend && !backend.startsWith('http://localhost') && !backend.startsWith('http://127.0.0.1')) {
        return `${backend.replace(/\/+$/, '')}${url}`;
    }
    return url;
};

// ─── Main component ───────────────────────────────────────────────────────────
const CustomerLoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Where to go after login (e.g. /checkout)
    const nextPath = new URLSearchParams(location.search).get('next') || '/account';

    const [customer, setCustomer] = useState(() => {
        try {
            const saved = localStorage.getItem('sahara_customer');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    const [tab, setTab] = useState('login');
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [sendingInvoiceId, setSendingInvoiceId] = useState(null);
    const [resendingCode, setResendingCode] = useState(false);

    const handleSendInvoiceEmail = async (orderId) => {
        setSendingInvoiceId(orderId);
        setError('');
        try {
            const res = await api.sendOrderInvoiceEmail(orderId);
            setSuccessMsg(res.message || 'Certified Hallmark Invoice PDF sent to your email successfully via SMTP!');
            setTimeout(() => setSuccessMsg(''), 6000);
        } catch (err) {
            setError(err.message || 'Failed to email invoice. Please try again.');
        } finally {
            setSendingInvoiceId(null);
        }
    };

    const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
            const res = await api.getCustomerOrders();
            setOrders(res.orders || []);
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setLoadingOrders(false);
        }
    };

    useEffect(() => {
        if (customer) fetchOrders();
    }, [customer]);

    const persistSession = (result) => {
        localStorage.setItem('customer_access_token', result.access);
        localStorage.setItem('customer_refresh_token', result.refresh);
        localStorage.setItem('sahara_customer', JSON.stringify(result.customer));
        setCustomer(result.customer);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const identifier = (formData.email || formData.phone || '').trim();
        if (!identifier || !formData.password) {
            setError('Email address (or phone number) and password are required.');
            return;
        }
        setSubmitting(true);
        try {
            const result = await api.customerLogin({ email: identifier, phone: identifier, password: formData.password });
            persistSession(result);
            setSuccessMsg('Welcome back! Redirecting…');
            setTimeout(() => navigate(nextPath), 900);
        } catch (err) {
            // err.verificationRequired is set by the API client when backend returns 403
            const needsVerification = err.verificationRequired ||
                (err.message && err.message.toLowerCase().includes('not verified'));
            if (needsVerification) {
                // Use the email from the backend response (works even if user logged in with phone)
                const unverifiedEmail = err.email || formData.email || identifier;
                setTab('register');
                setVerificationEmail(unverifiedEmail);
                setVerificationCode('');
                setError(err.message);
                // Auto-send a fresh code so the user doesn't have to click Resend
                try {
                    await api.customerResendVerification(unverifiedEmail);
                    setSuccessMsg(`A fresh 6-digit code has been sent to ${unverifiedEmail}. Check your inbox (and spam folder).`);
                } catch (_) { /* silent — user can manually resend */ }
            } else {
                setError(err.message || 'Login failed. Please check your email and password.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        const { name, phone, email, password, confirmPassword } = formData;
        if (!name.trim()) {
            setError('Full name is required.');
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            setError('A valid email address is required.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setSubmitting(true);
        try {
            const result = await api.customerRegister({
                name: name.trim(),
                phone: phone.trim() || email.trim(),
                email: email.trim(),
                password,
            });
            setVerificationEmail(result.email);
            setVerificationCode('');
            setSuccessMsg(`A 6-digit verification code has been sent to ${result.email}. Please check your inbox — if you don't see it within a minute, check your Spam / Junk folder.`);
        } catch (err) {
            setError(err.message || 'Registration failed. Please check your email address and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResendCode = async () => {
        if (!verificationEmail) return;
        setError('');
        setResendingCode(true);
        try {
            const res = await api.customerResendVerification(verificationEmail);
            setSuccessMsg(res.message || `A fresh 6-digit verification code was sent to ${verificationEmail}.`);
        } catch (err) {
            setError(err.message || 'Unable to resend verification code. Please try again shortly.');
        } finally {
            setResendingCode(false);
        }
    };

    const handleVerifyEmail = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const result = await api.customerVerifyEmail({ email: verificationEmail, code: verificationCode });
            persistSession(result);
            setSuccessMsg('Email verified! Redirecting…');
            setTimeout(() => navigate(nextPath), 900);
        } catch (err) {
            setError(err.message || 'Verification failed. Please check the code and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('sahara_customer');
        localStorage.removeItem('customer_access_token');
        localStorage.removeItem('customer_refresh_token');
        setCustomer(null);
        setOrders([]);
        setSuccessMsg('');
        setError('');
    };

    // ─── Account Dashboard ────────────────────────────────────────────────────
    if (customer) {
        return (
            <div className="section customer-account-page" style={{ minHeight: '75vh', padding: '60px 0' }}>
                <div className="container" style={{ maxWidth: '900px' }}>

                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #18150f, #241d13)',
                        border: '1px solid rgba(212,175,55,0.4)',
                        borderRadius: '16px',
                        padding: '28px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '20px',
                        marginBottom: '32px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: 'linear-gradient(135deg,#e5c100,#b89326)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#000', fontWeight: 'bold', fontSize: '22px',
                            }}>
                                {customer.name ? customer.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#d4af37' }}>
                                    Verified Customer
                                </span>
                                <h2 style={{ margin: '4px 0', fontSize: '22px', color: '#fff' }}>{customer.name}</h2>
                                <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
                                    {customer.phone}{customer.email && ` • ${customer.email}`}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
                                borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#4ade80',
                            }}>
                                <ShieldCheck size={14} /> Verified Account
                            </div>
                            <Link to="/shop" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
                                Shop Jewelry
                            </Link>
                            <button
                                onClick={handleLogout}
                                style={{
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                    color: '#f87171', borderRadius: '8px', padding: '8px 14px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '13px',
                                }}
                            >
                                <LogOut size={14} /> Log Out
                            </button>
                        </div>
                    </div>

                    {successMsg && (
                        <div style={{
                            padding: '14px 18px', backgroundColor: 'rgba(74,222,128,0.12)',
                            border: '1px solid rgba(74,222,128,0.35)', borderRadius: '10px',
                            color: '#4ade80', fontSize: '13px', marginBottom: '20px',
                            display: 'flex', alignItems: 'center', gap: '10px'
                        }}>
                            <CheckCircle2 size={18} /> {successMsg}
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: '14px 18px', backgroundColor: 'rgba(239,68,68,0.12)',
                            border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px',
                            color: '#f87171', fontSize: '13px', marginBottom: '20px',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Order History */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <h3 style={{ fontSize: '18px', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={20} style={{ color: '#d4af37' }} /> My Orders
                            </h3>
                            <Link to="/track-order" style={{ color: '#d4af37', fontSize: '13px', textDecoration: 'none' }}>
                                Live Order Tracker →
                            </Link>
                        </div>

                        {loadingOrders ? (
                            <div style={{ textAlign: 'center', padding: '50px 0', color: '#888' }}>
                                Loading your orders…
                            </div>
                        ) : orders.length === 0 ? (
                            <div style={{
                                backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px',
                                padding: '40px', textAlign: 'center', color: '#888',
                            }}>
                                <Package size={36} style={{ opacity: 0.4, marginBottom: '12px' }} />
                                <h4 style={{ color: '#fff', margin: '0 0 8px 0' }}>No Orders Yet</h4>
                                <p style={{ fontSize: '13px', marginBottom: '20px' }}>
                                    When you purchase jewelry from Sahara Gold your orders and official hallmark invoices will appear here automatically.
                                </p>
                                <Link to="/shop" className="btn btn-outline" style={{ display: 'inline-flex', padding: '10px 20px' }}>
                                    Browse Collections
                                </Link>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {orders.map((ord) => (
                                    <div
                                        key={ord.order_id}
                                        style={{
                                            backgroundColor: '#121212', border: '1px solid #282828',
                                            borderRadius: '12px', padding: '20px',
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', flexWrap: 'wrap', gap: '16px',
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                <StatusIcon status={ord.order_status} />
                                                <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '15px' }}>#{ord.order_id}</span>
                                                <StatusBadge status={ord.order_status} />
                                            </div>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                                                {new Date(ord.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} • {ord.city || 'Dhaka'}
                                            </p>
                                            <p style={{ margin: '6px 0 0 0', fontSize: '14px', fontWeight: 'bold', color: '#e5c100' }}>
                                                Total: {formatPrice(ord.total)}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <a
                                                href={resolveInvoiceUrl(ord.customer_invoice_url)}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    padding: '8px 14px', backgroundColor: '#1f1b14',
                                                    border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px',
                                                    color: '#d4af37', fontSize: '12px', textDecoration: 'none',
                                                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                                                }}
                                            >
                                                📄 Hallmark Invoice
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleSendInvoiceEmail(ord.order_id)}
                                                disabled={sendingInvoiceId === ord.order_id}
                                                style={{
                                                    padding: '8px 14px', backgroundColor: '#122316',
                                                    border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px',
                                                    color: '#4ade80', fontSize: '12px',
                                                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                                                    cursor: sendingInvoiceId === ord.order_id ? 'not-allowed' : 'pointer',
                                                    opacity: sendingInvoiceId === ord.order_id ? 0.6 : 1,
                                                }}
                                                title="Send official certified invoice PDF to your email"
                                            >
                                                <Mail size={13} />
                                                {sendingInvoiceId === ord.order_id ? 'Sending…' : 'Email Invoice'}
                                            </button>
                                            <Link
                                                to="/track-order"
                                                style={{
                                                    padding: '8px 14px', backgroundColor: '#222',
                                                    border: '1px solid #333', borderRadius: '8px',
                                                    color: '#fff', fontSize: '12px', textDecoration: 'none',
                                                }}
                                            >
                                                Track
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Login / Register Forms ───────────────────────────────────────────────
    return (
        <div className="section customer-account-page" style={{ minHeight: '80vh', padding: '60px 0', display: 'flex', alignItems: 'center' }}>
            <div className="container" style={{ maxWidth: '480px' }}>
                <div style={{
                    backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)',
                    borderRadius: '16px', padding: '36px 30px',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '50%',
                            background: 'linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.05))',
                            border: '1px solid rgba(212,175,55,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 12px auto', color: '#d4af37',
                        }}>
                            <User size={24} />
                        </div>
                        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', margin: '0 0 6px 0' }}>
                            Customer Portal
                        </h1>
                        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                            Sign in or create an account to shop and track your Sahara Gold orders.
                        </p>
                    </div>

                    {/* Tab switcher */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        background: '#0a0a0a', borderRadius: '10px',
                        padding: '4px', gap: '4px', marginBottom: '24px',
                        border: '1px solid #222',
                    }}>
                        {['login', 'register'].map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => { setTab(t); setError(''); setSuccessMsg(''); }}
                                style={{
                                    padding: '9px 0', fontSize: '13px', fontWeight: 600,
                                    borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backgroundColor: tab === t ? '#221d15' : 'transparent',
                                    color: tab === t ? '#e5c100' : '#666',
                                }}
                            >
                                {t === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                        ))}
                    </div>

                    {/* Alert: redirect notice */}
                    {nextPath !== '/account' && (
                        <div style={{
                            backgroundColor: 'rgba(212,175,55,0.08)',
                            border: '1px solid rgba(212,175,55,0.25)',
                            borderRadius: '8px', padding: '10px 14px',
                            fontSize: '12px', color: '#d4af37', marginBottom: '16px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <Lock size={13} />
                            Sign in to continue to {nextPath.replace('/', '')}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171', borderRadius: '8px', padding: '10px 14px',
                            fontSize: '13px', marginBottom: '16px',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {successMsg && (
                        <div style={{
                            backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
                            color: '#4ade80', borderRadius: '8px', padding: '10px 14px',
                            fontSize: '13px', marginBottom: '16px',
                        }}>
                            {successMsg}
                        </div>
                    )}

                    {/* ── Sign In form ── */}
                    {tab === 'login' && (
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>Email Address (or Phone Number)</label>
                                <input
                                    type="text"
                                    placeholder="you@example.com or 01XXXXXXXXX"
                                    value={formData.email || formData.phone}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value, phone: e.target.value })}
                                    style={inputStyle}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Password</label>
                                <PasswordInput
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                                style={{ width: '100%', justifyContent: 'center', marginTop: '4px', padding: '12px', opacity: submitting ? 0.7 : 1 }}
                            >
                                {submitting ? 'Signing in…' : 'Sign In to My Account'}
                            </button>
                            <p style={{ textAlign: 'center', fontSize: '12px', color: '#666', margin: 0 }}>
                                No account yet?{' '}
                                <button
                                    type="button"
                                    onClick={() => { setTab('register'); setError(''); }}
                                    style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                                >
                                    Create one now
                                </button>
                            </p>
                        </form>
                    )}

                    {/* ── Register form ── */}
                    {tab === 'register' && verificationEmail ? (
                        <form onSubmit={handleVerifyEmail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                                <p style={{ fontSize: '13px', color: '#999', margin: '0 0 4px 0' }}>
                                    Verification code sent to:
                                </p>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#e5c100' }}>
                                    {verificationEmail}
                                </span>
                                <p style={{ fontSize: '11px', color: '#666', margin: '6px 0 0 0' }}>
                                    📬 Don't see the email? Check your <strong style={{ color: '#999' }}>Spam / Junk</strong> folder.
                                </p>
                            </div>
                            <div>
                                <label style={labelStyle}>6-Digit Verification Code</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    placeholder="• • • • • •"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                    style={{ ...inputStyle, letterSpacing: '6px', textAlign: 'center', fontSize: '22px', fontWeight: 'bold' }}
                                    required
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting || verificationCode.length !== 6}
                                style={{ width: '100%', justifyContent: 'center', padding: '12px', opacity: (submitting || verificationCode.length !== 6) ? 0.6 : 1 }}
                            >
                                {submitting ? 'Verifying…' : 'Verify Email & Activate Account'}
                            </button>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '12px' }}>
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={resendingCode}
                                    style={{ background: 'none', border: 'none', color: '#d4af37', cursor: resendingCode ? 'not-allowed' : 'pointer', padding: 0 }}
                                >
                                    {resendingCode ? 'Resending code…' : "Didn't receive it? Resend Code"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setVerificationEmail(''); setVerificationCode(''); setSuccessMsg(''); setError(''); }}
                                    style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}
                                >
                                    Change email
                                </button>
                            </div>
                        </form>
                    ) : tab === 'register' && (
                        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={labelStyle}>Full Name *</label>
                                <input
                                    type="text"
                                    placeholder="Your full name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={inputStyle}
                                    required
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address * (for invoices &amp; order updates)</label>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={inputStyle}
                                    required
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Mobile Phone (for delivery &amp; courier)</label>
                                <input
                                    type="tel"
                                    placeholder="01XXXXXXXXX"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Password * (min. 8 characters)</label>
                                <PasswordInput
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Choose a strong password"
                                    required
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Confirm Password *</label>
                                <PasswordInput
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Repeat your password"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                                style={{ width: '100%', justifyContent: 'center', marginTop: '4px', padding: '12px', opacity: submitting ? 0.7 : 1 }}
                            >
                                {submitting ? 'Creating Account…' : 'Create My Account'}
                            </button>
                            <p style={{ textAlign: 'center', fontSize: '12px', color: '#666', margin: 0 }}>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => { setTab('login'); setError(''); }}
                                    style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                                >
                                    Sign in
                                </button>
                            </p>
                        </form>
                    )}

                    <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #1f1f1f', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#555' }}>
                            Already placed an order?{' '}
                            <Link to="/track-order" style={{ color: '#d4af37', textDecoration: 'none' }}>
                                Track it here
                            </Link>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerLoginPage;
