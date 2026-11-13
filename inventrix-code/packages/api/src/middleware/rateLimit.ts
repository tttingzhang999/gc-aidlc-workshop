import rateLimit from 'express-rate-limit';

// In Lambda each execution environment keeps its own in-memory counter and only sees the
// CloudFront edge IP, so throttling there is done by API Gateway and WAF instead.
const skipInLambda = (): boolean =>
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInLambda,
  message: {
    error: 'Too many authentication attempts, please try again later',
  },
});

export const supportChatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInLambda,
  message: {
    error: 'Too many messages to the assistant, please try again later',
  },
});

export const protectedRouteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInLambda,
  message: { error: 'Too many requests, please try again later' },
});

export const gameRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInLambda,
  message: { error: 'Too many requests, please try again later' },
});
