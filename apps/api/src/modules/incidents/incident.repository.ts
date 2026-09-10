import type { Pool, PoolClient } from 'pg';

import { AppError } from '../../errors/app-error.js';
import type {
  ConfirmationDecision,
  Incident,
  IncidentCategory,
  IncidentStatus,
} from './incident.types.js';
import type { CreateIncidentInput, NearbyIncidentsInput } from './incident.schemas.js';

interface IncidentRow {
  id: string;
  reporter_id: string;
  category: IncidentCategory;
  description: string;
  severity: number;
  latitude: number;
  longitude: number;
  evidence_url: string | null;
  status: IncidentStatus;
  confidence_score: string;
  confirmation_count: number;
  dispute_count: number;
  expires_at: Date | null;
  created_at: Date;
  distance_meters?: number;
}

const incidentColumns = `
  id, reporter_id, category, description, severity,
  ST_Y(location::geometry) AS latitude,
  ST_X(location::geometry) AS longitude,
  evidence_url, status, confidence_score, confirmation_count,
  dispute_count, expires_at, created_at
`;

function mapIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    category: row.category,
    description: row.description,
    severity: row.severity,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    evidenceUrl: row.evidence_url,
    status: row.status,
    confidenceScore: Number(row.confidence_score),
    confirmationCount: row.confirmation_count,
    disputeCount: row.dispute_count,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    ...(row.distance_meters === undefined ? {} : { distanceMeters: Number(row.distance_meters) }),
  };
}

export class IncidentRepository {
  constructor(private readonly database: Pool) {}

  async create(reporterId: string, input: CreateIncidentInput): Promise<Incident> {
    const result = await this.database.query<IncidentRow>(
      `INSERT INTO incident_reports
        (reporter_id, category, description, severity, location, evidence_url, expires_at)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8)
       RETURNING ${incidentColumns}`,
      [
        reporterId,
        input.category,
        input.description,
        input.severity,
        input.longitude,
        input.latitude,
        input.evidenceUrl ?? null,
        input.expiresAt ?? null,
      ],
    );
    const incident = result.rows[0];
    if (!incident) throw new Error('Incident insert returned no row');
    return mapIncident(incident);
  }

  async findById(id: string): Promise<Incident | null> {
    const result = await this.database.query<IncidentRow>(
      `SELECT ${incidentColumns} FROM incident_reports WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapIncident(result.rows[0]) : null;
  }

  async findNearby(input: NearbyIncidentsInput): Promise<Incident[]> {
    const result = await this.database.query<IncidentRow>(
      `SELECT ${incidentColumns},
         ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters
       FROM incident_reports
       WHERE status IN ('PENDING', 'VERIFIED')
         AND (expires_at IS NULL OR expires_at > NOW())
         AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
       ORDER BY distance_meters, id
       LIMIT $4 OFFSET $5`,
      [
        input.longitude,
        input.latitude,
        input.radiusMeters,
        input.limit,
        (input.page - 1) * input.limit,
      ],
    );
    return result.rows.map(mapIncident);
  }

  async recordDecision(
    reportId: string,
    userId: string,
    decision: ConfirmationDecision,
  ): Promise<Incident> {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN');
      const report = await client.query<{ reporter_id: string }>(
        'SELECT reporter_id FROM incident_reports WHERE id = $1 FOR UPDATE',
        [reportId],
      );
      if (!report.rows[0]) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident report not found');
      if (report.rows[0].reporter_id === userId) {
        throw new AppError(409, 'SELF_CONFIRMATION_NOT_ALLOWED', 'You cannot evaluate your own report');
      }

      await client.query(
        `INSERT INTO report_confirmations (report_id, user_id, decision) VALUES ($1, $2, $3)`,
        [reportId, userId, decision],
      );
      const updated = await updateDecisionCounts(client, reportId, decision);
      await client.query('COMMIT');
      return mapIncident(updated);
    } catch (error) {
      await client.query('ROLLBACK');
      if (isPostgresError(error) && error.code === '23505') {
        throw new AppError(409, 'REPORT_ALREADY_EVALUATED', 'You already evaluated this report');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: IncidentStatus): Promise<Incident> {
    const result = await this.database.query<IncidentRow>(
      `UPDATE incident_reports SET status = $2, updated_at = NOW()
       WHERE id = $1 RETURNING ${incidentColumns}`,
      [id, status],
    );
    const incident = result.rows[0];
    if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident report not found');
    return mapIncident(incident);
  }
}

async function updateDecisionCounts(
  client: PoolClient,
  reportId: string,
  decision: ConfirmationDecision,
): Promise<IncidentRow> {
  const column = decision === 'CONFIRM' ? 'confirmation_count' : 'dispute_count';
  const result = await client.query<IncidentRow>(
    `UPDATE incident_reports SET ${column} = ${column} + 1, updated_at = NOW()
     WHERE id = $1 RETURNING ${incidentColumns}`,
    [reportId],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident report not found');
  return row;
}

function isPostgresError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}
