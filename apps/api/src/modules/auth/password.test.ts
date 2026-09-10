import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the correct password and rejects a different password', async () => {
    const hash = await hashPassword('SafePassword123');

    expect(hash).not.toContain('SafePassword123');
    await expect(verifyPassword('SafePassword123', hash)).resolves.toBe(true);
    await expect(verifyPassword('WrongPassword123', hash)).resolves.toBe(false);
  });

  it('rejects malformed stored hashes', async () => {
    await expect(verifyPassword('SafePassword123', 'invalid')).resolves.toBe(
      false,
    );
  });
});
