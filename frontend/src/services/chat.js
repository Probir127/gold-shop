// Public chat does not require a customer session and must not hang indefinitely.
export async function postPublicChat(apiBase, tenantSlug, message, visitorId) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
        const response = await fetch(`${apiBase}/public/chat/${encodeURIComponent(tenantSlug)}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, visitor_id: visitorId }),
            signal: controller.signal,
        });
        if (!response.ok) throw new Error('Chat is temporarily unavailable');
        const data = await response.json();
        if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Chat returned an empty reply');
        return data;
    } finally {
        clearTimeout(timer);
    }
}
