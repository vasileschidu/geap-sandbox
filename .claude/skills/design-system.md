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
| `Desktop/Display/Large` | Onest | SemiBold (600) | 56px | 64px | −2 % (−1.12px) |
| `Desktop/Display/Medium` | Onest | SemiBold (600) | 48px | 56px | −2 % (−0.96px) |

#### Headings

| Token | Family | Weight | Size | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `Desktop/Heading/H1` | Onest | SemiBold (600) | 40px | 48px | −2 % (−0.8px) |
| `Desktop/Heading/H2` | Onest | SemiBold (600) | 32px | 40px | −2 % (−0.64px) |
| `Desktop/Heading/H3` | Onest | SemiBold (600) | 24px | 32px | −1 % (−0.24px) |
| `Desktop/Heading/H4` | Onest | SemiBold (600) | 20px | 28px | −1 % (−0.2px) |
| `Desktop/Heading/H5` | Onest | SemiBold (600) | 18px | 26px | −1 % (−0.18px) |

> Headings use negative letter-spacing to tighten large type (Figma stores it as a percentage of the size).
> All heading variants share SemiBold weight. Values read from the Foundations styles on 2026-10-22 (the earlier
> „−2px / −1px” were the percentages misread as px).

#### Mobile alternatives (type-mobile-v1, 2026-10-22)

Every Foundations style has a `Mobile/…` twin. They are **separate styles over the same primitive variables**
(no variable mode). Only Display and Heading differ; `Mobile/Body/*` and `Mobile/Caption/*` = the Desktop values.
Phones (≤760) use the Mobile style of a heading — code: `css/type-mobile.css` (loaded right after main.css +
token-fix.css on every page).

| Desktop style | Desktop | Mobile style | Mobile | Fixed tokens | Responsive token (Desktop > 760 · Mobile ≤ 760) |
|---|---|---|---|---|---|
| Display/Large | 56/64 · −2 % | Mobile/Display/Large | 48/56 · −2 % (−0.96px) | `--text-{desktop,mobile}-display-large-*` | `--type-display-large-*` |
| Display/Medium | 48/56 · −2 % | Mobile/Display/Medium | 40/48 · −2 % (−0.8px) | `--text-{desktop,mobile}-display-medium-*` | `--type-display-medium-*` |
| Heading/H1 | 40/48 · −2 % | Mobile/Heading/H1 | 32/40 · −2 % (−0.64px) | `--text-{desktop,mobile}-heading-h1-*` | `--type-heading-h1-*` |
| Heading/H2 | 32/40 · −2 % | Mobile/Heading/H2 | 28/36 · −2 % (−0.56px) | `--text-{desktop,mobile}-heading-h2-*` | `--type-heading-h2-*` |
| Heading/H3 | 24/32 · −1 % | Mobile/Heading/H3 | 22/30 · −1 % (−0.22px) | `--text-{desktop,mobile}-heading-h3-*` | `--type-heading-h3-*` |
| Heading/H4 | 20/28 · −1 % | Mobile/Heading/H4 | 18/26 · −1 % (−0.18px) | `--text-{desktop,mobile}-heading-h4-*` | `--type-heading-h4-*` |
| Heading/H5 | 18/26 · −1 % | Mobile/Heading/H5 | 16/24 · −1 % (−0.16px) | `--text-{desktop,mobile}-heading-h5-*` | `--type-heading-h5-*` |
| Body / Caption (all) | — | Mobile/Body/*, Mobile/Caption/* | same as Desktop | — | — |

`*` = `font-size` · `line-height` · `letter-spacing` (em: −0.01em / −0.02em = the Figma percentage). All 600.

Rules:
- A heading rule reads the **responsive** token with the desktop value as fallback:
  `font-size: var(--type-heading-h5-font-size, 18px); line-height: var(--type-heading-h5-line-height, 26px);
  letter-spacing: var(--type-heading-h5-letter-spacing, -0.18px)` — desktop stays identical, phones get Mobile H5.
  Never hand-set a phone font-size for a heading again.
- A phone rule that deliberately picks ANOTHER Mobile style uses the fixed token (`--text-mobile-heading-h2-*`).
- Kept user decisions (not the Mobile alternative): profile title `--compact` 20/28 + 4-line clamp on phones (Desktop
  H3 → Mobile H3 would be 22/30); phone dialog / sheet / drawer titles 20/32 (modal-phone.css § 9); sheet / menu titles 16.
- The library h1–h5 / `.text-heading-*` tokens are NOT remapped (main.css already gives them the Mobile sizes on ≤768,
  with 150 % line height): remapping their line height / tracking leaked onto product titles that only set their size.
- Open: main.css drops the library Body / Caption tokens on ≤768 (16→14, 14→12, 12→10) — the Foundations Mobile
  Body / Caption styles do NOT shrink. Product text uses `--font-size-fs-*` and is unaffected; library components that
  read `--text-body-*` / `--text-caption-*` shrink on phones (pinned case by case so far).

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
| `Documentation/Extra Large` | JetBrains Mono | Medium (500) | 20px | 28px | −1px ᶠ |

---

### Font tokens in CSS — the only allowed form (rule, 2026-10-02)

Never write a raw font value. Always the token with its value as fallback:

```css
font-size: var(--font-size-fs-14, 14px);
line-height: var(--line-height-lh-20, 20px);
font-weight: var(--font-weight-fw-medium, 500);   /* fw-regular 400 · fw-medium 500 · fw-semibold 600 */
```
Only values on the scale below. Off-scale (13, 22, 28, 36, 40, weight 700…) = ask before
using. `font-family` comes from the base; never monospace.
**Exception:** `@font-face { font-weight: 400; }` stays a literal — `var()` is invalid in
`@font-face` descriptors and silently breaks every weight.

### Font Scale Primitives

| Variable | Value |
|---|---|
| `font-size/fs-12` | 12px |
| `font-size/fs-14` | 14px |
| `font-size/fs-16` | 16px |
| `font-size/fs-18` | 18px |
| `font-size/fs-20` | 20px ᶠ |
| `font-size/fs-24` | 24px |
| `font-size/fs-32` | 32px ᶠ |
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
| `line-height/lh-40` | 40px ᶠ |
| `line-height/lh-64` | 64px |

---

## 2. Color System

The color system has two layers: **Primitive** (raw values) and **Semantic** (role-based aliases mapped to primitives).

### Primitive Colors

These are the raw palette values. Never apply them directly to UI — always use a semantic token.

> Complete scales below confirmed from Figma variables 2026-08-17
> (Foundations `73:901`). No value conflicted with what was previously documented —
> the earlier tables were correct, just incomplete.

#### Neutral

| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `black/1000` | `#121212` | | `gray/400` | `#757575` |
| `gray/900` | `#1e1e1e` | | `gray/300` | `#b2b2b2` |
| `gray/800` | `#2c2c2c` | | `gray/250` | `#d9d9d9` |
| `gray/700` | `#383838` | | `gray/200` | `#f1f1f1` |
| `gray/600` | `#444444` | | `gray/100` | `#f5f5f5` |
| `gray/500` | `#616161` | | `white/1000` | `#ffffff` |

> **`black/1000` = `#121212` and `white/1000` = `#ffffff`.** These are the two
> primitives `main.css` references but never defines, breaking 12 semantic tokens.
> These are the values to define. See the `components` skill §8.

#### Brand — Blue Sky

| Token | Hex | Notes |
|---|---|---|
| `blue-sky/900` | `#00295a` | Darkest brand |
| `blue-sky/800` | `#00357e` | Active / pressed |
| `blue-sky/700` | `#0046a8` | Hover |
| `blue-sky/600` | `#0058d2` | **Primary brand** |
| `blue-sky/500` | `#3379db` | Focus rings |
| `blue-sky/400` | `#669be4` | Mid-tone |
| `blue-sky/300` | `#99bced` | |
| `blue-sky/200` | `#ccdef6` | |
| `blue-sky/150` | `#d6e5f8` | |
| `blue-sky/100` | `#e8f0fb` | Lightest tint |

#### Status palettes

| Step | `green` | `apricot` | `red` |
|---|---|---|---|
| 900 | `#054f31` | `#792e0d` | `#7a271a` |
| 800 | `#05603a` | `#93370d` | `#912018` |
| 700 | `#027948` | `#b54708` | `#b32318` |
| 600 | `#039855` | `#dc6803` | `#d92d20` |
| 500 | `#35ad77` | `#f79009` | `#f04438` |
| 400 | `#68c199` | `#fdb022` | `#f97066` |
| 300 | `#9ad6bb` | `#fec84b` | `#fda19b` |
| 200 | `#cdeadd` | `#fedf89` | `#fecdc9` |
| 100 | `#e6f5ee` | `#feefc6` | `#fee4e2` |
| 50 | `#ebf7f1` | `#fef5dd` | `#feefee` |

`apricot` is the warning ramp — there is no palette named "warning".

#### Extended palettes

| Step | `lavender` | `purple` | `magenta` | `forest-green` |
|---|---|---|---|---|
| 900 | `#240c66` | `#36166a` | `#4a095a` | `#00292c` |
| 800 | `#341389` | `#4c2195` | `#660e7c` | `#003b3f` |
| 700 | `#4519b7` | `#652cc7` | `#8813a5` | `#004f54` |
| 600 | `#561fe5` | `#7e37f9` | `#aa18ce` | `#006369` |
| 500 | `#784cea` | `#985ffa` | `#bb46d8` | `#338287` |
| 400 | `#9a79ef` | `#b287fb` | `#cc74e2` | `#66a1a5` |
| 300 | `#bba5f5` | `#cbaffd` | `#dda3eb` | `#99c1c3` |
| 200 | `#ddd2fa` | `#ddd2fa` | `#eed1f5` | `#cce0e1` |
| 150 | — | — | — | `#d6e6e7` |
| 100 | `#efeafc` | `#efeafc` | `#f7eafa` | `#e8f1f1` |

⚠ **Unresolved — Figma library error.** Figma gives `lavender/200` and `purple/200`
the identical `#ddd2fa`, and `lavender/100` / `purple/100` the identical `#efeafc`.
Two different hues cannot share tints: in Tailwind every ramp is a distinct
perceptual scale of its own hue (`violet-100` ≠ `purple-100`). Almost certainly
`lavender` inherited `purple`'s tints when the ramp was authored.

**Deliberately not resolved here.** Correcting it means inventing two hex values,
which is exactly the silent guess to avoid — the fix belongs in the Figma library,
derived from `lavender/600` (`#561fe5`). Until then, **do not use `lavender/100`
or `/200`**; they are indistinguishable from purple. Steps 300–900 are unaffected
and safe. Note `--avatar-badge--lavender` in the front office does use this ramp.

#### Alpha ramps

| Step | `alpha/black` | `alpha/white` | `alpha/gray` |
|---|---|---|---|
| 500 | `#12121299` | `#ffffff99` | `#44444499` |
| 400 | `#12121266` | `#ffffff66` | `#44444466` |
| 300 | `#12121233` | `#ffffff33` | `#44444433` |
| 200 | `#1212121a` | `#ffffff1a` | `#4444441a` |
| 100 | `#1212120d` | `#ffffff0d` | `#44444408` |

Named `alpha/black/{n}-alpha` and `alpha/white/{n}-alpha`, but `alpha/gray/alpha-{n}`
— the inconsistent ordering is Figma's, not a typo here.

**✅ Resolved — `alpha/gray/alpha-100` should be `#4444440d`, not `#44444408`.**
All three ramps otherwise follow one consistent opacity scale — `0d` 5% · `1a` 10% ·
`33` 20% · `66` 40% · `99` 60% — which mirrors Tailwind's opacity steps. A single
value at `08` (≈3%) breaks an otherwise perfect pattern across 15 tokens, so it reads
as a typo (`08` for `0d`), not intent. The table above still shows Figma's literal
value; **fix it in the Figma library**, then the documented value follows.

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
| `--color-text-brand-on-secondary` | `#0058d2` | Brand text on a brand-secondary surface ᶠ |
| `--color-text-disabled-on-disabled` | `#b2b2b2` | Text on a disabled surface ᶠ |
| `--color-text-positive-on-secondary` | `#027948` | Success text on a light surface ᶠ (= `green/700`) |
| `--color-text-danger-on-secondary` | `#b32318` | Error text on a light surface ᶠ (= `red/700`) |

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
| `--color-background-danger-default-hover` | `#b32318` | Destructive hover ᶠ |
| `--color-background-danger-default-active` | `#912018` | Destructive active/pressed ᶠ |
| `--color-background-base-tertiary-hover` | `#d9d9d9` | Hover on tertiary bg ᶠ |
| `--color-background-base-default-on-color` | `#ffffff` | Surface sitting on a coloured ground ᶠ |
| `--color-background-base-inverse-default-hover` | `#383838` | Inverse surface hover ᶠ |
| `--color-background-base-inverse-default-active` | `#444444` | Inverse surface active ᶠ |
| `--color-background-disabled-default` | `#f1f1f1` | Disabled control surface ᶠ |
| `--color-background-transparent-brand` | `#7e37f933` | ⚠ **Do not use** — legacy, see below ᶠ |
| `--color-background-transparent-black` | `#12121233` | Black 20% overlay ᶠ |
| `--color-background-transparent-white-on-color` | `#ffffffb2` | White 70% on colour ᶠ |
| `--color-background-transparent-overlay-light` | `#ffffff66` | White 40% overlay ᶠ |

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
| `--color-icon-base-default` | `#121212` | Default icon ᶠ ⚠ |
| `--color-icon-brand-default` | `#0058d2` | Brand icon ᶠ |
| `--color-icon-base-inverse-default` | `#ffffff` | Icon on dark surface ᶠ ⚠ |
| `--color-icon-base-inverse-on-color` | `#ffffff` | Icon on coloured surface ᶠ ⚠ |
| `--color-icon-disabled-on-disabled` | `#b2b2b2` | Icon on disabled surface ᶠ |

> ᶠ = confirmed directly from Figma variables on 2026-08-17 (Components file,
> Button node `39:177`). ⚠ = the CSS in `main.css` maps this token onto the
> `--black-1000` / `--white-1000` primitives — HISTORY: they were undefined until Sept 2026; now defined in main.css,
> and the last light-theme gap (`--color-background-base-inverse-on-color`) is defined by `css/token-fix.css`
> (2026-10-21). Every base token resolves on every page; keep the fallbacks anyway. See the `components` skill §8.

**✅ Resolved — `--color-background-transparent-brand` is legacy; do not use it.**
Its value is `purple/600` at 20% (`#7e37f933`), but the brand colour is
`blue-sky/600` (`#0058d2`). A token named `*-brand` that resolves to a *different
hue than the brand* is a leftover from an earlier palette — under Tailwind-style
semantic naming, a semantic alias must track the role it names. It also has no CSS
implementation, so nothing depends on it today. If a translucent brand tint is
needed, derive it from the real brand colour:

```css
background: color-mix(in srgb, var(--color-background-brand-default) 20%, transparent);
/* or simply */ background: #0058d233;
```

Retire the Figma variable, or repoint it at `blue-sky/600`.

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
| `--spacing-40` | 40px | `--spacing-40` (main.css) |
| `--spacing-48` | 48px | `--spacing-48` |
| `--spacing-56` | 56px | `--spacing-56` ᶠ |
| `--spacing-64` | 64px | `--spacing-64` |
| `--spacing-72` | 72px | `--spacing-72` (main.css) |
| `--spacing-80` | 80px | `--spacing-80` ᶠ |

> Use 4, 8, 16, 24, 32 as the most common steps. Skip steps 2 and 6 unless in dense/compact contexts.

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--border-radius-4` | 4px | Small elements (tags, badges) |
| `--border-radius-6` | 6px | Inputs, small cards |
| `--border-radius-8` | 8px | Default cards, buttons |
| `--border-radius-12` | 12px | Large cards, modals |
| `--border-radius-16` | 16px | Panels, drawers, **list cards** (act / request rows, notifications, catalog cards), the request status notice, the document viewer canvas + signature card (radius-16-v1, 2026-10-21) |
| `--border-radius-20` | 20px | **Details / grey containers, the trajectory card and the alert card — every width** (cards-radius-20-v1, 2026-10-23, user decision; were 24 desktop / 16 phones): `.e-permits-dosar-profil__card` (BO / eKYC / Ghișeu / Cabinet / RAP details, incl. the BO-mode copy in e-permits-acte-permisive.css), `.e-permits-timeline` (Jurnal / Istoric), `.e-permits-trajectory` + its hanging callout (bottom corners, inset 20), `.e-permits-callout--card` (alert card; tray top corners + grey band), the Cabinet profile skeleton trajectory, RAP `.rap-profile__beneficiary-card / __timeline / __support-card`, the FO review / Verificare summary card and `.e-permits-fo-payment-summary`. Edge-to-edge phone states (< 375 tray, Cabinet phone trajectory without alert) stay square. NOT in main.css: defined in `css/token-fix.css`, mirrors the Foundations Figma variable `border-radius/radius-20` (collection „3. Sizes”) |
| `--border-radius-24` | 24px | The facet filter bar box (filter-bar-v3, 2026-10-22), the form-builder device frame / step sections, RAP company summary boxes. (The BO profile / trajectory cards moved to 20 in cards-radius-20-v1.) **Not for list cards** (tried in radius-24-v1, 2026-10-21, rejected by the user → 16). NOT in main.css: defined in `css/token-fix.css` (radius-24-v1, 2026-10-21, user decision) from the Foundations Figma variable `border-radius/radius-24` = 24 (collection „3. Sizes”, key `79848dbe4107a9babdbb8d1861d66890fc200d53`) |
| `--border-radius-32` | 32px | main.css only — not used by the product yet |
| `--border-radius-full` | 9999px (main.css; old fallbacks say 999px, same render) | Pills, avatars, circular buttons |

---

## 5. Border Width

| Token | Value | Usage |
|---|---|---|
| `--border-width-1` | 1px | Default borders |
| `--border-width-1.5` | 1.5px | Focus rings, emphasis borders |
| `--border-width-2` | 2px | Strong borders, selected states |
| `--border-width-3` | 3px | Maximum emphasis |
| `--border-width-4` / `-6` / `-8` | 4 / 6 / 8px | main.css (rings, thick rules) |

### Writing tokens in CSS (2026-10-15)

Every padding / margin / gap, border-radius, border width, font-size and line-height is a token with
its px fallback — never a bare px: `var(--spacing-16, 16px)`, `var(--border-radius-8, 8px)`,
`var(--border-width-1, 1px) solid …`, `var(--font-size-fs-14, 14px)`, `var(--line-height-lh-20, 20px)`
(the `lh` tokens are not defined in main.css yet — the fallback carries them). Negatives:
`calc(var(--spacing-16, 16px) * -1)`. A 1px border compensation: `calc(var(--spacing-12, 12px) -
var(--border-width-1, 1px))`. Off-scale values (10, 11, 14, 18, 28…) stay raw until the PO decides — they
are listed by `node tools/ui-qa/raw-px-audit.mjs --list`. Layout sizes (width / height / top / max-width)
and shadows are not tokenised.

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

### Focus Ring

Figma defines the focus ring as a named effect, not a shadow level — two stacked
drop shadows at zero offset and zero blur, i.e. two concentric rings:

| Effect | Figma definition | CSS equivalent |
|---|---|---|
| `Focus Ring/Medium` | `blue-sky/500` spread **5**, `white/1000` spread **2** | `box-shadow: 0 0 0 2px #ffffff, 0 0 0 5px #3379db` |

Confirmed from Figma variables 2026-08-17 (Button node `39:177`).

**✅ Resolved — Figma wins (2px offset + 3px ring = 5px total).**
This is exactly Tailwind's default focus pattern: `ring-offset-2` (2px white) plus
the default `ring` width of **3px**. The current CSS (`box-shadow: 0 0 0 4px`) is
`ring-2 ring-offset-2` — also a valid Tailwind idiom, but the narrower one, and
design should lead on a purely visual value. Adopt:

```css
/* canonical focus ring — use this everywhere */
box-shadow: 0 0 0 2px var(--white-1000, #ffffff),
            0 0 0 5px var(--blue-sky-500, #3379db);
```

⚠ **Code change still required** — `main.css` `.btn:focus` uses `4px` and must move
to `5px`. Not applied yet. The codebase also carries at least four other focus-ring
idioms that match neither (see the `components` skill §8); all should converge here.

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
  --border-radius-20: 20px; /* css/token-fix.css (cards-radius-20-v1) — not in main.css */
  --border-radius-24: 24px; /* css/token-fix.css (radius-24-v1) — not in main.css */
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

### Border — subtle step per colour (added 2026-10-09)
`border/positive/secondary` (green 200 / dark 800), `border/warning/secondary` (apricot 200 / 800),
`border/danger/secondary` (red 200 / 800), `border/brand/secondary` (blue-sky 200 / 800) — Foundations
„1. Semantic Colors”, stroke scope; CSS `--color-border-<tone>-secondary`. Same role as
`border/base/secondary` (gray 300). Used by Subtle tags.
