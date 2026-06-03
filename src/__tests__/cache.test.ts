import { describe, it, expect, beforeEach } from 'vitest';
import { FunnelCache, buildCacheKey } from '../lib/cache';
import { parseQueryParams } from '../lib/queryParams';

describe('FunnelCache', () => {
  let cache: FunnelCache;

  beforeEach(() => {
    cache = new FunnelCache({ ttlSeconds: 60, maxEntries: 100 });
  });

  it('returns undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('stores and retrieves values', () => {
    cache.set('k1', { count: 42 });
    expect(cache.get('k1')).toEqual({ count: 42 });
  });

  it('evicts after TTL', async () => {
    const shortCache = new FunnelCache({ ttlSeconds: 0.05, maxEntries: 10 });
    shortCache.set('k1', { v: 1 });
    await new Promise(r => setTimeout(r, 100));
    expect(shortCache.get('k1')).toBeUndefined();
  });

  it('invalidate removes only matching keys and returns count', () => {
    cache.set('acquisition|abc', { v: 1 });
    cache.set('acquisition|def', { v: 2 });
    cache.set('conversion|xyz', { v: 3 });

    const removed = cache.invalidate(key => key.startsWith('acquisition|'));

    expect(removed).toBe(2);
    expect(cache.get('acquisition|abc')).toBeUndefined();
    expect(cache.get('acquisition|def')).toBeUndefined();
    expect(cache.get('conversion|xyz')).toEqual({ v: 3 });
  });
});

describe('buildCacheKey', () => {
  it('produces stable keys regardless of param order', () => {
    const k1 = buildCacheKey('acquisition', { source: 'twitter', from: '2026-06-01' });
    const k2 = buildCacheKey('acquisition', { from: '2026-06-01', source: 'twitter' });
    expect(k1).toBe(k2);
  });

  it('differs when params differ', () => {
    const k1 = buildCacheKey('acquisition', { source: 'twitter' });
    const k2 = buildCacheKey('acquisition', { source: 'discord' });
    expect(k1).not.toBe(k2);
  });
});

describe('parseQueryParams', () => {
  it('rejects rolled-over dates like 2026-02-30', () => {
    const result = parseQueryParams({ from: '2026-02-30' });
    expect(result.from).toBeUndefined();
  });

  it('accepts valid dates', () => {
    const result = parseQueryParams({ from: '2026-06-01' });
    expect(result.from).toBe('2026-06-01');
  });

  it('rejects naive datetimes without Z', () => {
    const result = parseQueryParams({ from: '2026-06-01T10:00' });
    expect(result.from).toBeUndefined();
  });

  it('accepts full ISO 8601 datetime with Z', () => {
    const result = parseQueryParams({ from: '2026-06-01T10:00:00Z' });
    expect(result.from).toBe('2026-06-01T10:00:00Z');
  });
});
