/* =====================================================================================
   Registre — the register builder in the AdminPortal, phase 2 (registre-v2, 2026-10-24)
   Feature 94523 „Constructor de registre interne GEAP”: US-146 (91178) creare · US-147 (91179) lista · US-148 (91180)
   editare · US-149 (91181) configurare: coloane, filtru predefinit, acțiuni · US-150 (91182) publicare + istoric
   versiuni · US-193 (94528) depreciere / reactivare · US-215 (94817) acordare / retragere acces. Specs (plain copies,
   never edit Azure): tools/persona-test/specs/registre/.

   Data: the builder CATALOG of js/registre.js (GEAPRegistre.catalog / commit) — one record per register; publishing
   writes the SAME definition phase 1 renders, so the BO registers follow at once. No new component — every piece is
   an existing pattern:
     · list = the BO registry engine (`window.GEAPShellRegistries["registre-admin"]`): perimeter tabs with counts,
       search, facet filter, sortable Denumire / Poziție / Coloane, CSV export dialog, „Adaugă registru”;
     · profile = the shared profile panel (page header, actions right, tabs Informații · Coloane · Acces);
     · „Registru nou” / „Editează registrul” / „Acordă acces” / „Istoric versiuni” = the ONE drawer;
     · „Configurează registrul” = the full-screen template sheet (`.e-permits-ntpl-sheet`) with the dtpl „Câmpuri
       disponibile” panel, stacked lists with order handle + ↑ ↓, the Documente rule builder markup and the Setări
       sticky save bar (`.e-permits-cfg2__bar`) whose „● N modificări nesalvate” opens the shared review modal;
     · publish / version / restore = the library dialog (#case-action-modal); deprecate / reactivate / revoke =
       askConfirm.
   Routes: #registre-config (list, nav item „Registre” in „Administrare”) · #registru-config/<id>/<tab>.
   Demo switches: ?fara=publicare,istoric,restaurare,exportversiune,acces,creare,editare,depreciere (permissions off).
   ===================================================================================== */
(function () {
  "use strict";

  const G = () => window.GEAPRegistre || {};
  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const R = () => window.GEAPFormRender || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || esc(label);
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const KIND = "registre-admin";
  const NAV = "registre-config";
  const DENIED = "Nu aveți permisiunea de a accesa această pagină.";
  const MAX_ACTIONS = 12;
  const plural = (n, one, many) => G().plural?.(n, one, many) || `${n} ${n === 1 ? one : many}`;
  const stamp = (v) => G().stamp?.(v) || String(v || "");
  const longDate = (v) => G().longDate?.(v) || String(v || "");
  const nowIso = () => G().nowIso?.() || new Date().toISOString().slice(0, 19);
  const userName = () => G().userName?.() || "Anastasia Cojocaru";
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

  /* ---------------------------------------------------------------- who + what */
  const who = () => G().persona?.() || { roleId: "", all: false };
  const perms = () => G().adminPerms?.(who()) || new Set();
  const can = (p) => perms().has(p);
  const data = () => G().data?.() || null;
  const records = () => (G().catalog?.()?.records || []).filter((rec) => G().adminSees?.(rec, who()));
  const recordOf = (id) => G().recordOf?.(id) || null;
  const objectLabel = (o) => G().objects?.[o]?.label || o;
  const scopeLabel = (s) => G().scopes?.[s]?.label || s;
  const authorityName = (code) => (data()?.authorities || []).find((a) => a.code === code)?.name || code || "";
  const serviceOf = (code) => G().serviceOf?.(code) || null;
  /* „Autoritate sau serviciu” (US-147 AC-05) */
  const placeOf = (rec) => (rec.scope === "Service" ? serviceOf(rec.service)?.name || rec.service || "" : rec.scope === "Authority" ? rec.authority || "" : "");
  const placeLong = (rec) => (rec.scope === "Service" ? `${serviceOf(rec.service)?.name || rec.service} · ${rec.authority}` : rec.scope === "Authority" ? authorityName(rec.authority) : "Toate autoritățile");
  const STATUS_TONE = { "Schiță": "neutral", "Publicat": "success", "Depreciat": "warning" };
  const statusTag = (rec) => tag(rec.status, STATUS_TONE[rec.status] || "neutral");
  const TYPES = [["open", "Deschide înregistrarea"], ["form", "Completează un formular"], ["process-start", "Pornește procesul"], ["process-advance", "Avansează procesul"], ["custom", "Control personalizat"]];
  const typeLabel = (t) => TYPES.find(([k]) => k === t)?.[1] || t;
  /* AC-19: on Acte permisive only the process / control types */
  const typesFor = (object) => (object === "Permit" ? TYPES.filter(([k]) => !["open", "form"].includes(k)) : TYPES);
  const FILTERS = [["text", "Text"], ["single", "Alegere unică"], ["multi", "Alegere multiplă"], ["date", "Interval de date"]];
  const filterLabel = (f) => FILTERS.find(([k]) => k === f)?.[1] || "";
  const OPS = [["contains", "conține"], ["is", "este"], ["isNot", "nu este"], ["empty", "este gol"], ["notEmpty", "are valoare"]];
  const opLabel = (o) => OPS.find(([k]) => k === o)?.[1] || o;
  const NO_VALUE = ["empty", "notEmpty"];
  const ALIGN = [["left", "Stânga"], ["center", "Centru"], ["right", "Dreapta"]];
  const roles = () => data()?.admin?.roles || [];
  const roleLabel = (id) => roles().find((r) => r.id === id)?.label || id;
  const targetsOf = (type, object) => {
    const t = data()?.admin?.targets || {};
    if (type === "form") return (t.forms || []).map((x) => [x.id, x.label]);
    if (/^process/.test(type)) return (t.processes || []).map((x) => [x.id, `${x.label} · ${x.version}`]);
    if (type === "custom") return (t.controls || []).filter((x) => !x.objects || x.objects.includes(object)).map((x) => [x.id, x.label]);
    return [];
  };
  const targetLabel = (a) => (a.type === "open" ? "Fișa înregistrării" : G().targetLabel?.({ target: a.target }) || a.target || "—");
  const TARGET_NAME = { form: "Formularul", "process-start": "Procesul", "process-advance": "Procesul", custom: "Controlul" };
  const fieldsOf = (rec) => G().fieldsOf?.(rec.object, rec.scope === "Service" ? rec.service : null) || [];
  const fieldOf = (rec, key) => fieldsOf(rec).find((f) => f.key === key) || null;
  const bump = (v) => { const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(v || ""); return m ? `v${m[1]}.${Number(m[2]) + 1}.0` : "v1.0.0"; };
  const nextVersion = (rec) => (rec.publishedVersion ? bump(rec.publishedVersion) : rec.version || "v1.0.0");
  /* the audit trail of an operation (Feature 93589 owns the journal screen; here: the record + the catalog) */
  function audit(rec, type, detail = "") {
    const cat = G().catalog();
    const e = { at: nowIso(), by: userName(), role: who().roleLabel || "", type, code: rec.code, name: rec.names.ro, version: rec.publishedVersion || rec.version, detail };
    (rec.events ||= []).unshift(e);
    (cat.audit ||= []).unshift(e);
  }
  const touch = (rec) => { rec.editedAt = nowIso(); rec.editedBy = userName(); };
  const toast = (message, type = "success", extra = {}) => (window.GEAPToast?.show ? window.GEAPToast.show({ type, message, ...extra }) : U().showShellToast?.(message, type));

  /* ---------------------------------------------------------------- code (US-146 AC-10) */
  /* Obiect.Perimetru.Denumire: words with a capital first letter, no spaces, no diacritics (ANSP stays ANSP) */
  const pascal = (text) => String(text || "").normalize("NFD").replace(/\p{M}/gu, "").replace(/[^A-Za-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  const codeOf = (object, scope, name) => (pascal(name) ? `${G().objects?.[object]?.code || object}.${G().scopes?.[scope]?.code || scope}.${pascal(name)}` : "");
  const newId = (code) => {
    const base = `reg-${String(code.split(".").pop() || "registru").toLowerCase().replace(/[^a-z]/g, "").slice(0, 24) || "registru"}`;
    let id = base;
    let n = 0;
    while (recordOf(id) || G().defOf?.(id)) { n += 1; id = `${base}${"abcdefghijklmnopqrstuvwxyz"[n % 26]}${n > 25 ? "x" : ""}`; }
    return id;
  };

  /* ================================================================ LIST (US-147) */
  const rowOf = (rec) => ({
    id: rec.id, denumire: rec.names.ro, cod: rec.code, obiect: objectLabel(rec.object), object: rec.object, perimetru: scopeLabel(rec.scope), scope: rec.scope,
    autoritate: placeOf(rec), pozitie: Number(rec.position) || 0, coloane: rec.config.columns.length, versiune: rec.publishedVersion || rec.version,
    publicat: Boolean(rec.publishedVersion), unpublished: Boolean(rec.unpublished), statut: rec.status, editat: rec.editedAt, editatDe: rec.editedBy, rec
  });
  function registryDb() {
    if (!data()) {
      G().load?.().then(() => { if (document.querySelector(`[data-registry-kind="${KIND}"]`)) document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click(); });
    }
    const local = !who().all;
    const tabs = [
      ...(local ? [] : [{ id: "global", label: "Globale", filter: "scope:Global" }]),
      { id: "authority", label: "Pe autoritate", filter: "scope:Authority" },
      { id: "service", label: "Pe serviciu", filter: "scope:Service" }
    ];
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 8,
      defaultSort: "pozitie",
      defaultSortDirection: "asc",
      columns: {
        denumire: { label: "Denumire", width: 300, fill: true, sortable: true },
        obiect: { label: "Obiect-sursă", width: 144 },
        perimetru: { label: "Perimetru", width: 120 },
        autoritate: { label: "Autoritate sau serviciu", width: 232 },
        pozitie: { label: "Poziție", width: 104, sortable: true },
        coloane: { label: "Coloane", width: 112, sortable: true },
        versiune: { label: "Versiune", width: 176 },
        statut: { label: "Statut", width: 120 }
      },
      views: {
        [KIND]: {
          title: "Registre",
          selectable: false,
          searchPlaceholder: "Caută registre",
          columns: ["denumire", "obiect", "perimetru", "autoritate", "pozitie", "coloane", "versiune", "statut"],
          tabs,
          defaultTab: tabs[0].id,
          primaryAction: can("create") ? { id: "rga-new", label: "Adaugă registru" } : null,
          toolbarLabel: "Filtrare registre",
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: data() ? records().map(rowOf) : []
    };
  }
  const textOf = (row, key) => String(key === "autoritate" ? row.autoritate || "" : key === "versiune" ? row.versiune : row[key] ?? "");
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "obiect", label: "Obiect-sursă", get: (row) => row.obiect },
        { key: "autoritate", label: "Autoritate sau serviciu", search: true, get: (row) => row.autoritate || "—" },
        { key: "statut", label: "Statut", get: (row) => row.statut }
      ];
    },
    /* AC-11: denumirea, obiectul-sursă, perimetrul, autoritatea sau serviciul */
    searchText: (row) => [row.denumire, row.obiect, row.perimetru, row.autoritate, row.rec.scope === "Authority" ? authorityName(row.rec.authority) : ""].join(" "),
    sortValue: (row, key) => (key === "pozitie" || key === "coloane" ? Number(row[key]) || 0 : textOf(row, key)),
    filterToken: (row, token) => (token.startsWith("scope:") ? row.scope === token.slice(6) : true),
    renderCell: (row, key) => {
      switch (key) {
        /* AC-06: the code under the name */
        case "denumire": return `
          <div class="e-permits-workplace__case-cell">
            <span data-cell-tooltip="${esc(row.denumire)}">${esc(row.denumire)}</span>
            <span class="e-permits-workplace__source"><span data-cell-tooltip="${esc(row.cod)}">${esc(row.cod)}</span></span>
          </div>`;
        case "autoritate": return row.autoritate ? `<span data-cell-tooltip="${esc(placeLong(row.rec))}">${esc(row.autoritate)}</span>` : dash;
        case "versiune": return `
          <span class="e-permits-workplace__date-stack">
            <span>${esc(row.versiune)}</span>
            ${!row.publicat ? '<span class="e-permits-workplace__date-meta">nepublicat</span>' : row.unpublished ? '<span class="e-permits-workplace__date-meta">modificări nepublicate</span>' : ""}
          </span>`;
        case "statut": return statusTag(row.rec);
        case "pozitie": case "coloane": return esc(row[key]);
        default: return esc(textOf(row, key) || "—");
      }
    },
    openRow: (id) => openProfile(id),
    rowLabel: (row) => `${row.denumire}, ${row.cod} — deschide profilul registrului`,
    emptyHtml: ({ query, filtered }) => {
      const E = window.GEAPEmptyState;
      if (!data()) return E?.render({ title: "Se încarcă registrele…", loading: true, bare: true });
      if (query || filtered) return E?.noResults?.("Niciun registru nu corespunde căutării", { text: "Caută după denumire, obiect-sursă, perimetru, autoritate sau serviciu.", bare: true });
      return E?.render({ title: "Niciun registru în acest perimetru", text: "Registrele create la acest perimetru apar aici.", icon: "page-text", bare: true, actionHtml: can("create") ? '<button class="btn btn-primary btn-sm" type="button" data-workplace-add-product="rga-new">Adaugă registru</button>' : "" });
    },
    exportRows: (rows) => openListExport(rows),
    exportState: () => (data() ? {} : { hidden: true })
  };
  /* the list redrawn in place (rows rebuilt, search / filters / page kept) */
  function refreshList() {
    const reg = document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`);
    const st = A().workplaceState;
    if (!reg || !st || reg.closest("[hidden]") || reg.hidden) return;
    st.rows = registryDb().runtimeRows;
    A().renderWorkplace?.();
  }

  /* AC-14: CSV of the current tab with the search + filters, every list column; AC-22 logged */
  let exportRows = null;
  function openListExport(rows) {
    exportRows = rows;
    G().openModal?.({
      kind: "export",
      title: "Exportă lista registrelor",
      subtitle: `${plural(rows.length, "registru", "registre")} · tabul curent, cu căutarea și filtrele aplicate`,
      body: `<p class="e-permits-passport__lead">Fișierul se descarcă în format CSV, cu toate coloanele listei.</p>${U().renderInfoNote?.("Exportul se înregistrează în Jurnalul de audit, cu utilizatorul și data.") || ""}`,
      footer: G().footerOf?.("Exportă CSV", "data-rga-export-confirm", { iconName: "export" }) || ""
    });
  }
  function exportCsv() {
    const rows = exportRows || [];
    const head = ["Denumire", "Cod", "Obiect-sursă", "Perimetru", "Autoritate sau serviciu", "Poziție", "Coloane", "Versiune", "Statut"];
    const lines = rows.map((r) => [r.denumire, r.cod, r.obiect, r.perimetru, r.autoritate, r.pozitie, r.coloane, r.versiune, r.statut]);
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    download(`﻿${[head, ...lines].map((l) => l.map(cell).join(";")).join("\r\n")}`, "registre.csv", "text/csv;charset=utf-8");
    (G().catalog().audit ||= []).unshift({ at: nowIso(), by: userName(), type: "Export listă registre", detail: `${rows.length} registre` });
    G().closeModal?.();
    toast(`Am exportat ${plural(rows.length, "registru", "registre")} în registre.csv.`);
    exportRows = null;
  }
  function download(text, name, type) {
    const blob = new Blob([text], { type });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* „Nu aveți permisiunea…” — an address typed by a role without the right (US-147 AC-01 / AC-21) */
  function showDenied(title = "Registre") {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(title, window.GEAPEmptyState?.render({ title: "Acces interzis", text: DENIED, icon: "lock" }) || DENIED);
  }

  /* ================================================================ PROFILE (US-147 AC-15…21) */
  const P = { id: null, tab: "informatii" };
  const TABS = [["informatii", "Informații", "page-text"], ["coloane", "Coloane"], ["acces", "Acces"]];
  async function openProfile(id, tab = "informatii", { push = true } = {}) {
    await G().load?.();
    const rec = recordOf(id);
    if (!can("view") || !rec || !G().adminSees?.(rec, who())) { showDenied(rec ? rec.names.ro : "Registre"); return; }
    P.id = id;
    P.tab = TABS.some(([t]) => t === tab) ? tab : "informatii";
    A().setActiveNav?.(NAV);
    A().openProfilePanel?.();
    audit(rec, "Deschidere profil registru");
    renderProfile();
    A().writeHash?.(`#registru-config/${id}/${P.tab}`, { push });
    A().els?.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  }
  const profileOpen = () => Boolean(P.id) && !document.querySelector("[data-dosar-profil]")?.hidden && A().els?.dosarProfilPanelBody?.id === "rga-panel";
  function headerActions(rec) {
    const deprecated = rec.status === "Depreciat";
    const menu = [
      can("edit") && { label: "Editează", icon: "edit", attrs: "data-rga-edit" },
      can("deprecate") && (deprecated
        ? { label: "Reactivează", icon: "rotate-arrow", attrs: "data-rga-reactivate" }
        : { label: "Depreciază", icon: "pause", danger: true, attrs: "data-rga-deprecate" })
    ].filter(Boolean);
    return `
      ${can("history") ? `<button class="btn btn-neutral btn-sm" type="button" data-rga-history>${icon("history", 16)}<span>Istoric versiuni</span></button>` : ""}
      ${can("edit") ? `<button class="btn btn-secondary btn-sm" type="button" data-rga-configure>${icon("settings", 16)}<span>Configurează registrul</span></button>` : ""}
      ${can("publish") ? '<button class="btn btn-primary btn-sm" type="button" data-rga-publish>Publică</button>' : ""}
      ${(U().renderStackMenu?.(menu, rec.names.ro) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}`;
  }
  function renderProfile({ keepFocus = "" } = {}) {
    const rec = recordOf(P.id);
    if (!rec) return;
    const els = A().els || {};
    els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop({
      crumbs: [{ label: "Registre", attr: "data-rga-back" }, { label: rec.names.ro }],
      title: rec.names.ro,
      actions: headerActions(rec),
      /* AC-26: the label while the saved configuration differs from the published one */
      status: rec.unpublished ? A().renderHeaderStatus?.("Modificări nepublicate", "warning") || "" : ""
    });
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta([
      ["Obiect-sursă", esc(objectLabel(rec.object))],
      ["Perimetru", esc(rec.scope === "Global" ? "Global" : `${scopeLabel(rec.scope)} · ${placeOf(rec)}`)],
      ["Statut", statusTag(rec)],
      ["Versiune", esc(rec.publishedVersion ? rec.publishedVersion : `${rec.version} · nepublicat`)],
      ["Editat", esc(`${stamp(rec.editedAt)} · ${rec.editedBy}`)]
    ]);
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    const counts = { coloane: rec.config.columns.length, acces: rec.grants.filter((g) => !g.revokedAt).length };
    els.dosarProfilTabs.innerHTML = TABS.map(([id, label, ic]) => {
      const active = id === P.tab;
      return `<button class="tab-button${active ? " active" : ""}" id="rga-tab-${id}" type="button" role="tab" aria-controls="rga-panel" aria-selected="${active}" tabindex="${active ? 0 : -1}" data-rga-tab="${id}">
        ${ic ? icon(ic) : ""}<span>${label}</span>${counts[id] ? A().renderPageHeaderTabCount?.(counts[id]) || "" : ""}
      </button>`;
    }).join("");
    const body = els.dosarProfilPanelBody;
    body.id = "rga-panel";
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", `rga-tab-${P.tab}`);
    body.innerHTML = P.tab === "coloane" ? columnsTab(rec) : P.tab === "acces" ? accessTab(rec) : infoTab(rec);
    if (keepFocus) document.querySelector(keepFocus)?.focus();
  }
  const card = (title, rows) => A().renderInfoCard?.(title, rows.filter(Boolean)) || "";
  const val = (v) => (v === null || v === undefined || v === "" ? "—" : esc(v));
  function ruleText(rec, rule, columns) {
    const f = fieldOf(rec, rule.column);
    const shown = columns.some((c) => c.key === rule.column);
    return `${f?.label || rule.column}${shown ? "" : " (neafișată)"} ${opLabel(rule.op)}${NO_VALUE.includes(rule.op) ? "" : ` „${rule.value}”`}`;
  }
  function infoTab(rec) {
    const parent = rec.parent ? recordOf(rec.parent) : null;
    const notices = [
      rec.status === "Depreciat" && U().renderNotice?.("warning", `<strong>Registru depreciat.</strong> Nu apare în BackOffice pentru niciun utilizator. Configurația, accesul acordat și istoricul versiunilor se păstrează${can("deprecate") ? "; „Reactivează” îl readuce" : ""}.`),
      rec.status !== "Depreciat" && !rec.publishedVersion && U().renderInfoNote?.("<strong>Nepublicat încă.</strong> Registrul apare în BackOffice după prima publicare, pentru rolurile cu acces."),
      rec.unpublished && U().renderNotice?.("warning", `<strong>Modificări nepublicate.</strong> Utilizatorii din BackOffice văd în continuare versiunea ${esc(rec.publishedVersion)}.`)
    ].filter(Boolean).join("");
    const pf = rec.config.predefinedFilter;
    const rules = pf?.rules || [];
    const actions = rec.config.actions;
    return `${notices ? `<div class="e-permits-reg-notices">${notices}</div>` : ""}
      ${card("Date generale", [
        ["Cod", A().renderProfileCopyCode?.(rec.code, `Copiază ${rec.code}`) || esc(rec.code)],
        ["Denumire (ro)", val(rec.names.ro)],
        ["Denumire (ru)", val(rec.names.ru)],
        ["Denumire (en)", val(rec.names.en)],
        ["Descriere", val(rec.description)],
        ["Obiect-sursă", val(objectLabel(rec.object))],
        ["Perimetru", val(scopeLabel(rec.scope))],
        ["Autoritate sau serviciu", val(placeLong(rec))],
        ["Derivat din", parent ? `<a class="link link-primary link-sm" href="#registru-config/${esc(parent.id)}/informatii" data-rga-open="${esc(parent.id)}">${esc(parent.names.ro)}</a>` : "—"],
        ["Poziția în listă", val(rec.position)],
        ["Creat", val(`${stamp(rec.createdAt)} · ${rec.createdBy}`)]
      ])}
      ${rules.length
        ? card("Filtru predefinit", [
          ["Combinare", esc(pf.logic === "or" ? "Oricare regulă (Sau)" : "Toate regulile (Și)")],
          ...rules.map((rule, i) => [`Regula ${i + 1}`, esc(ruleText(rec, rule, rec.config.columns))])
        ])
        : A().renderPassportEmpty?.("Filtru predefinit", "Fără condiție: registrul afișează toate înregistrările disponibile utilizatorului.", "", "filter") || ""}
      ${actions.length
        ? A().renderStackedList?.("Acțiuni pe rând", [{ label: "", items: actions.map(actionItem) }], { meta: `${plural(actions.length, "acțiune", "acțiuni")} · în meniul de la capătul rândului` }) || ""
        : A().renderPassportEmpty?.("Acțiuni pe rând", "Registrul nu are acțiuni pe rând: meniul de la capătul rândului nu apare.", "", "more-vertical") || ""}`;
  }
  const actionLead = (a) => `<span class="avatar avatar--sm avatar--icon e-permits-reg-catalog__icon" aria-hidden="true">${icon(a.icon || "document")}</span>`;
  const rolesText = (a) => (a.roles?.length ? a.roles.map(roleLabel).join(", ") : "toate rolurile cu acces");
  const actionItem = (a) => ({
    plainTitle: a.label,
    title: esc(a.label),
    leadHtml: actionLead(a),
    badges: [tag(typeLabel(a.type), "neutral")],
    meta: [esc(a.type === "open" ? "Fișa înregistrării" : `${TARGET_NAME[a.type] || "Ținta"}: ${targetLabel(a)}`), esc(`Vizibilă: ${rolesText(a)}`)]
  });
  const orderLead = (n, handle = false) => `<span class="e-permits-ekcfg-order">${handle ? `<span class="e-permits-ekcfg-order__handle" aria-hidden="true">${icon("drag", 16)}</span>` : ""}<span class="e-permits-ekcfg-order__n" aria-label="Poziția ${n}">${n}</span></span>`;
  function columnBadges(rec, c) {
    return [
      !c.visible && tag("Ascunsă implicit", "neutral"),
      c.sortable && tag("Sortabilă", "neutral"),
      c.filter && tag(`Filtru: ${filterLabel(c.filter)}`, "neutral")
    ].filter(Boolean);
  }
  const alignLabel = (a) => (ALIGN.find(([k]) => k === a)?.[1] || "Stânga").toLocaleLowerCase("ro");
  function columnsTab(rec) {
    const cols = rec.config.columns;
    const cta = can("edit") ? `<button class="btn btn-secondary btn-sm" type="button" data-rga-configure>${icon("settings", 16)}<span>Configurează registrul</span></button>` : "";
    if (!cols.length) return A().renderPassportEmpty?.("Coloanele registrului", "Registrul nu are încă nicio coloană: fără coloane nu se poate publica.", cta, "page-text") || "";
    return A().renderStackedList?.("Coloanele registrului", [{
      label: "",
      items: cols.map((c, i) => {
        const f = fieldOf(rec, c.key);
        return {
          plainTitle: c.label,
          title: esc(c.label),
          leadHtml: orderLead(i + 1),
          badges: columnBadges(rec, c),
          meta: [esc(`Câmp: ${f?.label || c.key}${f ? ` · ${f.group}` : ""}`), esc(`lățime ${c.width} px`), esc(`aliniere ${alignLabel(c.align)}`)],
          meta2: [c.labels?.ru && esc(`RU: ${c.labels.ru}`), c.labels?.en && esc(`EN: ${c.labels.en}`)].filter(Boolean)
        };
      })
    }], { meta: `${plural(cols.length, "coloană", "coloane")} · în ordinea din registru` }) || "";
  }
  function accessTab(rec) {
    const list = rec.grants.filter((g) => !g.revokedAt);
    const add = can("access") ? `<button class="btn btn-secondary btn-sm" type="button" data-rga-grant>${icon("plus-large", 16)}<span>Acordă acces</span></button>` : "";
    const rows = list.map((g) => `
      <tr>
        <td><span data-cell-tooltip="${esc(roleLabel(g.role))}">${esc(roleLabel(g.role))}</span></td>
        <td>${g.authority ? `<span data-tooltip-text="${esc(authorityName(g.authority))}">${esc(g.authority)}</span>` : "Toate autoritățile"}</td>
        <td>${A().renderDateTime?.(g.at) || esc(stamp(g.at))}</td>
        <td><span data-cell-tooltip="${esc(g.by)}">${esc(g.by)}</span></td>
        <td class="e-permits-reg-table__action">${can("access") ? `<button class="btn btn-neutral btn-sm btn-icon-only" type="button" aria-label="Retrage accesul: ${esc(roleLabel(g.role))}, ${esc(g.authority || "toate autoritățile")}" data-tooltip-label="Retrage accesul" data-rga-revoke="${esc(g.id)}">${icon("delete", 16)}</button>` : ""}</td>
      </tr>`).join("");
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Acces</h2>
          <div class="e-permits-passport__heading-tools">
            <span class="e-permits-dosar-profil__section-meta">${esc(plural(list.length, "acordare", "acordări"))}</span>
            ${add}
          </div>
        </div>
        <div class="e-permits-reg-access">
          ${U().renderInfoNote?.("Modificările de acces intră în vigoare imediat și nu fac parte din versiunea registrului.") || ""}
          ${list.length ? `
            <div class="e-permits-workplace__table-wrap e-permits-reg-table">
              <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-reg-table__table--access">
                <caption class="u-visually-hidden">Acordările de acces ale registrului ${esc(rec.names.ro)}</caption>
                <thead><tr><th scope="col">Rol</th><th scope="col">Autoritate</th><th scope="col">Acordat la</th><th scope="col">Acordat de</th><th scope="col"><span class="u-visually-hidden">Acțiuni</span></th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>` : window.GEAPEmptyState?.render({ title: "Niciun rol nu are acces", text: "Registrul nu apare în BackOffice până nu acorzi acces cel puțin unui rol.", icon: "lock", compact: true, actionHtml: add }) || ""}
        </div>
      </section>`;
  }

  /* ================================================================ the ONE drawer: create · edit · grant · versions */
  let drawer = null;
  let D = null;
  function ensureDrawer() {
    if (drawer) return drawer;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drawer-overlay" data-rga-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-rga-drawer-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="rga-drawer-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="rga-drawer-title" data-rga-drawer-title></h2>
              <p class="drawer__subtitle" data-rga-drawer-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-rga-drawer-close>${icon("cross-large", 16)}</button>
          </header>
          <div class="drawer__body" data-rga-drawer-body></div>
          <footer class="drawer__footer" data-rga-drawer-footer></footer>
        </aside>
      </div>`;
    drawer = wrap.firstElementChild;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", onDrawerClick);
    drawer.addEventListener("input", onDrawerInput);
    drawer.addEventListener("change", onDrawerChange);
    return drawer;
  }
  function openDrawer(state) {
    D = { back: document.activeElement, errors: {}, ...state };
    const d = ensureDrawer();
    d.querySelector(".drawer").classList.toggle("drawer--lg", D.mode === "versions");
    renderDrawer();
    d.hidden = false;
    document.body.classList.add("is-drawer-open");
    requestAnimationFrame(() => (d.querySelector("[data-rga-autofocus]") || d.querySelector(".drawer"))?.focus());
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    document.body.classList.remove("is-drawer-open");
    const back = D?.back;
    D = null;
    if (back?.isConnected) back.focus(); else document.querySelector(".e-permits-page-header__title, [data-rga-history]")?.focus?.();
  }
  /* re-render keeping the field the user is in (id + caret) */
  function renderDrawer(focusSel = "") {
    if (!D) return;
    const d = ensureDrawer();
    const active = document.activeElement;
    const keep = focusSel || (active && d.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const top = d.querySelector(".drawer__body")?.scrollTop || 0;
    const view = DRAWERS[D.mode];
    d.querySelector("[data-rga-drawer-title]").textContent = view.title();
    const sub = d.querySelector("[data-rga-drawer-subtitle]");
    sub.textContent = view.subtitle(); sub.hidden = !sub.textContent;
    d.querySelector("[data-rga-drawer-body]").innerHTML = view.body();
    d.querySelector("[data-rga-drawer-footer]").innerHTML = view.footer();
    R().bind?.(d.querySelector("[data-rga-drawer-body]"));
    d.querySelector(".drawer__body").scrollTop = top;
    if (keep) {
      const el = d.querySelector(keep);
      el?.focus?.();
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not a text field */ } }
    }
  }

  /* ---- form pieces (the BO drawer form vocabulary: .e-permits-fo-field in .e-permits-user-create__grid) */
  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;
  const req = () => U().requiredMark?.() || "";
  function textField(key, label, value, { required = false, max = 0, hint = "", span = 12, readonly = false, error = "", inputmode = "", counter = false, idPrefix = "rga" } = {}) {
    const id = `${idPrefix}-${key}`;
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : "";
    const labelHtml = `<label for="${id}">${esc(label)}${required ? req() : ""}</label>`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        ${counter && max ? `<div class="e-permits-fo-field__label-counter">${labelHtml}<span class="e-permits-fo-field__counter" data-rga-counter="${id}">${String(value || "").length} / ${max}</span></div>` : labelHtml}
        <div class="e-permits-fo-input${error ? " is-error" : ""}${readonly ? " is-filled is-readonly" : ""}">
          <input id="${id}" type="text" value="${esc(value)}" autocomplete="off"${max ? ` maxlength="${max}"` : ""}${inputmode ? ` inputmode="${inputmode}"` : ""}${readonly ? " readonly" : ""}${required ? ' aria-required="true"' : ""}${error ? ' aria-invalid="true"' : ""}${describedBy ? ` aria-describedby="${describedBy}"` : ""} data-rga-field="${key}">
        </div>
        ${error ? errorHtml(id, error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function areaField(key, label, value, { max = 500, hint = "", error = "", required = false, idPrefix = "rga", rows = 3, placeholder = "" } = {}) {
    const id = `${idPrefix}-${key}`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <div class="e-permits-fo-field__label-counter"><label for="${id}">${esc(label)}${required ? req() : ""}</label><span class="e-permits-fo-field__counter" data-rga-counter="${id}">${String(value || "").length} / ${max}</span></div>
        <div class="e-permits-fo-textarea${error ? " is-error" : ""}"><textarea id="${id}" rows="${rows}" maxlength="${max}" placeholder="${esc(placeholder)}"${required ? ' aria-required="true"' : ""}${error ? ` aria-invalid="true" aria-describedby="${id}-error"` : hint ? ` aria-describedby="${id}-hint"` : ""} data-rga-field="${key}">${esc(value)}</textarea></div>
        ${error ? errorHtml(id, error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function selectField(key, label, options, value, { required = false, placeholder = "", hint = "", error = "", span = 12, idPrefix = "rga", disabled = false } = {}) {
    const id = `${idPrefix}-${key}`;
    const optionsHtml = `${placeholder ? `<option value=""${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("")}`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        ${U().renderFoSelectControl?.({ id, attrs: `data-rga-field="${key}"`, optionsHtml, error: Boolean(error), disabled }) || ""}
        ${error ? errorHtml(id, error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  const roField = (label, html, span = 12) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <span class="e-permits-cfg-ro__label">${esc(label)}</span>
      <div class="e-permits-cfg-ro">${html}</div>
    </div>`;
  const section = (title, content) => `
    <section class="e-permits-user-create__section">
      <h3 class="e-permits-user-create__section-title">${esc(title)}</h3>
      <div class="e-permits-user-create__section-content">${content}</div>
    </section>`;
  const grid = (...parts) => `<div class="e-permits-user-create__grid">${parts.join("")}</div>`;
  const drawerFooter = (label, attrs, { disabledReason = "" } = {}) => `
    <div class="modal-buttons">
      <button class="btn btn-neutral btn-rounded" type="button" data-rga-drawer-close>Anulează</button>
      <button class="btn btn-primary btn-rounded" type="button" ${attrs}${disabledReason ? ` aria-disabled="true" data-tooltip-reason="${esc(disabledReason)}"` : ""}>${esc(label)}</button>
    </div>`;

  /* ---- US-146 „Registru nou” / US-148 „Editează registrul” */
  const SCOPE_OPTIONS = () => (who().all ? [["Global", "Global"], ["Authority", "Autoritate"], ["Service", "Serviciu"]] : [["Authority", "Autoritate"], ["Service", "Serviciu"]]);
  function createState() {
    const local = !who().all;
    return { mode: "create", v: { object: "", scope: local ? "Authority" : "Global", authority: local ? who().authority : "", service: "", parent: "", ro: "", ru: "", en: "", description: "" } };
  }
  const parentOptions = (v) => records().filter((r) => r.object === v.object && r.publishedVersion && r.status !== "Depreciat")
    .map((r) => [r.id, `${r.names.ro} · ${r.code}`]);
  const serviceOptions = () => (data()?.admin?.services || []).filter((s) => who().all || s.authority === who().authority).map((s) => [s.code, `${s.name} · ${s.code}`]);
  const DRAWERS = {
    create: {
      title: () => "Registru nou",
      subtitle: () => "Se creează ca schiță; coloanele, filtrul și acțiunile se configurează după creare.",
      body: () => {
        const v = D.v;
        const e = D.errors;
        const local = !who().all;
        const objects = Object.entries(G().objects || {}).map(([k, o]) => [k, o.label]);
        const code = codeOf(v.object || "Case", v.scope, v.ro);
        return `
          ${section("Sursa și perimetrul", grid(
            selectField("object", "Obiect-sursă", objects, v.object, { required: true, placeholder: "Alege obiectul-sursă", error: e.object, hint: "Nu se mai schimbă după creare." }),
            `<div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
              <span class="e-permits-cfg-ro__label" id="rga-scope-label">Perimetru${req()}</span>
              ${A().renderChoiceChips?.({ label: "Perimetru", labelId: "rga-scope-label", name: "rga-scope", options: SCOPE_OPTIONS(), value: v.scope }) || ""}
              ${local ? '<p class="e-permits-fo-field__hint">Ca Administrator local creezi registre ale autorității tale și ale serviciilor ei.</p>' : ""}
            </div>`,
            v.scope === "Authority" ? (local
              ? roField("Autoritate", esc(authorityName(v.authority)))
              : selectField("authority", "Autoritate", (data()?.authorities || []).map((a) => [a.code, `${a.name} (${a.code})`]), v.authority, { required: true, placeholder: "Alege autoritatea", error: e.authority })) : "",
            v.scope === "Service" ? selectField("service", "Serviciu", serviceOptions(), v.service, { required: true, placeholder: "Alege serviciul", error: e.service }) : "",
            v.scope !== "Global" ? selectField("parent", "Registru-părinte", parentOptions(v), v.parent, { placeholder: v.object ? "Fără registru-părinte" : "Alege întâi obiectul-sursă", disabled: !v.object, hint: "Opțional. Coloanele și acțiunile lui se copiază o singură dată, la creare." }) : ""
          ))}
          ${section("Denumire și descriere", grid(
            textField("ro", "Denumire (ro)", v.ro, { required: true, max: 200, counter: true, error: e.ro }),
            textField("ru", "Denumire (ru)", v.ru, { max: 200, span: 6 }),
            textField("en", "Denumire (en)", v.en, { max: 200, span: 6 }),
            areaField("description", "Descriere", v.description, { max: 500, hint: "De ce există registrul și cine îl folosește." })
          ))}
          ${section("Cod", grid(textField("code", "Cod", code, { readonly: true, error: e.code, hint: "Se generează din obiectul-sursă, perimetru și denumire. Rămâne același după creare." })))}`;
      },
      footer: () => drawerFooter("Salvează", "data-rga-create-save")
    },
    edit: {
      title: () => "Editează registrul",
      subtitle: () => recordOf(D.id)?.names.ro || "",
      body: () => {
        const v = D.v;
        const e = D.errors;
        const rec = recordOf(D.id);
        return `
          ${section("Identificare", grid(textField("code", "Cod", rec.code, { readonly: true, hint: "Codul rămâne același după creare" })))}
          ${section("Denumire și descriere", grid(
            textField("ro", "Denumire (ro)", v.ro, { required: true, max: 200, counter: true, error: e.ro }),
            textField("ru", "Denumire (ru)", v.ru, { max: 200, span: 6 }),
            textField("en", "Denumire (en)", v.en, { max: 200, span: 6 }),
            areaField("description", "Descriere", v.description, { max: 500 })
          ))}
          ${section("Poziția în listă", grid(textField("position", "Poziția în listă", v.position, { required: true, span: 6, inputmode: "numeric", max: 3, error: e.position, hint: `Ordinea în tabul „${rec.scope === "Global" ? "Globale" : rec.scope === "Authority" ? "Pe autoritate" : "Pe serviciu"}”: un număr între 0 și 999.` })))}`;
      },
      footer: () => drawerFooter("Salvează", "data-rga-edit-save")
    },
    grant: {
      title: () => "Acordă acces",
      subtitle: () => recordOf(D.id)?.names.ro || "",
      body: () => {
        const v = D.v;
        const rec = recordOf(D.id);
        const local = !who().all;
        const auth = local ? who().authority : v.authority;
        /* AC-08: roles that already have access for this authority are inactive */
        const has = (role) => rec.grants.some((g) => !g.revokedAt && g.role === role && (g.authority || "") === (auth || ""));
        const list = roles().filter((r) => !local || r.local);
        return `
          ${section("Perimetru", grid(local
            ? roField("Autoritate", esc(authorityName(auth)))
            : selectField("authority", "Autoritate", (data()?.authorities || []).map((a) => [a.code, `${a.name} (${a.code})`]), v.authority, { placeholder: "Toate autoritățile", hint: "Lăsați gol pentru a acorda rolul în toate autoritățile" })))}
          ${section("Roluri", `
            <div class="e-permits-fo-field e-permits-reg-roles">
              <span class="e-permits-cfg-ro__label" id="rga-roles-label">Rol${req()}</span>
              <div class="e-permits-check-options" role="group" aria-labelledby="rga-roles-label">
                ${list.map((r) => {
                  const done = has(r.id);
                  return U().renderCheckOption?.({ label: done ? `${r.label} (Acces acordat deja)` : r.label, checked: !done && v.roles.includes(r.id), disabled: done, reason: done ? "Rolul are deja acces pentru autoritatea aleasă." : "", attrs: `value="${esc(r.id)}" data-rga-role` }) || "";
                }).join("")}
              </div>
              <p class="e-permits-fo-field__hint" aria-live="polite" data-rga-role-count>Selectate: ${v.roles.length}</p>
            </div>`)}`;
      },
      footer: () => drawerFooter("Salvează", "data-rga-grant-save", { disabledReason: D.v.roles.length ? "" : "Alege cel puțin un rol." })
    },
    versions: {
      title: () => "Istoric versiuni",
      subtitle: () => recordOf(D.id)?.names.ro || "",
      body: () => versionsHtml(),
      footer: () => '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-rga-drawer-close>Închide</button></div>'
    }
  };
  function onDrawerInput(event) {
    const t = event.target;
    const key = t.dataset?.rgaField;
    if (!key || !D?.v) return;
    D.v[key] = t.value;
    const counter = drawer.querySelector(`[data-rga-counter="${t.id}"]`);
    if (counter) counter.textContent = `${t.value.length} / ${t.maxLength}`;
    if (D.errors[key]) { delete D.errors[key]; renderDrawer(); return; }
    /* the code follows the name live (US-146 user flow) */
    if (D.mode === "create" && key === "ro") {
      const code = drawer.querySelector("#rga-code");
      if (code) code.value = codeOf(D.v.object || "Case", D.v.scope, D.v.ro);
      if (D.errors.code) { delete D.errors.code; renderDrawer(); }
    }
  }
  function onDrawerChange(event) {
    const t = event.target;
    if (D?.mode === "grant" && t.matches("[data-rga-role]")) {
      const set = new Set(D.v.roles);
      if (t.checked) set.add(t.value); else set.delete(t.value);
      D.v.roles = [...set];
      renderDrawer(`input[data-rga-role][value="${CSS.escape(t.value)}"]`);
      return;
    }
    const key = t.dataset?.rgaField;
    if (!key || !D?.v || t.tagName !== "SELECT") return;
    D.v[key] = t.value;
    delete D.errors[key];
    if (key === "object") { D.v.parent = ""; delete D.errors.code; }
    if (D.mode === "grant" && key === "authority") D.v.roles = D.v.roles.filter((r) => !recordOf(D.id).grants.some((g) => !g.revokedAt && g.role === r && (g.authority || "") === (t.value || "")));
    renderDrawer(`#rga-${key}`);
  }
  function onDrawerClick(event) {
    const t = event.target;
    if (t.closest("[data-rga-drawer-close]")) { closeDrawer(); return; }
    const scope = t.closest("[data-rga-scope]");
    if (scope && D?.mode === "create") {
      D.v.scope = scope.dataset.rgaScope;
      if (D.v.scope === "Global") { D.v.parent = ""; D.v.service = ""; if (who().all) D.v.authority = ""; }
      delete D.errors.authority; delete D.errors.service; delete D.errors.code;
      renderDrawer(`[data-rga-scope="${scope.dataset.rgaScope}"]`);
      return;
    }
    if (t.closest("[data-rga-create-save]")) { saveCreate(); return; }
    if (t.closest("[data-rga-edit-save]")) { saveEdit(); return; }
    if (t.closest("[data-rga-grant-save]")) { saveGrant(t.closest("[data-rga-grant-save]")); return; }
    const sort = t.closest("[data-rgv-sort]");
    if (sort) {
      const key = sort.dataset.rgvSort;
      D.sort = { key, dir: D.sort.key === key && D.sort.dir === "desc" ? "asc" : "desc" };
      renderDrawer(`[data-rgv-sort="${key}"]`);
      return;
    }
    const page = t.closest("[data-rgv-page]");
    if (page && !page.disabled) { D.page = Number(page.dataset.rgvPage) || 1; renderDrawer(); drawer.querySelector(".pagination__link--active, [data-pager-step]")?.focus?.(); return; }
    const per = t.closest("[data-rgv-per-page]");
    if (per) { D.perPage = Number(per.dataset.rgvPerPage) || 10; D.page = Number(per.dataset.rgvPage) || 1; renderDrawer(); return; }
  }
  function saveCreate() {
    const v = D.v;
    const e = {};
    if (!v.object) e.object = "Alegeți obiectul-sursă";
    if (!v.ro.trim()) e.ro = "Denumirea este obligatorie";
    if (v.scope === "Authority" && !v.authority) e.authority = "Alegeți autoritatea";
    if (v.scope === "Service" && !v.service) e.service = "Alegeți serviciul";
    const code = codeOf(v.object || "Case", v.scope, v.ro);
    if (!e.ro && v.object && G().catalog().records.some((r) => r.code === code)) e.code = "Există deja un registru cu acest cod";
    /* AC-12: a local administrator never creates a global register (the option is not offered either) */
    if (v.scope === "Global" && !who().all) e.code = "Acces interzis";
    D.errors = e;
    if (Object.keys(e).length) {
      renderDrawer();
      const first = ["object", "authority", "service", "ro", "code"].find((k) => e[k]);
      drawer.querySelector(`#rga-${first}`)?.focus();
      return;
    }
    const cat = G().catalog();
    const parent = v.parent ? recordOf(v.parent) : null;
    const authority = v.scope === "Service" ? serviceOf(v.service)?.authority || null : v.scope === "Authority" ? v.authority : null;
    const peers = cat.records.filter((r) => r.scope === v.scope);
    const rec = {
      id: newId(code), code, object: v.object, scope: v.scope, authority, service: v.scope === "Service" ? v.service : null, parent: parent?.id || null,
      names: { ro: v.ro.trim(), ru: v.ru.trim(), en: v.en.trim() }, description: v.description.trim(),
      position: Math.min(999, peers.reduce((m, r) => Math.max(m, Number(r.position) || 0), 0) + 1),
      category: data()?.admin?.categories?.[v.object] || "", icon: { Case: "document", Permit: "permission", Invoice: "receipt-bill", Expertise: "stamp" }[v.object],
      status: "Schiță", version: "v1.0.0", publishedVersion: null, unpublished: false,
      /* AC-09: the parent's columns and actions copied once */
      config: { columns: parent ? clone(parent.published.columns) : [], predefinedFilter: null, actions: parent ? clone(parent.published.actions) : [], defaultSort: parent ? clone(parent.published.defaultSort) : null, exportNeedsCriteria: false },
      published: null, publishedAt: null, createdAt: nowIso(), createdBy: userName(), editedAt: nowIso(), editedBy: userName(),
      versions: [], grants: [], events: []
    };
    cat.records.push(rec);
    audit(rec, "Creare registru", `${rec.code} · ${rec.names.ro}`);
    G().commit();
    closeDrawer();
    /* AC-13: the list shows the new register in the tab of its perimeter */
    const st = A().workplaceState;
    if (st && document.querySelector(`[data-registry-kind="${KIND}"]`)) {
      st.tabKey = { Global: "global", Authority: "authority", Service: "service" }[rec.scope];
      st.query = "";
      const search = document.querySelector("[data-workplace-search]");
      if (search) search.value = "";
    }
    refreshList();
    toast(`Registrul „${rec.names.ro}” a fost creat ca schiță.`, "success", { link: { href: `#registru-config/${rec.id}/informatii`, label: "Deschide registrul" } });
  }
  function saveEdit() {
    const v = D.v;
    const e = {};
    if (!v.ro.trim()) e.ro = "Denumirea este obligatorie";
    const pos = String(v.position).trim();
    if (!/^\d{1,3}$/.test(pos) || Number(pos) > 999) e.position = "Introduceți un număr între 0 și 999";
    D.errors = e;
    if (Object.keys(e).length) { renderDrawer(); drawer.querySelector(`#rga-${e.ro ? "ro" : "position"}`)?.focus(); return; }
    const rec = recordOf(D.id);
    const before = { ...rec.names, description: rec.description, position: rec.position };
    rec.names = { ro: v.ro.trim(), ru: v.ru.trim(), en: v.en.trim() };
    rec.description = v.description.trim();
    rec.position = Number(pos);
    touch(rec);
    audit(rec, "Editare registru", [before.ro !== rec.names.ro && `Denumire: ${before.ro} → ${rec.names.ro}`, before.position !== rec.position && `Poziție: ${before.position} → ${rec.position}`].filter(Boolean).join("; "));
    G().commit();
    closeDrawer();
    if (profileOpen()) renderProfile();
    toast(`Registrul „${rec.names.ro}” a fost actualizat.`);
  }
  function saveGrant(button) {
    if (button.getAttribute("aria-disabled") === "true") return;
    const rec = recordOf(D.id);
    const authority = !who().all ? who().authority : D.v.authority || null;
    let n = 0;
    D.v.roles.forEach((role) => {
      /* AC-18: an identical grant revoked earlier is reactivated */
      const old = rec.grants.find((g) => g.role === role && (g.authority || null) === authority && g.revokedAt);
      if (old) { delete old.revokedAt; delete old.revokedBy; old.at = nowIso(); old.by = userName(); }
      else rec.grants.push({ id: `${rec.id}-g${rec.grants.length + 1}-${Date.now() % 100000}`, role, authority, at: nowIso(), by: userName() });
      audit(rec, "Acordare acces registru", `${roleLabel(role)} · ${authority || "Toate autoritățile"}`);
      n += 1;
    });
    G().commit();
    closeDrawer();
    if (profileOpen()) renderProfile();
    toast(`Accesul a fost acordat pentru ${plural(n, "rol", "roluri")}. Intră în vigoare imediat.`);
  }

  /* ---- US-150 „Istoric versiuni” (panel = the drawer, lg): table sortable by Nr. / Versiune / Data, 10 per page */
  function versionsHtml() {
    const rec = recordOf(D.id);
    const list = [...rec.versions];
    const dir = D.sort.dir === "asc" ? 1 : -1;
    const keyOf = (v) => (D.sort.key === "data" ? v.at : D.sort.key === "versiune" ? v.version.replace(/\d+/g, (n) => n.padStart(4, "0")) : String(v.nr).padStart(4, "0"));
    list.sort((a, b) => keyOf(a).localeCompare(keyOf(b)) * dir);
    if (!list.length) return window.GEAPEmptyState?.render({ title: "Nicio versiune publicată", text: "Istoricul începe la prima publicare a registrului.", icon: "history", compact: true }) || "";
    const pages = Math.max(1, Math.ceil(list.length / D.perPage));
    D.page = Math.min(D.page, pages);
    const shown = list.slice((D.page - 1) * D.perPage, D.page * D.perPage);
    const th = (key, label, sortable) => {
      const on = D.sort.key === key;
      return `<th scope="col" class="${sortable ? `is-sortable${on ? " is-sorted" : ""}` : ""}"${sortable ? ` aria-sort="${on ? (D.sort.dir === "asc" ? "ascending" : "descending") : "none"}"` : ""}>${sortable
        ? `<button class="e-permits-workplace__th-content" type="button" data-rgv-sort="${key}" aria-label="Sortează după ${label}"><span>${label}</span><span class="e-permits-workplace__sort${on ? ` is-${D.sort.dir}` : ""}" aria-hidden="true">${icon("chevron-bottom")}</span></button>`
        : `<span class="e-permits-workplace__th-content"><span>${label}</span></span>`}</th>`;
    };
    const current = rec.publishedVersion;
    const rows = shown.map((v) => {
      const isCurrent = v.version === current && v.nr === Math.max(...rec.versions.filter((x) => x.version === current).map((x) => x.nr));
      const menu = [
        { label: "Vizualizează", icon: "eye-open", attrs: `data-rgv-view="${v.nr}"` },
        !isCurrent && can("restore") && { label: "Restaurează", icon: "rotate-arrow", attrs: `data-rgv-restore="${v.nr}"` },
        can("exportVersion") && { label: "Exportă", icon: "export", attrs: `data-rgv-export="${v.nr}"` }
      ].filter(Boolean);
      return `
        <tr>
          <td>${v.nr}</td>
          <td><span class="e-permits-reg-version">${esc(v.version)}${isCurrent ? tag("curentă", "brand") : ""}</span></td>
          <td><span data-cell-tooltip="${esc(v.type)}">${esc(v.type)}</span></td>
          <td><span data-cell-tooltip="${esc(v.note)}">${esc(v.note)}</span></td>
          <td>${A().renderDateTime?.(v.at) || esc(stamp(v.at))}</td>
          <td><span data-cell-tooltip="${esc(v.by)}">${esc(v.by)}</span></td>
          <td class="e-permits-reg-table__action">${(U().renderStackMenu?.(menu, `Versiunea ${v.version}`) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</td>
        </tr>`;
    }).join("");
    return `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Versiuni publicate</h3>
        <div class="e-permits-user-create__section-content">
          <p class="e-permits-passport__lead">${esc(`${plural(list.length, "versiune", "versiuni")} · în vigoare: ${current || "—"}`)}</p>
          <div class="e-permits-workplace__table-wrap e-permits-reg-table">
            <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-reg-table__table--versions">
              <caption class="u-visually-hidden">Versiunile publicate ale registrului ${esc(rec.names.ro)}</caption>
              <thead><tr>${th("nr", "Nr.", true)}${th("versiune", "Versiune", true)}${th("tip", "Tipul modificării", false)}${th("note", "Ce s-a schimbat", false)}${th("data", "Data", true)}${th("autor", "Autor", false)}<th scope="col"><span class="u-visually-hidden">Acțiuni</span></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${window.GEAPPager?.html({ total: list.length, page: D.page, perPage: D.perPage, sizes: [10, 20, 50], prefix: "rgv", label: "Paginarea versiunilor", sizeLabel: "Rânduri pe pagină" }) || ""}
        </div>
      </section>`;
  }

  /* ---- version window · restore · export (the library dialog raised above the drawer) */
  const versionOf = (rec, nr) => rec.versions.find((v) => String(v.nr) === String(nr)) || null;
  function raiseModal(on) {
    document.querySelector("#case-action-modal")?.classList.toggle("e-permits-confirm-overlay", on);
  }
  function configCards(rec, config) {
    const cols = config.columns || [];
    const rules = config.predefinedFilter?.rules || [];
    const acts = config.actions || [];
    const block = (title, rows, empty) => `
      <h3 class="e-permits-dosar-profil__section-title">${esc(title)}</h3>
      ${rows.length ? `<div class="e-permits-dosar-profil__card">${rows.map(G().detailRow).join("")}</div>` : `<p class="e-permits-passport__lead">${esc(empty)}</p>`}`;
    return `
      ${block(`Coloane (${cols.length})`, cols.map((c, i) => [`${i + 1}. ${c.label}`, esc([c.visible ? "vizibilă" : "ascunsă implicit", c.sortable && "sortabilă", c.filter && `filtru: ${filterLabel(c.filter).toLocaleLowerCase("ro")}`, `${c.width} px`].filter(Boolean).join(" · "))]), "Fără coloane.")}
      ${block("Filtru predefinit", rules.map((r, i) => [`Regula ${i + 1}`, esc(ruleText(rec, r, cols))]), "Fără condiție: registrul afișează toate înregistrările disponibile utilizatorului.")}
      ${block(`Acțiuni pe rând (${acts.length})`, acts.map((a) => [a.label, esc(`${typeLabel(a.type)} · ${targetLabel(a)} · ${rolesText(a)}`)]), "Registrul nu are acțiuni pe rând: meniul de la capătul rândului nu apare.")}`;
  }
  function openVersion(nr) {
    const rec = recordOf(D?.id || P.id);
    const v = versionOf(rec, nr);
    if (!v) return;
    raiseModal(true);
    G().openModal?.({
      kind: "version",
      title: `Versiunea ${v.version}`,
      subtitle: rec.names.ro,
      body: `
        <div class="e-permits-dosar-profil__card">${[
          ["Tipul modificării", esc(v.type)],
          ["Data", esc(stamp(v.at))],
          ["Autor", esc(v.by)],
          ["Ce s-a schimbat", esc(v.note)]
        ].map(G().detailRow).join("")}</div>
        ${configCards(rec, v.config)}`,
      footer: `<div class="modal-buttons">${can("exportVersion") ? `<button class="btn btn-neutral btn-rounded" type="button" data-rgv-export="${v.nr}">${icon("export")}<span>Exportă</span></button>` : ""}<button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>`
    });
  }
  function exportVersion(nr) {
    const rec = recordOf(D?.id || P.id);
    const v = versionOf(rec, nr);
    if (!v) return;
    const name = `${rec.code}-${v.version}.geapcfg.json`;
    const body = { format: "geapcfg", code: rec.code, name: rec.names, object: rec.object, scope: rec.scope, authority: rec.authority, service: rec.service, version: v.version, type: v.type, note: v.note, publishedAt: v.at, publishedBy: v.by, config: v.config };
    download(`${JSON.stringify(body, null, 2)}\n`, name, "application/json");
    audit(rec, "Export versiune registru", `${v.version} · ${name}`);
    toast(`Am exportat ${name}.`);
  }
  let restoring = null;
  function openRestore(nr) {
    const rec = recordOf(D?.id || P.id);
    const v = versionOf(rec, nr);
    if (!v) return;
    restoring = { id: rec.id, nr: v.nr };
    const now = rec.published || rec.config;
    const lostCols = now.columns.filter((c) => !v.config.columns.some((x) => x.key === c.key)).map((c) => `„${c.label}”`);
    const lostActs = now.actions.filter((a) => !v.config.actions.some((x) => x.key === a.key)).map((a) => `„${a.label}”`);
    const lost = [lostCols.length && `coloanele ${lostCols.join(", ")}`, lostActs.length && `acțiunile ${lostActs.join(", ")}`].filter(Boolean);
    raiseModal(true);
    G().openModal?.({
      kind: "restore",
      title: `Restaurare versiune ${v.version}`,
      subtitle: rec.names.ro,
      body: `
        <p class="e-permits-passport__lead">${esc(`Configurația versiunii ${v.version} devine versiunea nouă ${nextVersion(rec)}, publicată. Utilizatorii din BackOffice o văd imediat.`)}</p>
        ${lost.length
          ? U().renderNotice?.("warning", `<strong>Câmpuri eliminate.</strong> Față de versiunea curentă dispar ${esc(lost.join(" și "))}.`) || ""
          : U().renderInfoNote?.("Versiunea are aceleași coloane și acțiuni ca versiunea curentă.") || ""}
        ${areaField("restore-note", "Ce s-a schimbat", "", { required: true, max: 500, idPrefix: "rgv", placeholder: "De ce revii la această versiune" })}`,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-rgv-restore-confirm>Restaurează</button></div>'
    });
  }
  function confirmRestore() {
    if (!restoring) return;
    const field = document.querySelector("#rgv-restore-note");
    const note = field?.value.trim() || "";
    if (!note) { setModalError(field, "Descrieți ce s-a schimbat."); return; }
    const rec = recordOf(restoring.id);
    const v = versionOf(rec, restoring.nr);
    const next = nextVersion(rec);
    rec.config = clone(v.config);
    rec.published = clone(v.config);
    rec.publishedVersion = next; rec.version = next; rec.publishedAt = nowIso();
    rec.status = "Publicat"; rec.unpublished = false;
    rec.versions.push({ nr: rec.versions.length + 1, version: next, type: `Restaurare (din ${v.version})`, note, at: nowIso(), by: userName(), config: clone(v.config) });
    touch(rec);
    audit(rec, "Restaurare versiune registru", `${v.version} → ${next}`);
    G().commit();
    restoring = null;
    G().closeModal?.();
    if (D?.mode === "versions") { D.page = 1; D.sort = { key: "nr", dir: "desc" }; renderDrawer(); }
    if (profileOpen()) renderProfile();
    refreshList();
    toast(`Versiunea ${v.version} a fost restaurată ca ${next}.`);
  }
  /* an error under a dialog's field (FO textarea error look) */
  function setModalError(field, message) {
    if (!field) return;
    const box = field.closest(".e-permits-fo-textarea");
    box?.classList.add("is-error");
    field.setAttribute("aria-invalid", "true");
    const fieldWrap = field.closest(".e-permits-fo-field");
    fieldWrap.querySelector(".e-permits-fo-field__error")?.remove();
    fieldWrap.insertAdjacentHTML("beforeend", errorHtml(field.id, message));
    field.setAttribute("aria-describedby", `${field.id}-error`);
    field.focus();
    field.addEventListener("input", () => { box?.classList.remove("is-error"); field.removeAttribute("aria-invalid"); fieldWrap.querySelector(".e-permits-fo-field__error")?.remove(); }, { once: true });
  }

  /* ================================================================ US-150 publish */
  /* what a config changes against another (the publish warning AC-05, the editor's review of unsaved changes) */
  const COLUMN_PROPS = [["label", "Antet (RO)"], ["labels.ru", "Antet (RU)"], ["labels.en", "Antet (EN)"], ["width", "Lățime"], ["align", "Aliniere"], ["visible", "Vizibilă implicit"], ["sortable", "Sortabilă"], ["filter", "Filtru"]];
  const ACTION_PROPS = [["type", "Tipul acțiunii"], ["target", "Ținta"], ["label", "Denumire (RO)"], ["labels.ru", "Denumire (RU)"], ["labels.en", "Denumire (EN)"], ["icon", "Pictogramă"], ["roles", "Vizibilă rolurilor"]];
  const getPath = (o, path) => path.split(".").reduce((x, k) => x?.[k], o);
  const showValue = (path, value) => {
    if (path === "filter") return value ? filterLabel(value) : "fără";
    if (path === "align") return ALIGN.find(([k]) => k === value)?.[1] || "Stânga";
    if (path === "type") return typeLabel(value);
    if (path === "target") return value ? G().targetLabel?.({ target: value }) || value : "—";
    if (path === "roles") return value?.length ? value.map(roleLabel).join(", ") : "toate";
    if (typeof value === "boolean") return value ? "Da" : "Nu";
    return value === "" || value == null ? "—" : String(value);
  };
  function diffConfig(rec, before, after) {
    const out = [];
    const b = before || { columns: [], actions: [], predefinedFilter: null };
    const listDiff = (group, kind, bl, al, props, nameOf) => {
      al.forEach((x) => {
        const old = bl.find((y) => y.key === x.key);
        if (!old) { out.push({ group, title: nameOf(x), tag: ["Se adaugă", "success"], detail: kind === "col" ? `Câmp: ${fieldOf(rec, x.key)?.label || x.key}` : typeLabel(x.type), undo: `${kind}:add:${x.key}` }); return; }
        const changes = props.filter(([p]) => !same(getPath(old, p), getPath(x, p))).map(([p, label]) => `${label}: ${showValue(p, getPath(old, p))} → ${showValue(p, getPath(x, p))}`);
        if (changes.length) out.push({ group, title: nameOf(x), tag: ["Modificat", "brand"], detail: changes.join("; "), undo: `${kind}:chg:${x.key}` });
      });
      bl.filter((y) => !al.some((x) => x.key === y.key)).forEach((y) => out.push({ group, title: nameOf(y), tag: ["Se elimină", "danger"], detail: kind === "col" ? "Coloana dispare din registru" : "Acțiunea dispare din meniul rândului", undo: `${kind}:del:${y.key}` }));
      const common = al.filter((x) => bl.some((y) => y.key === x.key)).map((x) => x.key);
      const commonBefore = bl.filter((y) => common.includes(y.key)).map((y) => y.key);
      if (!same(common, commonBefore)) out.push({ group, title: kind === "col" ? "Ordinea coloanelor" : "Ordinea acțiunilor", tag: ["Modificat", "brand"], detail: common.map((k) => nameOf(al.find((x) => x.key === k))).join(" · "), undo: `${kind}:order` });
    };
    listDiff("Coloane", "col", b.columns, after.columns, COLUMN_PROPS, (c) => c.label || c.key);
    const fb = b.predefinedFilter?.rules?.length ? b.predefinedFilter : null;
    const fa = after.predefinedFilter?.rules?.length ? after.predefinedFilter : null;
    if (!same(fb && { logic: fb.logic, rules: fb.rules }, fa && { logic: fa.logic, rules: fa.rules })) {
      const text = (f) => (f ? `${plural(f.rules.length, "regulă", "reguli")} (${f.logic === "or" ? "Sau" : "Și"})` : "fără condiție");
      out.push({ group: "Filtru predefinit", title: "Filtru predefinit", tag: ["Modificat", "brand"], detail: `${text(fb)} → ${text(fa)}`, undo: "filter" });
    }
    listDiff("Acțiuni pe rând", "act", b.actions, after.actions, ACTION_PROPS, (a) => a.label || typeLabel(a.type));
    return out;
  }
  /* AC-08…10: what the platform rejects at publish */
  function publishProblems(rec, config) {
    const problems = [];
    config.columns.forEach((c) => {
      const f = fieldOf(rec, c.key);
      if (!f) { problems.push(`Coloana „${c.label}” nu mai există în obiectul-sursă.`); return; }
      const support = G().filterSupport?.[f.type] || [];
      if (c.sortable && f.type === "svc") problems.push(`Coloana „${c.label}” nu suportă sortarea.`);
      if (c.filter && !support.includes(c.filter)) problems.push(`Coloana „${c.label}” nu suportă filtrul „${filterLabel(c.filter)}”.`);
      if (!String(c.label || "").trim()) problems.push(`O coloană (${f.label}) nu are antet în română.`);
    });
    (config.predefinedFilter?.rules || []).forEach((r, i) => {
      if (!fieldOf(rec, r.column)) problems.push(`Regula ${i + 1} a filtrului predefinit folosește o coloană care nu există.`);
      else if (!NO_VALUE.includes(r.op) && !String(r.value || "").trim()) problems.push(`Regula pentru „${fieldOf(rec, r.column).label}” nu are valoare.`);
    });
    config.actions.forEach((a) => {
      if (!typesFor(rec.object).some(([k]) => k === a.type)) problems.push(`Acțiunea „${a.label}” are un tip care nu este disponibil pentru ${objectLabel(rec.object).toLocaleLowerCase("ro")}.`);
      else if (a.type !== "open" && !targetsOf(a.type, rec.object).some(([id]) => id === a.target)) problems.push(`Acțiunea „${a.label}” nu are o țintă validă.`);
    });
    return problems;
  }
  let publishing = null;
  function openPublish() {
    const rec = recordOf(P.id);
    if (!rec || !can("publish")) return;
    publishing = { id: rec.id, problems: [] };
    renderPublish();
  }
  function renderPublish(focusSel = "") {
    const rec = recordOf(publishing.id);
    const changes = diffConfig(rec, rec.published, rec.config);
    const empty = !rec.config.columns.length;
    const note = document.querySelector("#rgp-publish-note")?.value || "";
    const changeRows = changes.map((c) => [`${c.group} · ${c.title}`, `${tag(c.tag[0], c.tag[1])}<span>${esc(c.detail)}</span>`]);
    G().openModal?.({
      kind: "publish",
      title: "Publicare versiune",
      subtitle: rec.names.ro,
      body: `
        <p class="e-permits-passport__lead">Versiunea publicată curentă: <strong>${esc(rec.publishedVersion || "—")}</strong> · versiunea nouă: <strong>${esc(nextVersion(rec))}</strong></p>
        ${publishing.problems.length ? U().renderNotice?.("error", `<strong>Publicarea a fost respinsă.</strong> ${publishing.problems.map(esc).join(" ")}`, { role: "alert" }) || "" : ""}
        ${empty ? U().renderNotice?.("error", "<strong>Registrul nu are nicio coloană</strong> · Adaugă cel puțin o coloană în „Configurează registrul”, apoi publică.", { role: "alert" }) || "" : ""}
        ${rec.status === "Depreciat" ? U().renderNotice?.("warning", "Registrul este depreciat și nu va fi vizibil în BackOffice.") || "" : ""}
        ${!empty && changes.length
          ? `${U().renderNotice?.("warning", `<strong>${rec.publishedVersion ? `Configurația se schimbă față de ${esc(rec.publishedVersion)}` : "Prima publicare"}.</strong> ${esc(plural(changes.length, "modificare", "modificări"))}: utilizatorii din BackOffice văd noua configurație imediat după publicare.`) || ""}
            <div class="e-permits-dosar-profil__card e-permits-reg-changes">${changeRows.map(G().detailRow).join("")}</div>`
          : !empty ? U().renderInfoNote?.("Nu au fost identificate efecte asupra configurației.") || "" : ""}
        ${areaField("publish-note", "Ce s-a schimbat", note, { required: true, max: 500, idPrefix: "rgp", placeholder: "De ex. coloana „Tip solicitare” devine vizibilă" })}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-rgp-confirm${empty ? ' aria-disabled="true" data-tooltip-reason="Registrul nu are nicio coloană."' : ""}>Publică</button></div>`
    });
    if (focusSel) document.querySelector(focusSel)?.focus();
  }
  function confirmPublish(button) {
    if (!publishing || button.getAttribute("aria-disabled") === "true") return;
    const rec = recordOf(publishing.id);
    const field = document.querySelector("#rgp-publish-note");
    const note = field?.value.trim() || "";
    const problems = publishProblems(rec, rec.config);
    if (problems.length) {
      publishing.problems = problems;
      audit(rec, "Publicare respinsă", problems.join(" "));
      renderPublish("#rgp-publish-note");
      return;
    }
    if (!note) { setModalError(field, "Descrieți ce s-a schimbat."); return; }
    const next = nextVersion(rec);
    const first = !rec.publishedVersion;
    rec.published = clone(rec.config);
    rec.publishedVersion = next; rec.version = next; rec.publishedAt = nowIso();
    if (rec.status !== "Depreciat") rec.status = "Publicat";
    rec.unpublished = false;
    rec.versions.push({ nr: rec.versions.length + 1, version: next, type: first ? "Prima publicare" : "Publicare", note, at: nowIso(), by: userName(), config: clone(rec.config) });
    touch(rec);
    audit(rec, "Publicare registru", `${next} · ${note}`);
    G().commit();
    publishing = null;
    G().closeModal?.();
    renderProfile();
    refreshList();
    toast(`Versiunea ${next} a registrului „${rec.names.ro}” a fost publicată.${rec.status === "Depreciat" ? " Registrul rămâne depreciat." : ""}`);
  }

  /* ================================================================ US-193 deprecate / reactivate */
  function deprecate() {
    const rec = recordOf(P.id);
    U().askConfirm?.({
      title: "Confirmare",
      text: `Depreciezi registrul „${rec.names.ro}”? Registrul dispare din meniul „Registre” al BackOffice pentru toți utilizatorii, indiferent de accesul acordat. Configurația, accesul și istoricul versiunilor rămân; îl poți reactiva oricând.`,
      confirmLabel: "Confirmă",
      destructive: true
    }, () => {
      rec.status = "Depreciat";
      rec.deprecatedAt = nowIso();
      touch(rec);
      audit(rec, "Depreciere registru");
      G().commit();
      renderProfile();
      refreshList();
      toast(`Registrul „${rec.names.ro}” a fost depreciat. Nu mai apare în BackOffice.`);
    });
  }
  function reactivate() {
    const rec = recordOf(P.id);
    /* constraint: no columns → the reactivation is refused and the register stays deprecated */
    if (!rec.config.columns.length && !(rec.published?.columns || []).length) {
      toast(`Registrul „${rec.names.ro}” nu se poate reactiva: nu are nicio coloană. Configurează coloanele, apoi reactivează-l.`, "error", { duration: 0, key: "rga-reactivate" });
      audit(rec, "Reactivare respinsă", "Registrul nu are nicio coloană.");
      return;
    }
    U().askConfirm?.({
      title: "Confirmare",
      text: rec.publishedVersion
        ? `Reactivezi registrul „${rec.names.ro}”? Revine în BackOffice cu versiunea publicată ${rec.publishedVersion}, pentru rolurile cu acces, fără o publicare nouă.`
        : `Reactivezi registrul „${rec.names.ro}”? Nu a fost publicat niciodată: revine ca schiță și apare în BackOffice după prima publicare.`,
      confirmLabel: "Confirmă"
    }, () => {
      rec.status = rec.publishedVersion ? (rec.unpublished ? "Schiță" : "Publicat") : "Schiță";
      delete rec.deprecatedAt;
      touch(rec);
      audit(rec, "Reactivare registru");
      G().commit();
      renderProfile();
      refreshList();
      toast(`Registrul „${rec.names.ro}” a fost reactivat.`);
    });
  }

  /* ================================================================ US-215 revoke */
  function revoke(id) {
    const rec = recordOf(P.id);
    const g = rec.grants.find((x) => x.id === id);
    if (!g) return;
    U().askConfirm?.({
      title: "Retrage accesul",
      text: `Retrageți acest acces la registru? Rolul „${roleLabel(g.role)}” (${g.authority || "toate autoritățile"}) pierde imediat accesul la „${rec.names.ro}”.`,
      confirmLabel: "Confirmă",
      destructive: true
    }, () => {
      g.revokedAt = nowIso();
      g.revokedBy = userName();
      audit(rec, "Retragere acces registru", `${roleLabel(g.role)} · ${g.authority || "Toate autoritățile"}`);
      G().commit();
      renderProfile({ keepFocus: "[data-rga-grant]" });
      toast(`Accesul rolului „${roleLabel(g.role)}” a fost retras.`);
    });
  }

  /* ================================================================ US-149 „Configurează registrul” — full-screen sheet */
  let editor = null;
  let E = null;
  function ensureEditor() {
    if (editor) return editor;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="e-permits-ntpl-sheet e-permits-reg-editor" data-rga-editor hidden>
        <div class="e-permits-ntpl-sheet__scrim" aria-hidden="true"></div>
        <div class="e-permits-ntpl-sheet__panel e-permits-reg-editor__panel" role="dialog" aria-modal="true" aria-label="Configurează registrul" tabindex="-1">
          <button class="modal-close e-permits-reg-editor__close" type="button" aria-label="Închide editorul" data-rga-editor-close>${icon("cross-large", 16)}</button>
          <header class="e-permits-page-header e-permits-reg-editor__header">
            <div class="e-permits-page-header__body"><div class="e-permits-page-header__top" data-rga-editor-top></div></div>
            <div class="tabs tabs--sm e-permits-page-header__tabs"><div class="tab-buttons" role="tablist" aria-label="Configurarea registrului" data-rga-editor-tabs></div></div>
          </header>
          <div class="e-permits-reg-editor__body" role="tabpanel" data-rga-editor-body></div>
          <div class="e-permits-cfg2__bar e-permits-reg-editor__bar" role="region" aria-label="Salvarea configurației" data-rga-editor-bar></div>
        </div>
      </div>`);
    editor = document.querySelector("[data-rga-editor]");
    /* the stacked lists' meta lines: no leading dot on a wrapped line (the shell syncs the profile panels only) */
    if ("ResizeObserver" in window) new ResizeObserver(() => A().syncStackMetaRows?.(editor)).observe(editor.querySelector("[data-rga-editor-body]"));
    editor.addEventListener("click", onEditorClick);
    editor.addEventListener("input", onEditorInput);
    editor.addEventListener("change", onEditorChange);
    editor.addEventListener("keydown", onEditorKeydown);
    ["dragstart", "dragover", "drop", "dragend"].forEach((type) => editor.addEventListener(type, onEditorDrag));
    /* Esc closes the editor (no confirmation, AC-28) unless a menu / list / dialog above handles it */
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || editor.hidden) return;
      if (document.querySelector(".modal-overlay.is-active, [data-stack-menu]:not([hidden]), .e-permits-fo-select__list:not([hidden])")) return;
      if (editor.querySelector("[aria-expanded='true']")) return;
      event.preventDefault();
      closeEditor();
    });
    return editor;
  }
  function openEditor(tab = "coloane") {
    const rec = recordOf(P.id);
    if (!rec || !can("edit")) return;
    E = {
      id: rec.id, tab, draft: clone(rec.config), base: clone(rec.config), selCol: rec.config.columns[0]?.key || null, selAct: rec.config.actions[0]?.key || null,
      query: "", collapsed: new Set(), errors: { rules: {}, columns: {}, actions: {} }, footerError: "", back: document.activeElement
    };
    if (!E.draft.predefinedFilter) E.draft.predefinedFilter = null;
    registerSource();
    const el = ensureEditor();
    renderEditor();
    el.hidden = false;
    document.documentElement.classList.add("is-reg-editor-open");
    requestAnimationFrame(() => el.querySelector(`[data-rga-editor-tab="${tab}"]`)?.focus());
  }
  function closeEditor() {
    if (!editor || editor.hidden) return;
    editor.hidden = true;
    document.documentElement.classList.remove("is-reg-editor-open");
    const back = E?.back;
    E = null;
    if (back?.isConnected) back.focus(); else document.querySelector("[data-rga-configure]")?.focus();
  }
  const editorRec = () => recordOf(E.id);
  const changes = () => diffConfig(editorRec(), E.base, E.draft);
  function renderEditor({ focus = "", body = true } = {}) {
    if (!E) return;
    const rec = editorRec();
    const el = ensureEditor();
    const active = document.activeElement;
    const keep = focus || (active && el.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const scrolls = [...el.querySelectorAll("[data-rga-scroll]")].map((s) => [s.dataset.rgaScroll, s.scrollTop]);
    el.querySelector("[data-rga-editor-top]").innerHTML = A().renderPageHeaderTop({
      crumbs: [{ label: "Registre", attr: "data-rga-editor-close" }, { label: rec.names.ro, attr: "data-rga-editor-close" }, { label: "Configurare" }],
      title: "Configurează registrul"
    });
    const counts = { coloane: E.draft.columns.length, filtru: E.draft.predefinedFilter?.rules?.length || 0, actiuni: E.draft.actions.length };
    el.querySelector("[data-rga-editor-tabs]").innerHTML = [["coloane", "Coloane"], ["filtru", "Filtru"], ["actiuni", "Acțiuni"]].map(([id, label]) => {
      const on = id === E.tab;
      const err = id === "filtru" ? Object.keys(E.errors.rules).length : id === "actiuni" ? Object.keys(E.errors.actions).length : Object.keys(E.errors.columns).length;
      return `<button class="tab-button${on ? " active" : ""}" id="rga-etab-${id}" type="button" role="tab" aria-selected="${on}" aria-controls="rga-editor-panel" tabindex="${on ? 0 : -1}" data-rga-editor-tab="${id}">
        <span>${label}</span>${counts[id] ? A().renderPageHeaderTabCount?.(counts[id], err ? "danger" : undefined) || "" : ""}
      </button>`;
    }).join("");
    const panel = el.querySelector("[data-rga-editor-body]");
    panel.id = "rga-editor-panel";
    panel.setAttribute("aria-labelledby", `rga-etab-${E.tab}`);
    if (body) {
      panel.innerHTML = E.tab === "filtru" ? filterPane(rec) : E.tab === "actiuni" ? actionsPane(rec) : columnsPane(rec);
      R().bind?.(panel);
    }
    renderBar();
    A().syncStackMetaRows?.(el);
    scrolls.forEach(([k, top]) => { const s = el.querySelector(`[data-rga-scroll="${k}"]`); if (s) s.scrollTop = top; });
    if (keep) {
      const target = el.querySelector(keep);
      target?.focus?.({ preventScroll: true });
      if (caret && target && "setSelectionRange" in target) { try { target.setSelectionRange(caret[0], caret[1]); } catch { /* not a text field */ } }
    }
  }
  function renderBar() {
    const n = changes().length;
    const errs = Object.keys(E.errors.rules).length + Object.keys(E.errors.actions).length + Object.keys(E.errors.columns).length;
    editor.querySelector("[data-rga-editor-bar]").innerHTML = `
      <p class="e-permits-cfg2__bar-text" aria-live="polite">${n ? A().renderHeaderStatus?.(n === 1 ? "1 modificare nesalvată" : `${n} modificări nesalvate`, "warning", A().changesStatusAttrs?.("registre-config") || "") || "" : '<span class="e-permits-reg-editor__saved">Nicio modificare nesalvată</span>'}${E.footerError && errs ? ` · <span class="e-permits-cfg2__bar-error">${esc(E.footerError)}</span>` : ""}</p>
      <div class="e-permits-cfg2__bar-actions">
        <button class="btn btn-neutral btn-sm" type="button" data-rga-editor-close>Anulează</button>
        <button class="btn btn-primary btn-sm" type="button" data-rga-editor-save>Salvează</button>
      </div>`;
  }

  /* ---- tab Coloane: available fields · the register's columns · the selected column's properties */
  function columnsPane(rec) {
    const used = new Set(E.draft.columns.map((c) => c.key));
    const q = (E.query || "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro").trim();
    const free = fieldsOf(rec).filter((f) => !used.has(f.key) && (!q || f.label.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro").includes(q)));
    const groups = [...new Set(free.map((f) => f.group))].map((g) => [g, free.filter((f) => f.group === g)]);
    const groupsHtml = groups.length ? groups.map(([group, fields]) => {
      const open = q || !E.collapsed.has(group);
      return `
        <section class="e-permits-dtpl-fields__group">
          <button class="e-permits-dtpl-fields__head" type="button" aria-expanded="${open}" data-rga-group="${esc(group)}">
            <span class="e-permits-dtpl-fields__title">${esc(group)}</span>
            <span class="e-permits-page-header__tab-count">${fields.length}</span>
            ${icon(open ? "chevron-top" : "chevron-bottom", 16)}
          </button>
          ${open ? `<ul class="e-permits-dtpl-fields__list" role="list">${fields.map((f) => `
            <li><button class="e-permits-fo-intent-menu__item e-permits-ntpl-picker__item" type="button" data-rga-add-col="${esc(f.key)}" aria-label="Adaugă coloana ${esc(f.label)}">
              <span class="e-permits-ntpl-picker__label">${esc(f.label)}</span>
              <span class="e-permits-ntpl-picker__token">${esc(G().fieldTypes?.[f.type] || f.type)}</span>
            </button></li>`).join("")}</ul>` : ""}
        </section>`;
    }).join("") : window.GEAPEmptyState?.noResults?.(q ? "Nicio coloană nu corespunde căutării" : "Toate coloanele sunt în registru", { text: q ? "Caută după denumirea câmpului." : "Elimină o coloană din registru ca s-o vezi aici din nou.", bare: true, compact: true }) || "";
    const cols = E.draft.columns;
    const last = cols.length - 1;
    const list = cols.length ? `<ul class="e-permits-stack__list" role="list">${cols.map((c, i) => {
      const f = fieldOf(rec, c.key);
      const err = E.errors.columns[c.key];
      return A().renderStackItem?.({
        plainTitle: c.label,
        title: esc(c.label || "Coloană fără antet"),
        leadHtml: orderLead(i + 1, true),
        rowAttrs: `data-rga-col="${esc(c.key)}" data-index="${i}" tabindex="0" data-stack-row-open aria-label="Coloana ${esc(c.label || f?.label || c.key)}, poziția ${i + 1} — deschide proprietățile"${E.selCol === c.key ? ' aria-current="true"' : ""}`,
        badges: [...columnBadges(rec, c), err && tag("De corectat", "danger")].filter(Boolean),
        meta: [esc(`Câmp: ${f?.label || c.key}`), esc(`${c.width} px · ${alignLabel(c.align)}`)],
        actionsHtml: `
          <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Mută „${esc(c.label)}” mai sus" data-tooltip-label="Mută mai sus" data-rga-col-move="${esc(c.key)}|-1"${i === 0 ? " disabled" : ""}>${icon("arrow-up", 16)}</button>
          <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Mută „${esc(c.label)}” mai jos" data-tooltip-label="Mută mai jos" data-rga-col-move="${esc(c.key)}|1"${i === last ? " disabled" : ""}>${icon("arrow-down", 16)}</button>
          <button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină coloana „${esc(c.label)}”" data-tooltip-label="Elimină coloana" data-rga-col-remove="${esc(c.key)}">${icon("delete", 16)}</button>`
      }).replace('<li class="e-permits-stack__item', `<li draggable="true" class="e-permits-stack__item${E.selCol === c.key ? " is-selected" : ""}`) || "";
    }).join("")}</ul>` : window.GEAPEmptyState?.render({ title: "Nicio coloană încă", text: "Alege coloanele din „Coloane disponibile”. Fără coloane registrul nu se poate publica.", icon: "page-text", compact: true }) || "";
    return `
      <div class="e-permits-reg-editor__grid e-permits-reg-editor__grid--3">
        <aside class="e-permits-dtpl-fields e-permits-reg-editor__fields" aria-labelledby="rga-fields-title" data-rga-scroll="fields">
          <h2 class="e-permits-dtpl-fields__heading" id="rga-fields-title">Coloane disponibile</h2>
          <p class="e-permits-dtpl-fields__hint">Câmpurile obiectului-sursă care nu sunt în registru. Apasă pe un câmp ca să-l adaugi.</p>
          <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill${E.query ? " has-value is-ready" : ""}">
            <span class="icon-search" aria-hidden="true">${icon("search")}</span>
            <input class="input" type="search" id="rga-col-search" placeholder="Caută coloane" aria-label="Caută coloane" autocomplete="off" value="${esc(E.query)}" data-rga-col-search>
            <div class="btn-group"><button type="button" class="btn-icon clear" aria-label="Șterge căutarea" data-rga-col-search-clear>${icon("cross-small", 16)}</button></div>
          </div>
          <div class="e-permits-dtpl-fields__groups">${groupsHtml}</div>
        </aside>
        <section class="e-permits-reg-editor__main" aria-labelledby="rga-cols-title" data-rga-scroll="main">
          <div class="e-permits-dosar-profil__section-heading">
            <h2 class="e-permits-dosar-profil__section-title" id="rga-cols-title">Coloanele registrului</h2>
            <span class="e-permits-dosar-profil__section-meta" aria-live="polite">${esc(plural(cols.length, "coloană", "coloane"))}</span>
          </div>
          <div class="e-permits-stack e-permits-reg-editor__stack">${list}</div>
        </section>
        <aside class="e-permits-reg-editor__props" aria-labelledby="rga-props-title" data-rga-scroll="props">${columnProps(rec)}</aside>
      </div>`;
  }
  function columnProps(rec) {
    const c = E.draft.columns.find((x) => x.key === E.selCol);
    if (!c) return `<h2 class="e-permits-reg-editor__props-title" id="rga-props-title">Proprietățile coloanei</h2>${window.GEAPEmptyState?.render({ title: "Nicio coloană aleasă", text: "Alege o coloană din registru ca să-i schimbi antetul, lățimea sau filtrul.", icon: "settings", compact: true }) || ""}`;
    const f = fieldOf(rec, c.key);
    const svc = f?.type === "svc";
    const support = G().filterSupport?.[f?.type] || [];
    const err = E.errors.columns[c.key] || {};
    return `
      <h2 class="e-permits-reg-editor__props-title" id="rga-props-title">Proprietățile coloanei</h2>
      <p class="e-permits-dtpl-fields__hint">Câmp: ${esc(f?.label || c.key)} · ${esc(G().fieldTypes?.[f?.type] || "")}</p>
      ${svc ? U().renderInfoNote?.("Câmp propriu al serviciului: se folosește doar pentru afișare — sortarea și filtrarea nu sunt disponibile.") || "" : ""}
      ${grid(
        textField("col-ro", "Antet (RO)", c.label, { required: true, max: 60, error: err.label }),
        textField("col-ru", "Antet (RU)", c.labels?.ru || "", { max: 60, span: 6 }),
        textField("col-en", "Antet (EN)", c.labels?.en || "", { max: 60, span: 6 }),
        textField("col-width", "Lățime (px)", c.width, { span: 6, inputmode: "numeric", max: 3, hint: "Între 80 și 480." }),
        `<div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
          <span class="e-permits-cfg-ro__label" id="rga-col-align-label">Aliniere</span>
          ${A().renderChoiceChips?.({ label: "Aliniere", labelId: "rga-col-align-label", name: "rga-align", options: ALIGN, value: c.align || "left" }) || ""}
        </div>`
      )}
      <div class="e-permits-reg-editor__switches">
        ${A().renderToggle?.({ label: "Vizibilă implicit", description: "Ascunsă, rămâne disponibilă pentru căutare și filtrare.", checked: c.visible, attrs: 'data-rga-col-flag="visible"' }) || ""}
        ${A().renderToggle?.({ label: "Sortabilă", description: svc ? "Indisponibil pentru câmpurile serviciului." : "Clic pe antet sortează registrul.", checked: c.sortable, disabled: svc, attrs: 'data-rga-col-flag="sortable"' }) || ""}
        ${A().renderToggle?.({ label: "Filtrabilă", description: svc ? "Indisponibil pentru câmpurile serviciului." : "Apare în „Filtre” din BackOffice.", checked: Boolean(c.filter), disabled: svc, attrs: 'data-rga-col-flag="filter"' }) || ""}
      </div>
      ${c.filter ? grid(selectField("col-filter", "Tipul filtrului", FILTERS, c.filter, {
        hint: support.includes(c.filter) ? "" : `Câmpul nu suportă acest filtru (${support.length ? support.map(filterLabel).join(" sau ") : "niciun filtru"}): publicarea va fi respinsă.`
      })) : ""}`;
  }

  /* ---- tab Filtru: the Documente rule builder markup (sentence rows, „și ▾ / sau” between them) */
  const kw = (text) => `<code class="e-permits-doc-kw">${esc(text)}</code>`;
  function filterPane(rec) {
    const pf = E.draft.predefinedFilter;
    const rules = pf?.rules || [];
    const fields = fieldsOf(rec).filter((f) => f.type !== "svc");
    const shown = new Set(E.draft.columns.map((c) => c.key));
    const options = fields.map((f) => [f.key, `${f.label}${shown.has(f.key) ? "" : " (neafișată)"}`]);
    const add = `<button class="btn btn-text-primary btn-sm" type="button" data-rga-rule-add>${icon("plus-large", 16)}<span>Adaugă regulă</span></button>`;
    const sel = (id, attrs, placeholder, opts, value, { error = false } = {}) => U().renderFoSelectControl?.({ id, attrs, error, label: (attrs.match(/aria-label="([^"]*)"/) || [])[1] || "", optionsHtml: `<option value=""${value ? "" : " selected"} disabled>${esc(placeholder)}</option>${opts.map(([v, l]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(l)}</option>`).join("")}` }) || "";
    const condRow = (r, i) => {
      const f = fieldOf(rec, r.column);
      const err = E.errors.rules[i];
      const needs = !NO_VALUE.includes(r.op);
      const values = f?.type === "enum" && ["is", "isNot"].includes(r.op) ? G().valuesOf?.(rec.object, r.column) || [] : [];
      const control = values.length
        ? sel(`rga-rule-value-${i}`, `data-rga-rule="${i}" data-rga-rule-part="value" aria-label="Valoare"`, "Alege valoarea", values.map((v) => [v, v]), r.value, { error: Boolean(err) })
        : `<div class="e-permits-fo-input${err ? " is-error" : ""}"><input id="rga-rule-value-${i}" type="text" value="${esc(r.value)}" placeholder="${f?.type === "date" ? "zz.ll.aaaa" : "Valoare"}" aria-label="Valoare" autocomplete="off"${err ? ` aria-invalid="true" aria-describedby="rga-rule-value-${i}-error"` : ""} data-rga-rule="${i}" data-rga-rule-part="value"></div>`;
      /* the value is a plain FO field (the Documente value group adds a „Valoare / Alt câmp” part this filter has not);
         „este gol” / „are valoare” need none: the same field, disabled */
      const value = needs
        ? control
        : `<div class="e-permits-fo-input is-disabled"><input id="rga-rule-value-${i}" type="text" value="" placeholder="Fără valoare" aria-label="Valoare (nu este necesară)" disabled></div>`;
      return `
        <li class="e-permits-doc-cond" data-rga-cond="${i}">
          <div class="e-permits-doc-cond__cell">${sel(`rga-rule-col-${i}`, `data-rga-rule="${i}" data-rga-rule-part="column" aria-label="Coloana regulii ${i + 1}"`, "Coloană", options, r.column)}</div>
          <div class="e-permits-doc-cond__cell e-permits-doc-cond__cell--op">${sel(`rga-rule-op-${i}`, `data-rga-rule="${i}" data-rga-rule-part="op" aria-label="Operatorul regulii ${i + 1}"`, "Operator", OPS, r.op)}</div>
          <div class="e-permits-doc-cond__cell">${value}${err ? errorHtml(`rga-rule-value-${i}`, err) : ""}</div>
          <button class="btn btn-text-destructive btn-sm btn-icon-only e-permits-doc-cond__remove" type="button" aria-label="Elimină regula ${i + 1}" data-tooltip-label="Elimină regula" data-rga-rule-remove="${i}">${icon("delete", 16)}</button>
        </li>`;
    };
    return `
      <div class="e-permits-reg-editor__single" data-rga-scroll="single">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Filtru predefinit</h2>
          <span class="e-permits-dosar-profil__section-meta">${esc(plural(rules.length, "regulă", "reguli"))}</span>
        </div>
        ${U().renderInfoNote?.("Filtrul se aplică permanent registrului publicat și nu se vede în BackOffice: utilizatorii nu îl pot schimba. Coloanele „(neafișată)” filtrează fără să apară în registru.") || ""}
        ${rules.length ? `
          <div class="e-permits-doc-rule e-permits-reg-editor__rule">
            <div class="e-permits-doc-rule__when">${kw("Afișează înregistrările când")}</div>
            <ol class="e-permits-doc-rule__conds" role="list">${rules.map((r, i) => `${i === 0 ? ""
              : i === 1 ? `<li class="e-permits-doc-cond__join e-permits-doc-kwselect" data-fo-list-min="120">${sel("rga-rule-logic", 'data-rga-rule-logic aria-label="Combinarea regulilor"', "și", [["and", "și"], ["or", "sau"]], pf.logic || "and")}</li>`
              : `<li class="e-permits-doc-cond__join">${kw(pf.logic === "or" ? "sau" : "și")}</li>`}${condRow(r, i)}`).join("")}</ol>
            <div class="e-permits-doc-rule__foot">${add}</div>
          </div>` : window.GEAPEmptyState?.render({ title: "Fără condiție", text: "Fără condiție: registrul afișează toate înregistrările disponibile utilizatorului.", icon: "filter", compact: true, actionHtml: add }) || ""}
      </div>`;
  }

  /* ---- tab Acțiuni: the row actions (max 12) · the selected action's properties */
  function actionsPane(rec) {
    const acts = E.draft.actions;
    const full = acts.length >= MAX_ACTIONS;
    const add = `<button class="btn btn-secondary btn-sm" type="button" data-rga-act-add${full ? ` aria-disabled="true" data-tooltip-reason="Un registru are cel mult ${MAX_ACTIONS} acțiuni."` : ""}>${icon("plus-large", 16)}<span>Adaugă acțiune</span></button>`;
    const last = acts.length - 1;
    const list = acts.length ? `<ul class="e-permits-stack__list" role="list">${acts.map((a, i) => A().renderStackItem?.({
      plainTitle: a.label,
      title: esc(a.label || "Acțiune fără denumire"),
      leadHtml: actionLead(a),
      rowAttrs: `data-rga-act="${esc(a.key)}" tabindex="0" data-stack-row-open aria-label="Acțiunea ${esc(a.label || typeLabel(a.type))}, poziția ${i + 1} — deschide proprietățile"${E.selAct === a.key ? ' aria-current="true"' : ""}`,
      badges: [tag(typeLabel(a.type), "neutral"), E.errors.actions[a.key] && tag("De corectat", "danger")].filter(Boolean),
      meta: [esc(a.type === "open" ? "Fișa înregistrării" : `${TARGET_NAME[a.type]}: ${a.target ? targetLabel(a) : "—"}`), esc(`Vizibilă: ${rolesText(a)}`)],
      actionsHtml: `
        <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Mută „${esc(a.label)}” mai sus" data-tooltip-label="Mută mai sus" data-rga-act-move="${esc(a.key)}|-1"${i === 0 ? " disabled" : ""}>${icon("arrow-up", 16)}</button>
        <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Mută „${esc(a.label)}” mai jos" data-tooltip-label="Mută mai jos" data-rga-act-move="${esc(a.key)}|1"${i === last ? " disabled" : ""}>${icon("arrow-down", 16)}</button>
        <button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină acțiunea „${esc(a.label)}”" data-tooltip-label="Elimină acțiunea" data-rga-act-remove="${esc(a.key)}">${icon("delete", 16)}</button>`
    }).replace('<li class="e-permits-stack__item', `<li class="e-permits-stack__item${E.selAct === a.key ? " is-selected" : ""}`) || "").join("")}</ul>`
      : window.GEAPEmptyState?.render({ title: "Nicio acțiune pe rând", text: "Registrul nu are acțiuni pe rând: meniul de la capătul rândului nu apare.", icon: "more-vertical", compact: true }) || "";
    return `
      <div class="e-permits-reg-editor__grid e-permits-reg-editor__grid--2">
        <section class="e-permits-reg-editor__main" aria-labelledby="rga-acts-title" data-rga-scroll="main">
          <div class="e-permits-dosar-profil__section-heading">
            <h2 class="e-permits-dosar-profil__section-title" id="rga-acts-title">Acțiuni pe rând</h2>
            <div class="e-permits-passport__heading-tools">
              <span class="e-permits-dosar-profil__section-meta">${acts.length} din ${MAX_ACTIONS}</span>
              ${add}
            </div>
          </div>
          <div class="e-permits-stack e-permits-reg-editor__stack">${list}</div>
        </section>
        <aside class="e-permits-reg-editor__props" aria-labelledby="rga-props-title" data-rga-scroll="props">${actionProps(rec)}</aside>
      </div>`;
  }
  function actionProps(rec) {
    const a = E.draft.actions.find((x) => x.key === E.selAct);
    if (!a) return `<h2 class="e-permits-reg-editor__props-title" id="rga-props-title">Proprietățile acțiunii</h2>${window.GEAPEmptyState?.render({ title: "Nicio acțiune aleasă", text: "Adaugă o acțiune sau alege una din listă.", icon: "settings", compact: true }) || ""}`;
    const err = E.errors.actions[a.key] || {};
    const targets = targetsOf(a.type, rec.object);
    const icons = data()?.admin?.icons || [];
    const list = roles();
    return `
      <h2 class="e-permits-reg-editor__props-title" id="rga-props-title">Proprietățile acțiunii</h2>
      ${grid(
        selectField("act-type", "Tipul acțiunii", typesFor(rec.object), a.type, { required: true, error: err.type, hint: rec.object === "Permit" ? "Pentru actele permisive: doar procese și controale personalizate." : "" }),
        a.type === "open"
          ? `<div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">${U().renderInfoNote?.("Deschide fișa înregistrării: dosarul, nota de plată sau avizul.") || ""}</div>`
          : selectField("act-target", TARGET_NAME[a.type] || "Ținta", targets, a.target, { required: true, placeholder: `Alege ${a.type === "form" ? "formularul" : a.type === "custom" ? "controlul" : "procesul"}`, error: err.target }),
        textField("act-ro", "Denumirea acțiunii (RO)", a.label, { required: true, max: 60, error: err.label }),
        textField("act-ru", "Denumirea acțiunii (RU)", a.labels?.ru || "", { max: 60, span: 6 }),
        textField("act-en", "Denumirea acțiunii (EN)", a.labels?.en || "", { max: 60, span: 6 })
      )}
      <div class="e-permits-fo-field e-permits-reg-editor__field">
        <span class="e-permits-cfg-ro__label" id="rga-icon-label">Pictogramă</span>
        <div class="e-permits-reg-icons" role="radiogroup" aria-labelledby="rga-icon-label">
          ${icons.map(([name, label]) => {
            const on = a.icon === name;
            return `<button class="btn ${on ? "btn-secondary" : "btn-neutral"} btn-sm btn-icon-only" type="button" role="radio" aria-checked="${on}" tabindex="${on || (!icons.some(([n]) => n === a.icon) && name === icons[0][0]) ? 0 : -1}" aria-label="${esc(label)}" data-tooltip-label="${esc(label)}" data-rga-icon="${esc(name)}">${icon(name, 16)}</button>`;
          }).join("")}
        </div>
      </div>
      <div class="e-permits-fo-field e-permits-reg-editor__field">
        <span class="e-permits-cfg-ro__label" id="rga-act-roles-label">Vizibilă rolurilor</span>
        <div class="e-permits-check-options" role="group" aria-labelledby="rga-act-roles-label">
          ${list.map((r) => U().renderCheckOption?.({ label: r.label, checked: (a.roles || []).includes(r.id), attrs: `value="${esc(r.id)}" data-rga-act-role` }) || "").join("")}
        </div>
        ${(a.roles || []).length ? "" : '<p class="e-permits-fo-field__hint">Fără selecție acțiunea este vizibilă tuturor rolurilor cu acces la registru.</p>'}
      </div>`;
  }

  /* ---- editor events */
  const draftCol = () => E.draft.columns.find((c) => c.key === E.selCol);
  const draftAct = () => E.draft.actions.find((a) => a.key === E.selAct);
  const move = (list, key, by) => {
    const i = list.findIndex((x) => x.key === key);
    const j = i + by;
    if (i < 0 || j < 0 || j >= list.length) return false;
    [list[i], list[j]] = [list[j], list[i]];
    return true;
  };
  const clearErrors = () => { if (Object.keys(E.errors.rules).length + Object.keys(E.errors.columns).length + Object.keys(E.errors.actions).length === 0) E.footerError = ""; };
  function onEditorClick(event) {
    const t = event.target;
    if (!E) return;
    if (t.closest("[data-rga-editor-close]")) { event.preventDefault(); closeEditor(); return; }
    if (t.closest("[data-rga-editor-save]")) { saveEditor(); return; }
    const tab = t.closest("[data-rga-editor-tab]");
    if (tab) { E.tab = tab.dataset.rgaEditorTab; renderEditor({ focus: `[data-rga-editor-tab="${E.tab}"]` }); return; }
    const group = t.closest("[data-rga-group]");
    if (group) { const g = group.dataset.rgaGroup; if (E.collapsed.has(g)) E.collapsed.delete(g); else E.collapsed.add(g); renderEditor({ focus: `[data-rga-group="${CSS.escape(g)}"]` }); return; }
    if (t.closest("[data-rga-col-search-clear]")) { E.query = ""; renderEditor({ focus: "#rga-col-search" }); return; }
    const addCol = t.closest("[data-rga-add-col]");
    if (addCol) {
      const f = fieldOf(editorRec(), addCol.dataset.rgaAddCol);
      if (!f) return;
      E.draft.columns.push(G().columnFrom(f));
      E.selCol = f.key;
      renderEditor({ focus: `[data-rga-col="${CSS.escape(f.key)}"]` });
      return;
    }
    const colMove = t.closest("[data-rga-col-move]");
    if (colMove) { const [key, by] = colMove.dataset.rgaColMove.split("|"); if (move(E.draft.columns, key, Number(by))) renderEditor({ focus: `[data-rga-col-move="${CSS.escape(colMove.dataset.rgaColMove)}"]:not([disabled]), [data-rga-col="${CSS.escape(key)}"]` }); return; }
    const colRemove = t.closest("[data-rga-col-remove]");
    if (colRemove) {
      const key = colRemove.dataset.rgaColRemove;
      const i = E.draft.columns.findIndex((c) => c.key === key);
      E.draft.columns.splice(i, 1);
      delete E.errors.columns[key]; clearErrors();
      if (E.selCol === key) E.selCol = E.draft.columns[Math.min(i, E.draft.columns.length - 1)]?.key || null;
      renderEditor({ focus: E.selCol ? `[data-rga-col="${CSS.escape(E.selCol)}"]` : "#rga-col-search" });
      return;
    }
    const align = t.closest("[data-rga-align]");
    if (align && draftCol()) { draftCol().align = align.dataset.rgaAlign; renderEditor({ focus: `[data-rga-align="${align.dataset.rgaAlign}"]` }); return; }
    const row = t.closest("[data-rga-col]");
    if (row && !t.closest("button, input, a")) { E.selCol = row.dataset.rgaCol; renderEditor({ focus: `[data-rga-col="${CSS.escape(E.selCol)}"]` }); return; }
    /* filter */
    if (t.closest("[data-rga-rule-add]")) {
      E.draft.predefinedFilter ||= { label: "", logic: "and", rules: [] };
      const firstShown = E.draft.columns.find((c) => fieldOf(editorRec(), c.key)?.type !== "svc")?.key || fieldsOf(editorRec())[0]?.key || "";
      E.draft.predefinedFilter.rules.push({ column: firstShown, op: "is", value: "" });
      renderEditor({ focus: `#rga-rule-col-${E.draft.predefinedFilter.rules.length - 1}` });
      return;
    }
    const ruleRemove = t.closest("[data-rga-rule-remove]");
    if (ruleRemove) {
      const i = Number(ruleRemove.dataset.rgaRuleRemove);
      E.draft.predefinedFilter.rules.splice(i, 1);
      if (!E.draft.predefinedFilter.rules.length) E.draft.predefinedFilter = E.base.predefinedFilter ? { ...E.draft.predefinedFilter, rules: [] } : null;
      E.errors.rules = {}; clearErrors();
      renderEditor({ focus: E.draft.predefinedFilter?.rules?.length ? `[data-rga-rule-remove="${Math.max(0, i - 1)}"]` : "[data-rga-rule-add]" });
      return;
    }
    /* actions */
    const actAdd = t.closest("[data-rga-act-add]");
    if (actAdd) {
      if (actAdd.getAttribute("aria-disabled") === "true") return;
      const rec = editorRec();
      const type = typesFor(rec.object)[0][0];
      let n = E.draft.actions.length + 1;
      while (E.draft.actions.some((a) => a.key === `a${n}`)) n += 1;
      const a = { key: `a${n}`, type, label: "", labels: { ru: "", en: "" }, target: "", icon: "document", roles: [] };
      E.draft.actions.push(a);
      E.selAct = a.key;
      renderEditor({ focus: "#rga-act-type" });
      return;
    }
    const actMove = t.closest("[data-rga-act-move]");
    if (actMove) { const [key, by] = actMove.dataset.rgaActMove.split("|"); if (move(E.draft.actions, key, Number(by))) renderEditor({ focus: `[data-rga-act-move="${CSS.escape(actMove.dataset.rgaActMove)}"]:not([disabled]), [data-rga-act="${CSS.escape(key)}"]` }); return; }
    const actRemove = t.closest("[data-rga-act-remove]");
    if (actRemove) {
      const key = actRemove.dataset.rgaActRemove;
      const i = E.draft.actions.findIndex((a) => a.key === key);
      E.draft.actions.splice(i, 1);
      delete E.errors.actions[key]; clearErrors();
      if (E.selAct === key) E.selAct = E.draft.actions[Math.min(i, E.draft.actions.length - 1)]?.key || null;
      renderEditor({ focus: E.selAct ? `[data-rga-act="${CSS.escape(E.selAct)}"]` : "[data-rga-act-add]" });
      return;
    }
    const ic = t.closest("[data-rga-icon]");
    if (ic && draftAct()) { draftAct().icon = ic.dataset.rgaIcon; renderEditor({ focus: `[data-rga-icon="${ic.dataset.rgaIcon}"]` }); return; }
    const actRow = t.closest("[data-rga-act]");
    if (actRow && !t.closest("button, input, a")) { E.selAct = actRow.dataset.rgaAct; renderEditor({ focus: `[data-rga-act="${CSS.escape(E.selAct)}"]` }); }
  }
  function onEditorInput(event) {
    const t = event.target;
    if (!E) return;
    if (t.matches("[data-rga-col-search]")) { E.query = t.value; renderEditor({ focus: "#rga-col-search" }); return; }
    const key = t.dataset.rgaField;
    const c = draftCol();
    const a = draftAct();
    if (key === "col-ro" && c) { c.label = t.value; if (E.errors.columns[c.key]) { delete E.errors.columns[c.key]; clearErrors(); renderEditor(); return; } refreshEditorBits(); return; }
    if (key === "col-ru" && c) { c.labels = { ...c.labels, ru: t.value }; refreshEditorBits(); return; }
    if (key === "col-en" && c) { c.labels = { ...c.labels, en: t.value }; refreshEditorBits(); return; }
    if (key === "col-width" && c) { const n = Number(t.value.replace(/\D/g, "")); if (n) { c.width = Math.max(80, Math.min(480, n)); refreshEditorBits(); } return; }
    if (key === "act-ro" && a) { a.label = t.value; if (E.errors.actions[a.key]?.label) { delete E.errors.actions[a.key].label; if (!Object.keys(E.errors.actions[a.key]).length) delete E.errors.actions[a.key]; clearErrors(); renderEditor(); return; } refreshEditorBits(); return; }
    if (key === "act-ru" && a) { a.labels = { ...a.labels, ru: t.value }; refreshEditorBits(); return; }
    if (key === "act-en" && a) { a.labels = { ...a.labels, en: t.value }; refreshEditorBits(); return; }
    if (t.dataset.rgaRulePart === "value") {
      const i = Number(t.dataset.rgaRule);
      E.draft.predefinedFilter.rules[i].value = t.value;
      if (E.errors.rules[i]) { delete E.errors.rules[i]; clearErrors(); renderEditor(); return; }
      refreshEditorBits();
    }
  }
  /* the list title / tags / tab counts / bar follow a typed value without redrawing the field being typed in */
  function refreshEditorBits() {
    const rec = editorRec();
    if (E.tab === "coloane") {
      const box = editor.querySelector(".e-permits-reg-editor__stack");
      const c = draftCol();
      const row = c && box?.querySelector(`[data-rga-col="${CSS.escape(c.key)}"] .e-permits-stack__title`);
      if (row) row.textContent = c.label || "Coloană fără antet";
      const meta = c && box?.querySelector(`[data-rga-col="${CSS.escape(c.key)}"] .e-permits-stack__meta .e-permits-stack__part:nth-child(2)`);
      if (meta) meta.textContent = `${c.width} px · ${alignLabel(c.align)}`;
    }
    if (E.tab === "actiuni") {
      const a = draftAct();
      const row = a && editor.querySelector(`[data-rga-act="${CSS.escape(a.key)}"] .e-permits-stack__title`);
      if (row) row.textContent = a.label || "Acțiune fără denumire";
    }
    renderBar();
    void rec;
  }
  function onEditorChange(event) {
    const t = event.target;
    if (!E) return;
    const flag = t.dataset.rgaColFlag;
    const c = draftCol();
    if (flag && c) {
      if (flag === "filter") c.filter = t.checked ? (G().filterSupport?.[fieldOf(editorRec(), c.key)?.type] || [])[0] || "text" : null;
      else c[flag] = t.checked;
      renderEditor({ focus: `[data-rga-col-flag="${flag}"]` });
      return;
    }
    if (t.dataset.rgaField === "col-filter" && c) { c.filter = t.value || null; renderEditor({ focus: "#rga-col-filter" }); return; }
    const a = draftAct();
    if (t.dataset.rgaField === "act-type" && a) {
      a.type = t.value;
      a.target = "";
      if (E.errors.actions[a.key]) { delete E.errors.actions[a.key].type; delete E.errors.actions[a.key].target; if (!Object.keys(E.errors.actions[a.key]).length) delete E.errors.actions[a.key]; clearErrors(); }
      renderEditor({ focus: "#rga-act-type" });
      return;
    }
    if (t.dataset.rgaField === "act-target" && a) {
      a.target = t.value;
      /* a fresh action takes the target's name until the administrator writes its own */
      if (!a.label) a.label = (targetsOf(a.type, editorRec().object).find(([id]) => id === t.value)?.[1] || "").split(" · ")[0];
      if (E.errors.actions[a.key]) { delete E.errors.actions[a.key].target; if (a.label) delete E.errors.actions[a.key].label; if (!Object.keys(E.errors.actions[a.key]).length) delete E.errors.actions[a.key]; clearErrors(); }
      renderEditor({ focus: "#rga-act-target" });
      return;
    }
    if (t.matches("[data-rga-act-role]") && a) {
      const set = new Set(a.roles || []);
      if (t.checked) set.add(t.value); else set.delete(t.value);
      a.roles = roles().map((r) => r.id).filter((id) => set.has(id));
      renderEditor({ focus: `input[data-rga-act-role][value="${CSS.escape(t.value)}"]` });
      return;
    }
    if (t.matches("[data-rga-rule-logic]")) { E.draft.predefinedFilter.logic = t.value; renderEditor({ focus: "#rga-rule-logic" }); return; }
    const part = t.dataset.rgaRulePart;
    if (part && t.tagName === "SELECT") {
      const i = Number(t.dataset.rgaRule);
      const r = E.draft.predefinedFilter.rules[i];
      r[part] = t.value;
      if (part === "column") r.value = "";
      if (part === "op" && NO_VALUE.includes(t.value)) r.value = "";
      delete E.errors.rules[i]; clearErrors();
      renderEditor({ focus: `#rga-rule-${part === "column" ? "col" : part}-${i}` });
    }
  }
  /* Enter / Space on a list row selects it (the shared stack-row keydown clicks it); ← → in the icon picker */
  function onEditorKeydown(event) {
    const ic = event.target.closest?.("[data-rga-icon]");
    if (ic && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      const all = [...ic.parentElement.querySelectorAll("[data-rga-icon]")];
      const i = all.indexOf(ic);
      const next = all[(i + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) + all.length) % all.length];
      event.preventDefault();
      next.click();
      return;
    }
    const tab = event.target.closest?.("[data-rga-editor-tab]");
    if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      const all = [...tab.parentElement.querySelectorAll("[data-rga-editor-tab]")];
      const i = all.indexOf(tab);
      const next = event.key === "Home" ? all[0] : event.key === "End" ? all[all.length - 1] : all[(i + (event.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
      event.preventDefault();
      next.click();
    }
  }
  /* drag a column by its row (US-149 AC-06); ↑ ↓ are the keyboard path */
  let dragFrom = -1;
  function onEditorDrag(event) {
    const row = event.target.closest?.("[data-rga-col]");
    if (event.type === "dragstart" && row) { dragFrom = Number(row.dataset.index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", row.dataset.rgaCol); row.classList.add("is-dragging"); return; }
    if (event.type === "dragover" && row && dragFrom >= 0) { event.preventDefault(); editor.querySelectorAll("[data-rga-col].is-drop-target").forEach((r) => r.classList.remove("is-drop-target")); row.classList.add("is-drop-target"); return; }
    if (event.type === "drop" && row && dragFrom >= 0) {
      event.preventDefault();
      const to = Number(row.dataset.index);
      const [moved] = E.draft.columns.splice(dragFrom, 1);
      E.draft.columns.splice(to, 0, moved);
      dragFrom = -1;
      renderEditor({ focus: `[data-rga-col="${CSS.escape(moved.key)}"]` });
      return;
    }
    if (event.type === "dragend") { dragFrom = -1; editor.querySelectorAll("[data-rga-col].is-dragging, [data-rga-col].is-drop-target").forEach((r) => r.classList.remove("is-dragging", "is-drop-target")); }
  }
  /* AC-15 + the column / action fields that cannot be empty */
  function validateEditor() {
    const rec = editorRec();
    const errors = { rules: {}, columns: {}, actions: {} };
    (E.draft.predefinedFilter?.rules || []).forEach((r, i) => {
      if (!NO_VALUE.includes(r.op) && !String(r.value || "").trim()) errors.rules[i] = `Regula pentru „${fieldOf(rec, r.column)?.label || r.column}” are nevoie de o valoare`;
    });
    E.draft.columns.forEach((c) => { if (!String(c.label || "").trim()) errors.columns[c.key] = { label: "Antetul în română este obligatoriu" }; });
    E.draft.actions.forEach((a) => {
      const e = {};
      if (!String(a.label || "").trim()) e.label = "Denumirea acțiunii este obligatorie";
      if (a.type !== "open" && !a.target) e.target = a.type === "form" ? "Alegeți formularul" : a.type === "custom" ? "Alegeți controlul" : "Alegeți procesul";
      if (Object.keys(e).length) errors.actions[a.key] = e;
    });
    return errors;
  }
  function saveEditor() {
    const errors = validateEditor();
    const nRules = Object.keys(errors.rules).length;
    const nOther = Object.keys(errors.columns).length + Object.keys(errors.actions).length;
    E.errors = errors;
    if (nRules || nOther) {
      E.footerError = nRules && E.tab === "filtru" ? "Corectați regulile marcate mai jos înainte de salvare." : nRules ? "Corectați regulile din tabul „Filtru” înainte de salvare." : Object.keys(errors.actions).length ? "Corectați acțiunile marcate înainte de salvare." : "Corectați coloanele marcate înainte de salvare.";
      /* go where the first problem is */
      if (!nRules && E.tab === "filtru") E.tab = Object.keys(errors.columns).length ? "coloane" : "actiuni";
      if (E.tab === "coloane" && !Object.keys(errors.columns).length && nRules) E.tab = "filtru";
      if (E.tab === "actiuni" && Object.keys(errors.actions).length && !errors.actions[E.selAct]) E.selAct = Object.keys(errors.actions)[0];
      if (E.tab === "coloane" && Object.keys(errors.columns).length && !errors.columns[E.selCol]) E.selCol = Object.keys(errors.columns)[0];
      E.footerError = E.tab === "filtru" ? "Corectați regulile marcate mai jos înainte de salvare." : E.footerError;
      renderEditor();
      editor.querySelector('[aria-invalid="true"], .e-permits-fo-select.is-error .e-permits-fo-select__button')?.focus();
      return;
    }
    const rec = editorRec();
    const pf = E.draft.predefinedFilter;
    rec.config = clone({ ...E.draft, predefinedFilter: pf?.rules?.length ? pf : null });
    /* AC-25 / AC-26: saving keeps the version; a published register gets „Modificări nepublicate” (status Schiță) */
    if (rec.published) {
      rec.unpublished = diffConfig(rec, rec.published, rec.config).length > 0;
      if (rec.unpublished && rec.status === "Publicat") rec.status = "Schiță";
      if (!rec.unpublished && rec.status === "Schiță") rec.status = "Publicat";
    }
    touch(rec);
    audit(rec, "Salvare configurație registru", `${plural(changes().length, "modificare", "modificări")}`);
    G().commit();
    closeEditor();
    renderProfile();
    refreshList();
    toast(rec.published ? "Configurația a fost salvată. Utilizatorii din BackOffice văd versiunea publicată până la „Publică”." : "Configurația a fost salvată.");
  }
  /* „● N modificări nesalvate” → the shared review modal (one source; each row can be undone). Registered on the
     first editor open: this deferred script runs before the shell builds GEAPShellApi (DOMContentLoaded). */
  let sourceRegistered = false;
  const registerSource = () => { if (sourceRegistered || !A().registerChangeSource) return; sourceRegistered = true; A().registerChangeSource("registre-config", changeSource); };
  const changeSource = () => {
    if (!E) return null;
    return {
      name: editorRec().names.ro,
      applies: "se aplică după Salvează și publicare",
      emptyText: "Configurația este cea salvată.",
      groups: ["Coloane", "Filtru predefinit", "Acțiuni pe rând"],
      entries: () => changes(),
      undo: (ref) => {
        const [kind, op, key] = ref.split(":");
        const listKey = kind === "col" ? "columns" : "actions";
        const draftList = E.draft[listKey];
        const baseList = E.base[listKey];
        if (ref === "filter") E.draft.predefinedFilter = clone(E.base.predefinedFilter);
        else if (op === "add") draftList.splice(draftList.findIndex((x) => x.key === key), 1);
        else if (op === "del") { const i = baseList.findIndex((x) => x.key === key); draftList.splice(Math.min(i, draftList.length), 0, clone(baseList[i])); }
        else if (op === "chg") { const i = draftList.findIndex((x) => x.key === key); draftList[i] = clone(baseList.find((x) => x.key === key)); }
        else if (op === "order") {
          const pos = (k) => { const i = baseList.findIndex((x) => x.key === k); return i < 0 ? Infinity : i; };
          draftList.sort((x, y) => pos(x.key) - pos(y.key));
        }
        if (kind === "col" && !E.draft.columns.some((c) => c.key === E.selCol)) E.selCol = E.draft.columns[0]?.key || null;
        if (kind === "act" && !E.draft.actions.some((a) => a.key === E.selAct)) E.selAct = E.draft.actions[0]?.key || null;
        E.errors = { rules: {}, columns: {}, actions: {} }; E.footerError = "";
        renderEditor();
      },
      discard: () => { E.draft = clone(E.base); E.errors = { rules: {}, columns: {}, actions: {} }; E.footerError = ""; renderEditor(); },
      save: () => saveEditor()
    };
  };

  /* ================================================================ delegated clicks (profile, list, modal) */
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-workplace-add-product="rga-new"]')) { event.preventDefault(); if (can("create")) openDrawer(createState()); return; }
    if (t.closest("[data-rga-export-confirm]")) { exportCsv(); return; }
    if (t.closest("[data-rgp-confirm]")) { confirmPublish(t.closest("[data-rgp-confirm]")); return; }
    if (t.closest("[data-rgv-restore-confirm]")) { confirmRestore(); return; }
    const vView = t.closest("[data-rgv-view]");
    if (vView) { closeMenus(); openVersion(vView.dataset.rgvView); return; }
    const vRestore = t.closest("[data-rgv-restore]");
    if (vRestore) { closeMenus(); openRestore(vRestore.dataset.rgvRestore); return; }
    const vExport = t.closest("[data-rgv-export]");
    if (vExport) { closeMenus(); exportVersion(vExport.dataset.rgvExport); return; }
    const toRecord = t.closest("[data-rga-open]");
    if (toRecord) { event.preventDefault(); openProfile(toRecord.dataset.rgaOpen); return; }
    if (t.closest("[data-rga-back]")) { event.preventDefault(); P.id = null; document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click(); return; }
    if (!profileOpen()) return;
    const tab = t.closest("[data-rga-tab]");
    if (tab) {
      P.tab = tab.dataset.rgaTab;
      renderProfile({ keepFocus: `[data-rga-tab="${P.tab}"]` });
      A().writeHash?.(`#registru-config/${P.id}/${P.tab}`);
      return;
    }
    if (t.closest("[data-rga-configure]")) { openEditor(); return; }
    if (t.closest("[data-rga-publish]")) { openPublish(); return; }
    if (t.closest("[data-rga-history]")) { openDrawer({ mode: "versions", id: P.id, page: 1, perPage: 10, sort: { key: "nr", dir: "desc" } }); return; }
    if (t.closest("[data-rga-edit]")) { closeMenus(); const rec = recordOf(P.id); openDrawer({ mode: "edit", id: rec.id, v: { ro: rec.names.ro, ru: rec.names.ru, en: rec.names.en, description: rec.description, position: String(rec.position) } }); return; }
    if (t.closest("[data-rga-deprecate]")) { closeMenus(); deprecate(); return; }
    if (t.closest("[data-rga-reactivate]")) { closeMenus(); reactivate(); return; }
    if (t.closest("[data-rga-grant]")) { openDrawer({ mode: "grant", id: P.id, v: { authority: "", roles: [] } }); return; }
    const rv = t.closest("[data-rga-revoke]");
    if (rv) revoke(rv.dataset.rgaRevoke);
  });
  const closeMenus = () => {
    document.querySelectorAll("[data-stack-menu]:not([hidden])").forEach((menu) => { menu.hidden = true; });
    document.querySelectorAll("[data-stack-menu-trigger][aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
  };
  /* the version dialog closes back into the history panel (AC-18): drop the raised layer with it */
  {
    const overlay = () => document.querySelector("#case-action-modal");
    const watch = () => {
      const o = overlay();
      if (!o || o.dataset.rgaWatch) return;
      o.dataset.rgaWatch = "1";
      new MutationObserver(() => { if (o.getAttribute("aria-hidden") === "true") { o.classList.remove("e-permits-confirm-overlay"); publishing = null; restoring = null; } }).observe(o, { attributes: true, attributeFilter: ["aria-hidden"] });
    };
    document.addEventListener("DOMContentLoaded", watch);
    watch();
  }
  /* profile tabs: ← → Home End */
  document.addEventListener("keydown", (event) => {
    const tabBtn = event.target.closest?.("[data-rga-tab]");
    if (!tabBtn || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const all = [...tabBtn.parentElement.querySelectorAll("[data-rga-tab]")];
    const i = all.indexOf(tabBtn);
    const next = event.key === "Home" ? all[0] : event.key === "End" ? all[all.length - 1] : all[(i + (event.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
    event.preventDefault();
    next?.click();
  });

  /* ================================================================ routes */
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((hash) => {
    if (hash === `#${NAV}`) {
      if (can("view") && document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)) return false;
      showDenied();
      return true;
    }
    const m = hash.match(/^#registru-config\/([^/]+)(?:\/([^/]+))?$/);
    if (!m) return false;
    openProfile(decodeURIComponent(m[1]), m[2] || "informatii", { push: false });
    return true;
  });

  /* for demo states / probes */
  window.GEAPRegistreAdmin = { openProfile, openEditor, openPublish, records, diffConfig, publishProblems, codeOf };
})();
