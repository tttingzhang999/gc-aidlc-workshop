import { useRef } from "react";
import { gsap, useGSAP } from "../fx/gsap";

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  className?: string;
  durationSec?: number;
  delaySec?: number;
}

/** Counts from 0 to `value`; writes to the DOM directly to avoid re-renders per frame. */
export default function CountUp({
  value,
  decimals = 0,
  prefix = "",
  className,
  durationSec = 2,
  delaySec = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const counter = { v: 0 };
      gsap.to(counter, {
        v: value,
        duration: durationSec,
        delay: delaySec,
        ease: "expo.out",
        onUpdate: () => {
          el.textContent = `${prefix}${counter.v.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })}`;
        },
      });
    },
    { dependencies: [value, decimals, prefix, durationSec, delaySec] },
  );

  return (
    <span ref={ref} className={className}>
      {prefix}0
    </span>
  );
}
