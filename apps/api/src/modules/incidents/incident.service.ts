import { AppError } from '../../errors/app-error.js';
import type { RequestIdentity } from '../../middleware/authenticate.js';
import type {
  CreateIncidentInput,
  NearbyIncidentsInput,
} from './incident.schemas.js';
import type { IncidentRepository } from './incident.repository.js';
import {
  toPublicIncident,
  type ConfirmationDecision,
  type IncidentStatus,
  type PublicIncident,
} from './incident.types.js';

export class IncidentService {
  constructor(private readonly incidents: IncidentRepository) {}

  async create(
    identity: RequestIdentity,
    input: CreateIncidentInput,
  ): Promise<PublicIncident> {
    return toPublicIncident(
      await this.incidents.create(identity.userId, input),
    );
  }

  async get(id: string): Promise<PublicIncident> {
    const incident = await this.incidents.findById(id);
    if (!incident)
      throw new AppError(
        404,
        'INCIDENT_NOT_FOUND',
        'Incident report not found',
      );
    return toPublicIncident(incident);
  }

  async nearby(input: NearbyIncidentsInput): Promise<PublicIncident[]> {
    return (await this.incidents.findNearby(input)).map(toPublicIncident);
  }

  async evaluate(
    identity: RequestIdentity,
    reportId: string,
    decision: ConfirmationDecision,
  ): Promise<PublicIncident> {
    return toPublicIncident(
      await this.incidents.recordDecision(reportId, identity.userId, decision),
    );
  }

  async moderate(
    reportId: string,
    status: IncidentStatus,
  ): Promise<PublicIncident> {
    return toPublicIncident(
      await this.incidents.updateStatus(reportId, status),
    );
  }
}
