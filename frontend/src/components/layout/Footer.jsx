import React from 'react';
import { Facebook, Instagram, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STORE_INFO } from '../../utils/constants';
import BrandMark from '../BrandMark';

const Footer = () => {
    return (
        <footer className="site-footer">
            <div className="container">
                <div className="footer-grid">
                    {/* Brand Column */}
                    <div className="footer-brand">
                        <BrandMark />
                        <p>
                            আস্থার প্রতীক - সবার জন্য.<br />
                            Premium handcrafted gold and diamond jewelry. Hallmark certified & Lifetime warranty.
                        </p>
                        <div className="social-links">
                            <a href={STORE_INFO.social.facebook} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label="Sahara Gold Facebook Page">
                                <Facebook size={20} />
                            </a>
                            <a href={STORE_INFO.social.instagram} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label="Sahara Gold Instagram Page">
                                <Instagram size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="footer-heading">Shop</h4>
                        <ul className="footer-links">
                            <li><Link to="/shop?cat=rings">Rings</Link></li>
                            <li><Link to="/shop?cat=earrings">Earrings</Link></li>
                            <li><Link to="/shop?cat=bangles">Bangles</Link></li>
                            <li><Link to="/shop?cat=sets">Necklace Sets</Link></li>
                        </ul>
                    </div>

                    {/* Customer Service */}
                    <div>
                        <h4 className="footer-heading">Support</h4>
                        <ul className="footer-links">
                            <li><Link to="/gold-rates">Today's Gold Rate</Link></li>
                            <li><Link to="/about">About Us</Link></li>
                            <li><Link to="/contact">Contact Us</Link></li>
                            <li><Link to="/terms">Terms & Conditions</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="footer-heading">Contact</h4>
                        <ul className="footer-contact">
                            <li style={{ display: 'flex', gap: '10px' }}>
                                <MapPin size={18} className="contact-icon" />
                                <span>{STORE_INFO.address}</span>
                            </li>
                            <li style={{ display: 'flex', gap: '10px' }}>
                                <Phone size={18} className="contact-icon" />
                                <span>{STORE_INFO.phone}</span>
                            </li>
                            <li style={{ display: 'flex', gap: '10px' }}>
                                <Mail size={18} className="contact-icon" />
                                <a href={`mailto:${STORE_INFO.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                    <span>{STORE_INFO.email}</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} Sahara Gold & Diamond. All rights reserved.</p>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <Link to="/privacy">Privacy Policy</Link>
                        <Link to="/refund-policy">Refund Policy</Link>
                        <Link to="/terms">Terms of Service</Link>
                        <Link to="/login" style={{ color: '#d4af37', fontWeight: 500 }}>My Account</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
