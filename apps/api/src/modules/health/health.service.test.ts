import { describe, expect, it, vi } from 'vitest';

import { createHealthService } from './health.service.js';

describe('health service', () => {
  it('reports ready when all dependencies respond', async () => {
    const service = createHealthService({
      checkPostgres: vi.fn().mockResolvedValue(undefined),
      checkRedis: vi.fn().mockResolvedValue(undefined),
    });

    const result = await service.ready();

    expect(result.status).toBe('up');
    expect(result.dependencies?.database?.status).toBe('up');
    expect(result.dependencies?.cache?.status).toBe('up');
  });

  it('reports not ready when a dependency fails', async () => {
    const service = createHealthService({
      checkPostgres: vi
        .fn()
        .mockRejectedValue(new Error('database unavailable')),
      checkRedis: vi.fn().mockResolvedValue(undefined),
    });

    const result = await service.ready();

    expect(result.status).toBe('down');
    expect(result.dependencies?.database?.message).toBe('database unavailable');
  });
});
