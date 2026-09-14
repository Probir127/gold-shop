import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from '../cart/CartDrawer';
import GoldAIChat from '../ai/GoldAIChat';

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
        <div className="app-layout">
            <Header />
            <main className="main-content">
                {children}
            </main>
            <Footer />
            <CartDrawer />
            <GoldAIChat />
        </div>
    );
};

export default Layout;
