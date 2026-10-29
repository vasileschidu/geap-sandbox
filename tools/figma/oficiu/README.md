# Ex officio initiation board (oficiu-board-v1, 2026-10-26)

GEAP 2.0 page „↳ BO -> Ex officio initiation” **13377:576825** (after Distribution policy). Sections: 00 Start here 13377:576826 ·
01 Drafts list :576827 · 02 Act search :576828 · 03 Holder data :576829 · 04 Service details :576830 · 05 Required documents :576831 ·
06 Review :576832 · 07 Delivery :576833 · 08 Submission :576834 · 09 Drafts :576835 · Build assets :576836 (base screen :576837).
Index card „Card · Ex officio initiation” 13562:636588 on 📍 Start here · Index (Cards row, after Ghișeu).

## Pipeline (all routines stored in figma.root shared plugin data, namespace „ofc”)
1. `cap.sh "<state> <captureId> [nofit]"` (PAR=1; dialogs / header menus nofit). `shot.mjs` = prototype PNGs for comparison.
2. `ofc/run(STATES, OVR)` → `ofc/intake` → `ofc/compose` (cal/compose with this page's ids; Specialist sidebar, active
   „Dosare inițiate din oficiu”, Configurare hidden, Acte permisive hidden; sheet layers → ghs/swap).
3. `ofc/post([id])` ONE screen per call (MCP drops on longer calls). Sheet screens: bg (page behind = clean ofc-01 page) →
   idcard → actrows → libpass → copyfix → reg/toast → ghs/post → reg/polish → ofc/par. List screens: reg/post → rowfix → polish → par.
4. After post: `ofc/fitmeta` (separate call — act-row meta truncation needs fresh layout), `ofc/emptyfix`, `ofc/trash`
   (lone grey trash = Ghișeu button), `ofc/filterfix` („Filtrare” filter chip), `ofc/tabtrack`, `ofc/fieldfix`
   (raw date fields → date-input, raw segmented → segmented-control lk-03f6 11607:3787).
5. `ofc/build(STATES)` (cfg = `ofc/cfg` = blocks.config.json + 2 note edits), `ofc/arrows(LIST)` (= reg/arrows).

## State when stopped (2nd stop, Figma MCP seat call limit again)
- Done: fieldfix (date-input + segmented-control) on all 11 screens; base screen trigger → „Filtrare” chip; 06a „Descarcă” = export
  glyph (white, = label); 02a / 08d searches Filled; columns restacked (no drift); new `ofc/tafix` (raw textarea → library text-area)
  on 04, 04f, 04a, 04e, 06b, 09a–d + error state set by hand on 04a (2) / 06b (1) — tafix misses errors placed outside the field box.
- Gate audit: columns 01–02 = 0 majors; 03–04 = only minors (03 scrim 13379:1130 unbound → bind to overlay-dark 75e94de0…,
  03 fractional 13379:1142 → round, 04d upload box padding 20.5 → stroke parity, tight-gap 7 = captured spacing).
- TODO: those minors; gate audit columns 05–09; tools/ui-qa/figma-audit.js on the page; fix majors.

## oficiu-spec-fixes (2026-10-29, Feature 95769 spec audit)
- Notes / AC refs / PO flags = blocks.config.json (= stored `ofc/cfg`); re-run `ofc/build(LIST)` after edits. 66 blocks.
- New sections: 10 No rights 13818:18492 · 11 Removal warning 13818:18493 · 12 Audit journal 13818:18494; Build assets moved to x 25920.
- New blocks: 01j 13837:32987 · 01k :33001 · 02h :33015 · 02i :33029 · 02j :33043 · 02k :33057 · 02l :33071 · 06c :33085 · 06d :33099 ·
  08g :33113 · 08h :33127 · 09g :33141 · 09h :33155 · 10a :33169 · 11 :33183 · 11a :33197 · 12 :33211. 06 screen recaptured (Atașat Da/Nu).
- act pick = oficiu-v3 (confirm dialog «Inițiezi …?»): no act-search footer, no Salvează schița on the act search.
- `ofc/trash` now uses ref 13525:626685 (the old ref lived on another page).
