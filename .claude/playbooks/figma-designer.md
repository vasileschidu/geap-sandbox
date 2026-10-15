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
- No IMAGE fills for icons (captured `<img>` SVGs) — library icon instances only; sweep `iconImageFills` = 0 (2026-10-14).
- Documents = one pattern: BO `Document · row` (was „Document · rând”) 11362:7113, FO / Cabinet `Document · card` 11364:7441,
  modal content `Modal content / Document · details` 11366:6892 (GEAP local); lone view action = „👁 Detalii”, Configurează =
  settings icon, Editează = pen.
- All Figma NAMES are English (user, 2026-10-15): components, sets, variant properties / values, component properties,
  sections, frames, layers, pages. Visible text stays Romanian. Glossary: tools/figma/naming-glossary.json. Names quoted in
  this playbook before 2026-10-15 are the old Romanian ones — look them up in tools/figma/naming-map.json.

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
- 2026-10-13 · User: „the section looks empty” — I parked freshly assembled blocks at x=24000, outside
  the section, stacked on each other. Rule: a block goes into its stage column INSIDE the section in the
  same call that builds it — keep a re-runnable layout pass (ordered column lists, 240 gaps, lane row
  under the tallest column, section resized to content) and run it at the end of every build call.
- 2026-10-13 · Library search-input has no Default/Hover/Disabled with Button=True → empty field =
  Filled+Button with the Default variant's placeholder fill; submit state via the nested
  button-filled-rectangular `🎚️ State` (Disabled until a code is typed). Suggestion rows: local
  `.menu-item-selection` with 20/search for „Caută codul cadastral «…»”, home-line for saved codes.
- 2026-10-13 · Connectors cannot start on context-skeleton elements that no longer exist (footer
  „Înainte” became a Box) → start such jumps from the block; anchors only on real (address) controls.
- 2026-10-13 · FOD-Components-flow file (`pvDAJPXKyUuJgz3P921Ye8`, page ↳ Requestor 265:14041) has NO GEAP 2.0
  local ids — every GEAP script that does `getNodeByIdAsync("10602:…")` fails there. Libraries: „Components”
  lk-03f… (tag-filled a97109f9…, button-filled-rectangular 2cbe2c35…, button-text-rectangular 4ad2518c…,
  button-filled-circular fcf938f6…, search-input-rectangular a27b4efa…, filter-chip 9901c458… (Mode On/Off),
  contextual-menu eca4c78b… (component; items .menu-item-action, Leading Element=Icon), pagination f7149ae3…,
  header-general-desktop 235fd1d6…) and icons „Foundations” lk-e9e8… (more-vertical 8eeb6ea4…, copy 89c577ec…,
  eye-open faa2ea50…, cross-small 3ccb9372…, chevron-left ab64d0fa…); brand text colour = variable
  text/brand/default a43e8033… (found via `figma.teamLibrary.getVariablesInLibraryCollectionAsync`). Two
  „Components”/„Foundations” libraries show in search — pick the one whose key matches an instance already in the file.
- 2026-10-13 · New `tools/figma/swap-cabinet-fod.js` = cabinet swap by library KEY for that file + local
  `Cabinet / Antet` set 649:7540 (Sesiune Autentificat/Vizitator, props Titlu/Nume/Rol; holder frame 649:7396).
  The library header-evo-desktop / header-general-desktop are portal headers (nav items), not the Cabinet header.
- 2026-10-13 · Capture gotchas there: CSS-mask icons (authority) capture as #444 squares → local
  „Icon / Cabinet / autoritate” from the svg; every captured ⋮ carries a stroke → open state only for the menu's
  own trigger; the open ⋮ menu is clipped by the next card → move it to an ABSOLUTE contextual-menu on the root;
  `combineAsVariants` collapsed FILL headers to width 1 → resize variants after combining; a 3px screen outline with
  `strokesIncludedInLayout` pushed content out (clipped-content) → mirror the reference screen (false) + children FILL
  + root HUG. Instance texts are not readable from a fresh `findOne` on remote instances — read colours from variables.
- 2026-10-13 · Connector from an item inside a menu instance: `connectorStart = {endpointNodeId: menu.id,
  position: {x: menu.width, y: option.y + option.height / 2}}` — no anchor frame needed.
- 2026-10-13 · Growing a column section DOWN can hit a lane section under several columns (Guest lane) → move that
  lane down (internals untouched, 80 gap) and say so; growing RIGHT → shift every section to the right by the delta.
  Attached page-level connectors follow. Re-run the layout pass after every fix that changes block heights
  (tokenize / hug changed heights by 6–20 px twice in this job).
- 2026-10-13 · Mid-job correction (coordinator, from the user): the first split in Requestor 01 is „Signed in to
  EVO?” — signed in = MPass session AND the acting EVO instance (PF / own PJ / MPower) are handed over, 03 skipped,
  switch later in 06, permits → 04/⚡ else 05; not signed in → 02. E4/E6 always signed in. Hand-over marked
  „⚠ to confirm with PO / tech” in the note only.
- 2026-10-13 · User reversed Requestor 01 mid-job: NO screens in a flow-map column — entry points are plain
  Flow cards (tag = ID, title, one line + US ids) with a „Links” line: URL hyperlinks to the file where the
  screen lives (EVO Cabinet iitScYOwMYjDayuyrm3750 10:19047 / 444:9934; GEAP 2.0 F0 10815:25418, Post-procese ›
  Entry points 9285:38785, Partea I 10265:4289) + „Prototype ↗”. Ask „screens or cards?” before capturing for a
  map board; capture only for screen boards. Text range links need an object:
  `t.setRangeHyperlink(a, b, {type: "URL", value})` (a string fails validation, whole call rolls back).
- 2026-10-13 · Board spacing system (Requestor page, measured): section padding 80, stage header at 80/80, first
  block y 440, stacked blocks 396 apart (pitch 1700 for 1304 blocks), side cards / next blocks 240 to the right,
  sections 80 apart. A side card „aligned to its screen” = block.y + 44 (label 28 + gap 16). Horizontal connector
  to such a card: start on the block with `position: {x: block.width, y: card centre − block.y}`.
- 2026-10-13 · Before adding a short connector (marker → section) check the straight path: the 04 marker → ⚡
  connector crossed „No permits issued” → keep the NODE link instead. A section placed under a column must clear the
  lane sections under it (Guest lane moved to y 10920 for ⚡ under 04; said so in the report).
- 2026-10-13 · FOD Guest lane rebuild (633:7411, 20 blocks × desktop 1440 + mobile 375 = 40 captures). New builder
  `tools/figma/swap-fo-guest.js` (stored hidden in Figma as text node „__swap-fo-guest” `691:7562`, run with
  `new AsyncFunction("ROOTS","OPT", text)(ids, {header:"302:6020", mobile})`) swaps FO form captures by library KEY:
  fields → text-input f035f115… / phone f2ba725d… / select 24351877… / search a27b4efa…, segmented eae5f7eb…,
  radio-label 513e5610… (in a padded „Opțiune radio” row), checkbox-label 3cf40c11… (Size Small), button-badge-filled
  a2f45475… (MPass / MSign), outlined rect 4ca8aa00… / circ d7a0779b… (styles Primary / Strict / Destructive only — no
  Neutral), header = clone of the board's `.temp` EVO header 302:6020, mobile header = header-evo-mobile e0e8b836… with
  „Intră în cabinet” + search hidden. Assembly: `tools/figma/assemble-guest-block.js` (desktop + mobile side by side,
  gap 80, 3px outline radius 12, „Prototype ↗” link). Icons: 20/checkmark-small ebea9f11…, 20/upload e72e41aa…,
  20/arrow-right d4bcc2d0…, 20/arrow-left f9c5634d…; tertiary bg var 7e60b930… (Foundations lk-e9e8).
- 2026-10-13 · Builder bugs found on the way (all fixed in the repo + stored copy): a captured field's counter text was read
  after `place()` removed it (read values first); Destructive inputs name their message slot „Assistive text”, not
  „inline-message”; checkbox-label Error variant has a HUG text column → set „Container” FILL or it wraps at 318px;
  replacing a padded wrapper with an instance loses its padding (consent row 24/24) → keep the wrapper; converting a GRID
  must keep its width (HUG collapsed the address grid to 282) and group rows with an 8px y-tolerance (the mobile progress
  label sat 2px higher and became its own 1px-high row → clipped); grey boxes = Read Only before the phone test
  („+373 …” read-only); checkbox boxes can sit inside „Text:margin”.
- 2026-10-13 · Mobile at 375 = capture the prototype at 375 (the code's own mobile layout) and swap with OPT.mobile
  (Large inputs, full-width CTAs ≥ 280, MPass banner re-stacked icon+text / button FILL) — never reflow the desktop frame.
  Coordinator asked mid-job for a mobile next to EVERY block, not just G1/G4: plan mobile for every state from the start.
- 2026-10-13 · `generate_figma_design` captures of heavy pages can stay „pending” forever when capture-to-figma.mjs kills
  Chrome after 25 s → new `--wait <ms>` flag (60000 fixed m-G7b / m-G7c). Poll every id; a pending one means re-capture.
- 2026-10-13 · Layout for long-arrow-free flows: entry block alone in row 0, one row per stage, markers right next to the
  block that jumps, rightward connectors start on the MOBILE screen (rightmost, free gap), leftward / downward ones on the
  desktop screen or via the decision column. Connector endpoints can be raw capture frames (radio row, field wrapper) or
  top-level instances (button, segmented-control); header logo = instance + `position`.
- 2026-10-13 · Audit false positives here: wrapper names starting with „Button”/„Checkbox” (rename to „Acțiune:margin”,
  „Rând · checkbox”), captured stepper links „Button - Deschide pasul …”, `fontName` mixed = Onest Regular + Medium.
  Library gaps (report): FO vertical stepper (.step-desktop Vertical is 127px/step, not the 56px row with the blue current
  pill) → raw captured stepper as on the rest of the board; dashed upload container, uploaded-file row, radio row hover,
  IDNP 0/13 counter, MPass upsell banner (info-box Subtle is grey, code is light blue), FO progress tracker on Finalizare,
  leave dialog (library modal has no slot) → raw captured frames with bound tokens.
- 2026-10-13 · eKYC BO (file SqMGpRKEppJLcvn7HMzOPR, 4 pages, ~130 screens) — pipeline that scaled: capture-to-figma.mjs
  `--fit` (grows the viewport until the scroll containers stop scrolling; prints „fit height”) + it sets
  `document.title = "cap · <state>"` so the capture root is named after its state → the builder maps roots by name, never
  by order. Builders live as hidden text nodes and run with `new AF("ROOTS","OPT", text)(ids, opt)`: __swap-ekyc 10161:916
  (= tokenize.js + tools/figma/swap-ekyc.js), __fix-ekyc 10261:24458 (tools/figma/fix-ekyc.js), __board-ekyc 10169:964
  (tools/figma/board-ekyc.js, MODE block / layout + TOC), __audit 10240:11068. Repo copies synced at the end of the job.
- 2026-10-13 · Stored code patched in place is reformatted by QuickJS (`fn.toString()`), so patch anchors must be
  whitespace-tolerant: escape the anchor, `\s+` → `\s*`, add `\s*` after `; , { } ( )`. Text you insert yourself keeps its
  form — later patches can anchor on it verbatim. To export a stored script, return it in ≤ 19 000-char chunks tagged
  `{k:"CHUNK"}` and pull them from the session transcript (tool_result JSON) with python instead of retyping them.
  JS slices count UTF-16 units (emoji = 2), Python counts code points — concatenate, don't re-slice.
- 2026-10-13 · Captures: `cap.sh` runs ≤ 3 in parallel; the „timeout (submitted?)” line is the waiter, not the upload —
  check the page for `cap · …` roots instead of polling every id. One parallel batch produced a root titled ek-21h with
  ek-21i content → after every batch verify the screen heading against the state (heading + active tab + modal name).
  Popover / menu / hover states must be captured WITHOUT --fit (the viewport resize closes the popover: ek-04c lost its
  facet popover). Hover tooltips are never captured → add the library tooltip 3ca9d2a8… (Size Small, arrow) by hand.
  Building 6 screens in one use_figma call sometimes drops the transport → build 3 per call, or one per call with
  try/catch per capture so a crash names the culprit.
- 2026-10-13 · `cornerRadius` can be `figma.mixed` (a Symbol) — every `n.cornerRadius >= 999` predicate inside findAll must
  guard it, or the whole findAll throws „cannot convert symbol to number”.
- 2026-10-13 · Classify captured dialogs: right-anchored and ≥ 500 high = drawer (Overlay scrim + raw drawer stretched),
  no close button = popover (stays absolute), else local Modal (Confirmare when the body is one paragraph, Conținut with a
  „Modal conținut / <state>” component). Modal footer buttons come from the footer's direct children only (findAll
  over the whole modal picked buttons in the content). Instances freshly created: walk `.children`, `findOne` is flaky.
- 2026-10-13 · Field patterns the generic swap missed: label row with an i button (`Button - Despre …`) → field + absolute
  16/circle-info c85edce9… next to the label (library text-input has no info slot — gap); grey input with a lock →
  text-input State „Read Only” (that variant has no lock icon — gap); input + button(s) in a row → field FILL + „btn-wrap”
  with paddingTop 32; „Alege data” rows → date-input 4449e61e… (Trailing Icon on); Afișează → trailing eye; long hints
  wrap only after `inline-message.layoutSizingHorizontal = "FILL"`; repeatable bare inputs (Redirect URIs, IP) →
  text-input without label; 44×24 pill toggles → switch 5a669ca2…; GRID rows → HUG (never ungrid).
- 2026-10-13 · Local icons made from captured SVGs keep a white-filled wrapper frame and their own vector colour → audit
  „icon ≠ label”. Clear every inner frame fill when creating the component, bind vectors to icon/base/default, and in the
  fix pass copy the button label's paint onto the local icon vectors.
- 2026-10-13 · Existing pages: don't redraw over them. Dashboard / Sesiuni got new „(din cod)” sections below the old ones
  (layout `x0/y0` = old section x, bottom + 400) with the discrepancies listed in the report; the old sections stay as
  reference until the PO decides.
- 2026-10-13 · Coordinator correction (eKYC): every demo state gets its own block, even when it looks identical (smaller
  note „Identic cu X, diferă: …”); old sections go to a „🗄 Arhivă — versiuni vechi” page with a dated note, never deleted;
  heavy flows split into one page per area („↳ BO -> Monitorizare · …”, „… -> Revizie”, „… -> Audit & Rapoarte”,
  „… -> Configurare · <group>”, „… -> Administrare”), each with its own TOC + page header (title + stories covered).
  Move sections between pages with `page.appendChild(section)` — connectors inside the section travel with it.
- 2026-10-13 · Write block notes from the screen, not from the state name: pull the visible texts of each screen
  (headings, overlays, messages; skip sidebar/header by position) before writing the note — half of my first-draft
  notes were guesses (wrong decision, „skeleton” that was an empty state, toast that was a page). US ids: grep
  `js/demo-states.js` / data for `US-UI-…` (login = US-UI-02 91107, shell = US-UI-01 91104).
- 2026-10-13 · Tables after the table-cell swap: the library table-cell text wraps inside a FIXED 40 „Cell Container”
  and overflows the row silently (audit can't see inside instances). Run `tools/figma/fit-tables.js` per page: widen
  columns whose raw cells (labelled button + ⋮) overflow, then per row set „Cell Container” HUG → measure → every cell
  FIXED to the tallest (header row untouched). Captured cell frames carry min/max width/height — clear them first or
  resize/FILL silently does nothing. Never ellipsize to „fix” clipping; rows grow like the code.
- 2026-10-13 · Modal-over-list screens: the background „Container:scroll-content” is ABSOLUTE and horizontally scrolled
  (x < 0) with the sticky first column as ABSOLUTE cells + „Table Cell - Placeholder” slots → after the widen pass its
  parent collapsed to 1 px and the table vanished (audit reported it as plain clipped-content — open the screenshot!).
  Fix: parent height = scroll-content height, scroll-content x = 0, move the absolute cells into the placeholder slots
  (remove placeholder → `layoutPositioning = "AUTO"` → `setGridChildPosition`). Toggling many cells AUTO lets the grid
  auto-place them and scrambles rows — if that happens, clone the table from the matching list screen instead.
  Grid row count: use `gridRowCount`, not `gridRowSizes = slice()` (length must equal the count).
- 2026-10-13 · Button icon override that `resetOverrides()` on the nested icon does not clear (Primary „Solicită acces”
  with a dark 24/lock): recreate the button — fresh `mainComponent.createInstance()`, copy the non-variant properties
  (label + icon swap ids), insert at the same index, remove the old one. Icon then follows the label (white).
- 2026-10-13 · Connectors that skip a column (dx ≥ 2 columns) → delete and add a „Marker · → ID” pill (clone 10239:10444)
  in the source block's Screen label with a NODE hyperlink to the target block; same for new states reached by a click
  from a block in a far column (tabs, facets, Editează). Then wrap labels wider than the screen (layoutWrap WRAP, FIXED
  = screen width) and restack.
- 2026-10-13 · Restack after every pass that changes heights (cell fits, hugs, wrapped labels): per section group blocks
  by x, keep order, gap 240, re-space columns 240, section pad 80, sections 400 apart — one small script for all pages.
- 2026-10-13 · Toast / overlay on a screen invisible in the block screenshot although its own screenshot is fine: the
  captured screen frame had `itemReverseZIndex = true` („first on top”), so the page Container covered the ABSOLUTE toast.
  Set `itemReverseZIndex = false` (scan: frames with it true and an absolute child at index > 0). Recreating the instance
  or appendChild does not help. Keep the captured position (toast below the header, not over it).
- 2026-10-14 · Independent QA failed the eKYC board on library use (M01–M17). Fixed with one stored script per
  rule (repo: tools/figma/ekyc-library-pass/*.js, stored copies as hidden „__…-ekyc” text nodes, run per page or in
  screen chunks of ≤ 15 — larger calls drop the transport and roll back):
  - Library keys that matter: Components lk-03f6… (NOT the older lk-708e… copy): sidebar-list-item 66c046a8,
    filter-chip 9901c458, avatar c622e420 (Initials Extra Small = 24 px), breadcrumbs cafee05e, modal 750e0da7,
    tabs c9366d10 (Tabs Count 2–8), header-evo-desktop ef41893a (its .top-section = the gov bar), link 34f60bd2,
    table-cell 86cc7c40, tag-filled a97109f9 (Style Accent = amber warning). Foundations lk-e9e8… for 20/ icons.
  - Captured local copies of library sets (sidebar-list-item, avatar, .role-switch-item, filter-chip) are orphans
    the QA flags; `swapComponent` to the published variant with the same variant name keeps props. Nested ones
    inside a local component swap in the main; per-screen overrides then keep the LOCAL variant (e.g. the Active
    item) → walk every instance and swap the nested ones too.
  - Sidebar Active icon: the library Active variant only recolours FILL icons swapped through the icon property; central
    stroke icons (folder-open, history …) stay dark. Use Foundations 20/ fill icons, `resetOverrides()` on the nested item,
    then `setProperties({State, Icon})`, restore `visible`.
  - Button icon colour: `resetOverrides()` clears fill overrides but a swapped icon then renders the ICON token (dark on a
    Primary button). Only a FRESH `mainComponent.createInstance()` + `setProperties` gets the component's own icon
    colour (Figma lists that as a fill override on the instance — it is the component's, not ours). Check with the
    mode-resolved colour (`variable.resolveForConsumer(node)`), not `fills[0].color` — the raw value lies for buttons.
    Rebuild = copy props, texts, icon size, sizing / grid / absolute position, re-attach connectors.
  - figma-audit's „icon ≠ label” compares raw colours → false positives on Primary buttons and the MPass badge; the
    Foundations „pause” icon has an UNBOUND #000 fill (library defect) → flagged next to #121212 labels.
  - Tables after cell swaps: measure one-line widths of dates / tags with a temporary text (same font, WIDTH_AND_HEIGHT)
    to widen columns; rows: grow AND shrink back (min 50). Then unclip screens (frames that outgrew a fixed height →
    HUG) and restack.
  - Modal-background tables: when sticky-column cells were absolute, pairing them with placeholders by order can
    scramble rows; if a background table is the same as the list screen, clone the list's table instead.
  - Facet popovers: options inside „List Item” (VERTICAL, CENTER) → counterAxisAlignItems MIN, checkbox-label FILL,
    Size Small (14 px) everywhere.
  - Code changes (Obligatoriu switch → checkbox option with red star) can be mirrored in place: checkbox-label + 12/asterisk
    bound to icon/danger/default (the token the text-input mandatory star uses) + hint text.
  - table-cell instances carry three „↔️ Resizer” frames that must stay FIXED 0 high; after resizing / re-sizing passes
    they had grown to HUG 16 px each and squeezed „Cell Container” to 8 px (numbers rendered as a tiny top glyph).
    After any table pass: Resizer → FIXED, height 0; then equalise every row to its tallest cell. Screenshot one list per
    page after each pass — counters alone did not show this.
- 2026-10-14 · QA round 2 regressions (my own) and fixes:
  - NEVER filter instances by a property name alone: buttons AND tags both have `📍 Icon` + `🔄 Leading Icon: 16`; a
    "tag icon" pass set 778 BUTTONS to Icon=None. Always filter by `mainComponent.parent.name` (tag-filled / button-…).
    Recovery heuristic: buttons whose Leading Icon property ≠ the set default had an icon → Icon=Leading again; nested-swapped
    icons (no property, e.g. button-text-circular) come back as the default plus → swap the nested icon again.
  - tag-filled (a97109f9) has NO icon property: swap the nested icon instance. Code icons per tag: signal (health),
    warning-filled (flux incomplet), globe (Web), phone/mobile (iOS/Android — central „phone, iphone, mobile” filled=on),
    award (Recomandată), checkmark / cross-small (Concordă / Diferă); every other tag = Icon None (renderTag has none).
  - Captured login screens had TWO frames: raw `.top-section` (gov bar) + raw `header-evo-desktop` (the 72 px EVO bar).
    My top-bar swap replaced the EVO bar by name → two gov bars. Use the full library header-evo-desktop
    (Anonymous, Navigation Items off, right actions hidden) there. Read a frame's content before swapping by name.
  - Connectors can't end on nested instance layers (Invalid endpointNodeId): a transparent local „Flow anchor” component
    instance, ABSOLUTE in the screen over the button, is the endpoint. Re-anchor connectors whenever a container is swapped.
  - Widening tables must not grow screens: one width per block column (1920 for list columns), tables scale their
    FIXED columns down; codes get their longest token width (measured) taken from the widest wrapping column.
  - Central icons: use the `filled=on` variant (fill bound, follows button/tag colour); `filled=off` stroke variants keep the
    neutral icon token (good for the Read Only lock — the Read Only text-input's only icon is a nested 20/checkmark-small,
    not the trailing slot; swap it directly).
  - numbered-badge (68a3732b) Large Neutral for heading counters; library modal content inset = header title inset (32).
- 2026-10-14 · QA round 3 (regressions of the width pass) — root causes and the rules that prevent them:
  - Table-cell Resizers regrew because my „unclip” pass walked INTO instances (Resizer = clipping frame with a 16 px
    child) and set them HUG. Every page-wide script that changes sizing MUST skip nodes inside instances (`inI`).
    Order for every table operation: column changes → rows (natural height, min 50) → Cell Container FILL → Resizers
    FIXED 0 LAST → read-only sweep (resizers, squeezed containers, text outside cell, misaligned rows, overflow).
  - Before any instance-wide reset/variant change: filter by `mainComponent.parent.name` AND list label → glyph against
    the code first (the 778-button pass also hit filter-chip, whose leading icon fell back to map-pin).
  - Widening a screen is not enough: on 1920 list screens the wide FIXED containers (and single-column GRID wrappers)
    must FILL so toolbar / tabs / table / pagination share one right edge; extra table width goes to the
    description-like column. Measure right edges numerically after the pass.
  - Flow anchors are absolute: re-place them (absoluteBoundingBox of the button, error 0) after every resize/restack.
  - Short cell values (≤ 34 chars: dates, „hh:mm · acum …”, numbers like „+0,0 / 3”, codes) get their measured one-line
    width; take it from columns with slack (long-text columns keep ≥ 200 px).
  - Keep scripts in the repo only — no script-source text nodes in the Figma file.
- 2026-10-14 · QA round 4:
  - Compare COLUMN TRACKS, not frame widths: a GRID table can be 1,022 px wide while its tracks add up to 1,073 and the card
    clips the rest. sweep.js now checks sum(gridColumnSizes) + gaps ≤ table inner width; fix by taking the excess from the
    widest columns.
  - Detail headers at 1920: the header row is a HUG horizontal frame (≥ 900 px) inside a vertical container → set FILL so
    the actions end at W − 16. Body sections keep the code's max-width (captured `maxWidth` 1024 = CSS max-width) —
    don't stretch those.
  - Captured GRID wrappers can carry an empty extra row (list Header: 3 rows, 2 children → a 49 px band). Set
    `gridRowCount` to the used rows on every GRID (also trailing empty table rows).
  - Loading / empty states inside a table: one raw row cell spanning all columns (`gridColumnSpan = gridColumnCount`),
    centred, library spinner (d38a117c, Medium Brand) + texts copied with their text styles; note the gap.
  - Card tables (name „Table”) drop the last row's bottom divider (strokeBottomWeight 0); registry lists („Table - …”) keep
    it and get the first-column right divider (border/base/default, 1 px) on header + body, as in the code.
  - Library variables not yet in the file: `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()` →
    `getVariablesInLibraryCollectionAsync(key)` → find by name → `importVariableByKeyAsync`.
- 2026-10-14 · QA round 5:
  - `maxWidth` 1024 sections come from `max-width + margin-inline: auto` → set their VERTICAL parent counterAxisAlignItems
    CENTER (1440 and 1920 detail screens alike). Check centring numerically (left gap = right gap).
  - Header cells: required width = paddingL + Header (label + sort icon, HUG) + paddingR; include it with the body
    one-line needs when rebalancing columns (donors keep max(body need, header need, 64 / 200 for long text)).
  - Empty GRID rows can sit in the MIDDLE (filter-chip row lists): compact rows (setGridChildPosition in order) then
    `gridRowCount = used`.
  - Modal-background lists: the absolute scroll-content height = table bottom + 1 (pager right under it), parent FIXED to
    match; re-centre modals in the overlay and re-place flow anchors afterwards.
  - Raw cell dividers must use the library cell's stroke paint and weight (0.5) so a row has one divider weight.
  - sweep.js (repo) now also checks: header cell fit, empty GRID rows, pager gap, centred 1024 bodies. Run it last.
- 2026-10-14 · QA round 6:
  - Column width = what the cell CONTAINS, not just its text: natural width of every child (buttons, tags, icons,
    nested auto-layout frames: sum + gaps + padding) + cell padding. Measuring text only left „⋮” / „Testează
    conexiunea” cut by 9–10 px in 47 cells. balance.js v3 (repo) splits the need: HARD = non-text content + header
    label (always met, taken from soft slack → 80 % of one-line width → hard floor), SOFT = one-line text (met
    when there is room; otherwise those body texts become FILL + HEIGHT and wrap — never cut). Long text (> 40 chars)
    keeps ≥ 170, Descriere ≥ 200; URLs / JSON may wrap; generic floor 40 (64 made the # column eat the action width).
    Check the code's CSS before forcing one line: `.e-permits-workplace__role-name/-meta` wrap, `__role-desc` ellipsis.
  - Same column family = same tracks (C04/C04a/b/c/i): after balancing, copy one table's widths to the siblings when
    the sum matches (here 3 px drift between variants). Modal-background lists copy the base list's tracks (A01f ← A01).
  - Modals: ONE rule — centred in the 900 px viewport: y = max(32, (900 − h) / 2), x = (W − w) / 2, also on tall
    screens. Anchors on modal buttons move with the modal (shift by the same dy; check centre vs the button).
  - Modal-background lists: when rows grow, the absolute scroll-content (and its FIXED parent) = table height + 1,
    otherwise the clip hides rows (C06g lost 279 px). Then restack blocks (gap 240) and grow the SECTION (80 bottom).
  - Open facet menu screens: clone an existing popover (S02e) under the facet (x − 10, y + 48), options =
    checkbox-label Small; search only when options > 7 (code `many`).
  - Library gaps go into the block note in the note's language (Romanian here), naming the local component.
  - sweep.js now also checks: body-cell content (texts + top-level instances) inside the cell's padding box
    (contentOver) and modal centring (modalOffCentre). Pager gap 0 after any row change on modal backgrounds.
- 2026-10-14 · QA round 7 — TABLE RULE (replaces the round-6 wrap approach):
  - The code never wraps a table cell: `.e-permits-workplace__table td { white-space: nowrap; text-overflow: ellipsis;
    height: 50px }`, columns = clamp(one-line content, max(128, def.width), fill ? ∞ : 220), extra width → fill
    columns, otherwise the table scrolls. In Figma: every body text ONE line; overflow = ending ellipsis
    (FILL chain from the cell down to the text, `textAutoResize HEIGHT`, `textTruncation ENDING`, `maxLines 1`);
    rows = natural one-line height (50, 56 with name + meta; spanning empty / loading rows exempt).
  - Don't guess widths from the column defs — MEASURE the rendered code: tools/figma/ekyc-library-pass/
    measure-code-tables.mjs (headless Chrome, per demo state: header labels + th widths + row heights). balance.js v4
    copies those tracks by header label, keeps hard content (buttons, tags) whole, fits the sum to the Figma table:
    excess comes first from columns wider than their content, never takes Descriere / Caz de utilizare / Motiv below
    280 (code min), then down to hard needs. Code tables wider than the viewport (S01 1781, C06 1756) scroll in code —
    in Figma they fit 1664 by truncating the columns that have slack (open question to the PO if they want the scroll).
  - Check the code's DOM before changing a cell layout: roles tags are inline (A01), client „Cazuri de utilizare”
    tags are stacked (C02 / D02e) — captured layouts were right in one place and wrong in the other.
  - Drawers fill the screen height: Overlay (NONE) children → constraints vertical STRETCH, and set height = screen
    once; sweep `drawerShort`.
  - Open facet = trigger State=Active (button-filled-circular), popover left = trigger left, popover name =
    „Popover · Dialog - Filtru: <trigger label>” (cloned popovers kept the source name).
  - Icon colour overrides on tags / buttons: copy the label's fills (paint with boundVariables survives
    JSON clone) so icon = label variable; find them via `instance.overrides` (fills on VECTOR), not by comparing
    library defaults (icon/* vs text/* variables differ by design in every instance).
  - sweep.js adds multiLine, tallRows (> 56), drawerShort. Order after any column change: balance → one-line pass →
    rows → scroll-content refit (modal backgrounds) → restack (240) → section fit (80) → anchors → sweep.
- 2026-10-14 · QA round 8 — what may be ellipsized:
  - Figma table cells pad 16 per side, the code 12 → a copied code width has 8 px less room. balance.js v5: non-prose
    columns (ids, codes / keys, names incl. Denumire, dates, tags, numbers) = max(whole one-line content, hard content,
    max(128, configured min from the column defs)) and are NEVER ellipsized; prose columns (Descriere, Valoare,
    Pas curent, Operatori, Motiv, Ultima activitate, Condiție, Endpoint) start at code + 8, take the extra width and are
    the only donors; description lines (> 48 chars under a name, `.e-permits-workplace__role-desc`) are prose wherever
    they sit. minrepair.js then lifts any column below its minimum from columns above theirs.
  - When the sum of minimums + Figma padding exceeds the table (S01 −9, C02 / D02e −8, C05 Descriere 272), say so in
    the TOC „Library gaps / constraints” list instead of cutting a name or a date.
  - Button icon colour: `resetOverrides` on a swapped icon leaves the swapped component's own colour
    (icon/base/default = black on Primary). Figma's swap keeps a „fills” override with the variant's icon token — that is
    native, not a hand override. Correct fix = fresh instance of the same variant + set the icon through the instance-swap
    PROPERTY (16 px glyph in Small buttons, as the code renders 16 px); keep the default glyph when it matches (no
    override at all). Compare with a fresh instance's icon variable, not with the label variable (icon/* vs text/*).
  - sweep.js adds cutIdent (ellipsis outside prose / descriptions, button labels excluded) and belowMin (registry
    columns vs max(128, configured min); run with MINS).
- 2026-10-14 · QA round 9 — PROCESS RULE (mandatory from now on): before ANY destructive or bulk operation (recreate,
  reset, swap, variant change) 1) snapshot the affected nodes' connectors (both ends: node, magnet / position),
  flow anchors and glyphs (label → icon), 2) run the operation, 3) diff: same connectors attached, connector count per
  page not lower, same glyph per label as the code (glyph-map.json). Round 8 broke this twice: recreating buttons
  deleted 7 connectors attached to them, and the icon reset hit the shared header component „Antet · eKYC” — 240
  header buttons lost their rotate-arrow / arrow-left glyphs.
  - Edits on a LOCAL COMPONENT propagate to every instance: never run label- or icon-driven bulk fixes on main
    components without listing their instance count first (a „Înapoi la sesiuni” fix would have hit 122 headers).
  - Buttons whose variant exposes no icon-swap property (the header's text-circular Small): swap the nested icon
    (swapComponent) and copy the previous vector paint so the variant colour stays.
  - btnrebuild.js now snapshots every connector end on the old node and re-attaches by position or magnet, and
    reports lostConnectors / connectorsBefore / connectorsAfter. collect-code-glyphs.mjs builds glyph-map.json from
    the rendered prototype; sweep.js checks glyphMismatch and connector counts (pass G and PREV_CONNECTORS).
  - One track set per table family (base screen's tracks; when a sibling needs more for a whole value, use the widest
    sibling's set for the whole family).
  - Step names (Pas curent) are names: whole; only their meta line (provider) may ellipsize.
- 2026-10-14 · QA round 10:
  - Captured FIXED widths inside rows (dashboard select group 775 in a 1024 row) overflow after library swaps change
    child sizes. Code `flex: 1; justify-content: flex-end` → FILL + primaryAxisAlignItems MAX; check the right edge
    against the sibling rows (KPI row) numerically.
  - Overflow check (sweep childOverflow): visible, content-bearing FLOW children past their auto-layout parent.
    ABSOLUTE decorations (timeline / stepper lines, ::before-style separators) and clipped parents are intentional.
    Fix order that worked (1,295 raw → 0): text child → FILL + HEIGHT only when long (> 30 chars); FIXED parent → HUG on
    that axis; meta rows of HUG items → layoutWrap WRAP (code flex-wrap); squeezed FILL wrappers of short texts → HUG;
    re-run until 0, then restack. Never HUG a GRID item (stepper columns): widen the grid track instead.
  - Glyph check skips button instances inside COMPONENT / COMPONENT_SET definitions (a header main's default label is
    not what any screen shows).
  - Loading buttons keep the sibling width (FIXED) so row actions stay aligned; note slow operations in the block note.
  - Connector magnets: start on the side facing the flow (RIGHT for every block here), never across the source screen.
- 2026-10-14 · QA round 11:
  - Wrap is not a fix for a too-narrow column: the round-10 WRAP on 41 meta rows broke one-line rows the code shows on
    one line. Right fix = the FIXED text column (captured width, 2–8 px short in Figma) → FILL in its horizontal list
    item, row NO_WRAP. Only wrap where the code wraps (flex-wrap AND it actually wraps at that width).
  - Every new content in a TOC card (e.g. the „Library gaps / constraints” list) → re-stack the section's frames
    (gap 40, section bottom 80) and check overlaps. TOC column titles: non-breaking spaces in „ · N ecrane”, columns
    sized to the one-line title (420 default; longer titles get their own width, the row wraps).
  - Non-auto-layout single-child wrappers (Exportă) keep captured widths → auto-layout HUG. Library menus
    (contextual-menu): width = max one-line option (min 256), right edge aligned to the trigger.
  - sweep.js now also checks oneLineWrap (buttons / tags / chips / menus / segmented / tabs / TOC titles / meta rows,
    short ≤ 16 px texts whose one-line width exceeds the box; headings may wrap as in the code), wrapWithRoom and
    tocOverlap. Always run the WHOLE sweep after a fix pass — each targeted pass broke something the old checks
    did not cover. Split the run into page groups if the transport drops.
- 2026-10-14 · QA round 12: a single FILL item inside a meta row (R02j „ASP — Registrul…”) pushes the rest of the row
  far right — meta items are HUG + auto-width text, always. Menu icons follow the code per option (js/ekyc.js); a glyph
  that exists only at 24 px goes in the 20 slot via the swap property, resized, and is declared. Menus sit 8 px under
  their trigger (code gap). Wrapper frames with clip must HUG their content (Acțiuni tabel 130 → 131).

- 2026-10-14 · Screen frame rule (user): every screen in a block clips content, radius 16 (mobile ≤430: 24), 4px OUTSIDE border bound to border/base/default. Apply to the block's direct screen child or the children of an „Ecrane · desktop + mobil” wrapper only — a screen that contains a full-size Overlay/Drawer/Body frame is still ONE screen (a „≥ 2 big child frames = wrapper” heuristic wrongly bordered 123 inner layers once). Check content fits before enabling clip.

- 2026-10-14 · Dosare board (9696:526) — dossier tab rule + Documente însoțitoare:
  - Tab bars live in the local `Dosar / Header` (9706:6955; 02-series blocks have detached copies). Sync them from CODE, not from
    memory: a CDP extractor reads `[data-dosar-tab]` (label, `.e-permits-page-header__tab-count`, `--warning` tone, active) per
    dos-* state → one spec → one idempotent setter (visibility, Type, Badge, numbered-badge Counter Value; warning = Style Accent).
    Re-run the same script as the read-only verifier afterwards.
  - `figma.skipInvisibleInstanceChildren` is TRUE by default here: hidden instance sublayers (a hidden tab) are invisible to
    `.children` / findAll → the setter reported „MISSING”. Set it to false in every script that toggles visibility in instances.
  - Code headers drift too: column 04 showed „Eliberat / Dosar finalizat” while dos-04* are În examinare / Semnat, 03e În examinare
    vs Spre coordonare. When syncing anything per state, also survey header status + button per block (cheap, read-only) and swap
    the header from a block with the right status, then re-apply the tab spec.
  - A Body FILL inside a HUG screen never grows: Main clipped 400 px of new content silently (block heights did not change —
    that was the tell). Body HUG + minHeight 992, Main HUG. Check `sum(children) > main.height` after every content change.
  - Items inside instances (tabs, rows of a header) cannot be connector ends; anchors + magnets run through the screen. Use the
    container instance with `position: {x: width, y: item centre}` (the arrow leaves the screen edge at the tab row) — the
    menu-item technique works for tabs too. Re-check existing connectors after opening a column: three 01→02 arrows started
    crossing the new column → replaced by „Marker · → …” NODE-link texts in the source label.
  - New column next to an existing one = shift every section child with x ≥ new x by 1920+240 first (connectors follow), clone a
    band header, give the band an ID that does not collide with block ids (01b already existed → „01+”, „04+”).
  - Library has no empty state → local „Stare goală · casetă” 11311:6217 (boxed, Iconiță swap prop). Match the RENDERED code, not
    the doc: border 1px (doc says 1.5), no 4px gap under the title (margin reset in the profile) → 182/202 px exactly.
  - svc/stack-item got an optional `Show lead` slot (library `document-icon`, Type User Uploaded / System Generated), hidden by
    default — added to the main after counting instances (69, heights unchanged). Last row of each group: Row strokeBottomWeight 0.
    The component is 85 px per row vs the code's 72 (padding 16/gap 8 vs 12/4) — board-wide, reported, not changed.
  - CSS-zoomed content (A4 preview pages, zoom 0.632) captures BROKEN: texts keep unzoomed sizes and overflow. Build the page as a
    local component at real size with Desktop text styles (`Dosar / Pagină document · …` 11328:16559/16563/16589) and place a
    `rescale(0.632)` instance — styles stay attached. Embedding screenshots as base64 is impractical (≥14 KB per image).
  - capture-to-figma.mjs: new `--settle <ms>` (wait after the demo state before capturing; states that open a modal need 5000+).
    Parallel captures of modal states failed („selector not found”) — run them one at a time.
  - Cloned 04e modal rows: the second row carried a tag box („Format: PDF”) → rebuild every row from a plain row clone.

- 2026-10-14 · Captured modal-content components kept the captured FIXED widths of their content, so text / fields / lists ran 12–32px past the component edge and the component clip cut them (16 of 17 eKYC „Modal conținut” components); one also had a leftover maxHeight (651) and viewer watermarks sat 59px past the stage. After turning any capture into a component: padding L/R 32, every child FILL in vertical auto-layout, text FILL + HEIGHT, images scaled to the inner width, height HUG, maxHeight/minHeight cleared, absolute overlays (watermarks) anchored inside the stage. Check with a deep "descendant past nearest clipping ancestor" walk, not just the component's direct children. Also: lay out local component sections as a grid — never stack components at near-identical x/y.

- 2026-10-14 · eKYC (SqMGpRKEppJLcvn7HMzOPR) segmented 40 + sidebar separator:
  - Library size gap → LOCAL copy, never instance overrides: the library segmented-control is 52 high and its item has a min
    68×40 that instances can't override. Built from DETACHED library variants (`variant.createInstance().detachInstance()` →
    `createComponentFromNode`) so fills / text styles / effect styles stay bound: „Segmented · 40 · item (gap bibliotecă)”
    10666:1848 (Mode On/Off × State Default/Hover/Focus as the library; props ⌨️ Label / 👁️ Separator / Leading Icon re-added
    with `addComponentProperty` + `componentPropertyReferences`; detach drops the old references) and „Segmented · 40 (gap
    bibliotecă)” 10666:2009 (🧮 Segment Count=2/3/4; track padding 4, gap 4, items 32 h, padding 0/12; nested items
    `isExposedInstance = true` so labels / mode are set on the screen instance). Separator rule: item i shows it when
    i < n−1 and neither i nor i+1 is selected; separator x = item width + 2 (middle of the 4 px gap).
  - Measure EVERY occurrence in code before applying a „make it like the code” request: the dashboard / report period
    control is 40 (`.e-permits-ekyc-dash__period`), but the allocation modal's „Aleatorie / Alege operatorul”
    (`.e-permits-ekyc-modal .segmented-control`) is the library default 52 (6/6, items 40, 10/16). Those got their old
    padding overrides reset to the library instead of the 40 set — say so in the report.
  - Reset only the size overrides on an instance: record nested componentProperties + nested fill overrides, `resetOverrides()`,
    re-apply both, set layoutSizingHorizontal HUG (a FILL that came with the override) — labels / modes / icon colours survive.
  - A frame stroke that „isn't there”: Sidebar · eKYC already had a 1 px right stroke bound to border/base/default, but OUTSIDE —
    the Main sibling paints over it. Fix at the component: strokeAlign INSIDE + strokesIncludedInLayout (FILL children → 255).
    Check `strokeAlign` before adding strokes; outside strokes on side-by-side layout children are invisible.
  - Snapshot / diff without long returns: store the pre-snapshot per page with `page.setSharedPluginData("geapqa", key, json)`
    (connectors with both ends + magnets, anchor boxes, button label → glyph counts, section + block boxes), diff in a later
    call, then clear the keys. Replacing an instance: re-point connectors whose endpointNodeId = old id before removing it.
  - Height changes inside blocks (filter row 48 → 40) only showed up where screens hug (R06 −8); fixed-height screens kept
    their size. Always diff block boxes, then restack only the columns that moved.
  - swap-ekyc.js segSwap now maps captured ≤ 44 px tracks to the local 40 set.

- 2026-10-14 · Documents — one pattern (code 76fc9aeb) → Figma components + swaps in GEAP 2.0, FOD, EVO Cabinet:
  - Components (GEAP › 🧩 Componente locale › 11361:6350): `Document · rând` 11362:7113 (Source × State × Acțiune, 33 variants,
    bools Semnat / Etichetă stare 1-2 / Linie sus / Arată număr|fișier|de|semnat de), `Document · card` 11364:7441 (Context
    Selector|Selectat|Valoare câmp|Act anterior|Rezumat|Cabinet × Source × State × Ecran Desktop|Mobil), `Modal conținut /
    Document · detalii` 11366:6892 (A4 page INSTANCE_SWAP „Pagină” + 12 generic svc/field-row slots + Doar citire) used in the
    local Modal Tip=Conținut. New A4 pages: Cerere 11364:25452, Confirmarea achitării 11364:25498, Decizie de respingere 11364:25544.
    Files don't share local components → copies: FOD `Document · card` 762:10435, Cabinet 983:2727 (built from library keys).
  - Pipeline that worked: CDP extractors (tools/figma/documents/*.mjs: rows, modal rows, FO cards, header tabs) → one JSON spec per
    state → idempotent builders (rebuild-stack.js, modal.js, swap-raw-rows.js, place-cards.js). Specs inline as small JS builders
    (R(icon,title,tags,parts)) keep the use_figma code < 20 KB.
  - `resize()` after setting `counterAxisSizingMode = "AUTO"` silently makes the component FIXED height (72) → every instance
    clipped / overlapped on mobile. Set sizing modes AFTER resize, then verify instance `layoutSizingVertical === "HUG"`.
  - Cloning a variant INSIDE a component set drops its componentPropertyReferences (title / meta stayed default text) → after
    cloning, copy references by layer name from the source variant (own layers only: `!id.includes(";")`), or build variants
    standalone and combine once.
  - Instance overrides cannot set maxWidth/minWidth („max-size cannot be overridden”) → put maxWidth on the component (mobile
    meta texts WIDTH_AND_HEIGHT + maxWidth = content width so long file names wrap like the code) and make a Mobil variant
    (title on its own ellipsized line, tags in a wrap row; Cabinet actions under the text) instead of per-instance hacks.
  - A FILL title in a WRAP row takes only the remaining space (squeezed to „Extra…”), it never forces a new line.
  - Nested instances inside other instances (FO file-upload fields) can be converted with `swapComponent` + setProperties on
    the nested node — no need to detach the host.
  - Header drift again: blocks cloned from 04c/04d carried another dossier (Autorizație sanitară, other user). Before cloning a
    block as template, compare its header title/user with the code; replace the Dosar / Header instance from a correct block and
    re-apply status / button / tabs (spec from hdrspec.mjs).
  - User/coordinator: NO image fills for icons anywhere. Captured `<img>` SVG icons (document-uploaded / -generated) land as
    IMAGE fills → replace with library icons (Foundations 24/document-filled, tinted icon/base/tertiary (Încărcat) or
    icon/brand/default (MDocs, Generat); shape gap: code = filled tile with lines). Sweep: tools/figma/documents/imgsweep.js +
    imgicons.js (by image hash); sweep.js now reports `iconImageFills` (top-level, non-instance, non-logo) — must be 0. Keep
    real photos / logos / library-internal images (country flags in phone inputs, avatar photos, courier logos) and list them.
  - Rule 4 bulk: 52 „Configurează” buttons (Icon None) on Servicii → Icon=Leading + 20/settings in the size's slot; lone
    „Detalii” Neutral buttons → Icon=Leading + eye. Filter by `mainComponent.parent.name` + label; connectors unchanged.
  - Transport drops / 1000 s timeouts happened on 3-job rebuilds but the work had completed — always check state first.

- 2026-10-14 · eKYC alerts + „+N” pass (file SqMGpRKEppJLcvn7HMzOPR, code 8493a239 + 95ceed02):
  - Local components now live on their own page „🧩 Componente locale” (10687:2071, first in the page list, same name as
    GEAP 2.0), section „Componente · eKYC BO (local)” 10158:671 — MOVED with `page.appendChild(section)` (ids + 827
    instance links kept, 0 missing). Grid: one H5 „Grup · …” text per group, padding 80, gap 80, rows wrap at 3600.
  - New local sets (library gaps): „Alertă · eKYC (gap bibliotecă)” 10678:2177 (Severitate Critică/Avertisment/Informativ ×
    Stare Default/Hover/Focus × Acțiune on/off; TEXT props Titlu / Text / Timp / Acțiune), „Alertă · eKYC · straturi peek”
    10678:2186 (Straturi=1/2), „Stare goală · compactă (gap bibliotecă)” 10678:2187 (GEAPEmptyState compact; props Titlu,
    Text, Iconiță). Library ids used: Foundations 20/circle-error-filled ae3f9cd6…, 20/warning-filled 43efb3c5…,
    20/circle-info-filled 5713c482…, 24/notification f73ebe40…, 16/chevron-bottom a9d10e06…, effect Focus Ring/Medium
    97cdddcd… (= code 2 white + 3 ring), text styles Body/Small 500 057521fd…, Body/Small 1f355410…, Caption/Medium
    8d8e3878…, H5 75e7dfdc…; tooltip set 3ca9d2a8…. No 14 semibold text style exists → titles use Small 500 (declared).
  - Figma gotcha: setting `textTruncation` AFTER `maxLines` resets maxLines to 1 → set truncation first, then maxLines.
    Text nodes with autoRename take the new characters as their name when a text style/characters change — rename back
    („Text”) if scripts find layers by name.
  - Card geometry check: code border is outside the padding (box-sizing border-box, border 1 + padding 12 = 13 from the
    edge); a Figma INSIDE stroke with padding 12 is 2 px shorter — compare heights with the measured card, not the CSS.
  - Rendered code can disagree with its own CSS: 95ceed02 adds `margin-top: 6px` on the alert text but the computed margin
    is 0 (overridden) → Figma follows the user's intent (6 px) and the drift is reported to proto-engineer.
  - Clone-from-another-block gotcha: `d2.clone()` + `d2.parent.appendChild` put the new D01m block in the D02 SECTION; the
    restack by x then hid it in the wrong column. Append clones to the TARGET section explicitly.
  - Landing blocks for flows (alert → screen) = clones of the existing area blocks (diff the code innerText of the landing
    state vs the block's state first: identical → clone + note; filtered rows → delete / add rows in the GRID, compacting
    with setGridChildPosition in ascending order, then gridRowCount).
  - Connectors from items inside a modal instance: start = the modal instance with `position {x: modal.width, y: card
    centre}`; re-place them after any change of card heights (they don't follow).
  - „+N” tag cells: measure with the exact „+N” width (a „+9” placeholder lost a whole tag by 1 px). Widening a GRID track
    does not resize FIXED cells — set cells FILL / resize them to the track.
  - Doubled icons: 100 captured `h2d-svg` wrappers sat on top of library instances (search fields, buttons) → deleted;
    sweep.js now reports rawSvgIcons / rawSvgOverInstance. 367 other raw svg icons (timeline steps, empty-state 48 px,
    status icons) are still raw — they need a glyph map from the code before swapping.
  - User rule: never write „din cod” in Figma names / annotations (sections, bands, TOC, notes) — product copy inside
    screens stays as rendered.
  - Captured legend trays (`.e-permits-meter-legend--tray`) had padding 0/0/0/12 and the stacked meter frame was FILL
    (28 px instead of 12) — check captured paddings against the computed CSS, not only colours.

- 2026-10-14 · QA docs-1 fixes (GEAP Dosare + FOD guest lane + Cabinet):
  - Captured FO screens: `Main Content` is FILL with a captured minHeight inside a HUG Body, so it NEVER grows when content is
    swapped in (G7b lost the footer and the msign button: desktop 488 px, mobile 355 px). Fix = Main Content HUG (keep minHeight
    as the viewport floor), and on desktop also the HORIZONTAL `Section` + `Container` HUG (a FILL Section in a HUG chain stays at
    the old height). Then run a lane-wide pass: every auto-layout frame whose content > its height and is FILL vertically → HUG.
    The same bug sat silently in G4a / G5 / G7a / G7c (8–34 px, often only padding). After it, desktop G7b = 1707 vs code 1702.
  - Deep cut check = walk every descendant against the NEAREST clipping ancestor (absoluteRenderBounds), skipping absolutes; plus
    „content sum > frame height” per auto-layout frame. figma-audit only sees direct children of clipping frames. Repo:
    tools/figma/documents/sweep-lite.js (sweep.js keys on `Ecran · ` screens and finds nothing on block boards).
  - Guest lane rows: next row = tallest block of the row + 396. Restack by row bands (shift everything in the band: markers,
    decision cards), then section bottom 80.
  - Column restack must not „fix” intentional outliers: 01l sits at y 20860 aligned with its source 01h, and my per-column 240 pass
    moved it to the top. Before restacking a column, list blocks whose gap ≠ 240 and decide per block.
  - Dosare board column gap = 240 everywhere (was 160/240 mix). Re-map column x's in order (x0, +2160 …), widen the section by the
    delta, check page siblings to the right; connectors follow.
  - Radius tokens: library variables `border-radius/radius-12` 1f226805…, `radius-24` 79848dbe… (Foundations › 3. Sizes) — import
    by key, check the collection id matches the already-bound radius-16, bind all four corners. Dosare: Stack = 12, profile Card = 24.
  - Fonts overridden on a nested instance text (copy-block number in JetBrains Mono): `setTextStyleIdAsync(main text's style)` on the
    main component's nested text, then sweep the page for detached copies with the same pattern (D-2026-…) — 12 more found.
  - Connectors from buttons inside a row instance: `connectorStart = {endpointNodeId: row, position: {x: button centre, y: row
    centre}}` (⋮ = 986/36, Detalii = 920/36 on a 1022 row) — also separates arrows that shared the row edge. Do NOT do this for tab
    connectors in the dossier header: a start at the tab centre draws the line across the whole header; keep x = header width.
  - New A4 document page = clone the nearest `Dosar / Pagină document · …` (Cerere) and rewrite from renderDosarDocPreview in
    js/e-permits-shell.js (h1, p, table rows, paragraph, signature); then modal.js with the modalrows.mjs rows of the state.
  - Check the CODE before acting on a QA layout finding: the FO meta row is `flex-wrap` with separate 4 px dot items, so the code
    itself ends / starts lines with a dot at 375 (DOC-11) — Figma already matched; no change.
  - The FO finish card (`.e-permits-fo-finish-doc`, „Vezi documentul”) uses document-illustration.svg = the same blue tile as
    document-generated.svg → published document-icon Type=System Generated, not Foundations 24/document-filled. The permit-picker
    avatars (`.e-permits-fo-intent-act`, sprite icon-document) are not documents — leave them.
  - Gap statements live in 4 places: board rule notes, block notes, TOC gap lists AND component descriptions (FOD 762:10435,
    Cabinet 983:2727 still said „gol de bibliotecă”). Search texts per page and read the descriptions of every copy.
  - A read-only scan over ALL pages of GEAP timed out (987 s). One page per call, findAllWithCriteria({types:["TEXT"]}).
  - No ui-qa-figma agent tool in this session again → ran figma-audit.js (ROOTS) + sweep-lite myself.

- 2026-10-14 · eKYC library-only icon pass (file SqMGpRKEppJLcvn7HMzOPR, 355 raw h2d-svg icons → 0):
  - Deterministic mapping beats per-icon guessing: hash each raw icon's vectorPaths (+ sizes) → 34 path signatures; resolve
    each signature to the code's sprite id by probing the rendered prototype (tools/figma/ekyc-library-pass/collect-code-icons.mjs:
    every `<use>` icon per state with size, colour, context text), then re-verify EVERY instance by state + context. Context
    drifts: demo dates are relative (captured 13 oct, code 14 oct) and markers carry sr-only words („— finalizat”) → match on
    the label before the first digit; drag handles match on the number only. Table: icon-map.json (sprite id × size → key).
  - Replace the captured `Icon` frame (= the code's `<svg>` box, already at code size: 24 trajectory, 20 callout, 16 timeline,
    12 asterisk) with the library instance; keep the code-mirroring wrapper; bind vector fills to the variable the captured
    vector used (= code colour). rawicons.js; 305 swaps, 0 connector changes. A raw icon can hold two signatures (id-card clip
    group) → dedupe by the svg box.
  - Foundations size gaps (scaled + declared): time-filled 24 (20), lock 20 (24), time 24 (16, code icon-time is a 16 grid),
    pause 24 (one 20 component), eye-open 16 (20). Play exists only in the central icon set („play, go” filled=on r1) — it
    replaced the last local icon („Icon / eKYC / Redă”, deleted at 0 instances).
  - Empty states → ONE local set „Stare goală (gap bibliotecă)” 10698:119653 (Tip Casetă 40/24 dashed / Compactă 24/20 dashed /
    Fără chenar 24/16 + 4 px text margin; Arată text, Acțiune with an exposed button, Iconiță swap). Built by combining the old
    compact component with two clones (combineAsVariants keeps its instances). Content filled from the CODE probe, not the
    capture — that fixed stale copy (S01h/S01i/S02f showed „Nu sunt dosare pentru filtrul curent”; code: „Niciun rezultat…”,
    „Nicio sesiune activă” (time), „Nicio sesiune încheiată” (history); R01c lacked its text). Heights matched code (152/182/224/254).
    An instance swap does not keep the slot's fill override → re-bind the swapped glyph to icon/base/tertiary.
  - sweep's rawSvgIcons only sees `h2d-svg` names — the audit found raw play glyphs named „Icon”. Also scan every VECTOR in screens
    outside instances (charts / meter bars / logo tiles are fine, glyph-sized vectors are not).
  - Rule 4 drift was board-wide, not just S02: 252 „Vezi detalii” (S01, S02, R05, C08, A01) + 2 bare „Detalii” → „Detalii” + eye
    (Icon=Leading, 20/eye-open in the 16 slot). Fresh-instance check: icon var = icon/base/default like a new instance.
  - glyph-map false positive: labelled menu buttons („Exportă”) = label + chevron by user rule (library button holds one icon) →
    glyph-map allows both. Hand-trimming G for a sweep run hides/creates mismatches — always pass the full glyph-map.json.
  - Adding a sentence to TOC „How to read” notes pushed the „Cuprinsul paginii” grid into overlap on 8 pages → restack TOC
    frames (gap 40) + section bottom 80 after any TOC text change.

- 2026-10-14 · Documents on mobile + separators (code e9858260) — `Document · card` GEAP 11364:7441 / FOD 762:10435 / Cabinet
  983:2727 and `Document · rând` 11362:7113; scripts tools/figma/documents/card-mobile.js, row-separators.js,
  field-header-mobile(.js|-raw.js), finish-card-mobile.js:
  - „No dot at a line start / end” in Figma = each meta item is a „Parte” (HUG) with an ABSOLUTE dot at x −10 (gap 6 · dot 4 · 6;
    BO 8 · 2 · 8 = 18) inside a clipping Meta: the part that starts a line has its dot left of Meta → clipped (= the code's
    clip-path). Negative item spacing / padding do NOT work: Figma clamps children at the padding edge (tested).
  - Logical meta lines: a hug line FRAME whose children are all hidden keeps its last height (a phantom 20px line), and
    „file OR size” can't be expressed with booleans → one WRAP row with forced breaks („Rând nou”, FIXED 1000 × 0.01, empty;
    the number break bound to „Arată număr”) = the code's zero-height 100% `__break`.
  - Reparenting a layer inside a component DROPS its componentPropertyReferences (texts showed the main's defaults in every
    instance) → snapshot refs by node id before restructuring, re-apply after. Binding a „visible” ref to a new/visible layer
    REWRITES the boolean property's default (Arată număr false → true: every instance without an override showed the number) →
    snapshot `componentPropertyDefinitions` defaults and restore them with `editComponentProperty` at the end.
  - Switching layoutMode VERTICAL ↔ HORIZONTAL swaps the axes: a hug height becomes FIXED (Rânduri stayed 80) and a FILL width
    becomes HUG (FOD field row shrank to 141) → re-set both layoutSizing values right after any layoutMode change.
  - maxWidth can't be overridden on instances and differs by context (card 343 → content 239; boxed field 309 → 205): set
    maxWidth for the common width on the main, then a per-instance fit pass (Parte + text FILL / HEIGHT where the text is wider
    than Meta) — sizing overrides on nested layers ARE allowed, as are counterAxisAlignItems / layoutWrap / padding.
  - × centred on the title line: card padding stays 12, × ABSOLUTE (constraints MAX/MIN) at y 8, content paddingTop 2 and
    paddingRight 44 (= × 32 + gap 12, off the spacing scale on purpose — QA flags it; declared). Check / selected: y padTop + 2.
  - Wrapped labels in a library text-input: the star can't follow the last word; best = label FILL + Input Label / Label row
    counterAxis MAX (star on the last line, right edge, 6 px low). Bottom padding moves the text too; an instance text with
    textAutoResize NONE snaps back to the main's height (resize ignored) — don't try those again. One-line labels: text HUG.
  - Data drift found while comparing at 375: F5 „Extras Registru…” was in the Număr slot (place-cards took a name without an
    extension for a number) → moved to Fișier; FOD G4a/G5 lacked the „8 B” size the code shows. Compare every card's meta lines
    with the code, not only the layout.
  - `Document · rând` has no mobile usage in GEAP (141 instances, all ≥ 500 wide); Post-procese 10c / 10d have NO mobile screens
    (desktop only) — say so instead of inventing them.
  - Agent tool not available again → figma-audit.js + sweep-lite run by hand; remaining findings: off-scale 44 / 18 (declared).

- 2026-10-15 · English names in 4 files (GEAP 16,820 renames + 205 variant names + 85 component properties; eKYC 10,800 + 29 + 9;
  FOD 1,154 + 12 + 10; EVO Cabinet 269 + 6 + 10). Tools: tools/figma/rename-to-english.js (dry / apply, PAGE_IDS / ROOT_IDS),
  rename-to-english-store.mjs, naming-glossary.json (2,496 segments + rules), naming-map.json (old → new per file). What worked:
  - Export every distinct local name read-only (skip instance internals, library-default instance names, auto-named text,
    BEM layer names) in ≤ 400-name chunks returned as {tag, chunk}; pull them from the session transcript with python, never
    retype. Translate SEGMENTS (split on " · ", " — ", " → ", " / ", "(", „”, "=" …), not whole names: 10,400 names → ~2,500
    glossary entries; rules for dates / "Head 12" / "C07 head" / "C02·head".
  - English detection: /usr/share/dict/words has no plurals / inflections → stem -s/-es/-ed/-ing, but stemming makes Romanian
    look English („respins” → respin). Review the ambiguous list by hand (Date, solicitant, Termen, Extras, Automat, Formular).
  - Port the translator to JS and diff it against the Python map in node BEFORE touching Figma (0 differences on 10,402 names).
  - use_figma has no fetch and code ≤ 50 KB → store the per-file glossary subset in root shared plugin data (≤ 35 KB per call),
    verify with a djb2 hash of the stored string, run small dry / apply calls that read it, clear the keys at the end.
  - editComponentProperty works for VARIANT keys too (Tip → Type renames the key on every variant); values go through the
    variant names; TEXT / BOOLEAN / INSTANCE_SWAP keep their #id so overrides survive. Verified on 121 instances: same variant
    component id, same text overrides. Check value collisions first (Selectat / Selectate → Selected in one property).
  - Instances INHERIT shared plugin data from their main component: an „old” snapshot on a variant showed up on 11 instances and
    would have blocked their own snapshot. Mains use a separate key („oldMain”); an instance's „old” counts only when it differs
    from its main's. Default-named instances follow a renamed main by themselves (fewer renames than the dry run — expected).
  - Apply calls with many component-property edits dropped the transport (atomic rollback, nothing written): run the components
    page alone first, then the other pages in groups; dry runs are cheap (8–30 s per file). After a drop, re-run the dry run /
    a snapshot count before retrying.
  - Text layers named after a component property (kind „pT”: Număr, Fișier, Titlu, De…) were missed by a text map built from
    kind „T” only → 189 follow-up renames. Residual scans by diacritics alone miss Romanian without diacritics (Titlu, Termen).
  - Names are API: builders look layers up by name. Updated board-ekyc.js, assemble-guest-block.js, assemble-fo-block.js
    („Link · prototip” → „Link · prototype”, „Titlu notă” → „Note title”, „Text notă” → „Note text”, „Titlu pagină” → „Page title”,
    „Ecrane · desktop + mobil” → „Screens · desktop + mobile”) and ui-qa/figma-audit.js (code-token context „Combinarea” →
    also „Combining”). STILL on old names (update before re-running them): documents/card-mobile.js + row-separators.js
    („Rânduri”, „Rând nou · …”, „Parte · ”), swap-ekyc.js + ekyc-alerts/swap-alerts.js („Modal conținut / ”, „Antet · eKYC”),
    swap-cabinet*.js („Tip=…”, „Marcaj”, „Cabinet / Antet”, „Componente · EVO Cabinet (local)”), ekyc-library-pass/emptystates.js
    („Stare goală · ”, „Tip=”, „Iconiță”). New layers must get English names from now on.
  - Kept on purpose: people / companies / places (Chișinău, Bălți, Maria Țurcan), quoted register word „dumneavoastră”, text
    layers that copy their content, BEM layer names captured from the prototype, library names.
  - No agent tool in this session again → ran figma-audit.js on 10132:764 myself (1 pre-existing unbound fill) and compared the
    before / after screenshot: byte-identical PNG (same SHA-1) — the cheapest proof that only names changed.


- 2026-10-15 · User: „a lot of these containers have 1 px padding — remove and check everywhere” + „use tokens for radius, padding,
  gaps — change all to tokens”. Root cause + fixes (scripts: tools/figma/border-padding.js, bind-spacing-tokens.js,
  bind-spacing-tokens.dry.js; figma-audit.js got `border-padding` + `spacing-unbound` rules and no longer treats 1 as on-scale):
  - html→Figma captures turn a CSS border into an INSIDE stroke with `strokesIncludedInLayout` (= border-box) AND add the border
    width to the padding → content sits 1 px too far in (stack 1/1/1/1, items 13 vs 12, group label 9 vs 8). Fix per side:
    p − strokeWeight when p is off-scale and p − w is on it (A). Older hand-built blocks did the same on purpose: padding bound to
    `border-width/border-1` + strokesIncludedInLayout false (C → inc true + p − w, visually identical); after the 4 px OUTSIDE
    screen frame was added those screens kept the 1 px padding → a 1 px ring inside every screen (D → 0). A 1 px padding with an
    INVISIBLE stroke is a transparent CSS border (fo-selected-role__change) — real geometry, keep it. Odd paddings with no stroke
    (section-title 11/12 at 48 px, UA button 1/6) are real CSS — check the CSS before „fixing” any odd value.
  - Totals: GEAP 2.0 428 frames on 9 pages (Servicii 267, Tarife 58, Componente locale 36, Post-procese 34, Shell 11, Filtrare 10,
    Incidente 6, Workplace 5, Dosare 1); FOD / eKYC / EVO Cabinet had 0 (their builders already pad = CSS padding). Block heights
    did not move (screens are fixed / minHeight) — only inner stacks shrank 1–7 px.
  - Token binding: Foundations › 3. Sizes has spacings 0 2 4 6 8 12 16 20 24 32 40 48 56 64 80 96 120 and radius 0 4 6 8 12 16 24
    32 full(999) — no 10 / 14 / 18 / 28. Bind with `importVariableByKeyAsync` (keys in the script) — never local variables.
    Binding equal values is render-identical (screenshot byte-identical). Zeros left unbound by default (OPT.zeros).
    Colours: map hex → the one NON-state token with the right scope (fills: background/*, strokes: border/*); #d9d9d9 as a fill
    matches only state tokens (…-active / -hover / disabled) → report, don't guess. Scrims (#121212 @40/36 %, #000 @40 %) don't
    match overlay-dark (@25 %) → PO decision.
  - Off-scale is never snapped: biggest groups are `gap 10` (Figma's default gap on new frames, ~5,000 across files, often on
    single-child frames), radius 5, gap 18 (meta-dot pattern 8·2·8), padding 11 (section titles), A4 page 60/84, scaled pages
    with fractional values. Listed for the user.
  - Process: a compact dry counter (3 KB) per page first, then the full binder (9 KB) per page in parallel batches of 3–6; the
    binder is idempotent (already-bound counted) so a dropped transport = just re-run. Snapshots: page sharedPluginData
    `geapqa/borderpad-20261015` and `geapqa/bindtok-20261015-N` (both scripts have a revert mode).
  - Something else renamed screens to English mid-job („01 · Tarife” → „01 · Tariffs”) — not this job; mention concurrent edits.
