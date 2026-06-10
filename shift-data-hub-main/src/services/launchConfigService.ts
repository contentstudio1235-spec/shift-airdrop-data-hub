// ============================================================
// Launch Configuration Service — Dynamic Phase Management
// ============================================================
// Manages real-time launch phase configuration (multipliers, timing).
// All times are in UTC. Non-coders can adjust via admin panel.

import { execute, query, queryOne } from '../db/pool';

export interface LaunchPhaseConfig {
  phase1_start_time: Date;
  phase1_end_time: Date;
  phase1_multiplier: number;
  phase1_label: string;
  phase2_start_time: Date;
  phase2_end_time: Date;
  phase2_multiplier: number;
  phase2_label: string;
  phase3_start_time: Date;
  phase3_end_time?: Date;
  phase3_multiplier: number;
  phase3_label: string;
  is_active: boolean;
  launch_start_time: Date;
  updated_at: Date;
}

export interface CurrentPhaseResult {
  phase: 'phase1' | 'phase2' | 'phase3' | 'none';
  multiplier: number;
  label: string;
  endsAt?: Date;
  timeRemaining?: string;
}

// Cache config with 5-minute TTL to avoid DB queries on every request
let cachedConfig: LaunchPhaseConfig | null = null;
let cacheExpiry = 0;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class LaunchConfigService {
  /**
   * Get current launch phase and multiplier (UTC-aware)
   * Returns: phase name, multiplier value, and time remaining
   */
  async getCurrentPhase(): Promise<CurrentPhaseResult> {
    try {
      const config = await this.getConfig();
      if (!config || !config.is_active) {
        return {
          phase: 'none',
          multiplier: 1.0,
          label: 'No launch bonus',
        };
      }

      const now = new Date();

      // Check Phase 1
      if (now >= config.phase1_start_time && now < config.phase1_end_time) {
        const timeRemaining = this.getTimeRemaining(now, config.phase1_end_time);
        return {
          phase: 'phase1',
          multiplier: config.phase1_multiplier,
          label: config.phase1_label,
          endsAt: config.phase1_end_time,
          timeRemaining,
        };
      }

      // Check Phase 2
      if (now >= config.phase2_start_time && now < config.phase2_end_time) {
        const timeRemaining = this.getTimeRemaining(now, config.phase2_end_time);
        return {
          phase: 'phase2',
          multiplier: config.phase2_multiplier,
          label: config.phase2_label,
          endsAt: config.phase2_end_time,
          timeRemaining,
        };
      }

      // Check Phase 3
      if (now >= config.phase3_start_time) {
        if (config.phase3_end_time && now >= config.phase3_end_time) {
          // Phase 3 ended — no bonus
          return {
            phase: 'none',
            multiplier: 1.0,
            label: 'Launch bonus ended',
          };
        }
        const timeRemaining = config.phase3_end_time
          ? this.getTimeRemaining(now, config.phase3_end_time)
          : undefined;
        return {
          phase: 'phase3',
          multiplier: config.phase3_multiplier,
          label: config.phase3_label,
          endsAt: config.phase3_end_time,
          timeRemaining,
        };
      }

      // Before launch
      return {
        phase: 'none',
        multiplier: 1.0,
        label: 'Launch not started',
      };
    } catch (error) {
      console.error('[LaunchConfig] Failed to get current phase:', error);
      // Default to no bonus on error
      return {
        phase: 'none',
        multiplier: 1.0,
        label: 'Error reading config',
      };
    }
  }

  /**
   * Get full launch configuration (cached)
   */
  async getConfig(): Promise<LaunchPhaseConfig | null> {
    try {
      // Return from cache if not expired
      const now = Date.now();
      if (cachedConfig && now < cacheExpiry) {
        console.log('[LaunchConfig] Serving from cache (TTL: ' + Math.round((cacheExpiry - now) / 1000) + 's remaining)');
        return cachedConfig;
      }

      // Fetch from DB
      const result = await queryOne<LaunchPhaseConfig>(
        'SELECT * FROM launch_config ORDER BY created_at DESC LIMIT 1'
      );

      if (result) {
        cachedConfig = result;
        cacheExpiry = now + CACHE_TTL_MS;
        console.log('[LaunchConfig] Loaded from database and cached');
      }

      return result || null;
    } catch (error) {
      console.error('[LaunchConfig] Failed to fetch config:', error);
      return null;
    }
  }

  /**
   * Update a specific phase (admin only)
   * Admin changes are immediately reflected after cache expiry (5 minutes max)
   * For instant updates, clear cache manually
   */
  async updatePhase(
    phase: 'phase1' | 'phase2' | 'phase3',
    updates: {
      multiplier?: number;
      label?: string;
      start_time?: Date;
      end_time?: Date;
    },
    adminWallet: string,
    reason?: string
  ): Promise<void> {
    try {
      const config = await this.getConfig();
      if (!config) throw new Error('No launch config found');

      const fieldMap: Record<string, string> = {
        multiplier: `${phase}_multiplier`,
        label: `${phase}_label`,
        start_time: `${phase}_start_time`,
        end_time: `${phase}_end_time`,
      };

      let sql = `UPDATE launch_config SET `;
      const values: any[] = [];
      let paramCount = 1;

      for (const [key, field] of Object.entries(fieldMap)) {
        if (updates[key as keyof typeof updates] !== undefined) {
          sql += `${field} = $${paramCount}, `;
          values.push(updates[key as keyof typeof updates]);
          paramCount++;
        }
      }

      sql += `updated_by = $${paramCount}, updated_at = NOW() WHERE id = (SELECT id FROM launch_config ORDER BY created_at DESC LIMIT 1)`;
      values.push(adminWallet);

      await execute(sql, values);

      // Log the change
      await this.logAudit(adminWallet, `${phase}_updated`, phase, updates, reason);

      // Invalidate cache for immediate reflection
      this.clearCache();
      console.log(`[LaunchConfig] Phase ${phase} updated by ${adminWallet.slice(0, 8)}...`);
    } catch (error) {
      console.error('[LaunchConfig] Failed to update phase:', error);
      throw error;
    }
  }

  /**
   * Toggle launch bonus on/off
   */
  async toggleLaunchBonus(isActive: boolean, adminWallet: string, reason?: string): Promise<void> {
    try {
      await execute(
        `UPDATE launch_config SET is_active = $1, updated_by = $2, updated_at = NOW()
         WHERE id = (SELECT id FROM launch_config ORDER BY created_at DESC LIMIT 1)`,
        [isActive, adminWallet]
      );

      await this.logAudit(adminWallet, 'toggle_active', 'launch_config', { is_active: isActive }, reason);

      this.clearCache();
      console.log(`[LaunchConfig] Launch bonus toggled: ${isActive ? 'ON' : 'OFF'} by ${adminWallet.slice(0, 8)}...`);
    } catch (error) {
      console.error('[LaunchConfig] Failed to toggle launch bonus:', error);
      throw error;
    }
  }

  /**
   * Clear cache (call after updates for instant frontend reflection)
   */
  clearCache(): void {
    cachedConfig = null;
    cacheExpiry = 0;
    console.log('[LaunchConfig] Cache cleared');
  }

  /**
   * Helper: Calculate time remaining until a date
   */
  private getTimeRemaining(now: Date, endTime: Date): string {
    const msRemaining = endTime.getTime() - now.getTime();
    if (msRemaining <= 0) return 'Ended';

    const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else {
      return `${hours}h remaining`;
    }
  }

  /**
   * Audit logging for launch config changes
   */
  private async logAudit(
    adminWallet: string,
    action: string,
    resourceId: string,
    newValue: any,
    reason?: string
  ): Promise<void> {
    try {
      await execute(
        `INSERT INTO launch_config_audit
         (admin_wallet, action, resource_id, new_value, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [adminWallet, action, resourceId, JSON.stringify(newValue), reason || null]
      );
    } catch (err) {
      console.error('[LaunchConfig] Audit logging failed:', err);
      // Don't throw — audit failure shouldn't block the main operation
    }
  }
}

export const launchConfigService = new LaunchConfigService();
