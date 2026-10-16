# dropdown-effect

Every dropdown-like surface (menu, ⋮ row menu, dropdown, popover, listbox, picker, selection / contextual menu,
instance-switcher menu, facet popover) = effect style **dropdown-effect** + **clip content on** + radius bound to a
Foundations radius token + **no border stroke** (the effect's 0 0 0 1 @8 % ring is the border). Reference: GEAP 2.0
9632:3226 „Field picker”. Code: `.e-permits-fo-intent-menu` / `.e-permits-shell__profile-menu` box-shadow.

- `dropdown-effect.js` — run as `use_figma` code; OPT.mode `dry` (census) → `apply` (snapshot + fix) → `revert`.
  Style per file: GEAP local `S:fc1dad56…,`; eKYC local copy `S:2c6b167d…,`; FOD + EVO Cabinet use GEAP's style by id
  `S:fc1dad56be71b69894b7f3586befb682c9a2f5fc,5088:9` (OPT.styleId — it is unpublished, so importStyleByKeyAsync fails, but the
  id resolves because copied nodes brought it in).
- `snapshot-20261016.json` — compact copy of the 2026-10-16 snapshot (full rows in page shared plugin data
  `geapqa / dropfx-20261016` in each file).
- Audit: `tools/ui-qa/figma-audit.js` rule `dropdown-effect`.
