# HARVEST-016 Verification: Pulse 3-KPI hero

**Date:** 2026-06-06
**Verifier:** Claude subagent (Playwright MCP, read-only)
**Verdict:** FAIL

## What I tested

Navigated to `https://shift-airdrop-data-hub.vercel.app/admin/data-hub` (Pulse is the default tab — confirmed via `?view=pulse` in the URL). Captured the three hero KPI cards now displayed (Phase 2.1 dropped the previous 6-card grid to 3). For each card I recorded the exact label, value, delta string, and the `metric_id` exposed via the per-card `aria-label="Flag <metric_id> for review"` flag button. Then I judged each card against M1's hypothesized 9am questions (per-channel CAC / holder-rate, UTM coverage status, biggest funnel leak).

## The 3 cards (verbatim)

| # | Label | Value | metric_id (DOM-confirmed) | Answers M1 question? |
|---|---|---|---|---|
| 1 | REGISTERED USERS | 16,921 | `pulse.registeredUsers` | NO — vanity total. M1 doesn't ask "how many users total?"; he asks "what did the last $X of spend buy me?" |
| 2 | ACTIVE HOLDERS | 484 | `pulse.activeHolders` | NO — denominator-only. Holders alone is not CAC, not channel-attributed, and not a leak signal. Closer to an X1 (product/retention) lens. |
| 3 | AUM | $23.0K | `pulse.aumUSD` | NO — treasury/financial lens, not acquisition. M1 doesn't optimize against AUM; that's a CFO/X1 number. |

All three card deltas are 24h-only ("+207 (+1.24%) up vs 24h ago"). Sub-grid below the hero shows AUM 30d sparkline, "Signups by source (24h)" (which currently reads 207 unattributed to `direct` — see below), and a "Whale activity (24h)" widget reading 0. A status banner immediately under the hero reads: *"100% of last-24h signups are unattributed — possible UTM tracker outage"* with an Investigate CTA — ironically the single most M1-relevant signal on the page is the banner, not any hero card.

## What works

- The 3-card layout renders cleanly, deltas are present with arrow + percent + absolute, and 24h compare anchor is explicit in the sub-header ("Has anything material changed in the last 24h? 24h compare.").
- Each card has a stable `metric_id` discoverable via the Flag button's `aria-label` (good for instrumentation/QA hooks): `pulse.registeredUsers`, `pulse.activeHolders`, `pulse.aumUSD`.
- The supporting UTM-outage banner is genuinely an M1 signal — it's just not in the hero.

## What's broken or subtle

- **None of the 3 hero KPIs answer an M1 daily question.** The retained trio is a generic exec-dashboard triple (users, holders, AUM) — the classic North Star / DAU / revenue pattern from a SaaS template, not a paid-acquisition operator's morning view.
- **No CAC, no holder-rate, no cost-per-holder, no channel split in the hero.** M1's first question — "what did yesterday's spend yield per channel?" — is unanswerable without leaving the hero and digging into "Signups by source" (which itself is showing only `direct: 207` because attribution is broken, see below).
- **No UTM coverage card.** The UTM-coverage signal exists but is demoted to a status banner that disappears once cleared. M1 needs a persistent "% attributed last 24h" tile — right now coverage is 0% and the only acknowledgement is a dismissable warning.
- **No funnel-leak card.** Biggest step-to-step drop-off is the single most actionable M1 question and is entirely absent from Pulse. It lives one tab away in Funnels, but Pulse's job description ("Has anything material changed in the last 24h?") demands it surface here.
- **Active Holders 484 vs Registered 16,921 = ~2.86% holder-rate** — that ratio is the M1 number, but it's not computed or displayed; the user is asked to do the mental math.
- **AUM $23.0K is a vanity/treasury KPI** at this scale; it's tracking nothing M1 controls. (At $23K AUM, a single whale ticket dominates the delta — and indeed the whale widget reads 0 over 24h, so the AUM +$54 delta isn't even acquisition-driven.)
- **Console:** 1 error on page load (not blocking; not investigated as out-of-scope for HARVEST-016).

## Evidence

- Screenshot (hero region, viewport): `docs/qa/2026-06-06-phase1-verification/screenshots/harvest-016-pulse-hero.png`
- Screenshot (full Pulse page): `docs/qa/2026-06-06-phase1-verification/screenshots/harvest-016-pulse-full.png`
- DOM metric_ids confirmed via `aria-label` on Flag buttons (verbatim above).
- UTM-outage banner text (verbatim): "100% of last-24h signups are unattributed — possible UTM tracker outage" with Investigate CTA.

## Verdict reasoning

The rubric: PASS = 3/3 of the cards answer an M1 question; SUBTLE = 2/3; FAIL = 1 or 0.

Counting strictly: `registeredUsers` is a cumulative vanity total (not M1), `activeHolders` is a denominator without a ratio (not M1 in this raw form), `aumUSD` is a treasury figure (X1/CFO lens, not M1). **0 of 3 cards answer M1's likely 9am questions.** The retained trio looks like the inherited generic exec dashboard, not the result of a deliberate persona-led prune.

Phase 2.1 successfully removed clutter (6 cards → 3) but kept the wrong 3. The M1-shaped Pulse hero should be:
1. **Cost / new holder (24h)** — channel-weighted CAC against holder conversion.
2. **UTM coverage %** — persistent tile, not a dismissable banner. Currently 0%, which is itself the headline.
3. **Biggest funnel leak step (24h)** — name the step + the drop-off delta.

That's the M1 trio. The current trio is the X0/exec-summary trio.

**Verdict: FAIL.**
