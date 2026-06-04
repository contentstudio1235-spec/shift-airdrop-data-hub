export type SankeyNodeKind = 'source' | 'cohort' | 'outcome';
export interface SankeyNode {
    id: string;
    label: string;
    kind: SankeyNodeKind;
    value: number;
}
export interface SankeyEdge {
    from: string;
    to: string;
    value: number;
}
export interface WhaleOriginsResponse {
    nodes: SankeyNode[];
    edges: SankeyEdge[];
    totals: {
        sourceUsers: number;
        whales: number;
        whaleVolumeUSD: number;
    };
    computedAt: string;
    dataQuality: 'sprint_2_3_live';
}
export interface KOLEntry {
    referrer: string;
    source: 'snag_referrals' | 'utm' | 'other';
    users: number;
    holders: number;
    whales: number;
    holderRate: number;
    totalVolumeUSD: number;
    avgVolumePerUserUSD: number;
    score: number;
    firstSeenAt: string;
    lastSeenAt: string;
}
export interface KOLResponse {
    rows: KOLEntry[];
    totals: {
        totalReferrers: number;
        activeReferrers: number;
    };
    computedAt: string;
    dataQuality: 'sprint_2_3_live';
}
//# sourceMappingURL=sankey.d.ts.map