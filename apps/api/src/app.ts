import { randomUUID } from 'node:crypto';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { incidentRouter } from './modules/incidents/incident.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(
    pinoHttp({
      logger,
      genReqId(request, response) {
        const requestId =
          request.headers['x-request-id']?.toString() ?? randomUUID();
        response.setHeader('x-request-id', requestId);
        return requestId;
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api/v1/health', healthRouter());
  app.use('/api/v1/auth', authRouter());
  app.use('/api/v1/incidents', incidentRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
