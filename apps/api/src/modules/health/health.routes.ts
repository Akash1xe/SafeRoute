import type { Router } from 'express';
import { Router as createRouter } from 'express';

import { postgres } from '../../infrastructure/database/postgres.js';
import { redis } from '../../infrastructure/redis/redis.js';
import { createHealthService } from './health.service.js';

const healthService = createHealthService({
  checkPostgres: async () => {
    await postgres.query('SELECT 1');
  },
  checkRedis: async () => {
    if (redis.status === 'wait') await redis.connect();
    await redis.ping();
  },
});

export function healthRouter(): Router {
  const router = createRouter();

  router.get('/live', (_request, response) => {
    response.status(200).json({ data: healthService.live() });
  });

  router.get('/ready', async (_request, response) => {
    const health = await healthService.ready();
    response.status(health.status === 'up' ? 200 : 503).json({ data: health });
  });

  return router;
}
