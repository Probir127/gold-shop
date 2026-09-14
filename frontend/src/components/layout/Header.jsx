import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ShoppingBag, Search, Phone, Shield } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import SearchModal from '../search/SearchModal';
import { useGoldRates } from '../../hooks/useShopData'; // Prepare for live rate

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { cartCount, toggleCart } = useCart();

    const { data: rates } = useGoldRates();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            {/* Top Bar */}
            <div className="header-top-bar">
                <div className="container header-top-inner">
                    <span className="gold-ticker">
                        TODAY'S GOLD RATE (22K): ৳{rates?.rate_22k?.toLocaleString() || '9,850'}/gm
                        {rates?.rate_22k && <span className="live-dot" style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#4ade80', borderRadius: '50%', marginLeft: '6px', verticalAlign: 'middle' }}></span>}
                    </span>
                    <div className="contact-info">
                        <Link 
                            to="/admin" 
                            style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                color: '#d4af37', 
                                fontWeight: '600',
                                textDecoration: 'none',
                                marginRight: '12px'
                            }}
                        >
                            <Shield size={12} /> Command Center
                        </Link>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Phone size={12} /> 01799-281878
                        </span>
                        <span>Bashundhara City, Level-7</span>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <header className={`header-main ${scrolled ? 'scrolled' : ''}`}>
                <div className="container header-inner">
                    {/* Logo */}
                    <Link to="/" className="logo-area">
                        <img
                            src="/assets/images/logo.png"
                            alt="Sahara Gold"
                            style={{
                                height: '60px',
                                filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))'
                            }}
                        />
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="nav-menu">
                        <Link to="/" className="nav-item">Home</Link>
                        <Link to="/shop" className="nav-item">Collections</Link>
                        <Link to="/gold-rates" className="nav-item">Gold Rates</Link>
                        <Link to="/track-order" className="nav-item">Track Order</Link>
                        <Link to="/about" className="nav-item">About</Link>
                        <Link to="/contact" className="nav-item">Contact</Link>
                        <Link 
                            to="/admin" 
                            className="nav-item"
                            style={{
                                color: '#d4af37',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: 'rgba(212, 175, 55, 0.1)',
                                border: '1px solid rgba(212, 175, 55, 0.25)'
                            }}
                        >
                            <Shield size={14} /> Admin
                        </Link>
                    </nav>

                    {/* Actions */}
                    <div className="header-actions">
                        <button className="icon-btn" onClick={() => setIsSearchOpen(true)} title="Search Products">
                            <Search size={22} />
                        </button>
                        <button className="icon-btn" onClick={toggleCart} title="View Cart">
                            <ShoppingBag size={22} />
                            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                        </button>
                        <button
                            className="icon-btn mobile-toggle"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="mobile-menu">
                        <Link to="/" onClick={() => setIsMenuOpen(false)} className="mobile-link">Home</Link>
                        <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="mobile-link">Collections</Link>
                        <Link to="/gold-rates" onClick={() => setIsMenuOpen(false)} className="mobile-link">Gold Rates</Link>
                        <Link to="/track-order" onClick={() => setIsMenuOpen(false)} className="mobile-link">Track Order</Link>
                        <Link to="/about" onClick={() => setIsMenuOpen(false)} className="mobile-link">About</Link>
                        <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="mobile-link">Contact</Link>
                        <Link 
                            to="/admin" 
                            onClick={() => setIsMenuOpen(false)} 
                            className="mobile-link"
                            style={{ color: '#d4af37', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Shield size={16} /> Admin Command Center ↗
                        </Link>
                    </div>
                )}
            </header>

            {/* Search Modal */}
            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
};

export default Header;
