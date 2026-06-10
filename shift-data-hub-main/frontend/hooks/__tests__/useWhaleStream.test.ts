import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWhaleStream } from '../useWhaleStream';

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  listeners = new Map<string, (e: MessageEvent) => void>();
  readyState = 0;
  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.(new Event('open'));
    }, 0);
  }
  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    this.listeners.set(type, fn);
  }
  close() { this.readyState = 2; }
  emit(type: string, data: any) {
    const ev = new MessageEvent(type, { data: JSON.stringify(data) });
    this.listeners.get(type)?.(ev);
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  (globalThis as any).EventSource = MockEventSource;
});
afterEach(() => {
  delete (globalThis as any).EventSource;
});

describe('useWhaleStream', () => {
  it('opens an EventSource and appends whale events to the buffer', async () => {
    const { result } = renderHook(() => useWhaleStream({ bufferSize: 5 }));
    await waitFor(() => expect(result.current.connected).toBe(true));
    act(() => {
      MockEventSource.instances[0].emit('whale', {
        type: 'open', wallet: 'AbCdEf', walletDisplay: 'AbCdEf...XyZw',
        source: 'direct', asset: 'TSL2L', sizeUSD: 1500, openedAt: '2026-06-04T00:00:00Z',
      });
    });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].sizeUSD).toBe(1500);
  });

  it('caps the buffer at bufferSize and keeps newest first', async () => {
    const { result } = renderHook(() => useWhaleStream({ bufferSize: 2 }));
    await waitFor(() => expect(result.current.connected).toBe(true));
    act(() => {
      const es = MockEventSource.instances[0];
      es.emit('whale', { type: 'open', wallet: 'A', walletDisplay: 'A', source: 's', asset: 'X', sizeUSD: 1, openedAt: '2026-06-04T00:00:00Z' });
      es.emit('whale', { type: 'open', wallet: 'B', walletDisplay: 'B', source: 's', asset: 'X', sizeUSD: 2, openedAt: '2026-06-04T00:00:01Z' });
      es.emit('whale', { type: 'open', wallet: 'C', walletDisplay: 'C', source: 's', asset: 'X', sizeUSD: 3, openedAt: '2026-06-04T00:00:02Z' });
    });
    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0].sizeUSD).toBe(3);
  });
});
