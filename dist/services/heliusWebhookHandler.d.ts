import { Request, Response } from 'express';
export declare class HeliusWebhookHandler {
    /**
     * Main webhook handler — receives Helius enhanced transaction data.
     */
    handleWebhook(req: Request, res: Response): Promise<void>;
    /**
     * Process a single enhanced transaction from Helius.
     */
    private processTransaction;
    /**
     * Process a structured swap event from Helius enhanced data.
     */
    private processSwapEvent;
    /**
     * Fallback: extract position data from raw token transfers when no swap event.
     */
    private processFromTokenTransfers;
    /**
     * Handle a buy (open position).
     * precomputedUsdValue: stablecoin amount paid (preferred over Jupiter pricing for RWA tokens)
     */
    private handleBuy;
    /**
     * Handle a sell (close position).
     */
    private handleSell;
    /**
     * Verify Helius webhook signature (HMAC-SHA256).
     */
    static verifySignature(body: string, signature: string): boolean;
}
export declare const heliusWebhookHandler: HeliusWebhookHandler;
//# sourceMappingURL=heliusWebhookHandler.d.ts.map