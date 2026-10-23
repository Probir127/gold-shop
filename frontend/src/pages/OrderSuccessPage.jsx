import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatPrice } from '../utils/formatters';
import { api } from '../services/api';
import SEO from '../components/SEO';
import { usePaymentConfiguration } from '../hooks/usePaymentConfiguration';
import './support-v2.css';
export default function OrderSuccessPage(){
  const {data: paymentConfig} = usePaymentConfiguration();
  const location=useLocation();const id=new URLSearchParams(location.search).get('id');
  const [order,setOrder]=useState(location.state||null);const [loading,setLoading]=useState(!!id&&!location.state);const [error,setError]=useState('');
  useEffect(()=>{if(!id||location.state)return;let active=true;setLoading(true);api.getOrder(id).then(data=>{if(active)setOrder(data);}).catch(()=>{if(active)setError('Sign in or use order tracking to securely view this order.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[id,location.state]);
  const orderId=order?.orderId||order?.order_id;const rawInvoice=order?.customer_invoice_url||order?.customerInvoiceUrl;
  const backend=import.meta.env.VITE_BACKEND_URL||'';const invoice=rawInvoice?.startsWith('/')?`${backend.replace(/\/$/,'')}${rawInvoice}`:rawInvoice;
  return <section className="sv2"><SEO title="Your Order" description="Your New Sahara Gold and Diamond order details." noindex/><div className="sv2-result"><img className="sv2-result-emblem" src="/brand/new-sahara-logo.png" alt=""/><span className="sv2-eyebrow">Thank you for choosing New Sahara Gold and Diamond</span><h1>{loading?'One moment.':orderId?(order?.payment_method === 'manual' && order?.payment_status !== 'paid' ? 'Awaiting payment approval.' : 'Order received.'):'Your order journey.'}</h1><p>{loading?'Retrieving your order details…':error|| (orderId?'Your order has been received. Keep your reference below for updates and any questions.':'Sign in to see your orders, or track a purchase using your order reference.')}</p>{orderId&&<div className="sv2-result-record"><span>Order reference</span><strong>{orderId}</strong>{order.total!=null&&<p>{formatPrice(order.total)}</p>}{invoice&&<a className="sv2-text-link" href={invoice} target="_blank" rel="noreferrer">View your invoice <ArrowRight size={16}/></a>}</div>}{order?.payment_method === 'manual' && order?.payment_status !== 'paid' && <div><p>Your order is pending. Call us for the merchant payment details and quote your order reference. Only our admin can confirm it after verifying payment.</p>{paymentConfig && <><p>{paymentConfig.instructions}</p>{paymentConfig.merchant_number && <p>Merchant number: {paymentConfig.merchant_number}</p>}<a href={`tel:${paymentConfig.contact_phone}`}>Call {paymentConfig.contact_phone}</a></>}</div>}<div className="sv2-result-actions"><Link to="/track-order" className="sv2-button">Track your order <ArrowRight size={16}/></Link><Link to="/account" className="sv2-text-link">Your account <ArrowRight size={16}/></Link><Link to="/shop" className="sv2-text-link">Continue exploring</Link></div></div></section>;
}
