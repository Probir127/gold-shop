/**
 * Sahara Gold — GoldRateTicker (Kinetic Edition)
 * Anime.js powered: values animate via useCountUp on each live rate change.
 * Falls back gracefully when rates are null.
 */
import React, { useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { anime, useCountUp, SMOOTH_DECEL } from '../../animations';

/* ── Individual rate cell with live roll-up ─────────────────────────── */
const RateCell = ({ label, value, trend }) => {
    const displayRef = useCountUp(value || 0, {
        prefix: '৳',
        suffix: '/g',
        duration: 1200,
        easing: SMOOTH_DECEL,
        triggerOnce: false, // re-animate on every live update
    });

    const trendColor = trend > 0 ? '#4ade80' : trend < 0 ? '#f87171' : '#888';
    const TrendIcon = trend > 0
        ? <TrendingUp size={14} style={{ color: trendColor }} />
        : trend < 0
            ? <TrendingDown size={14} style={{ color: trendColor }} />
            : <Minus size={14} style={{ color: trendColor }} />;

    return (
        <div className="gold-ticker-item">
            <span className="ticker-label">{label}</span>
            <span
                ref={displayRef}
                className="ticker-value"
                style={{ color: trendColor, transition: 'color 0.4s' }}
            />
            {TrendIcon}
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

    // Anime.js marquee scroll (replaces CSS animation for GPU acceleration)
    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        const totalWidth = track.scrollWidth / 3; // 3 duplicates

        if (aniRef.current) aniRef.current.pause();

        aniRef.current = anime({
            targets: track,
            translateX: [`0px`, `-${totalWidth}px`],
            duration: 28000,
            easing: 'linear',
            loop: true,
            autoplay: true,
        });

        return () => {
            aniRef.current?.pause();
            anime.remove(track);
            aniRef.current = null;
        };
    }, []); // only set up once; values animate inside each RateCell

    return (
        <div className="gold-ticker-container" style={{ overflow: 'hidden' }}>
            <div ref={trackRef} className="gold-ticker-track" style={{ display: 'flex', willChange: 'transform' }}>
                {[...items, ...items, ...items].map((item, index) => (
                    <RateCell key={index} {...item} />
                ))}
            </div>
        </div>
    );
};

export default GoldRateTicker;
