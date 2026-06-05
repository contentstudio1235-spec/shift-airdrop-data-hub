# Session Handoff — 2026-06-05

**Status:** All work shipped to prod. UTM Phase A live. Pulse default landing. Cohorts/Funnels/Sources/Users polished. Engineering view has UTM Governance.

**Test counts:** Backend 168/168, Frontend 123/123 + 5 RegisterContent. All green.

---

## MRs shipped this session (10 total)

| # | Title | Notes |
|---|---|---|
| !11 | 4 user-reported bugs | IdentityCard field remap, GA4 fields, hasSocial filter, tab persistence |
| !12 | URL nav loop hotfix | useFilters + UsersView were stripping ?view= |
| !13 | Phase 1 IA polish | TabHeader, AnomalyCallout primitive, Engineering gear demote |
| !14 | Phase 2 Pulse | Default landing, 6 KPIs Δ24h, /api/pulse/snapshot |
| !15 | Phase 3 polish | Cohorts real, Funnels leak callout, Sources 3 KPIs, Users badge |
| !16 | Skills audit fixes | 3 stitch metric renames, Funnels revenue impact, Cohorts confidence gates |
| !17 | UTM Phase A | Middleware + validation + violations log + campaigns log + admin panel |
| !18 | Hotfix useUtmViolations poll loop | Date.now() in render-time deps |
| !19 | Hotfix migration 021 backticks | Migration runner ;-splitter trap |
| !20 | Hotfix migration 021 kol-seed semicolons | Same splitter trap, second instance |

---

## Where the Hub is now

```
Pulse (default)  →  Funnels  →  Source Attribution  →  Trader Cohorts  →  Users   |  Engineering (gear)
```

- **Pulse:** Has anything material changed in last 24h? — 6 KPIs Users/Holders/AUM/IdentityLinks/Activations24h/OpenWhales, Δ24h chips, 30d AUM sparkline, signups by source, whale activity feed, anomaly callouts
- **Funnels:** Where do users drop off? — Biggest-leak AnomalyCallout w/ revenue impact (~$92K opportunity), filter-aware copy
- **Source Attribution:** Which channels bring users worth keeping? — 3 Level-1 KPI cards (Best ROI / Top KOL 7d / Attribution Signal), Sankey, KOL leaderboard, Whale Watch SSE
- **Trader Cohorts:** Are recent cohorts better? — 12 weekly cohorts, sortable, confidence gates (<100 users grayed, "Insufficient signal" trend), W1/W4 retention + heatmap
- **Users:** Inspect any user — 11-col list w/ hasSocial backend filter, IdentityCard w/ Fully Stitched / 6/7 badge
- **Engineering → UTM:** Campaign Builder dialog + violations log + campaigns table + approved values reference

---

## UTM convention LOCKED — use these URLs starting today

### Cheat-sheet templates

**Paid X/Twitter ad**
```
https://shiftrwa.xyz/register?utm_source=twitter&utm_medium=paid-social&utm_campaign={program}-{purpose}-2026q2&utm_content={creative-id}-v{N}
```

**Sponsored content** (HackerNoon, CoinDesk, newsletters, podcasts)
```
https://shiftrwa.xyz/register?utm_source={publisher}&utm_medium=referral&utm_campaign={program}-{purpose}-2026q2&utm_content={placement}
```

**KOL personal post** — per-creator goes in `utm_source`, NOT buried in `utm_content`
```
https://shiftrwa.xyz/register?utm_source={kol-handle}&utm_medium=kol&utm_campaign={program}-{purpose}-2026q2&utm_content={content-type}
```

### Approved values

**utm_medium (9, locked):** `cpc`, `paid-social`, `social`, `referral`, `email`, `kol`, `affiliate`, `qr`, `display`

**utm_source (12 seed, expand via PR):** `coingecko`, `coinmarketcap`, `direct`, `discord`, `hackernoon`, `linkedin`, `medium`, `reddit`, `snag-referrals`, `telegram`, `twitter`, `youtube`

**Campaign:** `{program}-{purpose}-{YYYYQX}` — lowercase, hyphens only, `/^[a-z0-9-]+$/` enforced.

To add a new source: PR to `docs/design/2026-06-05-utm-attribution-a-to-z.md` updating section D + migration adding the row to `utm_approved_sources`.

### Builder dialog
Hub → Engineering gear → UTM sub-tab → "+ Add Campaign". 3 template buttons pre-fill paid-twitter / sponsored / kol shapes. Live URL preview + copy button.

---

## Pending for next session

### Hub Phase 4 (audit-prioritized — F1 + drill-downs first)
- **F1: Funnel time-window selector** (7d/30d/90d/all, default 30d) — current 97% leak is partly all-time artifact
- **Drill-downs**: Sankey-node-click → Users by source, WhaleWatch row click → profile, Funnel Investigate → stage filter
- **C3: Per-cohort topSource column** — answers "Snag cohorts retain better than Direct?"
- **R2: Metric definitions appendix** — single canonical reference doc

### UTM Phase B
- GA4 custom channel group for `kol` medium
- Vanity URL redirect system (optional)

### UTM Phase C
- Sources tab: rename "Direct" → "Unattributed", add violations indicator
- Tweak Pulse "100% direct" anomaly using new bucketing
- D1: Backfill utm_violations with retroactive analysis of historical first_utm_source pollution

### Reviewer deferred items (technical debt)
- **SQL-aware migration splitter** — proper fix for the brittle naive `;` splitter. Bit us TWICE on MR !17 (backticks in comments, then semicolons in seed strings)
- `formatSource` helper duplicated between FunnelsView and AttributionView → lift to `frontend/lib/sources.ts`
- KPICard widening to accept string values (currently SourceKPI is a local variant)
- `holdings_value` sortBy on frontend hook but not in backend `VALID_SORT_KEYS`
- countQuery in identityService doesn't include HAVING — total over-counts when sliders are used

### Open question for Tomer
Budget per campaign — is spend tracked somewhere I should pull into the campaign log so ROI = revenue / spend? Or tracked separately for now?

---

## Permanent rules saved to `~/Library/Mobile Documents/com~apple~CloudDocs/Claude/Memory/preferences.md`

1. **Standing prod-deploy authorization** — no per-action approval when work is obvious continuation + tests pass + reviewer approved
2. **ABSOLUTE RULE: Read the matching data-analytics-skills SKILL.md BEFORE designing analytics work** — funnel, cohort, retention, segmentation, metric, dashboard, KPI, time-series, A/B, EDA. Violation consequence: stop + rework + retroactive audit.

---

## Infrastructure gotchas to remember

1. **GitLab namespace migrated:** old `adrenaline187/shift-data-hub` → new `crypt0shmipt0/shift-data-hub`. Old URL returns 405 "moved projects" on writes.
2. **GitLab MR merge 405 retry pattern:** wait ~30s after `glab mr create` before `glab mr merge`. Pattern repeats every MR.
3. **Render service ID:** `srv-d861e6di849s738ah2kg`. Deploy via POST `https://api.render.com/v1/services/{id}/deploys`. Render boots from `dist/index.js` — sync dist/ on every backend PR.
4. **Migration runner is naive about `;`** — never put semicolons inside SQL comments, string literals, or backtick-quoted text. Use em-dashes for natural-language separators.
5. **Vercel scope:** `shift-93220717/shift-airdrop-data-hub` (NOT `tomer-warschauer-nunis-projects/frontend` which is a different test project). Production alias: `shift-airdrop-data-hub.vercel.app`.
6. **DB hostname:** `dpg-d86188egvqtc73e92fl0-a` — that's `fl0` (f-ell-zero), NOT `f10`.
7. **GA4:** OAuth refresh token ONLY. Service Account is dead.

---

## Code patterns learned the hard way

1. **Render-time-computed values in useEffect deps = infinite loop.** Specifically: `new Date()`, `Date.now()`, `Math.random()`, fresh object literals. Compute inside the effect callback, not at render time.
2. **Frontend↔backend contract drift class of bug.** When dispatching parallel backend+frontend agents, include the same response shape spec in BOTH prompts AND require at least one integration test that round-trips the contract.
3. **Postgres SELECT aliases need double quotes** to preserve case: `AS "utmSource"` not `AS utmSource`.
4. **Reviewer "IMPORTANT pre-existing"** can still BLOCK current PR when the diff exposes the brittleness. Promote when the current changes touch the same surface.
5. **POST endpoints + middleware reading `req.query`** = silent no-op. Test the actual user flow (Playwright + DevTools Network) on day one.

---

## Skills installed

- **`~/.claude/skills/data-analytics-skills/`** — nimrodfisher/data-analytics-skills, 33 SKILL.md files in 6 categories
- **`~/.claude/skills/everything-claude-marketing/`** — brainbytes-dev/everything-claude-marketing, 30+ skills. UTM Phase A used `skills/marketing-ops/utm-tracking/SKILL.md`

---

## Quick test commands

```bash
# Backend health
curl -s https://shift-airdrop-backend.onrender.com/health

# UTM approved sources
curl -s -H 'x-admin-key: ShiftRwa2026@@$$Key' https://shift-airdrop-backend.onrender.com/api/utm/approved-sources

# Pulse snapshot
curl -s -H 'x-admin-key: ShiftRwa2026@@$$Key' https://shift-airdrop-backend.onrender.com/api/pulse/snapshot | python3 -m json.tool | head -30

# Cohorts snapshot
curl -s -H 'x-admin-key: ShiftRwa2026@@$$Key' https://shift-airdrop-backend.onrender.com/api/cohorts/snapshot

# Render deploy status (last 3)
curl -s -H 'Authorization: Bearer rnd_K0Jmmkrmf0f5OLGA9kyhfUKKQfFn' https://api.render.com/v1/services/srv-d861e6di849s738ah2kg/deploys?limit=3 | python3 -c "import json,sys; [print(x['deploy']['status'], x['deploy']['commit']['id'][:8]) for x in json.load(sys.stdin)]"

# Vercel deploys
cd frontend && npx vercel --scope shift-93220717 ls shift-airdrop-data-hub | head -5
```

---

End of handoff. Auto-captured observations should flow into the shared Chroma pool via the claude-mem worker. This doc is the structured artifact backup.
