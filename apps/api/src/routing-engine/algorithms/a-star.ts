import type { GraphEdge } from '../graph/graph.types.js';
import type { RoadGraph } from '../graph/graph.js';
import { MinPriorityQueue } from './min-priority-queue.js';

export interface PathResult {
  nodeIds: string[];
  edges: GraphEdge[];
  totalCost: number;
  exploredNodes: number;
}

export interface AStarOptions {
  edgeCost: (edge: GraphEdge) => number;
  heuristic: (nodeId: string, destinationId: string) => number;
}

export function aStar(
  graph: RoadGraph,
  originId: string,
  destinationId: string,
  options: AStarOptions,
): PathResult | null {
  if (!graph.getNode(originId) || !graph.getNode(destinationId)) return null;
  if (originId === destinationId) {
    return { nodeIds: [originId], edges: [], totalCost: 0, exploredNodes: 0 };
  }

  const open = new MinPriorityQueue<string>();
  const costFromOrigin = new Map<string, number>([[originId, 0]]);
  const previousEdge = new Map<string, GraphEdge>();
  let exploredNodes = 0;

  open.enqueue(originId, options.heuristic(originId, destinationId));

  while (open.size > 0) {
    const currentEntry = open.dequeue();
    if (!currentEntry) break;

    const currentCost = costFromOrigin.get(currentEntry.value);
    if (currentCost === undefined) continue;
    const currentBestPriority =
      currentCost + options.heuristic(currentEntry.value, destinationId);
    if (currentEntry.priority > currentBestPriority) continue;

    exploredNodes += 1;
    if (currentEntry.value === destinationId) {
      return reconstructPath(
        destinationId,
        previousEdge,
        currentCost,
        exploredNodes,
      );
    }

    for (const edge of graph.getNeighbors(currentEntry.value)) {
      const edgeCost = options.edgeCost(edge);
      if (!Number.isFinite(edgeCost) || edgeCost < 0) {
        throw new Error(`A* received an invalid cost for edge ${edge.id}`);
      }

      const candidateCost = currentCost + edgeCost;
      if (candidateCost >= (costFromOrigin.get(edge.destination) ?? Infinity))
        continue;

      costFromOrigin.set(edge.destination, candidateCost);
      previousEdge.set(edge.destination, edge);
      open.enqueue(
        edge.destination,
        candidateCost + options.heuristic(edge.destination, destinationId),
      );
    }
  }

  return null;
}

function reconstructPath(
  destinationId: string,
  previousEdge: ReadonlyMap<string, GraphEdge>,
  totalCost: number,
  exploredNodes: number,
): PathResult {
  const edges: GraphEdge[] = [];
  let currentId = destinationId;

  while (previousEdge.has(currentId)) {
    const edge = previousEdge.get(currentId);
    if (!edge) break;
    edges.push(edge);
    currentId = edge.source;
  }

  edges.reverse();
  return {
    nodeIds: [currentId, ...edges.map((edge) => edge.destination)],
    edges,
    totalCost,
    exploredNodes,
  };
}
