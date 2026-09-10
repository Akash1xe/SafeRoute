import type { Pool, PoolClient } from 'pg';

import type { RiskFactor } from '../../routing-engine/scoring/risk-calculator.js';
import type {
  DynamicRisk,
  ReportRiskContext,
  SegmentRiskSource,
} from './safety.types.js';

interface ReportContextRow {
  id: string;
  category: ReportRiskContext['category'];
  severity: number;
  status: ReportRiskContext['status'];
  confidence_score: string;
  trust_score: string;
  confirmation_count: number;
  dispute_count: number;
  has_evidence: boolean;
  created_at: Date;
  expires_at: Date | null;
}

const reportContextColumns = `
  ir.id, ir.category, ir.severity, ir.status, ir.confidence_score,
  u.trust_score, ir.confirmation_count, ir.dispute_count,
  (ir.evidence_url IS NOT NULL) AS has_evidence,
  ir.created_at, ir.expires_at
`;

export interface SafetyRiskRepository {
  getReportContext(reportId: string): Promise<ReportRiskContext | null>;
  updateConfidence(reportId: string, confidence: number): Promise<void>;
  findAffectedSegmentIds(reportId: string): Promise<string[]>;
  listActiveReportsForSegment(segmentId: string): Promise<ReportRiskContext[]>;
  replaceSegmentRisk(
    segmentId: string,
    sources: readonly SegmentRiskSource[],
    dynamicRisk: DynamicRisk,
    calculatedAt: Date,
  ): Promise<void>;
}

export class SafetyRepository implements SafetyRiskRepository {
  constructor(private readonly database: Pool) {}

  async getReportContext(reportId: string): Promise<ReportRiskContext | null> {
    const result = await this.database.query<ReportContextRow>(
      `SELECT ${reportContextColumns}
       FROM incident_reports ir
       JOIN users u ON u.id = ir.reporter_id
       WHERE ir.id = $1`,
      [reportId],
    );
    return result.rows[0] ? mapReportContext(result.rows[0]) : null;
  }

  async updateConfidence(reportId: string, confidence: number): Promise<void> {
    await this.database.query(
      `UPDATE incident_reports
       SET confidence_score = $2, updated_at = NOW()
       WHERE id = $1`,
      [reportId, confidence],
    );
  }

  async findAffectedSegmentIds(reportId: string): Promise<string[]> {
    const result = await this.database.query<{ id: string }>(
      `SELECT rs.id
       FROM incident_reports ir
       JOIN road_segments rs
         ON rs.is_active
        AND ST_DWithin(ir.location, rs.geometry, 100 + ir.severity * 120)
       WHERE ir.id = $1
       ORDER BY rs.id`,
      [reportId],
    );
    return result.rows.map((row) => row.id);
  }

  async listActiveReportsForSegment(
    segmentId: string,
  ): Promise<ReportRiskContext[]> {
    const result = await this.database.query<ReportContextRow>(
      `SELECT ${reportContextColumns}
       FROM road_segments rs
       JOIN incident_reports ir
         ON ir.status IN ('PENDING', 'VERIFIED')
        AND (ir.expires_at IS NULL OR ir.expires_at > NOW())
        AND ST_DWithin(ir.location, rs.geometry, 100 + ir.severity * 120)
       JOIN users u ON u.id = ir.reporter_id
       WHERE rs.id = $1
       ORDER BY ir.id`,
      [segmentId],
    );
    return result.rows.map(mapReportContext);
  }

  async replaceSegmentRisk(
    segmentId: string,
    sources: readonly SegmentRiskSource[],
    dynamicRisk: DynamicRisk,
    calculatedAt: Date,
  ): Promise<void> {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM road_segments WHERE id = $1 FOR UPDATE', [
        segmentId,
      ]);
      await client.query('DELETE FROM segment_risk_sources WHERE segment_id = $1', [
        segmentId,
      ]);
      await insertSources(client, segmentId, sources, calculatedAt);
      await client.query(
        `UPDATE road_segments SET
           dynamic_lighting_risk = $2,
           dynamic_incident_risk = $3,
           dynamic_isolation_risk = $4,
           dynamic_accident_risk = $5,
           dynamic_temporary_hazard_risk = $6,
           updated_at = NOW()
         WHERE id = $1`,
        [
          segmentId,
          dynamicRisk.lighting,
          dynamicRisk.incident,
          dynamicRisk.isolation,
          dynamicRisk.accident,
          dynamicRisk.temporaryHazard,
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

async function insertSources(
  client: PoolClient,
  segmentId: string,
  sources: readonly SegmentRiskSource[],
  calculatedAt: Date,
): Promise<void> {
  for (const source of sources) {
    await client.query(
      `INSERT INTO segment_risk_sources
        (segment_id, report_id, factor, effective_risk, calculated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        segmentId,
        source.reportId,
        source.factor,
        source.effectiveRisk,
        calculatedAt,
      ],
    );
  }
}

function mapReportContext(row: ReportContextRow): ReportRiskContext {
  return {
    id: row.id,
    category: row.category,
    severity: row.severity,
    status: row.status,
    confidenceScore: Number(row.confidence_score),
    reporterTrustScore: Number(row.trust_score),
    confirmationCount: row.confirmation_count,
    disputeCount: row.dispute_count,
    hasEvidence: row.has_evidence,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export const riskFactors: readonly RiskFactor[] = [
  'lighting',
  'incident',
  'isolation',
  'accident',
  'temporaryHazard',
];
