interface TokenInfo {
    mint: string;
    symbol: string;
    name: string;
    baseMultiplier: number;
}
export declare const TRACKED_TOKENS: Record<string, TokenInfo>;
export declare function getTokenInfo(mint: string): TokenInfo | null;
export declare function isTrackedToken(mint: string): boolean;
export declare function getTrackedMints(): string[];
export {};
//# sourceMappingURL=tokens.d.ts.map