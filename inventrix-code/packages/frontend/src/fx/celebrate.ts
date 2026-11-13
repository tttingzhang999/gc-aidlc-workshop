import confetti from "canvas-confetti";
import { NEON_COLORS } from "./gsap";

const colors = [...NEON_COLORS];

/** Full-screen confetti storm: centre blast plus two side cannons. */
export function celebrate(durationMs = 1600): void {
  void confetti({
    particleCount: 180,
    spread: 120,
    startVelocity: 55,
    origin: { y: 0.6 },
    colors,
    zIndex: 10000,
  });
  const end = Date.now() + durationMs;
  const frame = () => {
    void confetti({
      particleCount: 6,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors,
      zIndex: 10000,
    });
    void confetti({
      particleCount: 6,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors,
      zIndex: 10000,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
