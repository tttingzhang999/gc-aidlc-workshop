import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import LaunchOverlay from "../components/LaunchOverlay";
import PageHeading from "../components/PageHeading";
import TauntDialog, { randomTaunt } from "../components/TauntDialog";
import { PENALTY_MULTIPLIER, useCart } from "../context/CartContext";
import { celebrate } from "../fx/celebrate";
import { celebrateOrder } from "../fx/orderFx/celebrateOrder";
import { readDevOverride } from "../fx/orderFx/devOverride";
import { pickTheme } from "../fx/orderFx/pickTheme";
import type { OrderThemeId } from "../fx/orderFx/themes";
import { getTier, TIER_DURATION_MS, type OrderTier } from "../fx/orderFx/tiers";
import { apiFetch, toApiError } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { Product } from "../lib/types";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Skeleton from "../ui/Skeleton";
import { useToast } from "../ui/Toast";
import barrierImg from "../assets/snake/trump-barrier.png";
import headImg from "../assets/snake/jensen-head.png";

const SIZE = 16;
const TICK_MS = 180;
/** GPUs to collect for a win. Crashing before that is a loss. */
const WIN_TARGET = 10;

type Point = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
// idle: not started · ready: waiting for the first direction · playing · won / lost: game over
type Status = "idle" | "ready" | "playing" | "won" | "lost";

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

const DELTA: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const idx = (p: Point) => p.y * SIZE + p.x;
const isOver = (s: Status) => s === "won" || s === "lost";

interface World {
  snake: Point[];
  dir: Dir;
  queued: Dir[];
  food: Point;
  blocks: Point[];
  eaten: Product[];
}

function randomFree(taken: Point[]): Point {
  for (;;) {
    const p = {
      x: Math.floor(Math.random() * SIZE),
      y: Math.floor(Math.random() * SIZE),
    };
    if (!taken.some((t) => same(t, p))) return p;
  }
}

function freshWorld(): World {
  // Start in the middle so there is room to react in every direction.
  const snake = [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ];
  return {
    snake,
    dir: "right",
    queued: [],
    food: randomFree(snake),
    blocks: [],
    eaten: [],
  };
}

/** Cell size that keeps the whole board on screen. */
function useCellSize(): number {
  const calc = () => {
    const byHeight = (window.innerHeight - 180) / SIZE;
    const byWidth = (window.innerWidth - 64) / SIZE;
    return Math.max(16, Math.min(34, Math.floor(Math.min(byHeight, byWidth))));
  };
  const [size, setSize] = useState(calc);
  useEffect(() => {
    const onResize = () => setSize(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

export default function Snake() {
  const { refresh: refreshCart } = useCart();
  const toast = useToast();
  const cellPx = useCellSize();
  const [products, setProducts] = useState<Product[]>([]);
  const [layout, setLayout] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [, setVersion] = useState(0);
  const [eaten, setEaten] = useState<Product[]>([]);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [cartFx, setCartFx] = useState<CartFx | null>(null);
  const world = useRef<World>(freshWorld());
  const boardRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<Status>(status);
  statusRef.current = status;
  const tauntOpen = useRef(false);
  tauntOpen.current = taunt !== null;

  useEffect(() => {
    if (cartFx === null) return;
    const timer = window.setTimeout(
      () => setCartFx(null),
      TIER_DURATION_MS[cartFx.tier],
    );
    return () => window.clearTimeout(timer);
  }, [cartFx]);

  useEffect(() => {
    apiFetch<Product[]>("/api/products", { auth: false })
      .then((list) => {
        setProducts(list);
        if (list.length > 0)
          setLayout(
            Array.from({ length: SIZE * SIZE }, () =>
              Math.floor(Math.random() * list.length),
            ),
          );
      })
      .catch((err: unknown) =>
        toast.error("Could not load products", toApiError(err).message),
      );
    // toast is stable for the app lifetime; load the catalogue once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productAt = useCallback(
    (p: Point): Product | undefined => products[layout[idx(p)]],
    [products, layout],
  );

  const start = useCallback(() => {
    world.current = freshWorld();
    setEaten([]);
    setClaimed(false);
    setTaunt(null);
    setStatus("ready");
    setVersion((v) => v + 1);
    boardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    boardRef.current?.focus({ preventScroll: true });
  }, []);

  // Queue a turn; the first one also starts the snake moving.
  const steer = useCallback((dir: Dir) => {
    const s = statusRef.current;
    if (s !== "ready" && s !== "playing") return;
    const w = world.current;
    const last = w.queued[w.queued.length - 1] ?? w.dir;
    if (dir !== last && dir !== OPPOSITE[last] && w.queued.length < 3)
      w.queued.push(dir);
    if (s === "ready") setStatus("playing");
  }, []);

  // Game loop.
  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => {
      const w = world.current;
      const next = w.queued.shift();
      if (next) w.dir = next;
      const d = DELTA[w.dir];
      const head = { x: w.snake[0].x + d.x, y: w.snake[0].y + d.y };
      const ate = same(head, w.food);
      // The tail cell is vacated this tick unless the snake grows.
      const body = ate ? w.snake : w.snake.slice(0, -1);
      const hitWall =
        head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE;
      if (
        hitWall ||
        body.some((s) => same(s, head)) ||
        w.blocks.some((b) => same(b, head))
      ) {
        setStatus("lost");
        setTaunt(randomTaunt());
        return;
      }
      w.snake = [head, ...body];
      if (ate) {
        const product = productAt(head);
        if (product) {
          w.eaten = [...w.eaten, product];
          setEaten(w.eaten);
        }
        if (w.eaten.length >= WIN_TARGET) {
          setStatus("won");
          celebrate();
          setVersion((v) => v + 1);
          return;
        }
        // Each pickup spawns a new barrier, never right in front of the head.
        const ahead = { x: head.x + d.x, y: head.y + d.y };
        w.blocks = [...w.blocks, randomFree([...w.snake, ...w.blocks, ahead])];
        w.food = randomFree([...w.snake, ...w.blocks]);
      }
      setVersion((v) => v + 1);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [status, productAt]);

  // Keyboard: arrows / WASD steer, Space / Enter start.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tauntOpen.current) return; // let the dialog handle its own keys
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const dir = KEY_DIR[e.key];
      const s = statusRef.current;
      // Space / Enter on a focused button should press that button instead.
      if (!dir && target?.closest("button")) return;
      if (dir) {
        e.preventDefault();
        // After a game, arrows do nothing so the prize card is not lost by accident.
        if (s === "idle") start();
        steer(dir);
        return;
      }
      if ((e.key === " " || e.key === "Enter") && !isOver(s) && s !== "playing") {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start, steer]);

  // Collected products with the number of each.
  const chosen = useMemo(() => {
    const map = new Map<number, { product: Product; quantity: number }>();
    for (const product of eaten) {
      const entry = map.get(product.id);
      if (entry) entry.quantity++;
      else map.set(product.id, { product, quantity: 1 });
    }
    return [...map.values()];
  }, [eaten]);

  const penalty = status === "lost";
  const multiplier = penalty ? PENALTY_MULTIPLIER : 1;
  const unitPrice = (p: Product) => p.price * multiplier;
  const total = chosen.reduce(
    (sum, { product, quantity }) =>
      product.stock > 0
        ? sum + unitPrice(product) * Math.min(quantity, product.stock)
        : sum,
    0,
  );

  // `added[].quantity` is the cart line's new total, so count this claim from the run instead.
  const showCartFx = ({ added }: ClaimResult) => {
    const addedIds = new Set(added.map((a) => a.product_id));
    const lines = chosen
      .filter(({ product }) => addedIds.has(product.id))
      .map(({ product, quantity }) => ({
        product,
        quantity: Math.min(quantity, product.stock),
      }));
    if (lines.length === 0) return;
    const fxTotal = lines.reduce(
      (sum, l) => sum + l.product.price * multiplier * l.quantity,
      0,
    );
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const override = readDevOverride(window.location.search);
    const theme = override.theme ?? pickTheme();
    const tier = override.tier ?? getTier(fxTotal);
    celebrateOrder(theme, tier);
    setCartFx({
      label: `${count} ${count === 1 ? "GPU" : "GPUs"}`,
      total: fxTotal,
      theme,
      tier,
      imageUrl:
        lines.find((l) => l.product.image_url)?.product.image_url ?? null,
    });
  };

  const claim = async () => {
    if (claimed || chosen.length === 0) return;
    setClaiming(true);
    try {
      const result = await apiFetch<ClaimResult>("/api/cart/items", {
        method: "POST",
        body: {
          items: chosen.map(({ product, quantity }) => ({
            product_id: product.id,
            quantity,
          })),
          penalty,
        },
      });
      setClaimed(true);
      showCartFx(result);
      await refreshCart();
      toast.success("Added to cart", "Your GPUs are waiting in the cargo bay.");
    } catch (err: unknown) {
      toast.error("Could not add to cart", toApiError(err).message);
    } finally {
      setClaiming(false);
    }
  };

  const w = world.current;
  const ready = products.length > 0 && layout.length > 0;
  const gameOver = isOver(status);

  const overlay =
    status === "idle"
      ? { title: "GPU SNAKE", hint: "Press an arrow key or Space to start" }
      : status === "ready"
        ? { title: "READY", hint: "Press an arrow key to go" }
        : status === "won"
          ? { title: "🎉 YOU WIN", hint: `${eaten.length} GPUs collected` }
          : status === "lost"
            ? { title: "💥 GAME OVER", hint: `${eaten.length} GPUs collected` }
            : null;

  const statusText =
    status === "won"
      ? "🎉 You win!"
      : status === "lost"
        ? "💥 You crashed!"
        : `🖥️ ${eaten.length} / ${WIN_TARGET} GPUs`;
  const statusColor =
    status === "won"
      ? "text-neon-lime"
      : status === "lost"
        ? "text-neon-red"
        : "text-neon-cyan";

  const pad = (dir: Dir, label: string, area: string) => (
    <button
      type="button"
      aria-label={`Move ${dir}`}
      disabled={gameOver}
      onClick={() => {
        if (status === "idle") start();
        steer(dir);
      }}
      style={{ gridArea: area }}
      className="flex h-14 w-14 items-center justify-center rounded-xl border border-neon-cyan/50 bg-void-2/80 text-2xl text-neon-cyan active:scale-95 disabled:opacity-30"
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      {cartFx && (
        <LaunchOverlay
          occasion="cart"
          {...cartFx}
          onDismiss={() => setCartFx(null)}
        />
      )}
      <PageHeading
        kicker="Arcade deck"
        title="GPU SNAKE"
        actions={
          <Button variant="ghost" onClick={start} data-testid="snake-start">
            {status === "idle" ? "▶️ Start" : "🔄 New game"}
          </Button>
        }
      />
      <p className="max-w-3xl text-white/65">
        Steer Jensen with the arrow keys or WASD. Collect {WIN_TARGET} 🖥️ GPUs
        to win, then add the products under them to your cart. Every pickup
        drops a Trump somewhere on the map, and he blocks like a wall. Hit him,
        a wall or yourself and you lose: you can still add what you collected,
        but at {PENALTY_MULTIPLIER}× the price.
      </p>

      <p
        role="status"
        data-testid="snake-status"
        className={`font-display text-2xl font-black tracking-tight md:text-3xl ${statusColor}`}
      >
        {statusText}
      </p>

      {!ready ? (
        <Skeleton className="h-[26rem] w-full max-w-3xl" />
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <div
            ref={boardRef}
            tabIndex={-1}
            data-testid="snake-board"
            className="glass relative w-fit rounded-[var(--radius-blob)] p-3 shadow-neon-cyan outline-none"
          >
            <div
              className="grid gap-px"
              style={{ gridTemplateColumns: `repeat(${SIZE}, ${cellPx}px)` }}
            >
              {Array.from({ length: SIZE * SIZE }, (_, i) => {
                const p = { x: i % SIZE, y: Math.floor(i / SIZE) };
                const product = productAt(p);
                const snakeIdx = w.snake.findIndex((s) => same(s, p));
                const isFood = !gameOver && same(w.food, p);
                const isBlock = w.blocks.some((b) => same(b, p));
                return (
                  <div
                    key={i}
                    title={
                      product
                        ? `${product.name} · ${formatPrice(product.price)}`
                        : undefined
                    }
                    style={{
                      width: cellPx,
                      height: cellPx,
                      fontSize: cellPx * 0.6,
                    }}
                    className="relative flex items-center justify-center overflow-hidden rounded-sm bg-void-3"
                  >
                    {product?.image_url && (
                      <img
                        src={product.image_url}
                        alt=""
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover opacity-25"
                      />
                    )}
                    {snakeIdx === 0 && (
                      <img
                        src={headImg}
                        alt=""
                        draggable={false}
                        data-snake="head"
                        className="absolute inset-0 z-20 h-full w-full rounded-full object-cover ring-2 ring-neon-lime shadow-[0_0_10px_var(--color-neon-lime)]"
                      />
                    )}
                    {snakeIdx > 0 && (
                      <span
                        aria-hidden="true"
                        data-snake="body"
                        className="absolute inset-0.5 z-10 rounded-md bg-neon-lime/70"
                      />
                    )}
                    {isFood && (
                      <span className="z-10 animate-pulse rounded-md bg-neon-cyan/40 px-0.5">
                        🖥️
                      </span>
                    )}
                    {isBlock && (
                      <img
                        src={barrierImg}
                        alt=""
                        draggable={false}
                        data-snake="barrier"
                        className="absolute inset-0 z-10 h-full w-full rounded-sm object-cover ring-2 ring-neon-red"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {overlay && (
              <div
                data-testid="snake-overlay"
                className="absolute inset-3 z-20 flex flex-col items-center justify-center gap-3 rounded-[var(--radius-blob)] bg-void/70 p-4 text-center backdrop-blur-[2px]"
              >
                <p
                  className={`font-display text-3xl font-black tracking-tight md:text-5xl ${
                    status === "lost" ? "text-neon-red" : "text-neon-lime"
                  }`}
                >
                  {overlay.title}
                </p>
                <p className="text-white/80">{overlay.hint}</p>
                {(status === "idle" || gameOver) && (
                  <Button variant="ghost" onClick={start}>
                    {gameOver ? "🔄 New game" : "▶️ Start"}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {gameOver && (
              <Card
                glow={penalty ? "none" : "lime"}
                className={`flex w-full max-w-md flex-col gap-4 ${penalty ? "border-neon-red/60" : "border-neon-lime/40"}`}
                data-testid="snake-prizes"
              >
                <h2
                  className={`font-display text-xl font-black tracking-tight ${penalty ? "text-neon-red" : "text-neon-lime"}`}
                >
                  {penalty
                    ? `💸 Penalty prices, ${PENALTY_MULTIPLIER}× (${eaten.length} GPUs)`
                    : `🎁 Your prizes (${eaten.length} GPUs)`}
                </h2>
                {chosen.length === 0 ? (
                  <p className="text-white/60">
                    Nothing collected this run.
                  </p>
                ) : (
                  <>
                    <ul className="flex max-h-52 flex-col gap-1 overflow-auto pr-2">
                      {chosen.map(({ product, quantity }) => (
                        <li
                          key={product.id}
                          className={`flex justify-between gap-4 ${product.stock > 0 ? "" : "text-white/35"}`}
                        >
                          <span>
                            {product.name} ×{" "}
                            {product.stock > 0
                              ? Math.min(quantity, product.stock)
                              : 0}
                          </span>
                          <span>
                            {product.stock > 0
                              ? formatPrice(unitPrice(product))
                              : "Out of stock"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p
                      className={`flex justify-between border-t border-white/10 pt-3 font-display font-black ${penalty ? "text-neon-red" : "text-neon-lime"}`}
                    >
                      <span>Total</span>
                      <span data-testid="snake-total">{formatPrice(total)}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <Button
                        onClick={() => void claim()}
                        disabled={claimed}
                        loading={claiming}
                        loadingText="Adding…"
                        variant={penalty ? "danger" : "lime"}
                        data-testid="snake-claim"
                      >
                        {claimed ? "✅ Added to cart" : "🛒 Add to cart"}
                      </Button>
                      {claimed && (
                        <Link
                          to="/cart"
                          className="font-display text-xs font-bold tracking-widest text-neon-cyan uppercase hover:underline"
                        >
                          Go to cart →
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* On-screen controls for touch devices. */}
            <div
              className="grid w-fit gap-2"
              style={{
                gridTemplateAreas: '". up ." "left down right"',
                gridTemplateColumns: "repeat(3, 3.5rem)",
              }}
            >
              {pad("up", "▲", "up")}
              {pad("left", "◀", "left")}
              {pad("down", "▼", "down")}
              {pad("right", "▶", "right")}
            </div>
          </div>
        </div>
      )}

      {taunt && <TauntDialog text={taunt} onClose={() => setTaunt(null)} />}
    </div>
  );
}
