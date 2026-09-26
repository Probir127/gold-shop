import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, TrendingUp, Search } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { motion } from 'framer-motion';

const MobileBottomNav = () => {
    const location = useLocation();
    const { cartCount, toggleCart } = useCart();

    const navItems = [
        { icon: <Home size={22} />, label: 'Home', path: '/' },
        { icon: <Search size={22} />, label: 'Shop', path: '/shop' },
        { icon: <TrendingUp size={22} />, label: 'Rates', path: '/gold-rates' },
    ];

    return (
        <div className="mobile-bottom-nav" style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '70px',
            backgroundColor: 'rgba(18, 16, 13, 0.92)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderTop: '1px solid rgba(232, 199, 120, 0.25)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 1000,
            paddingBottom: 'env(safe-area-inset-bottom)',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.5)'
        }}>
            {navItems.map((item, idx) => {
                const isActive = location.pathname === item.path;
                return (
                    <Link
                        key={idx}
                        to={item.path}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '5px',
                            color: isActive ? 'var(--color-gold-primary)' : '#888',
                            textDecoration: 'none',
                            position: 'relative',
                            padding: '0 10px'
                        }}
                    >
                        <motion.div
                            animate={{
                                scale: isActive ? 1.1 : 1,
                                y: isActive ? -2 : 0
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            {item.icon}
                        </motion.div>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: isActive ? '600' : '500',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {item.label}
                        </span>
                        {isActive && (
                            <motion.div
                                layoutId="bottomNavDot"
                                style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    width: '4px',
                                    height: '4px',
                                    backgroundColor: 'var(--color-gold-primary)',
                                    borderRadius: '50%',
                                    boxShadow: '0 0 8px var(--color-gold-primary)'
                                }}
                            />
                        )}
                    </Link>
                );
            })}

            {/* Cart Button */}
            <button
                onClick={toggleCart}
                aria-label={`View cart${cartCount > 0 ? `, ${cartCount} item${cartCount > 1 ? 's' : ''}` : ''}`}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px',
                    color: '#888',
                    background: 'none',
                    border: 'none',
                    padding: '0 10px',
                    position: 'relative',
                    cursor: 'pointer'
                }}
            >
                <ShoppingBag size={22} />
                <span style={{ fontSize: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cart</span>
                {cartCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '2px',
                            backgroundColor: 'var(--color-gold-primary)',
                            color: '#000',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            borderRadius: '10px',
                            padding: '1px 6px',
                            minWidth: '18px',
                            textAlign: 'center',
                            border: '2px solid #000'
                        }}>
                        {cartCount}
                    </motion.span>
                )}
            </button>
        </div>
    );
};

export default MobileBottomNav;
