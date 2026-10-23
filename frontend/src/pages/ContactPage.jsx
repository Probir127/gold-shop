import React, { useState } from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { validateEnquiry } from '../utils/formValidation';
import { useStorefrontContent } from '../hooks/useStorefrontContent';
import SEO from '../components/SEO';
import './support-v2.css';

export default function ContactPage() {
    const { data: content } = useStorefrontContent();
    const [form, setForm] = useState({ name: '', mobile: '', email: '', message: '', website: '' });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [submitting, setSubmitting] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const update = event => setForm({ ...form, [event.target.name]: event.target.value });
    async function handleSubmit(event) {
        event.preventDefault();
        if (submitting) return;
        const validation = validateEnquiry(form);
        if (validation) { setStatus({ type: 'error', message: validation }); return; }
        setStatus({ type: '', message: '' }); setSubmitting(true);
        try { const response = await api.sendContactEnquiry(form); setStatus({ type: 'success', message: response.detail }); setForm({ name: '', mobile: '', email: '', message: '', website: '' }); }
        catch (error) { setStatus({ type: 'error', message: error.message }); }
        finally { setSubmitting(false); }
    }
    const mapQuery = encodeURIComponent(content.address);
    return <div className="sv2 sv2-contact">
        <SEO title="Contact & Visit" description="Speak with New Sahara Gold and Diamond or visit us at Bashundhara City, Dhaka." />
        <header className="sv2-masthead"><span className="sv2-eyebrow">Sahara / Personal service</span><h1>{content.contact_title}</h1><p>{content.contact_description}</p></header>
        <section className="sv2-contact-grid sv2-wrap">
            <div className="sv2-contact-details"><span className="sv2-eyebrow">Let’s talk</span><h2>Here for you.</h2><a href={`tel:${content.contact_phone.replace(/[^+\d]/g, '')}`} className="sv2-contact-line"><span>Call the shop</span><strong>{content.contact_phone}</strong><ArrowUpRight size={20} /></a><a href={`mailto:${content.contact_email}`} className="sv2-contact-line"><span>Write to us</span><strong>{content.contact_email}</strong><ArrowUpRight size={20} /></a><div className="sv2-contact-address"><span className="sv2-eyebrow">Visit Sahara</span><p>{content.address}</p><a className="sv2-text-link" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer">Get directions <ArrowUpRight size={16} /></a></div></div>
            <form className="sv2-form sv2-enquiry" onSubmit={handleSubmit}><span className="sv2-eyebrow">A note to our team</span><h2>How can we help?</h2><div aria-hidden="true" className="sv2-honeypot"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={update} /></label></div><div className="sv2-form-pair"><label>Your name<input name="name" autoComplete="name" value={form.name} onChange={update} minLength={2} maxLength={150} required /></label><label>Mobile number<input name="mobile" type="tel" autoComplete="tel" value={form.mobile} onChange={update} maxLength={20} required /></label></div><label>Email <small>(optional)</small><input name="email" type="email" autoComplete="email" value={form.email} onChange={update} maxLength={254} /></label><label>Your message<textarea name="message" value={form.message} onChange={update} rows={4} required minLength={10} maxLength={5000} placeholder="Tell us about the piece or question you have in mind." /></label>{status.message && <p className={`sv2-notice ${status.type}`} role="status">{status.message}</p>}<button className="sv2-button" disabled={submitting}>{submitting ? 'Sending your message…' : 'Send your enquiry'}<ArrowRight size={18} /></button><p className="sv2-fine">Please do not include passwords or payment card details.</p></form>
        </section>
        <section className="sv2-location sv2-wrap"><div><span className="sv2-eyebrow">Dhaka, Bangladesh</span><h2>Come a little closer.</h2><p>{content.address}</p></div>{showMap ? <iframe title="New Sahara Gold and Diamond location" src={`https://www.google.com/maps?q=${mapQuery}&output=embed`} loading="lazy" referrerPolicy="no-referrer" /> : <button className="sv2-map-trigger" onClick={() => setShowMap(true)}><span>Explore our location</span><ArrowUpRight size={28} /><small>Load map · connects to Google</small></button>}</section>
    </div>;
}
