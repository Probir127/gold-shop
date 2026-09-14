import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';

const CounterItem = ({ value, label, suffix = "+" }) => {
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

const LuxuryCounters = () => {
    return (
        <section style={{ backgroundColor: '#000', padding: '100px 0', borderTop: '1px solid #111', borderBottom: '1px solid #111' }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '50px' }}>
                    <CounterItem value={15} label="Years of Excellence" suffix="+" />
                    <CounterItem value={12000} label="Happy Families" suffix="+" />
                    <CounterItem value={500} label="Unique Designs" suffix="+" />
                    <CounterItem value={100} label="Purity Guarantee" suffix="%" />
                </div>
            </div>
        </section>
    );
};

export default LuxuryCounters;
