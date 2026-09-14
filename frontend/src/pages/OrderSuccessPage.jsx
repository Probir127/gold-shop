import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { formatPrice } from '../utils/formatters';

const OrderSuccessPage = () => {
    const location = useLocation();
    const { orderId, total } = location.state || { orderId: 'UNKNOWN', total: 0 };

    return (
        <div className="section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

                    {orderId && orderId !== 'UNKNOWN' && (
                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #333' }}>
                            <a 
                                href={`/api/orders/${orderId}/invoice/?copy=customer`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    textDecoration: 'none',
                                    background: 'linear-gradient(135deg, #d4af37, #b8860b)',
                                    color: '#000',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.35)'
                                }}
                            >
                                📄 View / Download Official Invoice (Customer Copy)
                            </a>
                            <p style={{ color: '#777', fontSize: '12px', marginTop: '8px' }}>
                                Includes 100% BSTI Hallmark Gold Authenticity Certificate &amp; Tax Receipt
                            </p>
                        </div>
                    )}
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
