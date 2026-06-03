# SHIFT Airdrop — Campaign Launch & Maintenance Strategy

**Campaign Launch:** May 25, 2026  
**Render Maintenance:** May 27, 2026 01:00-02:00 UTC (30 minutes)  
**Status:** 2 days buffer before maintenance ✅

---

## 🎯 Goal
Ensure **zero user impact** during the May 27 Render maintenance window. Frontend stays operational with cached data.

---

## 📅 Timeline

| Date | Time | Event | Action |
|------|------|-------|--------|
| **May 25** | 00:00 UTC | Campaign goes LIVE | Full system operational |
| **May 25-26** | 24h | Monitor systems | Watch error logs, user activity |
| **May 27** | 00:55 UTC | Pre-maintenance | Display banner, pre-cache data |
| **May 27** | 01:00-02:00 UTC | **Render maintenance** | Graceful degradation mode |
| **May 27** | 02:05 UTC | Post-maintenance | Verify all systems, clear banner |

---

## Strategy 1️⃣: Frontend Caching & Service Workers

### A. Pre-Maintenance Data Cache (May 27 00:55 UTC)

**Create cache-warming script** in `frontend/lib/cache-warmer.ts`:

```typescript
export async function warmCache() {
  try {
    // Fetch and cache critical data before maintenance
    const wallet = getConnectedWallet();
    if (!wallet) return;

    // Cache user's personal data
    const [level, streak, missions, badges, activity, referrals] = await Promise.all([
      fetch(`/api/dashboard/${wallet}/level`).then(r => r.json()),
      fetch(`/api/dashboard/${wallet}/streak`).then(r => r.json()),
      fetch(`/api/dashboard/${wallet}/missions`).then(r => r.json()),
      fetch(`/api/dashboard/${wallet}/badges/gallery`).then(r => r.json()),
      fetch(`/api/dashboard/${wallet}/activity`).then(r => r.json()),
      fetch(`/api/dashboard/${wallet}/referrals/stats`).then(r => r.json()),
    ]);

    // Store in localStorage
    localStorage.setItem('cached_level', JSON.stringify(level));
    localStorage.setItem('cached_streak', JSON.stringify(streak));
    localStorage.setItem('cached_missions', JSON.stringify(missions));
    localStorage.setItem('cached_badges', JSON.stringify(badges));
    localStorage.setItem('cached_activity', JSON.stringify(activity));
    localStorage.setItem('cached_referrals', JSON.stringify(referrals));

    // Cache leaderboard
    const leaderboard = await fetch(`/api/dashboard/leaderboard/top`).then(r => r.json());
    localStorage.setItem('cached_leaderboard', JSON.stringify(leaderboard));

    console.log('✅ Cache warmed before maintenance');
  } catch (error) {
    console.log('Cache warming failed (expected during maintenance)');
  }
}
```

### B. Fallback to Cached Data

Update components to use cached data if API fails:

```typescript
// In any component's useEffect:
async function fetchWithFallback() {
  try {
    const res = await fetch('/api/dashboard/{wallet}/level');
    if (!res.ok) throw new Error('API failed');
    setData(await res.json());
  } catch (error) {
    // Maintenance mode: use cached data
    const cached = localStorage.getItem('cached_level');
    if (cached) {
      setData(JSON.parse(cached));
      setIsStale(true); // Show "data may be outdated" indicator
    }
  }
}
```

### C. Maintenance Banner

**Create `frontend/components/MaintenanceBanner.tsx`:**

```tsx
'use client';

import { useEffect, useState } from 'react';

export function MaintenanceBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if we're in maintenance window (May 27, 01:00-02:00 UTC)
    const now = new Date();
    const isMaintenance = 
      now.getUTCDate() === 27 && 
      now.getUTCHours() >= 1 && 
      now.getUTCHours() < 2;

    setShowBanner(isMaintenance);
  }, []);

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      backgroundColor: '#f59e0b',
      color: '#000',
      padding: '16px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: 'bold'
    }}>
      ⚙️ Scheduled maintenance in progress (01:00-02:00 UTC). 
      Showing cached data. We'll be back shortly!
    </div>
  );
}
```

Add to root layout:
```tsx
import { MaintenanceBanner } from '@/components/MaintenanceBanner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <MaintenanceBanner />
        {/* rest of app */}
      </body>
    </html>
  );
}
```

---

## Strategy 2️⃣: Read-Only Mode

During maintenance, disable mutations (check-in, mission claims, trades):

```typescript
// frontend/lib/api.ts
const isMaintenance = () => {
  const now = new Date();
  return now.getUTCDate() === 27 && 
         now.getUTCHours() >= 1 && 
         now.getUTCHours() < 2;
};

export async function processDailyCheckin(wallet: string) {
  if (isMaintenance()) {
    throw new Error('Maintenance in progress. Check-ins temporarily unavailable.');
  }
  // ... normal logic
}

export async function claimMissionReward(wallet: string, missionId: string) {
  if (isMaintenance()) {
    throw new Error('Maintenance in progress. Mission claims temporarily unavailable.');
  }
  // ... normal logic
}
```

Show disabled state on buttons:
```tsx
const isMaintenance = () => {/* check above */};

<button disabled={isMaintenance()}>
  {isMaintenance() ? '⚙️ Maintenance' : 'Claim Reward'}
</button>
```

---

## Strategy 3️⃣: CDN & Static Caching

### Use Vercel's Edge Caching

Update `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=60, stale-while-revalidate=3600"
        }
      ]
    }
  ]
}
```

This means:
- Cache API responses for 60s at edge
- Even if backend is down, serve stale data for 1 hour
- Users get instant responses from Vercel's CDN

### Cloudflare Alternative (Optional)

If you want more control, add Cloudflare reverse proxy:
1. Add DNS CNAME to Cloudflare
2. Set caching rules for API endpoints
3. Enable "Always Online" to serve cached responses during downtime

---

## Strategy 4️⃣: Database Read Replica (Advanced)

For **mission-critical reads**, set up a read-only replica:

1. **Render PostgreSQL**: Create read-only instance in different region
2. **Backend**: Route reads to replica, writes to primary
3. If primary is down, continue serving reads

```typescript
// src/db/connection.ts
const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_REPLICA_URL,
});

const writePool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export function query(sql, params) {
  if (sql.toUpperCase().startsWith('SELECT')) {
    return readPool.query(sql, params); // Read from replica
  } else {
    return writePool.query(sql, params); // Write to primary
  }
}
```

**Note:** This is complex; only needed if you expect high user activity during maintenance.

---

## Recommended Approach: Hybrid Strategy

### ✅ What we WILL do (Recommended)

**Phase 1: Before May 25** (Next 2 days)
- [ ] Test full system with 1000+ concurrent users (load test)
- [ ] Take full database backup
- [ ] Document all critical flows
- [ ] Brief team on maintenance window

**Phase 2: May 25-27** (During campaign)
- [ ] Monitor error logs & user activity
- [ ] Set up alerts for API failures
- [ ] Pre-warm cache script (automated)

**Phase 3: May 27 00:55 UTC** (5 min before maintenance)
- [ ] Auto-run cache-warming script on all connected clients
- [ ] Display maintenance banner
- [ ] Switch to read-only mode

**Phase 4: May 27 02:00 UTC** (After maintenance)
- [ ] Health check: verify all endpoints responding
- [ ] Clear cache if needed
- [ ] Monitor for any issues
- [ ] Remove maintenance banner

### Effort & Impact

| Strategy | Implementation | User Impact | Risk |
|----------|---|---|---|
| **Maintenance Banner** | 30 min | None (just banner) | ✅ Low |
| **Local Cache + Fallback** | 2 hours | Shows cached data | ✅ Low |
| **Read-Only Mode** | 1 hour | Can't claim/checkin | ✅ Low |
| **CDN Caching** | 30 min (Vercel) | Automatic, transparent | ✅ Low |
| **DB Read Replica** | 4-6 hours | Reads continue, writes queued | ⚠️ Medium |

---

## Implementation Checklist

### Before May 25 (Do these NOW)
- [ ] Create `MaintenanceBanner.tsx` component
- [ ] Add cache-warmer script
- [ ] Update API layer for fallback logic
- [ ] Add maintenance time check function
- [ ] Set up monitoring/alerting (Vercel/Render dashboards)
- [ ] Test with backend simulated as down
- [ ] Create database backup script
- [ ] Brief team on plan

### May 25 (Campaign Launch)
- [ ] Monitor real user activity
- [ ] Watch logs for errors
- [ ] Test all critical paths

### May 27 00:55 UTC
- [ ] Manual trigger cache-warming (or automatic)
- [ ] Display banner to users
- [ ] Standby for support

### May 27 02:05 UTC (Post-Maintenance)
- [ ] Verify backend responding
- [ ] Check no data corruption
- [ ] Remove banner
- [ ] Monitor for issues

---

## Status Page (Optional)

Create a status page so users know what's happening:

**`frontend/app/status/page.tsx`:**

```tsx
export default function StatusPage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>SHIFT Airdrop Status</h1>
      <p>Scheduled maintenance: May 27, 01:00-02:00 UTC</p>
      <p>Services during maintenance:</p>
      <ul>
        <li>✅ View your profile (cached data)</li>
        <li>✅ View leaderboard (cached data)</li>
        <li>❌ Daily check-ins (temporarily disabled)</li>
        <li>❌ Mission claims (temporarily disabled)</li>
        <li>❌ New trades (temporarily disabled)</li>
      </ul>
      <p>We apologize for any inconvenience!</p>
    </div>
  );
}
```

---

## Worst Case: Rollback Plan

If something breaks after maintenance:

1. **Immediate**: Kill deployment, revert to previous version
   ```bash
   # On Render dashboard: click "Cancel Deploy" or manual rollback
   ```

2. **Database issue**: Restore from backup
   ```bash
   # Render: use backup restoration tool
   ```

3. **Communication**: Announce on status page, Discord, Twitter

---

## Final Recommendation

**Implement all 3 strategies:**

1. ✅ **Maintenance Banner** (5 min) → Let users know
2. ✅ **Cache + Fallback** (2 hrs) → Show cached data
3. ✅ **Read-Only Mode** (1 hr) → Disable mutations

**Total implementation: 3-4 hours** before May 25.

**User experience: Seamless.** Users see maintenance banner, data loads from cache, can still view everything. Worst case: "Check-ins temporarily unavailable."

---

## Questions?

- Should we implement read replica? (Advanced, probably overkill for 30 min)
- Want automated cache warming or manual?
- Should status page be separate or just the banner?
- Need SMS/Discord alerts to your team during maintenance?

Let me know which strategies to implement! 🚀
