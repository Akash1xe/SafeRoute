export type ServiceStatus = 'up' | 'down';

export interface DependencyHealth {
  status: ServiceStatus;
  latencyMs?: number;
  message?: string;
}

export interface HealthResponse {
  status: ServiceStatus;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  dependencies?: Record<string, DependencyHealth>;
}
