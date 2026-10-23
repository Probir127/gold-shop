// A paginated response must never forward a customer's bearer token elsewhere.
export function safeApiUrl(value, apiBase, origin) {
    const base = new URL(`${apiBase.replace(/\/$/, '')}/`, origin);
    const url = new URL(value, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.username || url.password) {
        throw new Error('Invalid API response link');
    }
    return url.href;
}
