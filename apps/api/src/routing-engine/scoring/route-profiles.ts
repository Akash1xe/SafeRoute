export const routePreferences = ['FASTEST', 'BALANCED', 'SAFEST'] as const;
export type RoutePreference = (typeof routePreferences)[number];

export interface RouteProfile {
  preference: RoutePreference;
  distanceWeight: number;
  safetyWeight: number;
}

export const routeProfiles: Readonly<Record<RoutePreference, RouteProfile>> = {
  FASTEST: { preference: 'FASTEST', distanceWeight: 0.9, safetyWeight: 0.1 },
  BALANCED: { preference: 'BALANCED', distanceWeight: 0.5, safetyWeight: 0.5 },
  SAFEST: { preference: 'SAFEST', distanceWeight: 0.2, safetyWeight: 0.8 },
};
