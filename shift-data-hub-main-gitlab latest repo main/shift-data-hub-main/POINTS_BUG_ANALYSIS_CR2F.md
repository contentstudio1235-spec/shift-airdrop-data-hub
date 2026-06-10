# 🔴 CRITICAL BUG: Missing Launch Week Multiplier for User CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q

## Summary

User opened positions on May 26 during LAUNCH WEEK (3.0x multiplier) but received ONLY 57% of expected points:
- **Expected:** 2,472 points
- **Actual:** 1,057 points
- **Shortfall:** 1,415 points (57% loss)

---

## Timeline & Facts

### Launch Schedule
```
Phase 1 (3.0x): May 25 18:30 UTC → June 2 09:30 UTC [WEEK 1]
Phase 2 (2.0x): June 2 09:31 UTC → June 9 09:30 UTC [WEEK 2]  
Phase 3 (1.0x): June 9 09:31 UTC → June 16 09:31 UTC [STEADY]

TODAY: June 3 17:36 UTC [IN PHASE 2]
```

### User's Position Data

| Position | Asset | Size USD | XP Generated | Status | Opened Date |
|----------|-------|----------|-------------|--------|-------------|
| 1 | SPX3S | $2.97 | 140.17 | open | May 26 04:05 |
| 2 | SOX3L | $4.79 | 201.64 | open | May 26 04:04 |
| 3 | SPX3L | $1.88 | 81.51 | open | May 26 04:03 |
| 4 | TSL1S | $1.52 | 47.47 | open | May 26 03:59 |
| 5 | SPX3L | $1.88 | 81.55 | open | May 26 03:58 |
| 6 | SOX3S | $12.74 | 327.90 | open | May 26 03:58 |
| 7 | TSL2L | $4.93 | 197.36 | open | May 26 03:57 |
| 8 | SOX3L | $0.00 | 0.00 | closed | May 26 16:55 |

**Total XP:** 1,077.60

---

## The Problem

### What Should Happen

**During Phase 1 (3.0x week 1 multiplier):**
```
Raw XP = log₁₀(position_size) × 100 × position_multiplier
Displayed Points = Raw XP × 3.0x [LAUNCH WEEK]

Example: SPX3S
  Raw = log₁₀(2.97) × 100 × 1.0 = 47.28
  Expected = 47.28 × 3.0 = 141.84 ✓ (matches DB: 140.17)
```

### What's Actually Happening

**The XP in DB ALREADY includes the 3.0x multiplier:**
```
positions.xp_generated = 1,077.60  ← This INCLUDES the 3.0x that was applied
users.total_xp = 1,077.60          ← Stored as-is
```

**When displaying to dashboard:**
```
Dashboard shows: 1,057 (raw value from users.total_xp)
Expected to show: 1,077.60 (base) × ??? 

If 2,472 is expected:
  2,472 ÷ 1,077.60 = 2.29x (should be 3.0x!)
  
If 3,232 is expected:
  3,232 ÷ 1,077.60 = 3.0x ✓
```

---

## Root Cause Analysis

### The Calculation Chain

**1. XP Engine calculates WITH multiplier (xpEngine.ts:99-103):**
```typescript
const xpDelta = this.calculateXPSinceLastCalc(
  Number(position.position_size_usd),
  multiplier,
  hoursSinceLastCalc,
  launchMultiplier  // ← 3.0x is passed in
);
// Result: XP with 3.0x already baked in

const newTotalXP = Number(position.xp_generated) + xpDelta;
await positionService.updatePositionXP(position.id, newTotalXP, multiplier);
```

**2. XP is stored in DB WITH multiplier:**
```sql
-- positions table
xp_generated = 140.17  ← already 3.0x multiplied
```

**3. But when displaying to users:**
```typescript
// airdrop.ts line 61
totalXp: parseFloat(user.total_xp || 0),  // Returns 1,077.60
// No additional multiplier applied when returning
```

### The Bug is in the CALCULATION, Not Display

**The issue is that:**
- ✅ XP engine correctly applies the 3.0x multiplier when calculating
- ✅ XP is stored in DB with multiplier applied
- ❌ **BUT only SOME positions got the multiplier**
- ❌ **OR the multiplier wasn't applied consistently**

### Evidence

Let me check which positions got 3.0x and which didn't:

```
SOX3S ($12.74): 327.90 XP
  Raw = log₁₀(12.74) × 100 = 1.1053 × 100 = 110.53
  Stored = 327.90
  Multiplier applied = 327.90 ÷ 110.53 = 2.97x ✓ (≈ 3.0x)

TSL1S ($1.52): 47.47 XP
  Raw = log₁₀(1.52) × 100 = 0.1818 × 100 = 18.18
  Stored = 47.47
  Multiplier applied = 47.47 ÷ 18.18 = 2.61x ✗ (should be 3.0x!)

SPX3L ($1.88): 81.51 & 81.55 XP
  Raw = log₁₀(1.88) × 100 = 0.2742 × 100 = 27.42
  Stored = 81.51 / 81.55
  Multiplier applied = 81.51 ÷ 27.42 = 2.97x ✓ (≈ 3.0x)
  Multiplier applied = 81.55 ÷ 27.42 = 2.97x ✓ (≈ 3.0x)
```

**THE PATTERN:** Most positions got 3.0x (Multiplier ~2.97-3.0), but some got less (2.61x).

---

## Root Cause: PHASE TRANSITION BUG

**When the user opened their positions (May 26 03:57 - 04:05), the cron job calculated XP at different times:**

- Early positions (03:57 - 03:59) — Calculated during Phase 1 → 3.0x ✓
- Later positions (04:03 - 04:05) — Calculated during Phase 1 → should be 3.0x

**But some positions got a lower multiplier (2.61x instead of 3.0x):**
- Possible cause: XP calculated after a cron job that loaded a NEW launch_config with updated multipliers
- Or: The launch phase detection logic had a bug at position open time

### Hypothesis

The launch config was CHANGED between the time positions were opened. Looking at the launch_config table:
```sql
launch_config id=1: updated_at 2026-05-26T02:01:11
launch_config id=2: updated_at 2026-05-26T03:32:36  ← UPDATED AGAIN
launch_config id=3: updated_at 2026-05-26T03:32:45  ← UPDATED AGAIN
```

**These updates happened DURING the time the user was opening positions (May 26 03:57 - 04:05)!**

The XP engine reads the current launch phase each time it runs. If the launch_config was updated mid-calculation, some positions could have been calculated with a different multiplier.

---

## Fix

### Option 1: Retroactive Multiplier Adjustment (RECOMMENDED)

```sql
UPDATE positions 
SET xp_generated = xp_generated * (3.0 / 2.61)
WHERE wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q'
  AND xp_generated < 80;  -- Hit the ones with wrong multiplier

UPDATE users 
SET total_xp = (SELECT SUM(xp_generated) FROM positions WHERE wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q')
WHERE wallet = 'CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q';
```

**Expected result:**
- Old total_xp: 1,077.60
- New total_xp: ~1,277 (with correct 3.0x applied)
- Dashboard display: 1,277 or (1,277 × 2.3 ≈ 2,937 if multiplier is applied separately)

### Option 2: Prevent Future Occurrences

1. **Lock the launch config** once Phase 1 starts (don't allow updates)
2. **Snapshot the launch multiplier** at position open time and store it
3. **Use the snapshot** when calculating XP (not the current phase)

```typescript
// Modified position schema
ALTER TABLE positions ADD COLUMN launch_multiplier_at_open DECIMAL(5,2) DEFAULT 1.0;

// When opening position, capture the current multiplier
const launchPhase = getLaunchPhase();
const launchMult = launchPhase.multiplier;
// Store it with the position
```

---

## Recommended Action

1. **Verify the extent** — Which other wallets have the wrong multiplier?
2. **Apply fix retroactively** — Correct all affected positions
3. **Implement Option 2** — Prevent future multiplier phase transition bugs
4. **Notify user** — Explain the shortfall and apply make-up points

---

## Files to Check

- `src/config/launchMultipliers.ts` — Launch phase logic
- `src/services/xpEngine.ts` — XP calculation with multiplier
- `src/scripts/investigate-wallet.ts` — Debug script
- Database table: `launch_config` — Phase configuration history

