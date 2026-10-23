import React, { useState, useEffect } from 'react';
import { Package, Lock, LogOut, Eye, EyeOff, ShieldCheck, Mail, Download } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { safeReturnPath, isEmail, isPhone } from '../utils/formValidation';
import { formatPrice } from '../utils/formatters';

import '../account-chat-v2.css';
import SEO from '../components/SEO';
import { useStorefrontContent } from '../hooks/useStorefrontContent';

const PasswordInput = ({ value, onChange, placeholder = 'Your password', required, autoComplete = 'current-password' }) => {
    const [show, setShow] = useState(false);
    return <div className="account-password">
        <input type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={onChange} required={required} minLength={8} maxLength={128} aria-label={placeholder === 'Repeat your password' ? 'Confirm password' : 'Password'} autoComplete={autoComplete} />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>;
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
    const { data: content } = useStorefrontContent();
    const navigate = useNavigate();
    const location = useLocation();

    // Where to go after login (e.g. /checkout)
    const nextPath = safeReturnPath(new URLSearchParams(location.search).get('next'));

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
            setSuccessMsg(res.message || 'Your invoice email has been accepted for delivery.');
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
            setError(err.message || 'Unable to load your orders. Please try again.');
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
                    const delivery = await api.customerResendVerification(unverifiedEmail);
                    setSuccessMsg(delivery.message);
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
        if (!isEmail(email)) {
            setError('A valid email address is required.');
            return;
        }
        if (phone.trim() && !isPhone(phone)) { setError('Enter a valid Bangladesh mobile number.'); return; }
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
            setSuccessMsg(result.message);
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

    const notices = <>{error && <p className="account-notice account-notice--error" role="alert">{error}</p>}{successMsg && <p className="account-notice" role="status">{successMsg}</p>}</>;

    if (customer) {
        return <section className="account-v2 account-dashboard"><SEO title="My Sahara" noindex />
            <header className="account-dashboard-heading"><div><span className="account-eyebrow">Your personal collection</span><h1>Hello, {customer.name || 'there'}.</h1><p>Your orders, invoices and the pieces you’ll treasure.</p></div><button className="account-text-button" onClick={handleLogout}><LogOut size={16} /> Sign out</button></header>
            <div className="account-dashboard-layout">
                <aside className="account-profile"><span className="account-monogram">{customer.name?.charAt(0).toUpperCase() || 'S'}</span><h2>{customer.name}</h2><p>{customer.email}</p><p>{customer.phone}</p><span className="account-profile-label"><ShieldCheck size={16} /> Your account</span><Link to="/shop" className="account-primary">Explore the collection <span>↗</span></Link><Link to="/contact" className="account-text-button">Need a hand? Contact us</Link></aside>
                <div className="account-orders">{notices}<div className="account-orders-title"><h2>Order history</h2><Link to="/track-order">Track an order ↗</Link></div>
                    {loadingOrders ? <p role="status" className="account-empty">Finding your orders…</p> : orders.length === 0 ? <div className="account-empty"><Package size={32} strokeWidth={1} /><h3>Your story starts here.</h3><p>When you place an order, its details and invoice will appear here.</p><Link to="/shop" className="account-text-button">Discover Sahara ↗</Link></div> : <div>{orders.map(ord => <article className="account-order" key={ord.order_id}><div className="account-order-heading"><div><span className="account-eyebrow">Order #{ord.order_id}</span><p>{new Date(ord.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}{ord.city && ` · ${ord.city}`}</p></div><span className="account-order-status">{ord.order_status}</span></div><div className="account-order-bottom"><strong>{formatPrice(ord.total)}</strong><div className="account-order-actions">{ord.customer_invoice_url && <a href={resolveInvoiceUrl(ord.customer_invoice_url)} target="_blank" rel="noreferrer"><Download size={15} /> Invoice</a>}<button type="button" onClick={() => handleSendInvoiceEmail(ord.order_id)} disabled={sendingInvoiceId === ord.order_id}><Mail size={15} />{sendingInvoiceId === ord.order_id ? 'Sending…' : 'Email invoice'}</button><Link to="/track-order">Track ↗</Link></div></div></article>)}</div>}
                </div>
            </div>
        </section>;
    }

    return <section className="account-v2 account-entry"><SEO title="Your Sahara Account" description="Sign in to manage your New Sahara Gold and Diamond orders and invoices." noindex />
        <aside className="account-editorial"><div className="account-editorial-copy"><span className="account-eyebrow">The Sahara experience</span><h1>{content.account_title}</h1><p>{content.account_description}</p><Link to="/shop">Explore the collection ↗</Link></div><img src={content.account_image} alt={content.account_image_alt} /><span className="account-editorial-caption">New Sahara Gold and Diamond</span></aside>
        <div className="account-form-wrap"><Link to="/" className="account-back">← Back to Sahara</Link><span className="account-eyebrow">Your Sahara account</span><h2>{verificationEmail && tab === 'register' ? 'Verify your email.' : tab === 'login' ? 'Welcome back.' : 'Begin your story.'}</h2><p className="account-intro">{verificationEmail && tab === 'register' ? 'One small step to make this account yours.' : 'Keep your orders and jewellery journey in one place.'}</p>
            <div className="account-tabs" aria-label="Account options">{['login', 'register'].map(t => <button key={t} type="button" aria-pressed={tab === t} onClick={() => { setTab(t); setError(''); setSuccessMsg(''); }}>{t === 'login' ? 'Sign in' : 'Create an account'}</button>)}</div>
            {nextPath !== '/account' && <p className="account-return"><Lock size={14} /> Sign in to continue to {nextPath.replace('/', '')}</p>}{notices}
            {tab === 'login' && <form onSubmit={handleLogin} className="account-form"><label>Email address or phone number<input type="text" placeholder="you@example.com or 01XXXXXXXXX" autoComplete="username" maxLength={254} value={formData.email || formData.phone} onChange={e => setFormData({ ...formData, email: e.target.value, phone: e.target.value })} required /></label><label>Password<PasswordInput value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required /></label><button type="submit" className="account-primary" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}<span>→</span></button></form>}
            {tab === 'register' && verificationEmail ? <form onSubmit={handleVerifyEmail} className="account-form"><p>Enter the code for <strong>{verificationEmail}</strong>.</p><label>Six-digit verification code<input className="account-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))} required /></label><button type="submit" className="account-primary" disabled={submitting || verificationCode.length !== 6}>{submitting ? 'Verifying…' : 'Verify email'}<span>→</span></button><div className="account-verification-actions"><button type="button" onClick={handleResendCode} disabled={resendingCode}>{resendingCode ? 'Resending…' : 'Resend code'}</button><button type="button" onClick={() => { setVerificationEmail(''); setVerificationCode(''); setSuccessMsg(''); setError(''); }}>Change email</button></div></form> : tab === 'register' && <form onSubmit={handleRegister} className="account-form"><label>Full name<input type="text" placeholder="Your full name" autoComplete="name" maxLength={150} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></label><label>Email address<input type="email" placeholder="you@example.com" autoComplete="email" maxLength={254} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required /></label><label>Mobile number <span className="account-optional">optional</span><input type="tel" placeholder="01XXXXXXXXX" autoComplete="tel" maxLength={20} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></label><div className="account-password-pair"><label>Password<PasswordInput value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="At least 8 characters" autoComplete="new-password" required /></label><label>Confirm password<PasswordInput value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Repeat your password" autoComplete="new-password" required /></label></div><button type="submit" className="account-primary" disabled={submitting}>{submitting ? 'Creating account…' : 'Create an account'}<span>→</span></button></form>}
            <div className="account-form-footer"><p>Already placed an order? <Link to="/track-order">Track it here ↗</Link></p><p><Link to="/privacy">Privacy policy</Link><span> · </span><Link to="/terms">Terms & conditions</Link></p></div>
        </div>
    </section>;
};

export default CustomerLoginPage;
