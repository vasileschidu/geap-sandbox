---
name: design-system
description: Foundations design system reference — token values for typography, colors, spacing, border radius, shadows. Use when writing any CSS or deciding what values to apply. Source of truth for all design tokens extracted from the Foundations Figma file.
---

# Foundations — Design System Reference

> Source: Figma · **Foundations** file (`wkHMxgDWxZKaXQ7zNxhSxN`)  
> Extracted from node `1080:862` · Last updated 2026-04-29

---

## Design Approach

This file defines **constraints** (tokens, values, rules). The companion `frontend-design` skill defines **creative philosophy** (how to think, what makes something memorable).

Use both together:

| Skill (`frontend-design`) | Design System (`DESIGN_SYSTEM.md`) |
|---|---|
| Commit to a bold aesthetic direction | Execute it using these exact tokens |
| Make typography feel intentional | Use `Onest` — push weight, size, letter-spacing to their extremes |
| Use dominant color with sharp accents | `--color-background-brand-default` (`#0058d2`) is the dominant; build tension against `--color-background-base-default` (`#ffffff`) |
| Generous negative space OR controlled density | Pull from the spacing scale — don't invent values |
| Memorable motion and micro-interactions | Layer on top of correct token-based structure |
| Avoid generic AI aesthetics | These tokens already differentiate — apply them with intention |

**Rule:** Creative freedom lives in layout, motion, composition, and hierarchy. Token values are non-negotiable.

---

## Table of Contents

1. [Typography](#1-typography)
2. [Color System](#2-color-system)
3. [Spacing](#3-spacing)
4. [Border Radius](#4-border-radius)
5. [Border Width](#5-border-width)
6. [Elevation & Shadows](#6-elevation--shadows)
7. [Iconography](#7-iconography)
8. [Token Naming Convention](#8-token-naming-convention)
9. [CSS Custom Properties Reference](#9-css-custom-properties-reference)

---

## 1. Typography

### Font Families

| Role | Family | Usage |
|---|---|---|
| Primary | `Onest` | All UI text |
| Documentation / Code | `JetBrains Mono` | Code snippets, dev documentation labels |

---

### Text Styles

All styles are defined as `Desktop/{Category}/{Variant}`.

#### Display

| Token | Family | Weight | Size | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `Desktop/Display/Large` | Onest | SemiBold (600) | 56px | 64px | −2px |

#### Headings

| Token | Family | Weight | Size | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `Desktop/Heading/H3` | Onest | SemiBold (600) | 24px | 32px | −1px |
| `Desktop/Heading/H5` | Onest | SemiBold (600) | 18px | 26px | −1px |

> Headings use negative letter-spacing to tighten large type. All heading variants share SemiBold weight.

#### Body

| Token | Family | Weight | Size | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `Desktop/Body/Large` | Onest | Regular (400) | 18px | 28px | 0 |
| `Desktop/Body/Default` | Onest | Regular (400) | 16px | 24px | 0 |
| `Desktop/Body/Default 500` | Onest | Medium (500) | 16px | 24px | 0 |
| `Desktop/Body/Small` | Onest | Regular (400) | 14px | 20px | 0 |
| `Desktop/Body/Small 500` | Onest | Medium (500) | 14px | 20px | 0 |

#### Caption

| Token | Family | Weight | Size | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `Desktop/Caption/Medium` | Onest | Regular (400) | 12px | 16px | 0 |

#### Documentation (internal / dev use)

| Token | Family | Weight | Size | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `Documentation/Small` | JetBrains Mono | Medium (500) | 14px | 20px | −1px |
| `Documentation/Medium` | JetBrains Mono | Medium (500) | 16px | 24px | −1px |

---

### Font Scale Primitives

| Variable | Value |
|---|---|
| `font-size/fs-12` | 12px |
| `font-size/fs-14` | 14px |
| `font-size/fs-16` | 16px |
| `font-size/fs-18` | 18px |
| `font-size/fs-24` | 24px |
| `font-size/fs-56` | 56px |

| Variable | Value |
|---|---|
| `font-weight/fw-regular` | 400 |
| `font-weight/fw-medium` | 500 |
| `font-weight/fw-semibold` | 600 |

| Variable | Value |
|---|---|
| `line-height/lh-16` | 16px |
| `line-height/lh-20` | 20px |
| `line-height/lh-24` | 24px |
| `line-height/lh-26` | 26px |
| `line-height/lh-28` | 28px |
| `line-height/lh-32` | 32px |
| `line-height/lh-64` | 64px |

---

## 2. Color System

The color system has two layers: **Primitive** (raw values) and **Semantic** (role-based aliases mapped to primitives).

### Primitive Colors

These are the raw palette values. Never apply them directly to UI — always use a semantic token.

#### Neutral

| Token | Hex | Swatch |
|---|---|---|
| `black/1000` | `#121212` | ██ Near-black |
| `gray/900` | `#1e1e1e` | ██ Dark gray |
| `gray/250` | `#d9d9d9` | ░░ Light gray |
| `gray/100` | `#f5f5f5` | ░░ Off-white |
| `white/1000` | `#ffffff` | □□ White |

#### Brand — Blue Sky

| Token | Hex | Notes |
|---|---|---|
| `blue-sky/100` | (light tint) | Lightest |
| `blue-sky/200` | `#ccdef6` | Very light |
| `blue-sky/300` | (medium-light) | |
| `blue-sky/400` | `#669be4` | Mid-tone |
| `blue-sky/600` | `#0058d2` | **Primary brand** |
| `blue-sky/700` | `#0046a8` | Hover state |
| `blue-sky/800` | `#00357e` | Active/pressed |
| `blue-sky/900` | `#00295a` | Darkest brand |

---

### Semantic Colors

Semantic tokens express intent, not raw values. Always use these in code.

#### Text

| CSS Custom Property | Value | Usage |
|---|---|---|
| `--color-text-base-default` | `#121212` | Primary body text |
| `--color-text-base-secondary` | `#383838` | Secondary / supporting text |
| `--color-text-base-tertiary` | `#757575` | Disabled, placeholder, hint text |
| `--color-text-brand-default` | `#0058d2` | Links, brand text |

#### Background

| CSS Custom Property | Value | Usage |
|---|---|---|
| `--color-background-base-default` | `#ffffff` | Page / canvas background |
| `--color-background-base-secondary` | `#f5f5f5` | Subtle section background |
| `--color-background-base-tertiary` | `#f1f1f1` | Deepest neutral background |
| `--color-background-base-tertiary-active` | `#b2b2b2` | Active state on tertiary bg |
| `--color-background-base-inverse-default` | `#ffffff` | Inverse surface (on dark) |
| `--color-background-base-inverse-on-color` | `#ffffff` | Text/icon on colored surface |
| `--color-background-brand-default` | `#0058d2` | Primary CTA background |
| `--color-background-brand-default-hover` | `#0046a8` | Primary CTA hover |
| `--color-background-brand-default-active` | `#00357e` | Primary CTA active/pressed |
| `--color-background-brand-secondary` | `#e8f0fb` | Soft brand tint (info surfaces) |
| `--color-background-brand-secondary-hover` | `#ccdef6` | Soft brand hover |
| `--color-background-brand-secondary-active` | `#99bced` | Soft brand active |
| `--color-background-brand-tertiary` | `#00295a` | Darkest brand surface |
| `--color-background-danger-default` | `#d92d20` | Error / destructive actions |

#### Border

| CSS Custom Property | Value | Usage |
|---|---|---|
| `--color-border-base-default` | `#d9d9d9` | Default input/card borders |
| `--color-border-base-secondary` | `#b2b2b2` | Stronger border (hover, emphasis) |
| `--color-border-base-tertiary` | `#444444` | Highest contrast border |

#### Icon

| CSS Custom Property | Value | Usage |
|---|---|---|
| `--color-icon-brand-on-secondary` | `#0058d2` | Brand icon on light/secondary surface |
| `--color-icon-warning-default` | `#dc6803` | Warning icon |

---

## 3. Spacing

A linear scale based on a 4px base unit. Use `--spacing-{n}` custom properties in code.

| Token | Value | CSS Variable |
|---|---|---|
| `--spacing-0` | 0px | `--spacing-0` |
| `--spacing-2` | 2px | `--spacing-2` |
| `--spacing-4` | 4px | `--spacing-4` |
| `--spacing-6` | 6px | `--spacing-6` |
| `--spacing-8` | 8px | `--spacing-8` |
| `--spacing-12` | 12px | `--spacing-12` |
| `--spacing-16` | 16px | `--spacing-16` |
| `--spacing-20` | 20px | `--spacing-20` |
| `--spacing-24` | 24px | `--spacing-24` |
| `--spacing-32` | 32px | `--spacing-32` |
| `--spacing-48` | 48px | `--spacing-48` |
| `--spacing-64` | 64px | `--spacing-64` |

> Use 4, 8, 16, 24, 32 as the most common steps. Skip steps 2 and 6 unless in dense/compact contexts.

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--border-radius-4` | 4px | Small elements (tags, badges) |
| `--border-radius-6` | 6px | Inputs, small cards |
| `--border-radius-8` | 8px | Default cards, buttons |
| `--border-radius-12` | 12px | Large cards, modals |
| `--border-radius-16` | 16px | Panels, drawers |
| `--border-radius-full` | 999px | Pills, avatars, circular buttons |

---

## 5. Border Width

| Token | Value | Usage |
|---|---|---|
| `--border-width-1` | 1px | Default borders |
| `--border-width-1.5` | 1.5px | Focus rings, emphasis borders |
| `--border-width-2` | 2px | Strong borders, selected states |
| `--border-width-3` | 3px | Maximum emphasis |

---

## 6. Elevation & Shadows

Four levels of depth, each adding a second/third layer for realism.

| Level | CSS Box-Shadow | Usage |
|---|---|---|
| **100** — Subtle | `0 1px 3px rgba(0,0,0,.16), 0 0 0.5px rgba(0,0,0,.30)` | Tooltips, dropdowns |
| **200** — Light | `0 1px 3px rgba(0,0,0,.08), 0 3px 8px rgba(0,0,0,.08), 0 0 0.5px rgba(0,0,0,.18)` | Cards, popovers |
| **300** — Medium | `0 1px 3px rgba(0,0,0,.08), 0 5px 12px rgba(0,0,0,.08), 0 0 0.5px rgba(0,0,0,.15)` | Modals, sheets |
| **400** — Strong | `0 2px 8px rgba(0,0,0,.08), 0 10px 24px rgba(0,0,0,.08), 0 0 0 0.5px rgba(0,0,0,.12)` | Floating panels |

> Use the lowest elevation level that creates sufficient visual separation. Avoid stacking elevated elements.

---

## 7. Iconography

### System

- **Grid size:** 24×24px
- **Naming convention:** `{size}/{name}-{style}`
  - Style variants: `filled`, `outlined`
  - Example: `24/id-card-filled`, `24/wallet-filled`, `24/receipt-check-filled`
- Icons are provided as components in the Figma library; use the component name as the icon identifier

### Cursors

| Name | Usage |
|---|---|
| `cursor-system-arrow` | Default pointer |
| `cursor-system-not-allowed` | Disabled / blocked action |
| `cursor-system-add` | Additive action (e.g. drag to add) |
| `cursor-system-busy-but-clickable` | Loading but interactive |

---

## 8. Token Naming Convention

Tokens follow a strict hierarchy: `--{type}-{category}-{role}-{state}`

```
--color-background-brand-default-hover
  │      │           │     │       └── state:    default / hover / active
  │      │           │     └────────── role:     default / secondary / tertiary / on-color
  │      │           └──────────────── category: base / brand / danger / warning / success
  │      └──────────────────────────── type:     background / text / border / icon
  └─────────────────────────────────── namespace: color / spacing / border-radius / border-width
```

### Hierarchy levels

```
Primitive  →  "blue-sky/600": #0058d2
    ↓
Semantic   →  "--color-background-brand-default": blue-sky/600
    ↓
Component  →  Button.primary.bg = var(--color-background-brand-default)
```

Always reference semantic tokens in component code. Never hardcode hex values or reference primitives directly.

---

## 9. CSS Custom Properties Reference

Paste this block into your project's root stylesheet to wire up all design tokens.

```css
:root {
  /* ─── Typography ─────────────────────────────────── */
  --font-family-primary: 'Onest', sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;

  --fs-12: 12px;
  --fs-14: 14px;
  --fs-16: 16px;
  --fs-18: 18px;
  --fs-24: 24px;
  --fs-56: 56px;

  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;

  --lh-16: 16px;
  --lh-20: 20px;
  --lh-24: 24px;
  --lh-26: 26px;
  --lh-28: 28px;
  --lh-32: 32px;
  --lh-64: 64px;

  /* ─── Spacing ─────────────────────────────────────── */
  --spacing-0: 0px;
  --spacing-2: 2px;
  --spacing-4: 4px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-48: 48px;
  --spacing-64: 64px;

  /* ─── Border Radius ───────────────────────────────── */
  --border-radius-4: 4px;
  --border-radius-6: 6px;
  --border-radius-8: 8px;
  --border-radius-12: 12px;
  --border-radius-16: 16px;
  --border-radius-full: 999px;

  /* ─── Border Width ────────────────────────────────── */
  --border-width-1: 1px;
  --border-width-1-5: 1.5px;
  --border-width-2: 2px;
  --border-width-3: 3px;

  /* ─── Elevation ───────────────────────────────────── */
  --shadow-100:
    0 1px 3px rgba(0, 0, 0, 0.16),
    0 0 0.5px rgba(0, 0, 0, 0.30);
  --shadow-200:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 3px 8px rgba(0, 0, 0, 0.08),
    0 0 0.5px rgba(0, 0, 0, 0.18);
  --shadow-300:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 5px 12px rgba(0, 0, 0, 0.08),
    0 0 0.5px rgba(0, 0, 0, 0.15);
  --shadow-400:
    0 2px 8px rgba(0, 0, 0, 0.08),
    0 10px 24px rgba(0, 0, 0, 0.08),
    0 0 0 0.5px rgba(0, 0, 0, 0.12);

  /* ─── Text — Semantic ─────────────────────────────── */
  --color-text-base-default: #121212;
  --color-text-base-secondary: #383838;
  --color-text-base-tertiary: #757575;
  --color-text-brand-default: #0058d2;

  /* ─── Background — Semantic ───────────────────────── */
  --color-background-base-default: #ffffff;
  --color-background-base-secondary: #f5f5f5;
  --color-background-base-tertiary: #f1f1f1;
  --color-background-base-tertiary-active: #b2b2b2;
  --color-background-base-inverse-default: #ffffff;
  --color-background-base-inverse-on-color: #ffffff;
  --color-background-brand-default: #0058d2;
  --color-background-brand-default-hover: #0046a8;
  --color-background-brand-default-active: #00357e;
  --color-background-brand-secondary: #e8f0fb;
  --color-background-brand-secondary-hover: #ccdef6;
  --color-background-brand-secondary-active: #99bced;
  --color-background-brand-tertiary: #00295a;
  --color-background-danger-default: #d92d20;

  /* ─── Border — Semantic ───────────────────────────── */
  --color-border-base-default: #d9d9d9;
  --color-border-base-secondary: #b2b2b2;
  --color-border-base-tertiary: #444444;

  /* ─── Icon — Semantic ─────────────────────────────── */
  --color-icon-brand-on-secondary: #0058d2;
  --color-icon-warning-default: #dc6803;
}
```

---

## Quick Reference — Component Patterns

### Button — Primary
```css
background: var(--color-background-brand-default);    /* #0058d2 */
color: var(--color-background-base-inverse-on-color); /* #ffffff */
border-radius: var(--border-radius-8);
font: var(--fw-medium) var(--fs-16)/var(--lh-24) var(--font-family-primary);

&:hover  { background: var(--color-background-brand-default-hover);  }
&:active { background: var(--color-background-brand-default-active); }
```

### Button — Secondary
```css
background: var(--color-background-brand-secondary);  /* #e8f0fb */
color: var(--color-text-brand-default);               /* #0058d2 */
border-radius: var(--border-radius-8);

&:hover  { background: var(--color-background-brand-secondary-hover);  }
&:active { background: var(--color-background-brand-secondary-active); }
```

### Card
```css
background: var(--color-background-base-default);
border: var(--border-width-1) solid var(--color-border-base-default);
border-radius: var(--border-radius-12);
box-shadow: var(--shadow-200);
padding: var(--spacing-24);
```

### Input
```css
border: var(--border-width-1) solid var(--color-border-base-default);
border-radius: var(--border-radius-8);
padding: var(--spacing-8) var(--spacing-12);
font: var(--fw-regular) var(--fs-16)/var(--lh-24) var(--font-family-primary);
color: var(--color-text-base-default);
background: var(--color-background-base-default);

&:focus {
  border-color: var(--color-background-brand-default);
  border-width: var(--border-width-1-5);
  outline: none;
}
```

### Body text hierarchy
```css
/* Primary */   color: var(--color-text-base-default);    /* #121212 */
/* Secondary */ color: var(--color-text-base-secondary);  /* #383838 */
/* Tertiary */  color: var(--color-text-base-tertiary);   /* #757575 — disabled, hints */
/* Brand link */color: var(--color-text-brand-default);   /* #0058d2 */
```
