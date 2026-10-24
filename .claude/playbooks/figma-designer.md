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
| header-evo-desktop / -mobile (lib sets) | `11077:1058` / `11153:1253` | imported; mobile used inside `Cabinet / Antet mobil`. **EVO site header = Components doJ7tDY0PlQ0PqMgbpFVIC 912:18991 (desktop set ef41893a…: 1248px Anonymous 2977f6f3… / Authenticated 28bbd8f8…) + 1210:5257 (mobile set e0e8b836…: Default Anonymous aa2d4163… / Authenticated 1dd7a663…)** — RAP = Anonymous, Cabinet = Authenticated, phones show search + ☰ (2026-10-22) |
| search-input-rectangular | `9285:37474` | State Default/Filled/Focus…, `👁️ Clear Button`, `⌨️ Placeholder` |
| filter-chip | `1244:34029` | Mono Selection; `👁️ Counter Badge` + „Badge label” text; Filtre = Icon Leading + 20/filter (key d7ef1839…) |
| contextual-menu / selection-menu | `9646:4478` / `9625:34945` | ≤ 6 options each; items `.menu-item-action` `62:4943` (Leading Element=Icon for icons) |
| pagination-item | set `212:7429` | Type Selected/Unselected; pager arrows = button-text-rectangular Strict Icon=Only + `🔄 Leading Icon: 20` = 20/chevron-left/right |
| tooltip / toast / banner / info-box | `275:24285` / `10038:35031` / `10582:50841` / `5611:64071` | imported 2026-10-12 |
| date-input / checkbox-label | `244:20250` / `1228:33646` | date: Label + Assistive Text props; checkbox: Mode Checked/Unchecked |
| Modal (local) | `10136:657` | Tip=Confirmare (Titlu, Mesaj, 2 btns) · Tip=Conținut (Titlu, Subtitlu, `Conținut` INSTANCE_SWAP)  **Content default = `Modal content / Body` 12698:438587** (2026-10-24, local-components-page-v2): Spacing 0 / 16 / 24 × Height Hug / Fill (Fill = Type=Selection lists, clip on), native SLOT `Content` — build the state's fields / lists / cards INTO the slot; never a new „Modal content / <state>” component. Preferred values = Body + `Modal content / Document · details` |
| EVO Cabinet local components | frame `11100:288632` on FO Full Flows 09 | `Cabinet / Antet` 11100:289066 · `Cabinet / Antet mobil` 11153:262259 · `Cabinet / Dosar card` 11100:289564 (+ mobil 11155:50155, static 11152:303548) · `Cabinet / Serviciu card` 11105:290265 · `Cabinet / Marcaj` 11100:289209 · `Cabinet / Meniu acțiuni` 11118:297930 · `Cabinet / Meniu · Sortează` 11118:293504 · `Modal conținut / Filtre solicitări · …` 11152:303710 / 304028 |
| Instance switcher (local, 2026-10-15) | GEAP set `11536:8013`, menu `11535:6128` | header trigger FO/BO × Desktop/Mobile × Default/Hover/Open; menu = native SLOT „Content”; items profile `11532:7890` / role `11532:8016` / more `11532:8125`; FOD set 839:11429, Cabinet 1014:7391; builders tools/figma/instance-switcher/ |
| Effect style „dropdown-effect” (2026-10-16) | GEAP local `S:fc1dad56be71b69894b7f3586befb682c9a2f5fc,` | every menu / dropdown / popover surface; NOT published → FOD + EVO Cabinet use it by id `S:fc1dad56…,5088:9` (getStyleByIdAsync; importStyleByKeyAsync fails); eKYC has a local copy `S:2c6b167d…,` (same effects). Radius tokens: radius-12 1f226805…, radius-16 5e0761c5… |
| eKYC library-gap pieces (local, 2026-10-16) | eKYC `10775:1049` / `:1055` / `:1059` / `:1063` | Switch · label (code A.renderToggle) · Filter option · tag (status facets) · Media badge · duration (video thumbnails) · Field label (label + 12/asterisk + hint for non-field controls). Exposed nested switch / checkbox / tag. Builders: tools/figma/ekyc-qa/ |
| Section header + action (local, 2026-10-16) | set `11745:301869` | Breakpoint Desktop/Mobile; exposed `Heading` (svc/section-heading 9521:7915, now H5 18/26, minHeight 48) + `Action`; props Meta / Show meta. Normaliser for existing rows: tools/figma/section-heading-action.js |
| Act row family (local, 2026-10-16; sizes 2026-10-19) | GEAP `Act row` 11846:340996 · `Post-process menu` 11844:340693 · `Post-process menu · item` 11844:198541 (State × Size: **Desktop = the one dropdown item 32 · 6 12 6 8 · 14/20 500 · icon 20** (2026-10-20); Touch variants deleted 2026-10-20 — phones use the „Act post-process sheet”) · `New request card` 11848:340913 (was holder 11844:198504; since 2026-10-24 Act row → section Table & list 12645:8469, menus → Menus & tooltips 12645:8490, New request card → Cards & details 12645:8478) | GEAPActRow.html. Meta = Desktop/Body/Small 1f355410 + text/base/secondary 5d1a031c; pill = library button-filled-circular Neutral Small, paddingRight overridden to spacings/12 (code 0 12); menu p8 g4 r12, HUG width, minWidth = pill (191), items FILL, label Desktop/Body/Default 500 e069d3c3 text/base/default, 20 px icons. Act row: State Default/Hover/Menu open/Locked × Screen Desktop/Mobile (Mobile menus use Size=Touch); TEXT Title / Number / Validity / Authority, BOOLEAN Show validity / Show authority; exposed Status (tag), Action (button), Menu (7 item slots), Notice (Message · subtle Warning). FOD copies: Act row 892:11656, menu 890:11545, item 890:11544 (Touch 1036:74/175/180), Message · subtle 890:11585, New request card 892:11709 (holder 890:11346). Tools: tools/figma/act-row/ |
| Act row family v2 (2026-10-21, = EVO Cabinet) | GEAP `Act row` 11846:340996 (key kept; + State=Paper 12280:362483 / 12280:362524) · `Post-process menu` SET 12277:338903 (Desktop 11844:340693 / Touch 12277:338914; BOOLEANs Show separator / Show danger 1 / Show danger 2) · item set 11844:198541 (+ Danger Desktop 12268:364506, Touch 12268:364512 / :364518 / :364523 / :364528) · `Menu separator` 12277:338902 · local `20/lock` 12268:364500, `20/circle-x` 12268:364503 | card p16 r16 stroke 1.5 INSIDE (not in layout); desktop title line = 24 icon · Title 16/24 (Default 500 e069d3c3…) · Status · Extra tag, pR = trigger + 8 (137); phones `Line 1` (pL spacing-32, pB 2, icon ABSOLUTE 0/−2) › Title ≤ 2 lines › Meta; Action = button-filled-rectangular Neutral Trailing Small „Postprocese” ABSOLUTE MAX/MIN 12/12 (phones 10/10), exposed, BOOLEAN Show action; `Menu layer` ABSOLUTE STRETCH y 50 align MAX. Props: Title, Validity, Subdivision (was „Authority” — the FO / Ghișeu slot shows the subdivision), Authority (new, „ANSP”, Show authority off), Show validity / subdivision / extra tag / action, Break before subdivision. Meta = Number · Authority(off) · Subdivision · Validity = the code order. Touch items: 48 · 12 16 · gap 12 · r8 · 16/24 · icon 24 (the Icon prop's 20 glyph resized) |
| Act post-process sheet (local, 2026-10-20; UNUSED since 2026-10-21 — phones use the anchored Touch menu) | GEAP sheet 12183:2634 · content 12183:2574 · row set 12183:2573 (was holder 11844:198504; since 2026-10-24 Act row → section Table & list 12645:8469, menus → Menus & tooltips 12645:8490, New request card → Cards & details 12645:8478) · FOD 1039:263 / 1039:203 / 1039:202 · Cabinet 1102:2531 / 1102:2471 / 1102:2470 (holder frame 1101:2430) | phones ≤760 (code js/act-row.js + GEAPSheet): library bottom-sheet 8dc0c5b2… (Header off, Drag Handle on, Action Button off, top r16) with the content in its Content Slot; content = header 12/16 (Mobile/Heading/H5 title + act name 14/20 secondary, gap 2) + × button-filled-circular Neutral Small (75b4a0af…, 16/cross-small 3f8e0ba5…) + List 0/8 of 7 exposed rows, bottom 16; row = State Default / Hover / Disabled, props Label / Reason / Show reason / Icon (24 Foundations: edit bdc07bbf…, cross-small 85359611…, rotate-arrow bc246977…, copy b1676048…, pause 3db9e42c…, flag d3e319c0…, circle-error 7400f1d5…), 48 / 88 with a 2-line reason. Screens: `Overlay · bottom sheet` (overlay-dark @40 %, VERTICAL, align MAX, paddingTop 16) holding the instance, trigger = Act row State=Menu open (pill focus ring, no dropdown on Mobile). Builder tools/figma/act-row/act-sheet.js |
| eKYC „Filtrare avansată” + status tabs (local, 2026-10-19) | eKYC `10818:1084` / `10818:1369` / `10819:1399` / `10819:1688` / `10819:2467` / `10828:2157`·`2193`·`2230` | Advanced filter · button (Count × State Default/Open, 36, focus ring needs clip) · Status tabs (Tabs Count 2–8, tab-item-s 40 + Track line) · Facet filter · option (Content Text/Tag/Field × State × Size Desktop/Touch) · Facet filter · popover (Checklist / More, Show search) · Advanced filter · bar (Meta Hint/Pending/Applied, EVO DS filter-chip a2731000) · Filter sheet content · ek-04j / 04l / 04m (bottom-sheet slot). Builders tools/figma/ekyc-filter/ |
| eKYC „Profile tabs” (local, 2026-10-19) | eKYC set `10835:1715` (Tabs Count 2 `10835:1389` · 3 `:1407` · 4 `:1430` · 5 `:1460` · 6 `:1497` · 7 `:1541` · 8 `:1592` · 9 `:1650`) | BO page-header tab strip (.e-permits-page-header__tabs): library tab-item-s 40 (exposed Tab 1…n: Label / Badge / Icon / Type), Track line absolute index 0, strip hugs its tabs; counters = numbered-badge Large 20 (Neutral / Accent). Replaced the library „tabs” (tab-item-md 48) on 111 strips. Tools tools/figma/ekyc-profile-tabs/ |
| FO header long name (local, 2026-10-19) | GEAP `FO header · service title` set 12089:8112 (Title Short / Long collapsed / Long expanded × Screen Desktop / Mobile; props `Name#12089:0`, `Name · lines#12089:7`, `Name · last line#12089:14`, exposed `Toggle`) · `Name expand · toggle` set 12088:8094 (Expanded False/True × State Default/Hover) · holder 12088:7138 on 🧩 Local components | code js/name-expand.js + css/name-expand.css. Desktop H5 18/26 row 859, Mobile H5 16/24 row 343 (26 floor); toggle = Desktop/Body/Small 500 text/brand/default + 16/chevron-bottom (20/chevron-top at 16 when expanded), icon/brand/default, gap 2. Mobile FO `Header` 3521:12175 got `Show draft status#12094:0` (row „Draft status” 12094:352183, gap 12) — steps 2–6 = on + TitleContainer swapped to the Short title → header 126 = code |
| Trajectory — ONE component (2026-10-20) | GEAP `Trajectory · step` **9696:556** (State Completed / Current / Suspended / Attention / Rejected / Next / Skipped × Layout Horizontal / Vertical) + `Trajectory · connector` 12155:272677 (Layout × Reached) on ↳ BO -> Dossiers (🧩 Dossiers · components). 1:1 copies: eKYC 10864:1659 / 10864:1644 · FOD 1026:777 / 1026:762 · Cabinet 1087:2497 / 1087:2482 | code js/trajectory.js + css/trajectory.css. Props `Label` (was „Tag”), `Date and person`, `Show details`, `Show line` (vertical connector + 24 tail), `Show tag` (vertical, exposed tag-filled Small: „Acum” Strong Brand 2b352fa2…, „Opțional” Subtle Neutral e4da1f91…); vertical connector = exposed instance (set Reached per step). Horizontal (2026-10-21): marker in a `rail` (line-before · 8 · marker · 8 · line-after, exposed `Line before` / `Line after` connector instances, BOOLEAN props of the same names), separate connectors padding 0, step min width 40 → the line stops 8 from every marker. Tool tools/figma/trajectory/connector-gap.js (UPGRADE + ROWS). Card = frame (white, border 1, **radius-20** since 2026-10-23, p20, strokesIncludedInLayout) › `steps` row; phones (Cabinet) = even pitch via tools/figma/trajectory/phone-even.js. Builder + snap: tools/figma/trajectory/trajectory-set.js (stored per file in shared plugin data „traj/lib”) |
| EVO Cabinet requests pieces (local, 2026-10-20) | Cabinet section „Cabinet · requests components (2026-10-20)” on 🧱 Local components (id in root `cab`/`ids` smSection) | Request row 1117:3222 (State Default/Hover/Menu open × Screen; props Title/Number/What/Authority/Subdivision/Date + Show what/authority/subdivision/tag 2/tag 3/alert/retry; exposed Status, Tag 2/3, Alert, Retry message, More) · Copy value 1117:3000 (value + button-text-rectangular Strict Small Icon Only, 16 copy; frame FIXED 20, button overflows ±6 = code margin-block) · Sort trigger 1119:3048 (detached button-filled-rectangular Neutral Small + leading direction icon prop) · Facet filter · date chip 1119:3061 · date option 1119:3224 (Desktop 32 / Touch 44) · date popover 1119:3428 (Show range / Show error) · Profile tabs 1120:3097 · Notification row 1135:3238 (Screen) · Authorization card (MPower) 1120:3152 · Message · subtle gained Tone=Error 1117:3009 + Tone=Success · Confirm modal gained „Show error”. Builders tools/figma/cabinet/ (README-sm.md) |
| Document viewer (local, 2026-10-21, doc-viewer-v2) | GEAP `Document viewer / Signature tray` 12234:357237 · `Modal content / Document · details` set 12234:357447 (`Signature=On` 11366:6892 = canvas 554 + tray, `Signature=Off` 12234:357438 = canvas 632) · Cabinet tray 1176:56463 (section „Components · Document viewer”) · EVO-WEB tray 22242:11397 | tray = background/base/secondary, r16 all corners, p12/16, gap 2 (spacings), tag-filled Small Subtle Brand „Semnat electronic” (24/signature 4ec9fd80… at 16) above Meta 14/20 text/base/tertiary (TEXT prop `Meta`); document window = canvas r16 (radius-16) + 1 px INSIDE border/base/default, not in layout; 12 between window and tray. Phones: window edge to edge (r0, no outline), tray in a `Signature · inset` frame 0/8/8/8. RAP `Document modal (MDocs act)` 22089:209155 got BOOLEAN `Show signature` + exposed `Signature`. Builder tools/figma/documents/signature-tray.js |
| breadcrumbs (library, 2026-10-21) | Components lk-03f6 set key `cafee05e…` (file doJ7tDY0PlQ0PqMgbpFVIC 232:5282); Desktop `ab98b2dd…`, Mobile `f2770086…` | Desktop = exposed Level 1–5 + Active Level (`👁️ Level n`, `👁️ Active Level`; each item `⌨️ Label#570:0`); Mobile = 20/chevron-left-small + one exposed `.breadcrumb-item` (its `⌨️ Label` works). BO header (`--truncate`) = Active Level on, labels cut at 30ch (280 px Onest 14) + „…” written into the label; public / Cabinet / RAP = Active Level off. **Since 2026-10-23 the Desktop variant draws its own `Separator 2…5` / `Separator · active` (16/chevron-right-small) BEFORE each item, visibility bound to that item's boolean → never a trailing ›; the atom 81:713 `📍 Trailing Icon#5159:0` defaults OFF** (never turn it on in a trail). The older lk-708e copy (0437358b…) is NOT the library to use. Tool tools/figma/breadcrumbs/ (census.js, replace.js) |
| Close button · phone (local, 2026-10-21) | Cabinet set 1175:45951 · GEAP 12241:8129 · eKYC 10900:131821 · RAP 22242:231111 · FOD 1079:18767 (section „Sheet header · phone”); RAP also `Modal header · phone` 22243:11543 | phone dialog / sheet × (css/modal-phone.css section 9): 40 circle, Foundations 24/cross-small (8535961…), background/base/tertiary → hover → active, Focus ring; built from detached library button-filled-circular Neutral Icon Only Medium (the library locks the icon at 20). Placed ABSOLUTE in the header, constraints MAX/MIN, x = w − 56, y = title top + lh/2 − 20 (12 for the 32 title line, 8 for 16/24); header padding 16 / 64 / 8 / 16 (sheets); phone titles = Desktop/Heading/H4 in a „Title line” (min 32) since 2026-10-21 — tools/figma/sheet-header/ |
| Copy value — ONE component (2026-10-21) | GEAP `Copy value` **1053:10780** (= the old published `copy-block` d7a4071b…, upgraded in place; tooltip `Copy value · tooltip` 12240:381892) · Cabinet 1180:3849 / 1180:3804 · FOD 1080:1038 / 1080:991 · eKYC 10904:1786 / 10904:1739 · EVO-WEB RAP 22247:14117 / 22247:14070 | code js/copy-value.js. Type Default (value + 16/copy 19019692…) / Compact (no icon: tables, stacked rows, act / request meta) × State Rest / Hover / Pressed / Focus / Copied; TEXT `Value`. Rest padding 0; the wrap is an ABSOLUTE `Wrap` rect at −8 / −4 (STRETCH, radius-6, tertiary-hover 1ad66fae… / -active e2feca67…, Focus Ring/Medium) so the text never moves; tooltip instance ABSOLUTE y −32, constraint CENTER. Act row / Request row: meta `Number` = exposed Compact instance (the Number TEXT property was removed). Tools tools/figma/copy-value/ |
| Form Designer pieces (local, 2026-10-21) | GEAP section „Form Designer · components (2026-10-21)” 12282:434927 on 🧩 Local components: `Form Designer / Address part` 12282:435060 · `Form Designer / Top bar` 12289:456645 · `Form Designer / Library · context` 12289:463590 · `Form Designer / Stage header · context` 12289:463649 | code js/form-builder.js addressDataHtml + .e-permits-builder__topbar. Part = Open × Muted, props Label / Show divider, exposed Type (tag-outlined Small) / Toggle (button-text-rectangular Strict Small icon-only, chevron) / Visible / Required (Document option · checkbox); row 12/0 + Bottom 4 + 1 px divider = code 103. Top bar = Mode Edit / Preview (segmented-control 3, „1 eroare”, „Acest serviciu”, „Publică” disabled, ×). Screens: tools/figma/quality-sweep/form-designer/ |
| Unsaved changes review (local, 2026-10-21) | GEAP holder 12241:493487 on 🧩 Local components: `Header status` 12241:493506 · `Change row` 12241:528864 · `Change group` 12241:528943 · `Unsaved changes review` 12241:529090 (Desktop 12241:528944 / Phone 12241:529017) · eKYC copy 10904:162304 (status 10904:162323, row :162346, group :162425, review :162572) | code #profile-changes-modal (9ed3a52d). Header status = dot 8 icon/warning + Caption 500 12/16 (or Inline 14/20 for the dtpl sheet head), hover dotted underline, focus 2 px brand ring; now inside `Main Navigation` 9442:44686 (exposed `Status`, visible = „Unpublished changes”), `Settings · Save bar` 10638:1534 (its Text prop removed — set the exposed Status) and `Profile / Header` 10133:184694. Review: exposed Group 1–3 (Show group 2/3) › exposed Row 1–3 (Show row 2/3) › exposed Tag + Undo; fill with tools/figma/unsaved-review/blocks.js `fillReview`. Phone = bottom sheet 375 (no handle, × Medium 40 + 24/cross-large b6145b5f…; title 20/32 = code, user-confirmed). State=Changes / Empty (Desktop 12250:339727, Phone 12250:339869; eKYC 10910:257 / 10910:440) |
| Document field · label (local, 2026-10-23) | GEAP **12468:8391** (🧩 Local components › Components · Documents) · FOD 1275:11464 | label of a FO document field: TEXT `First lines` (+ BOOLEAN `Show first lines`) + `Last line` row (gap spacing-6) = last-line text · 12/asterisk (icon/danger) `Show star` · tag-filled Subtle Neutral Small „Opțional” `Show optional` → the star / tag sits right after the last word like the code (library text-input label puts it at the right edge). Phone lines = the code's breaks at 343 (probe word rects). Desktop 16/24 500 |
| Details card + row (2026-10-23, = BO „Date generale”) | row = `svc/field-row` set **12143:21330** (Context Page 256 · Drawer 200 · Modal 163 · Modal · narrow 147); card = plain frame like the dossier card 11332:17170 | card VERTICAL, fill background/base/secondary (2099ba93…/1296:266), **radius-20** (67f239d0…, since 2026-10-23; was 24), padding 8 / 20 bound, gap 0; rows FILL, 8 / 7 + 1 px bottom stroke = 40, last row `strokeBottomWeight = 0`. Copy = BOOLEAN `Show copy value` + exposed nested `Copy value` (Default) — not the old 24/copy `Show copy`. Several values = Value text with `\n` + paragraphSpacing 4 + row counterAxisAlign MIN; a long single value = Value text FILL + HEIGHT. Tags = Tag 1–3 (setProperties Style / Label). Converter: scratch-style one call per ≤ 27 cards (see lesson 2026-10-23 details-wrap-align-v1) |
| Pager · compact (local, 2026-10-23) | RAP EVO-WEB **22396:14841** (Desktop 22396:14744 / Phone 22396:14828, section 22060:2438) · EVO Cabinet **1305:4300** (Desktop 1305:4205 / Phone 1305:4287, section Components · Toolbar) | shared GEAPPager (pager-compact-v1/v2). Desktop: `Summary` (Range 14/20 secondary, numbers 500 default · 16 · Size label + library select-input Medium Filled with its `Input` overridden to HUG + 6/8/6/12, gap 4 → 32) SPACE_BETWEEN `Pages` (gap 4: button-text-rectangular Strict Icon=Only Small ‹ › + library `.pagination-item` Breakpoint=Mobile 32, text style overridden to Body/Small 500). Phone (v3): Secondary Medium „Afișează mai multe” full width, gap 12, then right-aligned `Arrows` (gap 8) = button-outlined-rectangular Strict Medium „Anterior” (Leading chevron-left, Disabled on page 1) / „Următor” (Trailing chevron-right). Per instance: Range text, Size label, hide / rename page items, swap States. `.pagination-item` set (key 51a339f3…) is NOT importable by key — reach it through an existing library pagination instance. Builder tools/figma/rap-table-flat/pager-compact-set.js |
| RAP consolidated components (EVO-WEB, 2026-10-23, rap-components-cleanup-v1) | section „RAP · Public registry components” 22060:2438 on 🧱 Local Components (sub-sections Board helpers 22424:3768 · Table & list :3769 · Profile :3770 · Filters :3771 · Modals & documents :3772 · Shared :3773) | `RAP / Modal / Data modal content` **22403:11850** (Breakpoint × Subtitle Plain / Collapsed / Expanded; TEXT `Act name` / `Last line`; SLOT `Sections`; exposed Read-only note) · `RAP / Modal / Act fields table` **22411:177587** (Desktop / Mobile; SLOT `Rows`) · `RAP / Document / A4 act page` **22413:6789** (Page First / Continuation; BOOLEAN Show watermark / closing / signature; TEXT Authority / Office / Act name / Number / Continuation / Signed / Footer; SLOT `Rows`) · `RAP / Document / A4 watermark` 22413:6652 (Status Suspended / Withdrawn) · `RAP / Document / Doc canvas` **22413:7030** (Breakpoint × State Pages / Loading / Error; SLOT `Pages`; = the Document modal 22089:209155 `Canvas` default) · `RAP / Filter / Filter section` **22422:3978** (State Closed / Open × Divider On / Off; Label / Summary / Show summary; SLOT `Panel`) · `RAP / Filter / Filter sheet content` **22422:3979** (TEXT Title; SLOT `Facets`; exposed Resetează / Close). Ids in root plugin data „rap”/„ids” (dmContent, afTable, a4, a4wm, canvas, fSection, fSheet); generators tools/figma/rap/act-fields.js · modals.js · screens.js (sheetContent) |
| Pinned column (local, 2026-10-23 v4 = user reference GEAP 12615:79800) | GEAP set `Table / Pinned column` **12619:61500** (Side Start/End × State Shadow/No shadow; native SLOT `Cells`) · effect styles `Table / Pinned column – end` `S:357f5958…` / `– start` `S:d4c0057e…` / `– ring` `S:10e6f053…` · eKYC set 10987:2108 · RAP 22462:6394 (section Shared) · Cabinet 1379:55419 | ONE absolute frame per pinned column, white fill, clip, the column's cells INSIDE (slot), effect style bound: ring 0 0 0 1 @8 % (= the divider, replaces strokes / lines) + X ∓4 b6 s−2 @5 % + X ∓4 b15 s−3 @10 % (End casts left, Start right); No shadow = ring only. Cells that were in flow leave an empty `Sticky placeholder – Table Cell`. Converter tools/figma/pinned-column-shadow/pinned-column.js (stored per file „pinc”/„convert”), pinned-column-frames.js. The earlier `Table / Pinned column shadow` set, `Table / Pinned divider` lines and the 8 % paint style are deleted |
| 🧩 Local components page (2026-10-24, local-components-page-v1) | page **10566:10080** — sections (x 0, stacked 80 apart): Navigation & headers 12645:7593 · Table & list 12645:8469 · **Table · pinned columns (docs) 12645:8472** · Forms & fields 12645:8475 · Cards & details 12645:8478 · Profile & dossier 12645:8481 · Documents & files 12645:8484 · Modals, sheets & drawers 12645:8487 · Menus & tooltips 12645:8490 · Feedback 12645:8493 · Icons 12645:8496 · Form & Process Designer 12645:8499 · Board helpers 12645:8502 · Other 12645:8505 · Page-specific & legacy 12645:8508 · Builder helpers (scripts, locked) 12645:8511 | ALL 199 local mains of GEAP live here, flat in their category section (no holder frames any more — the old holders 11844:198504, 12088:7138, 12240:381759, 12241:493487, 11361:6350, 10638:1475, 9521:7914, … and the board holders Components · Status / Components · Profile were deleted; ids of the components are unchanged). Section ids in root shared plugin data `localcomp`/`sections`; grid routine `localcomp`/`layout` (ARGS {items:[[id,cat,desc?]], layout:[cat]}: moves + sorts by name + rows ≤ 5600 wide, gap 80, tops aligned). New components → append to the right section and re-run the layout for that section, then restack. **v2 (2026-10-24): every local main of GEAP is on this page (0 elsewhere); when another agent is adding to a section, append at the bottom with tools/figma/local-components/place-in-section.js instead of re-sorting it** Pinned docs: demos 12646:56361 (start) / 57639 (middle) / 58106 (end) / 58573 (fits, ring only) / 59147 (row focus), rule note 12646:56357 |
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
  modal content `Modal content / Document · details` set 12234:357447 (GEAP local; doc-viewer-v2 2026-10-21: document window + `Document viewer / Signature tray`, no „Date generale” / „Doar citire”, uploads too); lone view action = „👁 Detalii”, Configurează =
  settings icon, Editează = pen.
- Dropdown surfaces (user, 2026-10-16): every menu / ⋮ menu / dropdown / popover / listbox / picker / switcher menu = effect
  style „dropdown-effect” + clip content ON + radius bound to its token (12 BO stack menus, 16 FO intent / profile menus — as
  the code) + NO border stroke (the effect's 1 px ring is the border). Tool: tools/figma/dropdown-effect/; audit rule `dropdown-effect`.
- All Figma NAMES are English (user, 2026-10-15): components, sets, variant properties / values, component properties,
  sections, frames, layers, pages. Visible text stays Romanian. Glossary: tools/figma/naming-glossary.json. Names quoted in
  this playbook before 2026-10-15 are the old Romanian ones — look them up in tools/figma/naming-map.json.

- Never flip `strokeAlign` in bulk (user, 2026-10-22). OUTSIDE strokes are often intentional: the 4 px screen frame and the
  current-step band (8 px OUTSIDE stroke in the fill colour = the code's `box-shadow 0 0 0 8px`). Fix a stroke only on the node
  you were asked about; audit rule `band-stroke-inside` flags a hidden band.

- **No INNER_SHADOW anywhere** (user 2026-10-24: „again this inner shadow — remove ALL inner shadows”; 2026-10-23: „WTF is this
  inner shadow?”). Not in mains, frames, instance overrides or effect styles. Divider (offset ±1, r0) → one-side stroke 1 on the
  border variable, INSIDE, not in layout — ALWAYS draw the stroke, never just delete the line; ring (offset 0, spread n) → INSIDE
  stroke n (same-colour existing stroke → one thicker stroke, box kept); bevels / gloss → removed. Tool:
  tools/figma/quality-sweep/no-inner-shadow.js (sweep + NO_INNER_SHADOW(roots) step, already inside every swap script + TOKENIZE).
- (older wording) No inner-shadow dividers (user, 2026-10-23: „WTF is this inner shadow?”). A 1 px line is a one-side STROKE bound to
  border/base/default (individual weights, INSIDE, not in layout), never an INNER_SHADOW (offset ±1, radius 0). Captures turn
  the code's `box-shadow: inset 0 -1px 0 …` into one — swap-ghiseu.js / swap-workplace-registry.js now convert it; sweep any
  file with tools/figma/quality-sweep/inner-shadow-dividers.js (dry run first).
- A ⋮ whose menu would hold no enabled item is not drawn (2026-10-23, row-menu-no-disabled-only-v1): empty actions cell, same width.
- **No per-state components** (user 2026-10-23 on EVO-WEB 22089:33231: „such a mess in components — resolve”). A component
  is a reusable UI part (used ≥ 2× or a real building block), never „<thing> · <state id>”. When a library / local shell
  (modal content slot, bottom sheet, document canvas) needs per-state content, give the consolidated component a native
  SLOT (`component.createSlot()`) and build the state's content INTO the instance's slot (frames of library / local
  instances); variants / properties only for real differences (breakpoint, subtitle shape, page kind). Generators never
  create a component per state.

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
- Block = `Screen label` → `Screens · desktop + mobile` (gap 120 = GEAP FO 09 / Post-processes / Address / EVO Cabinet;
  the FOD Requestor board is 80) → `Note · <id>` at the bottom, all inside the block (VERTICAL, gap 16). Notes never float
  beside blocks. Label = blue ID chip · H4 title · Status · „Prototype ↗” link; note = GREY (see lesson 2026-10-21).
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


- 2026-10-20 · Detail rows 16 → 14/20 in all five files (user: „do back 14px … entire Figmas and code”). The svc/field-row set
  (12143:21330) was already fixed (1,263 instances follow); this pass found what the component did not reach. Census per file
  (stored in root shared plugin data „kv16”: census = horizontal rows whose first two children carry text, one of them 16;
  census3 = 16 px texts filled text/base/secondary / tertiary; gaps = column gap histogram; restack; fixRow). Result: GEAP 2 field-row
  instances with a local 16 px Value override (Services „Card · Changes imported from RSSP” 10791:1736 / 10792:268001) + 8 raw
  detached „svc/field-row” frames on the FO 09 F8d / F8e phone certificates (10842:278633…278724); eKYC, FOD, EVO Cabinet,
  EVO-WEB RAP: 0 (Cabinet / RAP rows are the local „Profile / Details row” 14/40, eKYC session rows 14/40). Lessons:
  - **Census instances by main, not by page**: `getInstancesAsync()` on each variant + „any visible TEXT with fontSize ≠ 14”
    found the overrides in one call (1,263 instances) — page walks would have needed 15 calls on Services alone.
  - **Measure which code pattern a Figma row copies before fixing it**: the F8d certificate looks like a BO detail row but the code
    is `.e-permits-fo-summary-row` (12 / 12, phone gap 2, value 14 **regular**, 45 / 67 high), not `.e-permits-dosar-profil__row`
    (8 / 7, 40, value 500). I first applied the BO numbers and had to redo it. CDP probe: per state × width, group the rendered rows
    by label / value computed font + padding + height (scratch probe-rows.mjs on tools/figma/cabinet/cdp.mjs).
  - The probe also caught an unrelated drift on the same screen: phone certificate box padding 16 vs code 24 (desktop already 24) →
    the value column was 16 px too wide. Fixed (bound spacing-24).
  - Font-metric edge case, declared not hacked: „Autorizația sanitară pentru funcționare” is exactly 253 px in Figma and wraps in Chrome
    at 253 (code row 87, Figma 67).
  - Whole-column after the earlier shrink: only blocks whose screens HUG shrank (Services 01k / 01l −20 → gaps 180, 01d → 01e 140);
    restacked column 01 at its 160 pitch from an ordered list. Dossiers 04k → 04l was 302 in a 324 column → 04l +22. Other odd gaps
    (Services 02 220 / 200 / 632, 07 478, 08 242, Ghișeu 07 242, Tariffs row grid) contain no field rows → pre-existing, left.
  - 16 on purpose (code checked): FO payment totals „Subtotal / Total de plată” (.e-permits-fo-payment-totals 16/24 500 / 600 —
    Figma value „750 MDL” is 14 regular, the opposite drift, reported), FO instance-switch modal description, eKYC BO login MPass
    identity value (.bo-login__identity-value), form field labels, stack group labels / toggles, FO step headers.
  - Not in code any more (legacy, left): „Depui ca” FO header context (Requestor, MSupport, FO 09 Individual), BO page-header
    „Serviciu: …” meta (App Shell, Workplace).
  - No Agent tool in this session → stored figma-audit (`ghs/audit`, call with id strings — node objects give „missing-root”) on the
    two certificate frames, the RSSP cards and the new FO 09 rule card: 0 findings.

- 2026-10-20 · „Doar citire” lock with stroke AND fill (user: „in some modals the lock has a stroke and also a fill”). Census of every lock
  in the five files (by layer name AND by main-component name for renamed „Icon” instances): GEAP ~520 locks, eKYC 52, FOD 2, EVO Cabinet 3,
  EVO-WEB ~139; broken (stroke + fill) = 9, all in GEAP: the svc/info-note inside `Modal content / Document · details` 11366:6892
  (I11366:7098;9624:13363) + its 8 instances in Dossiers 04e–04l modals. Code = `icon-lock` (fill-only, 20, icon/base/tertiary,
  js/e-permits-shell.js renderReadOnlyNote). Fix in the MAIN: swapComponent → Foundations **24/lock** (key fbeb6d2d…) resized 20, fill =
  icon/base/tertiary (VariableID …/1296:255), strokes [] → every instance followed (they had no own override). The 3 raw captured
  „info-box” notes with an 18 px central stroke lock (Dossiers 03c 9721:11834, 04b 9727:13604, `Modal content · Event details` 10784:263866)
  → clones of the fixed 11366:7098 (an instance inside a main clones as a normal instance with its overrides), FILL. Lessons:
  - **Root cause pattern**: svc/info-note's slot holds 20/circle-info-filled with a FILL override (tertiary). Swapping the nested icon to a
    central STROKE icon (lock, private filled=off) keeps that fill override on the new vector → filled closed shapes under the stroke =
    bold blob. The reverse (stroke → fill icon) gives `fills: []` (invisible, lesson 2026-10-15). After any icon swap across families,
    check the vector's fills AND strokes; read `instance.overrides` (`…;5706:58629:fills` was the giveaway).
  - Census by name misses renamed icons („Icon” → 24/lock in the Cabinet MPower restriction callout, lock filled=on 36 in auth screens):
    second pass = small instances (≤ 40) with non-icon names → getMainComponentAsync → match /lock/. Huge pages: per section; pages with
    ~6,000 small instances (Services 02) still pass in one call; four pages in one call timed out → one page per call when unsure.
  - `figma.variables.getVariableByIdAsync` returned null for a library variable used only through paints → copy the bound paint from a
    node that already has it (JSON clone of `fills`) instead of binding by id.
  - Not changed, reported: eKYC Read Only text-inputs show the EVO DS library default trailing icon „lock, private” stroke=2 (stroke-only,
    not broken) while the code uses icon-lock (fill) — a library-level difference for the PO / DS owner; Classifiers „Doar consultare”
    banners = raw captured banner frames with 24/lock 20 (fill-only, fine glyph). Census builders stored in figma.root shared plugin data
    „lockfix” (census / c2 / c3 / c4 / txt) in each file.

- 2026-10-20 · No download in document rows (user rule; GEAP 11333:20746 = a ⋮ whose only item was „Descarcă”). GEAP: `Document · row`
  11362:7113 — the six „Action=Details + ⋮” variants renamed IN PLACE to „Action=Details” with the ⋮ child removed (77 rows in Dossiers
  04, 04c–04t follow, 0 swaps), 12 unused variants deleted („⋮” ×9, „Menu open · Details + ⋮” ×3 after moving their 2 instances to
  Default), set re-gridded 4288 → 3226; `Document · card` 11364:7441 — Cabinet ×12 lost the ⋮, Previous permit ×6 „Descarcă” →
  „👁 Detalii” (label + 16 eye 464:24533 on the same button; 10c / 13b follow). Dossiers: 04j deleted (duplicated 04h — same modal,
  only the trigger differed) + its connector + TOC line, column 04+ restacked (−2150); 04q rebuilt as „row click → modal” (overlay
  cloned from 04s, 8 rows from the dos-04q DOM text, signed page dates), column 04++ restacked. Post-processes: new block 10c1
  12176:360806 (pp-10c1) + local `Modal content · Previous permit viewer` 12176:360692 (clone of the certificate content, 6 rows),
  connector „Detalii” → 10c1 and 10c → 10d moved to the LEFT lane. EVO Cabinet `Document · card` 983:2727: ⋮ removed from 6 variants
  (30 cards on ↳ My requests). FOD: no document row / previous-act card / „Descarcă” anywhere → nothing to change. Lessons:
  - **Dropping an action from a variant set = rename the variant + remove the child in the MAIN**, not a new variant + swap: instances
    keep every override and connector (they attach to the row instance with a position, never to the ⋮ sublayer). Move instances off
    the variants you will delete first (`setProperties({State:"Default"})`), then delete only variants with 0 instances.
  - **„Menu open” blocks of a removed action**: check the code state first — dos-04j became the same modal as dos-04h (delete the
    block, mention the row click in 04h's note), dos-04q showed a modal not drawn anywhere (rebuild the block in place: same id, same
    connector re-labelled „Clic pe rând”). Block deletion also deletes the TOC NODE-link line → remove it and the list mention in the
    rule card.
  - **Notes: never type „⋮”** (Onest renders „:”) — I wrote it into 7 notes first; replaced with „Mai multe acțiuni”. Grep your own
    inserted copy for ⋮ before finishing.
  - A modal centred by the overlay's auto-layout in an odd-width screen (1447) lands at x .5 → make the modal ABSOLUTE in the overlay
    at a whole x (setting x on an auto-layout child is silently ignored).
  - Cloned certificate content had an unstyled 20/28 600 title (source too) → Desktop/Heading/H4 on both; the scrim copied from F8d is
    the board's unbound 40 % scrim (baseline).
  - Ghișeu gh-07c / gh-07a3 MSign card was never drawn with actions (Document · card Summary, no „Detalii”, no ⋮) while the code shows
    „👁 Detalii” → nothing to remove; drift reported, not changed.
  - No Agent tool in this session → stored figma-audit (`ghs/audit`) on 04q, 10c1, the viewer component and both sets: only baseline
    (section-over-card gap 0, meta-dot gap 18, scrim, step-indicator halves inherited from the 10c clone).

- 2026-10-20 · Leftovers on Dossiers 04 + Ghișeu 07 (no new components). Dossiers (`Modal content / Document · details` instances):
  04r „Statutul” Tag 1 „Persoană fizică” → „Proiect” Subtle Neutral, 04s → „Aprobare” Subtle Success, and the same census found 04t
  Statutul → „Respingere” Danger and 04e / 04h / 04o / 04p „Semnătură” Tag 1 „Persoană fizică” → „Semnat electronic” Brand + Leading
  icon 9717:6938 (copied from 04s); duplicate last „Număr dosar” row hidden in 04o / 04r / 04t (code drops it when the document number
  IS the dossier number) + new last row strokeBottomWeight 0 (also 04q); modal subtitle without the number in 04i / 04s / 04t (service
  name only) + notes 04i / 04s. Ghișeu: 7 „Cererea pe hârtie” + 2 „Cererea semnată MSign” cards (07a, 07a2, 07a3, 07b, 07c, 07h, 07i)
  `Document · card` Context Summary → **Previous permit** (= the Summary card + library „👁 Detalii” button-filled-rectangular Neutral
  Small, right column, meta wraps in the text column); MSign card got its file part back (cerere-C-2026-004790.json); connector
  „gh-07c → gh-07a3 · Detalii” 12005:361653 now starts on the card at the button (position x = card.width, y = 44). Lessons:
  - **Census the whole page, not the blocks you were sent to**: the „Persoană fizică” leftover (tag default after a nested row variant
    switch, lesson 2026-10-20 above) sat in 7 modals, not 2. Find visible TEXT „Persoană fizică” inside `Modal…` instances (walk parents
    for `visible`), map each to its row label, compare with the code state's „Date generale” text from capture.mjs (`text` field,
    slice from the last „Date generale\nTip document”).
  - **Hiding the last row of a card leaves the divider on the new last row** — set its strokeBottomWeight 0 in the same call.
  - Hiding a row changes the modal height → the overlay's auto-layout centres it at y .5 → ABSOLUTE + floor(y) (lesson 2026-10-20).
  - **Code can be broken against its own intent — draw the intent, report the code**: Ghișeu `.e-permits-gh__doc-actions` is not in
    the doc-card grid selectors (`:has(> :is(…, .cab-doc__actions, .btn))` → column 3), so in code the „Detalii” button falls into an
    auto-placed third row under the icon (card 104 tall). Figma uses the right-column pattern (as every other doc card with an action);
    reported to proto-engineer. Code also still shows „AUT-… · serviciu” / „D-… · serviciu” in the dossier document modal subtitle
    (js/e-permits-shell.js `subtitle = d.act ? \`${d.act.nr} · …\` : kind === "acte" && nr ? \`${nr} · …\``) — Figma follows the rule.
  - `Document · card` Context „Previous permit” is really „Summary + Details” — reused for the Ghișeu cards rather than adding 12
    duplicate variants; rename the value only together with tools/figma/documents/card-v3.js and the naming glossary (open question).
  - Stored audits: `ghs/audit` 0 findings on the 9 modals / 9 cards after the fix (4 fractional before); `qsweep/audit` on the blocks =
    baseline only (section-over-card gap 0, the Ghișeu background page list's clipped cells / fractional sort headers).

- 2026-10-20 · Dropdown item — one size everywhere (user: „use such item size / padding style as [GEAP 9716:10905 „Dossier / Step menu ·
  action”] everywhere, so it's not big and chunky”; code 9de31eec css/dropdown.css). Item 32 · 6 12 6 8 · gap 8 · r6 · Desktop/Body/Small 500
  (057521fd…) · icon 20; surface p4 · gap 2 · r12 · dropdown-effect · clip. Token keys: spacing-2 4e3c6037…, -4 983c5b4d…, -6 82d50194…,
  -8 69ac88e4…, -12 ee4801fe…, radius-6 5c211831…, radius-12 1f226805…. Tools tools/figma/dropdown-item-size/ (census2.js, compact.js,
  apply.js; stored in figma.root shared plugin data „ddi”/„compact” + „ddi”/„apply” in GEAP, Cabinet, eKYC). Changed: FOD act menu + item set +
  3 Apostile country lists; GEAP act menu + item set, Step-menu Action variants (8 → 6 vertical, 54 → 50), ~60 menus / lists / popovers on 15
  pages (library contextual-menu / selection-menu instances overridden, raw captured lists, field picker, formula picker, address search 70 →
  54, account links 44 → 32, help menu); Cabinet item / menu / facet option Desktop variants, popover list, 2 selection lists; EVO-WEB RAP facet
  option Size=Popover 36 → 32 + popover list; eKYC facet option Desktop 36 → 32, 2 popover lists, export + App Shell menus. Lessons:
  - **Coordinator changed scope mid-job** (phone post-process menu → bottom sheet, keep 48 there): I had already DELETED the Touch variants in
    FOD + GEAP. Restoring = clone each Desktop variant back into the set (`set.appendChild(v.clone())`), copy `componentPropertyReferences` of
    the direct children, unbind + re-bind the Touch metrics, Desktop/Body/Default 500 (e069d3c3…) labels, then `setProperties({Size:"Touch"})`
    on the phone menus' nested items and override the phone menu surface back to 8 / 4. New variant ids — report them. Before deleting variants
    for a „drop the touch size” request, ask whether phones get another pattern.
  - **Deleting a variant does NOT repoint nested instances**: `getInstancesAsync()` on a variant misses instances that live as overrides inside
    another instance (I892:11596;890:11551) — after `remove()` they point at a parentless ghost main. Repoint FIRST through the hosts
    (Act row variants + their instances → `findAll(Item n)` → setProperties) and verify „main.parent === set” afterwards. A swap to a variant of a
    different set renames the property keys (`Label#920:0` → `Label#890:0`) — map by name prefix.
  - Library `.menu-item-action` / `.menu-item-selection` labels are already 14/20 Medium; the 44 comes from padding 12 / 24 / 12 / 16 → per-
    instance padding overrides (unbind, set, bind token) + item HUG + menu p4 / g2 give the code's 32 without detaching. The library menu
    instances also get the dropdown-effect style, clip and radius-12 (they still had Drop Shadow/300).
  - **A „menu” by name or effect is not always a menu**: Incidents „contextual-menu” 244:20070 / 245:20652 / 245:23548 are two-pane filter PANELS
    (272 body + button footer) — the first compact pass padded them like items (restored: surface 0 / 0, body 0, footer 8 / 12 / gap 8, width
    710 again); Ghișeu 11654:8181 is an empty-state dropdown (icon tile + title) — restored to the code's empty-state metrics (16 / 12, tile 48,
    r-full). compact.js now skips lists whose items are > 90 high, rows holding buttons, and lists with a direct text / „Nu există…” empty state.
  - Fixed-height captured lists stay tall after their rows shrink (fo-intent-menu 361 with 32 rows) → set the list HUG when its content fits.
    Wrapper `li` frames (VERTICAL, one HORIZONTAL child) are the captured `<li>`: the item is the child.
  - Two-line rows: address options were 70 because of the inner gaps (icon → copy 12, title → meta 6); the code is 8 / 2 → 54 with the same
    6 12 6 8 padding. Change the nested frames' itemSpacing (overrides are allowed inside instances).
  - Account links (Profilul meu / Setări generale) live in SLOT content of the Instance switcher menu: the slot content root (11543:14771)
    is not reached by `set.findAll` — get it through the text's parent chain and edit it directly.
  - Parallel `use_figma` calls on the same file share `figma.currentPage` → a census id from one page was not found later; run page walks
    sequentially, or load pages with `loadAsync()` and walk `page.children` without switching.
  - Census width limit 700 missed 711 / 728-wide FO select lists → 800; re-run the wide-only pass on pages already done.
  - Phone post-process menu frames left for the sheet job: GEAP Act row `State=Menu open, Screen=Mobile` 11846:340909 (menu 11846:340928),
    FOD 892:11596 (in the Mobile variant of 892:11656), Cabinet `Post-process menu` Size=Touch 1054:164 + pp-01q phone 1069:12722 + Act row
    mobile 1055:1269. Phone filter-sheet rows (Touch / Sheet 44) unchanged by rule.
  - No Agent tool in this session → mini QA by script (fractions, unbound item paddings, unstyled texts, clipping ancestors) on the changed
    components + 12 sample surfaces: 0 findings except library icon vectors (fractional glyphs) and the component-set frames' own padding.

- 2026-10-20 · Phone code changes 13ad02fe / 49eda79a → Figma (GEAP, FOD, EVO Cabinet). (1) „Act post-process sheet” (row set + content +
  sheet, ids in the Library table) built per file by ONE builder (tools/figma/act-row/act-sheet.js, `RUN({holderId})`); Act row
  `State=Menu open, Screen=Mobile` lost its Menu layer in all three files (pill focus only); Touch item variants deleted (GEAP
  12176:357967/71/75, FOD 1036:74/175/180, Cabinet 1054:121/126/130 + `Post-process menu` Size=Touch 1054:164) after a whole-file walk
  found 0 users. Screens: GEAP Post-processes 02a got a phone (12183:406131, clone of FO 09 F1c mobile + „sau” divider / label from the
  02a desktop, Beta banner hidden) → block 1942 wide, columns 03–06 shifted +495, 27 connectors re-routed; Cabinet pp-01a / pp-01p /
  pp-01q phones → 812 viewports with the sheet (pp-01p = „Viewport (scrolled)” with Main at −1134 so the trigger sits at 533 as in the
  code), column 03 restacked at 240 (gaps were 1020). (2) GEAP 11c = step bar only (header instance hidden, viewport 767, content offset
  from the code's „Cod cadastral” y 82); new FO 09 blocks F3s 12191:41179 (fo-03v) and F3t 12191:41880 (fo-03w). (3) MSupport census: no
  phone frame in GEAP / FOD / Cabinet draws the widget beside an open picker / focused field (only the „MSupport incidents” page shows
  it, default state) → nothing to remove; fo-03w block shows the rule. Lessons:
  - **Measure the sheet in the code before building**: it HUGS (218 for 2 rows, 266 for 3, 658 for gh-02j's 7 rows with reasons) —
    „16 from the top” is the max height, not the position. Probe = `.e-permits-filter-sheet--actions` panel / header / heading / rows /
    reason boxes + the `[aria-expanded=true]` trigger y (tools/figma/cabinet/cdp.mjs). Heights then matched to the pixel (594 / 546).
  - **An ABSOLUTE overlay with STRETCH constraints moves when its parent is resized afterwards** (02a overlay jumped to y 289 after the
    screen went 839 → 812). Resize the screen FIRST, then add the overlay; give it MIN constraints; set `primaryAxisSizingMode = FIXED`
    AFTER `layoutMode` (else it hugs the sheet and `primaryAxisAlignItems = MAX` does nothing).
  - **Reparenting an instance's host re-keys the nested ids** („I12191:40498;…” vanished after `vp.appendChild(content)`) → measure
    nested nodes before moving their ancestor, re-find them by id suffix (`n.id.endsWith("3621:64940")`) after.
  - Board drift found, not fixed: FO 09 F3 phones predate the „Cod cadastral” field (code: search hint + Cod cadastral + Orașul/Comuna)
    — F3s/F3t follow the column and say so in their notes; FO 09 phones never draw MSupport; FOD ↳ Attachments has old 812 wireframes
    („Logo / Primary Header”) that are not the FO wizard chrome — left. FOD and Cabinet have no phone screen of the FOD Requestor P2 menu.
  - A whole-file walk (`page.loadAsync()` + recursive `.children`) is the safe census before deleting variants; `getInstancesAsync()`
    on the Touch variants said 0 while they still lived nested in the Mobile „Menu open” variant's menu — remove the host layer first.
  - Read-only page-wide MSupport census over all GEAP pages in one call dropped the transport → one or two pages per call.
  - Off-scale kept on purpose (code values): sheet row gap 10, Act row meta gap 18. Intentional clips: scrolled viewports, page behind
    the sheet at 812, horizontal chip rows. Foundations `pause` (two wide bars) vs code icon-pause stays the known delta.
  - No Agent tool in this session → figma-audit rules run by hand on the 3 component sets per file, the Act row mobile variants and every
    changed phone (GEAP / Cabinet / FOD): fixed unbound overlay padding (→ spacings/16), gap 3 → 4, .5 / .67 widths in cloned input rows
    and the „sau” divider, two „Button Container” / „Select list” names (raw-control false positives).

- 2026-10-20 · EVO Cabinet „Solicitările mele” board rebuilt from the code (file iitScYOwMYjDayuyrm3750, page ↳ My requests 10:19047;
  44 blocks × desktop 1440 + phone 375 in 7 column sections + `00 · Start here` 1122:6536; old page moved unchanged into `Archive ·
  before 2026-10` 1114:5910; the two live component holders that sat on that page (Documents 983:2519, Instance switcher 1014:4587)
  moved to 🧱 Local components instead of the archive). Tools: tools/figma/cabinet/spec-sm.mjs, payload-sm.py, blocks-sm.json,
  screens-sm.js, components-sm.js, README-sm.md. Lessons:
  - **Spec → stored builder → tiny payloads scales**: the per-block call is only B/D/M JSON + a stored runner (`cab`/`smrun`);
    canonical list rows live in root plugin data (`cab`/`smrows`, rows referenced as „@id”), shared profiles are reused inside one
    call. Two to three profile blocks per call were safe (~40–60 s); never had a transport drop.
  - **The spec extractor must keep inline order**: rich text = segments [text, 0 plain | 1 bold | 2 link] with the link IN place
    (the first version lifted links out and lost „din Catalogul serviciilor.”); `<br>` → „\n”; values must exclude their tags'
    text (a Tag row read „22 septembrie 2026Aprobare tacită”) — fixed in payload-sm.py `fixtags`; doc meta lines are
    `display: contents` → read them without a visibility filter.
  - **Bold inside a 16 px text**: richText applied the 14 px medium style to bold ranges of 16 px dialog texts (mixed sizes) → pick
    the medium style by the node's fontSize (body500 / small500). Keep blank lines: collapse only spaces around „\n”.
  - **Phone confirm = bottom sheet flush**: X.overlay adds +32 under docked dialogs → phone screens grew to 844; dock at 812 − h.
  - **Variant from a finished component**: clone the standalone component, restyle the clone (VERTICAL phone layout), then
    combineAsVariants — but after switching layoutMode re-set every child's sizing (Main stayed FILL-vertical at 1 px, the action
    button went HUG = 20 high). Library buttons in a variant: keep them FIXED 32.
  - **Avatar initials**: `setProperties({"🎚️ Type": "Initials"})` failed silently inside try → swap to the Initials variant of the
    avatar's own set and write the initials text.
  - Message · subtle needed Error + Success tones (clone a tone variant, recolour fill + swap icon + re-bind the text property ref).
  - Track line of a hugging tab strip: make the instance FILL so the absolute STRETCH line runs the column width (code draws the
    line on the `.tabs` wrapper, the strip hugs).
  - Whole pixels: centred pagers in odd free space (+1 on the range text / 1 px right padding on phone pagers), equal-half fields
    (first FIXED 167, last FILL) — the gate audit found nothing else (0 unbound colours, 0 unstyled texts, 0 raw controls).
  - The coordinator announced mid-job that the PHONE list toolbar changes in code (one row: „Filtre” + sort pill, no chip row) →
    finished desktop + profiles + phones of profiles, left the phone list toolbars for a follow-up with the final commit.
  - No Agent tool in this session → stored gate audit (`qsweep`/`audit`, now also in the Cabinet file) on all 44 blocks + the new
    components: left = section-over-card gap 0 (role groups), meta-dot gap 18 (pattern), intentional clips (chip scroll rows,
    page behind phone sheets at 812).
- 2026-10-20 · Same job, follow-up (coordinator: phone list toolbar a71a4a2b, then a phone card change announced):
  - **Rebuild a component IN PLACE from a detached library variant** to follow a code change: per variant clear the children,
    copy layout / padding / radius (+ their variable bindings) / fills / effects from `libVariant.createInstance().detachInstance()`,
    move its children in, re-add the extra parts (count badge). Every instance on every board updated (Filter button: 23
    instances on Permits + Requests) with no swap and no lost connector. After the refill set `primaryAxisSizingMode = "AUTO"`
    again (the detached frame brought FIXED widths) and text WIDTH_AND_HEIGHT.
  - Adding a Screen axis to an existing set: rename the variants („State=Default” → „State=Default, Screen=Desktop”), clone them
    into the set as Mobile and refill those from the phone library variant — instances keep pointing at the renamed variants.
    Update every builder lookup that matched the old variant name (`"State=" + …` → `+ ", Screen=Desktop"`).
  - HUG menu + FILL items stays at the width of the non-FILL children (the group labels) → measure the widest item with items HUG,
    fix the menu width (+ padding), then set the items FILL (sort menu 204 = code 206).
  - Coordination: when the coordinator announces a second phone change, park the phone redraw and make every piece that does not
    depend on it (components, builder branches, desktop) — then one re-capture + one rebuild pass. Rebuilding a block deletes the
    connectors attached to it → re-run the idempotent arrow pass (names „SM · …”) after any rebuild.
  - Exporting a stored builder (> 20 KB) to the repo: return ≤ 19 500-char slices tagged {k}, then read them from the SUBAGENT
    transcript (…/<session>/subagents/agent-*.jsonl — the parent session file does not contain them).
- 2026-10-20 · Same job, phone pass (66edd6a8) + sort picker (5de836ba): 14 phone list frames + Permits phones redrawn,
  sm-01f / sm-01t / sm-01m added (column 01 = 10 blocks, board = 47):
  - **Removing a node deletes every connector attached to it** — not only block rebuilds: replacing the Permits phone chip row
    deleted the arrow that started on a chip (1076:15955). Before removing any child, list connectors whose endpointNodeId is
    inside it, and recreate them from the replacement control (clone a surviving connector as template; never rely on one id).
  - **Restructuring a component variant (reparenting children) drops componentPropertyReferences** — snapshot
    `{nodeName: refs}` for the whole variant first, move / wrap the nodes, then write the refs back (the Mobile request / act
    row: tags + ⋮ on row 1, title 16/24 on row 2, meta on row 3). After any layoutMode change re-set every child's sizing.
  - **Radio menus / sheets** (sort picker): desktop = local Sort menu with library radio-label rows (32 · r6) + 12/16 medium
    secondary group labels; phone = Sort sheet content component swapped into the library bottom-sheet Content Slot (radio rows
    48 · 12 8 · r8 with the label text style switched to 16/24, selected = medium; „Ordine” = library segmented-control
    Mobile, 2 segments; the sheet's own action = „Aplică”). Code 345 vs Figma 333 is the line-height of the group labels — declared.
  - New blocks get new pagers → re-run the whole-pixel fix (desktop range text FIXED 70, phone 1 px right padding + range 70) or,
    better, keep it in the builder; the gate audit catches it as „fractional”.
  - Jump markers are absolute in the section → after inserting blocks and re-placing a column, delete and redraw them with the
    arrows (one idempotent pass; names „SM · …”).
- 2026-10-20 · Copy-only code change (219f1f9c, draft rows „Creată …” without „· se elimină pe …”): edit the TEXT property on
  every Request row instance on the board (98 rows in 13 blocks, desktop + phone), the block note that quotes the old text, and
  the stored canonical rows („cab”/„smrows” + out/smrows.json) so a later rebuild does not bring it back — no rebuild, so no
  connector is lost. Shorter phone meta = shorter screens → restack every touched column to gap 240 / bottom 80 and move the
  jump markers (absolute) with their block.
- 2026-10-20 · Sort sheet v2 (e9d596eb, „Ordine” = radio rows like „Sortează după”): the phone sheet content is a LOCAL
  component per block („Sort sheet content · sm-01f / sm-01t”) swapped into the library bottom-sheet slot → edit the component
  in place (clone the key group, keep 2 rows, re-label, re-select, switch the 16/24 text style to medium on the selected row) and
  every block updates with no rebuild and no lost arrow. Patch the stored builder + repo copy + the DOM extractor selectors in
  the same pass (keys / orders split by input name). Measure the code once with CDP (`node --experimental-websocket` on Node 20
  for cdp.mjs) before declaring a height delta: 676 vs 672 = library sheet action 88 vs code footer 84.

- 2026-10-21 · Alignment on Classifiers 03c (user: „resolve here the alignment”, node 10547:213285 = `svc/switch-label` „Stare finală”
  in the „Valoare nouă” drawer, demo clf-03c). Cause: the MAIN `svc/switch-label` 9563:18803 had counterAxisAlignItems MIN → the 20 px
  label sat on the top edge of the 28 px switch (label-only rows) and the switch sat on the top of the 42 px label + description (474
  rows on Services 454 / Tariffs 6 / NT 6 / Local components 2). Code = `.e-permits-toggle { align-items: center }` (measured clf-03c:
  toggle 24 at y 678, text 20 at y 680). Fix = main CENTER → all 476 instances follow (label-only: label y 0 → 4; with description:
  switch y 0 → 7), 0 fractions, 0 alignment overrides left (the 4 Recipient-rule modal rows already carried a CENTER override). Same
  column: 03b 10547:213279 follows. Lessons:
  - **Fix alignment in the main when the row is a component**: census instances first (`getInstancesAsync`, per page, overrides on
    counterAxisAlignItems), check the code has no contextual override (grep the class across css/), then one property on the main.
  - **get_screenshot can render a STALE layout for instances whose visible children differ from the main** (main shows the
    description, instance hides it): after the main change, the label-only instances rendered the switch at the main's y 7 (box 35
    high) although the plugin read y 0 / h 28. Toggling the instance's own BOOLEAN on → off (`setProperties`) forced the relayout and
    the render matched. Re-screenshot after any main-level layout change and nudge the instances that differ from the main.
  - Left (reported, not changed): Text gap 2 between label and description vs code 0; library switch 48×28 vs code toggle 44×24.
  - No Agent tool in this session → stored `ghs/audit` on main + instance + 03c section + Tariff / Recipient-rule samples, and
    `qsweep/audit` on the 03c drawer: 0 findings.
- 2026-10-21 · **Padded children → parent gap 0** (user on Classifiers 04c 10192:11618: „if the wrapper itself already has padding,
  do not use a gap between, because it's too much space”). Pattern: `user-profile__panel` / `clas-create` (VERTICAL, gap 24 bound
  spacing-24) stacking transparent `dosar-profil__section` wrappers that carry paddingBottom 16 → 16 + 24 = 40 between a card and
  the next section heading (ink ≈ 58). Fix = parent itemSpacing bound to **spacings/spacing-0** (Foundations „3. Sizes”, import by
  key via teamLibrary) → box 16 / ink ≈ 34, still ≥ 8 and on the 8/16/24 rhythm. Changed on the Classifiers board (10177:1912):
  04 10189:11577 (12 → 0; add-row 28 → 16), 04a 10190:11605, 04c 10192:11618, 04d 10213:13868, 06a 10196:11809, 02f 10205:13243
  (24 → 0). Raw captured frames, no component to fix. Lessons:
  - **Detect it with a scanner, not by eye**: VERTICAL frame, itemSpacing > 0, ≥ 2 visible flow children, and a TRANSPARENT child
    (no visible fills / strokes / effects) with padding facing its neighbour → report `childEnd + gap + nextStart`. Cards with a
    border / fill don't count (their padding is inside the box). Horizontal hits (pagination actions, title-row button wrappers)
    are not this rule — leave them.
  - The code has the same doubling (clas-profile panel gap 24 + section padding-bottom 16; clas-create gap 24) — the user's rule
    overrides the code here; report it for proto-engineer, don't change code. Parent padding stacking on the last child's padding
    (panel pb 48 + section pb 16) is also in the code → kept.
  - Shrinking panels shrink HUG screens → restack the column by the shrink (keep the board's existing 240 / 242 gaps, move only
    the blocks below; connectors follow).
  - The gate audit's `tight-gap` then flags every section „gap 0” — false positive; verify with absoluteRenderBounds
    (card bottom → next heading box 16 / glyph 34). Its clipped-content found a real old bug in 04c / 04d: the Family / Category
    row was 483 + 16 + 483 = 982 in a 980 row (panel 1022 vs code 1024) and clipped the Category field's right edge → both FILL
    (482), clip off. Read every clipped-content finding on the node the user pointed at.
  - The other agent's node (10547:213285) sat in block 03c → skipped the whole block 03c (its scan had no hit anyway).

- 2026-10-21 · Classifiers side menu (user: „something is wrong with the side menu”, GEAP 10177:9652 = clf-07). The local-admin
  sidebars (blocks 01b / 07 / 07a, instances 10177:2430 / 10177:9666 / 10177:9906 of the local `sidebar-public-services`
  8993:35379) showed TWO defects against the code (data/e-permits-roles.json `local-admin` = one group „Administrare” with only
  „Clasificatoare”; CDP probe of clf-07: Administrare at aside y 66, one 36 px link): (1) „Fluxuri de lucru” visible — the item was
  added to the MAIN on 2026-10-15 visible by default, so every instance that had hidden the other admin items still showed it;
  (2) an empty 50 px gap above „Administrare” — the „Locul de muncă” group frame (8816:120892) stayed visible with all its items and
  its title hidden. Fix = instance overrides (group frame + Fluxuri item hidden). Plus a MAIN defect: the „Fluxuri de lucru” item
  11526:59236 was FIXED 40 high (icon at y 10) while every item is HUG 36 (code `.e-permits-shell__nav-link` 36) → HUG, all 345
  instances follow (sidebars are FILL, no block moved). Lessons:
  - **Adding an item to a shared nav main = census the role variants**: instances that hide items per role (local admin, specialist)
    get the new item VISIBLE. After adding, walk every instance and hide it where that role's code menu has no such item.
  - **Hidden children ≠ hidden group**: a group frame whose title and items are all hidden still takes its padding + container
    height (50 here). Hide the group frame itself. Census rule: visible group with 0 visible items = bug.
  - A new item cloned into a main can arrive with FIXED height from the source; check its sizing against its siblings.
  - Census tool stored in figma.root shared plugin data „sbfix”/„census” (run with PAGES = page ids; flags empty groups, item height
    ≠ 36, local-admin Fluxuri, sidebar ≠ parent height). Whole file = 345 sidebars on 8 BO pages, 2–8 pages per call were safe.
  - Drift found, not changed: code `specialist`/super-admin menus now start with „Dosare noi” (badge 8, commit 70fc5204, ghișeu) — no
    Figma sidebar has it (main has Dosarele în lucru / Dosare cu alerte / Dosare finalizate). Needs a PO call before adding it to
    the main (it would show on all 345 instances). Stored gate audit on 07 / 01b / 07a: 0 findings in the sidebars; the Main content
    keeps the captured baseline (fractional y, gov-bar text #000, truncated th „Termen de examinare (zile)” / „Frecvența controalelor”,
    breadcrumb separators cut by their item).

- 2026-10-21 · Breadcrumbs = the library component everywhere (user: „let's use the breadcrumb as a component — this is the component,
  why invent it?”, Components 232:5282). Census of the five files (tools/figma/breadcrumbs/census.js: walk without descending into
  instances; lib / older-copy / local / loose `.breadcrumb-item` / raw by name + by „texts + chevron” shape). Non-library found → replaced:
  GEAP 34 → 30 (Classifiers 22 → 22 raw captured `breadcrumbs` frames, Services 08a/08a1/08a2/08b 4 → 4, User Management `Profile / Header`
  set 10133:184694 4 variant mains → 4, the 35 instances follow; Classifiers 07 10199:11797 → 12216:1374 after the side-menu agent released 10177:9652 (b1e6873a) —
  wait for a busy node, then finish it with the same recipe; left: FOD Address C01/C01a/C01b „Navigation - Breadcrumb” = context skeleton by rule); EVO Cabinet 0 (66 live instances correct, archive
  sections untouched); FOD 0; eKYC 0 (124 instances, gap 8); EVO-WEB RAP 0 (101). Lessons:
  - **Check before rebuilding**: most boards already used the library (builders place it); the raw ones were old html→Figma captures of
    `nav.breadcrumbs` (list › item › link / current › text, `breadcrumb-sep` = a rotated 20/chevron-bottom). Frames named „Breadcrumbs” with
    ONE child are wrappers around the library instance (Form Builder, Editable Grid, FO / RAP title sections) — not raw.
  - **Fix a local look-alike in the MAIN** when instances carry no text override on the trail (read every instance's nested text by id
    suffix first): replacing in 4 variant mains updated 35 screens with one call and kept every other override.
  - Replace recipe (replace.js): labels from the visible texts in DFS order, last = current when its frame is „…current…” or Medium;
    insert at the same index, HUG × HUG (the captured frame was FILL 1328), re-point connectors whose endpoint sits inside, then remove.
    Instance text can't truncate (no maxWidth / resize on sublayers) → write the code's 30ch ellipsis into the label, measured with a
    temporary Onest text (30 × „0” = 280 px).
  - The BO header gap stays 8 (`.e-permits-page-header__heading`); only the public header (Cabinet / RAP) is 16 — both verified.
  - Not breadcrumbs (left, reported): the BO top-bar back „← Înapoi la clasificatoare / utilizatori” is a raw captured `user-profile__shell-back`
    (code = button-text-circular) on 22 Classifiers + 1 User Management screens — a shell-header job; hidden Desktop instances on FO phone
    headers (Post-processes 02a, FO 09 F1c) are invisible leftovers.
  - Session restart mid-job: the Figma writes were saved; re-verify with the census before continuing. A read-only audit over 13 GEAP pages
    in one call dropped the transport — 3–5 pages per call. Build audit root lists from the returned ids, never by guessing a step.
  - No Agent tool in this session → figma-audit rules on the 25 changed headers + the UM set: 0 findings from this change (pre-existing:
    Classifiers 04d aside „btn · Archive” cut by the „↕ 4” wrapper).

- 2026-10-21 · Trajectory line too far from the check icons (user: „make the line closer to the check icons … too much gap”, eKYC
  10864:31429 = Sessions S01b ek-05; then „not only in eKYC but everywhere”). Cause: the horizontal connector sat BETWEEN the step
  boxes with 8 padding, and a step box is as wide as its label → icon ↔ line = (label width − 24) / 2 + 8 = 20…61 px (eKYC 42–61,
  dossiers 21–35). The code has the same gap (css/trajectory.css `.step + .step::before` margin 0 8 between the boxes; measured
  ek-05 19.9–60.8, dos-01 20.8–34.8); the vertical layout already had 8 (Figma + code sm-03). Fix in the 4 local mains (one per
  file, no library): horizontal step variants got a `rail` FILL (gap 8 bound spacing-8) = `line-before` wrapper · marker ·
  `line-after` wrapper, each wrapper holding an EXPOSED connector instance (`Line before` / `Line after`, visibility bound to new
  BOOLEAN props), min width 40; horizontal connector variants padding 8 → 0 (spacing-0). Then a row pass per file: first step
  Line before off, last Line after off, half-line Reached = the neighbouring connector's Reached. Result: 8 on every side
  (eKYC 250 / 250 measured, GEAP 314 / 314), line continuous. Instances: eKYC 154 steps / 29 rows (Review, Sessions, Audit),
  GEAP 190 / 33 (Dossiers states 144, FO 09 F8–F8e 100 incl. vertical, Post-processes 28), FOD 6 / 1 (G7d), Cabinet 32 / 6
  (↳ My requests); vertical instances (82 GEAP, 14 FOD, 232 Cabinet) untouched; EVO-WEB has no trajectory. Snapshot (marker
  main + texts) before / after: 0 diffs. Lessons:
  - **A gap that depends on content width can't be fixed with padding** — move the line ends INTO the element whose centre they
    must follow (half lines in the step, wrappers keep the marker centred when a half is hidden: hide the inner instance, never the
    wrapper, or the marker slides to the edge).
  - **Figma FILL children never shrink below 1 px**: a 40-wide step (24 + 2 × 8) still lays out 1 + 8 + 24 + 8 + 1 = 42 → the rail
    overflows its step by 1 px each side (same-colour overlap on the connector, invisible, no clip). Steps that were narrower than
    40 („Emis” 31 / „Semnat” 34) grew to 40 → re-snap those rows' connectors (GEAP 5 rows, FOD 1, Cabinet 4).
  - Exposed nested instances + BOOLEAN on the wrapper's child keep per-row colour control without new variants (no 4 × 7 matrix).
  - Patch the stored builder („traj/lib”) in every file with the same string replaces + `eval` syntax check, and the repo copy
    (tools/figma/trajectory/trajectory-set.js: fillStep(…, hConn), propKeys before / after, buildCard sets the halves).
  - Audit: the only finding is `fractional` in the mains (halves 18.5 next to the already-declared marker x 26.5 in odd-width
    steps) — same declared half pixel as the code's centring.
  - Code value for proto-engineer: horizontal line must stop **8 px (spacing-8) from the 24 marker box** on both sides
    (visible glyph gap 10, as vertical), step body min-width 40; today it is 20–61.

- 2026-10-21 · **EVO Cabinet boards = the GEAP block anatomy: grey note, „Prototype ↗” link in the label** (user on ↳ My requests
  1122:6538: „the structure … is different from GEAP: the note under the screens is yellow …; the link to the prototype on the top
  of the screens is missing”). Measured GEAP first (F1 10815:25438, Tariffs 01 9622:1681; census of 9 pages = 538 notes, ALL
  background/base/secondary #F5F5F5 — no GEAP note is yellow; the yellow one was Cabinet's own `Board / Note`). GEAP anatomy:
  block VERTICAL gap 16 (spacing-16) › `Screen label` HORIZONTAL gap 12 CENTER = `ID` chip frame (background/brand/default, p 4/12
  spacing-4/-12, r8 radius token, text Desktop/Body/Small 500 text/base-inverse/default) · title H4 text/base/default · Status ·
  `Link · prototype` „Prototype ↗” (Desktop/Body/Small, text/base/tertiary 9d5ad1d8…, UNDERLINE, URL hyperlink ?state=<id>) ›
  `Screens · desktop + mobile` gap 120 (spacing-120 3a33dc48…) › `Note · <id>` frame FILL/HUG, background/base/secondary 2099ba93…,
  p24, gap 12, r16 = tag-filled Strong Neutral MEDIUM „NOTE DEV / PM” (key 207b66da…) · „<id> · title” H4 text/base/default
  (e56e58fc…) · text Desktop/Body/Small text/base/secondary. Cabinet differed in: amber note (fc1ea032…), Accent Small tag, gap 8,
  Small-500 title without the id, link „Prototype ↗ · <id>” at the BOTTOM of the note, black tag-filled Small ID chip (20 high),
  no link in the label, screens 80 apart. Fix = the two Cabinet mains (`Board / Block label` 1052:210 → ID chip frame bound to
  the `ID` prop + `Link · prototype` text; `Board / Note` 1052:232 → restyled, link removed) → all 66 blocks (47 My requests +
  18 Permits + 1) follow; per instance: `ID` prop = block id, link hyperlink override (works on instance text:
  `text.hyperlink = {type:"URL", value}`), note Title prop prefixed „<id> · ”. Then screens gap 120 per block, columns restacked
  at 240 (notes 8 px shorter), Jump markers +40 x and moved with their source block, sections refit, 3 fractional y rounded.
  Lessons:
  - **Read the user's „X in GEAP” against the file, not the sentence**: census the property across GEAP pages before copying a
    value; the evidence (grey everywhere) decided, and the report says so.
  - **Fix the board pieces in the MAIN**: one main change + three per-instance props updated 66 blocks with no rebuild and no
    lost connector (0 unattached after). Replacing a child in a main drops instance overrides on it → snapshot the values first
    (IDs lived as overrides on the old tag instance; the unused `ID` prop said „pp-01” everywhere).
  - Widening a block (gap 80 → 120) moves the phone 40 right: move every absolute neighbour on that side (Jump markers) and check
    section width + overlaps; RIGHT-magnet connectors follow by themselves.
  - Builder updated (tools/figma/cabinet/screens.js + stored „cab”/„screens”, compile-checked) so a rebuild keeps the anatomy.
  - No Agent tool in this session → stored gate audit (`qsweep`/`audit`) on both mains + the label / note of sm-01, nt-01d, pp-01,
    sm-04c: 0 findings; census 132 / 132 label + note instances correct; links curl 200, all 66 states in the live demo-states.js.


- 2026-10-21 · EVO Cabinet toolbar + card triggers + local components page (user via coordinator; file iitScYOwMYjDayuyrm3750).
  (1) List toolbars on ↳ My requests + ↳ Permits: 86 local look-alikes replaced → „Filtre” = library **filter-chip** (9901c458…;
  user changed the plan mid-job from Button to chip): 52 instances (My requests 37, Permits 15), height overridden 40 desktop / 48
  phones (chip is 36 only), desktop radius bound to border-radius/radius-6 (= the Medium button), phones keep the pill; icon =
  Foundations „filter-2, sort” 7b235483… (= code icon-filter-lines; the library 20/filter is the SLIDERS glyph); open = State Focus;
  active = black + icon + count (6 instances). „Sortează” = library button-filled-rectangular Neutral Trailing Medium (desktop) /
  button-filled-circular Neutral Trailing Large (phones), open = State Active + effect style Focus Ring/Medium (97cdddcd…): 34.
  Local Filter button 1056:275 · Filter pill (phone) 1141:39475 · Sort trigger 1119:3048 deleted at 0 instances. Repo:
  tools/figma/cabinet/swap-toolbar-buttons.js (the Button pass; the chip pass is in this lesson). (2) Card triggers in the MAINS:
  Request row 1117:3222 ⋮ = button-filled-rectangular Neutral Icon=Only Small (20/more-vertical in the 16 slot), Act row 1055:1380
  „Postprocese ⌄” = rectangular Neutral Trailing Small (was circular „Inițiază un postproces”), both ABSOLUTE in the card corner,
  constraints RIGHT/TOP, 12/12 desktop, 10/10 phones; line 1 reserves trigger + 8 (paddingRight 40 bound spacing-40 / 133). Act row
  rebuilt to the code anatomy (desktop p16 r16 stroke 1.5, icon inside the title line, meta full width under the icon; phone:
  „Line 1” = tags with the 24 icon ABSOLUTE at y −2 + paddingBottom 2 = the code's icon overhang → title at 46 like the code).
  97 request rows whose only action is „Detalii” got a per-instance nested swap to Neutral Leading Small „Detalii” + 24/eye-open.
  (3) Tacit acts: 16 „Valabil” tags next to „Aprobare tacită” hidden (act rows + pp-01l profile meta). (4) 🧱 Local components:
  67 components, 34 overlaps (whole sections had components stacked at 4680,0) → 9 Sections „Components · <group>” (title H4, 80
  padding / gap, wrap 5600), 0 overlaps / 0 fractions / 0 loose; empty holders removed; unused = Date sheet content sm-01g / sm-01h /
  sm-01p. Lessons:
  - **Library button / chip instances collapse when set to HUG vertically** (the variant's FIXED height is lost → 20 px high). After
    `createInstance()` in an auto-layout row: `layoutSizingVertical = "FIXED"; resize(w, variant.height)`, then HUG horizontally.
  - **Absolute nested children can't be moved on an instance** (`x` = „relative-transform cannot be overridden”). Put the corner
    trigger in the MAIN with constraints RIGHT/TOP: a per-instance swap to a wider button keeps the right offset automatically.
  - Library filter-chip gaps (report): one height (36), On+Leading has no Counter Badge and On+None has no icon → active chip =
    Off+Leading instance with the On variant's paints copied (surface / label / icon tokens) + the On variant's numbered-badge.
    Ask the library owners for a counter on Mode=On, Icon=Leading.
  - `strokesIncludedInLayout` differed inside one family (Act desktop true / stroke 1 vs Request false / 1.5) → offsets measured
    from the frame edge only line up when the family shares one convention; check it before placing absolute children.
  - Row height changes shift every block → restack from an ordered list; the boards had drifted gaps (114 – 632) that the pass
    normalised to 240 (jump markers moved with their block). Builders that reference the deleted locals (screens-sm.js /
    screens.js `filterBtn` / `sortTrigger`, stored `cab`/`ids` smSection 1117:2999) need the library pieces before the next rebuild.
  - No Agent tool in this session → figma-audit rules run read-only on the 4 toolbars + both row sets: only declared values (meta gap
    18, reserve 133, icon overhang 2); 0 icon ≠ label, 0 unbound colours, 0 fractions.

- 2026-10-21 · Document viewer v2 (user reference GEAP 11366:6892, code 8c9507bc doc-viewer-v2) in 4 files. GEAP: set
  `Modal content / Document · details` 12234:357447 (Signature On / Off) + `Document viewer / Signature tray` 12234:357237 →
  Dossiers 04e/04h/04i/04l/04o/04p/04q/04s/04t (tray, code signer + time per state) and 04r (Off, unsigned proiect); Ghișeu
  gh-07a3 / gh-10d (raw dialogs: canvas 554 + tray, Container gap 12, subtitles without signer / date) and gh-07a / 07a2 (canvas
  r16 + outline only). Cabinet: tray 1176:56463, pp-01z converted („Vizualizare act”, Descarcă + export icon, canvas 501 + tray),
  pp-01m rebuilt as the same viewer (new `A4 act page · pp-01m` 1178:3516, `Doc canvas content · pp-01m · Desktop / Mobile`
  1178:42122 / 1178:42380, phone screen 1164 → 812). EVO-WEB: tray 22242:11397 + RAP `Document modal (MDocs act)` set edited in
  place → 20 screens (rap-03a…03f, 03k, 03l, 03s, 03t). FOD / eKYC: no document viewer. Lessons:
  - **A FIXED-height main does not reach a slot instance**: the doc-details instances inside the local Modal's content slot are
    FIXED at the slot's own height (243 after my change) — a fixed main + FILL canvas collapsed every modal to 425. Use a VARIANT
    for the size difference (Signature On = canvas 554 + tray, Off = canvas 632), main HUG, then `layoutSizingVertical = "HUG"` on
    the nested instances. `combineAsVariants` keeps every instance (incl. the INSTANCE_SWAP „Content” references); it needs
    `setCurrentPageAsync(<the components page>)` first („Grouped nodes must be in the same page as the parent”) and renames
    property keys (Page#11366:0 → Page#12234:2) — read keys by prefix.
  - In a main that is NOT behind a slot (RAP set, fixed Body), FILL canvas + a tray bound to a BOOLEAN works: hiding the tray gives
    the unsigned full-height window with no variant.
  - Instances can carry an itemSpacing override (04q / 04s had gap 0) — after changing a main's stack, read every instance's gap.
  - **Scratchpad is shared with other agents of the session**: my `dv/probe.mjs` was overwritten mid-job by another agent (same
    folder name) → use a unique folder (`figdes-<job>`). The shared CDP helper's port range (9100–9500) collides with other agents'
    headless Chromes → the probe exited silently (exit 0, no output: the WebSocket never opened). Private copy with ports 13000+.
  - Probe the CODE per state before drawing (dialog / canvas / card rects + card text): it showed the signer per state (MPower, MPay,
    Ana Damian…), that uploads use the same viewer in v2, that 04r is unsigned, and that the Cabinet „Vizualizare act” data modal
    no longer exists — „Vezi act permisiv” opens the A4 viewer (pp-01m / 01n / 01z) and pp-01x / 01y are now profile page states.
  - Removing an old modal deletes its connector („pp-01m → pp-01z”); here the flow no longer exists in code, so it was dropped and
    the Start here says so. Check connector endpoints inside a node before removing it, always.
  - Section-grown components page: growing one section pushed it into the next → restack sections by y (80 apart) after any
    component placement.
  - Declared baseline (audit): rescaled A4 pages fractional + clipped by the scrolling window, A4 print paddings 68 / 60. Left for
    other jobs: GEAP local Modal footer = Large 48 buttons vs code 40 (dossier modal 814 vs 804); Cabinet library modal header 56 +
    subtitle row vs code 108 to the canvas (dialog 755 vs 800); phone × 32 vs the sheet-header rule 40 / 24 (Cabinet „Close button ·
    phone” 1175:45951 exists from a concurrent job, not yet applied to these screens; RAP / Cabinet library modal headers).
  - No Agent tool in this session → figma-audit rules run by hand per file on every changed node: only the declared A4 baseline.

- 2026-10-21 · Phone sheet / dialog header in all five files (user on Cabinet 1151:4859 sm-01f: „remove the line and don't use it above,
  as we discussed in code”; code 62a32f58, css/modal-phone.css section 9). Rule: no drag handle, title 16 from the top, title + × on one
  top-aligned row, × 40 / icon 24 centred on the title's first line (12 / 16), 8 under the sheet header, sheet titles 24/32. Changed:
  Cabinet 10 sheet-content mains (Sort sm-01f / sm-01t, Filter sm-01g / 01h / 01p / pp-01s, Date sm-01g / 01h / 01p, Act post-process
  sheet) + Drag Handle off on 10 library bottom-sheet instances (676 → 640 etc.); GEAP Act post-process sheet (12183:2574 / 2634 + 02a
  instance), FO 09 F4a–F4g add-file phone modals (raw 32 „Close” frames → set; titles 22/30 → 24/32), F8d / F8e certificate sheets;
  eKYC 3 „Filter sheet content · ek-04j / 04l / 04m” (16/24 → 24/32; unused on boards — desktop-only screens); RAP 4 filter sheet contents
  + 4 sheets (handle off), act document modal 22089:209140, rap-03 library modal header swapped to `Modal header · phone`; FOD act sheet
  1039:203 / 263 + 5 Attachments add-file phone modals (384:*). Left: Cabinet pp-01m / x / y / z library act modals — the doc-viewer agent
  was rebuilding them during the job (1071:8753 vanished → 1178:46162); recipe = tools/figma/sheet-header/modal-header.js. Lessons:
  - **The library button locks the icon size**: swapping / `swapComponent` a 24 icon into button-filled-circular keeps it 20 (16 on Small)
    and `resize` / `rescale` on the nested icon throws „cannot be overridden in an instance: size”. A 40 / 24 × needs a LOCAL set built
    from the detached library variant (bindings kept) — check the icon size before promising „library only”.
  - **Absolute × in an auto-layout header reproduces the code exactly** (library modal header = padding-right 64 = 8 + 40 + 16, × at
    12 / 16): no wrapper, title FILL wraps under the × column, the Resetează button stays in flow at y 16. Compute y from the title's
    absoluteTransform after setting the padding (layout is recomputed on read).
  - The library bottom-sheet has the boolean `👁️ Drag Handle#437:88` — turn it off on the instance (and in local mains that nest the sheet,
    e.g. Act post-process sheet; instances follow). Sheet heights hug → −36 each; sheets docked with Overlay align MAX need no restack.
  - A swapped nested header (`.modal-header` → local component) keeps the library's FIXED height and gap overrides → reset
    `layoutSizingVertical = "HUG"`, `itemSpacing = 0` after `swapComponent`.
  - Census per file = library bottom-sheet instances (+ Drag Handle) + × buttons in 300–430 wide ancestors + raw frames named
    close / modal-close (tools/figma/sheet-header/census.js, census2.js, stored as „sheethdr”/„census”, „census2”, „fix” in each file).
    False positives to skip: file-row ×, search clears (20), „Header Divider” 54–63 × 4 page dividers on FO / MSupport / Drafts pages.
  - Before editing nodes in a column another agent works on, re-read the ids: one modal id disappeared between census and fix.
  - No Agent tool in this session → stored audits (GEAP „ghs/audit”, Cabinet „qsweep/audit”) on the changed mains / screens: 0 findings
    in the changed nodes (background FO page: pre-existing step-mobile fractions, captured gap 6); every new × verified 40 / 24, whole px,
    16 from the right, y 12 (24/32) or 8 (16/24).
- 2026-10-21 · Same job, follow-up after the doc-viewer agent (0fa8626d): Cabinet pp-01m phone modal 1178:46162 and pp-01z 1074:12908 →
  nested `.modal-header` swapped to the local `Modal header · phone` 1183:4330 (Cabinet section 1175:45911; title 24/32 = code FO shell,
  × 40 / 24 at 319 / 12, header 48 + content pt 8 = the code's subtitle at 56). pp-01x / pp-01y skipped on purpose (old act-data dialog,
  to be redrawn as act pages). Stored „qsweep/audit”: 0 findings. Lesson: when a coordinator parks nodes for another agent, keep the
  fix as a re-runnable script (modal-header.js) so the hand-back is one call on the new ids.

- 2026-10-21 · Copy value = ONE component in all five files (user: „the copy component, also do it accurately in Figma … we need
  a component; use it everywhere”; code 77957dc1). Ids in the Library table. Replaced / converted: GEAP 1,047 `copy-block`
  instances upgraded in place (692+ icon-hidden → Compact, 320 → Default with a 16 icon, 0 text diffs), Form Builder's duplicate
  local `copy-block` 8715:79003 (53 instances → Copy value, set deleted; header meta „Information Row” ×72 → Default), raw frames →
  instances: Services IBAN 82, User Management IDNP 10, Post-processes `fo-copy-value` 9, FOD Pattern Requestor 8 (G7d + P1/P2),
  FO 09 F8d / F8e phone certificate 2; GEAP Act row Number (37 rows). Cabinet: own `Copy value` 1117:3000 upgraded in place
  (≈180 nested uses in profile headers / detail rows / identity cards), Request row (308) + Act row (132) Number → Compact.
  FOD: new set, G7d 2 frames, Act row (4). eKYC: new set, 145 captured „Copy (copy)” frames → Default (code renders header meta
  and detail rows with renderCopyCode / renderProfileCopyCode). RAP: `RAP / Copy value` (Kind × Show icon, 27) → Copy value
  (Identifier / Act number → Compact, Profile → Default), old set deleted. Example states: Cabinet sm-03 header Hover, sm-01 first
  row Copied, GEAP User Management U03 IDNP Hover. Lessons:
  - **A „deleted” main can still be the file's busiest component**: `copy-block` had parent null (removed from the canvas) yet 1,012
    live instances and a published key. `holder.insertChild(0, set)` restores it; then upgrade IN PLACE (rename variants
    „State=Default” → „Type=Default, State=Rest”, clone new variants, add the TEXT property last and bind every variant's text) —
    instance text overrides survived the new property (snapshot of 1,047 values: 0 diffs). Census main components with
    `getInstancesAsync` before building a new one.
  - **Hover wrap without moving the text** = the code's negative margin: the variant stays HUG with padding 0 and the grey wrap is
    an ABSOLUTE rectangle at x −8 / y −4, w + 16 / h + 8, constraints STRETCH (follows every value length); the tooltip is an
    ABSOLUTE instance at y −32 with constraint CENTER. Rest / Hover / Copied have the same box → swapping State never shifts layout.
  - **Library tooltip has no plain / icon variant** (Small = 14/20, arrow, FIXED 220) → `Copy value · tooltip` built from the
    DETACHED library Small variant (`createComponentFromNode(Bubble)`, arrow dropped, 12/16 Caption/Medium, p 4 8, r4 → 61 × 24;
    Copied = 20/checkmark-small green-400, padding 2 8 2 4, gap 2 → 71 × 24 = the code to the pixel). Declared as a library gap.
  - **Hidden icon = Compact**: designers had hidden the icon on table / list uses → that boolean was the reliable signal; switch the
    non-nested instances (`!id.startsWith("I")`) only — nested ones follow their mains (852 → 237 left to check by hand).
  - **A text property can't drive a nested instance's text** → list rows get an EXPOSED nested Copy value („Number”), the row's
    Number property is deleted, and each row instance's old value is written into the nested instance from a snapshot (mains /
    top level first, then „I…” ids; verify after). Value + visibility refs survive; screens did not move (Rest = plain text).
  - **Clipping hosts hide the wrap and the tooltip**: act / request row `Meta` (leading-dot clip) and captured
    `dosar-profil__row-value` clip. Rest is unaffected; for a drawn Hover / Copied example turn the clip off on THAT instance only
    (the code opens its clip-path the same way). Also set the example's text to text/base/default (the per-instance tertiary fill
    override beats the variant colour).
  - **Don't draw a hover in a block that already shows another interaction** (Dossiers 02a / 02k had the action menu open) — pick a
    calm profile block.
  - Check the CODE per list before „make every list number copyable”: the Ghișeu registry renders `row.nr` as plain text
    (js/ghiseu.js:519) → its 729 numbers stay plain; FO summaries copy only „Numărul dosarului” / authorization „Cod”.
  - Left, reported: BO lists whose numbers live inside library `table-cell` instances (Dosare / Sarcini / Cod / IDNO; eKYC Clienți /
    Cazuri) can't host a nested instance — visually identical at Rest; old `copy-block` instances in Cabinet „Archive · before 2026-10”
    untouched; GEAP index line „Index · Copy value” landed inside the horizontal Meta row of 📍 Start here (move it under Meta) — the
    Figma MCP plan limit stopped the session before that fix.
  - No Agent tool in this session → mini gate audit (fractional / unbound fills / unbound padding-gap / text styles / auto-layout)
    on the 10 sets in five files: 0 findings; screenshots of every replaced context matched the code.

- 2026-10-21 · „N modificări nesalvate” → review in Figma (user: „make sure we also populate it accordingly in Figma”; code 9ed3a52d).
  New local set family (ids in the Library table) + blocks: Services 02x 12241:530709 / 02x1 12242:117390 / 02x2 12242:119732 /
  02x3 12242:121775, 09n 12243:368415 / 09n1 12243:369378; Classifiers 04e 12243:280397 (+ status on 04d); NT 04d 12243:363278 /
  04e 12243:364135 (+ status on 02d); eKYC C02s 10904:163208 (+ save-bar status on C02i / C02k / C02q); Users U03f / U05f / U05h /
  U05i / R01b now use the same review instance. Tools tools/figma/unsaved-review/ (README, blocks.js, probe-content.mjs,
  probe-modal.mjs); swap-to-instances.js maps dot + „N modificări ne…” text → Header status. Lessons:
  - **Check the „existing” component before reusing it**: the user/role review was a generic local Modal with a raw close frame,
    footer buttons Large 48 (code 40) and per-state raw „Modal content / Uxx” stacks → a proper family (status / row / group /
    review) built once, then the old blocks swapped to it (connectors re-pointed by endpoint id before `remove()`).
  - **Probe the code for content, don't type it**: probe-content.mjs returns subtitle, groups, rows, tag tone and header status per
    state in one run; the heights then matched the code (row 72 / phone 116, group 115 / 159, modal 551 vs 553 = the code body's
    two transparent 1 px borders).
  - **Swapping a raw frame inside a main used by many instances**: snapshot the instances' text overrides (root plugin data), swap
    in the main, expose the new instance, re-apply by id suffix (`n.id.endsWith(newId)`) — Main Navigation 10/10, Profile / Header
    10/10. A TEXT component property that drove the old raw text can't drive a nested instance → delete it when every instance used
    the default, set the default on the nested instance.
  - **Phone frames must be 375 before an instance FILLs them**: `createFrame()` is 100 wide; a FILL sheet measured there wrapped
    every text and the screens came out 1795 high. Resize first, then fill, then measure.
  - **Turning an ABSOLUTE frame into auto-layout moves it**: setting `layoutMode` on the scrim overlay (absolute in the screen, with
    an absolute modal child) shifted the overlay down by the modal's y (236–665 px) — the scrim stopped half-way. After any
    layoutMode change on a positioned frame, re-set x / y / size and re-check the screenshot.
  - Find screens by exact prefix: `startsWith("Screen")` matched „Screen label · …” first (eKYC call threw).
  - Columns that receive desktop + phone blocks need +455: Classifiers (05+), NT (03+) and eKYC C02 (7280 / 9440) shifted, sections
    widened, every connector force-re-routed (magnet flip).
  - Code vs brief: the brief said phone title 24/32; the code is 20/32 (css/modal-phone.css title line 32, H4 20) → Figma follows the
    code (H4 on a 32 line); reported. Code title 14/24 600 has no text style → Small 500 (declared). Group label gap 10 = code,
    off-scale, unbound (declared). Scrims stay the board's raw 40 % black (baseline).
  - Fixed on the way: Classifiers 04d / 04e „Arhivează” cut by its „↕ 4” wrapper (FIXED 49 + MAX align → HUG + MIN).
  - No Agent tool in this session → stored `ghs/audit` on the components (0 after binds) and blocks: left = cloned-shell baseline
    (gov bar, Body clip, dtpl internals, raw scrims); fixed: unbound gap 80 / sheet padding 16, overlay auto-layout, fractional
    centred modals on Users.
- 2026-10-21 · Same job, user decision: every phone sheet / dialog / drawer title = **20/32 semibold** (not 24/32; code phone-title-20-v1).
  Foundations has no 20/32 style (H4 = 20/28, H3 = 24/32) → the GEAP „Unsaved changes review” pattern: Desktop/Heading/H4 inside a
  „Title line” frame (HORIZONTAL, counter CENTER, minHeight 32, HUG height, FILL width) so the first line box is 32 and the × stays at
  y 12; wraps grow the line. Tool tools/figma/sheet-header/title-20.js (finds every non-nested Close button · phone, its header's 24/32
  title, wraps, restores componentPropertyReferences, re-centres the ×). Changed: Cabinet 9 sheet contents + Modal header · phone
  1183:4330 (→ pp-01m 1178:46162 / pp-01z 1074:12908); GEAP F4a–F4g headers (F8d / F8e were already H4 in a 32 frame); eKYC 3 filter
  sheets; RAP 4 filter sheets + act modal Mobile variant 22089:209130 (10 phone instances, titles kept) + Modal header · phone 22243:11544;
  FOD 5 Attachments modals. Act post-process sheets keep 16/24 (row-action rule). Audits („qsweep/audit”, „ghs/audit”): 0 findings.
  Lesson: before switching a title style, look for an existing pattern for the missing size in the same files (the unsaved-review
  agent had already solved 20/32) instead of overriding line height on a styled text.
- 2026-10-21 · Same job, follow-up (user: phone dialog titles stay 20/32; „all should have an empty state”):
  - **Check the code's empty state before drawing it**: the brief said „footer with only Închide”, the code keeps „Renunță la
    toate” + a DISABLED „Salvează” (#profile-changes-modal has one footer; save `disabled = !count`) → Figma follows the code;
    subtitle „{nume} · nicio modificare”; text per source (`emptyText`: Profilul este la zi. / Setările serviciului sunt la zi. /
    Setările clasificatorului sunt la zi. / Șablonul este salvat. / eKYC Formularul este salvat.) — listed in the component
    description so every page's note is covered. Probe = open the review state, click every `[data-change-undo]` in separate
    `ev` calls, then read the body (an async IIFE with the clicks inside never saw the modal open).
  - `Empty state · boxed` 11311:6217 (one component, 6 instances) → set 12250:339726 Size=Default / Compact (clone + combine;
    instances kept, texts kept; the clone's property refs re-bound by layer name). Compact = code .e-permits-empty--compact
    (24/20, title → text 4, 154 high). Centred 1 px spacers / HUG texts gave .5 positions in both sizes → spacers FILL, texts
    FILL + centred.
  - Review set: variants renamed „Screen=X, State=Changes” (instances keep) + cloned State=Empty (body groups removed,
    compact empty exposed, Save State=Disabled; Title / Subtitle refs re-bound on the clones). Heights 328 vs code 330 (body
    borders). U05j 10112:3561 now uses it; Services example 02x4 12251:161558 (status gone, bar hidden, nav dots off).
  - No demo state exists for the Services empty review (proto-engineer: svc-10x4 = svc-10x2 + undo the remaining rows) — the
    block links svc-10x2 and the note says how to reach it.

- 2026-10-21 · Notes are ENGLISH (user rule, via coordinator): block notes in plain English, Romanian UI labels quoted („Anulează”).
  Translated today's 11 notes (Services 02x–02x4, 09n / 09n1, Classifiers 04e, NT 04d / 04e, eKYC C02s) + the appended lines on
  Classifiers 04d / NT 02d / Print 09i. Gotcha: `note.findAll(TEXT)[1]` is NOT the body when the note's tag is an instance whose
  label is a TEXT child — the 09i sentence landed in the note TITLE. Pick note texts by name („Note title” / „Note text”) or skip
  instance sublayers (`!id.startsWith("I")`). 02x4 now links svc-10x4 (79b05bf6).

- 2026-10-21 · **A board column header = GEAP's „Band NN · Title”** (user on EVO Cabinet ↳ My requests 1122:6538: „not like in GEAP in colour
  and structure”; then via coordinator: notes / descriptions „what is this text? write a normal, short explanation”, „only English”).
  GEAP census (7 pages, 51 bands: Tariffs 9618:13402, Services 9568:18926, Users 10077:11647, FO 09 10815:25432, Classifiers, Dossiers,
  Post-processes — one signature everywhere): a plain FRAME `Band NN · Title`, background/base/default (white) + 1 px border/base/default
  INSIDE (included in layout → 122 high), radius-16, padding 24/32 + gap 8 (spacing tokens), FIXED width = the column's block width
  (1920 / 1935 / 1447), HUG height › `Title` HORIZONTAL gap 12 CENTER = `ID` chip (background/brand/default, 4/12, radius-8, Desktop/Body/Small
  500 text/base-inverse/default) + Desktop/Heading/H2 32/40 text/base/default › ONE Desktop/Body/Default line text/base/secondary (what the
  column shows, ≤ 1 sentence). Gap to the first block 238–400 (Ghișeu 244, Services/Tariffs 258). Only Ghișeu differs (grey, no border,
  14 px line) — the majority wins. Start here (Ghișeu 11933:28964) = grey `Board title` bar (chip + H2 + Body/Small secondary
  description) + white bordered cards (24/32, H4 + Body/Default secondary). Arrows = connectors border/brand/default 3 ELBOWED
  ARROW_LINES (Cabinet already matched). Cabinet had: black #1E1E1E bar, black tag-filled ID chip that read „01” on all 7 My requests
  columns, H3 24 title, white 16 line, 2215 wide (wider than the 1935 column), titles / descriptions in Romanian jargon. Fix = the
  Cabinet main `Board / Stage header` 1052:241 rebuilt IN PLACE → `Board / Band header` (fills / stroke / chip frame cloned from
  `Board / Block label`'s chip + new TEXT prop `ID#1194:0`, H2, secondary line) → 12 instances (7 My requests + 5 Permits) got ID / English
  title / one plain line, width 1935, name `Band NN · Title`; sections renamed to the same titles; both Start here frames got the grey
  board-title bar + white bordered cards; 66 notes + 66 label titles rewritten in plain English (2–4 sentences: what the user sees and
  what happens; Romanian UI labels quoted in „…”; one optional US / AC line; no class names, sizes, commit ids, component names);
  Contents lines re-linked (half the sm-* lines still pointed at pre-rebuild block ids) and counts fixed (Permits 18 → 19); cover entries
  rewritten. Lessons:
  - **„Like GEAP” = census the property across GEAP pages first**, then copy the majority signature (51 / 52 bands identical); report the
    outlier you did NOT copy.
  - **Note / description copy for PMs**: write what the user does and sees, not how it is built; the GEAP Tariffs notes are the tone.
    Keep a spec file (scratchpad spec.py) so the 66 texts are reviewed in one place before pushing; apply through the instance TEXT
    props (Title `id · title`, Text) with one stored applier — no rebuild, no lost connector.
  - **Heights settle late after many TEXT-prop edits**: the first restack in the same session read stale block heights (84 px short on
    a few blocks → gaps 156 after the layout settled). After bulk text edits: restack, then re-read gaps in a SEPARATE call and restack again
    until every gap = 240; refit sections from max(child bottom) + 80, never from the last block alone.
  - Restack with jump markers: assign each marker to the block whose [y, next block y) contains it BEFORE moving, then shift it by that
    block's dy; verify every „SM · Jump · <src> → …” still sits inside its source block. Force re-route connectors (magnet flip) afterwards.
  - Text with a NODE hyperlink: setting `characters` keeps the first segment's link on the whole text → re-apply `setRangeHyperlink` to the
    intended range right after (cover entries, contents lines).
  - No Agent tool in this session → stored `qsweep/audit` on the band main, 2 + 2 bands, sm-01 / nt-01 blocks and both Start here frames:
    1 finding (sm-01 pager paddingRight 1 = declared whole-pixel fix); connectors 20 + 9, unattached 0; overlaps 0; all column gaps 240.

- 2026-10-21 · EVO Cabinet row-action menus + lone „Detalii” + outcome tag + phone toolbar (user on ↳ My requests 1147:4552; code
  no-lone-detalii-v1 e3cf812b, outcome-tag-v1 61465c45; brief for phone-toolbar-v2). (1) Lone „Detalii”: census of the whole file
  (visible „Detalii” texts grouped by host) = only ↳ My requests: Request row got a variant axis **Action = More / None** (4 None
  variants 1194:43160 / :43191 / :43222 / :43252, no More, Title line paddingRight → spacing-0) → 97 rows switched; `Document · card`
  983:2727 lost its Actions frame in all 6 Cabinet variants (12 live + 30 archive instances follow, 983:2914 incl.; phones 132 → 88).
  Code vs Figma trigger per row diffed for 17 list states: 0 differences. (2) Outcome tag: Request row BOOLEAN `Show status`
  (1194:49) → 62 finalized rows hide „Finalizat” (55 Aprobat, 7 Respins); `Profile / Meta item` BOOLEAN `Show tag` (1194:60) → 18
  „Stare” metas; 18 title-line „Finalizat” tags hidden; 6 „Statutul dosarului” tags swapped to the block's outcome tag. (3) Menus:
  `Post-process menu · item` + State=Danger (Desktop 1195:3711) + Size=Touch Default / Hover / Disabled / Danger (1195:3715 / 3720 /
  3725 / 3730: 48 · 12 16 · gap 12 · r8 · 24 icon · Desktop/Body/Default 16/24); new `Menu separator` set 1195:42463 (Desktop 4/8 = 9,
  Touch 8/16 = 17, border/base/default = #D9D9D9); `Post-process menu` + Size=Touch 1195:42476 (p8 · gap 0 · r16) and slots Group label
  / Separator / Danger 1 / Danger 2 bound to BOOLEANs `Show label` / `Show separator` / `Show danger 1` / `Show danger 2`; local
  `20/circle-x` 1196:53473 and `20/lock` 1198:3727 (Foundations ships them at 24 only). Blocks: new sm-01u 1197:42456, sm-01w
  1197:43340 (menu up), sm-02b 1197:44196 in 01 · Request list; sm-02 1148:43085, pp-01a 1067:4940, pp-01p 1067:5809, pp-01q 1069:12767
  updated (sheets removed, anchored Touch menus, separator + red danger, „Postprocese” label); Request row `Menu open` surface → white
  (code). (4) Phone toolbars, both boards: 29 Filtre chips radius-8, 20 sort buttons circular → rectangular Large (state + focus ring
  kept); no facet chips were left. Stored helpers in figma.root: `figdes`/`rowmenu` (fillMenu / addMenu: spec → menu instance, icons
  20/24 by key, danger recolour, width, anchor right-aligned 6 below / above), `figdes`/`cloneblock`, `figdes`/`detalii-census`. Lessons:
  - **Cloning a variant into its set drops `componentPropertyReferences`** (the clone's texts stopped following Title / Date…; 97
    rows showed the main's default „Terasa „Nistru”” right after the switch). Re-bind refs by layer path from the source variant
    (skip nodes inside nested instances — „Cannot set component property references on instance sublayer”), then verify every
    instance: text = its property value. Exposed-instance flags survived; check them too.
  - **Hidden layers of an instance are not reachable from the plugin API**: a fresh instance lists only its visible children and
    `getNodeByIdAsync` returns null for a hidden nested node (I…;…). New optional slots need a BOOLEAN property; then
    `setProperties` shows them and they can be edited. Hidden children of a main also report layoutSizingHorizontal FIXED even when
    layoutAlign is STRETCH — test with an instance before „fixing” them.
  - Old menu mains carry `minWidth` (191 = the old pill) → `minWidth = null` on the instance before `resize` to the code width; older
    instances may still show Item 3 → hide Items 3–7 explicitly when filling.
  - A connector that starts on a sheet row (pp-01a „Retragere act permisiv” → pp-01g) must be moved to the new menu instance with a
    position at the item (x = menu width, y = item centre) BEFORE the sheet is removed.
  - Coordinator added four scopes mid-job (lone Detalii whole file, outcome tag, phone toolbar, then the code commits): finish the
    current component edit, verify, then switch; diff code vs Figma per state (spec-sm.mjs `more`) instead of trusting the brief.
  - Not changed (drift, reported): pp-01q profile layout predates the code redesign (subtitle, suspension notice, „Ce permite actul”,
    phones: icon-only „more” beside „Vezi act permisiv”); the stored builders (`cab`/`smscreens`, screens.js) still draw circular
    phone sort buttons, the old Detalii swap and the act sheet — patch before any rebuild.
  - No Agent tool in this session → stored `qsweep`/`audit` on the 7 menu blocks + 8 component sets: only declared baseline (meta dot
    gap 18, pager 1 px, intentional 812 phone viewports, section-over-card gap 0).

- 2026-10-21 · RAP „Filtru” / „Filtre” = the library filter chip (user on EVO-WEB 22069:11259: „do the same change for Filtru”; then
  coordinator: phones use the SAME button radius at 48, no facet chips on phones; and „phone fields = Large”, 22082:18120). EVO-WEB
  RAP page 20304:64765: 10 desktop triggers (local `Filter button (advanced filter)` 22068:187089 → deleted at 0 instances) and 15 phone
  „Chip · Filtre” (EVO DS filter-chip a2731000) → Components lk-03f6 filter-chip 9901c458 `Mode=Off, Icon=Leading`, icon „filter-2,
  sort” 7b235483, height 40 / 48, radius bound to border-radius/radius-6 (= the Medium button 6 in this file; the code still says 8 for
  btn-md and a pill on phones — the user's Figma rule wins, code follows in phone-toolbar-v2). Open = State=Focus (desktop rap-01a / 01b,
  phones rap-01b / 04a / 04b / 04c); active = Mode=On paints copied (surface, label, icon) + Counter Badge with the code count (desktop
  01c 3 · 01h 1 · 01d 2, all open → Focus + black; phones 01c 3 · 01h 1 · 01d 1 · 04d 3, closed). 60 phone facet chips removed (code: one
  pill since 2026-10-20), phone filter row top 12 → 16 (spacing-16, code 16), 17 phone searches → Size=Large (48, 16/24, icon 24) incl.
  the `Filter sheet content · rap-04b` main. Columns 01 / 02 / 05 restacked to 240. Builder tools/figma/rap/screens.js got `filterChip()`
  (desktop + the single phone chip). Lessons:
  - **`swapComponent` on the trigger keeps its node id → connectors stay attached** (rap-01 → rap-01a, rap-04 → rap-04c). Only arrows
    that start on nodes you REMOVE need re-pointing first (rap-04 → rap-04a started on the phone „Statut” chip → moved to the Filtre chip
    with a `position` start, relabelled). Routine stored in figma.root shared plugin data „rapf”/„swap”: swap → resetOverrides →
    setProperties (Label / Counter Badge / Indicator) → nested icon swap with the old vector paint kept → active paints → resize(h) →
    vertical FIXED, horizontal HUG → bind 4 radii.
  - **Two „filter-chip” sets live in EVO-WEB too** (EVO DS a2731000 State Selected/Unselected vs Components 9901c458 Mode On/Off) —
    check `mainComponent.parent.key` before saying „already the library chip”; the phones were the EVO DS one.
  - **Probe the code per state × width for the trigger** (label, is-selected, aria-expanded, badge, height, radius, siblings): desktop
    label „Filtru”, phone „Filtre”; desktop active states are ALSO open (bar shown) → Focus + black, phone active states are closed.
  - **Read „before” heights BEFORE the first write** — I snapshotted them after the swap call. And another agent rewrote the RAP notes
    while I worked (block heights dropped 20–40 px between my calls): re-read the notes before editing them and restack again at the end.
  - Library gaps (report): filter-chip has one height (36) and no Mode=On + icon + counter variant; label 14/20 + icon 20 on phones vs the
    code 16/24 + icon 24 (the rule allows only height + radius overrides).
  - No Agent tool in this session → stored `rap`/`audit` (figma-audit) on the 12 changed toolbars / filter rows: 0 findings; census: 25
    triggers = 9901c458 (10 × 40, 15 × 48, r6), 16 phone searches Large, 14 connectors 0 unattached, all column gaps 240.

- 2026-10-21 · No lone „Detalii” on clickable BO rows (user: „remove from code and also from Figma!!!”; code e3cf812b
  no-lone-detalii-v1). Census of visible „Detalii” texts by host on Dossiers, Services, Tariffs, Classifiers + a CDP probe of
  the code rows (dos-03a/b/e, 04a/b, 04g, 04n, svc-06j, svc-07: buttons per `.e-permits-stack__item`). Changed: `Document · row`
  11362:7113 — the six „Action=Details” variants renamed IN PLACE to **Action=None** with the Actions frame removed (5542 /
  5722 / 6045 / 6237 / 6579 / 6771; 73 rows on Dossiers 04, 04c–04t follow, 0 swaps); `svc/stack-item` 9521:8751 got BOOLEAN
  **Show actions#12261:0** (default true, bound to the Actions frame) → off on Dossiers 03b ×2, 03e ×2, 04a, 04b and Services
  08 (svc-07) CUATM / CAEM-2 (+ 03d ×3, which had no visible action but kept a phantom 112 px Actions frame). 8 connectors that
  started on the button re-labelled „Clic pe rând” (names „· Row click”), position starts moved to x = row width. Heights
  unchanged → no restack. Kept: Services 05 / 07 (admin „Editează”), Fees rows with ⋮, Tariffs registry tables, Ghișeu /
  FO cards; svc-06j (read-only documents) has no Figma block. Lessons:
  - **An auto-layout frame whose children are all hidden keeps its last size** (the 03d rows had all action booleans off and
    still reserved 112 px) → the „no action” switch must hide the CONTAINER: a BOOLEAN bound to the Actions frame, not only
    the per-button booleans.
  - When the code removes an action from EVERY use of a variant, rename that variant in place (Details → None) instead of
    adding a new one and swapping: overrides and connectors stay, and no unused variant is left behind.
  - Connectors starting at a removed button: move a `position` start to the row's right edge and rename the label/name to the
    new trigger („Clic pe rând”) in the same call; notes that still quote „Detalii” are left to the notes agent (reported).
  - No Agent tool in this session → stored `qsweep/audit` on 7 Dossiers blocks, Services 08 and both components: only the
    baseline (section-over-card gap 0, meta-dot gap 18, gov-bar logo / #000 text).

- 2026-10-21 · **Notes: max 45 words, plain English, no specs** (user on RAP note 22080:131432: „what is this long text? It looks like
  random words … keep it short, just explain what is happening”). Every note / column description / Start here card = 1–3 sentences
  (≤ 45 words) on what the user sees and what happens, Romanian UI labels quoted „…”, one optional last line for a reference
  („US-162 AC-08”). Never: pixel sizes, tokens, component / class names, file paths, commit ids, colours, „Gol bibliotecă” lines,
  „Mobil (≤ 860 px)” lines, lists of changes. „Declared deltas” / „Library gaps” / „Code findings” / „Rules used” cards are not for PMs →
  deleted; „Components used” → two plain bullets. „How to read” → 3 bullets (columns in flow order · block anatomy · arrows from the click).
  Done: RAP 42 notes + 5 column lines + Start here (2 cards removed); GEAP 355 notes on 15 pages + 30 band / How-to-read texts; eKYC 87
  notes + 14 texts (library-gaps card removed); FOD 13 notes + 5 texts; Cabinet 11 notes + 2 „Components used” shortened, 2 „Declared
  deltas” cards removed. Same job: RAP blocks got the GEAP anatomy in the MAINS (`Board / Block label` set 22060:5083: blue chip
  background/brand/default + text/base-inverse/default, gap 12, `Link · prototype` text added to all 3 variants, hyperlink set per
  instance; `Board / Note` 22060:5084: library tag-filled Strong Neutral Medium, H4 title „<id> · title”, gap 12, link + `Link` prop
  removed; note instances FILL), screens gap 120 (dw 40 → markers right of the desktop moved +40), columns restacked at 240; 42 / 42
  states curl 200 and present in the live demo-states.js. Lessons:
  - **Tooling**: stored helpers in each file's root shared plugin data („notes”/„lib”, „notes”/„app”; copies in the session scratchpad):
    census (`need` = > 45 words OR spec regex OR ≥ 3 Romanian function words outside „…”), `apply(page, {noteId: text})` snapshots
    every column chain (same rounded x, original gaps, overlapping items ride along) BEFORE writing, then a separate `restack` call
    restores those gaps. `setBody` keeps the longest segment's text style / fill, clears hyperlinks, and if the old text had a sandbox
    URL appends a linked „Prototype ↗” to the reference line (GEAP sync notes 04–04f had no label link).
  - **Never restack a block grid by rows unless the rows are really aligned**: eKYC columns start together but drift; a row-by-y pass
    treated 17 near-equal tops as 17 rows and spread D01 to 27 000 px. Fixed by replaying the stored per-column chains (all chain heads
    were on the top row) and refitting sections > bottom + 400. Flow diagrams with decisions / markers in other columns (FOD Address,
    Requestor, GEAP Services „Permits Table” grid) are NOT restacked — shorter notes only leave space, never overlaps.
  - Ghișeu „How to read · Contents” keeps its 12 per-line links → left as is (rewriting `characters` would drop them).
  - Note titles were left as they are (many GEAP titles are Romanian and mirror the block label) — a separate pass if the PO wants them.

- 2026-10-21 · Phone list toolbar v2 in Figma (code bbe4f206 phone-toolbar-v2: one row = search FILL · icon-only „Filtre” 48 ·
  icon-only „Sortează” 48, gap 8, r8; count badge on the corner; „N rezultate · Șterge filtrele” 8 under the row; no phone chips).
  Routine tools/figma/phone-toolbar-v2/toolbar.js (stored per file in figma.root „ptv2”/„run”). Done: EVO Cabinet 29 phone rows
  (My requests 20 incl. sm-01o / sm-01q active, Permits 9 incl. pp-01h active; archive untouched), both boards restacked to 240,
  jump markers moved with their block, 31 connectors re-routed, 2 notes + Start-here sentence rewritten; RAP 15 phone toolbars
  (rap-01c 3, 01h 1, 01d 1, 04d 3 active), columns 01 / 02 restacked, 13 connectors re-routed, 4 notes + 1 contents line
  rewritten. eKYC: the ONLY phone list is S02e1 (ek-06g, 10829:146246) — EVO DS chip (State=Selected, kept) moved into the
  Toolbar, icon swapped to „filter-2, sort”, 8 facet chips + „Chips · scroll” removed, badge 2, export 32 kept; geometry = code
  (247 / 271 / 327, badge 304,3). GEAP: the ONLY BO registry phone is W01 Workflows (11524:1000) — code pd-35 shows no Filtre
  (nothing to filter) → search Large FILL + export 32 in one row, „Creează proces” on its own line 8 below, field count and the
  disabled „Filtrare avansată” removed. (Session resumed after a sign-in expiry: re-census first, everything already done held.)
  Lessons:
  - **The library filter-chip has no icon-only variant** → keep the chip instance and override only: Counter Badge off, `Label` +
    `Badge` layers hidden, padding L/R 0 + primaryAxisAlign CENTER, **`minWidth = null` (the main carries 60 — resize(48) silently
    stayed 60)**, FIXED 48 × 48. Node id unchanged → connectors stay attached.
  - **Corner count badge** = library numbered-badge Large Light (68a3732b…) ABSOLUTE in the toolbar row (constraints MAX / MIN),
    2 px INSIDE ring with the chip's own black paint; position from the MEASURED code (x = chip right + 5 − 20, y −5), not the
    CSS (`-6`). Turn clip off on the row and its parent.
  - Sort = `swapComponent` to the same Style / State with Icon=Only, Size=Large + Leading Icon 20 = central „arrow-bottom-top,
    sort 2” filled=on 1.5 r2 (= code icon-sort); icon stays 20 (library lock; code 24 — declared), chip icon 20 likewise.
  - Moving the search INTO the old filter row (and deleting the empty search wrapper) keeps every id; the screens lose 64
    (68 on RAP, where the old row sat in its own padded frame) → restack whole columns; RAP „Filter chips (phone)” keeps only
    the meta with paddingTop = the toolbar's bound gap 8 (or is removed when there is no meta → table 16 under the row = code).
  - Take „before” screenshots before the first write of each file (Cabinet's had to come from a second, untouched block).

- 2026-10-21 · Address builder → sample address arrows (user: „an arrow from each builder part to a sample address”) — BLOCKED: the
  figma-a MCP server disconnected after the read-only survey; nothing was written. Findings so the next run starts building straight away:
  - **The Address board is in GEAP, not FOD**: page ↳ FOD Pattern -> Address 3164:28119, section 11224:39519 (US-54). FOD
    pvDAJPXKyUuJgz3P921Ye8 has no Address page. Builder blocks: C01 11249:15035 / C01a 11249:15248 / C01b 11249:15461 (x 160, 1440 wide,
    stacked 1200 / 2564 / 3908) inside „Lane · Back office” 11251:14282 (80..3360 × 1000..5120); Preview C12 / C12a at x 1840. The
    builder parts are the rows of the right panel „Address pattern › Data” (captured, so rows are frames and can be connector ends).
    The C01 capture is scrolled: it shows Stradă → Cod cadastral only, so Țară / Raion / Orașul / Sector need anchors or a fuller capture.
  - **Parts come from code** (js/form-builder.js ADDRESS_PARTS): Țară, Raion/Municipiu, Orașul/Comuna, Sector (only for Chișinău),
    Stradă, Casă, Etaj, Bloc, Scară, Apartament/Oficiu, Cod cadastral. „Cod poștal” is NOT a builder part: the FO derives it from the
    locality (read-only), and „Cod cadastral” fills the other parts from SRRE. Use a code sample, not an invented one: SRRE 0101213.045
    (data/srre-cadastral.json) = Chișinău · sec. Buiucani · str. Calea Ieșilor 10 · bl. 2 · ap. 47 · MD-2001.
  - Placement to check first: the C01 → C12 gap (x 1600–1840) already carries 4 connectors; the free space is under C01b (lane bottom
    5120 → grow the lane and move „FO / Field · skeleton” / „FO / Context · skeleton” at y 5400) or left of the lane.

- 2026-10-21 · GEAP act row → the EVO Cabinet anatomy (user on GEAP 11606:1123, gh-02i list; code js/act-row.js shared, 49f2be2d /
  75740ae5 / a55708c6 / acc1ed66 / e3cf812b). **Stopped half-way: the figma-a MCP lost its sign-in** (rate limit, then re-auth needed).
  Done in GEAP: local `20/lock` 12268:364500 + `20/circle-x` 12268:364503 (Foundations 24 glyph rescaled 20/24, as Cabinet
  1198:3727 / 1196:53473), `Post-process menu · item` 11844:198541 gained State=Danger Desktop 12268:364506 (text/danger eb442fe6…,
  icon/danger d3dd654e…, 20/circle-x) + Size=Touch Default / Hover / Disabled / Danger 12268:364512 / :364518 / :364523 / :364528
  (48 · 12 16 · gap 12 · radius-8 dc82cc9d… · Desktop/Body/Default 392200dc… · **24 icon = code**, Cabinet's Touch mains keep 20).
  Verify they exist before continuing (the session dropped right after that call returned). Snapshot of all 38 Act row instances
  (overrides, block, size) stored in root shared plugin data „figdes”/„actrow-snap-before”. Still TO DO, in order:
  (1) `Menu separator` set (Desktop 4/8 = 9, Touch 8/16 = 17, border/base/default 9fa253aa…); `Post-process menu` 11844:340693 →
  combineAsVariants (Size Desktop / Touch, p8 g0 radius-16 for Touch) + slots Separator / Danger 1 / Danger 2 + BOOLEANs; no group
  label (the code has none). (2) Restructure `Act row` 11846:340996 IN PLACE (keep key 8b8ef217…, move existing nodes — don't
  replace them — so Title / Number / Status / Notice overrides survive): card p16 r16 stroke 1.5 INSIDE (not in layout) gap 12;
  desktop Row › Content (V g8) › `Title and tag` (H g8, paddingRight = trigger + 8 = 133 → 135 for 127) = 24 icon · Title 16/24
  Desktop/Body/Default 500 · Status · Extra tag; Meta full width; phones `Line 1` (pL32 pR133 pB2, tags, icon ABSOLUTE 0/−2) ›
  Title FILL ENDING maxLines 2 › Meta; Action = swap button-filled-circular → button-filled-rectangular Neutral Trailing Small
  (7f9ca2b5…), label „Postprocese”, ABSOLUTE MAX/MIN at 12/12 (phones 10/10); Locked = State Disabled + Notice FILL; Menu open =
  State Active + Focus Ring/Medium + `Menu layer` ABSOLUTE STRETCH at y 50, align MAX; add Paper variants + props Subdivision /
  Show subdivision (default FALSE in GEAP — every instance's Authority already holds „CSP …”) / Show extra tag / Show action /
  Break before subdivision. **Meta order = the code: Number · Authority · Validity** (GEAP had Validity second). (3) Instances:
  gh-02j menu (7 items) → code order + icon map (Prelungire 20/calender-add 1b5ae084…, Suspendare 20/lock, Contestație
  20/judge-gavel 9fd06923…, Retragere → separator + Danger 1 20/circle-x), 02a desktop Retragere act permisiv → Danger; 02a phone:
  replace the `Overlay · bottom sheet` 12183:406548 with an anchored Touch menu (right edge = trigger right, 6 below; re-point
  connectors first). (4) Rows grow 70 → 84 / 126 → 140, phones 154 → ~136–160: check dialog / list clipping on Ghișeu gh-02i/j/t/
  u/n/x (5 rows each) and restack FO 09 F1c, Post-processes 02/02a/02b, Ghișeu column 03 at 240.
  Census: 38 instances — Ghișeu 25 (20 Default, 4 Locked, 1 Menu open), Post-processes 8 (5 Default, 1 Menu open desktop, 1 Default
  + 1 Menu open phone), FO 09 F1c 4 (2 desktop, 2 phone). No tacit block (gh-02y / pp-02t have no Figma block); FOD Requestor page
  in GEAP has 0 act rows (the FOD file has its own copy 892:11656). Lessons:
  - **Measure all three products at once** (measure-act-rows.mjs with `--page cabinet-evo/index.html` for pp-01; the Ghișeu states
    load from e-permits-acte-permisive.html, not e-permits-shell.html — the shell page returned 0 rows). Copy the tool to the
    scratchpad with a private port range (13400+).
  - Code vs Cabinet (report, no change): FO / Ghișeu meta = number · subdivision · date (slot 3 prints only „CSP Bălți”, no
    „ANSP”, while components.md says „authority code · subdivision”); Cabinet = number · what · ANSP · CSP · date. The Cabinet Figma
    Act row main orders Validity before Authority (code puts the date last). Phone menu icons: code 24, Cabinet Touch mains 20.
  - Before a long multi-call rebuild, write the plan + snapshot into the file (shared plugin data) and this playbook early: an
    MCP auth drop can end the session between calls.

- 2026-10-21 · QA of GEAP 11251:14282 („Lane · Back office”, US-54 board 11224:39519 on ↳ FOD Pattern -> Address) — stopped
  early: the Figma MCP plan limit was hit, then the server disconnected after the first audit. Baseline measured (gate-audit.js,
  per block, not descending into instances) on C01 / C01a / C01b (Form Designer, adr-01 / 01a / 01b) and C12 / C12a (Preview,
  adr-12 / 12a): fractional 282, raw-control 216 (62 per builder block: captured „Button”, „Tab”, „Button - Close the builder”),
  image-fill-icon 176 (55 per builder block, h2d-svg), clipped-content 27, not-auto-layout 17, sibling-overlap 5, tight-gap 3.
  So the builder chrome was never passed through swap-builder-address.js (or the pass was lost). Lessons:
  - **The lane frame is only a grey backdrop**: `Lane · Back office` (3280 × 4120) holds just its title. The 5 blocks, the
    connectors and two local component sets (`FO / Field · skeleton` 11229:290552, `FO / Context · skeleton` 11258:17226 at y 5400,
    below the lane) are SECTION children placed on top of it. Moving the lane leaves the blocks behind. When you restack, move
    the lane and every child inside its bounds together. Move component sets to 🧩 Local components, never onto a board.
  - The C01 → C01a / C01b arrows loop out on the LEFT of the section (x 128) and „C01 · Publish → Start” runs 1984 px through
    the C12 screen. A desktop-only lane with 2 columns needs its exit arrow to leave from the lane's right edge.
    Gaps measured: C01 → C01a and C12 → C12a 260, C01a → C01b 240.
  - `setSharedPluginData` namespaces must be alphanumeric, `_` or `.` (a „figqa-cad” key threw an error and rolled back the call).
    Use keys like „figqacad”.
  - With a rate limit already hit that day, store the audit in a separate first call and run each block in its own small
    call. A dropped transport then loses one block's work, not the whole lane.
- 2026-10-21 · Same job, DONE after reconnect (coordinator: build it with the recommendations). New block **C01c 12280:361263** „Address
  parts → sample address” under C01b (x 160, 240 gap) on GEAP ↳ FOD Pattern -> Address, section 11224:39519: left = an unclipped clone of
  C01b's own captured „Componentele adresei” list (all 11 rows; the 710 px scroll view can never show them all), right = one segment chip per
  row (Desktop/Body/Small 500, brand-subtle / base-secondary for empty or default parts, p 4/8, radius-6) aligned with its row, then the
  composed address card next to „Cod cadastral”. 11 connectors cloned from 11254:13336 (Țară → Republica Moldova „default value, not shown”,
  Raion → mun. Chișinău, Oraș → MD-2001 „derives the postcode”, Sector → sec. Buiucani „only for Chișinău”, Stradă / Casă / Bloc / Ap. →
  their chips, Etaj / Scară → „left out (empty)”, Cod cadastral → the composed card „fills all parts from the registry”). Lane 11251:14282
  grown, the two skeleton components moved 280 below it, Contents column 11280:15130 got the C01c line (5 → 6 ecrane). Lessons:
  - **Straight mapping arrows = mirror the source rows**: a target column of FIXED-height rows (height = the source row pitch, chip at
    paddingTop 12) + connector start `position {x: row width, y: label centre}` and end magnet LEFT → every arrow is a straight horizontal
    line, no crossings, labels fit in a 240 gap.
  - **Connectors whose two ends are in one block are re-parented by Figma into the ends' common ancestor** (here the block's auto-layout
    content frame; they are not laid out). Keep them there: they travel with the block and show in its screenshot; moved to the section,
    `get_screenshot` of the block no longer draws them.
  - **Label pill**: a connector cloned with an empty label and given text later lost the pill (`textBackground` is read-only) → set
    `text.characters` right after `clone()`, or re-clone.
  - A cloned captured list inside a new card collapsed to ~74 px (the margin frame came out FILL inside a HUG card, clip on) → FIXED to
    the source width (357, the section inside sits at −12), clip off, card paddingBottom 24 for the −12 overflow.
  - Stored `qsweep/audit` on C01c: 0 findings in the new pieces; 22 raw „Button” + 22 image-fill icons inside the cloned rows = the same
    captured debt as C01 / C01a / C01b (whole-column fix, not done here). No Agent tool → no ui-qa-figma run.

- 2026-10-21 · FOD „Temeiul reprezentării” mess (user on FOD 756:24929, C2 „Date solicitant · Own PJ”). The card is the GEAP
  `Authorization card (FO)` set 11861:7142 (published key 9c45cfd3…; RSUD e7d4d2e6…, MPower 663e22a9…), nested in the GEAP
  `Requestor` set 2210:20269 that FOD uses as a REMOTE instance. Cause of the overlap / floating tag: **a stale stored layout**
  — the plugin API already read a clean layout (Meta WRAP, parts HUG, tag 8 after the title) while get_screenshot (and the
  user) still saw the old FIXED-part geometry; the first plugin read of the instance's boxes re-laid it out and the next
  screenshot was clean. Fixed for good with real writes: GEAP mains → text styles (Title / values Desktop/Body/Small 500
  057521fd…, labels Desktop/Body/Small 1f355410…; they had none), meta parts renamed `Meta item N` / `Dot`, MPower glyph
  24/identity → Foundations **20/identity 370dd6e0…** (code icon-identity 20); FOD C2 / C3 / C4 → the same text styles as
  instance overrides (no-ops after the next GEAP publish) and the „Soliciți în numele” title override reset to the main's
  „Solicitant” (= code). Lessons:
  - **„Overlaps” in a remote / nested instance whose plugin geometry is clean = stale layout**, not a broken component. Read
    the instance's absolute boxes, re-screenshot; then make a real write on it (text style / property) so the relayout is saved.
  - **Remote instances: an icon swap override can't be resized** (`resize` on the nested icon is silently ignored — it stayed
    24). Don't swap glyph sizes per instance in a consumer file; fix the main in the source file, `resetOverrides()` on the
    nested icon in the consumer, and let the publish carry it.
  - **Matching instance texts to main texts by parent NAME is unsafe** (two „Container” parents) — I reset the wrong heading
    on C5 and had to restore it. Match by child-index path or by the exact current text + parent path.
  - The code's icon here IS the grey 32 tile (tertiary + 1 px border, icon secondary 20: icon-business RSUD / icon-identity
    MPower) and the card radius is 12 (the role cards above are r16 in Figma but 12 in code) — Figma follows the code; the
    „make it like the cards above” wish goes to the PO, not a silent restyle.
  - Library delta, declared: the title info button is button-text-rectangular Small Icon Only (32) vs code 24 → each role group
    is 8 px taller than the code (118 vs 110). GEAP has `Info trigger (tooltip)` 11931:41990 (24) but it is not published, so FOD
    can't use it.
  - Left, reported: C5 (authenticated notarial power of attorney) has no demo state in code → untouched; 10 hidden
    `Frame 1261156030` leftovers with MPower cards in FO 09 F2–F2i mobiles; PF / None still says „Depui ca” (legacy).
  - Probe: a 40-line CDP script (state × width → role-group / card / tag / meta rects + clipped PNG of
    `.e-permits-fo-form__roles`) answered every number; poll for the roles element instead of a fixed sleep.
  - No Agent tool in this session → stored `ghs/audit` on the set + 4 GEAP instances: 0 findings; inline mini gate audit on the
    FOD C2 / C3 / C4 role areas (unstyled text, unbound fills, fractions, sibling overlap, image fills, non-auto-layout): 0.

- 2026-10-21 · Same job, finished after the re-sign-in. Act row v2 + menu family in the Library table. Instances: 38, 0 override diffs
  against the stored snapshot (title / number / subdivision / validity / status / notice). Blocks: gh-02j menu = code order + icon map
  (calender-add, edit, copy, 20/lock, rotate-arrow, judge-gavel · separator · Retragere red) 211 × 255 (code 213 × 255), tooltip moved
  under „Prelungire” (code position); Post-processes 02a desktop menu Reperfectare · separator · „Retragere act permisiv” red 206 × 85
  (code 207 × 85); 02a phone: `Overlay · bottom sheet` removed, Touch menu 12280:372853 anchored 6 under the trigger, right-aligned,
  253 × 129 (code 253 × 129). Row sizes now: desktop 84 / locked 140 (code 86 / 142 = its 1 px border), phone 134 (code 136). No
  clipping; Post-processes 02a → 02b gap 180 → 200; Ghișeu column 03 stayed at 240. Index line (Start here 12245:382394) and three
  rule texts that described the sheet / „Inițiază un postproces” rewritten (12191:358472 + title, 11393:248949, 11393:248953).
  Lessons:
  - **`swapComponent` on a node bound to an INSTANCE_SWAP property rewrites the property's DEFAULT for the whole set** → every
    variant's icon followed the last swap (all items became 24/edit, then circle-x). Swap icons per variant with the ref removed (or
    swap, then `editComponentProperty(defaultValue)` LAST and re-check every variant). Size differences (Touch 24) = `resize` on the
    variant's icon instance, not a different glyph.
  - **`minWidth` can't be overridden on an instance** („min-size”) — clear it on the main (old 191 pill width on the menu).
  - A separator built as a component with `primaryAxisSizingMode = FIXED` stays 10 high → set AUTO after `layoutMode` (9 / 17).
  - Moving existing nodes inside the main (icon into the title line, Action / Menu layer out of Row, Title out of `Title and tag`)
    keeps every instance override; only CLONED variants (Paper) need refs re-bound by walking source and clone in parallel.
  - The stored gate audit (`ghs/audit`) takes node ID STRINGS (`fn(["id", …])`), not nodes — nodes give „missing-root”.
  - `create_session` was not callable in this session (not in the tool list); `use_figma` without a sessionId worked.
  - Audit (no Agent tool → stored `ghs/audit` on the 6 changed components + 11606:1123 + gh-02j): only declared code values (meta gap
    18, trigger reserve 137, icon overhang 2); gh-02j's background registry table clips / raw scrim = board baseline.
  - Left: the `Act post-process sheet` family (GEAP 12183:2634 / 2574 / 2573) has 0 instances now — kept for the FOD / Cabinet copies'
    parity; FOD Requestor (own file) still has the v1 act row (892:11656). Code delta reported: FO / Ghișeu trigger 127 vs library 129
    (padding-right 12 vs the code's chevron side 8).
  - **Census phone frames by width, not by name**: eKYC / GEAP phones are named „Screen · … · phone”, „W01 · … · mobile”,
    „C02s · Phone 375” — walk for 375-wide top frames ≥ 600 high, then look for a search instance inside.
  - **Captured BO phone headers are GRIDs**: growing a row needs the parent grid's row size changed too (FIXED 96 → 144); a HUG
    grid row on the PARENT collapsed to 1 px and put the table over the header — set FIXED track sizes explicitly and shrink the
    table viewport row by the same amount so the pager stays inside the fixed 845 screen. Screenshot after every grid change.
  - eKYC had no stored audit → stored a lite gate audit as „qsweep”/„audit-lite” (same rules as Cabinet's „qsweep/audit”).
  - Code bug seen, reported: pd-35 at 375 the wrapped „Creează proces” sits at y 160 under the tab strip (toolbar box 56 high
    does not grow) — Figma draws the intent (own line, 8 below the row).


- 2026-10-21 · Full-height document viewer (code e1058fbc doc-fullheight-v1 + a7f89560 hairlines; user on GEAP 11375:313221 „a lot of
  screens are the same … show how it behaves on larger screens”). No Figma comment about full height exists in GEAP / Cabinet / EVO-WEB
  (closest: EVO-WEB 1968940910 „many fields”). GEAP Dossiers: duplicates deleted — 04o, 04p, 04q, 04t (column 04++), 04i, 04l (04+),
  04e (04) — they rendered the same 590 viewer to the pixel (probe); arrows re-pointed (04n ×3 + 9729:72174 → 04s, 04g / 04k → 04h).
  Kept: **04s 11375:313455 = the size row** (`Screens · screen sizes` 12277:364492: 1280×720 12280:362568, 1440×900 12280:362658,
  1440×1024 12277:364495, 1920×1080 natural 12280:362748, 1440×1024 scrolled to end 12280:362838) + one dev note; **04r 11375:313396 =
  short document** (unsigned, 928 centred at y 48), placed right of the row; **04h 11332:17129 = uploaded**, fixed 1440×1024. New Modal
  variant **`Type=Document viewer` 12280:362247** (footer 80 = Medium 40 buttons, body padding 16 20 0) — the Content variant keeps Large
  48 (23 instances, other pages, untouched). `Modal content / Document · details` canvas 554 / 632 window → **758 = the full A4 page**
  (both variants; 4 instances, all mine). Cabinet ↳ My Permits: pp-01z 1074:13295 deleted (same viewer), pp-01m 1071:8963 = size row
  (1211:44763 / 44951 / 45139 / 45327 / 45515 end + phone), section 05 widened to 8655; `Doc canvas content · pp-01m · Desktop` 1178:42122
  restructured (Subtitle 8·20·24 = the lower code header, `Body` FILL clipped p 0 24 24 + hairline, canvas 930); new `A4 document page ·
  sm-05h` 1211:46935 + `Doc canvas content · sm-05h · Desktop` 1211:47008 (560, no tray, natural 780). Lessons:
  - **Measure every size in code before drawing** (scratch probe.mjs: dialog / header / body / footer rects, scrollHeight, has-scroll
    classes, `--end` scrolls the body): it showed the GEAP 590 viewer is NOT full height at 1920×1080 (content 852 fits → 1008 centred),
    the Cabinet 720 act viewer still is (content 1032), and 04r is the natural-height case at 1440×1024. Draw what it measures, not the brief.
  - **Fixed screen at a size** = clone the screen, `minHeight = null` on the screen AND on `Body` (both carried 1024 / 1391 minimums —
    `resize()` silently kept them), resize, clip; modal in `Overlay` is ABSOLUTE → place by x / y (overlay auto-layout alignment is ignored).
  - **Scroll 0 vs scrolled to end without detaching**: modal FIXED height = H − 48, its body FILL (clip on); at rest the body stroke =
    bottom 1 only; „end” = top 1 only + `primaryAxisAlignItems = "MAX"` on the body (content overflows upward and is clipped = scrollTop max).
  - **Nested instance sizes can't be overridden** (canvas resize, button heights on instance sublayers are ignored; HUG collapses buttons
    to 20). If the main's numbers are wrong for the code, fix the main when only your blocks use it (count with getInstancesAsync), else
    add a variant (Modal `Type=Document viewer`) and switch your instances to it — Title / Subtitle / Content props survive the switch.
  - A cloned row that is wider than the block's fixed width spills onto the dark section: set the block HUG and the note FIXED (1920 /
    1935) so notes stay readable; rightmost sections can grow, inner columns can't — put a wide row below the neighbour column's bottom.
  - The Figma Professional seat has a daily MCP call cap: the job stopped at the cap. Batch more per call (one call per block), skip
    exploratory reads you can derive from earlier ones.
  - Left (cap reached): sm-05h block in Cabinet column 06 (components ready; Descarcă = outlined variant in code, Neutral filled in pp-01m),
    RAP rap-03l, both Start here / index lines, QA gate run, the pp-01z content mains 1074:12334 / 12931 + A4 pages 1073:2222 / 2324 are
    now unused.

- 2026-10-21 · RAP act profile = full container width (user on EVO-WEB 22083:25645 „let's also do the full-width container”; code
  477699f3: `.rap-profile__container` max-width = --rap-content-width, label column clamp(120, 30%, 200)). Probe at 1440: container
  80–1360 (= rap-01 table), header text 12 inset, card p20, label 200 + gap 24, value 1016; only „Seria și nr. documentului tipărit”
  wraps (row 56). Done: the 27 desktop `Profile › Container` frames (column 03 rap-02 / 02a / 02b / 02c / 02d / 02g / 02h + the
  profile behind every column 04 modal) 1024 → FIXED 1280 (Profile padding 24 + centre does the rest); `Profile / Details row`
  22066:5558 — the 8 Desktop variants' Label 256 → 200 (FIXED, HEIGHT) → 337 profile rows + 190 modal rows follow. Container
  heights then equal the code to the pixel (rap-02 1058, 02a 1178, 02b 1154). Column 03 block heights did NOT change (the
  375 phone drives the block height) → no restack; column 04 desktop screens refit to modal + 32 (8 screens), gaps stayed 240.
  Phones untouched. Lessons:
  - **A row component shared by the page and a modal**: changing the main's label column also moved the modal rows (256 → 200;
    the code modal is 163 = 30 % of its row). `resize()` of a text sublayer inside an instance in another component's main does
    NOT stick (stayed 200) → a per-context label width needs a variant / a `Context` property, not overrides. Count
    `getInstancesAsync` per variant by host (profile container vs `Data modal content · …`) BEFORE editing a shared main.
  - Check what drives a block's height before planning a restack: with desktop + phone side by side, a desktop that shrinks
    changes nothing on the board.
  - The stored `rap`/`audit` takes id strings (nodes → „missing-root”) — same as `ghs/audit`. Findings = baseline only
    (section-over-card gap 0, profile behind a modal cut at the viewport).
  - Left: the RAP desktop breadcrumb still ends with a trailing „›” (code breadcrumb-v2 in the same commit ends on the act name,
    Active Level on, 30-char cut) — not asked here; modal rows 200 vs code 163.

- 2026-10-21 · Breadcrumb never repeats the page title (code 9dcee919 breadcrumb-v3; user: „the breadcrumb should not repeat the
  page title, it's already there”). Every library breadcrumb (232:5282, set cafee05e…) above an H1 → `👁️ Active Level#5159:7` =
  false; the trail ends on the last parent with its own chevron (each Level item carries it — no other change needed). Counts
  (desktop instances with Active Level ON, before → after): GEAP 322 → 1 (Local components 2 mains, Services 185, Classifiers 23, Dossiers 50, User Management
  39, Notification templates 19, Application Shell 3; done through the mains `Main Navigation` 9442:44686, Dossiers 9706:6955, the
  4 `Profile / Header` variants 10133:184435 / 184551 / 184617 / 184693, notification header 10008:1624 + 61 own instances; 0
  nested overrides needed); kept ON = Process Designer sub-process trail 5740:27424 (replaces the title). EVO Cabinet 26 → 0 (My
  requests 18, My Permits 8; 17 of them are empty archive instances „Request profile / …”); eKYC 125 → 0 (8 BO pages);
  EVO-WEB RAP 0 → 0 (36 desktop instances already parents-only = code rap-01 / rap-02d). Mobile („‹ parent”) untouched.
  Probed code at 1440 (svc-01, dos-01, sm-05, rap-01, rap-02d): trails equal Figma. Lessons:
  - **Census by component property, not by name**: `findAllWithCriteria({types:["INSTANCE"]})` (descends into instances), keep
    nodes whose `componentProperties` has the property key, then confirm the set key with `getMainComponentAsync`. Group ON ones by
    `D` (own) / `C:<main id>` (inside a local main) / `N:<last id segment>` (nested in another instance) → set the own + main ones
    first, then re-scan nested ones (only overridden ones stay ON). Group keys must include the page ID — two pages named
    „Configuration · …” overwrote each other's counts.
  - The record code goes with the Active Level (D-2026-…, IDNP, KYC-…, GEAP-…, CJ-…). A code that is a PARENT level stays — the
    classifier opened from a service (Services 08a / 08a1 / 08a2 / 08b: „Administrare › Configurări servicii › 003000023 ›”) is the
    code's `fromService` crumb, kept by parentsOnly too. Check the caller's crumb array before deleting a level.
  - Out of scope, left ON and reported: FO form headers (Post-processes, FOD Address, FO 09 — `Solicitările mele` drawn as the Active
    Level, no H1 repetition; the FO header in code was not changed) and the EVO-WEB catalog main 3151:5786 („Servicii publice › Acte
    de identitate” over „Acte de identitate și …”).
  - A walk over a page another agent is editing can hit „node does not exist” mid-loop (rolled back) → guard every node with
    `removed` + try / catch and retry.
  - Stored `ghs/audit` is an `async (ROOTS) => {…}` source — run it with `eval(src)(ids)`, not the AsyncFunction constructor
    (that returns undefined). 0 findings on 5 changed headers.

- 2026-10-21 · Ghișeu delivery + payment note = the FO full flow (user on GEAP 11754:25366 gh-08 „off spacing … should be exactly as in
  the full flow” and 11757:25375 gh-09; Alexandr's comments on gh-08a / gh-09 „use the FO component?”). Reference = ↳ FO -> Full Flows
  - 09: F6 4832:59286 (section 4832:59329), F6b 4887:22780 (section 4887:22824), F7 3607:15468. Both products render the same code
  (renderDeliveryStep / the payment renderer in js/ghiseu.js), so the Ghișeu blocks must be the full-flow pieces with Ghișeu texts.
  Done: gh-08 / gh-08a captured `Section` (raw „Label” cards, hand-made 20 px radio circles, Small checkbox glued to the card) →
  clone of the F6 / F6b section (`Section · Delivery` 12289:463686 / 12289:465275): library `system-files-item-selectable`
  (Selected / radio, built-in Strong Success „100% digital”), checkbox-label MEDIUM in a 12/8 frame 32 under the card, radio list
  8 apart, courier group card; F6b's courier chooser removed (Ghișeu = MDelivery, address only); icons 24/store, 24/car; heading
  inset 8 (= code). Column 09 (gh-09…09d): invoice tag → tag-filled Strong Medium in the code tone (Emisă Accent, Achitată Success,
  Expirată Danger = F7's „Neachitat”), the missing zigzag edge cloned from F7 into the empty 6 px edge frame, row dashes [2,1] → [4,4],
  98 raw texts → Foundations styles. Lessons:
  - **„Exactly as the full flow” = clone the full-flow SECTION, not nudge paddings**: the captured Ghișeu step had no instances to fix;
    a clone of the reference section carries the bound spacing tokens, the library item / checkbox variants and the 32 rhythm, and
    only the texts change (TEXT props on checkbox-label; nested texts on the items by current value).
  - **Re-point connectors before removing a captured section** (gh-08 → gh-08a started on the old checkbox → new checkbox id).
  - **A swapped tag keeps the old FIXED height** (Small 20 → Medium stayed 20): after `swapComponent` resize to the variant height,
    then HUG horizontally (same as the library button lesson).
  - Where the full flow is stale against the shared code, the code wins and the report says so: F7 details card r24 / 360+8 columns vs
    code r16 / 352+24; F7 tag beside the amount vs code on the caption line; F6 title / heading at x 0 vs code 8; Ghișeu footer 32
    under the delivery section + the section's own 32 (= F6 64, FO code `.e-permits-fo-delivery__footer` 64, Ghișeu code 32 → code delta).
  - No 16/24 600 text style in Foundations → „Total de plată” texts stay unstyled (declared). No Agent tool → stored `ghs/audit` on the
    2 sections + 5 forms: fixed edge itemSpacing −1 and the address card half pixels (row minHeight 48); left = gh-09c heading row
    „tight-gap 0” (padded heading, baseline).

- 2026-10-21 · No button that repeats the row click + grey ⋮ (code 30b9dd0c no-continue-btn-v1; user on GEAP 11862:24338 „remove
  Continuă … leave only the dots” and 11914:29753 „Detalii does the same as the click? make the dots button a grey one”). GEAP Ghișeu:
  all 92 `Table - Dosare noi, …` tables (stored `figdes`/`fixTable`): 704 „btn · Continuă” + 1 „btn · Detalii” (gh-01f) removed; actions
  column → 56 (grid track, pinned cells min/max 168 cleared, x 1016 → 1128, sticky placeholders, table 1648 → 1536 / background 1780 →
  1684). ⋮ = library **button-filled-rectangular Neutral Icon=Only Small 5611:63307** (open = State Active 5611:63538 + Focus Ring/Medium
  + clip, = the code's pressed + ring) everywhere in BO (stored `figdes`/`swapDots`, census `figdes`/`dotsCensus2`): Ghișeu 771,
  Local components mains 20 (svc/stack-item 9521:8751, Fees / Tariffs list contents, Document · row Edit + ⋮), UM `Profile / Header`
  mains 2 + 18, Form Builder mains 8 + 53, Process Designer 33, Dossiers 32, Workplace 151, App Shell 209, NT 1, Services 171 — 0
  Strict ⋮ left; the Previzualizează eye untouched. FOD: `Act row` 892:11656 rebuilt in place to the GEAP v2 anatomy (key bbef3540
  kept, 4 instances 0 value diffs; props Authority → Subdivision renamed so overrides held; new Authority / Show authority / Show extra
  tag / Show action / Break before subdivision; Paper 1131:21263 / 1131:21304; `Message · subtle` gained Tone=Info 1130:377). Lessons:
  - **`swapComponent` + `setProperties` on the same node keeps id, connectors and the icon colour** (checked against a fresh instance's
    resolved variable) — no recreate needed for a Strict → Neutral icon-only swap; text-rect / text-circular → filled-rect worked alike.
  - **`resetOverrides()` after a swap also resets the layer NAME** (an exposed „Action” came back as „button-filled-rectangular”, and the
    next `findChild(name)` returned null) → rename right after the reset.
  - **Captured table cells carry minWidth / maxWidth = their captured width**: `resize()` silently keeps 168 — clear both first.
  - Census once with a glyph test (small instance whose child glyph is „more-vertical”), then swap mains first (`onlyOwn`), then every
    page: nested overrides that pointed at the old Strict Focus variant show up as leftovers and get swapped too.
  - Whole-page walks with `getMainComponentAsync` on ~800 hits dropped the transport twice → verify per section.
  - swap-to-instances.js: ⋮ proto now Neutral; × uses its own Strict component (it used to clone the ⋮ proto). Left: menu item
    „Elimină schița” is red (danger) in code but black in Figma (library menu item has no danger tone) — report; no gh-13a / gh-13b blocks.

- 2026-10-21 · QA + fix of GEAP 11251:14282 „Lane · Back office” (US-54 board, ↳ FOD Pattern -> Address), finished after the
  reconnect. The lane's 6 blocks (C01 / C01a / C01b Form Designer adr-01 / 01a / 01b, C12 / C12a Preview adr-12 / 12a, C01c mapping)
  were 10-13 captures of an OLD builder: the inspector had a star toggle + checkbox + chevron and „Vizibilitate / Obligatoriu” switches.
  The code (js/form-builder.js addressDataHtml) now has label + type tag + strict chevron, then „Vizibil” / „Obligatoriu” check options, plus
  breadcrumb / ⋮ / 5 tabs. C12a still showed a read-only „Cod cadastral”. Swapping controls would have kept the wrong screens, so they
  were REBUILT from components. New local set on 🧩 Local components › „Form Designer · components (2026-10-21)” 12282:434927:
  `Form Designer / Address part` 12282:435060 (Open × Muted; Label, Show divider; exposed Type / Toggle / Visible / Required),
  `Form Designer / Top bar` 12289:456645 (Mode Edit / Preview; library buttons + segmented control 3),
  `Form Designer / Library · context` 12289:463590, `Form Designer / Stage header · context` 12289:463649 (FO / Context · skeleton).
  Skeleton sets moved to section „US-54 Address pattern · skeleton components” 12300:1758. Old captures archived on 🗑️ Drafts ›
  „Archive · US-54 BO lane captures (2026-10-21)”. Gate: raw 216 → 0, image icons 176 → 0, fractional 282 → 0, clipped 27 → 0,
  not-auto-layout 17 → 0, overlaps 5 → 0 (2 stepper tight-gap false positives: „Documente” matches the audit's /Document/).
  Builders: tools/figma/quality-sweep/form-designer/ (fd-lib, fd-part, fd-topbar, fd-context, fd-screen-edit, fd-screen-preview). Lessons:
  - **Probe the code before swapping a stale capture.** A „raw controls” count can hide a redesign. The CDP probe (inspector rows,
    styles, canvas card, per state) showed the screens no longer matched the code, so swapping would only have made wrong screens look tidy.
  - **Screen = Top bar + Workspace (3 columns).** Grow the screen to the tallest column (inspector 1441 / 1365) instead of clipping
    it at 900. Set the workspace FIXED at max(column hug heights), then the columns FILL.
  - **Old capture layers keep the screen's flow until removed.** Set them ABSOLUTE before building, or every anchor measured against
    the new controls lands 900 px low (C01's first pass did). Re-point connectors to anchors BEFORE moving the old layers to Drafts.
  - **Row lanes read best when the target sits beside its trigger.** C01 alone on row 1, C01a | C12 and C01b | C12a, C01c last.
    Preview arrows leave the segment's TOP and end on the target's left edge at y 36 (the gap between label and screen), so they are
    straight lines that cross no screen. A control near the bottom of a screen drops straight down to the next block's top at the
    control's x (STRAIGHT line, end position {x, 0}): the label lands in empty note space, not on the note text.
  - **Variant regexes: match the full value.** /aligned/ picked „Status=Not aligned”; use the exact name „Status=Figma aligned”.
  - Three equal FILL fields in 610 / 944 give .33 widths: first two FIXED floor((w − 2 gaps) / 3), last FILL. A 1 px spacer centred in a
    32 head gives y 15.5, so let it FILL the height. A bottom border INSIDE + strokesIncludedInLayout shifts centred children by .5,
    so turn it off on bars.
  - Library gaps (kept library-first): outlined Destructive button is white (code „1 eroare” is pink); FO stepper step is 48 high
    (code 56).

- 2026-10-21 · **Destructive = red everywhere** (user: „ALL destructive actions should be red”; code `.is-danger` / `danger: true` /
  `btn-destructive` / `btn-text-destructive`) + missing Ghișeu blocks. GEAP: every enabled destructive dropdown item → the local
  `Post-process menu · item` **State=Danger, Size=Desktop 12268:364506** (swapComponent on the library `.menu-item-action`, label +
  old glyph through the Label / Icon props, FILL kept; stored `danger`/`swap` + `danger`/`recolour` in figma.root): Ghișeu gh-01d /
  gh-11d „Elimină schița” (gh-11c stays Disabled grey = code `aria-disabled` wins over `.is-danger`), Services fee / rule menus
  (Șterge ×3, Dezactivează ×3, Elimină, Anulează programarea), Users (Elimină combinația, Șterge utilizatorul, Inactivează
  utilizatorul), NT Șterge (+ trash icon), Post-processes 2 library + 1 raw captured „Retragere act permisiv” (raw → instance
  12314:362040). Buttons: Post-processes 01g / 02b raw blue „Confirm și continui” → library button-filled-circular Neutral +
  Destructive Medium (code: red confirm for every consequential post-process), Classifiers 04 „Elimină” Neutral → button-text-
  rectangular Destructive Small (code btn-text-destructive), eKYC C01e „Dezactivează organizația” Primary → Destructive. FOD: item set
  890:11544 + State=Danger 1139:812, local `20/circle-x` 1139:809, `Menu separator` 1139:816, `Post-process menu` 890:11545 + slots
  Separator / Danger 1 (BOOLEANs Show separator / Show danger 1) → Requestor P2 menu = Reperfectare · separator · Retragere red
  (206 × 85 = code). eKYC / EVO-WEB RAP: no destructive menu item drawn (only facet „Șterge” = clear selection) → no component added.
  Cabinet: already Danger everywhere. New Ghișeu blocks: gh-02y 12316:31206 (col 03, tacit act: Extra tag on + Status hidden),
  gh-13a 12316:29473 + gh-13b 12316:30439 (col 11 after gh-13, column restacked at 240), markers in gh-01 („→ GH-13a · Clic pe rând”,
  gh-13 relabelled „Enter pe rând”, gh-02x „Clic pe rând”) and gh-01f („→ GH-13b · Spațiu pe rând”). Lessons:
  - **The local item's Danger icon was black**: GEAP's Desktop Danger variant had icon/base on the vector (only Touch was red), and
    the set-wide INSTANCE_SWAP default had become 20/edit. **Any icon swap through the Icon property drops the variant's vector fill
    override** (layer names differ between glyphs) → after setting Icon, bind every icon vector fill / stroke to icon/danger/default
    on the instance (stored `danger`/`recolour` walks `getInstancesAsync()` of both Danger variants). Always set the Icon prop
    explicitly (circle-x for Retragere, delete for Elimină / Șterge, pause for Dezactivează / Inactivează).
  - **Census by label first, then judge each hit by context**: „Șterge” in filter popovers = clear the selection, „Anulare” /
    „Retragere” in tables, selection lists and checkbox options = request types, „Retrage rezultatele” = publish toggle — none are
    destructive. `\b` after „ă” never matches in JS regex (non-ASCII) → use `(?=\s|$)`.
  - BO stack menus have NO separator in code (`renderStackMenu`); act / request menus do (danger last after a separator).
  - Code still shows these destructive buttons neutral / blue (left as the code, listed for proto-engineer + PO): Cabinet draft
    profile „Elimină schița” (btn-neutral, 10×), eKYC profile „Dezactivează” (32) / „Suspendă contul” (11) / „Revocă …” (22),
    eKYC „Dezactivează în schimb” (btn-secondary), GEAP Tariffs „Dezactivează” (btn-neutral); GEAP Users „Retrage” / „Revocă” are
    pre-switch legacy screens.
  - `clone()` + text replace builds a state block fast (stored `danger`/`cloneblock`: label / ID / title / link / note / screen
    texts, cloned markers dropped). Text replace also hits the background list behind a full sheet — harmless, but check.
  - No Agent tool in this session → stored `ghs/audit` on the 3 new blocks + changed menus / footers: only the cloned-shell
    baseline (background registry clips, rows-per-page label, raw scrim, padded sections gap 0); FOD mini gate: 0.

- 2026-10-21 · **Destructive buttons = red in Figma** (code f877023c destructive-red-v1; memory feedback_destructive_red: page / row /
  card = outlined destructive, confirm dialog = filled destructive, inline remove = text destructive). Variant changes only, no fill
  overrides. The library has NO unified „Button” set with Style „Outline Destructive / Text Destructive” — the destructive styles live
  in the separate Components sets: button-outlined-rectangular 4ca8aa00… (BO Small), button-outlined-circular d7a0779b… (pill: Cabinet
  Medium, dialog-footer secondary), button-text-rectangular 4ad2518c… / -circular a9752669… (Style Destructive × Icon=Only exists),
  button-filled-circular fcf938f6… (confirm). Counts: **GEAP** outlined 229 (Tariffs drawer „Dezactivează” 4 + „Șterge” 8 — Șterge was
  FILLED red, code = outlined + trash; Services 07a 3, 06t 1, 10h2 „Elimină destinatarul” icon-only 3; Classifiers „Arhivează” 21 + value
  grid ⏸ / 🗑 icon-only 188; Ghișeu gh-02o „Închide fără salvare” pill 1), text destructive 144 (trash icon-only Strict → Destructive:
  Process Designer 4, Form Builder 91, Editable Grid 42 + 7 FO activity × Neutral cross → text destructive + 20/delete), menu items →
  Danger 2 (Services 06k „Șterge”, NT 03b „Dezactivează” + pause), Post-processes 01g / 02b withdrawal icon brand → icon/danger/default.
  **eKYC** outlined 66 (A02 / A03 „Revocă toate sesiunile” 12, „Suspendă contul” 11, „Revocă celelalte sesiuni” 2, session „Revocă” 8;
  „Dezactivează” C02 5 · C03 21 · C08 6 · D01t 1) + C06g „Dezactivează în schimb” Primary → outlined-circular Destructive (Large = its
  footer); C01e already filled Destructive. **EVO Cabinet** „Elimină schița” 10 (sm-02 / sm-03 desktop + phone) → outlined-circular
  Destructive Medium Leading; confirm modal already Tone=Danger + filled Destructive. **FOD**: nothing drawn (only file / upload ×,
  which is detach, not destructive). Helpers in figma.root „figdes”: redcensus (label census by host set / variant), rediconcensus
  (icon-only census by glyph), btnswitch (toVariant: swap to another set's variant keeping label + icon props, re-fix FIXED height,
  copy a fresh instance's icon fills when the swap left the old colour), redpass (eKYC page pass); swap-to-instances.js maps captured
  destructive buttons now. Lessons:
  - **Cross-set swaps leave the old icon colour** (187 / 188 Classifiers icon-only, all 91 Form Builder trash): after swapComponent +
    setProperties compare the icon vector's bound variable with a FRESH instance of the same variant + props and copy the fresh fills
    (Figma's own variant colour, not a hand override); Style changes inside the same set kept it in some files (eKYC 0 fixes) — always check.
  - **Census by host set + variant, then judge by meaning**: „Șterge” inside the eKYC / Incidents facet popovers and Cabinet filter
    sheets = clear the selection (left neutral), „Șterge filtrele” likewise; file-row × = detach; old pre-switch Users screens
    („Retrage” / „Revocă”) left as legacy. Icon-only buttons have no text → census them by glyph (delete / pause / cross).
  - The library modal footer holds max 2 actions → eKYC C06g can't show the code's third button „Șterge parametrul” (drift reported);
    eKYC / Cabinet confirm footers are Large 48 vs code 40 (footer variant, pre-existing).
  - Not changed (reported): Form Builder „Reguli de comportament” rule × (old hand-built screens, 24 px filled-circular Neutral cross —
    code is now a labelled „Elimină”); Post-process menu mains still carry a non-danger default „Retragere act permisiv” item (instances
    use the Danger slots); no Figma block for pd-27, the FO grid „Șterge rândul”, „Alt document” card, user-create combination card,
    PD „Elimină atribuirea”; no „Retrage din suport” item drawn anywhere.
  - No Agent tool in this session → stored audits on samples (GEAP `ghs/audit`: only the classifier table's pre-existing .5 cell
    centring; eKYC `qsweep/audit-lite` 0; Cabinet `qsweep/audit` 0) + screenshots vs the code captures (trf-03, clf-03, sm-03, ek-21a,
    ek-27k, gh-02o, pp-02b): match.

- 2026-10-21 · **Destructive leftovers drawn as blocks** (user: „Do it in Figma then, super accurate”). eKYC C06g (ek-27k, code 3da8938b): library
  `modal` footer → Style=Destructive · 2 actions · Medium, „Anulează” kept on the file's Neutral Large, „Șterge” Leading 20/delete; content
  component rebuilt in place (new eKYC local `Message · subtle` 10924:1789 Warning + „Ștergerea nu poate fi anulată.”); phone screen added
  (S02e1 phone base cloned, parameters toolbar / tabs / table swapped in, library modal Breakpoint=Mobile 375 docked, header → new eKYC
  `Modal header · phone` 10925:2435, content `Modal content / scr · ek-27k · Mobile` 10925:2468, halves 167.5) — block widened 1920 → 2415,
  4 neighbours shifted +495. GEAP Process Designer: new section `Process Designer · editor states (2026-10)` 12356:3761 with E01 12356:3762
  (pd-33, „Elimină atribuirea” red trash) and E02 12356:5326 (pd-27, „Închide fără salvare” outlined destructive pill in the 3-button
  footer), connector „× Închide”. New local components on 🧩 Local components › `Process Designer · canvas components` (Edge label
  12342:7451, Event node 12342:8326, Decision node 12342:8335, Activity node set 12343:8389, Validation status 12351:7470, Top bar
  12351:8346, Footer 12351:8387) and `FO dialogs · components` (FO confirm dialog 12367:7498). Local `Modal` 10136:657: footer = code
  dialog-footer-v1 (12 · 20 · 24 · 20, gap 8) on Confirmation / Content / Selection + BOOLEAN `Show middle button#12355:0` (third footer
  slot). Form Builder: section 12358:363882 with G01–G04 (fb-55 / 56b / 59b / 59d), arrows from the trash buttons. Lessons:
  - **Resolve library variables by EXACT name.** My first resolver matched by suffix (`/default` + prefix) and bound
    background/base/default → background/danger/default, text/base/default → text/positive/default … (12 wrong). A „fix” by
    old-id → new-id map collided (several names shared one wrong id) and painted everything brand blue. Recovery = rebind by ROLE in
    the mains, then delete and recreate the screen instances (overrides written by the walk). Always `v.name === wanted`, and screenshot
    the first component before using it.
  - **Captures of a canvas editor**: rebuild the canvas from a code SPEC (node type / rect / name / icon / caption / badge / edge labels
    per state, CDP probe) with small local components placed at the code's coordinates; keep only the captured edge vectors (diagram
    lines). The capture alone showed hidden „Pas curent” tags, lost the event icons and flipped the rotated lane titles (abs transform
    −1 → re-set `relativeTransform` to rotation 90 in the 40 rail).
  - **Captured BO / builder roots are GRIDs**: a replaced header / footer lands in a NEW grid row (top bar at y 900, footer at 0).
    After every swap of a grid child: raise gridRowCount, park, place with `setGridChildPosition`, then set the count back.
  - **Sticky columns in captures**: the FO preview stepper is captured inside the scrolled content beside a „Sticky placeholder”.
    Removing the nav collapses the column and slides the form left. Put the replacement in a flow column frame (width 280) with
    paddingTop = sticky y − column y (declared off-scale spacer), delete the placeholder, form FILL.
  - FO stepper · step 11849:7107: `Show connector` draws the line ABOVE the circle → first step off, the others on (24 + 5 × 48 = code 264).
  - Library gaps (declared): outlined button has no Success style (local Validation status), tag-filled has no violet (Sub-proces = Strong
    Brand + purple/600 fill), numbered-badge min 16 (code 14), toast with link is 72 (code 84), no 16/24 or 14/20 600 text styles.
  - Code bugs seen at 8935 (reported): in Process Designer edit mode every node shows „Eroare” and a „Pas curent” tag that peeks out
    beside event circles (`.e-permits-pd__error-tag` / `__current-tag` display:none lost) — Figma draws the intent (id chip, no tags).
  - Not drawn, no demo state (proto-engineer): the FO „Alt document” card (fo-04 + „Adaugă document”), the user-create drawer with one
    role combination (Users registry → „Adaugă utilizator” → IDNP → combination), the eKYC SDK row menu with „Retrage din suport” (ek-31 ⋮
    open). No Agent tool → stored gate audits: remaining = canvas diagram overlaps / clips (absolute by nature), capture centring fractions,
    raw 40 % scrims, minimap image (code <canvas>), chip × and below-the-fold empty-state glyphs.

- 2026-10-22 · RAP act profile header + list rhythm = code a26f8bff rap-header-v1 (user: „remove the left / right padding from the
  header part of the profiles”, EVO-WEB 22083:24817; coordinator: breadcrumb on the same spot on list and profile, actions below the
  title, even list gaps). EVO-WEB ↳ Registrul actelor permisive: the 52 raw `Page header` frames (26 states × desktop + phone, no
  component) → stored pass „hdr”/„rap” (repo tools/figma/profile-header/rap-pass.js): padding L/R 0, top 32 / 24 (= the list's
  breadcrumb spot: (80, 136) / (16, 120)), crumb → title 16, order Heading · Action · Meta, action row 16 under the title (Medium 40 /
  phones Large 48 FILL), details 16 / 8, phone details = 2 columns 163 + FILL; phone title 20/28 (Desktop/Heading/H4), names over 4
  lines (11 phones) clamped with ENDING + new local `Profile / Title toggle` 22302:46097 („Mai mult” 14/20 medium brand + 16 chevron,
  4 under the title, in a `Title block`). List screens (rap-01*, rap-04*): desktop Main gap 0 + per-block top padding 16 · 24 · 16 ·
  24 · 16, bordered / instance blocks wrapped in transparent „… inset” frames, Pagination 16 all round, stale list subtitle removed
  (tools/figma/profile-header/rap-list-rhythm.js); rap-01b popover and rap-01e tooltip moved with their anchors. Columns 01 / 02 / 03
  restacked at 240. Geometry now = code at 1440 / 375 (crumb, title, action, details, search, filter bar, table, pager). Lessons:
  - **Changing `🎚️ Size` on a placed library button leaves its swapped icon in the ICON token** (dark eye on the blue Large
    button; `resetOverrides` + re-setting props did not help). Recreate: `main.createInstance()` of the target variant, copy the
    non-variant props, insert at the index, re-point connectors whose start / end is the old id, remove the old one — the fresh
    instance resolves icon/base-inverse/on-color. The stored audit's `icon-colour-override` caught it; screenshots at 343 did not.
  - **Text clamp order**: `textAutoResize = "HEIGHT"` AFTER `textTruncation` / `maxLines` silently resets them → set auto-resize first,
    then truncation, then maxLines (re-read in a later call — the same call still reports the old height).
  - „Same breadcrumb spot” = give the profile header the list's page top padding (32 / 24) instead of an inset of its own; check the
    list and the profile numerically side by side (x / y of crumb + title).
  - Not changed (reported): the phone list title „Registrul actelor permisive” fits one line in Figma (36) but wraps to two in code
    (72) → phone search 208 vs 244; RAP profile sample data differs from the code (rap-02d number / dates).
  - No Agent tool in this session → stored `rap`/`audit` (run as `new AsyncFunction("R", src)(ids)`): only baseline (phone table
    horizontal-scroll clip, Register gap 0 = padded pager, mixed font in „Results”); connectors 14, unattached 0.

- 2026-10-22 · EVO Cabinet act + request profile headers = code 7ac4e3ff header-actions-below-v1 (file iitScYOwMYjDayuyrm3750; resumed
  once after an API drop — the first call re-counted rebuilt headers by their `Title block` child, so nothing ran twice). All 68 old
  `Page header` frames (25 request + 7 act blocks; pp-01m's five size frames) rebuilt by the stored pass „hdr”/„cab” (repo
  tools/figma/profile-header/cabinet-pass.js, payload = the CDP probe per state, phone = diff from desktop): breadcrumb → title 16 →
  location 8 (16/map-pin-filled tertiary in a 16 × 24 `Pin`, 16/24 secondary) → actions 16 (fresh library instances: Medium 40 /
  Large 48, primary FILL on phones, ⋯ = filled-rect Neutral Icon=Only FIXED 48, „Elimină schița” = outlined Destructive) → details
  16 / 8 (desktop separators = new local `Profile / Header meta separator` 1234:4284, phones copy item full width + 163 / 164);
  Main top 32 / 24, header inset 0, Container 1200 → breadcrumb (120, 136) / (16, 88) = the list title spot. Requests: `Section ·
  Stadiul solicitării` → `Section · Status` = traj/lib card + new `Trajectory · callout` set 1234:4319 (Tone Info / Warning / Success /
  Danger / Neutral, 12 / 16, r 0 0 24 24) in a 0 / 24 `Callout wrap`; phones card 375 edge to edge, p12, no side border, r0. Permits
  list containers 1024 → 1200 (11 screens; pp-01s popover −88), pp-01q menus re-anchored to the new triggers (Focus state), new block
  sm-05w 1237:44581 (long name; phone 4-line clamp + `Profile / Title toggle` 1234:4285), 4 notes rewritten, Start here 06 count +
  line. Lessons:
  - **An INSTANCE_SWAP property that no layer references does nothing** — `setProperties({Icon})` silently kept the variant glyph
    (callouts showed ⚠ instead of the card / clock). Swap the nested instance directly and re-colour it, or bind the ref — binding
    rewrites the default for every variant (see 2026-10-21), so for tone sets with different glyphs swap per instance.
  - **Library icon-only buttons collapse to the 20 icon when HUG** → FIXED 48 × 48 (40 desktop) right after placing.
  - **Phone trajectory = the code's widths, not connectors**: 4 steps with „Informații suplimentare” overflow 351 (negative connector
    width → the whole call rolled back). Probe the step rects at 375, remove the connector instances, FIX each step to its code width
    (last FILL), text + label pill FILL / centred / HEIGHT; the rail halves draw the line. Steps stacked in code (sm-04j, 5 steps) →
    the Vertical card.
  - The traj/lib stored in a file can be older than the repo (Cabinet's has no `snapRow`) — check `Object.keys(TRAJ)` before calling.
  - Storing a 22 KB builder: `(() => {…}).toString()` inside the call is smaller and safer than a JSON-escaped string; `eval("(" + src + ")()")`.
  - Not changed (reported): act profile bodies under the header (pp-01j…y: suspension notice, „Ce permite actul”) still pre-date
    the code; Cabinet phone header bar is 64 (code 65) → phone crumb 88 vs 89.
  - No Agent tool in this session → stored `qsweep`/`audit` on sm-05, sm-04b, pp-01q (desktop + phone) + the callout set: only
    baseline (padded sections gap 0, the 812 pp-01q phone viewport); connectors 31, unattached 0.

- 2026-10-22 · EVO site header = the library component everywhere (user: „make the burger menu and the search visible in the
  header component on mobile” on EVO-WEB 22081:17802; then „exactly this header from Components” 912:18991). EVO-WEB ↳ Registrul
  actelor permisive: headers were already library instances (37 desktop 1248px Anonymous + 42 header-evo-mobile Anonymous) but 41
  phones carried a hidden-layer override on the nested `Container/Actions` frame (search + ☰) — there is NO component property for
  it, so `Actions.visible = true` per instance (the library main shows it). EVO Cabinet: the local `Cabinet / Header` set 1051:3967
  (gov bar + logo + Instance switcher / phone: switcher avatar + ☰) → every live screen instance `swapComponent` to the library
  Authenticated variant (142: My requests 51 + 51, My Permits 20 desktop + 1 at 1920 + 1 at 1280 + 18 phones), renamed
  header-evo-desktop / -mobile, FILL in the screen stack, avatar 🎚️ Type=Initials „AC”; local set marked DEPRECATED (0 instances).
  Archive sections („Archive · before 2026-10”) left as they were. Lessons:
  - **Hidden layers without a property**: check a library instance against its main with skipInvisibleInstanceChildren=false and a
    path-wise visibility diff (instance vs main) — that found the 41 `Actions=false` overrides in one read-only call.
  - **`swapComponent` keeps the node id** → connectors / anchors on the header survive; check `getInstancesAsync()` on the old set = 0.
  - **Avatar Image → Initials inside the library header** keeps the Image variant's HUG / MIN-align overrides from the header main:
    the 40 avatar rendered 20 wide with „AC” in the corner. After `setProperties({"🎚️ Type":"Initials"})`: sizing FIXED, resize to
    the variant main (40 desktop / 32 phone), copy the main's primary / counter alignment. Screenshot one before the batch.
  - Code drift (reported, code agent on evo-header-v1): at 375 the Cabinet code still shows logo + switcher, RAP logo + „Intră în
    cabinet” only (rap-evo.css hides `.rap-header__actions` ≤ 1100); Cabinet desktop loses the switcher name / role („SRL Global
    Trader”) — the library header has avatar only.
  - No Agent tool → stored `qsweep`/`audit` (Cabinet: header-evo-desktop / -mobile + sm-01 desktop / phone = only the old Pager
    paddingRight 1) and EVO-WEB stored audit (rap-01a = only the known table-scroll clip / Register gap 0 / mixed „Results”).


- 2026-10-22 · „Mobile only” desktop placeholder (job mobile-only-placeholder-v1; user: „a very simple skeleton with a nice text in
  the centre … as the screen for desktop as well, so we always have alignment”). Local component **`Placeholder / Mobile only
  (desktop)`** = EVO-WEB RAP `22319:14063` (section „🧩 Mobile only placeholder (2026-10-22)” 22319:11448 on 🧱 Local Components) ·
  GEAP `12373:364231` (section 12373:364230 on 🧩 Local components). 1440 × 900 (RAP) / 1024 (GEAP), screen-frame rule (clip,
  radius-16, 4 px OUTSIDE border/base/default), skeleton = header bar + breadcrumb / title / toolbar bars + 5 rows in
  background/base/secondary on spacing / radius tokens, ABSOLUTE `Message` card (CENTER / CENTER constraints, p 32/40, gap 8,
  1 px border, r16) with TEXT props `Title` (Desktop/Heading/H5) + `Text` (Desktop/Body/Default, text/base/secondary). The
  instance goes FIRST in the block's `Screens · desktop + mobile` row and is resized to the column's desktop size (FO 09 1080).
  Placed: RAP rap-04 / 04a / 04b / 04c / 04d (column 02 restacked at 240, section refit, 14 connectors re-routed, Start here line);
  GEAP FO 09 F3s / F3t (gap 392 kept), Post-processes 11c (gap 200 kept, 6 blocks below +192). EVO Cabinet: 0 phone-only blocks
  (all 69 have desktop + phone) → no component built there. Builder + census: tools/figma/mobile-only-placeholder/. Lessons:
  - **Find phone-only rows by geometry**, not by title: every `Screens…` wrapper with a visible child < 500 wide and none ≥ 1000
    (skip archive / drafts). A 328 BO side panel (Address C11) matched < 500 — check what the narrow frame is before placing.
  - **Restack with the column's OWN gaps** (snapshot gaps before inserting, then re-apply): RAP uses 240, FO 09 392, Post-processes
    200 — a blanket 240 would have pulled two boards out of rhythm. Adding a 1440 desktop also widens the note (FILL), so a block can
    get SHORTER (rap-04: 1546 → 1526) — always restack, even when the phone is taller than the placeholder.
  - Absolute centred card in a component: set x / y to whole pixels for the default size and constraints CENTER / CENTER; instance
    resizes (900 → 1024 / 1080) keep it centred on whole pixels when the card height is even.
  - Library variables found from a sample screen's bound variables (collection key → `getVariablesInLibraryCollectionAsync`, exact
    names `spacings/spacing-N`, `border-radius/radius-N`) — same builder works in both files without hard-coded keys.
  - No Agent tool in this session → figma-audit rules run inline on the 2 components + 9 instances: 0 findings; block gaps re-read.

- 2026-10-22 · profile-header-phone-medium-v1 (user on EVO-WEB 22083:24857: „use medium button not large — everywhere”; + coordinator
  scope: phone headings → Foundations „Mobile/…” styles, desktop modal / dialog footers → Medium). Done:
  - **Phone page-header actions Large → Medium** (fresh `variant.createInstance()` per button, props copied, FIXED 40, primary FILL
    kept, ⋯ icon-only FIXED 40 × 40, connectors re-pointed): RAP 26 (rap-02…, rap-03…), Cabinet 47 (My requests 34, My Permits 13);
    GEAP has no phone page header with actions (FO wizard / Requestor footers are not headers — left Large). pp-01q phone row menu
    moved up 8 to stay anchored to the 40 trigger.
  - **Phone headings** (`setTextStyleIdAsync`, Foundations lk-e9e8 keys: Mobile/Heading/H1 67a58071… 32/40 · H2 5f403565… 28/36 ·
    H3 922cb277… 22/30 · H4 47680a7a… 18/26 · H5 27560715… 16/24; no H6 in use): local mains used ONLY on phones edited in the main
    (RAP Modal header · phone, Document modal Mobile, 4 filter sheets; Cabinet Confirm modal Mobile ×2, 5 sort / filter sheets,
    Modal header · phone; GEAP 3), shared mains (Profile / Section title, library .modal-header, section header) overridden per phone
    instance. Counts: RAP 162 texts, Cabinet 44, GEAP FO 09 29 (11 hidden skipped). Values change vs code: H4 20/28 → 18/26,
    H5 18/26 → 16/24, H2 32/40 → 28/36 (Cabinet Confirm modal Mobile) — code must follow.
  - **Desktop modal footers Large → Medium**: library `.modal-footer` = footer `Size=Small` + swapComponent each button to the
    Medium variant of ITS OWN set, re-set props (see 2026-10-19); local mains edited in place (`setProperties` Size keeps ids so
    instance overrides survive): RAP `Document modal (MDocs act)` Desktop, Cabinet `Confirm modal` Desktop ×2, GEAP `Modal`
    10136:657 (Confirmation / Content / Selection), `Process Designer / Footer`, `FO confirm dialog`. Raw captured
    `modal-buttons` rows recreated as Medium. Totals: RAP 10 footers + doc-modal main; Cabinet 7 + Confirm main; GEAP Services 121,
    Classifiers 34, Tariffs 39, User Mgmt 22 + 2 lib, PD 6 + 2 lib, Form Builder 2 + 35 lib, Editable Grid 13 lib, Incidents 3 lib,
    FO 09 1 + 3 lib, Post-processes 1, FOD Requestor 2; eKYC 32 lib footers / 62 buttons; FOD file 2 + 3 lib.
  Lessons:
  - **Never find „modal” by an ancestor name** — screen names carry it („F4a · Add file — modal”, Ghișeu `Dialog` = the whole desk
    form) and 109 wizard / form footer buttons went Medium by mistake (reverted to fresh Large instances). Require a real modal
    structure: a `.modal-footer` instance, a `modal-buttons` row, a `Footer` whose parent is named `modal` / `Modal · …`, or a known
    local modal main; exclude names starting with Desktop / Mobile / Block / Screen. Dry-run with labels + parent chains first —
    „Înainte”, „Salvează schiță”, „Solicită” in the list = not a dialog.
  - Shrinking footers / headers changes block heights: restack every touched column from an ordered list (RAP 03, Cabinet 02–06 +
    04 Permit profile drifted 2–16 px); on GEAP FO 09 only gaps 380–399 were normalised to the 400 rhythm (552 / 288 / 476 are
    deliberate) — check the column's own rhythm before restacking.
  - A cross-set swap inside a library footer can keep the old icon colour (eKYC Destructive „Șterge”): compare with a fresh
    instance's vector fills and copy them — 1 of 62 needed it.
  - No Agent tool in this session → inline audit (raw controls, spacing / radius scale, clipping, fractions, unbound colours, text
    styles, icon = label colour, phone-header Large, desktop heading on phone) on RAP 22083:24817 / 22083:24612 / 22087:27918,
    Cabinet 1236:48359 / 1126:3637 / 1069:12065 / 1211:44763 / 1066:966 / 1066:1011, GEAP 9977:173106 / 10998:103943: 0 findings
    from this job (baseline only: pp-01m 1280 × 720 viewport clip, GEAP 01f tab content under the scrim).
  - Not changed / reported: RAP phone PJ avatar still a suitcase glyph (rap-02 Beneficiar card); Ghișeu / FO wizard footers stay
    Large (not dialogs); drawer footers that reuse `modal-buttons` (Services user-create, Template preview) went Medium with the
    class — tell the code agent if drawers should differ.
- 2026-10-22 · Follow-up (code a32c66d3 / a02fa7d1 / f39e1079): **exceptions to the Mobile type + Medium footer rules.**
  - Phone sheet / dialog / drawer titles keep Desktop/Heading/H4 in the 32 title line (sheet-header rule, code 20/32) and the
    phone profile title keeps Desktop H4 20/28 — reverted: RAP 26 titles + 9 library modal headers + 6 phone-only mains, Cabinet
    33 titles + 2 modal headers + 7 mains + Confirm modal Mobile ×2 (was H2 → now H4), GEAP FO 09 7 modal titles. Only SECTION
    headings (H5 → Mobile H5) and content headings stay on Mobile styles.
  - **Drawers stay Large 48 at every width; only centred modals are Medium.** Reverted to fresh Large instances: GEAP Services 87
    (user-create drawers + Template preview), Tariffs 39, Classifiers 21, User Management 22 (old „modal” frames that are right-
    docked full-height = drawers), `Process Designer / Footer` main (full-screen editor dialog) + 4 instance overrides, Local
    `Components · Preview` (Template preview). Tell a drawer from a modal by geometry, not name: docked to the right edge, y 0,
    full parent height, or inside `user-create__*` / `Drawer` / `ntpl-sheet`. Only revert nodes this job created (id ≥ the job's
    first new id) so pre-existing Medium buttons stay.
  - RAP „Beneficiar” avatar is already `RAP / Beneficiary avatar` Type=Company = 24/business-filled c477fc69 (the glyph just reads
    as a case); the only suitcase / luggage glyphs on the page are home-page service categories, not companies — left.

- 2026-10-22 · stepper-current-stroke-v1 (user on FOD 756:24789: „all stepper need update with the outer blue stroke for bg”, then
  „it disappeared everywhere” / „its position changed from OUTSIDE to INSIDE”). **Root cause = my own sweep of 2026-10-04 12:00–12:02
  UTC** (main session, Filtrare tables / shadows thread): use_figma „Outside strokes → inside with 1px border-width token inset, all
  pages” (9 GEAP pages, 298 frames) + „Fix outside strokes in local main components” — every OUTSIDE stroke in a local main used on
  those pages → INSIDE, and each 0 padding under it bound to border-width/border-1. It hit `.step-desktop` 1117:10830 Vertical ×
  Current: `Frame 634403` band (8 px, blue-sky/100 = the fill colour) went INSIDE + padding 1, so the band vanished and the circle
  moved 1 px. Proof: FOD still holds two imports of the same key c1cf0e4f — 1:417 (pre-sweep: OUTSIDE 8, padding spacing-0, 81
  instances) and 756:20884 (post-sweep: INSIDE 8, padding 1, 9 instances); the Form Builder copy 8715:79128 kept OUTSIDE. The
  code was never stored in a repo script (tools/figma/tokenize.js only binds 1 px paddings). Fixed:
  - GEAP main 1117:10837 band → OUTSIDE, padding back to spacings/spacing-0 (= the original) → 161 instances inherit (0 overrides).
  - GEAP `FO stepper · step` 11849:7107 State=Active `Row` had no band at all → stroke 8 OUTSIDE bound to background/brand/secondary
    (= its fill, = code `.e-permits-fo-stepper__item.is-active .e-permits-fo-stepper__row`) → 65 instances (Ghișeu 59, Form
    Builder 4, Address 2).
  - Clipping: 6 wrappers cut the band (Services 04b preview `fo-stepper` / `fo-request__sidebar` / `fo-request__inner`, Form
    Builder 4 × `FO stepper`) → clip off (nothing else overflowed). Re-check: 0 cut.
  - FOD: 9 instances on 756:20884 → `swapComponent(1:417)` (same key, pre-sweep version; props re-set) → 90 / 90 OUTSIDE, 0 cut.
    EVO Cabinet: 1 Current instance, old import, already OUTSIDE. eKYC: no step instances. Horizontal Current / .step-mobile /
    `Stepper · drawer` have no band in the library — untouched.
  Lessons:
  - **A bulk geometry „cleanup” must list what it changes and skip intentional values**: a stroke in the fill colour ≥ 4 px is a
    spread band, the 4 px screen frame is OUTSIDE by rule. New audit rule `band-stroke-inside` in tools/ui-qa/figma-audit.js.
  - **Bisecting a Figma regression**: REST `?version=` node requests come back without children for big files; instead compare
    the OTHER files' imports of the same component key — each import is a frozen copy of the library at that time.
  - GEAP must publish the `.step-desktop` + `FO stepper · step` change; FOD / Cabinet then accept the update (their newer imports
    would otherwise stay on the INSIDE version).
- 2026-10-22 · Follow-up „icon containers on the flow page main” (user via coordinator, no node link). Searched for other 2026-10-04
  sweep casualties: FOD (247 remote mains) and EVO Cabinet (215) hold pre-sweep imports of GEAP components — the ONLY OUTSIDE stroke
  in any of them is the step band, so no other imported GEAP component lost an OUTSIDE stroke. The intact sweep signature (INSIDE
  stroke + padding bound to border-width/border-1) is left on one GEAP main: `Flow · annotation` 9796:901 (24 numbered dot, 2 px
  border/base/subtle ring) → restored OUTSIDE, padding spacing-0, strokesIncludedInLayout off (24 × 24 kept), 19 instances
  (Workplace 11, App Shell 8). Icon-container scan of every GEAP / FOD page (single icon child ≤ 72: off-centre, overflow,
  padding 1, INSIDE ring): FO 09 (562), Post-processes, Address, Requestor clean; the 2 px INSIDE rings on stacked avatars
  (switcher „Arată mai multe” 11532:8017, App Shell 9822:3971) match the library `.avatar-stack` (border 2 px = inside) — left.
  Lesson: when the user names an area without a link and the first scans are clean, ask for the node link before changing more.

- 2026-10-22 · filter-figma-sync-v1 (code filter-bar-v2/v3 1e6f9e54 / 4e6d9ea2, facet-popover-v2 855cba8a, filter-sheet-height-v1
  e2fea8e8) in four files. **Filter bar** = one box, padding 12 all sides (spacing-12), radius-24, border INSIDE + strokesIncludedInLayout
  (66 = code), WRAP with counterAxisSpacing 8 / itemSpacing 12, and the wrap order done in auto-layout: Chips HUG + `Meta` **FILL with
  minWidth = its hug width and primaryAxisAlign MAX** → one line while both fit, otherwise Meta drops to line 2 right-aligned (tested
  at 1280 / 900 / 700). RAP 5 raw bars; Cabinet `Facet filter · bar` set 1056:2150 (3 variants → 7 instances); GEAP BO
  `advanced-filter/bar` 9645:1949 restructured IN PLACE to the table-card inset: root VERTICAL 8 / 16 / 16 / 16, no root stroke in
  layout, keeps its bottom line (= the tabs' top line), child `Box` holds Chips + Meta (moving nodes inside the main kept every chip
  override on ~40 instances); visible instances → HUG and the toolbar frame above loses its bottom stroke; 4 raw GEAP bars (Advanced
  filtering 02 / 02a / 02b, Services 02, Ghișeu gh-01c) restyled the same way; Fees / Tariffs stacked lists (`.e-permits-pay__filters`)
  = root inset 0 + no outer stroke (3 instances in the Local components content set). eKYC `Advanced filter · bar` 10819:2467 same
  change (16 instances) + 9 blocks shifted +26. **Facet popover**: RAP `Facet filter · popover` 22068:187098 and Cabinet 1056:1397
  upgraded in place — BOOLEAN `Show search` on a `Search head` (8 / 8 / 0 / 8, library search-input Medium, exposed), `Options` =
  native SLOT (createSlot, options moved in, overrides of the one existing instance survived), minWidth 270 / maxWidth 440 on the
  main, width per instance (440 / 408 / 424 measured), list clipped at 440 for long lists (instance FIXED 440 + slot FILL). Option
  sets: checkbox → value 12 (spacing-12) on every variant (RAP 22064:6908, Cabinet 1056:333, eKYC 10819:1399, GEAP raw popover rows).
  New blocks: RAP rap-01r 22338:161898 / 01s 22338:163565 / 01t 22338:165188 / 01u 22338:166822 (desktop popover + phone „Filtre” sheet
  with the section open and the search on top; heights = code 440 / 271 / 239 / 217), Cabinet pp-01s3 1252:47814 (307 = code) and
  sm-01aa 1252:48916 (225 = code). **Phone sheets** (filter-sheet-height-v1): RAP 04a / 04b / 01b contents were single-facet sheets the
  code no longer has → rebuilt IN PLACE as the all-filters sheet; hugging sheets = sheet + Content Slot HUG (655 vs code 656); searching
  states are held at the max (796, slot FILL) like GEAPSheet.hold; section rows 56 + 1 px top border in layout and body bottom 16 = the
  code's 519 body. Cabinet pp-01s rebuilt as the all-filters sheet; sm-01f / 01t / 01g / 01h / 01p already hugged; eKYC sheet contents
  already hug (0 instances). Lessons:
  - **Check `componentPropertyDefinitions` before `addComponentProperty`**: Cabinet's popover already had an UNBOUND „Show search”
    property — I created „Show search2”; fixed by binding the old key and deleting the duplicate.
  - **`editComponentProperty` can't rename a SLOT property** (throws, whole call rolled back); `createSlot()` on a frame named
    „Options” gets the property name from the slot name anyway.
  - **Switching a frame's layoutMode HORIZONTAL → VERTICAL flips its children's sizing** (the new Box went FILL vertically, 39 px):
    re-set both sizings on every child right after (known rule, hit again).
  - **New frames clip by default** (`createFrame()` clipsContent true): the Box cut the absolute popovers that live inside chip
    „Dropdown wrap”s — set clipsContent false on wrappers that host open menus.
  - **Bars in GRID parents** (Ghișeu header, eKYC registries): growing a child does not grow a FIXED grid row — set the row HUG / the
    new height and take the delta from the table row of the parent grid, or the tabs slide under the bar.
  - **`clone()` of a component in a section lands on the PAGE** — append it to the section and place it below the section's lowest
    child, or it overlaps other components (both files).
  - Library search-input: `Focus` renders the placeholder text dark with a caret (= typed value) → empty focused field = `Default`;
    typed value = `Focus` + Clear Button (one ring per screen).
  - Code states can need longer waits in the CDP probe (typing demo states filled the field ~12 s after load); `offsetParent` is null
    for position:fixed popovers — test visibility with `getClientRects().length`.
  - Variant values containing „Popover” / „Sheet” trip the dropdown-effect audit → RAP option sizes renamed Desktop / Touch
    (tools/figma/rap/screens.js patched).
  - No Agent tool in this session → stored audits (`rap/audit`, Cabinet `qsweep/audit`, GEAP `ghs/audit`, eKYC `qsweep/audit-lite`) on
    every changed block / component: only board baseline left (phone viewport clips, table scroll, pager 1 px, padded Register gap 0,
    pre-existing Fees list title padding 11); fixed 1 unbound option label fill (Advanced filtering 02b).

- 2026-10-22/23 · act-alert-card-v1 → v2 (EVO Cabinet iitScYOwMYjDayuyrm3750; code a4122013 + 78cb1341). New local set **`Alert card`
  1259:4099** (section „Components · Alert card (2026-10-22)” 1259:4100 on 🧱 Local components): Status Info / Warning / Danger /
  Success × Layout Row (desktop: p24, gap 16, `Actions wrap` STRETCH + paddingLeft 8 → buttons 24 from the text and centred on it,
  text maxWidth 698 = the code's 75ch) / Stacked (phones: p16, icon gap 12, buttons in a right-aligned row 16 under the text) ×
  Buttons None / One / Two; TEXT props Title / Text; exposed `Button` / `Quiet button` / `Primary button`. Title = Mobile/Heading/H5
  (the only 16/24 SemiBold style; declared), text Desktop/Body/Small + text/base/secondary, surface background/base/secondary,
  radius-24. Primary = library button-filled-circular Primary Medium (the pill IS a library variant — no radius override); quiet
  (v2 „btn-outline-strict”) = button-outlined-circular Strict Medium with a white fill (background/base/default) on the instance —
  the library outlined button has no fill, it vanished on the grey card. „În examinare” uses EVO DS 24/time-filled c011c86f…
  (Foundations has none at 24), recoloured to the tone token. Applied by tools/figma/alert-card/apply.js (idempotent: removes old
  `Alert`, the trajectory `Callout wrap`, header actions listed in `rm`; Panel top 24 / 16; wrap bottom 24 / 16 requests, 16 acts):
  29 existing blocks (sm-03…sm-05w, pp-01j / 01k / 01q) — 52 old `Trajectory · callout` instances removed, „Suplinește informații” /
  „Achită 500,00 MDL” removed from sm-04b / 04h / 04c / 04d headers; sm-04h got the retry note (clone of the Request row `Retry`
  frame). New act blocks (tools/figma/alert-card/act-block.js, clone of pp-01j + code header / body rows): pp-01e 1267:3919,
  pp-01i 1268:3919, pp-03 1268:4752, pp-03a 1268:5385, pp-03b 1268:52004, pp-03c 1268:52636. Card heights = code to the pixel
  except three where Figma wraps one line less / more (sm-04k desktop 96 vs 116, sm-05q / 05r phone +20) — font metrics, declared.
  Lessons:
  - **Probe the code once for every state × width before building** (scratch probe.mjs: tone, glyph, title, text, buttons with
    classes / icons, card / content / actions rects, header height + actions, next sibling, trajectory labels): it gave every
    spec and caught the extra states that also carry the alert (sm-03e/f/g, 04d, 04l, 05l/m/p/q/r/s/w, pp-01q) beyond the brief.
  - **Text layers created then given `characters` are auto-renamed** to their content → name them AFTER setting the text and set
    `autoRename = false`; a later `findOne(name === "Text")` returned null and the call rolled back.
  - **Per-line label tints** (code `box-decoration-break: clone`): `Trajectory · step` 1087:2497 Current / Suspended / Attention
    horizontal variants got a `label-lines` VERTICAL CENTER wrapper with the old `label-pill` + a hidden `label-pill 2` (TEXT
    `Label line 2#1261:0`, BOOLEAN `Show label line 2#1261:15`). Phone steps whose label wraps in code are split by word (sm-04b /
    04h „Informații / suplimentare”, sm-04c / 04d / 04g „Spre / achitare”). **A FILL pill inside a new HUG wrapper freezes at the
    main's width** (every phone pill became 77) → set pill + text HUG / WIDTH_AND_HEIGHT on every instance right after.
  - Two-button stacked alerts: with v2's shorter „Solicitare nouă” the pair fits one 311 row → Stacked/Two = one right-aligned
    row (quiet, primary). Figma wrap can't do the code's wrap-reverse (primary on top when they don't fit) — declared.
  - Phone act headers: code shows the labelled „Postprocese” (not ⋯) → pp-01j / pp-01l phones switched by setProperties (id kept,
    the pp-01j → pp-01q connector stays attached). „Valabil până la … (N de zile rămase)” wraps the days onto line 2 on phones.
  - **The Figma MCP stalled for ~17 min per call twice in this job** (also after the machine slept). Check node existence with the
    REST API (`/v1/files/:key/nodes?ids=…&depth=1`) — it answers when the plugin bridge does not — and write the lessons /
    remaining list early.
  Still open when the bridge died (to resume): sm-05u / sm-05v blocks (clone sm-05 1133:3935, header Aprobat tacit Brand / Aprobat,
  trajectory 3 steps, Date generale rows from the probe), v2 header „Vezi solicitarea” without icon (pp-01x / 01y / 01m desktop
  carry a leading icon), restack columns 02–06 + 04 · Permit profile (new act blocks parked at y 20000), arrows check, notes for the
  6 new blocks are set, Start here 06 / 04 counts + file index, stored figma-audit on the set + changed blocks.
- 2026-10-23 · Same job, finished after the bridge came back: sm-05u 1275:3919 / sm-05v 1275:4805 (clones of sm-05, header, meta,
  trajectory, Date generale from the probe; sm-05v hides the Location line), v2 „Vezi solicitarea” without icon in the pp-01m / 01x /
  01y headers (7 buttons, `📍 Icon` None, ids kept), sm-04h retry note shown (a frame cloned out of a component main keeps the
  main's hidden state — set `visible = true` on the clone and its children, and `primaryAxisSizingMode = "AUTO"` after switching it
  VERTICAL or it keeps the old 48 height), 8 notes rewritten (≤ 37 words), columns restacked at 240 twice (after the notes), 28
  connectors re-routed (0 unattached), Start here contents + counts (Permits 25, My requests 54) and the cover index updated.
  Stored `qsweep/audit` on the set + 5 blocks: only the section-over-card gap 0 baseline. Lesson: **resume = count first** — the
  REST nodes call plus a per-block census of `Alert card` instances showed exactly what had landed before the interruption.

- 2026-10-23 · sort-chip-icon-v1 (code e538ea01; user: „Data depunerii sort: instead of the chevron use the sort icon from mobile”).
  EVO Cabinet iitScYOwMYjDayuyrm3750. There is NO local sort-trigger component (Sort trigger 1119:3048 was deleted 2026-10-21) —
  the desktop sort was a per-block library button-filled-rectangular Neutral Trailing Medium, so the fix is per instance:
  **desktop sort = library filter-chip `Mode=Off, State=Default, Icon=Leading` (1175:45402, = the Filtre chip)** via `swapComponent`
  (node id kept → connectors stay), Label = the key, Counter Badge / Indicator off, nested icon `swapComponent` to the phone square's
  glyph 1205:3757 („arrow-bottom-top, sort 2” filled=on 1.5 r2), FIXED 40 / HUG, radii bound to the Filtre chip's variable
  (border-radius/radius-6 in this file — the code says 8; kept identical to Filtre, declared). Open = `State=Hover` (tertiary-hover =
  the code's pressed #D9D9D9) + effect style Focus Ring/Medium 1296:337 — the chip's own Focus variant has the RESTING fill, so it is
  not the code's open look (Filtre open still uses Focus — reported). Counts: My Requests 21 desktop triggers (sm-01f / sm-01t open);
  My Permits had NO sort at all (acts-sort-v1 never drawn) → 10 desktop chips „Data emiterii” added after Filtre + 10 phone sort
  squares (clone of the Requests square; pp-01h corner badge re-placed at chip x + 33), new block **pp-01s1 1282:63683** (col 02, desktop
  Sort menu instance cloned from sm-01f, 5 keys, Item 6 hidden, width 196 = code; phone 812 viewport + library bottom sheet with the new
  `Sort sheet content · pp-01s1` 1282:63635), connector pp-01 sort chip → pp-01s1, Start here + band 02 line + cover count 26.
  RAP and GEAP: no sort chip (Ghișeu „Data creării” chips are date facets). Lessons:
  - **Check the sister board before „just swap”**: the brief said update Permits too; the census found zero sort triggers there —
    the code feature (acts-sort-v1) had never reached Figma. Census both boards by label + host set before planning counts.
  - **Radio rows: the visible text is `⌨️ Label`, not the first TEXT property** — `⌨️ Supporting Text` comes first in the key list;
    pick properties by name prefix, and screenshot the component before using it.
  - A slice appended into an auto-layout screen joins the flow (screenshot came out blank) — screenshot the frame with get_screenshot
    instead of slicing.
  - pp-01s2 (sort applied „Valabil până la”) has a demo state but no Figma block yet — open.

- 2026-10-23 · acte-necesare-docs-v1 (user on GEAP 11350:134585 G7b summary: old grey doc rows + „Documente însoțitoare”; code
  c56fa4dc acte-necesare-label-v1). Rename = range replace in every text (insertCharacters after the match + deleteCharacters,
  so styles and NODE links of TOC lines survive), map: „Documente însoțitoare” → „Acte necesare”, „documentele însoțitoare” →
  „actele necesare”, „«…»” / „pasul …” → „pasul „Acte necesare””, „Niciun document însoțitor” → „Niciun document atașat”,
  „Documentele însoțitoare sunt anexate” → „Actele necesare …”. Counts: GEAP 167 texts (Ghișeu 74, Services 41, Dossiers 19,
  Editable Grid 7, FO 09 5, Post-processes 4, Requestor 4, App Shell 3, Incidents 3) + 82 Ghișeu frame names → „Required
  documents”; FOD 6; EVO Cabinet 4 (archive skipped); eKYC 0. Left as the code: Services log type „Editare document însoțitor”.
  Old rows: GEAP Requestor guest lane G7b summary 5 raw rows → 4 `Document · card` Summary (code fo-g7b: 4 uploads, no Extras),
  G7a / G4a / G5 attached raw rows (24/document-filled glyph) → Field value cards (6); FOD Verificare (WIP) 1 raw + 2 library
  file-item / system-files-item rows → Summary cards. Phone fields (coordinator): G7a phone rows HORIZONTAL → VERTICAL gap 16,
  button FILL 40; inline star via the new `Document field · label` on 77 GEAP + 32 FOD labels (FO 09 F4–F4h phones replaced the
  label-only text-input holders). Desktop × centred: `Document · card` Field value Desktop „Remove ×” constraint CENTER, y
  (68 − 32) / 2 in GEAP + FOD (phones keep y 6). Lessons:
  - **Range replace, never `characters =`**, for texts that may carry links / mixed styles (TOC lines, notes).
  - **A label-only library text-input is a hack**: its star sits at the row's right edge on every FILL label. Census those
    holders (`text-input` ≤ 50 high next to a desc text + „Adaugă fișier”) and use the label component.
  - **A cross-set swap can leave a dark icon even after copying a FRESH instance's fills** (the fresh instance of
    button-filled-rectangular Secondary also renders icon/base) — copy the vector paint of a correct sibling button
    („Adaugă fișier”, icon/brand) instead, and re-run the audit's icon rule.
  - Code drift fixed on the way: „Alte documente” desktop button = „Adaugă document” Secondary Medium under the text (was „Adaugă
    fișier” on the right; 8 FO 09 desktops), phones outlined Small → Secondary Medium (11). Column F4 gap 392 → 400.
  - Left (reported): guest lane G7* desktop steppers are captured with image-fill checks (board baseline); FOD Attachments page
    file-item rows (upload pattern page, not a summary); F8 finish card system-files-item.
  - No Agent tool in this session → stored `ghs/audit` on the changed blocks: only label → description gap 6 (= code) and the
    baseline stepper fractions / image checks.
- 2026-10-23 · Same job, coordinator answers: (1) **toolbar chips radius = the library Button radius of that size: 8 for 40 / 48,
  6 only for the BO 36** → Cabinet 42 + 22 desktop Filtre / sort chips bound to border-radius/radius-8 (archive r999 facet chips
  untouched; the phone 48 chips already 8); RAP 33 filter chips (14 desktop 40 + 19 phone 48) radius-6 → radius-8
  (VariableID:dc82cc9d…/1308:580). The 2026-10-21 RAP lesson („r6 = the Medium button”) is superseded. (2) **Open Filtre = code
  look**: chip `State=Hover` (tertiary-hover = pressed #D9D9D9) + Focus Ring/Medium effect style, not the chip's Focus variant
  (resting fill). Cabinet sm-01g / 01h / 01p / 01aa, pp-01s / 01s3; RAP rap-01a / 01b / 01r / 01s / 01t / 01u. Active-and-open
  chips (black paints copied from Mode=On: RAP rap-01c / 01h / 01d) stay Focus + black = code (`is-selected` + ring). Recipe: snapshot
  non-variant props + icon main → swapComponent(Hover) → setProperties → re-swap icon if lost → FIXED 40 / HUG → re-bind radii →
  effectStyleId. (3) New block **pp-01s2 1285:19457** (col 02): clone of pp-01, sort chip „Valabil până la”, rows re-ordered in BOTH
  `Acts` frames by validity ascending with Retras / Expirat last (the code's order: nearest first, inactive after; probe =
  per-row meta text in order, scratch figdes-sortchip/probe2.mjs), connector from the pp-01s1 menu („Valabil până la” item via a
  `position` start on the menu instance), Start here 27 / 54 + Filters · 5, cover 27. Lesson: **the CDP helper writes screenshots
  to the process cwd** — run probes with absolute output paths, or they land in the repo root.
  Drift (reported, not fixed): the Figma Permits rows still use the pre-„type first” anatomy and older sample data (9 acts vs the
  code's 12; titles = location).

- 2026-10-23 · section-card-radius-24 (comment 1978649554 on GEAP 9579:18162, user: „update to 24 px, everywhere for this type of
  wrap”, all four files). The section-over-card grey wrap (`Card` / `Timeline` FRAME, 1024, background/base/secondary, child of a
  `Section…` frame under the section heading) = **radius-24** (Foundations › 3. Sizes `border-radius/radius-24` key 79848dbe4107…,
  GEAP id VariableID:79848dbe…/4433:106) = code `.e-permits-dosar-profil__card` (24; phones 16). Rebound all four corners on 188
  frames, all in GEAP: Service passport 162, Application Shell 24, Notification templates 2 (Timeline). EVO-WEB RAP cards were
  already 24 (83) / 16 phones, EVO Cabinet `Card` already 24 (desktop + phone), FOD has no grey section cards — 0 changes there.
  Excluded after the dry run: no-fill layout `Container`s bound to radius-32 (hundreds; invisible corner), the white FO `Section
  Title` / auth cards (GEAP Patterns 1928:4414, App Shell `Auth card`, FOD Requestor / Attachments / Apostile), board lanes, the
  EVO home / Signature / CUPS hero bands (`Header / 97 /`, `Layout / 12 /`, `Event / 20 /`, `Panel`) and footer containers.
  Lessons:
  - **Radius sweeps: dry-run census first, grouped by type | name | width | fill variable | parent** (skip fill = none, flag
    in-instance / in-component / archive) — one call per file with `ALL` pages minus drafts / archive / separators ran in seconds
    and made the scope obvious; then apply with a tight predicate (name + parent + fill var + radius var) and re-count to 0.
  - Bind via `importVariableByKeyAsync(key)` and check `variableCollectionId` contains the Sizes collection key before writing.
  - Stored `ghs/audit` on 8 changed cards: 0 findings; blocks 01 / 04b only the known section-over-card gap 0 + egov logo baseline.

- 2026-10-23 · ghiseu-comments-fixes-v1 (GEAP Ghișeu board). (1) **Inner-shadow dividers**: 98 „Filtrare dosare” toolbar frames
  (Ghișeu 95, Process Designer 3) had an INNER_SHADOW 0/−1 r0 as their bottom line → bottom stroke 1 on border/base/default
  (VariableID:9fa253…/1296:283), INSIDE, strokesIncludedInLayout false, effect removed; sizes unchanged. EVO Cabinet / EVO-WEB / FOD /
  eKYC: 0. Root cause: the BO toolbar CSS draws its line as `box-shadow: inset 0 -1px 0` (e-permits-acte-permisive.css), the capture
  maps inset shadows to INNER_SHADOW and no swap step normalised it (only eKYC swap-screens.js did, locally). Fix: the step in
  swap-ghiseu.js + swap-workplace-registry.js and the sweep tool. Left alone (rings, not dividers): 15 captured raw chips with an
  INNER_SHADOW spread 1 (Services 12, Ghișeu 3) and the instance-switcher selected role card (deliberate code inset).
  (2) GH-12 entry arrow `gh-11b → gh-12 · Opens the draft link after 90 days` 12488:361363 from the oldest draft's number cell
  (C-2026-004688, 11798:30217) LEFT → GH-12 LEFT (GH-13a's table sits under the opened draft — not a visible source); GH-12 note
  rewritten in English (entry path). (3) GH-11c → „Schiță achitată — fără acțiuni”: open menu removed, note rewritten; **the paid
  row's ⋮ removed in all 92 list blocks of the board** (whole-board rule — header ⋮ of the open draft stays: it still has „Istoricul
  cererii”), PO question 4 amended. Lessons:
  - **`importVariableByKeyAsync` fails in GEAP for Foundations border keys** — read the variable id off an existing bound stroke
    (getVariableByIdAsync) and verify its name; tabs strokes there are border/base/tertiary, not the toolbar token.
  - **Pick the arrow source by what is visible**: a block's table can live under an opened-draft overlay (gh-13a) — screenshot the
    candidate block before attaching.
  - A note that grows a block (1 → 2 lines) → re-fit the section bottom padding (80).
  - No Agent tool → stored `ghs/audit` on gh-11c / 12 / 11b / 11d: only the board baseline (table scroll clip, truncated names,
    „Rows per page:” label, scrim fill).

- 2026-10-23 · details-wrap-align-v1 (user on GEAP 11757:25390 / 11768:27325 / 11777:28273: „looks different from the other details
  wraps”; code ebf57f4f). Every Ghișeu details box → the BO „Date generale” card: 67 captured cards (raw `Container › Row 1 › Text`
  rows, 12 / 12 padding, 352 + 352 columns, r12 / r16 / r24 mixes) rebuilt in place (card id kept, children replaced by `svc/field-row`
  Page instances; MSign gh-07b = Context Modal) — Verificare gh-07 / 07j / 07a / 07a1 / 07a2 / 07a3 / 07b / 07c / 07d / 07e / 07f / 07g /
  07g1 / 07h / 07i + gh-13 / 13a (3 each), Notă de plată gh-09…09d, gh-09c „Note de plată anterioare”, Confirmarea depunerii gh-10 /
  10b (checklist + „Cererea”, „Numărul cererii” now Copy value), Dosarul depus gh-10a / 10c / 10d / 10e / 13b („Termen de examinare”
  one line „6 noiembrie 2026 (15 zile lucrătoare)” — Figma's own dates kept, code shows today + 15), MSign dialog card. 259 rows; card
  heights = the code probe to the pixel (276 / 219 / 136 / 152, 176 / 216, 135; rows 40 / 60 / 84). `svc/field-row` got an additive
  hidden `Show copy value` + exposed `Copy value` (0 visual change on its ~1,100 other instances). Lessons:
  - **Reuse the BO row before building a „Details card” component**: census mains by name (`detail|field-row`) found `svc/field-row`
    = exactly the canonical row (8 / 7 + 1, 256 label, 14/20 500 value, Small tags); the card itself is a plain bound frame on BO too.
  - **Additive upgrade of a busy main**: new BOOLEAN + hidden exposed nested instance → existing instances untouched; set the nested
    instance's TEXT prop through `inst.findOne(name)` after `setProperties` on the row.
  - **Overlays in Ghișeu screens are ABSOLUTE with vertical constraint STRETCH** and the screen height comes from `Body.minHeight`
    (= screen − 32). Shrinking the dialog + overlay and THEN lowering Body.minHeight shrank the overlays a second time (dialogs ended
    at y −68). Order: fit the content (FIXED ancestors → HUG, dialog body slack), set `Body.minHeight = dialog + 22 − 32`, then resize
    every Overlay to the screen height (y 0); dialogs at the 900 minimum = 876 (y 24).
  - Captured section stacks are FIXED (1317) — a shorter card leaves white space inside them; HUG them when need < height.
  - A long single-line value text (WIDTH_AND_HEIGHT in the main) overflows a FILL row — check `Value` right edge vs the row after
    any conversion (1 hit: gh-07j address → FILL + HEIGHT, row 56 = code).
  - Census variants: gh-07d's capture used GRID rows (no `Row 1`) — a second census by structure caught it.
  - Columns 07 / 09 / 10 restacked at 240 (23 connectors still attached); column 11: only gh-13 / 13a / 13b moved — gh-13b → gh-11c
    gap is 464 because another agent was editing gh-11c / gh-12 (restack it when that job ends). Board intro + file index dated.
  - No Agent tool in this session → stored `ghs/audit` on the 67 cards + 6 screens: only tight-gap 0 = section-over-card / padded
    rows baseline. Open: FO wizard payment recap (code r24 + secondary labels) not redrawn on FO Full Flows 09 (out of this scope).
- 2026-10-23 · Same job, follow-up: column 11 restacked at 240 once the other agent finished (gh-11c … gh-12 up 224, 9 gaps = 240,
  section re-fit to 16899 with its 80 bottom padding); GH-12 arrow 12488:361363 + the 2 other in-section connectors stayed attached.
  Figma dates kept („6 noiembrie 2026 (15 zile lucrătoare)”, coordinator). Lesson: when a column is parked for another agent, note
  the exact gap left so the follow-up is one restack call.


- 2026-10-23 · request-tray-figma-v1 (EVO Cabinet iitScYOwMYjDayuyrm3750; code 4e760610 alert-timeline-tray-v1 + c37bbb92
  alert-buttons-library-v1; user reference 1287:34973 in sm-04a). All 28 request profile blocks on ↳ My requests (56 panels, sm-03…
  sm-05v; sm-03d / 02 / 04h1 / 04e / 04f / 04g1 / 05o have no profile) brought to the code, measured per state × 1440 / 375 with a CDP
  probe (scratch rtf/probe.mjs: panel children rects, alert, trajectory padding / border / radius / stacked, per-step x / w / label lines,
  tab strip, first section). **Tray** = `Alert` wrapper pB 0 + Alert card instance bottom radii 0 (top bound radius-24) + ABSOLUTE
  `Tray corners` rectangle (24 high, background/base/secondary, STRETCH / MIN, index 0) at the top of `Section · Status` = the code's
  24 px gradient band, so the grey shows only behind the white card's top corners. Phones: card FILL 343, radius-24, 1 px all sides,
  12 / 16 padding; horizontal steps `Show details` off, widths = code (cumulative rounding, last FILL); sm-04j stays the vertical card
  with details; sm-04h (retry note between) keeps alert + card separate, card 375 edge to edge. **Tabs**: `Section · Status` pB 24 / 16,
  `Tabs` pB 24 / 16; phone Profile tabs instance FIXED 375 centred (overflows the 343 panel like the card did), padding 16 → line edge to
  edge, first label at 28 = code; clip only where the strip overflows (sm-05a / 05m, code scrolls). All panel offsets = code to the pixel
  (alert → status → tabs → first section) except the known +20 phone alert wraps (sm-05q / 05r) and sm-04h's retry note (+6 / +9).
  **Alert buttons**: Alert card 1259:4099 Buttons=Two quiet → library button-text-circular Strict Medium (a97526693c…, lk-03f6), fills /
  strokes copied from the new main; white fill override removed on pp-01e / 01j / 01k / 03 (desktop + phone, 8 buttons). The user's
  wrapper frame in sm-04a was unwrapped into the standard structure (no connector inside). Columns 02–06 restacked at 240 twice (after
  the notes), 23 connectors attached; the 9 profile arrows re-pointed from stale block-edge positions (y 552 vs control 316) to the
  clicked phone control: header button / ⋯ (magnet RIGHT), alert button and sheet buttons (`position` = button right edge on the
  Alert card / Confirm instance), tabs (`position` on Profile tabs: last tab → its right edge, else top-centre; a clipped tab → strip
  right edge), end = target block RIGHT; two stale labels fixed („Completează informația (eroare)”, „Achită 500,00 MDL”). Notes sm-04 /
  sm-04h, Start here intro + cover index dated. Lessons:
  - **Block-edge arrow positions go stale silently** (they never follow the control) — prefer the clicked control (+ `position`) and
    re-check every arrow's y against its control after any height change.
  - **Probe every state before a column-wide pass**: the per-state step widths, the stacked / vertical case and the one non-tray state
    (error between) came straight from the probe; one test block + screenshot, then 3 batches of ≤ 13 blocks, each logging the new
    offsets to compare with the probe numbers.
  - A grey area behind only the TOP corners of a bordered card = absolute band in the card's parent, not a grey parent (a grey parent
    with the same radius leaves an anti-aliased fringe at the bottom corners).
  - No Agent tool in this session → stored `qsweep/audit` on the 56 panels + the Alert card set: only the known section-over-card gap 0
    (sm-04l / 05s groups); pp-01k / 01j alert screenshots checked (text button no fill, outlined transparent).

- 2026-10-23 · breadcrumb-no-trailing-v1 (Ramona on RAP 22083:202703 „no icon need here”; user + research GOV.UK / USWDS / Carbon /
  Material: separators only BETWEEN items; „remove it for me from the component properties”). This reverses the 2026-10-21 „ends on the
  last parent + trailing chevron”. Library fix in Components doJ7tDY0PlQ0PqMgbpFVIC (not published by the API — the user publishes):
  Desktop variant 81:801 got 5 separator instances (clones of the atom's chevron 85:854, bound colour kept) placed BEFORE Level 2–5 and
  Active Level (15132:1108 / :1110 / :1112 / :1114 / :1116), `visible` bound to the NEXT item's boolean; the 5 Level items' own chevrons
  off; the atom set 81:713 `📍 Trailing Icon` default → false. Width at default unchanged (435); combos tested: 1·2 → „L1 › L2”, 1·3 → „L1 › L3”,
  1·2·3·A → full. Consumers (before the update is accepted): the last visible Level's `Trailing Icon` = false on every desktop trail that
  ended with › — forward-compatible (after the update it equals the new default). Fixed: RAP 40 (register page; rest already clean),
  EVO Cabinet 54 (My Requests 34, My Permits 20), eKYC 125 (8 BO pages), GEAP 140 overrides (Local components mains
  `Main Navigation` 9353:75607 + 10008:1628 first → their instances followed, Services 185 desktop trails needed only 4 more; Incidents 27, Dossiers 50 (13 + main), Classifiers 23, User
  Management 39 (4 mains), Notification templates 19, Form Builder 35, Editable Grid 10, Address 3), FOD 0 (no library breadcrumbs).
  After: 0 trailing in all five files; 0 detached copies (the two „Breadcrumb” frames on RAP / GEAP local components are skeleton bars).
  Tools: tools/figma/breadcrumbs/trailing-census.js (read-only; sig / tr / dup / loose) + trailing-fix.js (≤ 4 pages per call). Lessons:
  - **`page.loadAsync()` does not load sublayers of instances** — a census with it saw 4 breadcrumbs on GEAP Services, the page holds 185
    (nested in `Main Navigation`). Any census that needs nested instances: `setCurrentPageAsync(page)` (several pages per call is fine).
  - **Separators between items = bind each separator to the NEXT item's boolean**, not the previous one: trails are always prefixes
    (Level 1…n [+ Active]), so the last visible item never has one after it, and a hidden middle level drops its own separator.
  - **A nested override set in the main does not survive a consumer's variant swap**: a Level swapped to Hover came back with its
    chevron (Trailing Icon reverted to the variant default) → double ›. Fix the DEFAULT of the atom's property, not only the main's
    nested values. Check for `dup` (an item with its own chevron followed by a Separator) after the update lands.
  - Library publish / consumer „accept updates” have no Plugin API — write consumer fixes that are correct on both versions, and
    re-run the census once the user has accepted.
  - A read-only raw census over 21 GEAP pages in one call dropped the transport (same as 2026-10-21) — 3–5 pages per call.


- 2026-10-23 · modal-name-expand-end-v1 (Ramona on EVO-WEB 22088:29587 „× and Mai puțin too close”; code 80c0e9e5). The dialog
  subtitle toggle now sits at the END of the act name: collapsed desktop right after the ellipsis (gap 4), phones on its own line
  under the 2 clamped lines (gap 2), expanded right after the last word. Fixed the 18 `Data modal content · <id>` mains (section
  22060:2438): Subtitle paddingRight = × size token (spacing-32 / -40) + `Act name` paddingRight = clearance (spacing-12 / -8) →
  text column 494 / 295 = the title column (code 506 / 295, Figma's library modal header starts at 32, code 20 — drift, declared);
  rap-03g / 03m / 03r collapsed, rap-03h expanded = `Name` (first lines) + `Last line` row (last words · 4 · „Mai puțin”). Phone
  screens refit to modal bottom (03g +22, 03h −20, 03m / 03r +22), column 04 restacked at 240. `Document modal (MDocs act)`
  22089:209155 got variant `Name=Collapsed / Expanded` (Expanded 22390:15485 / :15504, TEXT `Last line#22390:0`), desktop name →
  „Mai mult” gap 8 → 4. New block **rap-03u 22390:234449** (A4 viewer, expanded; line breaks = code at 628 / 295), connector
  22390:235926 from rap-03s phone „Mai mult” (position on the modal instance), Start here line + count 21. Generators
  tools/figma/rap/act-fields.js + modals.js got `nameEnd` (+ `nameEndTokens`). Lessons:
  - **Inline toggle after the last word = split the text** (Figma has no inline flow): measure with a scratch text node at the
    frame width — greedy wrap of a prefix = the same lines — binary-search the first word of the last line, then if last line + 4
    + toggle > width move only the last word down (Chrome keeps the label with the last word). Same pattern as `Document field ·
    label` (12468:8391). Matches the code exactly when the column width matches (rap-03u, all phones).
  - **`resize()` on a text with `textAutoResize = "HEIGHT"` makes it FIXED** — set auto-resize AFTER resize, or every measured
    height is the old one (my first pass measured 1 line for everything and split at the wrong word).
  - **Cloning a variant inside its set drops `componentPropertyReferences` in practice** (the clone rendered the default text
    and an empty canvas): after cloning, copy every reference by layer path from the source variant (moved layers: map the new
    path), then re-set the instance props.
  - **Hidden layers in instances are invisible to `findOne`/walks** while `figma.skipInvisibleInstanceChildren` is true (the default)
    — set it false before looking for a toggle that a boolean hides.
  - The Figma MCP hit a „tool call limit” once mid-job; get_metadata still answered and use_figma came back on the next call —
    check state with get_metadata, then retry.
  - No Agent tool in this session → stored `rap/audit` on the 4 blocks + 10 mains / set: only the board baseline (section-over-card
    tight-gap 0, background Profile clipped by the screen behind the scrim); the 2 off-scale paddings it caught were tokenised.

- 2026-10-23 · rap-table-flat + pager-compact (code ffcdd8dd / 76347812 / 535c8fa1 / 4313604f; Ramona comment 1978888260). EVO-WEB RAP:
  `RAP / Table header` 22063:5069 → flat band (32 = 8 / 12 cells, background/base/tertiary, Caption/Medium 500 in text/base/default, NO
  bottom line), `RAP / Table row` 22063:5326 (8 variants) → cells 8 / 12 (phones first 16), minHeight 56, Beneficiar 382 / phones 313,
  Denumire act 308 / 377, Autoritate 96 = abbreviation only (`Authority name` layer + TEXT property deleted), action 56 with the bare
  chevron (Hover: icon/base/default + paddingLeft 16 → +2 px), names / act 2-line ENDING, Act underlined on Hover, `Last row=True` keeps
  the 1 px bottom line (separator above the pager). 19 blocks (13 desktop + 18 phone tables: rap-01, 01q, 01e, 01f, 01a, 01b, 01r, 01s,
  01t, 01u, 01c, 01h, 01g, 04, 04a–04d; rap-01d = empty state) → table wrappers lost their border / radius, 29 pager hosts → `Pager ·
  compact` (desktop host 16 / 0, phone 16), rap-01g's two pagers removed (code: none ≤ 16 results), 01q = „din 294 … 19”. Fixed on the
  way: every row's Copy value showed the default „P-8991/2026” (Identifier + Number overrides lost in the 2026-10-21 Copy value
  upgrade) → IDNO / masked IDNP by beneficiary + number from the row name (tools/figma/rap-table-flat/blocks.js). Columns 01 / 02 / 05
  restacked at 240, 18 RAP connectors re-routed, audit only the board baseline (phone scroll clip). EVO Cabinet: 40 pager hosts (My
  Requests 38, My Permits 2) → local `Pager · compact` 1305:4300 (Requests „Dosare pe pagină:”, 2 pages; page-2 blocks sm-01j / 01u /
  01w / 05o current = 2, ‹ enabled, › disabled; Permits „Acte pe pagină:”, „din 27 de rezultate”, 3 pages); 12 columns restacked at 240;
  „Pagina 2” arrow 1152:31652 now starts on the sm-01 pager (position at page 2) instead of the block edge. GEAP 2.0 census only
  (not edited, awaiting go): library pagination in 104 hosts (Tariffs 23, Incidents 21, Services 13, User Management 12, Workplace 11,
  App Shell 11, Advanced filtering 10, Dossiers 2, Notification templates 1) + 99 captured raw-item pagers (Ghișeu 96, Process Designer
  3) = 203; no shared pager component in GEAP. Lessons:
  - **Local table components pay off**: header + row mains carried the whole flat-table change (2 + 8 variants → 31 headers + 472 rows);
    only the per-block wrapper border / radius and the pager hosts needed a block pass.
  - **Library Small button = 16 glyph**: an icon-only Small (32) button cannot show a 20 chevron (nested `resize()` is ignored, the 20
    component lands at 16 in the `: 16` slot). The code pager uses 20 — declared, library rule kept.
  - **The library select-input has no 32 size** (Large / Medium only): the 32 page-size field = Medium Filled with the nested `Input`
    frame set to HUG + paddings 6 / 8 / 6 / 12 + gap 4 (sizing / padding overrides on nested layers are allowed).
  - **`.`-prefixed library sets are not importable by key** (`.pagination-item` 51a339f3…: „not found”) — take `mainComponent.parent` from
    an instance that already lives in the file.
  - **`insertCharacters(…, "BEFORE")` takes the style of the character before** — replacing „19 rezultate” by „27 de rezultate” made „27”
    regular; re-apply the strong ranges after any range replace.
  - **The served working tree can be ahead of the brief**: localhost showed a third phone pager variant („Afișează mai multe” + right
    arrows) while the coordinator's final spec (4313604f) is two edge buttons — draw the briefed / committed spec and report the drift.
  - Data drift left (report): Cabinet Figma lists still show 19 requests / 27 permits (code 20 / 36); RAP jump markers sit at x 1951
    (audit expects 1911) and are 6 px off their rows after the 38 → 32 header.
  - No Agent tool in this session → stored `rap/audit` (5 blocks + 3 sets) and `qsweep/audit` (Cabinet pagers + set): only the RAP
    baseline (phone horizontal-scroll clip, „mixed” Onest range) and one pre-existing .5 label in rap-01g.

- 2026-10-23 · Same job, phone pager v3 (code 95d149f7 + eabe647e, supersedes v2): `Pager · compact` Screen=Phone in RAP 22396:14828 and
  Cabinet 1305:4287 = VERTICAL gap 12: library button-filled-rectangular (2cbe2c35…) Secondary Medium „Afișează mai multe” FILL, then an
  `Arrows` row (gap 8, right-aligned) holding the two outlined buttons (the stacked 375 / 320 layout; the one-row ≥ 420 layout has no
  board frame). 29 RAP + 20 Cabinet phone pagers follow (40 → 92); all RAP / Cabinet columns restacked at 240 again, connectors
  re-routed. **Moving the variant's existing button instances into a new child frame KEPT the per-instance State overrides** (the 4
  Cabinet page-2 pagers still show „Anterior” enabled / „Următor” disabled) — restructure by moving nodes, never by recreating them.
  RAP has no tablet (761–1100) list frame → the 48 px edge fade of the scrolled table is not drawn (reported).
- 2026-10-23 · Same job, phone pager v4 (code 69424d15, supersedes v3): `Pager · compact` Screen=Phone (RAP 22396:14828, Cabinet
  1305:4287) = ONE row SPACE_BETWEEN: library button-text-rectangular Primary Icon=None Medium „Afișează mai multe” (hover = the
  library's own state) · `Arrows` (gap 8) = outlined Strict Medium **Icon=Only** 40 ‹ › (chevron-left / -right 20). 29 RAP + 20 Cabinet
  phone pagers 92 → 40, all columns restacked at 240, connectors attached (0 dangling). Script tools/figma/rap-table-flat/phone-pager-v4.js.
  Lesson: **a variant swap done per instance (setProperties State) pins every variant property on that instance** — the 4 Cabinet
  page-2 pagers kept `Icon=Leading/Trailing` when the main switched to Icon=Only; after changing a main's nested variant, re-check
  instances that ever had a nested `setProperties` and set the new value there too.

- 2026-10-23 · sm-04h-error-toast-v1 (user on EVO Cabinet 1265:4451; code ef8f8a41). A failed redirect is a non-auto-closing library
  **toast** (Components lk-03f6 set `toast` 75:425, key 8324658c…; Error · Text-only = c0917527…, imported here as 1312:62198), never an
  inline error between the alert and the timeline. sm-04h: `Alert` + `Section · Status` replaced by clones of sm-04b's (same state →
  fused tray, phone card 343 r16 = the other 27 blocks; Retry frame 1265:4451 gone); toasts added to sm-04h + sm-03e desktop
  (1313:50871 / 50899: ABSOLUTE last child, x 1440 − 24 − 350, y 24, constraints MAX / MIN, over the header) and phone (1313:50887 /
  50911: 343 wide, x 16, y 812 − 24 − h = viewport bottom, CENTER / MIN). Props: Message, `👁️ Link` on + nested `link` → `⌨️ Link`
  „Reîncercați” + Underline on, Close on. Arrows sm-04b → sm-04h and sm-03 → sm-03e now end on the phone toast (RIGHT). Notes, Start here
  (intro + contents lines) and cover index updated; section 04 refit (sm-04h −136). sm-05c (download toast) has no block on the board —
  not drawn. Stored `qsweep/audit` on both blocks: 0 findings. Lessons:
  - **Brief node ids can be stale** — 9399:32597 resolved in none of Components / Cabinet / GEAP (REST nodes). Find the set via
    search_design_system, confirm its file with REST `/v1/component_sets/:key` (→ doJ7tDY0PlQ0PqMgbpFVIC 75:425), use the lk-03f6 copy.
  - **Same-state sibling block = the fastest exact fix**: when an error variant (sm-04h) must look like its base state (sm-04b), clone
    the base block's frames into place (texts compared first) instead of re-building the tray by hand.
  - Library toast drift (declared, not overridden): icon + × centred vertically (code top-aligned), height 92 with link (code 104 on
    phones, 16 px text).
- 2026-10-23 · Same job, user follow-up („on mobile do a fixed-height screen and align the toast”): **a phone screen that shows a
  viewport-anchored overlay (toast, sheet, modal) is a FIXED 375 × 812 viewport** — `primaryAxisSizingMode = "FIXED"`, `resize(375, 812)`,
  clip on the screen frame only (radius / 4 px OUTSIDE border kept), content cut below the fold; toast ABSOLUTE x 16, y 812 − 24 − h, no
  safe-area inset (board phones have none). On a full-height phone frame „y = 812 − …” lands mid-page over the timeline — the user's catch.
  sm-04h / sm-03e phones fixed; new block **sm-05c 1315:50715** (clone of sm-05, toast without link „A apărut o eroare. Descărcarea nu a
  fost efectuată. Încercați din nou.”, desktop 1315:50844 / phone 1315:50856, arrow 1315:50868 from sm-05 phone „Descarcă actul”). Draft
  phone headers = code at 375: „Continuă schița” FILL + labelled „Elimină schița” (outline-destructive, HUG) instead of ⋯ in all five
  column-02 profiles (sm-03 / 03g / 03h / 03e / 03f; sm-03 → sm-03f arrow moved to the new button). Columns 02 / 04 / 06 restacked at 240,
  0 dangling connectors, Start here 55 blocks / 06 · 14 + sm-05c line, cover 55. Audit: only the intended viewport `clipped-content`.
  Lesson: **probe the code's header actions at 375 for the whole column** before trusting the board — all five draft profiles had drifted.

- 2026-10-23 · rap-components-cleanup-v1 (EVO-WEB YrIzksVgFqtPqDd5z9zY5h, user on 22089:33231 „such a mess in components —
  resolve”). Section „RAP · Public registry components” 22060:2438: **92 → 34 items** (64 per-state mains deleted: 18 `Data modal
  content · rap-XX · Desktop/Mobile`, 8 `Filter sheet content · rap-XX`, 20 `Doc canvas · rap-XX` + the placeholder, 12 `A4 act
  page · <nr> · k/n`, 6 `Act fields table · … · N rows`; 7 consolidated sets added — ids in the Library table). Swapped in place
  (instance ids kept, arrows untouched): 20 data-modal hosts (rap-03, 03g, 03q, 03h, 03i, 03j, 03m, 03n, 03o, 03r × desktop + phone),
  16 nested tables, 22 document-modal hosts (rap-03a/b/c/d/e/f/k/l/s/t/u × 2; 31 A4 page instances rebuilt from one component), 8 phone filter
  sheets (rap-01b, 01r–01u, 04a–04c). Section organised into 6 sub-sections (names `RAP / <group> / <name>`; cross-file names „Copy
  value”, „Copy value · tooltip”, „Document viewer / Signature tray”, „Board / …” kept), one-line descriptions, shelf layout gap 80,
  sub-section fills background/base/secondary. Verified with REST renders of all 50 hosts before / after (scratch render.sh + diff.py
  with PIL): 38 pixel-identical; the 10 printed-form hosts built from the old generator differ only by sub-pixel anti-aliasing because
  the A4 head texts moved from x .5 to whole pixels (FILL + centre), 2 phones by 3 px. Generators rewritten + stored copies refreshed
  (rap/af, rap/modals; rap/screens: only sheetContent patched). Lessons:
  - **Native slots nest**: `component.createSlot()`; a slot inside an instance that is itself nested (library modal › content
    instance › slot, Document modal › canvas › slot › A4 page › slot) accepts `appendChild`, and default slot children in an
    instance can be removed. Test once on a scratch clone before a family swap.
  - **Clone the per-state content from the INSTANCE, not the main**: the phone instances carried overrides the mains did not have
    (section titles → Mobile/Heading/H5 from the phone H5 sweep); cloning sublayers of an instance keeps those overrides.
  - **Never clone rows out of a rescaled instance** (A4 pages at 0.786 / 0.452): the clones are already scaled and get scaled
    again. Take rows from the unscaled main (`getMainComponentAsync`), fill the new page's slot, THEN `rescale()`.
  - **Swapping the default of a nested INSTANCE_SWAP keeps the old size override**: the Document modal phone variants kept the
    placeholder's FIXED 311 width at x 32 → every phone canvas shifted 24 px. Set FILL on the nested instance in the main right after.
  - **getInstancesAsync() under-reports instances nested in other instances / slots** (0 for every used content component) →
    census by walking the board page (`findAllWithCriteria` INSTANCE + `getMainComponentAsync`), one page per call (a multi-page
    scan dropped the transport). Delete a main only after that census says 0.
  - **The stored figma-audit skips everything inside an instance — now including slot content**. For QA of slot content, patch
    `insideInstance` in-run to stop at a SLOT (done here; tools/ui-qa/figma-audit.js has someone else's uncommitted edits, so the
    repo file is unchanged — apply the same one-line change there next time it is free).
  - **Verify pixel identity with REST renders, not screenshots**: `/v1/images/:key?ids=…&scale=1` for all hosts in one request,
    curl the PNGs, diff with PIL (venv in the scratchpad); locate diffs with a bbox + side-by-side crop before judging.
  - Variant property and TEXT property with the same name („Name”) collide in the panel — name them apart (Subtitle / Act name).
  - Stored builders: store with `String.raw` + a djb2 checksum of the repo file checked inside the call, then run a scratch test in
    the SAME call and throw on mismatch — the store rolls back with it. Stored copies may be comment-stripped (rap/screens): patch by
    function bounds (`const sheetContent` … `const listScreen`), not by comment markers.
  - Coordination: the list blocks / Table row / Pager belonged to a concurrent agent; the filter sheets live in „02 · Filter”, not
    the list column, so only their Content Slot was touched (after the other agent's commits); renames are safe because the
    generators look components up by stored id.
  - Open: stored payloads P:rap-04a / 04b / 01b still describe the old single-facet sheets (the blocks were rebuilt in place on
    2026-10-22); 7 jump markers sit at x 1951 instead of 1911 (connector audit, pre-existing). No Agent tool in this session → QA =
    stored rap/audit on the 8 sets + 7 sample hosts (slot content included): only the board baseline (section-over-card gap 0,
    rescaled A4 fractions, .5 spinner centring, scrolled-viewport clip); connector audit 18 / 18 attached.

- 2026-10-23 · breadcrumb-single-back-v1 (code 8dd95ba7; user: „when we have only one breadcrumb, do it as on mobile, with the
  chevron”). A library breadcrumbs instance whose desktop trail has ONE visible item → `📏 Breakpoint=Mobile` (20/chevron-left-small +
  `.breadcrumb-item`), the nested item's `⌨️ Label#570:0` re-set to the old Level label (the swap resets it to the variant default).
  EVO Cabinet: 46 swapped (My Requests 29 = every sm-03* / 04* / 05* desktop; My Permits 17 = pp-01e/i/j/k/l/q, pp-03/03a/b/c,
  pp-01x/y, pp-01m's five size frames); after: 0 desktop breadcrumbs left in the file (88 Mobile: 58 „Solicitările mele”, 30 „Actele
  mele permisive”). Geometry = code at 1440 (probe sm-*/pp-*): crumb (120, 136) 20 high, title 172 (gap 16) — the Mobile variant is
  20 high too, so nothing moved and no restack. No cat-02 block exists in Cabinet (catalog service not drawn). Read-only census of
  the other files (not changed, brief = code says none): RAP register 41 desktop, 0 single; the EVO-WEB public pages hold one-item
  trails outside GEAPBreadcrumbs — Catalog (Services) 16 „Acasă”, Service Providers Catalog 13. GEAP: BO pages 0 single (Services 185,
  Dossiers 50, Classifiers 23, User Management 39, Notification templates 19), but 248 one-item desktop instances in contexts the code
  does not render with GEAPBreadcrumbs: FO draft-status bar „Solicitările mele · 19:40” (local main 12094:352187 → FO Full Flows 39,
  Post-processes 43, FOD Address 49; code = plain `.e-permits-fo-draft-status__link`), Form Builder 70 / Editable Grid 20 („Notificare
  în comerț”, „Step 2 of 6” wizard headers), Incidents 27 (no prototype). Script: scratch single-census (same props as trailing-census).
  Lessons:
  - **Swapping a variant inside a `findAll` loop removes the old variant's sublayers** — the list still holds ids like
    `I1126:3330;81:778` and reading `componentProperties` on them throws („node does not exist”), rolling back the call. Filter
    `!id.includes(";")` before the loop and skip `n.removed`; the retry was safe because the filter (Breakpoint=Desktop) is idempotent.
  - **„Code says none” ≠ Figma has none**: the census by component property found one-item breadcrumb instances the code never
    renders as breadcrumbs (FO draft status bar, wizard headers). Report them as drift instead of following the brief blindly or
    converting them.
  - No Agent tool in this session → QA = re-census (0 desktop single in Cabinet, all 46 height 20, labels kept) + spot screenshots
    sm-05 1236:49405 / pp-03 1268:4759 against the code probe.

- 2026-10-23 · cabinet-rows-sync-v1 (user on EVO Cabinet 1064:1880: „we still have icons for cards — update as in code, fix any other
  discrepancies”). Fixed at the SOURCE: Cabinet `Act row` 1055:1380 (10 variants) lost the 24 document lead icon (phones: `Line 1`
  paddingLeft / Bottom → 0); `Act row` + `Request row` 1117:3222 gained a `Place` line (16/map-pin-filled 78c28176… in icon/base/tertiary,
  in a 16 × 20 `Pin` box · gap 4 · Desktop/Body/Small text/base/default; desktop 1 line + ellipsis, phones wrap) with props `Place` /
  `Show place`, act meta reordered to the code (Number · Authority · Subdivision · Validity), titles default to the TYPE, request
  `What` default „Eliberare”, BOOLEAN `Subdivision on own line` (was „Break before subdivision”; phones: a FIXED 311 × 0 `Line break`
  before AND `Line break · after` the part). `Pager · compact` 1305:4300 got `Page 4` + BOOLEANs `Show page 3` / `Show page 4`
  (default off). Data: every list block = the code's first page — 12 permit blocks (186 → 198 rows: pp-01 / 01s / 01s1 / 01s2 / 01s3 /
  01a / 01p / 01r / 01g = 10 of 12, pp-01t = 10 of 36, pp-01u / 01h = 1) and 21 request blocks (sm-01… = 10 of 20, page-2 blocks
  11–20, sm-01q 5, sm-01o 1); 9 permit blocks got the pager they lacked; 19 request pagers „din 19 rezultate” → „din 20 de
  rezultate”, 2 pages; pp-01t „din 36 de rezultate”, 4 pages; filter-sheet buttons „Arată 20 de rezultate”; pp-01w empty state glyph
  → 24/permission; 5 notes, both Start here sections and the cover index updated; 8 columns restacked at 240; 0 dangling connectors.
  Tool: tools/figma/cabinet-rows-sync/ (sync.js = stored runner `cab`/`rowsync`, make-payload.py; row dictionaries stored as
  `cab`/`rowsU-act` / `rowsU-req`). Lessons:
  - **Sync rows by a key, not by position**: match Figma instances to code rows by the number (Copy value `Value`), reuse unmatched
    rows, clone only when short, then reorder — the Menu open instances (with their filled menus) and Locked / Paper rows stay with
    their act, so pp-01a / pp-01p kept the right menus after the order changed.
  - **Probe the phone line breaks** (`getClientRects` per meta part at 375): only the parts the code wraps over 2 lines need a
    special layout; the rest wrap like the code because the metrics are the same.
  - **A wrap layout can't force a full-width child from an instance**: `minWidth` is not overridable („min-size”), `resize()` on a
    nested text is silently ignored, a FILL child shares its line and a FILL break doesn't break. What works: two FIXED line-break
    frames (row width × 0) around the part, bound to a boolean, + the part FILL / text FILL + HEIGHT, truncation off.
  - **Never walk „up until an icon is found”** when targeting a glyph: my first empty-state swap hit the header's e-gov logo and the
    phone globe (reverted by swapping to the same path's main in a sibling screen). Target by layer name + parent name.
  - Cloned pager frames carry the source's per-instance booleans (pp-01t's Show page 4 → every new pager showed „1 2 4”); set every
    boolean explicitly after cloning.
  - Countdown texts („mai sunt 5 zile și 9 ore”) follow the clock in code — never treat them as drift.
  - Left (reported): rows are 2 px shorter than code (1.5 stroke INSIDE, not in layout — board baseline); phone locked notice wraps
    4 lines vs code 3 (code breaks inside „GEAP-2026-…”); pp-01r hovers a locked row in code (no Hover + Locked variant); header
    avatar = library neutral „AC” vs code blue. No Agent tool in this session → stored `qsweep`/`audit` on the 33 blocks + 2 sets:
    only the declared baseline (meta dot gap 18, trigger reservation 133, 812 phone viewports behind sheets).

- 2026-10-23 · header-actions-hug-v1 (code 57fe8c51; user on EVO Cabinet 1236:47947 „let's do HUG buttons, not fill, on mobile”).
  Phone page-header actions = library Medium 40 at natural width, row left-aligned, gap 8; icon-only ⋯ stays FIXED 40 × 40. There
  is NO local header / action-row component — the rows are raw `Page header › Actions` (Cabinet) / `Page header › Action` (RAP)
  frames from the stored header passes, so the fix is per row: text buttons `layoutSizingHorizontal = "HUG"` + FIXED 40 high
  (HUG vertically collapses library buttons), row `primaryAxisAlignItems = "MIN"`. EVO Cabinet 31 rows (My Requests 18, My
  Permits 13), RAP 27 (rap-02* + the rap-03* profiles behind the modals), GEAP 0 (its only phone frames are unsaved-changes sheets
  — no BO phone page header exists). Code probe at 375 for every board state first: the ⋯ decisions were unchanged, except
  **pp-01q** whose phone still had the icon-only ⋯ while the code shows labelled „Postprocese” → fresh Focus / Trailing Medium
  instance (1330:68928), and its open Touch menu re-anchored = code: right edge on the trigger's right edge, 6 under the row,
  `Show label` off (code menu has no „Postprocese” group heading → 177 = code). No pp-03g / pp-03h / sm-03p blocks exist on the
  board (not drawn). All header arrows were magnet-attached to the buttons → followed without edits; block heights unchanged → no
  restack. Figma buttons are 3 px narrower than code (158 / 161, 118 / 121, 166 / 169 — library padding/gap drift, declared).
  Lessons:
  - **Probe the whole column's states before a „sizing only” pass** — it found the one stale trigger (pp-01q) that a sizing pass
    would have kept wrong.
  - **Stored audits differ per file**: RAP `rap/audit` = AsyncFunction body taking `R`; Cabinet `qsweep/audit` = an arrow
    `async (ROOTS, OPT)` → `eval("(" + src + ")")(ids, { perBlock: false })` returns `{ tot, findings }` (not `counts`).
  - No Agent tool in this session → stored audits on all 58 rows + the pp-01q menu: 0 findings.

- 2026-10-23 · trajectory-phone-even + cards-radius-20 (code 09b5d365 + ad581171; user: „after done in code do in Figma accordingly,
  all”). **A) EVO Cabinet phone trajectory = even pitch**: 25 horizontal phone rows on ↳ My Requests (sm-03/03e/03f/03g/03h, sm-04/04a/
  04k/04l, sm-04c/04d/04g, sm-05/05a/05b/05c/05l/05m/05p/05q/05r/05s/05u/05v/05w) rebuilt by tools/figma/trajectory/phone-even.js: first /
  last step HUG (label WIDTH_AND_HEIGHT → icon centred over its label on the content edge), middle steps FIXED = pitch, a FIXED
  connector after the first (pitch/2 − w1/2) and a FILL connector before the last (absorbs rounding) → markers within ±0.5 of the
  code probe (sm-03 13.5/100/186.5/273 vs 13.4/99.9/186.5/273.1; sm-05u 13/131/249 vs 13.1/130.9/248.7). Card padding 12 / 16 (code;
  Figma had 12 all round → content 317 instead of 309). „Spre achitare” = Label „Spre” + Label line 2 „achitare” (code wraps at pitch − 8).
  sm-04b / 04h / 04i are STACKED in code at 375 → their phone cards replaced by clones of sm-04j's vertical card (1337:65160 / :65264 /
  :65367, 4 steps, meta from the probe, connector Reached = the desktop row's halves; Skipped is not „reached”). Columns 03 / 04 / 05
  restacked at 240. GEAP / FOD phone trajectories are already vertical (= code), eKYC / Dossiers have no phone trajectory → no A change.
  **B) radius-20** (Foundations border-radius/radius-20, key 67f239d0…, same „3. Sizes” collection 8ee1cae7 as radius-24 → import
  works in all five files): Cabinet 130 request + 60 permit details cards, 16 Act view content cards (Local mains), 58 trajectory cards,
  58 tray Alert cards (top corners only) + 18 permit Alert cards, Alert card set 24 variants, Trajectory · callout 5 variants (bottom),
  58 `Tray corners` bands 24 → 20 high. GEAP 438 cards / timelines (Dossiers 94, Ghișeu 67, Services 187, App Shell 24, Notification
  templates 2, Tariffs 15, Classifiers 5, User Management 18, Local 5 incl. the certificate = .e-permits-fo-payment-summary, FO 09 2,
  Post-processes 2 fo-summary-card) + 52 trajectory cards (Dossiers 24, FO 09 20, Post-processes 8) + „Dossier / Now · callout” main +
  24 instances (bottom) and 24 `acum-wrap` insets 24 → spacing-20 (8bad70ea…). eKYC 154 details `Container`s + 10 timelines (`Numbered
  List`) + 29 trajectory cards + 2 hanging `Status` callouts (inset → spacing-20). RAP 108 profile + 62 data-modal (slot content) details
  cards + 4 `RAP / Profile / Beneficiary` variants. FOD 4 trajectory cards. Not touched: list row cards, Company summary / Metrics,
  login card, canvases, Services modal `Skeleton` (r24, loading placeholder), Post-processes captured `Frame 1261156078` (r24, unknown).
  Lessons:
  - **A HUG step instance whose rail is FILL works**: the step hugs its label (FILL children don't count), the rail stretches, the
    marker stays centred — so the code's „first / last block hugs its text” needs no measuring in the plugin, read `first.width`.
  - **Two connectors, one FIXED and one FILL**: two FILL fillers would split the slack equally, but the code's fillers differ when
    w1 ≠ wn (pitch/2 − w/2 each). Keep the computed one FIXED and let the other absorb the whole-pixel rounding.
  - **The code's card padding is not the Figma's** — probe `getComputedStyle(card).padding` per state before a geometry pass (12/16 vs 12).
  - **Census predicate by code class, not by name**: eKYC calls the details card `Container` (parent `Section`), the timeline `Numbered
    List`, the hanging callout `Status`; GEAP has `Card`, `Details card`, `dosar-profil__card`, `timeline`, `fo-summary-card`; the FO
    certificate `Card` is the payment summary → check the code markup (js) when a name is ambiguous.
  - RAP data-modal cards live in native SLOT content (ids with „;”) and accept `setBoundVariable` directly.
  - The stored Cabinet `qsweep/audit` returned 0 findings on the changed cards, sets and sm-04b; GEAP repo audit on the dossier
    trajectory section + card + Now callout main: 1 pre-existing `no-text-style` (callout title 9696:562). No Agent tool in this session.

- 2026-10-23 · invoice-head-small-v1 + v2 (code ebc196cc; user on GEAP 11761:26404 „a SMALL badge and SMALLER amount text … in full
  flow accordingly”; v2 mid-job: label → amount gap 4, grey head padding 16 on all sides). No payment-note component exists → per
  block. GEAP Ghișeu gh-09 / 09a / 09b / 09c / 09d heads (`Section - Notă de plată NP-…` › `Header`) + FO Full Flows 09 F7 / F7a
  desktop + phone (`Container` › `Frame 1261156104`): tag-filled Strong Medium → **Subtle Small** (setProperties, then FIXED 20 +
  HUG — the swapped tag keeps the old 24), amount Desktop/Heading/H2 → **Desktop/Heading/H4 6437d483…** (phones Mobile/Heading/H2 →
  **Mobile/Heading/H4 47680a7a…**, lk-e9e8), caption row `minHeight 24` (= code `.e-permits-fo-payment-invoice__caption
  min-height: 24px`; **code v2 def9e28f dropped it → minHeight removed again, row HUG 20**), padding spacing-16 ×4 + gap spacing-4
  bound. Heads = code: Ghișeu 85 (16 + 20 + 4 + 28 + 16 + 1 border), F7 84 / phone 82 (+1 border not in layout = code 85 / 83). F7 / F7a also had the tag beside the amount (stale) →
  moved into the label row (SPACE_BETWEEN, centre) = code „label left, tag right, amount below”. Ghișeu block heights unchanged
  (screen height = Body.minHeight); F7 / F7a are the last blocks of their column → no restack, no connector touched. FOD
  pvDAJPXKyUuJgz3P921Ye8 has no payment note (its „100 MDL” 24 px texts are Apostile price cards); Post-processes has none. Lessons:
  - **Census by text + size, not by name**: `^Notă de plată` texts (skip stepper instances, ids with „;”) + `MDL` texts ≥ 24 px on
    every page that can hold the step — the second pass proves nothing was missed.
  - **Probe the code's row heights before judging a head** (tools: scratchpad probe.mjs pattern = CDP + getBoundingClientRect of
    the header's children): a `min-height` on a flex row is invisible in a screenshot but costs 4 px.
  - **Another agent may edit the same nodes mid-job** (gh-09a's gap turned 4 between two of my calls = the v2 spec arriving) — re-read
    the nodes before the final audit and don't „repair” a value you didn't set without asking.
  - Left: F7 / F7a phone table rows carry +0.0001 px per captured `Cell` (pre-existing; block heights x.0007) — not touched.
  - No Agent tool in this session → repo figma-audit.js rules on the 9 heads: 0 findings (before and after v2).

- 2026-10-23 · cards-radius-20-final + filter-bar-open-v1 in Figma (code ed4a818b → 4810f022; the value flipped 20 → 16 → 20 within the
  job via the coordinator, then the filter bar was added). **Cards = Foundations border-radius/radius-20** (67f239d0…), selection = the
  radius-20 pass (ba37d651) + the grey identity / role cards + the FO summary / payment recap cards + the two skipped ones:
  GEAP 627 nodes bound (487 written + inherited instances): the 20-pass cards / timelines / trajectory cards / `Dossier / Now · callout`
  main (24 `acum-wrap` insets spacing-20); identity / role mains `Authorization card (FO)` 11861:7112 / :7140 and `Identity card ·
  selected (FO)` 11848:340942 (Changeable, = .fo-selected-role--changeable) / :340959 (40 instances follow); 5 raw `fo-selected-role`
  (Post-processes), `MPass identity` 10256:5213 (= .bo-login__identity); FO review summary + payment recap = captured gray/50 frames
  `Frame 1261156147 / 1261156152 / 1261156148` (FO 09 18 incl. F5 / F7 desktop + phone, FOD Pattern Address 4, Post-processes 1 +
  4 `fo-payment-summary`, Local 2, Dossiers 3, User Management 17); Services modal `Skeleton` 9544:14542 and Post-processes `Frame
  1261156078` ×2 (grey details boxes). Cabinet 411 (369 from the 20 pass + `Profile / Beneficiary card` 1058:560 + `Authorization card
  (MPower)` 1120:3152 → 40 instances; 58 `Tray corners` bands stay 20). eKYC 195 + `MPass identity` 10537:54025. RAP 166 (details
  cards + Beneficiary set; the old 62 slot cards no longer exist after rap-components-cleanup). FOD 4 trajectory + 11 summary / recap
  cards (Frame 1261156147 / 152, `Container` / `Section - Application details` in the guest wizard, 589:16869 recap). Kept at 12: white
  role options (`Instance switcher · menu · role`, `.role-switch-item`, `Role selector · card`), notices, the „Arată mai multe”
  buttons. **Document · card NOT changed (PO question)**: GEAP set 11364:7441 (54 variants, r12) → 141 instances (Ghișeu 73, FO 09 50,
  FOD Requestor 14, Post-processes 4); Cabinet 983:2727 → 12; FOD local 762:10435 → 19 + 13 remote.
  **Filter bar without a box** (code: no border / background / radius / padding; Cabinet / RAP 8 under the toolbar; BO table-card inset
  8 · 16 · 16 unchanged): GEAP `advanced-filter/bar` 9645:1949 child `Box` ×3 + 4 raw `Filter bar › Box` (Advanced filtering 3,
  Services 1) → strokes / fills off, radius 0, padding 0 (66 → 40; 39 instances follow; all inside FIXED 1024 screens → no restack);
  Cabinet `Facet filter · bar` variants 1056:2046 / :2080 / :2116 + `Controls` gap 16 → spacing-8 (9 blocks, columns restacked: 7
  blocks moved); RAP 9 raw `Facet filter bar` + `Filter bar inset` top 16 → spacing-8 (rap-01* column restacked, 13 moved); eKYC
  `Advanced filter · bar` Box ×3 (16 instances in HUG grid rows → headers shrink; 13 blocks restacked to 240). Lessons:
  - **Store the ids before a bulk rebind** (`root.setSharedPluginData("rad", "<file>-sel", JSON)`): the value flipped mid-job and the
    16-rebind had no list — I had to rebuild the set from names + fills and match the per-page counts of the previous pass. Now the GEAP
    selection lives in shared plugin data `rad` / `geap-r20-sel` (+ `geap-filterbox`), FOD `rad` / `fod-r20-extra`.
  - **Rebind only the corner keys that were bound to the old variable** (callout = bottom corners, tray alerts = top corners) — never
    set all four on a census hit; and rebinding a main updates its instances, so per-page counts drop on the second pass (Dossiers 143 → 119).
  - **Captured FO summaries are gray/50 (not background/base/secondary) frames named `Frame 1261156147 / 152`** — a census by the
    secondary token misses them; search gray/50 too and confirm by text („Solicitant”, „Denumirea obiectului”, „70.00 MDL”).
  - **A shrinking bar needs a restack only where the screen hugs**: GEAP BO screens are FIXED 1024 (no change), Cabinet / RAP / eKYC
    blocks hug → restack each affected column from an explicit sorted list, shifting only after an affected block (gap 274 / 267 → 240).
  - Icon stroke overrides: scanned 9 237 GEAP icon instances for `strokes` overrides on stroked vectors → 0 besides the one the user fixed.
  - No Agent tool in this session → repo figma-audit (inline) on the identity / auth sets, Ghișeu card stack, F7 recap, dossier
    trajectory, MPass card, skeleton: no radius findings; pre-existing: pill radius 9999 unbound (5), MPass text without style (1),
    skeleton bars fractional (6).

- 2026-10-23 · request-act-headers-figma-v1 (code 4afbf27a request-act-modal-link-v1 + header-max-two-v1). Header actions = code at
  1440 / 375 (probe: scratch hdr2/, measure.js per state = label · class · icons · target). EVO Cabinet ↳ My Requests: sm-05 / 05l /
  05p / 05s / 05w / 05u / 05v → one primary „Profilul actului” (button-filled-rectangular Primary **Icon=Trailing** + Foundations
  20/external-link 8df5d4b1…); sm-05b / 05q / 05r → „Profilul actului ↗” · „Descarcă decizia” (sm-05b lost „Depune contestație”, phone ⋯
  → labelled download); sm-05a / 05m / drafts already = code. **sm-05c** = the refused request's „Descarcă decizia” failure: both
  `Main`s replaced by clones of sm-05a's (screens, header, toasts and the 812 phone viewport kept), block moved after sm-05a, arrow
  1315:50868 re-pointed to the sm-05a phone ⋯ („⋯ › Descarcă decizia (eroare)”). New **sm-act-04 1352:54359** (clone of sm-05b + a
  text map from the code's innerText; header Depune contestație P · Profilul actului ↗ N · ⋯ / phone Depune + ⋯). sm-act-03 not drawn
  (same request + header as sm-05q, other tab). My Permits: every „Vezi act permisiv” → Icon=None (20 rows); pp-01m (6 rows) / 01x / 01y
  = Vezi act permisiv · Vezi solicitarea · ⋯ (Postprocese removed); pp-01q menus re-anchored (right edge = trigger right, 6 below —
  the narrower label-only primary moved the trigger 22 px) and phone header-menu items → Desktop/Body/Default 500 (code: header
  menus 16/24 500 · icon 20, LIST row menus stay 16/24 400 · icon 24 — they differ). RAP: 54 „Vezi act permisiv” → Icon=None (ids
  kept). Column 06 restacked at 240 (3 connectors attached), Start here (56 blocks / 06 · 15, lines moved / added, not-built bullet),
  Permits + RAP Start here and cover index dated. Lessons:
  - **Clone + text map is the cheap way to a sibling state**: same structure in code (innerText diff) → clone the nearest block,
    replace by an ordered pair list (longest first, exact-match map for short words like „Depusă” / „Retragere”), then grep the clone
    for the old tokens. **Copy value numbers survived the pass** — their `Value` lives on a nested instance whose property the outer
    loop missed; fix by walking up from the text to the instance that owns `componentPropertyReferences.characters`.
  - **Re-point a connector BEFORE removing its start node** (Figma deletes connectors whose endpoint disappears).
  - **Removing a leading icon shifts every later control** — re-anchor menus / arrows that hang on the next button after an icon change.
  - No Agent tool in this session → stored `qsweep/audit` (12 request + 13 permit blocks) and RAP `rap/audit` (4 profiles): only the
    baseline (section-over-card gap 0, 812 phone viewport clips). Figma buttons stay 3 px narrower than code (library drift, declared).

- 2026-10-23 · ghiseu-bundle-figma-v1 (code b5c41a24 registry-down-alert-v1, 06ecea15 ghiseu-picker-toast-v1 + lone-trash-v1, 36e31351
  finish-doc-error-filecard-v1; user mid-job: „Vezi …” buttons are label only, no eye). GEAP Ghișeu + FO Full Flows 09 + FOD:
  (1) **Registry down** = one `Message · subtle` Warning (bold lead „Registrul de stat nu răspunde acum.”) as the stack child right above
  the first IDNP/IDNO row (gap 16 dialog / 24 sheet section); fields lose the outage error + „Introdus manual · se verifică” hints;
  gh-02f fixed, new gh-02f2 (PJ, from gh-02d) · gh-02f3 (required errors) · gh-02f4 (= gh-02v, before lookup) · gh-03m · gh-03n. New
  additive props: `Identity card · selected (FO)` BOOLEAN `Show manual tag` + exposed tag-filled Subtle Accent „Introdus manual”.
  (2) **Act picker** = `Act row` 11846:340996 got BOOLEAN `Show icon` (default on), TEXT `Line 2` + `Show line 2`, exposed `More`
  (Neutral Icon=Only Small ⋮, ABSOLUTE MAX/MIN 12/12, `Show more`) — 30 Ghișeu rows: icon off, line 2 = act type („Decizie de
  respingere” for the rejection), authority on, pill off, ⋮ only when something can start (not locked / expired), title row pR 40;
  open = More State Active + Focus Ring/Medium effect style. New gh-02z (15 acts + library search Medium, section gap 12),
  gh-02z1 (Focus + value + clear), gh-02z2 (`Empty state · no results` 10703:1516, Text hidden, padding 16).
  (3) **Lone trash**: 643 row ⋮ in 94 `Table - Dosare noi, Schițe` tables → same button, `🔄 Leading Icon: 16` = 20/delete 489:3163
  (grey, renders 16); gh-01d = Hover + library tooltip Small Top Right „Elimină schița”; open menus in gh-01d / gh-11d removed (arrow
  re-pointed to the trash first). Comment 1979398089 posted on gh-01 for Alexandr.
  (4) gh-01t (clone of gh-01, row 4771 dropped, tabs 7 / 2, library toast Success Text-only) in column 10 after gh-10a + arrow from
  „Înapoi la Dosare noi”. (5) **Certificate** = `Document · card` new variants Context=Certificate × State Default/Error × Screen
  (12571:2703 / :2747 / :2787 / :2832, TEXT `Note`) → gh-10a / gh-10c, new gh-10c1, FO F8 / F8b / F8d / F8e (desktop + phone), new
  F8b1 (fo-08a1); FOD G7d (local set 762:10435 + Certificate Desktop 1346:14946 / Mobile 1346:14974). Tools:
  tools/figma/documents/certificate-card-set.js, finish-card-mobile.js (now: any captured card → Certificate instance, connectors
  re-pointed); stored helpers in figma.root „ghb”: cloneBlock, restack, downNotice, fitSheet, actRowPass. Lessons:
  - **Ghișeu GRID tables keep the sticky actions column as 9 ABSOLUTE cells (`gridRowAnchorIndex = -1`)** — dropping a row = remove
    its grid cells, shift later anchors up with `setGridChildPosition(row-1, col)`, `gridRowCount -= 1`, AND remove the matching
    absolute action cell + move the ones below up by the row height (else an orphan trash floats under the table).
  - **`findAll` on a stack descends into field instances** — setting `layoutSizingVertical = "HUG"` on every frame collapsed the
    library inputs to 0 height. Filter `!id.includes(";")`, or restore nested sizing from the main by parallel walk.
  - **Sheets that grow** (rows +28 each): Ghișeu sheets centre the Dialog in the Overlay → a taller dialog loses its header above
    the screen. `fitSheet`: Body.minHeight = dialog + overlay paddingTop − 32, Overlay resize to the screen height; short content →
    Dialog `layoutSizingVertical = "FILL"` (the code sheet always reaches the bottom).
  - **The Copy value upgrade leaked its default „rsspa-AP-023” into every Identity card ID** (30 on Ghișeu, fixed from the code
    probe; FO Full Flows 09 still has 14 — open). Census leaked defaults by text after any component upgrade.
  - **Onest has no „⋮”** (again): my notes said „⋮” → rendered „:”. Write „More actions” / „Mai multe acțiuni” in board text.
  - Disabled-item tooltips in open menus: a library tooltip above the item covers the trigger — use Arrow Bottom Right and shift
    the bubble left of the menu.
  - Library gap (declared): no 12/20 text style in Foundations → the certificate `Note` (12/20) is unstyled Onest + text tokens.
  - Left / reported: dialog field widths in column 02 are 216 × 3 (code IDNP span-6 332 + 158 + 158) on every block — column-wide
    drift; Ghișeu sidebar badges (code shows none). No Agent tool in this session → stored `ghs/audit` on 19 blocks + components:
    only the board baseline (background table clip, rows-per-page label, raw scrim, cloned spacing-unbound) + declared Note style;
    connector audit 66 connectors, only the 2 pre-existing marker-off-grid findings.

- 2026-10-23 · ghiseu-figma-cleanup-v1 (the three open points of ghiseu-bundle-figma-v1). (1) **Lookup row widths = code**: the 16 three-field
  rows `Row 1` (`Lookup · IDNP|IDNO…` frame + Nume + Prenume) on the Ghișeu board → lookup FIXED `round((W − gap) / 2)` (= the code's
  span-6), the two others FILL (= span-3): column 02 dialogs 680 / gap 16 → 332 / 158 / 158 (gh-02b/c/d/m/v/g/p/h/e/f/f2/f3/f4; PJ
  company rows already 332 / 332 = span-6 + span-6), column 04 page rows 768 / gap 32 → 368 / 168 / 168 (gh-03c / 03d / 03m, their
  gap 32 now bound to spacings/spacing-32). The `Counter` is ABSOLUTE constraint MAX → it followed. Only gh-02f3 grew (Nume / Prenume
  „Câmpul este obligatoriu.” wraps to 2 lines in 158 → 116 = code 116); dialogs centre in FIXED 1024 screens → no restack, no
  connector touched. (2) FO Full Flows 09: the 14 leaked `rsspa-AP-023` (all phone `Identity card · selected (FO)` cards F2…F2i) →
  the code's idValue by the card's `Name` prop (data/acte-permisive.json: Anastasia Cojocaru 2990000000001, Vrabie Gheorghe
  2990000000002, SRL Global Trader 1012600000002, «Vita-Plant» SRL 1012600000001), set on the nested Copy value `Value#` prop; 0 left
  on GEAP board pages (only the component mains keep the default). (3) **Sidebar count badges: nothing to remove** — all 106 Ghișeu
  sidebars (105 `Sidebar · Desk clerk (Ghișeu)` 11595:241745 + gh-01g's `Public Services Sidebar`) have 0 visible badges (main's
  numbered-badge layers hidden), = the code (js/e-permits-shell.js renders a nav badge only when `item.badge` is set; no Ghișeu item
  has one). The counters on the board are the tab counters („Schițe 8”, „Dosare nedistribuite 1”), which the code shows too. Lessons:
  - **Verify an „open point” before acting on it**: census by visibility chain (`skipInvisibleInstanceChildren = false`, walk up to the
    instance checking `visible`) + a code probe of the nav text proved the badge item was a misreading of hidden main layers / tab counters.
  - **span-N rows in Figma**: Figma's FILL has no grow ratio → the wide field FIXED at `(W − gap) / 2`, the narrow ones FILL; works for
    any row width / gap (dialog 680 / 16, page 768 / 32).
  - **The board's desktop FO identity numbers are a different fake set** (9007021010055 / 2118421010044 / 12012092309223014, 88 texts on
    FO 09, captured raw) — phones now show the code values, desktops don't. Board-wide sync needs a per-occurrence name map (switcher rows,
    authorization „Acordată de”, documents) → reported, not done.
  - No Agent tool in this session → stored `ghs/audit` on the 16 rows + 14 cards: 0 findings after binding the 3 gap-32 rows.
- 2026-10-23 · Same job, coordinator follow-up. (1) **PJ glyph: 0 suitcases in GEAP 2.0** — the „Persoană juridică” segment (library
  segmented-control) already uses 24/business-filled c477fc69…, the FO identity card avatar Type=Icon already 20/business 13c70475…;
  the Foundations „business” glyph simply looks like a briefcase. Census by MAIN name (`/suitcase|luggage|briefcase|portfolio/` on
  `mainComponent.name` + set name of every ≤ 24 instance) over 20 pages, 49 k icon instances → 0. Lesson: **check the glyph's main
  key before „fixing” a look-alike** — compare with the PJ keys in the Library table, not with the picture.
  (2) **FO 09 desktop identity numbers = code**: 63 texts replaced by the name in the same row / card (nearest ancestor ≤ 4 levels
  whose texts contain exactly one known name and no other person name): Anastasia Cojocaru 34, «Vita-Plant» SRL 15, SRL Global Trader
  10, Vrabie Gheorghe 4; Copy value texts through their owning instance's `Value#` prop, raw texts by range replace (fonts loaded).
  Not mapped (reported): 14 „Grigore Vasilescu · Împuternicire” rows in F1 / F1b / F1d / F1e / F1f (not in data/acte-permisive.json,
  the code switcher has no such identity → stale identity list, needs a redraw), 9 persona-review notes quoting the old numbers (kept
  as history). Stored `ghs/audit` on F1d / F2e / F2f: only pre-existing stepper fractions, tight-gap, one image-fill avatar.

- 2026-10-23 · ghiseu-autosave-csv-figma (code cf6c954e autosave + cc535e3e export-modal-csv-v1; scope changed mid-job: export dialog
  kept, CSV only). GEAP Ghișeu col 01: gh-01e 12593:375348 (new: list, export button State=Hover + library tooltip Small Top „Exportă
  CSV”), gh-01e2 11818:21157 (the old „Exportă lista” block renamed: Format label + segmented removed, title „Exportă dosarele”, new
  „Format line” Desktop/Body/Small text/base/default, primary „Exportă CSV”), gh-01e1 12593:373670 (list + library toast Success
  Text-only top-right „Am exportat 8 înregistrări în dosare-noi.csv.”, export button State=Focus + tooltip = code's returned focus).
  Arrows gh-01 → gh-01e „Hover pe export” (re-pointed), gh-01e → gh-01e2 „Click” 12593:375995, gh-01e2 → gh-01e1 „Exportă CSV”
  12593:374337. Col 11: gh-02o 11818:22373 retitled „Autosave” (leave dialog overlay deleted, status line time 16:32, name field
  State=Focus), new gh-02o1 12593:37246 (clone of gh-01, rows 1/2 swapped so the edited draft is on top with 16:32) + arrow from the
  request window × 12593:37881. Both columns restacked at 240, Start here + file index updated (109 blocks). Lessons:
  - **Board time beats the brief's sample time**: the board's „today” is 16 octombrie (rows modified 15:59) — the brief's „14:32” would
    have put the just-edited draft below older edits. Used 16:32 + the row's own elimination date (12 ianuarie 2027) and reported it.
  - **Swapping two table rows by text keeps the captured clip frames' FIXED widths** (a „—” frame 9 wide cut „Emitere primară” to „Ei”)
    → swap the clipping wrapper widths too, then re-run the audit (clipped-content caught a 1 px number cut).
  - **Block notes / Start here lines carry per-line links** → edit with insertCharacters / deleteCharacters on ranges, never `characters =`.
  - **Connector re-route helper must handle position endpoints**: `{...e, magnet}` on a position endpoint throws „Unrecognized key” —
    branch on `"magnet" in e` vs `e.position` (nudge x + 1 and back).
  - A scope change mid-job (dialog deleted → kept) is cheap when the old block is kept and renamed (ids + arrows survive) instead of
    deleted and rebuilt. No Agent tool in this session → stored `ghs/audit` on the 5 blocks: only the board baseline (table scroll
    clip, rows-per-page label, scrim fill); connector audit 70, only the 2 pre-existing marker-off-grid.
- 2026-10-23 · gh-02w-arrow (comment 1975407534, Alexandr: „pentru ce este necesar acest dialog?”; user: „do an arrow so it's clear and
  explain”). GH-02w (confirm „Schimbați procesul?”) had NO incoming arrow and no block showed its trigger → new **gh-02w0 · Mai multe
  acțiuni deschis** 12593:374341 (clone of gh-02w, confirm Overlay removed, header ⋮ State=Active + effect style Focus Ring/Medium
  `S:97cdddcd…,1296:337` = open-button rule, menu = local `Post-process menu` Desktop 11844:340693 instance 12593:375267 ABSOLUTE in
  the screen at button bottom + 4 / right-aligned (= code data-stack-menu-fixed): Item 1 „Schimbă procesul” 24/reorder d21b8ace… resized
  20, Item 2 „Istoricul cererii” 20/history 9ab6104c…, Item 3 made visible + State=Danger „Elimină schița” 20/delete 489:3163; no
  separator = code renderStackMenu). Connector 12593:375329 (clone of 11823:20255) from the menu with `position {x: menu.width, y: item 1
  centre}` → GH-02w's raw `Dialog` frame 11673:10375 magnet RIGHT, label „Schimbă procesul”. gh-02w note → English why-text. Column 03
  restacked (+2069, then +20 because the new 2-line note grew gh-02w), section +2089, Contents 03 „15 blocuri”. Reply 1979546457. Lessons:
  - **A confirm dialog block without an incoming arrow reads as „why does this exist?”** — when a state is reached through a menu,
    draw the open-menu block before it (menu-open states have no demo state of their own → link „Prototype ↗” to the closed screen,
    here gh-05c) and arrow from the item.
  - Hidden slots of a local menu (`Item 3`… visible=false) are invisible to `children.filter` while `figma.skipInvisibleInstanceChildren`
    is true (the call failed with „cannot set property 'visible' of undefined”) → set it false before toggling hidden instance slots.
  - Rewriting a note can add a line (+20 high) → re-check the column gaps after note edits, not only after inserts.
  - The `Block · gh-` census (109) already matched the index line after the insert — the old index count was off by one; recount
    instead of „+1”.
  - No Agent tool in this session → inline figma-audit on both blocks: only the board baseline (background table clip under the sheet,
    raw scrim fill); the new menu passes dropdown-effect.
- 2026-10-23 · gh-02w-arrow follow-up (user: the new arrow „must not overlap other arrows or blocks — move it so it's clear where it
  leads”). Elbow connectors can't take waypoints, and Figma's auto-route put every right-side arrow of column 03 in one 8641–8749 bundle
  (lanes 5 px apart, the gh-02j arrowhead and the gh-02j → gh-02k start on the same y = collinear). Fix = **lane anchors**: a 2×2 `Flow
  anchor` (10438:120705) in the section at (lane x, end y); connector A = source → anchor magnet TOP (end cap NONE, keeps the label),
  connector B = anchor magnet LEFT → target (no label, ARROW_LINES) = a straight last segment. Column 03 lanes in the free strip
  8640–8920: gh-02i → gh-02j 8710 (end moved to block y + 400, off the gh-02j → gh-02k start), → gh-02t 8780, → gh-02r 8840, gh-02j → gh-02k
  8910, gh-02w0 → gh-02w 8800 (own y range). Anchors `lane · …` + B connectors `… · lane → block|dialog` live in the section. Lessons:
  - **A connector START given as `position` on an instance may route DOWN first** (through the screen): both the gh-02w0 menu start
    and the gh-02i act-row ⋮ start did, once the end changed. Start from a `Flow anchor` instance placed ABSOLUTE in the screen over
    the control (sized to it, checked against the control's absoluteBoundingBox — the stored position 768 was the ⋮'s right edge, not
    its centre) with magnet RIGHT.
  - Lane order = nesting: an arrow whose y-range lies inside another's takes the inner lane; interleaved ranges (start A < start B <
    end A < end B) cross once whatever the order — 3 such perpendicular crossings remain in column 03 (gh-02i→gh-02j × →gh-02t,
    gh-02j→gh-02k × →gh-02t and × →gh-02r), only removable by moving blocks.
  - Connector labels have no background and centre on the vertical segment: keep lanes ≥ label half-width (~60) from neighbours and the
    block edge; shortened „Mai multe acțiuni · act” → „Mai multe acțiuni”.
  - Region screenshots: a transparent temp frame on the page renders empty; screenshot the SECTION at maxDimension 10000 and crop with
    `sips -c h w --cropOffset y x`.

- 2026-10-23 · ghiseu-roles-as-fo-figma (code 58d72ac3). GEAP Ghișeu „Date solicitant” = the FO role groups. PJ (gh-03, 03b, 03h, 03i,
  04, 03f, 03g, 03a, 03e, 03j, 03k, 02r): „Persoana care depune” → „Reprezentant”; the old basis `Section` (H5 header + „Legătura dintre
  persoana…” paragraph) removed; new `Representation basis` group (VERTICAL gap spacing-8: `Basis title` = clone of the Solicitant title
  row + `Info trigger (tooltip)`, then the Authorization card, or the fallback `Basis body` gap spacing-12 = Message · subtle Warning ·
  `Check option` (pB spacing-6, = code wrapper 38) · inline error / boxed upload) inside `Section - Solicitant › Container` (gap
  spacing-20). gh-02r's green „Temeiul reprezentării: administrator în RSUD…” notice → RSUD card. PF (gh-03c, 03d, 03m, 03n, 04a, 04b):
  `Representative` group (title + `Representative body` gap 12: check option, then lookup row or identity card) + basis group; gh-03c lookup
  → Ion Rusu Changeable card (= code). **`Document option · checkbox` got `State=Error, Checked=False` 12595:2207** (the procură error;
  replaced 3 library checkbox-label Error). Verificare gh-07 / 07j / 07a / 07b / 07c / 07f / 07d / 07e / 07g / 07h / 07i / 07a1 / 07a2 /
  07a3 / 07g1 + gh-13 / 13a: row „Reprezentant” (name + IDNP) + new row „Temeiul reprezentării”; A4 `Document page · Paper request · page
  1` 12001:7123 group → „Reprezentantul”. New: gh-03b1 12600:39086, gh-03a1 12600:39915, gh-03c1 12600:40738 (library tooltip Large Arrow
  Bottom, text LEFT, ABSOLUTE in the screen, arrow tip 2 px into the trigger), FO 09 F2e1 12600:376821 (fo-02h, desktop tooltip + Flow
  anchor on the Requestor instance's ⓘ). GH-02k redrawn as Reperfectare step 2 (gh-02w's Form:align cloned, stepper 1 Completed / 2 Active,
  info-note text prop). Comment reply 1979579209 on 1975419018. Lessons:
  - **Removing a captured control deletes the connectors that start on it** (gh-03a → gh-03j on the swapped checkbox-label, gh-03c → gh-03d
    on the removed lookup). List the connectors of every block BEFORE a structural pass and re-point first; I had to recreate both.
  - **Cloning a variant inside its set drops its componentPropertyReferences** (Label / Asterisk / Icon) — setProperties then silently does
    nothing. Re-bind `componentPropertyReferences` on the clone's text / layers right after cloning.
  - **Ghișeu sheets: Dialog HUG + Overlay align MAX** → a shorter step slides the sheet down and shows the BO behind. After any content
    change set Dialog `layoutSizingVertical = FILL` and Body.minHeight = max(868, content + 24 − 32) (screen ≥ 900).
  - The stored `ghs/audit` caps `findings` at 60 — run it per block to see everything; filter to the changed subtree.
  - Another agent's block (gh-02w0) appeared mid-job in column 03 — restack by current y, never by a list taken earlier.
  - Left / reported: gh-02k / gh-02w „Țara” is drawn as a phone-code field (code = flag + Moldova select, disabled); demo state gh-02k still
    opens step 1 (Figma shows step 2 as asked); identity card IDs have no copy icon (code has). No Agent tool → stored `ghs/audit` per block:
    only the board baseline (background table clip, rows-per-page label, raw scrim, section-over-card gap 0) after binding 9 Row 1 gaps
    (spacing-20), 2 lookup gaps (spacing-24) and the gh-03g half-pixel dialog.
- 2026-10-23 · sticky-col-shadow-figma (code aa9dc772: pinned-column edge shadow). New local effect styles `Table / Pinned column shadow – end`
  / `– start` + set `Table / Pinned column shadow` 12600:377428 (see Library table). Applied to the **30 visible Ghișeu tables** whose sticky
  actions column is drawn as 9 ABSOLUTE cells at x 1128 (gh-01, gh-01a header only, gh-01f, gh-01t, gh-01e/e1/e2, gh-02o1, gh-11c/d … =
  every `Table - Dosare noi…` with absolute cells): one `Pinned column shadow · end` instance each (12600:377429, 12601:39198…375179).
  Nothing else qualifies, checked against the code (probe of `.has-overflow-*` / edge cells at the board width): GEAP BO registries
  (srv-01, trf-01, dos-05, clf-03) are drawn at 1920 where every table FITS (scroll 0) → none; eKYC (ek-04, ek-06g, ek-27k, also 375),
  Process Designer pd-35 (narrow), RAP act-field tables (rap-03q), Cabinet act-field tables pin only the START column → at scroll
  start no shadow; RAP registry pins nothing. No table on any board is drawn scrolled. The 83 Ghișeu tables without absolute cells are
  the hidden backgrounds under the full-screen request window (actions column off-screen at 1628) → untouched. Lessons:
  - **Probe the code at the BOARD's width before drawing a state-dependent effect** (`scs/probe.mjs` reading the scroll box classes):
    the brief listed six registries, only one draws an overflowing table with an end pin at its board width.
  - **A shadow „on the whole column” for absolute grid cells** = one carrier instance under the cells, not 9 per-cell effects (banding
    at row lines) and not a wrapper around the cells (other agents' row-drop helpers move the absolute cells by name). Its clip + 32
    padding on the shadow side = the code's `clip-path: inset(0 -32px 0 0)` → no smudge above the header / below the last row.
  - **`insertChild` into a GRID auto-places the node in a NEW row before `layoutPositioning = "ABSOLUTE"`** → gridRowCount +1 and a FIXED
    table grew 438 → 488 (first 3 tables). Record gridRowCount / height / sizing first, restore after; check `full` against the old height.
  - Ghișeu tables are FIXED 438 whatever the row count (gh-01t: 8 rows = 388) → STRETCH does not follow a row drop; re-run apply-grid.js
    (it REFITs existing shadows to the cells' span and removes orphans) after dropping / adding rows.
  - No Agent tool in this session → inline figma-audit on the set + 3 instances + 2 tables: 0 findings on the new nodes (6 pre-existing
    captured-cell clips). Start here / file index unchanged (no block or count changed).

- 2026-10-23 · ghiseu-fo-small-fixes (three code ≠ Figma points from ghiseu-roles-as-fo-figma). (1) **„Țara” = library select-input
  Disabled + Leading flag** (code: disabled `.e-permits-fo-select` 🇲🇩 Moldova): the 9 Ghișeu `phone · Țara` (phone-number-input
  International „+373”) in gh-02k, gh-02w0, gh-02w, gh-02o, gh-05, gh-05a/b/c/d → clones of Post-processes `select · Country`
  12100:11086 (select-input Style Default · State Disabled · Medium, Leading Icon on = flag · MD, Placeholder „Moldova”), FILL, star
  kept. FO 09 / FOD Address / Requestor G7 already use a disabled select / text-input with the flag — left. (2) **Identity card IDs =
  Copy value Type=Default** (value + 16 copy, = code `selectedRoleHtml` → GEAPCopyValue default): source `Identity card · selected (FO)`
  11848:340972 (both Modes) `ID value` Compact → Default, its old 4/4 padding override removed (padding 0 → the absolute Wrap sits −8 / −4
  like the code), `Meta` gap → spacings/spacing-8 (= code margin-left 8), `Manual tag` paddingLeft 8 → 0 (tag stays 8 from the icon);
  53 instances (Ghișeu 37, FO 09 16). The older FO `Requestor` set 2210:20269 (38 instances: FO 09, FOD Requestor / Address, MSupport)
  had the same Compact ID values in 9 IDNP / IDNO rows → Default + row gap spacing-8 (45 nested values kept; „Cod” rows left Compact).
  FO 09 phone cards (11, Mode Changeable): `Change` hidden — the code hides „Schimbă” ≤ 760 (css 14975) and the wider ID clipped the
  Copy frame. (3) FO 09 F2e / F2e1 desktop header `Instance switcher` → „SRL Global Trader” / „Persoană juridică”, avatar Type=Icon +
  20/business with the reference fills (FO Post-processes 10272:4323) = code fo-02 / fo-02h. Lessons:
  - **Swapping a nested instance's variant in a MAIN drops every instance's override of that nested instance's TEXT property** (the
    Value lives on the variant's own text node → new path). Swapping back restores them. Recipe: record `{instance, nested id suffix,
    Value, State}` for all instances (`getInstancesAsync` per variant; nested = `i.findOne(x => x.id.endsWith(";" + nestedId))`),
    swap in the main, re-apply with `setProperties` — verify by the rendered text, not the property (both lied „rsspa-AP-023” = default).
  - **„Phone” by width is wrong for Ghișeu**: its dialog cards are 374 wide too. Decide phone by the page (FO 09) + an ancestor screen
    ≤ 430 wide, never by the card width. And `findOne` skips hidden layers unless `figma.skipInvisibleInstanceChildren = false`.
  - After widening a value inside a card, census `Meta.width > Copy.width` (clipping) on every instance before reporting.
  - No Agent tool → figma-audit (read-only, roots = card set, 9 Requestor rows, 9 selects' rows, 2 headers, the F2e phone group): 0 findings.
- 2026-10-23 · sticky-col-shadow-figma follow-ups. (1) **Divider = dropdown-effect ring** (code 207d7426): local colour style `Table /
  Pinned divider 8%`, the shadow set's Column got the inner-side stroke, and the 30 Ghișeu tables got 60 `Table / Pinned divider`
  instances (end = actions column left edge, start = column 0 right edge, the code applies both) with the cells' inner-side weight set to
  0. (2) **Use case „table wider than the screen”** (user: „show the use case with the table shadow”): GH-01s 12605:1613 (scroll start, end
  shadow) · GH-01s1 12606:23910 (middle, 384: both) · GH-01s2 12606:350030 (end, 768: start only), 1024 clones of gh-01 after it in column
  01 (restacked, 13 blocks), arrows 12606:350846 / :350850 / :350854, Prototype ↗ = gh-01 (no own demo state), contents line 01 + file
  index (115) updated. Lessons:
  - **A frame has ONE stroke paint for all sides**: the captured edge cells carry the row line (bottom) and the pinned divider (left) in the
    same paint → recolouring the stroke would turn the row lines 8 % too. Zero the inner side and draw the divider as its own layer on
    top (a 1 px instance at 8 % black also reads darker over the grey header, like the code's rgba border).
  - **Narrowing a cloned Ghișeu screen**: the page Container and the toolbar Header are GRIDs with a FIXED 1184 column → set
    `gridColumnSizes = [{type:"FLEX", value:1}]` AND the Header `layoutSizingHorizontal = "FILL"`, search 296 (code at 1024), footer row
    FILL — else the toolbar's right half („9 câmpuri”, export, „Dosar nou”) silently disappears behind the clip.
  - **Drawing a scrolled sticky table**: table ABSOLUTE at x −S in its clipping wrapper (FILL / FILL, keeps its height), the absolute end
    cells at S + visible − column width, column 0 cloned as absolute cells at x S over a Start shadow, dividers appended last.
  - REST `/v1/images` renders the last SAVED version — it lagged minutes behind the plugin edits (showed the column without the new blocks);
    use it only for 3× crops of nodes that have not changed recently, or MCP get_screenshot (capped at 1×).
- 2026-10-23 · Pinned divider everywhere (coordinator: „the code applies the 8 % divider to every pinned column”). Captured tables
  only draw a vertical border where the code pins a column (checked: Dosare col 2, Utilizatori / Servicii / Tarife / eKYC / ntpl /
  clf-01 / pd-35 col 1, clf-03 + registries' actions = end), so „one vertical side stroke in a table” = the pinned edge. Four shapes:
  (a) **column frames** (`Frame 1261156219` first, `…228` / `…236` last, `Vertical Frame` empty headers; B0) → just
  `setStrokeStyleIdAsync(„Table / Pinned divider 8%”)` — 123 frames on 8 GEAP pages (Tarife via its set main, 3);
  (b) **row tables** (table › thead/tbody › tr › td, row line in the same paint) → inner side 0 + one `Table / Pinned divider` ABSOLUTE in
  the table frame per edge: Classifiers 22 tables + Services 1 (apply-divider-rows.js); (c) **grid tables** → same overlay, restore
  gridRowCount / height: Process Designer 3, Ghișeu backgrounds + gh-01g 83 (apply-divider-grid-any.js), eKYC 106 tables (cells are named
  `th · …` / `cell · …` / `Table Cell` → match by stroke, not name); (d) **library table-cell instances inside a SLOT** (RAP / Cabinet
  act-field tables): `strokeRightWeight` 0 on the instance + divider appended to the slot (works on instance slot content too): RAP main
  22411:177536 + 8 board instances, Cabinet 1072:8943 / 1072:14582. Local style + component created per file: eKYC `S:7d843104…` /
  10981:134238, RAP `S:c4e19733…` / 22457:226184 (section Shared 22424:3773), Cabinet `S:1e7445ed…` / 1369:54458. A4 document grids
  (RAP `A4 grid row`, Cabinet Label / Value cells, GEAP 12001:…) have borders on every column — not pinned, left alone.

- 2026-10-23 · board-arrows-v2 (user: „blue arrow text = blue background + white text, everywhere; fix the arrow overlaps everywhere”).
  **SPLIT ARROWS REJECTED by the user the same day („do ONE blue arrow, not 3 connected pieces”) — the lane-waypoint / A+B / via-stub
  technique below (and in gh-02w-arrow follow-up) is wrong; see board-arrows-v3: one connector per arrow, never split.**
  EVO Cabinet (My Requests 21 / My Permits 10), EVO-WEB RAP (Registrul actelor permisive 19), eKYC (9 BO pages, 85), FOD (Requestor 56).
  Tools: tools/figma/board-arrows/ (route-audit.js, label-pass.js, label-component.js, reroute.js, autoplan.js), stored per file in
  figma.root shared plugin data `boardarrows/{audit,labels,labelcomp,reroute,autoplan}` (run `new Function("figma", src + "\nreturn X;")(figma)`).
  - **Label pill = the connector's own label background**, not a separate instance: `c.textBackground.fills = [setBoundVariableForPaint(…,
    stroke variable)]`, corners via `topLeftRadius…` = 999 (= radius-full; the `cornerRadius` setter is a silent no-op, no variable binding,
    no padding API, no absoluteBoundingBox), `c.text.fills` bound to text/base-inverse/default of the SAME library as the stroke variable.
    Only the native label stays centred on its arrow when blocks move; the local `Board / Arrow label` component (padding 4/8, radius-full,
    same variables + label font) is the documented spec / legend (Cabinet 1362:3947, RAP 22452:47951, eKYC 10978:12423, FOD 1350:12155).
  - **Read the real route from `exportAsync({format:"SVG_STRING"})`**: arrows with an arrowhead export as an outlined fill (stroke rectangles →
    bounding boxes of subpaths), cap-less pieces as a centre-line `stroke` path. route-audit.js turns both into H/V segments and reports
    overlap (parallel < 14 px), block (segment through a screen / note that is not its own), cross (right angle, allowed), detached, label.
  - **Lane technique, generalised** (reroute.js): start = the control (or an anchor over it / over a position start), A = start → 2×2 lane
    waypoint (TOP/BOTTOM magnet, keeps the label, no caps), B = waypoint → target screen edge `position` at endY (arrowhead) = straight last
    segment. Lanes: block right + 130 / 190 / 250 on Cabinet phones, centred in the real gap width on desktop grids (autoplan.js; 1440 blocks
    in 1920 slots leave 720), nested / shorter ranges on inner lanes, ends spread +48 per extra arrow into the same screen.
  - **Same row, several arrows** (tabs, search + filter, decision branches): never one start point — rightmost control leaves directly, the
    others get stacked TOP stubs (`via`, leftmost tallest, 24 apart) or own exit points on a card edge (anchors 30 apart on a decision).
    **Fan-out to the next column**: the arrow that ends first takes the OUTERMOST lane and should start highest → 0 crossings (FOD d5).
  - **Router quirks**: a TOP/BOTTOM start with a far target runs vertically through the blocks below/above first → use a 8–32 px `via`
    stub; an A piece may pick its own vertical x and jog near the waypoint → put the lane at the x the router chose; **a clone keeps the old
    cached route and no magnet toggle fixes it** (FOD G1, Cabinet sm-04d B) → clone a healthy short piece, re-point it, delete the stuck one
    (`figma.createConnector` does not exist in design files). Re-point / clone BEFORE removing anything an arrow is attached to.
  - RAP connectors had `ARROW_LINES` on the START too (an arrowhead pointing into the clicked control) → reroute.js forces start cap NONE.
  - Jump markers sit in the Cabinet lane strip → lifted above the connectors (z-order) so lanes pass under them; `/^Screen/` also matches
    „Screen label · …” — use `/^Screen · /`. Desktop-only controls (RAP filter chips) go to left lanes via stacked TOP stubs (viaSide LEFT).
  - Result: 0 overlaps / 0 detached / 0 off-screen crossings on all 13 pages; right-angle crossings left: Cabinet 4, RAP 2, eKYC 28
    (Dashboard 13 + Providers 11 = modal / list item order differs from the target order; only removable by moving blocks), FOD 0.
    Not touched: RAP non-board pages (Sitemap 667, IA 105, Cups, Explorations…). No Agent tool → QA = route-audit + screenshots.

- 2026-10-23 · board-arrows-v3 — **ONE connector per arrow, never split** (v3 start-in-the-gap anchors REJECTED too — see v4: start ON the clicked element) (user: „do ONE blue arrow, not 3 connected pieces — is it so
  complicated?”). Every v2 arrow (A + waypoint + B, via stubs, footer 3-piece) collapsed back into its original connector; all waypoint /
  via / extra-piece nodes deleted in the 4 files (+15 orphaned older eKYC start anchors). Tool: tools/figma/board-arrows/one-arrow.js
  (ONE_ARROW / CONVERT / REDO, stored per file in `boardarrows/one`). How to steer a single ELBOWED connector:
  - **Start** = a 2×2 Flow anchor placed beside the column at the lane's x, on the clicked control's row; magnet BOTTOM / TOP toward the
    target (LEFT / RIGHT when the target spans that row → a straight line). Figma then draws one L: down the lane, into the target.
    Several arrows from one row = several anchors at different lane x → no shared start segment, no stub tricks needed.
  - **End** = an 8×8 Flow anchor INSIDE the target screen at its edge (x = width − 8 or 0, absolute) with the side magnet RIGHT / LEFT
    (or TOP for an arrow that must come from above). An edge `position` endpoint has no outward stub — Figma ran the line ALONG the
    screen border to reach it (seen on every Cabinet arrow in the first try).
  - Lanes: same interval rules as v2 (nested ranges inner, fan-out ending first = outermost, ends +48 apart on one screen). With no start
    horizontals, crossings dropped: Cabinet 4 → 1, RAP 2 → 0, eKYC 28 → 3 (Dashboard 13 → 0), FOD 0.
  - If two single arrows meet on the same target side, change one end side (FOD G1 → „For whom” now enters from TOP) — never add a piece.
  - Short arrows: a pill hides an L shorter than ~150 px → use a straight horizontal from an inner lane when the row lies inside the
    target's height (eKYC „Deschide furnizorul”).
  - Result: Cabinet 21 + 10, RAP 19, eKYC 85, FOD 56 connectors (one per arrow), 0 overlaps / 0 detached / 0 off-screen crossings,
    0 lane / via nodes; right-angle crossings left: Cabinet 1 (sm-03 Continuă × Elimină), eKYC Providers 3.

- 2026-10-23 · board-arrows-v2 on **GEAP 2.0** (all board pages; same job as the Cabinet / RAP / eKYC / FOD entries above).
  **Rules now (user, same day): arrow label = blue pill + white text; every arrow = ONE connector — no waypoints, no split pieces; steer
  only with endpoint sides (magnets), anchor placement and ELBOWED; where arrows share a path they should run as parallel lines 16 px apart.**
  - Labels (tools/figma/board-arrows/labels.js, stored `barrows/labels`): native label, `textBackground.fills` = background/brand/default
    (Foundations lk-e9e8 7104dc11…) — or the stroke's own variable when it is not the brand one (FOD Address = main-color/600) — corners
    `topLeftRadius…` = 999, text = text/base-inverse/default (c6263eb1…), Onest Medium 14/20; the API cannot bind a text style to a
    connector label (`textStyleId` / `setTextStyleIdAsync` = „no such property”). Labelled connectors appended last (pills over lines).
    Empty labels: background cleared. 615 labels on 15 pages (Services 134, Ghișeu 76, Requestor 55, Address 39, User Mgmt 33, …).
  - **Wrong labels found**: every arrow on Classifiers (24) and User Management (33) read „Șterge” (the old unloaded-font clone bug) →
    rewritten from the clicked element / target block. Check labels against the start element before any arrow pass.
  - I first built a split-lane router (pieces + 2×2 waypoints) — rejected by the user mid-job; tools/figma/board-arrows/unsplit.js
    (stored `barrows/unsplit`) merged every split arrow back (original end, ELBOWED, label kept; pieces + lane anchors deleted; start
    anchors at the clicked element kept). Also merged the older Ghișeu column 03 lane arrows + gh-02w0 → GH-02w (12593:375329, 11823:20255
    / 20259 / 20263 / 20267) into single connectors.
  - **STEER** (steer.js, stored `barrows/steer`): for each flagged arrow try start side × end side (+ ends on the target block's label row /
    screens = anchor placement), score Figma's REAL elbow route (SVG export) — overlap 1000, through a block 300, label on a block 200,
    heads touching 300, length/100 — keep the best; batches of ≤ 15–30 arrows per call (≈ 2 s per arrow). Overlaps: Services 254 → 2,
    Ghișeu 109 → 2, Classifiers 12 → 0, all other pages 0. Through-block crossings that magnets cannot avoid stay (long backward jumps:
    FO 09 F3i → F4 28 000 px, Services 17 arrows, Ghișeu 26 segments) — candidates for jump markers or moved blocks.
  - **Analyzer** (analyze.js, stored `barrows/analyze`): arrows with an arrowhead export as outlined fills, cap-less ones as a `stroke`
    centre-line path — parse both (v1 missed every cap-less piece and reported 0 on broken pages). Start anchors sit in the section over
    their block → count them as that block. Intra-block annotation arrows (FOD Address C01c) are left alone.
  - **Moved elbow segments are NOT reachable from the Plugin API**: `connectorControlPoints`, `connectorBezierControlPoints`,
    `resetConnectorControlPoints`, `connectorTextPosition` exist on the node but throw „not a supported API” (get and set). So the 16 px
    parallel offsets the user drags by hand cannot be read, copied or scripted — and **any endpoint write (connectorStart / connectorEnd,
    even the same value) re-routes the connector and drops a hand-bent segment**. Never run a magnet/steer pass over a board the user has
    bent by hand; ask first, and do the 16 px offsets in the editor.
  - Elbow pieces between two anchors on one line took long detours (MSupport) → when a straight piece is unavoidable use
    `connectorLineType = "STRAIGHT"`; Figma deletes nothing on line-type changes.
  - Ghișeu: 3 connectors already dangling before this job (start node gone: 11882:347454, 11823:20351, 12488:361363) — left for the
    agents editing Ghișeu now.
- 2026-10-23 · Pinned column v4 (user: „make a STYLE … the ENTIRE column as an absolute-positioned element, not individual cells”; user
  reference GEAP 12615:79800 = one absolute 56 × 438 white frame holding the column's cells + 3 drop shadows). Rebuilt everywhere as
  `Table / Pinned column` instances (see Library table): GEAP 149 on Ghișeu (32 End·Shadow, 1 End·No shadow, 2 Start·Shadow, 114
  Start·No shadow — gh-01 / 30 tables at scroll start, GH-01s/s1/s2 = start / middle / end, hidden backgrounds + gh-01g), 22 Classifiers,
  1 Servicii, 3 Process Designer, 123 in-flow column frames (Servicii, Dosare, Workplace, Shell, Users, ntpl, Advanced filtering, Tarife
  main); eKYC 106; RAP main + 8 board copies; Cabinet 2. Old helpers, divider lines, the 8 % paint style and the first effect styles deleted.
  Lessons:
  - **The user's reference beats my spec**: the ring as a 0 0 0 1 drop shadow replaces any divider stroke / line, and both shadows use
    X ∓4 (not 4 / 10). Read the reference node's effects before building.
  - **Slots**: `component.createSlot()` gives a non-auto-layout slot → set `slot.layoutMode = "VERTICAL"` (else „FILL can only be set on
    children of auto-layout frames”). Instances: take the slot with `inst.findChild(c => c.type === "SLOT")` AFTER inserting.
  - **A NEW instance placed inside another instance's slot content has an unreachable slot** („node … does not exist” on its children —
    RAP board act tables live in Data modal content › Sections › Act fields table › Rows). There the column is a plain frame with the same
    bound effect style (`– ring`) holding the cells; report it.
  - Moving grid cells: move the cell FIRST, then add the placeholder and `setGridChildPosition(row, col)` (the target cell must be free),
    then restore gridRowCount / height. resize() a moved cell BEFORE setting FILL (resize after FILL fixes it again).
  - Stored converters (shared plugin data, run with AsyncFunction) keep calls tiny; a page-wide findAll on the Services page dropped the
    MCP transport but the write completed — always re-check state before re-running.

- 2026-10-23 · board-arrows-v4 — **one connector, START ON THE CLICKED ELEMENT, shared paths = parallel lines 16 px apart** (user).
  - **Hand bends are not scriptable here**: ConnectorNode has `connectorControlPoints` / `connectorBezierControlPoints` /
    `resetConnectorControlPoints` (and `connectorTextPosition`), but the MCP plugin runtime throws „not a supported API” on read AND write,
    and the REST file JSON has no field for them. Any write to connectorStart/End re-routes the arrow and drops a hand-moved segment →
    never rewrite an arrow the user bent today; ask first.
  - **Router rules (measured with throw-away clones)**: start RIGHT + end RIGHT → the vertical runs at max(right edge of the two endpoint
    boxes) + 33 (LEFT/LEFT mirrored); moving an endpoint box 16 px moves the line 16 px. RIGHT → LEFT (next column) → vertical at the
    MIDPOINT of the two boxes (a start deep inside a screen puts it inside the screen). BOTTOM/TOP start toward a far target → straight
    vertical through everything first (unusable), except a short hop or a start on a card edge.
  - Technique (tools/figma/board-arrows/restart.js, stored `boardarrows/restart`: RESTART + OFFSET): start = the control itself (or an anchor
    sized to it when nested) with the side magnet; end = 8×8 anchor just inside the target edge with the side magnet. Shared verticals →
    OFFSET moves the end anchor outward 16 px per extra arrow (nested / shorter = inner), so the tip stops 16 / 32 px before the edge.
    Two arrows from one row: rightmost leaves RIGHT, the next leaves TOP (its horizontal runs above the row); a third can't be separated.
    Decision fan-outs (FOD d5): exits on the card's BOTTOM edge at x = right − 8 − 16k, the branch that ends first outermost → 0 crossings.
  - Left for a manual 16 px drag (listed to the user): third+ arrows on one row (eKYC R05c tabs, C02i „Clic pe status”, RAP chip Autoritate
    top segment, Cabinet pp-01j „Vezi act permisiv” × „Inițiază un postproces”), the eKYC Dashboard modal fan-out (starts on the screen edge
    at each row, staggered 32 px), RAP footer → registry (starts on the Entry Point top edge).

- 2026-10-24 · local-components-page-v1 (user: „all components — a separate page with local components, arrange nicely”, pointing at
  Address `Main Frame` 3521:16892). The page „🧩 Local components” 10566:10080 already existed → reused and rebuilt: 16 category
  Sections (title H3 + one-line Body/Small secondary description, bound colours), 110 mains already there + 89 moved from board pages
  (Address 6 sets, Start here Status, Dossiers holder 15, User Management Profile/Modal holder 13, Full Flows 09 top-level 13, Patterns 4,
  Requestor 4 phone/email, Process Designer 6, Form Builder 3 + its old „Local Components” section, Incidents „Local Components” section,
  Services .step-desktop, Workplace sidebar-list-item, Post-processes Permit card, MSupport button copy). Every main now has a one-line English description (about 80 were missing).
  Lessons:
  - **Moving a main between pages is just `section.appendChild(main)`** (no page switch needed); every instance stays linked (sampled
    .street / Status / Trajectory). Delete the emptied holder frames afterwards; check they hold only TEXT first.
  - **`getInstancesAsync()` counts are not stable across calls** (Settings · List option 70 → 102 with no change; nested instances on
    pages loaded later show up) → compare before/after for DECREASES only, and explain increases (my demos added 10 Pinned column + 1
    Message). 0 decreases here.
  - Left on boards on purpose (mains that ARE screen content — moving them would empty the screen): FO mobile `Header` 3521:12175 (inside
    the F0 block), the `Public Services Sidebar` mains inside Dossiers / Workplace / Shell screens, Containers 11239:302577 / 5860:38225,
    Role selector card / Show more (block 02e content), Incidents `Data` 395:17912, Advanced filtering 9644:388 / 9645:1949 (their own spec
    section), Requestor 2210:20269 / section header 5831:28923 (Requestor + Beneficiary section). Convert them to „main on the components
    page + instance in the screen” only when asked.
  - Builder helper TEXT nodes (run by id) were wrapped to 2400 wide and locked — `characters` unchanged, scripts unaffected.
  - Pinned column effect styles = the code (f95141c0): ring 0 0 0 1 @8 % + X ∓4 b6 s−2 @5 % + **X ∓10** b15 s−3 @10 % (was ∓4) — set in
    GEAP, eKYC, RAP (EVO-WEB), Cabinet. Docs section: demos cloned from gh-01s / s1 / s2 `Table · scroll`; a clone of a viewport that was
    FILL in its screen collapses to ~90 px inside a new HUG auto-layout frame → set FIXED + resize after cloning. Row focus = grey band
    (background/base/secondary-hover on the row's grid cells AND the pinned slot cells) + absolute `Focus ring · row` 2 px INSIDE stroke
    bound to blue-sky/500 (= code --focus-ring; no semantic focus variable exists in Foundations).

- 2026-10-24 · local-components-page-v2 (user approved the 3 follow-ups of v1). GEAP now has **0 mains outside 🧩 Local components**
  (page scan of every page). (1) In-screen mains → main on the page + instance in the exact place: FO `Header` 3521:12175 (renamed
  „FO header · mobile”, 102 instances), Incidents `Data` 395:17912 („Incidents · KPI row”), the two FO `Container`s 5860:38225 /
  11239:302577 → set „Service details · section header” 12695:542209 (Style Default / Context skeleton), `Public Services Sidebar`:
  11 of the 13 mains were byte-identical copy-paste duplicates with 0 instances → replaced by instances of 6495:73445 and deleted;
  6495:73445 + 6637:142749 → set „Public Services Sidebar” 12697:379509 (Menu My dossiers / New dossiers, 71 instances). Sets that
  were shown in spec areas → a „<set> · variants” frame of instances in their place: Role selector · card / Show more (02e frame
  9822:2798), advanced-filter/button + bar (9643:5281), Requestor + section header (2206:22477). (2) 23 per-state „Modal content /
  …” mains (+ their state variants) merged into ONE set `Modal content / Body` 12698:438587 (Spacing 0/16/24 × Height Hug/Fill, native
  SLOT `Content`): 26 hosts swapped (Services 18, User Management 3, Notification templates 2, Post-processes 1, FO 09 2 — the
  Selection-type ones via swapComponent), Modal set default + preferred values → Body / Document · details. (3) Tool docs / scripts
  that pointed at removed holders now point at the sections (form-designer fd-context / fd-topbar → 12645:8499, act-sheet,
  documents, copy-value, unsaved-review, instance-switcher READMEs; components.md). Every host (48 = 22 screens / spec frames + 26 modals) REST-rendered before / after:
  all pixel-identical. Tools: tools/figma/local-components/ (convert-main, place-in-section, set-to-instances, modal-content-swap).
  Lessons:
  - **Census by page walk is NOT stable either**: the same `findAllWithCriteria({types:["INSTANCE"]})` on User Management returned
    3 774 / 8 123 / 16 291 / 5 930 instances in different calls (lazy instance sublayers; the first scan of a page under-reports).
    The first Modal-content census said „0 uses” for everything and would have justified deleting used mains. Rule: a census that
    returns 0 must be confirmed by a SECOND independent signal (the host instance's `componentProperties` / `getMainComponentAsync`
    on a known nested id, getInstancesAsync, and REST renders) before any delete; name-filtered scans also miss renamed instances.
  - **Copy-pasting a screen that contains a main creates a NEW main** — that is where the 11 duplicate sidebars came from. Before
    moving a main family, diff them (texts + variant states of nested instances); identical ones become instances, not new variants.
  - **combineAsVariants collapses FILL-height variants** to their content (sidebar 1251 → 382) — set FIXED + resize right after,
    then check that the instances still FILL (they did: all 71 FILL, heights unchanged).
  - **A native SLOT clips by default**: the search field focus ring in the RAP selection modals was cut (3 008 px diff) until the
    slot's `clipsContent = false` in every Body variant; the Body itself carries the clip (Height=Fill only).
  - Overlapping GRID cells (the Requestor set has two variants in one cell) make `setGridChildPosition` throw on a new frame →
    rebuild that replacement frame with absolute positions (pre-existing overlap, reported).
  - Moving a SET out of a spec frame: copy its padding / spacing bindings onto the replacement frame, but drop the purple dashed
    set outline (raw colour, editor marker) and set `strokesIncludedInLayout = false` (an INSIDE stroke shifted the instances 1 px).
  - Coordination: the Registre agent was adding to „Modals, sheets & drawers” (its Drawer 12701:424075) and had moved Navigation
    to y −2304 → I never re-sorted a section; new items go in a bottom row (place-in-section.js), holes left by deleted mains were
    filled by moving only my own items, and only the x 0 sections are restacked.
  - Connectors into a main that becomes an instance: re-point them first (sidebar „Restrânge meniul” now starts on a Flow anchor
    12697:2116 over the collapse button). No Agent tool in this session → QA = the audit rules run in-call on the new sets / frames
    (left: logo vectors inside the sidebar main, fractional kpi-widget widths 364.5 inside the KPI row, the Requestor frame overlap —
    all pre-existing) + 48 pixel diffs.

- 2026-10-24 · users-board-flows-v1 (user on GEAP 10077:11646: „I don't see adding a new user and its states — add all flows; they're only
  in the previous version”). **The previous version was gone from the canvas**: the four „Central administrator / Administration / Users ·
  Roles · Authorities · Subdivisions” sections (6774:7368, 7037:74909, 7157:76903, 7187:49551) were deleted between versions
  2413800564698815195 (07:40 UTC) and 2413871332339189646 (12:19 UTC) today — the old → new map was read from REST
  `/v1/files/:key/nodes?ids=…&version=<id>&depth=2`. New page-level section **„Users · registry and new user (2026-10)” 12701:424244**
  (left of the profile section, flow order) with Band F 12701:424245 and 11 blocks: U01 12701:424251 registry · U02 12712:387232 ·
  U02a 12712:388324 · U02b 12712:389018 · U02c 12712:390513 · U02d 12712:391203 · U02e 12712:393192 · U02f 12712:394524 · U02g
  12712:395899 · U02h 12712:396780 · U02i 12720:393609; „00 · Start here · User Management” 12724:394205 (the page had none); index card
  „Users” → Start here, 46 blocks. New local components: **`Drawer` 12701:424075** (Title TEXT, native SLOT `Body`, exposed Cancel /
  Primary Large; Modals section) · **`Role combination card` 12701:424113** (Cards section) · `Empty state · boxed` + BOOLEAN `Show
  action#12701:4` + exposed `Action` (additive, hidden by default). Tools tools/figma/users-board/ (registry-pass.js, drawer-block.js,
  helpers.js; stored in root plugin data „figdesusr”/regpass, drawer, fit, label, arrow). Lessons:
  - **„Only in the previous version” can mean version history**: page census by text found nothing; REST page children per saved version
    showed when the old sections vanished — inventory them from that version instead of guessing.
  - **Code states without a demo state**: probe the real code path with page-side steps (scratch steps.mjs: click / fill / choose) and
    `capture-to-figma.mjs --state usr-01 --eval "<steps>"`; blocks link the PLANNED ids (usr-u01 …) and the gap goes to proto-engineer.
  - **Drawer blocks = spec → library instances in a Drawer SLOT**, not captures: one stored builder per block call, 1–2 blocks per call.
    The drawer height reads stale in the build call (always the empty 154) → separate FIT (HUG → read → max(1024, h)).
  - **FILL set on a child while its ancestors still HUG does not stick** (textareas / inputs stayed 384 / 282): re-apply FILL after the
    section is inside the slot. **Read Only text-input shows a nested 20/checkmark-small**, not the trailing swap property → swapComponent
    that node for other glyphs (calendar) and bind its colour.
  - **Registry capture fixes** (registry-pass.js): grid cells FIXED narrower than their tracks → white gaps in the header; cells FILL +
    whole-pixel tracks. Cells 50 high with a 1 px bottom stroke in layout → 1,089 children at .5 → strokesIncludedInLayout off. Clone
    blocks AFTER the whole-pixel / binding passes, or every clone needs them again (I had to re-run on 11 blocks).
  - Secondary button + plus glyph via the property rendered dark → copy the vector paint of a correct Secondary sibling („Schimbă”,
    icon/brand/on-secondary). No Agent tool → stored `ghs/audit` on all 11 blocks + 2 components: left = board baseline (gov-bar logo /
    text, table cut at the 1024 viewport = code, Onest 400 + 500 „mixed”, rows-per-page label).
- 2026-10-24 · users-board-flows-v1 follow-up (code 1acd9a20: usr-u01…u02i states exist, „Creează”, library „Adaugă utilizator”). Drawer
  main `Primary` label → „Creează utilizator nou” (10 instances inherit, 1 override fixed) + 4 texts / 1 arrow label on the page; the 11
  „Adaugă utilizator” buttons (library Primary Leading Small 32 · r6 · icon 16) → central „people-add, user-add” (b03a2607…, filled=on 1.5
  r2 = code icon-person-add, one person + plus; „people-add-2” was the wrong glyph). U01 re-checked against the live sandbox usr-u01: equal.
  - **A `Table / Pinned column` instance ABSOLUTE inside a GRID table stopped rendering its slot content** after later passes on the grid
    (the instance alone renders; in context only blank white) — the Ghișeu ones still render. Fix that held: move the pinned instance OUT
    of the GRID into the table's parent container, ABSOLUTE at the table's x / y. Check pinned columns with an inline `node.screenshot()`
    of the table container after every table pass — get_screenshot and the instance's own render hid it.
- 2026-10-24 · users-board-flows-v1, code d5422394 (new-user drawer in 2 steps). `Drawer` 12701:424075 upgraded in place (instances kept their
  Body content): `Title block` (Title + Subtitle, BOOLEAN Show subtitle), × ABSOLUTE MAX/MIN at 748/9 with header pR 64, `Stepper` = nested
  `Stepper · drawer` 10421:197819 (BOOLEAN Show stepper; Step 3/4 hidden per instance — it has no props, so it can't be exposed: set the
  nested Step instances' State / labels as overrides), footer `Step` text (Show step) + `Actions` FILL / MAX. Column now 16 blocks: new U02d0
  12814:420295, U02d1 12814:417417, U02d2 12814:418085, U02j 12814:421694, U02k 12814:423664; U02d / U02e–U02h reconfigured (step-2 frames
  keep only „Combinații de roluri”), all arrows redrawn (17 in the column + the page arrow), Start here 51 / index 51. Lessons:
  - **A step change = configure, don't rebuild**: one stored `conf` routine (props, nested stepper overrides, button labels, drop sections
    by name) + clones of an existing block for the new states took 6 calls for 14 frames.
  - `isExposedInstance` only works on instances that have properties or exposed children — a prop-less nested component (Stepper · drawer)
    stays a plain nested instance.
  - Before reconfiguring a column, delete its arrows + anchors and redraw from the stored `arrow` helper: anchors are absolute and go stale
    the moment a stepper / section shifts the content.
- 2026-10-24 · registre-board-v1 (code b5b89a83 + 81b33830). New page „↳ BO -> Registre" 12670:388301: 94 desktop blocks (BO only, no
  phones), 12 column sections (01 Catalog 12670:388303 · 02 Registru Dosare :388304 · 03 Acte :388305 · 04 Note :388306 · 05 Avize :388307 ·
  06 Record cards & journal :388308 · 07 Record actions :388309 · 08–12 Builder list / profile / editor / publish / deprecate-access-roles
  12670:388310, 12770:18702…18705 — the 44-state builder was split into 5 columns), 00 Start here 12670:388302 (title, contents with NODE links
  + block counts, 15 PO questions in Romanian), „Build assets" section with the base screen 12673:398541, index card 12850:423518 (Workplace
  group) + index meta line. 56 arrows (one connector each, start on the clicked control, end anchors inside the target block, blue pills).
  New local components (Forms & fields): `Field · choice chips` 12779:12771, `Field group header` 12803:399802, `Field picker · item`
  12850:41161; `Sidebar · BO (Registre)` 12673:12819 got `Role=Central admin + granted register` 12847:1826; `Pager · compact` 12698:384436.
  Tools: tools/figma/registre/ (README = pipeline; helpers in figma.root „reg"). Lessons:
  - **Captured CSS grids are poison for later swaps**: tracks come in as FIXED 1 / FIXED captured px, an instance inserted into a GRID
    parent loses its anchor (lands in the last row or on top of a sibling), HUG row tracks collapse FILL children. Convert every non-table
    grid to auto-layout FIRST (1-col → VERTICAL, one row of children → HORIZONTAL with the captured widths FIXED, multi-row → VERTICAL of
    HORIZONTAL rows, last child FILL), and when replacing inside a grid use setGridChildPosition(old anchors). Tables (Header / Table Cell)
    stay GRID; only round their tracks.
  - **Generic matchers need negative tests**: the „info note" rule ate the grey „Filtrare avansată" trigger (11 screens) and two-row detail
    cards; the dialog row rule ate the pager range; the journal „Numbered List → timeline" rule ate the filter rule builder and the
    breadcrumbs; an input rule using findOne() replaced a whole editor overlay with one input. Rules now require: icon box ≤ 32 + text > 24
    chars (notes), a stroke / grey card parent (dialog rows), a date in the first item (timelines), DIRECT children (inputs). After every new
    rule screenshot 2 screens of another kind before running it on a batch.
  - Captures keep hidden template text (`display:none` copy-value / tags / „Inline message"): collect texts with `absoluteRenderBounds`
    only, else notes / switch descriptions get junk („C-2026-004771 Persoană fizică …").
  - Reading `.findOne` on a TEXT / `cornerRadius >= n` on a mixed radius THROWS in the plugin runtime (not undefined) — guard by type and
    `typeof … === "number"`. A thrown pass rolls back the whole call (and its root plugin-data writes).
  - SF Mono (rule-builder keyword tokens) is not available in Figma: appendChild of a capture fails with „unloaded font" → swap Mono runs to
    Roboto Mono before moving the capture.
  - Drawers: after swaps the body outgrows the captured 900 → HUG the body + dialog and grow the screen Body.minHeight + overlay by the
    difference (stored `drawerfit`), never leave the drawer clipped.
  - Header buttons with icons: label → glyph (Istoric → 24/history, Configurează → 20/settings, Deschide → 20/page-text) resized to the
    size's icon slot (Small = 16); light-blue fill = Secondary. Editor row actions = button-text-rectangular Strict / Destructive Icon=Only
    (ghost) — there is no ghost in button-filled-rectangular.
  - Icon picker / pictogram tiles: the code's names are in data/registre.json (admin.icons) — map each to the Foundations glyph; `24/…`
    glyphs work in the 16 slot after resize; a local node id that is not a COMPONENT throws „Value for instance swap … invalid".
  - Grey info boxes in code = svc/info-note (not Message Info); the profile notice rule skips Neutral fills now.
  - Polish at the end (stored `polish`): bind scrims to background/alpha/overlay-dark, drop ~0-opacity fills, and fix ±0.5 centring by
    growing the FIXED parent 1 px (65 → 6 fractional on a sample). Board census after polish: 0 raw svg icons, 0 no-text-style, 0 foreign
    fonts (Roboto Mono only in rule tokens), raw controls = 2 „și ⌄" rule-combinator tokens (mono keyword exception), 13 zero-height table
    shadow helpers flagged as not-auto-layout (pinned column decor), 37 fractional nodes left (numbers centred in 16 px boxes).
- 2026-10-24 · registre-board-v1 follow-up (user: sidebar icons, inner shadows, tab hairline, table separators). Done: sidebar icons from
  the code's masks (css/registre.css + assets/icons, read live via computed `::before` mask-image — the shell draws nav icons as CSS masks
  per data-nav-id / data-nav-object, NOT from data/e-permits-roles.json): Toate registrele + Administrare › Registre = central „books,
  library" outline (component a593fc5643b31ddf45ed4806e53c08e9a15c7727, set d2bb5bfd7f370e3cc6d444834f7a33da20c5a1f6); Registru Dosare 24/document
  ec541f6e…; Acte permisive 24/permission 78e2e45d…; Note / Plăți 24/receipt-bill 11725aa8…; Avize + specialist „Acte permisive" 24/stamp
  e6f92697…; Dosare noi 24/page-add 9f3bb37c… (also in `Sidebar · Desk clerk (Ghișeu)` 11595:241745); Fluxuri 20/tree; Sarcinile mele
  20/checklist; specialist folders = central folder-shared / folder-delete / folder-download / printer, print. Foundations glyphs in
  sidebar-list-item need fills = icon/base/default + strokes [] (the old central override cleared fills → invisible icons). Screen
  instances whose item was set Active kept the OLD icon as an instance override → re-swap per screen after changing the component.
  35 inner-shadow dividers → bottom strokes (stored `insetdiv`, now first in `post`); 72 tab strips got the 1 px border/base/default bottom
  hairline (the capture drew it as a background gradient that the profile pass deleted — never delete a gradient without adding the line).
  - **Cause of the missing table separators**: the `polish` centring-parity step grew in-grid Table / Header Cells by 1 px (51 in a 50 row
    track) — the INSIDE bottom stroke then sits under the next row's white fill. Never resize GRID children; fix parity on the track.
    Fix = resize every in-grid cell to its row-track height. `Table / Pinned column` (12619:61500, start No shadow + end Shadow, cells moved
    into the slot, Sticky placeholders left) applied to 14 of 35 register tables before the MCP session expired.

- 2026-10-24 · gh-verificare-spacing-figma (code 2035ab7e gh-verificare-spacing-v1; user on GEAP 11801:30527 „too much space — see the FO
  full flow”). GEAP Ghișeu: 17 Verificare blocks (gh-07, 07j, 07a, 07a1, 07a2, 07a3, 07b, 07c, 07d, 07e, 07f, 07g, 07g1, 07h, 07i, gh-13,
  13a) + Confirmare gh-10 / 10b. Verificare: review `Container` pT 24 → 0 (H1 → first heading = the Header's own 24), pB spacing-32;
  Atașamente docs box pB 32 → 0; „Cererea pe hârtie” / „Semnarea cererii” `Section`s (or gh-07f's info-note) moved INTO the review
  (gap 32); their headings = 48 fixed, centre, 0 / 12 padding (spacing-12), divider stroke removed, H5 text style; the sign explanation
  `Paragraph` moved into the content box as item 1 (0 / 12 inset); content boxes padding 0, gap spacing-8 (a FIXED 100 retry box in
  07g / 07g1 → HUG); gh-07e notices box pT 0 / pB spacing-24; gh-07f `Footer:margin` pT 0; doc cards minHeight 70 (= code; the
  `Document · card` main is 68 — left, FO uses it too). Confirmare: new `Review` frame (gap / pB spacing-32) around the two sections,
  their pB 16 → 0, headings FILL + 12 inset + H5; gh-10b error message in a `Notices` frame (pB spacing-24). Offsets vs code probe
  (scratch probe of `.e-permits-gh__review` children): identical on 07 / 07j / 07a* / 07b / 07e / 07f / 07g1 / 07i / 13 / 13a / 10 / 10b;
  known deltas: 07c / 07a3 paper card 70 vs code 88 (code meta wraps to 2 lines), 07h / 07d olograf field 138 vs 137, 07d inline
  error 8 under the MSign row vs code 16. Screens: Verificare Δ −58…−126 → `Body.minHeight -= Δ` AND the FIXED `Dialog` resized by
  the screen delta (Overlay stretches, the Dialog does not → it rode up to y −92 on the first try); gh-10b grew +58 (its 900 screen
  clipped the footer). Columns 07 / 10 / 11 restacked at 240, sections refit (+80); 22 connectors attached (the 2 dangling GH-11
  ones were dangling before). Lessons:
  - **Ghișeu full-screen request windows: `Dialog` is FIXED inside an ABSOLUTE/STRETCH Overlay** — after any content height change
    move Body.minHeight AND resize the Dialog by the same screen delta; check `dlg.y` is back at 22 (24 for 900 screens).
  - **Zeroing padding does not shrink a box that was FIXED** — after a padding pass census `layoutSizingVertical === "FIXED"` in the
    touched boxes and HUG them (the retry box kept 100 with its message centred).
  - **A content-grow on a 900 screen clips silently** — screenshot every 1104 block after adding gaps; fit = Body.minHeight + need,
    Dialog + need (need = inner content − FILL container height).
  - Moving a node keeps its id → connectors on moved buttons (Generează, Semnează prin MSign, Adaugă fișier) stayed attached; no
    re-pointing needed when restructuring by reparenting instead of rebuilding.
  - No Agent tool in this session → stored `ghs/audit` on 8 forms: only the section-over-card gap 0 baseline + field label gap 6;
    bound gh-07d's olograf box padding to spacing-20. Ghișeu intro (11818:22458) dated.
- 2026-10-24 · registre-board-v1 follow-up 2. (1) Table separators restored: 2 999 in-grid cells resized back to their row-track height
  (stored `cellh`, batches of ~8 tables; one call for all 42 tables dropped the transport and rolled back); `polish` no longer touches
  children of GRID cells. (2) `Table / Pinned column` (start No shadow + end Shadow) on all 35 register tables (stored `pinned`).
  (3) **`sidebar-list-item` was refactored meanwhile** (6347:28130: `Icon` = Glyph mask + „Icon colour” rect, icon chosen by the
  INSTANCE_SWAP prop `🔄 Icon#12863:0`) — that wiped my nested glyph swaps (all items showed folder-paper). Set sidebar icons ONLY via
  the `🔄 Icon` property (colour comes from the mask, never touch glyph fills); then re-sync screen instances whose prop was overridden
  (stored `sidesync`, 90 items). Label → icon map stored in figma.root „reg"/„sideicons". (4) Open filter box (02b / 03c / 04b): the
  toolbar line moves under the box — added the 1 px bottom stroke on the box. (5) Entry notes on link-opened blocks (a05b, a10d, a12b,
  14, 14a, 06d, a03e) instead of arrows. Border census per column after the fixes: 0 inner shadows, 0 tab strips without the hairline,
  0 table cells without a divider (last rows of card tables excluded), all register tables pinned.

- 2026-10-24 · inner-shadow-sweep-v2 (all 5 files, Registre page excluded — other agent). User: „again this inner shadow — remove ALL”.
  Counts (shallow before → after 0 everywhere; local effect styles with INNER_SHADOW: none in any file):
  GEAP 2.0 ≈ 400 hits: Local components 148 (6 mains: instance switcher BO Selected / Selected hover = brand ring + same stroke →
  one 2 px stroke; document-icon vectors ×3 gloss #fff@40 removed; Form Builder `.menu-item-selection` Focus 8715:79266 ring s2 →
  INSIDE stroke 2 on its own colour var — this detached a remote effect style), Patterns 10 (remote `.upload-icon` gloss → overrides),
  Post-processes 15 (`.role-switch-item` gloss, remote style detached), Dossiers 51 / Ghișeu 82 / Services 81 / Full Flows 64 /
  Requestor 14 / Workplace 2 / App Shell 4 / Drafts 12 → mostly instances of the fixed mains; plain captured chips: 12 Services + 3
  Ghișeu rings → INSIDE stroke (border/base/default ×10, border/brand/secondary ×5), 6 Drafts merged. EVO Cabinet 9 (2 mains merged,
  6 gloss). FOD 6 + 84 hidden overrides in instances of remote mains. eKYC 104 captured rings #d9d9d9 → INSIDE stroke base/default.
  EVO-WEB (RAP) ≈ 740: Safari-mockup toolbars 42 hairline dividers (0/−0.5 #000@5) → bottom stroke 1 base/default; traffic lights,
  device bevels, icon gloss → removed. Ghișeu toolbars: 115/116 keep their bottom stroke (the 1 without = filter box below, by design).
  Lessons:
  - **Colour match tie**: border/disabled/default = #d9d9d9 = border/base/default — rank base/default first (8 strokes rebound).
  - **Merging a ring into an existing stroke grows HUG boxes** (sil true: 56 → 58). Keep the box: stroke out of layout, HUG axis →
    FIXED at the old size, weight rebound to the `border-width/border-2` sibling variable. Now in the tool.
  - `strokesIncludedInLayout` throws on non-auto-layout frames → guard `layoutMode !== "NONE"` (the first big apply rolled back).
  - Big pages (Ghișeu, Dossiers) time out with `skipInvisibleInstanceChildren = false` + findAll → sweep with `true`, then catch hidden
    sublayers through `mainComponent.getInstancesAsync()` of every REMOTE main that still contains an INNER_SHADOW (overrides).
    Instances nested inside remote mains are read-only — skip them (library fix, not ours).
  - „transport dropped / session expired” on a write call usually means it still ran: always recount before re-running.
  - Libraries still carry inner shadows in their mains (document-icon, file-item, `.upload-icon`, Safari toolbar) — our files
    override them; the library owner should fix the mains (open question).
  - Scripts: NO_INNER_SHADOW block (guarded `globalThis`, markers) synced into tokenize.js, swap-to-instances.js,
    swap-builder-address.js, ghiseu/swap-ghiseu.js, swap-workplace-registry.js, users-board/registry-pass.js by
    tools/figma/quality-sweep/sync-no-inner-shadow.py; instance-switcher/build-items.js now draws the BO selected ring as a 2 px stroke.

- 2026-10-24 · sidebar-active-icon-v1 (user on GEAP 11595:321763: Ghișeu „Dosare noi” active = blue label, BLACK icon; „all active items
  blue icons; test the sidebar components, then switch properties”). Cause: the local `sidebar-list-item` set **6347:28130** coloured the
  Active icon with a STROKE override (border/brand/default) on the glyph's `vector` → every swapped Foundations FILL glyph (24/page-add,
  24/document, 20/coins …) stayed dark (117 Active items), and its `🔄 Icon#12863:0` / `📍 Leading Icon#797:3` props were bound to nothing.
  Fix = **masked icon slot** (the code does the same: `.sidebar__icon` is a CSS mask, `color` = icon/base/default, active = icon/brand/default):
  `Icon` (20, no auto-layout, visible ← Leading Icon) › `Glyph` (20, auto-layout, **isMask ALPHA**, glyph FILL × FILL, mainComponent ← Icon prop)
  + `Icon colour` rect (STRETCH) bound to icon/base/default (Default, Hover) / icon/brand/default (Active, Foundations lk-e9e8 bc354272…).
  Any glyph — stroke (central) or fill (Foundations), 20 or 24 — takes the state colour, also after a State switch; QA rule
  `nav-active-icon-colour` added to tools/ui-qa/figma-audit.js. 6 900 items: Active 621 brand / Default+Hover 6 279 base; 37 leftover brand
  glyph overrides reset (Tariffs 23, Advanced filtering 10, Workplace 3, Dossiers 1). eKYC uses the published library item (66c046a8, its
  Active already brand on all 265 items), Cabinet / FOD have no BO sidebar → nothing to change there. Lessons:
  - **isMask on a swappable instance is lost on swap** → put the mask on a wrapper FRAME around the glyph, never on the glyph itself.
  - **Binding an instance-swap property to a layer that instances had already swapped is DANGEROUS**: each instance holds TWO values — the
    old swap override and a stale stored property value (here folder-paper stroke=2, 6364:46765, left by whoever added the property) — and
    the bound property wins. Binding flipped ~800 items to the folder glyph (Registre set when first read, the 332 sidebar-public-services
    central glyphs in the next read); unbinding flips them back only partly. Recovery that worked: unbind → record every item's glyph into
    root shared plugin data (chunks of 1 500) → bind → for items now showing folder-paper set the recorded glyph with `setProperties`
    (mains first, then nested `I…` ids) → census label → glyph until every label shows one glyph family. **Before binding a swap property
    on a main with instances: record every instance's current glyph first, then re-assert it with setProperties after binding.**
  - A fresh instance swapped through the property takes the new glyph's native size (24 in a 20 slot) → the Glyph wrapper is auto-layout
    with the glyph FILL × FILL, so any swap lands at 20.
  - REST `/files/:key/nodes?version=` can be rate-limited for ~38 h (`retry-after: 136412`, tier „low”) — never count on version history
    as the undo; record state in plugin data before risky main edits. getInstancesAsync / page walks over 6 900 nested items drop the
    transport on the big pages (Registre, Services) → census through `variant.getInstancesAsync()` only, one call per question.
