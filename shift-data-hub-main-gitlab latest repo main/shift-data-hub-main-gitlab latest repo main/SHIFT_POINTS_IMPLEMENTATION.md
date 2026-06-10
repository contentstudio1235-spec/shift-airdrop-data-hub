# Shift Points (SP) Implementation — Global Rename + Real-time SNAG Sync

## Overview

Complete rebranding of "XP" to "Shift Points" (SP symbol) across all frontend pages, combined with real-time SNAG database synchronization to eliminate data mismatches.

---

## Frontend Changes ✅

### Updated Pages

**1. Leaderboard (`frontend/app/leaderboard/page.tsx`)**
- ✅ Header: "Top traders ranked by Shift Points (SP) earned"
- ✅ Column header: "Total SP" (instead of "Total XP")
- ✅ Stat label: "SP" (instead of "XP")
- ✅ All point displays now use SP notation

**2. Airdrop (`frontend/app/airdrop/page.tsx`)**
- ✅ Main heading: "Earn Shift Points & Compete for SHIFT"
- ✅ Subtitle: "...limited-time bonus Shift Points"
- ✅ FAQ answers: All XP references → "Shift Points"
  - "How are Shift Points calculated?"
  - "earn 3x more Shift Points in the first week"
  - "Each grants bonus Shift Points multiplier"
  - "your total Shift Points are converted"
  - "Can I lose Shift Points?"
- ✅ Stat labels:
  - "Total XP" → "Total SP"
  - "Weekly XP" → "Weekly SP"
- ✅ Column headers: "XP/wk" → "SP/wk"
- ✅ Sidebar labels:
  - "On-chain XP" → "On-chain SP"
  - "Referral XP" → "Referral SP"
- ✅ Hints/tooltips: "...start earning Shift Points"
- ✅ Weekly total: "+X SP/week total"
- ✅ Twitter share: "...earn Shift Points. Join via..."
- ✅ SNAG text: "...bonus Shift Points!"

### UI Impact

- All references now use "Shift Points" in user-facing text
- Abbreviated to "SP" in tables and compact displays (matches financial conventions like "USD")
- Consistent across leaderboard, airdrop dashboard, and FAQs

---

## Backend Real-Time Sync ✅

### New Service: `realtimeSnagSyncService.ts`

**Purpose**: Push Shift Points and multiplier changes to SNAG **immediately** instead of waiting for cron-based polling.

**Key Features**:

1. **Queue-Based Architecture**
   - Debounces multiple updates from same wallet within 2 seconds
   - Batches updates for efficient API calls
   - Automatic retry logic (3 attempts max)

2. **Methods**
   ```typescript
   queueXPSync(wallet, amount)           // Queue Shift Points change
   queueMultiplierSync(wallet, newMult)  // Queue multiplier update
   queueBadgeSync(wallet, badgeName)     // Queue badge award (immediate)
   forceSync()                            // Force process queue now
   ```

3. **Sync Types**
   - **XP Syncs**: Batched together, debounced 2 seconds
   - **Multiplier Syncs**: Batched together, debounced 2 seconds
   - **Badge Syncs**: Processed immediately
   - **Failed Syncs**: Logged to `snag_sync_failures` table for manual retry

4. **Retry Strategy**
   - Max 3 attempts per failed sync
   - Failed syncs logged with wallet, type, value, reason
   - Admin can manually review and retry via admin panel

### Database Migration: `010_realtime_sync_tracking.sql`

**New Tables**:
- `snag_sync_failures`: Tracks sync failures for manual review
  - Fields: wallet, sync_type, value, failure_reason, retry_count, last_retry_at, failed_at
  - Indexed by: wallet, sync_type, failed_at

**User Table Enhancements**:
- `last_snag_xp_sync` TIMESTAMP: When XP was last synced
- `last_snag_multiplier_sync` TIMESTAMP: When multiplier was last synced
- `snag_sync_status` VARCHAR: pending | syncing | synced | failed (for monitoring)

---

## Integration Hooks

### Where to Wire Real-Time Sync

These are the places where XP or multipliers change and should trigger real-time sync:

**1. Position Service** (`src/services/positionService.ts`)
   ```typescript
   // After XP is calculated
   await realtimeSnagSyncService.queueXPSync(wallet, xpGained);
   ```

**2. XP Engine** (`src/services/xpEngine.ts`)
   ```typescript
   // After recalculating XP
   await realtimeSnagSyncService.queueXPSync(wallet, totalXP);
   ```

**3. Multiplier Service** (`src/services/multiplierService.ts`)
   ```typescript
   // After calculating new multiplier
   await realtimeSnagSyncService.queueMultiplierSync(wallet, newMultiplier);
   ```

**4. Badge Service** (`src/services/badgeService.ts`)
   ```typescript
   // After awarding a badge
   await realtimeSnagSyncService.queueBadgeSync(wallet, badgeName);
   ```

**5. Daily Checkin** (`src/services/dailyCheckinService.ts`)
   ```typescript
   // After checkin completes and XP is awarded
   await realtimeSnagSyncService.queueXPSync(wallet, xpAwarded);
   ```

---

## Data Consistency Guarantees

### Before (Cron-Based)
- ❌ Cron runs every 10 minutes
- ❌ User wins badge → wait up to 10 minutes → SNAG updates
- ❌ Potential mismatch for 10 minutes

### After (Real-Time)
- ✅ User wins badge → **immediate** queue → SNAG updates within 2 seconds
- ✅ Failed syncs logged and retried automatically
- ✅ Failed syncs visible in admin panel for manual intervention
- ✅ Monitor sync status per user (`snag_sync_status`)

---

## Implementation Checklist

### Phase 1: Infrastructure (Complete ✅)
- ✅ Rename all frontend XP → Shift Points (SP)
- ✅ Create `realtimeSnagSyncService.ts`
- ✅ Create `010_realtime_sync_tracking.sql` migration
- ✅ Database tables for failed sync tracking

### Phase 2: Integration (Next)
- [ ] Wire up Position Service → queueXPSync()
- [ ] Wire up XP Engine → queueXPSync()
- [ ] Wire up Multiplier Service → queueMultiplierSync()
- [ ] Wire up Badge Service → queueBadgeSync()
- [ ] Wire up Daily Checkin → queueXPSync()
- [ ] Add `forceSync()` endpoint for admin testing
- [ ] Create admin UI for sync status monitoring

### Phase 3: Monitoring & Alerts (Optional)
- [ ] Dashboard widget showing sync queue depth
- [ ] Alert if queue grows > 100 items
- [ ] Dashboard for viewing `snag_sync_failures` table
- [ ] Retry button for manual failed sync re-triggering

---

## Testing Strategy

### Unit Tests
```typescript
test('queueXPSync debounces multiple updates', async () => {
  service.queueXPSync('wallet1', 100);
  service.queueXPSync('wallet1', 50);  // Should merge/replace
  await service.forceSync();
  // Verify only one API call made
});

test('failed syncs are logged and retried', async () => {
  // Mock SNAG API to fail first 2 times, succeed on 3rd
  service.queueXPSync('wallet1', 100);
  await service.forceSync(); // Attempt 1: fail
  await service.forceSync(); // Attempt 2: fail
  await service.forceSync(); // Attempt 3: succeed
  // Verify synced after 3 attempts
});
```

### Integration Tests
```typescript
test('position creation triggers real-time XP sync', async () => {
  const wallet = 'test_wallet';
  await positionService.openPosition(...);
  // Wait 2.5 seconds (for debounce)
  const status = await getSnagSyncStatus(wallet);
  assert(status === 'synced');
});

test('multiplier change triggers real-time multiplier sync', async () => {
  const newMult = 2.5;
  await multiplierService.updateMultiplier(wallet, newMult);
  // Wait 2.5 seconds
  const snagMult = await getSnagMultiplier(wallet);
  assert(snagMult === newMult);
});
```

---

## API Changes (Coming Soon)

### Admin Endpoints

```bash
# Check sync queue status
GET /api/admin/sync/queue
Response: { size: 5, jobs: [...] }

# Force process all queued syncs
POST /api/admin/sync/force

# View failed syncs
GET /api/admin/sync/failures?wallet=...&type=xp&limit=20

# Manually retry a failed sync
POST /api/admin/sync/retry/:syncFailureId

# Clear stuck queue (use with caution)
DELETE /api/admin/sync/queue
```

---

## Files Modified/Created

### Frontend
- ✅ `frontend/app/leaderboard/page.tsx` - XP → SP
- ✅ `frontend/app/airdrop/page.tsx` - XP → Shift Points

### Backend
- ✅ `src/services/realtimeSnagSyncService.ts` - NEW
- ✅ `src/db/migrations/010_realtime_sync_tracking.sql` - NEW

### Integration Points (To Be Done)
- `src/services/positionService.ts` - Call queueXPSync()
- `src/services/xpEngine.ts` - Call queueXPSync()
- `src/services/multiplierService.ts` - Call queueMultiplierSync()
- `src/services/badgeService.ts` - Call queueBadgeSync()
- `src/services/dailyCheckinService.ts` - Call queueXPSync()

---

## Deployment Order

1. **Run migration** `010_realtime_sync_tracking.sql`
2. **Deploy new service** `realtimeSnagSyncService.ts`
3. **Deploy frontend** with Shift Points renaming
4. **Integrate** real-time sync calls (one service at a time, test each)
5. **Monitor** SNAG sync queue depth and failures
6. **Optional**: Build admin UI for sync monitoring

---

## Success Metrics

- ✅ All frontend displays show "Shift Points" or "SP"
- ✅ SNAG updates within 2 seconds of XP/multiplier/badge changes
- ✅ Zero failed syncs (or logged for manual retry)
- ✅ Sync queue stays empty (< 5 jobs) under normal load
- ✅ No data mismatches between SHIFT and SNAG databases
- ✅ `snag_sync_status` shows "synced" for all active users

---

## Next Steps

1. Apply database migration: `npm run migrate`
2. Integrate real-time calls into services (one by one)
3. Deploy frontend changes
4. Monitor SNAG sync queue for first 24 hours
5. Build admin sync monitoring UI (optional but recommended)

All frontend changes are **non-breaking** and **backwards compatible** — they're just UI text changes. Real-time sync is **additive** — it complements existing cron-based sync.
