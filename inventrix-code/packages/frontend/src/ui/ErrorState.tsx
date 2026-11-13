import Button from "./Button";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-testid="error-state"
      className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-[var(--radius-blob)] border-2 border-neon-red bg-neon-red/10 p-10 text-center shadow-neon-red"
    >
      <span
        className="glitch font-display text-5xl font-black text-neon-red"
        data-text="ERROR"
      >
        ERROR
      </span>
      <p className="text-white/80">{message}</p>
      {onRetry && (
        <Button variant="danger" onClick={onRetry} data-testid="retry-button">
          Retry
        </Button>
      )}
    </div>
  );
}
