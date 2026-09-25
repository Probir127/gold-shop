import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/product/ProductGrid';
import { useProducts } from '../hooks/useShopData';
import { api } from '../services/api';
import SEO from '../components/SEO';
import PageTransition from '../components/PageTransition';
import { ChevronDown } from 'lucide-react';

const sortOptions = [
    { id: 'default', name: 'Default' },
    { id: 'price-low', name: 'Price: Low to High' },
    { id: 'price-high', name: 'Price: High to Low' },
    { id: 'name-asc', name: 'Name: A to Z' },
    { id: 'name-desc', name: 'Name: Z to A' },
    { id: 'newest', name: 'Newest First' }
];

const ShopPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeCategory = searchParams.get('cat') || 'all';
    const [sortBy, setSortBy] = useState('default');
    const [categories, setCategories] = useState([{ id: 'all', name: 'All Collection' }]);

    useEffect(() => {
        let active = true;
        api.getCategories()
            .then(items => {
                if (active) setCategories([{ id: 'all', name: 'All Collection' }, ...items]);
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    const { data: products = [], isLoading } = useProducts(activeCategory);

    const sortedProducts = useMemo(() => {
        if (!products.length) return products;
        const sorted = [...products];
        switch (sortBy) {
            case 'price-low':
                return sorted.sort((a, b) => (a.current_price || 0) - (b.current_price || 0));
            case 'price-high':
                return sorted.sort((a, b) => (b.current_price || 0) - (a.current_price || 0));
            case 'name-asc':
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case 'name-desc':
                return sorted.sort((a, b) => b.name.localeCompare(a.name));
            case 'newest':
                return sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            default:
                return sorted;
        }
    }, [products, sortBy]);

    const handleCategoryChange = (slug) => {
        setSearchParams(slug === 'all' ? {} : { cat: slug });
    };

    return (
        <PageTransition>
            <div className="section shop-page">
                <SEO
                    title={activeCategory === 'all' ? 'Shop All Collection' : `Shop ${categories.find(c => c.id === activeCategory)?.name}`}
                    description="Browse our exclusive gold and diamond jewelry collection."
                />
                <div className="container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
                        <h1 className="section-title" style={{ margin: 0, fontSize: '2rem' }}>
                            {categories.find(c => c.id === activeCategory)?.name || 'Collection'}
                        </h1>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ fontSize: '14px', color: '#888' }}>
                                Showing {sortedProducts.length} results
                            </div>
                            <div className="shop-sort-control" style={{ position: 'relative' }}>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="shop-sort-select"
                                    style={{
                                        padding: '10px 40px 10px 16px',
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        appearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 12px center'
                                    }}
                                >
                                    {sortOptions.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', md: { flexDirection: 'row' }, gap: '30px' }}>
                        {/* Sidebar / Filter Bar */}
                        <div className="collection-filter-strip" style={{
                            display: 'flex',
                            gap: '10px',
                            overflowX: 'auto',
                            paddingBottom: '10px',
                            borderBottom: '1px solid #222',
                            marginBottom: '30px',
                            flexWrap: 'wrap'
                        }}>
                            {categories.map(cat => (
                                <button
                                    key={cat.slug || cat.id}
                                    onClick={() => handleCategoryChange(cat.slug || cat.id)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        border: `1px solid ${activeCategory === (cat.slug || String(cat.id)) ? 'var(--color-gold-primary)' : '#333'}`,
                                        backgroundColor: activeCategory === (cat.slug || String(cat.id)) ? 'var(--color-gold-primary)' : 'transparent',
                                        color: activeCategory === (cat.slug || String(cat.id)) ? '#000' : '#888',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Grid */}
                        <div style={{ flex: 1 }}>
                            {isLoading ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                                    gap: '30px'
                                }}>
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} style={{
                                            backgroundColor: '#1a1a1a',
                                            borderRadius: '8px',
                                            height: '350px',
                                            animation: 'pulse 1.5s infinite'
                                        }} />
                                    ))}
                                </div>
                            ) : (
                                <ProductGrid products={sortedProducts} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default ShopPage;
