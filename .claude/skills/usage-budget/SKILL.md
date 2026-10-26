---
name: usage-budget
description: Keep Claude usage low in this project — which model each agent job gets, how agents read playbooks, how to brief and batch jobs, when to stop sessions and Figma MCP. Use before launching any proto-engineer / figma-designer / QA / research agent, when the user asks about limits or usage, or when a job is mechanical (sweep, rename, status change, height fix, audit).
---

# Usage budget (GEAP prototype + Figma)

Measured 2026-10-26 (claude.ai usage panel, last 24 h): figma-designer 49 %, proto-engineer 40 %,
figma-a MCP 35 %, sessions running 8 h+, and the playbook read in parts 32× (up to 46k tokens each).
The rules below target exactly those.

## 1. Pick the model per job (coordinator passes `model` on the Agent call)

| Job | Model |
|---|---|
| New module / new board / design decisions / complex refactor (calendar, MDocs, new flow) | `opus` (pass it explicitly — figma-designer defaults to sonnet since 2026-10-26) |
| Mechanical Figma: status changes, renames, height / hug / viewport fixes, restacks, clip, token rebinding, comment replies | `sonnet` |
| Small code fixes (copy, a CSS value, a ?v= bump, one bug with a known cause) | `sonnet` |
| QA / audits / persona reviews / verifier / research summaries | `sonnet` (set in their frontmatter) |
| Read-only lookups (find a node, count blocks, read a story) | `haiku` or do it inline |

When unsure, start with `sonnet`; escalate to the default only if the result is wrong.

## 2. Playbooks: core + lessons archive

- `.claude/playbooks/<agent>.md` = **core** (rules, workflow, library ids, gotchas). Agents read it fully.
- `.claude/playbooks/<agent>-lessons.md` = **archive**. Agents never read it whole; they
  `grep -n -i -A3 "<topic>"` it and read only the matches.
- New lessons: ≤ 3 lines, only if new (grep first). A lesson that becomes a lasting rule moves into
  the core (keep the core under ~12k tokens; prune duplicates when it grows).
- Monthly (or when a lessons file passes ~150k tokens): a `sonnet` job distills repeated lessons into
  core rules and drops superseded ones (keep a dated archive copy).

## 3. Brief agents tightly

- Give exact node ids, state ids, file paths and the target values in the prompt, so the agent doesn't search.
- Point to existing scripts (`tools/figma/**`, stored plugin data) instead of asking to rebuild them.
- One agent per board / file at a time — parallel agents on the same Figma page or the same JS file
  cause rework (reverts, broken commits, re-staging).
- Ask for a short report (≤ 15 lines + links); never ask agents to paste large outputs.
- Don't relaunch QA that the builder already ran unless there's a reason; don't run full-file sweeps
  for a single-block fix.
- Prefer `SendMessage` to a finished agent for follow-ups on the same area (it keeps its context)
  over a new agent that must re-read everything — but start a NEW agent when the topic changes.

## 4. Figma MCP (figma-a ≈ 35 %)

- Batch work into few `use_figma` calls; store routines in plugin data / `tools/figma/` and re-run them.
- Screenshots: `maxDimension` ≤ 1000 and only for blocks being checked; prefer `get_metadata` for structure.
- No Figma job while the user is only reviewing code. Turn figma-a off (`/mcp`) during code-only stretches.

## 5. Sessions

- Long sessions grow the context of every turn: after a big milestone (a module done in code + Figma),
  suggest `/clear` or a fresh session; memory + playbooks + CLAUDE.md carry the rules over.
- Stop background agents / dev servers that are no longer needed.
- When a rate limit hits, don't relaunch everything at once after the reset — resume the most urgent
  agent first, the rest in sequence.

## 6. Hand-off instead of endless sessions

This project's coordinator sessions ran 8 h+ and every turn re-sent the whole history. After a
milestone, or when limits get close: write `.claude/handoff/<date>.md` (open jobs, their tools /
scripts / node ids, pending user decisions, next steps), then suggest `/clear`. A new session
reads that one file instead of the old history. Paused agents can't be resumed across sessions —
the hand-off must name the script / README each job stored, so a fresh agent continues from it.

## 7. Before launching any agent — checklist

1. Can I do it inline in ≤ 3 tool calls? → do it, no agent.
2. Mechanical? → `model: "sonnet"`.
3. Is another agent touching the same file / board? → queue it via SendMessage instead.
4. Does the prompt name exact ids, paths and the expected report length?
