import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);
gsap.defaults({ ease: "power3.out", duration: 0.8 });

export const NEON_COLORS = [
  "#ff2bd6",
  "#00f0ff",
  "#b6ff00",
  "#8b5cf6",
  "#ff7a00",
] as const;

export function isFinePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches
  );
}

export { gsap, ScrollTrigger, useGSAP };
