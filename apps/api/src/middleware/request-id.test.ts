import { describe, expect, it } from 'vitest';

import { resolveRequestId } from './request-id.js';

describe('resolveRequestId', () => {
  it('preserves a bounded request id from a trusted proxy', () => {
    expect(resolveRequestId('edge-request_42')).toBe('edge-request_42');
  });

  it('replaces values that could pollute logs or response headers', () => {
    const requestId = resolveRequestId('bad\nrequest-id');

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
