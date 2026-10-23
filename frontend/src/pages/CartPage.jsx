import React from 'react';
import { useCart } from '../context/CartContext';
import CartItem from '../components/cart/CartItem';
import { formatPrice } from '../utils/formatters';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import CollectionHeading from '../components/CollectionHeading';
import SEO from '../components/SEO';

export default function CartPage() {
    const { cart, cartTotal, clearCart } = useCart();
    const customer = (() => { try { return JSON.parse(localStorage.getItem('sahara_customer') || 'null'); } catch { return null; } })();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    return <div className="section cart-page">
        <SEO title="Your Shopping Bag" description="Review your chosen New Sahara Gold and Diamond jewellery before checkout." />
        <CollectionHeading eyebrow="Chosen by you" title="Your shopping bag"><p>A little closer to something precious.</p></CollectionHeading>
        <div className="container">
            {!cart.length ? <div className="maison-empty"><ShoppingBag size={36} strokeWidth={1}/><h2>A new story awaits.</h2><p>Your bag is empty. Explore the collection to find a piece that feels like you.</p><Link to="/shop" className="maison-button">Explore the collection <ArrowRight size={16}/></Link></div> :
            <div className="bag-layout">
                <section aria-label="Bag items"><div className="bag-list-heading"><span>{count} {count === 1 ? 'piece' : 'pieces'}</span><button className="text-link" onClick={clearCart}>Clear bag</button></div>{cart.map(item => <CartItem key={item.id} item={item}/>)}<Link className="text-link" to="/shop">Continue exploring <ArrowRight size={16}/></Link></section>
                <aside className="bag-summary"><p className="eyebrow">The details</p><h2>Order summary</h2><div className="summary-line"><span>Items ({count})</span><span>{formatPrice(cartTotal)}</span></div><p className="bag-price-note">Your final item prices are calculated when you place the order using the published store rates.</p><div className="summary-line summary-total"><span>Estimated total</span><strong>{formatPrice(cartTotal)}</strong></div><Link to={customer ? '/checkout' : '/login?next=/checkout'} className="maison-button solid">{customer ? 'Continue to checkout' : 'Sign in to checkout'}<ArrowRight size={16}/></Link><p className="bag-price-note">Questions about delivery or your selection? <Link to="/contact">Speak with our team.</Link></p><Link to="/refund-policy" className="text-link">Returns & exchanges</Link></aside>
            </div>}
        </div>
    </div>;
}
