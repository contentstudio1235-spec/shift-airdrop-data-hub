export declare class SocialVerificationService {
    /**
     * Create a signed state token for OAuth flows.
     * Encodes wallet, task, timestamp, optional PKCE code_verifier.
     * Token is validated on callback — protects against CSRF and forgery.
     */
    createStateToken(wallet: string, task: string, codeVerifier?: string): string;
    /**
     * Parse and verify a state token.
     * Returns null if invalid, expired (>15min), or tampered.
     */
    parseStateToken(state: string): {
        wallet: string;
        task: string;
        codeVerifier?: string;
    } | null;
    /**
     * Build the Discord OAuth2 authorization URL.
     * Scopes: identify + guilds (to check guild membership without bot permissions)
     */
    getDiscordAuthUrl(wallet: string): string;
    /**
     * Exchange Discord OAuth code for a token, then verify guild membership.
     * Returns the wallet address + whether they're in the SHIFT guild.
     */
    handleDiscordCallback(code: string, state: string): Promise<{
        wallet: string;
        inGuild: boolean;
        discordUsername?: string;
    }>;
    /**
     * Build the Twitter OAuth2 (PKCE) authorization URL.
     * Scopes: tweet.read users.read follows.read
     * PKCE code_verifier is embedded in the state token (stateless).
     */
    getTwitterAuthUrl(wallet: string): {
        url: string;
    };
    /**
     * Exchange Twitter code for token, then verify follow status.
     */
    handleTwitterCallback(code: string, state: string): Promise<{
        wallet: string;
        isFollowing: boolean;
        twitterUsername?: string;
    }>;
    /**
     * Verify Telegram Login Widget data.
     * The widget sends user data + HMAC signed with our bot token.
     * We verify the signature and then check group membership via Bot API.
     */
    handleTelegramLogin(data: Record<string, string>, wallet: string): Promise<{
        isValid: boolean;
        isMember: boolean;
        telegramUsername?: string;
    }>;
    /**
     * Record a verified social task completion:
     * 1. Write to snag_completed_tasks (our DB)
     * 2. Call SNAG's loyalty rule completion API (SNAG as backend)
     * 3. Award social badge in our DB
     */
    awardVerifiedTask(wallet: string, taskId: string): Promise<void>;
}
export declare const socialVerificationService: SocialVerificationService;
//# sourceMappingURL=socialVerificationService.d.ts.map