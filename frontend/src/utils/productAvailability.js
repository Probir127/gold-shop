export const canPurchase = product => Boolean(product?.in_stock)
    && product.current_price != null
    && Number.isFinite(Number(product.current_price))
    && Number(product.current_price) > 0;

export const priceComponents = (price, weight, makingChargePerGram) => {
    if (price == null || weight == null || makingChargePerGram == null) return null;
    const total = Number(price);
    const making = Number(weight) * Number(makingChargePerGram);
    if (!Number.isFinite(total) || !Number.isFinite(making) || total <= 0 || making < 0 || making > total) return null;
    return { gold: total - making, making, total };
};
