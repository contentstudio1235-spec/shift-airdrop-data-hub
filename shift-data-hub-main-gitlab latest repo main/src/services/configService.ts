// Configuration Service — System-wide settings management
// Allows non-coders to adjust anti-farm, multipliers, launch config, etc.

import { query, queryOne, execute } from '../db/pool';
import { adminAuditService } from './adminAuditService';

export class ConfigService {
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private cacheTTLMs = 60000;

  async getConfig(key: string): Promise<any> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTLMs) {
      return cached.value;
    }

    const result = await queryOne<{ setting_value: string }>(
      `SELECT setting_value FROM airdrop_config WHERE setting_key = $1`,
      [key]
    );

    if (!result) {
      console.warn(`[ConfigService] Key not found: ${key}`);
      return null;
    }

    const value = typeof result.setting_value === 'string'
      ? JSON.parse(result.setting_value)
      : result.setting_value;

    this.cache.set(key, { value, timestamp: Date.now() });
    return value;
  }

  async getAllConfig(): Promise<Record<string, any>> {
    const results = await query<{ setting_key: string; setting_value: string }>(
      `SELECT setting_key, setting_value FROM airdrop_config ORDER BY setting_key`
    );

    const config: Record<string, any> = {};
    for (const row of results) {
      const value = typeof row.setting_value === 'string'
        ? JSON.parse(row.setting_value)
        : row.setting_value;
      config[row.setting_key] = value;
    }

    return config;
  }

  async setConfig(
    key: string,
    newValue: any,
    adminWallet: string,
    reason: string
  ): Promise<void> {
    this.validateConfig(key, newValue);

    const oldValue = await this.getConfig(key);

    await execute(
      `UPDATE airdrop_config SET setting_value = $1, updated_by = $2, updated_at = NOW() WHERE setting_key = $3`,
      [JSON.stringify(newValue), adminWallet, key]
    );

    this.cache.delete(key);

    await adminAuditService.log(
      'config_updated',
      'config',
      key,
      oldValue,
      newValue,
      reason,
      adminWallet
    );

    console.log(`[ConfigService] Updated ${key}`);
  }

  private validateConfig(key: string, value: any): void {
    switch (key) {
      case 'anti_farm':
        if (value.minPositionSizeUSD < 0) throw new Error('minPositionSizeUSD >= 0');
        if (value.minHoldHours < 0) throw new Error('minHoldHours >= 0');
        break;

      case 'multiplier_progression':
        if (value.maxMultiplier < 1) throw new Error('maxMultiplier >= 1.0');
        break;

      case 'launch_config':
        if (value.week1Multiplier < 1) throw new Error('week1Multiplier >= 1.0');
        break;

      case 'referral_bonuses':
        if (value.kolDynamicMultiplier < 1) throw new Error('kolDynamicMultiplier >= 1.0');
        break;

      case 'tracked_tokens':
        if (!Array.isArray(value)) throw new Error('tracked_tokens must be array');
        break;

      default:
        break;
    }
  }

  clearCache(key?: string): void {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }

  async getConfigHistory(key: string, limit: number = 50): Promise<any[]> {
    return query<any>(
      `SELECT admin_wallet, old_value, new_value, reason, created_at FROM admin_logs
       WHERE resource_type = 'config' AND resource_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [key, limit]
    );
  }
}

export const configService = new ConfigService();
