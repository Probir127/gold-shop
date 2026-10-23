import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowUpRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { canPurchase } from '../../utils/productAvailability.js';
import { formatPrice } from '../../utils/formatters';
export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const available = canPurchase(product);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [product.image]);
  return <article className="maison-product">
    <Link className="maison-product-image" aria-label={`View ${product.name}`} to={`/product/${product.id}`}>
      {product.image && !imageFailed ? <img src={product.image} alt={product.name} loading="lazy" onError={() => setImageFailed(true)}/>: <span className="atelier-photo-fallback"><img src="/brand/new-sahara-logo.png" alt=""/><span>Photograph unavailable</span><small>View piece details</small></span>}
      <span className="product-label">{!product.in_stock ? 'Unavailable' : product.is_new ? 'New arrival' : product.purity}</span><span className="product-view"><ArrowUpRight size={22}/></span>
    </Link>
    <div className="maison-product-info"><p className="eyebrow">{product.category_name} · {product.weight} g</p><Link to={`/product/${product.id}`}><h3>{product.name}</h3></Link><p>{formatPrice(product.current_price)}</p>
    <button disabled={!available} aria-label={`Add ${product.name} to bag`} onClick={() => addToCart({ ...product, price: Number(product.current_price), category: product.category_name })}><Plus size={20}/></button></div>
  </article>;
}
