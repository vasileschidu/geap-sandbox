# Project Instructions for Claude

## Source of truth hierarchy (in order)
1. `.claude/skills/components.md` — exact classes/markup for components that already exist
2. `.claude/skills/design-system.md` — token values (color, spacing, radius, shadow, type)
3. Figma screenshot / MCP output — layout & composition reference ONLY.
   Once a component exists in (1), Figma is never the source for its exact
   markup, padding, or states again.

Both files above also auto-load as skills (`components`, `design-system`).
Where a shipped screen and these docs disagree, **the screen is ground truth** —
fix the doc, not the screen.

## Before writing ANY markup or CSS
1. Check the Component Inventory table in `.claude/skills/components.md` for a match.
2. If it exists — copy it exactly. Do NOT:
   - invent new class names
   - adjust padding/spacing "to fit" the new screen
   - change hover/focus/active/error colors
   - restructure the DOM
3. Only write new markup if nothing matching exists. Then follow
   "6. Building New Components" in `.claude/skills/components.md`, including the full
   variant checklist: default / hover / active / focus / disabled / error / success.
4. Never hardcode hex or px values. Only `var(--...)` tokens from
   `.claude/skills/design-system.md`.

## Working from Figma (via Figma MCP)
1. Pull the node with `get_design_context`.
2. Cross-reference every component in the result against the Component
   Inventory in `.claude/skills/components.md` — do this BEFORE writing any code.
3. For anything already in the inventory (Input, Button, Select, etc.),
   ignore the generated reference code entirely. Open the real local file
   (e.g. `Components/input-preview.html`) and reuse its exact classes.
4. Only components genuinely absent from the inventory get new code.

## When in doubt
Ask before inventing a value. Never guess a hover color or padding.

## UI QA — definition of done (2026-10-12)
Every UI change is checked by a QA agent before it is reported as done:
- **Code** (new/changed screen, drawer, component, CSS): run the `ui-qa-code` agent with the
  demo states that show the change (+ a scope selector for drawers/modals). It measures the
  rendered states (`tools/ui-qa/code-audit.mjs`) against components.md / design-system.md,
  and moves a real mouse over every interactive element (`tools/ui-qa/hover-audit.mjs`):
  no visible hover, or an invisible layer on top, is a major finding (2026-10-13).
- **Figma** (new/changed blocks, components): run the `ui-qa-figma` agent with the node ids
  (+ the matching demo states). It audits read-only (`tools/ui-qa/figma-audit.js`): instances
  vs raw frames, token-bound colours, text styles, spacing/radius scale, auto-layout, clipping,
  icon = label colour, and compares with the prototype.
- **Components only (2026-10-18)**: the `component-auditor` agent runs together with `ui-qa-code` on every UI
  change (`tools/ui-qa/component-audit.mjs`, allow-list `tools/ui-qa/specs/component-audit.json`): every control
  is a library / documented component, fields are 40 on desktop and 48 with 16/24 text on phones (≤760), icons
  inside fields at the library size. Non-library controls and wrong phone sizes are major findings.
Fix the major findings, re-run the agent, then report. Code first, then Figma.

**Figma quality gate (2026-10-16) — every Figma screen, no exceptions:** only component instances (no invented /
captured buttons, inputs, selects…; missing ones become local components built from the code), auto-layout everywhere,
tokens + text styles, whole pixels, no image-fill icons, the code's spacing rhythm (nothing < 8px), menus with
„dropdown-effect” and never cut, matches the code. The gate is listed in `.claude/agents/ui-qa-figma.md`; any FAIL =
not done. Whole pages / files are brought to the gate by the **`figma-quality-sweep`** agent (run it after every
capture / board build and as a periodic sweep of all four files).

## Builder agents that learn (2026-10-12)
- **`proto-engineer`** builds UI in code; **`figma-designer`** draws it in Figma from the prototype
  (capture → library instances → block). Order: code first, then Figma.
- Each reads its playbook before the job and **appends lessons after every job**:
  `.claude/playbooks/proto-engineer.md`, `.claude/playbooks/figma-designer.md`. User corrections
  go there too (and into memory when they are product rules). Each finishes with its QA agent
  (`ui-qa-code` / `ui-qa-figma`).
- Shared Figma tools: `tools/figma/capture-to-figma.mjs` (prototype state/element → Figma),
  `tools/figma/swap-to-instances.js` (raw capture → library instances).

**Figma starting points (2026-10-16):** boards = one Section per column, plus a „Start here” section (contents with links, block counts, PO questions). Every Figma change also updates that board's „Start here” and the file-level index / cover. Not done until both are current.
