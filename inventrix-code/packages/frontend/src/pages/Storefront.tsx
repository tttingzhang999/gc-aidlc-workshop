import { useMemo, useRef, useState } from "react";
import ProductCard from "../components/ProductCard";
import { gsap, ScrollTrigger, useGSAP } from "../fx/gsap";
import TextScramble from "../fx/TextScramble";
import { useApi } from "../lib/useApi";
import type { Product } from "../lib/types";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import Input from "../ui/Input";
import Marquee from "../ui/Marquee";
import Select from "../ui/Select";
import Skeleton from "../ui/Skeleton";
import Button from "../ui/Button";

type StockFilter = "all" | "in" | "out";

const STOCK_OPTIONS = [
  { value: "all", label: "Everything" },
  { value: "in", label: "In stock" },
  { value: "out", label: "Sold out" },
] as const;

const HERO_TICKER = [
  "FRESH DROPS",
  "GRAVITY OPTIONAL",
  "HYPER CHECKOUT",
  "NEON CERTIFIED",
  "ORBITAL DELIVERY",
];

function filterProducts(
  products: readonly Product[],
  query: string,
  stock: StockFilter,
): Product[] {
  const q = query.trim().toLowerCase();
  return products.filter((p) => {
    if (stock === "in" && p.stock <= 0) return false;
    if (stock === "out" && p.stock > 0) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q)
    );
  });
}

export default function Storefront() {
  const { data, error, loading, reload } = useApi<Product[]>("/api/products");
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState<StockFilter>("all");
  const heroRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => filterProducts(data ?? [], query, stock),
    [data, query, stock],
  );

  useGSAP(
    () => {
      gsap.from("[data-hero-sub]", {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        delay: 0.9,
        duration: 1,
      });
      gsap.from("[data-hero-orb]", {
        scale: 0,
        rotation: 180,
        duration: 1.6,
        ease: "elastic.out(1, 0.5)",
      });
    },
    { scope: heroRef },
  );

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]");
      if (cards.length === 0) return;
      gsap.set(cards, {
        opacity: 0,
        y: 140,
        rotationX: -35,
        rotationZ: () => gsap.utils.random(-8, 8),
      });
      ScrollTrigger.batch(cards, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            rotationX: 0,
            rotationZ: 0,
            stagger: 0.09,
            duration: 1,
            ease: "back.out(1.6)",
          }),
      });
    },
    { scope: gridRef, dependencies: [visible], revertOnUpdate: true },
  );

  return (
    <div className="flex flex-col gap-14">
      <section ref={heroRef} className="relative pt-6 md:pt-12">
        <div
          data-hero-orb
          aria-hidden="true"
          className="absolute -top-8 right-0 hidden h-56 w-56 rounded-full border-[14px] border-neon-cyan/70 shadow-neon-cyan md:block"
        >
          <div className="absolute inset-6 animate-spin-slow rounded-full border-4 border-dashed border-neon-pink" />
        </div>
        <p
          data-hero-sub
          className="font-display text-xs font-bold tracking-[0.5em] text-neon-lime uppercase"
        >
          Inventrix // Season 2026
        </p>
        <h1 className="mt-4 font-display text-[clamp(3.2rem,13vw,11rem)] leading-[0.85] font-black tracking-tighter">
          <TextScramble text="SHOP THE" className="block text-white" />
          <TextScramble
            text="FUTURE."
            className="block text-gradient"
            delayMs={350}
          />
        </h1>
        <p data-hero-sub className="mt-6 max-w-xl text-lg text-white/65">
          A storefront that refuses to sit still. Hover, click, buy — every move
          gets a reaction.
        </p>
      </section>

      <div className="-mx-4 -rotate-2 border-y-2 border-neon-pink bg-neon-pink py-3 font-display text-xl font-black text-void md:-mx-8 md:text-3xl">
        <Marquee items={HERO_TICKER} />
      </div>

      <section className="flex flex-col gap-4 md:flex-row md:items-end">
        <Input
          label="Search the catalogue"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="store-search"
          className="flex-1"
          type="search"
        />
        <Select
          label="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value as StockFilter)}
          options={STOCK_OPTIONS}
          data-testid="store-stock-filter"
          className="md:w-56"
        />
      </section>

      {loading && !data && (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      )}

      {error && <ErrorState message={error.message} onRetry={reload} />}

      {data && !error && visible.length === 0 && (
        <EmptyState
          title={data.length === 0 ? "NOTHING IN ORBIT" : "NO MATCHES"}
          message={
            data.length === 0
              ? "The catalogue is empty right now."
              : "Nothing matches that search. Try another signal."
          }
          action={
            data.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setStock("all");
                }}
                data-testid="store-clear-filters"
              >
                Clear filters
              </Button>
            )
          }
        />
      )}

      {data && !error && visible.length > 0 && (
        <div
          ref={gridRef}
          className="grid gap-8 [perspective:1200px] sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
