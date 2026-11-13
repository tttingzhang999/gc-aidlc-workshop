import { Router } from 'express';
import { getDb } from '../db/index.js';
import { asyncRoute, parseId } from '../http.js';
import { identify, AuthRequest } from '../middleware/auth.js';
import { protectedRouteRateLimit } from '../middleware/rateLimit.js';
import { addToCart } from '../services/cart.js';
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

const MAX_LINES = 256;
const MAX_LINE_QUANTITY = 256;

// Add the products collected in a Snake run. `penalty: true` (a lost run) uses the "lost" price
// tier (10x list price). Each line is capped at the product's stock; sold-out products are skipped.
router.post(
  '/items',
  asyncRoute(async (req: AuthRequest, res) => {
    const rawItems: unknown = req.body?.items;
    if (
      !Array.isArray(rawItems) ||
      rawItems.length === 0 ||
      rawItems.length > MAX_LINES
    ) {
      return res.status(400).json({ error: 'Invalid items' });
    }
    const counts = new Map<number, number>();
    for (const item of rawItems) {
      const productId = Number(item?.product_id);
      const quantity = Number(item?.quantity);
      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        quantity > MAX_LINE_QUANTITY
      ) {
        return res.status(400).json({ error: 'Invalid items' });
      }
      counts.set(productId, (counts.get(productId) ?? 0) + quantity);
    }
    const penalty =
      req.body?.penalty === true ? PRICE_TIER.lost : PRICE_TIER.normal;
    const owner = req.owner as string;

    const db = await getDb();
    const added = await db.transaction(async (tx) => {
      const lines: { product_id: number; quantity: number }[] = [];
      for (const [productId, count] of counts) {
        const quantity = await addToCart(tx, owner, productId, count, penalty);
        if (quantity !== null) lines.push({ product_id: productId, quantity });
      }
      return lines;
    });
    res.json({ added, penalty: !!penalty });
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
