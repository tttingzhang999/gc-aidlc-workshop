interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "h-6 w-full" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer animate-shimmer rounded-2xl ${className}`}
    />
  );
}
