import { AppError } from '../../errors/app-error.js';
import type { RiskFactor } from '../../routing-engine/scoring/risk-calculator.js';
import { calculateConfidence } from './confidence-calculator.js';
import {
  aggregateIndependentRisks,
  calculateEffectiveRisk,
  categoryRiskFactor,
} from './risk-intelligence.js';
import { riskFactors, type SafetyRiskRepository } from './safety.repository.js';
import { categoryTimeDecay } from './time-decay.js';
import type {
  DynamicRisk,
  ReportRiskContext,
  SafetyRefreshResult,
  SegmentRiskSource,
} from './safety.types.js';

export class SafetyIntelligenceService {
  constructor(
    private readonly repository: SafetyRiskRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async refreshIncident(reportId: string): Promise<SafetyRefreshResult> {
    const report = await this.repository.getReportContext(reportId);
    if (!report)
      throw new AppError(
        404,
        'INCIDENT_NOT_FOUND',
        'Incident report not found',
      );

    const now = this.clock();
    const confidenceScore = confidenceFor(report);
    await this.repository.updateConfidence(reportId, confidenceScore);

    const segmentIds = await this.repository.findAffectedSegmentIds(reportId);
    await Promise.all(
      segmentIds.map(async (segmentId) => {
        const reports =
          await this.repository.listActiveReportsForSegment(segmentId);
        const sources = reports.map((activeReport) =>
          sourceFor(activeReport, now),
        );
        await this.repository.replaceSegmentRisk(
          segmentId,
          sources,
          aggregateByFactor(sources),
          now,
        );
      }),
    );

    return { confidenceScore, affectedSegmentCount: segmentIds.length };
  }
}

function confidenceFor(report: ReportRiskContext): number {
  return calculateConfidence({
    reporterTrustScore: report.reporterTrustScore,
    confirmationCount: report.confirmationCount,
    disputeCount: report.disputeCount,
    hasEvidence: report.hasEvidence,
    status: report.status,
  });
}

function sourceFor(report: ReportRiskContext, now: Date): SegmentRiskSource {
  const confidence = confidenceFor(report);
  const expired = report.expiresAt !== null && report.expiresAt <= now;
  const timeDecay = expired
    ? 0
    : categoryTimeDecay(report.category, report.createdAt, now);
  return {
    reportId: report.id,
    factor: categoryRiskFactor[report.category],
    effectiveRisk: calculateEffectiveRisk(
      report.severity,
      confidence,
      timeDecay,
    ),
  };
}

function aggregateByFactor(sources: readonly SegmentRiskSource[]): DynamicRisk {
  return Object.fromEntries(
    riskFactors.map((factor) => [
      factor,
      aggregateIndependentRisks(
        sources
          .filter((source) => source.factor === factor)
          .map((source) => source.effectiveRisk),
      ),
    ]),
  ) as Record<RiskFactor, number>;
}
