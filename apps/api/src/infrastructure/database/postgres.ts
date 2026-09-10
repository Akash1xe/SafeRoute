import { Pool } from 'pg';

import { env } from '../../config/env.js';

export const postgres = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.POSTGRES_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
  statement_timeout: env.POSTGRES_STATEMENT_TIMEOUT_MS,
  application_name: 'saferoute-api',
});

postgres.on('error', (error) => {
  // Pool errors occur outside a request, so they must be observed globally.
  process.stderr.write(`Unexpected PostgreSQL pool error: ${error.message}\n`);
});

export async function closePostgres(): Promise<void> {
  await postgres.end();
}
