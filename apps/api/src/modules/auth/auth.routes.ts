import type { CookieOptions, Router } from 'express';
import { Router as createRouter } from 'express';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { postgres } from '../../infrastructure/database/postgres.js';
import {
  authenticate,
  type RequestIdentity,
} from '../../middleware/authenticate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { createApiRateLimiter } from '../../middleware/rate-limit.js';
import { validateBody } from '../../middleware/validate.js';
import { UserRepository } from '../users/user.repository.js';
import { toPublicUser } from '../users/user.types.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import { SessionRepository } from './session.repository.js';

const users = new UserRepository(postgres);
const auth = new AuthService(users, new SessionRepository(postgres));
const REFRESH_COOKIE = 'saferoute_refresh';
const authAttemptLimiter = createApiRateLimiter(
  15 * 60 * 1000,
  env.AUTH_RATE_LIMIT_MAX,
  'Too many authentication attempts',
);

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.COOKIE_SECURE,
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

export function authRouter(): Router {
  const router = createRouter();

  router.post(
    '/register',
    authAttemptLimiter,
    validateBody(registerSchema),
    asyncHandler(async (request, response) => {
      const result = await auth.register(request.body);
      response.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
      response
        .status(201)
        .json({ data: { accessToken: result.accessToken, user: result.user } });
    }),
  );

  router.post(
    '/login',
    authAttemptLimiter,
    validateBody(loginSchema),
    asyncHandler(async (request, response) => {
      const result = await auth.login(request.body);
      response.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
      response
        .status(200)
        .json({ data: { accessToken: result.accessToken, user: result.user } });
    }),
  );

  router.post(
    '/refresh',
    authAttemptLimiter,
    asyncHandler(async (request, response) => {
      const token = request.cookies[REFRESH_COOKIE] as string | undefined;
      if (!token)
        throw new AppError(
          401,
          'REFRESH_TOKEN_REQUIRED',
          'Refresh cookie is required',
        );
      const result = await auth.refresh(token);
      response.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
      response
        .status(200)
        .json({ data: { accessToken: result.accessToken, user: result.user } });
    }),
  );

  router.post(
    '/logout',
    asyncHandler(async (request, response) => {
      await auth.logout(request.cookies[REFRESH_COOKIE] as string | undefined);
      response.clearCookie(REFRESH_COOKIE, cookieOptions);
      response.status(204).send();
    }),
  );

  router.get(
    '/me',
    authenticate,
    asyncHandler(async (_request, response) => {
      const identity = response.locals.auth as RequestIdentity;
      const user = await users.findById(identity.userId);
      if (!user)
        throw new AppError(404, 'USER_NOT_FOUND', 'User no longer exists');
      response.status(200).json({ data: { user: toPublicUser(user) } });
    }),
  );

  return router;
}
