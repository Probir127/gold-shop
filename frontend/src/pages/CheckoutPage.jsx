
import React, { useEffect, useRef, useState } from 'react';
import { validateShipping as shippingError } from '../utils/formValidation';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import './purchase-v2.css';
import SEO from '../components/SEO';
import { usePaymentConfiguration } from '../hooks/usePaymentConfiguration';

const CheckoutPage = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();
    const {data: paymentConfig, isError: paymentConfigError} = usePaymentConfiguration();
    const pendingOrder = useRef(null);
    const submitLock = useRef(false);
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
        paymentMethod: 'manual'
    });

    // Redirect if not logged in
    if (!customer) {
        return <Navigate to="/login?next=/checkout" replace />;
    }

    // Calculate totals
    const subTotal = cartTotal;
    const total = subTotal;

    if (cart.length === 0) {
        return <Navigate to="/cart" replace />;
    }

    const handleChange = (e) => {
        if (pendingOrder.current) { toast.error('This order is already created. Contact us to change its details.'); return; }
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateShipping = () => {
        const error = shippingError(formData);
        if (error) {
            toast.error(error);
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

    useEffect(() => { if (paymentConfig && !paymentConfig.ssl_enabled) setFormData(previous => ({...previous, paymentMethod:'manual'})); }, [paymentConfig]);

    const selectPayment = (paymentMethod) => {
        if (pendingOrder.current) { toast.error('Retry payment for the existing order, or contact us to change it.'); return; }
        setFormData({ ...formData, paymentMethod });
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitLock.current || !validateShipping()) return;
        submitLock.current = true;
        setIsSubmitting(true);

        try {
            // Step 1: Create order
            const items = cart.map(item => ({
                product_id: Number(item.id),
                quantity: Number(item.quantity),
            }));

            if (items.some(item => !Number.isInteger(item.product_id) || item.product_id <= 0 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) {
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

            const response = pendingOrder.current || await api.createOrder(orderData);
            pendingOrder.current = response;

            // Step 2: Handle payment
            if (formData.paymentMethod === 'bkash') {
                // Initiate SSL Payment
                try {
                    const paymentResult = await api.initiateSslPayment(response.order_id, response.customer_access_token);

                    if (paymentResult.success && paymentResult.gateway_url) {
                        // Redirect to SSLCommerz
                        const gateway = new URL(paymentResult.gateway_url);
                        if (gateway.protocol !== 'https:' || !(gateway.hostname === 'sslcommerz.com' || gateway.hostname.endsWith('.sslcommerz.com'))) throw new Error('Untrusted payment gateway');
                        window.location.href = gateway.href;
                        return;
                    } else {
                        throw new Error('Invalid payment response');
                    }
                } catch (err) {
                    toast.error(`Order ${response.order_id} was created, but payment could not start. Retry payment here without creating another order.`);
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
                payment_method: response.payment_method,
                payment_status: response.payment_status,
                order_status: response.order_status,
            } });
        } catch (error) {
            console.error("Order failed", error);
            toast.error(error.message || "Failed to place order. Please try again.");
        } finally {
            submitLock.current = false;
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pv2-checkout"><SEO title="Checkout" noindex />
            <header className="pv2-checkout-heading"><Link to="/cart"><ArrowLeft size={16} /> Return to your bag</Link><p className="pv2-kicker">Made yours</p><h1>The final details.</h1><p>A few details, then a piece to make your own.</p></header>
            <ol className="pv2-progress" aria-label="Checkout progress">{['Your bag', 'Delivery', 'Payment'].map((label, index) => <li key={label} data-current={currentStep === index + 1} data-complete={currentStep > index + 1} aria-current={currentStep === index + 1 ? 'step' : undefined}><span>{currentStep > index + 1 ? <Check size={14} /> : `0${index + 1}`}</span>{label}</li>)}</ol>
            <div className="pv2-checkout-layout">
                <main className="pv2-checkout-form">
                    <div className="pv2-account-note"><Check size={16} /><span>Signed in as <strong>{customer.name}</strong><small>{customer.phone}</small></span></div>
                    {currentStep === 2 ? <form onSubmit={event => { event.preventDefault(); nextStep(); }}>
                        <div className="pv2-form-heading"><span>01</span><div><h2>Where shall we send it?</h2><p>Enter the contact and address details for this order.</p></div></div>
                        <fieldset className="pv2-fields" disabled={!!pendingOrder.current}><legend className="pv2-sr-only">Delivery details</legend>
                            <label className="pv2-field pv2-field-wide" htmlFor="checkout-name">Full name <span>Required</span><input id="checkout-name" name="customer_name" type="text" autoComplete="name" maxLength={150} value={formData.customer_name} onChange={handleChange} placeholder="Your full name" required /></label>
                            <label className="pv2-field" htmlFor="checkout-phone">Phone number <span>Required</span><input id="checkout-phone" name="customer_phone" type="tel" autoComplete="tel" maxLength={20} value={formData.customer_phone} onChange={handleChange} placeholder="+880" required /></label>
                            <label className="pv2-field" htmlFor="checkout-email">Email address <span>Optional</span><input id="checkout-email" name="customer_email" type="email" autoComplete="email" maxLength={254} value={formData.customer_email} onChange={handleChange} placeholder="For your receipt" /></label>
                            <label className="pv2-field pv2-field-wide" htmlFor="checkout-address">Delivery address <span>Required</span><textarea id="checkout-address" name="address" autoComplete="street-address" maxLength={1000} minLength={10} value={formData.address} onChange={handleChange} rows={3} placeholder="House, road, area and any helpful directions" required /></label>
                            <label className="pv2-field" htmlFor="checkout-city">City <span>Required</span><select id="checkout-city" name="city" autoComplete="address-level2" value={formData.city} onChange={handleChange}>{['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'].map(city => <option key={city} value={city}>{city}</option>)}</select></label>
                        </fieldset>
                        <div className="pv2-form-actions"><span>Next: choose how to pay</span><button type="submit" className="pv2-primary">Continue <ArrowRight size={17} /></button></div>
                    </form> : <form onSubmit={handleSubmit}>
                        <div className="pv2-form-heading"><span>02</span><div><h2>A little closer to yours.</h2><p>Review your delivery details and choose a payment method.</p></div></div>
                        <section className="pv2-delivery-review" aria-label="Delivery details"><div><p className="pv2-kicker">Deliver to</p><strong>{formData.customer_name}</strong><p>{formData.address}, {formData.city}</p><p>{formData.customer_phone}</p></div><button type="button" onClick={prevStep}>Edit details</button></section>
                        <fieldset className="pv2-payment-methods"><legend>How would you like to pay?</legend>
                            <label data-selected={formData.paymentMethod === 'manual'}><input type="radio" name="payment-method" value="manual" checked={formData.paymentMethod === 'manual'} onChange={() => selectPayment('manual')} /><span><strong>Merchant payment — call the shop</strong><small>Pay using the merchant details provided by our team. Your order stays pending until admin verifies payment.</small></span></label>
                            {paymentConfig?.ssl_enabled && <label data-selected={formData.paymentMethod === 'bkash'}><input type="radio" name="payment-method" value="bkash" checked={formData.paymentMethod === 'bkash'} onChange={() => selectPayment('bkash')} /><span><strong>Online payment</strong><small>Pay securely through SSLCommerz.</small></span></label>}
                            {paymentConfig && <div><p>{paymentConfig.instructions}</p>{paymentConfig.merchant_number && <p>Merchant number: <strong>{paymentConfig.merchant_number}</strong></p>}<a className="sv2-text-link" href={`tel:${paymentConfig.contact_phone}`}>Call {paymentConfig.contact_phone}</a></div>}
                            {paymentConfigError && <p role="alert">Payment instructions could not be loaded. Refresh before placing your order.</p>}
                        </fieldset>
                        <p className="pv2-checkout-terms">Please review our <Link to="/terms">terms</Link> and <Link to="/refund-policy">exchange policy</Link> before placing your order.</p>
                        <div className="pv2-form-actions"><button type="button" className="pv2-back" onClick={prevStep}><ArrowLeft size={16} /> Delivery</button><button type="submit" className="pv2-primary" disabled={isSubmitting || !paymentConfig}><Lock size={15} />{isSubmitting ? 'Processing…' : pendingOrder.current ? 'Retry payment' : formData.paymentMethod === 'manual' ? 'Submit order for verification' : 'Continue to payment'}</button></div>
                    </form>}
                </main>
                <aside className="pv2-order-summary" aria-label="Your selection"><div className="pv2-summary-heading"><p className="pv2-kicker">Your selection</p><span>{cart.reduce((sum, item) => sum + Number(item.quantity), 0)} pieces</span></div><h2>A new chapter.</h2>
                    <ul className="pv2-summary-products">{cart.map(item => <li key={item.id}><Link to={`/product/${item.id}`}><img src={item.image} alt={item.name} /></Link><div><Link to={`/product/${item.id}`}>{item.name}</Link><p>{item.purity} · {item.weight} g</p><small>Quantity {item.quantity}</small><strong>{formatPrice(item.price * item.quantity)}</strong></div></li>)}</ul>
                    <dl className="pv2-summary-totals"><div><dt>Subtotal</dt><dd>{formatPrice(subTotal)}</dd></div><div><dt>Delivery charge</dt><dd>Not added</dd></div><div className="pv2-summary-total"><dt>Estimated total</dt><dd>{formatPrice(total)}</dd></div></dl>
                    <p className="pv2-summary-note">Prices are confirmed by the store when your order is submitted.</p><Link className="pv2-summary-help" to="/contact">Need a hand with your order? →</Link>
                </aside>
            </div>
        </div>
    );
};

export default CheckoutPage;
