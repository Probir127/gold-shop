import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        try {
            const localData = localStorage.getItem('sahara_cart');
            return localData ? JSON.parse(localData) : [];
        } catch {
            return [];
        }
    });

    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('sahara_cart', JSON.stringify(cart));
    }, [cart]);

    // Stable callbacks — won't cause re-renders in consumer components
    const addToCart = useCallback((product, quantity = 1) => {
        const requested = Number.isInteger(quantity) ? Math.min(100, Math.max(1, quantity)) : 1;
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: Math.min(100, item.quantity + requested) } : item
                );
            }
            return [...prev, { ...product, quantity: requested, addedAt: new Date().toISOString() }];
        });
        setIsCartOpen(true); // Auto open cart on add
    }, []);

    const removeFromCart = useCallback((productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    }, []);

    const updateQuantity = useCallback((productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = Math.min(100, item.quantity + delta);
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    }, []);

    const clearCart = useCallback(() => setCart([]), []);

    const toggleCart = useCallback(() => setIsCartOpen(prev => !prev), []);

    // Memoized derived values — only recompute when cart changes
    const cartTotal = useMemo(
        () => cart.reduce((total, item) => total + ((item.price || item.current_price || 0) * item.quantity), 0),
        [cart]
    );
    const cartCount = useMemo(
        () => cart.reduce((count, item) => count + item.quantity, 0),
        [cart]
    );

    const value = useMemo(() => ({
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        toggleCart,
        cartTotal,
        cartCount,
    }), [cart, addToCart, removeFromCart, updateQuantity, clearCart, isCartOpen, toggleCart, cartTotal, cartCount]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};
