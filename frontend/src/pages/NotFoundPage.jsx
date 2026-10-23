import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import './support-v2.css';
export default function NotFoundPage(){return <section className="sv2"><SEO title="Page Not Found" description="Find your way back to New Sahara Gold and Diamond's jewellery collection." noindex/><div className="sv2-result"><span className="sv2-eyebrow">404 / A different direction</span><h1>Still something<br/><em>beautiful to find.</em></h1><p>This page has moved or its address is incorrect. Your next discovery is waiting in the collection.</p><div className="sv2-result-actions"><Link className="sv2-button" to="/shop">Explore the collection <ArrowRight size={16}/></Link><Link className="sv2-text-link" to="/">Return home</Link></div></div></section>;}
