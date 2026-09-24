import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, Award } from 'lucide-react';
import BrandMark from '../BrandMark';
import GoldParticles from './GoldParticles';
import { anime, GOLD_EASE_OUT, SPRING_LUXURY, magneticHover, resetMagnetic, prefersReducedMotion } from '../../animations';

const Hero = ({ data }) => {
    const defaultHero = {
        eyebrow: "Sahara Gold & Diamond · Dhaka",
        title: "Exquisite Handcrafted Gold",
        subtitle: "Centuries of timeless Bengali craftsmanship forged into modern heirloom masterpieces.",
        cta_text: "Shop Collection",
        cta_link: "/shop",
        image: "/assets/images/5.jpg.jpeg"
    };

    const heroContent = data && data.length > 0 ? data[0] : defaultHero;
    const heroRef    = useRef(null);
    const ctaRef     = useRef(null);
    const shimmerRef = useRef(null);
    const badgeRef   = useRef(null);

    const getImageUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http') || path.startsWith('/assets')) return path;
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;
        return `${BACKEND_URL}${path}`;
    };

    const bgImage = getImageUrl(heroContent.image);

    // ── Brilliant Anime.js Cinematic Entrance Timeline ───────────────────
    useEffect(() => {
        if (prefersReducedMotion()) return;

        const tl = anime.timeline({ autoplay: true });

        // Phase 1: Background scale entrance
        tl.add({
            targets: '.hero-bg-zoom',
            scale: [1.12, 1],
            duration: 5000,
            easing: 'easeOutSine',
        }, 0);

        // Phase 2: Gold Shimmer Sweep
        if (shimmerRef.current) {
            tl.add({
                targets: shimmerRef.current,
                opacity: [0, 0.7, 0],
                backgroundPosition: ['-100% -100%', '200% 200%'],
                duration: 2600,
                easing: 'easeInOutQuad',
            }, 300);
        }

        // Phase 3: Eyebrow badge entrance
        tl.add({
            targets: '.hero-eyebrow-container',
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 700,
            easing: GOLD_EASE_OUT,
        }, 400);

        // Phase 4: Staggered Split-Character Kinetic Typography
        tl.add({
            targets: '.anime-char',
            opacity: [0, 1],
            translateY: [60, 0],
            rotateX: [75, 0],
            scale: [0.85, 1],
            duration: 900,
            easing: GOLD_EASE_OUT,
            delay: anime.stagger(30, { start: 100 }),
        }, 500);

        // Phase 5: Golden Divider Lines & Sparkle
        tl.add({
            targets: '.hero-divider-line',
            scaleX: [0, 1],
            duration: 800,
            easing: 'easeOutCubic',
        }, 1100);

        tl.add({
            targets: '.hero-sparkle-center',
            scale: [0, 1.4, 1],
            rotate: [0, 180],
            opacity: [0, 1],
            duration: 700,
            easing: SPRING_LUXURY,
        }, 1200);

        // Phase 6: Subtitle fade-in with slide
        tl.add({
            targets: '.hero-subtitle-text',
            opacity: [0, 1],
            translateY: [24, 0],
            duration: 800,
            easing: GOLD_EASE_OUT,
        }, 1250);

        // Phase 7: Floating Hallmark 3D Medallion
        if (badgeRef.current) {
            tl.add({
                targets: badgeRef.current,
                opacity: [0, 1],
                scale: [0.6, 1],
                rotateZ: [-15, 0],
                duration: 1000,
                easing: SPRING_LUXURY,
            }, 1300);
        }

        // Phase 8: CTA Button Pop-in & Continuous Aura Pulse
        if (ctaRef.current) {
            tl.add({
                targets: ctaRef.current,
                opacity: [0, 1],
                scale: [0.9, 1],
                duration: 700,
                easing: SPRING_LUXURY,
            }, 1400);

            // Breathing golden aura on CTA
            anime({
                targets: ctaRef.current,
                boxShadow: [
                    '0 10px 30px rgba(212, 175, 55, 0.3)',
                    '0 18px 55px rgba(212, 175, 55, 0.75)',
                    '0 10px 30px rgba(212, 175, 55, 0.3)',
                ],
                duration: 2200,
                easing: 'easeInOutSine',
                loop: true,
                delay: 2000,
            });
        }

        // Idle floating motion for hallmark badge
        let floatAnim = null;
        if (badgeRef.current) {
            floatAnim = anime({
                targets: badgeRef.current,
                translateY: [-6, 6],
                rotateZ: [-2, 2],
                duration: 3200,
                direction: 'alternate',
                loop: true,
                easing: 'easeInOutSine',
                delay: 2200,
            });
        }

        return () => {
            tl.pause();
            if (floatAnim) floatAnim.pause();
            if (ctaRef.current) anime.remove(ctaRef.current);
            if (badgeRef.current) anime.remove(badgeRef.current);
            if (shimmerRef.current) anime.remove(shimmerRef.current);
            anime.remove('.anime-char');
            anime.remove('.hero-divider-line');
        };
    }, []);

    // Split title into words and characters for kinetic 3D stagger
    const renderKineticTitle = (titleText) => {
        const words = (titleText || defaultHero.title).split(' ');
        return words.map((word, wordIndex) => (
            <span key={wordIndex} className="inline-block whitespace-nowrap mr-3" style={{ perspective: '800px' }}>
                {word.split('').map((char, charIndex) => (
                    <span
                        key={charIndex}
                        className="anime-char inline-block"
                        style={{
                            display: 'inline-block',
                            transformOrigin: '50% 100%',
                            opacity: 0,
                            willChange: 'transform, opacity',
                        }}
                    >
                        {char}
                    </span>
                ))}
            </span>
        ));
    };

    return (
        <section
            ref={heroRef}
            className="hero-section"
            style={{
                minHeight: 'min(860px, calc(100vh - 90px))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                position: 'relative',
                overflow: 'hidden',
                background: '#050507',
            }}
        >
            {/* Animated Background with Zoom Effect */}
            <div
                className="hero-bg-zoom"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: 1,
                    willChange: 'transform',
                }}
            />

            {/* Premium Multi-Layer Dark Overlay with Vignette */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `
                    radial-gradient(ellipse at 40% 40%, rgba(0,0,0,0.3) 0%, rgba(5,5,8,0.75) 65%, rgba(0,0,0,0.95) 100%),
                    linear-gradient(to bottom, rgba(5,5,8,0.4) 0%, rgba(5,5,8,0.75) 70%, #050507 100%)
                `,
                zIndex: 2,
            }} />

            {/* Living 60fps Gold Dust & Constellation Canvas */}
            <GoldParticles />

            {/* Gold Shimmer Sweep Overlay */}
            <div
                ref={shimmerRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, transparent 35%, rgba(243, 213, 138, 0.18) 50%, transparent 65%)',
                    backgroundSize: '250% 250%',
                    pointerEvents: 'none',
                    zIndex: 4,
                    opacity: 0,
                }}
            />

            {/* Content Container */}
            <div className="container hero-copy" style={{ position: 'relative', zIndex: 10, padding: '4rem 1.5rem', width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'center', gap: '40px' }}>
                    
                    {/* Left Column: Kinetic Typography & Actions */}
                    <div style={{ maxWidth: '780px' }}>
                        
                        {/* Eyebrow Pill */}
                        <div className="hero-eyebrow-container" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.3)', marginBottom: '1.5rem', opacity: 0 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d4af37', boxShadow: '0 0 10px #d4af37', display: 'inline-block' }}></span>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2.5px', color: '#f3d58a', fontFamily: 'var(--font-heading)' }}>
                                {heroContent.eyebrow || 'Sahara Gold & Diamond · Dhaka'}
                            </span>
                        </div>

                        {/* Kinetic 3D Split Title */}
                        <h1
                            style={{
                                fontSize: 'clamp(2.8rem, 6.2vw, 5.8rem)',
                                color: '#f7e7b4',
                                marginBottom: '1.5rem',
                                fontFamily: 'Playfair Display, serif',
                                fontWeight: 700,
                                letterSpacing: '1px',
                                textShadow: '0 10px 45px rgba(0,0,0,0.8), 0 0 30px rgba(212, 175, 55, 0.25)',
                                lineHeight: 1.05,
                            }}
                        >
                            {renderKineticTitle(heroContent.title)}
                        </h1>

                        {/* Golden Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.8rem' }}>
                            <div className="hero-divider-line" style={{ width: '70px', height: '2px', background: 'linear-gradient(to left, #d4af37, transparent)', transformOrigin: 'left', transform: 'scaleX(0)' }} />
                            <Sparkles className="hero-sparkle-center" size={22} color="#d4af37" style={{ opacity: 0 }} />
                            <div className="hero-divider-line" style={{ width: '70px', height: '2px', background: 'linear-gradient(to right, #d4af37, transparent)', transformOrigin: 'right', transform: 'scaleX(0)' }} />
                        </div>

                        {/* Subtitle */}
                        <p
                            className="hero-subtitle-text"
                            style={{
                                fontSize: 'clamp(1.05rem, 1.8vw, 1.35rem)',
                                color: 'rgba(255, 255, 255, 0.88)',
                                maxWidth: '580px',
                                margin: '0 0 2.8rem',
                                fontWeight: 300,
                                lineHeight: 1.7,
                                letterSpacing: '0.5px',
                                textShadow: '0 2px 10px rgba(0,0,0,0.6)',
                                opacity: 0,
                            }}
                        >
                            {heroContent.subtitle}
                        </p>

                        {/* Magnetic CTA Button with Liquid Gold Ring */}
                        <div>
                            <Link
                                ref={ctaRef}
                                to={heroContent.cta_link}
                                onMouseMove={(e) => magneticHover(ctaRef.current, e, 0.22)}
                                onMouseLeave={() => resetMagnetic(ctaRef.current)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '1.25rem 2.5rem',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    letterSpacing: '2.5px',
                                    textTransform: 'uppercase',
                                    background: 'linear-gradient(135deg, #E5C05B 0%, #B8860B 50%, #E5C05B 100%)',
                                    backgroundSize: '200% 200%',
                                    color: '#0a0a0c',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    boxShadow: '0 10px 40px rgba(212, 175, 55, 0.35)',
                                    opacity: 0,
                                    willChange: 'transform, box-shadow',
                                }}
                            >
                                <span>{heroContent.cta_text}</span>
                                <ArrowRight size={19} />
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Floating Luxury Hallmark Seal (Desktop) */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div
                            ref={badgeRef}
                            style={{
                                opacity: 0,
                                width: '220px',
                                height: '220px',
                                borderRadius: '50%',
                                border: '2px solid rgba(212, 175, 55, 0.35)',
                                background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, rgba(10,10,14,0.65) 75%)',
                                backdropFilter: 'blur(16px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '24px',
                                textAlign: 'center',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 35px rgba(212, 175, 55, 0.2)',
                                willChange: 'transform',
                            }}
                        >
                            <Award size={42} color="#d4af37" style={{ marginBottom: '10px', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.6))' }} />
                            <div style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '2px', color: '#f7e7b4', fontFamily: 'var(--font-heading)' }}>
                                22K / 916
                            </div>
                            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>
                                Govt. Hallmarked
                            </div>
                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: '11px', fontWeight: '600' }}>
                                <ShieldCheck size={14} /> 100% Purity
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Hero;
