import type { GraphEdge, GraphNode } from './graph.types.js';

export class RoadGraph {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly adjacency = new Map<string, GraphEdge[]>();

  addNode(node: GraphNode): void {
    if (this.nodes.has(node.id)) throw new Error(`Duplicate graph node: ${node.id}`);
    this.nodes.set(node.id, node);
    this.adjacency.set(node.id, []);
  }

  addEdge(edge: GraphEdge): void {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.destination)) {
      throw new Error(`Edge ${edge.id} references a missing node`);
    }
    if (edge.distanceMeters <= 0 || edge.durationSeconds <= 0) {
      throw new Error(`Edge ${edge.id} must have positive distance and duration`);
    }
    this.assertRiskRange(edge);
    this.adjacency.get(edge.source)?.push(edge);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getNeighbors(id: string): readonly GraphEdge[] {
    return this.adjacency.get(id) ?? [];
  }

  getNodes(): GraphNode[] {
    return [...this.nodes.values()];
  }

  private assertRiskRange(edge: GraphEdge): void {
    for (const [factor, value] of Object.entries(edge.risk)) {
      if (value < 0 || value > 1) {
        throw new Error(`Edge ${edge.id} has invalid ${factor} risk: ${value}`);
      }
    }
  }
}
