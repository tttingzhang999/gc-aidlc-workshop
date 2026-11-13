import { z } from 'zod';

export const MAX_HISTORY = 20;
export const MAX_MESSAGE_LENGTH = 2000;

const chatMessage = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export const invocationSchema = z.object({
  messages: z.array(chatMessage).min(1).max(MAX_HISTORY),
  user: z
    .object({
      name: z.string().max(200),
      role: z.enum(['admin', 'customer']),
    })
    .nullable(),
  authToken: z.string().max(4096).optional(),
  context: z
    .object({
      productId: z.number().int().positive().optional(),
      page: z.string().max(200).optional(),
    })
    .optional(),
});

export type Invocation = z.infer<typeof invocationSchema>;
export type ChatMessage = z.infer<typeof chatMessage>;

export const replySchema = z.object({
  reply: z
    .string()
    .describe(
      'The answer shown to the customer. Plain text; short paragraphs or "- " bullet lists; **bold** allowed.',
    ),
  productIds: z
    .array(z.number().int())
    .max(4)
    .describe(
      'IDs of up to 4 products to show as cards under the reply. Only IDs returned by a tool in this turn.',
    ),
  orderIds: z
    .array(z.number().int())
    .max(3)
    .describe(
      'IDs of up to 3 of the customer’s orders to show as cards. Only IDs returned by an order tool.',
    ),
  suggestions: z
    .array(z.string().max(60))
    .max(3)
    .describe(
      'Up to 3 short follow-up questions the customer might tap next, written in the customer’s language.',
    ),
});

export type Reply = z.infer<typeof replySchema>;
