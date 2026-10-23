import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './privacy.css';
import { useStorefrontContent } from '../../hooks/useStorefrontContent';

const KEY = 'sahara_privacy_v1';
function readChoice() {
    try { const value = localStorage.getItem(KEY); return ['accepted', 'rejected'].includes(value) ? value : null; } catch { return null; }
}
function clearAnalyticsCookies() {
    document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0].trim();
        if (!/^_ga(?:_|$)/.test(name)) return;
        const domains = [null, window.location.hostname, ...window.location.hostname.split('.').map((_, i, parts) => `.${parts.slice(i).join('.')}`)];
        domains.forEach(domain => { document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ''} SameSite=Lax`; });
    });
}
export default function CookieConsent() {
    const { data } = useStorefrontContent();
    const measurementId = data?.ga4_measurement_id || '';
    const analyticsConfigured = /^G-[A-Z0-9]+$/.test(measurementId);
    const [choice, setChoice] = useState(readChoice);
    const [open, setOpen] = useState(() => !readChoice());
    const location = useLocation();
    const admin = location.pathname.startsWith('/admin');
    const analyticsPage = ['/', '/shop', '/about', '/contact', '/gold-rates'].includes(location.pathname);
    useEffect(() => {
        const sync = () => { setChoice(readChoice()); };
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);
    useEffect(() => {
        if (!analyticsConfigured) return;
        const enabled = choice === 'accepted' && analyticsPage;
        window[`ga-disable-${measurementId}`] = !enabled;
        if (!enabled) {
            window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
            document.getElementById('sahara-analytics')?.remove();
            clearAnalyticsCookies();
            return;
        }
        window.dataLayer ||= [];
        window.gtag ||= function () { window.dataLayer.push(arguments); };
        window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
        window.gtag('js', new Date());
        window.gtag('config', measurementId, { send_page_view: false, page_location: `${window.location.origin}${location.pathname}`, page_referrer: '', allow_google_signals: false, allow_ad_personalization_signals: false });
        if (!document.getElementById('sahara-analytics')) {
            const script = document.createElement('script');
            script.id = 'sahara-analytics'; script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
            document.head.appendChild(script);
        }
        return () => { window[`ga-disable-${measurementId}`] = true; };
    }, [choice, analyticsPage, location.pathname, measurementId, analyticsConfigured]);
    useEffect(() => {
        // No query strings, account pages or order identifiers in analytics.
        if (choice !== 'accepted' || admin || !analyticsConfigured) return;
        const path = location.pathname;
        if (!['/', '/shop', '/about', '/contact', '/gold-rates'].includes(path)) return;
        window.gtag?.('event', 'page_view', { page_location: `${window.location.origin}${path}`, page_path: path, page_referrer: '' });
    }, [choice, admin, location.pathname, measurementId, analyticsConfigured]);
    const save = (value) => {
        try { localStorage.setItem(KEY, value); } catch { /* The choice still applies to this visit. */ }
        setChoice(value); setOpen(false);
    };
    if (admin) return null;
    return <>
        <button className="privacy-settings" type="button" onClick={() => setOpen(true)}>Privacy choices</button>
        {open && <section className="privacy-banner" aria-labelledby="privacy-title" aria-live="polite">
            <div><h2 id="privacy-title">Your privacy, your choice.</h2>
                <p>Essential storage keeps your cart, sign-in and privacy choices working. {analyticsConfigured ? 'With permission, optional analytics helps us understand visits.' : 'Optional analytics is currently disabled.'} Read our <Link to="/privacy">Privacy Policy</Link>.</p></div>
            <div className="privacy-actions">
                <button type="button" onClick={() => save('rejected')}>Essential only</button>
                {analyticsConfigured && <button type="button" onClick={() => save('accepted')}>Allow analytics</button>}
                {choice && <button type="button" onClick={() => setOpen(false)}>Close</button>}
            </div>
        </section>}
    </>;
}
