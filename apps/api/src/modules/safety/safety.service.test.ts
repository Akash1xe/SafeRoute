import { describe, expect, it, vi } from 'vitest';

import type { SafetyRiskRepository } from './safety.repository.js';
import { SafetyIntelligenceService } from './safety.service.js';
import type { ReportRiskContext } from './safety.types.js';

const now = new Date('2026-09-10T12:00:00Z');
const report: ReportRiskContext = {
  id: '00000000-0000-4000-8000-000000000001',
  category: 'ACCIDENT',
  severity: 5,
  status: 'PENDING',
  confidenceScore: 0.2,
  reporterTrustScore: 0.8,
  confirmationCount: 3,
  disputeCount: 0,
  hasEvidence: true,
  createdAt: new Date('2026-09-10T06:00:00Z'),
  expiresAt: null,
};

describe('safety intelligence service', () => {
  it('updates confidence and recalculates every affected segment', async () => {
    const repository = createRepository();
    const service = new SafetyIntelligenceService(repository, () => now);

    const result = await service.refreshIncident(report.id);

    expect(result.affectedSegmentCount).toBe(2);
    expect(result.confidenceScore).toBeGreaterThan(report.confidenceScore);
    expect(repository.updateConfidence).toHaveBeenCalledWith(
      report.id,
      result.confidenceScore,
    );
    expect(repository.replaceSegmentRisk).toHaveBeenCalledTimes(2);

    const firstUpdate = vi.mocked(repository.replaceSegmentRisk).mock.calls[0];
    expect(firstUpdate?.[1][0]).toMatchObject({
      reportId: report.id,
      factor: 'accident',
    });
    expect(firstUpdate?.[2].accident).toBeGreaterThan(0);
    expect(firstUpdate?.[2].lighting).toBe(0);
  });
});

function createRepository(): SafetyRiskRepository {
  return {
    getReportContext: vi.fn().mockResolvedValue(report),
    updateConfidence: vi.fn(),
    findAffectedSegmentIds: vi
      .fn()
      .mockResolvedValue(['segment-a', 'segment-b']),
    listActiveReportsForSegment: vi.fn().mockResolvedValue([report]),
    replaceSegmentRisk: vi.fn(),
  };
}
