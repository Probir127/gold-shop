const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Helper for fetch with ngrok bypass
const nf = async (url, options = {}) => {
    const headers = {
        ...options.headers,
        'ngrok-skip-browser-warning': 'true'
    };
    return fetch(url, { ...options, headers });
};

export const api = {
    getProducts: async (category) => {
        let url = `${API_BASE}/products/`;
        if (category && category !== 'all') {
            url += `?category=${category}`;
        }
        const res = await nf(url);
        if (!res.ok) throw new Error('Failed to fetch products');
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    },
    searchProducts: async (query, filters = {}) => {
        const params = new URLSearchParams({ q: query, ...filters });
        const res = await nf(`${API_BASE}/products/search/?${params}`);
        if (!res.ok) throw new Error('Search failed');
        return res.json();
    },
    getProduct: async (id) => {
        const res = await nf(`${API_BASE}/products/${id}/`);
        if (!res.ok) throw new Error('Product not found');
        return res.json();
    },
    getLatestRates: async () => {
        const res = await nf(`${API_BASE}/rates/latest/`);
        if (!res.ok) throw new Error('Failed to fetch rates');
        return res.json();
    },
    getGoldRates: async () => {
        const res = await nf(`${API_BASE}/rates/latest/`);
        if (!res.ok) throw new Error('Failed to fetch rates');
        return res.json();
    },
    createOrder: async (orderData) => {
        const res = await nf(`${API_BASE}/orders/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        if (!res.ok) throw new Error('Failed to create order');
        return res.json();
    },
    trackOrder: async (orderId, phone) => {
        const res = await nf(`${API_BASE}/orders/track/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, phone })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Tracking failed');
        }
        return res.json();
    },
    // Payments
    initiateSslPayment: async (orderId) => {
        const res = await nf(`${API_BASE}/payments/ssl/init/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId }),
        });
        if (!res.ok) throw new Error('Payment initiation failed');
        return res.json();
    },
    // CMS
    getCMSHomepage: async () => {
        const res = await nf(`${API_BASE}/cms/content/homepage/`);
        if (!res.ok) throw new Error('Failed to fetch CMS content');
        return res.json();
    },
    // AI Services
    chatWithAI: async (message, sessionId) => {
        const res = await nf(`${API_BASE}/ai/chat/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, session_id: sessionId })
        });
        if (!res.ok) throw new Error('AI chat failed');
        return res.json();
    },
    getAIPriceInsight: async () => {
        const res = await nf(`${API_BASE}/ai/price-insight/`);
        if (!res.ok) throw new Error('Failed to fetch AI price insight');
        return res.json();
    },
    getAIRecommendations: async (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        const res = await nf(`${API_BASE}/ai/recommend/?${qs}`);
        if (!res.ok) throw new Error('Failed to fetch recommendations');
        return res.json();
    }
};
