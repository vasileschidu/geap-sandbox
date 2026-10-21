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
- 2026-10-14 · „One document pattern everywhere” (BO dossier însoțitoare / generate / Act-Decizie, passport types,
  FO picker / field values / Verificare / post-process act, Cabinet dossier + catalog) + „lone view action = 👁 Detalii”.
  What worked: define ONE data shape first (`sursa, tip, nr, fisier, size, verb, at, de, semnat, tags`), then one
  renderer per product (BO `renderDosarDocItem`, FO `foDocContentHtml`, Cabinet `CabEvo.docRowHtml`) and one modal
  branch for every doc kind. FO field values carry their shape in `data-fo-doc` so the Verificare summary renders from
  data instead of scraping `.__name` / `.__size` text. Seed: catalogue-driven builders (`documenteGenerate` in the
  workplace JSON) re-used by the flow's end step (`profile.acte = buildDosarActe(row, true)`) — never a second literal.
- 2026-10-14 · Traps: (1) the Verificare summary queried step 3 with `!el.closest("[hidden]")` — the step-3 PANEL is
  hidden while step 4 shows → empty list; filter hidden fields, not hidden ancestors. (2) Reusing `.e-permits-fo-file-
  item__name` on a meta span made the file name bold (the class has its own type) — keep hook classes off meta parts.
  (3) The seed paid fees AFTER „today” (verificatLa + n days) — new documents with dates made it visible; cap seeded
  dates at `dossierDb.today`. (4) `?stare=semnat|eliberat` changed the status but not `dataSemnarii` / `nrActEmis` →
  signed cases showed „Proiect”; the demo handler now syncs them and resets `row.profil`. (5) „de MPay · Semnat
  electronic de MPay” — drop the signer when it is the producer.
- 2026-10-14 · Row hover „cut off” (user): the stacked list had `padding: 0 20px` on the LIST → every row fill stopped
  20px short. Fix in the shared component: inset on the row, divider as an inset `::before` (rest look unchanged,
  hides around the band), `--stack-radius − 1px` on the outer rows, keep the band while ⋮ is open / focus-visible.
  After that the grey „Detalii” melted into the grey band → white button on the band. Check with real-mouse crops of
  first / middle / last rows (scratch rowhover.mjs: measures row x vs card x, bg, radius) — hover-audit only says
  „changed”. A row class that set its own negative margins (`.e-permits-rt__action.is-previewing`) had to follow.
- 2026-10-14 · No sub-agent tool again → ran code-audit + hover-audit myself. Standing FPs unchanged (A4 page mm
  padding, info-card 11/7, FO-specific buttons, copy-code, `.u-visually-hidden`, FO timeline grey). Real finds fixed:
  px literals in a mobile rule (→ spacing tokens), the selected picker card had no hover (pre-existing).
- 2026-10-14 · „Semnat electronic” = a blue Small tag with `icon-signature` next to the title, never meta text (user).
  The library `.status-tag:has(svg)` padding (3/8/3/6) beats `--small` by specificity → a Small tag with an icon is
  22 high next to 20-high tags; scope `padding: 1px 6px 1px 4px` (16 icon + 2 + the subtle 1px border = 20) and
  MEASURE heights side by side. Also: a renderer edit mid-regression left one state with a SyntaxError (duplicate
  `const`) — re-run states captured while the file was broken before calling them regressions.
- 2026-10-14 · Phones: stacked rows become flex columns at ≤760, so a lead icon sat alone above the title — rows with a
  lead are a 2-column grid there (icon · text, actions under the text). Long section-heading metas clip at 375 → keep
  them short („6 documente · 6 semnate”).
- 2026-10-14 · „One empty state everywhere” (user, on „Configurează tipul de solicitare”): ~30 bespoke empties
  (hint `<p>`s, `__empty` classes, grey cards, FO infobox, `.cab-empty`, `.rap-empty-state`) → `GEAPEmptyState` only,
  variant by CONTAINER (normal page · compact drawer/modal/panel · bare table/list · bare + compact menu/popover).
  What paid off: (1) a desktop sweep of ~890 states in 4 parallel headless workers (scratch empty/check.mjs +
  probe listing visible `.e-permits-empty` titles + variant) gave the „where is each one shown” inventory and
  the regression check in one go; (2) the component resolves its sprite path from `document.currentScript.src`,
  so sub-pages no longer need `fixAssets`; (3) `[hidden]` on the component + `tableRow()` removed the need for
  per-screen wrappers. When a list's „Adaugă …” sits right under its own empty state, move it INTO the empty
  state while empty (one button, never two). Reset labels follow the page's own control („Șterge filtrele” in
  BO, „Resetează filtrele” in Cabinet / RAP) — not a new word.
- 2026-10-14 · Demo-state trap: I added `svc-04t1` without grepping — the id already existed further down, the
  later key silently won and my „new” state never ran (three „why does the filter not apply” rounds). Always
  `grep -c '"<id>"'` before adding, and check `uniq -d` on all ids after. Also: a passport list's filter bar is
  OPEN when a default filter is applied — clicking `[data-sf-toggle]` closes it; facet picks need the popover's
  „Confirmă” before „Aplică filtrele”.
- 2026-10-14 · Action from inside a drawer that needs another drawer (rt › Taxe › „Adaugă taxă”): reuse the
  project's hand-over pattern (pay → tariff): park the first drawer (`hidden`, draft kept, `parked` flag), open
  the second prefilled, and on its close resume the first on the same tab. Two stacked drawers looked unfinished
  (the lower one is not dimmed).
- 2026-10-14 · Empty-state job, other finds: the rt / tariff drawer tab row had `overflow: visible` on phones, so
  focusing a tab near the end scrolled the WHOLE drawer body sideways (content cut on the left) — fixed with
  `overflow-x: auto` on `.e-permits-tariff__tabs .tab-buttons` ≤768; probe `scrollLeft` of the drawer body on 375.
  The registry fallback said „Nu sunt dosare pentru filtrul curent” for a search in ANY registry (eKYC sessions) —
  a product `emptyHtml` returning null falls through to BO wording; give products their own nothing-yet. No
  sub-agent tool → ran code-audit / hover-audit myself; leftovers were standing FPs (library search × overlap,
  steps-strip check icon, fo-select chevron) and a pre-existing „Anonimizează” checkbox without hover (svc-10l1).
- 2026-10-14 · eKYC „Alerte active” redesign (Figma 10372:692 „cooler and simpler”): tile + one-line title / time +
  2-line text, no severity tag (hidden „Critică: ” prefix), × = library icon-only Strict revealed on hover /
  focus-within and taking the time's place (`@media (hover: none)` keeps both). User corrections mid-job: the action
  chevron, then the 16px svg arrow, were „too big” → the arrow is a CHARACTER inside the label (`Deschide
  furnizorul&nbsp;→`), no icon. „Every alert must take you somewhere” → `ALERT_TARGETS` by seed `kind`/`ref`; the
  permission test is simply „does the role's nav have the target item” (`[data-nav-item][data-nav-id]`), navigation =
  `navItem.click()` (runs the shell's beforeNavigate) then a product route / tab / row flash. Filters on landing
  needed ONE shell hook (`api.setRegistryFilters`). Card-as-link = real `<a>` on the title + a card click handler
  (not a stretched `::after`, which would steal the text tooltips from the description); focus ring via `:has()`.
- 2026-10-14 · Seed text must match what the landing shows: the old alerts named a use case (MERCHANT_PILOT) and SDK
  versions that do not exist, and a „38% in the last hour” that the history seed contradicts (0 rejections in 24 h)
  → reworded from the data; regenerated and proved every other top-level key byte-identical.
- 2026-10-14 · Demo traps again: a script cannot set `:hover` → a `[data-demo-hover]` hook in the same selectors;
  `el.focus()` in headless = no focus events (tooltip demo needs a dispatched `focusin`) and no `:focus-visible`
  (prove the ring with real CDP Tab presses); the clip script's `scrollIntoView` hides scroll-sensitive tooltips —
  use a viewport shot. Hover-audit flagged the title link „no-hover” (only the CARD changed) → underline the title
  while an actionable card is hovered. Code-audit „controls-overlap” on phones = padding-right kept for the × made
  the link box run under it → margin instead.
- 2026-10-14 · Phones: a one-line title next to time + × kept 3 words („Furnizor indisponibil: V…”) and touch has no
  tooltip → at ≤760 `__head` `display: contents` + body grid: title full width (2 lines), time on the action line.
- 2026-10-14 · „+N” tag cells: the shared `renderUserRoles` always showed 2 shrunk tags (both ellipsised) and eKYC had a
  wrapping copy (`chips()` with `passport__tag-list` → 2-line cells). Now ONE helper renders every value and
  `fitTagRows()` keeps the whole tags that fit + „+N”. Traps: shrunk flex items under-report `scrollWidth` (measure
  with `flex-shrink: 0` for a moment); a table drawn while hidden measures 0 → ResizeObserver on the table; author
  `display` beats the `[hidden]` attribute → scope `> [hidden] { display: none }`. Checked the permits BO Utilizatori
  list too (shared helper). No sub-agent tool → ran code-audit + hover-audit myself; leftovers were standing FPs
  (`.u-visually-hidden`, section heading 11/11, th sort buttons, copy-code) and ek-03e (focus on the next × = hover
  look by design).
- 2026-10-14 · Process Designer batches 0–1 (`js/process-designer.js`, `core/process-model.js`, `css/process-designer.css`):
  building the WHOLE overlay in JS (appended to `<body>`) kept shared-file edits to 2 lines of `<head>` + 2 guards in the
  shell + one demo-states block, while another agent edited the tree. „Open → save byte-identical” = reproduce the
  export's layout rules in `serialize()` (depth-based inline vs multiline) and prove it with a Node test
  (`tools/process-designer/roundtrip.mjs`) before writing UI; delete emptied optional keys so edit + reverse = same bytes.
- 2026-10-14 · Canvas traps: (1) the shell's document click handler closes every `[data-stack-menu]` → a menu opened on
  pointerup (connect released on empty canvas, the „+” handle) must open in `setTimeout(0)`, after the click; (2) a hash
  route the shell does not know (`#flux/…`) is rewritten by `writeHash` / `restorePageHash` — guard it in the shell AND
  read `location.hash` at the top of the deferred script; (3) `aria-pressed` / `aria-expanded` on `.btn` = permanent
  focus ring (product rule) → tool choices are `role=radio` + `aria-checked`; a collapse button inside its own panel gets
  neither; (4) library `.btn.btn-sm.btn-strict` (0,3,0) beats a single-class pressed rule — scope with the toolbar;
  (5) programmatic / AT clicks have `detail === 0` — add click handlers for them next to pointer-only gestures, then demo
  states can use `h.click` on canvas nodes / palette items; (6) hover-audit „no-hover” on canvas items is often an
  element outside the viewport (probe `getBoundingClientRect` + `elementFromPoint` before fixing CSS).
- 2026-10-14 · User direction mid-job: canvas nodes in the GEAP **site-map card** language (white card r16, strong type tag
  in the element colour, grey id chip, semibold title; thin grey elbows; calm diamond / circles with the colour on the
  icon only; floating cards white + border + r16). The export's coordinates are dense (events 70 px apart), so the drawn
  box (`PM.VIEW`, 184×94 cards) is centred on the export's anchor box (`PM.SIZE`) — stored x / y keep their meaning;
  run an overlap check over the seed before choosing a card size (200 wide touched a neighbour, 184 does not). The
  description note of the site-map card did not fit that density → it lives in the panel (deviation, reported).
- 2026-10-14 · Perf proof that convinced: rAF frame deltas recorded in the page during REAL CDP input (middle-drag pan,
  ctrl+wheel zoom, node drag) + a `longtask` PerformanceObserver: 16.7 ms p95, no long task; `performance.measure` from
  open() to the fitted frame (103 ms). A regression worker can stall silently — when a log stops growing, kill it and
  re-run only the states not reported.
- 2026-10-14 · Document cards on phones („optimize for mobile”): separators as ELEMENTS between parts always leave
  an orphan dot at a wrap (end of a line in FO, start of the next with ::before). CSS-only fix that works at any
  width: each part `padding-left: 16` + `::before` dot inside that padding, the meta box `margin-left: -16` +
  `clip-path: inset(0 0 0 16)` → the dot of whichever part starts a line is clipped. Logical lines are
  `display: contents` on desktop (zero pixel change; proved by diffing card / icon / title / action geometry
  from before/after probes + crops — byte diffs are useless when upload stamps show the current time) and flex
  rows on phones. Keep the dot INSIDE the part's padding box, or `overflow: hidden` for the file ellipsis clips it.
- 2026-10-14 · Traps this job: (1) my `.line > .part--file { flex: 0 1 auto }` lost to a `.line:has(…) > .part
  { flex: none }` rule (`:has()` adds its argument's specificity) → nothing ellipsized, the size was cut; repeat
  the `:has()` in the winning rule. (2) A number + file + size in one nowrap line ellipsizes the file to nothing →
  number on its own line when a file name exists, else „number · size”. (3) Flex label with a text node + star
  = the text becomes one anonymous flex item, the star drops to its own line; `display: block` + a star with
  zero advance (margins 2 / −14 for a 12 icon) + 18 right padding keeps it on the last word at 320–720 (probe
  with Range rects of the text node). (4) Labelled buttons beside the text on phones squeeze titles to 2 lines
  → under the text, like Cabinet / BO.
- 2026-10-14 · „Cards have no top/bottom padding” (user, Finalizare certificate): two source bugs — the finish
  card was `padding: 0 12` relying on `min-height: 70` + centring (fine on desktop, glued to the edges once it
  wraps), and the uploaded field value carries BOTH `.e-permits-fo-doc-attached-item` and the later
  `.e-permits-fo-file-item` (`height: 48; padding: 0 16; overflow: hidden`) → a 2-line value was clipped.
  Measure padding per CONTEXT (scratch docm/pad.mjs: computed padding + first/last leaf inset per container at
  1440 and 375) instead of trusting the component's own rule; a class shared by an older row can override it.
  Real HEAD baselines from a worktree on :8936 (a „before” captured after editing CSS is not a before).
- 2026-10-14 · Process Designer batches 2–4 (configuration, lifecycle, premium) in one job: model-first again — every new
  operation (lane reorder / resize / remove, edge split, auto-layout, case path, guard checks) went into
  `core/process-model.js` with a Node check in `roundtrip.mjs` BEFORE any UI (14 → 33 checks, all byte-exact). The UI then
  only calls the model inside one `edit(fn)` helper (checkpoint → mutate → reindex → commit), which kept 60+ panel actions
  consistent and undoable.
- 2026-10-14 · Byte-identical round trip has a second trap after „delete emptied keys”: a key the edit deleted and the reverse
  re-adds lands at the END of the object. Fix = `PM.putKey / setKey(obj, key, value, kind)` with the export's key order per
  object kind (root / state / properties / transition / lane / condition / term); test it by deleting every optional key of
  every transition of the seed and re-adding them in a scrambled order. My first tests also failed because the seed already
  had the keys I „added” (node6 has StatusId and a formName) — read the seed object before writing an edit + reverse test.
- 2026-10-14 · Absolutely positioned children of a TRANSFORMED parent can never paint above the next sibling (the transform
  makes a stacking context; `z-index` stays inside it): the lane-height strips on each lane's bottom edge were under the
  next lane, `elementsFromPoint` showed it. Render such handles as siblings after all lanes, positioned from the model.
- 2026-10-14 · A module can plug a registry into the BO workplace engine with ONE shell line: `productRegistry(kind)` also reads
  `window.GEAPShellRegistries[kind]` (renderCell / searchText / sortValue / filterToken / openRow / emptyHtml / exportRows +
  `build()`), plus the nav dispatch and the column-width kind list. The nav icon is a CSS mask per `data-nav-id` (an
  `iconAsset` alone renders as a filled square in the specialist nav) — add the mask rule. A registry built before its
  async data exists must load and redraw itself (`build()` schedules `ensureDb().then(refresh)`), else the state times out.
- 2026-10-14 · Cross-module live refresh (designer publish → request-type drawer) = a tiny shell hook
  `window.GEAPShellFlows.upsert({ id, name, version, definition })` that queues calls made before the services load and
  re-renders an open drawer; other tabs follow via the `storage` event. Gate the start-up sync on an EXISTING sandbox DB, so
  a fresh profile (every demo state, every regression run) changes nothing.
- 2026-10-14 · Below 720 the spec replaced the canvas with the list view → every canvas-only demo step (`h.click(node)`) broke
  at 375; demo helpers now fall back to the list (`pick` clicks `[data-pd-list-node]`). Floating cards that sit over the
  canvas (the case-trace card) must hide when the list shows — put their content in the list head instead.
- 2026-10-14 · Publish modal: a warning that matters (W3 „avizare lost”) was below the fold behind four „unused variable”
  notes — order warnings by consequence and keep housekeeping notes in the issues menu only. Visual check of every modal
  state, not just „state ok”.
- 2026-10-14 · QA finds of this job: (1) a row ⋮ menu inside a registry TABLE is clipped by the table scroller — the shell
  already has `data-stack-menu-fixed` (opens fixed under the trigger); raising the cell's z-index did nothing. (2) A panel
  that re-renders on focusout rebuilt the „open” trigger of a picker modal as closed (`aria-expanded` lost) — render open
  state from the picker's own state, not from a class set once. (3) A state-coloured node (case trace) overrode its own
  hover (same specificity, later rule) — every new „state” class needs its `:hover` twin. (4) hover-audit „no-hover” on
  canvas items again = off-screen elements (46 of 46 here, filter by the reported x / y before fixing). No sub-agent tool
  → ran hover-audit / code-audit / regression (405 svc / fb / dos / fo states + 82 pd states) myself.
- 2026-10-15 · Document cards = stack meta + one surface + one layout (6 user rounds in one job). Final: meta 12 / 20
  tertiary, 2px `currentColor` dot, 8 · 2 · 8 (clip trick re-numbered: part `padding-left` 18 = `8 × 2 + 2`, dot at 8,
  box `margin-left: −18` + `clip-path: inset(0 0 0 18)`); card grid `24 | 1fr | auto` with the content block
  `display: contents`, icon `grid-row: 1 / -1` centred; title `flex: 1 1 64px; max-width: max-content` = tags RIGHT
  after the title, title truncates first, tags wrap only below 64 of title (no JS, no DOM change). Rejected on the
  way: meta/tags at the full card width under the icon, tags + meta in one inline row, tags pushed to the right.
  Lesson: when a brief keeps moving, keep each layout in ONE replaceable CSS block (grep-able comment header) so a
  new direction is one block swap, and re-measure with the same probes after each swap.
- 2026-10-15 · „The small tag is too small on phones”: the library `.status-tag--small` reads the RESPONSIVE token
  `--text-caption-md-font-size` (main.css drops it to 10 at ≤720). Fix without touching main.css: re-declare the
  token on the component class (`.e-permits-fo-doc-tag { --text-caption-md-font-size: var(--font-size-fs-12) }`).
  Grep main.css `@media` token overrides before blaming a product rule.
- 2026-10-15 · Different surface on two variants of „the same” card = a later generic rule of equal specificity
  (`.e-permits-fo-file-item` bg tertiary / r8) overriding the variant (`.e-permits-fo-doc-attached-item` secondary /
  r12) — second time this class pair bit us. Put the shared surface in ONE `:is(...):has(> content)` rule (higher
  specificity) and delete the per-variant surface declarations.
- 2026-10-15 · Probes for `display: contents` boxes: a contents element has a 0×0 rect, so „visible?” checks on
  the meta skipped it and „gaps []” looked like success — test visibility on the children and read the clip from
  the nearest boxed ancestor. Ellipsized file names add up to a character of slack before the next dot (16–19
  instead of 8): expected, the BO stack has it too.
- 2026-10-15 · Truncating a title that used to wrap (BO stack rows) needs a tooltip in the SAME change — the code
  audit's `clipped-text-no-tooltip` caught it; `renderStackItem` now sets `title` from `item.plainTitle` for rows
  with a lead. HEAD baselines from a worktree on :8936 again (python http.server) made the before/after tables
  honest; desktop geometry diff (edges probe) proved „desktop unchanged” before the user widened the scope.
- 2026-10-15 · No sub-agent tool → ran code-audit + hover-audit myself (scoped: FO page, doc modal, dossier panel,
  rt drawer, Cabinet). Leftovers = standing FPs (FO-specific buttons, copy-code, 18px composite gap — the reference
  stack meta is flagged for the same 18, label `padding-right: 18` from 2026-10-14).

- 2026-10-15 (user, repeated many times): every „Exportă …” action (table toolbar, menus, JSON export in builders) uses the sprite `icon-export` (arrow over tray, central „arrow-inbox, download”), never `download`. Grep for `Exportă` + `download` before shipping any export button.
- 2026-10-15 · Token audit („why no tokens for radius / padding / gaps”): `tools/ui-qa/raw-px-audit.mjs` lists every px
  outside `var(--token, fallback)` per family; padding / margin / gap / radius / border width / font-size / line-height
  must stay at 0 token-able px (`--strict`). 990 replacements by a script (masked parser: comments, strings, url() and
  `var(…)` blanked, offsets kept; replace back-to-front; negatives `calc(var(--spacing-N, Npx) * -1)`; 1 / 1.5px in
  spacing and inside a radius `calc()` → `--border-width-*`). Off-scale values (10, 11, 28, 24 radius…) stay raw and are
  listed for the PO; only ±1 border compensations that a comment documents became `calc(token ± --border-width-1)`.
- 2026-10-15 · Proving „no visual change”: before/after from a HEAD `git worktree` on :8936 (no-cache python server),
  never from the shared tree. Headless pixel captures are NOT deterministic across runs (GPU raster: ±1 grey on
  shadow / curve edges, 27 px in a state with identical CSS; HEAD-vs-HEAD differed in 125 of 254 shots): classify a
  state as identical when ANY HEAD capture equals ANY after capture, recapture the rest side by side, and for states
  that are flaky on HEAD itself compare computed styles + rects of every element (scratch probe.mjs / cmpstyles.cjs).
  `--border-radius-full` is 9999px in main.css while old fallbacks say 999px — the computed radius changes, the render
  does not (normalise it in style diffs). capture.mjs now records `demoState` + prints DEMO-ERROR (an `:error` state
  printed „ok” before); 61 mobile BO states are `:error` on HEAD too (nav hidden ≤960). Don't run > 8 capture workers:
  „Chrome did not start” under load — re-run the missing ones.
- 2026-10-15 · Parallel agents edited the same two CSS files during the job → staged my result as index blobs built
  from HEAD + the same deterministic script (`git hash-object -w` + `git update-index --cacheinfo`), leaving their hunks
  unstaged. A coordinator „rule body is empty” report was a transient state of the other agent's edit — read the file
  before „restoring” anything.
- 2026-10-15 · Doc card (sm-05e): labelled actions hold column 3 on ALL rows on desktop, so meta at `2 / -1` ran under
  „Detalii” → at ≥721 a card with `> :is(.cab-doc__actions, .btn)` keeps the meta in column 2 (× / check and phones keep
  2 / -1). Probe meta right edge vs actions left before calling it done.
- 2026-10-15 · Header instance switcher („focus state when open + align the menu”, FOD 756:25276): the open ring
  already existed but in THREE idioms (FO 3+5 via `.is-open`, BO 2+4, `.btn` 2+5) → one canonical ring on
  `[aria-expanded="true"]` for both triggers. „Aligned” was fine at 1440 / 1024 (right edges equal) but the gap was
  13 (container 54 vs trigger 52 + `100% + 12`) and at 375 the FO / Cabinet menu sat flush with the SCREEN edge
  (offset counted the menu button gap twice) UNDER the sticky mobile progress (z 20 > header z 10); the BO menu
  ran 5px off-screen. Lesson: measure trigger vs menu rects at 1440 / 1024 / 375 (scratch sw/probe.mjs) — the
  desktop shot alone looked right. Hover-audit on the open menu found the selected role and „Ieșire” with no hover
  (hover = rest colour) → option-card rule (brand-secondary-hover) / tertiary-hover. Concurrent px→token agent in
  the same CSS: kept my edits as asserted (old → new) pairs in one script and staged HEAD + those pairs.
- 2026-10-15 · „Configurare flux resets the flow” (user): the panel's `apply()` called `applyFrontOfficeSchema`
  (redraws every step + `frontOfficeGuest = null`) and then routed to the picker / gate — every option wiped the
  answers and sent the user to the start. Fix = ONE router in the panel: read the position (screen + step), patch
  only the schema keys the panel owns on the LIVE schema (no step redraw), then route back: same step → last step
  before it → first; configurations without a wizard for this user PARK the step and the next allowing change
  resumes it. Mode switches (MPass ⇄ guest) redraw only the steps that differ (3 / 5 / 7) through
  `rerenderFoStepsKeeping` (moves the attached-file DOM nodes, restores radios / checkboxes / text by
  name+value or id). Test panels must mirror the page's real state (`syncFromPage`): a guest reached via #guest
  while the panel said „Autentificat / Necesară” was signed in / sent to the gate by an unrelated option.
- 2026-10-15 · Redrawing one block inside a step: `initFrontOfficeDynamicControls(root)` only matches
  descendants (`root.querySelectorAll`) — for a replaced block call the binders on the node itself
  (`initCascadeAddress(node)`) and refill through the component's own API (`searchRoot.foCascadeAddressFill`),
  never by copying select texts. Probe scripts with injected EVAL: declare helpers (`w`, `pick`) BEFORE they are
  used in the pasted string (TDZ error came back as `{}`); wrap in try/catch returning `e.stack`.
- 2026-10-15 · The Verificare demo fill (`populateFrontOfficeStep4`) attached an MDocs document for guests too →
  gated with `!frontOfficeGuest`. Hidden-on-phone targets (FO stepper) break mobile demo states — dispatch the
  delegated click on the element directly. No sub-agent tool → ran code-audit / hover-audit myself: panel 0 / 0;
  wizard after the switch = same counts as the untouched baseline (fo-04g), standing FPs only.
- 2026-10-15 · Ghișeu (Feature 95768, 9 stories) as a BO **module**, not a product: four generic shell hooks made it a
  ~2 400-line `js/ghiseu.js` with ~40 lines of shell edits — `GEAPShellRegistries[kind].facets`, a menu item
  `shellView: "<kind>-registry"` (no per-module nav code), `window.GEAPShellRoutes` (asked first by routeFromHash),
  `window.GEAPShellApi` (the product api, now built always) and `[data-shell-module-page]` (hidden by
  hideProfilePanels). Next BO module: reuse these, don't add per-module branches to the shell.
- 2026-10-15 · Reusing the FO wizard inside the BO: the FO listens on the DOCUMENT for `[data-fo-step]`,
  `.e-permits-fo-draft-button` (shows „Schița a fost salvată.”), `[data-fo-edit-step]`, `[data-fo-open-doc-modal]` —
  use your own data hooks on FO classes (`data-gh-step`, `data-gh-goto`) and `stopPropagation` on the draft button;
  keep the doc modal hook (delegated, it is the reuse). Export FO helpers through `GEAPFormRender` instead of copying
  (`createRegistryLookup`, doc card / attach helpers); give FO renderers optional texts with the old defaults.
- 2026-10-15 · Cascade address: the raion / localitate hooks sit on the `.e-permits-fo-select` root
  (`[data-fo-cascade-raion] .e-permits-fo-select__value`), not on a `[data-fo-select-value]` child — read the DOM
  with a probe before writing a reader. Fill it with `searchRoot.foCascadeAddressFill(parts)`.
- 2026-10-15 · Demo links clear only `e-permits-*` / `geap.*` storage keys — name a module's store `e-permits-…` or
  every state starts from the previous run. Seed dates as day offsets from today so the list never looks stale.
- 2026-10-15 · The no-cache server fails fetches („Failed to fetch” on roles / services) when several headless Chromes
  load it in parallel — run state checks sequentially (one worker) on a busy machine. I also ran `pkill -f persona-cdp`
  to stop my stale capture: that pattern matches EVERY agent's capture Chrome — kill by your own PID / user-data-dir only.
- 2026-10-15 · CDP viewport shots taken right after a big re-render can miss sprite icons (paint lag) — re-shoot before
  „fixing” missing icons. The scratchpad can be wiped by a session restart: keep spec / scripts recreatable.
- 2026-10-15 · Ghișeu container change (user, mid-job): in-page wizard → „Dosar nou” picker = library `modal--lg`
  (bottom sheet ≤680) + the request in a library `modal--fullscreen` used as a sheet (24 from the top, radius 16
  top corners = the Form Builder sheet radius; no 24 token exists). Cheap because every step returned HTML and
  the container was one `render()`: the steps' footers became data (`footerHtml(d, opts)` stores options, the
  sheet draws `.modal-buttons`). Traps: js/modal.js binds `[data-close]` / overlay clicks only at init — dynamic
  overlays need their own close wiring (picker: `__modal.open/close` + an aria-hidden observer; sheet: own
  open/close so Esc can ask „Salvați schița?”); the fullscreen `.modal-buttons` brings its own border + sticky
  padding and the shell adds scroll hairlines on `.modal-content` → doubled dividers; put the sheet overlay
  under the library dialogs (z 990) so confirms / the FO document modal / previews stack above it; a toast in
  the top-right covers the sheet's × (hover-audit „covered”) — no toast when the result shows in place.
- 2026-10-15 · Stacked-list meta inside dialogs: syncStackMetaRows does not watch them → leading „·” on wrapped
  lines; `clip-path` on the meta box's left edge hides the row-start dot (it sits 10px left of the part).
- 2026-10-15 · Ghișeu split (user, two rounds): the picker holds only service + process; identification, the
  representative and — for Postproces — the holder's permit + the post-process eligible for its status live in the
  request's first step „Solicitant” (the eligible post-processes depend on the permits, so they cannot be picked in
  the modal). Keep step logic keyed by step ID (`CHECKS[id]`, `STEP_INDEX.x`), never by position: inserting a step
  then only shifted the seed `step` numbers (done by a regex over the JSON) and the demo ids. Disabled options that
  carry a reason tooltip still need a hover (hover-audit „no-hover”); the library `.modal` is `overflow: hidden`, so a
  demo `h.hover` / error `scrollIntoView` scrolled the dialog box itself — `overflow: clip` (third time this bit).
- 2026-10-15 · Ghișeu picker, round 3 (user: „put back the IDNP in the modal … the process must react to it”): the
  picker is Serviciu → Solicitant → Procesul → Actul (quick-create order of Dynamics / Salesforce / ServiceNow: who →
  what → which process; eligibility shown on the option as a count or a disabled reason). Lesson from three rounds
  in one day: render each picker part as its own `data-gh-block` with ONE renderer that branches on the container
  (`S.step === 0` picker vs flow) — moving identification between modal and flow cost only block wiring, never new
  markup. „Tip persoană” is never empty (user rule): normalize the value from the service, never validate it. The
  FO hides `.e-permits-fo-selected-role__change` ≤ 720 (its identity changes from the avatar menu) — any reuse outside
  the FO must bring it back, or a phone demo state fails with „not found” (capture's DEMO-ERROR caught it).
- 2026-10-15 · A list inside a dialog (the FO searchable list / CAEM combobox) is cut by the modal body: give the field
  `float: true` → `data-fo-float` → the FO fixed list layer `positionFloatingSelectList` (flips up, follows scroll /
  resize, reset on close). Never raise z-index or unclip the modal. A × inside an FO input = copy the library search
  clear exactly (`.btn-group > .btn-icon.clear`, 20 round tertiary, inset 4) — an unstyled `.btn-icon` is a 40px blob.
- 2026-10-15 · Ghișeu picker round 4 (user): 2 steps in the create-drawer step strip (`renderStepStrip`, now exported
  on `GEAPShellApi`) — „copy the stepper” means the same strip with its own padding and the header [divider] strip
  [divider] body structure; the library modal header has no divider, so the strip draws the top one. Dialog height
  = hug the content up to `100dvh − 2 × 24`; a height change glides with `el.animate()` from the measured old height
  (nothing left inline; skip with reduced motion) — a fixed height was rejected. Under lookup fields keep only status
  lines (found / manual / errors), never helper hints; hide `:empty` hints so they take no room.
- 2026-10-15 · Same UI in two places = one renderer, exported: the act row (FO #intent + Ghișeu) is the document card
  `.e-permits-fo-lib-item` + pill menu via `GEAPFormRender.actRowHtml(act, opts)`; the FO-only card CSS was deleted
  (the old `.e-permits-fo-intent-act` card rules came later in the file and would have overridden the doc card's
  padding / radius — when you re-skin with an existing component, delete the old rules, don't stack them). BO
  callers pass `menuClass: "e-permits-stack__menu"` for the BO menu size. When a menu lives in a scrolling dialog,
  open it up if the scroll box has no room below; catch Esc in a window capture listener (js/modal.js listens on the
  document in capture and would close the whole dialog).
- 2026-10-15 · Demo data rule (user): any 13 digits answer (seed or a deterministic fake from the digits), one
  reserved not-found code (9999999999999), first digit 0 = no acts. States that relied on „random code = not found”
  had to move to the reserved code — grep the demo states for every code when a lookup rule changes.
- 2026-10-15 · REJECTED designs (same day, user): (a) the 2-step „Dosar nou” modal with the drawer step strip, (b) a
  selected state on the act row with a „Postproces ales” band + ×. Final: the small modal is ONE screen (service +
  applicant); Continuă opens the request window on the FO intent screen (shared `GEAPFormRender.intentHtml`), and a
  choice there STARTS the request (no intermediate selected state; „Schimbă procesul” in ⋮ with a confirm). Lesson:
  when the FO already has a screen for a decision, reuse the screen and its behaviour (choice = go on) instead of
  inventing a picker-with-selection; ask „does the FO do this?” before building a selection state. Keep risky global
  changes (the shared strip's colours) out until the design settles — they were reverted with the stepper.
- 2026-10-15 · Lookups = the „Cod cadastral” search input with its submit (explicit search, disabled until 13 digits,
  `.loading` spinner, then the search clear ×). `setGuestFieldError` now also marks a `.search-input` box `is-error`.
  A 13-digit code + search icon + submit needs ≥ span-6 in a 720 modal (span-4 clipped the digits) → code 6 + names
  3 / 3 (`.e-permits-fo-field--span-3` added to the FO grid). The modal rhythm = flex/grid gaps only (24 / 12 / 16),
  FO section title padding + divider and body padding switched off inside the modal.
- 2026-10-15 · BUG (user): „Solicitare nouă” on the intent screen reopened the small modal — its hook `data-gh-new` was
  also the registry's „Dosar nou” hook, caught by a document-level listener. Never reuse a data-attribute name for a
  second meaning in the same module; grep the hook before naming it. Test the real click path with a probe
  (fill → Continuă → choice → close → reopen), not only the demo states (the demo for this path used the same
  attribute and still „passed” at the wrong screen until the ready selector caught it).
- 2026-10-15 · Rule (user: „just take from full flow, those should be components anyway”): every Ghișeu piece that
  exists in the FO calls the FO renderer — export it from `GEAPFormRender` with small options (changeAttrs /
  extraHtml) instead of copying markup. Done: intent screen, act rows, role card + group title, summary row,
  delivery option card, fields, documents. FO pieces still inline inside bigger FO functions (invoice card, finish
  hero / finish doc, summary section header) need extracting in the FO first — then swap the Ghișeu copies.
- 2026-10-15 · A search-input box without the leading icon still gets the library's medium `padding-left: 40`
  (it assumes the icon): add the `:not(:has(.icon-search))` variant with the FO input padding (12).
- 2026-10-15 · Ghișeu window = the FO step page inside a modal (user): FO h1 header without a lead, FO page width /
  sidebar / gutter untouched (custom `--fo-page-width` / `--fo-sidebar-width` / `--fo-page-gutter` moved the column
  20px), the FO step footer at the end of the step (exported `stepFooterHtml`) instead of a sticky window footer,
  the FO draft status in the header (`draftStatusHtml`), identity + representation + contact on one step like fo-02.
  Verify with a geometry probe against fo-02/03/05 (stepper x/w, content x/w, h1, section h2, body gaps, footer
  buttons) — the numbers make „looks like FO” checkable.
- 2026-10-15 · CSS cut by start/end markers in a long file removed ~290 lines (the end marker existed only far below
  after an earlier edit moved things). Before cutting by markers, print the span (line numbers) and check its size;
  after any cut, diff the removed selectors against HEAD.
- 2026-10-16 · The library segmented control has no icon slot (a coordinator note said it had): an icon inside
  `.segment-item` + `:has(> .icon)` gap 8 and `currentColor` keeps the label colour in every state; check the
  library before trusting a „the component supports X”. Option-group errors = message under the group + the
  library `checkbox--error` on the control only — never a red border around the option (user).
- 2026-10-16 · Section header + alert (user, whole project): keep the header divider; the alert right under it gets
  the section's content gap (24 in FO sections) — one generic adjacency rule, not per screen. A first version that
  removed the divider was revised by the user within minutes: for spacing complaints, fix the gap, not the divider.
  Find the affected places with a probe that lists matching pairs per state (only Ghișeu „Temeiul reprezentării”).
- 2026-10-16 · Misrouted request (user): a 2-column layout meant for the request window's identity cards was first
  applied to the small modal. When a layout request names „the FO full flow”, it is about a FO-mirroring surface
  (the window), not the picker — confirm the target screen before building.
- 2026-10-16 · „Salvează schița” went header → FO footer → header again (user): in the BO window the draft action
  is a window action (next to ⋮), the step footer is navigation only. On phones the header button goes icon-only
  (tooltip shows only for buttons without visible text — icon-tooltip.js), and the FO draft status must wrap.
  Demo validation for testers: accept any plausible value (phone ≥ 6 digits) — strict formats block demos.
- 2026-10-16 · Testers need to move freely (user): stepper rows open any step without validation (as the FO
  demo), „Înainte” validates, completed = reached + checks pass, and new requests are prefilled with the seed
  `fillDemo` up to the step that needs a real action (Verificare), with `?prefill=0` for the empty path. Prefill
  the data the tester would type, never the demo actions themselves (they must stay one click to try).
- 2026-10-16 · RECURRING user complaint — cramped text. No loose explanatory text between controls: an explanation
  is a notice (`renderNotice` with a bold title) placed in the rhythm (8 label → control, 16 between blocks, 24
  between sections, the header → alert gap), inside the block it explains (e.g. the procura note inside the procura
  document field: label row → 16 → notice → 16 → files). `tools/ui-qa/code-audit.mjs` now reports `tight-gap`
  (an alert / notice / loose paragraph < 8px from its neighbour) — run it on every touched state before a commit.
- 2026-10-16 · Reusing an FO renderer is not enough when the FO look is scoped to its panel
  (`[data-fo-step-panel="4"] .e-permits-fo-summary-card` = radius 24 / padding 8): give the scope a reusable class
  (`.e-permits-fo-review`) and put it on the host, then measure computed radius / padding / gaps against the FO
  state. Never „label: Da / Nu” tags — show the thing itself (document card) or a real-word status.
- 2026-10-16 · „Make X exactly like the reference” when the reference has the same bug: the user named svc-02
  „Tipuri solicitări” as the model for a button with right padding, but MEASURED it was flush too (button right
  inset 0, and 2 / 14 off-centre from the base `heading-tools` padding-bottom 12 meant for the non-BO heading).
  Measure the reference before copying it; fix the shared component (one BO rule: tools padding-right 12,
  padding-bottom 0, meta inside tools no extra padding) and route bare buttons through the same wrapper, then
  report the difference so Figma follows. A 676-state DOM sweep (scratch sh/sweep.mjs + hprobe.js: every visible
  title whose parent row holds a .btn / segmented, with insets and gap to next) gave the inventory and the
  before / after diff in one go — filter rowH ≤ 60 to drop drawer sections that merely contain buttons.
- 2026-10-16 · Phones: BO section headings are a fixed 48 row; the base ≤760 `flex-direction: column` + the ≤640
  `flex-wrap` sent the tools into a SECOND COLUMN off-screen (svc-02 button at x 474 on 375, pre-existing on HEAD).
  The eKYC product already had the fix (grid: title row, tools under) — generalise a product's fix to the BO
  instead of writing a new one; check a HEAD worktree (:8936) to know if a phone bug is yours.
- 2026-10-16 · „Tab strip too wide”: the page-header `.tab-buttons` had `width: 100%` (overriding the library
  `fit-content`) to draw a full-width track line. Hug the strip (`max-content`) and draw the line on the `.tabs`
  wrapper as a content-box background (a box-shadow would ignore the wrapper's inline padding — the template
  sheet's line would have gone full-bleed). Figma's `Profile / Tabs` also has a full-width `tab-buttons` frame —
  report it for the Figma follow-up. Without the Figma screen id (figma-a only lists the open page; parent ids
  can't be walked from a child), say so instead of guessing ids.
- 2026-10-16 · Dropdown audit (user: „all dropdown menus get the dropdown effect + clip content”, ref GEAP 2.0 9632:3226):
  „dropdown-effect” is a GEAP 2.0 Figma effect STYLE (0 0 0 1 @8 % ring · 0 4 6 −2 @5 % · 0 10 15 −3 @10 %), with NO CSS
  token (main.css has `--drop-shadow-100…600`; the `--shadow-100…400` of design-system.md are not defined at all). I first
  mapped it to `--drop-shadow-300` (the library dropdowns use it) and only found the truth in a parallel figma-designer
  commit (`tools/figma/dropdown-effect/`) — when the brief names a Figma style, `git log` / grep tools/figma for it
  BEFORE choosing a token. ONE rule `:where(<surface list>)` at the end of e-permits-acte-permisive.css (white, no border,
  r12, the effect as a literal once, `overflow: clip`, `cursor: default`): zero specificity, so scrolling lists keep their own `overflow: auto` and
  phone sheets keep their radius — but every per-menu background / border / radius / shadow had to be DELETED
  (11 rules), and library classes (`.select-dropdown`) and pages that don't load the file (e-permits-shell.html)
  need the values restated (or a real selector in the same rule list — per-selector specificity). Measure the Figma
  reference from the PNG (tiny zlib PNG reader, no PIL here): edge pixel 235 = a 1px @8 % ring, ~20px below = 0 10 15 −3.
- 2026-10-16 · Inventory method that worked: a probe listing every visible absolute/fixed painted surface + its
  descendants outside its rect, run over ALL 1 096 demo states (3 workers ≈ 60 min — start it first, in the
  background, and edit meanwhile). It found the surfaces greps missed and the dead ones (`.rap-filter__panel`,
  `.e-permits-builder__source-menu` have no markup — I edited rap-evo.css before checking and had to revert).
  Grep the markup for a class before touching its CSS. Then the new code-audit rule `dropdown-surface` proved
  before (HEAD worktree on :8936 flags every menu) / after (0 on 82 states × 2 viewports).
- 2026-10-16 · Side finds of the audit: the Cabinet act card ⋮ menu opened 71px off-screen left at 375 (right-anchored
  menu next to a left-side trigger → `left: 0; right: auto` on phones); hover gaps inside menus (selected date-picker
  day, CAEM subgenre active row + „Confirmă”); a builder rule `:is(button, [data-stack-menu]) { cursor: pointer }`
  made the whole menu a pointer → hover-audit counted its `li`s. Always measure open menus' rects at 375.
- 2026-10-16 · „Section header action still too close” (user): growing the heading to 56 (min-height 48 + 8, pad 4)
  gave 14 but dropped every title 2px (centred in 52). Better: keep the 48 row and add only a 4px bottom pad
  (`min-height: 48 + 4; padding-bottom: 4; box-sizing: border-box`) → button 8/8 in the row, 12 to the card, title
  unchanged; scope it to tools that hold a `.btn` / segmented (tag-only tools stay 48). A heading that already had
  its own margin for a taller control (ntpl Previzualizare, 52px switch) needs its own override, or the generic pad
  stacks on it. Phones: the base ≤760 heading `padding-bottom: 12` + the tools' 12 made 24 — zero the heading's own.
- 2026-10-16 · Table names „not truncated”: the cell stacks (`__role-identity` inline-flex, `__date-stack`) had no
  width cap, so the text ran UNDER the next (pinned) column; the td's own `text-overflow` never reaches text inside
  a nested flex box. Fix once for every stack in a `td`: container `max-width: 100%`, each line nowrap + hidden +
  ellipsis; an `inline-flex` meta line must become `block` (its text is an anonymous flex item → no ellipsis).
  js/table-cells.js then shows the tooltip with no attribute. Probe trap: a „clipped?” check that stops at the first
  ancestor with `text-overflow: ellipsis` (the td) says „fine” — only an ancestor holding the text in its OWN inline
  flow counts. The tables only clip below the column width — test 1280 / 1024, not just 1440.
- 2026-10-16 · Generic alert + alert gap: an adjacent-sibling margin ADDS to a parent's flex/grid gap and CSS can't
  read the gap → a sweep of ~900 states found the gap-spaced parents (Ghișeu `__notices` 12, library `.modal-content`
  16, FO payment body 32) and they are excluded by name in the rule. Run the pair sweep (al.js: adjacent alert
  pairs + parent display/gap + margins) before shipping any „generic sibling margin”.
- 2026-10-16 · code-audit measured NOTHING on unscoped runs („{}” for every state): its root was the first `<main>`
  in the DOM — the hidden flow-home `<main>`. Now the first VISIBLE main. A clean audit with zero standing false
  positives is a red flag: run the same state on HEAD (:8936) and expect known findings. Also taught it the cell
  tooltip (`clipped-text-no-tooltip` skips text in table cells on pages that load table-cells.js, and
  `[data-cell-tooltip]`) and nav labels (tight-gap FP). A CDP checker without a global timeout hung 11 min on one
  state — every scratch runner gets `setTimeout(exit)` + per-call `Promise.race` timeouts.
- 2026-10-16 · Ghișeu „Dosare noi” actions off-screen at 1440: the brief said Servicii / Fluxuri / Utilizatori pin
  their actions via a shared sticky rule — MEASURED, none did (srv-01 table 1344 in a 1184 view, trf-01 1376, actions
  hidden there too; flows only „works” because it fits). The shared sticky class existed only for the classifier grid
  (`.e-permits-workplace__actions-cell`, fixed 55 !important). Fix = a generic column flag `pin: "end"` (shell adds the
  class to th/td) + the 55 width limited to `:not([data-column])`; reported Servicii / Tarife as one-flag follow-ups.
  Measure the „reference” registries before copying them (probe: table vs wrap width, buttons' rects vs wrap +
  elementFromPoint). Traps found by looking at the shots: (1) a ⋮ menu opened inside a sticky td is painted over by
  the NEXT row's sticky td (same z-index, later in DOM) → lift the cell while its menu is open (`:has(menu:not([hidden]))`);
  (2) the action cell's content (144) wider than the config width − padding pushed ⋮ past the edge — width =
  content + 24; (3) a colspan empty state in a scrolled table centres in the TABLE width (off-screen at 375) → sticky
  inside `--workplace-view-width`; (4) a registry without a checkbox column must unpin nth-child(2) (the base rule pins
  it at left 43) and phones keep one pinned column only (number 144 + actions 168 left 63px of 375). One-line
  headers set the floor: „Data expirării notei de plată” needs 212, so 10 columns can't fit 1184 — scroll stays.
- 2026-10-16 · Act row locked note → full-width Mesaj · subtil warning (user, GEAP 11678:11710) + one post-process menu.
  (1) The same renderer looked different on the FO and in the Ghișeu because the Inline-note geometry is scoped to
  `[data-demo-flow="back-office"]` — the FO got the library's 16/24 message. Widen the scope with
  `:is([data-demo-flow="back-office"], .<component>)` (same specificity) instead of a per-screen copy. (2) Full width in
  the doc-card grid = `grid-column: 1 / -1` in an IMPLICIT row: the icon / action `1 / -1` end at the explicit rows,
  so they stay centred on title + meta for free. The BO inline-note rule sets `margin: 0` at (0,4,0) later in the file
  → the notice's own margin needed (0,5,0) (`.is-locked`). (3) „Menu bigger in the FO”: the Ghișeu caller passed
  `menuClass: "e-permits-stack__menu"`, the FO didn't — an option that decides the look per caller is a fork; the
  renderer now always adds it and the FO-only disabled rule (duplicate) went. (4) No FO state had a locked row → a
  demo-only param (`?incurs=<act id>`, pp-02d) instead of seed data that Cabinet also reads. (5) Another agent had
  uncommitted hunks in ghiseu.js / acte-permisive.js → staged HEAD + my asserted replacements as index blobs.
- 2026-10-16 · Ghișeu „Temeiul reprezentării” → FO full-flow layouts (user: „for MPower we use a specific type of layout”):
  success / info notices replaced by the FO renderers themselves — MPower = `authorizationCardHtml` exported as
  `GEAPFormRender.authorizationCardHtml(auth)` (optional `details` / `icon` with the old output as default, so fo-02 /
  cat-04 are untouched), RSUD = the same card with RSUD details (FO has no RSUD card — say so, don't invent one),
  Procură = the guest boxed upload wired like the Verificare olograf box (MutationObserver on the files box →
  `d.docs.procura`, the same key Documente însoțitoare reads, so the doc shows there already attached). Check the AC
  wording before moving an upload: US-233 says the copy is REQUIRED at Documente — attaching earlier is fine as long
  as that step keeps the check. Traps: (1) a card under a section header had 0 gap — the header → alert rule lists
  alert classes only; add the new block to the generic rule, not a per-screen margin; (2) the demo prefill skipped
  ALL documents once `d.docs` had any key (procura attached at step 1) — make „already filled” checks per document;
  (3) a phone demo that clicks the hidden stepper (`h.find` waits for visible) → dispatch `.click()` on the element.
- 2026-10-16 · „Too much space around the checkbox” (Figma 11685:12997, 64.5 frame around a bare 20 instance): measured
  the code first — the FO check option is 32 (6 / 8 own padding), 24 under the header (FO section-body top padding),
  24 to the next field group (FO grid row gap). Code was right; the Figma capture lost the option's padding and kept
  a tall wrapper. Report numbers, don't shave FO rhythm to match a capture.
- 2026-10-16 · Side find: Ghișeu role cards at 375 squeezed the company name to nothing — the FO keeps 2 columns on
  phones only because it HIDES „Schimbă” there; the desk brings „Schimbă” back, so its grid must stack
  (`.e-permits-gh .e-permits-fo-form__roles-grid` 1 column ≤720). When reusing an FO block, re-check the FO's phone
  assumptions for every piece you un-hide.
- 2026-10-16 · Act row hover ate the „Inițiază un postproces” pill (row hover = tertiary #F1F1F1 = the pill's fill). Fix =
  the project's grey-on-grey rule (`.cab-doc__actions > .btn-neutral`, stack „Detalii” on its band): on
  `.e-permits-fo-intent-act:is(:hover, .is-selected)` the pill is white until `:enabled:hover` / `:enabled:active` /
  `[aria-expanded="true"]`; open = pressed `secondary-active` + ring (before, open kept #F1F1F1 → only the ring showed on
  a hovered row). Write the exclusions as `:not(:enabled:hover)` — `:not(:hover)` would let a DISABLED pill on a hovered
  locked row fall back to grey and vanish. Whenever a card gets a hover fill, grep its inner `btn-neutral`s for the same
  fill. hover-audit can't see this (it hovers the pill, not the row) → probe: mouse on the row at x+40, read the pill's
  computed background, crop the row (scratch rowhover.mjs). „Solicitare nouă” = one button, nothing inside to lift.
- 2026-10-16 · „Unpublished banner too big” (user, ref Ghișeu notice GEAP 11881:272146): the template banner was a
  documented EXCEPTION to the inline note (16/24, 24 icon, × close, 72 tall) → now `renderNotice("warning", "<strong>…</strong> …",
  { className })` (44 tall on desktop, 64 on 375). `renderNotice` got an optional `className` placement hook; the × went
  (the note has no close slot — say so, don't bolt one on). Removing a `:not(.x)` exclusion from shared selectors LOWERS their
  specificity by (0,1,0) and can flip overrides elsewhere → swap it for an equivalent `:not(.message--inline)`. Sweep method
  that answered „are there other big banners?” in one go: a probe listing every visible alert's padding / radius / text size /
  icon / close, run over all 1 008 BO states on a HEAD worktree (:8936, 4 workers ≈ 35 min — start it FIRST), grouped by
  off-geometry signature. Only the template banner was off; passport „inactiv în RSSP” and classifier „Ciornă nepublicată”
  were already compact (the latter hand-written → routed through `renderNotice`). Known, left alone: eKYC titled callouts
  (20 pad, 16/24 — the Callout component) and cfg-card info notes at radius 8 (user rule 2026-10-09).
- 2026-10-16 · Figma QA bugs. (1) A new notification template stored `version: "—"` → the dash was truthy, so the
  unpublished notice read „Destinatarii primesc încă versiunea —” and the first publish became `vNaN..1`. Store
  null, read it through ONE helper (`ntplVersion(tpl)`: null for „—” / empty, because the sandbox DB keeps old
  data) and render „—” only at display time; grep every reader (`tpl.version` in header meta, publish subtitle,
  bump) — never let a display placeholder become data. (2) `.e-permits-fo-summary-row__value span` (text rule)
  hit the `span.status-tag` inside values → tags 14 px, text colour, cabinet flex gap 8. Fix with
  `span:where(:not(.status-tag, .status-tag *))` — `:where` keeps the old specificity, so no later override flips.
  The QA named FO Verificare / gh-07 / dossier cards, but a probe over fo-05…08, gh-07*, dos-*, sm-*, pp-* found
  tags in summary rows ONLY in Cabinet „Solicitările mele” (sm-03/04/05/07a) — probe before trusting the list of
  places. Two more traps the probe showed: the status tag there was not `--small` at all (added a `small`
  option to `statusTag()` for the summary row only), and `--small` drops to 10 px at ≤720 → pin
  `--text-caption-md-font-size: 12` on the value (as `.e-permits-fo-doc-tag`). No sub-agent tool → ran
  code-audit + hover-audit myself (only standing FPs: copy-value, toast-covered header in svc-09h5).
- 2026-10-16 · RAP „Filtru” = the BO advanced filter: „reuse, no second implementation” for a page that does not load
  the shell → MOVE the controller into its own file (`js/facet-filter.js`, `GEAPFacetFilter.create` with hooks for state /
  facets / options / tag / total / apply / pageKey) and its CSS into `css/facet-filter.css` loaded right AFTER
  e-permits-shell.css and BEFORE e-permits-acte-permisive.css (keeps every tie in the cascade as it was). Proof that the BO
  is identical: a behaviour probe (scratch ff/bo.mjs: click path toggle → chip → option → Confirmă → Aplică → Esc / outside
  / Mai multe / clear, snapshotting bar + popover HTML, focus, counts and computed styles of ~20 filter elements) on a HEAD
  worktree (:8937) vs the tree: 40 snapshots × 2 viewports byte-equal. Standalone pages miss BO-generic rules the
  component silently relies on: the menu base + dropdown surface (restated under `:where()` = zero specificity, same
  values), the open-button ring, the selected-chip hover (hover-audit caught it) — restate them scoped to the component at
  ≤ the BO specificity. Latent BO bug seen on the way: at 375 the bar keeps chips + „N rezultate · Șterge filtrele” on one
  row and a long first chip runs under the meta (RAP wraps them, scoped; BO left as is — report it). Another agent
  committed mid-job and bumped `?v=` on the same line → stage with a regex on the version, not the literal.
- 2026-10-16 · BUG I shipped in the filter commit: `openProfile` still called the removed `closeFilterPanel` — my leftover
  grep was case-sensitive (`filterPanel` ≠ `closeFilterPanel`) and no demo state opened a profile, so capture stayed green.
  After removing a feature: `grep -i` every removed function name, and run one state through EVERY screen of the page
  (list, profile, empty) — add the missing demo states first. Hot-fixed in its own commit (85fe69c5).
- 2026-10-16 · RAP act profile = BO page header + BO sections on a page that doesn't load the BO CSS: BO markup / class
  names in the renderer, their CSS for this page in `css/bo-profile-parts.css` written from the BO COMPUTED values
  (dos-01 / svc-01 / ntpl-03 probes — the base `.e-permits-dosar-profil__*` rules differ from the back-office-scoped ones,
  so read computed styles, not the first rule you grep). Proof = the same probe on both pages (gaps bc→title 8, title→meta
  0 + meta 12/8, header→first section 20, h2 48 · 11/12 · 18/26, card 8/20 r24 (r16 ≤760), rows 40 · 8/7 + 1, label 14/20
  #383838, value 14/20 500, tag 20 · 12/16 · inset tone border). A copy button inside a phone column row shrank to
  min-content (row-value `overflow-wrap: anywhere`) → `flex: 0 0 auto; white-space: nowrap` on the copy, scoped.
- 2026-10-17 · RAP „Vizualizare actul” (US-143) = the Cabinet document modal on a page without the FO CSS: same markup
  (FO doc-modal shell + `.e-permits-doc-peek__canvas` + A4 `.e-permits-dtpl__page`), CSS restated in a separate
  `css/doc-modal-parts.css` (the bo-profile-parts contract: never load where the originals load; FO hex literals →
  matching tokens). Traps: (1) a stroked inline svg with `class="icon"` renders as a black blob — the library `.icon`
  sets `fill: currentColor` → `fill: none` on that icon; (2) `--icon-size-default` is 24, the 20 one is
  `--icon-size-medium`; (3) fit-to-width zoom must subtract the canvas's COMPUTED padding (24 desktop / 16 sheet), not
  a hard 48; (4) a dialog whose page is the content: `height: 100%` on the dialog = the base `max-height` (no new px).
  Print = `body.<open-class> > :not(overlay) { display: none }` + zoom 1 !important on the page; verify with CDP
  `Emulation.setEmulatedMedia({ media: "print" })` (scratch tools/shot.mjs PRINT=1) — listed visible body children.
  Demo errors via `?mdocs=` keys mapped to the AC texts; the loading state never resolves with `incarcare`.
  Another agent committed rap-evo.css (`?v=w1024`) mid-job → bump versions with a regex, not the literal.
- 2026-10-17 · „RAP profile still differs from the BO” after a value-by-value copy: the copy matched every rule I had
  copied, but the INHERITED text setup was the RAP body's — 16/22.4, `-webkit-font-smoothing: auto` (subpixel = heavier
  text), `text-rendering: auto`, `font-synthesis: none` vs the BO body (`.e-permits-front-office-page`: 14/20, antialiased,
  geometricPrecision, kerning normal) + the BO `button { font-family / font-kerning / letter-spacing: inherit }` that makes
  the copy-code's −0.14px compute to `normal`. A page that hosts BO parts must restate the BO BODY on the parts' roots
  (`:is(.e-permits-page-header, .e-permits-dosar-profil__panel)` in css/bo-profile-parts.css). Also: the `font:` shorthand
  resets `font-kerning` to auto — texts meant to match a BO `font:` rule must use the shorthand too.
- 2026-10-17 · New tool: `tools/ui-qa/compare-styles.mjs` — two demo states + a JSON spec of selector pairs
  (`tools/ui-qa/specs/rap-profile-vs-bo.json`) → table of every computed property / box (incl. insets via `rel`) that
  differs, ±0.5px, plus `:root` token values; `expected` entries (with a reason) list page-level differences apart;
  `--dump <sel>` prints a DOM tree to pick selectors, `--trace <sel> --props …` shows where an inherited value comes from.
  Use it whenever „make X exactly like Y”: before (HEAD worktree via `--base http://localhost:8936`) 280 → after 0.
  The list of compared props must include the inherited rendering ones (smoothing, text-rendering, kerning, synthesis)
  — my first run without them showed only 25 differences and missed the main visible one.
- 2026-10-17 · `git worktree add -f <dir>` on an EXISTING scratch dir silently kept an old worktree (a months-old
  checkout, no rap states → „not ready”). Always `git -C <dir> log -1` before trusting a HEAD baseline; use a new dir.
- 2026-10-17 · RAP Figma comments (long names, many fields, tacit approval). Course corrections arrived mid-job (4×): the
  „Date publicate” profile section was dropped before it was built because US-162 (GEAP 2) puts the act's specific fields
  behind „Vizualizează act” (US-142, GEAP 1, said the opposite) — read EVERY story the brief names, and when two versions
  of a story disagree, the newer GEAP 2 one wins; say so. The act modal became the BO detail modal (`#dosar-detail-modal`
  markup) on the RAP page: library `.modal` + BO classes, the BO additions restated in bo-profile-parts.css from a new
  compare-styles spec (dos-04s ↔ rap-03: 146 → 0 differences in two passes — inherited body text, scroll hairlines,
  the 12/16 grey note). The old A4 viewer stayed as „Descarcă” (park the data modal, come back on close).
- 2026-10-17 · Traps: (1) a 1-line `-webkit-line-clamp` ellipsis cuts at a WORD boundary → a gap before a trailing
  „Mai mult”; use nowrap + text-overflow for one line, line-clamp only for 2+. (2) A Small tag in a flex column shrank
  below its text (cell content 87 < tag 100) and its centred text ran over the left padding — the user saw „no left
  padding”. Tags in flex rows get `flex: none`; MEASURE the natural width (mine was 100, I guessed 88) before sizing a
  column. (3) The blue tag tone did not exist on the RAP page (bo-profile-parts had only success / warning / danger /
  neutral) → the first capture showed plain blue text; check every tone you use is defined on THIS page. (4) A4
  pagination: measure unzoomed (render → paginate → zoom), keep ≥ 2 rows with the signature, never end a page on a
  group heading. (5) compare-styles failed with „dos-04s:error” twice under load, then passed — re-run before debugging.
  (6) The profile parity spec had drifted with another agent's committed changes (support card gone, last-row index) —
  a spec must be updated with the page it measures; keep page-level decisions in `expected`.
- 2026-10-17 · Shared tree with 3 agents (coordinator hunks in rap-evo.*, a third agent in facet-filter.* + rap-04 states
  + page `?v=` bumps): every edit of mine was an asserted (file, old, new) pair in scratch `edits/p*.py`, applied to the
  tree AND later to the HEAD blobs to stage only my hunks (+ the hunks the coordinator asked me to include).
- 2026-10-17 · RAP phone filter (research → build): the facet filter got an OPT-IN phone mode (`mobileSheets`, ≤760) in
  the shared file — the BO stays byte-identical because every phone line sits behind `isPhone()` and the shared chip
  markup became one `chipHtml(facet, n, open)` used by both paths. Proof = scratch bocmp.mjs (toggle → chip → option →
  Confirmă → Aplică, snapshotting bar / popover outerHTML + computed styles) on srv-01 / dos-05 / rap-01…01d at 1440
  and 375, HEAD worktree vs tree: all SAME. RAP desktop first differed only because the other agent's uncommitted
  data was in the tree → copy their files into the HEAD worktree and reverse MY hunks there; then compare.
- 2026-10-17 · BUG I made: a new config hook `count(selection)` collided with the existing `count` key (the badge
  element) — the later object key silently won, the badge never showed and nothing errored. Grep the config's
  existing keys (and the page's call) before naming a hook (→ `preview`).
- 2026-10-17 · A sticky footer „Resetează” + „Arată 1567 de rezultate” wrapped the primary to 2 lines at 375 (it
  cannot fit at 320 at all) → the primary takes the footer, the reset moves to the sheet header (Zalando / Amazon /
  iOS). Measure a live-count label with 4 digits at 320 before putting anything beside it. Romanian plural: ≥ 20
  with last two digits 00 or ≥ 20 takes „de” (`resultsLabel`).
- 2026-10-17 · Library traps: `label { margin-bottom: 6px }` makes checklist rows 6 taller (44 → 50 in the sheet;
  the desktop popover is 42 everywhere, BO included); the library `.bottom-sheet__panel` has `min-height: 45vh` and
  squares its corners ≤768; its bare `__close` is a text „×” → use `.modal-close` static. A brief's threshold („search
  when > 8 values”) met data with exactly 8 values → reuse the component's existing rule (> 7) so the asked demo works.
- 2026-10-17 · QA at phone widths: hover-audit is fixed at 1440 (sheets never render there) → run a temporary copy
  with the width from an env var (700, mouse) and delete it. A behaviour probe clicked `[data-sheet-close]` = the
  SCRIM (first in DOM), whose centre lay on the panel → a false „× doesn't close”; probe selectors must be the exact
  element. Mobbin MCP (playbook research note) was not available in this session — said so in the research.
- 2026-10-17 · User corrections mid-job: (1) phones showed BOTH the icon-only „Filtru” button and the chip row → ONE
  entry point: the search takes the row, the first chip „Filtre” (filter icon + total badge) opens all filters (Google
  Shopping / Airbnb / Zalando). When a mode adds an entry point, remove the old one in that mode. (2) „the search in
  the Autoritate sheet is not the library one”: the markup WAS the library `.search-input`, but its BO look lives in
  e-permits-shell.css and the × states in js/search.js — neither loads on RAP, so the library defaults showed (text
  at 48, 16px placeholder, no ×). The RAP DESKTOP popover had the same bug since 2026-10-16. A shared component on a
  page without the shell must restate its BO values (same values, scoped) and its JS states — measure the field on
  both pages (scratch srch.mjs: box / input / placeholder / icon) before saying „it is the library one”. Restating
  font-size flipped the BO phone input (library body-sm 12 beats the shell's 14 there) → restate only what the BO
  actually computes; the 375 compare caught it.
- 2026-10-17 · Two scratch CDP scripts started in parallel picked the same random debugging port and drove ONE Chrome
  (srv-01 suddenly showed the RAP page) → run compare scripts sequentially or give them disjoint port ranges.
- 2026-10-17 (user) · Download = export icon everywhere: every „Descarcă …” action / ⋮ item / icon-only „Descarcă” uses
  `icon-export` (arrow into the curved tray), never `icon-download` / `page-download` / `external-link`; import / upload =
  `icon-upload`. Grep `icon-download|page-download|circle-download|"download"` in js / html AND `data/*.json` — the FO
  payment-note icon came from `data/acte-permisive.json`, not the renderer default (the first probe still showed it).
  Probe method: list every button / menuitem whose label matches /Descarc|Export/ with its `use` href (hidden menus too).
  BUG I made: a patch script that wrote each file right after replacing aborted on a failed assert AFTER `open(p,"w")`
  → the file was truncated to 0 lines. Compute every new text first, assert all, then write.
- 2026-10-17 · RAP US-162 AC-17 (status-dependent dates): ONE helper `statusDateRows(record, profile)` feeds all three
  places that list the act's dates (Detalii act, modal Date generale, A4 form) + `headerDateItem` for the header meta —
  grep every list of „Valabil din data” before adding a date row (there were 4: details, header, modal, A4). AC-07 vs the
  shipped tones: Expirat was neutral, the story says red → changed on RAP only and flagged (BO US-196 says grey). The demo
  data still has Expirat acts with a 2030 „Valabil până la” — data inconsistency, not touched. Parity specs stay 0 / 0
  because they read rap-02 / rap-03 (Valabil acts) — new rows on other statuses only add one off-scale count per row
  (the BO 8/7 row padding, standing). No sub-agent tool → code-audit + hover-audit run directly.
- 2026-10-17 · Ghișeu „Cererea pe hârtie” preview („do this nicer” + print icon): two private copies of the A4 viewer
  existed (BO `fitDosarDocPreview` with a hard 48, RAP `paginateActDoc` / `fitActPage` / print CSS) → ONE module
  `js/doc-preview.js` (`GEAPDocPreview.paginate / fit / print / printIcon`) + `css/doc-preview.css`; RAP and the BO
  dossier modal now call it, Ghișeu uses it in `#dosar-detail-modal` + `modal--lg e-permits-detail-modal--doc`
  (MutationObserver puts `modal--md` back on close — the shell's other detail views share the dialog). Proof of
  „no change” for RAP / dossier = a geometry probe (pages rect, zoom, row counts, column widths, footer text/y) on a
  HEAD worktree (:8947) vs the tree → identical; print = CDP `Emulation.setEmulatedMedia({ media: "print" })`
  after `GEAPDocPreview.print` with `window.print` stubbed (only the dialog visible, pages 794×1123).
  Traps: (1) `table-layout: fixed` takes column widths from the FIRST row — a table starting with a heading row
  (`th colspan=2`) split 50/50 while page 2 was 40/60 → `<colgroup>` cloned onto continuation pages; (2) a
  generic print rule needs no per-page class: mark the canvas + its top-level `<body>` child, hide
  `body > :not(root)` and `root :not(:has(canvas), canvas, canvas *)`, flatten the chain (static, no
  max-height/overflow/transform) — works for the library modal and the FO doc-modal alike; (3) making
  generation async (MDocs loading state) broke 4 demo states that clicked „Generează” and closed the dialog at
  once → one `ghPaper` helper that waits for the canvas; grep every state using the trigger before adding a
  delay. Coordinator rule (user): no request number in a document dialog's subtitle — „Generată prin MDocs ·
  date”; the number stays on the page. No sub-agent tool → ran code-audit / hover-audit directly (findings only
  inside the A4 page: mm padding + zoomed paragraph gaps, standing FPs).
- 2026-10-17 · EVO Cabinet ↔ RAP / BO alignment (audit + 4 batches). What made it cheap: the BO parts file
  (`css/bo-profile-parts.css`) already existed for RAP — loading it on the Cabinet (after the FO stylesheet,
  which carries only the UNSCOPED BO base rules) plus 3 renderer helpers on `CabEvo` (`pageHeader`,
  `profileSection` / `detailCard` / `detailRow`, `tagHtml`) turned 3 profiles into BO profiles; compare-styles
  with a copied spec (svc-01 ↔ sm-05) went 84 → 0 in three rounds. Traps the spec found: the unscoped base
  `.e-permits-dosar-profil__card { max-width: 780px }` from the FO stylesheet (restate `max-width: none` in the
  parts file), the FO copy value inside BO rows (25 high, inset 4, −0.14 tracking — restate the BO copy-code look
  scoped to meta / rows), a too-wide `flex: none` on all tags (RAP only pins them in flex rows).
- 2026-10-17 · „The same dialogs in two products” = MOVE the code, then prove the old page unchanged: the RAP act
  dialogs became `js/act-view.js` (`GEAPActView.create`) + `css/act-view.css` behind a neutral view model; each page
  maps its own record (`toActView`). Proof = scratch dlg.mjs (normalised outerHTML + computed styles of every visible
  element of both dialogs) on a HEAD worktree (:8941) vs the tree, 11 states × 2 widths → identical except the host
  in the QR URL and one spinner animation frame. Keep the old class names / data hooks in the moved code (demo
  states, specs and Figma tools grep them); add options with the old value as default (`act.source`).
- 2026-10-17 · Batch scripts that slice the source by markers (`src.index(...)`) must read from the root being
  patched (`EDIT_ROOT`) and `apply.py` must write after EACH batch — otherwise staging „HEAD + my batches” later
  re-reads the tree (where the block is already gone) and fails. A regex-based „delete dead CSS rules” script
  merged comments into selectors and split `:where(a, b)` lists → reverted; delete dead rules as exact text pairs.
- 2026-10-17 · `.cab-main:has([data-cab-profile-header]:not([hidden] *))` = page padding that depends on the view
  without JS (the act profile panel stays in the DOM, hidden, after „back”).
- 2026-10-17 · code-audit `tight-gap` flagged a card subtitle 2px under its title (`.cab-card__service` inside
  `.cab-card__heading`): component text, not loose text → the tool now skips P inside `[class*='__heading']`; the
  page intro under the h1 went 6 → 8 instead (real). Standing FPs this job: BO 11 / 7 / 18 rhythm,
  `u-visually-hidden` step states, FO copy icon #444, the tacit `button.cab-mark` (intended), gaps inside the zoomed
  A4 page (same on rap-03l). No sub-agent tool → ran code-audit / hover-audit / compare-styles directly.
- 2026-10-17 · Timeline + status in one bordered card („Stadiul solicitării”): the status block on top (Small tags ·
  16/24 sentence · 14/20 explanation · the action that exists) and the FO finish timeline without its grey fill under
  a hairline; next steps as dashed items without dates make „the current step” visible without the old tracker. It
  replaced four blocks (tracker, callout, loose action row, „Istoric complet”) — grep demo states for selectors of
  removed blocks (`.cab-detail__actions` in sm-03a / sm-05c) before deleting them.
- 2026-10-17 · Cabinet Azure gaps (expired-MPower leak, acts „Filtre”, Anulare, expired note, redirect error,
  estimated / exam dates). (1) The leak was a FALLBACK: `state.permits = geap.acts.length ? geap.acts :
  data.permits` showed 6 legacy demo permits (incl. „Retras” + „Anulat — contestație”) for ANY subject without
  acts — grep every `? … : data.<legacy>` fallback when a perspective change „shows someone else's data”; an
  unknown subject gets the shared empty state, a restricted one ONLY the notice. The perspective's access data
  lived in the requests JSON → load it BEFORE the first render of the other view. (2) Wiring the shared facet
  filter on a third page cost ~60 lines: FACETS + options / availableFacets / preview copied from RAP's
  contract, placement CSS restated per page (`.cab-filters` = `.rap-filters`), one status filter only (the
  status chips went — two status filters contradict). Demo helpers must branch desktop (toggle → chip →
  option → `[data-filter-confirm]` → `[data-filter-commit]`) vs phone (chip → sheet → `[data-sheet-apply]`).
  (3) Moving a private renderer (the requests pager) into `CabEvo` with a `prefix` for its data hooks kept the
  old page byte-identical. (4) Replacing `disabled` by `aria-disabled` + `data-tooltip-reason` (to show the
  reason) re-enables the click — guard the handler on `aria-disabled` in the same change. (5) Capture
  overflow on phones showed a ⋮ menu 40px off-screen when the trigger sits after two tags (pre-existing for the
  tacit act): menus that anchor to one side need a measured flip (`fitMenu` → `.is-end` / `.is-start`), a
  fixed per-breakpoint side is wrong for some rows. A demo-only param (`?acte=multe`, `?nota=expirata`,
  `?redirectionare=eroare`) kept seed data — and every other state — unchanged.
- 2026-10-17 · Cabinet „Azure stories = the spec” batch (US-161 tabs, US-19 table + countdown, US-158 facets,
  notifications). (1) A facet filter binds its bar / toggle ONCE at `create` → a page that re-renders its whole
  root on every keystroke must build a persistent list shell (`ensureListShell`: intro, toolbar, bar) and redraw
  only the results; the profile went into a sibling container. Bonus: the search no longer needs the
  re-focus + caret hack. (2) `table-layout: fixed` + `width: max-content` grew the table to 1 897 (one-line cells
  feed max-content) → width = calc(sum of the column custom properties). Seven AC columns with „8 iulie 2026”
  dates never fit the 1024 Cabinet column: pin the first + actions (BO) and ORDER columns by what decides the next
  step (Statut, Data estimată visible; the rest scroll in) — report the order as a deviation. Shorten repeated
  text in cells („28 de zile, 3 ore”, „Timp rămas:” visually hidden) instead of widening. (3) A tab switch
  without re-render (`selectTab` toggles `hidden` + replaceState `#dosar/<id>/<tab>`) kept the route deep-linkable
  for demo states; states that scrolled to moved sections (sm-05e…h) had to click the tab first. (4) Prepare the
  next batch as patch scripts against a scratch COPY (EDIT_ROOT) while a long regression runs on the tree — the
  regression stays honest and the scripts apply in seconds afterwards.
- 2026-10-17 · Cabinet acts list → the FO „Ce vrei să soliciți?” act rows (user, corrected mid-job from „BO stacked
  list” to „as on the cum vrei să soliciți screen” — confirm WHICH existing list before building). The renderer
  lived inside the 9 000-line FO IIFE → MOVED it to `js/act-row.js` (GEAPActRow) with option defaults = the old
  markup, FO keeps `GEAPFormRender.actRowHtml` as a one-line delegate. Proof without a second server: extract the
  HEAD function with sed into a .cjs, run old vs new on every seed act × 6 option sets (78 cases, 0 differences),
  then the pp-* / gh-02* regression. A CSS selector widened with `:is(.is-locked, .has-notice)` keeps the old
  specificity. Cabinet-only needs (row hook, data attrs, tones, info notice, no pill) became options, never a fork.
- 2026-10-18 · Act row „no 12px, medium pill, bigger menu” (user, pp-01). (1) Sizing a library button = add its size
  class (`btn-md`) and DELETE the product's size overrides (height / padding / font / gap) — keep only the colours;
  measure against a place that already uses the class (the Cabinet profile header trigger: 40 · 8/16 · 16/22 · gap 4).
  (2) Growing a meta font 12 → 14 made one nowrap part (an authority name) wider than the phone column; the meta's
  `clip-path` HID the overflow (text silently cut) and only the page scrollWidth (388 vs 375) told — an element scan
  found nothing because the overflowing thing was a text node. After any font-size bump, probe
  `part.scrollWidth > clientWidth` at 375; fix = `white-space: normal` on the parts (flex: none + max-width 100% still
  keeps whole parts on one line until one is longer than a line). (3) A menu that gets its size from a generic class
  (`.e-permits-stack__menu`, 32 rows everywhere in the BO) is resized by a SCOPED parent selector
  (`.e-permits-fo-intent-act__action > menu`) — both the list rows and the Cabinet profile header already sat in that
  wrapper, so one block covered all four places. (4) capture.mjs mobile = touch emulation → `(pointer: coarse)` matches
  there (48 rows), my own probe without touch emulation showed 40 at 375 — use `pointer: coarse` for touch sizing and
  verify with the emulation on. Mobbin MCP not available again → documented guidance (M3, HIG, WCAG 2.5.5/2.5.8,
  NN/g, GOV.UK/USWDS). No sub-agent tool → code-audit + hover-audit run directly: only standing FPs.
- 2026-10-18 · Components-only audit (user: „Telefon input too small, check too small … use only components, I need an
  agent to verify”). New tool `tools/ui-qa/component-audit.mjs` + spec `tools/ui-qa/specs/component-audit.json` + agent
  `component-auditor` (runs with ui-qa-code, CLAUDE.md). Allow-list = library selectors + product roots + every class
  in the components.md INVENTORY (auto-parsed, modifiers document their block) + BEM parts of a listed block; ancestor
  matching only for native fields, menu items and class-less parts (else any button inside a product card „passes”).
  Run it with `--viewports desktop,mobile,edge` — the 760 edge found 196 FO size majors that 375 never shows.
- 2026-10-18 · The read-only phone was 48 high at 375 all along; what the user saw as „smaller” was the 14/20 value and
  the 20 check from `.e-permits-fo-phone--readonly …` rules (0,2,0) beating the ≤720 phone block (0,1,0). „Looks
  small” = measure text + icon, not just the box. And the FO field sizes lived in `@media (max-width: 720px)` while
  the rule (and Cabinet / RAP) is ≤760 → split the block IN PLACE (close 720, open 760 with the field rules, reopen
  720) so the cascade order stays byte-identical and only the range changes.
- 2026-10-18 · Field box detection traps: a borderless `<input>` keeps the UA white background, so „first painted
  ancestor” stopped at the input (20 high) — find the FRAME (border on any side or inset ring) first, paint second;
  a menu's search row has only a bottom border; `aria-hidden` on decorative svgs must not hide them from an icon
  check. Library sizes: 48 field → icon 24 at 16 from the edge, text from 48; 40 → 20 at 12, text from 40.
- 2026-10-18 · Non-library controls that have a near library equivalent but differ (FO „Înainte” 48 · 16/24 · 0 16 0
  20 vs `btn-lg` 18/24.75 · 12/24) are DESIGN decisions → reported as PO questions, not swapped. No sub-agent tool
  again → ran component-audit, code-audit, hover-audit directly; HEAD baseline from a worktree on :8946.
- 2026-10-19 · Configured act fields — groups + tables (Figma comment 20607:34846). ONE renderer
  `GEAPActView.fieldsHtml(groups, { section, untitled })` + `normalizeFields` (tuples, `{label, value}`, grids
  `{label, columns, rows}`, `fields|items|rows`, flat list = one untitled group) exported from the shared module,
  called by the act modal (RAP + Cabinet) AND the Cabinet „Solicitările mele” Act tab through a `section` callback
  (each page keeps its own section wrapper / ids). Traps: (1) RAP's old mapper destructured `([, value])` → an object
  item throws „not iterable”; route every reader through the normaliser. (2) `td.is-number { white-space: nowrap }`
  (0,2,1) beat the phone reset `td` (0,1,1) → the column label ran out of the mini-card; list the modifier in the
  reset. (3) Onest `tabular-nums` again drew „1 20,0” / „0,1 1” — right-align with proportional figures. (4) A 2-column
  grid of label-over-value pairs squeezed labels to 3 lines at 375 → `display: contents` on the non-first cells =
  `label | value` lines. (5) A4 continuation page whose first row is a `colspan=2` grid row: fixed layout took the
  40 % of `td:first-child` for the whole table → the act page table needs `<colgroup>` (paginate clones it). Grid on
  paper = one-row nested tables with equal colspan units per row, so `paginate` can split it; keep-with-next rows
  (`.e-permits-doc-page__keep`) + a repeated header row (`data-doc-grid` / `-of`). Proof „old forms unchanged” =
  scratch af/a4probe.mjs (pages, rows, first-column width, row text) on a HEAD worktree (:8951) vs tree → 7/7 same.
  Pinned first column in a 590 dialog: cap its text at 200 or the scrolling columns get ~200px. No sub-agent tool →
  ran component-audit (scoped to the dialog: my markup 0; the RAP copy button in Date generale is pre-existing),
  code-audit (standing FPs: BO 11/7, subtitle toggle), hover-audit 0/0, compare-styles (rap-03 / pp-01m vs BO = 0;
  new spec act-fields-rap-vs-cabinet rap-03q ↔ pp-01x = 0). Coordinator correction: never reuse demo ids linked
  from Figma (rap-03n / 03o) — build on existing ones (03i / 03j) and take free ids.
- 2026-10-19 · eKYC „exact same filtrare as in GEAP” + „tab separators top/bottom” (Figma 10385:5149 / 10405:2438): MEASURE
  before building — every eKYC list was already a shell registry, so its „Filtrare avansată” WAS js/facet-filter.js with
  the BO markup / CSS, and the status tabs already had the BO top line (toolbar inset shadow / filter-bar border) + bottom
  border, counters 20 high (`__status-count` = numbered-badge Large). The gap was in Figma, not code. Proof the user can
  read: compare-styles specs `ekyc-filter-vs-bo.json` (dos-05c ↔ ek-04j) and `ekyc-filter-applied-vs-bo.json` (dos-05d ↔
  ek-04d) = 0 / 0, plus a tab-strip probe listing which element's border meets the strip's top / bottom edge. No BO Dosare
  filter demo state existed → added dos-05b/c/d as the reference (also for the Figma agent). What code DID lack: the phone
  mode — eKYC now opts in with `mobileSheets: !!product` + a `preview(selection)` from the shell's own row filters (GEAP BO
  registries untouched; PO question), placement CSS per product (search + export on one row, chip row edge to edge,
  phone search 48 · 16/24 — component-audit flagged the 40 / 12 search on phones). Demo helpers `ekFacet` / `ekPick` /
  `ekCommit` branch desktop / phone — every old state that clicked the (now hidden on phones) toggle had to move to them.
  Capture traps: (1) a popover state shot with `captureBeyondViewport: true` resizes the page → the popover closes on
  resize (empty shot while the probe said „open”) — viewport shots for popovers; (2) a bottom sheet whose slide-in is
  killed mid-way by the capture's `animation:none` style never paints in headless (CSS says visible) — shoot sheets
  without the injected style. No sub-agent tool → ran code-audit (standing FPs only: violet tag, th sort, pagination,
  sidebar toggle, library search ×), hover-audit 0 / 0, component-audit (fixed the phone search) myself.
- 2026-10-19 · „Modals on phones — maximum content space” (user: minimum scrim gap + minimum modal padding, research). ONE
  file `css/modal-phone.css` loaded LAST on every page with dialogs (equal specificity beats the older per-family phone
  rules, nothing edited in five other CSS files), all rules inside `@media (max-width: 760px)`: every dialog = bottom
  sheet, 16 top gap (max with the notch inset), 0 sides / bottom, radius 16, inner 16, compact header, the body the only
  scroller, footer 12 / `max(16, safe-area)` with two equal-half buttons. Method that worked: a probe that finds the
  topmost visible dialog (elementFromPoint on the candidates) and reports gaps, scroll-body clientHeight, leftmost text
  inset, header / footer heights, A4 page width (scratch mm/probe.mjs + measure.js, `--sizes 375x812,320x568`); a sweep of
  all 1 192 states at 375 gave the family inventory (563 states with a dialog, 19 families) — start it FIRST in the
  background and test the new file meanwhile by INJECTING a `<link>` (`--inject`) so the running „before” stays honest;
  link it only when the sweep is done. Desktop proof = the same probe at 1440 with / without the injected file (14 states
  identical). Big find of the before table: at 320 × 568 the library modals were TALLER than the screen (gaps −20: header
  and footer unreachable) — always measure 320 × 568, not only 375 × 812.
- 2026-10-19 · Traps: (1) `min-width: min(100%, max-content)` is INVALID (intrinsic keywords are not allowed in math
  functions) → the whole declaration drops silently; use `fit-content`. (2) Equal halves with different paddings (icon
  button 12 / 16 vs 20 / 20): `flex: 1 1 0` gives unequal widths (padding is outside the 0 basis) → basis
  `calc((100% − gap) / 2)` + `min-width: fit-content` + `flex-wrap: wrap-reverse` = equal halves that wrap to one per line
  with the primary on top. (3) `height: 100dvh` on a fixed overlay disagreed with the fixed box when the page behind
  overflowed sideways (layout viewport 399 wide → the sheet stopped 52 above the bottom): size from the overlay instead
  (`inset: 0; height: auto` + `max-height / height: 100%` on the surface) — also correct under the iOS toolbar, where the
  library's `100vh` overlay is taller than the visible screen. (4) A sheet that reaches the bottom edge meets the fixed
  MSupport launcher (hover-audit „covered” on the FO picker's Anulează) → hide `.msup` while any dialog is open
  (`body:has(…open dialog…) .msup`), as the account switcher already did. (5) A one-line ellipsis subtitle in a dialog
  header has no tooltip on touch → wrap it on phones. Side finds fixed: RAP profile „Toate actele (N)” link =
  `flex-basis: 100%` + a 56 margin-left → page 399 wide at 375 (basis `100% − 56`). Reported, not fixed: Ghișeu picker
  PJ segment uses the suitcase icon (rule: business), the act-fields spec's 1440 `rect.y` drift and the RAP profile
  spec's beneficiary padding (16 vs BO 20) come from today's other commits. No sub-agent tool → ran code-audit (before /
  after diff: only zoomed-A4 tight-gap FPs moved), component-audit (identical before / after), hover-audit at 700 with a
  mouse (temp copy with the width from an env var), compare-styles (0) myself. Mobbin MCP not available again.
- 2026-10-19 · „Long name in a header — expand on click” (user, FO pp wizard with a 144-character service name). ONE small
  shared module `js/name-expand.js` (`GEAPNameExpand.set / scan / sync / collapseAll`) + `css/name-expand.css`, the RAP
  subtitle vocabulary („Mai mult ⌄” / „Mai puțin ⌃”), the whole name = the button only when really cut (measured with the
  affordance hidden, ResizeObserver + fonts.ready), plain tooltip while collapsed through a new icon-tooltip hook
  `data-tooltip-text` (+ `GEAPIconTooltip.hide()`: a tooltip opened on focus stayed up after Enter expanded the name).
  Traps: (1) a JS-owned host must never be written with `textContent` (two FO setters did — route them through one
  helper) and `set()` with the same text must be a no-op, or a late re-render folds what the user opened (the demo
  click raced the FO's first title render); (2) the phone sticky progress sat at a fixed `top: 108px` while the header
  is 126 (draft line) → it covered the draft line on EVERY FO phone state and a wrapped long name — use the page's own
  `--fo-header-height` (ResizeObserver); (3) changing a fixed `flex: 0 0 26px` row to auto moved every phone header 2px
  — keep the old size as `min-height`; (4) hover-audit only compares the element + its first 3 children: a hover
  decoration on a grandchild reads „no-hover” — put it on the direct child (`__more`; text-decoration propagates to the
  label, not the icon). Taught code-audit `data-tooltip-text` and „icon colour = the text next to it in its own group”.
- 2026-10-19 · BUG in my scratch probe: `evaluate()` returned the raw CDP result object when the value was undefined,
  so `!!demoState` was true at once and every measurement ran 1.2 s after load, BEFORE the demo — a 736-state sweep
  had to be rerun. Ready checks read `dataset.demoState || ""`, and a probe prints the demoState it measured (blank =
  not ready). Sweep result: no BO page header / Ghișeu sheet / eKYC title is cut at 1440 (longest BO service 52
  chars) → pattern used only in the FO header; RAP / Cabinet headers wrap by design. No sub-agent tool → ran
  code-audit, hover-audit, component-audit directly (only pre-existing FO header button findings left). Mobbin MCP
  not available again → NN/g / Material / GOV.UK guidance.
- 2026-10-20 · „One trajectory everywhere, as in the first one, super precise, see the subtle current-step background”
  (ref GEAP 2.0 9709:1137). The brief said „copy the BO code, it already matches the reference” — MEASURED (Figma PNG
  with the zlib reader + metadata of the step instances), it did not: Figma centres every step in a hugging box (first /
  last too), connectors are equal flex fillers 8 from each step box, grey line + to-do ring 1.5 (code 2), the „Suspended”
  pause is warning-default #DC6803 (code apricot-400). Measure the reference before trusting „the code matches”; the
  component set (9696:556) holds the state colours. Result = ONE module `js/trajectory.js` (`GEAPTrajectory.html`) +
  `css/trajectory.css`; BO / eKYC / FO tracker + „Statutul dosarului” / Cabinet only map their data to `steps[]`.
  Proof: pixel rows of the new BO render vs the Figma PNG (line 87–193, pill rows 51–70, marker 231 — identical) and
  compare-styles specs `trajectory-vs-bo.json` / `trajectory-vertical-vs-bo.json` = 0 property differences.
- 2026-10-20 · Equal connectors between content-hugging steps without extra list items: steps 2…n are `flex: 1 1 auto`
  and carry the line as a `::before` flex item (`flex: 1 1 0`, margins 8, min 16) — the free width is shared equally, so
  every line has the same length (= Figma auto-layout with fixed connector frames). Vertical connectors need the NEXT
  step's state → `li:is(reached):has(+ li:is(reached))::after`.
- 2026-10-20 · A container query could not decide „horizontal or stacked”: the fit depends on the content (7 eKYC steps
  need 955, 6 BO steps 572–800). Measured fit instead: add `.is-measuring` (steps `width: max-content`, vertical rules
  excluded by `:not(.is-measuring)`), read the width, remove it and toggle `.is-stacked` in ONE synchronous pass (no
  paint, no ResizeObserver loop because the final size is unchanged); a MutationObserver picks up cards rendered later.
  Writing the vertical rules once as `.card:is(--vertical, .is-stacked):not(.is-measuring) …` also removed the
  duplicated container-query block. Labels are never truncated; at 1024 the 736 BO card stacks dos-01h / ek-05g.
- 2026-10-20 · Inventory traps: my state sweep regex `pp-0[0-9]` missed the post-process finish states (pp-10f, pp-12a,
  pp-14b, pp-16a, pp-17a) and I nearly added a duplicate — grep the renderer's call sites (`renderPostprocessStep7`) and
  the demo ids for every step number before declaring „no demo state”. `figma-a` get_metadata only lists the OPEN page;
  a big section's metadata is saved to a tool-results JSON file → parse it with ElementTree (figscan pattern: matched
  node → nearest 1440 / 375 ancestor → block) to list the screens per block. No sub-agent tool → ran code-audit
  (only `.u-visually-hidden` FPs), hover-audit 0 / 0, component-audit 0 directly.
- 2026-10-20 · „No download in document rows — only in the document modal; a ⋮ with only „Descarcă” goes” (user, GEAP
  11333:20746). Inventory by grep `Descarc|download|icon-export|"export"` over js / cabinet-evo / rap-evo + the data
  hooks (`data-*download*`): only 4 document rows offered it (BO `renderDosarDocItem` ⋮, Cabinet `docRowHtml` ⋮, Ghișeu
  signed-request card ⋮, FO post-process previous act `<a download>`). `renderRowActions` already drops ⋮ when `menu` is
  empty — pass no menu, no CSS needed. Trap found by a probe, not by looking: the Cabinet modal's „Descarcă” had NO
  handler at all (its hook `data-cab-doc-download` was only rendered) — „check the modal download still works” must
  click it with `HTMLAnchorElement.prototype.click` patched to record `download` (scratch nrd/probe.mjs), and the
  button must be picked inside the OPEN dialog (`.modal-overlay.is-active`) — closed library overlays still have a
  visible-sized „Descarcă” and gave false „null” downloads. The FO had no document viewer for the previous act →
  `#fo-certificate-modal` became the FO viewer with a `certView` object (null = the certificate, so fo-08d/e stay as
  they were) instead of new markup. Not document rows, left + reported: payment-note card, Cabinet request actions
  (US-19 / US-161), eKYC SDK link. Demo states that opened the removed ⋮ (dos-04j, dos-04q, sm-05g) now open the modal
  by the row / card click (same ids, `docKebab` → `docRow`); new `pp-10c1`.
- 2026-10-20 · A `run_in_background` Bash call is killed at its 10-minute timeout together with the Chromes it spawned,
  but `&`-started node workers survive and hang forever on a CDP reply (logs frozen, processes alive). Long sweeps:
  `nohup` the workers, give `send()` a per-call `Promise.race` timeout, and resume from the ids already logged.
- 2026-10-20 · „Dropdown item — one size everywhere” (user, ref GEAP 2.0 9716:10905: 32 · 6 12 6 8 · 14/20 medium · icon 20 ·
  gap 8 · r6, surface 4 / 2, same on touch). The 2026-10-18 act-menu research (40 / 48 rows, 16/24) was REJECTED — for menus the
  user wants dense desktop rows everywhere, touch included; don't upsize menus „for best practice” without asking. Done as ONE
  file `css/dropdown.css` (lists + items at (0,1,0), loaded after the product CSS on the BO page, shell, Cabinet, RAP) and the
  size declarations DELETED from every menu's own rule (13 rules in 5 files) — a per-menu override list would have grown again.
  Phone sheets / identity cards / date grid stay out; a sheet that shares the item class (`.e-permits-filter-sheet__list
  .e-permits-workplace__filter-option`) must restate what it keeps (gap 10, regular, r8, list gap 0).
- 2026-10-20 · Measure before trusting the brief's map: the HEAD sweep showed EVERY Cabinet menu (⋮, „N pe pagină”, sort) at the
  40 / 16-24 act-menu size, not only „Inițiază un postproces”; and the old BO stack icon was 16 (reference 20). Probe = scratch
  dd/probe.js (every visible floating surface + item signature: class · height · padding · font · icon · gap · radius) over all
  menu-ish demo states on a HEAD worktree (:8960) vs the tree, 1440 + 375.
- 2026-10-20 · Traps: (1) `pkill -f "dd/run.mjs"` matched NOTHING (the command line had the relative `run.mjs`) → stale runners
  against the LIVE tree kept writing the same JSON files with the same CDP ports; kill by PID after `ps aux | grep run.mjs`,
  and give every sweep its own port range + output prefix. (2) Making a list `display: flex` (gap 2) shrinks `overflow: hidden`
  options to 0 → items `flex: 0 0 auto` in the shared rule. (3) A zero-specificity `:where()` item rule would lose to the
  library `label { margin-bottom: 6px }` / element resets — size rules for real items need (0,1,0) + `margin: 0`. (4) The demo
  `fo-02p` (phone codes) never opened: `h.click` took the first, hidden, guest phone button → pick the visible one in the step.
- 2026-10-20 · QA of the dropdown job: no sub-agent tool → ran code-audit (menus: only the standing „open menu overlaps
  content” FP, dropdown-surface 0), hover-audit on every open menu / list (fixed: the keyboard-active option `.is-active` = the
  hover look had no hover → one `:is(…options).is-active:hover` tertiary-hover rule), component-audit (0 findings inside
  menus). Side effect to remember: `.e-permits-fo-intent-menu__item` is also used OUTSIDE menus (the document-template
  „Câmpuri disponibile” panel, `.e-permits-dtpl-fields__list`) — it took the compact size too (checked svc-08e). Pre-existing,
  reported: the notification field picker opens off-screen at 375 (ntpl-02c, x 211–531 on HEAD too).
- 2026-10-20 · The git INDEX is shared between agents: while my hunks sat staged (HEAD + my edits via hash-object /
  update-index, waiting for the QA audits), another agent ran `git commit` and its commit (fd11ad4a) carried my whole
  change under its message. Stage only right before committing — run every audit first, then build the blobs, then
  commit in the same command; if it happens, record the change with an `--allow-empty` commit (never rewrite pushed
  history). A hung CDP tool (code-audit stuck 20 min on one state) = wrap each run in `perl -e "alarm N; exec @ARGV"`.
- 2026-10-20 · Act post-process menu on phones → action sheet (user: „too small for fat fingers”, then mid-job „maybe it
  shows as we do for filters?”). Cheapest robust shape: ONE capture-phase click listener in `js/act-row.js` for every
  `.e-permits-fo-intent-act__action > button[aria-haspopup]` (≤760) that builds the sheet FROM the trigger's own menu
  and, on a tap, closes it, focuses the trigger and `.click()`s the ORIGINAL (hidden) menu item — FO / Ghișeu / Cabinet
  handlers ran unchanged (confirm modals included), zero page edits. „Don't create a second sheet style” = extract the
  facet sheet's shell into `window.GEAPSheet` (create / show / hide / trapTab) in js/facet-filter.js and prove the facet
  markup byte-identical by eval-ing the HEAD template vs the new helper in node (1058 = 1058 chars, equal).
- 2026-10-20 · Bugs found by probing, not by looking: (1) the shared Tab trap listed `[href]` → every svg `<use href>`
  was a „focusable”, so Tab on the last row did nothing (facet sheet too: Shift+Tab from × went to a `use`) → `a[href]`;
  (2) the FO tester launcher (fixed, z 1100) covered the sheet's last row (hover-audit „covered” at width 700) → hidden
  while `html.is-filter-sheet-open`; (3) code-audit „icon colour ≠ label” on disabled rows: the grey sat on the label
  span, the button kept #121212 → put the disabled colour on the button itself. Esc for a sheet over a dialog (Ghișeu
  window): a WINDOW capture listener registered at load runs before js/modal.js and Ghișeu's own capture handler.
- 2026-10-20 · Demo states that pick a menu item by a row-scoped selector break when the item moves into a body-level
  sheet → one helper `actMenuPick(itemSel)` (index of the original item → `[data-act-sheet-index]`); hover-only steps
  (gh-02j tooltip) are skipped when the sheet is open. Brief vs rules: „subtitle = name + number” lost to the user rule
  „no code in a modal header”, „one-line ellipsis” to the phone rule „wrap, no tooltip on touch” — report deviations.
  No sub-agent tool → ran code-audit (only `button-not-library` on the option-row buttons, as the facet sheet),
  component-audit 0 (375 + 320), hover-audit 0 / 0 (temp copy at width 700). Mobbin MCP not available again.
- 2026-10-20 · FO phone chrome („scroll the service name away, only the steps sticky” + „dropdown vs MSupport bubble”).
  Measured first: sticky = header 126 (196 with an expanded long name, pp-18a = the user's „~240”) + step bar 44. Fix =
  2 CSS rules in the ≤860 step-bar block (header `position: relative` scoped with `body.is-fo-request-mode:has(
  .e-permits-fo-request:not([hidden]) > .e-permits-fo-mobile-progress)`, bar `top: env(safe-area-inset-top)`) + `html`
  `scroll-padding-top` from a JS-measured `--fo-step-bar-height` — keep `position: relative` (not static) so the header's
  z-index / stacking for the account sheet stays. Scope to the component's breakpoint (the bar shows ≤860, not ≤760)
  and to screens that HAVE the bar (intent / choice keep their sticky header).
- 2026-10-20 · Hiding a floating widget while ANY picker is open: one `body:has(:is([aria-haspopup], [role=combobox],
  .js-date-picker-toggle)[aria-expanded="true"]:not(.msup *)) .msup` rule beats listing list classes — every FO picker
  trigger already carries aria-haspopup / combobox + aria-expanded (disclosures like „Mai mult” don't, so they don't
  hide it). Keyboard-up hiding = `:has(input…:focus)` at ≤760. Dismissing a third-party widget's greeting without
  editing it = click its own × from a capture-phase focusin + click listener (click because iOS doesn't focus tapped
  buttons). Headless focus tests need CDP `Emulation.setFocusEmulationEnabled` — without it `:focus` never matches
  and `focusin` never fires (my first probe said „not hidden”). hover-audit at 700 (temp copy) found the phone
  hamburger `.e-permits-fo-auth__menu` had no hover at all (pre-existing) → tertiary / tertiary-hover. No sub-agent
  tool → code-audit (standing FPs: library search submit overlap, FO buttons), component-audit (pre-existing FO
  header / footer buttons only), hover-audit 0 / 0 at 1440 and 700. Mobbin MCP not available again.
- 2026-10-20 · Cabinet „Solicitările mele” table → the act row + full header width (7 user corrections in one job). What
  stuck: ONE row component (`GEAPActRow.html`) grown by options with old defaults (`iconSrc ""`, `metaSlots`,
  `noticeHtml`, `actionHtml`, `rowClass`) proved byte-identical for the old callers (node: HEAD function vs new, 66
  cases), ONE status map in the page (`REQUEST_UI`: tag tone · alert · date slot) and ONE meta builder
  (`metaParts`: number · what · authority · subdivision · date) — every later correction (no icon, 16/24 title then
  back to 14/20, padding 16 / r16 / 1.5, tertiary meta, slots, no copy in lists, action-only alerts, ⋮-only rows,
  draft = no alert) was a one-place edit. Expect the brief to move: keep each decision in one table / builder.
- 2026-10-20 · BUG the user saw before I looked: removing the icon left the SHARED doc-card grid (`:is(…):has(…)
  :has(…)` = 0,3,0–0,4,0) in charge — my 0,2,0 `grid-template-columns` lost, column 1 stayed 24px → titles cut to
  one letter, tags stacked, meta 36px indented. Overrides of the shared card grid need list + both row classes
  (`.cab-request-list > .cab-request-row.e-permits-fo-lib-item…`), and ALWAYS look at the capture after a layout
  change, then measure (scratch row probe: title x / tag tops / meta x / actions centre) at 1440 and 375.
- 2026-10-20 · Probes picked the hidden acts list (`.cab-act-list` is also the class of the request list) → scope probes
  to the visible list. `min-width` on a shrinkable SHORT part (authority „ANSP”) widened it (66 for 40 of text) —
  only genuinely long parts get the min-width; short keys stay `flex: none`.
- 2026-10-20 · Full-width list pages: measure the header box first (brandbar-inner = page width − 2 gutters = 1200
  at 1440, 24 / 16 below) and reuse that formula as `--cab-list-width`; profiles keep 1024 by a `:has(profile
  header)` rule on the container. `git checkout` my accidental bumps in `msupport/` / `acte-permisive/` (a
  `grep -rl` over all html touched forbidden dirs — exclude them in the loop).
- 2026-10-20 · No sub-agent tool → ran code-audit (standing FPs: meta 18 padding, copy-value / sm-tacit buttons, open
  menu overlap), hover-audit 0 / 0, component-audit 0, compare-styles (new spec cabinet-request-row-vs-act-row =
  0) directly. Phone action sheet (act-row capture listener) also catches any ⋮ inside `.e-permits-fo-intent-act__action`
  → demo states that pick a ⋮ item on phones must use `actMenuPick` (sm-03b failed at 375 until then).
- 2026-10-20 · „Copy value — one component, no copy in lists” (user). Inventory = grep `clipboard` + every copy class /
  data hook (`copy-code|fo-copy-value|rap-copy|rap-profile__copy|data-*copy*|icon-copy`) over js / cabinet-evo / rap-evo /
  html: 7 live variants + 2 dead ones (`permits-table__id`, `permits-profile__copy-id` had CSS + a JS handler but no markup).
  A before/after probe per copy element (scratch cp/probe.mjs: context table / list-meta / header / detail / modal, box,
  icon, gap, real-mouse hover bg, tooltip text before / after a click, `navigator.clipboard.readText()` after
  `Browser.grantPermissions(["clipboardReadWrite"])`, focus ring, Enter) made the „before” table and proved the „after”.
  ONE module `js/copy-value.js` + `css/copy-value.css`; every product wrapper (`renderCopyCode` / `renderProfileCopyCode`,
  FO `copyValueHtml`, `CabEvo.copyValueHtml`, RAP `copyValue`, `GEAPActView` default) now returns it, lists call
  `renderListCode` (plain). Handling the click on the document in the CAPTURE phase + stop removed ~10 per-panel copy
  handlers and every row's „ignore clicks on the copy button” exclusion.
- 2026-10-20 · Centring a library 32 button on a 20 text line without growing the line: `line-height: inherit` on the
  button + `margin-block: calc((1lh − 32px) / 2)` — works for any context line height. Traps: (1) `overflow-wrap:
  anywhere` lowers min-content to one character → a flex row shrank a 13-digit IDNO and broke it mid-number in a card
  that had room (`break-word` keeps the word's min-content); (2) a placement hook that sets the value type must sit on
  the WRAPPER (the button's `1lh` reads the wrapper's line height, not the text span's); (3) the page-insert script
  checked `"copy-value.css" not in s` and my own new HTML comment contained that string → the Cabinet page silently
  got no stylesheet / script — assert on the inserted tag, never on a substring.
- 2026-10-20 · Deleting dead CSS by a brace-matching script (scratch cp/edits/cssdel.py: rule blocks whose EVERY selector
  matches the dead pattern, mixed selector lists only reported and renamed by hand): the first run ate the newline
  between the previous `}` and the next rule (`}.next {`) — always `git diff | grep '^+'` after a deletion script; it
  should add nothing. Rename a class inside `:not(:has(...))` instead of deleting it, so the specificity stays.
- 2026-10-20 · component-audit got rule 4 (spec `copy`): copy-variant (legacy class / data hook / icon-only „Copiază…”
  outside `.copy-value`) + copy-in-list (`.copy-value` inside td / stacked row / act / request row, `listExempt` for the
  documented IBAN summary). Proof = the same states on a HEAD worktree (:8961) flag every old variant (svc-04o 505,
  rap-01 32, dos-05 16 …) and the tree 0, with no other new finding. Figma tools `tools/figma/rap/spec.mjs` /
  `tools/figma/cabinet/spec.mjs` still read the old classes — flagged for the figma-designer, not edited.
- 2026-10-20 · Date range facet in the shared filter (user: „why is Perioadă not also in Filtre?”). Cheapest robust model: a
  date facet's value is ONE token in the usual applied ARRAY (preset id resolved against `today()` at match time, or
  `interval:<from>:<to>`) — badge count, draft / commit, „N rezultate”, „Șterge filtrele”, sessionStorage and `pending()`
  needed no change; only the chip, the popover / sheet body and the pages' matchers (`GEAPFacetFilter.dateMatch`) branch on
  `type: "date"`. Chip × = the library chip „with close” GROUP (`div.chip[role=group]` > `button.chip__label` +
  `button.chip__close`) — a × inside the chip button is invalid HTML.
- 2026-10-20 · Traps: (1) the library date picker panel is `position: absolute` → inside the `overflow: clip` dropdown surface
  it is cut; the date popover is `overflow: visible` (documented exception; code-audit `dropdown-surface` flags it). (2) The
  library PHONE calendar is a `position: fixed` sheet — inside the facet bottom sheet, whose panel rests at `transform:
  translateY(0)`, fixed = relative to the panel (trapped + clipped) → `transform: none` at rest while the sheet holds a
  picker (`:has([data-date-picker])`, transitions still run). (3) Field errors under one 144px column wrapped to 4 lines →
  one error slot spanning both fields. (4) hover-audit „no-hover” on the chip button whose hover paints the PARENT chip →
  give the button the same hover colour itself. (5) code-audit's library-button regex had `\bchip\b`, which never matches
  `chip__label` / `chip__close` (`_` is a word char) → added the parts to the tool. (6) Full-page captures close popovers
  (resize) — viewport shots (scratch tools/shot.mjs: state → optional EVAL → PNG) for popovers / sheets / an opened
  calendar. (7) Removing the Cabinet „Perioadă” dialog: its `.cab-filter-modal` / `.cab-filter__body` are ALSO the Cabinet
  document modal (`CabEvo.openDocModal`) — grep every class of a removed block before deleting CSS; only `__group /
  __legend / __options / __range` were dead. Sweep 118 sm / nt / pp-01 / ek-06 / rap-01 / dos-05 states × 2 widths: 0
  `:error`, 0 overflow (scratch tools/sweep.mjs, one Chrome, sequential). No sub-agent tool → code-audit / hover-audit /
  component-audit run directly (only standing FPs: Cabinet meta 18 padding, `sm-tacit`, alert link, FO date toggle, eKYC
  header / nav / rows select).
- 2026-10-20 · „Solicitările mele” status-matrix gaps (spec STATUS-MATRIX.md; only the gaps the stories agree on, 12 PO
  questions left as they were). What kept it cheap: a RULE in code instead of a special record — `normalize()` turns an
  „info” past its term into „În derulare” (+ `resumed`), `autoRemoved()` hides drafts past their removal day, both
  applied once at load, so any future data follows the stories; every visible change went through the existing
  `REQUEST_UI` / `statusNow` / `timelineEvents` / `eventsOf`, zero new components (one `span.is-expired` tone + one
  `.nt-item__details` paragraph). `openConfirm`'s onConfirm returning `false` keeps the FO confirm open for an inline
  error + „Reîncercați” (it used to close BEFORE calling onConfirm — check callers' order assumptions when you flip it).
- 2026-10-20 · Traps: (1) 7 new dossiers moved rows to page 2 → every demo state that scrolled to a row by id
  (`smMenu`, sm-01k hover) needed a pager-aware `smFind(h, id)`; add new records with dates / sort keys in mind and grep
  the states that address rows. (2) `CabEvo` maps act → „first approved dossier” in DATA ORDER — new dossiers for an
  existing act (a duplicate) go at the END of the array or the acts page links the wrong request. (3) A timeline step for
  a missed deadline with a green check read as success → word the step as what ended („Suspendare încheiată”), keep the
  miss in the text. (4) The FO authorization card's status span is hard green („valid”) — an expired MPower needs a
  tone modifier. (5) Romanian: „în decursul <Timp setat>” needs „a” before a numeral („a 30 de zile”, „unei zile”) —
  reported as a wording fix of the US-21 text. No sub-agent tool → hover-audit 0 / 0, code-audit / component-audit
  only standing FPs (BO 11/7/18 rhythm, FO confirm buttons, header avatar / menu, alert link, `sm-tacit`).
- 2026-10-20 · Phone list toolbar = ONE row „Filtre” pill + sort pill (user: „only the Filter button, the sort in the same
  row, round”), then mid-job (coordinator, user): „sort, Filtre and the search — one height, no ↓ on the sort”. Done in the
  shared module, not per page: `renderPhone` builds the row ONCE (`[data-filter-phone-row]`) and updates the pill / meta in
  place, and a new `sort: <wrapper>` option MOVES the page's own sort control into the row on phones and back home on
  desktop (+ library `btn-pill`) — the page keeps its handlers, its menu and `syncSortTrigger`. Rewriting `bar.innerHTML`
  on every render would have destroyed the moved node and the focus (Cabinet calls `facetFilter.render()` on every list
  render). Heights: desktop = library `btn-md` (40 = the search) on Cabinet / RAP / eKYC (the shell swaps btn-sm → btn-md
  only when a product is set, so the GEAP BO stays 36); phones = 48 · 16/24 · icons 24 (the component-audit scale
  48 → 24, 40 → 20). The new rule overrides „One back-office button = btn-sm” for these four lists — record such a user
  exception next to the old rule in components.md, or the next job „fixes” it back.
- 2026-10-20 · A sort menu (menuitemradio + group labels) fell through the act-row phone action sheet (it only took
  `menuitem`) and opened as a cramped dropdown on phones → the sheet now renders radio items (trailing check,
  `aria-current`), group labels and a `data-act-sheet-title`; `actMenuPick` in the demo states counts both roles.
  Demo states that clicked facet chips on phones (cabPick, smPick, ffDate, ekFacet, rap pick / chipSheet, pp-01s, sm-01n,
  rap-01b / 01h) now go through ONE helper `ffFacet(h, facet)` (desktop chip | phone „Filtre” → section open, others
  folded so a value click cannot hit another facet) — when an entry point disappears, route every demo through one
  branching helper instead of patching ids one by one (capture's DEMO-ERROR caught sm-01m).
- 2026-10-20 · Traps: (1) a zsh `for spec in "a b"; set -- $spec` does NOT word-split → my probe wrote its PNG over
  the eval script (tb.js); use `${=spec}` or a bash script. (2) `.chip` / the filter meta have author `display` — an
  in-place `hidden` needs its `[hidden] { display: none }` rule. (3) Page-level „bleed to the screen edges” rules for a
  scrolling row (−16 margins + 16 padding + scroll-padding) became dead once the row stopped scrolling → removed on all
  three pages in the same change. hover-audit with `--scope ".cab-filters"` reported „0 interactive” twice (scope
  resolution), `--scope main` covered the row (0 / 0). No sub-agent tool → code-audit / component-audit / hover-audit
  (700) run directly: only standing FPs (Cabinet meta 18, alert link, RAP table cells, eKYC tags / th / pagination /
  header buttons, eKYC phone search icon 20 in a 48 field — pre-existing).
- 2026-10-20 · Phone row anatomy (user: „title 16 on mobile; the badge on top in the same row with the dots”) for the ONE
  act / request row: tags on row 1 (+ ⋮ right), title 16/24 on row 2, meta row 3 — CSS only, no markup change. The title
  row stays one flex box: title `order: 1; flex: 0 0 100%` + row gap 8 puts the tags above it. To keep a corner control
  (⋮) free on the FIRST flex line only while the next line runs full width: span the flex box over both grid columns,
  `padding-right: control + gap`, and give it back to the full-width item (`flex-basis: calc(100% + N)`,
  `margin-right: −N`); the control, later in the DOM and positioned, paints over the padding. Measured tags → title 8,
  title → meta 8, ⋮ centre = tag-line centre at 375 / 320 / 740; desktop row geometry identical before / after (scratch
  shot.mjs + probe.js: per-row rel rects + fonts). The parity spec showed exactly the two ⋮ props → `expected`.
- 2026-10-20 · Breakpoint drift: the Cabinet request row's phone rules and the shared doc-card actions switched at 720 while
  the brief (and the action sheet) say 760 — moving a „phone layout” means moving EVERY piece of it to the same query
  (act pill under the meta restated for the act row at ≤760 with higher specificity; the shared doc card stays at 720).
  Check 740 explicitly. Side find by measuring: a notice placed in `grid-row: 4` on a row WITHOUT a pill left an empty
  implicit row 3 → 20 above instead of 12 (paper acts); give row 4 only `:has(> pill)`.
- 2026-10-20 · Mid-job request „even phone rhythm on the list pages”: a stack probe (scratch rh/gaps.js: title / desc /
  search / pills / applied / chips / first card, edge-to-edge distances) answered it in numbers before and after. Trap:
  `.cab-intro + .cab-toolbar` never matched on the two list pages — hidden siblings (`.sm-list-view__lead`, restriction
  slot) sit in between → `~`. A coordinator commit swept my `?v=` bumps into its own commit while I worked (shared
  index) → the key went live pointing at old CSS; always bump to a NEW key at commit time. No sub-agent tool → ran
  code-audit (standing FPs: meta 18, alert link, FO „Solicitare nouă”; the unscoped sm-01 `{}` was a scope miss —
  re-run with `--scope .sm-list-view`), hover-audit 0 / 0 at 1440 + 700, component-audit (only the pre-existing header
  avatar / hamburger), compare-styles 0.
- 2026-10-20 · Sort sheet („looks awful, do components, nice text hierarchy”, Cabinet sm-01f at 375). A menu turned into an
  action sheet by a generic converter (act-row: menuitemradio → plain text rows + trailing check) is fine for actions,
  wrong for a CHOICE with two parts: a sort = library radio group (key, 48 rows, 16/24, checked medium) + library
  segmented control (order, labels follow the key) + sticky „Aplică” (draft, as the filter sheet) — `js/sort-sheet.js`
  (`GEAPSortSheet.menuHtml` desktop / `.bind` phones) on the shared GEAPSheet. To take a trigger away from another
  module's window-capture listener WITHOUT editing that file (act-row.js was another agent's): drop the class its
  selector matches (`.e-permits-fo-intent-act__action`) and restate what that class gave (anchor `position: relative`,
  `fitMenu` is-end / is-start) in the new CSS; then the trigger's own target-phase listener (`stopPropagation`) beats the
  page's delegated dropdown toggle. Native radios inside a `role=radiogroup` div give arrows + one tab stop for free; the
  segmented control needs roving tabindex + arrows by hand. Library radio quirks: `:focus` (not focus-visible) outline
  shows after a tap → suppress `:focus:not(:focus-visible)` scoped; `.radio-texts` gap 3 is flagged off-scale by
  code-audit (inert with one child — library FP). Demo clicks on a label focus the input → blur at the end of the demo
  helper so a state shot shows the tap look. A long segment pair („Cele mai apropiate / îndepărtate”) wraps to 2 lines
  at 320 (64 high) — measured, acceptable, documented; never truncate. No sub-agent tool → component-audit (scoped sheet /
  menu 0), hover-audit 0 / 0 (700 temp copy + 1440 menu), code-audit (only standing FPs) run directly.
- 2026-10-20 · Sort sheet v2 (user via coordinator): „Ordine” = the SAME library radio rows as „Sortează după”, no segmented
  control — one choice type per sheet; my v1 mixed radio + segmented (and the segmented wrapped to 2 lines at 320).
  When a sheet holds two single-choice groups, build both from one row helper. Trap avoided: redrawing a radio group on
  its own `change` replaces the focused input and breaks arrow-key navigation — redraw only the group whose LABELS change
  (the order after a key change), never the one being chosen in. hover-audit crashed on its first (cold) run again — rerun.
- 2026-10-20 · Comparison demo (sm-01z „Comparație alerte”, user: „put our alert from components near the actual one”).
  Cheapest isolation: a URL param (`?alerte=comparatie`) filters the data to ONE record and a wrapper around the row
  builder's RETURN string inserts the samples before the row content's closing `</div>` (found from the action
  markup) — the shared `GEAPActRow.html` and the real rows stay untouched. Library traps found by measuring, not
  reading: (1) the library alert markup carries `modal--fade` = `opacity: 0` in main.css outside an open modal →
  copying it „exactly” renders an invisible alert; drop it and say so. (2) `messages.html` has emoji icons and no
  warning sample; `.message--warning` colours only `.banner__icon`, so `.message__icon` stays black. (3) Library
  `.banner` / `.message--banner` are page-top strips: radius 0, centred content, padding-right 40 reserved for the ×,
  16 / 22.4 text on desktop (line-height 1.4 → fractional px), slide-in animation; `.message--inline` is 14 / 19.6
  with the WHOLE text in apricot-700. hover-audit with the card as scope lists the clickable row's children as
  „no-hover” (same on sm-01a = tool artefact) → audit with `--scope .sm-list-view` (0 / 0).
- 2026-10-20 · Row action menus (action-menu-v1; started as „the 3 dots modal is ugly”, 6 course changes in one job): the
  user REJECTED the phone action sheet for act / request menus („as Telegram — a dropdown menu, not a down modal”) →
  every row / act-profile action menu is the anchored dropdown at every width, phones with a touch item size (48 ·
  16/24 · icon 24 · surface r16 / 8), unavailable reasons as a 2nd line, danger last after a separator. Request rows got
  a labelled square „Acțiuni ⌄” (⋮ kept as `?actiuni=kebab`), act rows „Postprocese ⌄” (label shortened by the user
  after two rounds: never rename a Figma/PO label on your own — „Acțiuni” for acts was reverted within minutes), title
  16/24 at all widths. Lesson: when a brief is redirected repeatedly, keep each decision in ONE place (shared CSS block,
  one `menuItemsHtml`, one label default) and discard superseded work with `git checkout` of your own files before
  rebuilding — my morning sheet redesign cost nothing to drop because it was uncommitted.
- 2026-10-20 · Phone row with „tags · button” on line 1 and a full-width title under it, no markup change and no width
  reservation: make the row `display: flex; flex-wrap: wrap`, the content + title row `display: contents`, place items
  with `order` (button `margin-left: auto` on line 1). The meta's dot-clip box needs `flex-basis: calc(100% + sep)`.
  When the button does not fit beside the tags, flex wraps it alone ABOVE the title → measure in JS (class off → read
  button top vs first tag bottom → toggle `.is-action-below`, one synchronous pass, in the existing syncCut scheduler)
  and move it under the meta. compare-styles found a hidden difference: a button inside a non-flex wrapper stays
  `inline-flex` / `min-height: 0`, the act row's (wrapper = flex) computes `flex` / `auto`.
- 2026-10-20 · Traps: (1) a window BUBBLE click listener never ran for Cabinet triggers (their handler calls
  `stopPropagation`) → capture + `requestAnimationFrame` (after the page's own toggle opened the menu, before paint);
  (2) the FO ≤720 rule anchors menus `left: 0` → for a button on the right the menu's first frame overflowed and the
  Ghișeu window scrolled SIDEWAYS (tags at x −66) before the fit ran — make the phone default the expected side
  (`right: 0`) so no first frame overflows; (3) `100vw − 32` is not the room a menu has inside an inset window → cap
  with the measured side room (`--act-menu-max`, geometry custom property, like the FO floating lists); (4) Cabinet
  menus had NO arrow keys and Esc did not return focus — added (Enter/Space/↓ first, ↑ last, Home/End, Esc → trigger,
  Tab closes); detect keyboard opening by a preceding Enter/Space keydown, not `event.detail === 0` (demo `.click()` has
  detail 0 too and would move focus in every demo shot); (5) code-audit `dropdown-surface` hard-coded radius 12 → taught
  it the documented phone exception (r16 for row action menus ≤760) instead of living with a „major”. Mobbin MCP not
  available again → NN/g / GOV.UK / M3 / HIG. No sub-agent tool → ran component-audit (0), hover-audit 0 / 0 at 700 +
  1440, code-audit (standing FPs only: meta 18, alert link, sm-tacit, open menu over content), compare-styles 0.
- 2026-10-20 · Phone dialog header (user: „all down modals should not have the top line like iOS native — not functional; title
  near the edge; bigger ×”). Inventory by a header probe over every dialog family at 375 / 320 (scratch sh2/probe.js: topmost
  open surface → handle element or `::before` ≤ 8 high, title rect + font, × rect + icon, × centre vs the title's first line
  box, title → first content): the only handles were `GEAPSheet`'s `.bottom-sheet__handle` (title at 48) and the library phone
  calendar's `.date-picker::before` 48×4 — every other family already had the title at 16. ONE section 9 in
  `css/modal-phone.css` (≤760) for sheets, library modals and FO dialogs: header 16 16 8, title + × top-aligned, × 40 / icon 24
  centred on the 32 title line with `margin-block: calc((line − 40) / 2)` (flex headers) or `top: 16 + (line − 40) / 2`
  (the absolute library ×), library header right padding 8 + 40 + 16, tertiary → hover → pressed + canonical ring; the
  calendar fix is unscoped (its `.is-mobile` is ≤768). Desktop × stays 32 / 16 (probe at 1440 identical). Tokens as two
  custom props (`--modal-phone-close`, `--modal-phone-title-line`) so the Figma spec reads off one place. Behaviour probe
  (Esc / × / scrim after the state): all close; „still open” after closing the A4 viewer = the parked „Vizualizare act”
  coming back (by design) — check WHICH dialog is open after a close. Pre-existing, reported: fo-04d focus on body + Esc
  does not close the FO picker from there, hover-audit „covered” Anulează (same on a HEAD worktree :8971). Shared index again:
  another agent's commit (ead3b858) swept my uncommitted js/facet-filter.js hunk in — bump the cache key anyway. No
  sub-agent tool → code-audit (standing FPs: radio-texts 3, section triggers, FO close `button-not-library`), component-audit
  0, hover-audit 0 / 0 at 700.
- 2026-10-20 · Request rows back to the ⋮ (row-kebab-v1; user: „Acțiuni is too ambiguous” — a generic verb label says
  no more than ⋮ and costs row-1 space; the action-menu-v1 research conclusion „labelled beats icon” held for the acts'
  SPECIFIC „Postprocese ⌄”, not for a catch-all). Two course additions mid-job, both cheap because the trigger lived in
  ONE function (`actionsHtml`) and the phone layout in ONE CSS block: (1) „clicking the card always shows the details,
  never the full flow” → `openRow` = hash only (the draft redirect + its row-level redirect error went; the error stays
  on the explicit ⋮ / profile actions), row `aria-label` lost „— continuă completarea”; (2) „the 3 dots absolutely
  positioned on mobile” → corner control without markup change: `position: absolute` at
  `16 − (32 − 20) / 2` (= centre of the 20 tag line), row `padding-right: 16 + 40` reserves row 1 only, and every
  full-width line under it takes the 40 back (`flex-basis: 100% + 40`, `margin-right: −40`, meta `100% + 18 + 40`).
  Trap found by a stress probe (cloning a third tag into a real row — no real ⋮ row has 3 tags): the shared tag rule
  spaces tags with `margin-left: −4` against the row gap 8, so a tag that WRAPS starts 4 left of the padding (13 vs 17;
  pre-existing on the lone-„Detalii” tacit row d-gara) → in the ⋮ rows row 1 holds only tags, so `column-gap: 4` +
  `margin-left: 0`. Probe columns that made it checkable: button / first tag / last tag / title / meta insets from the
  card + tag line count, at 375 and 320. Parity spec: the trigger differs ON PURPOSE → ignore its component props in
  the pair, phone reservation props as `expected` per viewport (43 → 0). Act rows checked: Cabinet pp-01 row → act
  profile (already), FO pp-02 / Ghișeu act rows have no row click at all. No sub-agent tool → component-audit 0,
  hover-audit 0 / 0 (1440 + 700 temp copy), code-audit standing FPs only (open menu over the next ⋮, alert link,
  sm-tacit, trajectory `.u-visually-hidden`), sm-* regression 82 × 2 clean.
- 2026-10-20 · Fixed row trigger for ALL rows + menu icon footprint (act-trigger-fixed-v1 / act-icons-v1; user: „Postprocese
  with the same fixed placement on mobile as the 3 dots”, then mid-job „the straight Detalii, do the same” and „nice central
  icons, same size footprint, like Telegram”). (1) Move a Cabinet-only rule into the SHARED anatomy instead of copying it per
  trigger: ONE `:has(> :is(__action, .cab-doc__actions) .btn)` rule (descendant `.btn` — the request rows nest
  `.cab-doc__actions > .e-permits-fo-intent-act__action > .btn`, my first `> .btn` silently matched only acts; the probe
  showed the ⋮ back in the flow) + ONE reservation `--row-trigger-w` written by JS from the button's own width (read all,
  then write if changed, in the existing syncCut pass) — label widths (32 / 87 / 132) never become CSS literals. The
  `is-action-below` fallback went with it. (2) A 24 icon in a 20 tag line: `margin-top: (20 − 24) / 2` + `align-self:
  flex-start` keeps the tags at 16 and every centre at 26 without cramping the title (icon → title 8). (3) Icon footprint
  = measure, don't eyeball: render each sprite symbol to a canvas (data-URL SVG, alpha > 40) → ink box + ink area per
  glyph; the outliers were pause 10×14, cross-small 9.6, judge-gavel 23.3. Normalise in CSS by `use[href$="#icon-…"]`
  (`--menu-icon-optical` → `scale`), never in the sprite; pick icons by ONE map in the shared renderer (`GEAPActRow.ppIcon`
  by id OR label) so FO / Cabinet data ids and Ghișeu labels cannot drift. A contact sheet (dashed 24 box + 20 guide)
  made the choice reviewable. (4) Shot helper with `--menu 1` (clip = open menu ∪ trigger) gave the before / after crops
  in one run; HEAD worktree on :8977 for before shots and a desktop-geometry diff (identical). Known limit reported:
  Ghișeu at 320 (desktop-only page) — 256 card, the tag wraps under the icon; its up-flipped menu tucks 20 under the
  window's sticky header (fitMenu measures the viewport, not the scroll box). No sub-agent tool → component-audit (only
  pre-existing header / shell majors), hover-audit 0 / 0 at 1440 + 700 (FO / Ghișeu need `--scope body`: `main` = 0
  interactive), code-audit (meta 18 FP only), compare-styles 0 with the „(Detalii)” pairs added.
- 2026-10-21 · Corner trigger at EVERY width + desktop title / tags inline (trigger-corner-v1; user: „on desktop also put the
  action fixed in the corner”, mid-job „make sure it's right here” with a screenshot of the META running out of the
  card, then „keep the status badge next to the title if there is space”). (1) Unscoping a phone flex anatomy to desktop
  broke what the GRID used to cap: a `nowrap` one-line meta as a flex item has `min-width: auto` = its min-content →
  1 230 px wide in a 976 card. A grid column (`minmax(0, …)`) had hidden that; in flex add `min-width: 0` to every
  nowrap / ellipsis item. `scrollWidth > clientWidth` on the page caught it, but only after I had already looked at
  numbers that „seemed right” — so (2) a ROW-BOUNDS assertion is now the gate: every painted descendant inside the
  card's inner box (exclude open menus; measure the PAINTED box — the meta's 18 dot-clip strip starts outside by
  design), title inside the 16 padding, a cut title has its tooltip, the trigger overlaps nothing — at 1440 / 1024 /
  761 / 375 / 320 incl. a hover state and cloned 2–4 tags + long titles (scratch rowcheck.js / stress.js). (3) „Title
  floor of 200, but only when the title is long”: CSS can't — `min-width` beats `max-width: max-content`, so a short
  title got an empty 200 box before its tag (seen in the 1440 crop, not in the numbers). Measured class instead
  (`.is-title-tight` when a CUT title < 200; class off → read all → write). (4) The desktop `fitMenu` flip must not
  clear a flip the page computed itself (Ghișeu flips against its scrolling window) — skip those containers.
  (5) Another agent committed icon changes on top of my previous commit mid-job (circle-x): re-read `git log` before
  staging, rebuild the playbook blob from the NEW HEAD. Dead grid rules (Cabinet request grid, action column) removed in
  the same change. No sub-agent tool → component-audit (rows 0), hover-audit 0 / 0 (1440 + 700), code-audit (meta 18
  FP), compare-styles 0 at 1440 / 1024 / 375 / 320.
- 2026-10-21 · Act profile best practice (act-profile-v1; Feature 90818, US-55 / 162 / 161 / 159 / 143). „Each fact once”
  decided in ONE place per fact: number + status + ONE status date (`actHeaderDate`) in the header facts card, the rest in
  Detalii; a notice never repeats a date of the facts line (my first notices said „suspendată până la …” right under
  „Suspendat până la …” — caught by looking at the 1440 crop). Who decided + why + the right with a deadline
  (contestație = appealDays from the decision, only for authority-initiated changes) + ONE action link = the notice;
  `statusChange` data next to the existing status dates (`cabinet-evo.json › actProfiles`, Cabinet-only) instead of the
  shared acte-permisive.json. The Istoric is derived from the perspective's requests (issue = the request whose actNr
  is the act's number; finalized post-processes; one in progress) — no per-act history literal to drift.
- 2026-10-21 · REJECTED the same day (user): the YouTube „channel” row (authority avatar + name + subdivision beside the
  actions) — „screenshots are look and feel, not structure; research before copying a layout”. Kept from it only the
  grouped grey buttons and the compact facts card; actions LEFT-aligned under the title (GOV.UK / the request
  profile). Before transplanting a reference layout, check what each slot means in OUR domain (a channel = the
  publisher the viewer follows; an issuing authority is not that) and ask/flag instead of building the analogy.
- 2026-10-21 · One-line action row with a „⋯” overflow (user: „hide the actions that don't fit under the dots”):
  `fitActActions()` = add `.is-measuring` (natural widths, no flex-grow), unhide all, READ every width + the bar width,
  remove the class, then WRITE `hidden` on what does not fit (out of the tab order) + rebuild the „⋯” menu only when the
  overflow set changes (keyed in `data-items`, an open menu keeps focus); ResizeObserver on the bar + fonts.ready. The
  overflowed „Postprocese ⌄” becomes a labelled group in the same menu (`cab-menu__label`), not a submenu. Traps: the
  shared `fitMenu` flipped the right-edge „⋯” menu to `.is-start` (it ran 240px off-screen at 320) — a trigger that is
  always at the row's right edge gets `right: 0` for every flip class + `max-width` from the known inset; and demo states
  that clicked „the first [data-cab-menu-trigger]” hit the hidden one on phones → click the visible one.
- 2026-10-21 · Demo ids the brief asked for (pp-01y / pp-01z) already existed (act-fields states) → new family pp-03…;
  `grep -c` before naming, say so in the report. Deep-link states (`params: { as, act }`, ready on the profile h1) are
  cheaper and steadier than list clicks. The no-hover on `.copy-value__button` came from another agent's uncommitted
  rewrite of css/copy-value.css — check `git status` of the component before „fixing” a shared one. No sub-agent tool →
  code-audit (standing FPs only: BO 11/7, `.u-visually-hidden`), hover-audit (1440 / 700 / 375 incl. both menus 0 / 0
  apart from the copy button), component-audit 0 (desktop / mobile / edge), RAP dialogs proved unchanged by a probe.
- 2026-10-21 · Breadcrumb = the library component everywhere (breadcrumb-v1; user: „why invent it?”, Figma Components
  232:5282). Inventory = a probe over ALL demo states at 1440 + 375 (visible `.breadcrumbs` + any a / button with
  „Înapoi la” / „‹” text, a `*back*` class / data hook, or a `*crumb*` class outside `.breadcrumbs`) — it found the real
  forks in minutes: the BO top-bar „← Înapoi la …” buttons (6 profiles + eKYC, duplicating the breadcrumb right below), the
  builder's hand-made `›` panel trail + „← Grila” button, the passport template detail button, and BO phones showing the
  wrapped desktop trail instead of `--mobile`. Most other „back” candidates were NOT breadcrumbs (wizard step „Înapoi”,
  drawer footers, „Schimbă”, empty-state actions) → spec exemptions, not fixes. ONE module `js/breadcrumbs.js`
  (`GEAPBreadcrumbs.html` = desktop trail + phone back pair, „…” overflow, cut-only tooltips) + `css/breadcrumbs.css`; the
  shell `renderBreadcrumbs`, `CabEvo.pageHeader`, RAP and the builder only map crumbs. Traps: (1) removing the top-bar
  back left the header tools on the LEFT (the hidden title row had been the spacer) → `margin-left: auto` on the tools —
  look at the 1440 capture after removing any flex child; (2) I applied edits while the „before” sweep was still running
  → finish (or move to a HEAD worktree) the before sweep FIRST; (3) the session restarted TWICE and wiped the scratchpad
  (edit scripts, sweeps) and once a tree file (my playbook lesson) — commit as soon as the part verifies; when other
  agents' hunks interleave with mine (tool / doc files), insert my blocks into the HEAD blob textually; for code files
  `git diff -U0` + a keyword hunk filter + `git apply --cached --unidiff-zero` is faster than rewriting scripts; (4)
  `--truncate` + `--mobile` breaks the library chevron (link becomes a block) → the phone label keeps its ellipsis span;
  (5) the passport template detail renderer is dead code (`templateCode` is never set) — fixed anyway, reported; (6) on a
  machine at load 20+ a 1 700-state sweep crawls — sample (every 9th state per family + every state using a changed hook).
  component-audit rule 5 (`crumb-trail` / `back-link`) proved on HEAD (26 findings on 23 states × 2 widths) vs tree (0,
  no other new finding). No sub-agent tool → component-audit, hover-audit (0 / 0), code-audit (standing FPs only) run
  directly.
- 2026-10-21 · Button icons (button-icons-v1; user: „our buttons in code are wrong: the icons seem too small and off”, Figma
  Components 39:177). Measured Figma per variant with get_metadata (symbol → icon instance → vector bounds): Small 32 · icon
  16 at 8 · gap 6; Medium 40 · icon 20 at 12 · gap 6 · 14/20; Large 48 · icon 20 at 16 · 16/24; icon-only 32/16, 40/20, 48/20.
  A probe over 368 demo states (every visible `.btn`: box, padding, gap, font, icon box, `getBBox`×CTM glyph ink, icon
  centre vs button / label centre) showed the real causes: Medium / Large buttons with `icon small` (16), bare `icon` +
  `width="16"` rendering 24 in Small buttons (the attribute loses to `.icon { width: 24 }`), md gap 4, non-square md / lg
  icon-only. Vertical centring was already 0 everywhere — „off” was size + gap, not alignment. Fix = ONE file
  `css/button-icons.css` right after main.css on every page: `--btn-icon-size` per size on `.btn`, `.btn > svg.icon`
  (0,2,1) beats `icon small` without touching markup; paddings through `:where(:has())` so product placements still win;
  per-component icon sizes / gaps deleted (6 rules). Deliberate phone exceptions (48 pills / sheet × = 24) survive by
  higher specificity — check them at 375. Traps: (1) the library `.btn.btn-sm:has(> .icon:first-child)` is (0,4,0) —
  an icon-only padding reset must repeat the `:has()` (a `:where` version lost); (2) zsh `set -- $s` does not word-split
  → hover-audit got the state „dos-01 main” and printed „undefined interactive” — loop over plain ids; (3) the sprite's
  24-grid glyphs at 16 are ~15 % lighter than Figma's own 16-grid set — that is a sprite gap, not CSS; reported. No
  sub-agent tool → code-audit (static 0; only standing FPs), component-audit (no `.btn` finding), hover-audit run directly.
- 2026-10-21 · Action icons (action-icons-v1; user: „didn't we discuss that every Editează has an edit icon, and Elimină a
  trash icon?”). The rule lived only in `ACTION_ICONS` as EXACT labels („Editează”), so every hand-written „Elimină” /
  „Șterge” button (rule builders, tariff drawer, eKYC lists, Process Designer terms) and every longer label („Editează
  acțiunile”) slipped through, and `renderStackMenu` defaulted a missing item icon to the PEN — a „Șterge” item without
  `icon` would have shown ✎. Fix at the source: `actionIconFor(label)` (exact map, then the Editează / Elimină / Șterge
  prefixes, minus clear labels) feeds `actionLabelHtml` AND overrides the menu item icon, so new code gets it by default;
  module copies (`icon("delete", 16)` + `<span>`) where the shell helper isn't reachable. Decisions: condition × in rule
  builders, FO repeat / activity / „Alt document” cards → trash (they delete data); file-item ×, chip ×, search ×, filter
  popover „Șterge”, „Șterge filtrele / formatarea” and confirm-dialog footers stay (clear / detach / the dialog already
  says it). Enforced by component-audit rule 6 (`action-icon`, `action-icon-colour`; closed menus counted when their
  trigger is visible). Inventory method: a probe listing every button / menuitem whose label starts with the verbs + its
  `use` hrefs — use `checkVisibility({ checkOpacity: true })`: the closed Form Builder overlay sits at opacity 0 with real
  rects and leaked its menus into every state. Session restart wiped the scratch edit scripts mid-job → staged by
  selecting my `git diff -U0` hunks by signature (`git apply --cached --unidiff-zero`) and, where a hunk merged with
  another agent's lines (audit tool header, agent file, `?v=` lines), HEAD + my inserted blocks via hash-object.
- 2026-10-21 · Copy value = ONE button with the whole element as the target (copy-wrap-v1; user: „hover on the entire element, a
  nice even grey wrap, as we used in the first places”, then mid-job „even Copiază tooltip → smooth ✓ Copiat … tables / stacked
  lists: no icon, but the behaviour is the same”). (1) Even wrap without moving anything: padding 4 8 + the SAME negative margin
  (text stays on the label line, row height unchanged). Phones: a taller padded wrap (6) painted over the next text line
  in wrapped meta → keep the visible 4 8 and add an invisible `::after` hit area `max(0, (32 − 1lh − 8) / 2)` (≥ 32 on a
  12/16 RAP IDNO too). A label + 4 + value row („IDNO”, „Nr.”) had its label covered by the 8 bleed → +4 on the value.
  The gate's text-overlap check (Range.getClientRects of host text vs the wrap) found both — pixels I had looked at twice. (2) The wrap bleeds 8 into neighbours: hosts that clip must be opened ON PURPOSE —
  act / request meta `clip-path: inset(0 0 0 18)` (dot strip) cut the wrap's left 8 + the top / bottom → `inset(-8 -8 -8 10)`
  (the dot at 8–10 stays hidden) and −6 more on focus-visible; `.__case-cell > span` / `td > .cell__primary` ellipsis rules
  (`overflow: hidden`) clipped the wrapper → `:not(.copy-value)`. And the NEXT meta part (position: relative, later in DOM)
  painted over the wrap's right 8 → a click there opened the row: `position: relative; z-index: 1` on the button. Found by a
  geometry gate (scratch gate.js: hit-test the wrap's 4 corners + centre with elementFromPoint, first clipping ancestor,
  text-vs-wrapper shift, height ≥ 32 on phones) over 19 states × 2 widths — run it whenever a control bleeds outside its box.
  (3) Tooltip that keeps its centre while the label changes: left = centre x + `translate: -50%` (separate from the library
  `transform` show animation), labels in one cell (active in flow, others absolute + centred), JS animates the width from →
  to and `justify-items: unsafe center` so the growing label is revealed from both sides (plain `center` left-aligned it
  while the box was narrower); clamp the centre with the widest label. User then: „the Copiat transition is awful” — a
  symmetric cross-fade with a vertical slide put „CopCopiat” on screen at 60 ms. Fix = slide the old word LEFT 8 and fade it
  in the first half (112 ms), fade „✓ Copiat” in place from 60 ms, width 225 ms decelerate. Proof = scrub, don't guess:
  `document.getAnimations()` → pause → `currentTime = 0 / 40 / 80 / 120 / 160 / 230` → crop each frame (stub the 1 500 ms
  hold timer, or it hides the tooltip while the slow screenshots run); reduced-motion state needs its own `transition:
  none` for every more specific transition selector (`.is-leaving`, `.copy-value__copied.is-active`). (4) Enter on a button inside a row that opens on Enter
  (RAP tbody keydown) opened the row AND `preventDefault` killed the native click → a capture-phase keydown stop for
  Enter / Space on the copy button (no preventDefault). (5) Touch: hover rules inside `@media (hover: hover)` — no sticky grey
  after a tap. (6) CDP: a keyDown Enter needs `text: "\r"` to activate a button; `elementFromPoint` corner probes need a 3 px
  inset on a radius-6 box. component-audit rule 4 now: copy-in-list = DEFAULT variant in a list, new missing-copy = a plain
  dossier / act / IDNO candidate in a list. Session restarted mid-job (scratchpad wiped): kept every edit as old → new
  strings so the HEAD-based blobs could be rebuilt for shared files. Second restart (wiped again, other agents had committed in
  between and one commit reset two of my HTML keys): staged by HUNK instead — `git diff -U0 HEAD` split into hunks, pick mine by
  index, `git apply --unidiff-zero` onto a HEAD copy; mixed hunks (another agent's lines inside mine) by line replacement.
- 2026-10-21 · Trajectory gap (user: „line closer to the check icons, everywhere”, trajectory-gap-v1): a connector drawn
  BETWEEN content-sized boxes with a fixed margin puts the line (box − icon) / 2 + margin from the icon (11…63 px).
  Fix = measure from the icon, not the box: the step filler joins the two bodies with no margin, each body draws
  two absolute half-lines (`left: 0; right: calc(50% + 12 + 8)` / mirrored; first / last hidden; brand on the side
  of a reached connection via `:has(+ …)`), body min-width 24 + 2 × 8, only outer ends rounded. Proof = a pixel
  scan of the marker-centre row (canvas in the page, DPR 2: gap to the first non-background pixel + intensity dips
  along the line for seams) — scratch measure.mjs pattern; vertical unchanged proved by byte-identical crops vs a
  HEAD `git worktree` served on another port.
- 2026-10-21 · Audit fix batch 1 — phone field sizes (audit-fix-v1). „One shared phone rule per control” = a new file
  `css/field-sizes.css` loaded LAST (before modal-phone.css) on every page with fields, selectors prefixed with `:root`
  (+1 class) so they beat the scoped DESKTOP sizes of the toolbars (BO `[data-demo-flow] .e-permits-workplace__search`
  0,3,0 `height: 40px`, `…:has(.icon-search) .input` 0,4,0, `.cab-search.search-input.medium .input` 0,4,0) without
  `!important`; then DELETE the per-page phone copies (Cabinet, RAP, eKYC, facet sheet). The 12px search text was not a
  product rule at all: the library `.search-input.medium .input` (0,3,0) reads `--text-body-sm-font-size`, which main.css
  drops to 12 at ≤720, and beat the shell's 14 (0,2,0). Proof: component-audit 35 → 10 field findings on 13 states × 2
  (the 10 left = the rows-per-page select, replaced by the shared pager in batch 3) + a field probe (box / text /
  placeholder / icon size@inset) on every page at 1440 / 375. Parity specs: eKYC filter (51) and RAP profile (4)
  differences are byte-identical on a HEAD worktree (:8936) — pre-existing spec drift, not mine; check HEAD before
  „fixing” a parity spec. Staging with other agents' hunks in the same files: build HEAD + my asserted edit scripts in a
  temp root (`EDIT_ROOT`), hash-object + update-index, commit in the same command (scratch af/stage.sh).
- 2026-10-21 · Generated document viewer = preview + signature tray (doc-viewer-v1; user: „remove Doar citire and Date generale
  for generated documents, keep a nicely integrated signature part, badge ABOVE «MSign · SIA GEAP · date», not next to the
  title”; mid-job the coordinator gave the reference GEAP 2.0 11366:6892). Inventory by grepping the viewer strings („Doar
  citire”, „Date generale”, „MSign”, `openDocModal`, `openDocument`, `previewPage`): 5 viewers (BO dossier modal, Cabinet doc
  modal, shared act dialog = Cabinet „Vizualizare act” + RAP „Forma de tipar”, Ghișeu previews, FO certificate modal — the
  last has no A4 preview, left + reported). ONE helper `GEAPDocPreview.signatureHtml` in the shared preview module (loaded
  wherever an A4 viewer is) + one CSS block; each viewer only decides „generated?” (`sursa` mdocs / generat = the blue icon)
  and passes signer / stamp from its data. Figma without get_design_context (not exposed in this session): measured the
  reference PNG with a tiny zlib reader (canvas bg 245 + border 217, tray from y 554 flush under the canvas, r16 bottom,
  tag at +12, meta #757575 = tertiary, not the brief's „secondary” → followed Figma). Traps: (1) the viewer bodies have a
  flex gap (16 / 24) → the tray touching the canvas needs `:has(> tray) { gap: 0 }` on each body, not a negative margin;
  (2) the Cabinet phone canvas kept 24 padding while the other A4 viewers use 8 edge-to-edge (modal-phone § 7) → the
  tray's inset looked wrong at 375 only — align the viewer first, then the tray; (3) the BO dialog is shared with Ghișeu's
  own `modal--lg` doc mode → toggle `e-permits-detail-modal--doc` per open and strip it on close only when not lg; (4)
  the Cabinet download text used to read the RENDERED rows — once rows are hidden, build it from `rowsHtml` in a detached
  box (download probe with `HTMLAnchorElement.prototype.click` patched proved all 7 viewers). Repeated facts removed from
  Ghișeu subtitles (signer / date now in the tray). No sub-agent tool → component-audit (only the standing „missing-copy”
  on values INSIDE the A4 page table), hover-audit 0 / 0, code-audit (standing A4 mm padding / zoomed text gaps / FO
  doc-modal buttons) run directly.
- 2026-10-21 · Audit fix batch 1 — phone field sizes (audit-fix-v1). „One shared phone rule per control” = a new file
  `css/field-sizes.css` loaded LAST (before modal-phone.css) on every page with fields, selectors prefixed with `:root`
  (+1 class) so they beat the scoped DESKTOP sizes of the toolbars (BO `[data-demo-flow] .e-permits-workplace__search`
  0,3,0 `height: 40px`, `…:has(.icon-search) .input` 0,4,0, `.cab-search.search-input.medium .input` 0,4,0) without
  `!important`; then DELETE the per-page phone copies (Cabinet, RAP, eKYC, facet sheet). The 12px search text was not a
  product rule at all: the library `.search-input.medium .input` (0,3,0) reads `--text-body-sm-font-size`, which main.css
  drops to 12 at ≤720, and beat the shell's 14 (0,2,0). Proof: component-audit 35 → 10 field findings on 13 states × 2
  (the 10 left = the rows-per-page select, replaced by the shared pager in batch 3) + a field probe (box / text /
  placeholder / icon size@inset) on every page at 1440 / 375. Parity specs: eKYC filter (51) and RAP profile (4)
  differences are byte-identical on a HEAD worktree (:8936) — pre-existing spec drift, not mine; check HEAD before
  „fixing” a parity spec. Staging with other agents' hunks in the same files: build HEAD + my asserted edit scripts in a
  temp root (`EDIT_ROOT`), hash-object + update-index, commit in the same command (scratch af/stage.sh).
- 2026-10-21 · doc-viewer-v2 (user updated Figma 11366:6892 after my v1 commit, + „the document window should be the same
  round as the wrap”). Re-measured the new PNG with the zlib reader instead of trusting the v1 notes: the tray became a
  separate card 12 under the canvas, full canvas width, r16 on all corners; the example is an UPLOADED declaration and the
  node is the însoțitor „Document · details” component → the layout applies to every document, not only generated ones
  (v1 had read the same example too narrowly — when a Figma component is the generic modal content, its scope is every
  caller of that modal). Canvas radius: Figma 24, no 24 token in main.css (`var(--border-radius-24, 24px)` exists only as
  an undefined-token fallback in product CSS) → 16 = the card's radius, so canvas + card read as one unit; reported. The
  Figma line around the canvas became an inset ring (a real border would shift the fitted page by 1px). Session restarted
  mid-job: my v2 edits survived in the tree mixed with two agents' hunks in the shell / solicitari / components.md →
  kept every edit as asserted (old → new) pairs in scratch scripts and staged HEAD + those pairs. code-audit flagged a hex
  inside a CSS COMMENT (`hex-outside-token`) — write colour names / tokens in comments too.
- 2026-10-21 · Component auditor v2 (tools only; user: „use only our components, and add it in skills / agents so we don't
  get back to this again”). (1) The big hole was the allow-list, not a missing rule: „any BEM part of a documented block
  passes” let 25 745 controls through (builder top bar, BO pager, doc-modal buttons, FO wizard buttons). Parts now pass
  only when the PART is documented / internal to a listed product root / in `partAllow`, and a paint test (`button-paint`:
  fill ≠ background or a box border or an inset ring + radius / side padding at 20–64 high, no `.btn`) catches a hand-rolled
  button whatever its class — documented components are NOT exempt by themselves; exceptions = spec entries with a reason
  (`buttonPaint.allow`), and selected / current / open / focused fills are skipped (a state fill is not a button look).
  (2) Inventory parser: an `.is-rail` in a cell reset the „current block”, so short `__pool-select` names resolved to
  nothing — never take a block from `is-` / `has-` classes (575 documented classes instead of 526); ~~struck~~ rows document
  nothing. (3) Wait loop bug (old tool too): reading `data-demo-state` without matching the id read the PREVIOUS page, so a
  record could describe another state — the tell was srv-01 and rap-01 with identical counts. Load through `about:blank` and
  wait for the exact id / `id:error`. (4) Interaction finder: `[class*='sheet']` matched `<html>` (a sheet-open state
  class) and audited the whole page as „opened” — exclude html / body and wrappers of the trigger. (5) Results are
  appended per state × viewport to ndjson (`--resume`, `--workers`, `--summary`): my own `pkill -n` on a shared pattern
  killed the sample sweep and the resume lost nothing — never pkill by a pattern another agent's run can match (another
  agent was running the same tool). After the session restart a second run wrote into the same `--out` and the ndjson mixed two spec versions (duplicate keys, different numbers) → the tool now takes `<out>/.lock` (exit 5 while another live run holds it); always give a run its own `--out`. (6) Proving rules: inject known-bad / known-good fixtures into a clean state and run
  the tool's own page code extracted from the source (scratch selftest.mjs) — a flex container stretched my „good” fixtures
  (align-items: flex-start). The report's „known-good” states (fb-*, adr-01) were known-BAD ones hidden by the part
  loophole: judge each finding, don't trust a 0 from the old tool. (7) Static rules: suggest the token by property family
  (`color` → text token, `background` → background token) or `#fff` reads „--color-background-base-default” in a color
  declaration; component API variables (`--search-input-height`) are not Foundations tokens — private-token = redefined
  COLOUR tokens only. No sub-agent tool → validated directly (fixtures + report states + a 1/8 sample sweep).
- 2026-10-21 · „N modificări nesalvate” → review everywhere (unsaved-review-v1; user: „didn't we discuss that clicking
  „1 modificare nesalvată” shows a modal with the changes?”). The pattern was documented and built for the user / role
  profiles only; service Setări, its save bar, classifier Setări (no status at all), notification templates (no status),
  the dtpl builder (boolean span) and the eKYC page forms each drew their own plain status. Fix = turn the ONE modal into a
  host for SOURCES (`registerChangeSource(key, build)` → `{ name, applies, groups, entries(), undo(ref), discard(), save() }`,
  exported on `GEAPShellApi`), the status = `changesStatusAttrs(key)` — each page cost ~20–30 lines, zero markup / CSS.
  Grep `renderHeaderStatus(` for every count status before calling a pattern „done everywhere”. Traps: (1) a status drawn
  once on the first edit (ntpl / dtpl headers) goes stale when it shows a count → redraw only when the count moves (ntpl) or
  patch the text in place (dtpl, keeps the caret); (2) test data derived from ONE JSON must be ONE row compared against the
  JSON the builder started from (14 false „changed” keys vs `tpl.testData`); (3) every undo / save re-renders the opener →
  modal.js restores focus to a DETACHED node: retarget `overlay.__lastFocused` after an undo and focus the redrawn status
  (same zone: header vs save bar; the template sheet before the page behind) after save / discard — also fixed the old
  user / role path; (4) BO pages scroll `.e-permits-shell__canvas-surface`, not the window — a demo „back to the top”
  must reset scrolled ancestors; (5) the Setări section list is hidden ≤760, so `cfgNav` demos fail on phones (svc-10a
  too, pre-existing) — click it only when visible. Keyboard proved with CDP key events (Enter / Space open, Esc closes
  only the modal, focus back to the status). component-audit flagged the save-bar status as non-library until the
  inventory row existed. Session restarted mid-job: the asserted edit files in the scratchpad (`ur/edits/p*.py`) were
  intact and already matched the tree.
- 2026-10-21 · Audit fix batch 2 — FO hand-built buttons → library `.btn` (audit-fix-v2). Cheapest safe swap: ADD the
  library classes in front of the old class (`btn btn-primary e-permits-fo-next`) and DELETE only the old paint (size,
  colour, hover, focus) — the old class stays as the layout / JS hook, so delegated handlers, demo states and data hooks
  need no change. The product „Large” is the bare `.btn` (48 · 12/20 · 1.375 line), not `.btn-lg` (50.75, 18px) — and
  the library `.btn` text reads `--text-body-md-500-font-size`, which main.css drops to 14 at ≤720 (45 high on phones):
  re-declare the token on the footer scope. A label that used to overflow a FIXED 48 box (the phone draft button) wraps
  to 2–3 lines once the box hugs it → `white-space: nowrap` + let the footer wrap (navigation on its own right-aligned
  row). FO confirm dialogs became the library modal footer (`.modal-buttons` + btn-neutral / -primary / -destructive);
  a JS that added a `--danger` class must now also swap `btn-primary` → `btn-destructive`. Hover / code audits on a
  dialog need a scope that resolves to the OPEN one (`.x:not([hidden]) .card`) — a bare card selector hit a hidden
  copy („0 interactive”). component-audit on 15 states × 2: targeted findings 91 → 0, all majors 403 → 292.
- 2026-10-21 · ONE tooltip runtime (tooltip-one-v1; audit § 3 „Tooltip”, user: „do as you recommend”). Five private
  runtimes (BO cell `.cell-tooltip` in js/table-cells.js, RAP `.rap-tooltip`, Cabinet `.cab-tooltip`, BO sidebar
  nav / collapse spans, native `title=`) → js/icon-tooltip.js grown into `GEAPTooltip` (plain + hint look, both
  library classes; placement + flip, per-kind delay, tap for hints, follow on scroll). Cheapest migration = keep the
  documented attribute (`data-cell-tooltip`, the library `.cell` contract) and move only its RUNTIME — 40+ renderers
  needed no change. Traps: (1) a clipped-text check on an inline `<span data-cell-tooltip>` is always false
  (clientWidth 0) — measure its clipping parent, or a part inside it (an option whose meta is cut); (2) hiding on
  scroll killed tooltips opened by demo `h.hover` (scrollIntoView fires scroll a frame later) → follow the target and
  hide only when it leaves the viewport; (3) the collapsed-rail collapse button showed TWO tooltips (its CSS span in
  English + the runtime's from the Romanian aria-label) — a private tooltip next to the runtime doubles silently;
  (4) a hint whose `aria-label` already holds the sentence must not also get `aria-describedby` (read twice). title=
  triage rule that held: own text that can be cut → `data-cell-tooltip`; information not on screen →
  `data-tooltip-text`; repeats the text / aria-label → remove; iframe title stays (accessible name). Another agent
  committed a line I had converted (its HEAD blob kept `title=`) → build staging edits against the NEW HEAD every time.
  component-audit rule 8 (`tooltip-private` / `tooltip-title`) proved on a HEAD worktree (:8981, rap-01 „Filtru”) vs
  the tree (0 on 18 states × 2). RAP header Ro / Ru / En have no hover — pre-existing (same on HEAD), reported.
- 2026-10-21 · Tacit approval = ONE tag (tacit-tag-v1; user: „if it's Aprobare tacită use only this, it's already clear it's
  valabil”). Inventory by `grep -rn -i tacit js cabinet-evo rap-evo css data` (zsh: no `--include=*.js` unquoted — the glob
  fails the whole command): 6 places drew „Valabil” + the badge (Cabinet act row + profile facts, RAP header + Stare row +
  date row badge, the shared act dialog's Stare + date row); RAP's list already showed the badge alone. Fix = one status
  helper per product that RETURNS the tacit tag instead of the status (`actStatusTagHtml`, RAP `statusTags`, act-view
  `statusTag` on `tacitBadge`, `GEAPActRow` default tag on `act.tacit`), the date rows keep only the date. Traps: (1) the
  library `status-tag--info.is-subtle` is GREY text on blue — the FO blue Small tag is `--brand` („Semnat electronic”);
  look at the crop, the probe said „ok”; (2) `innerText` includes `.u-visually-hidden` text (it is clipped, not
  display:none) — judge SR text vs pixels separately; (3) code-audit flags the hidden span as clipped-text — standing FP.
  FO / Ghișeu data has no tacit act → a demo param read in the shared row (`?tacit=<id>[,…]`, pp-02t / gh-02y) instead
  of seed data that Cabinet also reads. compare-styles pp-01 ↔ sm-01 = 1 / viewport, byte-identical on a HEAD worktree
  (:8990, „Detalii” padding-right from another commit) — not mine; always run the HEAD baseline before reporting „0”.
- 2026-10-21 · ONE drawer (drawer-v1; audit § 3). The product already had ONE de-facto drawer (13 copies of
  `.e-permits-user-create*` markup + 13 private open / close scripts): converging = rename the SHELL classes only
  (overlay, scrim, panel, header, ×, body, footer → `.drawer-overlay` / `.drawer` / `__header`…), keep the inner form
  vocabulary, move the shell CSS verbatim into css/drawer.css (loaded BEFORE the product CSS so `.e-permits-doc-preview`
  880 still beats `.drawer` 800 at equal specificity) and add behaviour by DELEGATION (js/drawer.js: Tab trap on the
  topmost open overlay, focus return via a MutationObserver on `hidden`, an Escape fallback that clicks the drawer's own
  × only when nothing else handled the key) — the 13 open / close functions and their unsaved-changes confirms stayed
  untouched. The markup edits were GENERATED from HEAD lines (line map + counts), so staging on a moving HEAD is one
  re-run. Proof: geometry probe of 12 drawers × 2 widths (scratch dr/dr.mjs) — 1440 identical, 375 = the intended sheet;
  behaviour probe (dr/beh.mjs: Enter on the opener, 60 Tabs, Escape) — Tab escapes 49 / 54 of 60 on HEAD → 0, focus back
  on the opener; rule 9 `drawer-private` flags the old markup on a HEAD worktree (:8981) and 0 on the tree. Traps: the
  audit's `[class*='drawer']` matched the BODY's state class `is-drawer-open` (exclude `is-` / `has-` tokens); the
  library `.modal-close` is absolutely positioned (needs `position: static` in the header row) and js/modal.js binds it
  only inside `.modal-overlay` (no side effect); the dialog family of the auditor needed `.drawer` as canonical.
- 2026-10-21 · Audit fix batch 3 — ONE list pager (audit-fix-v3). Promoted `CabEvo.pagerHtml` to `js/pager.js`
  (`GEAPPager.html`) + `css/pager.css`; Cabinet delegates, BO `renderPagination` and RAP render it, every page keeps
  its own state + click handler through `data-<prefix>-page / -per-page` (so demo states like `[data-sm-page="2"]`
  kept working). The size menu's open / close / keyboard went into the module (ONE capture-phase document listener),
  not into each page's menu system — the Cabinet `data-cab-menu-trigger` machinery must not own a shared control.
  Traps: (1) a `span(start, end, '')` helper skipped empty replacements because `'' in s` is always true — check
  „already applied” on the START marker when the replacement is empty; (2) HEAD differed from the tree in the same
  function (another agent's tooltip work) → exact `rep()` on the HEAD text, never a marker that only exists in the
  tree; (3) zsh `set -- $a` does not split (again) — loops with several args go through `bash -c`; (4) the auditor's
  family spec named the OLD canonical (`.cab-pager`), so the new component showed as „converge” — when you replace
  a canonical, update `families.<name>.canonical` (+ host containers in `allow`) in the same commit. Removing the
  „always show 1 of 1” pager also removed the empty BO footer (`:has(> …:empty)`). Pager findings 80 → 0, all majors
  263 → 177 on 15 states × 2; interactions probed (page, size, ↓, Esc → focus back, outside click) on 3 pages × 2.
- 2026-10-21 · „Filtre” = the library CHIP with the button radius (filter-chip-v1; user: „use the filter chip component, override
  the rounding to match the buttons”, „when active, still use the icon”, Figma EVO Cabinet 1175:45818). ONE class
  `.chip.e-permits-filter-trigger` (+ `--sm` 36 / r6 for the GEAP BO toolbars) for all five triggers (Cabinet acts + requests,
  RAP, shell registries incl. eKYC, passport `renderSfToggle`) and the phone pill; the module marks it (`markTrigger`:
  `is-selected` + „Filtre, N aplicate”). Traps: (1) a page rule that sizes EVERY toolbar `.chip` (`.cab-toolbar .chip` gap 6 /
  padding 0 16, `.cab-toolbar .chip__label` flex-grow + 0 12 0 16 padding; the BO list-toolbar `.chip` height 36) silently
  re-skins a new chip — the trigger was 124 wide whatever the badge; a CDP `CSS.getMatchedStylesForNode` trace (scratch
  fc/trace.mjs) named both rules in one run → `:not(.e-permits-filter-trigger)` in those rules. (2) Dead rules wake up when a
  class changes element type: `.chip.cab-filter[aria-expanded]` (from the pre-button era) would have painted the active chip
  grey — grep `.chip.<hook>` / `.btn.<hook>` for every hook class you move between components and delete the dead ones.
  (3) The Cabinet requests have only 7 checklist values in total (5 statuses + 2 authorities; date facets don't count) — a
  „12 filters” demo had to go to eKYC (8 clients + 4 statuses): count the options per facet before promising a demo
  number. (4) Phones keep the chip's full radius because the neighbour sort is `btn-pill` there — „match the buttons” read
  as „match the button next to it”; flagged as a PO question. No sub-agent tool → component-audit (0 findings on the
  trigger; leftovers pre-existing: sheet section triggers, „Arată” 50.8, header menus), hover-audit 0 / 0, code-audit (only
  the library search × overlap FP); rap-04 / 04a phone overflow 15 is the same on a HEAD worktree (:8937).
- 2026-10-21 · Audit fix batch 4 — close × (audit-fix-v4). The drawer agent had just moved 13 drawers to `.modal-close`
  (d7316d12) — re-inventory after a pull, never trust the report's list (`e-permits-user-create__close` no longer
  existed). Inventory = every `<button|a>` with `__close` or aria-label „Închide…” grouped by class signature: 4
  private closes left (builder ×2, Process Designer, FO beta banner, FO test panel) + the document modal × (off-limits,
  listed). Library `.modal-close` is `position: absolute` (top / right 20) — in a header ROW make it `static` (as
  `.drawer__header > .modal-close`); the library `.banner__close` uses `transform: scale(.92)` on :active, so centring it
  with `translateY(-50%)` would jump on press → `top: calc(50% − 16)`. Hover-audit on the Process Designer needs
  `--scope body` (the overlay is appended to body: `main` = 0 interactive). Close findings 16 → 0.
- 2026-10-21 · ONE skeleton (skeleton-v1; audit § 3). Three private skeleton systems (FO `.e-permits-fo-skeleton*`,
  page-reveal `.page-skeleton-shape` + `.page-step-skeleton__line`, grid / notice modifiers) → `css/skeleton.css`
  (`.skeleton` + `--text / --input / --block / --circle`) loaded right AFTER the library CSS, so every owner keeps its
  SIZE as a placement rule that wins by order (title 38, option row 72…) and only the paint is shared. Capturing
  transient loading states: `Page.addScriptToEvaluateOnNewDocument` that drops the `setTimeout` whose callback source
  matches the reveal (`skeleton.classList.remove`) — per job, removed after the shot (scratch sk/sk.mjs); a global
  block stalled every later FO demo. The subject-switch skeleton has no demo path → verified by injecting the
  renderer's markup. component-audit rule 10 `skeleton-private`: skeletons are `aria-hidden` by design, so the
  auditor's usual `vis()` (which skips aria-hidden) never saw them — measure „painted” (client rects + visibility),
  then prove on a HEAD worktree (:8981: 21 findings on adr-03 / fb-61a / fo-g1c) vs the tree (0).
- 2026-10-21 · Audit fix batch 5 — ONE tag (audit-fix-v5). The BO `.e-permits-workplace__tag` (25 emitters in 7 files,
  CSS in 3 files) → the library Small `status-tag` through `js/tag.js` (`GEAPTag.cls / html`, the product → library tone
  map lives there once) + `css/tag.css` (20 · 12/16 at every width — the library Small reads a responsive caption token
  that is 10 on phones). Emitters swapped by two regexes (template `${expr}` tones → `GEAPTag.cls(expr)`, literal tones
  → the mapped class) and proved by a „no `workplace__tag` left” grep + node --check on a HEAD dry run. Traps found by a
  tag-signature probe (height · font · bg · colour · border · radius · transform, counted per viewport, before / after):
  (1) host rules written for MEDIUM value tags (`.e-permits-passport__panel .status-tag--neutral.is-subtle { border: 0 }`,
  dosar row values 24 high) now reached the Small tags in the same panels → scope them `:not(.status-tag--small)`;
  (2) compensating the library 1px border with `padding: calc(6 − 1)` made code-audit report an off-scale 5 on every tag
  (48 findings on dos-05) → plain 6, text 1px further in, as every library tag / button already is. Moving a class also
  moves the compare-styles specs that select it and the auditor family `allow` for tag containers.
- 2026-10-21 · Library adoption batch 6 — the switch (library-adopt-v1; user: „for the switch use the components as in the
  library”). ONE renderer kept (`renderToggle`) now emits the library `.switch` markup exactly as Components/switch.html,
  so 20 call sites (BO, eKYC, Form Builder, Process Designer) needed no change; the two hand-written switches
  (permission rows, eKYC veto table) went through it too. Traps: (1) `label.switch-wrapper` gets the library GLOBAL
  `label { margin-bottom: 6px }` → every row 6 taller (measured 46 instead of 40) — zero it in the product placement;
  (2) a wrapping `<label>` names the input with ALL its text (label + description) → `aria-labelledby` the label span
  and `aria-describedby` the description; (3) the brief said „centred on the first text line”, but the shipped screen
  AND the 2026-10-01 doc centre the track on the whole text block (and the checkbox-with-description rows copy that)
  → kept the shipped layout and flagged it; (4) the library hover (0,3,0) loses to `:checked + .switch-track` by order
  → an ON switch had no hover; restated as a brand hover. Demo clicks keep working on the 0×0 library input
  (`getClientRects()` still returns a rect; `el.click()` toggles). Switch findings 33 → 0 on 7 states × 2.
