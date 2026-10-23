import React from 'react';
import ProductCard from './ProductCard';
export default function ProductGrid({ products }) {
    if (!products?.length) return <div className="maison-empty"><h2>A little more to discover.</h2><p>No pieces are available in this collection yet. Explore another category.</p></div>;
    return <div className="product-grid">{products.map(product => <div key={product.id} className="product-card-wrapper"><ProductCard product={product}/></div>)}</div>;
}
