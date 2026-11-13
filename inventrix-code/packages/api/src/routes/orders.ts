import { Router } from 'express';
import { getDb } from '../db/index.js';
import { asyncRoute, parseId } from '../http.js';
import {
  authenticate,
  identify,
  requireAdmin,
  AuthRequest,
} from '../middleware/auth.js';
import { protectedRouteRateLimit } from '../middleware/rateLimit.js';
import { unitPrice } from '../services/pricing.js';

interface CartLine {
  product_id: number;
  quantity: number;
  penalty: number;
  price: number;
  stock: number;
}

class CheckoutError extends Error {}

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

// Checkout: only items in the server-side cart can be ordered. Client-sent items are ignored.
router.post(
  '/',
  protectedRouteRateLimit,
  identify,
  asyncRoute(async (req: AuthRequest, res) => {
    // Browsing and playing work as a guest, but checkout requires a signed-in user.
    if (!req.user) {
      return res.status(401).json({ error: 'Please log in to checkout' });
    }
    const userId = req.user.id;
    const owner = `u:${userId}`;
    const db = await getDb();

    try {
      const order = await db.transaction(async (tx) => {
        // Lock the products being bought so concurrent checkouts cannot oversell.
        const cart = await tx.query<CartLine>(
          `
      SELECT c.product_id, c.quantity, c.penalty, p.price, p.stock
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.owner = $1::text
      ORDER BY c.id
      FOR UPDATE OF p
    `,
          [owner],
        );

        if (cart.length === 0) throw new CheckoutError('Cart is empty');

        // Normal and penalty lines of the same product share stock.
        const requested = new Map<number, number>();
        for (const line of cart) {
          const total = (requested.get(line.product_id) ?? 0) + line.quantity;
          requested.set(line.product_id, total);
          if (line.stock < total) {
            throw new CheckoutError(
              `Insufficient stock for product ${line.product_id}`,
            );
          }
        }

        const lines = cart.map((l) => ({
          ...l,
          unit: unitPrice(l.price, l.penalty),
        }));
        const subtotal = lines.reduce((sum, l) => sum + l.unit * l.quantity, 0);
        const gst = subtotal * 0.1;
        const total = subtotal + gst;

        const [created] = await tx.query<{ id: number }>(
          "INSERT INTO orders (user_id, subtotal, gst, total, status) VALUES ($1::int, $2::float8, $3::float8, $4::float8, 'pending') RETURNING id",
          [userId, subtotal, gst, total],
        );

        for (const l of lines) {
          await tx.query(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1::int, $2::int, $3::int, $4::float8)',
            [created.id, l.product_id, l.quantity, l.unit],
          );
          await tx.query(
            'UPDATE products SET stock = stock - $1::int WHERE id = $2::int',
            [l.quantity, l.product_id],
          );
        }
        await tx.query('DELETE FROM cart_items WHERE owner = $1::text', [
          owner,
        ]);

        return { id: created.id, subtotal, gst, total };
      });

      res.status(201).json({ ...order, status: 'pending' });
    } catch (error) {
      if (error instanceof CheckoutError) {
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
