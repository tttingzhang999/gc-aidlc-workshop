import { isOrderThemeId, type OrderThemeId } from "./themes";
import { isOrderTier, type OrderTier } from "./tiers";

export interface OrderFxOverride {
  theme?: OrderThemeId;
  tier?: OrderTier;
}

/** Dev-only `?fx=<theme>&tier=<1|2|3>` so each combination can be checked by eye. */
export function readDevOverride(search: string): OrderFxOverride {
  if (!import.meta.env.DEV) return {};
  const params = new URLSearchParams(search);
  const theme = params.get("fx") ?? "";
  const tier = Number(params.get("tier"));
  return {
    theme: isOrderThemeId(theme) ? theme : undefined,
    tier: isOrderTier(tier) ? tier : undefined,
  };
}
