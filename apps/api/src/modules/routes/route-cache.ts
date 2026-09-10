import { createHash } from 'node:crypto';

import type { Redis } from 'ioredis';

import { logger } from '../../config/logger.js';
import type { CalculatedRoute } from '../../routing-engine/route-engine.js';
import type { CalculateRouteInput } from './route.schemas.js';

const graphVersionKey = 'saferoute:routing:graph-version';

export interface RouteResultCache {
  get(input: CalculateRouteInput): Promise<CalculatedRoute[] | null>;
  set(
    input: CalculateRouteInput,
    routes: readonly CalculatedRoute[],
  ): Promise<void>;
  invalidateGraph(): Promise<void>;
}

export class RedisRouteCache implements RouteResultCache {
  constructor(
    private readonly client: Redis,
    private readonly ttlSeconds: number,
  ) {}

  async get(input: CalculateRouteInput): Promise<CalculatedRoute[] | null> {
    try {
      const cached = await this.client.get(await this.key(input));
      return cached ? (JSON.parse(cached) as CalculatedRoute[]) : null;
    } catch (error) {
      logger.warn({ error }, 'Route cache read failed; calculating route');
      return null;
    }
  }

  async set(
    input: CalculateRouteInput,
    routes: readonly CalculatedRoute[],
  ): Promise<void> {
    try {
      await this.client.set(
        await this.key(input),
        JSON.stringify(routes),
        'EX',
        this.ttlSeconds,
      );
    } catch (error) {
      logger.warn({ error }, 'Route cache write failed');
    }
  }

  async invalidateGraph(): Promise<void> {
    await this.client.incr(graphVersionKey);
  }

  private async key(input: CalculateRouteInput): Promise<string> {
    const version = (await this.client.get(graphVersionKey)) ?? '0';
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    return `saferoute:routes:${version}:${fingerprint}`;
  }
}
