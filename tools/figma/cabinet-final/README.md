# EVO Cabinet: final pass for „Actele mele” + „Solicitările mele” (hand-off job #5)

File: EVO Cabinet `iitScYOwMYjDayuyrm3750`. Page ↳ My Permits `444:9934` (pp blocks), ↳ My Requests `10:19047` (sm blocks).
Work list: `audit-2026-10-26.md` (M1–M6, F1–F7; C1–C4 are code questions). Menus + open triggers are already done (open-menu-anchor-v1).
G1 (avatar colour) is skipped until the user decides.

## Status (2026-10-26, third run — DONE except the items under „Open”)
- Done by the first run (verified read-only): M1 act profiles (10 blocks, new section order + Istoric), M4 Istoric on all 22 request
  profiles + sm-act-04, M2 pp-01m (6 MDocs pages), M3 pp-01x / pp-01y as profile states, new pp-01d, pp-03x, sm-05y, sm-06, sm-06a,
  4 skeletons, pp-01n, pp-01z, sm-05f, sm-05g, mdoc-13, mdoc-14, menu blocks sm-01s, pp-01b, pp-01c; F1, F3, F4, F5, F6.
- Third run: sm-05e `1443:4656` (Date solicitare tab with documents, first card Hover = sm-05e1), mdoc-16 `1443:67424` (draft
  Date solicitare, one uploaded document); C1 wording (row menus sm-01u / 01w „Profilul actului” + external-link icon, Act tab
  sm-05l / 05p „Profilul actului ↗”, „Descarcă decizia” on sm-05m / 05q / 05r / mdoc-14, notes); columns 02 + 06 restacked;
  Start here 1138:3261 + COVER counts.
- Follow-up: sm-01l `1445:4488` (library selection-menu 1a95fd16… with item padding / gap / radius overridden to the dropdown
  spec, 270×142, right edge on the „10” trigger, 6 above, trigger State Focus; phone = plain list, no size menu); sm-05f / sm-05g
  backgrounds = the Izvoraș request (Main of sm-05e). My Requests = 69 blocks.
- Covered by existing blocks (no new block): mdoc-11 = sm-05f, mdoc-12 = sm-05g / sm-05h, mdoc-15 = pp-01m; sm-hdr-* and sm-08*.
- Open: the selected size check stays 24 (library icon size locked; code 20; row kept at 32 with padding 4). 
  „Profilul actului” icon is TRAILING (set 1054:134 props Leading icon / Trailing icon / Trailing icon · glyph, 2026-10-26) = code. Pager ✓ 24 in both. Minor states not drawn: audit „Minor variants” list.

## Stored routines (figma.root shared plugin data in the Cabinet file)
| key | source | what it does |
|---|---|---|
| `cfin`/`vars`, `cfin`/`tl` | (written by the earlier run) | variable ids by name; `tl.set` = the timeline event set (Status=Success/Danger/Pending/Upcoming) |
| `cfin`/`body` | `body.js` (store: `prep/store-body.js`) | rebuilds a profile screen's `Panel` sections (`Section · …`) from a spec: rows → `svc` row set 1058:429, Beneficiar → cloned Beneficiary instance, Istoric → timeline card (p20, gap 6) |
| `cfin`/`clone` | `clone.js` | clones a block (label, ID, title, note, Prototype ↗) |
| `cfin`/`viewer-build` | `viewer.js` (store: `prep/store-viewer.js`) | document-viewer block on a cloned profile block (1440×900 + 375×812, clipped), MDocs pages in the viewer content slot, optional watermark |
| `mdport`/`build`, `mdport`/`map` | `port-build.js`, `port-dump.js` (`prep/store-build.js`, `prep/dump-call.js`) | the MDocs set copied from GEAP into Cabinet; `map` = GEAP id → Cabinet id (`cab:page` = A4 page set) |
| `mdocs`/`fill`, `mdocs`/`local` | `mdocs-fill.js` (`prep/store-fill.js`) | fills an MDocs page instance from a DOM module spec |

## Prepared inputs (`prep/`)
- `probe.mjs` (CDP, cabinet `cdp.mjs`) → `acts.json` / `reqs.json`: profile sections per state × 1440 / 375. `../spec.py` turns them into body specs.
- `map.json`: act-profile screens (desktop, phone) per block; `reqmap.json`: request-profile screens for the Istoric insert.
- `call-act-0…4.js`: ready `use_figma` bodies for M1 (one per batch; `mode: replace`, sections Ce permite actul → Detalii act →
  Autoritatea emitentă → Beneficiar → Istoric). `req-0…4.json` / `reqspecs.json`: Istoric timeline per request screen (M4,
  `mode: insertAfter`, `after: "Date generale"`).
- `docspec.mjs` + `ctxspec.js` → `docs.json`: MDocs module specs + dialog geometry per viewer state. `v-*.js`: ready viewer-block
  calls for mdoc-13, mdoc-14, pp-01n, pp-01z, sm-05f, sm-05g (still to write: mdoc-11, 12, 15, 16, sm-05e, sm-05h, pp-01m redraw).
- `skel.mjs` → `skel.json`: skeleton geometry for pp-01-loading, pp-03-loading, sm-01-loading, sm-05-loading.
- `menus.json`, `hdr.mjs` / `hdr.json`: open-menu and header probes (pp-01b, pp-01c, sm-01s, sm-01l).
- Re-probe when the code has changed: `node prep/probe.mjs <states> 1440,375 prep/acts.json` (server on :8935).

## Remaining TODO, in order (node ids from the audit)
0. **Check first**: read the `cfin` keys, and for each screen in `prep/map.json` / `prep/reqmap.json` list its `Panel` section
   names. Sections already „Ce permite actul … Istoric” = done; a request screen with `Section · Istoric` = done. Look for
   blocks named pp-01n / pp-01z / mdoc-* / sm-05f / sm-05g (the earlier run may have built them, y ≈ 9000).
1. M1 act profiles: pp-01j `1069:11393`, pp-01k `1069:11822`, pp-01l `1069:12243`, pp-01q `1069:12767`, pp-01e `1267:3919`,
   pp-01i `1268:3919`, pp-03 `1268:4752` (+F6: PF avatar „AC”, IDNP 2990000000001), pp-03a `1268:5385`, pp-03b `1268:52004`,
   pp-03c `1268:52636` (Beneficiar first, MPower). Run `prep/call-act-*.js`, then the header / alert stay; restack; screens hug.
2. M4 Istoric on 22 request profiles (`prep/reqmap.json`) + sm-act-04 `1352:54359` (also F5: draw the „⋯ › Descarcă decizia” menu open).
3. M2 pp-01m `1071:8963` (6 screens 1211:44761 / :44949 / :45137 / :45325 / :45513 / :46231) → MDocs act A4 (= mdoc-15) on the new
   profile. M3: pp-01x `1072:10640` / pp-01y `1072:16483` → profile states (Substanțe controlate table + Istoric), no dialog; new pp-01z.
4. New blocks: pp-01d (base Valabil profile), skeletons ×4, pp-03x, sm-05y (not found), sm-06 / sm-06a (list errors); viewers
   mdoc-11…16, pp-01n, pp-01z, sm-05e…h; menu blocks sm-01s, sm-01l, pp-01b, pp-01c.
5. Minors: F1 stray „✓ Copiat” on sm-01 `1147:4537` (desktop 1147:3308); F3 Document · card set `983:2727` Hover / Focus variant;
   F4 sm-04l `1130:4996` 4 cards („Cererea depusă · Generat” first); F2 pp-01a `1067:4940` ring (check: may be done by open-menu-anchor).
6. Restack both pages (gap 240), arrows, „Start here” `1077:12821` / `1138:3261` + file cover counts, `ui-qa-figma` on every touched block.
