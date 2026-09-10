import { describe, expect, it } from 'vitest';

import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
} from './token.service.js';

describe('authentication tokens', () => {
  it('round-trips a signed access-token identity', async () => {
    const token = await createAccessToken({
      userId: '00000000-0000-4000-8000-000000000001',
      role: 'USER',
    });

    await expect(verifyAccessToken(token)).resolves.toEqual({
      userId: '00000000-0000-4000-8000-000000000001',
      role: 'USER',
    });
  });

  it('generates opaque refresh tokens and deterministic hashes', () => {
    const first = createRefreshToken();
    const second = createRefreshToken();

    expect(first).not.toBe(second);
    expect(hashRefreshToken(first)).toHaveLength(64);
    expect(hashRefreshToken(first)).toBe(hashRefreshToken(first));
  });
});
