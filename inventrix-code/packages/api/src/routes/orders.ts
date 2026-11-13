import { Router } from 'express';
import { getDb } from '../db/index.js';
import { asyncRoute, parseId } from '../http.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { protectedRouteRateLimit } from '../middleware/rateLimit.js';

interface OrderItemInput {
  product_id: unknown;
  quantity: number;
}

interface OrderLine {
  productId: number;
  quantity: number;
  price: number;
}

class InsufficientStockError extends Error {
  constructor(readonly productId: unknown) {
    super(`Insufficient stock for product ${productId}`);
  }
}

const toProductId = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value)
    ? value
    : parseId(String(value));

const router = Router();

router.get(
  '/',
  protectedRouteRateLimit,
  authenticate,
  asyncRoute(async (req: AuthRequest, res) => {
    const db = await getDb();
    const orders =
      req.user?.role === 'admin'
        ? await db.query(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC, o.id ASC
    `)
        : await db.query(
            'SELECT * FROM orders WHERE user_id = $1::int ORDER BY created_at DESC, id ASC',
            [req.user?.id],
          );
    res.json(orders);
  }),
);

router.get(
  '/:id',
  protectedRouteRateLimit,
  authenticate,
  asyncRoute(async (req: AuthRequest, res) => {
    const id = parseId(req.params.id);
    const db = await getDb();
    const [order] =
      id === null
        ? []
        : await db.query<{ user_id: number }>(
            `
    SELECT o.*, u.name as user_name, u.email as user_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = $1::int
  `,
            [id],
          );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user?.role !== 'admin' && order.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const items = await db.query(
      `
    SELECT oi.*, p.name as product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1::int
  `,
      [id],
    );

    res.json({ ...order, items });
  }),
);

router.post(
  '/',
  protectedRouteRateLimit,
  authenticate,
  asyncRoute(async (req: AuthRequest, res) => {
    const items: OrderItemInput[] = req.body.items;
    const db = await getDb();

    try {
      const order = await db.transaction(async (tx) => {
        const lines: OrderLine[] = [];
        for (const item of items) {
          const productId = toProductId(item.product_id);
          const [product] =
            productId === null
              ? []
              : await tx.query<{ price: number; stock: number }>(
                  'SELECT price, stock FROM products WHERE id = $1::int FOR UPDATE',
                  [productId],
                );
          if (productId === null || !product || product.stock < item.quantity) {
            throw new InsufficientStockError(item.product_id);
          }
          await tx.query(
            'UPDATE products SET stock = stock - $1::int WHERE id = $2::int',
            [item.quantity, productId],
          );
          lines.push({
            productId,
            quantity: item.quantity,
            price: product.price,
          });
        }

        const subtotal = lines.reduce(
          (sum, line) => sum + line.price * line.quantity,
          0,
        );
        const gst = subtotal * 0.1;
        const total = subtotal + gst;

        const [created] = await tx.query<{ id: number }>(
          "INSERT INTO orders (user_id, subtotal, gst, total, status) VALUES ($1::int, $2::float8, $3::float8, $4::float8, 'pending') RETURNING id",
          [req.user?.id, subtotal, gst, total],
        );

        for (const line of lines) {
          await tx.query(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1::int, $2::int, $3::int, $4::float8)',
            [created.id, line.productId, line.quantity, line.price],
          );
        }

        return { id: created.id, subtotal, gst, total };
      });

      res.status(201).json({ ...order, status: 'pending' });
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }
  }),
);

router.patch(
  '/:id/status',
  protectedRouteRateLimit,
  authenticate,
  requireAdmin,
  asyncRoute(async (req: AuthRequest, res) => {
    const { status } = req.body;
    const id = parseId(req.params.id);
    if (id !== null) {
      const db = await getDb();
      await db.query('UPDATE orders SET status = $1::text WHERE id = $2::int', [
        status,
        id,
      ]);
    }
    res.json({ id: req.params.id, status });
  }),
);

export default router;
