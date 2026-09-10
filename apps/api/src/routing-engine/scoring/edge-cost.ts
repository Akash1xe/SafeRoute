import type { GraphEdge } from '../graph/graph.types.js';
import type { RouteProfile } from './route-profiles.js';
import { RiskCalculator } from './risk-calculator.js';

export const DEFAULT_RISK_DISTANCE_MULTIPLIER = 2;

export class EdgeCostCalculator {
  constructor(
    private readonly riskCalculator = new RiskCalculator(),
    private readonly riskDistanceMultiplier = DEFAULT_RISK_DISTANCE_MULTIPLIER,
  ) {}

  calculate(edge: GraphEdge, profile: RouteProfile): number {
    const risk = this.riskCalculator.calculate(edge.risk);
    return (
      profile.distanceWeight * edge.distanceMeters +
      profile.safetyWeight * risk * edge.distanceMeters * this.riskDistanceMultiplier
    );
  }
}
