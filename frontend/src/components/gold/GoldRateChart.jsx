import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Generate mock historical data (last 14 days)
const generateMockHistory = (currentRate) => {
    const data = [];
    const baseRate = currentRate || 9850;
    for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Add some variance (-2% to +2%)
        const variance = baseRate * (Math.random() * 0.04 - 0.02);
        data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            rate: Math.round(baseRate + variance),
        });
    }
    // Last entry is actual current rate
    data[data.length - 1].rate = baseRate;
    return data;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid var(--color-gold-primary)',
                borderRadius: '8px',
                padding: '12px 16px',
                boxShadow: '0 4px 20px rgba(212, 175, 55, 0.2)'
            }}>
                <p style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
                <p style={{ color: 'var(--color-gold-primary)', fontSize: '18px', fontWeight: 'bold' }}>
                    ৳{payload[0].value?.toLocaleString()}/g
                </p>
            </div>
        );
    }
    return null;
};

const GoldRateChart = ({ currentRate, purity = '22K' }) => {
    const data = generateMockHistory(currentRate);

    return (
        <div className="gold-chart-container">
            <div className="chart-header">
                <h3>{purity} Gold Rate Trend</h3>
                <span className="chart-period">Last 14 Days</span>
            </div>
            <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-gold-primary)" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="var(--color-gold-primary)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#666"
                            tick={{ fill: '#888', fontSize: 11 }}
                            axisLine={{ stroke: '#333' }}
                        />
                        <YAxis
                            stroke="#666"
                            tick={{ fill: '#888', fontSize: 11 }}
                            axisLine={{ stroke: '#333' }}
                            tickFormatter={(value) => `৳${(value / 1000).toFixed(1)}k`}
                            domain={['dataMin - 100', 'dataMax + 100']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="rate"
                            stroke="var(--color-gold-primary)"
                            strokeWidth={2}
                            fill="url(#goldGradient)"
                            animationDuration={1500}
                            animationEasing="ease-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default GoldRateChart;
