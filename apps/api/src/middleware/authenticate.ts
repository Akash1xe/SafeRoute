import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import type { UserRole } from '../modules/users/user.types.js';

export interface RequestIdentity {
  userId: string;
  role: UserRole;
}

export const authenticate: RequestHandler = async (request, response, next) => {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    next(
      new AppError(
        401,
        'AUTHENTICATION_REQUIRED',
        'A Bearer access token is required',
      ),
    );
    return;
  }

  try {
    response.locals.auth = await verifyAccessToken(token);
    next();
  } catch {
    next(
      new AppError(
        401,
        'INVALID_ACCESS_TOKEN',
        'Access token is invalid or expired',
      ),
    );
  }
};

export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (_request, response, next) => {
    const identity = response.locals.auth as RequestIdentity | undefined;
    if (!identity || !allowedRoles.includes(identity.role)) {
      next(
        new AppError(
          403,
          'FORBIDDEN',
          'You do not have permission for this action',
        ),
      );
      return;
    }
    next();
  };
}
