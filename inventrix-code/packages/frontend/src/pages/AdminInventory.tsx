import { useRef } from "react";
import PageHeading from "../components/PageHeading";
import { gsap, ScrollTrigger, useGSAP } from "../fx/gsap";
import { formatPrice } from "../lib/format";
import type { InventoryItem, InventoryStatus } from "../lib/types";
import { useApi } from "../lib/useApi";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import LinkButton from "../ui/LinkButton";
import Skeleton from "../ui/Skeleton";
import StatusPill from "../ui/StatusPill";

const BAR_STYLES: Record<InventoryStatus, string> = {
  in_stock: "from-neon-lime to-neon-cyan shadow-neon-lime",
  low_stock: "from-neon-orange to-neon-pink shadow-neon-pink",
  out_of_stock: "from-neon-red to-neon-red shadow-neon-red",
};

export default function AdminInventory() {
  const {
    data: inventory,
    error,
    loading,
    reload,
  } = useApi<InventoryItem[]>("/api/analytics/inventory");
  const listRef = useRef<HTMLUListElement>(null);
  const maxStock = Math.max(1, ...(inventory ?? []).map((i) => i.stock));

  useGSAP(
    () => {
      const bars = gsap.utils.toArray<HTMLElement>("[data-stock-bar]");
      if (bars.length === 0) return;
      gsap.set(bars, { scaleX: 0 });
      ScrollTrigger.batch(bars, {
        start: "top 95%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            scaleX: 1,
            stagger: 0.06,
            duration: 1.3,
            ease: "elastic.out(1, 0.55)",
          }),
      });
      gsap.from("[data-inv-row]", {
        x: -60,
        opacity: 0,
        stagger: 0.04,
        duration: 0.6,
      });
    },
    { scope: listRef, dependencies: [inventory], revertOnUpdate: true },
  );

  const outCount = (inventory ?? []).filter(
    (i) => i.status === "out_of_stock",
  ).length;
  const lowCount = (inventory ?? []).filter(
    (i) => i.status === "low_stock",
  ).length;

  return (
    <div className="flex flex-col gap-10">
      <PageHeading
        kicker="Admin // reactor core"
        title="INVENTORY"
        actions={
          <LinkButton to="/admin" testId="back-to-dashboard">
            ← Dashboard
          </LinkButton>
        }
      />

      {loading && !inventory && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {inventory && !error && inventory.length === 0 && (
        <EmptyState title="NO PRODUCTS" message="Nothing to track yet." />
      )}

      {inventory && !error && inventory.length > 0 && (
        <Card>
          <p className="mb-6 flex flex-wrap gap-4 text-sm text-white/60">
            <span>
              <span className="font-display font-black text-neon-red">
                {outCount}
              </span>{" "}
              out of stock
            </span>
            <span>
              <span className="font-display font-black text-neon-orange">
                {lowCount}
              </span>{" "}
              running low
            </span>
            <span>
              <span className="font-display font-black text-neon-lime">
                {inventory.length - outCount - lowCount}
              </span>{" "}
              healthy
            </span>
          </p>
          <ul ref={listRef} className="flex flex-col gap-3">
            {inventory.map((item) => (
              <li
                key={item.id}
                data-inv-row
                data-testid={`inventory-row-${item.id}`}
                className={`grid grid-cols-1 items-center gap-3 rounded-2xl border px-4 py-3 md:grid-cols-[minmax(10rem,1.2fr)_2fr_6rem_8rem] ${
                  item.status === "out_of_stock"
                    ? "animate-pulse-red border-neon-red/70"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span className="flex flex-col">
                  <span className="font-bold">{item.name}</span>
                  <span className="text-xs text-white/40">
                    {formatPrice(item.price)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                    <span
                      data-stock-bar
                      className={`block h-full origin-left rounded-full bg-gradient-to-r ${BAR_STYLES[item.status]}`}
                      style={{
                        width: `${Math.max(item.stock === 0 ? 100 : 2, (item.stock / maxStock) * 100)}%`,
                        opacity: item.stock === 0 ? 0.25 : 1,
                      }}
                    />
                  </span>
                </span>
                <span className="font-display text-2xl font-black md:text-right">
                  {item.stock}
                </span>
                <span className="md:text-right">
                  <StatusPill status={item.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
