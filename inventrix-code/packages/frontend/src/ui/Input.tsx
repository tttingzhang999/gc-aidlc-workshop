import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import {
  FIELD_BASE,
  FIELD_ERROR,
  FIELD_HINT,
  FIELD_WRAPPER,
  FLOATING_LABEL,
  fieldBorder,
} from "./fieldStyles";

interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "placeholder"
> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export default function Input({
  label,
  error,
  hint,
  id,
  className = "",
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-msg`;
  return (
    <div className={`${FIELD_WRAPPER} ${className}`}>
      <input
        id={inputId}
        placeholder=" "
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={`${FIELD_BASE} ${fieldBorder(Boolean(error))}`}
        {...rest}
      />
      <label htmlFor={inputId} className={FLOATING_LABEL}>
        {label}
      </label>
      {error ? (
        <span id={messageId} className={FIELD_ERROR}>
          {error}
        </span>
      ) : (
        hint && (
          <span id={messageId} className={FIELD_HINT}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
