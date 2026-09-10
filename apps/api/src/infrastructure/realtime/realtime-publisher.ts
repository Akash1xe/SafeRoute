import type { Redis } from 'ioredis';

import {
  safetyRealtimeChannel,
  type SafetyRealtimeEvent,
} from './realtime-event.js';

export class RealtimeEventPublisher {
  constructor(private readonly client: Redis) {}

  async publish(event: SafetyRealtimeEvent): Promise<void> {
    await this.client.publish(safetyRealtimeChannel, JSON.stringify(event));
  }
}
