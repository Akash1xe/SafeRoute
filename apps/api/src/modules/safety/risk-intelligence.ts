import type { RiskFactor } from '../../routing-engine/scoring/risk-calculator.js';
import type { IncidentCategory } from '../incidents/incident.types.js';

export const categoryRiskFactor: Readonly<
  Record<IncidentCategory, RiskFactor>
> = {
  POOR_LIGHTING: 'lighting',
  ACCIDENT: 'accident',
  HARASSMENT: 'incident',
  CONSTRUCTION: 'temporaryHazard',
  ROAD_CLOSURE: 'temporaryHazard',
  ISOLATED_AREA: 'isolation',
  FLOODING: 'temporaryHazard',
  OTHER: 'incident',
};

export function calculateEffectiveRisk(
  severity: number,
  confidence: number,
  timeDecay: number,
): number {
  return clamp(severity / 5) * clamp(confidence) * clamp(timeDecay);
}

export function aggregateIndependentRisks(risks: readonly number[]): number {
  return (
    1 - risks.reduce((remaining, risk) => remaining * (1 - clamp(risk)), 1)
  );
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
