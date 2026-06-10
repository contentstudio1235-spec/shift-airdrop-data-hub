# SHIFT Badges Implementation Guide

**Status:** ✅ Strategy Document Analyzed | Schema Created  
**Date:** May 25, 2026  
**Total Badges:** 31 (28 Permanent, 3 Dynamic)

---

## Implementation Summary

### ✅ Completed
1. **Database Migration (007_badges_comprehensive.sql)** - Created with:
   - badge_definitions table with all 31 badge metadata
   - Enhanced badges table with status tracking (active/provisional/revoked)
   - badge_events table for earning history
   - badge_multiplier_caps table for cap management
   - badge_revocation_log for provisional badge tracking
   - Extended positions table with direction and metrics tracking

2. **Badge Service Skeleton** - Framework for badge earning logic

3. **Wallet Support** - All Implemented:
   - Phantom (Solana) ✅
   - Backpack (Solana) ✅
   - Solflare (Solana) ✅
   - Magic Eden (Solana) ✅ NEW
   - MetaMask (EVM only) ✅ NEW

---

## All 31 Badges by Category

### Category 1: Conviction Adding (4 badges, Permanent)
- Doubled Down (+1.10x) - Added after -5% drawdown
- Triple Down (+1.20x) - 3+ adds during -10% drawdown
- Pyramid Up (+1.15x) - 3+ adds during +10% gain
- Conviction Stack (+1.25x) - 5+ adds over 30+ days

### Category 2: Buying the Dip (3 badges, Permanent)
- Dip Buyer (+1.10x) - Long on -3% day
- Crash Buyer (+1.20x) - Long on SPX -5% day
- Black Swan Buyer (+1.30x) - Long on SPX -10% day [HALL OF FAME]

### Category 3: Buying the Breakout (3 badges, Permanent)
- Momentum Rider (+1.10x) - Long on +3% day
- Breakout Buyer (+1.15x) - Long within 24h of 52-week high
- New High Holder (+1.20x) - Long at ATH, held 30+ days

### Category 4: Event-Driven Trades (5 badges, 2 Perm + 3 Dynamic)
- Earnings Conviction (+1.20x, Permanent)
- Geopolitical Trade (+1.20x, Permanent)
- Fed Day Trade (+1.20x, 14 days)
- CPI Bet (+1.15x, 7 days)
- News Reactor (+1.15x, 7 days)

### Category 5: Short Conviction (5 badges, Permanent)
- First Short (+1.10x) - First short position ever
- Top Caller (+1.25x) - Short within 24h of 52-week high
- Earnings Short (+1.20x) - Shorted into earnings, profitable
- Squeeze Survivor (+1.30x) - Held short through +10%, profitable [HALL OF FAME]
- Macro Bear (+1.25x) - Held short 30+ days

### Category 6: Held Through Pain (3 badges, Permanent)
- -10% Survivor (+1.15x, Provisional) - Held through -10% drawdown
- -20% Survivor (+1.25x, Provisional) - Held through -20% drawdown
- Iron Hands (+1.30x) - Held through -30%, closed profitable [HALL OF FAME]

### Category 7: Long-Term Conviction (4 badges, Permanent)
- Diamond Hands (+1.15x) - Held 60+ days
- Long-Hauler (+1.20x) - Held 90+ days
- The Believer (+1.30x) - Held 180+ days [HALL OF FAME]
- Multi-Earnings Holder (+1.20x) - Through 2+ earnings

### Category 8: Volume + OG (4 badges, Permanent)
- Volume Veteran I (+1.10x) - $10k cumulative volume
- Volume Veteran II (+1.20x) - $100k cumulative volume
- Volume Veteran III (+1.30x) - $1m cumulative volume
- The OG (+1.25x) - Active in first 30 days

---

## Badge Mechanics & Rules

### Multiplier Stacking
- Rule: ADD, not MULTIPLY
- Example: Crash Buyer (+0.20x) + Diamond Hands (+0.15x) + Conviction Stack (+0.25x) = +0.60x → 1.60x final
- Cap: +2.0x for standard badges
- Hall of Fame: Bypass cap, add outside (+0.10x premium)

### Top 3 + Half Value Rule
1. Top 3 highest-value badges count at full value
2. All subsequent badges count at half value
3. Total stops at +2.0x cap
4. Hall of Fame badges (+0.10x premium each) stack outside cap

### Provisional Badges (Held Through Pain)
- Unlocked immediately when threshold crossed
- Marked provisional for 24 hours
- If position closes within 24h: revoke, slot re-earnable later
- Prevents speed-running pain badges

### Event Windows
- Fed Day: FOMC statement calendar day (UTC)
- CPI Bet: CPI release calendar day (UTC)
- Earnings Conviction: >=24h before call, held through next session
- News Reactor: <60min from curated headline

---

## Implementation Roadmap

### Phase 1: Foundation (DONE)
- Migration 007 database schema created
- All 31 badge definitions populated
- Tables for events, progress, multiplier caps

### Phase 2: Backend Logic (IN PROGRESS)
- BadgeService implementation
  - Position metrics tracking
  - Conviction adding checks
  - Dip/breakout detection
  - Event window integrations
  - Short conviction checks
  - Long-term hold checks
  - Volume aggregation
- Market data integrations
  - Daily market moves tracking
  - 52-week high/low detection
  - FOMC/CPI calendar
  - News headline feed
- Provisional badge lifecycle
  - 24h expiration timer
  - Revocation on position close

### Phase 3: Frontend Display (TODO)
- Badge component for navbar
- Badge grid on dashboard
- Rarity colors (Common/Rare/Epic/Legendary)
- Hall of Fame section
- Badge progress tracking UI
- Multiplier visualization

### Phase 4: Testing & Deployment (TODO)
- Unit tests for badge logic
- Integration tests
- Load test multiplier calculations
- Smoke test on staging
- Canary deploy to production

---

## Database Schema Summary

### New Tables
- badge_definitions - 31 badge metadata rows
- badge_events - Earning event log
- badge_multiplier_caps - Per-wallet multiplier tracking
- badge_revocation_log - Provisional badge expiries

### Altered Tables
- positions - Added direction, metrics, earnings tracking
- badges - Added status, provisional_until, metadata fields
- users - Already has claim_multiplier field

### Key Indexes
- idx_badges_wallet_active - Fast lookup of active badges per user
- idx_badge_events_wallet - Badge earning history
- idx_badge_definitions_category - Filter by category
- idx_badge_definitions_rarity - Hall of Fame & rarity queries

---

## Key Design Decisions

### Why Permanent Badges?
- 28 of 31 badges are permanent to reward conviction, not engagement
- Conviction trades are identity - they compound forever
- "I bought NVDA on the 5% SPX crash" is a permanent fact about you as a trader

### Why No Streaks or Quests?
- Avoided daily streaks (incentivize login padding, not conviction)
- Avoided referral grinding (asymmetric distribution)
- Every badge is a receipt of a decision you can be proud of

### Why Hall of Fame?
- 3 ultra-rare badges (earned by <1% of traders)
- Bypass +2.0x cap to preserve status signal
- Each carries +0.10x premium on top of listed multiplier

### Provisional Badge Model
- Unlock immediately when threshold crossed (positive reinforcement)
- 24h provisional window prevents speed-running
- Close within 24h = revoked, can re-earn later
- Clear rules encourage holding conviction

---

## Integration Checklist

### Backend Integration
- Run migration 007 on database
- Import BadgeService in position service
- Call badgeService.checkBadgesForPosition() after each position update
- Call badgeService.checkProvisionalBadgeExpiration() when position closes
- Add badge multiplier to XP calculation

### Frontend Integration
- Create Badge component (icon, name, rarity color)
- Add badge grid to dashboard
- Show earned badges in wallet dropdown
- Display total multiplier breakdown
- Add badge progress tracking (almost-earned badges)

### API Endpoints (to add)
- GET /api/badges/:wallet - Get all earned badges
- GET /api/badges/progress/:wallet - Get in-progress badges
- GET /api/badges/leaderboard - Rarest badges earned

### Marketing Assets
- Badge images/icons (31 * 4 rarity levels = 124 images)
- Hall of Fame badge special styling
- Badge earning announcement notifications
- Blog post: "The conviction trade economy"

---

## Notes & Considerations

### Market Data Requirements
- Daily market closes (SPX, individual assets)
- 52-week high/low tracking
- FOMC/CPI calendar
- Market-moving headline feed

### Scaling Considerations
- Badge check happens on EVERY position update
- With N positions per user, need efficient queries
- Consider caching badge definitions
- Batch multiplier recalculations

### Anti-Gaming
- "Held Through Pain" has 24h provisional window
- Can't earn same badge twice
- Multiplier cap prevents infinite stacking
- Anti-farm logs already in place

---

## Next Steps

1. **Immediate:** Run migration 007, verify schema
2. **This Sprint:** Complete BadgeService implementation with market integrations
3. **Next Sprint:** Frontend badge display & progress tracking
4. **Before Launch:** Load test, smoke test, canary deploy

---

**Document Version:** 1.0  
**Last Updated:** May 25, 2026  
**Implementation Status:** Foundation Complete, Backend in Progress
