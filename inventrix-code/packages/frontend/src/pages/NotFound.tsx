import { useRef } from "react";
import { gsap, useGSAP } from "../fx/gsap";
import LinkButton from "../ui/LinkButton";

interface NotFoundProps {
  title?: string;
  message?: string;
}

export default function NotFound({
  title = "LOST IN SPACE",
  message = "This coordinate does not exist. The page drifted out of orbit.",
}: NotFoundProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-404]", {
        scale: 4,
        opacity: 0,
        rotation: -20,
        duration: 1.2,
        ease: "expo.out",
      });
      gsap.from("[data-rise]", {
        y: 60,
        opacity: 0,
        stagger: 0.12,
        delay: 0.4,
      });
      gsap.to("[data-404]", {
        y: -14,
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 1.2,
      });
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      data-testid="not-found"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center"
    >
      <h1
        data-404
        data-text="404"
        className="glitch font-display text-[9rem] leading-none font-black tracking-tighter text-white md:text-[16rem]"
      >
        404
      </h1>
      <h2
        data-rise
        className="font-display text-2xl font-black tracking-tight text-gradient md:text-4xl"
      >
        {title}
      </h2>
      <p data-rise className="max-w-md text-white/60">
        {message}
      </p>
      <div data-rise>
        <LinkButton to="/" variant="primary" size="lg" testId="not-found-home">
          Return to base →
        </LinkButton>
      </div>
    </div>
  );
}
