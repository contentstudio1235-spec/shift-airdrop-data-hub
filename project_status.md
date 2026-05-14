# Project Status: SHIFT Airdrop MVP

**Status**: 🟢 **Backend & Frontend MVP Complete, Preparing for Deployment**

## Overview
The logic for the SHIFT behavioral airdrop system is built and operational. We have successfully implemented the core features:
- Helius Webhook parsing for Jupiter swaps.
- Position tracking & anti-farming rules (24h hold, $50 min).
- XP Engine with time-based multipliers (capped at 3.0x).
- Badge Engine (First Trade, Diamond Hands, Earnings Reactor, FOMC Trader).
- SNAG integration using the External Rules API.
- Local PostgreSQL SNAG fallback queue (`snag_sync_queue`, `snag_failed_events`).
- Frontend Next.js Dashboard decoupled from SNAG, consuming our local API directly.

## Current Blocker
- **SNAG Integration "Locked Quest" Error**: The backend is successfully calling the SNAG API, but SNAG is returning a `Please complete other required rules to unlock this quest.` error. We have successfully bypassed this via the local fallback queue, so the frontend UI and progression engine remain 100% operational.

## Immediate Next Steps
1. Deploy the backend to Railway.
2. Deploy the Next.js Frontend Dashboard to Vercel.
3. Hook up the live Helius webhook to the Railway production URL.
4. Asynchronously resolve the SNAG Prerequisite rule in their dashboard.
