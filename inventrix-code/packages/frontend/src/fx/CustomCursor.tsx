import { useEffect, useRef, useState } from "react";
import { gsap, isFinePointer } from "./gsap";

const INTERACTIVE = 'a, button, select, [data-cursor], [role="button"], label';
const TRAIL_COUNT = 6;
const TRAIL_COLORS = [
  "#ff2bd6",
  "#c13bff",
  "#8b5cf6",
  "#4a8bff",
  "#00f0ff",
  "#b6ff00",
];

/** Glowing dot + ring cursor with a comet trail. Not rendered on touch devices. */
export default function CustomCursor() {
  const [enabled] = useState(isFinePointer);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!enabled || !dot || !ring) return;
    document.documentElement.classList.add("has-custom-cursor");

    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power3.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power3.out" });
    const ringX = gsap.quickTo(ring, "x", {
      duration: 0.35,
      ease: "power3.out",
    });
    const ringY = gsap.quickTo(ring, "y", {
      duration: 0.35,
      ease: "power3.out",
    });
    const trail = trailRefs.current
      .filter((el): el is HTMLDivElement => el !== null)
      .map((el, i) => ({
        x: gsap.quickTo(el, "x", {
          duration: 0.15 + i * 0.07,
          ease: "power3.out",
        }),
        y: gsap.quickTo(el, "y", {
          duration: 0.15 + i * 0.07,
          ease: "power3.out",
        }),
      }));

    let hovering = false;
    const onMove = (e: MouseEvent) => {
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
      trail.forEach((t) => {
        t.x(e.clientX);
        t.y(e.clientY);
      });
      const target =
        e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      const nextHover = target !== null;
      if (nextHover !== hovering) {
        hovering = nextHover;
        gsap.to(ring, {
          scale: hovering ? 2.4 : 1,
          borderRadius: hovering ? "30%" : "50%",
          rotation: hovering ? 45 : 0,
          backgroundColor: hovering ? "#ff2bd622" : "#00000000",
          duration: 0.4,
          ease: "back.out(2)",
        });
      }
    };
    const onDown = () =>
      gsap.to(ring, { scaleX: 0.6, scaleY: 1.4, duration: 0.15 });
    const onUp = () =>
      gsap.to(ring, {
        scaleX: hovering ? 2.4 : 1,
        scaleY: hovering ? 2.4 : 1,
        duration: 0.6,
        ease: "elastic.out(1, 0.3)",
      });
    const onLeaveWindow = () =>
      gsap.to([dot, ring], { opacity: 0, duration: 0.2 });
    const onEnterWindow = () =>
      gsap.to([dot, ring], { opacity: 1, duration: 0.2 });

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeaveWindow);
    document.addEventListener("mouseenter", onEnterWindow);
    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeaveWindow);
      document.removeEventListener("mouseenter", onEnterWindow);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[10001]"
    >
      {TRAIL_COLORS.slice(0, TRAIL_COUNT).map((color, i) => (
        <div
          key={color}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="absolute top-0 left-0 rounded-full mix-blend-screen"
          style={{
            width: 10 - i,
            height: 10 - i,
            marginLeft: -(10 - i) / 2,
            marginTop: -(10 - i) / 2,
            background: color,
            boxShadow: `0 0 12px ${color}`,
            opacity: 0.8 - i * 0.1,
          }}
        />
      ))}
      <div
        ref={ringRef}
        className="absolute top-0 left-0 -mt-5 -ml-5 h-10 w-10 rounded-full border-2 border-neon-cyan shadow-neon-cyan"
      />
      <div
        ref={dotRef}
        className="absolute top-0 left-0 -mt-1 -ml-1 h-2 w-2 rounded-full bg-white shadow-neon-pink"
      />
    </div>
  );
}
