/**
 * core/filters.js — compartment scoping, tabs, search and sort.
 *
 * Extracted from LoculDeMuncaV2 (artifact L16810–L16985), where the whole
 * query pipeline lived inside a chain of useMemo calls that closed over
 * component state. Each stage is now a function taking data and returning
 * data, in the same order the memos ran:
 *
 *   compartment filter -> sort -> tab -> search -> counts
 *
 * The artifact expresses compartment and tab filters as JS closures. Here they
 * are declarative predicates, so adding or re-scoping a compartment is
 * configuration rather than a code deploy. See data/ui/compartments.json.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).filters = api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function valueAt(row, field) {
    return field.split(".").reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, row);
  }

  /* ---- predicate interpreter ---------------------------------------
     Grammar: { all: [clause] } | { any: [clause] } | clause
     Clause:  { field, eq|ne|in|nin|gt|lt|contains, value }
     A null or undefined predicate matches everything. */
  function matches(row, predicate) {
    if (!predicate) return true;

    if (Array.isArray(predicate.all)) {
      return predicate.all.every(function (p) { return matches(row, p); });
    }
    if (Array.isArray(predicate.any)) {
      return predicate.any.some(function (p) { return matches(row, p); });
    }

    var actual = valueAt(row, predicate.field);
    if ("eq" in predicate) return actual === predicate.eq;
    if ("ne" in predicate) return actual !== predicate.ne;
    if ("in" in predicate) return predicate.in.indexOf(actual) !== -1;
    if ("nin" in predicate) return predicate.nin.indexOf(actual) === -1;
    if ("gt" in predicate) return actual > predicate.gt;
    if ("lt" in predicate) return actual < predicate.lt;
    if ("contains" in predicate) {
      return Array.isArray(actual)
        ? actual.indexOf(predicate.contains) !== -1
        : String(actual == null ? "" : actual).toLowerCase()
            .indexOf(String(predicate.contains).toLowerCase()) !== -1;
    }
    throw new Error("unrecognised predicate: " + JSON.stringify(predicate));
  }

  /* ---- stage 1: compartment scope ---------------------------------- */
  function applyCompartment(rows, compartment) {
    return rows.filter(function (r) { return matches(r, compartment.filter); });
  }

  /* ---- stage 2: sort -----------------------------------------------
     Artifact L16856: classifiers sort by most recently edited first,
     because administering them is maintenance work, not an alphabetical
     reference lookup. Dates are ISO calendar days, which sort
     lexicographically in chronological order. */
  function sortClassifiers(rows) {
    return rows.slice().sort(function (a, b) {
      return String(b.editatLa).localeCompare(String(a.editatLa));
    });
  }

  /* ---- stage 3: tab ------------------------------------------------
     Artifact L16874 afterTab. Falls back to the first non-divider tab. */
  function applyTab(rows, compartment, activeTabId) {
    var tabs = (compartment.tabs || []).filter(function (t) { return !t.divider; });
    if (!tabs.length) return rows;
    var tab = tabs.filter(function (t) { return t.id === activeTabId; })[0] || tabs[0];
    return rows.filter(function (r) { return matches(r, tab.filter); });
  }

  /* ---- stage 4: search ---------------------------------------------
     Artifact L16909, clasificatoare branch. `q` is the free-text box; the
     remaining keys are the per-field filters from the search panel.
     scopeOf is injected so this module stays free of domain imports. */
  function applySearch(rows, params, deps) {
    var p = params || {};
    var q = String(p.q || "").toLowerCase().trim();
    var scopeOf = (deps || {}).scopeOf;

    return rows.filter(function (c) {
      if (q && [c.denumire, c.descriere].join(" ").toLowerCase().indexOf(q) === -1) return false;
      if (p.clDenumire && String(c.denumire).toLowerCase().indexOf(String(p.clDenumire).toLowerCase()) === -1) return false;
      if (p.clDescriere && String(c.descriere).toLowerCase().indexOf(String(p.clDescriere).toLowerCase()) === -1) return false;
      if (p.clScope) {
        if (!scopeOf) throw new Error("applySearch: clScope filter needs deps.scopeOf");
        if (scopeOf(c) !== p.clScope) return false;
      }
      if (p.clSursa && c.sursa !== p.clSursa) return false;
      if (p.clServiciu && (c.servicii || []).indexOf(p.clServiciu) === -1) return false;
      if (p.clStatus && c.status !== p.clStatus) return false;
      return true;
    });
  }

  /* ---- counts ------------------------------------------------------
     Artifact L16866 tabCounts. Counted against the compartment pool after
     sorting but before the tab and the search, so the number on a tab is
     the number you land on when you click it. */
  function tabCounts(basePool, compartment) {
    var out = {};
    (compartment.tabs || []).forEach(function (t) {
      if (t.divider) return;
      out[t.id] = basePool.filter(function (r) { return matches(r, t.filter); }).length;
    });
    return out;
  }

  /* ---- the whole pipeline in one call ------------------------------ */
  function query(rows, compartment, options) {
    var opts = options || {};
    var scoped = applyCompartment(rows, compartment);
    var basePool = sortClassifiers(scoped);
    var counts = tabCounts(basePool, compartment);
    var afterTab = applyTab(basePool, compartment, opts.activeTab);
    var result = applySearch(afterTab, opts.search, opts.deps);
    return {
      rows: result,
      basePool: basePool,
      tabCounts: counts,
      total: basePool.length,
      shown: result.length
    };
  }

  return {
    matches: matches,
    applyCompartment: applyCompartment,
    sortClassifiers: sortClassifiers,
    applyTab: applyTab,
    applySearch: applySearch,
    tabCounts: tabCounts,
    query: query
  };
});
