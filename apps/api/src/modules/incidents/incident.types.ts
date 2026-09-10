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

export const incidentStatuses = ['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'] as const;
export const confirmationDecisions = ['CONFIRM', 'DISPUTE'] as const;

export type IncidentCategory = (typeof incidentCategories)[number];
export type IncidentStatus = (typeof incidentStatuses)[number];
export type ConfirmationDecision = (typeof confirmationDecisions)[number];

export interface Incident {
  id: string;
  reporterId: string;
  category: IncidentCategory;
  description: string;
  severity: number;
  latitude: number;
  longitude: number;
  evidenceUrl: string | null;
  status: IncidentStatus;
  confidenceScore: number;
  confirmationCount: number;
  disputeCount: number;
  expiresAt: Date | null;
  createdAt: Date;
  distanceMeters?: number;
}

export type PublicIncident = Omit<Incident, 'reporterId'>;

export function toPublicIncident(incident: Incident): PublicIncident {
  const { reporterId: _reporterId, ...publicIncident } = incident;
  return publicIncident;
}
