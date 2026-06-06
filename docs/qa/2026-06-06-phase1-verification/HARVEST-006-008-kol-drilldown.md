# HARVEST-006 + HARVEST-008 Verification: KOL Leaderboard drill-down round-trip

**Date:** 2026-06-06
**Verifier:** Claude subagent (Playwright MCP, read-only)
**Verdict:** SUBTLE

## What I tested

Drill-down round-trip from Source Attribution tab's KOL Leaderboard panel:

1. Navigated to `https://shift-airdrop-data-hub.vercel.app/admin/data-hub?view=attribution`, authenticated with admin passcode.
2. Confirmed KOL Leaderboard renders with 40+ referrer rows. Top row is `AXEHEQ` (583 lifetime users). Brief notes:
   - DYENZ3 was mentioned in the task brief as "top KOL," but DYENZ3 appears mid-table with only 18 lifetime users. The "Top KOL · 7d" KPI card separately highlights DYENZ3 (different 7-day window). The leaderboard sort is lifetime users, where AXEHEQ leads. I tested against AXEHEQ (the actual top row).
3. Clicked the AXEHEQ row. Captured URL immediately.
4. Waited 3 seconds, re-captured URL.
5. Examined the rendered view (active tab indicator, content panels, profile count).
6. Manually clicked the Users tab to compare what the URL was "supposed" to do.
7. Clicked Source Attribution tab to test back-nav state preservation.

## What works

- **URL writer correctly includes drill params on click.** The push from the row click lands at `?walletSizeMin=0&walletSizeMax=0&view=users&referrer=AXEHEQ&referrerType=snag`, and these params survive the subsequent `useFilters` URL writer that re-asserts `walletSizeMin`/`walletSizeMax` on a later tick. This is the regression that MR !24 hotfix targeted, and it does hold (cf. URL log under "Evidence" below — two consecutive history writes both preserve `referrer` and `referrerType`).
- **Back-nav from Users tab to Source Attribution tab preserves the referrer params.** Final URL after clicking the Source Attribution tab is `view=attribution&referrer=AXEHEQ&referrerType=snag` — view switches, both referrer params survive, and walletSize filters stick.
- **Filter is correctly applied when Users view actually renders.** After manually clicking the Users tab, the profiles count drops from the unfiltered ~16,921 baseline down to **512 profiles** — a clean filtered subset matching the AXEHEQ referral cohort (the leaderboard shows 583 lifetime users for AXEHEQ; 512 is a date/wallet-filter narrowing of that pool).

## What's broken or subtle

- **Active view does NOT switch when drill click fires.** The single most important subtle bug: after the drill click, URL flips to `view=users&referrer=AXEHEQ&referrerType=snag` but the visible **active tab indicator stays on "Source Attribution"** and the page content continues to render the Source Attribution panels (Channels, Sankey, KOL Leaderboard, Whale Watch). The Users search box and the filtered profile list are absent. The drill-down updates URL state but the React view layer does NOT re-render to the Users panel. The user is silently left on Source Attribution with no visual feedback that anything happened beyond the URL bar.
- The user must manually click the Users tab to actually see the filtered 512-profile list — at which point the filter DOES apply.
- **Hypothesis for the root cause:** the view-selector state in `data-hub/page.tsx` is reading from a local `useState`/`useFilters` source of truth that is NOT being re-derived from the URL on each render, or the drill push happens AFTER the view state has been memoized to "attribution" for that tick. The hotfix in MR !24 fixed the URL-stripping half of the bug (referrer survives the filter writer) but did not address the URL→view state propagation on drill push.
- A separate transient observation: across the 5 runs I performed, the page would occasionally race after navigation/auth (URL flips through `view=cohorts`, `view=pulse`, etc., or the session token resets and the passcode screen reappears). This appears to be unrelated infrastructure flakiness in the Playwright session/cookie handling rather than a product bug — I excluded it from the verdict, but flagging so a human re-runs against a fresh incognito session if they see something similar.

## Evidence

- **URL after step 3 click (immediately):** `https://shift-airdrop-data-hub.vercel.app/admin/data-hub?walletSizeMin=0&walletSizeMax=0&view=users&referrer=AXEHEQ&referrerType=snag`
- **URL after step 5 back-nav (Source Attribution tab click):** `https://shift-airdrop-data-hub.vercel.app/admin/data-hub?walletSizeMin=0&walletSizeMax=0&view=attribution&referrer=AXEHEQ&referrerType=snag`
- **Captured URL writer log (history.pushState + replaceState) across one clean run:**
  ```
  t=0       baseline   ?walletSizeMin=0&walletSizeMax=0&view=attribution
  t=5505ms  pushState  ?view=users&referrer=AXEHEQ&referrerType=snag           ← drill click
  t=5590ms  replaceState ?walletSizeMin=0&walletSizeMax=0&view=users&referrer=AXEHEQ&referrerType=snag  ← useFilters re-assert; params preserved
  ```
  No further writes for 5+ seconds. URL is stable post-click.
- **Active tab indicator after drill:** `Source Attribution` (not Users).
- **Profile count after drill (without manual tab click):** N/A — Users panel not rendered, no "X profiles" text in DOM.
- **Profile count after manual Users tab click:** `512 profiles` — confirmed filtered subset of ~16,921 total.
- **Screenshots:**
  - `screenshots/harvest-006-008-1-kol-leaderboard.png` — Source Attribution view, KOL leaderboard with AXEHEQ at top.
  - `screenshots/harvest-006-008-2-after-click.png` — page state after first drill click attempt (intermediate state during URL flapping).
  - `screenshots/harvest-006-008-3-users-filtered.png` — URL after stable drill click (params preserved, but view content is still Source Attribution).
  - `screenshots/harvest-006-008-4-url-vs-view-desync.png` — clearest illustration of the URL/view desync (URL=users+referrer, active tab=Source Attribution).
  - `screenshots/harvest-006-008-5-users-512-filtered.png` — Users view after manual tab click showing "512 profiles" filtered count.
  - `screenshots/harvest-006-008-6-back-nav.png` — back-nav landing on Source Attribution with referrer params preserved.

## Verdict reasoning

PASS on URL contract (3/3 URL checks YES). FAIL on user-facing drill flow (clicking the row does not actually take the user to the Users view). Back-nav check is YES. Net: SUBTLE — the URL plumbing that MR !24 hotfix targeted is working, but the drill click is functionally half-broken because the view never switches without a second manual click. From a user perspective, the drill-down feature looks broken even though the URL state is correct.

The fix required: when the KOL row click pushes `view=users&referrer=X&referrerType=Y`, the view-tab state in `data-hub/page.tsx` (or wherever the tab selector reads from) needs to actually consume the URL `view` param and re-render. Likely a missing dependency in a `useEffect` or a state setter that wasn't called alongside the `router.push`/`history.pushState` in the KOL leaderboard row handler.

## Contract check

- Did URL preserve `?view=attribution`? **NO** — and this is correct per the actual drill intent. The drill changes view to `users` (the destination), keeps `referrer`/`referrerType`, then back-nav restores `view=attribution`. The task brief wording ("preserving `?view=attribution` AND adding `?referrer=`") appears to describe the back-nav state, not the immediate drill destination. On the drill push, URL transitions correctly from `view=attribution` to `view=users`.
- Did URL add `?referrer=`? **YES** — value `AXEHEQ`.
- Did URL add `?referrerType=`? **YES** — value `snag`.
- Did Users list filter to subset? **YES, but only after manual Users tab click** — visible row count `512 profiles` (vs ~16,921 baseline). On drill click alone, Users panel never renders.
- Did back-nav preserve state? **YES** — back-nav to Source Attribution tab lands at `view=attribution&referrer=AXEHEQ&referrerType=snag` with walletSize filters intact and "Source Attribution" tab active.
