# eKYC BO — Figma QA + fix (2026-10-16)

File `SqMGpRKEppJLcvn7HMzOPR`, the 9 BO pages (L01, D01–D02, S01–S02, R01–R07, C01–C08, A01–A03). Every script runs as
`use_figma` code; the long ones were stored once in `figma.root` shared plugin data (`ekqa/<name>`, cleared at the end) and run
per page with `new (Object.getPrototypeOf(async function(){}).constructor)("__OPT", code)(OPT)`. Strip the `//` comment lines
before storing with `String.raw` (comments contain backticks).

Run order (each page): audit → census → graphics → band-axis → pieces → whole-pixel → whole-pixel-positions → margin-unwrap →
search-wrapper → restack (fixups.js) → audit again.

| Script | Mode | What |
|---|---|---|
| `audit.js` | read-only | eKYC audit per page: raw-control, image-fill, raw-vector, unbound colour, text style, font, spacing / radius off-scale + unbound, fractional (FIXED / absolute) + fractional-hug (info), tight-gap (notice instances, peek layers exempt), not-auto-layout (+ single child), sibling overlap, clipping, border-padding, icon ≠ label (RESOLVED colours), dropdown-effect, screen frame |
| `census.js` | read-only | control-like RAW frames (painted, rounded, ≤ 64 high, short text) + orphan local instances |
| `census-combos.js` | read-only | hand-built switch / checkbox / radio + label combos |
| `census-absolute.js` | read-only | ABSOLUTE children by parent, to tell overlays / decorations from layout |
| `graphics.js` | dry / apply / revert | captured SVG meters + column charts → auto-layout (backup clones in „QA backup · ekyc-qa · 2026-10-16” on 🗄 Archive) |
| `band-axis.js` | dry / apply | decision-band threshold axis (SVG ticks + labels) → auto-layout „Band” / „Axis” / tick groups + spacers |
| `build-local.js` | record | the 4 local components (library gaps) built from code-matching captures |
| `pieces.js` | dry / apply | hand-built switch rows, status facet options, video duration pills, field group labels → the local components |
| `whole-pixel.js` | dry / apply / revert | FIXED sizes, absolute positions, grid tracks → whole pixels (texts round up) |
| `whole-pixel-positions.js` | dry / apply / revert | flow positions: strokes included in layout (0.5 px dividers, 1 px borders) → not included when that makes children whole; ≤ 2 px centring → MIN |
| `margin-unwrap.js` | dry / apply | „…:margin” wrappers (negative CSS margins) → auto-layout groups with gap = parent gap − margin |
| `search-wrapper.js` | dry / apply / revert | redundant white fill + radius on wrappers around the library search |
| `fixups.js` | record | form layouts (+ sticky nav of a scrolled screen), grid span fix, band cards, restack, one deleted leftover |

Local components (🧩 Local components › „Group · Form, filter and media pieces (library gaps)”):
`Switch · label (library gap)` 10775:1049 · `Filter option · tag (library gap)` 10775:1055 ·
`Media badge · duration (library gap)` 10775:1059 · `Field label (library gap)` 10775:1063.

Snapshots (page shared plugin data, namespace `ekqa`): `wholepx-20261016-N`, `wholepos-20261016`, `pieces-20261016`,
`marginunwrap-20261016`, `searchwrap-20261016`; nodes: `formlayout` (form containers), `orig` (Archive backups).
