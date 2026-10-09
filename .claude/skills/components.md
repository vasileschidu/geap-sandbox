---
name: components
description: Component reference reconciled against the shipped screens — the real class contracts, the is-*/has-* state layer, data-* JS contracts, and which documented classes do not exist. Use before writing any HTML markup or creating new components.
---

# Components — Library Reference

> **Reconciled against the shipped code on 2026-08-17.** Every claim below was verified
> against `css/main.css`, `css/e-permits-acte-permisive.css`, `css/e-permits-shell.css`
> and the real screens (`e-permits-acte-permisive.html`, `e-permits-shell.html`,
> `cabinet-evo/`, `rap-evo/`, `index.html`, `geap-sitemap.html`, `mpass-test.html`).
>
> Where a screen and this document disagreed, **the screen won and this document was changed.**
> Classes that exist in no CSS file anywhere were **deleted** — see §5.

For token values → the `design-system` skill (`.claude/skills/design-system.md`).

### Where the designs live

| File | Key | Scope |
|---|---|---|
| **Components** | `doJ7tDY0PlQ0PqMgbpFVIC` | ✅ **The source for this web codebase.** Badge · Button · Checkbox · **Chip** (`489:12092`) · **Accordion** (`670:5171`) · Link · Messaging · Pagination · Progress Indicator · Separator |
| **Foundations** | `wkHMxgDWxZKaXQ7zNxhSxN` | ✅ Design tokens. Node `73:901` is the full primitive palette |
| **EVO Design System** | `uMmQKmku5bb0YCLd3R2mps` | ⛔ **Mobile app — do NOT use for this web product** (confirmed 2026-09-03) |

⛔ **The EVO Design System file is for the app, not this codebase.** It contains a
different, newer Button (`button-rectangular`, `312:13362`) with **56px Large**, an
**Extra Small** size and a **Destructive Secondary** style — none of which apply here.
Verifying web CSS against it will produce wrong conclusions. Its Utilities page is also
mostly doc-template helpers and iOS assets (keyboards, status bars, home indicators),
which is consistent with an app-scoped system.

⚠ **`get_metadata` with no `nodeId` under-reports this file** — it lists 9 pages, but the
file actually contains **35 components**. Do not conclude a component is undesigned from
that listing.

**The authoritative index is the "Browse Components" frame, `4650:4567`.** It lists every
component in the library:

| | | | |
|---|---|---|---|
| Accordion ✅ | Avatar ✅ | Badge ✅ | Bottom Sheet ✅ |
| Breadcrumb ✅ | Button ✅ | Checkbox ✅ | Chip ✅ |
| Cookie Banner ✅ | Date Picker ✅ | Link ✅ | Notification ✅ |
| Separator ✅ | Date Input | File Input | Footer |
| Header | Menu | Modal (Dialog) | Numeric Input |
| Pagination | Phone Input | Progress Indicator | Radio Button |
| Search | Segmented Controls | Select (Dropdown) | Sidebar |
| Switch | Table | Tabs | Tag |
| Text Area | Text Input | Tooltip | |

✅ = verified against Figma in this document. The rest are **designed but not yet
verified** — none of them is undesigned. Each has its own documentation page; get its
node URL from the Browse Components frame and add a verification block.

---

## 0. Read this first

Five facts that cause more breakage than everything else combined.

### 0.1 There are three separate vocabularies in this repo

| Vocabulary | Where it lives | Use it when |
|---|---|---|
| **Library** (`.btn`, `.chip`, `.status-tag`, `.search-input`, `.modal`…) | `css/main.css`, previewed in `Components/*.html` | Building anything new that a library component covers |
| **Application** (`e-permits-fo-*`, `e-permits-shell__*`, `e-permits-builder__*`, `e-permits-workplace__*`, `permits-profile__*`) | `css/e-permits-*.css` | Editing the back-office / front-office flows |
| **Page-app** (`rap-*`, `cab-*`) | `rap-evo/rap-evo.css`, `cabinet-evo/cabinet-evo.css` | Editing those two standalone pages only |

The applications use **only 7 library families** — `btn`, `badge`, `status-tag`,
`search-input`, `tabs`, `modal`, `select-dropdown` (+ `chip` and `message`/`banner`
in cabinet-evo). Everything else on screen is application vocabulary. Before reusing a
library component in an app screen, check that the app doesn't already have its own.

### 0.2 State is `is-*` / `has-*`, NOT a BEM modifier

`--modifier` is for **appearance**. State is a **separate class**:

```
is-active · is-selected · is-open · is-open-up · is-closing · is-collapsed · is-expanded
is-checked · is-disabled · is-filled · is-readonly · is-copied · is-completed · is-editing
is-empty · is-visible · is-loading · is-uploading · is-uploaded · is-scrolled · is-scrollable
is-subtle · is-strong · is-outlined · is-ready · is-typing · is-drawer · is-sorted · is-sortable
has-value · has-scroll · has-trailing-icon · has-leading · has-trailing
```

Exception worth remembering: **tabs use bare `active`**, not `is-active`
(`.tabs .tab-button.active`, `.tab-panel.active`). `geap-sitemap.html` uses a third
convention again (bare `on` / `off`) — that file is a self-contained micro-system, see §8.

### 0.3 Some classes are inert without a partner class

Writing these alone produces an **unstyled element**:

| Write this alone | What happens | Correct form |
|---|---|---|
| `.status-tag--success` | no background at all | `.status-tag .status-tag--success .is-subtle` |
| `.tab-button` | completely unstyled | must be inside a `.tabs` ancestor |
| `.btn-sm` | ignored | `.btn.btn-sm` (compound selector) |
| `.modal` | never becomes visible | needs `.modal-overlay.is-active` |
| `.message--subtle` | transparent background | pair it: `.message--subtle.banner--warning` |
| `.message--small` | no effect | only works as `.message--inline.message--small` |
| `.switch-wrapper` | no sizing | needs `.switch` as the root (size vars live there) |

### 0.4 Icons

There is one icon mechanism. It is not what earlier versions of this doc described.

```html
<svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
<svg class="icon small" …>    <!-- 16px -->
<svg class="icon medium" …>   <!-- 20px -->
<svg class="icon" width="20" height="20" …>
```

Path is relative to the page (`../assets/…` from `cabinet-evo/` and `rap-evo/`).
Sprite ids are `#icon-<name>`. There is no `.icon-leading` / `.icon-trailing` — an icon
is a **bare child** of the button.

### 0.5 Utility classes are effectively unused

Across every shipped screen, the only utilities in use are `.d-inline-flex`,
`.u-visually-hidden` / `.visually-hidden`, and `.icon`. **Zero** occurrences of
`.text-*`, `.p-*`, `.m-*`, `.gap-*`, `.d-flex`, `.container`, `.row`, `.col-*`,
`.bg-*`, `.border-*`. Spacing and typography live in the per-page CSS.

Do not add utility-class-based layout to an existing screen — it will be the only
instance in the file. Follow the surrounding CSS instead.

---

## 1. How the class system works

```
.{component}                        ← base element
.{component}--{modifier}            ← appearance variant (BEM modifier)
.{component}__{part}                ← child element (BEM element)
.is-{state} / .has-{state}          ← state (separate class, NOT a modifier)
[data-{contract}]                   ← JS behaviour hook
```

Some components are **attribute-driven** rather than class-driven —
`.custom-select[data-variant="destructive"]`, `.accordion__trigger[aria-expanded="true"]`,
`.sidebar__chevron[aria-expanded="true"]`. Check the CSS before adding a state class.

### Page base — what pages actually include

There is **no shared base include**. `js/include-header.js` is used by **no screen**
(it builds a docs shell, not `.header`). `js/include-footer.js` does work — it injects
`elements/footer.html` into `#site-footer` — but no app screen uses it either.

The real pattern is a font sheet, `main.css`, one or more page CSS files with a
cache-busting `?v=`, then page JS:

```html
<link rel="stylesheet" href="assets/fonts/Onest.css">
<link rel="stylesheet" href="css/main.css">
<link rel="stylesheet" href="css/e-permits-acte-permisive.css?v=…">
<link rel="stylesheet" href="css/page-reveal.css?v=soft-reveal-v3">
<script src="js/page-reveal.js?v=soft-reveal-v3" defer></script>
```

`geap-sitemap.html` does not load `main.css` at all.

---

## 2. Component Inventory

**Status** — `app` = used in a shipped app screen · `library` = real CSS, previewed in
`Components/`, but **used by no app screen** (verify before adopting) · `partial` = exists
but this doc previously described it wrongly, see the entry.

| Component | Real base classes | Preview file | Status |
|---|---|---|---|
| Button | `.btn` + variant + `.btn-sm/.btn-md/.btn-lg` | `buttons.html` | app |
| Button — badge/CTA | `.btn-badge` + `--mpass/--msign/--mpay/--mpower/--mdelivery/--primary/--neutral` | — | app |
| Icon button | `.btn-icon`, `.btn-icon.clear` | — | app |
| Search input | `.search-input` + `.medium/.small/.large` + `.rectangular/.circular` | `search-input-preview.html` | app |
| Status tag | `.status-tag` + colour + `.is-subtle/.is-strong/.is-outlined` | — | app |
| Message / Banner | `.message` ≡ `.banner` ≡ `.inline-message` ≡ `.info-box` | `messages*.html` | app |
| Tabs | `.tabs .tab-buttons .tab-button.active` | `tabs.html` | app (partial) |
| Modal | `.modal-overlay.is-active > .modal` | `modals.html` | app (partial) |
| Badge | `.badge` + style + size | `badge.html` | app |
| Chip | `.chip` + `.is-selected/.is-disabled` | `chip.html` | app |
| Select — native | `.select` | `dropdown.html` | library |
| Select — custom | `.custom-select[data-select]` | `dropdown.html` | app (menu primitive only) |
| Checkbox | `.checkbox .checkbox-input .checkbox-custom` | `checkbox.html` | library |
| Radio | `.radio-group .radio .radio-custom` | `radio-buttons.html` | library |
| Switch | `.switch > .switch-wrapper` | `switch.html` | library |
| Checkbox option (grey container) | `renderCheckOption()` → `label.checkbox.checkbox--medium.e-permits-check-option` in `.e-permits-check-options` | Figma `10507:125565` | app |
| Long multi-select (100+ options) | summary `.e-permits-cfg-picks` + picker modal `#cfg-subdiv-modal` (`.e-permits-subdiv*`) | `cfgSubdivPicks` / `openCfgSubdiv` | app |
| Input | `.input`, `.input-wrapper` | `input-preview.html` | library |
| Textarea | `.textarea` | `textarea.html` | library |
| Table | `.table` + `--default/--subtle/--strong/--white` | `table.html` | library |
| Pagination | `.pagination .pagination__item .pagination__link` | `pagination.html` | library |
| Accordion | `.accordion__trigger[aria-expanded]` | `accordion.html` | library (partial) |
| Avatar | `.avatar` + type + size | `avatar.html` | library |
| Empty state | `.e-permits-empty` (+ `--compact` / `--bare`) via `GEAPEmptyState.render / .noResults` | `js/empty-state.js`, `css/empty-state.css` | product |
| Breadcrumb | `.breadcrumbs .breadcrumbs__list .breadcrumbs__item` + `--trailing/--truncate/--mobile`; JS `renderBreadcrumbs()` | `breadcrumbs.html` | app (every page) |
| Progress tracker | `.progress-tracker .progress-step--*` | `progress-tracker.html` | library (partial) |
| Sidebar | `.sidebar .sidebar__link--active` | `sidebar.html` | library (partial) |
| Spinner | `.spinner` + size + colour | `spinner.html` | library |
| Separator | `.separator` + orientation + thickness + style | — | library |
| Link | `.link` + `.link-primary/-strict/-white` + `.link-xs/-sm/-md/-lg` | `link.html` | library |
| Tooltip | `.tooltip .tooltip-inner .tooltip-arrow` + `.show` | `tooltip.html` | library (partial) |
| Header | `.header .header__wrapper` | `header.html` | library (partial) |
| Footer | `.footer__top/__middle/__bottom` | `footer.html` | library |
| Tag | `.tag-item` (a layout row, not a pill) | `tags.html` | library (partial) |
| Copy value | `.e-permits-fo-copy-value` | — | app |
| Page header (back office) | `.e-permits-page-header` + `__top/__meta/__tabs` | `e-permits-acte-permisive.html?flow=back-office` | app |
| Service passport | registry `kind: services` + `.permits-profile` passport | `?flow=back-office#serviciu/003000023/general` | app |
| Sum list (list + total tray) | `.e-permits-sum-list` > list + `.e-permits-sum-list__total`; JS `renderSumList(listHtml, total)` | Figma 9721:9920 | app |
| Next step | `.e-permits-next-step` > `__label` + `__box` (icon + target); JS `renderNextStep(target, { label, icon })` | Figma 9721:9920 | app |
| Toast | `.toast-container > .toast.toast--{info\|success\|warning\|error}` via `GEAPToast.show()` (`js/toast.js`) | `messaget-toast.html` | library |
| Bottom Sheet | `.bottom-sheet` + `__overlay/__panel/__handle/__header/__content` | `bottom-sheet.html` | library |
| Cookie Banner | `.cookie-banner` (**shell only**) | `cookie-banner.html` | library (partial) |
| Date Picker | `.date-picker`, `.date-picker-panel`, `__weekday/__day` | `input-date-picker.html` | library |
| Date input · File input · Menu · Phone input · Segmented controls | — | see `Components/` | **library, no contract documented** |

The last row is honest about a real gap: those previews exist, but no class contract was
ever written for them, and the app screens each reimplemented phone input and file upload
from scratch as a result.

---

## 3. Library component contracts (verified)

Only the corrections and the load-bearing detail. For anything not listed, read the CSS.

### Button

```html
<button class="btn btn-primary btn-rounded btn-lg">
  <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-x"></use></svg>
  <span>Label</span>
</button>
```

Base `main.css:13384` — `border-radius: var(--border-radius-8)`, `padding: var(--spacing-12) var(--spacing-20)`, `gap: var(--spacing-4)`.

| Variant | background | hover | active |
|---|---|---|---|
| `.btn-primary` | `--blue-sky-600` | `--blue-sky-700` | `--blue-sky-800` |
| `.btn-secondary` | `--blue-sky-100` | `--blue-sky-150` | `--blue-sky-200` |
| `.btn-strict` | `--gray-900` | `--gray-700` | `--gray-600` |
| `.btn-neutral` | `--gray-100` | `--gray-250` | `--gray-300` |
| `.btn-destructive` | `--red-600` | `--red-700` | `--red-800` |
| `.btn-outline-primary` / `-secondary` / `-neutral` / `-destructive` / `-strict` | transparent + 1px border | | |
| `.btn-text-primary` / `-secondary` / `-neutral` / `-strict` / `-destructive` | transparent | tint | |

Sizes require the **compound** selector — `.btn.btn-sm` (`4/12`, 14px) ·
`.btn.btn-md` (`8/16`, 16px) · `.btn.btn-lg` (`12/24`, 18px).
Shape: `.btn-rounded` ≡ `.btn-pill`.

- Focus is on `:focus`, not `:focus-visible`: `.btn:focus:not(:disabled)` (`main.css:12467`, duplicated at `11812`) declares `outline: 2px solid var(--white); box-shadow: 0 0 0 4px var(--focus-ring, var(--blue-sky-500, #3379DB))`. **Verified rendering correctly** (white gap + blue ring). Note `getComputedStyle` reports this as `rgba(0,0,0,0) 0 0 0 0` — an artifact of `var()`-based shadows, not a defect. Trust a screenshot, not the computed value, when auditing this.
- Disabled: use the native `disabled` attribute. `.btn-loading` on the bare class forces `height:48px; width:92px` — only use the compound form (`.btn-primary.btn-loading`).
- **`.icon-leading` / `.icon-trailing` do not exist in CSS.** Put the `<svg class="icon">` directly in the button. Figma *does* define `Icon = None / Leading / Trailing / Only` as design variants — the concept exists, the CSS expresses it structurally rather than with those classes.

#### Verified against Figma — 2026-09-03

Source: Components file, node `39:177` (`button-filled-rectangular`). Figma defines a
4-axis matrix: **Style** (Primary · Secondary · Neutral · Strict · Destructive) ×
**Icon** (None · Leading · Trailing · Only) × **Size** (Large · Medium · Small) ×
**State** (Default · Hover · Focus · Active · Loading · Disabled).

**Confirmed matching** — the 5 filled styles map exactly onto `.btn-primary` /
`-secondary` / `-neutral` / `-strict` / `-destructive`; radius `8px`
(`--border-radius-8`); gap `4px` (`--spacing-4`); every token the component consumes
matches `design-system.md`; and `.btn-md` renders at **exactly 40px**, Figma's Medium.

**Mismatches — flagged, not fixed:**

| # | Figma | Code (measured in browser) | Delta |
|---|---|---|---|
| 1 | Large = **48px** | `.btn.btn-lg` renders **50.75px** | +2.75 |
| 2 | Small = **32px** | `.btn.btn-sm` renders **29.25px** | −2.75 |
| 3 | `Icon=Only` square **48/40/32** | no icon-only size support; `.btn-lg` with a lone icon renders **70×46** | broken |
| 4 | Focus ring **5px** total | renders **4px** (2px white outline + 4px spread) | −1px |
| 5 | `Loading` is a designed state | `.btn-loading` bare forces `height:48px; width:92px` | breaks non-lg |

**Focus state is otherwise correct** — verified by screenshot, the ring renders as
designed (white gap, blue outer ring). The only delta is the 1px width covered by the
resolved token in `design-system` §6.

**Cause of 1 & 2** — heights are *derived* (`padding` + `line-height: 1.375`), not set.
That yields fractional text boxes (`24.75px`, `19.25px`), so no size can land on
Figma's 8px grid. Only Medium coincidentally hits 40px. The Tailwind-idiomatic fix is
an explicit height per size — `h-12` / `h-10` / `h-8` = 48 / 40 / 32 — with padding
handling the horizontal axis only.

**On #4** — the ring is only 1px narrower than Figma; widen the spread `4px` → `5px`
in both copies of the rule (`main.css:11812` and `:12467`, which are duplicates of
each other — worth deduplicating while you're there).

**Auditing note.** `getComputedStyle().boxShadow` returns `rgba(0,0,0,0) 0 0 0 0` for
these `var()`-based shadows even though they paint correctly, and CDP confirms no rule
overrides them. Verify focus styling with a screenshot; the computed value will
mislead you.

**`.btn-badge`** — the m-platform CTA family, used on the most prominent buttons in the flow:

```html
<button class="btn btn-badge btn-badge--primary btn-badge--mpass">
  <span class="btn-badge__logo" aria-hidden="true"><img src="assets/logos/m-platforms/m-pass.svg" alt=""></span>
  <span class="btn-badge__label">Autentifică-te prin mpass</span>
</button>
```
Sub-variants: `--mpass` `--msign` `--mpay` `--mpower` `--mdelivery` × `--primary` / `--neutral`.

**`.btn-icon`** — 40×40 round, transparent, hover `--gray-100`. Its only sub-variant is
`.btn-icon.clear` (20×20, filled `--gray-200`, round) used inside `.search-input`.

---

#### Back-office button — Figma `button-filled-rectangular`, Size Small (rule, 2026-10-02)

Every button in the back office (page header, toolbars, list rows, modal/drawer footers)
is the library `.btn` + `.btn-sm` + variant. Never a custom button class, never local
padding/height/font.

```html
<button class="btn btn-neutral btn-sm" type="button">
  <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
  <span>Sincronizează</span>
</button>
```

| Figma | Code |
|---|---|
| Size Small: h32, padding 0/12 (8 on the icon side), gap 6, radius 6 | `.btn.btn-sm` (main.css) |
| 14/20 **Medium**, icon 16 | `.btn.btn-sm` weight = `--font-weight-fw-medium` |
| Icon None / Leading / Only — **one icon**, no extra chevron | label-only · icon + label · icon-only (`aria-label`, gets the plain tooltip) |

| Style | Default | Hover | Active / menu open (`aria-expanded="true"`) | Text |
|---|---|---|---|---|
| Neutral | `background-base-tertiary` | `…-tertiary-hover` | `…-tertiary-active` | `text-base-default` |
| Secondary | `background-brand-secondary` | `…-secondary-hover` | `…-secondary-active` | `text-brand-on-secondary` |
| Primary | `background-brand-default` | `…-default-hover` | `…-default-active` | on-color |
| Disabled (any) | `background-disabled-default` | — | — | `text-disabled-on-disabled`, no opacity |
| Focus-visible | 2px white + 5px `--focus-ring` | | | |

Defined once in `css/e-permits-acte-permisive.css` ("ONE back-office button"). **Never set a
flat `background` on `.btn.btn-sm.btn-<variant>` elsewhere** — it has the same specificity
as the library `:hover` rule and loads later, so it silently kills the hover (that bug
removed hover from every neutral button until 2026-10-02). Override states only with
selectors at least as specific as the block above.
- A button that opens a menu keeps its normal look (no chevron) and shows the Active fill
  while open; the menu is announced by `aria-haspopup="menu"`.
- **Icon-only buttons are the same component (rule, 2026-10-02).** ✎ edit, export, sync,
  filter, download = Figma `button-filled-rectangular` Neutral · **Icon Only** · Small →
  `class="btn btn-neutral btn-sm btn-icon-only"` (32×32, 16px icon `icon small`); ⋮ more =
  Strict · Icon Only · Small → `btn btn-strict btn-sm btn-icon-only` — **square, radius 6**
  like every icon button (decision 2026-10-02: no round ⋮ anywhere; Figma instances use
  `button-text-rectangular` Strict, Components library set `4ad2518c34b8b51d5113119316eac5934c1eb9fb`) — no fill; tertiary-hover / tertiary-active,
  also while its menu is open. Never a custom icon-button class (`e-permits-workplace__icon-action`,
  `__row-action`, `e-permits-stack__menu-trigger` styles, `e-permits-user-profile__edit` were
  removed — each had its own hover and focus ring). Never resize them: in list toolbars they
  stay 32 next to the 36px search/chips. Every one carries an `aria-label` (specific:
  "Editează taxa …") and, when the label is long, `data-tooltip-label` (short: "Editează") —
  `js/icon-tooltip.js` shows it as the plain tooltip on hover (600 ms) and focus.
- **Centring gotcha:** the library rule `.btn.btn-sm:has(> .icon:first-child)` adds 8px on
  the icon side (for icon + label) and out-specifies a plain `.btn-icon-only`, pushing the
  icon off-centre. `btn-icon-only` therefore repeats that `:has()` selector with
  `padding: 0`. After touching buttons, measure: icon centre − button centre must be 0, 0.
- **Text button with a label, no fill** ("Actualizează" in the list headers) = Figma
  `button-text-circular` Strict · Leading · Small → `btn btn-strict btn-sm btn-rounded`
  (pill, 8/12 padding, 14/20 medium, tertiary-hover on hover). Its page class
  (`e-permits-workplace__refresh`) is only a JS hook / flex placement — no colours, radius
  or padding.
- **Figma: every icon-only button type gets a hover explainer** — the instance in
  `State = Hover` plus the "Tooltip · etichetă (icon)" component (`9736:694`) **4px below**,
  centred, clamped 8px inside the screen (code: `js/icon-tooltip.js` GAP 4, EDGE 8; flips
  above only when there is no room). Document all types used on a screen (✎, export, sync, ⋮),
  not just one. Instances keep the component size (32), never stretched to 36.
- **Figma hover = the library hand cursor on the element:** Foundations
  `cursor-system-hand-pointing` (key `c59e5c661c74fcc59d9a5f498785eb78c3adf22b`, 32×32),
  absolute in the screen frame, named „Cursor · hand”, fingertip (13, 8 inside the
  component) on the element's centre. Same for disabled-reason tooltips (`data-tooltip-reason`)
  and the collapsed-sidebar tooltip (that one stays to the right).
- **Icons are square.** `.icon` sets the 24px default size on both axes; a rule that sizes an
  icon must set width **and** height (a lone `flex: 0 0 20px` gives 20×24). Figma icon
  instances are always W = H.

- One action, one place: e.g. service resync lives only in the passport header
  ("Sincronizează"), not repeated inside Date generale.

### Search input

**Product rule (2026-10-02): every standalone search is this component — Figma
`search-input-rectangular` (Components `933:29099`), Size Medium, `Button = False`.** We
never use the circular shape (`933:29721`) and never the arrow submit button (the Figma
`Button = True` axis, a 32px brand square with `arrow-right`): filtering is live, so there is
nothing to submit. Product markup (registries, sections, drawers, modals, profile tabs):

```html
<div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search">
  <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
  <input class="input" type="search" placeholder="Caută …" aria-label="Caută …" autocomplete="off" data-…-search>
  <div class="btn-group">  <!-- = renderSearchActions() in js/e-permits-shell.js -->
    <span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span>
    <button type="button" class="btn-icon clear" aria-label="Șterge căutarea"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg></button>
  </div>
</div>
```

**All Figma states, always (2026-10-02):** Default · Hover (2px tertiary border) · Focus (2px
brand + 4px blue-sky-200 halo) · Loading (spinner while typing, `is-typing`, 500ms) ·
Filled / Focus with value (clear x, `has-value is-ready`) · Disabled. Every search carries the
`.btn-group` (never omit it). **`js/search.js` is delegated** (document-level listeners), so it
also drives searches rendered after load; the x empties the field, keeps focus and fires
`input` so the list re-filters. A template that renders the field with a value adds
`has-value is-ready` itself. The browser's own search x is hidden inside `.search-input`;
with a value the input gets 40px right padding so text never runs under the x.

- Width: 400 in back-office lists (`flex: 0 1 400px`); add **`e-permits-list-search--fill`**
  when it must span its container (builder library panel, document library modal,
  Permisiuni tab).
- A search with suggestions keeps this field and puts the full-flow list under it
  (`.e-permits-fo-address-search` wrapper + `.e-permits-fo-address-search__list`) — e.g.
  Permisiuni (`data-perm-search`).
- Not covered (keep their own pattern): the search row **inside** a dropdown panel (CAEM,
  subgen, MDocs, „Inserează câmp”) and the citizen form's „Caută adresa” combobox.
- Never a `.e-permits-fo-input` with a trailing search icon, never a bespoke
  `__search` frame with its own border/hover/focus CSS (removed 2026-10-02: builder library,
  builder registry, document modal, Permisiuni).

The full contract. The `.btn-group` block is optional — omit it for a plain filter field.

```html
<div class="search-input medium rectangular">
  <span class="icon-search" aria-hidden="true">
    <svg class="icon"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
  </span>
  <input class="input" type="search" autocomplete="off" placeholder="…">
  <div class="btn-group">
    <span class="spinner spinner--extra-small spinner--brand"></span>
    <button type="button" class="btn-icon clear" aria-label="Șterge căutarea">
      <svg class="icon small"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg>
    </button>
  </div>
</div>
```

Sizes set `--search-input-height`: default 48px · `.medium` 40px · `.small` 32px.
Shape: `.rectangular` (8px radius) · `.circular` (pill).

**State classes are what reveal the actions** — the `.btn-group` is `display:none` until:

| State | Effect |
|---|---|
| `has-value` | reveals `.btn-group` |
| `is-ready` | reveals `.btn-icon.clear` |
| `is-typing` | reveals the spinner |
| `loading` | spinner on, clear hidden |

So a working clear button needs **both** `has-value` and `is-ready` toggled together.

Hover `border-color: var(--color-border-base-tertiary)` · focus-within
`border-color: var(--color-border-brand-default); box-shadow: 0 0 0 4px var(--blue-sky-200)`.

> The inner `.input` is declared twice (`main.css:18381` then `18423`); the second strips
> the border/height/ring. That is why `.input` behaves differently inside `.search-input`.

---

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Search** `456:24886`. Two components —
`search-input-rectangular` (`933:29099`) and `search-input-circular` (`933:29721`) —
each 18 variants: **State** (Default · Hover · Focus · Loading · Filled · Disabled) ×
**Size** (Large 282x48 · Medium 282x40) × **Button** (False · True).

**The best-implemented component in the library.** Sizes match exactly (48 / 40), both
shapes map to `.rectangular` / `.circular` on one class, and all six states have real
interaction selectors *and* `.class` equivalents for documentation. The Button axis is
modelled correctly too: `.btn-group` is hidden until `.has-value`, mirroring Button=True
appearing only on Focus / Loading / Filled.

**Undesigned extras (harmless):** `.small` (32px) and a read-only treatment — neither is
in the Figma matrix.

⚠ **Dead weight** — the `.input` rule inside `.search-input` is emitted **twice**
(`main.css:18381` and `:18419`); the second resets `border:0; box-shadow:none`, so the
first block's hover/focus/disabled values never apply. Confusing to read, harmless to run.

---

### Status tag

**Requires two classes** — a colour modifier *and* an intensity class. The base alone has
no background.

```html
<span class="status-tag status-tag--success is-subtle">Valabil</span>
```

| Colour | is-subtle | is-strong | is-outlined |
|---|---|---|---|
| `--muted` | white / `--gray-400` | `--gray-600` / white | `--gray-250` |
| `--neutral` | `--gray-200` / black | black / white | `--gray-250` |
| `--accent` | `--apricot-100` / `--apricot-700` | `--apricot-300` / black | `--apricot-600` |
| `--success` | `--green-100` / `--green-700` | `--green-600` / white | `--green-700` |
| `--brand` | `--blue-sky-100` / `--blue-sky-600` | `--blue-sky-600` / white | `--blue-sky-600` |
| `--danger` | `--red-100` / `--red-700` | `--red-600` / white | `--red-600` |
| `--info` | `--blue-sky-100` / `--gray-700` | `--blue-sky-600` / white | `--blue-sky-600` |

**There is no `--warning`** — the warning colour is `--accent` (apricot).
Sizes `--small` (12px) / `--large` (14px); `:has(svg)` adjusts padding automatically.

---

### Message / Banner

`.message`, `.banner`, `.inline-message` and `.info-box` are **four interchangeable
aliases** — every rule lists all four, so `.message--warning` ≡ `.banner--warning`.

```html
<div class="message message--subtle banner--warning">
  <span class="banner__icon"><svg class="icon medium">…</svg></span>
  <div class="banner__content"><p>Suspendat — poți relua valabilitatea</p></div>
</div>
```

| Variant | solid background | text |
|---|---|---|
| `--info` | `--blue-sky-600` | white |
| `--success` | `--green-600` | white |
| `--warning` | `--apricot-300` | black |
| `--error` | `--red-600` | white |

`--subtle` is **compound** — pair it with a tone: `--subtle.--info` → `--blue-sky-100`,
`--subtle.--warning` → `--apricot-100`, `--subtle.--error` → `--red-100`.

Three traps:
- **There is no `--subtle` + `--success` pairing.** It renders transparent.
- `--small` only applies as `.message--inline.message--small`.
- Child rules are written against `.banner__icon` / `.banner__close` **even inside
  `.message--*` selectors** — so use the `banner__` prefix for children regardless of
  which alias you used on the block.

Base carries `animation: message-slide-in .35s ease both`. If the container re-renders
frequently, kill it (`animation: none`) as cabinet-evo does.

#### Verified against Figma — 2026-09-03

Source: Components file, page `67:483`. **This is the biggest design↔code divergence in
the library.**

**Figma defines four *separate components*, not aliases:**

| Figma component | Axes | Styles available |
|---|---|---|
| `toast` (`75:425`) | Content: w/ Heading · Text-only | Info · Success · Warning · Error |
| `info-box` (`101:1878`) | Breakpoint: Desktop · Mobile × Type: Subtle · Moderate · Strong | Info · Warning · Error |
| `banner` (`106:1053`) | Breakpoint: Desktop · Mobile × Type: Subtle · Strong | Info · Warning · Error |
| `inline-message` (`132:4097`) | Size: Small · Medium | Default · Success · Warning · Error |

The CSS collapses all four names into **one component with four interchangeable
aliases**. That single decision is the source of nearly every oddity in this section.

**✅ Three things previously flagged as "traps" are actually faithful to the design:**

1. **No `--subtle` + `--success` pairing** — correct. `Subtle` is a `Type` on `info-box`
   and `banner`, and *neither of those components has a Success style at all*. The
   combination is undesigned, not broken.
2. **`--small` only works with `--inline`** — correct. `Size` is an axis **only** on
   `inline-message`. It is meaningless on the other three.
3. **Style sets legitimately differ per component** — `toast` has Success but no
   Default; `inline-message` has Default and Success but **no Info**; `banner` and
   `info-box` have Info but **no Success**.

Because the CSS merges them, every style is reachable on every alias — so
`.banner--success` and `.inline-message--info` render fine but correspond to nothing in
Figma. Check the table above before using a combination.

**⚠ Mismatches:**

| # | Figma | Code |
|---|---|---|
| 1 | `Type = Moderate` | **no `--moderate` anywhere** (0 occurrences) |
| 2 | `Type = Strong` | unnamed — it is the default, no `--strong` exists (0 occurrences) |
| 3 | `Breakpoint = Desktop / Mobile` is an explicit axis | essentially no responsive treatment |
| 4 | `inline-message` `Style = Default` | no `--default`; omit the style modifier |

**On #1** — `Moderate` exists only on `info-box`, and only for `Info`. A three-step
intensity ramp (Subtle → Moderate → Strong) is designed; the code implements two.

**On #2** — worth naming `--strong` explicitly rather than leaving it as the unnamed
default, so all three intensities read symmetrically and match the design vocabulary.

**Still a genuine code bug, unrelated to Figma:** the per-variant child rules are written
against `.banner__icon` / `.banner__close` even inside `.message--*` and `.info-box--*`
selectors, so `.message__close` inside `.message--info` never picks up its colour. Use
the `banner__` prefix for children whichever alias you used on the block.

---

### Tabs

**`.tabs` is a required ancestor.** A `.tab-button` outside it is completely unstyled.
State is bare **`active`**, not `is-active`.

```html
<div class="tabs">
  <div class="tab-buttons" role="tablist">
    <button class="tab-button active" role="tab" aria-selected="true">Tab 1</button>
    <button class="tab-button" role="tab" aria-selected="false">Tab 2</button>
  </div>
  <div class="tab-panels">
    <div class="tab-panel active">…</div>
  </div>
</div>
```

Real values: `.tab-buttons` gap 8px + 1px bottom border · `.tab-button` height **48px**,
padding `0 16px`, 2px transparent bottom border, transition `color .2s, background .15s` ·
hover `background: #f5f5f5` · `.active` → `--blue-sky-600` text + border, weight 500 ·
`:focus-visible` → `outline: 3px solid --blue-sky-600; outline-offset: 2px`.

`.tabs--sm` changes padding and font but **does not reset `height: 48px`**, so it is not
actually shorter.

App screens override this per scope — `.permits-profile__tabs` (gap 24, 36px, no chrome),
`.e-permits-dosar-profil__tabs` and `.e-permits-user-profile__tabs` (48px, inset focus
ring), `.e-permits-fo-doc-modal__tabs` (no bottom border). Match the scope you are editing.

Panels: app screens generally do **not** use `.tab-panels` — they toggle
`data-*-panel` divs with the `hidden` attribute.

---


#### Verified against Figma — 2026-09-03

Source: **Components** file, page `145:4480`. `tabs` (**Count** 2-8 x **Breakpoint**
Desktop/Mobile), `.tab-item-md`, `.tab-item-s`, `.arrow` (**44x44**).
Desktop item **h48 / px16**, inner gap 6, 16/24 type; active = 500 `#0058d2` +
`border-bottom 2px`. Mobile item **h40 / px12**, 14/20.

**Ok** — `height: 48px`, `padding: 0 16px`, `gap: 6px`, and the active treatment are all
**exact**.

**Mismatches:**

| | Figma | CSS |
|---|---|---|
| Inter-tab gap | **0** (widths prove it: 8 tabs = 585 = 8x73) | `.tab-buttons { gap: 8px }` |
| Track border | `#d9d9d9` | `var(--gray-300, #d1d5db)` = **`#b2b2b2`** |
| Badge bg | `#f1f1f1` | `--gray-100` = **`#f5f5f5`** |
| Badge sizing | `min-width: 24` + px8 (grows with digits) | fixed `width: 24px` |
| Focus ring | `0 0 0 2px #fff, 0 0 0 5px #3379db` | `outline: 3px solid #0058d2` |
| Mobile | full geometry swap (h40 / px12 / 14px) | `@media (max-width: 576px)` changes **font-size only** |

⚠ **`.tabs--sm` fails the stated touch minimum.** It sets `padding: 8px 12px` with **no
height**, yielding ~34-36px. The design says: *"The minimum target height for touch
devices is **40px**."*

**Gaps** — the overflow **fade** (172x48) and the **44x44 scroll arrows** have no CSS and
no JS. **Undesigned:** `:hover` (Figma has Default/Focus only).

---

### Modal

**`.modal-overlay` is the outer element and carries the `id`.** The open state is
`.modal-overlay.is-active` — without it the overlay stays `opacity:0; pointer-events:none`.

```html
<div class="modal-overlay" id="my-modal" aria-hidden="true">
  <div class="modal modal--md" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="my-modal-title">
    <button type="button" class="modal-close" data-close aria-label="Închide">
      <span class="d-inline-flex"><svg class="icon small"><use href="assets/icons/sprite.svg#icon-cross-large"></use></svg></span>
    </button>
    <div class="modal--header"><h2 class="modal--header-title" id="my-modal-title">Title</h2></div>
    <div class="modal-content">…</div>
    <div class="modal--footer">
      <div class="modal-buttons">
        <button class="btn btn-secondary btn-rounded btn-lg" data-close>Cancel</button>
        <button class="btn btn-primary btn-rounded btn-lg" data-close>Confirm</button>
      </div>
    </div>
  </div>
</div>
```

`.modal-close` is a **direct child of `.modal`, before the header**, and carries no
`.btn-icon`. Open/close via `data-open="#id"` / `data-close` (`js/modal.js`).

Sizes: `--sm` 320 · `--md` 590 · `--lg` 720 · `--fullscreen`.
Padding: header `24px 48px 0 32px` · content `24px 20px 40px 32px`, `max-height: calc(64vh - 4px)` · footer `12px 20px 24px`.

- **`.modal--simple` does not mean "no footer"** — it only hides `.modal-image-wrapper`.
- `--fade` / `--slide` / `--zoom` only take effect combined with `.is-active`.
- `--with-image` requires a `.modal-image-wrapper` child.

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Modal** `358:16247`. The `modal` component appears at
two widths — **588** (default) and **350** (small) — with heights varying freely
(264 · 312 · 348 · 412 · 432 · 488 · 519 · 620 · 780), i.e. **height is content-driven**.
Composition: `Header` (**68px**) → `.content-slot` → `Footer` (**88px**), with a 17px
`.scrollbar` appearing in the content slot when it overflows. Desktop context shows it
centred on a full-screen `Overlay`.

**✅ Scroll behaviour matches** — Figma scrolls the content slot while header and footer
stay fixed; CSS does the same via `.modal-content { max-height: calc(64vh - 4px);
overflow-y: auto }`.

**✅ `--md` is right** — Figma 588 ↔ `.modal--md` **590**. A 2px difference, effectively a
match.

**⚠ Mismatch 1 — the default width is wrong.** Bare `.modal` is `max-width: 400px`, but
Figma's default modal is **588**. So the unmodified class gives you a size the design
does not have; you must remember to add `--md` to get the intended default. Consider
making 590 the base.

**⚠ Mismatch 2 — `--sm` is 30px narrower than designed.** Figma's small modal is **350**;
`.modal--sm` is **320**.

**⚠ Mismatch 3 — no `--lg` in the design.** CSS ships `.modal--lg` (720px) and
`--fullscreen`; Figma documents only the two widths. Neither is designed — verify before
use.

**Note** — Figma's header (68px) and footer (88px) are fixed heights; CSS derives both
from padding (`.modal--header` `24px 48px 0 32px`; `.modal--footer` `12px 20px 24px`),
so a 48px footer button yields ~84px against the designed 88px.

---

### Chip

**There are no `.chip--*` modifiers.** Variation is `:has()` + state classes.

```html
<button class="chip is-selected" type="button">
  <span class="chip__label">Toate</span>
  <span class="chip__badge">12</span>
</button>
```

Base: `padding: 8px 16px`, `background: --gray-100`, pill radius, 14px.
`:has(.chip__icon)` → left padding 12px · `:has(.chip__avatar)` → white bg + border ·
`:has(.chip__badge)` / `:has(.chip__close)` → right padding 8px.
Hover `--gray-250` · `.is-selected` → black bg, white text · `.is-disabled` → `opacity:.6` ·
`:focus-within` → `outline: 2px solid --blue-sky-500`.

Children: `.chip__label` `.chip__icon` `.chip__avatar` `.chip__badge` `.chip__close`.
There is **no `.chip-group`** — use the page's own container.

#### Verified against Figma — 2026-09-03

Source: **Components** file `doJ7tDY0PlQ0PqMgbpFVIC`, page **Chip** `489:12092` — the
correct web source. Two components:

| Figma component | Variants |
|---|---|
| `filter-chip` | mono-selection · multi-selection; states **default · hover · focus · selected · disabled**; with numbered-badge |
| `input-chip` | simple · w/ avatar; states **default · hover · focus · disabled** |

**✅ Covered by the CSS** — `.is-selected` and `.is-disabled` map to the designed
states; `.chip__badge` covers the numbered-badge variant; `.chip__avatar` +
`.chip__close` together reproduce `input-chip w/ avatar` (the `:has(.chip__avatar)`
rule correctly switches to a white ground with a border, matching Figma).

**✅ Height matches exactly** — every chip instance in Figma is **36px**, and the CSS
chip measures **36px** (38px for the avatar variant, where the 1px border adds 2px).

**⚠ Mismatch 1 — `min-width` is not implemented.** Figma specs a minimum width (its
min-width example renders at 60px). `.chip` sets no `min-width` at all; the only
`min-width` in the block is `16px` on `.chip__badge`. A very short label therefore
produces a narrower pill than designed.

**⚠ Mismatch 2 — the two chip types are indistinguishable in code.** `filter-chip` and
`input-chip` both render as `.chip`, differentiated only by which children you happen to
include. As with Messaging, that loses the semantic distinction; if they ever need to
diverge visually, a modifier layer has to be added first.

**⚠ Mismatch 3 — touch targets.** Figma specs the `input-chip` remove target at
**24×24** on pointer devices and **32×32** on touch. `main.css` has no coarse-pointer
handling anywhere (same gap as Checkbox; `.link` is the only component that does this).

**Not a mismatch — `.chip__icon` is an extra.** The web Chip page defines **no icon
variants**, so `.chip:has(.chip__icon) { padding-left: 12px }` has no design counterpart.
It is additional capability, not a defect. *(An earlier revision of this document
criticised its padding behaviour — that was based on the app design system, which does
define icon-leading/trailing/both/only. It does not apply here.)*

**Also app-only, not web:** `suggestion-chip`. The web system has two chip types, not
three.

**Local divergence** — `rap-evo` hand-rolled `.rap-filter-chip` at **40px**, which now
looks like a genuine deviation rather than the accurate one: web Figma says 36px, and
the library `.chip` already matches. `cabinet-evo` uses the library `.chip` with an
invented `.chip__badge--accent` (§8).

---

### Badge

Sizes are **dot/count dimensions, not text scales**, and each overrides padding to 2px:
`--xs` 8px · `--sm` 10px · `--md` 14px · `--lg` 18px.

Styles are a matrix of **solid / subtle / outlined × dark / light / neutral / accent /
notification** — e.g. `.badge--solid-neutral`, `.badge--subtle-accent`, `.badge--outlined-light`.
Separate family: `.badge-notification` + `--dot/--numbered/--top-right/…`.

There is **no `.badge--info`.**

> This block hardcodes hex (`#e5e5e5`, `#fcd34d`, …) instead of tokens — a known
> violation, see §8.

#### Verified against Figma — 2026-09-03

Source: Components file, page `53:645`. Figma models Badge as **two separate component
sets**, which is why the CSS has two families:

| Figma set | Axes | Maps to |
|---|---|---|
| `notification-badge` (`53:656`) | **Size** XS 8 · S 12 · M 16 · L 20 · XL 24 × **Type** Dot · Numbered | `.badge-notification` |
| `numbered-badge` (`149:4932`) | **Size** M 16 · L 20 · XL 24 × **Style** Dark · Accent · Light · Neutral | `.badge` |

**✅ `.badge-notification` matches Figma.** The size ramp is exact —
`--small` 12 · `--medium` 16 · `--large` 20 · `--extra-large` 24 ↔ Figma's
Small/Medium/Large/Extra Large. Style names line up too: Figma Dark/Accent/Light/Neutral
↔ `.badge--solid-dark` / `-accent` / `-light` / `-neutral`.

**Mismatches — flagged, not fixed:**

| # | Figma | Code | |
|---|---|---|---|
| 1 | `numbered-badge` sizes **16 / 20 / 24** | `.badge--md` **14**, `.badge--lg` **18**, no `--xl` | all three off |
| 2 | Numbered has no size below 16 | `.badge--xs` 8, `.badge--sm` 10 exist | extra, undesigned |
| 3 | Dot exists at **all five** sizes incl. XS 8 | `--dot` hardcodes 8×8; there is no `--extra-small` class | no XS name |
| 4 | Numbered exists at 4 sizes | `--numbered` hardcodes 16×16 | defaults, not an axis |

**On #1** — this is the substantive one. Figma's numbered badge runs 16/20/24 on the
8px grid; the CSS runs 14/18 and stops. `.badge--lg` (18px) is the one used in the
shell nav (`.e-permits-shell__nav-badge`), so it renders 2px smaller than designed
everywhere it appears.

**On #3 / #4** — not bugs, a modelling difference. Figma treats Type and Size as
independent axes; the CSS makes `--dot` and `--numbered` carry a *default* size (8 and
16) that a size class then overrides, since the size modifiers are declared later in
source order. Combining works (`--dot --large` → 20px); only the naming differs.

**Code exceeds design here**, which is fine but undocumented upstream: CSS ships full
`subtle-*` and `outlined-*` ramps and a `--solid-notification` style that Figma's
numbered-badge does not define. Conversely `.badge--info` exists in **neither** — its
earlier removal from this document was correct.

---

### Form fields, buttons, alerts — product rules (2026-09-28)

**Every form field is the full-flow component**, back office included:

| Control | Markup |
|---|---|
| field wrapper | `.e-permits-fo-field` > `<label for>` (+ `.e-permits-fo-required` marker via `requiredMark()`) > control > `.e-permits-fo-field__hint` or library `message--inline message--error` |
| text | `.e-permits-fo-input` > `<input>` (+ trailing `.icon`); read-only = `is-filled is-readonly`; error = `is-error` |
| textarea | `.e-permits-fo-textarea` > `<textarea>` — Figma text-area (Components 14701:8123): padding 8/12, radius 8, 14/20, `resize: vertical` with the grip bottom-right; a trailing `.icon` adds 36px right padding and turns resize off |
| select | `.e-permits-fo-select` via `renderFoSelectControl()` in `e-permits-shell.js` — a hidden native `<select>` keeps the value and fires `change`; the open list floats (fixed, in `<body>`) so modals/drawers never clip it; ↑↓ Enter Esc |

Deleted forks — never bring back: `e-permits-user-create__input/-shell/select/-shell/textarea/label/required`,
`e-permits-user-profile__control/select-shell/textarea/combo-select`, `e-permits-passport__hint`.
`.e-permits-fo-input.is-error` / `.e-permits-fo-textarea.is-error` mirror `.e-permits-fo-select.is-error`.

**One back-office button**: `.btn` + variant + `.btn-sm` = 32px, radius 6, transparent
border — page header, list rows, toolbars. No `btn-md` / `btn-lg`, no hand-rolled buttons.

**Modal AND drawer footers** (Figma EVO WEB 3.0 `20612:37263`): buttons sit in the
library `.modal-buttons` group → **40px pill**, 14/20 medium, 20px sides (12/16 with a
leading icon), fill only, 12px gap; secondary = `btn-neutral` (grey), main action =
`btn-primary`; markup `btn btn-neutral btn-rounded` / `btn btn-primary btn-rounded`, no size
class. **One 20px inset** for modals and drawers: header 20 (title starts 20 in and 20
down), close button 20 from the top and 20 from the right, content 20 on the sides
(`.modal-content` 16 / 20 / 4), footer 20 on **all four sides** so the buttons sit
exactly as far from the right edge as from the bottom (16 on phones for drawers).
Titles are 20px semibold on a 32px line, level with the 32px close button. A lone "Închide" is primary. `main.css` now
renders `.btn.btn-sm` at the Figma Small 32px (it was 29.25px); rounded/pill
variants keep their radius. The full flow keeps its own sizes.

**Alerts inside content** use the subtle message: `message message--subtle banner--{info|success|warning|error}`.
`banner--success` subtle (green-100 fill, green-600 icon) was missing from the
library and is now in `main.css`. The saturated `message--success` is for toasts only.

**Sticky page-header tabs**: headers with tabs get `.is-sticky` from
`watchPageHeaderMeta` — the header is `position: sticky` with
`top: --page-header-stick` (= tabs height − header height, re-measured on resize), so the
title scrolls away and the tab row pins under the top bar. Needs the content to
clip with `overflow-x: clip` (not `hidden`, which creates a scroll container).

### Checkbox

The previously documented `.form-check` markup was **entirely wrong**. The real component:

```html
<label class="checkbox checkbox--medium">
  <input type="checkbox" class="checkbox-input">
  <span class="checkbox-custom"></span>
  <span class="checkbox-texts">
    <span class="checkbox-label">Label</span>
    <span class="checkbox-description">Description</span>
  </span>
</label>
```

`.checkbox-custom` — 2px `--gray-300` border, radius 6, white. Checked → `--blue-sky-600`
fill + border. Indeterminate supported. Focus `outline: 2px solid --blue-sky-500; offset 1px`.
Sizes `--small` 16 · `--medium` 20 · `--large` 24. Error `--error` → `--red-600`.

#### Verified against Figma — 2026-09-03

Source: Components file, page `13:2`. Two component sets:
`checkbox` (`13:121`, the bare box) and `checkbox-label` (`13:130`, box + text).

Axes: **Mode** (Unchecked · Checked · Indeterminate) × **State** (Default · Focus ·
Disabled · Error) × **Size** (Small · Medium), plus **Supporting Text** (True/False)
on `checkbox-label`.

**✅ Confirmed** — all three modes, all four states, and the supporting-text variant
exist in CSS (`.checkbox-description`). Structure matches: box + label + description.

**⚠ Mismatch 1 — the size names are shifted one step.** This is a trap:

| Figma | px | CSS class at that size |
|---|---|---|
| — | 16 | `.checkbox--small` ← **not designed** |
| **Small** | 20 | `.checkbox--medium` |
| **Medium** | 24 | `.checkbox--large` |

Figma ships **two** sizes (20, 24); CSS ships **three** (16, 20, 24). So writing
`.checkbox--medium` gives you Figma's *Small*, and Figma's *Medium* is
`.checkbox--large`. `.checkbox--small` (16px) has no design behind it at all. Nothing
renders wrongly today — but the vocabulary means design and code say "medium" about
two different things.

#### Document icons + per-step output rows (2026-10-08)

- **Icon by origin:** every document the **system generates** (output forms / șabloane de
  tipar, acts, decisions, notes, certificates) uses the **blue** full-flow icon
  `assets/icons/document-generated.svg`; documents the **user uploads** or that come from
  RSSP use the **grey** `assets/icons/document-uploaded.svg`. 24px,
  `.e-permits-fo-lib-item__icon`. Figma: the grey one is the local component
  „Icon / Document (grey, filled)” (`10327:34118`).
- **Document row** = the Documente tab row: `.e-permits-stack__item.has-lead` (icon · title ·
  meta line with the code tag) inside one bordered, integrated `.e-permits-stack` with a
  group header (title + count) — never one card per row, never a checkbox list.
- **Per-step override row** (request type › Documente generate / Notificări — the Formulare
  model: the process sets the default, the request type may override per step).
  `rtOverrideRow()` in `js/e-permits-shell.js`:
  - one row per flow step (`passport.documentSteps(flow)` / `notificationSteps(flow)`),
    lead = blue icon (documents only), title = step name, meta = doc-type tag;
  - status tag next to the title: `Implicit` (documents) / `Din proces` (notificări) neutral,
    `Personalizat` brand when overridden;
  - right side `.e-permits-rt__action-control`: documents only — icon-only
    `btn btn-neutral btn-sm btn-icon-only` eye („Previzualizează”, `data-rt-doc-peek`,
    `aria-expanded`) · fo-select 340px (first option `value="default"` = „Implicit ·
    <template>”, so it renders as a value, not a placeholder) · `Revino la implicit` text
    button only when overridden. No „Generează” switch (removed 2026-10-08, user: not needed
    in the drawer). Stored as `rt.docOverrides`, `rt.notifyOverrides`.
- **Formulare (service tab) › ⋮ per form (2026-10-08, user):** every item has a defined result
  (demo states `svc-03b…03g`, Figma 03b–03g):
  - **Editează / Adaugă formular** open the whole builder as a **sheet**
    (`.form-builder-modal-overlay.is-sheet`: 16px dimmed strip on top, rounded top corners);
    the FO builder demo flow keeps its full-page builder.
  - **Previzualizează** → the **rendered form, as the applicant sees it**: the builder's
    Preview, view-only (`.is-sheet.is-view-only`): the same sheet as Editează (16px dimmed
    strip on top only, rounded top corners); Build/Schema switch, version, errors, scope and Publică hidden;
    header „Previzualizare · <formular> vX” + `Doar vizualizare`; × on the right. Closing
    resets the builder to Build. (Showing the whole builder here was tried and reverted — the
    user wants the end-user render.) Non-admins get Previzualizează as the row action.
  - **Versiuni** → the standard „Istoric versiuni” modal (`#dtpl-history-modal`, same as the
    service and the templates): newest first, the version in force marked „în vigoare”, a
    draft on top as „schiță, nepublicată” (marker: edit icon). `formVersionHistory(form)`.
  - **Duplică** → copy in draft + success toast · **Exportă setări (JSON)** → download +
    toast · **Elimină** → blocked (error toast naming the request types) when the form is
    used, else the destructive confirmation.
- **Document preview (view-only) next to a drawer (2026-10-08, comment 1958021586):**
  `section.e-permits-doc-peek` inside the drawer `<aside>` (so the dialog keeps focus/Esc),
  docked in the free space left of the drawer (`left: calc(100% - 100vw); right: calc(100% +
  12px)` — a 12px strip of the dimmed backdrop separates the two panels); when
  that space is < 560px it slides over the drawer's left part (`.is-overlay`, max 760px) —
  the selects on the right stay visible. Header = drawer header (template name; subtitle
  step · type · version + `Implicit`/`Personalizat` + `Doar vizualizare` tags; close),
  grey canvas with the builder's A4 page (`.e-permits-dtpl__page`, `dtplFill` with sample
  data) scaled to fit via `zoom`, footer note. The previewed row gets `.is-previewing`
  (brand-secondary background). It follows the row's select; Esc closes the preview first,
  focus returns to the eye button. Motion: opens from behind the drawer (200ms
  `cubic-bezier(0.16,1,0.3,1)`, 24px + fade), closes 140ms ease-in (`.is-closing`), another
  template in the open panel cross-fades the page (180ms, `.is-swapping`); re-renders that
  keep the same template do not re-animate; `prefers-reduced-motion` turns all of it off.
  Demo `svc-02d1`.
  - **Notificări** rows have the same eye: the panel shows the notification template the
    step sends (override or the process one), RO text, with an E-mail / Mobil segmented
    switch (`renderNtplPreviewOf(text, mode)` — the same card as the template's Conținut
    preview). Built exactly like that Conținut preview: **white** canvas (`.is-mail`) → the
    switch on white → the grey frame `.e-permits-ntpl-preview` → the white card (the A4
    documents keep the grey canvas). Demo `svc-02d2`.
  - **Șabloane tab:** the eye on a print-template row (`data-dtpl-preview`) opens the same
    A4 page **view-only** in its own drawer (`[data-tpl-preview]`, 880px); the builder is
    one step further — „Deschide constructorul” (admins) in that drawer's footer. An eye
    never opens an editor. Demo `svc-08l`.
- **Preview floats, drawer does not (2026-10-08, user):** the drawer stays full height, square,
  edge to edge (as every drawer); only the document / notification preview floats — **16px on every side**: from the
  screen's top, bottom and left edges and from the drawer; `--border-radius-16` all round,
  `--drop-shadow-400`. (Tried and rejected: 12px gap; flush against the drawer.)
  **Room for both:** while the preview is open the wide drawer narrows (`.has-peek`:
  `clamp(640px, 100vw − 592px, 960px)`, 200ms width transition) so both sit side by side —
  1440: drawer 848 + preview 560; 1920: 960 + 912. Below 1232px (and on phones) there is no
  room: the drawer keeps its width and the preview opens as a regular full-screen panel over
  it (`.is-overlay`), keeping the 16px inset and the rounded corners, and the drawer behind it
  dims with the page backdrop colour (`.has-peek-overlay` → `::after` scrim). The A4 page re-scales
  on every canvas resize (ResizeObserver → `zoom`). 

#### Checkbox with title + description = the switch layout (2026-10-08)

Every checkbox that has a **title and a description** uses exactly the switch row's layout
(`.e-permits-toggle`), only with a checkbox:

```html
<label class="checkbox checkbox--medium e-permits-check">
  <input type="checkbox" class="checkbox-input">
  <span class="checkbox-custom" aria-hidden="true"></span>
  <span class="checkbox-texts">
    <span class="checkbox-label">Titlu</span>
    <span class="checkbox-description">Descriere</span>
  </span>
</label>
```

- 12px between box and text, vertically centred (as the switch).
- Title 14/20 **medium**, `--color-text-base-default`; description 14/20 regular,
  `--color-text-base-tertiary` — identical to `.e-permits-toggle__label` / `__description`.
- CSS lives in `css/e-permits-shell.css` (`.checkbox.e-permits-check`); `main.css` stays the
  library copy. Used by: tariff „Specialistul completează
  variabilele…”, classifier value checklist.
- **Figma:** local component set **„Checkbox · titlu + descriere”** (`10387:1247`, page
  ↳ BO -> Servicii): variants `Checked=True|False`, props `Titlu`, `Descriere`,
  `Arată descrierea`; library `checkbox` (Size=Small = 20px) + texts Body/Small 500 and
  Body/Small tertiary, gap 12, centred. Never rebuild it from a bare box + text frames.

#### Full flow — services with optional MPass (2026-09-30)

When a service works **with and without** authentication (`auth.required: false`), an
unauthenticated user first sees **„Autentifică-te sau continuă fără cont”** (`[data-fo-screen="access"]`; EN reference: "Sign in or continue without an account"),
before any manual entry — the familiar "sign in / continue as guest" pattern, nothing more:
the auth card (icon, title, one description line), then two full-width 48px options, each
with one line under it (`.e-permits-fo-access__hint`): **MPass badge button** („Recomandat.
Datele se completează automat, actul în contul EVO”), a plain **„sau”** rule
(`.e-permits-fo-access__or`), then `btn btn-neutral`
„Continuă fără cont” („Completezi datele manual, iar actul îl primești pe e-mail.”) → the guest
form. Wording rule (GOV.UK / Baymard): name both options in the title, say "without an account"
rather than "guest", the guest option is a full button of equal weight, never a text link. No logo lists,
no tags. Services with `auth.required: true` keep the MPass gate. Logout returns here.

#### Back-office sizing rules (2026-09-30)

- **Tabs** = Figma `tab-item-s`: `.tabs.tabs--sm` → **40px, 12px sides, 14/20**, count badge
  20px. The library `.tabs--sm` now resets the 48px height. Page-header tabs and the
  registry status tabs (`.e-permits-workplace__status-tab`) use the same 40 / 12 / 14.
- **Counters** = library numbered badge **Light**: `badge badge--lg badge--solid-light`
  (Figma 9442:44730: 20px, 4px sides, 12/16 medium). The library ramp now matches Figma:
  `--lg` 20px (12/16), new `--xl` 24px (14/20, the sidebar nav badges). Group headers of
  stacked lists: 16/24 medium secondary, 8/20 padding, 10px gap.
- **⋮ menu** (`.e-permits-stack__menu`): items 32px, 14/20, 16px icon, radius 6 — the
  footprint of a small button.
- **Row actions**: edit / export are icon buttons (`.e-permits-workplace__icon-action`,
  32px) — "Editează" and "Exportă" are icon-only with aria-label + title.
- **Sync sources**: services declare `syncSources` (`RSSP`, `eAPL`). With both, the passport
  "Sincronizează" is a menu (RSSP / eAPL / RSSP și eAPL) and the modal shows a
  **Sursa sincronizării** segmented control. A new service is created only from RSSP;
  eAPL enriches (Date locale). While syncing: one progress line per source + a
  `.e-permits-fo-skeleton` summary. Rules: `GEAP.servicePassport.syncFromEapl`.
- **Tarife** (Feature «Gestionarea clasificatorului de tarife») = the **price list**: **global**
  tariffs in Administrare → Tarife (registry, `kind: "tariffs"`, toolbar „Adaugă tarif” +
  export); a **service's** tariffs (mostly from RSSP / eAPL) have no tab of their own any
  more — they are charged through the passport's **Taxe** tab (see "Taxe — tariff +
  application rule"); a manual service tariff is created from the tax drawer. Both open the same drawer `[data-tariff-drawer]`: **Identitate** (Denumire RO/RU/EN, Tip,
  Temei legal; service only: Tip solicitare, Subdiviziune, Tip persoană = 14px segmented),
  **Sumă și formulă** (Sumă + Valută, switch „Calcul prin formulă” → the Sumă field goes away
  — a formula tariff has no amount — and the expresie `{var}` appears,
  rotunjire, grey „Verifică formula” panel with test values, IBAN select with the authority's
  principal account as default), **Ciclu de viață** (Valabil de la/până la, stare, sursă,
  Folosit de, istoric versiuni, Activează/Dezactivează, Șterge only if unused — confirmed
  inline). RSSP/eAPL tariffs show Denumire RO, Sumă, Valută, Tip solicitare, IBAN, Temei
  legal as read-only (lock icon + „Preluat din …”). Rules: `validateTariff`, `tariffLocked`,
  `applyTariffEdit` (published + changed → new version with a note), `tariffActions`,
  `evaluateFormula` (safe arithmetic), `tariffPayAccount`, `syncServiceTariffs` (overwrites
  only fields the registry sends). Export buttons share `EXPORT_ICON`.
- **Filter chips** (`.e-permits-rt__chips`): medium labels; counts = the numbered badge Light
  (`badge badge--lg badge--solid-light`), not `.chip__badge`.
- **Taxe** (replaces "Plăți" + the service "Tarife" tab, 2026-10-02): one toolbar (chips ·
  search · export · sync tariffs · Adaugă taxă) and a wide-drawer editor; rules in
  `validateTax`, `taxConflict`, `taxAmount`, `momentAllowed`, `tariffEligibility`,
  `applyPaymentEdit`. Full spec: "Taxe — tariff + application rule".

#### Single choice in a form (2026-09-30)

- **Mode switch** (Tip generare Automat / Manual): the library **segmented control at the
  14px default size** — `.segmented-control` > `button.segment-item[role=radio]`, no size
  modifier (Figma 8715:73423). Never `--small` (12px) and never `--large` (16px) in the
  back office. Unavailable option = `disabled`.
- **Pick a source / option set** (Sursa sincronizării RSSP / eAPL / RSSP + eAPL): library
  mono-select chips via `renderChoiceChips()` — selected `.is-selected` + `.chip__icon` check.
- **Back office never uses 16px text on controls**: inside drawers the library checkbox and
  switch labels are set to 14/20 (`.e-permits-user-create .checkbox-label / .switch-label`).
  Only headings are larger.
- Form drawers (Figma 8722:107671): single column, full-width fields with hints, short fields
  paired 6/6, sections with an 18px heading and a rule. Chip focus is keyboard-only.

#### Focus — one look, product-wide (2026-09-29)

Keyboard focus everywhere is the **full-flow focus** (as `.e-permits-fo-input:focus-within`):
**blue stroke** (`--color-border-brand-default`, 2px, inset or border) **+ 4px light-blue
halo** (`--blue-sky-200`). Show it on `:focus-visible` only, so mouse clicks never flash
a ring. The library checkbox does this (`border-color` brand + halo) and animates colours
only (`transition: background-color, border-color, box-shadow 120ms`). Never
`transition: all` on a control: it animated the focus outline in steps and made the
Dosare checkboxes feel laggy.

**Exception — choice cards and the profile trigger (2026-10-02):** the back-office
instance/role cards (`.e-permits-shell__role-card`): one real 1px
`--color-border-base-default` border (no transparent border slot, no inset-shadow stroke),
kept on hover; hover only fills the inside `--color-background-base-secondary`; selected
(`.is-active`) = brand border + 1px inner brand line (2px total) on brand-secondary;
focus = 2px `--color-background-base-default` gap + 4px `--focus-ring` ring
(`box-shadow`, `outline: none`, `z-index: 1` so neighbours don't cover it). The header
profile trigger (`.e-permits-shell__user-trigger`) shows the same ring on `:focus-visible`
**and while its menu is open** (`[aria-expanded="true"]`) — open dropdown = Focus state. Under the user's name,
the role line `__user-meta` ("Specialist • Chișinău") is 12/16 regular, `--color-text-base-secondary`.

**Role switcher groups = institutions; > 3 roles → collapsible (2026-10-02).** `renderRoleGroups()`
in `js/e-permits-shell.js` renders one `.e-permits-shell__role-group` per institution
(`rolesDb.groups`). When an institution has **more than 3** assignments
(`ROLE_GROUP_COLLAPSE_AFTER`), the section reuses the **full-flow role collapse unchanged**
(`.e-permits-fo-auth__role-collapse-toggle` "Arată mai multe / Arată mai puține" + the
badge stack `.e-permits-fo-auth__role-collapse-preview` — up to 4 badges, the 4th becomes
`+N` — + arrow, then `.e-permits-fo-auth__role-collapse` holding the cards). The badges are
the role card's icon circle (`.e-permits-fo-auth__role-collapse-avatar.e-permits-shell__role-card-icon`).
The institution of the active role opens expanded; a collapsed panel is `inert`. The
expanded-state selectors in `e-permits-acte-permisive.css` list both
`.e-permits-fo-auth__role-group.is-expanded` and `.e-permits-shell__role-group.is-expanded` —
extend those, never copy them.

#### One checkbox, one size — product rule (2026-09-27)

Every checkbox in the product is this component at **`.checkbox--medium` (20px)**:
registry tables, classifiers, dropdown/suggestion options, GDPR consent, the
paper-copy option, RAP filters, builder toggles. The old hand-rolled boxes
(`e-permits-workplace__checkbox`, `e-permits-fo-subgen-select__checkbox`,
`e-permits-fo-consent__box`, `e-permits-fo-delivery-paper__box`,
`e-permits-user-profile__perm-checkbox`, `rap-filter-option__box`, `rap-checkbox`,
`e-permits-builder__mini-check--only`) are deleted — do not bring them back.
Do not use `--small` or `--large`.
**Checkbox option component (2026-10-09):** an on/off option beside a row (Documente
„Afișează” / „Obligatoriu”, Setări › RAP „Publică” / „Anonimizează”) is always
`renderCheckOption({ label, checked, disabled, required, attrs, reason })` — Figma „Opțiune
document · checkbox” (`10507:125565`): library checkbox **Figma Size=Small = 20px box** (code
`.checkbox--medium`; the code `--small` is 16px and does not match Figma), radius 6, the
**16/checkmark-small icon** as the tick (`.e-permits-check-option__tick`, white; disabled =
icon-disabled; the drawn `::after` tick is hidden), grey container base-secondary, radius 8,
padding 6/12/6/8, gap 8, label 14/20 medium, 12px danger asterisk (`requiredMark()`) when
required. States: hover base-secondary-hover · keyboard focus ring · disabled = disabled
label + `data-tooltip-reason` · checked = brand box. Several sit in `.e-permits-check-options`
(gap 8, wraps). **`plain: true`** = the same 20px box + icon tick without the grey container
and with a regular label — every checkbox list in Setări (`cfgChecks`) uses it, so all
checkboxes on a screen look the same. Never hand-roll another. A group checkbox („all of
this group”) sets `input.indeterminate` for „some”: the option then hides the icon tick and shows
the library's 10×2 dash, centred; `label: ""` hides the empty label.

`.checkbox-custom` now carries `box-sizing: border-box` and `flex: 0 0 auto` in
`main.css`. Without them it rendered **24px** on pages with no global border-box
reset (`clasificatoare.html`) and shrank next to long wrapping text.

Three placements:

```html
<!-- 1. standalone / table cell — a label, the input takes the click -->
<label class="checkbox checkbox--medium">
  <input class="checkbox-input" type="checkbox" aria-label="Selectează rândul">
  <span class="checkbox-custom" aria-hidden="true"></span>
</label>

<!-- 2. with text — keep a layout class on the label for the row's own spacing -->
<label class="checkbox checkbox--medium e-permits-fo-consent">
  <input class="checkbox-input" type="checkbox" data-fo-consent>
  <span class="checkbox-custom" aria-hidden="true"></span>
  <span>Text…</span>
</label>

<!-- 3. inside a listbox option — decorative; the option owns aria-selected,
        JS keeps input.checked in sync with it -->
<li role="option" aria-selected="true">
  <span class="checkbox checkbox--medium" aria-hidden="true">
    <input class="checkbox-input" type="checkbox" tabindex="-1" checked>
    <span class="checkbox-custom"></span>
  </span>
  …
</li>
```

⚠ The library input has `pointer-events: none`, so clicks land on the `<label>`.
Row-click handlers must ignore `label` as well as `input` (see the registry row
handler: `closest("input, label, button, a")`), or ticking a row opens its profile.

**⚠ Mismatch 2 — touch targets are unimplemented.** Figma's accessibility section
(`2822:1206`) specs enlarged hit areas on touch: a 20px box gets a **36×36** target
(inset −8), a 24px box the same (inset −6), and label rows expand −6 on each side.
`main.css` contains **zero** `pointer: coarse` / `any-pointer: coarse` media queries
and no 36px or 44px minimum targets — none of this is implemented. Worth noting the
16px and 20px boxes are below the 24×24 CSS-px floor in WCAG 2.2 SC 2.5.8 (AA) unless
the spacing exception applies, and the designed 36px target is what would clear it.

**Gaps in Figma's own matrix** — Error exists only for *Unchecked* (no Checked+Error,
no Indeterminate+Error), and Disabled has no Indeterminate variant. The CSS allows all
combinations, so those three states are reachable in code but undesigned. Not a defect;
decide the intent before relying on them.

---

### Radio

```html
<div class="radio-group">
  <label class="radio radio--medium">
    <input type="radio" class="radio-input" name="g">
    <span class="radio-custom"></span>
    <span class="radio-texts">
      <span class="radio-label">Label</span>
      <span class="radio-description">Description</span>
    </span>
  </label>
</div>
```

`.radio` is the label/wrapper; `.radio-label` is the **text span inside `.radio-texts`**
(the previous version of this doc used the class in both places). Checked dot animates
`scale(0)→scale(1)` over `.2s`. Sizes `--small` 16 / `--medium` 20; `--error`.

---


#### Verified against Figma — 2026-09-03

Source: **Components** file, page `13:3`. Two components: `radio-button` (**Mode**
Unselected/Selected x **State** Default/Focus/Disabled/Error x **Size** Medium/Small) and
`radio-label` (same, plus **Supporting Text** True/False).
**Medium 24x24, Small 20x20**; border 2px `#b2b2b2`, radius full; gap circle→label
**12px**; label 16/24 **Medium 500** `#121212`; supporting text 14/20 Regular `#757575`,
**2px** below the label.

**Ok** — structure matches (hidden input + custom circle + texts), `border: 2px`,
radius 50%, and disabled / focus / error variants all exist.

**⚠ Mismatch 1 — sizes are shifted a full step, exactly like Checkbox:**

| Figma | px | CSS class at that size |
|---|---|---|
| — | 16 | `.radio--small` ← **not designed** |
| **Small** | 20 | `.radio--medium` |
| **Medium** | 24 | — **missing entirely** |

Unlike Checkbox (where `--large` covers 24), Radio has **no 24px option at all**, so the
designed default size is unreachable.

**Other mismatches:**

| | Figma | CSS |
|---|---|---|
| gap circle→label | **12px** | `--spacing-8` = 8px |
| border colour | `#b2b2b2` (`--gray-300`) | `var(--gray-400, #ccc)` = **#757575** |
| label weight | **500** | unset → 400 |
| supporting text | **14px** | `--text-body-xs-font-size` **undefined** → renders **12px** |
| label↔description gap | 2px | 3px |
| label colour | `#121212` | `--gray-900` = `#1e1e1e` |

**Gap — the 36x36 target is unimplemented.** The design states it plainly:
> *"To support comfortable and accessible interactions, the radio button's interactive
> area should be at least 36x36px. This ensures users can reliably tap without
> misselection."*
> *"Users should be able to select either the circle itself or the associated label."*

`.radio` is `width: fit-content` with an 8px gap; there is no hit-area `::before` and no
`@media (pointer: coarse)`. The label-as-target half *is* satisfied (the whole `<label>`
is clickable).

---

### Switch

**`.switch` is the required root** — every size custom property lives there, so a
`.switch-wrapper` on its own has no dimensions.

```html
<div class="switch switch--medium">
  <label class="switch-wrapper">
    <input type="checkbox" class="switch-input">
    <span class="switch-track"><span class="switch-thumb"></span></span>
    <span class="switch-text">
      <span class="switch-label">Label</span>
      <span class="switch-description">Description</span>
    </span>
  </label>
</div>
```

Sizes redefine vars on `.switch`: `--small` 32×16 · `--medium` 40×24 · `--large` 56×32.
Also real: `.switch--error`, `.switch--disabled`, `.switch-label`, `.switch-description`.

---


#### Verified against Figma — 2026-09-03

Source: **Components** file, page `68:484`, component `switch` (`68:500`) — **State**
(Default · Focus · Disabled) x **Checked** (False · True). **6 variants: one size, no
hover, no error.**

**Ok — the geometry is exact:** track **48x28**, thumb **24x24** at `left: 2px` → 22px
checked; unchecked `#b2b2b2`, checked `#0058d2`, disabled `#f1f1f1`. All match.

**Mismatches:**

| | Figma | CSS |
|---|---|---|
| Thumb shadow | `0 0 .5px rgba(0,0,0,.3), 0 1px 3px rgba(0,0,0,.16)` | **none** |
| Focus ring | `0 0 0 1px #fff, 0 0 0 3px #3379db` | two conflicting rules; the white inner ring is missing |
| Disabled | solid `#f1f1f1` | `#f1f1f1` **+ `opacity: .6`** |
| blue-sky-500 fallback | `#3379DB` | typo'd **`#3379DD`** (`:19323`) |

**Gap — target size.** The design is explicit: *"For the switch (28px), the target size
should be increased to **32px**"* (pointer) and *"**40px**"* (touch). `.switch-wrapper` is
`width: fit-content` around a 28px track — nothing pads the hit area.

**Undesigned extras:** `:hover`, `.switch--error`, and **three size modifiers**
(`--small` / `--medium` / `--large`) where Figma has one size. `--large` also breaks the
2px thumb inset (24px thumb in a 32px track = 4px).

---

### Input

```html
<div class="input-wrapper has-leading">
  <span class="input-icon left"><svg class="icon">…</svg></span>
  <input class="input" type="text" placeholder="…">
</div>
<span class="input-message warning">Helper text</span>
```

- Default height is **48px**. `.input--medium` is the **40px smaller** variant — it is not the default.
- The wrapper is **`.input-wrapper`**; `.input-group` is only `max-width: 285px`.
- `.input-icon` is the **icon span**, positioned with `.left` / `.right` / `.checkmark`.
  Padding compensation comes from `.input-wrapper.has-leading` / `.has-trailing`.
- `.input-message` state classes are **single words**: `.default` `.warning` `.destructive` `.success`.
- Labels use the bare `label` element selector (`label.required::after` adds the asterisk).
  **There is no `.form-label`.**
- States: `--success` `--warning` `--destructive` `--filled`. Also real: `.input-number`.

---

### File Input

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **File Input** `210:3889`. `file-input` (5 states,
**588x188**; Active 186), `file-item` (**Breakpoint** x **State** Uploaded · Uploading ·
Success · Error — Desktop **588x48**, Error **588x80**; Mobile 343), `.upload-icon`
(Document · Image).

**Ok** — stacked-item gap **8px** exact; 32x32 thumb fits the 48px row; live image
preview implemented (`__thumb--image img`), matching the guidance; filename ellipsis
present; uploading spinner present; dropzone Default/Hover/Active/Focus all exist.

**Mismatches:**

| | Figma | CSS |
|---|---|---|
| `file-item` height | **48** | 32 + 12 + 3 = **47** |
| `file-item` **Error** | **80** — two-line, with a message row | **47** — `--error` only recolours the border; no message element exists |
| gap dropzone → list | **24** | `margin-top: 12px` |

**Gap — the Success state is unimplemented.** The design is specific:
> *"The success icon is a temporary confirmation state. After a delay (2-3s), it
> auto-switches to the final uploaded state with the close action. Use fade/crossfade
> transition into final state."*

There is no timer, no transition, and no `--success` rule — only an inline green SVG in
the demo. Dropzone **Disabled** is likewise absent.

⚠ **Broken CSS ships in `main.css:18810-18822`.** Three `.file-input.*` rules contain
**raw, uncompiled Sass**:

```css
.file-input.default {
  --border-color: map.get(map.get(tokens.$input-colors, $variant), border);
  --focus-color: map.get(map.get(tokens.$input-colors, $variant), focus);
}
```

These are invalid declarations shipped in the compiled stylesheet — a build escape, not a
design gap. Worth fixing at source.

⚠ `.dropzone:hover` is declared **twice** (`:18971` and `:18995`), splitting border-colour
and background across two rules; and `.dropzone:focus` uses `:focus`, not
`:focus-visible`, unlike its siblings.

---

### Footer

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Footer** `347:12318`. Figma defines **three distinct
footers** — `footer-general` (Type Extended/Compact x Desktop/Mobile), `footer-evo-primary`
(breakpoints 1248 · 1024 · 768 · 375) and `footer-evo-secondary` — plus sub-components
`.legal-bar` (Breakpoint x **Style Light/Dark**), `.footer-promo` (Universal / EVO
Oriented), `.footer-column` (Light/Dark) and `.column-item`.

> *"The footer displayed here is the primary one for the entire Evo Platform... This
> secondary footer component is designed for use on internal or secondary pages."*

**Ok** — `.footer__top--compact` corresponds to Type=Compact. `.container`
`max-width: 1248px` matches the designed content width. `.footer__bottom`
(`padding-block: 12` + 20px line-height = **44px**, dark ground, white text) matches
`.legal-bar` Desktop **Dark 44** exactly.

**Mismatches:**

| | Figma | CSS |
|---|---|---|
| Breakpoints | **1248 / 1024 / 768 / 375** | 1279 / 991 / 768 / 576 — only **768** aligns |
| `.legal-bar` Light | Desktop **48**, Mobile **96** | only the Dark 44px treatment exists |
| `.legal-bar` mobile | **96px**, two rows | single row at all widths |
| Component count | **3** distinct footers | **1** `.footer` family |

**Gaps — designed, zero CSS:** `.legal-bar` (as a class), `.footer-promo` (4 variants),
`.footer-column` (Light/Dark), `.column-item`, and both EVO footers.

⚠ **Dead classes** — `Components/footer.html` uses `.footer__nav-col`, `.footer__icon`,
`.footer__social--link` and `.footer__nav--item`, none of which has a CSS rule **or** a
Figma counterpart.

---

### Tooltip — plain label for icon-only controls (added 2026-10-01)

Every icon-only control (button / `a[href]` / `[role=button]` with no visible text) gets a
Google-style label tooltip automatically from `js/icon-tooltip.js` (also in `Components/js/`).
Markup: the library tooltip with `.tooltip.tooltip--small.tooltip--plain` (no arrow, padding
4/8, 12/16 text, radius 4, `--gray-900`), one shared node `#icon-tooltip` with `role=tooltip`.
- **Behaviour:** mouse — appears after a 600 ms hover; while one is showing (or within 400 ms
  after), the next icon shows at once. Keyboard — on `:focus-visible`, no delay. Hides on
  mouse-out, blur, pointer-down/click, scroll, resize, Escape, window blur. Below and
  centred, flipped above near the viewport bottom, clamped 8px from the edges. Not shown
  while the control's menu is open (`aria-expanded="true"`).
- **Text:** `data-tooltip-label`, else `aria-label`, else `title` (a `title` is moved into
  `data-tooltip-label` so the native tooltip never doubles it). Keep the tooltip short and
  the `aria-label` specific: edit icons `title="Editează"` + `aria-label="Editează <obiect>"`;
  ⋮ triggers `data-tooltip-label="Mai multe acțiuni"`.
- **Opt out:** `data-no-tooltip`. Controls using the rich tooltip (`data-tooltip`) are skipped.
- Loaded on `e-permits-acte-permisive.html` and `e-permits-shell.html`
  (`js/icon-tooltip.js?v=…`, defer). Delegated on `document`, so re-rendered lists need no wiring.

### Tooltip — verified

#### Verified against Figma — 2026-09-03

Source: **Components** file, page `174:935`, component `tooltip` (`210:3897`) —
**Size** (Large 240 · Small 220) x **Arrow Position** (Bottom / Top x Left / Center /
Right) x **Close Button** (Large only). 18 variants.

**Ok** — `.tooltip-inner` background `--gray-900` `#1e1e1e` exact, white text,
`border-radius: 6` (Large), `max-width: 240px` exact, 14px text, and
`.tooltip--small .tooltip-inner { padding: 8px 12px }` **exact**. `js/tooltip.js` emits
the size and side-align classes correctly.

⚠ **Naming inversion — the most likely source of a wrong-side bug.** Figma's axis is
**arrow position** (`Bottom` = arrow on the bubble's bottom edge, so the tooltip sits
*above* the trigger). CSS names by **placement side** — `.tooltip--bottom-*` puts the
arrow at `top: 1px`, i.e. the tooltip sits *below*. **The two vocabularies are inverted.**
Mapping a Figma variant name straight to a CSS class puts the arrow on the wrong edge.

**Mismatches:**

| | Figma | CSS |
|---|---|---|
| Large padding | pl16 / pr12 / py12 | `.tooltip--large` `16px 24px` (the *default* `12px 16px` is closer) |
| Small radius | **4** | stays 6 |
| Small text-align | **center** | inherits left |
| Arrow | 32x12 (L) / 21.3x8 (S) | one 14x14 square rotated 45deg |
| Shadow | 3-layer Drop Shadow/200 | `0 4px 10px rgba(0,0,0,.15)` |
| Close button | 16px icon **inline**, bubble pr 12 | absolute 40x40 + `padding-right: 48px` |

**Undesigned extras** — six extra arrow positions (`left-*`, `right-*`); Figma designs
only Top/Bottom x Left/Center/Right. Also `.tooltip-close { background: buttonface }`
uses a UA system colour, not a token.

---

### Table cell — `.cell`

**Added 2026-09-03.** One composable cell family replacing three hand-rolled sets
(`e-permits-workplace__*`, `rap-*`, the dead `permits-table__*`). Lives in `main.css`;
behaviour in `js/table-cells.js`. Demo: **`table-cells.html`**.

Owns **no** table chrome — drops into any existing `<td>`.

**Three ideas do the work.** `.cell` is the horizontal row, `.cell__body` is the vertical
text column, and modifiers are orthogonal so they combine freely:

```html
<div class="cell cell--media cell--truncate">
  <span class="cell__media">…</span>
  <span class="cell__body">
    <span class="cell__primary" data-cell-tooltip="full">Primary</span>
    <span class="cell__secondary">Meta</span>
  </span>
</div>
```

| Class | Role |
|---|---|
| `.cell` | flex row · `--cell-gap` 12 · `--cell-stack-gap` 4 · `--cell-media-size` 24 |
| `.cell--start` / `--numeric` / `--center` / `--action` / `--tight` | alignment; `--numeric` adds `tabular-nums` |
| `.cell--truncate` | ellipsises every text child |
| `.cell__body` | vertical text column |
| `.cell__primary` | 14/20 **500** `#121212` — the identifying line |
| `.cell__text` | 14/20 400 `#383838` — a plain value |
| `.cell__secondary` | 12/16 400 `#757575` — meta; `--warning` / `--danger` tones, `.cell__dot` |
| `.cell__media` | 24px slot — icon, `<img>`, or initials; `--brand`, `--square` |
| `.cell__copy` | copyable mono value; `--sm`, `--masked`, `.is-copied` |
| `.cell__code` | mono, non-copyable |
| `.cell__tags` + `.cell__more` | tag list with `+N` overflow |
| `.cell__empty` | the `—` placeholder |
| `.cell__action` | trailing chevron; nudges on row hover |

**Status uses the library `.status-tag`** rather than a fourth pill system — remember the
intensity class is mandatory (§0.3).

**JS contracts** — `data-cell-copy="<value>"` and `data-cell-tooltip="<full text>"`.

**Tooltip timing (2026-10-02, user: showing instantly is disturbing):** on hover the cell
tooltip waits **1s** (`SHOW_DELAY_MS`) — a pointer sweeping across a table never flashes
tooltips. Once one is visible, moving straight to the next cell (within `WARM_MS` 300ms)
shows it at once. Keyboard focus shows it immediately; `pointerdown` (opening a row) and
leaving the cell cancel a pending one. Applies to truncation tooltips (full name, long
text) and `+N` overflow badges (`data-cell-tooltip-always`). Clickable rows keep
`cursor: pointer` on every cell — never the text I-beam.

**Back office (2026-10-01):** `js/table-cells.js` is loaded on
`e-permits-acte-permisive.html`, and table cells use the **dark `.cell-tooltip`**, never a
native `title`:
- **Long text:** registry names and authority stacks carry `data-cell-tooltip`. The
  tooltip shows only when the text is clipped.
- **"+N" overflow badges** (e.g. user roles beyond the first 2): the
  `.e-permits-workplace__user-role-more` has `data-cell-tooltip="<all items, comma
  separated>"` + **`data-cell-tooltip-always`**, which shows it even though nothing is
  clipped. It also has `tabindex="0"` and an `aria-label` "Toate rolurile: …", so a
  keyboard reaches it. Every future "+N" uses the same pattern.

**Three deliberate behaviours, each fixing a flaw in what it replaces:**

1. **The tooltip fires only when text is genuinely clipped** (`scrollWidth > clientWidth`),
   so untruncated cells stay quiet.
2. **It triggers on focus as well as hover.** The RAP implementation was pointer-only,
   leaving truncated text unreachable by keyboard.
3. **The copy handler is registered in the CAPTURE phase.** A document-level listener in
   the bubble phase runs *after* a row-level handler on `<tr>`, so `stopPropagation()`
   would be too late and a copy click would also open the row. Verified: row handler
   fires 0 times.

**Verified in-browser** — media 24px, stack gap 4px, mono copy value, icon hidden until
hover/focus, tooltip on hover **and** focus, silent on unclipped text, clipboard receives
the value, `aria-label` swaps Copiază→Copiat and reverts after 1600ms, zero console errors.

**Consolidation it supersedes** (do not add a fifth of anything):

| Concern | Was | Now |
|---|---|---|
| Copy to clipboard | **4** implementations — `data-rap-copy` (1600ms), `.rap-profile__copy`, `data-fo-copy-value` (1500ms), `data-copy-id` (1500ms) | `.cell__copy` + `data-cell-copy` |
| Status pill | **3** — `.rap-status` (raw hex), `.status-tag` (tokens), `.permits-table__tag` | library `.status-tag` |
| Truncation | **4** — `.rap-ellipsis` + 3 inlined copies | `.cell--truncate` |
| Two-line stack | **2** disagreeing — gap 4/weights 400 vs gap 2/weights 500 | `.cell__body`, gap 4 |
| Avatar + name | **3** — gaps 12 / 8 / 6, name colour `#121212` vs `#383838` | `.cell--media` |
| Trailing chevron | **2** — translateX 2px vs 4px | `.cell__action`, 2px |

⚠ **Not yet adopted.** Shipped tables still use their original classes; this was built
alongside them deliberately. Migrate a table by swapping cell markup only — no row or
header changes are needed.

---

### `.visually-hidden` — promoted to the library

Screen-reader-only text was defined **only** in `css/e-permits-acte-permisive.css`, a page
stylesheet. Any page loading just `main.css` had no rule, so the text rendered **visibly**
— which is why `rap-evo.css` duplicated it locally. Now in `main.css`, supporting both
`.visually-hidden` and `.u-visually-hidden`.

---

### Text Input

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Input: Text** `107:1034`, component `text-input`
(`132:3419`) — **Style** (Default · Warning · Destructive · Success) x **State** (7) x
**Size** (Large · Medium); 52 symbols (Read Only only under Style=Default). Width 282;
Large 76 = label 20 + gap 8 + field **48**; Medium 68 → field **40**.

**Ok** — heights 48/40 exact, radius 8, border 1px, default border `--gray-250` =
`#d9d9d9` exact, message 14px with `margin-top: 4px`.

**Mismatches — five values are off:**

| | Figma | CSS |
|---|---|---|
| horizontal padding | **16px** | `0 12px` |
| placeholder colour | `#757575` | `--gray-500` = **#616161** |
| warning border | `#dc6803` | `--apricot-500` = **#f79009** |
| destructive border | `#d92d20` | `--red-500` = **#f04438** (the designed value is `--red-600`, used only on hover) |
| leading-icon offset | 16 + 24 + 8 = **48px** | `has-leading` 40px / `:has(.left)` 32px |

**Gap** — `Loading` has no `.input--loading`; only a positioned `.input-wrapper .spinner`.

---

### Menu

⚠ **Largely unimplemented.** There is no `selection-menu`, `contextual-menu` or
`menu-item` class anywhere in `main.css`.

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Menu** `159:1025`. `selection-menu` (**270** wide,
`padding 8, gap 4, radius 16`, shadow only — no border), `contextual-menu` (270x300),
`.menu-item-selection` (6 states, 282x**44**; Selected **48**) and `.menu-item-action`
(**Leading Element**: None · Checkbox · Radio · Icon x 5 states = 20 variants). Item spec
`py 12, pl 16, pr 24`, `gap 12`, `radius 8`, label 14/20 **Medium 500**; Selected is
`#f5f5f5` bg + `#0058d2` label + a 24px checkmark. A mobile bottom-sheet variant exists.

The nearest stand-in is `.select-dropdown` / `.select-list` / `.select-option`, and it
diverges on nearly every value:

| | Figma | `.select-*` |
|---|---|---|
| container radius | **16px** | 8px |
| container width | fixed **270px** | `min-width: 100%` |
| container border | none (shadow only) | `1px solid` |
| item padding | `12px 24px 12px 16px` | `8px 10px` |
| item radius | 8px | 6px |
| selected | `#f5f5f5` + `#0058d2` + checkmark | `rgba(3,102,214,.08)`, no checkmark |
| list max-height | 276px | 220px |

**Gaps** — no contextual menu, no Leading Element axis (checkbox / radio / icon), no
Hover/Active/Focus/Disabled item states, no mobile bottom-sheet.

---

### Progress Tracker (Stepper)

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Progress Tracker** `267:6905`.
`progress-tracker-desktop` (Horizontal 996x24 / Vertical 28x996) and
`progress-tracker-mobile` (490x20), with `.step-desktop` / `.step-mobile` across
**Current · Completed · Incomplete · Blocked · Available**.

**Ok** — `max-width: 996px` matches the design exactly, which the design states plainly:
> *"On desktop, the stepper should not exceed a maximum width of 996px."*

Vertical variant present; Completed label underline correct.

**Mismatches:**

| | Figma | CSS |
|---|---|---|
| circle (desktop) | **24x24** | 22x22 |
| circle (mobile) | **20x20** | 18x18 |
| completed checkmark | 20px icon | inline SVG 12x10 |
| vertical connector | 1.5px | 2px (horizontal is 1.5px) |
| connector offset | centred on 24px circle | `top: 12px` on a 22px circle — 1px off-centre |

**Gap — the `Available` state is not implemented.** No `.progress-step--available`; its
underlined brand-blue label is designed but absent. `step-indicator-desktop` (1024x584)
is also entirely unimplemented.

⚠ **Broken token** — blocked uses `var(--danger-500, #da1e28)`; **`--danger-500` is
undefined**, so it renders `#da1e28` where the design says `#d92d20`.

---

### Segmented Controls

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Segmented Controls** `659:8188`.
`segmented-control` — **Segment Count** (2·3·4·5) x **Breakpoint** (Desktop · Mobile);
desktop 154/228/302/376 x **52**, mobile fixed **343x52**. `.segmented-control-item` —
**Mode** (On · Off) x **State** (Default · Hover · Focus), all **68x40**.

**Ok — several exact matches:** container `padding: 6px`, `gap: 6px`, radius full; item
`padding: 10px 16px` + `line-height: 20px` = **40px**; font 14px; hover `--gray-250`
`#d9d9d9`; selected bg `--gray-900` `#1e1e1e` on white. The separator (1px x 16px, hidden
on the selected item **and the one before it**) matches the design rule exactly.

**Mismatches:**

| | Figma | CSS |
|---|---|---|
| container bg | `#f1f1f1` | `--gray-100` = **#f5f5f5** |
| item min-width | **68px** | none — segments size to content, breaking equal widths |
| selected label weight | **500** | unset → 400 |
| selected shadow | `0 0 .25px rgba(0,0,0,.3), 0 1px 1.5px rgba(0,0,0,.16)` | none |
| separator position | `right: -1px` | `right: -3px` |

**Gap — truncation is unimplemented**, and the design is explicit:
> *"...if a longer label is unavoidable, truncate the text on the first line with an
> ellipsis."*

No `white-space` / `overflow` / `text-overflow` rule exists. **Fourth component with an
unimplemented truncation spec** (with Breadcrumb, Text Area, Date Input).

**Gap — mobile.** Figma has a fixed 343px mobile variant; CSS is `inline-flex` with no
343px or full-width rule.

**Undesigned extras:** `:disabled` (no Disabled state in Figma) and
`--small` / `--large` (Figma has **no Size axis**) — and both size modifiers reference
the **undefined** `--font-size-12` / `--font-size-16`.

---

### Text Area

```html
<textarea class="textarea" rows="4"></textarea>
<textarea class="textarea textarea--medium" rows="4"></textarea>
```

Base: `min-height: 150px`, `resize: vertical`, `line-height: 1.5`,
**`padding: 12px 16px !important`**, 16px text. States `--warning` · `--destructive` ·
`--success` · `--filled`, plus `:disabled` and `[readonly]` treatments.

⚠ **The base padding carries `!important`.** Any size or padding override must also use
`!important` or it silently loses.

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Text Area** `226:4439`. Component `text-area`:
**Style** (Default · Destructive) × **State** (Default · Hover · Focused · Filled ·
Disabled) × **Size** (**Large** · **Medium**). Instances are 384 wide x 186 tall
(178 disabled); the input area is 150px with a 17px `.scrollbar` and a `24/resize` handle.

**Ok — all five states and both styles exist in CSS**, including a readonly treatment
Figma does not document. `min-height: 150px` matches Figma's 150px input area exactly.

**Mismatch — sizes.** Figma ships **two** sizes; CSS shipped **none**. Now closed by
`.textarea--medium` (below).

**Mismatch — two guidance rules unimplemented**, quoted from the design:
> *"The top label should be truncated on the first line."*
> *"The assistive text should be truncated on the second line."*

Neither label nor assistive text has any truncation rule in CSS. Same gap as Breadcrumb.

**Note** — Figma shows a `24/resize` handle; CSS uses native `resize: vertical`, which is
the right call.

#### `.textarea--medium` — added 2026-09-03

Closes the missing size. Per instruction it takes its **text size and horizontal padding
from `.input--medium`**, so a textarea lines up beside a small input:

```css
.textarea--medium {
  font-size: var(--text-body-sm-font-size);    /* 14px - same as .input--medium */
  padding: var(--spacing-12, 12px) !important; /* 12px - same as .input horizontal */
}
```

Verified in-browser: base `12px 16px` / 16px text becomes **`12px` / 14px text**, against
`.input--medium`'s `0 12px` / 14px. `min-height` unchanged at 150px. Mirrored to
`Components/css/main.css`.

⚠ **These values are not from Figma.** Figma's Medium instances are the same 384x186 box
as Large, so Medium differs only in type/padding — which metadata does not expose. The
values come from the stated rule ("same padding and text size as the input"). If Figma's
Medium specifies otherwise, revisit.

---

### Date & Time Input

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Date / Time Input** `403:21765`. **Two** components,
each 20 variants — **Style** (Default · Destructive) x **State** (Default · Hover · Focus ·
Filled · Disabled) x **Size** (Large · Medium). Both are **282x76** Large / **282x68**
Medium; the component bundles its own label, so the field itself is **48** / **40**.

**Ok** — 48/40 match `.input` and `.input--medium`. The `DD/MM/YYYY` placeholder in
`Components/input-date.html` satisfies the documented format-hint rule.

**Mismatch — there is no dedicated component.** Date fields are assembled from the
generic `.input`. That is defensible, but note CSS ships `--warning` and `--success` for
it, which the design does not have.

**Gap — `time-input` is entirely unimplemented.** 20 designed variants, zero CSS, no
preview file.

**Gap — the interaction spec is unimplemented.** Quoted from the design:
> *"Automatically jump to the MM segment. Separator "/" should be auto-inserted after
> valid segment completion."*
> *"Allow backspace to erase or return to the previous segment."*
> *"The placeholder should be still visible while in focus and empty."*

The field is a plain `type="text"`; none of the segment behaviour exists. (Only the last
is partly served, by `.input:focus:placeholder-shown`.)

**Gap — truncation**, the same rule as Text Area and Breadcrumb:
> *"The top label should be truncated on the first line."*
> *"The assistive text should be truncated on the second line."*

⚠ **`.input-date` (`main.css:17942`) is dead code** — zero usages, and it contradicts
`.input` on three values: border **1.5px** vs `--border-width-1`, radius `--radius-md` vs
`--border-radius-8`, focus ring **2px** vs **4px**. Do not use it; prefer `.input`.

---

### Numeric Input

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Numeric Input** `3340:8279`. `numeric-input`
(`210:2265`) — 40 variants: **Style** (Default · Destructive · Success) x **State**
(Default · Hover · Focus · Loading · Filled · Read Only · Disabled) x **Size**
(Large 200x76 · Medium 200x68), i.e. field **48** / **40**.

**Ok** — `.input-number` is 48px; Destructive, Success, Loading
(`.input-wrapper-number.is-loading`), Filled and `[readonly]` all have rules. The clear
button is **20x20** in both.

**Mismatch — no Medium.** There is no `.input-number--medium`, and
`.input-wrapper--medium` (`:17586`) selects `.input` only — so it silently does nothing
for numeric markup. Half the designed matrix is unreachable.

**Mismatch — style axis.** Figma designs 3 styles; CSS ships 4. `--warning` is undesigned
for this component.

**Gap — the `.suffix` sub-component is unimplemented.** Figma defines Type (MDL **19x28** ·
Euro **13x28**); `grep suffix|prefix|MDL` over `main.css` returns nothing. Only a generic
`has-trailing` 40px padding reservation exists.

**Local unit suffix (2026-10-08)** — until the library ships `.suffix`, a unit inside an
`.e-permits-fo-input` is `<label class="e-permits-fo-input__suffix" for="<input id>"
aria-hidden="true">%</label>` after the input: fs-14 regular, tertiary when empty, secondary
once filled or focused (`:placeholder-shown`, so the input carries `placeholder="0"`), gap 4,
the value right-aligned next to it; clicking the unit focuses the field. Used by the tax
reduction (`#pay-percent`, `#pay-percent-<i>`, 88 wide in scenario rows). Reuse for MDL / m².

---

### Phone Input

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Phone Number Input** `3340:5684`.
`phone-number-input` (`3318:18166`) — **100 variants**: **Style** (Default · Warning ·
Destructive · Success) x **State** (7) x **Size** (Large 282x76 · Medium 282x68) x
**Type** (**Local · International**).

**Ok** — this is the one component where all four styles are *designed and implemented*
(`.input-number--warning/--destructive/--success` + default). Large 48px matches.

**Mismatch — no Medium** (same hole as Numeric).

**Gap — Type (Local vs International) is not modelled at all.** 50 of the 100 designed
variants have no code distinction, and the canonical `.input-number` path has no
dial-code trigger. The country picker (flag + name + dial code) has no CSS either.

⚠ **`.phone-field` (`main.css:17901`) is an off-system duplicate.** It reimplements the
component with **five hardcoded values** — `1px solid var(--gray-300)`, `--radius-6`,
`14px` font, `140px` width, flag **22x16** — against the project's no-hardcoding rule, and
its flag size contradicts the canonical `.input-icon--flag .fi` (**20x14**). Both families
appear in the same preview file. Prefer `.input-number` + `.input-icon--flag`.

---

### Select

Three distinct things:

**Native** — `<select class="select">` (not `class="input"`). Same box as `.input` plus a chevron background image.

**Custom** — root `.custom-select` with attributes, not classes:
```html
<div class="custom-select" data-select data-searchable="true" data-size="medium">
  <button class="select-control"><span class="select-value">…</span><span class="select-arrow"></span></button>
  <div class="select-dropdown">
    <div class="select-search-wrapper"><input class="select-search"><button class="select-clear"></button></div>
    <ul class="select-list"><li class="select-option">…</li></ul>
  </div>
</div>
```
Variants are attribute-driven: `[data-variant="destructive"]`, `[aria-disabled="true"]`.
Driven by `js/dropdown-select.js`.

**Menu primitive** — the app shell reuses `.select-dropdown` / `.select-list` /
`.select-option` on their own for dropdown menus, toggled with the `hidden` attribute.

**`.btn-caret` is not a dropdown trigger** — it is a cookie-banner-only absolutely
positioned circle (`top:32px; right:24px`).

---


#### Verified against Figma — 2026-09-03

Source: **Components** file, page `411:23995`, component `select-input` (`159:1112`) —
**Style** (Default · Destructive) x **State** (Default · Hover · Focus · Filled · Disabled)
x **Size** (Large 48 · Medium 40). Wrapper 282, padding-x **16** (L) / **12** (M),
radius 8, border 1px `#d9d9d9`, chevron 24 (L) / 20 (M). Menu drops **8px** below.

**Ok** — `--select-radius: 8px`, `--select-border: #D9D9D9`, and
`.select-dropdown { top: calc(100% + 8px) }` all match exactly. `.select` (native) is
48px with the right radius and border.

**Mismatches:**

| | Figma | CSS |
|---|---|---|
| Accent | `#0058d2` | **`#0366d6`** hardcoded |
| Border | `#d9d9d9` | `.custom-select` overrides `:root` to **`#d0d5db`** |
| Focus ring | `0 0 0 4px #ccdef6` (opaque) | `rgba(3,102,214,.12)` |
| Hover | 2px `#444` **border** | 1px `#444` **outline** |
| Destructive | `#d92d20` | `var(--color-danger-500, #ef4444)` — token **undefined** → renders `#ef4444` |
| Disabled | `#f1f1f1` bg, full opacity | `--gray-100` `#f5f5f5` + `opacity: .6` |
| Padding-x | 16 (L) / 12 (M) | 12 for all sizes |

🐞 **Bug — `main.css:15757`:** `.select-control:hover { border-color: var(--select-shadow) }`.
`--select-shadow` is a *box-shadow string*, invalid as a colour, so the declaration is
dropped and hover falls back to the outline only.

**Gaps** — `Filled` state; the label / mandatory-star / assistive-text composition; and
all three truncation rules (label, value, assistive text).

---

### Table

```html
<div class="table-responsive">
  <table class="table table--default">
    <thead><tr><th class="table__head-cell">Header</th></tr></thead>
    <tbody><tr class="table__row"><td class="table__body-cell">Cell</td></tr></tbody>
  </table>
</div>
```

Zebra and hover are applied to the **cell via the row**:
`.table__row:nth-child(even) .table__body-cell` and `.table__row:hover .table__body-cell`.
Styles `--default` (black head) · `--subtle` · `--strong` · `--white`.
Icon columns: `.table--leading-icon` / `.table--trailing-icon` / `.table--icon-only` / `.table--icon-none`, with `.table__icon--leading/--trailing`.

**Not implemented** (removed from this doc): `.table__head`, `.table--desktop`,
`.table__head-cell--sortable`, `.table__sort-icon`. `.table__sort-button` does exist.

No app screen uses `.table` — the registries use `.e-permits-workplace__table` and
`.rap-table`, which style bare `<th>`/`<td>`.

---

### Pagination

```html
<nav class="pagination">
  <span class="pagination__item"><a class="pagination__link pagination__link--disabled">←</a></span>
  <span class="pagination__item"><a class="pagination__link pagination__link--active">1</a></span>
</nav>
```

`.pagination__item` is required — `.pagination` sets `list-style:none` and the CSS assumes
a list. `--active` → `--blue-sky-600` bg, white text. `--disabled` → `opacity:.5; pointer-events:none`.
`--compact` → 32px, 12px. Also real: `.pagination__link--text`.

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Pagination** `144:4346`. Two components:
`pagination` (Breakpoint: Desktop 620×40 · Mobile 264×32) and `.pagination-item`
(**Breakpoint** Desktop 40×40 · Mobile 32×32 × **State** Default · Hover · Active ·
Focus × **Type** Unselected · Selected).

**✅ The responsive behaviour matches exactly.** Figma models Desktop/Mobile as a
breakpoint axis, and CSS does the same automatically —
`@media (max-width: 768px)` drops `.pagination__link` from **40×40 to 32×32** and the
font to 12px. `.pagination--compact` gives the same 32px sizing as a manual override.

**⚠ Mismatch 1 — "active" means two different things.** Figma has *both*
`Type=Selected` **and** `State=Active` (pressed). CSS has only
`.pagination__link--active`, which means **selected**, not pressed. There is **no
`:active` rule anywhere** in the pagination block. So the designed pressed state is
unimplemented, and the class name collides with the concept it does not implement.
When closing this, add `:active` for pressed and consider renaming
`--active` → `--selected`.

**⚠ Mismatch 2 — no overflow menu.** Figma pairs pagination with a `contextual-menu`
(64×300). CSS has nothing equivalent. Same gap as Breadcrumb's overflow menu.

---

---

### Accordion

```html
<div class="accordion">
  <div class="accordion__item">
    <h3 class="accordion__header">
      <button class="accordion__trigger" aria-expanded="false">
        <span class="accordion__heading">Question</span>
        <span class="accordion__supporting">Supporting text</span>
        <span class="accordion__icon"></span>
      </button>
    </h3>
    <div class="accordion__panel">Content</div>
  </div>
</div>
```

Open state is **attribute-driven**: `.accordion__trigger[aria-expanded="true"]` turns the
heading `--blue-sky-600` and rotates the icon 45°.
`.accordion__supporting` goes **inside** the trigger (which is `flex-direction: column`).

**`.accordion__panel-content` does not exist** — put content directly in `.accordion__panel`
(which already has `padding: var(--spacing-20)`). Its `--icon` / `--title` variants were
fictional too.

⚠ **`.accordion__icon` expects a text glyph, not an SVG.** It is
`font-size: 20px; line-height: 1`, absolutely positioned at `right: 12px`, and rotates
**45°** when expanded — i.e. a `+` that becomes a `×`. An empty `<span>` renders **0×0**
(measured). This is the one component that does *not* use the
`<svg class="icon"><use …>` convention from §0.4.

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Accordion** `670:5171`. Documented at two widths —
**996px** (desktop) and **343px** (narrow). Structure per `.accordion-item`:
`Container` → (`Title` + `Supporting Text`) + `button-text-circular` (48×48), then a
`🔄 Content Slot` holding `.accordion-content`, and a `separator` closing the group.

**✅ Desktop item height is an exact match** — Figma's item `Container` is **128px**, and
`.accordion__trigger` measures **128px** at ≥991px (padding `32px 40px 32px 0`, gap 12).
Title + Supporting Text maps cleanly to `.accordion__heading` + `.accordion__supporting`,
the content slot to `.accordion__panel`, and the expanded state is attribute-driven
(`[aria-expanded="true"]`) on both sides.

**⚠ Mismatch 1 — the toggle is a different affordance.** Figma places a **48×48
`button-text-circular`** at the right edge of the header. The CSS makes the *entire*
header one `.accordion__trigger` button with a decorative 20px glyph inside. Space
reserved differs accordingly: Figma leaves **60px** (48px button + 12px gap — its inner
container is 936px in a 996px frame), while CSS reserves `padding-right: 40px`.

Note the CSS behaviour is arguably the better interaction — a full-width hit area beats a
48px target. Worth a deliberate decision rather than silently converging on Figma.

**⚠ Mismatch 2 — narrow width is 9px short.** Figma's 343px variant has 110px items;
`.accordion__trigger` measures **101px** below 991px (padding `24px`, gap 8).

**⚠ Mismatch 3 — no closing separator.** Figma ends the accordion with a `separator`.
CSS puts `border-top` on **`.accordion__item`** *and* on `.accordion`, so there is a rule
above every item and above the group, but **nothing below the last item**. The two
`border-top`s also likely double up on the first item.

---

### Avatar

Sizes `--xs` 24 · `--sm` 32 · `--md` 40 · `--lg` 56 · `--xl` 72 (svg scales 16/20/20/24/24).
Types `--image` · `--initials` · `--icon`. Badges `--dot` (12px red, `top:-4px; right:2px`) ·
`--numbered` (`content: attr(data-count)`). Group with `.avatar-stack`.

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Avatar** `457:27266`. Sizes are labelled explicitly
in the spec: **24 · 32 · 40 · 48 · 72**, documented across three type rows.

**⚠ Mismatch 1 — `--lg` is the wrong size.** Figma's fourth step is **48px**; CSS
`.avatar--lg` is `var(--spacing-56)` = **56px**. Four of five sizes match exactly
(24/32/40/72); only this one is out, by 8px.

**⚠ Mismatch 2 — stack overlap.** Figma stacks 40px avatars at a **28px step**
(x = 0, 28, 56, 84) — a **12px** overlap. CSS uses `margin-left: calc(var(--spacing-8) * -1)`
= **8px** overlap, a 32px step. CSS also adds `border: 2px solid var(--white)` between
stacked avatars, which Figma's instances do not obviously carry.

---

### Bottom Sheet

Previously listed in the inventory as "no contract documented" — it is in fact fully
implemented.

```html
<div class="bottom-sheet" aria-hidden="true">
  <div class="bottom-sheet__overlay"></div>
  <div class="bottom-sheet__panel" tabindex="-1">
    <div class="bottom-sheet__handle"></div>
    <div class="bottom-sheet__header">
      <h2 class="bottom-sheet__header--title">Title</h2>
      <button class="bottom-sheet__close">×</button>
    </div>
    <div class="bottom-sheet__content">…</div>
  </div>
</div>
```

Open state is **attribute-driven**: `.bottom-sheet[aria-hidden="false"]` flips
`pointer-events`. Panel is `position: absolute; bottom: 0`, `border-radius: 16px 16px 0 0`
(squared below 768px), `transform: translateY(100%)` with a `.3s` transition. Overlay is
`rgba(18,18,18,.4)`. Handle is `44×4`, `--gray-250`, pill. Centre the header with
`.bottom-sheet__header:has(.center)`. List content: `.bottom-sheet__content--list` /
`--list-link`.

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Bottom Sheet** `430:25857`. Documented entirely on
iPhone frames (375×812) — this is a **mobile pattern**, though it lives in the web
Components file. Variants: `menu` · `contextual`; header styles `indicator-only` ·
`heading-left` · `heading-center` · `action-button`.

**✅ Structure matches** — indicator/handle, left- and centre-aligned headings
(`:has(.center)`), dimmed overlay, and rounded top corners are all present.

**⚠ Mismatch 1 — height should be dynamic.** Figma states: *"The height of the bottom
sheet should be dynamic, adjusting automatically to fit the content size inside, ensuring
an optimal layout without unnecessary empty space."* CSS sets
`min-height: 45vh` on `.bottom-sheet__panel`, which **forces** empty space for short
content — the exact outcome the spec rules out. (`max-height: 90vh` is fine.)

**⚠ Mismatch 2 — safe-area padding.** Figma: *"safe area padding of **20px** on both the
left and right sides."* CSS uses `padding: 12px 16px` on `__header` (16px, not 20px) and
`padding: 16px 0` on `__content` — **no horizontal padding at all** on the content area.

**Behaviours specified in Figma that CSS cannot express** (verify in JS): swipe-down to
dismiss; tap the dimmed background to dismiss; dismiss via an action inside the sheet;
and — the subtle one — when content scrolls, a swipe on the *content* scrolls it while
the same gesture on the *header/indicator* dismisses or expands the sheet.

---

### Breadcrumb

**Updated 2026-10-01 to Figma Components `232:5282`** (items `81:714` Enabled / `81:763`
Active). It is used on every page, and nothing else draws a trail.

```html
<nav class="breadcrumbs" aria-label="Navigare">
  <ol class="breadcrumbs__list">
    <li class="breadcrumbs__item"><a class="breadcrumbs__link" href="#">Level 1</a></li>
    <li class="breadcrumbs__item is-selected"><span class="breadcrumbs__current" aria-current="page">Active</span></li>
  </ol>
</nav>
```

- Levels: 14/20 regular, `--color-text-base-tertiary`. Each item draws a 16px
  chevron-right-small `::after`, gap 4 (list and item).
- Current: 14/20 **medium**, `--color-text-base-default`, no chevron.
- Hover (a / button link): brand text + underline. Focus: 2px white + 4px focus-ring
  shadow, radius 4. Visited = enabled (no magenta). A `<span class="breadcrumbs__link">`
  is plain text and has no hover.
- Modifiers:
  - `.breadcrumbs--trailing`: the last item keeps its chevron. Use it when the trail runs
    into a page title (RAP EVO, the form builder).
  - `.breadcrumbs--truncate`: levels are cut at 30ch with an ellipsis (back-office page
    header).
  - `.breadcrumbs--mobile` + `.breadcrumbs__item--back`: a 20px chevron-left-small and
    the previous level only.
- Leading icon: an `<svg class="icon">` inside the first link (16px).
- `button.breadcrumbs__link` is reset, for back handlers such as
  `data-rap-profile-back`.
- JS: `renderBreadcrumbs(crumbs, { trailing, truncate, label })` in `e-permits-shell.js`;
  `renderPageHeaderTop` uses it with `truncate`. A crumb with `attr` is a link.
- **Profile trail = menu section › registry › record.** `renderPageHeaderTop`
  prepends the side-menu group (`navSectionOf()`: the group of the menu item named by
  the first crumb, else of the active item) as plain text. For example: Administrare ›
  Configurări servicii › 003000023, or Locul de muncă › Dosarele mele › D-2026-004575.
- Deleted forks — never bring back: `.e-permits-page-header__breadcrumbs` overrides,
  `.e-permits-builder__breadcrumbs`, and the `.rap-breadcrumbs` visuals (that class is
  now only a layout/reveal hook).
- Still open from Figma `602:1933`: collapsing past 4 levels into an overflow menu, and
  the full-label tooltip on truncated levels.

> Third instance of the same class of bug: `--black-1000`/`--white-1000` (12 tokens,
> §8), the `--color-text-brand-default-hover` collapse on `.link`, and now
> `--brand-600`. **Audit custom-property references for undefined targets** — the
> failures are silent.

---

### Date field in app forms (added 2026-10-01)

Never `<input type="date">`. Use the **library date picker** inside the full-flow field shell:
`.e-permits-fo-field` > label > `.date-picker__field[data-date-picker][data-locale="ro"][data-selected=ISO]`
> `.e-permits-fo-input.e-permits-fo-input--with-action` (text input `.js-date-picker-input`,
placeholder `ZZ/LL/AAAA`, value `DD/MM/YYYY`; trigger `.e-permits-fo-input__icon-button.js-date-picker-toggle`
with `icon-calendar`, `aria-label="Alege data"`) + `.date-picker-panel` (library markup; weekdays L M M J V S D).
Reference renderer: `datePicker()` in the tariff drawer (`e-permits-shell.js`).
- `data-min="YYYY-MM-DD"` on the picker disables earlier days (today keeps its ring
  but reads disabled). Still validate typed dates.
- `js/input-date-picker.js` (library) exposes `window.GEAPDatePicker.init(root)` — call it after
  rendering pickers late (drawers, modals); pickers present at load are wired automatically.
- Picking a day fires a bubbling `change` on the input; the ISO value is on the picker's
  `data-selected` (typed `DD/MM/YYYY` is parsed on change too).
- The panel opens **upwards** (`.date-picker-panel.is-up`) when it would be clipped by a
  scrolling drawer/modal body or the viewport.
- In Figma: library `date-input` (Components, `4449e61e…`).

### Date Picker

Well implemented (46 rules) and previously undocumented. Trigger `.date-picker` +
`.date-picker__field`; popover `.date-picker-panel` (`position: absolute; top: calc(100% + 8px);
width: 320px; z-index: 1100`, hidden via the `hidden` attribute). Inside:
`__header` (+ `--advanced`), `__nav`, `__selects` / `__select-btn`, `__month`, `__grid`,
then `__weekdays` → `__weekday` and `__days` → `__day`. Day states include `.is-outside`
and `:disabled`. Separate text field: `.input-date` (+ `.is-warning` / `.is-destructive`).

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Date Picker** `470:32032`. Figma names the parts
`.day-label` / `.day-cell`; CSS calls them `__weekday` / `__day`. **Every dimension
matches:**

| | Figma | CSS |
|---|---|---|
| Panel width | 320 | `width: 320px` ✓ |
| Weekday row height | 32 | `height: 32px` ✓ |
| Day cell height | 40 | `height: 40px` ✓ |
| Day cell width (343 grid) | 49 | `repeat(7, minmax(0,1fr))` → 343/7 = **49** ✓ |
| Day cell width (296 grid) | 42.29 | same rule → 296/7 = **42.29** ✓ |

The fluid 7-column grid reproduces *both* documented widths automatically — the desktop
and narrow variants need no extra CSS. This is the cleanest design↔code agreement found
so far.

**⚠ Gap — the mobile presentation is unimplemented.** Figma documents the picker on
mobile inside a **bottom sheet** (375×420) with a 48×4 drag handle, a `.picker-header`
(40px), and an optional action-button footer (88px, holding a 343×48 filled button).
`.date-picker-panel` is `position: absolute` only — there is no bottom-sheet mode, and
nothing wires it to the existing `.bottom-sheet` component.

**Note** — `date-input` is 282×76 in Figma (field plus label/message), which is a
composed size rather than a single element; `.input-date` styles only the control.

---

### Cookie Banner

**Fully implemented** — `main.css:15947-16195`, **21 `.cookie-*` rules**.

`.cookie-overlay` (fixed, `rgba(0,0,0,.5)`, z-1050) → `.cookie-banner`
(`max-width: 792px`, `width: 86%`, `padding: 24px 40px`, fixed `bottom: 1rem`, centred,
`1.5px solid --gray-300`, radius 16, z-1060) → `.cookie-header` / `.cookie-title` /
`.cookie-description` / `.cookie-body` / `.cookie-buttons`. The expand/collapse is
`.cookie-detail-container` (`max-height: 0 → 1000px`, `.show`, `.35s`), with
`.cookie-permissions` holding the category rows. Under 768px the buttons stack
`column-reverse` and `.cookie-body` becomes a `50vh` scroll area with sticky fade edges
(`.cookie-scroll--top/--bottom`).

> **Correction (2026-09-03):** an earlier revision of this document called this component
> "shell only, just two rules". That was wrong — it came from grepping `^\.cookie-banner`
> (2 hits) instead of `^\.cookie` (21). The component is complete.

#### Verified against Figma — 2026-09-03

Source: **Components** file, pages **Cookie Banner** `616:7356` and `578:33212`.
Component `cookie-banner`: **Breakpoint** (Desktop · Mobile) x **State**
(Default · Extended) — Desktop **792x184** / **792x484**, Mobile **359x426** / **359x636**.
The design states the intent plainly:

> *"By default the cookie banner appears as a compact strip at the bottom... It is
> non-intrusive and does not block access to the underlying content."*
> *"When a user clicks 'Manage Cookies', the banner transitions into an extended view...
> Users can minimize it back to the compact version at any time."*

**Ok** — desktop `max-width: 792px` is exact. Default→Extended is a real animated
collapse, bottom-anchored and non-blocking, matching the guidance. The mobile scroll
region with fade edges corresponds to Figma's `.scrollbar` on the 520px content slot.

**Mismatches:**

| | Figma | CSS |
|---|---|---|
| Mobile width | **359px** (375 − 16, fixed 8px inset) | `85%` → 318.75px at 375 |
| Mobile radius | 16px | **8px** below 768 |
| Mobile header | `.modal-header` 68h + 32x32 close | none; `.btn-caret` at top 16 / right 16 |
| Mobile footer | `Footer` 84h, button 327x48 full-width | `padding-right: 8px` only |

⚠ **Hardcoded magic numbers** — `.cookie-allow-group { width: 414px }`,
`.cookie-confirm-btn { 229px }`, `.cookie-allow-btn { 201px }`, and
`.cookie-manage-btn { color: #121212; border-color: #121212 }`. None has a design source,
and the hex values violate the no-hardcoding rule. Figma does not size-lock these buttons.

**Useful confirmation** — Figma's switch here renders **48x28**, exactly the `.switch`
base. So `.switch--medium` (40x24) is the *smaller* variant, not the default.

---

### Sidebar · Spinner · Tooltip · Header · Footer

- **Sidebar** — `.sidebar__link--active` → brand-secondary bg + 3px left border. Collapse in
  the app is `is-collapsed` on the shell root, not a sidebar class.
  **`.sidebar--edge` is not "icon-only collapsed"** — it is an alias of `.sidebar--dashboard`
  (320px, borderless, radius 0, labels still visible).
- **Avatar** — `--xs` 24 · `--sm` 32 · `--md` 40 · `--lg` 56 · `--xl` 72; types `--image` /
  `--initials` / `--icon`; `--dot` / `--numbered` (`content: attr(data-count)`); `.avatar-stack`.
  No app screen uses it — every screen rolls its own avatar (see §4).
- **Spinner** — `--extra-small` 12 · `--small` 16 · `--medium` 26 · `--large` 34;
  `--brand` / `--dark` / `--light` / `--light-on-color`. ⚠ **Every size is wrong** —
  see below.

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Progress Indicator** `44:412`. Note the page contains
**only the spinner** — 16 variants, **Size** (Extra Small · Small · Medium · Large) ×
**Style** (Light · Light on Color · Dark · Brand).

**✅ All four styles map exactly** — Light / Light on Color / Dark / Brand ↔
`--light` / `--light-on-color` / `--dark` / `--brand`.

**⚠ All four sizes are wrong.** Not one matches:

| Size | Figma | CSS | |
|---|---|---|---|
| Extra Small | **16** | 12 | −4 |
| Small | **20** | 16 | −4 |
| Medium | **32** | 26 | −6 |
| Large | **40** | 34 | −6 |

The CSS ramp is uniformly undersized. Figma's is a clean 16/20/32/40 on the spacing
scale; the CSS uses `calc(var(--spacing-24) + 2px)` and `calc(var(--spacing-32) + 2px)`
for medium and large, which produces the odd 26/34. An earlier revision of this document
called Spinner "fully accurate" — that was true of its internal consistency, **not** of
its agreement with the design.

Figma also wraps each spinner in a container 4px larger on every side (24 / 28 / 40 / 48)
— useful if you need a consistent layout box.

**⚠ `.progress-tracker` has no design source here.** The stepper component
(`.progress-tracker`, `.progress-step--completed/--current/--blocked`) is *not* on this
page, despite the page's name. It is either undesigned or lives elsewhere — do not
assume this page covers it.
- **Breadcrumb** — see "Breadcrumb" above (Figma 232:5282). `--trailing`, `--truncate`,
  `--mobile` are real; **`.breadcrumbs--with-icon` does not exist** (an icon inside the link is enough).
- **Tooltip** — **no `data-tooltip` selector exists in CSS.** The component is
  `.tooltip` + `.tooltip-inner` + `.tooltip-arrow`, revealed with `.show`, positioned by
  `js/tooltip.js`, with 12 placement modifiers (`--top-left` … `--right-bottom`) and
  `--small` / `--large`. App screens instead use their own (`data-tooltip` read by
  `rap-evo.js`, `.e-permits-shell__collapse-tooltip` with
  `data-tooltip-expanded` / `data-tooltip-collapsed`).
- **Header** — static markup in `Components/header.html`, **not injected**.
  `.header__profile` is fictional; `.header__search` is used in HTML but has no CSS rule.
- **Footer** — `js/include-footer.js` genuinely injects `elements/footer.html` into
  `#site-footer`. Parts as previously documented, plus `__container`, `__heading`,
  `__description`, `__contact`, `__nav--list`, `__nav--link`, `__payments`, `__apps`, `__legal`.

### Link

Previously listed in the inventory with **no class contract at all**. The real component
is well-built — the closest design↔code match in the library.

```html
<a class="link link-primary link-md" href="#">Label</a>
<a class="link link-strict link-sm link-no-underline" href="#">Label</a>
```

Themed through private custom properties, so a variant only overrides three values:

```css
.link {
  --_link-color: …; --_link-hover: …; --_link-visited: …; --_link-underline: underline;
  display: inline-flex; gap: var(--spacing-4);
  text-decoration: var(--_link-underline); text-underline-offset: 0.15em;
}
```

| Size | font | | Style | resting colour |
|---|---|---|---|---|
| `.link-lg` | body-lg (18) | | `.link-primary` | `--color-link-primary-default` |
| `.link-md` | body-md (16) | | `.link-strict` | `--color-link-strict-default` |
| `.link-sm` | body-sm (14) | | `.link-white` | `var(--white)` |
| `.link-xs` | caption-md (12) | | | |

Underline: `.link-underline` / `.link-no-underline`.
States: `:hover` · `:visited` · `:focus-visible` (2px brand outline, offset 2, radius 4) ·
`[aria-disabled="true"]` / `:disabled` (`--color-text-disabled-default`, `pointer-events: none`).

**Touch targets** — `.link-target-pointer` (min-height 32, padding-inline 8) and
`.link-target-touch` (min-height 40, padding-inline 12). **This is the only component in
the library that implements target sizing**; use it as the pattern elsewhere.

#### Verified against Figma — 2026-09-03

Source: Components file, page `53:614`, component `link` (`53:621`) — **Style**
(Primary · White · Strict) × **Size** (12 Extra-small · 14 Small · 16 Medium · 18 Large)
× **State** (Default · Hover · Visited · Focus). All 48 combinations present.

**✅ Best match in the library.** Styles map exactly (Primary/Strict/White ↔
`.link-primary`/`.link-strict`/`.link-white`), all four sizes map exactly by value, and
every designed state exists in CSS. CSS additionally implements `disabled`, which Figma
does not design.

**⚠ Mismatch 1 — hover does nothing on primary links.**

```
--color-link-primary-default → --color-text-brand-default       → var(--blue-sky-600)
--color-link-primary-hover   → --color-text-brand-default-hover → var(--blue-sky-600)  ← same
```

Both resolve to `#0058d2`, so a primary link does **not** change colour on hover, while
Figma designs a distinct Hover for all 12 style×size combinations. By the brand ramp
(and matching `.btn-primary`), the hover token should almost certainly be
`--blue-sky-700` (`#0046a8`).

**Note** — Figma shows a `20/external-link` icon alongside the component, but there is
no `.link-external` class. Pair the link with `<svg class="icon medium">` +
`#icon-external-link` (the sprite has it) manually.

**⚠ Mismatch 2 — the base class uses the *hover* token as its resting colour.**
`.link` sets `--_link-color: var(--color-link-primary-hover)`, where `.link-primary`
correctly uses `--color-link-primary-default`. Harmless **only** because Mismatch 1
makes the two identical — it becomes a visible bug the moment the hover token is fixed.
**Fix both together, or not at all.**

**⚠ Mismatch 3 — visited may be dropped on two styles.** `.link-strict` sets
`--_link-visited` to its *default* colour, and `.link-white` uses white for all three
states — yet Figma defines distinct `Visited` variants for Strict and White. Either
those Figma variants are visually identical to Default (plausible) or the CSS drops
them. Needs a pixel check against Figma before changing anything.

**Note** — `--color-link-white-default` is defined but unused; `.link-white` hardcodes
`var(--white)` instead. That is a *workaround*: the token resolves to
`--color-text-base-inverse-default` → `var(--white-1000)`, one of the 12 undefined
primitives (§8). Fixing `--white-1000` would let `.link-white` use the token properly.

Primary visited resolves to `--magenta-600` (`#aa18ce`). Breadcrumbs no longer use
visited (Figma 232:5282).

---

### Separator

Previously missing from this document entirely, though it exists in both Figma and CSS.

```html
<hr class="separator separator--horizontal separator--thin separator--subtle">
<span class="separator separator--vertical separator--thin separator--mild"></span>
```

Driven by three custom properties on the base class, so it is themeable in place:

```css
.separator {
  --separator-color: var(--gray-300);
  --separator-thickness: var(--border-width-1);
  --separator-length: 100%;
  display: block; border: none;
  background-color: var(--separator-color);
}
```

**Orientation** (required — the base class alone has no dimensions):
`--horizontal` (width `--separator-length`, height `--separator-thickness`) ·
`--vertical` (swapped, `display: inline-block`).

| Thickness | value | | Style | colour |
|---|---|---|---|---|
| `--thin` | `--border-width-1` (1px) | | `--subtle` | `--gray-250` `#d9d9d9` |
| `--medium` | `--border-width-1-5` (1.5px) | | `--mild` | `--gray-300` `#b2b2b2` |
| `--thick` | `--border-width-2` (2px) | | `--strong` | `--gray-600` `#444444` |

Non-interactive: no hover/active/focus/disabled/error/success states apply, in either
Figma or CSS. Use `<hr>` for a semantic thematic break, or a `<span>`/`<div>` with
`role="separator"` for a purely decorative one.

#### Verified against Figma — 2026-09-03

Source: Components file, page `775:36317`, component `separator` (`775:36509`) —
**Thickness** (0.5 Extra Thin · 1 Thin · 1.5 Medium · 2 Thick) × **Style**
(Subtle · Mild · Strong), all 12 combinations present.

**✅ Style names match exactly** — Subtle / Mild / Strong ↔ `--subtle` / `--mild` /
`--strong`. Thin, Medium and Thick map 1:1 on both name and value.

**⚠ Mismatch — `Extra Thin` (0.5px) is not implemented.** Figma ships four thicknesses;
CSS ships three. There is also no `--border-width-0-5` token, though bare `0.5px`
appears 29 times in `main.css` (all in shadow definitions). Adding it would need both
the token and the modifier.

**Code exceeds design** — `--horizontal` / `--vertical` have no Figma counterpart
(Figma shows horizontal only). Harmless, and the vertical variant is genuinely useful.

**Token naming inconsistency worth noting:** Figma calls it `--border-width-1.5`
(dot); `main.css` defines `--border-width-1-5` (hyphen). Only the hyphen form resolves
in code.

---

### Tag

`.tag-item` is **`display:flex; gap:16px; align-items:center`** — a layout row, not a
visual pill. **There is no `.tag-group`.** For a visual pill use `.status-tag` or `.badge`.

---

## 4. Application component families

These are the vocabularies the screens are actually built from. Full class lists live in
the CSS; this section records the entry points and the JS contracts.


#### Verified against Figma — 2026-09-03

Source: **Components** file, page `22:17`. **Three** components: `tag-filled`
(**Type** Subtle/Strong x **Style** 6 x **Icon** x **Size** = 48 variants),
`tag-outlined` (24, no Type axis) and **`info-tag`** (4).
Medium **h24**, px8; Small **h20**, px6; radius 4; 14/20 Medium 500.

**Ok** — `.status-tag` models Type as `.is-subtle` / `.is-strong` / `.is-outlined` with
all six styles; radius 4; icon padding `3px 8px 3px 6px` (pl6/pr8) and `gap: 4px` exact;
small `padding: 2px 6px` exact; `neutral.is-subtle` `#f1f1f1`/`#121212` and
`success.is-strong` `#039855` exact.

**Mismatches:**

| | Figma | CSS |
|---|---|---|
| Medium height | **24** | ~**22** (`line-height: 1` on 14px + 4px padding) |
| Small height | **20** | ~**18** |
| Line-height | 20 (M) / 16 (S) | `1` / `1.167` |
| `neutral.is-strong` | `#1e1e1e` | `var(--black)` = **`#121212`** |
| Tag group gap | **8px** (explicit guidance) | `.tag-item { gap: 16px }` |
| Size ladder | {Small, Medium} | {`--small`, base, `--large`} — **names off by one** |

**Gap — `info-tag` is not implemented.** No `.info-tag` anywhere.
`.status-tag--info` is a *different thing* (a blue-sky colour style), not the
14/20-**Regular** `#757575` / `#383838` info tag with px2/px6 padding.

---

### `e-permits-fo-*` — front office (form flow)

| Family | Key classes | States | `data-*` |
|---|---|---|---|
| Field + input | `e-permits-fo-field` + `--span-4/6/8/12`, `__hint`, `e-permits-fo-input`, `__value` | `is-filled` `is-readonly` `is-disabled` | `data-fo-address-part` |
| Select | `e-permits-fo-select` + `--address/--preview`, `__button`, `__value`, `__list`, `__option` | `is-open` `is-open-up` `is-selected` `is-disabled` | `data-fo-select`, `data-fo-select-value`, `data-value` |
| Combobox | `e-permits-fo-caem` + `__menu/__search/__list/__option/__empty` | | `data-fo-caem*`, `data-code`, `data-label` |
| Multi-select | `e-permits-fo-subgen-select` + `__checkbox/__footer/__confirm` | | `data-fo-subgen*` |
| Phone | `e-permits-fo-phone` + `--editable/--readonly`, `__prefix`, `__code-list` | `is-filled` `is-selected` | `data-fo-phone-*`, `data-code`, `data-flag` |
| Radio | `e-permits-fo-radio-group` + `--contact`, `e-permits-fo-radio`, `__control` | | `data-fo-contact-person` |
| Consent checkbox | `e-permits-fo-consent`, `__box` | | `data-fo-consent` |
| Stepper | `e-permits-fo-stepper`, `__item`, `__connector`, `__number`, `__label` | `is-active` `is-completed` | `data-fo-step`, `data-fo-step-panel` |
| Documents | `e-permits-fo-doc-field`, `e-permits-fo-doc-modal` + `__drop-zone/__list/__panel`, `e-permits-fo-file-item` | `is-uploaded` `is-uploading` `is-empty` | `data-fo-doc-*` |
| Copy value | `e-permits-fo-copy-value` + `--static`, `__tooltip`, `__tooltip-default`, `__tooltip-copied` | `is-copied` (1500 ms) | `data-fo-copy-value` |
| Avatar menu | `e-permits-fo-avatar-menu__*` (~25 classes) | `is-open` `is-closing` `has-scroll` `is-scrolled` `is-selected` `is-expanded` | `data-fo-avatar-*` |
| Notices | `e-permits-fo-infobox`, `e-permits-fo-mnotify-info`, `e-permits-fo-notice--skeleton` | | |
| Skeletons | `e-permits-fo-skeleton` + `--input/--label/--notice-*` | | |

### `e-permits-shell__*` — back-office chrome

Topbar, header, brand, `__icon-button` (+ `--notification`, `__notification-dot`),
`__user-menu`, `__profile-menu`, `__role-card`, `__sidebar`, `__nav` (+ `--specialist` /
`--legacy`), `__nav-group` (+ `--workplace` / `--config`), `__nav-link`, `__nav-badge`,
`__collapse-button` (morphing SVG via `data-default-d` / `data-collapse-d` / `data-expand-d`).

Root states on `.e-permits-shell`: `is-collapsed`, `is-users-registry`,
`is-user-profile-open`, `is-dosar-profile-open`, `is-role-profile-open`, `is-user-create-open`.

Nav contract: `data-nav-item`, `data-workplace-view="mine|unassigned|office|print"`,
`data-workplace-badge`.

### `e-permits-page-header` — back-office detail header

Figma `8993:37914`. **Every** back-office detail page uses it: dosar, utilizator,
rol, act permisiv. Do not build another hero; render through the helpers in
`js/e-permits-shell.js`:

- `renderPageHeaderTop({ crumbs, title, actions?, caption? })`: breadcrumbs
  (last crumb = current; a crumb with `attr` becomes a link wired to that page's
  close handler, one without is plain text) over a 24/32 semibold title
  (`--color-text-base-secondary`, gap 8), plus optional actions and a 10/12 caption on the right.
- `renderPageHeaderMeta([[label, valueHtml], …])`: label 12/16 tertiary over value
  14/20 medium (row padding 12 top / 8 bottom), split by `.separator--vertical` (28px). Use `renderProfileCopyCode`
  for IDs and `renderTag` for status.
- `renderPageHeaderTabCount(count, tone?)`: 20px numbered badge; tone `warning`
  (accent `#fec84b`) or `danger`.

```html
<header class="e-permits-page-header">
  <div class="e-permits-page-header__body">
    <div class="e-permits-page-header__top" data-…-title></div>
    <div class="e-permits-page-header__meta" data-…-summary></div>
  </div>
  <div class="tabs e-permits-page-header__tabs">
    <div class="tab-buttons" role="tablist" data-…-tabs></div>
  </div>
</header>
```

Measured against Figma: 16px inset, top row 60, meta row 68, tabs 48 with no
inter-tab gap, 14/20 regular (active 500 brand + 2px). Actions are library `.btn`
+ `.btn-sm`, scoped to Figma's Small (32px, radius 6, 8px icon-side padding),
because `.btn-sm` alone renders 29px. Breadcrumb labels truncate at 30ch (Figma rule).
At ≤760px the top row stacks and the meta row becomes a two-column grid without
separators.

**Detail sections under the header** (Figma `8993:39453`): 20px below the tabs, a
1024 column of stacked sections. Use `renderInfoCard(title, rows)` →
`.e-permits-dosar-profil__section` > `__section-title` (48px, H5 18/26, optional
source tag `e-permits-workplace__tag--neutral` at gap 16) > `__card` (`--color-background-base-secondary` #f5f5f5, the same as the timeline; was a hardcoded #f7f7f7 until 2026-10-01,
radius 24, padding 8/20) > `__row` (40px including the divider; label 256 column
truncates with `title`, value at +300). Row values: plain text, copy-code, or the
library `.status-tag` (24px, `text-transform` reset): `--neutral.is-subtle` for
lists and for "✱ Obligatoriu" (asterisk icon `.e-permits-dosar-profil__required-icon`),
and bare `--success` + check icon for "✓ Da". Utilizator and rol keep their
`__property-card` markup, but it measures identically.

**Top bar height is a shell constant.** `.e-permits-shell` defines
`--e-permits-shell-topbar-height: 66px` (Figma sidebar header + Main Navigation);
the header, sidebar header, workspace grid and nav all read it, so the bar and the
role switcher never move between pages or roles. Page states (`is-*-open`,
`is-users-registry`) must not set their own header height. Registries without status
tabs leave `[data-workplace-tabs]` hidden/empty and the row collapses (the workplace
header grid is `56px auto`) — never reserve a fixed 48px tab band.

### Toast — Figma `toast` (9399:32597)

The **only** toast in the product. Library CSS `.toast` in `css/main.css` (mirror
kept identical); JS `js/toast.js`:

```js
GEAPToast.show({ type: "success", title: "Serviciu creat", message: "…",
                 link: { href, label }, duration: 4000, key: "dedupe-key" });
```

`type` info (brand) · success (`--green-600` — see token note) · warning · error
(`role="alert"`). `title` → Figma "w/ Heading" (18/26 semibold); omit it for
text-only. 350px, padding 12/12/16, radius 8, 24px icon in a 2px frame, 16px close,
link 16/24 underlined. Container top-right (desktop) / bottom (mobile), above
modals. Back office: `showShellToast(message, tone, title?)`; front office:
`showFrontOfficeToast`; RAP: its `showToast(message, type)` — all delegate here.
The old `.e-permits-shell-toast`, `.e-permits-fo-toast`, `.rap-toast` are removed.

### Pașaportul Serviciului — registry + profile (Feature 90575)

- **Rules:** `core/service-passport.js` (`GEAP.servicePassport`) — RSSP mapping and
  US-111 sync (validation, unavailable / not found / invalid, create vs update,
  authority create vs link, event log) and the payment lifecycle of Feature 93591.
  Pure, tested by `node test/service-passport.test.mjs`. The shell only renders.
- **Data:** `data/e-permits-services.json` — services (`rssp` read-only half,
  `geap` configured half), authorities, process flows, and the RSSP mock
  (`responses`, `unavailable`, `invalid` codes).
- **Registries** `kind: "services"` / `"authorities"` on the workplace engine
  (nav `shellView: "services-registry"` / `"authorities-registry"`). Status filter =
  status tabs with `svc:<Statut>` tokens. Toolbar primary action
  `[data-workplace-sync-service]` and per-row sync are Administrator central only.
- **Profile** reuses `.permits-profile` + `.e-permits-page-header` (10 tabs, deep link
  `#serviciu/<cod>/<tab>`) and the dosar stacked sections / `renderProfileTable`.
  RSSP sections carry an `RSSP` source tag and are never editable.
- **Dates** are written out (`formatLongDate` → "22 aprilie 2026"). In tables and
  detail rows use `renderDateTime(value, author?)`: the dosar list's
  `.e-permits-workplace__date-stack` with the time, then the author, as small
  `__date-meta` lines. One-line contexts (captions, labels) use `formatStamp`
  ("22 aprilie 2026, 14:00"). Date-only strings are read as local days.
- **Lists** are the stacked list `renderStackedList(title, groups)` →
  `.e-permits-stack` (Tailwind UI stacked-list rhythm in our tokens): grey group
  heading 14/24 semibold + count; rows 12px top/bottom (table-cell rhythm), dividers
  `--color-border-base-default` (as the detail-section rows), title 14/24 semibold + our
  status tags (gap 12), meta 12/20 tertiary with 2px dots in an 18px gap (dots are
  `::before`, `.is-row-start` from `syncStackMetaRows` drops them at line starts),
  right side = one visible action: constructive (Publică, Activează) = `.btn-secondary`
  (blue), others = `.btn-neutral` (both `.btn-sm` at the header's 32px Small size);
  destructive actions (Dezactivează, Șterge) go only in the menu, in red;
  + overflow menu = the post-process menu `.e-permits-fo-intent-menu` /
  `__item` (20px icon + label), trigger `more-vertical` at `icon small` in a 32px
  icon button (grey on hover / open); ↑↓ move, Esc / outside click close).
  Group by what the list is used for (request type, source, relation, recipient,
  day) — see `renderService*` in `js/e-permits-shell.js`. The grey stacked card
  stays for label/value details (Date generale, Setări).
- **Permisiuni** (user and role profiles, `renderPermissionsTab`) use the same
  stacked list: collapsible groups (`.e-permits-stack__group-toggle` in the grey
  heading, chevron, granted/total + pending ±tags), rows with state tags
  (Acordată / Se adaugă / Se retrage) and the original two toggles Adaugă /
  Retrage (`.e-permits-user-profile__perm-btn`, active = green / red); Salvează = primary,
  Renunță = neutral. Stack menus are handled document-wide. The search above the
  groups is the **full-flow suggestion search** — `.e-permits-fo-address-search` >
  `.e-permits-fo-input.e-permits-fo-input--with-action` (40px, trailing search icon) +
  `.e-permits-fo-address-search__list` options (`__option` / `__copy` / `__title` /
  `__meta`) with a library checkbox in the icon slot; empty = `.e-permits-fo-caem__empty`.
  Typing refreshes only the list (`syncPermSearchMenu`) — never re-render the panel
  per keystroke, it drops characters. Ticking an option patches it in place and swaps
  only the heading + groups (`patchPermissionsTab`) so the open list keeps its scroll
  and position. Esc clears; picking an option keeps focus.
- **Configurează tipul de solicitare** = a **wide drawer** (`[data-rt-drawer]`, the
  user-create drawer + `.e-permits-user-create--wide`, max 1120px), not a modal. A request
  type = flow + **one** electronic form + examination term (prefilled from the RSSP
  sub-service duration, editable) + the form each flow action opens.
  - General: three full-flow fields (Flux required, Formular electronic, Termen = number + unit).
  - Formulare pe acțiuni: filter chips with counts (Toate / Modificate / Cu formular /
    Fără formular, library `.chip` + `.chip__badge`), full-flow search, then a collapsible
    stacked list **grouped by step** (automatic branches tagged "Automat"). Each action has a
    full-flow dropdown whose first option is "Implicit · <default>"; an override shows a
    "Modificat" tag, the default underneath and a "Revino la implicit" text button. No
    pagination, no tables.
  - Rules live in `GEAP.servicePassport` (`actionForm`, `setActionForm`, `overrideCount`):
    overrides are stored only where they differ from the process default; overrides for
    actions not in the saved flow are dropped. Flows carry `steps[].actions[].defaultForm`;
    process forms are `processForms` in `data/e-permits-services.json`.
  - Flows exported from the process designer (`flows[].definitionUrl`, e.g.
    `data/flows/ProcesFluxSimplificatFaraSupervizor.json`) give the steps & actions via
    `stepsFromDefinition` (Human + Hybrid states, breadth-first; `formName` = default
    form; `next` = "Continuă"). The **diagram is not in this drawer** — it belongs to the
    Workflows item ("Fluxuri de lucru", not built yet); under Flux de procesare a library
    `.link` "Vezi schema fluxului în Fluxuri de lucru" points to `#flux/<id>` (new tab).
- **Dialogs** are library `.modal`: `#service-sync-modal`, `#service-confirm-modal`.
  Feedback via `showShellToast(message, "error")` for
  blocked actions — never the success tone.

### `e-permits-workplace__*` — registry / data grid

`__toolbar`, `__search`, `__status-tabs`, `__status-tab` (+ tone modifiers), `__table-wrap`,
`__table`, `__sort` (`is-asc` / `is-desc`), `__copy-code` (`is-copied`), `__tag` + tone,
`__flag`, `__person`, `__pagination-item` (`is-active`), `__pagination-action`, `__rows-select`.
Contracts: `data-workplace-*` (`row`, `sort`, `page`, `page-size`, `select-row`, `select-all`, `rows`, `head`, `range`, `tabs`, `total`).

Note it styles bare `<th>` / `<td>` — there are no cell classes.

### `e-permits-builder__*` — form builder

~110 classes and ~90 `data-builder-*` attributes; the largest family in the repo.
Entry points: `__workspace`, `__library`, `__stage`, `__canvas`, `__field` (`is-selected`),
`__field-tools`, `__inspector`, `__prop-panel` (`is-active`), `__step-chip`
(`is-active`, `has-trailing-icon`), `__tag` (+ `--strong/--outlined/--success/--warning`),
`__switch`, `__mini-check`. Mode switch: `data-builder-mode="build|preview|schema"`.

### `rap-*` and `cab-*` — the two standalone pages

| Concern | rap-evo | cabinet-evo |
|---|---|---|
| Status | `.rap-status--valid/--suspended/--expired/--withdrawn/--cancelled` | library `.status-tag` |
| Copy | `.rap-copy--id/--act/--masked`, `.rap-profile__copy` (`is-copied`, 1600 ms) | library `.e-permits-fo-copy-value` |
| Filter chip | `.rap-filter-chip` (`is-active`) + `__count` | library `.chip` + `.chip__badge--accent` |
| Filter surface | `.rap-filter-panel` (`is-open`, `is-drawer`) + `__scrim/__surface/__body/__footer` | — (none) |
| Options | `.rap-filter-option` (`is-checked`) + `__box/__label` | — |
| Table | `.rap-table` + `.rap-table__col--*` | `.cab-card` list |
| Empty state | `.rap-empty-state` + `__icon` (dashed box) | `.cab-empty` (bare `<p>`) |
| Pagination | `.rap-pagination`, `.rap-page-button` (`is-active`) | — |
| Tooltip / toast | `.rap-tooltip` (`is-visible`), `.rap-toast` | — |

`cabinet-evo` invents `.chip__badge--accent` (`--color-background-warning-accent`) on top
of the library chip. `rap-evo` uses **no design tokens at all** — see §8.


### Event log timeline — "Jurnal de evenimente" (added 2026-10-01)

Source: EVO Cabinet "Istoric complet" (Figma EVO-Cabinet `519:12410`). The same component
is used by all three BO event-log tabs: the service passport, the role profile and the
user profile. Render it only through `renderEventTimeline(title, events, { meta, empty })`
in `js/e-permits-shell.js`; CSS is in `css/e-permits-acte-permisive.css`.

```html
<section class="e-permits-dosar-profil__section">
  <div class="e-permits-dosar-profil__section-heading">
    <h2 class="e-permits-dosar-profil__section-title">Jurnal de evenimente</h2>
    <span class="e-permits-dosar-profil__section-meta">Jurnalizat prin MLog</span>
  </div>
  <ol class="e-permits-timeline">
    <li class="e-permits-timeline__item e-permits-timeline__item--success">
      <span class="e-permits-timeline__rail" aria-hidden="true">
        <span class="e-permits-timeline__marker"><svg class="icon">…#icon-circle-checkmark-filled</svg></span>
      </span>
      <div class="e-permits-timeline__content">
        <span class="e-permits-timeline__title">Publicare formular</span>
        <span class="e-permits-timeline__stamp"><time datetime="…">22 aprilie 2026, 14:00</time> · Vasile Schidu</span>
        <p class="e-permits-timeline__text">Cerere de notificare v2.1.0</p>
      </div>
    </li>
  </ol>
</section>
```

- **Card:** `background-base-secondary`, radius 24, padding 20, 6px between steps.
- **Step:** 20px marker (16px icon), then a 16px gap before the content. The rail is a
  1px `border-base-default` line down to the next step; the last step has none.
- **Text:**
  - Title: 14/20 Medium, `text-base-secondary`.
  - Stamp: 12/16, `text-base-tertiary`. Date-only values show just the day; the user,
    if any, follows after " · ".
  - Text: 14/20, `text-base-secondary`.
- **Tones (by event `status`):**
  - `Reușit`: `--success`, `circle-checkmark-filled`, `icon-positive-default`.
  - `Eșuat`: `--danger`, `circle-error-filled`, `icon-danger-default`, plus a danger tag
    after the title.
  - Anything else: `--pending`, `time-filled`, `icon-brand-default`.
- **Data:** an event is `{ at, user, type, status, detail }`, newest first. Roles and
  users have no audit data yet, so `roleEvents()` and `userEvents()` derive events from
  their dates.

### Service passport structure — Feature 90575 (updated 2026-10-07)

These are the tabs in `SERVICE_PROFILE_TABS`, in order:
1. Date generale
2. Tipuri solicitări
3. Formulare
4. **Documente** (Documente însoțitoare from RSSP — moved out of Date generale, 2026-10-07)
5. **Taxe**
6. Clasificatoare specifice
7. Șabloane
8. Notificări
9. Setări (the switches, then **Interdependențe** — no tab of its own since 2026-10-07;
   `#serviciu/<code>/dependencies` maps to `settings`)
10. Jurnal de evenimente

**Rule — no toast for self-evident actions (2026-10-08, from the user):** a switch, checkbox
or chip already shows its result on the spot — never confirm it with a toast in the corner.
Toasts are for results that are not visible where the user acted (a save / publish / export
/ duplicate / delete, an error that blocks the action). Removed: Setări switches, Documente
„Afișează” / „Obligatoriu”, the notification template's Activ switch.

**Documente tab (2026-10-08, US-225):** each RSSP document row: grey document icon · title ·
meta `RSSP` tag · „În RSSP: obligatoriu/opțional” (read-only) · „Nu apare în cerere” when
hidden; right side two **checkboxes, each in a small grey container**
(the **checkbox option component** `renderCheckOption()` — see the Checkbox section;
Figma: component set „Opțiune document · checkbox” `10507:44447` — State × Checked, props
Label + Asterisc) —
**„Afișează”** (Vizibilitatea: the applicant sees it in the request) and **„Obligatoriu”** +
the red star (`requiredMark()`) (Obligativitatea; disabled and off while hidden — a hidden
document is never required; hovering the disabled „Obligatoriu” explains it via
`data-tooltip-reason` on the container: „Bifează întâi „Afișează” — un document care nu apare
în cerere nu poate fi obligatoriu.”). Switches were tried first and replaced (user). „Modificat în GEAP” (brand) when anything differs from RSSP.
Section meta: N documente · X obligatorii · Y ascunse. Overrides `geap.documentVisible` /
`geap.documentRequired` by title, go into the service draft (no toast). Demo `svc-06a`,
`svc-06b` (hidden). Figma: blocks 06 (default), 06b (hidden + library tooltip on the disabled
Obligatoriu, header pending), 06c (hover), 01i list updated; block 10a (switch toast) deleted —
the Setări flow goes 10 → 10b directly.

**Rule — the button that opened something keeps its focus ring (2026-10-08, from the user,
every button in the system):** while a button's menu, dropdown, side panel or preview is
open, the button shows its pressed fill **plus the focus ring** (2px
`--color-background-base-default` + 5px `--focus-ring`), so it is obvious which button opened
it. Mechanism: the button carries `aria-expanded="true"` (openers, with `aria-controls`) or
`aria-pressed="true"` (toggles) — the global rule `.btn[aria-expanded="true"],
.btn[aria-pressed="true"]` in `css/e-permits-shell.css` draws the ring; never a custom
`is-active` class. Every new opener must set and clear `aria-expanded`. Figma: the trigger
of an open menu / panel uses State=Focus.

**Rule — Figma comments (2026-10-08, from the user):** a Figma comment is answered
„✅ Rezolvat” **only after the change is in Figma** (the frame edited or created), never when
it is only in code. Each reply links the comment and the Figma frame(s) changed. If something
is done in code but not yet in Figma, reply „În cod — urmează în Figma” and come back to it.

**Scheduled publication (service, 2026-10-08)** — publish modal „Intră în vigoare”:
Imediat | La o dată anume (date ≥ tomorrow, required; subtitle „intră în vigoare pe …” /
„… la data aleasă”). After a scheduled publish (pattern: Contentful / ibexa — one schedule
at a time, the schedule replaces the publish action):
- header: `btn-secondary btn-sm` **„Programat · DD/MM/YYYY”** (leading clock icon only — the library button has no
  leading + trailing variant; `aria-haspopup="menu"` carries the menu) in place
  of Publică → stack-menu `#service-schedule-menu`: Reprogramează (calendar-edit) · Publică
  acum (cloud-upload) · Anulează programarea (calendar-remove, `is-danger`);
- caption „vX intră în vigoare pe …”; meta Versiune and Istoric „curentă” = the version
  **in force** (`serviceVersionInForce`), the scheduled one is „programată pentru …” + Programat;
- Reprogramează = the publish modal in reschedule mode (no Imediat/La o dată choice, date and
  comment prefilled, button „Reprogramează”); Publică acum / Anulează programarea confirm
  first (`askConfirm`; cancel's dismiss = „Păstrează programarea”, never two „Anulează”).
  Cancel → the changes return to „nepublicate”;
- new changes while scheduled: Publică shows again; that publication replaces the schedule
  (info banner in the modal, same version number, changes merged).
Demo: `svc-01f1` (date), `svc-01f2` (date missing), `svc-01h1` (Istoric), `svc-01j` (menu),
`svc-01j1` (reprogramează), `svc-01j2` (publică acum), `svc-01j3` (anulează).

**Modals — scroll edges (2026-10-08):** while `.modal-content` scrolls, a 1px
`--color-border-base-default` line appears under the header (content scrolled up out of
view) and above the footer (more content below) — `.modal.has-scroll-above / .has-scroll-below`
set by `syncModalScrollEdges()` in `js/e-permits-shell.js`; borders are always present but
transparent, so nothing shifts. Figma: show the line on modal screens whose content scrolls.

**Rule — Figma changes cover the whole column (2026-10-08, from the user):** a change to a
screen (a tab moved, a header/stepper/field changed) is applied to **every block in that
column and every other block that shows the same UI**, not only the top screen. Find them
by searching the whole file (all pages) for the old element/text, fix all, then **verify**:
- re-run the search → 0 stale hits (e.g. every service tab row = the code's tab list);
- vertical check per column: blocks sorted by y, gap ≥ 40, no overlaps; when a block grows,
  shift every block below it in the column by the same delta; plus a no-overlap check
  between all blocks of the page;
- screenshot the changed screens.

**Figma flow arrows (2026-10-08, from the user):** one object per flow, elbow shape, no two
arrows on the same line. Figma connectors cannot be routed (every elbow from a screen takes the
same vertical), curved was too messy and two joined connectors were rejected — so side flows
are a **group „Flow · <action>”** = one VECTOR path (start at the clicked element's edge →
horizontal to its lane → vertical → into the target block's RIGHT/LEFT edge, corner radius 24,
3px `--color-border-brand` stroke, ARROW_LINES end cap) + a white „label” chip (Onest Medium 14,
brand text) centred on the vertical run. Lanes: 120px apart, first lane 64px from the column,
interval colouring per gap (arrows whose vertical runs overlap get different lanes); the gap
between columns = 64 + lanes × 120 + 260. Straight-down flows between consecutive blocks stay
ELBOWED connectors BOTTOM → TOP. Vectors do not follow moved blocks: when a block moves,
rebuild the arrow paths (script: recompute lanes from the groups, move columns, re-set the
vector network). Verify: no block overlap and no lane passing through a block.

**Page header component (Main Navigation `9442:44686`)** — it had been deleted from the
canvas (instances kept working but no edit reached them); restored on ↳ BO -> Servicii next
to the local components. Props: `Modificări nepublicate`, `Programat` (shows „btn ·
Programat”, Secondary + clock), `Buton Publică` (hide it when Programat). Per instance set
Caption / Version texts. Scheduled-publication blocks: 01f1, 01f2, 01h1, 01j, 01j1–01j3
(Modal instances with content components „Modal conținut / S01f1 …”).

**Figma — previews and the Formulare ⋮ (2026-10-08):** local components in frame
„Componente · Previzualizare” (`10484:39818`, page ↳ BO -> Servicii):
- **„Panou previzualizare”** (`10488:205014`) — variants Tip=Document / Document îngust (A4
  scaled 512/794 for the 560px panel) / E-mail / Mobil; text props Titlu, Subtitlu. Built
  from the code capture (A4 = `.e-permits-dtpl__page`, notification card =
  `.e-permits-ntpl-preview`, library segmented control). Placed absolute in the screen, 16px
  from the edges and from the drawer.
- **„Drawer · Previzualizare șablon”** (`10488:205077`) — the 880px Șabloane preview drawer
  (footer Închide · Deschide constructorul), inside the overlay next to the scrim.
- Blocks: 02a5 documents 1920 · 02a6 e-mail · 02a7 mobil · 02a8 at 1440 (drawer 848) ·
  02a9 < 1232 (full-screen panel over the dimmed drawer) · 08l Șabloane preview ·
  03b–03g the Formulare ⋮ items (03b inset builder preview with `.step-desktop` Vertical,
  03c Modal + „Modal conținut / S03c”, 03d–03g toasts / confirmation). The opener keeps
  State=Focus; the previewed row has the brand-secondary fill.
- Every flow from a menu item / eye has its own arrow (vector path in its own lane; the
  routing script re-lanes all arrows, widens the gaps and moves the columns).
- When replacing a drawer inside an „Overlay” frame, keep its `user-create__scrim` (08l lost it once).

**Stepper (Figma) = local component „Stepper · drawer” (`10421:197819`, page ↳ BO ->
Servicii)** — strip (padding 16/20, bottom border) with 4 `.step-desktop` instances
(Horizontal). Per use: set each step's Step Label + State (Completed / Current /
Incomplete), hide unused steps; width FILL. Every wizard drawer (clasificator nou, tarif
nou, șablon nou, …) uses it — never a frame-built strip. Code: `renderStepStrip`.

**Feedback round 2026-10-07 (A. Pascalov, Figma comments on Profile Serviciu):**
- **Tab count badge:** grey = all good. Yellow (`--warning`) only when something blocks
  the service — today, a request type **without a flow**. The tab then carries
  `data-tooltip-reason` saying what. „Fără formular” is a grey tag (`requestTypeState`
  tone `neutral`): a request without an electronic form is not blocked.
- **Section heading action:** `renderStackedList(title, groups, { meta, actionHtml })` puts
  meta + action together in `.e-permits-passport__heading-tools` (right side). Add buttons
  are `btn btn-secondary btn-sm` with `icon-plus-large`, like „Atașează șablon”.
- **Tipuri solicitări:** „Adaugă tip solicitare” is a stack-menu button
  (`data-stack-menu-trigger`, menu `#passport-add-rt-menu`) listing the eligible
  post-processes (`RT_POST_PROCESS_TYPES`) the service does not have yet, matched by
  stem (`rtStem`: „Suspendare” = „Suspendarea valabilității”). Picking one adds a
  `source: "GEAP"` type and opens its drawer. GEAP types get a ⋮ with Elimină
  (`askConfirm`); RSSP types cannot be removed.
- **Formulare:** one flat list (no grouping by request type — a form can serve several
  at once). `meta2` = „Folosit în” + neutral tags of the request types whose `rt.form`
  is this form (the mapping is made in the request type), or a muted „niciun tip de
  solicitare”. Heading: „Adaugă formular”. ⋮ menu: Previzualizează · Duplică · Versiuni ·
  Exportă setări (JSON) · Elimină (danger; refused with an error toast while the form is
  used).
- **Adaugă tip de solicitare — steps, not tabs** (2026-10-07): picking a post-process from
  „Adaugă tip solicitare” opens the same drawer in create mode — the step strip
  `[data-rt-steps]` (`renderStepStrip`, as Tarif nou / Clasificator nou) with
  General → Formulare → Documente generate → Notificări (`RT_CREATE_STEPS`; Taxe has nothing
  yet for a new type). Footer: Anulează · Continuă → Înapoi · Continuă → Înapoi · „Adaugă tipul”;
  caption „Pasul n din 4 · …”. Continuă from General checks flux + termen. The type is held in
  `rtDraft.pending` and pushed to the service only on „Adaugă tipul” (Anulează leaves nothing).
- **Configurează tipul de solicitare (02a) — 960px wide (`--wide`, was 1120; 2026-10-08) — tabs** (too much to scroll in one view):
  General · Formulare · Documente generate · Notificări · Taxe (`RT_DRAWER_TABS`,
  `rtDraft.tab`). Same tab row as the tariff edit drawer: `.tabs.tabs--sm.e-permits-tariff__tabs`
  + `.e-permits-tariff__panel` (`data-rt-tab`). Save with a missing flow / bad term jumps
  back to General to show the error.
- **Drawer tabs are sticky** (2026-10-08): `.e-permits-user-create__body >
  .e-permits-tariff__tabs` is `position: sticky; top: -var(--spacing-8)` (cancels the body's
  top padding) on `--color-background-base-default`, z-index 2 — only the panel scrolls.
  Applies to every drawer with this tab row (request type, tariff edit).
- **Their content:** Formulare = which **form (screen)** each flow action opens for the
  specialist (US-224; e.g. „Suspendare” → SuspendareTermen); **Documente generate** and
  **Notificări** = per-step override rows (see „Document icons + per-step output rows”);
  **Taxe** = read-only rows grouped by flow moment, pointing to Taxe și tarife. Every
  „Implicit · …” option has `value="default"` so it renders as a value, not a placeholder.
- **Șabloane de tipar rows:** no MDocs/PDF tag (every template is a PDF from MDocs; the
  list note says so). Meta: code tag · type · version · edited; `meta2` = „Generat la” +
  request-type tags (`dtplRequestTypes`; until a type is saved, the first one issues all).
- **Documente tab:** the bordered stacked list (`renderStackedList`), not grey tiles. Each
  row: the full flow's grey filled document icon (`assets/icons/document-uploaded.svg`,
  24px, `.e-permits-fo-lib-item__icon`) via `renderStackItem({ leadHtml })` (row gets
  `.has-lead`), title, meta `RSSP` tag · „În RSSP: obligatoriu/opțional”, and on the right
  the „Afișează” + „Obligatoriu” switches (see „Documente tab (2026-10-08, US-225)”).
- **„N modificări nepublicate” is clickable everywhere** (service header, template builder):
  `renderHeaderStatus(text, "warning", 'data-… aria-haspopup="dialog" title="Vezi modificările"')`
  opens `#pending-changes-modal` (`openPendingChanges({ subject, changes, publishLabel, onPublish })`):
  stacked groups Adăugat (success) / Modificat (brand) / Eliminat (danger), each row
  area · detail · when · who; footer Închide + Publică (continues to the publish modal).
- **Side drawers (`.e-permits-user-create`) — header / footer (2026-10-07):** the footer is
  compact like the header — padding 12 / 20 (12 / 16 under 760px) — with a 1px
  `--color-border-base-default` **top border, no shadow** (the hairline shadow vanished
  where a white field scrolled under it), `position: relative; z-index: 2`. Tabs placed
  straight under the header drop their own top border (`.e-permits-user-create__body >
  .e-permits-tariff__tabs:first-child`) so there is one line, not two; under a status strip
  they keep it.
- **Tab row overflow — Figma (2026-10-08):** local component set **„Tabs · overflow edge”**
  (`10452:6511`, page ↳ BO -> Application Shell): Side=End / Start = 80×40 fade (transparent →
  `background/base/default`) + library button Neutral · Small · Icon=Only (20/chevron-right /
  -left). Screens 03 / 03a / 03b (1440px: start / middle / end) in section „03 · Taburi lungi”:
  the header's own tab row is hidden and a clipped strip of the same tab instances, shifted
  by the scroll offset, carries the edge instances.
- **Tab row overflow:** `.e-permits-page-header__tabs-scroll` wraps the passport tabs; the
  faded edge (existing mask) gets a `btn btn-neutral btn-sm btn-icon-only`
  chevron (`.e-permits-page-header__tabs-arrow--start/--end`, `data-passport-tabs-scroll`)
  shown only while that side overflows (`syncPassportTabOverflow`); a click scrolls 60%.

- **Taxe și tarife** (`fees`) is the only money tab (revised 2026-10-02 — the separate Tarife tab
  confused: a tax is computed *from* a tariff). Old `#serviciu/<code>/payments` and
  `…/tariffs` links map to `fees` (`normalizePassportTab`).
  - **Taxe** opens with the model note, "Sumar taxe" (see below), then the taxes
    (`renderServicePayments`).
- **Sumar taxe** (`.e-permits-fee-summary`), revised 2026-10-01, reuses the **stacked-list
  group** pattern (the "Emitere primară" header):
  - Each figure is one `.e-permits-stack` with an `h3.e-permits-stack__group-label`
    (the name plus the `badge badge--lg badge--solid-light` count), then
    `.e-permits-stack__item` rows: `__name` (14/20, secondary) on the left, `__value`
    (14/20 Medium) on the right.
  - Grid: 4 columns, 2 below 900px, 24px gap, `align-items: start`. A value is held to one
    20px line, so IBAN rows match the plain-number rows.
  - **Taxe** breaks down into Active / De configurat, **Tarife** into Din RSSP / eAPL /
    Adăugate manual — two rows each, so all three groups line up.
    **Conturi bancare** (`--wide`, 2 columns) lists each account name with its IBAN in
    `renderProfileCopyCode`.
  - Each header starts with a gray 20px icon (`.icon.medium.e-permits-fee-summary__icon`,
    `icon-base-tertiary`): Taxe `receipt-bill`, Tarife `coins`, Conturi bancare
    `credit-card`.
  - Build them with `renderFeeGroup({ label, icon, count, rows, wide })`.
  - No stat cards: the earlier stat-card and stats-strip versions are gone.
- **Date generale** blocks, in order:
  1. **Date din RSSP**: `renderPassportBlock`, a section heading with a "Sincronizat"
     tag, then `.e-permits-passport__heading-tools` (last-sync caption plus an admin-only
     "Resincronizează" `btn-neutral btn-sm`).
  2. **Obiecte configurate în GEAP**: rows end with a `passportTabLink` (library
     `link link-primary link-sm` with `data-passport-tab`) in
     `.e-permits-passport__row-link`.
  3. **Ultimele modificări**: the first 3 events, via `renderEventTimeline` with the
     `actionHtml` link "Vezi tot jurnalul".
  4. **Servicii guvernamentale conectate**: MConnect, MPay and MSign, each with a
     "Conectat"/"Neutilizat" tag and an `.e-permits-passport__row-note`.
  5. The rest of the RSSP record (descriere, subservicii, valabilitate, date locale).
     Documente însoțitoare have their own tab; the „Obiecte configurate” row links there.
- **List:** the columns read "Act permisiv" and "Instituția". The toolbar button is
  "Creează serviciu nou" (it opens the RSSP import modal titled "Creează serviciu nou din
  RSSP"). The per-row actions stay Sincronizare and Actualizare.

### Dosar process actions — case profile header (added 2026-10-01)

Source: "Case (Dosar) logic and actions" plus Figma `6675:158399`. The engine is
`core/case-flow.js`, pure and unit-tested in `test/case-flow.test.mjs`. It holds both
flows (Complex, Simplified), and node ids stay local to each.

- **State:**
  - `row.flowState` holds `{ flowId, stateId, suspended, decision, vars, visited, log }`.
  - `statusId` (5 values) is always derived, never stored.
  - Decision and server nodes are auto-resolved; a case only rests on a human or
    terminal node.
- **Header button:** the library `btn btn-primary btn-md` (blue, medium) labelled with the current
  step's **US name**, plus a chevron. It opens the **stack-menu** (`data-stack-menu-trigger`,
  `.e-permits-stack__menu.e-permits-case-actions__menu`). The page-header caption reads
  "Responsabil: <lane>".
- **Menu items** (`.e-permits-case-actions__item`): an icon plus `__copy`, which holds
  `__label` and a 12/16 `__hint` (where the action leads, or why it is blocked).
  - Order: advance, then branch, then return, then a separator, then operations.
  - `__note` explains when the role cannot act ("Acest pas aparține rolului X…").
  - The menu always ends with "Vezi fluxul".
  - Blocked actions stay visible with `aria-disabled="true"`; never use `disabled`.
- **Rules:**
  - Lane gating, plus role bans (`ROLE_BANS`).
  - "Dosar examinat" is blocked by pending fees, active reviews or suspension.
  - No "Suspendare termen" while the case is suspended.
  - Operations ("Taxă de examinare", "Avize interinstituționale") do not move the case.
- **Forms** open in the simple library modal `#case-action-modal` (`modal--md`, header
  plus `modal-content` plus a `modal-buttons` footer). They are short forms, so no
  drawer. The right drawer `[data-case-drawer]` is only for "Vezi fluxul". The fields
  are the full-flow fields, the library date picker, segmented control and checkbox
  (the fee row is the label).
  - While a date picker is open, the modal lets its panel overflow
    (`.e-permits-case-modal:has(.date-picker__field.is-open)`).
  - Operations get verb buttons: "Adaugă taxele", "Solicită avizul". Each form uses the current step's form if it has one, else the target step's.
  - Documented: distribuire (US-114), taxa (US-117), nota (US-156, read-only), act
    (US-120), respingere (US-121).
  - Deduced, and shown with a warning banner until the PO confirms: suspendare
    (US-126/127), aviz (US-119).
- **Demo stand-ins**, tagged "Demo" in the menu:
  - Asistent tehnic step, MPay payment
  - "Simulează achitarea taxelor", "Simulează răspunsul la avize"
  - "Reia examinarea" (the info-supplement sub-process)
- **Tabs (§10):**
  - Taxe, Avize and Act/Decizie show only when they have content.
  - Expert sees only Avize; Specialist ghișeu sees only Date generale and Detalii
    solicitare.
  - New tab: **Jurnalul activităților** (`renderEventTimeline` over `flowState.log`).
- **"Vezi fluxul":** the guard variables plus the human steps on the timeline:
  visited = check, current = clock, not reached = the `--upcoming` ring.
- **Roles:** a Director assignment (`ansp-director-chisinau`) was added for the signing
  steps.

### Dosar profile tabs — stacked lists (updated 2026-10-01)

The case tabs use the same layout as the service passport: a section heading with a
short meta, then `renderStackedList` groups (stack group header plus count badge, rows
of title, status tags, a dot-separated meta line and an optional right-side action).
The old `renderProfileTable` / `renderProfileDocList` helpers are removed.

| Tab | Groups | Row |
|---|---|---|
| Taxe și plăți | În așteptare · Achitate | name, Neachitat/Achitat tag · **amount**, MPAY id (copy), issued, due date (+ days left) or paid date. Meta: "Total … · achitat …" |
| Avize | Active · Termen depășit · Finalizate | institution, status tag · id (copy), requested, deadline, result |
| Act/Decizie | — | title, Aprobare/Respingere tag · issued, source · "Vezi documentul" |
| Documente generate | — | name, file-type tag · issued, author · "Vezi documentul" |
| Notificări | by channel (Email, MNotify) | event, Livrată/Livrare eșuată tag · recipient, sent at |

### Passport Notificări — service notification templates, US-187 (added 2026-10-01)

- **Data:**
  - `servicesStore.notificationTemplates` holds the **system** templates, the only
    clone sources.
  - `service.geap.notificationTemplates` holds the service's own templates (the old
    `geap.notifications` list is gone).
  - Template fields: `{ code, name, dataSource, priority, description,
    rules: [{ recipient, channels }], texts: { ro|ru|en: { subject, body } }, active,
    source, createdAt, createdBy }`.
- **List** (`renderServiceNotifications`):
  - Section title "Șabloane de notificare", then the `.e-permits-pay__toolbar` with a
    meta line and, for the central admin only, "Clonează" (`btn-neutral btn-sm`, icon
    copy) and "Șablon nou" (`btn-secondary btn-sm`, icon plus-large).
  - Rows are stack items: Denumire, an Activ/Inactiv tag · Cod tag, "Obiect: …", rules
    summary · "Deschide".
  - Empty state: "Serviciul nu are încă șabloane proprii de notificare." The buttons
    stay.
- **Clone** (`#ntpl-clone-modal`, library `modal--md`):
  - Fields: Șablonul sursă (fo-select), Cod and Denumire. Picking a source fills Cod and
    Denumire; both stay editable.
  - The code must be unique in the service (case-insensitive).
  - The copy keeps texts and rules and starts Inactiv. It opens the detail on Texte.
- **New** (`[data-ntpl-drawer]`, right drawer):
  - Fields: Cod, Denumire, Sursa de date (Dosar · Plată · Act permisiv · Aviz),
    Prioritate (segmented Normală · Înaltă), Descriere, then content per language
    (segmented RO · RU · EN switching Obiect + Text).
  - It starts Inactiv with no rules.
- **Detail** (in the tab):
  - A "← Șabloane de notificare" `btn-neutral btn-sm` returns to this tab, not to a
    global list.
  - Then the title, an Activ/Inactiv tag and the code, an info banner while inactive,
    and a segmented control: Texte (one passport section per language) · Reguli de
    destinatari (stack rows) · Detalii.
  - Editing and activation are US-184.
- Each form uses its own id prefix (`ntpl-clone-*`, `ntpl-new-*`), so labels never
  point at a hidden duplicate.
- **Global registry** (Administrare › Șabloane de notificare, central admin;
  `shellView: "ntpl-registry"`, nav icon `notification.svg` mask):
  - A read-only workplace table of the system templates (`buildNtplDb`, kind `ntpl`).
    Columns: Cod tag, Denumire, Obiect, Sursa de date, Destinatari, Clonat în (number
    of services), Stare.
  - A row opens the **template profile** (see below).
  - Revised columns: Cod (copy code plus "Sursă: Sistem | Personalizat", the template's
    origin), Denumire (fill), Obiect (Dosar · Notificare · Plată · Act permisiv ·
    Utilizator), Reguli (count), Versiune, Actualizat (date stack), Stare. Tabs: Toate ·
    Active. Only the Cod column is frozen, with no divider after Denumire.
  - The dataset has 31 templates, codes like `Case.Registered`. Only `origin: "Sistem"`
    templates can be cloned into a service.
  - Create, edit and activate wait for Feature 91332 / US-184.

### Notification template profile (redesigned 2026-10-01)

Designed around the job: write what the notification says (per language and channel),
see it as the recipient will, choose who gets it, then publish.

- **Route:** `#sablon/<code>/<content|recipients|settings|history>`. The old `texts`
  maps to `content`.
- **Panel:** `[data-ntpl-profile]`, shell state `is-ntpl-profile-open`, column 1280.

**Header:** the standard page header.
- Actions follow the state (the Contentful / Sanity save-then-publish pattern), with no
  ⋮ menu:
  - unsaved edits: Renunță (`btn-neutral`) · Salvează (`btn-secondary`) · Publică
    (`btn-primary`)
  - saved, not published: Publică
  - nothing pending: "Publică" stays, aria-disabled, tooltip "Nu există modificări de
    publicat."
- **Publish modal** (`#ntpl-publish-modal`, `modal--md`): Publică saves pending edits
  silently, then opens "Publică șablonul":
  - Subtitle: `vX → vY · destinatarii primesc noua versiune imediat.`
  - "Ce s-a modificat": a diff against `tpl.published` (the last published snapshot;
    taken on first open when the data has none). It uses the case-modal bordered list
    (`.e-permits-case-form__fees` / `__fee`): area + detail, with a tag on the right
    (Adăugat `success` · Modificat `info` · Eliminat `danger`).
  - Areas: Conținut · <limbă> (Subiect, Corp, Mesaj scurt), Regulă · <destinatar>
    (matched by recipient; Livrare a → b, separate, active), and Setări. Stare is not
    included, because it applies at once.
  - "Intră în vigoare": a segmented control, Imediat · La o dată anume. "La o dată
    anume" shows the library date picker "Data intrării în vigoare" (required,
    `data-min` = tomorrow), with the hint "Până atunci destinatarii primesc versiunea
    curentă." The subtitle switches to "intră în vigoare pe <date>."
  - "Comentariu" (required, max 200, counter): why it changed, e.g. a law amendment. It
    becomes the Istoric entry text; the change list is stored in `history[].changes`.
  - A scheduled publish stores `history[].effectiveFrom`. Until that date the entry is
    "vX · programată pentru <date>" with the pending (clock) marker, the previous version
    stays "curentă", and the caption reads "vX intră în vigoare pe <date> · <user>".
    Toast: "Publicare programată".
- Caption: one line, "Publicat <date> · <user>", 12/16 tertiary (the meta labels' type).
- Meta: Cod (copy) · Versiune · Stare · Obiect · Sursă.
- Tabs: **Conținut · Destinatari (count) · Setări · Istoric (count)**.
- Leaving with unsaved edits asks first: crumb, shell back, menu, `beforeunload`.

**Unpublished notice:** the Figma info-box, Strong · Warning with Close
(`.e-permits-ntpl-banner`; see the banner notes above). Closing it is remembered per
template for the session.

**Conținut** (`.e-permits-ntpl-content`): the editor and a sticky **Previzualizare**,
split **7fr / 5fr** (the preview is at least 360px). The preview heading keeps 12px
above the preview because its segmented control is taller than the title. "Corp" is
the regular field label (14/20), **bottom-aligned** with the Vizual / HTML switch, so it
sits right above the editor. The preview container uses **concentric corners**: outer
radius = inner card radius + the padding between them (`calc(radius-12 + spacing-16)` =
28).
- Top bar: the small RO · RU · EN segmented control on the left. A language missing its
  subject or body shows a warning dot (`.e-permits-ntpl-dot`) and the aria label
  "— incomplet". On the right, **"Inserează câmp"**.
- Editor toolbar icons come from the **central icon system v1.22** (filled=off,
  stroke=2, radius=1, join=round), added to both sprites: `text-bold`, `text-italic`,
  `text-underline`, `list-bullets`, `list-numbers`, `link`, `brackets` (IF), `undo`,
  `redo`, `eraser`.
- Editor focus = the input focus: brand border, a 1px brand **outline** (offset −2, so it
  paints over the toolbar on the whole perimeter) and a 4px blue-sky-200 ring.
- "Inserează câmp" (`btn-secondary btn-sm`) is a stack-menu picker (`.e-permits-ntpl-picker`): search, the
  data-source group, then label plus `{{Token}}`. It inserts at the last caret, in
  Subiect, Corp or the SMS text. It replaces the permanent fields column.
- **E-mail** card: Subiect, then Corp (label left, Vizual · HTML right), then the
  editor. Toolbar: B I U · lists · link, IF · undo, redo, clear.
  HTML mode swaps the editor for the plain text-area component
  (`.e-permits-fo-textarea.e-permits-ntpl-html`, min-height 240), with no custom frame.
- **Mesaj scurt** card ("SMS și MNotify — fără formatare"): a textarea and a counter
  `n/160` that turns `danger` when over.
- **Previzualizare:** E-mail · **Mobil** segmented control.
  - E-mail shows a header (sender, subject) and the body.
  - The grey frame has no min-height: it always hugs the white card at 16 all round,
    and the card owns the height (body min 160, chat min 200). The head/body divider
    is inset 16 from the card's edges (a 1px background gradient, not a border).
  - Mobil is the iOS Messages pattern on the same white card as the e-mail. No phone
    frame:
    - head (`__chat-head`): a centred 40px grey avatar "eP" and "e-Permis" 12/16
      medium, then a divider
    - body (`__chat`): a centred "Mesaj text · Azi 09:41" 12/16 tertiary stamp, then
      one received bubble (`__sms`: base-tertiary, radius 16 with a 4px sender-side
      corner, 8/12 padding, max 80%) holding the short text.
  - Tokens are filled from `NTPL_FIELDS` sample values and marked
    (`.e-permits-ntpl-preview__token`, brand-secondary).
  - It updates live on every input.

**Destinatari:** a stacked list plus `#ntpl-rule-modal` (unchanged).

**Setări:**
- "Identificare" card: Cod*, Denumire* · Sursa de date (determines the fields),
  Prioritate · Descriere (for admins). These are versioned and saved via the header.
- "Stare" card: the library switch "Șablon activ". It applies immediately, without
  publishing.

**Istoric:** published versions as the event timeline; the newest is tagged
"· curentă".

**Segmented controls** on this page (language, Vizual/HTML, E-mail/SMS) are the library
default (Figma `segmented-control`). There is no `--small` and no page override.

**Validation:** code required and unique; name required; RO subject and body required.
A failed save jumps to the tab that holds the error.

### Routing — every page has its own address (added 2026-10-01)

- **Menu pages** write `#<nav-id>` with `pushState`, so Back and Forward work.
- **Profiles** write `#dosar/<id>/<tab>`, `#serviciu/<code>/<tab>`, `#utilizator/<id>/<tab>`
  or `#rol/<id>/<tab>` with `replaceState`, and light up their parent menu item
  (`setActiveNav`).
- **On load and on `popstate`, `routeFromHash()` opens what the address names.** An
  unknown or foreign hash keeps the role's default page and rewrites its hash.
- **Closing a profile** restores its page's hash (`restorePageHash`). A role switch
  writes the new default page's hash.
- Creating or cloning writes a row to the service's Jurnal de evenimente.

### Segmented control — aligned to Figma (updated 2026-10-01)

Figma Components `segmented-control` (`661:10142`, Segment Count 2–5 × Breakpoint) with
`.segmented-control-item` (`663:10946`, Mode On/Off × State Default/Hover/Focus). The
library CSS (`main.css`, both copies) now matches it:

| Part | Value |
|---|---|
| Track | `background-base-tertiary`, radius full, padding 6, gap 6 (Mobile: padding 4) |
| Item | 40px pill (padding 10/16; Mobile 44px), 14/20 |
| Off | regular 400, `text-base-secondary`, transparent |
| Hover | `background-base-tertiary-hover` |
| On (`.is-selected`) | `background-base-inverse-default`, `text-base-inverse-default`, **medium 500**, shadow `0 1px 3px rgba(0,0,0,.16), 0 0 .5px rgba(0,0,0,.3)` |
| Focus | `0 0 0 2px white, 0 0 0 5px blue-sky-500` (on or off) |
| Separator | the 1px divider between two unselected items (Figma "Separator" property) |

`--small` and `--large` remain in the library, but Figma has no such sizes. Use the
default.

### Toggle — the back-office switch (added 2026-10-01)

`renderToggle({ label, description, checked, attrs, disabled })` in
`e-permits-shell.js`, CSS `.e-permits-toggle` in `e-permits-shell.css`. It replaces every
library `.switch` in the back office: template "Șablon activ", the rule modal switches,
"Plată recurentă" and "Calcul prin formulă".

- **Geometry:** Tailwind "toggle with label on the right". The toggle comes first, then
  a 12px gap, then the text. Track 44×24 (`calc(20*2+4)`), padding 2, radius full, an
  inset hairline. Knob 20px white with a small shadow, slides 20px.
- **Colours:** off `--gray-250`; on `background-brand-default`; focus-visible 2px brand
  outline with 2px offset; disabled 50% opacity.
- **Text:** `__label` 14/20 medium default (`margin: 0`, it is a real `<label for>`),
  then `__description` 14/20 tertiary, with no gap between them. The track is
  **vertically centred on the whole text block** (`align-items: center`).
- **Spacing in modal forms:** `.e-permits-case-form` puts 24 between every field and
  toggle; its `.e-permits-user-create__grid` uses 24 too (the drawer grid default is 32).
  In the rule modal, Destinatar and Livrare are both full width, required, and use full-flow
  selects.
- **Knob** has `pointer-events: none`, so a click on it reaches the switch.
- **Activation needs a confirmation:** see "Activare / dezactivare" below.
- **Markup:** a real checkbox with `role="switch"` covers the track
  (`appearance: none`). The description is linked by `aria-describedby`. Respects
  `prefers-reduced-motion`.

### Advanced filter — faceted chips, one master apply (added 2026-10-01)

Figma: GEAP 2.0 `244:14333` (filter-chip + numbered badge + contextual-menu). The
pattern is Azure DevOps / Linear. The code is in `e-permits-shell.js` (`FILTER_FACETS`,
`renderFilterBar`, `openFilterPopover`, `commitFilters`) and `e-permits-shell.css`
(`.e-permits-workplace__filter*`). It works on every table in the shared workplace
panel: dossiers, sarcini, users, roles, services, authorities, tariffs, ntpl.

- **Quick search:** the same width on every table, the Utilizatori size: `flex: 0 1 400px`,
  min 200, max 400 (2026-10-01).
- **Toolbar = one component:** every table uses the same 56px toolbar row. Its items are
  all `align-self: center`, with no transforms and no per-registry geometry (the users
  registry used to override height/padding and the search had a 3px nudge, which put
  them out of line). The search (40px box, 36px visible) and the button (36px) share
  one centre line. Never re-add per-table toolbar overrides.
- **Trigger:** "Filtrare avansată" is the plain library button. It is **`btn btn-neutral
  btn-sm`**: always grey, with no local colours/hover/focus. It is 36px tall, which is
  the quick search's *visible* height: the search is a 40px box whose 1px line sits
  inside a 2px transparent border.
  - **Icon:** `icon-filter-lines`, the Foundations "filter-2". The symbol's viewBox is
    padded (`-3 -3 30 30`) so it has the same optical margin as the other 16px button
    icons; at 0 0 24 24 it touched the label.
  - **Badge:** our numbered badge `badge badge--lg badge--solid-light`, with the number
    of applied values.
  - **Bar:** shows **only after a click** on the button (user 2026-10-01). A second
    click hides it even with filters applied; the badge keeps the count.
  - **Nothing to filter:** it stays visible but `aria-disabled`, with the tooltip "Lista
    nu are încă valori după care să filtrezi."
- **Bar** (`[data-workplace-filters]`, header grid row 2):
  - **Chips:** one per facet. The chip is the library `.chip` sized to the Figma
    filter-chip: 40px, **14/20 medium** (user 2026-10-01; Figma has 16/24), 16 left / 12 right padding, gap 6,
    `base-tertiary` background.
  - **Selected chip:** `inverse-default` background, with a white `.chip__badge`
    (18px, 12 medium) holding the number of selected values, then a 20px chevron
    (bottom, or top while open).
  - **Count badge:** the same `badge badge--lg badge--solid-light` as everywhere else.
  - **"Mai multe":** the first 4 facets are chips; the rest sit in "Mai multe" (a menu)
    until they hold a value.
- **Popover** (Figma contextual-menu: 270 wide, radius 16, Drop Shadow/300):
  - **Options:** compact: padding 8 / 12, gap 10, no gap between rows (~36–40px
    tall; user 2026-10-01), a library checkbox, then the value.
    **Status values render as their tag** (`renderTag` with the registry tone); other
    values are plain 14/20.
  - **Search:** shown when there are more than 7 values.
  - **Footer:** a top border, right-aligned: **Confirmă** (`btn-primary btn-sm`) and
    **Șterge** (`btn-neutral btn-sm` with `cross-small`).
- **Two layers, one query (the calls are costly):**
  1. **Popover "Confirmă":** writes that facet into the bar's draft. **No query.** Esc,
     an outside click, a resize or a table scroll closes it without changes.
  2. **Pending draft:** the bar shows "Filtre neaplicate" · **Renunță**
     (`btn-text-neutral`) · **Aplică filtrele** (`btn-primary btn-sm`). One click
     commits every facet at once, as one query, and resets to page 1.
  3. **Applied:** "N rezultate" · "Șterge filtrele" (clearing everything applies at
     once). Nothing applied: the hint "Alege valorile, apoi aplică filtrele."
- **Logic:**
  - OR within a facet, AND across facets, on top of the status tab and the quick
    search.
  - **Status tabs:** they count inside the applied filters.
  - **Which facets show:** a facet is offered when the registry has at least 2 values,
    or when it holds a value.
- **State:**
  - **Persisted:** the applied filters + whether the bar is open, per registry kind, in
    `sessionStorage` (`e-permits-filters:<kind>`).
  - **Not persisted:** the draft.
- **Empty result:** "Nu există rezultate pentru filtrele aplicate." + "Șterge filtrele".
- **New registry:** add `FILTER_FACETS[kind]` (`{ key, label, get(row) → string |
  string[] }`). Arrays are multi-value. Facets named `statut` / `status` render their
  values as tags.

- **Closed by default (2026-10-02):** the chip bar never restores "open" from the session
  and closes whenever you arrive on another page (registry kind + view); an unapplied
  draft is dropped. Applied filters persist per registry and show as the count badge on
  "Filtrare avansată" while the bar is closed.

### Inline note — info and alerts inside content (rule, updated 2026-10-02)

**One component, one geometry, everywhere** (pages, drawers, modals). Never style a note
per screen — no local padding, radius, font or icon size.

| Use | Helper | Markup |
|---|---|---|
| neutral explanation (grey, "i") | `renderInfoNote(html)` | `.info-box.info-box--neutral.e-permits-info-note` > `.info-box__icon` + `.info-box__content > p` |
| info / success / warning / error | `renderNotice(tone, html, { icon })` | `.message.message--subtle.banner--{tone}` > `.banner__icon` + `.banner__content > p.banner__text` |
| read-only / restricted | `renderNotice("warning", html, { icon: "lock" })` (classifiers: `clasLockNotice`) | same as above |

Geometry (CSS "Inline note", scoped to `[data-demo-flow="back-office"]`): padding **12/16**,
radius **12**, icon **20** top-aligned, icon–text gap **12**, text **14/20 regular**,
`--color-text-base-default`, `strong` = medium; margin 0 (spacing comes from the parent's
gap); no entry animation. The tone only changes background and icon colour
(grey `--color-background-base-secondary`; blue / green / apricot / red library subtle tints).
Default icons: info `circle-info-filled`, success `circle-checkmark-filled`, warning
`warning-filled`, error `circle-error-filled`.
- Copy: one or two sentences; lead with a bold phrase when it states a restriction
  ("**Doar consultare.** …").
- The **only** exception is the dismissible page banner `.e-permits-ntpl-banner`
  (Figma 8230:2388, 24px padding, 16/24 text, close button) — page-level, not inline.
- A bigger, titled message (icon + title + text) is a **Callout** (`.e-permits-callout`), not a note.
- A pointer/explanation **under a list or card** (e.g. "Tarifele globale … se gestionează în
  Administrare → Tarife" under the passport Tarife list) is this grey note, never a bare hint
  line; it sits **24** below the list (`margin-top: var(--spacing-24)` when the parent has no gap).
  An in-text action is a library link `a.link.link-primary` inheriting the note's 14/20
  (`display: inline; font-size/line-height: inherit`), not a button.

### Sum list — a list with its total (added 2026-10-02, Figma 9721:9920)

Any bordered list whose amounts add up (fee picker in "Setarea taxei", "Ce s-a generat" in
"N taxe generate") ends in a **total tray that hangs under the list** — never a loose
"Total" line or a right-aligned paragraph.

```html
<div class="e-permits-sum-list">
  <ul class="e-permits-case-form__fees" role="list">…</ul>
  <div class="e-permits-sum-list__total"><span>Total</span><strong>170 MDL</strong></div>
</div>
```
JS: `renderSumList(listHtml, "170 MDL")`. Tray: inset **12** each side, padding **12/20**,
radius **0 0 16 16** (square top, it attaches to the list), `--color-background-base-secondary`,
14/20 — label regular, amount `strong` = semibold. Field errors go **after** the whole group.
Same "attached tray" idea as the Acum callout under the trajectory.
**Where a note goes (rule, PM 2026-10-03):**
- **Top of a tab / section** (what it is, where the data comes from — "Secțiunile marcate
  RSSP…", "O taxă = un tarif + regula de aplicare…") → **blue** `renderTabNotice(html)` =
  `.message.message--subtle.banner--info.e-permits-passport__notice` (Figma "Mesaj · subtil",
  Tone=Info). Never a grey info box at the top.
- **Under a list** (scope, where it is managed) → the grey **note tray** attached to the list
  (below). Never a loose grey box, never a subtitle under the section title.

**Note variant** — a list's closing explanation ("Șabloanele serviciului se gestionează…",
"Documentele … versionate în MDocs") uses the same tray: `renderListNote(html)` →
`.e-permits-sum-list__total.e-permits-sum-list__note` (20px `circle-info-filled` in
icon/base/tertiary, 8px gap, text secondary, `strong` medium default), attached under the
list with no gap. Used instead of a subtitle line or a loose grey info box under lists.

### Next step — where an action leads (added 2026-10-02, Figma 9721:9920)

Every step form and confirmation in the case modal ends with the target step:

```html
<div class="e-permits-next-step">
  <span class="e-permits-next-step__label">Următorul pas</span>
  <div class="e-permits-next-step__box"><svg class="icon">…arrow-right…</svg><span>Generarea taxelor automate · Asistent tehnic</span></div>
</div>
```
JS: `renderNextStep(target)`; a **return** uses `renderNextStep(target, { label: "Se întoarce la", icon: "arrow-left" })`.
Label 14/20 tertiary, gap **8**; box padding **12/20**, radius **16**, gap **12**,
`--color-background-base-secondary`, 20px icon, text 14/20 **medium** default colour.
The label never repeats the target. Used by: `renderCaseModal` (all forms), the Aprobare /
Respingere choice (`decizie`, updates with the choice), and form-less confirmations.
Do not write "Următorul pas: …" as plain text anywhere.

### Taxe — tariff + application rule (revised 2026-10-02)

**Why (feedback G. Roșca, O. Luchian, 2 Oct 2026):** taxes (the sum to pay) are computed
from tariffs; ~80% of taxes equal the tariff; tariffs come mostly from RSSP / eAPL. Separate
"Taxe" (payments bundling tariffs) and "Tarife" tabs made the admin configure the same thing
twice and hid the starting point. Olesea's case: *Înregistrarea produselor biocide* —
emitere primară 9252 MDL; at reperfectare **two different tariffs at the same moment**,
chosen by the reason picked at initiation (minor/major change 7743 · administrative 1292).

**Model** (`service.geap.taxes`, one object per tariff it charges):
`{ id, tariffId, requestType, moment, generation: Automat|Manual, conditions: [{ classifier,
values[] }] (AND; [] = always), scenarioCalc: { "<cls>=<val>&<cls2>=<val2>": { mode: tarif |
reducere, percent } }, calc: { mode: tarif | reducere (percent) } (unconditional only), term,
exemptions[], removable, recurring, version, state, active, usage }`. The older single
`condition: { classifier, values[] }` is still read (`taxConditions`). Condition classifiers: `servicesStore.conditionClassifiers` (`{ code, name, scope,
values: [{ code, label }] }`) — the value the applicant picks in the form at initiation.
Taxes of the same request type + moment land on **one payment note**.

**Rules** (`core/service-passport.js`, tests in `test/service-passport.test.mjs`):
- `conditionApplies` / `conditionsOverlap`; `taxConflict` = the same tariff may not be
  charged twice: another active tax with the same tariff + request type + moment and an
  overlapping condition. Different tariffs **may** stack on one note.
- `tariffAmount` = the tariff's amount or its own formula; `taxAmount` = that, optionally
  reduced by a percent (the reduction applies to the formula's result).
- **One formula level (2026-10-05):** a formula is defined only on the tariff („Calcul prin
  formulă”), never on the tax. A legacy `calc.mode: "formula"` fails validation and opens
  as „Suma tarifului”. Every list shows a formula tariff's value the same way — „Formulă ·
  {expresie}” (`tariffValueText`, registry „Valoare”, tax picker, stacked rows) — never the
  raw amount.
- `validateTax` = payment rules (moment in the flow, initiation = automatic, term,
  exemptions only manual, recurrence) + tariff required and eligible + each condition needs a
  classifier (once) and ≥ 1 value (keys `conditionClassifier[:i]`, `conditionValues[:i]`) +
  ≤ `TAX_SCENARIO_MAX` (24) scenarios (`scenarios`) + reduction 1–100, per scenario
  (`calc:<key>`, `percent:<key>`) or, unconditional, plain `percent`.
- **Hierarchical classifiers (2026-10-08):** a condition classifier may have
  `hierarchical: true` and values with `parent` (CAEM G → 47 → 47.3; demo `CLS-COM-03` on
  `003000023`, state `svc-04s`). `classifierTree(classifiers)` → `{ cls: { value: parent } }`,
  passed as the optional `tree` to `conditionApplies` / `conditionsOverlap` / `taxConflict` /
  `scenarioFor` / `taxAmount({ tree })`; without it everything stays flat. A checked value
  covers everything under it; a checked child is an exception with its own row; the **most
  specific** matching scenario wins. UI: value checkboxes indented 24 per level
  (`.checkbox.e-permits-tax-cond__value`, `--tax-cond-level`), `checkbox-description`
  „Inclus în G · bifează pentru o sumă separată” / „Excepție de la G”, hint under the list;
  scenario rows get a tertiary fs-12 note (`.e-permits-tax-scn__note`): „restul
  subdiviziunilor, fără 47” (direct exceptions only), „cu toate subdiviziunile”, „excepție de
  la G”. Not handled yet: two *separate* classifiers in a parent/child relation (valid pairs only).
- **Scenarios (2026-10-08, user comments on Figma 04h):** `taxScenarios(tax)` = cartesian
  product of the checked values (one value of each classifier), key `cls=val&cls2=val2`;
  `scenarioFor(tax, answers)`; `taxAmount(tax, tariff, values, { scenario | answers })` uses
  that scenario's calc (missing → the tariff as is). Overlap/conflict: two taxes conflict only
  if every classifier they share has a common value.
- `unconfiguredTariffs` (the service's tariffs no tax uses) and `defaultTaxForTariff`
  ("Aplică ca atare": registry request type, at initiation, Automat, the tariff as is).

**UI — passport tab Taxe** (`renderServiceFees` → `renderServicePayments` → `renderPaymentList`):
1. Model note (grey inline note): "O taxă = un tarif + regula de aplicare…".
2. Sumar taxe: Taxe (Active · De configurat), Tarife (Din RSSP / eAPL · Adăugate manual),
   Conturi bancare.
3. Section "Taxe" (tab label **"Taxe și tarife"**): toolbar chips Toate · Active · Schiță ·
   Inactive (De configurat counts in Toate and Schiță) · search · **one visible action**
   "Adaugă taxă" (`btn-secondary`) · ⋮ menu (`renderStackMenu`): Exportă taxele (download) · Sincronizează tarifele din RSSP / eAPL
   (rotate-arrow, admin). Rule: next to a list's search keep only the primary action; every
   secondary action goes in the ⋮.
4. Stacked list: first the group **"De configurat"** — tariffs without a rule, tags source +
   "Fără regulă de aplicare" (warning), actions **Configurează** (`btn-neutral`) and **Aplică
   ca atare** (`btn-secondary`, publishes the default rule at once). Then groups by **Tip
   solicitare**: title = tariff name; tags state (Activă / Inactivă / Schiță) · source (RSSP ·
   eAPL · Manual · Global) · "Condiționată" (info) · "Fără ramificație în flux"; meta = sum
   (bold) · moment · generation · term · version · modified; meta2 = "Se aplică doar dacă
   <clasificator> = <valori>", exemptions, "eliminabilă din notă".
5. The global-tariffs pointer note (Administrare → Tarife).

**Tax drawer** (`[data-pay-drawer]`, sections in question order): **Tarif** (fo-select of the
service's then global tariffs, each option names its source; hint = code · type · legal
basis · "preluat din RSSP, nu se editează aici"; "Tariful lipsește din RSSP / eAPL?
Creează un tarif nou" hands over to the tariff drawer and returns with the new tariff
selected) · **Aplicare** (Tip solicitare — prefilled from the registry tariff, Moment,
Automat / Manual) · **Condiție** (segmented Întotdeauna / Doar pentru anumite valori → one
grey `.e-permits-tax-cond` block per classifier: „Clasificator N” (block title: 14 medium, text/base/default) + „Elimină”
(`btn-text-destructive btn-sm`, only when > 1), fo-select without the classifiers used in
the other blocks, value checkboxes; under the blocks „Adaugă clasificator” (`btn-neutral
btn-sm` + `icon-plus-large` 16, disabled when every classifier is used) + grey info note
(`renderInfoNote`, gap 12): „**Taxa se aplică doar dacă toate condițiile sunt îndeplinite.**
Valoarea o alege solicitantul…” / single classifier: „Valoarea o alege solicitantul…”) · **Calcul** — unconditional: segmented Suma
tarifului / Reducere with the resulting sum; conditional: „Calcul pe scenarii”, one grey
the shared stacked list (`.e-permits-stack` › `__group` › `__list` › `__item.e-permits-tax-scn__row`, labels in `__main`, controls in `__actions`; only flex-wrap + gap 8/24 added) — one row per scenario = one value label per line, regular 400 (first line
default colour, the next ones secondary — never bold) | fo-select Suma tarifului / Reducere
(180) | % input (88, `e-permits-fo-input__suffix` „%”; an empty slot keeps the columns aligned) | result (right, medium 500:
sum, „Formula − 50%”, or „—”); errors under the row; hint „N scenarii —
câte o sumă pentru fiecare combinație…”; > 24 → inline error instead of rows. List: meta
„7.743 MDL · reducere în 2 din 4 scenarii”, meta2 „Se aplică doar dacă A = x sau y și B = z”,
summary card shows the range „3.871,5 MDL – 7.743 MDL”; CSV „Calcul” lists every scenario.
Demo: `svc-04h` (1 classifier, 2 scenarios), `svc-04h3` (row 1 −50%), `svc-04h4` (2
classifiers → 4 scenarios, IMM −50%), `svc-04h5` (errors: values missing in block 2, empty
reduction on a scenario). · Termen · Scutiri (manual only, + "Specialistul poate
scoate taxa din notă") · Recurență. Footer: draft / publish, or save = new version.

**Lifecycle confirms** (all via `askConfirm`): Publică, Activează (or "Înlocuiește taxa activă"
on conflict), Dezactivează, Șterge (the tariff returns to "De configurat").
Tariff "Folosit de" / delete-blocking count taxes (`tariffUsage`).

**Demo data:** service `003000519` Înregistrarea produselor biocide (ANSP) with TRF-012 9252
(RSSP), TRF-013 7743 (RSSP) and TRF-014 1292 (manual — missing in RSSP), classifier
`CLS-BIO-01` Motivul reperfectării; `003000023` keeps one eAPL tariff "De configurat".

**Open for the PO:** where the condition value comes from in the form (field bound to the
classifier), reductions vs. exemptions overlap, and whether a manual tax at examination should
also offer conditional tariffs to the specialist (today: the specialist picks fees by hand).

### Tariff drawer — tabs + formula builder (added 2026-10-06)

**Tabs** (status strip stays above them): the library small tabs
`.tabs.tabs--sm.e-permits-tariff__tabs` → Detalii (Identitate + Valabilitate) ·
Sumă și formulă · Utilizare și istoric (saved tariffs only). Panel `.e-permits-tariff__panel`.
A tab whose fields have errors shows `.e-permits-ntpl-dot.e-permits-tariff__tab-error` (red);
Salvează / Publică opens the tab of the first error (`TARIFF_FIELD_TAB`). A tab never repeats its
own name as a section heading.

**Create vs edit:** a new tariff uses the **step strip** of every create drawer
(`nav.e-permits-steps-strip[data-tariff-steps]` + `renderStepStrip`, steps Detalii · Sumă și formulă;
footer „Pasul n din 2 · …”, Anulează/Continuă → Înapoi/Salvează schiță/Publică; Continuă validates
step 1). A saved tariff uses **tabs** (Detalii · Sumă și formulă · Utilizare și istoric).

**Tab row:** the library component as is — `.tabs.tabs--sm` (Figma `tab-item-s`: 40px, px12,
14/20; Selected = 2px underline + Medium, Unselected = Regular). The row spans the drawer width
with a 1px `--color-border-base-default` line above and below (the library line is `--gray-300`);
16px below the status strip, which itself sits 12px under the header (20px with the body padding).

**Formula field** `.e-permits-fo-field.e-permits-tariff-formula` — the Șabloane approach (subject +
„Inserează câmp”), not a token builder:
- `__head` = label + „Inserează variabilă” (`btn-secondary btn-sm` stack-menu trigger → the
  Șabloane picker `.e-permits-ntpl-picker`: search, groups by source, label + `unit · {key}`).
  The chosen `{key}` lands **at the caret** (`setRangeText`, like `insertNtplToken`).
- Plain `.e-permits-fo-textarea` (`#tariff-expression`): cursor anywhere; numbers, spaces and
  + − × ÷ ( ) are typed (× ÷ − are stored as * / -). Letters outside a whole `{variable}` are
  dropped while typing (`sanitizeFormula`, caret preserved) — names cannot be typed freely.
- `__readable` „Se citește: …” = the formula in words, variables marked with the Șabloane preview
  token (`.e-permits-ntpl-preview__token`); a variable not in the catalogue = `__unknown` (red).
- Stored as `{var} * 2`; catalogue = `formulaVariables` in `data/e-permits-services.json`
  (key, label, unit, source). `passport.validateTariff(t, { variables })` rejects unknown variables.
- Everywhere else the formula is shown readable: `formulaReadable()` → „Suprafața obiectului × 2”.
- Demo states: `trf-02c` (empty), `trf-02e` (picker open), `trf-02f` (formula + test),
  `trf-02g` (error dots), `trf-03d` (saved formula), `trf-03e` (Utilizare și istoric).

### Tariff drawer — status strip (added 2026-10-01)

An existing tariff opens with `.e-permits-tariff__status` at the top of the drawer
body, before Identitate. It is a grey, radius-12 strip with 12/16 padding:
- **Left:** "Stare" plus **one** tag: Schiță / Activ (`success`) / Inactiv. Under it,
  the meaning in 12/16 tertiary:
  - Schiță: "Nu se folosește încă. Publică-l din subsol…"
  - Activ: "Disponibil la selecție…"
  - Inactiv: "Publicat, dar nu apare la selecție…"
- **Right:** the actions, `btn-sm`:
  - **Activează** (`btn-secondary`) / **Dezactivează** (`btn-neutral`), only for a
    published tariff.
  - **Șterge** (`btn-outline-destructive`). While the tariff is used by taxes,
    Șterge is `aria-disabled` with a `data-tooltip-reason` ("Folosit în N plăți — poate
    fi doar dezactivat.").
- **Every action confirms** through `askConfirm`.
- **Publică vs Activează:** Publică (footer, drafts only) is the first release.
  Activează turns a published tariff back on. The old double tags (Publicat + Activ)
  and the bottom lifecycle row are gone.

### "Vezi …" links that go elsewhere (updated 2026-10-01)

A link that switches tab or page (passport "Vezi tipurile / formularele / șabloanele /
taxele / tot jurnalul", "Vezi schema fluxului…") ends with the **"→" character in its
label**, e.g. "Vezi tipurile →". It is not a separate icon element. It uses the library
`.link` (Figma: Components `link`, 14 Small, with the label "… →").

### Activare / dezactivare — always confirmed (added 2026-10-01)

Every activate/deactivate goes through `askConfirm({ title, text, confirmLabel,
destructive }, onConfirm)`, which uses the shared `#service-confirm-modal`.
- **Title:** a question ("Activezi …?" / "Dezactivezi …?" / "Inactivezi …?").
- **Text:** one sentence on the consequence.
- **Buttons:** Anulează plus a verb button. The verb button is `btn-primary` to
  activate and `btn-destructive` to deactivate.
- **A switch waits for the answer:** it is reset to its old state, and is set only on
  confirm.
- **Covered:** the template "Șablon activ" switch, rule Activează/Dezactivează (⋮),
  the tariff Activează/Dezactivează, payment activate/deactivate, and user
  Activare/Inactivare.

### Buttons — focus and "disabled with a reason" (updated 2026-10-01)

- **Focus:** Figma `button-filled-rectangular` State=Focus, the same for every Style and
  Size: `box-shadow: 0 0 0 2px white, 0 0 0 5px var(--focus-ring)`, `outline: none`.
  - All 16 `.btn-*` focus rules now use `:focus-visible`, so a mouse click no longer
    leaves a ring. Before, most used `:focus` with a white outline and a 4px ring.
  - The demo page `Components/buttons.html` shows the same ring.
- **`.btn[aria-disabled="true"]`:** the disabled look (gray-250 / gray-500, opacity .6,
  not-allowed), with no hover or active change.
  - Use it instead of `disabled` when the user should learn **why** the action is
    unavailable. Add `data-tooltip-reason="…"`; the click handler checks
    `aria-disabled` itself.
  - `js/icon-tooltip.js` (both copies) shows `data-tooltip-reason` on **any** control,
    text buttons included, even when aria-disabled.
- **Example:** the template header's "Publică" is always present. With nothing to
  publish it is aria-disabled, with the tooltip "Nu există modificări de publicat."

### Workplace toolbar primary action (added 2026-10-01)

"Adaugă tarif" and "Sincronizare serviciu" in the workplace toolbar use the library
`btn btn-primary btn-sm` with `e-permits-workplace__primary-action`, which hugs the label
and keeps `[hidden]` working. Do not use the fixed-width `.e-permits-workplace__add-user`
for new actions. Leading "add" icons on small buttons are `icon-plus-large` at
`.icon.small` (16px), as in the Figma 16/plus. `icon-plus-small` draws a visibly smaller
glyph at that size.

---

### List toolbar — search + chips + actions (added 2026-10-02)

One system for every list toolbar: registries (`[data-workplace-toolbar]`), classifier
Valori (`.e-permits-clas-grid__toolbar`), passport Taxe (`.e-permits-pay__toolbar`)
and the request-type drawer (`.e-permits-rt__toolbar`).
- **Search:** always the library Search with the product layer —
  `label.search-input.medium.rectangular.e-permits-workplace__search` (+ `e-permits-list-search`
  in sections) > `.icon-search` + `input.input[type=search]`. Width 400 in registries and
  full-width tables, 320 in sections and drawers (min 200, full width ≤760px). Never a
  `.e-permits-fo-input` with a trailing search icon.
- **Control height:** `--list-toolbar-control` = 40px − 2 × 2px focus border = **36px**, the
  Search's visible height. Chips (`.chip` with the numbered badge), icon actions and
  `.btn.btn-sm` in these toolbars all take it, `padding-block: 0`, centred; the Search's
  library 6px bottom margin is removed.
- **Spacing:** 12px between controls, 16px between wrapped rows.

### Field error message — Figma text-input Destructive (updated 2026-10-02)

Source: GEAP 2.0 `text-input` (1559:44137), Style=Destructive (1559:44346), "Error message":
20px `circle-error-filled` + 14/20 regular `--color-text-danger-default`, 4px gap, 8px under
the control (the `.e-permits-fo-field` gap).

```html
<span class="message message--inline message--error e-permits-fo-field__error">
  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
  <span>Completează denumirea.</span>
</span>
```

- Replaces the 12px `message--small` + outline icon in **every** back-office drawer (case,
  tariff, payment, template, request type, sync, classifiers).
- The control gets `is-error`. A field's hint stays in the DOM with `hidden` while the error
  shows, and returns when the field is edited (the error clears on input; validation re-runs
  on save). Copy: an instruction ending in a full stop — "Completează …", "Alege …",
  "Codul există deja în acest clasificator."

### Confirmations — destructive = red (rule, 2026-10-03)

`askConfirm({ …, destructive: true })` → the confirm button is `btn-destructive` (red) for
every action that removes, stops or discards: Șterge, Șterge din catalog, Dezactivează,
Detașează, Renunță (la ciornă / la modificări), Închide fără salvare, Înlocuiește taxa
activă, Suprascrie / Publică oricum over someone else's MDocs change. Neutral confirmations
(Publică, Activează, Republică, Sincronizează) stay `btn-primary`. Figma: the same modal
with button Style=Destructive.

### Confirmation above drawers (added 2026-10-02)

`#service-confirm-modal` carries `.e-permits-confirm-overlay` (z-index 1300 > drawer 1200 >
modal 1000), so an `askConfirm` raised from inside a drawer is never hidden behind it.

### Traiectoria dosarului — case path on Date generale (added 2026-10-02)

Figma GEAP 2.0 `8929:7814`. First section of the dosar "Date generale" tab
(`renderDosarTrajectory`). White card (`--color-background-base-default`, 1px
`--color-border-base-default` border, radius 24 like the dosar cards — no token, padding 20) with an `<ol>` of six evenly spaced steps whose first and last hug the card edges (columns 1·2·2·2·2·1; first step left-aligned, last right-aligned): Depusă (Inițiat for ex officio) · Examinare ·
Coordonare · Semnare · Semnat · Eliberat (Respins on a rejection).
- Markers 24px: done `circle-checkmark-filled` positive; current `time-filled` brand
  (`aria-current="step"`); suspended `pause` amber; rejected final `circle-error-filled`
  danger; to do a 20px grey ring. Connectors 2px: brand between reached steps, grey after.
- Label 14/20 medium; under reached steps the date + who, 12/16 tertiary (Figma's 10/12 has
  no token and is below a readable size; Figma's `#f7f7f7` / radius 24 → nearest tokens).
- Under the card, a separate **callout** (below): the timeline's `time-filled` clock (brand; `pause` when suspended), title "Acum: <step>" (+ red
  "Termen depășit" tag), meta "de N zile · termen …" (while waiting for payment: "plată până
  la …", the payment note's deadline), and "**Urmează:** <next step in one sentence>".
  Finished cases: check (or error) icon, "Dosar finalizat / respins" + one line.
- Step dates are kept in order (an earlier step never shows a later date).
- Status → current step: schita 0, depus/inExaminare 1, spreCoordonare 2, spreSemnare 3,
  semnat 5, eliberat/respins/arhivat all done. Dates the seed lacks are derived from the
  filing / signing dates (deterministic per case).
- ≤760px the steps stack vertically.

### Callout — tinted note with icon, title and text (added 2026-10-02)

Figma GEAP 2.0 `8440:119598` (Cabinet "Autoritatea a cerut modificări"), simplified to a flat
tint: `.e-permits-callout.e-permits-callout--info` (`--color-background-brand-secondary`) or
`--warning` (`--color-background-warning-secondary`); radius 16, padding 20, gap 16;
`__icon` 24px (brand / apricot-700), `__content` gap 8: `__title` 16/24 medium (a tag may
sit inline), `__meta` and `__text` 14/20 secondary (`strong` = default, medium). Wrap in
`.e-permits-callout-wrap` (16px above). The Figma's name/date strip and inner glow are not
used. First use: "Acum / Urmează" under Traiectoria dosarului, where it **hangs from the
card** (`.e-permits-trajectory + .e-permits-callout-wrap`): no gap, square top corners,
rounded bottom (24, as the card), inset 16px on each side, and compact — padding 12/16, icon–text gap 12,
gap between title / meta / text 4, title 14/20 medium, icon 20 (updated 2026-10-05).

### Detail modal — payment note, approval, act, document (added 2026-10-02)

Figma GEAP 2.0 `8912:54211` "Notă de plată". `#dosar-detail-modal` (library `modal--md`):
title + subtitle, a `renderInfoCard("Date generale", rows)` passport card, the grey
**"Doar citire"** note (`info-box` + `icon-lock`, 12/16 tertiary), footer `btn-neutral`
Descarcă (download icon) · `btn-primary` Închide.
- Opened from Taxe și plăți / Avize / Act-Decizie / Documente generate: each row has a
  "Detalii" action (`data-dosar-detail="kind|key"`) and the whole row is clickable
  (`renderStackItem` `rowAttrs` → `.e-permits-stack__item.is-clickable`).
- Rows: Notă de plată = Număr cont, Denumirea, Suma, Statutul (Achitat / Neachitat /
  Expirat), Data emiterii, Termen de plată, Data achitării, Metoda de plată, Număr dosar.
  Aviz = Număr aviz, Instituția, Statutul, Solicitat la / de, Termen, Rezultat, Număr dosar.
  Act = Denumirea, Tipul, Număr act, Emis la, Emitent, Registru, Semnat electronic.
  Document = Denumirea, Format, Emis la, Autor, Dimensiune.
- Injected footer buttons close through their own handler (`modal.js` binds `data-close`
  only at load).

### Fees — generated by the specialist, then paid (updated 2026-10-02)

**Model:** a dossier has **no fee at submission**. The specialist verifies the case and
then generates the fee(s) — `confirmaTaxa` at "Setarea taxei" or `taxaExaminare` during
"Verificarea datelor". MPay issues the payment note and the citizen is **notified
automatically** (e-mail + MNotify: "Notă de plată emisă — de achitat"); the case waits for
payment, then continues. Rejected cases never get fees. The Taxe și plăți tab appears only
once a fee exists.

Seed data follows it: draft / submitted / in examination → no fees; `asteaptaPlata` (seed
rows with the overdue-payment alert) → 2 generated, unpaid, overdue; coordination, signing,
signed, released → 2 generated after verification (submission + 2–4 days), then paid; each
generated set leaves the two citizen notifications.

**"Taxe generate" modal** (`openFeesCreatedModal`, in `#dosar-detail-modal`, instead of a
toast): title "Taxă generată" / "N taxe generate", subtitle the dosar number; the library
success alert (`message message--subtle banner--success` + `circle-checkmark-filled`, no entry
animation) "Nota de plată a fost emisă în MPay. Solicitantul a fost notificat prin e-mail și
MNotify că are de achitat."; **Ce s-a generat** — `e-permits-case-form__fees` rows (name,
MPAY number, payment deadline, amount) + Total; **Dosarul acum** — status tag, current step,
fees status; info note pointing to Taxe și plăți and Notificări; one `btn-primary` Închide.
Closing it any way (button, ×, overlay, Esc — a MutationObserver on `aria-hidden` runs a
one-shot `dosarDetailAfterClose`) lands on **Taxe și plăți**.
- List status **`asteaptaPlata` "Așteaptă plata"** (warning): `caseFlow.listStatus` for
  node15 / RecordState5 / node16 (public status 4); `initialState("asteaptaPlata")` → node16;
  counts as active work; trajectory step Examinare ("Acum: Așteaptă plata taxelor").
- New fees are dated on the dossiers' clock (`workplaceDb.today`).
- `renderDeadlineMeta(iso)` (" 5 z. rămase" / " 2 z. depășit") is now defined — the Taxe
  tab used it without a definition and crashed on any unpaid fee.

### Checkbox / radio inside a form field (fixed 2026-10-02)

`.e-permits-fo-field label` (the field caption: 4px gap, 20px height) was also styling
library `label.checkbox` / `label.radio` inside fields, so the box sat 4px from its text.
They now keep the library anatomy: checkbox gap 12 (top-aligned), radio gap 8 (centred).

### Șablon nou — notification template create drawer (added 2026-10-02)

Toolbar primary action "Șablon nou" (`data-workplace-add-ntpl`, central admin, Șabloane de
notificare). The standard `.e-permits-user-create` drawer (`data-ntpl-create`) with the
shared step strip (`renderStepStrip(steps, state, gotoAttr)`, also used by Clasificator nou).
Order follows notification tools (Customer.io, HubSpot, Azure Communication Services):
define the message, then who gets it on which channel, then write it — the channel decides
what must be written and the data source which fields can be inserted.
1. **Setări** — Denumire (unique), Cod (suggested from the name until edited; letters and
   digits, unique), Sursa de date (select; decides the insertable fields), Prioritate
   (segmented Scăzută / Normală / Înaltă with a hint per value), Descriere (`clasTextarea`
   with counter, admin only), Punct de plecare Zero / Copia unui șablon (copies data source,
   recipients and texts in all languages; name gets "(copie)").
2. **Destinatari** — rows recipient select · channel select · delete icon-action
   (aria-disabled with a reason on the last row); "Adaugă destinatar"; no duplicate
   recipient; info note on what each channel requires.
3. **Conținut** — language segmented RO / RU / EN (dot = incomplete; RO required),
   "Inserează câmp" select of the data source's `{{Token}}`s, inserted at the last caret;
   Email/MDelivery → Subiect + Corp (plain textarea, blank line = paragraph); MNotify →
   Mesaj scurt with the 160 counter. Rich formatting stays in the profile editor.
4. **Revizuire** — passport blocks per step with "Modifică" + the RO preview with sample
   data (`fillNtplSample`), then "Creează șablonul": created `unpublished`, version "—",
   origin Personalizat, and opens on the Conținut tab.
Esc (document-level while the drawer is open, ignored when a list, date picker or modal is
open) and Anulează ask before discarding entered data.

### Servicii — publicare (2026-10-03)

The service passport publishes like the template and classifier profiles. Header actions
(central admin), right of Sincronizează: **Istoric versiuni** (neutral sm, `history`) ·
**Publică** (primary sm; `aria-disabled` + tooltip "Nu există modificări de publicat." when
nothing is pending). Caption: pending → **status** „● N modificări nepublicate” then „· față de
vX · sincronizat …”; else „Publicat {stamp} · sincronizat …”.
- **Header status, not a tag (2026-10-04):** a state that is not an action never sits as a
  tag between buttons. `renderHeaderStatus(text, tone)` → `.e-permits-page-header__status`:
  8px dot (`--color-icon-warning-default`) + text 12/16 medium `--color-text-warning-default`,
  gap 6. Page headers pass it as `renderPageHeaderTop({ status })` — it leads the caption.
  Sheet headers without a caption (document template builder) put it inline before the
  buttons at 14/20 („● Modificări nesalvate” / „● Modificări nepublicate”).
- Pending = every `logServiceEvents` entry after `geap.publishedAt`, except syncs and
  publications. The header re-renders whenever the log changes.
- Publică → the shared publish modal (`#ntpl-publish-modal` with a `target` adapter):
  title "Publică serviciul", "vX → vY · …", **Ce s-a modificat** (rows from the log with
  Adăugat / Modificat / Eliminat tags), **Intră în vigoare** Imediat / La o dată anume (date
  picker, future only), **Comentariu*** (counter; required). Confirm raises the patch
  version, adds a publication and a "Publicare serviciu" event, toast.
- Istoric versiuni → library modal with the publications timeline (current / programată).
- Template editor (full-screen sheet, Servicii › Notificări) uses the same header pattern as
  a component: **„Șablon notificare / Header”** (`10008:1624`, cloned from Main Navigation) —
  breadcrumbs (5 levels), title, Renunță · Salvează (boolean „Modificări nesalvate”) · Publică ·
  ✕, caption „Nepublicat încă”, meta Cod / Versiune / Stare / Obiect / Sursă, tabs Conținut /
  Destinatari / Setări / Istoric. Never a captured page-header.
- **Figma:** the header lives in the local component **Main Navigation** (`9442:44686`) —
  row „Header actions” (gap 8): Sincronizează · Istoric versiuni (neutral sm, `20/history` in
  the 16 slot) · Publică (primary sm, **Disabled** by default). Below, row „Caption” (gap 4):
  „Status · Modificări nepublicate” (8px dot `icon/warning/default` + Caption Medium 500 in
  `text/warning/default`, gap 6; visibility bound to the boolean property „Modificări
  nepublicate”, off by default) + the caption text (Caption Medium, 12/16). The old tag
  between the buttons is hidden („(unused)”). Template builder headers (08i / 08j): the same
  status inline before the buttons, Body Small 500. Flow: Servicii blocks **01e** (pending header) → **01f** Publică serviciul →
  **01g** comment missing (Destructive textarea) and **01h** Istoric versiuni.

### Empty state — one component everywhere (2026-10-04)

Tailwind "simple" empty state on our tokens. **Never** a bare grey card with a sentence, a
dashed div with an `<img>`, or plain text in an empty table row.
- Markup: `.e-permits-empty` (role=status) › `__icon` (48px circle, `background-base-secondary`,
  24px sprite icon in `icon-base-tertiary`) · `__title` (14/20 semibold, default text) ·
  `__text` (14/20 tertiary, max 440, 4 under) · `__actions` (20 under, centred, gap 8).
  Box: 1.5px dashed `border-base-default`, radius 16, padding 40 24.
  `--compact` = padding 24 20 (drawers, modals) · `--bare` = no box, padding 24 16 (inside a
  table row, a bordered list, a modal list).
- API (`js/empty-state.js`, loaded before the page scripts; CSS `css/empty-state.css`):
  `GEAPEmptyState.render({ title, text, icon, actionHtml, compact, bare })` — without a title,
  the first sentence of `text` is the title and the rest the line;
  `GEAPEmptyState.noResults(title, { text, … })` — search icon, default line „Verifică
  ortografia sau încearcă alți termeni.” The shell wraps them as `renderEmptyState`,
  `renderNoResults`, and `renderPassportEmpty(title, message, actionHtml, icon)` (section
  heading + empty state).
- Two kinds: **nothing yet** (context icon: `page-text`, `user-account`, `receipt-check`,
  `list-bullets`, `document`; title says what is missing, line says how it gets filled; the
  add button in `__actions` only when the toolbar does not already have it, e.g. the user
  create drawer, an empty classifier) and **no results** (search / filter: `noResults`; a
  filter empty state carries „Șterge filtrele” as `btn-neutral btn-sm`).
- Used by: passport / profile tabs (`renderStackedList`, `renderEventTimeline` `empty`), Taxe,
  Șabloane, Notificări, Jurnal search, case actions filter, destination rules, user
  combinations + create drawer, Delegări, registry tables (`.e-permits-workplace__empty`, bare),
  classifier values grid (bare), fee lists modal (bare), front-office MDocs search and review,
  form-builder classifier registry, Clasificatoare page.
- Not this component: dropdown / picker „no match” lines inside an open list (CAEM, field
  picker) and inline „Fără subiect” placeholders in previews.

### Profile tabs — read-only vs actionable (2026-10-04)

One rule for every profile (service, user, role, classifier, template):
- **Read-only data → the grey passport card** (`renderPassportSection(title, rows)`:
  `.e-permits-dosar-profil__section` + `__section-title` + `__card` with label/value rows).
- **Actionable data → the white bordered card** (`.e-permits-ntpl-card`; forms add
  `.e-permits-clas-form` = column, gap 24, `__row` = two fields side by side). Edits are a
  draft: **Renunță (neutral) · Salvează (primary)** appear first in the page-header actions while
  it is dirty, then a 1px divider (`.e-permits-page-header__divider`) before the page's own
  actions (secondary action, ⋮ square 32 — `btn-icon-only` has no 52 minimum); the
  caption leads with the status „● Modificări nesalvate” (`renderPageHeaderTop({ status })`),
  leaving the profile / switching tab asks before dropping changes.
- **The status is a button** („● N modificări nesalvate”, N = each changed field + each
  permission; `renderHeaderStatus(text, tone, attrs)` with `data-profile-changes`) → modal
  `#profile-changes-modal` „Modificări nesalvate”: subtitle „{nume} · N modificări · se aplică
  după Salvează”; stacked groups „Date administrate în GEAP” (field, tag Modificat, „vechi →
  nou”) and „Permisiuni” (permission, tag Se acordă / Se retrage, its group); each row
  „Anulează” undoes just that change (the profile behind updates); footer „Renunță la toate”
  (neutral) · „Salvează” (primary). Nothing left → the empty state. Works for user and role
  profiles (`profileChangesTarget`). Hover: dotted underline; focus ring.
- **Lists → the stacked list** under a section title. A list with only an add action puts it
  **on the title row** (`.e-permits-dosar-profil__section-heading`: title left, `btn-secondary
  btn-sm` + plus right); a toolbar row (`.e-permits-pay__toolbar` › `__tools`) only when there
  is search / filters too, rows via `renderStackItem`
  (title, tags, meta, ⋮ with destructive items red + `askConfirm`), the list note in the
  attached tray (`renderListNote`). Adding = library central modal (as Clonează / Atașează),
  errors inline on submit.
- **Empty tab → `renderPassportEmpty(title, text)`** (the shared empty-state component). No
  per-profile cards, editors or empty boxes (the old `.e-permits-user-profile__property-*`, `__combo-*`, `__editor`, `__empty`
  were removed).

### Utilizatori › profil (2026-10-04)

- **Header:** crumbs Utilizatori › IDNP, title = name; actions [Renunță · Salvează while dirty]
  · Deleagă rol (**secondary**, the one visible action) · **⋮** (square 32) (`renderStackMenu`, Strict icon-only):
  „Inactivează utilizatorul” (red, pause) / „Activează utilizatorul” (checkmark) and „Șterge
  utilizatorul” (red, delete) — unavailable while the account is active (`aria-disabled` +
  tooltip „Inactivează întâi utilizatorul — un cont activ nu se șterge.”). Both confirm via
  `askConfirm`; delete says what goes (account, roles, permissions) and what stays (MLog,
  case history), then closes the profile with a toast. Unavailable menu items: greyed,
  still focusable. While a ⋮ menu is open its trigger keeps the pressed fill **and** shows the
  focus ring (`[aria-expanded="true"]`), and the menu hangs right-aligned 8px below it
  (`.e-permits-stack__menu-wrap > .e-permits-stack__menu`). Caption
  „Ultima conectare {relativ} · actualizat {dată}”. Meta: IDNP (copy) · Rol tags · Autoritatea
  (plain text, no icon) · Email · Statut.
- **Date generale:** the profile sections' read-only fields (Date de identificare, Date de
  contact) as grey cards; **Date administrate în GEAP** = bordered form: Autoritatea (select,
  hint) + Funcția on one row, Comentarii (hint „Vizibile doar administratorilor.”),
  Informații adiționale. `USER_GEAP_FIELDS`, `userProfileState.draft`, `saveUserGeapDraft`.
- **Combinații de roluri:** stacked list — title = rol, tag = autoritate (scurt), meta =
  subdiviziune · N permisiuni (from the permission catalog; hidden when the catalog does not
  list the role) · autoritatea completă; ⋮ „Elimină combinația” (red, confirm names what is
  lost; disabled with a reason when it is the last one). Toolbar: „Adaugă combinație” →
  `#user-combo-modal` (Rol → Autoritate → Subdiviziune, enabled after the authority; info note
  with the role's permissions; errors: „Alege rolul.” / „Alege autoritatea.” / „Alege
  subdiviziunea.” / „Utilizatorul are deja această combinație.”). „Deleagă rol” in the header
  opens the same modal on this tab. Tray note: what a combination means.
- **Delegări:** `renderPassportEmpty`. **Jurnal:** the timeline. **Permisiuni:** see below. **Roluri › profil › Date generale** uses the grey passport card too.
- Demo links: `?state=usr-01` … `usr-05` (tabs), `usr-01a` (dirty GEAP data), `usr-02a`
  (add modal), `usr-02b` (add errors), `usr-02c` (row ⋮).
- **Figma:** page „BO -> User Management”, section „Utilizatori · profil (din cod, 2026-10)”
  (`10077:11646`), built from the running code (capture → builder → TOKENIZE): columns A Date
  generale (U03–U03e), B Combinații (U04–U04e), C Permisiuni (U05–U05f), D Delegări · Jurnal
  (U06–U07); arrows from the clicked element; the old 1628 screens stay in the section marked
  „versiune anterioară” (registry, creation drawer, delegation flows not in code yet).
  Also column E Roluri (R00–R01c) and the review / toast states U03f–U05k.
- **Figma components (frame „Componente · Profil” `10132:764`, next to the section) — every
  screen uses instances, never redrawn frames:**
  - `Shell / Antet` `10138:187628` — the 66px shell bar (back link = text prop „Înapoi”,
    help, notifications, role switcher).
  - `Profil / Antet` `10133:184694` — page header, variants Tip (Utilizator / Rol) × Stare
    (Salvat / Nesalvat = Renunță · Salvează | divider + ● status); bool „Rol 3” for a third
    role tag; nested exposed `Profil / Tabs`.
  - `Profil / Tabs` `10132:2285` — the tab switcher = library `tab-item-s` instances (icon on
    Date generale, numbered badge for counts), row with a 1px bottom stroke (border/base/default,
    border-1); variants Tip × Activ.
  - `Modal` `10136:657` — code chrome (590, padding 20, title + subtitle, Large buttons):
    Tip=Confirmare (Titlu, Mesaj) / Tip=Conținut (Titlu, Subtitlu, instance-swap slot
    „Conținut” → `Modal conținut / …`); footer buttons = exposed library buttons.
  - ⋮ menus = library `contextual-menu` (`.menu-item-action`, Leading Element Icon) with
    instance overrides to the code size (padding 4, gap 2, radius 12, rows 32 = 6/12/6/8,
    16px icon, width = content, min 180); danger items keep text/danger, unavailable = State
    Disabled. Open menu: trigger `btn` Strict State=Focus, menu right-aligned **8px** below it.
  - Toasts = library `toast` (Style Success/Info, Text-only, Close), top-right 24px.
- **Borders in Figma:** strokes are inside and counted in layout, so padding = the CSS
  padding only (never CSS padding + border width, e.g. no 1px wrappers, 8 not 9).

### Permisiuni — user and role profile (2026-10-04)

`renderPermissionsTab(subject, state)` — the same tab for a user (`grantedPermissions`, has
`roleCombinations`) and a role (`functii`). Pattern = the passport list (as Taxe):
- Section title „Permisiuni” + meta „N acordate din M”. Toolbar: chips **Toate · Acordate ·
  Neacordate · Modificate** (the last only while there are changes; count badges) left, the
  library search right (filters in place, no dropdown). List in `.e-permits-sum-list` with the
  tray note (user: permissions come from roles, granted / withdrawn individually here; role:
  applies to every user with the role).
- Groups = collapsible stack groups: name · badge „acordate/total” · what changes, specific:
  „N adăugate” (success, green) and „N retrase” (danger, red) · chevron. A search or a filter opens every group with matches (toggle disabled,
  chevron hidden); no match → `renderNoResults`.
- Row = stack item: title is the `<label>` of the **product switch** on the right (on =
  granted); one source line (user only): „Din rolul X” · „Acordată individual” · „Face parte
  din rolul X” (off) · „Se acordă individual, peste roluri” · „Din rolul X — se retrage doar
  pentru acest utilizator”. A tag only for what changes: **Se acordă** (success, green) / **Se retrage**
  (danger) — no „Acordată” tag (the switch already says it).
- Draft (`permAdd` / `permRemove`; switching back clears the change). **Renunță · Salvează sit
  in the page header** with the status „● N modificări nesalvate” (as every profile draft;
  never inside the section). Leaving the tab / profile asks first. Save toast: „Permisiunile au
  fost salvate: 2 acordate, 1 retrasă.” (role: „… Se aplică tuturor utilizatorilor cu acest
  rol.”).
- Motion: the switch slides, the list re-renders after `PERM_SLIDE_MS` (220) and focus returns
  to the switch. Shared handlers: `handlePermClick` (groups, chips), `handlePermSearch`,
  `handlePermSwitch`, `refreshPermResults` (never re-renders the search field).
- Removed: the Adaugă / Retrage button pair, the search dropdown with checkboxes, the
  section-level Renunță / Salvează, the „Acordată” tags.
- Demo links: `usr-03` (tab), `usr-03a` (2 withdrawn, header dirty), `usr-03b` (search „aviz”),
  `rol-01`, `rol-01a`.

### Servicii › Setări — process switches (2026-10-04)

`renderServiceSettings(service)` — one compact section „Setări adiționale”. **Actionable →
the white bordered card** (`.e-permits-ntpl-card.e-permits-svc-settings`, padding 4 20, as
Șabloane / Clasificatoare › Setări); the grey card is only for read-only data. Seven rows (`SERVICE_SETTINGS`, alphabetical as in the registry): Act pe suport de
hârtie · Aprobare secundară · Cu expertiză · Cu plată · Distribuire automată · Livrare prin
MDelivery · Suspendare cu coordonare.
- Row `.e-permits-svc-setting` (padding 12 0, hairline between rows) holding the product toggle
  `renderToggle` — **switch first**, label 14/20 medium, one short tertiary line on what it
  changes (one sentence, no configuration details).
- Locked switch = `disabled`, and the line becomes the reason: Cu plată while active taxes exist
  („Are N taxe active — dezactivează-le întâi în Taxe și tarife.”); MDelivery while the act is
  not on paper. Turning paper off also turns MDelivery off.
- **Motion:** the switch slides (knob `transform` 200ms ease-in-out, track colour 200ms;
  none under `prefers-reduced-motion`). Never re-render a switch's own markup in the same
  tick as the click — that kills the transition. The settings handler logs with
  `logServiceEvents(…, { render: false })` and re-renders after `SERVICE_SETTING_SLIDE_MS`
  (220), then puts focus back on the switch.
- Change = immediate into the service draft: `geap.flags[key]` + event „Modificare setări”
  („<Setare>: activată / dezactivată”) → header „Modificări nepublicate” + Publică; toast; focus
  back on the switch. **No confirmation modal per switch** (switches act immediately; the
  change is reversible and not live yet). The confirmation with the exact changes is the
  Publică modal („Ce s-a modificat” lists every switch). Only the central admin edits.
- **Figma flow** (Servicii column 10): **10** default · **10a** switch flipped (switch Focus
  variant, success toast top-right 24/24, header status „● 1 modificare nepublicată”, Publică
  active, Jurnal +1) → **10b** Publică serviciul with „Modificare setări · Aprobare secundară:
  activată” → **10c** published (toast „Serviciu publicat”, status gone, Publică disabled,
  v2.1.1). Arrows: switch → 10a, header (Main Navigation instance) → 10b, modal Publică → 10c.
- Initial flags (`serviceSettingFlags`): avize → Cu expertiză; suspension / autoDistribution
  starting with „Da”; taxes → Cu plată; the rest off.

### Row actions, „Editează” and tag size — rules (2026-10-09)

**Row actions** (every stacked-list row; `renderRowActions` / `renderStackItem`):
1. Eye „Previzualizează” — only where a view-only preview exists: icon-only **`btn-strict`**
   (no background), `data-tooltip-label`, aria-label „Previzualizează: <name>”. First.
2. **One** labelled primary — `btn-neutral btn-sm`: **„Editează”** for anything that exists,
   „Configurează” only for what is not configured yet (tariff without a rule, request type not
   „Configurat”). Never an icon-only primary (the old ✎ on taxes), never two text buttons.
3. ⋮ (`renderStackMenu`) for everything else — constructive first (Publică, Activează, Aplică ca
   atare), destructive red last.
Why: NN/g — labelled actions are understood, icons alone rarely are; Carbon — secondary actions
in the overflow, destructive separated and last. Tables (registries) keep their icon-only ✎.
**Figma (2026-10-09, GEAP 2.0 › Servicii, all blocks):** svc/stack-item `9521:8751` — „Edit” is
button-filled-rectangular Neutral · Icon=Leading (16/edit) „Editează”; the secondary row button
was removed (its property too) — Activează / Aplică ca atare live in ⋮. Every „Editează” has the
pen; configured request types „Editează”, unconfigured „Configurează” + ⋮; Notificări rows
„Editează” (was „Deschide”); Formulare rows eye (button-text-rectangular Strict · Icon Only ·
20/eye-open) + Editează + ⋮; drawer peek eyes are the same strict eye (Focus kept on the open
one). Open menus follow code: Formulare = Duplică · Versiuni · Exportă setări (JSON) · Elimină;
inactive tax = Activează · Șterge (red, last). Applicant tags (Persoană fizică / juridică) carry
the filled person / suitcase icon (central icon system, filled=on, 16) everywhere; no Medium
product tags left (only the NOTĂ DEV / PM annotation tags are Medium).

**„Editează” always carries the pen** (`icon-edit`, small, before the label — same markup as
„+ Adaugă …”): `actionLabelHtml` / `EDIT_LABEL_HTML`, in rows, section headings and drawers.

**Tags = Figma tag-filled Small everywhere, tables included** (`.e-permits-workplace__tag`: 20px,
12/16 medium, px 6, radius 4; with icon `--icon`: pl 4, pr 6, gap 4, 16px icon) — user
2026-10-09 reverted the short-lived „Medium outside tables” rule. Value lists (`valueTags`) use the same tag. Neutral tag = library neutral subtle
(`background/base/tertiary`, default text) so it shows on white and on grey cards alike.
**Subtle tags have a 1px border** in their outlined twin's colour (library `tag-filled` Subtle,
Components file `doJ7tDY0PlQ0PqMgbpFVIC` › Tag `22:80`, 2026-10-09): Neutral / Muted
`border/base/default`; colours use the **subtle** step — new Foundations semantic tokens
`border/{positive,warning,danger,brand}/secondary` (light 200, dark 800; code: `--color-border-<tone>-secondary`
in e-permits-shell.css until main.css is re-synced); inside, so sizes do not change. Code: inset
`box-shadow` on `.e-permits-workplace__tag--{tone}`. PF / PJ tags lead with a filled icon
(`icon-person-filled` / `icon-suitcase-filled`, central icon system) via `applicantTags`.

### Servicii › Setări — US-221 (Azure 95229), 2026-10-09

- Tab order: **Setări right after Date generale** (AC-05).
- 11 sections in the story's order, each `renderPassportBlock(title, rows, { actionHtml: Editează })`:
  Solicitant și act · Examinare și distribuire · Suspendare · Semnare · Plată · Livrare și
  eliberare · Contestare · Numerotare · Publicare în RAP · Schițe · Interdependențe (stacked
  list: Editează + ⋮ Elimină; „Adaugă interdependență” `btn-secondary`). Then „Alte setări” — the
  three switches outside the story (Aprobare secundară, Cu expertiză, Suspendare cu coordonare),
  unchanged, instant.
- RSSP values: value left + plain caption „Din RSSP” at the row's right end (`.e-permits-cfg-value--rssp` + `.e-permits-cfg-source`, 12/16 tertiary like the header „sincronizat …”; no tag), also inside the drawer's grey read-only box, read-only for everyone; MPower,
- **Tip solicitant** (read view, drawer, v2) = `applicantTags` with the full names („Persoană fizică” / „Persoană juridică”, never PF / PJ) and the
  filled person / suitcase icon, never plain „PF, PJ” text.
- **Setări (one page; was „Setări v2”, `renderServiceSettingsV2`, states svc-10…10o, svc-10v…10v4):**
  the same sections on one page, edited inline, no drawers / modals. Layout `.e-permits-cfg2`:
  sticky section list left (220px, `__nav-link` 14/20 secondary; hover base-secondary; current
  `aria-current` = brand-secondary bg + brand text medium; focus ring; dot warning = changed,
  danger = errors; sticks under the pinned tab row via `--cfg2-stick`, active section follows the
  scroll), sections right (title 18/26 flush + 14/20 secondary description, then a white
  `.e-permits-ntpl-card` with the drawer's fields; radius 16 + padding 20 — 32 was tried and read
  too round; grey boxes inside 8; the section title / description get 20 side padding to line
  up with the card content). **Inside the card: grey filled boxes are fine,
  no bordered box** (user 2026-10-09) — read-only RSSP grey box, grey notes, grey rule /
  interdependence blocks and the grey switch group stay; the repeated „Preluat din RSSP”
  hint is hidden (caption + section description say it). **Spacing:** card padding 20; 24 between
  fields (the drawer keeps 32); 16 inside a switch group (drawer too); RAP list sits 24 under its note, first /
  last row without outer padding (drawer too), so the card padding is the only bottom space.
  List sections (Numerotare, Interdependențe): 12 between blocks, 12 from the last block to
  the add button, 12 from the button to its note. Section list: 16px grey icon per section
  (`CFG2_ICONS`, central icon system, always with the label; brand on the current item);
  current = brand-secondary + brand text, **medium** — the text reserves its medium width with a
  hidden `::after` copy (`data-text`), so it never shifts; no transitions (hover follows the
  pointer exactly); hover base-secondary-hover (+ brand
  hover on the current one); no underline in any state; scroll tracking pauses ~900ms after a click so the highlight does not
  flicker through the sections it scrolls past. The old read view + per-section drawer are
  gone. US-221 AC-01: a role without configuration rights has **no Setări tab** (tab `visible: isCentralAdmin`, a hash to it lands on Date generale; demo svc-10r) — there is no read-only Setări view.
  One draft for the page (`cfg2`): header caption „● N modificări nesalvate”; the only Renunță ·
  Salvează live in the **sticky save bar** at the bottom (`__bar`, appears with the first change,
  counts „N câmpuri de corectat” after a failed save; Shopify contextual-save pattern — the header
  scrolls away on a long page). Removing an interdependence needs no confirm (nothing applies
  before Salvează). Leaving the tab / profile with a draft → „Renunți la modificări?”. Fields,
  validation and audit events are the drawer's: handlers `onCfgClick/Input/Change` run in a
  context (`cfgWith({ draft, body, render, prefix })`); repeated forms prefix their ids.
  MDelivery and aprobare tacită become switches only when RSSP sends nothing (`cfgRssp`).
- **Figma — Setări (2026-10-09, GEAP 2.0 › Servicii; band 02, Setări is the 2nd tab — the whole
  page was renumbered to the tab order: 01 Date generale · 02 Setări · 03 Tipuri solicitări ·
  04 Formulare · 05 Documente · 06 Taxe · 07 Tarife · 08 Clasificatoare · 09 Șabloane ·
  10 Notificări · 11 Jurnal; columns placed left → right in that order):** only **02** (default) is
  full height; every other Setări screen is a **fixed 1024 viewport scrolled to its section** —
  header collapsed to the pinned tab row (`header · lipit (doar tab-uri)`, Main Navigation at
  y −140), section title 24 under the tabs, section list sticky (nav padded down by the scroll),
  save bar pinned at the viewport bottom. Columns: left **02s1–02s11** = one screen per section-list
  item (current item highlighted; links svc-10e…svc-10q), middle **02 · 02a · 02o · 02b · 02c ·
  02v4**, right **02e1 · 02j · 02j1 · 02h1 · 02k1 · 02n · 02n1 · 02n3** (scrolled to their
  section / new block). 24 flows „Flow · Setări · …”: section-list item → section screen (left
  gap), change → state (right gap), save/publish chain, errors after Salvează. Section-list icons =
  central icon system **filled=off, stroke=1, radius=2, join=round**, 16px (as the code sprite).
  Local components (🧩 Componente locale › „Componente · Setări”): Setări · Element listă secțiuni
  `10638:1533`, Setări · Bara de salvare `10638:1534`, Setări · Câmp read-only `10638:1577`;
  svc/field-row has optional „Text secundar” + right „Caption”. Helpers (do not edit): builder
  `10640:1502`, default spec `10648:1502`, scroll `10666:1502` (SCROLL(block, {key|node|top})).
- **Editează** → standard drawer `#svc-cfg-drawer` (title = section, subtitle „Setări · serviciu”,
  footer „Intră în vigoare după publicarea pașaportului.” · Anulează / Salvează). Fields: fo-select,
  numeric fo-input, checkbox groups, `renderToggle` switches (full row, no row rule / padding —
  the grid gap spaces them); a switch that unlocks fields (Distribuire automată, Suspendare
  personalizată, Serviciu contestabil) stands on its own; **only while it is on** a **grey**
  group `.e-permits-cfg-group` appears under it (12 below, inside `.e-permits-cfg-cascade`;
  background base-secondary, radius 8, padding 16, gap 16, fields 16 apart — user 2026-10-09:
  grey, never bordered, no indent). A group of several checkboxes (`cfgChecks` →
  `.e-permits-cfg-checks`) has a **medium** label, so it reads as a heading over its options. Its hint sits **under the title, before the options**
  (`cfgField({ hintTop })`, `.e-permits-fo-field__hint--top`: 4 under the title, 12 above the
  options).
  **RAP rows** = field name + the Documente pair of checkboxes in grey containers
  — the checkbox option component `renderCheckOption()` (Figma Small, 20px box): „Publică” (the field goes to RAP) · „Anonimizează”
  (it goes masked) — the second is disabled with a reason until the first is ticked; PF personal
  data (IDNP, nume) = Anonimizează ticked + disabled („se publică mereu anonimizat”). Add
  buttons (Adaugă regulă / interdependență) = `btn btn-secondary btn-sm` + `icon small` + span,
  like every „Adaugă …”. Switches/checkboxes never redraw the drawer (keeps the
  library transition); a group switch redraws 200ms later, after the knob slides. Read view:
  Da = success tag with checkmark, Nu = neutral tag. Read-only RSSP fields =
  grey box `.e-permits-cfg-ro` + tag. Numerotare = one grey `.e-permits-tax-cond` block per rule
  (Tip document · Resetare · Prefix · Separator · Lungime · Valoare inițială · Valoare curentă) +
  „Exemplu (numărul următor)”, max one rule per document type. RAP = rows checkbox + switch
  „Anonimizare” (IDNP / nume PF always anonymised, switch locked on).
- Validation: „Câmpul este obligatoriu.” / „Introdu un număr întreg mai mare ca zero.” under the
  field. Save logs one audit event per changed field („Secțiune · Câmp: vechi → nou”), the header
  shows „N modificări nepublicate”, the tab shows „Editat <dată> · <user>”. Interdependence
  removal = confirm „Elimină interdependența” (Anulează · Confirmă). Unsaved drawer → „Renunți la
  modificări?”.
- „Termenul de achitare (zile)” (Plată) prefills every new tax (AC-45, `defaultPaymentTerm`).
- Demo: `svc-10` (view), `svc-10d…10m` (one drawer per section), `svc-10e1`, `svc-10h1` / `svc-10j1`
  (validation), `svc-10k1` (2 rules), `svc-10n` / `10n1` / `10n2` / `10n3` (interdependence add,
  validation, edit, remove), `svc-10o` (after save).

### Servicii › Șabloane de tipar — service-only templates, JSON test data (2026-10-09, comments 1957263114, 1957270082)

- **Only this service's templates.** No shared catalog: „Atașează șablon”, „Detașează”, „Șterge
  din catalog” and the Vizibilitate field are gone. Toolbar: „Importă din MDocs” (`btn-neutral`)
  · **„Șablon nou”** (`btn-secondary` + plus, `#dtpl-new-modal`: Denumire*, Tip document*, Cod în
  MDocs* — follows the name via `dtplCodeFrom` until typed; unique per service) → „Creează și
  deschide constructorul”. A new template is `status: "draft"`, v0.1.0, tag „Schiță · nepublicat
  în MDocs” (list + constructor header); the first „Publică în MDocs” makes it v1.0.0.
- ⋮ = **Șterge** only (destructive confirm naming the request types that generate it). Details
  drawer: Identificare + „Din MDocs” (Cod, Versiune, Tip, Generat la).
- **Date de test = one JSON object**, as in MDocs: key = field name, nested objects fill dotted
  fields (`dtplFlatten`). Prefilled with every field the template uses (current or sample value).
  Under the editor: status („N câmpuri cu valoare de test” / Romanian error „JSON invalid la
  linia L, coloana C: …”) + „Completează cu exemple” · „Formatează” (aria-disabled with a reason
  while invalid); notes: Câmpuri necunoscute (error), Fără valoare de test, Chei care nu apar în
  șablon. Previzualizare keeps the last valid data and warns when the JSON has errors.
- Demo: `svc-08c` (modal), `svc-08c1` (validation), `svc-08c2` (draft in the constructor),
  `svc-08k` (Șterge), `svc-08f` (JSON), `svc-08f1` (invalid JSON), `svc-08f2` (preview warning).
  The constructor opens from the preview footer („Deschide constructorul”).

### Full-screen template editor header — publish status under the button group (2026-10-09)

The status caption („Nepublicat încă” / „Publicat … · …” / „vX intră în vigoare pe …”) ends under
**Publică**, not under the ×: `.e-permits-page-header__aside:has([data-ntpl-sheet-close])
.e-permits-page-header__caption` pads right by × (32) + divider (1 + 2×4) + two gaps (2×8).
Figma „Șablon notificare / Header” = Sync Information (H, top) › [Publish group (V, right):
Renunță · Salvează · Publică / caption] · divider (1px line, 4 inset) · ×.

### Menus and dropdown lists in Figma — library instances only (rule, 2026-10-09)

An open ⋮ / action menu is always the library **`contextual-menu`** (rows `.menu-item-action`,
Leading Element = Icon, State Default / Disabled; destructive rows get `text/danger` +
`icon/danger` overrides). An open select list is always **`selection-menu`** (rows
`.menu-item-selection`, State Default / Hover / Selected). Both hold max 6 rows (a longer list
shows its first 6, like a scrolled dropdown). Never hand-build `fo-intent-menu` /
`fo-select__list` frames or detach these components. Trigger State = Focus, menu right-aligned
8 below it; widen the instance until no label wraps.

### Notification template › Destinatari — recipient rules (2026-10-09, comment 1957279684)

Shared by the global Șabloane editor and the service editor (Servicii › Notificări, full screen).
- List = stacked list „Reguli de destinatari” (title Destinatar + tag Activă/Inactivă; meta
  „Livrare: …” · „Un mesaj comun / Un mesaj pentru fiecare destinatar”); row action
  „Editează” + ⋮ (Dezactivează/Activează · Șterge). „Adaugă regulă” (`btn-secondary`) on the
  section header.
- **Add / edit** = the standard modal (`#ntpl-rule-modal`): title „Regulă nouă” / „Regula N”,
  subtitle „Regula intră în vigoare după publicarea șablonului.”; Destinatar + Livrare
  (fo-select, required), switches Mesaje separate / Regulă activă; Anulează · Salvează.
  New rule defaults: Solicitant · Email · common message · active.
- **Dezactivează / Activează** → `askConfirm` (deactivate = destructive).
- **Șterge** → `askConfirm` destructive („Ștergi regula?”). On the **only** rule the item is
  `aria-disabled` with `data-tooltip-reason` „Șablonul are nevoie de cel puțin un destinatar…”
  (same rule as the creation wizard).
- Every change marks the template unpublished (banner) and takes effect after publishing.
- Demo: `ntpl-03`, `ntpl-03a` (edit), `ntpl-03c` (add); service editor `svc-09f`, `svc-09f1`
  (add), `svc-09f2` (edit), `svc-09f3` (⋮), `svc-09f4` (Șterge blocked), `svc-09f5` (delete
  confirm, 2 rules), `svc-09f6` (deactivate confirm).
- Figma: `Modal` (Tip=Conținut) + local component „Modal conținut / Regulă destinatar”
  `10567:43442` (page „🧩 Componente locale”); blocks Servicii 09f1–09f6, Șabloane 03a, 03c.

### Servicii › Notificări — clone drawer, full-screen template editor, row actions (2026-10-03)

A service's own notification templates (US-187) use the **same editor as the global
Șabloane page**, not a read-only inline view.

**Șablon nou** (service toolbar) opens the **same 4-step wizard** as the global page
(`openNtplCreate({ service })`): code / name unique within the service, subtitle
"Serviciul {code} · …", the result lands in the service list and opens in the sheet.
Toolbar (the passport list pattern, as Taxe): library Search on the left
(`e-permits-pay__search`, 320) · actions on the right (Clonează neutral, Șablon nou
secondary). No subtitle line under the section title; the explanation is the list's
note tray (`renderListNote`, see Sum list).

**List** (Notificări tab): stack rows `Deschide` + the `⋮` stack menu (central admin):
Activează / Dezactivează (`pause` / `checkmark-large`; deactivating asks via
`askConfirm`) · Șterge (danger, `askConfirm` destructive). Toolbar: Clonează (neutral) +
Șablon nou (secondary).

**Clonează → centred library modal** (`#ntpl-clone-modal`, `modal--md`), progressive
(PM decision 2026-10-03: no radio list scrolling inside a drawer — the clone needs one
choice, then details):
1. "Șablonul sursă" — the library **select** (`renderFoSelectControl`, options
   "name · code", system templates only) + hint "Se pot clona doar șabloanele de sistem…".
2. After a pick: passport block "Ce se copiază" (Sursa de date, Destinatari, Limbi) +
   Cod / Denumire **stacked full width** (names are long; prefilled from the source,
   editable; Cod unique per service).
Footer Anulează / Clonează. Error without source: select in error + "Alege șablonul
sursă.". On success the copy (`active:false, unpublished:true`) opens in the full-screen
editor. **The same pattern** is used by Servicii › Șabloane › Atașează șablon
(`#dtpl-attach-modal`: catalog select → "Șablonul ales" passport).

**Deschide → full-screen sheet** (`.e-permits-ntpl-sheet`, `data-ntpl-sheet`): fixed,
**24px clear at the top** (`--spacing-24`) so it reads as a modal over the passport;
library backdrop rgba(0,0,0,.4); panel top radius 16, `--shadow-300`, scrolls inside,
slides up 24px in 200ms. z-index 950 — library modals (1000: publish, rule, confirm) and
drawers (1200) open above it. The `[data-ntpl-profile]` node is **moved** into the sheet and
back (comment placeholder), so every editor style/handler is shared; scope lives in
`ntplProfileState.service` (`ntplCurrent()` / `ntplScopeList()`; no `#sablon` hash in
service scope). Header: crumbs Configurări servicii › {code} › Notificări › {template code}
(each closes), actions Renunță / Salvează / Publică as on the page, then a 1px divider and
an icon-only `btn-strict btn-sm` close (tooltip "Închide"). Meta "Sursă" = "Clonat din
{tag}" or "Creat în serviciu". Never-published copy banner: "Șablonul nu a fost publicat
încă. Destinatarii nu primesc nimic până la publicare." Esc / scrim / close ask first when
there are unsaved edits.

### Servicii › Șabloane — document templates (MDocs): list, drawers, constructor (2026-10-03)

Service passport tab "Șabloane" (`renderServiceDocTemplates`, rows normalised by
`serviceDocTemplates`). Screens shown by PM were reference for **actions and data only**,
everything is built from library components.

**List** — section "Șabloane de tipar", no subtitle; toolbar = Search left (320) ·
Importă din MDocs (neutral, download icon) + Atașează șablon (secondary, plus) right. Stack row: title + status
tag (Publicat success / Modificări nepublicate warning); meta: code tag · version · type ·
"Editat {stamp} · {user}" · source tag MDocs (info); meta2 = description. Actions:
icon-only `btn-strict` eye ("Deschide constructorul") · Editează (neutral) · ⋮ stack menu
Detașează (`cross-large`, confirm) / Șterge din catalog (danger, destructive confirm naming
how many services use it).

**Editează → standard drawer** (`data-dtpl-edit-drawer`): Identificare (Denumirea
șablonului*, Descriere scurtă with counter) · Vizibilitate și acces (select: Doar acest
serviciu / Serviciile autorității / Toate serviciile; hint "Cine poate vedea și reutiliza…")
· read-only passport "Din MDocs" (Cod, Versiune, Tip, Folosit în). Not the constructor.

**Atașează → centred library modal** (`#dtpl-attach-modal`): same pattern as Clonează —
select of catalog templates not yet attached → "Șablonul ales" passport (Tip, Versiune,
Folosit în, Descriere).
**Importă din MDocs → library modal** (`#dtpl-import-modal`): Cod MDocs*, Denumire*, Tip.

**Constructor → full-screen sheet** (`.e-permits-ntpl-sheet.e-permits-dtpl`, 24px clear
top, panel = flex column, no outer scroll):
- Head (3-col grid): version tag · name · copy-code | segmented Șablon / Date de test /
  Previzualizare | state tag (Modificări nesalvate / nepublicate, warning) · Istoric
  versiuni (neutral, `history`) · Publică în MDocs (primary; aria-disabled + reason when
  nothing to publish) · divider · icon-only close.
- Banner (only when MDocs changed by someone else): `message--subtle banner--warning` +
  `btn-text-primary` "Descarcă din MDocs" (confirm). Publishing over it asks first.
- Șablon: left 300px "Câmpuri disponibile" (hint, library search, collapsible groups with
  count, items = picker item label over `{{Token}}`, click inserts at caret, draggable) |
  editor: Vizual/HTML segmented + Fundal pagină / Import din XML (neutral, real file
  inputs) · toolbar (fo-select paragraph style + the ntpl tool buttons) · hint + tag
  "N câmpuri inexistente" (danger) / "Toate câmpurile există" (success) · grey canvas with
  an A4 page (210mm, shadow-200). Tokens are non-editable chips: brand = known,
  danger + wavy = unknown, neutral = `{{#if}}` logic.
- Date de test: narrow column, info note, one input per used token grouped by source;
  unknown tokens first, inputs in error state.
- Previzualizare: the A4 page with test values (marks), `{{#if}}` resolved.
- Footer: summary ("Salvat {stamp} · {user}" / "Modificări nesalvate") · Anulează /
  Salvează (aria-disabled when clean). Save = draft (status unpublished); Publică bumps the
  minor version and adds a history entry. Esc / scrim / close confirm when dirty.

### Clasificatoare — catalogue, profile, lifecycle (added 2026-10-02)

Back-office module for governed reference lists (Features 91423 / 91424, Concept v0.2).
Code: `js/e-permits-shell.js` section "CLASIFICATOARE"; pure logic in `core/classifiers.js`
(tests: `test/classifiers-lifecycle.test.mjs`, `test/parity.classifiers.mjs`); rights in
`core/permissions.js`. Data: `data/classifiers/classifiers.json`, `data/catalog/clas-field-types.json`.
Route: `#classifiers` (catalogue), `#clasificator/<id>/<tab>` (profile).

**Catalogue** — the shared workplace registry, `workplaceDb.kind = "classifiers"`.
Columns: Denumire (sticky; name over description, `e-permits-workplace__case-cell`) · Domeniu (tag:
Sistem neutral / Global brand / Autoritate info / Serviciu neutral) · Familie · Sursă · Utilizat de
(modules over objects) · Valori · Versiune · Modificat (`renderDateTime`) · Statut (tag).
Tabs Toate / Publicate / Ciorne / Arhivate. Facets: Statut, Domeniu, Familie, Sursă, Autoritate,
Utilizare. Toolbar primary action "Clasificator nou" (`data-workplace-add-classifier`).

**Profile** — standard page header (breadcrumb Administrare › Clasificatoare › name, title,
actions, caption), meta row (Domeniu, Familie, Sursă, Versiune, Statut, Autoritate), sticky tabs:
Valori · Coloane (`#…/coloane`, ex-Câmpuri: values are a table and a CSV, so "coloană" is the word users see) · Mapare MConnect (only `mod = mconnect` or `sursa = api`) · Hartă dependențe ·
Jurnal de evenimente · Setări. A state notice sits above every tab:

| State | Notice |
|---|---|
| archived | **lock notice** "Doar consultare. … arhivat … Republică-l ca să-l poți edita." |
| local admin, flag off | **lock notice** "Doar consultare. Administratorul central gestionează…" |
| values from MConnect / API (Valori) | **lock notice** "Valorile nu se editează manual. …" |
| structure, not central admin (Coloane) | **lock notice** "Structura nu se editează aici. …" |
| draft over published | `banner--warning` "Ciornă nepublicată. Consumatorii văd încă vX · N noi, M modificate…" (`core.draftChanges`) |
| never-published draft | info note "nu este disponibil consumatorilor până la prima publicare" |

**Lock notice** (`clasLockNotice`, added 2026-10-02): anything the user cannot edit is
announced with the amber `message message--subtle banner--warning` + `icon-lock` and a bold
lead, never with the grey "i" info note — read-only is a restriction, not information. Only
one lock notice per screen (the tab-level ones are skipped when the classifier is already
read-only).

**Lifecycle actions** (header, from `core.statusActions` + `discardMeta`; primary is the right-most):

| Status | Actions |
|---|---|
| draft, never published | `btn-outline-destructive` Șterge ciorna · `btn-primary` Publică |
| draft over published | `btn-neutral` Renunță la ciornă · Arhivează · `btn-primary` Publică |
| published | `btn-neutral` Arhivează |
| archived | `btn-primary` Republică |

Every action goes through `askConfirm` and says the consumers it affects. "Publică" names the next
version (`core.nextVersion`) and lists the changes. Non-intern sources add `btn-secondary`
"Sincronizează". On the Setări tab with unsaved edits, Renunță · Salvează are prepended.

**Editing rule** — no edit touches a published classifier in place: the first save calls
`core.beginDraft` (snapshot kept), then logs "Ciornă deschisă". Archived blocks every edit (manual,
import, sync). Values are never deleted — only `activ` on/off; inactive rows render tertiary text.

**Valori tab — full-width compact table, edit in the drawer** (updated 2026-10-02; the
inline row editing tried first was dropped: a value has 8–12 fields, so editing in the row
forced sideways scrolling, and pinned columns took the space). The panel gets `.is-wide`;
the tab renders the registry table: `.e-permits-workplace__table-wrap` >
`table.e-permits-workplace__table.e-permits-clas-grid__table` with an explicit pixel width
(sum of columns, as the registry) and `setColumnWidth` on each `th`; Denumire RO takes the rest.
- Columns: select · Cod (96) · Denumire RO · Traduceri RU · EN (220, two lines "RU · …" /
  "EN · …", ellipsis per line) · Valoare-părinte (150, code + name, tooltip) · extra columns ·
  Activ de la (112, `dd.mm.yyyy`) · Stare (180: Activ/Inactiv + Nouă/Modificată +
  "până la …") · actions (136, the only pinned column). Cod is NOT pinned.
- Toolbar: registry search · chips Toate/Active/Inactive with `.badge--lg.badge--solid-light`
  (as Tarife/Plăți) · Importă CSV · Adaugă valoare; with a selection: "N valori selectate ·
  Activează · Dezactivează · Anulează selecția".
- **Editing:** click a row (or Enter/Space on a focused row, rows are `tabindex=0`) or the
  pencil opens the `.e-permits-user-create` drawer: Identificare (Cod, Valoare-părinte) ·
  Denumiri (română required, rusă, engleză) · Coloane suplimentare (toggle / select / input
  by type) · Valabilitate (two library date pickers). Footer: summary ("Salvarea deschide o
  ciornă peste vX.") · Anulează · (new only) `btn-secondary` "Salvează și adaugă alta" ·
  Salvează. Activation is not in the drawer — it is a confirmed row / bulk action.
- Row actions: Editează · Dezactivează (`icon-pause`) / Activează (`icon-checkmark-large`) ·
  Șterge (`icon-delete`, `aria-disabled` + reason when the value was published).
- Renaming a code that children use asks first (`askConfirm`, raised above the drawer).

**CSV import** (`#clas-modal`) — accepted column keys shown as neutral tags; "Descarcă modelul CSV";
preview lists new / updated / ignored rows; unknown columns named in a `banner--warning`; missing
required columns block "Importă" with a `banner--error`. `;` or `,`, quoted fields, BOM ok.

**Sync** (MConnect/API) — confirm → apply (`core.applySync`: absent values auto-deactivated) →
summary modal (noi / actualizate / dezactivate automat) plus a warning naming the consumer modules.

**Hartă dependențe** — Consumatori (stacked list) · Ierarhie (`.e-permits-clas-node` cards:
ancestors → current (brand-secondary, `aria-current`) → children, indented with a 2px rail) ·
Creat din (dead copy lineage, kept separate from the hierarchy) · Autorități și servicii.

**Create wizard** (updated 2026-10-02) — the classifier drawer opened as
the standard `.e-permits-user-create` drawer (normal width, as every other drawer),
content in its 20px gutter. Under the header, the **step strip**
`nav.e-permits-steps-strip` (Figma GEAP 2.0 `8772:118666`, `.step-desktop` horizontal):
24px numbered circle + 14/20 label side by side, 36px × 1.5px line between steps, padding
16/20, bottom border. Current = brand ring + medium label; completed = brand-filled circle
with `checkmark-small` + underlined label, a `button` (`data-clas-create-goto`) to go back;
incomplete = grey ring, secondary label. Reusable for any multi-step drawer. Footer: "Pasul n din 4 · …" · Anulează/Înapoi ·
Continuă / Creează ciorna. Each step validates before moving on; closing with data asks
first (`askConfirm`, destructive).
1. **Date generale** — Denumire (unique), Descriere, Familie; Categorie Global/Specific (hint
   says who can use it) + Autoritate + Servicii (with the grey info note "Un singur serviciu → domeniul „Serviciu”…"); **Punct de plecare** Zero / Copia unui
   clasificator (+ source select; copies its extra columns and ID format).
2. **Structură** — standard columns as neutral tags (locked); extra columns edited in rows
   `.e-permits-clas-create__col-row` (name · type select · settings: options for Selecție,
   classifier for Referință · delete icon-action) + "Adaugă coloană"; Format cod INT/UID;
   Clasificator-părinte; Acces toggles (central only).
3. **Valori** — copy: subset checklist (all checked). Otherwise Sursa Intern / MConnect / API:
   Intern = radio "Fără valori acum" / "Import din fișier CSV" (accepted keys from step 2,
   template download, preview, unknown-column warning). MConnect / API = **Link la sursă**
   (https only) + `btn-secondary` "Testează conexiunea" → success message
   (`e-permits-fo-field__success`: records + fields found) and the mapping proposed as selects
   of the detected fields; the test is required.
4. **Revizuire** — `renderPassportBlock` per step with a "Modifică" text button, then an info
   note: the classifier is created as **ciorna v0.1**.
In the profile the source is a link: meta "MConnect · Deschide sursa ↗", Mapare tab
"Link la sursă" (link ↗ + copy icon-action). Seed endpoints are demo https addresses.

Field errors clear as soon as the field is edited; validation re-runs on save.

**Roles** — central admin (`adm-c`): everything. Local admin (`adm-l`, assignment
`ansp-local-admin`, menu profile `local-admin` with a single Clasificatoare item): sees only its
authority's *specific* classifiers; edits values only where `localAdminManageable` is on; never the
structure (fields, parent, ID format). "Critic pentru proces" forces the flag off.

**Open divergences (Feature ↔ Concept) — implemented as below, still awaiting PO decisions:**

| ID | Topic | What the code does now |
|---|---|---|
| DIV-C1 | Immediate effect vs Draft → Published | Concept-ward: edits open a classifier-level draft over the published snapshot; consumers keep the published version until "Publică". Not per-change versions; no blocking of disruptive changes. |
| DIV-C2 | Local admin right: perimeter or flag | Both: perimeter (own authority, specific) AND `localAdminManageable`. Flag set in Setări by central admin. |
| DIV-C3 | Deactivation vs deprecation with replacement code | Feature: active/inactive only, no replacement code. |
| DIV-C4 | Environment promotion DEV → PROD | Not modelled; single environment. |
| DIV-C5 | Two "parent" relations | Separated: "Clasificator-părinte" (live hierarchy) vs "Creat din" (dead lineage), shown apart in Setări and the dependency map. |
| DIV-C6 | Local admin read access to global classifiers | Hidden: local admin sees only its authority's specific classifiers. |
| DIV-C7 | Auto-deactivation on sync without preview | Feature: applied immediately; summary shown after, with the consumer modules. Not blocking. |
| DIV-C8 | Archive effect on consumers | Archive is read-only for edits/import/sync; nothing happens automatically in consumer modules. |

### Post-procese — titular, Part I (added 2026-10-06)

Spec: Feature 89533 / 90818, US-55, US-191 and the stories in `docs/azure/` (map:
`docs/azure/postprocese-harta.md`). Data: `data/acte-permisive.json` → `frontOfficeFlows[0].intent`
(`postProcesses`, `availability` = status matrix, `services` 09/10/DEMO with `allows`/`terms`/
`delivery`, `reasons`, `activityTypes10`, `acts` by subject). Code: `js/e-permits-acte-permisive.js`
(post-process module) and `cabinet-evo/cabinet-evo.js`.

**What is available** = status matrix (US-55) ∩ `services[act.service].allows`. Paper or historical
acts (`act.paper`) have none and show the offline-flow notice. One active post-process per act
(`act.pending`) → the act is locked.

**Entry 1 — EVO Cabinet /permits** (`cabinet-evo/index.html?as=<subject>`):
- Act card: `.cab-card__heading` (title + status tag) over `.cab-card__service`; ⋮ = library
  `btn-icon` → `.e-permits-fo-intent-menu.cab-menu` with Vezi detalii / Descarcă /
  `.cab-menu__separator` / `.cab-menu__label` „Postprocese” / one item per post-process.
  A locked act's items are disabled (`.cab-menu__item[disabled]`).
- Act detail `.cab-detail*`: back link, notice (paper / pending), summary card, Descarcă, the same menu.
- Suspendare / Retragere first open `[data-cab-pp-modal]` (consequence + Continuă). **UX proposal** —
  the spec does not ask for it; keep it labelled as such in Figma.
- Every action redirects to `e-permits-acte-permisive.html?flow=full&pp=<type>&act=<id>#request`.

**Entry 2 — „Ce vrei să soliciți?” (US-191)** — never skipped (unless notarial proxy).
„Solicitare nouă” is always there; under it the acts of the current service with ≥1 post-process.
- Locked act: `.e-permits-fo-intent-act.is-locked` + `.e-permits-fo-intent-act__pending`
  (`icon-time`, „Post-proces în curs · GEAP-…”) and a disabled trigger.
- No acts: `[data-fo-intent-empty]` `.e-permits-fo-intent__empty` (inline info note)
  „Dumneavoastră nu aveți acte emise pentru serviciul dat.”

**The wizard** (`body[data-fo-postprocess]`, `startFrontOfficePostprocess(act, pp)`; Solicitare nouă
calls `stopFrontOfficePostprocess`). It reuses the primary FO wizard; only content changes:

| Step | Post-process content |
|---|---|
| 1 Date solicitant | `[data-fo-pp-request]` `.e-permits-fo-pp-request` card: Serviciul · Tip solicitare · Numărul actului permisiv (read-only); role „Schimbă” hidden |
| 2 Detalii solicitare | `.e-permits-fo-pp-lead` (type · act no. · object), then per type: reperfectare 09 = motiv + primary form prefilled; reperfectare 10 = address cascade, activity type (+ hemp fields), responsible person, scope; prelungire = act data read-only; duplicat = motiv (Deteriorare / Pierdere); retragere = subdiviziune (09, read-only) + motiv; suspendare = motiv, data, termen + note; reluare = motiv + note |
| 3 Acte necesare | previous act as an MDocs attachment (Descarcă) + reason-specific doc fields |
| 4 Verificare și semnare | review rows built from step 2 (empty optional fields skipped) + Persoana de contact |
| 5 Livrare | read-only (EVO Cabinet + pe hârtie) |
| 6 Plată | hidden when the service has no fee (09/10); 7 is renumbered 6 |
| 7 Finalizare | summary (Tip, Serviciul, Nr. act, Nr. dosar `GEAP-2026-<code>-<n>`, Autoritatea, Termen), tracker Depusă → Examinare → Decizie → result, no Plată |

- Selects: library `.e-permits-fo-select` with `data-fo-pp-select` / `data-fo-pp-required`;
  `selectOption` dispatches `fo-select-change`. „Alte” reveals `[data-fo-pp-other]` (textarea, required).
- Validation on Înainte: inline `message message--inline e-permits-fo-field__error` „Câmp obligatoriu”.
- Notes (`.e-permits-fo-pp-note`) = inline info note, e.g. „…se va relua din data semnării deciziei”.
- Suspendare / reluare fields and the DEMO service are **de confirmat** (no US yet).

**Demo states** (`js/demo-states.js`): `pp-01…01i` Cabinet, `pp-02…02c` intent (02c = MPower subject
with no acts), `pp-10…10g` reperfectare 09 (steps 1/2/errors/3/4/5/7, PF), `pp-11` reperfectare 10,
`pp-12/12a` prelungire, `pp-13…13b` duplicat, `pp-14…14b` retragere, `pp-15/15a` suspendare,
`pp-16/16a` reluare.

### Logare în Back Office / Admin Portal — MPass (added 2026-10-06)

US-105 (logare), US-110 (ieșire); states from US-107 (sesiune expirată) and US-109 (MPass
indisponibil). Page `bo-login.html` + `js/bo-login.js` + `css/bo-login.css`; Figma: section
„Autentificare · Back Office / Admin Portal” on „↳ BO -> Application Shell”.

- **Reuses the EVO auth page**: `.e-permits-fo-auth` header (gov top line + brand bar with
  „e-Permis <Back Office|Admin Portal>”, `.bo-login__product`; no profile before login — US-110
  AC-01) and the card `.e-permits-fo-auth__card` (lock 36 + h1 + description + MPass
  `btn-badge--mpass` + separator + `.bo-login__help`).
- **States** (`?view=` / `?mpass=` / `?ended=`): login · redirecting (badge button Loading) ·
  denied (red lock, AC-10 text verbatim, `.bo-login__identity` = who MPass confirmed, IDNP masked,
  `btn btn-neutral` „Ieșire” = SLO) · retrying (spinner large brand, „încercarea N din 3”) ·
  unavailable (warning-filled 36, `btn-primary` „Reîncearcă”) · expired (inline warning note in the
  card — the user did not choose it).
- **Logout feedback = toast**, not a card note: `GEAPToast.show({ type: "info", title: "Te-ai
  deconectat", … })` with ×. Shell „Ieșire” (`.e-permits-shell__profile-logout`) →
  `bo-login.html?ended=logout`.
- `?portal=admin` = Admin Portal (product name only; landing = Utilizatori — de confirmat).
- Demo states `auth-01 … auth-06` (`page`-based, incl. `mpass-test.html`).

## 5. Removed from this document

These were documented as usable but have **no CSS rule anywhere in the repo**. They have
been deleted rather than corrected, so they are not re-adopted by mistake:

`.form-label` · `.form-check` · `.form-check-label` · `.icon-leading` · `.icon-trailing` ·
`.chip-group` · `.tag-group` · `.badge--info` · `.breadcrumbs--with-icon` ·
`.accordion__panel-content` (+ `--icon`, `--title`) · `.table__head` · `.table--desktop` ·
`.table__head-cell--sortable` · `.table__sort-icon` · `.header__profile` ·
`.progress-step--incomplete` (appears only inside `:not()` — it is the unstyled default)

Also corrected rather than kept: `.form-check-input` exists but is a cookie-banner
`transform: scale(1.6)` hack, not the checkbox component.

The previously documented "all pages share the same base" block (`include-header.js` /
`include-footer.js` / `#site-header` / `#site-footer` / `.container.py-56`) matched **zero**
screens and has been replaced by §1.

---

## 6. Additional tokens used by components

Real tokens that components rely on, verified in `main.css`. Full token reference lives in
the `design-system` skill.

```css
--color-icon-brand-default:  var(--blue-sky-600);   /* #0058d2 — OK */
--color-border-brand-default: var(--blue-sky-600);  /* #0058d2 — OK */

/* Extended blue-sky / gray steps referenced by component CSS */
--blue-sky-150: #D6E5F8;
--blue-sky-300: #99BCED;
--blue-sky-500: #3379DB;   /* focus rings */
--gray-700:     #383838;
```

⚠️ **Do not use these three without a fallback** — they resolve to undefined primitives
(see §8):

```css
--color-icon-base-default          → var(--black-1000)   /* undefined */
--color-icon-base-inverse-default  → var(--white-1000)   /* undefined */
--color-icon-base-inverse-on-color → var(--white-1000)   /* undefined */
```

**`--color-background-transparent-brand`** (`#7e37f933` = `rgba(126,55,249,.2)`) is a
**real Figma variable**, confirmed 2026-08-17 — but it has **zero definitions in any CSS
file**. It is designed and unimplemented, so you cannot use it in code today. (An earlier
pass of this document deleted it as invented; that was wrong — it was verified absent from
CSS but never checked against Figma.)

Still removed: `font-size/fs-10` and `line-height/lh-12`, which appear in neither CSS nor
the Figma variables returned so far.

---

## 7. Building New Components

1. **Search this document and the CSS first.** Most "new" components already exist under a
   different name — check the app namespaces in §4 before the library.
2. Base class = component name; `--modifier` for appearance; `__part` for children;
   **`is-*` / `has-*` for state**.
3. Never hardcode hex or px — only `var(--…)` tokens from the `design-system` skill.
4. Put the icon directly in the element as `<svg class="icon">` + sprite `<use>`.
5. Follow the surrounding file's conventions — do not introduce utility-class layout into
   a screen that uses none (§0.5).
6. Cover the full variant set: default · hover · active · **focus-visible** · disabled ·
   error · success. Note the library is inconsistent here (`.btn` uses `:focus`,
   most others `:focus-visible`); prefer `:focus-visible` for new work.
7. If the component needs JS, give it a `data-*` contract and document it here.
8. **Font tokens only** (except inside `@font-face`: descriptors must be literal numbers —
   `var()` there is invalid and silently drops the weight, so every face becomes 400 and
   Medium/Regular swap files; that broke all text weights on 2026-10-02). Every `font-size`, `line-height` and `font-weight` is a token with
   its value as fallback: `var(--font-size-fs-14, 14px)`, `var(--line-height-lh-20, 20px)`,
   `var(--font-weight-fw-regular|medium|semibold, 400|500|600)`. Scale: sizes 12/14/16/18/20/24/32/56,
   line-heights 16/20/24/26/28/32/40/64. A value off the scale is a design question — ask,
   don't invent a token. (`font: inherit` and unitless keywords are fine.) Converted
   product-wide 2026-10-02; the remaining off-scale values are listed in §8.
9. **Record every new pattern.** When something new is built that could repeat (a layout,
   a tray, a box, a Figma page format), add it to this file — inventory row + a short
   section with markup, helper, geometry in tokens and where it is used — in the same change.

---

## 7a. Figma — flow documentation pages (added 2026-10-02)

Format used by the Tarife page (9618:13362) and the Dosare page (9696:526, file `aHgwVwiNCOSOqbMhMjjUOj`).
Reuse it for any flow documented in Figma:

- **One section per flow**, a `.header` cover + a "How to read" card at the top.
- **Bands** (columns) left → right, x = 160 + k·2080, each with a band header
  (ID chip + title + one-line description) at y = 700.
- **Blocks** stacked in a band from y = 1080, **240** apart, ordered by ID. A block is a
  vertical auto-layout (clone `9622:1681`): **label row** (blue ID chip `01a` + screen name) →
  **the screen** (1920 wide, hug height — never cut; modals sit on a `Modal overlay` frame
  sized to the screen) → **NOTE DEV / PM** (tag + "ID · title" + 1–3 sentences: what
  changed, the rule, what it links to).
- IDs: band number + letter (`03`, `03a`, `03b`…); the note references other blocks by ID.
- **Arrows** (connectors, elbowed, 3px, `border/brand/default` blue): they start from
  **the element that is clicked**, not the screen, and are **attached** at both ends so
  they follow when screens move. Connectors cannot attach to layers inside instances, so
  attach to an invisible `Hotspot · <label>` frame (absolute in the screen, element size,
  **no stroke** — no blue ring around the button). **The label is the connector's own
  text** (2026-10-03, user: the label must be part of the blue arrow, never a separate
  chip): `connector.text.characters = label`, Onest Medium 14, fill `text/brand/default`.
  The label sits at the arrow's midpoint (position and background are not settable via the
  Plugin API). The old chip component „Flow · etichetă săgeată” (`9790:700`) is retired.
  System events (MPay confirms, a case returns) start from the block. End on the target block.
- **Numbered annotations:** local component **"Flow · adnotare"** (`9796:901`, 24px
  circle, brand fill, 2px white stroke), absolute in the screen, beside — never on top
  of — the element; the block's note lists ①…ⓝ. Screens made from captured frames often
  have **`itemReverseZIndex = true`** ("first on top"), which hides every absolute child
  behind the content: set it to `false` on the screen before adding markers.
  Example: Workplace page block 01.
- **Auto-layout only (rule, 2026-10-03).** Every documented screen is built with nested
  auto-layout frames that mirror the code's flex/grid structure (direction, gap, padding,
  alignment, fill/hug/fixed) — never frames with absolutely placed children. Absolute
  positioning is allowed only where the code itself is absolute/fixed: the overlay on top of
  a screen (modal / drawer / sheet + scrim), an open menu or select list inside its
  `Dropdown wrap`, a modal's close button. Pipeline: `extract2.js` (DOM → auto-layout tree)
  + `builder2` (Figma text node `9910:328`), see scratchpad `mk2.py`.
  **A form field is one component:** label + control + hint / error / counter map to a
  single library `text-input` / `select-input` / `text-area` / `date-input` instance with
  `Label` (text), `Mandatory Star`, `Assistive Text` (hint, or the error with
  Style=Destructive), `Character Counter` — never a loose label text + asterisk + a bare
  control.
- **Auto-layout pitfalls (learned 2026-10-03 — check after every build):**
  - Never change sizing *inside* a library instance. A "hug everything" pass once turned the
    `Input` frame of `text-input` / `select-input` / `text-area` (FIXED 40 in the main) into
    HUG, and every field collapsed to its text height. A pass that resizes frames must skip
    nodes inside instances; to repair, walk instance ↔ main component in parallel and set back
    FIXED where the main is FIXED.
  - A `Dropdown wrap` itself must have `clipsContent = false` (not only its ancestors),
    otherwise the open list is invisible.
  - Variant matching must ignore properties a set does not have (`text-area` has no `Size`):
    a strict match silently falls back to the default variant (an error textarea without the
    red border).
  - The library checkbox is the box only (Small = 20px = code `checkbox--medium`); the label
    is a sibling text in an H frame (gap 12) — `label.checkbox` stays a layout.
  - A row with a FILL name and a value: packed (MIN) alignment + gap, not SPACE_BETWEEN
    (SPACE_BETWEEN ignores the gap, the „…” name touches the value). Truncation =
    `textTruncation ENDING` + `maxLines 1` on a FILL text.
  - Chip badges, tags, button labels: set the real text (component property or the inner
    text), never leave the component default.
  - CSS pseudo-elements (timeline rail line, dot separators) are not in the DOM: draw them as
    real frames (1px FILL line bound to `border/base/default`).
  - After content changes, re-fit the screen (`screen = screen − Body + Main`), stretch the
    overlay + scrim, and re-stack the column (240 gap).
  - Shared chrome is one local component (Servicii header = **Main Navigation** `9442:44686`,
    56 screens): change the main component once; per-screen states via component properties
    (e.g. boolean **„Modificări nepublicate”**) or instance overrides (Publică Default vs
    Disabled, caption text), never by detaching.
- **Layered screens (2026-10-04):** a screen with an overlay is an auto-layout frame (fixed
  size) whose **Page** is the flow child (FILL) and whose overlay layers (scrim, drawer, modal
  overlay, tooltip) are its **absolute** children — never a plain frame that stacks layers.
  An action that sits on a component instance row (a „Vezi …” link on `svc/field-row`, a
  button on `svc/section-heading`) goes in an H wrapper `<row> + action` (row FILL, action
  HUG, the row's divider moved onto the wrapper) — never absolutely over the instance.
  **Audit** (run after any batch): per page, frames with `layoutMode NONE` holding children
  (> 40px, outside instances), image fills, and `layoutPositioning ABSOLUTE` nodes whose name
  is not an overlay / hotspot / flow arrow / annotation / cursor / menu-in-wrap. File-wide
  result 2026-10-04: 0 left on all 9 documented pages.
- **Tokens only — spacing and type (rule, 2026-10-04).** In Figma every padding and gap
  (`paddingTop/Bottom/Left/Right`, `itemSpacing`, wrap `counterAxisSpacing`) is **bound to a
  Foundations variable** (`3. Sizes › spacings/spacing-{2,4,6,8,12,16,20,24,32,40,48,56,64,80,96,120}`,
  same scale as `--spacing-*` in code); 0 may stay unbound. Off-scale values snap to the
  nearest token (tie → the larger). Never a raw number: a space-between bar uses
  `SPACE_BETWEEN`, a centred column uses centre alignment + a fixed child width, a modal
  position uses a 1920 × 1024 **viewport** frame (centre/centre) — not huge paddings; a 1px
  border inset becomes 0 with the stroke drawn OUTSIDE. **Every text uses a Foundations
  Desktop text style** — Caption/Small (10) · Caption/Medium (12) · Caption/Medium 500 ·
  Body/Small (14) · Body/Small 500 · Body/Default (16) · Body/Default 500 · Body/Large (18) ·
  Body/Large 500 · Heading H5 (18/600) · H4 (20) · H3 (24) · H2 (32); semibold body text maps to
  the „500” style (there is no 600 body style). Colour stays a Semantic variable. Tool: the
  function `TOKENIZE(roots)` in the Figma text node **„tokenize (nu șterge)”** (`10012:328`) —
  run it on every new or rebuilt block (builder2 output is raw until tokenized).
- **Arrows attach to the element itself (rule, 2026-10-04).** A flow connector's start is
  the clicked node (button, tab, segment, row, field) — never a transparent „Hotspot” frame.
  Figma cannot attach to a node *inside* an instance: then attach to the outermost instance
  that contains it (the header component, the step component).
- **Screens resize like the page (rule, 2026-10-04).** Dragging a screen's height must behave
  like the browser: the page `Body` FILLs (clipped), an overlay and its scrim are absolute with
  constraints **STRETCH × STRETCH**, a sheet panel / drawer FILLs the overlay height, inside it
  the header, banner and **footer stay HUG** and the content area between them **FILLs and
  clips** (it is the scroll area), so the footer is always on the bottom edge; side-by-side
  columns (constructor: fields panel | editor) stretch and their list / canvas fill. A small
  modal stays centred in the stretched backdrop. Default height = the full content (nothing
  hidden). Tool: `RESPONSIVE(screens)` in the text node **„responsive (nu șterge)”**
  (`10021:328`); run it after building a screen with an overlay.
- **Small central modal ⇒ the screen is exactly 1920 × 1024** (clipped; overlay, scrim and
  viewport 1024 too). Drawers, sheets and long pages grow to their content.
- **No screen hides content (rule, 2026-10-03).** A screen grows to show everything: a
  full-screen sheet, a drawer or a long page is documented at its full content height
  (internal scroll areas set to hug, the screen and its scrim stretched to fit, the blocks
  below re-stacked). Only screens with a **small central modal** keep the fixed
  1920 × 1024 frame. Long open lists may stay clipped at their real max-height.
- **Every open dropdown / menu / popover lives in a `Dropdown wrap · <trigger label>`**
  (applied file-wide 2026-10-02 — Dosare, Servicii, Tarife, Filtrare, Șabloane, Workplace,
  Shell, FO Post-procese, User Management, Form Builder, FO Full Flows 09):
  1. Wrap = a new **vertical auto-layout** frame, no fill, **`clipsContent = false`**, put in
     the trigger's exact slot (same index; FILL stays FILL, otherwise HUG). The trigger is
     its only flow child; the menu is its second child, **absolute**.
  2. Menu position = code's offset below the trigger: ⋮ / action / stack menus
     (`.e-permits-fo-intent-menu`) **right-aligned, 6px**; selects (`.e-permits-fo-select`)
     **left, 4px under the input field** (not under the label/hint); filter-chip popovers
     **left, 8px**. Constraints follow the edge (right → `MAX`, left → `MIN`) so the menu
     sticks when the trigger resizes or the screen moves.
  3. The trigger shows the open state: **`State = Focus`** variant; if the component has no
     Focus variant (⋮ Strict, filter chips), apply the effect style **Focus Ring/Medium**
     (Foundations, key `97cdddcd09b08677bf21762cd132d69bb276e9c8`). A chevron-down turns
     **up**: 20px → `20/chevron-top` (`0e1e17107763411570b607bddc5de7061afdcb15`), 16px →
     `16/chevron-top-small` (`6cbfa47e78e2abfe65e009c10fe9c70c21fdd83b`) — through the
     button's `🔄 Trailing Icon` property when it has one, else `swapComponent`.
  4. A trigger inside a component instance (header, stack-item row, filter bar) cannot hold
     a wrap — detach **that screen's** instance first (never the main component). After a
     detach, re-find the trigger **by name** (e.g. `More`), not by child index: hidden
     layers shift indexes and the wrong button gets wrapped.
  5. The menu must paint above the content below: on each auto-layout ancestor (between the
     wrap and the screen) whose later children overlap the menu, set
     `itemReverseZIndex = true` and move its absolute children to index 0; set
     `clipsContent = false` on those ancestors too (the screen itself keeps clipping).
  6. Arrow-label chips that end up on the trigger move to the left of the menu item they name.
- **No `clipsContent` on wraps** that hold buttons or inputs (it cuts the focus ring);
  only the screen itself clips.
- **Messages / alerts in Figma = local component „Mesaj · subtil”** (`9845:17951`, Servicii
  page, Tone = Success / Info / Warning / Error, property Text) — the code's
  `.message.message--subtle.banner--*` inline note: padding 12/16, radius 12, 20px filled
  icon (circle-checkmark / circle-info / warning / circle-error, `icon/<tone>/default`),
  12px gap, 14/20 regular default text, background `background/<tone>/secondary`. The
  library has no Success banner (banner = Info/Error/Warning, info-box = grey note), hence
  the local set. **Never a hand-made frame with a coloured circle as the icon**; a loading
  line uses the library `spinner` (Extra Small, Brand), not a circle.
- **Effect-style focus rings need `clipsContent = true` on the node that carries them**
  (a drop shadow with spread does not render on an unclipped frame / component / instance).
  The *wrap* stays unclipped; the trigger or card itself clips.
- **Application Shell page** (`574:29429`, documented 2026-10-02): sections
  „Application Shell — prezentare” (cover, How to read, 00 anatomy with markers ①–⑧),
  „01 · Shell — stări” (01 meniu extins · 01a restrâns · 01b hover = tooltip, no expand ·
  01c meniul Ajutor), „02 · Selector de rol” (02 închis · 02a deschis, instituția curentă
  extinsă · 02b altă instituție restrânsă · 02c hover pe card · 02d se încarcă noua instanță ·
  02e stări) and „03 · Versiuni anterioare”. Local components for the switcher:
  **„Selector rol · card”** (`9822:2839`, State Default/Hover/Focus/Active, props Name /
  Meta, icon = swap the nested `Icon` instance — fill-based icons need the carried-over
  stroke cleared) and **„Selector rol · Arată mai multe”** (`9822:4023`, Expanded × State).
  Build switcher panels from these, never from the old hand-made „Roll seelction” frames.
- Screens use the shared parts only: header instance, screen template, library
  components; real data that matches code; labels 12px in the details header.
- **Flows with choices (dropdowns, segmented, condition values):** one block per distinct
  choice the user can make, including one block with the **dropdown open** (library
  `selection-menu`, the chosen option `Selected`, the pointed one `Hover`), each result
  exactly as code computes it. Example: Servicii band 04h1–04h3 (Taxă › Calcul on a formula
  tariff: Suma tarifului → Reducere on the formula → Reducere on a fixed tariff).
- **Every screen copies code data**: extract it from the running prototype's DOM (row
  titles, tags, meta, chip counts, summary numbers) instead of retyping; texts set on
  instances that are bound to a component property must be set through
  `setProperties`, and compare text with `normalize("NFC")` (Figma stores some Romanian
  diacritics decomposed).
- **List toolbars in Figma = code:** chips left and tools right on **one 36px row**
  (search 320 in sections / 400 in registries, chips 36; buttons keep the component's Small
  size — icon-only 32×32, add button h32 —, 1px divider h28), gap 12. Icon-only actions use the library button `📍 Icon = Only` —
  never a labelled "Sincronizează" button where code has an icon.
- **Icon-only buttons get a hover block:** library button `State = Hover` + the local
  component **"Tooltip · etichetă (icon)"** (`9736:694`, = `.tooltip--plain`: no arrow,
  4/8, 12/16, radius 4, gray-900), 8px below, centred, text = the code's `aria-label`.
  Example: Servicii page block 05c.

### Long lists in a summary card — „Arată toate” + central modal (2026-10-03)

A summary card never grows with its data. All three groups of **Sumar taxe**
(`renderServiceFees`) — **Taxe**, **Tarife**, **Conturi bancare** — show their first
`FEE_ACCOUNTS_VISIBLE` (2) rows: name (one line, ends in „…”, full name in `title`) left,
a one-line value right (tax/tariff sum, or „Formulă” when the sum is computed on the payment
note; account name + the IBAN copy component for accounts). Layout: the three groups in **one row**, columns
`1fr 1fr 1.6fr` — Conturi bancare wider so the account name fits next to the IBAN (one column
under 900px). When a group has more rows, the list gets the
**totals tray attached under it** (`.e-permits-sum-list` wrapper + `.e-permits-sum-list__total
.e-permits-fee-summary__more`: flat top, rounded bottom, inset 12px, 40px): „Încă N {taxe|tarife|conturi}” (tertiary) left at the 20px start
padding, `btn btn-text-primary btn-sm btn-rounded` **„Arată toate”** right with **equal 4px of tray
on its top, right and bottom** (padding `4 4 4 20`; `e-permits-fee-summary__action`,
`data-fee-list-all="taxes|tariffs|accounts"`). Nothing in the group header.

All three open the **same** modal **`#fee-accounts-modal`** (library `.modal.modal--md`),
configured per list in `FEE_LISTS` (title, search placeholder, noun, subtitle, row):
- title = the group name; subtitle „{serviciu} · …” carries the counts the card no longer
  shows (Taxe: „N active · M tarife de configurat”; Tarife: „N din RSSP / eAPL · M adăugate
  manual”; Conturi: „N conturi active”);
- the library Search (`--fill`, all states, x) with a live „X din N {taxe|tarife|conturi}”;
- a stacked list that **scrolls inside the modal** (`max-height: min(56vh, 520px)`); every row
  is `feeListRow`: name + tag (tax status / tariff source / „Principal”) · meta line
  (tax: tip solicitare · moment · generare; tariff: cod · stare · tip solicitare; account:
  bank + „APL (eAPL)”) · value right;
- empty search → „Niciun rezultat nu corespunde căutării.”; footer „Închide”.

Services with an eAPL local fee also list one treasury account per APL (mock: 500,
`aplBankAccounts`). Reuse this pattern (add an entry to `FEE_LISTS`, or copy the modal) for
any summary card whose list can be long.

### Long multi-select — summary in the form + picker modal (2026-10-09)

When a multi-select can hold **more than 12 options** (Setări › **Subdiviziuni de examinare**
for services delivered by primării: ~900 APL until the amalgamation, grouped by raion), the
checkbox list and the dropdown both stop working: neither can be scanned, and the choice
cannot be reviewed. Best practice (Google Ads locations, Salesforce dual listbox, Atlassian
group pickers): a **summary in the form** + a **dialog** to choose. Up to 12 options stay the
plain checkbox list (`cfgChecks`). The full-flow dropdown multi-select
(`e-permits-fo-subgen-select`, CAEM subgen) is only for short lists.

- **Field** (`cfgSubdivPicks(service, key, label, o)`): the field title and hint on top, then
  `.e-permits-cfg-picks` (gap 12) — built like the full-flow CAEM step 2 „Subgen de activitate”.
  - **Trigger:** the full-flow multi-select button `.e-permits-fo-subgen-select` >
    `button.e-permits-fo-subgen-select__button` (40px, chevron, `aria-haspopup="dialog"`).
    - Value: „N din M selectate · K grupuri”, or the placeholder „Alege subdiviziunile”.
    - Clicking it opens the picker modal. While the modal is open, the field keeps `is-open`
      (focus ring, chevron up, `aria-expanded="true"`); a MutationObserver on the overlay
      clears it on close.
    - Error state = red border (`.is-error`, the `.e-permits-fo-select` convention).
    - The field title is **not** `<label for>`: a label passes its hover and click on to the
      control it points to, so hovering the title showed the field hover and clicking it
      opened the modal. `cfgField(..., { labelFor: false })` gives the title an `id` instead,
      and the button uses `aria-labelledby="<title id> <value id>"`.
  - **Chips:** the selection uses the **full-flow chip** (as under „Subgen de activitate”):
    `.e-permits-fo-subgen__chips` (gap 6) > `span.e-permits-fo-subgen-chip` >
    `span.e-permits-fo-subgen-chip__label` + `button.e-permits-fo-subgen-chip__remove` with a
    20px `cross-small` (`<svg class="icon" width="20" height="20">`). Never use the library
    `.chip` + `.chip__close` for selected values.
    - Compressed, so the chip row stays short: **several in one raion = one chip**, „Briceni ·
      12 din 30”, or „Briceni · toate 30” when the whole raion is selected. The raion name is in the chip's medium weight; „· 12/30” is
      regular secondary (`.e-permits-cfg-picks__chip-meta`). × clears the whole raion.
    - A single subdivision in a raion keeps its own chip („Primăria Cahul · UAT 03”). The
      authority's own subdivisions are always one chip each.
    - × takes it out of the draft at once: the save bar counts the change and Renunță brings
      it back. Focus moves to the chip that takes its place, or to the field button if none is left.
    - The first `CFG_SUBDIV_TAGS` (8) chips are shown, then `btn-text-primary` „Încă N · Arată
      toate”, which opens the modal on the **Selectate** chip.
- **Modal** `#cfg-subdiv-modal`: library `.modal.modal--lg` + `.e-permits-passport__modal`.
  - **Height:** `min(100vh − 2×48px, 880px)`, fixed, so it never jumps while filtering. The
    modal is a flex column: `.modal-content` gets `flex: 1; min-height: 0; max-height: none`.
    Header, search, chips and footer stay put and only the list (`flex: 1`) scrolls. On a
    small screen the list is what shrinks.
  - **Header and search:** title = field name; subtitle „{serviciu} · M subdiviziuni în G
    grupuri”; the library Search (`--fill`) matches the subdivision or the raion.
  - **Toolbar** `.e-permits-subdiv__toolbar`:
    - chips Toate / Selectate / Neselectate, each with a count badge;
    - on the right, `btn-text-primary`: „Selectează / Deselectează toate (N)”, or „…rezultatele
      (N)” while filtered. It acts on what is visible.
  - **List** `.e-permits-subdiv__list`: one flat list, **no collapsing**.
    - It fills the rest of the modal and scrolls, with a 1px base divider above and below.
    - It is split into **sections by raion** (`.e-permits-subdiv__section`), with a 1px divider
      between sections.
    - Section heading `.e-permits-subdiv__head` (sticky, white, padding 12/0/4, gap 4): a group
      checkbox whose label is the raion name in medium weight (`renderCheckOption` plain,
      tri-state, acts on the section's visible rows), then the tertiary counter „n/total” at the
      **same 14/20**, so both sit on one line.
    - Every selectable line (rows and heading) is a full-width hit area: padding 6/8, radius 8,
      `base-secondary-hover` on hover, pointer cursor. The library `.checkbox` 6px bottom margin
      is reset to 0 here, otherwise the label sits 3px above the counter.
    - Once open, this modal drops the library's `will-change` / 3d transform layer
      (`.modal-overlay.is-active .modal.e-permits-subdiv`). With it, GPU Chrome repainted the row
      hover only on the next click.
    - Rows sit in a **2-column grid** (gap 0/8), indented 28px so their boxes line up under the
      heading label (1 column under 640px).
    - Search and filters hide sections with no matching rows.
  - **Footer** `.e-permits-subdiv__footer`: „**N** din M selectate” (live) on the left;
    Renunță (neutral) and Aplică (primary) on the right.
- **Behaviour:**
  - The choice is a draft until **Aplică**, which writes it into the Setări draft in catalog
    order, clears the field error, redraws only that section, and puts focus back on Editează.
  - Ticking patches in place (group checkbox, badges, chips, total) and the list keeps its
    scroll. Typing redraws only the list.
  - The audit names up to 3 changes; past that it records counts: „+N adăugate, −M eliminate
    (acum X)” (`cfgListDiff`).
- **Data** (`cfgSubdivisionCatalog`): the authority's own subdivisions (group „Subdiviziunile
  autorității”), plus, for an eAPL service, mock APL „Primăria {raion} · UAT NN” per
  `APL_RAIONS` (deterministic, 968 for `003000023`).

### Documente însoțitoare (RSSP) in a service — document tiles, not label/value rows (2026-10-03)

Date generale › **Documente însoțitoare** (`renderPassportDocuments`) uses the **Dosar profile's
document tiles** (`.e-permits-dosar-profil__files` / `__file`, `document.svg` icon), not the
256px label/value card: long document names get the full width and **wrap** (no ellipsis,
`.e-permits-passport__doc-title`). Heading: title + `RSSP` tag + tertiary
„N documente · M obligatorii” on the right (`.e-permits-passport__docs-meta`). Required documents
come first and end with the **„✱ Obligatoriu”** tag (`requiredTag`: neutral subtle, red asterisk,
no right padding so it lines up); optional ones end with a quiet tertiary **„Opțional”**.

### Long event log — filters + search + „Arată încă N” (2026-10-03)

Servicii › **Jurnal de evenimente** (`renderServiceEvents`) logs every change, so it is long
(~100 per service; older history is generated demo data, `serviceEventLog`). Layout:
- toolbar = the Taxe one (`.e-permits-pay__toolbar`): **chips** left — Toate / Reușite / Eșuate
  with count badges (`data-svc-events-filter`) — and the library **Search** right
  („Caută eveniment, utilizator sau dată”; matches type, detail, user and the date text);
- a tertiary count line: „100 evenimente” / „16 din 100 evenimente” (`aria-live`);
- the timeline (`.e-permits-timeline`) shows **25** at a time; under it „Afișate 25 din 100” +
  `btn btn-neutral btn-sm btn-rounded` **„Arată încă 25”** (`data-svc-events-more`), centred;
  focus moves to the next „Arată încă” after loading;
- no match → the empty card „Niciun eveniment nu corespunde căutării.”;
- the tab badge shows the full count. Search / filter reset the page to 25.
Reuse for any audit log that can grow past a screen.

### Taxă › Calcul — result line (2026-10-04, one formula level since 2026-10-05)

The tax editor's **Calcul** segmented control (**Suma tarifului / Reducere**) always shows
what the tax will charge, as the field's hint line (re-rendered on leaving the field):
- **Suma tarifului** → „Taxa = tariful: **7.743 MDL**”, or for a formula tariff „Taxa =
  tariful: **formula tarifului ({expresie})**, calculată la generarea notei”.
- **Reducere (%)** (1–100) → „De plată: **3.871,5 MDL** din 7.743 MDL”; on a formula tariff
  „De plată: rezultatul formulei tarifului − **50%**, calculat la generarea notei”; empty →
  no line.
There is no formula on the tax — it lives on the tariff. Demo: `svc-04h1` (formula tariff),
`svc-04h2` (formula tariff − 50%), `svc-04h3` (fixed tariff − 50%). A conditional tax shows
the result per scenario row instead (see „Taxe — tariff + application rule”).

**Figma (GEAP 2.0, ↳ BO -> Servicii, 2026-10-08):** local components in frame „Componente ·
Taxe pe scenarii” `10519:44882` — „Input · procent” `10519:44896` (State Gol / Completat /
Focus / Eroare, prop Valoare) and „Calcul · scenariu” `10519:45068` (Calcul = Suma tarifului /
Reducere / Reducere · eroare; props Linia 1, Linia 2, Notă, Sumă, Separator; = a
`stack__item` inside `stack › stack__group › stack__list` 0/20). Blocks rebuilt from
instances: 04h, 04h1–04h3 (scenario rows), new 04h4 (two classifiers, 4 scenarios), 04h5
(validation), 04s (CAEM hierarchy), 04j (no values). Builder: text node „tax builder
(helper)” `10521:44957` run as `new AF("SPEC", text)(SPEC)` with templates in „tax builder
templates (helper)”. Flows: „Reducere pe rând” 04h→04h3, „Adaugă clasificator” 04h→04h4,
„Salvează · date incomplete” 04h→04h5, „CAEM pe niveluri” 04i→04s. Tarife page: registry
values read „Formulă · Suprafața obiectului × 2” (as `tariffValueText`), picker / field /
placeholder use `{{key}}`.

**Formula variables are written `{{nume}}`** (2026-10-08), like in the notification and print
templates: „Inserează variabilă” inserts `{{key}}`, the picker shows `{{key}}`, the
placeholder is „ex. {{suprafata_m2}} * 2”, `sanitizeFormula` keeps whole `{{key}}` tokens,
error messages name `{{key}}`. The older `{key}` still parses (`FORMULA_VAR`) and reads the
same in „Se citește”.

### Servicii list — advanced filter in Figma (2026-10-04)

The services registry (Configurări servicii) uses the shared advanced filter (facets Statut ·
Instituția · Sursă). Figma section **„Acte permisive Table -> Filter”** (`1157:30135`) now has
four auto-layout screens built from code (the old filter-modal mockup was removed):
01 filters closed · 01a bar open („Alege valorile, apoi aplică filtrele.”) · 02 Statut checklist
(popover in a `Dropdown wrap` under the chip: checkbox + status tag per value, Confirmă ·
Șterge) · 03 applied (chip selected with count badge, „Filtrare avansată 1”, „1 rezultat” ·
Șterge filtrele, tab counts and rows filtered). Filter chips use the library chip with
**Icon=Trailing** (chevron). Table columns: code 156 · Act permisiv FILL · Instituția 240 ·
Statut 116 · Versiune 100 · Ultima actualizare 180 · actions 104.

### Servicii › Notificări — „Șablon nou” wizard in Figma (2026-10-04)

The service-scope create drawer (same wizard as the global menu, `openNtplCreate({service})`)
has 4 steps with the step strip (Setări · Destinatari · Conținut · Revizuire): Figma blocks
09h (step 1 from zero) · 09i (step 1 validation) · 09h1 (step 1 „Copia unui șablon existent”
+ Șablon sursă) · 09h2 (destinatari rows: destinatar + canal, ✕, „Adaugă destinatar”) · 09h3
(limba RO/RU/EN, Inserează câmp, subiect + corp e-mail, mesaj scurt 160 with counter) · 09h4
(revizuire: Setări / Destinatari / Conținut cards each with „Modifică”, preview with sample
data, „Creează șablonul”) · 09h5 (result: the full-screen editor opens on Conținut + library
toast „Șablon creat”). Arrows: Continuă → next step, Creează șablonul → 09h5.

### Figma ↔ prototype links — „Deschide în prototip →” (2026-10-05)

Every Figma screen block links to the running prototype on GitHub Pages, on that exact
screen: `https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=<id>`.
- **Code:** `js/demo-states.js` = one entry per Figma block `{ flow, as, hash, run(h) }`;
  `js/demo-links.js` runs it (role, page/tab, the user's own clicks). Every link starts from
  clean demo data (removes only the prototype's `e-permits-*` / `geap.*` keys — github.io
  shares one origin) and toasts stay until closed (`dataset.demoLink` → `toast.js` duration 0).
  A toast from an in-between step is dismissed (`clearToasts`). `h.choose` waits for the
  hidden native select to exist, not to be visible.
- **Other pages:** a state may set `page` (path from the site root, e.g. `cabinet-evo/index.html`;
  `demo-links.js` redirects there keeping `?state=`) and `params` (extra query keys merged into
  the URL, e.g. `{ pp, act }`).
- **Ids:** `<page prefix>-<block code>`: Servicii `svc-04h2`; Utilizatori `usr-01…05` (tabs) and
  `usr-u03b` … `usr-u05k` (= Figma U-codes); Roluri `rol-00 … rol-01c`; Tarife `trf-01 … trf-04c`;
  Șabloane de notificare `ntpl-01 … ntpl-05b` (template AprobareNIAC; `ntpl-02e` uses
  Case.Registered, which has nothing to publish).
- **Figma:** in each block's „Screen label” after the title: text „Deschide în prototip →”,
  layer `Link · prototip`, Desktop/Body/Small, `text/brand/default`, underlined, hyperlink =
  the URL above. Every new block gets a state + this link; a renamed block keeps its id.
- **Check before linking:** every state must end with `data-demo-state="<id>"` (no `:error`);
  sweep all ids headless after changing a flow.

## 8. Known issues and open questions

**Off-scale font values still raw (2026-10-02, need a design decision):**
`css/e-permits-shell.css` — 13px/18px ×4 (lines ~1617–1809), 28px/36px (~1624);
`css/e-permits-acte-permisive.css` — 40px/48px (~168), 36px/44px and 28px/36px (mobile, ~707/782),
22px + weight 700 (~1253), weight 700 (~30), 10px/12px (~2723), 13px/1.6 (~12767).

**Scope question (needs a decision).** This document now covers two largely disjoint
vocabularies — the `Components/` library and the application namespaces. They could
reasonably be split into two documents. Tiering them (§2 status column) is an interim
answer, not necessarily the right one.

**Not verified.** The `Components/*.html` preview files were **not** scanned — only
`main.css` and the app screens. Where a preview's markup disagrees with §3, the preview
has not been checked.

**Ten inventory rows have no contract** — Bottomsheet, Cookie banner, Date input, Date
picker, File input, Link, Menu, Phone input, Segmented controls, Spinner previews exist but
no markup was ever documented. The app screens reimplemented phone input and file upload
from scratch as a direct result.

**Duplicated solutions that should probably converge** (each currently has 2–4
implementations): copy-to-clipboard, status pills, filter chips, empty states, avatars
(5 independent implementations), and focus rings (**four different idioms in `rap-evo` alone**).

**12 core semantic tokens are broken.** `--black-1000` and `--white-1000` are used 12 times
in `main.css` and **defined zero times**, so every token below computes to invalid and only
the inline fallback renders:

| Token | line | resolves to |
|---|---|---|
| `--color-text-base-default` | 290 | `var(--black-1000)` ✗ |
| `--color-background-base-default` | 220 | `var(--white-1000)` ✗ |
| `--color-text-base-default-on-color` | 293, 380 | `var(--black-1000)` ✗ |
| `--color-text-base-inverse-default` | 296 | `var(--white-1000)` ✗ |
| `--color-text-base-inverse-on-color` | 297 | `var(--white-1000)` ✗ |
| `--color-icon-base-default` | 321 | `var(--black-1000)` ✗ |
| `--color-icon-base-default-on-color` | 324 | `var(--black-1000)` ✗ |
| `--color-icon-base-inverse-default` | 327 | `var(--white-1000)` ✗ |
| `--color-icon-base-inverse-on-color` | 328 | `var(--white-1000)` ✗ |
| `--color-background-base-inverse-default` | 382 | `var(--black-1000)` ✗ |
| `--color-background-base-inverse-on-color` | 383 | `var(--white-1000)` ✗ |

This includes **primary body text and the page background** — the two most fundamental
tokens in the system. It is why working code always writes
`var(--color-text-base-default, #121212)`: the fallback is doing all the work, and dropping
the fallback silently breaks the colour. The one-line fix is to define `--black-1000: #121212`
and `--white-1000: #ffffff`. Note this contradicts the `design-system` skill, which presents
these tokens as working — that document describes intent, not what `main.css` delivers.

### Undefined custom properties — silent failures

Every one of these is **referenced but never defined**. With no fallback the declaration
is invalid and drops; with a fallback the literal renders instead of the intended token —
so the bug is invisible until someone compares against Figma.

| Token | Used by | Consequence |
|---|---|---|
| `--black-1000`, `--white-1000` | 12 core semantic tokens | body text + page background broken (above) |
| `--brand-600` | `.breadcrumbs__link:hover` | no fallback → hover colour never changes |
| `--danger-500` | `.progress-step--blocked` | renders `#da1e28`, design says `#d92d20` |
| `--text-body-xs-font-size` | `.radio-description` | renders **12px**, design says **14px** |
| `--font-size-12`, `--font-size-16` | `.segmented-control--small/--large` | silent fallback |
| `--color-danger-500`, `--color-danger-600` | `.custom-select` destructive | renders `#ef4444`, design says `#d92d20` |

**Fix `--black-1000: #121212` and `--white-1000: #ffffff` first** — they are confirmed
from Figma and unblock 12 tokens at once.

### Invalid or broken CSS shipped in `main.css`

| Line | Problem |
|---|---|
| 18810-18822 | `.file-input.default/.success/.error` contain **raw uncompiled Sass** — `map.get(map.get(tokens.$input-colors, $variant), border)`. A build escape. |
| 15757 | `.select-control:hover { border-color: var(--select-shadow) }` — `--select-shadow` is a *box-shadow string*; invalid as a colour, declaration dropped |
| 13832 | `display: varf(--flex, flex)` — typo, dropped |
| 20554 | `font-weight: font-weight(regular)` — SCSS leakage, dropped |
| 20612 | `width: var(--spacing-25)` — undefined token |
| 19323 | `#3379DD` where every other reference is `#3379DB` |

### Recurring cross-component gaps

- **Truncation is specified five times and implemented zero times** — Breadcrumb
  (30 chars + tooltip), Text Area (label + assistive), Date Input (same), Segmented
  Controls (ellipsis on overflow), Select (label / value / assistive).
- **Touch targets are specified and unimplemented** on Checkbox (36px), Radio (36px),
  Switch (32/40px), Chip, and Tabs (`--sm` renders ~34-36px against a stated 40px
  minimum). **`.link-target-pointer` / `.link-target-touch` is the only implementation —
  copy that pattern.**
- **Size-name drift.** Checkbox and Radio are shifted a full step (Figma Medium 24 →
  CSS `--medium` 20); Tag's ladder is off by one; Spinner is undersized at every step.
- **`Medium` is the systemic hole in the input family** — designed for date, time,
  numeric and phone; implemented only for `.input` and `.search-input`.
- **Focus rings disagree everywhere.** At least five idioms coexist. The canonical value
  is `0 0 0 2px #fff, 0 0 0 5px #3379db` (`design-system` §6).

**Other token violations.** `rap-evo.css` uses no design tokens at all (raw hex behind
`--rap-*`). `cabinet-evo.css` re-defines the broken tokens locally to work around the above.
The `.badge--{solid,subtle,outlined}-*` block and `.progress-tracker` hardcode values.

**Latent CSS bugs** (present, not fixed — fixing them is a code change, not a doc change):
- `main.css:13832` — `display: varf(--flex, flex)` (typo; declaration dropped)
- `main.css:20554` — `font-weight: font-weight(regular)` (SCSS leakage; dropped)
- `main.css:20612` — `width: var(--spacing-25)` (undefined token)
- `main.css:19585` — duplicate `.status-tag--neutral.is-outlined` with `!important`

**Dead code.** `rap-evo.css:440-673` still carries a complete older popover filter
implementation (`.rap-filter__*`, `.rap-checkbox`, `@keyframes rap-popover-in`) plus
`.rap-act-number` — referenced by no markup or JS. `cabinet-evo/index.html:240` renders
`data-cab-filter-trigger`, but nothing binds it, so that "Filtre" button is inert.

**`geap-sitemap.html` is exempt.** It is a self-contained React micro-system with its own
hex palette, its own `on`/`off` state convention, and a `.chip` class that collides with the
library chip while meaning something completely different (a sitemap tree node). It does not
load `main.css`. Whether it should be brought into the design system is an open question.
