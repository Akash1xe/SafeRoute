import { aStar } from './algorithms/a-star.js';
import { haversineDistance } from './geo/haversine.js';
import type { Coordinates, GraphEdge } from './graph/graph.types.js';
import type { RoadGraph } from './graph/graph.js';
import { EdgeCostCalculator } from './scoring/edge-cost.js';
import {
  routeProfiles,
  type RoutePreference,
  type RouteProfile,
} from './scoring/route-profiles.js';
import { RiskCalculator, type RiskFactor } from './scoring/risk-calculator.js';

export interface RouteWarning {
  edgeId: string;
  factor: RiskFactor;
  level: number;
}

export interface CalculatedRoute {
  preference: RoutePreference;
  nodeIds: string[];
  geometry: Coordinates[];
  distanceMeters: number;
  durationSeconds: number;
  safetyScore: number;
  optimizationCost: number;
  exploredNodes: number;
  warnings: RouteWarning[];
}

export class RouteEngine {
  constructor(
    private readonly edgeCosts = new EdgeCostCalculator(),
    private readonly risks = new RiskCalculator(),
  ) {}

  calculate(
    graph: RoadGraph,
    originId: string,
    destinationId: string,
    preference: RoutePreference,
  ): CalculatedRoute | null {
    const profile = routeProfiles[preference];
    const path = aStar(graph, originId, destinationId, {
      edgeCost: (edge) => this.edgeCosts.calculate(edge, profile),
      heuristic: (nodeId, targetId) =>
        this.heuristic(graph, nodeId, targetId, profile),
    });
    if (!path) return null;

    const distanceMeters = path.edges.reduce(
      (sum, edge) => sum + edge.distanceMeters,
      0,
    );
    const durationSeconds = path.edges.reduce(
      (sum, edge) => sum + edge.durationSeconds,
      0,
    );
    const averageRisk = this.distanceWeightedRisk(path.edges, distanceMeters);

    return {
      preference,
      nodeIds: path.nodeIds,
      geometry: path.nodeIds.flatMap((nodeId) => {
        const node = graph.getNode(nodeId);
        return node
          ? [{ latitude: node.latitude, longitude: node.longitude }]
          : [];
      }),
      distanceMeters,
      durationSeconds,
      safetyScore: Math.round((1 - averageRisk) * 100),
      optimizationCost: Math.round(path.totalCost * 100) / 100,
      exploredNodes: path.exploredNodes,
      warnings: this.collectWarnings(path.edges),
    };
  }

  private heuristic(
    graph: RoadGraph,
    nodeId: string,
    destinationId: string,
    profile: RouteProfile,
  ): number {
    const node = graph.getNode(nodeId);
    const destination = graph.getNode(destinationId);
    if (!node || !destination) return 0;
    return profile.distanceWeight * haversineDistance(node, destination);
  }

  private distanceWeightedRisk(
    edges: GraphEdge[],
    totalDistance: number,
  ): number {
    if (totalDistance === 0) return 0;
    return (
      edges.reduce(
        (sum, edge) =>
          sum + this.risks.calculate(edge.risk) * edge.distanceMeters,
        0,
      ) / totalDistance
    );
  }

  private collectWarnings(edges: GraphEdge[]): RouteWarning[] {
    return edges.flatMap((edge) =>
      (Object.entries(edge.risk) as [RiskFactor, number][])
        .filter(([, level]) => level >= 0.65)
        .map(([factor, level]) => ({ edgeId: edge.id, factor, level })),
    );
  }
}
