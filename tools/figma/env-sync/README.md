# Sincronizarea mediilor — Figma board (Feature 97187, US-346…353)

File **GEAP 2.0 · Admin** `rFoBKCqtBb0idERLS2RHE8` (GEAP 2.0 is in recovery mode → built here, moves into GEAP 2.0 later).
GEAP 2.0's library is published and enabled here (2026-11-18). GEAP components are imported by KEY (`lib.js` → `G`). No local copies.

## Ids (root shared plugin data `envs`/`ids`; routines `envs`/`lib`, `envs`/`post`, `envs`/`audit`)
| What | id |
|---|---|
| Page „📍 Cover” · file index card | 0:1 · 15:113 (13 blocks) |
| Page „Sincronizarea mediilor” | 3:2 |
| 00 · Start here (card 15:105, contents lines 15:109–15:112 linked to the sections) | 13:2536 |
| 01 · List & states | 13:2537 — sync-01 13:2541 · 01a 28:3766 · 01g 28:4596 · 01e 41:8876 · 01f 41:9601 · 02 28:5093 |
| 02 · Sync one | 13:2538 — sync-03 23:4758 · 03b 33:5429 |
| 03 · Batch | 13:2539 — sync-04 33:6675 · 05a 33:7790 · 04d 33:8643 |
| 04 · History & activity | 13:2540 — sync-06 41:7300 · 07 41:8129 |
Screens: `envs`/`ids` keys `scr_<state>`; blocks `blk_<state>`. No raw captures left on the page.

## Per-state chain (≈ 2 Figma calls / block, 2–3 blocks per use_figma call; > 3 risks the 5-min timeout)
1. `generate_figma_design { fileKey, nodeId: "3:2" }` → `SETTLE=3000 bash tools/figma/registre/cap.sh "<state> <cid> [nofit]"`
   — one cap.sh at a time (parallel runs collide). `nofit` for dialog / drawer / toast states (screen = 900 viewport).
   The „timeout (submitted?)” line is normal: the capture lands as `cap · <state>` on the page.
2. In one call (stored routines):
   `POST("pre",{cap})` → `LIB("screen",{cap,state,fixed?,role?,detail?,active?})` → `POST("post",{screen})` → `LIB("block",{screen,state,title,story,note,section})` → `LIB("stack",{section,order})`.
   - `screen`: GEAP `Sidebar · BO` (Role variant) + `Shell / Header (BO desktop)`; SHELL overrides = header Title, Back off, switcher Detail
     (read from the capture's „… • …” text), Setări hidden item → „Sincronizarea mediilor” (20/rotate-arrow) Active. Specialist (sync-02): `role: "Specialist", active: false`.
   - `pre` (before screen!): radios → radio-label Small (+ supporting text, Disabled when fixed), textarea field → text-area (label, star,
     hint, counter; Destructive when the field shows the error), inline step input → text-input (label off).
   - `post`: dialog → GEAP `Modal` Type=Content (body cloned into the Content slot, footer Medium), scrim = primitive `alpha/black/400-alpha`
     (the semantic overlay-dark alias renders opaque until its primitive is imported), sort labels, „Vezi în Audit & Logging” Neutral Small,
     batch toggles → `svc/stack-group-header` + Meta lines, activity names → links, GRID tracks whole px.
   - Drawer states: rename the overlay's `Dialog` → `Drawer · …` BEFORE `post` (else it becomes a centred modal); close × = circular Neutral
     Icon=Only Small with the Modal's 16/cross-large, footer = circular Neutral Medium. Toasts: library `toast` (8324658c…).
   - Empty states → `Empty state · boxed` Size=Default (33fcf9d6…): inline routine in the 01e/01f call (frame = 48 icon circle + title + text).
3. Audit: `const AUD = new Function("return " + figma.root.getSharedPluginData("envs","audit"))(); await AUD([blockIds])` (= tools/ui-qa/figma-audit.js without comments / RESPONSIVE).

## Left to do (call cap reached 2026-11-18)
1. **Blank gap on list screens** (sync-01a 28:1303 is 3207 tall, was 2127; same on 01, 01g, 03…): `Container:margin` (pinned right column wrapper,
   1068–1583 high) and the page `Container` grew when the clip pass set clipped containers to HUG. Set `Container:margin` height = its table's
   height (or HUG on the table wrapper) and restack with `LIB("stack")`. Screenshot-check 01a / 01g / 07 afterwards.
2. **Arrows**: `figma.createConnector` does not exist in design files. Paste one connector from GEAP (e.g. 10952:283686) onto page 3:2, store
   its id as `ids.connector`, then run `LIB("arrow",{from,to,label,magnet,endMagnet})` (stored op clones it). Planned 9 arrows, from:
   sync-01 tab „DEV ⇄ STAGING” → 01a · row checkbox → 01g · search → 01e · row „DEV → STAGING” → 03 · type cell „Formular” → 06 ·
   batch header → 07 · 01g „Sincronizează selecția” → 04 · 03 footer confirm → 03b · 04 footer confirm → 04d (same column: end RIGHT).
3. Whole px: 875 fractional left (GRID cell children centred at .5, hug texts inside cells). Off-scale 31 (captured 10 / 11 / 1 paddings in
   Heading 2 / Button / Close), spacing-unbound 150 (mostly 2 / 4 px inside captured rows), 2 clipped-content = table wider than its scroll box (intended).
4. Library gaps: the GEAP sidebar main has no „Sincronizarea mediilor” item — the screens borrow the hidden „Reguli de numerotare” slot under
   Setări (instance overrides), so Reguli de numerotare is not shown. Add a real hidden item to GEAP 12673:12268 when GEAP is writable. No library
   drawer: the history drawer (sync-06) is the captured frame with library controls. sync-02 / 01e / 01f boxed empty states keep the default icon (lock / search glyph keys not mapped).
5. Code notes for proto-engineer: toolbar buttons use generic icons (Sincronizează selecția = upload, Sincronizează tot = plus-large).
