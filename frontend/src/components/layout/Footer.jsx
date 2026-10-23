import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Phone, ShoppingBag } from 'lucide-react';
import { useStorefrontContent } from '../../hooks/useStorefrontContent';
import { useCategories } from '../../hooks/useShopData';
import { STORE_INFO } from '../../utils/constants';
import './footer-editorial.css';
export default function Footer() {
  const { data: content } = useStorefrontContent();
  const { data: categories = [] } = useCategories();
  return <footer className="sf-footer">
    <div className="sf-service-panel">
      <div className="sf-service-item"><span className="sf-service-icon"><Phone size={23} strokeWidth={1} aria-hidden="true" /></span><div><p className="eyebrow">Get in touch</p><h2>{content.footer_title}</h2><p>{content.footer_contact_description}</p><a className="sf-service-phone" href={`tel:${content.contact_phone}`}>{content.contact_phone}</a><Link className="sf-service-link" to="/contact">{content.footer_cta} <ArrowUpRight size={15} /></Link></div></div>
      <div className="sf-service-item"><span className="sf-service-icon"><ShoppingBag size={23} strokeWidth={1} aria-hidden="true" /></span><div><p className="eyebrow">Shop online</p><h2>{content.footer_shop_title}</h2><p>{content.footer_shop_description}</p><Link className="maison-button" to="/shop">Shop collections <ArrowRight size={16} /></Link></div></div>
      <div className="sf-service-signature"><Link className="sf-logo" to="/" aria-label="New Sahara Gold and Diamond home"><img className="sf-supplied-logo" src="/brand/new-sahara-logo.png" alt="New Sahara Gold and Diamond" width="192" height="128"/></Link><p>{content.footer_description}</p></div>
    </div>
    <div className="sf-footer-columns">
      <nav aria-label="Explore collections"><h2>The collection</h2>{categories.map(({id,slug,name}) => <Link key={id} to={`/shop?cat=${encodeURIComponent(slug)}`}>{name}</Link>)}<Link to="/shop">All jewellery</Link></nav>
      <nav aria-label="Customer care"><h2>At your service</h2><Link to="/account">My Sahara</Link><Link to="/track-order">Track an order</Link><Link to="/gold-rates">Gold rates</Link><Link to="/refund-policy">Returns & exchanges</Link><Link to="/contact">Speak with us</Link></nav>
      <div className="sf-footer-visit"><h2>Find us in Dhaka</h2><address>{content.address}</address><a href={`tel:${content.contact_phone}`}>{content.contact_phone}</a><a href={`mailto:${content.contact_email}`}>{content.contact_email}</a><a href={STORE_INFO.social.facebook} target="_blank" rel="noreferrer">Follow our story <ArrowUpRight size={13}/></a></div>
    </div>
    <div className="sf-footer-bottom"><span>© {new Date().getFullYear()} New Sahara Gold and Diamond</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/about">Our story</Link></div><span>Made for your moments.</span></div>
  </footer>;
}
