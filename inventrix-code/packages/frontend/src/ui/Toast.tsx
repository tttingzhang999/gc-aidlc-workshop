import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { gsap, useGSAP } from "../fx/gsap";

export type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastApi {
  push: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);
const TOAST_LIFETIME_MS = 4200;

const KIND_STYLES: Record<
  ToastKind,
  { border: string; icon: string; text: string }
> = {
  success: {
    border: "border-neon-lime shadow-neon-lime",
    icon: "✦",
    text: "text-neon-lime",
  },
  error: {
    border: "border-neon-red shadow-neon-red",
    icon: "✕",
    text: "text-neon-red",
  },
  info: {
    border: "border-neon-cyan shadow-neon-cyan",
    icon: "◉",
    text: "text-neon-cyan",
  },
};

function ToastCard({
  toast,
  onDone,
}: {
  toast: ToastItem;
  onDone: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const style = KIND_STYLES[toast.kind];

  const { contextSafe } = useGSAP(
    () => {
      gsap
        .timeline()
        .from(ref.current, {
          x: 420,
          rotation: 12,
          scale: 0.6,
          duration: 0.9,
          ease: "elastic.out(1, 0.45)",
        })
        .to(
          ref.current,
          {
            x: 480,
            opacity: 0,
            rotation: -8,
            duration: 0.35,
            ease: "back.in(2)",
          },
          TOAST_LIFETIME_MS / 1000,
        )
        .call(() => onDone(toast.id));
    },
    { scope: ref },
  );

  const dismiss = contextSafe(() => {
    gsap.to(ref.current, {
      scale: 0,
      opacity: 0,
      duration: 0.25,
      onComplete: () => onDone(toast.id),
    });
  });

  return (
    <div
      ref={ref}
      role={toast.kind === "error" ? "alert" : "status"}
      data-testid={`toast-${toast.kind}`}
      className={`pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border-2 bg-void-2/90 p-4 backdrop-blur-xl ${style.border}`}
    >
      <span className={`font-display text-2xl leading-none ${style.text}`}>
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`font-display text-sm font-bold uppercase tracking-wide ${style.text}`}
        >
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-1 break-words text-sm text-white/75">
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        data-testid="toast-dismiss"
        className="text-white/50 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = nextId.current++;
      setToasts((current) => [
        ...current.slice(-3),
        { id, kind, title, message },
      ]);
    },
    [],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, message) => push("success", title, message),
      error: (title, message) => push("error", title, message),
      info: (title, message) => push("info", title, message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[9500] flex flex-col items-end gap-3">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
