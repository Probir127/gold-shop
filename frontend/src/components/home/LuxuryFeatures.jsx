import React from 'react';
import { Truck, ShieldCheck, Award, Gift } from 'lucide-react';

const iconMap = {
    'Truck': Truck,
    'ShieldCheck': ShieldCheck,
    'Award': Award,
    'Gift': Gift
};

const LuxuryFeatures = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <section className="section bg-darker">
            <div className="container">
                <div className="features-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '2rem'
                }}>
                    {data.map((feature, index) => {
                        const Icon = iconMap[feature.icon_name] || Award;
                        return (
                            <div key={feature.id || index} className="feature-card" style={{
                                textAlign: 'center',
                                padding: '2rem',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                background: '#1a1a1a'
                            }}>
                                <div style={{ color: 'var(--color-gold-primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                                    <Icon size={40} />
                                </div>
                                <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem' }}>{feature.title}</h3>
                                <p style={{ color: '#888', fontSize: '0.9rem' }}>{feature.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default LuxuryFeatures;
