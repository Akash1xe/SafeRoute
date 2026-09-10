import type { Coordinates } from './types';

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

const MAP_PADDING = 58;

export function calculateBounds(
  coordinates: readonly Coordinates[],
): MapBounds {
  if (coordinates.length === 0) {
    return {
      minLatitude: 28.622,
      maxLatitude: 28.636,
      minLongitude: 77.36,
      maxLongitude: 77.382,
    };
  }

  const latitudes = coordinates.map((point) => point.latitude);
  const longitudes = coordinates.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeMargin = Math.max((maxLatitude - minLatitude) * 0.18, 0.001);
  const longitudeMargin = Math.max((maxLongitude - minLongitude) * 0.14, 0.001);

  return {
    minLatitude: minLatitude - latitudeMargin,
    maxLatitude: maxLatitude + latitudeMargin,
    minLongitude: minLongitude - longitudeMargin,
    maxLongitude: maxLongitude + longitudeMargin,
  };
}

export function projectPoint(
  point: Coordinates,
  bounds: MapBounds,
  width = 900,
  height = 620,
): MapPoint {
  const longitudeRange = bounds.maxLongitude - bounds.minLongitude || 1;
  const latitudeRange = bounds.maxLatitude - bounds.minLatitude || 1;
  return {
    x:
      MAP_PADDING +
      ((point.longitude - bounds.minLongitude) / longitudeRange) *
        (width - MAP_PADDING * 2),
    y:
      MAP_PADDING +
      ((bounds.maxLatitude - point.latitude) / latitudeRange) *
        (height - MAP_PADDING * 2),
  };
}

export function pointsAttribute(points: readonly MapPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}
