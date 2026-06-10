export type HubIncidentSeverity = 'P0' | 'P1' | 'P2';
export declare function isHubIncidentSeverity(input: unknown): input is HubIncidentSeverity;
export type HubIncidentResolution = 'fixed' | 'data_correct' | 'delayed' | 'wont_fix';
export declare function isHubIncidentResolution(input: unknown): input is HubIncidentResolution;
export interface HubIncident {
    id: number;
    openedAt: string;
    openedBy: string;
    severity: HubIncidentSeverity;
    affectedTabs: string[];
    affectedMetric: string;
    hypothesis: string | null;
    resolvedAt: string | null;
    resolution: HubIncidentResolution | null;
    fixCommitSha: string | null;
}
export interface OpenIncidentInput {
    openedBy: string;
    severity: HubIncidentSeverity;
    affectedTabs: string[];
    affectedMetric: string;
    hypothesis?: string | null;
}
export interface ResolveIncidentInput {
    resolution: HubIncidentResolution;
    fixCommitSha?: string | null;
}
export declare function openIncident(input: OpenIncidentInput): Promise<HubIncident>;
/** Returns only unresolved incidents (resolved_at IS NULL). Drives the banner. */
export declare function listActive(): Promise<HubIncident[]>;
export declare function resolveIncident(id: number, input: ResolveIncidentInput): Promise<HubIncident | null>;
//# sourceMappingURL=hubIncidentsService.d.ts.map