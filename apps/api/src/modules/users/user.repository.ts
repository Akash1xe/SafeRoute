import type { Pool } from 'pg';

import { AppError } from '../../errors/app-error.js';
import type { UserRecord, UserRole } from './user.types.js';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  trust_score: string;
  created_at: Date;
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    trustScore: Number(row.trust_score),
    createdAt: row.created_at,
  };
}

export class UserRepository {
  constructor(private readonly database: Pool) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.database.query<UserRow>(
      `SELECT id, name, email, password_hash, role, trust_score, created_at
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.database.query<UserRow>(
      `SELECT id, name, email, password_hash, role, trust_score, created_at
       FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    try {
      const result = await this.database.query<UserRow>(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, LOWER($2), $3)
         RETURNING id, name, email, password_hash, role, trust_score, created_at`,
        [input.name, input.email, input.passwordHash],
      );
      const user = result.rows[0];
      if (!user) throw new Error('User insert returned no row');
      return mapUser(user);
    } catch (error) {
      if (isPostgresError(error) && error.code === '23505') {
        throw new AppError(
          409,
          'EMAIL_ALREADY_REGISTERED',
          'An account with this email exists',
        );
      }
      throw error;
    }
  }
}

function isPostgresError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}
