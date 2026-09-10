import type { RequestHandler } from 'express';

import { env } from '../config/env.js';
import { metrics } from '../infrastructure/observability/metrics.js';

const uuidSegment = /\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi;
const numericSegment = /\/\d+(?=\/|$)/g;

function routeLabel(originalUrl: string): string {
  const pathname = new URL(originalUrl, 'http://localhost').pathname;
  return pathname.replace(uuidSegment, '/:id').replace(numericSegment, '/:id');
}

export const requestObservability: RequestHandler = (
  request,
  response,
  next,
) => {
  const startedAt = performance.now();
  let completed = false;
  metrics.startHttpRequest();

  const complete = (statusCode = response.statusCode) => {
    if (completed) return;
    completed = true;
    const durationMs = performance.now() - startedAt;
    metrics.finishHttpRequest(
      request.method,
      routeLabel(request.originalUrl),
      statusCode,
      durationMs / 1_000,
    );
    if (durationMs >= env.SLOW_REQUEST_THRESHOLD_MS) {
      request.log.warn(
        {
          durationMs: Math.round(durationMs),
          method: request.method,
          path: routeLabel(request.originalUrl),
          statusCode,
        },
        'Slow HTTP request',
      );
    }
  };

  response.once('finish', () => complete());
  response.once('close', () =>
    complete(response.writableEnded ? response.statusCode : 499),
  );
  next();
};
