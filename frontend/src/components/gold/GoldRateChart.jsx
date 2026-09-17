import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

const GoldRateChart = ({ history = [], currentRate, purity = '22K' }) => {
    const rateKey = purity === '22K' ? 'rate_22k' : purity === '21K' ? 'rate_21k' : 'rate_18k';
    const data = history
        .map(item => ({
            date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            rate: Number(item[rateKey] || 0),
        }))
        .filter(item => item.rate > 0)
        .slice(-14);

    if (data.length === 0 && currentRate) {
        data.push({ date: 'Today', rate: Number(currentRate) });
    }

    return (
        <div className="gold-chart-container">
            <div className="chart-header">
                <h3>{purity} Gold Rate Trend</h3>
                <span className="chart-period">{data.length > 1 ? `Last ${data.length} updates` : 'Current rate'}</span>
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
