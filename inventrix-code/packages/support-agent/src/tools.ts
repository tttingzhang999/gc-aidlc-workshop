import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import {
  InventrixApiError,
  getOrder,
  getProduct,
  listOrders,
  listProducts,
  type Product,
} from './inventrixApi.js';

const MAX_SEARCH_RESULTS = 8;

interface ToolFailure {
  error: string;
}

function toFailure(error: unknown): ToolFailure {
  if (error instanceof InventrixApiError) {
    return { error: `${error.message} (HTTP ${error.status})` };
  }
  console.error('Inventrix tool call failed', error);
  return { error: 'The store service is temporarily unavailable.' };
}

const compactProduct = (product: Product) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: product.price,
  stock: product.stock,
  inStock: product.stock > 0,
});

function matchesQuery(product: Product, terms: readonly string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = `${product.name} ${product.description ?? ''}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

const searchProducts = tool({
  name: 'search_products',
  description:
    'Search the Inventrix catalog. Matches any keyword against product names and descriptions (English). ' +
    'Leave query empty to list the whole catalog. Returns price in USD and current stock.',
  inputSchema: z.object({
    query: z
      .string()
      .max(200)
      .optional()
      .describe('Space-separated English keywords, e.g. "wireless mouse".'),
    maxPrice: z.number().positive().optional(),
    inStockOnly: z.boolean().optional(),
  }),
  callback: async ({ query, maxPrice, inStockOnly }) => {
    try {
      const terms = (query ?? '')
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 1);
      const matches = (await listProducts())
        .filter((p) => matchesQuery(p, terms))
        .filter((p) => maxPrice === undefined || p.price <= maxPrice)
        .filter((p) => !inStockOnly || p.stock > 0);
      return {
        totalMatches: matches.length,
        products: matches.slice(0, MAX_SEARCH_RESULTS).map(compactProduct),
      };
    } catch (error) {
      return toFailure(error);
    }
  },
});

const getProductDetails = tool({
  name: 'get_product',
  description: 'Get one product by its numeric ID, including price and stock.',
  inputSchema: z.object({ productId: z.number().int().positive() }),
  callback: async ({ productId }) => {
    try {
      return compactProduct(await getProduct(productId));
    } catch (error) {
      return toFailure(error);
    }
  },
});

function orderTools(authToken: string) {
  const listMyOrders = tool({
    name: 'list_my_orders',
    description:
      'List the signed-in customer’s orders, newest first, with status and total in USD.',
    inputSchema: z.object({}),
    callback: async () => {
      try {
        const orders = await listOrders(authToken);
        return {
          orders: orders.slice(0, 10).map((o) => ({
            id: o.id,
            status: o.status,
            total: o.total,
            createdAt: o.created_at,
          })),
          totalOrders: orders.length,
        };
      } catch (error) {
        return toFailure(error);
      }
    },
  });

  const getOrderDetails = tool({
    name: 'get_order',
    description:
      'Get one of the signed-in customer’s orders by ID, with line items, subtotal, GST and total.',
    inputSchema: z.object({ orderId: z.number().int().positive() }),
    callback: async ({ orderId }) => {
      try {
        const order = await getOrder(orderId, authToken);
        return {
          id: order.id,
          status: order.status,
          createdAt: order.created_at,
          subtotal: order.subtotal,
          gst: order.gst,
          total: order.total,
          items: order.items.map((item) => ({
            productId: item.product_id,
            name: item.product_name,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        };
      } catch (error) {
        return toFailure(error);
      }
    },
  });

  return [listMyOrders, getOrderDetails];
}

export function buildTools(authToken: string | undefined) {
  const catalog = [searchProducts, getProductDetails];
  return authToken ? [...catalog, ...orderTools(authToken)] : catalog;
}
