import { burstFromElement } from "./burst";
import { gsap } from "./gsap";

/** Burst an element into particles, then shrink it away; resolves when finished. */
export function explodeOut(el: Element | null): Promise<void> {
  if (!el) return Promise.resolve();
  burstFromElement(el);
  return new Promise((resolve) => {
    gsap.to(el, {
      scale: 0,
      rotation: 25,
      opacity: 0,
      filter: "blur(12px)",
      duration: 0.55,
      ease: "back.in(2)",
      onComplete: () => resolve(),
    });
  });
}
