import type { Request, Response, NextFunction } from 'express';
import { type CognitoIdentity, verifyIdToken } from '../cognito.js';
import { mergeGuestCart } from '../services/cart.js';
import { type AppUser, syncUser } from '../users.js';

export interface AuthRequest extends Request {
  user?: AppUser;
  owner?: string; // 'u:<userId>' for signed-in users, 'g:<guestId>' for guests
}

const GUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

const bearerToken = (req: Request): string | undefined =>
  req.headers.authorization?.replace('Bearer ', '') || undefined;

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let identity: CognitoIdentity;
  try {
    identity = await verifyIdToken(token);
  } catch (error) {
    console.warn('Rejected ID token', error);
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    req.user = await syncUser(identity);
    next();
  } catch (error) {
    next(error);
  }
};

export interface OptionalAuthRequest extends AuthRequest {
  token?: string;
}

// Guests are allowed through; an invalid token is treated as a guest rather than rejected.
export const optionalAuthenticate = async (
  req: OptionalAuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const token = bearerToken(req);
  try {
    const identity = await verifiedIdentity(token);
    if (identity) {
      req.user = await syncUser(identity);
      req.token = token;
    }
    next();
  } catch (error) {
    next(error);
  }
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

async function verifiedIdentity(
  token: string | undefined,
): Promise<CognitoIdentity | undefined> {
  if (!token) return undefined;
  try {
    return await verifyIdToken(token);
  } catch {
    // Invalid or expired token: the caller treats the request as a guest if possible
    return undefined;
  }
}

// Accepts either a signed-in user (Bearer token) or an anonymous guest (X-Guest-Id header).
// When both are present, the guest's cart is merged into the user's cart.
export const identify = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const guestHeader = req.headers['x-guest-id'];
  const guestId =
    typeof guestHeader === 'string' && GUEST_ID_PATTERN.test(guestHeader)
      ? guestHeader
      : null;

  try {
    const identity = await verifiedIdentity(bearerToken(req));
    if (identity) {
      req.user = await syncUser(identity);
      req.owner = `u:${req.user.id}`;
      // Merge before continuing so the handler already sees the combined cart.
      if (guestId) await mergeGuestCart(`g:${guestId}`, req.owner);
      return next();
    }
  } catch (error) {
    return next(error);
  }

  if (guestId) {
    req.owner = `g:${guestId}`;
    return next();
  }
  res.status(401).json({ error: 'Authentication or guest id required' });
};
