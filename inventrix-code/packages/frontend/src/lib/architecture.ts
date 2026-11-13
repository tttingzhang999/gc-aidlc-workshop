// Facts mirror infra/lib/inventrix-stack.ts and infra/docs/inventrix-serverless.architecture.json.

export type NodeId =
  | "users"
  | "waf"
  | "cloudfront"
  | "s3Site"
  | "httpApi"
  | "s3Images"
  | "cognito"
  | "lambda"
  | "agentCore"
  | "aurora"
  | "dbSecret"
  | "bedrock";

export type Accent = "pink" | "cyan" | "lime" | "violet" | "orange";

export interface ArchNode {
  id: NodeId;
  title: string;
  service: string;
  icon: string;
  accent: Accent;
  x: number;
  y: number;
  summary: string;
  facts: string[];
  source: string;
}

export interface ArchEdge {
  id: string;
  from: NodeId;
  to: NodeId;
  label: string;
  dashed?: boolean;
  labelAt?: number;
}

export interface ArchFlow {
  id: string;
  label: string;
  icon: string;
  description: string;
  edges: string[];
}

export const VIEW_WIDTH = 1240;
export const VIEW_HEIGHT = 700;
export const NODE_WIDTH = 184;
export const NODE_HEIGHT = 76;

export const ACCENT_HEX: Record<Accent, string> = {
  pink: "#ff2bd6",
  cyan: "#00f0ff",
  lime: "#b6ff00",
  violet: "#8b5cf6",
  orange: "#ff7a00",
};

export const NODES: ArchNode[] = [
  {
    id: "users",
    title: "Browser",
    service: "Shoppers & admins",
    icon: "🧑‍🚀",
    accent: "lime",
    x: 110,
    y: 360,
    summary:
      "The React SPA only ever calls relative paths (/api, /images), so the same build runs locally behind Vite and in AWS behind CloudFront.",
    facts: [
      "No absolute API base URL and no deploy-time env vars",
      "Signed-in requests carry a Cognito ID token as a Bearer header",
      "Guests are identified by an anonymous X-Guest-Id header",
    ],
    source: "inventrix-code/packages/frontend/src/lib/api.ts",
  },
  {
    id: "waf",
    title: "AWS WAF",
    service: "Edge firewall",
    icon: "🛡️",
    accent: "orange",
    x: 350,
    y: 165,
    summary:
      "Inspects every request at the edge before it reaches any origin. It is attached to the distribution, not a separate network hop.",
    facts: [
      "AWS managed Common Rule Set + Known Bad Inputs",
      "/api/auth/ — 20 requests per 10 min per IP",
      "/api/support/ — 100 requests per 10 min per IP",
      "/api/ — 2,000 requests per 10 min per IP",
    ],
    source: "infra/lib/inventrix-stack.ts",
  },
  {
    id: "cloudfront",
    title: "CloudFront",
    service: "Global CDN entry",
    icon: "🌐",
    accent: "cyan",
    x: 350,
    y: 360,
    summary:
      "One HTTPS domain for everything. Path-based behaviors fan requests out to the SPA bucket, the API and the image bucket.",
    facts: [
      "/* → site bucket via Origin Access Control",
      "SpaRewrite CloudFront Function maps deep links to /index.html",
      "/api/* → HTTP API, max TTL 1 s, Authorization in the cache key",
      "/images/* → images bucket via Origin Access Control",
      "HTTP is redirected to HTTPS",
    ],
    source: "infra/lib/inventrix-stack.ts",
  },
  {
    id: "s3Site",
    title: "S3 · Site",
    service: "Static SPA bucket",
    icon: "🪐",
    accent: "violet",
    x: 610,
    y: 120,
    summary:
      "Holds the Vite build of packages/frontend. A CDK BucketDeployment uploads dist/ and invalidates CloudFront on every deploy.",
    facts: [
      "Private bucket, readable only through CloudFront OAC",
      "Emptied and removed with the stack",
    ],
    source: "infra/lib/inventrix-stack.ts",
  },
  {
    id: "httpApi",
    title: "API Gateway",
    service: "HTTP API",
    icon: "🚪",
    accent: "pink",
    x: 610,
    y: 360,
    summary:
      "Routes /api traffic into the Lambda. Public routes go straight through; every other route needs a valid Cognito JWT first.",
    facts: [
      "Stage throttle: 50 requests/s, burst 100",
      "Public: auth, products (GET), cart, gomoku, support chat",
      "Everything else under /api/{proxy+} uses the Cognito JWT authorizer",
    ],
    source: "infra/lib/inventrix-stack.ts",
  },
  {
    id: "s3Images",
    title: "S3 · Images",
    service: "Product image bucket",
    icon: "🖼️",
    accent: "violet",
    x: 610,
    y: 600,
    summary:
      "Serves product photos under /images. Starts with 24 seeded images and grows as admins generate new ones with Bedrock.",
    facts: [
      "Private bucket behind CloudFront OAC",
      "Lambda may only PutObject under images/*",
      "Retained when the stack is deleted",
    ],
    source: "infra/lib/inventrix-stack.ts",
  },
  {
    id: "cognito",
    title: "Cognito",
    service: "User Pool",
    icon: "🔐",
    accent: "lime",
    x: 870,
    y: 150,
    summary:
      "Owns identities. The API signs users up and in through it, and API Gateway verifies its ID tokens on protected routes.",
    facts: [
      "Email as username, self sign-up auto-confirmed by a PreSignUp Lambda",
      "App client with USER_PASSWORD_AUTH, ID token valid for 1 day",
      "admin group; the admin user is created at deploy time",
      "Admin password is generated into Secrets Manager",
    ],
    source: "infra/lib/inventrix-stack.ts · api/src/cognito.ts",
  },
  {
    id: "lambda",
    title: "Lambda · API",
    service: "Express on Node 22",
    icon: "⚡",
    accent: "orange",
    x: 870,
    y: 360,
    summary:
      "The whole Express API runs as one function, so local dev (tsx watch) and production share the same routes and middleware.",
    facts: [
      "Node.js 22 on arm64, 1,024 MB, 29 s timeout",
      "Logs kept for 1 month in CloudWatch",
      "Syncs each Cognito identity into the users table",
    ],
    source: "inventrix-code/packages/api/src/lambda.ts",
  },
  {
    id: "agentCore",
    title: "AgentCore",
    service: "Agent runtime",
    icon: "🤖",
    accent: "cyan",
    x: 870,
    y: 590,
    summary:
      "Hosts Orbit, the support agent built with the Strands Agents TypeScript SDK. The API invokes it for every chat turn.",
    facts: [
      "Runtime inventrix_support, Node.js 22, 15 min idle timeout",
      "Tools: search_products, get_product",
      "Signed-in callers also get list_my_orders and get_order",
      "Tools call the HTTP API directly with the caller's token",
    ],
    source: "inventrix-code/packages/support-agent/src",
  },
  {
    id: "aurora",
    title: "Aurora",
    service: "PostgreSQL 17",
    icon: "🗄️",
    accent: "pink",
    x: 1130,
    y: 110,
    summary:
      "Stores products, users, carts and orders. The Lambda talks to it over the RDS Data API, so the function needs no VPC.",
    facts: [
      "Scales 0–2 ACU and pauses after 30 min idle",
      "Two isolated subnets, no NAT gateway",
      "Snapshot taken if the cluster is deleted",
    ],
    source: "infra/lib/inventrix-stack.ts · api/src/db/dataApi.ts",
  },
  {
    id: "dbSecret",
    title: "DB Secret",
    service: "Secrets Manager",
    icon: "🗝️",
    accent: "lime",
    x: 1130,
    y: 270,
    summary:
      "Holds the database master credentials. No password ever lives in code; each Data API call passes the secret ARN instead.",
    facts: [
      "Read by the Data API with the Lambda's IAM identity",
      "Retained when the stack is deleted",
    ],
    source: "api/src/db/index.ts",
  },
  {
    id: "bedrock",
    title: "Bedrock",
    service: "Foundation models",
    icon: "🧠",
    accent: "violet",
    x: 1130,
    y: 495,
    summary:
      "Two models do the generative work: one paints product images for admins, the other powers the support agent.",
    facts: [
      "Amazon Nova Canvas — product image generation",
      "Claude Haiku 4.5 via the us. cross-region inference profile",
    ],
    source: "api/src/services/imageGenerator.ts",
  },
];

export const EDGES: ArchEdge[] = [
  { id: "user-cf", from: "users", to: "cloudfront", label: "HTTPS" },
  {
    id: "waf-cf",
    from: "waf",
    to: "cloudfront",
    label: "inspects",
    dashed: true,
  },
  { id: "cf-site", from: "cloudfront", to: "s3Site", label: "/*" },
  { id: "cf-api", from: "cloudfront", to: "httpApi", label: "/api/*" },
  { id: "cf-images", from: "cloudfront", to: "s3Images", label: "/images/*" },
  { id: "api-cognito", from: "httpApi", to: "cognito", label: "JWT check" },
  { id: "api-lambda", from: "httpApi", to: "lambda", label: "proxy" },
  {
    id: "lambda-cognito",
    from: "lambda",
    to: "cognito",
    label: "sign up / in",
  },
  { id: "lambda-aurora", from: "lambda", to: "aurora", label: "Data API" },
  { id: "lambda-secret", from: "lambda", to: "dbSecret", label: "secret ARN" },
  { id: "lambda-bedrock", from: "lambda", to: "bedrock", label: "Nova Canvas" },
  { id: "lambda-images", from: "lambda", to: "s3Images", label: "PutObject", labelAt: 0.25 },
  {
    id: "lambda-agent",
    from: "lambda",
    to: "agentCore",
    label: "InvokeAgentRuntime",
  },
  {
    id: "agent-bedrock",
    from: "agentCore",
    to: "bedrock",
    label: "Claude Haiku",
  },
  { id: "agent-api", from: "agentCore", to: "httpApi", label: "tool calls", labelAt: 0.25 },
];

export const FLOWS: ArchFlow[] = [
  {
    id: "browse",
    label: "Browse the store",
    icon: "🛍️",
    description:
      "The SPA loads from S3, the product list comes from Aurora through the API, and product photos stream from the images bucket.",
    edges: [
      "user-cf",
      "cf-site",
      "cf-api",
      "api-lambda",
      "lambda-aurora",
      "cf-images",
    ],
  },
  {
    id: "signin",
    label: "Sign in",
    icon: "🔑",
    description:
      "The API exchanges email and password with Cognito for an ID token, then syncs the identity into the users table.",
    edges: [
      "user-cf",
      "cf-api",
      "api-lambda",
      "lambda-cognito",
      "lambda-aurora",
    ],
  },
  {
    id: "order",
    label: "Place an order",
    icon: "🚀",
    description:
      "API Gateway checks the Cognito token before the Lambda runs, then the order is written to Aurora in one transaction.",
    edges: [
      "user-cf",
      "cf-api",
      "api-cognito",
      "api-lambda",
      "lambda-secret",
      "lambda-aurora",
    ],
  },
  {
    id: "support",
    label: "Ask Orbit AI",
    icon: "💬",
    description:
      "The API invokes the AgentCore runtime; the agent thinks with Claude Haiku and looks up products and orders through the API.",
    edges: [
      "user-cf",
      "cf-api",
      "api-lambda",
      "lambda-agent",
      "agent-bedrock",
      "agent-api",
    ],
  },
  {
    id: "imagegen",
    label: "Generate an image",
    icon: "🎨",
    description:
      "An admin asks for a product image: Nova Canvas paints it and the Lambda stores the PNG in the images bucket.",
    edges: [
      "user-cf",
      "cf-api",
      "api-cognito",
      "api-lambda",
      "lambda-bedrock",
      "lambda-images",
    ],
  },
];

export const NODE_BY_ID: Record<NodeId, ArchNode> = Object.fromEntries(
  NODES.map((node) => [node.id, node]),
) as Record<NodeId, ArchNode>;

export const EDGE_BY_ID: Record<string, ArchEdge> = Object.fromEntries(
  EDGES.map((edge) => [edge.id, edge]),
);

interface Point {
  x: number;
  y: number;
}

export interface EdgeGeometry {
  d: string;
  mid: Point;
}

function cubicPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): Point {
  const u = 1 - t;
  return {
    x:
      u ** 3 * p0.x +
      3 * u * u * t * p1.x +
      3 * u * t * t * p2.x +
      t ** 3 * p3.x,
    y:
      u ** 3 * p0.y +
      3 * u * u * t * p1.y +
      3 * u * t * t * p2.y +
      t ** 3 * p3.y,
  };
}

/** Bezier from the side of `from` that faces `to`; vertical when the nodes share a column. */
export function edgeGeometry(edge: ArchEdge): EdgeGeometry {
  const a = NODE_BY_ID[edge.from];
  const b = NODE_BY_ID[edge.to];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const vertical = Math.abs(dx) < NODE_WIDTH;

  const start: Point = vertical
    ? { x: a.x, y: a.y + Math.sign(dy) * (NODE_HEIGHT / 2) }
    : { x: a.x + Math.sign(dx) * (NODE_WIDTH / 2), y: a.y };
  const end: Point = vertical
    ? { x: b.x, y: b.y - Math.sign(dy) * (NODE_HEIGHT / 2) }
    : { x: b.x - Math.sign(dx) * (NODE_WIDTH / 2), y: b.y };

  const c1: Point = vertical
    ? { x: start.x, y: (start.y + end.y) / 2 }
    : { x: (start.x + end.x) / 2, y: start.y };
  const c2: Point = vertical
    ? { x: end.x, y: (start.y + end.y) / 2 }
    : { x: (start.x + end.x) / 2, y: end.y };

  return {
    d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
    mid: cubicPoint(start, c1, c2, end, edge.labelAt ?? 0.5),
  };
}
