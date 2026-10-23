import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/product/ProductGrid';
import { useProducts, useCategories } from '../hooks/useShopData';
import SEO from '../components/SEO';
import CollectionHeading from '../components/CollectionHeading';
import { useStorefrontContent } from '../hooks/useStorefrontContent';

const sortOptions = [
    { id: 'default', name: 'Default' },
    { id: 'price-low', name: 'Price: Low to High' },
    { id: 'price-high', name: 'Price: High to Low' },
    { id: 'name-asc', name: 'Name: A to Z' },
    { id: 'name-desc', name: 'Name: Z to A' },
    { id: 'newest', name: 'Newest First' }
];

const ShopPage = () => {
    const { data: content } = useStorefrontContent();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeCategory = searchParams.get('cat') || 'all';
    const [sortBy, setSortBy] = useState('default');

    const { data: rawCategories = [] } = useCategories();
    const categories = useMemo(() => {
        const unique = [];
        const seenNames = new Set();
        for (const cat of rawCategories) {
            const normalized = (cat.name || '').trim().toLowerCase();
            if (normalized && !seenNames.has(normalized)) {
                seenNames.add(normalized);
                unique.push(cat);
            }
        }
        return [{ id: 'all', slug: 'all', name: 'All Collection' }, ...unique];
    }, [rawCategories]);

    const activeCatObj = useMemo(() => {
        const lower = (activeCategory || '').toLowerCase();
        return categories.find(c =>
            (c.slug && c.slug.toLowerCase() === lower) ||
            (c.name && c.name.toLowerCase() === lower) ||
            String(c.id) === activeCategory
        );
    }, [categories, activeCategory]);

    const { data: products = [], isLoading, isError, refetch } = useProducts(activeCategory);

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
        <>
            <div className="section shop-page">
                <SEO
                    title={activeCategory === 'all' ? 'Shop All Collection' : `Shop ${activeCatObj?.name || 'Collection'}`}
                    description="Browse our exclusive gold and diamond jewelry collection."
                    url={activeCategory === 'all' ? '/shop' : `/shop?cat=${activeCategory}`}
                />
                <CollectionHeading eyebrow="The Sahara collection" title={activeCategory === 'all' ? content.shop_title : activeCatObj?.name || 'Collection'}><p>{content.shop_description}</p></CollectionHeading>
                <div className="container">
                    <div className="collection-toolbar">
                        <nav className="collection-tabs" aria-label="Jewellery categories">
                            {categories.map(cat => {
                                const key = cat.slug || String(cat.id);
                                return <button key={key} onClick={() => handleCategoryChange(key)} aria-pressed={activeCatObj?.id === cat.id}>{cat.name}</button>;
                            })}
                        </nav>
                        <label className="collection-sort">Sort by <select value={sortBy} onChange={e => setSortBy(e.target.value)}>{sortOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}</select></label>
                    </div>
                    <p className="collection-count" role="status">{isLoading ? 'Finding your next favourite…' : `${sortedProducts.length} pieces to discover`}</p>
                    <div className="shop-results-layout">
                        {/* Grid */}
                        <div className="shop-results">
                            {isLoading ? (
                                <div className="product-grid" aria-label="Loading products">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} style={{
                                            backgroundColor: '#e8dfd2',
                                            borderRadius: '8px',
                                            height: '350px',
                                            animation: 'pulse 1.5s infinite'
                                        }} />
                                    ))}
                                </div>
                            ) : (
                                isError ? <div className="maison-empty"><h2>The collection is taking a moment.</h2><p>We couldn’t load the pieces. Please try again.</p><button className="maison-button" onClick={() => refetch()}>Try again</button></div> : <ProductGrid products={sortedProducts} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ShopPage;
