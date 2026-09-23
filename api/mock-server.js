/**
 * api/mock-server.js — in-process stand-in for the backend.
 *
 * It imports the SAME core/ modules the view uses. That is deliberate: the
 * gating rules must hold on the server, and having the mock reimplement them
 * would create exactly the drift the two-implementation problem describes.
 * When a real backend arrives it must call the same modules, or port them
 * once and hold them to the parity tests.
 *
 * Pure: takes already-loaded fixtures, returns plain objects. It does no I/O,
 * so the tests can drive it directly under Node.
 */
(function (root, factory) {
  var isNode = typeof module === "object" && module.exports;
  var deps = isNode
    ? {
        classifiers: require("../core/classifiers.js"),
        permissions: require("../core/permissions.js"),
        gating: require("../core/gating.js"),
        filters: require("../core/filters.js")
      }
    : {
        classifiers: (root.GEAP || {}).classifiers,
        permissions: (root.GEAP || {}).permissions,
        gating: (root.GEAP || {}).gating,
        filters: (root.GEAP || {}).filters
      };
  Object.keys(deps).forEach(function (k) {
    if (!deps[k]) throw new Error("api/mock-server.js requires core/" + k + ".js to be loaded first");
  });
  var api = factory(deps);
  if (isNode) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).mockServer = api);
})(typeof self !== "undefined" ? self : this, function (core) {
  "use strict";

  function ok(body) { return { status: 200, body: body }; }
  function notFound(what) { return { status: 404, body: { error: what + " not found" } }; }
  function badRequest(msg) { return { status: 400, body: { error: msg } }; }

  function createMockServer(fixtures) {
    var all = fixtures.classifiers.classifiers;

    function compartmentById(id) {
      return fixtures.compartments.compartments.filter(function (c) { return c.id === id; })[0] || null;
    }

    /* GET /api/classifiers
       Runs the full pipeline server-side and returns rows already scoped,
       sorted, tabbed and searched, plus the counts the tabs need. */
    function listClassifiers(query) {
      var q = query || {};
      var compartment = compartmentById(q.compartment);
      if (!compartment) return notFound("compartment " + q.compartment);

      /* A compartment belongs to a role. Asking for one under another role
         is a scope violation, not an empty result. */
      if (q.role && compartment.role !== q.role) {
        return badRequest("compartment " + compartment.id + " is not available to role " + q.role);
      }

      var result = core.filters.query(all, compartment, {
        activeTab: q.tab,
        search: q.search,
        deps: { scopeOf: core.classifiers.scopeOf }
      });

      return ok({
        rows: result.rows.map(function (c) {
          return {
            id: c.id,
            denumire: c.denumire,
            descriere: c.descriere,
            familie: c.familie,
            categorie: c.categorie,
            servicii: c.servicii,
            autoritate: c.autoritate,
            status: c.status,
            sursa: c.sursa,
            mod: c.mod,
            versiune: c.versiune,
            editatLa: c.editatLa,
            editatDe: c.editatDe,
            nrValori: c.nrValori,
            parintId: c.parintId,
            /* Derived server-side so the view never recomputes perimeter. */
            scope: core.classifiers.scopeOf(c),
            usage: core.classifiers.usageOf(c),
            allowedActions: core.gating.allowedForClassifier(c),
            blockReason: core.gating.blockReasonClassifier(c)
          };
        }),
        tabCounts: result.tabCounts,
        total: result.total,
        shown: result.shown
      });
    }

    /* GET /api/classifiers/:id */
    function getClassifier(id, query) {
      var c = all.filter(function (x) { return x.id === id; })[0];
      if (!c) return notFound("classifier " + id);
      var role = (query || {}).role || "adm-c";
      return ok({
        classifier: c,
        scope: core.classifiers.scopeOf(c),
        usage: core.classifiers.usageOf(c),
        fields: core.classifiers.fieldsOf(c, fixtures.fieldTypes),
        statusActions: core.classifiers.statusActions(c),
        discardMeta: core.classifiers.discardMeta(c),
        allowedActions: core.gating.allowedForClassifier(c),
        blockReason: core.gating.blockReasonClassifier(c),
        canEdit: core.permissions.canEditClassifier(c, role),
        canEditStructure: core.permissions.canEditStructure(role)
      });
    }

    /* POST /api/classifiers/actions
       Body: { ids: [], compartment }
       Returns the intersection across the selection, and why it is empty. */
    function classifierActions(body) {
      var b = body || {};
      var compartment = compartmentById(b.compartment);
      if (!compartment) return notFound("compartment " + b.compartment);

      var byId = {};
      all.forEach(function (c) { byId[c.id] = c; });
      var missing = (b.ids || []).filter(function (id) { return !byId[id]; });
      if (missing.length) return notFound("classifier " + missing.join(", "));

      var selected = (b.ids || []).map(function (id) { return byId[id]; });
      return ok({
        actions: core.gating.effectiveActions(compartment.actions, selected),
        blockedReasons: core.gating.blockedReasons(selected),
        selectedCount: selected.length
      });
    }

    function getCatalog() {
      return ok({
        families:   fixtures.families.families,
        sources:    fixtures.sources.sources,
        modes:      fixtures.modes.modes,
        scopes:     fixtures.scopes.scopes,
        statuses:   fixtures.statuses.statuses,
        fieldTypes: fixtures.fieldTypes,
        columns:    fixtures.columns.clasificatoare
      });
    }

    function getCompartments(query) {
      var role = (query || {}).role;
      var list = fixtures.compartments.compartments.filter(function (c) {
        return !role || c.role === role;
      });
      return ok({ compartments: list });
    }

    return {
      listClassifiers: listClassifiers,
      getClassifier: getClassifier,
      classifierActions: classifierActions,
      getCatalog: getCatalog,
      getCompartments: getCompartments
    };
  }

  return { createMockServer: createMockServer };
});
