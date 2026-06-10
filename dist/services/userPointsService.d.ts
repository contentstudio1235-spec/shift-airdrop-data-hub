/**
 * User Points Service
 *
 * Final SP formula:
 *   Final = (Position SP × 2.0)
 *         + (Social SP × 1.0)
 *         + (Referral Position SP × 1.0)   ← 10-15% of referred's Position SP, on top of their 2X
 *
 * Where:
 *   Position SP          = total_xp              (holding positions; 2X already baked in via XP formula)
 *   Social SP            = snag_points            (Snag task completions — includes Snag's own referral
 *                                                  rewards that Snag auto-awards to referrers)
 *   Referral Position SP = referral_position_sp   (10–15% of referred wallets' position SP)
 *
 * Social Referral SP is NOT calculated here. Snag handles it on their end and it
 * flows back into snag_points via the normal Snag sync. No double-counting.
 */
export interface UserPoints {
    wallet: string;
    positionSp: number;
    socialSp: number;
    referralPositionSp: number;
    finalPoints: number;
}
export declare class UserPointsService {
    private static readonly POSITION_MULTIPLIER;
    private static readonly SOCIAL_MULTIPLIER;
    private static readonly REFERRAL_POSITION_MULTIPLIER;
    calculateFinalPoints(wallet: string): Promise<UserPoints>;
    calculateAllFinalPoints(limit?: number): Promise<UserPoints[]>;
    getRankByFinalPoints(wallet: string): Promise<number>;
    getTopByFinalPoints(limit?: number): Promise<(UserPoints & {
        rank: number;
    })[]>;
}
export declare const userPointsService: UserPointsService;
//# sourceMappingURL=userPointsService.d.ts.map