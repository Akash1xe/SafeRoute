import { describe, expect, it, vi } from 'vitest';

import {
  SafetyJobDispatcher,
  type SafetyJobQueue,
} from './safety-job.dispatcher.js';

describe('safety job dispatcher', () => {
  it('enqueues a retryable incident-risk refresh', async () => {
    const queue: SafetyJobQueue = { add: vi.fn() };
    const dispatcher = new SafetyJobDispatcher(() => queue);

    await dispatcher.scheduleIncidentRefresh('report-1');

    expect(queue.add).toHaveBeenCalledWith('refresh-incident-risk', {
      reportId: 'report-1',
    });
  });
});
