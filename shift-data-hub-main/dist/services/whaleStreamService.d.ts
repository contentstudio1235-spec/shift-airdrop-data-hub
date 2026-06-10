import type { WhaleEvent } from '../types/whale';
export declare function fetchInitialWhales(limit?: number): Promise<WhaleEvent[]>;
export declare function pollNewWhales(since: Date): Promise<WhaleEvent[]>;
//# sourceMappingURL=whaleStreamService.d.ts.map