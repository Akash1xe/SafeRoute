import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';

import { Redis } from 'ioredis';
import { WebSocket, WebSocketServer } from 'ws';

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { metrics } from '../observability/metrics.js';
import {
  parseSafetyRealtimeEvent,
  safetyRealtimeChannel,
} from './realtime-event.js';

type LiveSocket = WebSocket & { isAlive: boolean; clientIp: string };

export class RealtimeGateway {
  private readonly sockets = new WebSocketServer({
    noServer: true,
    maxPayload: env.WS_MAX_PAYLOAD_BYTES,
  });
  private readonly connectionsByIp = new Map<string, number>();
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
      metrics.websocketAcceptedConnection();
      this.connectionsByIp.set(
        socket.clientIp,
        (this.connectionsByIp.get(socket.clientIp) ?? 0) + 1,
      );
      socket.on('pong', () => {
        socket.isAlive = true;
      });
      socket.on('message', () => {
        socket.close(1008, 'Client messages are not supported');
      });
      socket.once('close', () => {
        metrics.websocketClosedConnection();
        const remaining = (this.connectionsByIp.get(socket.clientIp) ?? 1) - 1;
        if (remaining > 0) this.connectionsByIp.set(socket.clientIp, remaining);
        else this.connectionsByIp.delete(socket.clientIp);
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
    const requestPath = new URL(request.url ?? '/', 'http://localhost')
      .pathname;
    const origin = request.headers.origin;
    if (requestPath !== '/api/v1/realtime') {
      metrics.websocketRejectedConnection('path');
      this.rejectUpgrade(socket, 404, 'Not Found');
      return;
    }
    if (origin !== undefined && origin !== env.WEB_ORIGIN) {
      metrics.websocketRejectedConnection('origin');
      this.rejectUpgrade(socket, 403, 'Forbidden');
      return;
    }

    const clientIp = request.socket.remoteAddress ?? 'unknown';
    if (
      this.sockets.clients.size >= env.WS_MAX_CONNECTIONS ||
      (this.connectionsByIp.get(clientIp) ?? 0) >= env.WS_MAX_CONNECTIONS_PER_IP
    ) {
      metrics.websocketRejectedConnection('capacity');
      this.rejectUpgrade(socket, 429, 'Too Many Requests');
      return;
    }

    this.sockets.handleUpgrade(request, socket, head, (client) => {
      (client as LiveSocket).clientIp = clientIp;
      this.sockets.emit('connection', client, request);
    });
  };

  private rejectUpgrade(socket: Duplex, status: number, message: string): void {
    if (!socket.destroyed) {
      socket.write(
        `HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`,
      );
      socket.destroy();
    }
  }

  private broadcast(message: string): void {
    let deliveries = 0;
    for (const client of this.sockets.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      if (client.bufferedAmount > env.WS_MAX_BUFFERED_BYTES) {
        metrics.recordRealtimeDrop();
        client.terminate();
        continue;
      }
      client.send(message);
      deliveries += 1;
    }
    metrics.recordRealtimeDelivery(deliveries);
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
