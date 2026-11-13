interface SummonCircleProps {
  label?: string;
}

/** Spinning occult-neon rings shown while an image is being generated. */
export default function SummonCircle({
  label = "Summoning…",
}: SummonCircleProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-4 py-6"
      data-testid="summon-circle"
    >
      <svg
        viewBox="0 0 200 200"
        className="h-40 w-40 drop-shadow-[0_0_18px_#ff2bd6]"
      >
        <g
          className="origin-center animate-spin-slow"
          style={{ transformBox: "fill-box" }}
        >
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#ff2bd6"
            strokeWidth="2"
            strokeDasharray="6 10"
          />
          <polygon
            points="100,18 171,141 29,141"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="2"
          />
          <polygon
            points="100,182 29,59 171,59"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="2"
          />
        </g>
        <g
          className="origin-center animate-spin-reverse"
          style={{ transformBox: "fill-box" }}
        >
          <circle
            cx="100"
            cy="100"
            r="60"
            fill="none"
            stroke="#b6ff00"
            strokeWidth="3"
            strokeDasharray="40 14"
          />
          <circle
            cx="100"
            cy="100"
            r="34"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
          />
        </g>
        <circle
          cx="100"
          cy="100"
          r="10"
          fill="#ff2bd6"
          className="animate-pulse"
        />
      </svg>
      <span className="font-display text-xs font-bold uppercase tracking-[0.4em] text-neon-lime animate-pulse">
        {label}
      </span>
    </div>
  );
}
