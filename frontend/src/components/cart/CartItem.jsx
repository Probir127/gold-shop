import React, { memo } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
function CartItem({ item, onNavigate }) {
    const { updateQuantity, removeFromCart } = useCart();
    return <article className="bag-item">
        <Link className="bag-item-image" to={`/product/${item.id}`} onClick={onNavigate}><img src={item.image} alt={item.name}/></Link>
        <div className="bag-item-details"><p className="eyebrow">{item.purity} · {item.weight}g</p><h3><Link to={`/product/${item.id}`} onClick={onNavigate}>{item.name}</Link></h3><div className="bag-item-controls"><div className="quantity-control"><button aria-label={`Decrease quantity of ${item.name}`} onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1}><Minus size={14}/></button><span aria-label="Quantity">{item.quantity}</span><button aria-label={`Increase quantity of ${item.name}`} disabled={item.quantity >= 100} onClick={() => updateQuantity(item.id, 1)}><Plus size={14}/></button></div><button className="bag-remove" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}`}><X size={14}/> Remove</button></div></div>
        <p className="bag-item-price">{formatPrice((item.price ?? item.current_price) * item.quantity)}</p>
    </article>;
}
export default memo(CartItem);
