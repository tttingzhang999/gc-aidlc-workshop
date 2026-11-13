interface QuantityStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function QuantityStepper({
  value,
  min,
  max,
  onChange,
  disabled = false,
}: QuantityStepperProps) {
  const stepButton =
    "flex h-12 w-12 items-center justify-center rounded-full font-display text-2xl font-black transition-transform active:scale-75 disabled:opacity-30";
  return (
    <div
      className="glass inline-flex items-center gap-2 rounded-full p-1.5"
      data-testid="quantity-stepper"
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        data-testid="quantity-decrease"
        className={`${stepButton} bg-white/10 text-neon-pink hover:bg-neon-pink hover:text-void`}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1, min, max))}
      >
        −
      </button>
      <input
        type="number"
        aria-label="Quantity"
        data-testid="quantity-input"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10);
          onChange(Number.isNaN(next) ? min : clamp(next, min, max));
        }}
        className="w-14 bg-transparent text-center font-display text-2xl font-black text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        data-testid="quantity-increase"
        className={`${stepButton} bg-white/10 text-neon-cyan hover:bg-neon-cyan hover:text-void`}
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1, min, max))}
      >
        +
      </button>
    </div>
  );
}
