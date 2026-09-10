import type { IncidentStatus } from '../incidents/incident.types.js';

export interface ConfidenceInput {
  reporterTrustScore: number;
  confirmationCount: number;
  disputeCount: number;
  hasEvidence: boolean;
  status: IncidentStatus;
}

export function calculateConfidence(input: ConfidenceInput): number {
  if (input.status === 'REJECTED' || input.status === 'EXPIRED') return 0;

  const confirmations = Math.max(0, input.confirmationCount);
  const disputes = Math.max(0, input.disputeCount);
  const participation = confirmations + disputes;
  const communitySignal = (confirmations + 1) / (participation + 2);
  const participationWeight = 1 - Math.exp(-participation / 3);
  const adjustedCommunity =
    0.5 + (communitySignal - 0.5) * participationWeight;
  const evidenceScore = input.hasEvidence ? 1 : 0.2;
  const reporterTrust = clamp(input.reporterTrustScore);
  const calculated =
    reporterTrust * 0.5 + adjustedCommunity * 0.35 + evidenceScore * 0.15;

  if (input.status === 'VERIFIED') return round(Math.max(0.9, calculated));
  return round(Math.min(0.85, calculated));
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number): number {
  return Math.round(clamp(value) * 1_000) / 1_000;
}
