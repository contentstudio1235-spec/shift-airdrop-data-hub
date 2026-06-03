export interface WhaleEvent {
    type: 'open' | 'close';
    wallet: string;
    walletDisplay: string;
    source: string;
    asset: string;
    sizeUSD: number;
    openedAt: string;
    isHistorical?: boolean;
}
//# sourceMappingURL=whale.d.ts.map