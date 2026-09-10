import type {
  IncidentCategory,
  IncidentStatus,
} from '../incidents/incident.types.js';
import type { RiskFactor } from '../../routing-engine/scoring/risk-calculator.js';

export interface ReportRiskContext {
  id: string;
  category: IncidentCategory;
  severity: number;
  status: IncidentStatus;
  confidenceScore: number;
  reporterTrustScore: number;
  confirmationCount: number;
  disputeCount: number;
  hasEvidence: boolean;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface SegmentRiskSource {
  reportId: string;
  factor: RiskFactor;
  effectiveRisk: number;
}

export type DynamicRisk = Readonly<Record<RiskFactor, number>>;

export interface SafetyRefreshResult {
  confidenceScore: number;
  affectedSegmentCount: number;
}
