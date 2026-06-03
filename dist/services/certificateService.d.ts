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
export declare class CertificateService {
    createCertificate(name: string, category: string, displayName: string, multiplierValue: number, multiplierType: string, createdBy: string): Promise<Certificate>;
    getCertificatesByCategory(category: string): Promise<Certificate[]>;
    getWalletCertificates(wallet: string): Promise<Certificate[]>;
    awardCertificate(wallet: string, certificateId: string, awardedBy?: string): Promise<void>;
    revokeCertificate(wallet: string, certificateId: string, revokedBy: string, reason: string): Promise<void>;
    awardTierHolderCertificate(wallet: string): Promise<void>;
    getCertificateMultiplierBoost(wallet: string): Promise<number>;
    resetSeasonalCertificates(seasonId: number): Promise<number>;
}
export declare const certificateService: CertificateService;
export {};
//# sourceMappingURL=certificateService.d.ts.map