import type { SafetyIntelligenceService } from '../safety/safety.service.js';

export interface IncidentMaintenanceRepository {
  expireDueReports(): Promise<string[]>;
  listActiveReportIds(): Promise<string[]>;
}

export interface IncidentMaintenanceResult {
  expiredCount: number;
  refreshedCount: number;
}

export class IncidentMaintenanceService {
  constructor(
    private readonly incidents: IncidentMaintenanceRepository,
    private readonly safety: SafetyIntelligenceService,
  ) {}

  async refreshTimeSensitiveRisk(): Promise<IncidentMaintenanceResult> {
    const expiredIds = await this.incidents.expireDueReports();
    const activeIds = await this.incidents.listActiveReportIds();
    const reportIds = [...new Set([...expiredIds, ...activeIds])];

    for (const reportId of reportIds) {
      await this.safety.refreshIncident(reportId);
    }

    return {
      expiredCount: expiredIds.length,
      refreshedCount: reportIds.length,
    };
  }
}
