import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import ProductCard from '../product/ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FeaturedCarousel = ({ products }) => {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [scrollProgress, setScrollProgress] = useState(0);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
            setScrollProgress(scrollWidth > clientWidth ? scrollLeft / (scrollWidth - clientWidth) : 0);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [products]);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const scrollAmount = scrollRef.current.clientWidth * 0.8;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            setTimeout(checkScroll, 500);
        }
    };

    if (!products || products.length === 0) return null;

    return (
        <div style={{ position: 'relative', width: '100%', overflow: 'visible' }}>
            {/* Custom Navigation */}
            <div style={{ position: 'absolute', top: '-60px', right: 0, display: 'flex', gap: '12px' }}>
                <button
                    onClick={() => scroll('left')}
                    disabled={!canScrollLeft}
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        border: '1px solid #333',
                        background: 'transparent',
                        color: canScrollLeft ? '#fff' : '#444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: canScrollLeft ? 'pointer' : 'default',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => canScrollLeft && (e.currentTarget.style.borderColor = 'var(--color-gold-primary)')}
                    onMouseLeave={(e) => canScrollLeft && (e.currentTarget.style.borderColor = '#333')}
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={() => scroll('right')}
                    disabled={!canScrollRight}
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        border: '1px solid #333',
                        background: 'transparent',
                        color: canScrollRight ? '#fff' : '#444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: canScrollRight ? 'pointer' : 'default',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => canScrollRight && (e.currentTarget.style.borderColor = 'var(--color-gold-primary)')}
                    onMouseLeave={(e) => canScrollRight && (e.currentTarget.style.borderColor = '#333')}
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Carousel Container */}
            <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="custom-scrollbar"
                style={{
                    display: 'flex',
                    gap: '24px',
                    overflowX: 'auto',
                    padding: '10px 0 40px',
                    scrollSnapType: 'x mandatory',
                    scrollbarWidth: 'none', // Hide default scrollbar
                    msOverflowStyle: 'none'
                }}
            >
                {products.map((product) => (
                    <div
                        key={product.id}
                        style={{
                            minWidth: '320px',
                            flexShrink: 0,
                            scrollSnapAlign: 'start'
                        }}
                    >
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>

            {/* Custom Progress Bar Style Indicator */}
            <div style={{ width: '100%', height: '1px', backgroundColor: '#222', marginTop: '20px', position: 'relative' }}>
                <motion.div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '2px',
                        backgroundColor: 'var(--color-gold-primary)',
                        width: `${Math.max(10, scrollProgress * 90)}%`
                    }}
                />
            </div>
        </div>
    );
};

export default FeaturedCarousel;
