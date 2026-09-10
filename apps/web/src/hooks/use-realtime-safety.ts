import { useEffect, useRef, useState } from 'react';

import {
  parseRealtimeEvent,
  toWebSocketUrl,
  type RealtimeConnectionState,
  type SafetyRealtimeEvent,
} from '../lib/realtime';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const REALTIME_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? toWebSocketUrl(API_URL);

export function useRealtimeSafety(
  onSafetyEvent: (event: SafetyRealtimeEvent) => void,
): RealtimeConnectionState {
  const callback = useRef(onSafetyEvent);
  const [state, setState] =
    useState<RealtimeConnectionState>('connecting');

  useEffect(() => {
    callback.current = onSafetyEvent;
  }, [onSafetyEvent]);

  useEffect(() => {
    let active = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectDelay = 1_000;
    let socket: WebSocket | undefined;

    function connect() {
      if (!active) return;
      socket = new WebSocket(REALTIME_URL);
      socket.onopen = () => {
        reconnectDelay = 1_000;
        setState('connected');
      };
      socket.onmessage = (message) => {
        const event = parseRealtimeEvent(String(message.data));
        if (event) callback.current(event);
      };
      socket.onclose = () => {
        if (!active) return;
        setState('reconnecting');
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      };
      socket.onerror = () => socket?.close();
    }

    connect();
    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  return state;
}
