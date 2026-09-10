import { describe, expect, it, vi } from 'vitest';

import type { Redis } from 'ioredis';

import { RedisRouteCache } from './route-cache.js';

describe('Redis route cache', () => {
  it('uses the graph version in cache keys and bumps it on invalidation', async () => {
    const client = {
      get: vi.fn().mockResolvedValueOnce('7').mockResolvedValueOnce(null),
      set: vi.fn(),
      incr: vi.fn(),
    } as unknown as Redis;
    const cache = new RedisRouteCache(client, 120);
    const input = { originNodeId: 'a', destinationNodeId: 'b' };

    expect(await cache.get(input)).toBeNull();
    await cache.set(input, []);
    await cache.invalidateGraph();

    expect(client.get).toHaveBeenCalledWith(
      expect.stringMatching(/^saferoute:routes:7:[a-f0-9]{64}$/),
    );
    expect(client.set).toHaveBeenCalledWith(
      expect.stringMatching(/^saferoute:routes:0:[a-f0-9]{64}$/),
      '[]',
      'EX',
      120,
    );
    expect(client.incr).toHaveBeenCalledWith(
      'saferoute:routing:graph-version',
    );
  });

  it('treats Redis failures as cache misses', async () => {
    const client = {
      get: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
    } as unknown as Redis;

    await expect(
      new RedisRouteCache(client, 120).get({
        originNodeId: 'a',
        destinationNodeId: 'b',
      }),
    ).resolves.toBeNull();
  });
});
