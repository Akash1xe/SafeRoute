import { describe, expect, it, vi } from 'vitest';

import { RoadGraph } from '../../routing-engine/graph/graph.js';
import type { RoadGraphSource } from './road-graph.repository.js';
import type { RouteResultCache } from './route-cache.js';
import { RouteService } from './route.service.js';

describe('route service', () => {
  it('returns a specific error when the origin does not exist', async () => {
    const graph = new RoadGraph();
    graph.addNode({ id: 'destination', latitude: 0, longitude: 0 });
    const source: RoadGraphSource = {
      load: async () => graph,
      listNodes: async () => graph.getNodes(),
    };

    await expect(
      new RouteService(source).calculate({
        originNodeId: 'missing',
        destinationNodeId: 'destination',
      }),
    ).rejects.toMatchObject({ code: 'ORIGIN_NOT_FOUND', statusCode: 404 });
  });

  it('returns cached routes without loading the graph', async () => {
    const cachedRoute = {
      preference: 'FASTEST' as const,
      nodeIds: ['a', 'b'],
      geometry: [],
      distanceMeters: 10,
      durationSeconds: 2,
      averageRisk: 0,
      score: 10,
      exploredNodes: 2,
      warnings: [],
    };
    const source: RoadGraphSource = {
      load: vi.fn(),
      listNodes: vi.fn(),
    };
    const cache: RouteResultCache = {
      get: vi.fn().mockResolvedValue([cachedRoute]),
      set: vi.fn(),
      invalidateGraph: vi.fn(),
    };

    const result = await new RouteService(
      source,
      undefined,
      cache,
    ).calculate({ originNodeId: 'a', destinationNodeId: 'b' });

    expect(result).toEqual([cachedRoute]);
    expect(source.load).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });
});
