import React from 'react';
import { motion } from 'framer-motion';
import { formatPrice } from '../../utils/formatters';

const PriceBreakdown = ({ price, weight, purity }) => {
    return (
        <div className="price-breakdown-card">
            <h4 style={{ color: '#fff', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '4px', height: '16px', backgroundColor: 'var(--color-gold-primary)', display: 'block', borderRadius: '4px' }}></span>
                Price Breakdown
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <BreakdownItem
                    label="Gold and craftsmanship"
                    value={price}
                    color="var(--color-gold-primary)"
                    delay={0.1}
                    subtext={`${purity} purity · ${weight}g · final listed price`}
                />
            </div>

            <div style={{ borderTop: '1px solid #333', marginTop: '1.5rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '14px' }}>Total Price</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff' }}>{formatPrice(price)}</span>
            </div>
        </div>
    );
};

const BreakdownItem = ({ label, value, color, delay, subtext }) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
            <span style={{ color: '#ccc' }}>{label}</span>
            <span style={{ color: '#fff', fontWeight: '500' }}>{formatPrice(value)}</span>
        </div>
        <div style={{ hieght: '6px', width: '100%', backgroundColor: '#222', borderRadius: '10px', overflow: 'hidden', height: '6px' }}>
            <motion.div
                style={{ height: '100%', backgroundColor: color }}
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                transition={{ duration: 1, delay, ease: "easeOut" }}
            />
        </div>
        <p style={{ fontSize: '10px', color: '#666', marginTop: '4px', margin: 0 }}>{subtext}</p>
    </div>
);

export default PriceBreakdown;
