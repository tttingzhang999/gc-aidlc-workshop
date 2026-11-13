import type { ReactNode } from "react";
import TextScramble from "../fx/TextScramble";

interface PageHeadingProps {
  kicker: string;
  title: string;
  actions?: ReactNode;
}

export default function PageHeading({
  kicker,
  title,
  actions,
}: PageHeadingProps) {
  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="font-display text-xs font-bold tracking-[0.5em] text-neon-lime uppercase">
          {kicker}
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.5rem,8vw,6rem)] leading-[0.9] font-black tracking-tighter text-gradient">
          <TextScramble text={title} durationMs={900} />
        </h1>
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
