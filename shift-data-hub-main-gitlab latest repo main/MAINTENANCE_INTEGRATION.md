# 🚀 Quick Integration: May 27 Maintenance Strategy

**Time to implement: 30 minutes**  
**When to do: Before May 25 (now!)**

---

## Step 1: Add MaintenanceBanner to Root Layout (5 min)

In `frontend/app/layout.tsx`:

```tsx
import { MaintenanceBanner } from '@/components/MaintenanceBanner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MaintenanceBanner />  {/* ← ADD THIS LINE */}
        <PostHogProvider>
          <WalletProvider>
            <ToastProvider>
              <NavBar />
              <main>{children}</main>
              <Analytics />
            </ToastProvider>
          </WalletProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
```

**What it does:** Shows yellow banner "⚙️ Maintenance in progress" May 27, 01:00-02:00 UTC

---

## Step 2: Add Cache Warmer to Airdrop Page (10 min)

In `frontend/app/airdrop/page.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { warmCache, secondsUntilMaintenance } from '@/lib/cache-warmer';

export default function AirdropPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();

  useEffect(() => {
    if (!wallet) return;

    // Auto-warm cache 5 minutes before maintenance
    const secondsLeft = secondsUntilMaintenance();
    
    if (secondsLeft > 0 && secondsLeft < 300) {
      console.log('[Airdrop] Auto-warming cache before maintenance...');
      warmCache(wallet).then(success => {
        if (success) {
          console.log('[Airdrop] Cache warmed successfully');
        }
      });
    }

    // Or allow manual cache warming
    window.warmCacheManually = () => warmCache(wallet);
  }, [wallet]);

  return (
    <div>
      {/* Your existing airdrop page content */}
      
      {/* Optional: Manual cache warming button (remove after May 27) */}
      <button
        onClick={() => window.warmCacheManually?.()}
        style={{ opacity: 0.5, fontSize: '12px' }}
      >
        🔄 Warm Cache (for testing)
      </button>
    </div>
  );
}
```

**What it does:** Auto-warms cache 5 min before maintenance, or allows manual warming

---

## Step 3: Update API Hooks with Fallback (15 min)

In `frontend/lib/api.ts`, wrap API calls with cache fallback:

```typescript
import { getCachedData, isMaintenanceWindow } from '@/lib/cache-warmer';

// Example: Update fetchUserLevel
export async function fetchUserLevel(wallet: string) {
  try {
    const response = await fetch(`/api/dashboard/${wallet}/level`, {
      next: { revalidate: 60 } // Cache for 60s at edge
    });
    
    if (!response.ok) throw new Error('Failed to fetch level');
    return response.json();
  } catch (error) {
    // Fallback to localStorage cache if API fails
    console.warn('[API] Level fetch failed, using cached data');
    const cached = getCachedData('level');
    if (cached) return cached;
    throw error;
  }
}

// Do the same for other endpoints:
// - fetchStreakInfo
// - fetchUserRank
// - fetchTopLeaderboard
// - fetchMissions
// - fetchBadgeGallery
// - fetchReferralStats
// - fetchActivityFeed
```

**What it does:** If API fails, components automatically use cached data

---

## Step 4: Add Read-Only Mode (Optional, 5 min)

Disable mutations during maintenance:

```typescript
// frontend/lib/maintenance.ts
export const isMaintenance = () => {
  const now = new Date();
  return now.getUTCDate() === 27 && now.getUTCHours() >= 1 && now.getUTCHours() < 2;
};

// In any component that does mutations:
<button 
  onClick={handleClaimReward}
  disabled={isMaintenance()}
  title={isMaintenance() ? 'Claims disabled during maintenance' : ''}
>
  {isMaintenance() ? '⚙️ Maintenance' : 'Claim Reward'}
</button>
```

**What it does:** Prevents users from trying to claim/check-in during maintenance

---

## Step 5: Test It (5 min)

### Simulate maintenance locally:

```typescript
// In browser console (for testing):
import { warmCache, isMaintenanceWindow } from '@/lib/cache-warmer';

// Warm cache now
warmCache('3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn');

// Check if maintenance (should be false before May 27)
isMaintenanceWindow(); // false (unless it's May 27 01:00-02:00 UTC)

// View cached data
localStorage.getItem('shift_cache_level');
```

### Manual test:

1. Open browser DevTools → Network tab
2. Run `warmCache()` in console
3. Watch API calls happen
4. Check localStorage has cache keys
5. Go offline (DevTools → Offline)
6. Refresh page → should still see data
7. Try clicking "Claim" → should show disabled/error

---

## Pre-Launch Checklist (May 24)

- [ ] MaintenanceBanner integrated in layout
- [ ] Cache warmer imported in airdrop page
- [ ] API fallback logic added to all fetch functions
- [ ] Read-only mode implemented (optional)
- [ ] Tested with network offline
- [ ] Team briefed on maintenance window
- [ ] Database backup scheduled
- [ ] Monitoring/alerting configured

---

## What Happens May 27, 01:00 UTC

1. **00:55 UTC**: Automatic cache warming kicks in on all clients
2. **01:00 UTC**: Render maintenance starts
   - ✅ Users see yellow maintenance banner
   - ✅ API calls fail → fallback to cached data
   - ✅ Users can view profile, leaderboard, activity (cached)
   - ❌ Can't claim missions, check-in, trade (disabled)
3. **02:00 UTC**: Maintenance ends
   - Banner disappears automatically
   - API calls resume
   - Everything works normally

**User impact: Minimal.** Most users won't notice anything except the banner.

---

## FAQ

**Q: What if a user isn't in the maintenance banner time zone?**  
A: The banner uses UTC, so it shows 01:00-02:00 UTC regardless of user timezone.

**Q: What if cache is too old?**  
A: Cache timestamp is stored. You can show "cached data" indicator if > 30 min old.

**Q: Can users still open/close positions during maintenance?**  
A: No, trades go through backend API which is down. Frontend can optionally show error message.

**Q: What if user closes browser before cache warms?**  
A: Cache warming is auto-triggered 5 min before. If they return during maintenance, fallback works. If after, fresh data loads.

**Q: Do I need Cloudflare or read replica?**  
A: No, for 30 min maintenance it's overkill. Cache + fallback is sufficient.

---

## After Maintenance (May 27, 02:05 UTC)

1. ✅ Verify backend responding
2. ✅ Check no data issues
3. ✅ Remove maintenance banner (auto-removes)
4. ✅ Clear cache if needed: `clearCache()` in console
5. ✅ Monitor for issues

---

## Rollback (if something breaks)

```bash
# On Render dashboard:
1. Click "Deployments"
2. Find pre-maintenance deployment
3. Click "Redeploy"
```

Or:

```bash
# Via CLI:
render deploy --version <previous-version-id>
```

---

## Questions?

See full strategy in `MAINTENANCE_STRATEGY.md`

Let's make this launch smooth! 🚀
