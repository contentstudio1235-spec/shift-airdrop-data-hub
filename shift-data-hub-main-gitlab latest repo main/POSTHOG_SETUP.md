# PostHog Analytics Setup

PostHog is integrated for product analytics, session recording, and user behavior tracking. This document explains how to set it up.

## 1. Create PostHog Account

1. Go to https://posthog.com/
2. Sign up (free tier available)
3. Create a project for SHIFT Airdrop

## 2. Get Your API Key

1. In PostHog dashboard → Settings → Project → API Key
2. Copy your Project API Key (starts with `phc_`)

## 3. Add to Frontend Environment

**In `frontend/.env.local` (local dev):**
```
NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_API_KEY_HERE
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**In Vercel Dashboard (production):**
1. Settings → Environment Variables
2. Add:
   ```
   NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_API_KEY_HERE
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```

## 4. Update PostHogProvider.tsx

Replace the placeholder key in `frontend/components/PostHogProvider.tsx`:

```tsx
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_YOUR_KEY', {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  loaded: (ph) => {
    if (process.env.NODE_ENV === 'development') ph.debug();
  },
});
```

## 5. Track Custom Events

Use the event tracking utilities in `frontend/lib/posthog.ts`:

```ts
import { trackEvent } from '@/lib/posthog';

// In your components:
trackEvent.walletConnected(wallet);
trackEvent.positionOpened('TSL2L', 5000);
trackEvent.missionCompleted('first_trade', 100);
trackEvent.badgeEarned('diamond_hands_7d', 'rare');
trackEvent.levelUp(3);
```

## 6. Key Events to Track

**Already integrated:**
- ✅ Page views (automatic)
- ✅ Wallet connection / disconnection
- ✅ Trading activity (positions opened/closed)
- ✅ Daily check-ins and streaks
- ✅ Mission completion and reward claims
- ✅ Badge earnings
- ✅ Level ups
- ✅ Referral activity
- ✅ Feature engagement (leaderboard, missions, badges)

## 7. PostHog Dashboard Features

Once set up, you'll have access to:

**Product Analytics**
- 📊 Event tracking and funnels
- 👥 User cohorts and retention
- 🔍 User journeys and flows
- 📈 Trends and breakdowns

**Session Recording**
- 🎥 Watch user sessions
- 🖱️ See clicks, scrolls, interactions
- 🐛 Debug issues

**Feature Flags**
- 🚀 A/B test gamification features
- 🎮 Slowly roll out new missions
- 🔧 Feature gates for experiments

## 8. Example Queries

**"How many users earned a badge today?"**
```
Events: badge_earned
Time: Last 24 hours
```

**"What's our mission completion rate?"**
```
Funnel: position_opened → mission_completed
Group by: $week
```

**"Which tokens get the most trading volume?"**
```
Breakdown: trade_initiated
By property: token
```

**"What's the conversion from referral share to actual referral?"**
```
Funnel: referral_code_shared → referral_completed
```

## 9. Privacy & Compliance

PostHog respects privacy:
- PII is not captured by default (e.g., full wallet addresses are truncated to first 8 chars)
- Self-hosting option available (EU/on-prem)
- GDPR compliant

If you need stricter privacy:
1. Self-host PostHog using Docker
2. Or use US PostHog with custom privacy settings

## 10. Troubleshooting

**PostHog not capturing events:**
- Check browser console for errors
- Verify API key is correct
- Ensure `NEXT_PUBLIC_POSTHOG_KEY` is set (must be public!)
- Check that component imports `trackEvent`

**Session recording not working:**
- Enable in PostHog Settings → Session Recording
- Allow recording in browser privacy settings

**High data usage:**
- Use session filters to exclude bots
- Set sampling for high-volume events (e.g., 10% of page views)

---

## Next Steps

1. ✅ Install PostHog (done)
2. ⏳ Get API key from PostHog
3. ⏳ Add env vars to Vercel
4. ⏳ Update PostHogProvider with real key
5. ⏳ Test events in PostHog dashboard
6. ⏳ Set up custom funnels/cohorts based on business goals
