import React from 'react';

const TermsPage = () => {
    return (
        <div className="section">
            <div className="container" style={{ maxWidth: '800px' }}>
                <h1 className="section-title">Terms & Conditions</h1>
                <div className="content-block" style={{ color: '#ccc', lineHeight: '1.6' }}>
                    <p style={{ marginBottom: '20px' }}>Last updated: {new Date().toLocaleDateString()}</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>1. Introduction</h3>
                    <p>Welcome to Sahara Gold. By accessing our website and placing orders, you agree to these Terms and Conditions.</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>2. Pricing & Gold Rates</h3>
                    <p>Gold prices fluctuate daily based on international markets and BAJUS (Bangladesh Jewellers Samity) guidelines. The price at the time of booking is final.</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>3. Orders & Payments</h3>
                    <p>We accept Cash on Delivery (COD) and Online Payments. For custom orders, a booking money (advance) may be required.</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>4. Exchange & Returns</h3>
                    <p>Please refer to our Refund Policy for details on exchanges and buy-backs. Hallmarked jewelry implies lifetime quality assurance.</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>5. Contact</h3>
                    <p>For any legal queries, contact us at info@saharagold.com or visit our showroom.</p>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
