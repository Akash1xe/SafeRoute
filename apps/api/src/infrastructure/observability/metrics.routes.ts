import { createHash, timingSafeEqual } from 'node:crypto';

import type { Router } from 'express';
import { Router as createRouter } from 'express';

import { env } from '../../config/env.js';
import { metrics } from './metrics.js';

function tokenMatches(
  candidate: string | undefined,
  expected: string,
): boolean {
  if (!candidate?.startsWith('Bearer ')) return false;
  const suppliedHash = createHash('sha256').update(candidate.slice(7)).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}

export function metricsRouter(expectedToken = env.METRICS_TOKEN): Router {
  const router = createRouter();

  router.get('/', (request, response) => {
    if (!expectedToken) {
      response.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          requestId: String(request.id),
        },
      });
      return;
    }
    if (!tokenMatches(request.headers.authorization, expectedToken)) {
      response.status(401).json({
        error: {
          code: 'METRICS_AUTH_REQUIRED',
          message: 'A valid metrics bearer token is required',
          requestId: String(request.id),
        },
      });
      return;
    }

    response
      .status(200)
      .set({
        'cache-control': 'no-store',
        'content-type': 'text/plain; version=0.0.4; charset=utf-8',
      })
      .send(metrics.render());
  });

  return router;
}
