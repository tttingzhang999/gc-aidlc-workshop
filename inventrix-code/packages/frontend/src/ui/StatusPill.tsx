import type { InventoryStatus, OrderStatus } from "../lib/types";

type Status = OrderStatus | InventoryStatus;

const STYLES: Record<Status, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className:
      "border-neon-orange text-neon-orange shadow-[0_0_14px_#ff7a0066]",
  },
  processing: {
    label: "Processing",
    className: "border-neon-cyan text-neon-cyan shadow-[0_0_14px_#00f0ff66]",
  },
  shipped: {
    label: "Shipped",
    className:
      "border-neon-violet text-neon-violet shadow-[0_0_14px_#8b5cf666]",
  },
  delivered: {
    label: "Delivered",
    className: "border-neon-lime text-neon-lime shadow-[0_0_14px_#b6ff0066]",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-neon-red text-neon-red shadow-[0_0_14px_#ff2d5566]",
  },
  in_stock: {
    label: "In Stock",
    className: "border-neon-lime text-neon-lime shadow-[0_0_14px_#b6ff0066]",
  },
  low_stock: {
    label: "Low Stock",
    className:
      "border-neon-orange text-neon-orange shadow-[0_0_14px_#ff7a0066]",
  },
  out_of_stock: {
    label: "Out of Stock",
    className: "border-neon-red text-neon-red shadow-[0_0_14px_#ff2d5566]",
  },
};

interface StatusPillProps {
  status: Status;
  className?: string;
}

export function statusLabel(status: Status): string {
  return STYLES[status]?.label ?? status;
}

export default function StatusPill({
  status,
  className = "",
}: StatusPillProps) {
  const style = STYLES[status] ?? {
    label: status,
    className: "border-white/40 text-white/80",
  };
  return (
    <span
      data-testid={`status-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full border-2 bg-void/60 px-3 py-1 font-display text-[0.6rem] font-bold uppercase tracking-widest ${style.className} ${className}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      {style.label}
    </span>
  );
}
