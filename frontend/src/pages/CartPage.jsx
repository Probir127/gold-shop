import React from 'react';
import { useCart } from '../context/CartContext';
import CartItem from '../components/cart/CartItem';
import { formatPrice } from '../utils/formatters';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Lock } from 'lucide-react';

const CartPage = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const makingCharges = cart.reduce((total, item) => total + (500 * item.weight * item.quantity), 0); // Approx
    const subTotal = cartTotal;
    const vat = subTotal * 0.05;
    const total = subTotal + vat;

    if (cart.length === 0) {
        return (
            <div className="section" style={{ textAlign: 'center', padding: '100px 0' }}>
                <div className="container">
                    <div style={{ marginBottom: '20px', color: '#333' }}>
                        <ShoppingBag size={60} />
                    </div>
                    <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '10px' }}>Your Cart is Empty</h2>
                    <p style={{ color: '#888', marginBottom: '30px' }}>Looks like you haven't added any items yet.</p>
                    <Link to="/shop" className="btn btn-primary">
                        Start Shopping
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="section">
            <div className="container">
                <h1 className="section-title">Shopping Cart</h1>

                <div className="cart-grid">
                    {/* Cart Items List */}
                    <div className="cart-list-container">
                        {/* Header */}
                        <div style={{
                            padding: '15px 20px',
                            borderBottom: '1px solid #333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#1a1a1a'
                        }}>
                            <span style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888' }}>Product Details</span>
                            <button
                                onClick={clearCart}
                                style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', cursor: 'pointer', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.target.style.color = '#fff'}
                                onMouseLeave={(e) => e.target.style.color = '#666'}
                            >
                                Clear Cart
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {cart.map(item => (
                                <CartItem key={item.id} item={item} />
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div>
                        <div className="cart-summary-card">
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
                                Order Summary
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#ccc' }}>
                                    <span>Subtotal ({cart.length} items)</span>
                                    <span>{formatPrice(subTotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#ccc' }}>
                                    <span>VAT (5%)</span>
                                    <span>{formatPrice(vat)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#22c55e' }}>
                                    <span>Shipping</span>
                                    <span>Free</span>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #333', paddingTop: '15px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>Total Amount</span>
                                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-gold-primary)' }}>{formatPrice(total)}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0a0a0a', padding: '8px', borderRadius: '4px' }}>
                                    <Lock size={12} /> Price locked until checkout completion
                                </div>
                            </div>

                            <Link to="/checkout" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: '50px' }}>
                                Proceed to Checkout <ArrowRight size={18} style={{ marginLeft: '10px' }} />
                            </Link>

                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <p style={{ fontSize: '12px', color: '#555', lineHeight: '1.6' }}>
                                    Secure Payment Processing • 100% Purity Guarantee • Insured Shipping • Lifetime Warranty
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
