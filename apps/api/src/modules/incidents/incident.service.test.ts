import { describe, expect, it, vi } from 'vitest';

import { IncidentService } from './incident.service.js';
import type { IncidentRepository } from './incident.repository.js';
import type { Incident } from './incident.types.js';
import type { IncidentRiskUpdater } from '../safety/safety.service.js';

const incident: Incident = {
  id: '00000000-0000-4000-8000-000000000001',
  reporterId: '00000000-0000-4000-8000-000000000002',
  category: 'POOR_LIGHTING',
  description: 'Street lights are not working near the crossing.',
  severity: 3,
  latitude: 28.6139,
  longitude: 77.209,
  evidenceUrl: null,
  status: 'PENDING',
  confidenceScore: 0.2,
  confirmationCount: 0,
  disputeCount: 0,
  expiresAt: null,
  createdAt: new Date('2026-09-10T00:00:00Z'),
};

describe('incident service privacy', () => {
  it('does not expose the reporter id in public incident responses', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(incident),
    } as unknown as IncidentRepository;
    const riskUpdater = {
      refreshIncident: vi.fn(),
    } as unknown as IncidentRiskUpdater;
    const service = new IncidentService(repository, riskUpdater);

    const result = await service.get(incident.id);

    expect(result).not.toHaveProperty('reporterId');
    expect(result.id).toBe(incident.id);
  });
});
