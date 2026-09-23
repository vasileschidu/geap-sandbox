/**
 * test/parity.classifiers.mjs — Classifiers slice parity suite.
 *
 *   node test/parity.classifiers.mjs
 *
 * Two kinds of check:
 *
 *   DIFFERENTIAL — the artifact's own function is sliced out of the .jsx and
 *   run beside the ported one on the same fixtures. Any divergence is a real
 *   regression, not a matter of opinion. This is the check that makes "logic
 *   moves, it doesn't get rewritten" verifiable rather than aspirational.
 *
 *   BEHAVIOURAL — for logic that was trapped inside React components and
 *   cannot be sliced (the validators closed over `clas`), expectations are
 *   asserted directly, each citing the artifact line it encodes.
 *
 * No test framework and no dependencies, to match the project's no-build rule.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const core = {
  classifiers: require(resolve(ROOT, "core/classifiers.js")),
  permissions: require(resolve(ROOT, "core/permissions.js")),
  gating: require(resolve(ROOT, "core/gating.js")),
  filters: require(resolve(ROOT, "core/filters.js"))
};
const { createMockServer } = require(resolve(ROOT, "api/mock-server.js"));

const readJSON = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const fixtures = {
  classifiers: readJSON("data/classifiers/classifiers.json"),
  families:    readJSON("data/catalog/clas-families.json"),
  sources:     readJSON("data/catalog/clas-sources.json"),
  modes:       readJSON("data/catalog/clas-modes.json"),
  scopes:      readJSON("data/catalog/clas-scopes.json"),
  statuses:    readJSON("data/catalog/clas-statuses.json"),
  fieldTypes:  readJSON("data/catalog/clas-field-types.json"),
  columns:     readJSON("data/ui/columns.json"),
  compartments:readJSON("data/ui/compartments.json")
};

/* ---------- slice the artifact's originals ------------------------- */
const artifactSrc = readFileSync(resolve(ROOT, ".claude/reference/locul-de-munca-v26.jsx"), "utf8");
const artifactLines = artifactSrc.split("\n");

function sliceFn(startMarker) {
  const start = artifactLines.findIndex((l) => l.startsWith(startMarker));
  if (start === -1) throw new Error(`artifact function not found: ${startMarker}`);
  for (let i = start + 1; i < artifactLines.length; i++) {
    if (artifactLines[i].startsWith("}")) return artifactLines.slice(start, i + 1).join("\n");
  }
  throw new Error(`no closing brace for: ${startMarker}`);
}

/* The artifact's lifecycle functions reference lucide icon components. They
   are presentation and undefined here, so they are stubbed as names. Actions
   are therefore compared on action/label/spre, not on icon. */
const ARTIFACT = new Function(`
  const Send = "send", Archive = "archive", RotateCcw = "rotate-ccw",
        Undo2 = "undo", Trash2 = "trash", Edit3 = "edit";
  ${sliceFn("function scopeClasificator")}
  ${sliceFn("function clasStatusActions")}
  ${sliceFn("function renuntaClasMeta")}
  ${sliceFn("function allowedForClasificator")}
  ${sliceFn("function blockReasonClasificator")}
  ${sliceFn("function poateEditaClas")}
  ${sliceFn("function campuriImpliciteFor")}
  return { scopeClasificator, clasStatusActions, renuntaClasMeta, allowedForClasificator,
           blockReasonClasificator, poateEditaClas, campuriImpliciteFor };
`)();

/* ---------- tiny harness ------------------------------------------- */
let passed = 0;
const failures = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function check(name, actual, expected) {
  if (eq(actual, expected)) { passed++; return; }
  failures.push({ name, actual, expected });
}
function checkTrue(name, value) { check(name, !!value, true); }

function group(title) { console.log(`\n${title}`); }
function note(msg) { console.log(`  ${msg}`); }

/* ---------- fixtures for states the seed does not contain -----------
   The seed is 18 published classifiers, which is faithful: in the artifact
   drafts only arise from editing. Draft and archived states are therefore
   synthesised here so every branch is still exercised. */
const real = fixtures.classifiers.classifiers;
const base = real[0];
const variants = [
  { ...base, id: "v-draft-nosnap",  status: "draft",     publishedSnapshot: null,      sursa: "intern" },
  { ...base, id: "v-draft-snap",    status: "draft",     publishedSnapshot: { v: "1" }, sursa: "intern" },
  { ...base, id: "v-published",     status: "published", publishedSnapshot: null,      sursa: "intern" },
  { ...base, id: "v-archived",      status: "archived",  publishedSnapshot: null,      sursa: "intern" },
  { ...base, id: "v-mconnect",      status: "published", publishedSnapshot: null,      sursa: "mconnect" },
  { ...base, id: "v-api",           status: "published", publishedSnapshot: null,      sursa: "api" },
  { ...base, id: "v-system",        scopeSystem: true },
  { ...base, id: "v-global",        scopeSystem: false, categorie: "global",   servicii: [] },
  { ...base, id: "v-authority",     scopeSystem: false, categorie: "specific", servicii: ["a", "b"] },
  { ...base, id: "v-service",       scopeSystem: false, categorie: "specific", servicii: ["a"] }
];
const corpus = real.concat(variants);

/* =================================================================== */
group(`DIFFERENTIAL against the artifact (${corpus.length} classifiers: ${real.length} real + ${variants.length} synthetic)`);

const stripIcons = (acts) => acts.map(({ action, label, spre }) => ({ action, label, spre }));

for (const c of corpus) {
  check(`scopeOf(${c.id})`, core.classifiers.scopeOf(c), ARTIFACT.scopeClasificator(c));
  check(`statusActions(${c.id})`,
    stripIcons(core.classifiers.statusActions(c)),
    stripIcons(ARTIFACT.clasStatusActions(c)));
  const mineDiscard = core.classifiers.discardMeta(c);
  const theirsDiscard = ARTIFACT.renuntaClasMeta(c);
  check(`discardMeta(${c.id})`,
    { label: mineDiscard.label, destructive: mineDiscard.destructive },
    { label: theirsDiscard.label, destructive: theirsDiscard.destructive });
  check(`allowedActions(${c.id})`,
    core.gating.allowedForClassifier(c), ARTIFACT.allowedForClasificator(c));
  check(`blockReason(${c.id})`,
    core.gating.blockReasonClassifier(c), ARTIFACT.blockReasonClasificator(c));
  for (const role of ["adm-c", "adm-l", "specialist", "supervizor"]) {
    check(`canEdit(${c.id}, ${role})`,
      core.permissions.canEditClassifier(c, role), ARTIFACT.poateEditaClas(c, role));
  }
  check(`defaultFields(${c.id})`,
    core.classifiers.defaultFields(c, fixtures.fieldTypes),
    ARTIFACT.campuriImpliciteFor(c));
}
note(`${corpus.length} classifiers x 8 functions compared`);

/* =================================================================== */
group("BEHAVIOURAL — logic extracted from components (not sliceable)");

/* Artifact L15942 valideazaRand. */
const existing = [{ cod: "A1" }, { cod: "A2" }];
check("value: empty id rejected",
  core.classifiers.validateValueRow("__new__", { cod: "", denRo: "X", activDeLa: "2026-01-01" }, existing).cod,
  "ID obligatoriu");
check("value: duplicate id rejected",
  core.classifiers.validateValueRow("__new__", { cod: "A1", denRo: "X", activDeLa: "2026-01-01" }, existing).cod,
  "ID deja existent");
check("value: untouched id is not a duplicate of itself",
  core.classifiers.validateValueRow("A1", { cod: "A1", denRo: "X", activDeLa: "2026-01-01" }, existing).cod,
  undefined);
check("value: rename onto an existing id rejected",
  core.classifiers.validateValueRow("A2", { cod: "A1", denRo: "X", activDeLa: "2026-01-01" }, existing).cod,
  "ID deja existent");
check("value: missing denRo rejected",
  core.classifiers.validateValueRow("A1", { cod: "A1", denRo: "  ", activDeLa: "2026-01-01" }, existing).denRo,
  "Denumire RO obligatorie");
check("value: missing activDeLa rejected",
  core.classifiers.validateValueRow("A1", { cod: "A1", denRo: "X", activDeLa: "" }, existing).activDeLa,
  "Activ de la obligatoriu");
check("value: valid row has no errors",
  core.classifiers.validateValueRow("A1", { cod: "A1", denRo: "X", activDeLa: "2026-01-01" }, existing),
  {});

/* Artifact L15966 salveazaTot: two open rows renamed to the same new id both
   pass the store check, since neither is in the store yet. */
const collide = core.classifiers.validateValueBatch({
  A1: { cod: "B9", denRo: "one", activDeLa: "2026-01-01" },
  A2: { cod: "B9", denRo: "two", activDeLa: "2026-01-01" }
}, existing);
check("batch: intra-selection duplicate caught", collide.ok, false);
check("batch: both rows flagged",
  [collide.errors.A1.cod, collide.errors.A2.cod],
  ["ID duplicat în selecția curentă", "ID duplicat în selecția curentă"]);
check("batch: all-or-nothing, one bad row fails the set",
  core.classifiers.validateValueBatch({
    A1: { cod: "OK1", denRo: "fine", activDeLa: "2026-01-01" },
    A2: { cod: "", denRo: "bad", activDeLa: "2026-01-01" }
  }, existing).ok, false);
check("batch: all-good passes",
  core.classifiers.validateValueBatch({
    A1: { cod: "OK1", denRo: "fine", activDeLa: "2026-01-01" }
  }, existing).ok, true);

/* Artifact L16018 valideazaRandCamp. */
const fields = [{ id: "f1", label: "Nivel UAT" }, { id: "f2", label: "Cod raion" }];
check("field: too short rejected",
  core.classifiers.validateFieldRow("__newCamp__", { label: "A" }, fields).label,
  "Denumire prea scurtă");
check("field: duplicate name rejected ignoring case and diacritics",
  core.classifiers.validateFieldRow("__newCamp__", { label: "  nivel   uat " }, fields).label,
  "Există deja un câmp cu această denumire");
check("field: renaming a field does not collide with itself",
  core.classifiers.validateFieldRow("f1", { label: "Nivel UAT" }, fields),
  {});
check("field: distinct name accepted",
  core.classifiers.validateFieldRow("__newCamp__", { label: "Populație" }, fields), {});

/* =================================================================== */
group("BEHAVIOURAL — compartment scoping is configuration");

const server = createMockServer(fixtures);

const admc = server.listClassifiers({ compartment: "admc-clasificatoare", role: "adm-c" });
const adml = server.listClassifiers({ compartment: "adml-clasificatoare", role: "adm-l" });
check("adm-c compartment resolves", admc.status, 200);
check("adm-l compartment resolves", adml.status, 200);

/* Feature 91424 plus Concept v0.2 draft isolation: the local admin sees only
   specific classifiers, and never a draft. */
checkTrue("adm-l sees only specific classifiers",
  adml.body.rows.every((r) => r.scope === "service" || r.scope === "authority"));
checkTrue("adm-l never sees a draft",
  adml.body.rows.every((r) => r.status !== "draft"));
checkTrue("adm-c sees at least as many as adm-l", admc.body.total >= adml.body.total);

/* Their scenario 6: switching instance changes compartments and columns. */
const compsC = server.getCompartments({ role: "adm-c" }).body.compartments;
const compsL = server.getCompartments({ role: "adm-l" }).body.compartments;
check("adm-c compartment ids", compsC.map((c) => c.id), ["admc-clasificatoare"]);
check("adm-l compartment ids", compsL.map((c) => c.id), ["adml-clasificatoare"]);
check("adm-c may create", compsC[0].newAction, "creeazaClas");
check("adm-l may not create", compsL[0].newAction, null);
check("adm-c action set", compsC[0].actions,
  ["sincronizeazaClas", "publicaClas", "arhiveazaClas", "republicaClas", "exportLista"]);
check("adm-l action set is export only", compsL[0].actions, ["exportLista"]);

/* A compartment belongs to a role: asking under the wrong one is a 400. */
check("cross-role compartment access refused",
  server.listClassifiers({ compartment: "adml-clasificatoare", role: "adm-c" }).status, 400);

/* =================================================================== */
group("BEHAVIOURAL — action intersection across a selection");

const intern = real.find((c) => c.sursa === "intern");
const mconnect = real.find((c) => c.sursa === "mconnect");

check("single mconnect row offers sync",
  server.classifierActions({ compartment: "admc-clasificatoare", ids: [mconnect.id] })
    .body.actions.includes("sincronizeazaClas"), true);
check("mixed selection drops sync, which intern rows do not allow",
  server.classifierActions({ compartment: "admc-clasificatoare", ids: [mconnect.id, intern.id] })
    .body.actions.includes("sincronizeazaClas"), false);
check("empty selection offers nothing",
  server.classifierActions({ compartment: "admc-clasificatoare", ids: [] }).body.actions, []);
check("unknown id is a 404",
  server.classifierActions({ compartment: "admc-clasificatoare", ids: ["nope"] }).status, 404);

/* Archived rows report a reason, but are NOT stripped of every action:
   republicaClas is the way back out of archived, and it stays offered. The
   differential block above confirms this matches the artifact exactly.
   blockReason and allowedActions are independent axes: the reason explains an
   empty intersection, it does not itself empty one. */
const archivedFixtures = {
  ...fixtures,
  classifiers: { classifiers: [
    { ...base, id: "arch-1", status: "archived", sursa: "intern" },
    { ...base, id: "arch-2", status: "archived", sursa: "intern" }
  ] }
};
const archServer = createMockServer(archivedFixtures);
const archActions = archServer.classifierActions({ compartment: "admc-clasificatoare", ids: ["arch-1", "arch-2"] }).body;
check("archived still offers the way out",
  archActions.actions.includes("republicaClas"), true);
check("archived offers neither publish nor archive",
  archActions.actions.filter((a) => a === "publicaClas" || a === "arhiveazaClas"), []);
check("archived reasons are distinct, not per-row",
  archActions.blockedReasons, ["clasificator arhivat"]);

/* =================================================================== */
group("BEHAVIOURAL — search and tabs");

const searched = server.listClassifiers({
  compartment: "admc-clasificatoare", role: "adm-c", tab: "globale", search: { q: "caem" }
}).body;
checkTrue("free-text search narrows the set", searched.shown < searched.total);
checkTrue("every hit actually matches",
  searched.rows.every((r) => (r.denumire + " " + r.descriere).toLowerCase().includes("caem")));

const globale = server.listClassifiers({ compartment: "admc-clasificatoare", role: "adm-c", tab: "globale" }).body;
const specifice = server.listClassifiers({ compartment: "admc-clasificatoare", role: "adm-c", tab: "specifice" }).body;
check("tab count matches the rows that tab returns", globale.tabCounts.globale, globale.shown);
check("other tab count also matches", specifice.tabCounts.specifice, specifice.shown);
check("tabs partition the pool",
  globale.tabCounts.globale + specifice.tabCounts.specifice, globale.total);

/* Artifact L16856: most recently edited first. */
const order = globale.rows.map((r) => r.editatLa);
check("sorted by edit date descending",
  order.slice().sort((a, b) => String(b).localeCompare(String(a))), order);

/* =================================================================== */
console.log("\n" + "-".repeat(64));
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) {
    console.log(`  ✗ ${f.name}`);
    console.log(`      expected: ${JSON.stringify(f.expected)}`);
    console.log(`      actual:   ${JSON.stringify(f.actual)}`);
  }
  process.exit(1);
}
console.log(`PASSED — ${passed} assertions, 0 failures`);
