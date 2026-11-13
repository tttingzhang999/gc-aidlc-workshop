import { useMemo, useRef } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "../../fx/gsap";
import { burstFromElement } from "../../fx/burst";
import {
  ACCENT_HEX,
  EDGES,
  EDGE_BY_ID,
  NODES,
  NODE_BY_ID,
  NODE_HEIGHT,
  NODE_WIDTH,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  edgeGeometry,
} from "../../lib/architecture";
import type { ArchFlow, NodeId } from "../../lib/architecture";

interface ArchitectureDiagramProps {
  selected: NodeId;
  flow: ArchFlow | null;
  onSelect: (id: NodeId) => void;
}

const HOP_SECONDS = 0.75;

export default function ArchitectureDiagram({
  selected,
  flow,
  onSelect,
}: ArchitectureDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const packetRef = useRef<SVGGElement>(null);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const pulseRefs = useRef<Partial<Record<NodeId, SVGGElement | null>>>({});

  const geometry = useMemo(
    () => Object.fromEntries(EDGES.map((e) => [e.id, edgeGeometry(e)])),
    [],
  );

  const activeEdges = useMemo(() => new Set(flow?.edges ?? []), [flow]);
  const activeNodes = useMemo(() => {
    const ids = new Set<NodeId>();
    flow?.edges.forEach((id) => {
      ids.add(EDGE_BY_ID[id].from);
      ids.add(EDGE_BY_ID[id].to);
    });
    return ids;
  }, [flow]);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".arch-node", {
        scale: 0,
        opacity: 0,
        rotate: -20,
        transformOrigin: "50% 50%",
        stagger: 0.06,
        duration: 0.7,
        ease: "back.out(2)",
      });
      gsap.utils.toArray<SVGPathElement>(".arch-edge-base").forEach((path) => {
        const length = path.getTotalLength();
        gsap.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 1.1,
            delay: 0.4,
            ease: "power2.inOut",
            clearProps: "strokeDasharray,strokeDashoffset",
          },
        );
      });
    },
    { scope: svgRef },
  );

  useGSAP(
    () => {
      const packet = packetRef.current;
      if (!packet) return;
      if (!flow || prefersReducedMotion()) {
        gsap.set(packet, { opacity: 0 });
        return;
      }
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9 });
      flow.edges.forEach((edgeId) => {
        const path = pathRefs.current[edgeId];
        if (!path) return;
        const length = path.getTotalLength();
        const target = pulseRefs.current[EDGE_BY_ID[edgeId].to];
        const color = ACCENT_HEX[NODE_BY_ID[EDGE_BY_ID[edgeId].to].accent];
        const progress = { t: 0 };
        tl.set(packet, { opacity: 1, color }).to(progress, {
          t: 1,
          duration: HOP_SECONDS,
          ease: "power1.inOut",
          onUpdate: () => {
            const p = path.getPointAtLength(progress.t * length);
            packet.setAttribute("transform", `translate(${p.x} ${p.y})`);
          },
        });
        if (target)
          tl.fromTo(
            target,
            { scale: 1.18 },
            { scale: 1, duration: 0.45, ease: "elastic.out(1.2, 0.4)" },
          );
      });
      tl.to(packet, { opacity: 0, duration: 0.2 });
      return () => tl.kill();
    },
    { dependencies: [flow], revertOnUpdate: true },
  );

  const handleSelect = (id: NodeId, event: MouseEvent | KeyboardEvent) => {
    onSelect(id);
    burstFromElement(event.currentTarget, {
      colors: [ACCENT_HEX[NODE_BY_ID[id].accent], "#ffffff"],
    });
  };

  return (
    <div className="glass overflow-x-auto rounded-[var(--radius-blob)] p-3 md:p-5">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-auto w-full min-w-[880px] select-none"
        role="group"
        aria-label="Inventrix AWS architecture diagram"
        data-testid="architecture-diagram"
      >
        <defs>
          <filter id="arch-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern
            id="arch-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#ffffff0d"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          fill="url(#arch-grid)"
          rx="24"
        />

        {EDGES.map((edge) => {
          const g = geometry[edge.id];
          const active = activeEdges.has(edge.id);
          const dim = flow !== null && !active;
          const color = ACCENT_HEX[NODE_BY_ID[edge.to].accent];
          return (
            <g
              key={edge.id}
              className="transition-opacity duration-500"
              opacity={dim ? 0.16 : 1}
            >
              <path
                className="arch-edge-base"
                d={g.d}
                fill="none"
                stroke={active ? color : "#ffffff40"}
                strokeWidth={active ? 3 : 1.6}
                strokeDasharray={edge.dashed ? "6 8" : undefined}
                ref={(el) => {
                  pathRefs.current[edge.id] = el;
                }}
              />
              {active && (
                <path
                  d={g.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray="2 22"
                  filter="url(#arch-glow)"
                  className="animate-[arch-dash_0.9s_linear_infinite]"
                />
              )}
              <text
                x={g.mid.x}
                y={g.mid.y - 8}
                textAnchor="middle"
                className="font-sans text-[13px] font-semibold"
                fill={active ? color : "#ffffffa0"}
                stroke="#05030f"
                strokeWidth={5}
                paintOrder="stroke"
              >
                {edge.label}
              </text>
            </g>
          );
        })}

        {NODES.map((node) => {
          const color = ACCENT_HEX[node.accent];
          const isSelected = node.id === selected;
          const dim = flow !== null && !activeNodes.has(node.id);
          return (
            <g
              key={node.id}
              transform={`translate(${node.x - NODE_WIDTH / 2} ${node.y - NODE_HEIGHT / 2})`}
              opacity={dim ? 0.35 : 1}
              className="transition-opacity duration-500"
            >
              <g
                className="arch-node cursor-pointer outline-none"
                role="button"
                tabIndex={0}
                aria-label={`${node.title}: ${node.service}`}
                aria-pressed={isSelected}
                data-testid={`arch-node-${node.id}`}
                onClick={(e) => handleSelect(node.id, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(node.id, e);
                  }
                }}
              >
                <g
                  ref={(el) => {
                    pulseRefs.current[node.id] = el;
                  }}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                  }}
                >
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={20}
                    fill="#0d0a1fe6"
                    stroke={color}
                    strokeWidth={isSelected ? 3.5 : 1.5}
                    filter={isSelected ? "url(#arch-glow)" : undefined}
                  />
                  <text x={20} y={47} fontSize={28}>
                    {node.icon}
                  </text>
                  <text
                    x={62}
                    y={33}
                    fill="#ffffff"
                    className="font-display text-[15px] font-bold"
                  >
                    {node.title}
                  </text>
                  <text
                    x={62}
                    y={54}
                    fill={color}
                    className="font-sans text-[11.5px]"
                  >
                    {node.service}
                  </text>
                </g>
              </g>
            </g>
          );
        })}

        <g
          ref={packetRef}
          opacity={0}
          pointerEvents="none"
          style={{ color: "#fff" }}
        >
          <circle
            r={16}
            fill="currentColor"
            opacity={0.25}
            filter="url(#arch-glow)"
          />
          <circle r={7} fill="#ffffff" />
          <circle r={11} fill="none" stroke="currentColor" strokeWidth={2.5} />
        </g>
      </svg>
    </div>
  );
}
