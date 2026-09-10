import type { Router } from 'express';
import { Router as createRouter } from 'express';

import { postgres } from '../../infrastructure/database/postgres.js';
import { redis } from '../../infrastructure/redis/redis.js';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { createApiRateLimiter } from '../../middleware/rate-limit.js';
import { validateBody } from '../../middleware/validate.js';
import { RoadGraphRepository } from './road-graph.repository.js';
import { calculateRouteSchema } from './route.schemas.js';
import { RouteService } from './route.service.js';
import { RedisRouteCache } from './route-cache.js';

const graphRepository = new RoadGraphRepository(postgres);
const routes = new RouteService(
  graphRepository,
  undefined,
  new RedisRouteCache(redis, env.ROUTE_CACHE_TTL_SECONDS),
);

const routeCalculationLimiter = createApiRateLimiter(
  60 * 1000,
  60,
  'Too many route calculations',
);

export function routeRouter(): Router {
  const router = createRouter();

  router.get(
    '/nodes',
    asyncHandler(async (_request, response) => {
      response
        .status(200)
        .json({ data: { nodes: await graphRepository.listNodes() } });
    }),
  );

  router.post(
    '/calculate',
    routeCalculationLimiter,
    validateBody(calculateRouteSchema),
    asyncHandler(async (request, response) => {
      response
        .status(200)
        .json({ data: { routes: await routes.calculate(request.body) } });
    }),
  );

  return router;
}
