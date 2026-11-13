import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

export default function EmptyState({
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center gap-6 py-20 text-center"
    >
      <div className="relative h-28 w-28">
        <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-neon-violet" />
        <div className="absolute inset-4 animate-spin-reverse rounded-full border-2 border-neon-cyan/60" />
        <div className="absolute inset-10 rounded-full bg-neon-pink shadow-neon-pink" />
      </div>
      <h2 className="font-display text-4xl font-black tracking-tighter text-gradient md:text-6xl">
        {title}
      </h2>
      {message && <p className="max-w-md text-white/60">{message}</p>}
      {action}
    </div>
  );
}
