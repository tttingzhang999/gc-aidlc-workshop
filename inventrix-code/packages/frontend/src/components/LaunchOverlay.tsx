import { useRef } from "react";
import type { ComponentType } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "../fx/gsap";
import {
  ORDER_THEMES,
  type FxOccasion,
  type OrderThemeId,
} from "../fx/orderFx/themes";
import type { OrderTier } from "../fx/orderFx/tiers";
import { formatPrice } from "../lib/format";
import CountUp from "../ui/CountUp";
import JackpotStage from "./orderStages/JackpotStage";
import PortalStage from "./orderStages/PortalStage";
import RocketStage from "./orderStages/RocketStage";
import type { StageProps } from "./orderStages/types";

const STAGES: Record<OrderThemeId, ComponentType<StageProps>> = {
  rocket: RocketStage,
  portal: PortalStage,
  jackpot: JackpotStage,
};

const HEADLINE_GLOW: Record<OrderThemeId, string> = {
  rocket: "0 0 40px #ff2bd6, 0 0 120px #00f0ff",
  portal: "0 0 40px #8b5cf6, 0 0 120px #ff2bd6",
  jackpot: "0 0 40px #b6ff00, 0 0 120px #ffd700",
};
const GOLD_GLOW = "0 0 40px #ffd700, 0 0 140px #ff7a00";

interface LaunchOverlayProps {
  occasion: FxOccasion;
  /** Subject of the caption, e.g. "Order #12" or "3 prizes". */
  label: string;
  total: number;
  theme: OrderThemeId;
  tier: OrderTier;
  imageUrl: string | null;
  /** When set, clicking the overlay closes it early. */
  onDismiss?: () => void;
}

/** Full-screen celebration; its theme is random and its intensity follows the amount. */
export default function LaunchOverlay({
  occasion,
  label,
  total,
  theme,
  tier,
  imageUrl,
  onDismiss,
}: LaunchOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = prefersReducedMotion();
  const { copy, headlineDelay } = ORDER_THEMES[theme];
  const { headline, caption } = copy[occasion];
  const Stage = STAGES[theme];
  const legendary = tier === 3;
  const showTotal = legendary || theme === "jackpot";

  useGSAP(
    () => {
      if (reduced) {
        gsap.from(rootRef.current, { opacity: 0, duration: 0.3 });
        return;
      }
      const tl = gsap
        .timeline()
        .from(rootRef.current, { opacity: 0, duration: 0.2 })
        .from(
          "[data-word]",
          {
            yPercent: 140,
            rotation: 12,
            scale: tier === 1 ? 1.6 : 3,
            opacity: 0,
            stagger: 0.12,
            duration: 0.8,
            ease: "back.out(2)",
          },
          headlineDelay,
        )
        .from(
          "[data-detail]",
          { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 },
          headlineDelay + 0.5,
        )
        .to(
          "[data-word]",
          {
            textShadow: legendary ? GOLD_GLOW : HEADLINE_GLOW[theme],
            repeat: tier === 1 ? 1 : 3,
            yoyo: true,
            duration: 0.15,
          },
          headlineDelay + 0.8,
        );
      if (legendary) {
        tl.from(
          "[data-badge]",
          {
            scale: 0,
            rotation: -20,
            opacity: 0,
            duration: 0.6,
            ease: "back.out(3)",
          },
          headlineDelay + 0.3,
        ).to(
          "[data-shake]",
          {
            keyframes: { x: [0, -22, 18, -14, 9, -4, 0], y: [0, 8, -6, 4, 0] },
            duration: 0.55,
            ease: "power1.inOut",
          },
          headlineDelay + 0.35,
        );
      }
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      role="status"
      data-testid={occasion === "order" ? "order-launched" : "cart-celebration"}
      data-theme={theme}
      data-tier={tier}
      onClick={onDismiss}
      className={`fixed inset-0 z-[9400] flex flex-col items-center justify-center overflow-hidden bg-void/85 backdrop-blur-md ${onDismiss ? "cursor-pointer" : ""}`}
    >
      <Stage tier={tier} reduced={reduced} imageUrl={imageUrl} />
      <div data-shake className="relative flex flex-col items-center">
        {legendary && (
          <span
            data-badge
            className="mb-6 rounded-full border-2 border-[#ffd700] bg-[#ffd700]/15 px-5 py-2 font-display text-xs font-black tracking-[0.4em] text-[#ffd700] uppercase shadow-[0_0_30px_#ffd70088]"
          >
            ★ Legendary {occasion === "order" ? "order" : "haul"} ★
          </span>
        )}
        <h2 className="text-center font-display text-[clamp(3rem,12vw,10rem)] leading-[0.85] font-black tracking-tighter">
          <span data-word className="block text-white">
            {headline[0]}
          </span>
          <span
            data-word
            className={`block ${legendary ? "text-gradient-gold" : "text-gradient"}`}
          >
            {headline[1]}
          </span>
        </h2>
        {showTotal && (
          <p
            data-detail
            className="mt-6 font-display text-4xl font-black text-[#ffd700] md:text-6xl"
          >
            {reduced ? (
              formatPrice(total)
            ) : (
              <CountUp
                value={total}
                decimals={2}
                prefix="$"
                durationSec={legendary ? 1.8 : 1.2}
                delaySec={headlineDelay + 0.5}
              />
            )}
          </p>
        )}
        <p
          data-detail
          className="mt-8 font-display text-sm tracking-[0.5em] text-neon-lime uppercase"
        >
          {label} {caption}
        </p>
      </div>
    </div>
  );
}
