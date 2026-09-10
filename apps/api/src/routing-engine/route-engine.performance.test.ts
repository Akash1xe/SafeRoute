import { describe, expect, it } from 'vitest';

import { RoadGraph } from './graph/graph.js';
import type { EdgeRisk } from './graph/graph.types.js';
import { RouteEngine } from './route-engine.js';

const neutralRisk: EdgeRisk = {
  lighting: 0.1,
  incident: 0.1,
  isolation: 0.1,
  accident: 0.1,
  temporaryHazard: 0.1,
};

describe('route engine performance guard', () => {
  it('searches a 2,500-node grid without exploring beyond the graph', () => {
    const size = 50;
    const graph = createGrid(size);

    const result = new RouteEngine().calculate(
      graph,
      nodeId(0, 0),
      nodeId(size - 1, size - 1),
      'FASTEST',
    );

    expect(result).not.toBeNull();
    expect(result?.nodeIds).toHaveLength(size * 2 - 1);
    expect(result?.exploredNodes).toBeLessThanOrEqual(size * size);
  });
});

function createGrid(size: number): RoadGraph {
  const graph = new RoadGraph();
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      graph.addNode({
        id: nodeId(row, column),
        latitude: row * 0.001,
        longitude: column * 0.001,
      });
    }
  }

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (column + 1 < size) addEdge(graph, row, column, row, column + 1);
      if (row + 1 < size) addEdge(graph, row, column, row + 1, column);
    }
  }
  return graph;
}

function addEdge(
  graph: RoadGraph,
  sourceRow: number,
  sourceColumn: number,
  destinationRow: number,
  destinationColumn: number,
): void {
  const source = nodeId(sourceRow, sourceColumn);
  const destination = nodeId(destinationRow, destinationColumn);
  graph.addEdge({
    id: `${source}:${destination}`,
    source,
    destination,
    distanceMeters: 120,
    durationSeconds: 60,
    risk: neutralRisk,
  });
}

function nodeId(row: number, column: number): string {
  return `${row}-${column}`;
}
