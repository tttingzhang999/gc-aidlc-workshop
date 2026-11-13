import { Router } from 'express';
import { getDb } from '../db/index.js';
import { asyncRoute, parseId } from '../http.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { generateProductImage } from '../services/imageGenerator.js';
import { protectedRouteRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const db = await getDb();
    const products = await db.query(
      'SELECT * FROM products ORDER BY created_at DESC, id ASC',
    );
    res.json(products);
  }),
);

router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    const db = await getDb();
    const [product] =
      id === null
        ? []
        : await db.query('SELECT * FROM products WHERE id = $1::int', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  }),
);

router.post(
  '/',
  protectedRouteRateLimit,
  authenticate,
  requireAdmin,
  asyncRoute(async (req: AuthRequest, res) => {
    const { name, description, price, stock, image_url } = req.body;
    const db = await getDb();
    const [created] = await db.query<{ id: number }>(
      'INSERT INTO products (name, description, price, stock, image_url) VALUES ($1::text, $2::text, $3::float8, $4::int, $5::text) RETURNING id',
      [name, description, price, stock, image_url],
    );
    res
      .status(201)
      .json({ id: created.id, name, description, price, stock, image_url });
  }),
);

router.put(
  '/:id',
  protectedRouteRateLimit,
  authenticate,
  requireAdmin,
  asyncRoute(async (req: AuthRequest, res) => {
    const { name, description, price, stock, image_url } = req.body;
    const id = parseId(req.params.id);
    if (id !== null) {
      const db = await getDb();
      await db.query(
        'UPDATE products SET name = $1::text, description = $2::text, price = $3::float8, stock = $4::int, image_url = $5::text WHERE id = $6::int',
        [name, description, price, stock, image_url, id],
      );
    }
    res.json({ id: req.params.id, name, description, price, stock, image_url });
  }),
);

router.delete(
  '/:id',
  protectedRouteRateLimit,
  authenticate,
  requireAdmin,
  asyncRoute(async (req: AuthRequest, res) => {
    const id = parseId(req.params.id);
    if (id !== null) {
      const db = await getDb();
      await db.query('DELETE FROM products WHERE id = $1::int', [id]);
    }
    res.status(204).send();
  }),
);

router.post(
  '/generate-image',
  protectedRouteRateLimit,
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { productName, description } = req.body;
      const imageUrl = await generateProductImage(productName, description);
      res.json({ imageUrl });
    } catch (error) {
      console.error('Image generation failed', error);
      res.status(500).json({ error: 'Image generation failed' });
    }
  },
);

export default router;
