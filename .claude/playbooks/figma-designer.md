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
| checkbox option „Opțiune document · checkbox” | `10507:44447` | Label `Label#10507:0`, star `Asterisc#10507:9`, glyph `Iconiță#11007:0` + `Iconiță · glif#11007:9` (person `6502:74649`, PJ = 24/business-filled `11972:38938` — 2026-10-17, was suitcase 10641:1308) |
| tag-filled | `10602:106194` | always Size=Small; label `⌨️ Label#387:32`; icon `🔄 Leading Icon: 16#12870:6793` |
| button-filled-rectangular | `5611:63230` | „Editează” proto `10317:33373`, „Adaugă …” proto `10316:33412` |
| button-text-rectangular | `5749:34743` | ⋮ / × proto `10317:33419` (swap inner icon: 20/more-vertical `9521:7912`, 20/cross-small `242:12038`) |
| button-text-circular | `5919:31320` | text buttons (Elimină = Destructive, Adaugă condiție = Primary Leading) |
| button-filled-circular | `8382:91415` | footer Large (Anulează Neutral, Salvează Primary, destructive confirm Destructive) |
| switch | `2009:19057` | inside `svc/switch-label` `9563:18803` (Label `Label#9563:0`, `Supporting Text#9563:1`, `Show supporting text#9563:2`) |
| info note | `9624:13362` | `svc/info-note`, text `Text#9624:0` |
| Message · subtle (local set) | `9845:17951` | every in-page notice (renderNotice): Tone Success `9845:17935` / Info `:17939` / Warning `:17943` / Error `:17947`; `Text#9845:5`; 12/16, r12, 20 icon, 14/20; bold lead = range style Desktop/Body/Small 500 (057521fd…); no × |
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
| Instance switcher (local, 2026-10-15) | GEAP set `11536:8013`, menu `11535:6128` | header trigger FO/BO × Desktop/Mobile × Default/Hover/Open; menu = native SLOT „Content”; items profile `11532:7890` / role `11532:8016` / more `11532:8125`; FOD set 839:11429, Cabinet 1014:7391; builders tools/figma/instance-switcher/ |
| Effect style „dropdown-effect” (2026-10-16) | GEAP local `S:fc1dad56be71b69894b7f3586befb682c9a2f5fc,` | every menu / dropdown / popover surface; NOT published → FOD + EVO Cabinet use it by id `S:fc1dad56…,5088:9` (getStyleByIdAsync; importStyleByKeyAsync fails); eKYC has a local copy `S:2c6b167d…,` (same effects). Radius tokens: radius-12 1f226805…, radius-16 5e0761c5… |
| eKYC library-gap pieces (local, 2026-10-16) | eKYC `10775:1049` / `:1055` / `:1059` / `:1063` | Switch · label (code A.renderToggle) · Filter option · tag (status facets) · Media badge · duration (video thumbnails) · Field label (label + 12/asterisk + hint for non-field controls). Exposed nested switch / checkbox / tag. Builders: tools/figma/ekyc-qa/ |
| Section header + action (local, 2026-10-16) | set `11745:301869` | Breakpoint Desktop/Mobile; exposed `Heading` (svc/section-heading 9521:7915, now H5 18/26, minHeight 48) + `Action`; props Meta / Show meta. Normaliser for existing rows: tools/figma/section-heading-action.js |
| Act row family (local, 2026-10-16; sizes 2026-10-19) | GEAP `Act row` 11846:340996 · `Post-process menu` 11844:340693 · `Post-process menu · item` 11844:198541 (State × **Size Desktop 40 / Touch 48**; Touch variants 12041:2547/2551/2555) · `New request card` 11848:340913 (holder 11844:198504) | GEAPActRow.html. Meta = Desktop/Body/Small 1f355410 + text/base/secondary 5d1a031c; pill = library button-filled-circular Neutral Small, paddingRight overridden to spacings/12 (code 0 12); menu p8 g4 r12, HUG width, minWidth = pill (191), items FILL, label Desktop/Body/Default 500 e069d3c3 text/base/default, 20 px icons. Act row: State Default/Hover/Menu open/Locked × Screen Desktop/Mobile (Mobile menus use Size=Touch); TEXT Title / Number / Validity / Authority, BOOLEAN Show validity / Show authority; exposed Status (tag), Action (button), Menu (7 item slots), Notice (Message · subtle Warning). FOD copies: Act row 892:11656, menu 890:11545, item 890:11544 (Touch 920:433/437/441), Message · subtle 890:11585, New request card 892:11709 (holder 890:11346). Tools: tools/figma/act-row/ |
| eKYC „Filtrare avansată” + status tabs (local, 2026-10-19) | eKYC `10818:1084` / `10818:1369` / `10819:1399` / `10819:1688` / `10819:2467` / `10828:2157`·`2193`·`2230` | Advanced filter · button (Count × State Default/Open, 36, focus ring needs clip) · Status tabs (Tabs Count 2–8, tab-item-s 40 + Track line) · Facet filter · option (Content Text/Tag/Field × State × Size Desktop/Touch) · Facet filter · popover (Checklist / More, Show search) · Advanced filter · bar (Meta Hint/Pending/Applied, EVO DS filter-chip a2731000) · Filter sheet content · ek-04j / 04l / 04m (bottom-sheet slot). Builders tools/figma/ekyc-filter/ |
| eKYC „Profile tabs” (local, 2026-10-19) | eKYC set `10835:1715` (Tabs Count 2 `10835:1389` · 3 `:1407` · 4 `:1430` · 5 `:1460` · 6 `:1497` · 7 `:1541` · 8 `:1592` · 9 `:1650`) | BO page-header tab strip (.e-permits-page-header__tabs): library tab-item-s 40 (exposed Tab 1…n: Label / Badge / Icon / Type), Track line absolute index 0, strip hugs its tabs; counters = numbered-badge Large 20 (Neutral / Accent). Replaced the library „tabs” (tab-item-md 48) on 111 strips. Tools tools/figma/ekyc-profile-tabs/ |
| FO header long name (local, 2026-10-19) | GEAP `FO header · service title` set 12089:8112 (Title Short / Long collapsed / Long expanded × Screen Desktop / Mobile; props `Name#12089:0`, `Name · lines#12089:7`, `Name · last line#12089:14`, exposed `Toggle`) · `Name expand · toggle` set 12088:8094 (Expanded False/True × State Default/Hover) · holder 12088:7138 on 🧩 Local components | code js/name-expand.js + css/name-expand.css. Desktop H5 18/26 row 859, Mobile H5 16/24 row 343 (26 floor); toggle = Desktop/Body/Small 500 text/brand/default + 16/chevron-bottom (20/chevron-top at 16 when expanded), icon/brand/default, gap 2. Mobile FO `Header` 3521:12175 got `Show draft status#12094:0` (row „Draft status” 12094:352183, gap 12) — steps 2–6 = on + TitleContainer swapped to the Short title → header 126 = code |
| Trajectory — ONE component (2026-10-20) | GEAP `Trajectory · step` **9696:556** (State Completed / Current / Suspended / Attention / Rejected / Next / Skipped × Layout Horizontal / Vertical) + `Trajectory · connector` 12155:272677 (Layout × Reached) on ↳ BO -> Dossiers (🧩 Dossiers · components). 1:1 copies: eKYC 10864:1659 / 10864:1644 · FOD 1026:777 / 1026:762 · Cabinet 1087:2497 / 1087:2482 | code js/trajectory.js + css/trajectory.css. Props `Label` (was „Tag”), `Date and person`, `Show details`, `Show line` (vertical connector + 24 tail), `Show tag` (vertical, exposed tag-filled Small: „Acum” Strong Brand 2b352fa2…, „Opțional” Subtle Neutral e4da1f91…); vertical connector = exposed instance (set Reached per step). Card = frame (white, border 1, radius-24, p20, strokesIncludedInLayout) › `steps` row. Builder + snap: tools/figma/trajectory/trajectory-set.js (stored per file in shared plugin data „traj/lib”) |
| Text styles (Foundations lk-e9e8) | — | Desktop/Heading/H5 75e7dfdc… (18/26 600 = BO section title) · Desktop/Caption/Medium 8d8e3878… (12/16 400 = section meta) · H4 6437d483… (20/28) |
| PJ / PF icons (user, 2026-10-17) | — | PJ = „business” only: 20/business 13c704752d… (avatars 32 / 40, switcher rows), 24/business b135d6dc… (48 profile avatar), 16/business 931f741c…, filled 24/business-filled c477fc69… (GEAP 11972:38938; tags / segmented / checkbox glyph, scaled 16 / 20). PF = 20/person 4559c555… / filled 6502:74649. Never suitcase-2 / luggage / suitcase-work / 24/suitcase-filled. Code icon-business / icon-business-filled |
| Download / export / print glyphs (2026-10-17) | — | export = central „arrow-inbox, download” filled=on 1.5 r2 e41040ca… (all „Descarcă …” / „Exportă …”, follows the button colour) · upload 20/upload e72e41aa… (Importă / Descarcă din MDocs) · print = „printer, print” filled=off 1.5 r2 f519c646… · A4 preview pages 12001:7122 |
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
- Dropdown surfaces (user, 2026-10-16): every menu / ⋮ menu / dropdown / popover / listbox / picker / switcher menu = effect
  style „dropdown-effect” + clip content ON + radius bound to its token (12 BO stack menus, 16 FO intent / profile menus — as
  the code) + NO border stroke (the effect's 1 px ring is the border). Tool: tools/figma/dropdown-effect/; audit rule `dropdown-effect`.
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

## Board layout rules (all boards — derived 2026-10-16 from Requestor auth lane, US-54, FOD guest lane)
- DEFAULT for GEAP boards = VERTICAL COLUMN BOARD (user 2026-10-16: „till now arrangement was vertical”): one column
  per stage with a „Stage NN” bar on top, flow left → right across columns, variants / errors stacked top → bottom in
  the column (default → filled → errors). Row lanes are ONLY for lanes that already are rows (FOD Requestor lanes).
- Section padding 80; title at (80, 80); first row / first block at y 440; sections 80 apart, left edges aligned
  with the page's column grid (Requestor: x 18394 = „How to read” / 01 Entry).
- Grid: columns = block width + 240 gap (1440 desktop-only, 1895 desktop+mobile, 1942 US-54 mobiles); every item of a
  row shares the row top; blocks never float off-grid. Column boards: stacked blocks 240 (US-54) / 396 (Requestor)
  apart; row lanes: next row top = tallest item of the row + 396.
- Block = `Screen label` → `Screens · desktop + mobile` (gap 80) → `Note · <id>` at the bottom, all inside the block
  (VERTICAL, gap 16). Notes never float beside blocks.
- Stage headers: column boards = the `Stage NN · …` bar (ID chip + title + one line) at the column top, width = the
  columns it covers, blocks 244 below. Row lanes = a narrow `Row header · …` (clone of a stage header, 560 wide, HUG)
  at the top of a 720 GUTTER left of the grid; the row's decision / doc cards sit under it (240 gap), right-aligned to
  the gutter edge (240 from the first column). The strip right of the headers (x 640–800) stays free for arrows.
- Markers (jump cards, 400 wide) = next free grid column of their source block, y = source.y + 44 (screen top).
- Arrows: same row → leave the MOBILE control's RIGHT, end on the target's LEFT edge at the SAME y (straight);
  downward → leave the block's LEFT edge at the control's y and enter the next row's block LEFT edge (gap strip), or
  the RIGHT side when the left gap already carries the row's incoming arrow; into a gutter decision → TOP at
  position x 400 (right of the row headers). Skipping a column → BOTTOM/BOTTOM route under the row. Long labels wrap
  in the 240 gap — keep them short.
- Tool: tools/figma/board-layout/row-lane-layout.js (+ a per-board config, e.g. fod-guest-lane.config.js) — re-runnable,
  snapshot first (shared plugin data on the section + repo JSON), revert-snapshot.js to undo.

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
  library avatar 5383:28521 (Small; PJ = Icon + 20/business — 2026-10-17, was suitcase 10641:1308). Never set a doc-row icon
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

- 2026-10-15 · Document cards v3 (code 9804960e) — `Document · card` GEAP 11364:7441 (54 variants) / FOD 762:10435 (12) / Cabinet
  983:2727 (6), `Document · row` 11362:7113 (33); scripts tools/figma/documents/card-v3.js, row-v3.js, card-fit.js, card-qa.js
  (README lists them; card-mobile.js / row-separators.js are superseded and still use pre-rename names — don't re-run):
  - **Instance sublayers ignore `resize()`** (text AND frames): the width snaps back to the main's (a „FIXED 179” title stayed 185 =
    the main's default text width). Only sizing MODES override. Code `flex: 1 1 64; max-width: max-content` = per instance: title
    HUG when title + tags fit, else „Title box” FILL + title FILL (ellipsis) — the tags then sit right after the truncated title.
    In a WRAP title row a FILL box needs `minWidth` on the MAIN (68 = 64 + 4 pad, Mobile only) or Figma squeezes it to ~40 and keeps
    every tag on line 1; with the min, tags that don't fit beside 68 wrap under the title exactly like the code at 375.
  - Gap 8 title→tag but 4 tag→tag in ONE wrap row: row gap 4 + „Title box” paddingRight 4 (tags stay direct children so they can
    wrap one by one).
  - `textTruncation = "ENDING"` flips `textAutoResize` to TRUNCATE (fixed size); text with layoutSizingVertical FILL in a HUG
    horizontal frame keeps a 2-line layout height (box 40 tall, tags at y 10) → always set the title vertical HUG after truncation.
    Reads right after layout changes can be stale — verify geometry in a SECOND call (or a screenshot) before concluding.
  - `setBoundVariableForPaint` with a placeholder colour renders the placeholder in screenshots / thumbnails (cards went 50 % grey):
    pass the variable's `resolveForConsumer(node).value` as the raw colour.
  - 20 px meta lines with a 12/16 text style: keep Desktop/Caption/Medium (no 12/20 style exists) and pad each Part 2/0/2/0
    (spacing-2) → lines 20 apart, dot at y 9 — no line-height override, the style stays attached.
  - × on the title line = ABSOLUTE (MAX/MIN) at y 6 with the title row paddingRight 44 (meta runs under the ×, like the code);
    check y 12 / pad 32 (spacing-32). Mobile cards with labelled actions = VERTICAL [Top (icon + content, CENTER) / Actions
    paddingLeft 36] so the icon stays centred on title + meta only.
  - Before a structural change check the copies: Cabinet desktop wrapped Content in a „Column” (left empty after moving) and its
    variants have no State prop (`vp.State` undefined broke the „Default” surface test); FOD Meta was WRAP itself.
  - Agent tool not available again → ran figma-audit (components) + card-qa.js (every instance, 3 files) by hand.

- 2026-10-15 · Export icon sweep (commit 08e09f2d) + „Fluxuri de lucru” registry (pd-35 / pd-35c) + sidebar item:
  - Export icon = central „arrow-inbox, download” (set key 80dbbcd5…). GEAP has a LOCAL wrapper `20/export` 10784:265036
    (filled=off, stroke=1.5, radius=2, join=round = code `icon-export`; description says so) — use it in GEAP buttons (Icon=Only,
    `🔄 Leading Icon: 16`) and menu items. eKYC uses the central variant directly (filled=on, stroke=2, radius=2 — same glyph,
    fill follows the button colour). FOD / EVO Cabinet have no export actions (only „Descarcă” = 20/download, correct).
    Sweep method that worked in 4 files: per page (≤ 8 pages per call, read-only) aggregate INSTANCES named `NN/download|NN/export|
    arrow-inbox…` by host set + label + parent AND every TEXT starting with „Export…” by host + icon; one row per pattern with a
    sample id. Result today: 0 wrong export icons in all 4 files (GEAP 94 icon-only + 2 menu items, eKYC 98 icon-only).
    Labelled „Exportă” menu buttons (eKYC R06) still show chevron only — the library button holds one icon (known gap).
  - Not export, but found: GEAP Services „Importă din MDocs” (17×) still uses 20/download — code 58d922f4 says upload icon.
  - New tool `tools/figma/swap-workplace-registry.js` (BO workplace registry capture → instances: search, Filtrare avansată
    (Disabled when the captured label is light), export, primary, tab-item-s status tabs (key 0294516b…, 40 px, Badge), sort
    chevrons, status tags, „Editează”, ⋮, pager arrows (button-text-circular Strict Medium Disabled), page item, rows-per-page
    select, mobile initials → avatar Initials Medium). Protos = Classifiers board instances. Cells stay raw (as on Classifiers).
  - Block = clone the Classifiers block 10177:1919 (shell: gov bar, sidebar, shell header), drop its „Page”, insert the captured
    content. At 1440 the clone keeps Body minHeight 990 from the 1920 board → clear it (Body HUG, sidebar FILL) or the screen
    stays 1024. Shell title frame is FIXED 128 → HUG or „Fluxuri de lu…”.
  - Read every property of a captured node BEFORE put() removes it (opacity read after removal rolled the whole call back).
  - sidebar-public-services (local 8993:35379, 345 instances) got „Fluxuri de lucru” (code fdce2978, data/e-permits-roles.json)
    after Configurări servicii. Its items' icons are NESTED SWAPS — the `🔄 Icon` property does not drive the visible icon, and
    `resetOverrides()` on the nested icon reverts it to folder-paper. Swapping a Foundations FILL icon into a slot that held a
    central STROKE icon carries `fills: []` → invisible glyph. Right way: `swapComponent` to the central STROKE variant
    (filled=off, stroke=1.5, radius=2, round — same family as the siblings: list-sparkle etc.) in the main AND in any instance
    that already had an override; Active colour then comes from the variant (border/brand/default). Count instances first,
    check the ones whose height ≈ content (two sidebars grew 562/580 → 598 inside HUG bodies, blocks unchanged).
  - Onest has no „⋮” glyph (renders „:”) — write „Mai multe acțiuni” in notes, titles and connector labels.
  - A section created with fills copied from another section came out black (the source fill was unbound / transparent) → set
    the section fill to background/base/default (white) explicitly.
  - Connector from a row ⋮ in the desktop screen to the next block crossed the mobile screen → start on the block with
    `position {x: block.width, y: row centre}` (leaves the block edge at the row height).
  - Code findings for proto-engineer: at 1440 the registry clips Denumire without an ellipsis (`text-overflow: clip`) and wraps
    long Identificator values (`overflow-wrap: anywhere`); Figma uses the table rule (one line + ellipsis) for names and keeps the
    2-line identifiers as rendered. At 375 the toolbar overflows (Creează proces off-screen) — BO mobile is not designed.
  - No Agent tool in this session → ran figma-audit.js on W01 / W01a myself; leftovers are the shared gov-bar clone (egov-logo
    absolute, #000 text with no token) and intentional mobile scroll clips.

- 2026-10-15 · Header instance switcher as a component with a native slot (code 34867704; fo-01s / sm-01s / auth-05) — scripts
  tools/figma/instance-switcher/* (README lists run order + ids). GEAP: `Instance switcher` 11536:8013 (Context FO/BO × Type
  Desktop/Mobile × State Default/Hover/Open, props Name / Detail / Show menu, exposed Avatar + Menu), `Instance switcher · menu`
  11535:6128 (SLOT „Content”), `… · profile` 11532:7890, `… · role` 11532:8016, `… · more` 11532:8125; copies in FOD (set 839:11429)
  and EVO Cabinet (set 1014:7391). Swapped: GEAP 493 old-trigger instances + `.temp` main (116+ headers) + 36 raw BO
  `shell__user-trigger` frames + `Header` mobile main (71); FOD 20 headers; Cabinet 13 triggers + 10 mobile headers; open screens
  FO F1d/F1e/F1f/F2f/F2g/F2i (+ mobiles), Requestor S1/S2, BO Shell 02a/02b/02c/04, Workplace 05/05a, FOD S1/S2.
  - **Native slots work through nesting**: `component.createSlot()` → a SLOT property; an instance of the menu nested (exposed) in
    the trigger, nested again in a header instance, still exposes the SLOT node — `slot.appendChild()` / child `remove()` on the
    screen fill it. `setProperties` can't touch SLOT props. Test the mechanic on a scratch component first (5 lines, then delete).
  - **Shadow spread (the focus ring) renders only on frames that clip content.** A trigger whose Open menu hangs outside can't
    clip → root = transparent unclipped frame, the visible button = inner clipping „Trigger” frame with the fill / radius / ring.
    Old GEAP Focus variants had the ring style but never showed it for this reason.
  - Open menus inside a header need: no clipping on the header branch AND the branch painting above the content after it
    (`itemReverseZIndex = true` on the vertical stack when the header is its first VISIBLE flow child — hidden captured header
    layers before it fooled a „first child” test on F2f). Both are overridable on instances of remote headers (FOD `.temp`).
  - **`resetOverrides()` on a NESTED instance also removes its instance-swap override** — the 20 FOD header swaps silently
    reverted (GEAP survived only because the `.temp` main was swapped too). Reset only top-level instances (`!id.includes(";")`).
  - `getInstancesAsync()` returns instances nested in other instances too (FO Full Flows: 63, not the 1 the first census showed),
    and in FOD / Cabinet it also returns the instance inside a REMOTE main's cached definition (read-only — leave it).
  - FOD and EVO Cabinet consume GEAP's PUBLISHED `.temp`, `.role-switch-item/general` and mobile `Header` (same keys) → swaps there
    are per-instance overrides on remote instances; they persist when GEAP publishes. Local components still have to be copied.
  - Mobile Figma headers (library header-evo-mobile) have no menu button, the avatar sits at the content edge → Type=Mobile Open
    menu right edge = trigger right (16 from the screen at 375), unlike the code (+40 button +16 gap). Library avatar inside a
    remote header can't be replaced → closed/open switcher placed ABSOLUTE in the screen (or the local header main) over it, avatar
    hidden. Old „full-page” mobile menus were rebuilt from the closed mobile page of the same step (clone → overlay), then the
    column restacked (F2f mobile 812 → 1021 pushed F2g/F2h/F2i +177).
  - Measure the code DOM before building (`menu-dom.mjs`): BO trigger is 54 high with a 12/16 role line, FO 52 with 14/20 → a
    Context variant, not overrides. Accepted gaps (in descriptions): BO role cards 56 vs 58 (code pads 9/13 for the selected 2px
    border), avatar-stack overlap −8 (no negative token), logout / settings icons 20 vs 24, BO role icons = person for all roles.
  - Long builders: keep the shared prelude in `figma.root` shared plugin data during the job (`isw/lib`, run with AsyncFunction),
    clear it at the end; `const page` in the prelude collides with a caller's `page` (rename to `fpage`).
  - Agent tool not available again → figma-audit.js on the components (only holder paddings + the −8 overlap) and a geometry
    check on every open screen (menu right Δ0, gap 8, menu inside the screen).

- 2026-10-15 · US-54 mobiles (20 blocks, board 11224:39519) + US-18 F8c (10815:25411):
  - Adding mobiles to desktop-only address blocks = `tools/figma/add-fo-address-mobile.js`: clone the REAL step-2 mobile
    (`Mobile · C04` 11276:13017, context skeleton included), rebuild only its „Address · fields” from the 375 DOM spec
    (`extract-fo-address.mjs <state> 375`), append it to the block's „Screens · desktop + mobile”. 4 blocks per call with
    compact specs (~1.7 KB each). Python's „drop falsy keys” also drops `x: 0` → the script defaults x to 0.
  - Reusing a long builder across calls without re-pasting: define it as `const RUN = async (JOBS) => {…}`, store
    `RUN.toString()` in `figma.root` shared plugin data on the first call, later calls run
    `new Function("return " + stored)()` — clear the key at the end.
  - 375 side-by-side parts (Casa/Blocul/Scara, Etaj/Apartament) = all FILL + gap 16 (code 1fr columns; the captured
    x-gaps were 15/16 and 15 is off-scale).
  - Before trusting „desktop done”: diff a whole board against the current code. The Cod cadastral hint „Apăsați săgeata…”
    was removed in code (d8a7384e) but 21 field instances still showed it → hidden board-wide, then restack (heights −20).
  - Desktop/mobile parity check that worked: per block, map field instance name → variant State/Style + visible texts for
    desktop and mobile „Address · fields”, report diffs (only leftover Romanian names „· implicit” differed → renamed).
  - Widening blocks by a mobile (1447 → 1942) needs a column shift: shift every section child right of each widened column
    (+495 per widened column), widen the stage headers / lane frame / page header, then re-run the vertical restack (upper
    columns 240, lane = tallest upper column + 440, lane blocks + 200, lane decisions moved by the lane dy). A decision that
    sat in the gap between two lane columns no longer fit → moved under its source block (right-aligned, end magnet TOP).
  - Connectors that started on desktop controls and went right now crossed the new mobiles → re-anchor to the SAME control in
    the mobile (top-level field instance, magnet RIGHT; anchors over nested buttons → the field instance). Downward /
    leftward ones → start on the block's LEFT edge (`position {x: 0, y: control centre}`), end magnet LEFT (below) or RIGHT
    (column to the left).
  - figma-audit false positive: captured wrappers named „Button Container” → renamed „Footer · actions” (24).
  - F8 column drift vs code found while drawing F8c: finish button „Urmărește statutul în EVO Cabinet” → code „Mergi la
    Solicitările mele”; mobile timeline „→ Fișierele mele” → „Solicitările mele” — fixed on F8, F8b, F8c, F8d, F8e. Header
    persona (code: SRL Global Trader PJ, Figma: Anastasia PF) and the Beta feedback bar are board-wide — reported, not changed.
  - US-18 AC-02 (no fee → Finalizare after Livrare): the primary request has no no-fee demo state (code always gates step 7 on
    `?paid=1`; only post-processes skip Plată) → not drawn, reported to proto-engineer. Never invent a state.
  - No Agent tool in this session again → ran figma-audit.js on the 21 new roots myself (0 majors after the rename).

- 2026-10-16 · FOD guest lane relayout (756:25760, „arrange the guest lane as the other boards”): 6 stage rows (Access ·
  Who can apply · IDNO lookup · For another person · Validation and leaving · Guest wizard), 20 blocks on a 1895 + 240
  grid, 6 new `Row header · …` (clone of `Stage 05` 756:25262), decisions / doc right-aligned in a 720 gutter, markers at
  source.y + 44, section moved to x 18394 and fitted (13235 × 16062 → 12195 × 16042). 35 moves, 18 connector ends.
  Rules promoted to „Board layout rules” above. Lessons:
  - Row headers ABOVE the rows (full-width bars) would be crossed by every inter-row arrow → put them in the gutter,
    narrow (560), and keep a free strip for vertical arrows (x 640–800) and the gap between gutter and grid.
  - G1c sits under its trigger G1b (k1) instead of k0 → the „IDNO complete” arrow is a short vertical, not a diagonal
    over G1. Place a row's first block under the block that leads to it, even if column 0 stays empty.
  - „Straight” end = the target's LEFT edge at the start's absolute y (position {x: 0, y}) when it lands 60 px inside
    the target; otherwise fall back to magnet LEFT (G7 → G7a, G7b → G7c: buttons at the bottom of tall mobiles).
  - A connector's absoluteBoundingBox includes its label: a 524-high box was a wrapped label in the 240 gap, not a jog.
  - get_screenshot of an empty helper frame renders nothing under it; screenshot a page-level connector node instead to
    see its route over the canvas.
  - Text width changes need the font loaded too (`textAutoResize` threw „unloaded font” — the call rolled back).
  - No Agent tool again → figma-audit.js on the lane myself: 0 overlaps (lane + page), 40 screens keep clip + radius +
    4 px border, 0 unstyled header texts; leftovers pre-existing (Mobile · G8 Body cut by the 812 viewport, 4 non-Onest).

- 2026-10-16 · Dropdown-effect audit, 4 files (user: „all dropdown menus: dropdown-effect + clip content, as in 9632:3226”). Tool
  tools/figma/dropdown-effect/dropdown-effect.js (dry → apply → revert; snapshot in page shared plugin data geapqa/dropfx-20261016 +
  snapshot-20261016.json); figma-audit.js got the `dropdown-effect` rule. Result: GEAP 52 fixed (+3 instances via the switcher
  main, 45 nested FO Full Flows menus via their Address-page source frames), eKYC 10, FOD 5, Cabinet 1 (+3 via main); skipped 1
  (Incidents contextual-menu 245:20652 holds an open date-picker hanging outside → clip would cut it); library mains lacking
  it reported only (contextual-menu, selection-menu, date-picker, eKYC role-switch: all Foundations Drop Shadow/300).
  - Read the reference's style first: „dropdown-effect” = 0 0 0 1 @8 % ring + 0 4 6 −2 @5 % + 0 10 15 −3 @10 % — exactly the code's
    menu box-shadow. The ring is the border → remove 1 px border strokes on menus (9 had one = double border).
  - The style is LOCAL and unpublished in GEAP: importStyleByKeyAsync fails in other files, search_design_system finds nothing. But
    files that received copied GEAP nodes already hold it as a remote style: find the id from a consumer node
    (`S:<key>,<nodeId>`), then `getStyleByIdAsync(id)` resolves even in a file with no consumer yet (FOD). Prefer that over
    making local copies; eKYC already had its own local copy (kept, same effects).
  - Radius „as the reference” ≠ force 12: the code uses 12 (BO stack menus) and 16 (FO intent / profile menus). Bind the menu's own
    on-scale value to its token. All 70 targets were already token-bound.
  - Heuristics that held: name regex (menu / dropdown / popover / listbox / options / picker / selection- / contextual-menu) minus an
    exclusion list (items, buttons, triggers, wraps, headers, blocks, screens, search, container, „· action”, „· profile|role|more”
    item names — anchored to „( /|$)” because variant names come as „Set / Prop=…”, and „· role-switch” IS a menu), + white fill,
    + (effects or ABSOLUTE or COMPONENT), ≤ 1100 wide. Instances need a menu-named main or effects („Menu Container” was a title).
    Dry-run each exclusion against a name census (distinct names × type × white × fx) — the first pass lost the reference itself
    („Field picker” hit `field`) and every „⋮ row” menu (`row`).
  - `dropdown-effect` was also applied to non-menus (MSupport avatars, chat bubbles) — a style-based finder would „fix” those;
    detect by name + structure, never by style alone.
  - Frames nested in instances (`I…;2623:45122`): fix the SOURCE node (last id segment) — 45 instances on FO Full Flows followed
    their Address-page frames; only then override what still differs. Fix order: local components page → source pages → the rest.
  - Clip safety: check every visible descendant's absoluteBoundingBox against the surface before turning clip on; a child outside
    (open submenu / date-picker) = skip + report.
  - No Agent tool in this session → ran figma-audit.js on a sample myself: 0 dropdown-effect findings on fixed nodes; the 3 left
    are the skipped overflow case and library mains (expected).


- 2026-10-16 · Section header with an action + tab strip hugs (code a89b5c0b; GEAP + eKYC). Tools: tools/figma/section-heading-action.js
  (dry / apply / revert, per page), tools/figma/tab-strip-hug.js (JOBS per container). 101 header rows normalised (GEAP NT 13,
  Services 59, Users 8, Classifiers 4; eKYC 17), svc/section-heading main 9521:7915 fixed (437 instances), new local set
  „svc/section-heading + action” 11745:301869 (Desktop / Mobile), Profile / Tabs (39 instances), sheet header 10008:1624 (10),
  17 ntpl tab strips, passport Main Navigation line (167). Lessons:
  - The „wrapper” the coordinator called a component was a FRAME cloned into every block, and the same pattern existed in
    5 different captured shapes (svc wrapper, `dosar-profil__section-heading` 48 / 50 high, `Container` + `Heading 2`, NT
    „Heading” with a bare TEXT title). Census first by geometry (title text 18/20 ≥ 500 → nearest HORIZONTAL ancestor 36–64
    high with a button / link / segmented instance), group by shape, then one normaliser for all shapes. Replacing them
    with instances would have moved the buttons into instance sublayers → connectors can't attach; normalise in place
    and ship a documented component for new work.
  - Code first, then decide scope: „Ultimele modificări” puts a link straight into the heading (flush right in code too) and
    `.e-permits-pay__toolbar` is the list toolbar — both excluded; old loose frames outside `Block · …` skipped.
  - Title height without off-scale padding: title frame padding 0 / 12, minHeight 48 bound to spacings/48, counter CENTER
    → text at y 11 = the code's 11px padding, no `11` in the file. A 52 segmented control in a 48 row: row FIXED 48,
    clip off, the control overflows ±2 exactly like the code.
  - **A frame's stroke paints ABOVE its children** (tested with a scratch frame): a bottom stroke on a tab container cuts
    1px off the active tab's 2px underline. Full-width track line = an absolute „Track line” child at index 0 (under the
    tabs), constraints STRETCH / MAX, 1px top stroke bound to border/base/default. Then zero ancestor bottom strokes that
    coincide with it (the header components carried one → a second, full-width line in the 24-inset sheet).
  - `getInstancesAsync` + child lookups on nested instances return only part of the set unless
    `figma.skipInvisibleInstanceChildren = false` (4 of 39 Profile / Tabs instances the first time).
  - swapComponent from button-text-rectangular to button-filled-rectangular kept the text button's icon fill → dark plus on a
    Secondary button even though its bound variable matched a fresh instance's. The screenshot is the test: fresh
    `createInstance()` + label, re-point connectors (1 here), remove the old one.
  - Capturing the code at 375 found a doc / code drift (mobile button → content 24, doc 12): Figma follows the doc, the
    drift goes to the report — measure the rendered mobile before drawing the Mobile variant.
  - Found while comparing: 14 Users screens had Body HUG without minHeight (sidebar stopped at 602 of 1024) → Body
    minHeight = screen − header (992). Run the „Body shorter than screen” check on any page you touch.
  - Agent tool not available again → figma-audit.js on all changed roots (one multi-page call: wrap the audit body in
    `audit(ROOTS)` and loop pages with roots found by snapshot keys); only finding = 31 unstyled captured meta texts →
    Desktop/Caption/Medium. Instances inherit shared plugin data, so a key on a main matches its 167 instance copies in
    a page-wide findAll — filter by `!id.includes(";")` before reverting.

- 2026-10-16 · Ghișeu (BO desk filing, page ↳ BO -> Ghișeu · Desk filing 11589:327039, section 11818:21092): 85 gh-* states,
  desktop only (user: no mobile for desk filing), 11 stage columns, 56 arrows. Tools: tools/figma/ghiseu/ (cap.sh, compose.js,
  swap-ghiseu.js, blocks.config.js, build-blocks.js, column-layout.js) + board-layout/ghiseu-board.config.js (row variant, superseded).
  - **GEAP boards are COLUMN boards** (user correction): one column per stage with a column-wide `Stage NN` bar, flow left → right,
    variants stacked top → bottom (default → filled → errors), 240 apart. The row-lane layout + row-lane-layout.js is only for the
    FOD lanes. Ask / check the neighbouring boards of the SAME file before choosing a layout.
  - Desk filing = desktop only → block = label → desktop → note (note FILL = 1440), column 1440 + 240.
  - Captures: `cap.sh` prints „timeout (submitted?)” for every job, yet every capture lands — always poll; a capture can still be
    „processing” when the compose runner already sees its root, check the composed screenshot.
  - Compose runner (ALL) with MAX 3 dropped the MCP transport twice („response lost”) → MAX 2, check page state after a drop
    (the work had partly happened).
  - Table row menus off-screen at 1440 (the actions column is not sticky): capture with `ROW=<rowid>` (scroll the table wrap right,
    reopen the row menu via --eval). The registry swap set EVERY ⋮ to State=Focus → reset to Default except the open row's.
  - Arrow endpoints: never take the first text / instance match — sheets keep the registry behind them (clipped at x > 1440), so
    „Continuă” / „More actions” matched the background rows. Filter candidates to the screen's visible bounds.
  - Connector labels need the label font loaded first (`c.text.fontName`) — setting `c.text.characters` silently failed in a
    try/catch and every arrow kept the template's „Dosar nou”.
  - Arrow routing that never crosses blocks on a column board: next column → control RIGHT → target (0, 120); same column adjacent
    → BOTTOM/TOP; same column further → control LEFT → target LEFT (0, 200 + 32k). A BOTTOM→TOP arrow into a block that is HIGHER
    in another column routes under the source and crosses its neighbours — use RIGHT → (0,120) instead. Bbox overlap checks give
    false positives for L-shaped connectors; screenshot the connector node to see the real route.
  - Big stored builders: put the code once in `figma.root` shared plugin data with String.raw (no backticks / `${` in the source),
    then call it per slice — saved ~40 KB of repeated pastes (binder run in 4 slices of the section's children).
  - Audit (figma-audit.js on the section): stepper links „Button - Deschide pasul N” (211) and `fontName` mixed = known false
    positives / library gap (no FO vertical stepper component); remaining real minors listed in the report.

### HARD RULE (user, 2026-10-16, repeated): no PNG / image-fill icons — ever
Every capture leaves image-fill icons. A capture is NOT done until the icon swap has run: document icons → the published
„document-icon” set (System Generated e0b9de2b… / User Uploaded b467bfaa…), every other icon → the library icon instance
(icon-map, as in the eKYC „0 raw captured icons” job). Final QA must report image-fill icons = 0 on every touched block.

### HARD RULE (user, 2026-10-16): whole pixels only
No fractional sizes or positions (e.g. 74.4 px) on frames / instances / text. Auto-layout: hug labels and buttons,
fill only real columns, keep containers whole-pixel so fills don't split into fractions. figma-audit flags fractions.

- 2026-10-16 · Act row job (user on 11678:11643: „what's that? redo it — auto-layout and components”; captured row with a PNG
  doc icon and an orphan leading meta dot). Built `Act row` / `Post-process menu (· item)` / `New request card` (ids in the table),
  swapped 25 Ghișeu rows (gh-02i/j/t/x/u/n), 6 FO Post-processes rows (02/02a/02b) + 4 cards + 4 „sau” dividers + 4 hand-built
  „Schimbă”, F1c 4 rows (desktop + mobile) + 2 cards, FOD P1/P2 4 rows + 2 cards (copies built from library keys). Lessons:
  - Measure the code first (tools/figma/act-row/measure-act-rows.mjs: row box, paddings, tag class, meta parts, pending, trigger,
    open menu items + disabled + reason; per state and width) and generate the swap SPEC from it (build-spec.py) — the instances
    carry code data, not whatever the old capture had (FO 02 still showed „15.09.2028”, FOD P2 an old 5-item menu).
  - A code agent changed the locked notice + menu size mid-job: read `git status` / `git diff` too, not only `git log` — the change
    was live in the working tree (and on the dev server) before its commit landed.
  - Figma DELETES a connector when its endpoint node is removed → re-point connectors (anchor / instance + position) BEFORE
    `old.remove()`. A failed use_figma call also rolls back any root shared-plugin-data store done in it.
  - Instance children can't be moved (`x` / rotation = relative-transform overrides fail). Anything that must follow a resized
    nested instance (a menu right-aligned to its pill) goes in an auto-layout wrapper in the MAIN: absolute „Menu layer” spanning
    the row (STRETCH), primaryAxisAlign MAX (desktop) / MIN + padding (mobile); the menu inside it is a flow child — reparenting
    keeps `layoutPositioning = ABSOLUTE`, reset it to AUTO. The open chevron = swap the button's `🔄 Trailing Icon: 16` (20/chevron-top
    keeps the 16 slot size), not a rotation.
  - Menu widths: the code hugs the longest item (max-content); Figma text runs a few px wider → item labels WIDTH_AND_HEIGHT and the
    menu width = max(code width, measured need, 180). FILL + HEIGHT labels silently wrap („Suspendare / valabilitate”).
  - Setting `textAutoResize` after `textTruncation` resets the truncation (main stayed DISABLED). Per instance when the title must
    ellipsize: FILL → textTruncation ENDING → maxLines 1 → vertical HUG (mobile „Piața Mare” row grew 134 → 154 without it).
  - Exposed nested instances: `isExposedInstance = true` only after the instance is inside the component (throws otherwise).
  - `findOne(INSTANCE)` on a fresh library avatar returned the hidden Notification badge first → pick nested layers by name.
  - `.menu-item-action` in GEAP comes from the older library copy (key 8eee001b…) that FOD doesn't have → reach the right variant
    through the file's library contextual-menu (eca4c78b…) instance children. Local GEAP-only pieces (Message · subtle) need a copy.
  - Row hover = #F1F1F1 = the pill's own fill → the pill disappears on row hover — in the CODE too (reported, Figma mirrors code).
  - Coordination: another agent built its own „Intent card · new request (FO)” 11849:7127 for the Ghișeu board during this job →
    two components for one pattern; Ghișeu left as is (coordinator: only act rows there), reported for a merge decision.
  - No Agent tool in this session → ran figma-audit.js (+ act-row extras: visible line-start dots, image fills, non-auto-layout,
    wrapped titles, menu effect) per page myself; left: meta gap 18 (Document · card pattern, declared).

- 2026-10-16 · eKYC BO QA + fix (all 9 BO pages, 253 screens; tools/figma/ekyc-qa/, README lists the run order). Before → after:
  fractional 2,447 → 0 (FIXED / absolute) + 1,592 stroke-shifted positions fixed; not-auto-layout 172 → 0; sibling overlap
  488 → 0; clipped 211 → 0; raw glyph vectors 375 → 0; raw controls 40 → 0 and control-like raw frames 111 → 2 (a legend tray and a row card — not controls); 74 negative-margin wrappers
  → 0; 150 meters + 20 charts + 9 band axes → auto-layout. Lessons:
  - **The shared figma-audit missed most of it**: it has no image-fill / fractional / tight-gap / absolute-children checks and
    compares icon colours raw. Write a page-level audit that walks screens WITHOUT descending into instances (fast: a 43-screen
    page in one call), plus three censuses: control-like raw frames (painted + rounded + ≤ 64 high + short text), hand-built
    control + label combos, and ABSOLUTE children grouped by parent — the last one found the „…:margin” pattern that
    not-auto-layout can't see (the wrapper HAS auto-layout; its only child is absolute at −8 / −4).
  - **html→Figma negative margins**: `margin-left: −8px` / `margin-top: −4 / −8px` become a flow wrapper „X:margin” with the
    element ABSOLUTE at the negative offset. Fix = previous sibling + element in one auto-layout group with gap = parent gap −
    margin (tags 12 − 8 = 4, chart axis 16 − 8 = 8, hint 8 − 4 = 4) + the wrapper's leftover as trailing padding — geometry
    identical. Runs of margin items join the same group.
  - **Captured SVG data graphics** (meters, column charts, threshold axes) are absolute vectors. Rebuild them as auto-layout
    from the vector boxes: meter = HORIZONTAL frame, segments FIXED (stacked: gap 2 = the code's card-colour cut lines, each
    inner side −1 px; single: frame fill = track); chart = buckets with cumulative-rounded widths (n = round(0.56·W / bar)),
    bars bottom-aligned, head segment radius-4 top; axis = tick groups (odd width when centred) between FIXED spacers. Data
    widths can't be component overrides — **nested FIXED sizes on instances snap back** (re-tested), so graphics stay frames.
  - Colour names of captured vectors are hex-matched, not the code's: track = background/base/default-active (captured
    background/disabled/secondary), positive = icon/positive/default. Keep the captured warning (accent #fec84b = the rendered
    code apricot-400; Figma's background/warning/default is #fdb022 — token drift).
  - **Fractions**: (1) captured FIXED widths (998.98) and absolute 1 px dividers at x −24.5 → round, texts round UP; (2) FLEX /
    FIXED grid tracks with fractions → whole FIXED tracks by cumulative rounding; (3) the big hidden one: 0.5 px cell dividers
    and 1 px borders with strokesIncludedInLayout → every centred child sits at .25 / .5. Toggle includedInLayout off when that
    makes the children whole (the INSIDE stroke still paints on the edge). Residual (~250): centred / space-between labels whose
    odd free space comes from text widths — same family as hug labels, left.
  - `resize()` on an auto-layout child resets BOTH sizing modes — restore HUG / FILL on the untouched axis right after.
  - Replacing a node in a **GRID** parent: insert, remove the old one, THEN `setGridChildPosition(row, col)` + span — inserting
    first auto-places the instance in a 1-column cell (a switch row became 34 px wide with one-letter lines). pieces.js does it.
  - A captured screen can be a **scrolled viewport** (scroll-content at y −1512): sticky elements (section nav, header) were
    captured at the scroll position. Re-laying them out at y 0 scrolls them out of view — keep the offset with a FIXED
    „Spacer · scroll offset” in a column. Check scroll-content y before moving anything inside it.
  - When a wrapper that held FIXED children becomes FILL-based (band card HUG → content FILL), the HUG ancestor collapses to the
    text widths (1024 → 593). After any conversion, check the ancestor's sizing and screenshot.
  - Hand-built designer frames (L01: „Frame 1261…”, gap 10, fingerprint brand row, lower-case „mpass”) are not captures —
    never „fix” them toward the code; report the divergence for the PO.
  - Flagged „icon-colour-override” on 23 Primary buttons = Figma's record of the swapped icon's own variant colour; resolved
    colours were identical (white on white). The audit now compares resolved values.
  - Concurrent edits: another job extended tools/ui-qa/figma-audit.js (fractional / tight-gap / image-fill-icon) while this ran.
    Its tight-gap flags „section header directly on a card” (gap 0 by the user's section-over-card rule) and its fractional
    counts hug text metrics — keep the rule set coherent before trusting raw counts.
  - No Agent tool in this session → ran tools/ui-qa/figma-audit.js + the eKYC audit myself on the changed screens; 0 majors.

- 2026-10-16 · Ghișeu board finish (section 11818:21092; library pass, recaptures, markers, whole pixels). Tools (repo):
  tools/figma/ghiseu/library-pass.js (raw → instances per screen: identity card, copy-block, stepper, notices → Message · subtle /
  svc/info-note, New request card, IDNP/IDNO lookup → search-input Button=True, menus → .menu-item-action surfaces, Corectează /
  Detalii, protos-by-label), collect-icons.mjs (code sprite + <img>/mask icons per state, with x/y), measure.mjs (computed DOM
  boxes for any selector — use it before every „make it like the code”). Stored builders in figma.root „ghs”: libpass, iconpass,
  authpass, docpass, post (= lib + auth + icons + docs + ⋮ focus reset + FILL-in-HUG → HUG), replace (swap a block's screen and
  re-attach connectors by name + position), layout / cols, pix / pix2 / par (whole pixels), audit (figma-audit + new rules).
  - New local components (GEAP › Local components › „Ghișeu · FO local components”): Identity card · selected (FO) 11848:340972
    (Changeable / Static; code .e-permits-fo-selected-role — the code border does not take space: strokesIncludedInLayout false),
    FO stepper · step (vertical) 11849:7107 (Completed / Active / Default, Show connector, Number, Label), Authorization card (FO)
    11861:7142 (MPower 24/identity, RSUD 24/suitcase-2), Board marker · jump 11881:355015. Shared from the Act row job: New request
    card 11848:340913 (my Intent card duplicate was swapped and deleted — check the coordinator's components before building one),
    Act row 11846:340996, Post-process menu 11844:340693. FO check option = `Document option · checkbox` 10507:44447 (p6/12/6/8 r8,
    32 high); copy value = local `copy-block` 1053:10780 (hide its icon in table cells — the code shows it on hover only).
  - Icons from captures: map by POSITION, not by guess — export every raw h2d-svg / IMAGE-fill node with its screen-relative x/y and
    a vector-path hash, probe the code icons per state (collect-icons.mjs), nearest match within 40 px → one glyph per signature
    (47 signatures, 374 raw + 88 image fills → 0). Documents → published document-icon (System Generated e0b9de2b… / User
    Uploaded b467bfaa…), EVO logo images → library evo-logo instance; code sprite ids not in Foundations (cloud-upload-success /
    -draft) → nearest Foundations glyph, declared.
  - Raw captured error lines next to a field = the field's own Destructive + Assistive Text (remove the row); free error lines =
    library inline-message Error. Notices: the tone is the captured fill variable (blue-sky/100 Info, green/100 Success,
    apricot/100 Warning, red/100 Error, base/secondary = svc/info-note); copy the bold lead with setRangeFontName.
  - Open lists / menus inside a clipping dialog: move the surface to the SCREEN root as ABSOLUTE at its absolute position
    (dropdown-effect + clip + r12 token + no stroke), right edge = trigger right, 8 below. Library .menu-item-action is 44 high
    (code 32) and library menus are 256 wide — re-align to the trigger after the swap or the menu runs off the 1440 screen.
  - Code changed under the board twice (sticky actions 086ca562, representation basis 05d98041): recapture whole COLUMNS with the
    pipeline (cap.sh → ALL compose → POST → REPLACE), not patch blocks. REPLACE re-attaches connectors by endpoint name + offset;
    one connector still died when I replaced a raw row that was its endpoint inside a list — snapshot connector ids first and diff
    after every pass (geapqa/ghs-snap-20261016b).
  - Whole pixels: 11,162 fractional nodes → 79. The causes were (1) centring in odd space: table cells 50 with a 1 px bottom
    stroke INCLUDED in layout (inner 49 → y 6.5) — toggle strokesIncludedInLayout when the stroke sum is odd (8,000 nodes fixed
    without moving anything visibly), the same for the 66 shell header; (2) FIXED captured fractions → round; (3) FILL siblings
    splitting an odd width → FIXED rounded widths that sum exactly. Leftover: absolute-centred empty states and a few HUG texts.
  - Section header + action (code 3bfd4ebf): the set's Desktop variant and 92 normalised rows got paddingBottom 4 (spacings/4) →
    52 high; tall segmented rows on NT stay 48 (code exception). Adjacent notices: only Services 01p had a pair (wrapped in a
    „Notices” stack gap 12); the Ghișeu pair sits in the FO payment body (gap 32) — the code excludes it.
  - tight-gap by itemSpacing alone is mostly false positives (captured spacing lives in child paddings / :margin wrappers) →
    measure visual gaps with absoluteRenderBounds; the 26 real < 8 pairs all match the code (measure.mjs), so none were changed.
  - Onest has no „⋮” — texts with it render „:” (13 board texts fixed). Full-page screenshots of an 18,400 × 30,800 section fail
    („unexpected error”) — screenshot per block instead.
  - No Agent tool in this session again → ran figma-audit.js (stored „ghs/audit”) myself; before/after in the report.

### HARD RULE (user, 2026-10-16): icon colour after every swap
`swapComponent()` / imported icon instances bring the icon's DEFAULT fill (≈ black). After any icon swap: inside a
component variant → reset the icon overrides (the variant colours it); outside (avatar glyphs, standalone ⓘ, status
icons) → bind the fill to the colour the CODE renders there (measure the svg's computed colour). The old audit only
compared icons with a sibling label, so label-less icons slipped through — run `icon-colour-vs-code` before reporting.

### HARD RULE (user, 2026-10-16): keep the starting points current
Every Figma change ends by updating the starting points: (1) the board's own „Start here” / contents section (lists and
links every column section, block counts, PO questions) and (2) the file-level index / cover / site map (entry + link
for every page / board touched). One SECTION per column on boards. Not done until both are updated.

- 2026-10-16 · Ghișeu quality sweep (figma-quality-sweep; tools/figma/quality-sweep/: gate-audit.js, shell-components.js,
  modal-hug.js, background-list.js, list-states.js, spacing-rhythm.js, whole-pixels.js, icon-colours.js, restack.js,
  split-sections.js). Board is now 12 sections (00 · How to read · Contents 11933:28964 + 01…11 column sections
  11933:28965…28975), connectors on the page (59). Lessons:
  - **Verify the builder's counts with a per-BLOCK audit that does not descend into instances** (gate-audit.js, stored in
    figma.root „qsweep/audit”): 88 blocks in 3 calls (~16 s / 8 blocks). Numbers matched, but the builder's „raw controls 0”
    missed a captured segmented control (gh-01e Excel / CSV) and 88 captured shell bars + headers — census repeated frames by
    texts + instance names, not only by control names.
  - **Shell chrome as local components** (Shell / Gov bar (desktop) 11903:7111, Shell / Header (BO desktop) 11903:7155):
    library `.top-section` is the FO max-width variant (1280 centred, no border) — measure the code before swapping. Code
    gov bar = 32 high with the border inside; the capture made it 34 (1 px stroke all round), so every screen was 902, not 900.
    Read text / props from the old node BEFORE removing it (the swap crashed reading a removed text).
  - **Modals hug** (user, 2026-10-16): small modals = HUG content, centred in the 900 viewport at whole pixels (absolute in
    the scrim); scrolled state only when taller than 900 − 48; full-window sheets keep their place and the SCREEN grows.
    Dialog content clipped by a FIXED dialog was invisible in the audit — compare body content height with the body box.
  - Library field defaults leak: search-input instances showed the default „Inline message” helper (Assistive Text on with
    no code message) → sweep visible default texts („Inline message”, „Label”, „Button”…) after every swap. One focus ring per
    screen: an open select keeps the ring, the search inside its list does not. search-input has no „Default + Button=True”
    variant: use Filled + placeholder colour token (library gap).
  - Background under dialogs = clone of the recaptured list page (gh-01) instead of a recapture per block (no html→Figma tool
    in this session); list states with other content (filters open, empty, 2nd tab) = gh-01's table + their own cells;
    an empty state in a scrolled table is centred in the VISIBLE width (wrap 1184 − 2×16), as the code.
  - **Arrows on hidden background nodes**: 5 connectors started on background rows / pagination behind dialogs and sheets
    (rows-per-page select, table cells, „Prelungire”). Before replacing a background, list connector endpoints whose ancestor
    chain contains `Page · …` and re-anchor them to the real control.
  - Off-scale spacing came from capture artefacts, not the code: heading padding 11 (→ 0 + minHeight 48), stack meta gap 18 =
    8 + lost 2 px ::before dot + 8 (→ gap 8 + Dot frames), tag pairs separated by a space (→ 4). Keep code values that are
    print units (A4 page padding 18mm 16mm = 68/60) and list them.
  - Fractions: centred content in odd heights (min-heights 21 / 71), stacked dialogs centred in odd overlays, a 1.58 px (mm)
    cell stroke included in layout, hug labels 146.27 wide. **Never apply text-width fixes with findAll inside instances** —
    my rule hit badge digits / stepper numbers / avatar initials (fixed width → „TM” wrapped). Filter `!id.startsWith("I")`.
  - **Icon colours**: swapping raw icons to library icons brings the icon's default fill. Nested icons are governed by the
    variant (compare with the slot = last id segment); loose icons and glyphs on filled hosts need the code colour (measure the
    svg `color`). The identity card's PJ avatar = library avatar Type=Icon whose glyph is secondary grey on the brand fill the
    card overrides → per-instance white on-colour + 24/suitcase-2 (code). Info ⓘ triggers are not Strict buttons: local
    „Info trigger (tooltip)” 11931:41990 (24, r6, tertiary icon). figma-audit.js now has `icon-colour-vs-code` and
    `message-fixed-height`.
  - Toasts on the board were raw captured frames (green fill, default dark icon) → library `toast` Text-only, tone from the
    captured fill. The section snapshot lived on the removed section's plugin data — store snapshots on figma.root or in the
    repo, never on a node a later step deletes.

- 2026-10-16 · Compact „Modificări nepublicate” notice (code 8dff3f94; the 16/24 dismissible banner 8230:2388 is gone). Notification
  templates page 9628:8241: 14 library info-box (Warning, Close) instances → `Message · subtle` Tone=Warning (9845:17943) on
  02–02d, 03–03c, 04, 04a, 05–05b; Services 442:17492: 10f5 + 10h5 swapped, 8 stale captured banners removed (10e, 10f, 10f1–f4,
  10f6, 10g — the code shows no notice in svc-09e/f/f1–f4/f6/g: nothing pending); Classifiers 8309:67735: 3 raw captured
  „Ciornă nepublicată” frames (03g, 05, 05c) → the same instance. RSSP notices on Services 01l/01p were already instances (HUG).
  - Recipe for a notice with a bold lead: `createInstance()` of the variant, insert at the old index, FILL × HUG, set `Text#9845:5`,
    then `setRangeTextStyleIdAsync(0, lead, <Desktop/Body/Small 500 key 057521fd…>)` — the lead keeps a text style (the Ghișeu
    notices used setRangeFontName → textStyleId "" on both segments). Never touch the icon: it takes the variant colour.
  - Before swapping a banner in every block, check the CODE per demo state (measure.mjs `.message.message--subtle` at 1920):
    stale captures carried a banner in 8 states where the code shows none. A whole-column replace would have kept the drift.
  - The code can show the wrong copy: svc-09h5 (new template) renders „Modificări nepublicate … versiunea — …” because the wizard
    sets `version: "—"` (js/e-permits-shell.js:12005, truthy) → Figma keeps the intended „Șablonul nu a fost publicat încă.” and
    the bug goes to proto-engineer.
  - Editing a note text can wrap it (+20 px) → re-check the column gaps (NT 02 → 02a dropped to 220) and restack.
  - The file index (Start here 10164:1759) had pre-rename page names and a stale count (NT 17 vs 18 blocks) — update the cards
    of every page you touch (count blocks + Status values on the page, keep the range hyperlink when replacing text).
  - swap-to-instances.js now maps captured `message` (banner__icon + banner__content) → Message · subtle (tone by icon, lead → Small
    500) and lists leftover raw notices as unmapped.
  - No Agent tool in this session → figma-audit.js (14 NT notices + parent stacks: 0 findings on the notices; pre-existing: Preview
    frame r28, mixed-font template body, section-header-over-card gap 0) + an instance check on all 19 (main, FILL × HUG, 44 high,
    whole px, icon = variant default, lead styled, no ×, 24 to the next section).

### Research source (2026-10-17): Mobbin MCP
For any „research how other products do it” step, search Mobbin (mcp__mobbin__*) for real screens and flows first; cite the apps and screens. If the tools are not available (not authenticated), say so and use documented guidance (Baymard, NN/g, Material, HIG).

- 2026-10-17 · Ghișeu arrows after the section split (user on 01: „what is the mess with the arrows here?”). Tools:
  tools/figma/ghiseu/arrows/ (fix-arrows.js steps 1–4, connector-audit.js — also stored in figma.root „ghconn/audit”,
  run with `new Function("figma", src + "\nreturn CONNECTOR_AUDIT;")(figma)("<page id>")`; snapshot
  snapshot-2026-10-17-before.json + figma.root „ghconn/snap-20261017”). 59 connectors → 53; 9 markers → 15.
  - **Cause**: split-sections.js moved the connectors to the PAGE with `page.appendChild(c)`; Figma kept their cached
    geometry in the old section space and did NOT re-route them → 45 same-column arrows rendered at page x 0–1400
    (under / over „00 · How to read”), columns 01–11 showed none of their own arrows. Endpoints were all still attached —
    the ids looked fine, only the drawing was stale. Re-assigning the same endpoint does nothing; **flip the end to
    another magnet and back** (`c.connectorEnd = {…, magnet:"BOTTOM"}; c.connectorEnd = real`) to force a re-route.
  - **Prevent**: after ANY plugin move of endpoint nodes (section split, restack, appendChild into another parent,
    section re-spacing) → put same-column connectors INSIDE their column section (section screenshots then show them
    and moves carry them), keep only cross-column ones on the page, force-re-route every connector, then run the
    connector audit (stale-route = connector box not touching its start / end blocks).
  - get_screenshot of a SECTION does not render page-level connectors — one more reason to keep them in the section.
  - **Position endpoints on a block edge have no outward stub**: Figma drew the lane ON the screen border, and a LEFT start
    on a right-side control struck through the whole table row. Column-board rule now: same column = trigger's nearest
    side (centre x < 720 → LEFT else RIGHT) → the target block's SAME side MAGNET (32 px stub = a real lane outside the
    screen); next column = control RIGHT → target LEFT at the trigger's height (straight; clamp [120, h−120]); jog > ~650
    or target above the source → „Board marker · jump” chip (hyperlink NODE → target block) instead of a connector.
  - Markers: block-relative x 1512 (screen + 72, clear of the right lane at +32), y = trigger centre − 14, chips on one
    row stack 36 apart. Column section = 80 | 1440 | 280 gutter → 1800 wide, pitch 1880 (was 1600 / 1680 — chips at
    x 1460 ran 91 px past the section edge). Build-assets section follows the last column.
  - BOTTOM→TOP arrows rot when blocks are inserted between (gh-03a → gh-03e crossed the new gh-03j / gh-03k) — the audit's
    crossing check catches it; side lanes don't have this problem.
  - Lane labels sit at the middle of the lane segment: two arrows in the same lane with similar mid-points collide → move one
    to the other side lane (audit rule label-overlap, also label × marker).

- 2026-10-17 · Retry buttons „Reîncercați” → library Strict (user on gh-10c 11781:30239: „do this a Strict button”; code
  cf7f7ed8 = `btn btn-strict btn-sm`). Strict = button-filled-rectangular `🖌️ Style=Strict, Icon=Leading, Size=Small,
  State=Default` **11607:4195** (black fill, white label + icon). Small buttons use the `🔄 Leading Icon: 16#12863:703` slot
  (the 20 slot is ignored) → 20/rotate-arrow **367:16380** (Foundations; the FO copies had a central stroke icon 7187:48426).
  - Fresh `createInstance()` + `setProperties` + insert at the old index: the variant is FIXED 32 high with 0 vertical padding,
    so `layoutSizingVertical = "HUG"` collapsed it to 20 → keep it FIXED and `resize(w, 32)`.
  - A button nested in a local component instance (system-files-item 10821:38839) can't be replaced: `swapComponent` + props
    left the icon `icon/base/default` (black on black). Fix = copy the vector `fills` from a fresh Strict instance's icon
    (icon/base-inverse/default — the same „fills” override Figma writes on a fresh instance), then check resolved colours.
  - Not the same kind (left alone): footer „Reîncercați” after a failed submit (gh-10b, Primary Large) and the certificate
    modal primary (F8e, button-filled-circular Primary Large).

- 2026-10-17 · PJ icon unified (user on GEAP 11875:272586: „use everywhere the icon for PJ we used till now, not this one”).
  Census: the original FO header `.role-switch-item` (Type=Business, 2009:35824 / 5384:49488, July) + library header-with-avatar /
  sidebar + code static markup = **business**; the Instance switcher (10-15) brought 20/suitcase-2 from the FO data
  (`avatarIcon: icon-suitcase-2`), the quality sweep 24/suitcase-2, the registry tags the central „suitcase, luggage, case”,
  Ghișeu segmented „suitcase-work” filled, RAP 24/suitcase-filled. Swapped: GEAP 7 mains/local + 2 + 14 + 33 + 5 + 14 + 28 +
  22 + 86 (Local, Post-processes, Patterns, Address, Requestor, FO 09, Ghișeu, Services) and 18 oversized 24 → 20; FOD 16;
  EVO Cabinet 14; RAP board (EVO-WEB-3.0) 65; eKYC 0 (its „Clienți” nav suitcase = API clients). Lessons:
  - „The icon used till now” = the OLDEST design-system usage (library / header component), not the raw majority — the
    newest component (instance switcher) had multiplied the wrong glyph into 119 nested copies.
  - **Traversal is not reliable**: findAllWithCriteria returned 634 vs findAll 1,146 small instances in EVO Cabinet, and
    the reverse in GEAP; neither reached glyphs nested in 32 px avatar instances consistently. For a file-wide census use an
    explicit recursive walk through `.children` (descend into every instance that is not the target glyph) — 30,991 small
    instances in 28 s on 8 GEAP pages.
  - Swap order: direct nodes (mains) first, then nested overrides (ids with „;”); keep the old size (resize back) and copy the
    old fill only when the resolved colour changed. A stroke-based old glyph (central outline) leaves `fills: []` + a stroke
    override on the new fill-based glyph → `resetOverrides()` then bind the code colour.
  - Size from the code, not the sweep: identity card avatar 32 + svg 20, header avatar 40 + svg 20, RSUD tile 32 + svg 20
    (measure.mjs) — the sweep's 24 glyph in 32 avatars was oversized. MPower tile still has a 24/identity glyph (code 20; not PJ, open).
  - Update the builders too (swap-to-instances.js `P.suitcase`, instance-switcher prelude / compose guard, ghiseu library-pass /
    swap-ghiseu, rap/lib.js, stored `ghs/libpass` + `ghs/swap`) and the checkbox option's glyph preferredValues, or the next
    run brings the old glyph back. Snapshots: figma.root plugin data `pjicon/*` in each file.
  - No Agent tool in this session → QA by the explicit walk (0 old glyphs; 296 business glyphs, all fills token-bound, white on
    brand / apricot / dark, #444 / #121212 = label colour on grey, whole pixels) + screenshots.

- 2026-10-17 · RAP public registry board (EVO-WEB-3.0 `YrIzksVgFqtPqDd5z9zY5h`, page 20304:64765; 38 blocks, 33 desktop +
  38 phone screens; ids in components.md §7a „RAP — public registry: Figma board”). Lessons:
  - **Spec-driven build beats capture for whole flows**: a CDP extractor of the rendered prototype (`tools/figma/rap/spec.mjs`,
    run with `node --experimental-websocket` on Node 20) → `compact.py` → `payload*.py` → stored runners. Serve the
    COMMITTED code from a git worktree (`git worktree` at /private/tmp/…/rap-head, `python3 -m http.server` as a background
    task — `nohup` died) so half-edited working-tree code never leaks into Figma; `git checkout --detach <sha>` there to follow
    new commits. Give every CDP eval a timeout and write the spec incrementally (one hung state lost a whole run).
  - **Store builders in `figma.root` shared plugin data** and run them with `new AsyncFunction(...)`. A failed `use_figma` call
    rolls back plugin-data writes made in that call too → store big builders in their own call, in chunks.
  - **One heavy block per call**: three A4 document blocks in one call hit the 965 s timeout (they were built — check state
    before retrying).
  - Local „slot” pattern: library modal / Bottom Sheet keep their content slot; the slot is swapped to a local
    `… content · <state>` component (INSTANCE_SWAP prop or swapComponent) — never detach the library modal.
  - `findOne` reaches instance sublayers first → filter own nodes with `!n.id.startsWith("I")`.
  - Strokes on auto-layout rows: `strokesIncludedInLayout = false`, or tags grow to 22 and rows to 57.
  - `resize()` after an AUTO sizing mode makes the frame FIXED → set sizing modes after resize.
  - Two FILL siblings in an odd width give .5 px widths (meta 2×2 grid, mobile footer buttons): set all but the last FILL
    child to FIXED floor(width). Centred texts with odd free space: text FILL + centre alignment.
  - Remove a header field in ALL modal blocks by editing the local content components (Data modal content · <state>,
    Document modal variants) — 18 removals propagated to 32 screens; also patch the stored builder + repo builder + notes.
  - **Board split** (user, via coordinator: one Section per column, like Ghișeu): don't nest column sections in a wrapper
    section — page-level sections `00 · Start here`, `01 · …` in flow order, 80 apart. When splitting: move nodes with
    absolute coordinates kept, re-route every connector (toggle the end magnet and back), same-column connectors INTO
    their section, cross-column ones on the page; a jump that skips a column, goes backwards or jogs > ~650 px becomes a
    `Board / Jump marker` chip (NODE hyperlink) in a 320 px right gutter at block x 1911, centred on the trigger;
    adjacent-column arrows end at `position {x: 0, y: trigger height}` so they run straight. Adapted audit
    `tools/figma/rap/connector-audit.js` (filters connectors named „RAP · ”; the page has older unrelated connectors) → 0.
    Then update the Start here contents (column titles link to the sections) and every note that names a column number.
  - figma-audit false positives on this board: `font-not-onest` „mixed” = Onest 400 + 500 in one text; `tight-gap` on
    section title + grey card (section-over-card rule) and on BO detail cards; `clipped-content` on phone horizontal-scroll
    rows/tables and on screens that cut the page behind a modal / sheet at viewport height (matches code);
    `fractional` on rescaled A4 page previews.
  - No Agent tool in this session → QA = figma-audit.js per section + connector audit + screenshots.

- 2026-10-17 · Code → Figma sync (download icon b523060e + document preview 496e4de1 + small commits). Scripts: tools/figma/sync/
  (download-icons-census.js, download-labels-census.js, download-icons-apply.js + snapshot-download-icons-20261017.md,
  doc-pages-spec.mjs + doc-pages-build.js + doc-pages-spec-20261017.json).
  - **Download / export glyph in Figma = central „arrow-inbox, download” `filled=on, stroke=1.5, radius=2, join=round`
    (key e41040cad8f8622843fba350661894ea6c4823d6)** set through the button's instance-swap property. The GEAP local
    `20/export` (10784:265036) wraps the STROKE variant → on a Primary / coloured button its icon stays icon/base/default
    (dark): the button variant only recolours FILL glyphs swapped straight into the slot. Keep 20/export for the existing
    Neutral icon-only Exportă; use the filled=on variant for every new swap (eKYC keeps its own filled=on stroke=2 export
    glyph — same family). Printer = central „printer, print” filled=off 1.5 r2 (f519c646…), Neutral buttons only.
  - **Census by icon name AND by label**: icon-name census finds wrong glyphs; the label census („Descarcă / Exportă /
    Importă …” texts → the icon next to them) finds labelled buttons with NO icon (FO certificate modal „Descarcă” was
    Icon=None) and app-store links that are not actions. Small buttons show the `🔄 Leading Icon: 16` slot — when the
    20 slot holds the same old glyph the first swap changed the hidden slot only; swap EVERY slot whose value = the old id.
  - Counts: GEAP 41 → export (Document · card mains 6 + their instances, Dossiers 14, Ghișeu 8, FO Full Flows 11, + 2
    certificate buttons given an icon) and 23 Importă / Descarcă din MDocs → 20/upload; FOD 1; EVO Cabinet 4; eKYC 66 SDK
    cells (external-link → export). Drafts / Archive pages untouched.
  - **A4 document pages = local components at real size** („Components · Document preview pages (A4)” 12001:7122 on
    Local components: Paper request p1 12001:7123 / p2 12001:8162, Signed request 12001:8186, Certificate 12001:8247),
    built from a DOM spec read with the page zoom forced to 1 (captures of the zoomed page keep unzoomed text = broken).
    Placed in the canvas as instances `rescale(632/794)`; page heights 893.87 are fractional by nature (declared).
    Scrolled view (page 2 at the top): canvas clip + both pages ABSOLUTE (p1 at y −914) — an absolute auto-layout
    wrapper of the pages rendered NOTHING (1×1 screenshot), plain absolute instances render.
  - The board's stored passes (figma.root „ghs”: libpass, iconpass, pix, pix2, par, replace, layout) still point at the
    pre-split section 11818:21092 → patch the id to the COLUMN section per call (libpass_col / iconpass_col), and the
    stored base screen 11595:321749 still carries the raw gov bar / shell header → run SWAP_SHELL
    (quality-sweep/shell-components.js) on every new block, then RHYTHM (heading 11 → minHeight 48) — skip instance
    internals (`!id.startsWith("I")`) or insertChild throws and the call rolls back.
  - findOne(„frame with Container:margin children”) picked the INNER margin wrapper in one capture → identify the canvas
    by its fill / name, never by a child-name heuristic; verify with a screenshot of the canvas node.
  - Transparent CSS borders (modal-content 1 px top / bottom, the scroll hairlines) stay as strokes at opacity 0 —
    `setBoundVariableForPaint` drops the paint opacity: set `opacity = 0` again after binding or a grey line appears.
  - Pinned actions column (code 2f1eb71d / 086ca562): the sticky cell has a 1 px left border → last column frame of the
    Servicii / Tarife registries gets strokeLeft 1 (border/base/default, not in layout); 16 tables (3 Tarife via mains).
  - Act row Hover variant: pill = background/base/default (white on the grey row), Menu open = background/base/secondary-active
    + Focus ring (code 93dccc56) — GEAP 11846:340996 and FOD 892:11656; fill override on the button instance only, never
    on its icon / label.
  - Fluxuri de lucru identifiers (bc35b464): one line + ellipsis (FILL → textTruncation ENDING → maxLines 1 → vertical HUG).
  - No Agent tool in this session → ran figma-audit rules myself on the 7 preview blocks + the A4 components (remaining =
    the board baseline: background list texts without style, raw 40 % scrims, A4 print paddings 68 / 60).

- 2026-10-19 · Block status badge = the GEAP „Status” component everywhere (In development blue · Not aligned red · Figma aligned green, each a library tag-filled Subtle Small). GEAP's set (10169:188209) is not published, so other files rebuild it 1:1 from the same tag keys (91a965b4… brand, f3ab9255… danger, ea2a973c… success) — EVO-WEB: „Status” 22117:37664 in 🧱 Local Components, used inside „Board / Block label” (22060:5083). Lesson: `clone()` of a variant inside a component set DROPS the text nodes' componentPropertyReferences → every instance switched to that variant shows the default ID / Title; re-bind (`t.componentPropertyReferences = { characters: "<prop id>" }`) and check every instance's text = its property value before reporting.

- 2026-10-19 · eKYC collapsed sidebar (Application Shell 10001:87050 / 87426 + detached frame 8443:123814): the 60px sidebars were the EXPANDED component „sidebar-public-services” (10001:87049, 256 wide) squeezed narrow → labels showed as „D…”. Fix = instance overrides on the narrow uses only (Primary Label hidden, item padding 0, centred), like the code's `.is-collapsed` (icon-only, label in the hover tooltip); the main component stays expanded. Lessons: (1) check a component's own width before editing it from a narrow instance; (2) the MCP runs with `figma.skipInvisibleInstanceChildren = true` — hidden instance layers vanish from `children`/`findOne`; set it to false before restoring hidden layers; (3) a script that throws is rolled back — read the state again before assuming a partial write.

- 2026-10-19 · Act row sync to code (meta 14/20, Small pill, act-menu size 40 / 48) — GEAP 11846:340996 / 11844:340693 /
  11844:198541 and FOD 892:11656 / 890:11545 / 890:11544, screens follow through instances (GEAP 35 rows: Ghișeu 25, FO 09
  F1c 4, Post-processes 6; FOD Requestor P1 / P2 4). EVO Cabinet has NO act row (its Permits page 444:9934 is the older
  table + profile design) → reported, not redrawn. Lessons:
  - **Measure first, with the measure tool of the component** (tools/figma/act-row/measure-act-rows.mjs): it gave every target
    number (row 70 / 154, menu 249×100, items 40, pill 195.2) in one run at 1440 + 375. Headless `mobile: true` is NOT
    `pointer: coarse` → the 48 touch rows don't show in that capture; take them from the CSS.
  - A density change = a new VARIANT property (`Size` Desktop / Touch) on the item set, not per-instance padding: rename the
    variants („State=X, Size=Desktop”), `clone()` each into the set, then copy `componentPropertyReferences` from the source
    children (clone drops them; only direct children — nested instance layers throw). Mobile act row variants set their
    nested items to Touch.
  - `setProperties({Size})` on a HIDDEN nested instance made it visible (all 7 menu slots appeared in the mobile variant) →
    re-apply the visibility pattern after any variant change on nested slots.
  - Menu width that follows its items: menu HUG + items FILL works (Figma hugs the widest child) ONLY when the item label is
    HUG / WIDTH_AND_HEIGHT — a FILL label inside the item gives the item no intrinsic width and the menu keeps its old width.
    Fix the label sizing in the item main AND on every instance (old instances carried a FILL override). minWidth = pill.
  - Item icons 16 → 20: change the set's INSTANCE_SWAP default (`editComponentProperty(defaultValue)`), then map every
    instance override 16/x → 20/x through the property (keys: 20/edit bef76865, 20/cross-small 3ccb9372, 20/copy 89c577ec);
    glyphs without a size prefix (central „pause”) are resized to 20. Icon colour then comes from the variant (no overrides).
  - Variables: `getAvailableLibraryVariableCollectionsAsync` does not list every enabled Foundations collection (the
    lk-e9e8 semantic colours were missing in FOD) → import colours by KEY (text/base/default c37576ba…, text/base/secondary
    5d1a031c…); for sizes pick the collection of a variable already bound on the node (radius-full on the library button
    lives in ANOTHER Sizes collection — comparing against it failed).
  - Section „fit to content” with `absoluteBoundingBox` of the children inflated two sections (FOD 866 → 7742, GEAP 4407):
    use the direct children's relative `y + height` + 80. Check section heights after every Start-here text edit.
  - Edge case to declare, not hack: the browser pill is 195.2 (1 px transparent .btn border each side + 2 px wider text) vs
    Figma 191, so the code's meta box is 4 px narrower and the Ghișeu „Terasa” meta (502 px) wraps in code (row 90) but
    fits one line in Figma (row 70).
  - The item labels in both files were text/base/secondary (#383838) while the code is text/base/default (#121212) — check
    colours of every text you touch against the measured computed colour, not only sizes.
  - No Agent tool in this session → ran the figma-audit rules myself on the 3 components per file: 0 findings except the
    declared meta-dot gap 18.

- 2026-10-19 · eKYC „Filtrare avansată” = the GEAP BO Dosare filter + list tab separators + tab counters 20 (file
  SqMGpRKEppJLcvn7HMzOPR, code 136997d9; ids in the Library table, scripts + README in tools/figma/ekyc-filter/). Swapped on 8 BO
  pages: 98 list toolbars (line), 98 filter buttons, 98 status strips → local „Status tabs”, 10 bars, 8 popovers, ~700 tab
  counters → numbered-badge Large; 6 new blocks S01e1 / S01e2 / S01e3 / S01f1 / S01f2 / S02e1, each desktop 1920 + phone 375. Lessons:
  - **The „missing line” was an invisible effect**: the captured toolbars had the code's `inset 0 -1px` as an INNER_SHADOW but no
    fill — Figma paints inner shadows only on filled frames. Replace with a bottom stroke (border/base/default, INSIDE, not in
    layout). Check a frame's fills before trusting an inner-shadow line.
  - **Two „filter-chip” sets** exist: Components lk-03f6 (9901c458, Mode On/Off, NO trailing chevron) and EVO Design System
    (a2731000, State Unselected/Selected, Icon Trailing, Counter Badge) — GEAP's bar uses the EVO DS one; it imports fine in eKYC.
    Its counter is Medium 18 → set the nested numbered-badge Size=Large (20) per instance; label is 16/24 (code 14/20, library).
  - **Replacing a child of an auto-layout GRID** grows the grid by a row (the insert auto-places into a new row, the old row stays
    empty): after insert + remove + setGridChildPosition, set `gridRowCount` to the used rows — 17 Headers got a 48 px empty band
    before the fix. Moving rows inside a GRID: first move every cell to free rows BELOW the max used row (occupied cells throw),
    then place them; read `gridColumnAnchorIndex` BEFORE appending a clone (append auto-places it and the index changes).
  - Variant values that contain „Popover” / „Menu” trip the audit's dropdown-effect rule on every option → name sizes
    Desktop / Touch (as the act-row items).
  - The open-button focus ring (Focus Ring/Medium spread) renders only with clip ON — set clipsContent on the button variants.
  - Phone list screens with no mobile design in the file: build ONE phone base from library instances + clones of the desktop
    list (gov bar, header, toolbar, chip row, tabs, table, footer as scroll wrappers that clip like the code's overflow) and clone
    it per state; sheets = library bottom-sheet (Header off) with a local „Filter sheet content · <state>” in the Content Slot
    (RAP recipe). Odd header heights (66) centre 32 / 40 px children at .5 → make the title row FILL height and keep the
    header stroke out of layout.
  - Block widths: desktop 1920 + 80 + phone 375 = 2375 → shift every column to the right (and the next section) by 455, widen the
    band + section, then force-re-route connectors.
  - Cloning a desktop block per state + editing rows from the code (rows.mjs) was faster and cleaner than a capture → swap →
    table-fit pipeline: copy existing rows of the same sessions from sibling blocks, edit texts per cell from the code values,
    swap single cells (progress meter) from a row with the same fraction.
  - The eKYC file has no file-level index / cover contents — only per-page „How to read · Contents” (updated on all 8 pages).
  - No Agent tool in this session → ran the figma-audit rules myself on the 8 components and 6 blocks; fixed spacing binds,
    .5 header centring and a cut empty state; remaining = library deltas (chip label 16/24, tab gap 8 vs 6, option gap 10).

- 2026-10-19 · RAP configured act fields — groups + tables (EVO-WEB-3.0, column 04 22069:11262; code 135c5d05; comment
  1968940910). Updated in place (same ids): rap-03g 22088:28501, 03h 22088:29587, 03i 22088:205185, 03j 22088:206895
  (their „Data modal content · <id>” components rebuilt in place → instances follow); new rap-03q 22145:226053, 03r
  22145:227537, 03s 22145:230778, 03t 22145:232827. Builder: tools/figma/rap/act-fields.js (stored „rap”/„af”, ids in
  „rap”/„afids”, payloads „af:D15” / „af:D16” / „af:tables” / „af:pages15”). Lessons:
  - **Rebuild a slot component IN PLACE** (remove its children, refill) instead of the stored upsert (delete + create) —
    every screen keeps its instance, only the screens' heights need a refit (H = max(viewport, modal + 64), overlay = H).
  - **`resize()` after setting an AUTO sizing mode makes it FIXED — hit 4 times in one job** (card line, row card, A4 grid
    row, grid label): rows silently stopped growing and text spilled over the next row. Always: set layoutMode →
    resize → THEN primary/counterAxisSizingMode = "AUTO"; instances already placed keep the FIXED height → set
    `layoutSizingVertical = "HUG"` on them too. Screenshot every new component once before using it.
  - BO table look from library cells: table-header 658ba90a (Subtle → fill background/base/secondary, 38 min, 8/12, text
    Caption/Medium secondary, Sort Icon off, Header/Title FILL so long headers wrap) + table-cell 86cc7c40 (Text; min 50,
    Cell Container HUG 8/12, text Body/Small secondary, numbers RIGHT, pinned first column strokeRightWeight 1, last row
    bottom 0). Row = HORIZONTAL HUG, every cell FILL vertically → equal heights. The box (white, border, r12, clip) =
    the code's own sideways scroll; set `strokesIncludedInLayout = true` on bordered boxes / cards (CSS border-box: 317 /
    222 px like the code instead of 2 px short) — that is not the forbidden 13 px padding hack.
  - Chrome breaks after a hyphen before a digit („dicloro-1,1,1…”), Figma does not (UAX#14 HY × NU) → one cell wrapped to 3
    lines instead of 2. A zero-width space after the hyphen restores the code's break (data stored with it).
  - A swapped NONE-layout component inside a nested slot keeps the slot's old 100 px size and `resize()` on that nested
    instance is ignored → scrolled canvases = VERTICAL HUG wrapper + a fixed clipped „Viewport (scrolled)” frame holding
    the absolute pages at the code's scroll offsets.
  - `clone()` of a block on a page-level section puts the clone on the PAGE, not in the section → appendChild into the
    section before restacking (layout() only sees section children; it reported 16 of 20).
  - Code finding (reported, not hacked): number headers are `white-space: nowrap`, so „Potențial de distrugere a ozonului
    (ODP)” overflows its 160 px span; Figma draws the intended 2-line header (48 instead of 38).
  - Coordinator side task: „Subdiviziune” → „Subdiviziunea autorității” filter labels — census by explicit walk found 0
    (the designer's „Table and Filtering” already reads „Subdiviziunea autorității” ×3; the RAP facets are Statut / Denumire
    act / Autoritate / Tip beneficiar); detail rows „Subdiviziunea” left alone as asked. findAllWithCriteria returned 0 texts
    containing it while the walk found 29 → census with a walk, always.
  - No Agent tool in this session → QA = the stored figma-audit („rap”/„audit”, run as `new AF("R", src)(roots)`) on the 8
    blocks + 20 components: only the board baseline (section-over-card / BO-row tight-gap, profile behind the modal cut at
    viewport height, rescaled A4 pages fractional, scrolled viewport clip); fixed the one real finding (A4 head texts at .5
    → FILL + centre). Screens compared with the code captures (persona-test/capture.mjs + a CDP DOM spec per state × width).

- 2026-10-19 · eKYC profile tabs 48 → 40 (user-approved; code .e-permits-page-header__tabs). New local set „Profile tabs” 10835:1715
  (Tabs Count 2–9, library tab-item-s, Track line) on 🧩 Local components (group title 10835:1388). Replaced 111 strips (library
  „tabs” 102 + 9 raw „Tab List - Dossier sections” frames of .tab-item-md): Dashboard 2, Sessions 22, Review 26, Audit 9,
  Clients & Organisations 6, Cases & Scoring 25, Providers 7, Administration 14 (Application Shell 0; no phone profile screens).
  Selected tab, labels, counters (value + style), the first tab's icon (page-text / face-id glyph as it was) all carried over.
  Tools + README: tools/figma/ekyc-profile-tabs/ (measure.mjs, component.js, swap.js). Lessons:
  - **Only blocks whose screen HUGs shrink**: Body minHeight 992 keeps short screens at 1024 and „fit” captures have FIXED
    Containers → 29 of 111 blocks got 8 px shorter. Column rule done generically: for each shrunk block, every direct section
    child under it whose x-range overlaps moves up by the shrink (gaps stay identical); verify with a pairwise column-gap check.
  - **Absolute Flow anchors**: the ones over FLOW content below the strip move with the content (−8), but anchors over a modal
    / drawer button inside an absolute Overlay must NOT move — the overlay is stretched to the screen and the modal keeps its
    place. I shifted 8 of them by mistake and restored them; verify anchors by matching their centre to the nearest instance of
    the same size (d = 0), not by eye. swap.js now skips anchors whose centre is inside an absolute child > 300 high.
  - Connectors that started on ONE tab of a raw strip (Audit R05c: 4 tab arrows + R05j 1) lose that precision when the strip
    becomes one instance — add a Flow anchor (eKYC main 10527:118227) over the tab (absoluteTransform delta to the screen) and
    re-attach connectorStart, magnet RIGHT.
  - The library „tabs” has no size variant (tab-item-md only) — a 40 strip = a local set of tab-item-s, like „Status tabs”.
  - Code vs Figma deltas left as declared library gaps: tab gap 8 (library) vs 6 (code). Pre-existing: Review „Revizie” tab shows
    the page-text glyph while the code uses icon-face-id (only a 24/face-id exists in Foundations) — reported, not changed.
  - „How to read” texts grew by two lines and touched „Page contents” (40 gap) → after appending a dated line, re-stack the
    How-to-read section children (keep 40) and refit the section.
  - No Agent tool in this session → ran the figma-audit rules myself on the set + 4 headers (0 findings) + a column-gap check on
    all 8 pages (0 overlaps / gaps < 40) + the anchor check (10/10 d = 0).


- 2026-10-19 · „Temeiul reprezentării” on FO 09 „Date solicitant” (code e10e5394; user pointer 11858:24176 = the Ghișeu gh-03 card,
  component `Authorization card (FO)` 11861:7142 — MPower 11861:7112 / RSUD 11861:7140). Changed: `Requestor` variants
  PJ/None 2213:4912 (new group 12059:2575), PJ/MPower 2223:11874 and PF/MPower 4802:55033 (old „Împuternicire MPower aplicată”
  title + raw card → „Temeiul reprezentării” + card instance) → FO 09 F2e / F2f / F2h / F2i desktop and FOD Pattern › Requestor
  C2 / C3 / C4 follow; mobiles F2e / F2f (role area rebuilt 12060:1777 / 12060:1902), F2h (group 12059:353032), F2i (card
  12059:353084). Lessons:
  - **The pointer can live on another board**: the node the user named was the Ghișeu desk-filing card, the job was FO 09. Walk
    the pointer's ancestry first, then find the target screens by the COMPONENT (the same card set), not by the board.
  - **FO 09 desktop „Date solicitant” = instances of the FOD `Requestor` set** (page ↳ FOD Pattern -> Requestor 2210:20269;
    variants Applicant type × Representation mode). A role-area change is a VARIANT edit (census `getInstancesAsync` per variant
    first: here FO 09 + FOD C1–C5 + 17 MSupport PF/None uses). PJ / None = own company = RSUD basis; PF / None = no block.
    Mobiles are raw frames per screen — edit each, and check them against the desktop: F2e / F2f mobiles showed one wrong
    „Anastasia Cojocaru · IDNO” card and no Reprezentant, F2h mobile the wrong company; rebuilt from the F2h mobile role frame.
  - **A component built for one width breaks at another**: the card was made for 768 (Ghișeu) with FIXED meta parts
    (168 / 200 / 150) and a NO_WRAP meta row → a longer grantor overlapped the next part, and at 343 the row would run out.
    Code = `flex-wrap`, row gap 6, part gap 4 → Meta WRAP + counterAxisSpacing 6 (spacings/6), parts HUG, texts
    WIDTH_AND_HEIGHT. Heights then equal the code exactly (desktop 78, 375: RSUD 104, MPower 130). Screenshot the instance with
    REAL data, not the main's defaults.
  - The meta parts had gap 3 (off-scale, code 4) — `figma.teamLibrary` → Sizes collection → `spacings/spacing-4` import by key.
    GEAP binds spacing from TWO Foundations collections (8ee1… and fd53…); both are accepted, prefer the one already bound on
    the neighbours.
  - PJ identity cards on phone screens: clone an existing PJ `Identity card · selected (FO)` (avatar Type=Icon + 20/business,
    e.g. 11875:272490) instead of the initials avatar; MPower tone = copy the desktop variant avatar's fills (avatar + glyph).
  - Column F2 pitch is 400 (not 240) — measure the existing gaps before a restack. No connectors touched the moved blocks.
  - Block „Prototype ↗” links on F2e–F2i all pointed to the generic svc-07 → set to fo-02 / cat-04a / cat-04. F2 („Individual”)
    still links fo-02, which is the PJ state — open.
  - No Agent tool in this session → figma-audit rules run by hand on the card set, the 3 groups and the 4 mobiles: fixed
    gap 3 → 4 + binds; left: `tight-gap` on the mobile screen roots (header + content, gap 0, pre-existing).

- 2026-10-19 · EVO Cabinet „Actele mele permisive” rebuilt from the code (file iitScYOwMYjDayuyrm3750, page ↳ Permits
  444:9934; 18 blocks × desktop 1440 + phone 375 in 5 column sections + `00 · Start here`; old designs moved into
  `Archive · before 2026-10` 1060:1053; 38 local components on the new page „🧱 Local components” 1050:2252; builders
  tools/figma/cabinet/ + README). „Solicitările mele” + Notificări NOT rebuilt yet (page ↳ My requests unchanged). Lessons:
  - **Spec-driven build beats capture for a board that shares the RAP / GEAP patterns**: CDP spec (spec.mjs) + a stored
    prelude (`cab`/`lib`, = rap/lib.js) + stored builders (`cab`/`screens`) → one block (desktop + phone) per call, 30–90 s.
    Measure each new pattern once with a CSS outline (m2-style: box, padding, gap, radius, bg, font) before building its
    component — heights then matched the code to the pixel (rows 70 / 126 / 154, profile 1246, confirm 356 / 528).
  - Files don't share local components: the Act row family was rebuilt 1:1 from a read-only DUMP of the FOD copy
    (892:11656 — sizes, paddings, bound variable names, text styles) instead of the outdated build-act-row-copy.js.
    Cabinet additions: Desktop 1024, 4th meta part „Subdivision”, `Show extra tag` (Aprobare tacită), `Show action`
    (rows with nothing to start have no pill), State=Paper (Info notice, no pill), `Break before subdivision`.
  - **Forced line break in a WRAP row**: a FILL item does NOT start a new line (it shares the line's leftover); a hidden-by-
    default FIXED-wide (1200) ~0-high frame before the item does — then the item FILL takes the whole next line and its
    text wraps (code: long subdivision on phones). Height can't be 0 (floor 0.0001 → screens 1946.0002, declared).
  - Long titles in hugging rows: after the instance is placed, measure title + tags vs the row; only then title FILL +
    ENDING + maxLines 1 + vertical HUG (fitRow). Sizing overrides on instance sublayers work; `resize()` does not.
  - tag-filled has NO `Warning` style: amber = `Accent` (styles Neutral / Muted / Accent / Success / Brand / Danger).
  - `figma.createConnector()` is FigJam-only — in design files clone an existing connector (archived 456:3490 here) and
    restyle (brand variable stroke 3, ELBOWED, ARROW_LINES). Same-column arrows in the section (side lanes), cross-column
    ones on the page, column skips = local `Board / Jump marker` with a NODE hyperlink.
  - Library pieces that needed care: pagination arrows = button-text-rectangular; `Icon=Only` keeps the old FIXED width →
    set HUG (the icon-only variant is 20 wide, nested width can't be raised to the code's 44 — declared). Breadcrumbs
    Mobile has no Label prop → set the visible TEXT. Library modal: header title only (subtitle goes first in the
    swapped content component, indented 12 to the title), `.content-slot` swapComponent → local „Act view content · <id>”,
    footer `Actions=Horizontal Stack` then swap the nested „Secondary/Primary Button” to button-filled-circular.
    `.top-section` set is not importable by key → reach it through a header-evo-desktop instance's nested main.
  - Avatar Icon instance: `findOne(INSTANCE)` returned the hidden Notification Badge and I swapped IT to the PJ glyph →
    pick the glyph by name (/person|20\//) among `children`.
  - Icons can't be `isExposedInstance` (no nested props) → use an INSTANCE_SWAP component property.
  - A failed call rolls back plugin-data stores too: store long builders in their own call, then run them (I lost one
    11 KB store to a test that threw in the same call).
  - Tall dialogs: never clip — the overlay helper grows the screen (`minHeight = dialog.y + h + 32`) and resizes the scrim;
    the A4 viewer keeps its scroll viewport (pages are complete components, scaled 0.79 in a clipped canvas = the code).
  - Concurrent code: css/modal-phone.css (phone dialogs → bottom sheets, 16 top gap) appeared in the working tree, not yet
    wired into cabinet-evo → phone modals drawn as the committed code (centred 338 card / confirm bottom card); revisit.
  - No Agent tool in this session → ran the quality-sweep gate audit (gate-audit.js rules) on the 18 blocks: fixed
    „Chip row…” names (raw-control false positive) and two .5 pager positions; left = intentional clips (chip rows that
    scroll, phone viewport behind sheets / dialogs). Components check: 0 unbound colours, 0 unstyled texts after fix.

- 2026-10-19 · Phone dialogs → „Modals on phones” (code 48c7f0cb, css/modal-phone.css) in 4 files. EVO-WEB RAP column 04: 10 library-modal
  phones (rap-03, 03g, 03h, 03i, 03j, 03q, 03r, 03m, 03n, 03o) + their 10 „Data modal content · <id> · Mobile” mains (338 → 375, bottom 24 → 16),
  „Document modal (MDocs act)” Mobile variant 22089:209130 (788 → 796, body 0, canvas 8 / r0, footer 12/16/16, halves 167/168) + 10 „Doc canvas ·
  <id> · Mobile” (311 → 359 pages, gap 12; 03t scrolled viewport rebuilt at the code offsets), filter sheets rap-01b / 04a / 04b / 04c (radius
  24 → 16 token; 04c = `.is-all` → 796 at 16). Cabinet: pp-01m / x / y (same routine), pp-01z (library modal holding the A4 canvas → 796 full
  height, canvas edge to edge), Confirm modal Mobile variants 1066:1011 / :1026 (412 = code), pp-01s sheet (radius was 0 → 16). GEAP: F3r
  (stacked, 404), F4a–F4d / F4g picker (Main Frame 374 → 375, hidden „Anulează” shown), F8d / F8e certificate (raw close → library
  button, header subtitle with the dossier number hidden like the code), FOD Requestor G8 (372 = code). eKYC S01e1–S01e3. Lessons:
  - **The library modal on phones is a remote set** (EVO-WEB 22087:27587, Cabinet 1071:8314) → fix per instance with ONE routine
    (scratch libmodal.js, inlined per call): modal 375, bottom radii unbound → 0, header p16/16 + gap 8 + Heading Container FILL, content
    instance FILL (+ its local main resized 375 and padded 16), footer Horizontal Stack, then H = max(812, 16 + modal) and modal.y = H − h.
  - **Footer button size lives in the FOOTER variant, not the button**: setting the nested button `Size=Medium` kept 48 (the footer main
    fixes the child height; HUG collapsed it to 20; `resize()` on nested instances is ignored). Footer `Size=Small` gives 40 buttons — but it
    swaps them to ANOTHER button set (Primary / Strict / Destructive, no Neutral) → `swapComponent` each to the Medium variant of the set the
    desktop footer uses (EVO-WEB 22069:184501 Neutral-Leading-Medium), then re-set label + icon props. Record labels / icons BEFORE any variant change.
  - Equal halves inside a library footer instance stay 167.5 (= the code); `minWidth` / `resize` can't be overridden on nested instances →
    declared. In local components / raw frames: first child FIXED 167, last FILL.
  - `setBoundVariable(k, null)` before writing a raw radius / padding on a bound instance property, else the token wins.
  - `findOne` by a layer name with diacritics failed („Subtitlu”) → pick by type among the frame's children.
  - Library spacing / radius tokens import by key in every file (Foundations „3. Sizes”): spacing-0 09bbd360…, -8 69ac88e4…, -12 ee4801fe…,
    -16 22028a11…, radius-0 a3519aab…, radius-16 5e0761c5…; H4 text style imports with `importStyleByKeyAsync("6437d483…")` (GEAP's local
    id string failed).
  - Measuring: a small CDP probe (selector → rect / padding / radius / gap / scrollHeight) per state answered every number; filter by the
    ACTIVE overlay (`.modal-overlay.is-active > .modal`, `[data-…-modal] .card`) — the page keeps many closed modals with real rects.
  - After height changes: restack the column from an ordered list (EVO-WEB 04 had drifted gaps 294–552 → 240), refit the section, check the
    connectors' endpoints (all magnet RIGHT → they follow).
  - No Agent tool in this session → gate rules run by hand (mini gate-audit) on every changed overlay + component: only the declared baseline
    left (rescaled A4 pages fractional, scrolled A4 viewport clip, page behind the sheet cut at the viewport, .5 spinner centring); fixed the
    certificate heading without a text style.

- 2026-10-19 · FO header — long service name „Mai mult” / „Mai puțin” (code 25a6bb77, js/name-expand.js; demo pp-18 / 18a / 18b / 18c).
  New: `FO header · service title` 12089:8112 + `Name expand · toggle` 12088:8094 (ids in the Library table); blocks on ↳ FO ->
  Post-processes, column 04 (Band 04 · Service 10, after block 11): 11a 12107:12287 (pp-18, desktop with hover + library tooltip, phone),
  11b 12107:12458 (pp-18a), 11c 12107:12629 (pp-18b, phone only — scrolled viewport), 11d 12107:12800 (pp-18c). Arrow „Mai mult”
  12107:275034 from a Flow anchor over the phone toggle → 11b. Columns 05 / 06 shifted +488 (block 1935 = 1440 + 120 + 375), Band 04 → 1935.
  Phone headers: FO 09 37 screens (steps 2–6), FOD Pattern › Address 25, Post-process Mobile 8440:119437 → `Show draft status` on +
  Short title → header 110 → 126 like the code, progress row right under it (step 1 and Finalizare stay 110: code has no draft line there).
  Lessons:
  - **The code's bug was not in Figma**: no Figma phone had the progress bar over the header (census by „Pasul X din Y” text → its row →
    any visible node crossing the row top: 0 on FO 09 52, FOD Address 25, Requestor 19, FOD file 19). The real drift was the MISSING
    „Salvat ca schiță” line on every step 2–6 phone (desktop showed it — desktop = mobile content). Measure the code per step first
    (probe: fo-02 108, fo-03…fo-07 126, fo-08 108) and apply by step, not blanket.
  - **A component property on the shared mobile header instead of per-screen edits**: hidden-by-default row + BOOLEAN on the main
    (no visual change anywhere), then per instance `setProperties({Show draft status: true})` + nested `TitleContainer.swapComponent()`
    to the new title — read the old title text BEFORE the swap (overrides on the old nested main are lost) and set it via the TEXT prop.
    Screens with a FIXED height grew by script only when their flow content overflowed (F4g 1269 → 1285); 812 viewports behind a
    modal keep their cut on purpose. Column gaps stayed ≥ 100 (each block grew 16 at its own bottom — no cumulative shift).
  - **Inline „after the last word” in Figma**: an instance can't flow inside a text → expanded variant = VERTICAL [„Name · lines” FILL
    wrapping] + HORIZONTAL row [„Name · last line” HUG + toggle, gap 8]; the split is the code's real line break at that width
    (measured 1440 / 375). Collapsed = text FILL + ENDING + maxLines 1 → text widths matched the code to the pixel (777 / 261).
  - **Variant TEXT defaults are set-wide**: writing `characters` on a main's text bound to a property rewrites the property default for
    every variant (my Short text leaked into Long collapsed) → set defaults with `editComponentProperty(…, {defaultValue})` and let
    instances carry the per-state text.
  - `swapComponent()` to another variant keeps nested overrides by layer name → the Hover state of the toggle survived into the
    expanded clone („Mai puțin” underlined). Reset nested State after every swap.
  - **html→Figma capture broke today** (selector captures landed as 0-wide frames; `--selector main` captured the demo index, not
    the state) → don't fight it: the FO address has a spec pipeline (tools/figma/extract-fo-address.mjs → build-fo-address.js) that
    builds „Address · fields” from library instances in one call; the rest = clones of the nearest blocks (block 11 / 10a desktops,
    C04 phone) with raw captured fields replaced (label frame + select → select-input with its own Label + star; captured checkbox
    row → checkbox-label Small). Lower sections of 11d are `FO / Context · skeleton` (11258:17226) — declared in the note.
  - Builder gotchas: 3 equal FILL fields in 343 / 768 give .67 widths → first two FIXED ceil (104 / 235), last FILL; a „last child FILL”
    rule also stretched a 2-field row (Apartamentul 501) — only FILL the last one when the row really has the leftover; the clone of a
    captured desktop keeps hidden leftovers (Step indicator „Container” at y 431) that audits walk into → delete hidden captured nodes.
  - Small PNG crop tool for comparing screenshots without PIL / ImageMagick: scratch crop.mjs (zlib inflate → unfilter → re-deflate);
    `sips --cropOffset` is ignored (always centres).
  - Declared deltas: library tooltip Small (14/20 + arrow, 124 high) vs the code's plain tooltip (12/16, no arrow, 72); expanded desktop
    bar 106 + the header's 1 px stroke vs code 107; board conventions kept (1280 header container, Beta banner hidden, phone header
    „Ro” chip + initials avatar, time 19:40). The new set is GEAP-local → FOD sees it only after the GEAP library is published.
  - No Agent tool in this session → gate-audit („qsweep/audit”) + figma-audit („ghs/audit”) on the 4 blocks, 2 sets and the Header
    main: 0 raw controls / unbound colours / unstyled texts / fractions after the fixes; left = 11c viewport clip (intended), phone screen
    root gap 0 (board baseline), Header main avatar Type=Image (pre-existing).

- 2026-10-20 · Three PO fixes (code 26987135 / 019aa9b6). (1) Passport tabs: „Tipuri solicitări” → „Tipuri procese”, „Clasificatoare
  specifice” → „Clasificatoare” — the passport page already had 0 left (235 „Tipuri procese” texts across sections 01–11); the
  leftovers were OUTSIDE it: the `Main Navigation` main 9442:44686 on 🧩 Local components (its own Tab · Request types / Tab · Specific
  classifiers), App Shell 03 / 03a / 03b (15 tab labels + field rows), Notification templates (17 „Clasificatoare specifice”), and
  the hidden helper spec text 10648:1502. (2) Dialog detail rows: `svc/field-row` 9521:8731 became the set **12143:21330**
  (Context = Page 256 · Drawer 200 · Modal 163 · Modal · narrow 147 — code `clamp(120px, 32%, 200px)` inside [role=dialog] / .modal,
  measured: modal row 510 → 163.2, drawer row 720 → 200). 132 direct instances switched (Services modals 50 + drawers 23, Tariffs
  drawers 47, `Modal content / Document · details` 11366:6892 12 rows, Statement certificate contents 8) → 116 nested modal rows
  (Dossiers 04h–04l, FO 09) follow; raw captured `dosar-profil__row` rows in drawers / modals narrowed by hand (Services 09 ×4,
  10 ×13, Classifiers 02f ×11), labels wrap. (3) „weird padding 165” on 10797:269374 = 15 `section-heading · with action` wrappers in
  Services column 01: the svc/section-heading kept paddingRight 165 (= the 149 „Resincronizează” button + 16) from when the button
  sat ABSOLUTE over the heading; once the button became a flow sibling the reserve stayed → the „Ultima sincronizare…” meta floated
  165 px left of the button. Fix = heading pR 0 + wrapper gap 12 (spacings/12) → meta 12 px from the button = code
  (.e-permits-passport__heading-tools gap 12). Lessons:
  - **A component → variant set without losing instances**: clone the standalone component (clones keep property definitions +
    references), resize the clone's parts, `figma.combineAsVariants([orig, ...clones], parent, index)`. All 1,147 instances stayed
    linked to the original (now `Context=Page`), property values identical (10 sampled), keys renamed to the set's ids (#12143:x) —
    look props up by name prefix, never by the old #id. Then switch only the instances that need it with `setProperties({Context})`.
  - **Variant swap on a row INSIDE a component's main loses the overrides that instances of that component made on its nested
    instances**: the 04l modal (instance of Document · details) had its own override on the row's Tag 1 („Semnat electronic”, Brand,
    signature icon) → after the main's row switched variant, the instance showed the tag default „Persoană fizică”. Audit nested
    tag labels against the variant defaults after any variant switch (1 hit here) and re-set them with setProperties.
  - Prefer ONE component with a context variant over per-instance width hacks: instance sublayers can't be resized, but a variant
    can carry a different FIXED label width.
  - Renames: census by walk with `skipInvisibleInstanceChildren = false`, match the EXACT label (`^Tipuri solicitări$`) — the
    loose regex also caught „Tipuri solicitanți” (15 applicant-type rows) and a sentence in a helper JSON; check the Local
    components page (mains with their own text) and other boards that embed the same strip (App Shell tab-scroll demos).
  - Page-wide finds on the Services passport page drop the transport even when read-only → one call per 3–6 sections; Notification
    templates and Classifiers walks were fine in one call.
  - How-to-read restack: some boards have extra `Rule · …` cards between „How to read” and „Page contents” → re-stack ALL section
    children by y with 40 gaps after appending a line (the first naive „gap to next” check reported −8 on Services and Dossiers).
  - Classifiers has no How-to-read section (only bands) → no dated line there; the file index got „Updated: 20 October 2026” and a
    sentence on the Service configuration / Case profile cards.
  - Board baseline seen, not changed: in modals the code row is 40 (8/0/7 + 1 px border) vs svc/field-row 48–49 (12/0/12); the
    raw captured rows in drawers are frames, not svc/field-row instances.
  - No Agent tool in this session → stored figma-audit (`ghs/audit`, `eval` then `fn(roots)`) on the set, Document · details, the
    04l overlay, the Services heading wrappers / raw rows and the Classifiers rows: 0 findings except the A4 preview baseline
    (scaled page fractional + clipped in its scroll viewport, row list gap 0).

- 2026-10-20 · Trajectory („Traiectoria dosarului”) = ONE component in all four files (code bc6e5eff). GEAP step set 9696:556 upgraded IN
  PLACE (renamed „Trajectory · step”, Tag → Label, Layout property, Attention / Skipped, 7 vertical variants) + new „Trajectory · connector”
  12155:272677; 24 dossier cards: 120 raw connector frames → connector instances; FO 09 F8 / F8b / F8c / F8d / F8e (desktop horizontal,
  phone vertical tracker + „Statutul dosarului”) and Post-processes 10f / 12a / 14b / 16a rebuilt from the component; eKYC 29 cards (Sessions
  9, Review 18, Audit 2 — the remaining „Numbered List” frames are event logs, not trajectories), FOD G7d (4 cards), Cabinet ↳ My requests
  (5 profiles × desktop + phone + Completion → Online Payment). Heights equal the code (130 / 92 / 282 / 216 / phone 318 / 330 / 218). Lessons:
  - **Upgrade a set in place, never rebuild-and-swap**: clear each variant's children and refill them with layers bound to the SAME property
    ids → every instance keeps its values (snapshot of 144 instances in shared plugin data, compared after: 0 diffs). Renaming a TEXT property
    with `editComponentProperty(key, {name})` keeps the values too. New variants = `createComponent()` + `set.appendChild()` + name „A=x, B=y”.
  - `componentPropertyReferences` throws „Can only set component property references on symbol sublayer” on a node that is not yet inside
    the component → append first, bind after (bindTexts pass at the end of each variant build).
  - The component holder frame (🧩 Dossiers · components) is auto-layout: x / y are ignored → place new sets with `insertChild(index)`.
  - Dashed ring from a library icon: `dashPattern` on the vector looked SOLID because the vector's caps are SQUARE (each dash grows by the
    stroke width) → `strokeCap = "NONE"` + [2, 2].
  - Vertical pill that grows 4 to the left (code margin-left −4): a `label-holder` HUG frame with an ABSOLUTE rect at x −4, w + 8, constraints
    STRETCH / STRETCH, behind the label — it follows label overrides in instances; no negative padding needed.
  - The code's vertical step without meta is 26 + 24 (empty grid row + row gap), not 22 + 24 → content minHeight 26 makes the Figma pitch 50 = code.
  - A connector that must sit beside the text column (vertical) lives INSIDE the step (rail = marker + exposed connector instance FILL, 8 / 8
    padding) with a 24 tail bound to `Show line`; the last step turns both off. Horizontal connectors stay separate instances between steps.
  - Equal FILL connectors give fractional widths (122.2) → audit `fractional`. snapRow: all but the last FIXED base / base+1, last FILL (still
    responsive, whole pixels). Marker x 26.5 inside odd-width steps remains (centring over the label, same half pixel in the code) — declared.
  - One builder, four files: store `(() => { …; return TRAJ; }).toString()` in `figma.root` shared plugin data and `eval` it per call; patch the
    stored source with string replaces instead of re-pasting 17 KB. Imports by key (Foundations e9e8 variables / styles / icons, tag-filled
    a97109f9…) worked in eKYC, FOD and Cabinet.
  - **Check the screen's hug chain after content grows**: FOD G7d's phone Main Content was FIXED → the new vertical tracker overflowed 202 px
    under a clipping screen; desktop Container FILL in a FIXED Section hid 26 px. Walk up from the card and set HUG where content > frame.
  - Column rules: F8 column restacked at 240 (blocks +252 for the phone tracker), Post-processes column 12a → 13… moved +16 (gap 200 kept),
    eKYC blocks that shrank 16 (146 → 130 cards) moved their column up 16; gap check 0 overlaps.
  - Code deltas reported, not changed: Foundations `pause` (two wide bars) vs the code sprite `icon-pause` (2 px bars) — proto-engineer should
    pick one; demo dates differ (dos-01 code „8 / 9 iul.” vs Figma „5 / 8 iul.”); Cabinet ↳ My requests is still the old design (desktop
    horizontal stepper in a card, no „Stadiul solicitării” status card; Draft profile has no stepper; hidden legacy „Frame 1261156234”
    steppers left hidden); pp-17a has no Figma block; eKYC and FOD have no file-level index (Cover only).
  - No Agent tool / MCP resource reader in this session → stored figma-audit (`ghs/audit`) on GEAP set + 11 cards (0 after snap, except the
    declared marker half pixel inside the set mains) and an inline mini-audit (fractional / unbound colours) on every card in eKYC, FOD, Cabinet: 0.

