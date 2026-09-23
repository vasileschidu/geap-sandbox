/**
 * core/classifiers.js — classifier domain logic.
 *
 * Ported from locul-de-munca-v26.jsx. Behaviour is preserved exactly; only the
 * plumbing changed. Functions that read module-level constants in the artifact
 * now take their data as arguments, so nothing here touches globals, the DOM or
 * React, and every branch is reachable from Node.
 *
 * Origins are cited per function against artifact line numbers.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).classifiers = api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---- scope -------------------------------------------------------
     Artifact L3851 scopeClasificator.
     Only `system` is stored (scopeSystem). The other three derive from
     categorie + servicii.length so perimeter cannot diverge from the data. */
  function scopeOf(c) {
    if (c.scopeSystem) return "system";
    if (c.categorie === "global") return "global";
    return (c.servicii || []).length > 1 ? "authority" : "service";
  }

  /* ---- lifecycle ---------------------------------------------------
     Artifact L3878 clasStatusActions.
     Draft is the only state with two exits (publish / discard). Archive is
     offered from draft ONLY when a published version exists to withdraw:
     you archive something that was once live. */
  function statusActions(c) {
    if (c.status === "draft") {
      var acts = [{ action: "publicaClas", label: "Publică", icon: "send", spre: "published" }];
      if (c.publishedSnapshot) {
        acts.push({ action: "arhiveazaClas", label: "Arhivează", icon: "archive", spre: "archived" });
      }
      /* Label and icon are computed per classifier: see discardMeta. */
      acts.push({ action: "renuntaClas", label: null, icon: null, spre: null });
      return acts;
    }
    if (c.status === "published") {
      return [{ action: "arhiveazaClas", label: "Arhivează", icon: "archive", spre: "archived" }];
    }
    if (c.status === "archived") {
      return [{ action: "republicaClas", label: "Republică", icon: "rotate-ccw", spre: "published" }];
    }
    return [];
  }

  /* Artifact L3893 renuntaClasMeta. Discarding a draft that was never
     published deletes the classifier outright, so it is destructive and
     labelled differently from reverting to a published version. */
  function discardMeta(c) {
    return c.publishedSnapshot
      ? { label: "Renunță la ciornă", icon: "undo", destructive: false }
      : { label: "Șterge ciorna", icon: "trash", destructive: true };
  }

  /* ---- fields ------------------------------------------------------
     Artifact L4033 campuriImpliciteFor. Default value fields cannot be
     removed, only configured (id format, name length limit). */
  function defaultFields(c, fieldTypesCatalog) {
    var defs = fieldTypesCatalog.defaults;
    var idFormat = c.idFormat || defs.idFormat;
    var limita = c.limitaDenumiri || defs.limitaDenumiri;
    return defs.fields.map(function (f) {
      var out = { id: f.id, label: f.label, tip: f.tip, implicit: true };
      if (f.obligatoriu) out.obligatoriu = true;
      if (f.cfgFrom === "idFormat") out.cfg = idFormat;
      else if (f.cfgFrom === "limitaDenumiri") out.cfg = "max. " + limita;
      return out;
    });
  }

  /* Artifact L4624 campuriClas. Defaults, then the classifier's own extra
     fields, then a derived parent reference when it sits in a hierarchy. */
  function fieldsOf(c, fieldTypesCatalog) {
    var base = defaultFields(c, fieldTypesCatalog).concat(c.campuriExtra || []);
    if (c.parintId) {
      base.push({ id: "parinte", label: "Valoare-părinte", tip: "Referință clasificator", derivat: true });
    }
    return base;
  }

  /* ---- name normalisation -----------------------------------------
     Artifact L11971 normDenumire. Diacritic- and case-insensitive compare,
     used to reject duplicate field names. */
  function normName(v) {
    return (v || "")
      .trim().toLowerCase().replace(/\s+/g, " ")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/ș/g, "s").replace(/ț/g, "t").replace(/[ăâ]/g, "a").replace(/î/g, "i");
  }

  /* ---- validation --------------------------------------------------
     Extracted from ClasificatorProfile (artifact L15942, L16018), where it
     was defined inside the component and closed over `clas`. The existing
     rows are now a parameter.

     `cod !== key` covers two cases at once: a new row (key "__new__", so any
     typed code differs) and renaming an existing id (key is the original
     code). If the id was not touched, cod === key and the duplicate check
     does not run. */
  function validateValueRow(key, draft, existingValues) {
    var cod = String(draft.cod || "").trim();
    var denRo = String(draft.denRo || "").trim();
    var errs = {};
    if (!cod) errs.cod = "ID obligatoriu";
    if (cod && cod !== key && (existingValues || []).some(function (x) { return x.cod === cod; })) {
      errs.cod = "ID deja existent";
    }
    if (!denRo) errs.denRo = "Denumire RO obligatorie";
    /* Model_date...xlsx: "Activ de la" is mandatory. */
    if (!draft.activDeLa) errs.activDeLa = "Activ de la obligatoriu";
    return errs;
  }

  /* Artifact L15966 salveazaTot, validation half only.
     All-or-nothing: if any row is invalid nothing saves, and the offending
     row keeps its error. Partial saves would leave the user unsure what
     applied. validateValueRow catches collisions with the store, but two
     rows renamed to the SAME new id both pass it, since neither exists in
     the store yet — so intra-selection collisions are checked separately. */
  function validateValueBatch(edits, existingValues) {
    var errors = {};
    var ok = true;
    var finalCode = {};
    Object.keys(edits).forEach(function (key) {
      finalCode[key] = String(edits[key].cod || "").trim();
    });
    var occurrences = {};
    Object.keys(finalCode).forEach(function (key) {
      var cod = finalCode[key];
      if (cod) occurrences[cod] = (occurrences[cod] || 0) + 1;
    });
    Object.keys(edits).forEach(function (key) {
      var e = validateValueRow(key, edits[key], existingValues);
      if (finalCode[key] && occurrences[finalCode[key]] > 1) {
        e.cod = "ID duplicat în selecția curentă";
      }
      if (Object.keys(e).length) { errors[key] = e; ok = false; }
    });
    return { ok: ok, errors: errors };
  }

  /* Artifact L16018 valideazaRandCamp. */
  function validateFieldRow(key, draft, allFields) {
    var errs = {};
    var label = String(draft.label || "").trim();
    if (label.length < 2) {
      errs.label = "Denumire prea scurtă";
    } else if ((allFields || []).some(function (cf) {
      return cf.id !== key && normName(cf.label) === normName(label);
    })) {
      errs.label = "Există deja un câmp cu această denumire";
    }
    return errs;
  }

  /* Artifact L16026 salveazaTotCamp, validation half only. */
  function validateFieldBatch(edits, allFields) {
    var errors = {};
    var ok = true;
    Object.keys(edits).forEach(function (key) {
      var e = validateFieldRow(key, edits[key], allFields);
      if (Object.keys(e).length) { errors[key] = e; ok = false; }
    });
    return { ok: ok, errors: errors };
  }

  /* ---- derived display data ----------------------------------------
     Artifact L5013 CLAS_CELL.clUtilizat, counting half only. The JSX stays
     in the view; the arithmetic belongs here. */
  function usageOf(c) {
    var modules = (c.consumatori || []).length;
    var objects = (c.consumatori || []).reduce(function (n, m) {
      return n + (m.obiecte || []).length;
    }, 0);
    return { modules: modules, objects: objects, unused: modules === 0 };
  }

  return {
    scopeOf: scopeOf,
    statusActions: statusActions,
    discardMeta: discardMeta,
    defaultFields: defaultFields,
    fieldsOf: fieldsOf,
    normName: normName,
    validateValueRow: validateValueRow,
    validateValueBatch: validateValueBatch,
    validateFieldRow: validateFieldRow,
    validateFieldBatch: validateFieldBatch,
    usageOf: usageOf
  };
});
