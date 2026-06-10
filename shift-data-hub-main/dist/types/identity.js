"use strict";
// src/types/identity.ts
// Types for the universal identity layer. Used by identityService, route handlers, and webhook handlers.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileNotFoundError = exports.MergeWithoutEvidenceError = exports.IdentityConflictError = void 0;
class IdentityConflictError extends Error {
    existingProfileId;
    identityType;
    identityValue;
    constructor(existingProfileId, identityType, identityValue) {
        super(`identity ${identityType}=${identityValue} already linked to profile ${existingProfileId}`);
        this.existingProfileId = existingProfileId;
        this.identityType = identityType;
        this.identityValue = identityValue;
        this.name = 'IdentityConflictError';
    }
}
exports.IdentityConflictError = IdentityConflictError;
class MergeWithoutEvidenceError extends Error {
    constructor() {
        super('mergeProfiles requires explicit evidence reason when profiles share no identity link');
        this.name = 'MergeWithoutEvidenceError';
    }
}
exports.MergeWithoutEvidenceError = MergeWithoutEvidenceError;
class ProfileNotFoundError extends Error {
    profileId;
    constructor(profileId) {
        super(`profile ${profileId} not found`);
        this.profileId = profileId;
        this.name = 'ProfileNotFoundError';
    }
}
exports.ProfileNotFoundError = ProfileNotFoundError;
//# sourceMappingURL=identity.js.map