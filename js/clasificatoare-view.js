/**
 * js/clasificatoare-view.js — the Classifiers screen.
 *
 * Presentation only. Every rule it applies comes from core/ via api/client.js;
 * this file decides nothing about scope, permissions or which actions are
 * offered. If a behaviour looks wrong, the bug is in core/, and the parity
 * tests in test/ will show it.
 *
 * All markup uses existing library components from css/main.css. Nothing is
 * copied from the artifact, whose lucide icons and utility classes have no
 * local equivalent.
 */
(function () {
  "use strict";

  var R = window.GEAP.render;
  var esc = R.esc;

  /* ---- tone mapping -------------------------------------------------
     The artifact's palette has eight tones; the local .status-tag has
     seven, and they are not the same seven. `teal` and `violet` have no
     local equivalent and are mapped to the nearest available.
     This needs a design decision, not a code one. Flagged, not resolved. */
  var TONE = {
    neutral: "neutral",
    info: "info",
    ok: "success",
    crit: "danger",
    teal: "accent",     /* approximation */
    violet: "brand",    /* approximation */
    warn: "accent",     /* .status-tag has no warning tone */
    high: "brand"       /* approximation */
  };
  function tagClass(tone, strength) {
    return "status-tag status-tag--" + (TONE[tone] || "neutral") + " " + (strength || "is-subtle");
  }

  var LUNI = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];
  /* Artifact fmtDateFull (L3903). Dates arrive as ISO calendar days. */
  function fmtDate(iso) {
    if (!iso) return "—";
    var p = String(iso).split("-");
    if (p.length !== 3) return esc(iso);
    return Number(p[2]) + " " + LUNI[Number(p[1]) - 1] + " " + p[0];
  }

  var client = window.GEAP.client.createClient();
  var store = R.createStore({
    role: "adm-c",
    compartment: null,
    compartments: [],
    catalog: null,
    tab: null,
    search: "",
    rows: [],
    tabCounts: {},
    total: 0,
    shown: 0,
    selected: [],
    actions: [],
    blockedReasons: [],
    loading: true,
    error: null
  });

  var root = document.querySelector("[data-clas-root]");
  var overlay = document.querySelector("[data-clas-modal-overlay]");
  var modalBody = document.querySelector("[data-clas-modal-body]");

  /* ================= column renderers =================
     Ported from CLAS_CELL (artifact L4992). The arithmetic moved to
     core/classifiers.js usageOf(); what remains here is markup. */
  var COLUMN = {
    clDenumire: function (row, cat) {
      var fam = cat.families[row.familie];
      var parent = row.parintId ? findRow(row.parintId) : null;
      return '<div class="cell__primary">' + esc(row.denumire) + "</div>" +
        /* Family is informative taxonomy, shown only for external sources. */
        (row.familie !== "intern" && fam
          ? ' <span class="' + tagClass(fam.tone) + ' status-tag--small">' + esc(fam.label) + "</span>"
          : "") +
        (parent
          ? '<div class="cell__secondary">subordonat „' + esc(parent.denumire) + "”</div>"
          : "");
    },
    clScope: function (row, cat) {
      var s = cat.scopes[row.scope];
      var detail = "";
      if (row.scope === "authority" || row.scope === "service") {
        detail = (row.servicii.length === 1 ? row.servicii[0] : row.servicii.length + " servicii");
      }
      return '<span class="' + tagClass(s.tone) + '">' + esc(s.label) + "</span>" +
        (detail ? '<div class="cell__secondary">' + esc(detail) + "</div>" : "");
    },
    clSursa: function (row, cat) {
      var s = cat.sources[row.sursa];
      return '<span class="cell__text">' + esc(s ? s.label : row.sursa) + "</span>";
    },
    clUtilizat: function (row) {
      if (row.usage.unused) return '<span class="cell__empty">neutilizat încă</span>';
      return '<span class="cell__text">' + row.usage.objects + " utilizări · " +
        row.usage.modules + " module</span>";
    },
    clVersiune: function (row) {
      return '<span class="cell__code">' + esc(row.versiune) + "</span>";
    },
    clEditatLa: function (row) {
      return '<span class="cell__code">' + fmtDate(row.editatLa) + "</span>";
    },
    clStatus: function (row, cat) {
      var s = cat.statuses[row.status];
      return '<span class="' + tagClass(s.tone, "is-strong") + '">' + esc(s.label) + "</span>";
    }
  };

  function findRow(id) {
    return store.get().rows.filter(function (r) { return r.id === id; })[0] || null;
  }

  /* ================= render ================= */
  function view(s) {
    if (s.error) {
      return '<div class="message message--error message--banner" role="alert">' +
        '<div class="message__content"><div class="message__text">' + esc(s.error) + "</div></div></div>";
    }
    if (s.loading || !s.catalog || !s.compartment) {
      return '<div class="clas-page__empty"><span class="spinner spinner--medium spinner--brand"></span></div>';
    }

    var comp = s.compartment;
    var cat = s.catalog;

    return (
      '<header class="clas-page__header">' +
        '<div class="clas-page__title-row">' +
          "<div>" +
            "<h1>" + esc(comp.label) + "</h1>" +
            '<p class="clas-page__hint">' + esc(comp.hint) + "</p>" +
          "</div>" +
          '<div class="btn-group btn-group--inline">' + roleSwitch(s) + "</div>" +
        "</div>" +
      "</header>" +

      (comp.tabs && comp.tabs.length ? tabs(s) : "") +

      '<div class="clas-page__toolbar">' +
        '<div class="search-input rectangular' + (s.search ? " has-value" : "") + '">' +
          '<span class="p-2 radius-8 d-inline-flex icon-search">' +
            '<svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>' +
          "</span>" +
          '<input type="text" class="input" placeholder="Caută după denumire sau descriere"' +
            ' value="' + esc(s.search) + '" data-clas-search data-focus-key="search" />' +
        "</div>" +
        (comp.newAction
          ? '<button type="button" class="btn btn-primary btn-md" data-clas-new>Adaugă clasificator</button>'
          : "") +
      "</div>" +

      '<div class="clas-page__surface">' +
        (s.selected.length ? actionBar(s) : "") +
        '<div class="clas-page__scroller" data-scroll-key="table">' +
          (s.rows.length ? table(s, cat) : emptyState()) +
        "</div>" +
        '<div class="clas-page__footer">' + s.shown + " din " + s.total + " afișate</div>" +
      "</div>"
    );
  }

  function roleSwitch(s) {
    return ["adm-c", "adm-l"].map(function (r) {
      var on = s.role === r;
      return '<button type="button" class="btn ' + (on ? "btn-neutral" : "btn-outline-neutral") +
        ' btn-sm" data-clas-role="' + r + '"' + (on ? ' aria-pressed="true"' : "") + ">" +
        (r === "adm-c" ? "Administrator central" : "Administrator local") + "</button>";
    }).join("");
  }

  function tabs(s) {
    return '<div class="tabs"><div class="tab-buttons" role="tablist">' +
      s.compartment.tabs.map(function (t) {
        var on = s.tab === t.id;
        var count = s.tabCounts[t.id];
        return '<button type="button" class="tab-button' + (on ? " active" : "") + '"' +
          ' role="tab" aria-selected="' + (on ? "true" : "false") + '" data-clas-tab="' + esc(t.id) + '">' +
          esc(t.label) +
          (typeof count === "number"
            ? ' <span class="badge badge--subtle-neutral badge--sm">' + count + "</span>"
            : "") +
          "</button>";
      }).join("") +
      "</div></div>";
  }

  /* The offered set is the intersection across the selection, computed by
     the server. When it is empty the distinct reasons explain why. */
  function actionBar(s) {
    var labels = {
      exportLista: "Exportă lista",
      sincronizeazaClas: "Sincronizează",
      publicaClas: "Publică",
      arhiveazaClas: "Arhivează",
      republicaClas: "Republică"
    };
    return '<div class="clas-page__actionbar">' +
      '<span class="badge badge--solid-neutral badge--md">' + s.selected.length + " selectate</span>" +
      s.actions.map(function (a) {
        return '<button type="button" class="btn btn-outline-neutral btn-sm" data-clas-action="' + esc(a) + '">' +
          esc(labels[a] || a) + "</button>";
      }).join("") +
      (!s.actions.length && s.blockedReasons.length
        ? '<span class="clas-page__actionbar-reasons">Nicio acțiune comună: ' +
            esc(s.blockedReasons.join(", ")) + "</span>"
        : "") +
      '<button type="button" class="btn btn-text-neutral btn-sm" data-clas-clear>Deselectează</button>' +
      "</div>";
  }

  function emptyState() {
    return '<div class="clas-page__empty">Niciun clasificator pentru filtrul curent.</div>';
  }

  function table(s, cat) {
    var cols = s.compartment.columns;
    var allOn = s.rows.length > 0 && s.selected.length === s.rows.length;

    return '<table class="table table--default"><thead><tr class="table__row">' +
      '<th class="table__head-cell" style="width:44px">' +
        '<label class="checkbox checkbox--small"><input type="checkbox" class="checkbox-input"' +
        (allOn ? " checked" : "") + ' data-clas-select-all aria-label="Selectează tot" />' +
        '<span class="checkbox-custom"></span></label>' +
      "</th>" +
      cols.map(function (key) {
        var c = cat.columns[key];
        return '<th class="table__head-cell" style="width:' + c.w + 'px">' + esc(c.label) + "</th>";
      }).join("") +
      "</tr></thead><tbody>" +
      s.rows.map(function (row) {
        var on = s.selected.indexOf(row.id) !== -1;
        return '<tr class="table__row' + (on ? " is-selected" : "") + '" data-clas-row="' + esc(row.id) + '">' +
          '<td class="table__body-cell">' +
            '<label class="checkbox checkbox--small"><input type="checkbox" class="checkbox-input"' +
            (on ? " checked" : "") + ' data-clas-select="' + esc(row.id) + '"' +
            ' aria-label="Selectează ' + esc(row.denumire) + '" />' +
            '<span class="checkbox-custom"></span></label>' +
          "</td>" +
          cols.map(function (key) {
            return '<td class="table__body-cell">' + COLUMN[key](row, cat) + "</td>";
          }).join("") +
          "</tr>";
      }).join("") +
      "</tbody></table>";
  }

  /* ================= detail dialog ================= */
  function detailView(d, cat) {
    var c = d.classifier;
    var scope = cat.scopes[d.scope];
    var status = cat.statuses[c.status];

    var actions = d.statusActions.map(function (a) {
      /* renuntaClas carries no label of its own: it depends on whether a
         published version exists to revert to. core supplies the real one. */
      var meta = a.action === "renuntaClas" ? d.discardMeta : a;
      var variant = (meta.destructive ? "btn-destructive" : "btn-outline-neutral");
      return '<button type="button" class="btn ' + variant + ' btn-sm"' +
        (d.canEdit ? "" : " disabled") + ">" + esc(meta.label) + "</button>";
    }).join("");

    return '<div class="modal--header"><h2 class="modal--header-title" id="clas-detail-title">' +
        esc(c.denumire) + "</h2></div>" +
      '<div class="modal-content">' +
        '<p class="modal-text">' + esc(c.descriere) + "</p>" +
        '<div class="clas-detail__meta">' +
          '<span class="' + tagClass(status.tone, "is-strong") + '">' + esc(status.label) + "</span>" +
          '<span class="' + tagClass(scope.tone) + '">' + esc(scope.label) + "</span>" +
          '<span class="cell__text">Versiunea ' + esc(c.versiune) + "</span>" +
          '<span class="cell__text">' + fmtDate(c.editatLa) + " · " + esc(c.editatDe) + "</span>" +
        "</div>" +

        '<div class="clas-detail__section">' +
          '<div class="clas-detail__section-title">Câmpuri (' + d.fields.length + ")</div>" +
          '<table class="table table--subtle"><thead><tr class="table__row">' +
            '<th class="table__head-cell">Denumire</th><th class="table__head-cell">Tip</th>' +
            '<th class="table__head-cell">Configurare</th><th class="table__head-cell">Obligatoriu</th>' +
          "</tr></thead><tbody>" +
          d.fields.map(function (f) {
            return '<tr class="table__row"><td class="table__body-cell">' + esc(f.label) + "</td>" +
              '<td class="table__body-cell">' + esc(f.tip) + "</td>" +
              '<td class="table__body-cell">' + esc(f.cfg || "—") + "</td>" +
              '<td class="table__body-cell">' + (f.obligatoriu ? "Da" : "—") + "</td></tr>";
          }).join("") +
          "</tbody></table>" +
        "</div>" +

        '<div class="clas-detail__section">' +
          '<div class="clas-detail__section-title">Acțiuni de status</div>' +
          (d.blockReason
            ? '<div class="message message--inline message--warning message--small"><div class="message__content">' +
              '<div class="message__text">Blocat: ' + esc(d.blockReason) + "</div></div></div>"
            : "") +
          '<div class="clas-detail__actions">' + (actions || "<span class=\"cell__empty\">Nicio tranziție disponibilă</span>") + "</div>" +
          (d.canEdit ? "" :
            '<p class="clas-page__hint">Rolul curent nu poate edita acest clasificator.</p>') +
        "</div>" +
      "</div>";
  }

  /* ================= data flow ================= */
  function refresh() {
    var s = store.get();
    if (!s.compartment) return Promise.resolve();
    return client.listClassifiers({
      compartment: s.compartment.id,
      role: s.role,
      tab: s.tab,
      search: { q: s.search }
    }).then(function (res) {
      store.set({
        rows: res.rows,
        tabCounts: res.tabCounts,
        total: res.total,
        shown: res.shown,
        /* Drop selections for rows that are no longer visible. */
        selected: s.selected.filter(function (id) {
          return res.rows.some(function (r) { return r.id === id; });
        })
      });
      return syncActions();
    }).catch(fail);
  }

  function syncActions() {
    var s = store.get();
    if (!s.selected.length) {
      store.set({ actions: [], blockedReasons: [] });
      return Promise.resolve();
    }
    return client.classifierActions({
      compartment: s.compartment.id,
      ids: s.selected
    }).then(function (res) {
      store.set({ actions: res.actions, blockedReasons: res.blockedReasons });
    }).catch(fail);
  }

  function setRole(role) {
    store.set({ role: role, loading: true, selected: [] });
    return client.getCompartments({ role: role }).then(function (res) {
      var comp = res.compartments[0];
      if (!comp) {
        store.set({ loading: false, error: "Niciun compartiment pentru rolul " + role });
        return;
      }
      var firstTab = (comp.tabs || []).filter(function (t) { return !t.divider; })[0];
      store.set({
        compartment: comp,
        tab: firstTab ? firstTab.id : null,
        loading: false
      });
      return refresh();
    }).catch(fail);
  }

  function fail(err) {
    store.set({ loading: false, error: err && err.message ? err.message : String(err) });
  }

  /* ================= events ================= */
  var searchTimer = null;

  R.delegate(root, "click", "data-clas-role", function (e, el, role) {
    if (role !== store.get().role) setRole(role);
  });

  R.delegate(root, "click", "data-clas-tab", function (e, el, tab) {
    store.set({ tab: tab, selected: [] });
    refresh();
  });

  R.delegate(root, "input", "data-clas-search", function (e, el) {
    store.set({ search: el.value });
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(refresh, 120);
  });

  R.delegate(root, "change", "data-clas-select", function (e, el, id) {
    var sel = store.get().selected.slice();
    var i = sel.indexOf(id);
    if (i === -1) sel.push(id); else sel.splice(i, 1);
    store.set({ selected: sel });
    syncActions();
  });

  R.delegate(root, "change", "data-clas-select-all", function (e, el) {
    var s = store.get();
    store.set({ selected: el.checked ? s.rows.map(function (r) { return r.id; }) : [] });
    syncActions();
  });

  R.delegate(root, "click", "data-clas-clear", function () {
    store.set({ selected: [], actions: [], blockedReasons: [] });
  });

  /* Row opens the detail, except when the click was the checkbox. */
  R.delegate(root, "click", "data-clas-row", function (e, el, id) {
    if (e.target.closest("[data-clas-select]") || e.target.closest(".checkbox")) return;
    openDetail(id);
  });

  function openDetail(id) {
    var s = store.get();
    client.getClassifier(id, { role: s.role }).then(function (d) {
      R.render(modalBody, detailView(d, s.catalog));
      overlay.classList.add("is-active");
    }).catch(fail);
  }

  function closeDetail() { overlay.classList.remove("is-active"); }

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay || e.target.closest("[data-clas-modal-close]")) closeDetail();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDetail();
  });

  /* ================= boot ================= */
  store.subscribe(function (s) { R.render(root, view(s)); });

  client.getCatalog()
    .then(function (cat) { store.set({ catalog: cat }); return setRole("adm-c"); })
    .catch(fail);
})();
