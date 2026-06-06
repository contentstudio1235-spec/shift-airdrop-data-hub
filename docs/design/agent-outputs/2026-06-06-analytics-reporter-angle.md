# Analytics Reporter Angle — Hub Audit v2

**Date:** 2026-06-06
**Agent:** Analytics Reporter
**Reframe:** The unit of audit is **decisions**, not displayed numbers. A KPI that drives no decision is decoration; a decision with no trustworthy KPI is a meeting-killer. Trust budget gets spent on decision-serving metrics first, in proportion to dollar stakes — not evenly across 150 cells.

---

## 1. Decisions Inventory

Eight decisions marketing + management will actually make on this Hub. Each has a named decider, a cadence, a numeric threshold, and an action. Anything vaguer than this doesn't belong on the Hub — it belongs in a notebook.

| # | Decision | Decider | Cadence | Threshold | Action |
|---|---|---|---|---|---|
| D1 | **Cut / scale a KOL or paid channel** | Marketing lead | Weekly (Mon AM) | 7d holder-rate < 3% AND ≥30 signups attributed → cut. ≥6% AND ≥50 signups → 2× budget. | Pause campaign in ad platform, reassign budget |
| D2 | **Trigger a re-engagement push to a cohort** | Marketing lead | Weekly | Week-4 retention < 25% for a cohort with ≥100 signups → email + Snag XP boost | Schedule send via Snag, target cohort wallets |
| D3 | **Fix the worst funnel leak this sprint** | Founder + Eng lead | Bi-weekly | Stage with largest absolute revenue-impact estimate (≥$X) AND ratio dropped ≥3pp WoW | File ticket, assign sprint capacity |
| D4 | **Confirm/deny an anomaly (real signal vs data glitch)** | Founder | Daily (AM scan) | Any red-tier anomaly (stitch drop ≥5pp, whale surge ≥3σ, direct surge ≥2× 7d-median) | Open reconciliation playbook; only escalate after pass |
| D5 | **Open a high-touch concierge convo with a whale candidate** | Founder / BD | Daily | New wallet opens ≥$5k OR cumulative lifetime ≥$25k AND any social link (X/Discord/TG) present | DM via linked channel, log in Notion CRM |
| D6 | **Approve a new UTM campaign / reject a violator** | Marketing lead | On-demand (≤24h SLA) | Violation = campaign not in approved list OR malformed source/medium pair | Add to approved list OR reject + notify creator |
| D7 | **Greenlight / kill a token series based on cohort traction** | Founder | Monthly | Cohort lifetimeVolume / signup < $X for 2 consecutive cohorts on same asset | Decision memo on listing continuation |
| D8 | **Brief management on quarterly health (board / investor)** | Founder | Quarterly | N/A — reporting decision, not threshold | Snapshot 6 numbers: registered, holders, AUM, 30d AUM Δ, blended CAC-by-source, retention curve |

Eight is the right count for a project this size. Anything past 8 is either a sub-question of one of these or a "nice to know" that doesn't pay rent.

---

## 2. Decision → Metric Mapping

For each decision, the metrics that drive it — cross-referenced against the existing Hub KPI inventory.

| Decision | Primary metric(s) | Already in Hub? | Gap / waste flag |
|---|---|---|---|
| D1 (cut/scale) | 7d holder-rate per source, 7d signup volume per source | KOL leaderboard has `holderRate`, `users`. But window is unclear (`firstSeen`/`lastSeen` suggest lifetime, not 7d). | **GAP**: explicit "last 7d" window per source. Today it's ambiguous. |
| D2 (re-engagement) | Cohort wk-4 retention, cohort size | Trader Cohorts: `retentionWeek4`, `size` | ✅ Covered |
| D3 (funnel fix) | Funnel stage ratios, biggest-leak revenue impact | Funnels view has both | ✅ Covered — but trust must be airtight (D3 spends real eng capacity on its output) |
| D4 (anomaly) | 3 anomaly checks on Pulse | Pulse has them | ✅ Covered |
| D5 (whale outreach) | Whale Watch SSE (≥$1k opens), IdentityCard link types, lifetime volume | Users view + Whale Watch + IdentityCard | ✅ Covered — but the $1k threshold on display vs $5k/$25k decision threshold is a mismatch worth surfacing |
| D6 (UTM governance) | violations count, approved values, campaigns table | UTM Governance view | ✅ Covered |
| D7 (token greenlight) | Cohort lifetimeVolumeUSD per cohort, segmented by asset | Trader Cohorts has lifetimeVolume but **not** segmented by asset | **GAP**: per-asset cohort breakdown |
| D8 (quarterly brief) | registeredUsers, activeHolders, aumUSD, 30d AUM trend, blended CAC by source, retention curve | Pulse covers 4; blended CAC + retention curve need synthesis | **GAP**: CAC requires spend data the Hub doesn't have. Either add a manual spend input or scope D8 to non-CAC framing. |

### Waste — metrics that drive NO decision

These either get demoted out of Pulse/Funnels into an "Engineering" or "Diagnostics" tab, or get killed outright:

- **`stitchPct`** on Pulse and per-cohort — an engineering hygiene metric, not a marketing decision. Move to Engineering tab as an SLO. (Exception: D4 anomaly check on stitch drop stays.)
- **`openWhalesCount` (Δ24h)** — interesting but no one acts on the count itself. They act on individual whales via D5. Demote to Whale Watch context, not a hero KPI.
- **`activations24h`** on Pulse — same data is implied by the funnel; redundant hero card.
- **Whale Origin Sankey** — high cognitive load, low decision support. No one is going to cut a budget because the Sankey looks weird. Demote or kill.
- **8-column KOL leaderboard** — too wide. Decisions D1 needs 3 columns (source, 7d signups, 7d holder-rate). The other 5 are diagnostic; collapse to expandable detail.

### High-leverage metrics (drive multiple decisions)

These are the ones whose trust is load-bearing:

- **`holderRate` per source** — drives D1, informs D7, used in D8 indirectly. **Top trust priority.**
- **`lifetimeVolumeUSD` per user and per cohort** — drives D5, D7, D8. **This is the metric that just shipped the 7× bug.** Highest trust priority.
- **Funnel stage counts** — drive D3 directly and inform D8. High priority.
- **Signups by source (24h / 7d)** — drives D1, anomaly D4 (direct surge), and D8.

---

## 3. Trust Audit Prioritization (decision-weighted)

Priority score = (# decisions served) × (decision cadence weight: daily=3, weekly=2, monthly=1) × (dollar stakes 1–3 where 3 = capital reallocation or capacity).

### Top 10 — audit within 1 week of v2 ship

| # | Metric | Decisions | Score | Canonical SQL sketch | Reconciliation pattern | Variance threshold |
|---|---|---|---|---|---|---|
| 1 | **`users.lifetimeVolumeUSD`** (detail) | D5, D7, D8 | 18 | `SUM(positions.position_size_usd) WHERE wallet = X AND status IN ('open','closed')` | Cross-check vs Users listing's `volume` column AND vs sum of per-position rows in detail view. **The bug that just shipped.** | Financial: <0.1%, hard |
| 2 | **`listing.lifetimeVolumeUSD`** (Users list column) | D5, D8 | 18 | Same SUM, joined to user list (NO row-multiplying join on stitched identities) | Per-row equality with `users.lifetimeVolumeUSD` detail. Diff > $0.01 → block ship. | <0.1% |
| 3 | **`holderRate` per source** (KOL/UTM) | D1, D7, D8 | 18 | `holders_count / users_count WHERE first_seen_source = X AND first_seen >= NOW() - 7d` | Manual SQL audit against `users` table grouped by source vs displayed cell. Spot-check 3 sources. | Percentage: ≤0.5pp |
| 4 | **Funnel stage counts** (5 stages) | D3, D8 | 15 | One CTE per stage with explicit definitions of Registered / Linked / Opened / Holder / Long-term. Document each predicate. | Adjacent-stage diff = leak count; total Stage-1 must equal `registeredUsers` Pulse card | User metric: <2% |
| 5 | **`registeredUsers`** + `Δ24h` | D8, anomalies | 12 | `COUNT(*) FROM users` and `WHERE created_at >= NOW() - 24h` | Must equal the Stage-1 funnel count exactly. Δ24h must equal yesterday's value minus day-before. | <2%, Δ exact match |
| 6 | **`activeHolders`** + `Δ24h` | D8, D5 | 12 | `COUNT(DISTINCT wallet) FROM positions WHERE status = 'open'` | Cross-check vs on-chain holder count from `/onchain-holders` endpoint. Variance > 2% = identity-stitching issue. | <2% (off-chain) / <5% (vs on-chain) |
| 7 | **`aumUSD`** + 30d sparkline | D8 (board) | 12 | `SUM(position_size_usd) WHERE status='open'` at point-in-time | Sparkline endpoint vs point-in-time card. Sparkline today = card today. | Financial: <0.1% |
| 8 | **`signupsBySource24h`** | D1, D4 anomaly | 12 | `COUNT(*) GROUP BY first_seen_source WHERE created_at >= NOW() - 24h` | Sum of all source counts must equal Pulse `registeredUsers Δ24h`. Hard equality. | Exact (count) |
| 9 | **Whale Watch position events** | D5 | 9 | Stream of `positions` rows where `position_size_usd >= 1000` and `status_changed_to = 'open'` | Replay 24h of Whale Watch events vs `SELECT FROM positions WHERE opened_at BETWEEN ...`. Counts must match. | Behavioral: <5%, but missing events on D5-eligible whales = block |
| 10 | **Cohort `retentionWeek4`** | D2, D7 | 9 | `COUNT(active in week 4) / COUNT(in cohort)` with explicit "active" definition | Recompute for 2 historical cohorts in a notebook; compare to displayed value. | ≤0.5pp |

### Bottom 50 — defer or never

Things like Sankey link weights, IdentityCard confidence sub-scores, GA4 page-view counts, KOL leaderboard columns 5–8, per-cell shading on the cohort heatmap — these can wait. The cost of a wrong number here is "Tomer raises an eyebrow," not "marketing spends $5k on the wrong channel."

The v1 plan's instinct to audit 150 cells is the analytical equivalent of grep-spraying for bugs: thorough, expensive, low-yield. **Trust budget is finite; spend it on the 10 metrics where being wrong costs money.**

---

## 4. KPI Hygiene Principles

Five principles. Each is an enforceable rule, not a nice-to-have.

1. **Every displayed KPI declares its time window in the label, not just the tooltip.** "Signups (24h)" not "Signups." "Holder rate (last 7d)" not "Holder rate." The row-multiplication bug was downstream of "lifetime volume" meaning two different things in two places — name it once, name it the same.

2. **Every KPI that drives a decision (D1–D8) has an automated reconciliation test that runs on every deploy.** The 10 metrics in section 3 each get a test that compares the production endpoint output to a canonical SQL recomputation within the metric's variance threshold. Test failure blocks deploy. This is the row-multiplication bug's antibody.

3. **Every KPI has a named owner in a `kpis.yaml` registry.** Fields: name, SQL, decision served (D1–D8), variance threshold, owner, last-audited date. If a KPI has no decision-served entry, it has 30 days to acquire one or it gets removed. This is how Hub bloat dies.

4. **Every delta (Δ24h, Δ7d, WoW) shows the snapshot baseline.** "+47 (vs 2026-06-05 23:59 UTC)" — not "+47 ▲". When Tomer's PT clock disagrees with management's ET clock, the snapshot tells them whether the disagreement is the data or the timezone.

5. **No KPI ships to a customer-facing Hub view (marketing or mgmt) without a reconciliation against a second source.** Second source = different endpoint, manual SQL, or on-chain query. Pulse → reconciled vs Funnels Stage-1. Active holders → reconciled vs on-chain. Lifetime volume → reconciled vs per-position sum. If you can't name the second source, the KPI stays in an "Engineering / Diagnostics" tab marked unverified.

---

## Stop / Continue / Watch

- **Stop**: Auditing all ~150 displayed numbers. Stop demoting decisions to "track" or "monitor." Stop hero-billing engineering hygiene metrics (`stitchPct`) to marketing.
- **Continue**: The anomaly checks on Pulse — they map directly to D4 and they're the only thing currently catching the "is this real?" question.
- **Watch**: How many of D1–D8 actually fire in the first month. Decisions that never fire after 30 days either had the wrong threshold or weren't real decisions. Re-scope on the next iteration.
