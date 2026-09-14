import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { formatPrice } from '../../utils/formatters';
import './SearchModal.css';

const SearchModal = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Load recent searches on open
    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem('sahara_recent_searches');
            if (stored) {
                try {
                    setRecentSearches(JSON.parse(stored).slice(0, 5));
                } catch (e) {
                    console.error("Failed to parse recent searches", e);
                }
            }
            // Focus input
            setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 100);
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const data = await api.searchProducts(query);
                setResults(data.results || []);
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Handle selection
    const handleSelect = (product) => {
        // Save to recent
        const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
        localStorage.setItem('sahara_recent_searches', JSON.stringify(updated));

        navigate(`/product/${product.id}`);
        onClose();
    };

    // Close on Escape
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="search-modal-overlay" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="search-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search Input Area */}
                        <div className="search-header">
                            <Search className="search-icon" size={20} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search for rings, luxury sets..."
                                className="search-input"
                            />
                            <button onClick={onClose} className="close-btn">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Quick Filters (if no query) */}
                        {!query && (
                            <div className="quick-filters">
                                <span style={{ fontSize: '12px', color: '#666', marginRight: '10px' }}>Quick Select:</span>
                                {['22K Gold', 'Diamond', 'Wedding', 'Gifts'].map(term => (
                                    <button
                                        key={term}
                                        onClick={() => setQuery(term)}
                                        className="filter-pill"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Results Area */}
                        <div className="search-body custom-scrollbar">
                            {isLoading ? (
                                <div className="search-status">
                                    <Sparkles className="spin-slow" size={20} /> Finding treasures...
                                </div>
                            ) : (
                                <>
                                    {/* Results List */}
                                    {results.length > 0 && (
                                        <div className="results-list">
                                            {results.map(product => (
                                                <div
                                                    key={product.id}
                                                    className="result-item"
                                                    onClick={() => handleSelect(product)}
                                                >
                                                    <img src={product.image} alt={product.name} />
                                                    <div className="result-info">
                                                        <h4>{product.name}</h4>
                                                        <span>{product.purity} • {product.weight}g</span>
                                                    </div>
                                                    <div className="result-price">
                                                        {product.current_price ? formatPrice(product.current_price) : formatPrice(product.price)}
                                                    </div>
                                                    <ArrowRight size={16} className="arrow-icon" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* No Results */}
                                    {query && results.length === 0 && !isLoading && (
                                        <div className="search-status">
                                            No products found for "{query}"
                                        </div>
                                    )}

                                    {/* Recent Searches */}
                                    {!query && recentSearches.length > 0 && (
                                        <div className="recent-section">
                                            <h3><Clock size={14} /> Recent Searches</h3>
                                            <div className="recent-list">
                                                {recentSearches.map((s, i) => (
                                                    <button key={i} onClick={() => setQuery(s)} className="recent-item">
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SearchModal;
