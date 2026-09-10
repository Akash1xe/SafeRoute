import { describe, expect, it } from 'vitest';

import type { EdgeRisk, GraphEdge } from './graph/graph.types.js';
import { RoadGraph } from './graph/graph.js';
import { RouteEngine } from './route-engine.js';

const unsafeRisk: EdgeRisk = {
  lighting: 0.9,
  incident: 0.9,
  isolation: 0.9,
  accident: 0.9,
  temporaryHazard: 0.9,
};

const safeRisk: EdgeRisk = {
  lighting: 0.05,
  incident: 0.05,
  isolation: 0.05,
  accident: 0.05,
  temporaryHazard: 0.05,
};

describe('safety-aware route engine', () => {
  it('chooses the short unsafe path for FASTEST and longer safe path for SAFEST', () => {
    const graph = createChoiceGraph();
    const engine = new RouteEngine();

    const fastest = engine.calculate(graph, 'A', 'D', 'FASTEST');
    const safest = engine.calculate(graph, 'A', 'D', 'SAFEST');

    expect(fastest?.nodeIds).toEqual(['A', 'B', 'D']);
    expect(fastest?.distanceMeters).toBe(2000);
    expect(safest?.nodeIds).toEqual(['A', 'C', 'D']);
    expect(safest?.distanceMeters).toBe(2600);
    expect(safest?.safetyScore).toBeGreaterThan(fastest?.safetyScore ?? 0);
  });

  it('returns high-risk warnings without leaking scoring logic into A*', () => {
    const result = new RouteEngine().calculate(
      createChoiceGraph(),
      'A',
      'D',
      'FASTEST',
    );

    expect(result?.warnings).toContainEqual({
      edgeId: 'A-B',
      factor: 'incident',
      level: 0.9,
    });
  });

  it('returns null when nodes are disconnected', () => {
    const graph = createChoiceGraph();
    graph.addNode({ id: 'E', latitude: 0.02, longitude: 0.02 });

    expect(new RouteEngine().calculate(graph, 'A', 'E', 'BALANCED')).toBeNull();
  });
});

function createChoiceGraph(): RoadGraph {
  const graph = new RoadGraph();
  graph.addNode({ id: 'A', latitude: 0, longitude: 0 });
  graph.addNode({ id: 'B', latitude: 0, longitude: 0.005 });
  graph.addNode({ id: 'C', latitude: 0.005, longitude: 0 });
  graph.addNode({ id: 'D', latitude: 0, longitude: 0.01 });

  addEdge(graph, 'A-B', 'A', 'B', 1000, unsafeRisk);
  addEdge(graph, 'B-D', 'B', 'D', 1000, unsafeRisk);
  addEdge(graph, 'A-C', 'A', 'C', 1300, safeRisk);
  addEdge(graph, 'C-D', 'C', 'D', 1300, safeRisk);
  return graph;
}

function addEdge(
  graph: RoadGraph,
  id: string,
  source: string,
  destination: string,
  distanceMeters: number,
  risk: EdgeRisk,
): void {
  const edge: GraphEdge = {
    id,
    source,
    destination,
    distanceMeters,
    durationSeconds: Math.round(distanceMeters / 2),
    risk,
  };
  graph.addEdge(edge);
}
