import { describe, expect, it, vi } from 'vitest';

import type { SafetyIntelligenceService } from '../safety/safety.service.js';
import { IncidentMaintenanceService } from './incident-maintenance.service.js';

describe('incident maintenance', () => {
  it('expires due reports and refreshes each affected report once', async () => {
    const incidents = {
      expireDueReports: vi.fn().mockResolvedValue(['expired', 'both']),
      listActiveReportIds: vi.fn().mockResolvedValue(['active', 'both']),
    };
    const safety = {
      refreshIncident: vi.fn(),
    } as unknown as SafetyIntelligenceService;

    const result = await new IncidentMaintenanceService(
      incidents,
      safety,
    ).refreshTimeSensitiveRisk();

    expect(safety.refreshIncident).toHaveBeenCalledTimes(3);
    expect(safety.refreshIncident).toHaveBeenNthCalledWith(1, 'expired');
    expect(safety.refreshIncident).toHaveBeenNthCalledWith(2, 'both');
    expect(safety.refreshIncident).toHaveBeenNthCalledWith(3, 'active');
    expect(result).toEqual({ expiredCount: 2, refreshedCount: 3 });
  });
});
