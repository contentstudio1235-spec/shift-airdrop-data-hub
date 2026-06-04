"use client";
import { useEffect, useRef, useState } from 'react';
import { sseURL } from '@/lib/api';

export interface WhaleEvent {
  type: 'open' | 'close';
  wallet: string;
  walletDisplay: string;
  source: string;
  asset: string;
  sizeUSD: number;
  openedAt: string;
  isHistorical?: boolean;
}

export function useWhaleStream({ bufferSize = 50 }: { bufferSize?: number } = {}): {
  events: WhaleEvent[];
  connected: boolean;
  error: string | null;
} {
  const [events, setEvents] = useState<WhaleEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const url = sseURL('/api/attribution/whale-stream');
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => { setConnected(true); setError(null); };
    es.onerror = () => { setConnected(false); setError('disconnected'); };
    es.addEventListener('whale', (ev: MessageEvent) => {
      try {
        const data: WhaleEvent = JSON.parse(ev.data);
        setEvents(prev => [data, ...prev].slice(0, bufferSize));
      } catch { /* ignore malformed */ }
    });
    es.addEventListener('ping', () => {/* heartbeat */});

    return () => { es.close(); esRef.current = null; };
  }, [bufferSize]);

  return { events, connected, error };
}
