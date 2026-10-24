# Local components page tools (GEAP 2.0 aHgwVwiNCOSOqbMhMjjUOj)

Page „🧩 Local components” 10566:10080. Category section ids live in root shared plugin data
`localcomp` / `sections` (NAV, TBL, PIN, FRM, CRD, PRF, DOC, MOD, MNU, FBK, ICN, DSG, BH, OTH, LEG, HLP).
The routines below are also stored in root shared plugin data `lc2` / `<name>`; run them with
`new (Object.getPrototypeOf(async function(){}).constructor)("ARGS", code)(args)` inside a use_figma call.

| File | What |
|---|---|
| `convert-main.js` | `ARGS {items:[{id, cat, rename?}]}` — a main COMPONENT that lives inside a screen: an instance takes its exact place (index, sizing, absolute x/y), the main moves to the category section. Run `place-in-section.js` in the same call. |
| `place-in-section.js` | `ARGS {cat, ids}` — appends the ids in new rows at the BOTTOM of the section (existing items are not re-sorted — other agents may be adding to the section), grows the section, restacks the page sections (x 0 only) 80 apart. |
| `set-to-instances.js` | `ARGS {id, cat, frameName}` — a component SET shown in a spec / board area: a frame with one instance per variant takes its place (same auto-layout, padding tokens, fills), the set moves to the section. GRID sets with overlapping cells fail `setGridChildPosition` → rebuild that frame with absolute positions (Requestor). |
| `modal-content-swap.js` | `ARGS {host:"I<modal>;<nested>", variant}` — a nested per-state „Modal content / …” instance → `Modal content / Body` 12698:438587 (variant ids in `lc2` / `body`): the old content's children are cloned FROM THE INSTANCE (overrides kept) into the Body's native slot, sizing / clip restored. |

Verification: REST renders of every host before / after (`/v1/images/<file>?ids=…&scale=1`) + a PIL pixel diff (threshold 8).
Job local-components-page-v2 (2026-10-24): 48 hosts (22 screens / spec frames + 26 modals), all pixel-identical.
