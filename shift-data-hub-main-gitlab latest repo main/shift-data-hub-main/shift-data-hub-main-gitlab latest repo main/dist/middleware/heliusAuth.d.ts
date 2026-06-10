import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to verify Helius webhook signature.
 * Skips verification if HELIUS_WEBHOOK_SECRET is not set (dev mode).
 */
export declare function verifyHeliusSignature(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=heliusAuth.d.ts.map