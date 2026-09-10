import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import type { UserRepository } from '../users/user.repository.js';
import { toPublicUser, type PublicUser } from '../users/user.types.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { hashPassword, verifyPassword } from './password.js';
import type { SessionRepository } from './session.repository.js';
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from './token.service.js';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    if (await this.users.findByEmail(input.email)) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email exists',
      );
    }

    const user = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });
    return this.issueSession(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect',
      );
    }
    return this.issueSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const nextRefreshToken = createRefreshToken();
    const userId = await this.sessions.rotate(
      hashRefreshToken(refreshToken),
      hashRefreshToken(nextRefreshToken),
      refreshExpiry(),
    );

    if (!userId)
      throw new AppError(
        401,
        'INVALID_REFRESH_TOKEN',
        'Session is invalid or expired',
      );
    const user = await this.users.findById(userId);
    if (!user)
      throw new AppError(
        401,
        'INVALID_REFRESH_TOKEN',
        'Session user no longer exists',
      );

    return {
      accessToken: await createAccessToken({
        userId: user.id,
        role: user.role,
      }),
      refreshToken: nextRefreshToken,
      user: toPublicUser(user),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken)
      await this.sessions.revoke(hashRefreshToken(refreshToken));
  }

  private async issueSession(
    user: Parameters<typeof toPublicUser>[0],
  ): Promise<AuthResult> {
    const refreshToken = createRefreshToken();
    await this.sessions.create(
      user.id,
      hashRefreshToken(refreshToken),
      refreshExpiry(),
    );
    return {
      accessToken: await createAccessToken({
        userId: user.id,
        role: user.role,
      }),
      refreshToken,
      user: toPublicUser(user),
    };
  }
}

function refreshExpiry(): Date {
  return new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
}
