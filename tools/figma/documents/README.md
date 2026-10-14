# Documents — one pattern (Figma), 2026-10-14

Local components (GEAP 2.0 › 🧩 Componente locale › „Componente · Documente (un singur model)” 11361:6350):
- `Document · rând` 11362:7113 (BO rows) · `Document · card` 11364:7441 (FO / Cabinet) · `Modal conținut / Document · detalii` 11366:6892.
- Copies (files do not share local components): FOD-Components-flow `Document · card` 762:10435, EVO Cabinet `Document · card` 983:2727.

Extractors (headless Chrome, prototype on :8935): `docrows.mjs` (BO stacked doc lists → JSON), `modalrows.mjs`
(document modal rows), `fodocs.mjs` (FO / Cabinet cards), `hdrspec.mjs` (dossier tabs), `rowspec.mjs` (computed styles).
Figma builders (paste as use_figma code after setting PAGE_ID / JOBS):
- `rebuild-stack.js` — rebuild a BO doc stack from a docrows spec (connectors parked + re-attached by row index).
- `modal.js` — raw / local modal → Modal Tip=Conținut + document content, rows from modalrows.
- `swap-raw-rows.js` — captured „List Item” doc rows (24px Image lead) → Document · rând.
- `place-cards.js` — FO / Cabinet doc nodes → Document · card.
- `imgsweep.js` (read-only) / `imgicons.js` — icon-sized IMAGE fills in blocks → library icon instances (by image hash).
- `sweep-lite.js` (read-only) — sweep.js rules that apply outside eKYC (`Ecran · ` screens) for block boards: deep descendant cut
  (past the nearest clipping ancestor), child overflow, empty GRID rows, icon IMAGE fills, raw svg icons, mono text, connector count.
  Set `SECTION_ID` + `BLOCK_RX` at the top; run per column group on big pages.

Mobile + separators (code e9858260, 2026-10-14):
- `card-mobile.js` — `Document · card` (any file: SET_ID; ONLY = ids or a variant filter): meta parts with an ABSOLUTE dot at
  x −10 inside a clipping Meta (no dot ever starts / ends a line, all widths); Mobil = padding 12, icon / title line / × centred
  at 24, title 2 lines, tags wrap (gap 4), meta in lines via forced breaks („Rând nou”, 1000 × 0.01), labelled actions under the
  text. Idempotent; snapshots + restores componentPropertyReferences and the boolean defaults.
- `row-separators.js` — the same dot rule for `Document · rând` (2px dot, 18 gap).
- `field-header-mobile.js` (library text-input headers) / `field-header-mobile-raw.js` (captured FOD headers) — doc-field header
  on phones: star / „Opțional” after a one-line label, bottom-aligned at the right edge of a wrapped one; „Adaugă fișier” FILL.
- `finish-card-mobile.js` — FO Finalizare „Certificatul Constatator” card on phones (icon 24 · column [text, Small button]).
