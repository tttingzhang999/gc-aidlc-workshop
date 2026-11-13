import { useRef } from "react";
import PageHeading from "../components/PageHeading";
import { gsap, useGSAP } from "../fx/gsap";
import { formatDate, formatPrice } from "../lib/format";
import type { DashboardData, OrderStatus } from "../lib/types";
import { ORDER_STATUSES } from "../lib/types";
import { useApi } from "../lib/useApi";
import Card from "../ui/Card";
import CountUp from "../ui/CountUp";
import ErrorState from "../ui/ErrorState";
import LinkButton from "../ui/LinkButton";
import Skeleton from "../ui/Skeleton";
import StatusPill, { statusLabel } from "../ui/StatusPill";

const BAR_COLORS: Record<OrderStatus, string> = {
  pending: "from-neon-orange to-neon-pink",
  processing: "from-neon-cyan to-neon-violet",
  shipped: "from-neon-violet to-neon-pink",
  delivered: "from-neon-lime to-neon-cyan",
  cancelled: "from-neon-red to-neon-orange",
};

interface StatTile {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  accent: string;
  glow: "pink" | "cyan" | "lime";
}

function buildTiles(summary: DashboardData["summary"]): StatTile[] {
  return [
    {
      label: "Total revenue",
      value: summary.totalRevenue,
      decimals: 2,
      prefix: "$",
      accent: "text-neon-lime",
      glow: "lime",
    },
    {
      label: "Total orders",
      value: summary.totalOrders,
      accent: "text-neon-cyan",
      glow: "cyan",
    },
    {
      label: "Total products",
      value: summary.totalProducts,
      accent: "text-neon-violet",
      glow: "pink",
    },
    {
      label: "Low stock items",
      value: summary.lowStockItems,
      accent: "text-neon-red",
      glow: "pink",
    },
  ];
}

function StatusBars({ rows }: { rows: DashboardData["ordersByStatus"] }) {
  const counts = new Map(rows.map((r) => [r.status, r.count]));
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="flex flex-col gap-4">
      {ORDER_STATUSES.map((status) => {
        const count = counts.get(status) ?? 0;
        return (
          <div
            key={status}
            className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3"
            data-testid={`status-bar-${status}`}
          >
            <span className="text-sm text-white/70">{statusLabel(status)}</span>
            <span className="h-4 overflow-hidden rounded-full bg-white/5">
              <span
                data-bar
                className={`block h-full origin-left rounded-full bg-gradient-to-r ${BAR_COLORS[status]} shadow-neon-pink`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-display font-bold">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const { data, error, loading, reload } = useApi<DashboardData>(
    "/api/analytics/dashboard",
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!data) return;
      gsap.from("[data-tile]", {
        y: 80,
        opacity: 0,
        rotationX: -60,
        stagger: 0.1,
        duration: 0.9,
        ease: "back.out(1.8)",
      });
      gsap.from("[data-bar]", {
        scaleX: 0,
        stagger: 0.1,
        duration: 1.4,
        delay: 0.4,
        ease: "elastic.out(1, 0.6)",
      });
      gsap.from("[data-panel]", {
        y: 60,
        opacity: 0,
        stagger: 0.12,
        delay: 0.3,
      });
    },
    { scope: rootRef, dependencies: [data] },
  );

  const actions = (
    <>
      <LinkButton
        to="/admin/products"
        variant="primary"
        testId="admin-nav-products"
      >
        Products
      </LinkButton>
      <LinkButton to="/admin/orders" testId="admin-nav-orders">
        Orders
      </LinkButton>
      <LinkButton
        to="/admin/inventory"
        variant="lime"
        testId="admin-nav-inventory"
      >
        Inventory
      </LinkButton>
    </>
  );

  return (
    <div ref={rootRef} className="flex flex-col gap-10">
      <PageHeading
        kicker="Mission control"
        title="DASHBOARD"
        actions={actions}
      />

      {loading && !data && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      )}

      {error && <ErrorState message={error.message} onRetry={reload} />}

      {data && !error && (
        <>
          <div className="grid gap-5 [perspective:1000px] sm:grid-cols-2 lg:grid-cols-4">
            {buildTiles(data.summary).map((tile) => (
              <Card
                key={tile.label}
                data-tile
                glow={tile.glow}
                className="flex flex-col gap-3"
              >
                <span className="text-xs font-bold tracking-[0.25em] text-white/50 uppercase">
                  {tile.label}
                </span>
                <CountUp
                  value={tile.value}
                  decimals={tile.decimals}
                  prefix={tile.prefix}
                  className={`font-display text-4xl font-black tracking-tight text-glow ${tile.accent}`}
                />
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card data-panel className="lg:col-span-2">
              <h2 className="mb-5 font-display text-xl font-black">
                Recent orders
              </h2>
              {data.recentOrders.length === 0 ? (
                <p className="text-white/50">No orders yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.recentOrders.map((order) => (
                    <li
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3"
                    >
                      <span className="flex items-center gap-3">
                        <span className="font-display font-black text-neon-cyan">
                          #{order.id}
                        </span>
                        <span>{order.user_name}</span>
                        <span className="text-xs text-white/40">
                          {formatDate(order.created_at)}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <StatusPill status={order.status} />
                        <span className="font-display font-bold">
                          {formatPrice(order.total)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="flex flex-col gap-6">
              <Card data-panel>
                <h2 className="mb-5 font-display text-xl font-black">
                  Orders by status
                </h2>
                <StatusBars rows={data.ordersByStatus} />
              </Card>
              <Card data-panel>
                <h2 className="mb-5 font-display text-xl font-black">
                  Top products
                </h2>
                {data.topProducts.length === 0 ? (
                  <p className="text-white/50">No sales yet.</p>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {data.topProducts.map((product, i) => (
                      <li
                        key={product.name}
                        className="flex items-center gap-3"
                      >
                        <span className="font-display text-3xl font-black text-white/15">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">
                            {product.name}
                          </span>
                          <span className="text-xs text-white/50">
                            {product.total_sold} sold ·{" "}
                            {formatPrice(product.revenue)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
