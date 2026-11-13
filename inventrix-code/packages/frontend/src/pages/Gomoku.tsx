import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import LaunchOverlay from "../components/LaunchOverlay";
import PageHeading from "../components/PageHeading";
import { PENALTY_MULTIPLIER, useCart } from "../context/CartContext";
import { celebrate } from "../fx/celebrate";
import { gsap, useGSAP } from "../fx/gsap";
import { celebrateOrder } from "../fx/orderFx/celebrateOrder";
import { readDevOverride } from "../fx/orderFx/devOverride";
import { pickTheme } from "../fx/orderFx/pickTheme";
import type { OrderThemeId } from "../fx/orderFx/themes";
import { getTier, TIER_DURATION_MS, type OrderTier } from "../fx/orderFx/tiers";
import { apiFetch, toApiError } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { GomokuGame, Product } from "../lib/types";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Skeleton from "../ui/Skeleton";
import { useToast } from "../ui/Toast";

const BOARD_SIZE = 15;
const WIN_LENGTH = 5;
const CELL_PX = 48;

// One of these pops up at random when the player loses.
const TAUNTS = [
  "殺仁諸勳",
  "日久見仁勳",
  "公道自在仁勳",
  "知仁知面不知勳",
  "黃仁之勳不可無",
] as const;

interface ClaimResult {
  added: { product_id: number; quantity: number }[];
  penalty: boolean;
}

interface CartFx {
  label: string;
  total: number;
  theme: OrderThemeId;
  tier: OrderTier;
  imageUrl: string | null;
}

interface HoverTip {
  text: string;
  x: number;
  y: number;
}

function TauntDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.from("[data-backdrop]", { opacity: 0, duration: 0.25 });
      gsap.from("[data-taunt]", {
        scale: 0.2,
        rotation: -12,
        opacity: 0,
        duration: 0.7,
        ease: "back.out(2.5)",
      });
    },
    { scope: rootRef },
  );
  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={text}
      data-testid="taunt-dialog"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
    >
      <div
        data-backdrop
        onClick={onClose}
        className="absolute inset-0 bg-void/85 backdrop-blur-sm"
      />
      <div
        data-taunt
        className="glass relative flex flex-col items-center gap-8 rounded-[var(--radius-blob)] border-neon-red/70 px-8 py-12 shadow-neon-red md:px-16"
      >
        <p className="font-display text-5xl leading-tight font-black tracking-tight text-neon-red text-glow md:text-7xl">
          {text}
        </p>
        <Button autoFocus variant="danger" onClick={onClose}>
          OK
        </Button>
      </div>
    </div>
  );
}

export default function Gomoku() {
  const { refresh: refreshCart } = useCart();
  const toast = useToast();
  const [products, setProducts] = useState<Record<number, Product>>({});
  const [game, setGame] = useState<GomokuGame | null>(null);
  const [winLine, setWinLine] = useState<[number, number][]>([]);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [cartFx, setCartFx] = useState<CartFx | null>(null);

  useEffect(() => {
    if (cartFx === null) return;
    const timer = window.setTimeout(
      () => setCartFx(null),
      TIER_DURATION_MS[cartFx.tier],
    );
    return () => window.clearTimeout(timer);
  }, [cartFx]);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverTip | null>(null);

  useEffect(() => {
    apiFetch<Product[]>("/api/products", { auth: false })
      .then((list) =>
        setProducts(Object.fromEntries(list.map((p) => [p.id, p]))),
      )
      .catch((err: unknown) =>
        toast.error("Could not load products", toApiError(err).message),
      );
    // toast is stable for the app lifetime; load the catalogue once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newGame = useCallback(async () => {
    setWinLine([]);
    setLastMove(null);
    setTaunt(null);
    try {
      setGame(
        await apiFetch<GomokuGame>("/api/gomoku/games", { method: "POST" }),
      );
    } catch (err: unknown) {
      toast.error("Could not start a game", toApiError(err).message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume an unfinished game, otherwise start a new one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await apiFetch<GomokuGame | null>(
          "/api/gomoku/games/current",
        );
        if (cancelled) return;
        if (current) setGame(current);
        else await newGame();
      } catch (err: unknown) {
        if (!cancelled)
          toast.error("Could not load the game", toApiError(err).message);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newGame]);

  const handleMove = async (r: number, c: number) => {
    if (!game || busy || game.status !== "playing" || game.board[r][c]) return;
    setBusy(true);

    // Show the player's stone right away; the server's reply is the truth.
    const previous = game;
    const optimistic = game.board.map((row) => [...row]);
    optimistic[r][c] = "black";
    setGame({ ...game, board: optimistic });
    setLastMove([r, c]);

    try {
      const data = await apiFetch<GomokuGame>(
        `/api/gomoku/games/${game.id}/move`,
        { method: "POST", body: { row: r, col: c } },
      );
      setGame(data);
      setWinLine(data.winLine ?? []);
      setLastMove(data.lastMove ?? null);
      if (data.status === "won") celebrate();
      if (data.status === "lost")
        setTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
    } catch (err: unknown) {
      setGame(previous);
      setLastMove(null);
      toast.error("Move rejected", toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  // `added[].quantity` is the cart line's new total, so count this claim from the board instead.
  const showCartFx = ({ added, penalty }: ClaimResult) => {
    const addedIds = new Set(added.map((a) => a.product_id));
    const lines = chosen
      .filter(({ product }) => addedIds.has(product.id))
      .map(({ product, quantity }) => ({
        product,
        quantity: Math.min(quantity, product.stock),
      }));
    if (lines.length === 0) return;
    const multiplier = penalty ? PENALTY_MULTIPLIER : 1;
    const total = lines.reduce(
      (sum, l) => sum + l.product.price * multiplier * l.quantity,
      0,
    );
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const override = readDevOverride(window.location.search);
    const theme = override.theme ?? pickTheme();
    const tier = override.tier ?? getTier(total);
    celebrateOrder(theme, tier);
    setCartFx({
      label: `${count} ${count === 1 ? "prize" : "prizes"}`,
      total,
      theme,
      tier,
      imageUrl:
        lines.find((l) => l.product.image_url)?.product.image_url ?? null,
    });
  };

  const claim = async () => {
    if (!game) return;
    setClaiming(true);
    try {
      const result = await apiFetch<ClaimResult>(
        `/api/gomoku/games/${game.id}/claim`,
        { method: "POST" },
      );
      setGame({ ...game, claimed: true });
      showCartFx(result);
      await refreshCart();
      toast.success(
        "Added to cart",
        "Your prizes are waiting in the cargo bay.",
      );
    } catch (err: unknown) {
      toast.error("Could not add to cart", toApiError(err).message);
    } finally {
      setClaiming(false);
    }
  };

  const productAt = (r: number, c: number): Product | undefined =>
    game ? products[game.layout[r * BOARD_SIZE + c]] : undefined;

  // Products under the player's (black) stones, with the stone count on each.
  const chosen = useMemo(() => {
    if (!game) return [];
    const map = new Map<number, { product: Product; quantity: number }>();
    game.board.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell !== "black") return;
        const product = products[game.layout[r * BOARD_SIZE + c]];
        if (!product) return;
        const entry = map.get(product.id);
        if (entry) entry.quantity++;
        else map.set(product.id, { product, quantity: 1 });
      }),
    );
    return [...map.values()];
  }, [game, products]);

  const winSet = useMemo(
    () => new Set(winLine.map(([r, c]) => `${r},${c}`)),
    [winLine],
  );

  const status = game?.status ?? "playing";
  const penalty = status === "lost";
  const unitPrice = (p: Product) =>
    penalty ? p.price * PENALTY_MULTIPLIER : p.price;
  const gameOver = status !== "playing";
  const ready = game !== null && Object.keys(products).length > 0;
  const stoneCount = chosen.reduce((n, c) => n + c.quantity, 0);

  const statusText =
    status === "won"
      ? "🎉 You win!"
      : status === "lost"
        ? "🤖 Computer wins!"
        : status === "draw"
          ? "🤝 Draw"
          : busy
            ? "🤖 Computer is thinking…"
            : "⚫ Your turn";
  const statusColor =
    status === "won"
      ? "text-neon-lime"
      : status === "lost"
        ? "text-neon-red"
        : "text-neon-cyan";

  return (
    <div className="flex flex-col gap-8">
      {cartFx && (
        <LaunchOverlay
          occasion="cart"
          {...cartFx}
          onDismiss={() => setCartFx(null)}
        />
      )}
      <PageHeading
        kicker="Arcade deck"
        title="GOMOKU"
        actions={
          <Button
            variant="ghost"
            onClick={() => void newGame()}
            disabled={busy}
            data-testid="gomoku-new-game"
          >
            🔄 New game
          </Button>
        }
      />
      <p className="max-w-3xl text-white/65">
        You play black against the computer. Get {WIN_LENGTH} in a row to win,
        then add the products under your black stones to your cart. If you lose
        you can still add them, but at {PENALTY_MULTIPLIER}× the price.
      </p>

      <p
        role="status"
        data-testid="gomoku-status"
        className={`font-display text-2xl font-black tracking-tight md:text-3xl ${statusColor}`}
      >
        {statusText}
      </p>

      {game && (status === "won" || status === "lost") && (
        <Card
          glow={penalty ? "none" : "lime"}
          className={`flex max-w-3xl flex-col gap-4 ${penalty ? "border-neon-red/60" : "border-neon-lime/40"}`}
          data-testid="gomoku-prizes"
        >
          <h2
            className={`font-display text-xl font-black tracking-tight ${penalty ? "text-neon-red" : "text-neon-lime"}`}
          >
            {penalty
              ? `💸 Penalty prices, ${PENALTY_MULTIPLIER}× (${stoneCount} stones)`
              : `🎁 Your prizes (${stoneCount} stones)`}
          </h2>
          <ul className="flex max-h-52 flex-col gap-1 overflow-auto pr-2">
            {chosen.map(({ product, quantity }) => (
              <li
                key={product.id}
                className={`flex justify-between gap-4 ${product.stock > 0 ? "" : "text-white/35"}`}
              >
                <span>
                  {product.name} ×{" "}
                  {product.stock > 0 ? Math.min(quantity, product.stock) : 0}
                </span>
                <span>
                  {product.stock > 0
                    ? formatPrice(unitPrice(product))
                    : "Out of stock"}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={() => void claim()}
              disabled={game.claimed}
              loading={claiming}
              loadingText="Adding…"
              variant={penalty ? "danger" : "lime"}
              data-testid="gomoku-claim"
            >
              {game.claimed ? "✅ Added to cart" : "🛒 Add to cart"}
            </Button>
            {game.claimed && (
              <Link
                to="/cart"
                className="font-display text-xs font-bold tracking-widest text-neon-cyan uppercase hover:underline"
              >
                Go to cart →
              </Link>
            )}
          </div>
        </Card>
      )}

      {!ready ? (
        <Skeleton className="h-[26rem] w-full max-w-3xl" />
      ) : (
        <div
          data-testid="gomoku-board"
          className="glass w-fit max-w-full overflow-auto rounded-[var(--radius-blob)] p-3 shadow-neon-cyan"
        >
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_PX}px)`,
            }}
          >
            {game.board.map((row, r) =>
              row.map((cell, c) => {
                const product = productAt(r, c);
                const isWin = winSet.has(`${r},${c}`);
                const isLast = lastMove?.[0] === r && lastMove?.[1] === c;
                const disabled = !!cell || gameOver || busy;
                const ring = isWin
                  ? "outline outline-4 -outline-offset-4 outline-neon-lime"
                  : isLast
                    ? "outline outline-[3px] -outline-offset-[3px] outline-neon-pink"
                    : "";
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    disabled={disabled}
                    aria-label={`Row ${r + 1}, column ${c + 1}, ${product?.name ?? ""}${cell ? `, ${cell}` : ""}`}
                    onClick={() => void handleMove(r, c)}
                    onMouseMove={(e) =>
                      product &&
                      setHover({
                        text: `${product.name} · ${formatPrice(product.price)}`,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                    style={{ width: CELL_PX, height: CELL_PX }}
                    className={`relative overflow-hidden rounded-lg bg-gradient-to-br from-neon-violet/30 to-void-3 transition-transform enabled:hover:scale-110 enabled:hover:z-10 disabled:cursor-default ${ring}`}
                  >
                    {product?.image_url && (
                      <img
                        src={product.image_url}
                        alt=""
                        draggable={false}
                        className={`h-full w-full object-cover ${cell ? "opacity-35 grayscale-[60%]" : ""}`}
                      />
                    )}
                    {cell && (
                      <span
                        aria-hidden="true"
                        className={`absolute top-1/2 left-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${
                          cell === "black"
                            ? "border-2 border-white bg-[radial-gradient(circle_at_30%_30%,#555,#000_70%)]"
                            : "border-2 border-[#222] bg-[radial-gradient(circle_at_30%_30%,#fff,#e8e8e8_70%)]"
                        }`}
                      />
                    )}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      )}

      {hover && (
        <div
          role="tooltip"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
          className="pointer-events-none fixed z-[1000] rounded-lg border border-neon-cyan/60 bg-void-2/95 px-3 py-1.5 text-sm whitespace-nowrap text-white shadow-neon-cyan"
        >
          {hover.text}
        </div>
      )}

      {taunt && <TauntDialog text={taunt} onClose={() => setTaunt(null)} />}
    </div>
  );
}
