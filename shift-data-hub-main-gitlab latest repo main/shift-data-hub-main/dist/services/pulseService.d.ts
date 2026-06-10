import type { PulseSnapshot } from '../types/pulse';
/** Exposed for tests — clears the module-level cache. */
export declare function _clearPulseCache(): void;
/**
 * Returns the full Pulse snapshot. Cached for CACHE_TTL_MS in-memory.
 *
 * Cache key is constant ('pulse') — the endpoint accepts no inputs.
 */
export declare function getPulseSnapshot(): Promise<PulseSnapshot>;
//# sourceMappingURL=pulseService.d.ts.map