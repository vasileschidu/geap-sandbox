# KPI board — conversion pre-check (2026-11-06, step 3 of figma-board-workflow)

File GEAP 2.0 `aHgwVwiNCOSOqbMhMjjUOj`. Page `↳ BO -> KPI` **14726:516** (after „↳ BO -> Logging templates”). Staging section
`Build assets · KPI` **14726:517** (captures land at page level when the nodeId is a section: move them in, delete the
`Sticky placeholder – Container` leftovers).

## Per-state chain for the column agents (2026-11-06, pre-check v2 — run exactly this, one state at a time)
Helpers: `const AF = Object.getPrototypeOf(async function(){}).constructor; const R = (k) => new Function("return " + figma.root.getSharedPluginData("reg", k))();`
1. **Capture**: `generate_figma_design { fileKey, nodeId: "14726:517" }` → captureId; `SETTLE=3500 bash tools/figma/registre/cap.sh "<state> <captureId>"`
   (4500 for sheet / modal states); poll the id. The capture lands at PAGE level: move `cap · <state>` into 14726:517, delete the
   `Sticky placeholder – Container` leftovers, load the capture fonts.
2. **Compose** (stored, fixed 2026-11-06): `await R("compose")([{ cap: "<cap id>", state: "<state>", title: "KPI", active: "KPI" }], { page: "14726:516", hold: "14726:517" })`
   → clone of `Desktop · reg-02` 12695:3236 (current sidebar set 12898:445617), board junk removed, header Back off (pass `back: true`
   on profile states), sidebar Administrare › KPI Active (the item lives hidden in the Central admin main, id 14747:3145).
3. **Post**: `await R("post")([SCREEN])` — on the composed screen, never on the raw capture.
4. `await R("filterchip")([SCREEN])` → verify the chip glyph = filter-2 9644:319.
5. **KPI pass**: `await R("kpi")([SCREEN])` — track line, stray modal, table cells whole-px, sticky holders, raw „Heading 2” →
   Section header, monthly chart → `KPI chart · bars`, create-sheet stepper → `Stepper · drawer`, raw timeline rows →
   `svc/timeline-step`, sidebar KPI Active. Idempotent.
6. **Pinned ⋮ column**: `await new AF("SET_ID","PAGE_ID","DRY","LIMIT","HOSTS", figma.root.getSharedPluginData("pinc","convert"))("12619:61500", "14726:516", false, 10, [<table ids>])`
   (table = GRID `Table - KPI, …`; with HOSTS empty it converts every unconverted table on the page). The column gets
   `Side=End, State=No shadow`; when the table is wider than its box swap the instance to `State=Shadow`, when it fits `State=None`.
7. **Band**: captured „Zonele valorii” / „Valoarea față de țintă” bands → `KPI band` instance (Callout Center / Left / Right
   by the value position; Before / After spacer `layoutGrow` = px left / right of the marker; exposed `Value callout` text „Acum …”,
   exposed `Legend` › Item 1–3 labels). Not automated yet (one by hand per state).
8. **Polish + fit**: `await R("polish")([SCREEN])`; `await new AF("PAGE","SIDS","APPLY","SHOWTALL", figma.root.getSharedPluginData("vfit","fit"))("14726:516", [SCREEN], true, true)`.
   Overlay screens: sidebar instance FIXED 868 + clip (it is taller than the viewport since KPI was added); page screens keep it
   FILL (screen 928 so the Active KPI item shows).
9. **Audit**: `await new AF("ROOTS", figma.root.getSharedPluginData("uiqa","auditfull"))([SCREEN])` (= tools/ui-qa/figma-audit.js
   2026-11-06, ROOTS as the parameter). Accepted baseline: `clipped-content` on the KPI table (wider than its box, pinned ⋮ on top),
   `font-not-onest · mixed` (Onest Regular + Medium in one text), `message-fixed-height` on „tab · Alerte” (name false positive).

## Board structure (2026-11-06, column 01 done — columns 02–05 copy this)
Page `↳ BO -> KPI` 14726:516, y 0 for every section, sections 80 apart, staging `Build assets · KPI` 14726:517 moved to x 10600 (last).
| Section | id | x | Blocks |
|---|---|---|---|
| 00 · Start here | 14752:2538 | 0 | card `Board title · KPI` (ID chip KPI, title, description, Contents = one NODE-linked line per column + count) |
| 01 · US-400 List and access | **14752:2562** | 1200 | kpi-01 14752:2597 · kpi-01c 14752:4864 · kpi-01e 14752:4878 · kpi-01g 14752:4892 · kpi-02a 14752:4906 |
| 02 · US-399 Create a KPI | **14752:2569** | 3080 | kpi-03 14786:16415 · kpi-03n 14814:15064 · kpi-03a 14786:16429 · kpi-03c 14786:16443 · kpi-03d 14786:16457 · kpi-03g 14786:16471 · kpi-03h 14786:16499 · kpi-03m 14786:16485 (side state, last so its arrow nests around 03g → 03h) |
| 03 · US-401/402 Edit and status | **14752:2576** | 4960 | kpi-04a 14794:16251 · kpi-04d 14794:16265 · kpi-05 14794:16279 · kpi-04f 14856:24451 (2026-11-07, last so the cross-column kpi-05 arrow keeps its gap) |
| 04 · US-519/520 Authority | **14752:2583** | 6840 | kpi-06 14804:159753 · kpi-07 14804:159767 · kpi-07a 14804:159781 |
| 05 · US-521 Alerts | **14752:2590** | 8720 | kpi-08 14807:26480 · kpi-08g 14807:27000 · kpi-08d 14808:12427 |
- Section = 1800 wide (block 1440 at x 80 + 280 right gutter for arrow lanes), `Band NN · …` (clone of Logging 14025:6043) at 80 / 80,
  first block at y 440, blocks 240 apart (restack in list order), section height = last block bottom + 80.
- Block = `Block · <state>` VERTICAL, gap spacing-16 (bound), fills none, HUG: `Screen label · <state>` (ID chip = state upper-case,
  Title, Status = first variant „In development”, `Link · prototype` „Prototype ↗” → sandbox
  `https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=<state>`) · `Desktop · <state>` screen ·
  `Note · <state>` (tag NOTE DEV / PM, `Note title` „KPI-01C · Search with no results”, `Note text` plain English ≤ 45 words).
  New block = create the frame + clone the label / note of any column-01 block (e.g. 14752:4864 children 0 and 2), insert the screen at index 1.
- Arrows (Logging pattern, route audit `barrows/raudit` = 0 findings): connector = clone of 14056:12644 (blue pill label, ELBOWED, 3 px),
  start = 2×2 Flow anchor `anchor · edge · <label>` in the section at screen right + 8 (next arrow + 32 = own lane) on the clicked control's
  y, magnet RIGHT; end = 8×8 `anchor · end · <label>` at the target screen's right edge − 8 on the target control's y, magnet RIGHT.
  One hand cursor (Foundations c59e5c66…) per screen on the clicked control (never on tabs). Column 01: kpi-01 search → 01c
  („Căutare fără rezultat”, 14761:6218), kpi-01 ⋮ T-01 → 01g („Meniu rând ⋮”, 14761:6224); kpi-01e / 02a are data / permission states, no arrow.
- **Annotations (user 2026-11-06, every block — columns 02–05 and the widgets board too)**: native Dev Mode annotations on the real
  elements, 2–5 per screen: `node.annotations = [...existing, { labelMarkdown, categoryId }]` with 5:0 Development (permission gating,
  who sees it) · 5:1 Interaction (what a click / typing does, confirms, destructive = red) · 5:2 Accessibility (focus, pressed) ·
  5:3 Content (counts, empty vs no-results texts). Instance sublayers by their full id (`I…;…`). Plain English, 1–2 sentences, no class
  names / tokens / sizes. Column 01 = 14 (kpi-01 5 · 01c 2 · 01e 2 · 01g 3 · 02a 2).
- Per state after the chain: check the Filtrare glyph (post-made chip keeps 20/filter), empty-state icon = code icon (search / chart / lock),
  empty CTA via `Show action`, row-menu item icons via the `Icon` prop, pinned End `State=Shadow` when the table is wider. Start here
  counts: re-run the Start here card build (tools/figma/start-here/rebuild.js logic) or edit the „— N blocks” range with insert/deleteCharacters.

## Pre-check screens (done)
| State | Screen | Shows |
|---|---|---|
| kpi-01 | 14735:3361 | registry list (pinned ⋮ = `Table / Pinned column` 14747:165917), sidebar KPI Active |
| kpi-03g | 14735:5011 | create sheet step 3: `Stepper · drawer`, KPI band, `KPI chart · bars`, Section headers |
| kpi-08g | (14735:6288, deleted 2026-11-07 — its overlay now lives in kpi-08g 14807:27007) | alert detail modal |
Audit 2026-11-06: 0 majors besides the baseline above.

## Local components (🧩 Local components › Cards & details 12645:8478)
- `KPI band` set **14739:2297** (Callout Center 14739:2231 / Left :2253 / Right :2275): Bar + Marker row FILL; callout = library
  Tooltip Small (Components set 3ca9d2a8…, Arrow Top / Top Left / Top Right) with Bubble padding spacing-4 / spacing-8, radius-8,
  12/16 medium text — exposed `Value callout`; `Legend` = exposed `KPI legend`. Tick row aligned on the tooltip arrow (Left 22 /
  Right 52 = arrow geometry, listed off-scale).
- `KPI legend · item` set **14744:16077** (Tone Critical / Warning / Favourable / Brand; TEXT Label) · `KPI legend` **14744:16078**
  (radius-8, padding 8 / 12, gap 16, wrap gap 8 — all bound; exposed Item 1–3, Show item 2 / 3).
- `KPI chart · bar` set **14744:16092** (Tone) · `KPI chart · bars` **14744:16093** (drawn at 743: 12 `Month n` slots 62 / last 61,
  `Space` + `Bar` grows = px of the 160 plot; TEXT Start / Middle / End; exposed Legend). eKYC has no chart component (its charts are
  frames, eKYC lesson 2026-10-16), so this is the first one.

## Open (not changed here)
- Modal footer: the code renders `btn-rounded` (pill, Medium 40) — Figma keeps the library circular Medium buttons = the code;
  the „rectangular r8” brief does not match the code.
- „Revenire în zona favorabilă” (Urmează) is a hollow grey dot in code; the library `svc/timeline-step` Pending is a blue clock.
- The sidebar Central admin main still lacks Calendar / Șabloane de jurnalizare / Widgete visibility per the code menu.

## Column 02 · Create sheet (2026-11-06, done)
Screens: kpi-03 14771:7636 · 03a 14772:50454 (clone of 03 + Destructive fields) · 03c 14774:20301 · 03d 14781:7919 · 03g 14735:5011 (staging, moved) ·
03m 14784:8608 · 03h 14786:9253. Arrows (route audit 0 block findings): 03 Continuă → 03a, 03a Continuă → 03c, 03c „Verifică valoarea” → 03d,
03d Continuă → 03g, 03d search → 03m (lane +32, no cursor), 03g Continuă → 03h. 19 Dev Mode annotations (Interaction / Development /
Accessibility / Content). Audit: 0 majors besides the baseline (clipped KPI table behind, mixed Onest weights).
Chain for create-sheet states (after reg/compose → post → filterchip → kpi):
- Capture with `tools/figma/kpi/cap.sh <state> <cid>` — adds `.e-permits-reg-editor__single` (the sheet page scrolls inside it; registre/cap.sh
  measures 900 and cuts the form). Captures with the rule keyword carry SF Mono: set JetBrains Mono BEFORE moving the capture (appendChild fails).
- Step 2 screens: stored `kpi`/`calcfix` (tools/figma/kpi/calc-fix.js) — date-input → select-input, rule row (post makes a timeline-step) →
  3 selects + trash, „Adaugă condiție” → text button, dictionary meta stack, verify header Action, empty icon 24/calculator. Then by hand:
  trash Size Medium + 20/trash, Action = Secondary Small „Verifică valoarea” + 16 calculator, „Fără filtru” empty state = filter-2 + Show action
  (swap the exposed Action to button-text-circular, label „Adaugă condiție”) + Text reset.
- Every sheet: stored `kpi`/`sheetfix` (tools/figma/kpi/sheet-fix.js) SPEC { S, STEP, taH: 78, selects, style } — stepper clone of 14732:1507
  with states, hints FILL / no truncation, text-area counters, style fixes keep the hint, body unclipped, sheet + screen grow (24 + sheet), save bar
  at the bottom. 14747:4803 (03g stepper = the clone source) carries the „kpi/nav” marker — never remove it.
- Review (03h): the chart pass eats the stat cards (legend gets „Valoarea curentă …”) → replace the „Valoarea față de țintă” section with a clone
  from 03g; „Modifică” meta → header Action = button-text-circular Primary Small.
Open: dictionary group headers (local „Field group header”) are smaller than the code accordion (16/24 500, count badge, chevron-down, grey band);
the library Destructive text-rectangular trash renders a dark icon (code red); kpi-03d / 03m are ~100–140 px taller than the code (rule box padding,
empty-state paddings); the 03m result rows are captured frames with library tags (not svc/stack-item).
- Code reference shots: `node --experimental-websocket --no-warnings tools/figma/kpi/shot.mjs --out <dir> --fit kpi-03 …` (oficiu shot + the sheet scroller in the fit list).

## Column 02 fixes (2026-11-06, pass 2)
- Data dictionary = the Permisiuni stacked list: `Dictionary list` frame (border, radius-12) of `svc/stack-group-header` 9521:8747
  (new props `Show chevron` / `Chevron down` / `Chevron up`, Count = numbered-badge Large) + `svc/stack-item` 9521:8751 rows (Title,
  Tag 1 = type Neutral, Tag 2 = usage Brand, Meta 1 = description, selected row = background/brand/subtle, last row no divider).
  User Management U05 draws the same list as captured frames; these two are the library pieces. Stored routine root `kpi`/`dict`
  (tools/figma/kpi/dict-list.js): `await new AF("HOST","GROUPS", src)(hostId, groups)` replaces the host frame. 03d = Dosar 7 / Termene 5 /
  Responsabil 5 collapsed; 03m = Termene 3 open. Dictionary Section gap spacing-8 + Container bottom spacing-8.
- Rule rows were FIXED 100 (timeline-step leftover) → HUG (rule box 147 = code). „Fără filtru” empty state padding 24 (was 40).
  03c trash icon now icon/danger like 03d / 03m (Destructive variant colour).
- All checkboxes → `Document option · checkbox` 10507:44447 (grey chip = code renderCheckOption), wrap rows gap 8.
- Sheet dialogs HUG; the absolute footer `Pașii KPI-ului` pinned to the dialog bottom (constraint MAX); screen = dialog + 24.
  Heights vs code: 03c 1730 · 03d 2228 (2220) · 03g 1004 (992) · 03m 1956 (1948). 03d chart legend = one item „Valoarea lunară” (the
  separate legend list removed). Route audit (stored `kpi`/`raudit`, 0 findings, 0 crossings).

## Column 03 · Edit and status (2026-11-06)
Screens: kpi-04a 14794:10181 (capture → compose back:true → post/filterchip/kpi; header „Actualizează” hidden; Ținta card, Zonele band
and stat cards cloned from 03g with the 04a chart kept; band zones 50/25/25, marker Before 430 / After 570; values 88,6 % red, 91,4 %
warning) · kpi-04d 14794:13605 (clone of 04a: 92 %, legends 92 / 97, header `Header status` „1 modificare nesalvată” + Renunță /
Salvează row, `Unsaved changes review` Desktop 12241:528944 ABSOLUTE 425 / 306 in the scrim, screen 900 clipped, sidebar 868) ·
kpi-05 14794:15399 (clone of the kpi-01 screen + Modal Type=Confirmation 10136:655, „Dezactivează” Destructive). Arrow 04a Ținta
input → 04d („Modifică ținta”, 14794:16302). 9 annotations. Audit: baseline only.
Open: kpi-05 has no arrow (it starts from the kpi-01 row menu in column 01, cross-column); the BO sidebar still misses the
Șabloane de jurnalizare / Widgete items; the notification badge shows 1 (code 10); 03g roles wrap like the code but 03g is 12 px taller.

## Column 04 · Authority (2026-11-06)
Screens (local admin, code bell 12): kpi-06 14804:11822 (Definiție tab) · kpi-07 14804:13713 (Valori proprii) · kpi-07a 14804:15363 (add drawer,
viewport-fit 900, sidebar FIXED 868 + clip). Chain: capture → compose back:true → post → kpi pass → polish → vfit. Then by hand:
sidebar Role=Local admin + Calendar / KPI (Active) / Widgete visible, header action „Actualizează” hidden, Detail „Administrator local • ANSP”.
- kpi-06: stat cards cloned from 04a (14794:13349) into Valoarea (chart pass eats them, its Legend hidden), svc/field-row Value FILL + HEIGHT
  (no truncation), dictionary = stored `kpi`/`dict` (3 groups open, Statut dosar Tag 3 „Filtru numitor”), rows compacted per instance to the code
  72 (Row padding spacing-12, Content gap spacing-4), the sticky `Sidebar` column is ABSOLUTE → resize its `Sticky placeholder` to its height.
- kpi-07: own values = `Own values list` (border, radius-12) of 3 svc/stack-item (Show edit + Show more, tags off, 12 / 4 like above);
  section header Action = button-filled-rectangular Secondary Leading Small „Adaugă valoare proprie” (exposed, was hidden).
- kpi-07a: footer Medium, Ținta / Prag inputs State Default (placeholder), hints = the inputs' Assistive Text.
Arrows: 06 tab „Valori proprii” → 07 (no cursor, tab), 07 „Adaugă valoare proprie” → 07a (cursor). 9 annotations. Route audit 0, figma-audit 0 majors.
`KPI chart · bars` narrower than 743 (06 = 483, 04a / 04d = 603): instance slot resize is ignored → slots FILL with integer `layoutGrow` = px
(cumulative rounding) → whole px. Bars stay 36 (bar resize ignored on instances; code 28 at 483).
Sidebar mains (12898:445617): Central admin + hidden `Widgete` (20/dot-grid 8d66d03b…) after KPI; Local admin + hidden KPI / Widgete after
Calendar. Central-admin KPI screens show Calendar · Șabloane de jurnalizare · KPI · Widgete (code order) → page screens 1036 (sidebar 1004).
Bell: central-admin states 10, local-admin states (06 / 07 / 08) 12 = code.
Open: (fixed 2026-11-07) kpi-08g now local admin; kpi-05 fixed 1440×900 clipped (sidebar FIXED 868 + clip, Overlay 0/0 1440×900, its frame opacity was off → scrim invisible; stray cursor removed).

## Column 05 · Alerts (2026-11-07)
Screens: kpi-08 14807:26487 (clone of kpi-07 screen: tab Alerte Selected, Tab Panel = staging notice + „Alertele generate” section; timeline
Status Failed / Pending, `Status tag` hidden, titles underlined = links, notice leads Medium; Body minHeight 868 → 900) · kpi-08g 14807:27007
(clone of kpi-08 + staging Overlay: Modal Type=Content FIXED 852 (viewport − 48), `modal-content` FILL, footer top hairline border/base/default,
„Deschide KPI” Style Secondary = code btn-secondary, screen FIXED 900 clip, sidebar FIXED 868 + clip, `Scroll cue` instance ABSOLUTE at body
bottom − 64) · kpi-08d 14808:12504 (clone of kpi-01 screen → local admin: sidebar from kpi-08, detail „Administrator local • ANSP”, bell 12, tabs
Toate 11 / Moștenite 10 / Ale ANSP 1, V-03 row + its pinned cell removed, T-01 92 % / 87,4 %; Overlay = clone of notif-01 13909:12505, items
set to the code list, 7th item = createInstance of the item main appended to the Azi slot).
New local component `Modal / Scroll cue` **14807:28558** (🧩 Local components › Modals, sheets & drawers): 590×64 clip, padding-bottom spacing-8,
`Fade` = white (background/base/default) rectangle + LAYER_BLUR 48 (no gradient), library button-filled-circular Neutral Medium Icon=Only +
20/arrow-down. Arrows: 08 alert title → 08g („Detalii alertă”), 08d KPI notification → 08g („Notificare KPI”, lane +32). 10 annotations.
Route audit (`new AF("PAGE_ID","OPTS", kpi/raudit)("14726:516", {})`) 0 findings; figma-audit baseline only.

## Column 02 · one-container wizard (2026-11-07, code cfd575a0)
Code: header / stepper / content / footer / × share the 24 gutter (1440 → L 24 · R 1416), every step two columns (step 1–2 form 793 |
context 567, steps 3–4 567 | preview 793, gap 32). Figma measured on all 8 screens: title L24 · Step 1 L24 · content L24–R1416 ·
footer L24–R1416 · × R1416 (steps 2–4 already matched; no recapture needed there — DOM geometry of every state = Figma).
- Step 1 screens (kpi-03 14771:7636, 03a 14772:50454, new **kpi-03n** block 14814:15064 / screen 14814:15071) restructured in place by the
  stored routine `kpi`/`step1` (tools/figma/kpi/step1-context.js): content container FILL (max 1600), Section grow 793 | `Context · codes`
  grow 567, 2-up rows 364 | 363, right column = Section header „Coduri existente în domeniu” + Empty state · boxed Compact (24/checklist)
  or `Codes list` (border r12, svc/stack-item 72, meta one line) + svc/info-note (bold next code). Dialog re-hugged, footer pinned,
  screen = dialog + 24 → 1008 (code 1004; section headers 52 vs 49 = pre-existing).
- 03h: the raw „Zonele valorii” capture (no bar) replaced by the 03g section with the `KPI band` (14819:15810).
- Arrows: new 03 Domeniu → 03n („Alege domeniul”, 14816:13761) runs in the LEFT gutter (start x 70, end anchor x 80 = screen left
  edge, magnets LEFT) — a right-side lane would cross 03 Continuă → 03a. Route audit 0 findings; figma-audit 0 majors (baseline only).
- Annotations +5 (03n Domeniu Interaction, Codes list + rule Content, 03 / 03a empty state Content).
Open: heights vs code 03c 1730 (1718) · 03d 2228 (2220) · 03g 1004 (992) · 03h 1282 (1302, the review info note is one line in Figma,
two in code, no bold runs) · 03m 1956 (1948); stepper current step has no blue pill (Stepper · drawer has none; code shows one).

## Board done (2026-11-07, step 6 finish pass)
- Page `↳ BO -> KPI` 14726:516: Start here 14752:2538 (counts 5 · 8 · 3 · 3 · 3 = 22, every line linked to its section), sections 01 14752:2562 ·
  02 14752:2569 · 03 14752:2576 · 04 14752:2583 · 05 14752:2590, 80 apart. Staging section `Build assets · KPI` 14726:517 deleted (was empty).
- Cross-column arrow kpi-01g „Dezactivează” → kpi-05: connector **14821:12867** (page level), start anchor 14821:12865 (section 01, x 1620 = own lane,
  y 5304 = the menu item row, magnet TOP), end anchor 14821:12866 (section 03, above the kpi-05 block, magnet TOP), hand cursor 14821:12858 on the
  item (right edge, off the label). TOP→TOP runs up the gutter and across at end.y − 49, so end.y was chosen to put the horizontal in the 02 / 03
  gap (y 3104–3344, between kpi-03n and kpi-03a). Route audit: 0 overlaps, 0 block hits, 1 crossing (kpi-03 → kpi-03a lane, unavoidable: every
  gap of section 02 carries a lane). The arrow tip stops ~120 px above the kpi-05 block (gap limits).
- File index card `Card · KPI` 14822:12867 on 📍 Start here · Index (Administration group, 22 screens, 5 flow lines linked); progress numbers
  1227 screens / 172 flows, header Meta line updated.
- Audit (stored `uiqa`/`auditfull`, 22 screens): 0 majors; baseline only (clipped KPI table ×14, mixed Onest weights ×6, „tab · Alerte” ×7) + 3 `tight-gap`
  on Tab Panel / Section frames of padded sections (gap 0 by the padding-no-gap rule).

## Form grid + code parity (2026-11-07)
- Every KPI form = 2-column auto-layout GRID (code `.e-permits-user-create__grid`, field--6 = span 1, field--12 = span 2, gap spacing-24 bound):
  stored `kpi`/`formgrid` (tools/figma/kpi/form-grid.js) on 03 · 03n · 03a · 03b · 03c · 03d · 03g · 03m · 04a · 04d · 04f · 07a (≈ 45 grids).
- Create sheet = half | half on every step (code f60e8aaa): two-column container children layoutGrow 1 → 680 | 680; screens = dialog bottom.
- Profile tabs (04a, 04d, 04f, 06): panel inset 16 (spacing-16) and 653 | 467 (code 7fr | 5fr, measured) — was 1184 wide, cut at the right.
- 03g / 04a / 04d: Specialist info note added to „Criterii de setare”, bold runs „Specialist:” / „o singură dată”; 03h info note bold „activ” / „Global”.
