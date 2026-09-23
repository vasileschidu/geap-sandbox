/**
 * core/permissions.js — who may do what.
 * Ported from locul-de-munca-v26.jsx. Pure: data in, answer out.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).permissions = api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Artifact L4636 poateEditaClas.
     Feature 91424 grants write access by perimeter. Concept v0.2 adds a
     per-classifier gate, localAdminManageable, set by the central admin.
     Both apply. An archived classifier is editable by nobody regardless of
     role: archiving is a terminus, not a perimeter restriction. */
  function canEditClassifier(c, roleId) {
    if (c.status === "archived") return false;
    if (roleId === "adm-c") return true;
    if (c.categorie !== "specific") return false;
    return c.localAdminManageable === true;
  }

  /* Artifact L4642 poateEditaStructuraClas.
     Structure means the field definitions, not the values. Central only. */
  function canEditStructure(roleId) {
    return roleId === "adm-c";
  }

  return {
    canEditClassifier: canEditClassifier,
    canEditStructure: canEditStructure
  };
});
