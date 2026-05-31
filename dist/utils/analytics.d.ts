/**
 * Dispatches a server-side hit to Google Analytics 4 via Measurement Protocol.
 */
export declare function trackGA4Event(clientId: string, eventName: string, params: Record<string, any>): Promise<boolean>;
/**
 * Resolves a Solana wallet to its stitched ga_user_id and dispatches GA4 event server-side.
 */
export declare function trackGA4EventForWallet(wallet: string, eventName: string, params: Record<string, any>): Promise<boolean>;
//# sourceMappingURL=analytics.d.ts.map