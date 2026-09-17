import React, { useState } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { formatPrice } from '../utils/formatters';

const OrderTrackingPage = () => {
    const [orderId, setOrderId] = useState('');
    const [phone, setPhone] = useState('');
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setOrder(null);
        setLoading(true);

        try {
            const data = await api.trackOrder(orderId, phone);
            setOrder(data);
        } catch (err) {
            console.error(err);
            if (err.message === 'Failed to fetch') {
                setError('Network error. Unable to reach the server. Please check your connection and try again.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Helper to determine active step
    const getStepStatus = (status) => {
        const steps = ['pending', 'processing', 'shipped', 'delivered'];
        const currentStatus = (order?.order_status || 'pending').toLowerCase();
        const stepStatus = status.toLowerCase();

        const currentIdx = steps.indexOf(currentStatus);
        const stepIdx = steps.indexOf(stepStatus);

        if (stepIdx < currentIdx) return 'completed';
        if (stepIdx === currentIdx) return 'active';
        return 'pending';
    };

    return (
        <div className="section tracking-page" style={{ minHeight: '60vh' }}>
            <div className="container" style={{ maxWidth: '800px' }}>
                <h1 className="section-title">Track Your Order</h1>

                {/* Search Form */}
                <div style={{ backgroundColor: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #222', marginBottom: '40px' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Order ID</label>
                            <input
                                type="text"
                                placeholder="ORD-123456"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                className="input-field"
                                style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '6px' }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Phone Number</label>
                            <input
                                type="tel"
                                placeholder="017..."
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="input-field"
                                style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '6px' }}
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'end' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{ height: '46px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {loading ? 'Searching...' : <><Search size={18} /> Track</>}
                            </button>
                        </div>
                    </form>
                    {error && (
                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <AlertCircle size={20} /> {error}
                        </div>
                    )}
                </div>

                {/* Tracking Result */}
                {order && (
                    <div className="fade-in" style={{ animation: 'fadeIn 0.5s ease' }}>

                        {/* Status Timeline */}
                        <div style={{ marginBottom: '40px', padding: '30px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                                {/* Timeline Line */}
                                <div style={{ position: 'absolute', top: '25px', left: '0', right: '0', height: '2px', background: '#333', zIndex: 0 }} />

                                <TimelineStep title="Order Placed" icon={<Clock size={20} />} status={getStepStatus('Pending')} />
                                <TimelineStep title="Processing" icon={<Package size={20} />} status={getStepStatus('Processing')} />
                                <TimelineStep title="Shipped" icon={<Truck size={20} />} status={getStepStatus('Shipped')} />
                                <TimelineStep title="Delivered" icon={<CheckCircle size={20} />} status={getStepStatus('Delivered')} />
                            </div>
                        </div>

                        {/* Order Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                            <div style={{ backgroundColor: '#111', padding: '25px', borderRadius: '12px', border: '1px solid #222' }}>
                                <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>Order Items</h3>
                                {order.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #222' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: '#fff' }}>{item.product_name}</div>
                                            <div style={{ fontSize: '13px', color: '#888' }}>{item.weight}g x {item.quantity}</div>
                                        </div>
                                        <div style={{ color: 'var(--color-gold-primary)' }}>
                                            {formatPrice(item.price_at_purchase * item.quantity)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ backgroundColor: '#111', padding: '25px', borderRadius: '12px', border: '1px solid #222', height: 'fit-content' }}>
                                <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>Summary</h3>
                                <InfoRow label="Order ID" value={order.order_id} />
                                <InfoRow label="Date" value={new Date(order.created_at).toLocaleDateString()} />
                                <InfoRow label="Status" value={order.order_status} highlight />
                                <InfoRow label="Total Amount" value={formatPrice(order.total)} isPrice />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

const TimelineStep = ({ title, icon, status }) => {
    let color = '#333';
    let bg = '#111';

    if (status === 'completed') { color = '#22c55e'; bg = '#064e3b'; }
    if (status === 'active') { color = 'var(--color-gold-primary)'; bg = '#422a00'; }

    return (
        <div style={{ zIndex: 1, textAlign: 'center', backgroundColor: '#1a1a1a', padding: '0 10px' }}>
            <div style={{
                width: '50px', height: '50px', borderRadius: '50%',
                backgroundColor: bg, border: `2px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: color, margin: '0 auto 10px auto', transition: 'all 0.3s ease'
            }}>
                {icon}
            </div>
            <div style={{ fontSize: '12px', color: status === 'pending' ? '#666' : '#fff', fontWeight: status === 'active' ? 'bold' : 'normal' }}>
                {title}
            </div>
        </div>
    );
};

const InfoRow = ({ label, value, highlight, isPrice }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ color: '#888' }}>{label}</span>
        <span style={{
            fontWeight: 'bold',
            color: highlight ? 'var(--color-gold-primary)' : isPrice ? '#fff' : '#ccc',
            fontSize: isPrice ? '18px' : '14px'
        }}>{value}</span>
    </div>
);

export default OrderTrackingPage;
