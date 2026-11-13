import { forwardRef, useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { gsap, useGSAP } from "../fx/gsap";
import TextScramble from "../fx/TextScramble";

interface AuthShellProps {
  kicker: string;
  headline: string;
  subline: string;
  children: ReactNode;
}

/** Split screen: animated neon orbit on one side, the form card on the other. */
const AuthShell = forwardRef<HTMLDivElement, AuthShellProps>(function AuthShell(
  { kicker, headline, subline, children },
  cardRef,
) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.to("[data-orbit]", {
        rotation: 360,
        duration: (i: number) => 14 + i * 6,
        repeat: -1,
        ease: "none",
      });
      gsap.to("[data-planet]", {
        y: -24,
        duration: 2.4,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.from("[data-auth-card]", {
        x: 160,
        rotationY: -40,
        opacity: 0,
        duration: 1.1,
        ease: "expo.out",
      });
      gsap.from("[data-auth-copy]", {
        y: 60,
        opacity: 0,
        stagger: 0.12,
        duration: 1,
        delay: 0.2,
      });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="grid min-h-screen lg:grid-cols-2">
      <section className="relative flex flex-col justify-between overflow-hidden p-8 md:p-12">
        <Link
          to="/"
          data-testid="auth-home"
          className="font-display text-xl font-black tracking-tighter text-gradient"
        >
          ← INVENTRIX
        </Link>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2"
        >
          <div
            data-orbit
            className="absolute inset-0 rounded-full border-2 border-dashed border-neon-pink/50"
          >
            <span className="absolute -top-2 left-1/2 h-4 w-4 rounded-full bg-neon-pink shadow-neon-pink" />
          </div>
          <div
            data-orbit
            className="absolute inset-16 rounded-full border-2 border-neon-cyan/40"
          >
            <span className="absolute top-1/2 -right-2 h-3 w-3 rounded-full bg-neon-cyan shadow-neon-cyan" />
          </div>
          <div
            data-orbit
            className="absolute inset-32 rounded-full border border-neon-lime/40"
          >
            <span className="absolute -bottom-2 left-1/3 h-3 w-3 rounded-full bg-neon-lime shadow-neon-lime" />
          </div>
          <div
            data-planet
            className="absolute inset-[13rem] rounded-full bg-gradient-to-br from-neon-pink via-neon-violet to-neon-cyan shadow-neon-pink"
          />
        </div>
        <div className="relative">
          <p
            data-auth-copy
            className="font-display text-xs font-bold tracking-[0.5em] text-neon-lime uppercase"
          >
            {kicker}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.6rem,7vw,6rem)] leading-[0.85] font-black tracking-tighter">
            <TextScramble text={headline} />
          </h1>
          <p data-auth-copy className="mt-4 max-w-sm text-white/60">
            {subline}
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6 [perspective:1200px] md:p-12">
        <div
          ref={cardRef}
          data-auth-card
          className="glass w-full max-w-md rounded-[var(--radius-blob)] p-8 md:p-10"
        >
          {children}
        </div>
      </section>
    </div>
  );
});

export default AuthShell;
