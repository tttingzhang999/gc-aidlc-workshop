import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import cors from 'cors';
import { getDb } from './db/index.js';
import { initDb } from './db/schema.js';
import { setJwtSecret } from './middleware/auth.js';
import { resolveJwtSecret } from './secrets.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import analyticsRoutes from './routes/analytics.js';
import gomokuRoutes from './routes/gomoku.js';
import cartRoutes from './routes/cart.js';
import supportRoutes from './routes/support.js';

export interface AppOptions {
  staticImagesDir?: string;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  if (options.staticImagesDir) {
    app.use('/images', express.static(options.staticImagesDir));
  }

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/gomoku', gomokuRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/support', supportRoutes);

  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) return next(error);
      console.error('Unhandled request error', error);
      res.status(500).json({ error: 'Internal server error' });
    },
  );

  return app;
}

export async function bootstrap(): Promise<void> {
  const [jwtSecret, db] = await Promise.all([resolveJwtSecret(), getDb()]);
  setJwtSecret(jwtSecret);
  await initDb(db);
}
