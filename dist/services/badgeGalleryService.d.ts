/**
 * Badge Gallery Service
 * Manages badge definitions and user badge progress
 */
export interface BadgeDefinition {
    badgeName: string;
    displayName: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legend';
    unlockRequirement: string;
}
export interface UserBadge extends BadgeDefinition {
    earned: boolean;
    earnedAt: Date | null;
}
export declare class BadgeGalleryService {
    /**
     * Get all badge definitions
     */
    getAllBadges(): Promise<BadgeDefinition[]>;
    /**
     * Get user's badge progress (earned + locked)
     */
    getUserBadges(wallet: string): Promise<UserBadge[]>;
    /**
     * Get earned badges count
     */
    getEarnedBadgeCount(wallet: string): Promise<number>;
    /**
     * Get badges by rarity
     */
    getBadgesByRarity(wallet: string, rarity: string): Promise<UserBadge[]>;
    /**
     * Get rarity breakdown for user
     */
    getRarityBreakdown(wallet: string): Promise<Record<string, number>>;
}
export declare const badgeGalleryService: BadgeGalleryService;
//# sourceMappingURL=badgeGalleryService.d.ts.map