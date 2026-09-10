import type { IncidentCategory } from '../incidents/incident.types.js';

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

export const categoryHalfLifeMs: Readonly<Record<IncidentCategory, number>> = {
  ACCIDENT: 6 * HOUR_MS,
  HARASSMENT: 30 * DAY_MS,
  POOR_LIGHTING: 180 * DAY_MS,
  CONSTRUCTION: 14 * DAY_MS,
  ROAD_CLOSURE: DAY_MS,
  ISOLATED_AREA: 365 * DAY_MS,
  FLOODING: 2 * DAY_MS,
  OTHER: 7 * DAY_MS,
};

export function calculateTimeDecay(
  createdAt: Date,
  now: Date,
  halfLifeMs: number,
): number {
  if (halfLifeMs <= 0) throw new Error('Half-life must be positive');
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
  return 0.5 ** (ageMs / halfLifeMs);
}

export function categoryTimeDecay(
  category: IncidentCategory,
  createdAt: Date,
  now: Date,
): number {
  return calculateTimeDecay(createdAt, now, categoryHalfLifeMs[category]);
}
