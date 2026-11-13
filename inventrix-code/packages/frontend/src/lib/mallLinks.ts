export type MallId = "momo" | "shopee" | "pchome";

export interface Mall {
  id: MallId;
  /** Name shown on the button. */
  label: string;
  /** Brand colour, used for the hover glow and the icon badge. */
  color: string;
  /** Builds the mall's own search page for a product name. */
  searchUrl: (query: string) => string;
}

export const MALLS: readonly Mall[] = [
  {
    id: "momo",
    label: "momo",
    color: "#ff2f92",
    searchUrl: (q) =>
      `https://www.momoshop.com.tw/search/searchShop.jsp?keyword=${q}`,
  },
  {
    id: "shopee",
    label: "Shopee",
    color: "#ee4d2d",
    searchUrl: (q) => `https://shopee.tw/search?keyword=${q}`,
  },
  {
    id: "pchome",
    label: "PChome",
    color: "#e5002d",
    searchUrl: (q) => `https://24h.pchome.com.tw/search/?q=${q}`,
  },
];

type EnvMap = Record<string, string | undefined>;

function readEnv(name: string): string | undefined {
  const env = (import.meta as unknown as { env?: EnvMap }).env;
  return env?.[name];
}

/**
 * Referral link for a product on a mall: the mall's search page for the
 * product name. A tracking / affiliate query string can be supplied per mall
 * through `VITE_AFFILIATE_MOMO`, `VITE_AFFILIATE_SHOPEE` and
 * `VITE_AFFILIATE_PCHOME` (for example `aff_id=123&utm_source=inventrix`);
 * it is appended as-is. Nothing is appended when the variable is unset.
 */
export function buildMallUrl(mall: Mall, productName: string): string {
  const base = mall.searchUrl(encodeURIComponent(productName.trim()));
  const tracking = readEnv(`VITE_AFFILIATE_${mall.id.toUpperCase()}`)?.trim();
  if (!tracking) return base;
  return `${base}${base.includes("?") ? "&" : "?"}${tracking.replace(/^[?&]/, "")}`;
}
