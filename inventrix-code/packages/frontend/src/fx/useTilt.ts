import { useEffect } from "react";
import type { RefObject } from "react";
import { gsap, isFinePointer } from "./gsap";

/**
 * 3D tilt toward the cursor. Also writes `--glare-x` / `--glare-y` (percent)
 * on the element so a child overlay can render a moving specular glare.
 */
export function useTilt(ref: RefObject<HTMLElement>, maxDeg = 14): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !isFinePointer()) return;
    gsap.set(el, { transformPerspective: 900, transformStyle: "preserve-3d" });

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      gsap.to(el, {
        rotationY: (px - 0.5) * maxDeg * 2,
        rotationX: (0.5 - py) * maxDeg * 2,
        scale: 1.04,
        duration: 0.5,
        ease: "power2.out",
      });
      el.style.setProperty("--glare-x", `${px * 100}%`);
      el.style.setProperty("--glare-y", `${py * 100}%`);
    };
    const onLeave = () => {
      gsap.to(el, {
        rotationX: 0,
        rotationY: 0,
        scale: 1,
        duration: 1,
        ease: "elastic.out(1, 0.4)",
      });
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [ref, maxDeg]);
}
