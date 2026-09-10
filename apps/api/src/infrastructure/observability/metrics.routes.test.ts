import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { metricsRouter } from './metrics.routes.js';

const token = 'test-metrics-token-with-at-least-32-characters';

describe('metrics endpoint', () => {
  it('requires its dedicated bearer token', async () => {
    const app = express().use('/metrics', metricsRouter(token));

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('METRICS_AUTH_REQUIRED');
  });

  it('returns Prometheus text for an authorized scraper', async () => {
    const app = express().use('/metrics', metricsRouter(token));

    const response = await request(app)
      .get('/metrics')
      .set('authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('saferoute_process_uptime_seconds');
  });
});
