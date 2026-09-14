import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Award, Heart } from 'lucide-react';

const AboutPage = () => {
    return (
        <div style={{ backgroundColor: '#000', color: '#fff', paddingTop: '100px', minHeight: '100vh' }}>
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', marginBottom: '80px' }}
                >
                    <h1 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-heading)', color: 'var(--color-gold-primary)', marginBottom: '20px' }}>Our Legacy</h1>
                    <div style={{ width: '80px', height: '2px', backgroundColor: 'var(--color-gold-primary)', margin: '0 auto' }}></div>
                </motion.div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px', alignItems: 'center', marginBottom: '100px' }}>
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 style={{ fontSize: '2rem', marginBottom: '24px', color: '#fff' }}>Crafting Elegance Since 2025</h2>
                        <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#888', marginBottom: '20px' }}>
                            <strong style={{ color: 'var(--color-gold-primary)' }}>Sahara Gold & Diamond</strong> stands as a beacon of purity and trust in Dhaka's prestigious Bashundhara City.
                            Our journey began with a single vision: to transform life's most precious moments into wearable art.
                        </p>
                        <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#888' }}>
                            Every piece in our collection is a testament to the skill of our master artisans, who blend centuries-old techniques with modern design sensibilities to create jewelry that is both timeless and contemporary.
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        style={{ position: 'relative', height: '400px', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(212, 175, 55, 0.2)' }}
                    >
                        <img src="/assets/images/Sahara Gold.jpg.jpeg" alt="Sahara Gold Craftsmanship" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))' }}></div>
                    </motion.div>
                </div>

                {/* Values */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginBottom: '100px' }}>
                    {[
                        { icon: <Shield />, title: 'Unyielding Purity', desc: '100% BIS Hallmark certified gold and certified diamonds for absolute peace of mind.' },
                        { icon: <Award />, title: 'Master Craftsmanship', desc: 'Handcrafted by award-winning artisans dedicated to perfection in every facet.' },
                        { icon: <Heart />, title: 'Customer Legacy', desc: 'Lifetime maintenance and transparent buy-back policies for our valued families.' },
                    ].map((val, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            style={{ padding: '40px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'center' }}
                        >
                            <div style={{ color: 'var(--color-gold-primary)', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                                {val.icon}
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '15px' }}>{val.title}</h3>
                            <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.6' }}>{val.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AboutPage;

