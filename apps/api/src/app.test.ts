import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('API foundation', () => {
  it('exposes a liveness endpoint and request id', async () => {
    const response = await request(createApp()).get('/api/v1/health/live');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeTypeOf('string');
    expect(response.body.data).toMatchObject({ status: 'up', service: 'saferoute-api' });
  });

  it('returns a consistent not-found response', async () => {
    const response = await request(createApp()).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: 'NOT_FOUND' });
  });
});
