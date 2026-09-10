import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';

import { Redis } from 'ioredis';
import { WebSocket, WebSocketServer } from 'ws';

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import {
  parseSafetyRealtimeEvent,
  safetyRealtimeChannel,
} from './realtime-event.js';

type LiveSocket = WebSocket & { isAlive: boolean };

export class RealtimeGateway {
  private readonly sockets = new WebSocketServer({ noServer: true });
  private readonly subscriber = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
  });
  private heartbeat: NodeJS.Timeout | undefined;

  constructor(private readonly server: Server) {}

  async start(): Promise<void> {
    this.subscriber.on('error', (error) => {
      logger.error({ error }, 'Realtime Redis subscriber error');
    });
    if (this.subscriber.status === 'wait') await this.subscriber.connect();
    await this.subscriber.subscribe(safetyRealtimeChannel);
    this.subscriber.on('message', (_channel, message) => {
      const event = parseSafetyRealtimeEvent(message);
      if (event) this.broadcast(JSON.stringify(event));
    });

    this.server.on('upgrade', this.handleUpgrade);
    this.sockets.on('connection', (connectedSocket) => {
      const socket = connectedSocket as LiveSocket;
      socket.isAlive = true;
      socket.on('pong', () => {
        socket.isAlive = true;
      });
      socket.send(
        JSON.stringify({
          type: 'REALTIME_READY',
          occurredAt: new Date().toISOString(),
        }),
      );
    });
    this.heartbeat = setInterval(() => this.checkConnections(), 30_000);
  }

  async close(): Promise<void> {
    this.server.off('upgrade', this.handleUpgrade);
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const client of this.sockets.clients) client.terminate();
    await Promise.allSettled([
      new Promise<void>((resolve) => this.sockets.close(() => resolve())),
      this.subscriber.quit(),
    ]);
  }

  private readonly handleUpgrade = (
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): void => {
    const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname;
    const origin = request.headers.origin;
    if (
      requestPath !== '/api/v1/realtime' ||
      (origin !== undefined && origin !== env.WEB_ORIGIN)
    ) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    this.sockets.handleUpgrade(request, socket, head, (client) => {
      this.sockets.emit('connection', client, request);
    });
  };

  private broadcast(message: string): void {
    for (const client of this.sockets.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    }
  }

  private checkConnections(): void {
    for (const client of this.sockets.clients as Set<LiveSocket>) {
      if (!client.isAlive) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }
}
