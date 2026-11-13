import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { invocationSchema } from './contract.js';
import { answer } from './agent.js';

// AgentCore Runtime HTTP contract: GET /ping and POST /invocations on port 8080.
const PORT = Number(process.env.PORT ?? 8080);
const MAX_BODY_BYTES = 128 * 1024;

class PayloadTooLargeError extends Error {}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new PayloadTooLargeError();
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handleInvocation(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return sendJson(res, 413, { error: 'Payload too large' });
    }
    return sendJson(res, 400, { error: 'Body must be valid JSON' });
  }

  const parsed = invocationSchema.safeParse(body);
  if (!parsed.success) {
    return sendJson(res, 400, { error: 'Invalid invocation payload' });
  }

  try {
    sendJson(res, 200, await answer(parsed.data));
  } catch (error) {
    console.error('Support agent invocation failed', error);
    sendJson(res, 500, { error: 'The assistant could not answer' });
  }
}

const server = createServer((req, res) => {
  const path = req.url?.split('?')[0];
  if (req.method === 'GET' && path === '/ping') {
    return sendJson(res, 200, { status: 'Healthy' });
  }
  if (req.method === 'POST' && path === '/invocations') {
    void handleInvocation(req, res);
    return;
  }
  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.info(`Inventrix support agent listening on port ${PORT}`);
});
