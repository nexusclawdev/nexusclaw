import { useEffect, useRef, useCallback, useState } from "react";
import { bootstrapSession } from "../api";
import type { WSEvent, WSEventType } from "../types";

type Listener = (payload: unknown) => void;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<WSEventType, Set<Listener>>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/ws`;
    let alive = true;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    async function connect() {
      if (!alive) return;
      try {
        const bootstrapped = await bootstrapSession({ promptOnUnauthorized: false });
        if (!bootstrapped) {
          reconnectTimer = setTimeout(() => { void connect(); }, 2000);
          return;
        }
      } catch {
        // ignore bootstrap errors; ws connect result will drive retry
        reconnectTimer = setTimeout(() => { void connect(); }, 2000);
        return;
      }
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (alive) setConnected(true);
      };
      ws.onclose = () => {
        if (!alive) return;
        setConnected(false);
        reconnectTimer = setTimeout(() => { void connect(); }, 2000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => {
        if (!alive) return;
        try {
          const evt = JSON.parse(e.data);
          // Backend sends { type, data, timestamp } but we expect { type, payload }
          const normalizedEvt = {
            type: evt.type,
            payload: evt.data || evt.payload
          };
          console.log('[WebSocket] Message received:', normalizedEvt.type, normalizedEvt.payload);
          const listeners = listenersRef.current.get(normalizedEvt.type);
          if (listeners) {
            console.log('[WebSocket] Notifying', listeners.size, 'listeners for', normalizedEvt.type);
            for (const fn of listeners) fn(normalizedEvt.payload);
          } else {
            console.log('[WebSocket] No listeners registered for', normalizedEvt.type);
          }
        } catch (err) {
          console.error('[WebSocket] Parse error:', err);
        }
      };
    }

    void connect();
    return () => {
      alive = false;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  const on = useCallback((type: WSEventType, fn: Listener) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(fn);
    return () => { listenersRef.current.get(type)?.delete(fn); };
  }, []);

  return { connected, on };
}
