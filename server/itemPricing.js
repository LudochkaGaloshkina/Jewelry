export function applyItemPricing(item) {
    const originalPrice = Number(item.price)
    const discountPercent = Math.max(0, Number(item.discount) || 0)
    const isDiscounted = discountPercent > 0 && !Number.isNaN(originalPrice)
    const finalPrice = isDiscounted
        ? Math.round(originalPrice * (1 - discountPercent / 100))
        : originalPrice

    return {
        ...item,
        originalPrice,
        finalPrice,
        discountPercent,
        isDiscounted
    }
}

export function applyPricingToItems(items) {
    return items.map(applyItemPricing)
}
