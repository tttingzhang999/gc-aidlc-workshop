import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { mergeGuestCart } from '../services/cart.js';

let jwtSecret: string | undefined;

export function setJwtSecret(secret: string): void {
  jwtSecret = secret;
}

function getJwtSecret(): string {
  if (!jwtSecret) throw new Error('JWT secret has not been loaded');
  return jwtSecret;
}

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
  owner?: string; // 'u:<userId>' for signed-in users, 'g:<guestId>' for guests
}

const GUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: number;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export interface OptionalAuthRequest extends AuthRequest {
  token?: string;
}

// Guests are allowed through; an invalid token is treated as a guest rather than rejected.
export const optionalAuthenticate = (
  req: OptionalAuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      req.user = jwt.verify(token, getJwtSecret()) as {
        id: number;
        email: string;
        role: string;
      };
      req.token = token;
    } catch {
      req.user = undefined;
    }
  }
  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const generateToken = (user: {
  id: number;
  email: string;
  role: string;
}) => {
  return jwt.sign(user, getJwtSecret(), { expiresIn: '7d' });
};

// Accepts either a signed-in user (Bearer token) or an anonymous guest (X-Guest-Id header).
// When both are present, the guest's cart is merged into the user's cart.
export const identify = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const guestHeader = req.headers['x-guest-id'];
  const guestId =
    typeof guestHeader === 'string' && GUEST_ID_PATTERN.test(guestHeader)
      ? guestHeader
      : null;

  let user: AuthRequest['user'];
  if (token) {
    try {
      user = jwt.verify(token, getJwtSecret()) as {
        id: number;
        email: string;
        role: string;
      };
    } catch {
      // Invalid or expired token: fall through and treat the request as a guest if possible
    }
  }

  if (user) {
    req.user = user;
    req.owner = `u:${user.id}`;
    if (!guestId) return next();
    // Merge before continuing so the handler already sees the combined cart.
    mergeGuestCart(`g:${guestId}`, req.owner).then(() => next(), next);
    return;
  }

  if (guestId) {
    req.owner = `g:${guestId}`;
    return next();
  }
  res.status(401).json({ error: 'Authentication or guest id required' });
};
