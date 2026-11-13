import { Router } from 'express';
import { getDb } from '../db/index.js';
import { asyncRoute } from '../http.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { protectedRouteRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.get(
  '/dashboard',
  protectedRouteRateLimit,
  authenticate,
  requireAdmin,
  asyncRoute(async (req: AuthRequest, res) => {
    const db = await getDb();
    const [
      [totalRevenue],
      [totalOrders],
      [totalProducts],
      [lowStock],
      recentOrders,
      topProducts,
      ordersByStatus,
    ] = await Promise.all([
      db.query<{ revenue: number }>(
        "SELECT COALESCE(SUM(total), 0)::float8 as revenue FROM orders WHERE status != 'cancelled'",
      ),
      db.query<{ count: number }>('SELECT COUNT(*)::int as count FROM orders'),
      db.query<{ count: number }>(
        'SELECT COUNT(*)::int as count FROM products',
      ),
      db.query<{ count: number }>(
        'SELECT COUNT(*)::int as count FROM products WHERE stock < 10',
      ),
      db.query(`
      SELECT o.id, o.total, o.status, o.created_at, u.name as user_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC, o.id ASC
      LIMIT 10
    `),
      db.query(`
      SELECT p.name, SUM(oi.quantity)::int as total_sold, SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `),
      db.query(`
      SELECT status, COUNT(*)::int as count
      FROM orders
      GROUP BY status
    `),
    ]);

    res.json({
      summary: {
        totalRevenue: totalRevenue.revenue,
        totalOrders: totalOrders.count,
        totalProducts: totalProducts.count,
        lowStockItems: lowStock.count,
      },
      recentOrders,
      topProducts,
      ordersByStatus,
    });
  }),
);

router.get(
  '/inventory',
  protectedRouteRateLimit,
  authenticate,
  requireAdmin,
  asyncRoute(async (req: AuthRequest, res) => {
    const db = await getDb();
    const inventory = await db.query(`
    SELECT id, name, stock, price,
    CASE
      WHEN stock = 0 THEN 'out_of_stock'
      WHEN stock < 10 THEN 'low_stock'
      ELSE 'in_stock'
    END as status
    FROM products
    ORDER BY stock ASC, id ASC
  `);

    res.json(inventory);
  }),
);

export default router;
