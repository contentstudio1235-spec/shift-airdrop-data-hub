// ============================================================
// Admin Audit Service — Log all admin actions for compliance
// ============================================================
// Every admin action must call this service to create an immutable audit trail

import { execute, query, queryOne } from '../db/pool';

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

export class AdminAuditService {
  /**
   * Log an admin action
   * Called by all admin endpoints to create immutable audit trail
   */
  async log(
    adminWallet: string,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValue?: any,
    newValue?: any,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await execute(
        `INSERT INTO admin_logs (
          admin_wallet, action, resource_type, resource_id,
          old_value, new_value, reason, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          adminWallet,
          action,
          resourceType,
          resourceId,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null,
          reason || null,
          ipAddress || null,
          userAgent || null,
        ]
      );

      console.log(
        `[AdminAudit] ${action} on ${resourceType}:${resourceId} by ${adminWallet.slice(0, 8)}...`
      );
    } catch (error) {
      console.error('[AdminAudit] Failed to log action:', error);
      // Don't throw - logging failure shouldn't break the action itself
      // but do alert so we know there's a logging problem
    }
  }

  /**
   * Fetch audit logs with filtering
   */
  async getAuditTrail(filters: AuditLogFilters): Promise<AdminLogEntry[]> {
    try {
      let sql = 'SELECT * FROM admin_logs WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (filters.action) {
        sql += ` AND action = $${paramCount}`;
        params.push(filters.action);
        paramCount++;
      }

      if (filters.resource_type) {
        sql += ` AND resource_type = $${paramCount}`;
        params.push(filters.resource_type);
        paramCount++;
      }

      if (filters.admin_wallet) {
        sql += ` AND admin_wallet = $${paramCount}`;
        params.push(filters.admin_wallet);
        paramCount++;
      }

      if (filters.resource_id) {
        sql += ` AND resource_id ILIKE $${paramCount}`;
        params.push(`%${filters.resource_id}%`);
        paramCount++;
      }

      if (filters.startDate) {
        sql += ` AND created_at >= $${paramCount}`;
        params.push(filters.startDate);
        paramCount++;
      }

      if (filters.endDate) {
        sql += ` AND created_at <= $${paramCount}`;
        params.push(filters.endDate);
        paramCount++;
      }

      // Order by newest first
      sql += ` ORDER BY created_at DESC`;

      // Pagination
      const limit = Math.min(filters.limit || 100, 1000); // Max 1000
      const offset = filters.offset || 0;
      sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const results = await query<AdminLogEntry>(sql, params);
      return results;
    } catch (error) {
      console.error('[AdminAudit] Failed to fetch logs:', error);
      return [];
    }
  }

  /**
   * Count audit logs matching criteria
   */
  async countAuditLogs(filters: AuditLogFilters): Promise<number> {
    try {
      let sql = 'SELECT COUNT(*) as count FROM admin_logs WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (filters.action) {
        sql += ` AND action = $${paramCount}`;
        params.push(filters.action);
        paramCount++;
      }

      if (filters.resource_type) {
        sql += ` AND resource_type = $${paramCount}`;
        params.push(filters.resource_type);
        paramCount++;
      }

      if (filters.admin_wallet) {
        sql += ` AND admin_wallet = $${paramCount}`;
        params.push(filters.admin_wallet);
        paramCount++;
      }

      const result = await queryOne<{ count: string }>(sql, params);
      return parseInt(result?.count || '0', 10);
    } catch (error) {
      console.error('[AdminAudit] Failed to count logs:', error);
      return 0;
    }
  }

  /**
   * Get audit logs for a specific wallet (user perspective)
   */
  async getWalletAuditTrail(
    wallet: string,
    limit: number = 100
  ): Promise<AdminLogEntry[]> {
    try {
      const results = await query<AdminLogEntry>(
        `SELECT * FROM admin_logs
         WHERE resource_type = 'user' AND resource_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [wallet, limit]
      );
      return results;
    } catch (error) {
      console.error('[AdminAudit] Failed to fetch wallet audit trail:', error);
      return [];
    }
  }

  /**
   * Get all actions by a specific admin
   */
  async getAdminActions(
    adminWallet: string,
    limit: number = 100
  ): Promise<AdminLogEntry[]> {
    try {
      const results = await query<AdminLogEntry>(
        `SELECT * FROM admin_logs
         WHERE admin_wallet = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [adminWallet, limit]
      );
      return results;
    } catch (error) {
      console.error('[AdminAudit] Failed to fetch admin actions:', error);
      return [];
    }
  }

  /**
   * Get change history for a specific resource
   */
  async getResourceHistory(
    resourceType: string,
    resourceId: string,
    limit: number = 100
  ): Promise<AdminLogEntry[]> {
    try {
      const results = await query<AdminLogEntry>(
        `SELECT * FROM admin_logs
         WHERE resource_type = $1 AND resource_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [resourceType, resourceId, limit]
      );
      return results;
    } catch (error) {
      console.error('[AdminAudit] Failed to fetch resource history:', error);
      return [];
    }
  }

  /**
   * Export audit logs to JSON (for external systems, archival, etc.)
   */
  async exportAuditLogs(filters: AuditLogFilters): Promise<AdminLogEntry[]> {
    try {
      const logs = await this.getAuditTrail({
        ...filters,
        limit: 10000, // Allow larger exports
      });
      return logs;
    } catch (error) {
      console.error('[AdminAudit] Failed to export logs:', error);
      return [];
    }
  }

  /**
   * Get audit summary (count by action type)
   */
  async getAuditSummary(
    days: number = 30
  ): Promise<Array<{ action: string; count: number }>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const results = await query<{ action: string; count: string }>(
        `SELECT action, COUNT(*) as count
         FROM admin_logs
         WHERE created_at >= $1
         GROUP BY action
         ORDER BY count DESC`,
        [cutoffDate]
      );

      return results.map(r => ({
        action: r.action,
        count: parseInt(r.count, 10),
      }));
    } catch (error) {
      console.error('[AdminAudit] Failed to get audit summary:', error);
      return [];
    }
  }
}

export const adminAuditService = new AdminAuditService();
