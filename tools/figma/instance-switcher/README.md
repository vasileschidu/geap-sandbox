# Instance switcher — Figma builders (2026-10-15)

Code: `.e-permits-fo-auth__avatar` + `.e-permits-fo-avatar-menu` (FO / Cabinet EVO), `.e-permits-shell__user-trigger` +
`.e-permits-shell__profile-menu` (BO); spec in `.claude/skills/components.md` „Header instance switcher — open state + alignment”;
demo states `fo-01s`, `sm-01s`, `auth-05`. `menu-dom.mjs <state> [width]` dumps the rendered trigger + menu (boxes, paddings,
gaps, fonts, colours) — measure with it before changing anything.

Every builder is library-only (components, variables, text / effect styles, icons imported BY KEY), so the same code runs in
GEAP 2.0, FOD and EVO Cabinet. Run in a `use_figma` call as `CFG` + `prelude.js` + `compose.js` + one script (or store
prelude + compose once in `figma.root` shared plugin data `isw/lib` and run with
`new AsyncFunction("CFG", lib + "\n" + script)(CFG)`; clear the stored code at the end — scripts live in the repo only).

| Script | What |
|---|---|
| `prelude.js` | keys, variable / style / set import, paint / pad / gap / radius / stroke / text / avatar helpers, holder frame |
| `compose.js` | slot content: `composeFO(slot, spec)`, `composeBO(slot, spec)`, item builders, `FO_DEFAULT`, `BO_DEFAULT` |
| `build-items.js` | „Instance switcher · menu · profile” (Context FO/BO), „… · role” (Context × State Default/Hover/Selected/Selected hover), „… · more” (Expanded × State) |
| `build-switcher.js` | „Instance switcher · menu” (native SLOT „Content”) + „Instance switcher” set (Context FO/BO × Type Desktop/Mobile × State Default/Hover/Open; Open carries the exposed menu at the code geometry) |
| `swap-old-triggers.js` | GEAP: old `.role-switch-item/general` instances → new set (snapshot `isw/snap-<pageId>`) |
| `swap-raw-triggers.js` | captured raw BO `shell__user-trigger` frames → BO instances (connectors moved) |
| `swap-fod.js` | files consuming GEAP's published `.temp`: nested trigger swapped per instance (no reset!), headers raised |
| `swap-generic.js` | any FO file: old trigger instances (direct + nested) + mobile 32px header avatars → switcher (snapshot `isw/snap-generic-<pageId>`) |
| `fill-open-menus.js` | open screens: State=Open, slot composed from a spec, raw captured menu removed (connectors re-pointed), header branch unclipped / raised, screen grown if the menu would be cut; mobile = clone of the closed page of the same step + switcher over the header avatar |

Component ids — GEAP (🧩 Local components, frame 11532:7841): set 11536:8013, menu 11535:6128, profile 11532:7890,
role 11532:8016, more 11532:8125. FOD (Requestor page, 838:10517): set 839:11429, menu 839:10597, profile 838:10575,
role 838:10701, more 838:10810. EVO Cabinet (My requests, 1014:4587): set 1014:7391, menu 1014:6580, profile 1014:5700,
role 1014:5826, more 1014:5935.
