import Redis from 'ioredis';

import { env } from '../../config/env.js';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

export async function closeRedis(): Promise<void> {
  if (redis.status === 'wait') {
    redis.disconnect();
    return;
  }

  if (redis.status !== 'end') {
    await redis.quit();
  }
}
