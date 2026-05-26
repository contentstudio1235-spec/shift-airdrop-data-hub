// Certificate Service — Achievement certificate management
import { query, queryOne, execute } from '../db/pool';
import { realtimeSnagSyncService } from './realtimeSnagSyncService';
import { positionService } from './positionService';

interface Certificate {
  id: string;
  name: string;
  category: string;
  display_name: string;
  multiplier_value: number;
  multiplier_type: string;
  is_soulbound: boolean;
  unlock_requirement?: string;
}

export class CertificateService {
  async createCertificate(
    name: string,
    category: string,
    displayName: string,
    multiplierValue: number,
    multiplierType: string,
    createdBy: string
  ): Promise<Certificate> {
    const result = await queryOne<Certificate>(
      `INSERT INTO certificates (name, category, display_name, multiplier_value, multiplier_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, category, displayName, multiplierValue, multiplierType, createdBy]
    );
    console.log(`[Certificates] Created: ${displayName}`);
    return result!;
  }

  async getCertificatesByCategory(category: string): Promise<Certificate[]> {
    return query<Certificate>(
      `SELECT * FROM certificates WHERE category = $1 AND is_active = true`,
      [category]
    );
  }

  async getWalletCertificates(wallet: string): Promise<Certificate[]> {
    return query<Certificate>(
      `SELECT DISTINCT c.* FROM certificates c
       INNER JOIN user_certificates uc ON c.id = uc.certificate_id
       WHERE uc.wallet = $1 AND uc.revoked_at IS NULL`,
      [wallet]
    );
  }

  async awardCertificate(wallet: string, certificateId: string, awardedBy: string = 'system'): Promise<void> {
    // Ensure user exists first (required for FK constraint in user_certificates table)
    await positionService.ensureUserExists(wallet);

    const cert = await queryOne<Certificate>(`SELECT * FROM certificates WHERE id = $1`, [certificateId]);
    if (!cert) throw new Error('Certificate not found');

    await execute(
      `INSERT INTO user_certificates (wallet, certificate_id, awarded_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [wallet, certificateId, awardedBy]
    );

    console.log(`[Certificates] Awarded "${cert.display_name}" to ${wallet.slice(0, 8)}`);
    await realtimeSnagSyncService.queueBadgeSync(wallet, `cert_${cert.name}`);
  }

  async revokeCertificate(wallet: string, certificateId: string, revokedBy: string, reason: string): Promise<void> {
    const cert = await queryOne<Certificate>(`SELECT * FROM certificates WHERE id = $1`, [certificateId]);
    if (!cert) throw new Error('Certificate not found');
    if (cert.is_soulbound) throw new Error('Cannot revoke soulbound certificate');

    await execute(
      `UPDATE user_certificates SET revoked_by = $1, revoked_at = NOW(), revocation_reason = $2
       WHERE wallet = $3 AND certificate_id = $4`,
      [revokedBy, reason, wallet, certificateId]
    );
  }

  async awardTierHolderCertificate(wallet: string): Promise<void> {
    const badges = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM badges WHERE wallet = $1`,
      [wallet]
    );

    const badgeCount = parseInt(badges?.count || '0', 10);
    const tierCerts = await query<Certificate>(
      `SELECT * FROM certificates WHERE category = 'tier_holders' AND tier_requirement <= $1`,
      [badgeCount]
    );

    for (const cert of tierCerts) {
      await this.awardCertificate(wallet, cert.id, 'system');
    }
  }

  async getCertificateMultiplierBoost(wallet: string): Promise<number> {
    const certs = await this.getWalletCertificates(wallet);
    return certs.reduce((sum, cert) => sum + ((cert.multiplier_value || 1.0) - 1.0), 0);
  }

  async resetSeasonalCertificates(seasonId: number): Promise<number> {
    const result = await execute(
      `UPDATE user_certificates SET revoked_at = NOW() WHERE certificate_id IN
       (SELECT id FROM certificates WHERE season_id = $1)`,
      [seasonId]
    );
    return 0;
  }
}

export const certificateService = new CertificateService();
