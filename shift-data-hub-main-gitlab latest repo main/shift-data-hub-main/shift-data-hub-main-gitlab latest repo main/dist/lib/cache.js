"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunnelCache = void 0;
exports.buildCacheKey = buildCacheKey;
// src/lib/cache.ts
const lru_cache_1 = require("lru-cache");
const crypto_1 = require("crypto");
class FunnelCache {
    cache;
    constructor(opts) {
        this.cache = new lru_cache_1.LRUCache({
            max: opts.maxEntries,
            ttl: opts.ttlSeconds * 1000,
        });
    }
    get(key) {
        return this.cache.get(key);
    }
    set(key, value) {
        this.cache.set(key, value);
    }
    invalidate(predicate) {
        const toDelete = [];
        for (const key of this.cache.keys()) {
            if (predicate(key))
                toDelete.push(key);
        }
        for (const k of toDelete)
            this.cache.delete(k);
        return toDelete.length;
    }
}
exports.FunnelCache = FunnelCache;
function buildCacheKey(funnelId, params) {
    const sortedEntries = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .sort(([a], [b]) => a.localeCompare(b));
    const serialized = JSON.stringify(sortedEntries);
    const hash = (0, crypto_1.createHash)('sha1').update(serialized).digest('hex').slice(0, 12);
    return `${funnelId}|${hash}`;
}
//# sourceMappingURL=cache.js.map