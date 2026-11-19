# Sincronizarea mediilor — Figma board (Feature 97187, US-346…353)

File **GEAP 2.0 · Admin** `rFoBKCqtBb0idERLS2RHE8` (GEAP 2.0 is in recovery mode → built here, moves into GEAP 2.0 later).
GEAP 2.0's library is published and enabled here (2026-11-18). GEAP components are imported by KEY (`lib.js` → `G`). No local copies.

## Ids (root shared plugin data `envs`/`ids`; routines `envs`/`lib`, `envs`/`post`, `envs`/`audit`)
| What | id |
|---|---|
| Page „📍 Cover” · file index card | 0:1 · 15:113 (18 blocks) |
| Page „Sincronizarea mediilor” | 3:2 |
| 00 · Start here (card 15:105, contents lines 15:109–15:112 linked to the sections) | 13:2536 |
| 01 · List & states | 13:2537 — sync-01 13:2541 · 01a 28:3766 · 01g 28:4596 (menu open, 3 selected) · **01h 53:6644** („Sincronizează tot (14)” on a pair tab) · 01e 41:8876 · 01f 41:9601 · 02 28:5093 |
| 02 · Sync one | 13:2538 — sync-03 23:4758 · 03b 33:5429 |
| 03 · Batch | 13:2539 — sync-04 33:6675 · 05a 33:7790 · 04d 33:8643 · **04e 93:8687** („Vezi lotul” → Activitate, B-0143 open) |
| 04 · History & activity | 13:2540 — sync-06 41:7300 · 06c 60:7594 · 07 41:8129 · **07c 93:7579** (search „tarif”) · **07d 93:8164** (no match) |
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

## Local components (page „🧩 Local components”, 2026-11-19)
„Batch header” component set `50:6639` (shared plugin data `envs`/`batchHeader`): State = Closed / Open (chevron down / up) / Hover (grey `background/base/tertiary`),
text properties Title, Meta line, Reason line, boolean „Show Omis tag” (tag text editable, exposed instance). Padding 16/20, title row → 8 → meta, 4 between meta lines.
All 37 batch headers on the board are instances (State=Open). It is local here because GEAP 2.0 is in recovery mode — move it to the GEAP library later and re-point the instances.

## Left to do (updated 2026-11-18, finish-up job)
Done: blank gap fixed. The empty white `Pinned column (overlay)` frames (+ their `Container` / `Container:margin` wrappers) were deleted on
9 screens: the code table fits at 1440, so no pinned shadow and the empty frame also hid the right-hand columns. sync-01a screen 3207 → 2139
(code 2127); other list screens 2646–2654 (code 2642). Sections re-stacked. Dialogs 04 / 05a rebuilt (the footer buttons were missing),
radios FILL, skipped-objects notice one item per line, screens = dialog + 48; 06 drawer footer pinned to the bottom; 04d toast heading; 03b note.
1. **Arrows**: DONE 2026-11-19 — 9 connectors cloned from the GEAP connector the PO pasted (ids in `envs`/`ids` key `arrows`; label pill inherited from the template; the pasted original was deleted, so a new arrow needs a fresh paste as `ids.connector`). Original note: `figma.createConnector` does not exist in design files; no connector on the page. Paste one from GEAP (e.g. 10952:283686)
   onto page 3:2, store its id as `ids.connector`, then run `LIB("arrow",{from,to,label,magnet,endMagnet})` for the 9 planned arrows:
   sync-01 tab „DEV ⇄ STAGING” → 01a · row checkbox → 01g · search → 01e · row „DEV → STAGING” → 03 · type cell „Formular” → 06 ·
   batch header → 07 · 01g „Sincronizează selecția” → 04 · 03 footer confirm → 03b · 04 footer confirm → 04d (same column: end RIGHT).
2. Whole px: ~865 fractional left = GRID cell children centred at .5 (odd cell − content) and GRID cells wider than their track. Do NOT fix by
   padding (tried: 1,385 off-scale paddings, reverted). Needs even row heights / content heights in the table cells.
   Off-scale 31 (captured 10 / 11 / 1 paddings in Heading 2 / Button / Close), spacing-unbound 150 (2 / 4 px inside captured rows), 2 clipped-content.
3. Known differences to code: 04 / 05a show the full dialog (code scrolls it at 900 with the scroll cue); 03b hint „Se aplică tuturor pașilor…”
   is replaced by the error in the library textarea; sidebar lacks Calendar / KPI / Widgete / Reguli de numerotare items (GEAP sidebar main).
4. Library gaps: the GEAP sidebar main has no „Sincronizarea mediilor” item — the screens borrow the hidden „Reguli de numerotare” slot under
   Setări. No library drawer: the history drawer (sync-06) is the captured frame with library controls. sync-02 / 01e / 01f boxed empty states
   keep the default icon.
5. Code notes for proto-engineer: toolbar buttons use generic icons (Sincronizează selecția = upload, Sincronizează tot = plus-large).

## Sincronizează ⌄ (2026-11-19, env-sync-menu-v1)
Toolbar = ONE library `button-filled-rectangular` Secondary · Trailing · Small „Sincronizează” + 16 chevron (Disabled on the empty 01e / 01f; Active on 01g / 01h = open). Open menu = frame `Menu · Sincronizează`
(absolute in the screen, right-aligned under the button, p8 g4, radius-12, dropdown-effect, clip) with 2 × GEAP `Post-process menu · item` Desktop (40): „Obiectele selectate (N)” (24/check-all) and „Toate obiectele afișate (N)” (20/bullet-list).
The „Acțiuni tabel” filler must be FILL on every screen (was fixed width in 01g / 04 / 05a). Arrow „Obiectele selectate” starts on the 01g menu item → 04.
Lane pass: connectors cannot take waypoints through the API (elbow route is automatic), so same-column loops still share the right-hand lane — needs a manual drag of the elbow handles.

## Version cell with „schiță” (2026-11-19, env-sync-ver-stack-v1)
All 22 version cells with the Small „schiță” tag (2 per screen, 11 screens) are stacked: the „vN ▲” line, then the tag 4 px under it (VERTICAL, align left, gap = spacings/spacing-4). Row heights did not change (rows are set by the taller cells). Not made a component: only 22 instances, edited in place.

## Selection bar + object panel CTAs (2026-11-19, selection-bar-v1 / env-sync-panel-v1)
- Toolbar with nothing selected = ONE library Secondary Small „Sincronizează tot (N)” (16/refresh leading, Disabled on the empty 01e / 01f). The „Sincronizează ⌄” dropdown and its menu are gone.
- Local component **Selection bar** `60:7488` (page „🧩 Local components”, `envs`/`selBar`; local because GEAP 2.0 is in recovery — move to the GEAP library later): brand-secondary bar, radius-8, padding 4/4/4/16, text property „Count text”, exposed „Clear” text button and primary „Action”. It replaces the toolbar's content on 01g, 04, 05a (3 selected). Arrow „Sincronizează (3)” starts on its Action button → 04.
- STAGING column: header + body cells already bound to `background/brand/secondary`; „aici lucrezi” = Strong Brand Small tag on all 11 tables.
- Drawer 06 + new block **sync-06c** `60:7594` (section 04): „Sincronizare” section first in the body (rows per pair: Medium primary / secondary direction button + step note, equal pair = success Small tag „sincronizat”). 06c = both directions available.

## Alignment to code b35b938e + d10c2c19 (2026-11-19, env-sync-align-v1)
The pipeline band / page tabs / in-cell step round was rejected and reverted in code: the blocks keep the blue notice, the
3 scope tabs, the direction columns and the activity panel under the list. Stored routine `envs`/`v2` (source `v2.js`):
- Selection bar `60:7488` = dark (`background/base-inverse/default`), 56 high, padding 0/16, count white 14/20, „Anulează
  selecția” = text button Strict + 16 × (repainted white — library gap: no text button for dark), primary „Sincronizează (N)”.
  Instances on 01g / 04 / 05a checked (count + both labels kept).
- `flat`: every steps table (activity batches, history drawer 06 / 06c, dialog plans 03 / 03b / 04 / 05a — inside the Modal
  slot) = RAP flat: wrapper square with only a 1 px top `border/base/default` (= the line under the batch header), header
  cells `background/base/tertiary`, no bottom line, Caption Medium 12/16 500.
- `staging`: one absolute `STAGING column frame` per list table (1 px `border/brand/secondary` left + right, full height) in
  the table's scroll box — a cell can't carry a brand left/right stroke and the grey row divider at once. figma-audit flags
  it as `absolute-in-flow` (12, intended overlay like the pinned column).
- `badge`: Batch header 50:6639 got an exposed `Count` = numbered-badge Size=Large Style=Neutral after the title (the
  library has no outlined style), filled on all 43 instances from „… N modificări”.
- Notice „Lucrezi în mediul STAGING…” = full-width band (first child of `Page`, radius 0, padding spacing-16 all round),
  toolbar / selection bar 16 below (the Container's top padding). Anchors under it moved −32.
- `arrows`: in-column arrows start on the element (RIGHT) and end on 8×8 anchors inside the target block at x 1432 + 16k
  (lanes right of the screens); cross-column arrows: „DEV → STAGING” straight (same y) into 03's left edge; „Formular” =
  2×2 gutter anchor (block x 1536) TOP → TOP above block 06 (lane over the sections, y ≈ 7); „Lot” gutter BOTTOM → 07's
  left edge at y 2790 (gap 05a / 04d); „Sincronizează (3)” gutter TOP → 04's left edge at y 1200 (gap 03 / 03b).
  Sections 01 and 04 restacked from y 80 — re-check those y gaps after any restack. No manual drag needed in the
  1600-px overview; verify at zoom.
- Rejected and deleted: local „Environment pipeline” and „Version cell” sets, raw captures of the band layout.

## Activitate tab (2026-11-19, env-sync-activity-tab-v2 = code 9a6c7330 + 24684e42)
- Every list block: toolbar `Filtrare obiecte` 56 (8/16/8/16) flush under the band; tab bar = 3 scope tabs · `Divider` (1×20 line, padding
  spacing-8) · `tab · Activitate` (history 20, no count). Selection bar 60:7488 = 56, padding 0/16/0/29, Action = Primary Small Leading 16/refresh.
- sync-07 / 07c / 07d / 04e: `Toolbar · Activitate` in the same slot ABOVE the tabs (search 400 „Caută după lot, obiect, motiv sau autor”,
  FILL filler, Neutral Small „Vezi în Audit & Logging”); Section p24/16 holds only the batch list (07d = Empty state · boxed, search icon).
- Arrow `Flow · Vezi lotul` 93:9263: 04d toast link anchor → 04e end anchor (x 1448). New blocks were cloned from 07; GRID tables keep FIXED
  row sizes — after removing rows set the table + its wrapper to HUG and the short cell texts to WIDTH_AND_HEIGHT.
