import { createServer } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { closePostgres } from './infrastructure/database/postgres.js';
import { closeJobQueues } from './infrastructure/jobs/job-queues.js';
import { closeRedis } from './infrastructure/redis/redis.js';
import { RealtimeGateway } from './infrastructure/realtime/realtime-gateway.js';

const server = createServer(createApp());
const realtime = new RealtimeGateway(server);
server.requestTimeout = env.HTTP_REQUEST_TIMEOUT_MS;
server.headersTimeout = env.HTTP_REQUEST_TIMEOUT_MS + 1_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 1_000;

void realtime.start().catch((error: unknown) => {
  logger.error({ error }, 'Realtime gateway failed to start');
});

server.listen(env.API_PORT, '0.0.0.0', () => {
  logger.info({ port: env.API_PORT }, 'SafeRoute API started');
});

let shuttingDown = false;

function closeHttpServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown started');

  const deadline = setTimeout(() => {
    logger.error('Graceful shutdown deadline exceeded');
    server.closeAllConnections();
    process.exit(1);
  }, env.GRACEFUL_SHUTDOWN_TIMEOUT_MS);
  deadline.unref();

  try {
    await realtime.close();
    await Promise.all([closeHttpServer(), closeJobQueues()]);
    await Promise.all([closePostgres(), closeRedis()]);
    clearTimeout(deadline);
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Graceful shutdown failed');
    server.closeAllConnections();
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
