import { apiFetch } from "./api";
import type { OrderStatus, Product } from "./types";

export const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 20;
const STORAGE_KEY = "inventrix:support";

export type SupportProduct = Pick<
  Product,
  "id" | "name" | "price" | "stock" | "image_url"
>;

export interface SupportOrder {
  id: number;
  status: OrderStatus;
  total: number;
  created_at: string;
}

export interface SupportReply {
  reply: string;
  products: SupportProduct[];
  orders: SupportOrder[];
  suggestions: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: SupportProduct[];
  orders?: SupportOrder[];
  suggestions?: string[];
  failed?: boolean;
  local?: boolean;
}

export interface SupportSession {
  sessionId: string;
  ownerId: number | null;
  messages: ChatMessage[];
}

/** 160 random bits as hex: AgentCore needs session ids of 33+ chars, and randomUUID needs a secure context. */
export function newId(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newSession(ownerId: number | null): SupportSession {
  return { sessionId: newId(), ownerId, messages: [] };
}

export function loadSession(ownerId: number | null): SupportSession {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SupportSession) : null;
    if (
      parsed &&
      typeof parsed.sessionId === "string" &&
      parsed.ownerId === ownerId &&
      Array.isArray(parsed.messages)
    ) {
      return parsed;
    }
  } catch {
    // Corrupt or unavailable storage starts a fresh conversation.
  }
  return newSession(ownerId);
}

export function saveSession(session: SupportSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The conversation still lives in memory for this tab.
  }
}

/** Only real exchanges are sent: local greetings and failed turns stay in the UI. */
export function sendSupportMessage(
  sessionId: string,
  conversation: readonly ChatMessage[],
  productId?: number,
): Promise<SupportReply> {
  const messages = conversation
    .filter((m) => !m.failed && !m.local)
    .slice(-MAX_HISTORY)
    .map(({ role, text }) => ({ role, text }));
  return apiFetch<SupportReply>("/api/support/chat", {
    method: "POST",
    body: {
      sessionId,
      messages,
      context: productId ? { productId } : undefined,
    },
  });
}
