import { Agent, BedrockModel } from '@strands-agents/sdk';
import type { MessageData } from '@strands-agents/sdk';
import {
  replySchema,
  type ChatMessage,
  type Invocation,
  type Reply,
} from './contract.js';
import { buildSystemPrompt } from './prompt.js';
import { buildTools } from './tools.js';

const DEFAULT_MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
// Stays under the 29 s API Gateway limit of the Lambda that relays the reply.
const INVOCATION_TIMEOUT_MS = 24_000;

const model = new BedrockModel({
  modelId: process.env.SUPPORT_MODEL_ID ?? DEFAULT_MODEL_ID,
  maxTokens: 1024,
  temperature: 0.3,
});

// Bedrock requires history to start with a user turn and alternate roles.
function toHistory(messages: readonly ChatMessage[]): MessageData[] {
  const history: MessageData[] = [];
  for (const message of messages) {
    if (history.length === 0 && message.role !== 'user') continue;
    const previous = history.at(-1);
    if (previous?.role === message.role) {
      history[history.length - 1] = {
        role: previous.role,
        content: [...previous.content, { text: message.text }],
      };
    } else {
      history.push({ role: message.role, content: [{ text: message.text }] });
    }
  }
  return history;
}

export async function answer(invocation: Invocation): Promise<Reply> {
  const prompt = invocation.messages.at(-1);
  if (!prompt || prompt.role !== 'user') {
    throw new Error('The last message must come from the user');
  }

  const agent = new Agent({
    model,
    systemPrompt: buildSystemPrompt(invocation),
    tools: buildTools(invocation.authToken),
    messages: toHistory(invocation.messages.slice(0, -1)),
    printer: false,
  });

  const result = await agent.invoke(prompt.text, {
    structuredOutputSchema: replySchema,
    cancelSignal: AbortSignal.timeout(INVOCATION_TIMEOUT_MS),
    limits: { turns: 8, structuredOutputAttempts: 2 },
  });

  const parsed = replySchema.safeParse(result.structuredOutput);
  if (parsed.success) return parsed.data;
  return {
    reply: result.toString(),
    productIds: [],
    orderIds: [],
    suggestions: [],
  };
}
