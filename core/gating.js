/**
 * core/gating.js — which actions are offered, and why they are withheld.
 *
 * The list view computes actions across a MULTI-ROW selection: the offered
 * set is the intersection of what every selected row permits, and the reasons
 * are the distinct explanations across the selection. That is a collection
 * level question, which is why it lives here rather than on a single record.
 */
(function (root, factory) {
  var isNode = typeof module === "object" && module.exports;
  var dep = isNode ? require("./classifiers.js") : (root.GEAP || {}).classifiers;
  if (!dep) throw new Error("core/gating.js requires core/classifiers.js to be loaded first");
  var api = factory(dep);
  if (isNode) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).gating = api);
})(typeof self !== "undefined" ? self : this, function (classifiers) {
  "use strict";

  /* Artifact L5059 allowedForClasificator.
     "renuntaClas" is a placeholder: the real action id depends on whether
     this classifier has a published snapshot to revert to, or whether the
     draft would be deleted outright. */
  function allowedForClassifier(c) {
    var out = ["exportLista"];
    if (c.sursa !== "intern") out.push("sincronizeazaClas");
    classifiers.statusActions(c).forEach(function (a) {
      out.push(
        a.action === "renuntaClas"
          ? (c.publishedSnapshot ? "renuntaClas" : "radiereClasCiorna")
          : a.action
      );
    });
    return out;
  }

  /* Artifact L5070 blockReasonClasificator. */
  function blockReasonClassifier(c) {
    if (c.status === "archived") return "clasificator arhivat";
    return null;
  }

  /* Artifact L16990 effActions, classifier branch.
     Intersection across the selection: an action survives only if every
     selected row allows it. An empty selection offers nothing. */
  function effectiveActions(compartmentActions, selectedRows) {
    if (!selectedRows || !selectedRows.length) return [];
    return (compartmentActions || []).filter(function (action) {
      return selectedRows.every(function (row) {
        return allowedForClassifier(row).indexOf(action) !== -1;
      });
    });
  }

  /* Artifact L16997 blockedReasons. Distinct reasons across the selection,
     so the user is told why the intersection came out empty. */
  function blockedReasons(selectedRows) {
    if (!selectedRows || !selectedRows.length) return [];
    var set = {};
    selectedRows.forEach(function (row) {
      var reason = blockReasonClassifier(row);
      if (reason) set[reason] = true;
    });
    return Object.keys(set);
  }

  return {
    allowedForClassifier: allowedForClassifier,
    blockReasonClassifier: blockReasonClassifier,
    effectiveActions: effectiveActions,
    blockedReasons: blockedReasons
  };
});
