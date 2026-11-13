import { useRef } from "react";
import { gsap, useGSAP } from "../../fx/gsap";
import type { OrderTier } from "../../fx/orderFx/tiers";
import type { StageProps } from "./types";

const PORTAL_SIZE: Record<OrderTier, string> = {
  1: "55vmin",
  2: "75vmin",
  3: "95vmin",
};

/** The product is sucked into a spinning summoning circle, which then flares. */
export default function PortalStage({ tier, reduced, imageUrl }: StageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced) return;
      gsap.to("[data-spin]", {
        rotation: 360,
        duration: 3,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });
      gsap.to("[data-spin-reverse]", {
        rotation: -360,
        duration: 2,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });
      gsap
        .timeline()
        .from("[data-portal]", {
          scale: 0,
          rotation: -180,
          opacity: 0,
          duration: 0.7,
          ease: "back.out(1.6)",
        })
        .fromTo(
          "[data-sucked]",
          { scale: 1.3, rotation: 0, opacity: 1 },
          {
            scale: 0,
            rotation: 720,
            opacity: 0.2,
            duration: 0.75,
            ease: "power3.in",
          },
          0.1,
        )
        .fromTo(
          "[data-flare]",
          { scale: 0, opacity: 1 },
          { scale: 8, opacity: 0, duration: 0.8, ease: "expo.out" },
          0.8,
        )
        .to("[data-portal]", { opacity: 0.35, duration: 0.6 }, 1);
    },
    { scope: rootRef },
  );

  const size = PORTAL_SIZE[tier];

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <svg
        data-portal
        viewBox="0 0 200 200"
        className="absolute drop-shadow-[0_0_24px_#8b5cf6]"
        style={{ width: size, height: size }}
      >
        <g data-spin>
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeDasharray="4 8"
          />
          <polygon
            points="100,14 174,143 26,143"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="1.5"
          />
          <polygon
            points="100,186 26,57 174,57"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="1.5"
          />
        </g>
        <g data-spin-reverse>
          <circle
            cx="100"
            cy="100"
            r="62"
            fill="none"
            stroke="#ff2bd6"
            strokeWidth="3"
            strokeDasharray="36 12"
          />
          {tier === 3 && (
            <circle
              cx="100"
              cy="100"
              r="78"
              fill="none"
              stroke="#ffd700"
              strokeWidth="2.5"
              strokeDasharray="2 6"
            />
          )}
          <circle
            cx="100"
            cy="100"
            r="36"
            fill="none"
            stroke="#b6ff00"
            strokeWidth="2"
          />
        </g>
      </svg>
      {imageUrl && !reduced && (
        <img
          data-sucked
          src={imageUrl}
          alt=""
          className="absolute h-40 w-40 rounded-full border-2 border-neon-violet object-cover shadow-neon-cyan"
        />
      )}
      <div
        data-flare
        className="absolute h-24 w-24 rounded-full bg-white opacity-0 blur-md"
      />
    </div>
  );
}
