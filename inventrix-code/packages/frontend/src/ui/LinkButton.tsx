import { useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMagnetic } from "../fx/useMagnetic";
import { buttonClasses } from "./buttonStyles";
import type { ButtonSize, ButtonVariant } from "./buttonStyles";

interface LinkButtonProps {
  to: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  testId?: string;
}

/** A router link styled (and magnetised) like a Button: no nested <button>. */
export default function LinkButton({
  to,
  children,
  variant = "ghost",
  size = "md",
  className = "",
  testId,
}: LinkButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  useMagnetic(ref, 0.3);
  return (
    <Link
      ref={ref}
      to={to}
      data-testid={testId}
      className={buttonClasses(variant, size, className)}
    >
      {children}
    </Link>
  );
}
