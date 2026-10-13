# Playbook — figma-designer (GEAP 2.0 Figma)

Read this whole file before every Figma job. **Append to „Lessons” after every job** (what broke,
what the user corrected, what worked better) — one dated line each, with the fix. Promote a
lesson to the right section above when it has proved itself twice. This file is how the agent
gets better; never delete a lesson, rewrite it if it was wrong.

## The file
- fileKey `aHgwVwiNCOSOqbMhMjjUOj`. BO page „↳ BO -> Servicii / Pașaport Serviciu”, section
  „Profile Serviciu” `9522:7973`. Columns of **blocks** (1920 wide, gap **240** between blocks).
- A block = `Screen label · <id>` (ID chip, title, Status instance, „Prototype ↗” text with a
  hyperlink to `https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=<demo-state>`)
  + the screen frame (1920 × ≥1024, header-evo-desktop + Body (sidebar instance + Main)) + optional
  `Overlay` (scrim + drawer / dialog) + `Note · <id>` (tag „NOTE DEV / PM”, title, body text).
- Block ids follow the column: 03 → 03a, 03a1 …; new states between existing ones get a suffix
  (03a3a, 03a3b; 05c1, 05c2). Keep the column in tab / flow order.

## Workflow (code first, then Figma — always)
1. The screen must exist in the prototype with a demo state (`js/demo-states.js`). If not, ask
   `proto-engineer` to build it first.
2. **Capture** each state (or just the changed element) from code:
   - `mcp__figma-a__generate_figma_design { fileKey, nodeId: <a scratch/holding node> }` → capture id
     (ask for all ids at once, one per state).
   - `node --experimental-websocket --no-warnings tools/figma/capture-to-figma.mjs --state <id> --capture <cid> --selector "<css>" [--full]`
     Prefer an element selector: a list section `.e-permits-stack-section`, a drawer
     `[data-doc-drawer] aside`, a drawer panel `[data-rt-drawer] .e-permits-tariff__panel`, a modal
     `#service-confirm-modal .modal`. `--full` = drawer grows to its content.
   - Poll `generate_figma_design { fileKey, captureId }` → node URL. Where it lands: under `nodeId`
     if given, otherwise on the first page (move it).
3. **Swap to library instances**: run `tools/figma/swap-to-instances.js` (ROOTS = the capture
   roots) via `use_figma`. Read its `unmapped` list and fix those by hand; extend the script +
   this playbook when a new control type appears.
4. **Assemble the block**: clone the nearest existing block of the column (it carries the shell:
   header, sidebar, tabs as instances), replace only what changed (the list section, the drawer
   panel, the overlay), update label / ID / title / note / link, select the right tab instance.
5. **Restack** the column in order with 240 gaps — compute the order list first, then assign y
   sequentially (never compare against a block you already moved).
6. **Arrows** from the clicked element to the next block: clone an existing connector
   (e.g. `10952:283686`), set `connectorStart.endpointNodeId` = the clicked instance (not a
   sublayer of an instance — ids with „;” can't be endpoints), `connectorEnd` = target block,
   magnet RIGHT, label = the action. **Never draw arrows as VECTOR paths / „Flow · …” groups.**
   When the clicked control lives inside an instance (header button, tab, menu option, segment),
   drop a local `Flow anchor` instance (`10438:120705`, transparent) over it in the screen frame
   (ABSOLUTE, sized to the control, name `anchor · <label>`) and attach the connector to the anchor.
7. **Whole column rule**: the same UI elsewhere in the column changes too (e.g. a new drawer tab
   goes into every drawer block of the column).
8. **QA**: run the `ui-qa-figma` agent on the new / changed blocks (+ demo states). Fix the major
   findings, re-run, then report. Screenshot each block once at the end.
9. Figma comments: reply „✅ Rezolvat — …” (what, where: block ids, prototype states, open
   questions) only after the change is in Figma (REST POST comments with `comment_id`; token
   from the transcript into an env var, never into a file).

## Library ids (verified 2026-10-12)
| What | id | Notes |
|---|---|---|
| select-input (set) | `8344:81663` | Style Default/Destructive × State Default/Hover/Focus/Filled/Disabled × Size; props Label `👁️ Label#132:24`, star `👁️ Mandatory Star#316:0`, hint `👁️ Assistive Text#143:22`, text `⌨️ Placeholder#215:38`. Destructive+Disabled has NO assistive slot |
| text-input (set) | `6490:68585` | same props as select |
| checkbox option „Opțiune document · checkbox” | `10507:44447` | Label `Label#10507:0`, star `Asterisc#10507:9`, glyph `Iconiță#11007:0` + `Iconiță · glif#11007:9` (person `6502:74649`, suitcase `10641:1308`) |
| tag-filled | `10602:106194` | always Size=Small; label `⌨️ Label#387:32`; icon `🔄 Leading Icon: 16#12870:6793` |
| button-filled-rectangular | `5611:63230` | „Editează” proto `10317:33373`, „Adaugă …” proto `10316:33412` |
| button-text-rectangular | `5749:34743` | ⋮ / × proto `10317:33419` (swap inner icon: 20/more-vertical `9521:7912`, 20/cross-small `242:12038`) |
| button-text-circular | `5919:31320` | text buttons (Elimină = Destructive, Adaugă condiție = Primary Leading) |
| button-filled-circular | `8382:91415` | footer Large (Anulează Neutral, Salvează Primary, destructive confirm Destructive) |
| switch | `2009:19057` | inside `svc/switch-label` `9563:18803` (Label `Label#9563:0`, `Supporting Text#9563:1`, `Show supporting text#9563:2`) |
| info note | `9624:13362` | `svc/info-note`, text `Text#9624:0` |
| tab-item-s | (instances in drawers) | `⌨️ Label#382:21`, `🎚️ Type` Selected/Unselected |
| selection-menu | main of `10571:216146` | open dropdown list; items `.menu-item-selection` `9625:34931` (`Option Label#400:63`) |
| Modal „Tip=Selecție” | `10704:158854` | close pinned right |
| RAP row (Câmp / Coloană / Titlu tabel) | `10949:277452` | |
| header-evo-desktop / -mobile (lib sets) | `11077:1058` / `11153:1253` | imported; mobile used inside `Cabinet / Antet mobil` |
| search-input-rectangular | `9285:37474` | State Default/Filled/Focus…, `👁️ Clear Button`, `⌨️ Placeholder` |
| filter-chip | `1244:34029` | Mono Selection; `👁️ Counter Badge` + „Badge label” text; Filtre = Icon Leading + 20/filter (key d7ef1839…) |
| contextual-menu / selection-menu | `9646:4478` / `9625:34945` | ≤ 6 options each; items `.menu-item-action` `62:4943` (Leading Element=Icon for icons) |
| pagination-item | set `212:7429` | Type Selected/Unselected; pager arrows = button-text-rectangular Strict Icon=Only + `🔄 Leading Icon: 20` = 20/chevron-left/right |
| tooltip / toast / banner / info-box | `275:24285` / `10038:35031` / `10582:50841` / `5611:64071` | imported 2026-10-12 |
| date-input / checkbox-label | `244:20250` / `1228:33646` | date: Label + Assistive Text props; checkbox: Mode Checked/Unchecked |
| Modal (local) | `10136:657` | Tip=Confirmare (Titlu, Mesaj, 2 btns) · Tip=Conținut (Titlu, Subtitlu, `Conținut` INSTANCE_SWAP) |
| EVO Cabinet local components | frame `11100:288632` on FO Full Flows 09 | `Cabinet / Antet` 11100:289066 · `Cabinet / Antet mobil` 11153:262259 · `Cabinet / Dosar card` 11100:289564 (+ mobil 11155:50155, static 11152:303548) · `Cabinet / Serviciu card` 11105:290265 · `Cabinet / Marcaj` 11100:289209 · `Cabinet / Meniu acțiuni` 11118:297930 · `Cabinet / Meniu · Sortează` 11118:293504 · `Modal conținut / Filtre solicitări · …` 11152:303710 / 304028 |
| Icons (Foundations keys) | — | 20/download e6dd0e97… · 20/arrow-left f9c5634d… · 20/external-link 8df5d4b1… · 20/edit bef76865… · 20/credit-card aca711a4… · EVO 20/refresh caca3c5f… · central sets: trash b5e9b87b…, file-text 032cdf84…, user-circle 7f8dfe57… |

## Rules (from the user — never break)
- Auto-layout + instances everywhere; no raw frames for controls; no 1px-border padding hacks.
- A field is ONE component: its own Label + Mandatory Star + Assistive Text (errors = Style
  Destructive + „Câmpul este obligatoriu.”). Never a hand-built label/star/hint beside it.
- Button icon colour = label colour (never override fills on button instances).
- Obligatoriu = checkbox option with red star. Tags = Small. „Editează” always with pen.
- No monospace — except rule-builder keywords (`Când`, `și/sau`, `acest document`) = JetBrains
  Mono code tokens, grey fill, no border.
- Never clip content: grow the screen (and Body, Overlay, Drawer) to fit; small modal screens = 1024.
- Desktop = mobile content. Last row in a card/list has no divider. Hover/open states drawn when
  the flow shows them. Arrows from the clicked element.
- Figma = source of truth for design; prototype code = source for behaviour; they must match.

## Plugin API gotchas
- `await figma.setCurrentPageAsync(page)` before `findAll` on another page; once per call.
- Results capped ~20 KB — return counts + ids, not trees. Long scripts (> ~5 min) time out:
  one block per call when cloning big blocks; after a timeout CHECK what exists before retrying.
- A failed script rolls back entirely (atomic) — safe to retry after fixing.
- Freshly cloned instances don't expose sublayers to `findAll` — walk `.children` by name.
- `node.removed` before touching a node you may have deleted in the same loop.
- Mixed fonts: load every segment's font (`getStyledTextSegments(["fontName"])`) before editing.
- Captured text may use SF Mono → set `fontName` to JetBrains Mono Regular.
- Grid auto-layout (`layoutMode === "GRID"`): place children with `setGridChildPosition(row, col)`;
  `gridRowCount` can be set to drop empty rows; anchor indices are read-only on instances.
- Swapping an instance resets its overrides; to change a nested instance (e.g. the switch inside
  switch-label, the icon inside a button) swap the inner instance directly.
- Size=Large / variant swaps can reset icon swaps — re-apply icons after variant changes.
- Connectors can't attach to instance sublayers; connector `text` needs its font loaded.
- `setSharedPluginData`, not `setPluginData`.

## Lessons (append — newest last)
- 2026-10-12 · Captures land as raw frames; swapping by accessible layer name works well. The
  sidebar icons of a full-page capture break → capture elements, not pages, and reuse the block shell.
- 2026-10-12 · Restack bug: comparing remaining blocks against an already-moved block skipped
  three blocks → always restack from an explicit ordered list.
- 2026-10-12 · QA found hand-built labels beside field components (major) → absorbField in the
  swap script; ui-qa-figma rule `field-label-outside`.
- 2026-10-12 · `svc/switch-label` label was 16px; code is 14 medium → fixed on the component
  (applies to every Setări block). Check component text styles against the code CSS.
- 2026-10-12 · Overwrote a select placeholder by writing to „the last child's text” — target text
  nodes by name (`Placeholder`, `Label`), never by position.
- 2026-10-12 · The empty 427×20 „Text” frames from captures are spacers — delete them.
- 2026-10-12 · „Adaugă …” button came out centred because its captured parent had no
  auto-layout — give such wrappers HORIZONTAL auto-layout, MIN alignment.
- 2026-10-12 · swap-to-instances absorbed a row of parameter buttons (below a field) into the
  field's error text and deleted it → absorbField now takes only plain text paragraphs and stops at
  the first sibling that contains a button/instance. Screenshot every swapped capture before use.
- 2026-10-12 · Parameter-token buttons (`Button - Inserează …`) are not in the swap rules → map
  them to button-filled-rectangular Neutral Small (`5611:63230`) with a JetBrains Mono label;
  a raw „Button” whose text is „Elimină” → button-text-circular Destructive Small. A section that
  grows past the 1024 screen → grow the screen (Body/Tab content are FILL) by the overflow + 40.
- 2026-10-12 · QA: captured read-only values („Valoare curentă”) are raw label + white box → use
  local „Setări · Câmp read-only” `10638:1577` (Fundal=Alb on a grey card). When replacing a GRID
  child, copy `gridColumnSpan` first, then `setGridChildPosition(row, col)`, then drop empty rows
  (`gridRowCount`) — a new child lands in a new 1-column row otherwise.
- 2026-10-12 · FO / EVO Cabinet job (53 blocks, section 11067:34873): full-page captures at 1440
  (`capture-to-figma.mjs --page cabinet-evo/index.html --width 1440 --height 900`, new `--width` flag;
  375 for mobile) are clean — capture-binds colours + spacing but **no text styles** → always run
  TOKENIZE (now `tools/figma/tokenize.js`, + H1 and `{mobile:true}` Mobile headings).
- 2026-10-12 · `generate_figma_design` ids: ask ~10 at a time, run the captures in one bash loop, then
  poll each id in order — the capture lands only when polled; node ids come back in poll order, rename
  each root `cap · <state>` right away so the mapping can't slip.
- 2026-10-12 · Long builders live in hidden Figma text nodes and run with
  `new (Object.getPrototypeOf(async function(){}).constructor)("ROOTS", text)(ids)` — patch them with
  string replace instead of re-pasting 20 KB (`__swap-cabinet` 11105:34597, `__tokenize v2` 11105:34598,
  `__swap-cabinet-overlays` 11118:39161, `__assemble-blocks` 11156:49699). Keep the repo copies
  (`tools/figma/swap-cabinet*.js`, `tokenize.js`) in sync.
- 2026-10-12 · Swap scripts must never match layers inside instances they just placed (my Antet
  component has its own „Header” frame → infinite re-swap / negative index) → filter with an
  `own(n)` ancestor check.
- 2026-10-12 · `swapComponent` on a parentless (just created) nested instance did not stick for the
  pager icons → set the button's `🔄 Leading Icon: 20` property with the component id instead.
  Small buttons use the `: 16` slot — resize a 20px icon to 16.
- 2026-10-12 · Captured meta rows wrap → the copy button is flattened (no „Button - Copiază” frame):
  detect cards by the `GEAP-…` text, not by the button. Non-auto-layout inline rows (IDNO + nr,
  file + • + size) → HORIZONTAL hug with the measured gap; GRID rows need `setGridChildPosition`.
- 2026-10-12 · Mobile: never put the desktop card component in a 375 screen (it overflowed to 855) —
  build the mobile variant set from a mobile capture; mobile header = library header-evo-mobile +
  title row + tab strip (`Cabinet / Antet mobil`). Truncate long file names (FILL + ENDING) in doc rows.
- 2026-10-12 · Destructive style only for a red fill — „Elimină schița” is Neutral + trash in code.
  Profile action icons by label (Continuă → edit, Elimină → trash, Vezi actul → file, Achită → card,
  Descarcă → download, Încercați din nou → refresh).
- 2026-10-12 · Agent tool unavailable in this session → ran `tools/ui-qa/figma-audit.js` rules myself
  (read-only), fixed: tag-like frames 18/30px, inline rows, chip lists (wrap), clipped numbers,
  untokenized local components, unbound header/overlay fills. Re-run until only intentional items stay.

- 2026-10-12 · QA round 2 (ui-qa-figma, cabinet): pager arrows that were swapped before the runner
  patch kept „+” → after patching a stored builder, re-run the fix on EVERY root already processed;
  prev arrow = State=Disabled on page 1 (next on the last page). Progress trackers → `.step-desktop`
  1117:10830 / `.step-mobile` 1630:53322 rows (state from the captured icon colour). Callouts →
  local `Cabinet / Callout` (5 tones, icon = swappable instance, icons deduped by SVG hash in shared
  plugin data); one-line page messages → local `Mesaj · subtil` 9845:17951. Role-card avatars →
  library avatar 5383:28521 (Small; PJ = Icon + suitcase 10641:1308). Never set a doc-row icon
  wrapper to FILL when fixing truncation — only the text column / title fill.
- 2026-10-12 · Mid-job the whole section 11067:34873 (all 53 blocks + local components) disappeared
  from the page while the map frame stayed at page level — not done by any of my calls. When a
  node id suddenly returns null: stop, list the page, report; don't rebuild blindly. Restore = Figma
  version history.
- 2026-10-13 · Servicii 08a/08b carried a captured raw „Shell header” (different alert/notification
  icons, pill avatar) → the BO header is always the standard „Main Navigation” (button-text-circular
  back + 2 `.header-action` + `.role-switch-item/general`); clone it from a good block (02s7
  `10666:73777`). Scan the page for `Shell header` frames after any clone/capture.
- 2026-10-13 · Captured reading columns (1024) sat left in a 1662 panel → panel counterAxisAlign
  CENTER + column FIXED 1024, as in code. Swapped inputs in a HUG parent shrink → set FILL on input
  and parent.
- 2026-10-13 · 13 sidebar instances had the Tarife icon overridden to brand blue while unselected →
  scan every page: per nav item (one text + its icon instance), icon blue ≠ label colour = bad
  override; reset the vector fills to the main component's bound paint. Same check after copying
  sidebars from a screen where another item was selected.
- 2026-10-13 · Big page sections split per column (user): one SECTION per band („Servicii · NN ·
  …”), members by band x-range, absolute positions kept, flow groups left of a band belong to that
  band (check overlaps), then sections re-spaced 400 apart, tops aligned; connectors stay attached.
- 2026-10-13 · Dosare trajectory had drifted from code (grey filled card; callout 20/20, inset 24) →
  card = white + border/base/default 1px, r24, p20; „Dosar / Acum · callout” = p12/16, gap 12,
  r 0 0 24 24, title 14/20. Compare a block with the live state screenshot before calling it aligned.
- 2026-10-13 · Every BO page starts with a section „Cum se citește · Cuprins” left of the content
  (400 gap, tops aligned): the „How to read” note + „Cuprinsul paginii” = a wrapping grid of column
  cards (340 wide, 5 per row); card title = band name + count (NODE link to the band), one line
  per block (NODE link), brand text token. Rebuild it when blocks are added/renamed.
- 2026-10-13 · All page sections have a white fill (background/base/default token).
- 2026-10-13 · Setări error states: the section card with field errors gets a 1.5px
  border/danger/default stroke (02j1, 02h1, 02n1, 02s7a, 02p5) — mirrors `.has-error` in code.
  Hide the field's „Inline message” slot when it has no message (leftover placeholder).
- 2026-10-13 · User: „why don't you use our dynamic arrows?” — the Servicii page still had 106 static
  arrows (GROUP „Flow · …” = VECTOR „path” + label frame). Never draw arrows as vectors/groups;
  always clone connector `10952:283686` (blue var stroke, 3px, ELBOWED, ARROW_LINES end, label;
  load `tpl.text.fontName` before setting `c.text.characters`). Converted all 106 → connectors:
  path vertices × vector `absoluteTransform` give absolute points (the vertex with the ARROW cap =
  end); start magnet = first segment direction, end magnet = side the last segment enters
  (moving left → RIGHT). Start node priority: label-text match within 45 px of the start point
  (instance sublayer → `Flow anchor` overlay) → small node under the point → label match anywhere
  in the block → instance under the point (modal) → the block. Paths go stale after restacks
  (02 nav arrows landed one block off after 02s7a was inserted) → check every end block name
  against the label and override by label; points off-block by < 800 px → nearest block. Dry-run
  the whole page first (one compact row per arrow), then convert one section per call; delete the
  group only after both endpoints are confirmed attached. Finish with a recount (0 „Flow” groups,
  0 vectors with an ARROW cap) and a style-parity check of every connector vs the template.
- 2026-10-13 · US-54 board (section `11224:39519`, ↳ Address Pattens). FO field grids are faster and
  cleaner built from a **DOM spec** than captured + swapped: CDP extractor (label, star, kind
  skeleton/readonly/select/text/phone, value/placeholder, flag, check, x/y/w, search message tone,
  open list options) → stored builder `__build-fo-address` (text node `11231:6896`, repo
  `tools/figma/build-fo-address.js`) → library instances in auto-layout rows (row gaps from x). Then
  `__assemble-fo-block` (`11236:7947`, repo `tools/figma/assemble-fo-block.js`) clones the F3 block
  template and swaps the „Main Frame” (desktop instance / mobile frame) for the built frame. Heights
  matched the prototype to the pixel (740 / 668 / 648).
- 2026-10-13 · Library ids found: phone-number-input key f2ba725d…, spinner key d38a117c…, checkbox
  (box only) key e915a93e…, button-outlined-rectangular key 4ca8aa00…, segmented-control key eae5f7eb…
  (`.segmented-control-item` Mode On/Off; set item text by override), home-line (central) key a5d81e73…,
  trash (central) key b5e9b87b…, inline-message set `38:1973` (Default/Success/Error/Warning, `📍 Icon`),
  local `.menu-item-selection` `1138:13821` (Icon + Description — saved-address rows), country flag
  `2171:6978`. Import remote sets **by key inside the script** — a set imported in an earlier call is gone
  (getNodeByIdAsync → null) unless an instance was kept.
- 2026-10-13 · The library search-input has no error style → error state = text-input Destructive with
  `🔄 Leading Icon: 20` = the search-input's own 20/search main component.
- 2026-10-13 · Open dropdown lists drawn ABSOLUTE in their wrap paint UNDER later siblings → set
  `itemReverseZIndex = true` on the column that holds the wrap (first child on top, = code z-index).
- 2026-10-13 · Slimmed specs drop false keys → `setProperties` rejects `undefined` → coerce booleans to
  false in the setter (check the property type).
- 2026-10-13 · Replacing GRID children is fragile (positions / spans scramble, cells size to content and
  collapse skeletons) → convert the GRID wrapper to HORIZONTAL / VERTICAL auto-layout first.
- 2026-10-13 · User: on a pattern board, everything that is not the pattern is **context skeleton**
  (fields → „FO / Context · skeleton” `11258:17226`, text → bars, buttons / stepper → 35 %), builder
  chrome → 35 %; doc says „Elementele gri sunt doar context; detaliile sunt în blocul Adresă.” Script
  `__deemphasize-context` (`11259:13239`, repo `tools/figma/deemphasize-context.js`); apply it to the
  template block so rebuilt blocks inherit it. It once replaced a `Flow anchor` and Figma silently
  deleted the attached connector → the script skips `anchor · …`; recount connectors after any pass.
- 2026-10-13 · Never name connectors after their start node's full name — a later `findAll(/^Block · /)`
  matched connectors as blocks (TOC lines got connector names). Name them „C04 → C06 · label”, and
  filter blocks with `type === "FRAME"`.
- 2026-10-13 · Long jumps across bands = Requestor-style „Marker · → NN · ID” cards (clone `9831:35799`)
  + a short connector; board-wide elbow connectors cut through every column.
- 2026-10-13 · `generate_figma_design` returns ~6 KB of instructions per id → ask only for the ids you
  need; full-page builder captures (1440×900) are fine as context once their controls are swapped
  (`tools/figma/swap-builder-address.js`) and de-emphasized. Capture tool got `--hide`, `--keep-focus`,
  `--css` (unclip scrolling panels, keep the „Configurare flux” panel).
- 2026-10-13 · Mid-job the PO changed US-54 („Cod cadastral” editable). Blocks built from the old code →
  Status=Not aligned until the new adr- states land; keep the pipeline (spec → build → assemble →
  de-emphasize) so a rebuild is one call per block. Rebuild template: page-level
  `11260:255631` (context skeleton applied).
- 2026-10-13 · User: context skeleton = the WHOLE non-subject block (section titles → Title bar,
  labels / inputs → Field, radios → Round, buttons / chips → Box), only header + stepper + page title
  + the subject stay real; then „nicer, with gradient”: `FO / Context · skeleton` `11258:17226` fill =
  GRADIENT_LINEAR tertiary → secondary (45 %) → tertiary with **gradient stops bound to variables**
  (`gradientStops[i].boundVariables.color = {type:"VARIABLE_ALIAS", id}` works), radius 6 bars / 8
  inputs+boxes / full round; widths vary by a stable hash of the node id (titles 35–45 %, labels 25–35 %,
  lines 60–80 %); title bars left-aligned (their container centred them).
- 2026-10-13 · Never read a property of a node after `put()` removed it (Field branch read `n.width` →
  „node does not exist”, whole call rolled back incl. the stored-script update) — capture values first.
- 2026-10-13 · The builder capture's app shell is a CSS GRID (rows 72 / 828, columns 321 / fill / 382);
  the skeleton pass's GRID→flex conversion collapsed it → restore the geometry explicitly (header FIXED
  72 SPACE_BETWEEN, body FIXED 828, side panels FIXED). Next time pass the shell frames as keepIds.
- 2026-10-13 · Before a pass that replaces nodes, move connector starts that live in the replaced area
  onto Flow anchors (`anchor · …`, skipped by the pass); recount connectors after every pass.
- 2026-10-13 · Requirements moved three times in one job (editable code → search-input with submit
  button). Build in this order: board scaffolding, docs, stage 01, template; hold every block that
  shows the changing control; ask for the demo states before rebuilding.
