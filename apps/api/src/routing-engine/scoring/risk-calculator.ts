import type { EdgeRisk } from '../graph/graph.types.js';

export type RiskFactor = keyof EdgeRisk;
export type RiskWeights = Readonly<Record<RiskFactor, number>>;

export const defaultRiskWeights: RiskWeights = {
  lighting: 0.25,
  incident: 0.35,
  isolation: 0.15,
  accident: 0.15,
  temporaryHazard: 0.1,
};

export class RiskCalculator {
  constructor(private readonly weights: RiskWeights = defaultRiskWeights) {
    const total = Object.values(weights).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    if (Math.abs(total - 1) > 0.000001)
      throw new Error('Risk weights must add up to 1');
  }

  calculate(risk: EdgeRisk): number {
    return (Object.keys(this.weights) as RiskFactor[]).reduce(
      (score, factor) => score + risk[factor] * this.weights[factor],
      0,
    );
  }
}
