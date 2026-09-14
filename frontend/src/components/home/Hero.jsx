import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

const Hero = ({ data }) => {
    const defaultHero = {
        title: "Exquisite Gold Jewellery",
        subtitle: "Handcrafted perfection for your special moments",
        cta_text: "Shop Collection",
        cta_link: "/shop",
        image: "/assets/images/5.jpg.jpeg"
    };

    const heroContent = data && data.length > 0 ? data[0] : defaultHero;

    const getImageUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http') || path.startsWith('/assets')) return path;
        const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://127.0.0.1:8000';
        return `${BACKEND_URL}${path}`;
    };

    const bgImage = getImageUrl(heroContent.image);

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.3 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } }
    };

    const shimmerStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, transparent 40%, rgba(212, 175, 55, 0.1) 50%, transparent 60%)',
        backgroundSize: '200% 200%',
        animation: 'shimmer 3s infinite',
        pointerEvents: 'none'
    };

    return (
        <section className="hero-section" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Animated Background with Zoom Effect */}
            <motion.div
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 8, ease: 'easeOut' }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: 1
                }}
            />

            {/* Premium Dark Overlay with Vignette */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `
                    radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%),
                    linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)
                `,
                zIndex: 2
            }} />

            {/* Gold Shimmer Overlay */}
            <div style={shimmerStyle} />

            {/* Floating Gold Particles Effect */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'10\' cy=\'20\' r=\'1\' fill=\'%23d4af37\' opacity=\'0.3\'/%3E%3Ccircle cx=\'80\' cy=\'40\' r=\'0.5\' fill=\'%23d4af37\' opacity=\'0.4\'/%3E%3Ccircle cx=\'30\' cy=\'70\' r=\'0.8\' fill=\'%23d4af37\' opacity=\'0.2\'/%3E%3Ccircle cx=\'60\' cy=\'10\' r=\'0.6\' fill=\'%23d4af37\' opacity=\'0.3\'/%3E%3Ccircle cx=\'90\' cy=\'80\' r=\'0.7\' fill=\'%23d4af37\' opacity=\'0.25\'/%3E%3C/svg%3E")',
                backgroundSize: '300px 300px',
                animation: 'float 20s linear infinite',
                zIndex: 3,
                opacity: 0.6,
                pointerEvents: 'none'
            }} />

            {/* Content */}
            <motion.div
                className="container text-center"
                style={{ position: 'relative', zIndex: 10, padding: '2rem' }}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Logo with Glow */}
                <motion.img
                    variants={itemVariants}
                    src="/assets/images/logo.png"
                    alt="Sahara Gold Logo"
                    style={{
                        height: '100px',
                        display: 'block',
                        margin: '0 auto 2rem',
                        filter: 'drop-shadow(0 0 20px rgba(212, 175, 55, 0.8)) drop-shadow(0 0 40px rgba(212, 175, 55, 0.4))'
                    }}
                />

                {/* Premium Title with Text Shadow */}
                <motion.h1
                    variants={itemVariants}
                    style={{
                        fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                        color: '#D4AF37',
                        marginBottom: '1.5rem',
                        fontFamily: 'Playfair Display, serif',
                        fontWeight: 600,
                        letterSpacing: '2px',
                        textShadow: '0 0 30px rgba(212, 175, 55, 0.5), 0 4px 20px rgba(0,0,0,0.8)',
                        lineHeight: 1.2
                    }}
                >
                    {heroContent.title}
                </motion.h1>

                {/* Decorative Divider */}
                <motion.div
                    variants={itemVariants}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}
                >
                    <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to left, #d4af37, transparent)' }} />
                    <Sparkles size={20} color="#d4af37" />
                    <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to right, #d4af37, transparent)' }} />
                </motion.div>

                {/* Subtitle */}
                <motion.p
                    variants={itemVariants}
                    style={{
                        fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                        color: 'rgba(255,255,255,0.9)',
                        maxWidth: '600px',
                        margin: '0 auto 2.5rem',
                        fontWeight: 300,
                        letterSpacing: '1px',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                    }}
                >
                    {heroContent.subtitle}
                </motion.p>

                {/* Premium CTA Button */}
                <motion.div variants={itemVariants}>
                    <Link
                        to={heroContent.cta_link}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '1.2rem 3rem',
                            fontSize: '1.1rem',
                            fontWeight: 500,
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 50%, #D4AF37 100%)',
                            backgroundSize: '200% 200%',
                            color: '#0a0a0a',
                            border: 'none',
                            borderRadius: '0',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
                            transition: 'all 0.4s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 15px 50px rgba(212, 175, 55, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 40px rgba(212, 175, 55, 0.3)';
                        }}
                    >
                        {heroContent.cta_text}
                        <ArrowRight size={20} />
                    </Link>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                    style={{
                        position: 'absolute',
                        bottom: '-80px',
                        left: '50%',
                        transform: 'translateX(-50%)'
                    }}
                >
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{
                            width: '30px',
                            height: '50px',
                            border: '2px solid rgba(212, 175, 55, 0.5)',
                            borderRadius: '15px',
                            display: 'flex',
                            justifyContent: 'center',
                            paddingTop: '8px'
                        }}
                    >
                        <div style={{
                            width: '4px',
                            height: '10px',
                            background: '#d4af37',
                            borderRadius: '2px'
                        }} />
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* CSS Keyframes */}
            <style>{`
                @keyframes shimmer {
                    0% { background-position: -200% -200%; }
                    100% { background-position: 200% 200%; }
                }
                @keyframes float {
                    0% { background-position: 0 0; }
                    100% { background-position: 300px 300px; }
                }
            `}</style>
        </section>
    );
};

export default Hero;
