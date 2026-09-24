/**
 * Sahara Gold — LuxuryCounters
 * Kinetic count-up via Anime.js (useCountUp) for in-view activation.
 */
import React from 'react';
import { useCountUp } from '../../animations';

const CounterItem = ({ value, label, suffix = '', prefix = '' }) => {
    const displayRef = useCountUp(value, { prefix, suffix, duration: 1800 });

    return (
        <div style={{ textAlign: 'center' }}>
            <div
                ref={displayRef}
                style={{
                    fontSize: 'clamp(2.2rem, 4vw, 3rem)',
                    fontWeight: 'bold',
                    color: 'var(--color-gold-primary)',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-heading)',
                    fontVariantNumeric: 'tabular-nums',
                }}
            />
            <div style={{
                fontSize: '13px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontWeight: '600',
            }}>
                {label}
            </div>
        </div>
    );
};

const LuxuryCounters = ({ products = [], goldRates = null }) => {
    const availableProducts = products.filter(p => p.in_stock !== false).length;
    const purityCount = new Set(products.map(p => p.purity).filter(Boolean)).size;
    const rateCount = goldRates
        ? ['rate_22k', 'rate_21k', 'rate_18k', 'rate_traditional'].filter(k => goldRates[k]).length
        : 0;

    return (
        <section style={{
            background: 'linear-gradient(180deg, #101116 0%, #17151a 100%)',
            padding: '84px 0',
            borderTop: '1px solid rgba(243,213,138,0.16)',
            borderBottom: '1px solid rgba(243,213,138,0.16)',
        }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '50px' }}>
                    <CounterItem value={availableProducts || 0} label="Pieces in collection" />
                    <CounterItem value={rateCount || 0}          label="Live rate bands" />
                    <CounterItem value={purityCount || 0}        label="Gold purities" />
                    <CounterItem value={100}                     label="Hallmark commitment" suffix="%" />
                </div>
            </div>
        </section>
    );
};

export default LuxuryCounters;
