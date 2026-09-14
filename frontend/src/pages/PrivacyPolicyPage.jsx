import React from 'react';

const PrivacyPolicyPage = () => {
    return (
        <div className="section">
            <div className="container" style={{ maxWidth: '800px' }}>
                <h1 className="section-title">Privacy Policy</h1>
                <div className="content-block" style={{ color: '#ccc', lineHeight: '1.6' }}>
                    <p style={{ marginBottom: '20px' }}>Last updated: {new Date().toLocaleDateString()}</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>1. Information We Collect</h3>
                    <p>We collect name, phone number, and address solely for order delivery purposes. We do not store payment card details on our servers.</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>2. Usage of Data</h3>
                    <p>Your data is used to process orders, send order updates, and improve your shopping experience. We never sell your data to third parties.</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>3. Security</h3>
                    <p>We implement SSL encryption and secure servers to protect your personal information.</p>

                    <h3 style={{ color: 'var(--color-gold-primary)', marginTop: '30px' }}>4. Cookies</h3>
                    <p>Our website uses essential cookies to manage your cart and session status.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
