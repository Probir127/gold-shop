import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const GoldRateTicker = ({ rates }) => {
    const items = [
        { label: '22K Gold', value: rates.rate_22k, trend: 'up' },
        { label: '21K Gold', value: rates.rate_21k, trend: 'up' },
        { label: '18K Gold', value: rates.rate_18k, trend: 'stable' },
        { label: 'Traditional', value: rates.rate_traditional, trend: 'down' },
    ];

    const TrendIcon = ({ trend }) => {
        if (trend === 'up') return <TrendingUp size={14} style={{ color: '#4ade80' }} />;
        if (trend === 'down') return <TrendingDown size={14} style={{ color: '#f87171' }} />;
        return <Minus size={14} style={{ color: '#888' }} />;
    };

    return (
        <div className="gold-ticker-container">
            <div className="gold-ticker-track">
                {/* Duplicate items for seamless loop */}
                {[...items, ...items, ...items].map((item, index) => (
                    <div key={index} className="gold-ticker-item">
                        <span className="ticker-label">{item.label}</span>
                        <span className="ticker-value">৳{item.value?.toLocaleString()}/g</span>
                        <TrendIcon trend={item.trend} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GoldRateTicker;
