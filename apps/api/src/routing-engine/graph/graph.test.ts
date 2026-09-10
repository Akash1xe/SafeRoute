import { describe, expect, it } from 'vitest';

import { RoadGraph } from './graph.js';

describe('road graph invariants', () => {
  it('rejects edges that reference missing nodes', () => {
    const graph = new RoadGraph();
    graph.addNode({ id: 'A', latitude: 0, longitude: 0 });

    expect(() =>
      graph.addEdge({
        id: 'invalid',
        source: 'A',
        destination: 'B',
        distanceMeters: 10,
        durationSeconds: 5,
        risk: {
          lighting: 0,
          incident: 0,
          isolation: 0,
          accident: 0,
          temporaryHazard: 0,
        },
      }),
    ).toThrow('missing node');
  });

  it('rejects risk values outside the normalized range', () => {
    const graph = new RoadGraph();
    graph.addNode({ id: 'A', latitude: 0, longitude: 0 });
    graph.addNode({ id: 'B', latitude: 0, longitude: 0.001 });

    expect(() =>
      graph.addEdge({
        id: 'invalid-risk',
        source: 'A',
        destination: 'B',
        distanceMeters: 10,
        durationSeconds: 5,
        risk: {
          lighting: 1.1,
          incident: 0,
          isolation: 0,
          accident: 0,
          temporaryHazard: 0,
        },
      }),
    ).toThrow('invalid lighting risk');
  });
});
