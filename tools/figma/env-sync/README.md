# Sincronizarea mediilor — Figma board (Feature 97187, US-346…353)

File **GEAP 2.0 · Admin** `rFoBKCqtBb0idERLS2RHE8` (GEAP 2.0 is in recovery mode → built here, moves into GEAP 2.0 later).
GEAP 2.0's library is published and enabled here (2026-11-18). Import GEAP components by KEY. There are no local copies.

## Ids (root shared plugin data `envs`/`ids`)
| What | id |
|---|---|
| Page „📍 Cover” · file index card | 0:1 · 15:113 |
| Page „Sincronizarea mediilor” | 3:2 |
| 00 · Start here (card 15:105) | 13:2536 |
| 01 · List & states | 13:2537 — **Block · sync-01 13:2541** (screen 13:2) DONE |
| 02 · Sync one | 13:2538 — sync-03, 03b to do |
| 03 · Batch | 13:2539 — sync-04, 05a, 04d to do |
| 04 · History & activity | 13:2540 — sync-06, 07 to do (re-capture 07 last: batch-table clip fix may land) |
Raw captures still on the page: `cap · sync-04` 5:2, `cap · sync-06` 6:2 (pre-check, captured with --fit = 2642 tall → re-capture the dialog / drawer states or crop to 900).

## Per-state chain (≈ 4 calls / block)
1. `generate_figma_design { fileKey, nodeId: "3:2" }` → `SETTLE=3000 bash tools/figma/registre/cap.sh "<state> <cid>"` (one at a time; add `nofit` for menu states).
2. `const LIB = new Function("return " + figma.root.getSharedPluginData("envs","lib"))(); return await LIB("screen", { cap, state })`
   (source `lib.js`). It builds `Desktop · <state>` (library gov bar `.top-section`, Body = sidebar + Main), swaps search, Filtrare chip, toolbar /
   direction buttons, tabs + track line, checkboxes, tags, ✓ / sort icons; GRID → VERTICAL; table clip + last row no border; text styles + spacing tokens.
   **Then swap the shell to GEAP instances** (see the sync-01 fix calls): sidebar set `82b199c4…` variant `Role=Central admin` (FILL height), header
   `28b3981a…` (Title prop = page title), notice → Message · subtle `cb892f8c…` Tone=Info (bold lead = Body/Small 500 `057521fd…`), batch toggles →
   svc/stack-group-header `d8b1af4e…`, empty states → Empty state · boxed `33fcf9d6…`, block status → Status `ab403364…`. Update `lib.js` to do this directly (it still writes `PLACEHOLDER · …`).
3. After the `screen` op: set every converted grid row (Page › Container children, table scroll box, activity Section) to HUG height. Grid
   rows come in as FILL, so they stretch and cut the table. Delete the empty `Container` (0 high) under the table.
4. Activity object names are **links** (link link-primary), not buttons: they are text + Body/Small 500 + brand colour, never a Neutral button.
5. `LIB("block", { screen, state, title, story, note, section })` → Block = Screen label (ID chip, title, Status, story tag, Prototype ↗) · screen · Note.
6. Audit: compact gate check (the stored `envs`/`audit` was NOT saved — paste tools/ui-qa/figma-audit.js with ROOTS = block id).

## Open
- **GEAP sidebar main has no „Sincronizarea mediilor” item** (Setări = Distribuire + hidden Reguli de numerotare). Add a hidden item (20/rotate-arrow
  `8cdf3361…`) to GEAP 12673:12268 in GEAP 2.0 (read-only now). Then show it Active on every block. sync-01 shows the Setări group without it.
- sync-01 header: the instance switcher shows its default „Specialist ghișeu • Chișinău” (code: Administrator central • ANSP), and the Back chevron is on. Set them.
- Code notes for proto-engineer: the toolbar buttons use the registry's generic icons (Sincronizează selecția = upload, Sincronizează tot = plus-large).
  The empty states are `bare` in the code, but the Figma rule is Empty state · boxed.
- Remaining audit minors on 13:2541: ~90 fractional sizes (hug content), off-scale paddings 10 / 11 from the capture (Heading 2, Button).
- Arrows (native connector labels, from the clicked element), cover counts, Start here counts: update as blocks land.
