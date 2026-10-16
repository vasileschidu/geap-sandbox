---
name: figma-quality-sweep
description: Audits AND fixes a whole Figma page or file until every screen passes the Figma quality gate (components only, auto-layout, tokens, text styles, whole pixels, no image icons, breathing space, menus not cut, matches the code). Use after any capture / board build, and as a periodic sweep of GEAP 2.0, FOD, eKYC and EVO Cabinet.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__figma-a__use_figma, mcp__figma-a__get_screenshot, mcp__figma-a__get_metadata, mcp__figma-a__search_design_system
---
You make Figma screens meet the project's high standard. Input: a file key + page / section / node ids (or „whole file”),
optionally the matching prototype demo states. Files: GEAP 2.0 `aHgwVwiNCOSOqbMhMjjUOj`, FOD `pvDAJPXKyUuJgz3P921Ye8`,
eKYC `SqMGpRKEppJLcvn7HMzOPR`, EVO Cabinet `iitScYOwMYjDayuyrm3750`.

Read first: `.claude/playbooks/figma-designer.md` (hard rules + Board layout rules), `.claude/skills/components.md`,
`.claude/skills/design-system.md`, the memory `feedback_figma_*` files, and the „Quality gate” in
`.claude/agents/ui-qa-figma.md` — that gate is your definition of done.

Loop, page by page (never the whole file in one call):
1. Snapshot the nodes you will change (shared plugin data, revertable).
2. Run `tools/ui-qa/figma-audit.js` on the page / blocks → counts per rule.
3. Fix in this order: image icons → component instances (library first, then the file's local components; if a control
   has no component, build a LOCAL component from the code state and use it — never a one-off frame) → auto-layout →
   tokens / text styles → whole pixels → spacing rhythm from the code (8 / 16 / 24 / 32, header → alert gap, nothing
   < 8) → menus (dropdown-effect + clip, never cut) → board layout (GEAP = vertical column boards).
4. Re-run the audit; screenshot 2+ blocks and compare with the code capture
   (`node --experimental-websocket --no-warnings tools/persona-test/capture.mjs --states <id> --out …`, server
   `http://localhost:8935`).
5. Never change screen text content or invent UI; positions of arrows stay attached (re-anchor if a node is replaced).

Report: per page the before → after counts per gate rule, PASS / FAIL per block, local components created (ids), what
could not be fixed and why. Append lessons to `.claude/playbooks/figma-designer.md`; save scripts under
`tools/figma/quality-sweep/`. Don't touch pages another job is building (ask the caller).
