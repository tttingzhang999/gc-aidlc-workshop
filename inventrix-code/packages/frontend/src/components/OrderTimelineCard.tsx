import { useRef, useState } from "react";
import { gsap, useGSAP } from "../fx/gsap";
import { apiFetch, toApiError } from "../lib/api";
import { formatDateTime, formatPrice } from "../lib/format";
import type { Order, OrderDetail } from "../lib/types";
import StatusPill from "../ui/StatusPill";
import Spinner from "../ui/Spinner";

interface OrderTimelineCardProps {
  order: Order;
}

type DetailState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; detail: OrderDetail };

/** One order on the timeline; expands to lazy-load its line items from GET /api/orders/:id. */
export default function OrderTimelineCard({ order }: OrderTimelineCardProps) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<DetailState>({ kind: "idle" });
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!open || !panelRef.current) return;
      gsap.fromTo(
        panelRef.current,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.6, ease: "expo.out" },
      );
    },
    { dependencies: [open] },
  );

  useGSAP(
    () => {
      if (!open || detail.kind !== "ready" || !panelRef.current) return;
      gsap.from(panelRef.current.querySelectorAll("[data-item]"), {
        x: -40,
        opacity: 0,
        stagger: 0.06,
        duration: 0.5,
      });
    },
    { dependencies: [open, detail.kind] },
  );

  const loadDetail = async () => {
    setDetail({ kind: "loading" });
    try {
      const data = await apiFetch<OrderDetail>(`/api/orders/${order.id}`);
      setDetail({ kind: "ready", detail: data });
    } catch (err: unknown) {
      setDetail({ kind: "error", message: toApiError(err).message });
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && (detail.kind === "idle" || detail.kind === "error"))
      void loadDetail();
  };

  return (
    <li data-order className="relative pl-10 md:pl-14">
      <span
        aria-hidden="true"
        className="absolute top-7 left-[0.55rem] h-4 w-4 rounded-full border-2 border-neon-pink bg-void shadow-neon-pink md:left-[1.05rem]"
      />
      <div className="glass overflow-hidden rounded-[var(--radius-blob)] transition-[box-shadow,border-color] hover:border-neon-cyan/60 hover:shadow-neon-cyan">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          data-testid={`order-toggle-${order.id}`}
          className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left md:p-6"
        >
          <span className="flex flex-col gap-1">
            <span className="font-display text-2xl font-black tracking-tight">
              Order #{order.id}
            </span>
            <span className="text-sm text-white/50">
              {formatDateTime(order.created_at)}
            </span>
          </span>
          <span className="flex items-center gap-4">
            <StatusPill status={order.status} />
            <span className="font-display text-2xl font-black text-gradient">
              {formatPrice(order.total)}
            </span>
            <span
              className={`text-neon-cyan transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            >
              ▼
            </span>
          </span>
        </button>
        {open && (
          <div
            ref={panelRef}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="flex flex-col gap-3 p-5 md:p-6">
              {detail.kind === "loading" && (
                <span className="flex items-center gap-2 text-neon-cyan">
                  <Spinner /> Loading items…
                </span>
              )}
              {detail.kind === "error" && (
                <span role="alert" className="text-neon-red">
                  {detail.message}{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void loadDetail()}
                    data-testid={`order-retry-${order.id}`}
                  >
                    Retry
                  </button>
                </span>
              )}
              {detail.kind === "ready" &&
                detail.detail.items.map((item) => (
                  <div
                    data-item
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3"
                  >
                    <span>
                      <span className="font-bold">{item.product_name}</span>
                      <span className="ml-2 text-white/50">
                        × {item.quantity}
                      </span>
                    </span>
                    <span className="font-display font-bold">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-white/60 sm:w-72 sm:self-end">
                <dt>Subtotal</dt>
                <dd className="text-right">{formatPrice(order.subtotal)}</dd>
                <dt>GST (10%)</dt>
                <dd className="text-right">{formatPrice(order.gst)}</dd>
                <dt className="font-bold text-white">Total</dt>
                <dd className="text-right font-bold text-neon-lime">
                  {formatPrice(order.total)}
                </dd>
              </dl>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
