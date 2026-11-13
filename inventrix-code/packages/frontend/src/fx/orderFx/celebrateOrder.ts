import confetti from "canvas-confetti";
import { GOLD_COLORS, ORDER_THEMES, type OrderThemeId } from "./themes";
import type { OrderTier } from "./tiers";

const BASE = { zIndex: 10000, disableForReducedMotion: true } as const;

const SPARK_COUNT: Record<OrderTier, number> = { 1: 0, 2: 90, 3: 160 };
const PORTAL_COUNT: Record<OrderTier, number> = { 1: 0, 2: 120, 3: 220 };
const COIN_RAIN_MS: Record<OrderTier, number> = { 1: 500, 2: 1100, 3: 2200 };

function forDuration(durationMs: number, frame: () => void): void {
  const end = Date.now() + durationMs;
  const tick = () => {
    frame();
    if (Date.now() < end) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function rocketSparks(colors: string[], count: number): void {
  if (count === 0) return;
  void confetti({
    ...BASE,
    particleCount: count,
    angle: 90,
    spread: 40,
    startVelocity: 75,
    gravity: 1.3,
    scalar: 0.8,
    origin: { x: 0.5, y: 1.05 },
    colors,
  });
}

function portalBlast(colors: string[], count: number): void {
  if (count === 0) return;
  window.setTimeout(() => {
    void confetti({
      ...BASE,
      particleCount: count,
      spread: 360,
      startVelocity: 38,
      ticks: 120,
      shapes: ["star", "circle"],
      origin: { x: 0.5, y: 0.5 },
      colors,
    });
  }, 800);
}

// Gold discs instead of a coin emoji: emoji glyphs render grey or blank on some platforms.
function coinRain(durationMs: number): void {
  forDuration(durationMs, () => {
    void confetti({
      ...BASE,
      particleCount: 3,
      angle: 270,
      spread: 30,
      startVelocity: 4,
      gravity: 0.9,
      ticks: 260,
      scalar: 1.8,
      shapes: ["circle"],
      colors: [...GOLD_COLORS],
      origin: { x: Math.random(), y: -0.1 },
    });
  });
}

function sideCannons(colors: string[], durationMs: number): void {
  forDuration(durationMs, () => {
    for (const [x, angle] of [
      [0, 60],
      [1, 120],
    ] as const) {
      void confetti({
        ...BASE,
        particleCount: 7,
        angle,
        spread: 70,
        origin: { x, y: 0.7 },
        colors,
      });
    }
  });
}

/** Canvas confetti that accompanies the launch overlay for a theme and tier. */
export function celebrateOrder(themeId: OrderThemeId, tier: OrderTier): void {
  const themeColors = [...ORDER_THEMES[themeId].colors];
  const colors = tier === 3 ? [...GOLD_COLORS, ...themeColors] : themeColors;

  if (themeId === "rocket") rocketSparks(colors, SPARK_COUNT[tier]);
  if (themeId === "portal") portalBlast(colors, PORTAL_COUNT[tier]);
  if (themeId === "jackpot") coinRain(COIN_RAIN_MS[tier]);
  if (tier === 3) sideCannons([...GOLD_COLORS], 1800);
}
