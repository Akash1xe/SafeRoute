import type { JobsOptions } from 'bullmq';

import { getSafetyQueue, type SafetyRefreshJobData } from './job-queues.js';

export interface IncidentRiskScheduler {
  scheduleIncidentRefresh(reportId: string): Promise<void>;
}

export interface SafetyJobQueue {
  add(
    name: string,
    data: SafetyRefreshJobData,
    options?: JobsOptions,
  ): Promise<unknown>;
}

export class SafetyJobDispatcher implements IncidentRiskScheduler {
  constructor(
    private readonly queueProvider: () => SafetyJobQueue = getSafetyQueue,
  ) {}

  async scheduleIncidentRefresh(reportId: string): Promise<void> {
    await this.queueProvider().add('refresh-incident-risk', { reportId });
  }
}
