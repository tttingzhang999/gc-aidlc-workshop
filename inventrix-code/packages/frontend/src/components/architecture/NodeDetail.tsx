import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "../../fx/gsap";
import Card from "../../ui/Card";
import { ACCENT_HEX } from "../../lib/architecture";
import type { ArchNode } from "../../lib/architecture";

interface NodeDetailProps {
  node: ArchNode;
}

export default function NodeDetail({ node }: NodeDetailProps) {
  const ref = useRef<HTMLDivElement>(null);
  const color = ACCENT_HEX[node.accent];

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        ref.current,
        { rotateY: -70, opacity: 0, x: 40 },
        { rotateY: 0, opacity: 1, x: 0, duration: 0.6, ease: "back.out(1.6)" },
      );
      gsap.from(".detail-fact", {
        x: 30,
        opacity: 0,
        stagger: 0.07,
        delay: 0.2,
        duration: 0.45,
      });
    },
    { scope: ref, dependencies: [node.id], revertOnUpdate: true },
  );

  return (
    <div className="[perspective:1200px]">
      <Card
        ref={ref}
        className="flex flex-col gap-4"
        style={{ borderColor: `${color}80`, boxShadow: `0 0 32px ${color}33` }}
        aria-live="polite"
        data-testid="arch-detail"
      >
        <div className="flex items-center gap-4">
          <span
            className="grid size-16 shrink-0 place-items-center rounded-2xl text-4xl"
            style={{
              background: `${color}22`,
              boxShadow: `inset 0 0 0 1px ${color}66`,
            }}
            aria-hidden
          >
            {node.icon}
          </span>
          <div>
            <h3 className="font-display text-2xl font-black tracking-tight text-white">
              {node.title}
            </h3>
            <p className="text-sm font-semibold" style={{ color }}>
              {node.service}
            </p>
          </div>
        </div>
        <p className="leading-relaxed text-white/75">{node.summary}</p>
        <ul className="flex flex-col gap-2">
          {node.facts.map((fact) => (
            <li
              key={fact}
              className="detail-fact flex gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/85"
            >
              <span style={{ color }} aria-hidden>
                ▸
              </span>
              {fact}
            </li>
          ))}
        </ul>
        <p className="font-mono text-xs break-all text-white/40">
          ↳ {node.source}
        </p>
      </Card>
    </div>
  );
}
