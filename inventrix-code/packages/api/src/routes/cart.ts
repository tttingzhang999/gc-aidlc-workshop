import { Router } from 'express';
import { getDb } from '../db/index.js';
import { asyncRoute, parseId } from '../http.js';
import { identify, AuthRequest } from '../middleware/auth.js';
import { protectedRouteRateLimit } from '../middleware/rateLimit.js';
import {
  isPriceTier,
  PRICE_TIER,
  tierMultiplier,
  unitPrice,
} from '../services/pricing.js';

interface CartRow {
  product_id: number;
  quantity: number;
  penalty: number;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
}

const router = Router();

router.use(protectedRouteRateLimit, identify);

router.get(
  '/',
  asyncRoute(async (req: AuthRequest, res) => {
    const db = await getDb();
    const rows = await db.query<CartRow>(
      `
    SELECT c.product_id, c.quantity, c.penalty, p.name, p.price, p.stock, p.image_url
    FROM cart_items c
    JOIN products p ON c.product_id = p.id
    WHERE c.owner = $1::text
    ORDER BY c.id
  `,
      [req.owner],
    );
    res.json(
      rows.map((r) => ({
        product_id: r.product_id,
        name: r.name,
        image_url: r.image_url,
        stock: r.stock,
        quantity: r.quantity,
        penalty: r.penalty,
        multiplier: tierMultiplier(r.penalty),
        price: unitPrice(r.price, r.penalty),
      })),
    );
  }),
);

router.delete(
  '/:productId',
  asyncRoute(async (req: AuthRequest, res) => {
    const productId = parseId(req.params.productId);
    const requested = Number(req.query.penalty ?? PRICE_TIER.normal);
    const penalty = isPriceTier(requested) ? requested : PRICE_TIER.normal;
    if (productId !== null) {
      const db = await getDb();
      await db.query(
        'DELETE FROM cart_items WHERE owner = $1::text AND product_id = $2::int AND penalty = $3::int',
        [req.owner, productId, penalty],
      );
    }
    res.status(204).end();
  }),
);

export default router;
