const durationBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

interface HttpSeries {
  count: number;
  sum: number;
  buckets: number[];
}

function escapeLabel(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\n', '\\n');
}

export class MetricsRegistry {
  private readonly http = new Map<string, HttpSeries>();
  private httpInFlight = 0;
  private websocketConnections = 0;
  private websocketAccepted = 0;
  private websocketRejected = new Map<string, number>();
  private realtimeDeliveries = 0;
  private realtimeDropped = 0;

  startHttpRequest(): void {
    this.httpInFlight += 1;
  }

  finishHttpRequest(
    method: string,
    route: string,
    status: number,
    durationSeconds: number,
  ): void {
    this.httpInFlight = Math.max(0, this.httpInFlight - 1);
    const key = JSON.stringify([method, route, status]);
    const series = this.http.get(key) ?? {
      count: 0,
      sum: 0,
      buckets: durationBuckets.map(() => 0),
    };
    series.count += 1;
    series.sum += durationSeconds;
    durationBuckets.forEach((bucket, index) => {
      if (durationSeconds <= bucket) {
        series.buckets[index] = (series.buckets[index] ?? 0) + 1;
      }
    });
    this.http.set(key, series);
  }

  websocketAcceptedConnection(): void {
    this.websocketConnections += 1;
    this.websocketAccepted += 1;
  }

  websocketClosedConnection(): void {
    this.websocketConnections = Math.max(0, this.websocketConnections - 1);
  }

  websocketRejectedConnection(reason: 'capacity' | 'origin' | 'path'): void {
    this.websocketRejected.set(
      reason,
      (this.websocketRejected.get(reason) ?? 0) + 1,
    );
  }

  recordRealtimeDelivery(count: number): void {
    this.realtimeDeliveries += count;
  }

  recordRealtimeDrop(): void {
    this.realtimeDropped += 1;
  }

  render(): string {
    const lines = [
      '# HELP saferoute_http_requests_total Completed HTTP requests.',
      '# TYPE saferoute_http_requests_total counter',
    ];

    for (const [key, series] of this.http) {
      const [method, route, status] = JSON.parse(key) as [
        string,
        string,
        number,
      ];
      const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}",status="${status}"`;
      lines.push(`saferoute_http_requests_total{${labels}} ${series.count}`);
    }

    lines.push(
      '# HELP saferoute_http_request_duration_seconds HTTP request latency.',
      '# TYPE saferoute_http_request_duration_seconds histogram',
    );
    for (const [key, series] of this.http) {
      const [method, route, status] = JSON.parse(key) as [
        string,
        string,
        number,
      ];
      const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}",status="${status}"`;
      durationBuckets.forEach((bucket, index) => {
        lines.push(
          `saferoute_http_request_duration_seconds_bucket{${labels},le="${bucket}"} ${series.buckets[index]}`,
        );
      });
      lines.push(
        `saferoute_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${series.count}`,
        `saferoute_http_request_duration_seconds_sum{${labels}} ${series.sum}`,
        `saferoute_http_request_duration_seconds_count{${labels}} ${series.count}`,
      );
    }

    lines.push(
      '# HELP saferoute_http_requests_in_flight Requests currently being served.',
      '# TYPE saferoute_http_requests_in_flight gauge',
      `saferoute_http_requests_in_flight ${this.httpInFlight}`,
      '# HELP saferoute_websocket_connections Active realtime clients.',
      '# TYPE saferoute_websocket_connections gauge',
      `saferoute_websocket_connections ${this.websocketConnections}`,
      '# HELP saferoute_websocket_connections_total Accepted realtime clients.',
      '# TYPE saferoute_websocket_connections_total counter',
      `saferoute_websocket_connections_total ${this.websocketAccepted}`,
      '# HELP saferoute_websocket_rejections_total Rejected realtime upgrades.',
      '# TYPE saferoute_websocket_rejections_total counter',
    );
    for (const [reason, count] of this.websocketRejected) {
      lines.push(
        `saferoute_websocket_rejections_total{reason="${reason}"} ${count}`,
      );
    }
    lines.push(
      '# HELP saferoute_realtime_deliveries_total WebSocket event deliveries.',
      '# TYPE saferoute_realtime_deliveries_total counter',
      `saferoute_realtime_deliveries_total ${this.realtimeDeliveries}`,
      '# HELP saferoute_realtime_dropped_total Events dropped for slow clients.',
      '# TYPE saferoute_realtime_dropped_total counter',
      `saferoute_realtime_dropped_total ${this.realtimeDropped}`,
      '# HELP saferoute_process_uptime_seconds Process uptime.',
      '# TYPE saferoute_process_uptime_seconds gauge',
      `saferoute_process_uptime_seconds ${process.uptime()}`,
      '# HELP saferoute_process_resident_memory_bytes Resident memory usage.',
      '# TYPE saferoute_process_resident_memory_bytes gauge',
      `saferoute_process_resident_memory_bytes ${process.memoryUsage().rss}`,
      '',
    );
    return lines.join('\n');
  }
}

export const metrics = new MetricsRegistry();
