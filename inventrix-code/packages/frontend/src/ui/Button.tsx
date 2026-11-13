import { useRef } from "react";
import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { burst } from "../fx/burst";
import { useMagnetic } from "../fx/useMagnetic";
import Spinner from "./Spinner";
import { BURST_COLORS, buttonClasses } from "./buttonStyles";
import type { ButtonSize, ButtonVariant } from "./buttonStyles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  magnetic?: boolean;
}

/**
 * Magnetic neon button. Every click explodes particles from the pointer;
 * while `loading` it shows a charging bar and is disabled so a form cannot be
 * submitted twice.
 */
export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  magnetic = true,
  className = "",
  disabled,
  onClick,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useMagnetic(ref, 0.3, magnetic);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const x =
      e.clientX ||
      e.currentTarget.getBoundingClientRect().left +
        e.currentTarget.offsetWidth / 2;
    const y =
      e.clientY ||
      e.currentTarget.getBoundingClientRect().top +
        e.currentTarget.offsetHeight / 2;
    burst(x, y, { colors: BURST_COLORS[variant] });
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={handleClick}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-charge bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />
      )}
      {loading && <Spinner />}
      <span className="relative">
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  );
}
