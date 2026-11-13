import { useMemo, useRef } from "react";
import { gsap, useGSAP } from "../../fx/gsap";
import type { OrderTier } from "../../fx/orderFx/tiers";
import type { StageProps } from "./types";

const STREAK_COUNT: Record<OrderTier, number> = { 1: 14, 2: 28, 3: 44 };
const RING_COLORS = [
  "border-neon-pink",
  "border-neon-cyan",
  "border-neon-lime",
];

/** A rocket tears up the screen through a hyperspace starfield. */
export default function RocketStage({ tier, reduced }: StageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const streaks = useMemo(
    () =>
      Array.from({ length: STREAK_COUNT[tier] }, () => ({
        left: Math.random() * 100,
        height: 6 + Math.random() * 18,
        speed: 0.35 + Math.random() * 0.4,
      })),
    [tier],
  );
  const rings = tier === 1 ? RING_COLORS.slice(0, 1) : RING_COLORS;

  useGSAP(
    () => {
      if (reduced) return;
      gsap.utils.toArray<HTMLElement>("[data-streak]").forEach((el, i) => {
        gsap.fromTo(
          el,
          { yPercent: -120, opacity: 0 },
          {
            yPercent: 900,
            opacity: 1,
            duration: streaks[i]?.speed ?? 0.5,
            delay: Math.random() * 0.5,
            repeat: -1,
            ease: "none",
          },
        );
      });
      gsap.from("[data-ring]", {
        scale: 0,
        opacity: 1,
        stagger: 0.12,
        duration: 1.3,
        delay: 0.35,
        ease: "expo.out",
      });
      gsap
        .timeline()
        .fromTo(
          "[data-rocket]",
          { y: "70vh", x: 0, rotation: 0 },
          {
            y: "-20vh",
            x: -20,
            rotation: -4,
            duration: 0.6,
            ease: "power2.out",
          },
        )
        .to("[data-rocket]", {
          y: "-130vh",
          x: 30,
          rotation: 6,
          duration: 0.7,
          ease: "power3.in",
        });
      gsap.to("[data-flame]", {
        scaleY: 1.5,
        opacity: 0.7,
        duration: 0.08,
        repeat: -1,
        yoyo: true,
        transformOrigin: "top center",
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
      {streaks.map((s, i) => (
        <span
          key={i}
          data-streak
          className="absolute top-0 w-px bg-gradient-to-b from-transparent via-neon-cyan to-white"
          style={{ left: `${s.left}%`, height: `${s.height}vh` }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        {rings.map((color, i) => (
          <div
            key={color}
            data-ring
            className={`absolute rounded-full border-4 ${color}`}
            style={{
              width: `${(i + 1) * 40}vmax`,
              height: `${(i + 1) * 40}vmax`,
            }}
          />
        ))}
      </div>
      {!reduced && (
        <div
          data-rocket
          className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center"
        >
          <span className="block -rotate-45 text-[7rem] leading-none drop-shadow-[0_0_24px_#ff2bd6]">
            🚀
          </span>
          <span
            data-flame
            className="-mt-4 block h-40 w-8 rounded-full bg-gradient-to-b from-white via-neon-orange to-transparent blur-[3px]"
          />
        </div>
      )}
    </div>
  );
}
