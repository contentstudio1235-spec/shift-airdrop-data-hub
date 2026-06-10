export type HubFlagStatus = 'open' | 'triaging' | 'closed_correct' | 'closed_delayed' | 'closed_fixed';
export declare function isHubFlagStatus(input: unknown): input is HubFlagStatus;
export type HubFlagTriageStatus = 'triaging' | 'closed_correct' | 'closed_delayed';
export declare function isHubFlagTriageStatus(input: unknown): input is HubFlagTriageStatus;
export interface HubFlag {
    id: number;
    flaggedAt: string;
    sessionId: string | null;
    hubRole: string | null;
    tab: string;
    metricId: string;
    displayedValue: string | null;
    asOf: string | null;
    comment: string | null;
    status: HubFlagStatus;
    triagedAt: string | null;
    triagedBy: string | null;
    resolutionNote: string | null;
    incidentId: number | null;
}
export interface FileFlagInput {
    sessionId?: string | null;
    hubRole?: string | null;
    tab: string;
    metricId: string;
    displayedValue?: string | null;
    asOf?: string | null;
    comment?: string | null;
}
export interface ListFlagsFilter {
    status?: HubFlagStatus | null;
    sinceISO?: string | null;
    limit?: number | null;
}
export interface TriageFlagInput {
    status: HubFlagTriageStatus;
    triagedBy: string;
    resolutionNote?: string | null;
    incidentId?: number | null;
}
export declare function fileFlag(input: FileFlagInput): Promise<HubFlag>;
export declare function listFlags(filter?: ListFlagsFilter): Promise<HubFlag[]>;
export declare function triageFlag(id: number, input: TriageFlagInput): Promise<HubFlag | null>;
//# sourceMappingURL=hubFlagsService.d.ts.map