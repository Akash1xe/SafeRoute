import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from '../../config/logger.js';
import { closePostgres, postgres } from './postgres.js';

async function migrate(): Promise<void> {
  const migrationsDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../migrations',
  );
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = await postgres.connect();
  await client.query(
    "SELECT pg_advisory_lock(hashtext('saferoute_schema_migrations'))",
  );

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migrationFile of migrationFiles) {
      const alreadyApplied = await client.query<{ exists: boolean }>(
        'SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = $1) AS exists',
        [migrationFile],
      );

      if (alreadyApplied.rows[0]?.exists) continue;

      await client.query('BEGIN');
      try {
        await client.query(
          await readFile(path.join(migrationsDirectory, migrationFile), 'utf8'),
        );
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [
          migrationFile,
        ]);
        await client.query('COMMIT');
        logger.info({ migrationFile }, 'Database migration applied');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query(
      "SELECT pg_advisory_unlock(hashtext('saferoute_schema_migrations'))",
    );
    client.release();
  }
}

void migrate()
  .catch((error: unknown) => {
    logger.error({ error }, 'Database migration failed');
    process.exitCode = 1;
  })
  .finally(() => closePostgres());
