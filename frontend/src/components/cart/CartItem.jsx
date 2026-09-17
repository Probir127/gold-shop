import React, { memo } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';

const CartItem = ({ item }) => {
    const { updateQuantity, removeFromCart } = useCart();

    return (
        <div style={{
            display: 'flex',
            gap: '20px',
            padding: '20px',
            borderBottom: '1px solid #222',
            alignItems: 'center'
        }}>
            {/* Image */}
            <Link to={`/product/${item.id}`} style={{ width: '80px', height: '80px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Link>

            {/* Info */}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                        <Link to={`/product/${item.id}`}>{item.name}</Link>
                    </h3>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>
                        {formatPrice((item.price || item.current_price) * item.quantity)}
                    </span>
                </div>

                <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                    {item.purity} • {item.weight}g
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#111', borderRadius: '4px', border: '1px solid #333' }}>
                        <button
                            onClick={() => updateQuantity(item.id, -1)}
                            style={{ padding: '5px 10px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                            disabled={item.quantity <= 1}
                        >
                            <Minus size={14} />
                        </button>
                        <span style={{ padding: '0 10px', fontSize: '14px' }}>{item.quantity}</span>
                        <button
                            onClick={() => updateQuantity(item.id, 1)}
                            style={{ padding: '5px 10px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <Trash2 size={14} /> Remove
                    </button>
                </div>
            </div>
        </div>
    );
};

// memo: only re-renders when this item's own data changes, not when siblings change
export default memo(CartItem);
