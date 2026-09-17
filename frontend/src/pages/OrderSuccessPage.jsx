import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { formatPrice } from '../utils/formatters';
import { api } from '../services/api';

const OrderSuccessPage = () => {
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const queryOrderId = query.get('id');
    const [order, setOrder] = useState(location.state || null);
    const orderId = order?.orderId || order?.order_id || queryOrderId || 'UNKNOWN';
    const total = order?.total || 0;

    useEffect(() => {
        if (!queryOrderId || order?.total) return;

        let active = true;
        api.getOrder(queryOrderId)
            .then((data) => {
                if (active) setOrder(data);
            })
            .catch(() => {
                if (active) setOrder({ orderId: queryOrderId, total: 0 });
            });

        return () => {
            active = false;
        };
    }, [queryOrderId, order]);

    return (
        <div className="section result-page" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="container" style={{ textAlign: 'center', maxWidth: '600px' }}>
                <div style={{ marginBottom: '30px' }}>
                    <CheckCircle size={80} style={{ color: '#22c55e', margin: '0 auto' }} />
                </div>

                <h1 className="section-title" style={{ marginBottom: '10px' }}>Order Confirmed!</h1>
                <p style={{ color: '#888', fontSize: '1.2rem', marginBottom: '30px' }}>
                    Thank you for choosing Sahara Gold. Your order has been placed successfully.
                </p>

                <div style={{ backgroundColor: '#111', padding: '30px', borderRadius: '8px', border: '1px solid #222', marginBottom: '40px' }}>
                    <p style={{ color: '#ccc', marginBottom: '10px' }}>Order ID</p>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-gold-primary)', letterSpacing: '2px', marginBottom: '20px' }}>
                        {orderId}
                    </div>

                    <div style={{ borderTop: '1px solid #333', paddingTop: '20px' }}>
                        <p style={{ color: '#ccc', fontSize: '14px' }}>
                            Order Total: <span style={{ color: '#fff', fontWeight: 'bold' }}>{formatPrice(total)}</span>
                        </p>
                        <p style={{ color: '#ccc', fontSize: '14px', marginTop: '10px' }}>
                            We will contact you shortly to confirm your delivery details.
                        </p>
                    </div>

                    {orderId && orderId !== 'UNKNOWN' && (() => {
                        const rawUrl = order?.customer_invoice_url || order?.customerInvoiceUrl || '';
                        const backend = import.meta.env.VITE_BACKEND_URL || '';
                        const invUrl = rawUrl && !rawUrl.startsWith('http') && backend && !backend.startsWith('http://localhost')
                            ? `${backend.replace(/\/+$/, '')}${rawUrl}`
                            : (rawUrl || `/api/orders/${orderId}/invoice/?copy=customer`);
                        const pdfUrl = backend && !backend.startsWith('http://localhost')
                            ? `${backend.replace(/\/+$/, '')}/api/orders/${orderId}/pdf/`
                            : `/api/orders/${orderId}/pdf/`;

                        return (
                            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #333' }}>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <a 
                                        href={invUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-primary"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            textDecoration: 'none',
                                            background: 'linear-gradient(135deg, #d4af37, #b8860b)',
                                            color: '#000',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.35)'
                                        }}
                                    >
                                        📄 View Official Hallmark Invoice
                                    </a>
                                    <a
                                        href={pdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-outline"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 18px',
                                            fontSize: '13px',
                                            borderRadius: '8px',
                                        }}
                                    >
                                        📥 Download PDF
                                    </a>
                                </div>
                                <p style={{ color: '#777', fontSize: '12px', marginTop: '12px' }}>
                                    An official certified PDF invoice with 100% BSTI Hallmark Gold Authenticity Certificate has also been dispatched to your email via secure SMTP.
                                </p>
                            </div>
                        );
                    })()}
                </div>

                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/" className="btn btn-outline">
                        Continue Shopping
                    </Link>
                    <Link to="/track-order" className="btn btn-outline">
                        Track Order Status
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccessPage;
