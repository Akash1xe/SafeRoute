import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { rateLimit } from 'express-rate-limit';

import { postgres } from '../../infrastructure/database/postgres.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validateBody } from '../../middleware/validate.js';
import { RoadGraphRepository } from './road-graph.repository.js';
import { calculateRouteSchema } from './route.schemas.js';
import { RouteService } from './route.service.js';

const graphRepository = new RoadGraphRepository(postgres);
const routes = new RouteService(graphRepository);

const routeCalculationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many route calculations' } },
});

export function routeRouter(): Router {
  const router = createRouter();

  router.get(
    '/nodes',
    asyncHandler(async (_request, response) => {
      response.status(200).json({ data: { nodes: await graphRepository.listNodes() } });
    }),
  );

  router.post(
    '/calculate',
    routeCalculationLimiter,
    validateBody(calculateRouteSchema),
    asyncHandler(async (request, response) => {
      response.status(200).json({ data: { routes: await routes.calculate(request.body) } });
    }),
  );

  return router;
}
