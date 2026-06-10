# SHIFT Airdrop — Complete Feature Testing Checklist

## Sprint 1: Core Gamification

### 1. Level System (5 Tiers)
- [ ] **API Test**: `GET /api/dashboard/{wallet}/level`
  - Returns: `{ level: 1-5, levelName, progressPercent, xpToNextLevel, icon }`
- [ ] **Frontend**: XpProgressBar component displays
  - Shows current level (🌱 Seed → 💎 Holder → 📈 Trader → 🐋 Whale → 👑 Legend)
  - Progress bar fills correctly
  - Next level name and XP needed shown
- [ ] **DB**: Check `users.level` column updated when XP changes

**Test wallet:** `3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn`

---

### 2. Daily Streaks
- [ ] **API Test**: `GET /api/dashboard/{wallet}/streak`
  - Returns: `{ currentStreak, longestStreak, lastCheckinDate, milestone, milestoneReward }`
- [ ] **API Test**: `POST /api/dashboard/{wallet}/checkin`
  - Returns: `{ success: true, xpAwarded, newStreak, milestone }`
- [ ] **Frontend**: DailyStreakCard component
  - Check-in button clickable and updates
  - Fire emoji shows streak count
  - +50 XP awarded per check-in
  - Milestone celebration (7-day: +250 XP, 30-day: +500 XP, 100-day: +1000 XP)

**Test**: Click checkin button once per day for 7 days to trigger milestone

---

### 3. XP Progress Bar
- [ ] **Visual**: Bar animates smoothly 0-100%
- [ ] **Color coding**: Changes by level
  - Level 1-2: Green tones
  - Level 3-4: Blue tones
  - Level 5: Purple/Gold
- [ ] **Tooltip**: Shows breakdown of XP sources (base, token bonus, streak, KOL, badge)

---

### 4. Multiplier Breakdown
- [ ] **Component**: Renders hover tooltip with sources
  - Base: 1.0x
  - Token bonus: 0.1-0.25x (token-specific)
  - Streak bonus: 0.05-1.0x (based on days)
  - KOL bonus: 0.5-2.0x (if flagged)
  - Badge bonus: 0.1-0.3x per badge
- [ ] **Colors**: Each source has distinct color
- [ ] **Formula display**: Shows `log₁₀(positionSize) × 100 × multiplier`

---

### 5. Live Leaderboard
- [ ] **API Test**: `GET /api/dashboard/leaderboard/top?limit=100`
  - Returns: `{ entries: [{ rank, wallet, level, levelName, totalXp, currentStreak }] }`
- [ ] **Component**: LeaderboardTable renders
  - Top 3 show emoji medals (🥇🥈🥉)
  - Rank #4+ show numbers
  - Correct level icons (🌱💎📈🐋👑)
  - User's wallet highlighted if connected
  - Green left border on current user row
- [ ] **User Rank**: `GET /api/dashboard/{wallet}/leaderboard-context`
  - Returns: `{ rank, percentile, userEntry }`
  - Percentile calculated correctly (e.g., "Top 15%")

**Mobile responsive**: 640px breakpoint hides Level and Streak columns

---

## Sprint 2: Advanced Gamification

### 6. Activity Feed
- [ ] **API Test (User)**: `GET /api/dashboard/{wallet}/activity?limit=15`
  - Returns: `{ count, events: [{ eventType, eventData, createdAt }] }`
- [ ] **API Test (Global)**: `GET /api/dashboard/activity/global?limit=10`
- [ ] **Component**: ActivityFeed renders timeline
  - Shows user actions: position_opened, position_closed, badge_earned, level_up, milestone
  - Relative timestamps (5m ago, 2h ago, etc.)
  - Color-coded by event type
  - Wallet addresses shortened
- [ ] **Global view**: Shows recent actions across all users

**Test**: Open/close a position and check activity feed updates

---

### 7. Weekly Missions
- [ ] **API Test**: `GET /api/dashboard/{wallet}/missions`
  - Returns: `{ missions[], progress[], totalWeeklyXp }`
- [ ] **API Test (Claim)**: `POST /api/dashboard/{wallet}/missions/{missionId}/claim`
  - Returns: `{ success, xpAwarded, message }`
- [ ] **Component**: MissionsWidget renders
  - Shows current week's missions
  - Progress bars update correctly
  - Progress text shows (e.g., "5/10")
  - "Claim" button appears when completed
  - Claim button disables after claiming
  - Weekly XP badge at top shows total earned
- [ ] **Mission Types**: At least 3 missions showing (hold_days, position_size, trades_count, etc.)

**Test**: Complete a mission (e.g., open a position) and claim reward

---

### 8. Badge Gallery
- [ ] **API Test**: `GET /api/dashboard/{wallet}/badges/gallery`
  - Returns: `{ badges[], breakdown: { common, rare, epic, legend }, earnedCount, totalCount }`
- [ ] **Component**: BadgeGallery renders
  - Shows all badges (earned + locked)
  - Rarity filters work (common/rare/epic/legend)
  - Earned badges show unlock date
  - Locked badges show unlock requirements
  - Default 7 badges visible:
    1. First Trade (📈, common) - open any position
    2. Diamond Hands (💎, rare) - hold 7 days
    3. Whale Mode (🐋, epic) - $10,000+ position
    4. 7-Day Streak (🔥, rare) - login 7 consecutive days
    5. Referral King (👑, epic) - refer 10 people
    6. Community Builder (🤝, common) - join Discord & Telegram
    7. Legend (👑, legend) - reach Level 5 (50,000+ XP)

**Test**: Filter by rarity, verify badge counts in breakdown

---

### 9. Referral Dashboard
- [ ] **API Test**: `GET /api/dashboard/{wallet}/referrals/stats`
  - Returns: `{ myStats, referredUsers[], myReferrer, networkXp, leaderboard[] }`
- [ ] **Component**: ReferralDashboard renders sections:
  - **My Referrer** (if exists): Shows referrer wallet, code, XP earned
  - **Stats Grid**: Total referred, active referrals, referral XP, bonus XP available
  - **Network XP**: Shows equation: Your XP + Referrals' XP = Network XP
  - **Your Referrals**: List of referred users with dates and XP awarded
  - **Referral Kings**: Top 10 leaderboard with medals (🥇🥈🥉)
- [ ] **Highlight**: Current user's row in leaderboard highlighted

**Test**: Check if you have referrals, verify counts match database

---

## Database Verification

### Sprint 1 Tables
- [ ] **users table**: Has columns
  - `level` (1-5)
  - `total_xp` (integer)
  - `last_daily_checkin` (timestamp)
  - `claim_multiplier` (decimal)
  - `kol_flag` (boolean)

- [ ] **leaderboard_snapshots**: Updated daily with top 100

- [ ] **user_missions** ⚠️ Note: Named differently in migrations
  - Check actual table name (might be `user_mission_progress`)

- [ ] **badge_progress**: Tracks earned badges

### Sprint 2 Tables
- [ ] **activity_feed**: `{ id, wallet, event_type, event_data (JSONB), created_at }`
  - Indexes on `(wallet, created_at DESC)` and `(created_at DESC)`

- [ ] **missions**: `{ id, name, description, xp_reward, requirement_type, requirement_value, season, week }`
  - At least 3-4 missions seeded

- [ ] **user_mission_progress**: `{ wallet, mission_id, progress_value, completed, claimed_reward }`

- [ ] **badge_definitions**: 7 default badges seeded
  - first_trade, diamond_hands_7d, whale_mode, streak_7d, referral_king, community_builder, legend

- [ ] **referrals** (enhanced): Has columns
  - `xp_awarded`
  - `multiplier_applied`

---

## API Endpoints Verification

### Sprint 1 (6 endpoints)
```
✓ POST /api/dashboard/{wallet}/checkin
✓ GET  /api/dashboard/{wallet}/streak
✓ GET  /api/dashboard/{wallet}/level
✓ GET  /api/dashboard/{wallet}/rank
✓ GET  /api/dashboard/leaderboard/top
✓ GET  /api/dashboard/{wallet}/leaderboard-context
```

### Sprint 2 (7 endpoints)
```
✓ GET  /api/dashboard/{wallet}/activity
✓ GET  /api/dashboard/activity/global
✓ GET  /api/dashboard/{wallet}/missions
✓ POST /api/dashboard/{wallet}/missions/{missionId}/claim
✓ GET  /api/dashboard/{wallet}/badges/gallery
✓ GET  /api/dashboard/{wallet}/referrals/stats
```

---

## Frontend Components Verification

### Sprint 1 Components
```
✓ XpProgressBar.tsx     — renders level + progress
✓ DailyStreakCard.tsx   — check-in button + streak display
✓ MultiplierBreakdown.tsx — tooltip with sources
✓ LeaderboardTable.tsx  — top 100 rankings
```

### Sprint 2 Components
```
✓ ActivityFeed.tsx      — user/global timeline
✓ BadgeGallery.tsx      — badge collection with filters
✓ MissionsWidget.tsx    — weekly quests + claim
✓ ReferralDashboard.tsx — referral analytics
```

---

## Integration Points

### Page Integration
- [ ] **Airdrop Page** (`/app/airdrop/page.tsx`): 
  - All 8 components integrated?
  - Layout is responsive (desktop/mobile)?
  - Components load without errors?

- [ ] **Dashboard Page** (`/app/dashboard/page.tsx`):
  - Shows user's personal stats?
  - Updates when wallet connects?

### Wallet Connection
- [ ] Connect wallet → components load with data
- [ ] Disconnect wallet → components reset
- [ ] Switch wallet → data updates automatically

---

## End-to-End User Flow Tests

### Flow 1: New User (Seed → Holder)
1. Connect wallet with 0 XP
2. See Level 1 (🌱 Seed)
3. View missions
4. Complete a mission (open position)
5. Claim reward
6. See XP increased, progress bar updated

### Flow 2: Daily Engagement
1. Visit daily for 7 days
2. Click check-in each day
3. Day 7: Milestone triggered (+250 XP bonus)
4. See "7-Day Streak" badge earned
5. Verify in badge gallery

### Flow 3: Trading Multiplier
1. Open $5000+ position in TSL2L (1.2x multiplier)
2. Hold 1+ hour
3. Check XP earned = `log₁₀(5000) × 100 × 1.2`
4. View multiplier breakdown
5. See "Token Bonus: 1.2x" highlighted

### Flow 4: Referral
1. Share referral link with friend
2. Friend signs up with code
3. Check referrals dashboard
4. Verify "1 total referred" and XP awarded
5. See friend in referral list

---

## Performance & Reliability

- [ ] **Load times**: Components render in <2s
- [ ] **Network**: All API calls complete <500ms
- [ ] **Database**: No N+1 queries in logs
- [ ] **Memory**: No memory leaks during navigation
- [ ] **Errors**: No console errors or warnings
- [ ] **Responsiveness**: Mobile layout (640px) works

---

## Known Issues & Workarounds

| Issue | Status | Workaround |
|-------|--------|-----------|
| SNAG sync needs env vars | ⚠️ Config | Add env vars to Render |
| PostHog not configured | ⏳ Later | Add API key to `.env.local` |
| Missions hardcoded | ✅ By design | Can add admin editor later |

---

## Sign-Off Checklist

- [ ] All 13 API endpoints tested and working
- [ ] All 8 frontend components rendering
- [ ] Database schema correct (13 tables + indexes)
- [ ] User flows (signup → trading → missions → referral) working
- [ ] Mobile responsive on 640px+
- [ ] No console errors
- [ ] Vercel Analytics tracking page views
- [ ] SNAG sync working (if env vars configured)

---

**Test Wallet:** `3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn`

**Test Environment:**
- Frontend: https://airdrop.shiftrwa.xyz (or local)
- Backend: https://shift-airdrop-backend.onrender.com (or localhost:3001)
- Database: PostgreSQL on Render
