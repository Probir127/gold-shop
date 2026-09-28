import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchMarketRates, fetchRateJson, fetchPublishedRates } from './goldRates.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const response = data => ({ ok: true, json: async () => data });

test('refreshes from the backend and receives changed prices without customer credentials', async () => {
    let calls = 0;
    globalThis.fetch = async (url, options) => {
        assert.equal(url, '/api/rates/live-market/');
        assert.equal(options.headers, undefined);
        assert.equal(options.cache, 'no-store');
        return response({ status: 'success', rate_22k: 15000 + calls++, rate_21k: 14000, rate_18k: 12000, rate_traditional: 10000 });
    };
    assert.equal((await fetchMarketRates('/api')).rate_22k, 15000);
    assert.equal((await fetchMarketRates('/api')).rate_22k, 15001);
});

test('invalid backend data falls back to the public provider and preserves its timestamp', async () => {
    globalThis.fetch = async url => response(url.startsWith('/api')
        ? { status: 'success', rate_22k: 0 }
        : { price: 4000, updatedAt: '2026-09-27T12:00:00Z' });
    const rate = await fetchMarketRates('/api');
    assert.equal(rate.status, 'success');
    assert.ok(rate.rate_22k > 0);
    assert.equal(rate.date, '2026-09-27T12:00:00Z');
});

test('provider failures reject so the caller can explicitly display saved rates', async () => {
    globalThis.fetch = async () => ({ ok: false });
    await assert.rejects(fetchMarketRates('/api'), /unavailable/);
});

test('a stalled request is aborted so refreshes do not remain blocked', async () => {
    globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
    await assert.rejects(fetchRateJson('/stalled', 10), /aborted/);
});


test('published manual prices remain authoritative in the storefront', async () => {
    globalThis.fetch = async url => {
        assert.equal(url, '/api/rates/latest/');
        return response({ rate_22k: 21000, pricing_mode: 'manual', is_stale: false });
    };
    assert.equal((await fetchPublishedRates('/api')).rate_22k, 21000);
});

test('published endpoint failure never bypasses manual mode with a market fallback', async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error('offline'); };
    await assert.rejects(fetchPublishedRates('/api'), /offline/);
    assert.equal(calls, 1);
});
