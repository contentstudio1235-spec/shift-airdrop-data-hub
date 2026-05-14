# SHIFT Airdrop MVP — Build Progress

## What we have built so far (Checked)
- [x] **Project Scaffolding**: Setup Node.js/TypeScript, Express, PostgreSQL pg pool.
- [x] **Database Schema**: Created tables for users, positions, badges, events, anti-farm log.
- [x] **Core Services**: 
  - [x] Jupiter Price Service (Fetch USD value at open)
  - [x] Position Service (Track opens, closes, calculate generated XP)
  - [x] Helius Webhook Handler (Parse raw Jupiter swaps)
  - [x] Anti-Farm Service (Minimum sizes, durations, dust filtering)
  - [x] XP Engine & Multiplier logic (Time-based growth)
  - [x] Badge Service (Awarding first trade, diamond hands, event trades)
  - [x] Event Service (Time windows for FOMC, CPI)
  - [x] SNAG Sync Service (Bridge to push points/badges to SNAG dashboard)
- [x] **API Routes**: Webhook ingestion, dashboard endpoints, admin endpoints.
- [x] **Cron Jobs**: Hourly/Daily calculations script.
- [x] **Environment Configs**: Mapped all SNAG IDs (Website, Org, External Rules).
- [x] **Local Testing**: Built `test-flow.ts` and `test-snag.ts` to simulate end-to-end flows.

## What is yet to be made (Unchecked)
# Phase 4: Local Testing
- [x] Run backend server locally
- [x] Run frontend Next.js server locally
- [x] Test end-to-end flow with a mock wallet

# Phase 5: Production Deployment
- [ ] Deploy backend to Railway.
- [ ] Deploy frontend Next.js to Vercel.
- [ ] Hook up live Helius webhook to the Railway production URL.
- [ ] Asynchronously resolve SNAG Prerequisite rule.
- [x] **Frontend Dashboard Foundation**: Initialize the Next.js app for `airdrop.shift.xyz`.
- [x] **Frontend Dashboard Integration**: Connect the dashboard to SNAG (for leaderboards/xp) and our backend (for active positions).
- [x] **Frontend UI/UX**: Build the actual dashboard UI emphasizing progression and momentum.

# Phase 6: Brand Alignment & Integration
- [x] **Brand Refresh**: Update dashboard colors and theme to match `shiftrwa.xyz/rewards`.
- [x] **Card UI Refresh**: Implement horizontal quest-style cards for active positions.
- [x] **Widget Mode**: Add `?embed=true` support to hide headers and adjust padding for iframe embedding.
- [x] **Unified Sync**: Fetch total SNAG points in dashboard for a "single source of truth" view.
- [x] **Embedding**: Deploy and provide iframe snippets for the main website integration.
- [ ] **Production Verification**: Confirm all hooks and API points are working in prod.
