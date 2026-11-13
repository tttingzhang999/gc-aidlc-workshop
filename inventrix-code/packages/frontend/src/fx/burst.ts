import { gsap, NEON_COLORS } from "./gsap";

interface BurstOptions {
  count?: number;
  colors?: readonly string[];
  spread?: number;
  size?: number;
}

/**
 * Explode particles plus a shockwave ring out of a viewport point. Everything
 * is a throwaway fixed-position DOM node removed when the timeline ends.
 */
export function burst(x: number, y: number, options: BurstOptions = {}): void {
  const { count = 18, colors = NEON_COLORS, spread = 140, size = 8 } = options;
  const layer = document.createElement("div");
  layer.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;z-index:9999;`;
  document.body.appendChild(layer);

  const ring = document.createElement("div");
  ring.style.cssText = `position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:9999px;border:3px solid ${colors[0]};box-shadow:0 0 24px ${colors[0]};`;
  layer.appendChild(ring);

  const particles = Array.from({ length: count }, (_, i) => {
    const p = document.createElement("div");
    const color = colors[i % colors.length];
    const s = size * (0.5 + Math.random());
    const radius = i % 3 === 0 ? "2px" : "9999px";
    p.style.cssText = `position:absolute;left:${-s / 2}px;top:${-s / 2}px;width:${s}px;height:${s}px;border-radius:${radius};background:${color};box-shadow:0 0 12px ${color};`;
    layer.appendChild(p);
    return p;
  });

  const tl = gsap.timeline({ onComplete: () => layer.remove() });
  tl.fromTo(
    ring,
    { scale: 0.1, opacity: 1 },
    { scale: 4, opacity: 0, duration: 0.7, ease: "expo.out" },
    0,
  );
  particles.forEach((p) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = spread * (0.4 + Math.random());
    tl.to(
      p,
      {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance + 40,
        rotation: gsap.utils.random(-360, 360),
        scale: 0,
        opacity: 0,
        duration: gsap.utils.random(0.6, 1.1),
        ease: "power4.out",
      },
      0,
    );
  });
}

/** Burst from the centre of an element, scaled to its size. */
export function burstFromElement(
  el: Element,
  options: BurstOptions = {},
): void {
  const rect = el.getBoundingClientRect();
  const spread = Math.max(rect.width, rect.height) * 0.8;
  burst(rect.left + rect.width / 2, rect.top + rect.height / 2, {
    count: 46,
    spread,
    size: 12,
    ...options,
  });
}
