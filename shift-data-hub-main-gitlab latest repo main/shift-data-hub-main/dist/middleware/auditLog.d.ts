import { Request, Response, NextFunction } from 'express';
/**
 * Wrap an admin route handler to automatically log the action
 * Usage:
 *   router.post('/kol', withAudit('kol', 'added'), async (req, res) => { ... });
 */
export declare function withAudit(resourceType: string, action: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Simpler version: just call this directly in route handlers
 * when you need custom logging
 */
export declare function logAdminAction(req: Request, action: string, resourceType: string, resourceId: string, oldValue?: any, newValue?: any): Promise<void>;
//# sourceMappingURL=auditLog.d.ts.map