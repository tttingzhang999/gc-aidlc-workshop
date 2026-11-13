import { gsap } from "./gsap";

/** Violent horizontal shake with a red neon flash. */
export function shake(el: Element | null): void {
  if (!el) return;
  gsap
    .timeline()
    .to(el, {
      keyframes: {
        x: [0, -28, 24, -20, 16, -10, 6, -2, 0],
        rotation: [0, -2, 2, -1.5, 1, 0],
      },
      duration: 0.65,
      ease: "power1.inOut",
    })
    .fromTo(
      el,
      { boxShadow: "0 0 0 3px #ff2d55, 0 0 90px 10px #ff2d55aa" },
      {
        boxShadow: "0 0 0 0px #ff2d5500, 0 0 0px 0px #ff2d5500",
        duration: 1,
        clearProps: "boxShadow",
      },
      0,
    );
}

/** Pulsing highlight flash used to point at something (e.g. the edit form). */
export function flash(el: Element | null, color = "#00f0ff"): void {
  if (!el) return;
  gsap.fromTo(
    el,
    { boxShadow: `0 0 0 3px ${color}, 0 0 80px 8px ${color}` },
    {
      boxShadow: `0 0 0 0px ${color}00, 0 0 0px 0px ${color}00`,
      duration: 1.2,
      repeat: 1,
      clearProps: "boxShadow",
    },
  );
}
