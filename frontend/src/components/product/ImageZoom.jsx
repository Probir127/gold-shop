import React, { useState, useRef } from 'react';

const ImageZoom = ({ src, alt }) => {
    const [backgroundPosition, setBackgroundPosition] = useState('0% 0%');
    const [showZoom, setShowZoom] = useState(false);
    const containerRef = useRef(null);

    const handleMouseMove = (e) => {
        const { left, top, width, height } = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - left) / width * 100;
        const y = (e.clientY - top) / height * 100;
        setBackgroundPosition(`${x}% ${y}%`);
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setShowZoom(true)}
            onMouseLeave={() => setShowZoom(false)}
            style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '12px',
                cursor: 'crosshair',
                width: '100%',
                paddingTop: '100%', // 1:1 Aspect Ratio
                backgroundColor: '#111'
            }}
        >
            <img
                src={src}
                alt={alt}
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

            {showZoom && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${src})`,
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
