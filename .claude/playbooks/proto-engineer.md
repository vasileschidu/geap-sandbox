# Playbook — proto-engineer (GEAP prototype code)

Read this whole file before every code job. **Append to „Lessons” after every job** (what broke,
what the user corrected, what review/QA found) — one dated line each, with the fix. Promote a
lesson into the sections above when it has proved itself twice. Never delete a lesson.

## The codebase
- Static prototype, no build: `e-permits-acte-permisive.html` (+ shell pages), JS in
  `js/e-permits-shell.js` (one big IIFE — find code by its comment headers), demo states in
  `js/demo-states.js`, CSS in `css/e-permits-acte-permisive.css` (+ `css/e-permits-shell.css`).
  `css/main.css` = library, identical to `Components/css/main.css` — never edit; never touch
  `Components/*`, `acte-permisive/`, `msupport/`.
- Served for checks on `http://localhost:8935` (no-cache server). After CSS/JS changes bump
  `?v=tarife-vNN` in the 5 pages (e-permits-acte-permisive, mpass-test, bo-login, e-permits-shell,
  index) — and `e-permits-shell.css?v=hover-vN` when that file changes.
- Data: `data/e-permits-services.json` (services, flows, authorities), `data/e-permits-rssp-people.json`
  (authorities with subdivisions = `rsspDb`), users in `data/e-permits-users.json`.

## Workflow
1. Read the user story in Azure (project GEAP, read-only — never edit US/AC text; comments only
   when the user asks) and the Figma reference; list the ACs you will cover.
2. **Check components.md first** (Component Inventory) and reuse exact helpers/classes:
   `renderFoSelectControl`, `renderCheckOption` (supports `icon`, `required`), `renderToggle`,
   `renderTag`, `renderInfoNote`, `renderStackedList` / `renderRowActions` / `renderStackMenu`,
   `askConfirm`, `showShellToast`, `logServiceEvents` (→ „Modificări nepublicate”), drawers
   `.e-permits-user-create` (+ `--wide`, `__section` / `__section-title` / `__section-content`),
   grids `.e-permits-user-create__grid` + `__field--6/12`, blocks `.e-permits-tax-cond`
   (+ `--outline`), segmented `.segmented-control` (standard size only).
3. Build: tokens only (`var(--…)` with fallbacks), no inline styles, no new class unless nothing
   exists — then document it in components.md (inventory row + section) the same turn.
4. Add demo states for every meaningful state (default, filled, empty, validation error, menus
   open, confirmations, no-rights). Helpers: `svc(tab, run, code)`, `cfgNav`, `docOpen`,
   `docMenu` (opens ⋮ via the visible row button — hidden menu items fail `h.find`), `rtAviz`.
5. Verify: `node --check`, then capture states:
   `node --experimental-websocket --no-warnings tools/persona-test/capture.mjs --states <ids> --out <scratch>`
   (desktop + mobile, console errors, overflow). Drawer content scrolls inside the drawer — use a
   scrolled screenshot when needed. Look at the PNGs.
5b. **Hover audit — standing rule (2026-10-13, user: „hover is always broken”)**: every UI state you
   build or touch goes through `node --experimental-websocket --no-warnings tools/ui-qa/hover-audit.mjs
   --states <ids> --scope "<scope>" --max 200` until it reports 0 „no-hover” / 0 „covered” (selected
   items need their own visible variant: on #F1F1F1 → tertiary-hover, on black → inverse-default-hover,
   white cards → border secondary + `--shadow-200`). Never `filter: brightness()` (invisible) and never a
   lighter veil. Triage what is left: an element that holds focus at the end of the state (focus look =
   hover look), an open `aria-expanded` button (stays pressed by rule), and states with an open modal /
   menu / toast (audit the dialog with its own scope) — prove each with a probe that blurs first. The
   first run of the tool after a cold start can report „0 interactive”: run it again. Also check after a
   real drag and after closing a menu that no `is-dragging*`, indicator or open menu stays behind.
6. **QA**: run the `ui-qa-code` agent (states + scope). Fix majors, re-run. For bigger features
   run the persona review (`/persona-review` style: admin-platforma, spec-auditor,
   design-system-guardian, editor-romana, accesibilitate → verifier).
7. Commit with the attribution line; push only to `sandbox` (branch + `HEAD:main`), never
   origin, never force; `docs.png` / `docs/` stay out.

## Rules (from the user — never break)
- Obligatoriu = checkbox option with red star (never Da/Nu, never a switch).
- Button icon colour = label colour. „Editează” with pen; one labelled primary + ⋮ per row.
- No monospace — except rule-builder keywords as `code.e-permits-doc-kw` tokens.
- Applicant types: icon + full name in forms/read-only views; plain codes in stacked list meta.
- Hover visible everywhere; open button keeps focus ring (`aria-expanded`); no toast for toggles.
- Last row without divider; truncated text gets a tooltip; dates „8 iulie 2026”.
- Opening animations use `animation-fill-mode: backwards` (never `both`) and open modals drop
  their layer — otherwise hover stops repainting in GPU Chrome.
- Floating select lists can ask for a min width: `[data-fo-list-min="120"]`.
- Long lists (> 12) → summary field + picker modal; condition builders read as code
  (`Când` / indented rows on a guide line / `și ▾`), value group = mode + input in one border.

## Gotchas
- zsh: `${…}` inside an unquoted heredoc breaks — use `<<'EOF'` and pass paths via env.
- macOS has no `timeout`; scripts must exit themselves.
- `querySelector` on a comma list returns the first in DOM order — maybe a hidden drawer; pick
  the first visible match.
- The fo-select `id` sits on its button — focus `#id`, not `#id + button`.
- Python patching: assert each `old` string exists before replacing; re-run `node --check`.

## Lessons (append — newest last)
- 2026-10-12 · Demo `docMenu` waited for a hidden menu item (fails) → open ⋮ from the row's
  visible button first.
- 2026-10-12 · The user rejected: grey nested rule blocks, separate segmented controls for
  Valoare/Alt câmp and și/sau, icon badges for PF/PJ in list rows, a segmented și/sau, a box
  around composite fields (→ lines only), Da/Nu for Obligatoriu. Prefer quiet, sentence-like
  builders and existing components.
- 2026-10-12 · ui-qa-code first run: chevron colour ≠ label in the „Valoare ▾” group; an off-scale
  17px indent → use 8 margin + 1px transparent border + 16 padding.
- 2026-10-12 · PO asked „care este scopul acestui checkbox?” on the classifier values table → the
  selection column (bulk Activează/Dezactivează) was removed everywhere; no checkbox columns unless
  a story asks for bulk actions. Without the select column, the first cell pads 16 (toolbar line).
- 2026-10-12 · Solicitările mele + catalog in `cabinet-evo/` (one page, `?view=` + `?as=`; new views
  are separate files fed by `window.CabEvo` from cabinet-evo.js). Reusing the FO vocabulary (summary
  card, finish tracker/timeline, callout, roles, confirm-file rows, confirm + doc modals) covered a whole
  EVO profile with ~10 glue classes — look in the FO wizard before inventing for any EVO screen.
- 2026-10-12 · A `sed` that deleted „unused” `const status = …` lines also hit `statusTag()` (same
  indent) → every tag read „Undefined” (bare `status` = `window.status`). Never sed-delete by line text;
  edit the one occurrence with Python + assert count == 1.
- 2026-10-12 · Library `.status-tag` is `text-transform: capitalize` → „În Așteptare”. Romanian labels are
  sentence case: scope `text-transform: none` (cab page, BO dosar profile already does it).
- 2026-10-12 · The FO intent menu stretches `left:0; right:0` at ≤720 — any reuse (`cab-menu`) must
  re-anchor on mobile; a left-side menu trigger near the edge needs `margin-left:auto` so the menu opens
  leftwards. Check open menus at 375 (capture overflow > 0 is the tell).
- 2026-10-12 · `cabinet-evo/` does not load e-permits-shell.css → the global „open button keeps the focus
  ring” rule was missing there; pages outside the shell need it copied (`.cab-page .btn[aria-expanded]`).
- 2026-10-12 · empty-state.js / FO markup use root-relative `assets/…`; on sub-pages rewrite to `../assets/`
  (`fixAssets`). capture.mjs only says „ok” when demoState is set — `id:error` also counts as set; check
  `document.documentElement.dataset.demoState` for `:error` (scratch `check.mjs`) and items on page 2 of a
  paginated list (filter first).
- 2026-10-12 · Full-page captures put fixed modals/tooltips wherever the page was scrolled; for modal
  states take a viewport screenshot (CDP `Page.captureScreenshot`). A `scroll` listener that hides a
  tooltip kills it when the demo helper `h.hover` scrolls it into view — position absolute in document
  coordinates instead.
- 2026-10-12 · No sub-agent tool in this session → ran `tools/ui-qa/code-audit.mjs` per
  `.claude/agents/ui-qa-code.md` myself. Real finds: chip icon colour ≠ label (cab Filtre pinned #121212),
  brand-blue check in menus (icon = label colour), truncated summary labels on mobile (wrap them).
  Standing false positives: `e-permits-fo-copy-value` (button-not-library / icon colour), open menus
  overlapping content, `.u-visually-hidden` „clipped”, FO timeline gray-50.
- 2026-10-12 · „hover breaks after I click something”: page-reveal.js re-marked items on every
  re-render and only cleared its latest run, leaving older items with `animation … both` +
  `will-change` (GPU Chrome stops repainting :hover). Fixed: reveal = `backwards`, no will-change,
  every run clears its own items; all opening (`-in`) animations in the app CSS → `backwards`.
  Test it headless: two clicks < 520ms apart, then hover a row (scratchpad hover.mjs pattern).
- 2026-10-12 · `<a class="btn">` underlined on hover (library global `a:hover`) → `a.btn` never
  underlines. Cabinet dropdowns = BO buttons (`btn-neutral btn-sm`, 16 icon, chevron), menus =
  `.e-permits-stack__menu` size, ⋮ = `btn-strict btn-sm btn-icon-only` (32, radius 6).
- 2026-10-13 · US-54 (address by cadastral code): the FO „Detalii solicitare” address is the JS
  `cascadeAddressHtml` (label „Caută adresa”), not the static HTML block — and it is step 2 = `fo-03`
  (fo-04 is Acte necesare). Schema flags on the field (`cadastral`) + `?param` demo overrides kept
  the change local; `postprocessSectionHtml` spreads the same field, so post-process 10 inherits it.
- 2026-10-13 · `el.focus()` in a background headless tab fires NO focus event → focus-driven lists
  never opened in demo states (they did in a real browser). Demo runs dispatch
  `new FocusEvent("focus")` after `h.focus`. Also list options listen to `mousedown`, so a demo
  must dispatch `mousedown` (h.click sends only click).
- 2026-10-13 · capture.mjs prints „ok” even for `id:error` — always run a scratch checker reading
  `dataset.demoState` + probing the DOM (scratchpad check.mjs pattern) before trusting a capture.
- 2026-10-13 · `bindCascadeSelect.setValue()` focuses the select button → a programmatic fill steals
  focus from the field the user is typing in; give focus back (or blur) after filling.
- 2026-10-13 · Registry-filled FO fields = `.e-permits-fo-input.is-filled.is-readonly` + green
  `icon-checkmark-small` (the FO Read Only state), never a lock. For selects: hide the select, insert a
  read-only input box; one full-width `renderInfoNote` explains them (a hint under one span-6 field
  wrapped to 3 lines and broke the row). New field-message tones `__warning` / `__loading` live next to
  `__success`. Another agent bumped `?v=` mid-job (v51→v53): re-read before bumping.
- 2026-10-13 · eKYC back office = a **product mode** of the BO page, not a copy: `?flow=ekyc` maps to the
  back-office flow (all `[data-demo-flow="back-office"]` CSS applies), `js/ekyc.js` in `<head>` sets
  `window.GEAPShellProduct`, the shell exposes its engine through `product.init(api)` and ~15 small
  hooks (roles URL, nav dispatch, renderCell / search / sort / filterToken / facets / openRow / export /
  emptyHtml, route, logout). A whole new back office (shell, 2 registries, profile with 5 tabs,
  dashboard) cost ~900 lines of product JS + ~300 lines of CSS. Next product: copy this pattern.
- 2026-10-13 · BO traps a product hits: `.e-permits-shell__nav-group--config` is `display:none` (legacy) →
  gate it with `!product`; registries without a checkbox column inherit the pinned „column 2 +
  divider” rule → add the kind to the „no checkbox column” selector lists; a plain table inside a
  section needs the same unpinning; a modifier that changes `grid-template-columns` (trajectory
  `--nN`) overrides the ≤760px stacking unless wrapped in `@media (min-width: 761px)` — the QA's
  clipped-text on mobile was the tell.
- 2026-10-13 · Data-driven widths without inline styles: SVG `<rect width="62%">` (meter, chart) —
  attributes, not `style=""`. Onest tabular-nums renders „1 1:44” with a visible gap → don't use it.
- 2026-10-13 · Several mobile `:error` states (trf-01, srv-01) are pre-existing: the nav click target
  is hidden ≤960px. Proved it against HEAD in a `git worktree` served on another port (never stash
  while another agent edits the tree).
- 2026-10-13 · Generator gotcha: `arr.find((c) => c.id === pick(list))` calls the random pick per
  element → undefined; pick once, then find. Undecided sessions must have `finalScore: null`.
- 2026-10-13 · US-54 refine — user corrections: (1) „use our components” = the address search is the
  **product search input** (`.search-input` + `e-permits-workplace__search e-permits-list-search--fill`,
  × via js/search.js), not an `.e-permits-fo-input` with a trailing icon; (2) the full-width AC-14 note was
  „useless” → removed (lookup feedback lives in the field's own message slot: one `<p>` whose class swaps
  hint → `message--inline` tone; outcome announced once by a visually hidden live region); (3) a lookup
  that fills many fields shows the FO input skeleton in exactly those fields (label stays, same height,
  min 400 ms) and the values arrive with a one-time brand-secondary flash (`backwards`).
- 2026-10-13 · The library `.search-input` draws a 2px TRANSPARENT border + an inset 1px line → next to FO
  selects its visible frame is inset ~2px with a smaller-looking radius; the user saw it at once. Inside FO
  fields scope a rule (`.e-permits-fo-field .search-input…`: 1px border on the box, FO hover/focus/error) and
  **measure visible-border x / width / height / radius against the select in the same column** (frame.mjs
  pattern) before reporting. FO mobile fields are 48 → Large search + skeleton 48 at ≤720.
- 2026-10-13 · „Changes in the builder must show in Preview” + „wrong component in the preview”: the
  preview had its own hard-coded address fork. Fix = ONE renderer per field (`addressSearchInputHtml`,
  `cascadeAddressHtml` fed by the builder config via `field.parts` / `searchLabel`), grep every
  `data-fo-address-input` / `--with-action` renderer incl. static HTML fallbacks. Never let a preview
  draw look-alike markup.
- 2026-10-13 · A focused combobox wrapper with `z-index: 30` painted over the sticky FO header (10) and
  mobile progress (20) when scrolled → keep in-form layers under the sticky chrome (6); floating lists use
  fixed positioning anyway.
- 2026-10-13 · Test-config panel („Configurare flux”) groups that only affect one step must not call the
  panel's `apply()` (it re-routes the screen) — redraw just that step; give the panel body
  `overflow-y:auto` + a max-height once it grows past the viewport. capture.mjs `--hide ".msup-bubble"`
  shows the panel in a capture.
- 2026-10-13 · US-54 — user decision (deviation from AC-13, recorded in components.md for the PO): „Cod
  cadastral” became the default **editable** FO input; the code can be typed there OR in the search
  (label „Caută adresa sau cod cadastral” when it is visible). Pattern for „two inputs, one lookup”:
  one lookup with a `from` source (`setStatus(kind, from)` → messages + `is-error`/`aria-invalid` only
  in that field's slot, the other back to its hint), values mirrored programmatically (no `input`
  event, so no loops), the input being typed in is never a skeleton target, and `release()` must NOT
  wipe the code the user typed (an invalid code is corrected, not retyped) — clear the code only on
  ×/empty or when a saved address replaces it.
- 2026-10-13 · `bindAddressSearch.resetAddressParts()` resets every `[data-fo-address-part]` in the field
  on each search keystroke — a new part with that attribute (cadastralCode) is wiped too; re-sync it
  after (or keep it out of the attribute).
- 2026-10-13 · A × inside an FO input = the library `.btn-icon.clear` scoped as
  `.e-permits-fo-input .btn-icon.clear` (main.css only styles it inside `.search-input`), shown by a
  `has-value` class on the box; add its hover to the hover-audit list (`--color-background-base-tertiary-hover`).
- 2026-10-13 · Real-typing test (CDP `Input.insertText` per char + Enter/blur) catches what `h.fill` hides:
  h.fill fires `change` at once, so the 0.9 s pause trigger is never exercised by demo states (scratch
  adr54/typing.mjs). The check script's screenshot offset must leave the field above under the sticky
  FO header visible (top − 230).
- 2026-10-13 · eKYC dashboard polish (user): every card on one page shares ONE radius (KPI = 16 →
  charts, alert cards, stacked lists, info card scoped to the page); chart cards are WHITE with a border,
  grey only on the legend tray; decision colours = the product status palette (positive = green-600
  `--color-icon-positive-default`, NOT `--color-background-positive-default` = green-900); stacked meter
  12px with 2px cuts (`<line>` in the card colour). Rounded bar tops without inline styles: draw the top
  segment first with `rx` and height 100% (the plot clips it), the lower segments over it.
- 2026-10-13 · „Alerte active” as a notification stack: one tinted card per alert = the subtle message
  tones (`banner--error/--warning/--info`), library `banner__close` with a 20px icon, first 2 shown + 1–2
  peek layers + „Arată toate (N)” → the page's existing modal. A decision shown as its own section above
  a trajectory was rejected → the outcome is the trajectory's hanging callout with the decision tone
  (one `trajectory()` helper for every plan / review path).
- 2026-10-13 · Toolbar control heights: put the segmented control at the select height by scoping the
  track (inset 4 + 32px pills = 40; mobile 48 = 4 + 40) and MEASURE both (probe.mjs pattern). The FO
  mobile rule caps `.e-permits-fo-select` at `100vw − 32` (FO padding) → in a BO page (padding 12) scope
  `width: 100%` or the select is 8px short of its neighbours.
- 2026-10-13 · A table in a rounded card: `overflow: hidden` fixes the square corners but kills the
  sideways scroll on phones → `overflow: auto` (clips to the radius AND scrolls).
- 2026-10-13 · Seed generators that demo ids depend on: add new data with a SECOND random stream after
  the old loop, then prove the old fields byte-identical (strip the new keys, compare). Also check
  semantic consistency of seeded data (a session „in review between thresholds” had a 0,88 score).
- 2026-10-13 · Product dialogs: reuse the page's simple modal `#case-action-modal` through one
  `openModal({ title, subtitle, body, footer, kind })` (class modifier per kind, `data-case-close`
  footers close through the shell) — decision, allocation, access request, alerts list and an image
  viewer cost no new modal markup. Zoom / rotate without inline styles = `data-zoom` / `data-rot`
  attributes mapped to CSS custom properties.
- 2026-10-13 · Multi-agent tree: other agents bumped `?v=` and edited components.md / the playbook while I
  worked — always re-read before bumping, edit shared files with exact-match single replacements only.
- 2026-10-13 · US-54 trigger — user: „search integrated in the input as in the components; it must be
  clear when the request is sent”. Auto-lookup on a 900 ms pause / blur was invisible → a search that
  calls an external registry gets the library **submit** (`.btn-search`, Figma Button = True; scoped
  exception in components.md § Search input) and runs ONLY on submit / Enter / an explicit list row
  („Caută codul cadastral «…»” as the first suggestion). Submit disabled while empty or busy, inline
  `.loading` spinner in the source box, edits after a fill keep the values until the next submit.
  Gotchas: js/search.js (delegated, on document) adds `is-typing` AFTER an element listener → opt out
  in search.js for fields with a `.btn-search`, never fight it with class removal; it already clicks
  `.btn-search` on Enter (don't also handle Enter, just preventDefault). The library action size
  subtracts a 2px border — inside the 1px FO frame set both `--search-input-action-inset` (4 + 1) and
  `--search-input-action-size` (− 1px border) or the submit renders 26 instead of 28; measure it.
  Library preview uses `icon-arrow-left` + CSS rotate(180°) = Figma arrow-right: copy the markup as is.
- 2026-10-13 · User rejected full red / yellow tinted alert cards („too much”) → white dashboard cards with
  a soft severity outline (`*-secondary` border token) + 3px left accent as inset shadows; Informativ =
  neutral outline. The library `.banner__close` is `position: absolute` — don't flex-align it; place it
  (top/right = 16 − its 6px inset) and pad the card's right side (56) so text never runs under it;
  measure title-line centre = close centre = icon centre for 1- and 2-line titles.
- 2026-10-13 · Guest requestor (Figma 633:7411 G1–G8): reaching the rest of the wizard without a
  schema subject was cheap — synthesize a subject (`guestSubjectOf`) for the summary, render steps
  3/5/7 from a **cloned schema variant** (`guestSchemaVariant`), guard drafts in
  `saveFrontOfficeDraft`, re-sync footers in `setFrontOfficeStep`, and reset the mode in
  `applyFrontOfficeSchema`. Declare a mode flag at the top of the IIFE (TDZ if a function used at
  init reads a `let` declared further down). Real file uploads in demo states: `DataTransfer` +
  `input.files` + `change`.
- 2026-10-13 · `e-permits-shell.js` rewrites the FO hash to `#my-cases` on every FO state (pre-existing);
  don't read the hash to judge a demo state — probe the visible screen.
- 2026-10-13 · Self-made infinite loop: a MutationObserver on the control's subtree `class` + a
  callback that adds `is-ready` to the control itself → the page hung (capture/CDP printed nothing).
  Observe only the children, or filter `record.target`. A script that prints nothing = page hang.
- 2026-10-13 · A ResizeObserver that „snaps” cancelled the slide: selecting a segment changes its
  label weight → the control's width → RO → snap. Snap only on first show (0 → width) and window
  resize. Prove an animation by sampling `getComputedStyle(el,"::before").transform` per rAF inside
  the page — a CDP screenshot 90ms after the click already shows the end state.
- 2026-10-13 · „Hover only after a click” (user): two held layers on the FO page — the library
  `.info-box` entrance `message-slide-in … both` (MPass banner) and ~20 closed library
  `.modal-overlay`s keeping `will-change: opacity` full-screen at opacity 0. Fixed in app CSS
  (`.e-permits-front-office-page :is(.info-box,.message,.banner) { animation-fill-mode: backwards }`,
  closed overlays `will-change: auto`). Scan any screen with the anim.mjs pattern: elements with a
  running/held `both|forwards` animation or a non-auto `will-change`.
- 2026-10-13 · User corrections this job: hover boxes must NOT stick out of the form column (no
  negative inset) — pad the row and let it fill its grid column, then MEASURE its edges against the
  inputs (same x/width); procură upload = its own dashed block (dropzone look) with the black
  square Strict button. `btn btn-strict btn-sm` is the no-fill text button in this product → the
  black one is `btn btn-strict btn-md` (40, r8). Segmented controls: library markup only
  (`role=radiogroup` / `radio` + `aria-checked`, no `.tabs` wrapper, no icons, no scoped hex
  overrides) + the opt-in `.is-animated` sliding thumb.
- 2026-10-13 · CDP `Page.captureScreenshot` clip uses document coordinates: add `scrollY` to a
  `getBoundingClientRect().y`, or the clip shows the wrong area (looked like „hover not painted”).
- 2026-10-13 · Borders of 1.5px read as 1px at DPR 1 (`getComputedStyle` too) — check at DPR 2
  before calling the error border wrong.
- 2026-10-13 · EVO → service hand-over (user rule): the mechanism already existed — the FO reads
  `?solicitant=<subject id>` in `applyFrontOfficeSchema` and the cabinet `?as` ids ARE the FO subject
  ids, so the job was link-building only (catalog `requestTarget`, solicitari `foUrl`) + `#request` /
  `#intent` hashes; zero FO logic. `e-permits-back-office-assignment` (sessionStorage) is the BO ROLE,
  not the FO identity — don't reuse it for applicants. Before inventing a param, grep the FO for
  `params.get(` / `URLSearchParams(` in `js/e-permits-acte-permisive.js` (the FO lives there, not in
  the shell).
- 2026-10-13 · An entry point that „already works” may work only by coincidence: Solicitările mele
  drafts resumed as the FO default subject (pj-global-trader), which happened to own every draft.
  Probe with a non-default perspective; carry the identity explicitly.
- 2026-10-13 · Demo states on another page can be made from a helper + override:
  `{ ...ppIntent(run), params: {…} }`. For a cross-page link, verify the real click too (check.mjs
  „click” mode: open the cabinet page, click `[data-cat-request]`, probe the FO screen + subject).
- 2026-10-13 · eKYC batch 3 (9 config/admin screens, ~2 000 lines in `js/ekyc-config.js`): a second product
  module plugs in through `product.extend({ views, registries, facets, load, init, showView, route })` +
  `product.shared` (getters for api/db) — never grow ekyc.js. Data that other screens show (clients, use
  cases, scoring, providers) must be seeded FROM the existing seed (`seed-config.mjs` reads
  `ekyc-sessions.json`), so names/ids match everywhere.
- 2026-10-13 · Registry objects built at load time must not call `api.*` (api is null until init) — make
  CTA html lazy (`cta: () => addBtn(…)`). Symptom: every state `:error` with „reading 'escapeHtml'”.
- 2026-10-13 · Tables with 8–10 columns inside the 1 024px profile card overflow (actions hidden). The BO
  profile convention is the **stacked list** — sessions, steps (with drag handle lead + ↑↓) and version
  history fit, read better and need no new CSS. Keep tables only for ≤ 6 short columns (veto, rules).
- 2026-10-13 · Long BO forms that a story calls „pagină separată, pe secțiuni” = the Setări one-page form
  `.e-permits-cfg2` reused in the profile panel (section list + scroll spy, cards with `.has-error` red border,
  sticky bar) — the 1.5px red section border comes for free. Set `--cfg2-stick` from the pinned header.
- 2026-10-13 · Demo helpers: `ekList(hash, run)` takes 2 args — extras (`params`) passed as a 3rd arg are
  silently dropped → use `ek(hash, run, { params, ready })`. `h.nth("[data-stack-menu-trigger]", 0)` hit
  a hidden modal's trigger (form-builder) → scope the selector (`#ekyc-panel …`). Items on page 2 of a
  registry (group sorted alphabetically) need a search first.
- 2026-10-13 · `.e-permits-fo-field label` styles every `<label>` inside an FO field (20px, secondary) — a
  `label.btn` file picker there renders as a squashed black bar → use a `<button>` that clicks the hidden
  `input[type=file]`.
- 2026-10-13 · Mobile BO registries: `.e-permits-workplace` has no grid columns → its one column takes the
  toolbar's max-content (588–700px) and the toolbar/pagination clip. Product-scoped fix at ≤760:
  `grid-template-columns: minmax(0,1fr)` + wrap toolbar / footer. BO section headings are flex rows of
  fixed height 48 — at 375 switch them to a one-column grid (flex column + align-self fought other rules).
  Overflow probes: status tabs / `.tab-buttons` are scroll containers (false positives).
- 2026-10-13 · Romanian copy with names: „X este deconectat / sesiunile lui” breaks gender agreement for
  women's names and „1 client … nu se mai pot” number agreement → phrase confirmations around the account /
  the object („Suspenzi accesul pentru X?”, „Sesiunea de pe … se închide”), never „lui X”. User-facing
  errors never show HTTP codes („409 ·”) — the treatment (on the field / its own dialog) says it.
- 2026-10-13 · No sub-agent tool again → ran `tools/ui-qa/code-audit.mjs` myself: default scope `main`
  misses drawers (appended to body) and modals → run again with `--scope "[data-ekcfg-drawer] aside"` and
  `"#case-action-modal .modal"`. Untracked new files are not in `git diff` → grep them for hex/px/style="".
- 2026-10-13 · Form Builder batches 0–1: the old builder was DOM-as-state (2750 lines reading labels back
  out of cards) → rebuilt model-first in its own files (`js/form-builder.js`, `css/form-builder.css`) with
  ONE renderer: the FO `stepFieldHtml` exported as `window.GEAPFormRender` and the shell helpers as
  `window.GEAPUi` (one insertion after `askConfirm`). DCL order makes it work: shell.js (sync, body end)
  registers first, then the deferred acte-permisive.js, then form-builder.js. A separate file kept the
  shared-file edits small while another agent worked in the tree.
- 2026-10-13 · Panel pattern that kept focus: re-render the whole properties panel on every input and
  restore `activeElement` by id + `selectionStart/End` + the scroller's `scrollTop` — simpler than partial
  updates and errors appear live. Delayed „focus the label” timers must check the selection did not
  change meanwhile (fb-01 selected the form title after two quick clicks).
- 2026-10-13 · `?flow=builder` hides `.e-permits-shell` (style.display, not `hidden` — author CSS
  `display:grid` beats the attribute); any overlay that lives in the shell markup (the classifier
  registry) must be moved to `<body>` or it renders 0×0. The registry also never showed in the old
  builder: a library `.modal-overlay` needs `is-active` (opacity), and its own fade keyframes stalled at
  0 % next to the library opacity transition — `animation: none` on the open state.
- 2026-10-13 · `scrollIntoView` scrolls `overflow: hidden` ancestors too (demo `h.scroll` shifted the
  builder topbar up 36px) → `overflow: clip` on the editor root.
- 2026-10-13 · Real-input DnD test in headless Chrome: `Input.setInterceptDrags` → mouse press/move →
  `Input.dragIntercepted` data → `Input.dispatchDragEvent` dragEnter/dragOver/drop (scratchpad fb/cdp.mjs
  `drag()`); read BOTH coordinates before any `scrollIntoView` (my first reorder test dropped the wrong
  card). A demo state of a drag in progress = synthetic `DragEvent("dragstart"/"dragover",
  { dataTransfer: new DataTransfer(), clientX, clientY })`, never finished.
- 2026-10-13 · Hiding the palette/panel on phones broke every build-mode demo state on mobile (clicks on
  hidden targets) → small screens stack the columns (canvas, properties, palette) instead; old builder
  CSS had `max-height: 260px` on both panels at ≤900 — reset it. Builder grid cards on phones = one
  column, or 3/12 cards collapse to 12px tags (the QA's clipped-text count was the tell).
- 2026-10-13 · Spans from data without inline styles: `[data-span="4"] { grid-column: span 4 }` rules;
  only drag geometry (the drop indicator) sets style left/top/width/height.
- 2026-10-13 · Form Builder batch 2: a rule builder that already exists bound to another drawer's state
  (Documente `renderDocRule` reads `docDraft`) is reused by its MARKUP + classes with new data hooks, not by
  calling it; in a narrow side panel apply the component's own documented phone layout (scoped selector).
  Live logic in a rendered preview: tag each renderer top element (`data-fb-field`) with a regex on the
  first tag, read answers from the DOM, debounce on input/change/click/mousedown, iterate to a fixed point
  (a hidden field is emptied, which can flip other rules).
- 2026-10-13 · A true phone preview inside a desktop editor = the same page in an iframe (`width="375"`
  attribute, `?…&fbframe=1` frame mode that only shows the preview) fed by `postMessage` after every change
  — the FO media queries apply; CSS container tricks would need the whole FO CSS rewritten.
- 2026-10-13 · Reusing an FO control generically (the CAEM subgenre multi-select): move its hard-coded
  texts to data attributes with the old texts as defaults — the existing screens stay byte-identical.
- 2026-10-13 · Form Builder batch 3: „reuse the guest IDNO lookup” meant extracting it — the guest code held
  fixed element refs (`guestIdnoInput`, `guestCompanyInput`…), so the reusable part became a factory
  `createRegistryLookup({ input, hint, targets, find, setError, … })` returning `{ run, cancel, onInput,
  code, record, pending }`; the guest keeps one instance (rename `idno/company` → `code/record` at every
  use, grep first) and the builder binds one per `[data-fo-registry-lookup]`. Prove the old flow with a DOM
  probe (company value, hint text, `aria-invalid`) on fo-g1c / fo-g5 / fo-g6b, not just „state ok”.
- 2026-10-13 · Two overlays with the same z-index (1000): DOM order decides. The builder overlay is moved to
  the end of `<body>` at init, so any FO modal used inside its Preview (the document picker) opened UNDER it —
  the capture showed nothing while `h.click` still „found” the submit. Append such overlays after the builder.
- 2026-10-13 · FO renderers that return several top-level siblings (`contactPersonHtml`) break the builder's
  first-tag tagging (`data-fb-field`) and rule hiding; shared FO markup with fixed ids / radio names collides
  between canvas (`cv-`) and Preview (`pv-`). Pattern: an optional `prefix` that, when set, derives ids /
  names AND wraps the parts in one `.e-permits-fo-field-group`; without it the FO output stays as it was.
- 2026-10-13 · `setGuestFieldError` only hid `[data-fo-guest-hint]` hints → on other fields the hint stayed
  under the new error. Generic FO error helpers must fall back to `:scope > .e-permits-fo-field__hint`.
- 2026-10-13 · Field-card tools row: a span-3/4 card fits grip + type + span only; a third tag („Salvată”)
  squeezed the type tag to one letter → metadata tags go in the card foot (next to key / rules / warning).
- 2026-10-13 · „Is this copy still the same as its source?” must compare through the same normalisation the
  loader applies (`sanitize` adds `validation.message`, `help`, `placeholder`) and ignore the copy's own
  props (id, key, label, rules, audit stamps) — otherwise every reloaded copy reads „modificată”.
- 2026-10-13 · A „Validează” demo focuses the first error (top of the form): the state must scroll to the
  component it is about afterwards. Truncated fo-select values had no tooltip → `title` on the value span in
  `renderFoSelectControl` + `chooseFoSelectOption` (shared shell edit, two exact replacements).
- 2026-10-13 · QA triage that saved time: diff the audit findings against a baseline run of an untouched
  state (fb-05 / fb-14) by (rule, last selector, text) — what is left is what the change added. Standing
  false positives again: `.u-visually-hidden` live regions, `e-permits-fo-copy-value`, fo-select chevron
  colour, FO doc-field buttons, address placeholders in narrow canvas cards.
- 2026-10-13 · Form Builder batch 4 (grid, repeatable block, CAEM preset): a stateful FO component goes in its own
  file (`js/fo-grid.js`, `window.GEAPFoRepeat`) that draws its cells / cards with the FO renderer passed in
  (`setContext({ fieldHtml: stepFieldHtml, … })`) — shared-file edits stayed at ~70 lines. Its definitions live
  in a Map keyed by DOM id (set at render, read at bind) instead of giant data attributes. An inert canvas is
  never bound: the static HTML must already draw the rows (render once statically, `bind()` redraws).
- 2026-10-13 · „Reuse the FO markup exactly” with new ids = extract the markup into a function whose defaults
  are the old texts / ids (`caemFieldHtml` / `subgenHtml`), then PROVE it: worktree of HEAD on another port,
  same state, compare the normalised innerHTML (was 5818 = 5818 bytes) + the old behaviour (index, disabled
  codes). Never put the old data hooks on the new copies (`data-fo-activity-card` is counted document-wide).
- 2026-10-13 · Table column widths without inline styles: percentages summing > 100 % squeeze `auto` columns to 0
  (a button stuck out and a real click hit `<main>`). Use `colspan` units on a `table-layout: fixed` table and a
  ResizeObserver that switches to cards (`is-cards`) when units × min-width don't fit — container queries can't
  depend on the column count. Card mode: thead `display: none` (a visually-hidden thead still lays out its
  cells → overflow), per-cell labels visible and NOT aria-hidden.
- 2026-10-13 · Esc inside the builder: `modal.js` listens on document CAPTURE and the builder on window capture —
  an early `return` in the builder handler lets modal.js close the whole editor. Route Esc to the inner
  component instead (`GEAPFoRepeat.escape(target)` returns true when it handled it) and stop it there.
- 2026-10-13 · The builder Preview's „an edit clears the error” listener cleared a whole grid's errors on a
  blur `change` → components that manage their own errors must be skipped by page-level clearing.
- 2026-10-13 · Romanian copy with an admin-written noun („Activitate”) can't take gendered past participles —
  phrase around the action („Ai eliminat „Activitate #2”.”, „S-a adăugat …”); plurals: „cel puțin un rând”,
  never „1 rânduri”.
- 2026-10-13 · User (via coordinator): „hover doesn't work on any element”. Causes: `filter: brightness(.97)`
  (invisible), a LIGHTER white veil on grey, selected items (black chip / segment, selected card) with no
  variant, read-only inputs. Fixed with tokens (tertiary-hover, inverse-default-hover, border + `--shadow-200`)
  and made hover-audit a standing step (5b above). Most leftovers after a fix are focus = hover (prove with
  a blur-first probe) or `aria-expanded` buttons that stay pressed by rule.
- 2026-10-13 · Project-wide hover fix (FO, EVO Cabinet, permits BO, eKYC; 75 states scanned). Real `covered` root
  causes were never "a layer on the screen" you can see: (1) the mSupport widget's FIXED 344×180 box caught the
  pointer in the gap between bubble and launcher, right over the FO „Înainte” → `pointer-events: none` on the box,
  `auto` on its children; its entrance animations held `both`, which also killed the bubble's own `:hover`
  transform (an animation overrides normal declarations); (2) registries with pinned columns: a scrolled-into-view /
  focused cell stopped UNDER the sticky name column → `syncPinnedScrollPadding()` sets scroll-padding from the
  sticky cells; th and td of the pinned column had the same z-index, so rows painted over the header on vertical
  scroll; (3) the page-header tab strip scrolled a tab under its own ‹ › arrow → `scroll-padding-inline: 48px`.
- 2026-10-13 · Most `no-hover` were SELECTED / CURRENT items whose rule zeroed the hover (`.active { background:
  transparent }` after `:hover`, `:not(.is-active):hover`, library `--active:hover { same colour }`) and a dead
  selector (`th:has(.th-content.is-sortable)` — the class sits on the th). A colour on the row never shows if the
  label sets its own colour (FO stepper). Fix = one rule per component class in the round-3 block, table in
  components.md › „Hover — shared rules per component class”.
- 2026-10-13 · hover-audit false positives I fixed IN THE TOOL (not by CSS): coverage measured while the previous
  element was still hovered; measured synchronously after `scrollIntoView` (scroll listeners that hide arrows had
  not run → wait 150 ms); an element hidden since collection (0×0); `text-decoration-thickness/-color` and a
  parent `::before` thumb not compared; links inside an option label deduped away. By-design cases (focused,
  read-only, open `aria-expanded`, scrim, under a VISIBLE backdrop/menu/dialog) are listed as „not counted” — an
  INVISIBLE cover (opacity 0) is still a finding. Drawer/modal states: always `--scope` the dialog.
- 2026-10-13 · Another agent added hover rules to the same CSS file during my job (FO block near
  `.segment-item.is-selected:hover`): `git diff` the file first, don't duplicate, put mine in a separate dated block.
  `msupport/` stays untouched — its fixes are scoped overrides in our CSS (msupport.css loads AFTER our CSS, so
  match its specificity + 1).
- 2026-10-14 · Dossier tabs by capability (Figma comment A. Pascalov 9709:2052, user: „do it first in
  code”): the BO dossiers (`e-permits-workplace.json`, names + generic `tipDosar`) and the service
  passport (`e-permits-services.json`, codes + request types) were NOT linked — bridge with an explicit
  map (`serviceCodes`) + the RSSP sub-service `type` (Eliberare → „Emitere primară”), fall back to the
  whole service when the request type is missing, and keep the old rule for anything unlinked. Before
  switching a „show when content” rule to „show when possible”, simulate the seed generator in node
  (extract `buildDosare` with sed into a .cjs) and list every (service, type, status, alert) combo: the
  seed config must not contradict seeded content (a free sub-service with `asteaptaPlata` rows, an RT
  without avizare whose row has an `inAvizare` alert) — fix the seed, and never hide content a case
  already has. Hide the matching case-flow operation too, or the tab reappears after the action.
  Baseline every `dos-*` state's tab strip before / after (probe `[data-dosar-tab]` + aria-selected)
  and diff — it showed dos-02c / dos-03 had silently fallen back to Date generale before the change.
- 2026-10-14 · Dosar › Documente însoțitoare (stacked list + document modal): „the latest version” = the
  Documente generate list + `#dosar-detail-modal` — a new `kind` in `openDosarDetail` and a list renderer cost
  ~150 lines, zero new components. The „preview area” the brief asked for was NOT in Figma 04e → reused the
  template previews' grey `.e-permits-doc-peek__canvas` + A4 `.e-permits-dtpl__page` zoomed in JS (one small
  CSS modifier). Traps: (1) my single-class modifier lost to `.e-permits-doc-peek__canvas { flex: 1 1 auto;
  min-height: 0 }` defined LATER in the file → the canvas collapsed to 48px; scope it (`.e-permits-detail-modal
  .x`) and measure clientHeight; (2) `syncStackMetaRows` (no leading dot on wrapped meta lines) only observed
  the passport panel → every dossier stacked list showed „· …” at line starts on phones; now it also observes
  `[data-dosar-profil-panel]`; (3) a ⋮ menu inside an `is-clickable` row inherits `cursor: pointer` → the
  hover audit counted its `li` as interactive („no-hover”) → `cursor: default` on the menu. Seed realism: the
  passport docs are 1 per service, so the dossier catalogue lives in e-permits-workplace.json by request type
  (post-processes add the previous act from MDocs, as the FO step 3); the story dossier D-2026-004575 is a
  **Duplicat** of the alcohol licence in the seed (not Eliberare, as the Figma header suggests). Empty state
  via a demo-only `&documente=0` (resets `row.profil`). No sub-agent tool → ran hover-audit / code-audit
  myself; leftovers = A4 page mm padding + info-card 11/7 rhythm + copy-code (pre-existing FPs).
- 2026-10-14 · Builder „when I select an element hover breaks” (real browser only). CDP — headless, intercepted
  drags, even headed Chrome — never froze hover; what I found and fixed: (1) VISIBLE: the selected card's
  `:hover` dropped its inset ring and lightened the halo — the cursor sits on the card right after the click, so
  „hover” read as „deselected”. A selected item's hover must be STRONGER than its rest (ring kept, halo
  `brand-secondary-active`, `--shadow-200`), and focus-visible + hover keeps the ring. Look at rest/hover crops
  of every SELECTED item (pairs.mjs pattern) — the hover audit only says „changed”, not „changed the right way”.
  (2) Native DnD on a whole card: a click with 3–5 px of movement = a drag session (click swallowed; on a real
  Mac the OS drag loop eats the mouseup and Chrome keeps hover frozen — CDP input skips that loop). Cards now
  arm `draggable` only from their tools row; chips / palette items keep it but a drag < 10 px that changed
  nothing runs as the click (6 px was too tight). (3) `dragend` after a drop that re-renders the source fires on
  a DETACHED node — no ancestor/document listener sees it; listen on the source itself
  (`addEventListener("dragend", …, { once: true })` at dragstart). Proved with a synthetic probe on a HEAD
  worktree (:8936): mid-drag re-render left `is-dragging-component` → `pointer-events: none` on every card's
  render/foot; fixed tree clean. (4) Delayed `setTimeout(() => add("is-dragging"))` must check the drag is
  still current; pointer-capture resizes stop once on pointerup/cancel/`lostpointercapture`/blur + release.
- 2026-10-14 · Headed-Chrome CDP traps: `Page.captureScreenshot` RESETS `:hover` (pixel hover checks only work
  headless); an off-screen headed window gets throttled (clicks „don't select”, transitions never advance →
  fake NOVISUAL) → launch with `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding
  --disable-background-timer-throttling`. Headed native drag works with plain press/move/release (no
  `setInterceptDrags`). Scratch harness: scratchpad/hovsel/{cdp.mjs (HEADED=1), repro.mjs, detached.mjs}.
- 2026-10-14 · User: „Lățime = a line with real columns, not the 3·4·6·8·12 segmented” → `widthPicker()` (12 equal
  bars, one radio per allowed width covering its columns; grid column = 4 parts, `auto` ≡ Medie since fo-grid
  weighs it 3). The OLD picker's CSS was still alive in e-permits-acte-permisive.css and silently overrode the
  new one (button height 32 / centred caption) — before reusing an old class name, grep every CSS file for it
  and delete dead rules. Hover preview with no JS: `option:is(:hover, :has(~ option:hover)) bar:not(.is-filled)`
  (would fill) + `option:hover ~ option bar.is-filled` (would empty). Open menu triggers in the builder now get
  a hover too (open = tertiary-hover + ring, hover = tertiary-active) — mind specificity: my scoped open rule
  tied the shell `:hover` rule and won by order until I added its own `:hover`.
