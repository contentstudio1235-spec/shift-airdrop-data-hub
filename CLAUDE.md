# SHIFT RWA Data Hub — Claude Memory

## Project Context
SHIFT RWA is a Solana-based Real World Asset (RWA) trading platform with 6 leveraged tokens (TSL2L, TSL1S, SOX3L, SOX3S, SPX3S, SPX3L). The platform includes an airdrop program, loyalty system (via Snag), and a comprehensive admin data hub for cross-channel analytics.

## Architecture
- **Backend:** Node.js + Express + TypeScript → Render
- **Frontend:** Next.js 16 → Vercel
- **Database:** Postgres 18 on Render (NOTE: hostname contains `fl0` = f-ell-zero, NOT `f10`)
- **Blockchain:** Solana mainnet via Helius RPC
- **Loyalty:** Snag Solutions API
- **Analytics:** Google Analytics 4 (GA4) via OAuth refresh token

## Key Files
- `src/routes/analytics.ts` — GA4, KPIs, dashboard-stats, traffic
- `src/routes/admin.ts` — Admin dashboard, badges, certs, config (2635 lines)
- `src/db/pool.ts` — Postgres pool with SSL for Render
- `frontend/app/admin/data-hub/page.tsx` — The entire Data Hub UI (1022 lines)
- `frontend/components/DataHub/types.ts` — TypeScript interfaces

## Critical Rules
1. NEVER use PUT /env-vars on Render with partial set — it REPLACES ALL vars. Always send all 25.
2. DB hostname: `fl0` (f-ell-zero) NOT `f10`. Triple check.
3. GA4 Service Account auth DOES NOT WORK — Google blocks it. Use OAuth refresh token only.
4. Always `npx next build` locally before Vercel deploy (strict TypeScript).

## GA4 Auth
Uses OAuth2 refresh_token flow (not service account). The refresh token auto-renews access tokens.
Property ID: `536531221` (shiftrwa.xyz)

## Design System
- Background: `#030d0a`, panels: `rgba(8,18,14,0.9)`
- Accent: `#00c896` (neon emerald) — ONLY accent
- All styles inline — no Tailwind
- Glassmorphism with `backdrop-filter: blur(12px)`

## Full Handoff
See `../HANDOFF.md` (local file, not in git) for complete documentation including all env vars, credentials, and deploy commands.
