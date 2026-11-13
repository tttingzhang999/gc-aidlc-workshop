interface MarqueeProps {
  items: readonly string[];
  reverse?: boolean;
  className?: string;
}

/** Infinite horizontal ticker; the item list is rendered twice for a seamless loop. */
export default function Marquee({
  items,
  reverse = false,
  className = "",
}: MarqueeProps) {
  const loop = [...items, ...items];
  return (
    <div
      className={`overflow-hidden whitespace-nowrap ${className}`}
      aria-hidden="true"
    >
      <div
        className={`inline-flex ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`}
      >
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="mx-6 inline-flex items-center gap-6"
          >
            {item}
            <span className="text-neon-pink">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
