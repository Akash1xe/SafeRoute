import { rateLimit } from 'express-rate-limit';

export function createApiRateLimiter(
  windowMs: number,
  limit: number,
  message: string,
) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (request, response) => {
      response.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message,
          requestId: String(request.id),
        },
      });
    },
  });
}
