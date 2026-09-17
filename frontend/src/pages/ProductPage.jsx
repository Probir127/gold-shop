import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';
import { ShoppingBag, Star, Share2, ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';
import ProductGrid from '../components/product/ProductGrid';
import { api } from '../services/api';
import SEO from '../components/SEO';
import ImageZoom from '../components/product/ImageZoom';
import PriceBreakdown from '../components/product/PriceBreakdown';
import { motion } from 'framer-motion';

const ProductPage = () => {
    const { id } = useParams();
    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        window.scrollTo(0, 0);

        api.getProduct(id).then(data => {
            setProduct(data);
            // Fetch related products (e.g., same category)
            api.getProducts(data.category_slug).then(allCats => {
                const list = Array.isArray(allCats) ? allCats : (allCats?.results || []);
                setRelatedProducts(list.filter(p => p.id !== data.id).slice(0, 4));
            }).catch(() => setRelatedProducts([]));
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load product", err);
            setLoading(false);
        });
    }, [id]);

    if (loading) {
        return <div className="container" style={{ padding: '80px 0', textAlign: 'center', color: '#888' }}>Loading exquisite details...</div>;
    }

    if (!product) {
        return <div className="container" style={{ padding: '80px 0', textAlign: 'center', color: '#888' }}>Product not found.</div>;
    }

    const handleAddToCart = () => {
        const cartItem = {
            id: product.id,
            name: product.name,
            price: product.current_price,
            image: product.image,
            weight: product.weight,
            purity: product.purity,
            category: product.category_name
        };
        addToCart(cartItem);
    };

    return (
        <div className="section product-page" style={{ paddingTop: '40px' }}>
            <div className="container">
                <SEO
                    title={product.name}
                    description={`Buy ${product.name} - ${product.weight}g ${product.purity} Gold. Lifetime warranty.`}
                    image={product.image}
                />

                {/* Breadcrumb */}
                <div style={{ marginBottom: '24px', fontSize: '14px', color: '#888', display: 'flex', alignItems: 'center' }}>
                    <Link to="/" style={{ transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--color-gold-primary)'} onMouseLeave={(e) => e.target.style.color = '#888'}>Home</Link>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <Link to={`/shop?cat=${product.category_slug}`} style={{ textTransform: 'capitalize', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--color-gold-primary)'} onMouseLeave={(e) => e.target.style.color = '#888'}>
                        {product.category_name}
                    </Link>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span style={{ color: 'var(--color-gold-primary)', fontWeight: '500' }}>{product.name}</span>
                </div>

                <div className="product-main-grid">
                    {/* Left Column: Image & Zoom */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="product-gallery-sticky"
                    >
                        <div style={{ border: '1px solid #222', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative' }}>
                            <ImageZoom src={product.image} alt={product.name} />

                            {product.is_bestseller && (
                                <span className="badge-gold-premium" style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 20 }}>
                                    Bestseller
                                </span>
                            )}
                        </div>

                        {/* Product media — only render when multiple images exist */}
                        {Array.isArray(product.images) && product.images.length > 1 && (
                            <div className="custom-scrollbar" style={{ marginTop: '16px', display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                                {product.images.map((img, idx) => (
                                    <button key={idx} style={{ width: '80px', height: '80px', borderRadius: '8px', border: idx === 0 ? '2px solid var(--color-gold-primary)' : '1px solid #333', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', padding: 0, backgroundColor: 'transparent' }}>
                                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Right Column: Product Info */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <h1 className="text-gradient-gold" style={{ fontSize: '2.5rem', marginBottom: '8px', lineHeight: '1.2' }}>
                            {product.name}
                        </h1>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', color: '#facc15' }}>
                                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                            </div>
                            <span style={{ color: '#8f8b84', fontSize: '14px', borderLeft: '1px solid #333', paddingLeft: '16px' }}>Live catalog item</span>
                        </div>

                        <div style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{formatPrice(product.current_price)}</span>
                                {product.price > product.current_price && (
                                    <span style={{ color: '#666', textDecoration: 'line-through', marginBottom: '4px' }}>{formatPrice(product.price)}</span>
                                )}
                            </div>
                            <p style={{ color: '#4ade80', fontSize: '14px', marginBottom: '16px' }}>In stock and ready to ship</p>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button
                                    onClick={handleAddToCart}
                                    className="btn btn-primary"
                                    style={{ flex: 1, height: '48px', fontSize: '1.125rem' }}
                                >
                                    <ShoppingBag size={20} style={{ marginRight: '8px' }} />
                                    Add to Cart
                                </button>
                                <button className="btn btn-outline" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Product Specs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                            <SpecItem label="Purity" value={`${product.purity} Hallmark`} icon={<Award size={18} style={{ color: 'var(--color-gold-primary)' }} />} />
                            <SpecItem label="Weight" value={`${product.weight} grams`} icon={<RotateCcw size={18} style={{ color: 'var(--color-gold-primary)' }} />} />
                            <SpecItem label="Collection" value={product.category_name || 'Jewelry'} icon={<Star size={18} style={{ color: 'var(--color-gold-primary)' }} />} />
                            <SpecItem label="SKU" value={`SG-${product.id.toString().padStart(4, '0')}`} icon={<ShieldCheck size={18} style={{ color: 'var(--color-gold-primary)' }} />} />
                        </div>

                        {/* Price Breakdown Accordion */}
                        <div style={{ marginBottom: '32px' }}>
                            <PriceBreakdown
                                price={product.current_price}
                                weight={product.weight}
                                purity={product.purity}
                            />
                        </div>

                        {/* Trust Badges */}
                        <div className="trust-badge-container">
                            <TrustBadge
                                icon={<ShieldCheck size={24} style={{ color: 'var(--color-gold-primary)' }} />}
                                title="Lifetime Warranty"
                                desc="Free polish & repair"
                            />
                            <TrustBadge
                                icon={<Truck size={24} style={{ color: 'var(--color-gold-primary)' }} />}
                                title="Secure Shipping"
                                desc="100% Insured"
                            />
                            <TrustBadge
                                icon={<RotateCcw size={24} style={{ color: 'var(--color-gold-primary)' }} />}
                                title="Easy Returns"
                                desc="7-day money back"
                            />
                            <TrustBadge
                                icon={<Award size={24} style={{ color: 'var(--color-gold-primary)' }} />}
                                title="Certified"
                                desc="BIS Hallmark"
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{ marginTop: '96px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                            <div style={{ height: '1px', backgroundColor: '#333', flex: 1 }}></div>
                            <h2 className="section-title" style={{ margin: 0 }}>You May Also Like</h2>
                            <div style={{ height: '1px', backgroundColor: '#333', flex: 1 }}></div>
                        </div>
                        <ProductGrid products={relatedProducts} />
                    </motion.div>
                )}
            </div>
        </div>
    );
};

const SpecItem = ({ label, value, icon }) => (
    <div className="spec-item-glass">
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
        </div>
        <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{value}</span>
        </div>
    </div>
);

const TrustBadge = ({ icon, title, desc }) => (
    <div className="trust-badge-card">
        {icon}
        <div>
            <strong style={{ display: 'block', fontSize: '14px', color: '#fff', fontWeight: '600' }}>{title}</strong>
            <span style={{ fontSize: '12px', color: '#666' }}>{desc}</span>
        </div>
    </div>
);

export default ProductPage;
