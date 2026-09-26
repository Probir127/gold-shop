import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ShoppingBag, Search, Phone, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import SearchModal from '../search/SearchModal';
import { useGoldRates } from '../../hooks/useShopData'; // Prepare for live rate
import BrandMark from '../BrandMark';
import { STORE_INFO } from '../../utils/constants';
import { anime, SPRING_LUXURY } from '../../animations';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { cartCount, toggleCart } = useCart();
    const badgeRef = useRef(null);

    const { data: rates } = useGoldRates();

    useEffect(() => {
        if (cartCount > 0 && badgeRef.current) {
            anime({
                targets: badgeRef.current,
                scale: [0.5, 1.35, 1],
                duration: 550,
                easing: SPRING_LUXURY,
            });
        }
    }, [cartCount]);

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
                        TODAY'S GOLD RATE (22K): {rates?.rate_22k ? `৳${rates.rate_22k.toLocaleString()}/gm` : 'Loading...'}
                        {rates?.rate_22k && <span className="live-dot" style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#4ade80', borderRadius: '50%', marginLeft: '6px', verticalAlign: 'middle' }}></span>}
                    </span>
                    <div className="contact-info">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Phone size={12} /> {STORE_INFO.phone}
                        </span>
                        <span>{STORE_INFO.address}</span>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <header className={`header-main ${scrolled ? 'scrolled' : ''}`}>
                <div className="container header-inner">
                    {/* Logo */}
                    <Link to="/" className="logo-area">
                        <BrandMark />
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="nav-menu">
                        <Link to="/" className="nav-item">Home</Link>
                        <Link to="/shop" className="nav-item">Collections</Link>
                        <Link to="/gold-rates" className="nav-item">Gold Rates</Link>
                        <Link to="/track-order" className="nav-item">Track Order</Link>
                        <Link to="/about" className="nav-item">About</Link>
                        <Link to="/contact" className="nav-item">Contact</Link>
                    </nav>

                    {/* Actions */}
                    <div className="header-actions">
                        <button className="icon-btn" onClick={() => setIsSearchOpen(true)} title="Search Products" aria-label="Search products">
                            <Search size={22} />
                        </button>
                        <Link to="/login" className="icon-btn" title="Customer Account / Sign In" aria-label="Sign in to your account">
                            <User size={22} />
                        </Link>
                        <button className="icon-btn" onClick={toggleCart} title="View Cart" aria-label={`View cart${cartCount > 0 ? `, ${cartCount} item${cartCount > 1 ? 's' : ''}` : ''}`}>
                            <ShoppingBag size={22} />
                            {cartCount > 0 && <span ref={badgeRef} className="cart-badge">{cartCount}</span>}
                        </button>
                        <button
                            className="icon-btn mobile-toggle"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isMenuOpen}
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
                            to="/login" 
                            onClick={() => setIsMenuOpen(false)} 
                            className="mobile-link"
                            style={{ color: '#d4af37', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <User size={16} /> My Account / Sign In
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
