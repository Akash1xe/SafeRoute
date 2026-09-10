export type RealtimeConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting';

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

export function toWebSocketUrl(apiUrl: string): string {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/realtime`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function parseRealtimeEvent(value: string): SafetyRealtimeEvent | null {
  try {
    const event = JSON.parse(value) as Record<string, unknown>;
    if (
      (event.type === 'SAFETY_RISK_UPDATED' ||
        event.type === 'SAFETY_NETWORK_REFRESHED') &&
      typeof event.occurredAt === 'string'
    ) {
      return event as SafetyRealtimeEvent;
    }
    return null;
  } catch {
    return null;
  }
}
