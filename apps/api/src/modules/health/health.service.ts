import type { DependencyHealth, HealthResponse } from '@saferoute/shared';

export interface HealthDependencies {
  checkPostgres: () => Promise<void>;
  checkRedis: () => Promise<void>;
}

async function measure(check: () => Promise<void>): Promise<DependencyHealth> {
  const startedAt = performance.now();

  try {
    await check();
    return {
      status: 'up',
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Math.round(performance.now() - startedAt),
      message:
        error instanceof Error ? error.message : 'Unknown dependency error',
    };
  }
}

export function createHealthService(dependencies: HealthDependencies) {
  return {
    live(): HealthResponse {
      return {
        status: 'up',
        service: 'saferoute-api',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
      };
    },

    async ready(): Promise<HealthResponse> {
      const [database, cache] = await Promise.all([
        measure(dependencies.checkPostgres),
        measure(dependencies.checkRedis),
      ]);
      const status =
        database.status === 'up' && cache.status === 'up' ? 'up' : 'down';

      return {
        status,
        service: 'saferoute-api',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        dependencies: { database, cache },
      };
    },
  };
}
