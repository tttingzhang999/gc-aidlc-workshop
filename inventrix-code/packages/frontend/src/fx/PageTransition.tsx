import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { gsap } from "./gsap";

const PANEL_COLORS = [
  "bg-neon-pink",
  "bg-neon-violet",
  "bg-neon-cyan",
  "bg-neon-lime",
];

/** On every route change, neon panels sweep across the full screen. */
export default function PageTransition() {
  const { pathname } = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);

  useEffect(() => {
    // Compare against the last path so StrictMode's double effect run on
    // mount does not fire a sweep on the initial page load.
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    window.scrollTo(0, 0);
    const root = rootRef.current;
    if (!root) return;
    const panels = root.querySelectorAll("[data-panel]");
    const label = root.querySelector("[data-label]");
    const tl = gsap.timeline();
    tl.set(root, { autoAlpha: 1 })
      .fromTo(
        panels,
        { scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 0.32, stagger: 0.05, ease: "expo.in" },
      )
      .fromTo(
        label,
        { autoAlpha: 0, scale: 2.5 },
        { autoAlpha: 1, scale: 1, duration: 0.25, ease: "back.out(3)" },
        "-=0.1",
      )
      .to(label, { autoAlpha: 0, scale: 0.4, duration: 0.18 }, "+=0.05")
      .to(panels, {
        scaleX: 0,
        transformOrigin: "right center",
        duration: 0.4,
        stagger: 0.05,
        ease: "expo.out",
      })
      .set(root, { autoAlpha: 0 });
    return () => {
      tl.kill();
      gsap.set(root, { autoAlpha: 0 });
    };
  }, [pathname]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none invisible fixed inset-0 z-[9000] flex flex-col"
    >
      {PANEL_COLORS.map((color) => (
        <div
          key={color}
          data-panel
          className={`flex-1 ${color}`}
          style={{ transform: "scaleX(0)" }}
        />
      ))}
      <div
        data-label
        className="absolute inset-0 flex items-center justify-center font-display text-6xl font-black tracking-tighter text-void opacity-0 md:text-9xl"
      >
        WARP
      </div>
    </div>
  );
}
