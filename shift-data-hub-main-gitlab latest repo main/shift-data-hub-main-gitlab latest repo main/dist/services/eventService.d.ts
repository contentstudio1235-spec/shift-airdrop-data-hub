interface Event {
    id: string;
    event_name: string;
    event_type: 'earnings' | 'macro' | 'geopolitical' | 'news_headline' | 'custom';
    description?: string;
    start_time: Date;
    end_time: Date;
    eligible_assets?: string[];
    eligible_indices?: string[];
    trigger_threshold?: number;
    is_recurring: boolean;
    recurrence_rule?: string;
    created_by: string;
    created_at: Date;
    updated_at?: Date;
}
interface NewsHeadline {
    id: string;
    headline: string;
    source: string;
    market_impact: number;
    published_at: Date;
    asset_symbols: string[];
    sentiment: 'bearish' | 'neutral' | 'bullish';
    is_market_moving: boolean;
    created_by: string;
    created_at: Date;
}
export declare class EventService {
    /**
     * Create a new event
     */
    createEvent(eventName: string, eventType: string, startTime: Date, endTime: Date, createdBy: string, description?: string, eligibleAssets?: string[], eligibleIndices?: string[], triggerThreshold?: number, isRecurring?: boolean, recurrenceRule?: string): Promise<Event>;
    /**
     * Get all events of a specific type
     */
    getEventsByType(eventType: string): Promise<Event[]>;
    /**
     * Get all active events in a time range
     */
    getActiveEventsInRange(startTime: Date, endTime: Date): Promise<Event[]>;
    /**
     * Get a specific event by ID
     */
    getEventById(eventId: string): Promise<Event | null>;
    /**
     * Check if a wallet qualifies for event-based badge eligibility
     */
    checkEventEligibility(wallet: string, eventId: string, asset?: string): Promise<boolean>;
    /**
     * Check News Reactor eligibility (position opened within 60 minutes of headline)
     */
    checkNewsReactorEligibility(wallet: string, headlineId: string, windowMinutes?: number): Promise<boolean>;
    /**
     * Add a news headline
     */
    addNewsHeadline(headline: string, source: string, marketImpact: number, publishedAt: Date, assetSymbols: string[], sentiment: 'bearish' | 'neutral' | 'bullish', createdBy: string): Promise<NewsHeadline>;
    /**
     * Get recent news headlines (last 24 hours)
     */
    getRecentNews(hoursBack?: number): Promise<NewsHeadline[]>;
    /**
     * Get news for a specific asset
     */
    getNewsForAsset(assetSymbol: string, hoursBack?: number): Promise<NewsHeadline[]>;
    /**
     * Record event activity for analytics
     */
    recordEventActivity(eventId: string, wallet: string, activityType: string, asset: string, positionSizeUSD: number, positionId?: string): Promise<void>;
    /**
     * Get event activity count (analytics)
     */
    getEventActivityCount(eventId: string): Promise<number>;
    /**
     * Get participants in an event
     */
    getEventParticipants(eventId: string): Promise<string[]>;
}
export declare const eventService: EventService;
export {};
//# sourceMappingURL=eventService.d.ts.map