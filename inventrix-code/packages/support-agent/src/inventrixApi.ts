const DEFAULT_API_URL = 'http://localhost:3000';
const REQUEST_TIMEOUT_MS = 8000;

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
}

export interface Order {
  id: number;
  status: string;
  subtotal: number;
  gst: number;
  total: number;
  created_at: string;
}

export interface OrderDetail extends Order {
  items: {
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
  }[];
}

export class InventrixApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const baseUrl = (): string =>
  (process.env.INVENTRIX_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');

async function getJson<T>(path: string, authToken?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${baseUrl()}${path}`, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new InventrixApiError(
      body?.error ?? `Inventrix API returned ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export const listProducts = (): Promise<Product[]> =>
  getJson<Product[]>('/api/products');

export const getProduct = (id: number): Promise<Product> =>
  getJson<Product>(`/api/products/${id}`);

export const listOrders = (authToken: string): Promise<Order[]> =>
  getJson<Order[]>('/api/orders', authToken);

export const getOrder = (id: number, authToken: string): Promise<OrderDetail> =>
  getJson<OrderDetail>(`/api/orders/${id}`, authToken);
