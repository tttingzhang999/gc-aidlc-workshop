import { useRef } from "react";
import { gsap, useGSAP } from "../fx/gsap";
import Button from "../ui/Button";

// One of these pops up at random when the player loses a game.
export const TAUNTS = [
  "殺仁諸勳",
  "日久見仁勳",
  "公道自在仁勳",
  "知仁知面不知勳",
  "黃仁之勳不可無",
] as const;

export const randomTaunt = (): string =>
  TAUNTS[Math.floor(Math.random() * TAUNTS.length)];

export default function TauntDialog({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.from("[data-backdrop]", { opacity: 0, duration: 0.25 });
      gsap.from("[data-taunt]", {
        scale: 0.2,
        rotation: -12,
        opacity: 0,
        duration: 0.7,
        ease: "back.out(2.5)",
      });
    },
    { scope: rootRef },
  );
  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={text}
      data-testid="taunt-dialog"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
    >
      <div
        data-backdrop
        onClick={onClose}
        className="absolute inset-0 bg-void/85 backdrop-blur-sm"
      />
      <div
        data-taunt
        className="glass relative flex flex-col items-center gap-8 rounded-[var(--radius-blob)] border-neon-red/70 px-8 py-12 shadow-neon-red md:px-16"
      >
        <p className="font-display text-5xl leading-tight font-black tracking-tight text-neon-red text-glow md:text-7xl">
          {text}
        </p>
        <Button autoFocus variant="danger" onClick={onClose}>
          OK
        </Button>
      </div>
    </div>
  );
}
