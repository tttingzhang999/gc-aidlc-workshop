import { useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import {
  FIELD_BASE,
  FIELD_ERROR,
  FIELD_WRAPPER,
  FLOATING_LABEL,
  fieldBorder,
} from "./fieldStyles";

interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "placeholder"
> {
  label: string;
  error?: string;
}

export default function TextArea({
  label,
  error,
  id,
  className = "",
  rows = 4,
  ...rest
}: TextAreaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={`${FIELD_WRAPPER} ${className}`}>
      <textarea
        id={fieldId}
        rows={rows}
        placeholder=" "
        aria-invalid={Boolean(error)}
        className={`${FIELD_BASE} ${fieldBorder(Boolean(error))} resize-y`}
        {...rest}
      />
      <label htmlFor={fieldId} className={FLOATING_LABEL}>
        {label}
      </label>
      {error && <span className={FIELD_ERROR}>{error}</span>}
    </div>
  );
}
