"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whalePubsub = void 0;
exports.publishWhaleEvent = publishWhaleEvent;
const MIN_USD = Number(process.env.WHALE_TICKER_MIN_USD ?? '1000');
class WhalePubsub {
    subs = new Set();
    subscribe(sub) {
        this.subs.add(sub);
        return () => this.subs.delete(sub);
    }
    emit(event) {
        for (const sub of this.subs) {
            try {
                sub(event);
            }
            catch (err) {
                console.error('[stream] subscriber error', err);
            }
        }
    }
    count() {
        return this.subs.size;
    }
}
exports.whalePubsub = new WhalePubsub();
function publishWhaleEvent(event) {
    if (event.sizeUSD < MIN_USD)
        return;
    exports.whalePubsub.emit(event);
}
//# sourceMappingURL=streamService.js.map