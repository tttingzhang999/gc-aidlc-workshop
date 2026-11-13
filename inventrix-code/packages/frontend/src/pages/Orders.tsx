import { useRef } from "react";
import OrderTimelineCard from "../components/OrderTimelineCard";
import PageHeading from "../components/PageHeading";
import { gsap, useGSAP } from "../fx/gsap";
import type { Order } from "../lib/types";
import { useApi } from "../lib/useApi";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import LinkButton from "../ui/LinkButton";
import Skeleton from "../ui/Skeleton";

export default function Orders() {
  const {
    data: orders,
    error,
    loading,
    reload,
    setData,
  } = useApi<Order[]>("/api/orders");
  const listRef = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      if (!orders?.length) return;
      gsap.from("[data-order]", {
        x: -120,
        opacity: 0,
        rotation: -3,
        stagger: 0.08,
        duration: 0.8,
        ease: "back.out(1.6)",
      });
      gsap.from("[data-rail]", {
        scaleY: 0,
        transformOrigin: "top center",
        duration: 1.2,
        ease: "expo.out",
      });
    },
    { scope: listRef, dependencies: [orders?.length] },
  );

  return (
    <div className="flex flex-col gap-10">
      <PageHeading kicker="Flight log" title="MY ORDERS" />

      {loading && !orders && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {error && <ErrorState message={error.message} onRetry={reload} />}

      {orders && !error && orders.length === 0 && (
        <EmptyState
          title="NO ORDERS YET"
          message="Your flight log is empty. Time to launch your first order."
          action={
            <LinkButton
              to="/"
              variant="primary"
              size="lg"
              testId="orders-go-shop"
            >
              Go shopping →
            </LinkButton>
          }
        />
      )}

      {orders && !error && orders.length > 0 && (
        <ol ref={listRef} className="relative flex flex-col gap-5">
          <span
            data-rail
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-[0.95rem] w-0.5 bg-gradient-to-b from-neon-pink via-neon-violet to-neon-cyan md:left-[1.45rem]"
          />
          {orders.map((order) => (
            <OrderTimelineCard
              key={order.id}
              order={order}
              onCancelled={(id) =>
                setData((current) =>
                  (current ?? []).map((o) =>
                    o.id === id ? { ...o, status: "cancelled" } : o,
                  ),
                )
              }
            />
          ))}
        </ol>
      )}
    </div>
  );
}
