export declare class ConfigService {
    private cache;
    private cacheTTLMs;
    getConfig(key: string): Promise<any>;
    getAllConfig(): Promise<Record<string, any>>;
    setConfig(key: string, newValue: any, adminWallet: string, reason: string): Promise<void>;
    private validateConfig;
    clearCache(key?: string): void;
    getConfigHistory(key: string, limit?: number): Promise<any[]>;
}
export declare const configService: ConfigService;
//# sourceMappingURL=configService.d.ts.map