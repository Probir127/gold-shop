/**
 * Sahara Gold — GoldRateTicker (Brilliant Kinetic Edition)
 * Anime.js powered: continuous GPU linear marquee, hover pause,
 * neon laser borders, and animated rate count-up roll-ups.
 */
import React, { useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { anime, useCountUp, SMOOTH_DECEL } from '../../animations';

/* ── Individual rate cell with live roll-up ─────────────────────────── */
const RateCell = ({ label, value, trend }) => {
    const displayRef = useCountUp(value || 0, {
        prefix: '৳',
        suffix: '/g',
        duration: 1400,
        easing: SMOOTH_DECEL,
        triggerOnce: false, // re-animate on every live update
    });

    const isUp = trend > 0;
    const isDown = trend < 0;
    const trendColor = isUp ? '#4ade80' : isDown ? '#f87171' : '#f3d58a';
    const TrendIcon = isUp
        ? <TrendingUp size={15} style={{ color: trendColor }} />
        : isDown
            ? <TrendingDown size={15} style={{ color: trendColor }} />
            : <Minus size={15} style={{ color: trendColor }} />;

    return (
        <div
            className="gold-ticker-item"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 24px',
                margin: '0 8px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(212, 175, 55, 0.22)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease',
            }}
        >
            <span
                className="ticker-label"
                style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: '#9f9aa0',
                }}
            >
                {label}
            </span>
            <span
                ref={displayRef}
                className="ticker-value"
                style={{
                    fontSize: '15px',
                    fontWeight: '800',
                    color: '#fff',
                    fontFamily: 'var(--font-heading)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.5px',
                }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: trendColor, fontWeight: '600' }}>
                {TrendIcon}
                <span>{trend !== 0 ? (trend > 0 ? `+৳${trend}` : `-৳${Math.abs(trend)}`) : 'STABLE'}</span>
            </div>
        </div>
    );
};

/* ── Marquee container ───────────────────────────────────────────────── */
const GoldRateTicker = ({ rates, history = [] }) => {
    const trackRef = useRef(null);
    const aniRef   = useRef(null);

    const previousRates = history[1] || {};
    const items = [
        { label: '22K Gold',    value: rates.rate_22k,         trend: (rates.rate_22k         || 0) - (previousRates.rate_22k         || rates.rate_22k         || 0) },
        { label: '21K Gold',    value: rates.rate_21k,         trend: (rates.rate_21k         || 0) - (previousRates.rate_21k         || rates.rate_21k         || 0) },
        { label: '18K Gold',    value: rates.rate_18k,         trend: (rates.rate_18k         || 0) - (previousRates.rate_18k         || rates.rate_18k         || 0) },
        { label: 'Traditional', value: rates.rate_traditional, trend: (rates.rate_traditional || 0) - (previousRates.rate_traditional || rates.rate_traditional || 0) },
    ];

    // Anime.js continuous linear marquee scroll
    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        const totalWidth = track.scrollWidth / 3;

        if (aniRef.current) aniRef.current.pause();

        aniRef.current = anime({
            targets: track,
            translateX: [`0px`, `-${totalWidth}px`],
            duration: 32000,
            easing: 'linear',
            loop: true,
            autoplay: true,
        });

        return () => {
            aniRef.current?.pause();
            anime.remove(track);
            aniRef.current = null;
        };
    }, []);

    return (
        <div
            className="gold-ticker-container"
            onMouseEnter={() => aniRef.current?.pause()}
            onMouseLeave={() => aniRef.current?.play()}
            style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, #0d0e12 0%, #08080a 100%)',
                padding: '14px 0',
                borderTop: '1px solid rgba(212, 175, 55, 0.25)',
                borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
                boxShadow: '0 10px 35px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(243, 213, 138, 0.1)',
                cursor: 'pointer',
            }}
            title="Hover to pause ticker"
        >
            {/* Ambient gold laser edge glow */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.8), transparent)',
            }} />
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)',
            }} />

            <div
                ref={trackRef}
                className="gold-ticker-track"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    willChange: 'transform',
                }}
            >
                {[...items, ...items, ...items].map((item, index) => (
                    <RateCell key={index} {...item} />
                ))}
            </div>
        </div>
    );
};

export default GoldRateTicker;
