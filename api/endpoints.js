/**
 * api/endpoints.js — the endpoint contract for the Classifiers slice.
 *
 * One place that names every route, so the client, the mock server and a
 * future real backend cannot drift on paths or parameter names.
 *
 * Note on /actions: the artifact computes actions across a MULTI-ROW
 * selection, intersecting what every selected row allows. A per-record
 * endpoint alone cannot render the action bar, so the batch route takes a
 * set of ids and returns the intersection plus the distinct blocking reasons.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).endpoints = api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ENDPOINTS = {
    listClassifiers:    { method: "GET",  path: "/api/classifiers" },
    getClassifier:      { method: "GET",  path: "/api/classifiers/:id" },
    classifierActions:  { method: "POST", path: "/api/classifiers/actions" },
    getCatalog:         { method: "GET",  path: "/api/catalog/classifiers" },
    getCompartments:    { method: "GET",  path: "/api/ui/compartments" }
  };

  /* Fixture files the mock server reads. A real backend replaces this map
     with its own persistence; nothing else in the slice changes. */
  var FIXTURES = {
    classifiers: "data/classifiers/classifiers.json",
    families:    "data/catalog/clas-families.json",
    sources:     "data/catalog/clas-sources.json",
    modes:       "data/catalog/clas-modes.json",
    scopes:      "data/catalog/clas-scopes.json",
    statuses:    "data/catalog/clas-statuses.json",
    fieldTypes:  "data/catalog/clas-field-types.json",
    columns:     "data/ui/columns.json",
    compartments:"data/ui/compartments.json"
  };

  function fill(path, params) {
    return path.replace(/:([a-zA-Z]+)/g, function (_, key) {
      if (!(key in (params || {}))) throw new Error("missing path parameter: " + key);
      return encodeURIComponent(params[key]);
    });
  }

  return { ENDPOINTS: ENDPOINTS, FIXTURES: FIXTURES, fill: fill };
});
