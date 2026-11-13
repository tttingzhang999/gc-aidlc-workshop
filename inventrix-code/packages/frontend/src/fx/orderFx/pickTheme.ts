import { ORDER_THEME_IDS, type OrderThemeId } from "./themes";

let lastThemeId: OrderThemeId | null = null;

/** Random theme that never repeats the previous order's theme. */
export function pickTheme(random: () => number = Math.random): OrderThemeId {
  const pool = ORDER_THEME_IDS.filter((id) => id !== lastThemeId);
  const picked = pool[Math.floor(random() * pool.length)] ?? pool[0];
  lastThemeId = picked;
  return picked;
}
