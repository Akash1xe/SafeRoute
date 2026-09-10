export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GraphNode extends Coordinates {
  id: string;
  label?: string;
}

export interface EdgeRisk {
  lighting: number;
  incident: number;
  isolation: number;
  accident: number;
  temporaryHazard: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  destination: string;
  distanceMeters: number;
  durationSeconds: number;
  risk: EdgeRisk;
}
