import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
// Lazy load pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ShopPage = React.lazy(() => import('./pages/ShopPage'));
const ProductPage = React.lazy(() => import('./pages/ProductPage'));
const GoldRatesPage = React.lazy(() => import('./pages/GoldRatesPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = React.lazy(() => import('./pages/OrderSuccessPage'));
const OrderTrackingPage = React.lazy(() => import('./pages/OrderTrackingPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));
const RefundPolicyPage = React.lazy(() => import('./pages/RefundPolicyPage'));

import { Navigate } from 'react-router-dom';
import { ToastContainer } from './admin/components/Toast';

// Admin pages
const AdminLogin = React.lazy(() => import('./admin/pages/Login'));
const AdminDashboard = React.lazy(() => import('./admin/pages/Dashboard'));
const AdminOrders = React.lazy(() => import('./admin/pages/Orders'));
const AdminGoldRates = React.lazy(() => import('./admin/pages/GoldRates'));
const AdminProducts = React.lazy(() => import('./admin/pages/Products'));
const AdminClients = React.lazy(() => import('./admin/pages/Clients'));
const AdminClientDetail = React.lazy(() => import('./admin/pages/ClientDetail'));
const AdminInvoices = React.lazy(() => import('./admin/pages/Invoices'));
const AdminBotTester = React.lazy(() => import('./admin/pages/BotTester'));
const AdminAnalytics = React.lazy(() => import('./admin/pages/Analytics'));
const AdminBotTraining = React.lazy(() => import('./admin/pages/BotTraining'));

// Admin Auth Guard
const ProtectedAdminRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  return token ? children : <Navigate to="/admin/login" replace />;
};

// Page transition wrapper
const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            {/* Customer Storefront Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/gold-rates" element={<GoldRatesPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-success" element={<OrderSuccessPage />} />
            <Route path="/track-order" element={<OrderTrackingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />

            {/* Admin Command Center Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
            <Route path="/admin/orders" element={<ProtectedAdminRoute><AdminOrders /></ProtectedAdminRoute>} />
            <Route path="/admin/gold-rates" element={<ProtectedAdminRoute><AdminGoldRates /></ProtectedAdminRoute>} />
            <Route path="/admin/products" element={<ProtectedAdminRoute><AdminProducts /></ProtectedAdminRoute>} />
            <Route path="/admin/clients" element={<ProtectedAdminRoute><AdminClients /></ProtectedAdminRoute>} />
            <Route path="/admin/clients/:id" element={<ProtectedAdminRoute><AdminClientDetail /></ProtectedAdminRoute>} />
            <Route path="/admin/invoices" element={<ProtectedAdminRoute><AdminInvoices /></ProtectedAdminRoute>} />
            <Route path="/admin/bot-tester" element={<ProtectedAdminRoute><AdminBotTester /></ProtectedAdminRoute>} />
            <Route path="/admin/analytics" element={<ProtectedAdminRoute><AdminAnalytics /></ProtectedAdminRoute>} />
            <Route path="/admin/bot-training" element={<ProtectedAdminRoute><AdminBotTraining /></ProtectedAdminRoute>} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};

// Loading component
const PageLoader = () => (
  <div style={{
    height: '60vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'var(--color-gold-primary)'
  }}>
    <motion.div
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
      style={{ letterSpacing: '4px', textTransform: 'uppercase', fontSize: '14px', fontWeight: 'bold' }}
    >
      Sahara Gold
    </motion.div>
  </div>
);

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Layout>
            <ErrorBoundary>
              <AnimatedRoutes />
            </ErrorBoundary>
          </Layout>
        </Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#e5c100',
              border: '1px solid #e5c100',
            },
          }}
        />
        <ToastContainer />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;

