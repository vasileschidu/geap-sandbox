---
name: components
description: Component library reference — 40 built components mapped to HTML files, CSS class patterns (BEM + utilities), and how to build new ones. Use before writing any HTML markup or creating new components.
---

# Components — Library Reference

> Source: Figma · **Components** file (`doJ7tDY0PlQ0PqMgbpFVIC`)  
> HTML source: `Components/` directory  
> Last updated: 2026-04-29

This file answers **"what classes and markup do I write?"**  
For token values → the `design-system` skill.

---

## Table of Contents

1. [How the class system works](#1-how-the-class-system-works)
2. [Component Inventory](#2-component-inventory)
3. [Component Reference](#3-component-reference)
4. [Utility Classes](#4-utility-classes)
5. [Additional Tokens (Components file)](#5-additional-tokens-components-file)
6. [Building New Components](#6-building-new-components)

---

## 1. How the class system works

The library uses a **Bootstrap-grid base + BEM-style component classes + spacing utilities**.

```
.{component}                        ← base element
.{component}--{modifier}            ← variant / state (BEM modifier)
.{component}__{part}                ← child element (BEM element)
.{component}__{part}--{modifier}    ← child with variant
```

**Utility classes** use short aliases that mirror the design token scale:
- `.p-{n}`, `.py-{n}`, `.px-{n}`, `.mt-{n}`, `.mb-{n}` — spacing (n = 0/2/4/6/8/12/16/20/24/32/40/48/56/64)
- `.gap-{n}` — flex/grid gap (same scale)
- `.d-flex`, `.d-grid`, `.d-block`, `.d-none` — display
- `.text-{style}` — typography
- `.bg-{color}` — background
- `.border-{n}` — border width

**All pages share the same base:**
```html
<link rel="stylesheet" href="css/main.css" />
<script src="js/include-header.js" defer></script>
<script src="js/include-footer.js" defer></script>
```

---

## 2. Component Inventory

| Figma Component | HTML File | Status |
|---|---|---|
| Accordion | `accordion.html` | ✅ built |
| Avatar | `avatar.html` | ✅ built |
| Badge | `badge.html`, `badge-buttons.html` | ✅ built |
| Bottomsheet | `bottom-sheet.html` | ✅ built |
| Breadcrumb | `breadcrumbs.html` | ✅ built |
| Button | `buttons.html` | ✅ built |
| Checkbox | `checkbox.html` | ✅ built |
| Chip | `chip.html` | ✅ built |
| Cookie Banner | `cookie-banner.html` | ✅ built |
| Date Input | `input-date.html` | ✅ built |
| Date Picker | `input-date-picker.html` | ✅ built |
| File Input | `input-file.html` | ✅ built |
| Footer | `footer.html` | ✅ built |
| Header | `header.html`, `header-with-avatar.html` | ✅ built |
| Link | `link.html` | ✅ built |
| Menu | `header.html` (mega-nav) | ✅ built |
| Modal | `modals.html` | ✅ built |
| Notification / Alert | `messages.html`, `message-alerts.html`, `messages-information.html`, `messages-inline.html`, `messaget-toast.html` | ✅ built |
| Numeric Input | `input-preview.html` | ✅ built |
| Pagination | `pagination.html` | ✅ built |
| Phone Input | `input-phone-number.html` | ✅ built |
| Progress Indicator | `progress-tracker.html` | ✅ built |
| Radio Button | `radio-buttons.html` | ✅ built |
| Search | `search-input-preview.html` | ✅ built |
| Segmented Controls | `segmented-controls.html` | ✅ built |
| Select (Dropdown) | `dropdown.html` | ✅ built |
| Sidebar | `sidebar.html` | ✅ built |
| Spinner | `spinner.html` | ✅ built |
| Switch | `switch.html` | ✅ built |
| Table | `table.html` | ✅ built |
| Tabs | `tabs.html` | ✅ built |
| Tag | `tags.html` | ✅ built |
| Text Area | `textarea.html` | ✅ built |
| Text Input | `input-preview.html` | ✅ built |
| Tooltip | `tooltip.html` | ✅ built |
| Typography | `typography.html` | ✅ built |
| Display / Spacing | `displays.html`, `spacings.html` | ✅ built |
| Icons | `icons.html` | ✅ built |

---

## 3. Component Reference

### Button

**Types:**
```html
<button class="btn btn-primary">Filled</button>
<button class="btn btn-secondary">Tonal</button>
<button class="btn btn-outline-primary">Outlined</button>
<button class="btn btn-outline-secondary">Outlined secondary</button>
<button class="btn btn-outline-neutral">Neutral outlined</button>
<button class="btn btn-text-primary">Text only</button>
<button class="btn btn-destructive">Destructive</button>
<button class="btn btn-outline-destructive">Destructive outlined</button>
<button class="btn btn-text-destructive">Destructive text</button>
<button class="btn btn-neutral">Neutral</button>
<button class="btn btn-strict">Strict</button>
```

**Sizes:** `.btn-sm` · `.btn-md` (default) · `.btn-lg`  
**Shapes:** `.btn-rounded` (pill)  
**With icon:** add `.icon-leading` or `.icon-trailing` wrapper inside  
**Loading state:** add `.btn-loading`  
**Icon-only:** `.btn-icon`

---

### Input (Text / Number)

**Base structure:**
```html
<div class="input-group">
  <label class="form-label">Label</label>
  <input type="text" class="input" placeholder="..." />
  <span class="input-message">Helper text</span>
</div>
```

**States:** `.input--success` · `.input--warning` · `.input--destructive`  
**Sizes:** `.input--medium` (default)  
**With icon:** wrap input in `.input-icon`, add SVG with `.icon-leading` / `.icon-trailing`  
**Number input:** `.input-number` with same state modifiers

---

### Select / Dropdown

```html
<div class="input-group">
  <label class="form-label">Label</label>
  <select class="input">
    <option>Option</option>
  </select>
</div>
```

Use `.btn-caret` on a custom trigger for styled dropdowns.

---

### Checkbox

```html
<div class="form-check">
  <input type="checkbox" class="form-check-input" id="cb1" />
  <label class="form-check-label" for="cb1">Label</label>
</div>
```

---

### Radio

```html
<div class="radio-group">
  <div class="radio">
    <input type="radio" class="radio-input" id="r1" name="group" />
    <label class="radio-label" for="r1">
      <span class="radio-custom"></span>
      <span class="radio-texts">
        <span class="radio-label">Label</span>
        <span class="radio-description">Description</span>
      </span>
    </label>
  </div>
</div>
```

**States:** `.radio--error`  
**Sizes:** `.radio--small` · `.radio--medium`

---

### Switch

```html
<label class="switch-wrapper">
  <input type="checkbox" class="switch-input" />
  <span class="switch-track">
    <span class="switch-thumb"></span>
  </span>
  <span class="switch-text">Label</span>
</label>
```

**Sizes:** `.switch--small` · `.switch--medium` · `.switch--large`  
**State:** `.switch--error`

---

### Textarea

```html
<div class="input-group">
  <label class="form-label">Label</label>
  <textarea class="textarea" rows="4"></textarea>
  <span class="input-message">Helper</span>
</div>
```

**States:** `.textarea--success` · `.textarea--warning` · `.textarea--destructive`

---

### Modal

```html
<div class="modal modal--md" id="myModal">
  <div class="modal-overlay"></div>
  <div class="modal-content">
    <div class="modal--header">
      <h2 class="modal--header-title">Title</h2>
      <button class="modal-close btn-icon">×</button>
    </div>
    <div class="modal-text">Content goes here</div>
    <div class="modal--footer modal-buttons">
      <button class="btn btn-secondary">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

**Sizes:** `.modal--sm` · `.modal--md` · `.modal--lg` · `.modal--fullscreen`  
**Animations:** `.modal--fade` · `.modal--slide` · `.modal--zoom`  
**Variants:** `.modal--simple` (no footer) · `.modal--with-image`

---

### Accordion

```html
<div class="accordion">
  <div class="accordion__item">
    <button class="accordion__trigger accordion__header">
      <span class="accordion__heading">Question</span>
      <span class="accordion__icon"></span>
    </button>
    <div class="accordion__panel">
      <div class="accordion__panel-content">Content</div>
    </div>
  </div>
</div>
```

**With supporting text:** add `.accordion__supporting` inside the header  
**With icon:** `.accordion__panel-content--icon` + `.accordion__panel-content--title`

---

### Tabs

```html
<div class="tabs">
  <div class="tab-buttons">
    <button class="tab-button active">Tab 1</button>
    <button class="tab-button">Tab 2</button>
  </div>
  <div class="tab-panels">
    <div class="tab-panel active">Content 1</div>
    <div class="tab-panel">Content 2</div>
  </div>
</div>
```

**Size:** `.tabs--sm`

---

### Badge

```html
<span class="badge badge--solid-neutral badge--md">Label</span>
```

**Styles:** `--solid-neutral` · `--solid-light` · `--solid-dark` · `--solid-accent` · `--solid-notification` · `--outlined-neutral` · `--info`  
**Sizes:** `--xs` · `--sm` · `--md` · `--lg`

---

### Tag

```html
<div class="tag-group">
  <span class="tag-item">Tag text</span>
</div>
```

---

### Chip

```html
<div class="chip-group">
  <div class="chip">
    <span class="chip__label">Chip</span>
    <button class="chip__close">×</button>
  </div>
</div>
```

**With icon:** `.chip__icon` · **With avatar:** `.chip__avatar` · **With badge:** `.chip__badge`

---

### Avatar

```html
<div class="avatar avatar--md avatar--image">
  <img src="..." alt="Name" />
</div>
```

**Types:** `--image` · `--initials` · `--icon`  
**Sizes:** `--xs` · `--sm` · `--md` · `--lg` · `--xl`  
**With badge:** `--dot` (status dot) · `--numbered`  
**Stack:** wrap in `.avatar-stack`

---

### Pagination

```html
<nav class="pagination">
  <a class="pagination__link pagination__link--disabled">←</a>
  <a class="pagination__link">1</a>
  <a class="pagination__link pagination__link--active">2</a>
  <a class="pagination__link">3</a>
  <a class="pagination__link">→</a>
</nav>
```

**Compact:** `.pagination--compact`

---

### Table

```html
<div class="table-responsive">
  <table class="table table--default">
    <thead class="table__head table--desktop">
      <tr>
        <th class="table__head-cell">Header</th>
      </tr>
    </thead>
    <tbody>
      <tr class="table__row">
        <td class="table__body-cell">Cell</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Styles:** `--default` · `--subtle` · `--strong` · `--white`  
**Responsive:** pair `--desktop` with `--mobile` (two separate thead/tbody)  
**With sort:** `.table__head-cell--sortable` + `.table__sort-button` + `.table__sort-icon`  
**Trailing icon column:** `--trailing-icon`

---

### Progress Tracker

```html
<div class="progress-tracker">
  <div class="progress-step progress-step--completed">
    <div class="progress-step__circle"></div>
    <div class="progress-step__label">Step 1</div>
  </div>
  <div class="progress-step progress-step--current">...</div>
  <div class="progress-step progress-step--incomplete">...</div>
  <div class="progress-step progress-step--blocked">...</div>
</div>
```

**Orientation:** `.progress-tracker--vertical`

---

### Sidebar

```html
<nav class="sidebar">
  <div class="sidebar__nav">
    <ul class="sidebar__list">
      <li class="sidebar__item">
        <a class="sidebar__link sidebar__link--active" href="#">
          <span class="sidebar__icon"></span>
          <span class="sidebar__label">Item</span>
        </a>
      </li>
      <li class="sidebar__item sidebar__item--has-children">
        <button class="sidebar__link sidebar__link--toggle">
          <span class="sidebar__label">Parent</span>
          <span class="sidebar__chevron"></span>
        </button>
        <ul class="sidebar__submenu">...</ul>
      </li>
    </ul>
  </div>
</nav>
```

**Edge variant:** `.sidebar--edge` (icon-only collapsed)

---

### Spinner

```html
<div class="spinner spinner--medium spinner--brand"></div>
```

**Sizes:** `--extra-small` · `--small` · `--medium` · `--large`  
**Colors:** `--brand` · `--dark` · `--light` · `--light-on-color`

---

### Breadcrumb

```html
<nav class="breadcrumbs">
  <ol class="breadcrumbs__list">
    <li class="breadcrumbs__item">
      <a class="breadcrumbs__link" href="#">Home</a>
    </li>
    <li class="breadcrumbs__item breadcrumbs__current">Current</li>
  </ol>
</nav>
```

**With icon:** `.breadcrumbs--with-icon`  
**Mobile back link:** `.breadcrumbs--mobile` + `.breadcrumbs__item--back`

---

### Tooltip

Add `data-tooltip` attribute or wrap with `.tooltip` container. See `tooltip.html`.

---

### Header

Injected via `js/include-header.js`. Structure:
```html
<header class="header">
  <div class="header__wrapper">
    <div class="header__brand">
      <div class="header__brand--logo"></div>
      <div class="header__brand--details"></div>
    </div>
    <nav class="header__toggle"></nav>   <!-- mobile -->
    <div class="header__actions">
      <div class="header__search"></div>
      <div class="header__profile"></div>
    </div>
  </div>
</header>
```

**With avatar:** see `header-with-avatar.html`

---

### Footer

Injected via `js/include-footer.js`. Key parts:
```
.footer__top / .footer__middle / .footer__bottom
.footer__brand / .footer__nav / .footer__social / .footer__legal
```

---

## 4. Utility Classes

### Typography

| Class | Style |
|---|---|
| `.text-display-lg` | Display/Large — 56px SemiBold |
| `.text-display-md` | Display/Medium |
| `.text-heading-h1-lg` | H1 large |
| `.text-heading-h2-md` | H2 medium |
| `.text-heading-h3` | H3 — 24px SemiBold |
| `.text-heading-h3-sm` | H3 small |
| `.text-heading-h4` | H4 |
| `.text-heading-h4-xs` | H4 extra small |
| `.text-heading-h5-2xs` | H5 — 18px SemiBold |
| `.text-body-lg` | Body/Large — 18px Regular |
| `.text-body-lg-500` | Body/Large — 18px Medium |
| `.text-body-md` | Body/Default — 16px Regular |
| `.text-body-md-500` | Body/Default — 16px Medium |
| `.text-body-sm` | Body/Small — 14px Regular |
| `.text-body-sm-500` | Body/Small — 14px Medium |
| `.text-caption-md` | Caption — 12px Regular |
| `.text-caption-md-500` | Caption — 12px Medium |
| `.text-caption-sm` | Caption small |

### Text Colors

| Class | Value |
|---|---|
| `.text-black` | `#121212` |
| `.text-gray-400` | tertiary text |
| `.text-gray-500` | secondary |
| `.text-gray-600` | |
| `.text-gray-700` | `#383838` |
| `.text-blue-sky-500` | `#3379db` |
| `.text-blue-sky-600` | `#0058d2` |
| `.text-blue-sky-900` | `#00295a` |
| `.text-link` | brand link style |

### Spacing Utilities

Scale: `0 · 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 56 · 64`

```
.p-{n}     all padding
.py-{n}    vertical padding
.px-{n}    horizontal padding
.pt-{n}    top padding
.pb-{n}    bottom padding
.mt-{n}    margin top
.mb-{n}    margin bottom
.gap-{n}   flex/grid gap
```

### Layout

```
.d-flex / .d-grid / .d-block / .d-inline-flex / .d-none
.d-sm-flex / .d-md-flex / .d-lg-flex
.align-items-center / .align-items-start / .align-items-end
.justify-content-between / .justify-content-center / .justify-content-end
.flex-column / .flex-wrap
.container / .row / .col-{n} / .col-sm-{n} / .col-md-{n} / .col-lg-{n}
```

### Border

```
.border-{n}         border-width: n (1/2/3/4/8)
.border-bottom-{n}  bottom only
.border-bottom-solid
.border-0           remove border
.border-blue-sky-600
.border-blue-sky-400
```

---

## 5. Additional Tokens (Components file)

These tokens appear in the Components file but are not in `DESIGN_SYSTEM.md`. Use them with the same `var()` pattern.

```css
/* Icon */
--color-icon-base-default: #121212;
--color-icon-base-inverse-default: #ffffff;
--color-icon-base-inverse-on-color: #ffffff;
--color-icon-brand-default: #0058d2;

/* Border */
--color-border-brand-default: #0058d2;

/* Background */
--color-background-transparent-brand: rgba(126, 55, 249, 0.2);  /* subtle brand tint */

/* Primitive — extended blue-sky scale */
/* blue-sky/150: #d6e5f8 */
/* blue-sky/300: #99bced */
/* blue-sky/500: #3379db */
/* gray/700:     #383838 */

/* Typography — additional */
/* Desktop/Caption/Medium 500: Onest Medium 12px / 16px / ls 0 */
/* font-size/fs-10: 10px */
/* line-height/lh-12: 12px */
```

---

## 6. Building New Components

When creating a component that doesn't exist yet, follow this checklist:

### Structure rules
1. **Base class** = component name in lowercase: `.my-component`
2. **Modifiers** = double-dash BEM: `.my-component--variant`
3. **Children** = double-underscore BEM: `.my-component__part`
4. **Never hardcode token values** — always use `var(--color-...)`, `var(--spacing-...)`, etc.
5. **Use utility classes** for spacing rather than custom CSS where possible

### Variant checklist
Every interactive component should handle:
- `default` — resting state
- `hover` — `:hover` pseudo-class
- `active` / `pressed` — `:active`
- `focus` / `focus-visible` — keyboard accessibility
- `disabled` — `[disabled]` or `.disabled`
- `error` / `destructive` — validation state
- `success` — where applicable

### New component template
```html
<!-- my-component.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="css/main.css" />
  <script src="js/include-header.js" defer></script>
  <script src="js/include-footer.js" defer></script>
</head>
<body>
  <div id="site-header"></div>
  <div class="container py-56">
    <!-- component markup here -->
  </div>
  <div id="site-footer"></div>
</body>
</html>
```

### Extending an existing component
1. Read the existing HTML file first — understand all variants already built
2. Add new modifier class (don't modify existing classes)
3. Mirror the naming pattern exactly
4. Test all existing variants still work

### Icon usage
- Size 16: `16/{name}` — inline/small UI
- Size 20: `20/{name}` — standard UI
- Size 24: `24/{name}` — prominent/standalone
- Reference `icons.html` for the full icon catalogue
