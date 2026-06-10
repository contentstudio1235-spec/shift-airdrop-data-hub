# Master Testing Checklist — SHIFT Airdrop System (All 7 Phases)

**Complete testing guide for verifying all functionality across all implemented phases.**

---

## Phase 0: Admin Audit Foundation ✅

### Database (admin_logs table)
- [ ] Table exists with all columns: admin_wallet, action, resource_type, resource_id, old_value, new_value, reason, ip_address, user_agent, created_at
- [ ] Indexes on action, resource_type, resource_id, admin_wallet, and created_at exist
- [ ] Can insert records successfully
- [ ] Can query by resource_type and admin_wallet efficiently

### Admin Audit Service
- [ ] `adminAuditService.log()` inserts records correctly
- [ ] Logs capture all fields (admin_wallet, action, resource_type, old_value, new_value, reason)
- [ ] Timestamps are accurate
- [ ] Can retrieve logs with filters
- [ ] Logs persist to database

### Admin Routes
- [ ] GET /api/admin/audit returns logs
- [ ] GET /api/admin/audit?wallet=X filters by wallet
- [ ] GET /api/admin/audit?action=Y filters by action
- [ ] Logs are sorted by most recent first (DESC)
- [ ] Response includes count of results
- [ ] Protected by x-admin-key header

### Audit Trail Usage
- [ ] Badge awards logged
- [ ] Badge revocations logged
- [ ] Certificate awards logged
- [ ] Configuration changes logged
- [ ] User multiplier changes logged
- [ ] All logs show admin wallet, timestamp, and reason

---

## Phase 1: Badge System & Templates ✅

### Badge Rule Templates
- [ ] All 31 badges from Badge Strategy inserted into badge_rule_templates table
- [ ] Each template has: template_key, category, display_name, description, multiplier_value, duration_type
- [ ] Categories correctly mapped: conviction_adding, buying_dip, event_driven, short_conviction, drawdown, volume, admin_custom
- [ ] Templates queryable by category
- [ ] Templates include parameter schemas for configuration

### Badge Definitions
- [ ] 31 badges exist in badge_definitions table with rule_template links
- [ ] Badges marked as active/inactive correctly
- [ ] Hall of Fame tiers (Iron Hands, Believer) flagged with is_hall_of_fame=true
- [ ] Multiplier values correct (1.10x to 1.30x for permanent, 1.15x to 1.20x for dynamic)
- [ ] Duration types correct (permanent, dynamic, provisional)

### Badge Template Service
- [ ] BadgeTemplateService evaluates rules correctly
- [ ] `evaluateRule()` returns true/false based on user activity
- [ ] Each template type has working evaluation logic:
  - [ ] doubled_down: Position added after -5% drawdown
  - [ ] triple_down: Position added 3+ times during -10% drawdown
  - [ ] pyramid_up: Position added 3+ times during +10% rise
  - [ ] dip_buyer: Opened long on day underlying closed -3%+
  - [ ] crash_buyer: Opened long on day SPX closed -5%+
  - [ ] diamond_hands: Held position 60+ days
  - [ ] first_short: First short opened
  - [ ] earnings_short: Shorted into earnings, closed profitable
  - [ ] volume_veteran_i/ii/iii: Cumulative volume thresholds ($10K, $100K, $1M)
  - [ ] the_og: Active in first 30 days of launch

### Badge Stacking (Cap & Hall of Fame)
- [ ] badge_multiplier_stack table created and populates correctly
- [ ] Top 3 badges count at full value (e.g., +0.30x each)
- [ ] Remaining badges count at half value (e.g., +0.05x each)
- [ ] Hard cap enforced: +2.0x from badges (NOT multiplied)
- [ ] Hall of Fame tier: +0.10x premium ON TOP of +2.0x cap
- [ ] User with 5 badges +1.10, +1.15, +1.12, +1.08, +1.06 = 1.0 + (0.10 + 0.15 + 0.12) + (0.04 + 0.03) = 1.44x (top 3 full, rest half)
- [ ] User with Hall of Fame badge: 1.0 + 1.44 + 0.10 = 2.54x (HOF premium on top)

### Badge Award Logic
- [ ] Badges auto-awarded when user qualifies for template condition
- [ ] badgeService.evaluateBadges() runs successfully
- [ ] badgeService.evaluateAllUsers() runs for all users without errors
- [ ] Cron job: badgeService runs daily (or on-demand)
- [ ] No duplicate badge awards (hasBadge check works)
- [ ] Badge awards logged to admin_logs with reason
- [ ] Badges appear in user's badge list immediately

---

## Phase 2: Real-Time SNAG Sync ✅

### Integration Points
- [ ] XP Engine: Calls realtimeSnagSyncService.queueXPSync() when XP awarded
- [ ] Multiplier Service: Calls queueMultiplierSync() when multiplier changes
- [ ] Badge Service: Calls queueBadgeSync() when badge awarded
- [ ] Daily Checkin Service: Calls queueXPSync() for daily XP bonus

### Real-Time Sync Service
- [ ] XP syncs debounced to 2-second windows (batch multiple updates)
- [ ] Multiplier syncs debounced to 2-second windows
- [ ] Badge syncs happen IMMEDIATELY (no debounce)
- [ ] Queue persists pending syncs until processed
- [ ] processQueue() batches by type (XP batch, multiplier batch, badge batch)
- [ ] Retry logic: 3 attempts max before logging failure
- [ ] Failed syncs logged to snag_sync_failures table
- [ ] getQueueStatus() shows queue contents
- [ ] forceSync() processes queue immediately (for testing)

### SNAG API Calls
- [ ] batchPushXP() successfully syncs XP to SNAG
- [ ] awardMultiplierInSnag() successfully syncs multiplier
- [ ] awardBadgeInSnag() successfully syncs badge
- [ ] All API calls include wallet and value
- [ ] Errors are caught and logged
- [ ] Failed syncs don't block other operations

### Real-Time Behavior
- [ ] User earns XP → syncs to SNAG within 2 seconds
- [ ] User's multiplier changes → syncs within 2 seconds
- [ ] User earns badge → syncs to SNAG within 100ms (immediate)
- [ ] Multiple updates from same wallet batched efficiently
- [ ] SNAG leaderboard updates in real-time

---

## Phase 3: Event Management ✅

### Events Table
- [ ] events table created with all columns: event_name, event_type, description, start_time, end_time, eligible_assets, eligible_indices, is_recurring, recurrence_rule, created_by
- [ ] Event types include: earnings, macro, geopolitical, news_headline, custom
- [ ] Can create one-time events
- [ ] Can create recurring events with RRULE support (e.g., FOMC dates, earnings calendars)
- [ ] Events can specify eligible_assets and eligible_indices

### News Feed Table
- [ ] news_feed table created with columns: headline, source, market_impact, published_at, asset_symbols, sentiment, is_market_moving
- [ ] Can create news headlines with market impact percentage
- [ ] Can filter news by sentiment (bearish, neutral, bullish)
- [ ] Can filter news by asset symbols

### Event-Based Badge Triggers
- [ ] Fed Day Trade: Triggered on FOMC announcement day, eligible on SPX/DXY/NDX
- [ ] CPI Bet: Triggered on CPI release day, eligible on SPX/DXY
- [ ] News Reactor: Triggered within 60 minutes of headline, any asset
- [ ] Earnings Conviction: Triggered 24h before earnings, held through, eligible assets
- [ ] Geopolitical Trade: Triggered during geopolitical event, eligible on SPX/DXY/NDX

### Event Service API
- [ ] createEvent() creates event successfully
- [ ] getEventsByType() filters by event type
- [ ] getActiveEventsInRange() returns events in date window
- [ ] checkEventEligibility(wallet, eventId) returns true if user opened position during event
- [ ] checkNewsReactorEligibility(wallet, headlineId) checks 60-minute window after headline
- [ ] addNewsHeadline() creates news record
- [ ] recordEventActivity() logs user trades during events
- [ ] getEventParticipants() returns users who traded during event

### Admin Endpoints
- [ ] GET /api/admin/events lists all events with optional type filter
- [ ] POST /api/admin/events creates event with all fields
- [ ] GET /api/admin/events/news lists recent headlines
- [ ] POST /api/admin/events/news adds news headline
- [ ] GET /api/admin/events/:eventId/activity shows badges earned during event
- [ ] All endpoints protected by x-admin-key

### Event-Based Badge Awards
- [ ] User opens position on FOMC announcement day → Fed Day Trade awarded
- [ ] User opens position on CPI release day → CPI Bet awarded
- [ ] User opens position within 60m of headline → News Reactor awarded
- [ ] User opens position 24h before earnings, holds through → Earnings Conviction awarded
- [ ] User opens position during geopolitical event → Geopolitical Trade awarded
- [ ] All awards synced to SNAG immediately

---

## Phase 4: Configuration Management ✅

### Configuration Table
- [ ] airdrop_config table created with: setting_key (PRIMARY), setting_value (JSONB), updated_by, updated_at
- [ ] 8 default entries inserted: anti_farm, multiplier_progression, launch_config, referral_bonuses, tracked_tokens, badge_stacking, airdrop_rules, feature_flags

### ConfigService
- [ ] getConfig(key) returns correct value
- [ ] getConfig() caches results (60-second TTL)
- [ ] Cached values returned without DB hit on repeat calls
- [ ] getAllConfig() returns all settings as Record<string, any>
- [ ] setConfig(key, value, adminWallet, reason) updates + validates + logs
- [ ] validateConfig() rejects invalid values:
  - [ ] maxMultiplier < 1.0 rejected
  - [ ] minPositionSize < 0 rejected
  - [ ] Invalid dates rejected
  - [ ] Type mismatches rejected
- [ ] clearCache(key) invalidates specific or all entries
- [ ] getConfigHistory(key) returns change audit trail with timestamps

### Configuration Options
- [ ] **anti_farm**: minPositionSizeUSD, minHoldHours, washTradeWindowMinutes, cooldownMinutes, maxDrawdownPercent
- [ ] **multiplier_progression**: weeklyBonus, monthlyBonus, badgeBonus, streakBonus, streakBonusMax, maxMultiplier
- [ ] **launch_config**: startDate, isActive, week1Multiplier, week2Multiplier, week3PlusMultiplier
- [ ] **referral_bonuses**: kolDynamicMultiplier, kolPermanentMultiplier, standardInviteXP, kolInviteXP
- [ ] **tracked_tokens**: Array of {symbol, mint, baseMultiplier, isActive}
- [ ] **badge_stacking**: topThreeBadgesMultiplier, remainingBadgesMultiplier, hardCap, hallOfFameBypass, hallOfFameBonus
- [ ] **airdrop_rules**: minXPRequired, claimable, claimStartDate, claimEndDate
- [ ] **feature_flags**: eventBadgesEnabled, certificatesEnabled, announcementsEnabled, admitConfigEditingEnabled

### Admin Configuration UI
- [ ] `/admin/configuration` page loads with 8 category buttons
- [ ] Each category shows form inputs for all settings
- [ ] Inputs pre-populated with current values
- [ ] Reason field (required) for change tracking
- [ ] Save button disabled until reason provided
- [ ] Success/error messages displayed
- [ ] Settings take effect immediately (no redeploy)

### Admin API Endpoints
- [ ] GET /api/admin/config returns all settings
- [ ] GET /api/admin/config/:key returns specific setting
- [ ] PATCH /api/admin/config/:key updates setting with validation
- [ ] POST /api/admin/config/batch batch updates multiple settings
- [ ] GET /api/admin/config/:key/history returns change history
- [ ] GET /api/admin/config-schema returns schema (field names, types, descriptions)
- [ ] All endpoints protected by x-admin-key

### Configuration Impact
- [ ] Anti-farm changes filter new positions immediately
- [ ] Launch multiplier changes affect ongoing earnings
- [ ] Referral bonus changes apply to new referrals
- [ ] Token tracking changes update which assets are tracked
- [ ] Feature flags toggle features without deployment

---

## Phase 5: Certificate System ✅

### Certificate Categories
- [ ] **Seasonal Rankings**: Top 1%, Top 10%, Top 25%, Most Profitable, Most Active
  - [ ] Awarded at end-of-season reset
  - [ ] Revoked when new season begins
  - [ ] Scarcity caps enforced (280 for top 1%, 2800 for top 10%, etc.)
  
- [ ] **Tier Holders**: Bronze/Silver/Gold/Platinum/Hall of Fame (soulbound)
  - [ ] Auto-awarded when badge count reaches thresholds (5, 10, 15, 20, 25)
  - [ ] Cannot be revoked (soulbound=true)
  - [ ] Hall of Fame bypasses +2.0x badge cap
  
- [ ] **Mastery Cards**: Iron Stomach, Diamond Hands, Comeback Kid, Conviction Play, On Fire
  - [ ] Awarded for behavior: drawdown survival, hold duration, recovery, profit streaks
  - [ ] Permanent multipliers
  
- [ ] **Personality Series**: 6 base cards + Investor meta-card (off-ceiling)
  - [ ] 6 cards: Eagle, Fox, Tortoise, Lion, Wolf, Owl
  - [ ] Auto-unlock: Investor awarded when all 6 earned
  - [ ] Meta-card off-ceiling, soulbound
  
- [ ] **Lifetime**: OG, Volume Veterans I/II/III, Mentor, Legendary Trader
  - [ ] Non-resetting, permanent achievements
  - [ ] OG: Earned in first 30 days of launch
  - [ ] Volume Veterans: Cumulative trading volume thresholds
  - [ ] Legendary Trader: Won seasonal rankings 3+ times

### Certificate Database
- [ ] certificates table: id, name, category, display_name, multiplier_value, multiplier_type, is_soulbound, is_off_ceiling, scarcity_cap, unlock_requirement
- [ ] user_certificates table: wallet, certificate_id, awarded_by, awarded_at, revoked_by, revoked_at (NULL if active)
- [ ] seasonal_config table: season_name, start_date, end_date, is_active, is_completed
- [ ] certificate_unlock_progress table: wallet, unlock_requirement, progress_count, requirement_count, completed_at

### CertificateService
- [ ] createCertificate() creates template
- [ ] getWalletCertificates() returns active (non-revoked) certs
- [ ] awardCertificate() inserts award + triggers SNAG sync (immediate, not debounced)
- [ ] revokeCertificate() blocks if is_soulbound=true
- [ ] awardTierHolderCertificate() called after each badge award
- [ ] getCertificateMultiplierBoost() sums active cert multipliers
- [ ] resetSeasonalCertificates() revokes old + awards new season certs
- [ ] evaluatePersonalityCards() evaluates user's positions for personality cards
- [ ] checkUnlockRequirement() checks if meta-card unlock condition met

### Admin Certificate UI
- [ ] `/admin/certificates` page with 5 category sidebar
- [ ] Create certificate form with all fields
- [ ] Award certificate to user (search wallet, select cert)
- [ ] View user's certificates and revoke non-soulbound ones
- [ ] Seasonal reset button (select season, confirm, execute)
- [ ] Shows current cert list for selected category

### Admin Endpoints
- [ ] GET /api/admin/certificates/:category lists certs
- [ ] POST /api/admin/certificates creates template
- [ ] POST /api/admin/certificates/award/:wallet/:certId awards
- [ ] DELETE /api/admin/certificates/revoke/:wallet/:certId revokes (blocks if soulbound)
- [ ] GET /api/admin/certificates/wallet/:wallet gets user's certs
- [ ] POST /api/admin/certificates/seasonal/reset end-of-season reset
- [ ] POST /api/admin/certificates/personality/evaluate/:wallet evaluates personality

### Certificate Multiplier Mechanics
- [ ] Soulbound certs cannot be revoked (error returned)
- [ ] Off-ceiling certs (Hall of Fame, Investor) bypass +2.0x badge cap
- [ ] Hall of Fame badge: +0.10x on top of +2.0x
- [ ] Investor meta-card: +1.15x off-ceiling (separate from badge cap)
- [ ] Multiple personality cards tracked with unlock_progress

### Certificate Syncing to SNAG
- [ ] awardCertificate() queues sync to SNAG immediately
- [ ] Syncs prefixed as "cert_" in SNAG (e.g., "cert_top_1_percent")
- [ ] Revoked certs trigger revocation sync to SNAG
- [ ] Soulbound cert revocation attempts logged in audit trail

---

## Phase 6: User Management & Dashboard ✅

### User Profile Lookup
- [ ] GET /api/admin/users/:wallet returns complete user profile
- [ ] Profile includes: wallet, total_xp, badge_count, certificate_count, badges list, multiplier breakdown
- [ ] Multiplier breakdown shows:
  - [ ] Base (1.00x)
  - [ ] Badges permanent component
  - [ ] Badges dynamic component
  - [ ] Certs permanent component
  - [ ] Certs dynamic component
  - [ ] Certs off-ceiling component (separate)
  - [ ] Hall of Fame premium (if earned)
  - [ ] Total (sum of all)
- [ ] Multiplier breakdown correctly applies +2.0x badge stacking cap
- [ ] Hall of Fame premium shown separately (+0.10x on top of cap)
- [ ] Personality meta-card (Investor) shown as off-ceiling separate line

### User Management UI
- [ ] `/admin/users` page with search bar
- [ ] Search by wallet address
- [ ] User info tab:
  - [ ] Total Shift Points
  - [ ] Badge count and list with earned dates
  - [ ] Certificate count and list with award dates
  - [ ] Multiplier breakdown visualization
- [ ] Audit trail tab:
  - [ ] All changes to user (badge awards, cert awards, multiplier changes)
  - [ ] Shows admin wallet, timestamp, and reason for each change
  - [ ] Sortable and filterable history

### Admin Dashboard
- [ ] `/admin/dashboard` page loads automatically
- [ ] 6 key metrics displayed:
  - [ ] Total Users (count from wallets table)
  - [ ] Total Shift Points (cumulative XP)
  - [ ] Active Badges (30-day window)
  - [ ] Active Certificates (30-day window)
  - [ ] Hall of Fame Users (count with HOF badge)
  - [ ] Average Multiplier (calculated per user)
- [ ] Recent admin activity feed (last 20 actions)
- [ ] Badge distribution section (top earned badges)
- [ ] Certificate analytics section (by category)
- [ ] Auto-refreshes metrics every 30 seconds

### Dashboard API
- [ ] GET /api/admin/dashboard returns metrics + recent activity
- [ ] Metrics accurate for all users
- [ ] Recent activity sorted by most recent first
- [ ] Activity includes action, resource_type, admin_wallet, timestamp

### Audit Trail Retrieval
- [ ] GET /api/admin/audit returns all logs
- [ ] GET /api/admin/audit?wallet=X filters by wallet
- [ ] GET /api/admin/audit?action=Y filters by action
- [ ] GET /api/admin/audit?limit=Z paginates results
- [ ] Logs include: id, action, resource_type, resource_id, old_value, new_value, reason, admin_wallet, created_at
- [ ] Logs sorted DESC by created_at (most recent first)

---

## Phase 7: SNAG Integration Enhancement ✅

### Certificate Syncing to SNAG
- [ ] realtimeSnagSyncService has queueCertificateSync() method
- [ ] queueCertificateSync() queues certs for immediate sync (like badges)
- [ ] processCertificateBatch() syncs to SNAG with cert_prefix
- [ ] certificateService.awardCertificate() calls queueCertificateSync()
- [ ] Certificate awards appear on SNAG leaderboard within 100ms

### SNAG Badge Linking
- [ ] snag_badge_mapping table created and indexes exist
- [ ] POST /api/admin/snag/link-badge/:badgeName/:snagBadgeId links badges
- [ ] GET /api/admin/snag/badge-mappings lists all mappings
- [ ] Admin can link multiple SHIFT badges to SNAG badge IDs
- [ ] Linking logged in admin_logs audit trail

### Full SNAG Sync
- [ ] POST /api/admin/snag/sync-all triggers full sync
- [ ] Queries all users and their badges
- [ ] Queues all badges for batch sync to SNAG
- [ ] Returns count of users processed
- [ ] Logged in admin_logs with reason

### Public Certificate API
- [ ] GET /api/certificates/:wallet returns user's active certs
- [ ] GET /api/certificates/category/:category returns all certs in category
- [ ] Public endpoints (no admin key required)
- [ ] Response includes multiplier boost and off-ceiling bonus calculation
- [ ] Correctly excludes revoked certificates

### Bidirectional SNAG Sync
- [ ] snag_sync_failures table tracks failed syncs
- [ ] Retry logic: 3 attempts before logging failure
- [ ] Failed syncs queryable for manual investigation
- [ ] Admin can view failed sync queue
- [ ] Manual retry button to re-sync failed items

---

## Integration & End-to-End Tests

### Real-Time Flow: User Opens Position
- [ ] User opens position via smart contract
- [ ] Position recorded in positions table
- [ ] XP earned → badgeService.evaluateBadges() called
- [ ] Badge qualified → awardBadge() called
- [ ] Badge → realtimeSnagSyncService.queueBadgeSync() queued
- [ ] Within 100ms: Badge synced to SNAG via awardBadgeInSnag()
- [ ] User multiplier recalculated with new badge
- [ ] Multiplier → queueMultiplierSync() queued
- [ ] Within 2s: Multiplier synced to SNAG
- [ ] SNAG leaderboard updated with badge + multiplier
- [ ] Admin can view action in GET /api/admin/audit

### Real-Time Flow: Seasonal Ranking Reset
- [ ] Admin triggers POST /api/admin/certificates/seasonal/reset
- [ ] Service queries XP leaderboard for season
- [ ] Top 1% users (threshold ~280 users) → "top_1_percent" cert awarded
- [ ] Top 10%, Top 25% → respective certs awarded
- [ ] Most Profitable, Most Active → special certs awarded
- [ ] All awards → queueCertificateSync() → SNAG within 100ms
- [ ] Previous season's seasonal certs revoked
- [ ] Audit logs show all awards with reason "Seasonal reset S1 2024"

### Real-Time Flow: Event-Based Badge (FOMC)
- [ ] Event created: POST /api/admin/events (FOMC Announcement)
- [ ] User opens position during event window
- [ ] badgeService.checkFedDayTrade(wallet) runs
- [ ] eventService.checkEventEligibility() returns true
- [ ] Badge "fed_day_trade" awarded
- [ ] queueBadgeSync() → SNAG within 100ms
- [ ] Admin can view event impact: GET /api/admin/events/:eventId/activity

### Cross-System Consistency
- [ ] User's badges in badges table == badges in badgeService.getBadges()
- [ ] User's certs in user_certificates == certificateService.getWalletCertificates()
- [ ] User's multiplier = 1.0 + badge_sum (capped at +2.0x) + cert_sum + off_ceiling_sum
- [ ] SNAG leaderboard badges == SHIFT badges table (within 100ms sync time)
- [ ] Admin audit logs == all changes in system (admin_logs complete)

---

## Performance & Load Tests

### Sync Queue Performance
- [ ] 1000 XP syncs debounced to 2s → 1 batch call to SNAG
- [ ] 100 badge syncs immediate → 100 individual SNAG calls (acceptable)
- [ ] Badge sync latency: < 100ms from award to SNAG
- [ ] XP/multiplier sync latency: < 2.5s from change to SNAG
- [ ] Queue never exceeds 500 items (auto-processes)
- [ ] Memory usage < 50MB for queue

### Database Performance
- [ ] getConfig(key) with cache: < 1ms (if cached)
- [ ] getConfig(key) without cache: < 50ms (DB query)
- [ ] badge_multiplier_stack calculation: < 10ms
- [ ] User profile lookup: < 100ms (all badges + certs)
- [ ] Dashboard metrics: < 500ms (aggregations across all users)

### Audit Trail Performance
- [ ] INSERT admin_log: < 5ms
- [ ] Query 50 audit logs: < 50ms
- [ ] Filter by wallet: < 100ms (indexed query)

---

## Security Tests

### Admin Authentication
- [ ] Missing x-admin-key header → 401 Unauthorized
- [ ] Invalid x-admin-key → 401 Unauthorized
- [ ] Valid x-admin-key → 200 OK
- [ ] All admin endpoints protected
- [ ] Non-admin endpoints don't require key

### Audit Trail Security
- [ ] All admin actions logged (cannot be skipped)
- [ ] Admin wallet captured with each action
- [ ] Reason field required for configuration changes
- [ ] Old/new values preserved for change tracking
- [ ] Logs are append-only (cannot be deleted/modified)

### Soulbound Certificate Security
- [ ] Revoke soulbound cert → error "Certificate is soulbound"
- [ ] No way to bypass soulbound check
- [ ] is_soulbound flag in database checked before any revoke
- [ ] Attempted revokes logged in audit trail

---

## User Acceptance Tests

### Admin User Perspective
- [ ] I can search any user and see their profile
- [ ] I can understand their multiplier breakdown
- [ ] I can view all changes to them in audit trail
- [ ] I can see system metrics on dashboard
- [ ] I can create events and see badge awards
- [ ] I can adjust configuration without code changes
- [ ] I can create and award certificates
- [ ] I can link SHIFT badges to SNAG
- [ ] I can trigger full syncs to SNAG

### End User Perspective
- [ ] I earn XP and see it synced to leaderboard
- [ ] I earn badges and see them appear instantly
- [ ] My multiplier updates in real-time
- [ ] I can view my earned certificates
- [ ] Special events trigger badges as described
- [ ] My profile shows all achievements
- [ ] Multiplier calculation is clear and correct

---

## Testing Execution Order

1. **Phase 0** — Audit logging (prerequisite for all)
2. **Phase 1** — Badge templates and stacking
3. **Phase 2** — Real-time SNAG sync
4. **Phase 3** — Event management
5. **Phase 4** — Configuration management
6. **Phase 5** — Certificate system
7. **Phase 6** — User management & dashboard
8. **Phase 7** — SNAG integration enhancement
9. **Integration Tests** — Cross-system flows
10. **Performance Tests** — Load, latency, throughput
11. **Security Tests** — Authentication, audit
12. **User Acceptance Tests** — Admin and end-user perspectives

---

## Testing Tools & Resources

### Manual Testing
- Postman or curl for API endpoints
- Browser dev tools for frontend
- Database query tool (psql/DBeaver) for direct queries
- Git logs for tracking changes

### Automated Testing (Recommended Next Phase)
- Jest/Vitest for unit tests (services, validators)
- Supertest for API endpoint tests
- Database fixtures for consistent test data
- CI/CD integration (GitHub Actions) for automated runs

### Test Data Setup
- Create test wallet addresses
- Create test events (FOMC, CPI, earnings)
- Create test badges and certificates
- Use consistent test data across all tests

### Monitoring During Testing
- Server logs: Check for errors, warnings
- Database queries: Monitor slow queries
- SNAG sync logs: Verify sync success/failure
- Admin audit logs: Verify all actions logged

---

## Sign-Off Criteria

✅ **All tests pass:**
- [ ] Phase 0-7 functionality tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks met
- [ ] Security tests pass
- [ ] User acceptance tests pass

✅ **Code quality:**
- [ ] No console errors in browser
- [ ] No unhandled promise rejections
- [ ] Database migrations clean
- [ ] No TypeScript compilation errors

✅ **Documentation:**
- [ ] All phases documented
- [ ] API endpoints documented
- [ ] Database schema documented
- [ ] Admin UI documented

✅ **Deployment readiness:**
- [ ] All migrations created
- [ ] All services implemented
- [ ] All routes created
- [ ] All frontend pages created
- [ ] Environment variables configured
- [ ] SNAG credentials configured

---

## Notes

- Tests should be run in a staging environment mirroring production
- Real SNAG credentials required for sync testing
- Database should be fresh for each test run (or use transactions)
- Some tests may require manual setup (e.g., SNAG events)
- Performance tests should use production database size estimates

