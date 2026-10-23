import React from 'react';
import { Link } from 'react-router-dom';
import SEO from './SEO';
import { useStorefrontContent } from '../hooks/useStorefrontContent';
import '../pages/support-v2.css';
export default function PolicyPage({title,field}){
  const {data}=useStorefrontContent();const sections=data[field].split(/\n\s*\n/).filter(text=>text!==title);
  return <section className="sv2"><SEO title={title} description={`${title} for shopping with New Sahara Gold and Diamond.`}/><header className="sv2-masthead"><span className="sv2-eyebrow">Sahara / Customer care</span><h1>{title}</h1><p>Clear details to help you shop with confidence.</p>{data.updated_at&&<p>Updated {new Date(data.updated_at).toLocaleDateString('en-GB')}</p>}</header><div className="sf-policy-layout sv2-wrap"><nav aria-label="Customer policies"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms & conditions</Link><Link to="/refund-policy">Returns & exchanges</Link><Link to="/contact">Speak with us ↗</Link></nav><div>{sections.map((section,i)=>{const [heading,...body]=section.split('\n');return <section key={i}><h2>{heading}</h2><p>{body.join('\n')}</p></section>;})}<address>{data.address}<br/><a href={`mailto:${data.contact_email}`}>{data.contact_email}</a><br/><a href={`tel:${data.contact_phone}`}>{data.contact_phone}</a></address></div></div></section>;
}
