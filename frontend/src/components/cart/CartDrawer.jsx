import React from 'react';
import { X, ShoppingBag, ArrowRight, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CartDrawer = () => {
    const { cart, isCartOpen, toggleCart, cartTotal, removeFromCart, updateQuantity } = useCart();

    // Backdrop animation
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };

    // Drawer slide animation
    const drawerVariants = {
        hidden: { x: '100%' },
        visible: {
            x: 0,
            transition: { type: 'spring', damping: 25, stiffness: 200 }
        }
    };

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 99998,
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(4px)'
                        }}
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        onClick={toggleCart}
                    />

                    {/* Drawer */}
                    <motion.div
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: '400px',
                            maxWidth: '90vw',
                            zIndex: 99999,
                            backgroundColor: '#111',
                            borderLeft: '1px solid #333',
                            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        variants={drawerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                    >
                        {/* Header */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                                <ShoppingBag size={20} style={{ color: 'var(--color-gold-primary)' }} />
                                Your Cart <span style={{ color: '#666', fontSize: '14px', fontWeight: 'normal' }}>({cart.length} items)</span>
                            </h2>
                            <button
                                onClick={toggleCart}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#888',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#222';
                                    e.currentTarget.style.color = '#fff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#888';
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Items */}
                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {cart.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', color: '#666' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                        <ShoppingBag size={24} style={{ opacity: 0.5 }} />
                                    </div>
                                    <p style={{ fontSize: '18px', fontWeight: '500', color: '#fff', marginBottom: '8px' }}>Your cart is empty</p>
                                    <p style={{ fontSize: '14px', marginBottom: '24px' }}>Looks like you haven't added any jewelry yet.</p>
                                    <Link
                                        to="/shop"
                                        onClick={toggleCart}
                                        className="btn btn-outline"
                                    >
                                        Start Shopping
                                    </Link>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <AnimatePresence>
                                        {cart.map(item => (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, paddingBottom: 0, overflow: 'hidden' }}
                                                style={{
                                                    display: 'flex',
                                                    gap: '16px',
                                                    padding: '16px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#1a1a1a',
                                                    border: '1px solid #333',
                                                    transition: 'border-color 0.3s'
                                                }}
                                            >
                                                {/* Image */}
                                                <div style={{ width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000', flexShrink: 0 }}>
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>

                                                {/* Details */}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                        <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#fff', margin: 0, WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', display: '-webkit-box' }}>{item.name}</h4>
                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                            onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>

                                                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>{item.purity} Gold • {item.weight}g</p>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#111', borderRadius: '4px', padding: '4px 8px', border: '1px solid #333' }}>
                                                            <button
                                                                onClick={() => item.quantity > 1 && updateQuantity(item.id, -1)}
                                                                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                                                                onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                                                            >
                                                                <Minus size={12} />
                                                            </button>
                                                            <span style={{ fontSize: '14px', fontWeight: '500', color: '#fff', minWidth: '10px', textAlign: 'center' }}>{item.quantity}</span>
                                                            <button
                                                                onClick={() => updateQuantity(item.id, 1)}
                                                                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                                                                onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                                                            >
                                                                <Plus size={12} />
                                                            </button>
                                                        </div>
                                                        <span style={{ color: 'var(--color-gold-primary)', fontWeight: 'bold', fontSize: '14px' }}>
                                                            {formatPrice((item.price || item.current_price) * item.quantity)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {cart.length > 0 && (
                            <div style={{ padding: '20px', borderTop: '1px solid #333', backgroundColor: '#0a0a0a' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#888' }}>
                                        <span>Subtotal</span>
                                        <span>{formatPrice(cartTotal)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#888' }}>
                                        <span>Shipping</span>
                                        <span style={{ color: '#4ade80' }}>Free</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#fff', paddingTop: '12px', borderTop: '1px solid #222' }}>
                                        <span>Total</span>
                                        <span style={{ color: 'var(--color-gold-primary)' }}>{formatPrice(cartTotal)}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <Link
                                        to="/cart"
                                        onClick={toggleCart}
                                        className="btn btn-outline"
                                        style={{ justifyContent: 'center' }}
                                    >
                                        View Cart
                                    </Link>
                                    <Link
                                        to="/checkout"
                                        onClick={toggleCart}
                                        className="btn btn-primary"
                                        style={{ justifyContent: 'center' }}
                                    >
                                        Checkout <ArrowRight size={16} style={{ marginLeft: '4px' }} />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
