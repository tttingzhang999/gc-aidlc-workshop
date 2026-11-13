import { useRef } from "react";
import type { CSSProperties } from "react";
import { useMagnetic } from "../fx/useMagnetic";
import { MALLS, buildMallUrl } from "../lib/mallLinks";
import type { Mall } from "../lib/mallLinks";

/** One storefront glyph for every mall: generic, not an official trademark. */
function ShopIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 12v8h14v-8" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function MallButton({ mall, productName }: { mall: Mall; productName: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useMagnetic(ref, 0.25);
  return (
    <a
      ref={ref}
      href={buildMallUrl(mall, productName)}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={`在 ${mall.label} 搜尋 ${productName}（另開新分頁）`}
      data-testid={`mall-${mall.id}`}
      style={{ "--mall": mall.color } as CSSProperties}
      className="glass group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full py-2 pr-5 pl-2 font-display text-xs font-bold tracking-wider text-white uppercase transition-[box-shadow,border-color] duration-300 hover:border-[var(--mall)] hover:shadow-[0_0_14px_var(--mall),0_0_44px_-4px_var(--mall)] focus-visible:ring-4 focus-visible:ring-neon-cyan/60 focus-visible:outline-none"
    >
      <span
        className="relative grid size-8 place-items-center rounded-full text-white transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[360deg] motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
        style={{ background: "var(--mall)" }}
      >
        <ShopIcon />
      </span>
      <span>{mall.label}</span>
      <span
        aria-hidden="true"
        className="text-white/50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
      >
        ↗
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-[500%] motion-reduce:hidden"
      />
    </a>
  );
}

/** Referral buttons that take the shopper to the same product on each mall. */
export default function MallButtons({ productName }: { productName: string }) {
  return (
    <div className="flex flex-wrap gap-3" data-testid="mall-buttons">
      {MALLS.map((mall) => (
        <MallButton key={mall.id} mall={mall} productName={productName} />
      ))}
    </div>
  );
}
