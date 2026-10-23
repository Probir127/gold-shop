import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from '../cart/CartDrawer';
import GoldAIChat from '../ai/GoldAIChat';
import '../../atelier.css';

const Layout = ({ children }) => {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    if (isAdminRoute) {
        return (
            <div
                className="admin-root"
                style={{ minHeight: '100vh', background: '#09090b', color: '#f1f5f9' }}
            >
                {children}
            </div>
        );
    }

    return (
        <div className={`app-layout maison ${location.pathname === '/' ? 'maison-home-layout' : 'maison-inner-layout'}`}>
            <Header />
            <main id="storefront-main" className="sf-main">
                {children}
            </main>
            <Footer />
            <CartDrawer />
            <GoldAIChat />
        </div>
    );
};

export default Layout;
