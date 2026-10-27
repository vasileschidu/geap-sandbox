---
name: figma-board-workflow
description: Step-by-step guide the coordinator follows EVERY time a new Figma board / page / flow is built from the prototype (calendar, absences, ex-officio, MDocs, any new feature). Walks the user through scope, block list, conversion pre-check, per-column agents (Opus for column 1, Sonnet after), limits and hand-off. Use before launching any figma-designer agent for a board, and whenever the user says "build X in Figma". Born 2026-10-26 from a day where 3 boards cost ~70 % of the tokens.
---

# Figma board workflow (guide the user through it)

Why: on 2026-10-26 three whole-board agents (49–55 blocks each, Opus, 2 h+, 280–450 Figma calls each)
used ~70 % of the day's tokens, hit the Figma MCP call limit twice, and needed three rounds of sweeps
because the capture → library-instance step silently mis-mapped controls (filters → buttons, textareas raw).

The coordinator runs the steps in order and tells the user which step it is on ("Step 2 of 7 — block list").
Ask the user only the decisions in **bold**; everything else just do.

## 1. Scope (≤ 3 lines)
State: feature / stories, which Figma file + page, which sections (one Section per column), desktop only or + phone.
Check the hand-off file and the Figma limit state first (`use_figma` ping). Limit hit → write the hand-off, stop.

## 2. Block list — fewer blocks (rule A)
Figma gets **one block per acceptance criterion + the error / empty / permission variants that change the layout**.
Typical board = 15–20 blocks, not 50. Every other demo state stays in the prototype, reachable by the
„Prototype ↗” link. Proposals beyond the stories are marked „Proposal for PO”.
→ **Show the user the proposed list (state id → block, with the ones left out) and get an OK before building.**

## 3. Conversion pre-check (rule B) — before any column is built
Capture 2–3 representative states (one list with toolbar, one dialog, one form) and run the swap-to-instances
step on them. List everything that did NOT become a library instance (raw frames, neutral buttons where a chip
should be, raw inputs / textareas / date fields / segmented controls / tabs). Fix the mapping ONCE in
`tools/figma/swap-to-instances.js` (+ stored `reg/chain`), re-run on the 3 states, then continue.
Known traps: Filtre/Filtrare trigger + facet chips = filter-chip 1244:34029; „Renunță” = text button;
tabs = grey track line UNDER the blue line; textareas = library text area (re-apply error lines);
the audit script does not flag captured textareas.

## 4. One agent per column / section (rule C) — models (rule D)
- **Column 1 of a new board = `opus`** (design decisions, structure, block format, arrows pattern, Start here skeleton).
- **Every following column = `sonnet`**, a NEW agent each time (an agent cannot change model mid-run, and a
  fresh agent has a small context — every call re-sends everything the agent has seen).
- Cap: ≈ 60 Figma calls per agent, one screen per call for heavy captures. Then it reports and ends.
- One agent per Figma page at a time. Brief with exact node ids, state ids, scripts (`tools/figma/<topic>/README.md`),
  expected report ≤ 10 lines + links. Never "build the whole board".
- Mechanical follow-ups (rename, label sweep, token rebind, restack) = `sonnet`, or `haiku` for read-only lookups.

## 5. One check per job (rule E)
The builder runs `tools/ui-qa/figma-audit.js` on its own blocks and fixes majors. Subagents cannot start agents,
so the coordinator starts `ui-qa-figma` ONLY when: the audit is not clean, a column ends a board, or the user
asks for the visual / prototype comparison. No automatic QA agent per column, no full-file sweep for a one-block fix.

## 6. Finish the board
Last small `sonnet` agent: arrows (own lanes, blue pill labels, from the clicked element), „Start here” (contents,
counts; no PO questions — user 2026-10-27), file index card, final audit of the page. Then give the user the links (page, Start here,
each section) and wait for the review. **Only after the user says OK**: close the Azure stories with a comment and
leave Figma comments tagging Alexandru (never before).

## 7. Session hygiene (rule F)
After each milestone (a board done, or limit hit): update `.claude/handoff/<date>.md` (open jobs, node ids, scripts,
pending decisions) and tell the user "safe to /clear". Never clear while agents are running. Code first, then Figma.

## Quick budget table
| Step | Model | ≈ Figma calls |
|---|---|---|
| Pre-check (3 states) | coordinator inline / sonnet | 10–20 |
| Column 1 | opus | ≤ 60 |
| Columns 2…n | sonnet, fresh agent each | ≤ 60 each |
| Finish (arrows, Start here, index, audit) | sonnet | ≤ 40 |
