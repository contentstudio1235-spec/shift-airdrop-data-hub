# Persona Harvest — Validation Packet (≤20 min, Tomer-solo)

**Pairs with:** `docs/design/2026-06-06-persona-gap-list.md` (the v0 list this validates)
**Goal:** Promote the 7 `★?` flags to confirmed `★`, kill rows you no longer cover, demote rows that look bigger than they are. **20-min cap.**

You don't need to re-read the harvest doc. The questions below are scripted so you can answer cold.

---

## Q1 (4 min) — Frequency reality check

Five rows are scored at the top. For each, true / false: **the team or you would surface this same question this coming week.**

| # | Row | Statement to T/F | Your answer |
|---|---|---|---|
| 1 | HARVEST-001 | "Per-channel CAC / holder-rate is something I'd want to see THIS week as paid spend ramps." | ◯ T ◯ F |
| 2 | HARVEST-024 | "If I had a per-persona landing tab next Monday, it would change my Hub session." | ◯ T ◯ F |
| 3 | HARVEST-002 | "0.006% UTM coverage still bothers me — I'd act on a remediation workflow." | ◯ T ◯ F |
| 4 | HARVEST-003 | "Per-source split of Wallet Connect → First Trade drop is a Q I'd dig into this week." | ◯ T ◯ F |
| 5 | HARVEST-005 | "'Best ROI Source = Direct' annoys me because Direct means unknown — I want this fixed." | ◯ T ◯ F |

→ Any F → drop the row to backlog.

---

## Q2 (3 min) — Persona resolution

Two rows are explicitly X1-only (you). Confirm:

| # | Row | Q | Your answer |
|---|---|---|---|
| 6 | HARVEST-011 + 025 (board snapshot / export) | Is this **just** your need (X1), or would an M1/M2 also use the snapshot/export? | ◯ X1 only ◯ X1 + M1 ◯ X1 + M2 ◯ all 3 |

→ If X1+M1 or all 3, bump persona_weight from 1 → 3, score goes from 3 → 9, and the row gets full handoff weight not just always-handoff.

---

## Q3 (8 min) — Standup-overlap test ← THE LOAD-BEARING QUESTION

For each `★?` row, answer in **one sentence**: *"What specifically does the team NOT ask because YOU cover it pre-emptively?"* Then: *"Would the question reopen if you stopped covering it?"*

| # | Row | What does the team not ask because you cover it? | Reopens? |
|---|---|---|---|
| 7 | HARVEST-001 (multi-channel tracking) | _______________ | ◯ Y ◯ N |
| 8 | HARVEST-024 (per-persona landing) | _______________ | ◯ Y ◯ N |
| 9 | HARVEST-002 (UTM coverage panic) | _______________ | ◯ Y ◯ N |
| 10 | HARVEST-005 ("Direct = unknown") | _______________ | ◯ Y ◯ N |
| 11 | HARVEST-009 (UsersView KOL filter UI mismatch) | _______________ | ◯ Y ◯ N |
| 12 | HARVEST-011 / 025 (board snapshot) | _______________ | ◯ Y ◯ N |

→ Any "reopens? Y" → row is **confirmed ★** (highest-leverage Phase 2 target).
→ Any "reopens? N" → row gets killed even if scored high. You're carrying load that doesn't actually exist.

---

## Q4 (3 min) — What's missing

Scan the gap list once. **What question that you KNOW marketing or management will ask in the next 30 days is NOT on this list?** Add up to 3 rows here:

1. _______________________________________________________
2. _______________________________________________________
3. _______________________________________________________

Default tags for any row you add: `source=standup`, `frequency=2-5x`, `persona=M1` (or correct), `decision_tag` = pick from D1-D8, `bucket=D1` (assume feature gap until proven C2 or C1).

---

## Q5 (2 min) — Drive sanity check

The Drive crawl returned **0 hand-maintained spreadsheets** matching the harvest pattern in your connected Google account.

| Q | Your answer |
|---|---|
| Do you maintain ANY recurring SHIFT data spreadsheet — even a personal one? | ◯ Y ◯ N |
| If Y, what's the file name + 1-line of what it tracks? | _________________ |
| Is the file owned by a different Google account than the one connected here? | ◯ Y ◯ N |

→ If Y to question 1 AND we missed it, the file is the single highest-priority Source B row. Add it as a row HARVEST-026.

---

## When done (≤20 min)

1. **Update the table in `docs/design/2026-06-06-persona-gap-list.md`** — fill col K validation_status per Q1-Q5 outcomes (mark `confirmed`, `killed`, `demoted`, `promoted`).
2. **Commit** with `docs(persona): tomer validation pass v0 → v1`.
3. **Tell next session:**
   - How many `★?` got promoted to `★` (count)
   - Which row Q4 added (if any)
   - Q5 outcome (did you find a Source B sheet we missed?)

Next session opens with: "Per Tomer's validation, the locked top-N gap rows are X, Y, Z. Begin Phase 2.3 IA implementation against those."

---

## Why this format

The original kickoff doc said: 20-min validation session, 4 scripted Qs, post-session col K mapping. This packet pre-fills all the structure so you only have to (a) tick boxes and (b) write 6 one-sentence answers. The bottleneck — Q3 standup-overlap test — gets the most space because it's the load-bearing rule.
