import { Pool } from 'pg';

import { env } from '../../config/env.js';

export const postgres = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

postgres.on('error', (error) => {
  // Pool errors occur outside a request, so they must be observed globally.
  process.stderr.write(`Unexpected PostgreSQL pool error: ${error.message}\n`);
});

export async function closePostgres(): Promise<void> {
  await postgres.end();
}
