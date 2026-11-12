# US-326 · Clone settings from a service (svc-clone-figma-v1, 2026-11-12)

Azure US-326 (96686) „Clonarea setărilor unui serviciu la adăugarea lui din RSSP”. Code: js/service-clone.js, css/service-clone.css,
components.md „Service clone table”, demo states svc-cl-01…09 (+ srv-01 list). Desktop 1440 only (AdminPortal, the Services board has
no phone blocks).

GEAP 2.0 `aHgwVwiNCOSOqbMhMjjUOj`, page „↳ BO -> Services / Service passport” **442:17492**.
Arrows: srv-01 „Adaugă serviciu” → 01, 01 select → 02, 01 „Continuă” → 03, 03 „Adaugă serviciu” → 07 (Flow anchors 10438:120705 over
the controls, connector clones of 14056:12644, RIGHT → RIGHT in the 280 gutter). Start here line 15681:290984 · index line 15681:290986.

Section **`US-326 · Clone settings from a service` 15667:148837** (x 55360, y −14154, after „05a · Required documents”), 1800 wide,
band at 80/80, blocks from y 440, 240 apart (flow order). Staging `Build assets · US-326` 15667:148838 was deleted at the end — recreate one for new captures.

| Block | id | Screen | Shows |
|---|---|---|---|
| srv-01 | 15678:213801 | 15671:161909 | Services list: „Adaugă serviciu” primary + „Sincronizare” secondary |
| svc-cl-01 | 15678:213815 | 15671:163820 | drawer step 1, Modul creării = clonare (GEAP `Drawer` 12701:424075 + Stepper · drawer) |
| svc-cl-02 | 15678:213829 | 15678:211259 | „Serviciul de clonat” open: `Dropdown / Search row` + new `Dropdown / Option · code` |
| svc-cl-06 | 15678:213843 | 15675:156194 | required error on „Serviciul de clonat” (select Destructive) |
| svc-cl-08 | 15678:213857 | 15675:157171 | RSSP code exists: Message · subtle Warning (bold lead) + „Resincronizează serviciul” (EVO 20/refresh) |
| svc-cl-09 | 15678:213871 | 15675:158176 | RSSP import fails: Message · subtle Error |
| svc-cl-03 | 15681:290936 | 15678:213891 | step 2 settings table, nothing ticked (drawer 960 = drawer--lg) |
| svc-cl-04 | 15689:227217 | 15689:171697 | step 2, Setări partly ticked (Indeterminate), Solicitant și act expanded, RSSP rows Disabled; screen = drawer 1724 |
| svc-cl-05 | 15689:227759 | 15689:173389 | step 2, request type without a pair: warning + 17 Disabled rows with reasons; screen = drawer 1656 |
| svc-cl-07 | 15681:290950 | 15681:155130 | new passport (Nepublicat) + success toast (w/ Heading) — hugs 2180, all sections refilled |

New local component: **`Dropdown / Option · code` 15678:211258** (🧩 Local components › Menus & tooltips; State Default / Hover;
TEXT Code / Name / Meta, BOOLEAN Show meta) = code `.e-permits-fo-caem__option` with the `meta` line.

## Pipeline used (per state)
1. `generate_figma_design { nodeId: 15667:148838 }` → `SETTLE=3000 bash tools/figma/registre/cap.sh "<state> <cid>"` (menus: capture-to-figma
   `--keep-focus --selector ".e-permits-fo-caem__menu:not([hidden])"`). Captures land at PAGE level as `cap · <state>`.
2. Move caps into the staging section, delete `Sticky placeholder – Container`, then stored `reg`/`compose`
   (`{ title/active: "Configurări servicii" }, { page: "442:17492", hold: "15667:148838" }`) → `reg`/`post` ONE screen per call
   (two in one call drop the MCP transport).
3. Drawers: swap the captured tree toggles („Button - Desfă …”) BEFORE `lgt`/`drawer` (inside the Drawer slot `insertChild` gets −1);
   step 2 = resize the Drawer to 960, x = W − 960. Then `vfit`/`fit` (screen 900, clip).
4. Step-1 fixes: placeholder fields → State Default; select hint = its own Assistive Text (the captured Paragraph removed);
   „Heading 3” → svc/section-heading 9521:7915 (Show tag off, padding L/R 0); radio row padding 12/16, gap 40 (= code option rows).
   06 / 08 / 09 / 02 are clones of the 01 screen with field / notice / footer changes (no capture).

## Audit (2026-11-12, file figma-audit rules on the 8 blocks)
Fixed: 126 raw row buttons („Sincronizare din RSSP” / „Actualizare configurație”) → button-filled-rectangular Neutral Icon=Only
Small + EVO 20/refresh / 20/edit. Tokens: bind-spacing-tokens apply (stamp 20261112svcl) — only the 4 px screen borders off-scale.
Left (minor): fractional sizes in the captured list table; „Button - Taburile următoare” (tab scroll arrow, svc-cl-07).

## Leftovers (not drawn — budget)
- svc-cl-07: below the fold the passport sections lost their headings / row labels in `reg`/post (cut by the 900 viewport now);
  re-capture with the passport chain or transplant the sections from Services 01 block 9579:18162 before showing it full height.
- svc-cl-02: the select in State=Focus shows „Alege serviciul” dark (code: grey placeholder + chevron up).
- Tree toggles = button-text-rectangular Strict Icon=Only Small with the 20/chevron-right swapped into the inner icon (Small expects 16).
- **svc-cl-04** (some ticked, partial group, expanded) and **svc-cl-05** (types without a pair: disabled rows + reasons + warning):
  capture with the same chain as svc-cl-03 (`cap.sh`, compose, post, toggles, `lgt`/drawer, 960, vfit). The expanded rows need
  indeterminate group checkboxes (library checkbox) and locked rows = checkbox Disabled + „Din RSSP” in Observație.
- Clone table rows are captured frames with library checkboxes / text buttons — a `Service clone · row` local component (Level 1–3 ×
  Group / Leaf × Default / Locked) would make 04 / 05 cheaper.
- The old Services list blocks in „Permits Table -> Filter Interaction Logic” 1157:30135 (1920 wide, 01 / 01a / 02 / 03) still show the
  previous toolbar; srv-01 in this section is the current one.

## v2 (2026-11-12, svc-clone-figma-v2)
- 04 / 05 captured (cap.sh) → reg/compose → reg/post → stored `svcl`/`rows` (toggles → button-text Strict Only Small with `🔄 Leading Icon: 16` = 16/chevron-right / 16/chevron-bottom; checkbox Mode / State by label from a CDP probe) → lgt/drawer → 960 → `svcl`/`table` + `svcl`/`rowh` (GRID rows HUG, equal cell heights, label widths) → screen = drawer height.
- 03 toggles now 16 glyphs; 02 select placeholder = text/base/tertiary + 20/chevron-top; 07: rows / section headers refilled by props, Header status component for „3 modificări nepublicate”, tabs scroll arrow = button-filled-rectangular Neutral Only Small + 16/chevron-right, tabs track stroke.
- Arrows: 03 „Setări” checkbox → 04 (anchor 15689:237416), 04 „Adaugă serviciu” → 07 (anchor 15689:237417, was from 03), 01 „Continuă” → 05. Native annotations on all 10 blocks (AC numbers), notes end with AC refs.
- Audit (uiqa/auditfile1112 = tools/ui-qa/figma-audit.js): left minor — fractional / fixed-width in captured list tables, 3 header meta separators ABSOLUTE (07), Heading 2 padding 11 (07, captured), tabs overflow cut (intended scroll).

## Radio alignment (radio-align-v1, 2026-11-12)
In the drawer „Modul creării” the radio circle's left edge now equals the field label's left edge; the hover band extends 16 outside the content box (negative inline margin, library-wide for `.e-permits-fo-radio--option`). In Figma set the radio row padding 0 on the sides (band, if drawn, sits outside); vertical rhythm label → 8 → options unchanged.
