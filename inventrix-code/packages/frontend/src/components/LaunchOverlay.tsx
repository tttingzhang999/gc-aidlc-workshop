import { useRef } from "react";
import { gsap, useGSAP } from "../fx/gsap";

interface LaunchOverlayProps {
  orderId: number;
}

/** Full-screen "ORDER LAUNCHED" slam shown after a successful order. */
export default function LaunchOverlay({ orderId }: LaunchOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap
        .timeline()
        .from(rootRef.current, { opacity: 0, duration: 0.2 })
        .from(
          "[data-ring]",
          {
            scale: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 1.2,
            ease: "expo.out",
          },
          0,
        )
        .from(
          "[data-word]",
          {
            yPercent: 140,
            rotation: 12,
            scale: 3,
            opacity: 0,
            stagger: 0.12,
            duration: 0.8,
            ease: "back.out(2)",
          },
          0.1,
        )
        .from(
          "[data-order-id]",
          { opacity: 0, letterSpacing: "2em", duration: 0.6 },
          0.6,
        )
        .to(
          "[data-word]",
          {
            textShadow: "0 0 40px #ff2bd6, 0 0 120px #00f0ff",
            repeat: 3,
            yoyo: true,
            duration: 0.15,
          },
          0.9,
        );
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      role="status"
      data-testid="order-launched"
      className="fixed inset-0 z-[9400] flex flex-col items-center justify-center overflow-hidden bg-void/85 backdrop-blur-md"
    >
      {["border-neon-pink", "border-neon-cyan", "border-neon-lime"].map(
        (color, i) => (
          <div
            key={color}
            data-ring
            aria-hidden="true"
            className={`absolute rounded-full border-4 ${color}`}
            style={{
              width: `${(i + 1) * 40}vmax`,
              height: `${(i + 1) * 40}vmax`,
            }}
          />
        ),
      )}
      <h2 className="relative text-center font-display text-[clamp(3rem,12vw,10rem)] leading-[0.85] font-black tracking-tighter">
        <span data-word className="block text-white">
          ORDER
        </span>
        <span data-word className="block text-gradient">
          LAUNCHED
        </span>
      </h2>
      <p
        data-order-id
        className="relative mt-8 font-display text-sm tracking-[0.5em] text-neon-lime uppercase"
      >
        Order #{orderId} is in orbit
      </p>
    </div>
  );
}
