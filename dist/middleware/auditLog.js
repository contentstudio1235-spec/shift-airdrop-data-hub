"use strict";
// ============================================================
// Audit Log Middleware — Wrap admin endpoints for logging
// ============================================================
// Usage: wrap any admin route handler with auditLog() to auto-log all changes
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAudit = withAudit;
exports.logAdminAction = logAdminAction;
const adminAuditService_1 = require("../services/adminAuditService");
/**
 * Extract admin wallet from request
 * Assumes admin is authenticated via passcode header (x-admin-key)
 * For now, we use 'admin' as placeholder since we don't have admin identity
 * In future, could integrate with wallet-based admin authentication
 */
function getAdminWallet(req) {
    // TODO: If implementing wallet-based admin auth, extract from JWT/session
    return req.body?.adminWallet || 'admin-system';
}
/**
 * Wrap an admin route handler to automatically log the action
 * Usage:
 *   router.post('/kol', withAudit('kol', 'added'), async (req, res) => { ... });
 */
function withAudit(resourceType, action) {
    return async (req, res, next) => {
        // Capture request body before it's modified
        const originalBody = JSON.stringify(req.body);
        // Capture original send to intercept response
        const originalSend = res.send;
        let responseBody = null;
        res.send = function (data) {
            if (typeof data === 'string') {
                try {
                    responseBody = JSON.parse(data);
                }
                catch {
                    responseBody = data;
                }
            }
            else {
                responseBody = data;
            }
            return originalSend.call(this, data);
        };
        // Call next and then log after response is sent
        const originalJson = res.json;
        res.json = function (data) {
            responseBody = data;
            return originalJson.call(this, data);
        };
        // Continue to next middleware/handler
        const handlerNext = () => {
            // After handler completes, log the action
            process.nextTick(async () => {
                try {
                    const adminWallet = getAdminWallet(req);
                    const resourceId = req.params.id || req.params.wallet || req.body?.id || 'unknown';
                    const reason = req.body?.reason ||
                        req.query?.reason ||
                        `Admin action via API`;
                    const ipAddress = req.headers['x-forwarded-for'] ||
                        req.socket.remoteAddress ||
                        'unknown';
                    const userAgent = req.headers['user-agent'] || 'unknown';
                    // Determine old vs new values
                    let oldValue = null;
                    let newValue = null;
                    // For POST (create): newValue = response body
                    if (req.method === 'POST' && responseBody?.success) {
                        newValue = responseBody.kol || responseBody.badge || responseBody.data;
                    }
                    // For PATCH (update): oldValue could come from DB, newValue = request body
                    if (req.method === 'PATCH') {
                        newValue = req.body;
                    }
                    // For DELETE: just note it
                    if (req.method === 'DELETE') {
                        newValue = { deleted: true };
                    }
                    await adminAuditService_1.adminAuditService.log(adminWallet, action, resourceType, String(resourceId), oldValue, newValue, reason, ipAddress, userAgent);
                }
                catch (error) {
                    console.error('[AuditMiddleware] Failed to log action:', error);
                    // Don't fail the response if logging fails
                }
            });
            next();
        };
        // Execute handler with our logging wrapper
        handlerNext();
    };
}
/**
 * Simpler version: just call this directly in route handlers
 * when you need custom logging
 */
async function logAdminAction(req, action, resourceType, resourceId, oldValue, newValue) {
    const adminWallet = getAdminWallet(req);
    const reason = req.body?.reason || `Admin action via ${req.method} ${req.path}`;
    const ipAddress = req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    await adminAuditService_1.adminAuditService.log(adminWallet, action, resourceType, resourceId, oldValue, newValue, reason, ipAddress, userAgent);
}
//# sourceMappingURL=auditLog.js.map