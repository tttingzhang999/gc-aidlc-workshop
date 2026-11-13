import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LaunchOverlay from "../components/LaunchOverlay";
import PageHeading from "../components/PageHeading";
import { useAuth } from "../context/AuthContext";
import { PENALTY_MULTIPLIER, useCart } from "../context/CartContext";
import { celebrate } from "../fx/celebrate";
import { shake } from "../fx/shake";
import { apiFetch, toApiError } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { RedirectState } from "../lib/redirect";
import type { CreatedOrder } from "../lib/types";
import Button from "../ui/Button";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import LinkButton from "../ui/LinkButton";
import { useToast } from "../ui/Toast";

const GST_RATE = 0.1;
const REDIRECT_AFTER_LAUNCH_MS = 1800;

export default function Cart() {
  const { items, removeItem, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [launchedId, setLaunchedId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (launchedId === null) return;
    const timer = window.setTimeout(
      () => navigate("/orders"),
      REDIRECT_AFTER_LAUNCH_MS,
    );
    return () => window.clearTimeout(timer);
  }, [launchedId, navigate]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const gst = subtotal * GST_RATE;

  const checkout = async () => {
    // Playing and filling the cart work as a guest; paying needs an account.
    if (!user) {
      const state: RedirectState = { from: "/cart" };
      navigate("/login", { state });
      return;
    }
    setBusy(true);
    try {
      const order = await apiFetch<CreatedOrder>("/api/orders", {
        method: "POST",
      });
      celebrate();
      await refresh();
      setLaunchedId(order.id);
    } catch (err: unknown) {
      shake(panelRef.current);
      toast.error("Checkout failed", toApiError(err).message);
      setBusy(false);
    }
  };

  const handleRemove = async (productId: number, penalty: boolean) => {
    try {
      await removeItem(productId, penalty);
    } catch (err: unknown) {
      toast.error("Could not remove item", toApiError(err).message);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {launchedId !== null && <LaunchOverlay orderId={launchedId} />}
      <PageHeading kicker="Cargo bay" title="YOUR CART" />

      {items.length === 0 && launchedId === null ? (
        <EmptyState
          title="CART IS EMPTY"
          message="Win a game of Gomoku to claim the products under your stones. Lose and you can still claim them, at 10x the price."
          action={
            <LinkButton to="/gomoku" variant="primary" size="lg" testId="cart-go-play">
              Play Gomoku →
            </LinkButton>
          }
        />
      ) : (
        <div
          ref={panelRef}
          className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]"
        >
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={`${item.product_id}-${item.penalty ? "p" : "n"}`}>
                <Card
                  glow={item.penalty ? "none" : "cyan"}
                  className={`flex items-center gap-4 !p-4 ${item.penalty ? "border-neon-red/60" : ""}`}
                  data-testid="cart-item"
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-black tracking-tight">
                      {item.name}
                    </p>
                    <p className="text-sm text-white/60">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                    {item.penalty && (
                      <span className="mt-1 inline-block rounded-full border border-neon-red/60 px-2 py-0.5 text-[0.65rem] font-bold tracking-widest text-neon-red uppercase">
                        {PENALTY_MULTIPLIER}× penalty
                      </span>
                    )}
                  </div>
                  <p className="font-display text-xl font-black text-gradient">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void handleRemove(item.product_id, item.penalty)}
                    aria-label={`Remove ${item.name}`}
                    disabled={busy}
                  >
                    Remove
                  </Button>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="flex flex-col gap-4 lg:sticky lg:top-28">
            <div className="flex justify-between text-white/70">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>GST (10%)</span>
              <span>{formatPrice(gst)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-4 font-display text-2xl font-black">
              <span>Total</span>
              <span className="text-gradient">{formatPrice(subtotal + gst)}</span>
            </div>
            <Button
              size="lg"
              onClick={() => void checkout()}
              loading={busy}
              loadingText="Charging thrusters…"
              disabled={items.length === 0}
              data-testid="cart-checkout"
              className="w-full"
            >
              {user ? "Checkout 🚀" : "Login to checkout"}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
