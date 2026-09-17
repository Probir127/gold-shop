import React, { useState, useRef } from 'react';

const FALLBACK_JEWELRY_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23141416'/%3E%3Ccircle cx='300' cy='270' r='110' fill='none' stroke='%23d4af37' stroke-width='2' stroke-dasharray='6 6' opacity='0.3'/%3E%3Cpath d='M300 180 L380 240 L350 330 L250 330 L220 240 Z' fill='none' stroke='%23d4af37' stroke-width='3.5' stroke-linejoin='round'/%3E%3Cpath d='M300 205 L360 250 L300 320 L240 250 Z' fill='%23d4af37' fill-opacity='0.15' stroke='%23d4af37' stroke-width='1.5' stroke-linejoin='round'/%3E%3Ctext x='300' y='385' fill='%23d4af37' font-family='serif' font-size='20' font-weight='600' letter-spacing='4' text-anchor='middle'%3ESAHARA GOLD%3C/text%3E%3Ctext x='300' y='412' fill='%23888' font-family='sans-serif' font-size='11' letter-spacing='3' text-anchor='middle'%3ELUXURY CRAFTSMANSHIP%3C/text%3E%3C/svg%3E";

const ImageZoom = ({ src, alt }) => {
    const [backgroundPosition, setBackgroundPosition] = useState('0% 0%');
    const [showZoom, setShowZoom] = useState(false);
    const [imgError, setImgError] = useState(false);
    const containerRef = useRef(null);

    const activeSrc = (!src || imgError) ? FALLBACK_JEWELRY_IMG : src;

    const handleMouseMove = (e) => {
        if (!containerRef.current || imgError) return;
        const { left, top, width, height } = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - left) / width * 100;
        const y = (e.clientY - top) / height * 100;
        setBackgroundPosition(`${x}% ${y}%`);
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => !imgError && setShowZoom(true)}
            onMouseLeave={() => setShowZoom(false)}
            className="product-image-zoom-container"
            style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '12px',
                cursor: imgError ? 'default' : 'crosshair',
                width: '100%',
                paddingTop: '100%', // 1:1 Aspect Ratio
                backgroundColor: '#111'
            }}
        >
            <img
                src={activeSrc}
                alt={alt}
                onError={() => setImgError(true)}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none'
                }}
            />

            {showZoom && !imgError && (
                <div
                    className="desktop-zoom-lens"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${activeSrc})`,
                        backgroundPosition: backgroundPosition,
                        backgroundSize: '250%',
                        pointerEvents: 'none',
                        zIndex: 10
                    }}
                />
            )}
        </div>
    );
};

export default ImageZoom;
