import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "../fx/gsap";
import Button from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Animated replacement for window.confirm(). Escape or backdrop click cancels. */
export default function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.open) return null;
  return <DialogBody {...props} />;
}

function DialogBody({
  title,
  message,
  confirmLabel = "Confirm",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-backdrop]", { opacity: 0, duration: 0.25 });
      gsap.from("[data-dialog]", {
        scale: 0.2,
        rotation: -14,
        y: 120,
        opacity: 0,
        duration: 0.7,
        ease: "back.out(2.2)",
      });
    },
    { scope: rootRef },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[9600] flex items-center justify-center p-4"
    >
      <div
        data-backdrop
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <div
        data-dialog
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-md rounded-[var(--radius-blob)] border-2 border-neon-red bg-void-2 p-8 shadow-neon-red"
      >
        <h2
          id="confirm-title"
          className="font-display text-2xl font-black uppercase text-neon-red"
        >
          {title}
        </h2>
        <p className="mt-3 text-white/75">{message}</p>
        <div className="mt-8 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            data-testid="confirm-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={busy}
            data-testid="confirm-ok"
            autoFocus
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
