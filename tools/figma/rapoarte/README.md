# Reports board — Feature 96502 „Constructor de rapoarte” (2026-11-09)

File GEAP 2.0 `aHgwVwiNCOSOqbMhMjjUOj`. Page `↳ BO -> Rapoarte` **15185:975** (right after `↳ BO -> Widgete` 14861:56367). Desktop 1440 only.
Built like the Widgets board (`tools/figma/widgets/README.md`, `tools/figma/kpi/README.md`).

## Board structure
| Section | id | x | Blocks |
|---|---|---|---|
| 00 · Start here | 15185:976 | 0 | card `Board title · Reports` **15185:999** (ID chip RPT, title, description, Contents = 3 NODE-linked lines „— N blocks”) |
| **(job 14) 01 · US-466 Report list** | **15185:977** | 1200 | rpt-01 · 01i · 01k · 01l · 01m · 01j · 01c · 01e · 01f — 9 blocks (phone block deleted by the user; Rapoarte = desktop only) |
| **(job 14) 02 · US-467 Create report** | **15520:1029** | 3080 | 03 · 03a · 03aa · 03ae · 03ac · 03ag · 03ah · 03i · 03x · 03u · 03e · 03h · 03o · 03q · 12c · 13a · 15a — 17 blocks |
| (job 14: old 02 → **03** at x 4960, old 03 → **04** at x 6840; rows below = pre-job-14 history) | | | |
| 01 · US-467/466 List and create (old) | 15185:977 | 1200 | rpt-01 15189:1665 · 03 15197:7018 (screen 15192:3699) · 03a 15197:7066 (15197:6128) · **03aa 15416:15842 (15416:15849) · 03ae 15416:16880 (15416:16887) · 03ac 15416:17738 (15416:17745)** · 03i 15200:7199 (15200:6235) · 03x 15273:11155 (15273:11162) · 03u 15200:6221 (15199:4829) · 03e 15204:7222 · 03h 15207:8295 · 03o 15209:12690 (15209:7207) · 03q 15212:13841 · **12c 15424:17634 (15424:17641) · 13a 15436:19460 (15436:19467) · 15a 15426:21788 (15426:21795)** — 16 blocks, this order (job 10) |
| 02 · US-468/469/471 Profile, publish, versions | **15185:984** | 3080 | rpt-04a 15231:10040 (screen 15229:8483) · **04b 15244:10585** (screen 15239:9084) · **05j 15280:42116** (screen 15280:42123) · **05b 15250:8293** (screen 15249:9752) · **05d 15256:167194** (screen 15255:10393) · **05f 15260:11170** (screen 15260:9472) · **06b 15262:20235** (screen 15262:11625) · **06c 15265:10825** (screen 15264:12424) — 8 blocks |
| 03 · US-470 Status, access, clone, history | **15185:991** | 4960 | rpt-07a 15285:36305 (screen 15285:19701) · 07b 15285:36319 (15285:20984) · 07d 15285:36333 (15285:28283) · 08a 15285:36347 (15285:14814) · 08c 15285:36361 (15285:27700) · 08f 15285:36375 (15285:17884) · 09c 15285:38839 (15285:36403) · 10b 15285:36389 (15285:21896) — 8 blocks |
- Section 1800 wide, band at 80/80, first block y 440, blocks 240 apart, section h = last bottom + 80 (`rpt`/`stack` does it).
- Section names are English (Figma naming rule); the brief's Romanian titles live in the bands / Start here text.
- When a column changes its count, edit the „— N blocks” text of its line in 15185:999 (keep the hyperlink).
- No staging section on the page (deleted again 2026-11-09). For captures create `Build assets · Rapoarte` (x 7000), pass its id as `stage` to `rpt`/`chain2`, delete it after.

## Stored routines (root shared plugin data, namespace `rpt`)
Helpers: `const AF = Object.getPrototypeOf(async function(){}).constructor; const G = (k) => figma.root.getSharedPluginData("rpt", k);`
- **`rpt`/`chain`** `new AF("J", G("chain"))({ state, step, noFit? })` — finds the page-level `cap · <state>` capture, moves it to the
  staging section **15185:998 (deleted — patch the id in the source or recreate a section and replace the id)**, then reg/compose (title / active
  „Rapoarte”) → reg/post → filterchip → reg/kpi → `rpt`/`fix` → `rpt`/`sheet`(step) → wid/half → qsweep/absflow → `rpt`/`sheetgen` → fillpass →
  reg/polish → `rpt`/`sheetfit` (skip with noFit for drawer states). Returns the screen id `S`.
- `rpt`/`fix` = wid/fix with `OPTS.active` (sidebar item name). `rpt`/`sheet` = wid/sheet with the 4 report steps (its later steps error on report
  sheets — harmless, the stepper is built). `rpt`/`sheetfit` = wid/sheetfit for the footer „Pașii raportului”.
- `rpt`/`sheetgen` `(S, OPTS)`: preview `Sidebar` (sticky ABSOLUTE) into flow, form | preview grow 1 : 1, Sticky placeholders deleted, footer
  „Pașii raportului” in flow, preview header → auto-layout + library expand button (clone 14890:9793, `expandDisabled`).
- `rpt`/`step1` `(S, OPTS)`: step-1 specifics (Categoria / Nivel radio cards → `Widget type card` Show glyph off, Sursa de date → select, RU / EN
  Default, Denumire (RO) → `Text input · counter`, Descriere (RO) → text-area with counter, preview empty state).
- `rpt`/`drawerfit` `(S)`: drawer screens — drawer Dialog HUG (or FIXED 900 when shorter), screen / overlays / sheet behind = drawer height.
- `rpt`/`block` `(SPEC {state, screen, title, note, section?})` → `Block · <state>` (label + note cloned from widgets 14868:78727, link to sandbox).
- `rpt`/`stack` `(SEC, ORDER)` restack + section height (does NOT move anchors / cursors).
- **`rpt`/`restack`** `new AF("SEC","ORDER", G("restack"))(sec, order)` — restack 240 + moves every non-block section child (anchors, cursors)
  with the block it belonged to (connectors follow their anchors). Use this one.
- **`rpt`/`chain2`** `({ state, stage, update, back, step, noFit })` = chain with the staging id as a param; profiles: `update:false, back:true,
  noFit:true`, no `step` (skips `rpt`/sheet). Capture = `generate_figma_design {nodeId: stage}` → `SETTLE=15000 bash tools/figma/kpi/cap.sh <state> <cid>`
  (prints „timeout (submitted?)” but lands) → poll → move the capture node to the page root, rename `cap · <state>` → chain2.

## Library / component changes made here
- Sidebar Central admin main 12673:12268: hidden item **„Rapoarte”** 15188:3650 (Foundations 20/chart) after Widgete; `rpt`/`fix` shows it Active.
- `Widget type card` set 14876:99443: new BOOLEAN **`Show glyph`** (default true) — off = plain radio card (title + description + radio) = code
  `.e-permits-wid-type` without icon, used for Categoria, Nivel, Tipul coloanei.
- Group error line = library Components `inline-message` (set ee99f1b1…, Style=Error).

## Arrows (Widgete pattern since job 5: start 2×2 `anchor · edge` in the right gutter lanes x 1528 / 1560 / 1592 / 1624 at the control's y, magnet RIGHT;
## end 8×8 `anchor · end` flush INSIDE the target screen's right edge (x = screen right − 8 = 1512), y = target screen top + 140, magnet RIGHT)
01 Raport nou → 03 · 03 Continuă → 03a („Continuă · câmpuri goale”) · 03 Continuă → 03i · 03i Adaugă coloană → 03u · 03u Din sursa de date → 03e ·
03u Calculată → 03h · 03i Continuă → 03o · 03o Continuă → 03q. Cursors: one per source screen. Route audit not run.

## Done 2026-11-09 (job 2)
- rpt-03j = clone of 03i + 6th row „Corecții raportate” (tag Manual = tag-filled Accent) + preview column 6 („—”, GRID 6 cols 192/96×5, 672 in the
  630 clip) + info-note „Coloane «Manual»…”; arrow 03u „Completată manual” (anchor x 1624) → 03j. 03j demo = the saved column (no drawer).
- rpt-01 table: `Table - Rapoarte` 15225:8434 = VERTICAL [Rows · 1 | group row | Rows · 2 | group row | Rows · 3]; each Rows = [Pinned column ·
  start (No shadow, ID cells) | Table scroll (clip) › GRID 7 cols | Pinned column · end (Shadow, ⋮ cells)]; no ABSOLUTE, overlay Container deleted.
- Preview header on all 8 step screens = Head (VERTICAL, pad 12/12, gap 12) › Title row (48, title FILL + expand) + meta (code 48 + 28).
- Completed stepper labels underlined (03i…03q); 03h radios FILL (one line each) + Antetul hint FILL; 03q: screen = dialog bottom (1434, footer
  was cut), review values wrap, „Editează” = button-text-rectangular Strict Leading Small + 16 edit (was the Meta text); preview empty glyph →
  20/page-text (03, 03a).
- „Adaugă coloană ▾” = local **`Button / Menu trigger`** set 15219:16571 (Default 15219:16552 / Open 15219:16567, TEXT Label, INSTANCE_SWAP
  Leading icon; 🧩 Local components › Menus & tooltips) = detached library Secondary Small + 16/chevron-bottom (library has no two-icon option).
- Audit majors fixed on every List Item row (01 + 02): row divider = top stroke (was ABSOLUTE 1 px Text), tags in flow, Separator pT 8 bound,
  table GRIDs clip, header pR 80.

## Done 2026-11-09 (job 3)
- 04a: column rows FILL, meta container WRAP + HUG (counterAxisSpacing 0), actions HUG; row dividers = top stroke 1 (first row 0);
  „Rândul de total” switch shows its supporting text; „Adaugă filtru” = button-filled-rectangular **Secondary** Leading Small (tonal, plus 16).
- 04b built (chain2 + hand fixes: rows 3/5 rebuilt from row 4 — the swapper had turned their meta into text-inputs; RU/EN = Default + hint;
  checkboxes unwrapped gap 12; Autorități hint removed; Grupează select Disabled; Salvează Disabled; „Adaugă coloană” = Button / Menu trigger;
  header „● Modificări nepublicate” = local `Header status` 12241:493488 (link style); preview „Zile în perioadă” → „Zile”).
- Report preview tables (03u 03i 03h 03o 03q 03j 04a 04b): body rows 56 → 48, Total row = background/base/tertiary + top stroke
  border/base/default 1.5 (border-1,5 bound). Group edges were already right in the capture (col 3 left, col 6 left, group header bottom).
- 32 + 11 captured `h2d-svg-use-0` → Foundations 24/drag (18332790…) at 16 in rows; BUT 12 of them were filter-select chevrons and
  „Despre raport” ⓘ → those are now library select-input Medium Filled (Label/Assistive off) and `Info trigger (tooltip)` 11931:41990.
  Row numbers = 16 FIXED centred text (no .5 x).
- 05b: dialog (local Modal) centred in the Overlay (HORIZONTAL, centre), screen FIXED 900 clip; scrim fill ok; Salvează Disabled.

## Done 2026-11-09 (job 4)
- 05b: bold leads (05b „Prima publicare: versiunea 1.”, 04b „Modificări nepublicate.”) = range style Body/Small 500 `S:057521fd…,1308:660`; textarea = library
  text-area clone (Input 78, Assistive left + Counter „0/500” right via `⌨️/👁️ Character Counter`); Categoria / Nivel radio cards = `Widget type card`
  Show glyph off on 04a / 04b / 05b / 05d / 05f (new stored routine **`rpt`/`cards`** `(SID, SEL {cat, niv})`); „Sursa de date” date-input → select-input
  Medium Filled on all profile screens.
- 05d (local admin): Sidebar Role=Local admin (new hidden „Rapoarte” item 15256:11580 in main 12673:12818, shown + Active), header role „Administrator
  local • ANSP”, Autoritate = text-input Disabled FILL, error notice bold lead, dialog „Publică” Disabled. 05f = clone of 04b screen (no warning notice,
  no header status / Publică, counts 2 / 4) + success toast (constraint RIGHT). 06b = modal 720 FIXED 852, content clip + `Modal / Scroll cue`, footer
  Restaurează (Neutral Leading EVO 20/refresh) + Închide, stray captured buttons deleted. 06c = restore dialog (info bold lead, counter textarea).
- 04a / 04b / 05f screens hug (Body minHeight + fixed page containers were holding 2792–3142).
- Arrows (connector clones of 15214:8344, end = 8×8 anchor on the target screen LEFT edge, top + 140, magnet LEFT): 04b „Publică” → 05f
  15265:17329 · 06b „Restaurează” (Flow anchor over the footer button) → 06c 15265:17654. Route audit not run.
- figma-audit FILE version on 05b/05d/05f/06b/06c: table-clip 3 fixed. Left majors: column-list rows (h2d-svg grips, ABSOLUTE row-divider „Text” —
  waiting for the redesign), header meta separators „Text” ABSOLUTE (05b / 05d), 05b „Track line” ABSOLUTE + tabs-track, raw-control 11 / clipped 2 not
  triaged.

## Done 2026-11-09 (job 5)
- Local component set **`Report column item`** 15271:15749 (🧩 Local components › Table & list): State Default / Hover / Selected / Menu open ×
  Divider On / Off (sparse: Hover + Menu open = Off only) — code renderStackItem + ekcfg-order lead: 72 high, pad 12/20 (Row with the 1 px top
  divider inside the 20 inset), Foundations 24/drag at 16 (icon/base/tertiary) + number 16 · title (Stack item / Title) + Tag 1–3 (exposed,
  Show tag 2 / 3) · Meta (Stack item / Meta, parts joined „  ·  ”) · exposed `More` = library Neutral Small Icon=Only ⋮ (Hover → white,
  Menu open → Active + Focus Ring/Medium). Props Title / Meta / Number. First row Divider=Off.
- All 44 column rows on 03u 03i 03h 03j 04a 04b 05b 05d 05f (+ 03x, 05j clones) = instances (no ↑ ↓; tags swapped to the old mains); the
  drag / ⋮ info-note text updated on 9 blocks („antet comun” = Body/Small 500).
- **rpt-03x** (clone of 03i): row 1 Menu open, row 2 Divider Off, `Menu · Column actions` 15273:14189 ABSOLUTE at screen level (180, p4 g2,
  radius-12, dropdown-effect, clip): Post-process menu · item Desktop (Mută la stânga Disabled 20/arrow-left, Mută la dreapta 20/arrow-right),
  Menu separator Desktop, Elimină Danger 20/delete; right edge = ⋮ right, top = ⋮ bottom + 8. Arrow 03i „⋮ Meniu coloană” → 03x (lane 1560).
- **rpt-05j** (clone of 04b): screen FIXED 900 clip + Overlay cloned from Widgete wid-04h (`Unsaved changes review`: group „Adăugat” 1, row
  „Coloana „Zile”” + tag Success). Arrow 04b „Modificări nepublicate” → 05j (lane 1528). Code state rpt-05k = the same dialog from the list row
  (not drawn; the brief's „05k” = 05j, the profile header source).
- Arrows: all 13 on the page = Widgete pattern (section 02: 04b Publică → 05f lane 1560, 06b Restaurează → 06c lane 1528, old in-screen start
  anchor deleted). **Route audit (stored `barrows/raudit`): 0 findings, 2 crossings.**
- Section 02 fixes: captured `List Item` ABSOLUTE → in flow (04a/04b/05f); preview table containers HUG (were 0.16 px short → clipped +
  fractional chain); 04b Table clip on; 05d editor header buttons („Button - Coloana N”, ABSOLUTE reset buttons) → `Column header` /
  `Header label` in flow; header cells „title + Manual tag” → VERTICAL gap 4 right-aligned; 05b meta separators → `Separator` frames in flow
  (row gap 24); 05b tab `Track line` rectangle → bottom stroke on the tabs wrapper; 04b status paragraph HORIZONTAL; 05d „Despre raport” →
  `Info trigger (tooltip)`. `Widget type card` strokes no longer in layout → radio cards 80 / 96 like the code (was 84 / 100).
- Section 01 fixes: 60 frames with 1.5 strokes (Total rows) strokesIncludedInLayout off (texts were at y 14.75); header cells with half-pixel
  text → top-aligned (= code padding 8) / centred group label FILL; 03h truncated cells = FILL + ellipsis, „Formula aleasă” rows HORIZONTAL
  (label 80, gap 12), type cards row = GRID FLEX 245/246/245, Heading 3 border off; 03u menu-trigger clip on (ring).
- figma-audit FILE version stored as root shared plugin data **`uiqa`/`auditfile`** (run: `new AF("ROOTS_IN", src)([ids])`, majors listed,
  minors only counted; descriptions trimmed, sibling-overlap / nav-active-icon rules dropped — use the repo file for those).

## Audit result 2026-11-09 job 5 (file version, all 19 blocks of sections 01 + 02)
- Majors left: **clipped-content 12 = all intended** (wide preview tables / rpt-01 table cut sideways by their scroll box; heights match),
  **fractional 4** (03o filter „Rule row” selects 265.5 — the row is 587 wide, needs a GRID 265 / 266 or a whole-pixel row), **tight-gap 2**
  (06b / 06c `Tab Panel` gap 0 between info-note and the Versiuni section — the section's own padding gives the space; padding-no-gap rule,
  likely a false positive — confirm visually). Minors: spacing-unbound ≈ 150, fixed-width-container ≈ 50 (not touched).

## Done 2026-11-09 (job 6)
- Section 03 built (8 blocks). 07a / 07b = clones of the fixed rpt-01 screen (no table re-pass): 07a ⋮ RPT-0002 State=Active + Focus Ring/Medium
  (ring cut by the Pinned column clip), `Menu · Row actions` 15285:20611 ABSOLUTE at screen level (clone of the 03x menu: Editează 20/edit, Clonează
  20/copy, Dezactivează Danger + Foundations pause at 20), top = ⋮ bottom + 4 (= code 273); 07b = local Modal Type=Confirmation in the 05j Overlay,
  screen FIXED 900 clip, title wraps 2 lines. 07d = chain2 capture; Filtrare + Statut raw buttons → library filter-chip Selected + Counter Badge „1”.
- 08a: grants = `svc/stack-item` instances (Title = role, Tag 1 = tag-filled Subtle Neutral / Brand, Meta 1 „Acordat de … · date”, Neutral action
  swapped to button-outlined-rectangular Destructive Small „Revocă”), Row padding 12 (spacing-12) + Content gap 4 overrides = code 72 rows, divider =
  bottom stroke, last 0; section header Action „Acordă acces” shown; Salvează Disabled. 08c = clone of the fixed 08a + the captured dialog Overlay;
  roles = `Document option · checkbox` chips (Director Disabled). 08f = Empty state · boxed + Show action „Acordă acces”. 10b = audit-record modal
  (event tab tag „Rapoarte” sits under the title — same instance limit as wid-09c), screen = modal + 48 (1731) clip. 09c = chain2 step 0 + step1,
  then values set by hand (stepper Current / Completed underlined, Statistice selected, source Filled, 42/150, 117/500, RU/EN hints); the list page
  behind the sheet deleted; preview header cells renamed Column header / Header label; ⓘ = Info trigger.
- Arrows: 07a „Dezactivează” → 07b, 08a „Acordă acces” → 08c (lane 1528, end flush on the target's right edge, top + 140) + cursors; cursors added on
  03i ⋮ (15285:38879) and 04b „Modificări nepublicate” (15285:38886) — 03i now has 2 cursors (brief asked; rule says max 1 per screen).
  Route audit: 15 connectors, 0 findings, 2 crossings.
- Leftovers fixed: 03o Rule row selects 265 / 266; 05j change detail = Stack item / Meta 12/20, date on its own line (3 lines = code).
- Start here 03 line „— 8 blocks”; index card **Card · Rapoarte** 15285:38893 (Index · GEAP 2.0 › Administration › Cards). Staging deleted.
- figma-audit (file version): 07a / 07b / 08a / 08c / 08f / 10b / 03o / 05j = only the intended sideways table clips. Left majors: 07d table
  sticky cells ABSOLUTE (Header Cell / Table Cell / Container from the capture — needs the rpt-01 [Table scroll | Pinned] pass) + 3 captured
  h2d-svg icons in its table; 09c preview table header Column header cells still ABSOLUTE inside their „Header label” wrappers (check like 05d).
  Section 01 / 02 not fully re-audited this job (only 03o, 05j).

## Done 2026-11-09 (job 7, final fixes)
- rpt-07d table = rpt-01 pattern: `Table - Rapoarte` 15293:18518 VERTICAL [Rows · 1 (header) | group row | Rows · 2], each Rows = Pinned column ·
  start (No shadow, ID cell) | Table scroll (clip) › GRID 7 cols | Pinned column · end (Shadow, ⋮ cell); row heights 38 / 36 / 50 kept; the ABSOLUTE
  shadow-decor `Container` deleted. Its only captured svg icon (group row) → 20/page-text (clone of rpt-01's). No other raw vectors on 07d.
- rpt-01 / 07a / 07b: `Rows · 1` Pinned column · end held a NESTED stale Pinned column (the whole 460 px original column clipped to 38) → replaced
  by its header cell only. 07a's Active ⋮ sat in that hidden copy; now the visible RPT-0002 ⋮ (Rows · 2) = State Active + Focus Ring/Medium +
  clip ON (spread rings render only with clip on) — ring fully visible inside the 56 cell, menu still at ⋮ bottom + 4.
- rpt-09c: header `Header label · *` wrappers HUG + `Column header · *` padding 0 (were 16 FIXED with a 24 / 40 child overflowing). No ABSOLUTE left
  except the Overlay / close / field icon (intended).
- rpt-03i: second cursor (⋮) deleted — 03u already has its cursor (Din sursa de date) and shows the Adaugă coloană menu open, 03e is a drawer, so the
  03i ⋮ → 03x arrow keeps its edge anchor without a cursor. Route audit: 15 connectors, 0 findings, 2 crossings.
- figma-audit FILE version (`uiqa`/`auditfile`, also `auditfull`) on all 27 blocks: majors = clipped-content 19, all `Table` cut sideways by their
  scroll box (intended); minors fixed-width-container 47, spacing-unbound 141. tight-gap on 06b / 06c removed by a rule fix (a block right ABOVE a
  section header = the heading's own inset; repo tools/ui-qa/figma-audit.js + both stored copies). Start here counts 11 / 8 / 8 current.

## Open (next job)
- (job 5) DONE: 05j pending dialog, column list redesign, arrows re-routed + audit 0, section 02 triage. Still open: rpt-05k (same dialog from the list row,
  rpt-01 → no block), rpt-03w / 03y (preview column tint `background/brand/secondary` on hover / header pick — not drawn), cursors for 03i ⋮ and 04b status
  (one cursor per screen already used / none placed in section 02), 03o fractional selects, 05j dialog detail text 2 lines vs code 3 (Change row
  detail is 12/16, code 12/20).
- 05b has no incoming arrow (no draft profile block); 05d none (blocked); 06b none (no Versiuni tab block rpt-06a). Cursors not placed.
- Radio cards render 84 / 100 vs code 80 / 96 (Widget type card paddings) — check the component against `.e-permits-wid-type`.
- **05b leftovers**: notice bold lead „Prima publicare: versiunea 1.” not bold (text split — find by „Prima publicare”); textarea taller than code
  (128 vs 78) + counter „0/500” should sit right (hint left) → `Text input · counter` pattern; Nivel radio cards behind the scrim lost borders
  (run `rpt`/step1-like Widget type card swap); preview table behind = captured AFTER the total-row change (fine), check widths.
- **Section 02 still to build: 05d (publish blocked), 05f (published + toast), 06b (Versiuni window), 06c (restore confirm)** (+ 05j
  pending-changes dialog when the code lands). One capture at a time with `rpt`/chain2 (staging section deleted — recreate „Build assets ·
  Rapoarte” x 7000, pass its id). Moving a capture with SF Mono text throws in appendChild: convert fonts in place first.
- Arrows (coordinator decision: end anchor = target screen LEFT/TOP edge, never inside): not started; section 02 has no arrows yet
  (04a „Publică” → 05b, 05b → 05f, Versiuni tab → 06b → 06c); re-route the 9 flagged section-01 arrows; then `barrows/raudit` clean.
- figma-audit FILE version on 01 + 02: not run this job.
- Column list rows = `Report column item` instances since job 5.
- Stored `vfit`/`fit` (PAGE, SIDS, ALL, APPLY, SHOWTALL) found 0 overlays on section 02 — fitted 05b by hand.

- **Section 02 left: rpt-04b („Perioada” grouped header: rule across the group, verticals only at group edges), 05b (first publish dialog),
  05d (publish blocked), 05f (published + toast), 06b (Versiuni window), 06c (restore confirm)** — capture one at a time with `rpt`/chain2.
- rpt-04a: column rows 4–5 meta overflows into the actions (the parts container wraps but its parts stay one line — rebuild the meta like
  03j row 6, or set the row main FILL + text parts HEIGHT); „Salvează” header button state vs code not checked; screenshot-compare with code.
- Route audit (stored `barrows/raudit`): 9/9 arrows flagged `block` — every end anchor sits INSIDE the target screen (right − 16, the column
  pattern). Needs a re-route pass (end anchors in the right gutter, magnet RIGHT) or an audit exemption — decide once for the board.
- Audit minors / majors left: captured drag-handle icons `h2d-svg-use-0` (image-fill-icon, 10 on 03j/03h/… List rows) need a Foundations grip
  icon; order numbers fractional x 3.5; fixed-width action containers 124; header pR 80 unbound. Blocks 03, 03a, 03o, 03u, 03e, 03i, 04a not
  re-audited after the fix pass (batch 1 = 01, 03j, 03h, 03q).
- Warning bold lead on 03q set to Onest Medium (code looks 600) — confirm.

## Open (column 01, older notes)
- **rpt-03j (manual column drawer) not drawn** — budget. Capture with `tools/figma/kpi/cap.sh rpt-03j <cid>` (SETTLE 15000), `rpt`/`chain` noFit,
  `rpt`/`drawerfit`, then the 03h fixes (type cards with „Completată manual” Selected, RU / EN Default, counter). Insert after 03h + arrow from 03u item 3.
- rpt-01 table: sticky ID column cells + the group-row Container 15186:1053 + pinned ⋮ are ABSOLUTE (qsweep/absflow leaves tables with category
  group rows); audit `absolute-in-flow` majors there. Needs a table pass ([Table scroll | Pinned] + group rows in flow).
- rpt-03h: „Includerea în total” radios wrap narrow (Field Set not found by the fix); Antetul comun hint inline-message overflows; A operand select.
- „Adaugă coloană” has the plus only (code: plus + chevron; library button has no two-icon variant).
- Preview empty state glyph = chart (code: document icon); review / structure filter separators „și” are Code-token frames (as KPI 14780:6148).
- 03e group headers set State=Open; dictionary rows = svc/stack-item with Show actions + Show neutral → Secondary „Adaugă” + plus.
- The full figma-audit file version was not pasted; the stored `uiqa/auditfull` (has absolute-in-flow) was run: majors left = rpt-01 table sticky
  cells (above), image icons fixed on rpt-01, list page behind sheets deleted.

## Done 2026-11-10 (job 8, section 01 vs current code)
- `Report column item` 15271:15749 redesigned (instances inherit everywhere, sections 01 + 02): drag handle = library button-text-rectangular
  Strict Icon=Only Small + 24/drag; tags + ⋮ removed (props Show tag 2/3 deleted); `Actions` = exposed `Group` (BOOLEAN `Show group`, default off)
  + Destructive Icon=Only Small 16/delete; State `Menu open` renamed **`Moving`** (handle Focus); Main gap 4, rows hug (72 / 92 with 2-line meta).
- New local set **`Button / Group toggle`** 15392:16600 (Menus & tooltips): Level Off / Disabled (library Strict + numbered-list 16) / 1 / 2 / 3
  (black background/base-inverse/default, white digit, radius-6).
- Stored **`rpt`/`prevfix`** `new AF("SIDS", G("prevfix"))([screenIds])`: split row → GRID 2 cols FLEX 5 / 7 (= code 570 | 798), row HUG; preview
  Head gap 4; preview Table GRID col 1 FLEX + others FIXED whole px, cells FILL, no dashed lines, table full-bleed in the card (Article pad L/R 0,
  title + caption re-padded 24). Run on 03, 03a, 03i, 03x, 03u, 03e, 03h, 03o, 03q.
- 03i / 03u / 03x: metas „Câmp … · Din sursă / Calculată · Inclusiv”, Serviciu = group toggle Disabled, values = code (73/199/145 …), info-note
  removed, column widths 239/119/118/117/203. 03u menu without „Completată manual”. 03x = keyboard move (Depuse at 3, State Moving), column
  menu deleted, arrow relabelled „Mută (mâner, ↓)”. 03j block + its arrow deleted. Block titles / notes of 03i 03u 03x rewritten.
- 03 / 03a Date generale: Categoria = select-input („Alege”; 03a Destructive „Alege categoria raportului.”), Nivel = text-input Disabled „Global”,
  Autorități = select-input + chip row `Authorities field` (tag-filled Subtle Neutral „Toate autoritățile” — coordinator: select-all lives IN the
  dropdown, field shows one chip), RU / EN names + descriptions stacked, RU / EN descriptions = text-area clones. Screens grown to 1724 / 1712.
- Audit (file version) on 03 03a 03i 03x 03u + both sets: 0 majors (1 fractional fixed), 23 spacing-unbound minors. Start here „— 10 blocks”.

## Open after job 8 (exact leftovers)
- **Not built: rpt-03aa** (Categoria rich dropdown open: icon + label + description, check on selected — use `Dossier / Step menu · action`
  9714:5965 items in a p4 g2 radius-12 dropdown-effect frame), **rpt-03ac** (authorities multi-select open, first item „Toate autoritățile” +
  separator, search „primăria”; `Dropdown / Checkbox option` 14131:71011), **multi-level grouping block (rpt-12c / 12h)** and **inline filters
  block (rpt-15a / 15c)** + chips (rpt-13a / 13d) — each with the note „Proposal for PO (Alexandru) — differs from Feature 96502”.
  The chain2 capture of create states is NOT usable as is (swap turns stack metas into text-inputs, ↓ icons, wrong stepper, list page behind) —
  clone a fixed screen + edit, or capture and rebuild by hand.
- 03o / 03q content still old: Structură needs the ordered level list (1 Autoritate …, „Elimină gruparea”) + inline filter rows („Unde / și · sau”
  line, handle · nr · ☐ Afișează filtru · trash, Câmp, Condiție | Valoare); 03q review rows (Coloane 6 incl. Autoritate, Structură „1. Autoritate,
  cu subtotal pe grup”), preview with group rows + subtotals (code rpt-03q). 03e / 03h behind-scrim page = old list layout (only split fixed).
- Nivel read-only hint „Generat: raportul Administratorului central este global.” missing (library text-input Disabled has no assistive slot).
- rpt-01 list: check icon-table on „Rapoarte tabelare” group row (code), not compared this job. Preview column outline (2 px brand r8) on 03i
  not drawn; 03i/03u/03x row-4 meta wraps at a different word than code (meta part gap 18 in code).
- Handle icon = Strict (dark) — code btn-text-neutral is grey 117; library text button has no Neutral style.
- `Button / Group toggle` sits under `Button / Menu trigger` in Menus & tooltips — re-run localcomp/layout for that section if it overlaps.
- Arrows: anchors moved with their blocks (connectors still attached, 9); route audit `barrows/raudit` not re-run.
- Stored `rpt`/`restack` throws „children of null” after a block is deleted — restacked by hand (y-range assignment of anchors / cursors).

## Done 2026-11-10 (job 9, section 01 finish)
- Autorități field (03 / 03a + clones) = code order: select-input (star, Filled „Toate autoritățile”, Assistive off) · Chips (library
  **input-chip** 8344:81630 „Toate autoritățile”, 36) · hint = library `inline-message` cloned from the select (same text as code). Field 160 = code.
- New local pieces (🧩 Local components): **`Dropdown / Search row`** 15415:18227 (Filled False/True, TEXT Value) · **`Dropdown / Multi-select
  footer`** 15415:18228 (Count / Label + Primary Small „Confirmă”) [Menus & tooltips] · **`Button / Drag handle`** 15418:17726 (Default / Hover /
  Focus; grey icon/base/tertiary, detached library text button) · **`Report level item`** 15421:16622 (Level 1/2/3, indent 0/16/32; Name, Number) ·
  **`Report condition row`** 15421:16940 (State Default / Active grey band; exposed Show filter (checkbox-label), Field, Condition, Value) [Table & list].
  `Report column item`: handle → Button / Drag handle; TEXT `Group label` + BOOLEAN `Show group label` („· Grupare N”, Title row gap 4).
  `Rule builder / Combinator` 12957:2889: BOOLEAN `Show chevron` (off = „Unde”).
- 03ae / 03ac: `Menu · Authorities` ABSOLUTE at screen level, 4 above the field (opens upward like code), 528, radius-12, dropdown-effect, clip:
  Search row · List (p4 g2; `Dropdown / Checkbox option` + `Menu separator` under „Toate autoritățile”) · footer. Stored **`rpt`/`msmenu`** (SID, OPTS).
  03ac: no chips, placeholder, search „primăria”, 6 primării, „0 selectate”. 03aa: `Menu · Categoria` (Step menu · action ×2, central
  „table, spreedsheet, chart” + Foundations 20/chart, 8 below the field). Step-1 screens = dialog bottom (1760 / 1748 / 1716).
- 03o: Gruparea = Report level item + „Elimină gruparea” (button-text-circular Destructive Leading); Filtre = Unde · condition rows · „și ⌄” ·
  „Adaugă condiție” (Secondary) + „Adaugă grup de condiții” (text Primary); stored **`rpt`/`struct`** (SID, {levels, conds[{field, op, value,
  opDisabled, ask, input, show, active, join}]}). Preview table = clone of the synced 03q table + chips „Data depunerii ⌄ / Statut dosar ⌄”
  (filter-chip Mono Trailing) under the caption; switch-label FILL (text overflowed). 03q: values = code, „Subtotal <group>” spans 2, group rows
  Body/Small 500, Structură „1. Autoritate, cu subtotal pe grup”, screen = dialog bottom 1330.
- PO blocks (clone of 04a, GRID 5 / 7 split, form overflow fixed): **12c** RPT-0008, 7 columns (Grupare 1/2/3 toggles, Tip solicitare Disabled),
  3 levels, Filtre = Empty state · boxed (filter-2), nested preview built by stored **`rpt`/`ntable`** (SID, DATA rows G/S/D; data in `rpt`/`data12c`),
  indents 12 / 28 / 44 (28 / 44 off-scale = code +16 steps, listed not snapped); **15a** = conditions „Autoritate este ANSP” + „Data depunerii în
  ultimele N zile 120 zile” (Active), „Condiții: …” meta, filtered values. Both notes start „Proposal for PO (Alexandru) — differs from Feature 96502”.
- Arrows: 03 Categoria → 03aa (lane 1592), 03 Autorități → 03ae (1624), 03ae Caută → 03ac (1528). Route audit 17 connectors, 0 findings, 3 crossings.
  Start here 01 „— 15 blocks”. Section restacked (240), h 31596. No captures / staging used.
- figma-audit FILE (`uiqa`/`auditfile`) on 03 03a 03aa 03ae 03ac 03o 03q 12c 15a: majors = clipped-content (preview tables cut sideways by
  their scroll box — intended) + tight-gap on `Menu · Authorities` (flush padded children = padding-no-gap rule, intended); minors spacing-unbound 48,
  off-scale 16 (table indents), fixed-width 2.

## Open after job 9 (exact leftovers)
- 03i preview column outline (2 px brand r8, code rpt-03w / 03y) not drawn.
- rpt-15c (group of conditions, „sau”) and rpt-12h (toggles clicked 3·1·2 → Serviciu › Autoritate › Subdiviziune) not drawn as own blocks; 12c shows
  the toggles. Chips of rpt-13a (RPT-0002, 6 filters + „Mai multe”) not drawn; 03o has the 2 code chips.
- PO previews show the first authority only (ANSP, 22 rows, no Total) — code scrolls; Dosare group header cut at the clip edge like the code.
- 03aa items 50 high (Step menu · action) vs code 58; Nivel read-only hint still missing (library text-input Disabled has no assistive).
- Section 02 (04a / 04b / 05b / 05f …) still has the old Gruparea select + „Filtre la generare” rows and the 1 : 1 split — run `rpt`/`struct` +
  the GRID 5 / 7 split + form FILL pass there (whole-column rule). 04a „Coloane «Manual»” preview note still there.
- Index card Card · Rapoarte 15285:38893 not checked for a block count.

## Done 2026-11-10 (job 10, section 02 = current code profile)
- All 6 profile screens (04a 04b 05j 05b 05d 05f) = code rpt-11a layout: split row = GRID FLEX 5 / 7 (470 | 658, gap 24), HUG height; settings
  column = the rebuilt 04a column (form 15228:6266) cloned per screen by stored **`rpt`/`prof2`** `(SID, SPEC {cat, catIcon, auth, chips[], ro,
  roCount, ru, en, desc, descCount, cols[[title, meta, groupLevel?, groupLabel?]], levels[], groupEmpty, conds[], pchips[], caption})`:
  Categoria select Filled + leading 20/chart (tabelare = „table, spreedsheet, chart” 15418:932), Sursa, Nivel = text-input Disabled + `inline-message`
  hint („Level field”), Autorități select + library input-chips (WRAP) + hint, Denumire (RO) = `Text input · counter`, RU / EN stacked, Descriere
  RO / RU / EN textareas with Character Counter (field 134 = input 78), `Report column item` list (toggles Level 1 / Off / Disabled, „· Grupare”),
  Gruparea = `rpt`/`struct` levels or the „Fără grupare …” text in the card, Filtre = `Report condition row` + „Unde / și”, Rândul de total.
- 05d (local admin): Nivel „Autoritate” + hint „Generat: raportul se creează la nivelul autorității tale.”, Authorities field → text-input Disabled
  „Autoritate · ANSP · …”, preview perimeter ANSP · Registru note de plată. 04b / 05f / 05j header Nivel „Global · ANSP, ANSA”, 04b / 05j notice +
  „Vezi modificările” (brand 500 range). 04a Salvează Disabled; „Coloane «Manual»” notes removed.
- Preview tables rebuilt from the 03q template by stored **`rpt`/`gtable`** `(SID, SPEC {cols, head[{k,c,t,span,rs}], sub, rows, hug})` — kinds h0 h1 hg
  hEnd hs hs2 hi grp d0 d1 nG n nE sl sG s tl tG t tE, suffix „<” = left-aligned; values = code (04a grouped ANSP / ANTA / ANSA + subtotals, 04b / 05f
  / 05j Perioada 703 wide cut by the scroll box, 05b Specialist / Nr. dosar / Suspendate, 05d Suma, MDL). Article padding 0 (full-bleed table).
  Preview chips (filter-chip, from 03o) under the caption. 06b version table values + caption = code; 06c checked (no change).
- **rpt-13a** (new, section 01 after 12c): clone of 04a + 6 conditions, chips „Data depunerii · Autoritate · Canal de depunere · Tip solicitare ·
  Mai multe” wrapping on 2 lines like the code. Start here 01 „— 16 blocks”.
- Page-wide: 16 „Adaugă condiție / grup de condiții” buttons recreated (icon colour), group-row `Text` frames HUG (labels were cut), centred group
  header labels FILL (no .5 px), 29 description textareas 186 → 134.
- Audit FILE on 04a 04b 05j 05b 05d 05f 06b 06c 13a: majors = clipped-content 3 (Perioada tables cut sideways — intended) + raw-control 5 („Fără
  grupare” card = bordered container with text, = code `.e-permits-rpt-group-sum` box; false positive). Route audit 17 connectors, 0 findings, 3 crossings.

## Open after job 10 (exact leftovers)
- 03i preview column outline (2 px brand r8, rpt-03w / 03y) not drawn. 13a has no arrow (no source block on the board).
- 05b Gruparea text: code has an inline group icon („Apasă ⁝☰ la o coloană Text”) — Figma text says „Apasă butonul de grupare”.
- Code question: the „Fără grupare” card is ~240 high in the code (empty space under the text) — Figma hugs the text.
- 12c / 15a (PO blocks) still have Categoria / Nivel radio cards + side-by-side RU / EN — re-run `rpt`/`prof2`-style edits there (whole-column).
- Nivel value „Global” renders as disabled placeholder grey (library Disabled); code shows it a bit darker.
- Stored `rpt`/`restack` still broken; restack = y-range ownership by hand (snippet in job 10 call: blocks + non-connector children with cy ≥ block.y − 120).

## Done 2026-11-10 (job 11, section 03 vs current code + leftovers)
- Section 03 recompared with code (local 8935): 07a / 07b / 07d / 08a / 08c / 08f / 10b match except below. rpt-01 / 07a / 07b list: new row
  **RPT-0008** „Raport dosare pe autoritate, subdiviziune și serviciu” (Rows · 2 GRID now HUG, 4 rows; pinned slots + 1 cell; name + time truncate).
  07d: „Șterge filtrele” → button-text-rectangular Strict Small; open „Filtrare” chip = Focus Ring/Medium + clip (open-button rule).
- **09c** rebuilt = code: row = clone of 03's GRID 5 / 7 row (570 | 798), preview Article = clone of 04a's (RPT-0002 grouped ANSP / ANTA / ANSA,
  chips, caption), source select Filled + hint, **Categoria = text-input Disabled „Rapoarte statistice” + hint „Copia rămâne în categoria raportului
  sursă.”**, Nivel = `Level field` (Disabled + generated hint), Autorități select + chip, RU / EN stacked, descriptions with counters, expand enabled.
  Screen = dialog bottom + 24 (2042).
- Page-wide: 6 collapsed `Descriere (EN)` containers (FILL in a HUG row → 1 px, text-area outside the card) on 03 / 03a / 03aa / 03ae / 03ac / 09c →
  HUG, screens refitted (+182). 9 „Rândul de total” supporting texts (textAutoResize NONE, cut at 1 line) → HEIGHT. Band 01 text wraps.
- 03i: `Column outline · focus ring` (ABSOLUTE in the preview table's clip box, 2 INSIDE blue-sky/500 = Focus Ring colour, radius-8, Finalizate own
  header → Total) + item 3 State Hover (= code rpt-03w). 05b Gruparea text = word-flow WRAP frame with inline 16/numbered-list (code list-numbers).
- 12c / 15a: Categoria / Nivel / Autorități + Denumire sections = clones of the profile template (15228:6267 / 15228:6351): rich select + chart icon,
  Nivel read-only + hint, RU / EN stacked, RPT-0008 values (53/150, 120/500); header „Modificat 10 noiembrie 2026, 09:40”.
- Restack (y-range ownership, anchors / cursors moved): 01 h 37679, 02 h 18635, 03 h 13361. Route audit: 17 connectors, 0 findings, 3 crossings.
  Start here counts 16 / 8 / 8 (unchanged); index card 15285:38896 „32 screens — 32 in development …”. No captures / staging used.
- Audit FILE (`uiqa`/`auditfile`) on the whole page (00–03): majors = clipped-content 16 (all `Table` cut sideways by their scroll box — intended),
  tight-gap 2 (`Menu · Authorities` padded children, intended), raw-control 4 („Fără grupare” card = code box, false positive); minors
  spacing-unbound 236, fixed-width 32, off-scale 16 (table indents 28 / 44).

## Open after job 11 (exact leftovers)
- 10b: event tag „Rapoarte” sits under the title (code: inline after it) — needs the event-row component (sublayer direction override breaks).
- Sidebar: code now shows „Rapoarte” with a document icon and a „Tablouri de bord” item after it — the shared Sidebar mains (12673:12268 / 12818)
  still have 20/chart and no Tablouri de bord (file-wide component change, not done here).
- 05b grouping text is below the fixed 900 viewport (clipped by the screen) — correct but not visible; 09c stepper current label dark (code blue).
- Still open from job 10: Nivel „Global” disabled grey vs code darker; „Fără grupare” card height vs code; 13a no arrow; rpt-15c / 12h / 13a chips.

## Done 2026-11-11 (job 12, section 01 = stacked list, rpt-stack-list-v1)
- Local set **`Report list row`** 15485:16838 (🧩 Local components › Table & list): Screen Desktop / Phone × State Default / Hover / Menu open ×
  Divider On / Off (Phone = Default only). TEXT Title / Description (2 lines, ellipsis) / Meta („RPT-0008  ·  Statistic  ·  v1  ·  Global”) /
  Edited, BOOLEAN Show pending (`Header status` „Modificări nepublicate”), exposed Status (tag-filled Small) + More (Neutral Small ⋮).
  Desktop 104 = code; first row Divider=Off. Source tools/figma/rapoarte/report-list-row.js.
- Stored routines: **`rpt`/`listfill`** (CARD, ROWS, OPTS{phone, hover[], menu}) · **`rpt`/`setpager`** (P, A, B, TOT, ACT, MAXP) on `Pager · compact`
  12698:384436 · **`rpt`/`blk`** (SRC, ID, TITLE, NOTE, STATE, EDIT) block clone + label / link / note · **`rpt`/`facets`** (FB, CHIPS[[label, sel,
  count, open]], RIGHT{hint|results}) · **`rpt`/`facetpop`** (SCR, CHIP, ITEMS, SEARCH, WIDTH) facet popover from 03ae's `Menu · Authorities`
  (custom footer Confirmă + × Șterge). Data `rpt`/`rows1` (page 1).
- rpt-01 page = Page · Rapoarte [Header › Toolbar (search 400 · Filtrare · Sortează | export · Raport nou) (+ Facets) | Report list card r12] + Main
  `Footer · pager`. Sort chip = clone of the Filtrare chip + 24/sort glyph (the Registre „Sort chip” clone had a pill / pressed fill).
- New blocks: 01 · phone 15491:28542 · 01i 15487:72809 · 01k 15487:76533 · 01l 15489:22921 · 01m 15489:26833 · 01j 15490:24098 · 01c 15490:27354 ·
  01e 15490:28143 · 01f 15487:72025 · 03ag 15493:28906 · 03ah 15493:29570. 03ae / 03ac `Menu · Authorities` now opens BELOW the field (rpt-04l).
- Arrows from rpt-01 (lanes 1560 Filtrare → 01k · 1720 Sortează → 01i · 1752 Pagina 2 → 01j · 1656 ⋮ → 01f · 1688 row → 04a LEFT edge).
  Route audit (`kpi`/`raudit`): 22 connectors, 0 findings, 13 crossings. Section 01 = 27 blocks, h 67157.

## Open after job 12
- 03ag / 03ah: Denumire / category values of the code step1 (36/150 filled) not copied; Nivel generated hint still missing (old leftover).
- Phone block shows no phone sheet states (Filtre / Sortează sheets) — only the list. Phone header = BO desktop header instance at 375 with
  help + switcher name hidden (no BO Mobile switcher variant).
- Sidebar main: „Rapoarte” icon + „Tablouri de bord” item still old (shared component, job 11 leftover).
- „Creat de” / „Mai multe” open chips keep the chevron-down (filter-chip trailing icon not swapped to chevron-up).
- Not screenshot-checked after build: 01i menu position, 01l, 01m, 01f, 01j, 01c, 03ah.

## Done 2026-11-11 (job 13, section 02 = preview scope / fold / column hide / unsaved changes)
- New local set **`Button / Visibility toggle`** 15496:15950 (Visible 15496:15940 = library Strict Small Icon=Only + Foundations eye-open; Hidden
  15496:15946 = Group toggle Level 1 look + white eye-slash). `Report column item` 15271:15749 gained exposed `Visibility` before Delete (all instances).
- Stored routines: **`rpt`/`scope`** `(BID, LINES[[lead, text]])` = blue `Message · subtle` Info „Scope notice” under „Previzualizare” (grey data
  line removed, head = `Preview head` VERTICAL › `Title row` + notice, gap 16); **`rpt`/`fold`** `(BID, FOLDED)` = group rows get a `Fold` chevron
  button (Strict Small, 16/chevron-bottom / -right), cell pad −8, 40 high, level 1 tertiary; **`rpt`/`ftable`** `(SID, COLS[{w,num}], ROWS, FOLDED,
  ROOT)` grouped preview table from code rows (`rpt`/`rows0009` = RPT-0009). Run on every preview block of sections 01–03.
- New blocks (section 02, order): 04a · **04o** 15500:27379 · **04q** 15505:28305 · **04r** 15506:35472 · **04t** 15505:32752 (= 04s too) · 04b · 05j ·
  **04n** 15507:31176 · **04m** 15511:31950 · **04l** 15511:36177 · 05b … 06c — 15 blocks. 04p = covered by 12c (RPT-0008, grouping-only notice).
- Arrows (lanes): 04o eye → 04t 1592 · Fold → 04q 1624 · Mărește → 04r 1656 · 04n status → 04m 1528 · 04m Vezi → 04n 1688 · 04n field → 04l 1592.
- Audit FILE on 8 blocks: 0 majors (clipped Fold fixed: group Text frames unclipped page-wide). Route audit: 28 connectors, 1 overlap fixed after.

## Open after job 13
- **04r / 04m Overlay does not render** (Overlay ABSOLUTE in the VERTICAL screen, y was −900 after the screen resize; reset to 0 but still invisible
  in screenshots) — re-check absoluteRenderBounds, maybe re-append the Overlay after the resize.
- 04l: field chevron should be chevron-top (open); menu items text not verified; 04l header still has Publică (code unknown).
- 04o / 04q / 04t: Acces tab count „1” should be hidden (RPT-0009 has no grants); Nivel „Global” disabled grey (old).
- No cursors on the new arrows; list row → 04a arrow not found / not re-anchored on the RPT-0002 row.
- Visual pass of 01i 01l 01m 01f 01j 01c 03ah + facet chips chevron-up: not done (budget).
- Route audit not re-run after the lane move; 05j not changed (code 05j still Închide + Publică).

## Done 2026-11-11 (job 14, dialogs + column split)
- 04r / 04m: the Overlay had a flipped relativeTransform ([[1,0,0],[0,-1,0]]) after the screen shrink → rendered upward, outside the clip. Reset to identity.
  04r enlarged table rows = code (header 34, group 40, data / subtotal 48). 04m: Change row divider sits on TOP → Row 1 Show divider off, Row 2 on; strikethrough removed.
- 04l field chevron → 20/chevron-top (9814:8284). 04o / 04q / 04t Acces tab badge hidden. 01k / 01l / 01m Facets pB 16 (spacing-16, = code 32 to the list);
  open facet chips (Creat de, Mai multe) chevron-top. 01j pager ‹ enabled. 01c search State Focus + empty glyph Foundations 24/search (5:796).
- Column split: section 01 = list (9), new section **02 · US-467 Create report 15520:1029** (17, restacked 240, h 41599); later sections +1880 and renumbered
  03 / 04 (names + bands). Start here = 4 linked lines; index card 15285:38893 = 4 rows, 49 screens.
- Arrows: stale 03 Categoria / Autorități start anchors moved onto rpt-03's fields; cross-column arrows (01 Raport nou → 03, row RPT-0002 → 04a, lane 1784)
  = TOP→TOP with end anchors above the target blocks (y 404 / 388). Cursors: 04o Fold, 04n status, 04m Vezi. Route audit: 28 connectors, 0 findings, 10 crossings.
- Annotations: all 49 blocks have label + Prototype link (state = id) + note; 31 note titles synced to the label title, 3 notes rewritten (03i eye, 04a notice /
  fold / eye, 12c ≤ 45 words). Clip sweep: 26 wrappers unclipped (Authorities field on 03ae / 03ac / 04l cut the focus ring; Body / Main / Page on 07a/b/d),
  17 table `Rows` / `Container` re-clipped (table rule).
- Audit FILE on 13 touched blocks: fractional 500 = the profile GRID 5 / 7 split (463.33 columns, pre-existing since job 10), clipped-content 73 (tables + not
  triaged), ring-no-clip 2, raw-control 2, tight-gap 4 — not fixed (budget).

## Open after job 14
- Profile GRID 5 / 7 split gives 463.33 / 658.67 columns on every section-03 block (fractional majors) — set FIXED 463 / 659 or GRID FIXED sizes.
- 03ag / 03ah: Categoria / Sursa / Denumire values (Rapoarte tabelare, Registru Dosare, 36/150), Nivel hint, preview title + „Nicio coloană încă”, chip names
  INCE = Inspectoratul Național de Control Ecologic, ASE = Agenția de Supraveghere Ecologică — not done.
- Section 04 (old 03): 09c vs rpt-03aj and 10b leftovers not compared. 01f menu top = ⋮ + 8 (code + 4). 04l AMDM item wraps to 2 lines in code.
- Screenshot check of the clip sweep not done; ring-no-clip 2 / raw-control 2 / tight-gap 4 not triaged.

## Done 2026-11-11 (job 15, finish pass)
- 03ag / 03ah = code: Categoria Filled „Rapoarte tabelare” + leading „table, spreedsheet, chart” (in the select's `Input` slot, NOT the hidden chip icons),
  Sursa Filled „Registru Dosare · v1.2.0”, Denumire (RO) „Raport dosare finalizate pe serviciu” 36/150, preview title + caption (container cloned from
  03i 15200:6678, pad L/R 0), empty state „Nicio coloană încă”; 03ah chips INCE = Inspectoratul Național de Control Ecologic, ASE = Agenția de Supraveghere Ecologică.
- Nivel generated hint (`Level field`, clone of 15441:34339) on every create step-1 screen: 03 03a 03aa 03ae 03ac 03ag 03ah; Nivel→Autorități gap 24;
  screens refitted to dialog bottom + 24 (+44), `Menu · Authorities` re-anchored 4 below the field, lower anchors / cursors moved +44.
- 01f: menu was already ⋮ box bottom + 4 (the 8 read = the 5 px focus ring). No change.
- Section 04: 07a / 07b / 07d rebuilt on the stacked list (clones of 01f / 01k screens): 07a RPT-0002 Menu open + menu at ⋮ + 4 (arrow anchor + cursor
  moved to „Dezactivează”), 07b = list behind the old confirm Overlay (FIXED 900 clip), 07d = facets Statut ●1 + „4 rezultate”, 4 Dezactivat rows
  (`rpt`/facets + `rpt`/listfill), pager removed, Filtrare chip Selected + badge 1. **09c → rpt-03aj** (block 15285:38839 relabelled, link
  state=rpt-03aj): RPT-0009 source, 52/150 name, 133/500 description, RU / EN empty, no chip for „Toate autoritățile”, scope notice 3 lines + preview
  article cloned from 04o (folds), table tracks 120 / 265 / FLEX / 120 / 120.
- Audit FILE on 30 blocks: fractional 0 (profile 5 / 7 split = col 1 FIXED 463 + col 2 FLEX on 16 grids); RPT-0009 preview tables 656 in a 647 card
  → col 2 FLEX (04o 04q 04t 04r 04n 04m 04l); ring-no-clip 3 → field-card clip ON (04n 04m 04l); 21 `Chips` wrappers unclipped + long chips capped to the
  field width (ellipsis). Left = intended: 3 Perioada tables cut sideways (04b 05f 05j), tight-gap 3 (`Menu · Authorities`), raw-control 4 („Fără grupare”
  box), off-scale 8 (indents 44). Route audit: 28 connectors, 0 findings, 10 crossings. Start here 9 / 17 / 15 / 8, index card 49 — current.

## Open after job 15
- 10b: event tag „Rapoarte” still under the title (code inline) — needs an event-row component.
- 04l: AMDM option wraps to 2 lines in code (Figma 1 line). Nivel „Global” disabled grey vs code darker (library Disabled).
- 03aj table rows 36 vs code 48 (04o template); sidebar „Rapoarte” icon / „Tablouri de bord” item (shared main) still old.

## Done 2026-11-11 (job 16)
- 03ae / 03ac step-1 filled like 03ag (code rpt-03ae / rpt-03ac): Categoria + Sursa State=Filled (+ leading table icon on Categoria), Denumire (RO) Filled „Raport dosare finalizate pe serviciu” 36/150, preview title container cloned from 15522:37490 + „Nicio coloană încă”; menu / focus untouched; audit FILE = 0 majors (tight-gap on the known `Menu · Authorities`).

## Done 2026-11-12 (job 17, column 05 „BackOffice — consult & generate”, Feature 96587, code cbd3ea98) — STOPPED AT THE CALL CAP
- Section **05 · BackOffice — consult & generate 15569:33876** (x 8720, band 15569:33877). Blocks (restacked 240, h 13817): rbo-01 15572:190807 ·
  rbo-01b 15572:191304 · rbo-01c 15572:192666 · rbo-01a 15572:192949 (supervisor — visibly different: sidebar, 13 reports, perimeter) · rbo-03 15589:1308 ·
  rbo-05 15590:1001 (menu 15590:2585) · rbo-07 15572:194163. Start here line „05 … — 7 blocks” 15592:1001 (NODE link). Staging deleted.
- Sidebar mains Specialist 12673:12623 / Supervisor 13176:547010: hidden `Group · Dashboard` (24/carousel) + hidden `sidebar-list-item · Rapoarte`
  (20/page-text) — shown + Active by stored **`rpt`/`rbosb`** `(SCR, ROLE, SHOWRAP)` (also hides Configurare, sets header role text).
- Stored **`rpt`/`rbolist`** `(LIST, DATA)`: captured grouped list → `svc/stack-group-header` Open + `Report list row` (Status / More / Edited hidden).
  **`rpt`/`rboblk`** `(ID, TITLE, NOTE, SID, Y)`: block from 07d's label / note around a screen.
- `Button / Menu trigger` 15219:16571 got **Style=Neutral** variants (15588:3831 / 15588:3837; old ones renamed Style=Secondary).

## Open after job 17 (next agent)
- **Bug: the Neutral Menu trigger variants show „Adaugă coloană” + plus** — the cloned variants lost the Label / Leading icon property bindings.
  Re-bind (text.componentPropertyReferences = {characters: Label key}, icon instance → Leading icon) and set the export icon (central „arrow-inbox,
  download” set 80dbbcd5…, filled=on) on rbo-03 15583:3796 / rbo-05 15590:1029; HUG width (now 170 FIXED, code ≈ 114). 05 trigger = State Open.
- **Not built (5): rbo-02** (clone 03 → table container → Empty state · boxed, 24 table icon, „Raportul nu este generat încă”, Exportă disabled, no meta),
  **rbo-06** (clone 02 → 24/calendar, „Nu există date pentru perioada selectată.”, Perioada 2025, meta), **rbo-04** (clone 02 → RPT-0049 Lista actelor
  emise, 3 chips, Generează Primary + trailing chevron Open, menu of 2 `Dossier / Step menu · action` with Hint), **rbo-09** (clone 03 → Statut Selected
  + badge 1, „Filtre neaplicate · Renunță · Aplică filtrele” row, Message · subtle Warning 16 above the table), **rbo-08** (RPT-0049 flat 5-col table
  with Titular / IDNP — capture or rebuild).
- Perioada chip: code has a × after the chevron (filter-chip has no remove slot) — not drawn. rbo-03 Section height 894.84 (fractional).
- Arrows not drawn (list row → 02/03, Generează → 04 → 08, filter change → 09, Exportă → 05). figma-audit not run. Index card not updated.
- List screens are 1607 high (rbo-01b / 01c / 07 should hug to 900) — run `vfit`/`hug`.

## Done 2026-11-12 (job 18, column 05 continued) — STOPPED: Figma writes hung 15–20 min each (≈ 55 calls)
- `Button / Menu trigger` 15219:16571: Neutral variants 15588:3831 / :3837 re-bound (Label + Leading icon); NEW **Style=Neutral, State=Disabled 15615:3995**
  (background/disabled/default + text/disabled/default on label and icon). rbo-03 15583:3796 / rbo-05 15590:1029 = „Exportă” + export icon
  „arrow-inbox, download” filled=on 1.5 r2 (10272:6788), HUG 116.
- **rbo-02 15606:1001** (screen 15606:1008, y 14400): Empty state · boxed (table icon 15418:922 = central „table, spreedsheet, chart”), no meta,
  Exportă Disabled, screen hugs 900 (Body min 868, page Containers HUG, Main FILL).
- **rbo-06 15619:1294** (y 15600): clone of 02 — „Nu există date pentru perioada selectată.”, meta line, Perioada 2025, Exportă Default. Icon = 20/calendar
  244:20248 (the imported Foundations 24/calendar 15603:935 was rejected by the Icon swap) — swap to a 24 calendar.
- **rbo-09 15623:1356** (y 16900): clone of 03, NOT filled (label may still read rbo-03). To do: label ids 15623:1359/1360/1362, note 15623:1630/1631;
  Statut chip 15623:1390 Selected + Counter Badge „1”; „Pending filters” row (Filtre neaplicate · Renunță · Aplică filtrele) under 15623:1386;
  Message · subtle Warning 9845:17943 in a wrapper (pb 16) at index 1 of Section 15623:1396.
- Still open: rbo-04 (Generează options menu), rbo-08 (personal data table); hug rbo-01b / 01c / 07 (+ 03 / 05 / 09: Body minHeight 1155 + FIXED
  Containers, fix like rbo-02); restack 240 (order 01 · 01b · 01c · 01a · 02 · 03 · 09 · 04 · 08 · 05 · 06 · 07); arrows; Start here count
  (15592:1001) + index card; figma-audit FILE; header „Button - Despre raport” + group fold buttons are raw captured frames (h2d-svg).

- Chips round + RAP × (2026-11-12, code `rbo-chip-group-v1`, `chipGroup: true` in js/rapoarte-bo.js): an applied filter = the RAP grey pill group [chip][round ×] (EVO-WEB 3.0 22622:26715), not the black chip with an inner ×.
- The Figma blocks rbo-02/03/05/06/09 (node 15590:1034 chips row) need the same chip-group instances (Filter group, 40 high, × 36 round); every chip, applied or not, a pill.
- New state rbo-02a (2026-11-12, code `rbo-clear-v1` + `rbo-period-required-v1`): Perioada cleared with the chip × = plain „Perioada” chip with a danger border + „Alege perioada raportului.” (error icon) under the bar; „Generează” without a period shows the same and focuses the chip.

- BO list blocks rbo-01 / 01a / 01b / 01c (2026-11-12, code `rbo-list-toolbar-v1`): the list is now the admin registry look — heading „Rapoartele tale · N rapoarte · Perimetru” ABOVE the toolbar, then search + „Filtrare” chip + „Sortează” chip (phones icon-only in the search row), then the category groups; no Export button. Redo the blocks from rbo-01 / rbo-01d (filter) / rbo-01e (sort menu).
