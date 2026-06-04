import { Request, Response } from 'express';
export declare class SnagWebhookHandler {
    /**
     * Verify SNAG Stratus webhook signature (HMAC-SHA256).
     * CRITICAL HARDENING: Strict verification in production.
     * If no secret is configured (dev mode), logs warning and returns true.
     */
    static verifySignature(rawBody: string, signature: string): boolean;
    handleWebhook(req: Request, res: Response): Promise<void>;
    private processEvent;
    private handleRuleCompleted;
    private static readonly SOCIAL_EXTRACTORS;
    private handleUserMetadata;
    private handleReferralCreated;
}
export declare const snagWebhookHandler: SnagWebhookHandler;
//# sourceMappingURL=snagWebhookHandler.d.ts.map