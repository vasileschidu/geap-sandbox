# Arhivare — Figma board (Feature 97300, US-395…408)

File **GEAP 2.0 · Admin** `rFoBKCqtBb0idERLS2RHE8`, page **↳ BO -> Arhivare** `180:20`. BO desktop 1440 only.
Same routine as tools/figma/permisiuni/README.md, own copies in root shared plugin data namespace `arh`.

| Section | id | blocks |
|---|---|---|
| 00 · Start here (card 205:6756) | 180:21 | — |
| 01 · Politici de arhivare | 180:22 | arh-01 183:1270 (screen 299:20178, Versiune column) · 01c 194:2773 · 01f 196:3308 · 02 198:3197 · 03 191:3940 · 03c 200:4381 (screen 210:4161) · 04 203:5013 · 05 205:5242 |
| 01b · Publicare și versiuni | 299:13601 | arh-07 299:21502 (screen 299:59) · 07a 303:16812 (303:15399) · 07b 303:16879 (300:12451) · 07h 303:16895 (301:13118) · 07c 303:16911 (301:14988) · 07d 303:16927 (302:17221) · 07e 303:16943 (302:16581) |
| 02 · Candidați la nimicire | 180:23 | arh-06 215:5648 · 06b 217:6024 · 06c 219:6474 · 06e 228:7973 (screen 225:5381) · 06g 228:7989 (screen 228:5841) |
| 03 · Registru Dosare · arhivare | 180:24 | arh-10 232:6939 (screen 230:6233) · 11 235:8304 (screen 235:6810) · 11a 244:9481 (screen 239:8110) · 11c 248:9751 (screen 248:9163) · 12 244:9497 (screen 240:7767) · 13 244:9513 (screen 243:8189) · 14 244:9529 (screen 244:8687) |
| 04 · Dosar arhivat · căutări | 180:25 | arh-15 251:9928 (screen 250:9514) · 15b 255:750 (screen 253:9866) · 16 257:12397 (screen 257:10244) · 17 257:13966 (screen 257:12413) · 17a 257:19173 (screen 257:17539) |

Cover index line 205:6764. Connector template 180:26 (hidden, styled from the first arrows). Arrows `arh`/`ids`.arrows (8) = stored `lanes`
(lanes.js): col 01 Caută → 01c, ⋮ → 01f, Adaugă politică → 03, Editează → 04, Dezactivează → 05, Salvează → 03c; col 02 Bifează rândul → 06b,
Confirmă nimicirea → 06c. Each = one elbowed connector, own lane right of the screens (36 + 40·k), start on the clicked row, end on the
target screen's right edge.
Local component **Input · duration** set `187:133` (🧩 Local components; State Default / Disabled / Filled / Error, TEXT `Unit`,
exposed library text-input `Field`) = code `.e-permits-doc-val` + unit select.

## Stored routines (root shared plugin data `arh`)
| key | source | what |
|---|---|---|
| `lib` | `perm`/`lib` (split/join: namespace, header title „Politici de arhivare și păstrare”, sidebar Group · Setări item + 24/page-text-lock, link `geap-sandbox/e-permits-acte-permisive.html?state=` (patched 2026-11-24), proxy-safe `"findOne" in x`) | screen / block / stack / arrow |
| `post`, `pp` | `perm` copies | pre / post (scrim), list (search 40, Exportă, confirm dialog via `drawer`) |
| `tbl` | tbl.js (this folder) | `table` any-column GRID → [Table scroll clip │ Pinned column End Shadow], ⋮ cells rebuilt (`openRow`); `btns` ⋮, Adaugă politică, sort headers |
| `form` | form.js (this folder) | `dur` (component), `drawer` {screen, ret?, units?} policy drawer → library select / text-input Read Only / Input · duration / svc/switch-label / filter chips; 12-col captured grid → 2 equal cols, HUG rows |
| `empty` | inline (see arh-01c call) | boxed empty / denied state {screen, icon, query?} |
| `lanes` | lanes.js | arrows in separate lanes {section, arrows:[{from, to (Block id), label}]}; replaces same-label arrows |
| `cand` | cand.js | candidates table: library checkbox Small (Indeterminate header), ⋮ only on selectable rows {screen, indeterminate?} |
| `selbar` | selbar.js (re-stored 2026-11-24 v3: „Anulează selec” finder, red action „Șterge”) | captured selection bar → local Selection bar 60:7488 with Show action 2 |
| `dlg` | dlg.js | content dialog: GEAP Modal Type=Content + `Modal content / Body` Spacing 16 slot filled with lead text / grey record rows (.e-permits-arh-list) / svc/info-note or Message · subtle / library textarea (counter, error) / radio group; footer labels + styles; long titles wrap |
| `scroll` | scroll.js | list table scrolled to the last column: raw status tags → tag-filled, Nr. dosar → Pinned column Start, Table scroll align MAX, end pin No shadow {screen} |
| `drw` | drw.js | 800 drawer shell cloned from arh-03 (190:1622) over a cloned page screen, 1440 × 900, header / footer set, empty `Body` {from, state, title, subtitle, buttons} |
| `card`, `card2` | card.js | record-card screens: header Back + no Actualizează, tab strip (labels, 20 icons, counters, Track line), notices FILL + icon, radius-20 cards |
| `nums` | inline (v3 call) | {screen, col: "Nr. dosar" \| null, values[]} puts `Copy value` Type=Compact (GEAP d7a4071b…) into the emptied number cells — run after every list capture |

## Per state
`generate_figma_design { fileKey, nodeId: "180:20" }` → `SETTLE=3000 bash tools/figma/registre/cap.sh "<state> <cid> [nofit]"` (one at a time), then one call:
- list: `POST("pre") → LIB("screen") → T("btns") → T("table",{openRow?}) → POST("post") → PP("list")`
- drawer: same with `fixed:true`, then `FM("drawer",{screen, ret, units})` BEFORE `POST("post")`
- confirm dialog: `PP("drawer")` (non-800 dialog → GEAP Modal Confirmare), then set the confirm button Style Destructive
- `LIB("block",{screen,state,title,story,note,section})` → `LIB("stack",{section,order})`

Units: the captured unit text is unreliable (always „Zile”) — pass `units: {"Păstrare în arhivă": "Ani"}` (data/arhivare.json).

## Local components added (2026-11-24, arh-board-v2)
- **Switch · Medium** `208:4229` (🧩 Local components 50:6605): library switch (Components 5a669ca2…) detached at the code size 40 × 24, thumb 16,
  inset 4 (spacing-4), auto-layout (Checked = align end), library colours / radius / focus effect; same props State × Checked. All 6 switches on
  the page swapped (nested `switch` inside GEAP `svc/switch-label`). After any new drawer build swap `switch` instances to it (FM still
  creates the 48 × 28 one). Swap back when the library ships Size=Medium.
- **Selection bar** 60:7488 gained BOOLEAN `Show action 2` + nested `Action 2` (default off — existing instances unchanged).
- `Input · duration` 187:133: Unit TEXT prop now bound in the Filled / Error variants too (they showed „Zile” for „Ani”).

## Done 2026-11-24 (arh-board-v2)
- Tu form: arh-02 „Nu ai acces…”, arh-05 „Continui?”, arh-03c recaptured („Introdu…”); prototype links = geap-sandbox/e-permits-acte-permisive.html?state=.
- arh-01c: the boxed empty state was missing entirely → `Empty area` 208:4244 (pad 16, top) + Empty state · boxed 208:4245 („Nicio înregistrare…”, 24/search).
- arh-03c recaptured with the drawer at the top (fit 1171); duration values, chips (Anonimizare selected), units fixed in 03 / 03c / 04 (all showed
  „Label”); long switch descriptions wrapped with a line break (text sizing can't be overridden inside svc/switch-label).
- Required stars on 03c / 04 = Foundations 12/asterisk (c2122c1a…) bound to icon/danger/default (210:6412, 210:6414).
- Audit (cols 01 + 02, file version, comments stripped): 33 captured „Copiază” overlay buttons + 4 zero-height captured containers removed;
  left = fixed-width table columns (declared), captured `Text` label wrappers (not auto-layout, 2), unbound fills on captured toolbar /
  container frames (6), fractional captured cells.

## Open (next job)
- **arh-06e** (reject + reason error: textarea with counter 0 / 500, „Câmp obligatoriu.”, Respinge primary) and **arh-06g** (empty, no candidates,
  checkmark-large icon) not built — capture one at a time, same pipeline + `cand` + `selbar`. 06e dialog has a summary row + textarea:
  use Modal Type=Content.
- arh-06c dialog: GEAP Modal Type=Confirmation with the two record lines + note in `Message` (code shows grey record rows + a grey info
  box) — rebuild as Type=Content with rows + info note for a 1:1 match.
- Column 02 toolbar frames „Filtrare candidați la nimicire” / 01 „Filtrare politici” fill unbound (captured white).
- Sidebar: the code shows Permisiuni / Formulare globale / Șabloane globale under Administrare; the library sidebar variant lacks them.

## Open (column 01, older)
- (done) Switch Medium → local Switch · Medium 208:4229.
- (done) 03c recaptured at the top.
- (done) stars replaced.
- (done) lanes separated; Start here 02 = 3 blocks.
- (done) code tu form + gutter (3b46b638) mirrored.
- Audit (file version, 8 blocks): left only declared table items (clipped columns in Table scroll, FIXED code column widths) + the 2 stars.

## Done 2026-11-24 (arh-board-v3)
- **Dossier numbers restored** (user finding): the „Button - Copiază D-…” frames the v2 cleanup deleted WERE the copy component holding
  the number → Nr. dosar was empty in 06 / 06b / 06c (+ the new 06e / arh-10). Now `Copy value` Compact instances (stored `nums`; numbers from
  headless Chrome `--dump-dom ?state=…` → `data-workplace-row`). Col 01 had no emptied cells. NEVER delete „Button - Copiază …” again: swap it.
- „Șterge” (code 3dc0a65d) replaces „Confirmă nimicirea” / „Confirmă”: selection bars 06b / 06c / 06e, 06c dialog button, arrow, notes, selbar.js.
- arh-06c dialog = Modal Type=Content: 2 grey record rows + svc/info-note, red „Șterge” (228:8005). arh-06e = same dialog kind with lead,
  1 record row, textarea Destructive „Câmp obligatoriu.” 0 / 500, primary „Respinge” (226:6340). arh-06g = boxed empty (checkmark-large) at the top,
  table frame removed. Arrows col 02: Bifează rândul → 06b, Șterge → 06c, Respinge → 06e; col 03: ⋮ → arh-11.
- arh-10 / 11: header title „Registru Dosare”, sidebar Registre active (LIB screen with `title`, `active:false` + manual item State),
  toolbar raw buttons → library rect buttons (Căutările mele Trailing chevron, Salvează căutarea Disabled, Exportă = clone of 210:6092),
  arh-11 menu = clone of 01f menu, 7 Post-process items (Arhivează / Radiază / Anonimizează = Danger like the code).
- Toolbar „Filtrare …” fills bound to white (col 02 + 03).

## Open (next job)
- Column 03: **arh-11a** (archive confirm — `dlg`: lead with bold nr, lead, info note „Politica aplicată…”, Primary „Arhivează” + 24/page-text-lock),
  **arh-12** (restore — `dlg`: lead, radio group „Scopul restaurării” Pentru vizualizare / Revine în procesare, textarea „Motivul restaurării”,
  Primary „Restaurează” + undo icon), **arh-13** objects drawer, **arh-14** versions drawer (800 drawers: PP("drawer") then check).
  Run `nums` (col null or „Nr. dosar”) after every capture; never delete „Button - Copiază”.
- arh-10 / 11 „Salvează căutarea” shows the library default „+” icon (the bookmark swap did not take — find the right Leading Icon prop);
  arh-11 „Deschide dosarul” uses 20/document-filled (no outline 20/document in Foundations); 24/page-child / shield-keyhole / bookmark are 24 glyphs.
- Audit cols 02 + 03 left: fractional captured cells (62, minor), „manual · X” mixed-font texts in arh-10 (Onest weights mixed → audit reads „mixed”), 
  arh-10 status column „Starea înregistrării” sits beyond the 1440 table scroll (as the code).
- 06g sidebar keeps the Setări group; Registre screens hide it (code does too).

## Done 2026-11-24 (arh-board-v4)
- arh-10: table shown scrolled to the end (pinned Nr. dosar start column with shadow, ⋮ end column) → „Starea înregistrării” + „Data arhivării” visible;
  all captured status tags in arh-10 / 11 (Statut dosar + Starea) are library tag-filled Small (purple „Spre coordonare” = Brand: library has no purple).
- arh-10 / 11 „Salvează căutarea” = Foundations 24/bookmark in the button's `Leading Icon: 16` slot (Small buttons use the 16 slot — the 20 swap
  was the bug), resized 16. Code uses `save-outline` there and `bookmark` on „Căutările mele” (library button has no leading + trailing icon).
- arh-11: search State Filled + clear ×, „Salvează căutarea” enabled (= code).
- New blocks (no capture — clones of the converted arh-11 screen, row texts set from headless `--dump-dom`): 11a archive confirm (`dlg` + info note,
  Primary „Arhivează” 24/page-text-lock at 20), 12 restore (`dlg` lead + radio group + textarea 0 / 500, Primary „Restaurează” central
  arrow-undo-up 1.5 r2), 13 objects drawer (`drw` + 5 GEAP svc/stack-item rows: tag Arhivat, 2 meta lines, Neutral „Restaurează”, last row no
  divider), 14 versions drawer (`drw` + select-input Filled 448, H5 heading with divider, hint, table: checkbox Small, Curentă Brand tag, date + time,
  Arhivat tag, 16 document icon + file name; „Compară” Disabled).
- Arrows (lanes): arh-11 menu Arhivează → 11a, Obiecte arhivate → 13, Versiuni → 14. Start here line 03 = 6 blocks, cover 19 blocks.

## Open (next job)
- **arh-11c** (⋮ of an archived dossier: Restaurează / Obiecte arhivate / Versiuni) is the real source of the 12 / 13 / 14 arrows — build it
  (clone arh-12 screen without the dialog + clone the arh-11 menu with the archived items) and re-point the 13 / 14 arrows, add Restaurează → 12.
- arh-11b (archived, success toast), 12a (reason error), 12b (restored), 13a (empty: boxed, page-child), 13b / 13c (object restore), 14a–14d
  (two picked → Compară enabled, compare modal, version viewer, single version) not built.
- arh-13 Nr. dosar in the meta is plain text (code = Copy value Compact): svc/stack-item puts its Copy value FIRST in the meta line, the code puts it
  last — needs a stack-item variant or leave as text.
- arh-14 versions table: the code shows the PDF column half-cut (table scrolls sideways at 760); Figma cuts at the Starea column edge.
- **Column 04** (180:25): arh-15 (archived dossier read-only card: Arhivare card, Documente, Jurnal), 15a–c, arh-16 (destroyed, minimal data),
  16a / 16b, arh-17 / 17a / 17b (saved searches) — not started. Card screens = capture (`cap.sh`) + LIB pipeline; never delete „Button - Copiază”.
- Audit col 03 (file version): no majors; left = intended sideways table clips, captured cell wrappers cut by their own captured „Text” frames in
  arh-10 / 11 (code truncates there too), „manual · X” mixed-weight texts, fixed-width captured cells (minor).

## Done 2026-11-24 (arh-board-v5)
- Icons (user, page-wide): menu „Obiecte arhivate” = Foundations 20/bullet-list (code list-bullets, never page-child); „Deschide dosarul” = outline
  24/document at 20 (never document-filled); „Salvează căutarea” (7 buttons) = central „floppy-disk-1, save” filled=off 1.5 r2 (code save-outline) at 16.
  „Căutările mele” keeps Trailing chevron only (library button has no leading + trailing; code also shows a bookmark).
- arh-11c = arh-12 screen without the dialog + the 11 menu cut to Deschide dosarul / Restaurează (Default, central arrow-undo 240:8502) / Obiecte
  arhivate / Versiuni / Anonimizează (Danger); row ⋮ State Focus (also on arh-11). Arrows Restaurează → 12, Obiecte arhivate → 13, Versiuni → 14 from 11c.
- arh-13: Nr. dosar = svc/stack-item `Show copy value 2` group („Nr. dosar:” + Copy value Compact); order differs from the code (number first, code last).
- Column 04: 15 / 15b / 16 captured (card pipeline above; Jurnal chips = library filter-chip + Counter Badge, radius-8; search = arh-10 search clone;
  Sortează = filter chip + 24/sort at 20; event status = 16/circle-checkmark-filled); 17 = arh-10 clone + menu (2 items 24/bookmark at 20, first Hover,
  trigger Focus); 17a = arh-10 clone + `dlg` (lead, criteria row) + library text-input Focus „Denumire” * in the slot, Salvează căutarea enabled.
- Arrows: Jurnalul evenimentelor (15 tab → 15b, lane +100); cross-column = `anchor · cross · <label>` in section 03 at x 1716 + 32k, end on the target
  screen's LEFT edge: Deschide dosarul (11c) → 15, Căutările mele (10) → 17, Salvează căutarea (11) → 17a. Restaurează lane moved to x 1700 (pill cleared the screen).
- Start here 03 = 7, 04 = 5 blocks; cover 25 blocks.

## Open (next job)
- arh-17a background = arh-10 list (code: Starea înregistrării = Arhivat applied, filter bar + Filtrare 1); 15a (Documente), 15c, 16a / 16b, 17b,
  11b, 12a–c, 13a–d, 14a–d not built (16a = same layout as 15 + a second notice).
- Detail cards in 15 / 16 are captured rows (text + tokens), not svc/field-row; event titles in 15b are captured text frames („Event title”).
- arh-16 has no incoming arrow (no destroyed-row list block; arh-10b filter not built).
- Sidebar still lacks Permisiuni / Formulare globale / Șabloane globale / Șabloane de jurnalizare / KPI (library variant).

## Done 2026-11-24 (arh-board-v6, sync with code cb568934 / bb3d1a33 / 9c903692)
- 06 / 06b / 06c / 06e: every non-selectable row now has the library checkbox Small State=Disabled (unchecked) in the empty cell of the checkbox column
  (clone of a row checkbox, named `checkbox · row · disabled`); enabled rows unchanged.
- Actor responsabil (arh-10 / 11 / 11c, + the 17a list) = shared table person: library Avatar Type=Initials Size=Extra Small (24, fill = the code's per-person
  colour, white initials) + name 14/20 500 (Body/Small 500) + line 2 12/16 („aleatoriu” / „manual · <name>”, mode word medium); cell `Container` HORIZONTAL gap 8,
  actor column 208 (cell min/max width released). „Nerepartizat” stays plain text (code too).
- arh-13: Nr. dosar at the END of the meta line as plain text in `Meta 1` („… · Nr. dosar: D-…”), `Show copy value 2` off — the library stack-item (remote main)
  puts its Copy value groups before Meta 1 and instance children cannot be reordered. Open: a stack-item variant with a trailing copy slot.
- arh-17a: list behind the dialog = Arhivat filter applied (Filtrare chip Selected + badge 1, `Facet filters` row: Starea înregistrării selected + 4 chips, „12 rezultate”,
  „Șterge filtrele”, 12 filtered rows from the code, Starea = Arhivat, Data arhivării filled). Facet chip radius 20 is unbound (no radius variable in this file).
- Not run: figma-audit.js (51 KB, over the use_figma code limit) — coordinator runs ui-qa-figma on 215:5648 · 217:6024 · 219:6474 · 228:7973 · 232:6939 · 235:8304 · 248:9751 · 244:9513 · 257:19173.

## Component locations (2026-11-24, arh-components-move)
All Arhivare local mains live on page 🧩 Local components `50:6605`, section **Arhivare** `279:11999` (white, row, gap 80):
`Input · duration` set 187:133 · `Switch · Medium` set 208:4229 · `Selection bar` 60:7488 (shared with other boards).
The Arhivare page `180:20` holds only the 5 sections + arrows (connector template 180:26 hidden, 3 cross-section connectors 259:18711 / 18717 / 18723).
Deleted: 3 empty „Sticky placeholder – Container” frames. Instances verified linked (12 / 6 / 3). New components go into section 279:11999, never onto the board page.

## Done 2026-11-24 (arh-pub-v1, code 5f72ba1e) — publish + versions
- New section **01b · Publicare și versiuni** 299:13601 (x 3160; sections 02–04 shifted +1880). Pattern = Widgets / KPI publish boards 1:1 via the
  published GEAP components: pending dialog = `Unsaved changes review` (537c2f53…, Group 1 „Modificat” + Change rows with Tag, Undo hidden, Închide /
  Publică), list status = `Header status` Size=Caption (5dc87a93…), publish / restore = Modal Type=Content via `dlg` v2, Versiuni tab = svc/info-note +
  `svc/section-heading + action` (42b45fc8…, „Compară versiuni” Secondary Small + 20/history) + grey r20 card of `svc/timeline-step` Success (titles
  underlined), compare = section headers + white r16 card with 2 select-input Filled + change list (Change row 54611ee7…, old value struck through).
- arh-07 = capture (cap.sh) + list pipeline; the captured `Container:scroll-content` came in ABSOLUTE at x −1150 (the code's scrollLeft) and the sticky
  Nivel cells as empty placeholders → put in flow, Nivel cells cloned from „Tip obiect” cells + texts, header chevron-top, zero-height 2334 sticky
  Containers deleted. Nivel in `Table / Pinned column` Start, Table scroll MAX (scrolled to Versiune). arh-01 screen = unscrolled clone (MIN, start
  No shadow, end Shadow). Header / sidebar title „Arhivare și păstrare” (= code; LIB still writes „Politici de arhivare și păstrare”).
- Drawers: arh-03 / 03c footers Anulează · Salvează ciorna · Publică, arh-04 Anulează · Salvează (Disabled) · Publică, footer right-aligned, body FILL;
  arh-04 tab strip Politică · Versiuni 3 · Istoric (clone of the arh-15 `Tabs`, Badge on) + Message · subtle Warning „Modificări nepublicate.” (bold lead).
- `dlg` v2 (stored + this folder): `{heading}`, `{changes:[[title, old, new]]}`, note `bold`, area `hint`, `A.overlay` (dialog overlay over a drawer).
  Dialog-over-drawer screens: clone the drawer screen, 1440 × 900 clip, body clip, + ABSOLUTE `Overlay · dialog` (scrim fills of the drawer overlay,
  HORIZONTAL centred) with a `Dialog` placeholder → DL({screen, overlay, …}).
- Arrows: lanes in 01b (Modificări nepublicate → 07a, Publică → 07b, Publică fără notă → 07h, Compară versiuni → 07d, Versiunea 1 › Restaurează → 07e);
  cross from arh-04 (anchors `anchor · cross · …` in section 01 at x 1740 / 1772, RIGHT → target screen LEFT edge y 300 / 348): Publică · dialog → 07b,
  Fila Versiuni → 07c. Start here line 01b + cover 32 blocks (5 columns).
- Not drawn: arh-07f (version window), 07g (Istoric), 07i (published + toast), 07j (= the Schiță row, already in arh-07), 07k (first publish).

## Open (next job, publish)
- (done 2026-11-25) arh-01f 196:1690 and arh-05 205:3622 now carry the Versiune table (clone of 299:20200); 01c (boxed empty) and 02 (denied) have no table.
- Change row `Show divider` shows no visible line inside the dialogs' change list (code has a divider between rows) — check the GEAP main.
- Track line ABSOLUTE in the drawer tab strip (library pattern, audit absolute-in-flow), captured `Text` (2 children) wrappers in the drawer form,
  07a dialog y .5 (centred 381 in 900).

## Done 2026-11-25 (arh-nivel-v1)
- **Nivel is no longer pinned** (user: pinning Nivel is nonsense): arh-01 screen 299:20178, arh-07 299:59 and the 07a clone 303:15399 have the Nivel column
  (`Column · Nivel`, 120, first column) back in `Table scroll`; the Start `Table / Pinned column` instance is removed, only the End ⋮ column stays pinned.
  Sections 180:22 / 299:13601 have no other Start pin (all other tables already carried Nivel in the scroll). Nivel cell min / max width set to 120 (the pinned
  column had 163-wide cells cut at 91).
- arh-01f / arh-05: table replaced by a clone of the arh-01 table (Versiune + Modificat columns off-scroll); 01f keeps the ⋮ of row 7 in Focus + the menu, 05 the dialog.
- 07a dialog y .5 → whole px (minHeight 382, y 259); captured `Text` label wrappers (+ required star) in 07b / 07h → HORIZONTAL auto-layout gap 4.
- Audit (file version, stored in root shared plugin data `arh`/`audit` = comment-stripped, responsive part removed; run `new Function("return ("+src+")")()([ids])`):
  arh-07, 07a–07e, 01, 01f, 05 → 0 majors; left = sideways table clips (intended) and the library `Track line` ABSOLUTE in the drawer tab strips (5).
- **Code gap (proto-engineer):** the rendered code (`?state=arh-07`) still shows Nivel sticky at the start of the table (js/arhivare.js columns config has no pin for
  `nivel`, so the shared table's default first-column sticky applies) — unpin it in code to match Figma.

## 2026-11-25 (arh-edge-v1)
- Toolbar gap: captured `Acțiuni tabel` frames had minWidth 130 around a 32 icon button → minWidth cleared + HUG on all 14 screens (Exportă ↔ Adaugă politică = 12, as code).
- Scrolled tables without a start pin (arh-07 299:1767, arh-07a 303:15423): ABSOLUTE `Scroll edge · start` (8 × table height, white, x −8, constraints MIN / STRETCH, effect style „Table / Pinned column – start”) inside `Table scroll` = the code's `.table-scroll-edge--start`. Re-add on any new scrolled table without a start pin.
