import type { ErrorRequestHandler } from 'express';

import { logger } from '../config/logger.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  void _next;
  logger.error({ error, requestId: String(request.id) }, 'Unhandled request error');

  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      requestId: String(request.id),
    },
  });
};
