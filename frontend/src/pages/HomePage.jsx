import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';
import Hero from '../components/home/Hero';
import LuxuryFeatures from '../components/home/LuxuryFeatures';
import LuxuryCounters from '../components/home/LuxuryCounters';
import FeaturedCarousel from '../components/home/FeaturedCarousel';
import TestimonialSlider from '../components/home/TestimonialSlider';
import InstagramFeed from '../components/home/InstagramFeed';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { useGoldRates, useProducts } from '../hooks/useShopData';
import GoldRateTicker from '../components/gold/GoldRateTicker';

const HomePage = () => {
    const [cmsData, setCmsData] = useState(null);
    const { data: goldRates } = useGoldRates();
    const { data: products = [], isLoading: productsLoading } = useProducts('all');
    const [cmsLoading, setCmsLoading] = useState(true);

    useEffect(() => {
        api.getCMSHomepage()
            .then(data => setCmsData(data))
            .catch(err => console.error("CMS Load Failed", err))
            .finally(() => setCmsLoading(false));
    }, []);

    const productList = Array.isArray(products) ? products : (products?.results || []);
    const featured = productList.filter(p => p.is_bestseller || p.is_new).slice(0, 8);
    const featuredProducts = featured.length > 0 ? featured : productList.slice(0, 8);
    const loading = cmsLoading && productsLoading;

    if (loading) {
        return <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000', color: '#d4af37' }}>Loading Sahara Gold...</div>;
    }

    // Dynamic Data (with fallbacks handled in components or optional chaining)
    const heroData = cmsData?.hero;
    const featuresData = cmsData?.features;
    // const collectionsData = cmsData?.collections; // Usage depends on UI

    return (
        <div style={{ backgroundColor: '#000' }}>
            <SEO title="Home" description="Premium handcrafted gold and diamond jewelry in Bangladesh." />

            <Hero data={heroData} />

            {/* Live Gold Rate Ticker */}
            {goldRates && <GoldRateTicker rates={goldRates} />}

            {/* Luxury Features Section */}
            <LuxuryFeatures data={featuresData} />

            {/* KEEPING EXISTING LIST FOR NOW - CAN BE DYNAMIC LATER */}
            <LuxuryCounters />

            {/* Featured Collection */}
            <section className="section" style={{ paddingTop: '100px', backgroundColor: '#050505', overflow: 'hidden' }}>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{ textAlign: 'center', marginBottom: '80px' }}
                    >
                        <h2 className="section-title" style={{ marginBottom: '15px' }}>Signature Collections</h2>
                        <div style={{ width: '60px', height: '2px', backgroundColor: 'var(--color-gold-primary)', margin: '0 auto 25px' }}></div>
                        <p style={{ color: '#888', maxWidth: '700px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.6' }}>
                            Discover our handpicked selection of premium gold and diamond jewelry.
                        </p>
                    </motion.div>

                    <FeaturedCarousel products={featuredProducts} />

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        style={{ textAlign: 'center', marginTop: '60px' }}
                    >
                        <Link to="/shop" className="btn btn-outline" style={{ minWidth: '220px', height: '54px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            View Full Collection <ArrowRight size={18} />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Testimonials */}
            <TestimonialSlider />

            {/* Instagram Feed */}
            <InstagramFeed />

            {/* CTA Section - Redesigned */}
            <section style={{
                position: 'relative',
                padding: '120px 0',
                background: 'linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url(/assets/images/15.jpg.jpeg)',
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed',
                backgroundPosition: 'center',
                textAlign: 'center',
                overflow: 'hidden'
            }}>
                {/* Decorative gold borders for the CTA */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)' }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)' }}></div>

                <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '3.5rem', marginBottom: '25px', color: 'var(--color-gold-primary)', letterSpacing: '2px' }}>
                            Bespoke Wedding Collection
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.25rem', marginBottom: '40px', maxWidth: '800px', margin: '0 auto 40px', lineHeight: '1.8' }}>
                            Your wedding is a once-in-a-lifetime journey. Honor it with custom-crafted jewelry
                            that reflects your unique love story. Available for private consultations.
                        </p>
                        <Link to="/contact" className="btn btn-primary" style={{ height: '60px', padding: '0 45px', fontSize: '1.1rem' }}>
                            Book A Private Consultation
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;

