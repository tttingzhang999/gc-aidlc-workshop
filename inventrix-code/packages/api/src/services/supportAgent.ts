import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from '@aws-sdk/client-bedrock-agentcore';

const LOCAL_AGENT_URL = 'http://localhost:8080';
// The Lambda behind API Gateway has 29 s in total; leave room for the database work after the reply.
const AGENT_TIMEOUT_MS = 26_000;

export interface SupportChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface SupportInvocation {
  messages: SupportChatMessage[];
  user: { name: string; role: 'admin' | 'customer' } | null;
  authToken?: string;
  context?: { productId?: number };
}

export interface SupportReply {
  reply: string;
  productIds: number[];
  orderIds: number[];
  suggestions: string[];
}

export class SupportAgentError extends Error {}

let client: BedrockAgentCoreClient | undefined;

async function invokeRuntime(
  runtimeArn: string,
  sessionId: string,
  invocation: SupportInvocation,
): Promise<unknown> {
  client ??= new BedrockAgentCoreClient({});
  const output = await client.send(
    new InvokeAgentRuntimeCommand({
      agentRuntimeArn: runtimeArn,
      runtimeSessionId: sessionId,
      contentType: 'application/json',
      accept: 'application/json',
      payload: new TextEncoder().encode(JSON.stringify(invocation)),
    }),
    { abortSignal: AbortSignal.timeout(AGENT_TIMEOUT_MS) },
  );
  const text = await output.response?.transformToString();
  if (!text) throw new SupportAgentError('Support agent returned no body');
  if (output.statusCode && output.statusCode >= 400) {
    throw new SupportAgentError(
      `Support agent returned ${output.statusCode}: ${text}`,
    );
  }
  return JSON.parse(text);
}

async function invokeLocal(
  agentUrl: string,
  invocation: SupportInvocation,
): Promise<unknown> {
  const res = await fetch(`${agentUrl.replace(/\/+$/, '')}/invocations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invocation),
    signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new SupportAgentError(
      `Support agent returned ${res.status}: ${text}`,
    );
  }
  return JSON.parse(text);
}

const toIntList = (value: unknown, max: number): number[] =>
  Array.isArray(value)
    ? value.filter((v): v is number => Number.isInteger(v)).slice(0, max)
    : [];

function toSupportReply(value: unknown): SupportReply {
  const candidate = (value ?? {}) as Record<string, unknown>;
  if (typeof candidate.reply !== 'string' || candidate.reply.length === 0) {
    throw new SupportAgentError('Support agent reply has no text');
  }
  return {
    reply: candidate.reply,
    productIds: toIntList(candidate.productIds, 4),
    orderIds: toIntList(candidate.orderIds, 3),
    suggestions: Array.isArray(candidate.suggestions)
      ? candidate.suggestions
          .filter((s): s is string => typeof s === 'string' && s.length > 0)
          .map((s) => s.slice(0, 80))
          .slice(0, 3)
      : [],
  };
}

export async function askSupportAgent(
  sessionId: string,
  invocation: SupportInvocation,
): Promise<SupportReply> {
  const runtimeArn = process.env.SUPPORT_AGENT_RUNTIME_ARN;
  const raw = runtimeArn
    ? await invokeRuntime(runtimeArn, sessionId, invocation)
    : await invokeLocal(
        process.env.SUPPORT_AGENT_URL ?? LOCAL_AGENT_URL,
        invocation,
      );
  return toSupportReply(raw);
}
