import { createHash, randomBytes } from 'node:crypto';

import { jwtVerify, SignJWT } from 'jose';

import { env } from '../../config/env.js';
import type { UserRole } from '../users/user.types.js';

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export interface AccessIdentity {
  userId: string;
  role: UserRole;
}

export async function createAccessToken(identity: AccessIdentity): Promise<string> {
  return new SignJWT({ role: identity.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(identity.userId)
    .setIssuer('saferoute-api')
    .setAudience('saferoute-web')
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_MINUTES}m`)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessIdentity> {
  const { payload } = await jwtVerify(token, accessSecret, {
    issuer: 'saferoute-api',
    audience: 'saferoute-web',
  });

  if (!payload.sub || !['USER', 'MODERATOR', 'ADMIN'].includes(String(payload.role))) {
    throw new Error('Invalid access-token claims');
  }

  return { userId: payload.sub, role: payload.role as UserRole };
}

export function createRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
