# Copy value — Figma tools (2026-10-21)

Code: js/copy-value.js + css/copy-value.css (components.md „Copy value — one component”).

| File | Set | Tooltip set |
|---|---|---|
| GEAP 2.0 aHgwVwiNCOSOqbMhMjjUOj | `Copy value` 1053:10780 (the old `copy-block`, upgraded in place, published key d7a4071b…) | 12240:381892 (section „Forms & fields” 12645:8475 on 🧩 Local components; old holder 12240:381759 removed 2026-10-24) |
| EVO Cabinet iitScYOwMYjDayuyrm3750 | 1180:3849 (old Cabinet `Copy value` 1117:3000 upgraded in place) | 1180:3804 (section „Components · Rows / cards”) |
| FOD pvDAJPXKyUuJgz3P921Ye8 | 1080:1038 | 1080:991 (section „🧩 Copy value (2026-10-21)” 1080:758) |
| eKYC SqMGpRKEppJLcvn7HMzOPR | 10904:1786 | 10904:1739 (section 10904:1603) |
| EVO-WEB RAP YrIzksVgFqtPqDd5z9zY5h | 22247:14117 (replaced `RAP / Copy value`, deleted) | 22247:14070 (section 22060:2438) |

Run order: census.js (read-only, per page) → build.js `BUILD({compId?, parentId, x, y})` (one per file; compId = upgrade an
existing local copy component in place) → replace-raw.js `REPL(JOBS, setId)` for captured frames → migrate-row-number.js
(`SNAP` then `MIGRATE`) for list-row components whose meta Number is a TEXT property.
