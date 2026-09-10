import { describe, expect, it } from 'vitest';

import { parseSafetyRealtimeEvent } from './realtime-event.js';

describe('safety realtime events', () => {
  it('accepts the versioned safety event shapes', () => {
    expect(
      parseSafetyRealtimeEvent(
        JSON.stringify({
          type: 'SAFETY_RISK_UPDATED',
          reportId: 'report-1',
          affectedSegmentCount: 3,
          occurredAt: '2026-09-10T08:00:00.000Z',
        }),
      ),
    ).toMatchObject({ type: 'SAFETY_RISK_UPDATED', reportId: 'report-1' });
  });

  it('rejects malformed and unknown events', () => {
    expect(parseSafetyRealtimeEvent('{')).toBeNull();
    expect(parseSafetyRealtimeEvent(JSON.stringify({ type: 'UNKNOWN' }))).toBe(
      null,
    );
  });
});
