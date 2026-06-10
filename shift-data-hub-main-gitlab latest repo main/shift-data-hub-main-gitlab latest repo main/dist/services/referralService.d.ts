export interface KolEntry {
    wallet: string;
    customCode: string;
    displayName?: string;
    multiplierBonus: number;
    multiplierType: 'dynamic' | 'permanent';
    isActive: boolean;
    notes?: string;
    createdAt: string;
}
export interface ReferralCodeInfo {
    code: string;
    referrerWallet: string | null;
    displayName: string | null;
    isKol: boolean;
    multiplierBonus: number;
    multiplierType: 'dynamic' | 'permanent' | 'none';
    isActive: boolean;
}
/** Generate wallet-based standard referral code (e.g. "3uDJ7x") */
export declare function walletToCode(wallet: string): string;
/** Validate a code string — use constants-based validation */
export declare function isValidCode(code: string): boolean;
/**
 * Resolve a referral code to its owner + bonus info.
 * Checks KOL whitelist first, then standard wallet-based codes.
 * CRITICAL: Validates code format before querying DB (prevent injection).
 */
export declare function resolveReferralCode(code: string): Promise<ReferralCodeInfo | null>;
/**
 * Register a new wallet. Optionally apply a referral code.
 * Returns the queue position, referral link, and bonus info.
 */
export declare function registerWithReferral(wallet: string, refCode?: string): Promise<{
    wallet: string;
    queuePosition: number;
    totalMembers: number;
    referralCode: string;
    referralLink: string;
    bonusApplied: boolean;
    bonusMultiplier: number;
    bonusType: string;
    referrerDisplayName: string | null;
}>;
export declare function addKol(params: {
    wallet: string;
    customCode: string;
    displayName?: string;
    multiplierBonus?: number;
    multiplierType?: 'dynamic' | 'permanent';
    notes?: string;
    createdBy?: string;
}): Promise<KolEntry>;
export declare function listKols(): Promise<(KolEntry & {
    referralCount: number;
    inviteXpGiven: number;
})[]>;
export declare function updateKol(wallet: string, updates: Partial<{
    customCode: string;
    displayName: string;
    multiplierBonus: number;
    multiplierType: 'dynamic' | 'permanent';
    isActive: boolean;
    notes: string;
}>): Promise<KolEntry | null>;
export declare const referralService: {
    resolveReferralCode: typeof resolveReferralCode;
    registerWithReferral: typeof registerWithReferral;
    addKol: typeof addKol;
    listKols: typeof listKols;
    updateKol: typeof updateKol;
    walletToCode: typeof walletToCode;
};
export default referralService;
//# sourceMappingURL=referralService.d.ts.map