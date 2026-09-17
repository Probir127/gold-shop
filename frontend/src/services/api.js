const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api');

let customerRefreshPromise = null;

const refreshCustomerToken = async () => {
    const refresh = localStorage.getItem('customer_refresh_token');
    if (!refresh) return false;
    customerRefreshPromise ||= fetch(`${API_BASE}/customer/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
    }).then(async (res) => {
        if (!res.ok) throw new Error('Customer session expired');
        const data = await res.json();
        localStorage.setItem('customer_access_token', data.access);
        return true;
    }).catch(() => {
        localStorage.removeItem('customer_access_token');
        localStorage.removeItem('customer_refresh_token');
        localStorage.removeItem('sahara_customer');
        return false;
    }).finally(() => {
        customerRefreshPromise = null;
    });
    return customerRefreshPromise;
};

// Helper for fetch with ngrok bypass
const nf = async (url, options = {}) => {
    const headers = {
        ...options.headers,
        'ngrok-skip-browser-warning': 'true'
    };
    const customerToken = localStorage.getItem('customer_access_token');
    if (customerToken) headers.Authorization = `Bearer ${customerToken}`;
    const response = await fetch(url, { ...options, headers });
    if (response.status !== 401 || url.includes('/customer/auth/')) return response;
    const refreshed = await refreshCustomerToken();
    if (!refreshed) return response;
    const retryHeaders = {
        ...options.headers,
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${localStorage.getItem('customer_access_token')}`,
    };
    return fetch(url, { ...options, headers: retryHeaders });
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
    getCategories: async () => {
        const res = await nf(`${API_BASE}/categories/`);
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    },
    getLatestRates: async () => {
        const liveRes = await nf(`${API_BASE}/rates/live-market/`);
        if (liveRes.ok) {
            const liveData = await liveRes.json();
            if (liveData.status === 'success' && liveData.rate_22k) {
                return {
                    ...liveData,
                    date: new Date().toISOString(),
                };
            }
        }

        const storedRes = await nf(`${API_BASE}/rates/latest/`);
        if (!storedRes.ok) throw new Error('Failed to fetch rates');
        return storedRes.json();
    },
    getGoldRates: async () => {
        const res = await nf(`${API_BASE}/rates/latest/`);
        if (!res.ok) throw new Error('Failed to fetch rates');
        return res.json();
    },
    getGoldRatesHistory: async () => {
        const res = await nf(`${API_BASE}/rates/`);
        if (!res.ok) throw new Error('Failed to fetch rate history');
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || []);
    },
    createOrder: async (orderData) => {
        const res = await nf(`${API_BASE}/orders/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            const details = Object.entries(error)
                .map(([field, message]) => `${field}: ${Array.isArray(message) ? message.join(', ') : message}`)
                .join('; ');
            throw new Error(details || 'Failed to create order');
        }
        return res.json();
    },
    getOrder: async (orderId, accessToken = '') => {
        const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
        const res = await nf(`${API_BASE}/orders/${encodeURIComponent(orderId)}/${tokenQuery}`);
        if (!res.ok) throw new Error('Order not found');
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
    getCustomerOrders: async () => {
        const res = await nf(`${API_BASE}/orders/my_orders/`);
        if (!res.ok) {
            if (res.status === 401) throw new Error('Please log in to view your orders.');
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to fetch orders');
        }
        return res.json();
    },
    // Payments
    initiateSslPayment: async (orderId, accessToken) => {
        const res = await nf(`${API_BASE}/payments/ssl/init/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, access_token: accessToken }),
        });
        if (!res.ok) throw new Error('Payment initiation failed');
        return res.json();
    },
    customerLogin: async (credentials) => {
        const res = await nf(`${API_BASE}/customer/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Unable to sign in');
        return data;
    },
    customerRegister: async (details) => {
        const res = await nf(`${API_BASE}/customer/auth/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Unable to create account');
        return data;
    },
    customerVerifyEmail: async (details) => {
        const res = await nf(`${API_BASE}/customer/auth/verify-email/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Email verification failed');
        return data;
    },
    // CMS
    getCMSHomepage: async () => {
        const res = await nf(`${API_BASE}/cms/content/homepage/`);
        if (!res.ok) throw new Error('Failed to fetch CMS content');
        return res.json();
    },
    sendContactEnquiry: async (details) => {
        const res = await nf(`${API_BASE}/contact/enquiry/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Unable to send enquiry');
        return data;
    },
    // AI Services
    chatWithAI: async (message, sessionId) => {
        const tenantSlug = import.meta.env.VITE_TENANT_SLUG || 'sahara-gold';
        const res = await nf(`${API_BASE}/public/chat/${tenantSlug}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, visitor_id: sessionId })
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
