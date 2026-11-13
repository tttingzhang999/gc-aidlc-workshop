export const FIELD_WRAPPER = "relative block";

export const FIELD_BASE =
  "peer w-full rounded-2xl border-2 bg-white/5 px-4 pt-6 pb-2 text-base text-white outline-none backdrop-blur-md transition-[border-color,box-shadow] duration-200 placeholder-transparent focus:bg-white/10";

export function fieldBorder(hasError: boolean): string {
  return hasError
    ? "border-neon-red shadow-neon-red"
    : "border-white/15 hover:border-white/30 focus:border-neon-cyan focus:shadow-neon-cyan";
}

/** Floating label: sits inside the field when empty, flies up on focus / value. */
export const FLOATING_LABEL =
  "pointer-events-none absolute top-2 left-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-neon-cyan transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium peer-placeholder-shown:tracking-normal peer-placeholder-shown:normal-case peer-placeholder-shown:text-white/50 peer-focus:top-2 peer-focus:text-[0.65rem] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-[0.2em] peer-focus:text-neon-pink";

export const FIELD_ERROR = "mt-1.5 block text-sm font-medium text-neon-red";
export const FIELD_HINT = "mt-1.5 block text-xs text-white/50";
