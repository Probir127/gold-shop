// Public rate requests must not depend on an expired customer login.
export async function fetchRateJson(url, timeout = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Rate service unavailable');
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

const validRates = (data) => ['rate_22k', 'rate_21k', 'rate_18k', 'rate_traditional']
    .every(key => Number.isFinite(Number(data?.[key])) && Number(data[key]) > 0);

export async function fetchMarketRates(apiBase) {
    try {
        // Use the configured server-side provider and exchange rate first.
        const data = await fetchRateJson(`${apiBase}/rates/live-market/`);
        if (data.status !== 'success' || !validRates(data)) throw new Error('Invalid live rates');
        return data;
    } catch {
        // A bounded, header-free request avoids an unnecessary CORS preflight.
        const data = await fetchRateJson('https://api.gold-api.com/price/XAU', 8000);
        const price = Number(data.price);
        const usdBdt = Number(import.meta.env?.VITE_USD_TO_BDT || 122.5);
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(usdBdt) || usdBdt <= 0) {
            throw new Error('Invalid live gold price');
        }
        const gramUsd = price / 31.1034768;
        const rate24k = Math.round(gramUsd * usdBdt);
        return {
            source: 'Global Gold Market Exchange (Live)',
            price_usd_per_gram: Math.round(gramUsd * 100) / 100,
            price_usd_per_oz: Math.round(price * 100) / 100,
            usd_to_bdt: usdBdt,
            rate_24k: rate24k,
            rate_22k: Math.round(rate24k * 0.916),
            rate_21k: Math.round(rate24k * 0.875),
            rate_18k: Math.round(rate24k * 0.750),
            rate_traditional: Math.round(rate24k * 0.625),
            updated_at: data.updatedAt || data.updatedAtReadable,
            date: data.updatedAt,
            status: 'success',
        };
    }
}

// Never fall back to a different provider here: that would bypass manual pricing.
export const fetchPublishedRates = apiBase => fetchRateJson(`${apiBase}/rates/latest/`);
