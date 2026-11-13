// Price tier of a cart line, stored in cart_items.penalty.
export const PRICE_TIER = {
  normal: 0,
  lost: 1,
  surrendered: 2,
} as const;

export type PriceTier = (typeof PRICE_TIER)[keyof typeof PRICE_TIER];

// How many times the list price each tier costs: lose and pay 10x, surrender and pay half of that.
const TIER_MULTIPLIER: Record<PriceTier, number> = {
  [PRICE_TIER.normal]: 1,
  [PRICE_TIER.lost]: 10,
  [PRICE_TIER.surrendered]: 5,
};

export const isPriceTier = (value: number): value is PriceTier =>
  Object.prototype.hasOwnProperty.call(TIER_MULTIPLIER, value);

export const tierMultiplier = (tier: number): number =>
  isPriceTier(tier) ? TIER_MULTIPLIER[tier] : 1;

export const unitPrice = (price: number, tier: number) =>
  price * tierMultiplier(tier);
