import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ShoppingBag, Eye, Sparkles } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { anime, SPRING_SNAPPY } from '../../animations';

const FALLBACK_JEWELRY_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23141416'/%3E%3Ccircle cx='300' cy='270' r='110' fill='none' stroke='%23d4af37' stroke-width='2' stroke-dasharray='6 6' opacity='0.3'/%3E%3Cpath d='M300 180 L380 240 L350 330 L250 330 L220 240 Z' fill='none' stroke='%23d4af37' stroke-width='3.5' stroke-linejoin='round'/%3E%3Cpath d='M300 205 L360 250 L300 320 L240 250 Z' fill='%23d4af37' fill-opacity='0.12' stroke='%23d4af37' stroke-width='1.5' stroke-linejoin='round'/%3E%3Ctext x='300' y='385' fill='%23d4af37' font-family='serif' font-size='20' font-weight='600' letter-spacing='4' text-anchor='middle'%3ESAHARA GOLD%3C/text%3E%3Ctext x='300' y='412' fill='%23888' font-family='sans-serif' font-size='11' letter-spacing='3' text-anchor='middle'%3ELUXURY CRAFTSMANSHIP%3C/text%3E%3C/svg%3E";

const ProductCard = ({ product }) => {
    const { addToCart } = useCart();
    const ref = useRef(null);
    const [isHovered, setIsHovered] = useState(false);

    // 3D Tilt Effect
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        setIsHovered(false);
    };

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.currentTarget) {
            anime({
                targets: e.currentTarget,
                scale: [1, 0.78, 1.22, 1],
                duration: 450,
                easing: SPRING_SNAPPY,
            });
        }

        const cartItem = {
            id: product.id,
            name: product.name,
            price: product.current_price || product.price,
            image: product.image,
            weight: product.weight,
            purity: product.purity,
            category: product.category_name || product.category
        };
        addToCart(cartItem);
    };

    return (
        <motion.div
            ref={ref}
            className="product-card-3d"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
        >
            <Link to={`/product/${product.id}`} className="block h-full">
                <div className="product-card-surface" style={{
                    transform: "translateZ(50px)",
                    transformStyle: "preserve-3d",
                    background: 'linear-gradient(145deg, #1b1a20 0%, #101116 72%)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid rgba(243,213,138,0.14)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}>
                    {/* Image Container */}
                    <div className="product-card-image" style={{ position: 'relative', paddingTop: '100%', overflow: 'hidden' }}>
                        <img
                            src={product.image || FALLBACK_JEWELRY_IMG}
                            alt={`${product.name} — ${product.weight}g ${product.purity} Gold`}
                            onError={(e) => { e.currentTarget.src = FALLBACK_JEWELRY_IMG; }}
                            width={600}
                            height={600}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.5s ease',
                                transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                            }}
                            loading="lazy"
                            decoding="async"
                        />

                        {/* Sparkle Overlay */}
                        {isHovered && (
                            <div className="sparkle-overlay">
                                <Sparkles className="sparkle-icon-1" size={20} />
                                <Sparkles className="sparkle-icon-2" size={16} />
                            </div>
                        )}

                        {/* Badges */}
                        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {product.is_bestseller && (
                                <span className="badge-premium badge-gold">
                                    Bestseller
                                </span>
                            )}
                            {product.is_new && !product.is_bestseller && (
                                <span className="badge-premium badge-green">
                                    New
                                </span>
                            )}
                        </div>

                        {/* Quick Action Overlay */}
                        <div className={`quick-action-overlay ${isHovered ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                            <button onClick={handleAddToCart} className="btn-icon-glass" title="Add to Cart">
                                <ShoppingBag size={18} />
                            </button>
                            <button className="btn-icon-glass" title="Quick View">
                                <Eye size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="product-card-content" style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', transform: "translateZ(20px)" }}>
                        <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>
                            {product.category_name || product.category}
                        </p>
                        <h3 className="product-title-hover" style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginBottom: '8px', lineHeight: '1.4' }}>
                            {product.name}
                        </h3>

                        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #222' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="weight-pill">
                                    {product.weight}g
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '11px', color: '#9f9aa0', display: 'block' }}>Current price</span>
                                    <span style={{ color: 'var(--color-gold-primary)', fontSize: '16px', fontWeight: 'bold' }}>
                                        {formatPrice(product.current_price || product.price)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};

export default ProductCard;
