import React from 'react';
import ProductCard from './ProductCard';

const ProductGrid = ({ products }) => {
    if (!products || products.length === 0) {
        return <div style={{ color: '#666', textAlign: 'center', padding: '40px' }}>No products found.</div>;
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '30px'
        }}>
            {products.map(product => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
};

export default ProductGrid;
