import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorefrontSync, isStorefrontMutation } from './storefrontSync.js';

test('admin changes refresh this store and notify another open tab', () => {
  const calls = [];
  let listener, message;
  const browser = {
    addEventListener(_, fn) { listener = fn; }, removeEventListener() {},
    localStorage: { setItem(key, newValue) { message = { key, newValue }; } },
  };
  const sync = createStorefrontSync({ invalidateQueries: value => calls.push(value.queryKey[0]) }, browser);
  sync.publish();
  for (const key of ['products', 'product', 'goldRates', 'storefrontContent']) assert.ok(calls.includes(key));
  calls.length = 0;
  listener(message);
  assert.ok(calls.includes('storefrontContent'));
  calls.length = 0;
  listener({key:'access_token', newValue:'private'});
  assert.equal(calls.length, 0);
});

test('only successful catalogue, rate and content writes need propagation', () => {
  for (const url of ['/products/1/', '/rates/control/', '/storefront/content/', '/categories/']) {
    assert.equal(isStorefrontMutation({method:'patch',url}), true);
    assert.equal(isStorefrontMutation({method:'get',url}), false);
  }
  assert.equal(isStorefrontMutation({method:'post',url:'/auth/login/'}), false);
});
