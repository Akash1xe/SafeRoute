import { performance } from 'node:perf_hooks';

const target =
  process.env.LOAD_TEST_URL ?? 'http://localhost:4000/api/v1/health/live';
const durationSeconds = positiveNumber('LOAD_TEST_DURATION_SECONDS', 15);
const concurrency = positiveNumber('LOAD_TEST_CONCURRENCY', 25);
const timeoutMs = positiveNumber('LOAD_TEST_REQUEST_TIMEOUT_MS', 10_000);
const method = process.env.LOAD_TEST_METHOD ?? 'GET';
const body = process.env.LOAD_TEST_BODY;
const sampleLimit = 100_000;
const samples = [];
const statuses = new Map();
let completed = 0;
let errors = 0;

const startedAt = performance.now();
const deadline = startedAt + durationSeconds * 1_000;

await Promise.all(Array.from({ length: concurrency }, () => runWorker()));

samples.sort((left, right) => left - right);
const elapsedSeconds = (performance.now() - startedAt) / 1_000;
const result = {
  target,
  method,
  durationSeconds: round(elapsedSeconds),
  concurrency,
  completedRequests: completed,
  requestsPerSecond: round(completed / elapsedSeconds),
  errorRate: round(completed === 0 ? 1 : errors / completed),
  latencyMs: {
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: round(samples.at(-1) ?? 0),
  },
  statusCounts: Object.fromEntries([...statuses].sort()),
  sampledRequests: samples.length,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

const maximumErrorRate = optionalNumber('LOAD_TEST_MAX_ERROR_RATE');
const maximumP95 = optionalNumber('LOAD_TEST_MAX_P95_MS');
if (
  (maximumErrorRate !== undefined && result.errorRate > maximumErrorRate) ||
  (maximumP95 !== undefined && result.latencyMs.p95 > maximumP95)
) {
  process.exitCode = 1;
}

async function runWorker() {
  while (performance.now() < deadline) {
    const requestStartedAt = performance.now();
    try {
      const response = await fetch(target, {
        method,
        body,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const status = String(response.status);
      statuses.set(status, (statuses.get(status) ?? 0) + 1);
      if (!response.ok) errors += 1;
      await response.arrayBuffer();
    } catch {
      errors += 1;
      statuses.set('network_error', (statuses.get('network_error') ?? 0) + 1);
    } finally {
      completed += 1;
      recordSample(performance.now() - requestStartedAt);
    }
  }
}

function recordSample(value) {
  if (samples.length < sampleLimit) {
    samples.push(value);
    return;
  }
  const replacement = Math.floor(Math.random() * completed);
  if (replacement < sampleLimit) samples[replacement] = value;
}

function percentile(fraction) {
  if (samples.length === 0) return 0;
  return round(samples[Math.ceil(samples.length * fraction) - 1] ?? 0);
}

function positiveNumber(name, fallback) {
  const value = optionalNumber(name) ?? fallback;
  if (value <= 0) throw new Error(`${name} must be positive`);
  return value;
}

function optionalNumber(name) {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number`);
  return value;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
