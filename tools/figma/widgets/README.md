# Widgets board — Feature 96501 „Configurarea widget-urilor” (2026-11-07)

File GEAP 2.0 `aHgwVwiNCOSOqbMhMjjUOj`. Page `↳ BO -> Widgete` **14861:56367** (right after `↳ BO -> KPI` 14726:516). Desktop 1440 only.
Built exactly like the KPI board — read `tools/figma/kpi/README.md` first (chain, block format, arrows, annotations, sheets).

## Board structure
| Section | id | x | Blocks |
|---|---|---|---|
| 00 · Start here | 14861:56368 | 0 | card `Board title · Widgets` 14861:56369 (ID chip WID, title, description, Contents = one NODE-linked line per section + count 5 · 7 · 4 · 4 · 4) |
| 01 · US-404 List and access | **14861:56392** | 1200 | wid-01 14868:78104 · wid-01c 14868:78727 · wid-01e 14868:79793 · wid-01g 14868:80867 · wid-02 14868:81907 (DONE) |
| 02 · US-403 Create a widget | **14861:56399** | 3080 | wid-03 14898:8150 · 03c 14898:8188 · 03z 14898:8226 · 03z1 14898:8264 · 03z2 14898:8302 · 03n 14898:8340 · 03a 14898:8378 (DONE 2026-11-07) |
| 03 · US-409 Chart types | **14861:56406** | 4960 | wid-08 14919:42971 (stacked bars) · 08g 14919:43383 (bars + KPI) · 08a 14919:43795 (aggregated table) · 08h 14919:44207 (tile) (DONE 2026-11-07) |
| 04 · US-406/407 Publish and status | **14861:56413** | 6840 | wid-03u 14927:22532 · 03v 14927:12951 · 06 14927:17540 · 05d 14927:12989 · 04h 14965:19392 (pending-changes dialog; arrow from the 08a status) (DONE 2026-11-07) |
| 05 · US-408 Versions and journal | **14861:56420** | 8720 | wid-07 14947:29895 · 07d 14947:29990 · 07e 14945:33547 (restore dialog) · 09c 14947:30085 (DONE 2026-11-07) |
| Build assets · Widgets (staging) | 14861:56427 | 10600 | empty (pre-check wid-07 screen moved into Block · wid-07) |
- Bands `Band NN · …` at 80 / 80 in every section (texts already written), first block y 440, blocks 240 apart, section h = last bottom + 80.
- Every section's band + Start here line are written; when a column changes its block count, edit the „— N blocks” text in 14861:56369.
- File index card (📍 Start here · Index) NOT added yet — the finish agent adds `Card · Widgets` (like `Card · KPI` 14822:12867).

## Per-state chain (= KPI chain + `wid`/`fix`)
Helpers: `const AF = Object.getPrototypeOf(async function(){}).constructor; const R = (k) => new Function("return " + figma.root.getSharedPluginData("reg", k))();`
1. Capture: `generate_figma_design { fileKey, nodeId: "14861:56427" }` → `SETTLE=3500 bash tools/figma/registre/cap.sh "<state> <cid>"` (list / profile;
   add `nofit` for menu / hover states) or `SETTLE=4500 bash tools/figma/kpi/cap.sh <state> <cid>` (create sheet). If the script prints
   „timeout (submitted?)” and the poll stays `pending`, re-run the same command with the same id — the second run submitted it.
   Captures land at PAGE level: move into 14861:56427, delete the page-level `Sticky placeholder – Container` leftovers.
2. `await R("compose")([{ cap, state, title: "Widgete", active: "Widgete", show: ["Calendar","Șabloane de jurnalizare","KPI"], update: true, back: <profile> }], { page: "14861:56367", hold: "14861:56427" })`
   (specialist: `role: "Specialist"`, no show list).
3. `await R("post")([SCREEN])` → `await R("filterchip")([SCREEN])` → `await R("kpi")([SCREEN])`.
4. **`await new AF("IDS","OPTS", figma.root.getSharedPluginData("wid","fix"))([SCREEN], { update: true|false })`** — source
   tools/figma/widgets/wid-fix.js. The KPI pass hard-codes the KPI sidebar item Active and leaves the bell at 1: this sets Widgete Active,
   bell 10, Filtrare = filter-2 9644:319, captured sort „Icon:transform” → 20/chevron-top, „Actualizează” buttons plus → refresh, and with
   `update: false` hides the header „Actualizează” (profiles, specialist).
5. Pinned ⋮: `await new AF("SET_ID","PAGE_ID","DRY","LIMIT","HOSTS", figma.root.getSharedPluginData("pinc","convert"))("12619:61500", "14861:56367", false, 10, [<table id>])`
   — ALWAYS pass the table id (HOSTS [] converts every table on the page, also the list behind staged sheets). Table wider than its box
   (the widget list is 1362 in 1184) → set the pinned instance `State=Shadow`; set the table frame `clipsContent = true` (audit `table-clip`).
6. `await R("polish")([SCREEN])`; `await new AF("PAGE","SIDS","APPLY","SHOWTALL", figma.root.getSharedPluginData("vfit","fit"))("14861:56367", [SCREEN], true, true)`.
7. Audit: `await new AF("ROOTS", figma.root.getSharedPluginData("uiqa","auditfull"))([BLOCK ids])`; route audit
   `await new AF("PAGE_ID","OPTS", figma.root.getSharedPluginData("kpi","raudit"))("14861:56367", {})`.
   Accepted baseline: `clipped-content` on the widget table (wider than its box, pinned ⋮ on top); `tight-gap` on padded Tab Panels.

## Block format (column 01 = the reference)
`Block · <state>` = `Screen label · <state>` (ID chip = state upper-case, Title, Status „In development”, `Link · prototype` „Prototype ↗” →
`https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=<state>`) · `Desktop · <state>` · `Note · <state>` (`Note title`
„WID-01C · Search with no results”, `Note text` ≤ 45 words). New block = clone a column-01 block (e.g. 14868:78727), replace children[1].
Arrows (column 01): `Arrow · wid-01 → wid-01c` 14876:77471 (search, „Căutare fără rezultat”) and `Arrow · wid-01 → wid-01g` 14876:77484 (row ⋮
WGT-0003, „Meniu rând ⋮”, lane +32, cursor 14876:77475). Start anchor 2×2 at screen right + 8 (+32 per extra arrow) on the control's y, end anchor
8×8 at target screen right − 8, magnets RIGHT. Cross-column arrows left for the finish pass: wid-01g „Dezactivează” → wid-06 (col 04),
wid-01 „Widget nou” → wid-03 (col 02), wid-01e empty CTA → wid-03.
Annotations: 14 on column 01 (wid-01 5 · 01c 2 · 01e 2 · 01g 3 · 02 2), categories 5:0 Dev · 5:1 Interaction · 5:2 A11y · 5:3 Content.

## Column 01 specifics
- wid-01c / 01e: the table box replaced by the KPI empty-state container (Empty state · boxed, search / chart icon); 01c search = State Focus,
  text „zzz”; 01e tab counts 0, Filtrare `State=Disabled`, CTA Style Primary · Icon None „Widget nou”.
- wid-01g: menu = clone of the KPI-01G menu (Post-process menu items Editează / Clonează / Dezactivează danger) at 1248 / 380, row-3 ⋮ `State=Active`.
- wid-02: clone of KPI-02A → `Role=Specialist` sidebar, `Group · Configurare` hidden, header `btn · Update` hidden, detail „Specialist • Chișinău”.

## Pre-check findings (2026-11-07) — what the chain does NOT map
- **List (wid-01)**: clean after `wid`/`fix` (sidebar, glyph, bell, sort).
- **Profile (wid-07)**: header `Actualizează` (hide via fix update:false); „Salvează” must be `State=Disabled` (captured enabled); the section header
  „Versiuni publicate” loses its action — the KPI `heads` step hides Action: turn it on, Secondary Small „Compară versiuni” + history icon;
  version titles are underlined links in code. Timeline = svc/timeline-step (OK), info note = svc/info-note (OK).
- **Create sheet (wid-03c)**: (1) stepper → `Stepper · drawer` keeps only 4 `.step-desktop` steps — the sheet has 5 (Date · Tip · Date afișate ·
  Aspect și acces · Revizuire): add a 5th step instance; (2) type cards come out as borderless raw rows (the code ring is an inset box-shadow, dropped)
  → use local **`Widget type card`** set **14876:99443** (State Default 14876:99427 / Selected 14876:99435; TEXT Title / Description, INSTANCE_SWAP
  Glyph, library radio-button Small; 520 wide, 2 per row in code = `.e-permits-wid-types__grid` 2 columns, gap 12); (3) the horizontal bar
  preview is raw → local **`Widget chart · bar row`** **14876:99444** (TEXT Label / Value; per instance set `Bar` / `Space` layoutGrow = px of
  the track, integers); legend „Număr de înregistrări” → `KPI legend` 14744:16078 (Tone Brand); (4) „Previzualizează ca” radio pair is raw → library
  segmented-control 11607:3787 (code draws the selected segment dark — check the library variant, else note it); (5) `reg/post` dialog step
  errored („set_layoutPositioning … ABSOLUTE”) — harmless on the full-window sheet; (6) the preview „Actualizează” plus icon → refresh (fixed by `wid`/`fix`).
- Glyphs: the code type glyphs are two-tone custom SVGs; the card uses Foundations 24/chart (brand fill) as default — swap per type to the
  nearest Foundations icon or keep 24/chart; listed as open.
- Charts (column 03): bars / stacked = `Widget chart · bar row` stacks or `KPI chart · bars` (vertical, monthly); other types (line, pie,
  heatmap, funnel, treemap, control, tile, tables) have no component yet — build one per family only when a block needs it, documented here.

## Column 02 · Create sheet (2026-11-07, done)
Screens: wid-03 14888:5988 · 03c 14876:86232 · 03z 14888:7878 · 03z1 14888:9542 · 03z2 14888:11206 · 03n 14893:7717 (clone of 03c) · 03a 14893:6513 (clone of 03).
Chain per sheet state: kpi/cap.sh → reg/compose (update:true) → post → filterchip → kpi → wid/fix → pinc/convert [table id] (State=Shadow,
table clip) → reg/polish → then the two stored widget routines (sources in this folder):
- **`wid`/`sheet`** (sheet-fix.js) `new AF("S","STEP", src)(screen, 1..5)`: stepper → `Stepper · 5 steps` frame of 5 `.step-desktop` Horizontal
  (Completed / Current band / Incomplete with Body/Small regular, no underline), „Previzualizează ca” → library segmented-control Count=2 Desktop,
  „Mărește previzualizarea” → button-filled-rectangular Neutral Small Icon=Only + Foundations expand-315, preview bars → `Widget chart · bar row`,
  legend → `KPI legend` Item 1 Brand. Idempotent.
- **`wid`/`sheetfit`** `new AF("IDS", src)([screens])`: nav padding 0, Dialog + body HUG, ABS footer „Pașii widget-ului” pinned to the dialog
  bottom (MAX), screen / Overlay / Body = dialog bottom (sheet screens grow, they never fit 900).
By hand: post turns selects into `svc/field-row` + raw label → rebuild as select-input (clone a Filled select, set Label / star / hint / Placeholder);
date-input for „Sursa de date” → select-input; RU/EN titles came out Destructive → Default + hint text; type rows → `Widget type card` ×11 (1 column at 1440);
„Fără filtru” empty state = boxed + filter-2 9644:319 + Show action (Primary Leading „Adaugă condiție”); preview empty = boxed + chart glyph 14756:8950;
review section headers: Show meta off + exposed `Action` visible = button-text-circular Strict Leading Small „Editează” + pen (as KPI-03h).
03n: KPI select Filled, svc/info-note under it, legend Favourable / Warning / Critical, bars coloured with the legend dot fills, values in %.
Arrows (route audit 0): Continuă 03→03c→03z→03z1→03z2 (lane 1528, cursor on each Continuă), 03c KPI select → 03n „Alege KPI” (lane 1560),
03 Continuă → 03a „Continuă fără date” (lane 1592), wid-01 „Widget nou” → wid-03 (section 01 lane 1592 → wid-03 LEFT edge, straight). 16 annotations.
Open: footer buttons stay Small 32 = code `btn-sm` (brief said Medium 40); target line „— Ținta 90%” legend row and bar target ticks of 03n not drawn
(KPI legend has no target item); type glyphs = one default glyph; Completed step labels render brand blue (code dark, underlined); 03 is ~60 px taller
than the code (text-area 186); „Heading 2” padding 11 (off-scale, listed).

## Column 03 · Chart types (2026-11-07, done)
Profiles (configurare tab, 1440, 4067–4627 high): wid-08 = Bare suprapuse (stacked rows, half width) · 08g = Bare + KPI (monthly columns coloured by KPI zone,
dashed target, half) · 08a = Tabel agregat (full row) · 08h = Plăcuță simplă (third). Chain per state: registre/cap.sh ONE AT A TIME (parallel runs in the
same shell captured the wrong state: 08g got wid-08) → reg/compose (pass the capture ID string, not the node; update:false, back:true) → post → filterchip →
kpi → wid/fix (update:false) → **`wid`/`prof`** `new AF("S","TYPE","WIDTH", src)(screen, "<type title>", "half|third|full")` (sticky preview column into flow
5 | 7 FILL, meta separators → left strokes, tab Track line → bottom stroke, Salvează Disabled, field-row pairs → two FILL fields gap 24, Sursa de date → select,
11 type cards with glyphs, hints by label, preview subtitle → text, card width by „Lățime”) → `wid`/`sheet` with STEP 0 (segmented, expand, bar rows, legend)
→ chart by hand (stacked: swap rows to Type=Stacked + Seg grows; columns: `Widget chart · columns`, swap Bar tones, grows; tile → `Widget chart · tile`).
Rules (user, 2026-11-07, apply to columns 04–05 too): auto-layout only — no ABSOLUTE except true overlays; every container / card / field FILL (responsive),
paired fields = row of two FILL fields (gap 24), long fields span the row; bar charts = grey 1 px baseline, bars rounded top only.
Open: filter rule box is still a text-input (code = rule builder, clone KPI 14780:6147); card titles to verify on 08 / 08h; 08g „Criteriul principal” value
text garbled; legend target row sits under the KPI legend, not inside its grey box; no arrows from wid-01 rows yet (cross-column, finish pass).

## Column 04 · Publish and status (2026-11-07, done)
Screens: wid-03u 14927:22539 (clone of 03z2: screen FIXED 900 clip, sheet Dialog FIXED 876 + footer pinned, list page behind the sheet deleted,
`Overlay · dialog` = scrim + local Modal Type=Content, Content = `Modal content / Body` VARIANT 12698:438581 (the set id is rejected), slot = Message ·
subtle Info (bold lead) + library textarea clone, footer Anulează Neutral / Publică Primary Medium) · wid-03v 14923:13559 + wid-05d 14923:15448
(cap.sh one at a time → reg/compose update:false back:true → post → filterchip → kpi → wid/fix → wid/prof „Bare” → wid/sheet 0 → by hand) · wid-06
14927:17547 (clone of 01g: menu removed, ⋮ Default, 1440×900 clip, Overlay cloned from kpi-05 14794:15832, title wraps (truncation off), red Dezactivează).
By hand on profiles: preview `Sidebar` came out HORIZONTAL with a FIXED head → VERTICAL gap 16, head / card HUG, card FILL (code: card = full column);
`wid/sheet` turned the bar list into the Legend → 3 `Widget chart · bar row` Single (Seg 1 / Space grows = value / max − value) + Legend „Număr de
înregistrări”; RU / EN titles came out Destructive → Default + hint; textarea counters split off the hint; 05d preview error = Empty state · boxed +
24/warning-filled; form | preview = grow 1 : 1 (code 560 | 560; Figma 576, page padding 16 less); toast constraint RIGHT; h2d-svg info icons → 20/circle-info-filled.
Arrows (route audit 0): 03z2 „Publică” → 03u (page level, sec 02 lane 1656 TOP → anchor above 03u TOP), 03u dialog „Publică” → 03v (lane 1528,
RIGHT/RIGHT), wid-01g „Dezactivează” → wid-06 (page level, sec 01 lane 1624 TOP → end anchor in the sec 04 LEFT gutter x 36 TOP; the horizontal runs at
y ≈ 5361 through the 02 / 03 gaps). 9 annotations.
Open: heights 4422 / 4442 vs code 4347 / 4365 (type cards, field rows); „Titlu (RO)” text-input has no counter prop (count stays in the hint);
filter rule box still a text-input (05d); figma-audit `absolute-in-flow` flags the pinned ⋮ column + its „Sticky placeholder – Table Cell” frames on
wid-06 (pinc/convert pattern, same on column 01) — needs a board decision.
Column 05 needs: wid-07 / 07d / 07f profiles on the Versiuni tab (timeline, compare, restore dialog) + wid-09c (journal); capture one at a time;
restore dialog = same Modal Content + Body variant recipe as 03u.

## Fix pass columns 01–04 (2026-11-07, code f60e8aaa)
- absolute-in-flow (qsweep/absflow) on all 20 blocks: 75 duplicate end cells under existing pins deleted on the sheet screens, 10 tables →
  [Table scroll | Pinned column · end], 150 Sticky placeholders gone; sheet footers „Pașii widget-ului” in flow (replace their placeholder).
- **`wid`/`half`** (sheet-half.js) `new AF("S", src)(screen)`: form | preview grow 1 : 1 (680 | 680), preview card FILL, stepper labels no underline
  (Completed / Incomplete text/base/default), ≥ 11 type cards → GRID 2 × 1fr gap spacing-12 with the right `Widget type glyph` (sheets only — profiles keep
  1 column = code), bar rows aligned by px grows. Then `wid`/`sheetfit`.
- Forms: `wid`/`formgrid` = kpi/formgrid with the widget half labels (Titlu RU / EN, Subtitlu RU / EN, Ce se măsoară, Criteriul principal / secundar,
  Ordinea categoriilor, Lățimea / Înălțimea implicită) — 49 grids. fill-pass: 201 FILL; resize test 1280 / 1920 on wid-01, 03c, 08 = 0 overflows.
- Profiles: `Empty cell` spacers deleted → cards FILL 560 / 576; titles added on 08 („Dosare întârziate la examinare”) / 08h („Cereri depuse”), title style =
  08a; Stacked segments flat (main Seg radius 0); 08 / 05d filter = rule builder (clone of 14780:6148, „Arată înregistrările când”); 08g Criteriul principal
  „Data finalizării” + Gruparea datei „Lună”, target row inside `Legend box`; 08a values = library link; 08h tile delta FILL (main too).
- Arrow `Arrow · wid-01 → wid-08` 14939:31029 („Deschide profilul”, row WGT-0003, start lane x 2856 TOP, end anchor above wid-08 TOP; route audit 0).
Open: arrows to 08g / 08a / 08h (TOP→TOP from wid-01 rows runs over column 02 unless it ends at the top band); counters stay in hints; 08a first column wraps
3 lines (code 2 + ellipsis); card subtitle bigger than title (pre-existing).

## Column 05 · Versions and journal (2026-11-07, done)
Screens: wid-07 14876:83787 (pre-check screen + wid/fix, Salvează Disabled, „Versiuni publicate” header Action = Secondary Leading Small
„Compară versiuni” + Foundations 20/history at 16, titles underlined) · wid-07d 14945:16418 (cap → compose update:false back:true → post →
filterchip → kpi → wid/fix; „Închide comparația” = header Action Neutral Small; change list = 5 local `Change row` Desktop 12241:528864 (Tag + Undo
hidden, old value STRIKETHROUGH range, padding 12/20); previews = `Widget chart · bar row` Single ×5 (Seg 1 / Space grows = value / max − value,
right card Seg bound to the favourable token, Label 48 | Track 352 | Value 30 grows) + `KPI legend`) · **wid-07e** 14945:33651 (= the restore DIALOG;
code wid-07f is the result after confirming, toast + version 4 — so the block id is 07e): clone of the wid-07 screen + `Overlay · dialog` of 03u,
FIXED 900 clip, slot = Message · subtle Info (bold lead) + Section header „Modificări (5)” (Heading inset 0) + the 07d change list (reverse values)
+ textarea „Ce s-a schimbat” (hint + 0/500), footer Anulează / Restaurează Medium · wid-09c 14947:21168 (audit-event modal = local Modal Type=Content,
reg/post made svc/field-row details cards + copy values; fixed: Tag 1 labels Succes / Activ / Expediat Success, raw „Heading 2” → Section header
+ meta, event = svc/timeline-step with Show tab tag „Tablouri de bord” (Stamp hidden), Mesaj value FILL + HEIGHT). reg/kpi CRASHES on the 09c
screen (deleted node in its heads step) — skip it on modal states.
Panels: Tab Panel FILL + maxWidth 1024, parent counterAxis CENTER (= code centred column); tab bars FILL; profile header inner container FILL
(resize test 1280 / 1920 = 0 overflows). Arrows (route audit 0 findings): 07 „Compară versiuni” → 07d (lane 1528, cursor), 07 „Versiunea 1” →
07e („Versiunea 1 › Restaurează”, lane 1560 — the version details modal 07b is not drawn), 07 tab Istoric → 09c („Istoric › eveniment”, lane 1592),
cross-column wid-03v tab Versiuni → wid-07 (page-level connector, start anchor sec 04 x 1592, end anchor = wid-07 screen LEFT edge, magnets RIGHT / LEFT).
11 annotations. figma-audit: 0 majors; left: tight-gap on padded Tab Panels (baseline), Heading 2 padding 11 behind the 09c modal (off-scale, listed).
Open: 09c tag „Tablouri de bord” sits right of the 2-line title (code: under it — instance title row layoutMode can't be overridden); preview bar
rows 40 high (code 32 → cards 24 taller); 07d / 07e change rows use the Unsaved-changes `Change row` (arrow is a text „→”, code an icon).

## Final pass (2026-11-07, finish agent)
- Parity vs code at 1440 on all 20 blocks of columns 01–04: completed step labels UNDERLINE (= KPI); `Text input · counter` 14937:45455 on every „Titlu (RO)”
  (03, 08, 08g, 08a, 08h, 03v, 05d); textarea counts moved to the library counter (Character Counter on), subtitle textareas 186 → 134 (code rows 3);
  bar row mains + all instances 40 → 32 (code min-height 32, gap 4); 03z preview list was HUG 346 → FILL + shared px grows (= 03c); 08a first column
  maxLines 2 + ENDING; filter empty states on 08g / 08a / 08h / 03v = 03z clone with „Adaugă condiție”; 18 form-grid cards had lost fill + border
  (03z, 03z1, 08, 08g, 08a, 08h, 03v, 05d) → restored from 14885:4207; preview meta lines FILL + wrap; 03c / 03n KPI select container FILL; wid-02 box
  centred; preview empty state on 03 / 03a without the dashed border (code has none); sheet Dialog + Overlay constraints STRETCH (1280 resize).
- svc/timeline-step (9573:18190 set) `Title row` = VERTICAL (tab tag under the title = code journal event) — affects every instance with Show tab tag.
- Arrows wid-01 rows → 08g / 08a / 08h (14952:16048 / :16054 / :16060): start anchors BOTTOM in sec 01 lanes 1752 / 1720 / 1688 at the row y, end 8×8
  TOP anchors in the sec 03 LEFT gutter x 52 / 36 / 20; the elbow's horizontal = (start y + end y) / 2 → end y chosen so it lands in a column-02 gap.
  After the col 02 restack the 01g „Dezactivează” start anchor moved to y 5250 (horizontal in the shared 02 / 03 gap). Route audit 0.
- Index: `Card · Widgets` 14952:16064 after Card · KPI; Progress 1252 screens / 177 flows. Audit 24 blocks: 0 majors (baseline clipped tables, tight-gap, off-scale 11).
Open: preview empty-state / filter glyph differs from code (code sliders icon); create-sheet type card description wraps a word earlier than code.

- Cleanup (user 2026-11-07): when a job ends, delete its raw captures („cap · …”), the „Build assets / staging” section and any loose „Sticky placeholder” — nothing temporary stays on a board page.
