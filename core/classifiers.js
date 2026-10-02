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

  /* ---- lifecycle transitions (Back Office module, 2026-10) ----------------
     Pure: each takes the classifier and returns a NEW object; journal entries
     are returned separately so the caller decides where to store them.
     Rule (doc §5): editing a published classifier opens a draft over the
     published snapshot; "Renunță la ciornă" restores that snapshot. */
  var SNAPSHOT_KEYS = ["valori", "campuriExtra", "parintId", "idFormat", "limitaDenumiri", "denumire", "descriere", "familie", "localAdminManageable", "criticProces", "mapare", "endpoint", "versiune"];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function snapshotOf(c) {
    var snap = {};
    SNAPSHOT_KEYS.forEach(function (k) { if (k in c) snap[k] = clone(c[k]); });
    return snap;
  }
  /* Before the first edit of a published classifier. Draft/archived are returned
     unchanged (a draft keeps its snapshot; archived is read-only — callers must
     check permissions first). */
  function beginDraft(c) {
    if (c.status !== "published") return c;
    var next = clone(c);
    next.publishedSnapshot = snapshotOf(c);
    next.status = "draft";
    return next;
  }
  function bumpVersion(v) {
    var parts = String(v || "0.0").split(".").map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return "1.0";
    parts[1] += 1;
    return parts[0] + "." + parts[1];
  }
  /* the next version a publish produces: a draft over a published version bumps
     that version; a classifier never published (everPublished === false) gets 1.0 */
  function nextVersion(c) {
    if (c.publishedSnapshot) return bumpVersion(c.publishedSnapshot.versiune || c.versiune);
    return c.everPublished === false ? "1.0" : bumpVersion(c.versiune);
  }
  function transition(c, action) {
    var next = clone(c);
    if (action === "publicaClas") {
      next.versiune = nextVersion(c);
      next.status = "published";
      next.publishedSnapshot = null;
      next.everPublished = true;
    } else if (action === "arhiveazaClas") {
      if (c.status === "draft" && c.publishedSnapshot) SNAPSHOT_KEYS.forEach(function (k) { if (k in c.publishedSnapshot) next[k] = clone(c.publishedSnapshot[k]); });
      next.status = "archived";
      next.publishedSnapshot = null;
    } else if (action === "republicaClas") {
      next.status = "published";
    } else if (action === "renuntaClas") {
      if (!c.publishedSnapshot) return null; /* nothing to return to: use the delete path */
      SNAPSHOT_KEYS.forEach(function (k) { if (k in c.publishedSnapshot) next[k] = clone(c.publishedSnapshot[k]); });
      next.status = "published";
      next.publishedSnapshot = null;
    } else {
      throw new Error("unknown transition " + action);
    }
    return next;
  }
  /* what changed since the published snapshot, for the publish confirmation */
  function draftChanges(c) {
    if (!c.publishedSnapshot) return { added: (c.valori || []).length, changed: 0, deactivated: 0, structure: false, first: true };
    var before = {};
    (c.publishedSnapshot.valori || []).forEach(function (v) { before[v.cod] = v; });
    var added = 0, changed = 0, deactivated = 0;
    (c.valori || []).forEach(function (v) {
      var b = before[v.cod];
      if (!b) { added++; return; }
      if (b.activ && !v.activ) deactivated++;
      else if (JSON.stringify(b) !== JSON.stringify(v)) changed++;
    });
    var structure = JSON.stringify(c.publishedSnapshot.campuriExtra || []) !== JSON.stringify(c.campuriExtra || []) || (c.publishedSnapshot.parintId || null) !== (c.parintId || null);
    return { added: added, changed: changed, deactivated: deactivated, structure: structure, first: false };
  }

  /* ---- hierarchy (Clasificator-părinte = live link; Creat din = dead copy) ---- */
  function childrenOf(all, id) { return (all || []).filter(function (x) { return x.parintId === id; }); }
  function ancestorsOf(all, c) {
    var out = [], seen = {}, cur = c;
    while (cur && cur.parintId && !seen[cur.parintId]) {
      seen[cur.parintId] = true;
      cur = (all || []).find(function (x) { return x.id === cur.parintId; });
      if (cur) out.unshift(cur);
    }
    return out;
  }
  function descendantIds(all, id) {
    var out = [];
    childrenOf(all, id).forEach(function (ch) { out.push(ch.id); out = out.concat(descendantIds(all, ch.id)); });
    return out;
  }

  /* Rename a value's code and cascade to children's `parinte` references
     (doc §8). Returns { classifiers, affected } — affected = ids of children
     whose values changed; each of them is moved to draft. */
  function renameValueCode(all, clsId, oldCode, newCode) {
    var affected = [];
    var next = (all || []).map(function (x) {
      if (x.id === clsId) {
        var c = clone(x);
        c.valori = c.valori.map(function (v) { if (v.cod === oldCode) v.cod = newCode; return v; });
        return c;
      }
      if (x.parintId === clsId && (x.valori || []).some(function (v) { return v.parinte === oldCode; })) {
        var ch = beginDraft(x);
        ch = clone(ch);
        ch.valori = ch.valori.map(function (v) { if (v.parinte === oldCode) v.parinte = newCode; return v; });
        affected.push(ch.id);
        return ch;
      }
      return x;
    });
    return { classifiers: next, affected: affected };
  }

  /* ---- MConnect sync (Feature 91423 §Assumptions) ------------------------
     Values absent from the response are deactivated automatically (DIV-C7:
     applied without blocking; the summary comes after). */
  function syncPlan(c, incoming) {
    var cur = {};
    (c.valori || []).forEach(function (v) { cur[v.cod] = v; });
    var seen = {}, added = [], updated = [], deactivated = [];
    (incoming || []).forEach(function (v) {
      seen[v.cod] = true;
      var old = cur[v.cod];
      if (!old) added.push(v.cod);
      else if (old.denRo !== v.denRo || old.denRu !== v.denRu || old.denEn !== v.denEn || (!old.activ && v.activ !== false)) updated.push(v.cod);
    });
    (c.valori || []).forEach(function (v) { if (!seen[v.cod] && v.activ) deactivated.push(v.cod); });
    return { added: added, updated: updated, deactivated: deactivated };
  }
  function applySync(c, incoming, today) {
    var next = clone(c);
    var byCode = {};
    next.valori.forEach(function (v) { byCode[v.cod] = v; });
    var seen = {};
    (incoming || []).forEach(function (v) {
      seen[v.cod] = true;
      var old = byCode[v.cod];
      if (old) { old.denRo = v.denRo; old.denRu = v.denRu || null; old.denEn = v.denEn || null; if (v.activ !== false) { old.activ = true; old.autoInactivat = false; } }
      else next.valori.push({ cod: v.cod, denRo: v.denRo, denRu: v.denRu || null, denEn: v.denEn || null, activ: true, activDeLa: today, activPanaLa: null, parinte: v.parinte || null, extra: v.extra || {}, autoInactivat: false, sursa: "import" });
    });
    next.valori.forEach(function (v) { if (!seen[v.cod] && v.activ) { v.activ = false; v.autoInactivat = true; v.activPanaLa = today; } });
    return next;
  }

  /* ---- CSV import (doc §6: columns beyond the defined fields are named in an
     explicit warning, never silently dropped) ---- */
  function parseCsvLine(line, sep) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(function (x) { return x.trim(); });
  }
  function parseCsv(text, knownFieldIds) {
    var lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return { rows: [], columns: [], unknownColumns: [], missing: ["cod", "denRo"] };
    var sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
    var columns = parseCsvLine(lines[0], sep);
    var known = knownFieldIds || [];
    var unknownColumns = columns.filter(function (c) { return known.indexOf(c) === -1; });
    var missing = ["cod", "denRo"].filter(function (c) { return columns.indexOf(c) === -1; });
    var rows = lines.slice(1).map(function (l) {
      var cells = parseCsvLine(l, sep), row = {};
      columns.forEach(function (col, i) { if (known.indexOf(col) !== -1) row[col] = cells[i] == null ? "" : cells[i]; });
      return row;
    });
    return { rows: rows, columns: columns, unknownColumns: unknownColumns, missing: missing };
  }

  return {
    snapshotOf: snapshotOf,
    beginDraft: beginDraft,
    bumpVersion: bumpVersion,
    nextVersion: nextVersion,
    transition: transition,
    draftChanges: draftChanges,
    childrenOf: childrenOf,
    ancestorsOf: ancestorsOf,
    descendantIds: descendantIds,
    renameValueCode: renameValueCode,
    syncPlan: syncPlan,
    applySync: applySync,
    parseCsv: parseCsv,
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
