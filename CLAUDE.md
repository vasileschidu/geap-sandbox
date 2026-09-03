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
