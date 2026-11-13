import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { gsap, useGSAP } from "../../fx/gsap";
import { useMagnetic } from "../../fx/useMagnetic";
import { toApiError } from "../../lib/api";
import {
  MAX_MESSAGE_LENGTH,
  loadSession,
  newId,
  newSession,
  saveSession,
  sendSupportMessage,
} from "../../lib/support";
import type { ChatMessage, SupportSession } from "../../lib/support";
import { useToast } from "../../ui/Toast";
import ChatBubble from "./ChatBubble";
import RichText from "./RichText";

const MAX_INPUT_HEIGHT_PX = 120;

function currentProductId(pathname: string): number | undefined {
  const id = matchPath("/products/:id", pathname)?.params.id;
  return id && /^\d+$/.test(id) ? Number(id) : undefined;
}

function starterPrompts(signedIn: boolean, onProduct: boolean): string[] {
  if (onProduct)
    return [
      "Tell me about this product",
      "Is it in stock?",
      "Show me similar items",
    ];
  if (signedIn)
    return [
      "Where is my latest order?",
      "Gift ideas under $50",
      "What's in stock today?",
    ];
  return [
    "Gift ideas under $50",
    "Build me a home office setup",
    "How does checkout work?",
  ];
}

function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Orbit is typing"
      data-testid="support-typing"
      className="flex items-center gap-2"
    >
      <span
        aria-hidden="true"
        className="h-6 w-6 shrink-0 animate-spin-slow rounded-full border-2 border-neon-cyan border-t-transparent"
      />
      <span className="glass flex gap-1.5 rounded-2xl rounded-bl-md px-4 py-3">
        {["bg-neon-pink", "bg-neon-cyan", "bg-neon-lime"].map((color, i) => (
          <span
            key={color}
            className={`h-2 w-2 animate-bounce rounded-full ${color}`}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </div>
  );
}

export default function SupportChat() {
  const { user } = useAuth();
  const toast = useToast();
  const { pathname } = useLocation();
  const productId = currentProductId(pathname);
  const ownerId = user?.id ?? null;

  const [session, setSession] = useState<SupportSession>(() =>
    loadSession(ownerId),
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [unread, setUnread] = useState(false);

  const sessionRef = useRef(session);
  const openRef = useRef(open);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useMagnetic(launcherRef, 0.25);

  useEffect(() => {
    sessionRef.current = session;
    saveSession(session);
  }, [session]);

  useEffect(() => {
    openRef.current = open;
    if (open) setUnread(false);
  }, [open]);

  // Signing in or out starts a different conversation: the assistant's access changes.
  useEffect(() => {
    if (sessionRef.current.ownerId !== ownerId) {
      setSession(loadSession(ownerId));
      setPending(false);
    }
  }, [ownerId]);

  useGSAP(
    () => {
      if (!open || !panelRef.current) return;
      gsap
        .timeline()
        .fromTo(
          panelRef.current,
          { clipPath: "circle(0% at 100% 100%)" },
          {
            clipPath: "circle(150% at 100% 100%)",
            duration: 0.7,
            ease: "expo.out",
          },
        )
        .from(
          panelRef.current.querySelectorAll("[data-panel-part]"),
          {
            y: 24,
            opacity: 0,
            stagger: 0.06,
            duration: 0.5,
            ease: "back.out(2)",
          },
          0.12,
        );
      inputRef.current?.focus();
    },
    { dependencies: [open] },
  );

  const messageCount = session.messages.length;
  useEffect(() => {
    const container = scrollRef.current;
    if (!open || !container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    const nodes = container.querySelectorAll("[data-chat-message]");
    const last = nodes[nodes.length - 1];
    if (last && messageCount > 0) {
      gsap.from(last, {
        y: 18,
        opacity: 0,
        scale: 0.96,
        duration: 0.5,
        ease: "back.out(1.8)",
      });
    }
  }, [messageCount, open, pending]);

  const close = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return setOpen(false);
    gsap.to(panel, {
      clipPath: "circle(0% at 100% 100%)",
      duration: 0.35,
      ease: "power3.in",
      onComplete: () => setOpen(false),
    });
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      const { sessionId, messages } = sessionRef.current;
      const userMessage: ChatMessage = {
        id: newId(),
        role: "user",
        text: trimmed,
      };
      const conversation = [...messages, userMessage];
      setSession((s) => ({ ...s, messages: conversation }));
      setDraft("");
      if (inputRef.current) inputRef.current.style.height = "";
      setPending(true);

      try {
        const reply = await sendSupportMessage(
          sessionId,
          conversation,
          productId,
        );
        const answer: ChatMessage = {
          id: newId(),
          role: "assistant",
          text: reply.reply,
          products: reply.products,
          orders: reply.orders,
          suggestions: reply.suggestions,
        };
        setSession((s) =>
          s.sessionId === sessionId
            ? { ...s, messages: [...s.messages, answer] }
            : s,
        );
        if (!openRef.current) setUnread(true);
      } catch (err) {
        setSession((s) =>
          s.sessionId === sessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === userMessage.id ? { ...m, failed: true } : m,
                ),
              }
            : s,
        );
        toast.error("Orbit lost signal", toApiError(err).message);
      } finally {
        if (sessionRef.current.sessionId === sessionId) setPending(false);
      }
    },
    [pending, productId, toast],
  );

  const retry = (id: string) => {
    const failed = session.messages.find((m) => m.id === id);
    if (!failed || pending) return;
    setSession((s) => ({
      ...s,
      messages: s.messages.filter((m) => m.id !== id),
    }));
    sessionRef.current = {
      ...sessionRef.current,
      messages: sessionRef.current.messages.filter((m) => m.id !== id),
    };
    void send(failed.text);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(draft);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX)}px`;
  };

  const resetConversation = () => {
    setSession(newSession(ownerId));
    setPending(false);
    inputRef.current?.focus();
  };

  const lastAssistant = [...session.messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const suggestions =
    session.messages.length === 0
      ? starterPrompts(Boolean(user), productId !== undefined)
      : (lastAssistant?.suggestions ?? []);
  const greeting = user
    ? `Hey **${user.name}**! I'm Orbit, Inventrix's AI assistant. Ask me about products, stock, prices or your orders.`
    : "Hey! I'm Orbit, Inventrix's AI assistant. Ask me about products, stock and prices. Sign in and I can check your orders too.";

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Orbit support chat"
          data-testid="support-panel"
          className="fixed right-3 bottom-24 left-3 z-[52] flex h-[min(40rem,calc(100dvh-11rem))] flex-col overflow-hidden rounded-[var(--radius-blob)] border border-white/15 bg-void-2/90 shadow-[0_0_60px_#8b5cf633] backdrop-blur-2xl sm:right-6 sm:left-auto sm:w-[26rem]"
        >
          <header
            data-panel-part
            className="relative flex items-center gap-3 overflow-hidden border-b border-white/10 px-5 py-4"
          >
            <span
              aria-hidden="true"
              className="grid-lines absolute inset-0 opacity-60"
            />
            <span className="relative inline-block h-9 w-9 shrink-0">
              <span className="absolute inset-0 animate-spin-slow rounded-full border-2 border-neon-cyan border-t-transparent" />
              <span className="absolute inset-2 rounded-full bg-neon-pink shadow-neon-pink" />
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="font-display text-lg leading-none font-black tracking-tighter text-gradient">
                ORBIT
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[0.6rem] font-bold tracking-[0.2em] text-white/50 uppercase">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-lime shadow-neon-lime" />
                AI support · live catalog
              </p>
            </div>
            <button
              type="button"
              onClick={resetConversation}
              aria-label="Start a new conversation"
              title="New conversation"
              data-testid="support-reset"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-neon-cyan hover:text-neon-cyan"
            >
              ↻
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close support chat"
              data-testid="support-close"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-neon-pink hover:text-neon-pink"
            >
              ✕
            </button>
          </header>

          <div
            ref={scrollRef}
            data-panel-part
            aria-live="polite"
            data-testid="support-messages"
            className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-5"
          >
            <div className="flex items-end gap-2">
              <span
                aria-hidden="true"
                className="mb-1 h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-neon-cyan to-neon-violet shadow-neon-cyan"
              />
              <div className="glass max-w-[85%] rounded-2xl rounded-bl-md border-neon-cyan/25 px-4 py-2.5 text-sm leading-relaxed text-white/90">
                <RichText text={greeting} />
              </div>
            </div>
            {session.messages.map((message) => (
              <ChatBubble key={message.id} message={message} onRetry={retry} />
            ))}
            {pending && <TypingIndicator />}
          </div>

          <div
            data-panel-part
            className="border-t border-white/10 px-4 pt-3 pb-4"
          >
            {!pending && suggestions.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    data-testid="support-suggestion"
                    className="rounded-full border border-neon-cyan/40 bg-neon-cyan/5 px-3 py-1.5 text-xs font-medium text-neon-cyan transition-[background-color,box-shadow] hover:bg-neon-cyan/15 hover:shadow-neon-cyan"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <label htmlFor="support-input" className="sr-only">
                Message Orbit
              </label>
              <textarea
                id="support-input"
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Ask about products or orders…"
                data-testid="support-input"
                className="max-h-[120px] min-h-[2.75rem] flex-1 resize-none rounded-2xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none transition-[border-color,box-shadow] hover:border-white/30 focus:border-neon-cyan focus:shadow-neon-cyan"
              />
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                aria-label="Send message"
                data-testid="support-send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-neon-pink via-neon-violet to-neon-cyan font-display text-lg font-black text-white shadow-neon-pink transition-[filter,opacity] hover:brightness-125 disabled:opacity-40"
              >
                ↑
              </button>
            </form>
            <p className="mt-2 text-center text-[0.6rem] tracking-wide text-white/35">
              AI answers can be wrong · stock and orders are checked live
            </p>
          </div>
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "Close support chat" : "Open support chat"}
        aria-expanded={open}
        data-testid="support-launcher"
        className="group fixed right-5 bottom-5 z-[52] flex h-16 w-16 items-center justify-center rounded-full sm:right-7 sm:bottom-6"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-spin-slow rounded-full border-2 border-neon-cyan border-t-transparent border-l-neon-pink"
        />
        <span
          aria-hidden="true"
          className="absolute inset-2 rounded-full bg-gradient-to-br from-neon-pink via-neon-violet to-neon-cyan shadow-neon-pink transition-transform duration-300 group-hover:scale-110"
        />
        <span
          aria-hidden="true"
          className={`relative font-display text-xl font-black text-white transition-transform duration-500 ${open ? "rotate-[135deg]" : ""}`}
        >
          {open ? "+" : "✦"}
        </span>
        {!open && (
          <span className="pointer-events-none absolute right-full mr-3 hidden translate-x-2 rounded-full border border-white/15 bg-void-2/90 px-4 py-2 font-display text-[0.65rem] font-bold tracking-widest whitespace-nowrap text-white uppercase opacity-0 backdrop-blur-xl transition-[opacity,transform] duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:block">
            Ask Orbit
          </span>
        )}
        {unread && !open && (
          <span
            data-testid="support-unread"
            className="absolute top-0.5 right-0.5 h-3.5 w-3.5 animate-ping rounded-full bg-neon-lime"
          />
        )}
      </button>
    </>
  );
}
