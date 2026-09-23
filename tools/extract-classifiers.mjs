/**
 * One-time fixture generator for the Classifiers slice.
 *
 * The artifact keeps its classifier catalogue as a seeded, generated constant.
 * Per the migration plan the generators do NOT ship in the app: they run once,
 * here, and their output becomes JSON. This script therefore slices the seed and
 * its four helpers straight out of the artifact and evaluates them, rather than
 * transcribing 500 lines by hand where a typo would be invisible.
 *
 *   node tools/extract-classifiers.mjs
 *
 * Re-run it only to regenerate fixtures from a newer artifact. Nothing in the
 * app depends on this file at runtime.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT = resolve(ROOT, ".claude/reference/locul-de-munca-v26.jsx");

const src = readFileSync(ARTIFACT, "utf8");
const lines = src.split("\n");

/* Slice by marker text, not line number, so the script survives edits above. */
function slice(startMarker, endMarker, { inclusive = true } = {}) {
  const start = lines.findIndex((l) => l.startsWith(startMarker));
  if (start === -1) throw new Error(`start marker not found: ${startMarker}`);
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith(endMarker)) { end = i; break; }
  }
  if (end === -1) throw new Error(`end marker not found after ${startMarker}: ${endMarker}`);
  return lines.slice(start, inclusive ? end + 1 : end).join("\n");
}

/* Some helpers are declared on a single line. */
function line(marker) {
  const i = lines.findIndex((l) => l.startsWith(marker));
  if (i === -1) throw new Error(`line marker not found: ${marker}`);
  return lines[i];
}

const parts = [
  "const TODAY = new Date(2026, 6, 9);",
  slice("function mulberry32", "}"),
  line("function addDays"),
  slice("function clasVal(", "}"),
  slice("function clasValoriSintetice", "}"),
  slice("let CLASIFICATOARE = [", "];"),
  "return CLASIFICATOARE;",
];

const CLASIFICATOARE = new Function(parts.join("\n\n"))();

if (!Array.isArray(CLASIFICATOARE) || CLASIFICATOARE.length === 0) {
  throw new Error("extraction produced no classifiers");
}

/* Dates become ISO calendar days. The app compares and sorts them as strings,
   which is chronological for this format, and parses only to format for display. */
const isoDay = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const serialise = (value) => {
  if (value instanceof Date) return isoDay(value);
  if (Array.isArray(value)) return value.map(serialise);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialise(v)]));
  }
  return value;
};

const classifiers = serialise(CLASIFICATOARE);

/* Sanity gates. A silently empty or malformed fixture is worse than a crash. */
const problems = [];
for (const c of classifiers) {
  if (!c.id || !c.denumire) problems.push(`missing id/denumire: ${JSON.stringify(c).slice(0, 60)}`);
  if (!["draft", "published", "archived"].includes(c.status)) problems.push(`${c.id}: bad status ${c.status}`);
  if (!["intern", "mconnect", "api"].includes(c.sursa)) problems.push(`${c.id}: bad sursa ${c.sursa}`);
  if (!Array.isArray(c.valori)) problems.push(`${c.id}: valori is not an array`);
  if (!Array.isArray(c.consumatori)) problems.push(`${c.id}: consumatori is not an array`);
}
if (problems.length) {
  console.error("extraction failed validation:\n  " + problems.join("\n  "));
  process.exit(1);
}

const out = resolve(ROOT, "data/classifiers/classifiers.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ classifiers }, null, 2) + "\n", "utf8");

const values = classifiers.reduce((n, c) => n + c.valori.length, 0);
console.log(`wrote ${out}`);
console.log(`  ${classifiers.length} classifiers, ${values} values`);
console.log(`  statuses: ${JSON.stringify(classifiers.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {}))}`);
console.log(`  sources:  ${JSON.stringify(classifiers.reduce((a, c) => ((a[c.sursa] = (a[c.sursa] || 0) + 1), a), {}))}`);
