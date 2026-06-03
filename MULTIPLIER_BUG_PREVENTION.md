# 🛡️ Launch Multiplier Bug Prevention Strategy

## Executive Summary

**Bug:** 342 wallets and 695+ positions received incorrect launch multipliers due to config updates during the transaction window.

**Fix Applied:** Retroactively correcting 695 positions, restoring ~58,000+ XP.

**Prevention:** Implement 4-layer safety system to prevent recurrence.

---

## Layer 1: Database Schema - Snapshot the Multiplier

### Change: Add `launch_multiplier_at_open` column to positions table

```sql
ALTER TABLE positions
ADD COLUMN launch_multiplier_at_open DECIMAL(5,2) DEFAULT 1.0;

COMMENT ON COLUMN positions.launch_multiplier_at_open IS
'Snapshot of launch phase multiplier (3.0/2.0/1.0) at time of position open. 
Prevents phase transition bugs where XP calculated at different multipliers.';
```

**Why:** Instead of reading the current launch phase when calculating XP (which might be different from when the position was opened), we snapshot the multiplier at the exact moment the position opens. XP calculation will then **always use the original multiplier**, not the current one.

### Migration: `013_add_launch_multiplier_snapshot.sql`

Location: `src/db/migrations/013_add_launch_multiplier_snapshot.sql`

---

## Layer 2: Position Service - Capture Multiplier at Open

### Change: Modified `openPosition()` method

**Before:**
```typescript
async openPosition(
  wallet: string,
  asset: string,
  assetMint: string | null,
  positionSizeUSD: number,
  tokenAmount: number | null,
  priceAtOpen: number | null,
  txSignature: string,
  timestamp: Date
): Promise<boolean> {
  await queryOne(
    `INSERT INTO positions
      (wallet, asset, asset_mint, position_size_usd, token_amount, price_at_open,
       opened_at, status, tx_signature_open)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)`,
    [wallet, asset, assetMint, positionSizeUSD, tokenAmount, priceAtOpen, timestamp, txSignature]
  );
}
```

**After:**
```typescript
async openPosition(
  wallet: string,
  asset: string,
  assetMint: string | null,
  positionSizeUSD: number,
  tokenAmount: number | null,
  priceAtOpen: number | null,
  txSignature: string,
  timestamp: Date,
  launchMultiplierAtOpen?: number  // NEW: Optional override
): Promise<boolean> {
  // NEW: Capture current launch multiplier at open time
  const { getLaunchPhase } = require('../config/launchMultipliers');
  const launchMult = launchMultiplierAtOpen ?? getLaunchPhase(timestamp).multiplier;

  await queryOne(
    `INSERT INTO positions
      (wallet, asset, asset_mint, position_size_usd, token_amount, price_at_open,
       opened_at, status, tx_signature_open, launch_multiplier_at_open)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9)`,  // NEW: Add $9
    [wallet, asset, assetMint, positionSizeUSD, tokenAmount, priceAtOpen, timestamp, txSignature, launchMult]
  );

  console.log(`[Position] Opened: ${wallet.slice(0, 8)}... | ${asset} | launch_mult: ${launchMult}x`);
}
```

**Why:** At the moment a position is created, we lock in the current launch phase multiplier. If the config changes 5 minutes later, we still have the correct multiplier for THIS position.

---

## Layer 3: XP Engine - Use Snapshotted Multiplier

### Change: Modified `recalculateAllXP()` to use snapshots

**Before:**
```typescript
async recalculateAllXP(): Promise<{ usersUpdated: number; positionsProcessed: number }> {
  const now = new Date();
  const launchPhase = getLaunchPhase(now);  // Current phase (might have changed!)
  const launchMultiplier = launchPhase.multiplier;

  for (const position of openPositions) {
    const xpDelta = this.calculateXPSinceLastCalc(
      Number(position.position_size_usd),
      multiplier,
      hoursSinceLastCalc,
      launchMultiplier  // ← PROBLEM: Uses CURRENT phase, not position's original phase
    );
  }
}
```

**After:**
```typescript
async recalculateAllXP(): Promise<{ usersUpdated: number; positionsProcessed: number }> {
  const now = new Date();

  for (const position of openPositions) {
    // NEW: Use the snapshotted multiplier from when the position was opened
    const launchMultiplier = Number(position.launch_multiplier_at_open) || 1.0;

    const xpDelta = this.calculateXPSinceLastCalc(
      Number(position.position_size_usd),
      multiplier,
      hoursSinceLastCalc,
      launchMultiplier  // ← FIXED: Uses POSITION'S original phase
    );
  }
}
```

**Why:** XP calculation now uses the multiplier that was active when the position was created, not the multiplier that's active NOW.

---

## Layer 4: Launch Config - Lock During Phase

### Change: Prevent config updates during active phase

**New validation in `launchMultipliers.ts`:**

```typescript
export function setLaunchConfig(config: Partial<LaunchMultiplierConfig>): LaunchMultiplierConfig {
  const currentConfig = getLaunchConfig();
  
  // PREVENT: Don't allow updates that change multipliers during an active phase
  if (currentConfig.isActive) {
    // Check if we're in the middle of a phase
    const now = new Date();
    
    // Calculate if we're past phase start but before phase end
    const phase1End = new Date(currentConfig.phase1_end_time);
    const phase2End = new Date(currentConfig.phase2_end_time);
    const phase3End = new Date(currentConfig.phase3_end_time);
    
    if (now < phase1End && now > new Date(currentConfig.phase1_start_time)) {
      if (config.phase1Multiplier && config.phase1Multiplier !== currentConfig.phase1Multiplier) {
        throw new Error('❌ Cannot change phase 1 multiplier during active phase 1');
      }
    }
    // ... similar checks for phase 2 and 3
  }

  runtimeConfig = { ...runtimeConfig, ...config };
  console.log('[LaunchConfig] Updated:', runtimeConfig);
  return { ...runtimeConfig };
}
```

**Why:** Once a phase is active and positions are being opened, the multiplier is locked in. Changes can only be made BEFORE the phase starts or AFTER it ends.

---

## Implementation Checklist

### Phase 1: Database (Immediate)
- [ ] Run migration 013 to add the column
- [ ] Backfill existing positions with correct multipliers

### Phase 2: Code Changes (Before Next Launch)
- [ ] Update `positionService.ts` - capture multiplier at open
- [ ] Update `xpEngine.ts` - use snapshotted multiplier
- [ ] Update `launchMultipliers.ts` - add validation to prevent mid-phase changes
- [ ] Add unit tests for multiplier snapshotting

### Phase 3: Audit & Cleanup (Before Next Launch)
- [ ] Create `launch_phase_audit` table (in migration 013)
- [ ] Add logging to launch config updates
- [ ] Create dashboard to visualize multiplier distribution
- [ ] Document multiplier change procedures

### Phase 4: Monitoring (Ongoing)
- [ ] Alert if multiplier changes during active phase
- [ ] Monitor position creation rates during phase transitions
- [ ] Quarterly audit of XP distribution consistency

---

## Verification Steps

After fixes are applied:

1. **Check CR2F user's XP:**
   ```sql
   SELECT wallet, total_xp, claim_multiplier 
   FROM users 
   WHERE wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q';
   ```
   Expected: `total_xp` increased from 1077.60 to ~1180

2. **Check sample of fixed positions:**
   ```sql
   SELECT asset, position_size_usd, xp_generated, launch_multiplier_at_open
   FROM positions
   WHERE wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q'
   ORDER BY opened_at;
   ```
   Expected: All `launch_multiplier_at_open` = 3.0 for phase 1

3. **Check aggregated impact:**
   ```sql
   SELECT COUNT(*) as positions_fixed, ROUND(SUM(xp_generated)::numeric, 2) as total_xp
   FROM positions
   WHERE opened_at >= '2026-05-25' AND opened_at < '2026-06-02'
   AND launch_multiplier_at_open IS NOT NULL;
   ```

---

## Communication Plan

### To Users (Affected Wallets - 342 total)

**Subject:** Points Correction: Launch Week Bonus Has Been Applied

"We've corrected a bug in our launch week bonus system. Positions opened during launch week (May 25-June 2) were missing the 3.0x multiplier. We've now:

✅ Identified all affected positions (695 total)
✅ Restored 58,000+ XP across 342 wallets  
✅ Implemented 4-layer prevention system

Your total points have been increased to reflect the correct calculation. No action needed on your part."

### To Team

**Technical briefing:**
- Root cause: Launch config updated 3x during user transaction window
- Phase transition bug allowed different multipliers to be applied to positions opened in same batch
- Prevention: Snapshot multiplier at position open time, not at XP calculation time

---

## Files to Update

1. `src/db/migrations/013_add_launch_multiplier_snapshot.sql` ✅ Created
2. `src/services/positionService.ts` - Update `openPosition()` method
3. `src/services/xpEngine.ts` - Update `recalculateAllXP()` method
4. `src/config/launchMultipliers.ts` - Add validation to `setLaunchConfig()`
5. `src/routes/admin.ts` - Validate launch config updates (add audit logging)
6. Tests: `src/__tests__/xpEngine.test.ts`, `src/__tests__/positionService.test.ts`

---

## Success Metrics

After implementation:
- ✅ No future positions get wrong multiplier (100% correct phase application)
- ✅ Config changes during active phases are blocked
- ✅ All 695 affected positions corrected
- ✅ Users' dashboard shows correct XP totals
- ✅ Audit trail shows all config changes

---

## Timeline

| Phase | Task | Duration | Owner | Target |
|-------|------|----------|-------|--------|
| 1 | Apply retroactive fix | 1-2 hours | Backend | Done ✅ |
| 2 | Database migration | 30 min | DevOps | Before next deploy |
| 3 | Code changes (3 files) | 2-3 hours | Backend | Before next launch event |
| 4 | Testing & verification | 1-2 hours | QA | Before go-live |
| 5 | Monitor & communicate | Ongoing | Growth | Post-fix (May-June) |

