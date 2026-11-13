export type OrderThemeId = "rocket" | "portal" | "jackpot";

/** What is being celebrated: a placed order or prizes added to the cart. */
export type FxOccasion = "order" | "cart";

export interface ThemeCopy {
  headline: readonly [string, string];
  /** Follows a label such as "Order #12" or "3 prizes". */
  caption: string;
}

export interface OrderTheme {
  id: OrderThemeId;
  copy: Record<FxOccasion, ThemeCopy>;
  colors: readonly string[];
  /** Seconds the theme's own stage plays before the headline slams in. */
  headlineDelay: number;
}

export const GOLD_COLORS = [
  "#ffd700",
  "#ffb800",
  "#fff3a0",
  "#ff7a00",
] as const;

export const ORDER_THEMES: Record<OrderThemeId, OrderTheme> = {
  rocket: {
    id: "rocket",
    copy: {
      order: { headline: ["ORDER", "LAUNCHED"], caption: "is in orbit" },
      cart: {
        headline: ["CARGO", "LOADED"],
        caption: "stowed in the cargo bay",
      },
    },
    colors: ["#ff2bd6", "#00f0ff", "#ffffff", "#ff7a00"],
    headlineDelay: 0.45,
  },
  portal: {
    id: "portal",
    copy: {
      order: {
        headline: ["ORDER", "SUMMONED"],
        caption: "has crossed the portal",
      },
      cart: {
        headline: ["LOOT", "SUMMONED"],
        caption: "pulled into your cart",
      },
    },
    colors: ["#8b5cf6", "#00f0ff", "#ff2bd6"],
    headlineDelay: 0.85,
  },
  jackpot: {
    id: "jackpot",
    copy: {
      order: { headline: ["JACK", "POT!"], caption: "hit the jackpot" },
      cart: { headline: ["JACK", "POT!"], caption: "dropped into your cart" },
    },
    colors: ["#b6ff00", "#ff7a00", "#ffd700"],
    headlineDelay: 1.1,
  },
};

export const ORDER_THEME_IDS = Object.keys(ORDER_THEMES) as OrderThemeId[];

export function isOrderThemeId(value: string): value is OrderThemeId {
  return (ORDER_THEME_IDS as string[]).includes(value);
}
