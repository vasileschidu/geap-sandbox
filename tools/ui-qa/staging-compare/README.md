# staging-compare — the developers' build vs the prototype, measured

Compares a staging environment (the developers' implementation) with our demo states by **measured values**
(computed styles + boxes), not by screenshots. Screenshots are only evidence: one cropped, side-by-side PNG per
finding.

```
node --experimental-websocket --no-warnings tools/ui-qa/staging-compare/run.mjs \
  --spec tools/ui-qa/staging-compare/rap.json [--viewports 1440,375] \
  [--out tools/ui-qa/out/staging-compare/rap-<date>] [--only list,profile] \
  [--baseline tools/ui-qa/out/staging-compare/rap-<older>/report.json] [--no-hover] [--no-focus] [--max-hover 40] \
  [--note "why this run (e.g. re-run after pager commit X)"]
```

Needs Google Chrome and the prototype on http://localhost:8935 (`python3 -m http.server 8935` style no-cache server,
the same one the other ui-qa tools use). A full RAP run (13 screens × 2 viewports) takes ~20 minutes.
Output (git-ignored): `report.md`, `report.json`, `crops/*.png` (side by side), `shots/<screen>-<vp>-<side>/` (the raw
element crops + a viewport shot).

## Staging is READ-ONLY

- Every request that is not GET / HEAD / OPTIONS is **blocked inside the browser** (CDP Fetch). The only exception
  is a list of read *queries* in `spec.readOnly.allowPost` (RAP: `api/permits/search` — the register's search is a
  POST that reads). Blocked and let-through requests are listed at the top of the report.
- A step that clicks a control whose name looks like a write (Trimite, Salvează, Șterge, Raportează, Permite toate,
  Intră în cabinet…, `spec.readOnly.denyNames`) throws instead of clicking.
- The cookie banner is hidden with CSS (`staging.hideCss`), never clicked.
- Sequential, one browser, ~1 s pause between screens. No crawling: only the URLs in the spec.

## What it does per screen × viewport × side

1. **Opens** staging (`staging.url` + `steps`) / our state (`ours.state` through `e-permits-acte-permisive.html?state=`,
   + optional `steps`). Transitions / animations off.
2. **Collects** elements by role + accessible name / visible text, through open shadow roots (staging = Blazor +
   MUD web components): `heading:h1`, `heading:<text>`, `crumb:<text>`, `field:<placeholder|label>` (+ `::text`,
   `::icon`, `::action0`), `control:<name>`, `tag:<text>`, `text:<label>` + `value:<label>` (the value next to a
   label), and the table: `col:<header>`, `row:first`, `cell:<col>`, `cell:<col>:text0…`, `cell:<col>:control0`,
   `cell:<col>:tag`. Names are normalised (lower case, no diacritics, digits → `#`), so data does not break a match.
3. **Measures** each element (the painted element inside a web-component host): w/h, padding, edge (border or
   inset ring, per side if they differ), radius, background behind it, outer shadow, font family/size/line
   height/weight, colour, letter spacing, gap, icon (size, stroke width, paint colour), left edge from the H1, centre
   offset in its row, field text start, in-field icon/action insets, and the vertical gap to the matched element
   above (rhythm). ±0.5px. Values are labelled with Foundations tokens read from our page (+ the scale tables of
   `.claude/skills/design-system.md`).
4. **Rules on staging alone**: component-audit's own in-page rules on the light DOM (`lib/ca-adapter.mjs` loads
   `PAGE_LIB` from `tools/ui-qa/component-audit.mjs` at run time — no fork; portable rules only) + a shadow-aware pass
   with the numbers of `tools/ui-qa/specs/component-audit.json`: field 40 / 48 (phone 16px text), button 32/40/48
   + icon 16/20/20, chips `spec.rules.chipHeights` (RAP compact 36), tag 20, icon stroke 1.5, icon colour = label colour, tokens only, no horizontal overflow.
5. **Interactions**: real mouse hover (desktop viewports only — phones have no hover) on every control / option /
   field / crumb / row; an element under another layer is reported „covered” (not counted while a menu is open) (did anything visible change, cursor
   pointer, how vs ours), Tab walk (order of the elements both sides have, visible focus), open surfaces (menus,
   dialogs, sheets, tooltips): size, radius, shadow, item height 40 / 48, clipped or not.
6. **Report**: per screen a findings table (id · severity · where · property · staging · ours (token) · note ·
   crop). Stable ids = hash(screen, viewport, element key, property): `--baseline <old report.json>` marks each
   finding new / still open and lists the fixed ones.

Severity: **Must fix** = staging breaks a library / design rule (also when ours is equal — "(ours too)") ·
**Should fix** = drift from the prototype · **Prototype behind** = staging has something we do not, or ours breaks
the rule staging follows → update the prototype (a flag, not a verdict).

## Adding a screen

```json
{ "id": "profile", "title": "Act profile", "viewports": [1440, 375],
  "staging": { "url": "/registry/147-2026-00005?authority=33", "scope": "main",
               "steps": [{ "waitFor": "text:Vizualizare act" }] },
  "ours": { "state": "rap-02b", "scope": "main" },
  "match": [{ "key": "control:view-act", "kind": "control", "staging": "text:Vizualizare act", "ours": "text:Vezi act permisiv" }] }
```

- Steps: `click` / `hover` / `scroll` / `focus` (CSS — deep through shadow roots, `a >>> b` crosses a shadow root
  explicitly — or `text:<accessible name>`), `type` (inserted into the focused element, `into` to click first),
  `key` (Enter, Escape, Tab, ArrowDown), `wait` (ms), `waitFor` (selector), `tabTo` (press Tab until the focus is inside
  the target = real `:focus-visible`), `vp: "phone" | "desktop"` to limit a step, `optional: true` to skip a step whose
  target is missing at that width (e.g. a desktop-only select).
- `scope` limits collection to a container (a modal: `mud-modal` on staging, `[role=dialog]` ours).
- `match` pairs elements the automatic keys cannot (different wording, a select vs a button); `kind` = control /
  field / text / tag. Use it instead of hiding findings.
- To write a spec, probe one side: `run.mjs --probe staging:/registry?q=x --viewports 375 [--steps '[…]'] [--scope …]
  [--dump "<css>"]` prints the keys it collects (+ a DOM tree) and saves a PNG; `--probe ours:rap-02b` for ours;
  `--block-queries` cuts the allowed read queries (error states).
- `staging.blockQueries: true` on a screen = the allowed read queries are blocked too → the staging error state.

## Reading the report

Start with the summary table, then each screen's **Must fix** rows. Each row's `png` link is the side-by-side crop
(the dashed box is the measured element). `presence` rows = an element only one side has (a missing feature, or a
naming difference — add a `match` override). `field labels` = labels only one side shows. `gap-above (from X)` =
the vertical space between the element and the matched element above it.

## Limits

- Data differs (staging has its own records; ours is demo data): text widths, row heights from wrapping and
  list lengths are skipped; the first table row is compared on both sides whatever its content.
- Closed shadow roots and canvas are not measured. Pseudo elements are only read for hover changes.
- Component-audit's class-based rules (non-library-control, button-paint…) judge OUR class names and are not run on
  staging; its size rules see only the light DOM — the shadow-aware pass covers the rest.
- Pages behind login (Cabinet) and anything that writes are out of reach by design. Screens staging cannot reach
  with its data (e.g. numbered pagination with 6 records) are listed under "Screens without a pair" in the spec.
- Our side is always loaded uncached (CDP cache off), so a run right after a commit compares the new CSS / JS.
- Keys renamed by a new `match` override show up as „fixed” + „new” against a baseline — read them as renames.
- Hover is a single mouse position per element (input centre for fields, ≤ 24px in for others).
