import { useEffect } from "react";
import type { RefObject } from "react";
import { gsap, isFinePointer } from "./gsap";

/** Pull an element towards the cursor while hovered; spring back on leave. */
export function useMagnetic(
  ref: RefObject<HTMLElement>,
  strength = 0.35,
  enabled = true,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || !isFinePointer()) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      xTo((e.clientX - (rect.left + rect.width / 2)) * strength);
      yTo((e.clientY - (rect.top + rect.height / 2)) * strength);
    };
    const onLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.9,
        ease: "elastic.out(1.1, 0.35)",
      });
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(el);
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [ref, strength, enabled]);
}
