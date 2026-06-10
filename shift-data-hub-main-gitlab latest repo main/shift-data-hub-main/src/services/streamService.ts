// src/services/streamService.ts
import type { WhaleStreamEvent } from '../types/funnel';

const MIN_USD = Number(process.env.WHALE_TICKER_MIN_USD ?? '1000');

type Subscriber = (event: WhaleStreamEvent) => void;

class WhalePubsub {
  private subs = new Set<Subscriber>();

  subscribe(sub: Subscriber): () => void {
    this.subs.add(sub);
    return () => this.subs.delete(sub);
  }

  emit(event: WhaleStreamEvent): void {
    for (const sub of this.subs) {
      try {
        sub(event);
      } catch (err) {
        console.error('[stream] subscriber error', err);
      }
    }
  }

  count(): number {
    return this.subs.size;
  }
}

export const whalePubsub = new WhalePubsub();

export function publishWhaleEvent(event: WhaleStreamEvent): void {
  if (event.sizeUSD < MIN_USD) return;
  whalePubsub.emit(event);
}
