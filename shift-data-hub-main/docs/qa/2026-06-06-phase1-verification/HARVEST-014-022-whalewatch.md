# HARVEST-014 + HARVEST-022 Verification: Whale Watch live + IdentityCard drill

**Date:** 2026-06-06
**Verifier:** Claude subagent (Playwright MCP, read-only)
**Verdict:** SUBTLE

## What I tested

1. Navigated to https://shift-airdrop-data-hub.vercel.app/admin/data-hub
2. Authenticated with passcode `ShiftRwa2026@@$$Key` (auth prompt appeared after one session expired)
3. Landed on Source Attribution tab and located the Whale Watch SSE ticker panel
4. Inspected the live LIVE badge / "Connection status: live" aria-label
5. Captured initial row count
6. Waited ~30s and re-inspected for SSE liveness
7. Clicked the first whale row link to drill to IdentityCard (HARVEST-022)
8. Also navigated directly to `?view=users&wallet=<full_wallet>` to test deep-link drill
9. Clicked an arbitrary user row in the Users tab to confirm IdentityCard can render

## What works

- **Whale Watch panel renders on Source Attribution tab** with the heading "WHALE WATCH" and subtitle "Position opens ≥ $1,000".
- **SSE liveness signal is positive**: the panel shows a green LIVE badge and the connection-status indicator has `aria-label="Connection status: live"` (ref captured in early snapshot). The badge persisted across multiple page loads.
- **Two whale events rendered** in the stream (steady across reloads):
  - `DYEnz3zX...A6U9` — direct · TSL2L · $1.2K · OPEN · 263–264h ago
  - `CTpQGUTh...uFE2` — direct · TSL1S · $1.5K · OPEN · 196h ago
- **No SSE errors in the console.** The only console errors are unrelated Vercel Web Analytics 404s.
- **IdentityCard renders correctly when a user row is clicked from the Users tab.** The right pane fills in with:
  - PRIMARY WALLET header (`FV7rZokfAeNM...jaxG`), display name placeholder, last seen
  - IDENTITY section with action buttons: **Add Link**, **Merge**, **Primary** (the spec called it "Set Primary" — UI label is "Primary")
  - Identity links table: TYPE | VALUE | CONF | LINKED columns with a "wallet" row
  - SOURCE ATTRIBUTION (First touch / Last touch sub-sections)
  - LIFETIME STATS, TIMELINE with "Wallet Connect" event and "Load older entries"

## What's broken or subtle

1. **HARVEST-022 row → IdentityCard drill is broken — link href uses wrong query param.**
   Whale Watch rows are anchor links with `href="/admin/data-hub?tab=users&wallet=<full>"`. The route reads `view=users`, not `tab=users`. Clicking a whale row results in:
   - `tab` param ignored, falls back to default Pulse view (`view=pulse` written back to URL)
   - `wallet` param dropped on next router state sync
   - User never lands on Users tab and IdentityCard never renders
   This is the exact HARVEST-022 contract failure. The fix is one-line: change `tab=` → `view=` in the Whale Watch row link generator (likely in the Source Attribution / Whale Watch component).

2. **`view=users&wallet=<wallet>` deep link does not auto-select the wallet either.**
   Even when correctly using `view=users`, the `wallet=` query param is stripped on first render (URL becomes `?walletSizeMin=0&walletSizeMax=0&view=users`) and the right pane shows "Select a user — Pick a row from the list to inspect identity, attribution, and timeline." The Users tab does not honor an inbound `wallet=` deep link. So even if HARVEST-022 fixes `tab` → `view`, the wallet still won't auto-open without a separate fix.

3. **Page auto-cycles between Pulse / Source Attribution / Trader Cohorts views via full navigation.** During testing, the URL would full-reload to a different `view=` every ~10–30s, even on idle. This is independent of the verification but it interfered with capturing consistent state, and is worth flagging as a UX concern.

4. **`droskou75` profile not reachable** because the Users tab filter only exposes a name/social-handle UI; we could not navigate to a specific user by name without the wallet drill working. (Did not block verification — used the rendered list rows instead.)

## Evidence

- **SSE state:** ALIVE — `aria-label="Connection status: live"`, LIVE badge present, 2 whale events streamed.
- **Console messages:** No SSE errors. Only noise was the Vercel Web Analytics 404 (`/_vercel/insights/script.js`) which is unrelated.
- **Screenshots:**
  - `./whalewatch-initial.png` — first authenticated landing on Source Attribution showing Whale Watch LIVE with 2 rows
  - `./whalewatch-live.png` — full Source Attribution page after re-auth, Whale Watch LIVE with same 2 rows
  - `./identitycard-render.png` — Users tab with IdentityCard fully rendered (right pane) after clicking a row directly
  - `./whalewatch-attribution.png` — earlier capture while page was auto-cycling
- **Captured whale links (with bug):**
  - `https://shift-airdrop-data-hub.vercel.app/admin/data-hub?tab=users&wallet=DYEnz3zX2kwGpQss92dKmKQ3FJTGhn2mbRsXehb9A6U9`
  - `https://shift-airdrop-data-hub.vercel.app/admin/data-hub?tab=users&wallet=CTpQGUThFvWPvBp7d9uSufZBp2dFGCmWhfPzLWuYuFE2`

## Verdict reasoning

- **Whale Watch SSE infrastructure (HARVEST-014)** is **working** — the ticker connects, the LIVE indicator shows green, real events render, and no SSE errors appear in console. PASS for this half.
- **Row drill to IdentityCard (HARVEST-022)** is **broken at two layers**:
  1. The drill link uses the wrong query param name (`tab=` instead of `view=`), so clicks land on Pulse.
  2. Even with `view=users&wallet=<wallet>`, the wallet param is stripped and IdentityCard does not auto-open from URL.
- IdentityCard itself renders fully when a row is clicked from inside the Users tab — so the component and data layer are healthy. The contract failure is purely in the drill plumbing.
- Net: **SUBTLE** — SSE works and IdentityCard works, but the row → IdentityCard drill claimed by HARVEST-022 does not.

## Contract check

- Whale Watch SSE connecting? **YES** — green LIVE badge, `aria-label="Connection status: live"`, real events streaming, no SSE errors.
- Drill from row to IdentityCard? **NO** — link uses `tab=users` instead of `view=users`; clicking a whale row navigates to default Pulse view with both `tab` and `wallet` params lost.
- IdentityCard renders identity links table? **YES** — when a row is clicked from inside the Users tab, the right pane renders full IdentityCard with primary wallet header, links table, header actions (Add Link / Merge / Primary), Source Attribution, Lifetime Stats, and Timeline.
