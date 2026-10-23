import React, { useEffect, useRef } from 'react';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import CartItem from './CartItem';

export default function CartDrawer() {
    const { cart, isCartOpen, toggleCart, cartTotal } = useCart();
    const dialog = useRef(null);
    useEffect(() => {
        if (isCartOpen && !dialog.current.open) dialog.current.showModal();
        if (!isCartOpen && dialog.current.open) dialog.current.close();
    }, [isCartOpen]);
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    return <dialog ref={dialog} className="maison-bag-drawer" aria-labelledby="bag-drawer-title" onCancel={event => { event.preventDefault(); toggleCart(); }} onClick={event => { if (event.target === event.currentTarget) toggleCart(); }}>
        <div className="bag-drawer-interior">
            <header><div><p className="eyebrow">Your selection</p><h2 id="bag-drawer-title">Shopping bag <span>({count})</span></h2></div><button autoFocus onClick={toggleCart} aria-label="Close shopping bag"><X size={22}/></button></header>
            <div className="bag-drawer-items">{cart.length ? cart.map(item => <CartItem key={item.id} item={item} onNavigate={toggleCart}/>) : <div className="maison-empty"><ShoppingBag size={32}/><h2>A new story awaits.</h2><p>Find a piece that feels like you.</p><Link className="maison-button" to="/shop" onClick={toggleCart}>Explore the collection</Link></div>}</div>
            {!!cart.length && <footer><div className="summary-line summary-total"><span>Estimated total</span><strong>{formatPrice(cartTotal)}</strong></div><p className="bag-price-note">Final item prices are calculated when you place your order.</p><div className="bag-drawer-actions"><Link to="/cart" onClick={toggleCart} className="maison-button">View bag</Link><Link to="/checkout" onClick={toggleCart} className="maison-button solid">Checkout <ArrowRight size={15}/></Link></div></footer>}
        </div>
    </dialog>;
}
