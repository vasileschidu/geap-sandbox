// Adapter: runs tools/ui-qa/component-audit.mjs's OWN in-page rules (PAGE_LIB) on any URL (staging) without
// forking them. The rule source is read from component-audit.mjs at run time (the `const PAGE_LIB = …` block and
// `parseInventory`), so a change to the audit's rules applies here too. Run from the repo root.
import fs from "node:fs";

const SRC_PATH = "tools/ui-qa/component-audit.mjs";
const SPEC_PATH = "tools/ui-qa/specs/component-audit.json";

const slice = (src, start, end) => {
  const a = src.indexOf(start); if (a < 0) throw new Error(`ca-adapter: „${start}” not found in ${SRC_PATH} — update lib/ca-adapter.mjs`);
  const b = src.indexOf(end, a); if (b < 0) throw new Error(`ca-adapter: end marker „${end}” not found in ${SRC_PATH}`);
  return src.slice(a, b);
};

/* rules that make sense on a foreign DOM (staging): sizes, tooltips, tables, headings. Class-based rules
   (non-library-control, button-paint, look-alike, converge, copy-variant…) judge OUR class names and are dropped. */
export const PORTABLE_RULES = ["field-height-desktop", "field-height-phone", "field-text-phone", "field-icon-size", "button-size", "button-icon-size", "tag-size", "tooltip-arrow", "tooltip-look", "tooltip-centered", "empty-table-header", "redundant-heading-border", "radio-size"];

export function componentAuditSource({ extraButtons = "", extraTags = "", extraFieldBoxes = [] } = {}, phone = null) {
  const src = fs.readFileSync(SRC_PATH, "utf8");
  const pageLib = slice(src, "const PAGE_LIB = ", "\n/* ====");
  const parseInv = slice(src, "const parseInventory = ", "\nconst INV = ");
  // eslint-disable-next-line no-new-func
  const documented = new Function("fs", `${parseInv}; return parseInventory();`)(fs).documented;
  const spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
  /* the staging library's equivalents of .btn / .status-tag (light DOM only — shadow DOM parts are measured by
     staging-compare's own deep rule pass) */
  if (extraButtons) spec.buttons.selector += ", " + extraButtons;
  if (extraTags) spec.tags.selector += ", " + extraTags;
  if (extraFieldBoxes.length) spec.fieldBoxes = [...spec.fieldBoxes, ...extraFieldBoxes];
  /* the audit decides phone / desktop from window.innerWidth — a page wider than a phone screen stretches it, so the
     viewport we emulate decides instead */
  if (phone !== null) spec.size.phoneMaxWidth = phone ? 1e6 : 0;
  return { expr: `(${pageLib.trim().replace(/;\s*$/, "").replace(/^const PAGE_LIB = /, "")})(${JSON.stringify(spec)}, ${JSON.stringify([...documented])})`, spec };
}

export const auditSpecNumbers = () => JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
