import { Router, type Response } from 'express';
import { signIn, signUp, verifyIdToken } from '../cognito.js';
import { asyncRoute } from '../http.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { type AppUser, syncUser } from '../users.js';

interface AuthError {
  status: number;
  error: string;
}

const COGNITO_ERRORS: Readonly<Record<string, AuthError>> = {
  UsernameExistsException: { status: 400, error: 'Email already registered' },
  InvalidPasswordException: {
    status: 400,
    error: 'Password must be at least 8 characters',
  },
  NotAuthorizedException: { status: 401, error: 'Invalid credentials' },
  UserNotFoundException: { status: 401, error: 'Invalid credentials' },
  UserNotConfirmedException: { status: 401, error: 'Invalid credentials' },
  TooManyRequestsException: {
    status: 429,
    error: 'Too many requests, please try again later',
  },
  LimitExceededException: {
    status: 429,
    error: 'Too many requests, please try again later',
  },
};

function toAuthError(error: unknown): AuthError | undefined {
  if (!(error instanceof Error)) return undefined;
  if (error.name === 'InvalidParameterException') {
    return { status: 400, error: error.message };
  }
  return COGNITO_ERRORS[error.name];
}

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

async function respondWithSession(
  res: Response,
  status: number,
  authenticate: () => Promise<string>,
): Promise<void> {
  try {
    const token = await authenticate();
    const user: AppUser = await syncUser(await verifyIdToken(token));
    res.status(status).json({ token, user });
  } catch (error) {
    const authError = toAuthError(error);
    if (!authError) throw error;
    res.status(authError.status).json({ error: authError.error });
  }
}

const router = Router();

router.post(
  '/login',
  authRateLimit,
  asyncRoute(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!nonEmpty(email) || !nonEmpty(password)) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    await respondWithSession(res, 200, () => signIn(email.trim(), password));
  }),
);

router.post(
  '/register',
  authRateLimit,
  asyncRoute(async (req, res) => {
    const { email, password, name } = req.body ?? {};
    if (!nonEmpty(email) || !nonEmpty(password) || !nonEmpty(name)) {
      return res
        .status(400)
        .json({ error: 'Email, password and name are required' });
    }
    await respondWithSession(res, 201, async () => {
      await signUp(email.trim(), password, name.trim());
      return signIn(email.trim(), password);
    });
  }),
);

export default router;
