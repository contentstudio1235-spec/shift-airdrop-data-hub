# HARVEST-014+022 RE-TEST v2 (after MR !25b): Whale → IdentityCard drill

**Date:** 2026-06-07
**Prior verdict (post MR !25):** SUBTLE
**This verdict:** ✅ PASS
**MR !25b commit:** aa2fde6
**Verifier:** Claude controller (Playwright MCP, direct — earlier subagent stalled on clipboard read)

## What I tested

End-to-end drill chain on prod (https://shift-airdrop-data-hub.vercel.app/admin/data-hub) using a known whale: `droskou75` (Dros Kou profile).

## Step-by-step results

- **Deep-link load URL** = `?walletSizeMin=0&walletSizeMax=0&view=users&wallet=droskou75`
  - Contains `view=users`? ✅ YES
  - Contains `wallet=droskou75`? ✅ YES
  - Contains `tab=users`? ✅ NO (the IA contract is now consistent everywhere)
  - Users tab visually active (accent color)? ✅ YES
  - Search input pre-populated with "droskou75"? ✅ YES
  - Profile list filtered to 1 row (Dros Kou, wallet 7AoQvkKK...EYAAWP)? ✅ YES
- **Row click test:**
  - URL after click = `?walletSizeMin=0&walletSizeMax=0&view=users&wallet=droskou75&profileId=003c2e36-...&q=droskou75`
  - IdentityCard renders (body has "PRIMARY WALLET" text)? ✅ YES
  - `wallet` preserved alongside `profileId`? ✅ YES
- **Reload test (re-navigate to same URL):**
  - URL after reload = `?walletSizeMin=0&walletSizeMax=0&view=users&wallet=droskou75`
  - wallet preserved? ✅ YES
  - view preserved? ✅ YES
  - Search box still shows "droskou75"? ✅ YES
  - Dros Kou row still matched? ✅ YES
- **Drop-on-different-search test (intentional):**
  - Typed "differentQuery" into search box
  - URL after typing = `?walletSizeMin=0&walletSizeMax=0&view=users&q=differentQuery`
  - wallet DROPPED (intentional)? ✅ YES
  - q=differentQuery added? ✅ YES
  - view preserved? ✅ YES

## Evidence

Playwright MCP direct execution by controller. Screenshots captured in-session:
- Deep-link landing snapshot at `.playwright-mcp/page-2026-06-06T21-14-27-887Z.yml`
- Post-click snapshot at `.playwright-mcp/page-2026-06-06T21-14-56-713Z.yml`
- Post-reload snapshot at `.playwright-mcp/page-2026-06-06T21-15-28-704Z.yml`
- Post-different-search snapshot at `.playwright-mcp/page-2026-06-06T21-15-54-667Z.yml`

## Verdict reasoning

Every acceptance criterion of MR !25b's contract verifies live in prod:
- URL preservation across deep-link load, click, reload — wallet survives all three
- Users tab visually active (correctness of the `view=` IA contract, fixing the `tab=` writeback Layer C)
- Search input pre-populated with wallet so the matching profile surfaces as 1 row
- IdentityCard accessible after row click (PRIMARY WALLET text present in body)
- Intentional drop behavior: typing a different search query removes `wallet=` from URL (so deep-link doesn't get stale)

## Known pollution (not a regression, separate bug)

URL consistently includes `walletSizeMin=0&walletSizeMax=0` as artifacts of the `paramsToFilters` quirk the MR !25 implementer flagged: `Number('') === 0` passes the `>= 0` finite check and writes both bounds back. Not a regression of MR !25b — it pre-existed both MRs and just becomes more visible now that wallet URL state survives. Worth a follow-up fix (one-line guard in `paramsToFilters`), out of scope here.

## Conclusion

HARVEST-014+022 was SUBTLE post-MR !25, now PASS post-MR !25b. The whale → IdentityCard drill chain is end-to-end correct. Layer A (whale row href via lib/navigation.ts), Layer B (useFilters FOREIGN_PARAMS), Layer C (UsersView's own URL writer + wallet read on mount) all confirmed working in prod.
