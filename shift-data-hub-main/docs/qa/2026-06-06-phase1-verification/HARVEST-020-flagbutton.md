# HARVEST-020 Verification: FlagButton end-to-end

**Date:** 2026-06-06
**Verifier:** Claude subagent (Playwright MCP, read-only)
**Verdict:** PASS

## What I tested

End-to-end mounting and dialog UX of the new FlagButton component shipped today in MR !22, exercised across three of the surfaces called out in the persona harvest gap list: Pulse KPI cards (`pulse.registeredUsers`, `pulse.activeHolders`, `pulse.aumUSD`), the Trader Cohorts table header (`cohorts.retentionWeek4`), and the Users table headers (`users.list.lifetimeVolumeUSD`, `users.list.holdingsValueUSD`). I did NOT click the "Flag for review" submit at any point, so no rows were written to `hub_flags`.

## What works

- FlagButton renders on all three expected surfaces (Pulse, Cohorts, Users) with semantic `aria-label` of the form `"Flag <tab>.<metric> for review"` (verified via DOM query).
- Clicking the icon opens a popover-style dialog with `role="dialog"`, accessible name "Flag metric for review", and visible heading "Flag this number".
- Dialog pre-populates the Tab, Metric, and Value context (e.g. `Tab=cohorts`, `Metric=cohorts.retentionWeek4`, `Value=column:retentionWeek4`; and for Users `Tab=users`, `Metric=users.list.lifetimeVolumeUSD`, `Value=column:volume`).
- Optional comment textarea is present with placeholder `"Why does this look wrong? (optional)"` — confirming the field is non-mandatory per spec.
- Both a `Cancel` and primary `Flag for review` button are rendered inside the dialog.
- Pressing `Escape` closes the dialog cleanly (verified `[role="dialog"]` removed from DOM after Escape).
- Re-opening the dialog after Escape works (state is reset properly).
- Dialog uses the SHIFT design language (dark glassy panel, neon emerald primary on the submit button, muted "Cancel" ghost button).
- Console showed only 1 pre-existing error and 0 warnings during the interactions — no FlagButton-attributable JS errors.

## What's broken or subtle

- The flag icon is very small (18×18 CSS px) and very low-contrast against the panel background. Without the `aria-label` tooltip / keyboard discovery, a sighted user could easily miss it. Recommend bumping size and/or contrast in a follow-up polish pass.
- Inside Cohorts the FlagButton is positioned inside the `columnheader` accessible name string, which means screen readers announce the header as `"W4 Ret Flag cohorts.retentionWeek4 for review"`. Functionally fine, but the column header label becomes verbose. Consider wrapping the button in `aria-hidden` on the parent header text or splitting the header into separate landmarks.
- Per the persona harvest gap list, the dialog mount is the verifiable surface and is in good shape; the actual write path to `hub_flags` was NOT exercised (read-only mandate). The queue insert needs a separate verification pass (e.g. by Tomer manually submitting one and confirming the row lands in `hub_flags` with the expected `tab`, `metric`, `value`, `comment`, `created_at`).
- Page exhibits some URL-state flakiness: changing tabs occasionally rewrote the `view=` query param out of sync with the rendered content for a render cycle. Did not block the FlagButton verification but is worth investigating separately.

## Evidence

- `hub-landing.png` — Hub loaded post-passcode, default landing is Trader Cohorts.
- `flagbutton-instance.png` — Trader Cohorts table with W4 Ret column header (FlagButton is the tiny icon to the right of "W4 Ret" — small but present in the accessibility tree).
- `flag-dialog-open-cohorts.png` — Flag dialog open on `cohorts.retentionWeek4`, showing Tab/Metric/Value context fields, optional reason textarea, and Cancel/Flag for review actions.
- `users-tab-flag-dialog.png` — Flag dialog open on `users.list.lifetimeVolumeUSD` (Volume column), in the context of the Users list with 16,921 profiles loaded.

(All screenshots are stored alongside this report.)

## Verdict reasoning

The FlagButton ships end-to-end as designed for the read-only surface. It mounts on every metric called out in the persona harvest gap list, opens a semantically correct dialog with the expected context fields and optional comment textarea, closes on Escape, and exposes proper accessible names. The two real risks — (a) tiny icon hard for sighted users to find and (b) the actual queue write path — are flagged as follow-ups but do not block C1 closure. HARVEST-020 is **PASS** for the UI mount and dialog UX; a quick manual submit test by Tomer is recommended to fully retire the gap, and a polish pass for the icon size/contrast would be a worthwhile follow-up.
