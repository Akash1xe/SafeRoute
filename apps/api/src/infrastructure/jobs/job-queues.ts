import { Queue, type JobsOptions } from 'bullmq';

import { redis } from '../redis/redis.js';

export const safetyQueueName = 'safety-risk-recalculation';
export const maintenanceQueueName = 'incident-maintenance';

export interface SafetyRefreshJobData {
  reportId: string;
}

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1_000 },
  removeOnComplete: { age: 3_600, count: 1_000 },
  removeOnFail: { age: 86_400, count: 5_000 },
};

let safetyQueue: Queue<SafetyRefreshJobData> | undefined;
let maintenanceQueue: Queue | undefined;

export function getSafetyQueue(): Queue<SafetyRefreshJobData> {
  safetyQueue ??= new Queue<SafetyRefreshJobData>(safetyQueueName, {
    connection: redis,
    defaultJobOptions,
  });
  return safetyQueue;
}

export function getMaintenanceQueue(): Queue {
  maintenanceQueue ??= new Queue(maintenanceQueueName, {
    connection: redis,
    defaultJobOptions,
  });
  return maintenanceQueue;
}

export async function closeJobQueues(): Promise<void> {
  await Promise.all([safetyQueue?.close(), maintenanceQueue?.close()]);
}
