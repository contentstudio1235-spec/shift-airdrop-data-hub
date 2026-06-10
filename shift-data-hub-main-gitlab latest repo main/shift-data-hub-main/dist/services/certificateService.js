"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certificateService = exports.CertificateService = void 0;
// Certificate Service — Achievement certificate management
const pool_1 = require("../db/pool");
const realtimeSnagSyncService_1 = require("./realtimeSnagSyncService");
const positionService_1 = require("./positionService");
class CertificateService {
    async createCertificate(name, category, displayName, multiplierValue, multiplierType, createdBy) {
        const result = await (0, pool_1.queryOne)(`INSERT INTO certificates (name, category, display_name, multiplier_value, multiplier_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [name, category, displayName, multiplierValue, multiplierType, createdBy]);
        console.log(`[Certificates] Created: ${displayName}`);
        return result;
    }
    async getCertificatesByCategory(category) {
        return (0, pool_1.query)(`SELECT * FROM certificates WHERE category = $1 AND is_active = true`, [category]);
    }
    async getWalletCertificates(wallet) {
        return (0, pool_1.query)(`SELECT DISTINCT c.* FROM certificates c
       INNER JOIN user_certificates uc ON c.id = uc.certificate_id
       WHERE uc.wallet = $1 AND uc.revoked_at IS NULL`, [wallet]);
    }
    async awardCertificate(wallet, certificateId, awardedBy = 'system') {
        // Ensure user exists first (required for FK constraint in user_certificates table)
        await positionService_1.positionService.ensureUserExists(wallet);
        const cert = await (0, pool_1.queryOne)(`SELECT * FROM certificates WHERE id = $1`, [certificateId]);
        if (!cert)
            throw new Error('Certificate not found');
        await (0, pool_1.execute)(`INSERT INTO user_certificates (wallet, certificate_id, awarded_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [wallet, certificateId, awardedBy]);
        console.log(`[Certificates] Awarded "${cert.display_name}" to ${wallet.slice(0, 8)}`);
        await realtimeSnagSyncService_1.realtimeSnagSyncService.queueBadgeSync(wallet, `cert_${cert.name}`);
    }
    async revokeCertificate(wallet, certificateId, revokedBy, reason) {
        const cert = await (0, pool_1.queryOne)(`SELECT * FROM certificates WHERE id = $1`, [certificateId]);
        if (!cert)
            throw new Error('Certificate not found');
        if (cert.is_soulbound)
            throw new Error('Cannot revoke soulbound certificate');
        await (0, pool_1.execute)(`UPDATE user_certificates SET revoked_by = $1, revoked_at = NOW(), revocation_reason = $2
       WHERE wallet = $3 AND certificate_id = $4`, [revokedBy, reason, wallet, certificateId]);
    }
    async awardTierHolderCertificate(wallet) {
        const badges = await (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM badges WHERE wallet = $1`, [wallet]);
        const badgeCount = parseInt(badges?.count || '0', 10);
        const tierCerts = await (0, pool_1.query)(`SELECT * FROM certificates WHERE category = 'tier_holders' AND tier_requirement <= $1`, [badgeCount]);
        for (const cert of tierCerts) {
            await this.awardCertificate(wallet, cert.id, 'system');
        }
    }
    async getCertificateMultiplierBoost(wallet) {
        const certs = await this.getWalletCertificates(wallet);
        return certs.reduce((sum, cert) => sum + ((cert.multiplier_value || 1.0) - 1.0), 0);
    }
    async resetSeasonalCertificates(seasonId) {
        const result = await (0, pool_1.execute)(`UPDATE user_certificates SET revoked_at = NOW() WHERE certificate_id IN
       (SELECT id FROM certificates WHERE season_id = $1)`, [seasonId]);
        return 0;
    }
}
exports.CertificateService = CertificateService;
exports.certificateService = new CertificateService();
//# sourceMappingURL=certificateService.js.map