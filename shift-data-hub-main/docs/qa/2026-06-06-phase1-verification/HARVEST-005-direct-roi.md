# HARVEST-005 Verification: "Best ROI Source = Direct" caveat

**Date:** 2026-06-06
**Verifier:** Claude subagent (Playwright MCP, read-only)
**Verdict:** FAIL

## What I tested

Navigated to `https://shift-airdrop-data-hub.vercel.app/admin/data-hub` and inspected both the **Pulse** view and the **Source Attribution** view for any KPI card labeled along the lines of "Best ROI Source." Identified the card on the Source Attribution tab, then:

1. Captured the card's exact label, value, and subtitle from the rendered DOM.
2. Programmatically enumerated every descendant of the card carrying a `title`, `aria-label`, `aria-describedby`, or `data-tooltip` attribute (i.e. every possible tooltip surface, native or otherwise).
3. Confirmed by direct DOM inspection that the card-level container itself has no `title` / `aria-label` / `aria-describedby`.
4. Compared the Best ROI Source card's tooltip behavior to its neighbor, the "Attribution Signal" card, which **does** carry an explanatory tooltip.

Confirmed no "Best ROI Source" card exists on the Pulse tab — it only appears on Source Attribution.

## The card as it appears

| Where | Label | Value | Subtitle / context |
|---|---|---|---|
| Source Attribution tab, top-left KPI of the 3-card row | `Best ROI Source · 30d` | `Direct` | `412 holders / 5,848 users (7.0% conv)` |
| Pulse tab | — (card not present) | — | — |

Full card text content (verbatim from DOM): `Best ROI Source · 30dDirect412 holders / 5,848 users (7.0% conv)`.

No additional caption, asterisk, footnote, "(unattributed)" qualifier, or warning glyph is rendered in the card body.

## Caveat check

- **Caveat text in card body? NO.** The card renders three text nodes only: label `Best ROI Source · 30d`, value `Direct`, subtitle `412 holders / 5,848 users (7.0% conv)`. No additional disclaimer text, asterisk, or footnote is present.
- **Tooltip on hover? NO (effectively).** The DOM has two `title` attributes inside the card:
  - On the value div: `title="Direct"` — a literal repeat of the displayed value (a CSS-truncation tooltip pattern, not an explanation).
  - On the subtitle div: `title="412 holders / 5,848 users (7.0% conv)"` — also a literal repeat of the displayed subtitle.

  Neither tooltip explains that "Direct" is the residual unattributed bucket. By contrast, the adjacent **Attribution Signal** card carries a real explanatory tooltip: `title="% of profiles with any attribution signal (UTM tag or referral source)"`. The Best ROI Source card is missing that pattern.

  The card-level container has no `title`, no `aria-label`, no `aria-describedby`, and no `data-tooltip`. There is no custom React tooltip portal wired to the card either (no `aria-describedby` references and no hover-triggered popover in the rendered tree).

- **Drill-down explains? NO.** The card-level container has no `cursor: pointer`, no `role="button"`, no `onclick` handler exposed to event listeners I could detect, and no `tabindex`. There is no drill-down affordance from this card. (Compare the KOL Leaderboard rows below, which are clearly marked with `aria-label="Drill into <KOL> (snag_referrals)"` — the Best ROI Source card has no analogous affordance.)

## Evidence

- `harvest005-attribution-kpi-row.png` — Source Attribution tab viewport showing the three-card KPI row with "Best ROI Source · 30d / Direct / 412 holders / 5,848 users (7.0% conv)" on the left.
- `harvest005-card-zoom.png` — Same view, second capture confirming the rendered card text contains no caveat.
- DOM inspection via Playwright `browser_evaluate`: enumerated 170 descendants of the page-level container carrying tooltip-bearing attributes; none of the tooltips attached to the Best ROI Source card carry explanatory text — only literal repeats of the value/subtitle. The Attribution Signal card immediately to the right does carry an explanatory tooltip, demonstrating the pattern is known to the codebase but not applied here.

## Verdict reasoning

The task brief defines:

- PASS = clear caveat text visible in card body
- SUBTLE = tooltip exists but no body-text caveat
- FAIL = no caveat anywhere — operator is misled

The Best ROI Source card has **no body-text caveat** and **no explanatory tooltip**. The only `title` attributes are CSS-overflow value mirrors, which neither inform the operator about Direct's nature nor distinguish "Direct" from a genuinely high-converting attributed channel. Given that UTM coverage in prod is ~0% (the Coverage card right next to this one literally shows `0.0% UTM` and `With UTM: 1 · 0.0%`), "Direct" is overwhelmingly an unattributed-residual bucket. An operator glancing at this card at 9 a.m. would walk away believing that "going direct" is the best ROI channel. That is the exact misread HARVEST-005 was filed to prevent.

Therefore: **FAIL**.

## Recommended fix (1-2 sentences)

Rename the card label to **"Best Attributed ROI Source · 30d"** *and* either exclude `direct` from the ranking when its share of the attribution mix exceeds a threshold (e.g. >50% of profiles), or render an inline caveat like `* Direct = unknown source (UTM coverage 0.0%)` beneath the subtitle. At minimum, add an explanatory `title` attribute on the card container — mirroring the Attribution Signal card pattern — that reads something like `"Direct is the residual bucket for profiles with no UTM tag or referral source. UTM coverage is currently 0.0%."`.
