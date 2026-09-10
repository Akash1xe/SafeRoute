import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { rateLimit } from 'express-rate-limit';

import { postgres } from '../../infrastructure/database/postgres.js';
import {
  authenticate,
  authorize,
  type RequestIdentity,
} from '../../middleware/authenticate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../middleware/validate.js';
import {
  confirmationSchema,
  createIncidentSchema,
  incidentIdSchema,
  moderateIncidentSchema,
  nearbyIncidentsSchema,
} from './incident.schemas.js';
import { IncidentRepository } from './incident.repository.js';
import { IncidentService } from './incident.service.js';

const incidents = new IncidentService(new IncidentRepository(postgres));

const reportCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many incident reports submitted',
    },
  },
});

export function incidentRouter(): Router {
  const router = createRouter();

  router.post(
    '/',
    authenticate,
    reportCreationLimiter,
    validateBody(createIncidentSchema),
    asyncHandler(async (request, response) => {
      const incident = await incidents.create(
        response.locals.auth as RequestIdentity,
        request.body,
      );
      response.status(201).json({ data: { incident } });
    }),
  );

  router.get(
    '/nearby',
    validateQuery(nearbyIncidentsSchema),
    asyncHandler(async (request, response) => {
      const query = nearbyIncidentsSchema.parse(request.query);
      const results = await incidents.nearby(query);
      response.status(200).json({
        data: { incidents: results },
        pagination: {
          page: query.page,
          limit: query.limit,
          returned: results.length,
        },
      });
    }),
  );

  router.get(
    '/:id',
    validateParams(incidentIdSchema),
    asyncHandler(async (request, response) => {
      response
        .status(200)
        .json({ data: { incident: await incidents.get(request.params.id) } });
    }),
  );

  router.post(
    '/:id/evaluate',
    authenticate,
    validateParams(incidentIdSchema),
    validateBody(confirmationSchema),
    asyncHandler(async (request, response) => {
      const incident = await incidents.evaluate(
        response.locals.auth as RequestIdentity,
        request.params.id,
        request.body.decision,
      );
      response.status(200).json({ data: { incident } });
    }),
  );

  for (const [path, decision] of [
    ['confirm', 'CONFIRM'],
    ['dispute', 'DISPUTE'],
  ] as const) {
    router.post(
      `/:id/${path}`,
      authenticate,
      validateParams(incidentIdSchema),
      asyncHandler(async (request, response) => {
        const incident = await incidents.evaluate(
          response.locals.auth as RequestIdentity,
          request.params.id,
          decision,
        );
        response.status(200).json({ data: { incident } });
      }),
    );
  }

  router.patch(
    '/:id/status',
    authenticate,
    authorize('MODERATOR', 'ADMIN'),
    validateParams(incidentIdSchema),
    validateBody(moderateIncidentSchema),
    asyncHandler(async (request, response) => {
      const incident = await incidents.moderate(
        request.params.id,
        request.body.status,
      );
      response.status(200).json({ data: { incident } });
    }),
  );

  return router;
}
