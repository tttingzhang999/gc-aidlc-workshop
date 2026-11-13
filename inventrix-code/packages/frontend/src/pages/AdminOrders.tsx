import { useMemo, useRef, useState } from "react";
import PageHeading from "../components/PageHeading";
import { gsap } from "../fx/gsap";
import { apiFetch, toApiError } from "../lib/api";
import { formatDate, formatPrice } from "../lib/format";
import type { Order, OrderStatus } from "../lib/types";
import { ORDER_STATUSES } from "../lib/types";
import { useApi } from "../lib/useApi";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import LinkButton from "../ui/LinkButton";
import Select from "../ui/Select";
import Skeleton from "../ui/Skeleton";
import StatusPill, { statusLabel } from "../ui/StatusPill";
import { useToast } from "../ui/Toast";

type StatusFilter = OrderStatus | "all";

const STATUS_OPTIONS = ORDER_STATUSES.map((s) => ({
  value: s,
  label: statusLabel(s),
}));
const FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...STATUS_OPTIONS,
];

function flashRows(
  container: HTMLElement | null,
  id: number,
  color: string,
): void {
  if (!container) return;
  const rows = container.querySelectorAll(`[data-order-row="${id}"]`);
  gsap.fromTo(
    rows,
    { backgroundColor: color, boxShadow: `0 0 40px ${color}` },
    {
      backgroundColor: "rgba(255,255,255,0.05)",
      boxShadow: "0 0 0px transparent",
      duration: 1.2,
      ease: "power2.out",
      clearProps: "backgroundColor,boxShadow",
    },
  );
}

export default function AdminOrders() {
  const toast = useToast();
  const {
    data: orders,
    error,
    loading,
    reload,
    setData,
  } = useApi<Order[]>("/api/orders");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [savingId, setSavingId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => (orders ?? []).filter((o) => filter === "all" || o.status === filter),
    [orders, filter],
  );

  const setStatusLocally = (id: number, status: OrderStatus) => {
    setData((current) =>
      (current ?? []).map((o) => (o.id === id ? { ...o, status } : o)),
    );
  };

  const updateStatus = async (order: Order, status: OrderStatus) => {
    if (status === order.status) return;
    const previous = order.status;
    setStatusLocally(order.id, status);
    setSavingId(order.id);
    try {
      await apiFetch<{ id: string; status: OrderStatus }>(
        `/api/orders/${order.id}/status`,
        {
          method: "PATCH",
          body: { status },
        },
      );
      flashRows(listRef.current, order.id, "#b6ff0055");
      toast.success(
        `Order #${order.id} updated`,
        `Now ${statusLabel(status).toLowerCase()}.`,
      );
    } catch (err: unknown) {
      setStatusLocally(order.id, previous);
      flashRows(listRef.current, order.id, "#ff2d5566");
      toast.error(`Order #${order.id} not updated`, toApiError(err).message);
    } finally {
      setSavingId(null);
    }
  };

  const statusSelect = (order: Order) => (
    <Select
      label="Set status"
      compact
      value={order.status}
      disabled={savingId === order.id || order.status === "cancelled"}
      onChange={(e) => void updateStatus(order, e.target.value as OrderStatus)}
      options={STATUS_OPTIONS}
      data-testid={`order-status-${order.id}`}
      className="min-w-40"
    />
  );

  return (
    <div className="flex flex-col gap-10">
      <PageHeading
        kicker="Admin // fulfilment"
        title="ORDERS"
        actions={
          <LinkButton to="/admin" testId="back-to-dashboard">
            ← Dashboard
          </LinkButton>
        }
      />

      <Card>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display text-2xl font-black">
            {visible.length} order{visible.length === 1 ? "" : "s"}
          </h2>
          <Select
            label="Filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as StatusFilter)}
            options={FILTER_OPTIONS}
            data-testid="admin-order-filter"
            className="md:w-64"
          />
        </div>

        {loading && !orders && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {orders && !error && visible.length === 0 && (
          <EmptyState
            title="NO ORDERS"
            message={
              orders.length === 0
                ? "Nobody has ordered yet."
                : "No orders with that status."
            }
          />
        )}

        {orders && !error && visible.length > 0 && (
          <div ref={listRef}>
            <table className="hidden w-full border-separate border-spacing-y-2 lg:table">
              <thead>
                <tr className="text-left text-xs tracking-[0.2em] text-white/40 uppercase">
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Subtotal</th>
                  <th className="px-3 py-2 font-medium">GST</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr
                    key={order.id}
                    data-order-row={order.id}
                    className="bg-white/5"
                  >
                    <td className="rounded-l-2xl px-3 py-2 font-display font-black text-neon-cyan">
                      #{order.id}
                    </td>
                    <td className="px-3 py-2">
                      <span className="block font-bold">
                        {order.user_name ?? "—"}
                      </span>
                      <span className="text-xs text-white/40">
                        {order.user_email}
                      </span>
                    </td>
                    <td className="px-3 py-2">{formatPrice(order.subtotal)}</td>
                    <td className="px-3 py-2">{formatPrice(order.gst)}</td>
                    <td className="px-3 py-2 font-display font-bold">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill status={order.status} />
                    </td>
                    <td className="px-3 py-2 text-sm text-white/60">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="rounded-r-2xl px-3 py-2">
                      {statusSelect(order)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="flex flex-col gap-3 lg:hidden">
              {visible.map((order) => (
                <li
                  key={order.id}
                  data-order-row={order.id}
                  className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-xl font-black text-neon-cyan">
                      #{order.id}
                    </span>
                    <StatusPill status={order.status} />
                  </span>
                  <span className="text-sm">
                    <span className="font-bold">{order.user_name ?? "—"}</span>
                    <span className="ml-2 text-white/40">
                      {formatDate(order.created_at)}
                    </span>
                  </span>
                  <span className="flex justify-between text-sm text-white/60">
                    <span>
                      {formatPrice(order.subtotal)} + {formatPrice(order.gst)}{" "}
                      GST
                    </span>
                    <span className="font-display font-bold text-white">
                      {formatPrice(order.total)}
                    </span>
                  </span>
                  {statusSelect(order)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
