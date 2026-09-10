import { describe, expect, it } from 'vitest';

import { MetricsRegistry } from './metrics.js';

describe('MetricsRegistry', () => {
  it('renders bounded HTTP counters and cumulative latency buckets', () => {
    const registry = new MetricsRegistry();
    registry.startHttpRequest();
    registry.finishHttpRequest('GET', '/api/v1/routes/:id', 200, 0.02);

    const output = registry.render();

    expect(output).toContain(
      'saferoute_http_requests_total{method="GET",route="/api/v1/routes/:id",status="200"} 1',
    );
    expect(output).toContain('le="0.025"} 1');
    expect(output).toContain('saferoute_http_requests_in_flight 0');
  });

  it('tracks realtime capacity, rejection, delivery, and backpressure data', () => {
    const registry = new MetricsRegistry();
    registry.websocketAcceptedConnection();
    registry.websocketRejectedConnection('capacity');
    registry.recordRealtimeDelivery(3);
    registry.recordRealtimeDrop();
    registry.websocketClosedConnection();

    const output = registry.render();

    expect(output).toContain('saferoute_websocket_connections 0');
    expect(output).toContain(
      'saferoute_websocket_rejections_total{reason="capacity"} 1',
    );
    expect(output).toContain('saferoute_realtime_deliveries_total 3');
    expect(output).toContain('saferoute_realtime_dropped_total 1');
  });
});
