import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { createApiRateLimiter } from './middleware/rate-limit.js';
import { resolveRequestId } from './middleware/request-id.js';
import { requestObservability } from './middleware/request-observability.js';
import { metricsRouter } from './infrastructure/observability/metrics.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { incidentRouter } from './modules/incidents/incident.routes.js';
import { routeRouter } from './modules/routes/route.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(
    pinoHttp({
      logger,
      genReqId(request, response) {
        const requestId = resolveRequestId(request.headers['x-request-id']);
        response.setHeader('x-request-id', requestId);
        return requestId;
      },
    }),
  );
  app.use(requestObservability);
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  app.use(cookieParser());

  app.use('/api/v1/health', healthRouter());
  app.use('/api/v1/metrics', metricsRouter());
  app.use(
    createApiRateLimiter(
      env.API_RATE_LIMIT_WINDOW_MS,
      env.API_RATE_LIMIT_MAX,
      'Too many API requests',
    ),
  );
  app.use('/api/v1/auth', authRouter());
  app.use('/api/v1/incidents', incidentRouter());
  app.use('/api/v1/routes', routeRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
