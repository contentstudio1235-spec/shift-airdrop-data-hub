import { AntiFarmResult } from '../types';
export declare class AntiFarmService {
    /**
     * Master filter — returns true if the position should be REJECTED.
     */
    shouldFilter(wallet: string, asset: string, positionSizeUSD: number, timestamp: Date): Promise<AntiFarmResult>;
    /**
     * Check if a position has been held long enough to earn XP.
     * Called during XP recalculation, NOT during position open.
     */
    isUnderMinHold(openedAt: Date, referenceDate?: Date): boolean;
    /**
     * Rule 1: Position size below minimum threshold.
     */
    isDust(positionSizeUSD: number): boolean;
    /**
     * Rule 2: Detect wash trading — opposite direction, same asset, rapid close/open.
     * Checks if there was a close event on same asset within the wash trade window.
     */
    isWashTrade(wallet: string, asset: string, timestamp: Date): Promise<boolean>;
    /**
     * Rule 3: Prevent reopening same asset too quickly after closing.
     */
    isOnCooldown(wallet: string, asset: string): Promise<boolean>;
    /**
     * Log anti-farm flag for audit.
     */
    private logFlag;
}
export declare const antiFarmService: AntiFarmService;
//# sourceMappingURL=antiFarmService.d.ts.map