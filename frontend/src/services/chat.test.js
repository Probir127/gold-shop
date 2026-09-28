import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { postPublicChat } from './chat.js';
const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; });

test('public chat sends no customer bearer token and preserves rate/product data', async () => {
    globalThis.fetch = async (url, options) => {
        assert.equal(url, '/api/public/chat/sahara-gold/');
        assert.equal(options.headers.Authorization, undefined);
        assert.equal(JSON.parse(options.body).message, 'gold rate');
        return { ok: true, json: async () => ({ reply: '22K: 21000', rates: { rate_22k: 21000 }, products: [] }) };
    };
    assert.equal((await postPublicChat('/api', 'sahara-gold', 'gold rate', '')).rates.rate_22k, 21000);
});

test('empty replies surface a recoverable error instead of a blank chat bubble', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ reply: '' }) });
    await assert.rejects(postPublicChat('/api', 'sahara-gold', 'hello', ''), /empty reply/);
});
