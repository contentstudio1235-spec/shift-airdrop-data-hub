# Sprint 1 Gamification — Integration Guide

## ✅ What's Done (Committed & Pushed)

All Sprint 1 features are implemented and ready to deploy:

### Backend
- ✅ Level system (5 tiers with XP thresholds)
- ✅ Daily check-in service (streaks + milestone bonuses)
- ✅ Leaderboard service (top 100, rank, percentile)
- ✅ 6 new API endpoints
- ✅ Database migration 005 (gamification tables & columns)

### Frontend
- ✅ XpProgressBar component (animated level display)
- ✅ DailyStreakCard component (check-in button + celebrations)
- ✅ MultiplierBreakdown component (tooltip breakdown)
- ✅ LeaderboardTable component (full leaderboard with ranks)
- ✅ Gamification utilities & API integration
- ✅ Full TypeScript support

---

## 🚀 Integration Steps

### Step 1: Update Render Build Command (Auto-run migration)

Go to **Render Dashboard** → **Shift Airdrop Backend** → **Settings**

Update **Build Command** to:
```bash
npm install && npm run build && npm run migrate && npm start
```

This will auto-run migration 005 on the next deploy.

### Step 2: Add Components to `/app/airdrop/page.tsx`

Import the new components:
```tsx
import { XpProgressBar } from '@/components/XpProgressBar';
import { DailyStreakCard } from '@/components/DailyStreakCard';
import { MultiplierBreakdown } from '@/components/MultiplierBreakdown';
import { LeaderboardTable } from '@/components/LeaderboardTable';
```

### Step 3: Add to Dashboard Layout

In the airdrop page, update the sidebar/dashboard section:

**After the stats (XP, multiplier, rank):**
```tsx
{/* Level & Progress */}
{wallet && <XpProgressBar wallet={wallet} totalXp={dashboard?.totalXp || 0} />}

{/* Daily Streak */}
{wallet && (
  <DailyStreakCard 
    wallet={wallet}
    onCheckinComplete={(xp, streak) => {
      // Optionally refresh dashboard after checkin
      console.log(`+${xp} XP! Streak: ${streak}`);
    }}
  />
)}

{/* Multiplier Breakdown */}
<MultiplierBreakdown 
  baseMultiplier={dashboard?.claimMultiplier || 1.0}
  components={[
    { name: 'Base', value: 1.0, icon: '📊', color: '#64748b' },
    { name: 'Token Bonus', value: 0.25, icon: '💎', color: '#3b82f6' },
    { name: 'Streak', value: currentStreakBonus, icon: '🔥', color: '#ef4444' },
    // Add other components...
  ]}
/>
```

### Step 4: Add Leaderboard Section

Create a new "Leaderboard" tab or section:

```tsx
<div className="leaderboard-section">
  <h2>🏆 Global Leaderboard</h2>
  <LeaderboardTable wallet={wallet} limit={100} />
</div>
```

Or as a separate page at `/app/airdrop/leaderboard`:
```tsx
'use client';
import { LeaderboardTable } from '@/components/LeaderboardTable';

export default function LeaderboardPage() {
  return (
    <div className="container">
      <h1>🏆 SHIFT Leaderboard</h1>
      <LeaderboardTable limit={100} />
    </div>
  );
}
```

---

## 📊 Testing Checklist

### Local Testing (Before Deploy)

```bash
# 1. Run migration locally
npm run migrate
# ✓ Should see "✅ Migration 005_gamification_v1.sql completed"

# 2. Start dev server
npm run dev
# ✓ Should start on port 3001

# 3. Test daily check-in endpoint
curl -X POST http://localhost:3001/api/dashboard/3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn/checkin
# Expected response:
{
  "wallet": "3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn",
  "streakCount": 1,
  "xpAwarded": 50,
  "isNewStreak": true,
  "message": "+50 XP! 1 day streak 🔥"
}

# 4. Test level endpoint
curl http://localhost:3001/api/dashboard/3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn/level
# Expected: level info with currentLevel, progressPercent, xpToNextLevel

# 5. Test leaderboard endpoint
curl http://localhost:3001/api/dashboard/leaderboard/top?limit=10
# Expected: array of 10 top users

# 6. Test user rank endpoint
curl http://localhost:3001/api/dashboard/3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn/rank
# Expected: rank, percentile, totalUsers
```

### Frontend Testing (After Deploy)

1. **Level Bar Display**
   - [ ] XP progress bar shows correct current level
   - [ ] Progress percentage is accurate
   - [ ] Level colors match expected colors
   - [ ] Next level name displays correctly

2. **Daily Streak**
   - [ ] Check-in button works and adds XP
   - [ ] Streak counter increments
   - [ ] Celebration animation plays at 7/30/100 day milestones
   - [ ] Button shows "Checked in today" after first check-in

3. **Multiplier Tooltip**
   - [ ] Tooltip opens on info button click
   - [ ] Shows all multiplier components
   - [ ] Total matches base multiplier
   - [ ] Colors are visible and match components

4. **Leaderboard**
   - [ ] Top 100 users display in order
   - [ ] User rank banner shows for connected wallet
   - [ ] Percentile calculation is correct
   - [ ] Level icons display properly
   - [ ] Mobile layout is responsive

---

## 🎯 Level System Reference

| Level | Name | XP Range | Icon | Color |
|-------|------|----------|------|-------|
| 1 | Seed | 0–999 | 🌱 | Green |
| 2 | Holder | 1,000–4,999 | 💎 | Blue |
| 3 | Trader | 5,000–14,999 | 📈 | Amber |
| 4 | Whale | 15,000–49,999 | 🐋 | Purple |
| 5 | Legend | 50,000+ | 👑 | Pink |

---

## 🔌 API Reference

### Daily Check-in
```
POST /api/dashboard/{wallet}/checkin
Response: { streakCount, xpAwarded, isNewStreak, message }
```

### Get Streak Info
```
GET /api/dashboard/{wallet}/streak
Response: { currentStreak, lastCheckinDate, daysUntilMilestone }
```

### Get Level Info
```
GET /api/dashboard/{wallet}/level
Response: { currentLevel, progressPercent, xpToNextLevel, nextLevelName }
```

### Get User Rank
```
GET /api/dashboard/{wallet}/rank
Response: { rank, percentile, totalUsers, userEntry }
```

### Get Top Leaderboard
```
GET /api/dashboard/leaderboard/top?limit=100
Response: { count, entries[] }
```

### Get Leaderboard Context
```
GET /api/dashboard/{wallet}/leaderboard-context?context=5
Response: { count, entries[] }  # User + 5 above/below
```

---

## 📝 Styling Notes

All components use inline `<style jsx>` blocks with dark mode design:
- Background: `#0f172a` (dark slate)
- Borders: `#334155` (slate)
- Text: `#cbd5e1` (light slate)
- Accents: Green (`#10b981`), Blue (`#3b82f6`), Purple (`#8b5cf6`)

Components are fully responsive and tested on mobile.

---

## 🚨 Troubleshooting

### Migration fails with "table not found"
- Ensure migration 005 is in `src/db/migrations/005_gamification_v1.sql`
- Check that migration runner reads files in alphabetical order
- Verify Render Build Command includes `npm run migrate`

### Components don't load on frontend
- Check that all imports are correct (check `gamification.ts` path)
- Verify API URL in `.env.local` points to correct backend
- Check browser console for fetch errors

### Leaderboard shows no entries
- Ensure at least one user has `total_xp > 0` in database
- Check that leaderboard query runs successfully locally
- Verify database migration 005 created required tables

---

## 📅 Next Steps (Sprint 2)

- [ ] Activity feed component
- [ ] Badge gallery page
- [ ] Weekly missions system
- [ ] Referral tracking dashboard
- [ ] Achievement celebrations (full-page modals)
- [ ] Push notifications for milestones

---

**Status:** ✅ Ready to deploy to Render

Push to main triggers automatic rebuild with migration!
