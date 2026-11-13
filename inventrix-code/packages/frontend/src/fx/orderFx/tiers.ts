export type OrderTier = 1 | 2 | 3;

/** Minimum order total (GST included) that reaches each tier. */
export const TIER_MIN_TOTAL = { 2: 100, 3: 500 } as const;

/** How long the celebration overlay stays up before it redirects or closes. */
export const TIER_DURATION_MS: Record<OrderTier, number> = {
  1: 1500,
  2: 2200,
  3: 3200,
};

export function getTier(total: number): OrderTier {
  if (total >= TIER_MIN_TOTAL[3]) return 3;
  if (total >= TIER_MIN_TOTAL[2]) return 2;
  return 1;
}

export function isOrderTier(value: number): value is OrderTier {
  return value === 1 || value === 2 || value === 3;
}
