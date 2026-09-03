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
| Input | `.input`, `.input-wrapper` | `input-preview.html` | library |
| Textarea | `.textarea` | `textarea.html` | library |
| Table | `.table` + `--default/--subtle/--strong/--white` | `table.html` | library |
| Pagination | `.pagination .pagination__item .pagination__link` | `pagination.html` | library |
| Accordion | `.accordion__trigger[aria-expanded]` | `accordion.html` | library (partial) |
| Avatar | `.avatar` + type + size | `avatar.html` | library |
| Breadcrumb | `.breadcrumbs__list .breadcrumbs__item` | `breadcrumbs.html` | library |
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
| Toast | `.e-permits-shell-toast`, `.toast` | `messaget-toast.html` | app |
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

### Search input

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

`.breadcrumbs` → `.breadcrumbs__list` (gap 6) → `.breadcrumbs__item` (draws its own
chevron `::after`) → `.breadcrumbs__link`, ending in `.breadcrumbs__current`
(semibold, `--gray-900`). Also real: `.breadcrumbs__item--back` (rotated `::before`),
`.breadcrumbs--mobile`, and `.breadcrumbs__item.is-selected` (suppresses the separator).
State-mirror classes `.is-hover` / `.is-focus` / `.is-visited` exist alongside the real
pseudo-classes. Visited is `--magenta-600`.

#### Verified against Figma — 2026-09-03

Source: **Components** file, page **Breadcrumb** `602:1933`. Its guidance is explicit,
and **two rules are entirely unimplemented**:

**⚠ Mismatch 1 — no overflow collapsing.** Figma: *"Limit the visible items to a maximum
of **4**. If there are additional pages, collapse them into an overflow menu"* — and the
page shows a `contextual-menu` instance doing exactly that. CSS has **no** overflow,
collapse, or menu class (`breadcrumbs__overflow` / `--collapsed` / `__menu` all return
zero). A long trail renders in full.

**⚠ Mismatch 2 — no truncation or tooltip.** Figma: *"If a breadcrumb label exceeds **30
characters**, truncate it with an ellipsis and display the full page title in a tooltip
on hover"*, with a `tooltip` instance shown. The breadcrumb CSS contains **no**
`text-overflow`, `ellipsis`, `max-width`, `overflow` or `white-space` rule at all.

**⚠ Mismatch 3 — hover colour is broken.** `.breadcrumbs__link:hover` sets
`color: var(--brand-600)` **with no fallback**, and `--brand-600` is **defined nowhere**
(0 occurrences). The declaration is therefore invalid at computed-value time, so `color`
resolves to `unset` → `inherit`, picking up `.breadcrumbs`' `--gray-700`. Only the
underline actually changes on hover. Fix by pointing it at `--blue-sky-600` (or
`--color-text-brand-default`), consistent with `.link`.

> Third instance of the same class of bug: `--black-1000`/`--white-1000` (12 tokens,
> §8), the `--color-text-brand-default-hover` collapse on `.link`, and now
> `--brand-600`. **Audit custom-property references for undefined targets** — the
> failures are silent.

---

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
- **Breadcrumb** — `.breadcrumbs__item` draws its own chevron `::after`.
  `.breadcrumbs__item--back`, `.breadcrumbs--mobile` real. **`.breadcrumbs--with-icon` does not exist.**
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

Primary visited resolves to `--magenta-600` (`#aa18ce`), consistent with
`.breadcrumbs__link:visited`.

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

---

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

---

## 8. Known issues and open questions

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
