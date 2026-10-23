import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import './support-v2.css';
const reasons={cancelled:'The payment was cancelled.',failed:'The payment provider could not complete the transaction.',unverified:'We could not verify the payment with the provider.',order_mismatch:'The payment did not match this order.',amount_mismatch:'The verified payment amount did not match the order.',order_not_found:'The order could not be found.'};
export default function PaymentFailedPage(){const [params]=useSearchParams();return <section className="sv2"><SEO title="Payment Not Completed" noindex/><div className="sv2-result"><span className="sv2-eyebrow">A pause in your journey</span><h1>Let’s take<br/><em>another look.</em></h1><p>{reasons[params.get('reason')]||reasons.failed} Check your order status before starting a new order. Our team can help with payment questions.</p><div className="sv2-result-actions"><Link className="sv2-button" to="/track-order">Check order status <ArrowRight size={16}/></Link><Link className="sv2-text-link" to="/contact">Contact our team <ArrowRight size={16}/></Link></div></div></section>;}
