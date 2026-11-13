import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: "pink" | "cyan" | "lime" | "none";
}

const GLOWS: Record<NonNullable<CardProps["glow"]>, string> = {
  pink: "hover:shadow-neon-pink hover:border-neon-pink/60",
  cyan: "hover:shadow-neon-cyan hover:border-neon-cyan/60",
  lime: "hover:shadow-neon-lime hover:border-neon-lime/60",
  none: "",
};

/** Frosted-glass panel. forwardRef so pages can shake / flash / tilt it. */
const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { glow = "none", className = "", ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`glass rounded-[var(--radius-blob)] p-6 transition-[box-shadow,border-color] duration-300 ${GLOWS[glow]} ${className}`}
      {...rest}
    />
  );
});

export default Card;
