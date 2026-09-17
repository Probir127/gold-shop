import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
})

// ── Request interceptor: attach JWT token & Tenant context ─────
api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`

    const tenantSlug = localStorage.getItem('tenant_slug')
    if (tenantSlug) config.headers['X-Tenant-Slug'] = tenantSlug

    return config
})

// ── Response interceptor: auto-refresh expired tokens ────────
// Fixes H-3: previously a 401 immediately logged the user out,
// even when a valid refresh token was available.
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        error ? prom.reject(error) : prom.resolve(token)
    })
    failedQueue = []
}

api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config || {}

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
            const refreshToken = localStorage.getItem('refresh_token')

            if (!refreshToken) {
                // No refresh token available — force login
                localStorage.removeItem('access_token')
                window.location.href = '/admin/login'
                return Promise.reject(error)
            }

            if (isRefreshing) {
                // Queue concurrent requests while refresh is in-flight
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`
                    return api(originalRequest)
                })
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL || '/api'}/auth/token/refresh/`,
                    { refresh: refreshToken }
                )
                const newAccessToken = res.data.access
                localStorage.setItem('access_token', newAccessToken)
                api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
                processQueue(null, newAccessToken)
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                return api(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError, null)
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                localStorage.removeItem('tenant_slug')
                // Import lazily to avoid circular deps — show toast before redirect
                import('./components/Toast').then(({ toast }) => {
                    toast.warning('Your session has expired. Please log in again.')
                })
                setTimeout(() => { window.location.href = '/admin/login' }, 1500)
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

// ── Auth ─────────────────────────────────────────────────────
export const login  = (username, password) => api.post('/auth/login/', { username, password })
export const getMe  = ()                   => api.get('/auth/me/')

// ── Dashboard ────────────────────────────────────────────────
export const getStats = () => api.get('/dashboard/stats/')

// ── Services ─────────────────────────────────────────────────
export const getServices = () => api.get('/services/')

// ── Clients ──────────────────────────────────────────────────
export const getClients   = (params)    => api.get('/clients/', { params })
export const getClient    = (id)        => api.get(`/clients/${id}/`)
export const createClient = (data)      => api.post('/clients/', data)
export const updateClient = (id, data)  => api.patch(`/clients/${id}/`, data)

// ── Conversations ────────────────────────────────────────────
export const getConversations = (clientId)       => api.get(`/conversations/${clientId}/`)
export const sendMessage      = (clientId, text, channel = 'whatsapp') =>
    api.post('/conversations/send/', { client_id: clientId, message: text, channel })

// ── Bot ──────────────────────────────────────────────────────
export const toggleBot           = (clientId) => api.post(`/clients/${clientId}/toggle-bot/`)
export const getBotTestHistory   = ()         => api.get('/bot-test/')
export const testBotMessage      = (text)     => api.post('/bot-test/', { message: text })
export const clearBotTestHistory = ()         => api.post('/bot-test/clear/')

// ── Invoices ─────────────────────────────────────────────────
export const getInvoices    = ()       => api.get('/invoices/')
export const createInvoice  = (data)   => api.post('/invoices/', data)
export const getInvoice     = (id)     => api.get(`/invoices/${id}/`)
export const generatePDF    = (id)     => api.get(`/invoices/${id}/pdf/`)
export const sendInvoice    = (id)     => api.post(`/invoices/${id}/send/`)
export const markInvoicePaid = (id)    => api.post(`/invoices/${id}/mark-paid/`)
export const openInvoiceHTML = async (id, copy = 'customer', signedUrl = '') => {
    const preview = window.open('', '_blank')
    const requestUrl = signedUrl
        ? signedUrl.replace(/^\/api(?=\/)/, '')
        : `/invoices/${id}/html/?copy=${copy}`
    const response = await api.get(requestUrl, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    if (preview) {
        preview.opener = null
        preview.location.href = url
    } else {
        window.open(url, '_blank', 'noopener,noreferrer')
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export const openOrderInvoiceHTML = async (orderId, copy = 'admin') => {
    const preview = window.open('', '_blank')
    const response = await api.get(`/orders/${encodeURIComponent(orderId)}/invoice/?copy=${copy}`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    if (preview) {
        preview.opener = null
        preview.location.href = url
    } else {
        window.open(url, '_blank', 'noopener,noreferrer')
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// ── Phase 2: Handoff & Analytics ─────────────────────────────
export const claimHandoff    = (clientId) => api.post(`/clients/${clientId}/claim-handoff/`)
export const releaseHandoff  = (clientId) => api.post(`/clients/${clientId}/release-handoff/`)
export const getBotAnalytics  = (params) => api.get('/analytics/bot/', { params })
export const getAIAnalytics   = (params) => api.get('/analytics/ai-stats/', { params })

// ── Phase 7: Bot Training ─────────────────────────────────────
export const getBotConfig    = ()     => api.get('/bot-config/')
export const updateBotConfig = (data) => api.patch('/bot-config/', data)

// ── Knowledge Base ─────────────────────────────────────────────
export const getKnowledgeSources    = ()     => api.get('/knowledge-sources/')
export const createKnowledgeSource = (data)   => api.post('/knowledge-sources/', data)
export const deleteKnowledgeSource = (id)     => api.delete(`/knowledge-sources/${id}/`)
export const syncKnowledgeSource   = (id)     => api.post(`/knowledge-sources/${id}/sync/`)

// ── Maintenance: Manual Reset ─────────────────────────────────
export const resetApp = (action, extraData = {}) => api.post('/reset/', { action, ...extraData })

// ── Omnichannel (Phase 6) ─────────────────────────────────────
export const registerTelegramWebhook = (slug, url) => api.post(`/webhooks/telegram/${slug}/register/`, { webhook_url: url })

// ── Sahara Gold E-Commerce Operations ────────────────────────
export const getOrders       = () => api.get('/orders/')
export const updateOrderStatus = (orderId, data) => api.post(`/orders/${orderId}/update_status/`, data)

export const getGoldRatesHistory = () => api.get('/rates/')
export const getLatestGoldRate   = () => api.get('/rates/latest/')
export const updateGoldRate      = (data) => api.post('/rates/', data)
export const getLiveGoldMarket   = () => api.get('/rates/live-market/')
export const syncLiveGoldRate    = () => api.post('/rates/sync-live/')

export const getProductsAdmin    = () => api.get('/products/')
export const getCategories       = () => api.get('/categories/')
export const createProductAdmin  = (data) => api.post('/products/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
})
export const updateProductAdmin  = (id, data) => api.patch(`/products/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
})
export const deleteProductAdmin  = (id) => api.delete(`/products/${id}/`)

export default api
