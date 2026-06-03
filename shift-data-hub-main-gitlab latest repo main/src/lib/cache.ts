// src/lib/cache.ts
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

export interface FunnelCacheOptions {
  ttlSeconds: number;
  maxEntries: number;
}

export class FunnelCache {
  private cache: LRUCache<string, object>;

  constructor(opts: FunnelCacheOptions) {
    this.cache = new LRUCache<string, object>({
      max: opts.maxEntries,
      ttl: opts.ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, value as object);
  }

  invalidate(predicate: (key: string) => boolean): number {
    const toDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (predicate(key)) toDelete.push(key);
    }
    for (const k of toDelete) this.cache.delete(k);
    return toDelete.length;
  }
}

export function buildCacheKey(funnelId: string, params: Record<string, unknown>): string {
  const sortedEntries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  const serialized = JSON.stringify(sortedEntries);
  const hash = createHash('sha1').update(serialized).digest('hex').slice(0, 12);
  return `${funnelId}|${hash}`;
}
