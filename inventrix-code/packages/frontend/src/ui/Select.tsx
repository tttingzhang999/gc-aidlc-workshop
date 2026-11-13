import { useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { FIELD_ERROR, fieldBorder } from "./fieldStyles";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly SelectOption[];
  error?: string;
  compact?: boolean;
}

/** Native select (keyboard + mobile friendly) dressed in neon. The label is always floated. */
export default function Select({
  label,
  options,
  error,
  id,
  compact = false,
  className = "",
  ...rest
}: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const padding = compact ? "pt-5 pb-1.5 text-sm" : "pt-6 pb-2 text-base";
  return (
    <div className={`relative block ${className}`}>
      <select
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={`w-full appearance-none rounded-2xl border-2 bg-void-2/80 px-4 pr-10 text-white outline-none backdrop-blur-md transition-[border-color,box-shadow] ${padding} ${fieldBorder(Boolean(error))}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-void-2">
            {option.label}
          </option>
        ))}
      </select>
      <label
        htmlFor={fieldId}
        className="pointer-events-none absolute top-1.5 left-4 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-neon-cyan"
      >
        {label}
      </label>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-neon-pink"
      >
        ▼
      </span>
      {error && <span className={FIELD_ERROR}>{error}</span>}
    </div>
  );
}
