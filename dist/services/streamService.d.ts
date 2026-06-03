import type { WhaleStreamEvent } from '../types/funnel';
type Subscriber = (event: WhaleStreamEvent) => void;
declare class WhalePubsub {
    private subs;
    subscribe(sub: Subscriber): () => void;
    emit(event: WhaleStreamEvent): void;
    count(): number;
}
export declare const whalePubsub: WhalePubsub;
export declare function publishWhaleEvent(event: WhaleStreamEvent): void;
export {};
//# sourceMappingURL=streamService.d.ts.map