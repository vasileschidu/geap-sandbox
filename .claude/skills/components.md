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

**PF / PJ icons (user, 2026-10-17 — one glyph family everywhere):** PJ (legal entity / company) =
`icon-business` (outline: avatars, identity cards, header / instance switcher, RSUD authorization card,
Cabinet) and `icon-business-filled` (filled contexts: „Persoană juridică” tags, „Tip persoană” segmented,
checkbox glyphs, RAP rows / profile / company summary). PF = `icon-person` / `icon-person-filled`.
Never `icon-suitcase`, `icon-suitcase-2` or `icon-suitcase-filled` for PJ. Figma: Foundations 20/business
`13c70475…` (24/business `b135d6dc…`, 16/business `931f741c…`), filled = 24/business-filled `c477fc69…`;
glyph 20 in avatars 32 / 40 (24 only in the 48 profile avatar), white on brand / apricot avatars.

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
| Stacked-list row hover (full width) | `.e-permits-stack__item.is-clickable` — side inset 20 on the ROW (list padding 0), inset divider = `::before`, fill `--color-background-base-tertiary` edge to edge, outer rows take `calc(var(--stack-radius) − 1px)`, dividers around the hovered row hide, kept while its ⋮ is open / a control has focus-visible, 140ms standard easing (off for reduced motion); the grey „Detalii” turns white on the band | section „Stacked-list row hover — full width” | app |
| Hover rules (all components) | one rule per class — table in „Hover — shared rules per component class” (§ after „Opening animations”); check with `tools/ui-qa/hover-audit.mjs` | — | app |
| Field sizes (all products, user rule 2026-10-18) | desktop = library Medium (40, `.input--medium` / `.search-input.medium`, FO fields 40); phones ≤760 = library default (48, text 16/24 `--font-size-fs-16` / `--line-height-lh-24`), icons inside a field at the library size of that field (48 → `--icon-size-default` 24 at 16 from the edge, text from 48; 40 → `--icon-size-medium` 20). FO: the field-size rules live in a `@media (max-width: 760px)` block (was 720); read-only phone, CAEM / subgenre list search rows, document-picker search follow it. **Search input + text area on phones = ONE shared rule (audit-fix-v1, 2026-10-21): `css/field-sizes.css`** (loaded right before `modal-phone.css` on the BO page, `e-permits-shell.html`, `clasificatoare.html`, Cabinet, RAP): every `.search-input.medium` (BO toolbars / lists incl. `e-permits-pay__tools`, eKYC, Clasificatoare, Cabinet `.cab-search`, RAP `.rap-search`, facet sheets) = 48 · 16/24 · icon 24 at 16 · text from 48, and `.e-permits-fo-textarea textarea` 16/24 in every product — the per-page copies (Cabinet, RAP, eKYC, facet sheet) were deleted; never add a page copy again. Check with `tools/ui-qa/component-audit.mjs` (agent `component-auditor`) | `Components/input-preview.html` | app |
| Dropdown item — one size everywhere (every action menu + option list, user rule 2026-10-20) | `css/dropdown.css` (loaded on the BO page, `e-permits-shell.html`, Cabinet, RAP — before `modal-phone.css`): lists / menus padding `--spacing-4`, gap `--spacing-2`; items 32 (`min-height`) · padding 6 12 6 8 · gap 8 · radius 6 · 14/20 medium · icon 20 (`--icon-size-medium`); same on touch. Item classes listed there: `.e-permits-fo-intent-menu__item` (every ⋮ / stack / Cabinet / Ghișeu / eKYC / builder / designer menu + the act post-process menu), `.e-permits-fo-select__option`, `__caem__option`, `__subgen-select__option`, `__address-search__option`, `__phone__code-option`, `__mdocs__option`, `.e-permits-workplace__filter-option` / `__filter-more-item`, `.e-permits-shell__help-link`, `__profile-link`; a menu's own rule declares no size | section „Dropdown item — one size everywhere”; ref GEAP 2.0 `9716:10905` | app |
| Dropdown surface (every menu / list / picker that floats) | ONE zero-specificity rule `:where(.e-permits-dropdown, .e-permits-fo-intent-menu, .e-permits-fo-select__list, …)` at the end of `css/e-permits-acte-permisive.css`: white, no border, `--border-radius-12`, Figma effect „dropdown-effect” (literal box-shadow — no CSS token), `overflow: clip`; scrolling surfaces keep their own `overflow(-y): auto`; new menus add `e-permits-dropdown` | section „Dropdown surface — one look for every menu” (§ after Menu); check: code-audit `dropdown-surface` | app |
| Button | `.btn` + variant + `.btn-sm/.btn-md/.btn-lg` (icon size from the button size: Small 16, Medium / Large 20 — `css/button-icons.css`, § Button › „Button icons”) | `buttons.html` | app |
| Clickable card / row = the action, no lone „Detalii” (user rule 2026-10-21, no-lone-detalii-v1) | a card / row that already opens its details on click has NO „👁 Detalii” button when that would be its only action: Cabinet request row (`actionsHtml` → "" → no `.cab-doc__actions`, no `--row-trigger-w` reservation), Cabinet document card (`CabEvo.docRowHtml(doc, { key })`: `.cab-doc.is-clickable[tabindex=0][aria-label="<tip>, deschide detaliile"]`), BO stacked rows (`renderRowActions({ …, rowOpens: true })` → "" when only the preview is left; `renderStackItem` gives a row with `rowAttrs` and no action `tabindex="0"` + `data-stack-row-open` + `aria-label` „<title> — <tags>, deschide detaliile”, Enter / Space = click through one shell keydown). Focus = the row ring (2 px `--focus-ring` outline, offset −2) + the hover band. Kept: rows / cards that are NOT clickable (FO previous act card, Ghișeu document cards, passport forms) and data tables (`tr` is not focusable — the column button is the keyboard path). With other actions the ⋮ stays | § „Row actions” rule 5; demo sm-01 (d-fresh, d-lab, d-prut), sm-05e…h, dos-03a, dos-04g…o, svc-06j, svc-07 | app |
| Action icons — „Editează” = pen, „Elimină / Șterge” = trash (user rule 2026-10-21) | shell `actionIconFor(label)` → `actionLabelHtml` / `renderRowActions` / `renderStackMenu` (the label picks the icon); `icon-edit` / `icon-delete` before the label in the label colour; exceptions + audit rule 6 in „Action icons” (§ after „Row actions”) | — | app |
| Unsaved-changes status → review (every draft page, user rule 2026-10-21) | `renderHeaderStatus(changesCountLabel(n), "warning", changesStatusAttrs("<source>"))` → `button.e-permits-page-header__status.e-permits-page-header__status--button[data-profile-changes][aria-haspopup=dialog]` (page header caption, Setări save bar `.e-permits-cfg2__bar`, dtpl sheet head) → ONE modal `#profile-changes-modal` fed by `registerChangeSource(key, build)`; never a plain `<span>` status for a count of unsaved edits | — (§ Profile tabs › „The status is a button”); demo svc-10x…10x3, clf-04d/e, ntpl-04d/e, svc-08n/n1, ek-24h, usr-u05f, rol-01b | app |
| Button — badge/CTA | `.btn-badge` + `--mpass/--msign/--mpay/--mpower/--mdelivery/--primary/--neutral` | — | app |
| Icon button | `.btn-icon`, `.btn-icon.clear` | — | app |
| Search input | `.search-input` + `.medium/.small/.large` + `.rectangular/.circular` | `search-input-preview.html` | app |
| Status tag | `.status-tag` + colour + `.is-subtle/.is-strong/.is-outlined` | — | app |
| Message / Banner | `.message` ≡ `.banner` ≡ `.inline-message` ≡ `.info-box` | `messages*.html` | app |
| Tabs | `.tabs .tab-buttons .tab-button.active` | `tabs.html` | app (partial) |
| Modal | `.modal-overlay.is-active > .modal` | `modals.html` | app (partial) |
| Modals on phones (≤760, every dialog family, 2026-10-19) | bottom sheet: 16 top gap (scrim), 0 sides / bottom, top radius 16, hug up to `100dvh − 16`; 16 inner padding; compact header / scrolling body / footer with two equal-half buttons (wrap → primary on top) + safe-area bottom; A4 page full width; header (2026-10-20): no drag handle, title 16 from the top, title + × on the first line, × 40 · icon 24, 8 under the sheet header; title 20/32 semibold on every phone dialog / sheet / drawer (2026-10-21) | `css/modal-phone.css` (loaded last); section „Modals on phones — maximum content space” | app |
| Badge | `.badge` + style + size | `badge.html` | app |
| Chip | `.chip` + `.is-selected/.is-disabled` | `chip.html` | app |
| Select — native | `.select` | `dropdown.html` | library |
| Select — custom | `.custom-select[data-select]` | `dropdown.html` | app (menu primitive only) |
| Checkbox | `.checkbox .checkbox-input .checkbox-custom` | `checkbox.html` | library |
| Radio | `.radio-group .radio .radio-custom` | `radio-buttons.html` | library |
| Switch — THE switch in every product (library-adopt-v1, 2026-10-21, user: „for the switch use the components as in the library”) | library `div.switch(.switch--disabled) > label.switch-wrapper > input.switch-input[type=checkbox][role=switch] + .switch-track > .switch-thumb` + `.switch-text > .switch-label + .switch-description` (default size 48×28, thumb 24 = Figma Switch) — emitted ONLY by `renderToggle({ label, description, checked, attrs, disabled, ariaLabel })` (`GEAPUi.renderToggle`); name = `aria-labelledby` → the label, description = `aria-describedby`; bare switches (permission rows: `aria-labelledby` the row title; eKYC veto table: `ariaLabel`). Product placement (`:is(.e-permits-front-office-page, .e-permits-shell-page)` in css/e-permits-shell.css): gap 12, label 14/20 medium default, description 14/20 tertiary, no gap, wrapper `margin: 0` (the library global `label` margin), ON + hover = brand hover; track centred on the whole text block (shipped 2026-10-01 layout). ~~`.e-permits-toggle*` (44×24 track, 20 knob)~~, ~~`.e-permits-builder__switch`~~ (dead) removed | `switch.html` | library + app |
| Checkbox option (grey container) | `renderCheckOption()` → `label.checkbox.checkbox--medium.e-permits-check-option` in `.e-permits-check-options` | Figma `10507:125565` | app |
| Long multi-select (100+ options) | summary `.e-permits-cfg-picks` + picker modal `#cfg-subdiv-modal` (`.e-permits-subdiv*`) | `cfgSubdivPicks` / `openCfgSubdiv` | app |
| Conditional rules (Afișează / Setează ca obligatoriu, câmp · operator · valoare, Și/Sau) | `.e-permits-doc-rule` card + `.e-permits-doc-cond` sentence rows + `.e-permits-doc-val` value group | `renderDocRule` / `renderDocCondition` | app |
| Template field with parameter tokens (Numerotare „Șablonul numărului”) | text input + `.e-permits-cfg-num-tokens` row of `btn btn-neutral btn-sm e-permits-cfg-num-token` holding `code.e-permits-doc-kw` | `cfgNumTemplate` / `cfgNumTemplateError` / `cfgNumberExample` | app |
| Long checklist with per-row options (RAP, 100 fields) | `.e-permits-cfg-rap-summary` (select field + published rows) + `#cfg-rap-modal`; composite = `.e-permits-cfg-rap__table` | `cfgRapPicks` / `cfgRapItemsHtml` / `openCfgRap` | app |
| Input | `.input`, `.input-wrapper` | `input-preview.html` | library |
| Textarea | `.textarea` | `textarea.html` | library |
| Table | `.table` + `--default/--subtle/--strong/--white` | `table.html` | library |
| Pagination | `.pagination .pagination__item .pagination__link` | `pagination.html` | library |
| Accordion | `.accordion__trigger[aria-expanded]` | `accordion.html` | library (partial) |
| Avatar — every product avatar (library-adopt-v2, 2026-10-21) | library `span.avatar.avatar--{xs 24 · sm 32 · md 40}.avatar--{initials · icon}` + the product hook class that keeps ONLY tone (brand / apricot / grey / person colour from data), stack border (`__stack-avatar`, `__role-collapse-avatar`), overlay (`__avatar-badge-overlay`, `__photo-overlay`) and placement: FO identity cards / selected role / account menu (`subjectInitialsAvatarHtml` · `subjectAvatarHtml` · `subjectCompositeAvatarHtml` via `libAvatarClass`, `FO_AVATAR_SIZE`), FO header badge (md; 32 on phones), „Solicitare nouă” (sm, icon 20), BO Utilizatori / eKYC user cells + dossier persons (xs), RAP beneficiary (xs) / profile + company summary (md), Cabinet header + account menu. 48 = Figma Avatar's 4th size but the library `--lg` is 56 → the FO account photo and the BO profile menu avatar keep `avatar avatar--initials` + their own 48 (library mismatch, see § Avatar). Kept on purpose: the BO user trigger's initials circle (`.e-permits-shell__user-avatar`) and the FO header trigger button (user decision). Enforced: component-audit family `avatar` | `avatar.html` | library + app |
| Empty state — **the only one** (every product; „no other empty states”) | `.e-permits-empty` (normal = page section · `--compact` = drawer / modal / side panel · `--bare` = table row / bordered list / modal list · bare + compact = menu / popover / combobox) via `GEAPEmptyState.render / .noResults / .tableRow` (`td.e-permits-empty-cell`) | `js/empty-state.js`, `css/empty-state.css`; section „Empty state — one component everywhere” | product |
| Breadcrumb | `.breadcrumbs .breadcrumbs__list .breadcrumbs__item` + `--trailing/--truncate/--mobile`; ONE renderer `GEAPBreadcrumbs.html(crumbs, opts)` (`js/breadcrumbs.js` + `css/breadcrumbs.css`; shell `renderBreadcrumbs()` / `renderPageHeaderTop`, `CabEvo.pageHeader({ back })`, RAP `crumbsHtml`) — desktop trail + phone back pair, „…” overflow > 4 levels, 30-char truncation + tooltip. **Every sub-page's way back; never a custom back link** (component-audit rule 5) | `breadcrumbs.html` | app (every page) |
| Progress tracker | `.progress-tracker .progress-step--*` | `progress-tracker.html` | library (partial) |
| Sidebar | `.sidebar .sidebar__link--active` | `sidebar.html` | library (partial) |
| Spinner | `.spinner` + size + colour | `spinner.html` | library |
| Separator | `.separator` + orientation + thickness + style | — | library |
| Link | `.link` + `.link-primary/-strict/-white` + `.link-xs/-sm/-md/-lg` | `link.html` | library |
| **Skeleton — ONE loading placeholder** (skeleton-v1; FO lookups, registry / SRRE fills, grid source, subject switch, page reveal auth / choice / step, BO sync summary) | `span.skeleton` + `--text` (1lh, r4, short line) / `--input` (40, phones 48, r8) / `--block` (r12, height from the slot) / `--circle` (24, round); `css/skeleton.css` loaded right after the library CSS; size = placement rules of the owner; containers `aria-hidden` + `aria-busy` region | section „Skeleton — ONE loading placeholder” | app |
| **Drawer — ONE right-hand panel** (drawer-v1; every BO / eKYC / Process Designer side panel) | `.drawer-overlay[hidden]` > `button.drawer-overlay__scrim` + `aside.drawer(.drawer--lg)[role=dialog][aria-modal][tabindex=-1]` > `header.drawer__header` (`.drawer__heading` > `h2.drawer__title` + `p.drawer__subtitle`, library `.modal-close`) · [strips] · `.drawer__body` (the only scroller) · `footer.drawer__footer` > `.modal-buttons`; `css/drawer.css` + `js/drawer.js` (`GEAPDrawer`: focus trap, Escape → the drawer's own ×, focus return); inner form vocabulary stays `.e-permits-user-create__section / __grid / __field` | section „Drawer — ONE right-hand panel” | app |
| **Tooltip — ONE runtime** (plain + hint; every tooltip in the product, tooltip-one-v1) | library `.tooltip.tooltip--small.tooltip--plain` / `.tooltip--{top\|bottom}-center` + arrow, ONE node `#icon-tooltip` placed by `js/icon-tooltip.js` (`GEAPTooltip`); opt-in `data-tooltip-label / -text / -reason / -hint`, `data-cell-tooltip` (cut text), `data-tooltip-placement`; never `title=` | section „Tooltip — ONE runtime” · `tooltip.html` | app |
| Header | `.header .header__wrapper` | `header.html` | library (partial) |
| Footer | `.footer__top/__middle/__bottom` | `footer.html` | library |
| Tag | `.tag-item` (a layout row, not a pill) | `tags.html` | library (partial) |
| **Copy value — one component** (default: profiles, header meta, detail rows, dialogs; `--compact`: tables, stacked rows, act / request meta) | `span.copy-value` > `button.copy-value__button[data-copy-value]` > `.copy-value__text` + `.copy-value__icon` (16) — whole element = one grey wrap on hover / focus / press; `.copy-value--compact` (no icon), `.copy-value--link` (link outside, icon button); „Copiază” → „✓ Copiat” plain tooltip `.copy-value__tooltip` | `GEAPCopyValue.html(value, { label, compact })` — `js/copy-value.js` + `css/copy-value.css`; lists: shell `renderListCode`, `GEAPActRow.metaParts` | app (every page) |
| Page header (back office) | `.e-permits-page-header` + `__top/__meta/__tabs` | `e-permits-acte-permisive.html?flow=back-office` | app |
| **Section header with an action — one pattern** (BO) | `.e-permits-dosar-profil__section-heading` > `h2.e-permits-dosar-profil__section-title` + `.e-permits-passport__heading-tools` (meta? + `btn-secondary btn-sm` / stack-menu button / `segmented-control`) — never a bare button in the heading | `renderStackedList(title, groups, { meta, actionHtml })` (svc-02 „Tipuri solicitări”); section „Section header with an action — one pattern” | app |
| Service passport | registry `kind: services` + `.permits-profile` passport | `?flow=back-office#serviciu/003000023/general` | app |
| **Document row — one pattern everywhere** (BO dossier: însoțitoare, Documente generate, Act/Decizie; FO picker / field values / Verificare / post-process act; Cabinet dossier + catalog) | one data shape `{ sursa: upload\|mdocs\|generat, tip, nr, fisier, size/kb, verb, at, de, semnat, tags }` · icon by source (grey `document-uploaded.svg` / blue `document-generated.svg`) · title = type + source tag + blue „✍ Semnat electronic” badge (`icon-signature`) · meta number · file · size · „<Verb> <date, time>” · „de …” · „semnat de …” · „👁 Detalii” (no download and no ⋮ on the row, 2026-10-20) → document modal with the A4 page preview + footer „Descarcă” · card = icon centred · title (1 line) + tags right after it / meta 12 stack-meta (2px dots) under the title · one surface secondary grey r12 pad 12 | BO `renderDosarDocItem` / `openDosarDetail(kind, id)`; FO `foDocIconHtml` / `foDocContentHtml` / `foSummaryDocsHtml`; Cabinet `CabEvo.docRowHtml` / `openDocModal`; section „Documents — one pattern everywhere” | app |
| Dosar › Documente însoțitoare (applicant's documents) + document modal with page preview | `renderStackedList` groups Obligatorii / Opționale · `li.e-permits-stack__item.has-lead.is-clickable[data-dosar-detail-row="insotitoare\|fN"]` (lead `img.e-permits-fo-lib-item__icon` grey uploaded / blue MDocs · title · `MDocs`/`Încărcat` tag · meta) · no button: the row is the control (no-lone-detalii-v1, `rowOpens`; ⋮ Descarcă gone 2026-10-20); modal `#dosar-detail-modal` + `.e-permits-doc-peek__canvas.e-permits-detail-modal__preview > .e-permits-dtpl__page.e-permits-doc-peek__page` | `renderDosarInsotitoare`, `openDosarDetail("insotitoare", id)`, `renderDosarDocPreview`, `fitDosarDocPreview`; section „Dosar › Documente însoțitoare” | app |
| Sum list (list + total tray) | `.e-permits-sum-list` > list + `.e-permits-sum-list__total`; JS `renderSumList(listHtml, total)` | Figma 9721:9920 | app |
| Next step | `.e-permits-next-step` > `__label` + `__box` (icon + target); JS `renderNextStep(target, { label, icon })` | Figma 9721:9920 | app |
| Toast | `.toast-container > .toast.toast--{info\|success\|warning\|error}` via `GEAPToast.show()` (`js/toast.js`) | `messaget-toast.html` | library |
| Request statuses (Solicitările mele, status matrix 2026-10-20) | one table per status / variant: row tag · alert · meta date, profile status card + timeline, notification kind — drafts (pending note, signed + paid, removed automatically, Continuă / Elimină errors), În derulare after suplinire / after an expired suplinire, refused + appeal countdown, duplicate / suspendare / reluare, paper delivery, filed by a representative | `REQUEST_UI` / `normalize` / `autoRemoved` / `statusNow` / `timelineEvents` (solicitari.js), `eventsOf` (notificari.js); section „Request statuses — Solicitările mele”; demo sm-03d…03h, sm-04i…04l, sm-05o…05s, nt-01d…01g | page-app |
| Request row (Solicitările mele, 2026-10-20) | the shared act row: `ul.e-permits-fo-intent__list.cab-act-list.cab-request-list > li.e-permits-fo-lib-item.e-permits-fo-intent-act.cab-request-row[data-sm-card](.is-new/.is-static)` — NO lead icon (the ONE row anatomy, no grid / action column since trigger-corner-v1), title = object + ONE Small status tag (a finalized request = its OUTCOME tag only — Aprobat / Aprobat tacit / Respins, never „Finalizat” + outcome, outcome-tag-v1) + `.sm-tacit` while the tacit approval is pending, meta = the shared slots (§ „List rows — act + request”), right `.cab-doc__actions.cab-card__actions` = ⋮ only (`btn btn-neutral btn-sm btn-icon-only cab-card__more` (grey at rest), row-kebab-v1) nothing when „Detalii” was the only action (no-lone-detalii-v1: the card is the action, no reservation) — the ⋮ absolute in the card's top-right corner at EVERY width (shared rule, act-trigger-fixed-v1 phones → trigger-corner-v1 all widths); the row (click / Enter) ALWAYS opens the details — every status, drafts included, never the FO form (2026-10-20), ACTION-ONLY alert in the act row notice slot (`noticeHtml`, warning / error) with one `.cab-alert-link` | `cabinet-evo/solicitari.js` `cardHtml` + ONE status map `REQUEST_UI` (tag tone · alert · date slot); demo sm-01*, sm-04h1 (alert link), sm-03i (draft row → details) | page-app |
| Act profile (EVO Cabinet „Actele mele permisive” › ?act=, act-profile-v1 2026-10-21) | BO header + subtitle (act type) · ONE left-aligned action row with the „⋯” overflow (`.cab-act-header__bar/__actions/__overflow`) · key-facts card `.cab-act-header__facts > p.cab-act-header__key` + status notice + „Vezi toate detaliile” · BO sections Ce permite actul · Detalii act · Autoritatea emitentă · Beneficiar · Istoric (trajectory) · full container | `cabinet-evo.js renderDetail`; section „Act profile — EVO Cabinet (act-profile-v1)”; demo pp-01d…pp-01z, pp-03…pp-03d | page-app |
| Key facts row | `dl.cab-facts > .cab-facts__item > dt + dd` (vertical dividers; stacks ≤600) | `factsHtml` (solicitari.js), catalog service page | page-app |
| Callout tones | `.e-permits-callout--{info\|warning\|neutral\|success\|danger}` | `calloutHtml` (solicitari.js) | app |
| **Trajectory (traiectoria dosarului) — one component** (2026-10-20; every process path: BO dossier, eKYC Plan de verificare / Traseul reviziei, FO finish tracker + „Statutul dosarului” incl. post-process, Cabinet „Stadiul solicitării”) | `.e-permits-trajectory(--vertical\|--bare)(.is-stacked)` › `ol.e-permits-trajectory__steps` › `li.__step.is-{done\|current\|paused\|attention\|rejected\|skipped\|todo}` › `__body` (`__marker` 24 icon / `__dot` ring · `__title` > `__label` (+ Small tag) · `__meta`); current label on the soft pill | `GEAPTrajectory.html({ steps, layout, bare, label, className })` (`js/trajectory.js`, `css/trajectory.css`); section „Trajectory (traiectoria dosarului) — one component”; demo dos-01 / 01b / 01g / 01h, ek-05g, ek-05d, ek-07e, fo-08, pp-10f, sm-04b | app |
| **Close × — library only** (audit-fix-v4, 2026-10-21) | dialogs, drawers, panels, full-screen tools = library `button.modal-close` (32 round, gray-200 → gray-250, icon 16 `icon-cross-large`; absolute in `.modal`, `position: static` in a header row: drawer `.drawer__header > .modal-close`, Form Builder / Process Designer top bar + classifier registry `.modal-close.e-permits-builder__close`, FO „Configurare flux” `.modal-close.e-permits-fo-testcfg__close`); banners = library `button.banner__close` (FO beta banner: `.banner__close.e-permits-fo-auth__beta-close`, 8 + 16 + 8, centred; phones on the first text line); toasts `.toast__close`, chips `.chip__close`. Phone sheets: × 40 / icon 24 (css/modal-phone.css). ~~Private × paint (`e-permits-builder__close` 32 tertiary + 24 icon, `e-permits-fo-auth__beta-close` 16 inline path, `e-permits-fo-testcfg__close`)~~ removed — the old classes are placement hooks. Open (doc-viewer agent's area): `e-permits-fo-doc-modal__close` (FO / Cabinet / RAP document modal) | `e-permits-acte-permisive.html`, js/process-designer.js | app |
| **Tag · Small — ONE tag everywhere** (audit-fix-v5, 2026-10-21; BO tables / profiles / passport, eKYC, Ghișeu, FO, Cabinet, RAP) | library `span.status-tag.status-tag--{tone}.is-subtle.status-tag--small` (+ `> svg.icon` leading 16) — 20 high at EVERY width (main.css drops `--text-caption-md-font-size` to 10 at ≤720 = 17.7 high; `css/tag.css` pins it), 12/16 medium, side 6 + the 1px library tone border, radius 4, min 32, one line, sentence case; icon variant 4 · gap 4 · 6. Tones: success · brand · accent (warning) · danger · neutral · muted + product `violet` (no Foundations token — PO). Old product tone names map once in `GEAPTag.tone` (ok / teal / positive → success, info → brand, warning / high / warn / apricot → accent, crit / error → danger, unknown → neutral). ~~`.e-permits-workplace__tag(--tone / --icon)`~~ removed (shell, bo-profile-parts); host rules that size Medium value tags (passport panel, dosar row values) are `:not(.status-tag--small)` | `GEAPTag.html(label, tone, { attrs, icon, className })` / `GEAPTag.cls(tone)` in `js/tag.js` + `css/tag.css` (BO page, shell page, Cabinet, RAP); `renderTag` delegates; FO „Beta” = `status-tag--neutral is-strong status-tag--small` | app |
| **BO side navigation** — product component, kept (user decision 2026-10-21; Figma GEAP 2.0 sidebar 8993:35379, item 36) | `aside.e-permits-shell__sidebar` › `.e-permits-shell__sidebar-header` (logo + title / „Back Office” + collapse button) · `nav.e-permits-shell__nav` › `.e-permits-shell__nav-group` › `p.e-permits-shell__group-label` + `ul.e-permits-shell__nav-list > li > a.e-permits-shell__nav-link[data-nav-item](.is-active[aria-current=page])` (icon 20 · gap 12 · label 14/20 medium · padding 8 16 · 36 high; current = `brand-secondary` fill + brand text; hover tertiary; optional count badge), collapsed rail `.e-permits-shell.is-collapsed` (labels → tooltips, js/icon-tooltip.js). **Collapse button = library icon-only button** (library-adopt-v3): `button.btn.btn-strict.btn-sm.btn-icon-only.e-permits-shell__sidebar-toggle[data-shell-toggle][aria-expanded]` (32, icon-sidebar 16, aria-label + tooltip „Colapsează meniul” / „Extinde meniul”); it is a disclosure, so the „open button keeps the ring / pressed fill” rule is switched off for it (strict Small states, ring on keyboard focus only). ~~The private 30 grey toggle~~ removed. In the component-audit allow-list (`product`) | `js/e-permits-shell.js` (nav render, `syncExpandedState`) | app |
| **Status filter tabs** — product component, kept (user decision 2026-10-21: the library tabs are 48 / 16, too big) | `.e-permits-workplace__status-tabs[role=tablist][data-workplace-tabs]` (one line, horizontal scroll, no scrollbar; hairline dividers above / below from the toolbar / table) > `button.e-permits-workplace__status-tab[role=tab][data-workplace-tab](.is-active[aria-selected=true])(--danger …)` — 40 high, padding 0 12, gap 6, label `__status-label` 14/20 regular secondary, current = brand text 500 + 2px brand underline (bottom border), optional tone dot `__status-dot`, count `__status-count` = the 20 numbered pill (12/16 medium, tone fill) | `renderStatusTabs` in `js/e-permits-shell.js` (BO Dosare + every registry, eKYC, Ghișeu) | app |
| **BO user trigger** — product component, kept (user decision 2026-10-21) | `button.e-permits-shell__user-trigger[aria-expanded]` (256 × 54, padding 6 8, radius 12, white; open = the canonical ring + chevron up) > `.e-permits-shell__user-avatar` (40 initials circle — stays, part of the trigger) + name 14/20 medium + role 12/16 tertiary + chevron 20 → `.e-permits-shell__profile-menu` (dropdown surface; profile avatar = library `.avatar` 48) | `js/e-permits-shell.js` | app |
| **Selectable cards** — five product components, kept (user decision 2026-10-21; no library card) | (1) FO identity choice `button.e-permits-fo-auth__role-item(.--dashed for „Am procură notarială”)` 70 high · padding 16 24 16 16 · radius 12 · 1px default border · avatar `.avatar--sm` + name 14/20 medium + ID meta + chevron; (2) BO role picker `button.e-permits-shell__role-card[role=menuitemradio]` 58 high · radius 12 · 1px border · icon circle + role + subdivision (padding 9 13 = off-scale, PO); (3) „Solicitare nouă” `.e-permits-fo-intent-new` 78 · padding 16 · gap 16 · radius 12 · brand-secondary fill · avatar `.avatar--sm` icon; (4) option rows `.e-permits-fo-radio--option` (library radio inside a bordered row); (5) delivery `.e-permits-fo-delivery-option` 71 · padding 12 16 · gap 16 · radius 12 · brand-secondary when chosen. Hover / selected / focus per „Hover — shared rules”. In the component-audit allow-list | `js/e-permits-acte-permisive.js`, `js/e-permits-shell.js` | app |
| **Button · Small — the product re-skin** (= Figma Small, documented, kept) | every `.btn.btn-sm` (+ variant) in the product is 32 high, radius 6, fill-only with a transparent 1px border, 14/20 medium, icon 16 (css/button-icons.css); `btn-strict btn-sm` = the no-fill text button, `btn-neutral btn-sm` = the grey one; defined ONCE in css/e-permits-acte-permisive.css („ONE back-office button”, § Button). It differs from Components/buttons.html (29.25 high, library border) by design — a PO question for the library, not a product bug | — | app |
| **RAP public header** (gov.md style) — product component, kept | `.rap-header` › `nav.rap-header__menu > button.rap-header__menu-item` (72 high · padding 0 16 · 16/24 · gap 6, current underline) · `nav.rap-header__languages > button` (Ro / Ru, 14/20 medium, current underlined) · `.rap-header__actions > button.rap-icon-button` (40 round, search / help icons 20) · the government mark in the top bar = `assets/logos/egov.svg` (vector from EVO-WEB `government-logo`, 18 × 21; also the FO / Cabinet / BO login / shell top bars — never the old `government-logo.png` raster) | `rap-evo/index.html`, `rap-evo/rap-evo.js` | page-app |
| **Setări section nav** — product component, kept | `.e-permits-cfg2__nav` (sticky, 220 wide, `--cfg2-stick`) > `a.e-permits-cfg2__nav-link(.is-active[aria-current])` — 36 high, padding 8 12, gap 8, radius 8, 14/20 medium secondary; hover tertiary; current = brand-secondary fill + brand text; trailing dot warning (changed) / danger (errors); follows the scroll (scroll spy) | `renderServiceSettingsV2` (Servicii › Setări), eKYC config pages | app |
| **Editor toolbar** (notification template rich text) — product component, kept | `.e-permits-ntpl-editor__toolbar.e-permits-dtpl__toolbar[role=toolbar]` > `button.e-permits-ntpl-editor__tool[aria-pressed]` — 32 high, padding 0 6, radius 6, transparent → tertiary hover, pressed = tertiary-active; icons 20 (Aldin, Italic, liste, link, „Șterge formatarea”) + `.separator--vertical` groups | `js/e-permits-shell.js` (ntpl editor) | app |
| Destructive confirm (FO) | `.e-permits-fo-instance-switch-modal__icon--danger` + confirm `btn btn-destructive` (`__primary--danger` = hook only) | `openConfirm({ danger: true })` (solicitari.js) | app |
| FO confirm dialog footer (G8 leave, instance switch, post-process, grid row delete, Cabinet confirms; audit-fix-v2, 2026-10-21) | `div.modal-buttons.e-permits-fo-instance-switch-modal__actions` > `button.btn.btn-neutral.__secondary` (cancel) + `button.btn.btn-primary.__primary` / `btn btn-destructive` (danger; JS swaps `btn-primary` → `btn-destructive`) = the library modal footer (40 pills, 14/20, gap 12); the card keeps only its 12 20 24 inset. ~~Private pill buttons (48, black 1.5 outline, hover `#004ab3`)~~ removed | `e-permits-acte-permisive.html` dialogs, `CabEvo` pp confirm, `openConfirm` | app |
| Warning confirm (FO, data loss) | `.e-permits-fo-instance-switch-modal__icon--warning` (amber `--color-icon-warning-default`, warning-filled icon); primary stays brand (the safe action) | G8 guest leave dialog | app |
| FO step footer (audit-fix-v2, 2026-10-21) | `.e-permits-fo-form__actions` › „Salvează ca schiță” `button.btn.btn-text-neutral.e-permits-fo-draft-button` (icon-cloud-upload-draft) · back `button.btn.btn-neutral.btn-icon-only.e-permits-fo-back-button` (arrow-left, 48 square) · „Înainte” `button.btn.btn-primary.e-permits-fo-next` (mirrored arrow) = Figma Button Large (48 · 16/24 · icon 20) at every width (`.e-permits-fo-form__footer` pins `--text-body-md-500-font-size` 16; the library drops it to 14 ≤720); phones: draft label one line, the step navigation wraps to its own right-aligned row (gap 12) when both do not fit. The old classes are layout / JS hooks only — ~~private paint~~ removed | `stepFooterHtml` (FO + Ghișeu), static steps in `e-permits-acte-permisive.html` | app |
| Add / upload document button — ONE pattern (audit-fix-v2, 2026-10-21) | `button.btn.btn-secondary.btn-md` + 20 leading icon: „Adaugă fișier” (`.e-permits-fo-doc-field__add`, icon-plus-large; also Ghișeu „Generează cererea pe hârtie”), „Adaugă document” (`.e-permits-fo-add-doc-button`, was a 32 brand outline), „Încarcă fișier” in the phone drop zone (`.e-permits-fo-upload-button`, was black; shown ≤720 only). Hook classes keep placement only. Open: the boxed doc field still uses `btn btn-strict btn-md` + icon-upload (row „Boxed doc field”) | `documentItemHtml`, other-docs block, `fileDropHtml` (js/e-permits-acte-permisive.js), js/ghiseu.js | app |
| **List pager — ONE pager everywhere** (audit-fix-v3, 2026-10-21: EVO Cabinet, RAP, every BO / eKYC / Ghișeu registry, `e-permits-shell.html`) | `div.e-permits-pager` > `p.__range` („1–16 din 33”, 14/20 tertiary) + `nav.__nav` > library `ul.pagination` > `li.pagination__item` > `button.pagination__link(--active / --disabled)` (‹ › chevrons 20, „…” gaps over 7 pages) + `div.__size` > `button.btn.btn-text-neutral.btn-sm.__trigger[data-pager-size-trigger][aria-haspopup=menu]` („16 pe pagină ⌄”) + `ul.e-permits-fo-intent-menu.__menu` (dropdown items, `menuitemradio` + check, opens ABOVE); none when `total ≤ sizes[0]` (the BO footer hides itself, `:has(:empty)`) | `GEAPPager.html({ total, page, perPage, sizes, prefix, label, sizeLabel, sprite })` in `js/pager.js` + `css/pager.css`; the page handles `data-<prefix>-page` / `data-<prefix>-per-page` clicks; the size menu (↓ / ↑ / Home / End / Esc → trigger, Tab / outside click close) lives in pager.js. `CabEvo.pagerHtml` delegates to it (`sm`, `cab`); BO `renderPagination` (`workplace`), RAP (`rap`). ~~`.cab-pager*`, `e-permits-workplace__pagination-*` / `__rows-control` / `__rows-select`, `rap-page-button`, `rap-pagination__*`, `rap-select`~~ removed; `.e-permits-workplace__pagination` / `.rap-pagination` = hosts only. Demo dos-05, sm-01j, pp-01t, rap-01 | app |
| Access restriction notice (EVO Cabinet, MPower expired / revoked) | `.e-permits-callout.e-permits-callout--neutral.cab-callout` (lock icon, title „Împuternicirea MPower a expirat / fost revocată pe <data>”, text) — requests: above the read-only history (US-159 AC-06); acts: ALONE in `[data-cab-restriction]`, no toolbar / list / actions (Feature 90818 §4) | `CabEvo.restrictionHtml(readOnly, text)`; demo sm-07b, pp-01v | page-app |
| ~~Request list table~~ (removed 2026-10-20) | the US-19 desktop table (`.sm-table*`, sortable headers) was replaced by the request rows + the „Sortează” menu on desktop and phones — see § „List rows — act + request” | — | — |
| Countdown (EVO Cabinet, US-19 AC-05…08) | `.sm-countdown(--warning\|--info)` = 16 icon + 12/16 text in `[data-sm-countdown="<ISO day>"]` („mai sunt 9 zile și 11 ore”), refreshed every minute; warning = the applicant acts (Schiță, Informații suplimentare, Spre achitare — AC-09), info = În derulare | `countdownHtml` / `countdownText` / `deadlineOf` | page-app |
| Tacit approval mark in a list (US-19 AC-15) | `button.sm-tacit[data-sm-tip]` = `icon-circle-checkmark` + „Disponibilă aprobarea tacită” (12/16 medium brand, underline on hover) + the library tooltip | `tacitListMark`; demo sm-01k | page-app |
| Profile tabs (EVO Cabinet request profile, US-161) | `.cab-profile-tabs` › BO page-header strip `.tabs.e-permits-page-header__tabs > .tab-buttons[role=tablist] > button.tab-button[role=tab][data-sm-tab]` + `.cab-profile-tabs__panel[role=tabpanel][data-sm-panel]`; ←/→/Home/End; hash `#dosar/<id>/<tab>` | `profileTabsHtml` / `selectTab`; demo sm-05 (Date generale), sm-05j / 05k / 05l / 05m | page-app |
| Notification row (EVO Cabinet › Notificări, minimal) | the request stacked row `.e-permits-stack__item.sm-item.nt-item` + lead `.nt-item__icon--success/warning/danger/neutral` (32 circle, 20 icon) + `p.nt-item__text` + „Nou” Small info tag (≤ 3 days) + one labelled action | `cabinet-evo/notificari.js`; demo nt-01…01c | page-app |
| Retry notice (EVO Cabinet) | `.cab-retry` = `.cab-message` error notice + `btn btn-strict btn-sm` „Reîncercați” (`icon-rotate-arrow`) on one row, wrapping ≤ 320 of notice (= Ghișeu `.e-permits-gh__retry`) | `solicitari.js redirectError` (US-24 AC-04); demo sm-04h, sm-04h1 | page-app |
| Act viewer — MDocs act in the document modal (RAP public page, US-143) | FO doc-modal shell `.e-permits-fo-doc-modal-overlay.rap-act-modal > .e-permits-fo-doc-modal.rap-act-modal__dialog` (header title „Forma de tipar a actului” since 2026-10-17 + the expandable subtitle, `.rap-act-modal__body` > grey `.e-permits-doc-peek__canvas.rap-act-modal__canvas` > A4 `.e-permits-dtpl__page.e-permits-doc-peek__page.rap-act-doc` zoomed to the canvas, footer „Imprimă” (`__cancel` + printer stroke icon) · „Închide” (`__submit`)); loading / errors = `GEAPEmptyState` bare (spinner / `circle-error`, AC texts) in the canvas; page content `.rap-act-doc__head/__arms/__country/__authority/__office/__number/__foot/__sign/__signed/__qr/__qr-code/__footer`; status ≠ Valabil → `.rap-act-doc__watermark--warning/--danger/--neutral` (tag tone); ≤600 full-height sheet (24 from the top, r16 top) (phones ≤760 since 2026-10-19: the shared rule „Modals on phones — maximum content space”, 16 from the top, radius 16); `@media print` prints the page only. Shared CSS for pages without the FO stylesheet: `css/doc-modal-parts.css` | `openActDocument(record, opener)` / `renderActPage` / `fitActPage` in `rap-evo/rap-evo.js`; demo `rap-03…03f`, `?mdocs=incarcare\|indisponibil\|date\|sablon` | page-app |
| Document viewer — preview + signature card (doc-viewer-v2, 2026-10-21, GEAP 2.0 11366:6892) | every document (generated + uploaded) = header · A4 canvas filling the dialog (r16 + inset 1px border-default ring) · 12 · `div.e-permits-doc-signature` (Small brand tag `icon-signature` „Semnat electronic” ABOVE `p.e-permits-doc-signature__meta` „MSign · signer · date, time” 14/20 tertiary; grey card r16, pad 12 16, gap 2, as wide as the canvas) · footer; no „Date generale”, no „Doar citire”, no badge by the title; unsigned = no card | `GEAPDocPreview.signatureHtml` (js/doc-preview.js, css/doc-preview.css › „Signature block”); BO `openDosarDetail`, `CabEvo.openDocModal({ generated, signature })`, `GEAPActView` document dialog, Ghișeu `previewSignature`; section „Generated document viewer”; demo `dos-04s`, `sm-05f`, `pp-01m`, `rap-03l`, `gh-10d` | app + page-app |
| Document preview — A4 page(s) in a grey canvas (ONE pattern: Ghișeu previews, BO dossier document modal, RAP „Forma de tipar a actului”, 2026-10-17) | canvas `.e-permits-doc-peek__canvas` (`role="document"`) > `.e-permits-dtpl__page.e-permits-doc-peek__page.e-permits-doc-page[data-doc-cont]` > `.e-permits-dtpl__surface.e-permits-doc-page__surface` (title · ONE 2-column table, heading rows `tr.e-permits-doc-page__group > th[colspan=2]`, `<colgroup><col class="e-permits-doc-page__label-col"><col>` when it starts with a heading row · `.e-permits-doc-page__tail` · `p.e-permits-doc-page__footer` „… · <span data-doc-page-label>Pagina k din n</span>”); loading / error = `GEAPEmptyState` bare in `.e-permits-doc-peek__canvas--state`; BO dialog = `#dosar-detail-modal` + `modal--lg e-permits-detail-modal--doc`; footer „Printează” `btn-neutral` + `GEAPDocPreview.printIcon()` · „Descarcă” `btn-primary` + `icon-export` | `GEAPDocPreview.paginate / fit / print / printIcon` (`js/doc-preview.js`, `css/doc-preview.css`); section „Document preview — one A4 viewer”; demo `gh-07a…07a3`, `gh-07g`, `gh-07g1`, `gh-10d`, `dos-04h`, `rap-03b`, `rap-03k` | app + page-app |
| Act data modal „Vizualizare act” (RAP, US-162 AC-12 / US-163, Figma EVO-WEB-3.0 20607:34846, 2026-10-17) | the BO detail modal markup (`#dosar-detail-modal`): `.modal-overlay.rap-act-data > .modal.modal--md.e-permits-passport__modal.e-permits-case-modal.e-permits-detail-modal` (× `.modal-close`, `.modal--header` title „Vizualizare act” + subtitle `.e-permits-passport__modal-subtitle.rap-act-subtitle`, `.modal-content` = „Date generale” + „Câmpuri specifice actului” BO sections (`.e-permits-dosar-profil__section/__card/__row`) + grey note `info-box.e-permits-info-note.e-permits-readonly-note` (shield), footer `.modal-buttons` `btn-neutral` „Descarcă” (export icon) · `btn-primary` „Închide”); since 2026-10-19 the act's configured fields = one BO section per configured group (row „Configured act fields — groups + tables”; the old in-card heading rows `.rap-act-data__group/__more-row/__toggle` are gone); scroll hairlines `has-scroll-above/-below`. „Descarcă” parks it and opens the act viewer above (forma de tipar); closing the viewer comes back. CSS: `css/bo-profile-parts.css` „Detail modal” block (BO computed values) + `css/act-view.css` | shared `js/act-view.js` (`GEAPActView.create(…).openData(act)` / `.openDocument(act)`, view model in the file header) + `css/act-view.css`; RAP maps its record in `toActView` (`rap-evo/rap-evo.js`), Cabinet in `toActView` (`cabinet-evo/cabinet-evo.js`); demo `rap-03`, `rap-03g…03m`; parity `tools/ui-qa/specs/rap-act-modal-vs-bo.json` (dos-04s ↔ rap-03 = 0) | page-app |
| Public profile header (RAP act profile + every EVO Cabinet profile, 2026-10-17) | `header.e-permits-page-header.e-permits-page-header--public` › `__body` (16 top, 12 inset) › `__top` › `__heading` (gap 16): `nav.breadcrumbs` (desktop: the parent trail ending in the current page = the title — medium, not a link, `aria-current`, cut at 30 + tooltip; breadcrumb-v2, 2026-10-21, as Figma 232:5282 and the BO) + `nav.breadcrumbs.breadcrumbs--mobile` (≤760: `li.breadcrumbs__item--back` › `.e-permits-page-header__crumb-label`) + `h1.__title` (wraps, never truncated) · `__meta` items (label 12/16 tertiary, value 14/20 medium, dividers; ≤760 = 2 equal columns, no dividers, column gap 16) · the primary `btn btn-primary btn-md .e-permits-page-header__action` (hugging, 8 under the meta) or `.e-permits-page-header__action-row` (primary + neutral `btn-md`, gap 8). The status = a „Stare” meta item with the Tag · Small. Width (full container, 2026-10-21): the RAP act profile = the list / table width (`--rap-content-width`: header box + section cards on the table edges at 1440 / 1024 / 761, text keeps the 12 inset; detail label column `clamp(120, 30%, 200)`, wrapping, value fills the rest; text in cards ≤ 75ch), the Cabinet act profile = `--cab-list-width`; phones 16 gutters | `css/bo-profile-parts.css`; renderers `rap-evo.js renderProfile`, `CabEvo.pageHeader({ back, title, titleId, meta, actions, subtitle?, bodyHtml? })` (subtitle / bodyHtml: the act profile, act-profile-v1); parity `tools/ui-qa/specs/rap-profile-vs-bo.json` (svc-01 ↔ rap-02 = 0), `tools/ui-qa/specs/cabinet-profile-vs-bo.json` (svc-01 ↔ sm-05 = 0) | page-app |
| Request status card „Stadiul solicitării” (EVO Cabinet, 2026-10-17) | BO section title over `.cab-status` (white, 1px `--color-border-base-default`, radius 24 / 16 ≤760, clip) › `.cab-status__now` (20 / 16 inset, gap 8: `.cab-status__tags` Tag · Small status + marks · `p.cab-status__title` 16/24 semibold = the status sentence / next step · `p.cab-status__text` 14/20 secondary · `.cab-status__actions[data-sm-dl-scope]` the action that exists: Continuă schița + Elimină, Suplinește informații, Achită (MPay badge), Vezi actul + Descarcă, Depune contestație) · hairline · `.e-permits-trajectory.e-permits-trajectory--vertical.e-permits-trajectory--bare.cab-status__timeline` (the shared trajectory, vertical, no card of its own, padded 20 / 16 ≤760: done steps with full-month dates, the current / attention one on the soft pill + `aria-current="step"`, next steps as rings without dates — since 2026-10-20) | `cabinet-evo/solicitari.js` `statusCardHtml` / `statusNow` / `timelineEvents` / `timelineHtml`; demo sm-03 (Schiță), sm-04 (În derulare), sm-04a (tacit), sm-04b (Informații suplimentare), sm-04c (Spre achitare), sm-05 / 05a / 05b (Finalizat aprobat / respins / decizie) | page-app |
| Configured act fields — groups + tables (2026-10-19, Figma comment EVO-WEB-3.0 20607:34846) | each configured group = BO `section.e-permits-dosar-profil__section` + `__section-title` over `.e-permits-dosar-profil__card.e-permits-act-fields[data-act-fields]` (`.is-collapsed` when > 10 items: items ≥ 9 get `.e-permits-act-fields__more`, toggle `.e-permits-act-fields__toggle` > `btn btn-text-primary btn-sm btn-rounded[data-act-fields-more][aria-expanded][aria-controls]` „Arată toate câmpurile (N)” / „Arată mai puține câmpuri”); simple field = BO `__row` (label on the first line for multi-line values; a list = `ul.e-permits-act-fields__list`); grid = `.e-permits-act-fields__table-field` > `p.__table-label` + `.__table-wrap[role=region]` (white, 1px border, r12, own sideways scroll) > `table.__table(.is-collapsed)` (th 38 · 12/16 medium on secondary; td ≥ 50 · 14/20 secondary · 8/12; `.is-number` right-aligned; first column sticky + divider; `__more-row` / `__edge-row` for first 5 + „Arată toate (N)” / „Arată mai puține”; every td = `__cell-label` (phones only) + `__cell-value`); ≤ 760 rows = white mini-cards r12 (first cell label over value, the others label · value lines). A4: `tr.e-permits-doc-page__keep.e-permits-doc-page__grid-label` + `__grid-head[data-doc-grid]` + `__grid-row[data-doc-grid-of]` each holding a one-row `table.e-permits-doc-page__grid` (colspan units 3·2·2…), header repeated on continuation pages (`.is-repeat`) | `GEAPActView.fieldsHtml(groups, { section, untitled })` / `normalizeFields` (js/act-view.js) + css/act-view.css + css/doc-preview.css › „Grid on the page”; used by the act data modal (RAP + Cabinet) and Cabinet „Solicitările mele” › Act; demo `rap-03i/03j/03q/03r/03s/03t`, `pp-01x/01y/01z`, `sm-05n`; parity `tools/ui-qa/specs/act-fields-rap-vs-cabinet.json` (rap-03q ↔ pp-01x = 0) | page-app |
| Expandable long name in a dialog subtitle (2026-10-17) | `p.rap-act-subtitle` > `__number` (copy, never cut) + `__name` (`__text` clamped: 1 line nowrap + ellipsis on desktop, line-clamp 2 ≤760); only when it overflows the name becomes ONE `button.rap-act-subtitle__name[data-rap-clamp-toggle][aria-expanded]` with `__more` „Mai mult” / „Mai puțin” (brand, underline on hover, RAP focus outline); no hover tooltip | `actSubtitleHtml` / `syncClamps` / `toggleClamp` (`rap-evo.js`); demo `rap-03g` / `rap-03h` | page-app |
| Long name in a header — expand on click (2026-10-19) | host `[data-name-expand]` (the FO top-bar `h1`) › `span.e-permits-name-expand` > `__text` (one line, ellipsis) while the name fits; only when it is really cut (`scrollWidth > clientWidth`, measured without the affordance) › ONE `button.e-permits-name-expand[data-name-expand-toggle][aria-expanded][data-tooltip-text]` > `__text` + `__more` (`__more-label` „Mai mult” / „Mai puțin” 14/20 medium brand + 16 `icon-chevron-bottom`, rotated when open); hover = the label underlines, focus = the FO ring (2 white + 5 `--focus-ring`); open = the name wraps with the label after its last word, host `.is-name-expanded`, the header grows; plain tooltip with the full name while collapsed (icon-tooltip.js `data-tooltip-text`) | `js/name-expand.js` (`GEAPNameExpand.set(host, text)` / `scan` / `sync` / `collapseAll`) + `css/name-expand.css`; FO `setFoServiceTitle`; demo `pp-18` (collapsed) / `pp-18a` (expanded) / `pp-18b` (expanded + scrolled) / `pp-18c` (short name, no affordance) | page-app |
| FO phone chrome — only the step bar is sticky + MSupport steps aside (2026-10-20) | ≤860 on wizard screens with the step bar (`body.is-fo-request-mode:has(.e-permits-fo-request:not([hidden]) > .e-permits-fo-mobile-progress)`): `.e-permits-fo-auth__header` `position: relative` (EVO bar, service name + long-name expand, „Salvat ca schiță” scroll away); `.e-permits-fo-mobile-progress` sticky at `top: env(safe-area-inset-top)` (44 = row 40 + bar 4, its bar = the bottom line); `html` `scroll-padding-top` = safe area + `--fo-step-bar-height` + 8. MSupport `.msup` hidden at any width while a picker trigger is open (`[aria-haspopup]` / `[role=combobox]` / `.js-date-picker-toggle` + `aria-expanded="true"`), on phones (≤760) also while a text field has focus; the greeting bubble is dismissed for good on the first form interaction on phones | `css/e-permits-acte-permisive.css` (≤860 progress block, MSupport block after the hover round 3), `js/e-permits-acte-permisive.js` (`updateFoStepBarHeight`, `dismissSupportGreeting`); section „FO phone chrome”; demo `fo-03v` (scrolled) / `fo-03w` (select open, widget hidden) / `fo-03u`, `adr-02a`, `pp-18a` | page-app |
| ~~Filters dialog (FO)~~ (removed 2026-10-20) | the Cabinet „Perioadă” dialog (`cab-filter__group / __legend / __options / __range`) went: its two date ranges are date range facets of „Filtre” (row „Facet filter · date range facet”). `.cab-filter-modal` + `.cab-filter__body` stay — they are the Cabinet document modal (`CabEvo.openDocModal`) | — | — |
| Product mode (another back office on the shell) | `window.GEAPShellProduct` set by a product script before `js/e-permits-shell.js`; body stays `data-demo-flow="back-office"`; a product module plugs in with `product.extend({ views, registries, facets, load, init, showView, route, beforeNavigate })` and reads helpers from `product.shared` | `js/ekyc.js` + `js/ekyc-config.js`, see „eKYC back office” | app |
| Product registry „+ Adaugă …” + muted rows | toolbar `button.btn.btn-primary.btn-sm.e-permits-workplace__primary-action[data-workplace-add-product]` (label from `view.primaryAction = { id, label }`); `registries[kind].rowClass(row)` → `tr.is-inactive` (text tertiary, tags keep colour) | `js/ekyc-config.js` | app |
| Editable value list in a form (URIs, IP-uri, scope chips, secret row) | `.e-permits-ekcfg-list` > `.e-permits-ekcfg-list__item` > `.e-permits-ekcfg-list__row` (`.e-permits-fo-input` grows + `btn btn-text-destructive btn-sm` „Elimină”) + inline error; „Adaugă …” = `btn btn-neutral btn-sm` + plus in `.e-permits-tax-cond__add`; chips = full-flow `.e-permits-fo-subgen-chip` | `rowsField` / `chipsField` in `js/ekyc-config.js` | app |
| Field label with an info tooltip | `.e-permits-fo-field__label-row.e-permits-ekcfg-label-row` > `label` + `button.e-permits-ekcfg-tip` (20px, `icon-circle-info` 16, tertiary → secondary on hover, focus ring, `data-tooltip-label`) | `field(…, { tip })` | app |
| Decision band 0–1 (scoring thresholds) | `.e-permits-chart.e-permits-ekyc-band` > stacked meter `--lg` (danger · warning · success) + `svg.e-permits-ekyc-band__axis` (`line.__tick`, `text.__label` / `.is-threshold`) + legend tray | `band()` in `js/ekyc-config.js` | app |
| Meter (thin bar, one or stacked segments) | `span.e-permits-meter[role=meter\|img] (+ --lg 12px) > svg.e-permits-meter__svg > rect.__track + rect.__fill--{brand\|success\|danger\|warning\|neutral}` + `line.e-permits-meter__gap` (2px cuts between stacked segments); value right = `.e-permits-ekyc-progress` + `__count`; legend `ul.e-permits-meter-legend` (+ `--tray` = the grey legend strip inside a white chart card) + `__dot--{tone}` | `meter(segments, { max, label, size })`, `legend()` in `js/ekyc.js` | app |
| KPI cards | `ul.e-permits-kpi-grid > li.e-permits-kpi` > `__label` · `__value` (+ `--warning\|--danger`) · `__meta` | `kpi()` in `js/ekyc.js` | app |
| Chart card + column chart | `.e-permits-chart` (white, 1px border, radius 16) > `svg.e-permits-chart__plot` (`rect.e-permits-chart__bar--{tone}` stacked by outcome, rounded tops rx 4) · `__axis` · `.e-permits-meter-legend--tray` | `renderTrend()` / `chartBars()` / `renderDecisions()` in `js/ekyc.js` | app |
| Alert stack (notification cards) | `ul.e-permits-ekyc-alerts__list > li.e-permits-ekyc-alert.e-permits-ekyc-alert--{error\|warning\|info}[.is-actionable]` (white card, 1px base border, radius 16 (same as the grey dashboard cards — user rule), padding 12/16; `__tile` 32px tinted severity tile (+ `.is-pulsing` once on Critică) · `__body` > `__head` (`a.__title` link or `p.__title` + `__time`) · `__text` (2-line clamp) · `__action` „Deschide furnizorul →” · `btn btn-strict btn-sm btn-icon-only __close` shown on hover / focus-within) + `.e-permits-ekyc-alerts__peek > __layer` (neutral) + „Arată toate (N)” → modal; every alert leads to its screen (`ALERT_TARGETS`, role-gated by the nav) | `renderAlerts()` / `alertCard()` / `goToAlert()` / `openAlertsModal()` | app |
| Evidence tiles + viewer | `ul.e-permits-ekyc-evidence > li.__item` > `button.__thumb(--doc)` (img, `__play` badge) · `__title` · `__meta`; viewer `.e-permits-ekyc-viewer` (`__stage` + `img[data-zoom][data-rot]` + `__mark` watermark · `__tools` toolbar · `__note`); locked = `.e-permits-ekyc-locked` (lock note · `__list` · `__actions`) | `renderEvidence()` / `viewerBody()` in `js/ekyc.js` | app |
| Source match row | info card row value `.e-permits-ekyc-match` (value + „în document: …” meta + success/danger icon tag Concordă / Diferă); title with source tag `.e-permits-ekyc-source-title` | `renderExternal()` / `matchTag()` | app |
| Export format menu (labelled) | `.e-permits-stack__menu-wrap` > `btn btn-neutral btn-sm` (export icon · label · chevron, `data-stack-menu-trigger`) + `ul.e-permits-fo-intent-menu.e-permits-stack__menu` | `exportMenu()` in `js/ekyc.js` | app |
| Loading state | `GEAPEmptyState.render({ loading: true })` → brand spinner in the empty-state icon circle | `js/empty-state.js` | product |
| Bottom Sheet | `.bottom-sheet` + `__overlay/__panel/__handle/__header/__content` | `bottom-sheet.html` | library |
| Filter trigger = library chip with button radius (2026-10-21, filter-chip-v1) | `button.chip.e-permits-filter-trigger` (+ `--sm` = 36 / r6 in the GEAP BO registries) > `.chip__icon` (filter icon, rest AND active) + `.chip__label` + `.chip__badge` (the chip's numbered badge, 16); `.is-selected` = black when ≥ 1 value is applied; `aria-expanded` + `aria-controls`, name „Filtre, 3 aplicate”. Every „Filtre” / „Filtru” / „Filtrare avansată” trigger: Cabinet acts + requests, RAP, eKYC, BO registries, passport lists, and the phone „Filtre” pill | `css/facet-filter.css` („Filter trigger”), `js/facet-filter.js` (`markTrigger`); demo sm-01 (rest) · sm-01v / 01x / 01y (1 / 3 / 7 applied, bar closed) · ek-04o (12) · sm-01a / dos-05d / rap-01d (active + open); section „Advanced filter › Filter trigger” | app |
| Facet filter · phone toolbar + sheets (2026-10-17; one pill row 2026-10-20) | `GEAPFacetFilter.create({ mobileSheets: true, preview, sort })` ≤760: bar `.e-permits-workplace__filters.is-sheets` = ONE row `.e-permits-workplace__filter-tools[data-filter-phone-row]` that never scrolls: the round „Filtre” pill `[data-filter-all]` (library chip, 48 · 16/24 medium · icon 24, black + count badge when applied; the toolbar button hidden) + the page's sort control moved into `.e-permits-workplace__filter-sort` (`btn btn-neutral btn-md btn-pill` at 48, label ellipsis) — NO facet chips; applied → „N de rezultate · Șterge filtrele” `[data-filter-phone-meta]` under it; desktop list toolbars (Cabinet, RAP, eKYC): search 40 · „Filtre” `btn-md` 40 · sort `btn-md` 40 (one height); sheet `.bottom-sheet.e-permits-filter-sheet` (`is-all` = all filters, accordion `.e-permits-filter-sheet__section/__section-trigger/__section-label/__section-summary/__section-panel`), `__search`, `__list`, `__footer` + `__apply` | `js/facet-filter.js`, `css/facet-filter.css`; demo `rap-04…04d`, eKYC `ek-04c / 04c1 / 04j / 04l / 04m` at 375 (2026-10-19), Cabinet `sm-01 / 01f (sort sheet) / 01m / 01n / 01o / 01p`, `pp-01h / 01s`; section „Advanced filter › Phone mode” | app |
| Facet filter · date range facet (2026-10-20) | a facet `{ key, label, type: "date", get(row) → ISO day, presets?, today? }` of `GEAPFacetFilter`: chip with a period = library chip „with close” as a group `div.chip.is-selected.e-permits-workplace__filter-chip.e-permits-workplace__filter-chip--date[role=group]` > `button.chip__label[data-filter-facet]` (`__filter-chip-text` „Data depunerii: 1–10 oct. 2026” + caret) + `button.chip__close[data-filter-date-clear]` (clears at once); no period = the normal facet chip. Popover `.e-permits-workplace__filter-pop--date` (320, not clipped): `.e-permits-workplace__filter-list.e-permits-workplace__filter-dates[role=radiogroup]` of `label.e-permits-workplace__filter-option` + library `.radio.radio--medium` (`[data-filter-date-preset]`) · `.e-permits-workplace__filter-range[data-filter-range]` (De la / Până la = library date picker in the FO field `.e-permits-fo-field.e-permits-workplace__filter-date-field`, inputs `[data-filter-date-input][data-filter-date-part]`) + `.e-permits-workplace__filter-range-errors` · the popover footer Confirmă / Șterge. Phones: the same body in the facet sheet (44 rows, 48 fields; the sheet drops its resting transform so the library phone calendar covers the screen) | `js/facet-filter.js` (`DATE_PRESETS`, `GEAPFacetFilter.dateMatch / dateText`), `css/facet-filter.css` „Date range facet”; Cabinet `FACETS` depunere / finalizare, eKYC `PERIOD_FACET`; demo sm-01g / 01h / 01o / 01p / 01q, ek-06b / 06g; section „Advanced filter › Date range facet” | app |
| Row action menu on phones — anchored popover, touch item size (2026-10-20, action-menu-v1; replaced the act action sheet) | Every menu of an action wrapper `.e-permits-fo-intent-act__action` — act rows „Postprocese ⌄” (FO #intent, Ghișeu, Cabinet), the Cabinet act profile header, the Cabinet request rows' ⋮ (row-kebab-v1) — is the SAME anchored dropdown at every width (no bottom sheet; user ref Telegram iOS). Phones ≤760: right-aligned to its button, upwards when no room below, 16 from the screen edges (`js/act-row.js` fitMenu → `.is-fit-end` / `.is-fit-start` / `.is-open-up` + `--act-menu-max`; Cabinet request menus `CabEvo.fitMenu`); surface padding 8 · radius 16 · dropdown-effect; items 48 · 12 16 · gap 12 · icon 24 · 16/24 regular · r8; unavailable item = grey + `__reason` 14/20 tertiary second line (desktop: tooltip); danger (Retragere, Anulare, Elimină) red, last, after `__separator`; icons from ONE map (`GEAPActRow.ppIcon`, one optical footprint, § „Row action menu — icon map”, act-icons-v1). Keyboard (Cabinet): Enter / Space / ↓ open on the first item, ↑ on the last, ↑ ↓ Home End, Esc → trigger, Tab closes | `js/act-row.js` (`menuItemsHtml`, `isDanger`, fitMenu), `css/e-permits-acte-permisive.css` „Row action menu on phones”, `cabinet-evo/cabinet-evo.js` (fitMenu flip-up, menu keys); demo pp-01a, pp-01q, pp-02a, gh-02j (reasons), sm-01u, sm-01w (opens up), sm-02 (danger) at 375 / 320; section „Row action menu on phones” | app |
| Sort control — desktop menu + phone sort sheet (2026-10-20) | `js/sort-sheet.js` (`GEAPSortSheet.menuHtml({ id, keys, orders, current, keyAttr, orderAttr })` / `.bind(trigger, { title, sprite, keys, orders(key), current(), apply })`) + `css/sort-sheet.css`. Desktop: the page's `ul.e-permits-fo-intent-menu.e-permits-stack__menu.e-permits-sort-menu` — `li.e-permits-sort-menu__label` (12/16 medium secondary) · `ul.e-permits-sort-menu__group` of `button.e-permits-fo-intent-menu__item.e-permits-sort-menu__item[role=menuitemradio][aria-checked]` (library `span.radio.radio--medium > span.radio-custom` leading, checked look from `aria-checked`) · `li.e-permits-sort-menu__separator`. Phones (≤760): `GEAPSheet` `.e-permits-filter-sheet.e-permits-sort-sheet` — `h3.e-permits-sort-sheet__label` (14/20 medium secondary) + library `.radio-group.e-permits-sort-sheet__keys[role=radiogroup]` of `label.radio.radio--medium.e-permits-sort-sheet__key` (48 rows, 16/24, checked medium) · label + a second library `.radio-group.e-permits-sort-sheet__keys.e-permits-sort-sheet__order[role=radiogroup]` of the same rows (order, labels follow the key; v2 — the segmented control of v1 was removed, user 2026-10-20) · footer `btn btn-primary btn-lg e-permits-filter-sheet__apply` „Aplică” | section „Sort sheet on phones”; Cabinet „Solicitările mele” (sm-01f, sm-01t, sm-01m) | app |
| Cookie Banner | `.cookie-banner` (**shell only**) | `cookie-banner.html` | library (partial) |
| Date Picker | `.date-picker`, `.date-picker-panel`, `__weekday/__day` | `input-date-picker.html` | library |
| Address by cadastral code (FO „Caută adresa sau cod cadastral” + editable „Cod cadastral” + SRRE fill, read-only parts) | cascade address: product search input (`.search-input` + `.e-permits-fo-cascade-address__search`, × clear) + „Cod cadastral” = library search input with submit (`.search-input.e-permits-fo-cadastral-search` + `.btn-group`: spinner / `.btn-icon.clear` / `.btn.btn-primary.btn-search`; `.loading` while SRRE answers) + the search list's action row „Caută codul cadastral «…»” + one message slot per field `[data-fo-cadastral-search-hint]` / `[data-fo-cadastral-code-hint]` (hint → `message--inline e-permits-fo-field__error` + `__success` / `__warning` / `__loading`) + SRRE skeleton (`.is-srre-loading` + `.e-permits-fo-skeleton--input`) + fill highlight `.is-srre-new` | `cascadeAddressHtml` / `initCadastralLookup` / `foAddressDemo` (e-permits-acte-permisive.js), demo `adr-*` | app |
| Guest requestor „Date solicitant” (no MPass; Figma FOD-Components-flow 633:7411, G1–G8) | `section[data-fo-screen="guest"]` > `form[data-fo-guest-form]`: MPass upsell `.e-permits-fo-guest__upsell` · „Soliciți în numele” `[data-fo-guest-type-section]` (animated segmented control) · `[data-fo-guest-company]` (IDNO → registry name) · `[data-fo-guest-person]` · „Pentru cine” radio option rows · `[data-fo-guest-represented]` (G4) / `[data-fo-guest-mandate]` (G5) with a boxed doc field · consent · „Înainte” never disabled; leave modal `[data-fo-guest-leave-modal]` | `showFrontOfficeGuest` / `setGuestType` / `validateGuest` / `enterGuestWizard` (`frontOfficeGuest`) / `guestSchemaVariant`, demo `fo-g*` | app |
| Radio option row (hover + focus on the whole row) | `label.e-permits-fo-radio.e-permits-fo-radio--option` (row fills its grid column, padding 12/16; `::before` grey layer radius 12, opacity 0 → 1 + scale .97 → 1, 180ms decelerate; keyboard ring on the row) | „Pentru cine” (guest), `contactPersonHtml` (Persoana de contact) | app |
| Authorization / representation basis card | `.e-permits-fo-authorization-card` (grey r12 card, 32 round icon, title + green outline status, meta parts with dots, copy code) via `authorizationCardHtml(subject)` / `GEAPFormRender.authorizationCardHtml({ title, status, grantedBy, validUntil, code })` or `{ title, status, icon, details: [{ label, value, copy }] }` | FO „Date solicitant”: under Solicitant + Reprezentant, its own role group `.e-permits-fo-form__role-group.e-permits-fo-form__basis` titled „Temeiul reprezentării” (the same `roleGroupTitleHtml` as „Solicitant”, `representationBasisHtml(subject)`, 2026-10-18) — RSUD administrator from the subject's `representationBasis` (fo-02, self-PJ; NOT `authorization`, which means an MPower proxy in the switcher) or the MPower grant (cat-04 / cat-04a); Ghișeu „Temeiul reprezentării” MPower + RSUD | app |
| Boxed doc field (required attachment inside a form section) | `.e-permits-fo-doc-field.e-permits-fo-doc-field--boxed` (1px dashed border/base/default, radius 16, padding 20/16; empty = click target with the dropzone hover; `is-error` = 1.5px dashed danger + inline error in the description) + `btn btn-strict btn-md` with 20px `icon-upload` | guest procură / decizie de numire | app |
| Animated segmented control (sliding selected thumb) | `.segmented-control.is-animated` (+ `role="radiogroup"` > `button.segment-item[role=radio][aria-checked]`, roving tabindex) — `::before` thumb from `--seg-x/-y/-w/-h`, `is-ready` / `is-snap` | `initAnimatedSegmentedControls()` | app |
| FO phone error state | `.e-permits-fo-phone--editable.is-error` (mirrors `.e-permits-fo-input.is-error`) | guest validation | app |
| Form Builder (Form Designer: palette · canvas · properties; one schema → one renderer) | `.e-permits-builder` workspace: `__library` (grouped palette `__library-section` / `__library-item`, „În curând” = `is-disabled` + reason) · `__stage` (`__service-header`, `__steps` chips, `__canvas` > `__step-section` > `__section-bar` + `__grid` > `__field` cards, `__drop-indicator`) · `__inspector` > `__panel` (`__panel-head--selected`, `.tabs.tabs--sm.e-permits-builder__tabs`, `__panel-scroll` of drawer sections) · topbar `__errors` + `__issues-menu` | `js/form-builder.js` (`COMPONENTS`, `toFo`, `window.GEAPFormBuilder`), `css/form-builder.css`, demo `fb-*` | app |
| Process Designer (Fluxuri de lucru: full-bleed canvas + floating cards; one flow JSON) | `.e-permits-builder.e-permits-builder--process` (FB topbar + `.modal--footer.e-permits-pd__footer`) > `main.e-permits-pd__stage` (dot grid) > `.e-permits-pd__world` (ONE transform) > `__lanes` (`__pool` / `__pool-head` / `__lane` + `button.__lane-rail` / `__lane-add` = FB dropzone) · `svg.__edges` (`g.__edge` > `__edge-hit` / `__edge-line` / `__edge-arrow`) · `__labels` (`button.__edge-label`) · `__nodes` (`button.__node.__node--{start\|end\|activity\|decision\|event\|subprocess}` > `__shape` · `__name` / `__caption` · `__port` · `__plus` · `__dot`) · `svg.__overlay`; floating `aside.__float--left` (palette = FB `__library-item` + `__glyph--*`, `.is-rail`) / `aside.__float--right` (FB panel) · `__toolbar` · `__minimap` · `__add-menu` („Continuă cu”) · `__json`; batches 2–4: `__lane-resize` · `__pool-select` · `__edge-end` (re-connect handles) · `__open-sub` · `__current-tag` · `__trace` (case path card) · `__list` (list view) · `#pd-tpl-modal` (template picker) · `#pd-publish-modal` · `#pd-lane-modal` · `[data-pd-drawer]` («Proces nou») · registry kind `flows` | `js/process-designer.js` (`window.GEAPProcessDesigner`, `window.GEAPShellRegistries.flows`), `core/process-model.js` (`GEAP.processModel`), `css/process-designer.css`, demo `pd-*`; section „Process Designer” | app |
| Floating card (panel over a canvas) | `.e-permits-pd__float` (white, 1 px border base-default, radius 16, `--shadow-200`, inset 16, `max-height: 100% − 32`, 160ms slide-in `backwards`) + `__card-head` / `__card-title`; hidden with `[hidden]`; toolbar and minimap use the same card (radius 16) | Process Designer palette / properties | app |
| One FO renderer for builder + Preview + request form | `window.GEAPFormRender.fieldHtml` = `stepFieldHtml` (+ `textarea`, `number`/`money`, `date`, `select`, `radio`, `checkbox`, `checklist`, `info`, batch 3: `idnp`, `idno`, `file`, `mdocs`, `hidden`, `consent`, `contact-person` with `prefix`, `subdivision` with `mode`; batch 4: `grid`, `repeat` → `window.GEAPFoRepeat` in `js/fo-grid.js`, `combobox` = the CAEM list alone); `.bind(root)` = the FO interactions (+ contact, subdivision, digits, registry lookups); `.applicant()`, `.setFieldError()`, `.copyValueHtml()` | `js/e-permits-acte-permisive.js` | app |
| Choice field (labelled radio rows / checkbox list / period pair in a form) | `fieldset.e-permits-fo-choice.e-permits-fo-field--span-N` > `legend.e-permits-fo-choice__legend` + `.e-permits-fo-choice__group(--inline)` of `.e-permits-fo-radio--option` rows, or `.e-permits-fo-choice__checks` of `renderCheckOption({ plain: true })`, or `.e-permits-fo-choice__pair` (two date pickers, 6 + 6, one column ≤860) | `radioFieldHtml` / `checklistFieldHtml` / `periodFieldHtml` | app |
| FO segmented field · multi-select field · callout field · separator field | `segmentFieldHtml` (`.segmented-control.is-animated[role=radiogroup][data-fo-segment]` + label id) · `multiselectFieldHtml` (the CAEM subgenre multi-select with `data-placeholder` / `data-count-one` / `data-count-many` / `data-remove-label`, chips in `[data-fo-subgen]`) · `calloutFieldHtml` (`.e-permits-callout--info/--warning`) · `separatorFieldHtml` (library `hr.separator`) | `js/e-permits-acte-permisive.js` | app |
| Behaviour rules in the Form Builder (Logică) | the Documente rule builder markup (`.e-permits-doc-rule` / `.e-permits-doc-cond` / `.e-permits-doc-val` / `code.e-permits-doc-kw` / `.e-permits-doc-kwselect`) with builder hooks `data-fb-rule-*` / `data-fb-cond-*`; in the panel rows use the phone layout | `logicTabHtml` / `ruleHtml` / `applyLogic` (js/form-builder.js) | app |
| FO field group (one component = several fields: IDNO + denumire, consent + IDNP + Nume + Prenume, Persoana de contact) | `.e-permits-fo-field-group` (whole row; the section's 12-col grid + gaps inside; 1 column ≤860) · `--stack` (flex column, gap 20 — contact) | `idnoFieldHtml`, `idnpFieldHtml` (rsp), `contactPersonHtml({ prefix })` | app |
| Registry lookup by a 13-digit code (IDNO → RSUD, IDNP → RSP) | ONE helper `createRegistryLookup({ input, hint, targets, find, … })` (+ `setRegistryValue`): hint → `__loading` message, targets → input skeleton (`is-srre-loading`), fill read-only with green check + `is-srre-new`, not found → FO field error. Markup hooks `[data-fo-registry-lookup][data-fo-registry=rsud|rsp]`, `[data-fo-registry-code]`, `[data-fo-registry-target=name|last|first]`, `[data-fo-digits]` + `[data-fo-digits-counter]` (n/13), `[data-fo-lookup-consent]` | guest IDNO (G1b/G3/G5) + Form Builder IDNO / IDNP; `?registru=asteptare` | app |
| Boxed doc field with several files | `.e-permits-fo-doc-field--boxed.e-permits-fo-doc-field--multi` (button stays until `is-full`) + `data-fo-upload-only` (picker without MDocs), `data-fo-doc-accept`, `data-fo-doc-max`, `data-fo-doc-limits` (modal captions) | Form Builder „Fișier” | app |
| Form Builder · hidden field marker | `p.e-permits-builder__hidden-marker` (dashed 1px border/base/default, r8, 40 high, `icon-data-access` + „Ascuns” + name · value, ellipsis + title) — Build canvas only; the FO renders `<input type="hidden" data-fo-hidden>` | „Câmp ascuns” card | app |
| Editable grid (FO, US-33…39) — **library gap: no editable table in the library** | `.e-permits-fo-grid[data-fo-grid][data-units]` > `__label` · hint · group note (`renderInfoNote`) · `__frame` > library `table.table.table--subtle.e-permits-fo-grid__table` (explicit ARIA roles; `th`/`td` `colspan` = width units 2·3·4) > `tr.e-permits-fo-grid__row(.is-editing)` (`__index` · `__cell[data-col][data-type]` = `__cell-label` + `button.__value` or the FO field · `__actions` = `__actions-compact` icon buttons + `__actions-full` labelled) · `tr.__detail` (nested grid) · `tr.__empty` (`GEAPEmptyState`) · `__foot` (`.e-permits-fo-add-activity` + `__limit` + library `.pagination--compact`) · `.is-cards` (cards) | `GEAPFoRepeat.gridHtml` / `bind` / `validate` / `fill` / `layout` / `escape`; confirm `[data-fo-grid-confirm]` | app |
| Repeatable block (FO, „Adaugă alt …”; CAEM = its preset) | `fieldset.e-permits-fo-repeat[data-fo-repeat]` > legend (`.e-permits-fo-choice__legend`, may be visually hidden) · note · group note · `__list` > `.e-permits-fo-activity-card.e-permits-fo-repeat__item[data-fo-repeat-item]` (header `#n` + title + `.e-permits-fo-icon-button[data-fo-repeat-remove]`; fields in `.e-permits-fo-field-group`, the CAEM pair as the FO activity markup) · `.e-permits-fo-add-activity[data-fo-repeat-add]` · `__limit` | `GEAPFoRepeat.blockHtml`, FO `caemFieldHtml` / `subgenHtml` | app |
| Form Builder · band of columns / block fields | `.e-permits-builder__subs[data-fb-subs]` > `__subs-label` · `button.__sub[data-fb-child](.is-selected/.has-issue/.is-dragging)` · `.e-permits-builder__sub-add-wrap` (`__sub-add` dashed + typed stack menu with `__issues-head` groups, disabled items with reason) | `subsStripHtml` / `addChildMenuHtml` / `childPanelHtml` (js/form-builder.js) | app |
| Form Builder · „Lățime” (a row of real columns) | `.e-permits-builder__width(.is-disabled)` > `.e-permits-builder__width-picker[role=radiogroup][data-total=12\|4]` > `button.__width-option[role=radio][aria-checked][data-cols][data-fb-seg][data-value]` > `span.__width-bar(.is-filled)` + `p.__width-caption` (`<strong>6/12</strong> · jumătate`) + hint; label `span.__width-label` | `widthPicker` / `spanPicker` / `columnPicker` (js/form-builder.js), section „Form Builder › Lățime” | app |
| Form Builder · saved components | palette group `[data-fb-library-saved]` „Componente salvate” (system preset + saved, version `renderTag("vN")`), card foot tag „Salvată” (`icon-bookmark`), panel group „Componentă salvată” (facts + Actualizează din sursă / Salvează în sursă / Detașează), modal `#fb-preset-modal` (library `modal--md e-permits-passport__modal`) | `insertPreset` / `presetAction` / `openPresetModal` | app |
| Value group with a trailing unit | `.e-permits-doc-val` > `__control` (number) + `.e-permits-doc-val__mode.e-permits-doc-val__mode--end` (unit select, divider on its left, 80 wide) | Reguli de dată (± N zile / luni / ani) | app |
| Back-office helpers for other scripts | `window.GEAPUi` = renderCheckOption, renderToggle, renderNotice, renderInfoNote, renderFoSelectControl, renderTag, renderStackMenu, requiredMark, askConfirm, showShellToast, escapeHtml | `js/e-permits-shell.js` | app |
| Undo toast | `GEAPToast.show({ …, action: { label: "Anulează", onClick } })` → `button.toast__link.toast__action` in the link slot | `js/toast.js` | library + app |
| Ghișeu — depunere la ghișeu (Dosare noi + picker + request sheet) | small modal `#gh-start-modal.modal-overlay > .modal.modal--lg.e-permits-passport__modal.e-permits-gh` = one screen (service + applicant with the search-input lookups), hugs its content up to 24 from the viewport edges, bottom sheet ≤680 (phones ≤760 since 2026-10-19: the shared rule „Modals on phones — maximum content space”, 16 from the top, radius 16); the request window opens on the FO intent screen „Ce se solicită?” (`GEAPFormRender.intentHtml`, step `intent`, no stepper) — a choice starts the request; request = **full-screen sheet** `#gh-request-modal.modal-overlay.e-permits-gh-sheet-overlay > .modal.modal--fullscreen.e-permits-gh-sheet` (24 from the top, radius 16 top corners, header · scrolling body · sticky footer; z 990 under library dialogs) with the FO request layout `.e-permits-fo-request__inner.e-permits-gh__inner` (FO stepper `[data-gh-step]` + `.e-permits-fo-form` panel `[data-gh-panel]`); registry kind `ghiseu` via `window.GEAPShellRegistries`; routes via `window.GEAPShellRoutes`; helpers via `window.GEAPShellApi` | `js/ghiseu.js`, `css/ghiseu.css`, `data/ghiseu.json`, demo `gh-*`; section „Ghișeu — depunere la ghișeu” | app |
| Act row + „Solicitare nouă” card (FO #intent + Ghișeu picker + EVO Cabinet „Actele mele permisive” list, one renderer — `js/act-row.js` `GEAPActRow.html` since 2026-10-17; Cabinet options: `assets`, `attrs` (row hook), `tagHtml` / `extraTagsHtml` (Cabinet tones + „Aprobare tacită”), `triggerAttrs` / `itemAttrs`, `noticeTone` / `noticeIcon` / `noticeLocks` (paper act = info notice, `.has-notice`), `hideEmptyAction`) | `li.e-permits-fo-lib-item.e-permits-fo-intent-act` (the document card: blue `document-generated.svg`, title + Small status tag [+ brand tag of the chosen post-process], `.e-permits-fo-doc-meta` = the shared slots number · what · authority · subdivision · date (2026-10-20; 14/20 `--color-text-base-tertiary`, one line on desktop; card padding 16 · r16 · 1.5 stroke, title → meta 8 — § „List rows — act + request”), `.cab-doc__actions` with the `__trigger` „Postprocese ⌄” = `btn btn-neutral btn-sm` (library SMALL, 32 · 0 12 · 14/20 · gap 6, radius 6 — square since 2026-10-20; `aria-label` „Postprocese pentru <act>”; medium rejected 2026-10-18) + `ul.e-permits-fo-intent-menu.e-permits-stack__menu` at the one dropdown item size (32 · 6 12 6 8 · 14/20 medium · 20 icon, phones: § „Row action menu on phones”), FO = Ghișeu = Cabinet); states `is-locked` (+ `__pending` = full-width subtle warning notice, trigger disabled), menu items `aria-disabled` + `data-tooltip-reason`, menu `is-open-up`; pill on a hovered / selected row = white (default surface) until hovered / pressed / open — open = pressed `secondary-active` + focus ring (grey-on-grey rule, 2026-10-16); card `button.e-permits-fo-intent-new` (arrow; a click goes on); the whole screen body = `intentHtml(opts)` (header + subject „Schimbă”, notice slot, card, „sau”, acts or the shared empty state) | `GEAPActRow.html(act, opts)` (`js/act-row.js`, = `GEAPFormRender.actRowHtml`) / `intentNewHtml(opts)` / `intentHtml(opts)` in `js/e-permits-acte-permisive.js`; demo `pp-02*`, `gh-02i…x`, Cabinet `pp-01…01w` | app |
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
- **Icon and label are one colour — the button's.** Code: the icon `<svg>` uses `fill: currentColor` and never gets its own `color`/`fill` (no `.btn svg { color: … }`). Figma: use the button **component** and change its variant (Style / State) — never override the fill of the icon or of the label on an instance (a blue icon on a Disabled grey label, a grey icon on a Primary label). Changing the icon = swap the icon (instance swap); its colour comes from the button. Audit 2026-10-12: 547 instances had an icon colour ≠ label colour (Form Builder 348, Editable Grid 128, Address Patterns 21, Incidente 16, Pașaport 17, Process Designer 13, Tarife 4) — reset to the component colour.
- **`.icon-leading` / `.icon-trailing` do not exist in CSS.** Put the `<svg class="icon">` directly in the button. Figma *does* define `Icon = None / Leading / Trailing / Only` as design variants — the concept exists, the CSS expresses it structurally rather than with those classes.

#### Button icons — size per button size (button-icons-v1, 2026-10-21; Figma Components 39:177)

User: „the icons seem too small and off”. Measured: Medium / Large buttons drew 16 icons (`icon small` in the
markup) where Figma has 20; a bare `icon` with `width="16"` rendered 24 inside Small buttons (`Adaugă secțiune`,
`Șterge`, form-builder); the md gap was 4 (Figma 6); md/lg icon-only were not square. Vertical centring was
already exact (flex). ONE block fixes it for every page: `css/button-icons.css`, loaded right after main.css on
every page (BO, shell, Cabinet, RAP, clasificatoare, login, index, mpass-test, sandbox, table-cells).

| Figma size | Code | Height | Sides (icon side) | Gap | Icon box | Label | Icon only |
|---|---|---|---|---|---|---|---|
| Small | `.btn-sm` | 32 | 12 (8) | 6 | **16** | 14/20 500 | 32 square, icon at 8 |
| Medium | `.btn-md`, the 40 modal-footer pill | 40 | 16 (12) | 6 | **20** | Figma 14/20 · code 16/22 (open) | 40 square, icon at 10 |
| Large | `.btn` with no size class (48), `.btn-lg` | 48 | 20 (16) | 6 | **20** | 16/24 500 | 48 square, icon at 14 |

- The icon size comes from the BUTTON size (`--btn-icon-size` on `.btn`; rule `.btn > svg.icon`, (0,2,1) — it beats
  `icon small` / `medium` and width / height attributes). Markup may keep `class="icon small"`; it no longer matters.
- Centring: the icon is a block flex item (`display: block; flex: 0 0 size`) — no inline baseline offset, never shrinks;
  icon centre = button centre (measured dy 0 on 368 states).
- Icon side padding = side − 4 at every size (library did it for Small leading only; now also Small trailing and
  Medium / Large both sides), via `:where(:has(…))` so product placements that set their own padding still win.
- Icon-only = `.btn-icon-only` square of the button height at every size (it existed for Small only).
- Deliberate exceptions stay in product CSS with a more specific selector: phone 48 pills / sort (icon 24,
  `facet-filter.css`), phone sheet × (icon 24, `modal-phone.css`). Library search submit (`.btn-search`) is excluded.
- Never size a button icon per component again (removed: `.e-permits-workplace__advanced .icon` 16 / 20,
  `.btn.btn-sm.btn-icon-only .icon`, `.rap-act-modal__print .icon`, gap 8 on `.e-permits-case-actions__trigger`,
  `.e-permits-fo-payment-actions__download`, `.e-permits-fo-finish__cta`, `.rap-act-modal__print`).
- Known, not fixed (reported): (1) labels sit 1px further in than Figma — the library variants keep a 1px transparent
  border inside the box; (2) Medium label 16/22 in code vs Figma 14/20 (a global type change, PO decision); (3) Small
  glyphs: Figma has a separate 16-grid icon set (plus 13.5 ink, 1.5 stroke) — our sprite scales the 24-grid glyph to 16
  (plus 11.6 ink, thinner); fixing it means adding the 16 set to the sprite, not CSS.

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
| 3 | `Icon=Only` square **48/40/32** | fixed 2026-10-21: `.btn-icon-only` square per size (css/button-icons.css) | ok |
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
`Button = True` axis, a brand square with `arrow-right`): filtering is live, so there is
nothing to submit. **Scoped exception (2026-10-13): `Button = True` (submit) is allowed only for
searches that send a request to an external registry (e.g. the US-54 cadastral lookup → SRRE);
live filtering never has a submit.** Such a search runs only on the submit or Enter (never on a
typing pause / blur), shows no typing spinner (`js/search.js` skips `is-typing` when the field has
a `.btn-search`), keeps the submit disabled while empty or while the request runs, and shows the
inline spinner only during the request (`.loading`). Markup = the library preview: `.btn-group` >
spinner + `.btn-icon.clear` + `button.btn.btn-primary.btn-search[aria-label]` with
`svg.icon.medium > use #icon-arrow-left` (the library CSS rotates it 180° → arrow-right, as in Figma).
Product markup for live filters (registries, sections, drawers, modals, profile tabs):

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
  subgen, MDocs, „Inserează câmp”). The citizen form's cascade „Caută adresa” **is** this component
  since 2026-10-13 (Medium desktop / Large ≤720, see „Address by cadastral code — US-54”).
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

**Act status + tacit approval — ONE tag (tacit-tag-v1, user 2026-10-21, every product).** An act approved tacitly
that is VALABIL shows only the blue Small tag „Aprobare tacită” in its status slot, never „Valabil” + „Aprobare
tacită” (tacit implies valid). Its text for screen readers = `Aprobare tacită<span class="u-visually-hidden">
(valabil)</span>` (code-audit lists the hidden span as `clipped-text-no-tooltip` — standing false positive). A tacit
act in any other status (Suspendat, Expirat, Retras, Anulat) shows its STATUS tag only; the tacit approval is history
there → the „Data aprobării tacite” row (date only, no badge) in the details / Date generale / A4 and the Istoric step.
Markup per product: BO / Cabinet / RAP = `.e-permits-workplace__tag--info` (CabEvo `tacitTagHtml` / `actStatusTagHtml`,
RAP `statusTags`, `GEAPActView` `statusTag` when `tacitBadge`); FO / Ghișeu act row = `status-tag--brand is-subtle
status-tag--small e-permits-fo-doc-tag` (`GEAPActRow.html` when `act.tacit` + Valabil — the library `--info` subtle has
grey text). Requests are not acts: „În examinare” + „Disponibilă aprobarea tacită” (US-19 AC-15) stay two facts.
Demo: pp-01 / pp-01l, rap-01 / rap-02a / rap-03m, pp-02t, gh-02y (`?tacit=<act id>[,…]` on FO / Ghișeu rows).

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

### Skeleton — ONE loading placeholder (skeleton-v1, 2026-10-21)

The library has no skeleton; the product had three (FO `.e-permits-fo-skeleton(--input / --label / --notice-*)` on a
`--color-background-base-secondary` base, page-reveal `.page-skeleton-shape` and `.page-step-skeleton__line` with their
own shimmer keyframes, the grid's `__skeleton` row, the notice `--skeleton` modifier). Now ONE component
(component audit § 3, user: „Do as you recommend”), `css/skeleton.css`:

| Modifier | Shape | Size | Use |
|---|---|---|---|
| `.skeleton--text` | r4 | `1lh` of the slot (the text it stands for), width `min(132, 48 %)` by default | labels, titles (placement sets 38 / 40 / 24 high), meta lines, table index |
| `.skeleton--input` | r8 | 40, **48 on phones (≤ 760)** = the field rule, full width | every field being filled (SRRE, registry lookup, subject switch, grid cells, step skeleton) |
| `.skeleton--block` | r12 (placement may keep the slot's radius: 8 for buttons / lock) | height from the slot, full width | cards, option rows (72), buttons |
| `.skeleton--circle` | round | 24 (icon size) | notice / avatar icons |

**Look** — base `--color-background-base-tertiary`, shimmer to `--color-background-base-secondary-active` (1.15 s,
`skeleton-shimmer`); `prefers-reduced-motion`: no shimmer, flat tertiary. **States** — only „loading”: the owner swaps
the skeleton for the content (min 400 ms for lookups, `SRRE_SKELETON_MIN_MS`); there is no hover / focus (not
interactive). **A11y** — skeletons are decorative: their container is `aria-hidden="true"`, the region that loads is
`aria-busy="true"` and a live line says what is loading („Se caută adresa…”, „Se încarcă lista…”).
**Placement, not new classes** — sizes live in the owner: `.page-auth-skeleton__title > span` (38), `.page-choice-
skeleton__row` (72, r12), `.page-step-skeleton__line--title / --section / --label / --eyebrow`, `.e-permits-fo-notice.
is-loading` (lines 360 / 168, gap 4), `.e-permits-fo-grid__row.is-loading .skeleton--text` (24). Loading containers use
the state class `is-loading` (`.e-permits-fo-field.is-loading`, `.e-permits-fo-notice.is-loading`, grid row) — never a
`--skeleton` modifier.

**Do** — one skeleton per slot, same size as what arrives (no layout shift); keep the label when only the value loads
(SRRE). **Don't** — no own gradient / shimmer (component-audit rule 10 `skeleton-private`, major), no skeleton for
< 300 ms waits (show nothing), no spinner AND skeleton for the same slot (the search's inline spinner is the request
indicator, the skeletons are its targets).
Changes against the old look (measured, 16 states × 2 widths, scratch sk/sk.mjs): sizes identical; text-line radius
6 → 4; FO skeleton base secondary → tertiary (one step darker); phone input skeletons in the step skeleton and the FO
grid 40 → 48 (they now match the 48 phone fields).

### Drawer — ONE right-hand panel (drawer-v1, 2026-10-21)

The library has no drawer; the product had ONE de-facto drawer (`.e-permits-user-create*`, 13 copies of the markup)
with 13 private open / close scripts, no focus trap and a full-screen phone layout. It is now a documented component
(component audit § 3, user: „Do as you recommend”). Built from `.e-permits-user-create__drawer` — **desktop geometry is
byte-for-byte the old one** (probe of all 12 drawers at 1440: aside / header / title / × / body / footer rects identical).
Older sections of this file still say `.e-permits-user-create`, `__drawer`, `--wide`: read them as `.drawer-overlay`,
`.drawer`, `.drawer--lg`. The FORM vocabulary inside drawers (`.e-permits-user-create__section`, `__section-title`,
`__grid`, `__field--N`, `__lookup-row`…) is unchanged.

**Anatomy**

```html
<div class="drawer-overlay" data-x-drawer hidden>
  <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-x-close></button>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="x-title" tabindex="-1">  <!-- + drawer--lg -->
    <header class="drawer__header">
      <div class="drawer__heading">
        <h2 class="drawer__title" id="x-title">Titlu</h2>
        <p class="drawer__subtitle" data-x-subtitle>Context · stare</p>
      </div>
      <button class="modal-close" type="button" aria-label="Închide" data-x-close><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large"></use></svg></button>
    </header>
    <!-- optional strips: tabs / steps / status -->
    <div class="drawer__body">…</div>
    <footer class="drawer__footer"><div class="modal-buttons">…</div></footer>
  </aside>
</div>
```

| Part | Desktop | Phones ≤ 760 (the shared sheet, css/modal-phone.css tokens) |
|---|---|---|
| overlay / scrim | fixed, z 1200, scrim `rgb(18 18 18 / 36%)` 120 ms fade | 16 top gap (`--modal-phone-gap`, notch-safe) |
| panel `.drawer` | right edge, 100dvh, `min(800, 100vw)`; `--lg` `min(960, 100vw − 64)` (+ `.has-peek` on the overlay: `clamp(640, 100vw − 592, 960)` ≥ 1232); slide-in 160 ms `backwards`, out 120 ms | full width, top radius 16, `overflow: clip` |
| header | 12 / 20, bottom border; title 18/26 semibold; subtitle 14/20 tertiary, 2 above | 16 16 12; title 20/32 |
| × | library `.modal-close` static in the row: 32, icon 16, tertiary → tertiary-hover → tertiary-active, canonical focus ring | 40, icon 24, centred on the 32 title line |
| body | the only scroller, 8 / 20, `overscroll-behavior: contain`, stable gutter | 8 / 16 |
| footer | 12 / 20, top border, `.modal-buttons` right | 12 16 `max(16, safe-area)` |

**Behaviour (js/drawer.js, `window.GEAPDrawer`, delegated — every overlay, static or rendered later):** Tab / Shift+Tab
cycle inside the topmost open drawer (not while a library dialog, confirm, date picker or floating list is above it) —
before, Tab left the drawer 49 times out of 60; Escape: the drawer's own keydown code runs first (unsaved-changes
confirms stay where they were); if nothing handled it and no menu / list inside is open, the header × is clicked (its
close path, never a bypass); focus return: the element focused before opening gets the focus back unless the drawer's
code moved it. `GEAPDrawer.open(overlay, { focus })` / `close(overlay, after)` = the shared show / hide (+ `is-closing`,
body `is-drawer-open`) for new code. Reduced motion: no slide / fade.

**Where:** Utilizatori › Adaugă utilizator, Configurează tipul de solicitare (`--lg`, + its document peek), Șabloane ›
Previzualizează, Plată, Tarif, Document (`--lg`), Șablon nou de notificare (wizard + notification drawer), Clasificator
(valoare / coloană), Dosar › Vezi fluxul, Șablon de tipar › Editează, eKYC config drawers, Process Designer „Proces nou”.
**Not drawers (intentionally different, allowed in the audit):** the Ghișeu full-screen request sheet
(`.e-permits-gh-sheet`, a library `modal--fullscreen`), the template / notification editor sheets
(`.e-permits-ntpl-sheet`, full-screen editors from the bottom), the Form Builder / Process Designer full-screen editors,
phone pickers (`.bottom-sheet`, GEAPSheet).

**Do** — one drawer per task; the title says the object, the subtitle its context; footer = the decision buttons.
**Don't** — no new right-hand panel markup (component-audit rule 9 `drawer-private`, major), no own ×, no second
scroller inside the body, no stacked drawers (park the first: „Action from inside a drawer that needs another drawer”).
Open size question for the PO: the audit proposed md 480 / lg 720; the shipped drawers are 800 / 960 (user decisions
2026-10-08) — kept, no geometry change.

### Modals on phones — maximum content space (2026-10-19)

User (2026-10-19): „all modals on mobile have the minimum padding for the scrim and for the modal itself,
the minimum admissible — for such long modals we need maximum space”. **One rule for every dialog
family at ≤760**, in its own file `css/modal-phone.css`, loaded LAST on every page that has dialogs
(e-permits-acte-permisive, e-permits-shell, cabinet-evo, rap-evo, clasificatoare), so equal specificity
beats the older per-family phone rules. Desktop (> 760) is untouched — every rule sits in the media
query (proved: 14 modal states at 1440, geometry identical with / without the file).

| Part | Phones (≤760, also 375 and 320) | Token |
|---|---|---|
| Scrim gap (layer cue) | **16 on top** (or the notch inset when larger), **0 sides, 0 bottom** | `--modal-phone-gap` = `max(--spacing-16, env(safe-area-inset-top))` |
| Surface | full width, top radius 16, bottom square; **hugs short content**, long content stops at `100dvh − 16`; page / flow dialogs (A4 viewer, Ghișeu request, `--doc` detail) take that full height | `--modal-phone-radius` (`--border-radius-16`), `--modal-phone-max` |
| Inner side padding | **16 everywhere** (header, body, footer) = the page gutter; never below 16 (touch, reading) | `--modal-phone-inset` (`--spacing-16`) |
| Header (2026-10-20, „no top line, title near the edge, bigger ×”) | **no drag handle** (none of our sheets is draggable — `GEAPSheet` no longer renders `.bottom-sheet__handle`, the library phone calendar's `::before` line is off); title **16 from the top edge** (= the 16 sides); **title 20/32 semibold on every phone dialog, sheet and drawer** (2026-10-21, user: „On phone, let's do 20 px” — ONE rule in `css/modal-phone.css` § 9 for `.bottom-sheet__header--title`, the library `.modal--header-title`, `.e-permits-fo-doc-modal__title`, `.drawer__title` and the FO confirm card `h2`; letter-spacing 0; replaces the 24/32 of the Filtre / Sortează sheets and FO dialogs and the 32/40 of the confirm card; desktop keeps each family's size); title (fills, wraps) + × in **one row aligned to the title's first line** — the × is centred on the 32 line box, so its 40 box sits 12 from the top and 16 from the right; 8 between title and × (library header right padding 64 = 8 + 40 + 16); sheets: header padding **16 16 8**, content keeps its own top inset (title → first content: sort sheet 16, Filtre 8 + the 56 section row); library modals keep 0 under the header + body 16; FO dialogs keep header 16 all round | `--modal-phone-close` (`--spacing-40`), `--modal-phone-title-line` (`--line-height-lh-32`) |
| × (close) on phones | the library `.modal-close` (sheets, library modals) / the FO dialog close `.e-permits-fo-doc-modal__close` (same look): **40 × 40, icon 24** (`--icon-size-default`; the markup's `icon small` 16 is resized in CSS), tertiary → hover `tertiary-hover` → pressed `tertiary-active`, focus-visible = the canonical ring 2 white + 3 `blue-sky-500`. Desktop (> 760) unchanged: library `.modal-close` 32 / icon 16 at 20 / 20, FO dialog close 32 / 16 at 24 / 24 | section 9 of `css/modal-phone.css` |
| Body | the only scroller: `flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain`; 16 padding | |
| Footer | 12 above the buttons, `max(16, env(safe-area-inset-bottom))` below; buttons side by side in two equal halves (`flex: 1 1 calc((100% − 8) / 2)`, `min-width: fit-content`); a label that does not fit its half wraps the pair → one button per line, **primary on top** (`flex-wrap: wrap-reverse`) | `--modal-phone-foot` |
| Button size | library `.modal-buttons` = 40 pill (unchanged); FO dialogs keep their 48 FO buttons (touch) | |
| A4 viewer | the page takes the full width: body padding 0, grey canvas edge to edge with 8 around the page (`GEAPDocPreview.fit` zooms to canvas width − computed padding) | |

Families covered (selectors in the file): library `.modal-overlay > .modal` (all sizes, `--sm`/`--md`/`--lg`,
the BO passport / case / detail modals, RAP + Cabinet „Vizualizare act”, Ghișeu picker, Ghișeu request
sheet `--fullscreen`, the classifier page) — not the Form Builder / Process Designer editors
(`.modal.e-permits-builder`, already a 16-from-top full sheet); the FO dialog shell
`.e-permits-fo-doc-modal` (document picker + upload, A4 act viewer `rap-act-modal`, Cabinet document
dialog `.cab-filter__body` — the „Perioadă” dialog that shared it went on 2026-10-20); the FO confirm card `.e-permits-fo-instance-switch-modal__card`;
sheets that already were sheets get the same gap / radius: facet-filter `.bottom-sheet` (radius 24 → 16,
`90dvh` → `100dvh − 16`), the template sheet `.e-permits-ntpl-sheet` (24 → 16), the account switcher
`.e-permits-fo-avatar-menu` (≤720, 24 → 16). Drawers (`.e-permits-user-create__drawer`) are already full
screen with 16 inside — unchanged.

**Measured (probe = dialog rect, scroll body clientHeight, leftmost text inset; 375 × 812 · 320 × 568):**

| Dialog (demo state) | gaps top/side/bottom before → after | usable body 375 before → after | 320 × 568 before → after |
|---|---|---|---|
| Act data modal, configured groups + tables (rap-03g / 03q / 03r, pp-01x / 01y) | 24/19/24 → 16/0/0 | 514 → 614 | **cut off** (dialog 608 > 568: header + footer off-screen) → 370 |
| Act data modal, one-line subtitle (pp-01m) | 45/19/45 → 16/0/0 | 514 → 656 | cut off (−9) → 412 |
| BO detail / document (dos-04s) | 35/19/35 → 16/0/0 | 514 → 636 | cut off (−19) → 392 |
| A4 act viewer (rap-03s / 03t, pp-01z) | 24/0/0 → 16/0/0 | 535 → 587 · page width 311 → 359 | 259 → 311 · page 256 → 304 |
| Ghișeu paper preview (gh-07a / 07a2) | 48/19/48 → 16/0/0 | 472 → 636 · page 250 → 359 | 228 → 392 · page 200 → 304 |
| FO document picker (fo-04d / 04e) | 41/0/41 → 16/0/0 | 412 → 505 | 192 → 205 (buttons stack at 320) |
| Cabinet document (sm-05f) | 81/0/0 → 16/0/0 | 534 → 627 | 314 → 383 |
| BO passport modal (svc-01c) | 66/19/66 → 16/0/0 | 514 → 678 | 358 → 402 |
| FO confirm (pp-01g, pp-02b) | sheet, inner 32 → 16 | card 528 → 412 (hugs) | top gap 40 → 92 |
| BO confirm (usr-u03c) | centred 283/19/283 → bottom sheet | hugs (190 high) | hugs (210) |
| Ghișeu request sheet (gh-07) | 24 → 16 | 563 → 583 | 295 → 315 |
| Account switcher (fo-01s, sm-01s) | ≤ 24 → ≤ 16 | hugs | 273 → 281 |
| Filter sheets (rap-04a, ek-04j) | hug (unchanged), radius 24 → 16 | 280 / 236 | same |

Header / footer heights (375): library header 116 → 112 (2-line subtitle), 74 → 70; library footer with two
buttons **132 → 68** (stacked → side by side); FO header 108 → 92, FO footer 89 → 77; A4 viewer header
150 → 134, footer 87 → 75.

**Research (why these numbers).** Mobbin MCP was not available in this session (no tools) — documented guidance:
- **Material 3 — Dialogs**: on compact windows (< 600dp) long or multi-step content uses a *full-screen
  dialog* (no outer margin, header with close + action); basic dialogs are for short decisions only.
  **M3 bottom sheets**: full width on compact, scrim above, drag handle, content scrolls inside; the
  expanded sheet keeps a top margin (72dp) so the layer reads as a layer — we keep that cue at the
  minimum (16) because the user asked for maximum content.
- **Apple HIG — Sheets**: on iPhone sheets are edge-to-edge; the *large detent* covers almost the whole
  screen and leaves only a thin strip of the presenting view at the top (the „card” look); use it for long
  content, put Cancel / Done in the sheet's header; respect the home-indicator safe area.
- **NN/g** („Modal & Nonmodal Dialogs”, „Bottom Sheets: Definition and UX Guidelines”): modals for long
  content on phones should become full-screen / full-height; keep a visible close, don't stack sheets, the
  page behind must not scroll. **GOV.UK Design System** publishes no modal component and advises keeping
  content in the page — when a dialog is unavoidable it must not waste the small screen on chrome.
- **WCAG 2.2 SC 1.4.10 Reflow**: at 320 CSS px nothing may need two-dimensional scrolling (tables / A4
  pages excepted) — before this rule the library modals were TALLER than a 320 × 568 screen (header and
  footer unreachable); now header and footer are always on screen and only the body scrolls. SC 2.5.8 /
  2.5.5: buttons 40 / 48 high, × 32 with spacing, ≥ 24 target.

Demo: rap-03g, rap-03q, rap-03r, rap-03s, rap-03t, pp-01m, pp-01x, pp-01y, pp-01z, pp-01g, pp-02b,
fo-04d, fo-04e, gh-07, gh-07a, gh-07a2, gh-07g, gh-01g, gh-02b, svc-01c, usr-u03c, dos-04s, sm-01g, sm-05f,
fo-01s, sm-01s, rap-04a, ek-04j, svc-08g (open them at 375 / 320).

Figma follows: phone dialog frames = the bottom sheet above (16 from the top of the 375 screen, full width,
top radius 16, 16 inner padding, header 16 + 32 title row, footer 12 / 16 with two equal 40 buttons; FO
dialogs 48 buttons); A4 viewer page 359 wide at 375. Header spec (2026-10-20): **no handle**; auto-layout row, padding
16 16 8 (sheets; library modals 16 16 0 + body 16), gap 8, top-aligned: title 20/32 semibold (fill, wraps; 2026-10-21) + × = Close button
40 × 40 / icon 24 with −4 vertical offset (centred on the title's first 32 line, 12 from the top, 16 from the right).

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
Exception (user, 2026-10-20): the list toolbars of Cabinet / RAP / eKYC put „Filtre” and the sort at the search height
= `btn-md` 40 (phones: 48 pills) — § „Advanced filter › Phone mode”.
The act row's „Postprocese ⌄” button follows it too: `btn btn-neutral btn-sm` (FO, Ghișeu, Cabinet; square since
2026-10-20 — the pill and the „Inițiază un postproces” label were dropped, user: „only do a square button”, „Postprocese”). Medium was tried on 2026-10-18 and rejected the same day (user: „use small buttons better”); its menu has the
one dropdown item size (§ „Dropdown item — one size everywhere”; the larger 40 / 48 act-menu rows were rejected
on 2026-10-20).

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
(the library `.switch` with the product placement, library-adopt-v1), only with a checkbox:

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
  `--color-text-base-tertiary` — identical to `.switch-label` / `.switch-description` (product placement).
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

#### Full flow — guest requestor, no account (2026-10-13)

Figma FOD-Components-flow (`pvDAJPXKyUuJgz3P921Ye8`) section „Guest lane · without account”
`633:7411`, blocks G1–G8 (US-12, US-16, US-18, US-21 · FOD #89525, #54850). Screen
`[data-fo-screen="guest"]` (`#guest`), reached from „Continuă fără cont” (`#access`) or logout.
Demo states `fo-g0` … `fo-g8`.

**Variant** = `auth.availableFor`, overridden by `?guest=pf|pj|pfpj` (Configurare flux ›
Eligibilitate also drives it): PF + PJ → „Soliciți în numele” segmented control (default
Persoană fizică); PF only / PJ only → the form directly, no selector.

| Case | Sections | Rules |
|---|---|---|
| G1 / G2 · PF, Pentru mine | Date personale (IDNP · Nume · Prenume · Telefon · Email) | all typed in; **names are never looked up from the IDNP** (privacy); act sent to the e-mail |
| G4 · PF, Pentru altă persoană | + Persoana reprezentată (IDNP · Nume · Prenume) + boxed „Procură notarială *” | no MPower without MPass → notarial power of attorney only (US-12 AC-06); officer checks it in BO, the portal never blocks |
| G1b / G3 / G5 · PJ | Date companie (IDNO → „Denumirea companiei” read-only from the public registry) · Date reprezentant (typed) · Dreptul de reprezentare + boxed „Procură sau decizia de numire *” | the document is **always** asked: without MPass the administrator role can't be confirmed (⚠ to confirm with PO) |

- **„Pentru cine este acest serviciu?”** has two options (Pentru mine · Pentru altă persoană)
  and shows only for PF. „În numele unei persoane juridice” is the **Persoană juridică** type
  (one control, no duplicate choice); PF-only services never offer the company; PJ-only
  services skip the question (the guest always represents the company → G5).
- **IDNO lookup** (registry = the flow schema's PJ subjects in the prototype): at 13 digits;
  the hint slot becomes the `__loading` message „Se caută compania în Registrul de Stat…”, the
  company field shows the input skeleton (`is-srre-loading`), then fills read-only with the green
  check + `is-srre-new` flash, or the IDNO gets „Nu am găsit o companie cu acest IDNO în Registrul
  de Stat.”. Demo `?registru=asteptare` keeps it pending.
- **G6 validation**: „Înainte” is never disabled; every check runs on click (US-12 AC-07/08):
  empty → „Câmp obligatoriu”; IDNP / IDNO 13 digits; phone 8 digits after +373 (6–12 for other
  codes); e-mail format; represented person + procură (G4) / mandate document (G5); consent
  (library `checkbox--error` + message under it). Field error = the library inline error, hint
  hidden; the doc field shows its error in the description line (`is-error` on the box). Focus
  and scroll go to the first error; an error clears on edit.
- **After „Înainte”** = the same wizard in guest mode (`frontOfficeGuest`): no draft and no
  „Salvează ca schiță” (US-21); no role switcher; step 2 „Persoana de contact · Eu” = the typed
  phone; Acte necesare: upload from the device only (doc modal opens on „Încarcă fișier”, tabs
  hidden; no MDocs text) and, in G4 / G5, the procură first, carried over from step 1; Verificare:
  Solicitant / Reprezentant from the typed data; Livrare: „Pe e-mail” + desk pick-up only (no
  MDelivery, no EVO Cabinet — FOD #89525); Plată: MPay as usual; Finalizare: case number +
  „trimise la <e-mail>”, „Rezultatul se trimite la”, no „Mergi la Solicitările mele”, an
  invitation to sign in (the upsell banner) instead (FOD #54850). Signing stays „Semnează prin
  msign” (⚠ to confirm: no EVO Sign session without MPass).
- **G8 leaving**: logo / gov link with typed data → leave modal (FO dialog component,
  „Părăsește cererea” · „Rămân în cerere”, MPass link in the text); closing the tab / browser back
  → the browser's own `beforeunload` prompt. „Autentifică-te cu MPass” (banner, modal, finish)
  keeps the typed values in `sessionStorage` (`e-permits-fo-guest-carry`, files excluded) and
  restores them when the guest form opens again in that tab.

##### Radio option row — `.e-permits-fo-radio--option` (2026-10-13)

The whole row (radio + title + description) is the hover / focus target. The label fills its
grid column, so the hover box has **the same left / right edges as the fields** above and below
(measured: = phone / e-mail / input edges, desktop and 375); radio + text sit inside with
padding 12 / 16. `::before` (inset 0, radius 12, `--color-background-base-tertiary`) goes from
opacity 0 / scale .97 to 1 / 1 on hover — 180ms `--motion-easing-decelerate`; reduced motion →
opacity only. Keyboard: the standard 2px white + 4px focus ring moves from the dot to the row.
Checked = the radio only (no fill); disabled rows get no hover. Used by „Pentru cine” and
„Persoana de contact” (`contactPersonHtml` + the static fallback).

##### Boxed doc field — `.e-permits-fo-doc-field--boxed` (2026-10-13)

A required attachment inside a form section reads as its own drop block: 1px **dashed**
`--color-border-base-default`, radius 16, padding 20 (16 on phones, where text stacks over a
full-width button). Action = the library black Strict button with square corners,
`btn btn-strict btn-md` + 20px `icon-upload` (40 = FO control height) — **not** `btn-sm`, because
`.btn.btn-sm.btn-strict` is the no-fill text button in this product. While empty, the whole block
opens the upload and takes the dropzone hover (brand border on the PO hover grey). With a file,
the file row sits inside and the button hides. Error: `is-error` → 1.5px dashed
`--color-border-danger-default` (padding −.5px) + inline error in place of the description. The
general Acte necesare rows are NOT boxed (same component, different context).

##### Animated segmented control — `.segmented-control.is-animated` (2026-10-13)

Opt-in enhancement of the library control (app CSS, never main.css). One `::before` thumb carries
the selected fill (`--color-background-base-inverse-default` + `--shadow-100`) and slides
(translateX + width, 220ms `--motion-easing-decelerate`); labels cross-fade colour over the same
time; the library separator rule is unchanged. `initAnimatedSegmentedControls()` writes
`--seg-x/-y/-w/-h` from the selected item, adds `is-ready` (before it the item keeps the library
fill), snaps (`is-snap`) on first show and window resize — a width change from the selection
itself (medium label) must NOT snap. Observe only the items' `class` (observing the control
loops on its own `is-ready`). With `role="radiogroup"` it adds ←→↑↓ / Home / End (selection
follows focus, roving tabindex, `aria-checked`). Items are label-only (the library item has no
leading icon). „Soliciți în numele” hugs its segments on desktop and is full width with equal
segments at ≤720px. Reduced motion → no slide.

#### Back-office sizing rules (2026-09-30)

- **Tabs** = Figma `tab-item-s`: `.tabs.tabs--sm` → **40px, 12px sides, 14/20**, count badge
  20px. The library `.tabs--sm` now resets the 48px height. Page-header tabs and the
  registry status tabs (`.e-permits-workplace__status-tab`) use the same 40 / 12 / 14.
- **Counters** = library numbered badge **Light**: `badge badge--lg badge--solid-light`
  (Figma 9442:44730: 20px, 4px sides, 12/16 medium). The library ramp now matches Figma:
  `--lg` 20px (12/16), new `--xl` 24px (14/20, the sidebar nav badges). Group headers of
  stacked lists: 16/24 medium secondary, 8/20 padding, 10px gap.
- **⋮ menu** (`.e-permits-stack__menu`): items 32px (6 12 6 8), 14/20 medium, 20px icon, gap 8, radius 6;
  surface 4 / gap 2 — § „Dropdown item — one size everywhere” (2026-10-20; the icon was 16 before).
- **Row actions**: edit / export are icon buttons (`.e-permits-workplace__icon-action`,
  32px) — "Editează" and "Exportă" are icon-only with aria-label + title.
- **Sync sources**: services declare `syncSources` (`RSSP`, `eAPL`). With both, the passport
  "Sincronizează" is a menu (RSSP / eAPL / RSSP și eAPL) and the modal shows a
  **Sursa sincronizării** segmented control. A new service is created only from RSSP;
  eAPL enriches (Date locale). While syncing: one progress line per source + a
  `.skeleton` summary. Rules: `GEAP.servicePassport.syncFromEapl`.
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
profile trigger (`.e-permits-shell__user-trigger`) shows the system ring on `:focus-visible`
**and while its menu is open** (`[aria-expanded="true"]`) — open dropdown = Focus state. Under the user's name,
the role line `__user-meta` ("Specialist • Chișinău") is 12/16 regular, `--color-text-base-secondary`.

**Header instance switcher — open state + alignment (2026-10-15, user, FOD 756:25276).** Both header
switchers — BO `.e-permits-shell__user-trigger` + `.e-permits-shell__profile-menu`, FO / Cabinet EVO
`.e-permits-fo-auth__avatar` + `.e-permits-fo-avatar-menu` (same markup on both pages) — use ONE look:
- **Open = Focus state**, driven by `[aria-expanded="true"]` (the JS setters toggle it on every open /
  close path): bg `--color-background-base-secondary` + the canonical Focus Ring/Medium
  `0 0 0 var(--border-width-2) white, 0 0 0 5px var(--focus-ring)` (= `.btn[aria-expanded="true"]`);
  hovered while open → `--color-background-base-tertiary`. Chevron rotates 180°.
- **Menu**: right edge = the trigger's right edge, top = trigger bottom + `--spacing-8` (the FO
  `.e-permits-fo-auth__profile` box is 52 = the trigger, so `100%` is the trigger bottom), width 364
  (≥ the 256 trigger). Phones (≤720): FO menu `calc(100vw − 32)` wide, right edge = header content
  edge (16 from the screen; the 40px menu button + 16 gap sit right of the trigger); BO menu capped at
  `calc(100vw − 2 × --spacing-16)`. While the FO menu is open the sticky header goes to z 30 so the
  sticky mobile progress (z 20) never paints over it.
- **Items**: role card hover tertiary; selected role (`.is-selected` / BO `.is-active`) hover
  `--color-background-brand-secondary-hover`; FO „Ieșire” (rests on tertiary) hover `…-tertiary-hover`.
- Demo states: `fo-01s` (FO request), `sm-01s` (Cabinet EVO), `auth-05` (BO).

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
- **Product rule (2026-10-18):** desktop uses the 40 (`.input--medium`), phones (≤760) the 48 default with 16/24 text and 24 icons (read-only check included) — see the inventory row „Field sizes”.
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

### Tooltip — ONE runtime (tooltip-one-v1, 2026-10-21)

User (2026-10-21, on the component audit): „Do as you recommend” → every tooltip in the product is the library
`.tooltip` placed by **`js/icon-tooltip.js` (`window.GEAPTooltip`)**. It replaced five private runtimes: the BO
table-cell tooltip (`.cell-tooltip` from js/table-cells.js), RAP `.rap-tooltip`, Cabinet `.cab-tooltip`, the BO
sidebar `e-permits-shell__nav-tooltip` / `__collapse-tooltip` spans, and native `title=` tooltips. Only the copy
value keeps its own node (`.copy-value__tooltip`, the „Copiază → ✓ Copiat” transition — same library look).

**Anatomy** — one node `div#icon-tooltip.tooltip[role=tooltip]` on `<body>` > `.tooltip-inner` + `.tooltip-arrow`.

| Look | Classes | Use |
|---|---|---|
| plain | `.tooltip.tooltip--small.tooltip--plain` — no arrow, 12/16, padding 4 8, radius 4, `--gray-900`, max 240, 4 from the target | a control's name, a cut / abbreviated text, a disabled reason |
| hint | `.tooltip.tooltip--small.tooltip--{top\|bottom}-center` + arrow — 14/20 (12 ≤720, library body-sm), padding 8 12, radius 6, max 240; the arrow points at the target's centre even when the bubble is clamped | an explanation (a sentence) on a mark / info button |

**What opts in** (the innermost match wins):

| Attribute | Shows | Notes |
|---|---|---|
| (icon-only `button` / `a[href]` / `[role=button]`) | `data-tooltip-label`, else `aria-label`, else `title` (moved to `data-tooltip-label`) | automatic |
| `data-tooltip-reason="…"` | why it is unavailable | any element, text buttons too |
| `data-tooltip-text="…"` | the full text of a cut control, or information the visible text does not carry (full author, a token name) | always shown |
| `data-cell-tooltip[="…"]` | the element's own text (or the value) **only when it is really clipped** — on it, its clipping parent, or a part inside it | 1 s hover delay; `data-cell-tooltip-always` = show anyway („+N”); the library `.cell` contract, valid on any element |
| (text clipped inside `td` / `th` / `[role=cell]`) | its full text | automatic (rule 2026-10-10) |
| `data-tooltip-hint="…"` | an explanation, hint look | also opens on a **tap** on touch; the target's `aria-describedby` while shown (skipped when its `aria-label` already says it) |

Options: `data-tooltip-placement="bottom|top|right|left"` (plain default bottom, hint default top; flips when there
is no room, clamped 8 from the edges) · `data-tooltip-delay="<ms>"` · `data-no-tooltip` · `data-tooltip-focus` on a
focusable row (its first `[data-tooltip-text]` child on keyboard focus). The collapsed BO rail: nav links get
`data-tooltip-label` + `data-tooltip-placement="right"` from `setupNavTooltips()`; the collapse buttons carry
`data-tooltip-placement="right"` and are named by their Romanian `aria-label` („Colapsează / Extinde meniul”; the
old span said „Collapse menu” in English).

**States** — hidden · pending (600 ms mouse, 1 s clipped text) · shown (library `.show` fade / 4 px slide, none for
reduced motion) · warm (while one shows or ≤ 400 ms after, the next shows at once) · keyboard: on `:focus-visible`
at once (clipped text on any focus) · touch: hints only, on tap · hides on mouse-out, blur, pointer-down, Escape,
window blur, resize; follows its target on scroll and hides when the target leaves the viewport · never while the
target's menu is open (`aria-expanded="true"`). API: `GEAPTooltip.show(el) / hide() / refresh()`
(`GEAPIconTooltip` = alias).

**Do** — let the runtime name icon-only controls from `aria-label`; put `data-cell-tooltip` on any text that can be
cut (ellipsis / clamp); give extra information with `data-tooltip-text`, explanations with `data-tooltip-hint`.
**Don't** — no `title=` (component-audit rule 8 `tooltip-title`, major), no private tooltip element / class
(`tooltip-private`, major), no tooltip that repeats the visible text or the `aria-label`, no tooltip on touch
except hints. Pages: every page with tooltips loads `js/icon-tooltip.js` (BO page, e-permits-shell.html, Cabinet,
RAP, table-cells.html).

**`title=` decisions (2026-10-21, 89 → 1)** — converted to `data-cell-tooltip` (cut text: page / dialog titles,
fo-select values, detail row labels, stacked-row titles, file names, doc titles, chips, sheet summaries, builder
tags / keys, grid cells, CAEM options, address options) · `data-tooltip-text` (adds information: alert flag full
label, author behind a short name, sync source, template tokens, unknown fields, preset origin, error message,
„Vezi modificările” on the unsaved-changes status) · `data-tooltip-label` (2 icon-only sync buttons) ·
`data-tooltip-reason` (fo-grid option from another group) · REMOVED (repeat the visible text / aria-label): every BO
nav link, the table „Exportă” button, the RAP „Filtru” button, the act-row title (its cut tooltip comes from
`syncCut`). Kept: the Form Builder phone-preview `<iframe title>` (the accessible name, not a tooltip).

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
- **Truncated text controls** (2026-10-19): `data-tooltip-text="<full text>"` opts in a control WITH visible but cut
  text (the long-name toggle, „Long name in a header — expand on click”); never shown while `aria-expanded="true"`.
  `window.GEAPIconTooltip.hide()` hides it when a control changes in place.
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

**Back office (2026-10-01; runtime moved 2026-10-21):** the cell tooltip is the ONE tooltip runtime
(`js/icon-tooltip.js`, plain library tooltip — „Tooltip — ONE runtime”; the library `.cell-tooltip` in main.css is no
longer used by any page), never a native `title`:
- **Long text:** registry names and authority stacks carry `data-cell-tooltip`. The
  tooltip shows only when the text is clipped.
- **"+N" overflow badges** (e.g. user roles beyond the first 2): the
  `.e-permits-workplace__user-role-more` has `data-cell-tooltip="<all items, comma
  separated>"` + **`data-cell-tooltip-always`**, which shows it even though nothing is
  clipped. It also has `tabindex="0"` and an `aria-label` "Toate rolurile: …", so a
  keyboard reaches it. Every future "+N" uses the same pattern.
- **Measured fit (2026-10-14)**: `renderUserRoles(values, { label })` renders EVERY value; `fitTagRows()`
  (shell, after each table render, on resize and via a ResizeObserver on the table for tables drawn while
  hidden) keeps as many WHOLE tags as fit the cell on one line and moves the rest into „+N” (at least one
  tag stays, ellipsised if even it does not fit). It measures with `.is-measuring` (flex-shrink 0) —
  shrunk tags under-report `scrollWidth`. Before the first fit the old rule shows (2 tags + „+N”). `label`
  = the aria-label noun („Toate rolurile” default, „Toate cazurile” in eKYC Clienți). Used by BO
  Utilizatori › Roluri, eKYC Utilizatori › Roluri, eKYC Clienți › Cazuri de utilizare (the local eKYC
  `chips()` copy that wrapped into 2 lines is gone). Demo: ek-22, ek-22f (tooltip open), ek-20.

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
| Copy to clipboard | **4** implementations — `data-rap-copy` (1600ms), `.rap-profile__copy`, `data-fo-copy-value` (1500ms), `data-copy-id` (1500ms) | `.cell__copy` + `data-cell-copy` (library preview) → in the product since 2026-10-20 the ONE `.copy-value` (`js/copy-value.js`, „Copy value — one component”); tables use its `--compact` variant |
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

### Dropdown surface — one look for every menu (rule, 2026-10-16)

User: „audit all dropdown menus — they should have the dropdown effect applied, and clip content
checked so the effect applies”. Reference: GEAP 2.0 `9632:3226` „Field picker” (white, radius 12,
soft shadow, no border, search on top, group label, rows title + 12px meta, hover row grey inside
the rounded corners). Its effect is the GEAP 2.0 effect style **„dropdown-effect”** = 3 drop shadows
`0 0 0 1 @8 %` (the ring is the border) · `0 4 6 −2 @5 %` · `0 10 15 −3 @10 %` — the box-shadow the FO
intent menu / instance switchers already had (Figma side: `tools/figma/dropdown-effect/`). **There is no
CSS token for it**: main.css has only `--drop-shadow-100…600` (the library `.date-picker` /
`.profile-dropdown` use `--drop-shadow-300`, a softer 0.5px edge), and the `--shadow-100…400` names in
design-system.md are not defined in main.css at all. The value is written ONCE, in the rule below
(PO / design-system: add a `--shadow-dropdown` token and swap it there).

| Property | Value |
|---|---|
| background | `--color-background-base-default` |
| border | none (the effect's 1px @8 % ring draws the edge) |
| radius | `--border-radius-12` (reference + library date picker + BO stack menus; the Figma library `selection-menu` / `contextual-menu`, `.profile-dropdown` and the Figma FO intent menu / instance switcher say 16 — one token in the rule if the PO picks 16) |
| shadow | „dropdown-effect”: `0 0 0 1px rgba(0,0,0,.08), 0 4px 6px -2px rgba(0,0,0,.05), 0 10px 15px -3px rgba(0,0,0,.1)` (no token) |
| clip | `overflow: clip` (hover / selected row fills and the scrollbar stay inside the corners; not a scroll box, so `scrollIntoView` never shifts the menu) |
| rows | one size for every menu / list: 4 inset, gap 2, 32px rows, radius 6 — § „Dropdown item — one size everywhere” (`css/dropdown.css`, 2026-10-20) |
| cursor | `default` on the surface (a menu inside a clickable card / row no longer inherits `pointer`; items keep theirs) |

**One rule, zero specificity** — `:where(…)` at the end of `css/e-permits-acte-permisive.css`
(comment header „Dropdown surface”), plus two real selectors in the same rule for library classes that
style themselves (`.date-picker-panel > .date-picker`, `.select-dropdown.e-permits-shell__help-menu`). Covered surfaces: `.e-permits-fo-intent-menu` (base of every ⋮
row menu `renderStackMenu`, BO header / export / sort / column / schedule / „Adaugă tip” menus,
`.cab-menu`, `.e-permits-case-actions__menu`, eKYC menus, Form Builder `__add-menu` / `__issues-menu`,
Process Designer zoom / versions / „Continuă cu”, Ghișeu row + act menus, the filter popover
`.e-permits-workplace__filter-pop`, the notification field picker `.e-permits-ntpl-picker`),
`.e-permits-fo-select__list` (incl. the floating `data-fo-float` list in dialogs), `__caem__menu`,
`__subgen-select__menu`, `__address-search__list`, `__phone__code-list`, `__mdocs__menu`,
`.e-permits-builder__source-menu` (no markup uses it today), the header instance switchers `.e-permits-fo-avatar-menu` /
`.e-permits-shell__profile-menu`, `.e-permits-shell__help-menu`, the library `.date-picker`.
Restated (same values) only where that file is not loaded: `.e-permits-shell__help-menu` /
`__profile-menu` in `e-permits-shell.css` (standalone `e-permits-shell.html`; the help menu also
sits on the library `.select-dropdown`, which beats `:where`). Not dropdowns (left as they are): the
RAP EVO filter (`.rap-filter-panel`, an inline panel / drawer; `.rap-filter__panel` in rap-evo.css is
dead CSS), the template hover preview `.e-permits-doc-peek` (a preview card, `--drop-shadow-400`, r16),
Process Designer floating cards / toolbar / minimap (canvas panels, `--shadow-200`, r16).

Rules:
- A surface never redeclares background / border / radius / shadow — reuse the class and delete
  them (a phone bottom-sheet variant may override, as the library date picker does at ≤ 720).
- A surface that scrolls declares its own `overflow-y: auto` (beats `:where`, clips too); a menu
  with a search + list keeps the scroll on the inner list (`flex: 1 1 auto; min-height: 0`).
- Nothing inside a menu may need to paint outside it: tooltips (`data-tooltip-label`,
  `data-tooltip-reason` on disabled items) are portals on `<body>` (icon-tooltip.js / tooltip.js);
  no menu has a nested flyout — a future submenu opens as its own surface, never inside the clip.
- New dropdown → class `e-permits-dropdown` on the surface (or `.e-permits-fo-intent-menu`).
- QA: `tools/ui-qa/code-audit.mjs` reports `dropdown-surface` for an open `role=menu` /
  `role=listbox` whose floating surface lacks the „dropdown-effect” shadow, radius 12, border 0, a background or a
  non-visible overflow.

### Dropdown item — one size everywhere (rule, 2026-10-20)

User (Vasile): „when we have a dropdown menu let's use such item size / padding style as here [GEAP 2.0
`aHgwVwiNCOSOqbMhMjjUOj` `9716:10905` „Dossier / Step menu · action”] everywhere, so it's not big and chunky like we
have in some places.” Measured in Figma (icon frame at x 8 / y 6, label at x 36):

| Part | Value |
|---|---|
| surface / list | padding `--spacing-4`, gap `--spacing-2` between items; radius 12 + „dropdown-effect” + clip = § „Dropdown surface” |
| item | `min-height` 32 = padding 6 top · 12 right · 6 bottom · 8 left around a 20 line; radius `--border-radius-6` |
| label | 14/20 medium (`--font-size-fs-14` / `--line-height-lh-20` / `--font-weight-fw-medium`), colour per menu |
| icon | 20 (`--icon-size-medium`), gap 8 → label; icon colour = label colour |
| states | as the BO stack menu: hover / focus-visible `--color-background-base-tertiary`, danger `--color-text-error-default`, `aria-disabled` grey + not-allowed + no hover (+ `data-tooltip-reason`), selected per list (brand text / trailing 20 check) |
| touch | the same size (no `pointer: coarse` rows); items stay full-width tap rows. Exception (2026-10-20, user, ref Telegram iOS): on phones ≤760 every ROW action menu (act rows, act profile, request rows) keeps the anchored dropdown with the touch item size (48 · 16/24 · icon 24, surface r16 / 8) — § „Row action menu on phones”. (The act action sheet of the same morning was rejected: „a dropdown menu, not a down modal”.) |
| two-line rows | same padding, the row grows (dossier case actions, notification field picker, builder issues, designer versions, address search 2 lines with gap 2, MDocs) |

**One rule** — `css/dropdown.css` (loaded on the BO page, `e-permits-shell.html`, EVO Cabinet and RAP, after the product
CSS and before `modal-phone.css`). It lists every list class (`.e-permits-fo-intent-menu`, `.e-permits-fo-select__list`,
`__caem__list`, `__subgen-select__list`, `__address-search__list`, `__phone__code-list`, `__mdocs__list`,
`.e-permits-workplace__filter-list`, `.e-permits-shell__help-list`, `__profile-links`) and every item class
(`.e-permits-fo-intent-menu__item`, `.e-permits-fo-select__option`, `__caem__option`, `__subgen-select__option`,
`__address-search__option`, `__phone__code-option`, `__mdocs__option`, `.e-permits-workplace__filter-option` /
`__filter-more-item`, `.e-permits-shell__help-link`, `__profile-link`) once, at (0,1,0). The menus' own rules declare
NO item size any more — only colours, layout of their parts (`white-space`, two-line `flex-direction`) and width.
A new menu reuses `.e-permits-fo-intent-menu` + `__item` (or adds its classes to the two lists in that file).

Where it applies: every ⋮ row menu (BO registries / passport / users / notifications, Ghișeu, eKYC, Cabinet), the act
post-process menu („Postprocese ⌄”: FO #intent, Ghișeu, Cabinet list + act profile header; phones = § „Row action menu on phones”), the dossier
case-actions menu, „Sincronizare ▾”, export menus (eKYC Rapoarte), Cabinet „N pe pagină”, „Sortează” (desktop; phones = the sort sheet),
Form Builder add / issues menus, Process Designer zoom / versions / „Continuă cu”, the notification field picker, the
header help menu, the BO account menu links (Profilul meu …), FO selects, CAEM + subgenre combos, the address search,
the phone code list, the MDocs picker list, the facet-filter popover options (BO, eKYC, Cabinet, RAP — checkbox kept).

Not dropdown items (they keep their own rows): the phone bottom sheets (facet-filter sheet rows 44 · 12 8 · gap 10 ·
regular; the FO / Cabinet instance-switcher sheet), the identity cards of the account menus (FO avatar menu role
cards 64–68, BO role cards 58, „Ieșire” 40 button), the date-picker day grid (40 cells), header navigation
(`.rap-header__menu-item`).

History: 2026-10-18 the act post-process menu was enlarged after research (40 rows · 8 16 8 12 · 16/24 · gap 12 ·
radius 8, surface 8 / 4, 48 rows on `pointer: coarse`) — rejected by the user on 2026-10-20 („big and chunky”).

Demo states (open menus): pp-02a / pp-01a / pp-01q / gh-02j (act menu), dos-01m (case actions), usr-u03b, svc-04k,
srv-03m (⋮ / Sincronizare), sm-02 / sm-01l / sm-01f phone (Cabinet), ek-15a (export), fb-01b / fb-13 (builder), pd-04e
(designer), ntpl-02c (field picker), svc-00h (help), auth-05 (account), fo-03u (FO select), fo-02p (phone code),
fo-03e / gh-02q (CAEM), fo-03s (subgenre), adr-02a (address), dos-05c / ek-22b / rap-04b / pp-01s / sm-01n
(filter popovers).

---

### Row action menu on phones — anchored popover, touch item size (2026-10-20, action-menu-v1)

User (Vasile, 2026-10-20), in order: „in the 3 dots modal do nicer, it is ugly” (the act action sheet) → a Telegram iOS
screenshot: „let's do 3 dots like here … as it was” → „the action does a dropdown menu, as I said with Telegram, not a
down modal”. Result: the phone **action sheet for act / request menus is gone** (GEAPSheet keeps serving „Filtre” and
„Sortează”); every action menu of a list row or the act profile is the anchored dropdown, at every width.

| Part | Desktop (> 760) | Phones (≤ 760) |
|---|---|---|
| Trigger (in the card's top-right corner at every width, trigger-corner-v1: desktop top = right = 12 on the 24 title line, phones 10 / 10 on the 20 tag line) | acts „Postprocese ⌄” = `btn btn-neutral btn-sm` (32, radius 6 — square, not a pill) + 16 chevron (rotates when open); requests = the icon-only ⋮ `btn btn-neutral btn-sm btn-icon-only cab-card__more` (grey at rest) (32 square, radius 6, gray-100 fill, tooltip „Mai multe acțiuni”, `aria-label` „Acțiuni pentru <name>”; row-kebab-v1 — user: „Acțiuni is too ambiguous”); a request whose only action is „Detalii” has NO trigger (no-lone-detalii-v1 — the card opens the details; no one-item menu, no lone button); open = pressed + focus ring (`aria-expanded`) | same button (§ „List rows — act + request” › Row anatomy) |
| Position | under the button, right-aligned (`right: 0`) | right-aligned to the button; upwards (`.is-open-up`) when the screen has no room below and there is room above; never wider than the room on its side (`--act-menu-max`, 16 from the edges); left-aligned (`.is-fit-start`) when a button sits on the left |
| Surface | the „Dropdown surface”: padding 4 · gap 2 · radius 12 · dropdown-effect · clip | padding 8 · gap 0 · **radius 16** · dropdown-effect · clip |
| Item | the one dropdown item: 32 · 6 12 6 8 · 14/20 medium · icon 20 · gap 8 · r6 | **48** · padding 12 16 · gap 12 · **16/24 regular** · **icon 24** (label colour) · r8 |
| Unavailable item | grey + not-allowed, reason = tooltip (`data-tooltip-reason`, `aria-description`) | grey label + icon, the reason as a second line `.e-permits-fo-intent-menu__reason` 14/20 tertiary (aria-hidden: `aria-description` already says it) — icon on the label line |
| Danger | Retragere, Anulare (`pp.danger`, else by label), Elimină schița: `.is-danger` red label + icon, placed LAST after `li[role=separator].e-permits-fo-intent-menu__separator` (Cabinet requests: `.cab-menu__separator`) | same; separator margin 8 16 (on the icon inset) |
| Behaviour | page handlers unchanged (FO / Ghișeu / Cabinet confirm modals); tap outside / Esc close; Cabinet menus: Enter / Space / ↓ open on the first item, ↑ on the last, ↑ ↓ Home End, Esc returns focus to the trigger, Tab closes | same |

Markup: the items come from ONE helper `GEAPActRow.menuItemsHtml(items, itemHook, assets)` (act rows + the Cabinet act
profile header); request rows build theirs in `cabinet-evo/solicitari.js actionsHtml` (`data-act-menu-anchored` on the
⋮ trigger; the labelled „Acțiuni ⌄” and its `?actiuni=kebab` / sm-01v comparison were removed on 2026-10-20, row-kebab-v1). code-audit's
`dropdown-surface` accepts radius 16 for these menus on phones (rule updated 2026-10-20).

**Row action menu — icon map (act-icons-v1, 2026-10-20; user: „nice central icons so all have the same size footprint,
similar to the Telegram look and feel”).** One icon box per item (24 phones / 20 desktop, `flex: 0 0`, the glyph centred
by its viewBox; label 12 / 8 after it) and ONE outline family whose glyphs optically fill ~17–20 of the 24 box (ink
boxes measured at 24). The act post-process icon comes from ONE map, `GEAPActRow.ppIcon(pp)` in js/act-row.js (by id OR
label, so FO / Cabinet data ids and Ghișeu labels agree; the item's own `icon` is only the fallback); data
(`data/acte-permisive.json` postProcesses) and Ghișeu `PP_ICON` carry the same names. Off-size sprite glyphs are
normalised in CSS (`--menu-icon-optical` → `scale`, matched by `use[href$="#…"]` on `.e-permits-fo-intent-menu__item >
.icon`), never in the sprite. Danger icons = the red label colour; download = icon-export (product rule).

| Action | Icon | Ink box at 24 | Note |
|---|---|---|---|
| Prelungire | `icon-calendar-add` | 18.1 × 19 | was rotate-arrow (shared with Reluare) |
| Reperfectare | `icon-edit` | 17.2 | — |
| Emitere duplicat | `icon-copy` | 17.2 | — |
| Suspendare valabilitate | `icon-lock` | 15.8 × 19.8 | was icon-pause (10 × 14, two light bars) |
| Reluarea valabilității | `icon-rotate-arrow` | 17.2 | — |
| Contestație / Depune contestație | `icon-judge-gavel` × 0.85 | 23.3 → 19.8 | Ghișeu was icon-flag |
| Retragere (act permisiv) — danger | `icon-circle-x` (Foundations „circle-x”, added to assets/icons/sprite.svg 2026-10-20 = the circle-error circle + 6×6 cross, 1.8) | 19.8, no scale | was icon-cross-small (9.6), then cross-large — user „circle with x is more suitable” |
| Anulare — danger | `icon-circle-error` | 19.8 | circles read smaller → the full 20 |
| Detalii | `icon-eye-open` | 20.5 × 15.2 | request ⋮ |
| Continuă schița | `icon-edit` | 17.2 | request ⋮ |
| Elimină schița — danger | `icon-delete` | 17.8 × 19.8 | request ⋮ |
| Suplinire informații („Trimite informațiile”) | `icon-page-upload` | 16 × 19 | request ⋮ |
| Achită | `icon-credit-card` | 19.8 × 15.8 | request ⋮ |
| Descarcă … | `icon-export` | 18.4 | product rule (arrow into tray); not in row menus (no row downloads) |
| Vezi actul | `icon-page-text` | 15.2 × 19 | request ⋮ |

Compared and rejected: rotate-arrow / reschedule / history (Prelungire), pause ×1.3 (bars too heavy), clock / time
(read as „pending”), calendar-remove (reads as Anulare), barrier, alarm (Suspendare), cross-small, undo, backspace
(Retragere), flag (Contestație). Demo pp-01q (act profile), pp-01a, pp-02a, gh-02j (every post-process), sm-01u.

**Research (2026-10-20).** Mobbin MCP was not available in this session — documented guidance + well-known products:
NN/g „Kebab / hamburger icons” and „Icon usability” (unlabelled icons are missed, a text label beats an icon for
discoverability, especially for infrequent / low-literacy users); GOV.UK Design System (no hidden „more” menus — visible
text actions like „Change”); Material 3 Menus (anchored to the trigger, 48dp items on touch, flips to stay on screen) and
Apple HIG Menus / pull-down buttons (iOS 14+ anchored pull-down menus from a labelled button, destructive item red and
last, separated); Telegram iOS / Google Drive / GitHub mobile (anchored menu rows with a 24 icon and a 16–17 label). →
labelled trigger with a chevron + anchored menu (acts: „Postprocese ⌄”). Requests went back to the ⋮ the same day
(user: „Acțiuni is too ambiguous” — a generic verb label says no more than the ⋮ and costs row-1 space; row-kebab-v1).

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

### Sort sheet on phones (+ the desktop sort menu) — 2026-10-20

User (Vasile, 2026-10-20, phone screenshot of the Cabinet „Sortează” sheet): „Looks awful, do components, nice text
hierarchy.” Before: the act-row action sheet used for a radio menu — grey 16 group labels, eight plain 16/24 text rows
with a trailing check, no components. After: ONE sort contract (`js/sort-sheet.js`, `css/sort-sheet.css`), two
presentations of the same two groups „Sortează după” / „Ordine”.
**v2 (same day, user via the coordinator): „Ordine” is built exactly like „Sortează după” — a library radio group of
48 rows — the segmented control of v1 is gone** (v1 wrapped „Cele mai apropiate / îndepărtate” to two lines at 320 and
mixed two control types for one choice).

**Phones (≤760) — the sort sheet** (`GEAPSortSheet.bind(trigger, cfg)`; the trigger's own click in the target phase, so
the page's delegated dropdown never opens; the trigger says `aria-haspopup="dialog"` on phones, `menu` on desktop):

| Part | Value |
|---|---|
| Container | shared `GEAPSheet` (`.bottom-sheet.e-permits-filter-sheet.e-permits-sort-sheet`): scrim, header (no handle since 2026-10-20; title 16 from the top, × 40 / icon 24 — „Modals on phones › Header”), „Modals on phones” gap 16 / radius 16; hugs its content (375 × 812: panel 672 high in v2, no scroll), scrolls the body between header and footer when taller (320 × 568) |
| Header | title „Sortează” 20/32 semibold (the one phone title rule, 2026-10-21) + library `.modal-close` |
| Body | padding 8 16 24, groups 24 apart |
| Section label | `h3.e-permits-sort-sheet__label` 14/20 medium `--color-text-base-secondary`, 8 above its control |
| Key | library `.radio-group` (`role=radiogroup`, `aria-labelledby` the label, gap 0) of library `label.radio.radio--medium` rows: 48 high · padding 12 8 · gap 12 (Figma radio-label gap) · radius 8 · full width (the layer bleeds 8 into the side padding, radio + text stay on the 16 inset); radio 20; label 16/24 regular default, the checked one medium; hover `--color-background-base-tertiary`, pressed `--color-background-base-tertiary-hover`; native radios = arrows move the choice, one tab stop; library focus ring on the radio for the keyboard only (a tap leaves none) |
| Order | a second library `.radio-group` (`role=radiogroup` named by „Ordine”, class `e-permits-sort-sheet__keys e-permits-sort-sheet__order`) of the SAME rows as the key (48 · 12 8 · gap 12 · r8, 16/24, checked medium, same hover / pressed); labels follow the key, natural order first: dates „Cele mai noi” / „Cele mai vechi”, estimated date „Cele mai apropiate” / „Cele mai îndepărtate”, number „Crescător” / „Descrescător”, texts „A → Z” / „Z → A” (input `aria-label` „De la A la Z”), status „Ordinea etapelor” / „Ordinea inversă”. A new key redraws only this group (labels); an order pick does not redraw (arrow keys keep focus) |
| Footer | the filter sheet's sticky footer: `btn btn-primary btn-lg e-permits-filter-sheet__apply` „Aplică”, full width |
| Behaviour | the choice is a DRAFT until „Aplică” (as the filter sheet's „Arată N rezultate”; a sort has two parts — applying on the key tap would close before the order is chosen). A new key starts in its natural order unless the order was reversed in this sheet (then it stays reversed). „Aplică” → the page applies (page 1, announced in the live region „Lista este sortată după …”), focus back on the trigger; ×, scrim, Escape (window capture, the sheet only) cancel and return focus; Tab trapped; crossing 760 closes it |

**Desktop (> 760) — the compact dropdown** (`GEAPSortSheet.menuHtml`): the one dropdown size (§ „Dropdown item”: 32 rows,
14/20 medium, 6 12 6 8, gap 8), the same two groups — `li.e-permits-sort-menu__label` 12/16 medium secondary (padding 4/8
8 8 4, on the radios' x), a separator 4 8, every item `menuitemradio` with the library radio 20 LEADING (checked look
from `aria-checked`, no trailing check), the same order labels. A pick applies at once and closes (unchanged behaviour).

**Cabinet wiring:** `.cab-sort` is no longer an `.e-permits-fo-intent-act__action` (that class made the act-row action sheet
take the trigger on phones) — it anchors its own menu (`position: relative`, `fitMenu` `.is-end` / `.is-start`). One
`applySort()` in cabinet-evo/solicitari.js serves the menu and the sheet. Demo: sm-01f (open: phones = sheet, desktop =
menu), sm-01t (key „Serviciul solicitat” picked: phones = draft with A → Z / Z → A, desktop = menu reopened), sm-01m
(applied: Serviciul solicitat, Z → A). Other phone sort sheets: none — RAP / eKYC / BO sort by table headers, the
Cabinet acts list has no sort; „N pe pagină” stays a radio menu (act-row sheet not involved: it is no act action).

**Figma spec (phone 375, Sort sheet):** Bottom sheet instance (radius 16 top, 16 from the top or hug), auto-layout
vertical: header (title 20/32 semibold + Modal close) · body padding 8 16 24, gap 24: [group: label 14/20 medium
text/secondary, gap 8, Radio-label instances ×6 (Size Small = 20, label 16/24 regular, selected medium, row 48, padding
12 8, radius 8, fill none / hover tertiary)] · [group: label „Ordine” 14/20 medium text/secondary, gap 8, Radio-label instances ×2 — identical to the key rows (Size Small = 20, 16/24 regular, selected medium, row 48, padding 12 8, radius 8, Fill container)] · footer (border-top 1 default, padding 16, Button Primary Large „Aplică” fill). States to draw: default
(Data depunerii · Cele mai noi), text key (Serviciul solicitat · A → Z), 320 scrolled body. **Desktop (1440):** dropdown
(dropdown-effect, radius 12, padding 4, gap 2): label 12/16 medium secondary · 6 items (Radio Small leading + label 14/20
medium, 32) · divider · label „Ordine” · 2 items.

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

**Product use (audit-fix-v3, 2026-10-21):** every list pages through the ONE list pager (`GEAPPager`, inventory row
„List pager”) — never a private pager. It renders the library list markup (`ul.pagination > li.pagination__item >
button.pagination__link`); hover tertiary, the current page `brand-default-hover` on hover (`css/pager.css`).

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

**First product use (2026-10-17): the facet filter's phone sheets** (`.bottom-sheet.e-permits-filter-sheet`,
see „Advanced filter › Phone mode”). Product overrides, scoped: hug the content (`min-height: 0`),
`max-height: 90dvh`, top radius 24 on every width (phones ≤760 since 2026-10-19: the shared rule „Modals on phones — maximum content space”, 16 from the top, radius 16), × = library `.modal-close` (the bare
`__close` is a text „×”), sticky `__footer` with a top border. Swipe-to-dismiss is not built —
scrim tap, ×, Esc and the sheet's own action close it. **No handle in the product (2026-10-20, user: „all down modals should not have the top line like iOS native — it's not functional here”)**: `GEAPSheet` renders no `__handle`; the title sits 16 from the top edge and the × is 40 / icon 24 — „Modals on phones — maximum content space › Header”.

---

### Breadcrumb

**Updated 2026-10-01 to Figma Components `232:5282`** (items `81:714` Enabled / `81:763`
Active). It is used on every page, and nothing else draws a trail.

**Usage rule (2026-10-21, user: „let's use the breadcrumb as a component … and adjust it in code EVERYWHERE — this is
the component, why invent it?”):** every sub-page (profile, detail, nested panel) shows its way back with this
component and nothing else — never a custom „← Înapoi la …” link / button, a top-bar back button, a `*__back` button
or a hand-made `›` trail. The parent level is a link that carries the page's existing back handler (`attr`).
Not breadcrumbs (stay as they are): wizard step „Înapoi” in step footers / drawer footers (`.e-permits-fo-back-button`,
`[data-*-back]` in `.modal-buttons`), „Schimbă” on the FO chosen card, empty-state actions, dialog footer „Înapoi la …”
buttons that close the dialog. `tools/ui-qa/component-audit.mjs` rule 5 (`crumb-trail` / `back-link`, spec `backNav`)
reports any other as a major.

**ONE renderer — `GEAPBreadcrumbs.html(crumbs, { trailing, truncate = true, label = "Navigare", mobile = true, max = 4,
className })`** (`js/breadcrumbs.js`, layout in `css/breadcrumbs.css`; both loaded on the BO / FO page, the shell page,
EVO Cabinet and RAP). Callers: shell `renderBreadcrumbs` / `renderPageHeaderTop` (every BO, eKYC, classifier, template,
passport profile; process designer; the passport template detail), `CabEvo.pageHeader({ back })`, RAP `crumbsHtml()`
(list + act profile), the form builder (service line + properties panel). Crumb = `{ label, attr?, href?, button? }`.
It returns two library navs, siblings:
- **Desktop** (> 760): the trail; the last crumb is the current page (medium, `aria-current`) unless `trailing`
  (only the builder lines and the notification-template back line that run into the title; the RAP / Cabinet public
  headers show the current page since breadcrumb-v2). More than 4 levels → first · „…” · the last 3 (Figma
  „w/ overflow”): `li.breadcrumbs__item > button.breadcrumbs__link[data-breadcrumbs-more]` (aria-haspopup / expanded,
  keeps the library focus ring while open) + the standard dropdown `ul.e-permits-fo-intent-menu.e-permits-stack__menu`
  with the hidden levels as menu items (same handlers), anchored left under the item, ↑ ↓ Home End / Esc / Tab.
  Every level `--truncate` (30ch); a level that is really cut gets its full text as `data-tooltip-text`
  (js/icon-tooltip.js; `title` on pages without it) — measured after render, on resize and on hover / focus.
- **Phones** (≤ 760): `nav.breadcrumbs.breadcrumbs--mobile` › `li.breadcrumbs__item--back` › the parent level (the
  nearest link before the current one) with its label in `.e-permits-page-header__crumb-label` (one line, ellipsis +
  tooltip — the library `--truncate` turns the link into a block and drops the 20px chevron). No link in the trail →
  no phone nav, the trail shows at every width (builder service line).

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
  - `.breadcrumbs--trailing`: the last item keeps its chevron. Only the form builder lines and the notification-template
    back line use it — never a page header (RAP / Cabinet dropped it, breadcrumb-v2).
  - `.breadcrumbs--truncate`: levels are cut at 30ch with an ellipsis (back-office page
    header).
  - `.breadcrumbs--mobile` + `.breadcrumbs__item--back`: a 20px chevron-left-small and
    the previous level only.
- Leading icon: an `<svg class="icon">` inside the first link (16px).
- `button.breadcrumbs__link` is reset, for back handlers such as
  `data-rap-profile-back`.
- JS: `renderBreadcrumbs(crumbs, { trailing, truncate, label })` in `e-permits-shell.js` = `GEAPBreadcrumbs.html`
  (above); `renderPageHeaderTop` uses it with `truncate`. A crumb with `attr` is a link.
- **Profile trail = menu section › registry › record.** `renderPageHeaderTop`
  prepends the side-menu group (`navSectionOf()`: the group of the menu item named by
  the first crumb, else of the active item) as plain text. For example: Administrare ›
  Configurări servicii › 003000023, or Locul de muncă › Dosarele mele › D-2026-004575.
- Deleted forks — never bring back: `.e-permits-page-header__breadcrumbs` overrides,
  `.e-permits-builder__breadcrumbs`, and the `.rap-breadcrumbs` visuals (that class is
  now only a layout/reveal hook).
- Done 2026-10-21 (breadcrumb-v1): the overflow menu past 4 levels and the full-label tooltip on truncated levels
  (Figma `602:1933`).
- Deleted forks (2026-10-21) — never bring back: the BO top-bar `.e-permits-dosar-profil__shell-back` /
  `.e-permits-user-profile__shell-back` („← Înapoi la dosare / utilizatori / servicii / roluri / clasificatoare /
  șabloane”, eKYC `setBackLabel`), the form builder `p.e-permits-builder__crumbs` + `.e-permits-builder__back`, the
  passport template detail „← Șabloane de notificare” button, `.rap-breadcrumbs__label` and the per-page desktop /
  phone switch rules (bo-profile-parts.css, rap-evo.css).
- **Figma ↔ code differences (report, library untouched):** (1) phone back variant: Figma 232:5283 = 20 chevron + 0 gap +
  label; the library link keeps `gap: 4` → the label starts 4px later; (2) Figma „Breadcrumbs must remain on a single
  line and never wrap”; the library list is `flex-wrap: wrap` (narrow panels — the builder properties panel — wrap to 2
  lines); (3) Figma Disabled = grey-400 text at full opacity, the library `is-disabled` adds `opacity: .6`; (4) resolved 2026-10-21 (breadcrumb-v2, user: „breadcrumbs as we discussed”): the public headers (RAP list + act
  profile, every Cabinet profile) show the current level like the Figma component (its „👁️ Active Level” boolean is
  on by default) and the BO; the 2026-10-17 trailing-chevron exception is gone.

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
  `--small` / `--large`. App screens use it through ONE runtime, `js/icon-tooltip.js` (2026-10-21,
  „Tooltip — ONE runtime”); the private RAP / Cabinet / sidebar tooltips are gone.
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

### Copy value — one component (2026-10-20; whole-element wrap + compact variant 2026-10-21, copy-wrap-v1)

User (2026-10-20): „the copy code is different, let's use the same everywhere as a component”. User (2026-10-21): „The
hover should be on the entire element, and do a nice even grey wrap on hover, as we used in the first places” + „all
should have on hover a nice even „Copiază” tooltip, and on click a smooth transition to „Copiat” with a green check …
The only exceptions are tables or stacked lists where space is restricted: there, let's not use the copy icon, but
the behaviour is the same.” (Replaces the 2026-10-20 rule „lists show plain numbers”.)

ONE module: `js/copy-value.js` (`window.GEAPCopyValue`) + `css/copy-value.css`, loaded on the BO / FO page, the shell
page, EVO Cabinet and RAP. Before 2026-10-21 the value was plain text next to an icon-only Strict Small 32 button (the
hover covered the icon square only); now ONE native `<button>` holds value + icon, so the whole element is the hover /
click / focus target (the FO „first places” look: `.e-permits-fo-copy-value`, removed 2026-10-20).

```html
<!-- default: profiles, header meta, detail rows, identity cards, dialogs, side panels -->
<span class="copy-value">
  <button class="copy-value__button" type="button" data-copy-value="D-2026-004575"
          aria-label="Copiază numărul dosarului D-2026-004575" data-no-tooltip>
    <span class="copy-value__text">D-2026-004575</span>
    <svg class="icon small copy-value__icon" width="16" height="16" aria-hidden="true"><use href="…/sprite.svg#icon-copy"></use></svg>
  </button>
</span>

<!-- compact: tables, stacked rows, act / request row meta — no icon, same behaviour -->
<span class="copy-value copy-value--compact">
  <button class="copy-value__button" type="button" data-copy-value="GEAP-2026-009-04588"
          aria-label="Copiază numărul dosarului GEAP-2026-009-04588" data-no-tooltip>
    <span class="copy-value__text">GEAP-2026-009-04588</span>
  </button>
</span>
```

| Part / state | Spec |
|---|---|
| Wrapper `.copy-value` | `inline-flex`, `max-width: 100%`; carries the placement hook (`className`) that sets the host's value type |
| Button `__button` | native button, `font` / `color` / `letter-spacing` inherited (the value keeps the context's own type), gap 4 text → icon, radius 6 (`--border-radius-6`), padding 4 8 (`--spacing-4` / `--spacing-8`), **the same negative margin** → at rest the text sits exactly where plain text would (aligned with labels / other rows) and the row height does not grow; `position: relative; z-index: 1` so the wrap's 8 bleed stays the copy target over the next meta part |
| Phones (≤ 760) | the SAME visible wrap (4 8 — a taller one painted over the next text line) + an invisible `::after` hit area `max(0, (32 − line − 8) / 2)` above / below → a ≥ 32 tap target on any line (2 on a 20 line, 4 on a 16 line) |
| Text `__text` | selectable (`user-select: text`, the clipboard fallback selects it), inherits the host type (a host's `… span` rule never reaches it); breaks only when longer than its column (`overflow-wrap: break-word`) |
| Icon `__icon` | 16 (`icon small`), `currentColor`, centred on the first line: `margin-block: (1lh − 16) / 2` |
| Rest | no background; default = host colour; compact = host meta colour (e.g. 14/20 tertiary in act / request meta, 12/16 tertiary RAP IDNO) |
| Hover (`@media (hover: hover)`) | one even wrap `--color-background-base-tertiary-hover` around value (+ icon); text → `--color-text-base-default` (both variants, so a tertiary list number reads as a control). Background transition 100 ms standard |
| Pressed (`:active`) | `--color-background-base-tertiary-active`, text default — also the only wrap a touch user sees (no sticky hover) |
| Focus-visible | tertiary-hover wrap + the canonical ring `0 0 0 2px white, 0 0 0 5px --focus-ring`; the tooltip shows at once |
| Compact `--compact` | no icon; one line (`nowrap`, ellipsis when the column is narrower); a cut value names itself in the hint („Copiază <value>”, the truncated-text-tooltip rule) |
| Link `--link` | a value that is itself a link (classifier „Link la sursă”) cannot sit in a button: the link stays outside, the button wraps the icon only (padding 4 → a 24 square, same fills / ring), 4 after the link |
| Tooltip | ONE shared library plain tooltip (`.tooltip.tooltip--small.tooltip--plain` + `.copy-value__tooltip`, 12/16, padding 4 8, radius 4, `--gray-900`): **above** the element, centred on it (`translate: −50%`), 4 from the wrap, below when there is no room, clamped 8 from the screen edges by the widest label. „Copiază” after 600 ms of hover (at once while warm / on keyboard focus) |
| Copied | on click / Enter / Space (user 2026-10-21: „the transition is awful” → spec): „Copiază” slides 8 to the LEFT while fading out (opacity 112 ms, slide 225 ms); „✓ Copiat” fades in in place from 60 ms (150 ms); the box width animates from the measured „Copiază” width to the measured „✓ Copiat” width (61 → 71) around the same centre — all `--motion-easing-decelerate`, 225 ms (`--motion-duration-md` × 0.75); `overflow: hidden` on the content. „✓ Copiat” = 20 `icon-checkmark-small` in `--green-400` on the 12/16 line (−2 above / below, so the box stays 24), −4 on its left + gap 2 → even optical padding (ink 8.7 left / 8 right). Stays 1 500 ms, then fades out (library opacity transition). Polite live region „Copiat”. No toast |
| Reduced motion | `prefers-reduced-motion: reduce` → no slide, no width animation, no fade: an instant swap |
| Clipboard | `navigator.clipboard.writeText` → `execCommand("copy")` on a hidden textarea → the value is selected and the tooltip says „Apasă Ctrl+C / ⌘C pentru a copia” |
| Events | click handled on the document in the CAPTURE phase and stopped; Enter / Space keydown stopped in the capture phase too (the native click still copies) → a row / card / dialog that opens on click or Enter never reacts to the copy |

API: `GEAPCopyValue.html(value, { label, text, className, compact })` — `label` = the specific aria-label („Copiază
numărul dosarului …”, default „Copiază <value>”), `text` = display HTML when it differs from the copied value (a short
hash; a link → the link variant), `className` = a placement hook only, `compact` = the list variant. Wrappers that return
it: shell `renderCopyCode` = `renderProfileCopyCode` (+ `GEAPShellApi` / `GEAPUi`), FO `copyValueHtml` (`GEAPFormRender`),
`CabEvo.copyValueHtml(value, label, className)`, RAP `copyValue(value, label, options)`, `GEAPActView` default `copyHtml`.
Compact: shell `renderListCode(value, { meta, label, display })` (tables: `cell__primary` type; `meta: true` = the stacked
meta's type; `display` = shorter shown text, full value copied), `GEAPActRow.metaParts` slot 1 (`number` + `numberLabel`)
for every act / request row (FO intent, Ghișeu, Cabinet acts + requests), RAP table Nr. act / IDNO (masked IDNO stays plain).

**Where:** default — profiles (page-header meta, detail rows, info cards, identity / authorization cards, the FO avatar
menu), dialogs (dossier document modal, act modals, notă de plată), side panels (Form Builder Avansat, Process Designer).
Compact — BO Dosare / Sarcini / Dosare finalizate „Nr. dosar” + act de bază, Configurări servicii „Cod” (+ the code under
the name), Autorități IDNO, Șabloane de notificare Cod, Fluxuri Identificator, dossier Taxe și plăți / Avize / document
rows, passport Clasificatoare rows; eKYC Clienți ID, Cazuri cod, Chei cheie, Organizații IDNO, Certificate amprentă;
RAP Nr. act + IDNO; act / request row meta number. **Documented exception:** the IBAN in the passport „Taxe › Conturi
bancare” summary keeps the default variant (`listExempt`).

Hosts: a label + 4 + copy value on one line (RAP beneficiary „IDNO”, Cabinet act header „Nr.”, FO identity card „IDNO” = 8)
gets 4 more so the 8 wrap ends at the label instead of covering it. Hosts that clip: the act / request meta clips its leading 18 (`clip-path`) → `css/copy-value.css` opens that clip by
the wrap (8) when it holds a copy value (and by the ring on focus); table cells `td > .cell__primary` / `__case-cell >
span` ellipsis rules skip `.copy-value` (it cuts its own text). Known limit: in a table cell the 5 focus ring can lose
1–3 px at the cell's top edge (td `overflow: hidden`); the wrap itself is never cut.

**Do:** one call to the helper per value; give a specific `label`; compact in every list. **Don't:** a private copy
button / tooltip / toast; restyle the wrap per context (type comes from the host, never padding / fill); put a copy in a
heading or a modal header (numbers stay in the content); a copy icon in a list row.

QA: `tools/ui-qa/component-audit.mjs` rule 4 (spec `copy`): **copy-variant** = any legacy copy class / data hook or an
icon-only control labelled „Copiază…” outside `.copy-value`; **copy-in-list** = a DEFAULT `.copy-value` (with its icon)
inside `td`, `[role=row]`, `.e-permits-stack__item`, `.e-permits-fo-lib-item`, `.e-permits-fo-intent-act`, `.cab-card`,
act / request rows; **missing-copy** = a plain-text copy candidate (dossier / act / request / session numbers, 13-digit
IDNO / IDNP — `copy.candidates`) in a list view. compare-styles `tools/ui-qa/specs/copy-value-across-products.json`
(default: dos-01 ↔ rap-02 / sm-05 / ek-05; compact: dos-05 ↔ rap-01 / sm-01 / pp-01 = 0).

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
| Copy value | removed 2026-10-20 → the shared `.copy-value` („Copy value — one component”); `copyValueHtml` returns it | `is-copied` (1500 ms) | `data-copy-value` |
| Avatar menu | `e-permits-fo-avatar-menu__*` (~25 classes) | `is-open` `is-closing` `has-scroll` `is-scrolled` `is-selected` `is-expanded` | `data-fo-avatar-*` |
| Notices | `e-permits-fo-infobox`, `e-permits-fo-mnotify-info`, `e-permits-fo-notice--skeleton` | | |
| Skeletons | the ONE `.skeleton` (+ `--text / --input / --circle`), section „Skeleton — ONE loading placeholder” (was `e-permits-fo-skeleton`) | | |

### Long name in a header — expand on click (2026-10-19)

User (2026-10-19, FO request wizard on a post-process of an act with a 144-character service name): „for long
names in header let on click reveal entire name”. One shared behaviour, `js/name-expand.js` + `css/name-expand.css`
(FO page), the same vocabulary as the RAP act dialog subtitle („Mai mult” / „Mai puțin”, js/act-view.js).

**Where it applies** (2026-10-19: the FO header probed on fo / pp states at 1440 + 375, and a sweep of all 736 BO /
Ghișeu / eKYC demo states at 1440 for cut titles): only the FO top-bar service title
`.e-permits-fo-auth__service-title-row h1` is ever cut (post-processes of acts whose service name is long, e.g.
act-depozit-10, 144 characters). BO page headers (`.e-permits-page-header__title`),
the Ghișeu sheet header (`.e-permits-gh-sheet__title .modal--header-title`, already has `title`) never truncate with
the seed (longest BO service 52 characters); RAP / Cabinet profile headers wrap by design — left as they are. The FO
step lead (`.e-permits-fo-pp-lead`, „Reperfectare · nr · act name”) wraps — never cut.

**Contract**
- Host = any element with `data-name-expand` (the `h1` keeps its heading role; the button lives inside it). Set the
  text ONLY with `GEAPNameExpand.set(host, text)` — `textContent` would also read / wipe „Mai mult”. The same text
  again is a no-op (a re-render never folds a name the user opened).
- Collapsed: one line + ellipsis on desktop AND phones (the sticky phone header keeps its short-name height, 126).
  The affordance appears only when the text is really cut — measured with `__more` hidden, re-measured by a
  ResizeObserver on the host and after `document.fonts.ready`. Short names stay a plain `span` (no tab stop).
- Toggle: the WHOLE name is the button (`aria-expanded`); its accessible name = the full name (the label is
  `aria-hidden`). Click / Enter / Space toggle; Escape folds it when the focus is on it (or nowhere); the FO folds it
  on every step change (`setFrontOfficeStep` → `GEAPNameExpand.collapseAll()`).
- Look: label 14/20 medium `--color-text-brand-default` + 16 chevron (icon = label colour), 8 after the ellipsis;
  hover = label underline (no new colour); focus-visible = the FO / library ring. Expanded: `display: block`, the text
  wraps (`overflow-wrap: anywhere`), „Mai puțin ⌃” 8 after the last word.
- Desktop tooltip: while collapsed the plain tooltip shows the full name on hover (600 ms) and on keyboard focus
  (`data-tooltip-text`, js/icon-tooltip.js); it never shows while expanded and hides the moment the name expands
  (`GEAPIconTooltip.hide()`). Touch has no tooltip — the toggle is the way.
- FO header: the 72 bar grows while expanded (`:has(.is-name-expanded)` → height auto, 12 top / bottom; the logo
  stays centred); the title row keeps its 26 floor. Phones: the header grows and pushes the page down; the sticky
  phone progress now sits at `top: var(--fo-header-height)` (was a fixed 108, which also covered the draft line of
  every 126-high header — fixed in the same change).
  **2026-10-20:** on wizard screens the header is no longer sticky on phones (≤860) — the expanded name scrolls away
  with it; the step bar sticks at the top of the screen (section „FO phone chrome”).

**Measured** (pp-18 / 18a / 18c): 1440 — collapsed h1 859 wide (text 777 + 8 + label 74), bar 72; expanded h1 52 (2
lines), bar 107, header 153 → 188. 375 — collapsed text 261 + label 74 on one line, header 126 (= short name);
expanded 4 lines, header 196, progress right under it. Keyboard: 6th Tab stop after gov link, Ro / Ru / En, logo.

**Research** (Mobbin MCP not available in this session): NN/g on truncation (cut text needs a visible way to the
whole; an explicit word beats a bare ellipsis), Material 3 top app bar (one-line titles truncate), Material / app
store „more” expandable text, GOV.UK Details (expand in place, content pushed down, no overlay). A chevron alone
reads as a menu next to a page title — hence the word + chevron.

### FO phone chrome — only the step bar is sticky; MSupport steps aside (2026-10-20)

User (2026-10-20, phone screenshot of fo-03 „Detalii solicitare”): „Resolve the dropdown conflict on mobile; also on
scroll let's scroll also the name of the service and leave sticky in top only the steps.”

**Sticky chrome (≤860, the range where the step bar replaces the sidebar stepper)**
- Wizard screens with the step bar (request, guest — `body.is-fo-request-mode:has(.e-permits-fo-request:not([hidden]) >
  .e-permits-fo-mobile-progress)`): `.e-permits-fo-auth__header` is `position: relative` (z 10 kept, so the account sheet
  and its scrim still stack the same). The EVO top bar, the service name (+ the long-name expand) and the „Salvat ca
  schiță” line scroll away with the page.
- `.e-permits-fo-mobile-progress` is the only sticky part: `top: env(safe-area-inset-top, 0)`, full width, z 20; its 4px
  progress bar is the bottom line content scrolls under.
- `html` gets `scroll-padding-top: safe area + --fo-step-bar-height + 8` (the FO script sets `--fo-step-bar-height` from
  the visible bar, ResizeObserver) → focus moves, anchor jumps and `scrollIntoView` stop below the bar. Step changes
  scroll to 0 (header visible again).
- Intent / choice / access screens have no step bar and keep their sticky header. Desktop (> 860) unchanged: the header
  stays sticky. Ghișeu is desktop-only (its own `--fo-header-height: 0`).
- Measured at 375: before = header 126 (196 with an expanded long name, pp-18a) + bar 44 = 170 / 240 px fixed; after = 44.

**MSupport vs pickers / the keyboard**
- Any width: while a picker trigger is open — `:is([aria-haspopup], [role="combobox"], .js-date-picker-toggle)
  [aria-expanded="true"]` outside `.msup` (FO selects, cascade address, CAEM, subgenre, address search, phone code, date
  picker, act-row post-process menu / sheet, account menu; MSupport mounts only on the FO full flow) — `.msup` (launcher + greeting bubble) is
  `display: none`, so an open list is never under the widget (z 1200). Dialogs: css/modal-phone.css (same idea).
- Phones (≤760): also hidden while a text field / textarea / select / contenteditable has focus (keyboard up) — the
  bubble can never cover the field being filled; it comes back on blur.
- Phones: the first form interaction (focusin or click on a field / picker trigger; click because iOS does not focus a
  tapped button) dismisses the greeting bubble for good through the widget's own × (`[data-msup-bubble-close]`);
  `msupport/` is untouched.
- Any new picker must carry `aria-haspopup` (or `role="combobox"`) + `aria-expanded` on its trigger — that is what hides
  the widget.

**Research:** Intercom (`hide_default_launcher`, the Messenger hides the launcher while the keyboard is up on mobile web),
Zendesk Web Widget (launcher hidden on mobile while an input is focused), Drift — all keep chat launchers out of the way
of form pickers on phones; Material 3 / Apple HIG: one sticky app chrome element on scroll (the progress), the large title
scrolls away. Mobbin MCP not available in this session.

**Follow-up (recommended, not built):** on phones, FO select lists with > 5 options or opened in the lower third of the
screen should open as a bottom sheet (iOS / Android native pickers, Material „exposed dropdown” on compact widths, the
post-process action sheet). `renderFoSelectControl`, the cascade address and the CAEM combobox share the list code
(`positionFloatingSelectList`, keyboard handling, `data-fo-float`) — a sheet mode is a separate change.

### Address by cadastral code — US-54 (2026-10-13, refined 2026-10-13)

Extends the FO cascade address (`cascadeAddressHtml`, service 09 step 2 „Detalii solicitare”)
when the schema field has `"cadastral": { "visible": true, "required": false }`
(`data/acte-permisive.json`). No mode choice: the search takes a saved address **or** a
cadastral code (digits and dots), „Cod cadastral” takes a code, and the address fields stay on screen.

**Two inputs for one code (user decision 2026-10-13 — DEVIATION from AC-13, PO to confirm):**
AC-13 says „Cod cadastral” shows the chosen code „Doar citire”. The user made it the default,
**editable** input: the code can be typed in „Cod cadastral” **or** in the search. Proposed AC-13
wording for the PO: „«Cod cadastral» este un câmp de căutare editabil: introducerea unui cod și apăsarea
butonului de căutare (sau Enter) solicită adresa din SRRE ca în «Caută adresa»; cele două câmpuri
afișează același cod.” (AC-11/12/19/20/21
then read „sub câmpul în care a fost introdus codul”, not only „sub «Caută adresa»”.)

- **Label**: with „Cod cadastral” visible the search label + placeholder = „Caută adresa sau cod
  cadastral”; hidden (AC-04) = „Caută adresa” (+ the US-32 hint). The builder preview keeps the
  component label (`field.searchLabel`).
- **„Cod cadastral” = the library search input with its submit** (user feedback 2026-10-13: „the
  search should be integrated in the input as in the components; it must be clear when the request is
  sent”) — Figma `search-input-rectangular`, Button = True, the § Search input scoped exception:
  `div.search-input.{medium|large}.rectangular.e-permits-workplace__search.e-permits-list-search.e-permits-list-search--fill.e-permits-fo-cadastral-search[data-fo-search-size][data-fo-cadastral-box]`
  > `span.icon-search` + `input.input[data-fo-cadastral-input]` (placeholder „Ex.: 0100510.123”,
  maxlength 50, red star + `aria-required` when Obligatoriu) + `.btn-group` (always shown here):
  `span.spinner.spinner--extra-small.spinner--brand` (only with `.loading`, while SRRE answers),
  `button.btn-icon.clear[data-fo-cadastral-clear]` „Șterge codul cadastral” (with a value; js/search.js
  empties + focuses + fires `input` → AC-16), `button.btn.btn-primary.btn-search[data-fo-cadastral-submit]`
  aria-label „Caută adresa după codul cadastral” (`icon-arrow-left`, rotated by the library → arrow-right).
  Span-6, first in the grid; same FO frame as „Caută adresa” (1px border on the box) → measured equal to
  the selects in the column (desktop 488/368/40 r8, ≤720 16/343/48 r8). In that frame the action inset is
  4 + 1px border (`--search-input-action-inset`) and `--search-input-action-size` subtracts a 1px border →
  submit 28 (Medium) / 36 (Large), 6px from the outer edge, radius 4 — as the library. Text padding right
  = submit + inset + 12 (+ × 20 + 8 with a value). Hint `p[data-fo-cadastral-code-hint]` „Apăsați
  săgeata sau Enter pentru a căuta adresa în Registrul de Stat al Bunurilor Imobile.” Never readonly,
  never a skeleton, no green check.
- **Trigger = explicit only** (2026-10-13): the lookup runs on the submit or Enter (Enter → js/search.js
  clicks `.btn-search`) — never on a typing pause or blur. Submit disabled while the field is empty and
  while SRRE answers (no double submit; the `.loading` spinner replaces the ×). Not a code (letters,
  other characters) → „Codul nu este valid, corectați.” at once, SRRE not asked. Editing the code after
  a fill keeps the filled values (no auto re-run) and puts the hint back until the next submit; a
  submit always re-runs (same code too). Emptying the field (× or delete) cancels a running request
  and releases the fill (AC-16).
- **In „Caută adresa sau cod cadastral”** a typed code is also never sent by itself: the suggestions
  list opens with an explicit **first row** (same `.e-permits-fo-address-search__option`, `icon-search`)
  title „Caută codul cadastral «<code>»”, meta „în Registrul de Stat al Bunurilor Imobile”, active by
  default — click / Enter sends it and writes the code into „Cod cadastral”; the saved codes that start
  with the typed digits follow. Enter with the list closed sends too. Saved codes still show on focus
  (empty field). The search keeps its live-filter behaviour (no submit). Search hint: „Căutați o adresă
  salvată sau introduceți un cod cadastral și alegeți „Caută codul cadastral” din listă.”
- **Sync**: a code typed / chosen in one field is written into the other (search × class state
  included); the search's × or a non-code address text empties the code; a saved address chosen
  in the search drops the code (`root.foCadastralRelease`).
- **Messages follow the source**: `setStatus(kind, from)` writes the loading / success / invalid /
  unavailable message in the slot of the field the code was typed in (`search` | `code`), with
  `is-error` + `aria-invalid` on that field only; the other field shows its hint again.
`cascadeAddressHtml` is the **one render path** for the request form and the Form Designer preview.

- **„Caută adresa” = the product search input** (§ Search input, product markup), never a
  `.e-permits-fo-input` with a trailing icon:
  `div.search-input.{medium|large}.rectangular.e-permits-workplace__search.e-permits-list-search.e-permits-list-search--fill.e-permits-fo-cascade-address__search[data-fo-search-size]`
  > `span.icon-search` + `input.input` (combobox) + `.btn-group` (spinner + `button.btn-icon.clear`
  „Șterge adresa căutată”). Size follows the FO fields: Medium 40 on desktop, **Large 48 at ≤720px**
  (`foSearchSize()` swaps the class on the media query; the mobile rule sets 48 / 16px). × shows
  with a value (`has-value is-ready`, js/search.js; a value picked from the list sets them via
  `syncSearchValue`). Clicking × = AC-16: field emptied, focus back in it, SRRE parts released,
  message back to the hint (the saved-codes list reopens, as on focus). Error =
  `.search-input.is-error` (frame below).
  When focused it sits at z-index 6 so it never paints over the sticky FO header / mobile progress.
  **One renderer**: `addressSearchInputHtml({ id, placeholder, describedBy, addressesJson })` — used
  by `cascadeAddressHtml` (request form step 2, post-process forms, Form Designer preview) and
  `addressPatternHtml`; the static step-2 fallback in the HTML carries the same markup. Never fork it.
  **FO frame** (scoped `.e-permits-fo-field .search-input.e-permits-workplace__search`, main.css
  untouched): 1px `--color-border-base-default` border on the box itself (the library draws a 2px
  transparent border + inset line, which reads inset ~2px with a smaller radius next to the selects),
  radius 8; hover / focus / error = the `.e-permits-fo-input` treatment (inset 1px tertiary / brand +
  blue-sky-200 halo / danger + red-100 halo). Measured: same x / width / height / radius as the
  select and input in the column (40 desktop, 48 at ≤720).
- **One message slot** under the field: `p[data-fo-cadastral-search-hint]` (id = the input's
  `aria-describedby`). Default = `.e-permits-fo-field__hint` with the AC-06 text (code on) or the
  US-32 text; a lookup swaps its class to `message message--inline e-permits-fo-field__error` + tone:
  loading = `e-permits-fo-field__loading` + library `spinner spinner--small spinner--brand` (AC-11) ·
  success = `message--success e-permits-fo-field__success` + `icon-circle-checkmark-filled` (AC-12) ·
  invalid = `message--error` + `icon-circle-error-filled` + `.search-input.is-error` + `aria-invalid`
  (AC-19) · unavailable = `message--warning e-permits-fo-field__warning` + `icon-warning-filled`
  (AC-20). A sibling `p.u-visually-hidden[aria-live=polite][data-fo-cadastral-live]` announces the
  outcome once (success / invalid / unavailable — not the loader). Reuse for any FO field lookup.
- **No AC-14 note** (removed on user request 2026-10-13 — the grey/green read-only fields + the
  success message already say it; **deviates from AC-14 wording, PO to confirm**).
- **Skeleton while SRRE answers**: every part SRRE will fill and the user can see (Țară, Raion, Oraș, Sector when shown, Stradă, Cod poștal, Casă, Bloc, Apartament) gets
  `.is-srre-loading` + an appended `span.skeleton.skeleton--input[data-fo-srre-skeleton]` (the ONE skeleton, 2026-10-21);
  CSS hides the field's other children (label stays). Height = the input (40, 48 at ≤720) → no layout
  shift; grid `aria-busy`. Min 400 ms (`SRRE_SKELETON_MIN_MS`). Reduced motion = no shimmer, a static
  `--color-background-base-tertiary` bar (all skeletons, css/skeleton.css). Scară, Etaj, Telefon, Email untouched.
- **SRRE-filled parts = the FO Read Only field**, never a lock: `.e-permits-fo-input.is-filled.is-readonly`
  + green `icon-checkmark-small`. Selects (Țară, Raion, Oraș, Sector, Stradă) are hidden and a
  `[data-fo-srre-value]` read-only input box is inserted (Țară = 🇲🇩 „Republica Moldova”); text parts
  become `readonly`, `tabindex=-1`, empty ones show „—”. On arrival each box gets `.is-srre-new` once:
  800 ms `--color-background-brand-secondary` → Read Only grey, `animation-fill-mode: backwards`.
  Focus stays in the field the code was typed in (search or „Cod cadastral”).
- **Saved-codes list**: the FO address-search list (`.e-permits-fo-address-search__list` options,
  icon `icon-home-line`, title = code, meta = saved address); empty = `li.e-permits-fo-caem__empty`
  „Nu aveți coduri cadastrale salvate.”
- **Builder parts** (`field.parts`, keyed `country/district/locality/street/house/floor/block/stair/apartment`):
  `visible: false` → the field gets `hidden data-fo-part-hidden` (CSS `display:none`), `required` →
  red star. The sector stays conditional (Chișinău). `field.searchLabel` (+ `field.required` star)
  replaces the „Caută adresa” label — used by the preview for the component label.
- **Form Builder** (2026-10-13): the Adresă component's canvas card AND Preview render through
  `cascadeAddressHtml` (via `toFo` → `GEAPFormRender.fieldHtml`) from its `addressConfig` (Vizibil,
  Obligatoriu — both check options, „Cod cadastral” row) + the service districts; the Preview binds the
  same lookup (skeleton, messages, ×). Every change re-renders, so the Preview is live.
- Behaviour (both inputs): lookup only on request — „Cod cadastral” submit / Enter, the search list's
  „Caută codul cadastral” row / Enter, or a saved code chosen in the list; mock MConnect =
  `data/srre-cadastral.json`, 1.4 s (Lent 3 s). Change → skeleton → refill; clear / non-code text →
  release (empty + editable, cascade reset). Review step adds a „Cod cadastral” row.
- **Test config** (`foAddressDemo`): URL `?codcadastral=vizibil|ascuns|obligatoriu`,
  `?srre=lent|indisponibil|invalid|asteptare` (asteptare = never answers, skeleton screenshot),
  `?coduri=fara`, `?solicitant=<subject id>`; live in „Configurare flux” (`.e-permits-fo-testcfg`):
  three segmented groups `adrField` (default = the service schema's `cadastral` config), `adrSrre`
  (Normal · Lent · Eroare · Invalid), `adrSaved` — SRRE / saved codes are read live; `adrField` redraws
  only the address block of step 2 and refills it with the address the user had (other step-2 answers
  untouched). The panel body scrolls (max-height = viewport − 96).
- **„Configurare flux” never restarts the flow (user, 2026-10-15).** Every option goes through one router
  in the panel (`apply(key)`): read the position (screen + wizard step), patch only `auth`, `intent`,
  `defaultSubjectId` on the live schema (steps are not redrawn), then put the user back:
  - step mapping: the same step if the configuration still has it, else the last step before it, else
    the first (`wizardStepFor`); steps are identified by their index, so id = index here;
  - Stare utilizator Autentificat ⇄ Neautentificat with Autentificare Opțională: same step, MPass user ⇄
    guest. Header avatar / switcher ⇄ none; step 1 = the MPass „Date solicitant” ⇄ the guest form
    (empty guest fields get the fo-g demo person; a PJ guest gets the company the user was signed in
    as); steps 3 / 5 / 7 redrawn as the guest variant through `rerenderFoStepsKeeping` — uploads move
    over (same DOM nodes), MDocs documents are set aside for the guest and come back on sign-in, radios /
    checkboxes / text kept by name+value or id; the MPass draft (header „Salvat ca schiță”) is hidden for
    the guest and restored after;
  - no wizard for this user (MPass Necesară + Neautentificat, or no eligible identity): the gate / the
    picker, with the step PARKED — the next change that allows the wizard resumes it with the data;
  - eligibility: the identity stays if still eligible, else the previous / default eligible one (step 1
    reloads, same step); intent / acts: only the „Ce vrei să soliciți?” screen reacts;
  - the panel mirrors the page (a guest via #guest = Neautentificat + Opțională), so other options
    never sign anyone in or out. No option reloads the page, none needs „Repornește fluxul” today.
  States `fo-cfg-auth` (step 3 → guest), `-a` (and back), `-gate` (MPass required → gate, parked),
  `-1` (the guest's step 1), `-5` (Livrare).
- States `adr-01…adr-17`: 03b code typed in the search → list with the „Caută codul cadastral «…»”
  row (nothing sent) · 03 sent from that row, pending (search spinner + skeletons) · 03a skeleton over
  a previous fill · 04 success (synced into „Cod cadastral”) · 06 cleared by typing · 06a cleared with
  × · 07 invalid · 08 unavailable · 09 Cod cadastral hidden (label „Caută adresa”) · 09a required ·
  11 config panel · 12 / 12a builder → preview (Cod cadastral hidden / required) · „Cod cadastral”:
  13a typed, not sent (submit enabled; adr-02 = empty, submit disabled) · 13 submitted, pending
  (inline spinner, submit disabled, skeletons) · 14 filled · 14b edited after a fill, not sent (values
  kept, hint back) · 14a changed code submitted (skeleton over the fill) · 15 invalid · 15a not a code
  (letters, SRRE not asked) · 16 unavailable · 17 cleared with its ×.

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

**Tab strip hugs its tabs (2026-10-16, user):** `.tab-buttons` is `width: max-content` (the library
`fit-content`), never `width: 100%`; the full-width track line is drawn by the `.tabs` wrapper
(`.e-permits-page-header__tabs`, a 1px `--color-border-base-default` content-box background, so a
wrapper with inline padding — the template sheet, 24 — keeps the line inset). Measured: Șabloane de
notificare strip 1184 → 358 (4 tabs), Utilizatori 1184 → 681, passport unchanged (it overflows).
Figma (2026-10-16): the strip frame is HUG with no stroke; the container draws the line as a „Track
line” child (absolute, index 0 under the tabs, STRETCH, 1px top stroke border/base/default) — never a
frame stroke, which Figma paints above the children (it cut the active underline). `Profile / Tabs`
10132:2285, `Notification template / Header` 10008:1624 (inset 24), ntpl „Service Tabs”; tool
`tools/figma/tab-strip-hug.js`.

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
/* undo (2026-10-13, Form Builder delete): a button in the link slot, closes the toast */
GEAPToast.show({ type: "info", message: "Câmpul „X” a fost șters.", action: { label: "Anulează", onClick }, duration: 8000 });
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
  `__meta`) with a library checkbox in the icon slot; empty = the shared empty state (`noResults`).
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
`__table`, `__sort` (`is-asc` / `is-desc`), `__copy-code` (removed 2026-10-20 → `.copy-value`; tables: the compact `.copy-value--compact.cell__primary`, 2026-10-21), `__tag` + tone,
`__flag`, `__person`, `__pagination-item` (`is-active`), `__pagination-action`, `__rows-select`.
Contracts: `data-workplace-*` (`row`, `sort`, `page`, `page-size`, `select-row`, `select-all`, `rows`, `head`, `range`, `tabs`, `total`).

**Status tabs — separators (measured 2026-10-19, same on every BO / eKYC registry):** the strip is 40
high, full width, `border-bottom: 1px --color-border-base-default`; its TOP separator is the line of
whatever sits above it — the toolbar's bottom line (inset shadow) or, with „Filtrare avansată” open,
the filter bar's `border-bottom`. Tabs 40 · 0 12 · 14/20 secondary, active = 2px brand bottom + 500
brand. Counter `.e-permits-workplace__status-count` = the Figma numbered-badge Large: **20 high**,
min-width 20, padding 0 4, radius full, 12/16 medium, `base-tertiary` (crit / warn = yellow-300) —
the library equivalent is `.tabs--sm .tab-button .badge` (20 · 12/16), not the 24px `.tabs .badge`.
Group dividers `.e-permits-workplace__status-divider` (1 × 28) only where a view defines them (BO
Dosare: after „Prioritate critică” and before „Toate”); eKYC views have no groups. Profile tabs
(`.e-permits-page-header` `.tab-buttons`, dossier / eKYC session / review) have only the bottom
track line (no top line in the BO either); counters `.e-permits-page-header__tab-count`, also 20.

Note it styles bare `<th>` / `<td>` — there are no cell classes.

### `e-permits-builder__*` — Form Builder (rebuilt 2026-10-13, batches 0–3)

Spec `tools/persona-test/specs/svc/form-builder.md`. Markup shell in `e-permits-acte-permisive.html`
(`#form-builder-modal`), logic `js/form-builder.js`, CSS `css/form-builder.css` (on top of the older
`e-permits-builder__*` rules in `e-permits-acte-permisive.css`). Opens full page on `?flow=builder`, as a
sheet from Pașaport › Formulare (`is-sheet`), view-only for Previzualizează (`is-view-only`).

**Model** (sandbox DB `geap.formBuilderSandboxDb.v2`, seed `data/form-builder-db.json`, schema v2):
`form` (technical, code, service, title/description RO·RU·EN, access, requestTypes, version, status,
settings) → `steps[]` (service steps edit; `locked` platform steps: Date solicitant, Documente, Verificare
și semnare, Plată, Finalizare) → `sections[]` (title/description i18n, showTitle, showSeparator) →
`fields[]` (`id`, `type`, `key`, `label`/`help`/`placeholder` i18n, `span` 3·4·6·8·12, `required`,
`readOnly`, `defaultValue`, `validation`, per-type props, `dataSource` for lists, `addressConfig`,
`published` = key locked). Corrupt / old DB → fresh form, never a crash (US-08).

**Registry** `COMPONENTS[type]` = label, icon (sprite id), category, palette line, default span, tabs,
defaults; `soon: N` = listed in the palette as „În curând” (disabled, reason tooltip „În lucru — etapa N”)
— never a faked component. Built: Text, Text multilinie, Număr, Sumă, Email, Telefon, Dată, Listă
derulantă, Butoane radio, Casetă de bifare, Listă de bifare, Adresă, Secțiune, Text informativ (+ the
configured preset „Adresa obiectului”); batches 2, 3 and 4 below. Still „În curând”: Câmp calculat, Dată și
oră (5), Arbore.

**One renderer.** `toFo(field, { prefix, inCard, lang })` projects a builder field onto the FO schema
shape; the canvas card body, the Preview and the request form all call
`window.GEAPFormRender.fieldHtml` (= `stepFieldHtml`). Card body = `.e-permits-builder__field-render[inert]`
(span 12 inside the card; ids `cv-…` vs Preview `pv-…`). The old `previewFieldControl` (label
guessing, `type="date"`) is deleted. Preview binds with `GEAPFormRender.bind(root)`.

**Canvas.** Grey stage; step chips (`__step-chip`, `is-active` = on canvas, `is-selected` = panel; lock
icon on platform steps; red dot = errors inside); section card `__step-section` > `__section-bar`
(grip + `button.__section-select` heading + ⋮ `renderStackMenu`) + `__grid` (12 columns; cards span by
`[data-span]` attribute — no inline styles; one column ≤720px). Field card `article.__field[tabindex=0]`
(`draggable` is ARMED only by a pointerdown on its tools row — see „Drag sessions”): tools (grip, type tag `__tag--strong` with `title`, span tag, ⋮ Duplică / Mută mai sus /
mai jos / Mută în „…” / Șterge) · rendered field · foot (`__field-key` 12/16 tertiary + first issue as
`__tag--warning`). Empty section = `GEAPEmptyState.render({ compact, bare })`. „Adaugă câmp” =
`__dropzone` as a stack-menu trigger → `__add-menu` of the usable components. „Adaugă secțiune” =
`btn btn-secondary btn-sm`.

**Interactions.** Click a palette item = add at the end of the active section (keeps focus in the
palette); drag a palette item / a card (HTML5 DnD) → `__drop-indicator` (4px brand line, vertical
between cards, horizontal for a new row; never at the card's own position; outside a section =
`dropEffect: none`); drop focuses the new field's label (US-05 / 85698). Resize = drag the card's right
edge (snaps 3·4·6·8·12).

**Drag sessions (2026-10-14, user: „when I select an element the hover breaks”).** A click with a few px of
movement on a `draggable` element starts a NATIVE drag: the click is swallowed and on a real Mac the OS drag
loop eats the mouseup, leaving Chrome's hover frozen until the next click (CDP input cannot reproduce it).
Rules: a card is not `draggable` in the markup — a pointerdown on its tools row (grip + tags, `cursor: grab`,
never on its ⋮) arms it, any other pointerdown disarms it, so selecting a card never starts a drag. Chips
and palette items are their own handle; a „drag” shorter than 10px that changed nothing runs as the click it
was (`tinyDragAsClick`). The drag ends from every path — `dragend` on the source itself (fires even when a
drop has re-rendered and detached it; the canvas listener never saw it), `drop` anywhere (document,
capture), a trusted pointermove with no button held, Escape, window blur — and `endDrag` clears
`is-dragging-component`, every `.is-dragging` / `.is-drop-active`, the indicator and armed cards. The
delayed `.is-dragging` class is only added if that drag is still the current one. Pointer-capture resizes
(card width, panel edges) stop once on pointerup / pointercancel / `lostpointercapture` / window blur and
release the capture. Keyboard on a focused card (WCAG 2.5.7): Alt+↑/↓ move (crosses sections),
Alt+←/→ width, Ctrl/Cmd+D duplicate, Delete delete, Enter select; Alt+↑/↓ on a section header moves the
section; Esc = deselect (never closes the editor); Ctrl/Cmd+Z / Shift+Z undo / redo (outside text
inputs). A polite live region `[data-fb-live]` announces moves („… mutat pe poziția 3 din 7 în …”).
Delete = no modal, toast „Câmpul «X» a fost șters.” + „Anulează” (8 s; stays on demo links). Section
delete = `askConfirm` red (US-43 text); the last section / last service step are refused with a toast.

**Properties panel** (by selection): nothing → „Date generale formular” (Identificare read-only + Titlu
/ Descriere i18n, Utilizare: request-type tags + Vizibilitate și acces, Versiune facts, Limbi n/total,
Pași list, Setări completare toggles, Statistici); step → „Pas · titlu” (titlu/descriere, „Afișat la
tipurile de solicitare” check options, Secțiuni list + Adaugă, ⋮ Șterge pasul; platform steps read-only
with a note); section → „Secțiune · titlu” (tabs General · Logică); field → crumbs `Pas › Secțiune ›
tip`, title = label, key tag, ⋮, library small tabs **General · Date · Validare · Logică · Avansat**
(per component; a tab with an error shows the red tab dot `.e-permits-ntpl-dot.e-permits-tariff__tab-error`).
Every group = the drawer section (`.e-permits-user-create__section` + `__section-title` + `__section-content`,
grid gap 24 `__panel-grid`); every control = full-flow (`.e-permits-fo-field` + input / textarea /
`renderFoSelectControl` / the date picker), modes = `.segmented-control`, „Doar citire” = `renderToggle`,
**„Obligatoriu” = `renderCheckOption({ required: true })`** (fields and address parts — no switch, no
chip). Language segmented **RO · RU · EN** (`__lang`, warning dot = missing translation, the ntpl
pattern) switches every translatable input; non-RO shows „Fără traducere, solicitantul vede textul în
română.” Read-only facts = `dl.__facts` (label left, value right, last row without divider). Option
editor `__options` (`__option-row`: index · input · delete, or „Activă” for classifier static values —
never deleted). Address parts `__parts` > `__part` (title + kind tag + chevron toggle, check options
Vizibil + Obligatoriu*, details: source note, „Se filtrează după …”, default value). Classifier
reference `__ref` + registry modal `#builder-classifier-registry` (Romanian; filter = library segmented
control; physical table = neutral tag, never monospace). The panel re-renders on every change and
restores focus + caret + scroll.

**Validation summary.** `validate()` → issues `{ level, kind, id, tab, prop, message, short }`: missing RO
label / text, key empty / invalid / duplicate, unconfigured list source (card tag „Sursă neconfigurată”),
static list without active values, < 2 options, invalid regex, min > max, empty date interval, step /
section without title; warnings = one per language with missing translations. Topbar `__errors`
(red „N erori” / green `is-clean` „Fără erori”, focus ring while open) opens `__issues-menu` (stack menu;
groups „N erori blochează publicarea” · „Avertismente”; a row selects the object, opens its tab and
focuses the property). „Publică” is `aria-disabled` + reason while errors > 0.

**Small screens** (≤960): one scrolling column (canvas, properties, palette); ≤720 icon-only mode
buttons (labels visually hidden). The Preview at 375 is the real mobile request form.

**Batch 2 (2026-10-13).** Components Selecție multiplă (data source as the list), Comutator
segmentat (2–5 options), Perioadă (two date pickers, „Până la ≥ De la”, durată maximă), Notă cu titlu
(callout info / warning), Separator. **Logică** on fields, notes and sections: rules `{ action:
show|hide|require|optional, join: and|or, conditions: [{ field, op, value }] }`, operators by family
(text: = ≠ conține gol completat · număr/dată: = ≠ < ≤ > ≥ gol completat · alegere: = ≠ în listă · multi:
în listă · casetă: bifat / nebifat); notes and sections only Afișează / Ascunde; „Ascunde” shows the US-42
warning; „Folosit în” lists the readers; incomplete rule, deleted source and **circular dependency**
(„Nu se poate salva: există o dependență circulară între câmpuri.”) are errors; deleting a field that
rules read asks first (red). Cards show „N reguli”. **Preview** runs the rules live (restrictive wins:
Ascunde > Afișează, Obligatoriu > Opțional; a hidden field is emptied; the star follows the rule) and
has a toolbar `__preview-bar`: Limba formularului RO · RU · EN (fallback RO), Ecran Desktop · Mobil, „Completează
cu date de test”, „Golește”. **Mobil** = the same page in an iframe (`width="375"`, `?flow=builder&fbframe=1`,
class `is-frame` / `html.is-fb-frame`) that only shows the Preview and redraws on `postMessage({ type:
"fb-preview", form, stepId, lang })` after every change — the FO media queries apply, so it is the real
phone form. Service steps move with ⋮ Mută la stânga / dreapta or Alt+←/→ on the chip (platform steps
stay).

States `fb-01…fb-27` (see `js/demo-states.js`; QA scope `#form-builder-modal`).

**Batch 3 (2026-10-13) — registre și context.** All nine render through `stepFieldHtml`; the registry
lists no „În curând” for them any more.
- **IDNP** — Date › „De unde vine IDNP-ul”: *Solicitantul — din MPass* (`readonlyFieldHtml` with id, hint
  „Preluat din MPass.”, green check) · *Introdus de solicitant* (`codeInputHtml`: digits only + `n/13`
  counter, format check only — **never a name lookup from a typed IDNP**, the guest privacy rule) ·
  *Introdus și verificat în RSP* (US-48: `.e-permits-fo-field-group` = the post-process declaration
  `label.checkbox.e-permits-fo-consent.e-permits-fo-pp-consent[data-fo-lookup-consent]`, the IDNP
  disabled until it is ticked, then Nume + Prenume read-only targets; whole row). Validare: 13 digits +
  message.
- **IDNO** — always the pair IDNO (4) + „Denumirea companiei” (8, label editable): *Compania
  solicitantului — din MPass* (both read-only) or *Introdus și căutat în Registrul de Stat* (the guest
  lookup, now the shared `createRegistryLookup`: loading hint + skeleton → filled read-only + flash, or
  „Nu am găsit o companie cu acest IDNO în Registrul de Stat.”).
- **Persoana de contact** — `contactPersonHtml({ prefix, parts, label })`: radio option rows „Eu” /
  „Altă persoană” (default in General), visible legend = the label; Date = parts Nume și prenume ·
  Telefon · Email with Vizibil + Obligatoriu* (address-parts markup without details). „Eu” shows the
  applicant's phone / email read-only (MPass / MNotify). The FO step (no `prefix`) is unchanged.
- **Subdiviziune** — Date: the classifier (`kind: "subdivisions"`, e.g. Subdiviziuni ANSA) + Mod:
  *Derivată din adresă* (pick the Adresă field; raion → subdivision mapping built from the classifier
  names; `fo:raion-changed`, the applicant may change it) · *Aleasă de solicitant* (`data-fo-subdivision-mode="select"`,
  no suggestion) · *Automat — o singură subdiviziune* (read-only value, US-48 „Autoselect”). Errors:
  no classifier, no address field, no automatic value.
- **Fișier** — the boxed doc field (guest procură): dashed block + black `btn btn-strict btn-md` „Adaugă
  fișier” with `icon-upload`; description = help + „PDF, JPG, PNG · maximum 10 MB[ · până la N fișiere]”;
  optional = the bordered Small tag (`status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag e-permits-fo-optional-tag`). Validare: types (check options), max size 1–60 MB, count 1–10.
  The picker opens on the upload tab only, with the field's accept list and captions.
- **Document din MDocs** — the Acte necesare doc field (`postprocessDocFieldHtml`) → the picker with
  „Caută în librărie” (MDocs) + „Încarcă fișier”; Date › „Tipul documentului în MDocs” fills the
  description.
- **Câmp ascuns** — never drawn for the applicant (`<input type="hidden" data-fo-hidden>`); the Build
  card shows the dashed `__hidden-marker`. Date › Sursa valorii: Valoare fixă (required) · Din
  precompletare (tip solicitare, tip solicitant, IDNP / IDNO solicitant, canal, cod serviciu) · Din
  regulă → Logică offers only „Setează valoarea” (+ „Valoarea setată” input; the last rule that holds
  wins). General = „Denumire internă” + key; no Aspect.
- **Consimțământ** — the FO consent checkbox; „Textul declarației” + „Textul linkului” (must occur in the
  text) + „Adresa textului legal” (https, new tab); Obligatoriu checked and disabled with the reason
  „Un consimțământ este întotdeauna obligatoriu.”.
- **Componente salvate** — ⋮ (card or panel) › „Salvează ca componentă” → `#fb-preset-modal`
  (Denumire*, unique; Descriere; Cine o poate folosi). The configuration is saved (key and rules are
  not); the field stays linked (`field.preset = { id, version }`, card foot tag „Salvată”). Palette group
  „Componente salvate” (system „Adresa obiectului” + saved, `vN` tag); click / drag inserts a linked copy.
  Panel group „Componentă salvată”: Sursa · Versiune · Stare + **Actualizează din sursă** (source newer;
  keeps id, key, label, rules) · **Salvează în sursă** (copy changed; version + 1; asks first when other
  copies use it; not for system presets) · **Detașează**.
- **Avansat** (every input): Identificare (key + internal id as `.e-permits-fo-copy-value`, column, SQL
  type) · Integrare (Cheie API / integrare, default `<form>.<key>`; Mapare în Back Office; Descriere
  tehnică) · Editabil la tipurile de solicitare (check options per request type) · Afișat în (Verificare,
  formular de tipar, RAP) · Date personale (+ Păstrare) · Proprietăți FOD (Clearable, Immediate — text
  family) · Jurnal (added, last change, changes in session; MLog note).
- **Reguli de dată** (Dată › Validare, US-41): rule cards „Această dată” + comparison (înainte de / cel
  târziu la / după / cel mai devreme la) + Data curentă or another Dată + `± N | zile ▾` (value group with
  a trailing unit); „Se citește: …” line; the other date lists the rule as **Reciprocă** (a row that opens
  the owner); storing both directions = cycle error. Preview checks them on „Validează”.
- **Logică „Alt câmp”**: text / number / date / choice conditions get the „Valoare / Alt câmp” mode in the
  value group (as Servicii › Documente); the other field's answer is compared live; it counts for „Folosit
  în” and the cycle check.
- **Preview „Validează”** (`btn btn-secondary btn-sm`, first in the bar): the „Înainte” checks in runtime
  order — Obligatoriu („Câmp obligatoriu” / „Alege o opțiune.” / „Bifează pentru a continua.” /
  „Atașează documentul.”) → format → limits → date rules; FO field error (hint hidden), selects /
  textareas `is-error`, checkboxes `checkbox--error`, doc fields in the description; focus + scroll to
  the first error, an edit clears it; no error → toast „Pasul trece verificarea: nicio eroare.”.

States `fb-30…fb-43` (palette, IDNP 31–31d, IDNO 32–32c, contact 33–33a, subdivision 34–34b, file 35–35d,
MDocs 36–36a, hidden 37–37b, consent 38–38b, saved 39–39b, Avansat 40–40a, date rules 41–41c, Alt câmp 42,
Validează 43–43a).

**Batch 4 (2026-10-13) — 1:N: Grilă editabilă, Bloc repetabil, Activități CAEM.** One model, one
renderer: a grid holds `columns`, a block holds `fields` (field objects; same panel tabs, same FO renderer
per cell / card); rules point at children by id (`rowRules.keyColumn` / `groupColumn`, cascade
`dataSource.parentFieldId`). Seed form `?formular=form-sanitary-09` (CAEM block, equipment grid with a nested
grid, work points with Raion → Localitate).
- **Builder.** Container card = tools + the **band** (chips of columns / fields; click = the child's panel,
  drag = reorder, palette types dropped on the band = new children, Alt + ← / → (grid) or ↑ / ↓ (block) and
  Delete on a chip, „+ Coloană / + Câmp” = typed menu: Coloane simple · Coloane complexe (locked with a reason
  until one simple column exists — US-34 AC-06; Grilă imbricată locked at level 3 — US-38) · Copie a unui
  câmp din formular) + the inert FO render (empty container = `GEAPEmptyState`). Child panel = the field
  panel (crumbs to the column, back link `btn btn-text-primary btn-sm` to its grid / block), tabs without
  Logică for grid columns (US-42 AC-36), Avansat = table / column / SQL type. Grid column Aspect =
  „Lățime coloană” = the „Lățime” bar row on 4 parts (Îngustă 2 · Medie 3 · Lată 4; `auto` renders as Medie
  „(implicită)” — fo-grid weighs auto = 3). Container tabs: General (label, help, texts: row name /
  item title, add label, empty text / permanent note, „Ascunde eticheta”), Date (ordered list
  `__step-list` + „Adaugă coloană ▾”), Validare (min / max / at start / rows per page, add / delete allowed,
  key, group, messages RO·RU·EN), Logică (the container as target; as a source = its number of rows),
  Avansat (+ „Stocare 1:N”: `GEAP_Cases_{serviciu}_{Cheie}`, CaseId / ParentRowId, SortOrder). Delete of a
  child = toast with „Anulează”. Validation summary: no columns / fields, complex without simple, depth > 3,
  min > max, start > max, key / group / parent gone, group not a classifier list, missing texts, and every
  child checked like a field (reported „Grilă › Coloană”, kind `child`).
- **Editable grid (FO).** Library `.table.table--subtle`, scoped geometry (head 38, 12/16 medium on
  secondary; cells 14/20, 8/12 inset, lines only, no zebra, last row no divider). Widths without inline
  styles = `colspan` units (Îngustă 2, Auto / Medie 3, Lată 4, nested grid 4); `layout()` (ResizeObserver)
  sets `is-cards` below 600 px or when units × 40 + 152 do not fit — never a sideways-scrolling table.
  Row = view (`button.__value`, click = edit that cell) or edit (FO fields, labels visually hidden in the
  table, visible on cards); Enter saves, Esc cancels (an open list / calendar closes first; inside the
  builder its Esc handler forwards to `GEAPFoRepeat.escape`); delete = the FO confirm dialog, destructive.
  Per-cell FO errors (`setFieldError` for inputs, `is-error` + inline message for lists / multi-select /
  checkbox); duplicates on the key column; group rule disables other-group options (`aria-disabled`, the
  fo-select ignores them) + permanent note; cascade from a column of the row or a form field (child empty
  and disabled until the parent, reset on change); pagination (library, other pages kept hidden); nested
  grid in a `__detail` row („N rânduri ▾”); source down (`?sursa=indisponibila`) = notice + Reîncearcă +
  Introdu manual, rows locked; `?sursa=asteptare` = skeleton. Variants: default · hover (row tertiary,
  value pill tertiary-hover) · active (editing row) · focus (value ring, FO field focus) · disabled (add at
  the maximum: `.e-permits-fo-add-activity[aria-disabled]` grey + reason) · error (cell) · success (row
  saved → view + live message). **Library gap:** the library has no editable table (FodTable is
  read-only, US-35) — this is built from `.table` + FO fields and should go to the library.
- **Repeatable block (FO).** The FO activity card per element and the FO add button (the CAEM preset
  renders byte-identical markup to step 2 — the pair markup was extracted into `caemFieldHtml` /
  `subgenHtml` with the old texts as defaults). Remove = immediate + toast „Ai eliminat „Activitate #2”.”
  with „Anulează” (the node itself comes back); key = values taken elsewhere disabled; group = first value
  fixes the group (CAEM section), others disabled + note; a code without sub-options shows its hint
  (US-40 AC-04); min (first card has no ×) / max (button disabled + limit line); rules between the fields
  of one card (Logică on a block field: Afișează / Ascunde, read per card in the Preview).
- **Hover pass (same day, user: „hover doesn't work”):** topbar version / mode switch / step chips
  (tertiary-hover, selected inverse-default-hover), field cards (border + `--shadow-200`, the selected one
  keeps its ring), read-only panel inputs, the selected segment (`.segment-item.is-selected:hover`), FO
  current step row, calendar icon button, phone prefix, checkbox rows, rule-builder value selects. Audited
  with `tools/ui-qa/hover-audit.mjs`.

States `fb-50…fb-63` (palette 50–50a, new grid 51–51a, columns 52–52b, rules 53–53a, nested 54–54a, FO grid
55–55b, errors 56–56b, phone 57, CAEM 58–58b, block 59–59d, block validation 60, source down 61–61a, schema 62,
summary 63).

#### Form Builder › Lățime (2026-10-14 — user: „a line with real columns, not the 3 · 4 · 6 · 8 · 12 segmented”)

Restores the old builder's width picker (31a333b3) on the 12-column grid. One helper `widthPicker({ prop,
value, options: [[value, cols, label, aria]], total, label, caption, disabled, reason })`; `spanPicker(field)`
(fields and block fields, `prop: "span"`, 3 · 4 · 6 · 8 · 12 → options covering 3 · 1 · 2 · 2 · 4 bars) and
`columnPicker(field)` (grid columns, `prop: "width"`, 4 bars = parts: Îngustă 2 · Medie 3 · Lată 4).

```html
<div class="e-permits-fo-field">
  <span class="e-permits-builder__width-label" aria-hidden="true">Lățime</span>
  <div class="e-permits-builder__width">
    <div class="e-permits-builder__width-picker" role="radiogroup" aria-label="Lățime: 6 din 12 coloane"
         aria-describedby="fb-width-cap-span" data-total="12">
      <button class="e-permits-builder__width-option" type="button" role="radio" aria-checked="false"
              aria-label="3 din 12 coloane — un sfert" data-cols="3" data-fb-seg="span" data-value="3" tabindex="-1">
        <span class="e-permits-builder__width-bar is-filled"></span>×3
      </button>
      … one option per allowed width, each holding its own columns …
    </div>
    <p class="e-permits-builder__width-caption" id="fb-width-cap-span"><strong>6/12</strong> · jumătate</p>
    <p class="e-permits-fo-field__hint">Pe telefon, toată lățimea.</p>
  </div>
</div>
```

- Geometry: picker = grid of `total` equal columns, column-gap 6; an option spans `data-cols` columns and
  lays its bars out with the same gap 6, so all bars are equal (23px in the 382px panel). Option 40 high
  (4 + 32 bar + 4), radius 8; bar radius 6.
- Captions: 3 = un sfert, 4 = o treime, 6 = jumătate, 8 = două treimi, 12 = tot rândul (`SPAN_TEXT`).
  Grid column: „Îngustă · 2 părți”, „Medie · 3 părți (implicită)” when the value is `auto`.

| State | Look |
|---|---|
| default | bars `--color-background-base-tertiary`; bars up to the value `--color-background-base-inverse-default` |
| hover (another width) | option pad `--color-background-base-tertiary-hover`; bars that would fill (grow) or empty (shrink) → `--color-background-base-tertiary-active` — CSS only (`:has(~ option:hover)` / `option:hover ~ option`) |
| hover (the selected width) | pad + its filled bars `--color-background-base-inverse-default-hover` |
| active / selected | `aria-checked="true"`, roving `tabindex` (only the selected option is in the tab order) |
| focus-visible | the option: `0 0 0 2px` white + `0 0 0 5px var(--focus-ring)` |
| keyboard | ← → ↑ ↓ move to the next allowed width and apply it (the panel's `[data-fb-seg]` handler); disabled options skipped |
| disabled (fixed width: Persoana de contact, IDNP with RSP check …) | `.is-disabled`, `aria-disabled` on the group, options `disabled` (`cursor: not-allowed`, no hover), all 12 bars `tertiary-active`, caption „12/12 · tot rândul”, reason as the hint („Componenta ocupă mereu tot rândul.”) |
| error / success | n/a — a width is always valid |

Click / keys call `setSpan` (card re-renders: the card's `data-fb-span-tag` „6/12” and its aria-label follow;
announced „Lățime 6 din 12.”) or `setPath(…, "width")` for a grid column. Demo states: fb-05w (8/12),
fb-05x (set to 6/12), fb-05y (locked), fb-52w (grid column).

### `e-permits-pd__*` — Process Designer (2026-10-14, batches 0–4)

Spec `tools/persona-test/specs/svc/process-designer.md` (Feature 89397 · US-50/51/52). Code `js/process-designer.js`
(the whole overlay is built in JS and appended to `<body>` — no HTML block), model `core/process-model.js` (pure, Node-
testable), CSS `css/process-designer.css` (on top of the builder CSS: topbar, palette item, panel, facts, issues menu are
the Form Builder's). Round-trip test: `node tools/process-designer/roundtrip.mjs`.

**Entry.** `?flow=proces` (`&proces=<flow id>`, `&vizualizare=1`, `&nou=1`) = the designer is the page (`body.is-pd-page`
hides the demo home / FO / shell); `#flux/<flow id>` on any flow (the request-type drawer's „Vezi schema fluxului”) opens
it above the page, **forced view-only** (toggle disabled with the reason). The shell's `writeHash` / `routeFromHash`
leave `#flux/…` alone; closing removes the hash.

**Model = the export.** The flow JSON (`data/flows/*.json`) is the working object; `serialize()` reproduces the GEAP
export layout byte for byte, unknown keys stay where they were. Optional texts are deleted when emptied (so an edit and
its reverse write the same bytes). Sizes come from `PM.SIZE` (Start/Sfârșit 64, Activitate 140×56, Sub-proces 160×56,
Decizie 44 turned 45°, Eveniment 40) and are written as `style` transform / width / height from JS — geometry is data,
not CSS. Positions snap the **centre** to the 20 grid (the seed's nodes sit centred on 20 rows). Routing: 16 px stubs
out of the ports + the cheapest straight / L / Z / detour shape that avoids other shapes; stored `waypoints` win;
rounded corners 8; label on the longest segment (`labelDx/Dy` of the old designer applied only when ≤ 48 px).

**Layers / performance.** Pan / zoom write ONE transform on `__world` + 3 custom properties on the stage (dot grid);
pointermove only stores the pointer, one `requestAnimationFrame` applies it; a node drag reroutes only its edges; nodes /
edges are keyed and patched (signature per node), full redraw only on undo / load. Validation runs 120 ms after the last
change, the minimap on the next frame. Measured on the seed (50 nodes / 64 edges): open → fitted 103 ms, pan / zoom /
drag 60 fps with no long task, full redraw 8 ms.

| Part | Look | States |
|---|---|---|
| Node `button.__node--*` | **site-map card** (user 2026-10-14, Figma 🗂️ Site map 8346:1839) for Activitate / Sub-proces: `__shape.__card` 184×94 white, 1 px border base-default, radius 16, padding 12 > `__card-top` (library `status-tag … is-strong status-tag--small` `__type`: Activitate brand, Sub-proces violet `--purple-600` · `__chip` grey r6 `hashtag` + id, Onest · `__error-tag` red, shown instead of the chip on `has-error`) + `__name` 14/20 semibold, 2 lines. Start green / Sfârșit red circles 64 (border 3) · Decizie white diamond (border base-secondary) + amber `bubble-question` icon + question `__caption--decision` (white r8) · Eveniment white circle 40 (1.5 base-secondary + inner ring) + processor icon, `badge--md badge--solid-neutral` = templates, `__caption` when `showName`. The drawn box (`PM.VIEW`) is centred on the export's anchor box (`PM.SIZE`), so stored x / y never change meaning | hover (`:hover` / demo `.is-hovered`): border base-secondary (+ tertiary on diamond / circle) + `--shadow-200` + ports · selected: 2 px brand ring (border + 1 px) · selected + hover: + 5 px `brand-secondary-hover` halo + shadow · focus-visible: focus ring · `is-target` brand halo 6 · `is-target-invalid` danger · `has-error`: danger border + red tag (cards) / red `__dot` · view-only path: others `opacity .4` (hover restores) |
| Port `__port` | 12 brand dot, white 1.5 ring, `--shadow-100`; 16 under the pointer; shown on hover / selection / as a target | drag = connect (dashed brand line in `__overlay`, release on a node or within 24 px of a port; on empty canvas → „Continuă cu” at the drop point) |
| `__plus` | 20 white circle, brand border + icon, right of the right port (decision: right vertex) | hover / menu open = brand fill; click = „Continuă cu” |
| Edge `g.__edge` | thin grey elbow (site map): 1.5 `--color-border-base-secondary`, rounded corners 8, small open chevron 8 | hover brand 2 · selected brand 2 + 8 px `brand-secondary-hover` halo (hit path) · `has-error` / `is-broken` dashed danger · `is-{brand,positive,danger,warning,neutral}` / `is-w1..3` |
| Edge label `button.__edge-label` | small tag on the line: white, 1 px border, r6, 12/16 medium secondary, ellipsis at 160 + tooltip | hover brand border + text · selected brand-secondary fill · hidden below 75 % unless selected (LOD) |
| Pool / lane | pool r12 border base-default, head 48 white (title 16 medium + „N benzi · N elemente”); lane = rail 40 white (vertical title 14 medium) + transparent body over the grid, 1 px dividers | rail hover tertiary · selected rail brand-secondary + inset brand ring · `is-target` (drop / move) brand-secondary 55 % |
| Palette (left card) | FB `__library-item` (36 tile with `__glyph--{activity,decision,event,subprocess,lanes}` CSS glyphs — the sprite has no node icons) + hint line; `.is-rail` = 56 wide, glyph icon buttons | click = add after the selected node (connected) or in the visible centre; drag = ghost of the real shape at the current zoom, lane highlight, `is-invalid` outside the pool |
| Properties (right card) | FB panel head + `.tabs--sm` „General” + drawer sections; nothing selected = `.is-compact` (hugs) with `GEAPEmptyState` compact bare + facts; exits = FB `__step-list` rows | below 960 it is a bottom card that appears only with a selection |
| Toolbar `__toolbar` | white r16, 1 px border, `--shadow-200`, padding 4, `btn btn-strict btn-sm btn-icon-only` + tooltips; tools = `role=radio` (`aria-checked` = pressed fill, no ring); zoom % = stack-menu trigger opening upwards; Hartă / panels = `aria-pressed` (ring by rule) | − / + disabled at 50 / 200 % with the reason in the tooltip; centred in the area the cards leave free (`--pd-toolbar-x`) |
| Minimap `__minimap` | white r16 card (1 px border), `<canvas>` 200×136: lanes, nodes coloured by type, viewport brand 1.5 + brand-secondary 40 % | click / drag = centre there, arrows pan 10 %; on by default ≥ 1440; the properties card stops above it |

**Keyboard** (stage or a node focused; never inside inputs): Tab / Shift+Tab next / previous node in flow order (BFS from
Start; leaves the diagram after the last) · Enter select + panel · F2 rename · arrows nudge 20 (Shift 100) · Delete /
Backspace delete (toast „Elementul «X» a fost șters.” + Anulează 8 s; Start / Sfârșit refused with an info toast) ·
Ctrl/Cmd+Enter „Continuă cu” · C connect mode (arrows / Tab cycle targets, announced; Enter links, Esc cancels) ·
Ctrl/Cmd+Z / Shift+Z / Y · Ctrl/Cmd+A · Ctrl/Cmd+\ both panels, `[` / `]` one · V / H tools · Space + drag pan · 1 fit,
2 fit selection · Ctrl/Cmd + − 0 zoom · M minimap · Esc: menu → connect / drag → mode → deselect (never closes).
A click without a pointer (screen reader, Enter on a palette item) selects / adds. Live region `[data-pd-live]`.

**Doar vizualizare** (`renderToggle`, label visible ≥ 1280): hides palette, footer, issues, Publică, undo / tools,
ports and „+”; the panel is read-only (`is-readonly` inputs, selects shown as read-only inputs); a selected node
highlights its edges and fades the rest. Forced (toggle disabled + reason) from `#flux/…`, for a past version and below
960 px.

**Validation** (`PM.validate`, spec F.13 codes, Azure wording): E1 unconnected, E2 decision exit without target, E3
unknown sub-process, E4 required (Denumire / Întrebare / processRef / templates / audit code / payment moment), E5
human step without a role (publish), E6 unreachable / E7 no way to Sfârșit (publish), E8 decision exits / labels, E9
sub-process calls itself, E10 duplicates / edge into Start / out of Sfârșit / > 15 lanes, W1 default branch. Topbar
`__errors` + `__issues-menu` (heads „N erori blochează salvarea / publicarea” · „Avertismente”; row = select + zoom to
the element + focus the property). Salvează is blocked by `blocks: "save"` errors (error toast + the menu opens).

**Save / versions.** Salvează = patch + 1, Schiță, toast „Schița v1.0.1 a fost salvată. Serviciile folosesc în
continuare v1.0.0.”; Anulează = red confirm, back to the saved bytes; × with changes = `#pd-close-modal` (Rămâi ·
Închide fără salvare · Salvează și închide). The FB `__version` button opens a stack menu of versions (`__version-row`:
version + status tag + „date, hh:mm · who”); a past version opens view-only. Publică = `askConfirm` (status Publicat,
version unchanged). Sandbox DB `geap.processDesignerDb.v1` (seeded from `e-permits-services.json › flows` + the
definitions; the 5 sub-processes the seed calls are seeded as published processes), UI prefs `geap.processDesigner.ui`.

States `pd-01…pd-28a` (see `js/demo-states.js`; QA scope `#process-designer-modal`). Editing states are desktop-only
(below 960 the designer is view-only by spec E.7; below 720 the list view replaces the canvas — the `pick` demo helper
falls back to the list there).

**Batches 2–4 (2026-10-14).** Model additions (`core/process-model.js`, all Node-tested in `roundtrip.mjs`, 14 → 33 checks):
`putKey / setKey(obj, key, value, kind)` — a key an edit removed comes back in its **export position** (`KEY_ORDER` for
root / state / properties / transition / lane / condition / term), so edit + reverse = the same bytes; `guardProblems`,
`fieldKind`, `CASE_FIELDS`, `OPERATORS` (decision conditions); `reorderLanes / resizeLane / laneMinHeight / removeLane`
(y is absolute across lanes: every lane operation moves the nodes of the lanes it shifts, a node keeps its offset in its
lane); `splitEdge` (A → N → B: label, guard, form and source port stay on the first part); `autoLayout` (longest-path
layers by lane, columns = widest shape + 80, only x / y, lane heights and waypoints change; idempotent, no overlaps);
`pathThrough` (shortest chain through the case's visited steps); validation adds E8 condition rows, E9 draft sub-process
(publish), W2 unknown template / form / unused variable, W3 avizare branch or notification step lost against the active
published version (`ctx.base`). Every issue carries `tab` + `prop`, so a row opens the right tab and focuses the field.

| Part | Look / markup | States / rules |
|---|---|---|
| Panel tabs | FB `.tabs.tabs--sm.e-permits-builder__tabs`, `[data-pd-tab]`, FB red dot `e-permits-ntpl-dot e-permits-tariff__tab-error` on a tab with errors. Activitate: General · Acțiuni · Roluri · Termene · Avansat; Decizie: General · Ieșiri · Avansat; Eveniment: General · Procesor · Avansat; Sub-proces: General · Avansat; Start / Sfârșit: General | arrows move between tabs (roving tabindex); the tab survives re-selection when the new element has it |
| Action / exit / term card | the **rule-builder card** `.e-permits-doc-rule.e-permits-pd__card-block` (padding 12 in the panel), head = keyword token `code.e-permits-doc-kw` „Acțiunea 1” / „Ieșirea 1” / „Termenul 1” + ⋮ (`renderStackMenu`: Mută sus · Mută jos · Selectează conexiunea · Șterge) | fields = the panel fields (Etichetă · Duce la · Formular); errors under the field; „+ Adaugă acțiune / ieșire / termen” = `btn-secondary btn-sm` |
| Decision condition | the US-225 builder markup: `__when` „Când” · `ol.e-permits-doc-rule__conds` · `li.e-permits-doc-cond` (câmp · operator · `.e-permits-doc-val` value group) · join rows `kw("și")` inside a group, `kw("sau")` between groups; „Condiție („și”)” / „Grup („sau”)” = `btn-text-primary btn-sm`; „Ramura implicită” = `renderCheckOption` (no guard). In the narrow panel the FB phone layout (one column, × right) is scoped to `.e-permits-pd__float--right` | bool variables → este bifat / nu este bifat (no value: „Fără valoare”), value fields → = ≠ < ≤ > ≥ în lista; an undeclared variable shows „(nedeclarată)”; „Folosește Da / Nu” (FB wording) when 2 exits, „Creează Da / Nu” when fewer |
| Roluri | facts „Rol din bandă” + plain `renderCheckOption` list (`.e-permits-pd__checks`, left-aligned) | E5 error under the list |
| Termene | `renderInfoNote` + `renderTag("În așteptarea PO", "warning")` (no story); segmented Pornește · Pauză · Reia · Oprește (library markup; in the panel it takes the column: items `flex: 1 1 0`); „La expirare” only for Pornește | W2 when the expiry action is not one of the step's actions |
| Field assignments | FB options list `.e-permits-builder__options` > `.e-permits-builder__option-row` (index · `.e-permits-pd__pair` = Nume select + Valoare input · delete icon) | StatusId stays in General („Starea dosarului”) |
| Processor + templates | Procesor server select; Notificare → the **long multi-select**: `.e-permits-fo-subgen-select` summary („2 șabloane selectate din 31”) + full-flow chips + `#pd-tpl-modal` (the `#cfg-subdiv-modal` markup: search, chips Toate / Selectate / Neselectate, sections by family with a tri-state head, live total, Renunță · Aplică); Jurnal → Cod audit select; MConnect → segmented Dosar · Act permisiv; taxe → Moment plată select (the 6 passport moments) | the node badge counts templates live; E4 when none (save-blocking, US-188 AC-06); W2 for an unknown / inactive code; the summary keeps `is-open` + `aria-expanded` while the picker is open |
| Event Id | editable input (US-188), Enter / blur applies; unique + `^[A-Za-z][A-Za-z0-9_]*$`; every reference (transitions, initialState) follows | refusal = the field's error, the old id stays |
| Connection panel | Etichetă · De la (link) · **La** (select = keyboard twin of the endpoint drag) · Formular (activity) · **Culoare** (select of 6: implicit = key removed) · **Grosime** (segmented Implicită · 1 · 2 · 3 px) · Traseu („Revino la traseul automat” removes waypoints) · ⋮ Inserează un eveniment / Șterge | colour / width = the optional `color` / `width` keys of the spec |
| Re-connect | `span.e-permits-pd__edge-end--{source,target}` in `__labels` (12 brand dot, white ring, 16 on hover, `grab`) on the selected connection; drag = dashed line + target halo like connect | release on a node = new target (+ nearest port) or new source (the transition moves to the new source); else retract + live message |
| Split | dragging Eveniment / Activitate from the palette within 12 px (screen) of a connection: `g.__edge.is-split-target` (brand 2.5 + 10 halo) + ghost `.is-splitting`; drop = `PM.splitEdge`; the new event opens on Procesor | keyboard twin: connection ⋮ „Inserează un eveniment” |
| Lanes | rail = drag to reorder (dashed `__drop-line` in the overlay; click without movement selects); `__lane-resize` strips are **pool children after the lanes** (inside a lane they sat under the next lane's stacking context), row-resize, pill shown on hover / selected lane; panel: Înălțime input (step 20, min = what holds the nodes), Mută sus / jos, ⋮ Șterge banda | delete: empty → red `askConfirm` + undo toast; with nodes → `#pd-lane-modal` with „Mută elementele în” select → `PM.removeLane`; 15 lanes = add hidden, palette item disabled with reason |
| Pool | head title = `button.__pool-select` (hover tertiary, selected brand-secondary) → pool panel (title + lanes with ↑ ↓ icon buttons + Adaugă bandă) | |
| Sub-process | card icon `__open-sub` (external-link, aria-hidden — keyboard: panel button / ⋮); drill-in pushes the parent (definition, undo, view, selection) on a stack; the topbar title becomes the library `.breadcrumbs` (`renderBreadcrumbs`, truncate); a crumb returns and reselects the node; „Creează sub-proces nou” makes a draft process and sets the reference | leaving a dirty sub-process asks first |
| Multi-select | panel groups Aliniază (Stânga · Centru · Dreapta / Sus · Mijloc · Jos) + Distribuie (≥ 3) as `btn-neutral btn-sm`, Duplică | Ctrl/Cmd + C / V / D (paste offsets +40 each time; connections between copies kept) |
| Toolbar | + „Aranjează automat pe benzi” (edit only, icon `tree`) · „Vizualizare listă (L)” (`aria-pressed`) | auto-layout: confirm only when manual routes exist; one undo step + undo toast |
| List view | `section.e-permits-pd__list` (white card r16 over the stage, left of the properties; full screen below 720) > head (title + meta + keys hint, the case path line when traced) > `.e-permits-stack` grouped by lane (`__group-label` + count + role) > rows `.e-permits-stack__item.has-lead.e-permits-pd__list-item` (glyph · `button.__list-name` · type tag · error / trace tags · `ul.__list-edges` of `button.__list-edge` „→ Țintă (etichetă)” · „Arată pe diagramă”) | roving tabindex: ↑ ↓ Home End, Enter = properties, Shift + Enter = on the diagram; L toggles; selected row brand-secondary (hover brand-secondary-hover) |
| Case trace | `GEAPProcessDesigner.openCase({ flowId, label, visited, current, suspended })` (from the dossier „Vezi fluxul” drawer → „Vezi schema fluxului”); forced view-only; nodes `.is-visited` (positive ring), `.is-current` (brand ring + halo + `__current-tag` „Pas curent”), the rest 40 %; edges `.is-visited` positive; `__trace` card (title, case, current-step link, count, legend) — hidden in the list view (the list head carries it) | ids the definition lacks (the hand-written case engine) are skipped |
| Publish modal | `#pd-publish-modal` (library `.modal--md`): blocked = error notice with the Azure base message + one `__step-row.has-error` per error (click = goes to the element, tab, field), Publică `aria-disabled` + reason; ready = lead (effect), facts (version kept, active version, content), „Efect asupra tipurilor de solicitare” rows, W3 / template warnings, „Ce s-a schimbat” textarea | dirty → Salvează first; success = Publicat, history note, toast with the request types reached, **`window.GEAPShellFlows.upsert`** (shell) → the passport flow select / actions / outputs / payment moments / avizare lock read the new definition; an open request-type drawer redraws; other tabs follow through the `storage` event |
| Versions | a past version opens view-only with **„Restaurează ca schiță”** (topbar, `btn-primary btn-sm`) → it becomes the unsaved working draft (Salvează = next patch) | |
| JSON | + „Importă JSON” (file input): same identifier → replaces the working draft (one undo); another → a new draft process; non-GEAP layout → normalised once (toast says so); not a process → error toast | |
| Registry „Fluxuri de lucru” | Administrator Central menu item `workflows` (`shellView: flows-registry`, mask icon `tree.svg`); the shell's registry engine with the module hooks of `window.GEAPShellRegistries.flows` (`build / renderCell / searchText / sortValue / filterToken / openRow / emptyHtml / exportRows`; `productRegistry()` reads them): Denumire (+ Proces / Sub-proces · description) · Identificator (copy) · Stare · Versiune (+ activă / nepublicat) · Folosit de (tipuri · servicii) · Actualizat (date-stack) · Editează + ⋮ (Vezi schema · Duplică · Exportă JSON · Șterge — Schiță never published and unused only); tabs Toate / Publicate / Schițe; primary action „Creează proces” | «Proces nou» / «Duplică» = the BO right drawer (`.e-permits-user-create`, eKYC config markup): Identificator* (latin, unique), Denumire*, Descriere scurtă → creates the draft and opens the designer |

New demo states: pd-07b, pd-07c, pd-08…pd-08c, pd-09…pd-09f, pd-10, pd-10a, pd-11…pd-11c, pd-18a, pd-19a, pd-20…pd-20b,
pd-21a, pd-21b, pd-22, pd-23, pd-23a, pd-24, pd-26, pd-29, pd-29a, pd-30…pd-34, pd-35…pd-35d (registry), pd-36 / pd-36a
(publish → request-type drawer), pd-37, pd-37a, pd-38.

### `rap-*` and `cab-*` — the two standalone pages

| Concern | rap-evo | cabinet-evo |
|---|---|---|
| Status | BO Tag · Small `renderTag` markup `.e-permits-workplace__tag--success/--warning/--danger` (Valabil / Suspendat / Expirat·Retras·Anulat — Expirat red since 2026-10-17 per US-162 AC-07; the BO story US-196 says grey, PO to align) in the list, the filter popover, the profile header and the „Stare” row (2026-10-16; `.rap-status` removed) | the same BO Tag · Small tones (2026-10-17: cards, header, rows; `CabEvo.tagHtml` + `ACT_TONE`) |
| Status dates (2026-10-17, US-162 AC-17) | `statusDateRows(record, profile)`: Suspendat → „Data suspendării actului permisiv” + „Suspendat până la data de”, Retras → „Data retragerii actului permisiv”, never for other statuses; data `profile.suspensionDate / suspendedUntil / withdrawalDate`. Same rows in Detalii act, the modal Date generale and the A4 form, in date order: [Data aprobării tacite] → Data eliberării → Valabil din data → suspension / withdrawal → Suspendat până la → Data expirării (kept = original end). Header meta beside Stare (`headerDateItem`): „Suspendat până la” / „Retras la” instead of „Valabil din data”. Demo rap-02b, rap-02h, rap-03n, rap-03o | — |
| Act profile (`?act=`) | BO page header (`.e-permits-page-header` › `__body/__top/__heading/__title` + `__meta` items, separators, `is-row-start`) and BO sections (`.e-permits-dosar-profil__panel` › `__section` › `__section-title` over `__card` › `__row` / `__row-label` / `__row-value`) — CSS for this page in `css/bo-profile-parts.css` (BO computed values, tokens; never load it on BO pages). Act name in the list = real link `a.rap-act-link[href="?act=<id>"]` (plain click stays in page, modifiers → browser). Unknown act → `GEAPEmptyState` „Actul nu a fost găsit” + „Înapoi la registru”. Demo rap-02…02c | the same header + sections + dialogs (`?view=acte&act=<id>`, 2026-10-17), see „Entry 1” below |
| Copy | the shared `.copy-value` in the header / detail rows / act dialogs; the table shows the compact `.copy-value--compact.rap-act-number` / `.rap-beneficiary__identifier` (2026-10-21; `.rap-copy*` / `.rap-profile__copy` removed 2026-10-20) | the shared `.copy-value` (`CabEvo.copyValueHtml`) |
| Filter | the BO advanced filter (2026-10-16): button „Filtru” `[data-rap-filter-toggle]` + bar `.e-permits-workplace__filters.rap-filters` (bordered block) via `GEAPFacetFilter` — see „Advanced filter”. Phones (≤760, 2026-10-17): `mobileSheets` — the search takes the row (button hidden), one round „Filtre” pill (2026-10-20, no facet chips) → the all-filters bottom sheet (rap-04…04d). Desktop button = `btn-md` 40 (the search height, 2026-10-20). The old `.rap-filter-chip` / `.rap-filter-panel` drawer was removed | library `.chip` + `.chip__badge--accent` |
| Table | `.rap-table` + `.rap-table__col--*` | `.cab-card` list |
| Empty state | shared `GEAPEmptyState` in `.rap-state` (2026-10-14) | shared `GEAPEmptyState` in `.cab-state` (2026-10-14) |
| Pagination | `.rap-pagination`, `.rap-page-button` (`is-active`) | — |
| Tooltip / toast | `.rap-tooltip` (`is-visible`), `.rap-toast` | — |
| Tacit approval (2026-10-17; tacit-tag-v1 2026-10-21) | blue Small tag „Aprobare tacită” `.e-permits-workplace__tag--info` (border `--color-border-brand-secondary`) INSTEAD of „Valabil” everywhere the status shows — list Statut cell, header meta „Stare”, the „Stare” rows (user 2026-10-21: it implies Valabil; hidden „ (valabil)” for screen readers; deviation from US-139 AC-02 „alături de Status”, to confirm with the PO; Statut column 125 so the 100-wide tag keeps its padding); only for `markings: ["Aprobat tacit"]` AND status Valabil (US-139) — other statuses show their status tag only. Details (Detalii act, modal Date generale, A4): ONE row „Data aprobării tacite” = the date only (the tag is in Stare), right above „Data eliberării” (dates in chronological order) — US-162 AC-08 badge + date. Filter: „Aprobat tacit” = a pseudo-value of the Statut facet (US-141). Demo rap-01f, rap-01h, rap-02g, rap-03m | — |
| Long act name (2026-10-17) | list: one line + ellipsis + `.rap-tooltip` (rap-01e); profile title / Detalii act value / A4 h1 wrap; dialog subtitles = the expandable name above (rap-02d, rap-03g/h) | — |

#### RAP „Vizualizare act” — data modal, then the printable form (2026-10-17)

US-162 (GEAP 2): the act's specific fields („Câmpuri specifice actului”) are NOT on the details page —
„Vizualizează act” opens them. So the profile button opens the **data modal** (the BO detail modal on this
page: `openActData`), and its „Descarcă” opens the **MDocs A4 form** (US-143, the existing act viewer, now titled
„Forma de tipar a actului”). Data shape: `profile.document.sections: [{ title, fields: [[label, value]] }]`
(US-163 form sections, fields marked public in Setări › Publicare în RAP, US-221) or the older flat
`address / activity / fields`. Rules:
- „Date generale”: Autoritatea emitentă, Subdiviziunea (office), Beneficiar, Numărul actului permisiv (copy),
  Stare („Aprobare tacită” for a tacit Valabil act), [Data aprobării tacite], Data eliberării, Valabil din data, [Data suspendării actului permisiv +
  Suspendat până la data de | Data retragerii actului permisiv], Data expirării.
- The act's configured fields (2026-10-19): one BO section per configured group, in the configured order (a lone
  untitled group = „Câmpuri specifice actului”); a group with more than 10 items → the first 8 + „Arată toate
  câmpurile (N)” (expands in place, the body scrolls; hairlines under the header / over the footer). Grids: see
  „Configured act fields — groups + tables” below.
- Long values wrap (never truncated); long labels follow the BO row (one line + `title`).
- A4: every public field, group heading rows (`tr.rap-act-doc__group`), `paginateActDoc` measures unzoomed and
  moves rows to continuation pages (`.rap-act-doc__cont` „… · continuare”, closing text + signature on the last
  page with ≥ 2 rows, „Pagina k din n”), `break-after: page` in print. rap-03k = 3 pages.
- Subtitle long name: research (Material expandable text, App Store / Google Play „more”, GOV.UK Details, NN/g on
  ellipses) → an explicit word; the whole clamped name + „Mai mult” is one toggle; no tooltip (one affordance).
  code-audit reports it as `clipped-text-no-tooltip` + `button-not-library` — intended.

#### Configured act fields — groups + tables (2026-10-19)

Figma comment (A. Pascalov, EVO-WEB-3.0 20607:34846, „Câmpuri specifice actului”): the act's fields are configured
per service (passport / form builder), there will be many, some are grids with many rows. ONE renderer,
`GEAPActView.fieldsHtml(groups, { section, untitled })` in js/act-view.js, used by the act data modal (RAP + EVO
Cabinet) and the Cabinet „Solicitările mele” › Act / Decizie tab; the A4 form renders the same groups.

**Data model** (`normalizeFields` reads every shape; RAP `profile.document.sections`, Cabinet
`data/cabinet-evo.json › actProfiles[id].specificFields`):
```json
[{ "title": "Date despre operațiune", "fields": [
   { "label": "Tipul operațiunii", "value": "Import" },
   { "label": "Punctele vamale de intrare", "value": ["Biroul vamal Leușeni", "Biroul vamal Sculeni"] },
   { "label": "Substanțe autorizate",
     "columns": ["Denumirea substanței", "Cod CAS", { "label": "Cantitate (kg)", "type": "number" }],
     "rows": [["HCFC-22 (clorodifluorometan)", "75-45-6", "850,0"]] } ] }]
```
Also accepted: `items` / `rows` instead of `fields`, `[label, value]` tuples, and a flat item list (= one untitled
group — the old data). Empty values and grids without rows are dropped (only filled public fields show).

**Look** — group = section title over the grey card; simple field = the BO detail row (14/20 secondary label ·
14/20 medium value; long values wrap, never truncated; multi-line values keep the label on the first line; a list =
one value per line, gap 4); grid = its label (row-label type) → 8 → a white box (1px base border, r12) with the BO
registry table values (th 38 · 12/16 medium · secondary background; td ≥ 50 · 14/20 secondary · padding 8/12;
long headers wrap at 160, text cells wrap at 240 / 200 for the first; numbers right-aligned; first column pinned
with a divider) that scrolls sideways on its own — the dialog / page never does. > 5 rows → the first 5 +
„Arată toate (N)” (`btn-text-primary btn-sm`) expanding in place, „Arată mai puține” to collapse. ≤ 760: each row = a
white mini-card (r12, 12/16 padding, 8 between cards): the first cell as label over value, the others as
`label | value` lines (a 2-column grid of pairs squeezed the labels to 3 lines at 375). No divider under the last row
/ item. Numbers use proportional figures: Onest `tabular-nums` draws gaps („1 20,0”).

**A4** („Forma de tipar”) — group heading rows as before; a grid = a label row + a header row + one row per data
row, each a one-row bordered table with the same colspan units (first column 3, the others 2), so
GEAPDocPreview.paginate can break the grid across pages; label / header rows are keep-with-next
(`.e-permits-doc-page__keep`) and the header row repeats on a continuation page. Every row, no „Arată toate”.
The act page table now has `<colgroup>` (label 40 %) so continuation pages that start with a grid keep the width.

**Research** (Mobbin MCP not available in this session — no tool exposed; documented guidance):
- GOV.UK Design System — Summary list for key/value data, grouped under h2 headings on long „check answers” pages;
  use a Table, not a summary list, for tabular data; numeric table cells right-aligned (`govuk-table__cell--numeric`).
- NN/g — „Mobile Tables: Comparisons and Other Data Tables”: independent rows → stacked cards on phones, keep the
  table when users compare columns; freeze the first column when a table scrolls sideways. „Data Tables: Four Major
  User Tasks”: right-align numbers, left-align text, headers aligned with their data. „Progressive Disclosure”: show
  the first part and an explicit „show all” for long secondary detail. „Modal & Nonmodal Dialogs”: keep dialog
  content focused — long content scrolls in the body with fixed header / actions.
- Material Design data tables: header row, numeric columns right-aligned, horizontal scroll inside the table
  container on small widths.
- Decision: no in-dialog group navigation (chips / table of contents) — 3–4 titled groups read fine with headings in
  a scrolling body; NN/g recommends in-page navigation for long multi-section pages, so revisit if a service
  configures ≥ 6 groups (PO question).

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

**Section header + alert (2026-10-16, user, whole project):** a section header keeps its bottom divider; an
alert / notice right under it (banner `.message`, `.info-box`, `.e-permits-fo-notice`, `.e-permits-fo-infobox` —
directly, or first child of a block that is not the section body; also the FO authorization card) gets the section's normal header → content gap
(24 = the FO section body's top padding; BO drawer content already has 16). One generic rule in
css/e-permits-acte-permisive.css („Section rule (2026-10-16)”). Applies today to Ghișeu „Temeiul reprezentării”
(gh-03, 03a, 03b, 03e, 03f); every other header + alert pair already sits in a section body.

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
- **Empty list:** `renderStackedList(title, groups, { empty, icon })` → `renderPassportEmpty` (the
  shared empty state; `icon` = sprite id, default `page-text`; 2026-10-14).
- **Section heading action:** `renderStackedList(title, groups, { meta, actionHtml })` puts
  meta + action together in `.e-permits-passport__heading-tools` (right side). Add buttons
  are `btn btn-secondary btn-sm` with `icon-plus-large`, like „Atașează șablon”.

**Section header with an action — one pattern (2026-10-16, user: „the button touches the
container edge”).** Every BO section header that carries an action (button, ⋮ stack-menu button,
segmented control, meta + button) is the same markup:

```html
<div class="e-permits-dosar-profil__section-heading">
  <h2 class="e-permits-dosar-profil__section-title">Reguli de destinatari</h2>
  <div class="e-permits-passport__heading-tools">
    <!-- optional: <span class="e-permits-dosar-profil__section-meta">2 din 4 configurate</span> -->
    <button class="btn btn-secondary btn-sm" type="button">+ Adaugă regulă</button>
  </div>
</div>
<!-- then the stack / card / table, 0 gap -->
```

- Desktop (measured, 1440): row 48; title 18/26 semibold, padding 11/12 → text 12 from the left;
  tools 12 from the right (mirror of the title inset), button centred (8 above / 8 below); meta →
  button = the tools' 12 gap (meta's own right padding is only for a meta-only heading); 0 gap to
  the stack / card under it. **Air under the action (2026-10-16, user: „still too close”):** when
  the tools hold a `.btn` / segmented control the heading adds a 4px bottom pad (row 48 + 4 = 52)
  → button → card / list border = **12** (was 8); the title does not move (text 13 from the heading
  top, as in headings without tools). Measured ntpl-03, svc-02, svc-03, usr-02, ek-26, svc-01
  (Resincronizează). Exception: Șabloane › Previzualizare (52px E-mail / SMS switch) keeps the 48
  row + a 16 margin (switch → preview 14). Never put the button straight into the heading (it then touches the
  edge) — the `heading-tools` wrapper carries the inset.
- Phones (≤760): title row 48, the tools under it (grid, gap 4), inset 12 left / right, 12 above
  the content, left-aligned (the eKYC layout, now BO-wide). Measured 12 since 2026-10-16 (the base
  ≤760 heading `padding-bottom: 12` is zeroed for headings with tools — it made 24).
- Renderers: `renderStackedList`, `renderPassportBlock`, the classifier `clasSection`, the eKYC
  `sectionHead`; hand-written headers (Șabloane de notificare › Reguli de destinatari and
  Previzualizare, Utilizatori › Combinații de roluri) use the same wrapper.
- Not this pattern: `.e-permits-pay__toolbar` (title + search + filters + add + ⋮ — the list
  toolbar) and drawer sections (`.e-permits-user-create__section`).
- Figma (aligned 2026-10-16): local set `svc/section-heading + action` 11745:301869 (Breakpoint
  Desktop / Mobile) documents the pattern; `svc/section-heading` 9521:7915 = H5 18/26, min height
  48, title → tag 16, meta 12/16. The 101 existing header rows (GEAP 84, eKYC 17) were normalised in
  place by `tools/figma/section-heading-action.js` (right padding 12, action centred 8 / 8, meta →
  action 12, 0 gap below). Known code drift: at ≤760 the heading's base `padding-bottom: 12` stacks
  on the tools' 12 → 24 between the button and the content (doc: 12); Figma Mobile follows the doc.
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
  - One tab set and order for every case; Taxe și plăți / Avize follow what the service can
    produce (see „Dosar profile — which tabs” below, 2026-10-14). Act/Decizie shows only when
    it has content.
  - Expert sees only Avize; Specialist ghișeu sees only Date generale and Detalii
    solicitare.
  - New tab: **Jurnalul activităților** (`renderEventTimeline` over `flowState.log`).
- **"Vezi fluxul":** the guard variables plus the human steps on the timeline:
  visited = check, current = clock, not reached = the `--upcoming` ring.
- **Roles:** a Director assignment (`ansp-director-chisinau`) was added for the signing
  steps.

### Dosar profile — which tabs (2026-10-14)

**Propunere Alexandr Pascalov, comentariu Figma 14.10 (GEAP 2.0 `9709:2052`, „Block · 01 · Depus ·
nerepartizat”) — de confirmat în Feature 90263.** The feature text still says the tabs appear only
with content; the prototype now does this (user decision, „first in code”):
- **One tab set, one order** for every case: Date generale · Detalii solicitare · Taxe și plăți ·
  Avize · Act/Decizie · Documente generate · Notificări · Jurnalul activităților
  (`DOSAR_PROFIL_TABS`).
- **Taxe și plăți / Avize = what the case's service / request type CAN produce**, read from the
  service passport (`dosarTabSetup(row)`), not whether this case already has one:
  - link: `dossierDb.serviceCodes[row.serviciu]` → passport service; `row.tipDosar` = the RSSP
    sub-service `type` (Eliberare → „Emitere primară”) or the request type name. Request type not in
    the passport → the whole service decides (any of its request types).
  - fees: active published taxes of the request type (Taxe și tarife, their `moment`), else an RSSP
    sub-service price > 0 (→ „La examinare”).
  - avize: „Necesită avizare” in the request type's Avizare tab (US-222, `rt.avizare.needs`, only
    with a flow that has the avizare branch); while that tab was never saved
    (`rt.avizare` absent), a flow with the avizare branch (`flowHasAvizare`).
  - never: the tab is absent, and the case-actions menu drops the matching operation („Avize
    interinstituționale” / „Taxă de examinare”).
- **Empty until there is content** — the shared empty state through
  `renderStackedList(…, { empty, icon })` (title = first sentence): Taxe `receipt-bill`, Avize
  `share-android` (the icons of the case-flow operations). The line names the real case-flow step
  (`core/case-flow.js`):
  - before / during examination: „Nicio taxă încă” · „Taxele se generează la examinare, la pasul
    „Setarea taxei”.” (moment „La inițierea solicitării” → „la depunerea cererii”, after signing /
    issuing → „după semnarea / eliberarea actului”); „Niciun aviz solicitat încă” · „Avizele se
    solicită la examinare, la pasul „Verificarea datelor dosarului”.”
  - past examination (spre coordonare … arhivat, respins): „Nicio taxă” · „Pentru acest dosar nu
    s-au generat taxe.” / „Niciun aviz” · „Pentru acest dosar nu s-au solicitat avize.”
- **Count badge only when count > 0** (`renderPageHeaderTabCount`, unchanged); the signal tone
  (warning / danger) as before.
- **Never hide content:** a case that already has a fee / an aviz shows the tab even if the passport
  changed since. Cases outside the passport and ex-officio drafts (no case flow) keep the old rule
  (tab only with content).
- **Act/Decizie keeps „only with content”**: every case ends in an act or a decision, so a
  capability rule would show it on every case as an empty tab for the whole examination; the
  decision is already announced by the trajectory and the „Decizie și act” card in Date generale.
- **Role filter unchanged** (`DOSAR_TAB_ROLES`: expert → Avize only; operator ghișeu → Date
  generale + Detalii solicitare).
- Seed: avize are asked at examination (none at Depus). Demo states: `dos-01i` (Depus · Taxe empty),
  `dos-01j` (Depus · Avize empty), `dos-01k` (Autorizație sanitară · Prelungire, „Necesită
  avizare” off → no Avize tab, Taxe empty); populated: `dos-03a`, `dos-04a`, `dos-04c`.

### Dosar profile tabs — stacked lists (updated 2026-10-01)

The case tabs use the same layout as the service passport: a section heading with a
short meta, then `renderStackedList` groups (stack group header plus count badge, rows
of title, status tags, a dot-separated meta line and an optional right-side action).
The old `renderProfileTable` / `renderProfileDocList` helpers are removed.

| Tab | Groups | Row |
|---|---|---|
| Taxe și plăți | În așteptare · Achitate | name, Neachitat/Achitat tag · **amount**, MPAY id (plain — no copy in lists, 2026-10-20), issued, due date (+ days left) or paid date. Meta: "Total … · achitat …" |
| Avize | Active · Termen depășit · Finalizate | institution, status tag · id (plain), requested, deadline, result |
| Act/Decizie | — | the document row (see „Documents — one pattern everywhere”): blue icon, Act permisiv / Decizie de respingere, `Generat` + signed badge + Aprobare/Respingere (+ `Proiect` until signed) · act / dossier no. · file · size · Emis … · de specialist · semnat de <conducător> · „👁 Detalii” + ⋮ Descarcă |
| Documente generate | by flow step (Inițierea procedurii · Depunerea cererii · Plata taxelor · Decizie și act) | the document row: blue icon, type, `Generat` + signed badge (+ `Proiect`) · number · file · size · Generat … · de SIA GEAP / MPower / MPay / specialist · semnat de … · „👁 Detalii” + ⋮ Descarcă; heading meta „N documente · M semnate electronic” |
| Detalii solicitare › Documente însoțitoare | Obligatorii · Opționale | lead icon, type, source tag · file / act no., size, added at, by, signed · eye + ⋮ (see „Dosar › Documente însoțitoare”) |
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
  - Revised columns: Cod (plain code since 2026-10-20 plus "Sursă: Sistem | Personalizat", the template's
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

**Unpublished notice (2026-10-16):** the compact Inline note —
`renderNotice("warning", "<strong>Modificări nepublicate.</strong> Destinatarii primesc încă
versiunea vX până la publicare.", { className: "e-permits-ntpl__unpublished" })` (never
published: „**Șablonul nu a fost publicat încă.** …” — „never published” = `ntplVersion(tpl)` is null:
a new template stores `version: null`, and „—” / empty from older data count as none; „—” is only
rendered (header Versiune), the first publish is `— → v1.0.0`), first in every tab's panel, 24 above the
tab content. No close button (the inline note has none): it shows while the template has
unpublished changes. The old 16/24 dismissible banner (`.e-permits-ntpl-banner`, Figma
8230:2388) is gone — the user found it too big.

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
`e-permits-shell.js` — **since library-adopt-v1 (2026-10-21) it emits the library `.switch`** (48×28 track, 24 thumb;
inventory row „Switch”); the geometry below is HISTORY (the old `.e-permits-toggle`, removed). It replaces every
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
pattern is Azure DevOps / Linear. **One implementation (2026-10-16):** bar, popover, „Mai
multe”, draft / commit / clear, keyboard and focus live in `js/facet-filter.js`
(`GEAPFacetFilter.create({ bar, toggle, count, state, save, facets, allFacets, options, tag,
total, apply, pageKey, onPageChange, scrollers, sprite })` → `{ render, close, clearAll }`)
and `css/facet-filter.css` (`.e-permits-workplace__filter*`, `__advanced`; loaded right after
e-permits-shell.css). The page keeps its data: the shell gives `FILTER_FACETS`,
`getFilterState`, `facetOptions`, `renderWorkplace` — every table in the shared workplace
panel (dossiers, sarcini, users, roles, services, authorities, tariffs, ntpl, modules); the
public RAP list (`rap-evo/`) gives its records (Statut · Denumire act · Autoritate · Tip
beneficiar, status values as its `.rap-status` tags), label „Filtru”. Demo states rap-01…01d.
**eKYC back office (2026-10-19, user: „exact same filtrare as in GEAP”):** every eKYC list is a
shell registry (`ekyc-*` kinds), so its „Filtrare avansată” IS this module with the BO Dosare
markup / CSS — facets come from `product.facets` (`js/ekyc.js`: Sesiuni active Client · Caz de
utilizare · Statut · Nivel asigurare · Pas curent · Furnizor; istorice Perioadă · Client · Decizie ·
Scor final · Caz · Statut · Nivel · Revizie manuală; revizie, jurnal acces) and
`GEAPShellRegistries[kind].facets` (`js/ekyc-config.js`: Utilizatori, Clienți, Cazuri de utilizare,
Parametri, Scoring, Furnizori, Organizații, SDK, Certificate CA). Proof: compare-styles spec
`tools/ui-qa/specs/ekyc-filter-vs-bo.json` (dos-05c ↔ ek-04j: button, bar, chips, Statut popover, tabs) = 0 and
`ekyc-filter-applied-vs-bo.json` (dos-05d ↔ ek-04d: selected chip + badges, „N rezultate · Șterge filtrele”) = 0.
BO reference states dos-05b (bar open) · 05c (Statut popover) · 05d (Statut applied). eKYC states:
ek-04b bar · 04c Client popover · 04c1 popover search without match · 04d Client applied · 04j
Statut popover (tags) · 04k Statut ×2 + Nivel applied · 04l draft „Filtre neaplicate” · 04m „Mai
multe” (phone: all-filters sheet) · 04n applied + search → no results · 06g Decizie + Perioadă
applied; 06b / 06c / 08b / 13a / 20b / 22b / 27a = popovers on other lists. Demo helpers `ekFacet` /
`ekPick` / `ekCommit` branch desktop / phone. Sesiuni istorice „Perioadă” = the date range facet (2026-10-20,
„Date range facet” below) on „Finalizat la” — the fixed list (Ultimele 24 de ore / 7 / 30 de zile / Mai vechi) went.
The passport stacked lists (`SF_LISTS`, `data-sf-*`) still have their own copy — next to
migrate. Never write a third one.

- **Quick search:** the same width on every table, the Utilizatori size: `flex: 0 1 400px`,
  min 200, max 400 (2026-10-01).
- **Toolbar = one component:** every table uses the same 56px toolbar row. Its items are
  all `align-self: center`, with no transforms and no per-registry geometry (the users
  registry used to override height/padding and the search had a 3px nudge, which put
  them out of line). The search (40px box, 36px visible) and the button (36px) share
  one centre line. Never re-add per-table toolbar overrides.
- **Trigger:** since 2026-10-21 the library CHIP — see „Filter trigger” below (was `btn btn-neutral btn-sm`). In the
  GEAP BO registries it is 36px tall, which is
  the quick search's *visible* height: the search is a 40px box whose 1px line sits
  inside a 2px transparent border.
  - **Icon:** `icon-filter-lines`, the Foundations "filter-2". The symbol's viewBox is
    padded (`-3 -3 30 30`) so it has the same optical margin as the other 16px button
    icons; at 0 0 24 24 it touched the label.
  - **Badge:** the chip's numbered badge `.chip__badge` (16, Figma numbered-badge M), with the number
    of applied values (until 2026-10-21: `badge badge--lg badge--solid-light`).
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
- **Popover** (Figma contextual-menu: 270 wide; surface = the „Dropdown surface” rule: „dropdown-effect”, radius 12, 2026-10-16):
  - **Options:** the dropdown item size (2026-10-20): 32 · padding 6 12 6 8 · gap 8 · 14/20 medium · radius 6,
    list padding 4 / gap 2 (§ „Dropdown item — one size everywhere”), a library checkbox, then the value. The
    phone sheet rows keep 44 · 12 8 · gap 10 · regular (a sheet, not a dropdown).
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

#### Filter trigger = library chip with button radius (2026-10-21, filter-chip-v1)

User (2026-10-21): „when active and we show how many filters, use the numbered badge; when active make it black, like
the chip … Actually we can use the filter chip component: it has all we need, but override the rounding to match the
buttons” + „when active, still use the icon”. Figma EVO Cabinet `1175:45818` (active chip: label at 16, numbered badge
16 eight after it, 16 right, 40 high; the user added the leading icon to it). ONE rule in `css/facet-filter.css`
(„Filter trigger”) for every list-toolbar filter trigger and the phone „Filtre” pill:

```html
<button class="chip e-permits-filter-trigger [is-selected]" type="button" aria-expanded="false" aria-controls="…"
        [aria-label="Filtre, 3 aplicate"]>
  <span class="chip__icon"><svg class="icon" aria-hidden="true"><use href="…#icon-filter-lines"></use></svg></span>
  <span class="chip__label">Filtre</span>
  <span class="chip__badge" aria-hidden="true" [hidden]>3</span>
</button>
```

- **Rest:** the library chip (grey `--gray-100`, hover `--gray-250`, keyboard focus = the chip outline), filter icon leading.
- **Active (≥ 1 applied value):** `.is-selected` = black (`inverse-default`, as the selected facet chips), white label
  and icon, the chip's numbered badge `.chip__badge` (white on black, 16, grows into a pill for 2 digits: 19 at „12”);
  hover `inverse-default-hover`. The count = applied VALUES, the same number as the facet chips' badges (the bar line
  says the ROWS: „N rezultate”). Accessible name „<label>, N aplicate” („1 aplicat”).
- **Open** (bar / sheet showing, `aria-expanded="true"`): pressed (`--gray-250`, or black) + the product open-button ring
  (2 white + 5 focus blue, the aria-expanded rule).
- **Nothing to filter:** `aria-disabled="true"` (stays focusable for the reason tooltip) = the library chip disabled look
  (opacity .6, no hover).
- **Only overrides of the library chip:** height 40 desktop (= the search and the `btn-md` „Sortează”) · 36 `--sm` (GEAP
  BO registries + passport lists, their btn-sm toolbar) · 48 phones; radius = the library Button of that size (8 btn-md,
  6 btn-sm); phones keep the chip's full radius because the neighbour „Sortează” is a `btn-pill` there (PO question:
  square both on phones?); the filter-chip type 14/20 medium (16/24 on phones, icon 24) and 16 on the badge side (Figma —
  the library `:has(.chip__badge)` 8 is not used). Library gaps (4 + the badge's 4 margin = 8 label → badge).
- **Where:** Cabinet acts `[data-cab-filter-toggle]` + Solicitările mele `[data-sm-filter-toggle]`, RAP
  `[data-rap-filter-toggle]` („Filtru”), the shell registries `[data-workplace-filter-toggle]` (eKYC 40, GEAP BO 36 —
  the shell removes `--sm` when a product is set), passport lists `renderSfToggle` (`[data-sf-toggle]`), the phone pill
  `[data-filter-all]` (`.e-permits-workplace__filter-chip--all` = placement only). Page rules that sized every toolbar
  chip exclude it (`:not(.e-permits-filter-trigger)` in cabinet-evo.css `.cab-toolbar .chip` and the BO list toolbar
  `.chip` height). Catalog / notifications have no filter trigger (catalog = category chips).
- Demo: sm-01 (rest) · sm-01v / sm-01x / sm-01y (1 / 3 / 7 applied — 7 = every checklist value the Cabinet requests
  have — bar closed) · ek-04o (12, two-digit badge) · sm-01a / pp-01h / rap-01d / dos-05d / ek-04k (active + open).

#### Date range facet (2026-10-20)

User (2026-10-20): „why is Perioadă not also in Filtre on Solicitările mele?” — the Cabinet had a separate
„Perioadă” dialog and eKYC Sesiuni istorice a fixed period list. Now a facet can be a DATE RANGE:
`{ key, label, type: "date", get(row) → ISO day (or date-time), presets: ["azi", "7z", "30z", "an"] (default) |
["azi", "u7z", "u30z", "an"] (dates ahead), today() → ISO day of the page's „now” }`.

- **Value** = ONE token in the usual applied array (so the badge counts 1, „N rezultate”, „Șterge filtrele”, the
  draft / commit and the sessionStorage keep working unchanged): a preset id — resolved against `today()` when
  matching, so „Ultimele 7 zile” stays relative — or `interval:<from>:<to>` (either end may be empty: „din …” /
  „până la …”). Pages match with `GEAPFacetFilter.dateMatch(token, rowIso, today)` (Cabinet `matchesFacets`, the
  shell's `facetMatch` for every registry). Presets: `azi` Azi · `7z` Ultimele 7 zile · `30z` Ultimele 30 de zile
  · `an` Anul acesta (1 ian. – 31 dec.) · `u7z` Următoarele 7 zile · `u30z` Următoarele 30 de zile.
- **Chip**: no period → the normal facet chip. With a period → black, „<label>: <compact range>”
  (`GEAPFacetFilter.dateText`: „12 oct. 2026” · „1–20 oct. 2026” · „28 sept. – 5 oct. 2026” · „28 dec. 2025 – 5 ian.
  2026”; presets show their resolved range too), as the library chip „with close” group: `div.chip[role=group]`
  > `button.chip__label` (the 16 left padding, `title` = full text, ellipsis) + `button.chip__close` (16 icon in the
  library 20 circle, `aria-label` „Șterge filtrul <label>”) — the × removes the period from applied AND draft and
  applies at once (as „Șterge filtrele”), focus back to the chip. Hover: the whole chip `inverse-default-hover`, ×
  `inverse-default-active`. `max-width: 100%` (the 320 cap of value chips would cut the range).
- **Popover** (desktop, `role=dialog` „Filtru: <label>”): 320 wide (the library calendar), presets + „Interval
  personalizat” as radio rows (`label.e-permits-workplace__filter-option` + library `.radio.radio--medium`, the
  dropdown item size: 32 · 6 12 6 8 · 14/20 medium · gap 8), arrows move inside the radiogroup (native). „Interval
  personalizat” reveals `.e-permits-workplace__filter-range`: De la · Până la side by side (8 apart, 4 / 12 / 12
  inset), each the library date picker in the FO field shell (40 high on desktop; typed ZZ/LL/AAAA accepted);
  „Până la” opens its calendar leftwards; the calendar flips up when there is no room below (library). Footer =
  Confirmă / Șterge as every facet. **Surface exception**: this popover is `overflow: visible` (the calendar opens
  out of it; nothing inside reaches the radius) — code-audit `dropdown-surface` „overflow visible” on it is expected.
- **Validation** (Confirmă / „Arată”): a typed date that is not a real ZZ/LL/AAAA date → „Introduceți data în
  formatul ZZ/LL/AAAA.”; custom with both empty → „Alegeți cel puțin o dată.”; end < start → „Data „Până la” nu poate
  fi anterioară datei „De la”.” (US-158 AC-11). Field `is-error` + `aria-invalid` + `aria-describedby`, the
  message in ONE slot under both fields (`.e-permits-workplace__filter-range-errors`, full width — under one 144
  column it wrapped to 4 lines); nothing is applied, focus to the first wrong field. An edit clears the messages.
- **Keyboard**: Tab order radios → fields → calendar buttons → Confirmă / Șterge; Enter (outside a button)
  confirms; Esc in an open calendar closes only the calendar, a second Esc the popover / sheet.
- **Phones** (`mobileSheets`): the chip (with its ×) opens the facet sheet with the same body (radio rows 44,
  fields 48 / 16-24, range padding 8 / 16); in „Filtre” (all) it is a section whose summary is the range text.
  The live „Arată N rezultate” counts only a VALID period; an invalid custom period blocks „Arată” with the
  messages; „Resetează” is enabled as soon as a preset / custom is ticked. The library phone calendar is a fixed
  bottom sheet — the facet sheet panel drops its resting `transform` while it holds a date picker, so the
  calendar covers the screen above the sheet instead of being trapped in the panel.
- **Where**: Cabinet „Solicitările mele” Data depunerii + Data estimată de finalizare (presets ahead) — the
  „Perioadă” dialog was removed; eKYC Sesiuni istorice „Perioadă” on „Finalizat la” (the alert landing
  „Vezi sesiunile” applies `perioada: ["7z"]`). BO Dosare: not used (reported — the registry has Data depunerii /
  Termen columns that would benefit; the passport lists `SF_LISTS` keep their own „Perioadă” period facet).
- Demo: sm-01g (popover / sheet open) · sm-01h (end < start error) · sm-01o (custom 1–10 oct. 2026 applied) ·
  sm-01p (custom range being picked; at 375 the sheet) · sm-01q (Data estimată „Următoarele 30 de zile”) · ek-06b
  (popover) · ek-06g (Decizie + „Ultimele 30 de zile”). Demo helper `ffDate(toggle, facet, { preset | from, to,
  stay, commit })` (js/demo-states.js) for any page.

#### Phone mode — one „Filtre” pill row + bottom sheets (2026-10-17, RAP; opt-in; pill row 2026-10-20)

**Phone toolbar (2026-10-20, user: „on mobile only the Filter button without the other chips, the sort in the same
row, round”; then „sort, Filtre and the search — one height”).** Under the search, ONE row
(`.e-permits-workplace__filter-tools[data-filter-phone-row]`, nowrap, never scrolls, gap 8):
1. **„Filtre”** `button.chip.e-permits-filter-trigger.e-permits-workplace__filter-chip--all[data-filter-all]` — the
   filter trigger (§ „Filter trigger”, 2026-10-21): library chip (round on phones), 48 high (= the phone search), 16/24
   medium, `icon-filter-lines` 24, padding 0 16 0 12, black + the chip's numbered badge when filters are applied. Opens the all-filters
   sheet (every facet as a section incl. date facets; sections with a value open, else the first).
2. **Sort** (pages that pass `sort: <wrapper element>`; today Cabinet „Solicitările mele” `.cab-sort`): the module
   MOVES the page's own control into `.e-permits-workplace__filter-sort` on phones (and back home on desktop), adding
   the library `btn-pill`; it renders 48 · 16/24 medium · padding 0 12 0 16 · chevron 24, shrinks first with an
   ellipsis on its label (the full key + direction are in its `aria-label`). On phones it opens the SORT SHEET
   (since 2026-10-20 — § „Sort sheet on phones”: two radio groups (key, order), „Aplică”; before: the act-row action sheet).
3. No facet chips, no sideways scroll. **Applied state** = the count on „Filtre” + ONE plain line under the row
   (`[data-filter-phone-meta]`): „N de rezultate · Șterge filtrele” (the BO bar wording). Why the line: the count alone
   says how many values but not what they did; the line gives the result count and a one-tap undo without opening the
   sheet (Baymard: applied filters stay visible and removable). „Șterge filtrele” moves focus to „Filtre”.
4. The row and the sort node are built once and updated in place, so focus survives the list re-renders.

**Desktop list toolbars (same day):** search 40 · „Filtre” · sort share ONE height — „Filtre” is the filter trigger
CHIP at 40 / radius 8 since 2026-10-21 (§ „Filter trigger”; before: `btn btn-neutral btn-md`), the sort the library
Medium `btn btn-neutral btn-md` (40, 8/16, 16/22, radius 8, icons 20 `icon medium`) on Cabinet (acts + requests), RAP
and eKYC (the shell drops the trigger's `--sm` when a product is set); the sort button shows the key + a trailing chevron
only (no ↓/↑ — the direction lives in the menu's „Ordine” group and the `aria-label`). The GEAP BO registries keep
the btn-sm 36 „Filtrare avansată” (exception to „One back-office button” below = these four list pages only).
Before (2026-10-17 → 10-20): „Filtre” + one chip per facet on a sideways-scrolling row (each chip its own facet
sheet), sort on its own row (sm-01 at 375: chip row 836 wide in 375). The facet-sheet kind is still in the code, with
no phone entry point. Demo helper `ffFacet(h, facet)` (js/demo-states.js): desktop = the chip; phones = „Filtre” →
the all-filters sheet with that section open and the others folded.

**Figma spec (phone toolbar, 375):** auto-layout row, gap 8, under the 48 search with 16 between; „Filtre” = Chip
instance (Icon leading, 48, radius full, tertiary fill, 16/24 medium, icon 24, padding 0 16 0 12; Selected = black +
numbered badge); sort = Button Neutral (radius full, 48, label 16/24 medium + trailing chevron 24, padding 0 12 0 16,
hug, max = remaining width, label truncates); applied line under the row, 4 gap: „587 de rezultate” 14/20 tertiary ·
„Șterge filtrele” Button text-neutral Small. Desktop: search 40 · Chip „Filtre” (filter trigger 2026-10-21: icon 20 leading, radius 8, 40; Selected = black + numbered badge 16, Figma EVO Cabinet 1175:45818) · Button
Neutral Medium „Data depunerii ⌄”, gap 16.

`GEAPFacetFilter.create({ …, mobileSheets: true, preview(selection) → rows })`. Active only
≤760px (matchMedia; crossing the breakpoint closes any sheet / popover and re-renders).
**eKYC opts in (2026-10-19):** the shell passes `mobileSheets: !!product` + `preview:
previewSelection` (rows of the base · tab · search matching a not-yet-applied selection), so a
product back office (eKYC) gets the sheets and the GEAP BO registries do not. eKYC placement
(e-permits-acte-permisive.css, „eKYC lists on phones”): the bar keeps the BO look (white, 12 / 16,
bottom line = the status tabs' top separator), its chip row bled to the screen edges until 2026-10-20 (−4 / −16,
padding 4 / 16), and the search shares its row with the export button when the list has no
„Adaugă …” (tools `min-width: 0`); the quick search is 48 · 16/24 on phones (the sheet search values). Pages
that don't opt in (every GEAP BO registry) are byte-identical — proved on srv-01 / dos-05 and
rap-01…01d at 1440 + 375 (bar / popover outerHTML + computed styles, HEAD vs tree).
Research (Baymard mobile filtering, NN/g bottom sheets + mobile faceted search, Material 3
bottom sheets / filter chips, Apple HIG sheets, Google Shopping / Zalando / Amazon / Airbnb /
GOV.UK): hybrid = promoted facet chips + one „all filters” sheet, live count on the apply
button, sticky apply at the thumb, search in long facets.

- *(History — replaced by the pill row above on 2026-10-20.)* **One entry point (user, 2026-10-17):** the toolbar button is hidden on phones (`toggle.hidden`,
  `.e-permits-workplace__advanced[hidden]`), the search takes the whole row; the FIRST chip is
  **„Filtre”** (`[data-filter-all]`, `.e-permits-workplace__filter-chip--all`: library `.chip__icon`
  with `icon-filter-lines` 20, padding 0 16 0 12 (12 right with the badge), no chevron, black +
  total count badge when filters are applied) → the all-filters sheet (Google Shopping / Airbnb /
  Zalando).
- *(History, 2026-10-17 → 10-20.)* **Bar** (`.is-sheets`): always visible while there are facets (no toggle), ONE line —
  „Filtre” then the facet chips (same `chipHtml` as desktop: count badge, selected = black) that scrolls
  sideways (`flex-wrap: nowrap; overflow-x: auto`, scrollbar hidden); the page bleeds it to
  the screen edges so the last chip is cut (scroll hint) — RAP: `margin: -4 -16 0`, padding
  4 / 16, 12 under the toolbar, no border. Applied → „N de rezultate · Șterge filtrele” under
  the row (correct Romanian plural `resultsLabel`; the desktop bar keeps „N rezultate”). No
  „Mai multe”, no draft, no „Aplică filtrele” on phones.
- **Search in the popover / sheets** = the library `.search-input medium rectangular` +
  `.e-permits-workplace__search` with the library × / spinner states. The BO look comes from
  e-permits-shell.css, so facet-filter.css restates it for `:is(.e-permits-workplace__filter-pop,
  .e-permits-filter-sheet)` with the SAME values (40 box, 2px transparent border + 1px inset line,
  icon at 12, text at 40 / 12 (40 with a value), hover 2px tertiary, focus brand + 4px
  blue-sky-200, placeholder 14/20, × hover tertiary-hover). The input's size stays the library
  body-sm (14; 12 on phones — as the BO computes it). On pages without js/search.js (RAP) the
  facet filter sets has-value / is-typing / is-ready itself (opt-in pages only). Before
  (2026-10-17) the RAP popover search had the text at 48, a 16px placeholder and no ×.
- **Sheet** = the library `.bottom-sheet` (scrim `__overlay`, `__panel` `role=dialog`
  `aria-modal` `aria-labelledby`, no `__handle` (removed 2026-10-20 — not draggable), `__header`,
  `__content`, `__footer`), created once and appended to `<body>`. Overrides
  (`.e-permits-filter-sheet`): `min-height: 0` (hugs, the library 45vh left empty space),
  `max-height: 90dvh`, top radius 24 on every width (the library squares it ≤768) (phones ≤760 since 2026-10-19: the shared rule „Modals on phones — maximum content space”, 16 from the top, radius 16), `.is-all`
  = `height: 90dvh` (sections open without the sheet moving). Header: title (flex 1) ·
  **„Resetează”** `btn btn-text-neutral btn-sm` (disabled when nothing is ticked) · × = library
  `.modal-close` (static). Content: search `.e-permits-filter-sheet__search` (4 / 16 / 8 — the 4
  keeps the focus ring) when the facet has > 7 values (the popover rule), the popover's
  checklist markup in `.e-permits-filter-sheet__list` with 44px rows (padding 12 / 8, label
  margin 0 — the library `label` adds 6). Long values wrap. Footer (sticky, top border):
  **„Arată N rezultate”** `btn btn-primary btn-lg` full width, `nowrap`, live count via
  `preview(selection)` on every tick (0 allowed: „Arată 0 rezultate”), safe-area bottom.
  „Resetează” sat in the footer first: at 375 „Arată 1567 de rezultate” wrapped to 2 lines →
  moved to the header (Zalando / Amazon / iOS sheets).
- **All filters** (`.is-all`, title „Filtre”): one section per facet —
  `h3.__section-head > button.__section-trigger[aria-expanded][aria-controls]` (56 min, 8 / 16,
  label 16/24 medium, summary of ticked values 14/20 tertiary with ellipsis + `title`, 20px
  chevron) and `__section-panel` (`role=group`, search + list, rendered when opened). Sections
  holding a value start open; none → the first. Divider between sections, none after the
  last. The trigger is an accordion row (as the library `.accordion__trigger`), not a `.btn`
  — the code audit's `button-not-library` on it is expected.
- **Commit model:** a sheet commits on „Arată” (one query, page 1); ×, scrim tap and Esc
  close WITHOUT applying. „Resetează” clears the facet (facet sheet) or everything (all
  filters) inside the sheet only — still applied by „Arată”. Removing one filter = open its
  chip, untick, „Arată”; everything = „Șterge filtrele”.
- **A11y:** focus moves to the panel on open, Tab / Shift+Tab cycle inside it, Esc closes,
  focus returns to the chip (facet) or the button (all); `html.is-filter-sheet-open` locks the
  page scroll; `prefers-reduced-motion` drops the slide. Android Back is not wired (RAP uses
  pushState routing; follow-up).
- **Empty result on phones:** the sheets list only values that still have rows (no dead ends),
  so rap-01d on phones = one filter + a search with no match.
- **Hooks for a page:** `options(facet, selection)` must accept the sheet selection (counts
  under a selection not applied yet); `preview(selection)` returns the row count. Demo states
  rap-04 (row) · 04a (Statut) · 04b (Autoritate + search) · 04c (all filters) · 04d (applied);
  on desktop the same ids run the BO bar / popover path.

### Inline note — info and alerts inside content (rule, updated 2026-10-02)

**One component, one geometry, everywhere** (pages, drawers, modals). Never style a note
per screen — no local padding, radius, font or icon size.

| Use | Helper | Markup |
|---|---|---|
| neutral explanation (grey, "i") | `renderInfoNote(html)` | `.info-box.info-box--neutral.e-permits-info-note` > `.info-box__icon` + `.info-box__content > p` |
| info / success / warning / error | `renderNotice(tone, html, { icon, role, className })` | `.message.message--subtle.banner--{tone}` > `.banner__icon` + `.banner__content > p.banner__text` |
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
- **Two notes in a row = 12 between them** (2026-10-16, user: the passport's „Serviciul este
  inactiv…” warning touched the „Secțiunile marcate RSSP…” info). Generic „Alert stack” rule at
  the end of css/e-permits-acte-permisive.css: any alert / notice (`.message` except
  `--inline`, `.info-box`, `.e-permits-fo-notice`, `.e-permits-fo-infobox`,
  `.e-permits-fo-mnotify-info`, `.e-permits-callout`) directly followed by another gets
  `margin-top: var(--spacing-12)` — FO, BO, Cabinet, eKYC, Ghișeu. Parents that already space
  their children with a `gap` are left out (CSS can't read the gap; the margin would add to it):
  dedicated notice stacks (class containing `__notices`, e.g. Ghișeu `.e-permits-gh__notices`, 12),
  the library `.modal-content` (16) and `.e-permits-fo-payment__body` (32). A new gap-spaced parent
  that can hold two notices goes in that list. `code-audit` `tight-gap` reports „alert + alert”
  under 8.
- **One notice size for in-page banners too (2026-10-16, user):** page-level state banners
  (template „Modificări nepublicate”, classifier „Ciornă nepublicată”, passport „Serviciul este
  inactiv în RSSP” / „activ din nou…”) are this same note — `renderNotice` with a bold lead
  sentence, 12/16 padding, 14/20 text, 20 icon, radius 12 (Figma Ghișeu notice 11881:272146).
  No 16/24 banners, no 24px icons, no close ×. Placement is the only per-screen CSS
  (`className` → a margin when the parent is a block, e.g. `.e-permits-ntpl__unpublished`
  margin-bottom 24). Above a section it keeps the section rhythm; under a section header the
  header → alert gap applies; two in a row = 12 (Alert stack).
- `className` (optional) adds a placement hook to the `.message`; the inline-note geometry
  selectors use `:not(.message--inline)` (kept for specificity) — never style the note itself
  through that class.
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
3. Section **"Taxe"** (tab label **"Taxe și tarife"**, US-199 Azure 94641) — a **stacked list**
   (`renderPaymentList`: groups „De configurat”, then one group per request type; never a table —
   decided 2026-10-10). **One line on top** (`.e-permits-pay__toolbar`): title + count badge
   `badge badge--lg badge--solid-neutral` (gray, = visible rows, AC-02) on the left; right: search
   „Caută taxe” (name RO/RU/EN, code, request type — AC-05) · **„Filtrare avansată”** (AC-06) ·
   „Adaugă taxă” (`btn-secondary`) · ⋮ (Actualizează lista — AC-09 · Exportă taxele — CSV of the
   filtered list, logged „Export taxe” in the Jurnal, AC-10/12). No status chip row: Stare and
   Activ/Inactiv are facets of the filter. Row = name + tags (Activă/Inactivă/Schiță, source,
   „Condiționată”, „Fără ramificație în flux”), meta sumă · moment · generare · termen · vN ·
   Modificat; „Editează” + ⋮ (Publică/Activează, then Dezactivează/Șterge). Empty: search →
   „Nicio înregistrare nu corespunde criteriului de căutare”, filters → „Nu există taxe
   înregistrate” (AC-04/05).
4. Section **"Tarife"** (US-203 Azure 94768) — the service's own tariffs, **same stacked pattern**
   (`renderServiceTariffs` / `renderServiceTariffList`): title + gray count; search „Caută tarife”
   (name RO/RU/EN + Temei legal) · Filtrare avansată (Tip tarif · Tip solicitare · Tip persoană ·
   Subdiviziune · Stare · Activ/Inactiv · Sursă) · „Adaugă tarif” · ⋮ (Sincronizează tarifele din
   RSSP / eAPL — US-206 · Actualizează lista · Exportă tarifele). Grouped by request type; row =
   name + tags (Activ/Inactiv/Schiță, source), meta Sumă și valută · Tip tarif · Tip persoană ·
   Subdiviziune · vN · Modificat; eye (card, US-207) + „Editează”; click / Enter on the row opens
   the card (AC-11). No sync meta line under the title (the card shows „Ultima sincronizare”).
   The tab keeps the 1024 reading column.
   **Not as a table**: sort by column (AC-07) and pagination (AC-08) don't apply to the stacked
   list — the lists are short and grouped; agreed with the PO (user) on 2026-10-10.
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

### Trajectory (traiectoria dosarului) — one component (2026-10-20)

User (2026-10-20): „we have different types of UI for traiectoria dosarului — do as in the first one
everywhere, be super precise, see the subtle background of the current step”. Reference = Figma GEAP 2.0
`aHgwVwiNCOSOqbMhMjjUOj` **9709:1137** (BO dossier „Traiectoria dosarului”), measured from its PNG. ONE
renderer `GEAPTrajectory.html({ steps, layout, bare, label, className })` in `js/trajectory.js` + ONE stylesheet
`css/trajectory.css` (loaded by e-permits-acte-permisive.html, e-permits-shell.html, cabinet-evo/index.html).
Each caller keeps its data and texts and only maps them to `steps[] = { label, state, meta | metaHtml, tagHtml, sr }`.

**Anatomy (horizontal, default)**
- Card `.e-permits-trajectory`: `--color-background-base-default`, 1px `--color-border-base-default`, radius 24
  (the dosar cards; no token), padding `--spacing-20`.
- `ol.__steps` = flex row. Every step hugs its content (`__body`: marker · 6 · title · 6 · meta, all centred,
  first / last step on the card's content edges; **body min-width 40** = 24 + 2 × `--spacing-8`). Steps 2…n
  carry a flex filler `::before` (`flex: 1 1 0`, 16 minimum, no margins) between the two bodies → the free width
  is shared equally.
- **Connector rule (trajectory-gap-v1, 2026-10-21; user: „line closer to the check icons, everywhere”):** the line
  stops **8 (`--spacing-8`) from the 24 marker box on both sides, whatever the label width**, and runs unbroken
  from step to step. It is three pieces meeting edge to edge: the previous body's right half `__body::after`
  (left = 50% + 12 + 8 → body edge) · the step filler `::before` · this body's left half `__body::before` (body
  edge → right = 50% + 12 + 8). The first step has no left half, the last no right half; only the outer ends are
  rounded (no notch at the joins); each half takes the colour of the connection on its side. Measured 8 ± 0.5 at
  1920 / 1440 / 1024 (ek-05, ek-05g, ek-07e, dos-01 / 01b / 01g / 01h, fo-08, pp-10f, short labels „Emis”, „Semnat”);
  before it was (label − 24) / 2 + 8 = 11…63. The vertical layout hides the halves (its `::after` is already 8 / 8).
- Connector: grey `--color-border-base-default` 1.5 (`--border-width-1-5`), top 11.25; brand
  `--color-border-brand-default` 2 (`--border-width-2`), top 11, between two **reached** steps
  (done · current · paused · attention · rejected). Centred on the 24 marker.
- Marker 24 (`--spacing-24`) box: done `circle-checkmark-filled` `--color-icon-positive-default` · current
  `time-filled` `--color-icon-brand-default` · paused `pause` `--color-icon-warning-default` (Figma „Suspended”
  #DC6803; the code had `--apricot-400` until 2026-10-20) · attention `warning-filled` `--color-icon-warning-default` · rejected `circle-error-filled` `--color-icon-danger-default` · todo
  `__dot` = 20 ring, 1.5 `--color-border-base-secondary` · skipped = the same ring **dashed** (grey connectors).
- Label 14/20 medium `--color-text-base-default`, one line; todo / skipped 14/20 regular `--color-text-base-secondary`.
- **Current step (the subtle background):** the label sits on a pill — `--color-background-brand-secondary`
  (#e8f0fb), `--border-radius-4`, padding `0 --spacing-4`, 20 high (= the line height); paused / attention:
  `--color-background-warning-secondary`. The li gets `aria-current="step"`.
- Meta 12/16 regular `--color-text-base-tertiary`, each line one line (date `<br>` who).
- State word for screen readers after the label (`u-visually-hidden`, default finalizat / în curs / suspendat /
  necesită acțiune / nereușit / omis / urmează; callers may pass their own `sr`).

**Vertical** (`layout: "vertical"`, and any horizontal one whose steps do not fit: `.is-stacked`)
- Each step = grid `24 | 1fr`, column gap 12, row gap 4: marker (rows 1–2) · title (padding-top 2 → centred on
  the marker; label wraps; an optional Small tag after it, gap 8) · meta (wraps). Steps 24 apart
  (`padding-bottom: --spacing-24`). The pill grows 4 to the left so the text stays on the meta's line.
- Connector `::after` down the marker column, 8 from each marker, same colours / widths as horizontal
  (brand when the step and the next one are reached).
- `.is-stacked` is set by `GEAPTrajectory.fit()`: the steps are measured at max-content (`.is-measuring`, one
  synchronous pass) against the card's content width, re-checked by a ResizeObserver; a MutationObserver picks
  up every new card. Phones always stack; at 1024 the BO / eKYC cards (736) stack when their steps need more
  (dos-01h needs 800, ek-05g 955). Labels are never truncated.

**Variants:** `--vertical` (long step texts: FO „Statutul dosarului”, Cabinet „Stadiul solicitării”) · `--bare`
(inside another card: no background / border / radius / padding — the Cabinet status card pads it 20 / 16 under
its hairline). No hover (not interactive).

**Where used** — BO dossier Date generale „Traiectoria dosarului” (`renderDosarTrajectory`, shell; dos-01 current,
dos-01b paused, dos-01g all done, dos-01h rejected) · eKYC session „Plan de verificare” + review „Traseul
reviziei” (`trajectory()` in js/ekyc.js; ek-05g current, ek-05d paused, ek-07e rejected + skipped, ek-14f) ·
FO finish (`renderFrontOfficeStep7FromSchema`: tracker horizontal + „Statutul dosarului” vertical with the
„Acum” / „Opțional” Small tags; fo-08, post-process pp-10f / pp-12a / pp-14b / pp-16a / pp-17a) · EVO Cabinet
„Stadiul solicitării” (`timelineHtml` in solicitari.js, vertical + bare; sm-03, sm-04, sm-04b / 04c attention,
sm-05 done, sm-05a rejected). Not trajectories (different components): the FO / Ghișeu wizard stepper
(`.e-permits-fo-stepper`, navigation between form steps), the event log „Jurnal / Istoric”
(`.e-permits-timeline`), the Process Designer case trace (canvas). Ghișeu confirmation and RAP show no
trajectory (RAP's `renderTimeline` in rap-evo.js is dead code, never called).

**Checks:** `tools/ui-qa/specs/trajectory-vs-bo.json` (horizontal, 1440; dos-01 vs ek-05g / fo-08 / pp-10f, dos-01b
vs ek-05d, dos-01h vs ek-07e, dos-01g vs ek-14f) and `trajectory-vertical-vs-bo.json` (dos-01 at 375 vs fo-08 /
sm-04b; fo-08 vs sm-04 at 1440) = 0 property differences (pairs „MISSING” = a state that screen does not have).

**Replaced (2026-10-20):** the BO grid 1·2·2·2·2·1 with left / right aligned edge steps and 2px lines 4 from the
markers; `.e-permits-trajectory__steps--n3…n7`; the FO `.e-permits-fo-finish-tracker` (1.5 lines, no card, labels
only) and `.e-permits-fo-finish-timeline` (grey card, 16 markers, 14/20 texts); the Cabinet 16-marker timeline with
the semibold `.is-now` title; `finishMarkerHtml` (it wrote an inline style).

#### History — Traiectoria dosarului, case path on Date generale (added 2026-10-02; layout superseded 2026-10-20)

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
  Document însoțitor (2026-10-14) = page preview on top + Tip document, [Număr act, Emis la],
  Fișier, Dimensiune, Încărcat / Atașat / Preluat la, Încărcat de (name · role), Sursă,
  Obligatoriu (`yesNo`), Semnătură, Număr dosar — see „Dosar › Documente însoțitoare”.
- Injected footer buttons close through their own handler (`modal.js` binds `data-close`
  only at load).

### Fees — generated by the specialist, then paid (updated 2026-10-02)

**Model:** a dossier has **no fee at submission**. The specialist verifies the case and
then generates the fee(s) — `confirmaTaxa` at "Setarea taxei" or `taxaExaminare` during
"Verificarea datelor". MPay issues the payment note and the citizen is **notified
automatically** (e-mail + MNotify: "Notă de plată emisă — de achitat"); the case waits for
payment, then continues. Rejected cases never get fees. The Taxe și plăți tab is there whenever
the request type can charge (2026-10-14, „Dosar profile — which tabs”), empty until the first fee.

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

### Empty state — one component everywhere (2026-10-04, unified 2026-10-14)

User (2026-10-14, on „Configurează tipul de solicitare”): „every empty state should have the same
empty state, simple as we already use in other places; uniformize all as components.”
**Rule: there is exactly one empty-state component — `GEAPEmptyState`. No other empty-state
markup exists** in any product (BO shell, FO, Form Builder, Clasificatoare page, EVO Cabinet,
RAP, eKYC). Never a bare grey card with a sentence, a hint `<p>` saying „Nicio …”, a dashed div
with an `<img>`, plain text in an empty table row or list item, or a per-screen `__empty` class.

- **Markup** (generated, never hand-written): `.e-permits-empty` (role=status) › `__icon` (48px
  circle, `background-base-secondary`, 24px sprite icon in `icon-base-tertiary`; `loading` = brand
  spinner) · `__title` (14/20 semibold, default text) · `__text` (14/20 tertiary, max 440, 4 under) ·
  `__actions` (20 under, centred, gap 8). `[hidden]` hides it.
- **API** (`js/empty-state.js`, loaded before the page scripts; CSS `css/empty-state.css`; the
  sprite path resolves from the script URL, so `cabinet-evo/` and `rap-evo/` need no rewriting):
  - `GEAPEmptyState.render({ title, text, icon, actionHtml, compact, bare, loading })` — without a
    title, the first sentence of `text` is the title and the rest the line;
  - `GEAPEmptyState.noResults(title, { text, actionHtml, compact, bare })` — search icon, default
    line „Verifică ortografia sau încearcă alți termeni.”;
  - `GEAPEmptyState.tableRow(colSpan, html)` → `tr.e-permits-empty-row > td.e-permits-empty-cell`
    (padding 16, centred, wraps) for an empty table body.
  - Shell wrappers (same component): `renderEmptyState`, `renderNoResults`,
    `renderPassportEmpty(title, message, actionHtml, icon)` (section heading + empty state), and
    `renderStackedList` / `renderEventTimeline` `{ empty, icon }`.

| Variant | Options | Box | Where |
|---|---|---|---|
| Normal | — | 1.5px dashed `border-base-default`, r16, padding 40 24 | page sections: passport / profile tabs, Setări cards, FO intent „Acte emise”, Cabinet / RAP lists, Clasificatoare page |
| Compact | `compact` | same box, padding 24 20 | drawers, modals, side panels: every tab of „Configurează tipul de solicitare”, Taxă / Tarif / Clasificator nou drawers, document preview panel, Form Builder properties panel, FO auth role list, FO Verificare docs |
| Bare | `bare` | no box, padding 24 16 | inside a table row (`tableRow`), a bordered list, a modal list: registries, classifier values grid, fee lists modal, subdivision / RAP field pickers, FO MDocs search, mail / SMS preview panes |
| Bare + compact | `bare, compact` | no box, padding 16 12 | inside a menu, popover or combobox list: „Filtrare avansată” option lists (registry + passport), Inserează câmp / variabilă, template-builder Câmpuri, CAEM, saved cadastral codes, RAP filter options, builder component search |

**Content rules**
- Title = what is missing, short, no final period („Nicio taxă pentru acest tip de solicitare”,
  „Niciun aviz adăugat”). Line = one sentence saying when content will appear or what to do
  („Pașii fluxului apar aici după ce îl alegi în tabul General.”). Keep story-mandated wording
  (US-202 tariffs, US-230 services, FO `emptyText`) as the title.
- Icon from the sprite by subject: `page-text` (documents / acts), `document`, `notification`,
  `receipt-check` (taxes), `coins` (tariffs), `checklist` (flow not chosen), `stamp` (avize),
  `link` (interdependencies, „Folosit în”), `list-bullets` (values, columns), `templates`
  (sections), `user-account` (people, roles, identities), `envelope` / `phone` (mail / SMS
  preview), `home-line` (addresses), `search` (no results), `circle-error` / `warning-filled`
  (load error), `time-filled` (journals).
- **Action only where the user can act**, with the existing button rules: add = `btn btn-secondary
  btn-sm` + `icon-plus-large` (blue Secondary), navigation / reset = `btn btn-neutral btn-sm`. When
  a list's add button would sit right under its own empty state, the button moves INTO the empty
  state while the list is empty and back under the list once it has rows (Interdependențe, Avizare,
  Coloane suplimentare, Builder › Secțiuni). A toolbar add button (passport lists) is not repeated.
- Rights: the action and the line follow the role (Taxe tab: admin gets „Adaugă taxă” + „…până
  adaugi o taxă”, others „Taxele le adaugă administratorul serviciului.”).

**No results ≠ nothing yet.** After a search or filter use `noResults` (search icon). Where the
page has filters, it carries the page's own reset action with the SAME label as the page's reset
control: BO „Șterge filtrele” (`data-filter-clear-all`, passport lists `data-sf-clear="<id>"` via
`sfClearButton(id)`), Cabinet / RAP „Resetează filtrele” (their filter panels say „Resetează”),
request-type actions „Arată toate” (`data-rt-filter="all"`). A list with zero items overall gets the
„nothing yet” empty state, never „Nicio … nu corespunde”.

**Inventory — where each converted empty state lives (2026-10-14)**

| Place | Before | After |
|---|---|---|
| Request-type drawer › Formulare / Documente generate / Notificări (no flow) | `fo-field__hint` „Alege întâi fluxul…” | compact, `checklist`, „Alege fluxul” → General + focus on Flux |
| › Documente generate / Notificări (flow without steps) | `fo-field__hint` „Fluxul ales nu are pași…” | compact, `document` / `notification` |
| › Formulare (search / filter / no actions) | `noResults` normal | compact; filter → „Arată toate”; flow without actions → nothing-yet |
| › Avizare (needs on, no aviz) | add button only | compact, `stamp`, „Adaugă aviz” inside |
| › Taxe | `fo-field__hint` „Nicio taxă…” | compact, `receipt-check`, admin „Adaugă taxă” (parks the drawer, opens Taxă nouă with the request type, returns to Taxe) |
| › document preview panel (no template) | `fo-field__hint` | compact, `page-text` |
| › notification preview (template missing) | `.e-permits-ntpl-preview__empty` | compact, `envelope` |
| Notification preview › SMS / body empty | `.e-permits-ntpl-preview__empty` | bare + compact, `phone` / `envelope` |
| Registry tables (all BO + eKYC registries) | `td.e-permits-workplace__empty` | `td.e-permits-empty-cell` (component cell) |
| Classifier values grid | `tr.e-permits-clas-grid__empty-row` | `GEAPEmptyState.tableRow`; filter-only → „Nicio valoare în acest filtru” |
| Filtrare avansată option lists (registry + passport) | `li.e-permits-workplace__filter-empty` | bare + compact `noResults` |
| Inserează câmp / Inserează variabilă menus | `li.e-permits-ntpl-picker__empty` | bare + compact `noResults` |
| Template builder › Câmpuri | `p.e-permits-dtpl-fields__empty` | bare + compact `noResults` |
| Fee lists modal | `li.e-permits-fee-accounts__empty` wrapper | plain `li` + bare `noResults` |
| Subdiviziuni / Publicare în RAP pickers | `div.e-permits-subdiv__empty` wrapper (normal box) | bare `noResults` |
| Setări › Interdependențe | `p.e-permits-cfg2__empty` + add below | compact, `link`, „Adaugă interdependență” inside |
| Clasificator nou › Coloane suplimentare | `p.e-permits-clas-create__muted` | compact, `list-bullets`, „Adaugă coloană” inside |
| Form Builder › Pas › Secțiuni | `li.e-permits-builder__step-row-empty` „Nicio secțiune.” | compact, `templates`, „Adaugă secțiune” inside |
| Form Builder › câmp › Folosit în | `fo-field__hint` | compact, `link` |
| FO › CAEM search | `div.e-permits-fo-caem__empty` (text) | bare + compact `noResults` (filled at init into `[data-fo-caem-empty]`) |
| FO › saved cadastral codes (US-54 AC-08) | `li.e-permits-fo-caem__empty` | bare + compact, `home-line` |
| FO › intent „Acte emise” none | FO infobox `.e-permits-fo-intent__empty` | normal, `page-text` |
| FO › auth role list, no eligible identity | `.e-permits-fo-auth__role-empty` (grey card) | compact, `user-account` |
| FO › MDocs search | wrapper `.e-permits-fo-mdocs__empty` | wrapper is `[data-fo-mdocs-empty]` only |
| Clasificatoare page loading | `.clas-page__empty` + spinner | `render({ loading: true, bare: true })` |
| Cabinet › Actele mele (no match / none / load error) | `p.cab-empty` | normal `noResults` + „Resetează filtrele” / nothing-yet / error |
| RAP register (no results / load error) + filter options | `.rap-empty-state` box, `p.rap-filter-option__empty` | normal `noResults` (+ „Resetează filtrele” when filters) / error; options bare + compact |

Removed CSS: `.e-permits-workplace__empty`, `__filter-empty`, `.e-permits-fo-caem__empty`,
`.e-permits-fo-mdocs__empty`, `.e-permits-fo-auth__role-empty*`, `.e-permits-fee-accounts__empty`,
`.e-permits-ntpl-picker__empty`, `.e-permits-clas-grid__empty-row`, `.e-permits-dtpl-fields__empty`,
`.e-permits-fo-intent__empty`, `.e-permits-subdiv__empty`, `.e-permits-cfg2__empty`,
`.e-permits-builder__step-row-empty`, dead `.e-permits-builder__source-empty` / `__template-empty`,
`.clas-page__empty`, `.cab-empty`, `.rap-empty-state*`, `.rap-filter-option__empty`.

**Not an empty state (kept on purpose):** inline value placeholders — „Fără subiect” in the mail
preview header (`.e-permits-ntpl-preview__empty`, a field value), `.cell__empty` „—” / „neutilizat
încă” in table cells, „Fără valoare” / „Fără setări” / „Fără reguli” meta, „—” rows in key–value
cards („Nicio taxă · —”, „Acest tarif nu are versiuni anterioare.”); field-level hints that explain a
disabled control (pay „Se aplică” without classifiers, „Formula nu are variabile.”, Setări „Acte
solicitate” when the source service has none); the Cabinet act „Nu există postprocese disponibile…”
line (explains a missing button in an action row); the Form Builder issues header „Fără erori” (a
validation result); layout-only wrappers (`.e-permits-builder__grid-empty` = grid-column span,
`[data-fo-*-empty]` visibility hooks, `tr.e-permits-fo-grid__empty` = the fo-grid table row that
already holds the component).

**Demo states:** request-type drawer `svc-02l` (no flow), `svc-02l1` („Alege fluxul” → General),
`svc-02m` / `svc-02m1` (no document / notification steps), `svc-02n` (Taxe, admin), `svc-02n1`
(Adaugă taxă hand-over), `svc-02o` (Avizare without aviz), `svc-02p` (Formulare search); lists in
modals / menus / popovers `svc-04p1`, `svc-10w3`, `svc-08b1`, `ntpl-02c1`, `trf-02e1`, `ek-04c1`;
previews `ntpl-02b1` (SMS empty); Setări `svc-10l1` (Interdependențe); classifiers `clf-02h`
(Coloane), `clf-02i` (Valori, „Adaugă prima valoare”); FO `fo-03e` (CAEM), `adr-02b` (saved codes),
`pp-02c` (no acts); builder `fb-10` (Folosit în), `fb-01` (Secțiune goală); dossier tabs `dos-01i` /
`dos-01j` / `dos-04m`; users `usr-04`, `usr-u05d`; registries `ek-04f` (search), `ek-04g` / `ek-06e`
(nothing yet), `ek-04h` (error), `ek-04i` (loading), `trf-01b`; Cabinet `sm-05i`, `sm-01e`, `cat-01c`;
RAP `rap-evo/index.html` + a search with no match. Not demoed (data never produces them; code
path only): the request-type document preview without a template, the FO auth list without an
eligible identity, Builder › Pas › Secțiuni (a step always keeps ≥ 1 section).

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
- **Rule — every draft page (2026-10-21, user: „clicking „1 modificare nesalvată” shows a modal
  with the changes”):** wherever „● N modificări nesalvate” shows, it is that button and it opens
  the SAME `#profile-changes-modal` with exactly those changes (count = rows). Pages plug in with
  `registerChangeSource(key, () => ({ name, applies, groups, emptyText, entries(), undo(ref),
  discard(), save() }))` (exported on `GEAPShellApi` for product modules); the status carries
  `changesStatusAttrs(key)` = `data-profile-changes="<key>"`. Entries = `{ undo, group, title,
  tag, detail }` → the same stacked rows: group = the page's section, title = the field label,
  tag Modificat (brand) / Se adaugă (success) / Se elimină (danger), meta „vechi → nou”
  (`changeValue`, one line ≤ 48 chars), „Anulează” per row; footer Renunță la toate · Salvează (the
  page's own save, validation included). Subtitle „{nume} · N modificări · {când se aplică}” —
  never a code. Focus returns to the redrawn status (same zone: header vs save bar), else to the
  page title; Esc closes only the modal (the template sheet stays). Where:
  | Page | Source | Status | Demo |
  |---|---|---|---|
  | Utilizator / Rol profile | built-in (`user` / `role`) | header | usr-u05f, rol-01b |
  | Serviciu › Setări (cfg2) | `service-settings` (field + interdependence rows, grouped by section) | header + sticky save bar | svc-10x, 10x1, 10x2 (one undone), 10x3 (from the bar) |
  | Clasificator › Setări | `classifier-settings` (8 settings, 4 groups) | header (was: none) | clf-04d, clf-04e |
  | Șablon de notificare | `ntpl-draft` (Setări + subject / body / SMS per language) | header (was: none) | ntpl-04d, ntpl-04e |
  | Șablon de tipar (constructor) | `dtpl-draft` (content with fields added / removed, background, test values as ONE row) | sheet head, counted (was: boolean span) | svc-08n, svc-08n1 |
  | eKYC Clienți / Furnizori (page form) | `ekyc-form` (label + section read from the form) | save bar | ek-24h |
  „N modificări nepublicate” keeps its own review (`#pending-changes-modal`, Publică) — service
  header (`data-service-pending`, count = `servicePendingChanges`) and template builder
  (`data-dtpl-pending`). Not statuses (left as they are): the Configurări servicii table cell „N
  modificări nepublicate” (the row opens the passport), drawer footer summaries („Modificări
  nesalvate” in the dtpl footer, rt „N acțiuni · N modificate”), tariffs / taxes (no draft status),
  the notification template „Modificări nepublicate” notice, Process Designer / Form Builder notes.
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
Șabloane / Clasificatoare › Setări); the grey card is only for read-only data. (Historical — this
read view is gone.) `SERVICE_SETTINGS` now keeps only the flags other code reads: Act pe suport de
hârtie · Cu plată · Distribuire automată · Livrare prin MDelivery. Aprobare secundară and Cu
expertiză are per request type (its flow); Suspendare cu coordonare = „Suspendare cu semnarea
deciziei” under Suspendare (Figma comments, Olesea Luchian, 2026-10-09).
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
4. **Only one action besides ⋮ (user 2026-10-14):** it is never icon-only — it is the labelled grey
   `btn-neutral btn-sm` with its leading 16px icon, like „Editează”. **The single view action is
   always „👁 Detalii”** (user, same day: „eye and Detalii as here … change everywhere just Detalii and
   eye”) — no „Vezi documentul / formularul / tariful / detalii”, never „Previzualizează” (too long),
   never the strict eye. `renderRowActions({ preview })` without a primary renders it (aria-label
   „Detalii: <name>”; the `previewLabel` option is gone); rows with `action: { label: "Detalii" }`,
   eKYC primaries and Cabinet ⋮ items use the same word. Navigation to ANOTHER object keeps its own
   label (page-level / card links: „Vezi actul”, „Vezi solicitarea”, „Vezi sesiunea”, „Vezi
   documentele” → tab, the FO finish card „Vezi documentul”).
   Every labelled action has its icon: Editează = `edit`, **Configurează = `settings`**,
   Previzualizează / Detalii = `eye-open` (`ACTION_ICONS` + `actionLabelHtml` in
   js/e-permits-shell.js). The strict icon-only eye stays only next to a labelled primary.
5. **No lone „Detalii” on a clickable row / card (user 2026-10-21, no-lone-detalii-v1: „if it does the same as
   clicking the entire card, remove Detalii”).** When the whole row already opens the same details and „👁 Detalii”
   would be its only action, there is no button at all: `renderRowActions({ preview, rowOpens: true })` returns ""
   (rows with `action: { label: "Detalii" }` drop the action); `renderStackItem` then makes the row the control —
   `tabindex="0"`, `data-stack-row-open`, `aria-label` „<title> — <tags>, deschide detaliile”, Enter / Space = click
   (one shell keydown, after the row-specific ones), focus = the hover band + a 2 px `--focus-ring` outline inside the
   row (`outline-offset: −2px`, the card clips outside). With a primary or a ⋮ nothing changes (the row click still
   opens the details). Applied: BO dossier Taxe și plăți, Avize, Documente însoțitoare / generate / Act; Serviciu ›
   Documente, Tarife, Clasificatoare (read-only roles); Cabinet request rows and document cards. Kept (row not
   clickable or not focusable): data tables (registries, eKYC — `tr` is not a focusable control, the column button is
   the keyboard / screen-reader path), the FO previous-act card, Ghișeu document cards, passport forms.
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
the filled person / business icon (`icon-person-filled` / `icon-business-filled`, 16) everywhere; no Medium
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
(`icon-person-filled` / `icon-business-filled`) via `applicantTags`.

### Servicii › Setări — US-221 (Azure 95229), 2026-10-09

- Tab order: **Setări right after Date generale** (AC-05).
- 11 sections in the story's order, each `renderPassportBlock(title, rows, { actionHtml: Editează })`:
  Solicitant și act · Examinare și distribuire · Suspendare · Semnare · Plată · Livrare și
  eliberare · Contestare · Numerotare · Publicare în RAP · Schițe · Interdependențe (stacked
  list: Editează + ⋮ Elimină; „Adaugă interdependență” `btn-secondary`). There is **no „Alte
  setări”** (removed 2026-10-09): Aprobare secundară and Cu expertiză are set per request type
  (its flow), Suspendare cu coordonare duplicated „Suspendare cu semnarea deciziei”. Demo states
  svc-10a/b/c (change → save → publish) now flip „Termen de suspendare modificabil de specialist”;
  svc-10q opens Interdependențe.
- RSSP values: value left + plain caption „Din RSSP” at the row's right end (`.e-permits-cfg-value--rssp` + `.e-permits-cfg-source`, 12/16 tertiary like the header „sincronizat …”; no tag), also inside the drawer's grey read-only box, read-only for everyone; MPower,
- **Tip solicitant** (read view, drawer, v2) = `applicantTags` with the full names („Persoană fizică” / „Persoană juridică”, never PF / PJ) and the
  filled person / business icon, never plain „PF, PJ” text.
- **Setări (one page; was „Setări v2”, `renderServiceSettingsV2`, states svc-10…10o, svc-10v…10v4):**
  the same sections on one page, edited inline, no drawers / modals. Layout `.e-permits-cfg2`:
  sticky section list left (220px, `__nav-link` 14/20 secondary; hover base-secondary; current
  `aria-current` = brand-secondary bg + brand text medium; focus ring; dot warning = changed,
  danger = errors; sticks under the pinned tab row via `--cfg2-stick`, active section follows the
  scroll), sections right (title 18/26 flush + 14/20 secondary description, then a white
  `.e-permits-ntpl-card` with the drawer's fields; radius 16 + padding 20 — 32 was tried and read
### Action icons — „Editează” = pen, „Elimină / Șterge” = trash (rule, 2026-10-21, action-icons-v1)

User (2026-10-21): „Didn't we discuss that every „Editează” has an edit icon, and „Elimină” has a trash icon? It looks
kind of weird here.” One rule for every product (BO, eKYC, FO, Cabinet, Ghișeu, RAP, builders):

| Action | Icon | Where |
|---|---|---|
| „Editează”, „Editează …” (button, row primary, ⋮ item, section / header / drawer-footer action, icon-only ✎) | `icon-edit` | everywhere |
| every removal: „Elimină”, „Elimină schița / condiția / regula …”, „Șterge”, „Șterge pasul / regula / rândul / secțiunea / câmpul / ciorna / banda / conexiunea …” | `icon-delete` | everywhere |

- Icon before the label, **label colour** (`fill: currentColor`; destructive variants → red), library markup only:
  `.btn` + variant + size with `<svg class="icon small">` + `<span>` label; menu items `.e-permits-fo-intent-menu__item`
  with the 20 icon (24 in the phone row menus).
- **Built in, so new code gets it by default:** shell `actionIconFor(label)` (exact `ACTION_ICONS` first, then the
  „Editează” / „Elimină” / „Șterge” prefixes) feeds `actionLabelHtml` (row primaries, `renderRowActions`,
  `EDIT_LABEL_HTML`, hand-written text buttons: `${actionLabelHtml("Elimină")}`) and `renderStackMenu` (the label wins
  over the item's `icon`, so a „Șterge …” item can never show the default pen). Modules outside the shell (Form Builder,
  Process Designer, eKYC config, fo-grid) use their own `icon("delete", 16)` + `<span>`; Cabinet / Ghișeu / act-row
  menu items pass `icon: "icon-delete"`; `core/classifiers.js` `discardMeta` names `delete` (the sprite has no `trash`).
- **Icon-only removes that delete data get the trash too:** the rule-builder condition × (`e-permits-doc-cond__remove`:
  BO documents, Form Builder, Process Designer — it deletes the condition from the rule), the FO repeatable item /
  activity card / „Alt document” card (deletes the card with its answers), the user drawer role combination.
- **Exceptions — no trash (they delete nothing, or the dialog already says it):**
  1. confirmation-dialog footers — the library modal footer (`modal--footer` / `modal-buttons`: `askConfirm`, Ghișeu,
     eKYC dialogs) and the FO confirm dialog (`e-permits-fo-instance-switch-modal__actions`) carry no icons (§ Modal);
     the dialog's own icon / title names the removal;
  2. clear / dismiss controls: the search clear × (`btn-icon clear`, „Șterge căutarea / adresa căutată / codul
     cadastral”), chip × (`chip__close`, `e-permits-fo-subgen-chip__remove` — takes a value out of a multi-select),
     file-item × (`e-permits-fo-document-remove` — detaches an uploaded / MDocs file from the request; the library File
     Input close action), „Șterge filtrele”, the filter popover „Șterge” (`data-filter-reset` / `data-sf-reset` — clears
     the selection), the editor tool „Șterge formatarea” (eraser).
- Enforced by `tools/ui-qa/component-audit.mjs` rule 6 (`action-icon` / `action-icon-colour`, spec `actionIcons`).

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
  save bar pinned at the viewport bottom. Columns: left **02s1–02s10** = one screen per section-list
  item (current item highlighted; links svc-10e…svc-10q), middle **02 · 02a · 02o · 02b · 02c ·
  02v4**, right **02e1 · 02j · 02j1 · 02h1 · 02k1 · 02n · 02n1 · 02n3** (scrolled to their
  section / new block). 24 flows „Flow · Setări · …”: section-list item → section screen (left
  gap), change → state (right gap), save/publish chain, errors after Salvează. Section-list icons =
  central icon system **filled=off, stroke=1, radius=2, join=round**, 16px (as the code sprite).
  Local components (🧩 Componente locale › „Componente · Setări”): Setări · Element listă secțiuni
  `10638:1533`, Setări · Bara de salvare `10638:1534`, Setări · Câmp read-only `10638:1577`;
  svc/field-row has optional „Text secundar” + right „Caption”. Helpers (do not edit): builder
  `10640:1502`, default spec `10648:1502`, scroll `10666:1502` (SCROLL(block, {key|node|top})).
- **Figma — „Alte setări” removed (2026-10-09, Olesea's comments):** the section and its section-list
  item were removed from every Setări screen. 02s11 and its flow are deleted. Screens scrolled near
  the bottom (02a, 02n, 02n1, 02n3) were re-clamped so the page still ends flush: Column moved down,
  and the sticky list's padding reduced by the same amount.
  - **02a** is now „Suspendare — comutator schimbat”: scrolled like 02s2, with „Termen de suspendare
    modificabil de specialist” switched off, „Suspendare” current with the orange dot, and the save bar.
  - **02b / 02c** have the switch saved off. The 02b publish modal lists „Suspendare · Termen de
    suspendare modificabil de specialist: Da → Nu”.
  - The old „Aprobare secundară” flow is now „Termen modificabil”, starting on that switch in 02.
  - **06a** Taxe ⋮ menu: only „Exportă taxele” (the two sync options are hidden).
  - **01d** sync result: new „Tarife” row, „RSSP: 1 nou · 0 actualizate · 0 neschimbate (cele noi
    așteaptă …)”, with the parenthesis in tertiary via a range override.
- **Figma — Subdiviziuni de examinare picker (2026-10-09):** in every Setări screen (all 25), the old
  checkbox list is an instance of **„Setări · Subdiviziuni de examinare”** (`10703:1782`; Stare =
  Implicit · Deschis · Selecție aplicată · Eroare). The field = title + hint, then the library
  `select-input` (Label off) and the library `input-chip`s; a raion chip has the raion in medium and
  „· toate N / X din N” in regular secondary (range override); „Încă N · Arată toate” =
  button-text-circular Primary Small.
  - New local components in Componente · Setări:
    - „Setări · Opțiune listă” `10700:1518` (Bifat × Stare Implicit/Hover; 32px row, hover
      `background/base/secondary-hover`);
    - „Setări · Antet secțiune listă” `10700:1558` (Selecție Toate/Parțial=Indeterminate/Niciuna ×
      Stare; 48px, counter on the label line);
    - „Stare goală · fără rezultate” `10703:1516` (bare; title uses Body/Small 500 — there is no 600
      style);
    - „Modal conținut / Subdiviziuni de examinare” `10704:2158` (Stare Implicit · Căutare · Selectate
      · Fără rezultate; 680×698, the list fills and clips).
  - The shared **Modal** set gained **Tip=Selecție** (`10704:158854`, User Management page): 720×880,
    the content fills the height, and the footer is space-between with a **Total** text property
    (the number bolded by a range override) on the left of Renunță · Aplică.
  - Blocks **02p · 02p1 · 02p2 · 02p3 · 02p4 · 02p5** sit at the bottom of the right Setări column
    (x 8913, from y 12804), cloned from 02s1. They are linked to demo states **svc-10w…svc-10w5**:
    open · search „Orhei” + raion ticked · Selectate (134) · no results · applied (chips + bar +
    „modificat” dot) · error after Salvează (red field + „1 câmp de corectat” + error dot).
  - Flows: „Deschide selecția” goes from the 02 field (lane 8833, label left of the lane). Five
    more run right of the column, in lanes 11057–11377: „Caută raionul · bifează antetul”,
    „Selectate”, „Căutare fără rezultat”, „Aplică”, „Elimină chipurile · Salvează”.
  - The new field is 28px shorter. In scrolled screens whose section sits below it, the Column moved
    down 28 and the sticky section list's padding dropped 28. The 8 flows that start on 02 elements
    below the field had their start segment moved up 28.
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
  (Tip document · Resetare contor · „Șablonul numărului” · Valoare inițială · Valoare curentă) +
  „Exemplu (numărul următor)”, max one rule per document type. The template is ONE text input
  (fixed text typed directly, maxlength 40, e.g. `{AUT}-{NR:4}/{YYYY}`); under it a wrap row
  `.e-permits-cfg-num-tokens` of parameter buttons `btn btn-neutral btn-sm e-permits-cfg-num-token`
  (each holds a `code.e-permits-doc-kw`, transparent — an allowed code-token use) that insert
  `{NR:4}` `{YYYY}` `{YY}` `{MM}` `{DD}` `{AUT}` at the caret, then the hint paragraph. Validation:
  empty → „Câmpul este obligatoriu.”; {NR} not exactly once → „Șablonul trebuie să conțină
  numărul {NR} o singură dată.”; unknown token → „Parametru necunoscut: {X}.”; Exemplu = „—”
  while invalid. Demo `svc-10k1` (filled), `svc-10k2` (error). Figma 02s7 / 02s7a. RAP = rows checkbox + switch
  „Anonimizare” (IDNP / nume PF always anonymised, switch locked on).
- Validation: „Câmpul este obligatoriu.” / „Introdu un număr întreg mai mare ca zero.” under the
  field. A section with ≥ 1 field error: its card (`[data-cfg2-body]`) gets `.has-error` = 1.5px
  `--color-border-danger-default` border (user, 2026-10-13), in sync with the red nav dot (`cfg2Refresh`). Save logs one audit event per changed field („Secțiune · Câmp: vechi → nou”), the header
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
- Columns: Cod (96) · Denumire RO · Traduceri RU · EN (220, two lines "RU · …" /
  "EN · …", ellipsis per line) · Valoare-părinte (150, code + name, tooltip) · extra columns ·
  Activ de la (112, `dd.mm.yyyy`) · Stare (180: Activ/Inactiv + Nouă/Modificată +
  "până la …") · actions (136, the only pinned column). Cod is NOT pinned.
- Toolbar: registry search · chips Toate/Active/Inactive with `.badge--lg.badge--solid-light`
  (as Tarife/Plăți) · Importă CSV · Adaugă valoare. **No checkbox column / bulk bar** (removed
  2026-10-12 after PO review: no bulk need — activate/deactivate per row).
- **Editing:** click a row (or Enter/Space on a focused row, rows are `tabindex=0`) or the
  pencil opens the `.e-permits-user-create` drawer: Identificare (Cod, Valoare-părinte) ·
  Denumiri (română required, rusă, engleză) · Coloane suplimentare (toggle / select / input
  by type) · Valabilitate (two library date pickers). Footer: summary ("Salvarea deschide o
  ciornă peste vX.") · Anulează · (new only) `btn-secondary` "Salvează și adaugă alta" ·
  Salvează. Activation is not in the drawer — it is a confirmed row action.
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
- List (2026-10-17): search „Caută după nr. act sau denumire” (matches the act number, the object name and
  the act type, diacritic-insensitive) + „Filtre” = the shared facet filter (`GEAPFacetFilter`, as RAP:
  `.e-permits-workplace__advanced.cab-filter` button + `.e-permits-workplace__filters.cab-filters` bordered bar
  16 under the toolbar; phones = `mobileSheets` „Filtre” pill row + bottom sheets; button `btn-md` 40 = the search) with facets Statut (values as Small
  tags), Denumire act, Autoritate, Subdiviziune (offered when ≥ 2 values). The old status chips are gone (one
  status filter). > 10 acts → `CabEvo.pagerHtml` (prefix `cab`). Only the subject's own acts: an unknown subject
  / one without acts gets the shared empty state (the legacy `permits` demo list was removed); an MPower that
  expired / was revoked → `CabEvo.restrictionHtml` alone (no data, no actions). Demo pp-01h (Statut = Expirat),
  pp-01s (bar / sheet open), pp-01t (`?acte=multe` → pager), pp-01u (search by number), pp-01v (restriction),
  pp-01w (no acts).
### List rows — act + request (EVO Cabinet, FO #intent, Ghișeu; 2026-10-20)

ONE row component (`GEAPActRow.html`, js/act-row.js) for the act rows (FO „Ce vrei să soliciți?”, Ghișeu picker,
Cabinet „Actele mele permisive”) and the Cabinet request rows („Solicitările mele”):
- **Card**: padding 16 · radius 16 · stroke `--border-width-1-5` `--color-border-base-default` · tertiary hover;
  title 14/20 medium + Small tags on the title line · **8** · meta 14/20 `--color-text-base-tertiary` · actions
  right, centred on title + meta · alert full width under them (12 above). Acts keep the blue document icon;
  request rows have NO icon (grid `1fr | auto`).
- **Meta slots** (`GEAPActRow.metaParts` / option `metaSlots`), same order for both: 1 number (plain text — no
  copy icon in any list) · 2 what (act: service name; request: „Eliberare · <serviciu>”, `__part--what`) ·
  3 authority code · subdivision (`__part--long`) · 4 the key date (act: valabil până la / expirat la; request:
  „Creată …” (draft; the removal date only on the profile) / Depusă / Finalizată). FO / Ghișeu defaults = slots 1 · 3 · 4.
- **Long names**: desktop (> 760) title ONE line + ellipsis, meta ONE line — slot 2 shrinks first, then slot 3;
  1 and 4 never. js/act-row.js `syncCut` puts the full text in `data-tooltip-text` (plain tooltip, hover) on the
  cut title / meta; the row (`data-tooltip-focus`) shows the title's on keyboard focus (js/icon-tooltip.js).
  Phones: title ≤ 2 lines (line-clamp), meta wraps.
- **Title 16/24 medium at EVERY width** (2026-10-20, user: „make the card title 16 px on desktop too”): one line +
  ellipsis + tooltip on desktop, ≤ 2 lines on phones; act + request rows only (other document cards keep 14/20).
- **Row anatomy — ONE at every width (trigger-corner-v1, 2026-10-21; user: „on desktop let's also put the action for
  cards fixed in the corner — for both Solicitări and Acte” + „if there is enough space on desktop, keep the status badge
  as it was, next to the title”; phones since action-menu-v1 / act-trigger-fixed-v1, 2026-10-20)** — acts AND requests,
  one CSS block („ROW ANATOMY” in e-permits-acte-permisive.css), no markup change: the row is a **flex-wrap box (row gap
  8, column gap 4, `align-items: flex-start`)** and the content block + the title row are `display: contents`, so icon,
  title, tags, meta and notice are its items, placed by `order`. The desktop grid with the right action column is gone.
  | | Desktop (> 760) | Phones (≤ 760) |
  |---|---|---|
  | Line 1 | [24 document icon (acts), on the 24 title line] · **title 16/24 + tags INLINE** (title → tag 8, tags 4), tags centred on the title line | [24 icon, 2 above the 20 tag line] · **tags only** (4 apart), from 16 / 16 |
  | Title | on line 1, ONE line + ellipsis + tooltip (js/act-row.js syncCut); shrinks before the tags (`flex: 1 1 0`, `min-width: 0`, `max-width: max-content`); a CUT title under 200 gets `.is-title-tight` (js/act-row.js syncTitleRoom) → `min-width: 200`, the tags that no longer fit wrap to line 2 (761–1023) | line 2, full card width, ≤ 2 lines (line-clamp) |
  | Meta | own line, full width, ONE line — slot 2 shrinks first, then slot 3 (ellipsis + tooltip); `min-width: 0` keeps it inside the card | own line, full width, wrapping |
  | Notice / alert | full width, 12 above | same |
  | Trigger | absolute, **top = right = 16 − (32 − 24) / 2 = 12** inside the border = centred on the title line (centre 28) | absolute, **top = right = 16 − (32 − 20) / 2 = 10** = centred on the tag line (centre 26) |
  **The row trigger — ONE rule for ⋮ and „Postprocese ⌄”** (a row whose only action would be „Detalii” has none —
  no-lone-detalii-v1, the card is the action): the action wrapper is `position:
  absolute` in the card's top-right corner (the card `position: relative`). Line 1 reserves **`--row-trigger-w` + 8**
  through the row's `padding-right` (16 + R); `--row-trigger-w` = the button's rendered width, written by js/act-row.js
  `syncTriggerWidth` (read all, then write if changed; CSS fallback 32 = the ⋮). Measured: ⋮ 32 → R 40, „Postprocese ⌄”
  132 → R 140. Every full-width line below line 1 (meta, notice, retry; phones also the title)
  takes R back (`flex-basis: 100% + R`, meta `100% + 18 + R`, `margin-right: −R`) = full card width. No trigger (paper /
  expired acts with `hideEmptyAction`, requests whose only action was „Detalii”) = no reservation (padding-right 16). Menus: anchored under the trigger, right-aligned, flipped up
  when the screen has no room below (desktop: js/act-row.js fitMenu; Ghișeu its own, against its scrolling window;
  Cabinet requests CabEvo.fitMenu); pressed + focus ring through `aria-expanded`; the card never clips them.
  **Verified** with a row-bounds assertion (every painted descendant inside the card's inner box — the meta's 18 dot-clip
  strip excluded; title inside the 16 padding; a cut title has its tooltip; the trigger overlaps nothing) at 1440 / 1024 /
  761 / 375 / 320 on sm-01, sm-01u, sm-01f, sm-02, pp-01, pp-01a, pp-01r (hover), pp-01t, pp-02, pp-02a, gh-02j, plus
  2 / 3 / 4 cloned tags and long titles. Parity `cabinet-request-row-vs-act-row.json` = 0 at 1440 / 1024 / 375 / 320 — act
  vs request differ only by R. Known limit: Ghișeu (desktop-only) forced to 320 has a 256 card → the status tag wraps
  under the icon. Card: padding 16, radius 16, stroke 1.5.
- **Phone list rhythm (≤ 760, 2026-10-20)** — Cabinet list pages (Solicitările mele, Actele mele permisive,
  Catalog, Notificări): ONE 16 step page title (or its description) → search → „Filtre” / sort row (Catalog: the
  category chips) → first card; the applied line „N rezultate · Șterge filtrele” = 8 under the pills, then 16 to
  the cards; cards 12 apart. Desktop keeps 24 / 16 / 24. One block at the end of cabinet-evo.css.
- **Request row actions** (row-kebab-v1, 2026-10-20 — user: „Back to 3 dots, Acțiuni is too ambiguous” and „the 3
  dots as it was, absolutely positioned on mobile, so the badge sits nicely with even top and left padding … we
  economise the space”; replaced the labelled „Acțiuni ⌄” of action-menu-v1): ONE icon-only ⋮ = library Strict · Icon
  Only · Small `btn btn-neutral btn-sm btn-icon-only cab-card__more` (grey at rest) (32 square, radius 6 = the height / radius family of
  „Postprocese ⌄”; no fill → tertiary-hover → tertiary-active; open = tertiary-active + the focus ring through
  `aria-expanded`), `aria-label` „Acțiuni pentru <name>” (name = the row title), `data-tooltip-label` „Mai multe
  acțiuni”, `aria-haspopup="menu"` + `aria-controls`, opening the anchored menu (every action of the request, no
  downloads, danger last). A row whose only action is „Detalii” has NO trigger (no-lone-detalii-v1, user 2026-10-21:
  „if it does the same as clicking the entire card, remove Detalii”) — the card is the action: `aria-label`
  „<name> — <status>, deschide detaliile”, click / Enter / Space, the card's hover + focus ring, title / tags use the
  full width (sm-01: Magazin „Fresh”, Laboratorul…, Cafeneaua „Prut”). **Every width** (trigger-corner-v1; desktop was the right column until 2026-10-21): the
  ⋮ is `position: absolute` in the card's top-right corner (desktop 12 / 12 on the title line; phones as follows) — top = right = 16 − (32 − 20) / 2 = 10 inside the border, so
  its centre = the centre of the 20 tag line (26 from the top) and the tags start at 16 / 16; row 1 (the tags, 4 apart by
  column-gap, wrapping) reserves 32 + 8 on the right (row padding-right 56); title / meta / alert take the 40 back
  (`flex-basis: 100% + 40`, `margin-right: −40`) = full card width. Every request row has a status tag, so row 1 always
  exists. Since act-trigger-fixed-v1 the acts' „Postprocese ⌄” sits in the same corner through
  the same shared rule (Row anatomy above; the Cabinet-only block in cabinet-evo.css is gone).
  **The row** (click / Enter / Space) ALWAYS opens the request's details — every status, drafts included (user
  2026-10-20: „clicking on the entire card should always show the details, not redirect to the full flow”); the flow
  actions stay explicit: ⋮ (Continuă schița, Suplinire informații, Achită, Depune contestație), the alert's inline
  link, the details page. Row `aria-label` „<name> — <status>”. Demo sm-01u (⋮ open), sm-01w (opens up), sm-02 (draft
  menu, danger), sm-03i (draft row → details). Parity spec `cabinet-request-row-vs-act-row.json` lists the ⋮
  differences as intended. § „Row action menu on phones”.
- **Row alerts = ACTION ONLY** (user 2026-10-20): warning when the applicant must act (Informații suplimentare,
  Spre achitare — live countdown + „Finalizare estimată”) ending with ONE inline action link
  (`a|button.link.link-primary.link-sm.cab-alert-link`: „Trimite informațiile →”, „Achită acum →”, the old row
  buttons' handlers, own tab stop); error for an expired payment (no link); INFO for a refused request inside its
  appeal window („Puteți depune contestație până la … · countdown · Depune contestație →”, 2026-10-20 — a right
  with a deadline, the official matrix); no alert for drafts (removal date in the meta) nor for waiting states (în
  examinare, termen, tacit → the profile's „Stadiul solicitării”); never an expired „Informații suplimentare” (it
  is „În derulare” again — § „Request statuses”). Data-driven: `REQUEST_UI` in solicitari.js (status → tag tone · alert · date slot). Acts: the amber locked notice (it blocks the pill); the blue paper-act notice stays
  (explains why there is no pill) — PO to decide.
- **List width**: the Cabinet list pages (acts, requests, catalog, notifications) use `--cab-list-width` = the
  header content box (`--fo-page-width − 2 × gutter` = 1200) → edge to edge with the EVO logo / account menu
  at 1440 / 1024 / 375 (as RAP); profiles keep the 1024 reading column (`--cab-content-width`).
- **Sortează** (requests, desktop + phones): `btn btn-neutral btn-md cab-sort__trigger` (40 = the search; key
  label + trailing chevron only since 2026-10-20 — no direction arrow; `aria-label` „Sortează: <key>, <direction>”,
  `data-act-sheet-title="Sortează"`; on phones a 48 pill in the „Filtre” row, its menu = the action sheet) › `.cab-menu` with two radio groups
  (`.cab-menu__label` + `ul.cab-menu__group[role=group]`): „Sortează după” (Data depunerii · Data estimată de
  finalizare · Numărul dosarului · Serviciul solicitat · Autoritatea emitentă · Statut) and „Ordine” (labelled for
  the key: newest / oldest, A–Z / Z–A…); a pick applies, resets to page 1 and is announced (`[data-sm-sort-status]`
  live region). **PO note:** US-19 AC-03 / US-158 AC-09 ask for sortable column headers; with rows instead of a
  table the same keys and directions live in this menu and the trigger shows the active key (direction in the menu
  + the accessible name).
- Parity: `tools/ui-qa/specs/cabinet-request-row-vs-act-row.json` (pp-01 ↔ sm-01, 0 differences).

- Act rows (user 2026-10-17: „compact, as on the «Ce vrei să soliciți» screen”, no institution icon) = the FO
  intent act row itself, `ul.e-permits-fo-intent__list.cab-act-list > li.e-permits-fo-lib-item.e-permits-fo-intent-act[data-cab-card]`
  via `GEAPActRow.html` (js/act-row.js): blue document icon · title + the Cabinet Small tag (CabEvo.tagHtml tones)
  („Aprobare tacită” instead of „Valabil” for a tacit act) · meta number · „valabil până la / expirat la <date>” · authority code · subdivision (text) ·
  the „Postprocese ⌄” button only when a post-process is available (menu items `data-cab-pp`). The whole
  row (click / Enter / Space) opens the act profile; locked act = the FO locked notice (pill disabled); paper act =
  the same notice slot in the info tone, no pill. The old card ⋮ is gone: „Detalii” = the row, „Descarcă actul
  (MDocs)” = profile › „Vezi act permisiv” › Descarcă (pp-01o). A menu that would leave the screen flips side
  (`CabEvo.fitMenu` → `.is-end` / `.is-start`). Solicitările mele never had institution icons (stack meta text).
- „Anulare” (US-55 AC-09 / AC-10, 2026-10-17): `postProcesses.anulare` in `data/acte-permisive.json`, available
  from Valabil and Suspendat, offered where the service passport allows it (now the DEMO service); consequential
  (the confirmation), FO step 2 = „Motivul anulării” + note; demo pp-01p (Valabil), pp-01q (Suspendat, profile
  menu), pp-17 / pp-17a (FO).
- Act profile — rebuilt 2026-10-21 (act-profile-v1): see **„Act profile — EVO Cabinet (act-profile-v1)”** right below
  (the 2026-10-17 version with the meta row, the „Vizualizare act” data dialog and „Data eliberării” is gone).

### Act profile — EVO Cabinet (act-profile-v1, 2026-10-21)

User: „the profile as best practice; optimise, but don't miss anything; what the Azure stories ask must be covered”.
Best practice used: GOV.UK summary list (each fact once), NN/g key facts first, the UK driving-licence page (what you
may do before admin metadata), GoBusiness (action-driven). Then two user directions the same day: the header in the
look and feel of a YouTube watch page (grouped grey buttons, a compact facts card) — **look and feel only, not its
structure**: an authority „channel” row (avatar + name + subdivision) was built and REJECTED („screenshots are look
and feel; research before copying a layout”); and **full container width** for the act AND the request profile.
Renderer `cabinet-evo/cabinet-evo.js` › `renderDetail` (+ `actHeaderDate`, `actNotice`, `actHistory`,
`issuingDossierOf`, `fitActActions`); CSS `cabinet-evo/cabinet-evo.css` › „Act profile (act-profile-v1)” (+ the
separate „Request profile — full container” block); coverage `tools/persona-test/specs/cabinet-requests/ACT-PROFILE-COVERAGE.md`.

| Part | Markup / rule |
|---|---|
| Container | full list width (`--cab-list-width`, 1 200 at 1440) — `.cab-main__container:has(.cab-act-profile …)` / `:has(.sm-profile …)`; the catalog service profile keeps 1024. Long text keeps ~75ch lines (facts-card notice; request status text + notices). Rows keep the BO label column (256). |
| Header | `CabEvo.pageHeader({ back, title, titleId, subtitle, bodyHtml })` (`subtitle` / `bodyHtml` optional, the other profiles unchanged): ‹ Actele mele permisive · `h1` = the object (wraps) + `p.cab-page-header__subtitle` = the act type (service title, 16/24 regular secondary) in `.cab-page-header__titles` (gap 4). No meta row. |
| Action row | `.cab-act-header__bar > .cab-act-header__actions`, LEFT-aligned under the title (16), ONE line, gap 8, in priority order: `btn btn-primary btn-md` „👁 Vezi act permisiv” (every status) · `.e-permits-fo-intent-act__action[data-cab-act-action=postprocese]` „Postprocese ⌄” (only when eligible; `disabled` + `aria-describedby` the notice while one is in progress) · `a.btn.btn-neutral.btn-md[data-cab-act-action=request]` „📄 Vezi solicitarea” (the issuing request). What does not fit → `hidden` (out of the tab order) and listed in the trailing `.cab-act-header__overflow` „⋯” (`btn btn-neutral btn-md btn-icon-only`, `aria-label="Mai multe acțiuni"`, only when something overflowed) — its menu = the row action menu: „Vezi solicitarea”, separator, `li.cab-menu__label` „Postprocese” + the act's items (danger last after a separator; pending → every item disabled with the reason as 2nd line). `fitActActions()`: all reads first (natural widths with `.is-measuring`), then writes; ResizeObserver on the bar + fonts.ready; the menu is rebuilt only when the overflow set changes. Phones ≤760: buttons 48, the primary fills the free room; the „⋯” menu opens leftwards from its button, max `100vw − 44`. 1440: everything visible, no „⋯”; 375 / 320: „Vezi act permisiv” + „⋯”. |
| Key-facts card | `.cab-act-header__facts` (grey `--color-background-base-secondary`, r16, 16 / 20, edges on the section cards = −12 margin, 16 under the actions, gap 12): `p.cab-act-header__key` (14/20 medium; whole parts wrap, no separators) = `Nr.` + the copy component · the Small status tag („Aprobare tacită” instead of „Valabil” for a tacit act) · ONE status date (`actHeaderDate`): Valabil „Valabil până la 15 septembrie 2028 (704 zile rămase)” (brackets, never a line-leading „·”; no end date → „Valabilitate nelimitată”), Suspendat „Suspendat până la …”, Retras „Retras la …”, Expirat „A expirat la …”, Anulat „Anulat la …” · then the status notice (library `message message--subtle banner--{info,warning} message--small cab-message#cab-act-notice`, ≤ 1 `.cab-alert-link`) · `button.cab-alert-link.cab-act-header__more` „Vezi toate detaliile” (scrolls to and focuses „Detalii act”; no hash — the Cabinet routes by hash). |
| Status notice (`actNotice`, only when useful; never repeats a date of the facts line) | pending post-process (warning, icon-time) „<b>X în curs.</b> … solicitării GEAP-…” + „Vezi solicitarea →” · paper act (info) the offline text, no Postprocese · Suspendat (warning) „<b>Activitatea autorizată nu poate fi desfășurată pe durata suspendării.</b>” + who decided (`la cererea titularului` / `de <autoritate>`) + decision + reason + „Cere reluarea valabilității →” (when Reluare is eligible) or „se reia automat” + the request · Retras / Anulat „<b>Actul nu mai este valabil.</b>” + who + decision + reason; decided by the AUTHORITY and within `appealDays` → warning + „Poți depune o contestație până la …, din solicitarea care conține decizia.” + „Vezi solicitarea →” (Feature 90818: the contestație belongs to the dossier); otherwise info + „depune o solicitare nouă” · Expirat (info) + „Depune o solicitare nouă →” (catalog) · Valabil with ≤ 60 days left (warning) + „Inițiază prelungirea →” (eligible) or „Depune o solicitare nouă →”. |
| Sections (BO, `profileSection`) | [Beneficiar — first when a representative acts (`perspectives[as].mpower`)] · **Ce permite actul** = the configured fields (US-161 AC-29) through `GEAPActView.fieldsHtml` (the request Act tab's renderer: groups, lists, grids with „Arată toate (N)”); the first group takes the name „Ce permite actul”, the next keep their passport titles; empty fields hidden; a value equal to the page title is not repeated · **Detalii act**: Numărul dosarului electronic (copy; the issuing request, else `dossierNr`) · Seria și nr. documentului tipărit · Data aprobării tacite · Data emiterii · Valabil din (only when ≠ Data emiterii) · Valabil până la (only for Suspendat / Retras / Anulat — for Valabil / Expirat it is the header's status date) · Data suspendării (Suspendat) — Data retragerii / anulării = the header's status date · **Autoritatea emitentă**: Denumire · Subdiviziunea emitentă · Telefon · E-mail · [Beneficiar — for the owner] · **Istoric**. |
| Istoric (`actHistory`, US-162 AC-14) | `GEAPTrajectory.html({ layout: "vertical", className: "cab-act-history" })` card (r16 on phones): Cerere depusă (date + time · request type · request link) → Aprobare tacită → Act emis (date · authority · subdivision; „pe hârtie”) → post-processes from the perspective's requests (Duplicat emis, Act reperfectat, Valabilitate prelungită / suspendată / reluată, Act retras / anulat — date · `la cererea titularului` / `din inițiativa <cod>` · request link; one in progress = current) → a status change with no request (`statusChange`) → Valabilitate încheiată (Expirat) → next, dashed: Sfârșitul valabilității / Reluarea valabilității. The suspension in force = paused (amber), retras / anulat / expirat = red. A moment without a date is left out; a paper act shows no GEAP post-processes. |
| „Vezi act permisiv” | opens the act document directly — `GEAPActView.create({ documentTitle: "Vizualizare act", onDocumentDownload })` (options added 2026-10-21; defaults = the RAP „Forma de tipar a actului” · Imprimă, unchanged): the MDocs A4 page (loading / errors / watermark as before), subtitle = the act type (no number), footer „Descarcă” (icon-export) · „Închide”. The old data dialog is not used in the Cabinet any more (all its data is on the page). |
| Data | `data/cabinet-evo.json › actProfiles[act]`: `statusChange { initiator: titular | autoritate, reason, decision, dosarId? }`, `suspensionDate / suspendedUntil / withdrawalDate / cancellationDate`, `tacitApprovalDate`, `printedDocumentNumber`, `dossierNr` + `requestSubmitted` (the issuing request when it is not in „Solicitările mele”), `specificFields`. Requests started by the authority: `initiatedBy: "autoritate"` (Solicitările mele timeline: „Procedură inițiată de autoritate”, „Decizie semnată”). |

Demo (deep links `?act=<id>` + `?as=`): pp-01d Valabil · pp-01e post-process in progress · pp-01i Expirat · pp-01j Suspendat
at the holder's request · pp-01k Retras at the holder's request · pp-01l tacit · pp-01m / pp-01o „Vizualizare act” (A4) ·
pp-01n the Suspendat A4 · pp-01q the visible menu (desktop „Postprocese”, phones „⋯”) · pp-01x / pp-01y the configured grid
on the page (collapsed / expanded) · pp-01z the depot A4 · **pp-03** Anulat by the authority (contestație term) · **pp-03a**
paper act · **pp-03b** Suspendat by the authority („Cere reluarea valabilității →”) · **pp-03c** Valabil expiring in 45
days, representative (Beneficiar first, „Inițiază prelungirea →”) · **pp-03d** Istoric · pp-01v the expired-MPower
restriction (no profile reachable).
- Suspendare / Retragere first open `[data-cab-pp-modal]` (consequence + Continuă). **UX proposal** —
  the spec does not ask for it; keep it labelled as such in Figma.
- Every action redirects to `e-permits-acte-permisive.html?flow=full&pp=<type>&act=<id>#request`.

**Entry 2 — „Ce vrei să soliciți?” (US-191)** — never skipped (unless notarial proxy).
„Solicitare nouă” is always there; under it the acts of the current service with ≥1 post-process.
- The screen body = `GEAPFormRender.intentHtml` and the act rows = `GEAPFormRender.actRowHtml` (2026-10-15: one renderer with the Ghișeu request window — the document card
  `.e-permits-fo-lib-item`: padding 12, radius 12, hover, blue document icon, title + Small status tag, 12px meta
  number · „valabil până la 15 septembrie 2028” · subdivision, pill menu). The FO lists only the allowed
  post-processes; „Solicitare nouă” = `intentNewHtml()` (arrow, goes on).
- Locked act (2026-10-16, user: „full width, in a nice container”): `.e-permits-fo-intent-act.is-locked`, the
  trigger `disabled`, and `__pending` = the inline note **Mesaj · subtil warning**
  (`div.message.message--subtle.banner--warning.e-permits-fo-intent-act__pending` > `.banner__icon` `icon-time`
  + `.banner__content > p.banner__text` „**Reperfectare în curs** · dosar C-2026-004733. Un alt postproces se
  inițiază după finalizarea acestuia.”) — options `pendingTitle` (bold) + `pendingText`. Geometry = the Inline
  note (padding 12/16, radius 12, icon 20 in the tone colour, gap 12, text 14/20 default, bold 500), also on the
  FO page (the inline-note rule is scoped to `:is([data-demo-flow="back-office"], .e-permits-fo-intent-act)`).
  Placement: grid `1 / -1`, its own row under icon + title + meta + action — full card width (13 from the card's
  outer edge = 1 border + 12 padding, both sides and the bottom), **12** above it (row gap 4 + margin 8); icon and
  pill stay centred on title + meta. Phones (≤760): tags · title · meta · pill (row 3) · notice (row 4, 12 above),
  still full width. Demo: FO `pp-02d` (`?incurs=<act id>`), Ghișeu `gh-02t`.
- The post-process menu (2026-10-16, user: „one menu”): the renderer always adds `.e-permits-stack__menu` →
  padding 4, item gap 2, items 32 high, 14/20 medium, 20 icon, icon–label 8, padding 6 12 6 8, radius 6, width
  = longest item (min 180), 6 under the trigger, right-aligned (left-aligned ≤720), dropdown-effect surface;
  disabled-with-reason items greyed (`--color-text-disabled-default`, not-allowed). The FO-only 270-wide /
  48-high / 16-24 size is gone.
- No acts: `[data-fo-intent-empty]` holding the shared empty state (title = config `emptyText`, line „Un act apare aici după ce este emis…”, `page-text`)
  „Dumneavoastră nu aveți acte emise pentru serviciul dat.”

**The wizard** (`body[data-fo-postprocess]`, `startFrontOfficePostprocess(act, pp)`; Solicitare nouă
calls `stopFrontOfficePostprocess`). It reuses the primary FO wizard; only content changes:

| Step | Post-process content |
|---|---|
| 1 Date solicitant | `[data-fo-pp-request]` `.e-permits-fo-pp-request` card: Serviciul · Tip solicitare · Numărul actului permisiv (read-only); role „Schimbă” hidden |
| 2 Detalii solicitare | `.e-permits-fo-pp-lead` (type · act no. · object), then per type: reperfectare 09 = motiv + primary form prefilled; reperfectare 10 = address cascade, activity type (+ hemp fields), responsible person, scope; prelungire = act data read-only; duplicat = motiv (Deteriorare / Pierdere); retragere = subdiviziune (09, read-only) + motiv; suspendare = motiv, data, termen + note; reluare = motiv + note |
| 3 Acte necesare | previous act as an MDocs attachment („👁 Detalii” → `#fo-certificate-modal` viewer with „Descarcă”, 2026-10-20) + reason-specific doc fields |
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
`pp-16/16a` reluare, `pp-17/17a` anulare.

### Request statuses — Solicitările mele (status matrix, 2026-10-20)

Spec: `tools/persona-test/specs/cabinet-requests/STATUS-MATRIX.md` (Azure stories + the official „Matrice acțiuni
contextuale”). Everything is data + the ONE status map `REQUEST_UI` (tag tone · row alert · date slot) + the
profile's `statusNow` / `timelineEvents` in `cabinet-evo/solicitari.js`; no new component.

| Status / variant | Row (tag · alert · meta date) | Profile („Stadiul solicitării” + tabs) | Notification (notificari.js `kind`) | Demo |
|---|---|---|---|---|
| Schiță | neutral · none · „Creată …” (removal date only on the profile); signed draft + blue „Semnat electronic” | Continuă schița / Elimină schița + the US-21 info notice „Schița salvată dar nefinisată va fi ștearsă automat în decursul a N de zile.” (`[data-sm-draft-kept]`, N = first save → removal) | „Schița a fost salvată” (`draft-saved`) | sm-03 |
| Schiță cu notă de plată „În așteptare” (US-17) | as Schiță | text names the note; Taxe tab; „Elimină” says the note is cancelled | — | sm-03g |
| Schiță semnată + achitată (US-18 AC-09) | as Schiță + „Semnat electronic” | text: transmitted automatically after the grace period; timeline signed → paid → „Confirmarea depunerii” (removal date kept: PO Q5) | — | sm-03h |
| Schiță eliminată automat (US-29 AC-02) | not listed (`autoRemoved`: `draft.expires < today`) | no profile — `#dosar/<id>` shows the list with an info notice + link to the catalog (`[data-sm-removed-notice]`) | „Schița a fost eliminată automat” (`draft-removed`, „Vezi detalii”) | sm-03d, nt-01d |
| Continuă / Elimină — error (US-29 AC-01) | `?redirectionare=eroare`: row / ⋮ / profile → `.cab-retry` „Schița nu s-a deschis. Datele salvate nu s-au pierdut.” + „Reîncercați”; `?eliminare=eroare`: the first removal fails → error notice in the FO confirm dialog, primary becomes „Reîncercați” (`openConfirm` onConfirm returning `false` keeps it open) | | | sm-03e, sm-03f |
| În derulare | info · none · „Depusă …” | „În examinare · termen …” | „Solicitarea a fost depusă” | sm-04 |
| În derulare — după suplinire (US-24 AC-20) | as În derulare | text „Informațiile … au fost transmise pe …”; timeline „Informații suplimentare solicitate” → „Informații transmise” → „Examinare reluată” | „Informațiile au fost transmise” (`supplement-done`) | sm-04j, nt-01e |
| În derulare — suplinire expirată (US-24 AC-03) | as În derulare (`normalize()`: an `info` past `info.until` becomes `derulare` + `resumed.kind = "expirat"`) | text „Termenul de suplinire a expirat pe …”; Data suspendării kept; timeline „Suspendare încheiată” → „Examinare reluată” | „Termenul de suplinire a expirat” (`supplement-expired`) | sm-04i, nt-01f |
| Informații suplimentare | warning · „Trimiteți informațiile … · countdown · Trimite informațiile →” | Suplinește informații | „Autoritatea a cerut informații suplimentare” + `details` „Motivul suspendării” / „Neconformități depistate” (`info-requested`, `.nt-item__details`, US-126 AC-16) | sm-04b, nt-01g |
| Spre achitare | warning · „Achitați taxa … · Achită acum →”; expired note = error (PO Q1) | MPay badge | „Aveți o notă de plată de achitat” | sm-04c, sm-04g |
| Finalizat · Aprobat | ONE success tag „Aprobat” (SR „Aprobat (finalizată)”; no „Finalizat” tag, outcome-tag-v1) · none · „Finalizată …” | Vezi actul · Descarcă; duplicate: Act „Exemplar — Duplicat al actului …”, validity from `validFrom` | „Actul permisiv a fost emis” | sm-05, sm-05p |
| Finalizat · Aprobat (decizie: retragere / suspendare / reluare) | as Aprobat | tab „Decizie” | „Decizia a fost emisă” | sm-05b, sm-05q, sm-05r |
| Finalizat · Aprobat tacit (US-157; demo `?tacit-dosar=<id>`, the seed has none) | ONE blue tag „Aprobat tacit” (SR „… (finalizată)”) · none · „Finalizată …” | „Aprobată tacit pe …” · Vezi actul · Descarcă | — | sm-05t, sm-05u |
| Finalizat · Respins | ONE danger tag „Respins” (SR „Respins (finalizată)”) · INFO while `canAppeal` (30 days = `appealDays`, PO Q3) | Descarcă decizia · Depune contestație | „Solicitarea a fost respinsă” | sm-05a, sm-05o |

Profile variants: **Livrare** (US-161 AC-16) from `delivery.paper` = `mdelivery` (row „Metoda de livrare” EVO Cabinet +
„Pe hârtie prin MDelivery”, „Adresa de livrare” composed from raion / localitate / stradă / număr / bloc / apartament
/ cod poștal) or `ghiseu` („Locul ridicării” = subdiviziunea); the timeline's „Act emis” says where (sm-04l, d-livada).
**Depusă de un reprezentant** (US-161 AC-11 / US-19 AC-17): `filedBy` → „Beneficiar” + „Depusă de reprezentant” role
groups + the MPower card with its status (`span.is-expired` = neutral Small tag look when Expirată / Revocată; the FO card
is green „valid”); the timeline names him; every action stays (sm-05s).
Not built (PO questions in STATUS-MATRIX.md §4): expired note mapping (Q1), „Aprobat tacit” as a status (Q2), the appeal
start point / period (Q3), paper-issuance states (Q4), the draft timer on signed + paid drafts (Q5), fee vocabulary (Q6),
withdrawal (Q7), suspension details in the profile (Q8), table vs rows (Q9), „Sesizările mele” (Q10), the status card
(Q11), notification wording (Q12).

### EVO Cabinet › Solicitările mele + Catalog (added 2026-10-12)

> **Rows, not cards (user, 2026-10-12):** the list is the app's stacked list read at 14px —
> each dosar its OWN bordered box (radius 16, 12 between boxes — user: „separate, not integrated”), row padding 16/20, title 16/24 semibold +
> status tag (24, 14 medium) + marks; meta lines 14/20 tertiary („Tip · Serviciu”, „Autoritate ·
> Depusă … · nr (plain since 2026-10-20 — no copy in lists)”), wrapped parts drop their dot (`.is-row-start`); deadline = one
> 14/20 line with a 16 icon in the tone (warning #dc6803 / brand) and the date in medium; actions
> right = one labelled primary (US-19 names) + ⋮ without that action; hover = tertiary fill, focus
> ring inset; new row = brand-secondary fill; phone: actions under the text, primary full width,
> ⋮ right. Toolbar Filtre / Sortează = `btn btn-neutral btn-md` + 20 icon (the search height, 2026-10-20), „N pe pagină”
> = `btn-text-neutral btn-sm`, chevron for menus; every cabinet menu also carries `.e-permits-stack__menu` (32px items); ⋮ =
> `btn btn-strict btn-sm btn-icon-only` (32, radius 6) — same height as the labelled action.
> **Profiles (dosar / act / catalog service) open with the BO detail header** — `CabEvo.pageHeader({crumbs, title,
> titleId, aside, meta})` → `.e-permits-page-header.cab-page-header` (no inset, page column width): breadcrumbs
> (list › service › nr; the first crumb is a real link with the back hook) · 24/32 title · meta row label 12 /
> value 14 split by separators (`syncHeaderMeta` drops a wrapped row's first separator). Profile actions =
> `btn btn-md btn-rounded` (16 icons). No back button, no `.cab-facts` in profiles.
> The card / strip description below is the earlier version (kept for the acts list).

Spec: Feature 90817 — US-19 88207, US-158 91295, US-161 91355, US-29 88532, US-24 88527,
US-135 90946, US-159 91297; catalog US-10 88202. Figma EVO Cabinet „Solicitarile mele” 508:9600,
profiles 544:13632 / 545:2582 / 553:4320 / 544:20022 / 544:20754 / 544:20755. Map:
`tools/persona-test/specs/fo/full-flow.md`.

**One page, three views.** `cabinet-evo/index.html?view=solicitari|acte|catalog` (default `acte`);
No compartment tab row (removed 2026-10-12, user: EVO's own navigation leads there; views are reached by URL and cross-links). `?as=<subject>` = perspective (FO subject ids; the avatar menu roles carry `data-cab-as`),
`?auth=0` = visitor (catalog only, „Autentifică-te” instead of the avatar). `cabinet-evo.js` owns
the header, the nav and the acts; it exposes `window.CabEvo` (`icon`, `escape`, `copyValueHtml`,
`closeMenus`, `cabUrl(view, params, hash)` keeps `as`/`auth`, `longDate`, `longDateTime`,
`setHeaderTitle`). `solicitari.js` and `catalog.js` render their view into `[data-cab-view]`.
Data: `data/cabinet-evo-solicitari.json` (statuses, chips, services, help, perspectives → dosare),
`data/cabinet-evo-catalog.json`; subjects / acts from `data/acte-permisive.json`.

**List** = the acts page vocabulary: `.cab-intro`, `.cab-toolbar` (search · Filtre chip · „Sortează”
chip = label + chevron → `.cab-menu--wide` with `menuitemradio` + trailing check), `.cab-chips`
(Toate / Schiță / Necesită atenție [accent badge] / În derulare / Finalizate), then the rows,
`.cab-pager`, empty = `GEAPEmptyState.noResults("Nu au fost găsite rezultate pentru criteriile
selectate.")` (paths fixed with `../`), errors = `GEAPEmptyState.render` + „Încercați din nou”.
Card: title = object, `.cab-card__service` = „Tip · Serviciu”, meta = authority · Depusă/Creată
date · nr (plain, no copy in lists). Deadline strip under the meta (`.cab-card__foot`) — warning tone = action pending
(Schiță „se elimină automat pe”, Spre achitare „Achitați taxa până la”, Informații suplimentare
„Trimiteți informațiile cerute până la”), info tone = În derulare „Răspuns până la” / tacit
„Termenul de examinare a expirat pe”; Finalizat has no strip, the ⋮ moves into the tags row.
Marks before the status tag: „✓ Aprobat”, „✕ Respins” (`--danger`), „Disponibilă aprobarea tacită”
(`button.cab-mark` + library `.tooltip` on hover/focus). Tags are sentence case on this page
(`.cab-page .status-tag { text-transform: none }`).
⋮ items per status: Vezi detalii · Continuă schița / — / Elimină schița · Suplinește informații ·
Achită N MDL · Descarcă certificatul · Vezi actul / Descarcă actul (MDocs) · Descarcă decizia ·
Depune contestație (30 days after the decision). FOD2 targets (all carry the cabinet instance
`&solicitant=<as>` — EVO → service hand-over, see Catalog): draft → `?flow=full&schita=<nr>
[&pp&act]#request-step-<last step>`, suplinire → `&suplinire=<nr>#request-step-2`, contestație →
`&contestatie=<nr>#request` (was `#choice-authenticated`; the instance is not chosen twice).

**Profile** (`#dosar/<id>`, aligned with RAP / BO 2026-10-17) = `article.cab-profile` › the public BO
page header (`CabEvo.pageHeader`: ‹ Solicitările mele, the object as title, meta Numărul dosarului ·
Tipul solicitării · Stare (Tag · Small + marks) · the status dates) › `.e-permits-dosar-profil__panel`
of BO sections (`CabEvo.profileSection` / `detailCard` / `detailRow`, css/bo-profile-parts.css):
**Stadiul solicitării** (the request status card above — replaces the old FO tracker, callout, loose
action row and the separate „Istoric complet”), Date generale (conditional rows hidden when empty —
US-161 AC-05…08), Beneficiar + Solicitant „Eu” (FO identity cards `CabEvo.identityCardHtml` under BO
section titles, MPower card when representative), Date solicitare, Contacte, Documente însoțitoare
(`.cab-docs` of the shared Document · card `CabEvo.docRowHtml`), Livrare, Taxe (only with a payment
note; Data achitării only when Achitat), Act permisiv / Decizie (only Finalizat), Ai nevoie de
ajutor? (contacts = `a.e-permits-dosar-profil__link`). Tags: Schiță neutral, În derulare info,
Spre achitare / Informații suplimentare warning; a finalized request shows ONLY its outcome (outcome-tag-v1,
2026-10-21): Aprobat success, Aprobat tacit blue, Respins danger („Finalizat” only when the outcome is unknown),
hidden „ (finalizată)” for screen readers; mark „Aprobare tacită” (pending, În derulare) = the blue tag as a `button.cab-mark` (tooltip with the explanation; the
code-audit `button-not-library` on it is intended).
Download error (US-19 AC-14) = `message banner--error` after the clicked scope (`[data-sm-dl-scope]`).
Expired payment note (US-135 AC-14, 2026-10-17; demo `?nota=expirata`, sm-04g / sm-04g1): status unchanged
(„Spre achitare”, the mapping is a pending PO decision — MCabinet 95895), no „Achitare” / MPay badge / ⋮ pay
item; the status card shows „Spre achitare · termenul notei de plată a expirat pe …” + the error `.cab-message`
„Taxa a expirat. Achitarea nu mai este posibilă.” in place of the button; the row's deadline line says it; Taxe ›
Starea notei = red „Expirat”. Failed redirect to the suplinire form (US-24 AC-04, demo `?redirectionare=eroare`,
sm-04h profile / sm-04h1 row) = `.cab-retry` (error notice + btn-strict „Reîncercați”) under the action.
„Data estimată de finalizare” (US-19 AC-02): `estimatedEnd` = the examination term while open (Informații
suplimentare too) and the finish date after; rows show „Finalizare estimată …” / „Finalizată …” where the
deadline line does not already carry the date. „Termenul de examinare” stays visible in Informații suplimentare
(US-161 AC-06: shown whenever it has a value — Date generale row + header meta).

**Modals**: Elimină schița = FO confirm modal with `--danger`; MPay stand-in = the same modal (note
data pre-filled, „Achită” → `?achitat=<id>`, „Anulează plata” = status unchanged); Filtre = FO doc
modal shell with authority checkboxes and two date-range pickers (AC-11 inline error).

**2026-10-20:** the table below was replaced by the shared request rows + „Sortează” (§ „List rows — act + request”).
**Batch 2026-10-17 (Azure stories = the spec):** the list is a TABLE on desktop (columns of US-19 AC-02: Numărul
dosarului · Serviciul solicitat [tip · obiect] · Autoritatea emitentă [subdiviziune] · Data depunerii · Data
estimată de finalizare (always — finished = the finish date) · Statut [tag + result / tacit mark + countdown] ·
Acțiuni [pinned]; DISPLAY order Nr · Serviciul · Statut · Data estimată · Data depunerii · Autoritatea · Acțiuni so
the deciding columns fit the 1024 column — Nr and Acțiuni pinned, the last two scroll in; deviation from the AC
order, reported) with header sorting (AC-03, US-158 AC-09: `aria-sort` + chevron; another column starts in its
natural direction, dates newest first); phones keep the cards + „Sortează”. „Filtre” = the shared facet filter
(Statut + Autoritatea emitentă, multi-select — US-158 AC-04 / 05; the single-select status chips are gone);
„Perioadă” was the FO dialog with the two date ranges (AC-06 / 07 / 11) — since 2026-10-20 they are the date range
facets Data depunerii / Data estimată de finalizare of „Filtre” („Advanced filter › Date range facet”). The list shell (intro, toolbar, facet
bar) is built once, the results redraw (`ensureListShell`; profile in `[data-sm-profile-view]`). Row buttons
„Continuă” · „Suplinire informații” · „Achitare” · „Vezi actul” (AC-05…07). Profile = „Stadiul solicitării” +
tabs Date generale (default) · Date solicitare (solicitant, date, contacte, documente, livrare, Taxe at filing
— AC-15) · Taxe (AC-18…20, + Numărul dosarului, „Statutul notei”) · Act / Decizie (+ the act's
service-specific fields, AC-29); „Ai nevoie de ajutor?” under the tabs. Labels per the AC: „Statutul
dosarului”, „Statutul notei”.

**Representative after MPower expiry** (US-159): neutral callout with lock icon on top
(`CabEvo.restrictionHtml`), cards `.cab-card--static` with only nr, serviciu, data depunerii, statut; no ⋮,
no profile, search / chips / sort still work. On Actele mele permisive the same notice stands ALONE — no
list, no search, no actions (Feature 90818: the representative's access is restricted completely).

**Returns** read by the list: `depus=<nr>&obiect=&pp=&act=&subdiviziune=` (FOD2 S11), `schita=1&pas=`
(draft saved), `achitat=<id>` / `plata=anulata` (MPay). Demo errors: `eroare=lista|cautare|mpower`,
`descarcare=eroare`. FOD2 builds these with `frontOfficeSolicitariUrl()` / `frontOfficeDraftUrl()`
in `js/e-permits-acte-permisive.js` (S11 lead + „Mergi la Solicitările mele”, draft banner + toast,
instance-switch text link).

**Catalog** (`?view=catalog`, `#serviciu/<id>`): search (name, code, institution — diacritic
insensitive) + category chips + `.cab-card` per service (act type · term · cost meta, „Online” tag);
service page = `.cab-profile` › public BO header (meta Instituția · Tipul actului · Termen · Cost ·
Disponibil; primary „Solicită online”) › panel: lead (hint + `.cab-lead`, 12 inset) + BO sections Despre
serviciu / Documente necesare (2026-10-17). Target (`requestTarget()`):
visitor → FO MPass (`?flow=full`). **EVO → service hand-over** (user rule 2026-10-13, ⚠ de confirmat
cu PO / tech): signed in to EVO, the MPass session AND the instance the person acts as in the
cabinet (`?as` = own PF / own PJ / MPower entity, the identity in the cabinet header) go to the
service as `?flow=full&solicitant=<as>` — the FO's existing subject param — so the instance choice
(S3) is skipped: that instance has acts for the service → `#intent` (US-191, its own acts), otherwise
→ `#request` (step 1 „Date solicitant” with it pre-selected). Hint: „Depuneți ca <nume>. Puteți
schimba ulterior.” (+ the acts sentence on `#intent`). Switching later = the existing role menu /
„Schimbă” (S1–S3). An instance whose type the service does not accept (`service.applicants`) still
goes to `#choice-authenticated`. A fresh MPass login with no EVO instance (`mpass-test.html` →
`#choice-authenticated`) still chooses. Actele mele → post-process already carries the instance
(the FO selects the act's holder from `?act=`).

**Page glue classes** (cabinet-evo.css, no visual identity of their own): `.cab-view` (view
container), `.cab-login`, `.cab-message` (the static notice strip outside cards), `.cab-notice` /
`.cab-callout` / `.cab-state` (24 above), `.cab-section`, `.cab-docs` / `.cab-docs__download`,
`.cab-roles`, `.cab-profile` / `.cab-profile__lead` (profile shell + the blocks above the first section),
`.cab-status*` (request status card), `.cab-lead`, `.cab-applicants` / `.cab-applicant`
(PF/PJ icon + full name), `.cab-tooltip` (max 320), `.cab-sort` / `.cab-sort__trigger`;
`.sm-profile` / `.cat-service` are hooks only. Open buttons/chips keep the focus ring here too
(`.cab-page .btn[aria-expanded="true"]`, the shell rule — this page does not load
e-permits-shell.css). Container = 1024 fixed, fills below; gutters 24 / 16 ≤760 (= RAP). Copy values in
the header meta / detail rows = the shared `.copy-value` (2026-10-20); on phones the copy-number meta item spans
both columns (`:has(.copy-value)`).

**Demo states**: `sm-01…01l` list (chips, search, empty, sort, filters, validation, applied,
page 2, tooltip, per page), `sm-02…02e` ⋮ per status, `sm-03…03c` Schiță (profile, confirm,
deleted, post-process draft), `sm-04…04f` În derulare / tacit / Info / Achitare / MPay /
returns, `sm-05…05d` Finalizat aprobat / respins / retragere / download error / act ↔ dosar,
`sm-06/06a` errors, `sm-07…07c` representative (valid, profile with MPower, expired, MPower
error), `sm-08…08b` returns from FOD2; `cat-01…01c` catalog, `cat-02…02f` service page per
session / instance (`02b` MPower PJ, `02e` MPower PF, `02f` own PF with acts), `cat-03…03b` where
„Solicită online” lands without an EVO instance, `cat-04` / `04a` hand-over → step 1 as the MPower PF /
MPower PJ instance, `cat-04b` instance with issued acts → „Ce vrei să soliciți?” for it.

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

### eKYC back office — a product on the permits back-office engine (added 2026-10-13)

Azure project „eKYC” (read-only). Batch 1: US-UI-01 91104 shell & nav · US-UI-02 91107 login ·
US-03-10 89193 MPass · US-05-10-B 89241 roles · US-UI-03 91108 + US-05-14 89248 + US-05-15 89249
dashboard · US-UI-04 91109 Sesiuni active · US-UI-05 91110 Sesiuni istorice. Figma (layout only):
eKYC file `SqMGpRKEppJLcvn7HMzOPR` — Shell 8443:121911, Login 10077:46089, Dashboard 10077:39036,
Sesiuni active 6637:144392, Sesiuni istorice 10040:23230.

**Architecture (decision).** eKYC is not a copy of the back office: it is a *product mode* of the
same page and engine. `e-permits-acte-permisive.html?flow=ekyc` → `js/e-permits-acte-permisive.js`
maps `ekyc` to the `back-office` flow (all BO CSS keeps applying), and `js/ekyc.js` (loaded in
`<head>`, before the shell) sets `window.GEAPShellProduct`. The shell (`js/e-permits-shell.js`,
„Product mode” at the top) then:
- loads `rolesUrl` (`data/ekyc-roles.json`, same schema as `e-permits-roles.json`: groups →
  assignments → `menuProfile`; `menus` → groups → items with `shellView`) after `product.load()`;
- dispatches `shellView`s the product `handles()` to `product.showView(view, item)`; groups with an
  empty `label` render without a heading; a „Configurare” group stays visible in a product;
- runs the registry engine for product kinds: `product.registries[kind]` = `renderCell`,
  `searchText`, `sortValue`, `filterToken`, `openRow`, `exportRows`, `emptyHtml`;
  `product.facets[kind]` are merged into `FILTER_FACETS` (a facet may carry `tone(value)`);
  views may set `searchPlaceholder` / `toolbarLabel`;
- routes `product.route(hash)` first, uses `product.logoutUrl`, skips the dossier data, and gives
  `product.init(api)` the engine: the render helpers (tags, dates, page header, info card,
  stacked list, timeline, empty states, copy codes, row actions, fo-select), `showShellToast`,
  `askConfirm`, `exportCsv`, `showRegistry(db, { sortKey })`, `hideShellPages`,
  `openProfilePanel` / `closeProfile` (the dosar profile panel and its „Înapoi la …” button) and
  the panel elements.
Without a product nothing changes for permits (checked: svc-07a, dos-01, trf-01, usr-01, srv-01,
auth-01, auth-03, clf-01 — identical to HEAD). Brand: „EVO eKYC” / „Back Office” in the sidebar
and header (`brand()`), the login says „EVO eKYC · Consolă de administrare”.

**Nav and roles** (`data/ekyc-roles.json`, MPass roles, US-03-10 CA-3): Administrator platformă —
Dashboard · Monitorizare (Sesiuni active, Sesiuni istorice) · Configurare (8 items) · Administrare
(Utilizatori); Operator (revizie), Supervizor, Auditor — Dashboard + Monitorizare. Since batch 3 every
Configurare / Administrare item is a real screen (`js/ekyc-config.js`, see „Batch 3”); the
`ekyc-placeholder` view stays in ekyc.js but no menu item uses it.
Icons = 20px masks per `data-nav-id` (`ek-*`) in `css/e-permits-shell.css`. The bell shows the
active-alert count and opens the Dashboard alerts.

**Data** `data/ekyc-sessions.json` (deterministic seed, regenerate with `node tools/ekyc/seed-sessions.mjs data/ekyc-sessions.json` — demo-state IDs depend on it): `clients` (Relying Parties), `useCases`
(code, IAL, steps, scoring), `providers`, `alerts`, `active[]`, `history[]`. A session = id,
correlationId, clientId, useCaseCode, status, ial, startedAt, lastActivityAt, flowVersion,
`steps[]` (code, label, provider, fallback, threshold, weight, optional, status done | current |
pending | failed, score, completedAt, error), `device` (or null), `events[]`; history adds
completedAt, durationSeconds, decision, finalScore (null without a decision), scoring, job, review.

**Screens**
- *Login* = `bo-login.html?product=ekyc` (same card; states login · redirecting · processing (new,
  after the MPass return) · denied 403 · unavailable · expired · logout toast).
- *Dashboard* (`#ek-dashboard`): filter row `.e-permits-ekyc-dash__filters` = library segmented
  control (1 h / 24 h / 7 zile / 30 zile) + two fo-selects (Client, Caz de utilizare) + „Șterge
  filtrele” + the window caption; KPI grid (Sesiuni în fereastră, Active acum + Live tag, Rată de
  acceptare, Rată de eroare, Durata medie); two columns `.e-permits-ekyc-dash__cols`: Tendință
  sesiuni (column chart) + Structura deciziilor (stacked meter + legend, white chart card) + Top
  cazuri de utilizare (info card) | Alerte active (notification stack, see „Dashboard polish”) +
  Disponibilitate furnizori (stacked list). Empty window → compact empty state.
- *Sesiuni active / istorice* = the workplace registry (`kind: ekyc-active | ekyc-history`):
  status tabs (`ek:<statut>` / `dec:<decizie>` tokens), quick search, Filtrare avansată (Client,
  Caz de utilizare, Statut, Nivel asigurare, Pas curent, Furnizor / Perioadă, Decizie), sort,
  pagination, export CSV of what is shown. Cells: name over ID (`role-identity`), tags, live timer
  `[data-ekyc-elapsed]` (text-only tick each second), Progres = meter + „3/5”, dates via
  `renderDateTime` (Ultima activitate: „hh:mm · acum N min”), row action „Vezi detalii”.
  First column pinned (`[data-registry-kind^="ekyc-"]`).
- *Session profile* (`#sesiune/<id>/<tab>`) = the dosar profile panel + page header (crumbs
  Monitorizare › Sesiuni … › ID, title = client, meta row). Tabs: active — Date generale · Pași de
  verificare · Dispozitiv · Jurnal; historical — + Scor și decizie. Date generale: „Plan de
  verificare” (historical: the decision is its hanging callout, tone by decision — see „Dashboard
  polish”) = the shared trajectory (`GEAPTrajectory.html`, any number of steps;
  Inițiere · steps · Decizie; in a finished session the steps never run after a failure are `skipped`) + the hanging „Acum / Urmează” callout · Sesiune · Identificatori ·
  Job de verificare. Pași = stacked list grouped Finalizați / Nereușiți / Pas curent / În
  așteptare (code as neutral tag). Scor și decizie = registry table `.e-permits-ekyc-breakdown`
  (Tip pas · Scor · Pondere · Contribuție meter) + sum-list total „Scor final” + scoring config.
  Missing device / job / session = `renderPassportEmpty` / empty state.
- *States* `?ek=gol | eroare | incarcare | incheiata` (empty, API error with „Reîncearcă”, loading,
  an active session that ended meanwhile → toast + its historical profile, US-UI-04 AC).

**Demo states** `ek-00 … ek-07j` (js/demo-states.js): picker, login ×7, role landings ×4, role
menu, collapsed menu, placeholder, dashboard ×6, active list ×10, active profile ×12, historical
list ×6, historical profile ×10.

#### Dashboard polish (user, 2026-10-13)
- **One card radius on the dashboard = 16** (`--border-radius-16`, the KPI cards): chart cards,
  alert cards, stacked lists and the info card (scoped `.e-permits-ekyc-page`).
- **Chart cards are white** (`.e-permits-chart`: white, 1px border, padding 24, gap 16); grey only on
  the legend tray `.e-permits-meter-legend--tray` (radius 8, padding 8/12). Bars: SVG, stacked by
  outcome, top segment `rx=4` drawn first and extended under the baseline (the plot clips it), lower
  segments square on top; plot height 160.
- **Decision palette, everywhere decisions are coloured** (meter, bars, dots): Acceptat =
  `--color-icon-positive-default` (green-600, the success tag/message green) · Respins = danger ·
  Revizuire manuală = `--color-background-warning-default` · Fără decizie = neutral grey · În curs =
  brand. Tags stay `renderTag`.
- **Stacked meter** `--lg` (12px) with 2px `line.e-permits-meter__gap` cuts in the card colour and the
  wrapper's full radius on the outer ends.
- **Toolbar** = period segmented control left at the selects' height (40 desktop: track inset 4, 32px
  pills; 48 mobile: full width, 40px pills) · filters right (`.e-permits-ekyc-dash__selects`, gap
  8/12) · window caption under. Measured: control 40 = select 40 (desktop), 48 = 48 (mobile).
- **Alerte active** = notification stack — **redesigned 2026-10-14** („cooler and simpler” than Figma
  10372:692; supersedes the 2026-10-13 outline + left-accent card):
  - *Card* `li.e-permits-ekyc-alert--{error|warning|info}`: white `--color-background-base-default`, 1px
    `--color-border-base-default`, radius 12 (deliberately not the page's 16 — approved brief), padding 12/16,
    gap 12, no severity outline / stripe. Hover + focus-within = `--color-background-base-tertiary`, 140 ms.
  - *Severity tile* `__tile` 32×32, radius 8, 20px filled icon: Critică danger-secondary bg + danger icon ·
    Avertisment warning-secondary + warning icon · Informativ base-tertiary + tertiary icon (tertiary-hover
    while the card is hovered, so it never melts in). Critică pulses ONCE on first render (`.is-pulsing::after`,
    1.4 s, `backwards`, tracked in `ui.pulsed` so re-renders do not replay it; none under reduced motion).
  - *Text*: `__body` padding-top 6 so line 1 is centred on the tile; line 1 = `__title` 14/20 semibold one
    line + ellipsis + `data-cell-tooltip` (full title) and `__time` 12/16 tertiary right, no wrap; line 2 =
    `__text` 14/20 tertiary, 2-line clamp + `data-cell-tooltip`. No severity tag — the severity is the
    title's visually hidden prefix („Critică: …”).
  - *Action*: an alert with a target is one big link — `a.__title` (href = the target hash) + a card click
    handler (`[data-ekyc-alert-go]`, ctrl/⌘ click keeps the browser default) + `__action` line 14/20 medium
    brand with the arrow INSIDE the label (`Deschide furnizorul&nbsp;→`, user: no icon, chevrons / svg
    arrows looked too big), aria-hidden (the link carries „ — Deschide furnizorul” visually hidden). Focus
    ring on the card (`:has(__title:focus-visible)`, 2 white + 3 focus-ring); title underlines while an
    actionable card is hovered.
  - *×* = library `btn btn-strict btn-sm btn-icon-only` (16 icon), absolute 12/12 → centred on line 1
    (measured: title / tile / × centres = 29 from the card top); opacity 0 until hover / focus-within, then it
    takes the time's place (time fades out); `@media (hover: none)` = always visible and the head keeps 36px
    for it. Dismiss never navigates (its branch returns first).
  - *Phones (≤760)*: `__body` becomes a 2-col grid (`__head` `display: contents`): the title takes the whole
    line (2-line clamp, 36px kept for the ×) and the time moves to the action line, right.
  - *Targets* (`ALERT_TARGETS` by `alert.kind` + `alert.ref` from the seed): provider → Furnizori, row flashed
    + focus on its „Testează conexiunea” · rejection → Sesiuni istorice with filters Client + Decizie Respins +
    Perioadă (shell `api.setRegistryFilters(kind, applied)`) · use-case → `#ek-caz/<code>/pasi` · sdk → Versiuni
    SDK tab „Nesuportate” · review-overdue → Coada de revizie tab „În lucru” + row (supervisor) / Sesiunile mele
    (operator) · root-ca → `#ek-certificat/<id>/general`. **Permission = the role's menu has the target nav
    item**; otherwise the card is plain (no link, no action line). Navigating closes the „Arată toate” modal
    and focuses the landing (row action, or the page title).
  - First 2 cards shown, the rest = 1–2 neutral peek layers (8px, inset 12 / 24, radius 0 0 12 12) + „Arată
    toate (N)” (`btn-text-primary btn-sm btn-rounded`) → the page modal with all cards (same renderer,
    ids prefixed `modal`). Dismiss re-stacks with `e-permits-ekyc-restack` (220 ms, `backwards`). Empty =
    compact `GEAPEmptyState`. Demo hook `[data-demo-hover]` = the hover look for a demo state.
- **Historical session: the decision hangs under „Plan de verificare”** — no separate Decizie section;
  `trajectory()` renders the callout with the decision tone (Acceptat success · Respins danger ·
  Revizuire manuală warning · Fără decizie / Eroare / Abandonată neutral), title „Acceptat · scor
  final 0,91”, lines = threshold sentence + configuration. Same helper draws „Traseul reviziei”.
- **Tables inside rounded cards** (`.e-permits-ekyc-breakdown`): radius 16 on all corners, `overflow:
  auto` (clips rows to the radius, still scrolls sideways on phones), last row without divider.

#### Batch 2 — revizie manuală + audit (2026-10-13)
Azure eKYC: US-06-01 89252 · 06-02 89253 · 06-03 89255 · 06-04 89256 · 06-05 89258 · 06-06 89259 ·
06-07 89261 · 06-08 89263 · US-07-03 89269 · 07-04 89271 · 07-05 89272 · 07-06 89274 · 07-07 89275.
Figma reference (layout only): „Supervizor/Dosarele mele” 6559:102399 = a registry.
- **Nav** (`data/ekyc-roles.json`): Operator — Dashboard · Revizie manuală › *Sesiunile mele de revizie*
  (`ek-review`, default) · Monitorizare; Supervizor — *Coada de revizie* (`ek-review-all`, default) ·
  Monitorizare; Auditor — Dashboard · Audit › Sesiuni istorice · *Rapoarte* (`ek-reports`) · *Jurnal de
  acces* (`ek-access-log`), no Sesiuni active; Administrator — + Rapoarte under Monitorizare.
- **Data** (seed, second random stream so batch-1 ids stay identical): `operators`, per session
  `subject` (name, IDNP, birth date), `evidence` (items: document front/back, NFC photo, selfie,
  liveness video; OCR document; storage), `external` (RSP · MConnect record or Indisponibil),
  `review` (id, mode single | multi, rule, why, sentAt, allocation, allocatedAt, dueAt = +8 h,
  status Nealocată | Alocată | În lucru | Finalizată, assignees[name, state, takenAt, decision,
  reasonLabel, reason], notification, result, callback), `evidenceAccess`, top-level `accessLog`.
  Placeholder images in `assets/ekyc/` (id-front, id-back, nfc, selfie, liveness-1…3).
- **Queue** = registry `kind: ekyc-review` (views `mine` / `all`): Sesiune · Caz · Statut revizie
  (operator: his own state — Alocată / În lucru / Decizie trimisă / Finalizată) · Tip revizie (+ „1 din
  3 decizii”) · Scor automat · Operatori (supervisor) · Alocată la (date over „hh:mm · aleatoriu”) ·
  Termen; sorted by deadline (unallocated first, finished last); tabs `rv:<statut>` / `rv-mode:multi`;
  row action Revizuiește (operator) · Deschide + ⋮ Realocă / Alocă (supervisor).
- **Review screen** `#revizie/<id>/<tab>` = the session profile panel in review mode: header actions
  (operator: Preia revizia → `askConfirm`; then Respinge · Acceptă + ⋮ Eliberează revizia; supervisor:
  Realocă / Alocă), caption = review id; tabs Revizie · Dovezi · Surse externe (danger count =
  mismatches) · Pași · Dispozitiv · Jurnal. Revizie = `trajectory("Traseul reviziei")` (Trimisă ·
  Alocată · Preluată / Evaluări · Decizie · Rezultat transmis) + callout · Decizii operatori (stack +
  sum-list tray „Decizie agregată”; others' votes hidden from an operator until he votes) · Rezultat
  automat · Notificări (applicant MNotify + client callback, „Retrimite” on failure) · Alocare.
  An operator opening a session not allocated to him gets the lock empty state.
- **Dialogs** reuse the page modal `#case-action-modal` (`openModal()`; footer `modal-buttons`):
  decision (info note · Motivul deciziei select · Motivare detaliată textarea 30–1000 with counter;
  Respinge = `btn-destructive`), (re)allocation (segmented Aleatorie / Alege operatorul; manual needs
  operator + reason ≥ 10), evidence access (motiv select + referință; grants 15 min), alerts list,
  evidence viewer (`--viewer`, wide).
- **Evidence access** (US-07-03): operator = only his allocated sessions (logged once per session);
  auditor / supervisor / admin = request with reason → 15-min grant strip with „Închide accesul”; every
  open file is logged; viewer watermark = user · time · session.
- **Auditor**: history registry adds *Subiect* (name over masked IDNP `2615•••••0252`), search by
  name / IDNP, facets + Scor final band + Revizie manuală; detail is read-only (caption „Doar citire ·
  accesul se jurnalizează”) with tabs + Dovezi · Surse externe · Revizie manuală · Acces la dovezi;
  Scor și decizie adds „Cronologia deciziilor” (event timeline). Searches, detail views and exports are
  logged → *Jurnal de acces* registry (`kind: ekyc-access`).
- **Rapoarte**: same toolbar (no 1 h, default 30 zile) + „Exportă ▾” (CSV tabelar · JSON structurat,
  no personal data, logged) · KPI grid · Volum sesiuni (finished only) · Structura deciziilor · tables
  Pe client / Pe caz de utilizare / Pe nivel de asigurare (success-rate meter) · privacy note.
- **Demo states** `ek-03f…03h` (alerts modal, after dismiss, empty), `ek-03i…03s` (alert hover, one per severity, card focus, operator without targets, landing per alert kind), `ek-08…ek-16b` (queue, review per
  tab, viewer, decisions + validation, multi-operator, supervisor allocation, auditor search / detail /
  access, reports + export, access log, empty / error).

#### Batch 3 — Configurare + Administrare (2026-10-13)
Azure eKYC: US-UI-06 91125 Organizații · US-UI-07 91127 Clienți · US-UI-08 91128 Cazuri de utilizare ·
US-UI-09 91130 Furnizori · US-UI-10 91131 Configurări scoring · US-UI-11 91132 Parametri · US-UI-12 91133
Versiuni SDK · US-UI-13 91134 Utilizatori · US-05-09-B 89238 Certificate root CA (+ functional US-05-04-B,
05-05-B, 05-06-B, 05-07-B, 05-08-B, 05-10-B, 05-12-B, 05-13). Figma: no node ids for these screens (layout
reference skipped). Administrator platformă only (menu in `data/ekyc-roles.json`).
- **Code**: `js/ekyc-config.js` (loaded after `js/ekyc.js`, `product.extend`), data `data/ekyc-config.json`
  (deterministic, `node tools/ekyc/seed-config.mjs data/ekyc-config.json`; reads `ekyc-sessions.json` so
  clients, use cases, scoring names and providers match the monitoring screens). Shell hooks added:
  `view.primaryAction` (toolbar „+ Adaugă …”), `registries[kind].rowClass`, and `renderToggle`,
  `renderCheckOption`, `requiredMark`, `renderPassportBlock`, `renderSumList`, `renderUserRoles`,
  `renderHeaderStatus` in the product API.
- **Reuse map** (no new UI): lists = registry engine (status tabs Toate / Active / Inactive as
  `f:<field>=<value>` tokens, quick search, Filtrare avansată facets, sort, pagination, CSV export); Parametri
  group by `categorie` (`view.groupBy`, the registry group row); details = dosar profile panel (page header +
  actions, meta, tabs, info cards, stacked lists, event timeline „Jurnal”); short forms = the BO right drawer
  (markup of the classifier value drawer, `[data-ekcfg-drawer]` injected once; sections, 12-col grid, fo
  inputs / fo-select / textarea with counter / `renderToggle` / `renderCheckOption` lists / date picker; lock
  read-only box + hint „Nu se modifică după creare” for keys fixed after creation; footer summary +
  Anulează · verb; closing with changes → „Renunți la modificări?”); long forms (Clienți, Furnizori — the
  stories ask for „pagină separată, pe secțiuni”) = the **Setări one-page form** `.e-permits-cfg2` inside the
  profile panel (section list with scroll spy + error dots, white section cards with the 1.5px red border on
  errors, sticky save bar „● N modificări nesalvate · N câmpuri de corectat” + Anulează · Salvează); every
  activate / deactivate / delete / revoke = `askConfirm` with the consequence (destructive red); result /
  impact dialogs = the page modal `#case-action-modal` (`openModal`).
- **Utilizatori** (`#ek-users`, `#ek-utilizator/<id>/<tab>`): no add / edit (MPass); cells = BO user identity
  (avatar + name over role / „Contul tău”), roles = one line of tags + „+N” (`renderUserRoles`, measured fit), status Activ success ·
  Suspendat warning · Blocat danger, failed logins > 0 = danger tag; ⋮ Suspendă / Reactivează / Deblochează.
  Profile: actions Revocă toate sesiunile · Suspendă contul (own account: suspend aria-disabled with reason,
  „Revocă celelalte sesiuni” keeps the current one); tabs Date generale (MPass provenance notice, KPI grid
  Sesiuni active / Login-uri eșuate / Ultima autentificare, „Cont” info card) · Sesiuni de lucru (stacked list
  grouped Active / Revocate sau expirate; title = parsed browser, raw user agent as its tooltip via
  `data-tooltip-reason`; revoked greyed `.e-permits-ekcfg-muted`; „Revocă” only on active, not on your own
  current session) · Jurnal.
- **Clienți** (`#ek-clients`, `#ek-client/<id>/configuratie|jurnal`, `#ek-client-nou`, `#ek-client/<id>/editeaza`):
  Client ID (plain in the table since 2026-10-20), use cases = one line of tags + „+N” (`renderUserRoles`, measured fit), facets Organizație / Caz / Scoring; detail = info cards
  Date generale · Integrare · Restricții · Verificare · Audit; page form 4 sections; validation: OIDC redirect
  (HTTPS or app scheme), scope „openid” required, IPv4 / CIDR, UUID, 1–10 000 sessions, duplicate Client ID
  on the field; Organizație locked on edit.
- **Cazuri de utilizare** (`#ek-caz/<code>/pasi|veto|versiuni`): create / edit = drawer (4 fields, Cod locked on
  edit), create → detail; 0 steps = warning icon tag „0 · flux incomplet” in the list, prominent empty state
  in the detail, „Activează” blocked by a dialog. Pași = stacked list (the session profile's „Pași de
  verificare”) with lead = drag handle + position, tags type / Obligatoriu or Opțional / Async, meta
  „Furnizor principal · rezervă: 1. … → 2. …”, ↑ ↓ (keyboard fallback for drag & drop) + Editează + ⋮ Șterge.
  Step drawer: Tip · Denumire · Ordine · Obligatoriu / Async toggles · Furnizor principal · ordered fallback
  stacked list (↑ ↓ Elimină, „Adaugă furnizor de rezervă” fo-select; principal ∈ rezervă = red list + error)
  · Timeout · Reîncercări. Reguli veto = table in a card with an in-row toggle (no confirm, story) ·
  Versiuni = stacked list, ⋮ „Restaurează această versiune”. Every change bumps the version (`bumpVersion`).
- **Parametri** (`#ek-parameters`): grouped by category; value per type (boolean Da/Nu tag, number right
  aligned, JSON shortened + tooltip, text); drawer: Cheie locked on edit, Tip date switches the value control
  (input · numeric input · toggle Da/Nu · JSON textarea with syntax check on save); delete = page modal with
  the impact warning + „Dezactivează în schimb” (secondary) + „Șterge parametrul” (destructive); search
  without results ≠ empty list.
- **Configurări scoring** (`#ek-scoring/<id>/reguli|jurnal`): detail = decision band (above) + rules table
  (#, Tip pas or „toți pașii”, ±value, condition truncated, Activată Da/Nu) + rule drawer; edit drawer has
  three numeric inputs + live band preview, cross-validation on input (reject < accept) — **no slider**
  (no library component; see PO question); deactivation of an assigned configuration warns with the clients.
- **Furnizori** (`#ek-providers`, `#ek-furnizor-nou`, `#ek-furnizor/<id>/editeaza`): Sănătate = icon tag
  (`icon-signal`) in its own column ≠ Status plain tag at the end; row primary „Testează conexiunea” (spinner
  `btn-loading`, disabled while running) → result modal (callout success / danger, Latență · Mesaj · Testat la ·
  Configurație testată, „Testează din nou”); page form 2 sections, Tip furnizor locked on edit, credentials
  „••••• setate” + „Înlocuiește credențialele” (masked input + Afișează / Ascunde + „Anulează înlocuirea”),
  in-form test line says saved vs new values; resilience fields with info tooltips; deactivation warns about
  active steps using the provider (hot-swap, sessions not interrupted).
- **Organizații** (`#ek-organizations`): drawer (Denumire*, IDNO* 13 digits, contact; email / phone checks);
  delete = confirm → 409 dialog „Organizația are clienți asociați și nu poate fi ștearsă” (warning notice +
  the clients as a stacked list + „Dezactivează organizația”), distinct from the generic error dialog.
- **Versiuni SDK** (`#ek-sdk`): platform = icon tag (phone / phone-1 / globe), Recomandată = brand tag with
  award icon vs Suportată success / Nesuportată neutral, unsupported rows muted; tabs Suportate /
  Nesuportate, facet Platformă; drawer with semver check, Platformă locked on edit, date picker, Recomandată
  toggle only on edit (API), duplicate version + platform on the field; ⋮ Retrage din suport / Șterge.
- **Certificate root CA** (`#ek-trusted-cas`, `#ek-certificat/<id>/general|jurnal`): status Activ / Inactiv /
  Expirat / În rotație; upload drawer = FO boxed doc field (`.e-permits-fo-doc-field--boxed`) + parsed details
  info card before „Înregistrează” (CA-1); expired / duplicate rejected with the reason (CA-2); activate /
  deactivate with the mTLS clients in the consequence (CA-3/4); „Rotește certificatul” = same drawer + transition
  period → both certificates „În rotație”, warning callout on both details „ambele certificate sunt acceptate
  până la …” (CA-5/6), „Finalizează rotația” deactivates the old one.
- **States** `?ek=` gol · eroare · incarcare (lists and details) · sesiuni-eroare · sectiune-eroare ·
  test-lent · eroare-stergere. **Demo states** `ek-20 … ek-32l` (122): per screen list, tabs, filters, search
  without results, empty / error / loading, detail tabs, drawers, validation, 409, confirmations, results.

### Ghișeu — depunere la ghișeu (Feature 95768, 2026-10-15)

Specialist ghișeu files a request on behalf of the applicant: **Dosare noi** (US-241) → **Dosar nou**
→ Inițiere (US-233: small modal + „Ce se solicită?”) · Date solicitant (US-233 representation + US-234 contact) · Detalii serviciu (US-235) · Documente însoțitoare
(US-20) · Verificare + cererea pe hârtie + MSign (US-236) · Livrare (US-16) · Notă de plată (US-237,
hidden when nothing is paid) · Confirmarea depunerii (US-238). Drafts: save / resume / remove /
automatic removal (US-239/240), expired note regeneration (US-256).

**Plug-in, not product mode.** `js/ghiseu.js` (deferred, after the FO script) uses four shell hooks
added for modules (all generic, reuse them for the next BO module):
- `window.GEAPShellRegistries[kind]` — `build()` (db with `views`, `columns`, `runtimeRows`,
  `primaryAction`, `searchPlaceholder`), `renderCell`, `searchText`, `sortValue`, `filterToken`,
  `openRow`, `emptyHtml`, `exportRows`, **`facets`** (new: Filtrare avansată for a module registry);
  a menu item with `shellView: "<kind>-registry"` shows it (no shell edit per module).
  Column config: `{ label, width, sortable, fill, pin }` — add the kind to the config-width list in
  `getNaturalColumnWidth` so `width` is exact; **`pin: "end"`** (2026-10-16) puts the shared sticky
  `.e-permits-workplace__actions-cell` on that column's th / td (pinned right, left divider, its own
  config width — the fixed 55 applies only to cells without `data-column`, i.e. the classifier grid ⋮).
  A registry without a checkbox column also unpins `nth-child(2)` (flows / ghiseu pattern) and, at
  ≤760, keeps only the actions pinned. Widths = the one-line header (label + sort icon + 24) or the
  longest date; names ellipsize with the cell tooltip. An open row menu lifts its actions cell
  (`:has([data-stack-menu]:not([hidden]))` → z 8) so the rows below don't paint over it.
- `window.GEAPShellRoutes = [(hash) => boolean]` — `routeFromHash` asks them first (`#ghiseu/…`).
- `window.GEAPShellApi` — the object products get in `init(api)` (page header, stacked list, row
  actions, confirms, toasts, `hideShellPages`, `setActiveNav`, `currentAssignment`) + `getServiceByCode`,
  `serviceConfig` (Setări US-221), `getAuthorityById`, `servicesStore()`, `currentUserName`.
- `[data-shell-module-page]` — any element with it is hidden by `hideProfilePanels` (for a module that
  draws an in-page view; Ghișeu itself now uses dialogs).

**Two dialogs (user, 2026-10-15), the list stays behind:**
- **Small modal** „Dosar nou” (5th round, user 2026-10-15) = library `modal--lg` (`#gh-start-modal`; ≤680 the
  standard bottom sheet, footer buttons side by side), **one screen, no stepper**: Serviciul (FO searchable list
  with `float: true` → the FO fixed list layer, never cut by the dialog, flips up) + Solicitantul (Tip persoană
  never empty: PF default, a PJ-only service = read-only value; IDNP, or IDNO + the IDNP of the person filing).
  Footer Anulează · **Continuă** (always enabled; a click validates, errors under the fields; Enter in an answered
  field = Continuă). The dialog **hugs its content** up to `100dvh − 2 × 24` (sheet `− 24`); beyond that only the
  body scrolls; a height change glides from the old height (`animateStartHeight`, Web Animations 220ms, off for
  reduced motion). **One rhythm** (stacks with gap, no per-element margins): body 24 top / bottom, 20 sides (= the
  header gutter) · section → section 24 · section title → first field 12 (no title padding / divider here) · field
  → field 16 (rows and columns, the lookup group too) · label → input 8 and input → status = the FO field's own.
  - **Lookup fields** (IDNP / IDNO, the PJ filer's IDNP, the flow's representative IDNP) = the „Cod cadastral”
    component: `.search-input.{medium|large}.rectangular.e-permits-workplace__search.e-permits-list-search
    .e-permits-list-search--fill.e-permits-fo-cadastral-search` without the leading `.icon-search` (plain code inputs) + `.btn-group` (spinner · submit
    `btn btn-primary btn-search` arrow „Caută IDNP-ul / IDNO-ul în registru”, disabled until 13 digits). Explicit
    only: the arrow or Enter (js/search.js); never on typing or blur. While MConnect answers: `.loading` spinner,
    skeleton names, loading status. Found → read-only code + the search clear × alone („Schimbă IDNP-ul”), names
    filled with a flash. Not found (9999999999999) / registry down / „…are 13 cifre.” / „Căutați IDNP-ul în
    registru.” (Continuă before searching) = the FO inline error, box `is-error`. Under a code only status lines
    — no helper hints (an empty hint takes no room). Layout: one row per code (IDNO span-6 + Denumirea
    companiei span-6; IDNP span-6 + Nume / Prenume span-3), PJ = the company row, then the person-filing row
    (stacked, user 2026-10-16 — the side-by-side variant was a misrouted request); one column ≤860.
  - **Tip persoană** = the FO segmented control with the registry applicant icons in each segment
    (`icon-person-filled` / `icon-business-filled`, 16, gap 8, currentColor = the label colour per state; the
    `segment` field option `icon`). The FO guest „Soliciți în numele” control carries the same icons.
  - **Continuă** = first save (nr + UID) → the request window on **„Ce se solicită?”** (step `intent`, no
    stepper, no footer — as FO #intent): `GEAPFormRender.intentHtml` with „Solicitant <name> IDNO … · Schimbă”
    (reopens the small modal), „Solicitare nouă”, „sau”, „Acte emise pentru acest serviciu” = the shared act rows
    with the BO-size menus (every post-process of the service; the ones the status / term does not allow
    `aria-disabled` + reason tooltip; a row with a post-process „în curs” locked); no acts → the shared empty
    state „Solicitantul nu are acte emise pentru acest serviciu”. The menu opens up when the body has no room
    below; Esc closes only the menu. **A choice starts the request at once** (no selected state): the stepper
    appears, the header meta shows the process („Emitere primară” / „Reperfectare · ASF-2026-04521”), first step
    „Solicitant și reprezentare” (no Înapoi there). Header ⋮ **„Schimbă procesul”** → back to the intent screen;
    form, documents and verification are cleared, with a destructive confirm when there are any; disabled with a
    reason once the note is paid. A new service / holder clears the process (info notice on the intent screen).
    A draft can exist before the process („—” in the list); resuming it opens the intent screen.
- **First step „Date solicitant”** (identity in the small modal; representation and contact in the flow): the identity as FO role cards (`e-permits-fo-selected-role--changeable` + „Schimbă” = the picker),
  „Persoana care depune” for PJ, then „Reprezentantul” (PF check option + IDNP lookup) / „Temeiul reprezentării”
  (RSUD / MPower / Prin procură with the live AC-21 error — the FO way: the message under the group and only
  the checkbox control in the library `checkbox--error` style, no border around the option). Basis outcomes use the
  **FO full-flow layouts** (user 2026-10-16, Figma 11685:13047; replaced the success / info notices — one
  representation, not both): MPower → the FO „Împuternicire MPower aplicată” card (`GEAPFormRender.authorizationCardHtml`
  = the fo-02 / cat-04 renderer: identity icon, title + „Activă”, meta „Acordată de <holder> · Valabilă până la <date> ·
  Cod <nr> [copy]”); RSUD administrator → the same card with `icon: "icon-business"`, title „Administrator în RSUD” +
  „Confirmat”, `details` „Administrator al <company> · Sursa RSUD prin MConnect” (the FO has no RSUD card — an MPass
  administrator files as himself); no electronic link → the warning notice + „Prin procură” check option, and once
  ticked the FO **boxed procură upload** of the guest „pentru altcineva” flow (`.e-permits-fo-doc-field--boxed`,
  `data-gh-procura-doc`, upload only, JPG/PNG/PDF): label „Procură (copia scanată)” + star, „Atașați-o aici sau la
  pasul «Documente însoțitoare».”, black `btn btn-strict btn-md` „Adaugă fișier”. The file is `d.docs.procura` — the
  same document as Documente însoțitoare › „Procură (copia scanată)”, which shows it already attached (its
  „atașați copia” notice only while missing) and stays the required check (US-233 Assumptions / Model de date
  „Prin procură”: „procura se atașează la documentele însoțitoare”). States gh-03 (RSUD), 03b / 03c (MPower PJ / PF),
  03a / 03e (warning + error), 03j / 03k (procură box empty / attached), 03l (Documente with it attached). The
  process lives in the header meta. The cards and
  group titles are the FO ones (`GEAPFormRender.roleCardHtml` = `selectedRoleHtml` with `changeAttrs` /
  `extraHtml`, `roleGroupTitleHtml`) — never rebuilt — in the FO identity row `.e-permits-fo-form__roles >
  .e-permits-fo-form__roles-grid` (fo-02: Solicitant | Persoana care depune side by side; `is-single` = one card;
  one column where the FO grid collapses). Representation / basis and contact stay full width below.
- **Request sheet** = library `modal--fullscreen` used as a sheet (`#gh-request-modal`): overlay padding-top
  24 (16 on phones ≤760, „Modals on phones”), modal `calc(100dvh − 24)`, full width, `--border-radius-16` top corners, scrim behind. Window chrome only:
  header = title (service) · meta parts (nr · solicitant · process · Ghișeu) + status tags · the FO draft status
  (`GEAPFormRender.draftStatusHtml`: „Salvat ca schiță · <date, time>” + „eliminare automată la …”, wraps on
  phones) · „Salvează schița” (`btn btn-neutral btn-sm`, cloud icon; ≤680 icon-only 32 with the label as
  tooltip / aria-label; user 2026-10-16: back in the header, next to ⋮) · ⋮
  (Schimbă procesul, Istoricul cererii, Elimină schița) · `.modal-close`. **No window footer.** The body is the FO
  request page as is: FO page width / sidebar / gutter (no overrides), FO stepper sticky (≤960 the FO mobile
  progress), FO step header `h1` 32/40 with no lead (desk notes = FO info note under it), FO sections, and the FO
  step footer at the end of the step (`GEAPFormRender.stepFooterHtml`: round back arrow + „Înainte →” right —
  no draft button there; the first step has no back; „Confirmă depunerea” without the arrow; after
  submission Înapoi la Dosare noi · Dosar nou). Measured against fo-02 / fo-03 / fo-05 at 1440: stepper x 120 /
  w 280, content x 488 / w 768, h1 32/40, section h2 18 + 12/12 + divider, section body 24 / 32, row gap 24,
  column gap 32, „Înainte” 118 × 48 flush right, draft button 48 flush left — identical.
  × / Esc / scrim with unsaved data → „Salvați schița înainte de a închide?”. Library dialogs open above it
  (sheet overlay z 990 < 1000). A draft opened from the list or a link opens the sheet at its saved step.
- **Every step body is an FO renderer** (user 2026-10-16, „just take from full flow”): Livrare =
  `deliveryStepHtml` + `renderDeliveryStep` (fo-06 as is: EVO Cabinet card, „copie pe hârtie” with the desk's
  methods — ridicare la ghișeul autorității, MDelivery with the FO courier address card; geometry identical to
  fo-06); Notă de plată = `paymentStepBodyHtml` (fo-07 summary + note card + actions; element detail lines =
  `item.metaHtml` → `.e-permits-fo-payment-table__meta`) inside `.e-permits-fo-payment__body`, desk parts as notices
  (MPay status, expired note + Regenerează US-256, incomplete fee setup, earlier notes); Verificare sections =
  `summarySectionHtml` inside `.e-permits-fo-review` (the FO Verificare look for any host: section title 11/12
  inset over the card, card radius 24, padding 8/20, gray-50, sections 32 apart — measured identical to fo-05 at
  1440 and 375); „Atașamente” = the shared document cards titled by the requested type (no „Atașat: Da/Nu”
  badges; missing required types = one warning notice); Confirmare = `finishHeroHtml` + `finishDocHtml`; read-only values = `readonlyFieldHtml`.
  Still Ghișeu-only (no FO equivalent): the small modal, the window chrome, the paper request + olograf upload +
  MSign at the desk, the MPay status / regenerate actions, „Condițiile depunerii”, the basis notices.
- **Rhythm checks** (2026-10-16): `tools/ui-qa/code-audit.mjs` `tight-gap` = an alert / notice / loose paragraph
  whose visible distance to its neighbour is < 8px (a neighbour without a border / background counts from its
  padding). Generic FO rules: alert → next section 16; a step body ending at the step footer keeps 32.
- **Steps** (user 2026-10-15): Date solicitant (identity cards + representation / basis + „Date de contact” on ONE
  page, as fo-02) · Detalii serviciu · Documente însoțitoare · Verificare · Livrare · (Notă de plată) · Confirmarea
  depunerii. „Date de contact” = fo-02's: MNotify values = `verifiedPhoneHtml` / `verifiedValueHtml` + the FO
  MNotify notice (`mnotifyInfoHtml`); a missing value = the FO editable field with the guest-form placeholder, no
  hint. Steps use FO markup with own hooks: `[data-gh-step]`, `[data-gh-goto]`, `data-gh-next|prev|save` — never
  `data-fo-*` (the FO listens on the document).

**Reused components (no copies):** FO renderer `GEAPFormRender.fieldHtml` (searchable list = CAEM combobox
with new optional `emptyTitle` / `emptyText` / `searchLabel`; segment; select; phone; textarea;
cascade address), `createRegistryLookup` (exported: skeleton → read-only fill + flash; not found / MConnect
down = field error, names editable + „Introdus manual”), FO role cards (`e-permits-fo-selected-role`),
check options (Prin procură, reprezentant, reduceri), FO delivery option cards (`deliveryOptionHtml` = `deliveryOptionRow`, Livrare), FO summary rows
(`summaryRowHtml`), the FO intent screen
(`intentHtml` / `actRowHtml` / `intentNewHtml`, exported), FO doc fields +
the FO document modal + `attachFileItem` / `attachMdocsItem` / `docIconHtml` / `docContentHtml`
(exported), FO boxed doc field (Cererea semnată olograf), FO summary cards (Verificare, edit pen =
`[data-gh-goto]`), FO invoice card (elements = name + `__fee-meta` lines account / reductions), FO
finish hero / finish doc / summary rows (confirmation), `#case-action-modal` (remove with required reason, export Excel/CSV,
MSign, history), `#dosar-detail-modal` A4 preview (paper request, signed JSON, certificate).

**New glue (css/ghiseu.css):** `.e-permits-gh__inner` (FO layout vars), `__step-header`, `__lead`,
`__basis`, `__doc` / `__doc-actions` (doc card + „👁 Detalii”),
`__sign`, `__retry`, `__pay-actions`, `__fee-name` / `__fee-meta`, `__finish`, `__progress`,
`.e-permits-gh-sheet__header|__title|__meta|__saved|__actions|__buttons|__hint`, `.e-permits-gh-start__body`,
`.e-permits-gh-start__form` (the modal rhythm), `.e-permits-gh-intent__screen` (intent screen in the sheet), `.e-permits-gh-sheet__footer[hidden]`,
date-meta tones `.e-permits-gh__meta--warning|danger` in registry cells, nav masks for `dosare-noi`,
`dosare-suspendate`, `acte-spre-eliberare`, `toate-dosarele`, phone registry layout for kind `ghiseu`.

**Rules kept:** Prin procură = check option with the red star; one labelled primary per row („Continuă”
pen) + ⋮ (Elimină schița, disabled with a reason when the note is paid); lone view = „👁 Detalii”;
export = `icon-export`; dates „8 iulie 2026” over „hh:mm · who”; tables one line + tooltips; no toast for
toggles (only for save / remove / export / regenerate / submit). Errors = FO inline message under the
field (selects, lists and check options get `is-error`).

**Demo navigation + prefill** (user 2026-10-16, as the FO): every stepper row opens its step, forward or back
(`data-gh-goto` + `data-gh-free` = no validation, no Verificare gate; „Înainte” still validates); a step shows
the vertical-stepper check when it was reached and its checks pass; values live in the draft and re-render on
every visit. A request started from „Ce se solicită?” is prefilled (contact from MNotify, the service details,
the required documents) so „Înainte” passes up to Verificare; paper request, olograf, MSign and the payment are one
click each; `?prefill=0` starts empty. Demo `gh-07j` = a new prefilled request jumped to Verificare.
**Demo** (`gh-*`, as `ansp-ghiseu-chisinau`): params `mconnect=0`, `registru=asteptare`, `prefill=0`, `mdocs=0`,
`msign=0|1`, `olograf=0|1`, `cert=0|1`, `msignerr=1`, `taxa=incompleta`, `depunere=eroare`,
`certerr=1`, `gol=1`, `ghseed=1`.
**Demo data rule** (user 2026-10-15; top comment of `js/ghiseu.js`): any valid 13-digit IDNP / IDNO is found —
the seed person / company, else a deterministic fake (first / last name from a 10-name pool by the last two
digits; „SRL Demo <last 4>”); **9999999999999 = not found**; `?mconnect=0` = registry down; fewer than 13
digits = „…are 13 cifre.”. Acts for the chosen service: a code starting with **0 has none**; any other code has
the seed acts when defined for the service, else 2–3 generated (valabil, suspendat, + a „Decizie de respingere”
within the appeal term when the last digit is even; numbers from the code). FO lookups (`fo-g*`) keep their
own data. **Demo contact rule** (2026-10-16): any phone with ≥ 6 digits passes (spaces, +, -, ()
ignored; no +373 format, no MNotify match); empty / non-numeric = „Introdu un număr de telefon valid.”; no phone
OTP at the desk. The FO guest form keeps its own validator (`guestPhoneProblem`). **Phone as you type** (FO phone component,
`bindPhoneCode` → `bindPhoneFormat` / `formatFoPhoneDigits`, every FO phone field incl. the guest form and Ghișeu):
+373 = „60 999 999” (other codes: groups of 3); a pasted „+37360999999” / „060999999” / „60 999 999” normalises
the same; the caret keeps its digit position (typing, mid-edit, backspace over a space); stored value = digits. Drafts are kept in `localStorage["e-permits-ghiseu-v1"]` (cleared by
demo links). `window.GEAPGhiseu` = state, route, go(step), fill(step), paid(), expire().

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
10. **Only our components — checked by the component audit (QA, v2 2026-10-21; user: „use only our
    components … so we don't get back to this again”).** `tools/ui-qa/component-audit.mjs` (agent
    `component-auditor`, spec `tools/ui-qa/specs/component-audit.json`) fails a change when:
    - a control is not a library / documented component — a BEM part of a documented block counts only when the
      PART is written in the inventory (short `__part` names resolve against the cell's block; ~~struck~~ /
      „removed” rows document nothing), is internal anatomy of a listed product root, or is in `partAllow`;
    - anything clickable **paints like a button** without `.btn` (`button-paint`) — the exception list
      (`buttonPaint.allow`) needs a reason and a documented component;
    - a `.btn` is not 32 / 40 / 48 high or its icon is not 16 (Small) / 20 (Medium, Large) — `css/button-icons.css`;
      a tag is not Small (20); a field is not 40 on desktop / 48 · 16/24 on phones;
    - a second implementation of a pattern family appears (`converge`: pager, stepper, close ×, notice, tag,
      switch, back, menu item, dialog shell, key-value list → the canonical in spec `families`);
    - menus / drawers / tooltips that a state leaves closed are opened by the audit (`interactions`) and checked too;
    - in the sources (`--static`): a library class restyled outside the documented contract files, a hex / rgb where
      a token exists, a redefined Foundations colour token, an inline `<path>` icon, `role=button` on a non-button,
      a native `title=` tooltip on a control, monospace.
    Run on the changed states: `node --experimental-websocket --no-warnings tools/ui-qa/component-audit.mjs --states <ids>`.
    **Full project sweep** (resumable — a restart loses nothing): `node --experimental-websocket --no-warnings
    tools/ui-qa/component-audit.mjs --all --resume --workers 4 --out tools/ui-qa/out/components/sweep` +
    `node tools/ui-qa/component-audit.mjs --static --out tools/ui-qa/out/components/sweep`. Desktop-only states
    (Ghișeu, `srv-`, `svc-10…`, `trf-`, `pd-`) are skipped on phones. Product components the user decided to keep
    (2026-10-21) are listed in spec `productKept` with their reason. A new component = inventory row here first;
    an exception = spec entry with its reason — never a looser rule.

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
- **Pattern boards — context skeleton (2026-10-13, user, US-54 board `11224:39519`).** When a
  board documents ONE pattern (e.g. the address block), every screen keeps its shell (header,
  stepper, page + section titles) but everything that is not the pattern is neutral context:
  fields → local „FO / Context · skeleton” `11258:17226` Type=Field (label bar 140 + input bar
  40 / 48), text → Bar lines (12 px, gap 8, `background/base/tertiary`, radius 4), buttons /
  stepper items / icons → 35 % opacity (arrows may still start on them). The pattern stays 100 %
  real. Builder chrome around a properties panel → 35 % opacity. Script:
  `tools/figma/deemphasize-context.js` (run it on the template block, so rebuilt blocks inherit it).
  The board's „Cum se citește” says: „Elementele gri sunt doar context; detaliile sunt în blocul Adresă.”
  Decisions = „Decision” cards, long jumps across bands = „Marker · → NN · ID” cards (no
  board-wide connectors), BO configuration = a grey „Lane · Back office” behind its band.
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

### Publicare în RAP for a long form — action + published rows + picker (2026-10-12)

Setări › Publicare în RAP switches by the size of the request form (`cfgRapCatalog`); demo
`003000118` has 100 fields in 5 form sections.
- **≤ 12 fields** (`CFG_SUBDIV_INLINE`): the inline list `.e-permits-cfg-rap`, every field as a
  `.e-permits-cfg-rap__row` (name + Publică + Anonimizează).
- **> 12 fields** (`cfgRapPicks`): the long multi-select field, **with rows instead of chips**:
  - The field „Câmpuri publicate în RAP” (`.e-permits-fo-subgen-select`, as Subdiviziuni)
    reads „N din M publicate · K anonimizate”. It updates live, opens the picker, and keeps
    `is-open` / `aria-expanded` while the picker is open.
  - Under it: **only the published fields**, as the same rows, editable in place, in form order —
    the first **10** (`CFG_RAP_ROWS`), then `btn-text-primary btn-sm` „Încă N · Arată toate”,
    which opens the picker on Publicate (the same as the chips under Subdiviziuni).
    There are no chips. (An action button „Editează câmpurile” was tried on 2026-10-12, and the
    user brought the dropdown back.)
- **Composite field** (editable grid, e.g. CAEM) uses **lines only, no box**. (A bordered
  container was tried on 2026-10-12 and the user found it too heavy.)
  - `.e-permits-cfg-rap__group` has a divider above it, like any other row.
  - Then a title row `__table-head`, all on one line: on the left the name (medium) + a
    `Tabel` tag (`renderTag`); on the right a tertiary count („3 coloane” in the picker,
    „2 din 3 coloane publicate” in Setări).
  - Then the columns as ordinary rows (`__cols`), **indented 16**, with a divider under the title.
  - Each column is published on its own (`field` = „Grup › Coloană”).
- **Picker** `#cfg-rap-modal`: the subdivision picker's shell (`.e-permits-subdiv`), plus
  `--tall`, which makes it the full screen height minus 24 top and bottom.
  - Filter chips: Toate / Publicate / Nepublicate / Anonimizate.
  - Bulk action: „Publică / Retrage toate|rezultatele (N)”.
  - Sections = form sections. The heading is a tri-state „Publică” for the visible rows, plus n/total.
  - Rows and containers come from the same renderer (`cfgRapItemsHtml`, kind `modal`).
  - Draft until Aplică, which writes `v.rap` in form order.
- The picker's search never grows: `.e-permits-subdiv .search-input.e-permits-list-search--fill
  { flex: 0 0 auto }`. This applies to both pickers.

### Configurează tipul de solicitare › Avizare (US-222, 2026-10-12)

This is a 6th tab of the request-type drawer (`RT_DRAWER_TABS`, between Notificări and Taxe), as
A. Pascalov's Figma comment on 02a asked („tab cu Avizări”).
- **„Necesită avizare” is a switch** (`renderToggle`, as in Setări). It is enabled only when the
  chosen flow has the inter-institutional approval branch (`flowHasAvizare`: „aviz” in the steps
  or the name). Otherwise it is off and disabled, with an info note naming the flow and
  suggesting a flow with avizare (AC-46).
- **Avize:** one white outlined card per aviz (`.e-permits-tax-cond.e-permits-tax-cond--outline`:
  1px border, radius 12, no grey fill — like the Documente rule cards; head „Aviz N” + „Elimină”):
  - Autoritatea avizatoare ▾ and Subdiviziunea avizatoare ▾ (disabled until an authority is
    chosen; one subdivision per aviz, AC-31).
  - Check options „Implicită” and „Cu termen”, with a hint for what „Implicită” means (US-130).
  - With „Cu termen”: „Termenul de avizare (zile)” (in the request type's day type, AC-34) and the
    check option „Termen modificabil de specialist”.
  - „Adaugă aviz” (`btn-secondary btn-sm` + plus).
- **Salvează** validates: at least one aviz (AC-29), authority + subdivision (AC-30), and a whole
  number > 0 for the deadline (AC-33). On error it jumps to the Avizare tab. The audit detail
  includes „avizare: N avize”.
- **Open for PO/BA (not decided in code):** avize already configured when the flow loses the
  branch (they are not saved); duplicate authority + subdivision; a maximum deadline.
- Demo: `svc-02g` (locked: post-processing flow), `02h` (Reperfectare, 1 aviz), `02i` (add),
  `02j` (validation), `02k` (switched off).

### Opening animations release their transform (hover bug, 2026-10-12)

An opening animation on a drawer, preview or modal that contains a scrolling body uses
`animation-fill-mode: backwards`, never `both`. With `both`, the final `transform` stays applied,
the panel remains a composited layer, and GPU Chrome repaints hover only on the next click: the
user sees no hover anywhere in the drawer. Applies to `.e-permits-user-create__drawer` and its
scrim, and to `.e-permits-doc-peek`. **Every library modal** also drops its layer once open
(`.modal-overlay.is-active .modal { transform: none; will-change: auto }`, plus `will-change:
auto` on the overlay), set in our stylesheet because `main.css` stays identical to the library. Closing animations keep `both`, so the panel stays hidden until it is removed.

### Hover — shared rules per component class (2026-10-13)

Every interactive element shows a visible hover (memory „Hover everywhere”). Hover is written
**once per component class** in `css/e-permits-acte-permisive.css` (blocks „Hover audit” 2026-10-10,
round 2, round 3 2026-10-13, + the FO block after `.segment-item.is-selected:hover`) — never per
screen. `main.css` / `Components/*` stay untouched; override there, scoped to the class.

| Component | Rest | Hover |
|---|---|---|
| Neutral / strict button | tertiary / none | `…-tertiary-hover` / tertiary (library); open (`aria-expanded` / `aria-pressed`) keeps `…-tertiary-active` |
| Icon button resting on tertiary (`.e-permits-fo-icon-button`, close, clear, beta ×) | tertiary | `--color-background-base-tertiary-hover` |
| Bare icon inside an input (`.e-permits-fo-input__icon-button` calendar) | transparent | `--color-background-base-tertiary` |
| Chip / selected chip | library / inverse | library / `--color-background-base-inverse-default-hover` |
| Segment / selected segment | — / inverse | library / inverse-hover; `.is-animated` → the thumb (`::before`) via `:has(.is-selected:hover)` |
| Page-header tab / active tab | — / brand underline | tertiary fill / tertiary fill, brand text kept |
| BO side nav / current item | white / `blue-sky-100` | tertiary / `--color-background-brand-secondary-hover` |
| Pagination item / current page (BO + library) | — / brand | library / `--color-background-brand-default-hover` |
| Sortable table header (`th.is-sortable`) | secondary | `…-secondary-hover` fill + label `--color-text-base-default` |
| Text link (`.link-primary`, plain `a` in copy, inside a checkbox / radio label) | underline | `blue-sky-700` / brand + `text-decoration-thickness: 2px` |
| Current language (Ro / Ru / En) | underlined | 2px underline |
| FO stepper row (reachable) / current | label secondary / brand tint | label brand / `brand-secondary-hover`; not-yet-reachable rows (`aria-disabled`) = no pointer, no hover |
| Option card (`.e-permits-fo-delivery-option`, radio option rows) | white / brand tint (selected) | tertiary / `brand-secondary-hover` |
| Checkbox / checkbox in error | library | border strong · checked brand-hover / inset 1px danger (the FO error-field hover) |
| Focusable tooltip trigger in a cell (`[data-cell-tooltip-always][tabindex="0"]`: „+N” roles, JSON) | text | underline |
| Rows / clickable stack items / cards | white | BO row hover (tertiary) |
| Form Builder field card / selected card | white, border default / brand border + inset ring + 4px `brand-secondary-hover` halo | border tertiary + `--shadow-200` / ring kept, halo `brand-secondary-active` + `--shadow-200` (stronger, never lighter); focus-visible + hover keeps the focus ring + shadow |
| Open menu trigger in the builder (`.btn-strict` / `.btn-neutral` `[aria-expanded=true]`, `__version`, `__sub-add`, `__dropzone`) | pressed one step lighter (`tertiary-hover`) + focus ring | `tertiary-active` (the shell rule); `__sub-add` open tertiary → hover tertiary-hover; `__dropzone` open → border tertiary; an open `.e-permits-fo-select__button` in the builder → halo `brand-secondary-active` |
| „Lățime” option / selected option | bars grey / filled inverse | option pad `tertiary-hover`; bars that would fill or empty → `tertiary-active`; the selected option's bars → `inverse-default-hover` |

**By design without hover:** the focused field (focus wins), read-only fields (`.is-readonly`),
an open button (keeps its pressed fill), a drawer scrim, disabled items.

**Layers that ate the hover (fixed at the source, 2026-10-13):**
- `.msup` (mSupport widget, fixed 344×180) caught the pointer between its bubble and launcher —
  over the FO „Înainte” → `.msup { pointer-events: none } .msup > * { pointer-events: auto }`; its
  entrance animations held `both` (the bubble's own `:hover` transform never applied) → `backwards`.
- Registries with pinned columns: a focused / scrolled-into-view cell stopped under the pinned
  name column → `syncPinnedScrollPadding()` (shell) sets `scroll-padding-left/right/top` on
  `.e-permits-workplace__table-wrap` from the sticky cells; the pinned header cell is z-index 9 (td
  and th were both 7, so rows painted over it on vertical scroll).
- Registry row actions off-screen (Ghișeu „Dosare noi”, 2026-10-16): the table is wider than its view at
  1440, so „Continuă” / ⋮ need `pin: "end"` (above). An empty state in such a table is sticky inside
  the visible width (`--workplace-view-width`, set on the table wrap by a ResizeObserver in the shell).
- Page-header tab strip: `scroll-padding-inline: 48px` keeps a focused tab out from under the ‹ ›
  arrows and the fade.

**QA:** every UI change runs `tools/ui-qa/hover-audit.mjs` on its demo states (`--scope` the
drawer / modal for open-dialog states). `no-hover` and `covered` are major; the „not counted” lines
list the by-design cases above. Then re-check after interactions (menu open → close, drawer /
modal open → close, after a toast): no held `both`/`forwards` animation, no `will-change`, no
invisible layer at the click point.

### Servicii › Documente — documents + „Reguli de solicitare” (US-225, 2026-10-12)

Replaces the two checkboxes per document („Afișează” / „Obligatoriu”, 2026-10-09). Display and
required status are now **rules**, built like the Form Designer „Reguli de comportament” (US-42),
following A. Pascalov's comment 1961221538 and the PO's screenshot of the „Logică” tab.
- **Model** `service.geap.docs` (`serviceDocs`, built once from `rssp.documents`):
  - fields: title / titleRu / titleEn, docType, requestTypes[], applicantTypes[]
    (`DOC_APPLICANT_TYPES` PF · PJ · PF Străin · PJ Străin), required, source (RSSP / SIA GEAP),
    state (Activ / Inactiv), published;
  - `rules[] = { type: show|require, join: and|or, conditions[] }`;
  - each condition: `{ field, op, mode: value|field, value, other }`.
  - Request-form fields per request type come from `DOC_FORM_FIELDS` (demo). They have types, and
    the type decides the operators (`DOC_OPS_BY_TYPE`; number and date add < ≤ > ≥).
- **List** (`renderServiceDocuments`): `renderStackedList` grouped by request type.
  - Badges: source tag (RSSP neutral / SIA GEAP brand), „Inactiv”, „Nepublicat”.
  - Meta: tip document · tip solicitant · Obligatoriu/Opțional · „N reguli” / „Fără reguli”.
  - Row actions: „Editează” (pen). The ⋮ menu exists only on SIA GEAP documents: Dezactivează
    (published + active) · Activează (inactive) · Elimină (never published). Each asks for
    confirmation (`askConfirm`) with the US-225 texts.
  - Heading: „Adaugă document” (`btn-secondary btn-sm` + plus).
  - A role without rights sees an eye button that opens the drawer read-only.
- **Drawer** `[data-doc-drawer]` (`--wide`, `.e-permits-user-create__section` × 2):
  - **Date document:** read-only `.e-permits-cfg-ro` for RSSP documents (plus an info note).
    For SIA GEAP documents, inputs, and check options for Tip solicitare / Tip solicitant.
    **Applicant types are always shown with the icon and the full name when there is room**
    (person-filled / business-filled, „Persoană fizică”, „Persoană juridică străină”…):
    `renderCheckOption({ icon })` in forms, `applicantTags()` in read-only views. **Not in the
    stacked list:** there the meta line keeps the plain codes („PF, PJ”), no badges (user,
    2026-10-12). The stored values stay the codes PF / PJ / PF Străin / PJ Străin
    (`docApplicantLabel`).
    **„Obligatoriu” is the checkbox option with the red star** (`renderCheckOption({ label:
    "Obligatoriu", required: true })`) — the rule everywhere (user, 2026-10-12): never a Da/Nu
    segmented control, never a switch.
  - **Reguli de solicitare** (redesigned 2026-10-12, user: „too messy”). The builder reads as
    sentences, following Notion / Linear / Google Analytics filters:
    - **Rule** = a white card `.e-permits-doc-rule` (1px border, radius 12, 16 inset, gap 12).
      Rules stack in `.e-permits-doc-rules` with a 12px gap.
      - Head: rule-type fo-select (240px) „Afișează / Setează ca obligatoriu” + the keyword tag
        „acest document” + „Elimină” (`btn-text-destructive btn-sm`, as in the other sections; an
        icon-only × here read as unclear because it removes the whole rule).
      - The keywords of the sentence („Când”, „și” / „sau” as text, „acest document”) are **code
        tokens** `code.e-permits-doc-kw` (`docKw`): monospace (system mono stack), 14/20, default
        text colour, grey tertiary fill, radius 4, padding 2/8, **no border**. This is the only monospace allowed in
        the product, because the user asked for a code-type look „as other products do”
        (2026-10-12).
    - Under the head, „Când” as its own line (a code token).
    - **Condition** = one row `.e-permits-doc-cond` on a 4-column grid
      (`1.1fr · 0.8fr · 1.5fr · 32px`): câmp ▾, operator ▾, the value, and an icon-only ×.
    - **Code layout (if / else):** keywords on the left; the conditions they govern are
      indented 16px under them on a 1px guide line (`border-left`, 8px margin).
      - Between rows, the join keyword sits on its own line `.e-permits-doc-cond__join`.
      - Between rows 1 and 2 it is a „și / sau” fo-select styled as the token
        (`.e-permits-doc-kwselect`: mono, grey fill, no border, 24px high, chevron 16). Its list
        is 120px wide (`data-fo-list-min="120"`, honoured by `placeFloatingList`), so „sau”
        never truncates. It sets
        the rule's join. After that, the same word as a plain token. A segmented control was
        tried and rejected (2026-10-12).
    - **Value** = ONE bordered group `.e-permits-doc-val`: „Valoare / Alt câmp” fo-select on
      the left (112px), then the input it governs. Between them is a divider, inset 8px top and
      bottom (`::after`) so it never crosses the focus ring.
      - The inner controls lose their own border; the group carries hover, the focus ring and
        the error state.
      - With no operator, or with Este gol / Este completat, a quiet grey slot stays in place
        („Valoare” / „Fără valoare”) so the row keeps its shape.
      - „În listă” has no „Alt câmp” option; it shows check options for the field's values.
    - „Adaugă condiție” = `btn-text-primary btn-sm` + plus, right under the last row, aligned
      left with the rows.
    - At ≤720px each row stacks into full-width cells, with × on the right.
    - **Rejected:** grey block with white condition cards, and „Valoare / Alt câmp” or „Și /
      Sau” as separate segmented controls (they were disconnected from the input they govern).
      Also rejected `segmented-control--small`, which isn't in the library.
  - **Validation on Salvează:** „Câmpul este obligatoriu.” under each missing field or
    condition part.
  - **Save:** logs „Editare / Adăugare document însoțitor” with the changes (which counts in the
    header as unpublished), then a toast.
- Demo: `svc-06a` (list), `06b` (RSSP + Afișează), `06c` (RSSP warning), `06d` (SIA GEAP,
  2 conditions with Sau), `06e` (Alt câmp), `06f` (new), `06g` (validation), `06h` (new,
  filled), `06i` (Dezactivează), `01i` (Activează → pending changes).

### Dosar › Documente însoțitoare — stacked list + document modal (2026-10-14)

Detalii solicitare › **Documente însoțitoare** = what the applicant attached (user: „visible in a
modal, layout as the latest version, with date of upload and other details”). It is the
**Documente generate** stacked list (no own pattern), `renderDosarInsotitoare(row)`:
- **Data:** `buildDosarProfile(row).insotitoare`, from `e-permits-workplace.json ›
  documenteInsotitoare` (by request type; Eliberare per service, `"*"` fallback). Item
  `{ tip, fisier, kb, obligatoriu, sursa: upload|mdocs, semnat, pj, emitent }`; required ones always,
  optional ones vary per dossier; `pj` only for companies. A **post-process** (any `tipDosar` other
  than Eliberare) starts with **„Actul permisiv emis anterior”** taken from MDocs automatically (as
  FO step 3) — `act { nr, emis }`, no uploader. Ex-officio dossiers: none (their tab has no list).
  Generated / system files (Extras MPower, Cererea depusă…) stay in Documente generate. Uploader =
  the applicant / representative (FO) or an operator (BO ghișeu); times on the submission day.
- **Row:** lead icon 24 — grey `document-uploaded.svg` (from the device) or blue
  `document-generated.svg` (MDocs, as the FO summary); title = document type; tag `MDocs` /
  `Încărcat` (neutral Small); meta = file name (the act: its number, plain text) · size
  (`fileSizeLabel`: „640 KB”, „2.4 MB”, as the FO) · „Încărcat / Atașat / Preluat automat 8 iulie 2026,
  08:32” (`formatStamp`) · „de Victor Grosu” · „Semnat electronic”. Actions: none — the whole row opens the
  modal (click, or Enter / Space on the focused row: `renderRowActions({ …, rowOpens: true })` drops the lone
  „👁 Detalii”, no-lone-detalii-v1, 2026-10-21); no ⋮ (its only item, „Descarcă”, went 2026-10-20: download lives
  in the modal footer).
  Since 2026-10-14 the row is `renderDosarDocItem`, shared with Documente generate and Act/Decizie. No Obligatoriu tag —
  the groups say it. Wrapped meta lines drop their leading dot (`syncStackMetaRows` now observes the
  dossier panel too).
- **Groups / meta:** Obligatorii · Opționale (count badges); heading meta „4 documente · 3
  obligatorii”. **Empty:** library empty state, icon `document`, „Niciun document însoțitor.
  Solicitantul nu a anexat documente la cerere.”
- **Modal** = `#dosar-detail-modal` (Figma 04e „Document · detalii”) with one addition, the page
  preview on top: the template previews' grey `.e-permits-doc-peek__canvas` (+
  `.e-permits-detail-modal__preview`: radius 8, `flex: none`, max 40vh, scrolls) holding the A4
  `.e-permits-dtpl__page.e-permits-doc-peek__page` zoomed to the canvas width (`fitDosarDocPreview`,
  ResizeObserver on the modal body). Demo content from the dossier (`renderDosarDocPreview`: act,
  identity card, lease, floor plan, registry extract, declaration, fallback). Title „Document
  însoțitor” (act: „Act permisiv emis anterior”, subtitle number · service), then the „Date
  generale” card, „Doar citire”, footer Descarcă · Închide.
- Demo: `dos-04` / `dos-04g` list (story dossier = Duplicat → previous act), `dos-04h` modal on an
  upload, `dos-04i` modal on the previous act, `dos-04j` modal opened by the row click, `dos-04k` / `dos-04l` a first-issue
  dossier (D-2026-004559, MDocs extract), `dos-04m` empty (`&documente=0`, demo only).

### Documents — one pattern everywhere (2026-10-14)

User: „Documente generate also the same layout; eye and Detalii as here … the document icons are missing;
do the same data architecture … change all documents in the whole system” (+ the FO full flow).
**One data shape, one renderer per product** — never a per-screen document row.

- **Shape:** `{ sursa: "upload" | "mdocs" | "generat", tip, nr?, fisier?, size? / kb?, verb?, at?, de?,
  semnat?, tags?: [[label, tone]], group? }` (+ `obligatoriu`, `act`, `emitent`, `automat` on the
  dossier's însoțitoare; `genId`, `nrLabel`, `registru`, `decizie` on generated / acts). No `sursa` = a
  document TYPE (catalog „Documente necesare”): grey icon, no source tag.
- **Look:** lead icon 24 by source — grey `assets/icons/document-uploaded.svg` (from the device / RSSP
  types), blue `document-generated.svg` (MDocs and anything a system generated); title = the document
  TYPE (a fresh FO upload inside its own field is titled by its file name — the field label above
  already says the type); source tag neutral Small `Încărcat` / `MDocs` / `Generat` (+ status tags:
  `Proiect` until signed, `Aprobare` / `Respingere`, `Obligatoriu` / `Opțional` for types, FO validity
  badge `Activă`); meta in this order: number (plain text, 2026-10-20) · file name (dropped when it is just the
  number) · size · „<Verb> <8 iulie 2026, 08:32>” (Încărcat / Atașat / Preluat automat / Emis / Generat)
  · „de <who>” · „semnat de <signer>” (only when someone other than the producer signed: the applicant,
  the head of the authority).
- **Signed badge (user 2026-10-14):** „Semnat electronic” is never meta text — it is a blue Small tag with
  the 16px `icon-signature` (icon = label colour), right after the source tag. BO: `SIGNED_TAG_HTML` =
  `.e-permits-workplace__tag.e-permits-workplace__tag--brand.e-permits-workplace__tag--icon`; FO / Cabinet:
  library `status-tag status-tag--brand is-subtle status-tag--small e-permits-fo-doc-tag` + svg
  (`FO_DOC_SIGNED_TAG`, `CabEvo.signedTagHtml()`), padded `1px 6px 1px 4px` so it stays 20 high like the
  other Small tags (the library `:has(svg)` padding makes 22). In the modal the „Semnătură” row shows the
  badge + „MSign · <signer> · <date, time>” (`.e-permits-passport__row-note`). Title row layout: see
  „Card layout” below.
- **Meta = the stack meta (2026-10-15, user: „description and dots as in Tipuri solicitări”):** FO / Cabinet
  `.e-permits-fo-doc-meta` has exactly the `.e-permits-stack__meta` type and geometry — 12 / lh 20,
  `--color-text-base-tertiary`, text · 8 · **2px round dot** (`currentColor`) · 8 · text, `gap: 0` (no extra
  space between wrapped lines). Markup `.e-permits-fo-lib-item__meta.e-permits-fo-doc-meta` >
  `span.e-permits-fo-doc-meta__line` (always `display: contents`) > `span.e-permits-fo-doc-meta__part`
  (`--file` on the file name, with `title`); helpers `foDocMetaLines` / `foDocMetaHtml` (FO), `docMetaLines`
  (Cabinet). The dot is never an element: each part has `padding-left: --fo-doc-meta-sep` (= `8 × 2 + 2` = 18)
  and a 2px `::before` dot at `left: 8`, `top: 10 − 1` (centre of its first 20px line); the meta box has
  `margin-left: −18` + `clip-path: inset(0 0 0 18)`, so whichever part starts a line (first, or wrapped) has
  its dot clipped — no line ever starts or ends with a dot, at any width. Parts never break inside
  (`flex: none; white-space: nowrap; max-width: 100%`); only a file name too long for a whole line gives
  way (`flex: 0 1 auto`, ellipsis, tooltip). The meta flows and wraps naturally — no forced logical lines.
  BO stacked rows keep the stack meta itself (`column-gap: 18`, dot `left: −10`, `syncStackMetaRows` →
  `is-row-start`); on phones document rows hide `span.e-permits-stack__break` (no forced lines either).
- **Card layout (2026-10-15, user — every width; FO / Cabinet grid, BO the stacked row):**
  ```
  [icon] [title… [tag] [tag]            ] [× / check | actions]
         [meta 12 · flows · wraps       ]
  ```
  `:is(.e-permits-fo-file-item, .e-permits-fo-mdocs__attachment, .e-permits-fo-lib-item,
  .e-permits-fo-confirm-file--doc):has(> .e-permits-fo-lib-item__content)` = grid `24 | minmax(0,1fr)`
  (`| auto` when there is a ×, check, `.cab-doc__actions` or a `.btn`), column gap 12, row gap 4; the content
  block is `display: contents`. Icon `grid-row: 1 / -1; align-self: center` (centred on title + meta).
  Title row (column 2): title `flex: 1 1 64; max-width: max-content; min-width: 0` + one-line ellipsis +
  `title` tooltip → the tags sit **right after the title text** (gap 8, 4 between tags, `flex: none`), the
  title truncates first, and the tags wrap under it only when not even 64 of it would stay (an MDocs value
  with MDocs + Semnat electronic + Activă at 375). Meta `grid-column: 2 / -1` (under the title, may run under
  the ×). × (32) on the title line (`margin-block: (20 − 32) / 2`), picker check (20) column 3 row 1. Labelled
  actions (Cabinet / post-process „Detalii”): desktop column 3 across both rows, centred; ≤720
  row 3 in the text column (`margin-top: 8` → 12 under the meta), the icon stays centred on rows 1–2.
  BO document rows (`.e-permits-stack__item.has-lead:has(> .e-permits-fo-lib-item__icon)`, ≤760): icon
  `align-self: center`, title the same `flex: 1 1 64; max-width: max-content` one-line ellipsis (tooltip =
  `title` from `item.plainTitle`, set by `renderStackItem` for rows with a lead), tags `flex: none`.
  Rejected on the way (user, same day): tags + meta in one inline row; meta / tags at the full card width
  under the icon; tags pushed to the right edge.
- **One card surface (2026-10-15, user: „why do the blue documents have a different grey and corners?”):**
  every card that shows the shared content — field values (MDocs / uploaded), upload preview, post-process
  previous act, Verificare, Cabinet — = `--color-background-base-secondary` + `--border-radius-12`,
  padding **12** all round at every width, icon gap 12 (one rule; it was MDocs secondary / r12 / 16 vs
  uploaded + Verificare + Cabinet tertiary / r8 — the later `.e-permits-fo-file-item` /
  `.e-permits-fo-confirm-file` base rules overrode the attached item). Cabinet hover stays
  `tertiary-hover`. The picker modal options stay white + 1px border + r12 / 12 (selectable options with a
  selected state). Finalizare (`.e-permits-fo-finish-doc`) keeps its green card. BO rows 12 / 20.
- **Tags keep one size (2026-10-15):** the library `.status-tag--small` reads `--text-caption-md-font-size`,
  which main.css drops to 10 at ≤720 — `.e-permits-fo-doc-tag` pins it to `--font-size-fs-12` → 12 / 14,
  20 high, at 375 / 390 / 720 / 1440 (BO `.e-permits-workplace__tag` is 12 / 20 already).
- **Tags inside summary rows (2026-10-16, Figma QA):** a value of `.e-permits-fo-summary-row__value` may hold a
  tag — always the Small one (`status-tag … status-tag--small`, e.g. Cabinet „Statutul dosarului” / „Statutul
  notei”). The value text rule is `.e-permits-fo-summary-row__value span:where(:not(.status-tag, .status-tag *))`
  (14 / 20 medium, default colour) so it never reaches a tag (it used to make them 14 px with the text colour),
  and the value pins `--text-caption-md-font-size` to 12 → the tag is 12 / 20 high at 1440 and 375. Same
  exclusion on the Cabinet `.cab-detail__card … __value span` flex rule (the tag keeps its own gap 4).
- **× size:** the smallest documented icon-only button is 32 × 32 with a 16 icon (`btn-sm btn-icon-only`,
  and `.e-permits-fo-document-remove` is the same box); nothing smaller exists (`.btn-icon.clear` 20 is the
  search-input clear only) — do not hand-roll a smaller one.
- **Document field header on phones (≤720):** `.e-permits-fo-doc-field__row` is a column (text, then
  „Adaugă fișier” / Încarcă full width — every doc field, not only `--boxed`); the label
  `display: block` + `padding-right: 18`, the red star `margin-left: 2; margin-right: -14;
  vertical-align: middle` (zero advance → it always stays on the last word's line), the „Opțional” tag
  `margin-left: 2; vertical-align: middle`. Desktop keeps the flex label.
- **„Opțional” (2026-10-15, user):** the bordered Small tag of the document cards —
  `span.status-tag.status-tag--neutral.is-subtle.status-tag--small.e-permits-fo-doc-tag.e-permits-fo-optional-tag`
  (the last class is only a hook: `vertical-align: middle`, stripped from label copies); the old grey pill
  is gone.
- **Actions:** „👁 Detalii” (`btn-neutral btn-sm` + eye, the row-actions rule 4), no ⋮ / download (see „No download
  in document rows” below); the whole
  row / card opens the document modal. Read-only review lists (FO Verificare) and type lists have no
  actions; form field values keep their × remove.
- **Modal:** the A4 page preview (grey `.e-permits-doc-peek__canvas` + `.e-permits-dtpl__page`, zoomed
  to the width) over „Date generale” rows: Tip document · Statutul (tags) · Număr … · Pasul din flux
  (generated) · Fișier · Dimensiune · <Verb> la · <Verb> de · Sursă / Obligatoriu (însoțitoare) ·
  Registru (acts) · Semnătură · Număr dosar; footer Descarcă · Închide.

| Product | Renderer | Where it is used |
|---|---|---|
| BO shell | `renderDosarDocItem(doc, kind)` → stacked-list item; `dosarDocsOf(profile, kind)`; modal `openDosarDetail(kind, id)` (one branch for `insotitoare` / `documente` / `acte`) + `renderDosarDocPreview`; data `buildDosarActe`, `buildDosarGenerate` from `e-permits-workplace.json › documenteGenerate` (`tipuri` by `pas`, `acte`, `conducator`) | Dosar › Detalii solicitare › Documente însoțitoare (groups Obligatorii / Opționale), **Documente generate** (groups = flow step), **Act/Decizie** |
| BO shell (types) | `renderServiceDocuments` stacked list (grey icon, type, RSSP / SIA GEAP tag, meta type · applicants · Obligatoriu · rules), whole row opens the document drawer (`data-doc-row`) | Serviciu › Documente (admin „Editează” + ⋮; others: no button — the focusable row, no-lone-detalii-v1) |
| FO | `foDocIconHtml(doc)`, `foDocContentHtml(doc)` (lib-item content: title row + `.e-permits-fo-doc-tag` + meta with dots), `foDocFromLibrary`, `foSummaryDocsHtml(panel)`; every attached value carries its shape in `data-fo-doc` | picker modal „Adaugă fișier” (`.e-permits-fo-lib-item` card per document — layout kept), field values (`foDocAttachFileItem` / `foDocAttachMdocsItem`, step 3, guest procură, Form Builder Fișier preview), „Document din MDocs” combobox value, post-process previous act (`postprocessPrevActDoc`, + „👁 Detalii” `data-fo-pp-prev-act-open` → `#fo-certificate-modal` as the FO document viewer, `certView`), Verificare și semnare › Documente însoțitoare (`.e-permits-fo-confirm-file--doc`, titled by the field's type) for the request and the post-processes |
| EVO Cabinet | `CabEvo.docRowHtml(doc, { key })` (FO summary card; with a key the card is the control — `tabindex 0`, „<tip>, deschide detaliile”, click / Enter / Space; no ⋮ since 2026-10-20, no „Detalii” since no-lone-detalii-v1), `CabEvo.openDocModal({ title, subtitle, doc, pageHtml, rowsHtml })` (FO doc-modal shell, `.cab-doc-modal`) | Solicitările mele › dosar › Documente însoțitoare (certificat constatator generated + uploads), Catalog › serviciu › Documente necesare (types) |
| RAP (EVO public) | `GEAPActView.openDocument(act)` (js/act-view.js, 2026-10-17: also the Cabinet act profile and its ⋮ „Descarcă actul (MDocs)”) — the same FO doc-modal shell + canvas + A4 page as Cabinet, page only (no „Date generale”: the act page shows them), footer Imprimă · Închide; CSS from `css/act-view.css` + `css/doc-modal-parts.css` (values of the FO originals, never loaded where e-permits-acte-permisive.css is) | Act profile › „Vizualizare actul” (US-143, US-162 AC-12) |

### No download in document rows (2026-10-20, user — product-wide rule)

„Everywhere for documents we don't download the document in the list row; only in the modal. A ⋮ that has only
„Descarcă” — delete it.” (Figma GEAP 11333:20746 was such a ⋮.)
- **Row:** opens the document modal — the row / card click (+ Enter / Space; a clickable row has no lone „👁 Detalii”
  since no-lone-detalii-v1); „👁 Detalii” (`btn-neutral btn-sm` + eye) only where the card itself is not clickable. No
  „Descarcă” menu item, no direct download icon button, no `<a download>` on a document row / card.
- **⋮:** only when other row actions remain (Înlocuiește, Elimină, Semnează…). A ⋮ left empty is removed with
  its slot (`renderRowActions` drops it when `menu` is empty; Cabinet `docRowHtml` has none) — no reserved space.
- **Modal:** keeps „Descarcă” (`icon-export`) in its footer: BO `#dosar-detail-modal` (`data-dosar-detail-download`),
  Cabinet `CabEvo.openDocModal` (`data-cab-doc-download` → saves the document's details), FO `#fo-certificate-modal`
  (certificate + post-process previous act), Ghișeu previews (`data-gh-download`), RAP / Cabinet act viewer
  (`GEAPActView`). Generated acts / certificates follow the same rule: download inside their viewer.
- **Not document rows (left as they are):** the payment-note card „Descarcă nota de plată” (the payment step's own
  action, FO + Ghișeu), the Cabinet request row ⋮ / status card / Act tab „Descarcă actul / decizia /
  certificatul” (US-19 AC-12/14, US-161 — request actions, not a document list), the eKYC SDK versions „Descărcare”
  link (a package URL, no document), CSV templates / exports.
- Demo: `dos-04g` / `dos-04n` (rows: „Detalii” only), `dos-04j` / `dos-04q` (row click → modal), `sm-05e` / `sm-05g`
  (Cabinet cards), `pp-10c` / `pp-10c1` (FO previous act → viewer), `gh-07a3` (Ghișeu signed request → preview).

**Kept on purpose (different pattern, reason):** FO upload rows while uploading (`.e-permits-fo-file-item`
with progress — a form input; only the icon became the grey document), the MDocs combobox *options*
(a listbox, not cards), Pași care generează documente in the request-type drawer (`rtOverrideRow` —
a step → template setting, not a document), Șabloane / Formulare lists (templates, not documents),
eKYC Dovezi (image / video evidence thumbnails with a viewer), Cabinet act section / act profile and the
FO intent act list (act records with their own actions, not files), the FO finish card „Certificatul
constatator · Vezi documentul” (one card, navigation to the certificate).
Demo: `dos-04g…04m` (însoțitoare), `dos-04n` (Documente generate), `dos-04o` / `dos-04p` (modal: cerere,
plată), `dos-04q` (row click → modal), `dos-04r` (draft act, `Proiect`), `dos-04s` / `dos-04t` (Act/Decizie modal),
`svc-06a` (passport types), `fo-04d` / `fo-04e` / `fo-04f` (picker, selected, attached), `fo-g5` / `fo-g7a`
(uploaded field value), `fo-08` / `fo-g7d` (Finalizare certificate), `fo-05d` / `fo-g7b`
(Verificare), `pp-10c` / `pp-10c1` / `pp-10d` (previous act, its viewer, summary), `sm-05e…05h` (Cabinet list, modal, card click → modal),
`cat-02` (Documente necesare).

### Document preview — one A4 viewer (2026-10-17)

User (Ghișeu „Cererea pe hârtie”, Figma GEAP 11728:279186): „do this nicer, and «Printează» also with a print
icon”. The paper-request preview had a 40vh window, an unfitted page and no print icon; RAP had the good viewer
(pagination, fit, print) as private code. Now there is ONE implementation:

- **JS** `js/doc-preview.js` → `window.GEAPDocPreview`:
  `paginate(canvas, { repeat, tail })` (measured unzoomed; table rows that do not fit move to continuation
  pages with the `data-doc-cont` line on top, the closing parts (`tail`, default `.e-permits-doc-page__tail`)
  go to the last page with ≥ 2 rows, a heading row never ends a page, „Pagina k din n” in every
  `[data-doc-page-label]`); `fit(canvas)` (every page zoomed to the canvas width minus its COMPUTED padding,
  never > 1); `print(canvas)` (marks the canvas + its top-level `<body>` child; `@media print` hides the rest
  and prints the pages at A4, one per sheet); `printIcon(cls = "icon small")` (the nav printer, stroke =
  label colour — the sprite has none).
- **CSS** `css/doc-preview.css` (BO page + RAP page): page parts, fixed 2-column table (label 40 % in
  `--color-text-base-secondary`, values wrap with `overflow-wrap: anywhere`), heading rows, continuation line,
  footer (pushed to the page bottom; RAP pins its own under the signature block), page gap 24, measuring pass,
  state canvas, print. The base page / canvas / surface rules stay in the „A4 page” + doc-peek canvas CSS.
- **BO dialog for a document-only preview** (Ghișeu): `#dosar-detail-modal` with `modal--lg
  e-permits-detail-modal--doc` (height = screen − 2 × 48, the canvas fills the body; back to `modal--md` on
  close). Header = title + subtitle „<what produced it> · <date>” — **no request number in the subtitle**
  (user 2026-10-17: the number is on the page). Footer: „Printează” `btn btn-neutral btn-rounded` + print icon
  (paper request only) · „Descarcă” `btn btn-primary btn-rounded` + `icon-export`. While MDocs works:
  subtitle „Formularul de tipar al cererii”, `GEAPEmptyState` loading („Se generează cererea”), footer
  „Închide”; MDocs error: `circle-error` + „Reîncercați” (`btn btn-strict btn-sm` + `icon-rotate-arrow`) in
  the empty state; the step keeps its inline retry after the dialog is closed.
- The BO dossier document modal (preview above the details, 40vh window) uses `fit` only; RAP passes
  `{ repeat: ".rap-act-doc__watermark", tail: ".rap-act-doc__closing, .rap-act-doc__foot" }`.

Demo: `gh-07a` (2 pages), `gh-07a1` (`?mdocs=incarcare`), `gh-07a2` (page 2), `gh-07a3` (signed request),
`gh-07g` (MDocs error), `gh-07g1` (error closed → inline retry), `gh-10d` (certificate); `rap-03k` (3 pages).

### Generated document viewer = preview + signature block (doc-viewer-v1, 2026-10-21)

User: „for the generated document remove «Doar citire» and «Date generale» — no value, we just clicked on it, focus on
the preview; show only a nicely integrated signature part, the badge ABOVE «MSign · SIA GEAP · 8 iulie 2026, 08:46», not
next to the title”. Reference: GEAP 2.0 11366:6892 „Modal content / Document · details”.

- **Generated** = a system document (`sursa: mdocs | generat`, the blue `document-generated.svg` icon; acts, decisions,
  certificates, extracts, MDocs forms). Its viewer shows ONLY: header (title + subtitle, no numbers — rule) · the A4
  canvas taking the dialog height · the signature tray · footer (Descarcă / Imprimă · Închide). No „Date generale”, no
  „Doar citire”, no signature badge in the header or in a row.
- **Signature tray** `GEAPDocPreview.signatureHtml({ by, at, provider = "MSign", sprite })` →
  `div.e-permits-doc-signature[role=group]` > Small tag `status-tag status-tag--brand is-subtle status-tag--small
  e-permits-fo-doc-tag` (`icon-signature` 16, „Semnat electronic”) + `p.e-permits-doc-signature__meta` „MSign · <signer>
  · <date, time>” (date rule „8 iulie 2026, 08:46”; date only when the data has no time — act issue dates). Geometry:
  directly under the canvas (the viewer body drops its gap), inset = the canvas padding (24 desktop, 8 phones ≤760, +8
  below on phones), background `--color-background-base-secondary`, radius 0 0 16 16, padding 12 16, gap 2, meta 14/20
  `--color-text-base-tertiary`. Signer = the data's signer (`semnat.nume`, `de`, the issuing authority for acts) — never
  invented. **Unsigned** generated document (Proiect, the paper request, a paper act `signed: false`) = no tray, no
  „Nesemnat”.
- **v2 (same day, Figma 11366:6892 updated + user „the document window should be the same round as the wrap”)** — supersedes
  the tray geometry and the „generated only” scope above: EVERY document viewer (generated AND uploaded — the Figma
  component is „Document · details”, the însoțitor modal) = header · canvas · signature CARD · footer. Card = 12 under the
  canvas, as wide as the canvas (inset 0; phones 8 from the screen edges + 8 above the footer), radius 16 on every corner,
  padding 12 16, gap 2. Canvas = radius 16 + an inset 1px `--color-border-base-default` ring (Figma draws 24; no 24 token in
  main.css → 16, the card's radius, so canvas + card read as one unit); phones keep the edge-to-edge canvas (radius 0, no
  ring). Unsigned document (Proiect, Cabinet uploads without signature) = the preview only. Payment notes / approvals keep
  their details card + „Doar citire”.
- Where: BO `openDosarDetail` (toggles `e-permits-detail-modal--doc` on `#dosar-detail-modal`, md width); Cabinet
  `CabEvo.openDocModal({ generated, signature })` (`.cab-doc-modal__body--doc`: dialog = base max-height, canvas fills;
  phones: canvas edge to edge, 8 around the page); act dialog `GEAPActView` „Vizualizare act” / „Forma de tipar”
  (`act.signed`, default true); Ghișeu certificate + signed request (subtitles no longer repeat signer / date).
- Not changed: the FO `#fo-certificate-modal` (certificate / previous act) has no A4 preview — it is a summary card
  (open question). Download text of a generated doc still carries the details rows.
- Demo: `dos-04e/04o/04p/04s/04t/04i/04l` (signed), `dos-04q/04r` (Proiect, no tray), `dos-04h` (upload, unchanged),
  `sm-05f` (certificate) vs `sm-05h` (upload), `pp-01m/01n/01z` + `rap-03l` (act), `gh-10d` / `gh-07a3` (tray), `gh-07a`
  (paper, none).

### Stacked-list row hover — full width (2026-10-14)

User: „the hover on document rows looks cut off and ugly … at least full width”. Cause: the list had
`padding: 0 20px`, so a row (and its fill) stopped 20px short of the card on both sides, and nothing
followed the card corners. Rule, for every `.e-permits-stack` (all stacked lists):
- `.e-permits-stack__list { padding: 0 }`, `.e-permits-stack__item { padding: 12px 20px; position:
  relative }` — the inset moved from the list to the row; the divider stays inset (20/20) as
  `.e-permits-stack__item + .e-permits-stack__item::before` (1px border/base/default), so rest looks the same.
- `.is-clickable` rows: fill `--color-background-base-tertiary` on `:hover`, while its ⋮ is open
  (`:has([aria-expanded="true"])`) and while one of its controls has `:focus-visible` (the row itself is
  not a tab stop — its „Detalii” is); `transition: background-color 140ms var(--motion-easing-standard)`,
  none under `prefers-reduced-motion`.
- Dividers above and below the band hide (`border-top-color: transparent` on its `::before` and on the
  next row's) — one clean band; the last row still has no divider.
- Corners: `.e-permits-stack` sets `--stack-radius` (12; eKYC dashboard 16); the first row of the first
  group without a group label and the last row of the last group take `calc(var(--stack-radius) - 1px)`.
- On the band the grey `btn-neutral` „Detalii” turns white until it is hovered itself (grey on grey
  does not read as a button). Same on the Cabinet grey document card (`.cab-doc__actions > .btn-neutral`),
  whose own hover is `--color-background-base-tertiary-hover` (since no-lone-detalii-v1 the keyed card has no button;
  the rule stays for any future card action).
  Same on the act row (`.e-permits-fo-intent-act:is(:hover, .is-selected)` → the „Postprocese” button
  white, incl. disabled on a locked row; open keeps `secondary-active` + ring). The „Solicitare nouă” card has no
  inner control (the whole card is the button) — nothing to lift.
- Rows with their own band follow the same shape: `.e-permits-rt__action.is-previewing` (brand-secondary,
  full width, dividers hidden). `.sm-list` (separate boxes) switches the `::before` divider off.
- Check: hover-audit + real-mouse crops of the first / middle / last row (scratch rowhover.mjs: row x =
  card x + 1, right gap 1 = the card border).

### Documente însoțitoare (RSSP) in a service — document tiles, not label/value rows (2026-10-03)

(Superseded: since 2026-10-14 no screen renders these tiles — the passport moved its documents
to the Documente tab and the dosar profile to the stacked list above; the `__file*` CSS is unused.)

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

> **Dosare (2026-10-13):** `dos-01…05a` open the story dossier D-2026-004575 as the block's role
> (`dos(role, stare, tab, extra)` in demo-states.js). A `#dosar/` deep link accepts the demo-only
> params `stare=<status key>`, `suspendat=1`, `decizia=respingere` (`applyDemoCaseState` in the
> shell: sets the status, rebuilds the case flow). Trajectory in Figma = code = 9709:1137 (section „Trajectory
> (traiectoria dosarului) — one component”); „Acum” callout inset 24 (= card radius), radius 0 0 24 24, padding 12/16, title 14/20.

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

### RAP — public registry: Figma board (2026-10-17)

File EVO-WEB-3.0 (ecosystem) `YrIzksVgFqtPqDd5z9zY5h`, page „↳ Registrul actelor permisive” `20304:64765`, right of the
existing PF/PJ profile sections (those, incl. the data-modal reference `20607:34846`, are untouched). Code: `rap-evo/`
(sandbox `…/geap-sandbox/rap-evo/index.html?state=<id>`). Builders: `tools/figma/rap/` (spec.mjs → compact.py →
payload*.py → lib/screens/blocks/modals.js, stored in figma.root plugin data `rap/*`), connector audit
`tools/figma/rap/connector-audit.js`.

- **Board = one page-level Section per column** (like the GEAP Ghișeu board), from x 10989 / y −103, 80 apart; column =
  80 | block 1895 (desktop 1440 + 80 + phone 375) | 320 gutter for jump markers:
  `00 · Start here · Contents` 22069:11258 (contents with links, how to read, flow, rules, PO questions, not built, code
  findings) · `01 · Registry list` 22069:11259 (rap-01, 01q, 01e, 01f) · `02 · Filter` 22101:35849 (rap-01a, 01b, 01c,
  01h, 01d; phone-only rap-04…04d) · `03 · Act profile` 22069:11260 (rap-02, 02a, 02g, 02d, 02b, 02h, 02c) ·
  `04 · Act modal + printable form` 22069:11262 (rap-03, 03g, 03h, 03i, 03j, 03m, 03n, 03o; 03a, 03l, 03k, 03b, 03f,
  03e, 03c, 03d) · `05 · Company acts` 22069:11261 (rap-01g). 38 blocks: 33 desktop + 38 phone screens.
- **Block** = `Board / Block label` (id · title · „Figma aligned”) → desktop + phone 80 apart → `Board / Note` (state,
  Azure US-139 91135 … US-162 91373, „Prototype ↗”). Column header = `Board / Stage header` (ID / Title / Line).
- **Arrows**: same-column connectors live inside their section (side lanes); next-column connectors run straight at the
  trigger's height (Filtru → rap-01a, Vezi act permisiv → rap-03). Backward / column-skipping / long-jog jumps =
  `Board / Jump marker` 22102:5678 (label + NODE hyperlink) at block x 1911, centred on the trigger.
- **Local components** (page „🧱 Local Components”, section „RAP · Public registry components (2026-10-17)” 22060:2438):
  RAP / Status tag 22060:5051 (Small + 1 px tone ring; Info tone 22069:11263), RAP / Copy value 22060:5068,
  RAP / Beneficiary avatar 22062:122386, RAP / Table header 22063:5069, RAP / Table row 22063:5326, Empty state 22064:6863,
  Facet filter · option 22064:6908, Facet filter · popover 22068:187098 (+ per-facet), Filter button (advanced filter)
  22068:187089, Profile / Header meta item 22066:5465 + separator 22066:5466, Profile / Section title 22066:5467,
  Profile / Details row 22066:5558, Profile / Beneficiary card 22066:184323, Read-only note 22087:27741, A4 act page · row
  22089:211456 + A4 act page sets, Document modal (MDocs act) 22089:209155 (INSTANCE_SWAP „Canvas” = Doc canvas · <state>),
  Data modal content · <state> (slot of the library modal Medium), Filter sheet content · <state> (slot of the library
  Bottom Sheet), Board / Block label 22060:5083, Board / Note 22060:5084, Board / Stage header 22069:2601,
  Board / Jump marker 22102:5678.
- **Modal headers** (code 5b15f948): „Vizualizare act” and „Forma de tipar a actului” subtitles = the act name only
  (clamp + „Mai mult” when long); the act number lives in Date generale / the A4 page.

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

**✅ Status 2026-10-21 (library-adopt-v4, measured in the browser on all 9 pages):** `--black-1000` / `--white-1000` ARE defined in main.css since the Sept 2026 repair (`:root`, lines 8–9), so 10 of the 11 tokens below resolve everywhere. The one still invalid in the light theme was `--color-background-base-inverse-on-color` (main.css defines it only in `[data-theme=dark]`) → `css/token-fix.css` (loaded right after main.css on every page) defines it as `var(--white-1000)`; EVO Cabinet's page-scoped copy of all 11 (`.cab-page`) was removed. Computed colours of ~27 000 elements on 29 page × width samples: identical before / after. The table below is the HISTORY of the Sept audit.

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


### Table rules — dates and truncated text (2026-10-10, all lists)

- **One date format in every table column**: `renderDateTime(value, who, { short })` — date
  „30 septembrie 2026” over „hh:mm · who” (12/16 tertiary). No `dd/mm/yyyy` in a column. Applied to
  Utilizatori (Ultima conectare: „hh:mm · acum N zile”; „Modificat”, was the typo „Ultimei
  actualizări”), Roluri („Creat”, was „Data creării”), Dosare / Acte (Data depunerii, Data
  semnării, Termen de examinare „6 august 2026” over „28 z. rămase”), Servicii, Tarife,
  Clasificatoare, Șabloane. Date columns are ≥ 150 wide (longest month). Demo data with a date only
  gets a stable working-hours time (`withDemoTime`) and an editor (`demoEditor`).
- **Truncated text always has a tooltip** (`js/table-cells.js`, loaded on every page with tables):
  any text clipped inside a table cell — ellipsis or line clamp — shows its full text on hover
  (1 s, then instant along the column) and on keyboard focus, with no attribute.
  `data-cell-tooltip="…"` only overrides the text (full name behind an abbreviation);
  `data-cell-tooltip-always` shows it even when nothing is clipped.
- **Name over a secondary line** = the Roluri pattern: `.e-permits-workplace__role-identity` ›
  `__role-name` + `__role-meta` (12/16 regular tertiary). A copyable value in the meta line keeps
  that type and gets a rounded `--color-background-base-tertiary-hover` pill on hover/focus
  (Configurări servicii › Serviciu: name over the RSSP code).
- **Every line of a cell stack is one line with an ellipsis** (2026-10-16, user: „Aviz
  sanitar-veterinar pentru unitățile de producție” ran under the next column): in any `td`,
  `__case-cell`, `__role-identity` and `__date-stack` are capped at the cell width
  (`max-width: 100%`) and each child line is `nowrap` + `overflow: hidden` + `text-overflow:
  ellipsis` (a dot-less `__date-meta` becomes a block so its text can ellipsize; a meta line
  holding a copy-code stays unclipped). One rule in css/e-permits-shell.css („one line per cell
  text”); the tooltip comes from `js/table-cells.js`. Covered: Configurări servicii, Roluri, eKYC
  registries, Fluxuri de lucru („Folosit de”), Clasificatoare / every „date over hh:mm · who”.

### US-226 Clasificatoare specifice în pașaport (2026-10-10)

**Azure:** US-226 „Configurarea valorilor clasificatoarelor specifice ale serviciului” 95240.

- Stacked list grouped by **Categorie** (user decision: stacked, not table): „Specifice serviciului” ·
  „Ale autorității” · „Globale · doar vizualizare”. Data comes from the Clasificatoare module
  (`svcClassifiers(service)` reads `geap.classifiers[].clasId` → `getClassifier`): global → Global;
  specific used by 1 service → Specific; by ≥2 services of the authority → Autoritate.
- Row: name + Activ/Inactiv tag; meta = code (plain) · „N valori” (`roCount`) · „Sincronizat din
  MConnect” · „Editat <data> · <cine>”. Actions per the row rule: editable (Manual & CSV, AC-13) →
  „Editează” (pen); otherwise the strict eye. The whole row (Enter/Space too) opens the values.
- Opening from the passport = `openClassifierProfile(id, "valori", { fromService })`: breadcrumb
  Configurări servicii › cod › clasificator, back „Înapoi la pașaportul serviciului”, tabs only Valori +
  Jurnal (AC-07), no Arhivează; Global read-only even for the central admin (AC-08) with a lock notice.
- Demo: svc-07, 07a (specific → + Adaugă valoare / Importă CSV), 07b (CUATM, MConnect), 07c (new value),
  07d (CAEM-2 global, read-only), 07e (back to the passport). Data: classifiers cl-com-activ,
  cl-com-produse, cl-mec-motive (authority MEc).

### US-231 Sincronizarea serviciului + US-232 Activ/Inactiv din RSSP (2026-10-10)

**Azure:** US-231 „Sincronizarea manuală și automată a serviciului din RSSP” 95245 · US-232
„Activarea și dezactivarea unui serviciu prin sincronizare din RSSP” 95246.

- Core `servicePassport.syncService` returns `outcome` + `changes` (tested): created · updated
  (changes → Schiță, AC-09) · unchanged (only the sync date, AC-13) · deactivated (Inactiv applied at
  sync, US-232 AC-02) · reactivated (no other change, AC-08) · reactivatedDraft (stays Inactiv,
  `pendingStatus` applied at publication, AC-09/10). Status events are by „SIA GEAP” and silent
  (`SERVICE_EVENT_SILENT`); the authority link is logged only with data.
- Sync modal: one title + banner per outcome (`SYNC_OUTCOMES`); updated uses AC-18 verbatim; the
  changed fields as `.e-permits-event-diff` (lists = „… adăugate / eliminate”).
- „Date din RSSP”: „Resincronizează” (central admin, AC-04) + tag Eșuat after a failed sync (AC-20).
  Date generale of an inactive service: warning banner (inactive / waits for publication).
- Registry: „Sincronizare automată” (neutral, central admin only, AC-05/06) → modal with Frecvența
  (choice chips) + Ora rulării (fo-select) + who is notified (AC-07; the bell panel is Feature 91425).
- Demo: svc-01k (unchanged), 01l (deactivated), 01m (reactivated), 01n/01o (reactivated with data),
  01p (inactive passport), 01q (Eșuat), srv-03/03a (automatic sync). RSSP mock: `rssp.overrides`.

**Section-over-card rule (2026-10-10, user, whole project):** when a section's content is a gray
details card (`.e-permits-dosar-profil__card`), its header has no bottom divider, no gap to the card and
the Date generale inset — padding 8 / 12 — so the title lines up with the rounded card (drawer sections:
`.e-permits-user-create__section:has(...card:first-child)`; Figma: header frame strokeBottom 0, padding
8/12/8/12, content paddingTop 0 — applied to 21 headers on Tarife, Servicii, User Management).
**Menu-button rule:** a labelled button that opens a menu is label + chevron (library Icon=Trailing, one
icon only) — „Sincronizare ▾”, „Sincronizează ▾” (multi-source), „Adaugă tip solicitare ▾”, „Inserează
câmp ▾”, „Programat · … ▾”. Registry: both syncs live under „Sincronizare ▾”.
**Export icon:** `icon-export` / Figma `20/export` = central „arrow-inbox, download” (arrow over a tray) — also every „Descarcă” download action (2026-10-17).

**Last-row rule (2026-10-10, user, whole project):** a row that is the last one in its card / list /
modal never draws its bottom divider (`.e-permits-dosar-profil__row:last-child`, `svc/field-row`, info
rows, stack items). Figma: the last `svc/field-row` (and any bottom-only divider row) in a vertical
container has `strokeBottomWeight = 0` — applied file-wide 2026-10-10 (116 field rows + 100 other rows).

**Figma (2026-10-10):** US-226 → Servicii › 08 (grouped list), 08a (values from the passport — since 2026-10-12 the SAME editor and tabs as Administrare › Clasificatoare: Valori editable, Coloane / Hartă dependențe / Setări read-only with the lock notice „Detaliile și structura se modifică în Administrare → Clasificatoare.” (US-226 AC-06/07, Alexandr) — demo svc-07a1 / svc-07a2), 08b (global, read-only); local component „Conținut modal · Detalii eveniment” (11d).
US-231/232 → 01 „Date din RSSP” with „Resincronizează” + „Ultima sincronizare” meta on every Date
generale screen; 01d (AC-18 text + „Modificări preluate din RSSP”); 01k unchanged · 01l deactivated ·
01m reactivated · 01n reactivated with data · 01p inactive passport · 01q Eșuat; registry 05 „Sincronizare
automată” + the neutral button on every registry screen.

**Hover rule (2026-10-10, user):** every interactive element shows a visible hover. On white:
`--color-background-base-tertiary` (#f1f1f1, not the library's #f5f5f5); controls already tertiary →
`--color-background-base-tertiary-hover`; text-like controls → brand text colour; a selected chip →
`--color-background-base-inverse-default-hover`; an open button keeps its pressed fill on hover.
`.link:visited:hover` restores the link hover the library's LVHA order hid.

### US-228 Jurnal de evenimente al serviciului (2026-10-10)

**Azure:** US-228 „Vizualizarea, căutarea, filtrarea și exportul jurnalului de evenimente al pașaportului
serviciului” 95242.

- Header in two rows (user decision 2026-10-10). Row 1 `.e-permits-svc-events__heading`: title
  „Jurnal de evenimente” + `.e-permits-svc-events__count` (14/20 tertiary, aria-live)
  „100 de evenimente · Jurnalizat prin MLog”; while a search/filter is active it reads „8 din 100 de
  evenimente · …”. No count badge (it would repeat the number). Row 2 `.e-permits-pay__toolbar
  .e-permits-svc-events__toolbar`: search „Caută eveniment sau autor” + „Filtrare avansată”
  (`SF_LISTS.jurnal`) on the left; sort „Cele mai noi / Cele mai vechi” + ⋮ „Exportă (Excel)” on the right.
- Filters: Tip eveniment · Creat de · Rolul · Tab · Perioadă (Astăzi / 7 / 30 / 90 de zile / Mai vechi) ·
  Rezultat. A facet with `always: true` shows even with a single value (Perioadă), others need ≥2.
  Empty: AC-15 „Nu au fost găsite evenimente.”, AC-16 „Nu există evenimente înregistrate.”
- Clickable timeline item (`renderEventTimeline(…, { openAttrs })`): the `li` gets `.is-clickable`
  (hover background, radius 8), the title becomes `<button class="e-permits-timeline__link"
  aria-haspopup="dialog">` with an underline in the border color (currentColor on hover). After the title:
  the Tab tag (neutral Small), Eșuat tag when failed. Stamp: date · user · role. Sync runs without a user =
  „SIA GEAP”.
- Details: `#dosar-detail-modal` — „Date generale” info card (Denumirea, Tip eveniment tag, Data și ora,
  Creat de, Rolul, Tab, Rezultat tag, Descriere) + „Modificări” card (`.e-permits-event-diff`: old value
  struck through `__before` → new value), muted note when none, „Doar citire” note, „Închide”.
- Demo: svc-11 (list), 11a (search), 11b (Rezultat = Eșuat), 11c (filter bar open), 11d (details),
  11e (SIA GEAP sync details), 11f (oldest first).
- Figma (Servicii › Profile Serviciu, column x 35348): Block 11 / 11a / 11b rebuilt from the code data
  (header in two rows, underlined titles + Tab tag, date · user · role); 11b uses the advanced-filter bar
  detached only to fit 6 chips (the chips stay instances — the bar component has 4 + „Mai multe”).
  Block 11d = shared `Modal` instance (Tip=Conținut) with the local content component
  „Conținut modal · Detalii eveniment”. Sort icon = local `16/arrow-down` / `16/arrow-up` (EVO has no 16px
  arrow-down; they wrap a rotated EVO 16/arrow-left).

**Add-button rule (2026-10-10, user):** every in-content „Adaugă …” button is `btn btn-secondary btn-sm`
(blue-sky-100 bg, blue-sky-600 text) with a `+` icon in the same blue (`icon-plus-large`, currentColor) —
never Neutral/gray. Page-level primary CTAs and modal confirm buttons stay `btn-primary`. Figma: 🖌️ Style =
Secondary, icon fill bound to the brand variable (no gray override).

**Export icon rule (2026-10-10, user):** every „Exportă…” action (⋮ menu item or icon-only table button)
uses the download arrow over a curved tray: code `icon-export`, Figma local `20/export` (central icon
pack „arrow-inbox, download”, stroke 1.5, radius 2).
**Download icon rule (2026-10-17, user — supersedes the old `icon-download` exception):** every
download action uses the SAME `icon-export` — „Descarcă …” buttons (act / decizie / certificat / nota de
plată / post-process / RAP „Vizualizare act” → Descarcă / BO dossier document / eKYC SDK), ⋮ menu items
„Descarcă” (`renderStackMenu` / Cabinet / Ghișeu: `icon: "export"`), icon-only buttons with aria-label
„Descarcă”. Never `icon-download` (plain arrow), `icon-page-download` or `circle-download` on an action;
keep the button's size class and colour (icon = label colour). Import / upload = `icon-upload`
(„Importă din MDocs”, „Descarcă din MDocs” in the template builder = a pull INTO GEAP). Nav icons
(„Dosare spre printare”) are not actions and keep their glyph. Data-driven icons too
(`data/acte-permisive.json` payment `actions.download.icon`).

### US-230 Lista de servicii — Configurări servicii (2026-10-10)

**Azure:** US-230 „Vizualizarea, căutarea, filtrarea și exportul listei de servicii” 95244.

- Columns: **Serviciu** (name over the RSSP code, plain text) · Instituția · **Statut în registru** ·
  **Statut în GEAP** · **Modificat în GEAP** · Versiune · actions (sync, edit). 7 fields. GEAP's state
  sits next to GEAP's last change; the register's state comes first. One meaning per column (Carbon status
  pattern; user decision + persona check 2026-10-10):
  - **Statut în GEAP** = the passport in GEAP (Publicat / Nepublicat / Inactiv); gray line under it only for
    „N modificări nepublicate” (changes logged since the last publication, `servicePendingChanges`).
  - **Statut în registru** (EN „Registry status”; RSSP and eAPL are registers) = what the external register says. Line 1 (`.e-permits-workplace__source-head`):
    tag **Activ** (success) / **Inactiv** (neutral) from RSSP, or **Eșuat** (danger) when the last
    sync attempt failed after the last good one (US-231 AC-20), + the sources („RSSP”, „RSSP +
    eAPL”). Line 2 (`.e-permits-workplace__source`): the last successful sync date
    („ultima reușită …” when Eșuat). Sorts by the sync date. The code cell no longer carries „Sursă:”.
  - **Modificat în GEAP** = last change by a GEAP user (latest non-sync Jurnal event, else the last
    publication). Sync runs — also failed ones („Eroare la sincronizare”) — are never GEAP changes
    (`SERVICE_EVENT_SILENT`). The list opens sorted by it, newest first (AC-09).
- Filters (same names as the headers): Statut în registru · Statut în GEAP · Instituția · Sursă. Search: name, code, institution.
  No match → „Nu au fost găsite servicii.” (AC-13). Demo srv-01 (003000245 = failed automatic sync), srv-02 (a pending change).
- Figma: Servicii › section „Acte permisive Table -> Filter Interaction Logic” (01–03, 04–04f): the
  Sursă externă column (tag + sources / date), Modificat în GEAP, the code cell without „Sursă:”
  (hidden layer of the local „Cell 13”), the filter bars refreshed with the 4 chips.

### US-201 Activare/Dezactivare taxă + US-111 Sincronizare serviciu (2026-10-10)

**Azure:** US-201 „Activare/Dezactivare taxă” 94643 · US-111 „Crearea unui pașaport al serviciului
prin sincronizare din RSSP” 90576.

- **US-201**: ⋮ on a tax row → „Dezactivează” / „Activează”, both confirmed in
  `#service-confirm-modal` (`askConfirm`) with the story's text: deactivate = „„<taxă>” este folosită
  în N dosare. O taxă inactivă nu mai poate fi declanșată în niciun dosar nou. Continuați?”
  (destructive button; the count = AC-13), activate = „Taxa devine din nou disponibilă pentru
  declanșare în dosarele noi. Continuați?” (primary). Counts in Romanian use `roCount` („128 de
  dosare”, „19 dosare”). Jurnal „Activare / Dezactivare taxă”, Modificat de/la updated. Demo
  svc-04v / svc-04v1; Figma Servicii band 06 → 06v / 06v1 (from 06l, modal texts only).
- **US-111**: Configurări servicii › **«Sincronizare serviciu»** (`btn-primary btn-sm`, rotate-arrow,
  central admin only — was „Creează serviciu nou”) → `#service-sync-modal` „Sincronizare serviciu
  din RSSP”: „Cod serviciu RSSP” (required) · „Închide” · „Sincronizează serviciu”. Errors in a
  subtle error message above the field (RSSP indisponibil · cod negăsit · răspuns invalid), the
  empty field under it. Success → „Serviciu creat din RSSP” + summary card (authority tag
  „Creată” brand / „Legată” neutral). Jurnal types follow AC-22: „Sincronizare serviciu finalizată
  cu succes”, „Creare serviciu nou”, „Actualizare serviciu existent”, „Creare autoritate nouă”,
  „Legare cu autoritate existentă”, „Eroare la sincronizare”. Demo srv-01 … srv-01h; Figma page
  Servicii, section „Acte permisive Table -> Filter Interaction Logic”, row 04 – 04f (registry +
  the passport's sync modal, notes, flows).

### Taxe / Tarife stories (2026-10-09/10; US-199, US-202, US-203, US-206, US-207)

**Azure:** US-199 „Lista taxe și tarife” 94641 · US-202 „Tarife globale” 94767 · US-203 „Tarife
specifice serviciului” 94768 · US-206 „Sincronizare tarife din RSSP/eAPL” 94771 · US-207 „Detalii
tarif” 94772 (parents: Feature 93591 Taxe, Feature 94153 Clasificatorul de tarife).

- **Stacked lists, not tables** (user, 2026-10-10): Taxe and Tarife in the passport stay our
  stacked list (`.e-permits-stack`, groups by request type). The 2026-10-09 in-tab tables were
  removed from code and Figma.
- **„Filtrare avansată” on a stacked list** (`SF_LISTS[id] = { facets, rows(service),
  refresh(service) }`, `renderSfToggle(id)`, `renderSfBar(id)` in `[data-sf-bar=id]`, popover
  `openSfPop`; attributes `data-sf-toggle / -facet="id:key" / -commit / -discard / -clear /
  -refresh / -option / -confirm / -reset`): the registry's filter markup
  (`.e-permits-workplace__advanced`, `.e-permits-workplace__filters` + `.e-permits-pay__filters`
  = bordered strip, radius 12, 16 below; facet chips → popover with checkboxes, search when > 7
  values, Confirmă / Șterge; „Aplică filtrele”, „Renunță”, „N rezultate”, „Șterge filtrele”). A
  facet shows when the list has ≥ 2 values. Filters combine with the search (AND). The button
  keeps its focus ring while the bar is open (`aria-expanded`).
- **US-202 Tarife (registry)**: only **global** tariffs (a service's own live in its passport,
  US-203). Columns Denumire (Tip tarif under it) · Sumă și valută · Stare (Publicat green / Schiță) ·
  Activ/Inactiv · Sursă · Nr. versiune · Valabil de la/până la · Modificat · actions (eye = card ·
  „Editează”). Filters Tip tarif · Stare · Activ/Inactiv · Sursă; search name RO/RU/EN + Temei legal +
  code; tabs Toate/Active/Schiță/Inactive stay. A row opens the card. Export = the visible rows in
  the shown order, columns as listed; logged in `servicesStore.auditLog` („Export tarife globale”).
- **US-207 Tariff card** (`openTariffView(id)`, the tariff drawer in read mode): title = name,
  subtitle „Sursă · vN · Modificat …”; tags Tip tarif · Stare · Activ/Inactiv; sections (label/value
  grey card) **Identitate** (RO/RU/EN, Tip, Temei legal, IBAN or „Implicit — contul principal al
  autorității”; for a service tariff also Tip solicitare, Tip persoană, Subdiviziune) · **Sumă** or
  **Formulă** (expression + rotunjire) · **Ciclu de viață** (Stare, Activ/Inactiv, Nr. versiune,
  Valabil, Modificat, Ultima sincronizare for RSSP/eAPL) · **Folosit de** = only the number
  („Folosit în N taxe” / „Acest tarif nu este folosit încă în nicio taxă sau notă de plată.”) ·
  **Istoric versiuni** oldest first, „(curentă)” on the last; one version → „Acest tarif nu are
  versiuni anterioare.” Footer: „← Înapoi la tarife” (closes; the list keeps filters and page) ·
  „Editează” (primary, pen) switches the same drawer to the editor. The editor's „Utilizare și
  istoric” tab shows the same count + history.
- **US-206 Sincronizare tarife**: «Sincronizează» in the service's Tarife toolbar (central admin):
  RSSP for any service, eAPL only when the service has it; toast „N tarife create · M actualizate ·
  K eșuate” (+ „Tarifele noi așteaptă regula…”); a source without an answer → error toast „eAPL nu a
  răspuns. Tarifele din RSSP au fost salvate: …”. Core `syncServiceTariffs` (tested): failed items
  (no name / no amount) counted and skipped, `lastSync` on every touched tariff, an amount change →
  new version with Valabil de la = sync date, nothing removed. The general service sync still
  imports tariffs too (Galina Rosca's answer); the daily automatic run is shown as „automat zilnic”.
- **Figma** (GEAP 2.0 `aHgwVwiNCOSOqbMhMjjUOj`):
  - Componente locale (10566:10080): **„Servicii · Taxe · Listă (US-199)”** set 10751:3355 —
    Conținut = Toate · Filtrare avansată · Filtru Activă · Fără rezultate · După sincronizare ·
    Biocide; **„Servicii · Tarife · Listă (US-203)”** set 10751:4039 — Toate · Filtrare avansată ·
    După sincronizare · Biocide. Built only from `svc/stack-group-header` + `svc/stack-item`
    (new boolean **Show preview** = eye button, off by default), the library search,
    `advanced-filter/button` + `advanced-filter/bar` (bordered, radius 12), numbered-badge Large
    Neutral for the title count, `Stare goală · fără rezultate`; 1024 wide. The 2026-10-09 table
    sets were deleted. **„Tarife · Tabel registru”** (US-202) set 10732:167123 stays (the global
    registry is a table, as all registries).
  - Servicii (442:17492), band 06: every Taxe și tarife screen (06, 06a–06s, 07, 07a) uses both
    lists in the 1024 column (the section heading instance is hidden — the title is in the list's
    first row). Blocks: 06a ⋮ menu (Actualizează lista · Exportă taxele, svc-04a), 06t popover
    Stare (svc-04t), 06t1 Activă applied (04t1), 06t2 search without match (04t2), 06u3 Tarife
    filtrare avansată (04u3), 06u1 ⋮ Sincronizează din RSSP + toast (04u1), 06u2 service tariff
    card (04u2). 06k = ⋮ open on „Taxă anuală” (Focus ring, Activează / Șterge red), 06m / 06n =
    hover on „Editează” / ⋮ of „Taxă de stat”. 06b / 06h* use the Biocide variants.
  - Tarife (9618:13362): registry blocks 01–04 use the registry set; 01c = filter Stare = Schiță
    applied (trf-01c); band **05 Tariff card** = 05 (history + used, trf-05), 05a (formula, not used,
    trf-05a), 05b (draft inactive, trf-05b) — read-only drawer, footer „Înapoi la tarife” · „Editează”.
- **Demo states**: trf-01c (filter Stare = Schiță), trf-05 / 05a / 05b (card: history + used,
  formula, one version not used), trf-03c / 03e and svc-05a now open RSSP tariffs from the service's
  Tarife; svc-04a (Taxe filtrare avansată), 04t (popover Stare), 04t1 (Activă applied), 04t2 (search
  without match), 04u (Tarife table), 04u1 (sync toast), 04u2 (tariff card from the service),
  04u3 (Tarife filtrare avansată).

### Request status tag — a finalized request shows its outcome (outcome-tag-v1, 2026-10-21)
User (EVO Cabinet 1148:47839): „The Finalizat badge doesn't make sense here. Show only the actual status.” A request in
status `finalizat` shows ONE Small tag = its outcome, everywhere its status shows (list row, profile header „Stare”,
„Stadiul solicitării” card, Date generale „Statutul dosarului”): **Aprobat** success · **Aprobat tacit** brand (US-157
„Aprobat Tacit” = the RAP marking label; `result: "aprobat"` + `tacit`) · **Respins** danger · any other `result` in the
data as it is (neutral) · no result → „Finalizat”. Markup = `GEAPTag.html("Aprobat<span class=\"u-visually-hidden\">
(finalizată)</span>", tone, { raw: true })` (screen readers keep the stage; the row's aria-label says it too). The
other statuses keep their own tag; the pending tacit approval (În derulare) keeps its `.sm-tacit` / `cab-mark`.
**Filter „Statut”** lists the labels of the tags (Schiță · Informații suplimentare · Spre achitare · În derulare ·
Aprobat · Aprobat tacit · Respins): a value the user never sees on a tag would filter blind; „Finalizat” is no facet value
(it is a lifecycle group, not something on screen; the old quick-chip group „Finalizate” in the JSON `filters` is unused). Code: `cabinet-evo/solicitari.js` `OUTCOMES` /
`outcomeOf` / `statusLabel` / `statusTag`. Demo sm-01c (Aprobat + Respins), sm-05 / sm-05a / sm-05o, sm-05t / sm-05u
(`?tacit-dosar=d-bistro`). Same idea as the tacit act rule (tacit-tag-v1).
