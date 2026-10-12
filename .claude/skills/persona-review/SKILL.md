---
name: persona-review
description: Review a GEAP flow through persona agents backed by real evidence (prototype screenshots + a11y/text capture, Figma inventory, Azure user stories), verify the findings, and publish them as a section on the flow's Figma page. Use when the user asks to test/verify screens with personas, or runs /persona-review <flow>.
---

# /persona-review <flow>

`<flow>` is a file in `tools/persona-test/flows/` (e.g. `fo`). Everything below is driven by it.

## 1. Evidence
1. Make sure the prototype is served on `http://localhost:8935` (any static server on the repo root).
2. Capture every demo state of the flow, desktop 1440 + mobile 375:
   `node --experimental-websocket --no-warnings tools/persona-test/capture.mjs --prefix <flow>- --out tools/persona-test/out/<flow>`
   Check the log: every line `ok`, note console errors/overflow.
3. Refresh the Figma inventory `tools/persona-test/flows/<flow>-figma.json` (blocks, desktop/mobile node ids, „Prototype ↗” state, NOTE text) with `use_figma` on the flow's section when Figma changed.
4. Refresh the specs `tools/persona-test/specs/<flow>/US-*.md` from Azure DevOps (project GEAP) when stories changed — plain text, description + acceptance criteria.

### Figma mode — `/persona-review <flow> --source figma`
Review the designs instead of (or before) the prototype: all blocks, including states that only exist in Figma.
1. Refresh `tools/persona-test/flows/<flow>-figma.json` (blocks, desktop/mobile node ids, notes).
2. Export every block with `mcp__figma-a__get_screenshot` (`enableBase64Response: false`, desktop `maxDimension` 2000, mobile 2800) and download each URL at once with curl to `tools/persona-test/out/<flow>-figma/<KEY>/{desktop,mobile}.png`; write `index.json`. Delegate to a capture agent — 120+ frames.
3. Run the same agents with run dir `tools/persona-test/out/<flow>-figma` and the line „Figma mode — see CONTRACT.md”.
4. Publish as „Persona review · <flow> · Figma · <date>”. `--source both` runs both and adds a „prototype ≠ Figma” column.

## 2. Review (parallel)
Run every agent listed in the flow's `personas`, in parallel, each with:
`Flow map: tools/persona-test/flows/<flow>.json. Run dir: tools/persona-test/out/<flow>. Follow your agent definition in .claude/agents/<name>.md and tools/persona-test/CONTRACT.md.`
Each writes `out/<flow>/findings/<agent>.json`; the spec auditor also writes `spec-coverage.json`.

## 3. Verify
Run the `verifier` agent on the run dir → `findings/verified.json`. Only `confirmed` and `plausible` findings go further.

## 4. Publish
- In Figma, on the flow's page, create/replace the section **„Persona review · <flow> · <date>”** next to the flow section:
  - Header: date, run dir, personas, counts by severity.
  - **AC coverage** table from `spec-coverage.json` (US · AC · status · where).
  - One card per verified finding, grouped by step (screen): severity tag, persona(s), title, observation (quoted texts), source, recommendation; a connector from the card to the related block in the flow section when the block exists.
  - Use library components (tags, cards, text styles); no hard-coded colors.
- Reply to the user with the counts, the top blockers and a link to the section.
- Azure comments only if the user asks.

## Rules
- Findings without evidence + source are dropped (CONTRACT.md).
- Never fix anything during the review; fixes are a separate, approved step.
- Re-run on the same flow after fixes to compare (keep the previous `verified.json` as `verified-<date>.json`).
