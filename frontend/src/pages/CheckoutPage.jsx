
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, Truck, CreditCard, ArrowRight, ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CheckoutStepper from '../components/checkout/CheckoutStepper';

const CheckoutPage = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(2);

    // Auth guard — get stored customer profile
    const customer = (() => {
        try { return JSON.parse(localStorage.getItem('sahara_customer') || 'null'); }
        catch { return null; }
    })();

    const [formData, setFormData] = useState({
        customer_name: customer?.name || '',
        customer_phone: customer?.phone || '',
        customer_email: customer?.email || '',
        address: '',
        city: 'Dhaka',
        paymentMethod: 'cod'
    });

    // Redirect if not logged in
    if (!customer) {
        return <Navigate to="/login?next=/checkout" replace />;
    }

    // Calculate totals
    const subTotal = cartTotal;
    const total = subTotal;

    if (cart.length === 0) {
        navigate('/cart');
        return null;
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateShipping = () => {
        if (!formData.customer_name || !formData.customer_phone || !formData.address) {
            toast.error("Please fill in all required fields.");
            return false;
        }
        return true;
    };

    const nextStep = () => {
        if (currentStep === 2 && validateShipping()) {
            setCurrentStep(3);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Step 1: Create order
            const items = cart.map(item => ({
                product_id: Number(item.id),
                quantity: Math.max(1, Number(item.quantity) || 1),
            }));

            if (items.some(item => !Number.isInteger(item.product_id) || item.product_id <= 0)) {
                throw new Error('Your cart contains an invalid product. Please remove it and add the product again.');
            }

            const orderData = {
                customer_name: formData.customer_name,
                customer_phone: formData.customer_phone,
                customer_email: formData.customer_email,
                shipping_address: formData.address,
                city: formData.city,
                payment_method: formData.paymentMethod,
                items: items
            };

            const response = await api.createOrder(orderData);

            // Step 2: Handle payment
            if (formData.paymentMethod === 'bkash') {
                // Initiate SSL Payment
                try {
                    const paymentResult = await api.initiateSslPayment(response.order_id, response.customer_access_token);

                    if (paymentResult.success && paymentResult.gateway_url) {
                        // Redirect to SSLCommerz
                        window.location.href = paymentResult.gateway_url;
                        return;
                    } else {
                        throw new Error('Invalid payment response');
                    }
                } catch (err) {
                    toast.error('Payment initiation failed. Please try again.');
                    // clearCart();
                    // navigate('/order-success', { state: { orderId: response.order_id, total: response.total, status: 'payment_failed' } });
                    return;
                }
            }

            // COD flow
            clearCart();
            navigate('/order-success', { state: {
                orderId: response.order_id,
                total: response.total,
                customerInvoiceUrl: response.customer_invoice_url,
            } });
        } catch (error) {
            console.error("Order failed", error);
            toast.error(error.message || "Failed to place order. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const stepVariants = {
        hidden: { opacity: 0, x: 50 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, x: -50, transition: { duration: 0.5 } }
    };

    return (
        <div className="section checkout-page min-h-screen pt-12">
            <div className="container">
                <h1 className="section-title text-center mb-10">Secure Checkout</h1>
                {/* Verified account banner */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
                    borderRadius: '10px', padding: '10px 18px', marginBottom: '24px',
                    fontSize: '13px', color: '#4ade80',
                }}>
                    <UserCheck size={16} />
                    <span>Checking out as <strong>{customer.name}</strong> ({customer.phone})</span>
                </div>
                <CheckoutStepper currentStep={currentStep} />

                <div className="checkout-grid">

                    {/* LEFT COLUMN: STEPS */}
                    <div style={{ width: '100%' }}>
                        <AnimatePresence mode="wait">
                            {currentStep === 2 && (
                                <motion.div
                                    key="step2"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="checkout-card"
                                >
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.05, pointerEvents: 'none' }}>
                                        <Truck size={120} />
                                    </div>

                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'var(--color-gold-primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>2</span>
                                        Shipping Information
                                    </h3>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label className="input-label">Full Name *</label>
                                            <input
                                                name="customer_name"
                                                value={formData.customer_name}
                                                onChange={handleChange}
                                                className="input-premium"
                                                placeholder="Enter your name"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="input-label">Phone Number *</label>
                                            <input
                                                name="customer_phone"
                                                value={formData.customer_phone}
                                                onChange={handleChange}
                                                className="input-premium"
                                                placeholder="+880..."
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="input-label">Email (Optional)</label>
                                            <input
                                                name="customer_email"
                                                value={formData.customer_email}
                                                onChange={handleChange}
                                                className="input-premium"
                                                placeholder="receipts@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="input-label">City *</label>
                                            <select
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                className="input-premium"
                                            >
                                                <option value="Dhaka">Dhaka</option>
                                                <option value="Chittagong">Chittagong</option>
                                                <option value="Sylhet">Sylhet</option>
                                                <option value="Rajshahi">Rajshahi</option>
                                                <option value="Khulna">Khulna</option>
                                                <option value="Barisal">Barisal</option>
                                                <option value="Rangpur">Rangpur</option>
                                                <option value="Mymensingh">Mymensingh</option>
                                            </select>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label className="input-label">Detailed Address *</label>
                                            <textarea
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                rows="3"
                                                className="input-premium"
                                                style={{ resize: 'none' }}
                                                placeholder="House #, Road #, Area..."
                                                required
                                            ></textarea>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                                        <button
                                            onClick={nextStep}
                                            className="btn btn-primary"
                                            style={{ padding: '0 2rem' }}
                                        >
                                            Continue to Payment <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 3 && (
                                <motion.div
                                    key="step3"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="checkout-card"
                                >
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.05, pointerEvents: 'none' }}>
                                        <CreditCard size={120} />
                                    </div>

                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'var(--color-gold-primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>3</span>
                                        Payment Method
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                                        <div
                                            className={`radio-option ${formData.paymentMethod === 'cod' ? 'selected' : ''}`}
                                            onClick={() => setFormData({ ...formData, paymentMethod: 'cod' })}
                                        >
                                            <div className="radio-circle"></div>
                                            <div style={{ backgroundColor: '#222', padding: '0.5rem', borderRadius: '4px', color: 'var(--color-gold-primary)' }}>
                                                <Truck size={24} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#fff' }}>Cash on Delivery</div>
                                                <div style={{ fontSize: '0.875rem', color: '#888' }}>Pay securely when you receive your order</div>
                                            </div>
                                        </div>

                                        <div
                                            className={`radio-option ${formData.paymentMethod === 'bkash' ? 'selected' : ''}`}
                                            onClick={() => setFormData({ ...formData, paymentMethod: 'bkash' })}
                                        >
                                            <div className="radio-circle"></div>
                                            <div style={{ backgroundColor: '#222', padding: '0.5rem', borderRadius: '4px', color: '#4ade80' }}>
                                                <ShieldCheck size={24} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#fff' }}>Online Payment (SSLCommerz)</div>
                                                <div style={{ fontSize: '0.875rem', color: '#888' }}>bKash, Nagad, Visa, Mastercard</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #222' }}>
                                        <button
                                            onClick={prevStep}
                                            style={{ background: 'none', border: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                            onMouseEnter={(e) => e.target.style.color = '#fff'}
                                            onMouseLeave={(e) => e.target.style.color = '#888'}
                                        >
                                            <ArrowLeft size={18} /> Back to Shipping
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                            className="btn btn-primary"
                                            style={{ padding: '0 2rem', opacity: isSubmitting ? 0.7 : 1 }}
                                        >
                                            {isSubmitting ? 'Processing...' : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Lock size={16} /> Confirm Order
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT COLUMN: SUMMARY */}
                    <div className="summary-sticky">
                        <div className="checkout-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#fff', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>Order Summary</h3>

                            <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {cart.map(item => (
                                    <div key={item.id} style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ position: 'relative', width: '3rem', height: '3rem', flexShrink: 0 }}>
                                            <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                                            <span style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem', backgroundColor: '#333', color: '#fff', fontSize: '10px', width: '1.25rem', height: '1.25rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #111' }}>
                                                {item.quantity}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: '0.875rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                                            <p style={{ fontSize: '0.75rem', color: '#888' }}>{item.weight}g • {item.purity}</p>
                                        </div>
                                        <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#fff' }}>{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid #333', paddingTop: '1rem', fontSize: '0.875rem', color: '#888' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Subtotal</span>
                                    <span>{formatPrice(subTotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80' }}>
                                    <span>Shipping</span>
                                    <span>Free</span>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #222', marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#888' }}>Total</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-gold-primary)' }}>{formatPrice(total)}</span>
                            </div>

                            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#555', backgroundColor: '#0a0a0a', padding: '0.75rem', borderRadius: '4px' }}>
                                <Lock size={12} />
                                SSL Encrypted & Secure Transaction
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
