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
- BO child page (any depth) = ONE quiet back chevron in the shell TOP BAR left of the top-bar title (`syncTopbarBack`, declared by `renderPageHeaderTop({ back })` → hidden marker), to the IMMEDIATE parent; never an arrow next to the H1, no BO breadcrumbs (they stay in FO / Cabinet / RAP). List category tabs = the product Status filter tabs, never the library page tabs. CSS for the BO page header lives in `e-permits-acte-permisive.css` (`bo-profile-parts.css` is only RAP / Cabinet).
- Applicant types: icon + full name in forms/read-only views; plain codes in stacked list meta.
- Hover visible everywhere; open button keeps focus ring (`aria-expanded`); no toast for toggles.
- Any clickable element = `cursor: pointer` + visible hover (hover-audit flags „no-pointer”); a clickable row with inner controls: band on the row only, the control's own hover on the control (components.md › Row vs inner control).
- The shell top bar always shows the active section name (profiles too: `setActiveNav` + `syncTopbarTitle`).
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

## Lessons
Lessons live in `.claude/playbooks/proto-engineer-lessons.md` (archive, ~114k tokens). Never read it whole: grep it for the topic of your job (component, board, screen, API call) and read only the matching lessons. Append new lessons there, ≤ 3 lines each.
