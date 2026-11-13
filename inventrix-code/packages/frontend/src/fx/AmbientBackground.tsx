import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";

const ORBS = [
  { color: "#ff2bd6", size: 520, top: "-10%", left: "-8%" },
  { color: "#00f0ff", size: 460, top: "40%", left: "70%" },
  { color: "#8b5cf6", size: 620, top: "65%", left: "5%" },
  { color: "#b6ff00", size: 300, top: "10%", left: "55%" },
];

/** Drifting neon orbs, a perspective grid and film grain behind everything. */
export default function AmbientBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>("[data-orb]").forEach((orb, i) => {
        gsap.to(orb, {
          x: () => gsap.utils.random(-260, 260),
          y: () => gsap.utils.random(-200, 200),
          scale: () => gsap.utils.random(0.7, 1.35),
          duration: gsap.utils.random(9, 15),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
          delay: i * 0.6,
        });
      });
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void"
    >
      {ORBS.map((orb) => (
        <div
          key={orb.color}
          data-orb
          className="absolute rounded-full opacity-40 blur-[110px]"
          style={{
            background: orb.color,
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
          }}
        />
      ))}
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      <div className="noise absolute inset-0 opacity-[0.08] mix-blend-overlay" />
    </div>
  );
}
