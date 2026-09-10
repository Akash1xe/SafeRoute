import { describe, expect, it } from 'vitest';

import { RoadGraph } from '../../routing-engine/graph/graph.js';
import type { RoadGraphSource } from './road-graph.repository.js';
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
});
