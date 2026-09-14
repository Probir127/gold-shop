import React from 'react';

const PurityComparison = () => {
    const purities = [
        { label: '24K', percentage: 100, description: 'Pure Gold (99.9%)', color: '#FFD700' },
        { label: '22K', percentage: 91.6, description: 'Jewelry Standard', color: 'var(--color-gold-primary)' },
        { label: '21K', percentage: 87.5, description: 'Gulf Standard', color: '#C9A227' },
        { label: '18K', percentage: 75, description: 'Durable Mix', color: '#B8860B' },
    ];

    return (
        <div className="purity-comparison">
            <h3 className="purity-title">Gold Purity Guide</h3>
            <div className="purity-bars">
                {purities.map((p, index) => (
                    <div key={p.label} className="purity-item" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="purity-label">
                            <span className="purity-karat">{p.label}</span>
                            <span className="purity-desc">{p.description}</span>
                        </div>
                        <div className="purity-bar-track">
                            <div
                                className="purity-bar-fill"
                                style={{
                                    width: `${p.percentage}%`,
                                    backgroundColor: p.color,
                                }}
                            />
                        </div>
                        <span className="purity-percentage">{p.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PurityComparison;
