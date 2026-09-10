import type { Pool, PoolClient } from 'pg';

export class SessionRepository {
  constructor(private readonly database: Pool) {}

  async create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.database.query(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  }

  async rotate(
    oldHash: string,
    newHash: string,
    expiresAt: Date,
  ): Promise<string | null> {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN');
      const session = await client.query<{
        id: string;
        user_id: string;
        expires_at: Date;
        revoked_at: Date | null;
      }>(
        `SELECT id, user_id, expires_at, revoked_at
         FROM auth_sessions WHERE refresh_token_hash = $1 FOR UPDATE`,
        [oldHash],
      );
      const current = session.rows[0];

      if (!current) {
        await client.query('ROLLBACK');
        return null;
      }

      if (current.revoked_at) {
        await revokeAll(client, current.user_id, 'TOKEN_REUSE_DETECTED');
        await client.query('COMMIT');
        return null;
      }

      if (current.expires_at.getTime() <= Date.now()) {
        await client.query(
          `UPDATE auth_sessions SET revoked_at = NOW(), revoke_reason = 'EXPIRED' WHERE id = $1`,
          [current.id],
        );
        await client.query('COMMIT');
        return null;
      }

      await client.query(
        `UPDATE auth_sessions SET revoked_at = NOW(), revoke_reason = 'ROTATED' WHERE id = $1`,
        [current.id],
      );
      await client.query(
        `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [current.user_id, newHash, expiresAt],
      );
      await client.query('COMMIT');
      return current.user_id;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.database.query(
      `UPDATE auth_sessions
       SET revoked_at = COALESCE(revoked_at, NOW()), revoke_reason = COALESCE(revoke_reason, 'LOGOUT')
       WHERE refresh_token_hash = $1`,
      [tokenHash],
    );
  }
}

async function revokeAll(
  client: PoolClient,
  userId: string,
  reason: string,
): Promise<void> {
  await client.query(
    `UPDATE auth_sessions SET revoked_at = NOW(), revoke_reason = $2
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId, reason],
  );
}
