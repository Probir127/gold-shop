import React, { useState, useEffect } from 'react';
import { useGoldRates, useGoldRateHistory, useLiveMarketRates } from '../hooks/useShopData';
import { Calculator, TrendingUp, Sparkles } from 'lucide-react';
import { formatPrice } from '../utils/formatters';
import SEO from '../components/SEO';
import GoldRateTicker from '../components/gold/GoldRateTicker';
import GoldRateChart from '../components/gold/GoldRateChart';
import PurityComparison from '../components/gold/PurityComparison';

const GoldRatesPage = () => {
    // Fetch Rates — stored rates load instantly from DB
    const { data: goldRates = {
        rate_22k: 0,
        rate_21k: 0,
        rate_18k: 0,
        rate_traditional: 0,
        date: new Date().toISOString()
    } } = useGoldRates();
    const { data: rateHistory = [] } = useGoldRateHistory();
    // Live international market data — loads separately, non-blocking
    const { data: liveMarket } = useLiveMarketRates();

    const [weight, setWeight] = useState('');
    const [purity, setPurity] = useState('22K');
    const [makingCharge, setMakingCharge] = useState(0);
    const [calculatedPrice, setCalculatedPrice] = useState(null);
    const [showResult, setShowResult] = useState(false);

    // Live calculation as user types
    useEffect(() => {
        if (!weight || parseFloat(weight) <= 0) {
            setCalculatedPrice(null);
            setShowResult(false);
            return;
        }

        let rate = 0;
        if (purity === '22K') rate = goldRates.rate_22k;
        else if (purity === '21K') rate = goldRates.rate_21k;
        else if (purity === '18K') rate = goldRates.rate_18k;

        const goldPrice = parseFloat(weight) * rate;
        const makingCost = parseFloat(weight) * parseInt(makingCharge || 0);
        const total = goldPrice + makingCost;
        setCalculatedPrice({
            goldPrice,
            makingCost,
            total
        });
        setShowResult(true);
    }, [weight, purity, makingCharge, goldRates]);

    return (
        <div className="section gold-rates-page" style={{ paddingTop: '40px' }}>
            <SEO
                title="Today's Gold Rates"
                description={`Latest Gold Prices: 22K - ৳${goldRates.rate_22k}/g, 21K - ৳${goldRates.rate_21k}/g.`}
            />
            <div className="container">
                {/* Page Header */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <Sparkles size={24} className="text-gold" />
                        <h1 className="section-title" style={{ margin: 0 }}>Today's Gold Rates</h1>
                        <Sparkles size={24} className="text-gold" />
                    </div>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                        Updated: {new Date(goldRates.date || new Date()).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>

                {/* Live Ticker */}
                <GoldRateTicker rates={goldRates} history={rateHistory} />

                {/* Live International Market Info — shows when external API is available */}
                {liveMarket && (
                    <div style={{
                        margin: '12px 0 20px',
                        padding: '10px 18px',
                        background: 'linear-gradient(90deg, rgba(74,222,128,0.07), rgba(212,175,55,0.07))',
                        border: '1px solid rgba(74,222,128,0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        fontSize: '13px',
                        color: '#aaa',
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
                            <strong style={{ color: '#4ade80' }}>Live Market</strong>
                        </span>
                        <span>International: <strong style={{ color: '#fff' }}>${liveMarket.price_usd_per_oz?.toLocaleString()}/oz</strong></span>
                        <span>24K BDT: <strong style={{ color: 'var(--color-gold-primary)' }}>৳{liveMarket.rate_24k?.toLocaleString()}/g</strong></span>
                        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#555' }}>{liveMarket.source}</span>
                    </div>
                )}

                {/* Interactive Chart */}
                <GoldRateChart history={rateHistory} currentRate={goldRates.rate_22k} purity="22K" />

                {/* Main Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                    {/* Rates Table */}
                    <div className="rates-table-glow" style={{ backgroundColor: '#111', padding: '30px', borderRadius: '8px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <TrendingUp className="text-gold" />
                            <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>Market Rates (Per Gram)</h2>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ddd' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                                    <th style={{ padding: '15px' }}>Purity</th>
                                    <th style={{ padding: '15px' }}>Price (BDT)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #222' }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>22 Karat (22K)</td>
                                    <td style={{ padding: '15px', color: 'var(--color-gold-primary)', fontSize: '18px', fontWeight: '700' }}>৳{goldRates.rate_22k?.toLocaleString()}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #222' }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>21 Karat (21K)</td>
                                    <td style={{ padding: '15px', color: 'var(--color-gold-primary)', fontSize: '18px', fontWeight: '700' }}>৳{goldRates.rate_21k?.toLocaleString()}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #222' }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>18 Karat (18K)</td>
                                    <td style={{ padding: '15px', color: 'var(--color-gold-primary)', fontSize: '18px', fontWeight: '700' }}>৳{goldRates.rate_18k?.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>Traditional</td>
                                    <td style={{ padding: '15px', color: 'var(--color-gold-primary)', fontSize: '18px', fontWeight: '700' }}>৳{goldRates.rate_traditional?.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Premium Calculator */}
                    <div className="calculator-glass">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <Calculator className="text-gold" />
                            <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>Price Calculator</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '13px' }}>Gold Purity</label>
                                <select
                                    value={purity}
                                    onChange={(e) => setPurity(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="22K">22 Karat (91.6%)</option>
                                    <option value="21K">21 Karat (87.5%)</option>
                                    <option value="18K">18 Karat (75.0%)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '13px' }}>Weight (grams)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    placeholder="e.g. 5.5"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '16px'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '13px' }}>Making Charge (per gram)</label>
                                <input
                                    type="number"
                                    value={makingCharge}
                                    onChange={(e) => setMakingCharge(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                        </div>

                        {calculatedPrice && showResult && (
                            <div className="result-animate" style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid rgba(212, 175, 55, 0.3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                                    <span style={{ color: '#888' }}>Gold Price</span>
                                    <span style={{ color: '#fff' }}>{formatPrice(calculatedPrice.goldPrice)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                                    <span style={{ color: '#888' }}>Making Charges</span>
                                    <span style={{ color: '#fff' }}>{formatPrice(calculatedPrice.makingCost)}</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    padding: '15px',
                                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))',
                                    borderRadius: '8px'
                                }}>
                                    <span style={{ color: 'var(--color-gold-primary)' }}>Estimated Total</span>
                                    <span style={{ color: '#fff' }}>{formatPrice(calculatedPrice.total)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Purity Comparison */}
                <PurityComparison />
            </div>
        </div>
    );
};

export default GoldRatesPage;
