export const safetyRealtimeChannel = 'saferoute:realtime:safety';

export type SafetyRealtimeEvent =
  | {
      type: 'SAFETY_RISK_UPDATED';
      reportId: string;
      affectedSegmentCount: number;
      occurredAt: string;
    }
  | {
      type: 'SAFETY_NETWORK_REFRESHED';
      expiredCount: number;
      refreshedCount: number;
      occurredAt: string;
    };

export function parseSafetyRealtimeEvent(
  value: string,
): SafetyRealtimeEvent | null {
  try {
    const event = JSON.parse(value) as Record<string, unknown>;
    if (
      event.type === 'SAFETY_RISK_UPDATED' &&
      typeof event.reportId === 'string' &&
      typeof event.affectedSegmentCount === 'number' &&
      typeof event.occurredAt === 'string'
    ) {
      return event as SafetyRealtimeEvent;
    }
    if (
      event.type === 'SAFETY_NETWORK_REFRESHED' &&
      typeof event.expiredCount === 'number' &&
      typeof event.refreshedCount === 'number' &&
      typeof event.occurredAt === 'string'
    ) {
      return event as SafetyRealtimeEvent;
    }
    return null;
  } catch {
    return null;
  }
}
