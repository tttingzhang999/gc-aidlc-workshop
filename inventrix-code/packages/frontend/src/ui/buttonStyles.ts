export type ButtonVariant = "primary" | "ghost" | "danger" | "lime";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-full font-display font-bold uppercase tracking-wider transition-[filter,opacity,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neon-cyan/60 disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-neon-pink via-neon-violet to-neon-cyan text-white shadow-neon-pink hover:brightness-125 hover:shadow-neon-cyan",
  ghost:
    "glass text-white hover:border-neon-cyan hover:text-neon-cyan hover:shadow-neon-cyan",
  danger: "bg-neon-red text-white shadow-neon-red hover:brightness-125",
  lime: "bg-neon-lime text-void shadow-neon-lime hover:brightness-110",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[0.65rem]",
  md: "px-6 py-3 text-xs",
  lg: "px-9 py-5 text-sm md:text-base",
};

export const BURST_COLORS: Record<ButtonVariant, readonly string[]> = {
  primary: ["#ff2bd6", "#8b5cf6", "#00f0ff"],
  ghost: ["#00f0ff", "#ffffff", "#8b5cf6"],
  danger: ["#ff2d55", "#ff7a00", "#ffffff"],
  lime: ["#b6ff00", "#00f0ff", "#ffffff"],
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`.trim();
}
