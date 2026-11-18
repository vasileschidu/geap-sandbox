# RAP · Staging review (2026-11-18)

Review for the developers: **Figma is the source of truth**. Per Figma screen, the developers' staging build
(https://evo.staging.egov.md/geap-rap, public register, READ-ONLY) is captured in the same state and width and placed
next to the Figma screen; differences are marked with red numbered pins + one short English note per pin
(≤ 1 sentence, max ~10 per screen, most visible first).

## Figma

- File: EVO-WEB-3.0 `YrIzksVgFqtPqDd5z9zY5h` (the RAP board is NOT in GEAP 2.0 or the EVO Cabinet file — checked both page lists).
- Original page (untouched): `20304:64765` „↳ Registrul actelor permisive”
  https://www.figma.com/design/YrIzksVgFqtPqDd5z9zY5h/?node-id=20304-64765
- Duplicate (work here): `22865:36414` „RAP · Staging review 2026-11-18” (right after the original, 34 blocks, 20 connectors)
  https://www.figma.com/design/YrIzksVgFqtPqDd5z9zY5h/?node-id=22865-36414
- Duplicate sections: 00 Start here `22865:37078` · 01 Registry list `22865:37124` · 02 Filtre `22865:38234` ·
  03 Act profile `22865:37462` · 05 Company acts `22865:38013` · 06 Act data first `22865:38092`.
  Block / screen ids in the table below are the ORIGINAL page's ids (the duplicate has new ids; look blocks up by name
  `Block · <id>`). The original page also holds a loose rectangle „Screenshot 2026-11-18 at 12.34.33 1” (22861:73164) in section 01's area — copied too.

## Screens (34 blocks · 32 desktop 1440 + 32 phone 375)

Staging: **yes** = reachable read-only · **data** = the UI exists but staging's 6 records lack the case (compare the
nearest record, pin only UI) · **no** = no staging equivalent.

| Section | Block | Shows | Proto state | Desktop | Phone | Staging |
|---|---|---|---|---|---|---|
| 01 | rap-01 | Registry list (default) | rap-01 | 22080:126884 | 22080:130478 | yes `/` |
| 01 | rap-01e | Long act name · tooltip on hover | rap-01e | 22080:131438 | 22080:132334 | no (no long names) |
| 01 | rap-01f | Tacit approval in the list | rap-01f | 22080:133260 | 22080:134147 | data (no tacit act) |
| 01 | rap-01q | Search results („alcool”) | rap-01q | 22082:195159 | 22082:196062 | yes `/registry?q=147-2026` |
| 01 | rap-s01 | Search typed, not applied | rap-s01 | 22822:38262 | 22822:38293 | yes (type, no Enter) |
| 02 | rff-01 | Filter bar · default | rap-f01 | 22697:29615 | 22709:36354 | yes (click Filtru) |
| 02 | rff-02 | Statut open | rap-f06 | 22698:27539 | 22711:36496 | yes |
| 02 | rff-03 | Autoritate emitentă open · selected first | rap-h02 | 22698:31135 | 22711:37464 | yes |
| 02 | rff-04 | Authority ticked · pending | rap-h02 | 22698:32136 | 22711:38379 | yes |
| 02 | rff-04a | Loading after „Aplică filtre” | rap-h09 | 22727:33372 | 22741:1411 | no (transient) |
| 02 | rff-05 | Filters applied · chip group | rap-h06 | 22698:33010 | 22711:41706 | yes |
| 02 | rff-06 | Data eliberării · De la – Până la | rap-f07a | 22698:34774 | 22711:42428 | yes |
| 02 | rff-07 | Typed date · auto-format | rap-h05 | 22698:38089 | 22711:43334 | yes (type into the field) |
| 02 | rff-08a | Date picker · month list | rap-h04 | 22698:35893 | 22711:44237 | yes (verify picker) |
| 02 | rff-08b | Date picker · year list | rap-h03 | 22698:37152 | 22711:45302 | yes (verify picker) |
| 02 | rff-09 | Mai multe open | rap-fm | 22698:38987 | 22711:46366 | yes |
| 02 | rff-10 | Adresă · Raion → Localitate → Stradă | rap-g09 | 22698:39858 | 22711:47266 | yes (data for streets) |
| 02 | rff-11 | Search by a published field („bere”) | rap-h01 | 22698:40969 | 22711:48271 | data (no such field values) |
| 02 | rff-11a | Loading after search | rap-h10 | 22727:34341 | 22727:35001 | no (transient) |
| 02 | rff-12 | Phones · filter sheet | rap-04b | — | 22699:35238 | yes |
| 02 | rff-13 | Adresă · several streets ticked | rap-h07 | 22712:47308 | 22712:49163 | data |
| 02 | rff-14 | Adresă applied („Bălți · 2 străzi”) | rap-h08 | 22712:48287 | 22712:50198 | data |
| 02 | rff-15 | Search suggestions („chis”) | rap-fs1 | 22713:52001 | 22713:52848 | no (staging has no suggestions) |
| 03 | rap-02 | Act profile · company (valid) | rap-02 | 22083:21603 | 22083:24612 | yes (`/registry/000117…`, verify url) |
| 03 | rap-02a | Act profile · person, long name | rap-02a | 22083:24988 | 22083:25301 | data (person yes, long name no) |
| 03 | rap-02b | Act profile · Suspendat | rap-02b | 22083:25659 | 22083:25975 | yes `/registry/147-2026-00005?authority=33` |
| 03 | rap-02d | Act profile · very long act name | rap-02d | 22083:200770 | 22083:201057 | no |
| 03 | rap-02g | Act profile · tacit approval | rap-02g | 22083:201390 | 22083:201697 | no |
| 03 | rap-02h | Act profile · Retras | rap-02h | 22083:202050 | 22083:202360 | no (no withdrawn act) |
| 03 | rap-02c | Act not found | rap-02c | 22083:202717 | 22083:202848 | yes `/registry/NU-EXISTA-0000?authority=33` |
| 05 | rap-01g | Company acts („Vezi toate (N)”) | rap-01g | 22083:203055 | 22083:203555 | no (prototype only) |
| 06 | rap-03x | Data panel · records (docked) | rap-03x | 22551:43391 | — | yes (click „Vizualizare act”) |
| 06 | rap-03w | Data panel · records expanded | rap-03w | 22556:44483 | — | data (needs > 3 records) |
| 06 | rap-03x phone | Data sheet · phone | rap-03x | — | 22556:229221 | yes |

Counts — desktop and phone are reviewed separately (PO 2026-11-18: every 375 screen gets its own staging capture
at 375 and its own row with pins, same as desktop):

| | Screens | yes | data | no |
|---|---|---|---|---|
| Desktop 1440 | 32 | 18 | 6 | 8 |
| Phone 375 | 32 | 19 | 5 | 8 |

Not reachable (both widths, 8 blocks): rap-01e, rap-01g, rap-02d, rap-02g, rap-02h, rff-04a, rff-11a, rff-15.
Desktop / phone gaps in Figma: **rff-12** phone filter sheet has no desktop block (fine: desktop = rff-01…10);
**rap-03w** „records expanded” has a desktop screen only — no phone screen; rap-03x desktop and phone sit in two blocks
(`rap-03x`, `rap-03x phone`) — one row each.

Staging pairs in `staging-compare/rap.json` that have **no Figma screen**: search with
no results (rap-01d), service error (rap-f20), „Acte pe pagină” menu open / focus, A4 „Vizualizare act” document modal
(rap-03n) — listed for the PO, not reviewed.

## Capture path

Reuse `tools/ui-qa/staging-compare/run.mjs` probe mode (read-only guard included: only GET/HEAD/OPTIONS + the search POST;
write-like clicks throw; cookie banner hidden by CSS). Tested 2026-11-18 at 1440 and 375:

```
node --experimental-websocket --no-warnings tools/ui-qa/staging-compare/run.mjs \
  --spec tools/ui-qa/staging-compare/rap.json --probe staging:/ --viewports 1440 \
  [--steps '[{"click":"text:Filtru","after":1500}]'] --png <out>.png
```

The PNG = the whole document (`scrollWidth × scrollHeight`, capped 2400 × 5000); the list at 1440 = 1440 × 900.
Small adapter still needed (`shots.mjs` in this folder): (1) one entry per block above → staging url + steps (copy the
rap.json steps; new ones for rff-03…10), loop the probe; (2) overlay states (menus, sheets, panels) at the viewport
1440 × 900 / 375 × 812, page states full page; (3) phones: staging's page is 1236 px wide at 375 (horizontal overflow,
already a Must fix) → clip the shot to 375 and pin the overflow; (4) save as `out/<block>-<vp>.png` (git-ignored).

## Row format (planned)

Per block on the duplicate page: `Figma screen | staging screenshot` side by side at the SAME scale (1 : 1, tops
aligned, gap 120), red numbered pins (1…10) on the staging side, a notes column to the right (pin number + one English
sentence). Phones the same: each 375 Figma screen gets its own row with a 375 staging capture and its own pins
(64 rows total: 32 desktop + 32 phone). Not-reachable screens get a grey „No staging equivalent” note instead of a screenshot.

**Pin wording and values** come from the measured report (internal source, PO 2026-11-18), never guessed:
`tools/ui-qa/out/staging-compare/rap-2026-11-18-final/report.json` (findings: screen, viewport, element key,
property, staging value, expected value + token, note, crop; also the dev page `reviews/rap-staging/index.html`).
Every expected value is checked against the Figma screen first: where the prototype value and Figma differ,
**Figma wins** and the note says so.

## Open questions

1. „data” blocks: compare against the nearest staging record (UI only), or skip?
2. 06 rap-03x: staging shows „Vizualizare act” as a modal — pin the docked-panel difference as one finding or skip?
3. Staging-only pairs without a Figma screen (no results, error, page-size menu, A4 modal): add Figma screens later or leave out?
4. Phones: clip at 375 (pin the overflow once) or show the full 1236-wide page?
