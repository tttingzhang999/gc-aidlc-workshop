import { Router } from 'express';
import { getDb, type Param } from '../db/index.js';
import { asyncRoute } from '../http.js';
import {
  optionalAuthenticate,
  OptionalAuthRequest,
} from '../middleware/auth.js';
import { supportChatRateLimit } from '../middleware/rateLimit.js';
import {
  askSupportAgent,
  SupportAgentError,
  type SupportChatMessage,
} from '../services/supportAgent.js';

const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 2000;
const SESSION_ID = /^[A-Za-z0-9-]{33,100}$/;

interface ChatRequest {
  sessionId: string;
  messages: SupportChatMessage[];
  productId?: number;
}

function isChatMessage(value: unknown): value is SupportChatMessage {
  if (!value || typeof value !== 'object') return false;
  const { role, text } = value as Record<string, unknown>;
  return (
    (role === 'user' || role === 'assistant') &&
    typeof text === 'string' &&
    text.trim().length > 0 &&
    text.length <= MAX_MESSAGE_LENGTH
  );
}

function parseChatRequest(body: unknown): ChatRequest | null {
  if (!body || typeof body !== 'object') return null;
  const { sessionId, messages, context } = body as Record<string, unknown>;
  if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) return null;
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_HISTORY ||
    !messages.every(isChatMessage) ||
    messages[messages.length - 1].role !== 'user'
  ) {
    return null;
  }
  const productId = (context as { productId?: unknown } | undefined)?.productId;
  return {
    sessionId,
    messages: messages.map(({ role, text }) => ({ role, text: text.trim() })),
    productId:
      Number.isInteger(productId) && (productId as number) > 0
        ? (productId as number)
        : undefined,
  };
}

const placeholders = (count: number, offset = 0): string =>
  Array.from({ length: count }, (_, i) => `$${i + 1 + offset}::int`).join(', ');

async function loadProducts(ids: number[]): Promise<unknown[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const rows = await db.query<{ id: number }>(
    `SELECT id, name, price, stock, image_url FROM products WHERE id IN (${placeholders(ids.length)})`,
    ids,
  );
  return ids.flatMap((id) => rows.filter((row) => row.id === id));
}

async function loadOrders(
  ids: number[],
  user: NonNullable<OptionalAuthRequest['user']>,
): Promise<unknown[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const ownerFilter = user.role === 'admin' ? '' : ' AND user_id = $1::int';
  const params: Param[] = user.role === 'admin' ? ids : [user.id, ...ids];
  const rows = await db.query<{ id: number }>(
    `SELECT id, status, total, created_at FROM orders WHERE id IN (${placeholders(ids.length, user.role === 'admin' ? 0 : 1)})${ownerFilter}`,
    params,
  );
  return ids.flatMap((id) => rows.filter((row) => row.id === id));
}

async function loadUserProfile(
  user: OptionalAuthRequest['user'],
): Promise<{ name: string; role: 'admin' | 'customer' } | null> {
  if (!user) return null;
  const db = await getDb();
  const [row] = await db.query<{ name: string; role: 'admin' | 'customer' }>(
    'SELECT name, role FROM users WHERE id = $1::int',
    [user.id],
  );
  return row ?? null;
}

const router = Router();

router.post(
  '/chat',
  supportChatRateLimit,
  optionalAuthenticate,
  asyncRoute(async (req: OptionalAuthRequest, res) => {
    const chat = parseChatRequest(req.body);
    if (!chat) {
      return res.status(400).json({ error: 'Invalid chat request' });
    }

    const profile = await loadUserProfile(req.user);
    const signedIn = Boolean(profile && req.user);

    let reply;
    try {
      reply = await askSupportAgent(chat.sessionId, {
        messages: chat.messages,
        user: profile,
        authToken: signedIn ? req.token : undefined,
        context: chat.productId ? { productId: chat.productId } : undefined,
      });
    } catch (error) {
      console.error('Support agent request failed', error);
      const message =
        error instanceof SupportAgentError
          ? 'The assistant could not answer that. Please try again.'
          : 'The assistant is unavailable right now. Please try again later.';
      return res.status(502).json({ error: message });
    }

    const [products, orders] = await Promise.all([
      loadProducts(reply.productIds),
      signedIn && req.user ? loadOrders(reply.orderIds, req.user) : [],
    ]);

    res.json({
      reply: reply.reply,
      products,
      orders,
      suggestions: reply.suggestions,
    });
  }),
);

export default router;
