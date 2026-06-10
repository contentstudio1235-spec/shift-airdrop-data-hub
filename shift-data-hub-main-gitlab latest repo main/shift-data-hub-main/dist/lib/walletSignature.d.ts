export interface SignedEnvelope {
    wallet: string;
    message: string;
    signature: string;
}
export declare function verifyWalletSignature(env: SignedEnvelope): boolean;
export declare function isSignatureFresh(message: string, maxAgeSeconds?: number): boolean;
//# sourceMappingURL=walletSignature.d.ts.map