"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWalletSignature = verifyWalletSignature;
exports.isSignatureFresh = isSignatureFresh;
// src/lib/walletSignature.ts
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
function verifyWalletSignature(env) {
    if (!env.wallet || !env.message || !env.signature)
        return false;
    let pubkey;
    let sig;
    try {
        pubkey = bs58_1.default.decode(env.wallet);
        sig = bs58_1.default.decode(env.signature);
    }
    catch {
        return false;
    }
    if (pubkey.length !== 32)
        return false;
    if (sig.length !== 64)
        return false;
    try {
        return tweetnacl_1.default.sign.detached.verify(new TextEncoder().encode(env.message), sig, pubkey);
    }
    catch {
        return false;
    }
}
// Helper: parses message of form "shift-connect:<unix_ts>" and rejects if older than maxAgeSeconds.
// Accepts both seconds (10 digits) and milliseconds (13 digits) timestamps.
function isSignatureFresh(message, maxAgeSeconds = 300) {
    const match = /^shift-connect:(\d{10,13})$/.exec(message);
    if (!match)
        return false;
    const ts = Number(match[1]);
    const tsSeconds = ts > 1e12 ? Math.floor(ts / 1000) : ts;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return Math.abs(nowSeconds - tsSeconds) <= maxAgeSeconds;
}
//# sourceMappingURL=walletSignature.js.map