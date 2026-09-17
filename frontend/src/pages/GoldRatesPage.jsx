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

        const activeRates = (liveMarket && liveMarket.rate_22k) ? liveMarket : goldRates;
        let rate = 0;
        if (purity === '24K') rate = activeRates.rate_24k || Math.round((activeRates.rate_22k || 0) / 0.916);
        else if (purity === '22K') rate = activeRates.rate_22k;
        else if (purity === '21K') rate = activeRates.rate_21k;
        else if (purity === '18K') rate = activeRates.rate_18k;

        const goldPrice = parseFloat(weight) * rate;
        const makingCost = parseFloat(weight) * parseInt(makingCharge || 0);
        const total = goldPrice + makingCost;
        setCalculatedPrice({
            goldPrice,
            makingCost,
            total
        });
        setShowResult(true);
    }, [weight, purity, makingCharge, goldRates, liveMarket]);

    const activeRates = (liveMarket && liveMarket.rate_22k) ? liveMarket : goldRates;

    return (
        <div className="section gold-rates-page" style={{ paddingTop: '40px' }}>
            <SEO
                title="Today's Live Gold Rates"
                description={`Latest Gold Prices: 22K - ৳${activeRates.rate_22k}/g, 21K - ৳${activeRates.rate_21k}/g.`}
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
                        {liveMarket?.updated_at ? `Live Market Updated: ${liveMarket.updated_at}` : `Updated: ${new Date(activeRates.date || new Date()).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}`}
                    </p>
                </div>

                {/* Live Ticker */}
                <GoldRateTicker
                    rates={activeRates}
                    history={rateHistory}
                />

                {/* Interactive Chart */}
                <GoldRateChart
                    history={rateHistory}
                    currentRate={activeRates.rate_22k}
                    purity="22K"
                />

                {/* Main Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>

                    {/* Live Rates Table — primary display */}
                    <div className="rates-table-glow" style={{ backgroundColor: '#111', padding: '30px', borderRadius: '8px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <TrendingUp className="text-gold" />
                            <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>Live Market Rates (Per Gram)</h2>
                            {liveMarket ? (
                                <span style={{
                                    marginLeft: 'auto', fontSize: '11px', fontWeight: 'bold',
                                    color: '#4ade80', background: 'rgba(74,222,128,0.12)',
                                    padding: '3px 8px', borderRadius: '20px',
                                    border: '1px solid rgba(74,222,128,0.3)',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                                    LIVE
                                </span>
                            ) : (
                                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#888' }}>Loading live rate…</span>
                            )}
                        </div>

                        {liveMarket ? (
                            <>
                                {/* Live international rate (fetched from market) */}
                                <div style={{
                                    marginBottom: '18px', padding: '12px 15px',
                                    background: 'rgba(74,222,128,0.05)',
                                    borderRadius: '6px', border: '1px solid rgba(74,222,128,0.15)',
                                    fontSize: '12px', color: '#888'
                                }}>
                                    International: <strong style={{ color: '#fff' }}>${liveMarket.price_usd_per_oz?.toLocaleString()}/troy oz</strong>
                                    &nbsp;·&nbsp; USD/BDT: <strong style={{ color: '#fff' }}>{liveMarket.usd_to_bdt}</strong>
                                    &nbsp;·&nbsp; Updated: <strong style={{ color: '#aaa' }}>{liveMarket.updated_at}</strong>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ddd' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                                            <th style={{ padding: '15px' }}>Purity</th>
                                            <th style={{ padding: '15px' }}>Live Price (BDT/g)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: '24 Karat (24K - Pure)', rate: liveMarket.rate_24k },
                                            { label: '22 Karat (22K)', rate: liveMarket.rate_22k },
                                            { label: '21 Karat (21K)', rate: liveMarket.rate_21k },
                                            { label: '18 Karat (18K)', rate: liveMarket.rate_18k },
                                            { label: 'Traditional', rate: liveMarket.rate_traditional },
                                        ].map(({ label, rate }) => (
                                            <tr key={label} style={{ borderBottom: '1px solid #222' }}>
                                                <td style={{ padding: '15px', fontWeight: 'bold' }}>{label}</td>
                                                <td style={{ padding: '15px', color: 'var(--color-gold-primary)', fontSize: '18px', fontWeight: '700' }}>৳{rate?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        ) : (
                            // Skeleton while live rate loads
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[1,2,3,4,5].map(i => (
                                    <div key={i} style={{
                                        height: '52px', borderRadius: '6px',
                                        background: 'linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 1.5s infinite'
                                    }} />
                                ))}
                                <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
                            </div>
                        )}
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
                                    <option value="24K">24 Karat (99.9% Pure)</option>
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
