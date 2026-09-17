import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const GoldRateTicker = ({ rates, history = [] }) => {
    const previousRates = history[1] || {};
    const items = [
        { label: '22K Gold', value: rates.rate_22k, trend: rates.rate_22k - (previousRates.rate_22k || rates.rate_22k) },
        { label: '21K Gold', value: rates.rate_21k, trend: rates.rate_21k - (previousRates.rate_21k || rates.rate_21k) },
        { label: '18K Gold', value: rates.rate_18k, trend: rates.rate_18k - (previousRates.rate_18k || rates.rate_18k) },
        { label: 'Traditional', value: rates.rate_traditional, trend: rates.rate_traditional - (previousRates.rate_traditional || rates.rate_traditional) },
    ];

    const TrendIcon = ({ trend }) => {
        if (trend > 0) return <TrendingUp size={14} style={{ color: '#4ade80' }} />;
        if (trend < 0) return <TrendingDown size={14} style={{ color: '#f87171' }} />;
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
