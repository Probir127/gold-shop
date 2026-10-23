// Share successful admin edits with storefront queries in this tab and other tabs.
const STORAGE_KEY = 'sahara-storefront-update';
const QUERY_KEYS = ['products', 'product', 'categories', 'goldRates', 'goldRateHistory', 'liveMarketRates', 'storefrontContent', 'paymentConfiguration'];

export function isStorefrontMutation(config = {}) {
  return ['post', 'patch', 'put', 'delete'].includes((config.method || '').toLowerCase())
    && /^\/(products|categories|rates|storefront\/content|checkout\/admin-config)(\/|\?|$)/.test(config.url || '');
}

export function createStorefrontSync(client, browser) {
  const invalidate = () => {
    for (const key of QUERY_KEYS) client.invalidateQueries({ queryKey: [key] });
  };
  const receive = (event) => { if (event.key === STORAGE_KEY && event.newValue) invalidate(); };
  browser?.addEventListener('storage', receive);
  return {
    publish() {
      invalidate();
      try { browser?.localStorage.setItem(STORAGE_KEY, `${Date.now()}-${Math.random()}`); }
      catch { /* Same-tab invalidation still works when storage is unavailable. */ }
    },
    dispose() { browser?.removeEventListener('storage', receive); },
  };
}
