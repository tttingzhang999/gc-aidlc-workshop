import { useEffect, useState } from "react";

const GLYPHS = "!<>-_\\/[]{}=+*^?#@$%&01ΣΔΩ▓▒░";

interface TextScrambleProps {
  text: string;
  className?: string;
  delayMs?: number;
  durationMs?: number;
}

/** Decodes `text` out of random glyph noise, left to right. */
export default function TextScramble({
  text,
  className,
  delayMs = 0,
  durationMs = 1400,
}: TextScrambleProps) {
  const [display, setDisplay] = useState(() => text.replace(/\S/g, " "));

  useEffect(() => {
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / durationMs);
      const revealed = Math.floor(progress * text.length);
      const next = text
        .split("")
        .map((char, i) => {
          if (char === " " || i < revealed) return char;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [text, delayMs, durationMs]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}
