import { describe, expect, it } from 'vitest';

import { parseRealtimeEvent, toWebSocketUrl } from './realtime';

describe('realtime client protocol', () => {
  it('derives secure and local WebSocket endpoints from the API URL', () => {
    expect(toWebSocketUrl('http://localhost:4000/api/v1')).toBe(
      'ws://localhost:4000/api/v1/realtime',
    );
    expect(toWebSocketUrl('https://api.saferoute.dev/api/v1/')).toBe(
      'wss://api.saferoute.dev/api/v1/realtime',
    );
  });

  it('ignores readiness and malformed messages', () => {
    expect(
      parseRealtimeEvent(
        JSON.stringify({
          type: 'SAFETY_RISK_UPDATED',
          reportId: 'one',
          affectedSegmentCount: 2,
          occurredAt: '2026-09-10T09:00:00.000Z',
        }),
      ),
    ).toMatchObject({ type: 'SAFETY_RISK_UPDATED' });
    expect(parseRealtimeEvent(JSON.stringify({ type: 'REALTIME_READY' }))).toBe(
      null,
    );
  });
});
