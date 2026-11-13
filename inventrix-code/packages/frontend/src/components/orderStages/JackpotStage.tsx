import { useRef } from "react";
import { gsap, useGSAP } from "../../fx/gsap";
import type { OrderTier } from "../../fx/orderFx/tiers";
import type { StageProps } from "./types";

const SYMBOLS = ["🍒", "🔔", "⭐", "🍋", "💎", "🍀"];
const WINNING_SYMBOL = "💎";
const REEL_COUNT = 3;
const SPINS_BEFORE_STOP = 3;
const BULB_COUNT: Record<OrderTier, number> = { 1: 10, 2: 16, 3: 24 };

const REEL_STRIP = [
  ...Array.from({ length: SPINS_BEFORE_STOP }, () => SYMBOLS).flat(),
  WINNING_SYMBOL,
];

interface BulbRowProps {
  count: number;
  position: string;
}

function BulbRow({ count, position }: BulbRowProps) {
  return (
    <div className={`absolute inset-x-0 ${position} flex justify-around px-4`}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          data-bulb={i % 2 === 0 ? "even" : "odd"}
          className="h-4 w-4 rounded-full bg-[#ffd700] shadow-[0_0_14px_#ffd700]"
        />
      ))}
    </div>
  );
}

/** Marquee bulbs blink while three slot reels spin and land on diamonds. */
export default function JackpotStage({ tier, reduced }: StageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced) return;
      gsap.fromTo(
        "[data-bulb='even']",
        { opacity: 1 },
        { opacity: 0.15, duration: 0.18, repeat: -1, yoyo: true },
      );
      gsap.fromTo(
        "[data-bulb='odd']",
        { opacity: 0.15 },
        { opacity: 1, duration: 0.18, repeat: -1, yoyo: true },
      );
      gsap.from("[data-machine]", {
        y: -80,
        opacity: 0,
        duration: 0.4,
        ease: "back.out(2)",
      });
      gsap.utils.toArray<HTMLElement>("[data-reel]").forEach((reel, i) => {
        gsap.fromTo(
          reel,
          { yPercent: 0 },
          {
            yPercent: (-100 * (REEL_STRIP.length - 1)) / REEL_STRIP.length,
            duration: 0.7 + i * 0.25,
            delay: 0.15,
            ease: "power3.out",
          },
        );
      });
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <BulbRow count={BULB_COUNT[tier]} position="top-4" />
      <BulbRow count={BULB_COUNT[tier]} position="bottom-4" />
      <div className="absolute inset-x-0 top-[5%] flex justify-center">
        <div
          data-machine
          className="flex gap-3 rounded-3xl border-4 border-[#ffd700] bg-void-2/90 p-3 shadow-[0_0_40px_#ffd70088]"
        >
          {Array.from({ length: REEL_COUNT }, (_, i) => (
            <div
              key={i}
              className="h-[1.2em] w-[1.3em] overflow-hidden rounded-xl bg-white/10 text-center text-5xl leading-[1.2em] md:text-7xl"
            >
              <div data-reel={i}>
                {(reduced ? [WINNING_SYMBOL] : REEL_STRIP).map((symbol, j) => (
                  <div key={j}>{symbol}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
