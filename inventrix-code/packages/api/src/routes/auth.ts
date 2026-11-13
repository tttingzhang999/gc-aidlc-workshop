import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { asyncRoute } from '../http.js';
import { generateToken } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';

interface UserRow {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
}

const router = Router();

router.post(
  '/login',
  authRateLimit,
  asyncRoute(async (req, res) => {
    const { email, password } = req.body;

    const db = await getDb();
    const [user] = await db.query<UserRow>(
      'SELECT * FROM users WHERE email = $1::text',
      [email],
    );

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  }),
);

router.post(
  '/register',
  authRateLimit,
  asyncRoute(async (req, res) => {
    const { email, password, name } = req.body;

    const db = await getDb();
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = $1::text',
      [email],
    );
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [created] = await db.query<{ id: number }>(
      "INSERT INTO users (email, password, name, role) VALUES ($1::text, $2::text, $3::text, 'customer') RETURNING id",
      [email, hashedPassword, name],
    );

    const token = generateToken({ id: created.id, email, role: 'customer' });

    res.status(201).json({
      token,
      user: { id: created.id, email, name, role: 'customer' },
    });
  }),
);

export default router;
