import { useGoldRates } from '../hooks/useShopData';
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';
import { ShoppingBag, Share2, ArrowUpRight, Plus, Minus, Layers, Scale, Coins, MapPin } from 'lucide-react';
import ProductGrid from '../components/product/ProductGrid';
import { api } from '../services/api';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';
import { canPurchase, priceComponents } from '../utils/productAvailability.js';
import './purchase-v2.css';

const ProductPage = () => {
    const { id } = useParams();
    const { data: pricing } = useGoldRates();
    const { addToCart, cart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setProduct(null);
        setRelatedProducts([]);
        setActiveImage(null);
        setQuantity(1);
        window.scrollTo(0, 0);

        api.getProduct(id).then(data => {
            if (cancelled) return;
            setProduct(data);
            // Fetch related products (e.g., same category)
            api.getProducts(data.category_slug).then(allCats => {
                const list = Array.isArray(allCats) ? allCats : (allCats?.results || []);
                if (cancelled) return;
                setRelatedProducts(list.filter(p => p.id !== data.id).slice(0, 4));
            }).catch(() => { if (!cancelled) setRelatedProducts([]); });
            setLoading(false);
        }).catch(err => {
            if (cancelled) return;
            console.error("Failed to load product", err);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [id, pricing?.updated_at]);

    if (loading) {
        return <div className="pv2-state" role="status">Preparing your selection…</div>;
    }

    if (!product) {
        return <div className="pv2-state"><h1>This piece is unavailable.</h1><Link to="/shop">Explore the collection →</Link></div>;
    }

    const remaining = Math.max(0, 100 - (cart.find(item => item.id === product.id)?.quantity || 0));
    const available = canPurchase(product) && remaining > 0;
    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: product.name, url: window.location.href });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success("Product link copied");
            }
        } catch (error) {
            if (error.name !== "AbortError") toast.error("Unable to share. Copy the page URL instead.");
        }
    };

    const handleAddToCart = () => {
        if (!available) return;
        const cartItem = {
            id: product.id,
            name: product.name,
            price: product.current_price,
            image: product.image,
            weight: product.weight,
            purity: product.purity,
            category: product.category_name
        };
        addToCart(cartItem, Math.min(quantity, remaining));
    };

    const breakdown = priceComponents(product.current_price, product.weight, product.making_charge_per_gram);
    const photos = [...new Set([product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean))];

    return (
        <article className="pv2-product">
            <SEO title={product.name} description={product.description || `${product.name} — ${product.weight}g ${product.purity} gold.`} image={product.image} />
            <nav className="pv2-breadcrumb" aria-label="Breadcrumb"><Link to="/shop">The collection</Link><span>/</span><Link to={`/shop?cat=${product.category_slug || ''}`}>{product.category_name || 'Jewellery'}</Link><span>/</span><span>{product.name}</span></nav>
            <div className="pv2-product-layout">
                <section className={`pv2-gallery ${photos.length > 1 ? 'has-thumbnails' : 'single-photo'}`} aria-label="Product photographs">
                    <div className="pv2-gallery-main">
                        {photos.length ? <img key={activeImage || photos[0]} src={activeImage || photos[0]} alt={product.name} fetchPriority="high" /> : <p>Photography coming soon</p>}
                        <span className="pv2-gallery-index">SAHARA / {String(product.id).padStart(4, '0')}</span>
                    </div>
                    {photos.length > 1 && <div className="pv2-thumbnails">{photos.map((photo, index) => <button type="button" key={photo} onClick={() => setActiveImage(photo)} aria-label={`View photograph ${index + 1}`} aria-pressed={(activeImage || photos[0]) === photo}><img src={photo} alt={`${product.name}, view ${index + 1}`} loading="lazy" /></button>)}</div>}
                    <div className="pv2-image-caption"><span>The piece, in detail.</span>{photos.length > 0 && <a href={activeImage || photos[0]} target="_blank" rel="noopener noreferrer">View full photograph <ArrowUpRight size={14} /></a>}</div>
                </section>
                <section className="pv2-product-information">
                    <p className="pv2-kicker">{product.category_name || 'The Sahara collection'} · {product.purity}</p>
                    <h1>{product.name}</h1>
                    {product.description?.trim() && <p className="pv2-description">{product.description}</p>}
                    <dl className="pv2-specifications"><div><Layers size={21}/><dt>Purity</dt><dd>{product.purity}</dd></div><div><Scale size={21}/><dt>Weight</dt><dd>{product.weight} g</dd></div><div><Coins size={21}/><dt>Price / BDT</dt><dd>{formatPrice(product.current_price)}</dd></div></dl>
                    {breakdown && <div className="pv2-making"><span>Making charges</span><strong>{formatPrice(breakdown.making)}</strong><small>Included in the displayed price</small></div>}
                    <div className="pv2-purchase">
                        <div className="pv2-price-line"><span>{formatPrice(product.current_price)}</span>{product.price > product.current_price && <del>{formatPrice(product.price)}</del>}</div>
                        <p className="pv2-availability"><i data-available={available} />{!product.in_stock ? 'Currently unavailable' : available ? 'Available to order' : remaining === 0 ? 'Maximum bag quantity reached' : 'Please enquire for pricing'}</p>
                        <div className="pv2-purchase-actions"><div className="pv2-quantity"><span>Quantity</span><div><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus size={15}/></button><output aria-live="polite">{Math.min(quantity, remaining || 1)}</output><button type="button" aria-label="Increase quantity" disabled={quantity >= remaining || !available} onClick={() => setQuantity(value => Math.min(remaining, value + 1))}><Plus size={15}/></button></div></div><button className="pv2-primary" onClick={handleAddToCart} disabled={!available}><ShoppingBag size={17} />{available ? 'Add to your bag' : !product.in_stock ? 'Out of stock' : remaining === 0 ? 'Bag limit reached' : 'Price unavailable'}</button><button type="button" className="pv2-share" onClick={handleShare} aria-label="Share this piece"><Share2 size={19} /></button></div>
                        <Link className="pv2-enquire" to="/contact"><MapPin size={17}/> Visit Sahara in Dhaka <ArrowUpRight size={16}/></Link><p className="pv2-reference">Reference SG-{String(product.id).padStart(4, '0')}</p>
                    </div>

                    <div className="pv2-details">
                        <details open><summary>Behind the price <Plus size={16} /></summary><div className="pv2-detail-body"><dl>{breakdown ? <><div><dt>Gold value</dt><dd>{formatPrice(breakdown.gold)}</dd></div><div><dt>Making charge</dt><dd>{formatPrice(breakdown.making)}</dd></div></> : <div><dt>Gold & craftsmanship</dt><dd>{formatPrice(product.current_price)}</dd></div>}</dl><p>Calculated using our published store rates. The final order price is confirmed when you place your order.</p><Link to="/gold-rates">Explore today's gold rates →</Link></div></details>
                        <details><summary>Delivery & exchanges <Plus size={16} /></summary><div className="pv2-detail-body"><p>Contact our team to confirm delivery arrangements and any exchange conditions for your selected piece.</p><Link to="/refund-policy">Read our exchange policy →</Link></div></details>
                        <details><summary>See it in person <Plus size={16} /></summary><div className="pv2-detail-body"><p>Discover your selection at New Sahara Gold and Diamond, Bashundhara City, Dhaka.</p><Link to="/contact">Plan your visit →</Link></div></details>
                    </div>
                </section>
            </div>
            {relatedProducts.length > 0 && <section className="pv2-related"><div><p className="pv2-kicker">A conversation between pieces</p><h2>Beautiful together.</h2><Link to={`/shop?cat=${product.category_slug || ''}`}>Explore the collection <ArrowUpRight size={17} /></Link></div><ProductGrid products={relatedProducts} /></section>}
        </article>
    );
};

export default ProductPage;
