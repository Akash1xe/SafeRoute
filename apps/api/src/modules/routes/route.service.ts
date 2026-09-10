import { performance } from 'node:perf_hooks';

import { logger } from '../../config/logger.js';
import { AppError } from '../../errors/app-error.js';
import {
  RouteEngine,
  type CalculatedRoute,
} from '../../routing-engine/route-engine.js';
import {
  routePreferences,
  type RoutePreference,
} from '../../routing-engine/scoring/route-profiles.js';
import type { CalculateRouteInput } from './route.schemas.js';
import type { RoadGraphSource } from './road-graph.repository.js';
import type { RouteResultCache } from './route-cache.js';

export class RouteService {
  constructor(
    private readonly graphSource: RoadGraphSource,
    private readonly engine = new RouteEngine(),
    private readonly cache?: RouteResultCache,
  ) {}

  async calculate(input: CalculateRouteInput): Promise<CalculatedRoute[]> {
    const startedAt = performance.now();
    const cached = await this.cache?.get(input);
    if (cached) return cached;

    const graph = await this.graphSource.load();
    if (!graph.getNode(input.originNodeId)) {
      throw new AppError(
        404,
        'ORIGIN_NOT_FOUND',
        'Origin road node was not found',
      );
    }
    if (!graph.getNode(input.destinationNodeId)) {
      throw new AppError(
        404,
        'DESTINATION_NOT_FOUND',
        'Destination road node was not found',
      );
    }

    const preferences: readonly RoutePreference[] =
      input.preferences ?? routePreferences;
    const routes = preferences.flatMap((preference) => {
      const route = this.engine.calculate(
        graph,
        input.originNodeId,
        input.destinationNodeId,
        preference,
      );
      return route ? [route] : [];
    });

    if (routes.length === 0) {
      throw new AppError(
        422,
        'ROUTE_NOT_FOUND',
        'No traversable route connects these nodes',
      );
    }

    logger.info(
      {
        originNodeId: input.originNodeId,
        destinationNodeId: input.destinationNodeId,
        preferences,
        routeCalculationTimeMs:
          Math.round((performance.now() - startedAt) * 100) / 100,
        nodesExplored: routes.reduce(
          (sum, route) => sum + route.exploredNodes,
          0,
        ),
        routeCount: routes.length,
      },
      'Safety-aware routes calculated',
    );

    await this.cache?.set(input, routes);

    return routes;
  }
}
