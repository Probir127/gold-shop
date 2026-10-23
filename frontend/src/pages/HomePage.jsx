import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Clock3, RefreshCw } from 'lucide-react';
import SEO from '../components/SEO';
import { catalogueCollections } from '../utils/catalogueCollections';
import ProductCard from '../components/product/ProductCard';
import CollectionShowcase from '../components/CollectionShowcase';
import CraftVisit from '../components/CraftVisit';
import { useGoldRates, useProducts, useCategories } from '../hooks/useShopData';
import { formatPrice } from '../utils/formatters';
import { useStorefrontContent } from '../hooks/useStorefrontContent';

const Reveal = ({ children, className = '' }) => <div className={className}>{children}</div>;
export default function HomePage() {
  const { data: content } = useStorefrontContent();
  const { data: rates, isError: rateError } = useGoldRates();
  const { data: products = [], isLoading, isError, refetch } = useProducts('all');
  const list = Array.isArray(products) ? products : products.results || [];
  const featured = list.filter(p => p.in_stock).slice(0, 4);
  const { data: categoryData = [], isLoading: categoriesLoading, isError: categoriesError } = useCategories();
  const categories = catalogueCollections(categoryData, list);
  return <div className="maison-home">
    <SEO title="Gold, for every chapter" description="Explore New Sahara Gold and Diamond's jewellery collection, current gold rates and our Bashundhara City showroom in Dhaka." />
    <section className="maison-hero" aria-labelledby="hero-title">
      <img className="maison-hero-image" src={content.hero_image} alt={content.hero_image_alt} fetchPriority="high" />
      <div className="maison-hero-copy"><span className="maison-star" aria-hidden="true">✧</span><p className="eyebrow">New Sahara Gold and Diamond · Dhaka</p><h1 id="hero-title">{content.hero_title}</h1><p className="hero-note">{content.hero_description}</p><Link className="maison-button" to="/shop">Explore collections <ArrowRight size={18} /></Link></div>
      <a href="#signature" className="hero-scroll">Discover Sahara <ArrowDown size={15}/></a><span className="editorial-caption">The Sahara edit · Editorial imagery</span>
    </section>
    <section className="atelier-rate-story" aria-labelledby="home-rates-title">
      <img className="atelier-rate-art" src={content.rates_image} alt={content.rates_image_alt} loading="lazy" />
      <div className="atelier-rate-copy"><span className="maison-star" aria-hidden="true">✧</span><p className="eyebrow">Today's gold rates</p><h2 id="home-rates-title">{content.home_rates_title}</h2><p className="atelier-rate-intro">{content.home_rates_description}</p>
        <div className="atelier-rate-panel"><div className="atelier-rate-values">{[['22K','rate_22k'],['21K','rate_21k'],['18K','rate_18k'],['Traditional','rate_traditional']].map(([label,key]) => <div key={key}><span>{label} gold / gram</span><strong>{rates?.[key] ? formatPrice(Number(rates[key])) : '—'}</strong></div>)}</div>
        <div className="atelier-rate-status"><div><Clock3 size={20}/><span><small>Last published</small>{rates?.updated_at ? new Date(rates.updated_at).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : 'See rate details'}</span></div><div><RefreshCw size={20}/><span><small>Update status</small>{rateError ? 'Temporarily unavailable' : rates ? rates.pricing_mode === 'manual' ? 'Manually published' : rates.is_stale ? 'Last saved rates' : 'Automatic updates' : 'Loading rates…'}</span></div></div></div>
        <div className="atelier-rate-actions"><Link to="/gold-rates" className="maison-button solid">View gold rate details <ArrowRight size={17}/></Link><Link to="/shop" className="maison-button">Explore collections <ArrowRight size={17}/></Link></div>
      </div><span className="atelier-art-caption">Editorial jewellery study</span>
    </section>
    <section id="signature" className="maison-section">
      <Reveal className="maison-section-heading"><div><p className="eyebrow">The signature edit</p><h2>{content.signature_title}</h2></div><Link className="text-link" to="/shop">Discover every piece <ArrowRight size={18}/></Link></Reveal>
      {isLoading ? <p role="status">Bringing you the collection…</p> : isError ? <p>We could not load the collection. <button onClick={() => refetch()}>Try again</button></p> : featured.length ? <div className="maison-product-grid" style={{ '--featured-columns': featured.length }}>{featured.map(product => <ProductCard key={product.id} product={product}/>)}</div> : <p>New pieces will appear here when available. <Link to="/contact">Contact us about the collection.</Link></p>}
    </section>
    <CollectionShowcase categories={categories} title={content.collection_title} loading={categoriesLoading} error={categoriesError}/>
    <CraftVisit content={content} />
  </div>;
}
