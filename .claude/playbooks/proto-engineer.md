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
