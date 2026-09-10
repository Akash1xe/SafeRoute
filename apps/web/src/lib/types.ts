export const routePreferences = ['FASTEST', 'BALANCED', 'SAFEST'] as const;
export type RoutePreference = (typeof routePreferences)[number];

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RoadNode extends Coordinates {
  id: string;
  label?: string;
}

export interface RouteWarning {
  edgeId: string;
  factor:
    | 'lighting'
    | 'incident'
    | 'isolation'
    | 'accident'
    | 'temporaryHazard';
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

export const incidentCategories = [
  'POOR_LIGHTING',
  'ACCIDENT',
  'HARASSMENT',
  'CONSTRUCTION',
  'ROAD_CLOSURE',
  'ISOLATED_AREA',
  'FLOODING',
  'OTHER',
] as const;
export type IncidentCategory = (typeof incidentCategories)[number];

export interface Incident extends Coordinates {
  id: string;
  category: IncidentCategory;
  description: string;
  severity: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  confidenceScore: number;
  confirmationCount: number;
  disputeCount: number;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  trustScore: number;
}
