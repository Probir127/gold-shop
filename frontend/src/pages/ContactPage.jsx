import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { STORE_INFO } from '../utils/constants';
import { api } from '../services/api';

const ContactPage = () => {
    const [form, setForm] = useState({ name: '', mobile: '', email: '', message: '' });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus({ type: '', message: '' });
        setSubmitting(true);
        try {
            const response = await api.sendContactEnquiry(form);
            setStatus({ type: 'success', message: response.detail });
            setForm({ name: '', mobile: '', email: '', message: '' });
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const mapQuery = encodeURIComponent(STORE_INFO.address);

    return (
        <div className="editorial-page contact-page" style={{ backgroundColor: '#000', color: '#fff', paddingTop: '100px', minHeight: '100vh' }}>
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', marginBottom: '80px' }}
                >
                    <h1 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-heading)', color: 'var(--color-gold-primary)', marginBottom: '20px' }}>Contact Us</h1>
                    <div style={{ width: '80px', height: '2px', backgroundColor: 'var(--color-gold-primary)', margin: '0 auto 25px' }}></div>
                    <p style={{ color: '#888', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
                        Experience the brilliance of Sahara Gold firsthand. Our experts are ready to assist you with your bespoke jewelry needs.
                    </p>
                </motion.div>

                <section className="contact-map-section">
                    <div>
                        <p className="contact-map-kicker">Visit the showroom</p>
                        <h2>Find us in Bashundhara City</h2>
                        <p>{STORE_INFO.address}</p>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer" className="btn btn-outline">Open in Google Maps</a>
                    </div>
                    <iframe
                        title="Sahara Gold showroom map"
                        src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </section>

                <div className="contact-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px', marginBottom: '100px' }}>

                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 style={{ fontSize: '2rem', marginBottom: '40px', color: '#fff' }}>Get In Touch</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                            {[
                                { icon: <MapPin />, label: 'Flagship Showroom', val: STORE_INFO.address },
                                { icon: <Phone />, label: 'Mobile / WhatsApp', val: STORE_INFO.phone },
                                { icon: <Mail />, label: 'Email Enquiries', val: STORE_INFO.email },
                                { icon: <Clock />, label: 'Opening Hours', val: 'Wed - Mon: 11 AM - 9 PM (Tue Closed)', isSecondary: true },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                                    <div style={{ padding: '12px', backgroundColor: 'rgba(212, 175, 55, 0.1)', color: 'var(--color-gold-primary)', borderRadius: '12px' }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{item.label}</h4>
                                        <p style={{ fontSize: '1.1rem', color: item.isSecondary ? '#ef4444' : '#fff' }}>{item.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        style={{ padding: '40px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', backdropFilter: 'blur(10px)' }}
                    >
                        <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '30px' }}>Send An Enquiry</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '24px' }}>
                                <input type="text" placeholder="Full Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required style={{ width: '100%', padding: '16px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', borderRadius: '12px', outline: 'none' }} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <input type="tel" placeholder="Mobile number" value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} required style={{ width: '100%', padding: '16px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', borderRadius: '12px', outline: 'none' }} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <input type="email" placeholder="Email address (optional)" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} style={{ width: '100%', padding: '16px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', borderRadius: '12px', outline: 'none' }} />
                            </div>
                            <div style={{ marginBottom: '30px' }}>
                                <textarea rows="4" placeholder="How can we help you?" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required minLength={10} style={{ width: '100%', padding: '16px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', borderRadius: '12px', outline: 'none', resize: 'none' }}></textarea>
                            </div>
                            {status.message && (
                                <p className={`contact-form-status ${status.type}`} role="status">{status.message}</p>
                            )}
                            <button className="btn btn-primary" disabled={submitting} style={{ width: '100%', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                {submitting ? 'Sending...' : 'Send Enquiry'} <Send size={18} />
                            </button>
                        </form>
                    </motion.div>

                </div>
            </div>
        </div>
    );
};

export default ContactPage;

