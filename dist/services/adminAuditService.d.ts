export interface AdminLogEntry {
    id: string;
    admin_wallet: string;
    action: string;
    resource_type: string;
    resource_id: string;
    old_value?: any;
    new_value?: any;
    reason: string;
    ip_address?: string;
    user_agent?: string;
    created_at: Date;
}
export interface AuditLogFilters {
    action?: string;
    resource_type?: string;
    admin_wallet?: string;
    resource_id?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}
export declare class AdminAuditService {
    /**
     * Log an admin action
     * Called by all admin endpoints to create immutable audit trail
     */
    log(adminWallet: string, action: string, resourceType: string, resourceId: string, oldValue?: any, newValue?: any, reason?: string, ipAddress?: string, userAgent?: string): Promise<void>;
    /**
     * Fetch audit logs with filtering
     */
    getAuditTrail(filters: AuditLogFilters): Promise<AdminLogEntry[]>;
    /**
     * Count audit logs matching criteria
     */
    countAuditLogs(filters: AuditLogFilters): Promise<number>;
    /**
     * Get audit logs for a specific wallet (user perspective)
     */
    getWalletAuditTrail(wallet: string, limit?: number): Promise<AdminLogEntry[]>;
    /**
     * Get all actions by a specific admin
     */
    getAdminActions(adminWallet: string, limit?: number): Promise<AdminLogEntry[]>;
    /**
     * Get change history for a specific resource
     */
    getResourceHistory(resourceType: string, resourceId: string, limit?: number): Promise<AdminLogEntry[]>;
    /**
     * Export audit logs to JSON (for external systems, archival, etc.)
     */
    exportAuditLogs(filters: AuditLogFilters): Promise<AdminLogEntry[]>;
    /**
     * Get audit summary (count by action type)
     */
    getAuditSummary(days?: number): Promise<Array<{
        action: string;
        count: number;
    }>>;
}
export declare const adminAuditService: AdminAuditService;
//# sourceMappingURL=adminAuditService.d.ts.map