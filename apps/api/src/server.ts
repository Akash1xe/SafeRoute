import { createServer } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { closePostgres } from './infrastructure/database/postgres.js';
import { closeJobQueues } from './infrastructure/jobs/job-queues.js';
import { closeRedis } from './infrastructure/redis/redis.js';

const server = createServer(createApp());

server.listen(env.API_PORT, '0.0.0.0', () => {
  logger.info({ port: env.API_PORT }, 'SafeRoute API started');
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Graceful shutdown started');

  server.close(async (serverError) => {
    try {
      await closeJobQueues();
      await Promise.all([closePostgres(), closeRedis()]);
      if (serverError) throw serverError;
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Graceful shutdown failed');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
