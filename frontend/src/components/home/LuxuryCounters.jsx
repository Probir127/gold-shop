import React, { useEffect, useState, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

const CounterItem = ({ value, label, suffix = "" }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const count = useMotionValue(0);
    const rounded = useSpring(count, { stiffness: 50, damping: 30 });
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (isInView) {
            count.set(value);
        }
    }, [isInView, value, count]);

    useEffect(() => {
        return rounded.on("change", (latest) => {
            setDisplay(Math.floor(latest));
        });
    }, [rounded]);

    return (
        <div ref={ref} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--color-gold-primary)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
                {display}{suffix}
            </div>
            <div style={{ fontSize: '14px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '600' }}>
                {label}
            </div>
        </div>
    );
};

const LuxuryCounters = ({ products = [], goldRates = null }) => {
    const availableProducts = products.filter(product => product.in_stock !== false).length;
    const purityCount = new Set(products.map(product => product.purity).filter(Boolean)).size;
    const rateCount = goldRates ? ['rate_22k', 'rate_21k', 'rate_18k', 'rate_traditional'].filter(key => goldRates[key]).length : 0;

    return (
        <section style={{ background: 'linear-gradient(180deg, #101116 0%, #17151a 100%)', padding: '84px 0', borderTop: '1px solid rgba(243,213,138,0.16)', borderBottom: '1px solid rgba(243,213,138,0.16)' }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '50px' }}>
                    <CounterItem value={availableProducts} label="Pieces in collection" />
                    <CounterItem value={rateCount} label="Live rate bands" />
                    <CounterItem value={purityCount} label="Gold purities" />
                    <CounterItem value={100} label="Hallmark commitment" suffix="%" />
                </div>
            </div>
        </section>
    );
};

export default LuxuryCounters;
