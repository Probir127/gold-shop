import React from 'react';

const RefundPolicyPage = () => {
    return (
        <div className="section policy-page">
            <div className="container" style={{ maxWidth: '800px' }}>
                <h1 className="section-title">Refund & Return Policy</h1>
                <div className="content-block" style={{ color: '#ccc', lineHeight: '1.6' }}>
                    <p style={{ marginBottom: '20px' }}>Last updated: {new Date().toLocaleDateString()}</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>1. Exchange Policy</h3>
                    <p>Gold jewelry can be exchanged within 7 days containing original invoice and tag intact. Making charges are non-refundable.</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>2. Buy-Back Policy</h3>
                    <p>We offer buy-back on our hallmarked jewelry at current market rates minus 20% deduction (standard industry practice). Cash refunds are subject to fund availability.</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>3. Damaged Items</h3>
                    <p>If you receive a damaged product via delivery, please report it immediately to the delivery person and our support line.</p>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicyPage;
