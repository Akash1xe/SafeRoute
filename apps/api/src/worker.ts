import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import {
  closeJobQueues,
  getMaintenanceQueue,
  maintenanceQueueName,
  safetyQueueName,
  type SafetyRefreshJobData,
} from './infrastructure/jobs/job-queues.js';
import { closePostgres, postgres } from './infrastructure/database/postgres.js';
import { closeRedis, redis } from './infrastructure/redis/redis.js';
import { RealtimeEventPublisher } from './infrastructure/realtime/realtime-publisher.js';
import { IncidentMaintenanceService } from './modules/incidents/incident-maintenance.service.js';
import { IncidentRepository } from './modules/incidents/incident.repository.js';
import { RedisRouteCache } from './modules/routes/route-cache.js';
import { SafetyRepository } from './modules/safety/safety.repository.js';
import { SafetyIntelligenceService } from './modules/safety/safety.service.js';

const safety = new SafetyIntelligenceService(new SafetyRepository(postgres));
const maintenance = new IncidentMaintenanceService(
  new IncidentRepository(postgres),
  safety,
);
const routeCache = new RedisRouteCache(redis, env.ROUTE_CACHE_TTL_SECONDS);
const realtime = new RealtimeEventPublisher(redis);

const safetyWorker = new Worker<SafetyRefreshJobData>(
  safetyQueueName,
  async (job) => {
    const result = await safety.refreshIncident(job.data.reportId);
    await routeCache.invalidateGraph();
    await realtime.publish({
      type: 'SAFETY_RISK_UPDATED',
      reportId: job.data.reportId,
      affectedSegmentCount: result.affectedSegmentCount,
      occurredAt: new Date().toISOString(),
    });
    logger.info(
      { jobId: job.id, reportId: job.data.reportId, ...result },
      'Incident risk refreshed',
    );
  },
  { connection: workerConnection(), concurrency: 4 },
);

const maintenanceWorker = new Worker(
  maintenanceQueueName,
  async (job) => {
    const result = await maintenance.refreshTimeSensitiveRisk();
    if (result.refreshedCount > 0) {
      await routeCache.invalidateGraph();
      await realtime.publish({
        type: 'SAFETY_NETWORK_REFRESHED',
        ...result,
        occurredAt: new Date().toISOString(),
      });
    }
    logger.info({ jobId: job.id, ...result }, 'Incident maintenance completed');
  },
  { connection: workerConnection(), concurrency: 1 },
);

await getMaintenanceQueue().add(
  'refresh-time-sensitive-risk',
  {},
  {
    jobId: 'periodic-incident-maintenance',
    repeat: { every: env.INCIDENT_MAINTENANCE_INTERVAL_MS },
  },
);

for (const worker of [safetyWorker, maintenanceWorker]) {
  worker.on('failed', (job, error) => {
    logger.error(
      { jobId: job?.id, jobName: job?.name, error },
      'Background job failed',
    );
  });
}

logger.info('SafeRoute background worker started');

function workerConnection(): Redis {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Worker shutdown started');
  await Promise.all([safetyWorker.close(), maintenanceWorker.close()]);
  await closeJobQueues();
  await Promise.all([closePostgres(), closeRedis()]);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
