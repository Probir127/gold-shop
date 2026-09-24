/**
 * Sahara Gold — ProductGrid (Kinetic Edition)
 * Staggered Anime.js cascade reveal on mount & category change.
 */
import React, { useRef, useEffect } from 'react';
import ProductCard from './ProductCard';
import { anime, GOLD_EASE_OUT, staggerGrid, prefersReducedMotion } from '../../animations';

const ProductGrid = ({ products }) => {
    const gridRef = useRef(null);

    // Re-run cascade whenever products array changes (category switch)
    useEffect(() => {
        const grid = gridRef.current;
        if (!grid || !products?.length) return;

        const cards = grid.querySelectorAll('.product-card-wrapper');
        if (!cards.length) return;

        if (prefersReducedMotion()) {
            cards.forEach(c => { c.style.opacity = '1'; c.style.transform = 'none'; });
            return;
        }

        // Reset
        anime.remove(cards);
        cards.forEach(c => {
            c.style.opacity = '0';
            c.style.transform = 'translateY(36px) scale(0.97)';
        });

        anime({
            targets: Array.from(cards),
            opacity: [0, 1],
            translateY: [36, 0],
            scale: [0.97, 1],
            duration: 600,
            easing: GOLD_EASE_OUT,
            delay: staggerGrid(55),
        });
    }, [products]);

    if (!products || products.length === 0) {
        return (
            <div style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
                No products found.
            </div>
        );
    }

    return (
        <div
            ref={gridRef}
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '30px',
            }}
        >
            {products.map(product => (
                <div key={product.id} className="product-card-wrapper" style={{ willChange: 'transform, opacity' }}>
                    <ProductCard product={product} />
                </div>
            ))}
        </div>
    );
};

export default ProductGrid;
