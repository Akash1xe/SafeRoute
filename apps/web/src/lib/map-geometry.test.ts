import { describe, expect, it } from 'vitest';

import { calculateBounds, projectPoint } from './map-geometry';

describe('map geometry', () => {
  it('projects north-east points above and to the right of south-west points', () => {
    const points = [
      { latitude: 28.62, longitude: 77.36 },
      { latitude: 28.64, longitude: 77.39 },
    ];
    const bounds = calculateBounds(points);
    const southWest = projectPoint(points[0]!, bounds);
    const northEast = projectPoint(points[1]!, bounds);

    expect(northEast.x).toBeGreaterThan(southWest.x);
    expect(northEast.y).toBeLessThan(southWest.y);
  });
});
