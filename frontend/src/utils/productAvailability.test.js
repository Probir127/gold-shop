import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canPurchase, priceComponents } from './productAvailability.js';

test('only in-stock products with a valid price can be purchased', () => {
    assert.equal(canPurchase({ in_stock: true, current_price: 222509 }), true);
    for (const current_price of [null, undefined, '', 0, -1, 'bad']) {
        assert.equal(canPurchase({ in_stock: true, current_price }), false);
    }
    assert.equal(canPurchase({ in_stock: false, current_price: 222509 }), false);
});

test('necklace breakdown preserves the listed total and saved making charge', () => {
    assert.deepEqual(priceComponents(222509, '10.87', 500), { gold: 217074, making: 5435, total: 222509 });
    assert.equal(priceComponents(null, 10, 500), null);
    assert.equal(priceComponents(100, 10, 500), null);
    assert.deepEqual(priceComponents(100, 10, 0), { gold: 100, making: 0, total: 100 });
});
