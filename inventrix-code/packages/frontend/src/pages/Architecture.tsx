import { useRef, useState } from "react";
import type { ReactNode } from "react";
import PageHeading from "../components/PageHeading";
import ArchitectureDiagram from "../components/architecture/ArchitectureDiagram";
import NodeDetail from "../components/architecture/NodeDetail";
import { gsap, prefersReducedMotion, useGSAP } from "../fx/gsap";
import Card from "../ui/Card";
import CountUp from "../ui/CountUp";
import LinkButton from "../ui/LinkButton";
import {
  ACCENT_HEX,
  EDGE_BY_ID,
  FLOWS,
  NODES,
  NODE_BY_ID,
} from "../lib/architecture";
import type { NodeId } from "../lib/architecture";

const BLUEPRINT_SRC = "/diagrams/inventrix-serverless.png";

const STATS = [
  { value: NODES.length - 1, label: "AWS building blocks" },
  { value: 5, label: "WAF rules at the edge" },
  { value: 2, label: "Bedrock models" },
  { value: 0, label: "servers to patch" },
];

const TRADE_OFFS = [
  {
    title: "The API endpoint is also public",
    body: "The execute-api URL can be called without CloudFront, which skips WAF. Protected routes still require a Cognito token, and the support agent's tool calls take this path on purpose to avoid a deploy-time dependency cycle.",
  },
  {
    title: "Inference can leave us-east-1",
    body: "Every resource lives in us-east-1, but the us. inference profile may run Claude Haiku in us-east-2 or us-west-2 to find capacity.",
  },
  {
    title: "The database naps",
    body: "Aurora scales to 0 ACU after 30 idle minutes. The first request after a pause waits while it resumes; the Data API client retries for up to 25 seconds.",
  },
  {
    title: "One writer, no replica",
    body: "A single Aurora writer keeps the workshop cheap. There is no reader instance, so if the writer fails, requests wait until Aurora replaces it.",
  },
];

export default function Architecture() {
  const [selected, setSelected] = useState<NodeId>("cloudfront");
  const [flowId, setFlowId] = useState<string | null>(FLOWS[0].id);
  const pageRef = useRef<HTMLDivElement>(null);
  const flow = FLOWS.find((f) => f.id === flowId) ?? null;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".arch-stat", {
        y: 60,
        opacity: 0,
        stagger: 0.1,
        ease: "back.out(2)",
      });
      gsap.from(".arch-tradeoff", {
        y: 80,
        rotate: (i: number) => (i % 2 ? 6 : -6),
        opacity: 0,
        stagger: 0.12,
        scrollTrigger: { trigger: ".arch-tradeoffs", start: "top 85%" },
      });
      gsap.from(".arch-blueprint", {
        clipPath: "inset(0 100% 0 0 round 2rem)",
        rotate: -2,
        duration: 1.2,
        ease: "expo.out",
        clearProps: "clipPath,rotate",
        scrollTrigger: { trigger: ".arch-blueprint-section", start: "top 80%" },
      });
    },
    { scope: pageRef },
  );

  return (
    <div
      ref={pageRef}
      className="flex flex-col gap-10"
      data-testid="architecture-page"
    >
      <PageHeading kicker="AWS architecture" title="SYSTEM MAP" />
      <p className="max-w-3xl text-lg text-white/70">
        Inventrix runs entirely on managed AWS services in us-east-1, defined in
        one CDK stack. Pick a request below to watch it travel through the
        system, or tap any box to see how it is configured.
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((stat, i) => (
          <Card
            key={stat.label}
            className="arch-stat text-center"
            glow={i % 2 ? "cyan" : "pink"}
          >
            <CountUp
              value={stat.value}
              className="font-display text-5xl font-black text-gradient"
              delaySec={0.2 + i * 0.1}
            />
            <p className="mt-2 text-xs font-bold tracking-[0.2em] text-white/60 uppercase">
              {stat.label}
            </p>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-5" aria-labelledby="arch-flows">
        <div className="flex flex-col gap-3">
          <h2
            id="arch-flows"
            className="font-display text-xs font-bold tracking-[0.5em] text-neon-lime uppercase"
          >
            Follow a request
          </h2>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Request flows"
          >
            {FLOWS.map((f) => (
              <FlowChip
                key={f.id}
                active={f.id === flowId}
                onClick={() => setFlowId(f.id)}
                testId={`arch-flow-${f.id}`}
              >
                <span aria-hidden>{f.icon}</span> {f.label}
              </FlowChip>
            ))}
            <FlowChip
              active={flowId === null}
              onClick={() => setFlowId(null)}
              testId="arch-flow-all"
            >
              <span aria-hidden>✨</span> Show everything
            </FlowChip>
          </div>
        </div>

        <ArchitectureDiagram
          selected={selected}
          flow={flow}
          onSelect={setSelected}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <Card className="flex flex-col gap-4" data-testid="arch-flow-steps">
            {flow ? (
              <>
                <h3 className="font-display text-2xl font-black text-white">
                  {flow.icon} {flow.label}
                </h3>
                <p className="text-white/70">{flow.description}</p>
                <ol className="flex flex-col gap-2">
                  {flow.edges.map((edgeId, i) => {
                    const edge = EDGE_BY_ID[edgeId];
                    const from = NODE_BY_ID[edge.from];
                    const to = NODE_BY_ID[edge.to];
                    return (
                      <li key={edgeId}>
                        <button
                          type="button"
                          onClick={() => setSelected(edge.to)}
                          className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-left text-sm transition hover:bg-white/10"
                        >
                          <span
                            className="grid size-7 shrink-0 place-items-center rounded-full font-display text-xs font-black text-void"
                            style={{ background: ACCENT_HEX[to.accent] }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-white/85">
                            {from.title}{" "}
                            <span className="text-white/40">→</span> {to.title}
                          </span>
                          <span className="ml-auto font-mono text-xs text-white/45">
                            {edge.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <>
                <h3 className="font-display text-2xl font-black text-white">
                  ✨ The whole map
                </h3>
                <p className="text-white/70">
                  {NODES.length} boxes and every connection between them. The
                  browser only ever talks to CloudFront; everything behind it is
                  private or protected by IAM and Cognito.
                </p>
              </>
            )}
          </Card>
          <NodeDetail node={NODE_BY_ID[selected]} />
        </div>
      </section>

      <section
        className="arch-blueprint-section flex flex-col gap-5"
        aria-labelledby="arch-blueprint"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2
            id="arch-blueprint"
            className="font-display text-xs font-bold tracking-[0.5em] text-neon-cyan uppercase"
          >
            The blueprint
          </h2>
          <p className="text-sm text-white/50">
            The same diagram as the README, drawn with official AWS icons.
          </p>
        </div>
        <a
          href={BLUEPRINT_SRC}
          target="_blank"
          rel="noreferrer"
          className="arch-blueprint group block rounded-[var(--radius-blob)] bg-gradient-to-br from-neon-pink via-neon-violet to-neon-cyan p-[2px] shadow-neon-cyan transition-transform duration-500 hover:-rotate-1 hover:scale-[1.01]"
          data-testid="arch-blueprint"
        >
          <div className="relative overflow-hidden rounded-[calc(var(--radius-blob)-2px)] bg-white p-2 md:p-4">
            <img
              src={BLUEPRINT_SRC}
              alt="Inventrix serverless architecture diagram: browser to CloudFront with WAF, S3 buckets, API Gateway with Cognito, Lambda, Aurora, Secrets Manager, Bedrock and the AgentCore support agent"
              loading="lazy"
              width={2165}
              height={1283}
              className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <span className="absolute right-4 bottom-4 rounded-full bg-void/85 px-4 py-2 text-xs font-bold tracking-widest text-white uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              Open full size ↗
            </span>
          </div>
        </a>
      </section>

      <section
        className="arch-tradeoffs flex flex-col gap-5"
        aria-labelledby="arch-tradeoffs"
      >
        <h2
          id="arch-tradeoffs"
          className="font-display text-xs font-bold tracking-[0.5em] text-neon-pink uppercase"
        >
          Trade-offs we accepted
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {TRADE_OFFS.map((t) => (
            <Card key={t.title} className="arch-tradeoff" glow="lime">
              <h3 className="font-display text-lg font-bold text-white">
                {t.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                {t.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <LinkButton to="/" variant="primary" testId="arch-back-to-store">
          🛍️ Back to the store
        </LinkButton>
        <p className="font-mono text-xs text-white/40">
          Source of truth: infra/lib/inventrix-stack.ts
        </p>
      </div>
    </div>
  );
}

interface FlowChipProps {
  active: boolean;
  onClick: () => void;
  testId: string;
  children: ReactNode;
}

function FlowChip({ active, onClick, testId, children }: FlowChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
        active
          ? "scale-105 border-neon-cyan bg-neon-cyan/15 text-white shadow-neon-cyan"
          : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
