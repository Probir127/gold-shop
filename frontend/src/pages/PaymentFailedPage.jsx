import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleAlert, RotateCcw } from 'lucide-react';

const reasons = {
    cancelled: 'The payment was cancelled. Your order is still available to retry.',
    failed: 'The payment provider could not complete the transaction.',
    unverified: 'The payment could not be verified with the payment provider.',
    order_mismatch: 'The payment did not match this order.',
    amount_mismatch: 'The verified payment amount did not match this order.',
    order_not_found: 'The order could not be found.',
};

const PaymentFailedPage = () => {
    const [searchParams] = useSearchParams();
    const reason = searchParams.get('reason') || 'failed';

    return (
        <div className="section result-page" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="container" style={{ textAlign: 'center', maxWidth: '600px' }}>
                <CircleAlert size={80} style={{ color: '#f59e0b', margin: '0 auto 30px' }} />
                <h1 className="section-title" style={{ marginBottom: '10px' }}>Payment not completed</h1>
                <p style={{ color: '#888', fontSize: '1.1rem', marginBottom: '30px' }}>
                    {reasons[reason] || reasons.failed}
                </p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/checkout" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <RotateCcw size={17} /> Return to checkout
                    </Link>
                    <Link to="/track-order" className="btn btn-outline">Track order</Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentFailedPage;
